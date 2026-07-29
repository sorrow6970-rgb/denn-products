# NEXT CLAUDE PROMPT

상태: `COMMITTED` — 다음 작업 없음

# 대기: 스펙 027 종료 확인 후 다음 스펙 지시 대기

스펙 027(고객 상품 미리보기 composer 연결)은 Codex 승인 기준 HEAD `06d9700`으로 승인됐고
종료 문서까지 commit·push됐다. Claude Code가 지금 수행할 작업 범위는 **없다.**

이 상태에서 Claude Code는 다음만 한다.

- `git fetch` 후 HEAD=origin, ahead/behind, working tree 상태 확인
- `Automation/DENN_AUTOMATION_STATE.md`, 이 파일, `docs/codex-claude-handoff/CURRENT.md` 재확인
- 상태 변화가 없으면 파일 수정·커밋·푸시 없이 보고만 한다

다음은 하지 않는다.

- 새 스펙 작성 또는 다음 기능 착수(template art, Firebase image CORS-clean 합성,
  pointer/pan/zoom, 회전, text/clock/watermark, print/export, 저장·주문·카카오 포함)
- Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live test, deploy
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

재개 조건: Codex가 `DONE` 전이와 함께 새 스펙 및 이 파일의 새 지시를 push하거나, Founder가
명시적으로 다음 작업을 지시한다.
