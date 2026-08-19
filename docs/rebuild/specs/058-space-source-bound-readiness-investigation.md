# 스펙 058 후보 — space source-bound readiness adapter 경계 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / LOCAL_ONLY / NO_NETWORK**

## 1. 목적

스펙 057 `composeSpaceFramePlan`의 AA-6 resolver 계약을 기존 proof/template-art owner에 안전하게 연결하는
최소 owner adapter 경계를 정한다. 이번 단위는 조사와 결정 선택지만 기록하며 React/App/UI/network 연결은
시작하지 않는다.

## 2. 확인된 현재 경계

### 2.1 owner snapshot만으로 source identity를 증명할 수 없다

proof owner의 ready state는 `imageRef + intrinsicSize`, template-art owner는 `imageRef`만 제공한다.
drawable은 각각 bindings 안에 있지만, 어느 source를 load해 얻은 결과인지는 public state에 없다
(`apps/mockup/src/space/proof-image-owner.ts`, `apps/mockup/src/canvas/templateArtBinding.ts`). 이는 URL/token을
public state에 남기지 않는 올바른 정보 경계지만, 외부에서 ready snapshot만 조합하면 이전 source의 stale
binding을 현재 scene에 잘못 연결할 수 있다.

스펙 057은 이를 막기 위해 exact source를 받는 `SourceBoundProofResolver`와
`SourceBoundTemplateArtResolver`를 요구한다. 현재 두 owner 자체는 이 interface를 구현하지 않는다.

### 2.2 안전한 adapter는 owner를 독점 소유해야 한다

adapter가 source를 추적하더라도 같은 owner를 다른 호출자가 직접 `load/clear`할 수 있으면 기록과 실제
binding이 어긋난다. 따라서 adapter가 owner를 내부에서 만들고 raw owner를 밖으로 노출하지 않아야 한다.
unit에서는 factory로 fake owner를 주입할 수 있지만 제품 surface에는 adapter의 load/clear/dispose,
snapshot/resolver/bindings만 노출한다.

proof load는 `resolveSpaceProofImageUrl`을 먼저 통과한 exact src만 내부에 보관하고 그 src를 owner에
전달한다. template-art load는 `{kind,src}`를 한 번 plain snapshot으로 읽어 exact pair를 보관한다. source는
resolver 성공 여부 비교에만 쓰며 state/error/log/plan/DOM으로 내보내지 않는다.

### 2.3 resolver 성공 조건

resolver는 다음 조건이 모두 참일 때만 success를 반환해야 한다.

1. 호출 source가 현재 adapter가 보관한 exact source와 같다.
2. 대응 owner의 현재 snapshot이 `ready`다.
3. snapshot의 synthetic `imageRef`가 안전한 형식이다.
4. owner bindings가 그 exact ref에 drawable을 반환한다.
5. proof는 ready intrinsic size도 positive finite다.

하나라도 실패하거나 getter/owner/binding이 throw하면 `{ok:false}`다. resolver는 load/retry/clear를 하지
않으며 source, drawable, raw owner error를 반환하지 않는다.

### 2.4 replacement와 lifecycle

새 load가 시작되기 전에 tracked source를 새 값으로 교체해야 old ready가 즉시 resolve되지 않는다. invalid
load, clear, dispose는 tracked source를 먼저 제거한다. owner가 generation으로 late result를 차단하므로
adapter는 timer/retry/cache를 추가하지 않는다.

proof와 art는 서로 독립적인 one-active generation을 유지한다. adapter snapshot은 각 owner state를 safe
shape로 반영하고 두 owner subscription을 하나로 전달할 수 있다. subscriber 예외는 격리한다. dispose는
각 owner를 정확히 한 번 dispose하고 이후 load/resolve를 실패시킨다.

### 2.5 실행 bindings

스펙 057 plan에는 `space-proof-N`과 `template-art-N`이 함께 들어갈 수 있다. 현재 prefix가 서로 다르므로
adapter는 두 owner bindings를 read-only composite로 제공할 수 있다. unknown ref, throw, disposed owner는
`undefined`다. adapter가 drawable을 복사하거나 별도 소유하지 않는다.

### 2.6 React/App 연결은 아직 준비되지 않았다

기존 `useTemplateArtBinding`/`useLocalImageBinding`은 StrictMode owner 교체 패턴을 제공하지만 source-bound
proof adapter hook은 없다. 더 중요한 점은 현재 space route가 인증 완료 후에도 placeholder만 표시하고,
space mode에서는 public catalog를 로드하지 않는다(`SpacePasswordGate.tsx`, `App.tsx`). frame plan에는
catalog, measured logical width, settled font measure, Canvas surface가 모두 필요하다.

따라서 adapter와 hook/App/UI를 한 번에 연결하면 post-auth catalog request 정책, loading/error UI,
StrictMode image lifecycle, layout/font/Canvas가 동시에 열린다. 첫 구현은 framework-free adapter + fake unit로
제한하는 것이 재현 가능하다.

## 3. Founder 결정 선택지

### BB-1 — 첫 구현 형태

- **A (권장):** framework-free source-bound readiness adapter/controller + unit만 구현한다.
- B: React hook과 space UI까지 함께 연결한다. catalog/layout/font/Canvas 정책이 미정이다.

### BB-2 — owner 소유권

- **A (권장):** adapter가 proof/art owner를 독점 생성·소유하며 raw owner를 외부에 노출하지 않는다.
- B: 외부 owner를 받아 감싼다. 외부 load/clear가 tracked source를 우회할 수 있다.

### BB-3 — resolver 성공 조건

- **A (권장):** exact source + current ready snapshot + exact binding 존재를 모두 요구한다. stale/missing/throw는
  `{ok:false}`이며 resolver side effect는 0이다.
- B: source match 또는 ready state 하나만 확인한다. stale/가짜 binding 가능성이 남는다.

### BB-4 — lifecycle와 bindings

- **A (권장):** proof/art 독립 one-active, replacement 전에 source 교체, invalid/clear/dispose 즉시 source 제거,
  combined subscribe와 read-only composite bindings를 제공한다.
- B: source 기록과 owner lifecycle을 caller가 따로 조정한다. 원자적 순서가 깨질 수 있다.

### BB-5 — 다음 단위 범위

- **A (권장):** adapter 파일 + fake owner unit + spec/handoff/status 문서만. 기존 owner/hook/App/UI/E2E 0.
- B: 기존 owner API나 React composition도 변경한다. 첫 local contract보다 범위가 크다.

## 4. BB-1~BB-5=A 최소 구현 후보

- `apps/mockup/src/space/source-bound-readiness.ts`
- `apps/mockup/src/space/source-bound-readiness.test.ts`
- spec 058/handoff/STATE/NEXT/CURRENT/live log

기존 proof owner, template-art owner, frame-plan, React hooks, App, password gate는 import만 하거나 그대로 둔다.
계약 변경이 필요하면 STOP한다.

## 5. 최소 fake 검증 후보

1. valid proof/art load만 owner에 exact snapshot으로 한 번 전달
2. invalid/hostile source는 owner load 0, tracked source 0
3. exact source + ready + binding일 때만 resolver success
4. stale source, idle/loading/failed, missing/throwing binding은 failure
5. replacement 호출 즉시 old source resolver failure; late old ready도 failure
6. clear/dispose가 source와 composite binding을 제거하고 owner lifecycle을 한 번 전달
7. proof/art 독립 replacement와 synthetic ref collision/unknown ref 차단
8. combined subscribe 통지와 subscriber throw 격리
9. source/URL/token/drawable/owner error가 snapshot/result/log에 없음
10. import/resolve에서 Image/network/timer/retry/cache 0

## 6. NOT TESTED / 계속 금지

- real `Image`, Firebase/project/bucket/object/network/CORS/decode: **NOT TESTED**
- React hook/StrictMode, post-auth public catalog load, layout/font/Canvas/UI: **NOT TESTED / NOT IMPLEMENTED**
- clock true/누락, room/gallery, deploy/write/delete/publish: 미지원/금지

## 7. 결론

스펙 057과 기존 owner 사이에는 source identity를 소유하는 framework-free adapter 한 층이 필요하다.
BB-1~BB-5 결정 전 구현하지 않는다.
