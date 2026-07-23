import type { PublicCatalogLoadResult, PublicCatalogReader } from "@denn/firebase";
import type { PublicCatalogUiState } from "./types";

// Non-sensitive fixed prefix; the suffix is an app-internal counter. No time / user / catalog
// values are put into the correlationId (spec 015 §5).
const CORRELATION_PREFIX = "mockup-catalog";

/**
 * Framework-free controller for the public catalog connection (spec 015). Owns the UI state
 * machine, a monotonic request generation, and per-load AbortControllers. React wires it via a
 * thin hook; tests drive it directly with a fake reader + controlled promises.
 *
 * - StrictMode mount→cleanup→mount: each mount is a separate caller; the reader singleton's
 *   in-flight dedup keeps the underlying fetch to exactly one. Stale/aborted results are
 *   dropped by the generation guard.
 * - detach() (real unmount) stops applying results and aborts the current caller only.
 * - A caller-abort (REQUEST_ABORTED) from our own lifecycle never flashes as a fatal error.
 */
export class PublicCatalogController {
  private state: PublicCatalogUiState = { status: "idle" };
  private generation = 0;
  private active = false;
  private current: AbortController | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly reader: PublicCatalogReader) {}

  readonly getState = (): PublicCatalogUiState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Begin the initial load. Safe under StrictMode double mount (generation + reader dedup). */
  readonly start = (): void => {
    this.beginLoad();
  };

  /** Manual retry — only from a retryable error, and never while a load is in flight. */
  readonly retry = (): void => {
    if (this.state.status !== "error" || !this.state.retryable) return;
    this.beginLoad();
  };

  /** Real unmount: stop applying results and abort the current caller (restartable via start). */
  readonly detach = (): void => {
    this.active = false;
    this.current?.abort();
    this.current = null;
  };

  private beginLoad(): void {
    this.active = true;
    const generation = ++this.generation;
    this.current?.abort();
    const controller = new AbortController();
    this.current = controller;
    this.setState({ status: "loading", requestId: generation });
    void this.reader
      .load({ correlationId: `${CORRELATION_PREFIX}-${generation}`, signal: controller.signal })
      .then((result) => {
        this.settle(generation, result);
      });
  }

  private settle(generation: number, result: PublicCatalogLoadResult): void {
    if (!this.active) return; // detached (unmounted)
    if (generation !== this.generation) return; // stale — a newer load supersedes this one
    // Our own lifecycle abort must not surface as a fatal error.
    if (!result.ok && result.error.code === "REQUEST_ABORTED") return;
    this.current = null;
    if (result.ok) {
      this.setState({
        status: "ready",
        requestId: generation,
        document: result.document,
        warningCount: result.report.warnings.length,
      });
    } else {
      this.setState({
        status: "error",
        requestId: generation,
        code: result.error.code,
        retryable: result.error.retryable,
      });
    }
  }

  private setState(state: PublicCatalogUiState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
