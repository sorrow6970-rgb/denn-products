# 스펙 051 space Firestore read adapter 조사 handoff

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK**

## 결론

SDK 12.17.1과 현재 Rules로 `spaces/{token}` 단일 read adapter는 구성 가능하다. 그러나 레거시가 사용자
지정 token을 검증하지 않았으므로 24-hex 제한을 바로 도입하면 기존 링크를 깨뜨릴 수 있다. `getDoc`의
memory cache 허용 여부와 named app 소유 방식도 구현 전에 명시한다.

## 권장 결정

- Q-1=A: Firestore 공식 document ID 제약의 단일 segment 허용
- Q-2=A: `getDoc` + 기본 memory cache, persistent cache 활성화 0
- Q-3=A: named `denn-space-viewer`, config mismatch fail-closed, Auth 0, space-read 서브패스 local unit만

실제 Firebase/Rules 배포/token/document/network/emulator/route/UI는 NOT TESTED이며 접근하지 않았다.
