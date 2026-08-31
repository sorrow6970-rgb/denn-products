// The operator's Space V2 issue screen (spec 083 §2 - §7).
//
// This is a trust-first work surface, not a landing page: no hero, no bento, no decorative image or
// status dot, no motion. It reuses the existing Modern Studio tokens and `@denn/ui` primitives and
// introduces no design system, icon set, font or colour token of its own. The only picture on the
// screen is the operator's own PNG, drawn by the real Canvas executor.
//
// Two rules shape every state below.
//
//  1. ONE frozen generation. The catalog snapshot, the selection, the derived orientation, the
//     measured logical width, the colour, the normalized transform, the PNG bytes and the render
//     plan are captured together by an explicit `시안 고정`, and the preview the operator confirms is
//     drawn from that same generation. Nothing is re-read, re-measured, adopted or merged later, so
//     a resize, a newer baseline or a swapped file cannot change what gets issued.
//  2. Nothing sensitive is displayed or logged. The password lives in state only until submit, when
//     both inputs are cleared; failures map to fixed Korean copy by code; and no raw SDK message,
//     e-mail, UID, token fragment, object path, digest, file name or byte ever reaches the DOM.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { executePreviewRenderPlan, type PreviewImageBindings } from "@denn/render";
import type { PreviewRenderPlan } from "@denn/render";
import {
  projectCatalogTemplateImage,
  projectFramePreviewGeometry,
  type CatalogDocumentV1,
  type CatalogItemV1,
} from "@denn/shared";
import { Button, Card, TextField, VisuallyHidden } from "@denn/ui";
import type { AdminWriteSessionController } from "../admin-write/session-controller";
import {
  createAdminProofDraftOwner,
  type AdminProofDraftOwner,
  type AdminProofDraftPorts,
  type AdminProofFrozenImage,
} from "./browser-proof-draft";
import {
  buildAdminFrameIssuePlan,
  formatSpaceV2SpaceLink,
  type AdminIssuePlanGeometry,
  type AdminIssueQuarterTurns,
  type AdminIssueTransform,
  type SpaceV2ClipboardPort,
} from "./issue-composition";
import type { SpaceV2FrozenIssueFields, SpaceV2IssueSessionController } from "./issue-session";
import "./admin-space-v2-issue.css";

// --- fixed copy ---------------------------------------------------------------

const COPY = {
  title: "Space V2 시안 발급",
  intro:
    "저장된 카탈로그 기준본에서 액자 시안을 고정한 뒤, 같은 시안의 이미지와 설정만 발급합니다. 카탈로그 저장과 발급은 별개의 동작입니다.",
  baselineBlocked: "편집 기준을 저장할 변경이 없는 상태로 불러온 뒤에 시안을 준비할 수 있습니다.",
  selectionIncomplete: "액자 사이즈, 템플릿, 색상을 모두 선택하세요.",
  selectionUnsupported: "이 조합은 첫 시안 능력으로 발급할 수 없습니다. 다른 조합을 선택하세요.",
  imageIdle: "PNG 파일 한 개를 선택하세요.",
  imageLoading: "이미지를 확인하는 중입니다.",
  imageFailed: "이 이미지는 사용할 수 없습니다. 다른 PNG 파일을 선택하세요.",
  planFailed: "현재 설정으로는 미리보기를 만들 수 없습니다.",
  measuring: "미리보기 크기를 확인하는 중입니다.",
  previewReady: "시안을 고정할 수 있습니다.",
  frozen: "시안이 고정됐습니다. 비밀번호를 입력해 발급하세요.",
  preparing: "발급을 준비하는 중입니다.",
  issuing: "발급하는 중입니다.",
  success: "발급이 완료됐습니다.",
  stale: "편집 기준이 바뀌었습니다. 고정한 시안을 폐기하고 다시 준비하세요.",
  outcomeUnknown:
    "결과를 확인할 수 없습니다. 같은 시안을 다시 발급하지 말고 상태를 먼저 확인하세요.",
  passwordMismatchHint: "두 비밀번호가 서로 다릅니다.",
  linkUnavailable: "링크를 표시할 수 없습니다.",
  copyFailed: "링크를 복사하지 못했습니다. 주소를 직접 선택해 복사하세요.",
  copied: "링크를 복사했습니다.",
} as const;

/** Every failure the operator can see, as fixed copy. No code, message or identifier is shown. */
const ERROR_COPY: Record<string, string> = {
  SPACE_V2_SESSION_INVALID_DRAFT: "시안 정보를 사용할 수 없습니다. 새 시안을 준비하세요.",
  SPACE_V2_SESSION_PASSWORD_MISMATCH:
    "비밀번호가 일치하지 않아 발급하지 않았습니다. 새 시안을 준비한 뒤 다시 입력하세요.",
  SPACE_V2_SESSION_PROOF_FAILED: "시안 이미지를 준비하지 못했습니다. 새 시안을 준비하세요.",
  SPACE_V2_SESSION_PREPARATION_FAILED: "발급 준비에 실패했습니다. 새 시안을 준비하세요.",
  SPACE_V2_ISSUE_INVALID_INPUT: "발급 요청이 거부됐습니다. 새 시안을 준비하세요.",
  SPACE_V2_ISSUE_AUTH_REQUIRED: "운영자 인증이 필요합니다. 다시 로그인한 뒤 새 시안을 준비하세요.",
  SPACE_V2_ISSUE_FORBIDDEN: "이 계정에는 발급 권한이 없습니다.",
  SPACE_V2_ISSUE_UPLOAD_FAILED: "발급하지 못했습니다. 새 시안을 준비하세요.",
  SPACE_V2_ISSUE_DOCUMENT_FAILED: "발급하지 못했습니다. 새 시안을 준비하세요.",
  SPACE_V2_ISSUE_ASSET_MISMATCH: "발급 내용이 일치하지 않아 중단했습니다. 새 시안을 준비하세요.",
};

const FALLBACK_ERROR = "발급하지 못했습니다. 새 시안을 준비하세요.";

// --- pure selection evaluation ------------------------------------------------

export type AdminIssueSelectionStatus = "incomplete" | "unsupported" | "eligible";

export interface AdminIssueSelectionEvaluation {
  readonly status: AdminIssueSelectionStatus;
  readonly geometry: AdminIssuePlanGeometry | null;
  /** Derived from the projected aspect — never entered by hand (spec 083 §4). */
  readonly frameOrientation: "portrait" | "landscape" | null;
  readonly frameColor: string | null;
}

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

/** Frame colours the operator may pick: canonical `#RRGGBB` and not a grain finish (spec 083 §4). */
export function eligibleFrameColors(catalog: CatalogDocumentV1 | null): readonly CatalogItemV1[] {
  const colors = catalog?.data.frameColors ?? [];
  return colors.filter((item) => {
    const fill = item.fill;
    return item.grain !== true && typeof fill === "string" && HEX6.test(fill);
  });
}

/**
 * Whether one size/template/colour choice can be issued, and the geometry it yields.
 *
 * The same first-capability gate the issue session applies, asked BEFORE anything is spent: image
 * only, no operator text, no physical clock, and template art whose absence is PROVEN — an
 * `invalid-reference` proves nothing, so it is refused rather than treated as "no art". An
 * unsupported combination is explained on screen; it is never hidden to look like a success.
 */
export function evaluateIssueSelection(
  catalog: CatalogDocumentV1 | null,
  selection: {
    readonly frameSizeId: string;
    readonly templateId: string;
    readonly colorId: string;
  },
): AdminIssueSelectionEvaluation {
  const incomplete: AdminIssueSelectionEvaluation = {
    status: "incomplete",
    geometry: null,
    frameOrientation: null,
    frameColor: null,
  };
  if (catalog === null) return incomplete;
  if (selection.frameSizeId === "" || selection.templateId === "" || selection.colorId === "") {
    return incomplete;
  }
  const unsupported: AdminIssueSelectionEvaluation = {
    status: "unsupported",
    geometry: null,
    frameOrientation: null,
    frameColor: null,
  };

  const color = eligibleFrameColors(catalog).find((item) => item.id === selection.colorId);
  const fill = color?.fill;
  if (typeof fill !== "string") return unsupported;

  const projected = projectFramePreviewGeometry(catalog, {
    frameSizeId: selection.frameSizeId,
    templateId: selection.templateId,
  });
  if (!projected.ok) return unsupported;
  const geometry = projected.value;
  if (geometry.textZones.length > 0 || geometry.clockPreview !== null) return unsupported;

  const art = projectCatalogTemplateImage(catalog, {
    templateKind: "frame",
    templateId: selection.templateId,
  });
  if (art.status === "available" || art.reason === "invalid-reference") return unsupported;

  return {
    status: "eligible",
    geometry: {
      aspect: geometry.aspect,
      borderPercentOfWidth: geometry.borderPercentOfWidth,
      matColor: geometry.matColor,
      contentInsetPx: geometry.contentInsetPx,
    },
    // aspect = H / W, so a portrait frame is taller than wide. Exactly 1 is portrait by contract.
    frameOrientation: geometry.aspect < 1 ? "landscape" : "portrait",
    frameColor: fill,
  };
}

// --- transform bounds ---------------------------------------------------------

const MIN_SCALE_PERCENT = 100;
const MAX_SCALE_PERCENT = 500;
const MAX_LOGICAL_WIDTH = 500;
const IDENTITY: AdminIssueTransform = { scale: 1, x: 0, y: 0, rotationQuarterTurns: 0 };

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** The measured preview box, as a logical width the plan can use: positive integer, at most 500. */
export function toLogicalWidth(measured: number): number | null {
  if (!Number.isFinite(measured)) return null;
  const width = Math.min(Math.floor(measured), MAX_LOGICAL_WIDTH);
  return width > 0 ? width : null;
}

// --- the frozen generation ----------------------------------------------------

interface FrozenGeneration {
  readonly fields: SpaceV2FrozenIssueFields;
  readonly plan: PreviewRenderPlan;
  readonly revision: number | null;
}

// --- Canvas surface -----------------------------------------------------------

/**
 * A real Canvas for one plan. The plan and the drawables are owned by the caller; this creates the
 * element, applies the device-pixel transform and hands both to the shared executor — it never
 * copies the executor's maths, loads an image or resolves a URL.
 */
function IssuePreviewCanvas({
  plan,
  imageBindings,
  accessibleName,
}: {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
  readonly accessibleName: string;
}): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const { width, height } = plan.logicalCanvas;

  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;
    const ratio = Number.isFinite(globalThis.devicePixelRatio) ? globalThis.devicePixelRatio : 1;
    const dpr = clamp(ratio > 0 ? ratio : 1, 1, 4);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const context = canvas.getContext("2d");
    if (context === null) {
      setFailed(true);
      return;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const result = executePreviewRenderPlan({ context, plan, imageBindings });
    setFailed(!result.ok);
  }, [plan, imageBindings, width, height]);

  return (
    <div className="denn-space-v2-issue__canvas-wrap">
      <canvas
        ref={ref}
        role="img"
        aria-label={accessibleName}
        className="denn-space-v2-issue__canvas"
        style={{ width: `${width}px`, height: `${height}px` }}
        data-testid="space-v2-preview-canvas"
      />
      {failed ? (
        <p role="status" data-testid="space-v2-canvas-status">
          미리보기를 표시할 수 없습니다.
        </p>
      ) : (
        <VisuallyHidden>
          <span role="status" data-testid="space-v2-canvas-status">
            미리보기가 준비되었습니다.
          </span>
        </VisuallyHidden>
      )}
    </div>
  );
}

// --- the copy attempt (spec 083 §7) ------------------------------------------

/**
 * One explicit copy click, resolved to a fixed outcome. It never throws and never rethrows.
 *
 * The clipboard is the one port here that is FOREIGN CODE running inside the click handler, and it
 * can fail in three different shapes: the port is missing entirely, it rejects, or it throws
 * SYNCHRONOUSLY — which is what the production port does when `navigator.clipboard` is absent,
 * because `navigator.clipboard.writeText` is read before any promise exists. A `.then(onOk, onErr)`
 * pair catches the second shape only; the first and the third escape the handler, leaving the
 * operator with a success screen and a copy button that silently does nothing.
 *
 * So all three close into the same fixed `failed` state. The issued success and its link are NOT
 * downgraded — the space exists either way — and the raw error is dropped here rather than shown,
 * logged or re-thrown, so no SDK message, permission text or link fragment reaches the console.
 */
export function copyLinkToClipboard(
  link: string | null,
  clipboard: SpaceV2ClipboardPort | undefined,
): Promise<"copied" | "failed"> {
  if (link === null || clipboard === undefined) return Promise.resolve("failed");
  try {
    // `Promise.resolve` also absorbs a port that returns something that is not a promise at all.
    return Promise.resolve(clipboard.write(link)).then(
      () => "copied" as const,
      () => "failed" as const,
    );
  } catch {
    return Promise.resolve("failed");
  }
}

// --- the panel ----------------------------------------------------------------

export interface AdminSpaceV2IssuePanelProps {
  readonly writeController: AdminWriteSessionController;
  readonly session: SpaceV2IssueSessionController;
  /** Injected so a click, and only a click, can reach the platform clipboard. */
  readonly clipboard?: SpaceV2ClipboardPort;
  /** Injected in tests; production reads the browser ports lazily inside the owner. */
  readonly proofPorts?: AdminProofDraftPorts;
  /** Injected in tests; production uses the current document origin. */
  readonly readOrigin?: () => string;
}

export function AdminSpaceV2IssuePanel({
  writeController,
  session,
  clipboard,
  proofPorts,
  readOrigin,
}: AdminSpaceV2IssuePanelProps): React.JSX.Element {
  const write = useSyncExternalStore(
    writeController.subscribe,
    writeController.getSnapshot,
    writeController.getSnapshot,
  );
  const issue = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  // One owner per mount. StrictMode's double effect must not leave a second blob URL behind.
  const ownerRef = useRef<AdminProofDraftOwner | null>(null);
  ownerRef.current ??= createAdminProofDraftOwner(
    proofPorts === undefined ? undefined : { ports: proofPorts },
  );
  const owner = ownerRef.current;
  useEffect(() => () => owner.dispose(), [owner]);
  const image = useSyncExternalStore(owner.subscribe, owner.getSnapshot, owner.getSnapshot);

  const [frameSizeId, setFrameSizeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [colorId, setColorId] = useState("");
  const [transform, setTransform] = useState<AdminIssueTransform>(IDENTITY);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [frozen, setFrozen] = useState<FrozenGeneration | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [measured, setMeasured] = useState<number | null>(null);

  const baseline = writeController.getBaseline();
  const catalog = baseline?.catalog ?? null;
  const baselineReady = write.status === "ready-clean" && catalog !== null;

  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (box === null || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(() => {
      setMeasured(box.getBoundingClientRect().width);
    });
    observer.observe(box);
    setMeasured(box.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const sizes = catalog?.data.frameSizes ?? [];
  const templates = catalog?.data.frameTemplates ?? [];
  const colors = useMemo(() => eligibleFrameColors(catalog), [catalog]);

  const evaluation = useMemo(
    () => evaluateIssueSelection(catalog, { frameSizeId, templateId, colorId }),
    [catalog, frameSizeId, templateId, colorId],
  );

  const logicalWidth = measured === null ? null : toLogicalWidth(measured);
  const livePlan = useMemo(() => {
    if (frozen !== null) return null;
    if (evaluation.status !== "eligible" || evaluation.geometry === null) return null;
    if (evaluation.frameColor === null || logicalWidth === null) return null;
    if (image.status !== "ready") return null;
    const built = buildAdminFrameIssuePlan({
      geometry: evaluation.geometry,
      frameColor: evaluation.frameColor,
      logicalWidth,
      image: {
        imageRef: image.imageRef,
        intrinsicWidth: image.intrinsicWidth,
        intrinsicHeight: image.intrinsicHeight,
      },
      transform,
    });
    return built.ok ? built.plan : null;
  }, [frozen, evaluation, logicalWidth, image, transform]);

  // The frozen draft is stale as soon as the baseline it was taken from is no longer the current
  // one. It is never silently re-based: the operator has to prepare a new draft.
  const stale = frozen !== null && (!baselineReady || frozen.revision !== (write.revision ?? null));

  const issuing = issue.status === "preparing" || issue.status === "issuing";
  const settled =
    issue.status === "success" || issue.status === "error" || issue.status === "outcome-unknown";
  const editable = frozen === null && !issuing && baselineReady;

  const resetDraft = useCallback((): void => {
    session.clearDraft();
    setFrozen(null);
    setPassword("");
    setConfirmation("");
    setCopyState("idle");
  }, [session]);

  const freeze = (): void => {
    if (!editable || livePlan === null || catalog === null) return;
    if (evaluation.status !== "eligible" || evaluation.geometry === null) return;
    if (evaluation.frameColor === null || evaluation.frameOrientation === null) return;
    if (logicalWidth === null) return;
    const proof: AdminProofFrozenImage | null = owner.freeze();
    if (proof === null) return;

    // Everything the issue will use is captured HERE, in one generation, and copied out of the
    // panel's mutable state so a later edit, resize or file change cannot reach it.
    const fields: SpaceV2FrozenIssueFields = {
      catalog,
      selection: { frameSizeId, templateId },
      frameOrientation: evaluation.frameOrientation,
      logicalWidth,
      frameColor: evaluation.frameColor,
      transform: {
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
        rotationQuarterTurns: transform.rotationQuarterTurns,
      },
    };
    setFrozen({ fields, plan: livePlan, revision: write.revision ?? null });
    setCopyState("idle");
    session.beginDraft({
      copyFields: () => ({
        catalog: fields.catalog,
        selection: { ...fields.selection },
        frameOrientation: fields.frameOrientation,
        logicalWidth: fields.logicalWidth,
        frameColor: fields.frameColor,
        transform: { ...fields.transform },
      }),
      exportProofPng: () => proof.exportProofPng(),
    });
  };

  const submit = (): void => {
    if (!issue.canIssue || stale || issuing) return;
    const pair = { password, confirmation };
    // Cleared BEFORE the attempt starts, so nothing can re-read them from state afterwards.
    setPassword("");
    setConfirmation("");
    void session.issue(pair);
  };

  const link = useMemo(() => {
    if (issue.status !== "success" || issue.confirmedToken === null) return null;
    const origin = readOrigin ?? (() => globalThis.location?.origin ?? "");
    let value: string;
    try {
      value = origin();
    } catch {
      return null;
    }
    return formatSpaceV2SpaceLink(value, issue.confirmedToken);
  }, [issue, readOrigin]);

  const copy = (): void => {
    void copyLinkToClipboard(link, clipboard).then(setCopyState);
  };

  // An untouched field is not an error: the hint appears only once the operator has actually typed
  // a confirmation that disagrees. Until then the disabled issue button carries the requirement.
  const passwordHint =
    confirmation !== "" && password !== confirmation ? COPY.passwordMismatchHint : null;

  const status = ((): string => {
    // An attempt that already happened outranks the editing copy. An operator session that expires
    // mid-issue makes the baseline unavailable, and reporting THAT would replace the outcome of the
    // attempt with "load a baseline first" — worst of all for outcome-unknown, whose entire purpose
    // is to say that the same draft must not be issued again. What happened is reported first; the
    // baseline and stale copy still own every state where no attempt has been made.
    if (issue.status === "success") return COPY.success;
    if (issue.status === "outcome-unknown") return COPY.outcomeUnknown;
    if (issue.status === "error") return ERROR_COPY[String(issue.errorCode)] ?? FALLBACK_ERROR;
    if (issue.status === "preparing") return COPY.preparing;
    if (issue.status === "issuing") return COPY.issuing;
    if (!baselineReady) return COPY.baselineBlocked;
    if (stale) return COPY.stale;
    if (frozen !== null) return COPY.frozen;
    if (evaluation.status === "incomplete") return COPY.selectionIncomplete;
    if (evaluation.status === "unsupported") return COPY.selectionUnsupported;
    if (image.status === "idle") return COPY.imageIdle;
    if (image.status === "loading") return COPY.imageLoading;
    if (image.status === "failed") return COPY.imageFailed;
    if (logicalWidth === null) return COPY.measuring;
    if (livePlan === null) return COPY.planFailed;
    return COPY.previewReady;
  })();

  const percent = Math.round(transform.scale * 100);

  return (
    <Card>
      <section
        className="denn-space-v2-issue"
        aria-labelledby="space-v2-issue-title"
        data-testid="space-v2-issue-panel"
      >
        <h2 id="space-v2-issue-title">{COPY.title}</h2>
        <p>{COPY.intro}</p>
        <p
          role={issue.status === "outcome-unknown" || stale ? "alert" : "status"}
          data-testid="space-v2-issue-status"
        >
          {status}
        </p>

        <fieldset className="denn-space-v2-issue__group" disabled={!editable}>
          <legend>시안 구성</legend>

          <label htmlFor="space-v2-frame-size">액자 사이즈</label>
          <select
            id="space-v2-frame-size"
            data-testid="space-v2-frame-size"
            value={frameSizeId}
            onChange={(event) => setFrameSizeId(event.target.value)}
          >
            <option value="">사이즈를 선택하세요</option>
            {sizes.map((item) => (
              <option key={item.id} value={item.id}>
                {typeof item.name === "string" ? item.name : item.id}
              </option>
            ))}
          </select>

          <label htmlFor="space-v2-frame-template">액자 템플릿</label>
          <select
            id="space-v2-frame-template"
            data-testid="space-v2-frame-template"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            <option value="">템플릿을 선택하세요</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {typeof item.name === "string" ? item.name : item.id}
              </option>
            ))}
          </select>

          <label htmlFor="space-v2-frame-color">액자 색상</label>
          <select
            id="space-v2-frame-color"
            data-testid="space-v2-frame-color"
            value={colorId}
            onChange={(event) => setColorId(event.target.value)}
          >
            <option value="">색상을 선택하세요</option>
            {colors.map((item) => (
              <option key={item.id} value={item.id}>
                {typeof item.name === "string" ? item.name : item.id}
              </option>
            ))}
          </select>

          <label htmlFor="space-v2-proof-file">시안 이미지 (PNG)</label>
          <input
            id="space-v2-proof-file"
            data-testid="space-v2-proof-file"
            type="file"
            accept="image/png"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) owner.load(file);
            }}
          />
        </fieldset>

        <div className="denn-space-v2-issue__preview" ref={boxRef}>
          {frozen !== null ? (
            <IssuePreviewCanvas
              plan={frozen.plan}
              imageBindings={owner.bindings}
              accessibleName="고정된 액자 시안 미리보기"
            />
          ) : livePlan !== null ? (
            <IssuePreviewCanvas
              plan={livePlan}
              imageBindings={owner.bindings}
              accessibleName="액자 시안 미리보기"
            />
          ) : null}
        </div>

        <fieldset className="denn-space-v2-issue__group" disabled={!editable || livePlan === null}>
          <legend>사진 위치</legend>

          <label htmlFor="space-v2-scale">확대 ({percent}%)</label>
          <input
            id="space-v2-scale"
            data-testid="space-v2-scale"
            type="range"
            min={MIN_SCALE_PERCENT}
            max={MAX_SCALE_PERCENT}
            step={1}
            value={percent}
            onChange={(event) =>
              setTransform((current) => ({
                ...current,
                scale: clamp(Number(event.target.value) / 100, 1, 5),
              }))
            }
          />

          <label htmlFor="space-v2-pan-x">가로 위치</label>
          <input
            id="space-v2-pan-x"
            data-testid="space-v2-pan-x"
            type="range"
            min={-100}
            max={100}
            step={1}
            value={Math.round(transform.x * 100)}
            onChange={(event) =>
              setTransform((current) => ({
                ...current,
                x: clamp(Number(event.target.value) / 100, -1, 1),
              }))
            }
          />

          <label htmlFor="space-v2-pan-y">세로 위치</label>
          <input
            id="space-v2-pan-y"
            data-testid="space-v2-pan-y"
            type="range"
            min={-100}
            max={100}
            step={1}
            value={Math.round(transform.y * 100)}
            onChange={(event) =>
              setTransform((current) => ({
                ...current,
                y: clamp(Number(event.target.value) / 100, -1, 1),
              }))
            }
          />

          <div className="denn-space-v2-issue__row">
            <Button
              variant="ghost"
              type="button"
              data-testid="space-v2-rotate-left"
              onClick={() =>
                setTransform((current) => ({
                  ...current,
                  rotationQuarterTurns: (((current.rotationQuarterTurns + 3) % 4) +
                    0) as AdminIssueQuarterTurns,
                }))
              }
            >
              왼쪽으로 90°
            </Button>
            <Button
              variant="ghost"
              type="button"
              data-testid="space-v2-rotate-right"
              onClick={() =>
                setTransform((current) => ({
                  ...current,
                  rotationQuarterTurns: ((current.rotationQuarterTurns + 1) %
                    4) as AdminIssueQuarterTurns,
                }))
              }
            >
              오른쪽으로 90°
            </Button>
            <Button
              variant="ghost"
              type="button"
              data-testid="space-v2-reset-transform"
              onClick={() => setTransform(IDENTITY)}
            >
              원래대로
            </Button>
          </div>
        </fieldset>

        <div className="denn-space-v2-issue__row">
          <Button
            variant="primary"
            type="button"
            data-testid="space-v2-freeze"
            disabled={!editable || livePlan === null}
            onClick={freeze}
          >
            시안 고정
          </Button>
          <Button
            variant="ghost"
            type="button"
            data-testid="space-v2-new-draft"
            disabled={issuing || (frozen === null && !settled)}
            onClick={resetDraft}
          >
            새 시안 준비
          </Button>
        </div>

        {/* Kept mounted while an attempt is in flight so the controls are DISABLED rather than
            disappearing: a form that vanishes mid-issue reads as "it was cancelled". */}
        {frozen !== null && !stale && (issue.status === "draft-ready" || issuing) ? (
          <fieldset className="denn-space-v2-issue__group" disabled={issuing}>
            <legend>발급 비밀번호</legend>
            <TextField
              label="비밀번호"
              type="password"
              autoComplete="new-password"
              data-testid="space-v2-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <TextField
              label="비밀번호 확인"
              type="password"
              autoComplete="new-password"
              data-testid="space-v2-password-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              error={passwordHint ?? undefined}
            />
            <Button
              variant="primary"
              type="button"
              data-testid="space-v2-issue"
              disabled={!issue.canIssue || issuing || password === "" || password !== confirmation}
              onClick={submit}
            >
              시안 발급
            </Button>
          </fieldset>
        ) : null}

        {issue.status === "success" ? (
          <div className="denn-space-v2-issue__group" data-testid="space-v2-success">
            {link === null ? (
              <p data-testid="space-v2-link-unavailable">{COPY.linkUnavailable}</p>
            ) : (
              <>
                <p className="denn-space-v2-issue__link" data-testid="space-v2-link">
                  {link}
                </p>
                <Button
                  variant="ghost"
                  type="button"
                  data-testid="space-v2-copy-link"
                  onClick={copy}
                >
                  링크 복사
                </Button>
              </>
            )}
            <p role="status" data-testid="space-v2-copy-status">
              {copyState === "copied" ? COPY.copied : copyState === "failed" ? COPY.copyFailed : ""}
            </p>
          </div>
        ) : null}
      </section>
    </Card>
  );
}
