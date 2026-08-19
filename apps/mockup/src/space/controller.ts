import type { SpaceDocumentReadPort, SpaceDocumentReadResult } from "@denn/firebase/space-read";
import type { OpenedSpaceV1, SpaceOpenPort, SpaceOpenResult } from "@denn/spaces";
import { readSpaceLink } from "./link";

export type SpaceViewErrorCode =
  | "SPACE_VIEW_INVALID_LINK"
  | "SPACE_VIEW_NOT_FOUND"
  | "SPACE_VIEW_LOAD_FAILED"
  | "SPACE_VIEW_PASSWORD_REJECTED"
  | "SPACE_VIEW_INVALID_CONTENT";

export type SpaceViewState =
  | { readonly status: "inactive" }
  | { readonly status: "invalid-link" }
  | { readonly status: "awaiting-password" }
  | { readonly status: "loading"; readonly requestId: number }
  | {
      readonly status: "error";
      readonly requestId: number;
      readonly code: SpaceViewErrorCode;
      readonly retryable: boolean;
    }
  | { readonly status: "ready"; readonly requestId: number; readonly value: OpenedSpaceV1 };

const CORRELATION_PREFIX = "mockup-space";

export class SpaceLinkOpenController {
  private readonly token: string | null;
  private state: SpaceViewState;
  private generation = 0;
  private active = true;
  private inFlight = false;
  private cachedDocument: unknown | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    search: unknown,
    private readonly reader: SpaceDocumentReadPort,
    private readonly opener: SpaceOpenPort,
  ) {
    const link = readSpaceLink(search);
    this.token = link.kind === "valid" ? link.token : null;
    this.state =
      link.kind === "inactive"
        ? { status: "inactive" }
        : link.kind === "invalid"
          ? { status: "invalid-link" }
          : { status: "awaiting-password" };
  }

  readonly getState = (): SpaceViewState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly submitPassword = (password: unknown): void => {
    if (!this.active || this.token === null || this.inFlight) return;
    if (
      this.state.status === "inactive" ||
      this.state.status === "invalid-link" ||
      this.state.status === "ready"
    )
      return;
    if (this.state.status === "error" && !this.state.retryable) return;
    const generation = ++this.generation;
    this.inFlight = true;
    this.setState({ status: "loading", requestId: generation });
    void this.run(generation, password).catch(() => {
      if (!this.isCurrent(generation)) return;
      this.inFlight = false;
      this.cachedDocument = null;
      this.setState({
        status: "error",
        requestId: generation,
        code: "SPACE_VIEW_LOAD_FAILED",
        retryable: false,
      });
    });
  };

  readonly detach = (): void => {
    this.active = false;
    this.generation += 1;
    this.inFlight = false;
    this.cachedDocument = null;
    this.listeners.clear();
  };

  private async run(generation: number, password: unknown): Promise<void> {
    let document = this.cachedDocument;
    if (document === null) {
      const read = await this.reader.load({
        token: this.token,
        correlationId: `${CORRELATION_PREFIX}-${generation}`,
      });
      if (!this.isCurrent(generation)) return;
      if (!read.ok) {
        this.inFlight = false;
        this.setState(this.readError(generation, read));
        return;
      }
      document = read.value.document;
      this.cachedDocument = document;
    }

    const opened = await this.opener.open(document, password);
    if (!this.isCurrent(generation)) return;
    this.inFlight = false;
    if (!opened.ok) {
      if (
        opened.code !== "SPACE_OPEN_DECRYPT_FAILED" &&
        opened.code !== "SPACE_OPEN_INVALID_INPUT"
      ) {
        this.cachedDocument = null;
      }
      this.setState(this.openError(generation, opened));
      return;
    }
    this.cachedDocument = null;
    this.setState({ status: "ready", requestId: generation, value: opened.value });
  }

  private isCurrent(generation: number): boolean {
    return this.active && generation === this.generation;
  }

  private readError(
    generation: number,
    result: Extract<SpaceDocumentReadResult, { ok: false }>,
  ): SpaceViewState {
    const code =
      result.error.code === "SPACE_READ_NOT_FOUND"
        ? "SPACE_VIEW_NOT_FOUND"
        : result.error.code === "SPACE_READ_INVALID_REQUEST"
          ? "SPACE_VIEW_INVALID_LINK"
          : "SPACE_VIEW_LOAD_FAILED";
    return { status: "error", requestId: generation, code, retryable: result.error.retryable };
  }

  private openError(
    generation: number,
    result: Extract<SpaceOpenResult, { ok: false }>,
  ): SpaceViewState {
    const passwordFailure =
      result.code === "SPACE_OPEN_DECRYPT_FAILED" || result.code === "SPACE_OPEN_INVALID_INPUT";
    return {
      status: "error",
      requestId: generation,
      code: passwordFailure ? "SPACE_VIEW_PASSWORD_REJECTED" : "SPACE_VIEW_INVALID_CONTENT",
      retryable: passwordFailure,
    };
  }

  private setState(state: SpaceViewState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
