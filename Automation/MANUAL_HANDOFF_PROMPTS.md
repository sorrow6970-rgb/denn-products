# DENN 수동 인수인계 고정 프롬프트

자동화나 반복 작업을 만들지 않고, Claude Code와 Codex 사이를 수동으로 인수인계할 때 아래 두 문장만 사용한다.

## 1. Claude Code에 작업을 시작시킬 때

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 명시된 범위만 수행해. 보호 대상은 건드리지 말고 자동화는 만들지 마. 완료 후 STATE/NEXT/CURRENT/live log를 실제 상태와 맞추고 결과를 보고해.
```

## 2. Claude Code 작업 완료 후 Codex에 검수를 요청할 때

```text
Claude 작업 완료. 최신 Git 상태와 live log를 읽기 전용으로 확인하고 검수한 뒤, 다음 Claude Code 지시를 Automation/NEXT_CLAUDE_PROMPT.md와 관련 상태 문서에 남겨줘. 자동화는 만들지 말고 commit/push도 하지 마.
```

## 운영 원칙

- 실제 작업 범위의 정본은 `Automation/NEXT_CLAUDE_PROMPT.md`다.
- Claude Code는 완료 시 `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`, `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`를 실제 상태와 일치시킨다.
- Codex는 검수와 다음 지시 작성만 수행하며, 사용자의 별도 요청 없이는 commit/push하지 않는다.
- 자동화, 예약 작업, 반복 폴링은 만들지 않는다.
