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
