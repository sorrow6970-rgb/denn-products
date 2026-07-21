import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, relativeLuminance, round2, wcagLevel } from '../../src/lib/contrast';

describe('contrast', () => {
  it('parses shorthand and full hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#C0614A')).toEqual({ r: 192, g: 97, b: 74 });
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

  it('white on Modern Studio terracotta #C0614A is below normal-text AA', () => {
    const ratio = contrastRatio('#ffffff', '#C0614A');
    expect(ratio).toBeGreaterThan(3); // passes AA-large / UI
    expect(ratio).toBeLessThan(4.5); // fails normal-text AA
    expect(wcagLevel(ratio)).toBe('AA-large');
  });

  it('dark ink on kakao yellow passes AA', () => {
    const ratio = contrastRatio('#1A1400', '#FEE500');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
