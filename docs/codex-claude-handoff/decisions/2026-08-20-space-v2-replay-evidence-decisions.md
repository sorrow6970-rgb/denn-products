# space V2 frame replay evidence Founder decisions

- 결정일: 2026-08-20
- 기준 HEAD: `2b8424e` (스펙 063 종료)
- 관련 스펙: `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`
- 상태: **APPROVED / FIRST LOCAL-ONLY CONTRACT IMPLEMENTED / READY_FOR_CODEX / NO NETWORK / NO UI**

## 1. Founder 승인

Founder는 이번 대화에서 다음을 승인했다.

- **GG-1=A:** outer `space-v2`와 plaintext `space-scene-v2`를 V1과 분리하고, 새 UUID token만 쓴다.
  V1 parser/token은 변경하지 않으며 migration과 same-token rewrite는 0이다.
- **GG-2=A:** whole-catalog hash가 아니라 닫힌 `FrameReplayEvidenceV1` snapshot과 versioned canonical
  SHA-256을 사용한다. viewer가 현재 catalog를 조용히 채택하지 않는다.
- **GG-3=A:** 첫 capability는 image-only single-rect frame이다. non-empty text, template art, clock,
  room/gallery는 unsupported다.
- **GG-4=A:** 향후 V2 proof asset 목표 경계는
  `rebuild-space-assets/objects/{lowercase UUID v4}.png` create-only/public-read/update-delete false와
  encrypted digest/metadata다. 현재 `proofs/**`는 V2에 사용하지 않는다.
- **GG-5=A:** V1 create 호환은 유지하고 향후 `space-v2` create만 approved operator UID와 exact outer
  keys로 제한한다.
- **GG-6=A:** 첫 구현은 local-only `@denn/spaces` V2 reader, evidence encoder, injected SHA-256
  port/fake unit으로 제한한다.

이 승인은 첫 로컬 계약 구현만 연다. Rules 변경·실제 UID·Firebase adapter·asset upload·Firestore create·
issuer/viewer/UI 연결·운영 발급·배포를 승인하지 않는다.

## 2. 첫 로컬 계약의 exact shape

### 2.1 outer document

허용 키는 정확히 `schema`, `enc` 두 개다. `enc`의 허용 키도 정확히 `salt`, `iv`, `ct`이며 기존 V1
crypto envelope의 standard-base64 및 byte-length 계약을 재사용한다.

```ts
interface SpaceDocumentV2 {
  readonly schema: "space-v2";
  readonly enc: { readonly salt: string; readonly iv: string; readonly ct: string };
}
```

owner label, email, UID, customer text, token, asset path, `createdAt`은 outer document에 없다.

### 2.2 encrypted plaintext

허용 키와 중첩 키는 아래 shape와 정확히 같아야 한다. future field는 현재 parser가 무시하지 않고
fail-closed하며 새 scene/evidence version에서만 추가한다.

```ts
interface SpaceSceneV2 {
  readonly schema: "space-scene-v2";
  readonly productKind: "frame";
  readonly frameEvidence: {
    readonly replayContract: "frame-logical-plan-v1";
    readonly frameOrientation: "portrait" | "landscape";
    readonly logicalWidth: number;
    readonly geometry: {
      readonly aspect: number;
      readonly borderPercentOfWidth: number;
      readonly matColor: string;
      readonly contentInsetPx: 0 | 8;
    };
    readonly frameColor: string;
    readonly transformEncoding: "normalized-max-pan-v1";
    readonly transform: {
      readonly scale: number;
      readonly x: number;
      readonly y: number;
      readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
    };
    readonly proofAsset: {
      readonly objectPath: string;
      readonly sha256: string;
      readonly byteLength: number;
      readonly contentType: "image/png";
      readonly intrinsicWidth: number;
      readonly intrinsicHeight: number;
    };
    readonly templateArt: { readonly kind: "none" };
    readonly textMode: "none";
    readonly clockMode: "off";
  };
  readonly frameEvidenceDigest: {
    readonly algorithm: "SHA-256";
    readonly encoding: "denn-frame-evidence-v1";
    readonly value: string;
  };
  readonly roomCapability: "unsupported";
}
```

검증 범위는 다음과 같다.

- `logicalWidth`, `byteLength`, `intrinsicWidth`, `intrinsicHeight`는 positive safe integer다.
- `byteLength`는 20 MiB 미만, 즉 `1..20,971,519`다.
- `aspect`와 `borderPercentOfWidth`는 finite positive number다.
- `matColor`와 `frameColor`는 uppercase `#RRGGBB`다.
- `scale`은 `1..5`, `x`와 `y`는 `-1..1`의 finite number다. accepted `-0`은 canonical snapshot에서
  `0`으로 정규화한다.
- portrait는 effective `aspect >= 1`, landscape는 `aspect <= 1`이다. square(`aspect === 1`)는 두
  orientation 모두 허용하지만 명시 선택값을 보존한다.
- `objectPath`는 정확히
  `rebuild-space-assets/objects/{lowercase UUID v4}.png` 형식이다.
- proof `sha256`과 `frameEvidenceDigest.value`는 각각 decoded length가 정확히 32 bytes인 standard
  base64다.
- unknown/extra/missing key, array/object kind mismatch, non-finite number, hostile getter/proxy,
  circular input은 throw나 부분 성공 대신 안전 실패다.

## 3. canonical evidence encoding

임의 object의 key insertion order를 정본으로 삼지 않는다. validator가 모든 입력을 한 번 읽어 detached
snapshot을 만든 뒤, 다음 fixed-position tuple을 `JSON.stringify`하고 그 exact UTF-8 bytes를 SHA-256한다.

```text
[
  "denn-frame-evidence-v1",
  "frame-logical-plan-v1",
  frameOrientation,
  logicalWidth,
  aspect,
  borderPercentOfWidth,
  matColor,
  contentInsetPx,
  frameColor,
  "normalized-max-pan-v1",
  scale,
  x,
  y,
  rotationQuarterTurns,
  objectPath,
  proofSha256,
  byteLength,
  "image/png",
  intrinsicWidth,
  intrinsicHeight,
  "none",
  "none",
  "off"
]
```

- number text는 validated finite number에 대한 ECMAScript `JSON.stringify` 결과다.
- digest output은 standard base64의 32-byte SHA-256이다.
- `frameEvidenceDigest` 자체는 digest input에 포함하지 않는다.
- digest는 orientation, geometry, transform과 proof identity/bytes metadata를 모두 묶지만 운영자
  signature나 backend attestation은 아니다.

## 4. 첫 구현 파일과 API 경계

제품 변경 허용 후보는 다음 세 파일뿐이다.

- `packages/spaces/src/v2.ts` (신규)
- `packages/spaces/src/v2.test.ts` (신규)
- `packages/spaces/src/index.ts` (V2 명시 export만)

필요한 공개 표면은 다음 의미를 충족하되 이름은 스펙 정본과 일치시킨다.

- V2 document/scene/version/encoding constants와 readonly types
- `readSpaceDocumentV2(input)`와 `readSpaceSceneV2(input)`
- `encodeFrameReplayEvidenceV1(input)` — validated detached snapshot과 canonical `Uint8Array`
- injected `SpaceSha256Port`와 digest create/verify 함수
- default SHA-256은 local `globalThis.crypto.subtle.digest("SHA-256", bytes)`만 사용한다.

최소 안전 오류 코드는 `SPACE_V2_INVALID_DOCUMENT`, `SPACE_V2_INVALID_SCENE`,
`SPACE_V2_INVALID_EVIDENCE`, `SPACE_V2_DIGEST_FAILED`, `SPACE_V2_DIGEST_MISMATCH`다. 실패 결과와 throw에
raw input/path/token/password/object bytes/SDK error message를 노출하지 않는다. injected digest가 throw,
reject 또는 32 bytes가 아닌 결과를 내면 안전 실패한다.

기존 `SPACE_SCENE_VERSION`, V1 reader/open/types/constants의 의미와 결과는 바꾸지 않는다. V2 reader는
구조를 검증할 뿐 network, Firebase, DOM, React, Canvas 또는 viewer pipeline을 시작하지 않는다.

## 5. 검증 계약

- exact outer/scene/nested keys, enum/range/color/path/UUID/base64/byte cap/intrinsic size 검증
- fixed canonical byte vector와 built-in Web Crypto SHA-256 vector
- source object key order가 달라도 같은 canonical bytes
- tuple의 각 필드 값 변화가 digest를 변화시킴
- hostile/drifting getter one-read snapshot, proxy/circular/non-finite fail-closed
- injected hash 호출 1회, throw/reject/bad-length/mismatch safe mapping
- unsupported text/art/clock/room을 accepted capability로 축소하지 않음
- 기존 V1 tests/result/export semantics 무변경
- targeted spaces unit/typecheck와 `node scripts/check.mjs`; 실제 network는 0

전체 Chromium 회귀를 실행할 경우 기존 E2E가 보호 대상 spec-018 PNG 두 개를 다시 쓰는 부수효과를
만든다. 그 파일은 restore/checkout/stage/commit하지 않고 기존 dirty 상태로 남겨야 한다.

## 6. 계속 닫힌 범위

- `storage.rules`, `firestore.rules`, `firebase.json`, env/config와 실제 UID 값
- Firebase SDK adapter, Storage upload/read, Firestore document create/reconciliation
- token 발급, issuer projector, admin/customer UI·CSS, viewer/open composition
- V1 migration/rewrite, text/font/art/clock/room/gallery capability
- orphan delete/cleanup, published write, C6/backend, dependency/package/lockfile 변경
- 실제 Firebase/project/bucket/object/network/data 및 emulator/live/deploy

GG-4/GG-5의 목표 방향 승인은 Rules 구현·배포 승인이 아니다. 실제 UID 정본, 별도 Rules 계약과 emulator
검증·배포 승인이 있기 전 운영 V2 발급을 열지 않는다.
