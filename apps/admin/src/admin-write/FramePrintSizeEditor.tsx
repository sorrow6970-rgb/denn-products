import { useSyncExternalStore, useState } from "react";
import { applyFramePrintSizeEdit, type CatalogDocumentV1, type CatalogItemV1 } from "@denn/shared";
import { Button, Card, TextField } from "@denn/ui";
import type { AdminWriteSessionController } from "./session-controller";

export interface FramePrintSizeEditorProps {
  readonly controller: AdminWriteSessionController;
}

const STATUS_MESSAGE: Record<string, string> = {
  "auth-blocked": "운영자 로그인이 필요합니다.",
  unloaded: "편집 기준을 먼저 불러오세요.",
  loading: "편집 기준을 불러오는 중입니다.",
  "ready-clean": "저장할 변경이 없습니다.",
  "ready-dirty-valid": "저장할 수 있는 변경입니다.",
  "ready-dirty-invalid": "폭과 높이를 올바르게 입력하세요.",
  "discard-confirmation": "현재 초안을 폐기해야 다시 불러올 수 있습니다.",
  saving: "변경을 저장하는 중입니다.",
  conflict: "다른 저장이 먼저 반영됐습니다. 최신 상태를 다시 불러오세요.",
  "outcome-unknown": "저장 결과를 확인할 수 없습니다. 최신 상태를 다시 불러오세요.",
  "load-error": "편집 기준을 불러오지 못했습니다.",
  "save-error": "저장하지 못했습니다. 상태를 확인한 뒤 명시적으로 다시 시도하세요.",
};

function canonicalText(item: CatalogItemV1, key: "printWidthCm" | "printHeightCm"): string {
  const value = item[key];
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function evaluateFramePrintSizeDraft(
  catalog: CatalogDocumentV1,
  item: CatalogItemV1,
  widthText: string,
  heightText: string,
): {
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly candidate: CatalogDocumentV1 | null;
} {
  const result = applyFramePrintSizeEdit(catalog, {
    frameSizeId: item.id,
    widthText,
    heightText,
  });
  if (result.ok) {
    return {
      dirty: result.value.changed,
      valid: true,
      candidate: result.value.changed ? result.value.document : null,
    };
  }
  return {
    dirty:
      widthText !== canonicalText(item, "printWidthCm") ||
      heightText !== canonicalText(item, "printHeightCm"),
    valid: false,
    candidate: null,
  };
}

/** Isolated spec-041 editor. It is intentionally not imported by App.tsx. */
export function FramePrintSizeEditor({ controller }: FramePrintSizeEditorProps): React.JSX.Element {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const baseline = controller.getBaseline();
  const sizes = baseline?.catalog.data.frameSizes ?? [];
  const [selectedId, setSelectedId] = useState("");
  const [widthText, setWidthText] = useState("");
  const [heightText, setHeightText] = useState("");
  const selected = sizes.find((item) => item.id === selectedId) ?? null;
  const legacyReadOnlyIds = new Set(
    sizes
      .filter((item) => Object.hasOwn(item, "wcm") || Object.hasOwn(item, "hcm"))
      .map((item) => item.id),
  );

  const assess = (width: string, height: string): CatalogDocumentV1 | null => {
    if (baseline === null || selected === null) return null;
    const result = evaluateFramePrintSizeDraft(baseline.catalog, selected, width, height);
    controller.setDraftState({ dirty: result.dirty, valid: result.valid });
    return result.candidate;
  };

  const choose = (id: string): void => {
    const item = sizes.find((candidate) => candidate.id === id);
    if (item !== undefined && legacyReadOnlyIds.has(item.id)) return;
    setSelectedId(item?.id ?? "");
    const width = item ? canonicalText(item, "printWidthCm") : "";
    const height = item ? canonicalText(item, "printHeightCm") : "";
    setWidthText(width);
    setHeightText(height);
    controller.setDraftState({ dirty: false, valid: item !== undefined });
  };

  const save = async (): Promise<void> => {
    const candidate = assess(widthText, heightText);
    if (candidate !== null) await controller.save(candidate);
  };

  const editable = snapshot.canEdit && selected !== null;
  return (
    <Card>
      <div className="denn-stack" data-testid="frame-print-size-editor">
        <h2>액자 인쇄 실물 치수 편집</h2>
        <p>항목을 직접 선택한 뒤 폭과 높이를 함께 저장합니다. 자동 저장은 없습니다.</p>

        <label htmlFor="frame-print-size-id">액자 사이즈</label>
        <select
          id="frame-print-size-id"
          data-testid="frame-print-size-id"
          value={selectedId}
          disabled={!snapshot.canEdit}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">사이즈를 선택하세요</option>
          {sizes.map((item) => (
            <option key={item.id} value={item.id} disabled={legacyReadOnlyIds.has(item.id)}>
              {typeof item.name === "string" ? item.name : item.id}
              {legacyReadOnlyIds.has(item.id) ? " (레거시 읽기 전용)" : ""}
            </option>
          ))}
        </select>

        <TextField
          label="인쇄 폭 (cm)"
          inputMode="decimal"
          autoComplete="off"
          data-testid="frame-print-size-width"
          value={widthText}
          disabled={!editable}
          onChange={(event) => {
            const next = event.target.value;
            setWidthText(next);
            assess(next, heightText);
          }}
        />
        <TextField
          label="인쇄 높이 (cm)"
          inputMode="decimal"
          autoComplete="off"
          data-testid="frame-print-size-height"
          value={heightText}
          disabled={!editable}
          onChange={(event) => {
            const next = event.target.value;
            setHeightText(next);
            assess(widthText, next);
          }}
        />

        <div role="status" aria-live="polite" data-testid="frame-print-size-status">
          {STATUS_MESSAGE[snapshot.status]}
        </div>
        <div className="denn-row">
          <Button
            variant="ghost"
            disabled={!snapshot.canLoad}
            onClick={() => void controller.loadBaseline()}
          >
            편집 기준 불러오기
          </Button>
          {snapshot.status === "discard-confirmation" ? (
            <Button
              variant="ghost"
              onClick={() => void controller.loadBaseline({ discardDirty: true })}
            >
              초안 폐기하고 다시 불러오기
            </Button>
          ) : null}
          <Button variant="primary" disabled={!snapshot.canSave} onClick={() => void save()}>
            변경 저장
          </Button>
        </div>
      </div>
    </Card>
  );
}
