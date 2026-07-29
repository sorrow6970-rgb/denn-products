# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` — 다음 작업 없음

# 대기: 스펙 028 사전 조사 검수 후 구현 스펙 지시 대기

스펙 028 사전 조사(템플릿 아트 Canvas 합성·CORS-clean 계약)는 읽기 전용으로 완료돼
push됐다. 산출물은
`docs/codex-claude-handoff/reviews/2026-07-29-template-art-canvas-cors-investigation.md`이며
Claude Code가 지금 수행할 작업 범위는 **없다.**

이 상태에서 Claude Code는 다음만 한다.

- `git fetch` 후 HEAD=origin, ahead/behind, working tree 상태 확인
- `Automation/DENN_AUTOMATION_STATE.md`, 이 파일, `docs/codex-claude-handoff/CURRENT.md` 재확인
- 상태 변화가 없으면 파일 수정·커밋·푸시 없이 보고만 한다

다음은 하지 않는다.

- 구현 스펙 028 작성 또는 기능 착수(템플릿 아트 decode·plan 어휘 확장·Canvas 합성 포함)
- `packages/render` command 어휘 확장(보고서 D-1·D-2는 Codex 결정 사항)
- 아트 로드 실패 정책·캐시 정책의 임의 확정(D-3·D-4·D-5는 Founder/Codex 결정 사항)
- Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live test, 이미지 다운로드, deploy
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

재개 조건: Codex가 조사 판정과 함께 구현 스펙 028 및 이 파일의 새 지시를 push하거나, Founder가
명시적으로 다음 작업을 지시한다.
