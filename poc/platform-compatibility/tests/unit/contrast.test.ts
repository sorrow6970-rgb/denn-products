import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, relativeLuminance, round2, wcagLevel } from '../../src/lib/contrast';

describe('contrast', () => {
  it('parses shorthand and full hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#9F887A')).toEqual({ r: 159, g: 136, b: 122 });
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

  it('white on warm taupe accent #9F887A is below normal-text AA', () => {
    const ratio = contrastRatio('#ffffff', '#9F887A');
    expect(ratio).toBeGreaterThan(3); // passes AA-large / UI (non-text, large/bold only)
    expect(ratio).toBeLessThan(4.5); // ≈3.35: fails normal-text AA → not used as normal label
    expect(wcagLevel(ratio)).toBe('AA-large');
  });

  it('accent-ink #191A1D on warm taupe accent #9F887A passes normal-text AA', () => {
    const ratio = contrastRatio('#191A1D', '#9F887A');
    expect(ratio).toBeGreaterThanOrEqual(4.5); // ≈5.20: normal-text AA
    expect(wcagLevel(ratio)).toBe('AA');
  });

  it('white on accent-2 #BAA598 is below UI/large 3:1', () => {
    const ratio = contrastRatio('#ffffff', '#BAA598');
    expect(ratio).toBeLessThan(3); // ≈2.35: fails even non-text UI / large-text 3:1 → no white on accent-2
  });

  it('accent #9F887A on accent-soft #EEE8E1 fails normal-text AA and UI 3:1', () => {
    const ratio = contrastRatio('#9F887A', '#EEE8E1');
    expect(ratio).toBeLessThan(4.5); // fails normal-text AA
    expect(ratio).toBeLessThan(3); // ≈2.75: also fails the 3:1 non-text/UI boundary
  });

  it('ink #191A1D on accent-soft #EEE8E1 passes normal-text AA', () => {
    const ratio = contrastRatio('#191A1D', '#EEE8E1');
    expect(ratio).toBeGreaterThanOrEqual(4.5); // ink is the correct text/icon on the soft tint (≈14.31:1)
    expect(wcagLevel(ratio)).not.toBe('fail');
  });

  it('dark ink on kakao yellow passes AA', () => {
    const ratio = contrastRatio('#1A1400', '#FEE500');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
