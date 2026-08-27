# 082 — 공유 Canvas render-plan executor 경계 추출

## 상태

`READY_FOR_CODEX / IMPLEMENTED / LOCAL_VERIFIED / NON_UI / NO_LIVE_NETWORK`

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
