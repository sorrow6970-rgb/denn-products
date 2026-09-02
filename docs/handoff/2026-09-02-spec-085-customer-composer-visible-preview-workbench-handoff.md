# Spec 085 handoff - customer composer visible-preview workbench

## 상태

- `READY_FOR_CODEX` — 구현·검증 완료(2026-09-02), 결과는 아래 `구현 결과` 절
- 기준 `HEAD=origin=b86fd5cc3` → 계약 `a9e7528` → 제품/test `7351696`, ahead/behind `0/0`
- active unit: `spec-085-customer-composer-visible-preview-workbench`, fix_round `0`
- next: `CODEX_SPEC_085_REVIEW`
- 직전 spec 084: `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`

## Claude Code가 수행할 것

정본 `docs/rebuild/specs/085-customer-composer-visible-preview-workbench.md`를 처음부터 끝까지 읽고 그 범위만
구현·검증한다. 실제 UI/UX 구현은 Claude Code 담당이다.

핵심은 spec 084 P1 F-1 하나다.

- `<960px`: preview-first 단일 열.
- `>=960px`: 왼쪽 sticky preview + 오른쪽 controls.
- 액자 Canvas는 CSS만 줄이지 않고 실제 logical plan width를 viewport 높이까지 반영해 계산한다.
- 고객 shell은 composer 작업대만 1120px 폭을 활용하고 기존 선택 흐름은 최대 560px를 유지한다.
- 파일 입력 F-2, 고객 진단 F-7, Space/admin UI는 수정하지 않는다.

## 검증과 산출물

- unit/component와 실제 고객 `/` Chromium matrix 7개 viewport.
- 전체 `node scripts/check.mjs`, `node scripts/e2e-run.mjs`, `git diff --check`.
- spec 085 product-route PNG 3장과 README.
- canonical이 갱신하는 spec 084 composer PNG 3장/measurements 및 감사 보고서 F-1 addendum.
- bundle/hash, network 0, ports/temp, forbidden diff, 보호 hash를 보고한다.

제품/test commit과 문서 commit을 분리해 일반 fast-forward push하고 `READY_FOR_CODEX`, next
`CODEX_SPEC_085_REVIEW`에서 멈춘다. 다음 finding이나 다음 스펙은 시작하지 않는다.

## 보호 경계

spec의 허용 파일 밖 제품·test/config, `apps/admin/**`, `packages/**`, package/lockfile/workspace,
Rules/Firebase config, 실제 Firebase/network/emulator/deploy는 금지다.

다음과 기존 Founder/user dirty는 수정·삭제·restore·checkout·stage·commit하지 않는다.

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- spec 018 PNG 두 장
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`, `AGENTS.md`

## 구현 결과 — Claude Code (2026-09-02)

- 계약 문서 대행 commit `a9e7528`, 제품/test commit `7351696`, 문서 commit은 이 갱신이다(제품과 문서를
  분리했다). `apps/admin/**`·`packages/**`·package/lockfile/workspace·Rules/Firebase config diff **0**,
  실제 Firebase/network/emulator/deploy **0**, F-2·F-7·Space·운영자 UI 수정 **0**.
- **F-1 해소.** composer가 preview pane → controls pane 순서의 작업대가 됐다. `<960px` 한 열(미리보기
  먼저), `>=960px` 왼쪽 sticky preview + 오른쪽 controls, CSS `order` 미사용(시각 순서 = DOM·스크린리더
  순서). 고객 shell inner는 desktop 1120px, identity/status/선택 단계는 560px 중앙 정렬 유지.
- **Canvas 크기는 plan에서 정한다.** `resolveFramePreviewLogicalWidth`가 pane 폭·500px 상한·
  `floor(viewportHeight-96)` 예산을 함께 반영하고, 쓸 수 없는 입력·예산 부족·불변식 위반이면 `null`이다.
  CSS transform/`max-height` 축소는 쓰지 않아 스펙 022의 `CSS size == plan.logicalCanvas`가 유지된다.
  같은 fixture before → after: 390x844 액자 상단 page y **1620 → 973**, 1280x800 **1403 → 880**,
  844x390 Canvas **488x683 → 210x294**(예산 294 이하).
- **범위 안 잠재 결함 1건 수정.** `.denn-preview-edit__area`가 `display: block`이라 Canvas가 pane보다
  좁아지면 시계 overlay와 드래그 표면이 Canvas 옆으로 밀렸다 → `width: fit-content`로 기존 불변식 복원
  (`surface.css` layout selector 최소 변경, 시계·드래그 의미 무변경).
- **검증.** `node scripts/check.mjs` PASS(unit **2500/2500**, 92 파일, build 2개; 신규 unit 34).
  canonical `node scripts/e2e-run.mjs` **Chromium 218 passed / 0 failed / 0 skipped / 0 retry**
  (기존 203 + 신규 15). 기존 composer E2E 60건 핵심 단언은 무수정 PASS. `git diff --check` PASS,
  포트 4183/4184/4185/8080/9099/9199 및 temp/`test-results` 잔류 0.
- **증거.** `docs/rebuild/results/spec-085/` product-route PNG 3장 + README. 독립 실행에서 SHA-256 동일
  (`545ac7a2…`/`75d1a5a4…`/`8fb911d7…`). canonical이 spec 084 composer PNG 3장을 갱신했고, §1의 폭 변경
  때문에 **열거 밖인 `browse-ready-1280x800.png`도 함께 갱신**됐다(복원하지 않고 commit, Codex 판단 요청).
  `spec-084/measurements.json`은 `.gitignore`의 전역 `*.json`으로 tracked가 아니다.
- **bundle.** 고객 `index-CRHkWFoL.js` 340.60 kB → `index-eQgqaWiH.js` **341.94 kB**(+1.34), CSS 19.38 →
  **20.27 kB**. 운영자 entry 무변경 `index-BeV6iIrs.js` 295.32 kB `bdbc113a…`.
- **보호 대상.** design README·spec 038·`packages/render/src/plan/index.ts`·`pnpm-workspace.yaml`·
  `AGENTS.md`·`taste-v2/**` hash 동일, restore·checkout·stage·commit 0. spec 018 PNG는 canonical이 다시
  썼고 stage하지 않았다: desktop `ace8d75b…` → `d0a0aa52…`(같은 고객 shell을 1280px에서 찍어 §1의 폭
  변경이 나타난다), mobile `6bdcb88c…` 무변경.
- **NOT TESTED.** 실기기 Safari/Android/카카오 인앱·200% zoom·preview channel·실제 Firebase/network/
  emulator/deploy·운영 데이터. 스펙 084의 다른 finding은 판정 그대로다.
- 상태 `READY_FOR_CODEX`, next `CODEX_SPEC_085_REVIEW`. 다음 finding·다음 스펙은 시작하지 않았다.
  전체 진행도 **85~88% / 잔여 12~15%**(고객 composer 레이아웃 한 건이라 구간 변동 없음).
