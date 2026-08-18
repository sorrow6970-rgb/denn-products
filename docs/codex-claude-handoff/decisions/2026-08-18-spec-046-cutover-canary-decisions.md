# 스펙 046 L-1~L-3 Founder 결정

결정일: 2026-08-18

- **L-1 승인:** 최초 canary는 의도적 저장 1회, 신규 Storage 객체 최대 1개, 객체 크기 20 MiB 미만,
  Founder 즉시 확인으로 제한한다. 일반 운영 상한은 별도 결정 전 계속 차단한다.
- **L-2=A:** 승인 UID 한 명이 새 `/admin/` 한 탭만 사용하며 dual-window 동안 legacy 저장은 운영
  절차상 중지한다. 서버가 구 탭을 강제로 차단한다고 주장하지 않는다.
- **L-3=A:** 저장 1건 후 head/object/REC 일치, 재로그인과 새 탭 재읽기, conflict/outcome-unknown 0을
  확인한 뒤 별도 Founder 승인으로 legacy close를 연다.

이 승인은 local-only transitional Rules 후보·emulator 사본·cutover manifest validator 작성과 검증만
허용한다. 실제 UID·운영 Rules/config·Firebase 접근·배포·actual write·legacy close는 승인하지 않는다.
