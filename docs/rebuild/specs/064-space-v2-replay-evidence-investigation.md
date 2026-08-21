# 스펙 064 — space V2 frame replay evidence local 계약

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI**

기준 HEAD: `2b8424e` (스펙 063 종료)

## 1. 목표 (WHY)

스펙 062~063은 orientation·capture basis가 없는 `space-scene-v1`을 안전하게 차단했다. 다음 단계는
V1을 억지로 복원하는 것이 아니라, 새 immutable token이 발급 당시의 frame logical plan을 다시 만들 수
있도록 V2 scene의 증거 범위를 정하는 일이다.

조사는 완료됐고 Founder가 **GG-1=A~GG-6=A**를 승인했다. 이 문서는 첫 local-only 구현 계약까지
정밀화한다. 첫 구현은 `@denn/spaces` V2 parser/evidence encoder/hash port와 unit에 한정하며 UI/CSS,
Firebase adapter, Rules/config, 실제 Firebase/network/운영 데이터는 계속 범위 밖이다.

Founder 결정 정본:
`docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`.

## 2. 확인된 현재 사실

### 2.1 현재 space read/open은 V1 전용이다

- document parser는 outer `schema:'space-v1'`만 받는다
  (`packages/spaces/src/read.ts:3,103-124`).
- plaintext parser와 open result도 `space-scene-v1`/`SpaceSceneV1` 전용이다
  (`packages/spaces/src/read.ts:27-58,128-206`, `packages/spaces/src/open.ts:10-50`).
- V1 reader를 optional-field 방식으로 넓히면 old/new 의미가 섞인다. FF-3=A는 별도 version을 이미
  선택했고 FF-4=A는 same-token rewrite를 금지했다.

### 2.2 orientation만 추가해도 exact replay는 성립하지 않는다

현재 frame product plan은 다음 catalog-derived 값과 runtime 값을 사용한다.

- effective aspect, border percent, mat color, `contentInsetPx` 0/8, text zone style, physical clock preview
  (`packages/shared/src/catalog/preview/project.ts:360-400`).
- selected frame color, positive integer `logicalWidth`, decoded proof intrinsic size, transform, optional art,
  text values와 text measurement (`apps/mockup/src/canvas/productPlan.ts:301-390`).

특히 `contentInsetPx`는 비율이 아니라 logical px이고 plan height는 `round(logicalWidth * aspect)`다.
따라서 orientation·normalized transform만 저장하고 viewer의 현재 폭을 쓰면 발급 당시 logical plan과
같다는 근거가 없다. V2 evidence에는 발급 시 canonical `logicalWidth`와 effective geometry가 필요하다.

### 2.3 현재 catalog revision은 historical proof가 아니다

V1 catalog의 `__opRev`/`__cloudRev`는 legacy read model에 존재하지만 published catalog와 특정 frame
projection의 immutable identity를 증명하는 계약이 아니다. 전체 catalog hash는 unrelated brand/model/room
변경에도 기존 link를 깨고, 반대로 어떤 필드가 실제 plan에 영향을 주는지 설명하지 못한다.

따라서 권장 fingerprint 입력은 전체 catalog가 아니라 issuer가 현재 검증된 projector로 만든 닫힌
`FrameReplayEvidenceV1` snapshot이다. viewer는 current catalog를 조용히 채택하지 않고 이 snapshot으로
동일한 versioned logical plan을 만든다.

### 2.4 SHA-256 fingerprint의 정확한 의미

AES-GCM은 password로 복호화되는 plaintext의 무결성을 이미 제공한다. 별도 SHA-256은 다음 용도다.

- 닫힌 evidence의 canonical byte encoding version을 고정
- issuer와 viewer가 같은 evidence bytes를 사용했는지 확인
- asset bytes가 발급 시 bytes와 같은지 확인

SHA-256은 운영자가 발급했다는 전자서명도, backend attestation도 아니다. 누군가 scene과 hash를 함께 새로
만들 수 있다면 둘은 함께 일치한다. 운영자 발급 제한은 별도 Auth/Rules 경계이며, backend signature는
이번 후보에 없다.

### 2.5 현재 `proofs/**`는 V2 immutable asset 경로가 아니다

현재 Storage Rules는 `proofs/{p=**}`에 `allow write: if okSize()`를 둔다(`storage.rules:60`). create,
update, delete를 구분하지 않으므로 기존 object overwrite/delete가 가능하다. scene에 digest를 저장하면
변조 뒤 잘못 그리는 대신 fail-closed할 수는 있지만 object 보존 자체는 보장하지 못한다.

V2 exact frame 후보에는 별도 create-only 경로와 immutable object identity가 필요하다. 권장 후보는
`rebuild-space-assets/objects/{assetId}.png`이고 `assetId`는 issue 작업 시작 시 한 번 생성한 UUID다.
token, UID, email, 고객 문구, catalog ID, 시간을 path에 넣지 않는다.

### 2.6 Firestore document는 immutable이지만 V2 issuer 제한이 없다

현재 `/spaces/{token}`은 public read, unconditional create, update/delete false다
(`firestore.rules:19-22`). 새 token document의 불변성은 있지만, `space-v2`를 승인된 운영자만 만들게 하는
분기는 없다. V1 create 호환을 유지하면서 V2만 approved UID로 제한하려면 Rules 변경이 필요하다.

실제 운영자 UID는 여전히 UNCONFIRMED다. UID 정본, emulator PASS와 별도 배포 승인 전에는 live Rules와
운영 발급을 열 수 없다.

### 2.7 rebuild issuer는 아직 없다

rebuild에는 read/open/viewer만 있고 V2 encrypt/upload/document-create port와 admin issuer composition은 없다.
legacy issuer는 12 random bytes의 24-hex token을 만들고 `proofs/` upload 뒤 `spaces/{token}`을 쓴다
(`denn-mockup-tool.html:15550-15576,15725-15744`). 이 경로를 V2 구현 정본으로 재사용하지 않는다.

## 3. 승인된 첫 V2 local shape

### 3.1 outer document

```ts
interface SpaceDocumentV2 {
  readonly schema: "space-v2";
  readonly enc: { readonly salt: string; readonly iv: string; readonly ct: string };
}
```

- token은 issue 작업마다 한 번 생성한 새 UUID. V1 token update/migration 0.
- outer document에 owner label, email, UID, customer text, asset path를 두지 않는다.
- `createdAt`도 첫 V2 outer 계약에는 없다. 허용 키는 정확히 `schema`, `enc`; `enc`는 정확히
  `salt`, `iv`, `ct`이며 기존 V1 crypto envelope의 standard-base64/byte-length 계약을 재사용한다.
- 기존 V1 document parser/open/constants는 변경하지 않는다. 첫 단위는 별도 V2 reader만 export하고
  Firebase/viewer dispatcher는 후속 계약으로 둔다.

### 3.2 encrypted plaintext의 first capability

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

허용 키는 모든 depth에서 위 shape와 정확히 같다. unknown/extra/missing key를 무시하지 않는다.
`logicalWidth`, proof byte length/intrinsic dimensions는 positive safe integer이고 proof byte length는
20 MiB 미만(`1..20,971,519`)이다. aspect와 border percent는 finite positive, 색은 uppercase
`#RRGGBB`, scale은 `1..5`, x/y는 `-1..1`, inset과 quarter-turn은 위 literal만 허용한다. accepted `-0`은
canonical snapshot에서 `0`으로 정규화한다.

`frameOrientation`은 photo rotation과 별개다. portrait는 effective H/W `aspect >= 1`, landscape는
`aspect <= 1`이어야 한다. square는 두 orientation이 같은 geometry를 가질 수 있으나 명시 선택값은
보존한다. clamp/default/이름 추론은 0이다. object path는 정확히
`rebuild-space-assets/objects/{lowercase UUID v4}.png`, 두 SHA-256 값은 decoded length 32 bytes의 standard
base64다.

### 3.3 `FrameReplayEvidenceV1` canonical encoding

placeholder, 이름, catalog raw object, source index, URL, token, owner metadata는 digest 입력이 아니다.
일반 `JSON.stringify(input object)`의 key insertion order도 정본이 아니다. validator가 모든 필드를 한 번
읽어 detached snapshot을 만든 뒤 아래 fixed-position tuple을 `JSON.stringify`한 exact UTF-8 bytes가
`denn-frame-evidence-v1`이다.

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

number text는 validated finite number에 대한 ECMAScript `JSON.stringify` 결과다. digest는 tuple의
SHA-256을 standard base64로 만든 값이며 `frameEvidenceDigest` 자신은 input에 포함하지 않는다.
hostile/drifting getter, proxy, circular input은 throw나 부분 성공이 아니라 safe failure다.

viewer는 current catalog와 fingerprint가 같으면 성공하는 방식이 아니라, validated evidence snapshot으로
versioned plan을 만든다. current catalog를 재조회해 새 geometry를 자동 채택하지 않는다.

## 4. initial capability를 좁히는 이유

### text/font

non-empty text는 zone style뿐 아니라 실제 font bytes와 browser measurement에 의존한다. 현재 font gate는
family shorthand의 availability를 확인하지만 같은 font name이 같은 bytes/metrics라는 durable proof는 없다.
따라서 첫 V2를 text 포함 exact replay라고 부르지 않는다.

### template art

현재 template art source도 mutable external object일 수 있다. art bytes digest와 immutable path가 없는 첫
V2에서는 `none`만 안전하다.

### clock/room/gallery

clock는 frame Canvas plan 밖의 DOM overlay이고 room/gallery renderer는 rebuild에 없다. 첫 capability는
`clockOn:false`, room/gallery unsupported를 명시한다. 이 성공은 **frame logical plan only**이며 기존
내공간 전체 pixel parity나 room replay 완료가 아니다.

## 5. asset + document 실패 순서

Storage upload와 Firestore create 사이 cross-service atomicity는 없다.

```text
immutable PNG upload
        |
        +-- fail/unknown -> document create 0, outcome unknown이면 자동 retry 0
        |
        +-- success -> encrypt V2 -> spaces/{newToken} create
                                      |
                                      +-- success: link 발급
                                      +-- fail: asset orphan, link 0
                                      +-- unknown: read-back reconciliation 전 성공/실패 추측 0
```

document-first는 upload 실패 시 permanent dangling link를 만든다. upload-first는 orphan을 만들 수 있지만
유효 document가 missing asset을 가리키는 일을 피한다. orphan delete/자동 정리는 이번 승인이 아니며 G-4
원칙처럼 별도 안전 식별·Founder 정책이 필요하다.

## 6. 후보 비교

| 후보 | exact frame plan | catalog 변경 내성 | asset 변조/삭제 | 새 권한 | 판정 |
|---|---|---|---|---|---|
| V1 optional field 확장 | old/new 의미 모호 | 불명 | 현 proofs 취약 | 없음 | FAIL |
| current catalog 전체 hash 비교 | plan 영향과 무관한 변경도 차단 | 낮음 | 별도 해결 없음 | 없음 | 비권장 |
| closed evidence snapshot + digest | versioned logical plan 재현 가능 | 높음 | digest mismatch는 fail-closed | local code | 권장 후보 |
| snapshot + 기존 proofs URL | logical plan 가능 | 높음 | overwrite/delete 후 availability 없음 | 없음 | 불충분 |
| snapshot + new create-only asset | logical plan + bytes identity | 높음 | overwrite/delete 서버 차단 후보 | Rules/UID | Founder 방향 승인, Rules 미구현 |
| backend signature/attestation | issuer 진위까지 확장 가능 | 설계에 따름 | backend 설계 필요 | C6/backend | 이번 범위 아님 |

`frame-logical-plan-v1` exactness는 같은 validated plan input을 뜻한다. 서로 다른 browser/GPU/font/device의
pixel byte-identical 결과를 보장하지 않는다. 첫 capability는 font를 배제하지만 실제 PNG decode/Canvas
pixel parity는 emulator나 unit으로 증명되지 않는다.

## 7. Founder 결정 — 승인됨

Founder는 2026-08-20에 **GG-1=A, GG-2=A, GG-3=A, GG-4=A, GG-5=A, GG-6=A**를 승인했다.
아래 B는 비교 이력일 뿐 구현 후보가 아니다.

### GG-1=A — version과 token

- **A (권장):** outer `space-v2` + plaintext `space-scene-v2`, same `spaces/{new UUID}` collection,
  새 immutable token만 사용한다. V1 parser와 token은 무변경, migration/same-token rewrite 0.
- B: V1 optional fields로 확장한다. 구·신 exactness 판별이 모호하다.

### GG-2=A — catalog evidence 방식

- **A (권장):** whole-catalog hash 대신 closed `FrameReplayEvidenceV1` snapshot + versioned canonical SHA-256.
  viewer는 snapshot을 사용하고 current catalog를 자동 채택하지 않는다.
- B: current catalog를 매번 다시 projection하고 hash가 같을 때만 표시한다. unrelated 변경과 link 수명 문제가 있다.

### GG-3=A — 첫 V2 capability

- **A (권장):** single-rect image-only frame만. non-empty text, template art, clock, room/gallery는 명시 unsupported.
  orientation + normalized transform + canonical logical width/geometry/proof bytes만 계약한다.
- B: text/art/clock/room을 한 번에 포함한다. font/art bytes와 room renderer 근거가 없다.

### GG-4=A — proof asset 경계

- **A (권장):** `rebuild-space-assets/objects/{uuid}.png`, application-independent random path,
  approved UID create-only/public-read/update-delete false, <20 MiB. encrypted scene에 path + bytes SHA-256 +
  byteLength + PNG + intrinsic dimensions를 저장한다. 기존 `proofs/**`는 V2에서 사용하지 않는다.
- B: 기존 `proofs/**` URL과 digest를 쓴다. mismatch는 차단해도 overwrite/delete와 asset loss를 막지 못한다.

### GG-5=A — V2 issuer 권한과 Rules

- **A (권장):** V1 create 호환은 유지하되 `space-v2` create만 approved operator UID + exact outer keys로
  제한한다. 실제 UID 전 live Rules/운영 발급은 차단한다.
- B: 현재 unconditional create를 V2에도 사용한다. operator-issued provenance를 서버에서 제한하지 못한다.

### GG-6=A — 첫 구현 단위

- **A (권장):** local-only `@denn/spaces` V2 document/scene reader, closed evidence encoder와 injected
  SHA-256 port/fake unit까지만 구현한다. Firebase adapter, Rules, issuer/UI, asset upload, viewer 연결은 0.
- B: Rules/asset upload/admin issuer/viewer까지 한 번에 구현한다. 권한·cross-service failure·UI가 동시에 열린다.

## 8. 첫 local-only 구현 계약

제품 변경 허용 파일:

- `packages/spaces/src/v2.ts`
- `packages/spaces/src/v2.test.ts`
- `packages/spaces/src/index.ts`의 V2 명시 export

문서 변경 허용 파일은 spec 064, 결정 정본, handoff, STATE/NEXT/CURRENT/live log다. package manifest,
lockfile과 신규 dependency는 필요하지 않으며 변경하지 않는다.

### 8.1 공개 표면과 안전 오류

- constants/types: `SPACE_DOCUMENT_V2_VERSION`, `SPACE_SCENE_V2_VERSION`,
  `FRAME_REPLAY_CONTRACT_V1`, `FRAME_EVIDENCE_ENCODING_V1`과 위 exact readonly types
- `readSpaceDocumentV2(input)`, `readSpaceSceneV2(input)`
- `encodeFrameReplayEvidenceV1(input)` — validated detached snapshot + canonical `Uint8Array`
- injected `SpaceSha256Port { digest(bytes: Uint8Array): Promise<Uint8Array> }`
- digest create/verify 함수와 local default `globalThis.crypto.subtle.digest('SHA-256', bytes)`

최소 오류 분기는 `SPACE_V2_INVALID_DOCUMENT`, `SPACE_V2_INVALID_SCENE`,
`SPACE_V2_INVALID_EVIDENCE`, `SPACE_V2_DIGEST_FAILED`, `SPACE_V2_DIGEST_MISMATCH`다. raw
input/path/token/password/object bytes/SDK message를 오류에 넣지 않는다. digest port가 throw/reject하거나
32 bytes가 아닌 결과를 반환하면 안전 실패한다. 기존 `SPACE_SCENE_VERSION`과 V1 read/open 결과·export
의미는 바꾸지 않는다.

### 8.2 검증

1. V1/V2 outer·plaintext reader 분리, V1 결과/export 무변경
2. exact keys/ranges/uppercase color/lowercase UUID path/base64/32-byte digest/PNG/intrinsic 검증
3. fixed-order UTF-8 evidence vector와 built-in Web Crypto SHA-256 vector
4. source key order가 달라도 같은 canonical bytes
5. tuple의 각 필드 값 변화 시 digest 변화
6. one-read snapshot, unknown/extra/hostile/drifting/proxy/circular/non-finite fail-closed
7. injected hash 호출 1회, throw/reject/bad-length/mismatch safe mapping
8. 첫 capability 밖 text/art/clock/room을 성공으로 축소하지 않음
9. raw token/path/customer text/password/bytes/SDK error는 safe error에 0
10. Firebase/network/DOM/React/Canvas 호출 0, package/lockfile diff 0

targeted spaces unit/typecheck와 `node scripts/check.mjs`를 실행한다. 전체 Chromium 회귀를 실행하면 기존
E2E가 보호 대상 spec-018 PNG 두 개를 다시 쓰므로 그 파일은 restore/checkout/stage/commit하지 않고
기존 dirty 상태로 남긴다.

이 구현은 schema/encoding local contract만 증명한다. catalog에서 evidence를 만드는 issuer projector,
asset integrity, Rules atomic behavior와 actual viewer plan은 증명하지 않는다.

## 9. 계속 금지 / STOP

- admin/customer UI·CSS·문구·orientation control
- Firebase SDK write, Storage upload, Firestore create, actual token/document/object/network
- `storage.rules`, `firestore.rules`, `firebase.json`, env/config 변경 또는 deploy
- actual UID 추측, client delete, orphan cleanup, published write
- V1 migration/rewrite, room/gallery/tombstone/C6 확장
- 신규 dependency/package/lockfile

GG-4/GG-5는 목표 방향만 승인됐다. 실제 Rules 변경·UID 값·emulator·배포는 별도 계약과 승인 전까지
시작하지 않는다. 실제 UI/UX 단계는 사용자의 기존 지시에 따라 Claude가 담당하며, 이번 local-only
비시각 계약에는 UI 구현이 없다.

## 10. UNCONFIRMED / NOT TESTED

- 실제 운영 V1 scene 분포, catalog orientation/size 비율, square 사용량: **NOT TESTED**
- 실제 V2 operator UID와 live Rules: **UNCONFIRMED / NOT DEPLOYED**
- 실제 PNG 평균/최대 bytes, 발급량, orphan 비용: **UNCONFIRMED**
- 실제 Firebase Storage CORS, upload/read-back, Firestore create/reconciliation: **NOT TESTED**
- actual font/art/clock/room exact replay와 cross-device pixel parity: **NOT IMPLEMENTED / NOT TESTED**

### QUESTIONS

없음. GG-1~GG-6은 모두 A로 해소됐고 첫 local-only 구현은 계약 범위 안에서 완료됐다.

### DONE (Codex, 2026-08-20)

- 구현·계약 commit: `0c5d6fa`
- 신규 `packages/spaces/src/v2.ts`에 strict exact-key V2 document/scene reader, detached evidence
  snapshot, fixed-position tuple UTF-8 encoder, injected/default Web Crypto SHA-256 create/verify를 구현했다.
- `packages/spaces/src/index.ts`에는 별도 V2 constants/types/functions만 명시 export했다. 기존
  `SPACE_SCENE_VERSION`, V1 reader/open 결과와 의미는 바꾸지 않았다.
- 신규 `packages/spaces/src/v2.test.ts`가 exact nested keys, ranges, orientation, uppercase colors,
  lowercase UUID v4 path, 20 MiB 미만, standard-base64 32 bytes, hostile/drifting/circular/non-finite,
  one-read snapshot, fixed tuple/vector, field mutation, injected hash failure/mismatch를 고정한다.
- 자체 검수에서 module-scope `new TextEncoder()`가 미사용 V2 module을 고객 bundle에 남겨 entry가
  12 bytes 변하는 문제를 발견했다. encoder 생성을 호출 내부로 옮긴 뒤 고객 entry가 스펙 063 기준과
  byte/hash까지 동일해졌다.
- targeted spaces 회귀 **107/107**, `node scripts/check.mjs` PASS(format/lint/all typecheck/unit
  **1696/1696**/mockup+admin build), 전체 Chromium E2E **151/151**, `git diff --check` PASS다.
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 스펙 063 기준과 동일하다.
- canonical vector SHA-256은 Web Crypto 결과와 별도 .NET SHA-256 계산이
  `9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=`로 일치했다.
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*` temp/debug log 잔류 0이다.
- 실제 Firebase/network/project/bucket/object/UID, Rules/config/emulator/deploy, issuer/viewer/UI,
  upload/document create, V1 migration과 orphan cleanup은 **NOT IMPLEMENTED / NOT TESTED / 금지**다.

### CODEX REVIEW (2026-08-21)

- 검수 기준 HEAD `1f60bc5`에서 구현 commit `0c5d6fa`와 기록 commit을 독립 대조했다. 허용 제품 diff는
  `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts` 세 파일뿐이고 추가 결함은 없었다.
- targeted spaces unit **107/107**, spaces typecheck, `node scripts/check.mjs` PASS(format/lint/all
  typecheck/unit **1696/1696**/두 앱 build), 전체 Chromium E2E **151/151**을 독립 재현했다.
- canonical vector를 별도 .NET SHA-256으로 계산한 값은
  `9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=`로 구현·테스트와 일치했다.
- 고객 entry는 `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 스펙 063 기준과 동일했다.
- `git diff --check` PASS, staged diff 0, 스펙 064 두 commit의 범위 밖 제품 diff 0, 포트와 test
  temp/debug 잔류 0, HEAD=origin 및 ahead/behind 0/0을 확인했다. 현재 working tree의 기존 보호 대상
  Founder/user 변경은 검수·복원·stage하지 않았다.
- 판정은 **CODEX_PASSED / DONE**이다. 실제 Firebase/network/UID/Rules/emulator/deploy와
  issuer/viewer/UI/upload/document create는 계속 **NOT IMPLEMENTED / NOT TESTED / 금지**다.
