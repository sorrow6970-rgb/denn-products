# 스펙 070 — space V2 local Web Crypto UUID adapter

상태: **READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI**

## 1. 목표 (WHY)

스펙 069가 검증한 token 생성 결과 경계에 실제 브라우저/Node Web Crypto `randomUUID()`를 연결할 수
있는 작은 local adapter를 만든다. 이 단위는 UUID source를 Web Crypto로 명시할 뿐 token과 proof
`assetId`의 관계, 스펙 068 조합, Firebase 발급은 시작하지 않는다.

## 2. 기준과 보존 계약

- 기준 HEAD=origin `020402c`, ahead/behind 0/0.
- 스펙 069는 `CODEX_PASSED / DONE`이다. 기존 064~069 제품 파일은 수정하지 않는다.
- source는 표준 `Crypto.randomUUID()` capability 하나뿐이다. `getRandomValues`, `Math.random`, timestamp,
  자체 UUID 조립과 외부 UUID package는 사용하지 않는다.
- adapter 생성 시 source의 `randomUUID` method를 정확히 한 번 snapshot하고 callable인지 확인한다.
- adapter의 method는 snapshot한 callable을 원 source receiver로 호출한다. output 형식·throw 매핑·호출
  횟수 제한은 스펙 069 token candidate가 담당하며 adapter가 중복 검증·retry하지 않는다.
- 실제 난수 품질과 충돌 확률을 unit test로 증명했다고 주장하지 않는다. Web Crypto source 선택과
  UUID v4 형식 통합만 검증한다.

## 3. 허용 파일

제품 파일은 정확히 다음 신규 2개만 허용한다.

- `apps/admin/src/space-v2/issue-uuid-adapter.ts`
- `apps/admin/src/space-v2/issue-uuid-adapter.test.ts`

기록 문서는 이 스펙, 관련 handoff, 스펙 069 종료 상태, STATE/NEXT/CURRENT/live log만 허용한다.
기존 제품 코드, package/lockfile, CSS, config, Firebase/Rules는 변경하지 않는다.

## 4. 구현 계약

### 4.1 공개 local API

신규 module에서 다음 의미의 factory를 export한다. app barrel과 `App.tsx`에서는 export/import/call하지
않는다.

```ts
type SpaceV2IssueUuidAdapterErrorCode = "SPACE_V2_UUID_SOURCE_UNAVAILABLE";

function createSpaceV2IssueUuidPort(
  source?: Pick<Crypto, "randomUUID">,
):
  | { readonly ok: true; readonly value: SpaceV2IssueUuidPort }
  | { readonly ok: false; readonly code: SpaceV2IssueUuidAdapterErrorCode };
```

- `source`를 생략하면 `globalThis.crypto`를 사용한다.
- 명시 source와 global source 모두 같은 검증 경로를 사용한다.
- factory 실패 결과는 `{ok, code}`뿐이다.

### 4.2 source snapshot

1. source 생략 시 `globalThis.crypto`를 안전하게 읽는다.
2. null/primitive/method 없음/non-function/throwing getter/revoked proxy는 `SOURCE_UNAVAILABLE`이다.
3. `randomUUID` property는 factory 호출당 정확히 한 번만 읽는다.
4. 성공 port의 `randomUUID()`는 snapshot method를 `.call(originalSource)`로 호출한다.
5. source method가 throw하거나 invalid 값을 반환하면 adapter는 catch/repair/retry하지 않는다. 스펙 069
   candidate가 `GENERATION_FAILED`/`INVALID_OUTPUT`으로 안전하게 매핑한다.

### 4.3 통합 경계

- 합성 source로 만든 port를 `createSpaceV2IssueTokenCandidate`에 넘기면 lowercase UUID v4가 성공한다.
- 실제 `globalThis.crypto.randomUUID` 통합은 환경에서 capability가 존재할 때 한 번 호출해 스펙 069
  candidate의 strict 형식 검사를 통과함을 확인한다. collision 부재·분포·entropy를 반복 표본으로
  추정하지 않는다.
- adapter 자체는 operation 단위 호출 수를 관리하지 않는다. “한 저장 작업에서 최대 1회”는 candidate/
  후속 orchestration 소유다.

### 4.4 안전 경계

- token, source object, UID/email, raw message/stack을 결과·console에 넣지 않는다.
- fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Date/Math.random/getRandomValues 호출 0이다.
- 실제 프로젝트, network, Storage/Firestore와 관계가 없다.

## 5. 필수 테스트

1. injected source method getter 1회, returned port receiver 보존, candidate 성공을 확인한다.
2. 명시 source와 default global source가 같은 factory 경로를 사용한다.
3. malformed source 7종은 exact safe failure이며 global fallback·method call 0이다.
4. source method throw는 factory 성공 뒤 token candidate `GENERATION_FAILED`, invalid output은
   `INVALID_OUTPUT`, underlying call은 각 1회다.
5. drifting getter가 두 번째 method로 바뀌지 않고 method-style class source가 동작한다.
6. 실제 local `globalThis.crypto.randomUUID()` 결과 한 건이 스펙 069 strict UUID v4 candidate를 통과한다.
7. `getRandomValues`/`Math.random`/fetch/console/Date/DOM/Canvas/Firebase 호출 0이다.
8. `App.tsx` import/call 0, production bundle identity 불변이다.

## 6. 검증 게이트

- 신규 targeted unit
- 신규 unit + spec 069 + spec 068 + 기존 V2 관련 unit + `packages/spaces`
- admin typecheck
- `node scripts/check.mjs` (현재 unit 1976/1976 이상)
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

- token과 assetId의 관계 결정, asset UUID 생성 또는 둘의 동시 생성
- 스펙 068/069 제품 변경 또는 issue bundle orchestration
- Storage upload/read/delete, Firestore create/read-back/reconciliation, URL/link 발급
- Firebase adapter, Rules/config/env, 실제 UID/project/bucket/network/data/emulator/deploy
- `App.tsx`, route, admin/customer UI/UX/CSS, viewer/open composition
- V1 token/parser/read 변경, migration/rewrite, published write, orphan 정리, C6/backend
- package/lockfile/dependency/download/install, retry/merge/fallback

## 8. STOP 조건

- 현재 runtime에 `crypto.randomUUID`가 없어 polyfill/dependency가 필요함
- token↔assetId 관계나 실제 발급 조합을 결정해야 함
- 기존 064~069 제품 API 수정이 필요함
- 허용 신규 제품 파일 2개 밖 변경이 필요함
- baseline gate 실패·timeout/flaky 재발
- 실제 Firebase/Rules/UI/운영 데이터가 필요하거나 Founder/user 보호 변경과 충돌함

### QUESTIONS

없음. Web Crypto UUID source를 스펙 069 port에 맞추는 local adapter만 구현한다.
