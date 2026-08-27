# 080 — Space V2 production customer viewer composition/UI

## 상태

`READY_FOR_CODEX / IMPLEMENTED / LOCAL_VERIFIED / UI CONNECTED / NO_LIVE_NETWORK`

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

### DONE (Claude) — 2026-08-27

기준 `HEAD=origin=c9c0c3d`, ahead/behind 0/0에서 시작했다. 계약 문서 commit `971c5fa`, 구현 commit
`2319d1a`. 이 계약 범위만 구현했고 허용 목록 밖 제품 파일은 만들지 않았다.

**§4 허용 파일 대비 실제 변경**

| 파일 | 상태 |
|---|---|
| `apps/mockup/src/space-v2/browser-png-decoder.ts` / `.test.ts` | 신규 |
| `apps/mockup/src/space-v2/production-controller.ts` / `.test.ts` | 신규 (versioned controller) |
| `apps/mockup/src/space-v2/SpaceV2ProofView.tsx` / `.test.tsx` | 신규 |
| `apps/mockup/src/space-v2/space-v2-proof-view.css` | **만들지 않음** — 아래 설명 |
| `apps/mockup/src/space/composition.ts` / `.test.ts` | 수정 |
| `apps/mockup/src/space/SpacePasswordGate.tsx` / `.test.tsx` | 수정 |
| `apps/mockup/src/App.tsx` / `.test.tsx` | 수정 |
| `apps/mockup/src/e2e/space-production-route-fixture.tsx` | 수정 |
| `tests/e2e/space-production-route.spec.ts` | 수정 |
| `docs/rebuild/results/spec-080/space-v2-viewer-{desktop-1280x800,mobile-390x844}.png` | 신규 |

**V2 전용 CSS를 만들지 않은 이유.** §3 N-5는 "CSS가 필요하면" 파일 하나를 허용한다. 필요하지 않았다 —
`PreviewCanvasSurface`가 이미 `surface.css`에서 `max-width:100%` + `overflow-x:auto` 래퍼를 쓰므로
320px 계약이 새 규칙 없이 만족되고, 나머지 레이아웃은 기존 `denn-stack`과 `@denn/ui` 토큰뿐이다. 새
전역 selector와 기존 browse/preview 디자인 변경은 0이다.

**§3 N-1 dispatch.** `readSpaceLink`와 기존 `SpaceDocumentReadPort`를 그대로 재사용한다. document를 한
번 읽은 뒤 top-level `schema`를 **정확히 한 번** snapshot하며 throwing getter·primitive·null은 모두
"V2 아님"으로 닫는다. exact `schema === "space-v2"`만 V2 경로로 가고, `readSpaceDocumentV2()`가 거부한
malformed V2는 **V1으로 fallback하지 않는다**(unit이 V1 opener 호출 0으로 고정). V2 marker가 아니면
기존 V1 opener 계약으로 보내며 V1 성공 결과와 스펙 063 safe-block UI 의미는 바뀌지 않았다. password는
submit 즉시 입력 state를 비우고 state/DOM/URL/log/storage 어디에도 남지 않는다.

**§3 N-2 decoder와 drawable ownership.** 기존 `createLocalImageBindingController()`를 감싼 작은 V2
adapter가 copied bytes의 private Blob(`image/png`), private object URL과 `HTMLImageElement`,
generation과 late-completion 무효화, 합성 `imageRef`와 `PreviewImageBindings`, clear/dispose 정리를
모두 소유한다. geometry/plan 공식과 두 번째 이미지 loader는 복제하지 않았다. 고정한 사실:
module import/factory 시점 DOM·`Image`·`Blob`·URL 호출 **0**(port 기록과, `Image`가 없는 환경에서
factory가 throw하지 않는다는 두 가지로 검증) · `decode(bytes)` 이후에만 browser API 사용 · bytes는
await/browser 전달 전 fresh copy(입력을 나중에 바꿔도 전달본 불변) · MIME은 항상 `image/png` 상수이고
objectPath/token/password/digest는 Blob URL이나 `imageRef`에 들어가지 않는다 · 성공 `imageRef`는 기존
safe identifier 문법을 만족 · 성공 시 natural width/height를 반환하고 binding이 **같은 drawable
identity**를 돌려준다 · stale success/error는 state·binding·Promise를 바꾸지 않는다 · 모든 종료
경로(성공/실패/supersede/clear/dispose)에서 private URL을 **정확히 1회** revoke한다 · decoder 자동
retry **0**.

**§3 N-3 production composition.** `createSpaceProductionController()`는 기존 lazy document reader를
유지하고 `createSpaceV2OpenPort()` → `createFirebaseSpaceV2ProofReadFacade(config)` →
`createSpaceV2ProofBytesReader(facade)` → Web Crypto `SpaceSha256Port` → N-2 decoder owner →
`createSpaceV2FrameReplayController({opener,proof,sha256,decoder})`를 **lazy·최대 1회** 조합한다.
V2 모듈 import만으로는 Firebase app/service/network도 browser decode도 시작되지 않고, V1 document면
proof facade/Storage/Blob/Image/Canvas 준비가 **0**이다(unit이 factory 호출 0으로 고정). document
reader와 proof reader는 **같은 `resolveSpaceFirebaseConfig()` 결과와 같은 `denn-space-viewer` named
app**을 쓰며(스펙 079 facade가 5개 config exact match일 때만 재사용하고 불일치는 `getStorage` 전
fail-closed), default/두 번째 named app·Auth·anonymous sign-in·추가 Firestore instance는 0이다.

**§3 N-4 controller state와 retry.** ready 결과는 N-4의 union을 **두 개의 `status:"ready"` variant**로
표현했다 — V1은 기존 스펙 063 ready 모양(`value: OpenedSpaceV1`) 그대로, V2는
`v2: {plan, imageBindings}`. 그래서 public 의미는 계약 union보다 넓지 않고, 기존 gate와 V1 전용
fixture(허용 목록 밖)가 계약 변경 없이 그대로 동작한다. 한 controller에서 submit은 한 번만
in-flight이고 중복 클릭·Enter·StrictMode remount가 두 read를 만들지 않는다. password rejection과
proof load unavailable만 명시 재시도 가능하며 **그 둘만 cached document를 유지**한다. malformed V2,
evidence/proof mismatch, decode/dimension/plan 실패는 non-retryable이다. 자동 retry·Promise 공유·
silent fallback **0**. detach/reattach는 late result를 무효화하고 binding을 비우며 기존 StrictMode
계약을 유지한다. state·UI·log 어디에도 raw SDK code/message, path, token, password, digest, bytes,
UID/config가 없다.

**§3 N-5 React UI.** 기존 `SpacePasswordGate`의 password/loading/error 흐름과 V1 copy/layout을
보존했고, ready V1은 여전히 `SpacePostAuthFrameView`로 가서 스펙 063 safe-block notice를 그대로
렌더한다. ready V2만 새 `SpaceV2ProofView` 자식으로 가며 badge `저장된 시안 · 열람 전용`, heading
`내 공간 시안`, body `저장된 액자 구성을 확인할 수 있습니다.`, `PreviewCanvasSurface` accessible name
`저장된 액자 시안`만 렌더한다. V2 success에 catalog read·template-art/font load·V1 readiness owner·
placeholder Canvas는 **0**이다. loading은 `시안을 확인하는 중입니다…`, retryable proof 실패는
민감정보 없는 `시안을 불러오지 못했습니다. 잠시 후 다시 시도하세요.`, non-retryable은
`시안을 표시할 수 없습니다.`로 닫고 코드 문자열은 보이지 않는다. retryable 상태는 password를 다시
입력하고 `시안 보기`를 눌러야 하며 password 기억/자동 재전송은 0이다. 외부 링크·다운로드·저장·주문·
공유·admin control은 없다.

**§5 unit/component 12항목** — 전부 덮었다. ①V1 exact document는 opener로만 가고 V2 facade/decoder 0
②exact V2 marker는 V2만 ③malformed `space-v2`는 V1 fallback 0·proof/decode/Canvas 0 ④success exact
순서 document read → v2-open → proof-read → digest → decode → plan(실제 replay controller와 실제
decoder를 붙인 통합 harness로 단언) ⑤wrong password는 cached document 재사용·proof/decode 0 ⑥proof
unavailable은 명시 재시도만·자동 retry 0 ⑦mismatch/decode/dimension/plan은 non-retryable·raw 0
⑧duplicate submit·StrictMode remount·detach 중 late 결과 ⑨decoder import/factory inert·fresh bytes·
exact dimensions·binding identity·stale completion·URL exact-once revoke·clear/reattach ⑩success
Canvas가 plan logical dimensions와 image binding 사용·placeholder 0 ⑪UI visible copy 전수 단언과
code/path/token/password/digest/URL/SDK message 0 ⑫기존 V1 gate·spec 063 block UI·inactive catalog
route 회귀 통과.

**§6 브라우저 검증.** 기존 `space-production-route` fixture를 확장했다. 실제 Firebase는 없고 fixture가
**자기 캔버스에 합성 PNG를 직접 그려** 그 bytes를 in-memory로 넘기며, 그 위에서 **실제** 스펙 078
replay controller · 실제 N-2 browser decoder · 실제 Web Crypto digest · 실제 `PreviewCanvasSurface`가
돈다. targeted Chromium은 `tests/e2e/space-production-route.spec.ts`만 실행했고 **14/14 PASS**다 —
V1 safe-block 회귀 4건, spec063 screenshot 2건, V2 신규 8건(success · wrong-password 재시도 · proof
unavailable 무자동재시도 · digest mismatch 비재시도 · 320px overflow · unmount · desktop/mobile
screenshot). password form keyboard submit(입력 후 버튼에서 Enter), loading, wrong-password 재시도,
V2 Canvas success, non-retryable safe failure를 모두 검증했다. 320px horizontal overflow 0, console
error/warning 0, pageerror 0, axe serious/critical 0, `blob:` 제외 외부 request **0**이다. V2 성공은
`canvas-status`가 `미리보기가 준비되었습니다.`가 되는 것으로 확인했다 — 이는 executor가 plan의
`imageRef` 뒤 drawable을 실제로 찾았을 때만 나오므로 binding이 pipeline 끝까지 살아남았다는 증거다.
**full Chromium suite는 보호 spec-018 PNG를 다시 쓰므로 NOT RUN**이며 full-E2E PASS라고 기록하지
않는다.

**§7 repository gate 실측**

| 게이트 | 결과 |
|---|---|
| 신규/관련 targeted unit + mockup typecheck | PASS |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2278/2278**, build 2개 |
| targeted Chromium `space-production-route.spec.ts` | **14/14 PASS** |
| 신규 desktop/mobile screenshot | 생성·육안 확인 완료 |
| 고객 bundle 변경 전 | `index-6js4DafP.js` / `322,018 B` / `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159` |
| 고객 bundle 변경 후 | `index-nLbiXJi7.js` / `340,481 B` / `99A707FA3AF518933F848CF52948ADCBD95BE44D1544616FA93C49E486805879` |
| 증가분 설명 | +18,463 B = V2 viewer/controller/decoder. 추가로 신규 lazy `firebase/storage` chunk `index.esm-DtyxGWvl.js` 34,890 B |
| admin bundle / CSS | `index-D0XOQpRL.js` 226,201 B · `index-DJ_z3tK1.css` 9,146 B · 고객 CSS `index-BjqjBda8.css` 19,381 B — 파일명·크기 **무변경**(STOP 조건 미해당) |
| `git diff --check` | PASS |
| 허용 경로 외 diff | **0** — Rules/config/package/lockfile/admin/firebase package/spaces/render 무변경 |
| 검사 포트 4183/4184/4185/8080/9099/9199 | 실행 전후 잔류 **0**, 기존 프로세스 강제 종료 0 |

targeted E2E는 `scripts/e2e-run.mjs`와 같은 staging 계약(OS temp `mkdtemp`, 저장소 안에 아무것도
쓰지 않음)을 그대로 쓰되 Playwright에 spec 파일 하나만 넘기는 임시 runner로 실행했다. 그 runner는
scratchpad에만 있고 저장소에 커밋하지 않았다. spec-063 결과 PNG는 재생성 후 byte-identical이라 diff
0이고, Playwright가 만든 `test-results/`는 제거했다.

**§8·§9 금지·보호 준수.** actual Firebase/project/bucket/network/live/운영 데이터·실제
token/password/UID 접근 **0**, Rules/CORS/Hosting deploy·emulator Rules/config 변경·production
env/secret **0**, admin V2 issue session/UI·URL 생성/clipboard·운영 쓰기·publish **0**, V1
migration/rewrite·proof fallback·catalog fallback·auto retry/merge **0**, 다운로드/저장/주문/공유 UI
**0**, orphan delete/cleanup·C6/backend·L-4/tombstone **0**, package/lockfile/`pnpm-workspace.yaml`·
신규 dependency/install/download **0**, 자동화·반복 작업과 다음 스펙 자동 시작 **0**. §9 보호 목록
8개는 읽기만 했고 수정·삭제·restore·checkout·stage·commit **0**이다.

**§10 완료 정의 대비.** V1 route 의미와 안전 차단 회귀 유지 ✅ · V2 synthetic document/proof가
production composition을 거쳐 실제 Canvas로 표시 ✅ · browser decoder lifecycle, retry/late result,
safe error, mobile/a11y gate 통과 ✅ · actual Firebase/live/deploy/admin issue는 **0 / NOT TESTED**
✅ · 허용 코드·test·결과·문서만 일반 fast-forward commit/push하고 `READY_FOR_CODEX`에서 정지 ✅.

**진행도.** 전체 리빌드 **83~86% 완료 / 14~17% 잔여**. 고객 V2 열람 경로가 production route에서 실제
Canvas까지 처음으로 연결된 만큼만 올렸다. admin 발급 UI, 실제 Firebase/Rules 배포와 live/CORS 검증은
그대로 남아 있다.

### CODEX REVIEW — CORRECTION_REQUIRED 라운드 1 (2026-08-27)

검수 기준은 `HEAD=origin=c63fe1b`, ahead/behind `0/0`이다. 독립 targeted unit **62/62**, 전체
`node scripts/check.mjs` PASS(unit **2278/2278**), OS temp staging targeted Chromium **14/14 PASS**,
고객 entry SHA-256 `99A707FA3AF518933F848CF52948ADCBD95BE44D1544616FA93C49E486805879`,
`git diff --check`, 검사 포트 4183/4184/4185/8080/9099/9199 잔류 0을 확인했다. full Chromium suite는
계약대로 NOT RUN이다.

다음 두 결함 때문에 아직 DONE/CODEX_PASSED가 아니다.

1. `SpacePasswordGate`는 비밀번호 input과 button을 `<form>`으로 묶지 않았고 button도 submit type이
   아니다. E2E helper는 input이 아니라 `space-submit` button에 Enter를 보내므로 §3 N-5·§6의
   "password form keyboard submit"을 증명하지 못한다. semantic `<form onSubmit>` + 명시적
   `type="submit"`으로 고치고, password input에서 Enter를 눌렀을 때 기존 submit이 정확히 한 번만
   호출되는 것을 unit/E2E로 고정한다. password 즉시 삭제와 single-flight는 유지한다.
2. 두 spec-080 결과 PNG에 합성 fixture 전용 `화면 해제` control이 노출됐다. 이 control은 production
   UI가 아니므로 시각 증거를 오염한다. fixture 제품 파일은 수정하지 않고 screenshot case에서 캡처
   직전에 `[data-testid="fixture-unmount"]`만 숨긴 뒤 같은 두 PNG를 다시 생성·육안 확인한다.

허용 correction 파일은 `apps/mockup/src/space/SpacePasswordGate.tsx`, 해당 test,
`tests/e2e/space-production-route.spec.ts`, 기존 spec-080 PNG 2개와 spec-080 상태 문서뿐이다.
viewer/controller/decoder/composition/App/fixture/CSS, admin/packages/Rules/config/package/lockfile는
수정하지 않는다. actual Firebase/network/live/deploy와 full Chromium은 계속 금지/NOT RUN이다.

상태는 `CORRECTION_REQUIRED`, fix_round 1/3, next transition `CLAUDE_CORRECTION`. 전체 진행도는
**83~86% 완료 / 14~17% 잔여 — 변동 없음**이다.
