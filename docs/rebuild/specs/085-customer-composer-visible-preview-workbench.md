# 085 - 고객 composer 결과 우선 작업대 레이아웃

## 상태

- `READY_FOR_CODEX` — 구현·검증 완료(2026-09-02). 결과는 이 문서 맨 아래 `DONE (Claude)` 절에 있다.
  next `CODEX_SPEC_085_REVIEW`.
- 기준 브랜치: `rebuild/modern-studio`
- 기준 commit: `HEAD=origin=b86fd5cc3`, ahead/behind `0/0`
- 직전 완료: spec 084 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- 승인 근거: Founder의 다음 작업 지시(2026-09-02). 실제 UI/UX 구현은 Claude Code가 담당한다.
- next: `CLAUDE_SPEC_085_IMPLEMENT`

## 목표 (WHY)

스펙 084의 P1 finding F-1을 닫는다. 현재 고객 composer는 색상·사진·확대·회전·이동·문구 컨트롤을 모두
지난 뒤에 Canvas가 나온다. 감사 실측에서 Canvas 상단은 `390x844`의 page y 약 1370px,
`1280x800`의 page y 약 1220px이었고, `844x390`에서는 Canvas 높이 683px이 뷰포트보다 컸다. 고객이
조작 결과를 보려면 계속 위아래로 왕복해야 하므로 주문 전 확인이라는 핵심 과업에 맞지 않는다.

이번 단위는 고객 `/`의 composer 레이아웃만 결과 우선 작업대로 바꾼다. 파일 선택의 영어 native 위젯
(F-2), 고객 진단 문구(F-7), Space, 운영자 UI, 주문·저장·발행은 고치지 않는다.

직접 근거:

- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md` F-1
- `docs/rebuild/results/spec-084/composer-ready-{1280x800,390x844,844x390}.png`
- `apps/mockup/src/preview/PreviewComposer.tsx`: 현재 DOM은 controls → status → Canvas → print 순서다.
- `apps/mockup/src/browse/browse.css`: composer는 단일 column이다.
- `packages/ui/src/theme.css`: `.denn-shell__inner` 최대 폭은 560px이다.
- 스펙 022: Canvas CSS size와 plan logical size는 일치해야 하며 CSS transform 축소로 대신할 수 없다.

## Design Read

기존 고객용 합성 편집 화면을 보존형 리디자인한다. Modern Studio의 밝은 neutral + warm taupe 언어를
유지하고, 장식보다 결과 확인이 먼저인 조용한 작업대(workbench) composition으로 바꾼다.

- `DESIGN_VARIANCE 5 / MOTION_INTENSITY 3 / VISUAL_DENSITY 4`
- 이 단위에는 새 브랜드 방향, 새 색상 리터럴, 새 font/icon/image, gradient, 장식 motion을 넣지 않는다.
- 기존 정보 구조·한국어 문구·선택 의미·접근성 semantics를 보존한다.
- card를 더 중첩해 장식하지 않는다. composer 자체를 한 작업 표면으로 유지하고 preview/control 두 영역의
  위계만 spacing, border, token surface로 구분한다.
- 이 설계 원칙은 고객 composer에만 적용한다. 운영자 dashboard나 다단계 admin UI에 일반화하지 않는다.

## 범위 (SCOPE)

### 포함

1. 고객 catalog shell이 desktop에서 composer 작업대 폭을 사용할 수 있는 명시적 class 경계.
2. composer를 preview pane과 controls pane으로 분리하는 DOM composition.
3. `960px` 이상에서 왼쪽 preview + 오른쪽 controls의 두 열 작업대.
4. `960px` 미만에서 preview가 controls보다 먼저 보이는 단일 열.
5. desktop preview pane의 범위 제한 sticky 동작.
6. 액자 preview logical width가 가용 폭과 viewport 높이를 함께 따르는 순수 계산.
7. 기존 실제 고객 route의 Chromium layout/accessibility/pixel 회귀와 deterministic PNG 근거.
8. spec 084 visual evidence의 post-spec-085 갱신과 F-1 해소 addendum.

### 제외

- F-2 native 파일 입력 교체·문구 변경.
- F-7 migration diagnostic 변경.
- 고객 browse 선택 단계 자체의 문구·순서·데이터 계약 변경.
- Space V1/V2, admin shell, C5 editor, Space 발급 panel 수정.
- Canvas executor, render plan command, geometry 공식, image owner, pan/zoom/rotation/text/clock/print 의미 변경.
- 저장, 주문, Kakao, upload, Firebase, actual network, emulator, Rules, Hosting, deploy.
- 실제 iPhone/Android/카카오 인앱·200% zoom 승인.
- 신규 dependency·manifest·lockfile·workspace 변경.

## 확정 레이아웃 계약

### 1. customer shell과 browse 폭

- `CatalogApp`에 고객 catalog 전용 shell/inner/card class를 명시한다. `@denn/ui`의 `Card` API는 변경하지
  않는다.
- customer catalog inner의 desktop 최대 폭은 `1120px`이다.
- identity card와 catalog status card는 각각 최대 `560px`로 중앙 정렬한다.
- browse card는 가용 폭을 사용한다.
- composer 밖의 직접 자식 선택 단계와 완료 요약은 최대 `560px`로 중앙 정렬한다. 기존 단일 흐름을 넓게
  늘여 놓지 않는다.
- composer가 열리지 않은 상태의 데이터·선택·CTA 의미는 바뀌지 않는다.

### 2. DOM과 영역

`PreviewComposer`는 다음 의미 구조를 갖는다.

```text
section.denn-composer
  h3 "미리보기"
  div.denn-composer__workbench
    div.denn-composer__preview-pane
      status
      Canvas area (plan이 있을 때만)
    div.denn-composer__controls-pane
      색상
      사진
      사진 위치·크기
      문구 입력
      인쇄용 파일 영역(frame만)
```

- preview pane을 DOM에서도 controls pane보다 먼저 둔다. mobile의 시각 순서와 접근성 읽기 순서가
  일치해야 한다.
- preview pane 안의 Canvas는 focusable control이 아니다. 기존 accessible name은 유지한다.
- controls 내부 fieldset/legend, input/button 순서, `aria-pressed`, label, status copy는 유지한다.
- 인쇄 영역은 controls pane의 마지막에 둔다. preview보다 먼저 주문 CTA처럼 보이지 않게 하며 기존
  provisional/disabled/error 의미를 바꾸지 않는다.
- 파일 decode 뒤 focus 강제 이동·자동 scroll은 계속 0이다.

### 3. responsive composition

- 기본(`<960px`): 제목 → preview pane → controls pane의 한 열. sticky/fixed 0.
- desktop(`>=960px`): preview pane 왼쪽, controls pane 오른쪽. 두 열 모두 `min-width:0`이고 서로 overlap하지
  않는다.
- desktop preview pane만 `position: sticky`를 사용하고 top은 기존 safe-area와 page padding을 반영한다.
  sticky는 composer 경계 안에서만 작동하며 header나 다음 content를 덮지 않는다.
- mobile portrait와 landscape에서 preview 전체를 먼저 보고 아래로 내려가 controls를 조작할 수 있어야
  한다. CSS `order`로 DOM과 시각 순서를 다르게 만들지 않는다.
- `320x568`, `390x844`, `844x390`, `932x430`, `1024x768`, `1280x800`, `1440x900`에서 document horizontal
  overflow 0, pane/control clipping 0이다.

### 4. 액자 Canvas의 viewport 높이 상한

스펙 022의 `observed CSS size == plan.logicalCanvas` 불변식을 지킨다. Canvas를 CSS transform,
`max-height`, `object-fit`만으로 축소하지 않는다. logical plan 자체를 가용 크기로 다시 만든다.

이름 있는 순수 계약을 `previewContracts.ts`에 둔다.

```ts
FRAME_MAX_LOGICAL_WIDTH = 500
FRAME_PREVIEW_VIEWPORT_RESERVE_PX = 96

heightBudget = floor(viewportHeight - FRAME_PREVIEW_VIEWPORT_RESERVE_PX)
heightLimitedWidth = floor(heightBudget / aspect)
logicalWidth = max(1, round(min(contentBoxWidth, 500, heightLimitedWidth)))
```

- `contentBoxWidth`는 전체 composer가 아니라 preview pane의 content box다.
- `aspect`는 이미 검증된 `FramePreviewGeometry.aspect`를 사용한다. raw catalog를 다시 읽지 않는다.
- `viewportHeight`는 현재 browser viewport의 finite positive CSS px 값이다. 최초 mount와
  `window.resize`를 반영하고, `window.visualViewport`가 있으면 그 resize도 반영한다.
- width/aspect/viewportHeight가 non-finite 또는 non-positive이거나 `heightBudget < 1`이면 `null`이다.
  기본값을 추측하지 않고 기존 measuring 상태로 닫는다.
- 최종 Canvas height `round(logicalWidth * aspect)`는 `heightBudget` 이하여야 한다. 불변식이 성립하지
  않으면 `null`이다.
- `1280x800`, aspect `1.4`, 충분한 폭에서는 기존 500 logical width와 700 height를 유지한다.
- `844x390`, aspect `1.4`에서는 height budget 294, logical width 210, Canvas height 294 이하여야 한다.
- `390x844`에서는 pane 폭이 우선하며 불필요하게 500px로 키우지 않는다.
- case plan은 기존 model logical size를 유지한다. 이 단위에서 case geometry를 임의 축소하지 않는다.

### 5. 기능 불변식

- 명시적 `미리보기 만들기`, 색 자동 선택 0, 필수 image 준비 전 Canvas 0을 유지한다.
- selection 변경 시 composer close·owner cleanup, color/photo/text/transform reset 계약을 유지한다.
- image replacement/clear, pointer drag, keyboard pan/zoom/rotation, text IME, clock overlay, print export 동작과
  오류 우선순위를 바꾸지 않는다.
- preview가 resize되어 plan이 재생성돼도 normalized pan/zoom/rotation과 고객 text는 유지한다.
- raw catalog, ID, URL, blob, filename, error code/message가 새 class/data/ARIA/log에 들어가지 않는다.
- 앱 자체 resize 처리에는 retry, timeout, polling, debounce timer를 추가하지 않는다.

## 대상 파일 (WHERE)

### 제품·unit 허용

- `apps/mockup/src/App.tsx`
- `apps/mockup/src/App.test.tsx`
- `apps/mockup/src/browse/browse.css`
- `apps/mockup/src/preview/PreviewComposer.tsx`
- `apps/mockup/src/preview/PreviewComposer.test.tsx`
- `apps/mockup/src/preview/previewContracts.ts`
- `apps/mockup/src/preview/previewContracts.test.ts`
- 필요할 때만 `apps/mockup/src/canvas/surface.css`의 layout selector 최소 변경

`BrowseFlow.tsx`, `PreviewSection.tsx`, `packages/**` API 변경이 필요해지면 먼저 STOP한다. DOM grouping은
`PreviewComposer.tsx` 안에서 끝내고 product/data state를 상위로 끌어올리지 않는다.

### E2E·시각 근거 허용

- `tests/e2e/mockup-preview.spec.ts`
- `docs/rebuild/results/spec-085/**` 신규
- canonical 실행이 갱신하는 아래 spec 084 current-baseline 파일
  - `docs/rebuild/results/spec-084/composer-ready-1280x800.png`
  - `docs/rebuild/results/spec-084/composer-ready-390x844.png`
  - `docs/rebuild/results/spec-084/composer-ready-844x390.png`
  - `docs/rebuild/results/spec-084/measurements.json`
  - 필요 시 `docs/rebuild/results/spec-084/README.md`의 F-1 상태 문구만
- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`의 spec 085
  follow-up addendum와 F-1 교차 참조만

`tests/e2e/local-visual-readiness.spec.ts` 자체는 수정하지 않는다. 갱신된 spec 084 파일은 현재 제품의 시각
baseline이며, 최초 감사 증거는 git history와 보고서의 initial finding 본문에 남는다. F-2/F-7 및 다른
finding의 판정은 바꾸지 않는다.

### 문서 허용

- 이 스펙
- `docs/handoff/2026-09-02-spec-085-customer-composer-visible-preview-workbench-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

### 명시 금지·보호

- `apps/admin/**`, `packages/**`, 이 목록 밖 기존 tests/config/scripts.
- 모든 `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
- `storage.rules`, `firestore.rules`, `firebase.json`, `firebase.emulator.json`, `.firebaserc`.
- 실제 Firebase/project/bucket/data/network, emulator, UID, deploy, publish, upload, order.
- `docs/rebuild/design/taste-v2/**`.
- `docs/rebuild/design/README.md`.
- `docs/rebuild/specs/038-page-design-prototype.md`.
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`.
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`.
- `packages/render/src/plan/index.ts`.
- `AGENTS.md`, 기존 Founder/user dirty 및 허용 목록 밖 파일.

보호 대상은 수정·삭제·restore·checkout·stage·commit하지 않는다. canonical E2E가 spec 018 PNG를 다시 써도
그대로 두고 시작/종료 hash만 보고한다.

## 필수 검증 (VERIFY)

### unit/component

- 새 frame logical width helper: desktop 유지, 390px landscape 높이 제한, pane-width 제한, max 500,
  경계 rounding, invalid width/aspect/viewport/height budget은 `null`.
- `round(width * aspect) <= floor(viewportHeight - 96)` 불변식.
- preview pane이 controls pane보다 DOM에서 먼저이고 print 영역은 controls의 마지막이다.
- 기존 fixed safe copy와 fieldset/legend/label/ARIA가 유지된다.
- resize listener의 mount/update/unmount와 StrictMode에서 listener/timer leak 0.

### Chromium E2E

실제 고객 `/`와 합성 catalog만 사용한다.

1. matrix 7개 viewport에서 horizontal overflow 0, pane/control clipping 0.
2. `<960px`에서는 preview pane bottom이 controls pane top보다 크지 않다.
3. `>=960px`에서는 preview pane right가 controls pane left보다 크지 않고 두 pane의 세로 구간이 겹친다.
4. desktop에서 controls 방향으로 page scroll하는 동안 preview pane이 composer 경계 내 sticky로 보인다.
5. frame Canvas height가 `viewportHeight - 96` 이하이고 width는 500 이하이며 0x0이 아니다.
6. color/photo 선택, 실제 Canvas pixel, pan/zoom/rotation, text, print 기존 핵심 assertion이 그대로 PASS한다.
7. keyboard 순서, visible focus, 44px target, axe serious/critical 0.
8. console error/warning, pageerror, unexpected route, localhost/blob 외 request 0.
9. `1280x800`, `390x844`, `844x390`의 product-route composer PNG를
   `docs/rebuild/results/spec-085/`에 저장하고 README에 viewport·준비 절차·synthetic/live 여부를 적는다.
10. screenshot 직전 animation을 끝값으로 settle한다. timeout/retry/skip/tolerance로 차이를 덮지 않는다.

### 전체 gate

```powershell
node scripts/check.mjs
node scripts/e2e-run.mjs
git diff --check
```

다음을 함께 보고한다.

- targeted unit/component/E2E와 전체 unit file/count.
- canonical Chromium pass/fail/skip/retry.
- spec 085 PNG 3장 SHA-256. 같은 코드로 다시 생성했을 때 byte가 달라지면 원인을 규명하거나 STOP한다.
- 갱신된 spec 084 composer PNG 3장과 `measurements.json`이 현재 DOM/geometry를 반영하는지.
- customer/admin entry size·gzip·SHA-256과 변화 원인. admin entry는 무변경이어야 한다.
- `git diff --check`, 허용 경로 밖 diff 0, package/lockfile/Rules/config diff 0.
- 포트 `4183/4184/4185/8080/9099/9199` LISTENING 0.
- `denn-e2e-*`, `test-results`, `playwright-report`, `debug.log` 잔류 0.
- 보호 대상 시작/종료 hash와 stage 0.

## 완료 정의 (DONE)

- F-1의 세 증상이 자동검증과 PNG로 닫힌다: mobile preview-first, desktop simultaneous workbench,
  landscape Canvas viewport-height cap.
- 스펙 022 Canvas size 불변식과 기존 composer 기능이 모두 유지된다.
- spec 084 report에는 initial F-1과 spec 085 후속 해소가 구분되어 기록되고 F-2/F-7은 그대로다.
- 제품/test commit과 문서 commit을 분리해 일반 fast-forward push한다.
- 완료 후 `READY_FOR_CODEX`, next `CODEX_SPEC_085_REVIEW`에서 멈춘다.
- 실제 기기·Firebase/network/emulator/deploy·운영 데이터는 `NOT TESTED`다.
- 다음 UI finding이나 다음 스펙을 자동 시작하지 않는다.

## STOP 조건

- `packages/**`, `BrowseFlow.tsx`, `PreviewSection.tsx`, Canvas/render/shared API 변경이 필요함.
- CSS 축소 없이 logical size 불변식을 지킬 수 없음.
- case fixed logical size가 matrix에서 viewport를 깨며 별도 product decision이 필요함.
- 기존 pan/zoom/rotation/text/clock/print 의미 또는 focus order가 바뀜.
- F-2/F-7, Space/admin UI까지 함께 고쳐야만 구현 가능함.
- 신규 dependency/install/download, 실제 network/Firebase/emulator/deploy 필요.
- 필수 gate flaky/비재현, 외부 egress, 보호 파일의 예상 밖 변경.

이 경우 자동 확장하지 않고 정확한 근거·최소 질문·현재 diff를 보고한다.

### QUESTIONS

- 없음. 범위는 spec 084 F-1의 구조 보완으로 고정됐다. 제품 의미·새 미학·금지 경계가 필요해지면 STOP한다.

### DONE (Claude) — 스펙 085 구현·검증 (2026-09-02)

계약 문서 대행 commit `a9e7528` → 제품/test commit `7351696` → 문서 commit은 이 갱신이다.
범위 밖 변경 0: `apps/admin/**`, `packages/**`, package/lockfile/workspace, Rules/Firebase config diff
**0**, 실제 Firebase/network/emulator/deploy **0**, F-2·F-7·Space·운영자 UI 수정 **0**, 다음 스펙 착수 **0**.

**구현 1 — 작업대 composition.** `PreviewComposer`가 `denn-composer__workbench` 안에 preview pane과
controls pane을 갖는다. preview pane이 **DOM에서 먼저**고(status → Canvas), controls pane이 뒤따른다
(색상 → 사진 → 사진 위치·크기 → 문구 입력 → 인쇄 영역). `<960px`는 한 열, `>=960px`는 두 열 grid이며
desktop에서만 preview pane이 `position: sticky`(top = `20px + safe-top`, `align-self: start`)다. **CSS `order`를
쓰지 않았다** — 시각 순서와 스크린리더·Tab 순서가 갈라질 수 있기 때문이다. 기존 fieldset/legend/label/
`aria-pressed`/status 문구·순서는 그대로고, pane은 role·landmark·tab stop을 추가하지 않는 순수 layout box다.

**구현 2 — 높이 예산을 가진 logical size.** `previewContracts.ts`에
`FRAME_PREVIEW_VIEWPORT_RESERVE_PX = 96`과 순수 함수 `resolveFramePreviewLogicalWidth({contentBoxWidth,
aspect, viewportHeight})`를 두었다. `heightBudget = floor(viewportHeight - 96)`,
`heightLimitedWidth = floor(heightBudget / aspect)`,
`logicalWidth = max(1, round(min(contentBoxWidth, 500, heightLimitedWidth)))`이고, 입력이 쓸 수 있는
측정값이 아니거나 `heightBudget < 1`이거나 `round(width*aspect) > heightBudget`이면 **`null`**이다(기본값
추측 0). `contentBoxWidth`는 composer가 아니라 **preview pane의 content box**이고, `aspect`는 이미 검증된
`FramePreviewGeometry.aspect`다. 기존 `resolveFrameLogicalWidth`는 Space viewer가 그대로 쓰므로
손대지 않았다(`apps/mockup/src/space/**`는 허용 목록 밖이다).

viewport 높이는 `subscribeViewportHeight(window, ...)`가 공급한다. `window.innerHeight`(**layout**
viewport)를 읽고 `resize`와 `visualViewport.resize`를 모두 구독하되, 값은 `innerHeight`로 고정해 화면
키보드(visual viewport만 줄이는 것)가 고객이 문구를 치는 도중 plan을 다시 만들지 않게 했다. debounce·
timer·retry·polling **0**, teardown은 붙인 listener만 제거한다.

**구현 3 — 고객 shell의 measure.** `CatalogApp`이 `denn-customer` / `denn-customer__inner` /
`denn-customer__card--reading` / `denn-customer__card--workbench` class를 명시한다. `@denn/ui`의 `Card`는
이미 className을 forward하므로 **API 무변경**이고 래퍼 element도 추가하지 않았다. inner는 `>=960px`에서
최대 **1120px**, identity·status card와 `.denn-browse`의 composer 외 직접 자식(선택 단계·완료 요약)은
최대 **560px 중앙 정렬**이다.

**범위 안에서 발견해 고친 잠재 결함 1건.** `.denn-preview-edit__area`의 주석은 예전부터 "드래그 표면은
정확히 canvas box"라고 적었지만 실제는 `display: block`이라 컨테이너 폭을 채웠고, Canvas가 그 폭과
같았기 때문에 우연히 일치했다. 높이 예산으로 Canvas가 pane보다 좁아지자 spec 031 시계 overlay의
퍼센트 좌표와 포인터 드래그 표면이 Canvas **옆**으로 밀렸다(844x390 증거 캡처에서 육안으로 발견).
`width: fit-content` 한 줄로 기존 불변식을 복원했다 — 스펙이 허용한 `surface.css`의 layout selector
최소 변경이며 시계·드래그의 **의미**는 바꾸지 않았다.

**F-1의 세 증상(같은 fixture로 측정한 before → after).**

| 증상 | before | after |
|---|---|---|
| 모바일 세로에서 Canvas가 모든 컨트롤 아래 | 액자 밴드 상단 page y **1620** (390x844) | **973** — composer 안에서 preview가 첫 요소 |
| 데스크톱 단일 컴럼, 미리보기와 컨트롤을 동시에 못 봄 | page y **1403**, 문서 높이 **2303** (1280x800) | page y **880**, 문서 높이 **1636**, 왼쪽 sticky preview + 오른쪽 controls |
| 가로에서 Canvas 683px > 뷰포트 390px | Canvas **488x683** (844x390) | Canvas **210x294** — 예산 `390-96=294` 이하 |

`measurements.json`의 composer Canvas는 지금 1280x800 **500x700**, 390x844 **286x400**, 844x390 **210x294**,
320x568 **216x302**이고 horizontal overflow는 여전히 전수 0이다.

**unit/component.** 전체 **2500/2500 PASS**(92 파일, 이전 2466 + 신규 **34**). 신규는
`resolveFramePreviewLogicalWidth`(desktop 유지·landscape 높이 제한·pane 제한·500 상한·경계 rounding·
invalid 입력 10종 `null`·viewport×aspect×pane 행렬의 `round(w*aspect) <= budget` 불변식), workbench DOM
순서(preview가 controls보다 먼저, status는 preview pane 안, 컨트롤 순서 유지, print가 마지막, `order:` 미사용,
ARIA/legend 유지), viewport height 구독(즉시 보고 → 양쪽 resize 반영 → teardown 후 listener 0, StrictMode
mount→unmount→mount 잔존 0, `visualViewport` 부재 동작, invalid 높이 `null`)다. jsdom을 도입하지 않기 위해
기존 clock ticker와 같은 **ports 주입** 방식을 썼다.

**Chromium E2E.** `tests/e2e/mockup-preview.spec.ts` **60 → 75**(신규 15). 신규는 7 viewport matrix
(320x568/390x844/844x390/932x430/1024x768/1280x800/1440x900)의 overflow 0·clipping 0·pane 관계·Canvas
높이 예산·transform `none`·`max-height: none`·CSS size == plan size, desktop sticky, reading measure,
390x844·1280x800의 DOM tab 순서·focus 표시·44px·axe serious/critical 0, 그리고 증거 PNG 3장 + README
index 계약이다. **기존 60건의 핵심 단언(색상·사진·실제 Canvas pixel·pan/zoom/rotation·문구·시계·인쇄
export)은 하나도 고치지 않았고 그대로 PASS**한다. timeout·retry·skip·screenshot tolerance 추가 **0**.

**시각 증거.** `docs/rebuild/results/spec-085/`에 product-route PNG 3장 + README(provenance·viewport·
준비 절차·synthetic 여부·F-1 대응표·재현성 조건). 세 PNG는 독립 실행에서 SHA-256이 같다 —
`545ac7a2…`(1280x800), `75d1a5a4…`(390x844), `8fb911d7…`(844x390). 재현 조건은 스펙 084 보완 라운드 1에서
확립한 셋이다(고정 시각 + 캡처 직전 animation `finish()` + `--disable-partial-raster`). raster 플래그는
worker 옵션이라 describe 단위로 좁혀지지 않아 파일 최상단에 둔다. 이 파일의 모든 단언은 DOM과 Canvas
자체 pixel을 읽고 screenshot을 비교하지 않으므로 기존 60건의 의미는 변하지 않는다(75/75 실측 PASS).

**스펙 084 baseline 갱신.** canonical 실행이 composer PNG 3장을 다시 쓴다(계약이 허용한 바).
그외에 **`browse-ready-1280x800.png`도 바뀐다** — §1이 고객 inner를 desktop에서 1120px로 넓히라고
규정하고 browse card가 가용 폭을 쓰므로, composer를 열기 전 browse 화면도 desktop에서 폭이 변한다. 계약
목록에는 composer 3장만 적혀 있어 **열거 밖 1장**이지만, 복원하면 현재 제품과 다른 baseline을 남기고
canonical 실행마다 되돌려지므로 재생성된 상태로 commit했다. Codex 판단을 요청한다.
`docs/rebuild/results/spec-084/measurements.json`은 `.gitignore:2`의 전역 `*.json` 규칙으로 **tracked가
아니다**(스펙 084 때부터 그랬다). 디스크의 값은 현재 DOM/geometry를 반영함을 위에서 확인했고, 이
단위에서 `.gitignore`는 건드리지 않았다.

**전체 gate.** `node scripts/check.mjs` **PASS**(format·lint·typecheck 7개, unit **2500/2500**, 92 파일,
build 2개). canonical `node scripts/e2e-run.mjs` **Chromium 218 passed / 0 failed / 0 skipped / 0 retry**
(이전 203 + 신규 15). `git diff --check` PASS. 포트 4183/4184/4185/8080/9099/9199 LISTENING **0**,
`denn-e2e-*` staging·`test-results`·`playwright-report`·`debug.log` 잔류 **0**.

**bundle.** 고객 entry `index-CRHkWFoL.js` 340.60 kB / gzip 104.40 → `index-eQgqaWiH.js` **341.94 kB /
gzip 104.76**(+1.34 kB), CSS `index-BjqjBda8.css` 19.38 kB / gzip 4.55 → `index-CLxRhNtu.css` **20.27 kB /
gzip 4.73**(+0.89 kB). 원인은 이 단위가 추가한 크기 계약·viewport 구독·pane DOM과 workbench CSS뿐이다.
운영자 entry는 **무변경** — `index-BeV6iIrs.js` 295.32 kB / gzip 91.54, sha256
`bdbc113a73b0b20d1424e007a722c29f2f97d3792280a38b4f7c335b67ba11c9`.

**보호 대상.** design README `99e53de3…`, spec 038 `e6c1de7d…`, `packages/render/src/plan/index.ts`
`cfab600b…`, `pnpm-workspace.yaml` `61c7bfe4…`, `AGENTS.md` `82738101…`, `taste-v2/**`는 시작/종료 hash
동일이고 restore·checkout·stage·commit **0**이다. 보호 spec 018 PNG 2장은 canonical E2E가 다시 썼고
stage하지 않았다: `browse-desktop-1280x800.png` `ace8d75b…` → `d0a0aa52…`,
`browse-mobile-390x844.png` `6bdcb88c…`(무변경). desktop 장은 같은 고객 shell을 1280px에서 찍기 때문에
§1의 폭 변경이 그대로 나타난다 — 보호 대상이므로 그대로 두고 hash만 보고한다.

**생각해볼 점(구현은 계약대로 했음).** §1을 그대로 따르면 desktop에서는 composer를 열기 전에도
browse card가 1120px로 넓어지고 그 안의 선택 단계는 560px로 중앙 정렬되므로, 카드 오른쪽에 빈 면이
생긴다(`spec-084/browse-ready-1280x800.png`). 계약이 명시적이라 그대로 구현했고 임의로 바꾸지 않았다.
composer가 열렸을 때만 넓혀야 하는지는 Codex/Founder 판단 사항으로 남긴다.

**NOT TESTED.** 실기기 Safari/Android/카카오 인앱, 200% zoom, preview channel, 실제 Firebase/network/
emulator/deploy/운영 데이터. 스펙 084의 다른 finding(F-2·F-7·F-3·F-4·F-5·F-6·F-8)은 범위 밖이며 판정도
바꾸지 않았다.

상태는 `READY_FOR_CODEX`, next `CODEX_SPEC_085_REVIEW`에서 멈춘다. 다음 finding과 다음 스펙은 시작하지
않았다.
