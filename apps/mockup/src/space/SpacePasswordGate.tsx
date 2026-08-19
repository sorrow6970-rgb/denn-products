import { Badge, Button, Card, TextField } from "@denn/ui";
import type { SpaceSceneV1 } from "@denn/spaces";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SpaceLinkOpenController } from "./controller";
import { safeSpaceViewMessage } from "./messages";

export function SpacePasswordGate({
  controller,
  renderReady,
}: {
  readonly controller: SpaceLinkOpenController;
  /** Injectable post-auth seam. Only the validated scene crosses this view boundary. */
  readonly renderReady?: (scene: SpaceSceneV1) => ReactNode;
}): React.JSX.Element {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const [password, setPassword] = useState("");
  const passwordRef = useRef(password);
  passwordRef.current = password;

  useEffect(() => {
    controller.attach();
    return () => {
      passwordRef.current = "";
      controller.detach();
    };
  }, [controller]);

  const submit = useCallback(() => {
    const attempt = password;
    setPassword("");
    controller.submitPassword(attempt);
  }, [controller, password]);

  const awaiting = snapshot.status === "awaiting-password";
  const retryableError = snapshot.status === "error" && snapshot.retryable;
  const canSubmit = awaiting || retryableError;

  return (
    <main className="denn-shell" data-testid="space-view-mode">
      <div className="denn-shell__inner">
        <Card>
          <div className="denn-stack">
            <Badge>비공개 시안 · 열람 전용</Badge>
            <h1>내 공간 시안 확인</h1>
            <p>담당자에게 전달받은 비밀번호를 입력하세요.</p>

            {canSubmit ? (
              <>
                <TextField
                  label="비밀번호"
                  type="password"
                  autoComplete="off"
                  value={password}
                  data-testid="space-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button variant="primary" onClick={submit} data-testid="space-submit">
                  시안 보기
                </Button>
              </>
            ) : null}

            {snapshot.status === "loading" ? (
              <p role="status" aria-live="polite" data-testid="space-status">
                시안을 확인하는 중입니다…
              </p>
            ) : null}
            {snapshot.status === "invalid-link" ? (
              <p role="alert" data-testid="space-status">
                {safeSpaceViewMessage("SPACE_VIEW_INVALID_LINK")}
              </p>
            ) : null}
            {snapshot.status === "error" ? (
              <p role="alert" data-testid="space-status">
                {safeSpaceViewMessage(snapshot.code)}
              </p>
            ) : null}
            {snapshot.status === "ready" && renderReady !== undefined
              ? renderReady(snapshot.value.scene)
              : null}
            {snapshot.status === "ready" && renderReady === undefined ? (
              <div role="status" aria-live="polite" data-testid="space-status">
                <p>시안 인증이 완료되었습니다.</p>
                <p>시안 화면 연결은 다음 안전 검증 단계에서 제공됩니다.</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
