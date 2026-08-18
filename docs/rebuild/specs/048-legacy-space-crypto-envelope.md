# 스펙 048 — legacy `dennSpace` crypto envelope 호환성

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 근거와 목표

레거시는 UTF-8 password → PBKDF2 120,000/SHA-256 → AES-GCM-256, 16-byte salt, 12-byte IV를 쓰고
표준 base64 `{salt,iv,ct}` envelope에 JSON ciphertext+tag를 저장한다(`denn-mockup-tool.html:15533-15549`).
`@denn/spaces`는 현재 상수/타입만 있어 기존 `?space=` 링크 호환을 주장할 수 없다.

이번 단위는 framework/network 독립 crypto port만 구현한다. Firestore, token/link, scene 적용, UI,
실제 기존 문서 복호화는 포함하지 않는다.

## 계약

- 공개 상수: PBKDF2 120000, SHA-256, AES-GCM 256, salt 16, IV 12.
- envelope key는 정확히 `salt`, `iv`, `ct` 문자열 세 개다.
- base64는 legacy `btoa/atob`와 같은 표준 alphabet/padding이며 URL-safe 변형을 받지 않는다.
- encrypt는 non-empty password와 JSON 직렬화 가능한 값만 허용한다.
- decrypt는 envelope shape/길이를 먼저 검증하고 auth 실패·잘못된 password·JSON 실패를 안전 코드 하나로
  반환한다. raw Web Crypto/JSON 오류·password·평문·ciphertext를 노출하지 않는다.
- 주입 가능한 `Crypto`로 salt/IV를 결정적으로 검증하되 기본 앱/network/Firebase 호출은 0이다.

## 허용 파일

- `packages/spaces/src/crypto.ts`, unit, `index.ts` 공개 export
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log

## 검증

- 레거시 알고리즘으로 만든 고정 ciphertext vector 양방향
- UTF-8 한글/emoji, key order/JSON semantics, random salt/IV 길이와 호출 수
- wrong password, tamper, malformed/URL-safe base64, hostile getter/circular/BigInt
- 실패 결과에 secret/raw 오류 0
- spaces typecheck, targeted unit, `pnpm check`, 전체 Chromium, 고객 hash, diff/forbidden/port/temp

## 금지

Firestore/Storage/Firebase SDK, 실제 `?space=`/운영 문서, token/link/scene schema 확대, UI, 주문, 발행,
package/lockfile/config/Rules, 실제 network/deploy.

### DONE (Codex)

- legacy PBKDF2/AES-GCM 상수와 `{salt,iv,ct}` 표준 base64 envelope를 순수 port로 구현했다.
- 고정 salt/IV ciphertext vector, 한글/emoji, JSON 순서, random 호출, wrong password/tamper/malformed/
  hostile/circular/BigInt를 검증했다.
- 오류는 안전 코드만 반환하며 password·평문·ciphertext·raw Web Crypto/JSON 오류를 노출하지 않는다.
- targeted 20/20, `pnpm check` PASS(unit 1396/1396), Chromium 141/141, 고객 hash 동일,
  diff-check·포트/temp 잔류 0.
- 실제 기존 `spaces/{token}` 문서, Firestore, `?space=` route/scene 적용은 NOT TESTED이며 후속이다.
