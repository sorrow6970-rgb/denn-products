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

export type OrientationLockResult =
  | 'idle'
  | 'unsupported'
  | 'not-fullscreen'
  | 'locked'
  | 'denied'
  | 'error';

/** Pure decision (spec §E): attempt orientation lock only when supported AND in fullscreen. */
export function orientationLockPlan(
  supported: boolean,
  inFullscreen: boolean,
): 'unsupported' | 'not-fullscreen' | 'attempt' {
  if (!supported) return 'unsupported';
  if (!inFullscreen) return 'not-fullscreen';
  return 'attempt';
}

export interface FullscreenCapabilities {
  fullscreenEnabled: boolean;
  requestSupported: boolean;
  orientationLockSupported: boolean;
}

type ScreenOrientationLike = {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};
function orientationApi(): ScreenOrientationLike | undefined {
  return (screen as Screen & { orientation?: ScreenOrientationLike }).orientation;
}

export function detectFullscreenCapabilities(): FullscreenCapabilities {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
  const requestSupported =
    typeof el.requestFullscreen === 'function' ||
    typeof el.webkitRequestFullscreen === 'function';
  const so = orientationApi();
  return {
    fullscreenEnabled: Boolean(document.fullscreenEnabled),
    requestSupported,
    orientationLockSupported: typeof so?.lock === 'function',
  };
}

type StateListener = (state: FsState) => void;
type LockListener = (result: OrientationLockResult) => void;

/** DOM controller wrapping the pure reducer. Single owner of fullscreen + orientation-lock. */
export class FullscreenController {
  private state: FsState = 'idle';
  private readonly listeners = new Set<StateListener>();
  private readonly caps = detectFullscreenCapabilities();
  private onChange: (() => void) | null = null;
  private rafId = 0;

  // orientation lock (single owner; attempted only after fullscreen is active)
  private lockResult: OrientationLockResult = 'idle';
  private readonly lockListeners = new Set<LockListener>();
  private locked = false;

  getState(): FsState {
    return this.state;
  }
  getCapabilities(): FullscreenCapabilities {
    return this.caps;
  }
  getLockResult(): OrientationLockResult {
    return this.lockResult;
  }
  subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  subscribeLock(fn: LockListener): () => void {
    this.lockListeners.add(fn);
    return () => this.lockListeners.delete(fn);
  }

  private setLockResult(r: OrientationLockResult): void {
    this.lockResult = r;
    this.lockListeners.forEach((l) => l(r));
  }

  private dispatch(event: FsEvent): void {
    const next = fsReduce(this.state, event);
    if (next === this.state) return; // block duplicate/no-op transitions
    this.state = next;
    this.listeners.forEach((l) => l(next));
    if (next === 'active') void this.tryLockOrientation();
    if (next === 'settling') {
      this.doUnlockOrientation();
      // single, purposeful rAF (not an arbitrary timer stack)
      this.rafId = requestAnimationFrame(() => this.dispatch('settled'));
    }
  }

  /** Attempt orientation lock — only supported + in fullscreen. Denial/failure is non-fatal. */
  private async tryLockOrientation(): Promise<void> {
    const plan = orientationLockPlan(
      this.caps.orientationLockSupported,
      Boolean(document.fullscreenElement),
    );
    if (plan === 'unsupported') {
      this.setLockResult('unsupported');
      return;
    }
    if (plan === 'not-fullscreen') {
      this.setLockResult('not-fullscreen');
      return;
    }
    const so = orientationApi();
    if (!so || typeof so.lock !== 'function') {
      this.setLockResult('unsupported');
      return;
    }
    try {
      await so.lock('landscape');
      this.locked = true;
      this.setLockResult('locked');
    } catch (err) {
      // 권한 거부/실패는 치명적 오류가 아니다 — 화면 관측용 결과만 남기고 계속 사용 가능.
      const name = err instanceof Error ? err.name : 'UnknownError';
      this.setLockResult(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    }
  }

  /** Release orientation lock on fullscreen exit (if we locked it). Non-fatal on failure. */
  private doUnlockOrientation(): void {
    if (!this.locked) return;
    this.locked = false;
    const so = orientationApi();
    if (so && typeof so.unlock === 'function') {
      try {
        so.unlock();
      } catch (err) {
        // 비치명적: unlock 실패는 브라우저가 FS 종료 시 자연 해제. 관측용 결과만 반영.
        void err;
        this.setLockResult('error');
      }
    }
  }

  /** Attach the single fullscreenchange owner. Returns detach cleanup. */
  attach(): () => void {
    const handler = (): void => {
      if (document.fullscreenElement) this.dispatch('entered');
      else if (this.state === 'active') {
        this.dispatch('exit');
        this.dispatch('exited');
      } else if (this.state === 'entering') this.dispatch('fail');
      else if (this.state === 'exiting') this.dispatch('exited');
    };
    this.onChange = handler;
    document.addEventListener('fullscreenchange', handler);
    return () => {
      if (this.onChange) document.removeEventListener('fullscreenchange', this.onChange);
      this.onChange = null;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.doUnlockOrientation();
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
