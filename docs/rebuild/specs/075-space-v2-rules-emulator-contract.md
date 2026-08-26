# 075 — space V2 Rules + local emulator contract

## 목표

스펙 074 local write port가 요구하는 최소 서버 거부 경계를 배포하지 않는 목표 Rules와
`demo-denn-emulator`에서 검증한다. V1 read/create 호환과 기존 admin-state Rules를 회귀시키지 않는다.

## Founder 결정

정본: `docs/codex-claude-handoff/decisions/2026-08-26-space-v2-rules-emulator-decisions.md`.

`JJ-1=A, JJ-2=A, JJ-3=A, JJ-4=B, JJ-5=A, JJ-6=A`.

## 범위

포함:

- `storage.rules`와 `storage.emulator.rules`의 V2 proof asset match.
- `firestore.rules`와 `firestore.emulator.rules`의 V2 document create 분기와 `spaces` list 거부.
- `packages/firebase/src/space-write/rules.emulator.test.ts`.
- `vitest.emulator.config.ts`를 default admin-state + V2 Rules 파일로 정확히 제한한다. 별도
  `demo-denn-cutover` suite는 `vitest.cutover-emulator.config.ts`에만 남긴다.
- 공용 emulator account helper가 여러 test file의 동일 합성 계정을 안전하게 재사용하도록 Auth
  emulator의 `EMAIL_EXISTS`와 `DUPLICATE_LOCAL_ID`만 idempotent 성공으로 처리한다.
- 기존 emulator config/script 재사용. 합성 UID와 `demo-denn-emulator`만.

제외:

- 실제 UID, live Firebase/network, deploy.
- SDK adapter, app/UI/URL/clipboard.
- V2 mapping·REC·customMetadata·backend, delete/orphan 정리.
- 자동 retry, publish, V1 schema 변경.

## 계약

### Storage

`rebuild-space-assets/objects/{objectId}`만 신설한다.

- `objectId`: lowercase UUID v4 + `.png`.
- read: public.
- create: approved UID + 객체 부재 + `< 20 MiB` + `image/png`.
- update/delete: false.
- 상위 catch-all이나 기존 `op()`를 넓히거나 좁히지 않는다.

### Firestore

`spaces/{token}`:

- get: public, list: false.
- V1과 schema 없는 기존 non-V2 create: 기존처럼 auth 없이 허용. **`schema == 'space-v2'`만** 새
  분기로 좁힌다.
- V2 create: approved UID만. outer keys는 `schema`, `enc`만; `enc` keys는 `salt`, `iv`, `ct`만이며
  세 값은 string.
- update/delete: false.

Rules는 암호문의 내부 scene·asset path를 검사할 수 있다고 주장하지 않는다.

### UID와 배포

- 배포 대상 Rules: `UNCONFIRMED_OPERATOR_UID_REPLACE_BEFORE_DEPLOY` 유지.
- emulator 사본: `emulator-operator-DO-NOT-DEPLOY`만.
- 두 사본은 UID 문자열 외 diff 0이어야 한다.
- 실제 UID가 없으므로 live deploy는 STOP.

## Emulator 검증

1. 승인 합성 UID만 V2 PNG create 가능.
2. 다른 UID·미인증 create 거부.
3. public asset read, overwrite/delete 거부.
4. UUID/contentType/20 MiB 경계 거부.
5. exact V2 document는 승인 UID만 create 가능.
6. extra/malformed V2 거부.
7. anonymous V1 create 유지, update/delete 거부.
8. spaces get 공개/list 거부.
9. 기존 admin-state emulator suite 전체 회귀 PASS.
10. 실제 project/network fallback 0.

## 게이트

- format/lint/typecheck/unit/build: `pnpm check`.
- targeted local emulator: `pnpm test:emulator`.
- `git diff --check`, Rules 사본 UID-only 동등성.
- Rules/config 외 forbidden diff 0, package/lockfile diff 0.
- 검사 포트 잔류 0.
- 전체 Chromium E2E는 앱/UI 변경이 없고 기존 suite가 보호 PNG를 재작성하므로 **NOT RUN**이다.
  스펙 074에 한정된 Founder 예외를 이 스펙에 재사용하지 않으며, 별도 검수 또는 Founder 결정 전에는
  full-E2E PASS나 스펙 종료를 주장하지 않는다.

## STOP

emulator binary 다운로드·신규 의존성·점유 포트 강제 종료, non-demo project, 실제 UID/live/deploy,
`firebase.json`·`.firebaserc`·package/lockfile·apps/UI 변경이 필요하면 중단한다.

## DONE (Codex) — LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION

- `storage.rules`와 emulator 사본에 V2 PNG public-read/create-only match를 추가했다. 배포 대상 UID는
  placeholder, emulator UID는 명확한 합성값이며 update/delete는 거부한다.
- `firestore.rules`와 emulator 사본은 `spaces/{token}` get 공개/list 거부를 분리하고, V2 exact envelope
  create만 승인 UID로 제한했다. 기존 non-V2/schema-less create와 update/delete 불변 계약은 유지했다.
- default emulator suite를 admin-state와 V2 Rules 두 파일로 정확히 제한하고, cutover suite는 별도
  config에 유지했다. account helper는 위 두 정확한 duplicate 응답만 재사용 성공으로 처리한다.
- PASS: targeted unit **75/75**, 전체 `node scripts/check.mjs`(unit **2114/2114** 포함), default
  `demo-denn-emulator` **20/20**, 별도 `demo-denn-cutover` **4/4**, `git diff --check`, Rules UID-only
  동등성, forbidden diff, 검사 포트 잔류 0.
- 고객 entry: `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- Java 21.0.11, firebase-tools 15.22.4와 캐시된 emulator runtime만 사용했다. 설치·다운로드·실제
  Firebase 접근·deploy는 0이다. Windows loopback 시작에는 기존 JDK가 지원하는
  `jdk.net.unixdomain.tmpdir`를 허용된 로컬 임시 디렉터리로 지정했다.
- 전체 Chromium E2E는 **NOT RUN**이다. 실행 시 보호 대상 spec-018 PNG를 다시 쓴다. Founder가
  2026-08-26 이 사실을 유지하는 조건으로 **`스펙 075 E2E 예외 종료 승인`**을 별도로 명시했다.
  따라서 상태는 `DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION`; full-E2E PASS는 주장하지 않는다.
