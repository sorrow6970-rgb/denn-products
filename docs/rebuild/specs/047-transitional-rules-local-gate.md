# 스펙 047 — transitional Rules·cutover manifest 로컬 게이트

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_DEPLOY**

## 목표

스펙 046 L-1~L-3 결정을 운영 파일과 분리된 합성 후보로 고정한다. transitional Storage는 legacy
`admin/**` write를 유지하면서 rebuild 객체 create-only를 추가하고, transitional Firestore는 기존
`spaces/{token}` 계약을 보존하면서 REC/head를 추가한다.

## 허용 파일

- `storage.transitional.emulator.rules`, `firestore.transitional.emulator.rules`
- `firebase.cutover.emulator.json`, `vitest.cutover-emulator.config.ts`
- `packages/firebase/src/admin-write/cutover-rules.emulator.test.ts`
- `scripts/cutover-manifest.mjs`와 unit, `cutover.local.candidate.json`
- `.gitignore`의 위 JSON 두 파일 정확한 추적 예외(A-12 최소 확장)
- 이 스펙/결정/handoff/STATE/NEXT/CURRENT/live log

## 검증 계약

1. 합성 승인 UID만 rebuild REC/head/object를 쓸 수 있다.
2. transitional window에서는 기존 non-anonymous 운영자가 `admin/state.json`을 쓰고 덮어쓸 수 있다.
3. 익명/미인증 legacy admin write와 다른 UID의 rebuild write는 거부한다.
4. rebuild object update/delete, REC/head delete는 계속 거부한다.
5. `spaces/{token}` create 허용·update/delete 거부는 변하지 않는다.
6. manifest는 local-only, demo project, 합성 UID, 1회/1객체/20 MiB 미만, deploy command 0,
   production/write/legacy-close false를 fail-closed로 검사한다.
7. 기본 `pnpm check`와 별도 cutover emulator gate를 분리한다.

## 금지

`storage.rules`, `firestore.rules`, `firebase.json`, `.firebaserc`, package/lockfile, apps/UI 수정, 실제 UID,
실제 Firebase/network/운영 데이터, deploy, 운영 write flag, actual write, legacy close, delete/자동 정리.

### DONE (Codex)

- 실제 운영 Rules와 분리된 synthetic transitional Storage/Firestore Rules와 demo-only emulator config를
  추가했다.
- legacy non-anonymous create/overwrite 유지, 익명 거부, rebuild 승인 UID 격리·불변성, head/REC,
  기존 spaces 불변 계약을 실제 emulator Rules로 검증했다.
- local cutover manifest는 1회/1객체/20 MiB 미만, Founder 즉시 확인, production/actual-write/
  legacy-close false, deploy command 0을 fail-closed로 강제한다.
- 검증: manifest unit 12/12, cutover emulator 4/4, `pnpm check` PASS(unit 1378/1378), Chromium
  141/141, 고객 hash 동일, diff-check·포트/temp 잔류 0.
- 실제 UID·운영 Rules/config·Firebase/network/deploy/write/legacy close는 NOT TESTED/금지다.
