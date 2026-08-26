# Space V2 end-to-end composition readiness 조사 — 2026-08-26

상태: **DOCUMENT_REVIEW_READY / FOUNDER_DECISION_REQUIRED / PRODUCT IMPLEMENTATION NOT STARTED**

## 1. 조사 목적

스펙 064~076으로 준비된 Space V2 local issue bundle, write port, 목표 Rules와 Firebase SDK adapter를
실제 화면에 연결하기 전에, 운영자 발급 UI와 고객 viewer가 함께 성립하는지 저장소 정본만으로 점검한다.
이번 문서는 구현 승인이 아니며 `apps/**`, Rules, config, test, package/lockfile를 수정하지 않는다.

## 2. 확인된 사실

### 2.1 V2 발급의 비-UI·persistence 경계는 존재한다

- `prepareSpaceV2LocalIssueBundle()`은 `catalog`, `selection`, `frameOrientation`, `logicalWidth`,
  `frameColor`, `transform`, `pngBytes`, `password`의 정확한 입력을 받아 asset UUID와 token UUID를
  생성하고 proof descriptor·PNG bytes·암호화 V2 document를 묶는다
  (`apps/admin/src/space-v2/issue-bundle.ts:40,61-65,73-82,123-168`).
- `createSpaceV2IssueWritePort()`는 prepared bundle을 검증한 뒤 immutable PNG upload → V2 Firestore
  document create 순으로 실행하며, 결과 미확정은 server-only read-back 한 번으로만 조정한다
  (`packages/firebase/src/space-write/write-port.ts:220-300`).
- 스펙 076 SDK adapter는 default admin Firebase app/Auth ownership과 local emulator 통합을 검증했다.
  실제 UID·live network·deploy는 여전히 NOT TESTED다
  (`docs/rebuild/specs/076-space-v2-sdk-adapter-emulator.md`).

### 2.2 admin production UI에는 V2 발급 입력의 단일 소유자가 없다

- 현재 `App.tsx`는 operator auth/private catalog read, C5 catalog write session과 print-size editor를
  구성하지만 Space V2 issue bundle/write port를 import하거나 호출하지 않는다
  (`apps/admin/src/App.tsx`, `apps/admin/src/admin-composition/create.ts`).
- 기존 `AdminWriteSessionController`의 baseline은 검증된 catalog와 revision을 소유하지만, V2에 필요한
  frame selection·orientation·logical width·color·transform·proof PNG·password는 소유하지 않는다
  (`apps/admin/src/admin-write/session-controller.ts:24-42,196-247`).
- `FramePrintSizeEditor`는 catalog의 print-size 편집 경계다. 이를 Space V2 scene editor나 proof capture
  source로 간주할 근거는 없다.
- 현재 Space V2 입력은 unit tests의 합성 fixture에서만 함께 존재한다. production route와 DOM/Canvas
  composition은 0이다.

결론: 버튼과 form만 붙이면 되는 상태가 아니다. 발급 시작 시점에 하나의 검증된 draft를 freeze하고,
동일 draft에서 replay metadata와 exact proof PNG를 함께 산출하는 session ownership이 먼저 필요하다.

### 2.3 customer production viewer는 V1 전용이다

- customer `SpaceRoute`는 `createSpaceProductionController()` → `SpacePasswordGate` →
  `SpacePostAuthFrameView`로 이어진다 (`apps/mockup/src/App.tsx`).
- production opener `createSpaceOpenPort()`는 `readSpaceDocument()`와 `readSpaceScene()`만 사용하며
  `SpaceDocumentV1`/`SpaceSceneV1`만 반환한다 (`packages/spaces/src/open.ts:1-18,37-52`).
- `readSpaceDocument()`는 V2 outer를 거부하도록 테스트되어 있다
  (`packages/spaces/src/v2.test.ts:88-94`, `packages/spaces/src/read.test.ts:77-83`).
- `readSpaceDocumentV2()`와 `readSpaceSceneV2()`는 존재하지만 `apps/mockup/src/**` production path에서
  호출되지 않는다. 저장소 검색 결과 mockup의 `space-v2` 사용은 0이며 V1 fixture/차단 테스트뿐이다.

결론: 현재 admin이 V2 document를 성공적으로 저장해도 고객 production link는 열리지 않는다. 따라서
발급 UI를 viewer보다 먼저 활성화하면 "저장은 성공하지만 고객이 볼 수 없는 링크"를 만들 수 있다.

### 2.4 V2 viewer가 지켜야 할 기존 결정

- V1 reader/opener/token은 변경하지 않고 V2는 별도 version route로 처리한다(GG-1=A).
- V2는 current catalog를 조용히 채택하지 않고 encrypted `FrameReplayEvidenceV1` snapshot과 canonical
  digest를 검증한다(GG-2=A).
- 첫 capability는 image-only single-rect frame이며 text/template art/clock/room은 unsupported다
  (GG-3=A).
- proof asset bytes는 encrypted evidence의 path/size/SHA-256/intrinsic dimensions와 일치해야 하며,
  mismatch·missing·decode failure는 fail-closed해야 한다(GG-4=A 및 스펙 064).
- 실제 UID, live Rules, production network/deploy는 아직 열리지 않았다.

## 3. 안전한 구현 순서 후보

### 후보 A — customer V2 viewer 먼저, admin issuer 나중 (권장)

1. V1과 분리된 V2 open/controller를 non-UI port와 fake로 구현한다.
2. encrypted document를 V2 reader로 읽고 복호화한 뒤 scene reader, evidence digest, proof bytes digest,
   intrinsic dimensions를 검증한다.
3. validated closed evidence만으로 frame plan을 만들고 unsupported capability는 차단한다.
4. Claude Code가 customer password/loading/error/ready composition을 Modern Studio 정본에 맞춰 구현한다.
5. viewer local gate가 통과한 다음 admin issue session/controller를 구현한다.
6. 마지막에 Claude Code가 admin draft/preview/issue/success UI를 구성한다.

장점: 저장 성공 후 열리지 않는 링크를 production UI가 만들지 않는다. viewer와 issuer 각각의 실패
경계를 작게 검증할 수 있다. 단점: admin UI가 한 단위 늦어진다.

### 후보 B — admin issuer UI 먼저, 발급은 항상 disabled

UI draft와 preview만 먼저 만들고 V2 viewer가 통과하기 전 issue 버튼을 build-time/runtime gate로 막는다.
화면 탐색은 가능하지만 실제 workflow를 끝까지 검증할 수 없고, 임시 disabled 상태가 오래 남을 위험이
있다.

### 후보 C — issuer와 viewer를 한 스펙에서 동시 구현

입력 session, proof capture, encryption, Firebase write, password route, asset verification, rendering과 두 앱
UI를 한꺼번에 연다. 실패 원인과 회귀 표면이 너무 커 현재 보호형 스펙 단위에 부적합하다.

## 4. admin issue session의 최소 안전 조건

- catalog는 issue draft 시작 시의 검증된 baseline snapshot으로 고정한다. 저장 직전 자동 reload/adopt는 0.
- selection, orientation, logical width, color와 transform은 같은 draft가 소유한다.
- proof PNG는 같은 frozen draft와 같은 versioned render plan에서 export한다. 임의 PNG 업로드와 독립
  metadata 수기 입력을 exact replay로 부르지 않는다.
- bundle 생성 전후 draft mutation은 기존 bundle을 폐기한다. 이전 UUID/token을 재사용하지 않는다.
- password는 두 입력의 일치와 최소 local validation만 거치고 state persistence/log/URL/clipboard에 넣지
  않는다.
- issue는 한 번에 하나만 허용한다. 자동 retry·merge·새 token 자동 재발급은 0.
- 성공 UI는 write port가 success 또는 exact server reconciliation success를 반환한 뒤에만 same-origin
  `?space=<token>` 후보를 만든다. password는 링크에 포함하지 않는다.
- outcome unknown, asset orphan 가능성, auth expiry는 안전 문구로 멈추고 성공으로 추측하지 않는다.
- space writer는 기존 `AdminOperatorComposition`의 default app/Auth를 재사용하고 명시 issue action 전
  lazy-create한다. 별도 named app/auth observer를 만들지 않는다.
- 실제 UID가 없으므로 local 합성 UID 전용 검증까지만 가능하다. live gate는 계속 닫힌다.

## 5. 화면 계약에 필요한 상태

Claude Code가 UI를 구현할 때 최소 다음 상태를 모두 디자인해야 한다. 특정 시각 디자인은 이 조사에서
확정하지 않고 Modern Studio token과 기존 primitive를 따른다.

| 상태 | 필수 의미 |
|---|---|
| auth blocked | 운영자 인증 전 V2 draft/write adapter 생성 0 |
| baseline unloaded/loading/error | catalog 입력을 사용할 수 없고 issue action 0 |
| draft empty/editing/invalid | 필수 input과 exact replay capability를 명시 |
| proof preparing/ready/failed | 같은 frozen draft의 PNG만 사용 |
| password invalid/mismatch | password persistence·raw echo 0 |
| issue in-flight | 중복 submit 0, 자동 retry 0 |
| issue success | 검증된 link만 명시적 copy 가능 |
| definite failure | safe message, raw SDK/token/path/password 0 |
| outcome unknown | 성공·실패 추측 0, 임의 재시도 0 |
| stale draft | prepared bundle 폐기 후 명시 재준비 |

접근성은 label/error association, keyboard order, loading/status announcement, destructive-looking action의
명확한 명칭, 320px overflow 0을 포함한다. admin dashboard에 landing-page 장식이나 무관한 섹션을
추가하지 않는다.

## 6. Founder 결정 필요 항목

### LL-1 — end-to-end 순서

- **A (권장):** customer V2 open/replay를 먼저 완료하고, admin issue UI는 그 다음에 구현한다.
- B: admin UI shell을 먼저 만들되 issue action을 V2 viewer PASS 전까지 hard-disabled한다.
- C: 두 앱을 한 스펙에서 동시에 구현한다.

### LL-2 — proof PNG source

- **A (권장):** 동일 frozen issue draft와 versioned render plan에서 export한 PNG만 허용한다.
- B: 운영자가 별도 PNG를 업로드하고 metadata를 수동 입력할 수 있게 한다.

### LL-3 — catalog 기준

- **A (권장):** draft 시작 시 검증된 C5 baseline catalog snapshot을 고정하고 자동 reload/adopt하지 않는다.
- B: issue 직전에 최신 catalog를 자동 reload해 새 값을 채택한다.

### LL-4 — Firebase composition

- **A (권장):** 기존 admin default app/Auth authority를 재사용하고 space writer는 명시 issue action 전까지
  lazy-create한다. 별도 exact env gate는 default false다.
- B: Space V2 전용 named Firebase app/Auth를 만든다.

### LL-5 — 성공 link/password UX

- **A (권장):** confirmed success 뒤 same-origin `?space=<token>`만 표시·명시 copy하며 password는 별도
  전달하고 저장/URL/clipboard 자동 포함 0이다.
- B: link에 password 또는 password-derived 값을 포함한다.

### LL-6 — 스펙 077 첫 구현 단위

- **A (권장):** V2 open/controller + proof fetch/integrity + replay plan의 non-UI 계약과 fake부터 구현한다.
  UI/CSS는 후속 Claude Code 스펙에서 수행한다.
- B: 첫 단위에 customer UI까지 포함한다.
- C: 첫 단위에 admin issuer UI까지 포함한다.

## 7. 계속 금지 / STOP

- LL-1~LL-6 결정 전 제품 구현과 UI/CSS 시작
- actual UID 추측, 실제 Firebase/project/bucket/data/network/live, deploy
- Rules/config/package/lockfile 변경, 신규 dependency/download/install
- orphan delete/cleanup, publish, V1 migration/rewrite, C6/backend
- current catalog silent adoption, arbitrary proof substitution, password persistence/logging
- 보호 대상 restore/checkout/stage/commit

## 8. 검증 수준과 진행도

이번 조사는 로컬 소스와 기존 검증 기록을 읽은 문서 조사다. unit/E2E/emulator를 실행하지 않았고 제품
동작을 새로 검증했다고 주장하지 않는다. 전체 리빌드 진행도는 **80~83% 완료 / 17~20% 잔여**로 유지한다.
최종 스펙 분모가 없는 roadmap 작업축 기반 관리 추정이며, 문서 조사만으로 완료율을 올리지 않는다.
