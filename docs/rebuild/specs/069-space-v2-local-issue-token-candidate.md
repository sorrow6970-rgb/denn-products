# 스펙 069 — space V2 local issue token candidate

상태: **IMPLEMENTED / READY_FOR_CODEX / LOCAL_ONLY / NO_NETWORK / NO_UI**

## 1. 목표 (WHY)

Founder `GG-1=A`가 승인한 “발급 작업마다 새 lowercase UUID token”을 Firebase와 UI보다 먼저 작은
local 경계로 고정한다. 이 단위는 token 문자열 하나의 생성·검증만 담당하며 스펙 068 준비 handle,
proof asset ID, Storage upload, Firestore create와 아직 조합하지 않는다.

## 2. 기준과 보존 계약

- 기준 HEAD=origin `215af5b`, ahead/behind 0/0.
- 스펙 068은 `CODEX_PASSED / DONE`이다. 기존 064~068 제품 파일은 수정하지 않는다.
- token은 호출마다 주입 port가 새로 제공한 lowercase RFC 4122 UUID v4여야 한다.
- token과 proof `assetId`의 동일성·상이성·생성 순서는 이번 단위에서 결정하지 않는다.
- V1 24-hex/custom token 검증과 `?space=` read 호환은 바꾸지 않는다.
- global `crypto.randomUUID`, `getRandomValues`, `Math.random` fallback은 없다. 생성 port는 필수 주입이다.
- 자동 retry와 invalid output 재생성은 0이다. 한 호출에서 random method 호출은 최대 1회다.

## 3. 허용 파일

제품 파일은 정확히 다음 신규 2개만 허용한다.

- `apps/admin/src/space-v2/issue-token-candidate.ts`
- `apps/admin/src/space-v2/issue-token-candidate.test.ts`

기록 문서는 이 스펙, 관련 handoff, 스펙 068 종료 상태, STATE/NEXT/CURRENT/live log만 허용한다.
기존 제품 코드, package/lockfile, CSS, config, Firebase/Rules는 변경하지 않는다.

## 4. 구현 계약

### 4.1 공개 local API

다음 의미의 API를 신규 module에서 export한다. app barrel과 `App.tsx`에서는 export/import/call하지 않는다.

```ts
interface SpaceV2IssueUuidPort {
  randomUUID(): string;
}

type SpaceV2IssueTokenCandidate = string & {
  readonly __spaceV2IssueTokenCandidate: unique symbol;
};

type SpaceV2IssueTokenCandidateErrorCode =
  | "SPACE_V2_TOKEN_INVALID_PORT"
  | "SPACE_V2_TOKEN_GENERATION_FAILED"
  | "SPACE_V2_TOKEN_INVALID_OUTPUT";

function createSpaceV2IssueTokenCandidate(
  uuid: SpaceV2IssueUuidPort,
):
  | { readonly ok: true; readonly value: SpaceV2IssueTokenCandidate }
  | { readonly ok: false; readonly code: SpaceV2IssueTokenCandidateErrorCode };
```

이름은 위와 일치시킨다. 성공 token은 문자열 이외의 metadata를 갖지 않는다.

### 4.2 port snapshot과 호출

1. `uuid.randomUUID` property를 정확히 한 번 읽어 callable인지 확인한다.
2. missing/null/primitive/non-function/throwing getter/revoked proxy port는 `INVALID_PORT`다.
3. snapshot한 method를 원 port receiver로 정확히 한 번 호출한다.
4. method throw는 `GENERATION_FAILED`다. Promise/object/number/null 등 string이 아닌 반환과 형식이 맞지
   않는 string은 `INVALID_OUTPUT`이다.
5. 실패 시 재호출·fallback·console 출력은 0이다.

### 4.3 token 형식

성공 값은 정확히 lowercase UUID v4 형식이다.

```text
^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

- uppercase, trim 가능한 공백 포함값, 다른 UUID version/variant, slash, 빈 문자열은 거부한다.
- trim/lowercase 변환, 기본값, collision retry는 하지 않는다.
- UUID v4 형식 검증은 실제 전역 난수 품질이나 충돌 부재를 증명하지 않는다. 신뢰 근원은 이후 실제
  adapter 계약에서 별도 검토한다.

### 4.4 안전 결과

- 실패 결과는 `{ok, code}` 두 key뿐이다.
- 반환된 원문 후보, token, UID/email, SDK message, stack을 오류·console에 넣지 않는다.
- 이 함수는 token을 URL, Firestore path/document, React state, DOM, storage에 넣지 않는다.

## 5. 필수 테스트

1. 합성 lowercase UUID v4를 정확히 1회 받아 그대로 성공 반환한다.
2. variant nibble `8/9/a/b`를 허용하고 uppercase/version 1·3·5/잘못된 variant/slash/공백/빈 값은 거부한다.
3. malformed port 7종은 `INVALID_PORT`, method 호출과 global random 0이다.
4. throwing method는 `GENERATION_FAILED`; Promise/object/non-string/invalid string은 `INVALID_OUTPUT`이다.
5. drifting getter는 method read 1회, method-style class port는 receiver 보존, 성공 호출 정확히 1회다.
6. 실패 결과 exact keys와 raw candidate/message/token 비노출을 확인한다.
7. fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Date/Math.random/global crypto/console 호출 0이다.
8. `App.tsx` import/call 0, production bundle identity 불변이다.

## 6. 검증 게이트

- 신규 targeted unit
- 신규 unit + 기존 spec 068 unit + 기존 V2 관련 unit + `packages/spaces`
- admin typecheck
- `node scripts/check.mjs` (현재 unit 1935/1935 이상)
- 전체 Chromium E2E 151/151 이상
- 고객 entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin entry `index-D0XOQpRL.js`, 226,201 bytes, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- admin CSS `index-DJ_z3tK1.css`, 9,146 bytes, unwanted utility 0
- 두 production bundle에 신규 module/API/error 식별자 0
- `git diff --check`, exact paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium이 다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

## 7. 계속 금지

- token과 assetId의 관계 결정 또는 둘을 함께 생성·조합
- 스펙 068 orchestration 변경, PNG decode, encryption 정책 변경
- Storage upload/read/delete, Firestore create/read-back/reconciliation, URL/link 발급
- Firebase adapter, Rules/config/env, 실제 UID/project/bucket/network/data/emulator/deploy
- `App.tsx`, route, admin/customer UI/UX/CSS, viewer/open composition
- V1 token/parser/read 변경, migration/rewrite, published write, orphan 정리, C6/backend
- package/lockfile/dependency/download/install, retry/merge/fallback

## 8. STOP 조건

- token↔assetId 관계나 실제 adapter 난수 source를 이번 단위에서 결정해야 함
- 기존 064~068 제품 API 수정이 필요함
- 허용 신규 제품 파일 2개 밖 변경이 필요함
- baseline gate 실패·timeout/flaky 재발
- 실제 Firebase/Rules/UI/운영 데이터 또는 신규 dependency가 필요함
- Founder/user 보호 변경과 충돌함

### QUESTIONS

없음. 승인된 새 UUID token의 local 생성 결과 검증만 분리하며 실제 발급 조합은 후속 계약이다.

### DONE (Claude) — 2026-08-21

구현 commit `e5261a2` (계약 문서 commit `361b1d3`). 제품 변경은 §3 허용 2개 신규 파일뿐이고 기존
064~068 제품 파일, package/lockfile/CSS/config/Firebase/Rules diff는 **0**이다.

- 신규 `apps/admin/src/space-v2/issue-token-candidate.ts`
  — `createSpaceV2IssueTokenCandidate(uuid)` (동기 함수, 정본 §4.1 이름 그대로)
- 신규 `apps/admin/src/space-v2/issue-token-candidate.test.ts` — 41 tests

구현:

- **4.2 port**: `uuid.randomUUID`를 정확히 한 번 읽어 callable 검증하고, 원 receiver로
  (`.call(uuid)`) 최대 한 번 호출한다. missing/null/primitive/non-function/throwing getter/revoked
  proxy는 `SPACE_V2_TOKEN_INVALID_PORT`이며 method 호출 0이다. method throw는
  `SPACE_V2_TOKEN_GENERATION_FAILED`, string이 아니거나 형식이 틀린 string은
  `SPACE_V2_TOKEN_INVALID_OUTPUT`이다. 재호출·fallback·console 출력 0.
- **4.3 형식**: 성공은 `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`만이다.
  uppercase/공백 포함/다른 version·variant/slash/빈 문자열은 거부하고 trim·lowercase 변환·기본값·
  collision retry를 하지 않는다.
  **이 검증은 난수 품질이나 충돌 부재를 증명하지 않는다** — FORMAT 확인이며, 신뢰 근원은 이후 실제
  adapter 계약에서 별도로 다룬다. 이 한계를 module과 unit 상단 주석에 그대로 적었다.
- **4.4 안전 결과**: 실패는 `{ok, code}` 두 key뿐이고 원문 후보·token·UID/email·SDK message·stack을
  넣지 않는다. token을 URL/Firestore path/React state/DOM/storage에 넣지 않는다.
- global `crypto.randomUUID`/`getRandomValues`/`Math.random` 사용 0(회귀로 고정).

검증:

- 신규 targeted **41/41**, space-v2(065~069) + `packages/spaces` **405/405**
- admin typecheck PASS, `node scripts/check.mjs` **PASS**(unit **1976/1976**)
- 전체 Chromium E2E **151/151**
- 고객 entry `index-6js4DafP.js` **322,018 bytes** / `A9360EFF…E55E8159` — 기준 일치
- admin entry `index-D0XOQpRL.js` **226,201 bytes** / `B6E90475…B3A1F1DC` — 기준 일치
- admin CSS `index-DJ_z3tK1.css` **9,146 bytes**, unwanted utility **0**
- 두 production bundle에 `SPACE_V2_TOKEN`/`createSpaceV2IssueTokenCandidate`/`issue-token-candidate`
  문자열 **0건**
- `git diff --check` PASS, 변경 경로는 허용 2개 신규 파일뿐, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, `denn-e2e-*`/temp/debug 잔류 0

mutation 확인: 형식 정규식을 느슨한 UUID(대소문자·version 무관)로 바꾸면 8건이 실패한다. 거짓 통과가
아니다.

계속 NOT IMPLEMENTED / 금지: token↔assetId 관계 결정과 동시 생성, 스펙 068 orchestration 조합/변경,
Storage upload/read/delete, Firestore create/reconciliation, URL/link 발급, Firebase adapter/Rules/
config/env, 실제 UID·network·emulator·deploy, viewer/UI/route, V1 token/parser 변경.
