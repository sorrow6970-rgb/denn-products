# Spec 086 handoff - admin C5 select accessibility surface

## 상태

- `READY_FOR_CODEX` — 구현·검증 완료(2026-09-03), 결과는 아래 `구현 결과` 절
- 기준 `HEAD=origin=452c03b` → 계약 `d7408b2` → 제품/test/PNG `8c7b7ff`, ahead/behind `0/0`
- active unit: `spec-086-admin-c5-select-accessibility-surface`, fix_round `0`
- next: `CODEX_SPEC_086_REVIEW`
- 직전 완료: spec 085 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`

## Claude Code가 수행할 것

정본 `docs/rebuild/specs/086-admin-c5-select-accessibility-surface.md`를 처음부터 끝까지 읽고 그 범위만
구현·검증한다. 실제 UI 구현은 Claude Code 담당이다.

- spec 084 F-5 하나만 처리한다.
- C5의 native select 의미를 유지하면서 component 전용 CSS로 44px, Modern Studio token,
  focus-visible, disabled, overflow 계약을 맞춘다.
- 기존 `label/id`, option 순서·값, no auto-selection, legacy disabled, canonical prefill,
  C5 save/CAS 의미는 바꾸지 않는다.
- 새 custom select, `@denn/ui` API, dependency, global selector는 만들지 않는다.

## Codex 선정 결과

- F-6은 철회한다. 편집기 root는 이미 `<Card>`다.
- F-8은 fixture가 선언한 logical size를 측정한 것이므로 UI 결함으로 확정하지 않는다. replay size는
  별도 Founder 제품 결정이다.
- F-2/F-3/F-4/F-7은 이번에 묶지 않는다.

## 검증과 산출물

- unit: 전용 class, label/id, disabled, option/no-auto-select/legacy 계약.
- Chromium: 390x844·1280x800에서 44px, overflow 0, Tab focus, axe, console/pageerror/network 0.
- 전체 `node scripts/check.mjs`, `node scripts/e2e-run.mjs`, `git diff --check`.
- spec 084 C5 PNG 두 장만 갱신하고 직접 확인한다. `measurements.json`은 ignored 검증 근거일 뿐 stage 0.
- 고객 bundle hash 불변, admin bundle 변화, forbidden diff, 포트/temp를 보고한다.

제품/test/PNG commit과 문서 commit을 분리해 일반 fast-forward push하고 `READY_FOR_CODEX`, next
`CODEX_SPEC_086_REVIEW`에서 멈춘다. 다음 finding이나 스펙을 시작하지 않는다.

## 금지·보호

실제 Firebase/network/emulator/deploy, Rules/config, package/lockfile/workspace, 고객 앱, Space, C5 저장
의미 변경은 금지다. 다음 기존 Founder/user dirty와 보호 대상은 수정·복원·stage·commit하지 않는다.

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- spec 018 PNG 두 장
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`, `AGENTS.md`

## 구현 결과 (2026-09-03)

- 계약 `d7408b2`, 제품/test/PNG `8c7b7ff`, 문서 commit은 이 갱신이다(제품과 문서를 분리했다).
  `apps/mockup/**`·`packages/**`·package/lockfile/workspace·Rules/Firebase config diff **0**, 실제
  Firebase/network/emulator/deploy **0**, F-2·F-3·F-4·F-7·F-8·Space·고객 앱 수정 **0**.
- **F-5 해소.** `액자 사이즈` select가 컴포넌트 전용 stylesheet
  (`apps/admin/src/admin-write/frame-print-size-editor.css`, 클래스
  `denn-frame-print-size-editor__select`)로 인접 `TextField`와 같은 표면을 갖는다 — `min-height: 44px`,
  `width: 100%`, `1px var(--line)`, `var(--radius)`, `var(--surface)`, `var(--ink)`, `font: inherit`,
  `:focus-visible` 3px `var(--accent-ink)` + offset 2px, disabled `not-allowed` + `opacity: .55`.
- **native select 유지.** custom listbox 교체 0, **`appearance` 재설정 0**(disclosure arrow는 목록이
  열린다는 유일한 시각 단서다). label/id·`data-testid`·option 값/순서/문구·legacy disabled·빈 초기값·
  C5 load/save/CAS 의미 무변경. global `select` selector 0, `@denn/ui`·`space-v2/**` 수정 0.
- **검증.** `node scripts/check.mjs` PASS(unit **2502/2502**, 92 파일, build 2개; 신규 unit 2).
  canonical `node scripts/e2e-run.mjs` **Chromium 220 passed / 0 failed / 0 skipped / 0 retry**
  (기존 218 + 신규 2). `git diff --check` PASS, 포트 4183/4184/4185/8080/9099/9199 및 temp 잔류 0.
- **axe scope 정정(범위 안).** 페이지 전체 스캔은 fixture 진단 section(`fixture-status`,
  `fixture-expected-base`, `--muted` on `--bg`, 대비 4.39:1)의 `color-contrast` serious 때문에 실패한다.
  스펙 084 §3의 "fixture control을 제품 결함으로 보고하지 않는다"와 감사 자신의 chrome 숨김 처리에
  맞춰 스캔을 `[data-testid="frame-print-size-editor"]`로 좁혔다. 단언은 그대로 0건 요구다.
- **bundle.** 고객 entry `index-eQgqaWiH.js` 341.94 kB·CSS `index-CLxRhNtu.css` 20.27 kB — 파일명
  해시까지 **무변경**. 운영자 `index-BeV6iIrs.js` 295.32 → `index-BWeRXD_J.js` **295.37 kB**, CSS
  10.80 → **11.24 kB**.
- **증거.** canonical이 C5 PNG 두 장을 다시 썼고 직접 확인했다: `30ab97fe…` → `2f70c95e…`(1280x800),
  `8d685ce5…` → `b9765d7c…`(390x844). **다른 tracked spec-084 PNG 변경 0**.
  `measurements.json`(untracked)의 두 C5 항목은 `smallTargets` 0건(감사 당시 518x23 · 316x23),
  overflow false, axe serious/critical 0이다.
- **보호 대상.** design README·spec 038·`packages/render/src/plan/index.ts`·`pnpm-workspace.yaml`·
  `AGENTS.md`·`taste-v2/**` hash 동일, restore·checkout·stage·commit 0. spec 018 PNG는 canonical이 다시
  썼고 stage하지 않았다(desktop `a5dbdf93…` → `99e5e410…` — 기존 비결정성, mobile `6bdcb88c…` 무변경).
- **NOT TESTED.** 제품 route의 C5 gate는 여전히 off. 실기기·200% zoom·preview channel·실제
  Firebase/network/emulator/deploy·운영 데이터. 스펙 084의 다른 finding 판정은 그대로다.
- 상태 `READY_FOR_CODEX`, next `CODEX_SPEC_086_REVIEW`, fix_round 0. 다음 finding·다음 스펙은 시작하지
  않았다.
