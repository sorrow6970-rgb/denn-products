import { useEffect, useRef } from "react";
import { APP_IDS, BRAND } from "@denn/shared";
import { Badge, Card, VisuallyHidden } from "@denn/ui";
import { AdminRemoteStateCard } from "./admin-read/AdminRemoteStateCard";
import {
  createAdminOperatorCompositionFromEnv,
  type AdminOperatorComposition,
  type AdminOperatorCompositionDependencies,
} from "./admin-composition/create";
import { FramePrintSizeEditor } from "./admin-write/FramePrintSizeEditor";
import { AdminSpaceV2IssuePanel } from "./space-v2/AdminSpaceV2IssuePanel";
import { PrintSizeCmDraft } from "./PrintSizeCmDraft";

/**
 * spec 083 §7: the clipboard is reached ONLY from an explicit copy click. Reading the API inside
 * `write` keeps module import free of any browser capability check, and a browser without the
 * capability surfaces as "링크를 복사하지 못했습니다" rather than a thrown error.
 */
const browserClipboard = {
  write: (text: string): Promise<void> => globalThis.navigator.clipboard.writeText(text),
};

/**
 * Ownership of the composition (spec 083 보완 라운드 2).
 *
 * The defect: a `useRef` + dispose-in-cleanup pair leaves the admin shell DEAD in development.
 * React's StrictMode replays every effect as setup → cleanup → setup on the SAME mounted component,
 * so the ref survives the cleanup: the second setup finds the composition its own cleanup disposed,
 * and nothing brings back the auth observer, the write controller or the V2 issue session.
 *
 * The fix keeps ONE composition alive for the whole mount instead of disposing and replacing it.
 * `apps/mockup`'s `useLocalImageBinding` (spec 026 보완 라운드 1) publishes a replacement from the
 * next setup, and that is right for a controller nobody else holds — but it is NOT right here, and
 * this was measured rather than assumed: after the replacement, React still runs the stale subtree's
 * passive effects, which subscribe to the DISPOSED write controller; its `subscribe` attaches a
 * fresh auth observer, and its `dispose` has already run and is idempotent, so that observer can
 * never be detached (the harness counted two live observers, zero detaches). Never disposing the
 * object the stale subtree can still reach removes that window entirely.
 *
 * A real unmount must still release everything, so the cleanup marks the record unmounted and
 * releases it on the NEXT TASK. StrictMode's replay re-runs the setup inside the same task, which
 * re-marks the record and cancels the release; nothing else can.
 */
interface OwnedComposition {
  readonly composition: AdminOperatorComposition;
  /** false between a cleanup and the setup that follows it in a StrictMode replay. */
  mounted: boolean;
}

/**
 * Owns exactly one live `AdminOperatorComposition` for as long as the calling component is mounted.
 *
 * `env` and `dependencies` are read ONCE, on the first render: the composition holds an auth
 * observer and a lazy SDK boundary, so a caller that passes a fresh object literal every render
 * must not be able to rebuild it.
 */
export function useOwnedAdminComposition(
  env: ImportMetaEnv | Record<string, unknown> | undefined,
  dependencies?: AdminOperatorCompositionDependencies,
): AdminOperatorComposition {
  const initial = useRef({ env, dependencies }).current;
  const ownedRef = useRef<OwnedComposition | null>(null);
  ownedRef.current ??= {
    composition:
      initial.dependencies === undefined
        ? createAdminOperatorCompositionFromEnv(initial.env)
        : createAdminOperatorCompositionFromEnv(initial.env, initial.dependencies),
    mounted: false,
  };
  const owned = ownedRef.current;

  useEffect(() => {
    owned.mounted = true;
    return () => {
      owned.mounted = false;
      // Not inside the cleanup: see the note above — a stale subtree may still subscribe to it in
      // this task. A StrictMode replay sets `mounted` back to true before this callback runs.
      setTimeout(() => {
        if (!owned.mounted) owned.composition.dispose();
      }, 0);
    };
  }, [owned]);

  return owned.composition;
}

export function App(): React.JSX.Element {
  const composition = useOwnedAdminComposition(import.meta.env);
  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <Card>
          <Badge>{BRAND}</Badge>
          <h1>운영자 작업 준비</h1>
          <p>작업에 필요한 도구와 연결 상태를 확인하세요.</p>
          <VisuallyHidden>
            <span data-testid="app-id">{APP_IDS.admin}</span>
          </VisuallyHidden>
        </Card>

        {composition.writeController === null ? <PrintSizeCmDraft /> : null}

        <AdminRemoteStateCard
          controller={composition.remoteController}
          mode={composition.writeController === null ? "read" : "auth-only"}
        />

        {composition.writeController === null ? null : (
          <FramePrintSizeEditor controller={composition.writeController} />
        )}

        {/* spec 083: rendered only when the third gate produced a session AND the C5 write
            controller exists. An off gate mounts no panel, no proof owner and no adapter. */}
        {composition.writeController === null || composition.spaceV2IssueSession === null ? null : (
          <AdminSpaceV2IssuePanel
            writeController={composition.writeController}
            session={composition.spaceV2IssueSession}
            clipboard={browserClipboard}
          />
        )}
      </div>
    </main>
  );
}
