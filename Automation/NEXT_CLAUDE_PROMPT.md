# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

**다음 작업: "Auth + `admin/state.json` 읽기 전용 구현 계약 작성" (Codex).**
Claude는 계약이 나오기 전에는 구현을 시작하지 않는다.

## 확정된 입력

Founder가 2026-08-10에 F-A~F-E를 **실제로 승인**했다. 정본:
`docs/codex-claude-handoff/decisions/2026-08-10-admin-auth-write-boundary-decisions.md`
(승인 원문 수록). 근거 조사는
`reviews/2026-08-10-admin-auth-write-founder-decision-options.md`이며, 그 문서 §8의 승인 프롬프트는
**예시였고 이제 superseded**다.

- **F-A** Auth 도입. **1단계 = Auth + `admin/state.json` 읽기, 쓰기 0.** 기존 비익명 운영자 계정 1개.
  **`firebase` 모듈러 SDK 신규 의존성 승인.** 신규/다중 계정·역할·**Rules 변경은 미승인**.
- **F-B** 발행 제외. 쓰기를 열더라도 admin 상태 저장만. 저장 UI에 **"발행되지 않음" 표시 필수**.
- **F-C** `admin/state.json`은 **읽기만 공유**. 향후 쓰기는 **격리된 rebuild 전용 경로**(경로는 계약에서).
- **F-D** 정규화 결과 **메모리 전용**, **저장 payload에 미포함**, 되쓰기·삭제·마이그레이션 금지.
- **F-E** **E3-strong** — last-writer-wins 불허, 원자성 조사·검증 전까지 **쓰기 구현 차단**.

## 계약이 확정해야 할 것

1. 허용 파일 목록과 금지 범위
2. AuthPort 형태 — 비익명 판정·세션 복원, **실패 시 조용한 no-op 금지**
   (`denn-admin.html:733`·`:735`의 침묵 계승 금지 / `:14810-14817`의 throw 규율은 계승 후보)
3. 읽기 port와 **경로 allowlist** — 이 단계에서 허용되는 원격 객체는 `admin/state.json` **읽기뿐**
4. **합성 fake 검증 범위** — `packages/firebase/src/public-catalog/reader.ts:1-3`의 주입 transport 선례와
   `vitest.config.ts:17`의 `*.live.test.ts` 기본 게이트 제외를 따른다. **실제 network 0**
5. `firebase` SDK 추가 방식(정확 버전, lockfile 변경 범위) — 추가는 승인됐고 **실행은 구현 단계**
6. NOT TESTED 경계(실제 Rules 거부·세션 만료·실기기)

## 계약에 넣지 않는 것

쓰기 port · 저장 UI · 발행 · revision/충돌 해소 · tombstone · 마이그레이션.

## 계속 금지

제품 구현 착수(별도 승인 필요) · 실제 Firebase/network/live/emulator/운영 데이터 접근 ·
Rules/Hosting/배포 · 신규 계정·다중 계정·역할 · 발행 · 레거시 `admin/state.json` 공유 쓰기 ·
legacy `wcm`/`hcm` 되쓰기·삭제·마이그레이션.

## UNCONFIRMED (추정 금지)

운영자 계정의 실제 존재·접근 가능 여부 · Rules의 실제 배포 여부와 거부 동작 ·
Firebase Web SDK의 Storage 원자적 precondition 지원 여부 · Firestore 잠금/Rules 변경 필요 여부 ·
실제 `admin/state.json` 내용.

자동화 루프는 삭제된 상태이며 **새 자동화나 반복 작업을 만들지 않는다**. 인수인계는 수동으로만 한다.
알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않는다.
