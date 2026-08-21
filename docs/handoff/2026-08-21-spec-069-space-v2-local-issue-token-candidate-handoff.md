# 스펙 069 space V2 local issue token candidate handoff

- 상태: `READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `215af5b`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/069-space-v2-local-issue-token-candidate.md`

Founder `GG-1=A`의 새 UUID token을 Firebase보다 먼저 local 생성 결과 경계로 분리한다. 필수 주입 UUID
port의 method를 한 번 snapshot하고 최대 한 번 호출해 lowercase UUID v4만 성공으로 반환한다. invalid
port/output과 throw는 safe code로 닫으며 retry와 global random fallback은 없다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/issue-token-candidate.ts`와 해당 unit 두 개뿐이다.
기존 064~068 제품 파일, package/lockfile/CSS/config/Firebase/Rules는 변경하지 않는다.

token↔assetId 관계, 스펙 068과의 조합, upload, Firestore create, URL 발급, 실제 Firebase/network/UID/
emulator/deploy와 viewer/UI는 금지다. Claude Code는 정본과 NEXT의 exact 범위만 구현·검증하고 제품·기록
commit을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`에서 멈춘다.
