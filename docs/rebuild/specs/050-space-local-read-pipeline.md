# 스펙 050 — space local read pipeline

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 목표

스펙 048 crypto와 스펙 049 document/scene reader를 하나의 순수 orchestration 경계로 합성한다.
실행 순서는 document 검증 → password 입력 검증 → ciphertext 복호화 → scene 검증이며, 실패한 단계
뒤의 작업은 호출하지 않는다.

## 계약

- 입력은 unknown document와 unknown password이며 결과에는 projected metadata와 validated scene만 반환한다.
- ciphertext, password, raw document/plaintext, Web Crypto/JSON 예외는 결과와 오류에 포함하지 않는다.
- document/password가 invalid면 crypto 호출 0, decrypt가 실패하면 scene 성공으로 추측하지 않는다.
- decrypt 성공 plaintext가 invalid scene이면 별도 safe error로 fail-closed한다.
- 주입 crypto port로 호출 순서·횟수·throw/rejection을 검증하고 기본 port로 실제 local roundtrip을 검증한다.

## 허용 파일

- `packages/spaces/src/open.ts`, unit, `index.ts` export
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log

## 금지

Firebase SDK/Firestore/network, 실제 token/document/link, route/UI/scene 적용, URL fetch, 이미지 로드,
package/lockfile/config/Rules, 주문/발행/deploy.

## 검증

- 단계별 success/failure/call order와 후속 호출 0
- safe error에 password/ciphertext/plaintext/raw exception 0
- real Web Crypto local roundtrip
- targeted, spaces typecheck, `pnpm check`, Chromium, 고객 hash, diff/forbidden/port/temp

## DONE (Codex)

- document 검증 → password 검증 → decrypt → scene 검증의 순수 pipeline을 구현했다.
- 단계별 실패에서 후속 호출 0과 safe error를 고정하고 실제 Web Crypto local roundtrip을 검증했다.
- targeted 54/54, `pnpm check` unit 1432/1432, Chromium 141/141 PASS.
- 고객 JS SHA-256은 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`로 동일하다.
- 실제 Firebase/Firestore/token/link/network/route/UI 적용은 NOT TESTED다.
