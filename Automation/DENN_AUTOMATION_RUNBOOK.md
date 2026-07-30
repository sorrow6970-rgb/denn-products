# DENN 보호형 자동 작업 루프

## 목적과 정본

이 문서는 DENN 프로젝트의 5분 폴링 기반 Claude Code ↔ Codex 작업 루프를 운영한다.
세부 허용 범위와 STOP 조건은
`docs/codex-claude-handoff/AUTO_REVIEW_LOOP.md`를 정본으로 참조하며, 충돌하면 사용자 최신
지시와 현재 승인 스펙이 우선한다.

- 감지: 실시간 파일 이벤트가 아닌 5분 주기 폴링
- 무변경: 파일 수정·커밋·푸시·반복 보고 없음
- 종료: 현재 파이프라인 `DONE` 또는 Founder의 명시적 중단
- 다음 스펙: 자동 생성·자동 착수 금지

## 역할과 쓰기 소유권

| 주체 | 역할 | Git 쓰기 |
|---|---|---|
| Founder | 제품·UX·정책·범위 결정, 예외 승인 | 명시적 지시 |
| Claude Code | 승인 스펙 구현, 자체 검증, 허용 파일 commit/push | `WAITING_FOR_CLAUDE`, `CLAUDE_WORKING`, `CORRECTION_REQUIRED`, `READY_FOR_COMMIT`에서만 |
| Codex | 실제 diff·코드·테스트·라이브 화면 독립 검증 | 검증 중 기능 코드 쓰기 금지. 승인/교정 프롬프트와 종료 문서만 명시 범위에서 작성 |

Codex와 Claude Code는 같은 저장소에서 동시에 Git 쓰기 작업을 하지 않는다.
현재 브랜치 `rebuild/modern-studio`에는 확정된 주체만 일반 fast-forward push할 수 있다.
force push, merge, rebase, `reset --hard`, checkout/restore를 이용한 사용자 변경 폐기는 자동
실행하지 않는다.

## 상태 기계

| 상태 | 소유자 | 허용 동작 | 다음 전이 |
|---|---|---|---|
| `WAITING_FOR_CLAUDE` | Claude | `NEXT_CLAUDE_PROMPT` 범위 착수 | `CLAUDE_WORKING` |
| `CLAUDE_WORKING` | Claude | 구현·자체 검증·허용 파일 commit/push | `READY_FOR_CODEX` |
| `READY_FOR_CODEX` | Codex | HEAD=origin, 0/0, clean 및 완료 기록 확인 | `CODEX_VERIFYING` |
| `CODEX_VERIFYING` | Codex | 읽기·실행 기반 독립 검증, 기능 코드 수정 금지 | pass/fix/decision/blocked |
| `CORRECTION_REQUIRED` | Claude | 지정 파일·재현 범위만 보완 | `CLAUDE_WORKING` |
| `FOUNDER_DECISION_REQUIRED` | Founder | 결정 대기, 저장소 쓰기 금지 | 결정에 따른 상태 |
| `BLOCKED` | 없음 | 원인 보고, 저장소 쓰기 금지 | 차단 해소 후 이전 안전 상태 |
| `CODEX_PASSED` / `READY_FOR_COMMIT` | 확정 주체 | 승인·종료 문서의 정확한 파일만 commit/push | `COMMITTED` |
| `COMMITTED` | Codex 확인 | commit hash, origin 일치, clean 확인 | `DONE` 또는 다음 명시 상태 |
| `DONE` | 없음 | 현재 파이프라인 종료 | 5분 루프 종료 |

## 폴링 절차

1. `git status --short --branch`, HEAD/origin, ahead/behind를 읽는다.
2. `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`,
   `docs/codex-claude-handoff/CURRENT.md`를 읽는다.
3. local ahead, staged 또는 Claude 진행 기록이 있으면 `CLAUDE_WORKING`으로 보고 Codex는
   쓰지 않는다. dirty 파일만으로 Claude 작업 중이라고 추정하지 않는다. 직전 Codex 검증이
   만든 것으로 경로와 원인이 확인된 산출물은 상태에 별도로 기록하고
   `CORRECTION_REQUIRED` 또는 `BLOCKED`로 전이한다.
4. 새 push가 있고 HEAD=origin, 0/0, clean이면 `READY_FOR_CODEX`로 전이한다.
5. Codex는 diff와 허용 파일을 대조하고 스펙별 게이트를 독립 실행한다.
6. 결과를 PASS, NOT TESTED, CORRECTION_REQUIRED, FOUNDER_DECISION_REQUIRED 또는 BLOCKED로
   구분한다.
7. 승인 후 확정 주체가 종료 문서를 commit/push하고 Codex가 `COMMITTED`를 확인한다.

상태 문서가 실제 Git 상태 또는 최신 Codex 판정과 어긋나면 반복 대기하지 않는다. Codex가
기능 코드를 건드리지 않는 범위에서 `DENN_AUTOMATION_STATE.md`와
`NEXT_CLAUDE_PROMPT.md`를 최신 안전 상태로 교정하고, 그 자동화 문서만 별도 commit/push한다.
Claude는 다음 폴링에서 해당 전이를 읽고 수행한다.

## 필수 안전 규칙

- 예상하지 않은 수정·미추적 파일은 사용자 소유로 간주하고 건드리지 않는다.
- stale lock을 임의 삭제하지 않는다.
- 허용 파일과 실제 변경 파일이 정확히 일치해야 한다.
- lint, typecheck, unit, build, E2E, `git diff --check`를 서로 구분해 기록한다.
- 실행하지 않은 항목은 PASS가 아니라 `NOT TESTED`로 기록한다.
- 라이브 검증은 실제 렌더 화면을 관찰했을 때만 PASS다. 목업·정적 추론은 대체하지 못한다.
- Founder 결정이 필요한 정책·UX·범위를 AI가 임의 확정하지 않는다.
- Firebase/Rules/CORS/Hosting, 실제 network/live, 운영 데이터·secret, 배포는 스펙과 Founder
  승인이 없으면 즉시 중단한다.
- 검증이 생성한 추적 산출물도 자동 폐기하지 않는다. 소유와 원인이 확정되고 Founder가
  정확한 파일의 복원을 승인한 경우에만 해당 파일 하나를 복원한다.
- `hosting.public: "."`가 격리되기 전 Firebase Hosting 배포는 금지한다.

## 기록 위치

- 상태: `Automation/DENN_AUTOMATION_STATE.md`
- Claude 다음 범위: `Automation/NEXT_CLAUDE_PROMPT.md`
- 현재 프롬프트 실행 기록: `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- 마감 단위 상세 인계: `docs/handoff/`
- 기존 상세 인계: `docs/YYYY-MM-DD-*-handoff.md`도 이동 없이 유지

## Claude loop 시작 명령

```text
/loop 5m Automation/DENN_AUTOMATION_RUNBOOK.md,
Automation/DENN_AUTOMATION_STATE.md,
Automation/NEXT_CLAUDE_PROMPT.md를 읽고 상태 기계대로 진행해.
CORRECTION_REQUIRED는 허용 범위만 보완하고,
BLOCKED·FOUNDER_DECISION_REQUIRED에서는 어떤 파일도 수정·커밋·푸시하지 말고 감시만 유지해.
READY_FOR_CODEX에서는 추가 쓰기 없이 Codex 독립 검증을 기다려.
DONE 또는 Founder가 명시적으로 중단할 때만 loop를 종료해.
사용자 소유 파일과 예상 밖 미추적 파일은 건드리지 마.
```

## 최종 무변화·정지 보고 규칙 (2026-07-30)

- 상태·HEAD·ahead/behind·dirty 경로·감시 문서 fingerprint가 30분 동안 전혀 바뀌지 않으면
  Codex heartbeat와 Claude loop는 실제 `PAUSED`/중단 상태로 전환한다.
- 일시정지 전에 사용자에게 다음 다섯 항목을 한 번 반드시 보고한다.
  1. 멈춘 정확한 이유
  2. 확인 근거와 마지막 Git 상태
  3. 자동 해결 가능 여부
  4. 권장 다음 단계
  5. 그대로 붙여넣을 수 있는 정확한 다음 작업 또는 재개 프롬프트
- Claude loop 미실행처럼 기대한 전이가 한 주기 안에 발생하지 않으면 30분을 기다리지 않고
  즉시 같은 형식으로 한 번 보고한다.
- 동일 정지 원인이 유지되는 동안 반복 알림하지 않는다.
- `PAUSED` 이후 자동 감시는 실행되지 않으며 사용자 재개 지시가 있어야 다시 활성화한다.
