import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ScriptTarget, SyntaxKind, createScanner } from "typescript/unstable/ast";
import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// Operator remote-read card in a real browser (spec 036 §8). The default build is UNCONFIGURED, so
// the first point of this suite is proving that nothing Firebase-shaped happens at runtime: no
// request and no controls.
//
// The second point is the CUSTOMER boundary, and what that means has moved. Spec 053 approved a
// lazy Firestore space-document read, and specs 079/080 (Founder MM-1=A) approved a lazy READ-ONLY
// Storage reader for the proof asset. So "no trace of the SDK" is no longer the contract — the
// contract is: Firestore read plus Storage READ, no Auth, no admin private paths, and nothing that
// writes, deletes, enumerates or hands out a download URL.

const URL = `http://localhost:${ADMIN_PORT}/`;

const FIREBASE_HOST = /firebaseio|firebasestorage|googleapis|identitytoolkit|firebaseapp/i;

const VIEWPORTS = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

for (const vp of VIEWPORTS) {
  test(`operator remote read (spec 036) @ ${vp.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m: ConsoleMessage) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(URL, { waitUntil: "networkidle" });

    // the feature is off unless explicitly configured at build time
    const status = page.getByTestId("admin-read-status");
    await expect(status).toContainText("운영자 원격 읽기가 아직 활성화되지 않았습니다.");

    // no login form, no load button, nothing to click
    await expect(page.getByTestId("admin-read-email")).toHaveCount(0);
    await expect(page.getByTestId("admin-read-password")).toHaveCount(0);
    await expect(page.getByTestId("admin-read-load")).toHaveCount(0);
    await expect(page.getByTestId("frame-print-size-editor")).toHaveCount(0);

    // no save / publish / order affordance anywhere in the card
    const card = page
      .getByTestId("admin-read-status")
      .locator("xpath=ancestor::div[@class='denn-card']");
    await expect(card.locator("button, a, [role='button']")).toHaveCount(0);
    await expect(card).not.toContainText("주문");

    // give an unwanted lazy import a chance to appear, then prove it did not
    await page.waitForTimeout(500);
    const firebaseRequests = requests.filter((u) => FIREBASE_HOST.test(u));
    expect(firebaseRequests).toEqual([]);
    const external = requests.filter((u) => !u.startsWith(`http://localhost:${ADMIN_PORT}/`));
    expect(external).toEqual([]);

    // keyboard focus stays visible with the new card present
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
    });
    expect(focus?.outlineStyle).not.toBe("none");
    expect(focus?.outlineWidth).not.toBe("0px");

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => v.id)).toEqual([]);
    expect(consoleErrors).toEqual([]);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}

test("the customer bundle carries no Auth product API and no private admin path", () => {
  const staging = process.env.DENN_E2E_STAGING;
  expect(staging, "DENN_E2E_STAGING").toBeTruthy();
  const assets = join(String(staging), "mockup", "assets");
  const js = readdirSync(assets).filter((f) => f.endsWith(".js"));
  expect(js.length).toBeGreaterThan(0);

  const bundle = js.map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
  // Spec 053 intentionally adds the lazy Firestore space reader, and specs 079/080 add a lazy
  // READ-ONLY Storage reader. A bundled Firebase product ships its whole module, so its export map
  // and its internal error labels carry every API name that product owns whether or not this app
  // imports them — `bundle.includes("uploadBytes")` therefore measures "the Storage SDK is present",
  // which specs 079/080 approved, not "this app writes". What stays meaningful at bundle level is
  // app-level strings: private admin paths and Auth product APIs no customer code may reach. The
  // Storage read-only boundary is asserted in the next test against the app's own CALL surface,
  // where a vendor export map cannot masquerade as a call site.
  expect(bundle.includes("denn-space-viewer")).toBe(true);
  expect(bundle.includes("getFirestore")).toBe(true);
  expect(bundle.includes("getDoc")).toBe(true);
  for (const marker of [
    "admin-read",
    "ADMIN_STATE_OBJECT_PATH",
    "admin/state.json",
    "onAuthStateChanged",
    "signInWithEmailAndPassword",
  ]) {
    expect(bundle.includes(marker), marker).toBe(false);
  }

  // `getAuth` stays forbidden, but as a WHOLE identifier rather than a raw substring. Since the
  // customer app gained its approved lazy `firebase/storage` import (specs 079/080), the Storage
  // SDK's own internal `_getAuthToken` sits in a vendor chunk and matched `bundle.includes("getAuth")`
  // — a false positive, not evidence that the Auth product API is reachable. Requiring identifier
  // boundaries on both sides keeps every real `getAuth(` / exported `getAuth` name blocked (the admin
  // bundle, which does use Auth, matches this pattern) while `_getAuthToken` and `getAuthToken` no
  // longer trip it. This narrows the false positives only; it does not narrow the boundary.
  expect(bundle, "getAuth").not.toMatch(/(?<![A-Za-z0-9_$])getAuth(?![A-Za-z0-9_$])/);
});

/** Production `.ts`/`.tsx` under a directory: no unit tests, no E2E fixtures. */
function productionSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const entry = join(dir, name);
    if (statSync(entry).isDirectory()) {
      if (name !== "e2e") productionSources(entry, out);
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(entry);
  }
  return out;
}

// Reading this boundary with regexes cost four correction rounds, each one closing the shape the
// last one missed: a call, then an alias, then a property, then a named import. The shapes were
// never the point — regex cannot see syntax, so every fix was a guess about what someone might
// write next. So this reads the source the way the compiler does, with the TypeScript scanner that
// already ships in this repo, and asks two questions that do not depend on guessing a shape:
//
//   1. What does each Firebase SDK module actually hand to this surface? That set must equal an
//      explicit per-module allowlist — nothing missing, nothing extra. A capability nobody thought
//      to forbid still fails, because it was never on the list.
//   2. Is any forbidden name reachable at all, in any syntactic position?
//
// And a shape the reader cannot account for is reported as a failure, never passed over in silence.

type Token = { kind: SyntaxKind; text: string; value: string };

/** Token kinds after which a `/` is division rather than the start of a regular expression. */
const DIVISION_FOLLOWS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.Identifier,
  SyntaxKind.NumericLiteral,
  SyntaxKind.StringLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.CloseParenToken,
  SyntaxKind.CloseBracketToken,
  SyntaxKind.CloseBraceToken,
  SyntaxKind.ThisKeyword,
]);

/**
 * The real TypeScript scanner, so comments, strings, template literals and regular expressions are
 * lexed rather than pattern-matched. Two tokens need the parser's context to disambiguate, so they
 * are re-scanned here the way a parser would: `/` (division vs. regex) and the `}` that closes a
 * template substitution (block close vs. template middle/tail). Without the second one the scanner
 * swallows the rest of the file as template text — silent blindness, which is the failure mode this
 * whole check exists to avoid, so a scanner that stops advancing throws instead.
 */
function tokenize(source: string): Token[] {
  const scanner = createScanner(ScriptTarget.Latest, true);
  scanner.setText(source);
  const tokens: Token[] = [];
  const templates: number[] = [];
  let braces = 0;
  let end = -1;
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    if (kind === SyntaxKind.SlashToken || kind === SyntaxKind.SlashEqualsToken) {
      const previous = tokens[tokens.length - 1];
      if (!previous || !DIVISION_FOLLOWS.has(previous.kind)) kind = scanner.reScanSlashToken();
    }
    if (kind === SyntaxKind.OpenBraceToken) braces++;
    else if (kind === SyntaxKind.CloseBraceToken) {
      if (templates[templates.length - 1] === braces) {
        kind = scanner.reScanTemplateToken(false);
        templates.pop();
      } else braces--;
    }
    if (kind === SyntaxKind.TemplateHead || kind === SyntaxKind.TemplateMiddle)
      templates.push(braces);
    if (scanner.getTokenEnd() <= end) throw new Error("the scanner stopped advancing");
    end = scanner.getTokenEnd();
    tokens.push({ kind, text: scanner.getTokenText(), value: scanner.getTokenValue() });
  }
  return tokens;
}

const OPENING: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.OpenParenToken,
  SyntaxKind.OpenBracketToken,
  SyntaxKind.OpenBraceToken,
]);
const CLOSING: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.CloseParenToken,
  SyntaxKind.CloseBracketToken,
  SyntaxKind.CloseBraceToken,
]);

/** Index of the token closing the bracket opened at `open`. */
function matching(tokens: Token[], open: number): number {
  let depth = 0;
  for (let i = open; i < tokens.length; i++) {
    if (OPENING.has(tokens[i]?.kind as SyntaxKind)) depth++;
    else if (CLOSING.has(tokens[i]?.kind as SyntaxKind)) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}

/** The value of a plain string or untagged template literal, or null for anything computed. */
function literalValue(token: Token | undefined): string | null {
  if (!token) return null;
  const plain =
    token.kind === SyntaxKind.StringLiteral ||
    token.kind === SyntaxKind.NoSubstitutionTemplateLiteral;
  return plain ? token.value : null;
}

/**
 * The module-side names in a braced clause — `{ a, b: c }`, `{ a as b }` — taken from the LEFT of
 * `:` or `as`. That side is what the module hands over, so `{ list: l }` is a Storage `list` while
 * `{ templateList: list }` is an ordinary local. Null means a shape this reader does not model.
 */
function clauseNames(tokens: Token[], open: number): string[] | null {
  const close = matching(tokens, open);
  const names: string[] = [];
  let expectName = true;
  for (let i = open + 1; i < close; i++) {
    const token = tokens[i];
    if (!token) return null;
    if (token.kind === SyntaxKind.CommaToken) {
      expectName = true;
      continue;
    }
    if (!expectName) continue;
    if (token.kind !== SyntaxKind.Identifier) return null;
    names.push(token.text);
    expectName = false;
    const next = tokens[i + 1]?.kind;
    if (next === SyntaxKind.ColonToken || next === SyntaxKind.AsKeyword) i += 1;
  }
  return names;
}

/**
 * Exactly what each Firebase SDK product may hand to the customer surface. Specs 053 and 079/080
 * (Founder MM-1=A) approved a lazy Firestore read and a lazy READ-ONLY Storage read, and this is
 * that decision written out member by member. The check below asserts equality, so an unapproved
 * capability fails on arrival and a deleted read path fails too.
 */
const APPROVED_SDK_MEMBERS: Record<string, readonly string[]> = {
  "firebase/app": ["FirebaseApp", "getApp", "getApps", "initializeApp"],
  "firebase/firestore": ["doc", "getDoc", "getFirestore"],
  "firebase/storage": ["connectStorageEmulator", "getBytes", "getMetadata", "getStorage", "ref"],
};

type SdkUsage = { reached: Map<string, Set<string>>; unaccounted: string[] };

/** Record `member` as reached on `module`. */
function record(usage: SdkUsage, module: string, member: string): void {
  const members = usage.reached.get(module) ?? new Set<string>();
  members.add(member);
  usage.reached.set(module, members);
}

/**
 * Every member each `firebase/*` module hands to one file.
 *
 * The walk starts from the modules, not from the syntax: every `firebase/*` specifier in the file
 * is collected first, and each one must then be CLAIMED by a form this reader understands and the
 * boundary allows — a named import, a type query, or a dynamic import bound to a name whose members
 * are read. A specifier nothing claims lands in `unaccounted`, which the caller treats as a
 * failure. That is what makes this closed: `export * from "firebase/storage"`, a re-export, a
 * namespace import, a side-effect import and a dynamic import that is returned rather than bound
 * are not allowed forms, so they fail by not being claimed — nobody has to have thought of them
 * first. A legitimate new shape fails the same way, and the fix is to decide it is allowed here.
 *
 * Uses of an allowed binding are held to the same rule: a computed member or a namespace passed
 * around as a value is reported, never passed over.
 */
function sdkUsage(tokens: Token[]): SdkUsage {
  const usage: SdkUsage = { reached: new Map(), unaccounted: [] };

  const specifiers = new Map<number, string>();
  for (let i = 0; i < tokens.length; i++) {
    const value = literalValue(tokens[i]);
    if (value?.startsWith("firebase/")) specifiers.set(i, value);
  }
  if (specifiers.size === 0) return usage;
  const claimed = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]?.kind !== SyntaxKind.ImportKeyword) continue;

    // `import("m")` as an expression: a type query here, or a binding claimed further down.
    if (tokens[i + 1]?.kind === SyntaxKind.OpenParenToken) {
      if (!specifiers.has(i + 2)) continue;
      const module = specifiers.get(i + 2) as string;
      const close = matching(tokens, i + 1);
      if (tokens[close + 1]?.kind !== SyntaxKind.DotToken) continue;
      claimed.add(i + 2);
      const member = tokens[close + 2];
      if (member?.kind !== SyntaxKind.Identifier) usage.unaccounted.push(`type query on ${module}`);
      else record(usage, module, member.text);
      continue;
    }

    // `import { ... } from "m"` and `import type { ... } from "m"` — the only static form allowed.
    const clause = tokens[i + 1]?.text === "type" ? i + 2 : i + 1;
    if (tokens[clause]?.kind !== SyntaxKind.OpenBraceToken) continue;
    const from = matching(tokens, clause) + 2;
    if (!specifiers.has(from)) continue;
    const module = specifiers.get(from) as string;
    claimed.add(from);
    const names = clauseNames(tokens, clause);
    if (!names) usage.unaccounted.push(`named import from ${module}`);
    else for (const name of names) record(usage, module, name);
  }

  // A declaration whose initialiser pulls in SDK modules: line its binding elements up with those
  // modules in source order, then read what each binding yields.
  for (let i = 0; i < tokens.length; i++) {
    const keyword = tokens[i]?.kind;
    const declaration =
      keyword === SyntaxKind.ConstKeyword ||
      keyword === SyntaxKind.LetKeyword ||
      keyword === SyntaxKind.VarKeyword;
    if (!declaration) continue;

    const equals = scanTo(tokens, i + 1, [SyntaxKind.EqualsToken, SyntaxKind.SemicolonToken]);
    if (tokens[equals]?.kind !== SyntaxKind.EqualsToken) continue;
    const end = scanTo(tokens, equals + 1, [SyntaxKind.SemicolonToken]);

    const modules: { at: number; module: string }[] = [];
    for (let m = equals; m < end; m++) {
      if (tokens[m]?.kind !== SyntaxKind.ImportKeyword) continue;
      if (tokens[m + 1]?.kind !== SyntaxKind.OpenParenToken) continue;
      if (!specifiers.has(m + 2) || claimed.has(m + 2)) continue;
      modules.push({ at: m + 2, module: specifiers.get(m + 2) as string });
    }
    if (modules.length === 0) continue;
    for (const { at } of modules) claimed.add(at);

    const elements = bindingElements(tokens, i + 1, equals);
    if (elements.length !== modules.length) {
      usage.unaccounted.push(`${elements.length} bindings for ${modules.length} SDK modules`);
      continue;
    }
    modules.forEach(({ module }, index) => {
      const element = elements[index];
      if (!element) return;
      const [from, to] = element;
      if (tokens[from]?.kind === SyntaxKind.OpenBraceToken) {
        const names = clauseNames(tokens, from);
        if (!names) usage.unaccounted.push(`destructured binding for ${module}`);
        else for (const name of names) record(usage, module, name);
        return;
      }
      if (tokens[from]?.kind !== SyntaxKind.Identifier || to !== from) {
        usage.unaccounted.push(`binding shape for ${module}`);
        return;
      }
      namespaceMembers(tokens, tokens[from]?.text ?? "", from, module, usage);
    });
  }

  for (const [at, module] of specifiers) {
    if (!claimed.has(at)) usage.unaccounted.push(`unclaimed \`${module}\` specifier`);
  }
  return usage;
}

/** First index at or after `start` where one of `kinds` appears outside any bracket. */
function scanTo(tokens: Token[], start: number, kinds: SyntaxKind[]): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    const kind = tokens[i]?.kind as SyntaxKind;
    if (OPENING.has(kind)) depth++;
    else if (CLOSING.has(kind)) depth--;
    else if (depth === 0 && kinds.includes(kind)) return i;
  }
  return tokens.length;
}

/** Token ranges of a declaration's binding elements: `[a, b]` gives two, a plain name gives one. */
function bindingElements(tokens: Token[], start: number, equals: number): [number, number][] {
  if (tokens[start]?.kind !== SyntaxKind.OpenBracketToken) return [[start, equals - 1]];
  const close = matching(tokens, start);
  const elements: [number, number][] = [];
  let from = start + 1;
  let depth = 0;
  for (let i = start + 1; i <= close; i++) {
    const kind = tokens[i]?.kind as SyntaxKind;
    if (OPENING.has(kind)) depth++;
    else if (CLOSING.has(kind)) depth--;
    if ((depth === 0 && kind === SyntaxKind.CommaToken) || i === close) {
      elements.push([from, i - 1]);
      from = i + 1;
    }
  }
  return elements;
}

/** Every member read off a namespace binding, and a failure for any use that is not a member read. */
function namespaceMembers(
  tokens: Token[],
  name: string,
  binding: number,
  module: string,
  usage: SdkUsage,
): void {
  for (let i = 0; i < tokens.length; i++) {
    if (i === binding) continue;
    const token = tokens[i];
    if (token?.kind !== SyntaxKind.Identifier || token.text !== name) continue;
    if (tokens[i - 1]?.kind === SyntaxKind.DotToken) continue; // someone else's property
    const next = tokens[i + 1];
    if (next?.kind === SyntaxKind.DotToken && tokens[i + 2]?.kind === SyntaxKind.Identifier) {
      record(usage, module, tokens[i + 2]?.text ?? "");
      continue;
    }
    if (next?.kind === SyntaxKind.OpenBracketToken) {
      const member = literalValue(tokens[i + 2]);
      if (member === null) usage.unaccounted.push(`computed member on the ${module} namespace`);
      else record(usage, module, member);
      continue;
    }
    usage.unaccounted.push(`the ${module} namespace used as a value`);
  }
}

/**
 * Every Storage API the customer must never reach. Read-only is the whole approved capability
 * (specs 079/080, Founder MM-1=A), so writing, deleting, enumerating and handing out a download URL
 * are all out.
 */
const FORBIDDEN_STORAGE_API = [
  "uploadBytes",
  "uploadBytesResumable",
  "uploadString",
  "updateMetadata",
  "deleteObject",
  "list",
  "listAll",
  "getDownloadURL",
  "getBlob",
  "getStream",
] as const;

/**
 * Every syntactic position that reaches `api`, named. A property read, a string member, and a
 * braced clause — which covers `const { list: l } = storage`, `import { list as l }` and
 * `export { list as l } from` alike, since all three take the name from the left of `:` or `as`.
 *
 * `list` is the one forbidden name that is also ordinary English here (a local `list`, a
 * `template-list` test id), so the bare-identifier position is skipped for it and only for it. The
 * exemption costs nothing: a Storage `list` still has to arrive as a member or through a clause,
 * and the SDK allowlist above independently caps what `firebase/storage` may hand over at all.
 */
function forbiddenPositions(tokens: Token[], api: string): string[] {
  const found: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token.kind === SyntaxKind.DotToken && tokens[i + 1]?.text === api) {
      if (tokens[i + 1]?.kind === SyntaxKind.Identifier) found.push("property");
      continue;
    }
    if (token.kind === SyntaxKind.OpenBracketToken && literalValue(tokens[i + 1]) === api) {
      found.push("string member");
      continue;
    }
    if (token.kind !== SyntaxKind.Identifier || token.text !== api) continue;
    const before = tokens[i - 1]?.kind;
    const after = tokens[i + 1]?.kind;
    const inClause =
      (before === SyntaxKind.OpenBraceToken || before === SyntaxKind.CommaToken) &&
      (after === SyntaxKind.ColonToken ||
        after === SyntaxKind.AsKeyword ||
        after === SyntaxKind.CommaToken ||
        after === SyntaxKind.CloseBraceToken);
    if (inClause) found.push("braced clause");
    else if (before !== SyntaxKind.DotToken && api !== "list") found.push("identifier");
  }
  return found;
}

/** Every module specifier a source imports, static or dynamic. */
function importSpecifiers(tokens: Token[]): string[] {
  const specifiers: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const before = tokens[i - 1]?.kind;
    if (before !== SyntaxKind.FromKeyword && before !== SyntaxKind.OpenParenToken) continue;
    const value = literalValue(tokens[i]);
    if (value !== null) specifiers.push(value);
  }
  return specifiers;
}

test("the forbidden-Storage reader sees syntax, not text", () => {
  // A self-check: without it the surface test below could keep passing because the reader is blind,
  // not because the app is clean. Every line here is a way someone has actually reached, or could
  // reach, a Storage API without typing `uploadBytes(`.
  const caught = (snippet: string, api = "uploadBytes"): boolean =>
    forbiddenPositions(tokenize(snippet), api).length > 0;

  expect(caught("await storage.uploadBytes(objectRef, bytes);"), "direct call").toBe(true);
  expect(caught("const u = storage.uploadBytes;\nu();"), "property extraction").toBe(true);
  expect(caught('storage["uploadBytes"](ref, bytes);'), "string member").toBe(true);
  expect(caught('import { uploadBytes as u } from "firebase/storage";\nu();'), "alias import").toBe(
    true,
  );

  // The one name whose bare identifier is deliberately not banned. Every way a Storage `list` could
  // actually arrive is still caught: as a member, as a destructured namespace property, and as a
  // named binding from any module — the SDK or the allowed `@denn/firebase` root that may one day
  // re-export it. An ordinary local of the same name stays legal, which is the point.
  expect(caught("const u = storage.list;", "list"), "list property").toBe(true);
  expect(caught('storage["list"](objectRef);', "list"), "list string member").toBe(true);
  expect(caught("const { list: l } = storage;\nl(objectRef);", "list"), "list destructured").toBe(
    true,
  );
  expect(caught("const { list } = storage;\nlist(objectRef);", "list"), "list shorthand").toBe(
    true,
  );
  expect(
    caught('import { list as l } from "@denn/firebase";\nl(objectRef);', "list"),
    "list alias import from the allowed root",
  ).toBe(true);
  expect(caught('import { list } from "firebase/storage";', "list"), "list named import").toBe(
    true,
  );
  expect(caught('export { list as l } from "@denn/firebase";', "list"), "list re-export").toBe(
    true,
  );
  expect(
    caught('import { templateList as list } from "./catalog";', "list"),
    "ordinary local named list",
  ).toBe(false);
  expect(caught("const list = categories;\nreturn list.some(Boolean);", "list"), "plain list").toBe(
    false,
  );

  // Prose and data are not uses, and the scanner — not a regex — is what tells them apart.
  expect(caught("// uploadBytes is deliberately never called here"), "line comment").toBe(false);
  expect(caught("/* uploadBytes, uploadString and listAll stay out */"), "block comment").toBe(
    false,
  );
  expect(caught('const label = "uploadBytes";'), "string content").toBe(false);

  // Every `firebase/*` specifier has to be claimed by an allowed form, so a way of reaching the SDK
  // fails by not being one — nobody has to have thought of it first. These are ways in that carry
  // no forbidden name and would leave the approved member set untouched.
  const unexplained = (source: string): string[] => sdkUsage(tokenize(source)).unaccounted;

  expect(unexplained('export * from "firebase/storage";'), "star re-export").not.toEqual([]);
  expect(
    unexplained('export { getBytes } from "firebase/storage";'),
    "named re-export",
  ).not.toEqual([]);
  expect(
    unexplained('function leak() {\n  return import("firebase/storage");\n}'),
    "dynamic import returned rather than bound",
  ).not.toEqual([]);
  expect(
    unexplained('import * as storage from "firebase/storage";'),
    "namespace import",
  ).not.toEqual([]);
  expect(unexplained('import "firebase/storage";'), "side-effect import").not.toEqual([]);
  expect(
    unexplained('const storage = await import("firebase/storage");\nstorage[name]();'),
    "computed member",
  ).not.toEqual([]);
  expect(
    unexplained('const storage = await import("firebase/storage");\nhandOff(storage);'),
    "namespace passed as a value",
  ).not.toEqual([]);

  // And the forms the boundary does allow are read, not merely tolerated.
  const bound = sdkUsage(
    tokenize(
      "const [{ getApp }, storage] = await Promise.all([\n" +
        '  import("firebase/app"),\n' +
        '  import("firebase/storage"),\n' +
        "]);\n" +
        "const instance = storage.getStorage(getApp());\n" +
        "await storage.getBytes(storage.ref(instance, path));",
    ),
  );
  expect(bound.unaccounted, "the approved shape is explained").toEqual([]);
  expect([...(bound.reached.get("firebase/storage") ?? [])].sort(), "members read").toEqual([
    "getBytes",
    "getStorage",
    "ref",
  ]);
});

test("the customer app's own Storage surface stays read-only", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const firebaseSrc = join(repoRoot, "packages", "firebase", "src");

  // The customer's production surface: its own sources, plus exactly the `@denn/firebase` surface it
  // imports — the root barrel with its public-catalog / public-images boundary, and `space-read`.
  // Nothing else is in scope, and the import assertion below is what keeps that honest: if the app
  // ever reaches for the write or admin subpath, it fails there first.
  const mockupFiles = productionSources(join(repoRoot, "apps", "mockup", "src"));
  const files = [
    ...mockupFiles,
    join(firebaseSrc, "index.ts"),
    ...productionSources(join(firebaseSrc, "public-catalog")),
    ...productionSources(join(firebaseSrc, "public-images")),
    ...productionSources(join(firebaseSrc, "space-read")),
  ];
  expect(files.length).toBeGreaterThan(0);
  const scanned = files.map((file) => tokenize(readFileSync(file, "utf8")));

  // 1. The app imports one Firebase-shaped surface and only one, and never the SDK directly.
  for (const tokens of mockupFiles.map((file) => tokenize(readFileSync(file, "utf8")))) {
    for (const specifier of importSpecifiers(tokens)) {
      if (specifier.startsWith("@denn/firebase")) {
        expect(["@denn/firebase", "@denn/firebase/space-read"], specifier).toContain(specifier);
      }
      expect(specifier.startsWith("firebase/"), specifier).toBe(false);
    }
  }

  // 2. What every Firebase SDK product hands to this surface, member by member, equals the approved
  // set — nothing extra and nothing missing. This is the whole boundary in one statement: it holds
  // whatever syntax is used, and it holds for capabilities nobody thought to forbid.
  const usage: SdkUsage = { reached: new Map(), unaccounted: [] };
  for (const tokens of scanned) {
    const file = sdkUsage(tokens);
    for (const [module, members] of file.reached)
      for (const member of members) record(usage, module, member);
    usage.unaccounted.push(...file.unaccounted);
  }
  expect(usage.unaccounted, "SDK uses the reader could not account for").toEqual([]);
  expect([...usage.reached.keys()].sort(), "SDK products reached").toEqual(
    Object.keys(APPROVED_SDK_MEMBERS).sort(),
  );
  for (const [module, approved] of Object.entries(APPROVED_SDK_MEMBERS)) {
    expect([...(usage.reached.get(module) ?? [])].sort(), module).toEqual([...approved].sort());
  }

  // 3. And no forbidden name is reachable anywhere on the surface, in any syntactic position —
  // defence in depth for the `@denn/firebase` re-export path, which never touches `firebase/*`.
  for (const [index, tokens] of scanned.entries()) {
    for (const api of FORBIDDEN_STORAGE_API) {
      expect(forbiddenPositions(tokens, api), `${api} in ${files[index]}`).toEqual([]);
    }
  }
});
