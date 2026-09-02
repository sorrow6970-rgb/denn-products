import { APP_IDS, BRAND, buildCatalogBrowseIndex } from "@denn/shared";
import { Badge, Button, Card } from "@denn/ui";
import { useMemo } from "react";
import { BrowseFlow } from "./browse/BrowseFlow";
import { safeCatalogMessage } from "./catalog/messages";
import { publicCatalogReader } from "./catalog/reader";
import type { PublicCatalogUiState } from "./catalog/types";
import { usePublicCatalog } from "./catalog/usePublicCatalog";
import type { SpaceGateController } from "./space-v2/production-controller";
import { SpaceV2ProofView } from "./space-v2/SpaceV2ProofView";
import { createSpaceProductionController } from "./space/composition";
import { readSpaceLink } from "./space/link";
import { SpacePasswordGate } from "./space/SpacePasswordGate";
import { SpacePostAuthFrameView } from "./space/SpacePostAuthFrameView";

// Public-catalog connection (spec 015) + mobile-first browse UI (spec 017). Loading / error /
// manual-retry are unchanged; when ready, the success document is turned into a spec 016 browse
// index (once per document identity) and the step-by-step case/frame selection UI is shown, with
// display-only template thumbnails (spec 018). No Canvas/save/order — ids-only selection with a
// text summary at completion.
export function App(): React.JSX.Element {
  const search = typeof window === "undefined" ? "" : window.location.search;
  return <MockupRoot search={search} env={import.meta.env} />;
}

export type SpaceControllerFactory = (
  search: unknown,
  env: ImportMetaEnv | Record<string, unknown> | undefined,
) => SpaceGateController;

export function MockupRoot({
  search,
  env,
  createSpaceController = createSpaceProductionController,
}: {
  readonly search: string;
  readonly env: ImportMetaEnv | Record<string, unknown> | undefined;
  /** Narrow synthetic-test seam. Production App always uses the default factory above. */
  readonly createSpaceController?: SpaceControllerFactory;
}): React.JSX.Element {
  const mode = readSpaceLink(search);
  if (mode.kind !== "inactive") {
    return <SpaceRoute search={search} env={env} createController={createSpaceController} />;
  }
  return <CatalogApp />;
}

function SpaceRoute({
  search,
  env,
  createController,
}: {
  readonly search: string;
  readonly env: ImportMetaEnv | Record<string, unknown> | undefined;
  readonly createController: SpaceControllerFactory;
}): React.JSX.Element {
  const controller = useMemo(() => createController(search, env), [createController, env, search]);
  return (
    <SpacePasswordGate
      controller={controller}
      renderReady={(scene) => (
        <SpacePostAuthFrameView scene={scene} catalogReader={publicCatalogReader} />
      )}
      renderReadyV2={(view) => (
        <SpaceV2ProofView plan={view.plan} imageBindings={view.imageBindings} />
      )}
    />
  );
}

function CatalogApp(): React.JSX.Element {
  const { state, retry } = usePublicCatalog(publicCatalogReader);

  // Build the browse index only in the ready state, once per document identity (spec 017 §2, §16).
  const document = state.status === "ready" ? state.document : null;
  const index = useMemo(() => (document ? buildCatalogBrowseIndex(document) : null), [document]);

  // spec 085 §1: the customer catalog gets its own shell classes so the composer workbench may use
  // the wider desktop measure. `@denn/ui`'s `Card` is unchanged — it already forwards a className —
  // and identity/status stay at the original 560px reading measure, so only the browse card (which
  // holds the composer) grows.
  return (
    <main className="denn-shell denn-customer">
      <div className="denn-shell__inner denn-customer__inner">
        <Card className="denn-customer__card denn-customer__card--reading">
          <Badge>고객 셸 · 공개 카탈로그 연결</Badge>
          <h1>{BRAND} Mockup Rebuild</h1>
          <p data-testid="app-id">{APP_IDS.mockup}</p>
        </Card>
        <Card className="denn-customer__card denn-customer__card--reading">
          <CatalogStatus state={state} onRetry={retry} />
        </Card>
        {state.status === "ready" && index && document ? (
          <Card className="denn-customer__card denn-customer__card--workbench">
            <BrowseFlow index={index} document={document} />
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function CatalogStatus({
  state,
  onRetry,
}: {
  state: PublicCatalogUiState;
  onRetry: () => void;
}): React.JSX.Element {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="denn-stack" role="status" aria-live="polite">
        <p data-testid="catalog-status">카탈로그를 불러오는 중…</p>
      </div>
    );
  }
  if (state.status === "ready") {
    return (
      <div className="denn-stack">
        <p data-testid="catalog-status">카탈로그 준비 완료</p>
        {state.warningCount > 0 ? <Badge>일부 이전 데이터가 호환 처리되었습니다</Badge> : null}
      </div>
    );
  }
  return (
    <div className="denn-stack" role="alert">
      <p data-testid="catalog-status">{safeCatalogMessage(state.code)}</p>
      {state.retryable ? (
        <Button variant="primary" onClick={onRetry} data-testid="catalog-retry">
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}
