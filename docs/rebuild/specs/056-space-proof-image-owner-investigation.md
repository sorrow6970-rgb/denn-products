# 스펙 056 후보 — space remote proof image owner 경계 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK**

## 1. 목적

스펙 055가 승인한 proof URL을 view-only frame plan에 넘기기 전, CORS-first image load와 decoded drawable
소유권을 local controller 계약으로 분리한다. 이번 단위는 읽기 전용 조사와 결정 선택지만 작성한다.

## 2. 확인된 현재 경계

### 2.1 plan과 executor는 URL을 소유하지 않는다

`buildFrameProductPlan`은 synthetic `imageRef`, positive intrinsic size, normalized transform을 요구하고
(`apps/mockup/src/canvas/productPlan.ts:329-390`), executor는 `PreviewImageBindings.get(imageRef)`가 돌려준
decoded drawable만 그린다(`apps/mockup/src/canvas/types.ts:94-104`). URL을 plan이나 imageRef에 넣는 것은
기존 정보·실행 경계를 위반한다.

### 2.2 template-art owner의 lifecycle 패턴은 검증돼 있다

`createTemplateArtBindingController`는 injected `createImage`, one-active generation, late result 무시,
ready binding, clear/dispose, listener 예외 격리, safe failure를 가진다
(`apps/mockup/src/canvas/templateArtBinding.ts:108-257`). remote source에서는
`crossOrigin='anonymous'`를 `src`보다 먼저 설정하고 실패 시 non-CORS 재시도를 하지 않는다
(`:185-224`). fake unit은 쓰기 순서와 replacement/dispose를 검증한다.

그러나 이 owner는 template artwork와 data URL도 입력으로 받으며, caller가 이미 trust를 통과했다고
가정한다(`:1-16`, `:92-105`). space proof 전용 의미·trust 재검증·plan에 필요한 intrinsic size snapshot은
없다. 따라서 기존 owner를 그대로 호출하면 spoofed source object를 proof로 오인할 수 있고 ready state만으로
plan image state를 만들 수 없다.

### 2.3 proof owner가 소유해야 할 값

전용 owner는 raw unknown source를 load 시점에 스펙 055 `resolveSpaceProofImageUrl`로 다시 검증하고,
성공 src는 closure와 image element 안에만 둬야 한다. public snapshot은 다음만 필요하다.

- `idle | loading`
- `ready { imageRef, intrinsicSize {width,height} }`
- `failed { safe code }`

`imageRef`는 `space-proof-<generation>` 같은 synthetic key이고 bindings에만 연결한다. URL/token/object path,
HTMLImageElement, exception은 state/log/DOM/plan으로 내보내지 않는다.

### 2.4 CORS와 decode 결과의 한계

real element에서는 `crossOrigin='anonymous'`를 먼저 쓰고 src를 정확히 한 번 할당해야 한다. `onload`는
positive finite `naturalWidth/Height`일 때만 ready다. `onerror`는 missing object, network, decode, CORS를
구분할 수 없으므로 하나의 `LOAD_FAILED`로 닫는다. 앱 수준 retry와 non-CORS fallback은 0이다.

이 계약이 CORS-clean Canvas를 local unit만으로 증명하지는 않는다. fake는 write order와 lifecycle만
증명하며 실제 bucket CORS·object MIME/bytes·Chromium decode는 **NOT TESTED**다.

### 2.5 취소와 늦은 결과

replacement/clear/dispose는 generation을 올리고 old onload/onerror를 detach해 state와 binding 변경을
차단할 수 있다. 이미 시작된 브라우저 network 자체가 즉시 중단됐다고 보장할 근거는 없다. 따라서
계약은 “late result가 제품 상태에 반영되지 않음”이지 “wire request가 취소됨”이 아니다.

dispose 뒤 load는 `DISPOSED`, subscribe는 no-op이어야 한다. ready drawable과 URL 참조는 clear/dispose에서
owner가 놓아야 한다. subscriber 예외가 다른 subscriber나 owner 상태를 깨면 안 된다.

### 2.6 React/StrictMode는 별도 단계다

기존 `useTemplateArtBinding`은 disposed controller를 다음 effect body에서 새 owner로 교체한다
(`apps/mockup/src/canvas/useTemplateArtBinding.ts`). 동일 패턴은 후속 proof hook에 적용 가능하지만 이번
첫 단위에서 React hook/App/UI를 열 필요는 없다. framework-free controller + injected fake로 lifecycle을
먼저 고정할 수 있다.

## 3. Founder 결정 선택지

### V-1 — owner 소유 경계

- **A (권장):** `apps/mockup/src/space/`에 proof 전용 framework-free controller를 둔다. template-art
  owner와 state/source 의미를 섞지 않는다.
- B: template-art owner를 그대로 재사용한다. proof trust 재검증과 intrinsic snapshot이 없다.

### V-2 — 입력 trust

- **A (권장):** `load(unknown)`이 스펙 055 resolver를 내부에서 다시 호출하고 실패 시 image 생성 0이다.
- B: caller의 `{kind,src}` 주장을 신뢰한다. 호출 경계 하나가 trust를 우회할 수 있다.

### V-3 — load 정책

- **A (권장):** anonymous CORS before src, src assignment 1회, 앱 retry/cache/non-CORS fallback 0이다.
- B: 실패 시 non-CORS로 재시도한다. Canvas taint 위험이 있다.

### V-4 — lifecycle 계약

- **A (권장):** one-active generation, replacement/clear/dispose late-result 무시, ready binding과 intrinsic
  size, safe state만 제공한다. wire cancellation은 주장하지 않는다.
- B: 여러 load를 병렬 보존한다. 어떤 scene이 binding을 소유하는지 모호해진다.

### V-5 — 다음 구현 단위

- **A (권장):** controller + injected fake unit만 구현한다. React hook/App/UI/실제 Image/network/plan 0.
- B: hook과 production scene composition까지 연결한다. 실제 network와 UI lifecycle이 동시에 열린다.

## 4. V-1~V-5=A의 최소 허용 범위

- `apps/mockup/src/space/proof-image-owner.ts`와 unit 또는 동등한 local 파일
- 기존 `proof-image.ts`는 import만 하며 계약 변경이 필요하면 STOP
- spec 056/handoff/STATE/NEXT/CURRENT/live log
- App/UI/hook/Canvas/plan/E2E, package/lockfile, Firebase/Rules/config 변경 0

## 5. 최소 fake 검증

1. invalid/untrusted source는 createImage 0
2. `crossOrigin=anonymous`가 src보다 먼저 정확히 한 번
3. positive dimensions만 ready, synthetic ref와 binding 일치
4. URL/token/element/error 비노출
5. replacement A→B에서 A late load/error 무시, A binding 0
6. clear/dispose 뒤 pending/ready binding 0, late result 무시
7. createImage/property assignment/natural size getter/subscriber throw 안전 실패·격리
8. disposed load는 Image 0, app retry/cache/fallback 0

## 6. 계속 금지와 미확인

실제 Firebase/project/bucket/object/network, real Image load/decode/CORS, App/UI/React hook, Canvas/plan,
room/gallery, Rules/config/deploy/write/delete/publish, 신규 dependency는 금지다.

- 실제 proof object 존재/MIME/bytes/CORS/decode: **NOT TESTED**
- browser request의 replacement/dispose 즉시 취소: **UNCONFIRMED / 계약 아님**
- real StrictMode hook lifecycle: **NOT TESTED**
- view-only frame plan/UI와 전체 space replay: **NOT IMPLEMENTED**

## 7. 결론

현재 local-only로 안전하게 구현 가능한 최소 단위는 dedicated controller + fake unit이다. V-1~V-5 결정
전 구현하지 않는다.
