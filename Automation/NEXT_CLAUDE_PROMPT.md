# NEXT CLAUDE PROMPT

상태: `READY_FOR_CLAUDE`

- completed_unit: `spec-081-space-v2-admin-frozen-issue-session` — **DONE / CODEX_PASSED / LOCAL_VERIFIED / NON_UI / NO_LIVE_NETWORK**
- active_unit: `spec-082-shared-canvas-plan-executor-boundary`
- 검수 기준: `HEAD=origin=df75655`, ahead/behind `0/0`
- next_transition: `CLAUDE_SPEC_082_IMPLEMENTATION`
- 전체 리빌드: **84~87% 완료 / 13~16% 잔여** (7개 roadmap 작업축 기반 관리 추정, 고정 spec 분모 없음)

## Claude Code에 그대로 전달할 실행 지시문

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md와
docs/rebuild/specs/082-shared-canvas-plan-executor-boundary.md를 읽고 스펙 082 범위만 구현·검증해.

현재 HEAD=origin=df75655, ahead/behind 0/0이다. 스펙 081은 Codex 독립 검수에서 targeted 215/215,
전체 check unit 2408/2408, build 2개, bundle/CSS exact hash, EOL/diff/port/temp gate를 통과해
DONE/CODEX_PASSED다.

스펙 082는 실제 UI가 아니다. 현재 apps/mockup/src/canvas의 React 비의존 Canvas render-plan executor와
그 타입을 동작 변화 없이 @denn/render의 단일 구현으로 옮기고, mockup 경로에는 thin re-export만 남겨.
cross-app import나 구현 복제는 금지한다. executor의 preflight, 오류 코드, commandIndex, getter 단일 읽기,
save/restore 우선순위, rotation/text capability, throw 0 계약을 바꾸지 마.

허용 제품 파일은 스펙 082에 열거된 packages/render/src/canvas/** 신규 파일,
packages/render/src/index.ts, mockup canvas의 types.ts/executePreviewPlan.ts 및 최소 test import/assertion이다.
packages/ui/src/theme.css는 source 이동으로 인한 Tailwind CSS drift를 실제 대조 빌드로 재현했을 때만 exact
non-UI @source exclusion 조정을 허용한다.

apps/admin/**, 실제 admin UI/UX/CSS/Canvas proof exporter, packages/render/src/plan/index.ts 보호 파일,
package.json/lockfile/pnpm-workspace.yaml, Rules/firebase config, 실제 Firebase/network/live/data/UID,
deploy, 운영 발급, URL/clipboard, publish/delete/orphan cleanup은 수정·실행하지 마. 신규 dependency,
설치·다운로드, 자동화도 금지한다.

targeted executor unit, render/mockup/admin typecheck, node scripts/check.mjs, 전체 local Chromium E2E,
production bundle/CSS 전후 byte+SHA-256, git diff --check, forbidden diff, 신규 EOL, 포트 6개와 temp 잔류를
검증해. E2E가 보호 PNG 두 개를 다시 써도 restore/stage/commit하지 마. 보호 대상과 기존 user dirty 파일은
그대로 둬.

구현·검증 결과를 spec 082 DONE, handoff, STATE/NEXT/CURRENT/live log에 실제 수치로 기록하고 코드와 문서를
분리한 일반 fast-forward commit/push 후 READY_FOR_CODEX에서 멈춰. 실제 admin UI 다음 스펙을 자동 시작하지 마.
```

## Codex 검수 근거

- 스펙 081 라운드 2 변경은 `issue-session.ts`와 `issue-session.test.ts` 두 파일뿐이다.
- 오류 8종의 canonical category/retryable 조합과 prototype-chain 거부가 table-driven test로 고정됐다.
- 독립 실측: targeted **215/215**, 전체 **2408/2408**, bundle/CSS 4개 SHA-256 exact, 포트 잔류 0.
- Chromium E2E와 emulator는 스펙 081에서 NOT RUN이다. 실제 Firebase/live/deploy는 계속 0이다.

## 다음 구조의 이유

admin issue UI가 현재 mockup 앱 내부 Canvas 파일을 직접 import하면 앱 경계를 깨고, executor를 복사하면
동일 render plan이 앱마다 다르게 그려질 수 있다. 먼저 공유 executor 경계를 만든 뒤 Claude Code가 다음
UI 스펙에서 admin draft/proof composition을 구현한다.
