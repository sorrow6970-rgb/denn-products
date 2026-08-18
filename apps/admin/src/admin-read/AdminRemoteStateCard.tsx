import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, TextField } from "@denn/ui";
import type { AdminRemoteController, AdminRemoteSnapshot } from "./controller";

// Operator remote-read card (spec 036 §6). It reads ONE fixed private object and reports whether
// that succeeded. It never saves, publishes, uploads or orders, it never reads automatically, and
// it never renders the catalog itself — the payload stays in memory and off the screen.

const MESSAGES = {
  unconfigured: "운영자 원격 읽기가 아직 활성화되지 않았습니다.",
  initializing: "로그인 상태를 확인하는 중입니다.",
  "signed-out": "운영자 로그인이 필요합니다.",
  "signing-in": "로그인하는 중입니다.",
  authenticated: "로그인되었습니다.",
  loading: "운영자 상태를 불러오는 중입니다.",
  ready: "운영자 상태를 불러왔습니다.",
  error: "요청을 완료하지 못했습니다.",
} as const;

/**
 * Fixed operator-facing text per safe error code. No raw SDK message, no email, no uid, no path —
 * the code is translated here and the original never reaches the screen or the console.
 */
const ERROR_TEXT: Record<string, string> = {
  INVALID_REQUEST: "요청이 올바르지 않습니다.",
  AUTH_NOT_READY: "로그인 상태 확인이 끝나지 않았습니다. 잠시 후 다시 시도하세요.",
  AUTH_REQUIRED: "운영자 로그인이 필요합니다.",
  ANONYMOUS_NOT_ALLOWED: "운영자 계정으로 로그인해야 합니다.",
  AUTH_PERSISTENCE_FAILED: "브라우저에 로그인 상태를 저장할 수 없어 중단했습니다.",
  INVALID_CREDENTIAL: "이메일 또는 비밀번호를 확인하세요.",
  AUTH_RATE_LIMITED: "시도가 많아 잠시 제한되었습니다. 잠시 후 다시 시도하세요.",
  NETWORK_UNAVAILABLE: "네트워크에 연결할 수 없습니다.",
  NETWORK_TIMEOUT: "시간 안에 응답이 오지 않았습니다.",
  ADMIN_STATE_NOT_FOUND: "운영자 상태 파일을 찾을 수 없습니다.",
  ADMIN_STATE_FORBIDDEN: "이 계정에는 접근 권한이 없습니다.",
  RESPONSE_TOO_LARGE: "파일이 허용 크기를 넘습니다.",
  INVALID_JSON: "파일 형식을 읽을 수 없습니다.",
  INVALID_CATALOG: "카탈로그 계약을 통과하지 못했습니다.",
  UNEXPECTED_ADMIN_READ_ERROR: "알 수 없는 오류가 발생했습니다.",
};

export interface AdminRemoteStateCardProps {
  readonly controller: AdminRemoteController;
  readonly mode?: "read" | "auth-only";
}

export function AdminRemoteStateCard({
  controller,
  mode = "read",
}: AdminRemoteStateCardProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<AdminRemoteSnapshot>(() => controller.getSnapshot());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef(password);
  passwordRef.current = password;

  useEffect(() => {
    const unsubscribe = controller.subscribe(setSnapshot);
    return () => {
      unsubscribe();
      // the password never outlives the card
      passwordRef.current = "";
    };
  }, [controller]);

  const onSignIn = useCallback(() => {
    const attemptPassword = password;
    setPassword(""); // cleared as the attempt starts, not after it returns
    void controller.signIn(email, attemptPassword);
  }, [controller, email, password]);

  const onLoad = useCallback(() => {
    void controller.load();
  }, [controller]);

  const onSignOut = useCallback(() => {
    setPassword("");
    void controller.signOut();
  }, [controller]);

  const { status, errorCode, canSignIn, canLoad } = snapshot;
  const message =
    status === "error" && errorCode !== null
      ? (ERROR_TEXT[errorCode] ?? MESSAGES.error)
      : MESSAGES[status];

  return (
    <Card>
      <div className="denn-stack">
        <h2>{mode === "auth-only" ? "운영자 로그인" : "운영자 원격 상태 읽기"}</h2>
        <p>
          {mode === "auth-only"
            ? "운영자 인증 상태를 확인합니다. 편집 기준은 아래 편집기에서 명시적으로 불러옵니다."
            : "비공개 운영자 상태를 한 번 읽어 계약을 통과하는지만 확인합니다. 저장·발행·업로드는 하지 않습니다."}
        </p>

        {status !== "unconfigured" && canSignIn ? (
          <>
            <TextField
              label="운영자 이메일"
              type="email"
              autoComplete="username"
              data-testid="admin-read-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="비밀번호"
              type="password"
              autoComplete="current-password"
              data-testid="admin-read-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="denn-row">
              <Button variant="primary" onClick={onSignIn} data-testid="admin-read-signin">
                로그인
              </Button>
            </div>
          </>
        ) : null}

        {canLoad ? (
          <div className="denn-row">
            {mode === "read" ? (
              <Button variant="primary" onClick={onLoad} data-testid="admin-read-load">
                운영자 상태 불러오기
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onSignOut} data-testid="admin-read-signout">
              로그아웃
            </Button>
          </div>
        ) : null}

        <div role="status" aria-live="polite" data-testid="admin-read-status">
          <p>{message}</p>
        </div>
      </div>
    </Card>
  );
}
