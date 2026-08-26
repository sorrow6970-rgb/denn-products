# 076 — space V2 Firebase SDK adapter + local emulator

## 상태

`DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION` — Founder `KK-1=A` ~ `KK-6=A` 승인 범위.

## 목표

스펙 074의 `SpaceV2IssueWriteFacade`를 설치된 Firebase Web SDK 12.17.1에 연결하고, 스펙 075의
배포하지 않는 Rules를 사용하는 `demo-denn-emulator`에서 같은 adapter의 upload/create/server-read
경로를 검증한다. app/UI와 실제 Firebase는 열지 않는다.

## 정본

- `docs/codex-claude-handoff/decisions/2026-08-26-space-v2-sdk-adapter-decisions.md`
- `docs/rebuild/specs/074-space-v2-local-write-port.md`
- `docs/rebuild/specs/075-space-v2-rules-emulator-contract.md`
- `packages/firebase/src/admin-write/sdk-facade.ts`의 default app ownership 선례

## 범위

허용:

- `packages/firebase/src/space-write/sdk-facade.ts`
- `packages/firebase/src/space-write/sdk-facade.test.ts`
- `packages/firebase/src/space-write/sdk-facade.emulator.test.ts`
- `packages/firebase/src/space-write/index.ts`의 subpath export
- `vitest.emulator.config.ts`에 위 opt-in integration suite 정확히 추가
- 스펙 076 결정·계약·handoff와 STATE/NEXT/CURRENT/live log

금지:

- `apps/**`, admin/customer UI, route, URL/clipboard, CSS·시각 결과
- actual UID, actual Firebase/project/bucket/network/live, deploy
- Rules와 `firebase*.json`·`.firebaserc` 변경
- package.json, lockfile, `pnpm-workspace.yaml`, 신규 dependency
- delete/orphan cleanup, mapping/REC/customMetadata/backend, retry/publish
- root `packages/firebase/src/index.ts` export

## 구현 계약

### 1. app ownership와 emulator guard

- factory에 emulator 옵션이 있으면 `config.projectId`가 `demo-`로 시작하는지 **dynamic import 전에**
  검사한다. 실패하면 initializeApp/Auth/Firestore/Storage 호출은 0이다.
- `[DEFAULT]` app이 없을 때만 하나를 초기화한다.
- 기존 `[DEFAULT]` app이 있으면 `apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`가 모두
  정확히 일치할 때만 재사용한다. 불일치는 fail-closed이고 대체 named app을 만들지 않는다.
- Auth, Firestore, Storage는 모두 같은 default app에서 얻는다. 별도 auth observer나 로그인 API를
  만들지 않고 이후 composition이 기존 admin auth port를 주입하도록 둔다.
- module import만으로 SDK 초기화·network는 0이다.

### 2. facade mapping

- `uploadProofAsset`: `storage.ref` + `uploadBytes(bytes copy, {contentType:'image/png'})`; 성공 receipt는
  SDK `UploadResult.metadata.size`의 숫자만 반환한다. raw metadata는 노출하지 않는다.
- `createSpaceDocument`: `/spaces/{token}`에 exact `{schema, enc:{salt,iv,ct}}`만 `setDoc`한다.
- `readSpaceDocumentFromServer`: `getDocFromServer`만 사용한다. `getDoc` fallback은 금지하며
  `{exists,data?,fromCache,hasPendingWrites}` 최소 snapshot만 반환한다.
- adapter는 오류를 삼키거나 재시도·delete하지 않는다. SDK error는 스펙 074 write port가 안전 code로
  분류하도록 그대로 reject한다.

### 3. 검증

단위 테스트:

1. import inert — factory 전 initialize/service/network 성격 호출 0.
2. default app 신규 초기화 1회, 기존 app 재사용 시 initialize 0, named app 0.
3. 공개 config 모든 key 불일치 fail-closed.
4. non-demo emulator 옵션은 SDK/service 호출 전에 거부.
5. demo 옵션은 Auth/Firestore/Storage emulator를 같은 app에 연결.
6. upload path/bytes/contentType와 metadata.size receipt mapping.
7. create exact document path/payload.
8. server read는 `getDocFromServer`만 사용하고 metadata flags를 보존.

local emulator 통합:

1. 승인 합성 UID로 동일 adapter를 생성·로그인한 뒤 스펙 074 write port issue 성공.
2. 실제 emulator Storage bytes와 Firestore exact V2 document 확인.
3. create가 서버에서 성공한 뒤 호출 결과만 미확정으로 만든 합성 wrapper에서 동일 adapter의
   `getDocFromServer` reconciliation이 성공을 판정.
4. 실제 project/network fallback 0, 검사 후 emulator/port 잔류 0.

게이트:

- targeted SDK facade unit + 기존 space-write unit.
- Firebase package typecheck.
- `node scripts/check.mjs`.
- default `demo-denn-emulator` 전체 suite와 별도 cutover suite 회귀.
- `git diff --check`, forbidden diff, 고객 bundle hash, 보호 대상 hash, 검사 포트 잔류 0.
- 전체 Chromium E2E는 **Founder KK-6=A에 따라 NOT RUN**. full-E2E PASS라고 기록하지 않는다.

## STOP

실제 Firebase/network/live, non-demo emulator project, 실제 UID, dependency 설치/download, Rules/config/
package/lockfile/apps/UI 변경, delete/cleanup, 보호 대상 충돌 또는 점유 포트 강제 종료가 필요하면 중단한다.

## DONE (Codex) — 2026-08-26

- `createFirebaseSpaceV2WriteFacade`를 추가했다. factory 내부 dynamic import, `demo-` 선검사, default
  app/Auth 재사용, config 불일치 fail-closed와 named app 0을 단위 테스트로 고정했다.
- SDK mapping은 `uploadBytes`의 `metadata.size`, exact V2 `setDoc`, `getDocFromServer` 최소 snapshot만
  노출한다. `getDoc` fallback·retry·delete·오류 재포장은 없다.
- targeted SDK+write-port unit **40/40 PASS**, Firebase typecheck PASS.
- 전체 `node scripts/check.mjs` PASS: format/lint/typecheck/unit **2124/2124**/mockup+admin build.
- default `demo-denn-emulator` **22/22 PASS**: 기존 Rules 20건과 동일 SDK adapter integration 2건.
  실제 adapter upload/create/read-back 및 server-success/caller-unknown reconciliation을 검증했다.
- cutover 회귀는 최초에 잘못된 `firebase.emulator.json`으로 실행해 transitional legacy write 1건이
  의도대로 거부됐다. 코드·Rules를 수정하지 않고 정확한 `firebase.cutover.emulator.json`으로 즉시
  재실행해 **4/4 PASS**했다. 최초 실패는 제품 결함이나 flaky 판정이 아니라 config 선택 오류다.
- 고객 entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- `git diff --check` PASS, Rules/config/package/lockfile/apps diff 0, 검사 포트 잔류 0. 보호 대상 4개
  시작/종료 SHA-256 동일. 전체 Chromium E2E는 Founder `KK-6=A`에 따라 **NOT RUN**이며 full-E2E
  PASS라고 주장하지 않는다.
- 실제 UID·Firebase/network/live·deploy·UI/URL·orphan delete/cleanup은 미구현·NOT TESTED·금지다.
