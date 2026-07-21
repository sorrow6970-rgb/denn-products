import { test, expect, type ConsoleMessage } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Auto viewport matrix (spec §5 + mobile-responsive-contract §10). Desktop-emulated only —
// real in-app webview results live in results/device-matrix.md and are NOT assumed PASS here.
const MATRIX = [
  { name: 'mobile-320x568', width: 320, height: 568 },
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'iphone-390x844-portrait', width: 390, height: 844 },
  { name: 'iphone-844x390-landscape', width: 844, height: 390 },
  { name: 'large-430x932-portrait', width: 430, height: 932 },
  { name: 'large-932x430-landscape', width: 932, height: 430 },
  { name: 'tablet-768x1024-portrait', width: 768, height: 1024 },
  { name: 'tablet-1024x768-landscape', width: 1024, height: 768 },
  { name: 'desktop-1280x800', width: 1280, height: 800 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
] as const;

test.describe('viewport matrix', () => {
  for (const v of MATRIX) {
    test(v.name, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      page.on('console', (m: ConsoleMessage) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => consoleErrors.push(String(e)));

      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto('/', { waitUntil: 'networkidle' });

      // 1) no horizontal page overflow
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${v.name}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // 2) primary CTA visible and within viewport
      const cta = page.getByTestId('primary-cta');
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box, `${v.name}: primary CTA has no box`).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(v.width + 1);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }

      // 3) every visible button ≥ 44×44
      const smallButtons = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll('button').forEach((b) => {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && (r.width < 44 || r.height < 44)) {
            bad.push(`${(b.textContent || '').trim().slice(0, 12)} ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        });
        return bad;
      });
      expect(smallButtons, `${v.name}: sub-44 touch targets`).toEqual([]);

      // 3b) Canvas keeps its 3:4 CSS box on every viewport (spec 003 §2). The DPR/backing store
      //     is a separate contract (§3): observed and attached below, never mixed into this verdict.
      const cv = await page.locator('canvas').first().evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const r = c.getBoundingClientRect();
        return { cssW: r.width, cssH: r.height, backW: c.width, backH: c.height };
      });
      const ratio = cv.cssW / cv.cssH;
      expect(cv.cssW, `${v.name}: canvas css width ${cv.cssW}`).toBeGreaterThan(0);
      expect(cv.cssH, `${v.name}: canvas css height ${cv.cssH}`).toBeGreaterThan(0);
      expect(
        Math.abs(ratio - 0.75),
        `${v.name}: canvas ratio ${ratio.toFixed(4)} (css ${cv.cssW.toFixed(1)}x${cv.cssH.toFixed(1)}) not within 0.75±0.01`,
      ).toBeLessThanOrEqual(0.01);
      // §3 observation only — no assertion (a 1px rounding delta is not a defect): backing ≈ css × DPR(≤2).
      await testInfo.attach(`canvas-${v.name}`, {
        body: JSON.stringify(
          {
            cssW: Math.round(cv.cssW * 10) / 10,
            cssH: Math.round(cv.cssH * 10) / 10,
            ratio: Math.round(ratio * 1000) / 1000,
            backW: cv.backW,
            backH: cv.backH,
            backingRatioW: cv.cssW > 0 ? Math.round((cv.backW / cv.cssW) * 100) / 100 : null,
            backingRatioH: cv.cssH > 0 ? Math.round((cv.backH / cv.cssH) * 100) / 100 : null,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      // 4) screenshot regression artifact
      await page.screenshot({ path: `results/screenshots/${v.name}.png`, fullPage: true });

      // 5) axe accessibility
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter(
        (x) => x.impact === 'serious' || x.impact === 'critical',
      );
      // color-contrast는 확정 Modern Studio 토큰 #C0614A(흰색 대비 4.16:1) 특성에서 비롯.
      // spec §3: 확정 토큰을 임의 변경하지 않고 계산·대안만 보고 → 하드페일에서 제외하고 기록만 한다.
      const contrast = serious.filter((x) => x.id === 'color-contrast');
      const otherSerious = serious.filter((x) => x.id !== 'color-contrast');
      await testInfo.attach(`axe-${v.name}`, {
        body: JSON.stringify(
          {
            total: axe.violations.length,
            serious: serious.map((s) => ({ id: s.id, impact: s.impact })),
            colorContrastNodes: contrast.flatMap((c) => c.nodes.map((n) => n.target)),
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      // 6) no unexpected console errors + no serious a11y OTHER than the documented token contrast
      expect(consoleErrors, `${v.name}: console errors`).toEqual([]);
      expect(
        otherSerious.map((s) => s.id),
        `${v.name}: serious/critical a11y (color-contrast 제외)`,
      ).toEqual([]);
    });
  }
});
