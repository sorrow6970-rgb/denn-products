# 019 — Canvas 순수 geometry 계약

## 목표 (WHY)

케이스·액자 Canvas 편집기를 만들기 전에 이미지 cover 배치, pan clamp, percent zone, 화면 좌표 변환, aspect 회전, backing-store 크기 계산을 `@denn/render`의 순수 함수로 고정한다.

레거시에서 근거가 확인된 수학만 옮기고 DOM·Canvas API·React·Firebase·pointer 이벤트와 분리한다. DPR 상한, zoom anchor, 주문 실패 정책처럼 아직 결정되지 않은 제품 정책은 함수 내부 기본값으로 숨기지 않고 후속 스펙으로 남긴다.

근거:

- `docs/codex-claude-handoff/reviews/2026-07-27-canvas-render-contract-investigation.md`
- `docs/rebuild/00-legacy-analysis.md`
- `docs/rebuild/specs/003-canvas-aspect-ratio-landscape.md`
- `poc/platform-compatibility/src/App.tsx`의 `useCanvasDpr`
- 레거시 `drawImgT`, `cPos`, zone percent 변환, orientation aspect flip

## 범위 (SCOPE)

### 포함

- `@denn/render` 순수 geometry 타입·함수
  - cover-fit draw rect
  - 레거시 preview pan clamp
  - percent zone → logical rect
  - client/CSS point → logical Canvas point
  - portrait/landscape aspect 변환
  - CSS logical size + 명시적 DPR/cap → backing-store size
- 오류를 throw하지 않는 명시적 Result 계약
- 유한수·양수·0 크기·극단값 검증
- 숫자 허용오차 기반 unit test
- 현재 패키지 의존 방향과 전체 회귀 게이트

### 제외(하지 않을 것)

- `apps/mockup` Canvas UI 또는 hook 추가
- 실제 `<canvas>`, `CanvasRenderingContext2D`, `ctx.setTransform`, `drawImage`
- `ResizeObserver`, orientation event, requestAnimationFrame
- DPR 상한값 2/2.25/3/4 중 하나의 제품 정책 확정
- pointer/touch/mouse/wheel/pinch/drag handler
- pointer-anchored zoom
- 액자 회전 이미지 draw 수학
- multi-zone transform 상태
- layer plan 및 실제 합성 순서 실행
- 이미지 로드, `Image`, crossOrigin, CORS-clean, taint
- 실제 Firebase GET·이미지 다운로드·live test
- text zone, clock, watermark, border, magsafe, dieline
- print cm/DPI/pixel 계산 및 PNG export
- 주문 실패·preview-only fallback 정책
- 업로드·저장·시안공간·주문·카카오
- Firebase SDK/Auth/write·Rules/CORS·Hosting·배포
- 관리자 앱·운영 HTML·POC 변경
- 신규 패키지 설치
- 스크린샷 생성

## 대상 (WHERE)

구현 대상:

- `packages/render/src/geometry/types.ts`
- `packages/render/src/geometry/cover.ts`
- `packages/render/src/geometry/rect.ts`
- `packages/render/src/geometry/aspect.ts`
- `packages/render/src/geometry/backing.ts`
- `packages/render/src/geometry/index.ts`
- `packages/render/src/index.ts`
- 같은 경계의 unit test

파일 분리는 저장소 관례에 맞게 최소 조정할 수 있다. 공개 API와 책임 경계는 유지한다.

참조만 하고 변경하지 않을 대상:

- `denn-mockup-tool.html`
- `denn-admin.html`
- `apps/mockup/**`
- `apps/admin/**`
- `packages/shared/**`
- `packages/firebase/**`
- `poc/**`
- Firebase 설정·Rules
- 디자인·결과 PNG

## 구현 지시 (WHAT / HOW)

### 1. 공통 수치·오류 계약

모든 geometry 함수는 다음을 지킨다.

- 순수·결정적이다.
- 입력 객체를 변경하지 않는다.
- DOM/Canvas/React/Firebase/Date/random/IO를 사용하지 않는다.
- 정상적인 잘못된 입력에 throw하지 않는다.
- `NaN`, `Infinity`, `-Infinity`를 거부한다.
- 필요한 길이·크기·scale·aspect·DPR은 `> 0`이어야 한다.
- point/pan/rect origin은 유한한 음수를 허용한다.
- 결과는 plain readonly number/object만 포함한다.
- 오류에는 원본 이미지·URL·token·catalog 객체를 넣지 않는다.

권장 결과:

```ts
type GeometryErrorCode =
  | "NON_FINITE_INPUT"
  | "NON_POSITIVE_SIZE"
  | "NON_POSITIVE_SCALE"
  | "NON_POSITIVE_ASPECT"
  | "NON_POSITIVE_DPR";

type GeometryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: GeometryErrorCode };
```

기존 `@denn/shared Result`를 사용해도 되지만 오류 payload를 늘리지 않는다.

### 2. 기본 타입

최소 타입:

```ts
interface Point {
  readonly x: number;
  readonly y: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

interface Rect extends Point, Size {}

interface ImageTransform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}
```

`x/y`는 이미지 중심 기준 pan offset이다. `scale`은 cover base scale에 곱하는 사용자 배율이다.

단위를 타입명 또는 문서로 구분한다.

- logical/CSS px
- backing px
- percent

브랜드·상품·Firebase 타입을 geometry에 넣지 않는다.

### 3. cover-fit + 레거시 pan clamp

공개 함수는 다음 의미를 가진다.

```ts
computeCoverDrawRect({
  zone,
  image,
  transform,
  clampPan: true,
})
```

근거 수식:

```text
baseScale = max(zone.width / image.width, zone.height / image.height)
drawScale = baseScale * transform.scale
drawWidth = image.width * drawScale
drawHeight = image.height * drawScale
maxPanX = abs(drawWidth - zone.width) / 2
maxPanY = abs(drawHeight - zone.height) / 2
panX = clamp(transform.x, -maxPanX, maxPanX)
panY = clamp(transform.y, -maxPanY, maxPanY)
drawX = zone.x + (zone.width - drawWidth) / 2 + panX
drawY = zone.y + (zone.height - drawHeight) / 2 + panY
```

반환값:

- draw rect
- baseScale
- drawScale
- 적용된 clamped transform
- clamp 한계

중요:

- 레거시 `drawImgT`가 `abs`를 쓰므로 scale<1에서도 그 동작을 그대로 테스트한다.
- 이것을 더 나은 clamp로 “수정”하지 않는다.
- 레거시는 transform 객체를 직접 변경하지만 신규 함수는 변경하지 않고 보정 결과를 반환한다.
- 케이스·비회전 액자가 공유하는 코어 수학까지만 구현한다.
- 회전 이미지는 이번 스펙에서 제외한다.

`clampPan:false`를 지원한다면 clamp 없이 입력 pan을 그대로 적용한다. print의 pan scale 정책을 암묵적으로 추가하지 않는다.

### 4. percent zone → logical rect

```ts
percentRectToLogical(container, percentRect)
```

수식:

```text
x = container.x + percent.x / 100 * container.width
y = container.y + percent.y / 100 * container.height
width = percent.width / 100 * container.width
height = percent.height / 100 * container.height
```

계약:

- percent x/y는 유한한 음수·100 초과를 허용한다.
- width/height는 `> 0`.
- 신규 clamp를 추가하지 않는다.
- 케이스 zone은 전체 logical Canvas container를 전달한다.
- 액자 zone은 내부 `IX/IY/IW/IH` rect를 전달한다.
- kind별 분기는 app/후속 layer plan 책임이다.

### 5. client point → logical point

```ts
clientPointToLogical({
  client,
  clientRect,
  logicalSize,
})
```

수식:

```text
x = (client.x - clientRect.x) * logicalSize.width / clientRect.width
y = (client.y - clientRect.y) * logicalSize.height / clientRect.height
```

계약:

- backing width/height 또는 DPR을 사용하지 않는다.
- 논리좌표는 CSS px 기준으로 유지한다.
- client point가 rect 밖이어도 clamp하지 않는다.
- clientRect/logicalSize width/height는 `> 0`.
- DPR 적용은 backing-store에만 영향을 주며 pointer 논리좌표를 바꾸지 않는다.

레거시 `cPos`는 `canvas.width/rect.width`를 사용하지만 DPR 없는 preview에서 canvas.width가 논리폭과 같았다. 신규 DPR 구조에서는 backing pixel을 pointer 좌표로 쓰지 않도록 logicalSize를 명시적으로 받는다.

### 6. aspect/orientation

aspect 의미는 `height / width`로 고정한다.

```ts
resolveOrientedAspect({
  portraitAspect,
  orientation: "portrait" | "landscape",
})
```

```text
portrait  = portraitAspect
landscape = 1 / portraitAspect
```

계약:

- portraitAspect는 유한한 `> 0`.
- 입력을 변경하지 않는다.
- width/height 자체를 교환하거나 template transform을 변경하지 않는다.
- orientation lock/fullscreen 상태를 다루지 않는다.

### 7. backing-store 크기

정책을 숨기지 않는 순수 함수:

```ts
computeBackingStoreSize({
  cssSize,
  deviceDpr,
  dprCap,
})
```

수식:

```text
effectiveDpr = min(deviceDpr, dprCap)
backingWidth = max(1, round(cssWidth * effectiveDpr))
backingHeight = max(1, round(cssHeight * effectiveDpr))
```

계약:

- `deviceDpr`와 `dprCap`은 호출자가 반드시 제공한다.
- 기본 DPR cap을 만들지 않는다.
- 둘 다 유한한 `> 0`.
- CSS width/height는 유한한 `> 0`.
- 반환:
  - 원본 CSS size
  - effectiveDpr
  - backing integer size
- `window.devicePixelRatio`, Canvas width/height, `ctx.setTransform`에 접근하지 않는다.
- 앱 adapter와 실제 cap 결정은 후속 스펙이다.

### 8. 기존 placeholder API 처리

현재 `packages/render/src/index.ts`의 `RenderInput`, `RenderOutput`, `RenderResult`, `RENDER_NOT_IMPLEMENTED`는 실제 renderer가 아직 없다는 사실을 나타낸다.

- geometry 공개 export를 추가한다.
- 실제 renderer를 구현한 것처럼 `RENDER_NOT_IMPLEMENTED`를 제거하지 않는다.
- 기존 공개 API를 깨지 않는다.
- geometry 결과를 `RenderResult` 성공으로 꾸미지 않는다.

### 9. 하지 말아야 할 통합

- 케이스 zone별 transform과 액자 단일 transform을 하나의 state 모델로 통합하지 않는다.
- 회전 액자와 비회전 cover 계산을 억지로 하나로 합치지 않는다.
- preview clamp와 print no-clamp/pan-scale을 하나의 불명확한 옵션 집합으로 만들지 않는다.
- DPR cap 2를 POC에서 그대로 제품 정책으로 확정하지 않는다.
- 레거시 룸 DPR 4를 제품 정책으로 확정하지 않는다.
- print 300 DPI/minLong/maxPixels를 제품 기본값으로 확정하지 않는다.
- zoom scale 0.3~5를 이번 geometry 함수의 강제 정책으로 넣지 않는다.

## 검증 절차 (VERIFY)

### A. 정적 경계

- [ ] 신규 의존성 0, lockfile diff 0
- [ ] `@denn/render`의 런타임 React/Firebase/DOM/Canvas/IO 참조 0
- [ ] `@denn/render → @denn/shared` 외 `@denn/*` 의존 0
- [ ] `apps/**`, shared, firebase, spaces, ui 변경 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 변경 0
- [ ] 실제 네트워크·live test·deploy 0

### B. cover geometry unit

허용오차는 각 테스트에 명시한다. 정수 스냅샷으로 반올림하지 않는다.

- [ ] 동일 비율 image/zone, scale=1 → zone과 같은 draw rect
- [ ] 가로로 긴 image → height cover, 좌우 crop
- [ ] 세로로 긴 image → width cover, 상하 crop
- [ ] non-zero zone origin
- [ ] scale >1
- [ ] scale <1에서 레거시 `abs` clamp 재현
- [ ] pan 0
- [ ] pan이 한계 안
- [ ] pan이 양/음 한계 밖 → clamp
- [ ] `clampPan:false`면 입력 pan 유지
- [ ] 입력 transform deep-freeze 상태에서 비변형
- [ ] NaN/Infinity/0/음수 size·scale 오류

숫자 계산 예시를 테스트 주석에 직접 적는다.

예:

```text
zone=200×100, image=100×100, scale=1
baseScale=max(2,1)=2
draw=200×200
maxPan=(0,50)
draw origin=(0,-50)
```

### C. percent rect unit

- [ ] 0/0/100/100 → container 전체
- [ ] non-zero container origin
- [ ] 25/10/50/40 정확 계산
- [ ] x/y 음수·100 초과 비clamp
- [ ] width/height 0·음수 오류
- [ ] 입력 비변형

### D. client/logical unit

- [ ] rect 좌상단 → logical 0,0
- [ ] rect 중앙 → logical 중앙
- [ ] CSS가 축소/확대된 경우
- [ ] DPR/backing과 무관함을 서로 다른 backing 가정으로 설명
- [ ] rect 밖 point 비clamp
- [ ] rect/logical 0 크기 오류

### E. aspect unit

- [ ] portrait aspect 4/3 → portrait 4/3
- [ ] landscape → 3/4
- [ ] 두 번 orientation 계산이 입력을 변경하지 않음
- [ ] 1은 양 방향 1
- [ ] 0·음수·NaN·Infinity 오류

### F. backing unit

- [ ] CSS 320×240, DPR1, cap2 → 320×240
- [ ] DPR2, cap2 → 640×480
- [ ] DPR3.5, cap2 → effective2, 640×480
- [ ] DPR1.25와 소수 CSS 크기 → `round` 근거 검증
- [ ] 매우 작은 양수 CSS → backing 최소 1
- [ ] cap을 4로 전달하면 4까지 계산되지만 이를 제품 정책으로 기록하지 않음
- [ ] 0·음수·NaN·Infinity 오류
- [ ] window/DOM 없이 Node unit에서 실행

### G. 회귀·명령

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] 실행 전후 `pnpm-lock.yaml` diff 0
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test:unit`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] E2E는 기존 스펙 015~018 회귀만 확인하며 새 Canvas E2E 수를 꾸미지 않음
- [ ] `git diff --check`
- [ ] E2E exit 0, preview 포트 해제, 저장소 소속 신규 Vite/esbuild 잔류 0

### H. 검사할 금지어

신규 geometry 구현에서 다음 런타임 참조가 없어야 한다.

```text
document
window
HTMLCanvasElement
CanvasRenderingContext2D
getContext
drawImage
setTransform
devicePixelRatio
ResizeObserver
Image
fetch
firebase
```

타입·테스트 설명에 등장할 수 있으므로 단순 grep 결과를 그대로 PASS로 꾸미지 말고 실제 import/실행 참조를 판정한다.

## 완료 정의 (DONE)

다음을 모두 만족해야 완료다.

- 6개 순수 계약이 공개되고 unit으로 고정됐다.
  1. cover draw rect
  2. pan clamp
  3. percent rect
  4. client→logical point
  5. oriented aspect
  6. backing-store size
- 잘못된 숫자는 throw 대신 안전한 오류 결과다.
- 케이스·비회전 액자의 근거 있는 cover 코어만 공유한다.
- DPR cap은 명시적 입력이며 제품 기본값이 없다.
- DOM/Canvas/React/Firebase/IO가 render geometry에 없다.
- 앱·Canvas UI·pointer·image/CORS·print/export를 시작하지 않았다.
- 전체 기존 게이트가 통과한다.
- 코드/test 커밋과 DONE/handoff 문서 커밋을 분리한다.
- HEAD=origin, ahead/behind 0/0, clean으로 Codex 재검증을 요청한다.

## 위험 (RISK)

- 레거시 pan clamp는 `abs(draw-size)/2`라 scale<1에서 빈 영역을 허용할 수 있다. 호환 수학으로 기록할 뿐 개선하지 않는다.
- 회전 액자는 별도 수학이며 이번 결과를 그대로 적용할 수 없다.
- 논리좌표=CSS px 계약은 backing pixel과 분리된다. 후속 adapter가 이를 다시 섞으면 pointer 오차가 생긴다.
- backing 계산이 cap을 입력받는다고 cap 정책이 확정된 것은 아니다.
- 순수 geometry 통과는 실제 Canvas 선명도·이미지 합성·CORS-clean·인쇄 정확도를 증명하지 않는다.
- 레거시 preview와 print의 pan 수학이 다르므로 후속 print 계약에서 재확정이 필요하다.

롤백:

1. DONE/handoff 문서 커밋
2. geometry 코드/test 커밋

순서로 역 `git revert`. 운영/Firebase/배포 롤백은 없어야 한다.

## QUESTIONS

- 없음. 아래 결정은 이번 스펙에서 의도적으로 보류한다.
  - 제품 DPR cap
  - pointer-anchored zoom 여부
  - 액자 회전 cover 수학
  - multi-zone transform 상태
  - print DPI/minLong/maxPixels
  - 인쇄 실패 시 주문 차단 vs preview-only fallback

---

### DONE (Claude) — 2026-07-27

- **구현:** `@denn/render`에 순수 geometry 6종. `packages/render/src/geometry/{types,guards,cover,rect,point,aspect,backing,index}.ts` + `src/index.ts`에 `export * from "./geometry"`(기존 placeholder API 유지). 공개 = `computeCoverDrawRect`·`percentRectToLogical`·`clientPointToLogical`·`resolveOrientedAspect`·`computeBackingStoreSize` + 타입(guards 미노출).
- **수식(레거시 근거):** cover `baseScale=max(zone/img)`·pan clamp `abs(draw-zone)/2`(scale<1 abs 그대로, `drawImgT:1543`)·`clampPan:false`는 pan 그대로(print pan-scale 미추가) / percent `container + p/100*size`(`:1664`,`:3074`) / client→logical `(client-rect)*logicalSize/rect`(backing·DPR 미사용, `cPos:1535`) / aspect `landscape?1/portrait:portrait`(=H/W, `:7211`) / backing `max(1,round(css*min(dpr,cap)))`(POC `useCanvasDpr`).
- **오류 계약:** `GeometryResult<T>={ok:true,value}|{ok:false,code}`, code 5종. **throw 없음**, NaN/Infinity→`NON_FINITE_INPUT`, size/scale/aspect/dpr≤0→각 `NON_POSITIVE_*`, 입력 비변형, payload에 이미지·URL·token 없음.
- **공유 경계:** cover 코어는 케이스+비회전 액자 공유. 회전·multi-zone·pointer·layer plan·print는 미구현(하나의 불명확 state/옵션 통합 금지).
- **DPR 미확정:** `dprCap` 필수 입력·기본값 없음. cap 2/4는 입력 사례로만 검증, 제품 정책 미확정(2·4·print DPI·zoom 0.3~5 모두 미확정).
- **게이트:** frozen diff 0·신규 의존성 0 / format·lint·typecheck / **unit 292**(geometry 55 신규) / build / **e2e 49 PASS·exit 0**(스펙 015~018 회귀만, **새 Canvas E2E 없음**) / check PASS / `git diff --check` clean.
- **금지 의존성(§H):** geometry source에 `document/window/HTMLCanvasElement/CanvasRenderingContext2D/getContext/drawImage/setTransform/devicePixelRatio/ResizeObserver/Image/fetch/firebase` 런타임 참조 0. render 외부 import는 `type Result`(placeholder)뿐, React/Firebase/DOM/Canvas/IO 0.
- **무변경:** `apps/**`·shared·firebase·ui·spaces·운영 HTML·Firebase 설정/Rules·POC·PNG. deploy 0.
- **미검증:** 실제 Canvas 선명도·합성·CORS-clean·인쇄 정확도·실기기 = 순수 geometry로 증명 불가(후속). 커밋: 코드/test와 문서 분리(`spec 019:`). 핸드오프 `docs/2026-07-27-spec-019-canvas-geometry-contract-handoff.md`.

### Codex 재검증 요청 — HEAD 갱신 후 판정 대기.
