import { readLegacyCatalog, type CatalogDocumentV1 } from "@denn/shared";
import type { OperatorAuthPort, OperatorAuthState } from "@denn/firebase/admin-read";
import type {
  AdminStateBaselineValue,
  AdminStateWritePort,
  AdminWriteErrorCode,
  SafeAdminBaselineError,
} from "@denn/firebase/admin-write";

export type AdminWriteSessionStatus =
  | "auth-blocked"
  | "unloaded"
  | "loading"
  | "ready-clean"
  | "ready-dirty-valid"
  | "ready-dirty-invalid"
  | "discard-confirmation"
  | "saving"
  | "conflict"
  | "outcome-unknown"
  | "load-error"
  | "save-error";

export interface AdminWriteSessionSnapshot {
  readonly status: AdminWriteSessionStatus;
  readonly revision: number | null;
  readonly source: "legacy" | "rebuild" | null;
  readonly errorCode: SafeAdminBaselineError["code"] | AdminWriteErrorCode | null;
  readonly canLoad: boolean;
  readonly canEdit: boolean;
  readonly canSave: boolean;
}

export interface AdminWriteSessionController {
  subscribe(listener: (snapshot: AdminWriteSessionSnapshot) => void): () => void;
  getSnapshot(): AdminWriteSessionSnapshot;
  /** The validated in-memory baseline; never raw bytes or JSON. */
  getBaseline(): AdminStateBaselineValue | null;
  loadBaseline(options?: { readonly discardDirty?: boolean }): Promise<void>;
  setDraftState(state: { readonly dirty: boolean; readonly valid: boolean }): void;
  save(catalog: CatalogDocumentV1): Promise<void>;
  dispose(): void;
}

export interface AdminWriteSessionControllerOptions {
  readonly auth: OperatorAuthPort;
  readonly write: AdminStateWritePort;
  readonly createCorrelationId: () => string;
}

const OUTCOME_UNKNOWN = new Set<AdminWriteErrorCode>([
  "WRITE_CLAIM_OUTCOME_UNKNOWN",
  "WRITE_UPLOAD_OUTCOME_UNKNOWN",
  "WRITE_COMMIT_OUTCOME_UNKNOWN",
]);

export function createAdminWriteSessionController(
  options: AdminWriteSessionControllerOptions,
): AdminWriteSessionController {
  const { auth, write, createCorrelationId } = options;
  const listeners = new Set<(snapshot: AdminWriteSessionSnapshot) => void>();
  let disposed = false;
  let generation = 0;
  let baseline: AdminStateBaselineValue | null = null;
  let authState: OperatorAuthState = auth.currentOperator();
  let status: AdminWriteSessionStatus =
    authState.status === "authenticated" ? "unloaded" : "auth-blocked";
  let errorCode: AdminWriteSessionSnapshot["errorCode"] = null;
  let detachAuth: (() => void) | null = null;

  const derive = (): AdminWriteSessionSnapshot => {
    const hasBaseline = baseline !== null;
    const authenticated = authState.status === "authenticated";
    const canLoad =
      authenticated && !["loading", "saving", "discard-confirmation"].includes(status);
    const canEdit = authenticated && hasBaseline && status.startsWith("ready-");
    const canSave =
      authenticated &&
      hasBaseline &&
      (status === "ready-dirty-valid" ||
        (status === "save-error" && errorCode === "WRITE_UPLOAD_FAILED"));
    return {
      status,
      revision: baseline?.revision ?? null,
      source: baseline?.source ?? null,
      errorCode,
      canLoad,
      canEdit,
      canSave,
    };
  };

  let snapshot = derive();
  const same = (a: AdminWriteSessionSnapshot, b: AdminWriteSessionSnapshot): boolean =>
    a.status === b.status &&
    a.revision === b.revision &&
    a.source === b.source &&
    a.errorCode === b.errorCode &&
    a.canLoad === b.canLoad &&
    a.canEdit === b.canEdit &&
    a.canSave === b.canSave;

  const publish = (): void => {
    if (disposed) return;
    const next = derive();
    if (same(next, snapshot)) return;
    snapshot = next;
    for (const listener of [...listeners]) listener(snapshot);
  };

  const sameAuthState = (a: OperatorAuthState, b: OperatorAuthState): boolean =>
    a.status === b.status && (a.status !== "error" || (b.status === "error" && a.code === b.code));

  const resetForAuth = (next: OperatorAuthState): void => {
    // onAuthStateChanged may repeat the same logical state. That is a no-op: clearing a loaded
    // baseline or a dirty draft on an equivalent auth notification would silently lose work.
    if (sameAuthState(authState, next)) return;
    authState = next;
    generation += 1;
    baseline = null;
    errorCode = null;
    status = next.status === "authenticated" ? "unloaded" : "auth-blocked";
    publish();
  };

  const attach = (): void => {
    if (detachAuth !== null) return;
    detachAuth = auth.subscribe(resetForAuth);
  };

  const subscribe = (listener: (value: AdminWriteSessionSnapshot) => void): (() => void) => {
    listeners.add(listener);
    listener(snapshot);
    attach();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    };
  };

  const isStale = (token: number): boolean => disposed || token !== generation;

  const loadBaseline = async (
    loadOptions: { readonly discardDirty?: boolean } = {},
  ): Promise<void> => {
    if (disposed || authState.status !== "authenticated") return;
    if (status === "loading" || status === "saving") return;
    const requiresDiscard =
      baseline !== null &&
      [
        "ready-dirty-valid",
        "ready-dirty-invalid",
        "conflict",
        "outcome-unknown",
        "save-error",
      ].includes(status);
    if (requiresDiscard && loadOptions.discardDirty !== true) {
      status = "discard-confirmation";
      errorCode = null;
      publish();
      return;
    }

    const token = ++generation;
    status = "loading";
    errorCode = null;
    publish();
    const result = await write.loadBaseline({ correlationId: createCorrelationId() });
    if (isStale(token)) return;
    if (result.ok) {
      baseline = result.value;
      status = "ready-clean";
      errorCode = null;
    } else {
      baseline = null;
      status = "load-error";
      errorCode = result.error.code;
    }
    publish();
  };

  const setDraftState = (draft: { readonly dirty: boolean; readonly valid: boolean }): void => {
    if (disposed || authState.status !== "authenticated" || baseline === null) return;
    if (!status.startsWith("ready-")) return;
    status = draft.dirty
      ? draft.valid
        ? "ready-dirty-valid"
        : "ready-dirty-invalid"
      : "ready-clean";
    errorCode = null;
    publish();
  };

  const save = async (catalog: CatalogDocumentV1): Promise<void> => {
    if (disposed || authState.status !== "authenticated" || baseline === null) return;
    const explicitUploadRetry = status === "save-error" && errorCode === "WRITE_UPLOAD_FAILED";
    if (status !== "ready-dirty-valid" && !explicitUploadRetry) return;

    let validated: ReturnType<typeof readLegacyCatalog>;
    try {
      validated = readLegacyCatalog(catalog);
    } catch {
      status = "ready-dirty-invalid";
      errorCode = "WRITE_INVALID_INPUT";
      publish();
      return;
    }
    if (!validated.ok) {
      status = "ready-dirty-invalid";
      errorCode = "WRITE_INVALID_INPUT";
      publish();
      return;
    }

    const token = ++generation;
    const expectedBase = baseline.revision;
    status = "saving";
    errorCode = null;
    publish();
    const result = await write.save({
      correlationId: createCorrelationId(),
      expectedBase,
      catalog: validated.document,
    });
    if (isStale(token)) return;
    if (result.ok) {
      baseline = {
        catalog: validated.document,
        revision: result.value.revision,
        source: "rebuild",
        promotedLegacyPrintSizeIds: baseline.promotedLegacyPrintSizeIds,
      };
      status = "ready-clean";
      errorCode = null;
    } else {
      errorCode = result.error.code;
      status =
        result.error.code === "WRITE_CONFLICT"
          ? "conflict"
          : OUTCOME_UNKNOWN.has(result.error.code)
            ? "outcome-unknown"
            : "save-error";
    }
    publish();
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    listeners.clear();
    baseline = null;
    detachAuth?.();
    detachAuth = null;
  };

  return {
    subscribe,
    getSnapshot: () => snapshot,
    getBaseline: () => baseline,
    loadBaseline,
    setDraftState,
    save,
    dispose,
  };
}
