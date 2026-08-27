# 스펙 082 shared Canvas plan executor boundary handoff

- 상태: `READY_FOR_CODEX / CORRECTION ROUND 1 DONE / NN-1=A / NON_UI / NO_LIVE_NETWORK` (보완 2026-08-27)
- 구현: 계약 문서 commit `aa7e048`, 제품 commit `307521f`
- 선행: spec 081 `DONE / CODEX_PASSED`
- spec: `docs/rebuild/specs/082-shared-canvas-plan-executor-boundary.md`
- 다음 transition: `CLAUDE_SPEC_082_IMPLEMENTATION`

## 목적

실제 admin Space V2 issue UI 전에, 고객 앱 내부에 있는 React 비의존 Canvas plan executor를
`@denn/render`의 단일 구현으로 옮긴다. mockup에는 thin re-export만 남겨 기존 caller와 검증을 유지한다.
admin UI, proof exporter, SDK composition은 이번 단위에 없다.

## 핵심 경계

- executor 의미·오류·preflight·save/restore·rotation/text 동작 변경 0
- cross-app import와 구현 복제 0
- `packages/render/src/plan/index.ts` 보호 파일 수정 0
- package/lockfile/Rules/firebase config 변경 0
- 실제 Firebase/network/live/deploy 0
- 전체 Chromium E2E는 local fixture만 사용

## 진행도

전체 리빌드 **84~87% 완료 / 13~16% 잔여**. 구조 선행 작업이므로 완료율은 올리지 않는다.

## 구현 결과 (2026-08-27, Claude Code)

계약 범위만 구현했다. 조항별 대조와 실측표는 스펙 082의 `### DONE (Claude) — 2026-08-27`이 정본이다.

- 신규 `packages/render/src/canvas/{types.ts, execute-preview-plan.ts, index.ts}` + `render/src/index.ts`
  export, `apps/mockup/src/canvas/{types.ts, executePreviewPlan.ts}`는 thin re-export, executor test는
  최소 변경 — 총 7개 파일뿐이다.
- executor 의미·오류·preflight·save/restore·rotation/text 동작 변경 **0**, cross-app import와 구현
  복제 **0**(테스트가 `toBe`로 같은 참조임을 고정), 보호 파일 `render/src/plan/index.ts` 수정 **0**,
  package/lockfile/Rules/firebase config 변경 **0**, 실제 Firebase/network/live/deploy **0**.
- **Tailwind drift 0** → `packages/ui/src/theme.css` 손대지 않음. bundle 변화는 mockup entry 하나
  (+5 bytes)이고 통제 빌드 대조로 minified 식별자 재배치임을 확인했다. admin 전체·CSS 2개는
  byte-identical이다.
- targeted executor **87/87**, typecheck 3개 PASS, 전체 `node scripts/check.mjs` PASS
  (unit **2409/2409**), `git diff --check` PASS, forbidden diff 0, EOL 3/3, 포트·temp 잔류 0.
- **전체 Chromium E2E는 158 passed / 1 failed다.** 실패는 스펙 082 원인이 아니며(HEAD로 되돌려도 동일
  재현) firebase/storage vendor chunk의 `_getAuthToken`이 마커 `getAuth`에 부분 일치한 것이다. 수정은
  스펙 082 허용 범위 밖이라 기록만 했고 **"전체 E2E PASS"라고 기록하지 않는다.**
- 실제 admin issue UI가 구현됐다고 기록하지 않는다. 다음은 Codex 검수(`CODEX_SPEC_082_REVIEW`)다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.

## Codex 독립 검수 (2026-08-27)

- `HEAD=origin=f8bb8e3`, ahead/behind 0/0. targeted executor **87/87**, 전체 check unit
  **2409/2409**, build 2개, diff/port gate PASS.
- 전체 Chromium은 **158/159**로 동일 재현. `getAuth` raw substring이 Storage vendor의
  `_getAuthToken`을 오인했으며 스펙 082 제품 회귀는 아니다. 다만 전체 E2E PASS도 아니다.
- `packages/render/src/index.ts`의 `RENDER_NOT_IMPLEMENTED`가 실제 Canvas executor export와 모순되는
  stale 문구도 확인했다.
- 최소 보완은 원래 허용 밖 test 파일을 필요로 해 Founder **NN-1** 범위 선택 대기다. 상태
  `FOUNDER_DECISION_REQUIRED`; correction과 admin UI/다음 스펙은 시작하지 않는다.

## Founder NN-1=A 승인 (2026-08-27)

- exact scope 확장 승인: `tests/e2e/admin-auth-read.spec.ts`, `packages/render/src/index.ts` 두 파일뿐이다.
- correction round 1에서 Storage `_getAuthToken` 오탐과 stale constant만 정정한다.
- 상태 `READY_FOR_CLAUDE`, next `CLAUDE_CORRECTION`. UI와 다음 스펙은 시작하지 않는다.

## 보완 라운드 1 — Founder NN-1=A (2026-08-27, Claude Code)

허용된 정확히 두 파일만 고쳤다. 상세 근거와 실측표는 스펙 082의
`### DONE (Claude) — 보완 라운드 1 (2026-08-27)`이 정본이다. 검수·NN-1 문서 commit `ecc9720`,
보완 commit `8d4458d`.

- **`tests/e2e/admin-auth-read.spec.ts`** — `getAuth`를 raw substring이 아니라 전체 식별자로 본다.
  079/080이 승인한 lazy `firebase/storage` 때문에 Storage SDK 내부 `_getAuthToken`이 걸린 오탐이었다.
  고객 staging 자산 raw 3 → 식별자 매치 **0**, 실제로 Auth를 쓰는 admin 번들 raw 9 → 매치 **6**으로
  실제 사용은 계속 전부 차단된다. 테스트 삭제·경계 약화 없음.
- **`packages/render/src/index.ts`** — `RENDER_NOT_IMPLEMENTED`가 같은 파일이 export하는 Canvas
  executor를 "이후 구현"이라 말하던 모순을 고쳐, 남은 미구현인 generic `RenderInput -> RenderOutput`
  facade만 가리키게 했다.
- 전체 `node scripts/check.mjs` PASS(unit **2409/2409**), **build 산출물 14개 모두 보완 전과
  byte+SHA-256 동일**, `git diff --check` PASS, 허용 외 diff 0, EOL clean, 포트·temp 잔류 0.
- **전체 Chromium E2E는 158 passed / 1 failed로 159/159가 아니다.** `getAuth`는 통과하고, 가려져 있던
  `uploadBytes` 등 6개 마커가 드러났다 — 5건은 storage vendor chunk의 dead export/오류 라벨 오탐,
  1건 `getStorage`는 스펙 079(MM-1=A)가 승인한 고객 자신의 호출이다. NN-1=A 범위 밖이라 고치지 않고
  기록만 했다.
- 다음은 Codex 재검수(`CODEX_SPEC_082_REVIEW`)다. 실제 admin issue UI와 다음 스펙은 시작하지 않았다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.
