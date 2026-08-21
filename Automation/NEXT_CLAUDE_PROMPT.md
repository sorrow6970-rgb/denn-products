# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_NEXT_MANUAL_TASK`
active_unit: `none` — **다음 제품 단위 미선택 / 미승인**
completed_unit: `spec-064-space-v2-local-contract` — **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI**
검수 기준: HEAD=origin **`1f60bc5`**, ahead/behind **0/0**
next_transition: **`NEXT_MANUAL_SPEC_SELECTION`**

## ★ 현재 Claude Code 지시 — HOLD

스펙 064는 Codex 독립 검수를 통과했다. 다음 제품 단위와 허용 파일이 아직 정해지지 않았으므로 제품
코드·테스트·Rules·config·package/lockfile를 수정하지 않는다. 새 스펙을 추측해 시작하거나 issuer,
Firebase adapter, Storage upload, Firestore create, viewer/UI 연결로 확장하지 않는다.

사용자의 다음 수동 제품 지시와 Codex가 작성한 새 `docs/rebuild/specs/NNN-*.md`가 준비된 뒤에만 아래
수동 시작 문구로 작업한다.

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 명시된 범위만 수행해. 보호 대상은 건드리지 말고 자동화는 만들지 마. 완료 후 STATE/NEXT/CURRENT/live log를 실제 상태와 맞추고 결과를 보고해.
```

복원된 순서:

1. Claude Code가 승인된 스펙 범위만 구현·검증한다.
2. Claude Code가 live log와 STATE/NEXT/CURRENT를 실제 상태에 맞춘다.
3. Codex가 구현 diff와 게이트를 독립 검수한다.
4. Codex가 판정 및 다음 Claude 프롬프트 문서를 남긴다.
5. Claude Code는 그 문서를 읽고 다음 승인 단위만 수행한다.

자동화·반복 작업은 만들지 않는다. Codex의 제품 코드 직접 수정도 중단됐다.

### Claude Code 확인 기록 (2026-08-21)

Claude Code가 이 문서를 읽고 HOLD를 준수했다. active_unit이 `none`이라 구현 범위가 없어 제품
코드·테스트·Rules·config·package/lockfile을 변경하지 않았고, 새 스펙을 추측해 시작하지 않았다.
기록 상태만 로컬 재확인했다 — HEAD=origin `1f60bc5`, ahead/behind 0/0, staged 0,
`node scripts/check.mjs` PASS(unit 1696/1696), `vitest run packages/spaces` 125/125,
고객 entry `index-6js4DafP.js` 322,018 bytes / 기준 SHA-256 일치, `git diff --check` PASS.
전체 Chromium E2E는 이번 세션 제품 diff가 0이라 재실행하지 않았다. Codex 종료 문서만 commit·push
했고 보호 대상 spec-018 PNG와 기존 Founder/user 변경은 그대로 뒀다.

## ★ 스펙 064 — CODEX_PASSED / DONE

- 구현 commit `0c5d6fa`, 기록·검수 기준 HEAD `1f60bc5`.
- 허용 제품 diff 3개와 계약을 독립 대조했고 추가 결함 0.
- targeted spaces **107/107**, spaces typecheck, 전체 check PASS(unit **1696/1696**), 전체 Chromium
  **151/151**, `git diff --check` PASS.
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- 실제 Firebase/network/UID/Rules/emulator/deploy, issuer/viewer/UI, upload/document create는 계속
  **NOT IMPLEMENTED / NOT TESTED / 금지**다.

## ★ 스펙 064 — 첫 local-only space V2 replay evidence 구현 검수

정본: `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`
Founder 결정:
`docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`
handoff: `docs/handoff/2026-08-20-spec-064-space-v2-replay-evidence-investigation-handoff.md`

Founder **GG-1=A~GG-6=A**에 따른 첫 local-only 구현 commit은 **`0c5d6fa`**다. 아래 허용 diff를
정본의 exact shape/canonical tuple과 독립 대조한다.

제품 변경 파일은 정확히 다음 세 개여야 한다.

- 신규 `packages/spaces/src/v2.ts`
- 신규 `packages/spaces/src/v2.test.ts`
- `packages/spaces/src/index.ts` — V2 explicit export만

검수 핵심:

- V2 outer/scene/nested exact-key와 enum/range/orientation/color/path/base64/byte-cap 검증이 strict한가.
- fixed-position tuple이 정본 순서와 정확히 같고 arbitrary key order, `-0`, hostile/drifting input을
  deterministic detached snapshot으로 처리하는가.
- digest port가 exact canonical bytes를 한 번만 받고 throw/reject/bad-length/mismatch를 safe code로
  매핑하는가. raw path/token/password/customer text/bytes/error message가 실패에 없는가.
- first capability 밖 text/art/clock/room을 accepted state로 넓히지 않았는가.
- 기존 V1 `SPACE_SCENE_VERSION`, reader/open/types/results가 그대로인가.
- 미사용 V2 export가 고객 bundle에 포함되지 않고 기준 entry byte/hash가 유지되는가.

구현자가 보고한 결과:

- targeted spaces **107/107**
- `node scripts/check.mjs` PASS: format/lint/all typecheck/unit **1696/1696**/mockup+admin build
- 전체 Chromium **151/151**
- canonical vector Web Crypto/.NET SHA-256 일치:
  `9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=`
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- 포트/temp/debug 잔류 0

독립 재검증:

- targeted spaces unit/typecheck와 `node scripts/check.mjs`
- 전체 Chromium E2E 또는 변경 무관성을 증명할 동등한 회귀 게이트
- `git diff --check`, exact changed paths, package/lockfile/Rules/config diff 0
- 고객 entry name/bytes/SHA-256 기준 일치
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium은 보호 대상 spec-018 PNG 두 개를 다시 쓴다. restore/checkout/stage/commit하지 않고
기존 dirty 상태로 남긴다.

계속 금지:

- `storage.rules`, `firestore.rules`, `firebase.json`, env/config, 실제 UID
- Firebase SDK adapter, Storage upload/read, Firestore document create/reconciliation
- token 발급, issuer projector, admin/customer UI·CSS, viewer/open composition
- V1 migration/rewrite, text/font/art/clock/room/gallery 확장
- orphan delete/cleanup, published write, C6/backend, dependency/package/lockfile 변경
- 실제 Firebase/project/bucket/object/network/data, emulator/live/deploy

추가 결함이 없으면 `CODEX_PASSED`로 종료 문서만 갱신한다. 결함이 있으면 허용 3개 제품 파일과 spec 064
문서 안에서만 `CORRECTION_REQUIRED`를 작성한다. Rules/Firebase/UI/issuer/viewer로 확장하지 않는다.
보호 대상과 기존 Founder/user 변경은 stage/commit/restore하지 않는다.

## ★ 스펙 063 — V1 안전 차단 viewer UI/UX (종료)

정본: `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md`
handoff: `docs/handoff/2026-08-20-spec-063-space-v1-safe-viewer-ui-handoff.md`

`SpacePostAuthFrameView`가 catalog load·proof owner·Image decode·font load·Canvas plan보다 **먼저**
V1 replay 자격을 판정한다. blocked면 그 뒤 단계가 하나도 시작되지 않는다 — 인증 전후 모두 catalog/
proof/art 요청 0, Canvas 0, retry 0, 자동 fallback/merge/migration 0.

구조는 wrapper/child 분리다. wrapper는 `useMemo` 하나만 무조건 호출하고 분기는 자식 컴포넌트 선택이므로
조건부 hook 호출이 없다. `SpaceExactFrameComposition`은 module-private라 gate를 우회하는 seam이 없다.

안전 안내는 Modern Studio 토큰만 쓴다. 오류코드·URL·token·비밀번호·ID·SDK 문구 0, Canvas·이미지
placeholder 0, 재시도 버튼 0, 카카오/외부 링크 0. `role="alert"` + `aria-labelledby`, 320px 가로 overflow 0.

검증: targeted unit 15/15, `node scripts/check.mjs` PASS(unit 1627/1627), 전체 Chromium E2E
**151 passed / 0 failed**(변경 전 baseline 실측 3 failed / 145 passed), console error/warning 0,
axe serious/critical 0, 실제 외부 egress 0, 포트 잔류 0. 고객 entry `index-6js4DafP.js` 322,018 bytes, SHA-256
`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.

### Founder Q1 = A (해소됨)

`tests/e2e/space-frame-view.spec.ts` 2건은 기준 커밋 `e9dbb9e`에서 이미 실패 상태였다. 스펙 062가
`composeSpaceFramePlan()`을 fail-closed로 바꾼 결과이며, 스펙 062는 FF-5=A 범위 밖이라 E2E를
실행하지도 수정하지도 않았다.

Founder가 A를 선택해 이 spec 파일만 허용 추가했다. fixture
`apps/mockup/src/e2e/space-frame-fixture.tsx`는 변경 0이고, 그 계측으로 주입된 catalog reader·
readiness factory·font environment 호출 0을 직접 검증한다(production route가 할 수 없는 검증).
도달 불가해진 canvas 단계 단언의 대체 coverage는 스펙 §7.2에 명시했다.

Codex 독립 검수에서 코드·테스트·계약상 추가 결함을 찾지 못했다. 독립 재현은 targeted unit
**15/15**, `node scripts/check.mjs` PASS(unit **1627/1627**), 변경 범위 Chromium E2E **8/8**,
`git diff --check` PASS다. Claude의 전체 Chromium **151/151** 결과와 고객 entry 해시도 대조 일치했다.
두 spec-063 시각 결과를 직접 확인했고 안전 차단 화면의 계층·문구·모바일 wrapping에 결함을 찾지 못했다.

실제 Firebase/project/token/document, 운영 V1 scene, 실제 catalog/proof/CORS, 실기기·실폰트,
V2 schema/fingerprint/issuer, admin orientation UI, migration/재발급, write/publish/deploy/cutover는 여전히
**NOT TESTED / NOT IMPLEMENTED / 금지**다.

스펙 063은 **DONE / CODEX_PASSED**다. 다음 스펙이나 구현은 자동 시작하지 않는다. Founder의 다음 수동
작업을 기다린다.

## 참고 — 이전 단위

## ★ 스펙 062 종료 - V1 방향·사진 transform 재현 차단

정본: `docs/rebuild/specs/062-space-v1-orientation-transform-replay-investigation.md`

V1 scene은 `frameImgT`는 저장하지만 portrait/landscape mode와 capture logical canvas/zone/image basis,
catalog revision을 저장하지 않는다. legacy x/y는 absolute logical px이고 current x/y는 maxPan 기준
normalized 값이다. `rot=0`도 portrait와 unrotated landscape를 구분하지 못한다.

따라서 현재 identity-looking transform 성공은 전체 frame exact replay를 증명하지 않는다. 스펙 061은
실제 운영에 배포되지 않았고 실제 Firebase/network/운영 데이터 접근은 0이다.

Founder 결정:

- **FF-1=A:** orientation evidence 없는 V1 exact replay fail-closed
- **FF-2=A:** centered zoom은 별도 evidence가 있을 때만 조건부, heuristic pan/rot 변환 0
- **FF-3=A:** explicit orientation + normalized transform + geometry evidence의 future version
- **FF-4=A:** V1 자동 migration/same-token rewrite 0
- **FF-5=A:** 첫 correction은 pure classifier/plan gate/unit만, UI/CSS/issuer/network 0

구현 `a09278a`. V1 classifier가 malformed/unsupported/orientation-unconfirmed를 분리하고 frame plan은
proof owner·Image·Canvas plan 전에 fail-closed한다. targeted 59/59, 전체 non-network check PASS(unit
1612/1612), 고객 entry `index-Df973d19.js` 320,713 bytes, SHA-256
`4389D6D60367314FF80FC0793E1085C6646DAD946FA23CA2A3911013331A2453`.

## ★ 다음 수동 작업 - Claude UI/UX 인계

V2 발급 화면, partial replay 안내, orientation 선택·표시는 실제 UI/UX 구현 단계다. 사용자 지시에 따라
Codex는 이 단계의 디자인·UI 구현을 시작하지 않는다. Claude가 먼저 다음 경계를 계약으로 고정해야 한다.

- 새 immutable token을 쓰는 별도 scene version. V1 reader/migration/same-token rewrite 변경 0.
- explicit orientation, normalized transform encoding, geometry/catalog evidence를 UI가 임의로 정의하지 않음.
- V1 viewer는 안전 오류/재발급 안내만 제공하고 best-effort Canvas·자동 fallback·자동 migration 0.
- admin issuer의 orientation 선택과 재현 가능성 안내, viewer의 partial/exact 상태 표현은 Modern Studio 디자인
  정본을 따르되 기존 고객 browse/preview 디자인을 임의 변경하지 않음.
- 스펙 061 production-route E2E의 V1 Canvas 성공 기대를 안전 오류 기대값으로 갱신하되 외부 egress 0 유지.
- 실제 Firebase/project/token/network/write/deploy와 운영 데이터 접근 0. V2 schema/fingerprint가 별도
  비시각 계약으로 확정되지 않으면 UI 구현도 STOP.

Codex는 Claude 결과를 코드·계약·회귀 관점에서 검수할 수 있다. 다음 작업은 자동 시작하지 않는다.

## ★ 스펙 061 종료 - production frame route 연결

정본: `docs/rebuild/specs/061-space-production-frame-route-connection-investigation.md`

Founder **EE-1=A~EE-5=A**에 따라 production ready seam에 `SpacePostAuthFrameView`와 production
`publicCatalogReader`를 연결했다. root에는 controller factory 하나만 합성 seam으로 추가했고 일반 browse
route는 이 factory를 만들지 않는다.

non-production fixture는 production root/default reader/browser Image owner를 사용한다. Playwright가 모든
HTTPS를 정규식 catch-all로 intercept하고 exact catalog/proof URL만 합성 응답해 실제 외부 egress를 0으로
유지했다. pre-auth 요청 0, ready Canvas 1, invalid catalog fail-closed, unmount 뒤 late proof 차단과 비밀
비노출을 검증했다.

자체 검수에서 문자열 glob catch-all이 의도대로 동작하지 않아 신규 E2E 3개가 실패한 사실을 발견했고,
정규식으로 교정했다. 구현 **`cf13a2a`**. 전체 check PASS(unit **1609/1609**), Chromium **148/148**,
고객 entry `index-CVr4hkHb.js` **322,548 bytes**, SHA-256
**`E70626F22B181C3BC5DBCE4F5B6B644E3AC026B814ECFAE3AC8D1738D9384334`**.

실제 Firebase/project/config/network/CORS/운영 object, 실제 모바일·운영 폰트 시각 정확도,
room/gallery/clock/non-neutral transform, 편집·인쇄·주문·발행·write/delete/deploy/cutover는
NOT TESTED/NOT IMPLEMENTED 또는 금지다. 다음 단위는 자동 시작하지 않는다.

## ★ 스펙 060 종료

정본: `docs/rebuild/specs/060-space-post-auth-frame-view-investigation.md`

Founder **DD-1=A~DD-5=A**에 따라 ready-only scene seam, injectable view, source-bound owner,
content-box width, conditional exact-font gate와 합성 browser fixture를 구현했다. current plan success에서만
Canvas가 mount된다.

자체 검수에서 StrictMode initializer 이중 호출 owner 누수를 발견해 inert initializer와 effect-owned controller로
보완했다. development React Chromium fixture가 실제 setup→cleanup→setup과 추가 unmount/remount를 검증한다.

`pnpm check` PASS(unit 1608/1608), Chromium 145/145 PASS. production `App.tsx` 연결, 실제 Firebase/network/
CORS/운영 object, 실제 다양한 폰트·viewport 시각 검증, 편집·인쇄·주문·발행·write/delete/deploy는
NOT TESTED/NOT IMPLEMENTED 또는 금지다.

다음 단위를 자동 시작하지 않는다. Founder의 다음 수동 작업을 기다린다.

## ★ 스펙 059 종료

Founder CC-1=A~CC-5=A에 따라 pure frame asset request projector와 unit만 구현했다. detached catalog
snapshot에서 exact reference, proof trust, art placement/projection/public-image trust를 모두 통과한 뒤에만
proof/art source를 함께 반환한다. 실패는 source 없는 safe code이며 IO는 0이다.

targeted 11/11, 전체 check unit 1602/1602, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 public catalog/
proof/art network, React, ResizeObserver, fonts, Image decode, Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 단위를 자동 시작하지 않는다.

## 이전 — 스펙 059 조사와 Founder 결정

정본: `docs/rebuild/specs/059-space-post-auth-view-composition-investigation.md`

space route는 password 성공 뒤에도 public catalog를 load하지 않는다. readiness adapter에 전달할 proof/art
source를 exact reference/placement/trust로 한 번에 결정하는 pure projector도 없다.

- CC-1=A 권장: catalog는 post-auth child mount 뒤만
- CC-2=A 권장: pure asset-request projector, whole success 뒤 load
- CC-3=A 권장: measured content box + 기존 width helper
- CC-4=A 권장: nonempty text exact font gate + plan-ready Canvas만
- CC-5=A 권장: 첫 구현은 projector + unit만

Founder는 CC-1=A~CC-5=A를 승인했다.

## ★ 스펙 058 종료

Founder BB-1=A~BB-5=A에 따라 proof/art owner를 독점 소유하는 framework-free adapter를 구현했다.
exact source, current ready, owner-specific synthetic ref, positive intrinsic size, live binding을 모두 요구한다.
replacement/clear source-first 무효화와 same-ref late result 방어, composite bindings를 검증했다.

targeted 8/8, 전체 check unit 1591/1591, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Image/network/
CORS/React/post-auth catalog/layout/font/Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 React hook보다 먼저 post-auth view composition의 catalog load·layout/font·Canvas 연결 경계를
조사하는 단위다. 자동 시작하지 않는다.

## 이전 — 스펙 058 조사와 Founder 결정

정본: `docs/rebuild/specs/058-space-source-bound-readiness-investigation.md`

기존 proof/art owner는 source를 public state에 노출하지 않아 stale source 여부를 단독으로 증명하지 못한다.
adapter가 raw owner를 독점 소유하고 exact source + ready snapshot + binding 존재를 함께 확인해야 한다.

- BB-1=A 권장: framework-free adapter + unit
- BB-2=A 권장: raw owner 독점 소유
- BB-3=A 권장: exact source + ready + binding 모두 요구
- BB-4=A 권장: source-first lifecycle + combined subscribe/composite bindings
- BB-5=A 권장: 기존 owner/hook/App/UI/E2E 변경 0

BB-1~BB-5는 모두 A로 승인되어 local adapter 구현이 완료됐다.

## ★ 스펙 057 종료

Founder AA-1=A~AA-6=A에 따라 pure view-only frame plan composer를 구현했다. exact proof URL trust와
source-bound readiness, neutral transform, geometry/template art, clock/layout/text 조건을 순서대로 검증하고
모든 실패를 부분 plan 없이 닫는다. 성공도 `replayComplete:false`다.

targeted 18/18, 전체 check unit 1583/1583, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 owner
adapter/Firebase/network/Image/font/Canvas/React/UI/clock/room/gallery/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 source-bound readiness를 실제 proof/template-art owner lifecycle에 연결하기 전 adapter/hook
composition 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 057 조사와 Founder 결정

정본: `docs/rebuild/specs/057-space-view-only-frame-plan-investigation.md`

scene refs, neutral proof transform, proof owner, geometry와 product plan은 준비돼 있다. logical width와
nonempty text measure는 주입해야 하고, template art는 none 또는 externally ready stretch만 안전하다.
clock는 frame plan 밖이므로 첫 합성은 `clockOn === false`만 허용한다. 성공도 room/gallery 미지원 때문에
`replayComplete:false`다.

- AA-1=A 권장: pure composer + unit만
- AA-2=A 권장: trust 순서 고정 + whole-plan fail-closed
- AA-3=A 권장: logical width/measure port 주입, default 추측 0
- AA-4=A 권장: clock false만, complete 주장 0
- AA-5=A 권장: art none 또는 externally ready stretch만

AA-1~AA-6은 모두 A로 승인되어 local pure composer 구현이 완료됐다.

## ★ 스펙 056 종료

Founder V-1=A~V-5=A에 따라 proof 전용 framework-free image owner를 구현했다. owner가 스펙 055 trust를
재검증하고 CORS-before-src, one-active generation, safe intrinsic/binding과 late-result 차단을 소유한다.

targeted 13/13, 전체 check unit 1565/1565, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Firebase/
network/Image decode/CORS, React hook, plan/UI/renderer/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2-C view-only frame plan composition 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 056 조사와 Founder 결정

정본: `docs/rebuild/specs/056-space-proof-image-owner-investigation.md`

plan은 URL이 아닌 decoded drawable의 synthetic binding과 intrinsic size를 요구한다. 기존 template-art owner
패턴은 참고 가능하지만 proof trust 재검증/전용 상태가 없어 dedicated owner가 필요하다.

- V-1=A 권장: proof 전용 framework-free controller
- V-2=A 권장: owner 내부에서 spec055 resolver 재검증
- V-3=A 권장: anonymous CORS before src, assignment 1회, retry/cache/fallback 0
- V-4=A 권장: one-active generation, late result 차단, safe intrinsic/binding
- V-5=A 권장: controller + fake unit만; hook/App/network/plan 0

V-1~V-5는 모두 A로 승인되어 dedicated local owner 구현이 완료됐다.

## 이전 — 스펙 055 종료

Founder T-1=A~T-5=A에 따라 exact Firebase proof REST URL과 exact-neutral transform eligibility를
pure local 경계로 구현했다. URL은 성공 결과에만 남고 non-neutral transform은 변환하지 않는다.

targeted 38/38, 전체 check unit 1552/1552, Chromium 143/143 PASS. 고객 entry/hash 동일.
실제 Firebase/network/object/image/CORS/owner/plan/UI/renderer/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2-B remote proof image owner 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 055 조사와 Founder 결정

정본: `docs/rebuild/specs/055-space-proof-image-view-plan-investigation.md`

기존 image trust는 `proofs/` 전용이 아니며 plan은 URL이 아니라 loaded drawable의 synthetic ref와
intrinsic size를 요구한다. neutral 외 legacy transform 변환은 UNCONFIRMED다.

- T-1=A 권장: exact bucket + once-decoded `proofs/` prefix
- T-2=A 권장: exact-one `alt=media`, optional single token, unknown/duplicate query·fragment 거부
- T-3=A 권장: exact neutral transform만 identity 지원
- T-4=A 권장: 다음은 V2-A pure resolver/eligibility + unit만
- T-5=A 권장: future renderer는 editable PreviewComposer와 분리

T-1~T-5는 모두 A로 승인되어 V2-A local-only 구현이 완료됐다.

## 이전 — 스펙 054 종료

Founder S-1=A/S-2=A/S-3=A/S-4=A/S-5=A에 따라 exact catalog reference와 단일 solid color,
HTTPS photo 후보만 검증하는 pure validator를 구현했다. transform은 validated-but-unapplied, room/gallery는
unsupported, `replayComplete:false`다.

targeted 19/19, 전체 check unit 1514/1514, Chromium 143/143 PASS. 고객 entry/hash는 스펙 053과 동일하다.
실제 Firebase/network/image fetch/proof prefix trust/UI/renderer/room/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2 proof URL trust + view-only frame plan 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 054 조사와 Founder 결정

정본: `docs/rebuild/specs/054-space-scene-application-boundary-investigation.md`

legacy imgT x/y는 Canvas px이고 현재 transform은 normalized 비율이다. capture 당시 크기가 payload에 없어
정확 변환은 UNCONFIRMED다. scene은 frame-only이며 catalog 참조 검증과 room/gallery renderer도 없다.

- S-1=A 권장: 다음은 V1 순수 catalog 참조 검증기만
- S-2=A 권장: frame-only, tpl/size/color/photo 필수 exact 참조, fallback 0
- S-3=A 권장: exact color ID/fill을 canonical solid로만, grain/모호성 거부
- S-4=A 권장: transform validated-but-unapplied, clamp/복사 0
- S-5=A 권장: room/gallery unsupported, 재현 완료로 간주하지 않음

S-1~S-5는 모두 A로 승인되어 V1 local-only 구현이 완료됐다.

## 이전 — 스펙 053 종료

R-1=A/R-2=A/R-3=A/R-4=A에 따라 space 독점 mode, complete env config, explicit-submit lazy
Firebase facade, password gate와 StrictMode lifecycle을 구현했다. no-space만 기존 browse를 mount하며
invalid/disabled config의 Firebase init/request는 0이다.

targeted 32/32, unit 1495/1495, Chromium 143/143 PASS. 고객 entry는 `index-Det4NToI.js`,
304,634 bytes, SHA-256 `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`다.

실제 Firebase/project/config/token/document/network/deploy와 scene/image/room 적용은 NOT TESTED다.
다음 후보는 R-4에 따른 catalog 참조 검증 + view-only scene application 경계 조사다. 다음 작업은 자동
시작하지 않는다.

## 이전 — 스펙 053 조사와 Founder 결정

정본: `docs/rebuild/specs/053-space-production-composition-investigation.md`

현재 App은 space query 분기 없이 catalog를 즉시 load한다. controller/read/open은 준비됐지만 React UI,
env config, lazy production factory, scene application port는 없다. decrypt scene의 ID/URL/opaque room 설정도
현재 catalog/CORS/renderer와 대조되지 않았다.

- R-1=A 권장: space query가 있으면 gate 독점, invalid fail-closed, catalog/Firebase factory 0
- R-2=A 권장: exact-true + complete 5-key config, 명시 submit에서 named app lazy init
- R-3=A 권장: 첫 구현은 password gate/safe errors/ready snapshot까지만
- R-4=A 권장: scene 적용은 후속 catalog 참조 검증 + view-only port 계약

R-1~R-4는 모두 A로 승인되어 local gated 구현이 완료됐다.

## 이전 — 스펙 052 종료

순수 `?space=` parser와 injected Firestore reader + spaces open port controller를 구현했다. 비밀번호 오류
재시도는 암호문을 메모리에서 재사용하며 network retry만 재조회한다. duplicate submit, detach/late result,
safe error를 검증했다. targeted 17/17, unit 1479/1479, Chromium 141/141, 고객 hash 동일이다.

`pnpm check` wrapper는 PATH pnpm 11.19의 dependency-status install 시도로 실행되지 않아 같은 정본
entrypoint인 `node scripts/check.mjs`로 전체 게이트를 통과했다. 신규 다운로드·build 승인·workspace 설정
변경은 0이다. 실제 Firebase/project/token/document/network/route UI/scene application/deploy는 NOT TESTED다.
다음 후보는 production 연결 전 password UI composition, Firebase config/factory, scene 적용 경계 조사다.
다음 작업은 자동 시작하지 않는다.

## 이전 — 스펙 051 종료

Q-1=A/Q-2=A/Q-3=A에 따라 `@denn/firebase/space-read` local adapter를 구현했다. targeted 30/30,
unit 1462/1462, Chromium 141/141, 고객 hash 동일이다.

실제 Firebase/project/token/document/network/route/UI는 NOT TESTED다. 다음 local-only 후보는 `?space=`
query parsing과 injected Firebase reader + spaces open port를 합성하는 controller 계약 조사다.

## 이전 — 스펙 051 조사 당시 Founder 결정

정본: `docs/rebuild/specs/051-space-firestore-read-adapter-investigation.md`

실제 Firebase/network 없이 Rules, legacy, SDK 12.17.1과 공식 문서를 조사했다. 권장값은 모두 A다.

- Q-1=A: Firestore 공식 document ID 제약의 single segment token 허용
- Q-2=A: `getDoc` + 기본 memory cache, persistent cache 0
- Q-3=A: named `denn-space-viewer`, config mismatch fail-closed, Auth 0, local unit 범위

위 세 결정은 모두 A로 승인되어 local adapter 구현과 검증이 완료됐다.

## 이전 — 스펙 050 종료

document 검증 → password 검증 → decrypt → scene 검증 순서의 local-only 순수 open port를 구현했다.
targeted 54/54, unit 1432/1432, Chromium 141/141, 고객 hash 동일이다.

실제 Firebase/Firestore/token/link/network/route/UI는 NOT TESTED다. 다음 후보는 Firestore read adapter
계약 조사이며 실제 network나 운영 데이터 접근 전 별도 승인이 필요하다.

## 이전 — 스펙 049 종료

`@denn/spaces`에 `space-v1` document와 `space-scene-v1` plaintext의 순수 reader를 구현했다.
targeted 44/44, unit 1422/1422, Chromium 141/141, 고객 hash 동일이다.

실제 Firestore/token/link/network/scene UI는 NOT TESTED다. 다음 local-only 후보는 crypto와 두 reader를
합성하는 순수 read pipeline이다. Firebase adapter·route/UI는 별도 결정 전 시작하지 않는다.

## 이전 — 스펙 048 종료

운영 전환은 Founder 지시로 보류했다. `@denn/spaces`의 legacy crypto envelope를 pure Web Crypto로
구현했고 fixed vector/hostile input을 검증했다. targeted 20/20, unit 1396/1396, Chromium 141/141,
고객 hash 동일이다.

실제 Firestore/기존 `?space=` 링크/scene 적용은 NOT TESTED다. 다음 local-only 후보는 `space-v1`
document shape와 `space-scene-v1` read validation/projection 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 047 종료 · 운영 선행조건 결정 대기

Founder L-1 canary 한정값/L-2=A/L-3=A에 따라 synthetic transitional Rules와 local manifest gate를
구현했다. manifest 12/12, emulator 4/4, unit 1378/1378, Chromium 141/141 PASS다.

다음 운영 단계에는 두 입력이 필요하다.

- 일반 운영 객체 수·총 byte·저장 빈도 상한, 확인 주기와 책임자
- 실제 승인 운영자 UID 정본

운영 전환은 보류됐다. 실제 Firebase/network/deploy/write/legacy close는 계속 금지다.

## 이전 — 스펙 046 단계적 cutover 계약 · Founder 결정 대기

Founder K-1=A/K-3=A가 승인됐고 K-2=A는 스펙 045에서 완료됐다. 스펙 046은 Firestore transitional →
Storage transitional → write-disabled app → 제한 canary → legacy close 순서와 actual-write 전/후 rollback을
문서화했다. 실제 UID·비용 상한·관찰 주체가 없어 운영 전환은 계속 차단된다.

남은 결정(권장 모두 A):

- L-1=A: canary 전 객체 수·총 byte·저장 횟수 상한과 일일 확인 담당자를 명시
- L-2=A: 승인 UID 한 명·새 `/admin/` 한 탭만 사용하고 dual-window legacy 저장은 절차로 중지
- L-3=A: 저장 1건과 head/object/REC·재로그인·새 탭 확인 후 별도 승인으로 legacy close

L-1~L-3은 모두 승인되어 스펙 047 local-only gate가 완료됐다.

## 이전 — 스펙 045 종료 · 스펙 044 Founder 결정 대기

정본: `docs/rebuild/specs/044-admin-write-cutover-readiness-investigation.md`

운영 write는 NOT READY다. 실제 UID 정본, G-4 비용 상한, deploy-safe Hosting/admin route와 단계적
cutover/rollback 계약이 없다.

권장값:

- K-1=A: 비용/용량 상한·관찰 주체 결정 전 운영 쓰기 차단 유지
- K-2=A: 다음은 local-only deploy-safe Hosting/admin route 패키징 스펙 045
- K-3=A: 향후 transitional Rules→app→legacy close 방향

K-2=A 로컬 패키징은 완료됐다. targeted 18/18, unit 1366/1366, Chromium 141/141, 고객 hash 동일,
포트/temp 잔류 0이다. 실제 Firebase/UID/Rules/Hosting deploy/write 활성화는 수행하지 않았다.

K-1=A/K-3=A로 승인되어 스펙 046 계약으로 전이했다.

## ★ 스펙 043 종료 — gated admin write composition

Founder Y-2=A/Y-3=A/Y-4=A/Y-5=A에 따라 단일 composition/auth 권위, production auth-only mode,
별도 exact-true write gate, 명시 load lazy write holder를 구현했다. 기본 production build에서는
write controller/editor가 0이며 운영 write flag는 설정하지 않았다.

targeted 52/52, `pnpm check` PASS(unit 1363/1363), Chromium 139/139, 고객 JS hash 동일.
실제 Firebase/emulator/UID/IAM/Rules 배포/운영 쓰기·발행·delete는 NOT TESTED/금지다.
다음 수동 지시를 기다린다.

## ★ 스펙 043 조사 당시 Founder 결정 대기 (완료 이력)

정본: `docs/rebuild/specs/043-admin-ui-composition-preconnection-contract.md`

Y-1=A 문서 조사 결과, 권장값은 **Y-2=A/Y-3=A/Y-4=A/Y-5=A**다.

- Y-2: 단일 app composition root + `OperatorAuthPort` 한 권위
- Y-3: production에서는 auth-only read card, C5 baseline load 하나만 표시
- Y-4: read enable과 분리된 exact-true write enable gate
- Y-5: 첫 명시 load에서 rejection-safe lazy write facade/port 생성

위 결정은 모두 A로 승인되어 로컬 gated 구현이 완료됐다. 실제 Firebase·UID·Rules 배포·운영 쓰기·
발행·delete 금지는 유지된다.

## ★ 스펙 042 종료 — 합성 로컬 브라우저 fixture

Founder X-1=A/X-2=A/X-3=A에 따라 실제 session controller/editor를 합성 auth/write fake에 연결한
별도 Chromium fixture를 구현했다. production `App.tsx`·composition·Firebase adapter/network는 0이다.

`pnpm check` PASS(unit 1356/1356), Chromium 139/139(신규 5), 고객 JS hash 동일.
실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/UI 연결/delete/발행은 NOT TESTED/금지다.
다음 수동 지시를 기다린다.

## ★ 스펙 041 종료 — W-1 F-D provenance

Founder W-1=A에 따라 baseline provenance, same-port exact load precondition, legacy field 불변 검사,
read-time 승격 canonical payload 제거를 구현했다. legacy field 포함 size는 읽기 전용이다.

targeted 74/74, `pnpm check` PASS(unit 1356/1356), Chromium 134/134, 고객 JS hash 동일.
`App.tsx` 연결·실제 Firebase/emulator/운영 쓰기·Rules/config/deploy는 0이며 계속 금지다.
다음 수동 지시를 기다린다.

**Founder 결정은 `D-1=A`, `D-2=O-3`, `D-3=N`이다. Structure A 식별 구조의 로컬 구현과
검증과 Codex 독립 검수가 끝났다(`CODEX_PASSED`, 발견 결함 0). 다음 작업은 자동으로 시작하지 않는다.**

## ★ 스펙 040 종료

정본: `docs/rebuild/specs/040-admin-write-local-ui-connection-contract.md`

- Founder 승인: **U-1=A, U-2=A, U-3=A**.
- 구현 파일: `apps/admin/src/admin-write/session-controller.ts` + unit.
- UI/App wiring/write adapter 생성 0.
- Codex 보완: 동일 auth 재통지 no-op, hostile input fail-closed.
- 최종 게이트: targeted 11/11, unit 1333/1333, Chromium 134/134, 고객 hash 동일.

판정 `CODEX_PASSED`. 다음 수동 지시를 기다린다. 실제 Firebase·UID·IAM·배포·운영 쓰기·
UI 저장·delete·발행은 금지다.

> 아래 `## 0`부터는 완료된 스펙 039 및 그 이전 역사 기록이다. 현재 작업 지시로 사용하지 않는다.

## 0. 이번 후보

- REC을 upload 전에 별도 Firestore commit으로 create한다.
- REC ID = Storage objectId = `UUID.json`; head는 `objectPath` 대신 `recId`를 저장한다.
- Storage create와 head create/update Rules가 동일 REC을 확인한다.
- 실제/합성 Rules 모두 REC update/delete, Storage update/delete, head delete를 거부한다.
- 삭제 API·delete 권한·자동 정리·보존 주기는 없다.
- 검증: targeted unit 51/51, `pnpm check` unit 1322/1322, E2E 134/134,
  demo emulator 13/13 PASS.

- 실제 Firebase·UID·IAM·배포·UI·delete·자동 정리는 NOT TESTED/금지 유지.
- 구현·종료 커밋 `7843e85` fast-forward push 완료. 다음 수동 지시를 기다린다.

> 아래 `## 1`부터는 2026-08-11 Founder 결정 전의 역사 기록이다. 현재 작업 지시로 사용하지 않는다.

> **⚠️ G-4 문서 6개는 지시에 따라 `commit`·`push`·`stage`하지 않았다.**
> 워킹 트리에 미커밋으로 남아 있으며, 커밋 여부는 **별도 지시**를 따른다.

## 1. Codex 최종 판정

- **G-4 보완 라운드 2 문서 검수 통과** — **`getAfter()` 원자성 정정 · transaction 시간 제한 정정 ·
  REC ID 매핑 정정**이 모두 반영됐다.
- **구조 A와 B는 모두 "가능한 후보"로만 기록됐고 어느 것도 채택되지 않았다.**
- **구조 A/B 및 REC·Rules 동작은 NOT TESTED다.**
- **실제 삭제 · 자동 정리 · Rules 변경 · head 스키마 변경 · 클라이언트 delete 권한 ·
  IAM 활성화 · 구현·배포 승인이 아니다.**
- **현재 기본 정책은 계속 `O-3 삭제 보류`다.**
- **다음 단계는 Founder의 D-1~D-3 결정이며 오늘은 결정하지 않는다.**

## 2. 남은 Founder 결정 — **선택지 그대로 보존** (아직 아무것도 고르지 않았다)

| # | 질문 | 선택지 |
| --- | --- | --- |
| **D-1** | **완료 판정 방식과 구조** | **SDC′ + 구조 A**(실패 산물까지 회수 · Storage create stray 차단 가능 · 계약 변경 큼) / **SDC′ + 구조 B**(원자성 서버 강제 · 계약 변경 작음 · **실패 산물 회수 불가**) / **시간 창**(= 안전 증명이 아니라 리스크 수용) / 혼합 |
| **D-2** | **정리 주체** | **없음(O-3 보류)** / 운영자 수동(O-1) / backend(O-2 = **G-3 재개**) / **Storage Rules 서버 강제(O-4)** |
| **D-3** | **보존 개수·주기** | 직전 **K개** 보존 · 정리 주기 · 비용 상한 |

> **D-1 = SDC′ + D-2 = 없음** 조합도 유효하다 — 삭제는 일어나지 않지만 구조는 준비된다.
> 정본: `docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`

## 3. 재개할 때 참고 (아무것도 승인되지 않았다)

- **D-1·D-2가 정해지면** 그때 최소 파일 범위가 열린다(정본 §14).
  SDC′ 채택 시 **head 스키마 `objectPath` → `recId`** 변경이 따라오며 이는 **스펙 037 계약 변경**이다.
- 그 밖의 후보: **cutover 스펙**(실제 UID → Rules 배포 순서 → 운영 쓰기 개방) ·
  **admin UI 연결**(저장 버튼 + 스펙 035 결합) · **L-4/tombstone** · **발행**(F-B) · **C6 재검토**(G-3).

## 4. 계속 금지

제품 코드 · `firestore.rules` · `storage.rules` · config · test · `package.json` · lockfile ·
`pnpm-workspace.yaml` · `firebase.json` · `.firebaserc` · 루트 배럴 · `admin-read/**` 수정 ·
**실제 Firebase/project/bucket/운영 데이터 · 실제 UID 접근** · **실제 객체 조회·나열·삭제** ·
**emulator 실행** · **Rules·Hosting 배포** · **운영 쓰기** · **UI 연결** · **발행** ·
**orphan 삭제·자동 정리** · **클라이언트 delete 권한** · **IAM 활성화** ·
**head 스키마 변경** · **C6/L-4 구현** · 신규 의존성 ·
force push · merge · rebase · `reset --hard` · broad delete ·
**다음 스펙·구현 계약 임의 착수** · **자동화나 반복 작업 생성**.

## 5. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 6. UNCONFIRMED / NOT TESTED (검수 통과로 바뀌지 않는다)

**구조 A·B 및 REC + `firestore.get()`/`getAfter()` 규칙의 실제 동작**(**NOT TESTED** — emulator 미실행) ·
**Rules의 문자열 연결(`+`)·분해(`split` 등) 지원 여부**(**UNCONFIRMED** — 설계에 쓰지 않았다) ·
**`save()` 호출 전체의 벽시계 상한**(**UNCONFIRMED**; **개별 transaction 제한은 확정** —
lock 20초 · 최대 270초 · idle 60초 · 유한 재시도) ·
실제 `admin/state.json` 크기·내용(**NOT TESTED**) · 리빌드 payload 크기(**UNCONFIRMED**) ·
**저장 빈도 미결정**(⚠️ 레거시 **3초 디바운스**; 저장마다 **객체 1개 + REC 1개**가 생기고
Storage Rules의 `firestore.get()`도 **Firestore quota/billing에 포함**된다) ·
bucket 객체 수·용량·location·class·lifecycle(**NOT TESTED/UNCONFIRMED**) ·
GCS·Firestore 요금(**UNCONFIRMED**) · Storage prefix 나열 허용 여부(**UNCONFIRMED**) ·
`docs/reference/security/storage` 및 `docs/reference/rules/rules.firestore` 본문(**이 세션 미취득**) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).
