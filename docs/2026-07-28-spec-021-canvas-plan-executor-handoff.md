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
