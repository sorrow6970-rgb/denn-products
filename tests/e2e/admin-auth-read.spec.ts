import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { type ConsoleMessage, expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../../playwright.config";

// Operator remote-read card in a real browser (spec 036 §8). The default build is UNCONFIGURED, so
// the whole point of this suite is proving that nothing Firebase-shaped happens: no request, no
// controls, and no trace of the SDK in the customer bundle.

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

test("the customer bundle contains only the approved lazy space Firestore boundary", () => {
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

test("the customer app's own Storage call surface stays read-only", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

  // The customer's production surface: its own sources plus the ONE `@denn/firebase` subpath it
  // imports. Limiting the package half to `space-read` is justified by the import assertion below —
  // if the app ever reaches for the write or admin subpath, that assertion fails first.
  const files = [
    ...productionSources(join(repoRoot, "apps", "mockup", "src")),
    ...productionSources(join(repoRoot, "packages", "firebase", "src", "space-read")),
  ];
  expect(files.length).toBeGreaterThan(0);
  const source = files.map((file) => stripComments(readFileSync(file, "utf8"))).join("\n");

  for (const subpath of [
    "@denn/firebase/space-write",
    "@denn/firebase/admin-read",
    "@denn/firebase/admin-write",
  ]) {
    expect(source.includes(subpath), subpath).toBe(false);
  }

  // Specs 079/080 (Founder MM-1=A) approved exactly one Storage capability for the customer: read.
  // Every mutating and enumerating API stays forbidden as a CALL — which a vendor export map is not.
  for (const api of [
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
  ]) {
    expect(source, api).not.toMatch(new RegExp(`\\b${api}\\s*\\(`));
  }

  // And the approved read boundary must still actually be here: without this the test would keep
  // passing if the Storage calls moved somewhere this scan no longer looks.
  for (const api of ["getStorage", "ref", "getMetadata", "getBytes"]) {
    expect(source, api).toMatch(new RegExp(`\\b${api}\\s*\\(`));
  }
});
