# 스펙 044 K-1·K-3 Founder 결정

결정일: 2026-08-18

## 승인

- **K-1=A** — 저장 빈도·payload 크기·허용 비용 또는 객체/용량 상한과 관찰 주체가 정해지기 전까지
  실제 운영 write를 차단한다. O-3 삭제 보류는 유지한다.
- **K-3=A** — 향후 cutover는 additive transitional Rules → app → 제한 actual-write 검증 → legacy
  write close 방향으로 설계한다.

## 이 승인이 열지 않는 것

이 결정은 transitional/final Rules 파일 작성·실제 UID 기록·Firebase 프로젝트 접근·preview/production
배포·운영 write flag 활성화·actual write·legacy write close·삭제·발행 승인이 아니다. 실제 비용 상한
숫자와 관찰 주체도 아직 정해지지 않았다.
