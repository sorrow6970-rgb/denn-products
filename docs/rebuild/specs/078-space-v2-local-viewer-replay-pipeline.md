# 078 — Space V2 local viewer replay pipeline

## 상태

`READY_FOR_CLAUDE / LOCAL_ONLY / NO_UI / NO_NETWORK`

Founder 결정 정본:
`docs/codex-claude-handoff/decisions/2026-08-26-space-v2-composition-readiness-decisions.md`.

## 목표 (WHY)

customer production route에 V2를 연결하기 전에, V2 encrypted document를 안전하게 열고 immutable proof
bytes와 closed replay evidence를 검증해 deterministic frame plan을 만드는 local-only pipeline을 만든다.

이 단위는 viewer의 비-UI core만 증명한다. React route, password UI, Firebase asset SDK adapter와 실제
network는 후속 스펙이다.

## 범위 (SCOPE)

### 허용 제품 파일

- 신규 `packages/spaces/src/open-v2.ts`
- 신규 `packages/spaces/src/open-v2.test.ts`
- `packages/spaces/src/index.ts`의 V2 opener 명시 export만
- 신규 `apps/mockup/src/space-v2/replay-controller.ts`
- 신규 `apps/mockup/src/space-v2/replay-controller.test.ts`

필요하면 위 `apps/mockup/src/space-v2/` 아래에서 proof-byte 검증을 별도 순수 module/test 한 쌍으로
분리할 수 있다. 그 외 제품 파일은 허용하지 않는다.

### 금지

- `apps/mockup/src/App.tsx`, `apps/mockup/src/space/**`, main/route/React/UI/CSS/DOM/Canvas executor
- `apps/admin/**`, admin issuer/session/UI
- `packages/firebase/**`, Firebase SDK/network adapter, Rules/config/emulator
- package.json, lockfile, `pnpm-workspace.yaml`, 신규 dependency
- actual token/document/object/UID/project/bucket/network/live/deploy
- URL/clipboard, password persistence/logging, retry, publish, orphan delete/cleanup
- V1 `open.ts`/reader/controller/result 의미 변경
- text/template art/clock/room capability 확장

## 구현 지시 (WHAT / HOW)

### 1. 별도 V2 open port

`packages/spaces/src/open-v2.ts`에 V1과 이름·타입이 분리된 port를 둔다.

```ts
interface OpenedSpaceV2 {
  readonly schema: "space-v2";
  readonly scene: SpaceSceneV2;
}

type SpaceV2OpenErrorCode =
  | "SPACE_V2_OPEN_INVALID_INPUT"
  | "SPACE_V2_OPEN_INVALID_DOCUMENT"
  | "SPACE_V2_OPEN_DECRYPT_FAILED"
  | "SPACE_V2_OPEN_INVALID_SCENE"
  | "SPACE_V2_OPEN_EVIDENCE_FAILED";

interface SpaceV2OpenPort {
  open(document: unknown, password: unknown): Promise<SpaceV2OpenResult>;
}
```

factory는 injected `Pick<SpaceCryptoPort,"decryptJson">`와 `SpaceSha256Port`를 받는다. default는 기존
local Web Crypto implementation을 사용하되 module import만으로 crypto/network 작업을 시작하지 않는다.

순서는 정확히 다음과 같다.

1. `readSpaceDocumentV2(document)` exact validation.
2. password는 non-empty string만 허용. trim/정규화/저장 0.
3. `decryptJson()` 한 번.
4. `readSpaceSceneV2(plaintext)` exact validation.
5. `verifyFrameReplayEvidenceDigestV1(scene.frameEvidence, scene.frameEvidenceDigest, sha256)` 한 번.
6. 성공값은 validator/digest verifier가 반환한 detached evidence로 다시 조립한 exact `SpaceSceneV2`다.

document invalid/password invalid는 crypto·hash 0, decrypt failure는 hash 0, scene invalid는 hash 0이다.
throw/reject/hostile input은 안전 오류이며 raw password/ciphertext/path/digest/error message를 반환하지 않는다.
V1 `createSpaceOpenPort`, `OpenedSpaceV1`, `SpaceOpenResult`는 수정하지 않는다.

### 2. non-UI V2 replay controller

`apps/mockup/src/space-v2/replay-controller.ts`는 이미 읽어온 `document`와 password를 받아 다음 injected
ports를 순서대로 호출하는 one-shot local controller/facade를 제공한다.

```ts
interface SpaceV2ProofBytesPort {
  read(request: {
    readonly objectPath: string;
    readonly maxBytes: number;
  }): Promise<{
    readonly bytes: Uint8Array;
    readonly contentType: "image/png";
  }>;
}

interface SpaceV2PngDecodePort {
  decode(bytes: Uint8Array): Promise<{
    readonly imageRef: string;
    readonly intrinsicWidth: number;
    readonly intrinsicHeight: number;
  }>;
}
```

factory option은 exact `{ opener, proof, sha256, decoder }` 네 key다. `opener`는 위
`SpaceV2OpenPort`, `proof`는 `SpaceV2ProofBytesPort`, `sha256`은 proof bytes용 `SpaceSha256Port`,
`decoder`는 `SpaceV2PngDecodePort`다. 각 method는 factory에서 한 번 읽고 bind하며 missing/extra/
hostile option은 실행 전에 안전 거부한다.

공개 factory 이름은 `createSpaceV2FrameReplayController`, 실행 method는 `prepare(request)`로 고정한다.
request exact keys는 `document`, `password`, `correlationId`다. correlationId는 기존 안전 grammar
`^[A-Za-z0-9_-]{1,64}$`를 사용하며 실패 envelope에만 그대로 돌려준다.

최소 결과 계약:

```ts
type SpaceV2FrameReplayResult =
  | {
      readonly ok: true;
      readonly value: {
        readonly plan: PreviewRenderPlan;
        readonly imageRef: string;
      };
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: SpaceV2FrameReplayErrorCode;
        readonly retryable: boolean;
        readonly correlationId: string;
      };
    };
```

error code는 최소 다음 분기를 가진다.

- `SPACE_V2_REPLAY_INVALID_INPUT`
- `SPACE_V2_REPLAY_PASSWORD_REJECTED`
- `SPACE_V2_REPLAY_INVALID_CONTENT`
- `SPACE_V2_REPLAY_PROOF_LOAD_FAILED`
- `SPACE_V2_REPLAY_PROOF_MISMATCH`
- `SPACE_V2_REPLAY_PROOF_DECODE_FAILED`
- `SPACE_V2_REPLAY_PLAN_FAILED`

`PASSWORD_REJECTED`와 `PROOF_LOAD_FAILED`만 retryable true다. 이는 사용자가 비밀번호를 고치거나
명시적으로 다시 요청할 수 있다는 뜻이며 자동 retry를 뜻하지 않는다. controller 내부 자동 retry는
모든 code에서 0이다.

### 3. exact 실행 순서와 short-circuit

1. request/ports method를 안전하게 snapshot/bind한다.
2. V2 opener를 호출한다.
3. open 성공 evidence에서 object path와 expected metadata를 얻는다.
4. proof reader를 정확히 한 번 호출한다. `maxBytes`는 20 MiB 미만 계약의 최대값 `20,971,519`다.
5. result는 exact object, `Uint8Array`, exact `image/png`이어야 한다. caller buffer를 복사한다.
6. bytes length가 encrypted evidence `byteLength`와 정확히 같아야 한다.
7. copied bytes를 SHA-256 한 번 계산해 standard-base64로 expected `sha256`과 비교한다.
8. digest match 뒤에만 PNG decoder를 정확히 한 번 호출한다. decoder에는 fresh bytes copy를 준다.
9. decoder의 positive safe integer dimensions가 evidence intrinsic dimensions와 정확히 같아야 한다.
10. `buildFrameProductPlan()`에 다음 값만 전달한다.
   - geometry: evidence `aspect`, `borderPercentOfWidth`, `matColor`, `contentInsetPx`, textZones 빈 배열
   - frameColor, logicalWidth
   - userImage: decoder의 synthetic `imageRef`, verified intrinsic size, evidence transform/quarter turns
   - templateArt 없음, textValues/measureText 없음
11. plan success만 반환한다. token, objectPath, bytes, digest, password, scene와 SDK error는 결과에 없다.

open/evidence 실패 전 proof read 0, length/content/digest mismatch 뒤 decode 0, decode/dimension failure 뒤 plan
0이어야 한다. 어떤 실패도 fallback catalog read, V1 open, second asset, retry를 시작하지 않는다.

### 4. single-flight와 mutation 안전성

- 같은 controller의 `prepare()`는 한 번에 하나만 진행한다. 진행 중 두 번째 호출은 첫 Promise를 공유하지
  말고 `SPACE_V2_REPLAY_INVALID_INPUT`으로 즉시 거부한다. 새 UUID/token을 만드는 경계가 아니므로
  coalescing 의미를 만들지 않는다.
- 첫 await 전에 request top level과 port methods를 snapshot한다.
- document의 nested hostile/mutation 안전성은 strict V2 readers가 소유한다.
- bytes와 decoder input은 fresh copy다. success plan은 source/result mutation과 detached다.
- dispose, React lifecycle와 asset drawable ownership은 이번 단위에 넣지 않는다.

### 5. export/import 경계

- `@denn/spaces` root에는 V2 opener 이름/type만 명시 export한다. V1 export 의미는 그대로다.
- `apps/mockup/src/space-v2/**`는 `App.tsx`, existing `space/**` 또는 앱 barrel에서 import하지 않는다.
- production build의 customer entry hash/size가 스펙 076 기준과 같아야 한다. 달라지면 import leak으로
  보고 STOP한다.

## 검증 절차 (VERIFY)

### targeted unit

1. V1 document는 V2 opener가 거부하고 V1 opener 회귀는 그대로 통과.
2. V2 exact document → decrypt → exact scene → evidence verify success와 호출 순서/횟수.
3. invalid document/password/decrypt/scene/evidence digest 각각의 short-circuit.
4. request/port hostile getter, throw/reject, malformed result가 throw 없이 safe error.
5. proof read exact path/maxBytes 1회, input/result bytes detached copy.
6. content type, byte length, SHA-256, decoder dimensions 각각 mismatch 차단.
7. mismatch 전에/뒤 단계 호출 0을 정확히 단언.
8. closed evidence가 만드는 frame plan의 canvas/rect/color/transform/quarter-turn exact vector.
9. current catalog reader, Firebase, DOM/Image/Canvas executor, React 호출 0.
10. single-flight 두 번째 호출 즉시 거부, 자동 retry 0.
11. safe error/result에 password/token/path/digest/bytes/raw message 0.

### repository gate

- targeted `@denn/spaces` V2 open + mockup V2 replay unit.
- spaces/mockup typecheck.
- `node scripts/check.mjs` 전체 PASS.
- 고객 production build entry filename/size/SHA-256가 스펙 076 기준
  `index-6js4DafP.js`, `322,018 bytes`,
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`와 exact 동일.
- `git diff --check`, 허용 파일 diff, package/lockfile/Rules/config/admin/production App diff 0.
- 검사 포트 4183/4184/4185/8080/9099/9199 잔류 0.

전체 Chromium E2E와 emulator는 실행하지 않는다. 이 단위는 production import/UI/network가 없는 local
module이며, E2E suite는 보호 대상 spec-018 PNG를 다시 쓰므로 금지한다. full-E2E PASS나 emulator PASS를
주장하지 않는다.

## 완료 정의 (DONE)

- 허용 local-only 제품 파일과 문서만 변경.
- 모든 targeted/repository gate PASS, customer entry exact unchanged.
- V1 production route와 bundle 의미 무변경.
- actual network/UI/Firebase SDK/Rules/emulator/deploy 0.
- Claude Code는 완료 결과를 이 문서 `### DONE (Claude)`와 live log에 기록하고 fast-forward commit/push한
  뒤 `READY_FOR_CODEX`에서 멈춘다.

## 위험 / STOP

- Firebase asset adapter, production controller/App/UI 연결이 필요하면 STOP.
- existing V1 type/result를 union으로 넓혀야 한다고 판단되면 STOP하고 QUESTIONS에 근거를 남긴다.
- proof bytes에서 intrinsic dimensions를 직접 parse하는 신규 dependency가 필요하면 STOP. injected decoder
  fake만 사용한다.
- package/lockfile/Rules/config/protected file 충돌, network/download/install, non-reproducible gate가 생기면
  범위를 확대하지 않는다.

### QUESTIONS

없음. LL-1~LL-6은 모두 A로 승인됐고 첫 local-only 범위는 위와 같이 고정됐다.

### DONE (Codex) — 2026-08-26

- `packages/spaces/src/open-v2.ts`에 V1과 분리된 `createSpaceV2OpenPort`를 추가했다. exact V2 document,
  non-empty password, decrypt 1회, strict scene, evidence digest 순서를 지키고 detached scene만 반환한다.
- `apps/mockup/src/space-v2/replay-controller.ts`에 exact options/request, single-flight 거부와 proof read →
  content/length → SHA-256 → injected decode/dimensions → closed evidence frame plan pipeline을 추가했다.
- targeted 신규 unit **28/28 PASS**, spaces·mockup typecheck PASS.
- `node scripts/check.mjs` PASS: format/lint/전체 typecheck/unit **2152/2152**/mockup+admin build.
- 고객 entry는 `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 스펙 076 기준과 exact 동일하다.
- `git diff --check` PASS, production `App.tsx`/기존 `space/**`/admin/Firebase/Rules/config/package/lockfile
  spec diff 0, 검사 포트 4183/4184/4185/8080/9099/9199 잔류 0.
- 전체 Chromium E2E와 emulator는 계약대로 **NOT RUN**이며 PASS라고 주장하지 않는다. actual
  Firebase/network/live/deploy, React/UI/CSS, asset SDK adapter, admin issuer, URL/clipboard, orphan cleanup은
  구현·실행 0이다.
- 보호 대상과 기존 Founder/user working-tree 변경은 restore/checkout/stage하지 않았다. 상태
  `READY_FOR_CODEX`; 다음 스펙은 자동 시작하지 않는다.

### CODEX REVIEW — CORRECTION_REQUIRED 라운드 1 (2026-08-26)

- 검수 기준 `HEAD=origin=0f63af4`, ahead/behind 0/0.
- 독립 targeted **28/28**, 전체 check(unit **2152/2152** 포함), 고객 entry exact hash,
  `git diff --check`, 허용 commit 경로와 검사 포트 잔류 0은 PASS했다.
- 보완 결함 1건: `replay-controller.test.ts` success test가 logical canvas, layer 순서와 imageRef만
  확인한다. §VERIFY 8의 rect/color/transform/quarter-turn exact vector와 success plan detachment를
  증명하지 못한다.
- 보완은 해당 test 1개와 spec078 상태/handoff 문서로 제한한다. 테스트가 실제 wiring 결함을 드러내지
  않으면 production 코드는 수정하지 않는다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3, 다음 transition `CLAUDE_CORRECTION`. 전체 Chromium E2E와
  emulator는 계속 NOT RUN이며 다음 스펙은 시작하지 않는다.
