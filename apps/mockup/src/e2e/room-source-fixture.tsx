import type { PreviewRenderPlan } from "@denn/render";
import {
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useLocalImageBinding } from "../canvas/useLocalImageBinding";
import { useTemplateArtBinding } from "../canvas/useTemplateArtBinding";
import type { RoomCommittedSource } from "../room-placement/committed-source";
import {
  createFrameSnapshotCapturer,
  type FrameSnapshotCapturer,
  type FrameSnapshotLease,
} from "../room-placement/frame-snapshot";
import {
  useRoomCommittedSource,
  type UseRoomCommittedSourceResult,
} from "../room-placement/useRoomCommittedSource";

type Mode = "ready" | "no-art" | "missing-art" | "clock" | "case";
interface Session {
  bridge: UseRoomCommittedSourceResult | null;
  replace: (() => void) | null;
  loadAll: (() => void) | null;
  clearPhoto: (() => void) | null;
  oldReader: (() => unknown) | null;
  reader: (() => unknown) | null;
  captured: RoomCommittedSource | null;
  savedLease: FrameSnapshotLease | null;
  capturer: FrameSnapshotCapturer | null;
  target: CanvasRenderingContext2D | null;
  copies: number;
  releases: number;
  notifications: number;
  failCleanup: boolean;
  immediate: boolean;
}
function session(): Session {
  return {
    bridge: null,
    replace: null,
    loadAll: null,
    clearPhoto: null,
    oldReader: null,
    reader: null,
    captured: null,
    savedLease: null,
    capturer: null,
    target: null,
    copies: 0,
    releases: 0,
    notifications: 0,
    failCleanup: false,
    immediate: false,
  };
}
function specimen() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("fixture");
  ctx.fillStyle = "#112233";
  ctx.fillRect(0, 0, 2, 2);
  const src = canvas.toDataURL("image/png");
  const bytes = Uint8Array.from(atob(src.split(",")[1]), (c) => c.charCodeAt(0));
  return { src, blob: new Blob([bytes], { type: "image/png" }) };
}
const never = new Promise<void>(() => undefined);
function SourceOwner({
  shared,
  input,
  mode,
  version,
  suspended,
}: {
  shared: Session;
  input: ReturnType<typeof specimen>;
  mode: Mode;
  version: number;
  suspended: boolean;
}) {
  const photo = useLocalImageBinding(),
    art = useTemplateArtBinding();
  const photoLoad = photo.load,
    artLoad = art.load;
  const invalidate = useCallback(() => {
    shared.notifications++;
    shared.savedLease?.release();
    if (shared.failCleanup) throw new Error("fixture private detail");
  }, [shared]);
  // The proof reader closure changes only meaning with this hook's state/binding incarnation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: bind the render readers to their exact state and binding, not the changing result wrapper
  const candidate = useMemo(() => {
    if (photo.state.status !== "ready") return null;
    const photoRef = photo.state.imageState.imageRef;
    const artRef = art.state.status === "ready" ? art.state.imageRef : null;
    const includeArt = mode !== "no-art";
    const plan: PreviewRenderPlan = {
      kind: "frame",
      logicalCanvas: { width: 4, height: 2 },
      commands: [
        {
          type: "fill-rect",
          layerId: "synthetic-base",
          color: version % 2 ? "#ffffff" : "#000000",
          rect: { x: 0, y: 0, width: 4, height: 2 },
        },
        {
          type: "draw-image-stretch",
          layerId: "synthetic-photo",
          imageRef: "photo",
          destRect: { x: 0, y: 0, width: 2, height: 2 },
        },
        ...(includeArt
          ? [
              {
                type: "draw-image-stretch" as const,
                layerId: "synthetic-art",
                imageRef: "art",
                destRect: { x: 2, y: 0, width: 2, height: 2 },
              },
            ]
          : []),
      ],
    };
    return {
      kind: mode === "case" ? "case" : "frame",
      projectionOk: true,
      planReady: true,
      clockPreview: mode === "clock" ? {} : null,
      plan,
      imageBindings: {
        get: (ref: string) =>
          ref === "photo"
            ? photo.bindings.get(photoRef)
            : ref === "art" && artRef
              ? art.bindings.get(artRef)
              : undefined,
      },
      isCurrent: () =>
        photo.readReadyProof()?.isCurrent() === true &&
        (!includeArt || art.readReadyProof()?.isCurrent() === true),
    };
  }, [photo.state, photo.bindings, art.state, art.bindings, mode, version]);
  const bridge = useRoomCommittedSource(candidate, invalidate);
  useLayoutEffect(() => {
    shared.bridge = bridge;
    shared.loadAll = () => {
      photoLoad(input.blob);
      if (mode !== "no-art" && mode !== "missing-art")
        artLoad({ kind: "data-image", src: input.src });
    };
    shared.replace = () => photoLoad(input.blob);
    shared.clearPhoto = photo.clear;
    shared.reader = photo.readReadyProof;
  });
  // A thrown render never reaches layout effects; deferred React work retains the previous UI.
  if (suspended) throw never;
  return (
    <p
      data-testid="rs-images"
      data-photo-failure={photo.state.status === "failed" ? photo.state.code : "none"}
    >
      {photo.state.status}/{art.state.status}
    </p>
  );
}
function capture(shared: Session) {
  const source = shared.bridge?.readSource();
  if (!source) return false;
  shared.capturer?.dispose();
  const made = createFrameSnapshotCapturer({
    readSource: shared.bridge?.readSource,
    createSurface: (size: { width: number; height: number }) => {
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      return {
        context: canvas.getContext("2d"),
        release: () => {
          shared.releases++;
          canvas.width = 1;
          canvas.height = 1;
        },
        copyTo: (
          target: CanvasRenderingContext2D,
          rect: { x: number; y: number; width: number; height: number },
        ) => {
          shared.copies++;
          target.drawImage(canvas, rect.x, rect.y, rect.width, rect.height);
        },
      };
    },
  });
  if (!made.ok) return false;
  shared.capturer = made.capturer;
  const result = made.capturer.capture({
    sourceIdentity: source.identity,
    scale: 1,
    budget: { maxEdge: 16, maxPixels: 256 },
  });
  if (!result.ok) return false;
  shared.captured = source;
  shared.oldReader = shared.reader;
  shared.savedLease = result.lease;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 2;
  shared.target = canvas.getContext("2d", { willReadFrequently: true });
  return result.lease.paint({ target: shared.target, rect: { x: 0, y: 0, width: 4, height: 2 } })
    .ok;
}
export function RoomSourceFixture() {
  const [shared] = useState(session);
  const [input, setInput] = useState<ReturnType<typeof specimen> | null>(null);
  const [mode, setMode] = useState<Mode>("ready"),
    [mounted, setMounted] = useState(false);
  const [version, setVersion] = useState(0),
    [suspended, setSuspended] = useState(false);
  const [report, setReport] = useState("");
  const inspect = (extra: Record<string, unknown> = {}) => {
    const current = shared.bridge?.readSource() ?? null;
    const oldBorrow = shared.captured?.imageBindings.get("photo");
    const pixels = shared.target ? Array.from(shared.target.getImageData(0, 0, 4, 1).data) : [];
    setReport(
      JSON.stringify({
        ready: current !== null,
        same: current !== null && current === shared.captured,
        oldBorrow: oldBorrow !== undefined,
        immediate: shared.immediate,
        copies: shared.copies,
        releases: shared.releases,
        notifications: shared.notifications,
        oldReaderReady: shared.oldReader?.() != null,
        pixels,
        ...extra,
      }),
    );
  };
  useEffect(
    () => () => {
      shared.capturer?.dispose();
    },
    [shared],
  );
  return (
    <main>
      <h1>Spec131 synthetic commit lifecycle</h1>
      {(["ready", "no-art", "missing-art", "clock", "case"] as const).map((value) => (
        <button
          type="button"
          key={value}
          data-testid={`rs-start-${value}`}
          onClick={() => {
            setInput(specimen());
            setMode(value);
            setMounted(true);
          }}
        >
          {value}
        </button>
      ))}
      <button type="button" data-testid="rs-load" onClick={() => shared.loadAll?.()}>
        load synthetic images
      </button>
      <button
        type="button"
        data-testid="rs-capture"
        onClick={() => inspect({ captured: capture(shared) })}
      >
        capture
      </button>
      <button type="button" data-testid="rs-inspect" onClick={() => inspect()}>
        inspect
      </button>
      <button
        type="button"
        data-testid="rs-change"
        onClick={() => {
          shared.bridge?.invalidate();
          shared.immediate = shared.bridge?.readSource() === null;
          setVersion((n) => n + 1);
          inspect();
        }}
      >
        change
      </button>
      <button
        type="button"
        data-testid="rs-replace"
        onClick={() => {
          shared.replace?.();
          shared.immediate = shared.bridge?.readSource() === null;
          inspect();
        }}
      >
        replace photo
      </button>
      <button
        type="button"
        data-testid="rs-clear"
        onClick={() => {
          shared.clearPhoto?.();
          shared.immediate = shared.bridge?.readSource() === null;
          inspect();
        }}
      >
        clear photo
      </button>
      <button
        type="button"
        data-testid="rs-suspend"
        onClick={() => {
          shared.bridge?.invalidate();
          shared.immediate = shared.bridge?.readSource() === null;
          startTransition(() => {
            setVersion((n) => n + 1);
            setSuspended(true);
          });
          inspect();
        }}
      >
        defer
      </button>
      <button type="button" data-testid="rs-resume" onClick={() => setSuspended(false)}>
        resume
      </button>
      <button type="button" data-testid="rs-unmount" onClick={() => setMounted(false)}>
        unmount
      </button>
      <button type="button" data-testid="rs-remount" onClick={() => setMounted(true)}>
        remount
      </button>
      <button
        type="button"
        data-testid="rs-fail"
        onClick={() => {
          shared.failCleanup = true;
          shared.bridge?.invalidate();
          setVersion((n) => n + 1);
          inspect();
        }}
      >
        cleanup failure
      </button>
      <button
        type="button"
        data-testid="rs-old-paint"
        onClick={() => {
          const result = shared.savedLease?.paint({
            target: shared.target,
            rect: { x: 0, y: 0, width: 4, height: 2 },
          });
          inspect({ oldPaint: result?.ok === true });
        }}
      >
        old paint
      </button>
      <Suspense fallback={<p data-testid="rs-fallback">waiting</p>}>
        {mounted && input ? (
          <SourceOwner
            shared={shared}
            input={input}
            mode={mode}
            version={version}
            suspended={suspended}
          />
        ) : null}
      </Suspense>
      <pre data-testid="rs-report">{report}</pre>
    </main>
  );
}
