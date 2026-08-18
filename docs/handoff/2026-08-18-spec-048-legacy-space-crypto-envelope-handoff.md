# 스펙 048 legacy space crypto envelope handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 결과

- `@denn/spaces`에 legacy PBKDF2 120,000/SHA-256 → AES-GCM-256 crypto port를 구현했다.
- salt 16 bytes, IV 12 bytes, standard base64 `{salt,iv,ct}`를 고정했다.
- 고정 vector와 hostile 입력에서 legacy 호환 성공/안전 실패를 검증했다.

## 게이트

- targeted spaces unit 20/20 PASS
- `pnpm check` PASS, unit 1396/1396
- Chromium E2E 141/141 PASS
- 고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`
- diff-check, 포트/temp 잔류 0

## 다음 경계

실제 기존 Firestore 문서와 실제 `?space=` 링크는 접근하지 않아 NOT TESTED다. 다음 local-only 후보는
`space-v1` Firestore document shape와 `space-scene-v1` read validation/scene projection이다. Firebase
adapter·route/UI·이미지 upload는 그 뒤 별도 단위다. 주문은 인쇄소/개인정보 결정 전 확장하지 않고,
published 발행은 F-B 제외를 유지한다.
