# Spec 083 handoff - Admin Space V2 issue UI

## 현재 상태

- baseline: `HEAD=origin=ba9eb48`, ahead/behind 0/0
- completed: spec 082 `DONE / CODEX_PASSED`
- active: spec 083 `READY_FOR_CLAUDE`
- Founder: `OO-1=A`
- 전체 리빌드: **84~87% 완료 / 13~16% 잔여**. 이번 계약 문서만으로 수치는 올리지 않는다.

## Claude Code가 구현할 것

`docs/rebuild/specs/083-admin-space-v2-issue-ui.md`만 구현 정본으로 사용한다.

- existing authenticated C5 `ready-clean` baseline에서만 draft 시작
- PNG-only local owner와 실제 Canvas preview
- 같은 frozen generation의 fields + exact PNG exporter
- 기존 default app/Auth 재사용, 별도 exact gate default false, writer first issue까지 lazy
- password pair, single-flight, safe status/error, outcome unknown 차단
- confirmed success에서만 same-origin `?space=<token>`, 명시 copy만
- synthetic unit/E2E와 시각 결과. actual Firebase/network/emulator/deploy는 0

UI/UX 구현은 Claude Code가 담당한다. 기존 Modern Studio light 제품 UI를 보존하고 새 디자인 시스템,
landing-page 장식, 신규 dependency를 도입하지 않는다.

## 계속 닫힌 경계

실제 UID, live project/bucket/data/network, Rules·Hosting deploy, 운영 발급, publish, orphan cleanup,
password 저장·URL/자동 clipboard 포함, auto retry/merge, V1 migration, C6/backend는 승인되지 않았다.

보호 대상과 기존 dirty 파일은 수정·복원·stage·commit하지 않는다. 전체 Chromium이 spec-018 PNG를 다시
쓰더라도 그대로 둔다.

## 전달 문구

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 083 Admin Space V2 발급 UI 범위만 구현·검증해. 실제 UI/UX 구현은 Claude Code가 담당하고, actual Firebase/network/emulator/deploy는 실행하지 마.
```

완료 후 제품 commit과 기록 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. Codex
독립 검수 전 다음 스펙을 시작하지 않는다.

## 구현 완료 — Claude Code (2026-08-28)

- `HEAD=origin=ba9eb48`에서 시작. 계약 `fbf60cc`, Q-1 기록 `977af5c`, 구현 `1a7cba9`.
- **Q-1=A**: `apps/admin/package.json` 1줄 + `pnpm-lock.yaml` 3줄만 추가(`corepack pnpm install
  --offline`, downloaded 0/added 0). `pnpm-workspace.yaml`은 sha256 그대로이고 stage/commit 0.
- 신규 제품 파일: `space-v2/issue-composition.ts`(gate·lazy writer·plan helper·link),
  `space-v2/browser-proof-draft.ts`(PNG-only owner), `space-v2/AdminSpaceV2IssuePanel.tsx`,
  `space-v2/admin-space-v2-issue.css`. 수정: `App.tsx`, `admin-composition/create.ts`,
  `admin-read/config.ts`, `env.d.ts`, `vite.e2e-fixture.config.ts`.
- 신규 검증: 세 unit 파일(+49 test), `tests/e2e/admin-space-v2-issue.spec.ts`(16), E2E fixture 2개,
  `docs/rebuild/results/spec-083/` desktop·mobile 스크린샷 2장(직접 확인함).
- **실측**: `node scripts/check.mjs` PASS(unit **2458/2458**, 92 파일), canonical E2E **Chromium
  177/177**, `git diff --check` PASS, 포트·temp 잔류 0, 실제 Firebase/network/emulator/deploy 0.
- **bundle**: 고객 entry 해시 무변경(`index-CRHkWFoL.js` 340.60 kB), admin entry 226.20 → 294.61 kB
  (gzip 71.75 → 91.35), admin CSS 9.14 → 10.80 kB, write facade는 lazy `space-write-*.js` 8.47 kB로
  분리 — write SDK eager 포함 없음.
- **⚠️ 스펙 밖 변경 1건**: `issue-candidate.test.ts`의 `not.toContain("space-v2")` 단언을
  `not.toContain("issue-candidate")`로 좁혔다. 스펙이 요구한 `App.tsx` 배선과 동시에 성립 불가한
  단언이고 test의 원래 의도는 유지된다. Codex 판단을 요청한다.
- 상태 `READY_FOR_CODEX`, fix_round **0**, next `CODEX_SPEC_083_REVIEW`. 다음 스펙은 시작하지 않았다.
- 전체 리빌드 진행도 **85~88% 완료 / 12~15% 잔여**.
