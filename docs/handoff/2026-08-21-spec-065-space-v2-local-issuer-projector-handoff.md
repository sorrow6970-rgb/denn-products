# 스펙 065 space V2 local issuer projector handoff

- 상태: `READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD: `dcd893c`
- 정본: `docs/rebuild/specs/065-space-v2-local-issuer-projector.md`

스펙 064의 strict V2 evidence 계약을 admin composition에서 호출하는 첫 local-only projector다.
validated catalog projection + explicit orientation/appearance/transform/proof descriptor만 조립하고,
text/clock/template art와 malformed input은 SHA-256 전에 fail-closed한다.

허용 제품 변경은 신규 `apps/admin/src/space-v2/issue-candidate.ts`, 신규 unit, admin의 기존 workspace
`@denn/spaces` dependency와 lock importer 최소 변경뿐이다. `App.tsx`, UI/CSS, Firebase/Rules/config,
shared/spaces 제품 파일은 변경하지 않는다.

이번 단위는 token/encryption/upload/Firestore create/link 발급 또는 viewer 연결이 아니다. 실제
Firebase/network/UID/emulator/deploy는 계속 금지다.

Claude Code는 `Automation/NEXT_CLAUDE_PROMPT.md`와 정본을 읽고 허용 범위만 구현·검증한 뒤
STATE/NEXT/CURRENT/live log를 실제 상태에 맞춘다. 완료 상태는 `READY_FOR_CODEX`이며 다음 스펙은
시작하지 않는다.

