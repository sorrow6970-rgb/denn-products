# 스펙 070 space V2 local Web Crypto UUID adapter handoff

- 상태: `READY_FOR_CLAUDE / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `020402c`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/070-space-v2-local-web-crypto-uuid-adapter.md`

스펙 069의 필수 UUID port에 표준 `Crypto.randomUUID()` source를 연결하는 local adapter다. source
method를 factory에서 한 번 snapshot하고 receiver를 보존한다. 형식 검증과 throw/output 매핑은 기존
token candidate가 담당하며 adapter는 retry·repair·자체 UUID 조립을 하지 않는다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/issue-uuid-adapter.ts`와 해당 unit 두 개뿐이다. 기존
064~069 제품 파일, package/lockfile/CSS/config/Firebase/Rules는 변경하지 않는다.

token↔assetId 관계, issue bundle orchestration, upload, Firestore create, URL 발급, 실제 Firebase/network/
UID/emulator/deploy와 viewer/UI는 금지다. Claude Code는 정본과 NEXT의 exact 범위만 구현·검증하고
제품·기록 commit을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`에서 멈춘다.
