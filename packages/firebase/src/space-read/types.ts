export type SpaceDocumentReadErrorCode =
  | "SPACE_READ_INVALID_REQUEST"
  | "SPACE_READ_NOT_FOUND"
  | "SPACE_READ_FORBIDDEN"
  | "SPACE_READ_RATE_LIMITED"
  | "SPACE_READ_NETWORK_UNAVAILABLE"
  | "SPACE_READ_TIMEOUT"
  | "SPACE_READ_UNEXPECTED";

export interface SafeSpaceDocumentReadError {
  readonly code: SpaceDocumentReadErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
}

export type SpaceDocumentReadResult =
  | {
      readonly ok: true;
      readonly value: { readonly document: unknown; readonly correlationId: string };
    }
  | { readonly ok: false; readonly error: SafeSpaceDocumentReadError };

export interface SpaceDocumentReadPort {
  load(request: {
    readonly token: unknown;
    readonly correlationId: unknown;
  }): Promise<SpaceDocumentReadResult>;
}
