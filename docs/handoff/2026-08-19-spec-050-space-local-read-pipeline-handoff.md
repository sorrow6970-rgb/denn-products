# 스펙 050 space local read pipeline handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 결과

- `@denn/spaces`에 document 검증 → password 검증 → decrypt → scene 검증 순서의 순수 open port를 추가했다.
- 성공 결과는 projected owner metadata와 validated scene만 포함하며 envelope/password/raw plaintext는 반환하지 않는다.
- 각 실패 단계에서 후속 호출을 중단하고 crypto rejection/raw exception도 안전 오류로 변환한다.

## 게이트

- targeted spaces unit 54/54 PASS
- `pnpm check` PASS, unit 1432/1432
- Chromium E2E 141/141 PASS
- 고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`
- `git diff --check` PASS, 포트 4183/4184/8080/9099/9199와 E2E temp/debug 산출물 잔류 0

## 다음 경계

실제 Firebase/Firestore document, token과 `?space=` route, image fetch 및 scene UI 적용은 NOT TESTED다.
다음 후보는 Firestore read adapter 계약 조사이며 실제 network나 운영 데이터 접근 전 별도 승인이 필요하다.
