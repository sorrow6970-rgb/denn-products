# 083 - Admin Space V2 발급 UI production composition

## 상태

`READY_FOR_CLAUDE / UI_IMPLEMENTATION_BY_CLAUDE_CODE / LOCAL_SYNTHETIC_ONLY / NO_LIVE_NETWORK`

- 기준: `HEAD=origin=ba9eb48`, ahead/behind 0/0
- 선행 완료: 스펙 080 customer V2 viewer, 081 frozen issue session, 082 shared Canvas executor
- Founder 결정: `LL-1=A`~`LL-6=A`, `OO-1=A`
- 구현·검증 주체: Claude Code. Codex는 이 계약과 검수 기준만 작성한다.

## 목표 (WHY)

인증된 운영자가 검증된 C5 catalog 기준본에서 Space V2 첫 capability의 액자 시안을 준비하고, 같은
frozen draft가 소유한 PNG와 replay fields만 기존 스펙 081 session에 전달해 발급할 수 있는 실제 admin
화면을 구성한다.

confirmed success 뒤에만 same-origin `?space=<token>` 링크를 보여 주고 명시적인 복사 동작을 제공한다.
실제 Firebase 환경값, 운영 UID, live network, Rules·Hosting 배포와 운영 발급은 이번 단위에서 사용하거나
검증하지 않는다.

## Design Read

Reading this as: **인증된 운영자를 위한 신뢰 우선 발급 작업 화면이며, 기존 Modern Studio light 제품 UI와
`@denn/ui`를 보존하는 저모션·중간 밀도 composition**.

- `DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 5`.
- 이 화면은 admin panel이므로 landing hero, bento, 장식용 이미지·상태 점, glassmorphism, marquee,
  scroll animation을 사용하지 않는다.
- 새 디자인 시스템·아이콘 패키지·폰트·색 토큰을 만들지 않는다. 기존 웜 토프 token, radius, focus ring,
  Button/Card/Badge/Chip/TextField와 native semantic control을 사용한다.
- 선택한 고객 PNG 자체가 유일한 작업 이미지다. 생성 이미지나 장식용 stock asset을 추가하지 않는다.
- UI/UX의 실제 레이아웃·간격·한국어 문구 다듬기는 Claude Code가 담당하되 아래 안전 의미를 바꾸지 않는다.

## 범위 (SCOPE)

### 포함

1. admin production `App`의 authenticated C5 baseline과 V2 issue session 조합.
2. 별도 exact V2 issue env gate. 기본값은 false다.
3. PNG-only 로컬 proof draft owner와 실제 Canvas 미리보기.
4. frame size/template/color 선택, 고정된 첫 capability transform 편집, 명시 freeze, password 확인, issue.
5. success link 표시와 명시 copy, 전체 상태·오류·접근성 UI.
6. injected fake unit/E2E와 production-default inert 검증.

### 제외

- 실제 Firebase/project/bucket/data/network/live, 실제 운영 UID, emulator, deploy
- Rules, Firebase/Hosting config, `.firebaserc`, `firebase.json`, env 실제 값 추가
- 운영 쓰기 활성화, publish, legacy 공유 쓰기, orphan delete/cleanup
- JPEG/WebP 변환, 서버 이미지 처리, C6/backend
- V1 rewrite/migration, L-4/tombstone, room/text/template-art/clock capability
- 자동 retry, 자동 merge, 자동 link open, password 저장·URL 포함·clipboard 포함
- package/lockfile, 신규 dependency/download/install
- 기존 보호 대상의 수정·복원·stage·commit

## 구조 결정

### 1. 별도 gate와 기존 Firebase 소유권

`VITE_DENN_ADMIN_SPACE_V2_ISSUE_ENABLED`를 exact gate로 추가한다.

- 문자열이 정확히 `"true"`일 때만 후보가 된다. undefined, `1`, `TRUE`, `yes`는 false다.
- 완전한 `resolveAdminFirebaseConfig()` 결과와 `VITE_DENN_ADMIN_WRITE_ENABLED="true"`도 함께 필요하다.
  C5 baseline controller가 없는데 V2 issue만 열지 않는다.
- env declaration만 추가하고 실제 값이나 예시 UID를 repo config에 넣지 않는다.
- 기존 default Firebase app과 `OperatorAuthPort` 하나를 재사용한다. named app, 두 번째 Auth observer,
  duplicate `initializeApp`, config mismatch 우회는 0이다.
- V2 session/controller를 만들어도 Firebase SDK import, facade 생성, Storage/Firestore service와 network는
  0이다. `@denn/firebase/space-write` runtime import와 facade/port 생성은 **첫 명시 issue가 writer에
  도달할 때만** 최대 한 번 수행한다.
- lazy factory 생성 실패는 request가 Firebase write에 도달하지 않은 definite safe failure로 닫는다.
  raw import/SDK/config message를 UI나 console에 내보내지 않고 자동 retry하지 않는다.

### 2. C5 baseline 사용

- V2 panel은 기존 `AdminWriteSessionController`의 `ready-clean` 상태와 `getBaseline()`만 사용한다.
- `ready-dirty-*`, saving, conflict, outcome-unknown, auth-blocked 상태에서는 draft start와 issue를 막는다.
- draft 시작 시 exact catalog snapshot과 revision을 고정한다. 이후 baseline revision·auth 상태·selection
  owner가 바뀌면 frozen draft를 stale 처리하고 조용히 새 기준을 채택하지 않는다.
- 최초 source가 legacy revision 0인 것은 허용한다. `readLegacyCatalog`를 다시 통과한 detached
  `CatalogDocumentV1`만 아래 단계로 보낸다.
- C5 catalog 저장과 V2 space 발급은 서로 다른 명시 행동이다. 한 버튼으로 묶지 않는다.

### 3. PNG-only local proof owner

첫 production UI는 `image/png` 파일 한 개만 받는다.

- `<input type="file" accept="image/png">`를 사용하되 MIME/확장자를 신뢰 근거로 삼지 않는다.
- bytes를 private `Uint8Array`로 복사하고 browser decode 성공, 양의 정수 intrinsic dimensions, 기존
  20 MiB 미만 계약을 확인한다. 실제 PNG signature·descriptor 검증은 기존 spec 066/068 경계가 다시 한다.
- filename, local/blob URL, MIME 원문, bytes, dimensions를 오류·log·DOM metadata에 넣지 않는다.
- object URL과 image handler는 교체·clear·unmount에서 정확히 정리한다. stale decode completion은 현재
  draft를 덮지 않는다.
- public state에는 idle/loading/ready/failed, synthetic imageRef, dimensions와 injected
  `PreviewImageBindings`만 허용한다.
- `exportProofPng()`는 retained PNG의 fresh copy를 반환한다. **최종 액자 Canvas를 다시 PNG로 export하지
  않는다.** customer V2 viewer가 proof PNG를 user image로 넣고 encrypted geometry/transform으로 액자를
  재구성하므로 composed Canvas를 올리면 frame이 이중 적용된다.

### 4. 첫 capability 편집과 plan

- 선택지는 검증된 catalog에서 source order로 만든다. 자동 첫 항목 선택은 0이다.
- size/template 조합은 `projectFramePreviewGeometry`가 성공하고 textZones=[], clockPreview=null이며
  `projectCatalogTemplateImage`가 art 부재를 증명하는 경우만 issue 가능하다. unsupported/invalid-reference를
  숨겨 성공처럼 만들지 말고 화면에서 지원 불가로 설명한다.
- frame color는 grain 없는 canonical `#RRGGBB` 항목만 사용하고 자동 기본색은 0이다.
- `frameOrientation`은 projected aspect에서 결정한다: aspect > 1 portrait, aspect < 1 landscape,
  aspect = 1은 portrait로 고정한다. 사용자가 계약과 모순되는 orientation을 따로 입력하는 seam은 만들지
  않는다.
- logical width는 실제 preview content box를 측정해 positive integer, 최대 500으로 만든다. freeze 뒤
  resize가 발생해도 frozen width와 plan은 바뀌지 않는다.
- transform은 기존 V2 범위 `scale 1..5`, normalized x/y `-1..1`, quarter-turn 0..3만 허용한다.
  Claude Code는 keyboard/button/range 기반으로 구현한다. pointer drag는 이번 필수 범위가 아니다.
- plan은 `@denn/shared` projection과 `@denn/render`의 public geometry/plan/executor만 사용한다.
  `apps/mockup/**`를 import하지 않고 Canvas executor·cover/rotation 수학을 복사하지 않는다.
- admin-local thin plan composition이 필요하면 한 순수 helper로 제한하고, 같은 evidence를 customer spec 078
  replay에 넣었을 때 command JSON이 일치하는 회귀 test를 둔다. 일치하지 않으면 issue를 열지 않는다.

### 5. 하나의 frozen source

명시적인 `시안 고정` 동작은 current catalog, selection, derived orientation, logical width, color,
normalized transform, PNG bytes/drawable와 render plan을 한 immutable generation에 묶는다.

- UI preview와 `SpaceV2FrozenIssueDraftSource`는 같은 generation을 사용한다.
- source의 exact public keys는 기존대로 `copyFields`, `exportProofPng` 두 개뿐이다.
- `copyFields()`는 frozen catalog와 fields의 detached copy를 반환한다.
- `exportProofPng()`는 같은 generation의 exact PNG bytes fresh copy를 반환한다.
- freeze 후 field/file/transform edit는 disabled다. `새 시안 준비`를 명시적으로 누르면 session
  `clearDraft()` 후 이전 source·success/error/link/password를 폐기하고 편집으로 돌아간다.
- issue 중 clear/edit/second issue는 0이다. auth loss/unmount는 session을 dispose하고 late completion이
  새 UI state를 덮지 못하게 한다.

### 6. issue form과 상태

- password와 confirmation은 label이 있는 두 password field다. trim/정규화/최소 길이 추측은 0이며
  non-empty exact equality만 기존 session으로 보낸다.
- issue 시작 시 두 input과 모든 local ref를 즉시 빈 문자열로 만든다. password를 state persistence,
  storage, URL, clipboard, log, analytics, error에 넣지 않는다.
- submit은 session `canIssue`와 UI validation이 모두 true일 때 한 번만 가능하다.
- preparing/issuing에는 control을 disabled하고 `role="status"`로 진행을 알린다. spinner나 반복 animation은
  필요 없다.
- safe code는 고정 한국어 문구로만 매핑한다. raw SDK message, email, UID, token fragment, object path,
  digest, filename, bytes를 표시하거나 console에 쓰지 않는다.
- definite failure 뒤에도 같은 frozen source로 재발급하지 않는다. 새 draft를 명시적으로 준비해야 한다.
- outcome-unknown은 `role="alert"`로 "결과를 확인할 수 없으므로 같은 시안을 다시 발급하지 말고 확인이
  필요하다"는 의미를 전달한다. success/failure 추측, retry CTA, link 표시 0이다.

필수 화면 상태:

| 상태 | UI 의미 |
|---|---|
| gate off / auth blocked | issue panel 또는 adapter 생성 0 |
| baseline unavailable/dirty/busy | 왜 시작할 수 없는지 fixed copy, issue 0 |
| editing incomplete/unsupported | 누락·지원 불가 항목을 label 아래에 설명, Canvas/issue 0 |
| image loading/failed | safe state, stale drawable/bytes 0 |
| preview ready | 실제 Canvas와 `시안 고정` action |
| frozen/draft-ready | fields 잠금, password pair와 issue action |
| preparing/issuing | single-flight, 중복 action 0 |
| definite error | safe fixed message, 새 draft action만 |
| outcome unknown | 재시도·success link 0 |
| success | confirmed same-origin link와 명시 copy, password 0 |

### 7. success URL과 clipboard

- session snapshot의 `confirmedToken`이 있는 confirmed success에서만 URL을 만든다.
- production formatter는 현재 origin의 root URL에 `space` query 하나만 `URL` API로 설정한다.
  기존 query/hash, password, email, UID, object path는 복사하지 않는다.
- 표시 URL과 copy payload는 같은 immutable string이다. 자동 copy와 자동 navigation은 0이다.
- copy button click에서만 injected clipboard port를 한 번 호출한다. 실패는 fixed safe copy로 표시하고
  token/link를 console에 남기지 않는다.
- link는 same-origin임을 검사한 뒤에만 render한다. formatter/clipboard가 없거나 throw하면 issue success
  자체를 실패로 바꾸지 않고 "링크를 복사할 수 없음"을 별도 UI 상태로 보인다.

## 대상 파일 (WHERE)

Claude Code는 아래 범위 안에서 이름을 더 명확히 다듬을 수 있다. 범위를 넓혀야 하면 구현하지 말고
`QUESTIONS`에 남긴다.

### 기존 파일 수정 허용

- `apps/admin/src/App.tsx`
- `apps/admin/src/admin-composition/create.ts`
- `apps/admin/src/admin-composition/create.test.ts`
- `apps/admin/src/admin-read/config.ts`
- `apps/admin/src/admin-read/admin-read.test.tsx`
- `apps/admin/src/env.d.ts`
- `apps/admin/src/e2e/admin-write-fixture.tsx`
- `apps/admin/vite.e2e-fixture.config.ts` - 두 번째 entry가 실제로 필요할 때만 최소 변경

### 신규 파일 허용

- `apps/admin/src/space-v2/browser-proof-draft.ts`
- `apps/admin/src/space-v2/browser-proof-draft.test.ts`
- `apps/admin/src/space-v2/issue-composition.ts`
- `apps/admin/src/space-v2/issue-composition.test.ts`
- `apps/admin/src/space-v2/AdminSpaceV2IssuePanel.tsx`
- `apps/admin/src/space-v2/AdminSpaceV2IssuePanel.test.tsx`
- `apps/admin/src/space-v2/admin-space-v2-issue.css`
- 필요 시 `apps/admin/e2e-space-v2-issue-fixture.html`
- 필요 시 `apps/admin/src/e2e/space-v2-issue-fixture.tsx`
- `tests/e2e/admin-space-v2-issue.spec.ts`
- `docs/rebuild/results/spec-083/**`

### 문서

- 이 스펙
- `docs/handoff/2026-08-28-spec-083-admin-space-v2-issue-ui-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

### 명시 금지

- 기존 `apps/admin/src/space-v2/issue-session.ts`와 기존 spec 064~082 제품/test 변경
- `apps/mockup/**`, `packages/**`, `storage.rules`, `firestore.rules`, Firebase config
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- 보호 대상:
  - `AGENTS.md`
  - `docs/rebuild/design/taste-v2/**`
  - `docs/rebuild/design/README.md`
  - `docs/rebuild/specs/038-page-design-prototype.md`
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
  - `packages/render/src/plan/index.ts`

## 검증 절차 (VERIFY)

### Targeted unit

1. gate exact true/false, prerequisite config/write gate, default-off에서 V2 controller/factory/SDK 0.
2. existing auth/config가 그대로 writer에 전달되고 named app/second observer/duplicate init seam 0.
3. lazy writer는 begin/edit/freeze/password validation까지 factory 0, 첫 valid issue에서 1, duplicate issue 0.
4. PNG file load/copy/decode/dimensions/max bytes, stale completion, replace/clear/dispose와 URL revoke.
5. non-PNG/malformed/oversize/decode failure에서 source/Canvas/UUID/hash/writer 0.
6. catalog eligibility, no auto selection/color, orientation derivation, logical width freeze, transform bounds.
7. editable preview와 frozen source가 같은 fields/bytes/generation을 사용하고 caller mutation에 detached.
8. 같은 evidence의 admin plan과 customer replay plan command JSON exact equality.
9. password mismatch에서 exporter/UUID/hash/crypto/writer 0, 시작 즉시 field/ref clear.
10. success/definite error/outcome unknown/late completion/auth loss/unmount 상태와 sensitive leak 0.
11. URL은 confirmed token 뒤 same-origin `?space=`만, copy는 click 1회, password auto copy 0.
12. React hook은 조건부 호출 0, subscription/observer/listener cleanup과 StrictMode duplicate side effect 0.

### Chromium E2E (synthetic fixture only)

1. baseline load 전 V2 adapter·proof owner·issue 0.
2. explicit selections + PNG → actual Canvas preview. 지원 불가 조합은 Canvas/issue 0.
3. freeze → password mismatch는 issue 0, match는 single issue 1.
4. confirmed success에서 same-origin link 표시, explicit copy 1, password/link 자동 clipboard 0.
5. definite failure와 outcome unknown에서 link/retry 0, 새 draft 전 second issue 0.
6. duplicate click/tab-equivalent rapid submit, baseline revision change, auth expiry-equivalent, unmount/late result에서
   조용한 성공·중복 write·stale UI 0.
7. 외부 request 0, Firebase SDK/service 0, console error/warning 0.
8. 1280x800과 390x844(추가 320px width)에서 horizontal overflow 0, control 44px 이상, keyboard order와
   focus-visible, label/error association, axe serious/critical 0.
9. Claude Code가 desktop/mobile 시각 결과를 `docs/rebuild/results/spec-083/`에 저장하고 직접 확인한다.

### 전체 gate

- targeted admin unit/typecheck
- `pnpm run check`
- canonical `pnpm run test:e2e` 전체 Chromium
- `git diff --check`
- 허용 경로 밖 diff 0, package/lockfile/Rules/config diff 0
- 고객 bundle과 admin bundle size/hash 보고. Firebase write SDK가 default entry에 eager 포함되지 않았음을 확인
- 포트 4183/4184/4185/8080/9099/9199와 temp fixture 잔류 0

전체 E2E가 보호 spec-018 PNG 두 개를 다시 쓰더라도 restore/checkout/stage/commit하지 않는다.

## 완료 정의 (DONE)

- local synthetic gate가 위 상태·동일 draft·single-flight·safe link 계약을 모두 증명한다.
- production 기본값에서 V2 issue는 off이고 actual Firebase/network가 0이다.
- 제품 구현과 문서가 별도 일반 fast-forward commit으로 push되고 `HEAD=origin`, ahead/behind 0/0이다.
- Claude Code는 `READY_FOR_CODEX`에서 멈춘다. Codex 독립 검수 전 DONE으로 쓰지 않는다.
- 실제 UID/live Rules/network/deploy/운영 발급은 `NOT TESTED / FORBIDDEN`으로 남는다.

## 위험 및 STOP

- PNG 외 format 지원, package/shared API 확장, `apps/mockup/**` import, 기존 session API 변경이 필요하면 STOP.
- actual Firebase/UID/Rules/config/deploy 또는 신규 dependency가 필요하면 STOP.
- admin plan과 customer replay plan이 exact 일치하지 않으면 issue를 열지 말고 STOP.
- baseline gate가 변경 전부터 재현 가능하게 실패하거나 flaky/timeout이면 자동 우회·skip 없이 STOP.
- 보호 대상 또는 사용자 dirty 변경과 충돌하면 해당 파일을 건드리지 말고 STOP.

### QUESTIONS

없음. `OO-1=A`는 이 단위를 다음 Claude Code UI 구현 스펙으로 여는 승인이다. actual live enablement와
배포 승인은 아니다.

#### Q-1 (Claude Code, 2026-08-28) — `@denn/render`가 admin에서 resolve되지 않는다 · STOP

**모순.** §4는 "plan은 `@denn/shared` projection과 `@denn/render`의 public geometry/plan/executor만
사용한다"를 요구하지만, `apps/admin`은 `@denn/render`를 **의존성으로 선언하지 않았고** §대상 파일의
명시 금지는 `package.json`/`pnpm-lock.yaml` 변경을 막는다. 둘을 동시에 만족할 수 없다.

**실측(읽기 전용).**

- `apps/admin/package.json` dependencies = `@denn/firebase`, `@denn/shared`, `@denn/spaces`,
  `@denn/ui`, `react`, `react-dom`. `@denn/render` **없음**.
- `apps/admin/node_modules/@denn/` = `firebase`, `shared`, `spaces`, `ui`. `render` **없음**
  (`apps/mockup/node_modules/@denn/`에는 있다).
- repo root에 `node_modules/@denn` 디렉터리 자체가 **없다**(pnpm isolated layout).
- `apps/admin`에서 `require.resolve("@denn/render")` → `MODULE_NOT_FOUND`.
- `tsconfig.base.json`과 `apps/admin/vite.config.ts`·`vite.e2e-fixture.config.ts`에 path alias 없음.
- 현재 `apps/admin`은 `@denn/render`를 **한 번도 import하지 않는다**.

따라서 Canvas preview(§3), plan 구성(§4), spec 078 replay와의 command JSON 일치(VERIFY unit 8),
executor 실행은 현재 의존성 그래프에서 **구현 불가능**하다.

**선택지.**

- **A (권장):** `apps/admin/package.json`에 `"@denn/render": "workspace:*"` 한 줄과 그에 따른
  `pnpm-lock.yaml` importer 항목만 허용한다. 신규 외부 dependency·download·install source 추가는
  0이고, 이미 monorepo 안에 있는 workspace edge 하나만 생긴다. admin bundle에 render가 들어가므로
  VERIFY의 bundle size/hash 보고에 그 증가가 나타난다. ⚠️ 선행 확인 필요: 현재 `pnpm-workspace.yaml`이
  사용자 dirty 상태(`allowBuilds`에 `set this to true or false` placeholder)라 `corepack pnpm install`이
  실패할 수 있다(**NOT VERIFIED** — install을 실행하지 않았다).
- **B:** `@denn/shared`가 필요한 render surface를 re-export한다. `packages/**` 변경이라 역시 명시
  금지이고 shared의 공개 API를 넓힌다. 비권장.
- **C:** admin이 plan/executor 없이 Canvas를 직접 그린다. §4의 "executor·cover/rotation 수학 복사 금지"와
  정면 충돌한다. 비권장.

결정 전까지 제품 코드·test는 시작하지 않았다. 이 문서 외 변경 0.
