# 스펙 042 — 운영자 쓰기 편집기 로컬 브라우저 fixture

상태: DONE / CODEX_PASSED / LOCAL_ONLY / FIXTURE_ONLY / NO_APP_WIRING

## Founder 결정

- X-1=A: 합성 auth/write fake만 사용하는 로컬 전용 Chromium fixture.
- X-2=A: `App.tsx`, production composition, Firebase write adapter 생성 제외.
- X-3=A: 선택·prefill·invalid·save·conflict·outcome-unknown·dirty 폐기 확인을 실제 브라우저에서 검증.

## 계약

1. fixture는 별도 HTML/Vite config로만 빌드하며 제품 admin entry에서 import하지 않는다.
2. output은 `scripts/e2e-run.mjs`가 만든 OS temp staging의 admin 디렉터리만 허용한다. repo/dist fallback 0.
3. 실제 `createAdminWriteSessionController`와 `FramePrintSizeEditor`를 사용하되 auth/write는 합성 fake다.
4. fake는 exact expectedBase, save 횟수, 성공 revision과 conflict/outcome-unknown을 관찰 가능하게 한다.
5. Firebase SDK/facade/config/env를 import하지 않고 localhost 외 요청은 0이다.
6. 제품 admin build와 고객 bundle hash는 byte-identical이어야 한다.

## 검증 시나리오

- 명시적 baseline load 전 편집·save 불가, 첫 size 자동 선택 0
- canonical prefill, 값 없는 size 빈 입력, legacy field size option disabled
- partial/invalid 입력은 dirty-invalid + save 0
- 원래 값 복귀는 ready-clean + save 0
- valid 변경은 exact expectedBase로 1회 save, 반환 revision 채택
- conflict/outcome-unknown은 자동 retry 0, save 잠금, 명시적 discard reload
- 실제 Firebase/외부 요청, raw identifier/error 노출 0

## 허용 파일

- `apps/admin/e2e-admin-write-fixture.html`
- `apps/admin/src/e2e/admin-write-fixture.tsx`
- `apps/admin/vite.e2e-fixture.config.ts`
- `scripts/e2e-run.mjs`
- `tests/e2e/admin-write-editor.spec.ts`
- 이 스펙, handoff, STATE/NEXT/CURRENT/live log

## 금지

`App.tsx`, production admin Vite config, product composition/write adapter, Firebase/Rules/config/package/lockfile,
실제 UID/network/emulator/운영 쓰기·발행·delete·deploy.

## DONE (Codex) — 2026-08-18

- 별도 HTML/Vite entry와 OS-temp-only build를 추가했다. production `App.tsx`와 admin build entry는
  변경하지 않았고 Firebase SDK/facade를 import하지 않는다.
- 실제 session controller/editor와 합성 fake를 연결해 명시적 load, 선택·prefill, invalid, exact-base
  save, conflict/outcome-unknown 잠금, 명시적 discard reload를 Chromium에서 검증했다.
- 검증: `pnpm check` PASS(unit 1356/1356), Chromium E2E 139/139(신규 5), 고객 JS SHA-256
  `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`, `git diff --check` PASS.
- 실제 Firebase/network/emulator/UID/IAM/Rules·Hosting 배포/운영 쓰기/UI 연결/delete/발행은 0이며
  NOT TESTED다.
