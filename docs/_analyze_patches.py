"""
Patch inventory analyzer for denn-admin.html
Reads docs/_block-ranges.csv and classifies each function/selector definition.
Output: docs/patch-inventory-2026-05-17.md
Read-only: never modifies HTML.
"""
import csv
import re
from collections import defaultdict, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "denn-admin.html"
CSV_PATH = ROOT / "docs" / "_block-ranges.csv"
OUT = ROOT / "docs" / "patch-inventory-2026-05-17.md"

# ---- Load HTML lines (1-indexed) ----
html_lines = HTML.read_text(encoding="utf-8", errors="replace").splitlines()

def slice_block(start, end):
    # CSV uses 1-indexed inclusive; python list is 0-indexed
    return "\n".join(html_lines[start-1:end])

# ---- Load block ranges ----
blocks = []  # list of dict(start, id, type, end, body)
with CSV_PATH.open(encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        b = {
            "start": int(row["Start"]),
            "end":   int(row["End"]),
            "id":    row["Id"],
            "type":  row["Type"],
        }
        b["body"] = slice_block(b["start"], b["end"])
        blocks.append(b)

# ---- Function-extraction regex set ----
# We collect (kind, name, local_line_offset_in_block)
JS_PATTERNS = [
    # function foo(...)  /  async function foo(...)
    (re.compile(r"(?:^|\s)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\("), "func"),
    # window.foo = function   |   window.foo = (...) =>  |  window.foo = async function
    (re.compile(r"window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()"), "window"),
    # globalThis.foo = ...
    (re.compile(r"globalThis\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()"), "global"),
    # const/let/var foo = function   | const foo = (...) =>
    (re.compile(r"(?:^|\s)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()"), "var"),
    # document.addEventListener('DOMContentLoaded', ...)  → tag IIFE
    # (skip — too noisy)
]

# CSS: top-level selector blocks (ignore @media inner content; just keep selector text)
CSS_SELECTOR = re.compile(r"^\s*([^{}@/][^{}/]*?)\s*\{", re.MULTILINE)

def extract_js_defs(body, base_line):
    """Return list of (kind, name, abs_line)."""
    out = []
    for i, line in enumerate(body.splitlines()):
        for pat, kind in JS_PATTERNS:
            for m in pat.finditer(line):
                out.append((kind, m.group(1), base_line + i))
    return out

def extract_css_selectors(body, base_line):
    """Return list of (selector, abs_line). Crude: top-level rule headers."""
    out = []
    # Strip comments to avoid false hits
    nocomment = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    # Walk char by char tracking brace depth so we only catch depth-0 selectors
    depth = 0
    cur = []
    line_no = base_line
    sel_start_line = None
    for ch in nocomment:
        if ch == "\n":
            line_no += 1
        if ch == "{":
            if depth == 0:
                sel = "".join(cur).strip()
                if sel and not sel.startswith("@"):
                    # normalise whitespace
                    sel_norm = re.sub(r"\s+", " ", sel)
                    out.append((sel_norm, sel_start_line or line_no))
                cur = []
                sel_start_line = None
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
            cur = []
            sel_start_line = None
        else:
            if depth == 0:
                if not cur and ch.strip():
                    sel_start_line = line_no
                cur.append(ch)
    return out

# ---- Walk blocks, collect definitions ----
# For each function name, keep ordered list of (block_idx, abs_line, kind)
fn_defs   = defaultdict(list)
css_defs  = defaultdict(list)

# Also per-block: what does it define?
per_block_defs = []

for idx, b in enumerate(blocks):
    if b["type"] == "script":
        defs = extract_js_defs(b["body"], b["start"])
        per_block_defs.append(defs)
        for kind, name, ln in defs:
            fn_defs[name].append({"block_idx": idx, "block_id": b["id"], "line": ln, "kind": kind})
    else:  # style
        defs = extract_css_selectors(b["body"], b["start"])
        per_block_defs.append([("css", s, ln) for (s, ln) in defs])
        for sel, ln in defs:
            css_defs[sel].append({"block_idx": idx, "block_id": b["id"], "line": ln})

# ---- Classify ----
# Winners: last (highest line) definition per name
# Dead: any earlier definition
winners_fn   = {}   # name -> dict
losers_fn    = []   # list of dict with name, prev_line, prev_block, winner_block

for name, lst in fn_defs.items():
    lst_sorted = sorted(lst, key=lambda d: d["line"])
    winner = lst_sorted[-1]
    winners_fn[name] = winner
    for loser in lst_sorted[:-1]:
        losers_fn.append({
            "name": name,
            "prev_line": loser["line"],
            "prev_block": loser["block_id"],
            "winner_block": winner["block_id"],
            "winner_line": winner["line"],
            "kind": loser["kind"],
        })

# Same for CSS selectors
winners_css = {}
losers_css  = []
for sel, lst in css_defs.items():
    lst_sorted = sorted(lst, key=lambda d: d["line"])
    winner = lst_sorted[-1]
    winners_css[sel] = winner
    for loser in lst_sorted[:-1]:
        losers_css.append({
            "sel": sel,
            "prev_line": loser["line"],
            "prev_block": loser["block_id"],
            "winner_block": winner["block_id"],
            "winner_line": winner["line"],
        })

# ---- Block-level liveness ----
# A block is "fully alive" if every def it makes is a winner.
# "fully dead" if every def is overridden later (and it makes at least one def).
# "mixed/gray" if some win, some lose.
# "empty/side-effect" if no defs detected (likely runtime side-effects, can't judge statically).
block_status = []
for idx, b in enumerate(blocks):
    defs = per_block_defs[idx]
    if not defs:
        block_status.append("side-effect")
        continue
    wins = 0; loses = 0
    for entry in defs:
        if b["type"] == "script":
            kind, name, ln = entry
            w = winners_fn.get(name)
            if w and w["block_idx"] == idx:
                wins += 1
            else:
                loses += 1
        else:
            _, sel, ln = entry
            w = winners_css.get(sel)
            if w and w["block_idx"] == idx:
                wins += 1
            else:
                loses += 1
    if loses == 0:
        block_status.append("alive")
    elif wins == 0:
        block_status.append("dead")
    else:
        block_status.append("mixed")

# ---- Group blocks by "area" (rough: prefix of id between denn- and -admin/etc) ----
def area_of(block_id):
    # denn-v36-5-foo-bar -> v36-5
    m = re.match(r"denn-(v\d+(?:-\d+)*)", block_id)
    if m: return m.group(1)
    m = re.match(r"denn-(final|current)", block_id)
    if m: return m.group(1)
    return "misc"

area_stats = defaultdict(lambda: {"total": 0, "alive": 0, "dead": 0, "mixed": 0, "side-effect": 0})
for b, status in zip(blocks, block_status):
    a = area_of(b["id"])
    area_stats[a]["total"] += 1
    area_stats[a][status] += 1

# ---- Write report ----
def md_table(headers, rows):
    out = ["| " + " | ".join(headers) + " |",
           "|" + "|".join(["---"] * len(headers)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out)

lines = []
lines.append("# Patch Inventory — denn-admin.html (2026-05-17)")
lines.append("")
lines.append(f"- Source: `denn-admin.html` ({len(html_lines)} lines)")
lines.append(f"- Blocks analyzed: **{len(blocks)}**")
lines.append(f"- JS function names tracked: {len(fn_defs)}  |  CSS selectors tracked: {len(css_defs)}")
lines.append(f"- Function overrides found (dead defs): {len(losers_fn)}")
lines.append(f"- CSS selector overrides found: {len(losers_css)}")
lines.append("")
lines.append("> Method: for each `<script id='denn-...'>` and `<style id='denn-...'>` block, ")
lines.append("> extract definitions (function/window.x/const x = ...) or CSS selectors. ")
lines.append("> The **last** definition by line number wins; earlier ones are dead-code candidates. ")
lines.append("> Side-effect-only blocks (event listeners, IIFE, observers) cannot be judged statically and ")
lines.append("> are listed as **gray zone**. No HTML was modified.")
lines.append("")

# Block status summary
total = len(blocks)
status_counts = defaultdict(int)
for s in block_status: status_counts[s] += 1
lines.append("## Block status summary")
lines.append("")
lines.append(md_table(
    ["Status", "Count", "Meaning"],
    [
        ("alive",       status_counts["alive"],       "every definition in block is the final winner"),
        ("dead",        status_counts["dead"],        "every definition overridden by a later block"),
        ("mixed",       status_counts["mixed"],       "some defs win, some lose — needs review"),
        ("side-effect", status_counts["side-effect"], "no top-level defs detected (IIFE/listeners) — can't judge statically"),
        ("TOTAL",       total, "—"),
    ]
))
lines.append("")

# Area stats
lines.append("## Per-area block stats")
lines.append("")
area_rows = []
for a in sorted(area_stats.keys(), key=lambda x: (x != "final", x != "current", x)):
    s = area_stats[a]
    area_rows.append((a, s["total"], s["alive"], s["dead"], s["mixed"], s["side-effect"]))
lines.append(md_table(["Area", "Blocks", "Alive", "Dead", "Mixed", "Side-effect"], area_rows))
lines.append("")

# Winners (functions only — too many CSS selectors to list everything; cap)
lines.append("## Final authority — winning function definitions")
lines.append("")
lines.append(f"All {len(winners_fn)} function names with their final definition line and block.")
lines.append("")
win_rows = []
for name in sorted(winners_fn.keys()):
    w = winners_fn[name]
    win_rows.append((f"`{name}`", w["line"], w["block_id"], w["kind"]))
lines.append(md_table(["Function", "Line", "Block ID", "Kind"], win_rows))
lines.append("")

# Losers / dead code candidates (functions)
lines.append("## Dead-code candidates — function definitions overridden later")
lines.append("")
lines.append(f"Total: {len(losers_fn)} overridden function definitions.")
lines.append("")
loser_rows = []
for d in sorted(losers_fn, key=lambda x: x["prev_line"]):
    loser_rows.append((f"`{d['name']}`", d["prev_line"], d["prev_block"],
                       d["winner_line"], d["winner_block"]))
lines.append(md_table(
    ["Function", "Dead line", "Dead block", "Winner line", "Winner block"],
    loser_rows
))
lines.append("")

# CSS losers (just count + sample, full file would be huge)
lines.append("## Dead-code candidates — CSS selectors overridden later")
lines.append("")
lines.append(f"Total: {len(losers_css)} overridden top-level selector rules.")
lines.append(f"(CSS specificity & order matter in the cascade — these are *textual* overrides only; ")
lines.append("a 'losing' rule may still partially apply via differing properties. Manual review needed.)")
lines.append("")
# Group losers by (dead_block, winner_block)
pair_counts = defaultdict(int)
for d in losers_css:
    pair_counts[(d["prev_block"], d["winner_block"])] += 1
lines.append("### CSS override pairs (dead-block → winner-block) by selector count")
lines.append("")
pair_rows = []
for (db, wb), n in sorted(pair_counts.items(), key=lambda x: -x[1])[:80]:
    pair_rows.append((db, wb, n))
lines.append(md_table(["Dead block", "Winner block", "# selectors overridden"], pair_rows))
lines.append("")

# Block-level verdict: list every block with its status
lines.append("## Per-block verdict")
lines.append("")
per_rows = []
for b, status, defs in zip(blocks, block_status, per_block_defs):
    n_defs = len(defs)
    if status == "side-effect":
        note = "no top-level defs"
    elif status == "alive":
        note = f"all {n_defs} defs are winners"
    elif status == "dead":
        note = f"all {n_defs} defs overridden by later blocks"
    else:
        wins = sum(1 for e in defs if (
            (b["type"]=="script" and winners_fn.get(e[1]) and winners_fn[e[1]]["block_id"]==b["id"])
            or (b["type"]=="style" and winners_css.get(e[1]) and winners_css[e[1]]["block_id"]==b["id"])
        ))
        note = f"{wins}/{n_defs} defs win"
    per_rows.append((b["start"], b["end"], b["id"], b["type"], status, note))
lines.append(md_table(["Start", "End", "Block ID", "Type", "Status", "Note"], per_rows))
lines.append("")

# Gray zone (side-effect blocks)
lines.append("## Gray zone — side-effect-only blocks (cannot judge statically)")
lines.append("")
lines.append("These blocks register listeners, run IIFEs, mutate DOM at load, etc. ")
lines.append("Whether they are still in effect depends on runtime order, not function-name shadowing. ")
lines.append("Manual inspection required.")
lines.append("")
gray_rows = []
for b, status in zip(blocks, block_status):
    if status == "side-effect":
        gray_rows.append((b["start"], b["end"], b["id"], b["type"]))
lines.append(md_table(["Start", "End", "Block ID", "Type"], gray_rows))
lines.append("")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {OUT} ({len(lines)} lines)")
print(f"alive={status_counts['alive']} dead={status_counts['dead']} mixed={status_counts['mixed']} side-effect={status_counts['side-effect']}")
print(f"function-defs-overridden={len(losers_fn)}  css-selectors-overridden={len(losers_css)}")
