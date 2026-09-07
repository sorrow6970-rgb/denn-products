import { useId, useMemo, useState } from "react";
import type { CatalogDocumentV1 } from "@denn/shared";
import { buildComparisonModel, comparePrintSizes, type ComparisonModel } from "./model";
import "./size-comparison.css";

export function PrintSizeComparison({ document }: { readonly document: CatalogDocumentV1 }) {
  const model = useMemo(() => buildComparisonModel(document), [document]);
  if (model.status !== "ready" || model.sizes.length < 2) return null;
  return <ComparisonPanel model={model} />;
}

function ComparisonPanel({
  model,
}: {
  readonly model: Extract<ComparisonModel, { status: "ready" }>;
}) {
  const id = useId();
  const [owned, setOwned] = useState({ model, a: "", b: "" });
  // A changed catalog never silently applies selections from the previous snapshot.
  const a = owned.model === model ? owned.a : "";
  const b = owned.model === model ? owned.b : "";
  const pair = comparePrintSizes(model.sizes, a, b);
  return (
    <details className="denn-size-compare" data-testid="print-size-comparison">
      <summary>인쇄 크기 비교</summary>
      <div className="denn-size-compare__body">
        <p id={`${id}-description`} className="denn-size-compare__description">
          인쇄 치수의 상대 비율입니다. 액자 외곽이나 화면의 실제 크기를 뜻하지 않습니다.
        </p>
        {model.omitted ? <p>치수가 확인된 크기만 비교할 수 있습니다.</p> : null}
        <div className="denn-size-compare__choices">
          {(["A", "B"] as const).map((slot) => (
            <label key={slot} className="denn-size-compare__choice">
              <span>비교 크기 {slot}</span>
              <select
                aria-describedby={`${id}-description`}
                value={slot === "A" ? a : b}
                onChange={(event) =>
                  setOwned({
                    model,
                    a: slot === "A" ? event.target.value : a,
                    b: slot === "B" ? event.target.value : b,
                  })
                }
              >
                <option value="">크기를 선택하세요</option>
                {model.sizes.map((size) => (
                  <option
                    key={size.key}
                    value={size.key}
                    disabled={size.key === (slot === "A" ? b : a)}
                  >
                    {size.label} · {size.widthCm} × {size.heightCm} cm
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {pair ? (
          <>
            <svg
              className="denn-size-compare__diagram"
              viewBox="0 0 100 100"
              role="img"
              aria-labelledby={`${id}-diagram`}
            >
              <title id={`${id}-diagram`}>인쇄 크기 상대 비교: A 실선, B 점선</title>
              {pair.map((size, index) => (
                <rect
                  key={size.key}
                  x={size.x}
                  y={size.y}
                  width={size.width}
                  height={size.height}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={index === 1 ? "6 4" : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <ul className="denn-size-compare__legend" aria-live="polite">
              {pair.map((size, index) => (
                <li key={size.key}>
                  <strong>{index === 0 ? "A · 실선" : "B · 점선"}</strong>
                  <span>{size.label}</span>
                  <span>
                    {size.widthCm} × {size.heightCm} cm
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p role="status">비교할 두 크기를 선택해 주세요.</p>
        )}
        <button type="button" onClick={() => setOwned({ model, a: "", b: "" })} disabled={!a && !b}>
          비교 선택 해제
        </button>
      </div>
    </details>
  );
}
