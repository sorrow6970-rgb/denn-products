import { describe, expect, it } from 'vitest';
import { computeViewportLayout, ZOOM_SCALE_THRESHOLD } from '../../src/lib/diagnostics';

// spec 002 §1: one pure decision distinguishes pinch-zoom from a virtual-keyboard shrink.
describe('computeViewportLayout (spec 002)', () => {
  it('scale=1, no viewport shrink → not zoomed, inset 0', () => {
    expect(computeViewportLayout({ innerHeight: 800, vvHeight: 800, offsetTop: 0, scale: 1 })).toEqual(
      { isZoomed: false, keyboardInset: 0 },
    );
  });

  it('scale=1, keyboard-sized viewport shrink → not zoomed, positive inset', () => {
    expect(
      computeViewportLayout({ innerHeight: 800, vvHeight: 500, offsetTop: 0, scale: 1 }),
    ).toEqual({ isZoomed: false, keyboardInset: 300 });
  });

  it('scale=2, viewport shrink → zoomed, inset forced to 0 (not treated as keyboard)', () => {
    expect(
      computeViewportLayout({ innerHeight: 800, vvHeight: 400, offsetTop: 0, scale: 2 }),
    ).toEqual({ isZoomed: true, keyboardInset: 0 });
  });

  it('scale=1.005 → not zoomed (within float jitter tolerance)', () => {
    expect(
      computeViewportLayout({ innerHeight: 800, vvHeight: 780, offsetTop: 0, scale: 1.005 }).isZoomed,
    ).toBe(false);
  });

  it('scale=1.02 → zoomed (above threshold)', () => {
    expect(
      computeViewportLayout({ innerHeight: 800, vvHeight: 780, offsetTop: 0, scale: 1.02 }).isZoomed,
    ).toBe(true);
  });

  it('the threshold constant is the single source of truth at 1.01', () => {
    expect(ZOOM_SCALE_THRESHOLD).toBe(1.01);
  });

  it('offsetTop is subtracted from the keyboard inset', () => {
    expect(
      computeViewportLayout({ innerHeight: 800, vvHeight: 500, offsetTop: 40, scale: 1 }),
    ).toEqual({ isZoomed: false, keyboardInset: 260 });
  });

  it('rounds a fractional inset to an integer', () => {
    expect(
      computeViewportLayout({ innerHeight: 800, vvHeight: 500.4, offsetTop: 0, scale: 1 })
        .keyboardInset,
    ).toBe(300);
  });

  it('NaN / missing / negative inputs → safe non-negative default', () => {
    expect(computeViewportLayout({ innerHeight: NaN, vvHeight: 500, offsetTop: 0, scale: 1 })).toEqual(
      { isZoomed: false, keyboardInset: 0 },
    );
    expect(computeViewportLayout({ innerHeight: 800, vvHeight: NaN, offsetTop: 0, scale: NaN })).toEqual(
      { isZoomed: false, keyboardInset: 0 },
    );
    // negative shrink (vvHeight > innerHeight) must never yield a negative inset
    const r = computeViewportLayout({ innerHeight: 500, vvHeight: 800, offsetTop: 0, scale: 1 });
    expect(r.isZoomed).toBe(false);
    expect(r.keyboardInset).toBeGreaterThanOrEqual(0);
  });
});
