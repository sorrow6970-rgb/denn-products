# 086 - 운영자 C5 사이즈 선택 컨트롤 접근성 표면

## 상태

- `READY_FOR_CODEX` — 구현·검증 완료(2026-09-03). 결과는 이 문서 맨 아래 `DONE (Claude)` 절에 있다.
  제품/test/PNG `8c7b7ff`, 문서 commit은 그 다음이다. next `CODEX_SPEC_086_REVIEW`, fix_round `0`.
- 기준 브랜치: `rebuild/modern-studio`
- 기준 commit: `HEAD=origin=452c03b`, ahead/behind `0/0`
- 직전 완료: spec 085 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- 출처 finding: spec 084 F-5(P1)
- next: `CLAUDE_SPEC_086_IMPLEMENT`

## 목표 (WHY)

운영자 C5 액자 인쇄 치수 편집기의 `액자 사이즈` `<select>`만 브라우저 기본 23px 높이로 남아 있다.
바로 아래 `TextField`와 같은 Modern Studio form 언어를 사용하고 최소 44px pointer target을 보장한다.

이 단위는 선택 컨트롤의 시각·접근성 표면만 고친다. C5의 로드, 명시 선택, 레거시 읽기 전용,
dirty/valid 판정, 전체 문서 저장, 충돌 및 결과 미확정 계약은 바꾸지 않는다.

## Codex 선정 결정

1. spec 084 **F-6은 철회**한다. `FramePrintSizeEditor`의 root는 spec 041부터 이미 `<Card>`다.
2. spec 084 **F-8은 검증된 UI 결함이 아니다**. 감사 PNG의 320x480은 합성 fixture가 발행 당시
   `logicalWidth`를 선언한 결과다. V2 replay의 충실 재현과 기기 폭 재계산 중 무엇을 택할지는 별도
   Founder 제품 결정이며 spec 086에 포함하지 않는다.
3. 다음 구현 단위는 **F-5 단독**이다. 고객·운영자 앱을 한 단위에 묶지 않는다.
4. F-4는 admin 기본 진입/gate 결정 전, F-7은 고객 노출 독자·운영 발생 조건 결정 전 구현하지 않는다.

## Design Read

Reading this as: 기존 운영자 form의 보존형 소규모 보완이며, 조용한 Modern Studio 토큰과 명확한
입력 상태를 유지하는 접근성 우선 표면이다.

- `DESIGN_VARIANCE 3 / MOTION_INTENSITY 1 / VISUAL_DENSITY 6`
- 이 화면은 admin 제품 UI이므로 마케팅용 장식·레이아웃 패턴은 적용하지 않는다.
- 기존 `@denn/ui` token과 spec 083의 native select 선례만 사용한다.
- 새 색상·font·icon·gradient·shadow·motion·의존성·공유 UI API를 만들지 않는다.
- visible copy, option 순서, label, control id/test id, Card 구조는 그대로 둔다.

## 범위 (SCOPE)

### 포함

1. `FramePrintSizeEditor`의 select에 컴포넌트 전용 class와 CSS 연결.
2. select의 최소 높이 44px, 폭 100%, overflow 방지, Modern Studio token 기반 border/background/text/radius.
3. keyboard focus-visible과 disabled 상태의 비색상 단서 유지.
4. 기존 unit과 실제 Chromium fixture에서 label 연결, 선택 동작, 44px, focus, overflow, axe,
   console/network 0 검증.
5. canonical spec 084 C5 PNG 두 장 및 측정 결과 갱신.
6. spec 084 감사 보고서에서 F-5 해소를 addendum으로 기록.

### 제외

- F-2 파일 입력, F-3 Space 헤더, F-4 admin root, F-7 migration 문구, F-8 replay 크기.
- `<select>`를 custom listbox/combobox 또는 새 `@denn/ui` primitive로 교체.
- option 문구·순서·값, 첫 항목 자동 선택, 레거시 option disabled 의미 변경.
- C5 controller, load/save/CAS, Firebase facade, auth, lazy boundary, schema, Rules/config 변경.
- 앱 route/gate, 고객 앱, Space, Canvas, print/export, 발행, 실제 운영 연결.
- 신규 의존성, package/lockfile/workspace, 실제 network/Firebase/emulator/deploy.

## 대상 (WHERE)

### 제품·테스트 허용 파일

- `apps/admin/src/admin-write/FramePrintSizeEditor.tsx`
- `apps/admin/src/admin-write/FramePrintSizeEditor.test.tsx`
- `apps/admin/src/admin-write/frame-print-size-editor.css` (신규 후보)
- `tests/e2e/admin-write-editor.spec.ts`

CSS 파일을 새로 만들면 `FramePrintSizeEditor.tsx`에서 직접 import한다. 다른 app entry나 공유 theme에
selector를 추가하지 않는다.

### canonical 시각 근거 허용 파일

- `docs/rebuild/results/spec-084/operator-c5-editor-ready-clean-1280x800.png`
- `docs/rebuild/results/spec-084/operator-c5-editor-ready-clean-390x844.png`
- `docs/rebuild/results/spec-084/README.md` (F-5 해소 메모만)
- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`

`docs/rebuild/results/spec-084/measurements.json`은 전역 `*.json` ignore 대상이다. 검증에 사용하되 stage나
commit 대상으로 만들지 않는다. canonical 실행이 다른 tracked PNG를 다시 쓰면 인과를 확인하고,
위 두 장 외의 변경은 임의로 stage하지 말고 STOP 보고한다. 보호 spec-018 PNG는 절대 restore/stage하지
않는다.

### 상태·handoff 허용 파일

- 이 스펙
- `docs/handoff/2026-09-03-spec-086-admin-c5-select-accessibility-surface-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

## 구현 지시 (WHAT / HOW)

### 1. native select와 의미를 유지한다

- 현재 `<label htmlFor="frame-print-size-id">`와 `<select id="frame-print-size-id">` 연결을 유지한다.
- `data-testid`, `value`, `disabled`, `onChange`, option value/order/copy/disabled를 바꾸지 않는다.
- native `<select>`를 custom popover/listbox로 바꾸지 않는다.
- 첫 항목 자동 선택을 추가하지 않는다. 초기 value는 계속 빈 문자열이다.

### 2. 컴포넌트 전용 스타일만 추가한다

select에 의미가 드러나는 전용 class를 하나 부여한다. 권장 후보는
`denn-frame-print-size-editor__select`다.

전용 CSS는 다음을 만족해야 한다.

- `box-sizing: border-box`
- `min-height: 44px`
- `width: 100%`, `min-width: 0`, `max-width: 100%`
- padding, border, radius, background, text, font는 `var(--line)`, `var(--radius)`, `var(--surface)`,
  `var(--ink)`와 `font: inherit`을 사용한다.
- disabled는 `cursor: not-allowed`와 기존 UI와 일치하는 opacity 또는 muted 표현을 제공한다.
- `:focus-visible`은 인접 `TextField`와 같은 명확한 3px `var(--accent-ink)` outline 및 2px offset을
  사용한다.
- transition, animation, transform, 새 색상 literal, `!important`를 추가하지 않는다.
- global `select` selector, `@denn/ui/theme.css`, `apps/admin/src/space-v2/**`를 수정하지 않는다.

### 3. unit 계약을 좁게 고정한다

기존 SSR unit에 다음을 추가한다.

- label의 `for`와 select의 `id`가 계속 일치한다.
- 전용 class가 select에만 존재한다.
- auth-blocked에서는 같은 select가 disabled다.
- option 값·순서·legacy disabled와 no auto-selection 기존 단언은 유지한다.

CSS pixel 값은 SSR 문자열 unit으로 거짓 증명하지 않는다. 실제 높이·focus는 Chromium에서 검증한다.

### 4. Chromium 접근성·회귀를 검증한다

`tests/e2e/admin-write-editor.spec.ts`의 실제 제품 component fixture를 사용해 최소 다음을 검증한다.

1. `390x844`, `1280x800`에서 select bounding box 높이 `>= 44`.
2. select가 editor content box를 수평으로 넘지 않고 document horizontal overflow가 0.
3. Tab으로 select에 도달하며 focus indicator가 실제 computed style에서 보인다.
4. disabled 상태와 baseline load 후 enabled 상태 모두 스타일이 사라지지 않는다.
5. keyboard 또는 `selectOption`으로 A4/Blank를 선택할 때 기존 canonical prefill과 empty pair가 유지된다.
6. legacy option은 disabled, 자동 첫 선택 0, save call 0인 기존 계약을 유지한다.
7. axe serious/critical 0, console error/warning 0, pageerror 0, 외부 요청 0.

새 fixture, timeout 증가, retry, skip, screenshot tolerance는 추가하지 않는다.

### 5. canonical 근거를 갱신한다

전체 canonical E2E가 기존 spec 084 C5 캡처 두 장을 재생성하도록 둔다. 직접 별도 screenshot writer를
추가하지 않는다.

- 두 PNG를 직접 열어 select가 인접 TextField와 같은 form 계층으로 읽히는지 확인한다.
- `measurements.json`의 두 C5 항목에서 select 44px 미만 finding이 0인지 확인한다.
- audit report에 **F-5는 spec 086에서 해소됨**을 addendum으로 기록한다.
- F-6 철회와 F-8 재분류 문구는 되돌리지 않는다.

## 검증 절차 (VERIFY)

### 시작 전

- [ ] branch `rebuild/modern-studio`, 시작 `HEAD=origin=452c03b`, ahead/behind 0/0.
- [ ] staged 0, 기존 dirty와 보호 대상 식별. 수정·restore·checkout·stage 금지.
- [ ] 허용 파일 밖 제품 diff 0.

### targeted

- [ ] `pnpm exec vitest run apps/admin/src/admin-write/FramePrintSizeEditor.test.tsx`
- [ ] 두 viewport에서 select 높이 44px 이상, overflow/focus/axe/console/network 단언 PASS.

E2E orchestrator는 filter 인자를 지원하지 않고 임시 staging build를 소유하므로 직접 Playwright만
호출하지 않는다. 아래 canonical `node scripts/e2e-run.mjs`에서 신규 단언과 전체 회귀를 함께 검증한다.
실행 명령과 결과를 그대로 보고한다.

### 전체 gate

- [ ] `node scripts/check.mjs` PASS. format/lint/typecheck/unit/build의 실제 개수 기록.
- [ ] `node scripts/e2e-run.mjs` canonical Chromium 전체 PASS. passed/failed/skipped/retry 기록.
- [ ] 갱신된 C5 PNG 2장 직접 확인, 다른 spec-084 PNG 변경 0.
- [ ] `git diff --check` PASS.
- [ ] 고객 build entry hash가 기준과 동일함을 확인. admin bundle 변화는 파일명·bytes/gzip을 기록.
- [ ] `apps/mockup/**`, `packages/**`, package/lockfile/workspace, Rules/Firebase config diff 0.
- [ ] 실제 Firebase/network/emulator/deploy 0.
- [ ] 포트 `4183/4184/4185/8080/9099/9199`와 temp artifact 잔류 0.

### Git·완료

- [ ] 제품/test/허용 PNG commit과 문서 기록 commit을 분리한다.
- [ ] 일반 fast-forward push만 수행한다. force push, merge, rebase 금지.
- [ ] push 후 `HEAD=origin`, ahead/behind 0/0.
- [ ] 상태를 `READY_FOR_CODEX`, next `CODEX_SPEC_086_REVIEW`, fix_round 0으로 기록하고 멈춘다.

## 완료 정의 (DONE)

- C5 select가 두 viewport에서 44px 이상이고 Modern Studio token·focus·disabled 계약을 만족한다.
- 선택/legacy/read/save의 기존 의미가 바뀌지 않는다.
- targeted 및 전체 gate가 모두 PASS하고 외부 요청 0이다.
- 허용된 제품/test/C5 PNG/문서 외 committed diff가 없다.
- Codex 독립 검수 전에는 `DONE` 또는 `CODEX_PASSED`로 쓰지 않는다.

## 위험 (RISK)

- global selector를 쓰면 다른 native select까지 바뀐다. 전용 class로 차단한다.
- 높이만 늘리고 focus/disabled 대비를 놓치면 접근성 finding이 이동할 뿐 해소되지 않는다.
- canonical E2E는 보호 spec-018 PNG를 다시 쓸 수 있다. 해당 파일은 그대로 unstaged로 두며 restore하지
  않는다.
- 제품 route의 C5 gate는 여전히 off다. 이번 근거는 실제 제품 component + 합성 composition이고 운영
  Firebase 연결은 `NOT TESTED`다.

## 보호 대상

다음은 수정·삭제·restore·checkout·stage·commit하지 않는다.

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`
- `AGENTS.md`

## STOP 조건

- 새 제품 문구·custom select·공유 UI API·의존성이 필요함.
- C5 의미/controller/save/auth/Firebase 경계를 바꿔야 함.
- 허용 목록 밖 tracked 파일이 예상하지 않게 바뀜.
- 필수 gate가 flaky하거나 현재 범위에서 원인을 확정할 수 없음.
- 실제 network/Firebase/emulator/deploy 또는 사용자 결정이 필요함.

STOP 시 코드·commit·push를 멈추고 근거와 필요한 결정만 보고한다.

### DONE (Claude) — 스펙 086 구현·검증 (2026-09-03)

계약 작성 기준 `HEAD=origin=452c03b` → 계약 commit `d7408b2` → 제품/test/PNG `8c7b7ff` →
문서 commit은 이 갱신이다.
범위 밖 변경 0: `apps/mockup/**`·`packages/**`·package/lockfile/workspace·Rules/Firebase config diff
**0**, 실제 Firebase/network/emulator/deploy **0**, F-2·F-3·F-4·F-7·F-8·Space·고객 앱 수정 **0**,
다음 스펙 착수 **0**.

**구현 1 — native select를 유지했다.** `<label htmlFor="frame-print-size-id">`와
`<select id="frame-print-size-id">` 연결, `data-testid`, `value`, `disabled`, `onChange`, option
값·순서·문구·legacy disabled, 빈 초기값(첫 항목 자동 선택 0), C5 load/save/CAS 의미는 한 줄도 바뀌지
않았다. custom listbox/combobox로 바꾸지 않았고 **`appearance`도 재설정하지 않았다** — disclosure
arrow는 "이 컨트롤이 목록을 연다"는 유일한 시각 단서라, 지우면 결함이 방향만 바뀐다.

**구현 2 — 컴포넌트 전용 stylesheet.** 신규 `apps/admin/src/admin-write/frame-print-size-editor.css`를
`FramePrintSizeEditor.tsx`가 직접 import하고, select에 `denn-frame-print-size-editor__select` 한 개를
부여했다. 규칙은 `@denn/ui`의 `.denn-field__input`을 **그대로 따라간다**(재발명 아님):
`box-sizing: border-box`, `min-height: 44px`, `width: 100%` + `min-width: 0` + `max-width: 100%`,
`padding: 11px 13px`, `1px solid var(--line)`, `var(--radius)`, `var(--surface)`, `var(--ink)`,
`font: inherit` + `font-size: 14px`. `:focus-visible`은 인접 입력과 동일한 `3px solid var(--accent-ink)`
+ `outline-offset: 2px`, disabled는 Button·Chip과 같은 `cursor: not-allowed` + `opacity: 0.55`
(비색상 단서). transition·animation·transform·새 색상 literal·`!important` **0**, global `select`
selector **0**, `@denn/ui/theme.css`와 `apps/admin/src/space-v2/**` 수정 **0** — 발급 panel은 spec 083이
준 자기 규칙을 그대로 유지한다.

**unit(신규 2건, 총 2502).** ① label의 `for`와 select의 `id`가 일치하고 전용 class가 select에 붙는다
② 그 class가 페이지 markup에 **정확히 1회**만 나오고 인접 입력은 계속 `denn-field__input`을 쓴다.
auth-blocked 단언에는 "disabled select가 class를 그대로 유지한다"를 덧붙였다. CSS 픽셀 값은 SSR
문자열로 증명하지 않았다 — 높이·focus는 Chromium에서만 단언한다.

**Chromium(신규 2건, 총 220).** `tests/e2e/admin-write-editor.spec.ts`의 기존 제품 component fixture에
`390x844`·`1280x800` 두 건을 추가했다. 단언은 ① disabled/enabled 두 상태 모두에서 computed
`min-height` 44px·border·radius·배경 유지, disabled는 `not-allowed` + opacity < 1, enabled는
opacity 1 ② bounding box 높이 >= 44 ③ select 좌우가 `frame-print-size-editor` box 안, document
horizontal overflow 0 ④ Tab으로 실제 도달하고 computed outline이 3px·offset 2px로 그려짐
⑤ 자동 첫 선택 0·legacy option disabled·A4 canonical prefill(21 / 29.7)·Blank 빈 쌍·save call 0
⑥ 전용 class carrier 1개 ⑦ axe serious/critical 0·console error/warning 0·pageerror 0·외부 요청 0이다.
새 fixture·timeout 증가·retry·skip·screenshot tolerance 추가 **0**.

**axe scope 정정 1건(범위 안).** 처음에는 페이지 전체를 스캔해 두 건이 실패했다. 원인은 제품이 아니라
이 fixture의 진단 section이다 — `p[data-testid="fixture-status"]`와
`p[data-testid="fixture-expected-base"]`가 `--muted`(`#71717a`)를 페이지 배경 `--bg`(`#f4f4f5`) 위에
올려 대비 **4.39:1**(기준 4.5:1)로 `color-contrast` serious를 낸다. 스펙 084 §3이 "fixture control을
제품 결함으로 보고하는 것은 이 스펙이 없애려는 혼동 그 자체"라고 정하고 감사 자신도 axe 실행 전
`section[aria-label="합성 fixture 진단"]`을 숨긴다. 그래서 스캔을 제품 component
(`[data-testid="frame-print-size-editor"]`)로 **좁혔다** — 단언 자체는 그대로 0건 요구다. 제품 영역에는
위반이 없다.

**검증 실측.** `node scripts/check.mjs` **PASS**(format·lint·typecheck, unit **2502/2502** · 92 파일,
build 2개; 이전 2500 + 신규 2). canonical `node scripts/e2e-run.mjs` **Chromium 220 passed / 0 failed /
0 skipped / 0 retry**(이전 218 + 신규 2). `git diff --check` PASS. 포트 `4183/4184/4185/8080/9099/9199`
LISTENING **0**. `denn-e2e-*`·`playwright-report`·`debug.log` 잔류 **0**(Playwright의
`test-results/.last-run.json` 한 개는 `.gitignore:32`로 추적 대상이 아니다).

**bundle.** 고객 entry `index-eQgqaWiH.js` **341.94 kB / gzip 104.76** 및 CSS `index-CLxRhNtu.css`
**20.27 kB** — 파일명 해시까지 **무변경**(고객 앱 영향 0의 증명). 운영자 entry
`index-BeV6iIrs.js` 295.32 → `index-BWeRXD_J.js` **295.37 kB**(gzip 91.54 → 91.55), CSS
`index-CYneUH5V.css` 10.80 → `index-CCW8unbN.css` **11.24 kB**. 증가분은 이 stylesheet와 class 이름뿐이다.

**시각 근거.** canonical 실행이 `operator-c5-editor-ready-clean-{1280x800,390x844}.png` 두 장을 다시
썼고(별도 screenshot writer 추가 0) 두 장을 직접 열어 확인했다 — select가 아래 두 `TextField`와 같은
form 계층으로 읽히고 disclosure arrow가 남아 있다. sha256 `30ab97fe…` → `2f70c95e…`(1280x800),
`8d685ce5…` → `b9765d7c…`(390x844). **다른 tracked spec-084 PNG 변경 0**이다.
`measurements.json`(untracked)의 두 C5 항목은 `smallTargets` **0건**(감사 당시 `518x23` · `316x23`),
`horizontalOverflow` false, `axeSeriousCritical` 0이다.

**보호 대상.** design README·spec 038·`packages/render/src/plan/index.ts`·`pnpm-workspace.yaml`·
`AGENTS.md`·`taste-v2/**`는 시작/종료 hash 동일이고 restore·checkout·stage·commit **0**이다.
spec 018 PNG 2장은 canonical E2E가 다시 썼고 stage하지 않았다: desktop `a5dbdf93…` → `99e5e410…`
(이 파일의 실행 간 비결정성은 스펙 084 보완 라운드 1에서 이미 "결정화 대상 밖"으로 기록됐다),
mobile `6bdcb88c…` 무변경.

**NOT TESTED.** 제품 route의 C5 gate는 여전히 off다. 실기기 Safari/Android·200% zoom·preview channel·
실제 Firebase/network/emulator/deploy·운영 데이터는 이번에도 검증되지 않았다. 스펙 084의 다른 finding
(F-2·F-3·F-4·F-7)은 판정 그대로이고 F-6 철회·F-8 재분류도 그대로다.

상태 `READY_FOR_CODEX`, next `CODEX_SPEC_086_REVIEW`, fix_round 0에서 멈춘다. 다음 finding·다음 스펙은
시작하지 않았다.
