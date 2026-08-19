# 스펙 053 후보 — space production composition 조사

상태: **DONE / CODEX_PASSED / LOCAL_GATED / NO_NETWORK**

## 1. 조사 목적

스펙 048~052의 local-only space read/open 경계를 production mockup 앱에 연결하기 전에 다음을 분리한다.

- `?space=`와 일반 공개 catalog browse의 화면 소유권
- Firebase config/factory의 생성 시점과 fail-closed 조건
- password UI가 소비할 controller 상태와 안전 문구
- 복호화된 `space-scene-v1`을 실제 preview/room에 적용하는 별도 경계

이번 문서는 조사와 선택지만 기록한다. 제품 코드·환경 설정·실제 Firebase/network는 변경하지 않는다.

## 2. 확인된 현재 사실

1. production `App`은 mount 즉시 `usePublicCatalog(publicCatalogReader)`를 호출하며 ready이면
   `BrowseFlow`를 렌더한다(`apps/mockup/src/App.tsx:15-36`). space mode 분기는 없다.
2. 스펙 052 controller는 inactive/invalid/awaiting-password/loading/error/ready 상태와 명시 submit,
   duplicate 차단, password retry cache, detach generation을 이미 제공한다
   (`apps/mockup/src/space/controller.ts:12-159`). React hook/UI와 production factory는 없다.
3. `createFirebaseSpaceReadFacade`는 호출되면 Firebase app/firestore 모듈을 import하고 named app
   `denn-space-viewer`를 생성 또는 재사용한다. config mismatch는 fail-closed한다
   (`packages/firebase/src/space-read/sdk-facade.ts:3-40`). 호출 자체를 늦추는 production composition은 없다.
4. `SpaceOpenPort` 성공값은 ownerLabel/createdAt과 검증된 `SpaceSceneV1` snapshot이다
   (`packages/spaces/src/open.ts:8-56`). URL 문자열을 fetch하거나 scene을 UI에 적용하지 않는다.
5. 리빌드 preview는 `PreviewComposer`를 가지지만 room/gallery replay 포트는 없다. 레거시는 별도
   `replayScene`/`showComposed`로 전역 상태와 DOM/Canvas를 직접 조작한다
   (`denn-mockup-tool.html:15821-15999`). 이를 그대로 이식하는 것은 모듈 경계와 맞지 않는다.
6. legacy viewer는 `?space=`에서 편집기를 가리고 password gate를 독점 표시하며 view-only 플래그를
   사용한다(`denn-mockup-tool.html:15766-15810`). 이는 호환 UX 근거이지 새 React 구조의 승인 근거는 아니다.

## 3. 안전성 분석

### 3.1 화면 모드

현재 App에서 controller만 추가하면 일반 catalog load가 먼저 시작된다. space 링크가 invalid이거나 password
입력 전이어도 browse/network가 뒤에서 동작할 수 있다. space query를 부트 시 먼저 순수 파싱하고 모드를
선택해야 “space gate 독점”과 “일반 링크 동작 무변경”을 동시에 검증할 수 있다.

### 3.2 Firebase lazy 경계

named app facade는 Auth를 만들지 않지만 factory 호출 시 SDK 초기화가 발생한다. no-space/invalid-link에서
factory 0을 강제하려면 production composition이 parser 결과 뒤에 있어야 한다. valid link에서도 명시적
password submit 전 초기화 0을 원한다면 controller에 lazy read port를 주입해야 한다.

config는 mockup 앱에 아직 계약이 없다. exact-true enable flag + 필수 5키(apiKey/authDomain/projectId/
storageBucket/appId) 전부 존재할 때만 구성하고, partial/blank는 UI-safe configuration error로 막는 것이
기존 admin fail-closed 패턴과 일치한다. 실제 값은 이번 조사에서 추측하지 않는다.

### 3.3 password UI

첫 UI는 controller snapshot만 표현할 수 있다. password는 React local state에만 두고 submit 후 즉시
비우며 DOM/state/error/log에 재표시하지 않아야 한다. invalid/not-found/load/password/invalid-content를
고정 한국어 문구로 매핑하고 retryable 분기만 명시 행동을 제공한다. ready scene을 곧바로 기존 preview에
주입할 계약은 아직 없다.

### 3.4 scene 적용

scene의 tplId/sizeId/colorId는 현재 공개 catalog와 대조되지 않았다. photoUrl/guideBgUrl/gallery URL은
검증된 문자열일 뿐 CORS·scheme·origin·image load 안전성이 증명되지 않았다. room controls/settings/common은
opaque snapshot이다. 따라서 decrypt 성공만으로 renderer에 적용하면 잘못된 ID, 외부 URL, 부분 적용,
편집 가능 상태 노출을 막을 수 없다.

후속 scene application 계약은 최소한 다음을 별도 증명해야 한다.

- decrypt 성공 후 public catalog를 읽고 template/size/color 참조를 정확히 검증
- view-only scene model과 일반 편집 상태를 분리하고 부분 적용 실패 시 fail-closed
- image URL 허용 정책, CORS-clean load, 늦은 이미지 결과·dispose
- room/gallery 렌더 기능의 존재 여부와 레거시 controls/settings 매핑
- 카카오 링크는 검증된 catalog brand에서만 가져오고 encrypted payload 값을 신뢰하지 않음

## 4. Founder 결정 선택지

### R-1 — 화면 모드 소유권

- **A (권장):** query를 App 부트 전에 분류한다. no-space만 기존 browse, valid는 space gate 독점,
  duplicate/invalid는 fail-closed error 화면이며 catalog/Firebase factory 0.
- B: browse를 항상 mount하고 space gate를 overlay한다. background catalog network와 이중 상태가 생긴다.

### R-2 — production Firebase composition

- **A (권장):** space 전용 exact-true enable flag + 완전한 5키 config를 도입하고, valid link의 명시 submit에서
  lazy read port가 `denn-space-viewer` facade를 한 번 생성한다. no-space/invalid/partial config는 SDK init 0.
- B: 앱 부트에서 facade를 즉시 생성한다. 단순하지만 일반 방문도 Firebase SDK를 초기화한다.

실제 config 값·project 접근·network 검증은 어느 선택지에도 포함되지 않는다.

### R-3 — 첫 production UI 단위

- **A (권장):** password gate + safe errors + ready metadata/scene snapshot 도달까지만 연결한다.
  실제 scene/이미지/room 적용은 하지 않는다.
- B: 같은 단위에서 scene replay까지 연결한다. 현재 room port와 URL/catalog 검증 계약이 없어 권장하지 않는다.

### R-4 — scene 적용 순서

- **A (권장):** decrypt 성공 뒤 별도 후속 스펙에서 public catalog를 로드·참조 검증하고 view-only scene
  application port를 만든다. room/gallery 미구현 필드는 fail-closed 또는 명시적 지원 제외로 결정한다.
- B: encrypted scene의 ID/URL/opaque room 값을 현재 preview에 직접 적용한다. 안전 근거가 없다.

## 5. R-1~R-4=A일 때 다음 최소 구현 범위

- `apps/mockup/src/space/`의 composition/config/hook/UI 및 unit
- `apps/mockup/src/App.tsx`, `apps/mockup/src/env.d.ts`
- 합성 port만 사용하는 opt-in browser fixture/E2E
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log

외부 dependency/package/lockfile 변경은 필요하지 않다. `@denn/firebase`와 `@denn/spaces`는 이미 mockup
workspace dependency다.

## 6. 계속 금지

실제 Firebase/project/token/document/network, 실제 env 값 추측, Rules/config/deploy, create/write/delete,
scene/image/room 적용, App 일반 browse 기능 변경, 주문/발행, legacy HTML 수정, 신규 dependency.

## 7. NOT TESTED / UNCONFIRMED

- 실제 legacy token/document/password와 named Firebase app network: **NOT TESTED**
- 실제 운영 Firebase config 값과 Hosting env 주입: **UNCONFIRMED**
- 현재 production catalog와 암호화 scene ID의 일치율: **NOT TESTED**
- scene URL의 scheme/origin/CORS와 이미지 생존 여부: **NOT TESTED**
- room/gallery 기능의 리빌드 동등 구현 및 레거시 opaque 설정 매핑: **NOT IMPLEMENTED / UNCONFIRMED**
- 실제 모바일 password UX와 view-only scene 렌더: **NOT TESTED**

## 8. 결론

password gate composition은 local synthetic 범위에서 구현 가능하다. 그러나 scene replay는 별도 안전 계약이
필요하다. 조사 당시 R-1~R-4 결정 전에는 제품 구현을 시작하지 않았고, 이후 모두 A로 승인된 범위만
아래와 같이 구현했다.

## DONE (Codex)

- Founder가 R-1=A/R-2=A/R-3=A/R-4=A를 승인했다.
- production App에서 space query를 일반 catalog보다 먼저 분기하고, valid/invalid space mode가 화면을
  독점하도록 연결했다. no-space browse 동작은 기존 component로 격리했다.
- exact-true + complete 5-key config, explicit submit lazy named Firebase facade, safe error/password UI,
  StrictMode detach→attach 세대 무효화를 구현했다.
- scene은 controller의 검증된 ready snapshot까지만 도달하며 preview/image/room에는 적용하지 않는다.
- 자체 검수에서 retryable network 오류의 UI 재시도 폼 누락을 발견해 보완했다.
- targeted 32/32 후 최종 전체 check PASS(unit 1495/1495), Chromium 143/143 PASS.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 커밋 `5e4be63`. 실제 Firebase/project/config/token/document/network/deploy와 scene 적용은 0이다.
