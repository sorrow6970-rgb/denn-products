# 스펙 075 space V2 Rules·emulator handoff

- 상태: `DONE / LOCAL_RULES_VERIFIED / FOUNDER_E2E_EXCEPTION / FULL_E2E_NOT_RUN`
- 기준: `HEAD=origin=b2dc2ca`, ahead/behind 0/0
- 정본: `docs/rebuild/specs/075-space-v2-rules-emulator-contract.md`
- 결정: `JJ-1=A, JJ-2=A, JJ-3=A, JJ-4=B, JJ-5=A, JJ-6=A`

## 구현

- Storage: `rebuild-space-assets/objects/{lowercase-v4-uuid}.png` public read, 승인 UID create-only,
  `<20MiB`, `image/png`, update/delete 거부.
- Firestore: `spaces/{token}` get 공개/list 거부, V2 exact envelope는 승인 UID만 create, 기존 non-V2와
  schema-less create 호환 및 update/delete 거부 유지.
- 배포 대상 Rules는 실제 UID placeholder, emulator 사본은 합성 UID만 사용한다.
- default emulator suite는 admin-state와 V2 Rules만 포함하며 cutover suite는 별도로 유지한다.

## 검증

- targeted unit **75/75 PASS**.
- 전체 check PASS: format/lint/typecheck/unit **2114/2114**/mockup+admin build.
- default `demo-denn-emulator` **20/20 PASS**, 별도 `demo-denn-cutover` **4/4 PASS**.
- `git diff --check`, Rules UID-only 동등성, forbidden diff, 검사 포트 잔류 0.
- 고객 entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- Java 21.0.11, firebase-tools 15.22.4와 이미 캐시된 emulator runtime만 사용했다. 설치·다운로드 0.

## 미검증·정지 조건

- 전체 Chromium E2E는 **NOT RUN**. 기존 suite가 보호 대상 spec-018 PNG를 다시 쓴다. Founder가
  2026-08-26 스펙 075에 대한 별도 예외 종료를 승인했으며 full-E2E PASS로 기록하지 않는다.
- 실제 UID, 실제 Firebase/project/bucket/network/live, Rules/Hosting deploy, SDK adapter, apps/UI,
  URL/clipboard, orphan delete/cleanup은 미구현·NOT TESTED·금지다.
- 종료 내용 commit 하나로 fast-forward push하고 실제 hash는 외부 보고한다. 다음 스펙은 별도 수동
  지시 전 시작하지 않는다.
