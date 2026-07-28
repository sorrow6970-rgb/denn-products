# 020 — 결정적 Canvas render-plan 계약

## 목표 (WHY)

스펙 019에서 확정한 geometry를 실제 이미지·CORS·pointer·React Canvas에 연결하기 전에, 무엇을 어떤 순서와 좌표로 그릴지를 `@denn/render`의 순수한 render plan으로 고정한다.

이번 단계는 Canvas에 직접 그리지 않는다. 합성 fixture를 입력하면 동일한 명령 배열과 안전한 진단을 반환하는 결정적 경계를 만들어, 후속 Canvas executor가 카탈로그 해석·레이어 순서·geometry를 다시 구현하지 않게 한다.

근거:

- `docs/codex-claude-handoff/reviews/2026-07-27-canvas-render-contract-investigation.md`
- `docs/rebuild/specs/019-canvas-geometry-contract.md`
- 레거시 케이스 `renderCase`의 body → user image → template art → camera/magsafe → post guide 순서
- 레거시 액자 `renderFrame`의 body → mat/paper → user image → overlay/text → clock → border 순서

## 범위 (SCOPE)

### 포함

- `@denn/render`의 순수·결정적 preview render-plan 타입과 builder
- 케이스와 액자를 분리한 명시적 입력 union
- 색상 채우기, 직사각형 clip, 이미지 draw-slot, stroke의 최소 명령 vocabulary
- 스펙 019 geometry 함수 재사용
- 케이스 단일 zone과 percent multi-zone의 독립 transform 지원
- 비회전 액자 단일 이미지 zone
- 레이어 순서와 stable layer id
- 실패를 throw하지 않는 Result와 안전한 진단
- JSON-safe·직렬화 가능한 plan
- 입력 불변성, 결정성, 비유한 수치 차단 unit test

### 제외(하지 않을 것)

- `CanvasRenderingContext2D` executor 또는 실제 `ctx.*` 호출
- `<canvas>`, React hook/component, `apps/mockup` 연결
- 실제 이미지 객체·decode·fetch·download
- 이미지 URL, base64, token, storagePath를 render plan에 포함
- CORS/crossOrigin/taint 검증
- 썸네일 projection 계약 변경
- pointer/mouse/touch/drag/wheel/pinch
- zoom 정책 또는 zoom anchor 결정
- 액자 이미지 회전
- text zone, clock 실제 draw, watermark, grain, gloss
- camera/magsafe/dieline의 실제 path 수학
- print pixel/DPI, off-DOM print canvas, PNG/blob
- DPR cap 결정 또는 Canvas backing adapter
- 주문·저장·시안공간·카카오
- Firebase SDK/Auth/write·Rules/CORS·Hosting·배포
- 실제 Firebase GET·이미지 다운로드·live test
- 운영 HTML·관리자 앱·POC·디자인 PNG 변경
- 신규 패키지 설치

## 대상 (WHERE)

구현 대상:

- `packages/render/src/plan/types.ts`
- `packages/render/src/plan/build.ts`
- `packages/render/src/plan/index.ts`
- `packages/render/src/index.ts`
- 같은 경계의 unit test·합성 fixture

파일명은 저장소 관례에 맞게 최소 조정할 수 있다. 공개 계약과 책임 경계는 바꾸지 않는다.

참조만 하고 변경하지 않을 대상:

- `apps/mockup/**`
- `apps/admin/**`
- `packages/shared/**`
- `packages/firebase/**`
- `packages/spaces/**`
- `packages/ui/**`
- `denn-mockup-tool.html`
- `denn-admin.html`
- Firebase 설정·Rules
- `poc/**`
- 기존 결과·디자인 PNG

## 구현 지시 (WHAT / HOW)

### 1. 순수 Result 계약

권장 공개 함수:

```ts
buildPreviewRenderPlan(input: PreviewRenderPlanInput): RenderPlanResult
```

계약:

- 같은 JSON-safe 입력은 항상 구조와 순서가 같은 plan을 반환한다.
- Date, random, 전역 상태, DOM, Canvas, React, Firebase, IO를 사용하지 않는다.
- 입력을 변경하지 않는다.
- 정상적인 잘못된 입력에 throw하지 않는다.
- 성공 plan의 모든 숫자는 finite이다.
- 오류·진단에는 상품명, URL, base64, token, storagePath 또는 원본 catalog 객체가 없다.
- plan은 `JSON.stringify` 가능한 plain object/array/string/number/boolean만 포함한다.

권장 오류 코드:

```ts
type RenderPlanErrorCode =
  | "INVALID_KIND"
  | "INVALID_ID"
  | "INVALID_COLOR"
  | "INVALID_ZONE"
  | "INVALID_TRANSFORM"
  | "GEOMETRY_ERROR"
  | "NON_FINITE_RESULT";
```

geometry 실패를 성공 plan이나 빈 plan으로 숨기지 않는다. 원 geometry code를 그대로 payload에 복사할 필요는 없으며, 필요하면 식별정보 없는 제한된 `causeCode` union만 둔다.

### 2. 입력은 케이스·액자를 분리한다

하나의 거대한 optional 필드 객체를 만들지 않는다.

```ts
type PreviewRenderPlanInput = CasePlanInput | FramePlanInput;

interface CasePlanInput {
  readonly kind: "case";
  readonly logicalCanvas: Size;
  readonly bodyColor: SafeCssColor;
  readonly image: ImageIntrinsicSize;
  readonly defaultTransform: ImageTransform;
  readonly zones: readonly CaseImageZone[];
}

interface FramePlanInput {
  readonly kind: "frame";
  readonly logicalCanvas: Size;
  readonly frameRect: Rect;
  readonly imageZone: Rect;
  readonly frameColor: SafeCssColor;
  readonly matColor: SafeCssColor;
  readonly image: ImageIntrinsicSize;
  readonly transform: ImageTransform;
}
```

구체 타입은 조정 가능하지만 다음 의미를 보존한다.

- 케이스는 zone별 transform을 가질 수 있다.
- 액자는 이번 스펙에서 비회전 단일 transform만 가진다.
- 케이스와 액자의 차이를 optional flags로 뭉개지 않는다.
- 이미지 source는 opaque `imageRef` 또는 stable id만 사용한다.
- `imageRef`는 URL이 아니며 executor가 후속 스펙에서 실제 source와 결합하기 위한 식별자다.
- plan이나 오류에 실제 catalog item을 보관하지 않는다.

### 3. 안전한 색상 입력

Canvas executor에 그대로 전달할 색상은 임의 CSS 문자열 전체를 허용하지 않는다.

- 최소 계약은 `#RRGGBB` 대문자/소문자 hex만 허용한다.
- 알파, CSS 함수, `url(...)`, CSS 변수, named color는 이번 스펙에서 제외한다.
- 입력을 임의로 보정하지 않는다.
- 유효하지 않으면 `INVALID_COLOR`.

웜 토프 토큰값을 render 패키지 기본값으로 복제하지 않는다. 색상은 호출자가 명시한다.

### 4. 최소 draw-command vocabulary

이번 스펙의 공개 command는 다음 최소 집합만 허용한다.

```ts
type PreviewDrawCommand =
  | { type: "fill-rect"; layerId: string; rect: Rect; color: HexColor }
  | {
      type: "draw-image-cover";
      layerId: string;
      imageRef: string;
      clipRect: Rect;
      drawRect: Rect;
    }
  | {
      type: "stroke-rect";
      layerId: string;
      rect: Rect;
      color: HexColor;
      width: number;
    };
```

필요 시 `save/restore/clip`을 별도 명령으로 노출하지 않고 `draw-image-cover.clipRect`에 포함한다. 실제 executor는 이 명령 하나를 save → beginPath/rect/clip → drawImage → restore로 실행한다.

금지:

- function/callback
- Canvas/Image/DOM 객체
- URL/base64/token
- catalog raw item
- 불명확한 `payload: unknown`
- 임의의 Canvas method name/string argument 배열

### 5. stable layer id와 순서

명령 순서는 의미 계약이다.

케이스 최소 순서:

1. `case:body`
2. zone index 오름차순의 `case:user-image:<zone-id>`
3. 선택적 안전영역 stroke가 입력에 명시된 경우 `case:guide:<zone-id>`

액자 최소 순서:

1. `frame:body`
2. `frame:mat`
3. `frame:user-image`
4. `frame:inner-border`

이번 입력에 실제 template art/camera/magsafe/text/clock 데이터가 없으므로 가짜 command를 만들지 않는다. 레거시 전체 레이어 순서를 완료했다고 주장하지 않는다.

`layerId` 규칙:

- 비어 있거나 공백뿐이면 거부한다.
- 입력 id를 그대로 로그/오류에 복제하지 않는다.
- 중복 layer id가 생기면 성공시키지 않는다.
- zone 출력 순서는 입력 배열 순서가 아니라 명시적으로 `order` 오름차순, 동률이면 원래 index 오름차순으로 고정한다.
- `order`가 없다면 원래 index만 사용한다. 임의 이름 정렬을 하지 않는다.

### 6. 케이스 plan

- `logicalCanvas` 전체에 body fill을 먼저 생성한다.
- zone rect가 percent면 스펙 019 `percentRectToLogical`로 변환한다.
- 각 zone의 transform은 zone transform → default transform 순서의 명시적 fallback만 허용한다.
- transform을 병합하거나 원본을 변경하지 않는다.
- 각 zone은 스펙 019 `computeCoverDrawRect(... clampPan:true)`를 사용한다.
- `clipRect`는 zone logical rect다.
- `drawRect`는 geometry 결과다.
- multi-zone은 zone마다 독립 transform이다.
- hidden/disabled zone 정책을 임의로 추가하지 않는다.
- zone id 중복·빈 id·0 크기·비유한 수치는 실패다.

### 7. 액자 plan

- frame body fill → image-zone 주변 mat fill → user-image → inner-border 순서를 고정한다.
- body와 mat의 정확한 시각효과(grain/shadow/gloss)는 구현하지 않는다.
- `frameRect`와 `imageZone`은 명시적 logical rect로 받는다.
- `imageZone`이 `frameRect` 밖이어도 이번 계약에서 임의 clamp하지 않는다. 단 유효한 양수 finite rect여야 한다.
- user image는 스펙 019 `computeCoverDrawRect(... clampPan:true)`를 사용한다.
- 회전값을 입력 타입에 추가하지 않는다.
- `inner-border` width/color는 호출자가 명시한 경우에만 생성한다.

### 8. 진단

경고가 필요하면 다음처럼 제한한다.

```ts
interface RenderPlanIssue {
  readonly code: "DUPLICATE_LAYER_ID" | "DUPLICATE_ZONE_ID";
  readonly sourceIndex?: number;
}
```

- path, 원본 id, 상품명, source URL을 넣지 않는다.
- 치명적 계약 위반은 `ok:false`로 반환하며 일부 plan을 성공처럼 반환하지 않는다.
- 구현상 경고가 필요하지 않다면 warning 배열을 억지로 만들지 않는다.

### 9. 기존 placeholder API

- 스펙 019 geometry export를 유지한다.
- 기존 `RenderInput`, `RenderOutput`, `RenderResult`, `RENDER_NOT_IMPLEMENTED`를 제거하거나 실제 renderer 완료로 바꾸지 않는다.
- 이번 것은 render **plan**이지 Canvas executor가 아니다.
- `RENDER_NOT_IMPLEMENTED` 문구가 이번 상태와 충돌하면 “Canvas executor/print export는 후속”이라는 사실만 정확히 정정한다.
- 기존 공개 API를 깨지 않는다.

### 10. 구현하지 말아야 할 확장

- `ctx` structural interface 또는 fake context executor를 추가하지 않는다.
- 앱에 합성 Canvas 데모를 붙이지 않는다.
- 스크린샷을 생성하지 않는다.
- 실제 thumbnail source를 `imageRef`에 넣지 않는다.
- DPR cap 2/4를 선택하지 않는다.
- layer plan에 print mode를 옵션으로 넣지 않는다.
- case/frame을 `kind` 없는 단일 optional 구조로 합치지 않는다.
- clock/text/template-art를 빈 placeholder command로 만들지 않는다.

## 검증 절차 (VERIFY)

### A. 정적 경계

- [ ] 신규 의존성 0, manifests·lockfile diff 0
- [ ] `@denn/render` 런타임 React/Firebase/DOM/Canvas/IO 참조 0
- [ ] `apps/**`, shared, firebase, spaces, ui 변경 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 변경 0
- [ ] 실제 네트워크·live test·deploy 0
- [ ] 기존 geometry 공개 API·테스트 무회귀

### B. 결정성과 안전성

- [ ] 같은 deep-frozen 입력을 두 번 호출하면 deep-equal plan
- [ ] 입력 객체·zone·transform 비변형
- [ ] 성공 plan `JSON.stringify` 가능
- [ ] 성공 plan의 모든 number finite
- [ ] command에 URL/base64/token/storagePath/catalog raw object 없음
- [ ] Date/random/global state 사용 0
- [ ] 빈/공백 id, 중복 zone/layer id 거부
- [ ] 비유한·0·음수 크기와 scale 거부
- [ ] geometry 오류가 성공 빈 plan으로 바뀌지 않음
- [ ] hex 이외 색상 거부

### C. 케이스 unit

- [ ] 단일 full-canvas zone: body → image 순서
- [ ] percent zone의 non-zero canvas 계산
- [ ] wide/tall image cover drawRect는 스펙 019 수식과 일치
- [ ] pan clamp 결과가 draw command에 반영
- [ ] zone transform이 default보다 우선
- [ ] transform 없는 zone은 default 사용
- [ ] multi-zone은 독립 transform
- [ ] 명시 order 오름차순, 동률은 source index
- [ ] guide 명시 시 image 뒤 stroke, 미명시 시 command 없음
- [ ] 가짜 camera/magsafe/template-art command 0

### D. 액자 unit

- [ ] body → mat → image → inner-border 순서
- [ ] image-zone cover/clip 정확성
- [ ] inner-border 미명시 시 command 없음
- [ ] 회전 관련 field/command 없음
- [ ] shadow/grain/gloss 가짜 command 없음
- [ ] 입력 transform 비변형

### E. 오류·누출 unit

- [ ] invalid kind/id/color/zone/transform 각각 안전 실패
- [ ] overflow geometry → `GEOMETRY_ERROR` 또는 `NON_FINITE_RESULT`
- [ ] 오류 직렬화 결과에 입력 id·URL marker·token marker 없음
- [ ] `imageRef`는 안전한 합성 id만 테스트하며 URL 형태 입력은 거부
- [ ] `data:`, `blob:`, `http:`, `https:`, `javascript:` 형태 imageRef 거부

### F. 전체 게이트

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] 실행 전후 `pnpm-lock.yaml` diff 0
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test:unit`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] `git diff --check`
- [ ] E2E는 기존 회귀만 확인하며 새 Canvas E2E로 보고하지 않음
- [ ] E2E exit 0, preview 포트 해제, 저장소 소속 신규 Vite/esbuild 잔류 0

### G. 금지어 판정

신규 non-test plan 코드에 다음 런타임 사용이 없어야 한다.

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
Date
Math.random
```

타입명·주석·명령 type 문자열의 `draw-image-cover`는 실제 Canvas 호출이 아니다. grep 결과만으로 판단하지 말고 import와 실행 코드를 확인한다.

## 완료 정의 (DONE)

다음을 모두 만족해야 완료다.

- `@denn/render`에 케이스·액자 preview plan builder가 공개됐다.
- 같은 입력은 같은 JSON-safe 명령 배열을 만든다.
- 케이스와 액자의 입력 계약·레이어 순서가 분리돼 있다.
- 모든 이미지 배치는 스펙 019 geometry 결과를 사용한다.
- plan에 실제 URL/base64/token/storagePath/catalog raw object가 없다.
- 실제 Canvas/DOM/React/Firebase/IO가 추가되지 않았다.
- 이미지/CORS/pointer/text/clock/print/DPR 정책을 시작하지 않았다.
- 기존 전체 게이트가 통과한다.
- 코드/test 커밋과 DONE/handoff 문서 커밋을 분리한다.
- HEAD=origin, ahead/behind 0/0, clean으로 Codex 재검증을 요청한다.

## 위험 (RISK)

- 이번 plan은 전체 레거시 레이어를 구현하지 않는다. 최소 body/mat/image/border/guide만 고정하며 template art·camera·magsafe·text·clock은 후속이다.
- plan 통과는 실제 Canvas 픽셀 출력, CORS-clean, 선명도 또는 실기기 성능을 증명하지 않는다.
- `imageRef`는 source가 아니라 안전한 결합 키다. 후속 executor가 이를 URL로 간주하면 신뢰 경계가 깨진다.
- 액자 회전과 print는 이번 plan에 포함되지 않으므로 같은 command를 무조건 재사용할 수 없다.
- 앱 통합 전에 executor의 save/clip/restore 균형과 예외 정리가 별도 검증돼야 한다.

롤백:

1. DONE/handoff 문서 커밋
2. render-plan 코드/test 커밋

순서로 역 `git revert`. 운영/Firebase/배포 롤백은 없어야 한다.

## QUESTIONS

- 없음. 아래 항목은 의도적으로 후속에 남긴다.
  - Canvas executor와 실제 DOM integration
  - 제품 DPR cap
  - 실제 이미지/CORS-clean
  - pointer zoom anchor
  - 액자 회전
  - template art·camera·magsafe·text·clock
  - print DPI와 주문 실패 정책

---

### DONE (Claude) — 2026-07-27

- **구현:** `@denn/render`에 `buildPreviewRenderPlan(input)` — 순수·결정적·JSON-safe preview render **plan**(Canvas executor 아님). `packages/render/src/plan/{types,build,index}.ts` + `src/index.ts`에 `export * from "./plan"`(geometry export·placeholder API 유지, `RENDER_NOT_IMPLEMENTED` 문구만 "Canvas executor+print export 후속"으로 정정).
- **입력 분리:** `CasePlanInput | FramePlanInput`(kind 태그, optional flag 병합 없음). command vocabulary=`fill-rect`/`draw-image-cover`(clipRect가 save→clip→drawImage→restore 대표)/`stroke-rect`만.
- **순서/id:** 케이스 `case:body`→정렬 zone별 `case:user-image:<id>`→(guide 명시) `case:guide:<id>`; 액자 `frame:body`→`frame:mat`→`frame:user-image`→(innerBorder 명시) `frame:inner-border`. 정렬=order 오름차순(미지정=원래 index)·동률 index. 가짜 template/camera/magsafe/text/clock/watermark command 0.
- **geometry 재사용:** 배치=스펙 019 `computeCoverDrawRect(clampPan:true)`, percent zone=`percentRectToLogical`. transform 병합·변경 없음(zone→default fallback). case zone별 독립 transform, frame 비회전 단일 transform.
- **안전 경계:** 색상 `#RRGGBB`만(그 외 `INVALID_COLOR`); 제한된 합성 식별자(zone.id+imageRef 공통 문법 `^[A-Za-z0-9][A-Za-z0-9._-]*$`·길이 1..128; URL 형태·공백(trim 안 함)·control char·일반 **padded** base64 차단, **secret detector 아님**(허용 문자만으로 구성된 token/secret/unpadded base64 여부는 판별 불가)→`INVALID_ID`); **builder는 source URL/token/storagePath·raw catalog를 새로 생성·복사하지 않음**(현 fixture 검사); plan은 caller의 합성 imageRef만 담음(caller가 URL/token/base64/secret을 imageRef에 넣지 않아야 하고, executor는 이를 URL이 아닌 메모리 신뢰 image binding map의 lookup key로만 사용); JSON-safe·성공 plan 전 number finite(`NON_FINITE_RESULT` 안전망); 결정적(Date/random/global 0).
- **오류 계약:** `INVALID_KIND/ID/COLOR/ZONE/TRANSFORM`·`GEOMETRY_ERROR(causeCode)`·`NON_FINITE_RESULT`. throw 없음, 중복/빈 id 치명적, geometry 실패를 성공/빈 plan으로 숨기지 않음.
- **게이트:** frozen diff 0·신규 의존성 0 / format·lint·typecheck / **unit 372**(plan 75 신규) / build / **e2e 49 PASS·exit 0**(기존 회귀만, 새 Canvas E2E 없음) / check PASS / `git diff --check` clean.
- **금지어(§G) 0:** plan source에 document/window/Canvas/getContext/drawImage/setTransform/devicePixelRatio/ResizeObserver/Image/fetch/firebase/Date/Math.random 런타임 참조 0(매치는 전부 주석/타입doc). plan 외부 import=`../geometry`뿐.
- **무변경:** `apps/**`·shared·firebase·ui·spaces·운영 HTML·Firebase 설정/Rules·POC·PNG. deploy 0.
- **미검증:** 실제 Canvas 픽셀·CORS-clean·선명도·실기기 = plan으로 증명 불가(후속). `imageRef`=결합 키(URL 아님). 회전·print·template-art·camera·magsafe·text·clock·DPR cap = 미착수. 커밋: 코드/test와 문서 분리(`spec 020:`). 핸드오프 `docs/2026-07-27-spec-020-deterministic-render-plan-handoff.md`.

### DONE 보완 (Claude) — 2026-07-27 (Codex "수정 후 재검증" 3건)

- **[1] 런타임 malformed 입력 throw 방지:** 모든 nested 입력을 사용 전 shape 검사(`isObj/isSize/isRect/isTransform` + `unknown` 대상 `isFiniteNum/isFinitePositive`). null/undefined/primitive/부분 객체(입력·zones 항목·logicalCanvas·image·default/zone transform·zone.rect·frameRect/imageZone/transform·guide·innerBorder)는 **throw 없이** 해당 `INVALID_*` 반환. 엔트리 가드 `isObj(input)`.
- **[2] 안전 식별자 강화:** zone.id·imageRef 공통 문법 **`^[A-Za-z0-9][A-Za-z0-9._-]*$`, 길이 1..128**. URL 형태(`:`·`/`)·공백(선행/후행 포함, **trim 안 하고 거부**)·control char·일반 **padded** base64(`+`/`=`)를 차단(→URL 형태 zone.id가 layerId 미도달). **secret detector 아님**(허용 문자만으로 구성된 token/secret/unpadded base64 여부는 판별 불가; padding 없는 영숫자 token은 통과) — caller가 URL/token/base64/secret을 imageRef에 전달하지 않아야 함. 이전 `trim()`+scheme-prefix 검사(선행 공백 URL 통과)를 대체.
- **[3] zone.order 유한 검증:** order 존재 시 `Number.isFinite` 필수(NaN/±Infinity→`INVALID_ZONE`). 유한 음수·소수 허용(정렬 의미 유지), order 없으면 source index fallback 유지.
- **테스트 +40**(malformed 22·식별자 14·order 5 등) → plan **35→75**. 정상 결과 무변경.
- **재검증:** frozen diff 0·신규 의존성 0 / format·lint·typecheck / **unit 372** / build / **e2e 49 PASS·exit 0**(기존 회귀만) / check PASS / `git diff --check` clean. malformed table throw 0, 성공 plan·오류 직렬화 URL/base64/token 누출 0. `apps/**`·Firebase·운영본·POC·PNG 무변경.

### Codex 최종 판정 — 승인 가능 (2026-07-27)

- **판정:** 스펙 020 = **승인 가능**. **승인 기준 HEAD = `07657fb`**.
- **확정 계약:** 결정적·JSON-safe preview render-plan(`buildPreviewRenderPlan`), 케이스·액자 입력·layer 순서 분리, 스펙 019 geometry 재사용, malformed runtime 입력 throw 방지, `zone.order` NaN/±Infinity 차단, restricted synthetic identifier 문법(`^[A-Za-z0-9][A-Za-z0-9._-]*$`·1..128) 확정.
- **식별자 신뢰 경계(정확 기록):** 문법은 URL 형태·공백·control char·일반 padded base64 delimiter를 거부하되 **semantic secret detector가 아님**(허용 문자만의 token/secret/unpadded base64는 판별 불가). **caller는 imageRef에 URL/base64/token/secret을 전달 금지**, **후속 executor는 imageRef를 URL이 아닌 메모리 신뢰 image binding-map lookup key로만 사용**, builder는 source URL/token/storagePath/raw catalog를 생성·복사하지 않음.
- **최종 게이트:** frozen diff 0·신규 의존성 0 / format·lint·typecheck / **unit 372** / build / **e2e 49 PASS·exit 0**(기존 회귀만, 새 Canvas E2E 없음) / check PASS / `git diff --check` clean. 금지어(§G) 런타임 참조 0.
- **미검증 범위(후속):** 실제 Canvas 픽셀·CORS-clean·이미지 load·선명도·pointer·회전·text/clock·print·DPR cap·실기기·배포 = **미착수**(plan으로 증명 불가). template-art/camera/magsafe/text/clock 레이어, 주문 실패 정책 = 후속 스펙.
- **다음:** 후속 순서(스펙 019 사전 조사 §표10) = Canvas executor(deterministic renderer) → image/CORS → pointer → text/clock → print. Codex 다음 스펙 지시 대기.

### 스펙 024 정정 (2026-07-28) — `FramePlanInput`에 `matRect` 추가

과거 승인 기록과 게이트 수치(스펙 020 승인 기준 HEAD `07657fb`, unit 372 / e2e 49)는 **그대로 보존**한다. 아래는 스펙 024가 정정한 **현재 계약**이다.

- `FramePlanInput`에 **필수 `matRect`** 가 추가됐다. 순서는 `frameRect`(프레임 body 전체) → `matRect`(프레임 band 안쪽 mat 채움) → `imageZone`(mat 안쪽 사진 clip/cover)이다.
- `frame:mat` command의 rect가 **`imageZone` → `matRect`** 로 바뀌었다. `frame:body`=`frameRect`, `frame:user-image`=clip·cover `imageZone`, 선택적 `frame:inner-border`=`imageZone`은 그대로다. command 어휘·순서·layer id는 무변경.
- 성공 plan은 **`logicalCanvas ⊇ frameRect ⊇ matRect ⊇ imageZone`** 을 정확히 만족해야 한다(경계 공유 허용, tolerance·clamp 없음). 유한 입력의 far-edge overflow는 `NON_FINITE_RESULT`, 유한하지만 바깥이면 `INVALID_ZONE`.
- `matRect ?? imageZone` 같은 호환 fallback은 없다. 기존 fixture/test caller는 모두 명시적으로 수정됐다.
- 프레임 rect/size/transform은 **한 번만 읽어 plain snapshot** 으로 복사되며, command 생성은 caller 객체를 다시 읽지 않는다. hostile getter·Proxy trap·revoked Proxy는 이제 **throw 없이** `INVALID_ZONE`이다(기존 error code 집합 무확장).
- **케이스 plan 계약·정렬·geometry는 무변경.** 근거: `denn-mockup-tool.html:3120-3130`(mat은 band 안쪽 전체, 사진은 `P=8` inset). 상세는 `docs/rebuild/specs/024-frame-plan-mat-image-zone-separation.md`.
