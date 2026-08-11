# 스펙 037 — 운영자 상태 쓰기 C5 (불변 객체 + 단일 Firestore head) · Emulator 검증 계약

상태: **계약 문서 — 보완 라운드 1 적용 · 구현 미착수 · 미승인**
작성 2026-08-11 · 초판 기준 HEAD = origin = `dc5666d` (초판 커밋 `c654023`)
**보완 라운드 1 (CORRECTION_REQUIRED, 2026-08-11)** · 보완 기준 HEAD = origin = `c654023`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`
(Founder G-1~G-5, 2026-08-11 승인) · 선행 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E)
근거 조사: `reviews/2026-08-11-admin-write-atomicity-investigation.md`(보완 라운드 1 반영)
구조 결정: **Codex Z-1 ~ Z-8** + **보완 라운드 1 교정 1~5**
선행 스펙: `036-admin-auth-private-state-read.md` (**DONE** — 읽기 경계·오류 규율·주입 facade 선례)

> **이 문서는 계약이다. 제품 코드가 아니다.**
> 이 라운드에서 `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
> **`firebase.emulator.json`**·`package.json`·lockfile·`pnpm-workspace.yaml` 변경은 **0**이다.
> 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 **0**, upload/write/delete/publish/deploy **0**.
> **이 계약은 실제 저장 구현도 UI 연결도 승인하지 않는다.**

---

## 0. 보완 라운드 1 — 무엇을 정정했는가

Codex 계약 검수가 초판(`c654023`)에서 **5건의 결함**을 확인했다. 이 문서는 그 정정본이다.

| # | 초판의 결함 | 정정 |
| --- | --- | --- |
| **1** | baseline load에 필요한 **Firestore head `get` 권한이 Rules 계약에 없었다** | §4.4를 **get/list/create/update/delete 전 분기**로 다시 썼다. `list` 거부, `objectPath` 형태 강제, update 시 **`objectPath`가 이전 값과 달라야 함**을 추가 |
| **2** | **합성 UID Rules 사본을 선택할 별도 emulator config가 없어** 배포 config와 섞일 수 있었다 | **`firebase.json`은 구현 단계에서도 수정하지 않는다.** 신규 **`firebase.emulator.json`** 을 emulator 전용 config로 고정했다(§7.3). 허용 파일에서 `firebase.json` **제거**, `firebase.emulator.json` **추가** |
| **3** | **`WRITE_COMMIT_OUTCOME_UNKNOWN`을 orphan으로 단정**해 "실제로는 commit이 성공했을 수 있다"와 모순됐다 | §6.5를 **3가지 결과 상태로 분리**했다. 결과 불명은 **orphan이라고 부르지 않는다**. **head 재조회로만 판정**하며, **`WRITE_HEAD_FAILED`도 `retryable: false`** 로 바꿨다 |
| **4** | Firestore **transaction callback의 SDK 내부 재실행**과 **callback 부작용 금지**가 없었다 | §5.5를 신설했다. **앱은 `runTransaction`을 정확히 1회 호출**하지만 **SDK는 callback을 여러 번 실행할 수 있다**. callback 안에서 `transaction.get/set` 외 부작용 **전면 금지** |
| **5** | `@denn/firebase/admin-write`의 **`loadBaseline`/`save` 공개 타입·입출력**이 없었다 | §5.6에 **이름까지 고정한 타입 계약**을 넣었다 |

**변하지 않은 것**: C5 구조(불변 객체 + 단일 Firestore head CAS), Z-1~Z-8의 방향, 배포 차단, 범위 제외.

---

## 1. 목표 (WHY)

리빌드 admin이 **운영자 상태를 조용한 손실 없이 저장할 수 있는 구조**를 확정하고,
그 구조가 **로컬 emulator에서 실제 Rules로 검증**되게 만든다.

조사(`reviews/2026-08-11-…`)의 결론이 전제다:

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 없다.** → 같은 경로를 두
  운영자가 덮어쓰는 모델은 **어떤 방식으로도 안전하게 만들 수 없다.**
- 그래서 **덮어쓰기를 아예 없앤다**(C5): **객체는 매번 새 경로에 한 번만 생성**되고,
  **가변 지점은 Firestore head 문서 하나뿐**이며 그 이동만 **transaction CAS**로 보호한다.

> **★ 이 설계가 안전한 이유는 Storage와 Firestore 사이의 cross-service 원자성 때문이 **아니다**.**
> **불변 객체를 먼저 만들고, 단일 가변 정본(head)만 CAS로 옮기기 때문**이다.
> 실패해도 **남의 바이트를 덮는 일은 일어나지 않는다.**

## 2. 범위 (SCOPE)

**포함**

- **쓰기 port 계약**: `@denn/firebase/admin-write` 서브패스(신규 공개 표면 후보) — **타입까지 고정**(§5.6)
- **Storage 불변 객체 생성** — `rebuild-admin-state/objects/{operationId}.json`, create-only
- **Firestore head CAS** — `/rebuildAdminState/head` 단일 문서
- **읽기 기준(baseline) 계약** — head 유무에 따른 로드 규칙과 `expectedBase` 고정
- **안전 오류 계약 8종**과 **결과 상태 판정 규칙**
- **`storage.rules`·`firestore.rules`의 목표 상태**(구현 단계에서 편집, **배포는 계속 차단**)
- **`firebase.emulator.json` 기반 emulator 검증 계약**(실제 Rules로 시나리오 검증)
- **결정적 합성 fake 검증 계약**

**제외 (하지 않을 것)**

- **저장 버튼·admin UI 연결** — 이번 첫 구현 단위에 **포함하지 않는다**
- **"head commit만 재개" API** — 이번 스펙에 **만들지 않는다**(§6.5)
- **tombstone · 자동 merge · L-4 삭제 부활 해결** — 별도 후속 스펙(§8)
- **`packages/firebase/src/admin-read/**` 수정** — 이번 첫 구현에서 **건드리지 않는다**(§5.6)
- **`firebase.json` 수정** — 구현 단계에서도 **하지 않는다**(§7.3)
- **`published/state.json` 발행** (F-B·G-5) · **legacy `admin/state.json` 쓰기** (F-C·G-1)
- **legacy `wcm`/`hcm` 되쓰기·삭제·마이그레이션** (F-D)
- **orphan 삭제·자동 정리·클라이언트 delete 권한** (G-4)
- **C6**(G-3 보류) · **C3 고정 경로 CAS · C4 lease/lock**(G-5)
- **Rules 배포 · Hosting 배포 · 실제 운영 쓰기 활성화** (§9)
- **실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network** (G-5)

---

## 3. Z-1 — 승인 UID 제한의 적용 범위

### 3.1 적용 대상

승인된 운영자 UID 제한은 **다음 둘에만** 적용한다:

1. **Storage** `rebuild-admin-state/**`
2. **Firestore** `/rebuildAdminState/head`

### 3.2 ★ 기존 `op()`를 바꾸지 않는다

`storage.rules:18-21`의 `op()`는 `admin/`뿐 아니라 `published/`·`templates/`·`placeholders/`·
`guides/`·`mockups/`·`editor-overlays/`의 write 조건에도 함께 쓰인다(`:35-40`).

> **`op()` 본체를 UID 제한으로 바꾸지 않는다.** 바꾸면 레거시 발행
> (`denn-admin.html:14946` = `uploadDataUrl(dataUrl,'published/state.json')`)과 운영자 자산 업로드까지
> **우발적으로 함께 잠긴다.** UID 제한은 **새 함수**(예: `approvedOperator()`)로 **새 경로에만** 건다.

### 3.3 ★ 실제 UID는 UNCONFIRMED다

- **실제 운영자 UID는 저장소에서 확인할 수 없다. 추측하지 않는다.**
  예시 값을 실제 값처럼 기록하지 않는다.
- **배포 대상 `storage.rules`/`firestore.rules`에는 명확히 표시된 placeholder만** 둔다. 예:
  `// UNCONFIRMED_OPERATOR_UID — Founder가 정본 UID를 제공하기 전에는 배포 금지`
- **UID 정본 제공 전 live Rules 배포와 운영 쓰기는 계속 차단**한다(G-1·§9).

### 3.4 Emulator 합성 UID

```
EMULATOR_OPERATOR_UID = "emulator-operator-DO-NOT-DEPLOY"
```

- 형식이 **실제 Firebase UID(28자 영숫자)와 다르게** 생겨서 **혼동이 불가능**해야 한다.
- 이 값은 **emulator 전용 Rules 사본에만** 존재하고 **배포 대상 Rules에는 들어가지 않는다**(§7.3).
- **synthetic Auth 계정은 emulator 내부에서만 만든다 — 실제 계정 생성이 아니다**(§7.5).

---

## 4. Z-2 / Z-3 — Storage 경로와 Firestore head

### 4.1 Storage 경로

```
rebuild-admin-state/objects/{operationId}.json
```

- **기존 `admin/{p=**}` 하위가 아닌 별도 최상위 경로**다.
  → 겹치는 상위 match가 없으므로 **OR 평가 우회가 구조적으로 발생하지 않는다**
  (`storage.rules:5-7` 머리말이 경고한 문제).
- `operationId` = **저장 작업 시작 시 한 번 생성하는 무작위 UUID**(`crypto.randomUUID()`).
  **재시도해도 새로 만들지 않는다.** **transaction callback 안에서 만들지 않는다**(§5.5).
- **경로에 넣지 않는 것**: revision · 고객 문구 · catalog id · 이메일 · UID · 시간 · 파일명.
  **content-addressed identifier는 이번 스펙에서 사용하지 않는다.**
- `contentType` **`application/json`**, 크기 **20 MiB 미만**(`storage.rules:22` `okSize()`와 동일 정책).
- **`resource == null` create-only** — update/delete 금지.

### 4.2 `storage.rules` 목표 상태 (구현 단계에서 편집 · 배포는 차단)

```
// 목표 형태 — 실제 문법·배치는 구현 단계에서 확정한다
match /rebuild-admin-state/objects/{objectId} {
  allow read:   if approvedOperator();
  allow create: if approvedOperator() && resource == null && okSize()
                   && request.resource.contentType == 'application/json';
  allow update: if false;
  allow delete: if false;
}

match /admin/{p=**} {
  allow read:  if op();          // 유지 — 스펙 036의 읽기 경로
  allow write: if false;         // ★ G-1: legacy admin/state.json 읽기 전용 고정
}
```

> ⚠️ **`allow write: if false`는 `denn-admin.html:740`의 저장을 서버에서 거부한다.**
> 그것이 **현재 운영자의 유일한 저장 경로**다. **배포 순서는 §9의 STOP 대상**이다.

### 4.3 Firestore head 문서와 스키마

**가변 정본은 정확히 한 문서다.**

```
/rebuildAdminState/head
```

**허용 키 정확히 3개 — 그 외 키 금지**

| 키 | 타입 | 규칙 |
| --- | --- | --- |
| `schemaVersion` | number | **정확히 `1`** |
| `revision` | number | **1 이상의 정수** |
| `objectPath` | string | **`rebuild-admin-state/objects/{UUID}.json` 형태만** |

**head에 저장하지 않는 것**: 이메일 · UID · 고객 문구 · 원문 catalog · token · 오류 원문.

**commit 규칙**

- **최초 commit**: transaction 안에서 **head 부재를 확인**하고 **`revision: 1`로 create**.
- **이후 commit**: transaction 안에서 **현재 `revision`과 `expectedBase`가 같을 때만**
  **`revision`을 정확히 1 증가**시키고 **`objectPath`를 새 값으로 교체**한다.
- 불일치면 **자동으로 새 base를 채택하지 않고** `WRITE_CONFLICT`로 중단한다.

### 4.4 ★ [교정 1] `firestore.rules` 목표 상태 — read 포함 전 분기

초판은 **`get` 권한을 명시하지 않았다.** baseline load(§6.1)가 head를 읽어야 하므로 **필수**다.

```
// 목표 형태 — 실제 문법은 구현 단계에서 확정한다
match /rebuildAdminState/{docId} {
  // ── read ────────────────────────────────────────────────
  // ★ 승인 UID만, ★ 정확히 head 문서만
  allow get:    if approvedOperator() && docId == 'head';
  allow list:   if false;                  // ★ 컬렉션 열거 금지

  // ── write ───────────────────────────────────────────────
  allow create: if approvedOperator() && docId == 'head'
                   && validHeadKeys() && validObjectPath()
                   && request.resource.data.schemaVersion == 1
                   && request.resource.data.revision == 1;      // ★ 최초는 1만

  allow update: if approvedOperator() && docId == 'head'
                   && validHeadKeys() && validObjectPath()
                   && request.resource.data.schemaVersion == 1
                   && request.resource.data.revision == resource.data.revision + 1
                   && request.resource.data.objectPath != resource.data.objectPath;
                   //  ★ revision 정확히 +1 AND objectPath가 이전 값과 달라야 한다

  allow delete: if false;
}
// docId != 'head' 인 rebuildAdminState 문서는 위 조건에서 전부 거부된다.
```

- **`validHeadKeys()`** — 키가 **정확히 `schemaVersion`·`revision`·`objectPath` 3개**임을 강제.
- **`validObjectPath()`** — `rebuild-admin-state/objects/{UUID}.json` **형태만** 허용.
- **`spaces/{token}`과 catch-all `allow read, write: if false`(`firestore.rules:11-21`)는 무변경.**

> **★ Firestore Rules가 Storage 객체의 실제 존재를 원자적으로 증명한다고 주장하지 않는다.**
> Rules는 `objectPath` **문자열의 형태**만 검사할 수 있다. "그 경로에 객체가 실제로 있는가"는
> **cross-service 질문이고 Rules로 답할 수 없다.** 그 간극은 §6.2의 **fail-closed 읽기**가 흡수한다.

**이 계약 문서 라운드에서 `storage.rules`·`firestore.rules`는 수정하지 않았다.**

---

## 5. Z-4 — 패키지와 write port 경계

### 5.1 공개 표면

- **신규 서브패스**: `@denn/firebase/admin-write`
- **`packages/firebase/src/index.ts` 루트 배럴은 변경하지 않는다.**
- **Firebase SDK와 Firestore를 admin 전용 lazy 경계 밖으로 노출하지 않는다**
  — `sdk-facade.ts:24-28`의 **동적 import** 패턴을 그대로 따른다.
- **기본 앱 상태에서 write adapter 생성과 네트워크는 0이어야 한다.**
- **주입 facade + 합성 fake** — 유닛 테스트는 실제 SDK를 부르지 않는다.

### 5.2 이번 단위에 포함하지 않는 것

- **저장 버튼**, **실제 admin UI 연결**, `PrintSizeCmDraft`(스펙 035)와의 결합.
- **"head commit만 재개" API**(§6.5).

### 5.3 동시성·재시도 규율

- **한 번에 하나의 save만 허용한다.** `loadBaseline`과 `save` **각각 단일 in-flight**(§5.6).
- **앱 수준 자동 retry 0**, **자동 merge 0**.
- ⚠️ **Firebase SDK 내부 재시도가 존재한다**(`@firebase/storage` 업로드 재시도 창 **10분**,
  `index.esm.js:37`·`:43`). 따라서 **"네트워크 요청 자체가 정확히 1회"라고 단정하지 않는다.**
  계약이 보장하는 것은 **앱이 스스로 다시 쏘지 않는다**는 것뿐이다.
  → 이것이 §4.1에서 **재시도해도 `operationId`를 새로 만들지 않는** 이유이기도 하다:
  SDK가 같은 요청을 다시 보내도 **같은 불투명 경로**를 향하고, `resource == null`이 **두 번째를 거부**한다.

### 5.4 안전 오류 계약 (8분기)

| 코드 | 의미 | `retryable` |
| --- | --- | --- |
| `WRITE_CONFLICT` | head의 현재 revision ≠ `expectedBase` | **false** |
| `WRITE_AUTH_REQUIRED` | 미인증·초기화 중·익명 | true |
| `WRITE_FORBIDDEN` | 인증됐으나 Rules가 거부(승인 UID 아님 등) | false |
| `WRITE_INVALID_INPUT` | payload·`expectedBase`·요청 형식이 계약 위반 | false |
| `WRITE_UPLOAD_FAILED` | 업로드가 **명확히 실패**했다(서버에 반영되지 않았음이 확실) | true |
| `WRITE_UPLOAD_OUTCOME_UNKNOWN` | 업로드의 **서버 반영 여부가 불명확**하다 | **false** |
| `WRITE_HEAD_FAILED` | head transaction이 **명확히 실패**했다 | **false** ← [교정 3] |
| `WRITE_COMMIT_OUTCOME_UNKNOWN` | head commit **결과를 확인할 수 없다** | **false** |

**[교정 3] 분류 규칙**

- **명확한 upload 실패만 `WRITE_UPLOAD_FAILED`** 로 분류한다.
  **서버 반영 여부가 불명확한 오류는 `WRITE_UPLOAD_OUTCOME_UNKNOWN`** 이다.
- **`WRITE_HEAD_FAILED`도 upload 이후에 발생하므로 기본 `retryable: false`** 다.
  업로드된 객체가 이미 존재하고, 같은 payload를 다시 보내면 **불필요한 객체를 또 만든다.**
- **`WRITE_CONFLICT`와 두 `*_OUTCOME_UNKNOWN`, `WRITE_HEAD_FAILED`는 재읽기 후
  사용자의 명시적 재시도만** 허용한다. 자동 재시도는 **덮어쓰기·중복 생성 위험 그 자체**다.

**비노출**: **raw SDK message · email · UID · token · object bytes를 오류·로그·UI에 노출하지 않는다**
(스펙 036 `errors.ts` 규율 계승 — `category`/`retryable`은 **코드의 속성**이고 호출부마다 달라지지 않는다).
`correlationId`는 **호출자 주입**(스펙 036과 동일, `CORRELATION_ID_PATTERN`).

### 5.5 ★ [교정 4] Firestore transaction callback 재실행 계약

초판의 "transaction 단 한 번"은 **앱의 호출 횟수**를 뜻했지, SDK 내부 동작을 말한 것이 아니었다.
**그 구분을 명시하지 않은 것이 결함**이다.

- **앱은 `runTransaction`을 정확히 한 번 호출한다.**
- **★ Firebase SDK는 transaction callback을 내부적으로 여러 번 실행할 수 있다.**
  (공식 문서: 경합 시 재실행되며 "a transaction function might run more than once",
  `TransactionOptions.maxAttempts` 기본 5.)
- **callback 안에서는 `transaction.get` / `transaction.set` 이외의 부작용을 금지한다.**
  구체적으로 **금지**: `operationId`(UUID) 생성 · **Storage upload** · 로그 추가 ·
  UI 변경 · **로컬 revision 변경** · 카운터 증가 · 타이머 등록.
- **`operationId`와 `expectedBase`는 transaction 호출 *전에* 고정한다.**
- **callback 재실행마다 현재 head를 다시 읽되, `expectedBase`를 자동 변경하지 않는다.**
- **재실행에서 current revision과 `expectedBase`가 다르면 `WRITE_CONFLICT`로 중단한다.**
- **Storage upload는 transaction 밖에서 선행**하며 **callback 재실행으로 반복되지 않는다.**
- **callback 내부 재실행 ≠ 앱 수준 retry.** 전자는 SDK가 하는 일이고 계약이 허용한다.
  후자는 **금지**다(§5.3). 이 둘을 문서·테스트·오류 문구에서 **명확히 구분한다.**

### 5.6 ★ [교정 5] 공개 port 타입 계약 (이름까지 고정)

```ts
type AdminStateRevision = number;

interface AdminStateBaselineValue {
  readonly catalog: Catalog;
  readonly revision: AdminStateRevision;
  readonly source: "legacy" | "rebuild";
}

interface AdminStateSaveRequest {
  readonly correlationId: string;
  readonly expectedBase: AdminStateRevision;
  readonly catalog: Catalog;
}

interface AdminStateSaveValue {
  readonly revision: AdminStateRevision;
  readonly objectPath: string;
}

interface AdminStateWritePort {
  loadBaseline(request: {
    readonly correlationId: string;
  }): Promise<Result<AdminStateBaselineValue, SafeAdminWriteError>>;

  save(
    request: AdminStateSaveRequest,
  ): Promise<Result<AdminStateSaveValue, SafeAdminWriteError>>;
}
```

> **★ 구현 전 확인 필요 — `Catalog`라는 타입은 현재 저장소에 존재하지 않는다.**
> `@denn/shared`가 실제로 내보내는 이름은 **`CatalogDocumentV1`**
> (`packages/shared/src/catalog/types.ts`; 스펙 036의 `AdminStateLoadValue.document`가 그 타입이다).
> 위 블록의 `Catalog`는 **`CatalogDocumentV1`에 바인딩**되어야 하며,
> **동의어 타입이나 새 타입을 만들지 않는다**(아래 "중복 검증 규칙 금지"와 같은 이유).
> `Result`는 `packages/shared/src/index.ts:19`의 기존 타입을 쓴다.

**추가 규율**

- **`operationId`는 port 내부에서 save 호출당 한 번 생성**하며 **외부 입력으로 받지 않는다.**
  → 호출자가 경로를 지정할 수 없다(스펙 036 `read-port.ts:92`의 "경로 인자 없음" 규율과 동형).
- **첫 load에서 head가 없을 때만** legacy `admin/state.json`과 **revision 0**을 반환한다.
- **head가 있으면 rebuild 객체만 읽는다.**
- **head / object / schema / catalog 불일치는 fail-closed**하며 **legacy fallback은 0**이다.
- **save 성공 후 반환 revision만** 호출자가 새 baseline으로 채택할 수 있다.
- **`loadBaseline`과 `save` 모두 단일 in-flight** 규율을 따른다.
- **`packages/firebase/src/admin-read/**`는 이번 첫 구현에서 수정하지 않는다.**
- admin-write가 필요한 legacy read 기능은 **기존 공개 계약을 재사용하거나 facade에서 조합**하되,
  **중복 검증 규칙을 만들지 않는다**(`readLegacyCatalog` 규칙을 다시 구현하지 않는다).

---

## 6. Z-5 — 읽기 기준과 `expectedBase`

### 6.1 baseline 로드

| head 상태 | 읽는 대상 | `revision` | `source` |
| --- | --- | --- | --- |
| **없음** | legacy `admin/state.json` | **`0`** | `"legacy"` |
| **있음** | **head가 가리키는 rebuild 객체만** | head의 `revision` | `"rebuild"` |

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
1. operationId = crypto.randomUUID()     ← save 호출당 1회. 재시도·callback 재실행에서 재생성 0
   expectedBase 고정                      ← transaction 호출 전에 확정 (§5.5)
2. Storage upload → rebuild-admin-state/objects/{operationId}.json   (create-only)
3. runTransaction( ... )                 ← 앱은 정확히 1회 호출. SDK는 callback을 여러 번 실행할 수 있다
     callback: transaction.get(head) → 비교 → transaction.set(head)  (그 외 부작용 0)
       head 없음                      → revision 1로 create
       head.revision == expectedBase  → revision + 1, objectPath 교체
       불일치                          → WRITE_CONFLICT
4. 성공 → { revision, objectPath } 반환, 호출자가 새 baseline으로 채택
```

### 6.5 ★ [교정 3] 결과 상태와 orphan의 정확한 의미

초판은 **결과 불명을 orphan이라고 단정**했다. **틀렸다** — 결과가 불명이면 **orphan인지조차 모른다.**

| 상황 | 객체 | head | 오류 코드 |
| --- | --- | --- | --- |
| **upload 명확히 실패** (transaction 미시작) | **생성되지 않음** | **불변** | `WRITE_UPLOAD_FAILED` |
| **upload 결과 불명** (transaction 미시작) | **없거나 orphan일 수 있다** | **불변** | `WRITE_UPLOAD_OUTCOME_UNKNOWN` |
| **upload 성공 + transaction 명확히 실패** | **orphan** | **불변** | `WRITE_HEAD_FAILED` |
| **upload 성공 + transaction 결과 불명** | **★ head에 연결됐을 수도, orphan일 수도 있다** | **★ 바뀌었을 수도 있다** | `WRITE_COMMIT_OUTCOME_UNKNOWN` |
| **upload 성공 + `expectedBase` 불일치** | **orphan** | **불변** | `WRITE_CONFLICT` |

**규칙**

- **결과 불명일 때 성공·실패·orphan 여부를 추측하지 않는다.**
- **반드시 head를 다시 읽어 `objectPath`와 `revision`을 확인해야만 결과를 판정한다.**
  (`objectPath`가 이번 `operationId`를 가리키면 **commit이 성공한 것**이다 —
  §4.4가 update마다 `objectPath`를 바꾸도록 강제하므로 이 판정이 성립한다.)
- **`WRITE_COMMIT_OUTCOME_UNKNOWN`은 `retryable: false`.**
- **★ reload 전에는 동일 payload를 자동으로도 수동으로도 재전송하지 않는다.**
  이미 반영됐을 수 있으므로 재전송은 **불필요한 revision과 객체를 만든다.**
- **별도의 "head commit만 재개" API는 이번 스펙에 만들지 않는다.**
  재개가 필요해 보이면 **STOP**하고 보고한다(§13).

### 6.6 orphan (G-4)

- **orphan = head가 참조하지 않는 것이 *확인된* 불변 객체.**
  **결과 불명 상태는 orphan이 아니라 "미판정"이다**(§6.5).
- **클라이언트 delete 권한 없음**(§4.2 `allow delete: if false`), **자동 정리 없음.**
- **보존 기간·비용 한도·권한 있는 정리 주체가 별도 승인되기 전에는 실제 운영 쓰기를 활성화하지 않는다.**

---

## 7. Z-6 — Emulator 검증 계약

### 7.1 ★ 사전 확인 결과 (2026-08-11, 읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

| 항목 | 결과 |
| --- | --- |
| **Java** | **사용 가능** — `openjdk 21.0.11 2026-04-21 LTS` (Microsoft build) |
| **firebase-tools** | **사용 가능** — 전역 **`15.22.4`**. 저장소 의존성이 **아니다** → **lockfile 변경 불필요** |
| **Firestore emulator binary** | **캐시됨** — `~/.cache/firebase/emulators/cloud-firestore-emulator-v1.21.0.jar` |
| **Storage rules runtime** | **캐시됨** — `~/.cache/firebase/emulators/cloud-storage-rules-runtime-v1.1.3.jar` |
| **Emulator UI** | **캐시됨** — `ui-v1.15.0` |
| **Auth emulator binary** | 별도 jar이 캐시에 **없다**. firebase-tools 내장으로 보이나 **확인하지 않았다** → **UNCONFIRMED** |
| **포트** 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free**(확인 시점) |
| `.firebaserc` | `projects.default = "denn-products"` ← **★ 실제 운영 프로젝트 id** |

> **★★ 첫 실행에서 binary 다운로드·설치·신규 의존성 추가가 필요해지면 실행하지 말고 STOP한다**(§7.6).

### 7.2 ★★ 운영 프로젝트 접촉 차단 (필수)

`.firebaserc`의 default project가 **실제 운영 프로젝트 `denn-products`** 이므로,
**`--project`를 생략한 emulator 실행은 운영 프로젝트 id로 동작한다.**

- emulator 실행과 테스트는 **반드시 `--project demo-denn-emulator`** 를 명시한다.
  Firebase는 `demo-` 접두 id를 **emulator 전용**으로 다루며 **실제 자격 증명이 존재하지 않는다.**
- **emulator host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트는 시작 전에 실패한다**(fail-closed).
- **실제 Firebase project · 자격 증명 · 운영 bucket으로 fallback하지 않는다.**
- **`.firebaserc`는 수정하지 않는다.**

### 7.3 ★ [교정 2] emulator 전용 config로 Rules 사본을 고정한다

초판은 `firebase.json`에 `emulators` 블록을 추가한다고 했다. **배포용 config와 합성 UID Rules가
섞일 수 있어 위험하다.** 다음 구조로 확정한다.

- **`firebase.json`은 구현 단계에서도 수정하지 않는다.**
- **신규 `firebase.emulator.json`** 을 **emulator 전용 config**로 사용한다.
- `firebase.emulator.json`은 **emulator 전용 Storage/Firestore Rules 사본**과
  **emulator 포트만** 참조한다. (Hosting·배포 관련 항목을 담지 않는다.)
- **실행 명령은 반드시 `--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를
  모두 포함한다.**
- **emulator용 Rules 사본에는 합성 UID만 존재한다.**
- **배포 대상 `storage.rules`/`firestore.rules`에는 UNCONFIRMED 실제 UID placeholder만 존재하며,
  live 배포는 계속 차단한다.**
- **배포 대상 Rules와 emulator Rules는 UID 상수 외 diff 0임을 unit test로 고정한다.**
  이 테스트가 없으면 **"실제 Rules를 검증했다"고 말할 수 없다.**

### 7.4 테스트 분리 (기존 선례 그대로)

저장소에는 이미 **opt-in 테스트 분리 선례**가 있다:
`vitest.config.ts:17`이 `**/*.live.test.ts`를 **기본 게이트에서 제외**하고,
`vitest.live.config.ts` + `pnpm test:live:node`로만 실행한다.

emulator 테스트도 **같은 형태**를 따른다:

- 파일 규칙 **`*.emulator.test.ts`**, 기본 `vitest.config.ts`의 `exclude`에 추가
- **`vitest.emulator.config.ts`** + **`pnpm test:emulator`** 에서만 실행
- **기본 unit/E2E 게이트에서 emulator는 절대 실행되지 않는다**
- emulator 기동/종료는 **명시적 명령**에서만 일어난다

### 7.5 검증할 시나리오 (실제 Rules 사용)

| # | 시나리오 | 통과 기준 |
| --- | --- | --- |
| **1** | **승인된 합성 UID만** 객체 생성과 head transaction 가능 | 승인 UID: 성공 |
| **2** | **다른 UID · 익명 · 미인증** 요청 | **전부 거부**(Storage·Firestore 양쪽) |
| **3** | **동일 `operationId` 재업로드**와 **delete** | **전부 거부** |
| **4** | 같은 `expectedBase`를 가진 **두 writer** | **head 이동은 정확히 하나**, 다른 쪽은 **명시적 `WRITE_CONFLICT`**. head revision **정확히 +1** |
| **5** | **upload 성공 후 commit 전 중단** | **orphan 객체만 남고 head 불변** |
| **6** | **timeout · 늦은 성공 · commit 결과 불명** | **조용한 재시도 0 · 덮어쓰기 0** |
| **7** | **중복 탭 · 인증 만료 상당** | **조용한 데이터 손실 0.** 손실 대신 **명시적 오류** |
| **8** | ★ **승인 UID의 head `get`** | **성공**(baseline load가 성립한다) |
| **9** | ★ **다른 UID · 익명 · 미인증의 head `get`** | **거부** |
| **10** | ★ **head `list`** | **거부**(승인 UID라도) |
| **11** | ★ **transaction callback 재실행** | **Storage upload 반복 0**(callback 안에 upload가 없음을 실제로 확인) |
| **12** | ★ **commit outcome unknown** | **"head가 변경됐을 수도 있음"으로 다루고 재조회로 판정.** 추측·자동 재전송 0 |

- **synthetic Auth 계정은 emulator 내부에서만 만든다 — 실제 계정 생성이 아니다.**

### 7.6 STOP 조건 (emulator 전용)

**아래 중 하나라도 필요해지면 실행하지 말고 기록·보고한다.**

- Java · firebase-tools · emulator binary의 **설치 또는 다운로드**
- **신규 의존성 추가**(`firebase-tools`를 저장소 의존성으로 넣는 것 포함)
- **타 프로세스 종료** 또는 **점유 포트 강제 해제**
- `.firebaserc` 수정 · **`firebase.json` 수정** · 실제 프로젝트 id 사용 · 실제 자격 증명 필요
- **emulator 없이는 기본 게이트가 통과하지 않는** 상황

### 7.7 ★ fake 테스트가 증명하지 않는 것

> **합성 fake 테스트는 호출 순서와 오류 매핑을 증명할 뿐,
> 서버 Rules의 원자성이나 거부 동작을 증명하지 않는다.**
> Rules 거부·CAS 경합·orphan 발생은 **오직 emulator 테스트만** 보여 준다.
> 두 층은 서로를 대체하지 못한다.

---

## 8. Z-7 — tombstone과 병합

- **스펙 037에서 tombstone과 자동 merge를 도입하지 않는다.**
- 저장은 **문서 전체 CAS**다. `expectedBase` 충돌 시 **문서 전체를 거부**한다(부분 반영 없음).
- **L-4 삭제 부활**(조사 §8.3)의 자동 병합 해결은 **별도 후속 스펙**으로 유지한다.
  **원자성은 병합 의미론을 고치지 않는다.**
- 충돌 후 **최신본을 다시 읽고 변경을 재적용하는 것은 운영자의 명시적 행동**이어야 한다.

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
storage.rules                                 (§4.2 목표 상태 — placeholder UID · 배포는 계속 차단)
firestore.rules                               (§4.4 목표 상태 — placeholder UID · 배포는 계속 차단)
firebase.emulator.json                        (신규 · emulator 전용 config)          ← [교정 2]
<emulator 전용 storage/firestore rules 사본>   (합성 UID만 다름)
vitest.config.ts                              (*.emulator.test.ts 제외 추가)
vitest.emulator.config.ts                     (신규)
package.json                                  (test:emulator 스크립트 추가)
**/*.emulator.test.ts                         (신규)
스펙 037 관련 handoff / CURRENT / live / STATE / NEXT 문서
```

- **★ [교정 2] `firebase.json`은 허용 파일이 아니다 — 구현 단계에서도 수정하지 않는다.**
- **`packages/firebase/src/index.ts` 루트 배럴 수정 금지.**
- **★ [교정 5] `packages/firebase/src/admin-read/**` 수정 금지** — 이번 첫 구현에서 건드리지 않는다.
- **`apps/**` 수정 금지** — 이번 단위에 저장 버튼·UI 연결이 없다(§5.2).
- **계속 금지**: `apps/mockup/**` · `packages/render/**` · `packages/shared/**` · `.firebaserc` ·
  `firebase.json` · 실제 `.env` · legacy HTML · 실제 Firebase/network/live/운영 데이터 · 발행·배포.
- `pnpm-lock.yaml`: **신규 의존성이 없으므로 변경이 없어야 한다.** 필요해지면 **STOP**(§7.6).

---

## 11. 결정적 합성 검증 계약 (fake — 기본 게이트)

**`packages/firebase`** (facade를 합성 fake로 주입 — 실제 SDK·네트워크 0)

- **import 시 SDK 초기화·네트워크 0**, 기본 상태에서 **write adapter 생성 0**
- 저장 순서 고정(§6.4): `randomUUID` → upload → `runTransaction`. **호출 로그로 순서를 고정**
- **`operationId`가 save 호출당 정확히 1회 생성**되고 **재시도에서 재생성되지 않음**
- **★ [교정 4] transaction callback을 fake가 여러 번 실행해도**:
  **`randomUUID` 추가 호출 0 · Storage upload 추가 호출 0 · 로컬 revision 변경 0 · 로그/UI 부작용 0**,
  그리고 **`expectedBase`가 자동으로 바뀌지 않음**
- **★ 앱은 `runTransaction`을 정확히 1회 호출**(callback 재실행 횟수와 무관)
- **upload 실패 시 `runTransaction` 호출 0회**
- **미인증·익명에서 upload·transaction 0회**(로컬 게이트가 먼저 막는다)
- **`loadBaseline`·`save` 각각 단일 in-flight**: 두 번째 호출이 **새 요청을 만들지 않는다**
- **앱 자동 retry 0 · 자동 merge 0**
- `expectedBase` 불일치 → **`WRITE_CONFLICT`**, head 갱신 시도 0
- **★ [교정 3] 결과 상태 매핑**(§6.5 표 5행)이 **정확히 그 코드로** 나오고,
  **결과 불명을 성공/실패/orphan으로 바꾸지 않으며**, **재전송 0**
- **`WRITE_HEAD_FAILED`·`WRITE_COMMIT_OUTCOME_UNKNOWN`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`·
  `WRITE_CONFLICT`가 `retryable: false`**
- **오류 매핑이 8코드 밖으로 새지 않음**
- **비노출**: raw SDK error·email·UID·token·object bytes가
  **`SafeAdminWriteError`와 `JSON.stringify(error)` 결과에 0건**
- **head 스키마 위반**(허용 키 외 키, `revision` 비정수/0 이하, `objectPath` 형식 위반) → **fail-closed**
- **★ [교정 5] baseline 분기**(§6.1~6.2): head 없음 → legacy + **`revision 0` + `source: "legacy"`** /
  head 있음 → **객체만 읽고 `source: "rebuild"`** / head 있고 객체 없거나 invalid →
  **fail-closed, legacy fallback 0**
- **`operationId`를 외부에서 주입할 수 없음**(타입·런타임 양쪽에서 고정)
- **`readLegacyCatalog` 검증 규칙이 admin-write에 재구현되지 않음**(중복 검증 금지)

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

- **실제 운영자 UID**가 필요해짐 — placeholder로 진행할 수 없는 지점에 도달
- **Rules 배포**가 필요해짐 — **금지**(§9)
- **`firebase.json` 수정**이 필요해짐 — **금지**(§7.3)
- emulator **설치·다운로드·신규 의존성·포트 강제 해제·프로세스 종료**가 필요해짐(§7.6)
- **실제 Firebase 요청 없이는 게이트가 통과하지 않음**
- **`apps/**` 수정**이 필요해짐(= UI 연결이 필요하다는 뜻 → 범위 밖)
- **`packages/firebase/src/admin-read/**` 수정**이 필요해짐(§5.6)
- **"head commit만 재개" API**가 필요해 보임(§6.5)
- **`packages/firebase` 루트 배럴** 또는 **고객 번들 변경**이 필요해짐
- **tombstone·자동 merge**가 필요해짐(§8) · **orphan 삭제·정리**가 필요해짐(G-4)
- Rules가 **`objectPath`의 실제 객체 존재를 증명해야** 계약이 성립한다고 판단됨
  → C5 전제가 흔들리는 것이므로 **즉시 보고**(G-3의 C6 재검토 사유)

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
| **R-1** | **★★ Rules 배포가 운영자의 유일한 저장 경로를 닫는다** | §9: 이번 스펙에서 배포 0. cutover는 별도 스펙·별도 승인 |
| **R-2** | **★ emulator가 실제 프로젝트 id로 뜬다**(`.firebaserc` default = `denn-products`) | §7.2: **`demo-` 접두 프로젝트 + `--config firebase.emulator.json` 강제**, host 미설정 시 **시작 거부** |
| **R-3** | emulator 사본 Rules가 실제 Rules와 갈라져 **검증이 무의미해진다** | §7.3: **UID 라인 외 diff 0**을 unit test가 고정 |
| **R-4** | SDK 내부 재시도가 **같은 객체를 두 번 쓴다** | §4.1 `resource == null`이 **두 번째를 서버에서 거부**. §5.3이 "요청 1회"를 주장하지 않음 |
| **R-5** | `*_OUTCOME_UNKNOWN`을 **성공/실패로 단정**하거나 **재전송**한다 | §6.5: `retryable: false` + **head 재조회로만 판정** + **reload 전 재전송 금지** |
| **R-6** | head는 있는데 객체가 없어 **legacy로 조용히 되돌아간다** | §6.2 **fail-closed, fallback 0** |
| **R-7** | orphan이 누적된다 | G-4: 정리 정책 승인 전 **운영 쓰기 미활성화** |
| **R-8** | `op()`를 건드려 **레거시 발행·자산 업로드가 함께 잠긴다** | §3.2 **`op()` 무변경**, UID는 새 함수로 새 경로에만 |
| **R-9** | ★ **transaction callback 재실행이 upload를 반복**하거나 부작용을 남긴다 | §5.5: callback 안 부작용 **전면 금지**, upload는 **transaction 밖 선행**. fake·emulator 양쪽에서 검증(§11·§7.5 #11) |
| **R-10** | ★ **baseline load가 head를 읽지 못해** 기능이 성립하지 않는다 | §4.4: 승인 UID의 **`get` 명시 허용**, `list`는 거부. emulator #8~#10이 확인 |

---

### 승인 상태

- **Founder G-1~G-5**: 승인됨(`dc5666d`) — **계약 작성 + 합성 fake + 로컬 emulator 검증까지**
- **이 계약 문서**: **보완 라운드 1 적용**, **Codex 재검토 대기**
- **구현 착수**: **아직 승인되지 않았다.**
- **실제 저장 구현과 UI 연결**: **이 계약이 승인하지 않는다.**
- **Rules 배포 · 운영 쓰기**: **차단 유지**(UID 정본 + orphan 정책 + emulator PASS가 전제)
