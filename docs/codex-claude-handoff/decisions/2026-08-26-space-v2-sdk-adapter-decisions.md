# Space V2 Firebase SDK adapter Founder decisions — 2026-08-26

## 승인

Founder가 이 대화에서 다음을 명시 승인했다.

- **KK-1=A** — 스펙 076 Firebase SDK adapter와 local emulator 통합 착수.
- **KK-2=A** — 기존 admin 기본 Firebase app/Auth만 재사용하고 설정 불일치는 fail-closed.
- **KK-3=A** — Firebase SDK는 factory 내부 dynamic import, emulator 옵션은 `demo-` project 선검사.
- **KK-4=A** — `uploadBytes` → `setDoc` → 필요 시 `getDocFromServer` facade만 구현.
- **KK-5=A** — 합성 UID와 local emulator만 사용. 실제 UID·live·deploy 금지.
- **KK-6=A** — 앱/UI 변경이 없는 package seam이므로 전체 Chromium E2E는 NOT RUN 예외. targeted
  unit·전체 check·동일 adapter local emulator 통합으로 검증하며 full-E2E PASS는 주장하지 않는다.

## 승인 범위

- `packages/firebase/src/space-write/`의 SDK facade, public subpath export, 단위 테스트와 opt-in emulator
  통합 테스트.
- 기존 `firebase.emulator.json`, Rules와 `demo-denn-emulator` 재사용. Rules/config 자체는 변경하지 않는다.
- 기존 기본 app이 없으면 default app 하나를 초기화하고, 있으면 정확한 공개 config 일치 확인 후
  재사용한다. named app으로 운영자 Auth 상태를 분리하지 않는다.

## 계속 금지

`apps/**`, UI/UX/route/URL/clipboard, 실제 UID, 실제 Firebase/project/bucket/network/live 데이터,
Rules·Hosting deploy, orphan delete/cleanup, mapping/customMetadata/backend, 자동 retry, publish, 신규
dependency와 package/lockfile 변경은 승인하지 않는다.
