# 스펙 037 — 운영자 상태 쓰기 C5 (불변 객체 + 단일 Firestore head) · Emulator 검증 계약

상태: **계약 문서 — 보완 라운드 2 적용 · 구현 미착수 · 미승인**
작성 2026-08-11 · 초판 커밋 `c654023` · **보완 라운드 1** `41b54b9` · 상태 동기화 `fad819f`
**보완 라운드 2 (CORRECTION_REQUIRED, 2026-08-11)** · 보완 기준 HEAD = origin = `fad819f`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`
(Founder G-1~G-5, 2026-08-11 승인) · 선행 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E)
근거 조사: `reviews/2026-08-11-admin-write-atomicity-investigation.md`(보완 라운드 1 반영)
구조 결정: **Codex Z-1 ~ Z-8** + **보완 라운드 1 교정 1~5** + **보완 라운드 2 교정 1~4**
선행 스펙: `036-admin-auth-private-state-read.md` (**DONE** — 읽기 경계·오류 규율·주입 facade 선례)

> **이 문서는 계약이다. 제품 코드가 아니다.**
> 이 라운드에서 `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
> `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` 변경은 **0**이다.
> 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 **0**, upload/write/delete/publish/deploy **0**.
> **이 계약은 실제 저장 구현도 UI 연결도 승인하지 않는다.**

---

## 0. 보완 라운드 2 — 무엇을 정정했는가

Codex 재검토가 보완 라운드 1(`41b54b9`)에서 **4건**을 더 확인했다.

| # | 라운드 1의 결함 | 정정 |
| --- | --- | --- |
| **1** | head가 없을 때 **`expectedBase`를 확인하지 않고** revision 1을 생성해 **G-2("`expectedBase`와 현재 head가 일치할 때만 변경")와 모순** | **head 없음 = 논리적 revision `0`**. **`expectedBase === 0`일 때만** create 허용, 아니면 **`WRITE_CONFLICT`**(head 불변). **`expectedBase`는 0 이상 safe integer**만 허용하고 위반은 **upload 전 `WRITE_INVALID_INPUT`**. **persisted `revision`은 1 이상 safe integer**만 유효하고 안전하게 `+1`할 수 없으면 **fail-closed**(§5.7) |
| **2** | "정확한 타입" 블록이 **존재하지 않는 `Catalog`** 를 쓰고 설명문에서만 바인딩했으며 **`SafeAdminWriteError`가 미완결** | 타입 블록이 **`CatalogDocumentV1`을 직접** 쓴다. **alias·동의어 타입 0**. `Result` **import 표면까지 명시**. **`AdminWriteErrorCode`·`AdminWriteErrorCategory`·`SafeAdminWriteError` 공개 타입 고정**. **정본 매핑 표 1곳**(§5.4). `AdminStateRevision` **런타임 범위**를 교정 1과 일치(§5.6) |
| **3** | `operationId`를 port 내부에 숨기면서 **호출자에게 head 재조회를 요구** — 호출자는 내부 `operationId`를 몰라 **수행 불가능** | **`save` 내부가 자신의 `operationId`로 read-only reconciliation을 수행**한다(§6.6). **write retry가 아니다** — 재업로드 0 · transaction 재호출 0 · **bounded read 최대 1회**. 판정 3분기 고정. **오류에 `operationId`·object path 비노출**. **`loadBaseline`은 reconciliation API가 아니다** |
| **4** | §7.5가 **"실제 Rules 사용" 표에 callback 재실행·commit outcome unknown**까지 넣었으나 **결정적 재현 방법이 없다** | **증명 주체를 분리**했다(§7.5) — emulator는 **Rules·identity·CAS**, fake는 **앱 오류 분기**. **결정적·비파괴적 재현 seam을 제시할 수 없으므로 두 항목은 fake 전용으로 재분류**하고 **emulator 증명이라고 주장하지 않는다.** network 차단·프로세스 종료·포트 강제 해제·emulator kill·실제 Firebase로 재현하지 **않는다** |

**변하지 않은 것**: C5 구조(불변 객체 + 단일 Firestore head CAS) · Z-1~Z-8의 방향 · 라운드 1 교정 1~5의
내용 · 배포 차단 · 범위 제외 · **구현 미승인**.

### 0.1 ★ Codex가 확인해 줘야 할 것 (이 라운드에서 생긴 판단)

**`loadBaseline` 실패를 8코드 안에서 어떻게 부르는가.**
교정 2는 **"계약의 8개 코드만 허용"** 을 요구한다. 그런데 8코드는 `save` 기준으로 만들어졌고,
`loadBaseline`이 겪는 **"persisted head 또는 그 객체가 계약을 위반해 사용할 수 없음"** 에
정확히 대응하는 이름이 없다.

이 계약은 **새 코드를 만들지 않고 `WRITE_HEAD_FAILED`의 의미를 확장**했다(§5.4) —
**"head transaction이 명확히 실패했다 **또는** persisted head/그 객체가 계약을 위반해 사용할 수 없다"**.
둘 다 **확정된 실패**이고 **`retryable: false`** 라 성질이 같다.
**이름이 `HEAD`인데 참조 객체까지 포함하는 점은 의도적 절충**이며, 다른 이름을 원하면 **계약만 고치면 된다**
(제품 코드는 아직 없다). **9번째 코드를 임의로 만들지 않았다.**

---

## 1. 목표 (WHY)

리빌드 admin이 **운영자 상태를 조용한 손실 없이 저장할 수 있는 구조**를 확정하고,
그 구조가 **로컬 emulator에서 실제 Rules로 검증**되게 만든다.

조사(`reviews/2026-08-11-…`)의 결론이 전제다:

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 없다.** → 같은 경로를 두
  운영자가 덮어쓰는 모델은 **어떤 방식으로도 안전하게 만들 수 없다.**
- 그래서 **덮어쓰기를 아예 없앤다**(C5): **객체는 매번 새 경로에 한 번만 생성**되고,
  **가변 지점은 Firestore head 문서 하나뿐**이며 그 이동만 **transaction CAS**로 보호한다.

> **★ 이 설계가 안전한 이유는 cross-service 원자성 때문이 **아니다**.**
> **불변 객체를 먼저 만들고, 단일 가변 정본(head)만 CAS로 옮기기 때문**이다.
> 실패해도 **남의 바이트를 덮는 일은 일어나지 않는다.**

## 2. 범위 (SCOPE)

**포함**

- **쓰기 port 계약**: `@denn/firebase/admin-write` — **공개 타입 전부 고정**(§5.6)
- **Storage 불변 객체 생성** — `rebuild-admin-state/objects/{operationId}.json`, create-only
- **Firestore head CAS** — `/rebuildAdminState/head` 단일 문서, **최초 create 포함 전 구간 `expectedBase` 검사**
- **읽기 기준(baseline) 계약**과 **`expectedBase`·`revision` 유효 범위**(§5.7)
- **안전 오류 계약 8종**과 **결과 상태 판정 규칙**, **save 내부 bounded reconciliation**(§6.6)
- **`storage.rules`·`firestore.rules`의 목표 상태**(구현 단계에서 편집, **배포는 계속 차단**)
- **`firebase.emulator.json` 기반 emulator 검증 계약** — **증명 주체 분리**(§7.5)
- **결정적 합성 fake 검증 계약**

**제외 (하지 않을 것)**

- **저장 버튼·admin UI 연결** · **"head commit만 재개" API**(§6.6)
- **tombstone · 자동 merge · L-4 삭제 부활 해결**(§8) · **orphan 삭제·자동 정리·클라이언트 delete 권한**(G-4)
- **`packages/firebase/src/admin-read/**` 수정** · **`firebase.json` 수정**(§7.3)
- **`published/state.json` 발행**(F-B·G-5) · **legacy `admin/state.json` 쓰기**(F-C·G-1)
- **legacy `wcm`/`hcm` 되쓰기·삭제·마이그레이션**(F-D)
- **C6**(G-3 보류) · **C3 고정 경로 CAS · C4 lease/lock**(G-5)
- **Rules 배포 · Hosting 배포 · 실제 운영 쓰기 활성화**(§9)
- **실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network**(G-5)

---

## 3. Z-1 — 승인 UID 제한의 적용 범위

### 3.1 적용 대상

1. **Storage** `rebuild-admin-state/**`
2. **Firestore** `/rebuildAdminState/head`

### 3.2 ★ 기존 `op()`를 바꾸지 않는다

`storage.rules:18-21`의 `op()`는 `admin/`뿐 아니라 `published/`·`templates/`·`placeholders/`·
`guides/`·`mockups/`·`editor-overlays/`의 write 조건에도 함께 쓰인다(`:35-40`).

> **`op()` 본체를 UID 제한으로 바꾸지 않는다.** 바꾸면 레거시 발행
> (`denn-admin.html:14946`)과 운영자 자산 업로드까지 **우발적으로 함께 잠긴다.**
> UID 제한은 **새 함수**(예: `approvedOperator()`)로 **새 경로에만** 건다.

### 3.3 ★ 실제 UID는 UNCONFIRMED다

- **추측하지 않는다.** 예시 값을 실제 값처럼 기록하지 않는다.
- **배포 대상 Rules에는 명확히 표시된 placeholder만** 둔다:
  `// UNCONFIRMED_OPERATOR_UID — Founder가 정본 UID를 제공하기 전에는 배포 금지`
- **UID 정본 제공 전 live Rules 배포와 운영 쓰기는 계속 차단**한다(G-1·§9).

### 3.4 Emulator 합성 UID

```
EMULATOR_OPERATOR_UID = "emulator-operator-DO-NOT-DEPLOY"
```

- 실제 Firebase UID(28자 영숫자)와 **형식이 달라 혼동이 불가능**해야 한다.
- **emulator 전용 Rules 사본에만** 존재한다(§7.3).
- **synthetic Auth 계정은 emulator 내부에서만 만든다 — 실제 계정 생성이 아니다.**

---

## 4. Z-2 / Z-3 — Storage 경로와 Firestore head

### 4.1 Storage 경로

```
rebuild-admin-state/objects/{operationId}.json
```

- **별도 최상위 경로** → 겹치는 상위 match가 없어 **OR 평가 우회가 구조적으로 발생하지 않는다**
  (`storage.rules:5-7` 머리말이 경고한 문제).
- `operationId` = **save 호출당 한 번 생성하는 무작위 UUID**(`crypto.randomUUID()`).
  **재시도해도 새로 만들지 않고**, **transaction callback 안에서 만들지 않는다**(§5.5).
- **경로에 넣지 않는 것**: revision · 고객 문구 · catalog id · 이메일 · UID · 시간 · 파일명.
  **content-addressed identifier는 사용하지 않는다.**
- `contentType` **`application/json`**, 크기 **20 MiB 미만**.
- **`resource == null` create-only** — update/delete 금지.

### 4.2 `storage.rules` 목표 상태 (구현 단계에서 편집 · 배포는 차단)

```
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

### 4.3 Firestore head 문서 · 스키마 · commit 규칙

**가변 정본은 정확히 한 문서다:** `/rebuildAdminState/head`

| 키 | 타입 | 규칙 |
| --- | --- | --- |
| `schemaVersion` | number | **정확히 `1`** |
| `revision` | number | **1 이상의 safe integer**(§5.7) |
| `objectPath` | string | **`rebuild-admin-state/objects/{UUID}.json` 형태만** |

**head에 저장하지 않는 것**: 이메일 · UID · 고객 문구 · 원문 catalog · token · 오류 원문.

**★ [교정 1] commit 규칙 — 최초 생성도 `expectedBase`를 검사한다**

**head가 없는 상태 = 논리적 revision `0`** 으로 취급한다.

| transaction 안에서 관측한 head | `expectedBase` | 동작 |
| --- | --- | --- |
| **없음**(논리적 `0`) | **`=== 0`** | **`revision: 1`로 create**, `objectPath` = 이번 객체 |
| **없음**(논리적 `0`) | **`!== 0`** | **create 하지 않는다** → **`WRITE_CONFLICT`**(head 불변) |
| 있음, `revision === expectedBase` | 일치 | **`revision + 1`로 update** + **`objectPath` 교체** |
| 있음, `revision !== expectedBase` | 불일치 | **`WRITE_CONFLICT`**(head 불변) |
| 있음, `revision`이 §5.7 위반 | — | **fail-closed** → `WRITE_HEAD_FAILED`(head 불변) |

> **왜 바꿨나**: 라운드 1은 "head 없으면 무조건 revision 1 create"였다. 그러면 **`expectedBase`가 5인
> 편집 세션**(= 사용자가 revision 5를 보고 편집 중)이 **head가 사라진 상황에서 revision 1을 만들어**
> **5번의 이력을 조용히 밀어낼 수 있다.** G-2가 요구한 "일치할 때만 변경"의 예외가 되어서는 안 된다.

**Rules와의 분담**: `firestore.rules`는 **create `revision == 1`** 과 **update 정확히 `+1`** 을 강제한다.
**`expectedBase` 자체는 클라이언트 transaction 계약에서 검사한다**(Rules는 요청자의 base를 알 수 없다).

### 4.4 `firestore.rules` 목표 상태 — read 포함 전 분기

```
match /rebuildAdminState/{docId} {
  allow get:    if approvedOperator() && docId == 'head';   // ★ baseline load가 성립한다
  allow list:   if false;                                    // ★ 컬렉션 열거 금지

  allow create: if approvedOperator() && docId == 'head'
                   && validHeadKeys() && validObjectPath()
                   && request.resource.data.schemaVersion == 1
                   && request.resource.data.revision == 1;

  allow update: if approvedOperator() && docId == 'head'
                   && validHeadKeys() && validObjectPath()
                   && request.resource.data.schemaVersion == 1
                   && request.resource.data.revision == resource.data.revision + 1
                   && request.resource.data.objectPath != resource.data.objectPath;

  allow delete: if false;
}
```

- **`validHeadKeys()`** — 키가 **정확히 3개**임을 강제. **`validObjectPath()`** — 경로 형태 강제.
- **`spaces/{token}`과 catch-all `allow read, write: if false`(`firestore.rules:11-21`)는 무변경.**

> **★ Firestore Rules가 Storage 객체의 실제 존재를 원자적으로 증명한다고 주장하지 않는다.**
> Rules는 `objectPath` **문자열의 형태**만 검사할 수 있다. 그 간극은 §6.2의 **fail-closed 읽기**가 흡수한다.

**이 계약 문서 라운드에서 `storage.rules`·`firestore.rules`는 수정하지 않았다.**

---

## 5. Z-4 — 패키지와 write port 경계

### 5.1 공개 표면

- **신규 서브패스**: `@denn/firebase/admin-write`
- **`packages/firebase/src/index.ts` 루트 배럴은 변경하지 않는다.**
- **Firebase SDK와 Firestore를 admin 전용 lazy 경계 밖으로 노출하지 않는다**(`sdk-facade.ts:24-28` 패턴).
- **기본 앱 상태에서 write adapter 생성과 네트워크는 0.**
- **주입 facade + 합성 fake** — 유닛 테스트는 실제 SDK를 부르지 않는다.

### 5.2 이번 단위에 포함하지 않는 것

**저장 버튼** · **실제 admin UI 연결** · 스펙 035 `PrintSizeCmDraft`와의 결합 ·
**"head commit만 재개" API**(§6.6).

### 5.3 동시성·재시도 규율

- **`loadBaseline`과 `save` 각각 단일 in-flight.**
- **앱 수준 자동 retry 0**, **자동 merge 0**.
- ⚠️ **Firebase SDK 내부 재시도가 존재한다**(업로드 재시도 창 **10분**, `index.esm.js:37`·`:43`).
  → **"네트워크 요청 자체가 정확히 1회"라고 단정하지 않는다.** 앱이 스스로 다시 쏘지 않을 뿐이다.
  → SDK가 같은 요청을 다시 보내도 **같은 불투명 경로**를 향하고 `resource == null`이 **두 번째를 거부**한다.

### 5.4 ★ 안전 오류 계약 — **정본 매핑 표** (8코드, 여기가 유일한 정본)

| 코드 | `category` | `retryable` | 의미 |
| --- | --- | --- | --- |
| `WRITE_CONFLICT` | `VALIDATION` | **false** | head의 논리적 현재 revision ≠ `expectedBase`(head 부재 시 `0`과 비교) |
| `WRITE_AUTH_REQUIRED` | `AUTH` | true | 미인증 · 초기화 중 · 익명 |
| `WRITE_FORBIDDEN` | `AUTH` | false | 인증됐으나 Rules가 거부(승인 UID 아님 등) |
| `WRITE_INVALID_INPUT` | `VALIDATION` | false | 요청이 계약 위반 — **`expectedBase`가 §5.7 위반**, `correlationId` 형식 위반, catalog 형식 위반 |
| `WRITE_UPLOAD_FAILED` | `NETWORK` | true | 업로드가 **명확히 실패**(서버 미반영이 확실) |
| `WRITE_UPLOAD_OUTCOME_UNKNOWN` | `NETWORK` | **false** | 업로드의 **서버 반영 여부가 불명확** |
| `WRITE_HEAD_FAILED` | `VALIDATION` | **false** | head transaction이 **명확히 실패** **또는** **persisted head/그 객체가 계약을 위반해 사용할 수 없음**(§0.1) |
| `WRITE_COMMIT_OUTCOME_UNKNOWN` | `UNKNOWN` | **false** | reconciliation(§6.6) 후에도 **commit 반영 여부를 판정할 수 없음** |

- **이 표 밖의 코드는 존재하지 않는다.** `category`·`retryable`은 **코드의 속성**이며
  호출부마다 달라지지 않는다(스펙 036 `errors.ts:12` 규율 계승).
- **`WRITE_CONFLICT`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`·`WRITE_HEAD_FAILED`·`WRITE_COMMIT_OUTCOME_UNKNOWN`
  은 재읽기 후 사용자의 명시적 재시도만** 허용한다. 자동 재시도는 **중복 생성·손실 위험 그 자체**다.
- **비노출**: `SafeAdminWriteError`에는 **`correlationId` 외에** raw SDK message · email · UID ·
  token · **object bytes** · **object path** · `operationId`가 **들어가지 않는다**.

**`loadBaseline`이 낼 수 있는 코드**: `WRITE_INVALID_INPUT` · `WRITE_AUTH_REQUIRED` ·
`WRITE_FORBIDDEN` · `WRITE_HEAD_FAILED` · `WRITE_UPLOAD_FAILED`(네트워크 확정 실패) ·
`WRITE_UPLOAD_OUTCOME_UNKNOWN`(읽기 결과 불명). **`WRITE_CONFLICT`와 `WRITE_COMMIT_OUTCOME_UNKNOWN`은
`save` 전용**이다(§0.1의 명명 절충 참고).

### 5.5 Firestore transaction callback 재실행 계약

- **앱은 `runTransaction`을 정확히 한 번 호출한다.**
- **★ Firebase SDK는 transaction callback을 내부적으로 여러 번 실행할 수 있다**
  (공식 문서 "a transaction function might run more than once", `maxAttempts` 기본 5).
- **callback 안에서는 `transaction.get` / `transaction.set` 이외의 부작용을 금지한다.**
  **금지**: `operationId`(UUID) 생성 · **Storage upload** · 로그 추가 · UI 변경 ·
  **로컬 revision 변경** · 카운터 증가 · 타이머 등록 · **reconciliation read**(§6.6).
- **`operationId`와 `expectedBase`는 transaction 호출 *전에* 고정한다.**
- **callback 재실행마다 현재 head를 다시 읽되, `expectedBase`를 자동 변경하지 않는다.**
- **재실행에서 논리적 현재 revision과 `expectedBase`가 다르면 `WRITE_CONFLICT`로 중단한다.**
- **Storage upload는 transaction 밖에서 선행**하며 **callback 재실행으로 반복되지 않는다.**
- **callback 내부 재실행 ≠ 앱 수준 retry.** 전자는 SDK가 하는 일이고 허용된다. 후자는 **금지**다.

### 5.6 ★ [교정 2] 공개 타입 계약 — 저장소 실제 타입으로 완결

```ts
import type { CatalogDocumentV1, Result } from "@denn/shared";
// Result 는 packages/shared/src/index.ts:19 의 기존 타입이다:
//   type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }
// CatalogDocumentV1 은 packages/shared/src/catalog/types.ts 의 기존 타입이다.
// 이 스펙은 두 타입의 alias·동의어·재정의를 만들지 않는다.

/** 논리적 상태 revision. 0 = head 부재. 런타임 유효 범위는 §5.7. */
export type AdminStateRevision = number;

export type AdminWriteErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

/** §5.4 정본 표의 8개. 이 union 밖의 값은 존재하지 않는다. */
export type AdminWriteErrorCode =
  | "WRITE_CONFLICT"
  | "WRITE_AUTH_REQUIRED"
  | "WRITE_FORBIDDEN"
  | "WRITE_INVALID_INPUT"
  | "WRITE_UPLOAD_FAILED"
  | "WRITE_UPLOAD_OUTCOME_UNKNOWN"
  | "WRITE_HEAD_FAILED"
  | "WRITE_COMMIT_OUTCOME_UNKNOWN";

/**
 * 유일한 오류 봉투. correlationId 외에는 어떤 식별 정보도 담지 않는다 —
 * raw SDK message · email · UID · token · object bytes · objectPath · operationId 전부 제외.
 */
export interface SafeAdminWriteError {
  readonly category: AdminWriteErrorCategory;
  readonly code: AdminWriteErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
}

export interface AdminStateBaselineValue {
  readonly catalog: CatalogDocumentV1;
  readonly revision: AdminStateRevision;
  readonly source: "legacy" | "rebuild";
}

export interface AdminStateSaveRequest {
  readonly correlationId: string;
  readonly expectedBase: AdminStateRevision;
  readonly catalog: CatalogDocumentV1;
}

export interface AdminStateSaveValue {
  readonly revision: AdminStateRevision;
  readonly objectPath: string;
}

export interface AdminStateWritePort {
  loadBaseline(request: {
    readonly correlationId: string;
  }): Promise<Result<AdminStateBaselineValue, SafeAdminWriteError>>;

  save(
    request: AdminStateSaveRequest,
  ): Promise<Result<AdminStateSaveValue, SafeAdminWriteError>>;
}
```

**추가 규율**

- **`operationId`는 port 내부에서 save 호출당 한 번 생성**하며 **외부 입력으로 받지 않는다**
  (공개 타입 어디에도 나타나지 않는다 — 스펙 036 `read-port.ts:92`의 "경로 인자 없음" 규율과 동형).
- **`AdminStateSaveValue.objectPath`는 성공 값에만 존재한다.** 오류에는 절대 넣지 않는다(§5.4).
- **`loadBaseline`과 `save` 모두 단일 in-flight.**
- **`packages/firebase/src/admin-read/**`는 이번 첫 구현에서 수정하지 않는다.**
- legacy read는 **기존 공개 계약을 재사용하거나 facade에서 조합**하되
  **중복 검증 규칙을 만들지 않는다**(`readLegacyCatalog` 규칙을 다시 구현하지 않는다).

### 5.7 ★ [교정 1] `revision` / `expectedBase` 유효 범위

| 대상 | 유효 조건 | 위반 시 |
| --- | --- | --- |
| **요청의 `expectedBase`** | `Number.isSafeInteger(v) && v >= 0` | **upload 전 `WRITE_INVALID_INPUT`** (Storage 호출 0회) |
| **persisted head `revision`** | `Number.isSafeInteger(v) && v >= 1` **그리고 `v + 1`이 여전히 safe integer** | **fail-closed → `WRITE_HEAD_FAILED`**, head 불변 |
| **head 부재** | 논리적 revision **`0`** | §4.3 표에 따름 |

- `expectedBase` 검증은 **가장 먼저** 일어난다 — **무효한 base로는 객체를 만들지 않는다.**
- `+1` 안전성 검사는 **오버플로로 revision이 정체·역전되는 것을 막는다.**
  (`Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2`이므로 검사가 없으면 CAS가 무너진다.)

---

## 6. Z-5 — 읽기 기준, `expectedBase`, 결과 판정

### 6.1 baseline 로드

| head 상태 | 읽는 대상 | `revision` | `source` |
| --- | --- | --- | --- |
| **없음** | legacy `admin/state.json` | **`0`**(논리적 base) | `"legacy"` |
| **있음**, `revision` 유효 | **head가 가리키는 rebuild 객체만** | head의 `revision` | `"rebuild"` |
| **있음**, `revision` §5.7 위반 | — | — | **`WRITE_HEAD_FAILED`** |

### 6.2 ★ head가 있으면 legacy를 읽지 않는다

head가 존재하는데 그 객체가 **없거나 invalid**하면 **fail-closed**(`WRITE_HEAD_FAILED`).
**legacy로 조용히 fallback하지 않는다** — 조용한 fallback은 **옛 데이터를 최신처럼 보여 주고
그 위에 저장하게 만들어 실제 손실을 만든다.**

### 6.3 `expectedBase` 고정

- **사용자가 편집을 시작한 정확한 로드 결과의 revision**이다(head 부재였다면 **`0`**).
- **저장 직전에 새 base를 자동 채택하지 않는다.** **자동 병합도 하지 않는다.**
- **commit 성공 후에만** 로컬 기준 revision을 **반환된 새 revision**으로 갱신한다.

### 6.4 저장 순서 (고정)

```
0. expectedBase 검증 (§5.7)          ← 위반이면 WRITE_INVALID_INPUT. Storage 호출 0회
1. operationId = crypto.randomUUID() ← save 호출당 1회. 재시도·callback 재실행에서 재생성 0
2. Storage upload → rebuild-admin-state/objects/{operationId}.json   (create-only)
3. runTransaction( ... )             ← 앱은 정확히 1회 호출. SDK는 callback을 여러 번 실행할 수 있다
     callback: transaction.get(head) → §4.3 표대로 판정 → transaction.set(head)
               (그 외 부작용 0 — reconciliation read도 여기서 하지 않는다)
4. 결과 판정 (§6.5). 결과 불명이면 §6.6 reconciliation을 최대 1회
5. 성공 → { revision, objectPath } 반환
```

### 6.5 결과 상태와 orphan의 정확한 의미

| 상황 | 객체 | head | 코드 |
| --- | --- | --- | --- |
| `expectedBase` 무효(§5.7) | **생성 안 됨** | **불변** | `WRITE_INVALID_INPUT` |
| **upload 명확히 실패**(transaction 미시작) | 생성 안 됨 | **불변** | `WRITE_UPLOAD_FAILED` |
| **upload 결과 불명**(transaction 미시작) | **없거나 orphan일 수 있음** | **불변**(transaction을 부르지 않았다) | `WRITE_UPLOAD_OUTCOME_UNKNOWN` |
| upload 성공 + **`expectedBase` 불일치**(head 부재 시 `0`과 비교) | **orphan** | **불변** | `WRITE_CONFLICT` |
| upload 성공 + **transaction 명확히 실패** 또는 persisted head 위반 | **orphan** | **불변** | `WRITE_HEAD_FAILED` |
| upload 성공 + **transaction 결과 불명** | **§6.6 reconciliation으로 판정** | **§6.6** | **§6.6** |

- **결과 불명일 때 성공·실패·orphan 여부를 추측하지 않는다.**
- **orphan = head가 참조하지 않는 것이 *확인된* 불변 객체.** **미판정 상태는 orphan이 아니다.**
- **reload 전에는 동일 payload를 자동으로도 수동으로도 재전송하지 않는다.**

### 6.6 ★ [교정 3] transaction 결과 불명 — **`save` 내부의 bounded reconciliation**

라운드 1은 호출자에게 "head를 다시 읽어 `objectPath`를 비교하라"고 했지만,
**`operationId`가 port 내부에 있어 호출자는 그 절차를 수행할 수 없다.** 그래서 **port가 직접 한다.**

**성질**

- **`save` 내부가 자신이 보유한 `operationId`로 read-only reconciliation을 수행한다.**
- **write retry가 아니다** — **Storage 재업로드 0회**, **transaction 재호출 0회**.
- **동일 save 호출 안에서 bounded read를 최대 1회** 수행한다(무한 polling 금지).
- **transaction callback 안에서 하지 않는다**(§5.5).

**판정 (관측한 head 기준)**

| 관측된 head | 판정 | 반환 |
| --- | --- | --- |
| `revision === expectedBase + 1` **그리고** `objectPath` = **이번 `operationId` 경로** | **commit 성공** | `ok: { revision, objectPath }` |
| **논리적 base에 머무름** — head 부재(=base `0`) 또는 `revision === expectedBase` | **commit 미반영 확정**. 업로드된 객체는 **orphan**이며 **자동 재전송·삭제하지 않는다** | `WRITE_HEAD_FAILED` |
| 그 밖의 모든 경우 — 다른 writer가 head를 옮겼거나(`revision`이 `base+1`도 `base`도 아님), `revision === expectedBase + 1`인데 **`objectPath`가 우리 것이 아님** | **중간 성공 여부 판정 불가** | **`WRITE_COMMIT_OUTCOME_UNKNOWN`** |
| **reconciliation read 자체가 실패·timeout** | 판정 불가 | **`WRITE_COMMIT_OUTCOME_UNKNOWN`** |

> `objectPath` 비교가 성립하는 이유는 §4.4가 **update마다 `objectPath` 교체를 강제**하기 때문이다.

**경계**

- **호출자에게 `operationId`나 object path를 오류로 노출하지 않는다**(§5.4 비노출 규율).
  성공일 때만 `AdminStateSaveValue.objectPath`로 나간다.
- **`loadBaseline`은 정상 baseline 로드 API다.** 결과 불명 reconciliation을 **호출자에게 떠넘기는
  용도로 쓰지 않는다.**
- **별도의 "head commit만 재개" API는 이번 스펙에 만들지 않는다.** 필요해 보이면 **STOP**(§13).

### 6.7 orphan (G-4)

- **클라이언트 delete 권한 없음**(§4.2 `allow delete: if false`), **자동 정리 없음.**
- **보존 기간·비용 한도·권한 있는 정리 주체가 별도 승인되기 전에는 실제 운영 쓰기를 활성화하지 않는다.**

---

## 7. Z-6 — Emulator 검증 계약

### 7.1 사전 확인 결과 (2026-08-11, 읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

| 항목 | 결과 |
| --- | --- |
| **Java** | **사용 가능** — `openjdk 21.0.11 2026-04-21 LTS` |
| **firebase-tools** | **사용 가능** — 전역 **`15.22.4`**, 저장소 의존성 **아님** → **lockfile 변경 불필요** |
| **Firestore emulator** | **캐시됨** `cloud-firestore-emulator-v1.21.0.jar` |
| **Storage rules runtime** | **캐시됨** `cloud-storage-rules-runtime-v1.1.3.jar` |
| **Emulator UI** | **캐시됨** `ui-v1.15.0` |
| **Auth emulator binary** | 별도 jar **없음**. 내장으로 보이나 **UNCONFIRMED** |
| **포트** 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free**(확인 시점) |
| `.firebaserc` | `projects.default = "denn-products"` ← **★ 실제 운영 프로젝트 id** |

> **첫 실행에서 binary 다운로드·설치·신규 의존성 추가가 필요해지면 실행하지 말고 STOP한다**(§7.6).

### 7.2 ★★ 운영 프로젝트 접촉 차단 (필수)

- **반드시 `--project demo-denn-emulator`** 를 명시한다(`demo-` 접두 = emulator 전용, 실제 자격 증명 없음).
- **emulator host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트는 시작 전에 실패한다.**
- **실제 Firebase project · 자격 증명 · 운영 bucket으로 fallback하지 않는다.**
- **`.firebaserc`는 수정하지 않는다.**

### 7.3 emulator 전용 config로 Rules 사본을 고정한다

- **`firebase.json`은 구현 단계에서도 수정하지 않는다.**
- **신규 `firebase.emulator.json`** 이 **emulator 전용 Storage/Firestore Rules 사본과 emulator 포트만**
  참조한다(Hosting·배포 항목 없음).
- 실행 명령은 **`--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를 모두** 포함한다.
- **emulator용 Rules 사본에는 합성 UID만** 존재한다.
- **배포 대상 Rules에는 UNCONFIRMED placeholder만** 존재하며 **live 배포는 계속 차단**한다.
- **배포 대상 Rules와 emulator Rules는 UID 상수 외 diff 0임을 unit test로 고정한다.**

### 7.4 테스트 분리 (기존 선례 그대로)

`vitest.config.ts:17`이 `**/*.live.test.ts`를 기본 게이트에서 제외하고
`vitest.live.config.ts` + `pnpm test:live:node`로만 실행하는 선례를 따른다.

- 파일 규칙 **`*.emulator.test.ts`**, 기본 `vitest.config.ts`의 `exclude`에 추가
- **`vitest.emulator.config.ts`** + **`pnpm test:emulator`** 에서만 실행
- **기본 unit/E2E 게이트에서 emulator는 절대 실행되지 않는다**

### 7.5 ★★ [교정 4] 무엇을 무엇이 증명하는가 — 증명 주체 분리

라운드 1은 **callback 재실행**과 **commit outcome unknown**을 "실제 Rules 검증" 표에 넣었다.
**그러나 이 계약에는 그 둘을 emulator에서 결정적이고 비파괴적으로 유발할 seam이 없다.**
**따라서 두 항목을 fake 전용으로 재분류하고, emulator 증명이라고 주장하지 않는다.**

#### (A) emulator + 실제 Rules가 증명하는 것

| # | 항목 | 통과 기준 |
| --- | --- | --- |
| **E-1** | **승인된 합성 UID**의 객체 생성·head `get`·head transaction | 성공 |
| **E-2** | **다른 UID · 익명 · 미인증** | Storage·Firestore **양쪽에서 거부** |
| **E-3** | Storage **create-only** — 동일 `operationId` 재업로드 · `update` · `delete` | **전부 거부** |
| **E-4** | head **`get` 허용 / 다른 identity의 `get` 거부** | 허용·거부가 정확히 갈린다 |
| **E-5** | head **`list` 거부** | 승인 UID라도 거부 |
| **E-6** | **키 / `objectPath` 형태 / revision Rules** — 키 4개, 형식 위반 경로, create `revision != 1`, update `+2`·동일 revision·`objectPath` 미교체 | **전부 거부** |
| **E-7** | **두 writer CAS** — 같은 `expectedBase`로 동시 commit | **head 이동은 정확히 하나**, revision **정확히 +1**, 진 쪽은 **명시적 충돌** |
| **E-8** | **orphan 시 head 불변** — commit이 적용되지 않은 경우 객체는 남고 head는 그대로 | head revision·`objectPath` 무변화 |

> **E-7·E-8은 seam이 필요 없다** — 두 클라이언트를 실제로 동시에 실행하고, 충돌한 쪽의 결과를
> 관측하면 된다. **파괴적 조작이 아니다.**

#### (B) 주입 fake가 결정적으로 증명하는 것

| # | 항목 |
| --- | --- |
| **F-1** | **transaction callback 다회 실행** — fake가 callback을 N회 돌려도 **Storage upload 반복 0**, `randomUUID` 추가 호출 0, 로컬 revision 변경 0, 로그·UI 부작용 0 |
| **F-2** | **앱의 `runTransaction` 호출이 정확히 1회**(callback 실행 횟수와 무관) |
| **F-3** | **upload outcome unknown** · **commit outcome unknown** 분기와 정확한 코드 |
| **F-4** | **bounded reconciliation**(§6.6) — **read 최대 1회**, 재업로드 0, transaction 재호출 0, 3분기 판정 정확 |
| **F-5** | **늦은 성공 폐기** — timeout 이후 도착한 결과가 반환값·상태를 바꾸지 않음 |
| **F-6** | **오류 매핑**이 §5.4 정본 표와 **정확히 일치**하고 8코드 밖으로 새지 않음 |
| **F-7** | **비노출** — `SafeAdminWriteError`와 `JSON.stringify(error)`에 raw message·email·UID·token·object bytes·`objectPath`·`operationId` **0건** |
| **F-8** | **§5.7 범위 검증** — 무효 `expectedBase`는 **upload 전** 차단(Storage 호출 0회), persisted revision 위반은 fail-closed |
| **F-9** | **§4.3 최초 create 분기** — head 부재 + `expectedBase === 0` → create / head 부재 + `expectedBase !== 0` → **`WRITE_CONFLICT`이고 head 쓰기 0회** |
| **F-10** | **baseline 분기**(§6.1~6.2) — head 없음 → legacy + `revision 0` + `source:"legacy"` / head 있음 → 객체만 + `"rebuild"` / head 있고 객체 없거나 invalid → **fail-closed, legacy fallback 0** |

#### (C) 재현 금지

**실제 network 차단 · 프로세스 강제 종료 · 포트 강제 해제 · emulator kill · 실제 Firebase 접근으로
재현하지 않는다.** 그렇게 얻은 결과는 **결정적이지도 비파괴적이지도 않다.**

#### (D) 경계 (양방향)

> **합성 fake는 Rules 원자성을 증명하지 않는다.**
> **emulator는 앱 오류 분기 전체를 증명하지 않는다.**
> 두 층은 서로를 대체하지 못하며, 어느 쪽도 상대의 결론을 빌려 쓰지 않는다.

### 7.6 STOP 조건 (emulator 전용)

- Java · firebase-tools · emulator binary의 **설치 또는 다운로드**
- **신규 의존성 추가**(`firebase-tools`를 저장소 의존성으로 넣는 것 포함)
- **타 프로세스 종료** 또는 **점유 포트 강제 해제**
- `.firebaserc` 수정 · **`firebase.json` 수정** · 실제 프로젝트 id 사용 · 실제 자격 증명 필요
- **emulator 없이는 기본 게이트가 통과하지 않는** 상황
- **§7.5 (A) 항목을 결정적·비파괴적으로 검증할 수 없는** 상황

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

---

## 10. 허용 파일 (구현 단계에서만 · 이 문서 라운드에서는 전부 미변경)

```
packages/firebase/src/admin-write/**          (신규)
packages/firebase/package.json                (./admin-write 서브패스 export 추가)
storage.rules                                 (§4.2 목표 상태 — placeholder UID · 배포는 계속 차단)
firestore.rules                               (§4.4 목표 상태 — placeholder UID · 배포는 계속 차단)
firebase.emulator.json                        (신규 · emulator 전용 config)
<emulator 전용 storage/firestore rules 사본>   (합성 UID만 다름)
vitest.config.ts                              (*.emulator.test.ts 제외 추가)
vitest.emulator.config.ts                     (신규)
package.json                                  (test:emulator 스크립트 추가)
**/*.emulator.test.ts                         (신규)
스펙 037 관련 handoff / CURRENT / live / STATE / NEXT 문서
```

- **`firebase.json`은 허용 파일이 아니다 — 구현 단계에서도 수정하지 않는다.**
- **`packages/firebase/src/index.ts` 루트 배럴 수정 금지.**
- **`packages/firebase/src/admin-read/**` 수정 금지.**
- **`apps/**` 수정 금지** — 이번 단위에 저장 버튼·UI 연결이 없다(§5.2).
- **계속 금지**: `apps/mockup/**` · `packages/render/**` · `packages/shared/**` · `.firebaserc` ·
  `firebase.json` · 실제 `.env` · legacy HTML · 실제 Firebase/network/live/운영 데이터 · 발행·배포.
- `pnpm-lock.yaml`: **신규 의존성이 없으므로 변경이 없어야 한다.** 필요해지면 **STOP**.

---

## 11. 결정적 합성 검증 계약 (fake — 기본 게이트)

§7.5 (B)의 **F-1 ~ F-10** 전부에 더해:

- **import 시 SDK 초기화·네트워크 0**, 기본 상태에서 **write adapter 생성 0**
- 저장 순서 고정(§6.4): `expectedBase` 검증 → `randomUUID` → upload → `runTransaction`.
  **호출 로그로 순서를 고정**
- **upload 실패 시 `runTransaction` 호출 0회**
- **미인증·익명에서 upload·transaction 0회**(로컬 게이트가 먼저 막는다)
- **`loadBaseline`·`save` 각각 단일 in-flight**: 두 번째 호출이 **새 요청을 만들지 않는다**
- **앱 자동 retry 0 · 자동 merge 0**
- **`operationId`를 외부에서 주입할 수 없음**(타입·런타임 양쪽에서 고정)
- **`readLegacyCatalog` 검증 규칙이 admin-write에 재구현되지 않음**(중복 검증 금지)
- **Rules 동등성**: 배포 대상 rules와 emulator 사본이 **UID 라인을 제외하면 동일**함을 고정

> **★ 위 fake 테스트 전부는 서버 Rules 원자성을 증명하지 않는다**(§7.5 D).

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

- **실제 운영자 UID**가 필요해짐 · **Rules 배포**가 필요해짐 · **`firebase.json` 수정**이 필요해짐
- emulator **설치·다운로드·신규 의존성·포트 강제 해제·프로세스 종료**가 필요해짐(§7.6)
- **§7.5 (A)를 결정적·비파괴적으로 검증할 수 없음**
- **실제 Firebase 요청 없이는 게이트가 통과하지 않음**
- **`apps/**` 수정** 또는 **`packages/firebase/src/admin-read/**` 수정**이 필요해짐
- **"head commit만 재개" API**가 필요해 보임(§6.6)
- **9번째 오류 코드**가 필요해 보임(§0.1) · **`packages/firebase` 루트 배럴**·**고객 번들** 변경 필요
- **tombstone·자동 merge**가 필요해짐(§8) · **orphan 삭제·정리**가 필요해짐(G-4)
- Rules가 **`objectPath`의 실제 객체 존재를 증명해야** 계약이 성립한다고 판단됨
  → C5 전제가 흔들리므로 **즉시 보고**(G-3의 C6 재검토 사유)

## 14. NOT TESTED / UNCONFIRMED

- **실제 Firebase 프로젝트에서의 동작 전부** — 실제 Rules 배포·거부, 실제 bucket, 운영 데이터
- **실제 운영자 UID와 그 계정의 실재·로그인**
- **실제 네트워크 지연·단절에서의 거동** — emulator는 로컬이라 타이밍이 다르다
- **실기기·다중 기기 동시 편집**
- **Auth emulator binary의 가용성**(§7.1)
- **운영 규모 payload**(실제 `admin/state.json` 크기·내용)
- **orphan 누적의 실제 비용**
- **L-4 삭제 부활**(§8 — 이 스펙이 다루지 않는다)
- `pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결)

## 15. 위험 (RISK)

| # | 위험 | 완화 |
| --- | --- | --- |
| **R-1** | **★★ Rules 배포가 운영자의 유일한 저장 경로를 닫는다** | §9: 이번 스펙에서 배포 0 |
| **R-2** | **★ emulator가 실제 프로젝트 id로 뜬다** | §7.2·§7.3: **`demo-` 프로젝트 + `--config firebase.emulator.json` 강제**, host 미설정 시 **시작 거부** |
| **R-3** | emulator 사본 Rules가 실제 Rules와 갈라진다 | §7.3: **UID 라인 외 diff 0**을 unit test가 고정 |
| **R-4** | SDK 내부 재시도가 **같은 객체를 두 번 쓴다** | §4.1 `resource == null`이 서버에서 거부. §5.3이 "요청 1회"를 주장하지 않음 |
| **R-5** | `*_OUTCOME_UNKNOWN`을 성공/실패로 단정하거나 **재전송**한다 | §6.5~6.6: `retryable:false` + **port 내부 bounded reconciliation** + **reload 전 재전송 금지** |
| **R-6** | head는 있는데 객체가 없어 **legacy로 조용히 되돌아간다** | §6.2 **fail-closed, fallback 0** |
| **R-7** | orphan이 누적된다 | G-4: 정리 정책 승인 전 **운영 쓰기 미활성화** |
| **R-8** | `op()`를 건드려 **레거시 발행·자산 업로드가 함께 잠긴다** | §3.2 **`op()` 무변경** |
| **R-9** | **callback 재실행이 upload를 반복**하거나 부작용을 남긴다 | §5.5 부작용 전면 금지 + **F-1·F-2**가 결정적으로 확인 |
| **R-10** | **baseline load가 head를 읽지 못해** 기능이 성립하지 않는다 | §4.4 `get` 명시 허용 + **E-4·E-5** |
| **R-11** | ★ **head가 사라진 상황에서 revision 1을 만들어 이력을 밀어낸다** | §4.3 **`expectedBase === 0`일 때만 create**, 아니면 `WRITE_CONFLICT` + **F-9** |
| **R-12** | ★ **호출자가 수행할 수 없는 복구 절차를 계약이 요구한다** | §6.6 **port 내부 reconciliation** + **F-4** |
| **R-13** | ★ **fake로만 가능한 것을 "실제 Rules로 검증했다"고 오인**한다 | §7.5 **(A)/(B) 분리 + (D) 양방향 경계** 명시 |

---

## 16. 승인 상태와 다음 단계 (문구 통일)

- **Founder G-1~G-5**: 승인됨(`dc5666d`) — **구현 계약 작성 + 합성 fake + 로컬 emulator 검증까지**.
- **이 계약 문서**: **보완 라운드 2 적용**, **Codex 재검토 대기**.
- **이번 라운드에서 구현 착수를 승인하지 않는다.**
- **보완 문서 push 후 상태는 `READY_FOR_CODEX`.**
- **Codex 보완 라운드 2 재검토 전 구현은 0이다.**
- **Codex 통과 후에도 실제 제품 UI 연결 · live Firebase · Rules 배포 · 운영 쓰기는 계속 금지**다.
- **★ port/Rules/config/test 구현 착수 여부를 이 문서가 추측하지 않는다.**
  G-5가 허용한 범위(**합성 fake · 로컬 emulator**)와 결정 문서 §2가 금지한 **"제품 구현 착수"** 의
  경계 판정은 **Codex의 다음 검수 몫**이며, 이 계약은 **양쪽을 구분해 기록할 뿐 결론을 내리지 않는다.**
