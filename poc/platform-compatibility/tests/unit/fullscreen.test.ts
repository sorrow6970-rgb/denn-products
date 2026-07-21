import { describe, expect, it } from 'vitest';
import { fsReduce, orientationLockPlan, type FsState } from '../../src/lib/fullscreen';

describe('fullscreen state machine', () => {
  it('runs the full happy path idle→entering→active→exiting→settling→idle', () => {
    let s: FsState = 'idle';
    s = fsReduce(s, 'request');
    expect(s).toBe('entering');
    s = fsReduce(s, 'entered');
    expect(s).toBe('active');
    s = fsReduce(s, 'exit');
    expect(s).toBe('exiting');
    s = fsReduce(s, 'exited');
    expect(s).toBe('settling');
    s = fsReduce(s, 'settled');
    expect(s).toBe('idle');
  });

  it('entering + fail returns to idle (denied/unsupported)', () => {
    expect(fsReduce('entering', 'fail')).toBe('idle');
  });

  it('blocks invalid transitions as no-ops', () => {
    expect(fsReduce('idle', 'entered')).toBe('idle');
    expect(fsReduce('active', 'request')).toBe('active');
    expect(fsReduce('settling', 'request')).toBe('settling');
  });

  it('does not re-enter from active on duplicate request', () => {
    expect(fsReduce('active', 'exit')).toBe('exiting');
    expect(fsReduce('exiting', 'exit')).toBe('exiting');
  });
});

describe('orientationLockPlan (spec §E: supported AND fullscreen only)', () => {
  it('unsupported API never attempts, regardless of fullscreen', () => {
    expect(orientationLockPlan(false, false)).toBe('unsupported');
    expect(orientationLockPlan(false, true)).toBe('unsupported');
  });

  it('supported but not fullscreen does not attempt', () => {
    expect(orientationLockPlan(true, false)).toBe('not-fullscreen');
  });

  it('attempts only when supported AND fullscreen', () => {
    expect(orientationLockPlan(true, true)).toBe('attempt');
  });
});
