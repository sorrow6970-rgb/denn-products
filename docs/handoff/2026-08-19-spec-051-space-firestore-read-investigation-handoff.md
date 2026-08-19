# 스펙 051 space Firestore read adapter 조사 handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 결론

SDK 12.17.1과 현재 Rules로 `spaces/{token}` 단일 read adapter는 구성 가능하다. 그러나 레거시가 사용자
지정 token을 검증하지 않았으므로 24-hex 제한을 바로 도입하면 기존 링크를 깨뜨릴 수 있다. `getDoc`의
memory cache 허용 여부와 named app 소유 방식도 구현 전에 명시한다.

## 권장 결정

- Q-1=A: Firestore 공식 document ID 제약의 단일 segment 허용
- Q-2=A: `getDoc` + 기본 memory cache, persistent cache 활성화 0
- Q-3=A: named `denn-space-viewer`, config mismatch fail-closed, Auth 0, space-read 서브패스 local unit만

실제 Firebase/Rules 배포/token/document/network/emulator/route/UI는 NOT TESTED이며 접근하지 않았다.

## Founder 승인과 구현

Q-1=A/Q-2=A/Q-3=A 승인에 따라 `@denn/firebase/space-read` 서브패스를 구현했다. Firestore 공식
document-ID 제약, `getDoc` memory-cache 계약, named `denn-space-viewer` 재사용과 config mismatch
fail-closed를 unit으로 고정했다. Auth 생성·로그인, root barrel export와 앱 연결은 0이다.

게이트: targeted 30/30, `pnpm check` unit 1462/1462, Chromium 141/141, 고객 hash 동일,
diff-check·포트/temp 잔류 0. 실제 Firebase/network/token/document는 계속 NOT TESTED다.
