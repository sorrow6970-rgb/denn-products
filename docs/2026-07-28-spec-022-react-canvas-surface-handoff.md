# 2026-07-28 — 스펙 022 React Canvas surface·DPR·생명주기 핸드오프

정본 스펙: `docs/rebuild/specs/022-react-canvas-surface-lifecycle.md` (DONE는 스펙 하단)
코드/test 커밋: `d03cf20` · 문서 커밋: 별도

## 한 줄

호출자가 만든 `PreviewRenderPlan` + 메모리 drawable binding을 받아 **실제 `<canvas>`/`CanvasRenderingContext2D`에서 스펙 021 executor를 실행하는 재사용 surface**를 만들었다. 상품 plan projection·가짜 상품 Canvas는 만들지 않았고, 고객 탐색 화면에는 연결하지 않았다.

## 파일

| 경로 | 역할 |
| --- | --- |
| `apps/mockup/src/canvas/surface.ts` | framework-free 엔진(`createPreviewSurface`), `PREVIEW_DPR_CAP=2`, `LOGICAL_SIZE_TOLERANCE_PX=0.5` |
| `apps/mockup/src/canvas/usePreviewCanvasSurface.ts` | React 19 callback-ref(cleanup 반환) 하나가 element·RO·rAF 소유 |
| `apps/mockup/src/canvas/PreviewCanvasSurface.tsx` | `role="img"` canvas + 안전 상태 표현 |
| `apps/mockup/src/canvas/surface.css` | 기존 토큰만 사용(신규 토큰 0, `packages/ui` 무변경) |
| `apps/mockup/src/canvas/surface.test.ts` · `PreviewCanvasSurface.test.tsx` | unit 33건 |
| `apps/mockup/e2e-canvas-fixture.html` · `src/e2e/canvas-fixture.tsx` · `vite.e2e-fixture.config.ts` | E2E 전용 harness(별도 빌드) |
| `tests/e2e/canvas-surface.spec.ts` | 실제 Chromium Canvas 검증 8건 |
| `package.json` | `test:e2e`가 harness 빌드 후 Playwright 실행 |

## 공개 API

```ts
PreviewCanvasSurface({ plan, imageBindings, accessibleName, className })
usePreviewCanvasSurface({ plan, imageBindings }) -> { ref, state }
createPreviewSurface(ports) -> { requestDraw, dispose }
PREVIEW_DPR_CAP = 2
```
상태 = `"waiting-for-size" | "ready" | "failed"` 3종(코드·index·예외 미저장).

## 크기·DPR 적용 순서

1. 관측 content-box CSS 크기(RO `contentBoxSize`, 첫 draw는 bounding rect)
2. **`|css − plan.logicalCanvas| ≤ 0.5px`(축별)** — 벗어나면 executor 미실행, 안전 실패(임의 배율 재해석 없음)
3. `computeBackingStoreSize({cssSize, deviceDpr, dprCap: PREVIEW_DPR_CAP})`
4. `canvas.width/height` **변경 시에만 대입**(대입은 context state를 초기화)
5. **매 draw** `setTransform(dpr,0,0,dpr,0,0)`
6. `executePreviewRenderPlan({context, plan, imageBindings})`

canvas의 CSS width/height는 `plan.logicalCanvas`로 지정 → 불변식이 구조적으로 성립. 캔버스를 축소하지 않고 wrapper가 스크롤(페이지 overflow 0).

## DPR 상수

`apps/mockup/src/canvas/surface.ts`의 `PREVIEW_DPR_CAP = 2`. **고객 preview surface 전용** — 레거시 room cap 4·print DPI·관리자 Canvas 무관. 근거는 실기기 검증을 통과한 POC preview 상한. unit(1/2/3.5 → 1/2/2) + E2E(`deviceScaleFactor 3` → backing 600×400) 고정.

## 소유권·cleanup

| 시점 | 동작 |
| --- | --- |
| ref attach | 엔진 생성 → RO 1개 등록 → 최초 draw 예약 |
| resize | RO 콜백이 rAF **1개**만 예약(이미 있으면 재사용), draw 시점에 재측정 → 마지막 유효 크기 |
| plan/binding 변경 | effect가 snapshot 게시 + 현재 소유자에 재draw(재부착·observer 재생성 0) |
| ref cleanup / unmount | `dispose()` = observer disconnect + rAF cancel + 이후 콜백 전면 무력화 |
| StrictMode mount→cleanup→mount | active observer 1개·pending rAF 1개 유지 |

draw는 항상 최신 snapshot을 읽으므로 오래된 예약 draw가 새 plan을 덮지 않는다. `devicePixelRatio`는 draw 시점에만 읽는다.

## 실제 Canvas E2E와 `getImageData` 위치

`tests/e2e/canvas-surface.spec.ts`가 `/e2e-canvas-fixture.html`을 열고: fill/stroke/**clip+draw-image-cover** 픽셀(클립 안=drawable 색, drawRect 안·클립 밖=body 색) · `deviceScaleFactor` 1·3 backing · 새 logical size rerender · 0-size→복구 · unmount/remount console error 0 · 320px·desktop overflow 0 · accessible name · axe serious/critical 0 · 고정 sleep 0(전부 `expect.poll`). **`getImageData`는 테스트 측 `page.evaluate` 안에서만** 쓰고, production source 금지 스캔 unit이 이를 고정한다.

## fixture가 고객 `/`에 노출되지 않는 근거

- 별도 HTML entry(`/e2e-canvas-fixture.html`)이며 `index.html`·`main.tsx`·`App.tsx`·`BrowseFlow.tsx`는 fixture나 surface를 **import·링크·분기하지 않음**(grep + E2E 확인)
- E2E 1건이 고객 `/`에서 **canvas 0개, fixture 링크 0개, 문서 내 문자열 0**을 확인
- `pnpm build`·`pnpm check`는 fixture를 **빌드하지 않음** → 운영 산출물에 미포함. `test:e2e`만 별도 config로 dist에 append(`emptyOutDir:false`)
- 별도 빌드를 택한 이유: 고객 빌드의 두 번째 input으로 넣으면 Rollup이 공유 청크를 분리해 **고객 자산 그래프·해시가 바뀐다**(실측). 별도 빌드에서는 고객 번들이 **byte-identical**

## 게이트 결과

| 항목 | 값 |
| --- | --- |
| frozen install / lockfile diff | exit 0 / **0** |
| format · lint · typecheck | PASS |
| **unit** | **467** (434 → 467, 신규 33) |
| build | mockup JS 217.69 kB·gzip **68.40** / CSS 11.32 kB·gzip **3.16**(md5 `a9b44036…` = 스펙 021과 동일), admin 193.53·61.09 / 8.54·2.64 무변경 |
| **e2e** | **57 PASS** (49 → 57, 신규 8) · reporter 요약 출력 · **exit 0 자체 종료(18초)** |
| 포트·잔류 | 4183/4184 free · 저장소 소속 Vite/esbuild 잔류 0 |
| check · `git diff --check` | PASS · clean |

스펙 018 PNG는 E2E 재생성분을 **복원·미커밋**.

## 무변경

`packages/**`(render·shared·firebase·spaces·**ui**), `apps/admin/**`, 기존 mockup React UI, 운영 HTML, Firebase 설정·Rules, `poc/**`, 디자인 PNG. Firebase SDK/Auth/write/CORS·실제 network·live test·deploy 0. 스펙 021 globalSetup exact-handle 종료 구조 무변경.

## NOT TESTED / 미착수

실제 운영 이미지·Firebase Storage·**CORS-clean**, **실기기 4환경**(Safari·Android·Samsung·카카오), 실기기 선명도·성능·회전 = **NOT TESTED**. pointer/touch/wheel/pinch·회전·text/clock/watermark·print/PNG·저장·주문 = 미착수. **surface 완료 ≠ 상품 미리보기 완료** — 선택 상태→`CasePlanInput`/`FramePlanInput` projection과 케이스/액자 색 결정은 후속 스펙이다.
