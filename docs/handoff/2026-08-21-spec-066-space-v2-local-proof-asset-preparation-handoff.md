# 스펙 066 space V2 local proof asset preparation handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 기준 HEAD: `3681cb9`
- 정본: `docs/rebuild/specs/066-space-v2-local-proof-asset-preparation.md`

스펙 064 proof descriptor와 스펙 065 issuer projector 사이의 누락된 local byte-identity 경계다.
caller PNG bytes를 await 전에 한 번 복사하고, lowercase UUID v4 경로·PNG signature/IHDR dimensions·
SHA-256 descriptor를 같은 snapshot에서 만든다. upload 단계가 나중에 같은 bytes를 받을 수 있도록
fresh copy를 반환하는 handle을 제공한다.

허용 제품 파일은 신규 `apps/admin/src/space-v2/proof-asset-candidate.ts`와 해당 unit 두 개뿐이다.
기존 `space-v2` Tailwind source exclusion이 적용되므로 CSS/config/package/lockfile 변경은 0이다.

이번 단위는 full PNG decoder가 아니다. CRC/IDAT/IEND/browser decode 성공은 NOT TESTED다. Firebase,
upload, token/encryption, Firestore create, viewer/UI 연결과 실제 network/UID/emulator/deploy도 계속
금지다.

Claude Code는 정본과 `Automation/NEXT_CLAUDE_PROMPT.md`를 읽고 exact 범위만 구현·검증한다. 완료 후
코드 commit과 기록 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. 다음 스펙은
시작하지 않으며 전체 리빌드 진행도·잔여율·변동 근거를 보고한다.

## 종료

- 계약 `1ede90c`, 구현 `9fee315`, 검수 HEAD=origin `e4bcce9`.
- Codex 독립 게이트: space-v2+spaces 234/234, unit 1805/1805, Chromium 151/151, typecheck/build/diff,
  bundle identity와 포트/temp 잔류 0 모두 PASS.
- 최종 판정 `CODEX_PASSED / DONE`. full PNG decode와 실제 upload/Firebase/token/document create/viewer/
  UI는 계속 NOT TESTED / 금지다.
- 전체 진행도 정본은 **72~75% 완료 / 25~28% 잔여**다. 이전 `72~76%`는 상단 유지 근거와 모순돼
  정정했다.
