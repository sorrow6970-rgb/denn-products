# NEXT CLAUDE PROMPT

상태: `FOUNDER_DECISION_REQUIRED`
active_unit: `spec-036-admin-auth-private-state-read-implementation-approval`

**스펙 036 구현 계약이 작성됐다: `docs/rebuild/specs/036-admin-auth-private-state-read.md`.**
**구현은 아직 승인되지 않았다.** Founder가 계약을 검토해 **구현 착수를 별도로 승인**하기 전에는
`packages/firebase`·`apps/admin`에 코드를 쓰지 않고 **`firebase` SDK도 추가하지 않는다**.

## 확정된 입력

- Founder 결정 정본(2026-08-10): `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`
  — F-A Auth 도입(**1단계 = 인증 + `admin/state.json` 읽기, 쓰기 0**, 기존 비익명 계정 1개,
  `firebase` SDK 의존성 승인, Rules 변경 미승인) · F-B 발행 제외 · F-C 읽기만 공유 ·
  F-D 정규화 메모리 전용 · **F-E E3-strong(쓰기 구현 차단)**
- 계약(2026-08-10, 기준 `6daf365`): 스펙 036

## Founder가 승인해야 할 것

1. 계약 내용 — 특히 **§2 `firebase@12.16.0` 정확 고정과 서브패스 `@denn/firebase/admin-read` 전용
   공개**, **§3 기본 비활성 + `VITE_DENN_ADMIN_FIREBASE_ENABLED=true`와 완전한 config가 있을 때만
   초기화**, **§5 안전 오류 코드 15개**, **§7 허용 파일 9경로**
2. **구현 착수** 자체

## 승인되면 첫 작업 순서 (참고)

`firebase@12.16.0` 추가 + lockfile 갱신 → `packages/firebase/src/admin-read/**`(합성 fake 주입 가능한
AuthPort·AdminStateReadPort) → `apps/admin/src/admin-read/**` + 카드 배치 →
`tests/e2e/admin-auth-read.spec.ts` → §9 게이트 전량.

## 계속 금지 (승인 전후 모두)

- 실제 Firebase / network / live / emulator / 운영 데이터 접근
- `storage.rules` · `firestore.rules` · `firebase.json` · Hosting · deploy 변경
- 쓰기 · 발행 · 업로드 · revision · 충돌 병합 · tombstone · 마이그레이션 코드
- `packages/firebase/src/index.ts` 루트 배럴 수정 (고객 번들 오염)
- `apps/mockup/**` · `packages/render/**` · `packages/shared/**` · legacy HTML
- 실제 config 하드코딩 · `.env` commit · live 테스트 파일 작성
- 신규 계정 · 다중 계정 · 역할 권한 UI

## UNCONFIRMED (추정 금지)

`firebase@12.16.0`의 실제 존재와 Node 24 / Vite 8 / TS 7 호환성 · 운영자 계정의 실재·로그인 가능 여부 ·
`storage.rules`의 실제 배포 여부와 거부 동작 · 실제 `admin/state.json`의 존재·크기·내용 ·
실제 Storage CORS와 `getBytes` 동작.

자동화 루프는 삭제된 상태이며 **새 자동화나 반복 작업을 만들지 않는다**. 인수인계는 수동으로만 한다.
알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않는다.
