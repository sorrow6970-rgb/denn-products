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

### DONE (Claude) — 스펙 083 구현 (2026-08-28, Founder OO-1=A · Q-1=A)

기준 `HEAD=origin=ba9eb48`에서 시작. 계약 문서 `fbf60cc`, Q-1 기록 `977af5c`, 구현 `1a7cba9`.

**Q-1=A 적용.** `apps/admin/package.json`에 `"@denn/render": "workspace:*"` **한 줄**과 `pnpm-lock.yaml`
importer **3줄**만 추가했다. `corepack pnpm install --offline --ignore-scripts`로 갱신했고 실측
`downloaded 0, added 0` — 신규 외부 의존성·다운로드·설치 source는 **0**이다. 사용자 dirty
`pnpm-workspace.yaml`은 **sha256 `61c7bfe4…` 그대로**(pnpm이 다시 쓰지 않았고 stage/commit도 안 했다).

**구현 요지.**

- **§1 gate.** `resolveAdminSpaceV2IssueEnabled`는 정확히 `"true"`만 통과시키고 완전한 config와 write
  gate를 함께 요구한다. off면 session·adapter·UUID source·facade가 **하나도 생성되지 않는다**.
  기존 default app과 `OperatorAuthPort` 하나를 그대로 쓰고, writer는 첫 valid issue에서만
  `@denn/firebase/space-write`를 dynamic import한다 — 빌드에서 `space-write-*.js` **8.47 kB** 별도
  chunk로 분리된 것으로 확인된다. lazy factory 실패는 write에 도달하지 않은 **definite** 실패로 닫고
  SDK 메시지·config 값을 밖으로 내보내지 않는다.
- **§2 baseline.** `ready-clean`에서만 draft를 시작하고, freeze 시점 revision과 달라지면 stale로
  전환해 조용한 재기준화를 막는다. 카탈로그 저장과 발급은 별개 버튼이다.
- **§3 PNG-only owner.** `image/png` 한 개만 받되 MIME/확장자를 신뢰 근거로 쓰지 않는다 — bytes를
  private `Uint8Array`로 **한 번** 복사하고 이 모듈이 **고정한** `image/png` Blob으로 감싸 브라우저
  decode가 판정한다. 파일명·blob URL·Blob·원본 MIME는 closure를 벗어나지 않고, object URL은
  replace/clear/dispose에서 **정확히 한 번** revoke된다(live Set 가드 — 첫 구현의 이중 revoke를 자체
  test가 잡았다). superseded decode는 현재 draft를 덮지 않는다. `freeze()` 핸들은 **자기 복사본**을
  들고 있어 이후 replace/clear와 무관하다.
- **§4 plan.** admin-local 순수 helper 하나(`buildAdminFrameIssuePlan`)만 두고 `@denn/render`의
  public plan/executor를 쓴다. 정규화 pan은 replay와 동일한 **2-pass**(zero-pan probe → maxPan →
  logical)로 변환한다. 색상은 customer adapter와 같게 대문자 정규화한다.
- **§5 frozen generation.** UI preview와 `SpaceV2FrozenIssueDraftSource`가 같은 generation을 쓰고,
  source의 public key는 `copyFields`/`exportProofPng` 둘뿐이다.
- **§6 issue form.** password 두 입력은 submit 시작 즉시 비우고, mismatch는 아무것도 소모하지 않으며
  submit은 single-flight다. 실패 코드는 고정 한국어로만 매핑한다(코드·SDK 메시지 노출 0).
  outcome-unknown은 `role="alert"`이며 retry·link가 없다.
- **§7 link.** confirmed success에서만 현재 origin **root + `?space=` 하나**로 만들고(query·hash·자격
  증명 미복사), 표시 문자열과 copy payload가 동일하며 **명시 click 1회**로만 clipboard에 간다.

**plan 동등성(VERIFY unit 8).** customer의 `buildFrameProductPlan` + replay의 normalized→logical 변환에
같은 evidence를 넣어 **command JSON exact equality**를 6개 케이스(identity · zoom+pan · 1/2/3 quarter
turn · landscape+inset 0 · 소문자 색상)에서 단언한다. 불일치하면 발급을 열지 않는다.

**실측.** `node scripts/check.mjs` **PASS**(format·lint·typecheck 7개·unit **2458/2458**(92 파일)·build
2개), canonical `pnpm run test:e2e` **Chromium 177/177**(기존 161 + 신규 16),
`admin-space-v2-issue` 16/16, `git diff --check` PASS, 포트 4183/4184/4185/8080/9099/9199 ·
`test-results`/temp staging 잔류 **0**. 실제 Firebase/network/emulator/deploy **0**.

**bundle.** 고객 entry `index-CRHkWFoL.js` **340.60 kB / gzip 104.40** — 변경 전과 **동일 해시**
(고객 번들 무변경). admin entry `index-D0XOQpRL.js` 226.20 kB → `index-Dl31AMdR.js` **294.61 kB**
(gzip 71.75 → **91.35**), admin CSS 9.14 → **10.80 kB**(gzip 2.83 → 3.10), 신규 lazy
`space-write-*.js` **8.47 kB**. Firebase SDK chunk 이름·크기는 그대로이고 `index.html`은 entry+CSS만
로드한다 — **write SDK는 default entry에 eager 포함되지 않는다**.

**⚠️ 스펙 밖 변경 1건(Codex 판단 요청).** `apps/admin/src/space-v2/issue-candidate.test.ts`의
"App.tsx never imports or calls it" 단언 중 `expect(app).not.toContain("space-v2")` 한 줄을
`not.toContain("issue-candidate")`로 좁혔다. 스펙 083 §범위 1은 panel을 `App.tsx`에 조합하도록
**요구**하고 §대상 파일도 `App.tsx` 수정을 허용하는데, panel import 경로가 `./space-v2/…`라 그 단언과
동시에 성립할 수 없다. test의 **원래 의도**(spec 065 candidate projector가 admin UI에 배선되지
않는다)는 그대로 유지되며 `createSpaceV2FrameIssueCandidate` 단언도 그대로다. 이 한 줄 외에 spec
064~082 제품/test 변경은 **0**이다.

**남은 경계.** 실제 UID·live project/bucket/data/network·emulator·Rules/Hosting deploy·운영 발급은
`NOT TESTED / FORBIDDEN`이다. pointer drag는 이번 필수 범위가 아니어서 range/button/keyboard로만
구현했다. 보호 spec-018 PNG 2개와 기존 Founder/user dirty는 stage/commit/restore하지 않았다.

**진행도.** 전체 리빌드 **85~88% 완료 / 12~15% 잔여**(운영자 발급 UI 축이 열려 소폭 전진).

### CODEX REVIEW — CORRECTION_REQUIRED 라운드 1 (2026-08-28)

검수 기준 `HEAD=origin=0622ad0`, ahead/behind 0/0. 구현 `1a7cba9`과 기록 `0622ad0`을 독립 검토했다.
Q-1=A workspace edge는 승인 범위와 일치한다. `issue-candidate.test.ts`의 문자열 단언 정밀화도
`App.tsx`의 panel 배선과 기존 candidate projector 비배선을 동시에 검증하도록 바꾼 것이므로 수용한다.

#### 결함 1 — clipboard synchronous throw가 UI를 탈출한다

- `AdminSpaceV2IssuePanel.tsx:439`는 `clipboard.write(link).then(...)`만 사용한다.
- injected `write()`가 동기 throw하거나 production에서 `navigator.clipboard`/`writeText`가 없어
  `browserClipboard.write()`가 동기 throw하면 rejected Promise가 생기기 전 click handler가 탈출한다.
- 따라서 §7의 “clipboard가 없거나 throw하면 success는 유지하고 fixed copy failure를 표시”가 성립하지
  않는다. 동기 throw를 catch해 `copyState="failed"`로 닫고 raw error를 버려야 한다.
- missing port, synchronous throw, rejected Promise 세 경계를 unit/browser에서 각각 고정한다.

#### 결함 2 — object URL 생성 후 `createImage()` throw에서 URL leak

- `browser-proof-draft.ts:218-220`은 URL을 만들고 `live`에 넣은 뒤 `createImage()`를 같은 try에서 부른다.
  catch는 failed state만 publish하고 이미 만든 URL을 revoke하지 않는다.
- Codex 직접 재현: `createObjectUrl() => "blob:leak"`, `createImage() => throw`일 때 snapshot은
  `ADMIN_PROOF_DECODE_FAILED`지만 `revoked=[]`였다.
- URL을 만든 뒤 어느 후속 단계가 throw해도 정확히 한 번 revoke해야 한다. drawable/binding/frozen handle은
  0이어야 하며 unit이 `created === revoked`를 단언해야 한다.

#### 검증 공백과 독립 gate

- 신규 `admin-space-v2-issue` E2E 16건에는 VERIFY가 명시한 auth expiry-equivalent와 issue 중
  unmount/dispose·late completion이 없다. panel/fixture 실제 연결에서 이를 추가하고 duplicate issue,
  stale UI, URL/listener leak 0을 고정한다. StrictMode cleanup도 같은 경계에서 검증한다.
- 독립 `node scripts/check.mjs` **PASS**: format/lint/typecheck, unit **2458/2458**(92파일), build 2개.
- 독립 canonical `node scripts/e2e-run.mjs`는 **176 passed / 1 failed**. 실패는 신규 spec 083 16건이 아니라
  기존 `space-production-route.spec.ts`의 “V2 viewer fits 320px”에서 `preview-canvas`가 5초 안에 나타나지
  않은 timeout이다. Chromium `debug.log`에 GPU command-buffer transient failure가 있었지만 이것이 원인인지는
  **NOT PROVEN**이다. timeout 증가·skip·고객 코드 수정은 금지한다. 보완 후 canonical 전체를 한 번 다시
  실행하고, 비결정적 실패가 반복되면 STOP한다.
- `git diff --check` PASS, `HEAD=origin=0622ad0`, ahead/behind 0/0, 포트·temp 잔류 0. 테스트가 만든
  `debug.log`만 제거했다. 보호 PNG와 기존 Founder/user dirty는 restore/stage하지 않았다.

허용 보완 파일은 panel/owner source와 해당 unit, spec 083 E2E fixture/test의 최소 범위다. 제품 보완 후
`READY_FOR_CODEX`에서 멈춘다. 실제 Firebase/network/emulator/deploy와 다음 스펙은 금지다.

### DONE (Claude) — 보완 라운드 1 (2026-08-31)

Codex 라운드 1 검수의 두 결함과 검증 공백만 좁게 고쳤다. 기준 `HEAD=origin=0622ad0` → Codex review
기록 `1d03bfc` → 제품 보완 `7ce9ab4`. 허용 파일 밖 diff, package/lockfile/Rules/config diff는 **0**이고
`App.tsx`·기존 spec 064~082 제품/test·고객 앱은 건드리지 않았다.

**결함 1 — clipboard 동기 throw.** 원인은 `.then(onOk, onErr)`가 **rejected Promise 하나만** 처리한다는
것이다. production port는 `write()` 안에서 `navigator.clipboard.writeText`를 읽으므로, capability가
없으면 Promise가 생기기 전에 throw하고 click handler를 탈출한다. copy 결정을 `copyLinkToClipboard(link,
clipboard)` 한 함수로 분리해 **missing port · 동기 throw · rejection · non-Promise 반환**을 모두 닫았다.
`Promise.resolve(...)`가 thenable이 아닌 반환까지 흡수한다. success·link·상태는 보존되고 raw error는
표시·log·rethrow 없이 버려진다.

**결함 2 — post-URL throw에서 object URL leak.** URL 생성과 `createImage()`가 같은 try에 있어, catch가
"revoke할 URL이 있는지"를 알 수 없었다. URL 생성을 **자기 단계**로 떼어내고, 그 뒤의 어떤 실패도
`revoke(url)`을 지나가게 했다. `live` Set 멤버십이 정확히 1회를 보장하므로 이후 `clear()`/`dispose()`가
두 번 revoke하지 못한다. state는 `ADMIN_PROOF_DECODE_FAILED`, drawable·frozen handle은 0이다.

**추가 결함 — settled outcome이 baseline copy에 가려짐(보완 중 발견).** auth 만료는 baseline을
사용 불가로 만들고, 기존 status 순서는 `!baselineReady`를 **먼저** 반환했다. 그래서 발급 중 만료가
나면 화면이 definite auth 실패 대신 "편집 기준을 …불러온 뒤에" 문구를 보였고, 같은 경로에서
outcome-unknown 경고("같은 시안을 다시 발급하지 말라")도 덮인다 — §6이 요구하는 정보가 사라진다.
이미 일어난 시도(success/error/outcome-unknown/preparing/issuing)를 **먼저** 보고하도록 순서만 바꿨고,
아직 시도가 없는 모든 상태는 그대로 baseline/stale copy가 소유한다.

**재현 증명(수정 전 소스에 대해 직접 실행).**

- 신규 owner unit "revokes the URL it already made when a later step of the same load throws" →
  수정 전 소스에서 **FAIL**(Codex가 보고한 `revoked=[]` 그대로), 수정 후 PASS.
- 신규 E2E "an explicit copy keeps the success and closes every failure shape safely" → 수정 전
  panel에서 **FAIL**(`space-v2-copy-status`가 빈 문자열 — click이 탈출).
- 신규 E2E "an expiry during an in-flight issue closes as a definite auth failure" → 수정 전 panel에서
  **FAIL**(Received: "편집 기준을 저장할 변경이 없는 상태로 …").

**검증 공백 보완.** spec 081 session unit을 인용하지 않고 **spec 083 composition/panel fixture가 실제로
연결되는 경계**를 검증한다.

- fixture의 synthetic writer가 composition이 넘긴 **실제 narrowed auth port**(`currentOperator()`)를
  읽고, 실제 auth observer가 signed-out을 publish한다. auth 만료는 fake state가 아니라 real port 경로다.
- E2E: 만료 + frozen draft(발급·writer 0), **발급 중 만료 → late completion이 definite
  `SPACE_V2_ISSUE_AUTH_REQUIRED`로 종료**(link·retry·중복 write 0, 코드 노출 0).
- E2E: 발급 중 unmount + session dispose → object URL created==revoked, panel listener 0,
  late completion이 `disposed`를 덮지 못하고 issue call은 1 유지. 재mount해도 success/link/password 0.
- E2E: mount → unmount → mount 순환에서 listener 수 동일, URL created==revoked, 재mount한 panel의
  proof owner가 **살아 있어** 두 번째 PNG가 다시 decode·draw된다(중복 issue·URL·listener 0).
- unit: copy 세 경계(missing / 동기 throw / rejection) + non-Promise 반환.

**StrictMode에 대한 정확한 범위.** E2E fixture 번들은 **production build**라 StrictMode는 effect를
이중 호출하지 않는다. 그래서 StrictMode가 개발 빌드에서 시뮬레이션하는 것과 같은 cleanup 경계를
**실제 mount→unmount→mount**로 직접 수행해 측정했다. 남은 차이 하나는 아래 관찰로 보고한다.

**관찰(고치지 않음, Codex 판단 요청).** `main.tsx`는 `<StrictMode>`로 감싸고, `App.tsx`의
`compositionRef.current ??= …` + effect cleanup `composition.dispose()`와 panel의
`ownerRef.current ??= …` + `owner.dispose()`는 같은 형태다. StrictMode의 mount→cleanup→mount는 같은
ref를 유지하므로 **개발 빌드에서는** 첫 cleanup이 composition(session 포함)과 proof owner를 dispose한
뒤 재생성되지 않는다. 이 세션은 production build만 실행하므로 재현·증명하지 못했고, panel만 고치면
`App.tsx`가 session을 이미 dispose한 상태라 반쪽 수정이 된다. 이번 라운드 허용 범위는 `App.tsx`를
"필요하지 않으면 변경하지 않는다"이므로 **변경하지 않았다**.

**실측(보완 후 전체 재실행).**

- `node scripts/check.mjs` **PASS** — format·lint·typecheck 7개, unit **2465/2465**(92 파일, +7),
  build 2개.
- canonical `node scripts/e2e-run.mjs` **Chromium 182 passed / 0 failed**(기존 161 + spec 083 **21**).
  Codex 라운드 1에서 실패했던 `space-production-route` "the V2 viewer fits a 320px viewport…"는 이번
  실행에서 **ok (3.2s)** — timeout 증가·skip·retry·고객 코드 수정은 **0**이다.
- `git diff --check` PASS. 포트 4183/4184/4185/8080/9099/9199 LISTENING **0**, temp staging·
  `test-results`·`debug.log` 잔류 **0**.
- bundle: 고객 entry `index-CRHkWFoL.js` **340.60 kB / gzip 104.40 — 해시 무변경**. admin entry
  294.61 → **294.80 kB**(gzip **91.35** 동일), admin CSS **10.80 kB** 동일, lazy `space-write-*.js`
  **8.47 kB** 그대로 — write SDK는 default entry에 eager 포함되지 않는다.
- `issue-candidate.test.ts`의 라운드 0 정밀화는 그대로 유지했다. 실제 Firebase/network/emulator/deploy
  **0**, 보호 spec-018 PNG 2개와 기존 Founder/user dirty는 stage/commit/restore **0**.

상태는 `READY_FOR_CODEX`에서 멈춘다. 다음 스펙은 시작하지 않았다.
