# 스펙 066 — space V2 local proof asset preparation

상태: **IMPLEMENTED / READY_FOR_CODEX / LOCAL_ONLY / NO_NETWORK / NO_UI**

기준 HEAD: `3681cb9` (스펙 065 종료 및 HOLD 확인)

## 1. 목표

스펙 064는 V2 evidence의 `proofAsset` shape를 확정했고, 스펙 065 local issuer projector는 그
descriptor를 입력으로 받는다. 그러나 PNG bytes와 descriptor가 같은 immutable byte snapshot에서
나왔다는 것을 만드는 경계는 아직 없다.

이번 단위는 admin 앱의 호출되지 않는 local-only 모듈로 다음만 수행한다.

1. caller의 PNG bytes를 await 전에 한 번 복사한다.
2. 승인된 lowercase UUID v4에서
   `rebuild-space-assets/objects/{assetId}.png` 경로를 만든다.
3. PNG signature와 첫 IHDR에서 intrinsic width/height를 읽는다.
4. 복사된 exact bytes의 SHA-256을 계산해 스펙 064 `proofAsset` descriptor를 만든다.
5. 이후 upload 단계가 같은 snapshot을 받을 수 있도록 매번 새 복사본을 반환하는 local handle을 만든다.

Firebase, upload, token, encryption, Firestore create, UI, Canvas PNG 생성은 없다. Founder GG-4=A의 이미
승인된 경로·PNG·digest 방향을 좁은 로컬 경계로 구체화할 뿐 Rules·운영 권한·배포를 열지 않는다.

## 2. 구조 결정

### I-1 — 위치와 공개 표면

- 신규 `apps/admin/src/space-v2/proof-asset-candidate.ts`에 둔다.
- 신규 `proof-asset-candidate.test.ts`만 추가한다.
- `App.tsx`, route, barrel export에서 import/call하지 않는다.
- `apps/admin`은 스펙 065에서 이미 `@denn/spaces` workspace dependency를 가진다. package/lockfile
  변경은 0이다.
- `packages/spaces`, `packages/shared`, `packages/firebase` 제품 파일을 변경하지 않는다.

공개 의미는 아래와 같다. 구현 이름은 더 명확하게 다듬을 수 있지만 범위는 넓히지 않는다.

```ts
interface SpaceV2ProofAssetCandidateInput {
  readonly assetId: string;
  readonly pngBytes: Uint8Array;
}

interface PreparedSpaceV2ProofAssetCandidate {
  readonly descriptor: FrameReplayEvidenceV1["proofAsset"];
  readonly copyUploadBytes: () => Uint8Array;
}

async function prepareSpaceV2ProofAssetCandidate(
  input: SpaceV2ProofAssetCandidateInput,
  sha256: SpaceSha256Port,
): Promise<SpaceV2ProofAssetPreparationResult>;
```

SHA-256 port는 **필수 주입**이다. 이번 단위에서 새로운 global Web Crypto wrapper나 Firebase adapter를
만들지 않는다.

### I-2 — input snapshot과 UUID

- input은 enumerable own string key `assetId`, `pngBytes` 정확히 두 개만 허용한다.
- `assetId`는 lowercase RFC 4122 UUID v4 형식만 허용한다. path 전체를 caller에게 받지 않는다.
- UUID/random은 이 함수가 생성하지 않는다. 향후 issue orchestration이 작업 시작 시 한 번 생성해
  전달한다. `Date`, `Math.random`, `crypto.randomUUID` 호출 0이다.
- `pngBytes`는 `Uint8Array`만 허용하고 함수 진입 중 await 전에 exact copy를 만든다. detached buffer,
  Proxy/throw, concurrent mutation 가능성이 있는 `SharedArrayBuffer` view는 안전 실패한다.
- caller가 원본 bytes를 나중에 바꿔도 hash·descriptor·upload copy가 변하지 않아야 한다.

### I-3 — PNG 최소 구조 검증과 intrinsic dimensions

외부 PNG parser dependency를 추가하지 않는다. 다음 최소 구조만 직접 확인한다.

- 8-byte PNG signature가 정확히 `89 50 4E 47 0D 0A 1A 0A`
- 첫 chunk length가 정확히 13
- 첫 chunk type이 정확히 ASCII `IHDR`
- IHDR width/height는 unsigned big-endian 32-bit이며 각각 `1..2^31-1`의 safe integer
- IHDR data와 CRC 위치까지 bytes가 존재하도록 최소 33 bytes
- 전체 byte length는 스펙 064와 동일하게 `1..20,971,519`이고 상한 이상은 실패

이번 검사는 PNG 전체 CRC/chunk sequence/IDAT/IEND 또는 browser decode 성공을 증명하지 않는다.
따라서 성공 의미는 **V2 descriptor를 만들 수 있는 PNG-header candidate**다. 실제 decode·pixel 검증은
후속 asset/viewer 단계에서 별도로 fail-closed해야 한다. 이 제한을 주석과 문서에서 숨기지 않는다.

intrinsic width/height는 caller 숫자를 신뢰하지 않고 IHDR에서만 얻는다.

### I-4 — digest와 byte identity

- 모든 입력 검증과 PNG header 검증 뒤에만 `sha256.digest()`를 정확히 한 번 호출한다.
- digest port에는 보존 snapshot 자체가 아니라 별도 복사본을 전달해, 악성 fake가 인자를 바꿔도 보존
  snapshot이 오염되지 않게 한다.
- throw/reject 또는 `Uint8Array`가 아닌 결과, 32 bytes가 아닌 결과는 안전 digest 실패다.
- digest는 standard base64로 encoding한다. URL-safe base64나 hex를 사용하지 않는다.
- 성공 descriptor는 정확히 다음 shape다.

```ts
{
  objectPath: `rebuild-space-assets/objects/${assetId}.png`,
  sha256: standardBase64Of32ByteDigest,
  byteLength: snapshot.byteLength,
  contentType: "image/png",
  intrinsicWidth: ihdrWidth,
  intrinsicHeight: ihdrHeight,
}
```

- 성공 전에 descriptor를 스펙 064의 public strict reader/encoder 경계로 검증할 수 없다면, 최소한
  스펙 065 projector의 valid proof input을 사용한 integration unit으로 실제 수용을 증명한다.
  `@denn/spaces` 제품 API를 넓히기 위해 파일을 수정하지 않는다.
- `copyUploadBytes()`는 호출할 때마다 fresh `Uint8Array`를 반환한다. 한 반환값을 caller가 바꿔도 다음
  반환값과 descriptor가 변하지 않는다. 원본 caller buffer 참조를 결과에 보존하지 않는다.
- 이 함수는 upload를 수행하지 않으며 `copyUploadBytes()` 호출 횟수를 network retry 의미로 해석하지
  않는다.

### I-5 — 안전 오류

최소 오류 코드는 다음 의미를 분리한다.

- `SPACE_V2_PROOF_INVALID_INPUT`
- `SPACE_V2_PROOF_INVALID_PNG`
- `SPACE_V2_PROOF_TOO_LARGE`
- `SPACE_V2_PROOF_DIGEST_FAILED`

실패 결과는 `{ok:false, code}`만 가진다. bytes, UUID/path, digest, PNG header 값, token/password/email/
UID, SDK/thrown message를 오류·로그·UI에 넣지 않는다. 함수는 throw하지 않고 자동 retry/fallback을
수행하지 않는다.

## 3. 허용 파일

제품·테스트:

- 신규 `apps/admin/src/space-v2/proof-asset-candidate.ts`
- 신규 `apps/admin/src/space-v2/proof-asset-candidate.test.ts`

문서:

- 이 스펙
- 신규 `docs/handoff/2026-08-21-spec-066-space-v2-local-proof-asset-preparation-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

다른 파일이 필요하면 STOP하고 질문한다. 기존 `packages/ui/src/theme.css`의
`@source not "../../../apps/admin/src/space-v2/**/*";`가 이 비-UI 파일도 이미 제외하므로 CSS/config
변경은 0이어야 한다.

## 4. 필수 테스트

1. fixed lowercase UUID v4 + 합성 PNG bytes가 exact path, standard-base64 SHA-256, byteLength, IHDR
   width/height, `image/png` descriptor를 만든다.
2. 별도 독립 SHA-256 fixed vector와 결과가 일치한다.
3. digest는 성공에서 정확히 1회이며 입력 검증/PNG 실패/oversize에서는 0회다.
4. UUID uppercase/non-v4/bad variant/path-like 문자열, extra/missing/non-enumerable/symbol key,
   non-Uint8Array, detached/shared bytes는 안전 실패한다.
5. bad/truncated signature, first chunk length/type 오류, zero/too-large width·height는 invalid PNG다.
6. byte length가 정확히 `20,971,519`이면 허용되고 `20,971,520`이면 TOO_LARGE다. 큰 fixture는 필요한
   byte 수만 메모리에 만들고 외부 파일/network를 사용하지 않는다.
7. digest throw/reject/bad type/bad length는 raw message 없이 DIGEST_FAILED다.
8. 호출 직후 원본 mutation, digest fake의 인자 mutation, 성공 뒤 반환 upload copy mutation에도 다음
   copy와 descriptor가 불변이다.
9. `copyUploadBytes()`의 두 반환값은 서로 다른 객체지만 byte-identical이다.
10. 성공 descriptor가 스펙 065 issue projector의 proof input으로 실제 수용된다.
11. fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Blob URL/random/Date/log 호출 0이다.
12. `App.tsx` import/call 0, admin/customer production bundle name·bytes·SHA-256 기준 불변이다.

## 5. 검증 명령과 게이트

- 신규 targeted unit + 스펙 065 issue candidate unit
- `vitest run packages/spaces` 전체
- admin typecheck
- `node scripts/check.mjs`
- 전체 Chromium E2E **151/151 이상**
- customer entry 기준:
  `index-6js4DafP.js`, 322,018 bytes,
  SHA-256 `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin entry 기준:
  `index-D0XOQpRL.js`, 226,201 bytes,
  SHA-256 `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- admin CSS `index-DJ_z3tK1.css` 9,146 bytes와 unwanted selector/property scaffold 0 유지
- `git diff --check`, exact changed paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium이 다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

## 6. 계속 금지

- `App.tsx`, route, UI/UX/CSS, 시각 결과
- Canvas render/toBlob과 고객 local export 변경
- UUID/token/password 생성, PBKDF2/AES-GCM, link 발급
- Firebase adapter, Auth, Storage upload/read/delete, Firestore create/reconciliation
- Rules/firebase config/env, emulator, 실제 Firebase/network/UID/data, deploy
- V2 viewer/open composition, V1 migration/rewrite
- client delete/orphan cleanup, published write, C6/backend
- package/lockfile/의존성/download/install, 자동 retry/merge/fallback

## 7. STOP 조건

- PNG bytes와 descriptor를 같은 snapshot으로 묶으려면 허용 파일 밖 API 변경이 필요함
- full PNG decode/CRC 검증 또는 신규 dependency가 필요함
- `@denn/spaces` public API 변경이 필요함
- baseline bundle/gate가 변경 전부터 재현 가능하게 실패함
- 실제 Firebase/Rules/UI 또는 새 운영 정책 결정이 필요함
- 기존 Founder/user 보호 변경과 충돌함

### QUESTIONS

없음. 이번 단위는 GG-4=A의 승인된 경로·PNG·digest shape를 local immutable snapshot 경계로만
구체화한다. full PNG decode, upload와 V2 발급은 후속 승인 대상이다.

### DONE (Claude) — 2026-08-21

구현 commit `9fee315` (계약 문서 commit `1ede90c`). 제품 변경은 정본 §3의 허용 2개 파일뿐이고
package/lockfile/Rules/config diff는 **0**이다.

- 신규 `apps/admin/src/space-v2/proof-asset-candidate.ts`
  — `prepareSpaceV2ProofAssetCandidate(input, sha256)`
- 신규 `apps/admin/src/space-v2/proof-asset-candidate.test.ts` — 55 tests

구조:

- I-1 admin local 모듈. `App.tsx`/route/barrel import 0, `@denn/spaces` 기존 dependency만 사용,
  shared/spaces/firebase 제품 파일 무변경.
- I-2 input은 enumerable own string key `assetId`/`pngBytes` 정확히 2개만 허용한다. `assetId`는
  lowercase UUID v4만 받고 path 전체는 받지 않는다. `pngBytes`는 `Uint8Array`만 받고 **await 전에**
  `new Uint8Array(pngBytes)`로 한 번 복사한다. SharedArrayBuffer view와 detached/empty view는 안전
  실패다. UUID/random/Date 생성 0.
- I-3 signature 8 bytes, 첫 chunk length 13, 첫 chunk type `IHDR`, IHDR width/height(1..2^31-1),
  최소 33 bytes, 상한 20,971,519만 직접 확인한다. 외부 PNG parser dependency 0.
  **이 성공은 full PNG decode를 증명하지 않는다** — CRC/chunk sequence/IDAT/IEND/browser decode는
  NOT TESTED이고, 모듈 상단 주석과 unit 상단 주석에 그대로 적어 숨기지 않았다.
- I-4 모든 검증 뒤에만 `sha256.digest()`를 정확히 1회 호출하고, port에는 보존 snapshot이 아니라
  **별도 복사본**을 넘긴다. 결과가 `Uint8Array`가 아니거나 32 bytes가 아니면 안전 실패다. digest는
  standard base64(URL-safe/hex 아님)다. `copyUploadBytes()`는 매번 새 `Uint8Array`를 반환한다.
- I-5 오류는 `SPACE_V2_PROOF_INVALID_INPUT`/`_INVALID_PNG`/`_TOO_LARGE`/`_DIGEST_FAILED` 4개이고
  실패 결과는 `{ok, code}`만 가진다. bytes/UUID/path/digest/PNG header 값/token/password/UID/email/
  thrown message 0을 테스트로 고정했다. throw 0, 자동 retry/fallback 0.

검증:

- 신규 targeted unit **55/55**, space-v2(065+066) + `packages/spaces` 합계 **234/234**
- admin typecheck PASS, `node scripts/check.mjs` **PASS**(unit **1805/1805**, 두 앱 build)
- 전체 Chromium E2E **151/151**
- 고객 entry `index-6js4DafP.js` **322,018 bytes** / SHA-256 `A9360EFF…E55E8159` — 기준 일치
- admin entry `index-D0XOQpRL.js` **226,201 bytes** / SHA-256 `B6E90475…B3A1F1DC` — 기준 일치
- admin CSS `index-DJ_z3tK1.css` **9,146 bytes**, `.transform`/`.italic`/rotate·skew scaffold **0건**
- 두 앱 bundle 어디에도 `SPACE_V2_PROOF`/`prepareSpaceV2ProofAssetCandidate`/`rebuild-space-assets`
  문자열 **0건**
- `git diff --check` PASS, 변경 경로는 허용 2개 신규 파일뿐, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, `denn-e2e-*`/temp/debug 잔류 0

테스트 신뢰성 확인(mutation): snapshot 복사를 없애면 "caller buffer 사후 변형" 테스트가, digest port
전용 복사본을 없애면 "port가 인자를 변형" 테스트가 각각 실패한다. 거짓 통과가 아니다.

SHA-256 fixed vector는 `node:crypto` createHash로 독립 계산한 값
`qnSaWoyx47Xk9xTr2cXmRtN0swaEGgU6OmLPO5gnxIs=`이며, 주입한 Web Crypto port 결과와 일치한다.
성공 descriptor가 스펙 065 issue projector의 proof input으로 실제 수용되는 것도 integration unit으로
고정했다.

계속 NOT IMPLEMENTED / NOT TESTED / 금지: 실제 upload·Firebase·network·UID·emulator·deploy,
token/UUID 생성, encryption, Firestore create, viewer/UI/route 연결, full PNG decode/CRC 검증.
