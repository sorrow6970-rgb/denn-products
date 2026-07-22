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

      // 5) axe accessibility — spec 007: color-contrast is NOT blanket-excluded. The warm taupe
      //    palette uses accent-ink #191A1D on accent and ink on light surfaces so every text node
      //    meets WCAG AA; any remaining serious/critical violation (incl. color-contrast) fails.
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter(
        (x) => x.impact === 'serious' || x.impact === 'critical',
      );
      const contrastNodes = serious
        .filter((x) => x.id === 'color-contrast')
        .flatMap((c) => c.nodes.map((n) => n.target));
      await testInfo.attach(`axe-${v.name}`, {
        body: JSON.stringify(
          {
            total: axe.violations.length,
            serious: serious.map((s) => ({ id: s.id, impact: s.impact })),
            colorContrastNodes: contrastNodes,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      // 6) no unexpected console errors + no serious/critical a11y (color-contrast now enforced)
      expect(consoleErrors, `${v.name}: console errors`).toEqual([]);
      expect(
        serious.map((s) => s.id),
        `${v.name}: serious/critical a11y (color-contrast 포함)`,
      ).toEqual([]);
    });
  }
});
