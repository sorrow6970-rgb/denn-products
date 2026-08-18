# 스펙 044 — admin write cutover 준비도 조사 handoff

상태: **FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_DEPLOY**

## 판정

운영 쓰기는 아직 NOT READY다.

- 실제 운영자 UID 정본이 없어 G-1에 따라 Rules 배포가 차단된다.
- D-2=O-3/D-3=N은 오삭제를 막지만 G-4의 운영 비용 상한을 정하지 않았다.
- `firebase.json`은 `hosting.public: "."`라 Vite admin을 안전하게 배포할 격리 artifact/route가 없다.
- 최종 Storage Rules를 먼저 배포하면 legacy 저장이 즉시 닫혀 무저장 구간이 생긴다.
- actual-write 이후 Hosting만 legacy로 롤백해도 rebuild head 변경이 legacy로 되돌아가지 않는다.

## Founder 결정 대기

- K-1=A 권장: 비용/용량 상한·관찰 주체 결정 전 운영 쓰기 차단 유지.
- K-2=A 권장: 다음은 local-only deploy-safe Hosting/admin route 패키징 스펙 045.
- K-3=A 권장: 향후 transitional Rules→app→legacy close 방향. 아직 Rules 작성·배포 승인이 아님.

실제 Firebase/network/UID/Rules·Hosting 배포/운영 쓰기·발행·delete는 실행하지 않았다.
