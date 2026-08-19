# 스펙 049 — `space-v1` document·`space-scene-v1` read contract

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**

## 목표

스펙 048 crypto 전후의 두 신뢰 경계를 순수 함수로 고정한다. Firestore document는
`{enc,ownerMeta,createdAt,schema:'space-v1'}`, 복호화 평문은 `space-scene-v1`이다. 실제 Firebase adapter,
token route, 이미지 로드와 UI 적용은 포함하지 않는다.

## 호환 원칙

- legacy가 실제로 읽는 알려진 필드를 안전 snapshot으로 투영한다.
- document/scene의 알 수 없는 추가 키는 무시해 과거 patch 추가분 때문에 전체 링크를 깨지 않는다.
- 알려진 필드가 존재하지만 타입·finite 조건이 틀리면 fail-closed한다.
- `settings`, `common`, gallery settings는 구조가 아직 opaque이므로 JSON-safe object snapshot만 허용한다.
- URL/ID 문자열은 이번 순수 계층에서 fetch하거나 신뢰 URL로 판정하지 않는다.
- 오류는 안전 code만 반환하고 token/password/URL/text/ciphertext/raw 예외를 echo하지 않는다.

## 허용 파일

- `packages/spaces/src/read.ts`, unit, `index.ts` export
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log

## 검증

- legacy full fixture와 최소/과거 누락 필드 fixture
- unknown key 무시, 입력 불변, 새 plain snapshot
- bad schema/envelope/known field/non-finite/hostile/circular/BigInt 거부
- photo transform `scale/x/y/rot`, `clockOn`, room controls/position/sun/gallery 보존
- targeted, spaces typecheck, `pnpm check`, Chromium, customer hash, diff/forbidden/port/temp

## 금지

Firebase SDK/Firestore/Storage/network, 실제 token/document/link, URL fetch/trust, scene UI 적용, package/lockfile,
config/Rules, 주문/발행/deploy.

## DONE (Codex)

- `space-v1` document와 `space-scene-v1` plaintext를 입력 변경 없이 안전 projection하는 순수 reader를 구현했다.
- unknown 추가 키는 무시하고 known bad type, 비유한 수, malformed envelope, hostile/circular/BigInt는 안전 코드로 거부한다.
- targeted 44/44, `pnpm check` unit 1422/1422, Chromium 141/141 PASS.
- 고객 JS SHA-256은 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`로 동일하다.
- 실제 Firestore/token/link/network/scene UI 적용은 NOT TESTED이며 이번 범위에 포함하지 않았다.
