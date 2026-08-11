# 스펙 037 — 운영자 상태 쓰기 C5 (불변 객체 + 단일 Firestore head) · Emulator 검증 계약

상태: **계약 문서 작성 완료 — 구현 미착수 · 미승인**
작성 2026-08-11 · 기준 HEAD = origin = `dc5666d`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`
(Founder G-1~G-5, 2026-08-11 승인) · 선행 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E)
근거 조사: `reviews/2026-08-11-admin-write-atomicity-investigation.md`(보완 라운드 1 반영)
구조 결정: **Codex Z-1 ~ Z-8** (2026-08-11)
선행 스펙: `036-admin-auth-private-state-read.md` (**DONE** — 읽기 경계·오류 규율·주입 facade 선례)

> **이 문서는 계약이다. 제품 코드가 아니다.**
> 이 라운드에서 `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
> `package.json`·lockfile·`pnpm-workspace.yaml` 변경은 **0**이다.
> 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 **0**, upload/write/delete/publish/deploy **0**.
> **이 계약은 실제 저장 구현도 UI 연결도 승인하지 않는다.**

---

## 0. 목표 (WHY)

리빌드 admin이 **운영자 상태를 조용한 손실 없이 저장할 수 있는 구조**를 확정하고,
그 구조가 **로컬 emulator에서 실제 Rules로 검증**되게 만든다.

조사(`reviews/2026-08-11-…`)의 결론이 전제다:

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 없다.** → 같은 경로를 두
  운영자가 덮어쓰는 모델은 **어떤 방식으로도 안전하게 만들 수 없다.**
- 그래서 **덮어쓰기를 아예 없앤다**(C5): **객체는 매번 새 경로에 한 번만 생성**되고,
  **가변 지점은 Firestore head 문서 하나뿐**이며 그 이동만 **transaction CAS**로 보호한다.

> **★ 이 설계가 안전한 이유는 Storage와 Firestore 사이의 cross-service 원자성 때문이 **아니다**.**
> **불변 객체를 먼저 만들고, 단일 가변 정본(head)만 CAS로 옮기기 때문**이다.
> 간극에서 실패하면 **orphan 객체 + 명시적 충돌**이 되고, **남의 바이트를 덮는 일은 일어나지 않는다.**

## 1. 범위 (SCOPE)

**포함**

- **쓰기 port 계약**: `@denn/firebase/admin-write` 서브패스(신규 공개 표면 후보)
- **Storage 불변 객체 생성** — `rebuild-admin-state/objects/{operationId}.json`, create-only
- **Firestore head CAS** — `/rebuildAdminState/head` 단일 문서, transaction 안 `expectedBase` 일치 시에만 +1
- **읽기 기준(baseline) 계약** — head 유무에 따른 로드 규칙과 `expectedBase` 고정
- **안전 오류 계약 8종**
- **`storage.rules`·`firestore.rules`의 목표 상태**(구현 단계에서 편집, **배포는 계속 차단**)
- **로컬 Firebase Emulator 검증 계약**(실제 Rules로 7개 시나리오)
- **결정적 합성 fake 검증 계약**

**제외 (하지 않을 것)**

- **저장 버튼·admin UI 연결** — 이번 첫 구현 단위에 **포함하지 않는다**(Z-4)
- **tombstone · 자동 merge · L-4 삭제 부활 해결** — 별도 후속 스펙(Z-7)
- **`published/state.json` 발행** (F-B·G-5)
- **legacy `admin/state.json` 쓰기** (F-C·G-1: 읽기 전용 고정)
- **legacy `wcm`/`hcm` 되쓰기·삭제·마이그레이션** (F-D)
- **orphan 삭제·자동 정리·클라이언트 delete 권한** (G-4)
- **C6**(Cloud Function/backend/Admin SDK) — 예비 대안 보류(G-3)
- **C3 고정 경로 CAS · C4 lease/lock** — 사용하지 않는다(G-5)
- **Rules 배포 · Hosting 배포 · 실제 운영 쓰기 활성화** (G-1·G-4·G-5·Z-8)
- **실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network** (G-5)
- 회원가입·다중 계정·역할 UI (F-A)

---

## 2. Z-1 — 승인 UID 제한의 적용 범위

### 2.1 적용 대상

승인된 운영자 UID 제한은 **다음 둘에만** 적용한다:

1. **Storage** `rebuild-admin-state/**`
2. **Firestore** `/rebuildAdminState/head`

### 2.2 ★ 기존 `op()`를 바꾸지 않는다

`storage.rules:18-21`의 `op()`는 `admin/`뿐 아니라 `published/`·`templates/`·`placeholders/`·
`guides/`·`mockups/`·`editor-overlays/`의 write 조건에도 함께 쓰인다(`:35-40`).

> **`op()` 본체를 UID 제한으로 바꾸지 않는다.** 바꾸면 레거시 발행
> (`denn-admin.html:14946` = `uploadDataUrl(dataUrl,'published/state.json')`)과 운영자 자산 업로드까지
> **우발적으로 함께 잠긴다.** UID 제한은 **새 함수**(예: `approvedOperator()`)로 **새 경로에만** 건다.

`admin/{p=**}`의 write 축소는 **§3.4**에서 별도로 다룬다(레거시 `admin/state.json` 읽기 전용 고정).

### 2.3 ★ 실제 UID는 UNCONFIRMED다

- **실제 운영자 UID는 저장소에서 확인할 수 없다.**
- **추측하지 않는다.** 예시 값을 실제 값처럼 기록하지 않는다.
- 커밋되는 Rules에는 **명확히 표시된 placeholder 상수**만 둔다. 예:
  `// UNCONFIRMED_OPERATOR_UID — Founder가 정본 UID를 제공하기 전에는 배포 금지`
- **UID 정본 제공 전 live Rules 배포와 운영 쓰기는 계속 차단**한다(G-1·Z-8).

### 2.4 Emulator 합성 UID

emulator 검증에서는 **실제 UID와 명확히 구분되는 고정 합성 UID**를 쓴다.

```
EMULATOR_OPERATOR_UID = "emulator-operator-DO-NOT-DEPLOY"
```

- 형식이 **실제 Firebase UID(28자 영숫자)와 다르게** 생겨서 **혼동이 불가능**해야 한다.
- 이 값은 **emulator 전용 파일에만** 존재하고 **배포 대상 Rules에는 들어가지 않는다**(§7.3).

---

## 3. Z-2 — Storage 경로와 객체 식별자

### 3.1 경로

```
rebuild-admin-state/objects/{operationId}.json
```

- **기존 `admin/{p=**}` 하위가 아닌 별도 최상위 경로**다.
  → 겹치는 상위 match가 없으므로 **OR 평가 우회가 구조적으로 발생하지 않는다**
  (`storage.rules:5-7` 머리말이 경고한 문제).
- `operationId` = **저장 작업 시작 시 한 번 생성하는 무작위 UUID**.
  `crypto.randomUUID()`를 쓰며 **재시도해도 새로 만들지 않는다**(같은 저장 시도 = 같은 경로).

### 3.2 ★ 경로에 넣지 않는 것

**revision · 고객 문구 · catalog id · 이메일 · UID · 시간 · 파일명 · 사이즈 이름** 전부 금지.
경로는 **의미 없는 불투명 식별자**여야 한다(P-5c 비노출 규율의 연장).
**content-addressed identifier는 이번 스펙에서 사용하지 않는다.**

> revision을 경로에 넣지 않는 이유는 조사 §6.4에 있다 — 넣으면 번호를 **미리 예약**해야 하고,
> 그 예약 트랜잭션이 **커밋 CAS와 모순**되거나 **두 writer가 같은 번호를 잡는다**.

### 3.3 객체 형식

- `contentType`: **`application/json`**
- 크기: **20 MiB 미만** 유지 — 기존 `okSize()`(`storage.rules:22`)와 동일 정책
- **create-only 불변**: `resource == null` 조건으로 **생성만** 허용하고
  **update(메타데이터 변경)와 delete를 허용하지 않는다.**

### 3.4 Rules 목표 상태 (구현 단계에서 편집 · 배포는 차단)

```
// 목표 형태 — 실제 문법·배치는 구현 단계에서 확정한다
match /rebuild-admin-state/objects/{objectId} {
  allow read:   if approvedOperator();
  allow create: if approvedOperator() && resource == null && okSize()
                   && request.resource.contentType == 'application/json';
  allow update: if false;
  allow delete: if false;
}
```

그리고 **G-1이 요구한 상위 축소**:

```
match /admin/{p=**} {
  allow read:  if op();          // 유지 — 스펙 036의 읽기 경로
  allow write: if false;         // ★ legacy admin/state.json 읽기 전용 고정
}
```

> ⚠️ **`allow write: if false`는 `denn-admin.html:740`의 저장을 서버에서 거부한다.**
> 그것이 **현재 운영자의 유일한 저장 경로**다. **배포 순서는 §9(Z-8)의 STOP 대상**이다.

**이 계약 문서 라운드에서 `storage.rules`는 수정하지 않았다.**

---

## 4. Z-3 — Firestore head

### 4.1 문서와 스키마

**가변 정본은 정확히 한 문서다.**

```
/rebuildAdminState/head
```

**최소 스키마 (허용 키 3개 — 그 외 키 금지)**

| 키 | 타입 | 규칙 |
| --- | --- | --- |
| `schemaVersion` | number | **정확히 `1`** |
| `revision` | number | **1 이상의 정수** |
| `objectPath` | string | **`rebuild-admin-state/objects/{operationId}.json`** 형태만 |

### 4.2 ★ head에 저장하지 않는 것

**이메일 · UID · 고객 문구 · 원문 catalog · token · 오류 원문** 전부 금지.
`objectPath`는 §3.2에 따라 **불투명 식별자만** 담으므로 이 규율과 충돌하지 않는다.

### 4.3 commit 규칙

- **최초 commit**: transaction 안에서 **head 부재를 확인**하고 **`revision: 1`로 create**한다.
- **이후 commit**: transaction 안에서 **현재 `revision`과 `expectedBase`가 같을 때만**
  **`revision`을 정확히 1 증가**시킨다.
- 불일치면 **자동으로 새 base를 채택하지 않고** `WRITE_CONFLICT`로 중단한다(§6).

### 4.4 `firestore.rules` 이중 강제 (목표 상태)

Rules도 **독립적으로** 다음을 강제한다 — 클라이언트 로직이 틀려도 서버가 막는다.

- **정확한 문서 경로** `/rebuildAdminState/head` 하나만. 그 외 이 컬렉션의 문서는 거부.
- **승인 UID**만 write.
- **허용 키 3개**만(그 외 키가 있으면 거부).
- **create는 `revision == 1`**일 때만.
- **update는 `request.resource.data.revision == resource.data.revision + 1`**일 때만.
- **delete 금지.**
- `spaces/{token}`과 catch-all `allow read, write: if false`(`firestore.rules:11-21`)는 **무변경**.

> **★ Firestore Rules가 Storage 객체의 실제 존재를 원자적으로 증명한다고 주장하지 않는다.**
> Rules는 `objectPath` **문자열의 형태**만 검사할 수 있다. "그 경로에 객체가 실제로 있는가"는
> **cross-service 질문이고 Rules로 답할 수 없다.** 그 간극은 §6.5의 **fail-closed 읽기**가 흡수한다.

**이 계약 문서 라운드에서 `firestore.rules`는 수정하지 않았다.**

---

## 5. Z-4 — 패키지와 write port 경계

### 5.1 공개 표면

- **신규 서브패스 후보**: `@denn/firebase/admin-write`
- **`packages/firebase/src/index.ts` 루트 배럴은 변경하지 않는다**(스펙 036과 동일 규율).
- **Firebase SDK와 Firestore를 admin 전용 lazy 경계 밖으로 노출하지 않는다**
  — `sdk-facade.ts:24-28`의 **동적 import** 패턴을 그대로 따른다.
- **기본 앱 상태에서 write adapter 생성과 네트워크는 0이어야 한다**
  (스펙 036 §3의 "플래그 정확 비교 + config 5개 완전" 게이트를 재사용).
- **주입 facade + 합성 fake** — 유닛 테스트는 실제 SDK를 부르지 않는다(`facade.ts` 선례).

### 5.2 ★ 이번 단위에 포함하지 않는 것

- **저장 버튼**, **실제 admin UI 연결**, `PrintSizeCmDraft`(스펙 035)와의 결합.
  → 이번 구현 단위는 **port + Rules + emulator 검증까지**다.

### 5.3 동시성·재시도 규율

- **한 번에 하나의 save만 허용한다**(단일 in-flight — `read-port.ts:150` 선례).
- **앱 수준 자동 retry 0**, **자동 merge 0**.
- ⚠️ **Firebase SDK 내부 재시도가 존재한다**(`@firebase/storage` 업로드 재시도 창 **10분**,
  `index.esm.js:37`·`:43`). 따라서 **"네트워크 요청 자체가 정확히 1회"라고 단정하지 않는다.**
  계약이 보장하는 것은 **앱이 스스로 다시 쏘지 않는다**는 것뿐이다.
  → 이것이 §3.1에서 **재시도해도 `operationId`를 새로 만들지 않는** 이유이기도 하다:
  SDK가 같은 요청을 다시 보내도 **같은 불투명 경로**를 향하고, `resource == null`이 **두 번째를 거부**한다.

### 5.4 안전 오류 계약 (최소 8분기)

| 코드 | 의미 | `retryable` |
| --- | --- | --- |
| `WRITE_CONFLICT` | head의 현재 revision ≠ `expectedBase` | **false** |
| `WRITE_AUTH_REQUIRED` | 미인증·초기화 중·익명 | true |
| `WRITE_FORBIDDEN` | 인증됐으나 Rules가 거부(승인 UID 아님 등) | false |
| `WRITE_INVALID_INPUT` | payload·`expectedBase`·`operationId`가 계약 위반 | false |
| `WRITE_UPLOAD_FAILED` | 업로드가 **명확히 실패**했다 | true |
| `WRITE_UPLOAD_OUTCOME_UNKNOWN` | 업로드 결과를 **확인할 수 없다**(timeout 등) | **false** |
| `WRITE_HEAD_FAILED` | head transaction이 **명확히 실패**했다 | true |
| `WRITE_COMMIT_OUTCOME_UNKNOWN` | commit 결과를 **확인할 수 없다** | **false** |

- **`WRITE_CONFLICT`와 두 `*_OUTCOME_UNKNOWN`은 `retryable: false`** 이며,
  **재읽기 후 사용자의 명시적 재시도만** 허용한다. 자동 재시도는 **덮어쓰기 위험 그 자체**다.
- **raw SDK message · email · UID · token · object bytes를 오류·로그·UI에 노출하지 않는다**
  (스펙 036 `errors.ts` 규율 계승 — `category`/`retryable`은 **코드의 속성**이고 호출부마다 달라지지 않는다).
- `correlationId`는 **호출자 주입**(스펙 036과 동일, `CORRELATION_ID_PATTERN`).

---

## 6. Z-5 — 읽기 기준과 `expectedBase`

### 6.1 baseline 로드

| head 상태 | 읽는 대상 | `expectedBase` |
| --- | --- | --- |
| **없음** | legacy `admin/state.json`(스펙 036 읽기 경로) | **`0`** |
| **있음** | **head가 가리키는 rebuild 객체만** | head의 `revision` |

### 6.2 ★ head가 있으면 legacy를 읽지 않는다

head가 존재하는데 그 객체가 **없거나 invalid**하면 **fail-closed** 한다.
**legacy로 조용히 fallback하지 않는다.** — 조용한 fallback은 **운영자에게 옛 데이터를 최신처럼
보여 주고, 그 위에 저장하게 만들어 실제 손실을 만든다.**

### 6.3 `expectedBase` 고정

- `expectedBase`는 **사용자가 편집을 시작한 정확한 로드 결과의 revision**이다.
- **저장 직전에 새 base를 자동 채택하지 않는다.** **자동 병합도 하지 않는다.**
- **commit 성공 후에만** 로컬 기준 revision을 **반환된 새 revision**으로 갱신한다.

### 6.4 저장 순서 (고정)

```
1. operationId = crypto.randomUUID()            ← 재시도해도 다시 만들지 않는다
2. Storage upload → rebuild-admin-state/objects/{operationId}.json   (create-only)
   실패        → WRITE_UPLOAD_FAILED           (head 불변)
   결과 불명   → WRITE_UPLOAD_OUTCOME_UNKNOWN  (head 불변)
3. Firestore transaction (단 한 번)
   head 없음            → revision 1로 create
   head.revision == expectedBase → revision + 1로 update
   불일치               → WRITE_CONFLICT        (업로드된 객체는 orphan)
   실패                 → WRITE_HEAD_FAILED     (orphan)
   결과 불명            → WRITE_COMMIT_OUTCOME_UNKNOWN (orphan, 성공/실패 추측 금지)
4. 성공 → { revision: expectedBase + 1 } 반환, 로컬 기준 갱신
```

- **upload 성공 후 head commit 전 실패는 orphan으로 남고 head는 바뀌지 않는다.**
- **head commit 결과를 확인할 수 없는 timeout은 성공이나 실패로 추측하지 않는다.**
  → `WRITE_COMMIT_OUTCOME_UNKNOWN`. **다시 읽어야만** 진실을 알 수 있다.

### 6.5 orphan (G-4)

- **orphan = head가 참조하지 않는 불변 객체.**
- **클라이언트 delete 권한 없음**(§3.4에서 `allow delete: if false`), **자동 정리 없음.**
- **보존 기간·비용 한도·권한 있는 정리 주체가 별도 승인되기 전에는 실제 운영 쓰기를 활성화하지 않는다.**

---

## 7. Z-6 — Emulator 검증 계약

### 7.1 ★ 사전 확인 결과 (2026-08-11, 읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

| 항목 | 결과 |
| --- | --- |
| **Java** | **사용 가능** — `openjdk 21.0.11 2026-04-21 LTS` (Microsoft build) |
| **firebase-tools** | **사용 가능** — 전역 **`15.22.4`**. 저장소 의존성이 **아니다**(`package.json` 어디에도 없음) → **lockfile 변경 불필요** |
| **Firestore emulator binary** | **캐시됨** — `~/.cache/firebase/emulators/cloud-firestore-emulator-v1.21.0.jar` |
| **Storage rules runtime** | **캐시됨** — `~/.cache/firebase/emulators/cloud-storage-rules-runtime-v1.1.3.jar` |
| **Emulator UI** | **캐시됨** — `ui-v1.15.0` |
| **Auth emulator binary** | 별도 jar이 캐시에 **없다**. firebase-tools 내장으로 보이나 **이 조사에서 확인하지 않았다** → **UNCONFIRMED** |
| **포트** 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free**(확인 시점) |
| `.firebaserc` | `projects.default = "denn-products"` ← **★ 실제 운영 프로젝트 id** |

> **★★ 첫 실행에서 binary 다운로드·설치·신규 의존성 추가가 필요해지면 실행하지 말고 STOP한다**(§7.6).
> 특히 **Auth emulator가 다운로드를 시도하면 즉시 중단**하고 보고한다.

### 7.2 ★★ 운영 프로젝트 접촉 차단 (필수)

`.firebaserc`의 default project가 **실제 운영 프로젝트 `denn-products`** 이므로,
**`--project`를 생략한 emulator 실행은 운영 프로젝트 id로 동작한다.**
설정이 하나라도 어긋나면 **클라이언트 SDK가 실제 프로젝트로 나갈 수 있다.**

**따라서 계약은 다음을 강제한다:**

- emulator 실행과 테스트는 **반드시 `demo-` 접두 프로젝트 id**를 명시한다 — 예 `demo-denn-emulator`.
  Firebase는 `demo-` 접두 id를 **emulator 전용**으로 다루며 **실제 자격 증명이 존재하지 않는다.**
- 테스트는 **emulator host 환경변수가 설정되지 않았으면 시작 자체를 거부**한다(fail-closed).
- `.firebaserc`는 **수정하지 않는다.**
- 실제 `denn-products` 프로젝트·운영 bucket·운영 데이터·live network 접근 **0**.

### 7.3 ★ "실제 Rules로 검증한다"의 정확한 의미

Rules는 **UID 값을 변수로 받을 수 없다.** 실제 UID는 UNCONFIRMED이고 커밋 금지다(§2.3).
따라서 emulator는 **합성 UID가 치환된 사본**을 쓴다. 이 사본이 **진짜 Rules와 다르지 않음**을
테스트가 직접 고정한다.

- emulator용 rules 파일은 **배포 대상 rules와 오직 UID 상수 한 줄만 다르다.**
- **그 사실 자체를 단위 테스트가 검증한다** — 두 파일을 읽어 **UID 라인을 제외한 diff가 0**임을 확인.
  이 테스트가 없으면 "실제 Rules를 검증했다"고 말할 수 없다.
- 합성 UID `emulator-operator-DO-NOT-DEPLOY`는 **emulator 사본에만** 존재한다.

### 7.4 테스트 분리 (기존 선례 그대로)

저장소에는 이미 **opt-in 테스트 분리 선례**가 있다:
`vitest.config.ts:17`이 `**/*.live.test.ts`를 **기본 게이트에서 제외**하고,
`vitest.live.config.ts` + `pnpm test:live:node`로만 실행한다.

emulator 테스트도 **같은 형태**를 따른다:

- 파일 규칙 **`*.emulator.test.ts`**, 기본 `vitest.config.ts`의 `exclude`에 추가
- **`vitest.emulator.config.ts`** + **`pnpm test:emulator`** 에서만 실행
- **기본 unit/E2E 게이트에서 emulator는 절대 실행되지 않는다**
- emulator 기동/종료는 **명시적 명령**에서만 일어난다

### 7.5 검증할 시나리오 (최소 7개, 실제 Rules 사용)

| # | 시나리오 | 통과 기준 |
| --- | --- | --- |
| **1** | **승인된 합성 UID만** 객체 생성과 head transaction 가능 | 승인 UID: 성공 |
| **2** | **다른 UID · 익명 · 미인증** 요청 | **전부 거부**(Storage·Firestore 양쪽) |
| **3** | **동일 `operationId` 재업로드**와 **delete** | **전부 거부**(`resource == null` · `allow delete: if false`) |
| **4** | 같은 `expectedBase`를 가진 **두 writer** | **head 이동은 정확히 하나**, 다른 쪽은 **명시적 `WRITE_CONFLICT`**. head revision은 **정확히 +1** |
| **5** | **upload 성공 후 commit 전 중단** | **orphan 객체만 남고 head 불변** |
| **6** | **timeout · 늦은 성공 · commit 결과 불명** | **조용한 재시도 0 · 덮어쓰기 0.** `*_OUTCOME_UNKNOWN`으로 끝나고 head는 추측으로 바뀌지 않는다 |
| **7** | **중복 탭 · 인증 만료 상당** | **조용한 데이터 손실 0.** 손실 대신 **명시적 오류**가 난다 |

### 7.6 STOP 조건 (emulator 전용)

**아래 중 하나라도 필요해지면 실행하지 말고 기록·보고한다.**

- Java · firebase-tools · emulator binary의 **설치 또는 다운로드**
- **신규 의존성 추가**(`firebase-tools`를 저장소 의존성으로 넣는 것 포함)
- **타 프로세스 종료** 또는 **점유 포트 강제 해제**
- `.firebaserc` 수정, 실제 프로젝트 id 사용, 실제 자격 증명 필요
- **emulator 없이는 기본 게이트가 통과하지 않는** 상황

> **타 프로세스를 종료하거나 점유 포트를 강제로 해제하지 않는다.** 포트가 사용 중이면 **STOP**이다.

### 7.7 ★ fake 테스트가 증명하지 않는 것

> **합성 fake 테스트는 호출 순서와 오류 매핑을 증명할 뿐,
> 서버 Rules의 원자성이나 거부 동작을 증명하지 않는다.**
> Rules 거부·CAS 경합·orphan 발생은 **오직 emulator 테스트만** 보여 준다.
> 두 층은 서로를 대체하지 못한다.

---

## 8. Z-7 — tombstone과 병합

- **스펙 037에서 tombstone과 자동 merge를 도입하지 않는다.**
- 저장은 **문서 전체 CAS**다. `expectedBase` 충돌 시 **문서 전체를 거부**한다(부분 반영 없음).
- **L-4 삭제 부활**(`frameSizes`에 tombstone이 없어 삭제가 되살아나는 문제, 조사 §8.3)의
  자동 병합 해결은 **별도 후속 스펙**으로 유지한다. **원자성은 병합 의미론을 고치지 않는다.**
- 충돌 후 **최신본을 다시 읽고 변경을 재적용하는 것은 운영자의 명시적 행동**이어야 한다.

---

## 9. Z-8 — 배포 순서

- **이번 스펙에서 어떤 Rules나 앱도 배포하지 않는다.**
- **실제 UID · orphan 보존/비용/정리 정책 · emulator PASS**가 **모두** 확인되기 전에는
  **운영 쓰기를 열지 않는다.**
- **★ 현재 legacy `admin/state.json` 저장을 먼저 닫아 운영자가 아무 데도 저장할 수 없는 구간을
  만들지 않는다.** `denn-admin.html:740`이 지금 운영자의 **유일한** 저장 경로다(스펙 035 기준).
- **실제 cutover 순서는 별도 Founder 승인과 별도 배포 스펙 대상**이다.
- **이번 계약은 목표 상태와 STOP 조건만 기록한다.**

---

## 10. 허용 파일 (구현 단계에서만 · 이 문서 라운드에서는 전부 미변경)

```
packages/firebase/src/admin-write/**          (신규)
packages/firebase/package.json                (./admin-write 서브패스 export 추가)
storage.rules                                 (§3.4 목표 상태 — 배포는 계속 차단)
firestore.rules                               (§4.4 목표 상태 — 배포는 계속 차단)
<emulator 전용 rules 사본>                     (§7.3, 합성 UID만 다름)
firebase.json                                 (emulators 블록 추가 — §7)
vitest.config.ts                              (*.emulator.test.ts 제외 추가)
vitest.emulator.config.ts                     (신규)
package.json                                  (test:emulator 스크립트 추가)
**/*.emulator.test.ts                         (신규)
스펙 037 관련 handoff / CURRENT / live / STATE / NEXT 문서
```

- **`packages/firebase/src/index.ts` 루트 배럴 수정 금지.**
- **`apps/**` 수정 금지** — 이번 단위에 저장 버튼·UI 연결이 없다(§5.2).
- **계속 금지**: `apps/mockup/**` · `packages/render/**` · `packages/shared/**` · `.firebaserc` ·
  실제 `.env` · legacy HTML · 실제 Firebase/network/live/운영 데이터 · 발행·배포.
- `pnpm-lock.yaml`: **신규 의존성이 없으므로 변경이 없어야 한다.**
  변경이 필요해지면 **STOP**(§7.6).

---

## 11. 결정적 합성 검증 계약 (fake — 기본 게이트)

**`packages/firebase`** (facade를 합성 fake로 주입 — 실제 SDK·네트워크 0)

- **import 시 SDK 초기화·네트워크 0**, 기본 상태에서 **write adapter 생성 0**
- 저장 순서 고정(§6.4): `randomUUID` → upload → transaction. **호출 로그로 순서를 고정**
- **`operationId`가 재시도에서 새로 생성되지 않음**
- **upload 실패 시 transaction 호출 0회**
- **미인증·익명에서 upload·transaction 0회**(로컬 게이트가 먼저 막는다 — `read-port.ts:145` 선례)
- **단일 in-flight**: 두 번째 save 호출이 **새 요청을 만들지 않는다**
- **앱 자동 retry 0 · 자동 merge 0**
- `expectedBase` 불일치 → **`WRITE_CONFLICT`**, head 갱신 시도 0
- **timeout 이후 늦은 성공은 폐기**되고 **`*_OUTCOME_UNKNOWN`을 성공으로 바꾸지 않는다**
- **오류 매핑이 8코드 밖으로 새지 않음**
- **비노출**: raw SDK error·email·UID·token·object bytes가
  **`SafeWriteError`와 `JSON.stringify(error)` 결과에 0건**
- **head 스키마 위반**(허용 키 외 키, `revision` 비정수/0 이하, `objectPath` 형식 위반) → **fail-closed**
- **read baseline 분기**(§6.1~6.2): head 없음 → legacy + `expectedBase 0` /
  head 있음 → 객체만 읽음 / head 있고 객체 없거나 invalid → **fail-closed, legacy fallback 0**

**Rules 동등성** (§7.3)

- 배포 대상 rules와 emulator 사본이 **UID 라인을 제외하면 동일**함을 고정

> **★ 위 fake 테스트 전부는 서버 원자성을 증명하지 않는다**(§7.7).

---

## 12. 구현 후 게이트 (순서 고정)

```
pnpm install --frozen-lockfile   (lockfile diff 0이어야 한다)
→ pnpm format:check → pnpm lint → pnpm typecheck → pnpm test:unit
→ 독립 pnpm build → 전체 Chromium E2E → pnpm check
→ git diff --check → 허용/금지 diff 확인
→ 고객 dist SHA-256 전후 비교 (apps/** 무변경이므로 반드시 동일해야 한다)
→ ports 4183/4184 → OS temp staging → 실제 network 0 확인
→ [별도 명령] pnpm test:emulator   ← 기본 게이트에 포함되지 않는다
```

- **고객 번들은 이번 단위에서 변할 이유가 없다.** 달라지면 **원인을 밝히기 전까지 진행 금지.**
- **emulator 게이트는 마지막에 명시적으로** 돌리고, 기동한 emulator는 **반드시 종료**하며
  잔여 프로세스·포트를 확인한다.

## 13. STOP 조건 (구현하지 않고 보고)

- **실제 운영자 UID**가 필요해짐(§2.3) — placeholder로 진행할 수 없는 지점에 도달
- **Rules 배포**가 필요해짐 — **금지**(Z-8)
- emulator **설치·다운로드·신규 의존성·포트 강제 해제**가 필요해짐(§7.6)
- **실제 Firebase 요청 없이는 게이트가 통과하지 않음**
- **`apps/**` 수정**이 필요해짐(= UI 연결이 필요하다는 뜻 → 범위 밖, §5.2)
- **`packages/firebase` 루트 배럴** 또는 **고객 번들 변경**이 필요해짐
- **tombstone·자동 merge**가 필요해짐(§8)
- **orphan 삭제·정리**가 필요해짐(G-4)
- Rules가 **`objectPath`의 실제 객체 존재를 증명해야** 계약이 성립한다고 판단됨
  → 그렇다면 C5 전제가 흔들리는 것이므로 **즉시 보고**(G-3의 C6 재검토 사유)

## 14. NOT TESTED / UNCONFIRMED (이 스펙이 끝나도 확인되지 않는 것)

- **실제 Firebase 프로젝트에서의 동작 전부** — 실제 Rules 배포·거부, 실제 bucket, 실제 운영 데이터
- **실제 운영자 UID와 그 계정의 실재·로그인**
- **실제 네트워크 지연·단절에서의 거동** — emulator는 로컬이라 타이밍이 다르다
- **실기기·다중 기기 동시 편집**
- **Auth emulator binary의 가용성**(§7.1 UNCONFIRMED)
- **운영 규모 payload**(실제 `admin/state.json` 크기·내용은 여전히 미확인)
- **orphan 누적의 실제 비용**
- **L-4 삭제 부활**(§8 — 이 스펙이 다루지 않는다)
- `pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결)

## 15. 위험 (RISK)

| # | 위험 | 완화 |
| --- | --- | --- |
| **R-1** | **★★ Rules 배포가 운영자의 유일한 저장 경로를 닫는다** | Z-8: 이번 스펙에서 배포 0. cutover는 별도 스펙·별도 승인 |
| **R-2** | **★ emulator가 실제 프로젝트 id로 뜬다**(`.firebaserc` default = `denn-products`) | §7.2: **`demo-` 접두 프로젝트 강제** + emulator host 미설정 시 **시작 거부** |
| **R-3** | emulator 사본 Rules가 실제 Rules와 갈라져 **검증이 무의미해진다** | §7.3: **UID 라인 외 diff 0**을 테스트가 고정 |
| **R-4** | SDK 내부 재시도가 **같은 객체를 두 번 쓴다** | §3.3 `resource == null`이 **두 번째를 서버에서 거부**. §5.3이 "요청 1회"를 주장하지 않음 |
| **R-5** | `*_OUTCOME_UNKNOWN`을 UI가 **성공/실패로 단정**한다 | §5.4 `retryable: false` + **재읽기 후 명시적 재시도만**. UI 연결은 이번 범위 밖(§5.2) |
| **R-6** | head는 있는데 객체가 없어 **legacy로 조용히 되돌아간다** | §6.2 **fail-closed, fallback 0** |
| **R-7** | orphan이 누적된다 | G-4: 정리 정책 승인 전 **운영 쓰기 미활성화** |
| **R-8** | `op()`를 건드려 **레거시 발행·자산 업로드가 함께 잠긴다** | §2.2 **`op()` 무변경**, UID는 새 함수로 새 경로에만 |

---

### 승인 상태

- **Founder G-1~G-5**: 승인됨(`dc5666d`) — **계약 작성 + 합성 fake + 로컬 emulator 검증까지**
- **이 계약 문서**: 작성 완료, **Codex 검토 대기**
- **구현 착수**: **아직 승인되지 않았다.**
- **실제 저장 구현과 UI 연결**: **이 계약이 승인하지 않는다.**
- **Rules 배포 · 운영 쓰기**: **차단 유지**(UID 정본 + orphan 정책 + emulator PASS가 전제)
