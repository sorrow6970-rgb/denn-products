# 스펙 037 — 운영자 상태 쓰기 C5 (불변 객체 + 단일 Firestore head) · Emulator 검증 계약

상태: **DONE (Codex `CODEX_PASSED`, 2026-08-11)** — 구현 **`d83aee9`** + 보완 라운드 1 **`ead06ab`**,
기록 **`91a7813`**. **로컬 비-UI 구현·검증까지만** 완료됐고, **실제 Firebase·실제 UID·운영 배포·
UI 연결은 여전히 NOT TESTED이자 금지**다(§16 · 아래 "종료" 절).

계약 이력: 작성 2026-08-11 · 초판 `c654023` · **라운드 1** `41b54b9` · **라운드 2** `d5789db` ·
**라운드 3** `9805c26` · 동기화 `fad819f`·`f694211`·`2f0ca7d`
Founder 구현 착수 승인 **`4f2ab0b`** + 허용 범위 검토 **`f8590e4`**(A-12·A-13 확장 포함)
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`
(Founder G-1~G-5, 2026-08-11 승인) · 선행 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E)
근거 조사: `reviews/2026-08-11-admin-write-atomicity-investigation.md`
구조 결정: **Codex Z-1 ~ Z-8** + **라운드 1 교정 1~5** + **라운드 2 교정 1~4** + **라운드 3 교정 1~2**
선행 스펙: `036-admin-auth-private-state-read.md` (**DONE**)

> **이 문서는 계약이다. 제품 코드가 아니다.**
> 이 라운드에서 `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
> `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` 변경은 **0**이다.
> 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 **0**, upload/write/delete/publish/deploy **0**.

---

## 0. 보완 라운드 3 — 무엇을 정정했는가

| # | 라운드 2의 결함 | 정정 |
| --- | --- | --- |
| **1** | `loadBaseline`의 **읽기/network/invalid 상태를 `WRITE_UPLOAD_FAILED`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`·`WRITE_HEAD_FAILED`로 표현**했다. **읽기 작업에 "upload" 오류를 반환**하고 **persisted object invalid를 "head transaction 실패"와 합치는 것은 공개 API 의미가 틀리다** | **오류 표면을 분리**했다(§5.4·§5.6·§6.1). **`save`만** `SafeAdminWriteError`와 8개 `WRITE_*`를 쓴다. **`loadBaseline`은 스펙 036의 `SafeAdminReadError` 의미를 재사용**하고 **head 문서 자체의 스키마 위반만** 신규 **`REBUILD_BASELINE_INVALID`** 하나로 구분한다. **`WRITE_HEAD_FAILED`는 save의 head transaction이 명확히 실패한 경우로 다시 좁혔다** |
| **2** | **timeout 뒤 head가 base에 머물러 있으면 commit 미반영을 확정**하고 `WRITE_HEAD_FAILED`를 반환했다. **timeout은 SDK transaction을 취소하지 않으므로** reconciliation read 순간에 base여도 **원 transaction이 나중에 성공할 수 있다** | §6.6 판정을 다시 썼다. **base 관측은 "아직 아님"이지 "영원히 아님"이 아니다** → **`WRITE_COMMIT_OUTCOME_UNKNOWN` 유지**, **orphan이라고 부르지 않는다**. `base+1`인데 **objectPath가 다르면 `WRITE_CONFLICT` 확정**(우리 late commit은 CAS에서 이길 수 없다). `base+1` 초과는 **판정 불가** |

> **★ 교정 2는 Codex의 라운드 2 지시에도 포함됐던 오류다.** 최종 계약에서 바로잡았다.

### 0.1 라운드 2에서 열어 둔 질문 — **해소됨**

라운드 2는 "`loadBaseline` 실패를 8코드 안에서 어떻게 부르는가"를 열어 두고
**`WRITE_HEAD_FAILED`의 의미를 확장**하는 절충을 썼다.
**라운드 3 교정 1이 그 절충을 폐기했다** — 오류 표면 자체를 분리하는 것이 옳은 답이다.
**`WRITE_HEAD_FAILED`는 다시 save 전용으로 좁혀졌고, 9번째 `WRITE_*` 코드는 만들지 않았다.**

---

## 1. 목표 (WHY)

리빌드 admin이 **운영자 상태를 조용한 손실 없이 저장할 수 있는 구조**를 확정하고,
그 구조가 **로컬 emulator에서 실제 Rules로 검증**되게 만든다.

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 없다** → 같은 경로를 두
  운영자가 덮어쓰는 모델은 **안전해질 수 없다.**
- 그래서 **덮어쓰기를 없앤다**(C5): **객체는 매번 새 경로에 한 번만 생성**되고,
  **가변 지점은 Firestore head 하나**이며 그 이동만 **transaction CAS**로 보호한다.

> **★ 안전 근거는 cross-service 원자성이 아니라 "불변 객체 우선 + 단일 가변 정본"이다.**

## 2. 범위 (SCOPE)

**포함**: 쓰기 port 계약(`@denn/firebase/admin-write`, **공개 타입 전부 고정**) · Storage 불변 객체
create-only · Firestore head CAS(**최초 create 포함 전 구간 `expectedBase` 검사**) ·
baseline 로드 계약과 **분리된 오류 표면** · **8개 `WRITE_*` + baseline 오류 계약** ·
**save 내부 bounded reconciliation** · `storage.rules`·`firestore.rules` 목표 상태 ·
`firebase.emulator.json` 기반 emulator 검증(**증명 주체 분리**) · 결정적 합성 fake 검증.

**제외**: 저장 버튼·admin UI 연결 · "head commit만 재개" API · tombstone·자동 merge·L-4 해결 ·
orphan 삭제·자동 정리·클라이언트 delete 권한 · **`packages/firebase/src/admin-read/**` 수정** ·
**`firebase.json` 수정** · `published/state.json` 발행 · legacy `admin/state.json` 쓰기 ·
legacy cm 되쓰기·마이그레이션 · C6·C3·C4 · Rules 배포·Hosting 배포·운영 쓰기 활성화 ·
실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network.

---

## 3. Z-1 — 승인 UID 제한의 적용 범위

**적용 대상**: Storage `rebuild-admin-state/**` · Firestore `/rebuildAdminState/head` **둘 뿐**.

**★ 기존 `op()`를 바꾸지 않는다.** `storage.rules:18-21`의 `op()`는 `published/`·`templates/`·
`placeholders/`·`guides/`·`mockups/`·`editor-overlays/` write에도 함께 쓰인다(`:35-40`).
바꾸면 레거시 발행(`denn-admin.html:14946`)과 자산 업로드까지 **우발적으로 잠긴다.**
UID 제한은 **새 함수**(예: `approvedOperator()`)로 **새 경로에만** 건다.

**★ 실제 UID는 UNCONFIRMED다.** 추측하지 않고, 배포 대상 Rules에는 **표시된 placeholder만** 둔다:
`// UNCONFIRMED_OPERATOR_UID — Founder가 정본 UID를 제공하기 전에는 배포 금지`.
**UID 정본 전 live Rules 배포와 운영 쓰기는 계속 차단**한다.

**Emulator 합성 UID**: `EMULATOR_OPERATOR_UID = "emulator-operator-DO-NOT-DEPLOY"` —
실제 Firebase UID(28자 영숫자)와 **형식이 달라 혼동 불가**, **emulator 전용 Rules 사본에만** 존재.
**synthetic Auth 계정은 emulator 내부에서만 만든다 — 실제 계정 생성이 아니다.**

---

## 4. Z-2 / Z-3 — Storage 경로와 Firestore head

### 4.1 Storage 경로

```
rebuild-admin-state/objects/{operationId}.json
```

- **별도 최상위 경로** → 겹치는 상위 match가 없어 **OR 평가 우회가 구조적으로 발생하지 않는다**.
- `operationId` = **save 호출당 한 번 생성하는 무작위 UUID**. **재시도해도 새로 만들지 않고**,
  **transaction callback 안에서 만들지 않는다**.
- **경로에 넣지 않는 것**: revision · 고객 문구 · catalog id · 이메일 · UID · 시간 · 파일명.
  **content-addressed identifier 미사용.**
- `application/json` · **20 MiB 미만** · **`resource == null` create-only**(update/delete 금지).

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

> ⚠️ **`allow write: if false`는 `denn-admin.html:740`의 저장을 서버에서 거부한다** —
> 현재 운영자의 **유일한** 저장 경로다. **배포 순서는 §9의 STOP 대상**이다.

### 4.3 Firestore head 문서 · 스키마 · commit 규칙

**가변 정본은 정확히 한 문서:** `/rebuildAdminState/head`

| 키 | 타입 | 규칙 |
| --- | --- | --- |
| `schemaVersion` | number | **정확히 `1`** |
| `revision` | number | **1 이상의 safe integer**(§5.7) |
| `objectPath` | string | **`rebuild-admin-state/objects/{UUID}.json` 형태만** |

**head에 저장하지 않는 것**: 이메일 · UID · 고객 문구 · 원문 catalog · token · 오류 원문.

**commit 규칙 — 최초 생성도 `expectedBase`를 검사한다.** **head 없음 = 논리적 revision `0`.**

| transaction 안에서 관측한 head | `expectedBase` | 동작 |
| --- | --- | --- |
| **없음**(논리적 `0`) | **`=== 0`** | **`revision: 1`로 create**, `objectPath` = 이번 객체 |
| **없음**(논리적 `0`) | **`!== 0`** | **create 하지 않는다** → **`WRITE_CONFLICT`**(head 불변) |
| 있음, `revision === expectedBase` | 일치 | **`revision + 1`로 update** + **`objectPath` 교체** |
| 있음, `revision !== expectedBase` | 불일치 | **`WRITE_CONFLICT`**(head 불변) |
| 있음, `revision`이 §5.7 위반 | — | **fail-closed** → **`WRITE_HEAD_FAILED`**(head 불변) |

> **왜**: "head 없으면 무조건 revision 1"이면 **`expectedBase`가 5인 편집 세션이 head가 사라진
> 상황에서 revision 1을 만들어 5번의 이력을 조용히 밀어낼 수 있다.** G-2의 예외가 되어선 안 된다.

**Rules와의 분담**: `firestore.rules`는 **create `revision == 1`** 과 **update 정확히 `+1`** 을 강제한다.
**`expectedBase` 자체는 클라이언트 transaction 계약에서 검사한다**(Rules는 요청자의 base를 모른다).

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

- **`validHeadKeys()`** — 키가 **정확히 3개**. **`validObjectPath()`** — 경로 형태 강제.
- **`spaces/{token}`과 catch-all `allow read, write: if false`(`firestore.rules:11-21`)는 무변경.**

> **★ Firestore Rules가 Storage 객체의 실제 존재를 원자적으로 증명한다고 주장하지 않는다.**
> Rules는 `objectPath` **문자열 형태**만 검사한다. 그 간극은 §6.2의 **fail-closed 읽기**가 흡수한다.

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

- **`loadBaseline`과 `save` 각각 단일 in-flight.** **앱 수준 자동 retry 0**, **자동 merge 0**.
- ⚠️ **Firebase SDK 내부 재시도가 존재한다**(업로드 재시도 창 **10분**, `index.esm.js:37`·`:43`).
  → **"네트워크 요청 자체가 정확히 1회"라고 단정하지 않는다.** 앱이 스스로 다시 쏘지 않을 뿐이다.
  → SDK가 같은 요청을 다시 보내도 **같은 불투명 경로**를 향하고 `resource == null`이 **두 번째를 거부**한다.
- ⚠️ **timeout은 SDK transaction을 취소하지 않는다**(§6.6) — 늦은 성공이 서버에서 일어날 수 있다.

### 5.4 ★ [교정 1] 오류 표면 — **`save`와 `loadBaseline`은 다른 표면을 쓴다**

#### (A) `save` 전용 — `SafeAdminWriteError` + 8개 `WRITE_*` (정본 표)

| 코드 | `category` | `retryable` | 의미 |
| --- | --- | --- | --- |
| `WRITE_CONFLICT` | `VALIDATION` | **false** | head의 논리적 현재 revision ≠ `expectedBase`(head 부재 시 `0`과 비교). **또는** reconciliation이 **다른 writer 승리를 확정**한 경우(§6.6) |
| `WRITE_AUTH_REQUIRED` | `AUTH` | true | 미인증 · 초기화 중 · 익명 |
| `WRITE_FORBIDDEN` | `AUTH` | false | 인증됐으나 Rules가 거부(승인 UID 아님 등) |
| `WRITE_INVALID_INPUT` | `VALIDATION` | false | 요청이 계약 위반 — **`expectedBase`가 §5.7 위반**, `correlationId` 형식 위반, catalog 형식 위반 |
| `WRITE_UPLOAD_FAILED` | `NETWORK` | true | **객체 업로드**가 **명확히 실패**(서버 미반영이 확실) |
| `WRITE_UPLOAD_OUTCOME_UNKNOWN` | `NETWORK` | **false** | **객체 업로드**의 서버 반영 여부가 불명확 |
| `WRITE_HEAD_FAILED` | `VALIDATION` | **false** | **★ save의 head transaction이 명확히 실패**했다(명확한 reject, 또는 transaction 안에서 관측한 persisted `revision`이 §5.7 위반). **읽기 실패나 baseline 문제는 여기 오지 않는다** |
| `WRITE_COMMIT_OUTCOME_UNKNOWN` | `UNKNOWN` | **false** | reconciliation(§6.6) 후에도 **commit 반영 여부를 판정할 수 없음** |

- **이 8개 밖의 `WRITE_*` 코드는 존재하지 않는다.** `category`·`retryable`은 **코드의 속성**이다.
- **`WRITE_CONFLICT`·두 `*_OUTCOME_UNKNOWN`·`WRITE_HEAD_FAILED`는 재읽기 후 사용자의 명시적
  재시도만** 허용한다.

#### (B) `loadBaseline` 전용 — 스펙 036 `SafeAdminReadError` **재사용** + 신규 1개

**읽기 작업에 "upload" 오류를 반환하지 않는다.** 기존 read 오류의 의미를 **그대로 보존**한다.

| baseline 실패 상황 | 반환 오류 |
| --- | --- |
| 미인증 · 초기화 중 · 익명 | 스펙 036의 `AUTH_REQUIRED` / `AUTH_NOT_READY` / `ANONYMOUS_NOT_ALLOWED` |
| Rules 거부 | `ADMIN_STATE_FORBIDDEN` |
| **head 없음** → legacy `admin/state.json` 읽기 실패 | **스펙 036의 기존 read 오류를 그대로 보존**(`ADMIN_STATE_NOT_FOUND` / `INVALID_JSON` / `INVALID_CATALOG` / `RESPONSE_TOO_LARGE` …) |
| **head 있음** → 참조 객체가 **없음** | `ADMIN_STATE_NOT_FOUND` |
| **head 있음** → 참조 객체의 **JSON/catalog invalid** | `INVALID_JSON` / `INVALID_CATALOG`(+ `issues`) |
| **read timeout** | `NETWORK_TIMEOUT` — **★ 상태를 변경하지 않으므로 upload outcome unknown으로 부르지 않는다** |
| **network 실패** | `NETWORK_UNAVAILABLE` |
| **★ head 문서 자체의 허용 키 / `revision` / `objectPath` / `schemaVersion` 위반** | **`REBUILD_BASELINE_INVALID`**(신규, **baseline 전용 유일 추가 코드**) |

- **`REBUILD_BASELINE_INVALID`는 head 문서 자체의 스키마 위반에만** 쓴다.
  **참조 객체의 문제는 기존 read 오류**로 표현한다(둘을 섞지 않는다).
- **`WRITE_*` 코드는 `loadBaseline`에서 나오지 않는다.**

#### (C) 공통 비노출 규율

**어떤 오류에도** raw SDK message · email · UID · token · **object bytes** · **object path** ·
**`operationId`** 를 넣지 않는다. `correlationId`는 **호출자 주입**이다.
(`SafeAdminReadError.issues`는 스펙 036대로 **`{code, path}` 쌍만** 담는다 — 원문 값은 담지 않는다.)

### 5.5 Firestore transaction callback 재실행 계약

- **앱은 `runTransaction`을 정확히 한 번 호출한다.**
- **★ Firebase SDK는 transaction callback을 내부적으로 여러 번 실행할 수 있다**(`maxAttempts` 기본 5).
- **callback 안에서는 `transaction.get` / `transaction.set` 이외의 부작용을 금지한다.**
  **금지**: UUID 생성 · **Storage upload** · 로그 · UI 변경 · **로컬 revision 변경** ·
  카운터 · 타이머 · **reconciliation read**(§6.6).
- **`operationId`와 `expectedBase`는 transaction 호출 *전에* 고정한다.**
- **callback 재실행마다 head를 다시 읽되 `expectedBase`를 자동 변경하지 않는다.**
- **불일치는 `WRITE_CONFLICT`.** **upload는 transaction 밖 선행**이라 재실행으로 반복되지 않는다.
- **callback 내부 재실행 ≠ 앱 수준 retry.**

### 5.6 ★ [교정 1] 공개 타입 계약

```ts
import type { CatalogDocumentV1, Result } from "@denn/shared";
import type { SafeAdminReadError } from "@denn/firebase/admin-read";
// Result       = packages/shared/src/index.ts:19
//                { ok: true; value: T } | { ok: false; error: E }
// CatalogDocumentV1 = packages/shared/src/catalog/types.ts
// SafeAdminReadError = packages/firebase/src/admin-read/types.ts (admin-read 배럴이 이미 export한다)
// 이 스펙은 위 세 타입의 alias·동의어·재정의를 만들지 않는다.

/** 논리적 상태 revision. 0 = head 부재. 런타임 유효 범위는 §5.7. */
export type AdminStateRevision = number;

// ── save 전용 오류 ────────────────────────────────────────────────
export type AdminWriteErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

/** §5.4 (A) 정본 표의 8개. 이 union 밖의 값은 존재하지 않는다. */
export type AdminWriteErrorCode =
  | "WRITE_CONFLICT"
  | "WRITE_AUTH_REQUIRED"
  | "WRITE_FORBIDDEN"
  | "WRITE_INVALID_INPUT"
  | "WRITE_UPLOAD_FAILED"
  | "WRITE_UPLOAD_OUTCOME_UNKNOWN"
  | "WRITE_HEAD_FAILED"
  | "WRITE_COMMIT_OUTCOME_UNKNOWN";

export interface SafeAdminWriteError {
  readonly category: AdminWriteErrorCategory;
  readonly code: AdminWriteErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
}

// ── loadBaseline 전용 오류 ────────────────────────────────────────
/** head 문서 자체의 스키마 위반. baseline 전용으로 추가되는 유일한 코드다. */
export interface SafeAdminBaselineInvalidError {
  readonly category: "VALIDATION";
  readonly code: "REBUILD_BASELINE_INVALID";
  readonly retryable: false;
  readonly correlationId: string;
}

export type SafeAdminBaselineError =
  | SafeAdminReadError
  | SafeAdminBaselineInvalidError;

// ── 값과 port ─────────────────────────────────────────────────────
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

export type AdminStateBaselineResult = Result<
  AdminStateBaselineValue,
  SafeAdminBaselineError
>;

export type AdminStateSaveResult = Result<
  AdminStateSaveValue,
  SafeAdminWriteError
>;

export interface AdminStateWritePort {
  loadBaseline(request: {
    readonly correlationId: string;
  }): Promise<AdminStateBaselineResult>;

  save(request: AdminStateSaveRequest): Promise<AdminStateSaveResult>;
}
```

**타입 관련 규율**

- **`SafeAdminReadError`는 `@denn/firebase/admin-read` 배럴이 이미 export한다**(확인함).
  **실제 import가 자기 package subpath 순환을 만들면 구현은 내부 relative type import를 써도 되지만,
  공개 의미는 `@denn/firebase/admin-read`의 `SafeAdminReadError`와 동일해야 한다.**
  (`import type`은 컴파일 시 지워지므로 **런타임 결합·번들 영향은 어느 쪽이든 0**이다.)
- **`packages/firebase/src/admin-read/**`를 수정하지 않는다는 경계는 유지한다.**
- `SafeAdminBaselineError`는 **`code`로 판별 가능한 union**이다
  (`REBUILD_BASELINE_INVALID`는 `AdminReadErrorCode` 15개 어디에도 없다).
- **`operationId`는 공개 타입 어디에도 나타나지 않는다** — port 내부에서 save당 1회 생성한다.
- **`AdminStateSaveValue.objectPath`는 성공 값에만** 존재한다. 오류에는 절대 넣지 않는다.
- **`loadBaseline`과 `save` 모두 단일 in-flight.**
- legacy read는 **기존 공개 계약을 재사용하거나 facade에서 조합**하되
  **중복 검증 규칙을 만들지 않는다**(`readLegacyCatalog`를 다시 구현하지 않는다).

### 5.7 `revision` / `expectedBase` 유효 범위

| 대상 | 유효 조건 | 위반 시 |
| --- | --- | --- |
| **요청의 `expectedBase`** | `Number.isSafeInteger(v) && v >= 0` | **upload 전 `WRITE_INVALID_INPUT`**(Storage 호출 0회) |
| **persisted head `revision`** (save의 transaction 안) | `Number.isSafeInteger(v) && v >= 1` **그리고 `v + 1`이 여전히 safe integer** | **fail-closed → `WRITE_HEAD_FAILED`**, head 불변 |
| **persisted head `revision`** (loadBaseline) | 위와 동일 | **`REBUILD_BASELINE_INVALID`**(§5.4 B) |
| **head 부재** | 논리적 revision **`0`** | §4.3 표에 따름 |

- `expectedBase` 검증은 **가장 먼저** — **무효한 base로는 객체를 만들지 않는다.**
- `+1` 안전성 검사는 **오버플로로 revision이 정체·역전되는 것을 막는다**
  (`MAX_SAFE_INTEGER + 1 === MAX_SAFE_INTEGER + 2`).

---

## 6. Z-5 — 읽기 기준, `expectedBase`, 결과 판정

### 6.1 baseline 로드

| head 상태 | 읽는 대상 | `revision` | `source` | 실패 시 |
| --- | --- | --- | --- | --- |
| **없음** | legacy `admin/state.json` | **`0`** | `"legacy"` | **스펙 036 read 오류 보존**(§5.4 B) |
| **있음**, head 유효 | **head가 가리키는 rebuild 객체만** | head의 `revision` | `"rebuild"` | **스펙 036 read 오류 보존** |
| **있음**, head 문서 자체가 §4.3/§5.7 위반 | — | — | — | **`REBUILD_BASELINE_INVALID`** |

### 6.2 ★ head가 있으면 legacy를 읽지 않는다

head가 존재하는데 그 객체가 **없거나 invalid**하면 **fail-closed**(§5.4 B의 대응 read 오류).
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
4. 결과 판정 (§6.5). **결과가 불명확할 때만** §6.6 reconciliation을 최대 1회
5. 성공 → { revision, objectPath } 반환
```

### 6.5 결과 상태

| 상황 | 객체 | head | 코드 |
| --- | --- | --- | --- |
| `expectedBase` 무효(§5.7) | **생성 안 됨** | **불변** | `WRITE_INVALID_INPUT` |
| **upload 명확히 실패** | 생성 안 됨 | **불변**(transaction 미시작) | `WRITE_UPLOAD_FAILED` |
| **upload 결과 불명** | **없거나 orphan일 수 있음** | **불변**(transaction을 부르지 않았다) | `WRITE_UPLOAD_OUTCOME_UNKNOWN` |
| upload 성공 + **`expectedBase` 불일치**(명확) | **orphan** | **불변** | `WRITE_CONFLICT` |
| upload 성공 + **transaction 명확히 reject** 또는 persisted `revision` §5.7 위반 | **orphan** | **불변** | `WRITE_HEAD_FAILED` |
| upload 성공 + **transaction 결과 불명** | **§6.6이 판정** | **§6.6** | **§6.6** |

> **★ 명확히 실패·거부가 확정된 경우는 §6.6 reconciliation에 들어오지 않는다.**
> 그 경우에만 객체를 **orphan이라고 부를 수 있다.**

### 6.6 ★★ [교정 2] transaction 결과 불명 — bounded reconciliation과 **정확한 판정**

**성질**

- **`save` 내부가 자신이 보유한 `operationId`로 read-only reconciliation을 수행한다.**
- **write retry가 아니다** — **Storage 재업로드 0회**, **transaction 재호출 0회**, **삭제 0회**.
- **동일 save 호출 안에서 bounded read를 최대 1회**(무한 polling 금지).
- **transaction callback 안에서 하지 않는다**(§5.5).

**★ 전제 — timeout은 취소가 아니다**

> **로컬 timeout은 SDK transaction을 취소하지 않는다.**
> reconciliation read 순간의 관측은 **그 시점의 사실일 뿐**이고,
> **원 transaction이 그 뒤 서버에서 성공할 수 있다.**
> 따라서 **"지금 base에 있다"는 "영원히 반영되지 않는다"의 증거가 아니다.**

**판정 (reconciliation read로 관측한 head 기준)**

| 관측된 head | 판정 | 반환 |
| --- | --- | --- |
| `revision === expectedBase + 1` **그리고** `objectPath` = **이번 `operationId` 경로** | **성공 확정** | `ok: { revision, objectPath }` |
| `revision === expectedBase + 1` **그리고** `objectPath`가 **다름** | **다른 writer 승리 확정.** head는 이제 `expectedBase`가 아니므로 **이번 operation의 late commit은 CAS에서 이길 수 없다.** 업로드 객체는 **orphan** | **`WRITE_CONFLICT`** |
| **여전히 논리적 base**(head 부재 = base `0`, 또는 `revision === expectedBase`) | **★ late commit 가능성이 남아 있으므로 미판정.** **orphan이라고 부르지 않는다** | **`WRITE_COMMIT_OUTCOME_UNKNOWN`** |
| `revision > expectedBase + 1` | **이번 commit이 중간에 성공했는지 판정할 수 없다** | **`WRITE_COMMIT_OUTCOME_UNKNOWN`** |
| **reconciliation read 실패 · timeout** | 판정 불가 | **`WRITE_COMMIT_OUTCOME_UNKNOWN`** |

> `objectPath` 비교가 성립하는 이유는 **§4.4가 update마다 `objectPath` 교체를 강제**하기 때문이다.

**경계**

- **결과 불명 시 자동 재업로드 · transaction 재호출 · 삭제 · 성공/실패 추측은 계속 0이다.**
- **reload 전에는 동일 payload를 자동으로도 수동으로도 재전송하지 않는다.**
- **timeout 이후 도착한 SDK 결과가 UI·반환값을 뒤집지 않는다**(늦은 결과 폐기).
  **동시에, 원 transaction이 서버에서 늦게 성공할 수 있다는 사실을 명시한다** — 두 규칙은 양립한다.
  앱은 **자기 반환값을 바꾸지 않을 뿐**이고, **서버의 진실은 다음 `loadBaseline`이 알려 준다.**
- **호출자에게 `operationId`나 object path를 오류로 노출하지 않는다.**
- **`loadBaseline`은 정상 baseline 로드 API다.** 결과 불명 reconciliation을 **호출자에게 떠넘기는
  용도로 쓰지 않는다.**
- **별도의 "head commit만 재개" API는 이번 스펙에 만들지 않는다.**

### 6.7 orphan의 정의 (G-4)

- **orphan = head가 참조하지 않는 것이 *확정된* 불변 객체** — §6.5의 명확한 실패·거부 분기와
  §6.6의 **"다른 writer 승리 확정"** 분기에서만 그렇게 부른다.
- **`WRITE_COMMIT_OUTCOME_UNKNOWN`·`WRITE_UPLOAD_OUTCOME_UNKNOWN` 상태는 orphan이 아니라 "미판정"이다.**
- **클라이언트 delete 권한 없음**, **자동 정리 없음.**
- **보존 기간·비용 한도·정리 주체가 별도 승인되기 전에는 실제 운영 쓰기를 활성화하지 않는다.**

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

### 7.2 ★★ 운영 프로젝트 접촉 차단 (필수)

- **반드시 `--project demo-denn-emulator`**(`demo-` 접두 = emulator 전용, 실제 자격 증명 없음).
- **emulator host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트는 시작 전에 실패한다.**
- **실제 Firebase project · 자격 증명 · 운영 bucket으로 fallback하지 않는다.**
- **`.firebaserc`는 수정하지 않는다.**

### 7.3 emulator 전용 config로 Rules 사본을 고정한다

- **`firebase.json`은 구현 단계에서도 수정하지 않는다.**
- **신규 `firebase.emulator.json`** 이 **emulator 전용 Rules 사본과 emulator 포트만** 참조한다.
- 실행은 **`--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를 모두** 포함한다.
- **emulator Rules 사본에는 합성 UID만**, **배포 대상 Rules에는 placeholder만**.
- **둘의 UID 상수 외 diff 0을 unit test로 고정한다.**

### 7.4 테스트 분리 (기존 선례 그대로)

`vitest.config.ts:17`의 `*.live.test.ts` 제외 선례를 따른다 —
**`*.emulator.test.ts`** + **`vitest.emulator.config.ts`** + **`pnpm test:emulator`** 에서만 실행하고,
**기본 unit/E2E 게이트에서 emulator는 절대 실행되지 않는다.**

### 7.5 무엇을 무엇이 증명하는가 — 증명 주체 분리

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

> **E-7·E-8은 seam이 필요 없다** — 두 클라이언트를 실제로 동시에 실행하고 관측하면 된다. **비파괴적**이다.

#### (B) 주입 fake가 결정적으로 증명하는 것

| # | 항목 |
| --- | --- |
| **F-1** | **transaction callback 다회 실행** — callback을 N회 돌려도 **Storage upload 반복 0**, `randomUUID` 추가 호출 0, 로컬 revision 변경 0, 로그·UI 부작용 0 |
| **F-2** | **앱의 `runTransaction` 호출이 정확히 1회**(callback 실행 횟수와 무관) |
| **F-3** | **upload outcome unknown** 분기 — head 불변, transaction 호출 0회, `WRITE_UPLOAD_OUTCOME_UNKNOWN` |
| **F-4** | **★ bounded reconciliation 5분기**(§6.6) — **read 최대 1회**, 재업로드 0, transaction 재호출 0, 삭제 0. **base 관측이 `WRITE_HEAD_FAILED`가 아니라 `WRITE_COMMIT_OUTCOME_UNKNOWN`** 임을 고정하고, **`base+1` + 다른 `objectPath`는 `WRITE_CONFLICT`** 임을 고정 |
| **F-5** | **늦은 성공 폐기** — timeout 이후 도착한 SDK 결과가 **반환값·상태를 뒤집지 않음**. 동시에 **그 결과가 서버에서 성공했을 수 있음을 반환값이 부정하지 않음**(성공/실패를 단정하지 않는다) |
| **F-6** | **오류 매핑**이 §5.4 (A)/(B)와 **정확히 일치**하고, **`save`는 `WRITE_*` 8개만**, **`loadBaseline`은 read 오류 + `REBUILD_BASELINE_INVALID`만** 낸다 |
| **F-7** | **비노출** — 두 오류 타입과 `JSON.stringify(error)`에 raw message·email·UID·token·object bytes·`objectPath`·`operationId` **0건** |
| **F-8** | **§5.7 범위 검증** — 무효 `expectedBase`는 **upload 전** 차단(Storage 호출 0회), persisted revision 위반은 save에서 `WRITE_HEAD_FAILED` / load에서 `REBUILD_BASELINE_INVALID` |
| **F-9** | **§4.3 최초 create 분기** — head 부재 + `expectedBase === 0` → create / head 부재 + `expectedBase !== 0` → **`WRITE_CONFLICT`이고 head 쓰기 0회** |
| **F-10** | **baseline 분기**(§6.1~6.2) — head 없음 → legacy + `revision 0` + `source:"legacy"` / head 있음 → 객체만 + `"rebuild"` / head 있고 객체 없거나 invalid → **fail-closed, legacy fallback 0** / **head 문서 자체 위반 → `REBUILD_BASELINE_INVALID`** |

#### (C) 재현 금지

**실제 network 차단 · 프로세스 강제 종료 · 포트 강제 해제 · emulator kill · 실제 Firebase 접근으로
재현하지 않는다.** **callback 재실행과 commit outcome unknown을 emulator에서 결정적·비파괴적으로
유발할 seam이 없으므로 fake 전용으로 분류하고 emulator 증명이라고 주장하지 않는다.**

#### (D) 경계 (양방향)

> **합성 fake는 Rules 원자성을 증명하지 않는다.**
> **emulator는 앱 오류 분기 전체를 증명하지 않는다.**

### 7.6 STOP 조건 (emulator 전용)

Java·firebase-tools·binary **설치/다운로드** · **신규 의존성** · **타 프로세스 종료·포트 강제 해제** ·
`.firebaserc`·**`firebase.json` 수정** · 실제 프로젝트 id·자격 증명 · **emulator 없이는 기본 게이트가
통과하지 않음** · **§7.5 (A)를 결정적·비파괴적으로 검증할 수 없음**.

---

## 8. Z-7 — tombstone과 병합

- **tombstone과 자동 merge를 도입하지 않는다.** 저장은 **문서 전체 CAS**이며 충돌 시 **전체를 거부**한다.
- **L-4 삭제 부활**은 **별도 후속 스펙**. **원자성은 병합 의미론을 고치지 않는다.**
- 충돌 후 **재읽기·재적용은 운영자의 명시적 행동**이어야 한다.

## 9. Z-8 — 배포 순서

- **이번 스펙에서 어떤 Rules나 앱도 배포하지 않는다.**
- **실제 UID · orphan 보존/비용/정리 정책 · emulator PASS**가 **모두** 확인되기 전 **운영 쓰기를 열지 않는다.**
- **★ legacy `admin/state.json` 저장을 먼저 닫아 운영자가 아무 데도 저장할 수 없는 구간을 만들지 않는다.**
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

- **`firebase.json`은 허용 파일이 아니다.** **루트 배럴 수정 금지.**
  **`packages/firebase/src/admin-read/**` 수정 금지.** **`apps/**` 수정 금지.**
- **계속 금지**: `apps/mockup/**` · `packages/render/**` · `packages/shared/**` · `.firebaserc` ·
  실제 `.env` · legacy HTML · 실제 Firebase/network/live/운영 데이터 · 발행·배포.
- `pnpm-lock.yaml`: **신규 의존성이 없으므로 변경이 없어야 한다.** 필요해지면 **STOP**.

---

## 11. 결정적 합성 검증 계약 (fake — 기본 게이트)

§7.5 (B)의 **F-1 ~ F-10** 전부에 더해:

- **import 시 SDK 초기화·네트워크 0**, 기본 상태에서 **write adapter 생성 0**
- 저장 순서 고정(§6.4): `expectedBase` 검증 → `randomUUID` → upload → `runTransaction`.
  **호출 로그로 순서를 고정**
- **upload 실패 시 `runTransaction` 호출 0회** · **미인증·익명에서 upload·transaction 0회**
- **`loadBaseline`·`save` 각각 단일 in-flight** · **앱 자동 retry 0 · 자동 merge 0**
- **`operationId`를 외부에서 주입할 수 없음**(타입·런타임 양쪽)
- **`readLegacyCatalog` 검증 규칙이 admin-write에 재구현되지 않음**
- **Rules 동등성**: 배포 대상 rules와 emulator 사본이 **UID 라인을 제외하면 동일**

> **★ 위 fake 테스트 전부는 서버 Rules 원자성을 증명하지 않는다**(§7.5 D).

---

## 12. 구현 후 게이트 (순서 고정)

```
pnpm install --frozen-lockfile   (lockfile diff 0)
→ pnpm format:check → pnpm lint → pnpm typecheck → pnpm test:unit
→ 독립 pnpm build → 전체 Chromium E2E → pnpm check
→ git diff --check → 허용/금지 diff 확인
→ 고객 dist SHA-256 전후 비교 (apps/** 무변경이므로 반드시 동일해야 한다)
→ ports 4183/4184 → OS temp staging → 실제 network 0 확인
→ [별도 명령] pnpm test:emulator   ← 기본 게이트에 포함되지 않는다
```

## 13. STOP 조건 (구현하지 않고 보고)

실제 운영자 UID 필요 · **Rules 배포** 필요 · **`firebase.json` 수정** 필요 ·
emulator 설치·다운로드·신규 의존성·포트 강제 해제·프로세스 종료 필요 ·
**§7.5 (A)를 결정적·비파괴적으로 검증 불가** · 실제 Firebase 요청 없이는 게이트 미통과 ·
**`apps/**` 또는 `packages/firebase/src/admin-read/**` 수정** 필요 ·
**"head commit만 재개" API** 필요 · **9번째 `WRITE_*` 코드**나 **두 번째 baseline 코드** 필요 ·
루트 배럴·고객 번들 변경 필요 · tombstone·자동 merge 필요 · orphan 삭제·정리 필요 ·
Rules가 `objectPath`의 실제 객체 존재를 증명해야 계약이 성립한다고 판단됨(→ C5 전제 흔들림, 즉시 보고).

## 14. NOT TESTED / UNCONFIRMED

실제 Firebase 프로젝트 동작 전부(Rules 실제 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · **실제 네트워크 지연·단절에서의 거동**(emulator는 로컬이라
타이밍이 다르다) · 실기기·다중 기기 동시 편집 · **Auth emulator binary 가용성** ·
운영 규모 payload · **orphan 누적의 실제 비용** · **L-4 삭제 부활**(범위 밖) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월).

## 15. 위험 (RISK)

| # | 위험 | 완화 |
| --- | --- | --- |
| **R-1** | **★★ Rules 배포가 운영자의 유일한 저장 경로를 닫는다** | §9: 이번 스펙에서 배포 0 |
| **R-2** | **★ emulator가 실제 프로젝트 id로 뜬다** | §7.2·§7.3: **`demo-` + `--config firebase.emulator.json` 강제**, host 미설정 시 **시작 거부** |
| **R-3** | emulator 사본 Rules가 실제 Rules와 갈라진다 | §7.3: **UID 라인 외 diff 0**을 unit test가 고정 |
| **R-4** | SDK 내부 재시도가 **같은 객체를 두 번 쓴다** | §4.1 `resource == null`이 서버에서 거부 |
| **R-5** | `*_OUTCOME_UNKNOWN`을 성공/실패로 단정하거나 **재전송**한다 | §6.5~6.6: `retryable:false` + **port 내부 bounded reconciliation** + **reload 전 재전송 금지** |
| **R-6** | head는 있는데 객체가 없어 **legacy로 조용히 되돌아간다** | §6.2 **fail-closed, fallback 0** |
| **R-7** | orphan이 누적된다 | G-4: 정리 정책 승인 전 **운영 쓰기 미활성화** |
| **R-8** | `op()`를 건드려 **레거시 발행·자산 업로드가 함께 잠긴다** | §3 **`op()` 무변경** |
| **R-9** | **callback 재실행이 upload를 반복**한다 | §5.5 부작용 전면 금지 + **F-1·F-2** |
| **R-10** | **baseline load가 head를 읽지 못한다** | §4.4 `get` 명시 허용 + **E-4·E-5** |
| **R-11** | head 부재에서 revision 1을 만들어 **이력을 밀어낸다** | §4.3 **`expectedBase === 0`일 때만 create** + **F-9** |
| **R-12** | 호출자가 **수행할 수 없는 복구 절차**를 계약이 요구한다 | §6.6 **port 내부 reconciliation** + **F-4** |
| **R-13** | **fake 전용을 "실제 Rules 검증"으로 오인**한다 | §7.5 **(A)/(B) 분리 + (C)(D)** |
| **R-14** | ★ **읽기 실패를 "upload 오류"로 보고**해 공개 API 의미가 틀어진다 | §5.4 **표면 분리** + **F-6** |
| **R-15** | ★★ **timeout 뒤 base 관측을 "미반영 확정"으로 오판**해, 서버에서 나중에 성공한 commit을 실패로 보고하고 **운영자가 같은 payload를 다시 보내게 만든다** | §6.6 **base 관측 = 미판정(`WRITE_COMMIT_OUTCOME_UNKNOWN`)**, **orphan이라 부르지 않음**, **재전송 금지** + **F-4·F-5** |

---

## 16. 승인 상태와 다음 단계 (문구 통일)

- **Founder G-1~G-5**: 승인됨(`dc5666d`) — **구현 계약 작성 + 합성 fake + 로컬 emulator 검증까지**.
- **이 계약 문서**: **보완 라운드 3 적용**, **Codex 최종 계약 검토 대기**.
- **이번 라운드는 계약 문서 보완만 승인한다.**
- **보완 push 후 상태는 `READY_FOR_CODEX`, `fix_round: 3`.**
- **Codex 최종 계약 검토 전 port/Rules/config/test 구현은 0이다.**
- **실제 제품 UI · live Firebase · Rules 배포 · 운영 쓰기는 계속 금지**다.
- **★ G-5의 합성 fake·로컬 emulator 허용과 결정 문서 §2의 "제품 구현 착수" 금지 사이 경계는
  이번 문서 교정에서 추측하지 않는다. Codex 최종 검토 후 Founder 확인 대상으로 남긴다.**

---

## 17. 종료 (DONE) — Codex `CODEX_PASSED` (2026-08-11)

> §16은 **계약 라운드 3 시점의 기록**이다. 그 뒤 Founder가 구현 착수를 승인(`4f2ab0b`)하고
> 허용 범위 검토(`f8590e4`)로 **A-12·A-13**을 확장했으며, 구현과 보완이 끝나 이 스펙은 **DONE**이다.
> §16을 삭제하지 않고 이 절이 그 다음 단계를 이어 기록한다.

### 종료 커밋

| 커밋 | 내용 |
| --- | --- |
| **`d83aee9`** | C5 비-UI 구현(admin-write port · Rules 목표 상태 · emulator 설정 · 테스트) |
| **`ead06ab`** | **보완 라운드 1** — Codex 지적 3건(payload 사전 검증 · app 소유권 · emulator `demo-` 가드) |
| **`91a7813`** | 보완 기록 문서 |

### Codex 독립 재검증 결과 — **`CODEX_PASSED`**

| 항목 | 결과 |
| --- | --- |
| HEAD=origin | `91a7813`, ahead/behind **0/0** |
| 변경 범위 | 허용 4파일뿐 — `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` · 신규 `sdk-facade.test.ts` |
| `pnpm install --offline --frozen-lockfile` | **PASS**, **lockfile diff 0** |
| format / lint / typecheck / unit / build | **PASS** |
| unit | **1318/1318** |
| Chromium E2E | **134/134** |
| **고객 번들 SHA-256** | **`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`** (기준과 동일) |
| **local `demo-denn-emulator` Rules 게이트** | **10/10 PASS** |
| ports 4183/4184/8080/9099/9199 | 잔류 **0** |
| `git diff --check` | **PASS** |
| 추가 결함 | **없음** |

### 이 스펙이 실제로 닫은 것

**로컬 비-UI 구현·검증까지**다. `@denn/firebase/admin-write` port(불변 객체 생성 + 단일 Firestore
head CAS + 결과 불명 시 bounded reconciliation) · 두 오류 표면 · `storage.rules`/`firestore.rules`의
**목표 상태**(placeholder UID) · emulator 전용 config와 Rules 사본 · opt-in fake/emulator 검증.

### ★ 이 스펙이 닫지 **않은** 것 — NOT TESTED / 계속 금지

- **실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network** — 접근 **0**, **NOT TESTED**.
- **실제 운영자 UID** — 저장소에서 확인 불가. 배포 대상 Rules에는 **UNCONFIRMED placeholder**가
  그대로 남아 있어 **현 상태로는 배포할 수 없다**. **UNCONFIRMED**.
- **Rules · Hosting 배포** — **금지**. ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
  **배포 순서 자체가 STOP 대상**이다(§9). cutover는 **별도 스펙 + 별도 Founder 승인**.
- **운영 쓰기 활성화** — **금지**. 전제는 **실제 UID + orphan 보존/비용/정리 정책 + emulator PASS**
  전부이며 마지막 하나만 충족됐다.
- **`apps/**`와 모든 UI 연결 · 저장 버튼** — 이번 단위 범위 밖, **금지**.
- **`published/state.json` 발행 · legacy `admin/state.json` 공유 쓰기 · orphan 삭제·자동 정리 ·
  tombstone·자동 merge·L-4 해결** — 전부 **금지**이며 각각 별도 스펙 대상이다.
- **실제 네트워크 지연·단절 · 실기기 · 다중 기기 동시 편집 · 운영 규모 payload ·
  orphan 누적 실제 비용** — **NOT TESTED**.
- `pnpm-workspace.yaml`의 `allowBuilds` — 이월, **미해결**.

### 증명 경계 (유지)

> **합성 fake는 서버 Rules의 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
> transaction callback 재실행과 commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
> **emulator 증명이라고 주장하지 않는다**(§7.5 C·D). **emulator는 실제 Firebase가 아니다.**
