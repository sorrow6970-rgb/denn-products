# 스펙 052 space link open controller handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 결과

- 정확히 하나의 valid `?space=`만 받는 query parser와 framework-free controller를 구현했다.
- explicit password submit에서 injected Firestore reader 후 spaces open port를 호출한다.
- wrong password 재시도는 읽은 암호문 document를 메모리에서 재사용해 Firestore 재-read 0이다.
- network retry만 명시 재-read하며 duplicate submit, non-retryable retry, detach 늦은 결과를 차단한다.
- token/password/raw document/ciphertext/raw error는 state·notification·console에 남기지 않는다.

## 게이트

- targeted unit 17/17 PASS
- `node scripts/check.mjs` PASS, unit 1479/1479
- Chromium E2E 141/141 PASS
- 고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`
- diff-check, 포트/temp/debug 잔류 0

`pnpm check` wrapper는 fallback pnpm 11.19의 dependency-status install 재호출로 진입 전에 실패했다.
같은 검사 본체를 직접 실행해 format/lint/typecheck/unit/build 전체 PASS를 확인했다. lock은 mockup의
`@denn/spaces` workspace link만 추가됐고 외부 package 버전 변경·download는 0이다.

## 다음 경계

실제 Firebase config/factory와 `App.tsx`, password UI, ready scene 적용은 NOT TESTED다. 다음 단계는
production 연결 전 UI/composition 계약 조사이며 실제 network 접근은 별도 승인 전 금지다.
