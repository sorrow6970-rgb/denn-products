# 스펙 020 핸드오프 — 결정적 Canvas render-plan 계약 (@denn/render)

날짜: 2026-07-27
브랜치: `rebuild/modern-studio` · 기준 HEAD `9939d70`
범위: 스펙 020만. Canvas executor·앱·이미지 load/CORS·pointer·text/clock·print는 미착수. 운영본·admin·POC·Firebase·PNG·`apps/**` 무변경.

---

## 1. 변경 파일 (코드/테스트 커밋)

- `packages/render/src/plan/types.ts` (신규) — case/frame 입력 union, `HexColor`, `PreviewDrawCommand` vocabulary, `RenderPlanResult`/오류 코드
- `packages/render/src/plan/build.ts` (신규) — `buildPreviewRenderPlan`
- `packages/render/src/plan/build.test.ts` (신규) — 75 케이스
- `packages/render/src/plan/index.ts` (신규) — 공개 barrel
- `packages/render/src/index.ts` (수정) — `export * from "./plan"` 추가. **geometry export + placeholder API 유지**, `RENDER_NOT_IMPLEMENTED` 문구만 정정("Canvas executor(ctx draw)+print/PNG export는 후속, geometry+preview render plan은 완료")

## 2. 공개 API

```ts
buildPreviewRenderPlan(input: PreviewRenderPlanInput): RenderPlanResult
```

- 입력 union: `CasePlanInput | FramePlanInput`(각각 `kind:"case"|"frame"` 태그, **optional flag로 합치지 않음**).
- 출력: `{ ok:true, plan:{ kind, logicalCanvas, commands } } | { ok:false, code, causeCode? }`.
- command vocabulary(최소): `fill-rect{layerId,rect,color}` · `draw-image-cover{layerId,imageRef,clipRect,drawRect}`(executor가 save→clip→drawImage→restore로 실행) · `stroke-rect{layerId,rect,color,width}`.
- 공개 타입: `CasePlanInput`·`FramePlanInput`·`CaseImageZone`·`ZoneRect`·`StrokeSpec`·`ImageIntrinsicSize`·`HexColor`·`PreviewDrawCommand`·`PreviewRenderPlan`·`RenderPlanResult`·`RenderPlanErrorCode`.

## 3. 명령 순서 (stable layer id)

- **케이스:** `case:body` → 정렬된 zone별 `case:user-image:<zone-id>` → (guide 명시 zone만) `case:guide:<zone-id>`.
- **액자:** `frame:body`(frameRect) → `frame:mat`(imageZone) → `frame:user-image`(imageZone clip) → (innerBorder 명시 시만) `frame:inner-border`.
- 정렬: `order` 오름차순, **미지정 zone은 원래 index를 order로 사용**, 동률은 원래 index. (comparator `(order??index) - (order??index) || index - index`)
- template art·camera·magsafe·text·clock·watermark **가짜 command 없음**(데이터 없음). 전체 레거시 레이어 완료 주장 안 함.

## 4. geometry 재사용

- 모든 이미지 배치 = 스펙 019 `computeCoverDrawRect({zone, image, transform, clampPan:true})`. `drawRect`=결과, `clipRect`=zone logical rect.
- percent zone = `percentRectToLogical({0,0,canvas.w,canvas.h}, percent)`. 케이스는 전체 logical canvas가 container.
- transform 병합·변경 없음. zone transform → default transform 순서의 명시적 fallback만.

## 5. 안전 경계 (누출 방지)

- **색상:** `#RRGGBB`(대소문자 hex)만 허용. 알파/CSS 함수/`url()`/CSS 변수/named color·3자리 hex 거부 → `INVALID_COLOR`. render 기본 색상값(웜 토프 등) 복제 없음.
- **안전 식별자(zone.id + imageRef 공통, 2차 하드닝):** 문법 `^[A-Za-z0-9][A-Za-z0-9._-]*$`, 길이 **1..128**. ASCII 영숫자로 시작 후 영숫자·`.`·`_`·`-`만. URL 형태(`:`·`/`)·공백(선행/후행 포함, **trim 안 하고 거부**)·control char·일반 **padded** base64(`+`/`=`)를 차단 → URL 형태 zone.id가 layerId로 유입 불가. 위반 → `INVALID_ID`. **이것은 secret detector가 아니다**: padding 없는 영숫자 token은 문법상 통과하므로, **caller가 imageRef에 URL/token/base64/secret을 전달하지 않아야 하고** 후속 executor는 imageRef를 URL이 아닌 메모리 신뢰 binding key로만 사용해야 한다. **builder 자체는 source URL/token/storagePath·raw catalog를 새로 생성·복사하지 않는다**(직렬화 검사; plan은 caller의 합성 imageRef만 담음).
- **런타임 malformed 방어(2차 하드닝):** 모든 nested 입력을 사용 전 shape 검사(`isObj/isSize/isRect/isTransform` + `unknown` 대상 `isFiniteNum/isFinitePositive`). null/undefined/primitive/부분 객체(입력·zones 항목·logicalCanvas·image·default/zone transform·zone.rect·frameRect/imageZone/transform·guide·innerBorder)는 **throw 없이** 해당 `INVALID_*` 반환. `zone.order`는 존재 시 `Number.isFinite` 필수(NaN/±Infinity→`INVALID_ZONE`; 유한 음수·소수 허용).
- **JSON-safe:** plan은 plain object/array/string/number/boolean만. function/callback/Canvas/Image/DOM 없음.
- **성공 plan 모든 number finite**(최종 `commandsAllFinite` 안전망 → 아니면 `NON_FINITE_RESULT`).
- **결정성:** 같은 입력 → deep-equal plan. `Date`/`Math.random`/전역 상태 미사용(런타임 참조 0, 주석/타입doc 제외).

## 6. 오류 Result 계약

```ts
type RenderPlanErrorCode =
  "INVALID_KIND" | "INVALID_ID" | "INVALID_COLOR" | "INVALID_ZONE"
  | "INVALID_TRANSFORM" | "GEOMETRY_ERROR" | "NON_FINITE_RESULT";
```

- throw 없음(모두 `{ok:false,code}`). `GEOMETRY_ERROR`에만 식별정보 없는 `causeCode?: GeometryErrorCode`(스펙 019 code) 부착.
- 매핑: kind 오류→`INVALID_KIND` / 빈·공백·중복 id·URL imageRef→`INVALID_ID` / 비-hex 색상→`INVALID_COLOR` / 비유한·0·음수 크기(canvas·rect·zone·image·stroke width)→`INVALID_ZONE` / 비유한·≤0 scale·비유한 pan→`INVALID_TRANSFORM` / geometry 실패(overflow 등)→`GEOMETRY_ERROR(causeCode)` / 최종 plan 비유한 number→`NON_FINITE_RESULT`.
- **geometry 실패를 성공/빈 plan으로 숨기지 않음.** 치명적 계약 위반(중복 id 등)은 `ok:false`(warning 배열 미생성 — 스펙 §8 허용).

## 7. 케이스·액자 공유/비공유

- **공유:** cover 배치·좌표는 스펙 019 함수 하나로 재사용.
- **비공유(분리 유지):** case는 zone별 transform·percent multi-zone·guide, frame은 비회전 단일 transform·mat·inner-border. **kind 없는 단일 optional 구조로 합치지 않음.**
- **미구현(후속):** 액자 회전, print pan-scale, template-art/camera/magsafe/text/clock, DPR cap, image/CORS, pointer.

## 8. unit 항목·개수 (총 75)

- **B 결정성·안전(7):** deep-frozen 2회 deep-equal / 입력·zone·transform 비변형 / JSON 왕복+finite / builder가 source URL/token/storagePath marker 미생성·미복사(fixture) / 빈·공백·중복 id 거부 / geometry overflow가 빈 성공 아님 / 비-hex 색상 거부.
- **C 케이스(9):** body→image 순서+full cover / percent non-zero canvas / wide cover=스펙019 / pan clamp 반영 / zone transform>default / transform 없는 zone=default / multi-zone 독립 / order 오름차순·동률 source index / guide 명시 후 stroke·미명시 없음 / 가짜 camera·magsafe·template·clock command 0.
- **D 액자(5):** body→mat→image(+inner-border 명시 시) 순서 / image-zone cover·clip / body=frameRect·mat=imageZone / rotation·shadow·grain·gloss command 0 / 입력 transform 비변형.
- **E 오류·누출:** invalid kind(+null) / 케이스 zero·nan canvas·image·scale·pan → 코드 / 액자 zone·color·transform → 코드 / 오류 직렬화에 입력 id marker 0 / imageRef `data:/blob:/http:/https:/javascript:` 거부.
- **F 런타임 malformed(22):** null/primitive input·zones 항목 null/primitive·zones 비배열·logicalCanvas/image/transform null·missing·zone.rect null/units 없음·zone.transform null/부분·guide null·frame frameRect/imageZone/transform null·missing·innerBorder null·width 없음 → 각 `INVALID_*`, **throw 0**.
- **G 안전 식별자(14):** 선행 공백+https/data/javascript·후행 공백·newline/tab/control char·colon·slash·base64 +/= 거부, URL 형태 zone.id가 layerId 미도달·직렬화 누출 0, 정상 합성 id(영숫자·.·_·-, ≤128) 통과, >128 거부.
- **H order(5):** NaN/±Infinity→`INVALID_ZONE`, 유한 음수·소수 허용(정렬 유지), order 없으면 source index.

## 9. 전체 게이트

- `corepack pnpm install --frozen-lockfile` exit 0, `pnpm-lock.yaml` diff 0, **신규 의존성 0**.
- `node scripts/check.mjs`: format / lint(`--error-on-warnings`) / typecheck(7) / **unit 372**(스펙 019 297 + plan 75) / build **PASS(exit 0)**.
- `pnpm test:e2e`: **49/49 PASS, exit 0**(기존 회귀만, **새 Canvas E2E 없음**). 종료 후 preview 포트 미점유·저장소 vite/esbuild 잔류 0.
- `git diff --check` clean.

## 10. 금지어 판정 (§G)

plan **source**(non-test)에 `document`·`window`·`HTMLCanvasElement`·`CanvasRenderingContext2D`·`getContext`·`drawImage`·`setTransform`·`devicePixelRatio`·`ResizeObserver`·`Image`·`fetch`·`firebase`·`Date`·`Math.random` **런타임 참조 0**. grep 매치는 전부 주석/타입doc(예 "no Date", "`draw-image-cover` bundles …drawImage")이며 import·실행 코드 아님. plan의 외부 import는 `../geometry`뿐(상대). React/Firebase/DOM/Canvas/IO 0.

## 11. 운영/Firebase 무변경

`apps/**`·shared·firebase·ui·spaces·운영 HTML·`firebase.json`·Rules·POC·디자인/결과 PNG = 무변경. Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0.

## 12. 미검증 / 남은 위험

- plan 통과는 실제 Canvas 픽셀·CORS-clean·선명도·실기기 성능을 **증명하지 않음**.
- `imageRef`는 source가 아니라 안전한 결합 키 — 후속 executor가 URL로 간주하면 신뢰 경계 붕괴.
- 액자 회전·print는 이 plan에 없어 같은 command를 무조건 재사용 불가.
- executor의 save/clip/restore 균형·예외 정리는 앱 통합 전 별도 검증 필요.
- template art·camera·magsafe·text·clock·DPR cap·주문 실패 정책 = 후속(NOT DECIDED/미착수).

## 13. 롤백

DONE/handoff 문서 커밋 → render-plan 코드/test 커밋 순서로 역 `git revert`. 운영/Firebase/배포 롤백 없음.
