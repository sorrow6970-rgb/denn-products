import { useEffect, useRef, useState } from "react";
import { APP_IDS, BRAND } from "@denn/shared";
import { Badge, Button, Card, Chip, TextField, VisuallyHidden } from "@denn/ui";
import { AdminRemoteStateCard } from "./admin-read/AdminRemoteStateCard";
import {
  createAdminOperatorCompositionFromEnv,
  type AdminOperatorComposition,
} from "./admin-composition/create";
import { FramePrintSizeEditor } from "./admin-write/FramePrintSizeEditor";
import { PrintSizeCmDraft } from "./PrintSizeCmDraft";

// Primitive showcase shell only (spec 011): renders @denn/ui primitives to verify the
// package boundary and real render. No product features, no click side effects
// (the view chips toggle local UI state only — no save / network / navigation).
const VIEWS = ["카드", "목록", "표"] as const;

export function App(): React.JSX.Element {
  const [view, setView] = useState<string>("카드");
  // one controller per mount; StrictMode's double effect must not leave an observer attached
  const compositionRef = useRef<AdminOperatorComposition | null>(null);
  compositionRef.current ??= createAdminOperatorCompositionFromEnv(import.meta.env);
  const composition = compositionRef.current;
  useEffect(() => () => composition.dispose(), [composition]);
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
