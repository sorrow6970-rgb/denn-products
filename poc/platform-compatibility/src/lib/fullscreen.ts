// Explicit single fullscreen/rotation state machine (spec §E, mobile-responsive-contract §8).
//   idle → entering → active → exiting → settling → idle
// One authority. Duplicate transitions blocked. No arbitrary multi-timer correction:
// the only scheduled step is a single rAF to move settling→idle after the browser exits.

export type FsState = 'idle' | 'entering' | 'active' | 'exiting' | 'settling';
export type FsEvent = 'request' | 'entered' | 'exit' | 'exited' | 'settled' | 'fail';

/** Pure transition function — unit tested. Unknown (state,event) pairs are no-ops. */
export function fsReduce(state: FsState, event: FsEvent): FsState {
  switch (state) {
    case 'idle':
      return event === 'request' ? 'entering' : 'idle';
    case 'entering':
      if (event === 'entered') return 'active';
      if (event === 'fail' || event === 'exited') return 'idle';
      return 'entering';
    case 'active':
      return event === 'exit' ? 'exiting' : 'active';
    case 'exiting':
      return event === 'exited' ? 'settling' : 'exiting';
    case 'settling':
      return event === 'settled' ? 'idle' : 'settling';
    default:
      return state;
  }
}

export interface FullscreenCapabilities {
  fullscreenEnabled: boolean;
  requestSupported: boolean;
  orientationLockSupported: boolean;
}

export function detectFullscreenCapabilities(): FullscreenCapabilities {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: unknown;
  };
  const requestSupported =
    typeof el.requestFullscreen === 'function' ||
    typeof el.webkitRequestFullscreen === 'function';
  const so = (screen as Screen & { orientation?: { lock?: unknown } }).orientation;
  return {
    fullscreenEnabled: Boolean(document.fullscreenEnabled),
    requestSupported,
    orientationLockSupported: typeof so?.lock === 'function',
  };
}

type Listener = (state: FsState) => void;

/** DOM controller wrapping the pure reducer. Single owner of fullscreen transitions. */
export class FullscreenController {
  private state: FsState = 'idle';
  private readonly listeners = new Set<Listener>();
  private readonly caps = detectFullscreenCapabilities();
  private onChange: (() => void) | null = null;
  private rafId = 0;

  getState(): FsState {
    return this.state;
  }
  getCapabilities(): FullscreenCapabilities {
    return this.caps;
  }
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private dispatch(event: FsEvent): void {
    const next = fsReduce(this.state, event);
    if (next === this.state) return; // block duplicate/no-op transitions
    this.state = next;
    this.listeners.forEach((l) => l(next));
    if (next === 'settling') {
      // single, purposeful rAF (not an arbitrary timer stack)
      this.rafId = requestAnimationFrame(() => this.dispatch('settled'));
    }
  }

  /** Attach the single fullscreenchange owner. Returns detach cleanup. */
  attach(): () => void {
    const handler = (): void => {
      if (document.fullscreenElement) this.dispatch('entered');
      else if (this.state === 'active') this.dispatch('exit'), this.dispatch('exited');
      else if (this.state === 'entering') this.dispatch('fail');
      else if (this.state === 'exiting') this.dispatch('exited');
    };
    this.onChange = handler;
    document.addEventListener('fullscreenchange', handler);
    return () => {
      if (this.onChange) document.removeEventListener('fullscreenchange', this.onChange);
      this.onChange = null;
      if (this.rafId) cancelAnimationFrame(this.rafId);
    };
  }

  /** User-gesture entry. Returns a fallback reason string when unavailable. */
  async request(target: HTMLElement): Promise<{ ok: boolean; reason?: string }> {
    if (this.state !== 'idle') return { ok: false, reason: '이미 전환 중입니다.' };
    if (!this.caps.requestSupported) {
      return { ok: false, reason: '이 브라우저는 Fullscreen API를 지원하지 않습니다. 페이지는 정상 동작합니다.' };
    }
    this.dispatch('request');
    const el = target as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    try {
      if (typeof el.requestFullscreen === 'function') await el.requestFullscreen();
      else if (typeof el.webkitRequestFullscreen === 'function') await el.webkitRequestFullscreen();
      return { ok: true };
    } catch (err) {
      this.dispatch('fail');
      const code = err instanceof Error ? err.name : 'UnknownError';
      return { ok: false, reason: `전체화면 요청이 거부되었습니다(${code}). 비전체화면으로 계속 사용할 수 있습니다.` };
    }
  }

  async exit(): Promise<void> {
    if (this.state !== 'active') return;
    this.dispatch('exit');
    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      } else {
        this.dispatch('exited');
      }
    } catch {
      this.dispatch('exited');
    }
  }
}
