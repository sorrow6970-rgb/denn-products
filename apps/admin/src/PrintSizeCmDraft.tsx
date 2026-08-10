import { useState } from "react";
import {
  evaluateOperatorPrintSizeInput,
  MAX_PRINT_CM,
  type OperatorPrintSizeField,
  type OperatorPrintSizeResult,
} from "@denn/shared";
import { Card, TextField } from "@denn/ui";

// Operator print-size input (spec 035). LOCAL CHECK ONLY: this card never saves, uploads,
// publishes or orders — the write path is a separate Founder decision (O-8). It also never
// pre-fills a value: the legacy admin invented `wcm = 21` whenever a size had no centimetres
// (denn-admin.html:1650), and that fabricated 21 then spread to sizes that were not A4.

const MESSAGES = {
  empty: "치수 미입력 — 이 사이즈는 아직 인쇄할 수 없습니다.",
  rejected: "카탈로그 계약을 통과하지 못했습니다.",
  ok: "카탈로그 계약 통과",
  MISSING: "폭과 높이를 함께 입력해야 합니다.",
  NOT_DECIMAL: "숫자만 입력하세요. 예: 21, 29.7",
  REJECTED_BY_CATALOG: `0 초과 ${MAX_PRINT_CM} 이하만 사용할 수 있습니다.`,
} as const;

function fieldError(
  result: OperatorPrintSizeResult,
  field: OperatorPrintSizeField,
): string | undefined {
  if (result.status !== "rejected") return undefined;
  const issue = result.issues.find((i) => i.field === field);
  return issue ? MESSAGES[issue.reason] : undefined;
}

export function PrintSizeCmDraft(): React.JSX.Element {
  const [widthText, setWidthText] = useState("");
  const [heightText, setHeightText] = useState("");
  const result = evaluateOperatorPrintSizeInput(widthText, heightText);

  return (
    <Card>
      <div className="denn-stack">
        <h2>액자 인쇄 실물 치수</h2>
        <p>
          입력한 값이 카탈로그 계약을 통과하는지만 확인합니다. 저장되지 않으며 새로고침하면
          사라집니다.
        </p>

        <TextField
          label="인쇄 폭 (cm)"
          inputMode="decimal"
          autoComplete="off"
          data-testid="print-size-width"
          value={widthText}
          onChange={(e) => setWidthText(e.target.value)}
          error={fieldError(result, "width")}
        />
        <TextField
          label="인쇄 높이 (cm)"
          inputMode="decimal"
          autoComplete="off"
          data-testid="print-size-height"
          value={heightText}
          onChange={(e) => setHeightText(e.target.value)}
          error={fieldError(result, "height")}
        />

        <div role="status" aria-live="polite" data-testid="print-size-result">
          <p>{MESSAGES[result.status]}</p>
          {result.status === "ok" ? (
            <p data-testid="print-size-canonical">
              "printWidthCm": {result.value.widthCm} · "printHeightCm": {result.value.heightCm}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
