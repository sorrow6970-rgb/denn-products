"""
Hot-function analyzer for denn-admin.html.
Reads docs/_block-ranges.csv and HTML, re-uses logic from _analyze_patches.py
to rank functions by override count, then classifies into ZE-modal / text-field /
drag-position buckets via keyword match on the function name.

Output: docs/hot-functions-2026-05-17.md
Read-only. Does not modify HTML.
"""
import csv
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "denn-admin.html"
CSV_PATH = ROOT / "docs" / "_block-ranges.csv"
OUT = ROOT / "docs" / "hot-functions-2026-05-17.md"

html_lines = HTML.read_text(encoding="utf-8", errors="replace").splitlines()

def slice_block(start, end):
    return "\n".join(html_lines[start-1:end])

blocks = []
with CSV_PATH.open(encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        b = {"start": int(row["Start"]), "end": int(row["End"]),
             "id": row["Id"], "type": row["Type"]}
        b["body"] = slice_block(b["start"], b["end"])
        blocks.append(b)

JS_PATTERNS = [
    (re.compile(r"(?:^|\s)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\("), "func"),
    (re.compile(r"window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()"), "window"),
    (re.compile(r"globalThis\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()"), "global"),
    (re.compile(r"(?:^|\s)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()"), "var"),
]

fn_defs = defaultdict(list)  # name -> [ {block_id, line, kind} ]
for b in blocks:
    if b["type"] != "script":
        continue
    for i, line in enumerate(b["body"].splitlines()):
        for pat, kind in JS_PATTERNS:
            for m in pat.finditer(line):
                fn_defs[m.group(1)].append({
                    "block_id": b["id"],
                    "line": b["start"] + i,
                    "kind": kind,
                })

# Build winner + count per function
fn_summary = []
for name, lst in fn_defs.items():
    lst_sorted = sorted(lst, key=lambda d: d["line"])
    winner = lst_sorted[-1]
    fn_summary.append({
        "name": name,
        "n_defs": len(lst_sorted),
        "winner_line": winner["line"],
        "winner_block": winner["block_id"],
        "winner_kind": winner["kind"],
        "all_blocks": [d["block_id"] for d in lst_sorted],
    })

# Top 20 by override count
top20 = sorted(fn_summary, key=lambda d: (-d["n_defs"], d["name"]))[:20]

# Category classification — keyword on function name (case-insensitive)
CATEGORIES = {
    "ze-modal": re.compile(r"(ze[-_]?modal|openZoneEditor|zeRender|^ze[A-Z]|Ze[A-Z]|zoneEditor)", re.I),
    "text-fields": re.compile(r"(textField|addText|setZT|textZone|^zt[A-Z]|^addField|^renderField)", re.I),
    "drag-position": re.compile(r"(drag|mousedown|mousemove|mouseup|onPointer|pointerdown|pointermove|movePosition|positionZone)", re.I),
}

def categorize(name):
    cats = []
    for cat, pat in CATEGORIES.items():
        if pat.search(name):
            cats.append(cat)
    return cats

# Bucket all functions with n_defs >= 3 (hot threshold) by category
hot_threshold = 3
hot_fns = [f for f in fn_summary if f["n_defs"] >= hot_threshold]
hot_fns.sort(key=lambda d: (-d["n_defs"], d["name"]))

by_cat = defaultdict(list)
uncategorized_hot = []
for f in hot_fns:
    cats = categorize(f["name"])
    if cats:
        for c in cats:
            by_cat[c].append(f)
    else:
        uncategorized_hot.append(f)

# Output
def md_table(headers, rows):
    out = ["| " + " | ".join(headers) + " |",
           "|" + "|".join(["---"] * len(headers)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out)

lines = []
lines.append("# Hot Functions — denn-admin.html (2026-05-17)")
lines.append("")
lines.append(f"- Total unique function names tracked: **{len(fn_summary)}**")
lines.append(f"- Functions defined >= {hot_threshold} times (hot): **{len(hot_fns)}**")
lines.append(f"- Total dead def count: {sum(f['n_defs']-1 for f in fn_summary)}")
lines.append("")
lines.append("> Approach: a single 'winner' per function is the last definition by line. ")
lines.append("> Hot functions (defined many times) are the highest-leverage targets — consolidating ")
lines.append("> them to one authoritative implementation removes the most dead code.")
lines.append("> Category match is by **name pattern only** (regex on function name) — manual confirmation needed.")
lines.append("")

# Top 20
lines.append("## Top 20 most-overridden functions")
lines.append("")
lines.append(md_table(
    ["Rank", "Function", "Total defs", "Winner line", "Winner block ID"],
    [(i+1, f"`{f['name']}`", f["n_defs"], f["winner_line"], f["winner_block"])
     for i, f in enumerate(top20)]
))
lines.append("")

# By category
for cat, label in [("ze-modal", "ZE / 상세설정 모달"),
                   ("text-fields", "문구 추가 / text-fields"),
                   ("drag-position", "위치 이동 / drag")]:
    fns = by_cat.get(cat, [])
    lines.append(f"## Category: {label}  ({len(fns)} hot functions)")
    lines.append("")
    if not fns:
        lines.append("_(no hot functions matched this pattern)_")
        lines.append("")
        continue
    lines.append(md_table(
        ["Function", "Total defs", "Winner line", "Winner block ID", "Override chain (oldest→newest)"],
        [(f"`{f['name']}`", f["n_defs"], f["winner_line"], f["winner_block"],
          " → ".join(f["all_blocks"]))
         for f in fns]
    ))
    lines.append("")

# Other hot spots (not in any of the 3 categories) — top 30
lines.append("## Other hot functions (no category match) — top 30")
lines.append("")
lines.append(md_table(
    ["Function", "Total defs", "Winner line", "Winner block ID"],
    [(f"`{f['name']}`", f["n_defs"], f["winner_line"], f["winner_block"])
     for f in uncategorized_hot[:30]]
))
lines.append("")
lines.append(f"_(Full hot list: {len(uncategorized_hot)} more uncategorized functions with >= {hot_threshold} defs)_")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {OUT}")
print(f"top20[0]={top20[0]['name']}({top20[0]['n_defs']})  top20[19]={top20[19]['name']}({top20[19]['n_defs']})")
print(f"ze-modal={len(by_cat['ze-modal'])} text-fields={len(by_cat['text-fields'])} drag-position={len(by_cat['drag-position'])} uncategorized={len(uncategorized_hot)}")
