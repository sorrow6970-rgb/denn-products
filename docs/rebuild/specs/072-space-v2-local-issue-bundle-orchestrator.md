# 스펙 072 — space V2 local issue bundle orchestrator

상태: **READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI**

## 1. 목표 (WHY)

스펙 071의 독립 `assetId`·token identity pair와 스펙 068의 snapshot-safe local issue preparation을
한 번의 local-only 흐름으로 조합한다.

성공 결과는 향후 upload/create adapter가 받을 token, proof descriptor, 동일 PNG bytes와 encrypted
`SpaceDocumentV2` 복사본만 제공한다. Storage upload, Firestore create, Firebase adapter, URL 발급과
UI 연결은 시작하지 않는다.

## 2. 기준과 보존 계약

- 기준 HEAD=origin `9a63da6`, ahead/behind 0/0.
- 스펙 068과 071은 `DONE / CODEX_PASSED`다. 기존 spec064~071 제품 파일은 수정하지 않는다.
- Founder `HH-1=A`: assetId와 token은 독립 UUID 두 개이며 동일하면 retry 없이 collision 실패다.
- identity pair는 preparation보다 먼저 생성한다. identity 실패면 SHA/encryption과 preparation 호출 0이다.
- preparation 실패 시 생성된 두 UUID는 local 값으로 폐기한다. upload/create가 없으므로 Storage orphan이나
  Firestore 문서는 생기지 않는다.
- input, UUID/SHA/crypto port는 필수 주입이다. global random/crypto fallback은 없다.
- app barrel과 `App.tsx`에서는 export/import/call하지 않는다.

## 3. 허용 파일

제품 파일은 정확히 다음 신규 2개만 허용한다.

- `apps/admin/src/space-v2/issue-bundle.ts`
- `apps/admin/src/space-v2/issue-bundle.test.ts`

기록 문서는 이 스펙, 관련 handoff, STATE/NEXT/CURRENT/live log만 허용한다. 기존 제품 코드,
package/lockfile, CSS, Firebase/Rules/config는 변경하지 않는다.

## 4. 구현 계약

### 4.1 입력과 결과

```ts
type SpaceV2LocalIssueBundleInput = Omit<
  SpaceV2LocalIssuePreparationInput,
  "assetId"
>;

type SpaceV2LocalIssueBundleErrorCode =
  | "SPACE_V2_BUNDLE_INVALID_INPUT"
  | "SPACE_V2_BUNDLE_IDENTITY_FAILED"
  | "SPACE_V2_BUNDLE_PREPARATION_FAILED";

interface PreparedSpaceV2LocalIssueBundle {
  readonly token: SpaceV2IssueTokenCandidate;
  copyProofDescriptor(): FrameReplayEvidenceV1["proofAsset"];
  copyUploadBytes(): Uint8Array;
  copyDocument(): SpaceDocumentV2;
}

async function prepareSpaceV2LocalIssueBundle(
  input: SpaceV2LocalIssueBundleInput,
  uuid: SpaceV2IssueUuidPort,
  crypto: SpaceCryptoPort,
  sha256: SpaceSha256Port,
): Promise<
  | { readonly ok: true; readonly value: PreparedSpaceV2LocalIssueBundle }
  | { readonly ok: false; readonly code: SpaceV2LocalIssueBundleErrorCode }
>;
```

### 4.2 snapshot과 순서

1. input은 preparation input에서 `assetId`만 제외한 정확한 8개 enumerable own string key여야 한다.
   extra/missing/non-enumerable/symbol, null/array/hostile/revoked proxy는 `INVALID_INPUT`이다.
2. 각 top-level property를 정확히 한 번 읽어 plain snapshot을 만든다. invalid top-level input에서는
   UUID/SHA/encryption 호출 0이다.
3. snapshot 뒤 `createSpaceV2IssueIdentityPair(uuid)`를 정확히 한 번 호출한다. 실패는 원 child code를
   노출하지 않고 `IDENTITY_FAILED`; preparation/SHA/encryption 0이다.
4. 성공한 `assetId`를 snapshot에 추가해 `prepareSpaceV2LocalIssueCandidate`를 정확히 한 번 호출한다.
5. preparation 실패는 원 child code를 노출하지 않고 `PREPARATION_FAILED`; retry, 새 UUID 생성,
   fallback, upload/create는 0이다.
6. 정상 순서는 UUID assetId #1 → UUID token #2 → SHA #1/#2/#3 → encrypt #1이다.

wrapper는 catalog·selection·transform의 하위 검증, PNG 복사, password 검증, SHA/crypto method snapshot을
재구현하지 않고 스펙 068에 위임한다. top-level snapshot만 bundle 경계가 소유한다.

### 4.3 성공 handle

- `token`은 스펙 071이 검증한 lowercase UUID v4 token이다.
- proof descriptor의 object path에 든 assetId와 token은 서로 다르다.
- 세 copy method는 스펙 068 handle에 위임하며 호출마다 fresh detached 값을 반환한다.
- 성공 handle에는 assetId 별도 필드, password, plaintext scene, catalog, selection, UID/email,
  timestamp 또는 URL이 없다.
- 실패 결과는 exact `{ok, code}`뿐이고 child code, UUID 값·일부, password, path, bytes, ciphertext,
  raw message/stack을 노출하지 않는다.

## 5. 필수 테스트

1. 합성 UUID 두 개와 deterministic SHA/crypto가 exact 순서로 성공하고 token과 세 copy method를 제공한다.
2. UUID method는 1회 read·2회 call, SHA 3회, encrypt 1회이며 receiver가 보존된다.
3. malformed top-level input은 `INVALID_INPUT`, UUID/SHA/encryption 0이다.
4. identity의 invalid port/첫 값/둘째 값/collision 실패는 모두 `IDENTITY_FAILED`, preparation 0이며
   UUID 호출 예산 0/1/2회와 세 번째 호출 0을 유지한다.
5. preparation의 input/port/proof/scene/document 실패는 모두 `PREPARATION_FAILED`, identity 재생성·
   retry·upload/create 0이다.
6. 함수 반환 Promise 직후 caller가 catalog/selection/transform/password/pngBytes를 변경해도 최초
   snapshot과 스펙 068의 retained bytes/document만 사용한다.
7. token과 proof objectPath UUID가 다르고 encrypted scene proof descriptor가 handle descriptor와 같다.
8. 각 copy를 변경해도 다음 copy와 token은 변하지 않는다.
9. 실패 결과 exact keys와 sensitive/raw child data 비노출을 확인한다.
10. fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Date/global random/global crypto/console 호출 0이다.
11. `App.tsx`와 app barrel import/call 0, production bundle identity 불변이다.

## 6. 검증 게이트

- 신규 targeted unit
- 신규 unit + spec068~071 + 기존 V2 unit + `packages/spaces`
- admin typecheck
- `node scripts/check.mjs` (현재 unit 2026/2026 이상)
- 전체 Chromium E2E 151/151 이상
- 고객 entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin entry `index-D0XOQpRL.js`, 226,201 bytes, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- admin CSS `index-DJ_z3tK1.css`, 9,146 bytes
- 두 production bundle에 신규 module/API/error 식별자 0
- `git diff --check`, exact paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium이 다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

## 7. 계속 금지

- Storage upload/read/delete, Firestore create/read-back/reconciliation, URL/link 발급
- Firebase adapter, Rules/config/env, 실제 UID/project/bucket/network/data/emulator/deploy
- `App.tsx`, route, admin/customer UI/UX/CSS, viewer/open composition
- 기존 spec064~071 제품 변경, V1 migration/rewrite, published write, orphan 정리, C6/backend
- package/lockfile/dependency/download/install, retry/merge/fallback

## 8. STOP 조건

- 기존 064~071 제품 API 수정이 필요함
- upload/create/reconciliation 또는 새 metadata/error 정책 결정이 필요함
- 허용 신규 제품 파일 2개 밖 변경이 필요함
- baseline gate 실패·timeout/flaky 재발
- 실제 Firebase/Rules/UI/운영 데이터나 신규 dependency가 필요함
- 보호 대상 또는 기존 Founder/user working tree 변경과 충돌함

### QUESTIONS

없음. 승인된 local preparation과 독립 identity pair만 조합하며 외부 효과는 계속 0이다.

### DONE (Claude)

상태: **IMPLEMENTED / READY_FOR_CODEX / LOCAL_ONLY / NO_NETWORK / NO_UI** (2026-08-24)

- Codex 계약 문서 6개 → 문서 commit `96422f8`, 구현 → commit `34cca25`. 둘 다 일반 fast-forward push.
  HEAD=origin `34cca25`, ahead/behind 0/0.
- 제품 변경은 §3 허용 신규 2파일뿐: `apps/admin/src/space-v2/issue-bundle.ts`,
  `apps/admin/src/space-v2/issue-bundle.test.ts`. 기존 spec064~071 제품 파일, package/lockfile/CSS/
  Firebase/Rules/config/UI diff는 **0**이다.

구현 요약 (§4):

- top-level `exactSnapshot` 8 key(각 property 1회 read) → `createSpaceV2IssueIdentityPair(uuid)` 1회
  → 성공 assetId를 snapshot에 더해 `prepareSpaceV2LocalIssueCandidate` 1회. preparation은 이 함수의
  첫 await **이전에** 시작되므로 caller의 mid-flight 변경은 관측되지 않는다.
- catalog/selection/transform 하위 검증, PNG 복사, password 규칙, SHA/crypto method snapshot은
  전부 스펙 068에 위임했다. 재구현 0.
- 성공 handle key는 `token` + copy 3개. copy는 068 handle 위임이라 호출마다 fresh detached 값이다.

필수 테스트 (§5) — targeted **58/58**:

1. 합성 UUID 2개 + deterministic SHA/crypto로 exact 순서 성공, token·copy 3개 제공 — PASS
2. UUID method 1회 read / 2회 call, SHA 3, encrypt 1, receiver 보존(method-style source/crypto) — PASS
3. malformed top-level input(extra·missing·null·undefined·primitive·array·non-enumerable·symbol·
   throwing getter·revoked proxy·caller assetId) → `INVALID_INPUT`, UUID/SHA/encryption 0 — PASS
4. identity invalid port 7종 / 첫 값 / 둘째 값 / collision → `IDENTITY_FAILED`, preparation 0,
   UUID 예산 0/1/2회, 세 번째 호출 0 — PASS
5. preparation input/port/proof/scene/document 실패 → `PREPARATION_FAILED`, UUID 정확히 2회
   (재생성·retry 0), upload/create 0 — PASS
6. 반환 Promise 직후 catalog/selection/transform/password/pngBytes 변경 → 최초 snapshot만 사용 — PASS
7. token ≠ proof objectPath UUID, 실제 Web Crypto 왕복으로 encrypted scene proof descriptor =
   handle descriptor, 암호문에 token 없음 — PASS
8. 각 copy 변경 후에도 다음 copy와 token 불변 — PASS
9. 실패 결과 exact `{ok, code}`, child code·UUID·password·path·message/stack 비노출 — PASS
10. fetch/Firebase/Storage/Firestore/DOM/Canvas/Date/global random/global crypto/console 호출 0 — PASS
11. `App.tsx`/`main.tsx` import·call 0, production bundle identity 불변 — PASS

검증 게이트 (§6):

- targeted **58/58**, 신규+spec068~071+기존 V2 unit+`packages/spaces` **513/513**
- admin typecheck PASS, `node scripts/check.mjs` PASS(unit **2084/2084**)
- 전체 Chromium E2E **151/151**
- 고객 `index-6js4DafP.js` **322,018 bytes** /
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159` — 일치
- admin `index-D0XOQpRL.js` **226,201 bytes** /
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC` — 일치
- admin CSS `index-DJ_z3tK1.css` **9,146 bytes** — 일치
- 두 production bundle에 스펙 072 module/API/error 식별자 **0건**
- `git diff --check` PASS, exact paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, `denn-e2e-*`/debug 잔류 0
- 보호 spec-018 PNG는 E2E가 다시 썼고 restore/checkout/stage/commit **하지 않았다**

mutation(전부 검출): assetId를 token으로 교체 **5건**, top-level snapshot을 raw input pass-through로
교체 **1건**, preparation 시작 전 await 삽입 **1건**, exact-key 검사 완화 **2건**, 세 copy 캐시 **3건**.

계속 금지 (§7) 확인: Storage upload/read/delete, Firestore create/read-back/reconciliation, URL 발급,
Firebase adapter/Rules/config/env, 실제 UID/project/bucket/network/emulator/deploy, `App.tsx`/route/
admin·customer UI/CSS, 기존 spec064~071 변경, package/lockfile/dependency, retry/merge/fallback —
전부 **0**이다. §8 STOP 조건에 해당한 항목은 없었다.

★ 범위 한계: 이 조합은 local 준비만 증명한다. upload/create/URL 발급과 실제 Firebase 경로는 한 줄도
검증되지 않았고, 난수 품질·collision freedom도 여전히 증명 대상이 아니다.

전체 리빌드 진행도: **78~81% 완료 / 19~22% 잔여**(직전 77~80%에서 +1%p).

