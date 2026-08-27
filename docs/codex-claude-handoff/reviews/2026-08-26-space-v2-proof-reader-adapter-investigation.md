# Space V2 proof reader adapter investigation — 2026-08-26

## 1. 목적과 범위

스펙 078의 local-only `SpaceV2ProofBytesPort`를 Firebase Web SDK 12.17.1의 공개 Storage read API에
연결하기 전에 앱 소유권, metadata/bytes 검증, timeout, local emulator 범위를 확정한다. 이번 조사는
문서 전용이다. 제품 코드·test·Rules·config·package/lockfile은 수정하지 않았고 Firebase project,
bucket, emulator 또는 live network에는 요청하지 않았다.

## 2. 확인된 저장소 사실

1. `packages/firebase/package.json`에는 Firebase **12.17.1**이 설치되어 있고 customer document reader의
   공개 표면은 `@denn/firebase/space-read`다.
2. `packages/firebase/src/space-read/sdk-facade.ts`는 named app **`denn-space-viewer`**를 소유한다. 같은
   5개 공개 config가 일치하면 재사용하고, 불일치하면 service 취득 전에 fail-closed한다. admin의
   `[DEFAULT]` app은 건드리지 않는다.
3. 스펙 078의 proof port 요청은 exact `{objectPath,maxBytes}`이고 결과는
   `{bytes:Uint8Array,contentType:'image/png'}`다. controller가 encrypted evidence의 byteLength,
   SHA-256, PNG decode dimensions를 별도로 검증한다.
4. `storage.rules`와 `storage.emulator.rules`의 목표 경로
   `rebuild-space-assets/objects/{lowercase-uuid-v4}.png`는 public read, approved UID create-only,
   update/delete 거부다. emulator에서는 public `getBytes()`가 이미 통과했다. 배포 대상 Rules의 UID는
   placeholder이며 live 배포는 금지 상태다.
5. production `App.tsx`는 V1 reader/controller/view만 사용한다. V2 replay controller와 proof reader는
   production bundle에 연결되지 않았다.

## 3. 설치 SDK 공개 타입·공식 문서

확인일: **2026-08-26**.

- 설치 타입:
  `node_modules/.pnpm/@firebase+storage@0.14.4_@firebase+app@0.16.0/node_modules/@firebase/storage/dist/storage-public.d.ts`
  - `getBytes(ref, maxDownloadSizeBytes?): Promise<ArrayBuffer>`
  - `getMetadata(ref): Promise<FullMetadata>`
  - `FullMetadata.size: number`, `UploadMetadata.contentType?: string`
- Firebase JavaScript API reference, **storage package**:
  https://firebase.google.com/docs/reference/js/storage
  - `getBytes`는 bytes만 반환하며 optional maximum download size를 받는다.
  - `getMetadata`는 별도 Promise로 full metadata를 반환한다.
- Firebase, **Use file metadata with Cloud Storage on Web**:
  https://firebase.google.com/docs/storage/web/file-metadata
  - `getMetadata()`로 `name`, `size`, `contentType` 등을 읽는다.
  - `generation`과 `metageneration`은 read-only metadata다.
- Firebase, **Download files with Cloud Storage on Web**:
  https://firebase.google.com/docs/storage/web/download-files
  - `getBytes()`는 Rules 평가를 거치는 direct byte download다.
  - browser direct download에는 bucket CORS가 필요하다.
- Firebase, **Connect your app to the Cloud Storage for Firebase Emulator**:
  https://firebase.google.com/docs/emulator-suite/connect_storage
  - Web SDK는 `connectStorageEmulator()`로 연결한다.
  - `demo-` project는 live resource가 없어 emulator 누락 시 실패하므로 공식 권장 안전 경계다.

따라서 `getBytes` 한 호출만으로 실제 object의 content type을 얻을 수 없다. content type을 상수로
꾸미지 않으려면 `getMetadata`와 `getBytes` 두 공개 호출이 필요하다.

## 4. 권장 읽기 프로토콜

권장 순서:

1. request exact keys와 `maxBytes` positive safe integer/상한을 검증한다.
2. `objectPath`가 exact V2 asset path인지 독립적으로 검사한다. 다른 public Storage 경로를 임의로 읽는
   범용 reader가 되어서는 안 된다.
3. `getMetadata(ref)` 1회.
4. metadata의 `fullPath == objectPath`, `contentType == 'image/png'`, positive safe integer `size`,
   `size <= maxBytes`를 확인한다. 실패하면 byte read 0.
5. `getBytes(ref,maxBytes)` 1회.
6. 반환 ArrayBuffer를 fresh `Uint8Array`로 복사하고 `bytes.byteLength == metadata.size`를 확인한다.
7. exact `{bytes,contentType:'image/png'}`만 반환한다. raw metadata, bucket, generation, download URL과
   SDK error message는 노출하지 않는다.

두 호출은 cross-request snapshot이나 CAS가 아니다. 다만 목표 Rules가 실제 적용된 경계에서는 같은
경로의 update/delete가 금지되므로 metadata와 bytes 사이 object 교체가 허용되지 않는다. 이 주장은
현재 repository Rules 목표와 local emulator에 한정되며 **live Rules 배포 상태는 NOT TESTED**다.

SDK 내부 retry가 있을 수 있으므로 물리 network request가 정확히 1회라고 주장하지 않는다. 제품 port는
별도 자동 retry를 추가하지 않는다. 하나의 20초 wall-clock budget 후보를 metadata+bytes 전체에 적용할
수 있지만 Firebase 요청을 abort하는 공개 계약은 확인하지 못했다. timeout 뒤 늦은 read 성공은 결과를
버리고 상태를 변경하지 않는다. read-only라 write outcome-unknown은 생기지 않는다.

## 5. app ownership와 emulator

- reader는 기존 `denn-space-viewer` app을 재사용하고 같은 5개 config 불일치를 fail-closed해야 한다.
- 별도 named app이나 default app을 만들면 document read와 asset read가 서로 다른 config를 소유할 수
  있으므로 금지 후보로 분류한다.
- public asset read에는 Auth가 필요하지 않다. proof reader가 Auth를 얻거나 anonymous sign-in을
  시작하지 않아야 한다.
- emulator 옵션이 있으면 `demo-` project guard를 dynamic import 전에 수행하고 Storage emulator만
  연결한다. non-demo면 initializeApp/getStorage/connect/read가 모두 0이어야 한다.
- 기존 emulator Rules로 approved synthetic writer가 object를 seed한 뒤 별도 unauthenticated reader가
  metadata+bytes를 읽는 opt-in test가 가능하다. 실제 UID와 live project는 필요하지 않는다.

## 6. 후보 비교

| 후보 | 장점 | 위험/비용 | 판정 |
|---|---|---|---|
| A. 기존 `space-read` 확장 + 기존 named app 재사용 | package manifest 변경 0, customer read ownership 단일화 | V1/V2 export 이름 분리 필요 | **권장** |
| B. 새 `space-asset-read` subpath + 같은 app 재사용 | asset 표면이 더 분리됨 | package export 변경과 중복 config surface 증가 | 가능 |
| C. 별도 Firebase app | 구현은 독립적 | config drift·중복 초기화·소유권 분산 | 비권장 |
| metadata → bounded bytes | 실제 MIME/size 선검사, 큰 download 조기 차단 | 공개 SDK 호출 2회 | **권장** |
| bytes만 읽고 MIME 상수 반환 | 호출 1회 | 실제 metadata를 확인하지 않고 proof 결과를 꾸밈 | 거부 권장 |
| package-only + emulator | UI 전 network seam을 독립 검증 | production CORS/route는 미검증 | **권장** |

## 7. Founder 결정 MM-1~MM-6

**2026-08-26 결정 완료: MM-1=A, MM-2=A, MM-3=A, MM-4=A, MM-5=A, MM-6=A.**
정본은
`docs/codex-claude-handoff/decisions/2026-08-26-space-v2-proof-reader-adapter-decisions.md`다.

- **MM-1 app ownership**
  - A(권장): 기존 `denn-space-viewer` named app을 exact config match로 재사용. default/추가 app 0.
  - B: 별도 named app.
- **MM-2 공개 표면**
  - A(권장): 기존 `@denn/firebase/space-read`에 V2 proof reader 이름을 명시 export.
  - B: 새 `@denn/firebase/space-asset-read` subpath.
- **MM-3 read protocol**
  - A(권장): exact path → metadata fullPath/contentType/size → bounded bytes → metadata size와 bytes 길이
    일치. 제품 자동 retry 0.
  - B: bounded bytes만 읽고 `image/png`를 상수 반환.
- **MM-4 timeout**
  - A(권장): metadata+bytes 전체에 20초 단일 wall-clock budget. timeout 뒤 late result 무시, abort 보장과
    물리 요청 1회는 주장하지 않음.
  - B: SDK timeout에만 맡겨 product-level 상한 없음.
- **MM-5 local emulator**
  - A(권장): 기존 Rules/config와 `demo-denn-emulator`만 재사용해 approved synthetic seed + public
    metadata/bytes read를 opt-in 검증. Rules/config 본문 변경 0.
  - B: unit fake만 하고 emulator NOT RUN.
- **MM-6 구현 단위와 E2E**
  - A(권장): package adapter/test와 emulator suite include만 허용. `apps/**`/production import/UI 0,
    고객 bundle hash exact 유지, 전체 Chromium E2E는 NOT RUN 예외.
  - B: 같은 스펙에서 production V2 route/UI까지 연결하고 전체 E2E 수행.

## 8. 결론과 STOP

승인된 A 묶음은 스펙 079를 package-only non-UI Firebase proof read seam으로 제한한다. 제품 구현은
별도 Claude Code 수동 지시 후 시작한다. 통과 후 남는 browser PNG decoder와 production V2 customer
composition/UI는 별도 스펙이며 실제 UI/UX 구현은 사용자 지침에 따라 Claude Code가 담당한다.

실제 Firebase/project/bucket/network/live, CORS 변경·확인, Rules/Hosting deploy, actual UID, admin issue
UI, URL/clipboard, orphan delete/cleanup은 계속 금지·NOT TESTED다.
