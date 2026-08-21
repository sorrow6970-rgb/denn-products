# 스펙 068 — space V2 local issue preparation orchestrator

상태: **READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI**

## 1. 목표 (WHY)

스펙 065의 strict scene projector, 066의 immutable proof-byte candidate, 067의 verified encryption
candidate를 한 번의 local-only 준비 흐름으로 조합한다.

성공 결과는 향후 upload/create adapter가 받을 수 있는 동일 snapshot의 proof descriptor·PNG bytes와
encrypted `SpaceDocumentV2` 복사본만 제공한다. token/UUID 생성, Storage upload, Firestore create,
Firebase adapter와 UI는 시작하지 않는다.

## 2. 기준과 보존 계약

- 기준 HEAD=origin `c8f54cf`, ahead/behind 0/0.
- 스펙 065·066·067 공개 local API를 그대로 조합한다. 세 module의 제품 코드는 수정하지 않는다.
- input의 `assetId`는 caller가 이미 만든 lowercase UUID v4다. 이 단위는 UUID/token/random을 만들지
  않으며 token↔asset ID 관계도 결정하지 않는다.
- PNG bytes, catalog, selection/transform과 password는 첫 await 전에 안정 snapshot에 묶여야 한다.
- SHA-256 port와 crypto port는 필수 주입이다. method를 첫 await 전에 각각 한 번만 snapshot하고 같은
  always-defined adapter를 모든 하위 단계에 사용한다. global crypto fallback 0.
- 정상 SHA 호출은 proof bytes digest 1회, evidence create 1회, document 전 evidence verify 1회로 정확히
  **3회**다. encryption은 정확히 1회다. 중복 검증을 성능 이유로 생략하지 않는다.
- local 준비 중에는 upload가 없으므로 어느 실패도 Storage orphan을 만들지 않는다.

## 3. 허용 파일

제품 파일은 정확히 다음 신규 2개만 허용한다.

- `apps/admin/src/space-v2/issue-preparation.ts`
- `apps/admin/src/space-v2/issue-preparation.test.ts`

기록 문서는 이 스펙, 관련 handoff, STATE/NEXT/CURRENT/live log와 스펙 067 종료 상태만 허용한다.
package/lockfile/CSS/config/Firebase/Rules와 기존 065·066·067 제품 파일은 변경하지 않는다.

## 4. 구현 계약

### 4.1 입력과 결과

다음 의미의 local API를 신규 module에서 export한다.

```ts
interface SpaceV2LocalIssuePreparationInput {
  readonly catalog: CatalogDocumentV1;
  readonly selection: FramePreviewSelection;
  readonly frameOrientation: FrameOrientationV1;
  readonly logicalWidth: number;
  readonly frameColor: string;
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
  };
  readonly assetId: string;
  readonly pngBytes: Uint8Array;
  readonly password: string;
}

type SpaceV2LocalIssuePreparationErrorCode =
  | "SPACE_V2_PREPARATION_INVALID_INPUT"
  | "SPACE_V2_PREPARATION_INVALID_PORT"
  | "SPACE_V2_PREPARATION_PROOF_FAILED"
  | "SPACE_V2_PREPARATION_SCENE_FAILED"
  | "SPACE_V2_PREPARATION_DOCUMENT_FAILED";

interface PreparedSpaceV2LocalIssueCandidate {
  copyProofDescriptor(): FrameReplayEvidenceV1["proofAsset"];
  copyUploadBytes(): Uint8Array;
  copyDocument(): SpaceDocumentV2;
}

async function prepareSpaceV2LocalIssueCandidate(
  input: SpaceV2LocalIssuePreparationInput,
  crypto: SpaceCryptoPort,
  sha256: SpaceSha256Port,
): Promise<
  | { readonly ok: true; readonly value: PreparedSpaceV2LocalIssueCandidate }
  | { readonly ok: false; readonly code: SpaceV2LocalIssuePreparationErrorCode }
>;
```

app barrel과 `App.tsx`에서 export/import/call하지 않는다.

### 4.2 first-await snapshot

1. top-level input은 위 9개 enumerable own string key만 허용한다. extra/missing/non-enumerable/symbol,
   null/array/hostile/revoked proxy는 INVALID_INPUT이다.
2. password와 모든 primitive를 한 번 읽는다. password는 기존 계약대로 non-empty string인지 이 시점에
   검사한다. selection과 transform도 exact-key plain snapshot으로 만든다.
3. catalog는 첫 await 전에 `readLegacyCatalog`로 detached canonical document를 만든다. 실패는
   INVALID_INPUT이고 SHA/encryption 0이다.
4. SHA/crypto method를 첫 await 전에 각 한 번 읽어 callable인지 확인하고 receiver-preserving adapter를
   만든다. malformed port는 INVALID_PORT이며 global crypto 0이다.
5. 검증된 SHA adapter로 `prepareSpaceV2ProofAssetCandidate`를 첫 await 전에 호출해 caller PNG bytes
   snapshot이 즉시 생기게 한다. raw `pngBytes`를 이후 다시 읽지 않는다.
6. caller가 함수 반환 Promise 직후 catalog/selection/transform/password/pngBytes를 변경해도 모든 하위
   단계와 성공 결과가 최초 snapshot과 일치해야 한다.

### 4.3 단계와 fail-closed 순서

```text
snapshot + ports
  -> proof preparation (SHA #1)
  -> scene issue candidate (SHA #2)
  -> document encryption candidate: evidence verify (SHA #3) + encrypt #1
  -> immutable-copy success handle
```

- proof 실패는 PROOF_FAILED, 이후 scene/document/encryption 0.
- scene 실패는 SCENE_FAILED, document/encryption 0. proof는 local memory candidate일 뿐 upload 0.
- document 실패는 DOCUMENT_FAILED. upload/create/retry 0.
- 하위 safe code를 raw message나 path와 함께 외부로 전달하지 않는다. stage code만 반환한다.
- 성공 시 scene plaintext나 password를 반환하지 않는다.
- 자동 retry, fallback, merge, token 생성은 모두 0이다.

### 4.4 성공 snapshot

- proof descriptor와 bytes는 스펙 066의 동일 retained snapshot에서 나온다.
- encrypted document가 복호화하는 scene의 `proofAsset`은 성공 handle의 descriptor와 정확히 같다.
- `copyProofDescriptor`, `copyUploadBytes`, `copyDocument`는 호출마다 새 detached 값을 반환한다.
- 한 copy나 중첩 `enc`/descriptor를 caller가 변경해도 다음 copy와 retained bytes/document는 변하지
  않는다.
- 성공 handle에는 token, plaintext scene, password, catalog, selection, UID/email, timestamp가 없다.

## 5. 필수 테스트

1. 합성 catalog/PNG/assetId/selection/transform/password와 deterministic ports가 세 단계를 순서대로
   성공시키며 SHA 3회, encrypt 1회다.
2. SHA #1은 exact PNG snapshot, #2와 #3은 동일 canonical evidence bytes다.
3. decrypt roundtrip의 strict scene proof descriptor가 handle descriptor와 일치한다.
4. top-level/nested exact keys와 hostile input, invalid catalog/password/PNG는 해당 단계 전에 fail-closed한다.
5. malformed SHA/crypto port와 drifting method getter는 first-await one-read, global crypto 0으로 실패한다.
6. proof/scene/document 단계별 child failure가 이후 호출을 정확히 0으로 막는다.
7. Promise 반환 직후 모든 caller-owned 입력을 바꾸는 deferred SHA 회귀에서도 최초 snapshot만 사용한다.
8. 각 copy method가 fresh deep copy를 주며 caller mutation이 다음 copy에 영향 0이다.
9. 실패 결과는 `{ok,code}`뿐이고 password/path/digest/bytes/ciphertext/token/UID/email/thrown message 0.
10. fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Date/random/console/upload/create/delete 호출 0.
11. `App.tsx` import/call 0, production bundle identity 불변.

## 6. 검증 게이트

- 신규 targeted + 기존 space-v2 modules + `packages/spaces` (현재 305개 이상 회귀)
- admin typecheck
- `node scripts/check.mjs` (현재 unit 1876/1876 이상)
- 전체 Chromium E2E 151/151 이상
- customer entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin entry `index-D0XOQpRL.js`, 226,201 bytes, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- admin CSS `index-DJ_z3tK1.css` 9,146 bytes, unwanted utility 0
- 두 production bundle에 신규 module/API/error 식별자 0
- `git diff --check`, exact paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium이 다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

## 7. 계속 금지

- token/UUID 생성, token↔asset ID 관계 결정, URL/link 발급
- PNG browser decode, Storage upload/read/delete와 orphan 처리
- Firestore `spaces/{token}` create/read-back/reconciliation
- Firebase adapter, Rules/config/env, 실제 UID/project/bucket/network/data/emulator/deploy
- `App.tsx`, route, admin/customer UI/UX/CSS, viewer/open composition
- V1 변경/migration/rewrite, published write, C6/backend
- package/lockfile/dependency/download/install, retry/merge/fallback

## 8. STOP 조건

- 기존 065·066·067 제품 API 수정이 필요함
- token/asset ID 관계, password 정책 또는 새로운 error/metadata 정책 결정이 필요함
- 허용 신규 제품 파일 2개 밖 변경이 필요함
- baseline gate가 변경 전부터 재현 가능하게 실패하거나 timeout/flaky가 재발함
- 실제 Firebase/Rules/UI/운영 데이터나 신규 dependency가 필요함
- 기존 Founder/user 보호 변경과 충돌함

### QUESTIONS

없음. 이 단위는 통과한 local 경계 세 개의 snapshot-safe 조합만 만든다. 실제 발급과 Firebase/UI는
후속 별도 계약이다.
