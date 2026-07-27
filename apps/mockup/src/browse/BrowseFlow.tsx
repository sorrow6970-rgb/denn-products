// Mobile-first, step-by-step catalog browse UI (spec 017). Every option/filter comes from the
// spec 016 public selectors over a precomputed index — never from raw document.data. State holds
// ids only; labels are looked up here at render time. No image/Canvas/save/order/CTA.

import {
  type BrowseCategory,
  type BrowseOption,
  type BrowseTemplate,
  type CatalogBrowseIndex,
  selectCaseCategories,
  selectFrameCategories,
  selectFrameSizes,
  selectModels,
} from "@denn/shared";
import { Badge, Chip } from "@denn/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import "./browse.css";
import {
  type BrowseAction,
  type CatalogBrowseSelection,
  INITIAL_SELECTION,
  isCategorySelectable,
  isSelectionComplete,
  type ProductKind,
  reduceSelection,
  templatesFor,
} from "./selection";

const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  case: "휴대폰 케이스",
  frame: "액자",
};

/** Customer-safe kind label; "other" is intentionally not translated (spec 017 §7). */
function templateKindLabel(kind: BrowseTemplate["kind"]): string | null {
  if (kind === "builtin") return "기본";
  if (kind === "uploaded") return "업로드";
  return null;
}

function findLabel(options: readonly BrowseOption[], id: string | null): string | null {
  if (id === null) return null;
  return options.find((o) => o.id === id)?.label ?? null;
}

export function BrowseFlow({ index }: { index: CatalogBrowseIndex }): React.JSX.Element {
  const [selection, setSelection] = useState<CatalogBrowseSelection>(INITIAL_SELECTION);

  // When the catalog identity changes (e.g. a retried load), drop selections whose ids vanished.
  // Never auto-selects a replacement. The first index is the initial one, so nothing to reconcile.
  const prevIndex = useRef<CatalogBrowseIndex | null>(null);
  useEffect(() => {
    if (prevIndex.current !== null && prevIndex.current !== index) {
      setSelection((s) => reduceSelection(s, { type: "reconcile" }, index));
    }
    prevIndex.current = index;
  }, [index]);

  const dispatch = useCallback(
    (action: BrowseAction) => setSelection((s) => reduceSelection(s, action, index)),
    [index],
  );

  const { productKind } = selection;

  return (
    <div className="denn-browse">
      <fieldset className="denn-fieldset">
        <legend className="denn-fieldset__legend">무엇을 만들까요?</legend>
        <div className="denn-row">
          {(["case", "frame"] as const).map((kind) => (
            <Chip
              key={kind}
              selected={productKind === kind}
              onClick={() => dispatch({ type: "selectProductKind", productKind: kind })}
            >
              {PRODUCT_KIND_LABEL[kind]}
            </Chip>
          ))}
        </div>
      </fieldset>

      {productKind === "case" ? (
        <CaseSteps index={index} selection={selection} dispatch={dispatch} />
      ) : null}
      {productKind === "frame" ? (
        <FrameSteps index={index} selection={selection} dispatch={dispatch} />
      ) : null}

      {index.diagnostics.length > 0 ? (
        <p className="denn-browse__notice" data-testid="browse-diagnostics">
          일부 카탈로그 항목은 표시되지 않을 수 있습니다.
        </p>
      ) : null}

      <CompletionSummary index={index} selection={selection} />
    </div>
  );
}

interface StepProps {
  index: CatalogBrowseIndex;
  selection: CatalogBrowseSelection;
  dispatch: (action: BrowseAction) => void;
}

function CaseSteps({ index, selection, dispatch }: StepProps): React.JSX.Element {
  const models = selectModels(index);
  return (
    <>
      <fieldset className="denn-fieldset">
        <legend className="denn-fieldset__legend">휴대폰 모델</legend>
        {models.length === 0 ? (
          <p className="denn-browse__notice" data-testid="empty-models">
            선택 가능한 휴대폰 모델이 없습니다.
          </p>
        ) : (
          <div className="denn-row">
            {models.map((m) => (
              <Chip
                key={m.id}
                selected={selection.modelId === m.id}
                onClick={() => dispatch({ type: "selectModel", modelId: m.id })}
              >
                {m.label}
              </Chip>
            ))}
          </div>
        )}
      </fieldset>

      {selection.modelId !== null && models.length > 0 ? (
        <>
          <CategoryStep
            index={index}
            selection={selection}
            dispatch={dispatch}
            categories={selectCaseCategories(index)}
          />
          <TemplateStep index={index} selection={selection} dispatch={dispatch} />
        </>
      ) : null}
    </>
  );
}

function FrameSteps({ index, selection, dispatch }: StepProps): React.JSX.Element {
  const sizes = selectFrameSizes(index);
  return (
    <>
      <fieldset className="denn-fieldset">
        <legend className="denn-fieldset__legend">액자 사이즈</legend>
        {sizes.length === 0 ? (
          <p className="denn-browse__notice" data-testid="empty-sizes">
            선택 가능한 액자 사이즈가 없습니다.
          </p>
        ) : (
          <div className="denn-row">
            {sizes.map((s) => (
              <Chip
                key={s.id}
                selected={selection.frameSizeId === s.id}
                onClick={() => dispatch({ type: "selectFrameSize", frameSizeId: s.id })}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        )}
      </fieldset>

      {selection.frameSizeId !== null && sizes.length > 0 ? (
        <>
          <CategoryStep
            index={index}
            selection={selection}
            dispatch={dispatch}
            categories={selectFrameCategories(index)}
          />
          <TemplateStep index={index} selection={selection} dispatch={dispatch} />
        </>
      ) : null}
    </>
  );
}

function CategoryStep({
  index,
  selection,
  dispatch,
  categories,
}: StepProps & { categories: readonly BrowseCategory[] }): React.JSX.Element {
  const { productKind, frameSizeId } = selection;
  return (
    <fieldset className="denn-fieldset">
      <legend className="denn-fieldset__legend">분류</legend>
      <div className="denn-row">
        {categories.map((c) => {
          const count = templatesFor(index, productKind, frameSizeId, c.id).length;
          const selectable = isCategorySelectable(index, productKind, frameSizeId, c.id);
          const disabled = !selectable && c.id !== selection.categoryId;
          return (
            <Chip
              key={c.id}
              selected={selection.categoryId === c.id}
              disabled={disabled}
              onClick={() => dispatch({ type: "selectCategory", categoryId: c.id })}
            >
              {c.label} ({count})
            </Chip>
          );
        })}
      </div>
    </fieldset>
  );
}

function TemplateStep({ index, selection, dispatch }: StepProps): React.JSX.Element {
  const templates = templatesFor(
    index,
    selection.productKind,
    selection.frameSizeId,
    selection.categoryId,
  );
  return (
    <fieldset className="denn-fieldset">
      <legend className="denn-fieldset__legend">템플릿</legend>
      {templates.length === 0 ? (
        <p className="denn-browse__notice" data-testid="empty-templates">
          현재 조건에 맞는 템플릿이 없습니다.
        </p>
      ) : (
        <ul className="denn-browse__templates" data-testid="template-list">
          {templates.map((t) => (
            <li key={t.id}>
              <TemplateCard
                template={t}
                selected={selection.templateId === t.id}
                onSelect={() => dispatch({ type: "selectTemplate", templateId: t.id })}
              />
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: BrowseTemplate;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  const kindLabel = templateKindLabel(template.kind);
  const cls = ["denn-tplcard", selected ? "denn-tplcard--on" : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} aria-pressed={selected} onClick={onSelect}>
      <span className="denn-tplcard__mark" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span className="denn-tplcard__body">
        <span className="denn-tplcard__label">{template.label}</span>
        {kindLabel !== null ? <Badge>{kindLabel}</Badge> : null}
      </span>
      {selected ? <span className="denn-tplcard__state">선택됨</span> : null}
    </button>
  );
}

function CompletionSummary({
  index,
  selection,
}: {
  index: CatalogBrowseIndex;
  selection: CatalogBrowseSelection;
}): React.JSX.Element | null {
  // aria-live region is always present so the completion is announced when it appears.
  if (!isSelectionComplete(selection) || selection.productKind === null) return null;

  const templates = templatesFor(
    index,
    selection.productKind,
    selection.frameSizeId,
    selection.categoryId,
  );
  const parts: string[] = [PRODUCT_KIND_LABEL[selection.productKind]];
  if (selection.productKind === "case") {
    const model = findLabel(selectModels(index), selection.modelId);
    if (model !== null) parts.push(`모델: ${model}`);
    const category = findLabel(selectCaseCategories(index), selection.categoryId);
    if (category !== null) parts.push(`분류: ${category}`);
  } else {
    const size = findLabel(selectFrameSizes(index), selection.frameSizeId);
    if (size !== null) parts.push(`사이즈: ${size}`);
    const category = findLabel(selectFrameCategories(index), selection.categoryId);
    if (category !== null) parts.push(`분류: ${category}`);
  }
  const template = findLabel(templates, selection.templateId);
  if (template !== null) parts.push(`템플릿: ${template}`);

  return (
    <div className="denn-browse__summary" role="status" aria-live="polite">
      <p className="denn-browse__summary-title">선택 완료</p>
      <p className="denn-browse__summary-body" data-testid="browse-summary">
        {parts.join(" · ")}
      </p>
    </div>
  );
}
