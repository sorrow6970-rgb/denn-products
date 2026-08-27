# 스펙 082 shared Canvas plan executor boundary handoff

- 상태: `READY_FOR_CODEX / IMPLEMENTED / LOCAL_VERIFIED / NON_UI / NO_LIVE_NETWORK` (구현 2026-08-27)
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
