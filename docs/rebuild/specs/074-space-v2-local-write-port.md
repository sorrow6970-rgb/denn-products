# 074 — space V2 local write port

## 목표 (WHY)

스펙 072의 persistence-ready bundle을 실제 Firebase SDK와 분리된 순수 orchestration port에 연결한다.
성공 순서, 안전 오류 매핑, 결과 미확정, 단일 비행을 synthetic fake로 고정하되 네트워크·Rules·UI는
열지 않는다.

사용자의 2026-08-26 지시인 “직접 구현하고 검증후 보고”는 스펙 073의 최소 다음 단위
**JJ-7=A(local `space-write` port + fake)** 착수 승인으로 해석한다. JJ-1~JJ-6은 선택하지 않는다.

## 범위 (SCOPE)

포함:

- `@denn/firebase/space-write` 신규 subpath와 local-only public contract.
- 주입 facade, 안전 오류 envelope·매핑, upload-first orchestration, Firestore create 결과 미확정 시
  server-read reconciliation 1회.
- 입력 bundle의 detached snapshot과 proof/document 일치 사전 검증.
- 한 번에 하나의 issue만 수행하는 single-flight.
- synthetic fake unit. 실제 SDK import와 network는 0.

제외:

- `storage.rules`, `firestore.rules`, emulator 사본/config/test.
- Firebase SDK adapter, app ownership/auth 초기화, 실제 Firebase/project/bucket/Firestore/network.
- admin/customer UI, `App.tsx`, route, URL 발급, clipboard, publish.
- delete/orphan 정리, REC/mapping, custom metadata, 자동 retry/merge.
- JJ-1~JJ-6 선택, 실제 UID, deployment.

## 대상 (WHERE)

- 신규 `packages/firebase/src/space-write/**`
- `packages/firebase/package.json`의 `./space-write` subpath만 추가
- `packages/firebase/src/index.ts` 루트 barrel은 변경하지 않는다.
- `apps/**`는 변경하지 않는다.

## 구현 지시 (WHAT / HOW)

1. 입력은 caller correlation id와 스펙 072 bundle의 구조적 최소 표면만 받는다.
   - `token`
   - `copyProofDescriptor()`
   - `copyUploadBytes()`
   - `copyDocument()`
2. facade/auth/bundle method를 첫 await 전 한 번씩만 읽고 필요한 값을 detached copy로 고정한다.
3. token은 lowercase UUID v4, proof path는
   `rebuild-space-assets/objects/{different-lowercase-uuid-v4}.png`, content type은 `image/png`, bytes는
   1..20,971,519, descriptor byteLength와 실제 bytes 길이는 같아야 한다.
4. document는 `readSpaceDocumentV2` 정본을 통과해야 한다. invalid input은 facade 호출 0이다.
5. 운영자 auth가 `authenticated`가 아니면 upload/create 0으로 `SPACE_V2_ISSUE_AUTH_REQUIRED`다.
6. 성공 순서는 upload 1회 → receipt byte length 일치 → document create 1회다.
7. upload의 확정 실패만 `UPLOAD_FAILED`; 미매핑·timeout 계열은
   `UPLOAD_OUTCOME_UNKNOWN`과 `retryable:false`, create 호출 0이다.
8. create의 확정 거부/실패는 안전 code로 끝내고 재업로드하지 않는다. 미확정이면
   `readSpaceDocumentFromServer(token)`을 정확히 한 번 호출한다.
   - exact document 존재 + `fromCache:false` + `hasPendingWrites:false`: 성공
   - 부재/read 실패: `DOCUMENT_OUTCOME_UNKNOWN`
   - 캐시/pending-write snapshot: `DOCUMENT_OUTCOME_UNKNOWN`
   - server snapshot에 존재하지만 불일치/invalid: `DOCUMENT_FAILED`
9. 오류에는 category/code/retryable/correlationId만 둔다. raw SDK message, token, objectPath, bytes,
   UID/email을 노출하지 않는다.
10. issue 도중 두 번째 호출은 첫 Promise를 그대로 재사용하며 upload를 추가 시작하지 않는다.
11. delete·retry·merge·fallback API는 만들지 않는다.

## 검증 절차 (VERIFY)

- [ ] targeted: `pnpm exec vitest run packages/firebase/src/space-write/write-port.test.ts`
- [ ] firebase typecheck: `pnpm exec tsc --noEmit -p packages/firebase/tsconfig.json`
- [ ] 전체: `pnpm check`
- [ ] 전체 Chromium: `pnpm test:e2e`
- [ ] `git diff --check`
- [ ] package/lockfile/Rules/Firebase config/app/protected diff 검사
- [ ] 고객 build entry SHA-256 기록
- [ ] 실행 후 테스트 포트 잔류 0

완료 정의: 위 게이트 통과, 실제 network/emulator/deploy 0, UI 연결 0, 허용 경계 밖 변경 0.

## 위험 (RISK)

- fake는 순서와 오류 분류만 검증하며 Rules 원자성이나 Firebase runtime을 증명하지 않는다.
- outcome unknown은 실패가 아니다. 자동 retry를 추가하면 중복 asset/document가 생길 수 있다.
- 실제 Rules가 닫혀 있으므로 이 port는 adapter가 생겨도 현재 운영에서 성공할 수 없다.
- rollback은 신규 subpath와 `space-write` 디렉터리 제거이며 기존 app/runtime에는 연결이 없어 영향이 없다.

### QUESTIONS

없음. 이번 단위는 JJ-7=A의 local-only 범위로 제한한다.

### DONE (Codex) — 2026-08-26

- 구현: `@denn/firebase/space-write` subpath, injected facade/auth port, exact detached input snapshot,
  upload-first create, definite/unknown 오류 분리, `getDocFromServer` 성격의 1회 reconciliation,
  cache/pending snapshot fail-closed, single-flight, safe error envelope.
- synthetic fake: **30/30 PASS**. invalid/hostile/auth/upload failure·unknown/receipt mismatch/create
  definite·unknown/server exact·missing·cache·pending·mismatch/read failure/single-flight/비노출을 고정했다.
- 전체 `pnpm check`: format/lint/typecheck/unit **2114/2114**/mockup+admin build PASS.
- 고객 entry: `index-6js4DafP.js` 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- `git diff --check` PASS, 검사 포트 잔류 0. 실제 Firebase/network/emulator/deploy/UI/delete는 0.
- 전체 Chromium E2E는 보호 대상 spec-018 PNG를 재작성하는 기존 테스트 부수효과 때문에 **NOT RUN**.
  실행 거부를 우회하지 않았다. Founder가 2026-08-26 **E2E 예외 종료를 명시 승인**했다. 따라서
  **DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION**이며 full-E2E PASS나 독립 CODEX_PASSED를
  주장하지 않는다.
