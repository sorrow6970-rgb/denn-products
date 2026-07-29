# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
기준 후보: 보완 라운드 1 push 결과 (코드 `d4fb99b` + 문서 커밋)
보완 라운드: `1 / 3`

# 대기: 스펙 028 보완 라운드 1 재검증

Codex 지적 2건(art source 1회 snapshot, placement 전체 1회 snapshot)은 지정된 허용 파일
안에서만 보완해 push했다. Claude Code가 지금 수행할 작업 범위는 **없다.**

이 상태에서 Claude Code는 다음만 한다.

- `git fetch` 후 HEAD=origin, ahead/behind, working tree 상태 확인
- `Automation/DENN_AUTOMATION_STATE.md`, 이 파일, `docs/codex-claude-handoff/CURRENT.md` 재확인
- 상태 변화가 없으면 파일 수정·커밋·푸시 없이 보고만 한다

다음은 하지 않는다.

- 새 기능·정책 변경·의존성 추가
- legacy builder crop 지원, builtin multi-zone, text/clock, pointer, print/export, 저장·주문
- Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live test, 운영 이미지 다운로드, deploy
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

재개 조건: Codex가 재검증 결과(`CODEX_PASSED` 또는 새 `CORRECTION_REQUIRED`)와 이 파일의 새
지시를 push하거나, Founder가 명시적으로 다음 작업을 지시한다.
