import { useCallback, useLayoutEffect, useRef } from "react";
import {
  createRoomCommittedSourceOwner,
  type RoomCommittedSource,
  type RoomCommittedSourceOwner,
} from "./committed-source";

export interface UseRoomCommittedSourceResult {
  readSource(): RoomCommittedSource | null;
  invalidate(): void;
}
interface Lifetime {
  owner: RoomCommittedSourceOwner;
  candidate: unknown;
}
/** Internal commit bridge. The caller must invalidate BEFORE changing any source input. */
export function useRoomCommittedSource(
  candidate: unknown,
  onInvalidate: () => void,
): UseRoomCommittedSourceResult {
  const current = useRef<Lifetime | null>(null);
  const epoch = useRef(0);
  const invalidatedCandidate = useRef<{ value: unknown } | null>(null);
  const renderEpoch = epoch.current;
  const readSource = useCallback(() => current.current?.owner.readSource() ?? null, []);
  const invalidate = useCallback(() => {
    epoch.current += 1;
    if (current.current) invalidatedCandidate.current = { value: current.current.candidate };
    current.current?.owner.invalidate();
  }, []);

  useLayoutEffect(() => {
    const made = createRoomCommittedSourceOwner({ onInvalidate });
    if (!made.ok) return;
    const lifetime: Lifetime = { owner: made.owner, candidate: null };
    current.current = lifetime;
    return () => {
      if (current.current === lifetime) current.current = null;
      lifetime.owner.dispose();
    };
  }, [onInvalidate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: callback replacement recreates the lifetime in the preceding effect, so this effect must register again too
  useLayoutEffect(() => {
    const lifetime = current.current;
    if (!lifetime || renderEpoch !== epoch.current) return;
    // An unrelated rerender must not re-publish the old candidate while an edit is suspended.
    if (invalidatedCandidate.current?.value === candidate) return;
    lifetime.candidate = candidate;
    if (candidate === null) {
      lifetime.owner.invalidate();
      return;
    }
    const ticket = lifetime.owner.begin();
    if (!ticket) return;
    invalidatedCandidate.current = null;
    // Forward each field lazily, so spec129 validates and reads it exactly once with its guard.
    const forwarded = Object.create(null) as Record<string, unknown>;
    for (const key of [
      "kind",
      "projectionOk",
      "planReady",
      "clockPreview",
      "plan",
      "imageBindings",
    ]) {
      Object.defineProperty(forwarded, key, {
        get: () => Reflect.get(candidate as object, key),
      });
    }
    Object.defineProperty(forwarded, "isCurrent", {
      get() {
        const proof = Reflect.get(candidate as object, "isCurrent");
        if (typeof proof !== "function") return proof;
        return () => {
          if (current.current !== lifetime || epoch.current !== renderEpoch) return false;
          const valid = Reflect.apply(proof, candidate, []) === true;
          return valid && current.current === lifetime && epoch.current === renderEpoch;
        };
      },
    });
    ticket.commit(forwarded);
    return () => ticket.invalidate();
  }, [candidate, onInvalidate, renderEpoch]);

  return { readSource, invalidate };
}
