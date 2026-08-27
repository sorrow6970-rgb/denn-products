# 082 — 공유 Canvas render-plan executor 경계 추출

## 상태

`READY_FOR_CODEX / CORRECTION ROUND 6 DONE (Founder NN-5=A exception) / NON_UI / NO_LIVE_NETWORK`

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

### DONE (Claude) — 2026-08-27

기준 `HEAD=origin=aa7e048`, ahead/behind 0/0. 계약 문서 commit `aa7e048`, 구현 commit `307521f`.
시작 시 보호 dirty 목록: `docs/rebuild/design/README.md` · `docs/rebuild/results/spec-018/*.png` 2개 ·
`packages/render/src/plan/index.ts` · `pnpm-workspace.yaml` · untracked `AGENTS.md` ·
`docs/rebuild/design/taste-v2/` · `docs/rebuild/specs/038-page-design-prototype.md`. 전부 읽기만 했다.

**§SCOPE 대비 실제 변경 (7개, 허용 목록 안)**

| 파일 | 상태 |
|---|---|
| `packages/render/src/canvas/types.ts` | 신규 (이동본) |
| `packages/render/src/canvas/execute-preview-plan.ts` | 신규 (이동본) |
| `packages/render/src/canvas/index.ts` | 신규 (공개 표면) |
| `packages/render/src/index.ts` | `export * from "./canvas"` 추가 |
| `apps/mockup/src/canvas/types.ts` | thin re-export로 축소 |
| `apps/mockup/src/canvas/executePreviewPlan.ts` | thin re-export로 축소 |
| `apps/mockup/src/canvas/executePreviewPlan.test.ts` | 최소 import/assertion 변경 |
| `packages/ui/src/theme.css` | **손대지 않음** — 아래 §4 근거 |

**§1 구현의 단일 소스.** 두 파일을 **그대로** 옮겼다. preflight 순서, 오류 코드 vocabulary,
command index, 단일 읽기 normalized snapshot, save/restore 우선순위, rotation/text capability 조건,
throw 0 계약을 하나도 바꾸지 않았고 단순화나 새 fallback도 넣지 않았다. `@denn/render` 내부에서는
plan 타입을 package-relative(`../plan`)로 import하므로 barrel 자기참조가 없다.
`packages/render/src/index.ts`에서 executor 함수와 7개 타입을 명시 export한다. 보호 파일
`packages/render/src/plan/index.ts`는 **읽기만** 했다(작업 전부터 user dirty 상태였고 그대로 뒀다).

**§2 mockup compatibility 경계.** `apps/mockup/src/canvas/types.ts`와 `executePreviewPlan.ts`는
선언 0·구현 0의 thin re-export만 남겼다. executor 본문·오류 mapping·Canvas 호출은 복제하지 않았다.
기존 production caller와 unit test는 같은 이름으로 그대로 컴파일·실행된다(대량 import 변경 0).
테스트에는 **직접 public export 검증**을 추가했다 — `executePreviewRenderPlan`이 `@denn/render`
export와 **같은 참조**(`toBe`)임을 확인하고, shared export로 실제 plan을 실행해 같은 결과가 나오는
것까지 본다. 동등성이 아니라 **identity**를 보는 이유는, 사본이면 참조가 다르고 사본이야말로 이
경계가 막으려는 것이기 때문이다.

**§3 package 경계 불변식.** 소스 스캔 테스트는 이제 **shared 구현**을 읽는다 — re-export를 스캔하면
아무것도 증명하지 못하므로 경로만 최소 변경했다. 그 스캔이 주석 제거 후
`fetch(` · `new Image` · `ImageBitmap` · `createImageBitmap` · `getContext` · `querySelector` ·
`document` · `window` · `setTransform` · `getImageData` · `toBlob` · `toDataURL` · `crossOrigin` ·
`getDownloadURL` · `firebase` · `react` · `console.` · `new URL` · `devicePixelRatio` ·
`ResizeObserver` · `: any` 가 **0건**임을 계속 고정한다. 주입된 context와 이미 decode된 in-memory
drawable만 쓰고, `imageRef`를 URL/path로 해석하지 않으며, malformed/hostile/Proxy 입력에 throw 0,
실패는 기존 identity-free vocabulary만 반환한다 — 이동 전과 동일한 87건 테스트가 증명한다.

**§4 Tailwind와 번들 — drift 0, 그래서 exclusion을 추가하지 않았다.**
스펙은 drift가 **실측될 때만** `theme.css`에 exact 경로 제외를 허용한다. 실측 결과 **drift가 전혀
없다** — mockup CSS `index-BjqjBda8.css`(19,381 B / `A68DCF41…BD12`)와 admin CSS
`index-DJ_z3tK1.css`(9,146 B / `6A680479…29FD`) 모두 **SHA-256까지 이동 전과 동일**하다. 따라서
추측으로 exclusion을 넣지 않고 `packages/ui/src/theme.css`를 손대지 않았다.

bundle 변화는 **mockup entry 하나뿐**이다.

| 산출물 | 이동 전 | 이동 후 |
|---|---|---|
| mockup entry | `index-BUT7Bmak.js` / `340,604 B` / `1AA1BD0B…B4F1` | `index-CRHkWFoL.js` / `340,609 B` / `5B569772F0218CC169EB7CB83EC92AC99B68D33D06651C299D757D5A912018B9` |
| mockup CSS | `index-BjqjBda8.css` / `19,381 B` | **동일** |
| mockup chunk 4개 | `CcgHfJ6W`·`CkzMhWpf`·`DtyxGWvl`·`NxXYEvgL` | **전부 byte-identical** |
| admin entry·CSS·chunk 6개 | — | **전부 byte-identical** |

**+5 bytes의 원인을 통제 실험으로 특정했다.** 변경 4파일을 `HEAD` 버전으로 되돌려 빌드하니
`index-BUT7Bmak.js`가 그대로 재현됐고, 그 산출물과 이동 후 산출물을 문자 단위로 대조했다. 첫 차이는
offset **2328**의 React vendor 코드이고 내용은 minified 식별자 재배치뿐이다
(`function S(){}`→`function te(){}`, `var C={H:null…}`→`var S={H:null…}`, `te`→`ne`, `ne`→`re`,
`re`→`ie`). executor가 앱 module graph에서 package graph로 옮겨가며 rolldown의 이름 할당이 밀린
것이고, **추가 코드도 중복 사본도 없다** — +5 bytes 안에 executor 사본(약 27 kB)이 들어갈 수 없다.
어떤 module relocation 때문인지도 이것으로 확정된다.

**§5 line ending과 파일 안전.** 신규 package 파일 3개는 LF로 커밋했다(`git ls-files --eol` →
`i/lf w/lf`). 기존 exact `.gitattributes` 정책은 **넓히지 않았다**(§5의 "필요 없이 넓히지 않는다"와
`.gitattributes`가 이 스펙의 허용 파일이 아니라는 두 이유). 남는 위험은 §후속 결정에 적었다.
전체 E2E가 다시 쓴 보호 spec-018 PNG 2개는 **stage/commit/restore하지 않고 dirty 상태 그대로** 뒀고,
spec-063·spec-080 결과 PNG는 재생성 후 byte-identical이라 diff 0이다.

**§VERIFY 실측**

| 게이트 | 결과 |
|---|---|
| targeted executor unit | **87/87 PASS** (이동 전 86 + public export identity 1) |
| render / mockup / admin typecheck | PASS |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**, build 2개 |
| 전체 Chromium E2E (`node scripts/e2e-run.mjs`) | **158 passed / 1 failed** — 아래 §후속 결정 |
| production bundle/CSS 전후 byte+SHA-256 | 위 표대로. CSS 2개·admin 전체·mockup chunk 4개 무변경, mockup entry만 +5 B |
| `git diff --check` | PASS |
| forbidden diff | **0** — `package.json`·lockfile·`pnpm-workspace.yaml`·Rules·firebase config·`apps/admin/**`·`packages/render/src/plan/index.ts` 변경 0 |
| 신규 파일 EOL | `i/lf w/lf` 3/3 |
| 포트 4183/4184/4185/8080/9099/9199 | 실행 전후 잔류 **0**, 강제 종료 0 |
| `test-results`/temp 잔류 | 0 (E2E staging은 OS temp `mkdtemp`에 생성·삭제, 저장소 안 기록 0) |

**§후속 결정이 필요한 사항 — 전체 E2E 1건 실패 (스펙 082 원인 아님).**

`tests/e2e/admin-auth-read.spec.ts:82` "the customer bundle contains only the approved lazy space
Firestore boundary"가 마커 `getAuth`로 실패한다. **스펙 082가 원인이 아님을 통제 실험으로
확인했다** — 변경 4파일을 `HEAD` 버전으로 되돌리고 같은 spec만 재실행해도 **동일하게 실패**한다.

- 문자열은 lazily-imported firebase/storage vendor chunk `index.esm-DtyxGWvl.js`에 있고, 이 파일은
  이동 전후 SHA-256이 동일하다(`F4CA8DEA…C0AF`).
- 3건 모두 `_getAuthToken` — **Storage SDK 내부 메서드**이며 Auth 제품 API `getAuth()` 호출이
  아니다. `getAuth`가 부분 문자열로 걸린 **false positive**다.
- 이 chunk는 스펙 079/080(Founder MM-1=A)이 고객 앱에 연결한 것이고, 스펙 080·081 모두 전체
  Chromium suite가 **NOT RUN**이었다. 스펙 082가 080 이후 처음으로 전체 suite를 돌리며 잠복 상태를
  드러냈다. 해당 test 주석도 이미 "generic Firebase constants는 제품을 import하지 않아도 나타난다"고
  적고 있다.
- 고치려면 `tests/e2e/admin-auth-read.spec.ts`(마커를 제품 API 호출로 정밀화) 또는 고객 앱의
  storage 연결을 손대야 하는데 **둘 다 스펙 082 허용 파일이 아니다**. 그래서 고치지 않고 기록만
  한다. 필요한 결정: ① 마커 정밀화(079/080 승인과 정합) ② 고객 앱 storage 연결 재검토(079/080과
  충돌) ③ 그 수정을 어느 단위에 넣을지.
- **따라서 "전체 E2E PASS"라고 기록하지 않는다.** 스펙 082가 소유한 범위(executor 이동, mockup 회귀,
  bundle/CSS, typecheck, unit)는 전부 통과했고, 실패 1건은 스펙 082 밖의 기존 결함이다.

**보고 — 하지 않은 것.** 신규 package 파일 3개를 `.gitattributes`에 `text eol=lf`로 고정하지 않았다.
스펙 082 허용 파일이 아니고 §5가 정책 확대를 금지하기 때문이다. `core.autocrlf=true` 환경에서
재-checkout되면 스펙 080 라운드 2와 같은 format 단계 실패가 재발할 수 있으므로, 저장소 전체
line-ending 정책 결정 대상으로 남겨 보고한다.

**§DONE 대비.** `@denn/render`가 executor의 유일한 구현 소유자 ✅ · mockup은 thin re-export로 기존
동작 유지, 전체 unit 통과 ✅ (전체 E2E는 위 1건 예외) · admin 앱·UI/CSS 의미·Firebase/network/live/
deploy 변경 **0** ✅ · 실제 admin issue UI가 구현됐다고 기록하지 않음 ✅ ·
일반 fast-forward commit/push 후 `READY_FOR_CODEX` 정지 ✅.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 다음 admin UI의 구조적 선행
작업이며 실제 사용자 기능은 아직 열리지 않았다.

### CODEX REVIEW — 2026-08-27

판정은 **FOUNDER_DECISION_REQUIRED**다. 구현 범위 자체의 회귀는 발견하지 않았다. 독립 targeted
executor **87/87**, 전체 check **2409/2409**, build 2개, diff/port gate는 PASS했다. 전체 Chromium은
Claude 기록과 동일한 **158 passed / 1 failed**로 재현됐다.

실패는 `tests/e2e/admin-auth-read.spec.ts:82`의 raw substring `getAuth`가 Firebase Storage vendor
chunk의 `_getAuthToken` 세 곳과 일치한 오탐이다. 이는 Auth 제품 API `getAuth()` 호출 증거가 아니고
스펙 082 제품 변경 원인도 아니지만, 전체 E2E PASS라고 승인할 수는 없다. 테스트 파일은 원래 스펙 082
허용 범위 밖이므로 Founder NN-1 범위 결정 전 자동 보완하지 않는다.

별도 결함으로, 허용 파일 `packages/render/src/index.ts`의 `RENDER_NOT_IMPLEMENTED` 문자열은 같은 파일이
이제 실제 Canvas executor를 export함에도 “Canvas executor는 이후 구현”이라고 말한다. 보완 시 generic
`RenderInput -> RenderOutput` facade의 실제 미구현만 표현해야 한다.

Founder NN-1 선택지는 A(권장: 정확한 두 파일 보완), B(E2E 예외), C(고객 Storage 연결 재검토)다.
결정 전 correction round는 시작하지 않으며 실제 admin UI와 다음 스펙도 열지 않는다.

### FOUNDER NN-1 — 2026-08-27

Founder가 **NN-1=A**를 승인했다. 보완 라운드 1은
`tests/e2e/admin-auth-read.spec.ts`와 `packages/render/src/index.ts` 두 제품 파일만 추가 허용한다.
test marker 정밀화와 stale constant 정정 외 제품 동작 변경은 승인하지 않는다. 상태는
`READY_FOR_CLAUDE`, 다음 transition은 `CLAUDE_CORRECTION`이다.

### DONE (Claude) — 보완 라운드 1 (2026-08-27)

기준 `HEAD=origin=ecc9720`, ahead/behind 0/0. Codex 검수·NN-1 문서 commit `ecc9720`, 보완 commit
`8d4458d`. Founder **NN-1=A**가 허용한 **정확히 두 파일만** 고쳤고, 스펙 082 본 구현(executor 이동)은
하나도 건드리지 않았다.

**보완 1 — `tests/e2e/admin-auth-read.spec.ts`의 `getAuth` 마커 정밀화.**

`getAuth`를 raw substring으로 보던 것을 **전체 식별자**로 본다. 고객 앱이 스펙 079/080에서 승인된
lazy `firebase/storage` import를 갖게 되면서 Storage SDK 내부 `_getAuthToken`이
`bundle.includes("getAuth")`에 걸렸는데, 이는 Auth 제품 API가 도달 가능하다는 증거가 아니라 **오탐**이다.
앞뒤 식별자 경계를 요구하면 실제 `getAuth(` 호출이나 export 이름 `getAuth`는 계속 차단되고
`_getAuthToken` · `getAuthToken`만 빠진다.

실제 번들로 측정해 확인했다:

| 대상 | raw substring | 식별자 경계 |
|---|---|---|
| 고객 staging 자산 전체(fixture 포함, js 11개) | **3** (전부 `_getAuthToken`) | **0** ✅ |
| admin 번들(실제로 Auth를 사용) | 9 | **6** — 실제 사용은 여전히 전부 걸린다 ✅ |

테스트를 삭제하지 않았고 경계를 약화하지도 않았다. **오탐만 줄였다.**

**보완 2 — `packages/render/src/index.ts`의 stale constant.**

`RENDER_NOT_IMPLEMENTED`가 "Canvas executor는 이후 spec에서 구현"이라고 말하는데 같은 파일이 이제 그
executor를 export하므로 자기모순이었다. 실제로 남아 있는 미구현, 즉 **generic
`RenderInput -> RenderOutput` facade**만 가리키도록 고쳤고 geometry·render plan·Canvas executor는
완료됐다는 사실을 주석으로 명시했다. 이 상수는 저장소 어디에서도 읽지 않아(`grep` 0건) 다른 영향이 없다.

**보완 라운드 1 게이트 실측**

| 게이트 | 결과 |
|---|---|
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**, build 2개 |
| build 산출물 14개 byte+SHA-256 | **전부 보완 전과 동일** — 상수는 tree-shaking으로 번들에 없다 |
| `git diff --check` | PASS |
| exact diff | `tests/e2e/admin-auth-read.spec.ts` · `packages/render/src/index.ts` **두 개뿐** |
| EOL | 두 파일 `i/lf w/lf` |
| 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp | 잔류 **0** |
| 전체 Chromium E2E | **158 passed / 1 failed** — 아래 |

**전체 E2E는 159/159가 되지 않았다. 이유를 정확히 기록한다.**

`getAuth` 단언은 이제 **통과한다**(위 표에서 식별자 경계 매치 0). 그런데 같은 테스트가 이번엔
`uploadBytes`에서 실패한다 — 마커 검사는 `for` 루프라 **첫 실패에서 멈추므로**, `getAuth`가 앞에 있던
동안 뒤쪽 마커들의 상태가 가려져 있었다.

staging 자산 전체를 그대로 스캔해 **모든 마커 판정을 한 번에** 확인했다.

| 마커 | 판정 | 실제 정체 |
|---|---|---|
| `admin-read` · `ADMIN_STATE_OBJECT_PATH` · `admin/state.json` · `onAuthStateChanged` · `signInWithEmailAndPassword` | **ok** | 고객 번들에 없음 |
| `uploadBytes` (4) · `uploadBytesResumable` (2) · `uploadString` (2) · `getDownloadURL` (2) · `listAll` (1) | **FAIL** | 전부 lazy `firebase/storage` vendor chunk 안 — `_throwIfRoot("uploadBytes")` 같은 **오류 라벨 문자열**과 chunk의 **export 이름 맵**(`Jt as uploadBytes`, `en as listAll`, …). 고객 호출부가 아니다 |
| `getStorage` (3) | **FAIL** | 2건은 vendor chunk export 맵, **1건은 고객 entry의 `a.getStorage(s)`** — 스펙 079/MM-1=A가 **승인한 고객 자신의 호출** |
| `getAuth` (식별자 경계) | **ok** | 이번 보완으로 해결 |

즉 남은 6건은 두 성격이 섞여 있다.

1. **같은 계열의 오탐 5건** — vendor chunk의 dead export 이름/오류 라벨을 고객 호출로 오인한다.
2. **테스트와 승인된 설계의 정면 충돌 1건** — `getStorage`는 스펙 079(MM-1=A)가 승인한 고객 코드의
   실제 호출인데 마커 목록이 여전히 금지한다. 스캔을 고객 자기 코드로 좁혀도 이 한 건은 계속 실패한다.

NN-1=A는 `getAuth`/`_getAuthToken` 오탐 정밀화와 stale constant 정정만 승인했고 **"테스트를 삭제하거나
해당 경계를 약화하지 마"** 라고 명시했다. upload/list/download 경계를 손대는 것은 "고객 번들이
Storage 쓰기 API의 dead vendor 코드를 포함해도 되는가"라는 제품·보안 경계 판단이고, `getStorage`는
079/080 결정과의 충돌 해소다 — 둘 다 이번 라운드가 승인받은 범위가 아니다. 그래서 **고치지 않고
기록만 했고, "전체 E2E PASS"라고 기록하지 않는다.**

참고 사실(판단이 아니라 관측): 이 dead 코드가 있어도 익명 고객의 쓰기는 `storage.rules`가 서버에서
막는다(`rebuild-space-assets` create는 approved UID 전용). 따라서 이번 실패는 인증 우회가 아니라
**번들 위생 + 마커 정확도** 문제로 보이지만, 결론은 Founder/Codex가 정한다.

**필요한 결정.** ① vendor chunk의 dead export 이름을 고객 호출로 세지 않도록 마커 5건을 정밀화할지
(예: 고객 entry chunk만 스캔, 또는 호출부 패턴으로 검사) ② `getStorage`를 079/080 승인에 맞춰 허용
목록으로 옮길지 ③ 그 수정을 어느 단위에 넣을지.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 마커 정밀화와 문구 정정이며 새
제품 능력이 아니다.

### CODEX REVIEW — 보완 라운드 1 (2026-08-27)

`HEAD=origin=3600198`, ahead/behind 0/0에서 독립 재검증했다. 두 파일 diff는 NN-1=A 범위에 정확히
맞고, `getAuth` 식별자 검사는 실제 Auth 이름을 계속 막으면서 `_getAuthToken`만 제외한다. stale
constant도 실제 generic facade 미구현만 말한다. 전체 check **2409/2409 PASS**다.

전체 Chromium은 **158/159**로 동일 재현했으며 실패는 `uploadBytes`다. 스펙 079/080이 승인한 lazy
Storage vendor chunk는 사용하지 않는 write/list/download export 이름과 오류 라벨도 포함한다. 반면
`getStorage`는 read-only proof adapter의 실제 승인 호출이다. 따라서 “고객 번들 전체에 Storage API
문자열 0”이라는 스펙 036-era 검사는 현재 승인 구조와 양립하지 않는다.

제품 회귀로 판정하지 않지만 full E2E PASS도 아니다. test contract 변경은 NN-1 범위를 넘으므로 Founder
NN-2 선택을 기다린다: A(권장: app-owned read-only call surface 검사), B(vendor symbol 제거 제품 재설계),
C(E2E 예외). 결정 전 correction round 2와 다음 UI 스펙은 시작하지 않는다.

### FOUNDER NN-2 — 2026-08-27

Founder가 **NN-2=A**를 승인했다. 보완 라운드 2는
`tests/e2e/admin-auth-read.spec.ts` 한 제품 파일만 추가 수정한다. 승인된 read-only Storage 연결과
제품 코드는 유지하고, app-owned production 호출 표면의 allowlist와 write/update/delete/list/download
금지를 검사하도록 test contract만 정정한다. 상태 `READY_FOR_CLAUDE`, next `CLAUDE_CORRECTION`이다.

### DONE (Claude) — 보완 라운드 2 (2026-08-27)

기준 `HEAD=origin=60507b3`, ahead/behind 0/0. Codex 재검수·NN-2 문서 commit `60507b3`, 보완 commit
`65c5b46`. Founder **NN-2=A**가 허용한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만
고쳤다. 제품 코드는 한 줄도 바꾸지 않았다.

**전체 Chromium E2E는 이제 160 passed / 0 failed다.** (기존 159 + 이번에 추가한 call-surface 테스트 1.)

**결함 — 오래된 검사가 결정할 수 없는 것을 물었다.**

`bundle.includes("uploadBytes")`는 번들된 Firebase 제품이 **모듈 전체를 싣는다**는 사실 때문에
"이 앱이 쓰기를 하는가"가 아니라 "Storage SDK가 존재하는가"를 측정하고 있었다. 실제로 그 이름들은
vendor chunk의 **export 맵**(`Jt as uploadBytes`, `en as listAll` …)과 SDK 내부 **오류 라벨**
(`_throwIfRoot("uploadBytes")`)에 있을 뿐 고객 호출부가 아니다. 게다가 같은 목록이 `getStorage`도
금지했는데, 그건 스펙 079(MM-1=A)가 **승인한 바로 그 호출**이라 079 이후에는 이 검사가 통과할 수
없는 상태였다.

**보완 — 결정 가능한 곳에서 경계를 검사한다.**

- 번들 전체 substring 목록에서 Storage 이름 6개를 제거했다. 남긴 것은 vendor가 만들지 않는 app-level
  문자열뿐이다 — `admin-read` · `ADMIN_STATE_OBJECT_PATH` · `admin/state.json` ·
  `onAuthStateChanged` · `signInWithEmailAndPassword`. 라운드 1의 `getAuth` whole-identifier 검사,
  positive marker(`denn-space-viewer`/`getFirestore`/`getDoc`), default route external request 0 검사는
  **그대로 유지**했다.
- 신규 테스트 `the customer app's own Storage call surface stays read-only`가 고객의 **자기 소유 production
  source**를 검사한다 — `apps/mockup/src`(unit test와 `e2e/` 제외) + 고객이 실제로 import하는 유일한
  `@denn/firebase` subpath인 `packages/firebase/src/space-read`(test 제외), 총 58개 파일. 주석을 제거한
  뒤:
  1. `@denn/firebase/space-write` · `admin-read` · `admin-write` **import 0** — 이 단언이 package 절반을
     `space-read`로 한정한 근거다. 고객이 write/admin subpath에 손대면 **이 단언이 먼저 깨진다.**
  2. `uploadBytes` · `uploadBytesResumable` · `uploadString` · `updateMetadata` · `deleteObject` ·
     `list` · `listAll` · `getDownloadURL` · `getBlob` · `getStream` 의 **호출**(`\b이름\s*\(`) **0**.
  3. `getStorage` · `ref` · `getMetadata` · `getBytes` 호출이 **실제로 존재**. 이게 없으면 Storage
     호출이 스캔 밖으로 옮겨가도 테스트가 계속 통과해버린다.

**이 검사가 실제로 잡는다는 증거(측정).**

| 확인 | 결과 |
|---|---|
| 같은 검사를 **admin write surface**(`apps/admin/src` + `space-write`)에 겨누면 | `uploadBytes` **FAIL 1** — 실제 쓰기를 잡는다 ✅ |
| Storage vendor chunk `index.esm-DtyxGWvl.js`의 `.이름(` 호출 형태 | **0** — export 맵·오류 라벨은 호출로 세지 않는다 ✅ |
| 고객 app chunk(`index-*.js`, `SpacePostAuthFrameView-*.js`)의 `.이름(` | 허용 4종만(`getStorage` 1, `ref` 2, `getMetadata` 1, `getBytes` 1, `connectStorageEmulator` 1), 금지 **0** ✅ |
| 고객 production source 58파일 | 금지 10종 **0**, 허용 4종 **전부 존재**, 금지 subpath import **0** ✅ |

번들 문자열이 아니라 **호출 형태**를 보기 때문에 vendor export 맵이 호출부로 위장할 수 없고, source를
보기 때문에 bundler chunk 분할 방식에 의존하지 않는다.

**보완 라운드 2 게이트 실측**

| 게이트 | 결과 |
|---|---|
| targeted `admin-auth-read.spec.ts` Chromium | **4/4 PASS** |
| **전체 Chromium E2E** | **160 passed / 0 failed** |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**, build 2개 |
| build 산출물 14개 byte+SHA-256 | **전부 보완 전과 동일** — 제품 코드 무변경 |
| `git diff --check` | PASS |
| exact diff | `tests/e2e/admin-auth-read.spec.ts` **한 파일뿐** |
| EOL | `i/lf w/lf` |
| 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp | 잔류 **0** |

**약화하지 않았음.** 테스트를 삭제하지 않았고 E2E 예외로 처리하지도 않았다. Storage 쓰기·열거·다운로드
경계는 **더 강해졌다** — 예전에는 vendor 문자열 유무만 봤지만 이제 실제 호출과 import 경계를 본다.
Auth·admin private path·external request 0 검사는 그대로다. 스펙 079/080의 read-only Storage 승인은
보존했고 제품 코드는 건드리지 않았다.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 검증 정확도 보완이며 새 제품
능력이 아니다.

### CODEX REVIEW — 보완 라운드 2 (2026-08-27)

독립 check **2409/2409**와 전체 Chromium **160/160**은 재현했다. 하지만 source guard가 forbidden
API의 direct call spelling(`name(`)만 막아 alias import/property extraction/bracket access를 놓친다.
실측 합성 입력 세 개 모두 detector 결과 false였다. 또한 test title과 상단 설명은 승인된 Storage read가
존재함에도 Firestore-only/SDK trace 0이라고 적는다.

동일 test 파일 안에서 reference-level forbidden detector, import allowlist, exact proof adapter positive
calls, stale prose를 보완하는 correction round 3/3을 요구한다. 제품 코드·adapter·승인된 read-only 경계는
변경하지 않는다.

### DONE (Claude) — 보완 라운드 3 (2026-08-27)

기준 `HEAD=origin=298c224`, ahead/behind 0/0. Codex 재검수 문서 commit `298c224`, 보완 commit
`68bd25c`. 허용된 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드와
승인된 read-only Storage 연결은 한 줄도 바꾸지 않았다.

**전체 Chromium E2E는 161 passed / 0 failed다**(라운드 2의 160 + 이번 detector self-check 1).

**결함 — guard가 별칭·property extraction을 놓쳤다.**

라운드 2의 `\bname\s*\(` 검사는 **직접 호출만** 잡았다. 같은 API에 도달하는 다음 세 경로가 그대로
통과했다 — Codex 지적이 맞다.

| 우회 경로 | 라운드 2 | 라운드 3 |
|---|---|---|
| `import { uploadBytes as u } from "firebase/storage"; u()` | 통과 | **차단** |
| `const u = storage.uploadBytes; u()` | 통과 | **차단** |
| `storage["uploadBytes"]` | 통과 | **차단** |

**보완 — 호출이 아니라 reference 자체를 금지한다.**

주석 제거된 app-owned production source에서 금지 10종
(`uploadBytes`·`uploadBytesResumable`·`uploadString`·`updateMetadata`·`deleteObject`·`list`·
`listAll`·`getDownloadURL`·`getBlob`·`getStream`)을 **세 가지 형태 전부**로 금지한다.

1. bare whole identifier `\bname\b` — alias import의 specifier까지 잡는다
2. property `\.\s*name\b` — `storage.uploadBytes`와 `.uploadBytes(` 모두
3. bracket `\[\s*["'\`]name["'\`]\s*\]` — `storage["uploadBytes"]`

**`list` 예외와 그 근거.** `list`는 앱 코드에 일반 영어로도 등장한다(지역 변수 `list`,
`data-testid="template-list"`). 실측으로 이 세 곳이 전부 무해함을 확인했고, 그래서 `list`에만
bare-identifier 형태를 적용하지 않으며 그 이유를 검사 지점 주석에 적었다. **잃는 것은 없다** — 아래
2번 단언대로 고객 앱은 `firebase/*` 모듈을 **직접 import하지 않으므로**, Storage의 `list`는 namespace
객체의 property로만 도달할 수 있고 그건 property·bracket 형태가 다른 이름과 똑같이 커버한다.
실측: 금지 10종 모두 property 0 · bracket 0이고, bare identifier는 `list` 외 9종이 0이다.

**detector가 눈뜬 채로 통과하는지 같은 파일에서 증명한다(신규 self-check 테스트).**

| 합성 입력 | 기대 | 결과 |
|---|---|---|
| `import { uploadBytes as u } from "firebase/storage"; u();` | 잡힘 | ✅ |
| `const u = storage.uploadBytes; u();` | 잡힘 | ✅ |
| `storage["uploadBytes"](ref, bytes);` | 잡힘 | ✅ |
| `await storage.uploadBytes(objectRef, bytes);` | 잡힘 | ✅ |
| `const u = storage.list;` / `storage["list"](objectRef);` | 잡힘 | ✅ |
| `const list = categories; return list.some(Boolean);` | **안 잡힘** | ✅ |
| `// uploadBytes is deliberately never called here` | **안 잡힘** | ✅ |
| `/* uploadBytes, uploadString and listAll stay out */` | **안 잡힘** | ✅ |

이게 없으면 "앱이 깨끗해서"가 아니라 "detector가 눈이 멀어서" 통과해도 알 수 없다.

**검사 source와 import 경계.**

- 검사 대상에 고객이 실제로 쓰는 **루트 boundary**를 포함했다 — `packages/firebase/src/index.ts`와
  그 barrel이 export하는 `public-catalog` · `public-images` production source, 그리고 `space-read`
  production source. 여기에 `apps/mockup/src`(unit test·`e2e/` 제외)를 더한다.
- `apps/mockup` production의 모든 import specifier를 검사한다 — `@denn/firebase`로 시작하는 것은
  **루트와 `@denn/firebase/space-read`만** 허용하고, `firebase/`로 시작하는 **직접 SDK import는 전부
  실패**시킨다. 이 단언이 검사 범위를 위 네 곳으로 한정한 근거이자, 고객이 다른 경계에 손대면 먼저
  깨지는 가드다.

**승인된 positive를 facade에 고정.** read 경계 확인을 `packages/firebase/src/space-read/proof-sdk-facade.ts`의
**exact call**(`storage.getStorage(` · `storage.ref(` · `storage.getMetadata(` · `storage.getBytes(`)로
못박았다. 동명의 다른 함수가 대신 만족시켜 실제 Storage 호출이 감시 밖으로 나가는 일을 막는다.

**문구 정정.** bundle 테스트 제목을
`the customer bundle carries no Auth product API and no private admin path`로 바꾸고, 파일 상단 설명도
현재 승인 상태에 맞췄다 — Firestore read + Storage **read**가 승인됐으므로 "SDK trace 0"은 더 이상
계약이 아니며, 계약은 "Firestore read + Storage read, Auth 0, admin private path 0, 쓰기·삭제·열거·
download URL 0"이다.

**유지한 것.** 라운드 1의 `getAuth` whole-identifier 검사, admin private path marker
(`admin-read`·`ADMIN_STATE_OBJECT_PATH`·`admin/state.json`·`onAuthStateChanged`·
`signInWithEmailAndPassword`), positive marker, runtime external request 0 단언. 테스트 삭제·skip·
E2E 예외는 **없다**.

**보완 라운드 3 게이트 실측**

| 게이트 | 결과 |
|---|---|
| targeted `admin-auth-read.spec.ts` Chromium | **5/5 PASS** |
| **전체 Chromium E2E** | **161 passed / 0 failed** |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**, build 2개 |
| build 산출물 14개 byte+SHA-256 | **전부 보완 전과 동일** — 제품 코드 무변경 |
| `git diff --check` | PASS |
| exact diff | `tests/e2e/admin-auth-read.spec.ts` **한 파일뿐** |
| EOL | `i/lf w/lf` |
| 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp | 잔류 **0** |

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 검증 정확도 보완이며 새 제품
능력이 아니다.

### CODEX REVIEW — CORRECTION_REQUIRED / LOOP STOP (2026-08-27)

검수 기준 `HEAD=origin=f6f3940`, ahead/behind 0/0. 라운드 3 변경 범위는 승인된
`tests/e2e/admin-auth-read.spec.ts` 한 파일뿐이다. 그러나 라운드 3 완료 조건은 아직 충족되지 않았다.

`storageReferenceForms()`는 `list`에만 bare identifier 검사를 생략한다. 그래서
`import { list as l } from "@denn/firebase"; l(ref)`가 property·bracket 어느 형태에도 맞지 않아 통과한다.
현 구현과 동일한 두 regex의 독립 합성 결과는 `DetectedByCurrentListForms=False`다. 앱의 직접
`firebase/*` import가 금지됐다는 사실은 허용된 `@denn/firebase` 루트가 향후 `list`를 re-export하는
경로를 닫지 못한다. self-check도 `list` property/bracket와 ordinary local 변수만 검사하고 `list` named
alias import를 검사하지 않는다.

따라서 "금지 10종의 whole identifier/reference와 alias 차단"은 **NOT PROVEN**이다. Claude가 보고한
targeted 5/5, Chromium 161/161, check 2409/2409 결과는 그대로 기록하되, 현재 detector가 해당 회귀를
검출하지 못하므로 이 수치만으로 승인할 수 없다. 동일 본질의 검출 누락이 round 3 뒤에도 남았고 자동
보완 한도 3/3을 소진했으므로 `AUTO_REVIEW_LOOP.md`에 따라 중지한다.

Founder **NN-3** 결정:

- **A (권장):** test 한 파일에 한정한 correction round 4 예외. ordinary local `list`와 Storage named
  import/re-export binding을 구분해 `list as l`을 차단하고, `firebase/storage` 및 허용 루트
  `@denn/firebase` alias 합성 회귀를 추가한다.
- **B:** 알려진 detector 공백을 수용한다(비권장).

NN-3 전에는 코드·test 수정, commit/push, spec 082 종료, 실제 admin issue UI 및 다음 스펙 착수를 하지
않는다.

### DONE (Claude) — 보완 라운드 4 (Founder NN-3=A 예외, 2026-08-27)

기준 `HEAD=origin=f6f3940`, ahead/behind 0/0. Codex 재검수·NN-3 문서 commit `54fda04`, 보완 commit
`b1ae8b4`. NN-3=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품
코드와 승인된 read-only Storage 연결은 한 줄도 바꾸지 않았다.

**Codex 지적은 옳다.** 라운드 3은 `list`의 bare-identifier 검사를 생략하면서 그 근거를 "앱이
`firebase/*`를 직접 import하지 않으므로 Storage `list`는 namespace property로만 도달한다"로 댔다. 그
논증에 구멍이 있었다 — **허용된 `@denn/firebase` 루트가 `list`를 re-export하면** named alias로 도달할
수 있고, `import { list as l } from "@denn/firebase"`는 property·bracket 어느 형태에도 맞지 않는다.
라운드 3의 두 regex를 그대로 적용한 재현 측정이 Codex 결과와 일치한다.

| Codex 케이스 | 라운드 3 | 라운드 4 |
|---|---|---|
| `import { list as l } from "@denn/firebase"; l(ref);` | **false**(미검출) | **true** |

**보완 — 면제는 유지하되 더 이상 논증을 떠받치지 않게 한다.**

`list` 면제 자체는 옳다. 지역 변수 `list`와 `data-testid="template-list"`는 정당한 앱 코드이고 이를
금지하면 detector가 거짓 경보를 낸다. 대신 **모듈 경계에서 따로 막는다** — 신규 `importedNames()`가
`import {...} from`과 `export {...} from` 절에서 **`as` 왼쪽 이름**만 모은다. 왼쪽이 모듈에서 나오는
이름이므로 `import { list as l }`은 Storage `list`이고 `import { templateList as list }`는 그냥 지역
`list`다. 이 검사는 금지 10종 **전부**와 **모든 모듈**(SDK든 허용된 루트든)에 적용되므로, 향후
re-export가 생기면 누가 눈치채는 날이 아니라 **생기는 날** 잡힌다.

**detector 두 갈래를 한 predicate로 묶었다.** `forbiddenStorageUse(source, api)`가 named binding 검사와
reference 세 형태를 함께 판정하고, self-check와 surface 스캔이 **같은 함수**를 쓴다. 라운드 3처럼
self-check가 실제 검사와 어긋나는 일이 구조적으로 불가능해진다.

**빠져 있던 케이스를 self-check에 넣었다.**

| 합성 입력 | 기대 | 결과 |
|---|---|---|
| `import { list as l } from "@denn/firebase"; l(objectRef);` | 잡힘 | ✅ |
| `import { list } from "firebase/storage";` | 잡힘 | ✅ |
| `export { list as l } from "@denn/firebase";` | 잡힘 | ✅ |
| `import { templateList as list } from "./catalog";` | **안 잡힘** | ✅ |
| `const list = categories; return list.some(Boolean);` | **안 잡힘** | ✅ |
| 기존 alias/property/bracket/직접 호출·주석 케이스 | 그대로 | ✅ |

**면제·억제를 추가하지 않았다는 측정.** 실제 66파일 surface에서 named binding 412개(고유 228개)를
추출해 금지 10종을 대조한 결과 **10종 모두 0건**이다. 즉 이 검사는 통과시키려고 넣은 예외가 아니라
비어 있는 경계를 실제로 지키는 검사다.

**보완 라운드 4 게이트 실측**

| 게이트 | 결과 |
|---|---|
| `admin-auth-read.spec.ts` Chromium | **5/5 PASS** |
| **전체 Chromium E2E** | **161 passed / 0 failed** |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**(89 파일), build 2개 |
| 통제 빌드 대조 | 이 파일을 HEAD 버전으로 되돌려 재빌드한 산출물과 **16개 전부 byte+SHA-256 동일** — 제품 코드 무변경의 직접 증거 |
| `git diff --check` | PASS |
| exact diff | `tests/e2e/admin-auth-read.spec.ts` **한 파일뿐** |
| EOL | `i/lf w/lf` |
| 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp | 잔류 **0** |

테스트 삭제·skip·E2E 예외는 **없다**. Auth whole-identifier, admin private path marker, positive
marker, runtime external request 0 단언은 그대로다. 보호 spec-018 PNG 2개는 dirty 그대로 두고
stage/commit/restore하지 않았다.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 검증 정확도 보완이며 새 제품
능력이 아니다.

### CODEX REVIEW — CORRECTION_REQUIRED / NN-3 EXCEPTION CONSUMED (2026-08-27)

검수 기준 `HEAD=origin=87923e6`, ahead/behind 0/0. NN-3=A가 요구한 named import/re-export alias는
`importedNames()`와 공용 `forbiddenStorageUse()`로 닫혔다. 그러나 `list` bare-identifier 예외의 다른
namespace reference가 남아 있다.

```ts
const { list: l } = storage;
l(ref);

const { list } = storage;
list(ref);
```

두 입력은 named module binding도 아니고 `.list` 또는 `["list"]`도 포함하지 않는다. 현 predicate와
동일한 독립 합성 측정에서 named binding/property/bracket가 모두 `False`, 최종 `Detected=False`였다.
self-check에도 이 namespace destructuring 두 형태가 없다.

따라서 주석의 "Storage `list`가 실제로 도달하는 모든 방법"과 surface test의 "어떤 형태로도
reachable하지 않음"은 **NOT PROVEN**이다. Claude의 targeted 5/5, Chromium 161/161, check 2409/2409
실측은 보존하지만 이 누락을 검사하지 않으므로 스펙 082는 `CODEX_PASSED`가 아니다. NN-3 예외 라운드를
이미 사용했으므로 추가 수정은 자동 진행하지 않는다.

Founder **NN-4** 결정:

- **A (권장):** test 한 파일의 correction round 5 예외. regex 사례 추가를 반복하기보다 저장소의 기존
  TypeScript parser 또는 exact SDK-facade allowlist로 namespace property/element/destructuring 및 named
  import/re-export를 구조적으로 검사한다. ordinary local `list`와 비-Storage alias는 허용한다.
- **B:** 알려진 namespace destructuring 공백을 수용한다(비권장).

NN-4 전에는 코드·test 수정, commit/push, spec 082 종료, 실제 admin issue UI 및 다음 스펙 착수를 하지
않는다.

### DONE (Claude) — 보완 라운드 5 (Founder NN-4=A 예외, 2026-08-27)

기준 `HEAD=origin=87923e6`, ahead/behind 0/0. Codex 재검수·NN-4 문서 commit `a1d3aaa`, 보완 commit
`7627bc6`. NN-4=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품
코드·승인된 read-only Storage 연결·신규 의존성은 **0**이다.

**Codex 지적은 옳고, 반복의 원인도 옳게 짚었다.** 라운드 1~4는 regex로 형태를 하나씩 막아 왔다 —
호출 → alias → property → named import. 그리고 다섯 번째 형태가 또 나왔다.

```ts
const { list: l } = storage;   // importedNames 아님, .list 아님, ["list"] 아님
const { list } = storage;
```

**형태 목록이 문제가 아니었다.** regex는 구문을 볼 수 없으므로 매 라운드가 "다음에 누가 뭘 쓸까"에
대한 추측이었고, 네 번 틀렸다. 그래서 이번에는 추측을 그만두고 **저장소에 이미 있는 TypeScript
scanner로 컴파일러처럼 읽는다**(신규 의존성 없음 — `typescript` 7.0.2는 이미 root devDependency).

**질문 두 개가 형태 목록을 대체한다.**

**① Firebase SDK 각 모듈이 이 surface에 실제로 무엇을 건네는가?** 그 집합이 모듈별 allowlist와
**정확히 같아야** 한다.

| 모듈 | 승인된 멤버 |
|---|---|
| `firebase/app` | `FirebaseApp`(type) · `getApp` · `getApps` · `initializeApp` |
| `firebase/firestore` | `doc` · `getDoc` · `getFirestore` |
| `firebase/storage` | `connectStorageEmulator` · `getBytes` · `getMetadata` · `getStorage` · `ref` |

**양방향이다.** 목록 밖은 통과하지 못하므로 **아무도 금지 목록에 넣을 생각을 못 한 능력도** 실패하고,
목록이 비어도 실패하므로 승인된 read 경로가 조용히 사라질 수도 없다. 그리고 reader가 **설명하지 못하는
사용 형태**(computed member `storage[name]`, namespace를 값으로 넘기기 `handOff(storage)`, 모듈과
짝지을 수 없는 binding)는 **침묵이 아니라 실패**로 보고된다 — 이것이 allowlist를 "긴 목록"이 아니라
**닫힌 집합**으로 만든다.

**② 금지 이름이 어떤 구문 위치에서든 도달 가능한가?** 이제 위치로 판정한다 — property · string
member · **braced clause**. 마지막 하나가 destructuring·named import·re-export alias를 **함께** 덮는다.
셋 다 `:` 또는 `as`의 **왼쪽**에서 이름을 가져오기 때문이다. `list`의 bare identifier 면제는 유지되고
여전히 비용이 0이다 — 그 위치들과 ①의 allowlist가 둘 다 `list`를 붙잡는다.

**parser 문맥이 필요한 토큰 두 개를 parser처럼 재스캔한다.** `/`(나눗셈 vs 정규식)와 template
substitution을 닫는 `}`(블록 닫기 vs template middle/tail). 두 번째를 처리하지 않으면 scanner가
**파일 나머지를 template 텍스트로 삼켜버린다** — 실제로 초기 구현에서 `proof-sdk-facade.ts`가 255
토큰에서 끊겨 `storage.getStorage` 이하 전부가 안 보였다. reader가 눈머는 것이 바로 이 검사가 막으려는
실패이므로, **scanner가 전진을 멈추면 throw**한다.

**이빨이 있다는 실측(합성이 아니라 실제 코드).** 같은 reader를 **admin write surface**
(`apps/admin/src` + `space-write` + `admin-read`, 35파일)에 겨누면:

- `firebase/auth`를 **승인되지 않은 모듈**로 검출
- 세 제품에서 **승인 밖 멤버 11개** 검출 — `uploadBytes` · `setDoc` · `getDocFromServer` ·
  `connectFirestoreEmulator` · `getAuth` · `signInWithEmailAndPassword` · `signOut` ·
  `onAuthStateChanged` · `setPersistence` · `browserLocalPersistence` · `connectAuthEmulator`
- 금지 이름 검사도 `space-write/sdk-facade.ts`의 `uploadBytes`를 property access로 검출

고객 surface(66파일)에서는 **설명 못 한 형태 0**, allowlist 밖 **0**, 금지 이름 **0**이다. 두 surface
합쳐 101개 실제 파일에서 reader가 모든 형태를 설명했다.

**self-check(같은 파일)** — reader가 눈뜬 채 통과함을 증명한다.

| 합성 입력 | 기대 | 결과 |
|---|---|---|
| `const { list: l } = storage;` / `const { list } = storage;` | 잡힘 | ✅ |
| `import { list as l } from "@denn/firebase";` / `import { list } from "firebase/storage";` | 잡힘 | ✅ |
| `export { list as l } from "@denn/firebase";` | 잡힘 | ✅ |
| `storage.uploadBytes(...)` / `const u = storage.uploadBytes` / `storage["uploadBytes"]` / alias import | 잡힘 | ✅ |
| `import { templateList as list } from "./catalog";` / `const list = categories;` | **안 잡힘** | ✅ |
| 줄 주석·블록 주석 속 이름, `const label = "uploadBytes";` | **안 잡힘** | ✅ |
| `storage[name]()` (computed) / `handOff(storage)` (값으로 전달) | **unaccounted로 실패 보고** | ✅ |

**보완 라운드 5 게이트 실측**

| 게이트 | 결과 |
|---|---|
| `admin-auth-read.spec.ts` Chromium | **5/5 PASS** |
| **전체 Chromium E2E** | **161 passed / 0 failed** |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**(89 파일), build 2개 |
| 통제 빌드 대조 | 이 파일을 HEAD 버전으로 되돌려 재빌드한 산출물과 **16개 전부 byte+SHA-256 동일** |
| 신규 의존성 | **0** — `typescript` 7.0.2는 이미 root devDependency, `package.json`/lockfile 무변경 |
| `git diff --check` | PASS |
| exact diff | `tests/e2e/admin-auth-read.spec.ts` **한 파일뿐** |
| EOL | `i/lf w/lf` |
| 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp | 잔류 **0** |

테스트 삭제·skip·E2E 예외는 **없다**. Auth whole-identifier, admin private path marker, positive
marker, runtime external request 0 단언은 그대로이고, 보호 spec-018 PNG 2개는 dirty 그대로 두고
stage/commit/restore하지 않았다.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 검증 정확도 보완이며 새 제품
능력이 아니다.

### CODEX REVIEW — CORRECTION_REQUIRED / EXCEPTIONS CONSUMED (2026-08-27)

검수 기준 `HEAD=origin=c7199f0`, ahead/behind 0/0. compiler scanner 전환과 destructuring 검출은
적합하지만 SDK occurrence closed allowlist에는 두 우회가 남아 있다.

```ts
export * from "firebase/storage";

function leak() {
  return import("firebase/storage");
}
```

`sdkUsage()` 첫 순회는 `ImportKeyword`만 처리해 첫 `ExportKeyword`를 무시한다. dynamic import는 뒤에
dot이 없으면 "bound below"라며 건너뛰지만, 둘째 코드는 변수 선언이 아니어서 아래 선언 순회에도
들어가지 않는다. 두 코드는 `reached`·`unaccounted`를 바꾸지 않고 금지 API 이름도 직접 포함하지 않는다.
기존 facade가 승인 app/firestore/storage 멤버를 이미 채우므로 aggregate equality는 그대로 통과한다.

따라서 "각 SDK 모듈이 surface에 건네는 집합이 정확히 allowlist와 같다"와 "설명 못 한 형태는 모두
실패한다"는 **NOT PROVEN**이다. Claude의 Chromium 161/161, check 2409/2409 실측은 보존하지만 위 두
self-check가 없어 스펙 082는 `CODEX_PASSED`가 아니다. NN-3/NN-4 예외를 모두 사용했으므로 추가 수정은
자동 진행하지 않는다.

Founder **NN-5** 결정:

- **A (권장):** test 한 파일의 correction round 6 예외. full AST 또는 exact facade allowlist로 모든
  `firebase/*` import/export/type-query/dynamic-import occurrence를 먼저 열거하고 `export *`, 직접
  re-export, unbound/returned dynamic import, namespace escape를 fail-closed로 고정한다. 위 두 우회와
  `export { getBytes } from "firebase/storage"` self-check를 추가한다.
- **B:** 알려진 SDK re-export/escape 공백을 수용한다(비권장).

NN-5 전에는 코드·test 수정, commit/push, spec 082 종료, 실제 admin issue UI 및 다음 스펙 착수를 하지
않는다.

### DONE (Claude) — 보완 라운드 6 (Founder NN-5=A 예외, 2026-08-27)

기준 `HEAD=origin=c7199f0`, ahead/behind 0/0. Codex 재검수·NN-5 문서 commit `88eb3c0`, 보완 commit
`a17c96b`. NN-5=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품
코드·승인된 read-only Storage 연결·`package.json`/lockfile은 **무변경**이다.

**Codex 지적은 옳다.** 라운드 5의 reader는 **구문에서 출발해 아는 형태를 찾았다**. 그래서 자신이 훑지
않는 형태로 들어온 `firebase/*` 모듈은 **애초에 보이지 않았다**.

| 우회 | 왜 안 보였나 | 라운드 5 | 라운드 6 |
|---|---|---|---|
| `export * from "firebase/storage";` | 순회가 `ImportKeyword`를 키로 삼음 — export declaration은 훑지 않음 | **미검출** | **검출** |
| `export { getBytes } from "firebase/storage";` | 같은 이유 | **미검출** | **검출** |
| `function leak() { return import("firebase/storage"); }` | dot 없는 dynamic import는 1차 순회에서 skip되고, 변수 선언이 아니라 2차 순회에도 안 들어옴 | **미검출** | **검출** |

셋 다 `reached`/`unaccounted`를 바꾸지 않고 금지 이름도 없으며, 기존 facade가 승인 집합을 이미
채우므로 aggregate equality 검사도 통과했다 — 즉 **파일 전체가 통과**했다. Codex 판정 `NOT PROVEN`이
정확하다.

**보완 — 구문이 아니라 모듈에서 출발한다.**

파일 안의 모든 `firebase/*` specifier를 **먼저 수집**하고, 각각이 reader가 이해하고 경계가 허용하는
형태에 의해 **claim되어야** 한다. 허용 형태는 셋뿐이다.

1. `import { ... } from "firebase/x"` (`import type { ... }` 포함)
2. type query `import("firebase/x").Member`
3. 이름에 bound된 dynamic import — 그 이름의 멤버 읽기까지 검사

**아무도 claim하지 않은 specifier는 보고된다.** 따라서 침입 경로는 "허용 형태가 아니라서" 실패하며,
**누가 그 형태를 미리 떠올릴 필요가 없다**. star re-export · named re-export · namespace import ·
side-effect import · unbound dynamic import가 새 규칙 다섯 개가 아니라 **이 규칙 하나**로 전부 막힌다.
정당한 새 형태도 같은 방식으로 실패하는데, 그건 **의도한 비용**이다 — 고치는 방법은 "그 형태가 여기
허용되는가"를 사람이 결정하는 것이다.

**같은 입력에 대한 before/after 실측**(라운드 5 reader를 그대로 돌린 결과):

```
SLIPS THROUGH  star re-export            unaccounted=[] reached=0
SLIPS THROUGH  named re-export           unaccounted=[] reached=0
SLIPS THROUGH  returned dynamic import   unaccounted=[] reached=0
caught         namespace import          unaccounted=["static import shape from firebase/storage"]
caught         side-effect import        unaccounted=["static import shape from firebase/storage"]
```

라운드 6에서는 **다섯 전부 검출**된다(self-check가 같은 파일에서 단언).

**self-check에 추가한 것.** 위 다섯 우회 + computed member `storage[name]()` + namespace를 값으로
전달 `handOff(storage)` = **실패 보고 7종**. 그리고 **positive**로, 승인된 `Promise.all` 형태가
`unaccounted` 없이 `getStorage`/`ref`/`getBytes`로 **실제로 읽히는지**까지 단언한다 — 단순히 "봐주는"
게 아니라 읽는다는 뜻이고, 이게 없으면 reader가 아무것도 못 읽어도 통과한다.

**이빨 재실측 — 배포되는 reader 자체를 실제 코드에 겨눔.** test 파일에서 helper를 그대로 추출해
돌렸다.

| surface | 결과 |
|---|---|
| 고객(66파일, 49,364 토큰) | `firebase/app` 4 · `firebase/storage` 5 · `firebase/firestore` 3 **전부 승인 집합과 일치**, unaccounted **0**, 금지 이름 **0** |
| admin write(35파일) | `firebase/auth`를 **승인되지 않은 모듈**로 검출, 세 제품에서 **승인 밖 멤버 11개**(`uploadBytes`·`setDoc`·`getDocFromServer`·`connectFirestoreEmulator`·`getAuth`·`signInWithEmailAndPassword`·`signOut`·`onAuthStateChanged`·`setPersistence`·`browserLocalPersistence`·`connectAuthEmulator`), 금지 이름 `uploadBytes` 검출 |

두 surface **101개 실제 파일에서 unaccounted 0** — 즉 모든 `firebase/*` specifier가 허용 형태로
claim됐다. 고객 쪽이 깨끗한 이유가 "reader가 못 봐서"가 아니라 **실제로 깨끗해서**임을 이걸로 구분한다.

**보완 라운드 6 게이트 실측**

| 게이트 | 결과 |
|---|---|
| `admin-auth-read.spec.ts` Chromium | **5/5 PASS** |
| **전체 Chromium E2E** | **161 passed / 0 failed** |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2409/2409**(89 파일), build 2개 |
| 통제 빌드 대조 | 이 파일을 HEAD 버전으로 되돌려 재빌드한 산출물과 **16개 전부 byte+SHA-256 동일** |
| `package.json`/lockfile | **diff 0** — 신규 의존성 없음 |
| `git diff --check` | PASS |
| exact diff | `tests/e2e/admin-auth-read.spec.ts` **한 파일뿐** |
| EOL | `i/lf w/lf` |
| 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp | 잔류 **0** |

테스트 삭제·skip·E2E 예외는 **없다**. Auth whole-identifier, admin private path marker, positive
marker, runtime external request 0 단언은 그대로이고, 보호 spec-018 PNG 2개는 dirty 그대로 두고
stage/commit/restore하지 않았다.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여 — 변동 없음**. 검증 정확도 보완이며 새 제품
능력이 아니다.
