import { Badge, Button, Card, TextField } from "@denn/ui";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SpaceSceneV1 } from "@denn/spaces";
import {
  safeSpaceVersionedViewMessage,
  type SpaceGateController,
  type SpaceV2ReadyView,
} from "../space-v2/production-controller";

type SpaceGateSnapshot = ReturnType<SpaceGateController["getState"]>;

/** Kept from spec 061: a ready state with no injected child still says so, and shows nothing else. */
const pendingNotice = (
  <div role="status" aria-live="polite" data-testid="space-status">
    <p>시안 인증이 완료되었습니다.</p>
    <p>시안 화면 연결은 다음 안전 검증 단계에서 제공됩니다.</p>
  </div>
);

export function SpacePasswordGate({
  controller,
  renderReady,
  renderReadyV2,
}: {
  readonly controller: SpaceGateController;
  /** Injectable post-auth seam. Only the validated scene crosses this view boundary. */
  readonly renderReady?: (scene: SpaceSceneV1) => ReactNode;
  /**
   * Injectable V2 post-auth seam (spec 080). Only the verified plan and its drawable lookup cross
   * this boundary — never the document, the evidence, the bytes or the password.
   */
  readonly renderReadyV2?: (view: SpaceV2ReadyView) => ReactNode;
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

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      // No navigation, no query string: the password must never reach the URL.
      event.preventDefault();
      submit();
    },
    [submit],
  );

  const renderReadyBody = (ready: Extract<SpaceGateSnapshot, { status: "ready" }>): ReactNode => {
    if ("v2" in ready) {
      return renderReadyV2 === undefined ? pendingNotice : renderReadyV2(ready.v2);
    }
    return renderReady === undefined ? pendingNotice : renderReady(ready.value.scene);
  };

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
              // A real form: Enter in the password field submits it, exactly as a browser user
              // expects. `denn-stack` keeps the same 12px rhythm the two controls had as direct
              // children of the card stack, so the layout is unchanged.
              <form className="denn-stack" onSubmit={onSubmit} data-testid="space-password-form">
                <TextField
                  label="비밀번호"
                  type="password"
                  autoComplete="off"
                  value={password}
                  data-testid="space-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
                {/* type="submit" only — an onClick here would run the submit twice. */}
                <Button variant="primary" type="submit" data-testid="space-submit">
                  시안 보기
                </Button>
              </form>
            ) : null}

            {snapshot.status === "loading" ? (
              <p role="status" aria-live="polite" data-testid="space-status">
                시안을 확인하는 중입니다…
              </p>
            ) : null}
            {snapshot.status === "invalid-link" ? (
              <p role="alert" data-testid="space-status">
                {safeSpaceVersionedViewMessage("SPACE_VIEW_INVALID_LINK")}
              </p>
            ) : null}
            {snapshot.status === "error" ? (
              <p role="alert" data-testid="space-status">
                {safeSpaceVersionedViewMessage(snapshot.code)}
              </p>
            ) : null}
            {snapshot.status === "ready" ? renderReadyBody(snapshot) : null}
          </div>
        </Card>
      </div>
    </main>
  );
}
