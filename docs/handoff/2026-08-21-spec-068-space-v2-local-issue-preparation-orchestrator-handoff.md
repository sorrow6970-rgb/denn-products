# 스펙 068 space V2 local issue preparation orchestrator handoff

- 상태: `READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `c8f54cf`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/068-space-v2-local-issue-preparation-orchestrator.md`

스펙 065 scene projector, 066 proof-byte candidate, 067 verified encryption candidate를 한 번의 local
snapshot-safe 흐름으로 조합한다. 성공 handle은 fresh proof descriptor, 동일 retained PNG bytes와 exact
encrypted document copies만 제공한다. plaintext scene/password/token은 반환하지 않는다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/issue-preparation.ts`와 해당 unit 두 개뿐이다. 기존
065·066·067 제품 코드, package/lockfile/CSS/config/Firebase/Rules는 변경하지 않는다.

정상 순서는 proof SHA #1 → scene evidence SHA #2 → document verify SHA #3 → encrypt #1이다. 모든 입력과
SHA/crypto method를 첫 await 전에 안정 snapshot하고, 하위 실패는 이후 단계를 0으로 막는다.

token/UUID 생성, upload, Firestore create, 실제 Firebase/network/UID/emulator/deploy와 viewer/UI는
금지다. Claude Code는 정본과 NEXT의 exact 범위만 구현·검증하고 제품·기록 commit을 일반 fast-forward
push한 뒤 `READY_FOR_CODEX`에서 멈춘다.
