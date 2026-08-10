# 스펙 036 — 운영자 Auth + 비공개 `admin/state.json` 읽기 전용

상태: **READY (계약)** — **구현 미승인.** Founder가 이 계약을 검토해 별도로 승인하기 전에는
제품 코드를 한 줄도 쓰지 않는다.

작성 2026-08-10 · 기준 HEAD = origin = `6daf365`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-10-admin-auth-write-boundary-decisions.md`
(Founder F-A~F-E, 2026-08-10 승인)
근거 조사: `reviews/2026-08-10-admin-auth-write-founder-decision-options.md`,
`reviews/2026-07-31-admin-write-boundary-investigation.md`

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
| SDK 버전 | **`firebase@12.16.0` 정확 고정** (범위 지정자 금지) |
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

> ⚠️ **UNCONFIRMED**: `firebase@12.16.0`이 레지스트리에 실제로 존재하는지, Node 24 / Vite 8 /
> TypeScript 7 조합과 호환되는지는 **확인하지 않았다**(실제 network 금지). 설치는 구현 단계의
> 첫 작업이며, 버전이 없거나 peer/engine이 충돌하면 **STOP**(§10)이다.

## 3. 앱 구성과 실제 네트워크 차단

- **`apps/admin`이 Firebase 구성과 기능 활성화 여부를 소유한다.** `packages/firebase`는 구성을
  스스로 읽지 않는다(주입만 받는다).
- **기본값은 비활성이다.**
- **`VITE_DENN_ADMIN_FIREBASE_ENABLED=true`** 와 **필수 공개 Firebase config가 모두 있을 때만**
  SDK adapter를 초기화한다.
- config가 없거나 **불완전하면** 고정 **`UNCONFIGURED`** 상태를 표시하고
  **SDK 초기화·Auth observer·Storage 요청을 모두 0회**로 유지한다.
  (부분 config로 초기화를 시도하지 않는다 — fail-closed.)
- **실제 config 값을 저장소에 새로 하드코딩하지 않는다. `.env` 파일을 commit하지 않는다.**
- **기본 unit/build/E2E에서 실제 Firebase endpoint 요청은 0건**이어야 한다.
- **live 검증은 별도 Founder 승인 전에는 작성하지도 실행하지도 않는다**
  (`*.live.test.ts`는 `vitest.config.ts:17`로 기본 게이트에서 제외되지만, **파일 자체를 만들지 않는다**).

`apps/admin/src/env.d.ts`는 현재 CSS 앰비언트 선언뿐이므로, `ImportMetaEnv` 타입 선언을 **추가**한다.

## 4. AuthPort 계약

**공개 포트는 Firebase `User` 객체·token·credential·raw SDK error를 외부로 노출하지 않는다.**

```ts
type OperatorAuthState =
  | { readonly status: "initializing" }
  | { readonly status: "signed-out" }
  | { readonly status: "authenticated" }          // 비익명 세션만
  | { readonly status: "error"; readonly code: AdminReadErrorCode };

interface OperatorAuthPort {
  subscribe(listener: (state: OperatorAuthState) => void): () => void; // returns unsubscribe
  currentOperator(): OperatorAuthState;
  signInWithEmailPassword(email: string, password: string): Promise<Result>;
  signOut(): Promise<Result>;
}
```

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
export const ADMIN_STATE_MAX_BYTES = 20 * 1024 * 1024 - 1; // storage.rules okSize() 미만
```

- **호출자가 path·bucket·URL을 주입할 수 없다.** 경로는 상수이며 인자가 아니다.
- 최대 읽기 크기는 **20 MiB 미만**으로 제한한다(`storage.rules:22` `okSize()`와 같은 상한).
- **`getBytes(ref, maxDownloadSizeBytes)`** 를 사용한다(`getDownloadURL` 금지 — §5 규율).

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

**안전 오류 코드(확정)** — `public-catalog/types.ts:19-33`의 선례와 같은 형태
(`category` / `code` / `retryable` / `correlationId` + 최소 안전 메타):

```
INVALID_REQUEST · AUTH_NOT_READY · AUTH_REQUIRED · ANONYMOUS_NOT_ALLOWED ·
AUTH_PERSISTENCE_FAILED · INVALID_CREDENTIAL · AUTH_RATE_LIMITED ·
NETWORK_UNAVAILABLE · NETWORK_TIMEOUT · ADMIN_STATE_NOT_FOUND · ADMIN_STATE_FORBIDDEN ·
RESPONSE_TOO_LARGE · INVALID_JSON · INVALID_CATALOG · UNEXPECTED_ADMIN_READ_ERROR
```

이 15개가 **전부**다. 매핑되지 않는 SDK 오류는 **`UNEXPECTED_ADMIN_READ_ERROR`로 접는다**
(raw code를 그대로 흘리지 않는다).

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
- **raw secret fixture**(가짜 token·email·uid·base64)가 **결과·오류·`JSON.stringify` 결과에 0건**
- **write/upload/delete/published API 표면 0**(모듈 export에 존재하지 않음)

**`apps/admin`** (정적 마크업 + 순수 로직)

- **기본 `unconfigured`에서 Firebase adapter 생성·네트워크 0**
- 로그인 상태 전이(`initializing → signed-out → signing-in → authenticated`)
- **password 정리**(시도 종료·unmount)
- **StrictMode subscribe/unsubscribe 균형**
- **중복 클릭 방지**(단일 in-flight)
- **늦은 결과 무시**와 **unmount 후 상태 변경 0**
- 성공/실패 **접근성 문구**
- **저장·발행 affordance 0**

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

> ⚠️ `pnpm install --frozen-lockfile`은 **`firebase@12.16.0`을 lockfile에 반영한 뒤**에만 통과한다.
> 의존성 추가 커밋과 lockfile 갱신은 **구현 단계의 첫 작업**이며, 이 계약 문서 단계에서는 하지 않는다.

## 10. STOP 조건 (구현하지 않고 보고)

- 기존 운영자 **계정** 또는 **실제 Rules 확인**이 필요함
- **CORS 변경**이 필요함
- **config/secret을 저장소에 commit**해야 함
- 특정 **UID/email을 서버에서 강제**하려면 **Rules 변경**이 필요함
- **실제 Firebase 요청 없이는 기본 게이트가 통과하지 않음**
- **쓰기·발행·마이그레이션**이 필요함
- **`packages/firebase` 루트 export** 또는 **고객 번들 변경**이 필요함
- **`firebase@12.16.0` 외 신규 의존성**이 필요하거나, 그 버전이 **존재하지 않거나 호환되지 않음**

## 11. NOT TESTED (이 스펙이 끝나도 확인되지 않는 것)

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
