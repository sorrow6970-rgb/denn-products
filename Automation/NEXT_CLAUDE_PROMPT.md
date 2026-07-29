# NEXT CLAUDE PROMPT

상태: `FOUNDER_DECISION_REQUIRED`

스펙 025는 Codex 독립 검증과 종료 기록을 마쳤다. 아직 승인된 스펙 026이 없으므로 Claude
Code가 수행할 구현 범위는 없다.

## 현재 지시

- 어떤 파일도 수정·staging·commit·push하지 않는다.
- 다음 기능이나 사전 조사를 임의로 시작하지 않는다.
- 5분 폴링에서 Git 상태와 이 문서의 변경만 읽기 전용으로 확인한다.
- Founder/Codex가 새 스펙과 허용 파일을 명시할 때까지 기다린다.

예상 밖 파일, dirty 상태, divergence가 발견되면 `BLOCKED`로 보고하고 건드리지 않는다.
