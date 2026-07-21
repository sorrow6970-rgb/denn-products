// Environment probes for the diagnostics panel (spec §A). Privacy: the full UA string is
// never transmitted or stored; only a coarse, non-sensitive browser category is derived.

export interface CssSupport {
  dvh: boolean;
  svh: boolean;
  colorMix: boolean;
  atProperty: boolean;
  containerQueries: boolean;
  fieldSizing: boolean;
}

export interface UnitMeasurements {
  vh100: number;
  svh100: number;
  dvh100: number;
}

export interface Diagnostics {
  browserCategory: string;
  innerWidth: number;
  innerHeight: number;
  visualViewport: { width: number; height: number; offsetTop: number; scale: number } | null;
  devicePixelRatio: number;
  orientation: string;
  fullscreenEnabled: boolean;
  orientationLockSupported: boolean;
  css: CssSupport;
  units: UnitMeasurements;
}

/** Coarse, non-sensitive category. Does not expose or persist the raw UA. */
export function browserCategory(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes('kakaotalk')) return '카카오톡 인앱 웹뷰';
  if (s.includes('samsungbrowser')) return 'Samsung Internet';
  if (s.includes('fban') || s.includes('fbav') || s.includes('instagram')) return '기타 인앱 웹뷰';
  const iOS = /iphone|ipad|ipod/.test(s);
  if (iOS && s.includes('crios')) return 'iOS Chrome';
  if (iOS) return 'iOS Safari';
  if (s.includes('edg/')) return 'Edge';
  if (s.includes('chrome')) return 'Chrome 계열';
  if (s.includes('firefox')) return 'Firefox';
  if (s.includes('safari')) return 'Safari';
  return '기타 브라우저';
}

function supports(prop: string, value: string): boolean {
  try {
    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      ? CSS.supports(prop, value)
      : false;
  } catch {
    return false;
  }
}

export function cssSupport(): CssSupport {
  return {
    dvh: supports('height', '100dvh'),
    svh: supports('height', '100svh'),
    colorMix: supports('color', 'color-mix(in srgb, red, blue)'),
    // @property support correlates with CSS.registerProperty availability
    atProperty:
      typeof CSS !== 'undefined' &&
      typeof (CSS as unknown as { registerProperty?: unknown }).registerProperty === 'function',
    containerQueries: supports('container-type', 'inline-size'),
    fieldSizing: supports('field-sizing', 'content'),
  };
}

/** Measure the *actual* pixel height of 100vh / 100svh / 100dvh in this browser. */
export function measureUnits(): UnitMeasurements {
  const make = (unit: string): number => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:0;left:-9999px;width:1px;height:100${unit};visibility:hidden;pointer-events:none`;
    document.body.appendChild(el);
    const h = el.getBoundingClientRect().height;
    el.remove();
    return Math.round(h);
  };
  return { vh100: make('vh'), svh100: make('svh'), dvh100: make('dvh') };
}

export function readDiagnostics(): Diagnostics {
  const vv = window.visualViewport;
  const so = (screen as Screen & { orientation?: { type?: string } }).orientation;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
  const requestSupported =
    typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
  const lock = (screen as Screen & { orientation?: { lock?: unknown } }).orientation?.lock;

  return {
    browserCategory: browserCategory(navigator.userAgent),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualViewport: vv
      ? {
          width: Math.round(vv.width),
          height: Math.round(vv.height),
          offsetTop: Math.round(vv.offsetTop),
          scale: Math.round(vv.scale * 100) / 100,
        }
      : null,
    devicePixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
    orientation:
      so?.type ??
      (window.innerWidth > window.innerHeight ? 'landscape (추정)' : 'portrait (추정)'),
    fullscreenEnabled: Boolean(document.fullscreenEnabled) && requestSupported,
    orientationLockSupported: typeof lock === 'function',
    css: cssSupport(),
    units: measureUnits(),
  };
}
