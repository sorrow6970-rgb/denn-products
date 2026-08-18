# 스펙 043 — admin UI composition 사전 조사 handoff

상태: **DONE / CODEX_PASSED / LOCAL_GATED / PRODUCTION_WRITE_DISABLED**

## 확인 결과

- production `App.tsx`는 spec 036 read controller만 소유하며 spec 041 editor는 연결되지 않았다.
- 기존 env factory는 auth/read ports를 내부에 감춰 write session과 동일 auth instance를 공유할 수 없다.
- 기존 legacy-only read load와 C5 baseline load는 의미가 달라 그대로 함께 노출하면 중복·오인이 생긴다.
- read enable과 별개인 write gate가 없어 실제 UID·Rules cutover 전 UI를 안전하게 닫을 경계가 필요하다.
- write facade는 호출 전 SDK import 0이며 기존 default app config 일치 시 auth를 재사용한다. 따라서
  composition root + 명시 load 시 lazy 생성으로 현재 계약을 보존할 수 있다.

## Founder 결정 대기

- Y-2=A 권장: 하나의 composition root와 auth port 권위.
- Y-3=A 권장: production auth-only card, C5 baseline load만 표시.
- Y-4=A 권장: read와 분리된 exact-true write enable gate.
- Y-5=A 권장: 명시 load 시 rejection-safe lazy write port 생성.

초기 조사 단계에서는 문서만 작성했고 아래 Founder 승인 뒤 로컬 gated composition을 구현했다.
Rules/package/lockfile과 실제 Firebase/network/emulator, 운영 쓰기·배포·발행·delete는 변경하거나
실행하지 않았다.

## Founder 승인 및 구현 결과

- 승인: **Y-2=A/Y-3=A/Y-4=A/Y-5=A**.
- 단일 composition/auth 권위, production auth-only mode, 별도 exact-true write gate, 명시 load lazy
  write holder를 구현했다.
- 기본 production env에서는 write controller/editor 0이다. 합성 fixture는 실제 composition root를
  지나며 factory call이 load 전 0, load 후 1임을 Chromium에서 검증한다.
- targeted 52/52, unit 1363/1363, Chromium 139/139, 고객 JS hash 동일, diff-check PASS.
- 실제 write flag 활성화, Firebase/network/emulator/UID/IAM/Rules 배포/운영 쓰기·발행·delete는
  NOT TESTED/금지 유지다.
