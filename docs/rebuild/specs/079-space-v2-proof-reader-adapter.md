# 079 — Space V2 Firebase proof reader adapter

## 상태

`READY_FOR_CLAUDE / APPROVED / PRODUCT IMPLEMENTATION NOT STARTED`

Founder 결정 정본:
`docs/codex-claude-handoff/decisions/2026-08-26-space-v2-proof-reader-adapter-decisions.md`.

## 목표

스펙 078의 local V2 replay controller가 요구하는 proof bytes를 Firebase Web SDK 12.17.1의 공개
Storage API로 안전하게 읽는 package-only adapter의 구현 계약을 확정한다. React route/UI와 실제
Firebase는 열지 않는다.

조사 정본:
`docs/codex-claude-handoff/reviews/2026-08-26-space-v2-proof-reader-adapter-investigation.md`.

## 현재 확인 결과

- 공개 SDK의 `getBytes(ref,maxDownloadSizeBytes?)`는 ArrayBuffer만 반환하고 `getMetadata(ref)`는 별도
  FullMetadata를 반환한다.
- 기존 customer document reader는 `denn-space-viewer` named app을 소유한다.
- 목표 Storage Rules는 exact V2 asset path를 public-read/create-only로 만들고 update/delete를
  거부하지만 live 배포 상태는 NOT TESTED다.
- production route에는 V2 controller/reader/UI가 아직 연결되지 않았다.

## Founder 결정

**MM-1=A, MM-2=A, MM-3=A, MM-4=A, MM-5=A, MM-6=A** 승인.

## 허용 파일

제품·검증:

- 신규 `packages/firebase/src/space-read/proof-facade.ts`
- 신규 `packages/firebase/src/space-read/proof-reader.ts`
- 신규 `packages/firebase/src/space-read/proof-reader.test.ts`
- 신규 `packages/firebase/src/space-read/proof-sdk-facade.ts`
- 신규 `packages/firebase/src/space-read/proof-sdk-facade.test.ts`
- 신규 `packages/firebase/src/space-read/proof-sdk-facade.emulator.test.ts`
- `packages/firebase/src/space-read/index.ts`의 명시 export만
- `vitest.emulator.config.ts` include 1건만

문서:

- 이 spec, MM 결정 정본, spec079 review/handoff
- STATE/NEXT/CURRENT/live log

파일 분리가 불필요하면 위 신규 package 파일 수는 줄일 수 있지만 다른 디렉터리로 범위를 넓힐 수 없다.
`packages/firebase/src/space-read/sdk-facade.ts`와 기존 V1 tests는 수정하지 않는다.

## 구현 계약

### 1. 공개 타입과 facade

`@denn/firebase/space-read`에 V1 이름과 충돌하지 않는 다음 V2 proof 전용 표면을 둔다.

```ts
interface SpaceV2ProofReadFirebaseFacade {
  readMetadata(objectPath: string): Promise<{
    readonly fullPath: unknown;
    readonly contentType: unknown;
    readonly size: unknown;
  }>;
  readBytes(objectPath: string, maxBytes: number): Promise<ArrayBuffer>;
}

interface SpaceV2ProofBytesReader {
  read(request: {
    readonly objectPath: string;
    readonly maxBytes: number;
  }): Promise<{
    readonly bytes: Uint8Array;
    readonly contentType: "image/png";
  }>;
}
```

정확한 public factory 이름은 `createSpaceV2ProofBytesReader`와
`createFirebaseSpaceV2ProofReadFacade`로 고정한다. 스펙 078의 app-local
`SpaceV2ProofBytesPort`와 structural typing으로 주입 가능해야 하지만 `apps/**` import는 금지한다.

### 2. request와 path 검증

- `read()` request는 own enumerable key가 정확히 `objectPath`, `maxBytes` 두 개여야 한다.
- `objectPath`는
  `rebuild-space-assets/objects/{lowercase UUID v4}.png` exact pattern만 허용한다. 다른 public Storage
  prefix, URL, `gs://`, slash traversal, uppercase UUID, query/hash는 SDK 호출 전에 거부한다.
- `maxBytes`는 positive safe integer이고 스펙 078 상한 `20,971,519` 이하만 허용한다.
- hostile getter/Proxy/thenable, malformed facade result와 throw/reject는 raw 값 없이 안전 rejection이다.
- 오류에는 objectPath, bucket, config, token, UID, metadata, bytes, raw SDK code/message가 없어야 한다.

reader는 safe internal error code만 가진 rejection을 사용할 수 있다. controller가 외부에는 기존
`SPACE_V2_REPLAY_PROOF_LOAD_FAILED`만 노출하므로 새 UI 오류 계약은 만들지 않는다.

### 3. exact read 순서

하나의 `read()` 호출은 다음 순서를 지킨다.

1. request/facade method snapshot과 검증.
2. `readMetadata(objectPath)` 정확히 1회.
3. metadata exact result를 snapshot하고 다음을 모두 검사한다.
   - `fullPath === objectPath`
   - `contentType === 'image/png'`
   - `size` positive safe integer
   - `size <= maxBytes`
4. 하나라도 실패하면 `readBytes` 0.
5. `readBytes(objectPath,maxBytes)` 정확히 1회.
6. exact ArrayBuffer만 허용하고 fresh `Uint8Array`로 복사한다.
7. copied `byteLength === metadata.size`가 아니면 거부한다.
8. exact `{bytes,contentType:'image/png'}`만 반환한다.

raw FullMetadata, generation/metageneration, download URL, Storage reference는 공개 결과에 없다. caller가
성공 bytes를 변경해도 facade source와 다른 반환값에 영향을 주지 않아야 한다.

목표 Rules의 update/delete 거부가 metadata와 bytes 사이 path 교체를 막는 전제다. emulator에서 이
reader가 immutable target object를 읽는 것까지만 검증하며 live Rules/CORS는 NOT TESTED다.

### 4. timeout과 retry

- `SPACE_V2_PROOF_READ_TIMEOUT_MS = 20_000`을 export한다.
- timer는 metadata 직전 시작해 bytes 검증 완료까지 하나만 사용한다. 단계별 20초를 두 번 주지 않는다.
- timeout 결과가 먼저 결정되면 이후 metadata/bytes resolve/reject는 무시하고 unhandled rejection을
  만들지 않는다.
- 공개 Firebase SDK에서 이 read를 abort하는 계약은 사용하지 않는다. late success는 read-only라
  state를 바꾸지 않으며 결과도 복원하지 않는다.
- reader 수준 retry/coalescing/cache/fallback/getDownloadURL/XHR/fetch는 0이다.
- SDK 내부 retry 가능성 때문에 physical network call count 1을 단언하지 않는다. facade method 호출
  횟수만 검증한다.

### 5. Firebase app ownership

`createFirebaseSpaceV2ProofReadFacade(config, options?)`는 module-level side effect 없이 factory 안에서만
`firebase/app`과 `firebase/storage`를 dynamic import한다.

- emulator 옵션이 있으면 dynamic import 전에 `config.projectId.startsWith('demo-')`를 검사한다.
- `denn-space-viewer` app이 없으면 그 이름으로 정확히 하나 초기화한다.
- 있으면 기존 V1과 같은 `apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`를 exact 비교하고
  불일치 시 `getStorage` 전에 fail-closed한다.
- `[DEFAULT]` app은 조회·재사용·초기화하지 않는다. 다른 named app도 만들지 않는다.
- Auth와 Firestore를 import/취득/연결하지 않는다. public read를 위해 anonymous sign-in도 하지 않는다.
- `getStorage(app)` 하나를 얻고 emulator 옵션일 때만 `connectStorageEmulator`를 한 번 호출한다.
- facade `readMetadata`는 SDK FullMetadata에서 `fullPath`, `contentType`, `size`만 복사한다.
- facade `readBytes`는 exact path ref와 `getBytes(ref,maxBytes)`를 사용한다. `getDownloadURL`, Blob,
  delete/list/update/upload는 0이다.

### 6. unit과 local emulator

unit 최소 항목:

1. module import inert; factory 전 initialize/service/read 0.
2. named app 신규 초기화 1, 기존 matching app 재사용 initialize 0, default/추가 app 0.
3. 5개 config key 각각 불일치 시 getStorage/read 0.
4. non-demo emulator 옵션은 dynamic SDK/service 호출 전에 거부.
5. demo 옵션에서 named app Storage만 emulator 연결; Auth/Firestore 0.
6. exact metadata mapping과 exact ref/maxBytes getBytes mapping.
7. malformed request/path/maxBytes/hostile getter는 facade 호출 0.
8. metadata fullPath/MIME/size mismatch와 oversize는 bytes 0.
9. ArrayBuffer 이외 결과와 metadata-size/bytes-length mismatch 거부.
10. fresh bytes copy, exact result keys, raw 정보 비노출.
11. metadata → bytes 순서와 facade call 각각 1회; reader retry 0.
12. single 20초 timeout, metadata timeout 시 bytes 0, bytes timeout/late resolve/reject 안전성.

opt-in emulator:

1. 기존 `demo-denn-emulator`, existing Rules/config, synthetic approved UID만 사용한다.
2. existing write adapter 또는 test-only approved client로 exact immutable PNG 하나를 seed한다.
3. `denn-space-viewer` named app의 proof facade는 Auth sign-in 없이 metadata와 bounded bytes를 읽는다.
4. actual metadata contentType/size/fullPath와 returned detached bytes가 exact인지 확인한다.
5. existing create-only/update/delete/public-read Rules regression은 기존 suite가 계속 소유한다.
6. non-demo/live fallback 0, 종료 후 app/port 잔류 0.

## repository gate

- targeted proof reader/facade unit + 기존 `space-read` unit.
- Firebase package typecheck.
- `node scripts/check.mjs` 전체 PASS.
- `pnpm test:emulator` 전체 default suite PASS. cached tools만 사용하고 설치/download 0.
- 고객 entry filename/size/SHA-256가 스펙 078 기준
  `index-6js4DafP.js`, `322,018 bytes`,
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`와 exact 동일.
- `git diff --check`, 허용 파일 diff, package/lockfile/Rules/firebase JSON/apps/admin/root barrel diff 0.
- 검사 포트 4183/4184/4185/8080/9099/9199 잔류 0. 점유 포트를 강제로 종료하지 않는다.

전체 Chromium E2E는 Founder MM-6=A에 따라 **NOT RUN**이다. full-E2E PASS라고 기록하지 않는다.

## 계속 금지

- `apps/**`, production import, React/UI/CSS/DOM/Image/Canvas decoder
- actual Firebase/project/bucket/network/live, CORS 확인·변경, Rules/Hosting deploy, actual UID
- admin issuer, URL/clipboard, publish, orphan delete/cleanup, retry
- package/lockfile, `pnpm-workspace.yaml`, 신규 dependency
- 보호 대상 변경·복원·stage·commit

## 검증 후보

- app ownership/config mismatch/non-demo guard/import inert unit
- exact path와 metadata-first short-circuit, bounded bytes, detached result, timeout/late-result unit
- existing `demo-denn-emulator` public metadata+bytes read opt-in test
- Firebase typecheck, targeted unit, 전체 `node scripts/check.mjs`, 고객 bundle exact hash
- `git diff --check`, forbidden diff, 검사 포트 잔류 0
- 전체 Chromium E2E는 MM-6=A일 때만 NOT RUN으로 기록하며 PASS라고 주장하지 않는다.

### QUESTIONS

없음. Claude Code는 이 계약 범위만 구현하고 `READY_FOR_CODEX`에서 멈춘다.
