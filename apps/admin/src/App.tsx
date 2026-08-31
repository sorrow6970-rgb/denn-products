import { useEffect, useRef, useState } from "react";
import { APP_IDS, BRAND } from "@denn/shared";
import { Badge, Button, Card, Chip, TextField, VisuallyHidden } from "@denn/ui";
import { AdminRemoteStateCard } from "./admin-read/AdminRemoteStateCard";
import {
  createAdminOperatorCompositionFromEnv,
  type AdminOperatorComposition,
  type AdminOperatorCompositionDependencies,
} from "./admin-composition/create";
import { FramePrintSizeEditor } from "./admin-write/FramePrintSizeEditor";
import { AdminSpaceV2IssuePanel } from "./space-v2/AdminSpaceV2IssuePanel";
import { PrintSizeCmDraft } from "./PrintSizeCmDraft";

// Primitive showcase shell only (spec 011): renders @denn/ui primitives to verify the
// package boundary and real render. No product features, no click side effects
// (the view chips toggle local UI state only — no save / network / navigation).
const VIEWS = ["카드", "목록", "표"] as const;

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
  const [view, setView] = useState<string>("카드");
  const composition = useOwnedAdminComposition(import.meta.env);
  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <Card>
          <Badge>관리자 셸 · UI 프리미티브 데모</Badge>
          <h1>{BRAND} Admin Rebuild</h1>
          <p data-testid="app-id">{APP_IDS.admin}</p>
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

        <Card>
          <div className="denn-stack">
            <p>버튼 (데모 — 동작 없음)</p>
            <div className="denn-row">
              <Button variant="primary">기본</Button>
              <Button variant="ghost">보조</Button>
              <Button variant="kakao">카카오로 주문</Button>
              <Button variant="ghost" disabled>
                비활성
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <fieldset className="denn-fieldset">
            <legend className="denn-fieldset__legend">보기 옵션 (데모 — 저장 없음)</legend>
            <div className="denn-row">
              {VIEWS.map((v) => (
                <Chip key={v} selected={view === v} onClick={() => setView(v)}>
                  {v}
                  {view === v ? <VisuallyHidden> 선택됨</VisuallyHidden> : null}
                </Chip>
              ))}
              <Chip disabled>비활성</Chip>
            </div>
          </fieldset>
        </Card>

        <Card>
          <div className="denn-stack">
            <TextField
              label="검색어"
              description="데모 입력 — 저장되지 않음"
              placeholder="검색어"
            />
            <TextField label="담당자" error="필수 항목입니다" />
          </div>
        </Card>
      </div>
    </main>
  );
}
