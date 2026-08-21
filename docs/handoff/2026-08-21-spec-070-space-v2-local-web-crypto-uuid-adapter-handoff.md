# 스펙 070 space V2 local Web Crypto UUID adapter handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `3e0a91a`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/070-space-v2-local-web-crypto-uuid-adapter.md`

스펙 069의 필수 UUID port에 표준 `Crypto.randomUUID()` source를 연결하는 local adapter다. source
method를 factory에서 한 번 snapshot하고 receiver를 보존한다. 형식 검증과 throw/output 매핑은 기존
token candidate가 담당하며 adapter는 retry·repair·자체 UUID 조립을 하지 않는다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/issue-uuid-adapter.ts`와 해당 unit 두 개뿐이다. 기존
064~069 제품 파일, package/lockfile/CSS/config/Firebase/Rules는 변경하지 않는다.

token↔assetId 관계, issue bundle orchestration, upload, Firestore create, URL 발급, 실제 Firebase/network/
UID/emulator/deploy와 viewer/UI는 금지다. Claude Code는 정본과 NEXT의 exact 범위만 구현·검증하고
제품·기록 commit을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`에서 멈춘다.

Codex가 구현 `ff3c59a`를 독립 검수했다. 허용 제품 diff 2개가 정확하고 targeted 21/21,
space-v2+spaces 426/426, unit 1997/1997, Chromium 151/151, bundle identity, diff/포트/temp 게이트가
모두 PASS했다. 최종 판정은 `CODEX_PASSED / DONE`이다.

후속 Founder `HH-1=A` 승인으로 token과 assetId는 독립 UUID 두 개로 확정됐다. 다음 구현은 별도
스펙 071의 local-only 범위에서만 진행한다.
