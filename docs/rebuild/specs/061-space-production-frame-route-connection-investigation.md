# 스펙 061 후보 - production space frame route 연결 조사

상태: **FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_NETWORK**

## 1. 목적

스펙 060의 인증 후 frame view를 production mockup 앱의 `?space=` route에 연결하기 전에, 실제로 열리는
네트워크 경계와 최소 주입 seam, 실패 폐쇄 동작, 합성 브라우저 검증 범위를 확정한다. 이번 단위는 조사와
Founder 선택지만 기록하며 제품 코드는 변경하지 않는다.

## 2. 확인된 현재 사실

### 2.1 production route에는 이미 단일 연결 지점이 있다

`MockupRoot`는 `readSpaceLink()` 결과가 inactive가 아니면 일반 `CatalogApp` 대신 `SpaceRoute`만 렌더한다.
`SpaceRoute`는 `createSpaceProductionController()`를 memoize해 `SpacePasswordGate`에 전달하지만
`renderReady`는 전달하지 않는다. 따라서 인증 성공 뒤에도 placeholder가 보이며 스펙 060 frame view는
production 앱에서 mount되지 않는다(`apps/mockup/src/App.tsx:23-45`).

`SpacePasswordGate`의 ready seam은 검증된 `SpaceSceneV1`만 child에 전달한다. owner label, createdAt,
password, token은 이 seam을 건너지 않는다(`apps/mockup/src/space/SpacePasswordGate.tsx:14-20,89-96`).
새 route나 별도 화면 상태를 만들지 않고 이 seam에 `SpacePostAuthFrameView`를 연결하는 것이 가장 작은
구성 변경이다.

### 2.2 연결 순간 새로 활성화되는 읽기 경계

`SpacePostAuthFrameView`는 caller가 주입한 `PublicCatalogReader`를 mount 시 시작한다. production singleton
`publicCatalogReader`는 import 시 네트워크가 없고 `load()` 때만 고정
`published/state.json` REST GET을 수행한다. reader는 10초 timeout, 5 MiB 제한, concurrent in-flight dedup을
가지며 자동 retry나 stale fallback은 없다
(`apps/mockup/src/catalog/reader.ts:1-8`, `packages/firebase/src/public-catalog/reader.ts:1-5,97-103,189-218`).

catalog와 scene 검증 성공 뒤 proof와 optional template art source가 결정된다. production 기본 readiness
owner는 browser `Image`를 만들고, remote image에는 `crossOrigin = "anonymous"`를 `src`보다 먼저 설정한다.
실패 시 non-CORS 재시도는 없다
(`apps/mockup/src/space/proof-image-owner.ts:48-51,122-176`,
`apps/mockup/src/canvas/templateArtBinding.ts:72-79,167-222`).

따라서 연결 후의 실제 순서는 다음과 같다.

```text
valid ?space= + password submit
  -> lazy Firestore document read
  -> local decrypt/runtime validation
  -> ready scene
  -> public published/state.json GET
  -> exact catalog/scene/source validation
  -> proof + optional template art Image load
  -> width/font/current plan success
  -> Canvas
```

pre-auth, invalid link, auth/read/decrypt failure에는 ready child가 mount되지 않으므로 post-auth catalog/proof/art
요청이 없어야 한다. 일반 no-space route의 기존 catalog browse 동작은 바꾸지 않는다.

### 2.3 현재 frame view는 전체 scene replay가 아니다

현재 view는 catalog -> asset -> owner -> width -> font -> plan 순서를 모두 통과한 current frame plan만 Canvas에
표시한다. `clockOn === true`, non-neutral transform, room/gallery는 지원하지 않고 성공도
`replayComplete:false`다. 실패 시 이전 Canvas, fallback, 자동 merge가 없고 고정 한국어 메시지만 표시한다
(`apps/mockup/src/space/SpacePostAuthFrameView.tsx:72-165`, 스펙 057~060).

production 연결은 이 지원 범위를 넓히는 근거가 아니다. 편집, 인쇄, 주문, 발행 UI도 추가하지 않는다.

### 2.4 기존 검증의 공백

스펙 060 fixture는 gate, child, catalog, proof drawable, font를 모두 in-memory port로 주입해 lifecycle과
StrictMode cleanup을 검증했다(`apps/mockup/src/e2e/space-frame-fixture.tsx`,
`tests/e2e/space-frame-view.spec.ts`). 반면 production `MockupRoot -> SpaceRoute -> SpacePasswordGate`가
실제 child를 선택하는 구성과 기본 public catalog reader/browser Image owner의 결합은 검증하지 않았다.

현재 production E2E는 disabled config에서 Firebase 요청 0과 safe error만 확인한다
(`tests/e2e/mockup-space-gate.spec.ts`). 실제 project/config/document를 사용하지 않고 성공 route를 검증하려면
production root의 controller factory만 합성으로 바꾸는 좁은 seam이 필요하다.

## 3. 최소 검증 seam 분석

### 3.1 권장 seam

`MockupRoot` 또는 내부 `SpaceRoute`에 optional controller factory 하나만 허용하고 production default는 기존
`createSpaceProductionController`로 고정한다. App 계층에서 catalog reader, readiness owner, font port를 모두
교체할 수 있는 범용 dependency bag은 만들지 않는다.

별도 E2E fixture가 같은 `MockupRoot`를 합성 ready controller와 함께 mount하면 다음을 동시에 확인할 수 있다.

- submit 전 fixed catalog/proof/art request 0
- submit 후 production `publicCatalogReader`의 고정 catalog URL만 1 logical load
- production browser Image owner가 exact proof URL을 요청
- Playwright route interception으로 catalog JSON과 CORS 허용 PNG를 로컬 응답해 실제 외부 egress 0
- unsupported/invalid catalog 또는 image failure에서 Canvas 0과 safe error
- raw token, URL, catalog ID, exception이 DOM/console에 노출되지 않음

이 검증은 production 구성 코드와 browser API 경로를 사용하지만 실제 Firebase Storage CORS, 운영 object,
운영 폰트, 실제 Firestore는 검증하지 않는다. intercepted response의 성공은 실제 bucket의 성공 근거가 아니다.

### 3.2 넓은 seam을 권장하지 않는 이유

App 계층에서 reader/owner/font/plan을 모두 교체하면 fixture는 쉬워지지만 production default가 실제로 연결됐는지
증명이 약해지고 우회 가능한 두 번째 구성 계약이 생긴다. 스펙 060의 child 내부 주입은 unit/lifecycle 검증용으로
유지하되, production route 검증은 controller factory만 교체하고 나머지는 default를 사용해야 한다.

## 4. 실패 경계

| 시점 | 기대 상태 | 자동 동작 |
|---|---|---|
| invalid/duplicate `?space=` | 기존 safe invalid 화면, post-auth 요청 0 | retry 0 |
| password submit 전 | gate 독점, Firestore/catalog/image 0 | retry 0 |
| Firestore/auth/decrypt 실패 | 기존 safe gate error, frame child 0 | 기존 명시 password/network retry만 |
| catalog timeout/5xx | frame Canvas 0, safe error | 기존 명시 catalog retry만 |
| catalog invalid/not found | frame Canvas 0, safe error | retry 0 |
| proof/art CORS·decode 실패 | frame Canvas 0, safe error | retry/fallback 0 |
| width/font/plan 실패 | frame Canvas 0, safe error | retry/fallback 0 |
| route unmount/scene 교체 | current owners dispose, late result 무시 | 자동 재연결 0 |

## 5. Founder 결정 선택지

### EE-1 - production ready-child 연결

- **A (권장):** 기존 `SpaceRoute`가 ready scene에만 `SpacePostAuthFrameView`를 mount하고
  `publicCatalogReader`를 전달한다. ownerLabel/createdAt은 계속 표시하지 않는다.
- B: production 연결을 계속 보류하고 placeholder를 유지한다.

### EE-2 - production root 테스트 seam

- **A (권장):** optional controller factory 하나만 허용한다. production default는
  `createSpaceProductionController`이며 catalog/readiness/font는 App 계층에서 교체하지 않는다.
- B: App 계층에 reader/owner/font까지 포함한 범용 dependency bag을 추가한다.

### EE-3 - post-auth 실패와 retry 정책

- **A (권장):** 기존 fail-closed 상태를 그대로 사용한다. catalog retryable 오류의 명시 버튼 외에는 자동 retry,
  image fallback, stale Canvas 유지, 자동 route 재시작을 추가하지 않는다.
- B: image/font/plan 실패에도 route 수준 retry UI를 추가한다. 새 상태 계약이 필요하므로 이번 연결 단위에는
  권장하지 않는다.

### EE-4 - 합성 browser 검증

- **A (권장):** 별도 non-production fixture에서 production root를 합성 controller로 열고 고정 catalog/proof
  요청을 Playwright로 intercept한다. pre-auth 요청 0, ready 후 expected request, Canvas 1, failure Canvas 0,
  cleanup과 비밀 비노출을 검증한다.
- B: unit/source assertion과 기존 스펙 060 fixture만 사용한다. production route와 기본 owner 결합 공백이 남는다.

### EE-5 - 다음 구현 허용 범위

- **A (권장):** `App.tsx`의 최소 연결과 controller-factory seam, 관련 App unit, 별도 fixture entry/config,
  Playwright E2E, spec/handoff/state 문서만 허용한다. 스펙 060 child 내부·Firebase packages·Rules·환경값은
  결함이 없는 한 변경하지 않는다.
- B: 실제 config/Firestore/Storage/CORS까지 함께 검증한다. 실제 project/network 권한이 필요해 이번 범위를
  벗어난다.

## 6. EE-1~EE-5=A일 때 구현 계약 후보

- `apps/mockup/src/App.tsx`: ready child 연결과 좁은 controller factory seam
- `apps/mockup/src/App.test.tsx`: invalid/pre-auth ownership, ready child 선택, metadata 비노출
- `apps/mockup/src/e2e/**`, `apps/mockup/e2e-*.html`, `apps/mockup/vite.e2e-fixture.config.ts`:
  non-production production-root fixture 최소 추가
- `tests/e2e/**`: intercepted catalog/proof success/failure, request timing, Canvas/cleanup/비노출
- 이 spec/handoff/STATE/NEXT/CURRENT/live log

신규 dependency, package/lockfile, production Vite config, Firebase config/Rules, deploy 파일 변경은 필요하지 않다.

## 7. 계속 금지 / NOT TESTED

- 실제 Firebase project/config/token/document, actual public catalog/proof/art network, 운영 bucket/CORS/object:
  **NOT TESTED / 금지**
- 실제 env 값 추측·기록, Rules/CORS/Hosting 변경·배포: **금지**
- room/gallery/clock/non-neutral transform, 편집·인쇄·주문·발행·write/delete: **미지원 / 금지**
- 실제 다양한 모바일 viewport, 실제 운영 폰트와 이미지의 시각 정확도: **NOT TESTED**
- 이 조사만으로 production cutover 또는 운영 활성화를 승인하지 않는다.

## 8. 조사 결론

현재 local 계약 안에서 production route의 ready seam 연결과 외부 egress 없는 합성 browser 검증은 가능하다.
그러나 연결은 password 성공 뒤 public catalog와 image read를 실제로 활성화하는 제품 결정이다. 따라서
EE-1~EE-5 결정 전에는 구현하지 않는다.
