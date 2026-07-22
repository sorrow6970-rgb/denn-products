import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, relativeLuminance, round2, wcagLevel } from '../../src/lib/contrast';

describe('contrast', () => {
  it('parses shorthand and full hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#B0894E')).toEqual({ r: 176, g: 137, b: 78 });
  });

  it('rejects invalid hex', () => {
    expect(() => hexToRgb('nope')).toThrow();
  });

  it('white and black are the max ratio (21:1)', () => {
    expect(round2(contrastRatio('#ffffff', '#000000'))).toBe(21);
  });

  it('luminance of white is 1 and black is 0', () => {
    expect(round2(relativeLuminance('#ffffff'))).toBe(1);
    expect(round2(relativeLuminance('#000000'))).toBe(0);
  });

  it('white on caramel amber accent #B0894E is below normal-text AA', () => {
    const ratio = contrastRatio('#ffffff', '#B0894E');
    expect(ratio).toBeGreaterThan(3); // passes AA-large / UI (non-text, large/bold only)
    expect(ratio).toBeLessThan(4.5); // fails normal-text AA → not used as normal label
    expect(wcagLevel(ratio)).toBe('AA-large');
  });

  it('accent-ink #191A1D on caramel amber accent #B0894E passes normal-text AA', () => {
    const ratio = contrastRatio('#191A1D', '#B0894E');
    expect(ratio).toBeGreaterThanOrEqual(4.5); // normal-text AA
    expect(wcagLevel(ratio)).toBe('AA');
  });

  it('white on accent-2 #C6A46B is below UI/large 3:1', () => {
    const ratio = contrastRatio('#ffffff', '#C6A46B');
    expect(ratio).toBeLessThan(3); // fails even non-text UI / large-text 3:1 → no white on accent-2
  });

  it('accent #B0894E on accent-soft #F2E9DA is below normal-text AA', () => {
    const ratio = contrastRatio('#B0894E', '#F2E9DA');
    expect(ratio).toBeLessThan(4.5); // accent text on the soft tint fails normal-text AA
  });

  it('ink #191A1D on accent-soft #F2E9DA passes normal-text AA', () => {
    const ratio = contrastRatio('#191A1D', '#F2E9DA');
    expect(ratio).toBeGreaterThanOrEqual(4.5); // ink is the correct text/icon on the soft tint (≈14.45:1)
    expect(wcagLevel(ratio)).not.toBe('fail');
  });

  it('dark ink on kakao yellow passes AA', () => {
    const ratio = contrastRatio('#1A1400', '#FEE500');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
