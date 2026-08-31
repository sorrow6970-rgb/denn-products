# Spec 084 handoff - local visual readiness audit

## 상태

- `READY_FOR_CLAUDE`
- active unit: `spec-084-local-visual-readiness-audit`
- 기준: `HEAD=origin=94db3e27ec489315b93dbb8429ff93b975ad217f`, ahead/behind `0/0`
- 직전 완료: spec 083 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- next: `CLAUDE_SPEC_084_AUDIT`

## 목적

현재 고객·운영자 화면의 local Chromium 시각 증거를 같은 기준으로 수집하고, 제품 route와 합성 fixture를
구분한 감사 보고서를 만든다. 이 단위에서는 제품 UI/CSS를 수정하지 않는다.

## 직접 확인된 출발점

- spec 018, 063, 080 결과는 고객 제품 화면 증거다.
- spec 083 결과는 실제 제품 panel을 사용하지만 full-page PNG에 fixture 제목·진단·제어 UI가 함께 있다.
  최종 운영자 시각 승인 자료가 아니므로 spec 084에서 제품 panel locator 증거를 별도로 만든다.
- 고객 composer, 운영자 shell/editor/error state를 한 provenance 표로 비교하는 결과가 아직 없다.

## Claude Code 실행 범위

정본 `docs/rebuild/specs/084-local-visual-readiness-audit.md`를 그대로 따른다.

허용되는 비문서 변경은 신규 `tests/e2e/local-visual-readiness.spec.ts`와
`docs/rebuild/results/spec-084/**`뿐이다. 제품 source/CSS, 기존 test/config/script, package/lockfile,
Rules/Firebase config는 수정하지 않는다.

각 PNG에 `PRODUCT_ROUTE`, `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`, `FIXTURE_CONTROL_ONLY` provenance를
붙이고, fixture를 제품 route라고 부르지 않는다. P0/P1/P2 finding은 기록만 하며 고치지 않는다.

## 검증 및 종료

- `node scripts/check.mjs`
- `node scripts/e2e-run.mjs`
- `git diff --check`
- forbidden diff, bundle hash, 포트/temp, 보호 hash 확인

완료 시 구현·결과 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. Codex 검수 전 제품
UI 보완, 실제 기기·Firebase/network/emulator/deploy, 다음 스펙을 시작하지 않는다.

## 보호·기존 dirty

다음은 수정·삭제·restore·checkout·stage·commit하지 않는다.

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- spec 018 PNG 두 장
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`, `AGENTS.md` 및 기타 기존 Founder/user dirty

