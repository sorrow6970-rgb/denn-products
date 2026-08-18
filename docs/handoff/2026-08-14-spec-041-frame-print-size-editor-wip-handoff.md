# 핸드오프 — 스펙 041 액자 인쇄 치수 격리 편집기

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_APP_WIRING**

Founder는 V-1=A, V-2=A, V-3=A를 승인했다. 안정 ID 선택, canonical prefill, 삭제 없는 유효한 쌍
추가·갱신, 순수 immutable catalog 후보와 격리 React 편집기를 구현했다. `App.tsx`에는 연결하지 않았다.

독립 검토에서 발견한 F-D 충돌은 Founder W-1=A 승인으로 보완했다. baseline provenance를 보존하고,
같은 port의 exact loaded revision을 save 전제조건으로 강제한다. legacy 필드 추가·변경·삭제는
fail-closed하며 read-time 승격 canonical만 payload에서 제거한다. 원래 canonical+legacy pair는 보존한다.

legacy field 포함 항목은 순수 edit/UI 모두 읽기 전용이다. invalid partial 입력의 dirty 상태 오류도
보완했다. `App.tsx`에는 연결하지 않았고 실제 운영 데이터·Firebase·Rules·config·emulator·network는
접근하지 않았다.

검증: targeted 74/74, `pnpm check` PASS(unit 1356/1356), Chromium 134/134, 고객 JS 287,741 bytes,
SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`.

실제 App/UI 연결, 운영 쓰기, 실제 UID/IAM, Rules/Hosting 배포, 발행, delete·자동 정리는 후속 승인 전
계속 금지한다.
