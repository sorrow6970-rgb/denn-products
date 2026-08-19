# 스펙 060 후보 — space post-auth frame view composition 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / LOCAL_ONLY / NO_NETWORK**

## 1. 목적

스펙 059까지 준비된 asset request projector, source-bound readiness controller, frame plan composer를
React view로 연결하기 전 lifecycle과 검증 범위를 고정한다. 실제 Firebase/live/deploy는 수행하지 않는다.

## 2. 현재 코드에서 확인한 사실

### 2.1 post-auth child 경계가 없다

`SpacePasswordGate`는 controller `ready`에서 고정 placeholder만 렌더한다. `MockupRoot`의 space branch는
`CatalogApp`을 절대 mount하지 않으므로 인증 뒤 catalog request도 0이다. Hook 규칙상 gate 내부에서 ready일
때 `usePublicCatalog`을 조건 호출할 수 없으므로 별도 child component가 필요하다.

`ready.value`에는 validated `scene` 외에 `ownerLabel`, `createdAt`도 있지만 frame plan에는 scene만 필요하다.
이 문자열을 제목·ARIA·로그로 자동 노출할 근거는 없다.

### 2.2 catalog singleton은 post-auth child에 재사용 가능하다

기존 `usePublicCatalog(publicCatalogReader)`는 mount에서만 controller를 만들고 `start()`한다. singleton reader의
in-flight dedup과 controller generation guard가 StrictMode stale result를 막는다. 따라서 ready child가 mount된
뒤에만 이 hook을 호출하면 승인된 CC-1의 pre-auth request 0을 보존할 수 있다. retry는 기존 retryable catalog
error의 명시 버튼만 사용한다.

### 2.3 readiness controller에는 React ownership wrapper가 없다

`createSourceBoundReadinessController`는 proof/art owner를 독점하고 source-first 교체와 exact binding을 보장한다.
다만 `dispose()`는 영구적이다. 단순 `useRef + cleanup dispose`는 React StrictMode의
mount→cleanup→mount에서 이미 dispose된 controller를 재사용한다. 기존 `useTemplateArtBinding`처럼 cleanup은
owned record에 disposed 표시만 하고 다음 effect body에서 새 controller를 발행하는 wrapper가 필요하다.

asset projector 성공 뒤 proof와 art 요청을 함께 적용한다. art `none`이면 `clearTemplateArt()`를 호출한다.
projector 실패나 scene/catalog identity 변경에서는 이전 plan을 즉시 제거하고 양 owner를 clear해야 한다.

### 2.4 layout과 font gate는 두 개의 별도 lifecycle이다

frame logical width는 view content box를 `ResizeObserver`로 측정한 뒤 기존 `resolveFrameLogicalWidth`에 전달해야
한다. 첫 측정 전, hidden/0/NaN 상태에서 Canvas는 0이다. Canvas surface의 자체 observer는 DPR/backing store
소유이므로 logical width observer를 대체하지 않는다.

nonempty authored text가 실제 zone에 있을 때만 `document.fonts.ready`, exact `fonts.check(shorthand)`, detached
2D `measureText`가 필요하다. API 부재, ready reject, family unavailable, context/measurement 실패는 plan 0이다.
text가 없으면 font API 부재 때문에 image-only frame을 막지 않는다.

### 2.5 상태 우선순위가 필요하다

post-auth view에는 catalog loading/error, asset request invalid, image loading/failure, width measuring, font waiting/
failure, plan failure, Canvas ready가 동시에 존재할 수 있다. 이전 plan을 남기거나 lower-priority 상태가 새 오류를
가리면 stale 제품 화면이 된다. view는 하나의 derived status를 사용하고 success plan이 현재 inputs에서 다시
증명된 경우에만 Canvas를 mount해야 한다.

고객 DOM에는 URL/token/catalog ID/raw owner label/createdAt/SDK message/internal code를 출력하지 않는다.
frame 성공도 clock/room/gallery 미지원 때문에 `replayComplete:false`다. 편집·인쇄·주문 UI는 없다.

## 3. Founder 결정 선택지

### DD-1 — 인증 완료 child 경계

- **A (권장):** `SpacePasswordGate`가 ready일 때만 별도 post-auth child를 mount한다. child에는 validated scene만
  전달하고 ownerLabel/createdAt은 표시하지 않는다.
- B: gate 안에서 catalog/view lifecycle을 직접 소유한다. hook 조건과 password UI 책임이 결합된다.

### DD-2 — readiness React ownership

- **A (권장):** source-bound controller 전용 StrictMode-safe owned-record hook을 둔다. projector whole success 뒤
  proof/art를 적용하고 none/failure/identity change에서 명시 clear, unmount에서 dispose한다.
- B: view가 raw proof/art hook을 각각 소유한다. 스펙 058의 단일 source-bound 권위가 깨진다.

### DD-3 — width와 font lifecycle

- **A (권장):** content-box width와 exact font readiness/measure를 별도 fail-closed hook으로 둔다. nonempty zone
  text에만 font gate를 요구하고 valid width/font 전 Canvas 0이다.
- B: fixed width나 fallback font로 먼저 Canvas를 표시한다.

### DD-4 — derived view 상태

- **A (권장):** `catalog → asset projection → owner readiness → width → fonts → plan → Canvas` 우선순위를 하나의
  safe derived state로 고정한다. 이전 Canvas/plan 유지, 자동 retry, fallback/merge는 0이다.
- B: 각 hook이 독립 status UI를 렌더한다. stale plan과 복수 alert 경합 가능성이 있다.

### DD-5 — 다음 구현 단위

- **A (권장):** injectable post-auth frame view + StrictMode-safe hooks + 합성 browser fixture까지만 구현한다.
  production `App` 연결과 실제 Firebase/catalog/image network는 0이다.
- B: production `App`까지 즉시 연결한다. lifecycle 브라우저 증명 전에 실제 구성 경계를 연다.

## 4. DD-1~DD-5=A의 허용 파일 후보

- `apps/mockup/src/space/SpacePostAuthFrameView.tsx` 및 관련 local modules/tests
- `apps/mockup/src/space/use-source-bound-readiness.ts` 및 test
- 합성 frame-view fixture에 필요한 `apps/mockup/src/e2e/**`, `tests/e2e/**`, fixture build entry 최소 변경
- `SpacePasswordGate.tsx`는 injectable ready-child seam만 최소 변경 가능
- spec 060/handoff/STATE/NEXT/CURRENT/live log

`App.tsx`, production composition/config, Firebase packages, package/lockfile, Rules/config는 변경하지 않는다.

## 5. 최소 합성 검증

1. pre-auth/invalid/loading/error에서 post-auth child와 catalog/image request 0
2. ready mount 뒤 catalog load 1 logical operation, retryable error에서 명시 retry만
3. StrictMode dispose 뒤 live readiness owner 재생성, owner/observer/listener 잔류 0
4. projector whole failure에서 proof/art load 0과 Canvas 0
5. proof/art loading·failure·late old success에서 stale Canvas 0
6. art none은 proof만 load하고 art clear
7. 0 width 후 valid resize 복구, measured helper 결과만 plan 입력
8. nonempty text exact fonts/check/measure 성공 전 Canvas 0; text 없음은 font gate 불필요
9. current plan success에서만 Canvas 1, fixed safe Korean status/accessible name
10. URL/token/IDs/ownerLabel/createdAt/internal code/exception DOM·console 노출 0

## 6. NOT TESTED / 금지

- 실제 Firebase/project/catalog/proof/art network, CORS와 실제 운영 object: **NOT TESTED / 금지**
- production `App` 연결, 배포, published/order/write/delete: **금지**
- clock true, non-neutral transform, room/gallery replay: 미지원
- 실제 다양한 폰트/viewport 시각 정확도: 후속 visual gate 전 **NOT TESTED**

## 7. 결론

production 연결 전 injectable browser composition으로 lifecycle을 증명해야 한다. DD-1~DD-5 결정 전 구현하지
않는다.
