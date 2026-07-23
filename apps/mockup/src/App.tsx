import { useState } from "react";
import { APP_IDS, BRAND } from "@denn/shared";
import { Badge, Button, Card, Chip, TextField, VisuallyHidden } from "@denn/ui";

// Primitive showcase shell only (spec 011): renders @denn/ui primitives to verify the
// package boundary and real render. No product features, no click side effects
// (the size chips toggle local UI state only — no save / network / navigation).
const SIZES = ["A4", "A3", "50×70"] as const;

export function App(): React.JSX.Element {
  const [size, setSize] = useState<string>("A4");
  return (
    <main className="denn-shell">
      <div className="denn-shell__inner">
        <Card>
          <Badge>고객 셸 · UI 프리미티브 데모</Badge>
          <h1>{BRAND} Mockup Rebuild</h1>
          <p data-testid="app-id">{APP_IDS.mockup}</p>
        </Card>

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
            <legend className="denn-fieldset__legend">사이즈 선택 (데모 — 저장 없음)</legend>
            <div className="denn-row">
              {SIZES.map((s) => (
                <Chip key={s} selected={size === s} onClick={() => setSize(s)}>
                  {s}
                  {size === s ? <VisuallyHidden> 선택됨</VisuallyHidden> : null}
                </Chip>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <div className="denn-stack">
            <TextField label="시안 이름" description="예: 거실 A4 액자" placeholder="시안 이름" />
            <TextField label="연락처" error="필수 항목입니다" />
          </div>
        </Card>
      </div>
    </main>
  );
}
