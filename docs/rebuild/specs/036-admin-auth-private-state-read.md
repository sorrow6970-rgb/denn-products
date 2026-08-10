# 스펙 036 — 운영자 Auth + 비공개 `admin/state.json` 읽기 전용

상태: **DONE (Claude)** — 구현 `fd92fbc` + 라운드 1 보완 **`b7ee207`(제품, Codex 독립 검증 통과)**.
라운드 2·3은 **문서 전용**(해시 기록 정정 `91acec0`, 문서 위생). **`b7ee207` 이후 제품 코드 변경 0.**
현재 단계 = **종료 문서 확인**.

작성 2026-08-10 · 기준 HEAD = origin = `6daf365`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-10-admin-auth-write-boundary-decisions.md`
(Founder F-A~F-E, 2026-08-10 승인)
근거 조사: `reviews/2026-08-10-admin-auth-write-founder-decision-options.md`,
`reviews/2026-07-31-admin-write-boundary-investigation.md`

> **개정 이력** — 2026-08-10 계약 정확성 보완(초판 `77b5b47`, 제품 코드 변경 0):
> ① SDK 고정 버전을 **`12.16.0` → `12.17.1`**(2026-08-04 최신 공식 릴리스)로 바꾸고
> **버전 존재를 VERIFIED로 기록**했다(§2). 설치·빌드 호환성만 UNCONFIRMED로 남는다.
> ② 활성화 판정을 **플래그 정확 비교 + 공개 config 5개 전부 비어 있지 않은 문자열**로 고정하고,
> **`packages/firebase`는 `import.meta.env`를 읽지 않고 주입만 받는다**를 명시했다(§3.1).
> ③ 공개 타입을 **유효한 TypeScript로 완전 정의**했다 — `Promise<Result>`처럼 타입 인자가 빠진
> 표현을 제거하고 `OperatorAuthErrorCode`·`AdminReadErrorCode`·`SafeAdminReadError`·
> `OperatorAuthActionResult`·`AdminStateLoadResult`와 **`correlationId` 주입 책임**을 확정했다(§4.1~4.2).
> ④ **안전 오류 15개 매핑 표**(category/retryable/발생 조건/SDK code)를 추가하고
> `NETWORK_TIMEOUT`이 **SDK code가 아니라 앱 wrapper 상태**임을 구분했다(§5.3~5.4).
> ⑤ **20 MiB는 서버 read 보장이 아니라 클라이언트 안전 상한**임을 `storage.rules:14`·`:22`·`:26`
> 근거와 함께 정정했다(§5.1).
>
> **2차 보완(같은 날, 초판 `9fb1456`)** — 타입·비동기 경계:
> ⑥ `OperatorAuthState`의 `error` 코드를 **`OperatorAuthErrorCode`로 축소**해 catalog/storage 전용
> 코드가 인증 observer 상태에 **타입상 들어올 수 없게** 했다(§4.1).
> ⑦ **observer를 인증 상태의 유일한 권위로 고정** — `OperatorAuthActionValue`에서 `state`를 제거하고
> action Promise는 **"SDK action 완료"만** 뜻하도록 했다(§4.3 + §8 테스트 3건).
> ⑧ **`ADMIN_STATE_READ_TIMEOUT_MS = 30_000` 확정**, wrapper는 **`getBytes` 읽기에만** 적용하고
> **Auth action·observer에는 적용하지 않는다**(늦은 성공이 실제 세션을 바꿔 반환값과 갈라지기 때문).
> **실제 SDK 취소는 주장하지 않고**, 늦은 결과 폐기만 보장한다(§5.4).
> ⑨ **비노출 검증 경계 정정** — 성공 값에는 검증된 문서가 들어가므로 **합법적 카탈로그 `data:` URL을
> 제거하라고 요구하지 않는다**. 대신 raw error·실패 원문·UI/로그 쪽을 각각 분리해 고정했다(§8.1).

---

## 0. 목표 (WHY)

리빌드 admin이 **처음으로 운영자로 로그인하고, 비공개 객체 `admin/state.json`을 읽어**
기존 카탈로그 계약(`readLegacyCatalog`)으로 검증한다. **여기까지가 전부다** — 저장·발행·업로드는
Founder 결정 F-B·F-E로 **차단**되어 있다(F-E = E3-strong: 원자적 precondition·잠금 가능성이
조사·검증되기 전까지 쓰기 구현 금지).

이 단위의 가치는 기능이 아니라 **경계**다: 인증 실패가 조용히 성공처럼 보이지 않고,
비공개 데이터가 화면·로그·번들 어디로도 새지 않으며, **고객 앱은 이 변경을 전혀 모른다**.

## 1. 범위 (SCOPE)

**포함**

- 운영자 **Email/Password** 인증
- **비익명** 운영자 세션의 관찰(observer)과 복원
- 인증된 세션에서 **고정 객체 `admin/state.json`** 읽기
- 읽은 JSON을 **`readLegacyCatalog`로 검증**
- 성공 결과는 **메모리에만** 유지

**제외 (하지 않을 것)**

- **저장·쓰기·발행·업로드** 일체 (F-B·F-E)
- **revision · 충돌 병합 · tombstone · 마이그레이션** (F-E·F-D)
- legacy `wcm`/`hcm` 되쓰기·삭제 (F-D)
- 회원가입·비밀번호 재설정·신규 계정·다중 계정·역할 UI (F-A)
- `storage.rules`·`firestore.rules`·`firebase.json`·Hosting·deploy 변경 (F-A 미승인)
- 실제 Firebase/network/live/emulator/운영 데이터 접근
- 기존 `PrintSizeCmDraft`(스펙 035)와 원격 문서의 **연결**

## 2. SDK와 패키지 경계 (WHERE)

| 항목 | 계약 |
| --- | --- |
| SDK 버전 | **`firebase@12.17.1` 정확 고정** (범위 지정자 금지) |
| 추가 시점 | **구현 단계에서만** `packages/firebase/package.json` + `pnpm-lock.yaml`에 추가 |
| admin 앱 의존성 | `apps/admin/package.json`에 `@denn/firebase`를 **workspace 의존성**으로 추가 |
| 공개 경로 | admin 기능은 **새 서브패스 `@denn/firebase/admin-read`로만** 공개 |
| 루트 배럴 | **`packages/firebase/src/index.ts`는 수정 금지** — admin Auth/read API를 **export하지 않는다** |
| 고객 앱 | `apps/mockup`의 기존 `@denn/firebase` 루트 import는 그대로 두고, **고객 번들에 Firebase SDK가 들어가지 않아야 한다** |
| 금지 | `packages/shared`·`packages/render` **수정 0** |

**근거**: `packages/firebase/package.json:6`은 현재 `"exports": { ".": … }` 하나뿐이다.
서브패스는 여기에 `"./admin-read"` 항목을 **추가**하는 방식으로 만든다.
루트 배럴(`packages/firebase/src/index.ts:2`)은 **"NO Firebase SDK, NO Auth/…write"** 를 선언하고
있고 고객 앱이 그 배럴을 import하므로, **admin 코드가 루트에 노출되는 순간 고객 번들이 오염된다.**
이 스펙의 번들 격리는 **선언이 아니라 E2E로 검증**한다(§8).

**버전 근거 (2026-08-10 보완)**

- **VERIFIED — 버전 존재**: `firebase@12.17.1`은 **2026-08-04 릴리스된 최신 공식 버전**이다.
  출처: <https://firebase.google.com/support/release-notes/js> ·
  <https://firebase.google.com/docs/web/setup>
  (초판이 적었던 `12.16.0`도 실재하지만 최신이 아니므로 **`12.17.1`로 고정을 변경**했다.
  초판의 "버전 존재 여부 UNCONFIRMED" 표기는 **제거**한다.)
- ⚠️ **여전히 UNCONFIRMED — 설치·빌드 호환성**: `12.17.1`이 **Node 24 / Vite 8 / TypeScript 7**과
  현재 **pnpm workspace**에서 실제로 설치·빌드되는지는 **확인하지 않았다.** 확인 시점은
  **구현 단계의 `pnpm install --frozen-lockfile`** 이며, peer/engine 충돌이나 타입 오류가 나면
  **STOP**(§10)이다. **이 계약 라운드에서는 실제 설치도 lockfile 갱신도 하지 않는다.**

## 3. 앱 구성과 실제 네트워크 차단

- **`apps/admin`이 Firebase 구성과 기능 활성화 여부를 소유한다.**
  **`packages/firebase`는 `import.meta.env`를 직접 읽지 않는다** — `apps/admin`이 만든
  **typed config 객체만 주입**받는다(주입되지 않으면 adapter 자체가 생성되지 않는다).
- **기본값은 비활성이다.**

### 3.1 활성화 판정 (정확한 규칙)

**활성화 플래그는 정확히 `VITE_DENN_ADMIN_FIREBASE_ENABLED === "true"` 일 때만 인정한다.**
`"1"`·`"TRUE"`·`"yes"`·빈 문자열·미정의는 전부 **비활성**이다(문자열 정확 비교, 강제 변환 금지).

그리고 다음 **5개 공개 config를 모두 "비어 있지 않은 문자열"로 확보한 경우에만** adapter를 생성한다:

| 환경 변수 | 필수 |
| --- | --- |
| `VITE_DENN_ADMIN_FIREBASE_API_KEY` | ✔ |
| `VITE_DENN_ADMIN_FIREBASE_AUTH_DOMAIN` | ✔ |
| `VITE_DENN_ADMIN_FIREBASE_PROJECT_ID` | ✔ |
| `VITE_DENN_ADMIN_FIREBASE_STORAGE_BUCKET` | ✔ |
| `VITE_DENN_ADMIN_FIREBASE_APP_ID` | ✔ |

```ts
// apps/admin 소유. packages/firebase는 이 객체만 받는다.
export interface AdminFirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly appId: string;
}
```

- **플래그가 `"true"`가 아니거나, 위 5개 중 하나라도 누락·빈 문자열(`trim()` 후 길이 0)이면
  `UNCONFIGURED`** 이며 **`initializeApp` · Auth observer 등록 · Storage 요청이 모두 0회**다.
  **부분 config로 초기화를 시도하지 않는다 — fail-closed.**
- `UNCONFIGURED`는 **오류가 아니라 명시 상태**다(§6 문구 고정).
- **실제 config 값을 저장소에 새로 하드코딩하지 않는다. `.env` 파일을 commit하지 않는다.**
- **기본 unit/build/E2E에서 실제 Firebase endpoint 요청은 0건**이어야 한다.
- **live 검증은 별도 Founder 승인 전에는 작성하지도 실행하지도 않는다**
  (`*.live.test.ts`는 `vitest.config.ts:17`로 기본 게이트에서 제외되지만, **파일 자체를 만들지 않는다**).

`apps/admin/src/env.d.ts`는 현재 CSS 앰비언트 선언뿐이므로, 위 6개 키를
**전부 `string | undefined`** 로 선언하는 `ImportMetaEnv`를 **추가**한다(있다고 단정하지 않는다).

## 4. AuthPort 계약

**공개 포트는 Firebase `User` 객체·token·credential·raw SDK error를 외부로 노출하지 않는다.**

### 4.1 공개 타입 (유효한 TypeScript — 필수 타입 인자 생략 금지)

`packages/shared/src/index.ts:19`의 계약을 **그대로** 사용한다:
`export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };`
**`E`를 생략하지 않는다**(기본값 `string`으로 흘러가면 안전 오류 계약이 무너진다).

```ts
import type { CatalogDocumentV1, CatalogIssue, CatalogReadReport, Result } from "@denn/shared";

/** 인증 단계에서만 발생하는 코드. AdminReadErrorCode의 부분집합이다. */
export type OperatorAuthErrorCode =
  | "INVALID_REQUEST"
  | "AUTH_PERSISTENCE_FAILED"
  | "INVALID_CREDENTIAL"
  | "AUTH_RATE_LIMITED"
  | "NETWORK_UNAVAILABLE"
  | "NETWORK_TIMEOUT"
  | "ANONYMOUS_NOT_ALLOWED"
  | "UNEXPECTED_ADMIN_READ_ERROR";

/** 이 스펙이 노출하는 코드 전체 = 15개(§5). 이 밖의 코드는 존재하지 않는다. */
export type AdminReadErrorCode =
  | OperatorAuthErrorCode
  | "AUTH_NOT_READY"
  | "AUTH_REQUIRED"
  | "ADMIN_STATE_NOT_FOUND"
  | "ADMIN_STATE_FORBIDDEN"
  | "RESPONSE_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_CATALOG";

export type AdminReadErrorCategory = "VALIDATION" | "AUTH" | "NETWORK" | "UNKNOWN";

/**
 * 유일한 오류 표면. Firebase User·credential·token·raw SDK error·email·uid·원문은 들어가지 않는다.
 * `issues`는 spec 012의 `{code, path}`만 담는 INVALID_CATALOG 전용 필드다.
 */
export interface SafeAdminReadError {
  readonly category: AdminReadErrorCategory;
  readonly code: AdminReadErrorCode;
  readonly retryable: boolean;
  readonly correlationId: string;
  readonly issues?: readonly CatalogIssue[];
}

/**
 * observer가 관찰한 인증 상태. `error`의 코드는 **인증 단계 코드로 제한**된다 —
 * catalog/storage 전용 코드(`INVALID_CATALOG`·`ADMIN_STATE_*` 등)는 **타입상 들어올 수 없다**.
 */
export type OperatorAuthState =
  | { readonly status: "initializing" }
  | { readonly status: "signed-out" }
  | { readonly status: "authenticated" }          // 비익명 세션만
  | { readonly status: "error"; readonly code: OperatorAuthErrorCode };

/**
 * sign-in / sign-out 성공은 **SDK action이 끝났다는 사실만** 알린다.
 * 상태는 담지 않는다 — 인증 상태의 권위는 observer 하나뿐이다(§4.3).
 */
export interface OperatorAuthActionValue {
  readonly correlationId: string;
}
export type OperatorAuthActionResult = Result<OperatorAuthActionValue, SafeAdminReadError>;

/** load 성공 value. 검증된 문서와 spec 012 report만 담는다(원문 JSON·bytes 없음). */
export interface AdminStateLoadValue {
  readonly document: CatalogDocumentV1;
  readonly report: CatalogReadReport;
  readonly byteLength: number;      // 안전한 숫자 메타(내용 아님)
  readonly correlationId: string;
}
export type AdminStateLoadResult = Result<AdminStateLoadValue, SafeAdminReadError>;

export interface OperatorAuthPort {
  subscribe(listener: (state: OperatorAuthState) => void): () => void; // returns unsubscribe
  currentOperator(): OperatorAuthState;
  signInWithEmailPassword(
    email: string,
    password: string,
    request: { readonly correlationId: string },
  ): Promise<OperatorAuthActionResult>;
  signOut(request: { readonly correlationId: string }): Promise<OperatorAuthActionResult>;
}
```

### 4.2 `correlationId` 책임 (고정)

- **호출자(=`apps/admin`)가 생성해 주입한다.** `packages/firebase`는 만들지 않는다 —
  UI가 "이 클릭에 대한 응답"을 식별해야 하고(늦은 결과 무시, §5), port가 몰래 만들면 그 연결이 끊긴다.
- **`signInWithEmailPassword` · `signOut` · `load` 세 시그니처 모두에 명시**한다(위 타입 참조).
- **형식**: 소문자 16진 8~64자(`/^[0-9a-f]{8,64}$/`). **개인정보·email·uid·타임스탬프 원문 금지.**
  생성은 `crypto.randomUUID()`의 하이픈 제거 등 **비식별 난수**만 사용한다.
- 형식 위반은 **`INVALID_REQUEST`** 이며 이때 **SDK 호출 0회**다.
- `correlationId`는 **성공/실패 양쪽 payload에 그대로 되돌려 준다**(위 타입).

**Firebase `User`·credential·token·raw SDK error는 위 공개 타입 어디에도 포함되지 않는다.**

### 4.3 ★ observer가 인증 상태의 **유일한 권위**다

`signInWithEmailPassword` / `signOut`의 **Promise 성공은 "SDK action이 완료됐다"는 뜻일 뿐이며,
`authenticated` / `signed-out` 확정은 `onAuthStateChanged` observer만 담당한다.**

- **action Promise 완료 순서와 observer 통지 순서를 가정하지 않는다.** 둘 중 무엇이 먼저 와도 된다.
- **UI는 action 결과로 인증 상태를 덮어쓰지 않는다.** 화면의 인증 상태는 **오직 `subscribe`가
  전달한 값**에서 온다. action 결과는 **버튼의 진행 표시(`signing-in`)를 끝내는 데만** 쓴다.
- `OperatorAuthActionValue`에 **`state` 필드가 없는 것이 이 규율의 타입 수준 강제**다 —
  덮어쓸 값 자체를 주지 않는다.

**왜 중요한가**: 두 개의 권위가 생기면 "로그인 성공했다는데 화면은 로그아웃"·"로그아웃했는데
authenticated로 남음" 같은 상태 분기가 재현하기 어려운 형태로 생긴다. 레거시가
`_ready` 플래그와 observer를 함께 쓰며 겪은 문제와 같은 계열이다(`denn-admin.html:14810-14828`).

**합성 테스트로 고정할 것**(§8):

1. **sign-in Promise가 observer보다 먼저 완료돼도 `authenticated`로 조기 전환하지 않는다.**
2. **observer가 먼저 통지돼도 나중에 끝난 action 완료가 그 상태를 되돌리지 않는다.**
3. **sign-out도 같은 단일 권위 규율**을 따른다(Promise 성공만으로 `signed-out` 표시 금지).

필수 동작·규율:

1. **초기 세션 판정은 `onAuthStateChanged`로 완료한다.** `currentUser`만 읽어 초기화 완료를
   **추정하지 않는다**(레거시 `denn-admin.html:14821-14828`이 observer로 복원하는 것과 같은 방향).
2. `user === null` → **`signed-out`**.
3. **`isAnonymous === true`이면 `authenticated`로 인정하지 않는다** →
   `ANONYMOUS_NOT_ALLOWED`. (`storage.rules:18-22`의 `op()`와 같은 판정을 클라이언트에서도
   먼저 건다 — 서버 거부를 기다리지 않는다.)
4. **회원가입·비밀번호 재설정·신규 계정 생성·다중 계정 UI를 제공하지 않는다**(F-A 미승인).
5. **기존 계정 이메일을 코드나 기본 입력값으로 하드코딩하지 않는다.**
6. **한계 명시**: "계정 1개"는 **운영 정책**이며, 현재 `storage.rules`는 특정 UID/email
   allowlist를 **강제하지 않는다**(`:18-22`는 "비익명이면 통과"). 서버에서 강제하려면 **Rules 변경**이
   필요하고 그것은 **미승인**이다 → 이 사실을 스펙과 코드 주석에 남긴다.
7. **password는 앱 저장소·localStorage·IndexedDB·URL·로그에 남기지 않는다.**
8. **로그인 시도 종료(성공/실패 무관) 또는 unmount 시 password state를 비운다.**
9. **`browserLocalPersistence` 설정 실패를 조용히 무시하지 않는다** →
   `AUTH_PERSISTENCE_FAILED`로 **fail-closed**(로그인 진행 중단).
10. 인증 오류는 **안전한 category/code만** 반환한다. **raw message·email·uid·token 미포함.**

> **계승 금지**: 레거시 `dennCloudSaveAdminV`의 **미인증 조용한 return**(`denn-admin.html:733`·`:735`).
> **계승 후보**: `ensureAdminAuth`의 **throw 규율**(`:14810-14817`).

## 5. AdminStateReadPort 계약

고정 상수:

```ts
export const ADMIN_STATE_OBJECT_PATH = "admin/state.json";
/** 20 × 1024 × 1024 − 1 = 20,971,519 bytes. 클라이언트 측 안전 상한이다(아래 5.1). */
export const ADMIN_STATE_MAX_BYTES = 20 * 1024 * 1024 - 1;

export interface AdminStateReadPort {
  load(request: { readonly correlationId: string }): Promise<AdminStateLoadResult>;
}
```

- **호출자가 path·bucket·URL을 주입할 수 없다.** 경로는 상수이며 **인자가 아니다**
  (`load`의 유일한 인자는 `{ correlationId }`다).
- **`getBytes(ref, maxDownloadSizeBytes)`** 를 사용한다(`getDownloadURL` 금지 — 아래 규율).

### 5.1 ★ 20 MiB의 정확한 의미 (초판 설명 정정)

`ADMIN_STATE_MAX_BYTES = 20 × 1024 × 1024 − 1 = **20,971,519 bytes**`.

**이것은 서버가 보장하는 read 상한이 아니다.**

- `storage.rules:22`의 `okSize()`는 `request.resource.size`를 보는데, 이 값은 **업로드(write) 때만**
  존재한다. `admin/` 규칙은 `allow read: if op();`(`:26`)로 **크기 조건이 없다.**
- 규칙 파일 스스로 그 이유를 적어 두었다 — `storage.rules:14`:
  **"⚠️ read 조건에 `request.resource.size` 금지(read시 `resource=null` → 항상 거부)."**

따라서 이 상수는 **`storage.rules`의 write-side `okSize()` 정책과 숫자를 맞춘
클라이언트 `getBytes` 안전 상한**이며, **"서버가 이 크기 이상은 안 준다"는 보장으로 표현하지 않는다.**
초과 시 SDK가 `storage/download-size-exceeded`로 실패하고 **`RESPONSE_TOO_LARGE`** 로 매핑된다(§5.3).

### 5.2 `load` 순서와 규율

`load({ correlationId })` **순서(고정)**:

1. `correlationId` 검증 → 실패 시 `INVALID_REQUEST`
2. **Auth 초기화 완료 확인** → 미완이면 `AUTH_NOT_READY`
3. **비익명 authenticated 확인** → `signed-out`이면 `AUTH_REQUIRED`, 익명이면 `ANONYMOUS_NOT_ALLOWED`
4. 고정 `admin/state.json` reference 생성
5. `getBytes(ref, ADMIN_STATE_MAX_BYTES)`
6. UTF-8 decode (**invalid UTF-8은 fail-closed**)
7. `JSON.parse` → 실패 시 `INVALID_JSON`
8. **`readLegacyCatalog`** → `ok === false`면 `INVALID_CATALOG`(issue는 `{code, path}`만)
9. 성공 결과 반환 (**메모리 전용**)

규율:

- `signed-out` · `initializing` · `anonymous`에서 **Storage 호출 0회**
- **write / upload / delete / `getDownloadURL` / `published` 경로 호출 0회** — API 표면 자체가 없다
- **자동 retry 0** (수동 재시도는 UI 버튼으로만)
- **실패 시 이전 성공 데이터를 새 데이터처럼 유지하지 않는다**(stale을 fresh로 위장 금지)
- **중복 `load`는 단일 in-flight로 제한한다** — 이미 진행 중이면 **새 요청을 만들지 않고 진행 중인
  것을 재사용**한다. UI 버튼 비활성화는 **보조 수단이며 계약의 근거가 아니다**
  (`public-catalog/reader.ts:1-3`의 in-flight dedup 선례와 같은 방식).
- **늦게 완료된 이전 요청이 최신 상태를 덮어쓰지 못한다**(요청 세대 카운터로 무시)
- **unmount 후 React state 갱신 0**
- 오류에 **원문 JSON·base64·객체 URL·token·email·uid·SDK raw message 미포함**

### 5.3 안전 오류 매핑 표 (확정)

`public-catalog/types.ts:19-33`의 선례와 같은 형태(`category`/`code`/`retryable`/`correlationId`
+ 최소 안전 메타). **아래 15개가 전부**이며, **`retryable`은 "사용자가 다시 눌러 볼 가치가 있는가"**
를 뜻한다 — **자동 retry는 어느 코드에서도 0이다.**

| category | code | retryable | 발생 조건 | 대응 Firebase SDK code / 로컬 검증 단계 |
| --- | --- | --- | --- | --- |
| VALIDATION | `INVALID_REQUEST` | ✗ | `correlationId` 형식 위반 | **로컬** §4.2 검증(SDK 호출 전) |
| AUTH | `AUTH_NOT_READY` | ✓ | observer 초기 판정 미완 상태에서 `load` | **로컬** load 순서 2 |
| AUTH | `AUTH_REQUIRED` | ✗ | `signed-out` 상태에서 `load` | **로컬** load 순서 3 |
| AUTH | `ANONYMOUS_NOT_ALLOWED` | ✗ | 세션이 `isAnonymous === true` | **로컬** load 순서 3 / observer 판정 |
| AUTH | `AUTH_PERSISTENCE_FAILED` | ✓ | `setPersistence(browserLocalPersistence)` 실패 | `setPersistence` rejection **전부**(코드 무관, fail-closed) |
| AUTH | `INVALID_CREDENTIAL` | ✗ | 로그인 자격 증명 거부 | `auth/invalid-credential` · `auth/wrong-password` · `auth/user-not-found` · `auth/invalid-email` · `auth/user-disabled` **→ 하나로 합침** |
| AUTH | `AUTH_RATE_LIMITED` | ✓ | 시도 과다로 일시 차단 | `auth/too-many-requests` |
| NETWORK | `NETWORK_UNAVAILABLE` | ✓ | 네트워크 도달 실패 | `auth/network-request-failed` · `storage/retry-limit-exceeded` |
| NETWORK | `NETWORK_TIMEOUT` | ✓ | **앱 wrapper 타임아웃 초과** (§5.4) | **로컬** wrapper — **SDK code가 아니다** |
| VALIDATION | `ADMIN_STATE_NOT_FOUND` | ✗ | `admin/state.json` 부재 | `storage/object-not-found` |
| AUTH | `ADMIN_STATE_FORBIDDEN` | ✗ | Rules가 read 거부 | `storage/unauthorized` |
| VALIDATION | `RESPONSE_TOO_LARGE` | ✗ | 객체가 `ADMIN_STATE_MAX_BYTES` 초과 | `storage/download-size-exceeded` |
| VALIDATION | `INVALID_JSON` | ✗ | UTF-8 decode 실패 또는 `JSON.parse` 실패 | **로컬** load 순서 6·7 |
| VALIDATION | `INVALID_CATALOG` | ✗ | `readLegacyCatalog`가 `ok:false` | **로컬** load 순서 8 (`issues`는 `{code,path}`만) |
| UNKNOWN | `UNEXPECTED_ADMIN_READ_ERROR` | ✗ | 위 어디에도 매핑되지 않음 | **미등록 SDK code 전부를 여기로 접는다** |

**★ `INVALID_CREDENTIAL` 통합 이유**: `auth/user-not-found`와 `auth/wrong-password`를 구분해 보여주면
**계정 존재 여부를 추론**할 수 있다(`decisions/2026-07-21-security-and-privacy.md` §1 —
"로그인 오류에 계정 존재 여부를 과도하게 노출하지 않는다"). 따라서 **하나로 합친다.**

**raw SDK `code`/`message`는 반환값·UI·로그 어디에도 노출하지 않는다.** 매핑은 내부에서만 일어나고,
밖으로 나가는 것은 위 표의 15개 코드뿐이다.

### 5.4 `NETWORK_TIMEOUT`의 근거 (구분 고정)

Firebase SDK는 **"timeout"이라는 안정된 공개 error code를 보장하지 않는다** — Auth는
`auth/network-request-failed`로, Storage는 재시도 후 `storage/retry-limit-exceeded`로 나타난다.
따라서 **`NETWORK_TIMEOUT`은 SDK code 매핑이 아니라 앱 wrapper가 스스로 만든 상태**다.

**상수(확정)**

```ts
export const ADMIN_STATE_READ_TIMEOUT_MS = 30_000;
```

**적용 범위(확정)** — timeout wrapper는 **`AdminStateReadPort`의 `getBytes` 읽기에만** 적용한다.

| 대상 | wrapper |
| --- | --- |
| `getBytes`(admin state 읽기) | **적용** — 30,000 ms 초과 시 `NETWORK_TIMEOUT` |
| `signInWithEmailPassword` | **적용하지 않는다** |
| `signOut` | **적용하지 않는다** |
| `onAuthStateChanged` | **적용하지 않는다** |

**★ Auth action에 로컬 timeout을 걸지 않는 이유**: Auth action은 **부수효과가 있다**.
timeout으로 실패를 반환한 뒤 SDK가 **늦게 성공하면 실제 세션이 바뀐다** —
반환값("실패")과 실제 상태("로그인됨")가 **갈라진다**. 읽기와 달리 되돌릴 수도 없다.
그래서 Auth action은 SDK가 스스로 끝낼 때까지 기다리고, 상태는 **observer가 알려준다**(§4.3).

**`getBytes` timeout 규율**

- **읽기 전용이라 부수효과가 없다.** 30,000 ms를 넘기면 **대기를 중단하고 `NETWORK_TIMEOUT`을
  반환**하며, underlying Promise가 **늦게 끝나더라도 그 결과를 폐기**한다.
- ⚠️ **실제 SDK 요청 취소를 지원한다고 주장하지 않는다.** wrapper는 **대기를 포기할 뿐**이고,
  네트워크 요청은 계속 진행될 수 있다. 계약이 보장하는 것은 **늦은 결과가 반영되지 않는다**는 것뿐이다.
- 늦은 완료는 **generation / `correlationId`로 무시**하며 **UI·메모리 상태를 갱신하지 않는다**.
- **자동 retry는 0이다**(timeout 후에도 재시도하지 않는다. 재시도는 사용자의 버튼 클릭뿐).
- SDK가 먼저 `auth/network-request-failed`·`storage/retry-limit-exceeded`로 실패하면
  그것은 **`NETWORK_UNAVAILABLE`** 이다. 두 코드는 이렇게 **출처로 구분**된다.

**fake timer 테스트로 고정**(§8): **29,999 ms에서는 아직 미완료** · **30,000 ms에서 `NETWORK_TIMEOUT`** ·
**timeout 이후 도착한 늦은 성공은 무시**(결과·상태 갱신 0).

## 6. admin UI 계약

**새 admin 전용 카드 하나**에서만 제공한다.

상태: `unconfigured` · `initializing` · `signed-out` · `signing-in` · `authenticated` ·
`loading` · `ready` · `error`

- **비활성 기본 상태**: `운영자 원격 읽기가 아직 활성화되지 않았습니다.`
- `signed-out`: **이메일/비밀번호 로그인만** 제공(가입·재설정 링크 0)
- `authenticated`: 사용자가 **명시적으로 `운영자 상태 불러오기`를 눌렀을 때만** read
- **자동 read · 자동 retry · 백그라운드 polling 0**
- 성공: **`운영자 상태를 불러왔습니다.`만** 표시
- **raw catalog·이미지/base64·경로·token·uid·email·Firebase 오류 원문을 화면과 로그에 표시하지 않는다**
- **저장·발행·업로드·주문 버튼 0**
- **스펙 035 `PrintSizeCmDraft`와 원격 문서를 이번 스펙에서 연결하지 않는다**
- 접근성: 결과 영역은 **`role="status"` + `aria-live="polite"`**, 입력은 **가시 `<label>` 연결**
  (`@denn/ui` `TextField`가 이미 label/`aria-describedby`를 제공한다). password 입력은 `type="password"`,
  `autoComplete="current-password"`. 상호작용 요소 **44×44** 유지(스펙 011 규율).

## 7. 허용 파일 (구현 단계에서만)

```
packages/firebase/package.json
packages/firebase/src/admin-read/**
apps/admin/package.json
apps/admin/src/admin-read/**
apps/admin/src/App.tsx
apps/admin/src/main.tsx
apps/admin/src/env.d.ts
tests/e2e/admin-auth-read.spec.ts
pnpm-lock.yaml
스펙 036 관련 handoff / CURRENT / live / STATE / NEXT 문서
```

- **`packages/firebase/src/index.ts` 수정 금지.**
- **`apps/admin/vite.config.ts`와 CSS는 필요 근거가 없으므로 기본 금지.**
  불가피하면 **구현 전 STOP**하고 범위 확대 승인을 요청한다.

**계속 금지**: `apps/mockup/**` · `packages/render/**` · `packages/shared/**` ·
`storage.rules` · `firestore.rules` · `firebase.json` · 실제 `.env` 파일 · legacy HTML ·
실제 Firebase/network/live/emulator/운영 데이터 · 쓰기·발행·배포 코드.

## 8. 결정적 합성 검증 계약

**`packages/firebase`** (SDK facade를 **합성 fake로 주입** — 실제 SDK를 부르지 않는다)

- **import 시 SDK 초기화·네트워크 0**
- `onAuthStateChanged` **구독/해제** 동작
- `signed-out` / `anonymous`에서 **`getBytes` 0회**
- `authenticated`에서 **고정 `admin/state.json`에 `getBytes` 정확히 1회**
- **임의 path 주입 불가**(경로 인자가 존재하지 않음을 타입·런타임 양쪽에서 고정)
- **최대 크기 인자 전달 확인**
- auth / storage 오류 → **안전 코드 매핑**(15개 밖으로 새지 않음)
- **invalid UTF-8 / JSON / catalog → fail-closed**
- **write/upload/delete/published API 표면 0**(모듈 export에 존재하지 않음)
- **observer 단일 권위**(§4.3): ① sign-in Promise가 observer보다 먼저 끝나도 `authenticated`로
  **조기 전환하지 않음** ② observer가 먼저 통지돼도 **늦게 끝난 action이 상태를 되돌리지 않음**
  ③ **sign-out도 동일**
- **fake timer로 `getBytes` timeout 고정**(§5.4): **29,999 ms 미완료** · **30,000 ms에서
  `NETWORK_TIMEOUT`** · **timeout 이후 늦은 성공은 폐기**(결과·상태 갱신 0, 자동 retry 0)

### 8.1 ★ 비노출 검증의 정확한 경계 (초판 문구 정정)

초판의 "raw secret fixture가 **결과**에 0건"은 과했다. **성공 결과는 검증된 `CatalogDocumentV1`과
`CatalogReadReport`를 그대로 반환**하므로, **정상 카탈로그에 합법적으로 들어 있는 `data:` URL이나
base64가 성공 값에 존재할 수 있다.** 따라서 검증을 다음처럼 **분리**한다.

| # | 검증 대상 | 요구 |
| --- | --- | --- |
| 1 | **SDK raw error**에 심은 가짜 token·email·uid·raw message | `SafeAdminReadError`와 **`JSON.stringify(error)` 결과에 0건** |
| 2 | invalid **UTF-8 / JSON / catalog** 실패 | **원문 bytes·원문 JSON·base64가 error에 0건** (`issues`는 `{code,path}`만) |
| 3 | **UI와 console/log** | **성공·실패 모두** raw catalog·base64·경로·token·email·uid **0건** |
| 4 | 성공 `AdminStateLoadValue` | 검증된 `CatalogDocumentV1`/`Report`가 **존재할 수 있다** — **합법적인 카탈로그 `data:` URL까지 제거하라고 요구하지 않는다** |
| 5 | 성공 값의 구성 | **원문 bytes와 원문 JSON 문자열을 별도로 보존하지 않는다**(`byteLength` 같은 안전 숫자 메타만) |

**성공 값의 취급**: **메모리 전용**이며 **스펙 035 UI·localStorage·IndexedDB·주문·upload·publish와
연결하지 않는다**(§1 제외 항목, F-B·F-D).

**`apps/admin`** (정적 마크업 + 순수 로직)

- **기본 `unconfigured`에서 Firebase adapter 생성·네트워크 0**
- 로그인 상태 전이(`initializing → signed-out → signing-in → authenticated`) —
  **전이의 출처는 observer뿐**(§4.3)
- **password 정리**(시도 종료·unmount)
- **StrictMode subscribe/unsubscribe 균형**
- **중복 클릭 방지**(단일 in-flight)
- **늦은 결과 무시**와 **unmount 후 상태 변경 0**
- 성공/실패 **접근성 문구**
- **저장·발행 affordance 0**
- **화면·console에 raw catalog·base64·경로·token·email·uid 0건**(위 표 3)

**E2E** (`tests/e2e/admin-auth-read.spec.ts`)

- **기본 빌드에서 Firebase / Auth / Storage 요청 0건**
- 기존 admin·customer E2E **무회귀**
- **고객 mockup JS 번들에 `firebase/auth`·`firebase/storage` 및 admin-read 문구 0건**
- **고객 `dist` SHA-256이 기준 빌드와 동일**
- **실제 로그인과 실제 `admin/state.json`은 NOT TESTED**

## 9. 구현 후 게이트 (순서 고정)

`pnpm install --frozen-lockfile` → `pnpm format:check` → `pnpm lint` → `pnpm typecheck` →
`pnpm test:unit` → 독립 `pnpm build` → 전체 Chromium E2E → `pnpm check` → `git diff --check` →
허용/금지 diff 확인 → **고객 dist SHA-256 전후 비교** → ports 4183/4184 → OS temp staging →
**실제 network 0 확인**

> ⚠️ `pnpm install --frozen-lockfile`은 **`firebase@12.17.1`을 lockfile에 반영한 뒤**에만 통과한다.
> 의존성 추가 커밋과 lockfile 갱신은 **구현 단계의 첫 작업**이며, 이 계약 문서 단계에서는 하지 않는다.

## 10. STOP 조건 (구현하지 않고 보고)

- 기존 운영자 **계정** 또는 **실제 Rules 확인**이 필요함
- **CORS 변경**이 필요함
- **config/secret을 저장소에 commit**해야 함
- 특정 **UID/email을 서버에서 강제**하려면 **Rules 변경**이 필요함
- **실제 Firebase 요청 없이는 기본 게이트가 통과하지 않음**
- **쓰기·발행·마이그레이션**이 필요함
- **`packages/firebase` 루트 export** 또는 **고객 번들 변경**이 필요함
- **`firebase@12.17.1` 외 신규 의존성**이 필요하거나, 그 버전이 **Node 24 / Vite 8 / TS 7 /
  현재 pnpm workspace와 호환되지 않음**(버전 존재 자체는 VERIFIED, §2)

## 11. NOT TESTED (이 스펙이 끝나도 확인되지 않는 것)

- **`firebase@12.17.1`의 실제 설치·빌드 호환성**(Node 24 / Vite 8 / TS 7 / pnpm workspace) —
  구현 단계 `frozen install`에서 처음 확인된다
- 기존 운영자 계정의 **실제 존재·로그인 가능 여부**
- **`storage.rules`의 실제 배포 여부**
- 실제 `admin/state.json`의 **존재·크기·내용**
- 실제 **인증 만료·갱신**
- 실제 **Storage CORS와 `getBytes` 동작**
- 실제 **Rules 거부**
- **실기기**
- **쓰기 원자성** (F-E로 별도 조사 대상)

## 12. 위험 (RISK)

- **고객 번들 오염이 가장 큰 위험**이다. 루트 배럴 한 줄이면 Firebase SDK가 고객 앱에 들어간다.
  방어는 **① 루트 배럴 수정 금지 ② 서브패스 전용 공개 ③ 번들 문자열 검사 ④ dist SHA-256 비교**
  네 겹이며, ③·④가 실제 게이트다.
- **부분 config로 초기화하면 "왜 안 되지"가 조용한 실패로 바뀐다.** 그래서 `UNCONFIGURED`는
  오류가 아니라 **명시 상태**이고, 초기화는 전부 갖춰졌을 때만 한다.
- **계정 1개는 서버가 강제하지 않는다.** 규칙은 "비익명이면 통과"이므로 이 스펙의 계정 정책은
  **운영 약속**이지 기술적 보장이 아니다 — 문서와 코드 주석에 남긴다.
- 롤백: 이 스펙 커밋만 되돌리면 admin은 스펙 035 상태로 복귀하고, 고객 앱은 애초에 무변경이다.

---

### 승인 대기 (Founder)

이 문서는 **계약이며 구현 승인이 아니다.** 다음이 필요하다:

1. 계약 내용 승인 (특히 §2 SDK 버전 고정, §3 활성화 방식, §5 오류 코드 15개, §7 허용 파일)
2. **구현 착수 승인** — 승인 전에는 `packages/firebase`·`apps/admin`에 코드를 쓰지 않고
   `firebase` SDK도 추가하지 않는다.


---

### DONE (Claude) — 2026-08-10, 구현 `fd92fbc`

Founder가 계약 `765dfb4`를 승인하고 구현 착수를 승인했다. 기준 HEAD `765dfb4`.

#### 바꾼 파일 (허용 목록 안, 20개)

| 파일 | 내용 |
| --- | --- |
| `packages/firebase/package.json` | `firebase: "12.17.1"` 정확 고정 + `"./admin-read"` 서브패스 export |
| `packages/firebase/src/admin-read/types.ts` | 공개 타입 전부(`OperatorAuthErrorCode`·`AdminReadErrorCode`·`SafeAdminReadError`·`OperatorAuthActionResult`·`AdminStateLoadResult`·두 포트) |
| `…/constants.ts` | `ADMIN_STATE_OBJECT_PATH`·`ADMIN_STATE_MAX_BYTES = 20_971_519`·`ADMIN_STATE_READ_TIMEOUT_MS = 30_000`·correlationId 패턴 |
| `…/facade.ts` | 주입 가능한 SDK 경계(`AdminFirebaseFacade`) — 사용자 정보는 `isAnonymous` 하나만 통과 |
| `…/errors.ts` | 15개 코드의 category/retryable + auth/storage 매핑 |
| `…/auth-port.ts` | observer 단일 권위, 첫 구독에 관찰 시작·마지막 해제에 종료 |
| `…/read-port.ts` | 고정 경로 read, 인증 게이트, 단일 in-flight, 30s wrapper |
| `…/sdk-facade.ts` | 실제 어댑터 — SDK는 **동적 import**로만 로드 |
| `…/index.ts` | 서브패스 배럴 (write/upload/delete/publish 표면 0) |
| `…/admin-read.test.ts` | 합성 fake 26건 |
| `apps/admin/package.json` | `@denn/firebase: "workspace:*"` |
| `apps/admin/src/admin-read/config.ts` | 플래그 정확 비교 + 공개 config 5개 완전성 판정 |
| `…/controller.ts` | UI 무관 상태기계(8상태·늦은 결과 무시·dispose) |
| `…/create.ts` | env → (선택적) 포트 → 컨트롤러, lazy facade, correlationId 생성 |
| `…/AdminRemoteStateCard.tsx` | 카드 1개 |
| `…/admin-read.test.tsx` | 25건 중 이 스펙 분 |
| `apps/admin/src/App.tsx` | 카드 배치 + unmount 시 `dispose()` |
| `apps/admin/src/env.d.ts` | `ImportMetaEnv` 6키(`string \| undefined`) |
| `tests/e2e/admin-auth-read.spec.ts` | Chromium 2 viewport + 고객 번들 검사 |
| `pnpm-lock.yaml` | `firebase@12.17.1` |

**`packages/firebase/src/index.ts` 무변경**, `apps/mockup/**`·`packages/render/**`·`packages/shared/**`·
`storage.rules`·`firestore.rules`·`firebase.json`·`pnpm-workspace.yaml` **무변경**.

#### 계약 구현 요지

- **번들 격리**: admin 코드는 `@denn/firebase/admin-read`로만 공개하고 SDK는 `sdk-facade.ts`의
  **동적 import**로만 닿는다. 결과: 고객 `dist` SHA-256이 구현 전후 **동일**(`f86d446d…7bbc09`),
  admin 번들에서는 Firebase가 **별도 lazy 청크 4개**(~194 kB)로 분리돼 unconfigured에서는 로드되지 않는다.
- **observer 단일 권위**: sign-in/sign-out은 `{correlationId}`만 반환하고 상태를 쓰지 않는다.
  두 순서(Promise 먼저 / observer 먼저)를 각각 unit으로 고정했다.
- **인증 게이트**: `initializing`·`signed-out`·`anonymous`에서 `getBytes` **0회**(unit).
- **경로 주입 불가**: `load`의 인자는 `{correlationId}`뿐. 런타임에 `objectPath`를 끼워 넣어도
  실제 요청은 `admin/state.json` 하나였다(unit).
- **timeout**: 29,999 ms 미완료 / 30,000 ms `NETWORK_TIMEOUT` / 이후 늦은 성공 폐기 —
  fake timer로 고정. **SDK 취소는 주장하지 않는다.**
- **비노출**: 심어 둔 raw message·email·uid·token이 `SafeAdminReadError`와
  `JSON.stringify(error)`에 **0건**, 실패 payload에 원문 bytes/JSON **0건**,
  화면에는 경로·uid·correlationId·카탈로그 **0건**(unit).
- **기본 비활성**: 플래그가 정확히 `"true"`가 아니거나 config 5개 중 하나라도 비면 어댑터를
  만들지 않는다(unit이 5키 × 3가지 결측을 전수 확인).

#### 검증 결과

| 게이트 | 결과 |
| --- | --- |
| `pnpm install --frozen-lockfile` | **PASS** (exit 0) |
| format / lint(`--error-on-warnings`) / typecheck | PASS |
| unit | **1258/1258 PASS** (035 시점 1213 → **+45**) |
| 독립 build | PASS (admin 216.95 kB + lazy Firebase 청크 4개, 고객 287.74 kB 무변경) |
| 전체 Chromium E2E | **134/134 PASS** (035 시점 131 → **+3**) |
| 고객 `dist` SHA-256 | 구현 **전 `f86d446d…7bbc09`** = 구현 후 = E2E 후 **동일** |
| `pnpm check` | `✓ check passed` |
| `git diff --check` | 클린 (CRLF 경고만) |
| 허용/금지 diff | 금지 경로 **0건** |
| ports 4183/4184 · OS temp `denn-e2e-*` | **0 / 0** |
| 실제 Firebase endpoint 요청 | **0건** (E2E가 요청 URL 전수 확인) |

#### ⚠️ 미해결 — `pnpm-workspace.yaml` (커밋하지 않음)

`pnpm install`이 pnpm 11 정책에 따라 `allowBuilds` 자리표시자 3줄을 자동 추가했고, 그 상태에서
`pnpm install --frozen-lockfile`이 **exit 1**이었다. Founder 지시로 **그 3줄을 제거**했고,
제거 상태에서 frozen install은 **exit 0**이며 pnpm이 다시 추가하지도 않았다(현재 파일 = HEAD 동일).

⚠️ **NOT VERIFIED**: pnpm이 무시 결정(`pendingBuilds`)을 `node_modules/.modules.yaml`에 기록하므로,
**`node_modules`가 없는 새 클론에서 첫 `pnpm install --frozen-lockfile`이 같은 오류를 낼 수 있다.**
이 저장소에서는 재현하지 않았다(node_modules를 지우는 검증은 범위 밖). 발생하면
`@firebase/util`·`protobufjs`를 **`false`(스크립트 실행 안 함)** 로 명시하는 것이 최소 안전 해결책이며,
`pnpm-workspace.yaml` 수정은 **별도 Founder 승인 대상**이다.

#### NOT TESTED

- 기존 운영자 계정의 **실제 존재·로그인 가능 여부**
- **`storage.rules`의 실제 배포 여부**와 실제 거부 동작
- 실제 `admin/state.json`의 존재·크기·내용
- 실제 인증 만료·갱신, 실제 Storage CORS와 `getBytes` 동작
- 실기기, 쓰기 원자성(F-E로 별도 조사 대상)
- **실제 SDK 오류 코드 문자열** — 매핑은 계약 표 기준이며 합성 fake로만 검증했다


---

### CORRECTION_REQUIRED 라운드 1 (Claude) — 2026-08-10, 보완 `b7ee207`

기준 `e873049`. 지적된 **4개 결함만** 고쳤고 제품 범위·공개 8상태·observer 단일 권위는 그대로다.

#### ① Firebase 초기화·observer 오류 fail-closed

**재현**: `createLazyFacade`가 `createFirebaseAdminFacade(config)`의 **rejection을 처리하지 않았다**
(`void facade().then(...)`). 어댑터 생성이 실패하면 ⓐ **unhandled rejection**이 발생하고
ⓑ observer가 영영 붙지 않아 상태가 **`initializing`에 고정**됐다. SDK observer의 error callback도
전달하지 않아 같은 고착이 가능했다.

**수정**: `AdminFirebaseFacade.onAuthStateChanged(listener, onError)`로 **오류 경계를 계약에 추가**하고,
`sdk-facade.ts`가 Firebase의 error callback을 그대로 전달하며, `createLazyFacade`가 factory
rejection을 **같은 `onError`로 라우팅**한다. `auth-port`는 이를 `mapAuthError`에 통과시켜
**`OperatorAuthState`의 안전 코드로만** publish한다(`auth/network-request-failed` →
`NETWORK_UNAVAILABLE`, 미등록 → `UNEXPECTED_ADMIN_READ_ERROR`). **rejection 전에 unsubscribe되면
callback·상태 갱신 0회**다.

**고정한 unit**: factory rejection이 unhandled가 아님(`process.on("unhandledRejection")`으로 확인) ·
안전 코드 매핑 · **raw message 비노출** · unsubscribe 후 침묵 · 어댑터 준비 후 observer 오류 전달 ·
error 상태에서 read는 `AUTH_REQUIRED`로 막히고 `getBytes` 0회.

#### ② 30,000 ms timeout 공개 계약 고정

**재현**: `AdminStateReadPortOptions.timeoutMs?`가 **공개 옵션**이라
`@denn/firebase/admin-read` 호출자가 계약 상수를 우회할 수 있었다.

**수정**: 공개 `AdminStateReadPortOptions`에서 **`timeoutMs` 제거**. 공개
`createAdminStateReadPort`는 항상 `ADMIN_STATE_READ_TIMEOUT_MS`를 쓴다. 테스트 seam은
`read-port.ts`의 `createAdminStateReadPortWithTimeout`이며 **`index.ts`에서 export하지 않는다**.

**고정한 unit**: 런타임에 `{ timeoutMs: 5 }`를 끼워 넣어도 **29,999 ms에 미완료, 30,000 ms에
`NETWORK_TIMEOUT`** · 공개 surface에 seam 이름이 **없음**.

#### ③ 로그아웃 동시성 차단

**재현**: `signOut`이 `busy`를 세우지 않아 **중복 signOut**과 진행 중 **load/signIn**이 함께 시작될 수
있었다.

**수정**: 내부 `busy = "signing-out"` 가드를 추가했다. **새 공개 상태·문구는 없다** — 진행 중에는
`canSignIn`·`canLoad`가 **false**가 되고, 완료 후에도 `signed-out` 확정은 **observer**만 한다.

**고정한 unit**: 중복 signOut → `auth.signOut` **1회** · 진행 중 `read.load` **0회**,
`signIn` **0회** · observer가 먼저 도착해도 늦게 끝난 Promise가 상태를 **덮지 않음** ·
실패 시 안전 코드 + 액션 재개방.

#### ④ Vite 경고 제거

**재현**: `import(\`./index?probe=${Date.now()}\`)`가
`warning: invalid import … A file extension must be included in the static part` 을 매 unit 실행마다 냈다.

**수정**: `vi.resetModules()` + **정적 경로 `import("./index")`** 로 바꿨다. import side-effect 검사
(초기화·network 0)는 그대로다. **unit 실행에 해당 경고 0건.**

#### 검증 결과 (계약 순서)

| # | 게이트 | 결과 |
| --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | **exit 0** |
| 2 | `pnpm format:check` | exit 0 |
| 3 | `pnpm lint` | exit 0 |
| 4 | `pnpm typecheck` | exit 0 |
| 5 | `pnpm test:unit` | **1271/1271 PASS**, **invalid dynamic import warning 0건** |
| 6 | 독립 `pnpm build` | exit 0 |
| 7 | 전체 Chromium E2E | **134/134 PASS** |
| 8 | `pnpm check` | `✓ check passed` |
| 9 | `git diff --check` | 클린 |
| 10 | 금지 경로 diff | **0건** |
| 11 | 고객 dist SHA-256 | 빌드 후 = E2E 후 = **`f86d446d…7bbc09`**(구현 전 기준값과 동일) |
| 12 | 실제 Firebase/network 요청 | **0건** |
| 13 | ports 4183/4184 · OS temp | **0 / 0** |

unit은 라운드 1 전 1258 → **1271**(+13).

#### NOT VERIFIED / NOT TESTED (변동 없음)

- **`pnpm-workspace.yaml`의 `allowBuilds`** — 이번에도 **수정하지 않았고 `pnpm approve-builds`도
  실행하지 않았다**. 새 클론 frozen install 재발 여부는 **NOT VERIFIED**이며,
  Codex의 새 클론 시도는 **registry EACCES로 중단**돼 성공·실패 어느 쪽으로도 단정하지 않는다.
- 운영자 계정 실재·로그인 · `storage.rules` 실제 배포·거부 · 실제 `admin/state.json` ·
  인증 만료·갱신 · 실제 Storage CORS·`getBytes` · 실기기 · 쓰기 원자성 ·
  **실제 SDK 오류 코드 문자열**(매핑은 합성 fake로만 검증).


---

### CORRECTION_REQUIRED 라운드 2 (Claude) — 2026-08-10, **문서 전용**

기준 `1796a2d`. **제품 코드·테스트·설정·manifest·lockfile·`pnpm-workspace.yaml` 변경 0.**
제품 코드의 4개 결함(`b7ee207`)은 Codex 독립 재검증을 통과했다:
frozen install PASS · format/lint 각 **153 파일** PASS · typecheck PASS ·
unit **1271/1271** + **invalid dynamic import warning 0** · build PASS ·
Chromium E2E **134/134** · `pnpm check` PASS · diff check·금지 경로 diff 0 ·
ports 4183/4184·E2E temp 잔여 0.

#### ★ 고객 JS 해시 기록 정정 — 두 값은 서로 다른 것을 측정했다

Codex가 "`f86d446d…7bbc09`가 재현되지 않는다"고 보고했다. **재현 확인 결과, 두 값 모두 지금
재현된다.** 재현되지 않은 것이 아니라 **측정 대상이 달랐고, 내 기록의 라벨이 틀렸다.**

| 값 | 실제로 무엇인가 | 재현 명령 |
| --- | --- | --- |
| **`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`** | **고객 JS 파일 자체의 SHA-256** — `apps/mockup/dist/assets/index-W_cZpbdf.js`, **287,741 bytes** | `sha256sum apps/mockup/dist/assets/index-W_cZpbdf.js` |
| `f86d446dde121bce287b393f905a02208b106face54b0803033eb800437bbc09` | **`dist` 트리 전체의 집계 다이제스트**(각 파일 해시 목록을 다시 해시) — JS 파일 하나의 해시가 **아니다** | `find apps/mockup/dist -type f \| sort \| xargs sha256sum \| sha256sum` |

- **정정 대상**: 스펙 036 DONE·라운드 1 기록과 live 로그에서 `f86d446d…7bbc09`를
  **"고객 dist SHA-256"** 이라고 쓴 라벨. 값 자체는 당시에도 지금도 유효하지만
  **파일 해시가 아니라 트리 집계값**이다. **과거 기록은 지우지 않고 이 항목으로 정정한다.**
- **앞으로의 정본은 파일 해시**다. 집계 다이제스트는 `xargs sha256sum` 출력에 **경로 문자열이
  포함**되고 정렬·셸 환경에 의존해 **기계 간 비교에 부적합**하다. 파일명·바이트 수·파일 해시
  **세 가지를 함께** 기록한다.

#### 확인된 재현 (Codex 4건 + Claude 1건)

1. 현재 HEAD에서 독립 build **2회** → 파일명·크기·해시 동일 (Codex)
2. E2E **전후** 동일 (Codex)
3. 기준 계약 커밋 **`765dfb4`의 임시 archive**를 동일한 고정 toolchain으로 build → **동일** (Codex)
4. Firebase / admin-read / 고객 유출 문자열 검사 → **0건** (Codex)
5. 현재 HEAD에서 **두 측정 방식 모두 재현** — 파일 해시 `fc7660e5…`, 집계 `f86d446d…` (Claude, 위 표)

→ 제품 불변식 **"기준과 현재 고객 JS가 byte-identical"** 은 **PASS**다. 스펙 036의 어떤 코드도
고객 번들에 들어가지 않았다.

#### 이 라운드의 검증

변경 경로 = 허용 문서 5개뿐 · `git diff --check` PASS ·
제품 코드/test/config/manifest/lockfile diff **0** · HEAD=origin, ahead/behind **0/0** ·
working tree = 보호 대상 3개뿐.
