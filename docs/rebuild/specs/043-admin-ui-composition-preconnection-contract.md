# 스펙 043 후보 — production 연결 전 admin UI composition 계약 조사

상태: **FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_PRODUCT_WIRING**

## 목표 (WHY)

스펙 039~042의 로컬 write 경계를 production `App.tsx`에 연결하기 전에, 인증 권위·lazy adapter
생성·화면 역할·enable gate와 실패 처리를 하나의 composition 계약으로 고정한다. 이 문서는 조사와
선택지이며 제품 연결, 실제 Firebase 요청, 운영 쓰기 또는 배포 승인이 아니다.

## 확인한 현재 사실

1. `App.tsx`는 `createAdminRemoteControllerFromEnv(import.meta.env)`를 mount당 한 번 호출하고
   `AdminRemoteStateCard`만 연결한다. `FramePrintSizeEditor`는 production graph에 없다.
2. `createAdminRemoteControllerFromEnv()`는 config가 완전할 때 lazy read facade 하나, `OperatorAuthPort`
   하나와 legacy `AdminStateReadPort` 하나를 내부에서 만들지만 이 port들을 외부 composition에 돌려주지
   않는다. 따라서 현재 API로 별도 write composition이 같은 auth instance를 안전하게 공유할 수 없다.
3. `OperatorAuthPort`는 첫 subscriber에서 SDK auth observer 하나를 붙이고 마지막 unsubscribe에서
   해제한다. 여러 controller가 같은 port를 공유하는 것은 가능하지만 port 자체를 두 번 만들면 단일
   auth 권위 계약을 증명할 수 없다.
4. `createFirebaseAdminWriteFacade()`는 호출되기 전 SDK를 import하지 않는다. 호출되면 기존 default
   Firebase app의 5개 config를 비교해 일치할 때만 app/auth를 재사용하며 named app을 만들지 않는다.
5. `createAdminStateWritePort()`는 동일 auth port와 spec 036 legacy read port를 요구한다. 같은 port에서
   성공한 `loadBaseline()` revision만 `save()`가 허용하므로 load와 save 사이에 port를 교체할 수 없다.
6. 현재 `AdminRemoteStateCard`의 “운영자 상태 불러오기”는 legacy `admin/state.json` 검증만 수행하고
   결과 catalog/revision을 버린다. editor의 “편집 기준 불러오기”는 head 우선 C5 baseline이다. 두
   action을 한 화면에 그대로 노출하면 이름은 비슷하지만 정본과 결과가 다른 중복 UI가 된다.
7. 기존 env gate는 remote read 전체만 on/off한다. 실제 UID 정본·Rules 배포·cutover 전 write UI만
   별도로 비활성화하는 production gate는 아직 없다.

## 필수 composition 불변식

- config resolution은 앱 composition root에서 정확히 한 번 수행한다.
- configured runtime은 default Firebase app과 `OperatorAuthPort`를 정확히 하나만 소유한다.
- read controller와 write session이 필요하면 같은 auth port와 같은 legacy read port를 공유한다.
- named Firebase app, 두 번째 auth observer 권위, 별도 로그인 상태, 자동 sign-in은 0이다.
- write adapter/Firestore/Storage SDK 경계는 운영자의 명시적 baseline load 전 생성하지 않는다.
- write adapter 생성 성공 후 같은 `AdminStateWritePort` instance를 load→edit→save 동안 유지한다.
- adapter/init rejection은 raw error를 버리고 고정 safe code로 종료한다. Promise rejection으로 UI를
  `loading`에 남기거나 console에 SDK message를 노출하지 않는다.
- StrictMode mount→dispose→remount에서 observer/controller/listener 누수와 late state update는 0이다.
- write-disabled/unconfigured 기본 상태에서 editor·write adapter·Firestore/Storage import/network는 0이다.

## 권장 목표 구조

```text
App
└─ createAdminOperatorComposition(env)        (mount당 1)
   ├─ resolve config                          (1회)
   ├─ lazy read facade → default app/auth
   ├─ OperatorAuthPort                        (유일 권위)
   ├─ legacy AdminStateReadPort               (공유)
   ├─ AdminRemoteController                   (로그인 UI)
   └─ lazy AdminStateWritePort holder         (명시 load 때 1회 생성)
      └─ AdminWriteSessionController
         └─ FramePrintSizeEditor
```

Firestore/Storage가 auth와 cross-service atomic이라는 뜻이 아니다. 이 구조는 app/auth ownership과
클라이언트 lifecycle만 고정하며 C5 원자성은 스펙 037/039 계약에 그대로 의존한다.

## Founder 결정 후보

### Y-2 — auth/composition ownership

- **A (권장):** 새 app composition root가 config, lazy read facade, auth, legacy read를 소유하고 read/write
  controller에 주입한다. 기존 `createAdminRemoteControllerFromEnv()`는 호환 wrapper로 유지한다.
- B: 기존 read composition과 별도 write composition을 둔다.

권장 근거: B는 default app을 재사용해도 `OperatorAuthPort`와 observer authority가 둘이 되어 logout,
StrictMode dispose, late auth 전이의 단일 소유권을 증명하기 어렵다.

### Y-3 — 중복 read UI

- **A (권장):** production workspace에서는 `AdminRemoteStateCard`를 auth-only 모드로 사용하고 legacy-only
  “운영자 상태 불러오기” 버튼을 숨긴다. 편집 정본 load는 editor의 C5 baseline action 하나만 둔다.
  기존 read-only 기본 모드와 테스트는 보존한다.
- B: legacy read card와 C5 editor load를 둘 다 표시한다.

권장 근거: B는 서로 다른 정본을 같은 “상태 불러오기”로 노출하고 legacy read 성공을 편집 base 성공으로
오인하게 만들 수 있다.

### Y-4 — production write enable gate

- **A (권장):** 기존 read enable과 별개의 exact-`"true"` write flag를 추가한다. read configured + write
  disabled가 기본이며, write enabled인데 read config가 불완전하면 fail-closed/unconfigured다. 실제 UID,
  target Rules, emulator PASS, 별도 cutover 승인 전 운영 build에서 true 설정은 금지한다.
- B: read enable이 곧 write enable이다.

권장 근거: B는 spec 036 read 설정만으로 아직 배포 승인되지 않은 write UI까지 열 수 있다.

### Y-5 — lazy 생성과 init 실패

- **A (권장):** write session에는 rejection-safe lazy port holder를 주입한다. 첫 명시적
  `loadBaseline()`에서 write facade+port를 한 번 만들고 성공 instance를 고정한다. 생성 실패는 raw
  error 없이 `UNEXPECTED_ADMIN_READ_ERROR` load failure로 끝내며 자동 retry 0; 사용자의 다음 명시 load만
  새 factory attempt 후보가 된다. 성공 load 전 save 경로는 구조적으로 없다.
- B: App mount에서 write facade+port를 즉시 만든다.

권장 근거: B는 write-disabled/idle 상태의 Firestore·Storage 경계 0 계약을 깨고 초기 화면부터 write SDK
초기화 실패를 발생시킨다.

## 후속 구현 최소 범위 (Y-2~Y-5=A일 때)

- `apps/admin/src/admin-composition/**` 신규 composition/lazy-holder + unit
- `apps/admin/src/admin-read/create.ts` 호환 wrapper 최소 조정 + 기존 test
- `apps/admin/src/admin-read/AdminRemoteStateCard.tsx` auth-only 표시 mode + test
- `apps/admin/src/App.tsx` composition/workspace 연결
- `apps/admin/src/env.d.ts` 및 config resolver의 write flag 최소 확장 + test
- `apps/admin/src/admin-write/**`는 필요한 UI lifecycle 보완과 test만
- production composition 전용 Chromium E2E와 스펙/handoff/상태 문서

`packages/firebase/**`, Rules, `firebase.json`, package manifests, lockfile 변경은 우선 필요하지 않다.
구현 중 package public surface 또는 Rules 변경이 필요하면 STOP한다.

## 검증 계약

- unconfigured/read-only/write-enabled 3개 env matrix와 partial config fail-closed
- default app/auth port 1개, observer attach/detach 균형, named app·중복 init 0
- write-disabled/idle: editor·write factory·Firestore/Storage import/network 0
- authenticated 후에도 명시적 baseline load 전 write factory 0
- 첫 load에서 factory 1회, 성공 instance가 exact load→save에 유지됨
- factory rejection: loading 고착·unhandled rejection·raw message 0, save 0, 자동 retry 0
- auth loss/dispose/StrictMode/remount 시 baseline·draft 제거와 late result 무시
- auth-only production card에는 legacy load action 0; 기존 read-only mode 회귀 유지
- 스펙 042의 selection/invalid/save/conflict/outcome-unknown/discard browser 계약 유지
- `pnpm check`, 전체 Chromium E2E, 고객 bundle SHA-256, forbidden diff, 포트/temp 잔류 0

## 계속 금지 / STOP

Y-2~Y-5 결정 전 제품 구현을 시작하지 않는다. 실제 UID 추측·기록, 실제 Firebase/project/bucket/
운영 데이터/network, Rules·Hosting 배포, 운영 쓰기, published 발행, legacy write, delete·자동 정리,
C6/L-4, 신규 의존성, package/Rules/config 범위 확대가 필요하면 중단한다. write flag를 실제 운영 build에서
켜는 것은 별도 cutover 승인 전 금지다.

## 조사 결론

현재 코드는 local controller/editor와 browser fixture까지 검증됐지만 production composition 계약은 없다.
기존 read factory를 그대로 둔 채 editor만 추가하는 것은 단일 auth 권위와 중복 load 의미를 해결하지
못한다. 권장안은 **Y-2=A, Y-3=A, Y-4=A, Y-5=A**이며, Founder 결정 전 `App.tsx` 연결은 열지 않는다.
