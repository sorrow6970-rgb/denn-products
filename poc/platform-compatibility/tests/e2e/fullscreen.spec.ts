import { test, expect, type ConsoleMessage } from '@playwright/test';

// Minimal interaction check (spec re-verify §6): clicking the fullscreen request button must
// produce observable state handling OR a normal fallback message — without a crash. We do NOT
// force actual fullscreen success (that depends on browser policy / user activation).
test('fullscreen request yields state handling or normal fallback (no crash)', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.getByTestId('fs-request').click();

  // requestFs() always sets a status message: success note, unsupported, or denied fallback.
  // Playwright auto-waits (observable state, no fixed sleep).
  await expect(
    page.getByText(/전체화면 진입 요청됨|Fullscreen API를 지원하지 않습니다|전체화면 요청이 거부/),
  ).toBeVisible();

  // clean up any fullscreen that may have been entered
  await page.evaluate(async () => {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen();
    }
  });

  expect(consoleErrors, 'no unexpected console errors on fullscreen interaction').toEqual([]);
});
