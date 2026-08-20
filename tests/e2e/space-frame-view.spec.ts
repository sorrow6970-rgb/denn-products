import { expect, test } from "@playwright/test";
import { MOCKUP_PORT } from "../../playwright.config";

// Spec 060 fixture, spec 063 contract. Every port here is injected and in-memory, so this file can
// assert something the production-route suite cannot: not just "no network happened", but that the
// injected catalog reader, readiness factory and font environment were never even CONSULTED. Under
// spec 062 / FF-1=A a `space-scene-v1` payload can never prove its capture orientation, so the
// preflight in SpacePostAuthFrameView stops ahead of all of them and the composition never mounts.
//
// The former canvas-success assertions (ready plan, proof/art loads, font checks, owner
// create/dispose counting across remounts) are unreachable for a V1 scene. Their replacement
// coverage is recorded in spec 063 §6.2 — proof-image-owner.test.ts, source-bound-readiness.test.ts
// and use-space-frame-fonts.test.ts keep the owner-lifecycle and font-bypass contracts pinned as
// unit tests. They are asserted here only as "still zero".

const fixture = (text: "present" | "none") =>
  `http://localhost:${MOCKUP_PORT}/e2e-space-frame-fixture.html?text=${text}`;

const BLOCKED_HEADING = "이 시안은 지금 화면에 표시할 수 없습니다";

/** Everything the composition would have touched. All of it stays untouched for a blocked scene. */
const UNTOUCHED = {
  catalogLoads: 0,
  readinessCreates: 0,
  readinessDisposes: 0,
  proofLoads: 0,
  artLoads: 0,
  ownerSubscriptions: 0,
  fontFactories: 0,
  fontChecks: [],
};

test("post-auth frame view blocks an unproven V1 scene before any injected port is used", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  const consoleProblems: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      externalRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleProblems.push(`pageerror: ${error.message}`));

  await page.goto(fixture("present"));

  expect(await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__)).toMatchObject({
    gateReads: 0,
    ...UNTOUCHED,
  });
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);

  await page.getByTestId("space-password").fill("synthetic-password");
  await page.getByTestId("space-submit").click();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(1);
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-status")).toContainText(
    "이 링크는 이전 버전에서 발급된 시안입니다.",
  );

  // The scene was decrypted — that is the password gate — and nothing downstream was consulted.
  expect(await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__)).toMatchObject({
    gateReads: 1,
    ...UNTOUCHED,
  });

  // Giving the view a real width is what used to unlock measurement → font → plan → Canvas. The
  // preflight sits ahead of all of it, so a width change starts nothing.
  await page.getByTestId("fixture-expand").click();
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  await expect(page.getByTestId("space-frame-retry")).toHaveCount(0);

  // Likewise releasing fonts: nothing is waiting on them, and no environment was ever built.
  await page.getByTestId("fixture-release-fonts").click();
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);
  expect(await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__)).toMatchObject(UNTOUCHED);
  expect(externalRequests).toEqual([]);

  await page.getByTestId("fixture-unmount").click();
  await expect(page.getByTestId("space-frame-view")).toHaveCount(0);
  await page.getByTestId("fixture-remount").click();
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);

  // Remounting must not escalate to a best-effort render or leave an owner behind. `disposes ===
  // creates` still holds — at zero, because no owner is ever created for a blocked scene.
  const remounted = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(remounted).toMatchObject(UNTOUCHED);
  expect(remounted.readinessDisposes).toBe(remounted.readinessCreates);
  expect(externalRequests).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test("an image-only frame is blocked the same way, with no font environment built", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`http://localhost:${MOCKUP_PORT}/`)) {
      externalRequests.push(request.url());
    }
  });
  await page.goto(fixture("none"));
  await page.getByTestId("space-password").fill("synthetic-password");
  await page.getByTestId("space-submit").click();
  await page.getByTestId("fixture-expand").click();
  await expect(page.getByRole("heading", { name: BLOCKED_HEADING })).toBeVisible();
  await expect(page.getByTestId("preview-canvas")).toHaveCount(0);

  // A textless scene used to bypass the font gate and reach the Canvas; now it does not reach the
  // gate at all. The bypass rule itself is unit-tested in use-space-frame-fonts.test.ts.
  const metrics = await page.evaluate(() => window.__DENN_SPACE_FRAME_FIXTURE__);
  expect(metrics).toMatchObject(UNTOUCHED);
  expect(externalRequests).toEqual([]);
});
