# 080 — Space V2 production customer viewer composition/UI

## 상태

`READY_FOR_CLAUDE / IMPLEMENTATION NOT STARTED / UI STAGE`

기준:

- branch: `rebuild/modern-studio`
- 문서 작성 시 `HEAD=origin=c9c0c3d`, ahead/behind `0/0`
- 스펙 078: `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_UI`
- 스펙 079: `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_UI / NO_LIVE_NETWORK`
- Founder 결정: LL-1~LL-6=A, MM-1~MM-6=A

## 1. 목표

현재 production `?space=` route는 V1 document/opener만 사용한다. 스펙 078의 V2 replay controller와
스펙 079의 Firebase proof reader를 기존 고객 route에 연결해, 검증된 V2 proof PNG를 실제 React
화면과 Canvas에서 표시한다.

이 단위가 여는 것은 **고객 V2 viewer UI의 코드 연결과 합성/브라우저 검증**뿐이다. 실제 Firebase
프로젝트나 운영 링크를 읽지 않고, Rules·Hosting을 배포하지 않으며, admin 발급 UI도 시작하지 않는다.

## 2. 디자인 읽기

이 화면은 마케팅 페이지가 아니라 비밀번호를 전달받은 고객이 저장된 시안을 신뢰할 수 있게 확인하는
작은 열람 도구다. 실제 proof PNG가 유일한 주 시각 요소이며, UI는 그 이미지를 방해하지 않는 조용한
Modern Studio 프레임이어야 한다.

- `DESIGN_VARIANCE: 2` — 기존 route와 디자인 시스템을 보존한다.
- `MOTION_INTENSITY: 1` — 상태 피드백 외 장식 애니메이션은 0이다.
- `VISUAL_DENSITY: 3` — 비밀번호, 상태, 시안 한 장만 명확히 배치한다.
- theme: 기존 light Modern Studio 고정.
- palette/radius/type: `@denn/ui/theme.css` 정본만 사용한다. 새 색·폰트·토큰·아이콘·의존성은 0이다.
- 실제 proof PNG가 제품 이미지이므로 생성 이미지, placeholder artwork, fake screenshot을 만들지 않는다.

## 3. 구조 결정

### N-1 — V1/V2 문서 dispatch

- URL token 읽기와 Firestore document read는 기존 `readSpaceLink`와 `SpaceDocumentReadPort`를 재사용한다.
- document를 한 번 읽은 뒤 top-level `schema`를 hostile getter에도 안전하게 snapshot한다.
- exact `schema === "space-v2"`이면 V2 path만 시도한다. `readSpaceDocumentV2()`가 거부한 malformed V2를
  V1으로 fallback하지 않는다.
- V2 marker가 아니면 기존 V1 opener 계약으로 보낸다. V1 성공 결과와 스펙 063 safe-block UI 의미를
  바꾸지 않는다.
- 알 수 없는 버전과 malformed document는 safe invalid-content로 닫는다. 자동 migration/fallback 0.
- password는 state, DOM attribute, URL, log, error, local/session storage에 보존하지 않는다. 기존처럼
  submit 직후 입력 state를 비운다.

### N-2 — browser PNG decoder와 drawable ownership

스펙 078 `SpaceV2PngDecodePort` 성공값의 `imageRef`만으로는 Canvas executor가 drawable을 찾을 수 없다.
따라서 decoder owner는 다음을 함께 소유한다.

- copied PNG bytes로 만든 private `Blob("image/png")`
- private object URL과 `HTMLImageElement`
- load/decode generation과 late completion 무효화
- synthetic `imageRef`와 `PreviewImageBindings`
- clear/dispose 시 handler, URL, binding 정리

기존 `createLocalImageBindingController()`를 안전하게 재사용하거나 그 계약을 감싸는 작은 V2 adapter를
작성한다. geometry/plan 공식이나 두 번째 이미지 loader를 복제하지 않는다.

- module import/factory 생성 시 DOM, `Image`, `Blob`, URL API 호출 0.
- `decode(bytes)` 호출 뒤에만 browser API를 사용한다.
- bytes는 await/browser 전달 전에 fresh copy한다.
- MIME은 항상 `image/png`; objectPath, token, password, digest를 Blob URL/imageRef에 넣지 않는다.
- 성공 imageRef는 기존 safe identifier grammar를 만족한다.
- decoder 성공 시 natural width/height를 반환하고 binding은 같은 drawable identity를 조회한다.
- stale success/error는 현재 state·binding·Promise를 바꾸지 않는다.
- 모든 종료 경로에서 private URL은 정확히 한 번 revoke한다.
- decoder는 자동 retry하지 않는다.

### N-3 — production composition

`createSpaceProductionController()`는 기존 lazy document reader를 유지하고 다음 V2 dependency를 lazy로
조합한다.

1. `createSpaceV2OpenPort()`
2. `createFirebaseSpaceV2ProofReadFacade(config)`
3. `createSpaceV2ProofBytesReader(facade)`
4. 기존 `SpaceSha256Port` Web Crypto 경계
5. N-2 browser decoder owner
6. `createSpaceV2FrameReplayController({opener,proof,sha256,decoder})`

V2 모듈 import만으로 Firebase app/service/network나 browser decode가 시작되면 실패다. V1 document이면
proof facade/Storage/Blob/Image/Canvas 준비는 0이어야 한다. V2 password/evidence 검증 실패 전에도 proof
read와 decode는 0이다.

document reader와 proof reader는 동일 `resolveSpaceFirebaseConfig()` 결과 및 동일
`denn-space-viewer` named app ownership을 사용한다. default/두 번째 named app, Auth, anonymous sign-in,
Firestore 추가 instance는 만들지 않는다. config mismatch는 proof read 전에 fail-closed다.

### N-4 — controller state와 retry

ready result는 route가 명시적으로 구분할 수 있어야 한다.

```ts
type SpaceReadyView =
  | { readonly kind: "v1"; readonly value: OpenedSpaceV1 }
  | {
      readonly kind: "v2";
      readonly plan: PreviewRenderPlan;
      readonly imageBindings: PreviewImageBindings;
    };
```

구현 이름은 현재 구조와 맞게 다듬을 수 있지만 public 의미는 이 union보다 넓히지 않는다.

- 한 controller에서 submit 한 번만 in-flight다. 중복 클릭/Enter/StrictMode가 두 read를 만들지 않는다.
- password rejection과 proof load unavailable만 사용자가 명시적으로 재시도할 수 있다.
- retry 가능한 실패도 자동 retry, Promise 공유, silent fallback은 0이다.
- malformed V2, evidence/proof mismatch, decode/dimension/plan failure는 non-retryable이다.
- cached document를 유지할 수 있는 것은 password rejection과 명시적 proof-load retry뿐이다.
- detach/reattach는 late result를 무효화하고 binding을 비우며 기존 StrictMode 계약을 유지한다.
- raw SDK code/message, path, token, password, digest, bytes, UID/config는 state/UI/log에 없다.

### N-5 — React UI

- 기존 `SpacePasswordGate`의 password/loading/error 흐름과 V1 copy/layout을 보존한다.
- ready V1은 기존 `SpacePostAuthFrameView`로 보내 스펙 063 safe-block notice를 그대로 렌더한다.
- ready V2는 별도 `SpaceV2ProofView` 자식으로 보내 아래만 렌더한다.
  - badge: `저장된 시안 · 열람 전용`
  - heading: `내 공간 시안`
  - body: `저장된 액자 구성을 확인할 수 있습니다.`
  - `PreviewCanvasSurface` accessible name: `저장된 액자 시안`
- V2 success에 catalog read, template-art/font load, V1 readiness owner, placeholder Canvas는 0이다.
- loading은 `시안을 확인하는 중입니다…`, load retry 상태는 민감정보 없는 일반 문구, non-retryable은
  `시안을 표시할 수 없습니다.`로 닫는다. 코드 문자열을 보이지 않는다.
- retryable 상태는 password를 다시 명시 입력하고 `시안 보기`를 눌러야 한다. password 기억/자동 재전송 0.
- V2 success는 실제 proof Canvas를 주 시각 요소로 표시한다. 외부 링크, 다운로드, 저장, 주문, 공유,
  admin control은 넣지 않는다.
- 320px에서 horizontal page overflow 0, touch target 44px 이상, focus-visible 유지, heading/label/alert/status
  semantics와 keyboard submit을 검증한다.
- CSS가 필요하면 V2 전용 파일 하나만 추가하고 기존 Modern Studio 변수만 사용한다. 새 전역 selector와
  기존 browse/preview 디자인 변경은 0이다.

## 4. 허용 파일

제품·unit:

- `apps/mockup/src/space-v2/browser-png-decoder.ts` (신규)
- `apps/mockup/src/space-v2/browser-png-decoder.test.ts` (신규)
- `apps/mockup/src/space-v2/production-controller.ts` 또는 동등한 단일 versioned controller 파일 (신규)
- 대응 unit test 1개 (신규)
- `apps/mockup/src/space-v2/SpaceV2ProofView.tsx` (신규)
- 대응 component test 1개 (신규)
- 필요 시 `apps/mockup/src/space-v2/space-v2-proof-view.css` (신규)
- `apps/mockup/src/space/composition.ts`
- `apps/mockup/src/space/composition.test.ts`
- `apps/mockup/src/space/SpacePasswordGate.tsx`
- `apps/mockup/src/space/SpacePasswordGate.test.tsx`
- `apps/mockup/src/App.tsx`
- `apps/mockup/src/App.test.tsx`

브라우저 fixture/E2E/결과:

- `apps/mockup/src/e2e/space-production-route-fixture.tsx`
- `tests/e2e/space-production-route.spec.ts`
- `docs/rebuild/results/spec-080/space-v2-viewer-desktop-1280x800.png` (신규)
- `docs/rebuild/results/spec-080/space-v2-viewer-mobile-390x844.png` (신규)

문서:

- 이 스펙
- `docs/handoff/2026-08-27-spec-080-space-v2-production-customer-viewer-ui-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- 스펙 079 및 해당 handoff의 종료 상태 문구

허용 목록 밖 제품 파일이 필요하면 STOP하고 근거를 `### QUESTIONS`에 남긴다.

## 5. 필수 unit/component 검증

1. V1 exact document는 기존 opener로만 가고 V2 proof facade/decoder 0, 기존 safe-block 결과 유지.
2. exact V2 marker는 V2만 사용하고 V1 opener/catalog 0.
3. malformed `space-v2`는 V1 fallback 0, proof/decode/Canvas 0.
4. V2 success exact 순서: document read → decrypt/evidence → metadata/bytes → hash → decode → plan → Canvas.
5. wrong password는 cached document를 사용할 수 있으나 proof/decode 0, 입력 state 즉시 삭제.
6. proof unavailable은 명시 재입력/재시도만 가능, 자동 retry 0.
7. proof mismatch/decode/dimension/plan failure는 non-retryable safe UI이고 raw 정보 0.
8. duplicate submit, StrictMode remount, detach 중 late read/decode가 중복 network·stale binding을 만들지 않음.
9. decoder import/factory inert, fresh bytes, exact dimensions, binding identity, stale completion, URL exact-once revoke,
   clear/reattach를 fake browser ports로 검증.
10. success Canvas가 plan logical dimensions와 image binding을 사용하고 placeholder/fallback image 0.
11. UI visible copy를 전수 단언하고 error code/path/token/password/digest/URL/SDK message 0.
12. 기존 V1 `SpacePasswordGate`, spec 063 block UI와 inactive catalog route 회귀 통과.

## 6. 브라우저 검증

기존 `space-production-route` fixture를 확장해 실제 Firebase가 아닌 injected fakes와 합성 PNG만 사용한다.

- targeted Chromium은 `tests/e2e/space-production-route.spec.ts`만 실행한다.
- V2 desktop 1280x800, mobile 390x844 success screenshot을 신규 spec-080 결과 경로에 저장한다.
- password form keyboard submit, loading, wrong-password retry, V2 Canvas success, non-retryable safe failure를 검증한다.
- V1 route safe-block 회귀와 inactive route 회귀를 유지한다.
- 320px horizontal overflow 0, console error/warning 0, pageerror 0, axe serious/critical 0.
- proof/drawable은 fixture memory fake만 사용하고 실제 external request/egress 0을 단언한다.
- full Chromium suite는 보호 spec-018 PNG를 다시 쓰므로 이번 계약에서는 **NOT RUN**한다. targeted
  production-route E2E만 PASS라고 기록하고 full-E2E PASS라고 주장하지 않는다.

## 7. repository gate

- 신규/관련 targeted unit과 mockup typecheck.
- `node scripts/check.mjs` 전체 PASS.
- targeted Chromium `space-production-route.spec.ts` PASS.
- 신규 desktop/mobile screenshot 시각 확인.
- 고객 bundle filename/size/hash는 production import 때문에 변경될 수 있다. 변경 전/후 exact 값을 모두
  기록하고, 증가분을 V2 viewer import로 설명할 수 없거나 admin bundle/CSS가 변하면 STOP한다.
- `git diff --check` PASS.
- 허용 경로만 변경. Rules/config/package/lockfile/admin/firebase package/spaces/render diff 0.
- 검사 포트 4183/4184/4185/8080/9099/9199 잔류 0. 기존 프로세스를 강제 종료하지 않는다.

## 8. 계속 금지

- 실제 Firebase/project/bucket/network/live/운영 데이터·실제 token/password/UID 접근
- Rules/CORS/Hosting deploy, emulator Rules/config 변경, production env/secret
- admin V2 issue session/UI, URL 생성/clipboard, 운영 쓰기, publish
- V1 migration/rewrite, proof fallback, catalog fallback, auto retry/merge
- 다운로드/저장/주문/공유 UI
- orphan delete/cleanup, C6/backend, L-4/tombstone
- package/lockfile/`pnpm-workspace.yaml`, 신규 dependency/install/download
- 보호 대상 수정·삭제·restore·checkout·stage·commit
- 자동화·반복 작업과 다음 스펙 자동 시작

## 9. 보호·기존 사용자 변경

다음은 읽기 외 어떤 동작도 하지 않는다.

- `AGENTS.md`
- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`

## 10. 완료 정의

- V1 route 의미와 안전 차단 회귀가 유지된다.
- V2 synthetic document/proof가 production composition을 거쳐 실제 Canvas로 표시된다.
- browser decoder lifecycle, retry/late result, safe error, mobile/a11y gate가 통과한다.
- actual Firebase/live/deploy/admin issue는 0 / NOT TESTED로 남는다.
- Claude Code는 허용 코드·test·결과·문서만 일반 fast-forward commit/push하고 `READY_FOR_CODEX`에서
  멈춘다. Codex 독립 검수 전 다음 스펙을 시작하지 않는다.

### QUESTIONS

없음. 기존 LL/MM 결정과 이번 사용자의 수동 다음 작업 지시 범위 안에서 고객 V2 viewer UI만 연결한다.
