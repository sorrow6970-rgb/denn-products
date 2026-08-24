# 스펙 073 space V2 persistence boundary 조사 handoff

- 상태: `READY_FOR_CLAUDE / DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI`
- 기준 HEAD=origin: `452cc1a`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md`
- 산출물: `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md`

스펙 072 local bundle 다음의 asset upload·`spaces/{token}` create·outcome unknown·reconciliation·orphan
경계를 조사한다. 현재 Rules와 설치 SDK, 기존 admin-write/space-read를 읽기만 한다.

제품 코드/test/Rules/config/package/lockfile, 실제 Firebase/network/emulator/deploy/UI는 변경·실행하지
않는다. 조사 보고서와 상태 문서만 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다.
