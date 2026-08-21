# 스펙 065 — space V2 local issuer evidence projector

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI**

기준 HEAD: `dcd893c` (스펙 064 종료, CODEX_PASSED)

## 1. 목표

스펙 064는 `SpaceSceneV2`와 `FrameReplayEvidenceV1`의 strict parser, canonical encoder와 SHA-256
계약을 확정했다. 아직 catalog와 운영자 편집 상태에서 그 evidence를 만드는 issuer 경계는 없다.

이번 단위는 admin 앱 내부에 **호출되지 않는 local-only projector**를 추가한다. 이미 검증된 catalog
projection과 명시적인 발급 입력을 하나의 immutable V2 scene candidate로 조립하고, 첫 capability 밖
상태는 SHA-256 전에 fail-closed한다. UI, Firebase, token, encryption, upload, document create는 없다.

Founder GG-1=A~GG-6=A의 기존 결정만 사용한다. 새 제품 정책·Rules·운영 권한 결정은 만들지 않는다.

## 2. 구조 결정

### H-1 — 위치와 의존 방향

- 위치는 `apps/admin/src/space-v2/issue-candidate.ts`다.
- composition layer인 admin 앱이 기존 `@denn/shared` catalog projector와 `@denn/spaces` V2 계약을
  조합한다. `@denn/shared` 또는 `@denn/spaces`가 서로를 새로 의존하지 않는다.
- `apps/admin/package.json`에 기존 workspace package `@denn/spaces: workspace:*`만 추가하고 lockfile은
  admin importer의 최소 기계적 변경만 허용한다. 외부 dependency와 다운로드는 0이다.
- `App.tsx`와 모든 UI route에서 import/call하지 않는다. 기본 admin 앱 동작과 bundle은 그대로다.

### H-2 — 공개 입력

다음 의미의 readonly 입력을 받는다. 이름은 구현에서 더 명확하게 정할 수 있지만 의미를 넓히지 않는다.

```ts
interface SpaceV2FrameIssueCandidateInput {
  readonly catalog: CatalogDocumentV1;
  readonly selection: FramePreviewSelection;
  readonly frameOrientation: "portrait" | "landscape";
  readonly logicalWidth: number;
  readonly frameColor: string;
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
    readonly rotationQuarterTurns: 0 | 1 | 2 | 3;
  };
  readonly proofAsset: FrameReplayEvidenceV1["proofAsset"];
}
```

- catalog geometry는 반드시 `projectFramePreviewGeometry(catalog, selection)` 결과만 사용한다. raw catalog
  field를 별도로 재해석하거나 fallback/default/clamp하지 않는다.
- `frameOrientation`, `logicalWidth`, `frameColor`, transform과 proof descriptor는 발급 호출자가 명시한다.
- proof bytes를 받거나 hash하지 않는다. `proofAsset.sha256`은 후속 asset-preparation 경계가 만든
  descriptor이며 이번 projector는 스펙 064 strict evidence validator로 형식만 재검증한다.
- token, password, email, UID, 고객 문구, URL/base64 원문, Firebase SDK object를 받지 않는다.

### H-3 — first capability fail-closed

아래 중 하나면 digest port 호출 전에 실패한다.

- catalog/selection projection 실패
- projected `textZones`가 비어 있지 않음
- projected `clockPreview`가 `null`이 아님
- `projectCatalogTemplateImage(... frame ...)`가 실제 template art를 `available`로 반환
- template image 결과가 `invalid-reference`여서 art 부재를 안전하게 증명할 수 없음
- orientation과 projected aspect 불일치
- logical width, color, transform, proof descriptor가 스펙 064 evidence 계약에 맞지 않음
- hostile/revoked/drifting getter 또는 Proxy로 안전 snapshot을 만들 수 없음

`generated-preview`와 `none`은 real template art가 없는 상태로만 취급할 수 있다. raw image value는 결과,
오류, 로그에 복사하지 않는다. text 값이 비어 있을 것이라고 추측해 text zone을 허용하지 않는다.

### H-4 — 성공 결과와 digest

- evidence는 `frame-logical-plan-v1`, caller의 explicit orientation/logical width/appearance/transform/proof,
  projected geometry, `templateArt:{kind:"none"}`, `textMode:"none"`, `clockMode:"off"`로 조립한다.
- `createFrameReplayEvidenceDigestV1(evidence, shaPort?)`를 정확히 한 번 호출한다.
- 성공 시 exact `SpaceSceneV2` candidate 하나를 반환한다. `roomCapability`는 `unsupported`다.
- 최종 candidate는 `readSpaceSceneV2`로 다시 검증된 detached 값이어야 한다. 입력 객체 참조를 결과에
  보존하지 않는다.
- 함수는 network, Firebase, crypto encryption, random UUID, Date, DOM, Canvas와 전역 상태를 사용하지
  않는다. SHA-256은 스펙 064 injected/default port만 사용한다.

### H-5 — 안전 오류

최소 오류 코드는 다음 의미를 분리한다.

- `SPACE_V2_ISSUE_INVALID_INPUT`
- `SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED`
- `SPACE_V2_ISSUE_UNSUPPORTED_CAPABILITY`
- `SPACE_V2_ISSUE_DIGEST_FAILED`

오류에는 raw catalog value, selection id, object path, digest, token, password, UID/email, customer text,
SDK message나 thrown object를 넣지 않는다. 모든 오류는 자동 retry/merge/fallback 정보를 만들지 않는다.

## 3. 허용 파일

제품·테스트:

- 신규 `apps/admin/src/space-v2/issue-candidate.ts`
- 신규 `apps/admin/src/space-v2/issue-candidate.test.ts`
- `apps/admin/package.json` — `@denn/spaces: workspace:*`만
- `pnpm-lock.yaml` — 위 workspace importer의 최소 변경만

문서:

- 이 스펙
- `docs/handoff/2026-08-21-spec-065-space-v2-local-issuer-projector-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

다른 파일이 필요하면 구현하지 말고 질문한다. 특히 `App.tsx`, CSS, Firebase/Rules/config, shared/spaces
제품 파일을 수정하지 않는다.

## 4. 필수 테스트

1. 합성 image-only single-rect catalog + explicit input이 exact V2 scene candidate를 만든다.
2. geometry 값은 raw catalog 재해석이 아니라 `projectFramePreviewGeometry` 결과와 일치한다.
3. text zone, clock, available template art, invalid art reference는 digest 호출 0으로 unsupported/failure다.
4. malformed catalog/selection, orientation mismatch, bad logical width/color/transform/proof는 digest 호출 0이다.
5. injected digest port는 성공에서 정확히 1회 호출되고 canonical evidence bytes를 받는다.
6. digest throw/reject/bad length는 raw message 없이 `SPACE_V2_ISSUE_DIGEST_FAILED`다.
7. hostile/revoked/drifting/circular input은 throw하지 않고 안전 실패하며 입력은 변형되지 않는다.
8. 결과는 detached돼 입력을 나중에 바꿔도 변하지 않는다.
9. token/password/UID/email/customer text/object path/digest/raw thrown message가 오류에 0이다.
10. V1과 스펙 064 reader/encoder/hash 회귀가 모두 통과한다.
11. `App.tsx` import/call 0, admin과 mockup bundle의 실행 동작 변화 0, network/Firebase/DOM/Canvas 호출 0.

## 5. 검증 명령과 게이트

- 신규 targeted unit
- `vitest run packages/spaces` 전체
- admin typecheck
- `node scripts/check.mjs`
- 전체 Chromium E2E **151/151 이상**; spec-018 PNG 보호 대상은 실행이 다시 써도 restore/checkout/stage/
  commit하지 않는다.
- 변경 전후 mockup customer entry name/bytes/SHA-256 동일
- admin entry도 unused module이 bundle에 들어오지 않아 변경 전후 name/bytes/SHA-256 동일
- `git diff --check`
- exact changed paths와 package/lockfile 변경이 허용 최소 범위인지 확인
- apps/admin의 허용 2개 신규 파일 외 앱 diff 0, Rules/firebase config diff 0
- 포트 4183/4184/4185/8080/9099/9199와 test temp/debug 잔류 0

## 6. 계속 금지

- UI/UX, `App.tsx`, route, CSS, 시각 결과 생성
- token/UUID 생성, password encryption, link 발급
- Firebase adapter, Auth, Storage upload/read, Firestore create/reconciliation
- `storage.rules`, `firestore.rules`, `firebase.json`, `.firebaserc`, env/config
- 실제 Firebase/project/bucket/object/network/data/UID, emulator, deploy
- V1 migration/rewrite, viewer/open composition, asset bytes 검증
- client delete, orphan cleanup, published write, C6/backend
- 외부 dependency·다운로드·설치, 자동 retry/merge/fallback

## 7. STOP 조건

- existing projector 결과만으로 first capability를 안전하게 판정할 수 없음
- `@denn/spaces` 또는 `@denn/shared` 제품 파일 변경이 필요함
- 신규 external dependency/download가 필요함
- baseline gate가 변경 전부터 재현 가능하게 실패함
- 실제 network/Firebase/Rules/UI 또는 새 Founder 제품 결정이 필요함
- 허용 파일 밖 기존 Founder/user 변경과 충돌함

STOP이면 제품 코드를 더 수정하지 말고 근거, 재현 명령, 필요한 최소 결정을 live log와 QUESTIONS에
기록한다.

### QUESTIONS

없음. 이번 단위는 승인된 GG shape를 local composition에서 조립하는 최소 경계이며 운영 권한·UI·실제
발급 정책을 새로 결정하지 않는다.

### DONE (Claude) — 2026-08-21

구현 commit `5fc89d2` (계약 문서 commit `e9e0c6d`). 제품 변경은 정본 §3의 허용 4개 파일뿐이다.

- 신규 `apps/admin/src/space-v2/issue-candidate.ts` — `createSpaceV2FrameIssueCandidate(input, sha256?)`
- 신규 `apps/admin/src/space-v2/issue-candidate.test.ts` — 52 tests
- `apps/admin/package.json` — `@denn/spaces: workspace:*` 한 줄
- `pnpm-lock.yaml` — admin importer link 3줄

구조:

- H-1 admin composition에서만 join한다. `@denn/shared`와 `@denn/spaces`는 서로를 의존하지 않고 두
  패키지 제품 파일은 무변경이다. `App.tsx`/route/CSS import 0.
- H-2 입력은 exact-key detached snapshot으로 한 번만 읽는다(`exactSnapshot`). geometry는 오직
  `projectFramePreviewGeometry` 결과만 쓰고 raw catalog를 재해석·clamp·default하지 않는다. 두 번의
  catalog 읽기는 동일한 selection snapshot을 쓴다.
- H-3 fail-closed: projection 실패, `textZones` 비어있지 않음, `clockPreview !== null`, template art
  `available`, art `invalid-reference`가 모두 digest 호출 0으로 막힌다. `generated-preview`와 `none`만
  art 부재로 인정한다.
- H-4 evidence는 `frame-logical-plan-v1` + explicit orientation/logical width/appearance/transform/proof +
  projected geometry + `templateArt:none`/`textMode:none`/`clockMode:off`로 조립하고
  `createFrameReplayEvidenceDigestV1`를 정확히 한 번 호출한다. 결과는 `readSpaceSceneV2`로 재검증한
  detached 값이며 `roomCapability`는 `unsupported`다. network/Firebase/DOM/Canvas/Date/random/전역
  상태 사용 0.
- H-5 오류는 `SPACE_V2_ISSUE_INVALID_INPUT` / `_CATALOG_PROJECTION_FAILED` / `_UNSUPPORTED_CAPABILITY` /
  `_DIGEST_FAILED` 4개이며 `{ok, code}` 외 어떤 필드도 없다. 범위·형식·orientation↔aspect 판정은 스펙
  064 validator에 위임해 규칙을 두 곳에 복제하지 않았다(그 실패는 `INVALID_INPUT`으로 매핑).

검증:

- targeted unit **52/52**, `vitest run packages/spaces` **125/125**, admin typecheck PASS
- `node scripts/check.mjs` **PASS** (format/lint/7 typecheck/unit **1748/1748**/두 앱 build)
- 전체 Chromium E2E **151/151**
- `git diff --check` PASS, 허용 범위 밖 제품 diff 0, Rules/firebase config diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, `denn-e2e-*`/temp/debug 잔류 0
- 고객(mockup) entry **불변**: `index-6js4DafP.js`, 322,018 bytes, SHA-256 `A9360EFF…E55E8159`
- mutation 확인: art gate를 비활성화하면 targeted unit 3건이 실패한다(거짓 통과 아님)

### DEVIATION — admin entry hash (§5 게이트 1건 미충족)

정본 §5의 "admin entry도 변경 전후 name/bytes/SHA-256 동일"은 **충족하지 못했다**. 원인과 증거:

- admin entry JS는 **byte-identical**(226,201)이고, baseline `index-D0XOQpRL.js`와의 유일한 차이는
  dynamic import 문자열 `./admin-write-*.js` 한 곳이다. `admin-write` chunk의 유일한 차이도 entry
  파일명 한 곳이다(상호 파일명 참조).
- admin JS 어느 asset에도 `SPACE_V2_ISSUE` / `createSpaceV2FrameIssueCandidate` /
  `frame-logical-plan-v1` / `rebuild-space-assets` 문자열이 **0건**이다. 즉 미사용 module은 bundle에
  들어가지 않았다(§5의 실질 요건은 충족).
- 실제 변화의 시작점은 **Tailwind v4 source 스캔**이다. `apps/admin` 소스 텍스트에 등장하는 단어가
  utility 후보가 되므로, evidence 계약이 강제하는 필드명 `transform`(및 fixture가 요구하는 `italic`)이
  admin CSS를 9,144 → 9,821 bytes로 키운다(`.transform`, `.italic`, `@property` rotate/skew 블록).
  CSS asset이 바뀌면 entry chunk hash가 바뀌고, 그 여파로 두 파일명이 함께 바뀐다.
- 회피 가능한 후보(`!transform`, 주석의 `uppercase`)는 제거했다. 남은 `transform`은 스펙 064 evidence의
  필드명이라 허용 파일 안에서 피할 수 없고, `italic`은 spec 031 text zone 저작 shape가 boolean으로
  요구한다. Tailwind/vite config 변경은 허용 파일 밖이라 하지 않았다.

판단이 필요하면 Codex가 (a) 이 deviation을 수용하고 게이트 문구를 "unused module이 JS bundle에
포함되지 않음 + 고객 entry 불변"으로 정정하거나, (b) admin CSS 스캔 경계를 바꾸는 별도 스펙을
여는 두 방향 중 하나를 선택하면 된다. 이 세션은 (a)/(b) 어느 쪽도 임의로 실행하지 않았다.

### CODEX REVIEW — CORRECTION_REQUIRED ROUND 1 (2026-08-21)

검수 기준은 HEAD=origin `4c6ebf4`, candidate `5fc89d2`다. 허용 제품 diff 4개는 정확했으며 targeted
**177/177**(신규 52 + spaces 125), admin typecheck, `node scripts/check.mjs` PASS(unit **1748/1748**),
전체 Chromium **151/151**을 독립 재현했다. 고객 entry도 기준과 동일하다. 다만 다음 3건을 보완해야
한다.

#### C-1 — catalog를 한 번 detach한 뒤 두 projector가 같은 snapshot을 사용

현재 top-level snapshot은 `catalog` 객체 참조를 그대로 보존한다. 이후
`projectFramePreviewGeometry(catalog, selection)`와 `projectCatalogTemplateImage(catalog, ...)`가 같은
catalog를 별도로 읽는다. 따라서 raw template의 drifting getter가 첫 projection에는 art를 반환하고 두
번째에는 `undefined`를 반환하면 geometry와 art 부재 판정이 서로 다른 순간의 값이 될 수 있다.
“같은 selection snapshot”만으로는 H-3의 hostile/drifting fail-closed를 충족하지 않는다.

- 기존 정본 `readLegacyCatalog(issue.catalog)`를 정확히 한 번 호출해 JSON-safe detached
  `CatalogDocumentV1`을 얻는다.
- 실패는 raw report/path/value 없이 `SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED`로 매핑한다.
- geometry와 template image projector는 반드시 그 동일 detached document만 사용한다.
- template art getter가 첫 read와 두 번째 read에서 달라지는 합성 입력을 추가한다. raw getter는 한 번만
  읽혀야 하며, 첫 snapshot이 art-present면 digest 0 + unsupported, art-absent면 이후 drift와 무관하게
  동일 snapshot으로 결정돼야 한다.

#### C-2 — admin 비-UI source를 Tailwind scan에서 제외해 bundle 게이트 복원

게이트 문구를 약화하지 않는다. 저장소에는 스펙 021에서 같은 원인을 해결한 정본 선례가 이미 있다:
`packages/ui/src/theme.css`의
`@source not "../../../apps/mockup/src/canvas/**/*";`다.

- 같은 주석 블록에 정확히
  `@source not "../../../apps/admin/src/space-v2/**/*";`를 추가한다.
- 제외 범위는 JSX/className이 없는 이 비-UI 디렉터리 하나뿐이다. `source(none)`, broad app exclusion,
  safelist/blocklist, field/comment 문자열 난독화는 금지한다.
- 독립 baseline build에서 admin entry는 `index-D0XOQpRL.js`, **226,201 bytes**, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`였다. correction 뒤 이 entry
  identity가 복원되고 production admin CSS에 spec 065 때문에 생긴 `.transform`/`.italic` 및 관련
  transform property scaffolding이 없어야 한다.
- mockup bundle과 기존 mockup Canvas exclusion도 그대로여야 한다.

#### C-3 — commit 범위 diff-check

`git diff --check dcd893c..4c6ebf4`는 handoff EOF의 `new blank line at EOF` 1건을 보고한다. handoff의
불필요한 끝 blank line을 제거하고, correction commit뿐 아니라 `dcd893c..새 기록 HEAD` 전체 범위가
`git diff --check`를 통과해야 한다.

보완 허용 제품 파일은 다음뿐이다.

- `apps/admin/src/space-v2/issue-candidate.ts`
- `apps/admin/src/space-v2/issue-candidate.test.ts`
- `packages/ui/src/theme.css` — 위 exact narrow source exclusion과 근거 주석만

문서는 이 스펙, handoff, STATE/NEXT/CURRENT/live log만 허용한다. package/lockfile는 이미 승인된
workspace link 상태에서 추가 diff 0이어야 한다. `App.tsx`, UI/CSS 디자인 규칙, Vite/Tailwind config,
Firebase/Rules/config와 실제 network는 계속 금지다.

### CORRECTION ROUND 1 (Claude) — 2026-08-21

보완 commit `ec7610e`. C-1~C-3만 처리했고 허용 제품 파일 3개 밖으로 나가지 않았다.
`apps/admin/package.json`과 `pnpm-lock.yaml`은 추가 diff **0**이다.

**C-1 — catalog 1회 detach.** `readLegacyCatalog(issue.catalog)`를 정확히 한 번 호출해 JSON-safe
detached `CatalogDocumentV1`을 만들고, `projectFramePreviewGeometry`와 `projectCatalogTemplateImage`가
모두 그 document만 사용한다. 실패(및 revoked Proxy 등의 throw)는 raw report/path/value 없이
`SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED`로 매핑한다. detached document는 JSON-safe clone이라
image projector가 throw할 수 없으므로 기존 방어 try/catch는 도달 불가 코드가 되어 제거했다.

회귀 2건 추가:

- 첫 read가 art-present면 이후 drift와 무관하게 `UNSUPPORTED_CAPABILITY` + digest 0, raw getter read 1회
- 첫 read가 art-absent면 이후 art가 생겨도 동일 snapshot으로 성공, raw getter read 1회

**C-2 — admin 비-UI source 제외.** `packages/ui/src/theme.css`의 기존 spec 021 주석 블록 옆에
`@source not "../../../apps/admin/src/space-v2/**/*";` 한 줄과 근거 문장만 추가했다. `source(none)`,
broad exclusion, safelist/blocklist, 문자열 난독화, Vite/Tailwind config 변경은 없다. 결과:

- admin entry `index-D0XOQpRL.js`, **226,201 bytes**, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC` — baseline과 **완전 일치**
- admin production CSS `index-DJ_z3tK1.css` **9,146 bytes**로 복귀. `.transform`/`.italic`/
  `@property --tw-rotate|skew` scaffold **0건**
- `admin-write-VpnNr13n.js` chunk 이름도 baseline과 동일
- mockup entry `index-6js4DafP.js` 322,018 bytes / SHA-256 `A9360EFF…E55E8159` 및 mockup CSS
  `index-BjqjBda8.css` 불변, 기존 mockup Canvas exclusion 그대로

**C-3 — diff-check.** handoff EOF blank line을 제거해 `git diff --check dcd893c..기록 HEAD` 전체 범위가
PASS한다.

재검증:

- targeted unit **54/54**(신규 drift 회귀 2건 포함), `vitest run packages/spaces` **125/125**
- `node scripts/check.mjs` **PASS** — format/lint/7 typecheck(ui·admin 포함)/unit **1750/1750**/두 앱 build
- 전체 Chromium E2E **151/151**
- `git diff --check` PASS, 허용 3개 파일 밖 제품 diff 0, package/lockfile 추가 diff 0
- 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, temp/debug 잔류 0

이전 DONE 절의 DEVIATION(§5 admin entry hash)은 C-2로 **해소**됐다. 게이트 문구는 약화하지 않았다.

### CODEX REVIEW — PASSED (2026-08-21)

HEAD=origin `7255012`에서 보완 commit `ec7610e`를 독립 검토했다. 허용 제품 diff는
`issue-candidate.ts`, 해당 unit, `packages/ui/src/theme.css` 정확히 3개이고 C-1~C-3을 모두 충족한다.
추가 결함은 없다.

- targeted issue candidate + spaces 전체 **179/179**
- admin/ui typecheck PASS
- `node scripts/check.mjs` PASS: format/lint/7 typecheck/unit **1750/1750**/두 앱 build
- 전체 Chromium E2E **151/151**
- admin entry `index-D0XOQpRL.js` 226,201 bytes / SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
- customer entry `index-6js4DafP.js` 322,018 bytes / SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- admin CSS `index-DJ_z3tK1.css` 실측 **9,146 bytes**;
  `.transform`/`.italic`/`@property --tw-rotate|skew` 0건
- `git diff --check dcd893c..HEAD` PASS, staged 0, 지정 포트/temp/debug 잔류 0

Claude 완료 기록의 CSS **9,144 bytes**는 독립 실측과 2 bytes 차이나므로 9,146으로 정정한다. bundle
identity 복원과 오염 selector 0건 판정에는 영향이 없다. 최종 판정은 **CODEX_PASSED / DONE**이다.
실제 Firebase/network/UID/Rules/emulator/deploy, token/encryption/upload/document create,
issuer/viewer/UI 연결은 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.
