# 스펙 042 — 운영자 쓰기 편집기 로컬 브라우저 fixture handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / FIXTURE_ONLY / NO_APP_WIRING**

## 결과

- Founder X-1=A/X-2=A/X-3=A 범위대로 합성 auth/write fake만 쓰는 별도 Chromium fixture를 만들었다.
- 실제 `createAdminWriteSessionController`와 `FramePrintSizeEditor`를 사용하지만 production admin entry와
  `App.tsx`, Firebase write facade에는 연결하지 않았다.
- fixture build는 `scripts/e2e-run.mjs`가 만든 OS temp staging 아래에서만 실행되며 저장소 `dist`에
  fixture 산출물을 남기지 않는다.

## 검증

- `pnpm check`: PASS — format/lint/typecheck/build, unit **1356/1356**.
- `pnpm test:e2e`: PASS — Chromium **139/139**, 신규 fixture 시나리오 **5/5**.
- 고객 JS: `apps/mockup/dist/assets/index-W_cZpbdf.js`, SHA-256
  **`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`**.
- `git diff --check`: PASS. 포트 4183/4184 listener 0, `denn-e2e-*` temp 잔류 0.

## 계속 금지 / NOT TESTED

실제 Firebase/network/emulator/운영 데이터·실제 UID/IAM, Rules·Hosting 배포, 운영 쓰기,
production UI/App 연결, delete·자동 정리·발행은 실행하거나 승인하지 않았다.
