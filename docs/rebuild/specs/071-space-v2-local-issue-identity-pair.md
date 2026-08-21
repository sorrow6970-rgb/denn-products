# 스펙 071 — space V2 local issue identity pair

상태: **READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI**

## 1. 목표 (WHY)

Founder `HH-1=A`에 따라 한 issue 작업의 proof `assetId`와 public link token을 서로 독립된 lowercase
UUID v4 두 개로 준비한다. 이 단위는 identity pair만 만들며 스펙 068 preparation, upload, Firestore
create와 아직 조합하지 않는다.

결정 정본:
`docs/codex-claude-handoff/decisions/2026-08-21-space-v2-issue-identity-decisions.md`.

## 2. 기준과 보존 계약

- 기준 HEAD=origin `3e0a91a`, ahead/behind 0/0.
- 스펙 070은 `CODEX_PASSED / DONE`이다. 기존 064~070 제품 파일은 수정하지 않는다.
- UUID port는 필수 주입이며 스펙 070 adapter가 제공할 수 있다. global random fallback은 없다.
- original port의 `randomUUID` method는 첫 호출 전에 정확히 한 번 snapshot하고 receiver를 보존한다.
- assetId를 먼저, token을 두 번째로 생성한다. 각 identity는 스펙 069 strict candidate를 통해 검증한다.
- 첫 생성 실패 시 두 번째 호출 0. 둘째 실패나 collision에서 retry·repair·세 번째 호출 0.
- assetId와 token이 같으면 성공으로 축소하지 않고 명시 collision이다.

## 3. 허용 파일

제품 파일은 정확히 다음 신규 2개만 허용한다.

- `apps/admin/src/space-v2/issue-identity-pair.ts`
- `apps/admin/src/space-v2/issue-identity-pair.test.ts`

기록 문서는 이 스펙, 관련 handoff, HH-1 결정 정본, 스펙 070 종료 상태,
STATE/NEXT/CURRENT/live log만 허용한다. 기존 제품 코드, package/lockfile, CSS, config,
Firebase/Rules는 변경하지 않는다.

## 4. 구현 계약

### 4.1 공개 local API

다음 의미의 API를 신규 module에서 export한다. app barrel과 `App.tsx`에서는 export/import/call하지 않는다.

```ts
type SpaceV2ProofAssetIdCandidate = string & {
  readonly __spaceV2ProofAssetIdCandidate: unique symbol;
};

interface SpaceV2IssueIdentityPair {
  readonly assetId: SpaceV2ProofAssetIdCandidate;
  readonly token: SpaceV2IssueTokenCandidate;
}

type SpaceV2IssueIdentityPairErrorCode =
  | "SPACE_V2_IDENTITY_INVALID_PORT"
  | "SPACE_V2_IDENTITY_ASSET_ID_FAILED"
  | "SPACE_V2_IDENTITY_TOKEN_FAILED"
  | "SPACE_V2_IDENTITY_COLLISION";

function createSpaceV2IssueIdentityPair(
  uuid: SpaceV2IssueUuidPort,
):
  | { readonly ok: true; readonly value: SpaceV2IssueIdentityPair }
  | { readonly ok: false; readonly code: SpaceV2IssueIdentityPairErrorCode };
```

### 4.2 port와 두 호출

1. original `uuid.randomUUID`를 한 번 읽고 callable인지 확인한다. malformed port는 `INVALID_PORT`,
   source call 0이다.
2. snapshot callable + original receiver를 가진 always-defined adapter를 만든다.
3. 그 adapter로 스펙 069 `createSpaceV2IssueTokenCandidate`를 첫 번째 호출해 strict asset UUID를 얻는다.
   실패는 `ASSET_ID_FAILED`, 두 번째 source call 0이다.
4. 같은 adapter로 candidate를 두 번째 호출해 strict token을 얻는다. 실패는 `TOKEN_FAILED`다.
5. 두 값이 같으면 `COLLISION`; 다르면 `{assetId, token}` 성공이다.
6. 성공·collision의 source 호출은 정확히 2회다. 어떤 실패에서도 자동 retry와 세 번째 호출은 없다.

스펙 069 함수의 재사용은 lowercase UUID v4 검증 정본을 하나로 유지하기 위한 것이다. 하위 token 오류
code를 외부에 전달하지 않고 pair 단계 code만 반환한다.

### 4.3 안전 결과

- 성공 pair는 exact key `assetId`, `token`만 가진 plain object다.
- 실패 결과는 exact key `ok`, `code`뿐이다.
- candidate 원문, UUID 일부, UID/email, raw message/stack을 실패 결과·console에 넣지 않는다.
- UUID v4 형식과 두 값의 차이는 난수 품질·collision freedom의 증명이 아니다.

## 5. 필수 테스트

1. 합성 독립 UUID 두 개가 assetId→token 순서로 정확히 2회 생성돼 성공한다.
2. original method getter one-read와 method-style receiver 보존을 확인한다.
3. malformed port 7종은 `INVALID_PORT`, source/global random 0이다.
4. 첫 호출 throw/invalid output은 `ASSET_ID_FAILED`, 총 source 1회·token call 0이다.
5. 둘째 호출 throw/invalid output은 `TOKEN_FAILED`, 총 source 2회·retry 0이다.
6. 같은 valid UUID 두 번은 `COLLISION`, 총 2회·세 번째 호출 0이다.
7. drifting source sequence도 snapshot method만 사용하고 하위 오류 code/raw 값 누출 0이다.
8. fetch/Firebase/Auth/Storage/Firestore/DOM/Canvas/Date/Math.random/global crypto/console 호출 0이다.
9. `App.tsx` import/call 0, production bundle identity 불변이다.

## 6. 검증 게이트

- 신규 targeted unit
- 신규 unit + spec 069/070 + spec 068 + 기존 V2 관련 unit + `packages/spaces`
- admin typecheck
- `node scripts/check.mjs` (현재 unit 1997/1997 이상)
- 전체 Chromium E2E 151/151 이상
- 고객 entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin entry `index-D0XOQpRL.js`, 226,201 bytes, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- admin CSS `index-DJ_z3tK1.css`, 9,146 bytes, unwanted utility 0
- 두 production bundle에 신규 module/API/error 식별자 0
- `git diff --check`, exact paths, package/lockfile/Rules/config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium이 다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

## 7. 계속 금지

- 스펙 068 preparation과 identity pair 조합 또는 기존 068~070 제품 변경
- Storage upload/read/delete, Firestore create/read-back/reconciliation, URL/link 발급
- Firebase adapter, Rules/config/env, 실제 UID/project/bucket/network/data/emulator/deploy
- `App.tsx`, route, admin/customer UI/UX/CSS, viewer/open composition
- V1 token/parser/read 변경, migration/rewrite, published write, orphan 정리, C6/backend
- package/lockfile/dependency/download/install, retry/merge/fallback

## 8. STOP 조건

- 기존 064~070 제품 API 수정이 필요함
- 허용 신규 제품 파일 2개 밖 변경이 필요함
- collision 자동 retry나 새로운 identity metadata가 필요함
- baseline gate 실패·timeout/flaky 재발
- 실제 Firebase/Rules/UI/운영 데이터가 필요하거나 Founder/user 보호 변경과 충돌함

### QUESTIONS

없음. Founder `HH-1=A`의 독립 identity pair만 local로 구현한다.
