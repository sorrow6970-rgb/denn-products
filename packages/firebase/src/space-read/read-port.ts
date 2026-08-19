import type { SpaceReadFirebaseFacade } from "./facade";
import type {
  SafeSpaceDocumentReadError,
  SpaceDocumentReadErrorCode,
  SpaceDocumentReadPort,
  SpaceDocumentReadResult,
} from "./types";
import { isValidSpaceToken } from "./token";

export const SPACE_DOCUMENT_READ_TIMEOUT_MS = 20_000;
const CORRELATION_ID = /^[A-Za-z0-9_-]{1,64}$/;

const RETRYABLE = new Set<SpaceDocumentReadErrorCode>([
  "SPACE_READ_RATE_LIMITED",
  "SPACE_READ_NETWORK_UNAVAILABLE",
  "SPACE_READ_TIMEOUT",
]);

function safeError(
  code: SpaceDocumentReadErrorCode,
  correlationId: string,
): SafeSpaceDocumentReadError {
  return { code, retryable: RETRYABLE.has(code), correlationId };
}

function rawCode(error: unknown): string {
  try {
    if (error === null || typeof error !== "object") return "";
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : "";
  } catch {
    return "";
  }
}

function mapError(error: unknown): SpaceDocumentReadErrorCode {
  switch (rawCode(error)) {
    case "permission-denied":
    case "firestore/permission-denied":
      return "SPACE_READ_FORBIDDEN";
    case "resource-exhausted":
    case "firestore/resource-exhausted":
      return "SPACE_READ_RATE_LIMITED";
    case "unavailable":
    case "firestore/unavailable":
      return "SPACE_READ_NETWORK_UNAVAILABLE";
    case "deadline-exceeded":
    case "firestore/deadline-exceeded":
      return "SPACE_READ_TIMEOUT";
    default:
      return "SPACE_READ_UNEXPECTED";
  }
}

function timed<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ timeout: true } | { value: T }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ timeout: true });
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ value });
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createSpaceDocumentReadPortWithTimeout(
  facade: SpaceReadFirebaseFacade,
  timeoutMs: number,
): SpaceDocumentReadPort {
  return {
    async load(request): Promise<SpaceDocumentReadResult> {
      const correlationId = request?.correlationId;
      const token = request?.token;
      if (
        typeof correlationId !== "string" ||
        !CORRELATION_ID.test(correlationId) ||
        !isValidSpaceToken(token)
      ) {
        return { ok: false, error: safeError("SPACE_READ_INVALID_REQUEST", "") };
      }
      try {
        const result = await timed(facade.readDocument(token), timeoutMs);
        if ("timeout" in result) {
          return { ok: false, error: safeError("SPACE_READ_TIMEOUT", correlationId) };
        }
        if (!result.value.exists) {
          return { ok: false, error: safeError("SPACE_READ_NOT_FOUND", correlationId) };
        }
        return { ok: true, value: { document: result.value.data, correlationId } };
      } catch (error) {
        return { ok: false, error: safeError(mapError(error), correlationId) };
      }
    },
  };
}

export function createSpaceDocumentReadPort(
  facade: SpaceReadFirebaseFacade,
): SpaceDocumentReadPort {
  return createSpaceDocumentReadPortWithTimeout(facade, SPACE_DOCUMENT_READ_TIMEOUT_MS);
}
