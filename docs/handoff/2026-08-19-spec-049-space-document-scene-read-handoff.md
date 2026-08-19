# 스펙 049 space document·scene read handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 결과

- `@denn/spaces`에 `space-v1` Firestore document와 `space-scene-v1` plaintext의 순수 reader를 추가했다.
- 알려진 legacy 필드만 detached snapshot으로 투영하고 알 수 없는 추가 키는 호환을 위해 무시한다.
- 알려진 필드의 잘못된 타입, 비유한 수, malformed envelope와 hostile/circular 입력은 raw 값 없이 안전 코드로 거부한다.
- URL/ID는 문자열로만 보존하며 fetch하거나 신뢰 판정을 하지 않는다.

## 게이트

- targeted spaces unit 44/44 PASS
- `pnpm check` PASS, unit 1422/1422
- Chromium E2E 141/141 PASS
- 고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`
- `git diff --check` PASS, 포트 4183/4184/8080/9099/9199와 E2E temp 잔류 0

## 다음 경계

실제 Firestore document, 기존 token/`?space=` 링크, Firebase/network, 복호화→reader 합성 pipeline과 scene UI
적용은 NOT TESTED다. 다음 후보는 crypto와 document/scene reader를 합성하는 local-only 순수 read pipeline이다.
Firebase adapter·token route·이미지 fetch/UI 적용은 별도 결정과 스펙 전까지 시작하지 않는다.
