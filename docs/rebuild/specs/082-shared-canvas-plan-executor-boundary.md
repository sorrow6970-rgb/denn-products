# 082 — 공유 Canvas render-plan executor 경계 추출

## 상태

`READY_FOR_CLAUDE / CONTRACT_READY / NON_UI / NO_LIVE_NETWORK`

선행 게이트:

- 스펙 081: `DONE / CODEX_PASSED / LOCAL_VERIFIED / NON_UI / NO_LIVE_NETWORK`
- Founder `LL-1=A` ~ `LL-6=A`
- 다음 실제 화면 단위는 admin Space V2 issue UI이며 UI/UX 구현은 Claude Code가 담당한다.

## 목표 (WHY)

admin 발급 UI가 고객 앱 내부 파일을 cross-app import하거나 Canvas 실행기를 복제하지 않도록, 현재
`apps/mockup/src/canvas`가 소유한 React 비의존·DOM 생성 비의존 render-plan executor와 그 타입을
`@denn/render`의 공유 공개 경계로 **동작 변화 없이** 옮긴다.

이번 단위는 화면을 만들지 않는다. 실제 admin draft editor, proof exporter, Firebase writer composition,
URL/clipboard는 후속 Claude Code UI 스펙에서만 연다.

## 설계 판단

- DENN의 확정 목표는 `@denn/render`가 framework-independent Canvas engine을 소유하는 것이다.
- 현재 executor는 React를 import하지 않고, canvas/context/drawable을 만들거나 fetch하지 않으며 모두
  주입받는다. 따라서 공유 패키지로 옮겨도 package 경계의 의미가 넓어지지 않는다.
- admin에서 고객 앱 파일을 직접 import하는 것은 앱 경계를 깨고, 같은 코드를 복사하는 것은 draw semantics
  drift를 만든다. 둘 다 허용하지 않는다.
- `design-taste-frontend`의 적용 대상은 landing/redesign이며 dense admin panel은 명시적으로 범위 밖이다.
  따라서 이 스펙에서 새 시각 시스템을 고르지 않고 기존 Modern Studio와 `@denn/ui`를 그대로 보존한다.

## 범위 (SCOPE)

### 허용 제품 파일

- 신규 `packages/render/src/canvas/types.ts`
- 신규 `packages/render/src/canvas/execute-preview-plan.ts`
- 필요 시 신규 `packages/render/src/canvas/index.ts`
- `packages/render/src/index.ts`
- `apps/mockup/src/canvas/types.ts`
- `apps/mockup/src/canvas/executePreviewPlan.ts`
- `apps/mockup/src/canvas/executePreviewPlan.test.ts`는 direct public export 또는 compatibility seam 검증에
  필요한 최소 import/assertion 변경만 허용
- `packages/ui/src/theme.css`는 shared non-UI source 이동으로 Tailwind utility drift가 **실제 재현될 때만**
  exact `@source not` 경로 조정 허용

### 허용 문서

- 이 스펙과 관련 spec 082 handoff
- spec 081 종료 상태 링크·문구
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

### 금지

- `apps/admin/**`와 실제 admin UI/UX/CSS/Canvas proof exporter
- 기존 render-plan builder 또는 명령 의미 변경
- `packages/render/src/plan/index.ts` 보호 파일
- package.json, lockfile, `pnpm-workspace.yaml`, 신규 package·외부 의존성·설치·다운로드
- Rules, Firebase/emulator config, actual Firebase/project/bucket/network/live/data/UID, deploy
- URL/clipboard, 운영 발급, publish, delete/orphan cleanup, C6, V1 migration
- 보호 대상 restore/checkout/stage/commit

## 구현 지시 (WHAT / HOW)

### 1. 구현의 단일 소스

현재 `apps/mockup/src/canvas/types.ts`의 공개 타입과
`apps/mockup/src/canvas/executePreviewPlan.ts`의 `executePreviewRenderPlan()` 구현을
`packages/render/src/canvas/**`로 옮긴다.

- 코드 의미, preflight 순서, 오류 코드, command index, save/restore 우선순위, getter 단일 읽기,
  rotation/text capability 조건을 변경하지 않는다.
- 동작을 단순화하거나 새 fallback을 추가하지 않는다.
- `@denn/render` 내부에서는 기존 plan 타입을 package-relative import한다.
- `packages/render/src/index.ts`에서 executor 함수와 타입을 명시적으로 export한다.
- 보호 파일 `packages/render/src/plan/index.ts`는 읽기만 하고 수정하지 않는다.

### 2. mockup compatibility 경계

기존 mockup 내부 import를 한 번에 대량 변경하지 않는다.

- `apps/mockup/src/canvas/types.ts`는 `@denn/render` 타입의 thin re-export만 남긴다.
- `apps/mockup/src/canvas/executePreviewPlan.ts`는 `@denn/render` 함수의 thin re-export만 남긴다.
- 두 shim에 executor 구현·오류 mapping·Canvas 동작을 복제하지 않는다.
- 기존 production caller와 unit test는 같은 이름으로 계속 컴파일·실행돼야 한다.
- 최소 한 테스트는 `@denn/render` public export가 실제 같은 함수/계약임을 직접 확인한다.

### 3. package 경계 불변식

공유 executor는 다음을 계속 지켜야 한다.

- React import 0.
- `document`, `window`, `HTMLCanvasElement` 생성, `getContext`, Image/ImageBitmap 생성, fetch, URL 해석 0.
- caller가 주입한 context와 이미 decode된 in-memory drawable만 사용.
- `imageRef`를 URL/path로 해석하지 않음.
- console/telemetry/raw exception/message/stack 노출 0.
- Canvas command 실행 전 전체 preflight, malformed/hostile/Proxy 입력 throw 0.
- 실패 시 기존 identity-free error vocabulary만 반환.

### 4. Tailwind와 번들

- 이 작업은 UI가 아니므로 visible CSS를 변경하지 않는다.
- source 이동 때문에 Tailwind가 `packages/render/src/canvas/**`의 식별자/주석을 utility 후보로 스캔해
  CSS hash가 바뀌는 것이 실측되면, `packages/ui/src/theme.css`에 그 exact non-UI 경로만 제외한다.
- 추측으로 exclusion을 추가하지 않는다. 원인 대조 빌드 근거를 DONE에 기록한다.
- mockup/admin entry와 CSS hash 변화가 있으면 어떤 module relocation 때문에 생겼는지 기록한다.
  의미 없는 CSS drift는 DONE이 아니다.

### 5. line ending과 파일 안전

- 신규 package 파일은 LF로 고정한다. 기존 exact `.gitattributes` 정책을 필요 없이 넓히지 않는다.
- 기존 보호 dirty 파일을 stage/restore/checkout하지 않는다.
- E2E가 spec-018 PNG를 다시 쓰더라도 stage/commit/restore하지 않고 보호 dirty 상태로 둔다.

## 검증 절차 (VERIFY)

1. 시작 전 `HEAD=origin`, ahead/behind `0/0`, 보호 dirty 목록을 기록한다.
2. 변경 경로가 위 허용 제품/문서 파일뿐인지 확인한다.
3. executor targeted unit:

   ```powershell
   .\node_modules\.bin\vitest.CMD run apps/mockup/src/canvas/executePreviewPlan.test.ts
   ```

4. render/mockup/admin typecheck와 `node scripts/check.mjs`를 실행한다.
5. 전체 Chromium E2E를 실행한다. 실제 network/live는 금지하며 기존 local fixture만 사용한다.
6. 기존 executor 테스트 전부가 이동 후 동일하게 PASS하고, public export direct 검증도 PASS해야 한다.
7. production mockup/admin entry와 CSS의 파일명·byte·SHA-256을 전후 비교한다. 차이는 숨기지 않는다.
8. `git diff --check`, forbidden diff, `git ls-files --eol` 신규 파일, 포트
   `4183/4184/4185/8080/9099/9199`, `test-results`/temp 잔류를 검사한다.
9. package/lockfile/Rules/firebase config diff 0을 명시한다.

## 완료 정의 (DONE)

- `@denn/render`가 executor의 유일한 구현 소유자다.
- mockup은 thin re-export를 통해 기존 동작을 유지하고 전체 unit/E2E가 통과한다.
- admin 앱, UI/CSS 의미, Firebase/network/live/deploy는 변경 0이다.
- 실제 admin issue UI가 구현됐다고 기록하지 않는다.
- 구현·검증·문서 기록을 일반 fast-forward commit/push하고 `READY_FOR_CODEX`에서 멈춘다.

## STOP

- 기존 executor 의미를 바꿔야 하거나 mockup 회귀를 shim으로 해결할 수 없음
- package manifest/lockfile 또는 신규 dependency가 필요함
- Tailwind drift 원인을 exact source scan으로 재현할 수 없음
- 실제 Firebase/network/live/deploy가 필요함
- 보호 파일 또는 허용 밖 파일 수정이 필요함

위 경우 commit/push하지 말고 근거와 필요한 결정만 기록한다.

## 진행도

전체 리빌드는 **84~87% 완료 / 13~16% 잔여**로 유지한다. 이 단위는 다음 admin UI의 구조적 선행
작업이며 실제 사용자 기능이 열리기 전에는 완료율을 올리지 않는다.

