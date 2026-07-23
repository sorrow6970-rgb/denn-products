import { APP_IDS, BRAND } from "@denn/shared";
import { Badge, Button, Card } from "@denn/ui";
import { safeCatalogMessage } from "./catalog/messages";
import { publicCatalogReader } from "./catalog/reader";
import type { PublicCatalogUiState } from "./catalog/types";
import { usePublicCatalog } from "./catalog/usePublicCatalog";

// Minimal public-catalog connection shell (spec 015): reads the fixed public catalog once on
// mount and shows loading / ready / error / manual-retry only. No product list, Canvas, image,
// selection, save, or order — the success document is held in memory for later specs.
export function App(): React.JSX.Element {
  const { state, retry } = usePublicCatalog(publicCatalogReader);
  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <Card>
          <Badge>고객 셸 · 공개 카탈로그 연결</Badge>
          <h1>{BRAND} Mockup Rebuild</h1>
          <p data-testid="app-id">{APP_IDS.mockup}</p>
        </Card>
        <Card>
          <CatalogStatus state={state} onRetry={retry} />
        </Card>
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
