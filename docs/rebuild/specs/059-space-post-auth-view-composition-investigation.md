# 스펙 059 후보 — space post-auth view composition 경계 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / LOCAL_ONLY / NO_NETWORK**

## 1. 목적

인증 완료 scene을 스펙 058 readiness adapter와 스펙 057 frame composer, 기존 public catalog/Canvas surface에
연결하기 전에 필요한 asset request, catalog load, layout/font lifecycle 경계를 정한다. 이번 단위는 조사와
결정 선택지만 기록하며 실제 network/React/UI 연결은 시작하지 않는다.

## 2. 확인된 현재 경계

### 2.1 space route는 인증 뒤에도 catalog를 로드하지 않는다

`SpacePasswordGate`는 controller ready에서 인증 완료 placeholder만 표시한다. `MockupRoot`는 space link가
있으면 `CatalogApp`을 mount하지 않으므로 public catalog hook/reader도 생성·시작되지 않는다
(`apps/mockup/src/App.tsx`, `space/SpacePasswordGate.tsx`). 이는 현재 “비밀번호 전 catalog/Firebase request 0”
게이트를 보존한다.

frame plan에는 exact catalog document가 필수다. 향후 catalog는 password 성공 뒤 view child가 mount될 때만
기존 singleton `publicCatalogReader`를 통해 시작해야 한다. invalid link, awaiting password, password failure,
space document loading 중에는 public catalog request가 0이어야 한다. catalog retry는 기존 명시 버튼 정책을
따르고 space token/password를 catalog request에 넣지 않는다.

### 2.2 adapter에 전달할 asset request projector가 없다

proof는 scene photo URL을 스펙 055 trust로 검증해야 한다. template art는 catalog exact template 참조,
placement(`none|stretch|unsupported`), image projection, Firebase public-image trust를 순서대로 거쳐야 한다.
현재 이 로직은 editable `PreviewComposer` 내부 memo와 스펙 057 composer에 나뉘어 있고, 스펙 058 adapter는
이미 결정된 source를 load할 뿐 source를 선택하지 않는다.

React effect가 이 순서를 다시 작성하면 composer가 plan에 승인한 template과 owner가 load한 art가 달라질 수
있다. 따라서 먼저 pure `resolveSpaceFrameAssetRequests(document, scene)` 후보가 필요하다.

성공 출력은 다음처럼 최소화한다.

- proof: owner에 전달할 validated exact source
- template art: `none` 또는 owner에 전달할 trusted `{kind,src}`
- `replayComplete:false`

실패는 safe code만 반환하고 URL/token/raw IDs/text/catalog item을 포함하지 않는다. projector는 load/network/
Image/DOM을 수행하지 않는다.

### 2.3 projector와 composer의 이중 검증은 의도적이다

asset projector는 “무엇을 load할지”를 결정하고, frame composer는 ready resolver가 현재 scene source와
일치하는지 다시 검증한 뒤 plan을 만든다. projector 성공만으로 plan-ready를 주장하지 않는다. 두 경계는
같은 shared projection/trust 함수를 사용해야 하며 fallback·자동 선택·URL 변환을 추가하지 않는다.

adapter load 순서는 proof/art request가 모두 성공한 뒤 수행한다. unsupported/invalid art에서 proof만 먼저
load해 partial network를 만들지 않는 방향이 안전하다. scene/catalog identity 변경 시 기존 adapter를
clear하거나 새 owner generation으로 교체하고 이전 plan을 즉시 제거해야 한다.

### 2.4 layout width

`buildFrameProductPlan`은 positive integer logical width를 요구하며 default가 없다. editable composer는
container `ResizeObserver`와 `resolveFrameLogicalWidth`를 사용한다. view-only 화면도 실제 content box를
측정해 같은 cap/rounding helper를 사용해야 하며, 첫 측정 전·0/NaN/hidden 상태에서는 Canvas를 mount하지
않는다. fixed 400/500px 추측이나 viewport 직접 사용은 금지한다.

ResizeObserver와 Canvas surface observer는 역할이 다르다. 전자는 plan logical width, 후자는 backing DPR을
소유한다. 하나가 다른 계산을 대신하지 않는다.

### 2.5 font measurement

scene text가 실제 template zone에 nonempty로 존재하면 measure port가 필요하다. 기존 composer는
`document.fonts.ready` 뒤 각 exact shorthand를 `fonts.check()`하고 detached canvas 2D `measureText`를
사용한다. view-only도 같은 fail-closed 조건을 공유해야 한다.

font API/2D context 부재, ready reject, requested family unavailable, measurement throw/nonfinite이면 plan/Canvas
0이다. fallback font로 조용히 성공시키지 않는다. text가 없으면 font gate 때문에 image-only frame을 막을
이유는 없다.

### 2.6 Canvas와 UI 의미

`PreviewCanvasSurface`는 ready plan과 combined bindings를 받아 draw하며 product 내용을 결정하지 않는다.
향후 view-only child는 plan 성공일 때만 surface를 mount하고 fixed Korean accessible name과 safe loading/error
copy를 사용해야 한다. editable controls, upload picker, pan/zoom/rotate, print/download, order/Kakao CTA는 없다.

스펙 057 정책상 `clockOn === false`만 성공하며 room/gallery는 계속 미지원이다. frame Canvas 성공을 전체
space replay 완료로 표시하지 않는다.

## 3. Founder 결정 선택지

### CC-1 — post-auth catalog load 목표 정책

- **A (권장):** password open 성공 뒤 view child가 mount될 때만 기존 public catalog singleton을 시작한다.
  pre-auth/invalid/error request 0, retry는 명시 행동만 허용한다.
- B: space route 진입 즉시 catalog를 병렬 load한다. 기존 pre-auth request 0 경계가 바뀐다.

### CC-2 — asset source 결정

- **A (권장):** pure asset-request projector를 두고 exact reference/placement/image trust가 모두 성공한 뒤
  proof/art를 함께 adapter에 load한다. partial load 0이다.
- B: React effect가 proof/art source를 각각 직접 계산한다. plan 검증과 드리프트할 수 있다.

### CC-3 — layout

- **A (권장):** measured content box + 기존 `resolveFrameLogicalWidth`; valid width 전 Canvas 0.
- B: 고정 logical width를 사용한다. 실제 responsive view와 불일치한다.

### CC-4 — fonts와 Canvas

- **A (권장):** nonempty authored text만 fonts.ready/check/2D measure를 요구하고 실패 시 Canvas 0. 성공 plan만
  `PreviewCanvasSurface`에 전달한다.
- B: fallback font 또는 부분 plan을 표시한다.

### CC-5 — 다음 구현 단위

- **A (권장):** pure `frame-asset-request` + unit만 구현한다. React hook/App/public catalog request/Image/
  Canvas E2E는 0이다.
- B: post-auth UI까지 한 번에 연결한다. network/layout/font/Image/Canvas lifecycle이 동시에 열린다.

## 4. CC-1~CC-5=A의 첫 최소 구현 후보

- `apps/mockup/src/space/frame-asset-request.ts`
- `apps/mockup/src/space/frame-asset-request.test.ts`
- spec 059/handoff/STATE/NEXT/CURRENT/live log

기존 App, password gate, catalog hook/reader, readiness adapter, owners, frame composer, Canvas surface는 변경하지
않는다. projector가 기존 trust/projection API로 표현되지 않으면 STOP한다.

## 5. 최소 unit 검증 후보

1. invalid catalog/scene/reference/proof는 safe failure, source 출력 0
2. exact proof source만 성공
3. art none은 proof + none
4. art stretch는 exact projection + public-image trust를 통과한 source만 성공
5. unsupported builder crop, unavailable/untrusted art는 whole request failure
6. proof/art 중 하나 실패 시 adapter/network 호출 개념 0(함수 자체 IO 0)
7. hostile/drifting input 예외 격리, mutation 0
8. 성공 출력 외 URL/token/raw ID/text/catalog item 누출 0
9. replayComplete false 고정
10. import/call에서 Image/fetch/React/Canvas/timer/retry 0

## 6. NOT TESTED / 계속 금지

- 실제 public catalog/proof/art network, Firebase/project/object/CORS/Image decode: **NOT TESTED**
- React hook/StrictMode, ResizeObserver, fonts, Canvas draw/visual accuracy: **NOT TESTED / NOT IMPLEMENTED**
- clock true/누락, room/gallery, deploy/write/delete/publish/order: 미지원/금지

## 7. 결론

실제 post-auth UI 전에 source 선택을 단일 pure projector로 고정해야 한다. CC-1~CC-5 결정 전 구현하지 않는다.
