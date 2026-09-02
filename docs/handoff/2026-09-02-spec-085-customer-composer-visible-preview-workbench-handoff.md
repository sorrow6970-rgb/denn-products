# Spec 085 handoff - customer composer visible-preview workbench

## 상태

- `READY_FOR_CLAUDE`
- 기준 `HEAD=origin=b86fd5cc3`, ahead/behind `0/0`
- active unit: `spec-085-customer-composer-visible-preview-workbench`
- next: `CLAUDE_SPEC_085_IMPLEMENT`
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
