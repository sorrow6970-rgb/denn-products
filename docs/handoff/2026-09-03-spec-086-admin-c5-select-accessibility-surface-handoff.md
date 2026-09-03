# Spec 086 handoff - admin C5 select accessibility surface

## 상태

- `READY_FOR_CLAUDE / CONTRACT_ONLY / NO_LIVE_NETWORK`
- 기준 `HEAD=origin=452c03b`, ahead/behind `0/0`
- active unit: `spec-086-admin-c5-select-accessibility-surface`
- next: `CLAUDE_SPEC_086_IMPLEMENT`
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
