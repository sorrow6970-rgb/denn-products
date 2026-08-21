# 스펙 067 — space V2 local document encryption candidate

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI**

## 1. 목표 (WHY)

스펙 065의 strict `SpaceSceneV2` candidate를 기존 `@denn/spaces` crypto port로 암호화하고, Founder
GG-1=A의 exact outer `{ schema: "space-v2", enc }` 문서 후보로 만드는 로컬 비-UI 경계를 추가한다.

이 단위는 암호화 문서 조립만 증명한다. 새 token 생성, PNG upload, Firestore `spaces/{token}` create,
Firebase adapter, 발급 링크와 viewer/UI는 시작하지 않는다.

## 2. 기준과 보존 계약

- 기준 HEAD=origin `e4bcce9`, ahead/behind 0/0.
- Founder GG-1=A: V2 outer/plaintext를 V1과 분리하고 향후 새 immutable UUID token만 쓴다. V1 rewrite/
  migration 0.
- `SpaceDocumentV2` exact keys는 `schema`, `enc`; `enc` exact keys는 `salt`, `iv`, `ct`다.
- plaintext는 `readSpaceSceneV2`가 수용한 detached `SpaceSceneV2`만 가능하다.
- crypto는 기존 `SpaceCryptoPort.encryptJson`과 `LEGACY_SPACE_CRYPTO`를 재사용한다. PBKDF2 120,000 /
  SHA-256 / AES-GCM-256 / 16-byte salt / 12-byte IV 계약을 다시 구현하지 않는다.
- 기존 crypto 계약과 같이 password는 **빈 문자열이 아닌 string**만 허용한다. trim, 최소/최대 길이,
  문자 정책을 새로 만들지 않는다.
- 제품 module은 crypto port와 SHA-256 port를 필수 주입받는다. global crypto, random, Firebase,
  network를 직접 만들거나 호출하지 않는다.

## 3. 허용 파일

제품 파일은 정확히 다음 신규 2개만 허용한다.

- `apps/admin/src/space-v2/document-encryption-candidate.ts`
- `apps/admin/src/space-v2/document-encryption-candidate.test.ts`

기록 문서는 이 스펙, 관련 handoff, STATE/NEXT/CURRENT/live log만 허용한다. admin은 이미
`@denn/spaces` workspace dependency를 가지며 `apps/admin/src/space-v2/**/*`는 Tailwind source에서
제외돼 있다. package/lockfile/CSS/config 변경은 0이어야 한다.

## 4. 구현 계약

### 4.1 공개 로컬 API

다음 의미의 API를 신규 module에서 export한다. 이름과 결과 shape는 아래와 일치시킨다.

```ts
interface SpaceV2DocumentEncryptionCandidateInput {
  readonly scene: SpaceSceneV2;
  readonly password: string;
}

type SpaceV2DocumentEncryptionCandidateErrorCode =
  | "SPACE_V2_DOCUMENT_INVALID_INPUT"
  | "SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED"
  | "SPACE_V2_DOCUMENT_ENCRYPT_FAILED"
  | "SPACE_V2_DOCUMENT_INVALID_OUTPUT";

type SpaceV2DocumentEncryptionCandidateResult =
  | { readonly ok: true; readonly value: SpaceDocumentV2 }
  | { readonly ok: false; readonly code: SpaceV2DocumentEncryptionCandidateErrorCode };

async function createSpaceV2DocumentEncryptionCandidate(
  input: SpaceV2DocumentEncryptionCandidateInput,
  crypto: SpaceCryptoPort,
  sha256: SpaceSha256Port,
): Promise<SpaceV2DocumentEncryptionCandidateResult>;
```

이 파일은 app barrel이나 `App.tsx`에서 export/import/call하지 않는다.

### 4.2 입력 snapshot과 호출 순서

1. input은 enumerable own string key `scene`, `password` 정확히 2개만 허용한다. extra/missing,
   non-enumerable/symbol key, array/null, hostile/revoked proxy는 안전 실패한다.
2. password를 await 전에 한 번 읽어 로컬 string으로 보존하고 non-empty인지 검사한다. password를 trim,
   normalize, log, 반환하거나 오류에 포함하지 않는다.
3. `readSpaceSceneV2(scene)`를 encryption 전에 정확히 1회 호출한다. 실패하면 crypto 호출 0이다.
4. `readSpaceSceneV2`는 digest **형식**만 검사하므로 이것만으로 evidence와 digest의 일치가 증명됐다고
   간주하지 않는다. detached scene의 `frameEvidence`와 `frameEvidenceDigest`를 기존
   `verifyFrameReplayEvidenceDigestV1(..., sha256)`로 암호화 전에 검증한다. mismatch, digest port
   throw/reject/bad length 또는 invalid evidence면 encryption 호출 0이다.
5. verifier 성공 뒤 reader가 반환한 detached scene만
   `crypto.encryptJson(detachedScene, passwordSnapshot)`에 넘긴다. raw caller scene을 넘기지 않는다.
6. SHA-256 digest는 성공 경로에서 정확히 1회, `encryptJson`도 정확히 1회다. 앱 수준
   retry/fallback/decrypt 호출은 0이다.
7. 성공 envelope를 `{ schema: SPACE_DOCUMENT_V2_VERSION, enc }`로 감싼 뒤
   `readSpaceDocumentV2`로 다시 검증한다. malformed/extra/missing envelope, bad base64/length, hostile
   crypto result는 `SPACE_V2_DOCUMENT_INVALID_OUTPUT`이다.
8. 최종 성공값은 reader가 반환한 detached exact `SpaceDocumentV2`다. 입력이나 crypto result와 mutable
   reference를 공유하지 않는다.

### 4.3 오류와 비밀 경계

- input/password/scene 검증 실패: `SPACE_V2_DOCUMENT_INVALID_INPUT`
- evidence digest mismatch 또는 SHA-256 검증 실패: `SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED`
- crypto가 `{ok:false}`, throw 또는 reject: `SPACE_V2_DOCUMENT_ENCRYPT_FAILED`
- crypto가 success처럼 보이지만 result/envelope/document shape가 invalid: `SPACE_V2_DOCUMENT_INVALID_OUTPUT`
- 함수 자체는 throw하지 않는다.
- 실패 결과는 `{ok:false, code}` 두 키뿐이다. raw scene, proof path/digest, password, token, UID/email,
  envelope/ciphertext, SDK/throw message, retry 안내를 노출하지 않는다.
- 성공 outer에도 GG-1 계약 외 token, owner, UID/email, customer text, asset path, `createdAt`을 추가하지
  않는다. asset path는 암호문 안 plaintext scene에만 존재한다.

## 5. 필수 테스트

1. strict 합성 `SpaceSceneV2` + deterministic crypto fake가 exact `SpaceDocumentV2`를 만든다.
2. crypto가 받은 값은 `readSpaceSceneV2`의 detached canonical scene이며 password는 exact non-empty
   snapshot이다. SHA-256 port는 detached evidence의 canonical bytes를 받는다.
3. valid digest는 SHA-256 1회 뒤 encryption 1회로 이어지고, digest mismatch/throw/reject/bad length는
   EVIDENCE_NOT_VERIFIED이며 encryption 0이다.
4. 호출 직후 caller scene/password source를 변경해도 digest/encryption input/result가 바뀌지 않는다.
5. invalid scene, empty/non-string password, extra/missing/non-enumerable/symbol key, hostile/proxy input은
   INVALID_INPUT이고 crypto 호출 0이다.
6. crypto success는 정확히 1회; `{ok:false}`, throw, reject는 ENCRYPT_FAILED이고 자동 retry/decrypt 0이다.
7. malformed success result와 envelope(extra/missing key, bad salt/iv/ct base64/length)는 INVALID_OUTPUT이다.
8. 실패 결과 key/JSON에 password, path, digest, ciphertext, token, UID/email, thrown message가 0이다.
9. 성공 결과를 `readSpaceDocumentV2`가 수용하고 exact outer/envelope key만 가진다.
10. 기존 `createSpaceCrypto`를 사용하는 local Web Crypto roundtrip에서 decrypt 후
   `readSpaceSceneV2`가 원 scene과 동일한 canonical 값을 수용한다. 실제 network/Firebase 호출 0이다.
11. fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Date/console 호출 0이다. module 자체의 global
    crypto/random 직접 사용 0이다.
12. `App.tsx` import/call 0, admin/customer production bundle name·bytes·SHA-256 기준 불변이다.

## 6. 검증 게이트

- 신규 targeted unit + 기존 spec 065/066 units + `vitest run packages/spaces`
- admin typecheck
- `node scripts/check.mjs` (현재 기준 unit 1805/1805 이상)
- 전체 Chromium E2E 151/151 이상
- customer entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin entry `index-D0XOQpRL.js`, 226,201 bytes, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- admin CSS `index-DJ_z3tK1.css` 9,146 bytes, unwanted selector/property scaffold 0
- 두 production bundle에 신규 module/API/error 식별자 0
- `git diff --check`, exact changed paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium이 다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

## 7. 계속 금지

- token/UUID 생성과 token↔asset UUID 관계 결정, URL/link 발급
- proof PNG decode/upload/read/delete, Firebase/Firestore create 또는 reconciliation
- `storage.rules`, `firestore.rules`, firebase/config/env, 실제 UID/project/bucket/network/data/emulator/deploy
- `App.tsx`, route, admin/customer UI/UX/CSS, viewer/open composition
- V1 parser/open/token 변경, migration/same-token rewrite
- client delete/orphan cleanup, published write, C6/backend
- package/lockfile/dependency/download/install, 앱 수준 retry/merge/fallback

## 8. STOP 조건

- exact V2 document를 만들기 위해 `@denn/spaces` 제품 API 변경이 필요함
- password 정책이나 token/asset ID 관계의 새 제품 결정이 필요함
- 허용 2개 제품 파일 밖 변경이 필요함
- baseline gate가 변경 전부터 재현 가능하게 실패함
- 실제 Firebase/Rules/UI/운영 데이터나 신규 dependency가 필요함
- 기존 Founder/user 보호 변경과 충돌함

### QUESTIONS

없음. 이 스펙은 기존 strict reader와 crypto port를 조합하는 local candidate만 만든다. token 생성,
upload/Firestore create와 UI는 후속 별도 계약이다.

### DONE (Claude) — 2026-08-21

구현 commit `35b7ffd` (계약 문서 commit `2107a72`). 제품 변경은 §3 허용 2개 신규 파일뿐이고
package/lockfile/CSS/Rules/config diff는 **0**이다.

- 신규 `apps/admin/src/space-v2/document-encryption-candidate.ts`
  — `createSpaceV2DocumentEncryptionCandidate(input, crypto, sha256)`
- 신규 `apps/admin/src/space-v2/document-encryption-candidate.test.ts` — 54 tests

호출 순서(4.2)를 그대로 구현했다:

1. input exact key `scene`/`password` 2개만 허용(extra/missing·non-enumerable·symbol·array/null·
   revoked proxy는 안전 실패).
2. password를 await 전에 한 번 읽어 로컬 string으로 보존하고 non-empty만 통과시킨다. trim/normalize/
   log/반환/오류 포함 0이며 새 정책을 만들지 않았다(공백 문자열 password는 기존 계약대로 통과).
3. `readSpaceSceneV2(scene)` 1회. 실패 시 SHA-256·crypto 호출 0.
4. reader는 digest **형식**만 보므로 `verifyFrameReplayEvidenceDigestV1(evidence, digest, sha256)`로
   암호화 전에 실제 일치까지 검증한다. mismatch·port throw/reject/bad length/bad type은 모두
   `EVIDENCE_NOT_VERIFIED`이고 encryption 호출 0이다.
5. `crypto.encryptJson(detachedScene, passwordSnapshot)` — raw caller scene은 넘기지 않는다.
6. 성공 경로에서 SHA-256 1회, `encryptJson` 1회, `decryptJson` 0회, 앱 수준 retry/fallback 0.
7. `{schema:"space-v2", enc}`를 `readSpaceDocumentV2`로 다시 검증한다. malformed envelope/
   bad base64·length·hostile crypto result는 `INVALID_OUTPUT`이다.
8. 최종 성공값은 reader가 돌려준 detached exact `SpaceDocumentV2`이며 입력·crypto result와 mutable
   reference를 공유하지 않는다.

오류는 4개(`INVALID_INPUT`/`EVIDENCE_NOT_VERIFIED`/`ENCRYPT_FAILED`/`INVALID_OUTPUT`)이고 실패
결과는 `{ok, code}` 두 키뿐이다. password·scene·proof path·digest·ciphertext·token·UID/email·thrown
message·retry 문구 0을 테스트로 고정했다. 성공 outer에도 token/owner/UID/createdAt/asset path가 없다
(asset path는 암호문 안 plaintext scene에만 존재).

검증:

- 신규 targeted unit **54/54**, space-v2(065·066·067) + `packages/spaces` 합계 **288/288**
- admin typecheck PASS, `node scripts/check.mjs` **PASS**(unit **1859/1859**, 두 앱 build)
- 전체 Chromium E2E **151/151**
- 고객 entry `index-6js4DafP.js` **322,018 bytes** / `A9360EFF…E55E8159` — 기준 일치
- admin entry `index-D0XOQpRL.js` **226,201 bytes** / `B6E90475…B3A1F1DC` — 기준 일치
- admin CSS `index-DJ_z3tK1.css` **9,146 bytes**, unwanted selector/property scaffold **0**
- 두 production bundle에 `SPACE_V2_DOCUMENT`/`createSpaceV2DocumentEncryptionCandidate`/
  `document-encryption` 문자열 **0건**
- `git diff --check` PASS, 변경 경로는 허용 2개 신규 파일뿐, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, `denn-e2e-*`/temp/debug 잔류 0

로컬 roundtrip(§5-10): 기존 `createSpaceCrypto()` 실제 Web Crypto로 암호화한 문서를 `decryptJson`으로
복호화하면 `readSpaceSceneV2`가 원 canonical scene과 **동일한 값**을 수용한다. 틀린 password는
`SPACE_DECRYPT_FAILED`다. network/Firebase 호출 0.

테스트 신뢰성(mutation): evidence 검증을 제거하면 8건이, detached scene 대신 raw caller scene을
암호화하면 1건이 실패한다. 거짓 통과가 아니다.

계속 NOT IMPLEMENTED / 금지: token/UUID 생성과 link 발급, proof upload/read/delete, Firestore create/
reconciliation, Firebase adapter/Rules/config/env, 실제 UID·network·emulator·deploy, viewer/open
composition과 UI/route, V1 migration/rewrite.

### CODEX REVIEW — CORRECTION_REQUIRED ROUND 1 (2026-08-21)

독립 게이트는 PASS했지만 필수 주입 경계 1건이 계약을 위반한다.

#### C-1 — `undefined` SHA port가 global Web Crypto fallback을 연다

현재 구현은 `sha256`을 런타임 검증하지 않고 다음 호출에 그대로 넘긴다.

```ts
verifyFrameReplayEvidenceDigestV1(scene.frameEvidence, scene.frameEvidenceDigest, sha256)
```

이 verifier의 세 번째 인자는 default `webCryptoSha256Port`를 가진다. 따라서 JS/`any` caller가
`undefined`를 전달하면 필수 주입이 거부되지 않고 `globalThis.crypto.subtle.digest`가 실행된다. 이는
§2의 “SHA-256 port 필수 주입”과 §5-11의 “module 자체 global crypto/random 직접 사용 0”을 깨며, 현재
boundary test는 유효 fake만 전달해 이 경로를 검증하지 않는다.

보완 요구:

1. `sha256.digest`와 `crypto.encryptJson`을 각자 첫 await 전에 안전하게 한 번만 읽어 callable인지
   검증한다. null/undefined/primitive/non-function/throwing getter/revoked proxy는 typed failure다.
2. SHA method snapshot을 감싼 항상-defined adapter를 verifier에 넘겨 verifier default가 활성화될 수 없게
   한다. 원래 port의 `this`가 필요할 수 있으므로 안전하게 보존한다.
3. crypto method도 snapshot한 callable만 정확히 1회 호출한다. method getter drift나 두 번 읽기를
   허용하지 않는다.
4. invalid SHA port는 `SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED`, invalid crypto port는
   `SPACE_V2_DOCUMENT_ENCRYPT_FAILED`로 매핑하고 raw message를 노출하지 않는다.
5. undefined/null/non-function/throwing getter/revoked proxy SHA port 각각에서 global
   `crypto.subtle.digest` 0, encryption 0을 unit으로 고정한다. crypto port에도 같은 malformed 사례와
   method getter one-read를 고정한다.
6. 기존 호출 순서, 오류 4개, 파일 범위와 모든 금지 경계는 유지한다.

독립 검증 결과(보완 전 candidate `35b7ffd`): unit **1859/1859**, `node scripts/check.mjs` PASS,
Chromium **151/151**, bundle identity/diff/포트/temp PASS. 이 결과는 C-1을 상쇄하지 않으므로 판정은
**CORRECTION_REQUIRED**, fix round 1이다.

### CORRECTION ROUND 1 (Claude) — 2026-08-21

보완 commit `db61c7d`. C-1만 처리했고 허용 제품 파일 2개
(`document-encryption-candidate.ts`와 해당 unit) 밖으로 나가지 않았다. 호출 순서, 오류 4개, 모든 금지
경계는 그대로다.

**원인 인정.** 기존 구현은 `sha256`을 런타임 검증 없이 `verifyFrameReplayEvidenceDigestV1`의 세 번째
인자로 넘겼다. 그 인자는 default `webCryptoSha256Port`를 가지므로 JS/`any` caller가 `undefined`를
주면 필수 주입이 거부되지 않고 `globalThis.crypto.subtle.digest`가 실행된다. 기존 boundary 테스트는
유효 fake만 넘겨 이 경로를 전혀 밟지 않았다.

보완 내용:

1. `sha256.digest`와 `crypto.encryptJson`을 **각자 첫 await 전에, 한 번씩만** 읽어 로컬에 보존하고
   callable인지 검사한다. null/undefined/primitive/method 부재/non-function/throwing getter/revoked
   proxy는 typed failure다.
2. SHA method snapshot을 감싼 **항상-defined adapter**를 verifier에 넘겨 default port가 활성화될 수
   없게 했다. adapter는 `.call(sha256, bytes)`로 원 port의 `this`를 보존한다.
3. crypto도 snapshot한 callable만 `.call(crypto, scene, password)`로 정확히 1회 호출한다. method
   getter drift나 두 번 읽기가 불가능하다.
4. invalid SHA port → `SPACE_V2_DOCUMENT_EVIDENCE_NOT_VERIFIED`, invalid crypto port →
   `SPACE_V2_DOCUMENT_ENCRYPT_FAILED`. raw message 노출 0.
5. 회귀 17건 추가: malformed SHA port 7종 각각에서 **global `crypto.subtle.digest` 0회 + encryption
   0회**, malformed crypto port 7종, SHA/crypto method getter one-read 2건, method-style(class) port
   receiver 보존 1건.

재검증:

- targeted unit **71/71**(신규 17건 포함), space-v2 전체 **180/180**,
  space-v2 + `packages/spaces` **305/305**
- admin typecheck PASS, `node scripts/check.mjs` **PASS**(unit **1876/1876**)
- 전체 Chromium E2E **151/151**
- bundle identity 불변: admin `index-D0XOQpRL.js` **226,201 bytes** / `B6E90475…B3A1F1DC`,
  admin CSS `index-DJ_z3tK1.css` **9,146 bytes**(unwanted 0), 고객 `index-6js4DafP.js`
  **322,018 bytes** / `A9360EFF…E55E8159`. 두 bundle에 spec 067 식별자 0건.
- `git diff --check` PASS, 허용 2개 파일 밖 diff 0, package/lockfile/CSS/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, temp/debug 잔류 0

mutation 확인: adapter를 없애고 raw `sha256`을 verifier에 다시 넘기면 "undefined SHA port" 회귀와
"SHA method one-read" 회귀가 실패한다. 즉 이 두 테스트가 C-1을 실제로 고정한다.

관측 기록(투명성): 보완 직후 **첫** 단일 파일 실행 1회가 transform 31.8s / import 34.6s로 정체되며
테스트 1건이 5s timeout으로 실패했다. 같은 파일을 곧바로 3회, 확대 범위를 2회 재실행했을 때는 모두
PASS(단일 0.77~2.09s, 확대 3.0~3.6s)였고 이후 전체 check와 Chromium도 PASS다. 코드 변경 없이 재현되지
않았으므로 원인은 파일 기록 직후의 로컬 I/O 정체로 판단한다. 재발하면 flaky 게이트로 보고한다.

### CODEX RE-REVIEW — 2026-08-21

최종 판정: **CODEX_PASSED / DONE**.

- HEAD=origin `c8f54cf`, ahead/behind 0/0에서 보완 `db61c7d`를 독립 검토했다. 제품 diff는 허용된
  `document-encryption-candidate.ts`와 해당 unit 두 파일뿐이다.
- SHA/crypto method first-await 전 one-read snapshot, callable fail-closed, always-defined SHA adapter,
  receiver 보존과 오류 매핑이 C-1 요구에 일치한다. verifier의 global fallback 경로는 닫혔다.
- 독립 재검증: 단일 **71/71**(288ms), 확대 **305/305**(363ms), `node scripts/check.mjs` PASS(unit
  **1876/1876**), 전체 Chromium **151/151**. 이전 일시 timeout은 독립 실행에서 재발하지 않았다.
- bundle identity, `git diff --check ab465d5..HEAD`, 지정 포트/temp 잔류 0도 PASS다. 추가 결함 0.
- token/UUID, upload, Firestore create, Firebase/Rules/network, viewer/UI는 계속 NOT IMPLEMENTED / 금지다.
- 전체 리빌드 진행도는 스펙 067의 local encrypted-document chain 완료를 반영해 **74~77% 완료 /
  23~26% 잔여**로 확정한다.
