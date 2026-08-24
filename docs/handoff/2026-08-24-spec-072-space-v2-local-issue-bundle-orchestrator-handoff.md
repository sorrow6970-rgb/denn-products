# 스펙 072 space V2 local issue bundle orchestrator handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `452cc1a`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/072-space-v2-local-issue-bundle-orchestrator.md`

스펙 071의 독립 assetId·token pair를 먼저 만들고, assetId를 스펙 068 local preparation에 전달해
token·proof descriptor·동일 PNG bytes·encrypted document를 한 handle로 준비한다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/issue-bundle.ts`와 unit 두 개뿐이다. 기존 spec064~071,
package/lockfile/CSS/Firebase/Rules/config는 변경하지 않는다.

Storage upload, Firestore create, URL 발급, 실제 Firebase/network/UID/emulator/deploy와 viewer/UI는
계속 금지다. Claude Code는 정본과 NEXT의 exact 범위만 구현·검증하고 제품·기록 commit을 일반
fast-forward push한 뒤 `READY_FOR_CODEX`에서 멈춘다.

Codex가 구현 `34cca25`을 독립 검수했다. targeted 58/58, 확대 513/513, check(unit 2084/2084),
Chromium 151/151, bundle identity, diff/포트/temp/staged 게이트가 모두 PASS했고 추가 결함은 없다.
최종 `CODEX_PASSED / DONE`이다. 후속은 스펙 073 persistence boundary 문서 조사이며 실제 쓰기는
계속 열지 않는다.
