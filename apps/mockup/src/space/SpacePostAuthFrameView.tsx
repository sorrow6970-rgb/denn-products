import type { PublicCatalogReader } from "@denn/firebase";
import type { PreviewRenderPlan } from "@denn/render";
import type { SpaceSceneV1 } from "@denn/spaces";
import { Badge, Button } from "@denn/ui";
import { useEffect, useMemo } from "react";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import { usePublicCatalog } from "../catalog/usePublicCatalog";
import { resolveSpaceFrameAssetRequests } from "./frame-asset-request";
import { composeSpaceFramePlan } from "./frame-plan";
import { classifySpaceV1FrameReplay } from "./proof-image";
import type { SourceBoundReadinessSnapshot } from "./source-bound-readiness";
import "./space-post-auth-frame-view.css";
import { useContentLogicalWidth } from "./use-content-logical-width";
import {
  resolveSpaceFrameFontRequest,
  type SpaceFrameFontEnvironmentFactory,
  useSpaceFrameFonts,
} from "./use-space-frame-fonts";
import {
  type SourceBoundReadinessFactory,
  useSourceBoundReadiness,
} from "./use-source-bound-readiness";

export interface SpacePostAuthFrameViewProps {
  readonly scene: SpaceSceneV1;
  readonly catalogReader: PublicCatalogReader;
  readonly createReadiness?: SourceBoundReadinessFactory;
  readonly createFontEnvironment?: SpaceFrameFontEnvironmentFactory;
}

type OwnerState = "loading" | "failed" | "ready";
type DerivedView =
  | { readonly status: "catalog-loading" }
  | { readonly status: "catalog-failed"; readonly retryable: boolean }
  | { readonly status: "asset-failed" }
  | { readonly status: "owner-loading" }
  | { readonly status: "owner-failed" }
  | { readonly status: "width-loading" }
  | { readonly status: "font-loading" }
  | { readonly status: "font-failed" }
  | { readonly status: "plan-failed" }
  | { readonly status: "ready"; readonly plan: PreviewRenderPlan };

const statusMessage = (status: DerivedView["status"]): string => {
  switch (status) {
    case "catalog-loading":
      return "시안 구성을 불러오는 중입니다.";
    case "owner-loading":
    case "width-loading":
    case "font-loading":
      return "시안 화면을 준비하는 중입니다.";
    default:
      return "시안을 표시할 수 없습니다.";
  }
};

function resolveOwnerState(
  snapshot: SourceBoundReadinessSnapshot,
  proofReady: boolean,
  artRequired: boolean,
  artReady: boolean,
): OwnerState {
  if (snapshot.status === "disposed") return "loading";
  if (proofReady && (!artRequired || artReady)) return "ready";
  if (snapshot.proof.status === "failed") return "failed";
  if (artRequired && snapshot.templateArt.status === "failed") return "failed";
  return "loading";
}

/**
 * Spec 063 preflight. `blocked` means "this scene has not proven that it can be replayed exactly",
 * which under spec 062 / FF-1=A is every `space-scene-v1` payload: V1 stores no capture orientation
 * and no geometry basis, so no reading of it can establish the composition that was issued. The
 * proven branch exists for the future explicit-orientation scene version and is unreachable today —
 * that is the point of the gate, not an oversight.
 */
type SpaceV1ReplayPreflight =
  | { readonly status: "blocked" }
  | { readonly status: "exact-replay-proven" };

function preflightSpaceV1Replay(scene: SpaceSceneV1): SpaceV1ReplayPreflight {
  let transform: unknown;
  try {
    transform = scene.design.imgT;
  } catch {
    // A hostile or throwing accessor is a blocked scene, never an exception that reaches React.
    return { status: "blocked" };
  }
  const eligibility = classifySpaceV1FrameReplay(transform);
  return eligibility.ok ? { status: "exact-replay-proven" } : { status: "blocked" };
}

/**
 * Local-only authenticated frame view. The component has no production reader singleton of its own:
 * callers inject a catalog reader.
 *
 * The replay preflight runs BEFORE everything else — before the catalog read, before any proof or
 * template-art source is derived, before the readiness owner, the measured width, the font gate and
 * the Canvas plan. A blocked scene therefore does zero network, zero image decode and zero Canvas
 * work: the composition child is never mounted, so none of its hooks or effects exist at all. There
 * is no injectable seam that skips this gate (the composition is module-private on purpose) and no
 * best-effort, cached-plan, auto-retry, auto-fallback or auto-migration path out of it.
 */
export function SpacePostAuthFrameView(props: SpacePostAuthFrameViewProps): React.JSX.Element {
  const { scene } = props;
  // Unconditional hook: the branch below picks a child component, it never skips a hook call.
  const preflight = useMemo(() => preflightSpaceV1Replay(scene), [scene]);
  if (preflight.status !== "exact-replay-proven") {
    return <SpaceReplayBlockedNotice />;
  }
  return <SpaceExactFrameComposition {...props} />;
}

/**
 * The safe stop. It says what the link is, what cannot be proven, and what to do — with no error
 * code, URL, token, password, catalog id or SDK text, and with no Canvas or image placeholder that
 * could be mistaken for the saved composition. There is deliberately no retry control: retrying
 * cannot produce evidence that the payload never carried.
 */
function SpaceReplayBlockedNotice(): React.JSX.Element {
  return (
    <section
      className="denn-space-blocked"
      aria-labelledby="space-frame-blocked-title"
      data-testid="space-frame-view"
    >
      <Badge>이전 버전 시안</Badge>
      <h2 className="denn-space-blocked__title" id="space-frame-blocked-title">
        이 시안은 지금 화면에 표시할 수 없습니다
      </h2>
      {/* role="alert": the state appears in response to the password being accepted, so it is
          announced at the moment the reader is waiting for the result. */}
      <div className="denn-space-blocked__body" role="alert" data-testid="space-frame-status">
        <p>이 링크는 이전 버전에서 발급된 시안입니다.</p>
        <p>현재 버전에서는 발급 당시의 액자 방향과 사진 구도를 정확히 증명할 수 없습니다.</p>
        <p>구도를 임의로 바꿔 보여드리지 않기 위해 시안 표시를 안전하게 중단했습니다.</p>
      </div>
      <div className="denn-space-blocked__next" data-testid="space-frame-next">
        <p>담당자에게 새 시안 링크를 요청해 주세요.</p>
      </div>
    </section>
  );
}

/**
 * Module-private on purpose: the only way to reach it is through the preflight above, so no test
 * fixture and no future caller can mount the composition for a scene that has not proven exact
 * replay.
 */
function SpaceExactFrameComposition({
  scene,
  catalogReader,
  createReadiness,
  createFontEnvironment,
}: SpacePostAuthFrameViewProps): React.JSX.Element {
  const catalog = usePublicCatalog(catalogReader);
  const readiness = useSourceBoundReadiness(createReadiness);
  const width = useContentLogicalWidth();

  const document = catalog.state.status === "ready" ? catalog.state.document : null;
  const assetRequest = useMemo(
    () => (document === null ? null : resolveSpaceFrameAssetRequests(document, scene)),
    [document, scene],
  );

  const proofSource = assetRequest?.ok ? assetRequest.value.proof.src : null;
  const artSource =
    assetRequest?.ok && assetRequest.value.templateArt.status === "load"
      ? assetRequest.value.templateArt.source
      : null;
  const artKind = artSource?.kind ?? null;
  const artSrc = artSource?.src ?? null;
  const readinessController = readiness.controller;

  useEffect(() => {
    if (proofSource === null) {
      readinessController.clearProof();
      readinessController.clearTemplateArt();
      return;
    }
    readinessController.loadProof(proofSource);
    if (artKind === null || artSrc === null) readinessController.clearTemplateArt();
    else readinessController.loadTemplateArt({ kind: artKind, src: artSrc });
  }, [artKind, artSrc, proofSource, readinessController]);

  const proofReady =
    proofSource !== null && readinessController.proofResolver.resolve(proofSource).ok;
  const artRequired = artSource !== null;
  const artReady =
    artSource !== null && readinessController.templateArtResolver.resolve(artSource).ok;
  const ownerState = resolveOwnerState(readiness.snapshot, proofReady, artRequired, artReady);

  const fontRequest = useMemo(
    () =>
      document !== null && assetRequest?.ok && ownerState === "ready" && width.logicalWidth !== null
        ? resolveSpaceFrameFontRequest(document, scene, width.logicalWidth)
        : null,
    [assetRequest, document, ownerState, scene, width.logicalWidth],
  );
  const fonts = useSpaceFrameFonts(fontRequest, createFontEnvironment);

  const plan = useMemo(() => {
    if (
      document === null ||
      !assetRequest?.ok ||
      ownerState !== "ready" ||
      width.logicalWidth === null ||
      (fonts.status !== "not-required" && fonts.status !== "ready")
    ) {
      return null;
    }
    return composeSpaceFramePlan({
      document,
      scene,
      logicalWidth: width.logicalWidth,
      proof: readinessController.proofResolver,
      templateArt: readinessController.templateArtResolver,
      ...(fonts.status === "ready" ? { measureText: fonts.measureText } : {}),
    });
  }, [assetRequest, document, fonts, ownerState, readinessController, scene, width.logicalWidth]);

  let view: DerivedView;
  if (catalog.state.status === "idle" || catalog.state.status === "loading") {
    view = { status: "catalog-loading" };
  } else if (catalog.state.status === "error") {
    view = { status: "catalog-failed", retryable: catalog.state.retryable };
  } else if (!assetRequest?.ok) {
    view = { status: "asset-failed" };
  } else if (ownerState === "failed") {
    view = { status: "owner-failed" };
  } else if (ownerState === "loading") {
    view = { status: "owner-loading" };
  } else if (width.logicalWidth === null) {
    view = { status: "width-loading" };
  } else if (fonts.status === "dormant" || fonts.status === "waiting") {
    view = { status: "font-loading" };
  } else if (fonts.status === "failed") {
    view = { status: "font-failed" };
  } else if (plan === null || !plan.ok) {
    view = { status: "plan-failed" };
  } else {
    view = { status: "ready", plan: plan.plan };
  }

  return (
    <section
      className="denn-stack"
      aria-labelledby="space-frame-title"
      data-testid="space-frame-view"
    >
      <Badge>저장된 시안 · 열람 전용</Badge>
      <h2 id="space-frame-title">내 공간 시안</h2>
      <p>저장된 액자 구성을 확인할 수 있습니다.</p>
      <div ref={width.ref} data-testid="space-frame-measure" style={{ width: "100%" }}>
        {view.status === "ready" ? (
          <PreviewCanvasSurface
            plan={view.plan}
            imageBindings={readinessController.bindings}
            accessibleName="저장된 액자 시안"
          />
        ) : (
          <p
            role={
              view.status === "catalog-loading" ||
              view.status === "owner-loading" ||
              view.status === "width-loading" ||
              view.status === "font-loading"
                ? "status"
                : "alert"
            }
            aria-live="polite"
            data-testid="space-frame-status"
          >
            {statusMessage(view.status)}
          </p>
        )}
      </div>
      {view.status === "catalog-failed" && view.retryable ? (
        <Button variant="primary" onClick={catalog.retry} data-testid="space-frame-retry">
          다시 시도
        </Button>
      ) : null}
    </section>
  );
}
