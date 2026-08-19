# 스펙 057 후보 — space view-only frame plan composition 경계 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / LOCAL_ONLY / NO_NETWORK**

## 1. 목적

스펙 054의 catalog/scene 참조, 스펙 055의 proof URL·neutral transform, 스펙 056의 decoded proof owner를
현재 frame product plan으로 합성할 수 있는 최소 경계를 정한다. 이번 단위는 조사와 결정 선택지만 기록하며
제품 구현은 시작하지 않는다.

## 2. 확인된 현재 경계

### 2.1 준비된 입력과 trust 순서

- `resolveSpaceSceneReferences`는 runtime catalog/scene을 다시 읽고 exact template, visible size,
  compatibility, canonical solid color, HTTPS photo 후보를 검증한다
  (`apps/mockup/src/space/scene-reference.ts:52-173`).
- `resolveSpaceProofTransform`은 legacy transform이 정확히 neutral일 때만 current identity로 투영한다
  (`apps/mockup/src/space/proof-image.ts:114-159`).
- proof owner의 ready state는 synthetic `imageRef`와 positive intrinsic size를 제공하고, 실제 drawable은
  별도 bindings에만 둔다(`apps/mockup/src/space/proof-image-owner.ts:10-43,201-218`).

따라서 합성기는 raw URL이나 raw ID를 plan에 넣지 않고 위 세 경계를 순서대로 통과해야 한다. 실패 시
이전 plan이나 부분 plan을 유지하지 않는 whole-plan fail-closed가 필요하다.

### 2.2 geometry와 plan의 추가 입력

`projectFramePreviewGeometry`는 frame size/template의 geometry, text zone, `clockPreview`를 투영한다
(`packages/shared/src/catalog/preview/project.ts:391-399`). `buildFrameProductPlan`은 geometry 외에 canonical
frame color, positive integer `logicalWidth`, proof `imageRef`/intrinsic/transform, optional template art,
text values와 필요 시 `measureText`를 요구한다
(`apps/mockup/src/canvas/productPlan.ts:305-390`).

`logicalWidth`는 현재 editable composer가 측정한 컨테이너에서 정한다. 순수 합성기가 임의 기본 폭을
만들 근거는 없다. nonempty text의 실제 폭도 브라우저 font 상태 없이 계산할 수 없으므로 measure port를
주입해야 한다. 실제 font load/settling은 이 local unit이 증명하지 않는다.

### 2.3 template art

`projectCatalogTemplateArtPlacement`는 `none | stretch | unsupported`를 구분하고,
`projectCatalogTemplateImage`는 실제 source 후보를 투영한다
(`packages/shared/src/catalog/images/placement.ts`, `packages/shared/src/catalog/images/project.ts`).

- `none`: art 없이 plan을 만들 수 있다.
- `stretch`: 검증·load가 끝난 external template-art ready ref/binding이 필요하다.
- `unsupported`: legacy-builder crop을 추측하지 않고 실패해야 한다.

이번 합성 경계에서 새 image owner나 network를 열 필요는 없다. required art가 아직 ready가 아니면
부분 frame을 표시하지 않는다.

### 2.4 시계는 frame render plan 밖이다

scene의 `clockOn`은 legacy capture/replay 값이지만 현재 `clockPreview`는 hardware 위치 정보이고 frame
render plan에 포함되지 않는다. editable `PreviewComposer`도 시계를 Canvas plan이 아니라 별도 DOM overlay로
그린다(`apps/mockup/src/preview/PreviewComposer.tsx`). 따라서 `clockOn=true`를 무시한 frame plan을 완전한
scene 재현으로 부를 수 없다.

첫 local plan 합성은 `clockOn === false`만 허용하는 것이 안전하다. `true` 또는 누락은 추측하지 않고
clock unsupported로 닫는다. room/gallery도 계속 unsupported이므로 성공 결과조차
`framePlanReady:true`, `replayComplete:false`여야 한다.

### 2.5 binding과 실행의 한계

plan builder는 drawable을 받지 않고 synthetic ref만 기록하며 executor가 나중에 bindings를 조회한다.
합성기는 proof/template-art owner snapshot과 binding 존재를 확인할 수 있지만 실제 Canvas draw,
CORS-clean, decode 결과를 증명하지 않는다. fake는 호출 순서·오류 매핑·부분 plan 0만 증명한다.

## 3. 권장 합성 순서

1. runtime catalog와 scene을 다시 검증한다.
2. exact catalog references와 canonical frame color를 얻는다.
3. exact-neutral proof transform만 identity로 얻는다.
4. proof owner가 ready이고 해당 synthetic ref binding이 존재하는지 확인한다.
5. frame geometry를 투영한다.
6. template-art placement를 분류하고, 필요할 때만 ready art ref/binding을 요구한다.
7. `clockOn === false`, caller 제공 positive integer logical width, text measure 조건을 확인한다.
8. scene의 다섯 text 값을 zone key에 그대로 매핑해 `buildFrameProductPlan`을 한 번 호출한다.
9. 모든 단계가 성공한 경우에만 plan을 반환한다. 실패 결과에는 URL, raw ID, text, token, element,
   SDK/exception message, 이전 plan을 넣지 않는다.

## 4. 안전 오류 후보

공개 실패는 단계별 safe code만 제공한다.

- `SPACE_VIEW_INVALID_INPUT`
- `SPACE_VIEW_REFERENCE_INVALID`
- `SPACE_VIEW_TRANSFORM_UNSUPPORTED`
- `SPACE_VIEW_PROOF_NOT_READY`
- `SPACE_VIEW_TEMPLATE_ART_UNSUPPORTED`
- `SPACE_VIEW_TEMPLATE_ART_NOT_READY`
- `SPACE_VIEW_CLOCK_UNSUPPORTED`
- `SPACE_VIEW_LAYOUT_INVALID`
- `SPACE_VIEW_TEXT_MEASURE_REQUIRED`
- `SPACE_VIEW_PLAN_FAILED`

코드의 정확한 축약 여부는 구현 계약에서 고정하되 raw 입력/예외를 노출하지 않는다.

## 5. Founder 결정 선택지

### AA-1 — 첫 구현 경계

- **A (권장):** framework-free pure `composeSpaceFramePlan`과 unit만 구현한다. React/App/hook/network/
  Canvas execution은 0이다.
- B: production space UI까지 연결한다. owner·font·layout·Canvas lifecycle이 동시에 열린다.

### AA-2 — 실패 정책과 trust 순서

- **A (권장):** §3 순서를 재검증하고 어떤 실패든 whole-plan fail-closed, 이전/부분 plan 0으로 한다.
- B: 가능한 layer만 만든다. 미완성 scene을 성공처럼 표시할 위험이 있다.

### AA-3 — layout와 text

- **A (권장):** exact positive integer logical width는 caller가 주입하고, nonempty text는 injected
  `measureText`가 없으면 실패한다. default width/font/text 측정 추측은 0이다.
- B: 고정 폭·브라우저 기본 font를 합성기가 선택한다. 실제 view와 달라질 수 있다.

### AA-4 — clock와 완료 의미

- **A (권장):** `clockOn === false`만 plan-ready다. true/누락은 unsupported이며 모든 성공도
  room/gallery 미지원 때문에 `replayComplete:false`다.
- B: clock 상태와 무관하게 frame plan을 성공 처리한다. scene 일부가 조용히 사라진다.

### AA-5 — template art

- **A (권장):** `none`은 허용, `stretch`는 externally ready ref/binding 필수, `unsupported`는 실패한다.
  새 art owner/network는 열지 않는다.
- B: art 미준비/unsupported를 무시하고 frame만 만든다.

## 6. AA-1~AA-5=A의 최소 구현 후보

- `apps/mockup/src/space/frame-plan.ts`
- `apps/mockup/src/space/frame-plan.test.ts`
- spec 057/handoff/STATE/NEXT/CURRENT/live log

기존 scene/proof owner/geometry/product plan은 import만 한다. 계약 변경이 필요하면 STOP한다. App/UI/React
hook, owner 변경, Canvas executor, E2E, package/lockfile, Firebase/Rules/config는 수정하지 않는다.

## 7. 최소 unit 검증 후보

1. invalid catalog/scene/reference/transform은 downstream 0, safe code
2. proof idle/loading/failed 또는 binding 부재는 plan 0
3. logical width invalid는 plan 0
4. nonempty text + measure port 부재/throw/invalid 결과는 plan 0
5. scene text의 정확한 zone mapping과 measure port 전달
6. art none 성공, stretch ready 성공, stretch missing/unsupported 실패
7. `clockOn=false`만 성공; true/누락 실패
8. 성공 plan에는 synthetic refs/canonical color만 있고 URL/raw IDs/element 0
9. hostile getter/port/builder failure는 예외 탈출·부분/이전 plan 0
10. 성공도 `replayComplete:false`; network/Image/Canvas/React 호출 0

## 8. NOT TESTED / 계속 금지

- 실제 Firebase/project/bucket/object/network, real Image decode/CORS-clean: **NOT TESTED**
- 실제 browser font load/measurement, container resize, React StrictMode: **NOT TESTED**
- Canvas executor draw와 시각 정확도, clock/room/gallery 재현: **NOT TESTED / NOT IMPLEMENTED**
- App/UI/hook 연결, E2E, deploy/write/delete/publish: 금지

## 9. 결론

기존 local primitives만으로 frame plan 합성의 순서와 fail-closed 계약은 구현 가능하다. 하지만 clock가 켜진
scene과 room/gallery를 완전 재현할 수 없고 실제 image/font/Canvas도 검증되지 않았다. AA-1~AA-5 결정 전
제품 구현을 시작하지 않는다.
