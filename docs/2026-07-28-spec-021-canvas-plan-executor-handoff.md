# 2026-07-28 — 스펙 021 Canvas render-plan executor 핸드오프

정본 스펙: `docs/rebuild/specs/021-canvas-plan-executor.md` (DONE는 스펙 하단)

## 한 줄

스펙 020의 결정적 preview render plan을 **호출자가 주입한** Canvas 2D context와 **이미 준비된 메모리 drawable**로 실행하는 React 비의존 executor를 `apps/mockup`에 추가했다. 실제 `<canvas>` 생성·이미지 load·CORS·DPR·pointer·화면 연결은 하지 않았다.

## 바꾼 것

| 경로 | 내용 |
| --- | --- |
| `apps/mockup/src/canvas/types.ts` | `PreviewCanvasContext`(9 method + 3 style), `PreviewImageBindings`, `ExecutePreviewRenderPlanArgs`, `CanvasExecutionErrorCode`, `CanvasExecutionResult` |
| `apps/mockup/src/canvas/executePreviewPlan.ts` | `executePreviewRenderPlan({context, plan, imageBindings})` — preflight → outer save → clear 1회 → command 실행 → outer restore |
| `apps/mockup/src/canvas/executePreviewPlan.test.ts` | recording fake 기반 unit **36**(정상 순서·preflight·restore/예외·금지 동작·console 0) |
| `apps/mockup/package.json` | `@denn/render` **workspace link만** 추가 |
| `pnpm-lock.yaml` | mockup importer link 3줄(외부 resolution 신규 0) |

커밋: 코드/test `54d23f8` / 문서는 별도 커밋.

## 계약 요약

- **경계:** `@denn/render`는 계속 순수 geometry(019)+plan(020)만 소유. Canvas 실행 책임만 앱 계층.
- **context:** executor가 찾거나 만들지 않는다. port에 `getContext`·`setTransform/scale/rotate/translate`·9인자 `drawImage`·URL drawable overload가 없다. 실제 `CanvasRenderingContext2D`가 port를 만족함은 **컴파일 타임 단정**으로 고정(typecheck에서 깨진다).
- **imageRef:** 메모리 신뢰 binding map의 **lookup key 전용**. URL parse/fetch/decode/`Image.src` 0. ref당 1회 조회 + 동일 identity 재사용. 누락 오류에 실제 key 미포함.
- **preflight:** 구조·색상·rect·stroke width·binding을 **draw 전에 전량** 검증. 실패 시 Canvas 호출 0·style 대입 0·부분 실행 0.
- **순서:** outer save → `clearRect(0,0,W,H)` 1회(command count 미포함) → plan 순서 그대로 → outer restore 1회. image command는 `save→beginPath→rect→clip→drawImage→restore` 고정.
- **오류:** `INVALID_EXECUTOR_INPUT | INVALID_PLAN | MISSING_IMAGE_BINDING | CANVAS_OPERATION_FAILED | CANVAS_RESTORE_FAILED` + `commandIndex?`. layerId·imageRef·URL·token·원본 message/stack 없음. throw 없음. restore 실패는 성공으로 보고하지 않음. console 출력 0.

## 스펙 미명시 → 이번에 내린 판단 2건 (Codex 확인 요청)

1. **preflight는 읽기만 한다.** `"fillStyle" in ctx`·`typeof ctx.lineWidth === "number"`로 surface 존재만 확인한다. 대입 없이 실제 writability는 증명할 수 없고, §4가 preflight 단계의 대입을 금지하므로 throw하는 setter는 실행 중 `CANVAS_OPERATION_FAILED`로 드러난다.
2. **binding 조회가 throw하면** draw 전에 `INVALID_EXECUTOR_INPUT` + `commandIndex`로 반환한다(새 code 미추가, 예외 객체 미저장). 밖으로 throw하지 않기 위한 선택.

## 게이트 결과

- `install --frozen-lockfile` exit 0, lockfile diff = importer link만
- format / lint(`--error-on-warnings`) / typecheck 7 프로젝트 PASS
- **unit 408**(372 → 408, canvas 36 신규)
- build 독립 PASS — **mockup JS gzip 68.40KB / admin 61.09KB = 무변경**(executor를 mount에 연결하지 않아 번들 미포함)
- **e2e 49 PASS · exit 0**(기존 회귀만, **새 Canvas E2E 0**), 포트 4183/4184 LISTENING 0, 저장소 소속 Vite/esbuild 잔류 0
- `check` PASS, `git diff --check` clean
- e2e가 재생성한 `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`은 **커밋하지 않고 복원**(스펙 017·018과 동일)

## 무변경 확인

`packages/**` 코드, 기존 `apps/mockup` React UI·catalog·browse, `apps/admin/**`, 운영 `denn-*.html`, `firebase.json`·`.firebaserc`·Rules, `poc/**`, 결과·디자인 PNG. Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0. 신규 외부 의존성 0.

## NOT TESTED / 미착수 (정직 기록)

- recording fake 통과는 **실제 브라우저 Canvas 픽셀 검증이 아니다.** 실제 clip/drawImage 결과·선명도·CORS-clean·이미지 load·DPR·실기기 = **NOT TESTED**.
- `<canvas>` 생성·`getContext`·React lifecycle 연결·staging/double-buffer commit·pointer/zoom·액자 회전·text/clock/template art·print/export·주문 정책 = **미착수**(후속 스펙).
- Canvas 픽셀은 save/restore로 롤백되지 않는다. preflight는 구조·binding 오류의 부분 draw만 막는다. 실패 frame을 화면에 commit하지 않는 정책은 앱 통합 스펙에서 필요.

## 다음

Codex 재검증 요청(HEAD=origin, ahead/behind 0/0, clean). 이후 순서 = 실제 Canvas element/context + React lifecycle → image binding load/CORS-clean → pointer → text/clock → print.

---

## 재검증 보완 (2026-07-28, Codex "수정 후 재검증" 2건) — 코드 커밋 `71c0bd8`

### [1] hostile getter/Proxy에서도 public executor throw 0

**구현 방식(예외 경계 + normalized snapshot):**

1. preflight의 property 읽기를 **전부 try/catch 안**으로 옮기고 2단계로 분리 —
   - `readExecutorSurface(args)`: `args.context/imageBindings/plan` 읽기 + context surface + bindings 검사 → 예외 시 **`INVALID_EXECUTOR_INPUT`**
   - `normalizePlan(...)`: plan·command·rect 필드 읽기 → 예외 시 **`INVALID_PLAN`**
   - binding lookup 호출 예외는 기존대로 `INVALID_EXECUTOR_INPUT` + `commandIndex`
2. `bindings.get`을 **1회만 읽어 pre-bound 함수로 캡처** → caller 객체에서 재읽기 없음(`ReadonlyMap` 호환 유지)
3. **plain normalized snapshot**: 검증한 값을 각각 **정확히 1회 읽어** 새 plain object로 복사
   - `logicalCanvas` → `{width, height}`
   - command별 draw에 필요한 필드만: `fill-rect`=rect+color / `stroke-rect`=rect+color+width / `draw-image-cover`=clipRect+drawRect+**drawable identity**
   - **`layerId`·`imageRef`는 복사하지 않음**(draw에 불필요·Result 누출 원천 차단)
   - 실행은 snapshot만 읽음 → clearRect 크기·rect·color·command 개수 모두 첫 읽기 값으로 고정, **getter drift 불가**
4. Canvas method/property 실행은 기존 `attempt()` 경계 유지, setter writability는 mutation으로 시험하지 않음
5. 정상 실행 순서·restore 우선순위·Result API·code 집합 **무변경**

**추가 hostile 테스트 12건 (canvas unit 36 → 48):**

| # | 입력 | 기대 |
| --- | --- | --- |
| 1 | context method getter throw (save/restore/clearRect/drawImage/strokeRect) | `INVALID_EXECUTOR_INPUT`, ops 0 |
| 2 | `lineWidth` getter throw | `INVALID_EXECUTOR_INPUT`, ops 0 |
| 3 | Proxy `get` trap 전면 throw | `INVALID_EXECUTOR_INPUT`, ops 0 |
| 4 | Proxy `has` trap throw (fillStyle/strokeStyle) | `INVALID_EXECUTOR_INPUT`, ops 0 |
| 5 | throwing `fillStyle`/`strokeStyle` **getter** | `ok:true` — executor가 style 값을 **읽지 않음**을 증명 |
| 6 | args container getter throw (context/plan/imageBindings) | `INVALID_EXECUTOR_INPUT` |
| 7 | `bindings.get` **property** getter throw | `INVALID_EXECUTOR_INPUT`, ops 0 |
| 8 | plan `kind`/`logicalCanvas`/`commands` getter throw | `INVALID_PLAN`, ops 0 |
| 9 | commands **배열 element** getter throw (Proxy array) | `INVALID_PLAN`, ops 0 |
| 10 | command `type`/`layerId`/`rect`/`color`/`imageRef`/`clipRect`/`drawRect` getter throw | `INVALID_PLAN`, ops 0 |
| 11 | rect 필드(`height`) getter throw | `INVALID_PLAN`, ops 0 |
| 12 | **revoked Proxy** context·bindings / plan | `INVALID_EXECUTOR_INPUT` / `INVALID_PLAN`, ops 0 |
| 13 | **getter drift** ①command rect/color ②plan commands/logicalCanvas | 각 1회만 읽고 첫 값으로 draw, `executedCommands` 고정 |

전부 `expect(...).not.toThrow()`, preflight 실패 경로는 Canvas operation·style assignment **0**.

### [2] Tailwind v4 CSS bundle drift

**실제 원인(측정으로 확정):** `apps/mockup/src/canvas`를 트리에서 잠시 제외해 대조 빌드 →

| 상태 | mockup CSS raw | gzip |
| --- | --- | --- |
| 스펙 021 drift(HEAD `60e1560`) | **11.99 KB** | **3.35 KB** |
| canvas 디렉터리 제외 대조군 | 11.32 KB | 3.16 KB |
| **수정 후(현재)** | **11.32 KB** | **3.16 KB** |

생성 CSS diff로 확인한 실제 추가분 = **`.block`, `.transform`** + transform 스캐폴딩(`@layer properties` + `--tw-rotate-x/y/z`·`--tw-skew-x/y` `@property` 5개). Tailwind v4 자동 source 탐지가 앱 하위 **비-UI 로직/테스트 파일의 식별자·주석까지 class 후보로 스캔**한 것이 원인(executor에는 JSX·className이 없다).

**정정:** Codex가 든 5종 중 **`.visible`·`.fixed`·`.hidden`은 스펙 020 baseline CSS에 이미 존재**했다(기존 browse UI source 유래, drift 아님). 실제 drift는 2종 + scaffolding.

**수정(최소 config 변경 1건 — 예외 보고):** Tailwind root는 양 앱이 import하는 `packages/ui/src/theme.css`(유일한 `@import "tailwindcss"`). 여기에 한 줄 추가:

```css
@source not "../../../apps/mockup/src/canvas/**/*";
```

- 경로는 **이 CSS 파일 기준 상대경로**(`packages/ui/src` → 저장소 루트 `../../../`)
- 영향 범위 = **그 비-UI 디렉터리 하나뿐**. 앱 JSX/tsx·browse 컴포넌트·`@denn/ui` source는 계속 스캔된다
- safelist/blocklist·`source(none)`·executor 문자열 개명/난독화 **없음**

**검증:** 수정 후 mockup CSS는 스펙 020 baseline과 **byte-identical**(md5 `a9b44036cb2e5910b23c147aa578696c`, `diff` 무차이). admin CSS **8.54 KB / gzip 2.64 KB 무변경**(동일 hash). JS gzip mockup 68.40 / admin 61.09 KB 무변경. e2e viewport matrix(320·1280 포함) overflow 0·44px·axe 0·console 0 회귀 없음.

### 재검증 게이트

frozen exit 0(lockfile 추가 diff 0) / format·lint·typecheck / **unit 420**(408→420) / build 독립(위 표) / **e2e 49 PASS·exit 0**(새 Canvas E2E 0) / check PASS / `git diff --check` clean / 포트 4183·4184 LISTENING 0 · 저장소 소속 Vite/esbuild 잔류 0.

**변경 파일:** `apps/mockup/src/canvas/executePreviewPlan.ts`, `executePreviewPlan.test.ts`, `packages/ui/src/theme.css`(Tailwind source 범위 1줄). 그 외 무변경 — `types.ts`·기존 mockup React UI·catalog·browse·`apps/admin/**`·`packages/{render,shared,firebase,spaces}`·운영 HTML·Firebase 설정/Rules·`poc/**`·결과 PNG(e2e 재생성 2개는 커밋 없이 복원). 네트워크·live·deploy 0, 신규 의존성 0.

**미검증 유지:** recording fake·Proxy 검증은 실제 브라우저 Canvas 픽셀 검증이 아니다. 실제 clip/drawImage·CORS-clean·이미지 load·DPR·실기기 = NOT TESTED. `<canvas>`/React 연결·staging commit·pointer·회전·text/clock·print·주문 미착수(다음 기능 착수 없음).

---

## 재검증 보완 2 (2026-07-28) — E2E 종료 결정성 — 코드 커밋 `014211c`

### 1) 코드 무수정 반복 조사 (실행별 기록)

| 실행 | 시작 | 마지막 테스트(ok 49) | 종료 | 실제 exit code | 자기 종료 | 실행 전 포트 | 실행 후 포트 | 저장소 소속 잔류 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pre-fix #1 | 11:50:15 | 11:50:33 | 11:50:34 (19s) | 0 | YES | 4183/4184 free | free | 0 |
| pre-fix #2 | 11:53:06 | 11:53:23 | 11:53:26 (19s) | 0 | YES | free | free | 0 |
| pre-fix #3 | 11:53:49 | 11:54:06 | 11:54:07 (18s) | 0 | YES | free | free | 0 |

→ 내 환경에서는 **자연 재현되지 않았다.** Codex 재현을 오탐으로 단정하지 않는다(아래에서 같은 상태를 인위적으로 만들어 동일 증상을 재현했다).

### 2) 실행 중 소유 관계 (PID/PPID 실측)

```
pid=19376 node.exe  :: node "…\node_modules\.bin\..\vite\bin\vite.js" preview apps/mockup --port 4183 --strictPort   <- 포트 소유자
  ppid=44016 cmd.exe :: cmd /d /s /c "vite preview apps/mockup --port 4183 --strictPort"                             <- Playwright가 소유한 PID
    ppid=56524 node.exe :: node "…\@playwright\test\cli.js" test
      ppid=25872 cmd.exe :: cmd /d /s /c playwright test
        ppid=31996 node.exe :: corepack pnpm run test:e2e
```

**Playwright는 shell wrapper만 소유하고, 포트를 쥔 실제 Vite 서버는 그 자식이다.**

### 3) 근본 원인 (playwright-core 1.61.1 소스 확인)

1. `launchProcess`는 webServer command를 항상 `shell: true`로 spawn → 소유 PID = `cmd.exe`.
2. `detached: process.platform !== "win32"` → **win32에는 프로세스 그룹이 없다.**
3. webServer의 `attemptToGracefullyClose`는 win32에서 **즉시 throw**(`"Graceful shutdown is not supported on Windows"`) → 우리 `gracefulShutdown`은 **win32 no-op**, 항상 `killProcess()` 폴백.
4. `killProcess()` = `taskkill /pid <wrapper> /T /F`이며 **`processClosed`면 skip**.
5. teardown은 `await waitForCleanup` = wrapper의 `close` 이벤트 대기. `close`는 **상속된 stdout/stderr 파이프가 닫혀야** 발생 → **살아남은 자손이 파이프를 쥐면 teardown 무한 대기 + 포트 계속 LISTENING.**

기존 `playwright.config.ts` 주석의 "SIGTERM → 5s force-kill" 기록은 **Windows 실제 동작과 불일치**였다(정정).

### 4) 결정적 재현 (원인 증명)

실행 중 **wrapper cmd.exe만** `/F`로 종료(자손 유지):

| 관측 | 값 |
| --- | --- |
| 테스트 결과 | 49개 전부 PASS |
| 명령 종료 | **124초간 미종료(SELF_EXIT=NO)** |
| 포트 | 4183 LISTENING pid=51880 / 4184 LISTENING pid=58488 (고아 vite node) |
| 기록한 PID 2개만 종료 후 | 즉시 `49 passed (2.1m)` + **exit 0**, 포트 해제 |

Codex 보고와 동일한 형태다.

### 5) 변경한 종료 메커니즘

`scripts/e2e-preview.mjs` — **Vite 기존 Node API `preview()`**(루트 devDependency `vite`, 신규 의존성 0)로 preview 서버를 **in-process** 기동. webServer command:

```
node scripts/e2e-preview.mjs <mockup|admin> <port>
```

- wrapper가 spawn한 **node 자신이 포트 소유자** → 고아가 될 자손이 없다
- 자기 수명 가드(자기가 띄운 서버만 close 후 exit 0): **SIGTERM/SIGINT/SIGHUP/SIGBREAK** · **stdin EOF** · **부모 PID 소멸(고아 감지; `process.kill(pid,0)` 존재 확인만)**
- 앱 화이트리스트(mockup/admin) + 포트 범위 검증
- **포트 기반 kill 0 · globalTeardown 0 · broad taskkill/SIGKILL/Stop-Process 0 · 타 프로세스 종료 0 · `reuseExistingServer:false` 유지**
- `gracefulShutdown`은 POSIX 경로(런처가 SIGTERM 처리)를 위해 유지하고 win32 no-op임을 주석에 명시

### 6) 수정 후 검증

**(a) 고아 가드 직접 증명** — Playwright와 동일한 형태(`cmd /d /s /c node scripts/e2e-preview.mjs mockup 4183`)로 기동 → 포트 소유자가 wrapper의 **직속 자식**임을 확인 → wrapper만 `/F` 종료 → **856ms 후 자기 종료, 포트 해제**(수정 전 동일 조건: 무한 생존).

**(b) standalone 3회 연속**

| 실행 | 시작 | ok 49 | 종료 | exit code | 자기 종료 | 실행 후 포트 | 잔류 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| post-fix #1 | 12:03:16 | 12:03:33 | 12:03:36 (20s) | **0** | YES | 4183/4184 free | 0 |
| post-fix #2 | 12:03:40 | 12:03:57 | 12:03:58 (18s) | **0** | YES | free | 0 |
| post-fix #3 | 12:04:02 | 12:04:19 | 12:04:20 (19s) | **0** | YES | free | 0 |

세 실행 모두 **49 passed**. 고정 sleep으로 성공을 꾸미지 않았고, 수동 종료가 필요한 실행은 없었다.

### 7) 테스트로 고정 (+11, unit 420 → 431)

`scripts/e2e-preview.test.mjs`: 인자 화이트리스트/포트 검증 · shutdown **멱등**(close 1회·exit 1회) · close 실패에도 exit 0·reject 0 · 4개 시그널 배선 · stdin `end`/`close` · **부모 소멸 시에만** 종료(살아 있으면 no-op) · dispose가 타이머 해제 · **모듈 import만으로 서버 기동 0**. `vitest.config.ts` include에 `scripts/**/*.test.mjs` 추가(최소 config 변경).

### 8) 회귀·게이트

executor production API·normalized snapshot·Result **무변경**, Tailwind `@source` 예외 **유지**(mockup CSS 11.32 KB / gzip 3.16 KB, admin 8.54 / 2.64), UI/CSS 변경 0. frozen exit 0·lockfile diff 0 / format·lint·typecheck / **unit 431** / build / **e2e 49 PASS** / check PASS / `git diff --check` clean / 포트 free · 잔류 0. 변경 파일 = `scripts/e2e-preview.mjs`(신규) · `scripts/e2e-preview.test.mjs`(신규) · `playwright.config.ts` · `vitest.config.ts`. 운영본·Firebase·Rules·POC·admin·디자인 PNG 무변경, e2e 재생성 스펙018 PNG는 커밋 없이 복원, 네트워크·live·deploy 0.

### 9) 남은 불확실성

Codex 실행에서 **wrapper 링크가 왜 끊겼는지**(스케줄링·부하·외부 트리 kill 등)는 로그가 없어 확정할 수 없다. 확인된 사실은 (1) 그 상태가 발생하면 무한 대기 + 포트 잔존이 **필연**이고, (2) 수정 후에는 그 상태를 인위적으로 만들어도 **856ms 안에 자기 종료·포트 해제**된다는 것이다. POSIX(리눅스/CI)는 detached 프로세스 그룹 + 실제 SIGTERM 경로라 이 실패 형태가 아니며, 런처는 그 경로에서도 정상 동작한다.
