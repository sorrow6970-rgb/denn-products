# 스펙 052 — space link open controller

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 목표

`?space=` query를 안전하게 파싱하고 injected `SpaceDocumentReadPort`와 `SpaceOpenPort`를 순서대로
합성하는 framework-free controller를 구현한다. 실제 Firebase factory, production UI와 scene 적용은 제외한다.

## 계약

- space parameter 0개는 inactive, 정확히 1개 valid token은 awaiting-password, 중복/invalid는 invalid-link다.
- password submit은 한 번에 하나만 실행하고 duplicate submit은 무시한다.
- document read 성공 후 password 실패 시 암호문 document를 메모리에만 보존해 명시 재시도에서 재-read 0.
- network read 실패는 raw token/SDK error 없이 safe state로 투영하고 명시 retry만 허용한다.
- open 성공·detach 시 cached document를 폐기하고 늦은 결과는 generation으로 무시한다.
- state/notification/console에 token/password/raw document/plaintext/ciphertext를 노출하지 않는다.

## 허용 파일

- `apps/mockup/src/space/**`, unit
- `apps/mockup/package.json`, workspace lock의 `@denn/spaces` workspace link 최소 변경
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log

## 금지

`App.tsx`/production UI, 실제 Firebase factory/config/network/token/document, route library, scene/image 적용,
Rules/config/deploy, write/upload/delete/create, 신규 외부 의존성.

## 검증

query matrix, read/open 순서, password retry cache, duplicate submit, manual network retry, detach/late result,
safe state, targeted/typecheck, `pnpm check`, Chromium, 고객 hash, diff/port/temp.

## DONE (Codex)

- query parser와 injected read→open controller를 구현하고 password retry의 in-memory document 재사용,
  network explicit retry, duplicate/detach/late-result 차단을 검증했다.
- targeted 17/17, 표준 check 본체 `node scripts/check.mjs` PASS(unit 1479/1479), Chromium 141/141 PASS.
- `pnpm check` 진입점은 fallback pnpm 11.19가 dependency-status install을 재호출해 실패했으나 동일 script
  본체는 전부 PASS했다. 고정 lock install은 reused 161/downloaded 0으로 복구됐고 build 승인 변경은 0이다.
- 고객 JS SHA-256은 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`로 동일하다.
- 실제 Firebase/network/token/document, `App.tsx`, production UI/scene 적용은 0이다.
