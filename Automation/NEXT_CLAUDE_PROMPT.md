# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-036-codex-independent-verification`

**스펙 036 구현이 끝났다: `fd92fbc`**(계약 `765dfb4`, 결정 정본
`decisions/2026-08-10-admin-auth-write-boundary-decisions.md`).
다음은 **Codex 독립 검증**이다. 다음 스펙은 시작하지 않는다.

## 구현된 것

운영자 Email/Password Auth · `onAuthStateChanged` 기반 **비익명** 세션 관찰 ·
고정 `admin/state.json` 읽기 · `readLegacyCatalog` 검증 · **메모리 전용**.
`firebase@12.17.1` 정확 고정, admin 기능은 **`@denn/firebase/admin-read` 서브패스 전용**,
**루트 배럴 무변경**, SDK는 **동적 import**.

## Codex가 재확인할 것

- frozen install / format / lint / typecheck / **unit 1258** / build / **Chromium E2E 134** / `pnpm check`
- **고객 `dist` SHA-256 = `f86d446d…7bbc09`**(구현 전후 동일)과 고객 번들 문자열 0건
- 금지 diff 0: `apps/mockup/**` · `packages/render/**` · `packages/shared/**` ·
  `packages/firebase/src/index.ts` · `storage.rules` · `firestore.rules` · `firebase.json` ·
  **`pnpm-workspace.yaml`**
- 실제 Firebase/network/live/emulator 요청 **0건**
- ports 4183/4184 · OS temp `denn-e2e-*` 잔여 0

## ⚠️ 미해결 (별도 Founder 승인 대상)

`pnpm install`이 pnpm 11 정책으로 `pnpm-workspace.yaml`에 `allowBuilds` 자리표시자를 자동 추가하면
frozen install이 exit 1이 된다. 이번엔 그 3줄을 **제거**했고 제거 상태에서 exit 0이지만,
**`node_modules`가 없는 새 클론에서는 재발할 수 있다(NOT VERIFIED)**.
재발 시 최소 해결책은 `@firebase/util`·`protobufjs`를 **`false`**(스크립트 실행 안 함)로 명시하는 것이며,
`pnpm-workspace.yaml` 수정과 `pnpm approve-builds`는 **Founder 승인 없이 하지 않는다**.

## 계속 금지

쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 (F-B·F-D·F-E) ·
실제 Firebase/network/live/emulator/운영 데이터 · Rules/Hosting/배포 ·
신규 계정·다중 계정·역할 · 실제 config 하드코딩·`.env` commit · live 테스트 파일 ·
`packages/firebase/src/index.ts` 루트 배럴 수정.

## NOT TESTED

운영자 계정의 실제 존재·로그인 가능 여부 · `storage.rules` 실제 배포·거부 동작 ·
실제 `admin/state.json` 존재·크기·내용 · 실제 인증 만료·갱신 · 실제 Storage CORS·`getBytes` ·
실기기 · 쓰기 원자성 · 실제 SDK 오류 코드 문자열(매핑은 합성 fake로만 검증).

자동화 루프는 삭제된 상태이며 새 자동화·반복 작업을 만들지 않는다.
알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않는다.
