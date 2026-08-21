# 스펙 071 space V2 local issue identity pair handoff

- 상태: `READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `3e0a91a`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/071-space-v2-local-issue-identity-pair.md`
- 결정: `docs/codex-claude-handoff/decisions/2026-08-21-space-v2-issue-identity-decisions.md`

Founder `HH-1=A`에 따라 proof assetId와 public link token을 독립 UUID 두 개로 만든다. required UUID
port method를 한 번 snapshot하고 assetId→token 순서로 각 한 번 호출한다. 둘이 같으면 retry 없이
collision으로 닫는다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/issue-identity-pair.ts`와 해당 unit 두 개뿐이다. 기존
064~070 제품 파일, package/lockfile/CSS/config/Firebase/Rules는 변경하지 않는다.

스펙 068 preparation 조합, upload, Firestore create, URL 발급, 실제 Firebase/network/UID/emulator/
deploy와 viewer/UI는 금지다. Claude Code는 정본과 NEXT의 exact 범위만 구현·검증하고 제품·기록
commit을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`에서 멈춘다.
