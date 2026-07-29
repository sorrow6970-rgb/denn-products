# NEXT CLAUDE PROMPT

상태: `CORRECTION_REQUIRED`

# 스펙 026 보완 라운드 1 — React owner 생명주기와 기록 정정

기준 HEAD는 `449b027`이다. 다음 기능을 시작하지 말고 아래 범위만 보완한다.

## 먼저 지킬 Git 경계

현재 아래 두 파일은 Codex 독립 E2E가 재생성한 dirty 산출물이다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

두 파일을 restore, checkout, stage, commit하거나 Founder 승인으로 기록하지 않는다. 보완
커밋에는 아래 허용 파일만 포함한다. PNG가 dirty인 사실은 완료 보고에 그대로 기록한다.

## 보완 1 — 실제 hook owner 생명주기

허용 파일:

- `apps/mockup/src/canvas/useLocalImageBinding.ts`
- `apps/mockup/src/canvas/useLocalImageBinding.test.ts`
- `apps/mockup/src/e2e/canvas-fixture.tsx`
- `tests/e2e/canvas-surface.spec.ts`

현재 cleanup에서 `setController(...)`를 호출하는 구조를 재검토한다. 실제 React mount
환경에서 다음을 고정 sleep 없이 검증한다.

1. StrictMode mount → cleanup → remount
2. `useLocalImageBinding`을 소유한 컴포넌트 자체 unmount
3. unmount 시 active load, binding, blob URL 정리
4. 늦은 `onload`/`onerror`가 새 상태나 remount 상태를 오염하지 않음
5. state-update-after-unmount 관련 console warning/error 0
6. controller subscription과 URL revoke의 중복·누락 0

`renderToStaticMarkup`만으로 통과 처리하지 않는다. 기존 fixture에서
`PreviewCanvasSurface`만 unmount하는 동작을 hook owner unmount 증거로 사용하지 않는다.
결함이 확인되면 위 허용 파일 안에서 최소 수정한다. 고객 production 화면에는 mount하지
않는다.

## 보완 2 — 문서 사실관계 정정

허용 파일:

- `docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`
- `docs/handoff/2026-07-29-spec-026-local-image-binding-handoff.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- `docs/codex-claude-handoff/CURRENT.md`

다음 주장을 제거하고 실제 증거와 일치하게 정정한다.

- Founder가 현재 PNG 2개 복원을 승인했다는 주장
- checkout/restore가 승인됐다는 주장
- 실제 hook owner unmount가 이미 Chromium에서 검증됐다는 주장

검증한 항목만 PASS로 쓰고 나머지는 `NOT TESTED`로 기록한다.

## 검증 및 제출

- frozen install
- format, lint, typecheck
- unit
- build와 bundle 수치
- `test:e2e`, reporter 요약과 exit code
- `git diff --check`
- 포트 4183/4184
- OS temp `denn-e2e-*`
- 고객 dist E2E 전후 SHA-256 및 fixture 비노출

코드/test와 문서를 분리 commit하고 일반 fast-forward push한다. PNG는 커밋하지 않는다.
push 후 HEAD=origin, ahead/behind 0/0을 보고하되 working tree는 위 PNG 2개 때문에 dirty라고
정확히 기록한다. force, rebase, merge, reset, broad delete, network/live/Firebase/deploy는
금지한다.
