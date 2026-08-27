import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

/** Remove line and block comments so a source scan measures real calls, not prose about them. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

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
 * Where a forbidden Storage symbol can appear once comments are gone. Matching a CALL alone is not
 * enough — `import { uploadBytes as u }`, `const u = storage.uploadBytes` and `storage["uploadBytes"]`
 * all reach the same API without ever writing `uploadBytes(`.
 *
 * `list` is the one name that also occurs as ordinary English in app code (a local `list` variable,
 * a `template-list` test id), so the bare-identifier form is skipped for it. Nothing is lost: the
 * customer app imports no `firebase/*` module at all (asserted below), so the Storage `list` can
 * only ever arrive as a property of the namespace object — which the property and bracket forms
 * cover, for every name including this one.
 */
function storageReferenceForms(api: string): RegExp[] {
  const forms = [
    new RegExp(`\\.\\s*${api}\\b`), // storage.uploadBytes / .uploadBytes(
    new RegExp(`\\[\\s*["'\`]${api}["'\`]\\s*\\]`), // storage["uploadBytes"]
  ];
  if (api !== "list") forms.push(new RegExp(`\\b${api}\\b`)); // import { uploadBytes as u }
  return forms;
}

/** Every module specifier a source imports, static or dynamic. */
function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1] ?? "");
}

test("the forbidden-Storage detector catches aliases and property access, not comments", () => {
  // A self-check: without it the surface test below could keep passing because the detector is
  // blind, not because the app is clean.
  const caught = (snippet: string, api = "uploadBytes"): boolean =>
    storageReferenceForms(api).some((form) => form.test(stripComments(snippet)));

  expect(caught('import { uploadBytes as u } from "firebase/storage";\nu();'), "alias import").toBe(
    true,
  );
  expect(caught("const u = storage.uploadBytes;\nu();"), "property extraction").toBe(true);
  expect(caught('storage["uploadBytes"](ref, bytes);'), "bracket property").toBe(true);
  expect(caught("await storage.uploadBytes(objectRef, bytes);"), "direct call").toBe(true);

  // The same three shapes for the one name whose bare identifier is deliberately not banned.
  expect(caught("const u = storage.list;", "list"), "list property extraction").toBe(true);
  expect(caught('storage["list"](objectRef);', "list"), "list bracket property").toBe(true);
  expect(caught("const list = categories;\nreturn list.some(Boolean);", "list"), "plain list").toBe(
    false,
  );

  // Prose about an API is not a use of it.
  expect(caught("// uploadBytes is deliberately never called here"), "line comment").toBe(false);
  expect(caught("/* uploadBytes, uploadString and listAll stay out */"), "block comment").toBe(
    false,
  );
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
  const source = files.map((file) => stripComments(readFileSync(file, "utf8"))).join("\n");

  // 1. The app imports one Firebase-shaped surface and only one, and never the SDK directly.
  const mockupSpecifiers = new Set(
    mockupFiles.flatMap((file) => importSpecifiers(stripComments(readFileSync(file, "utf8")))),
  );
  for (const specifier of mockupSpecifiers) {
    if (specifier.startsWith("@denn/firebase")) {
      expect(["@denn/firebase", "@denn/firebase/space-read"], specifier).toContain(specifier);
    }
    expect(specifier.startsWith("firebase/"), specifier).toBe(false);
  }

  // 2. No forbidden Storage symbol is referenced anywhere in that surface, in any shape.
  for (const api of FORBIDDEN_STORAGE_API) {
    for (const form of storageReferenceForms(api)) {
      expect(source, `${api} ${form.source}`).not.toMatch(form);
    }
  }

  // 3. The approved read boundary is still exactly where specs 079/080 put it. Pinning the calls to
  // the facade — namespace and all — stops a same-named helper elsewhere from satisfying this and
  // leaving the real Storage calls unwatched.
  const facade = stripComments(
    readFileSync(join(firebaseSrc, "space-read", "proof-sdk-facade.ts"), "utf8"),
  );
  for (const api of ["getStorage", "ref", "getMetadata", "getBytes"]) {
    expect(facade, api).toMatch(new RegExp(`\\bstorage\\.${api}\\s*\\(`));
  }
});
