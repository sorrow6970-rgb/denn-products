# 스펙 067 space V2 local document encryption candidate handoff

- 상태: `CORRECTION_REQUIRED / FIX_ROUND_1 / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD=origin: `e4bcce9`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/067-space-v2-local-document-encryption-candidate.md`

스펙 065의 strict `SpaceSceneV2`를 기존 `SpaceCryptoPort.encryptJson`으로 한 번 암호화하고 exact
`SpaceDocumentV2` outer 후보를 만드는 admin local-only 경계다. raw caller scene 대신
`readSpaceSceneV2`의 detached snapshot을 암호화하고, 결과 outer도 `readSpaceDocumentV2`로 다시
fail-closed 검증한다. `readSpaceSceneV2`는 digest 형식만 확인하므로 암호화 전에 주입 SHA-256 port와
`verifyFrameReplayEvidenceDigestV1`로 evidence 일치까지 반드시 검증한다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/document-encryption-candidate.ts`와 해당 unit 두 개뿐이다.
기존 workspace dependency와 Tailwind source exclusion을 사용하므로 package/lockfile/CSS/config 변경은
0이어야 한다.

token/UUID 생성, proof upload, Firestore create, Firebase adapter, 실제 network/UID/emulator/deploy,
issuer/viewer/UI 연결은 금지다. password는 기존 crypto 계약의 non-empty string만 재사용하고 새 정책을
만들지 않는다.

Claude Code는 정본과 NEXT를 전부 읽고 exact 범위만 구현·검증한다. 완료 후 제품 commit과 기록 commit을
일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. 다음 스펙은 시작하지 않으며 전체 리빌드
진행도·잔여율·변동 근거를 반드시 보고한다.

## Codex 보완 라운드 1

candidate `35b7ffd`의 기능과 전체 게이트는 통과했지만, `sha256 === undefined`이면
`verifyFrameReplayEvidenceDigestV1`의 default Web Crypto port가 활성화된다. 필수 주입/global crypto 0
계약 위반이다.

허용 제품 파일 2개 안에서 SHA/crypto method를 첫 await 전에 각각 한 번 snapshot·검증하고,
always-defined SHA adapter로 verifier default를 닫는다. malformed/throwing/revoked ports와 method getter
one-read, global digest 0을 unit으로 고정한다. 상세 정본은 spec 067의 CODEX REVIEW 절이다.
