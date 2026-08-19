import type { PublicCatalogReader } from "@denn/firebase";
import type { PreviewRenderPlan } from "@denn/render";
import type { SpaceSceneV1 } from "@denn/spaces";
import { Badge, Button } from "@denn/ui";
import { useEffect, useMemo } from "react";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import { usePublicCatalog } from "../catalog/usePublicCatalog";
import { resolveSpaceFrameAssetRequests } from "./frame-asset-request";
import { composeSpaceFramePlan } from "./frame-plan";
import type { SourceBoundReadinessSnapshot } from "./source-bound-readiness";
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
 * Local-only authenticated frame composition. The component has no production reader singleton of
 * its own: callers must inject a catalog reader and the production App does not mount it in spec 060.
 */
export function SpacePostAuthFrameView({
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
