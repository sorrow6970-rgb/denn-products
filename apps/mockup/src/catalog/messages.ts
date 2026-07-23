import type { PublicCatalogErrorCode } from "@denn/firebase";

// Safe, user-facing Korean messages (spec 015 §8). NEVER include the raw error code, HTTP
// status, URL, or issue path. Retry availability is driven by `retryable`, not by the message.
const GENERIC = "카탈로그를 불러오지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.";

export function safeCatalogMessage(code: PublicCatalogErrorCode): string {
  switch (code) {
    case "NETWORK_TIMEOUT":
    case "NETWORK_UNAVAILABLE":
    case "PUBLIC_CATALOG_SERVER_ERROR":
    case "PUBLIC_CATALOG_RATE_LIMITED":
      return "카탈로그를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "PUBLIC_CATALOG_FORBIDDEN":
    case "PUBLIC_CATALOG_NOT_FOUND":
      return "카탈로그를 사용할 수 없습니다. 관리자에게 문의해 주세요.";
    case "RESPONSE_TOO_LARGE":
    case "INVALID_JSON":
    case "INVALID_CATALOG":
      return "카탈로그 데이터에 문제가 있습니다. 관리자에게 문의해 주세요.";
    default:
      return GENERIC;
  }
}
