import type { SpaceViewErrorCode } from "./controller";

const MESSAGES: Record<SpaceViewErrorCode, string> = {
  SPACE_VIEW_INVALID_LINK: "시안 링크가 올바르지 않습니다.",
  SPACE_VIEW_NOT_FOUND: "시안을 찾을 수 없습니다.",
  SPACE_VIEW_LOAD_FAILED: "시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
  SPACE_VIEW_PASSWORD_REJECTED: "비밀번호가 올바르지 않습니다.",
  SPACE_VIEW_INVALID_CONTENT: "시안 내용을 안전하게 표시할 수 없습니다.",
};

export function safeSpaceViewMessage(code: SpaceViewErrorCode): string {
  return MESSAGES[code];
}
