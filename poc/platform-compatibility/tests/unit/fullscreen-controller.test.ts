import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FullscreenController } from '../../src/lib/fullscreen';

// Minimal DOM mock (no jsdom dependency). Verifies the controller lifecycle, in particular
// the React StrictMode attach → detach → attach flow (dispatch must work again after re-attach).

type Handler = () => void;

interface DomMock {
  listeners: Record<string, Handler[]>;
  fire: (type: string) => void;
  setFullscreen: (on: boolean) => void;
}

function installDomMock(): DomMock {
  const listeners: Record<string, Handler[]> = {};
  const fsEl: { current: object | null } = { current: null };
  const doc = {
    get fullscreenElement() {
      return fsEl.current;
    },
    fullscreenEnabled: true,
    documentElement: {
      requestFullscreen: async (): Promise<void> => {
        /* mock: browser enters fullscreen via the fullscreenchange event, fired by the test */
      },
    },
    exitFullscreen: async (): Promise<void> => {
      fsEl.current = null;
    },
    addEventListener: (type: string, fn: Handler): void => {
      (listeners[type] ||= []).push(fn);
    },
    removeEventListener: (type: string, fn: Handler): void => {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
    },
  };
  const scr = {
    orientation: {
      lock: async (): Promise<void> => {},
      unlock: (): void => {},
      type: 'portrait-primary',
    },
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = doc;
  g.screen = scr;
  g.requestAnimationFrame = (): number => 0; // no auto-progress; settled dispatched manually if needed
  g.cancelAnimationFrame = (): void => {};

  return {
    listeners,
    fire: (type: string) => (listeners[type] || []).slice().forEach((f) => f()),
    setFullscreen: (on: boolean) => {
      fsEl.current = on ? {} : null;
    },
  };
}

function uninstallDomMock(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.document;
  delete g.screen;
  delete g.requestAnimationFrame;
  delete g.cancelAnimationFrame;
}

describe('FullscreenController lifecycle (StrictMode re-attach)', () => {
  let dom: DomMock;
  beforeEach(() => {
    dom = installDomMock();
  });
  afterEach(() => {
    uninstallDomMock();
  });

  it('attach registers exactly one listener; detach removes it', () => {
    const c = new FullscreenController();
    const detach = c.attach();
    expect(dom.listeners['fullscreenchange']?.length).toBe(1);
    detach();
    expect(dom.listeners['fullscreenchange']?.length ?? 0).toBe(0);
  });

  it('re-attach after detach re-enables dispatch (detached reset) and keeps a single listener', async () => {
    const c = new FullscreenController();
    const states: string[] = [];
    c.subscribe((s) => states.push(s));

    const detach1 = c.attach();
    detach1(); // StrictMode simulated unmount → detached = true
    const detach2 = c.attach(); // StrictMode remount → must reset detached = false

    // single-attach: still exactly one listener after re-attach
    expect(dom.listeners['fullscreenchange']?.length).toBe(1);

    // drive a full entry through the re-attached controller
    await c.request(
      (globalThis as unknown as { document: { documentElement: HTMLElement } }).document
        .documentElement,
    );
    expect(c.getState()).toBe('entering'); // dispatch worked → NOT stuck (detached correctly reset)

    dom.setFullscreen(true);
    dom.fire('fullscreenchange'); // → dispatch('entered') → active
    expect(c.getState()).toBe('active'); // proves dispatch is active again after re-attach

    detach2();
  });

  it('duplicate attach without detach still results in a single listener', () => {
    const c = new FullscreenController();
    const d1 = c.attach();
    const d2 = c.attach(); // second attach must drop the first handler
    expect(dom.listeners['fullscreenchange']?.length).toBe(1);
    d2();
    // d1 is now stale; calling it must not throw and must not leave a dangling listener
    d1();
    expect(dom.listeners['fullscreenchange']?.length ?? 0).toBe(0);
  });
});
