# 스펙 039 — G-4 orphan 식별 구조 A

상태: **DONE / CODEX_PASSED / LOCAL_ONLY**
Founder 승인: **2026-08-14 — D-1=A, D-2=O-3, D-3=N**
선행: 스펙 037 `DONE / CODEX_PASSED`, G-4 결정 정본

## 1. 승인 범위

식별 구조만 준비한다. 실제 객체 삭제, Storage delete 권한, 클라이언트 정리 API, 자동 정리,
보존 주기·개수, backend/Admin SDK, 배포, 실제 Firebase 접근은 승인되지 않았다.

## 2. 고정 구조

- REC: `/rebuildAdminStateObjects/{recId}`
- `recId`: Storage 객체 ID와 동일한 소문자 UUID + `.json`
- REC 데이터: 정확히 `{ claimedBase: non-negative int }`
- REC은 create-only이며 read/update/delete를 허용하지 않는다.
- head: `/rebuildAdminState/head`, 정확히 `{ schemaVersion: 1, revision, recId }`
- 전체 Storage 경로는 클라이언트가 `rebuild-admin-state/objects/` + `recId`로 만든다.

## 3. 저장 순서

1. 입력·인증 검증
2. UUID를 한 번 생성하고 `recId` 결정
3. REC을 별도 Firestore commit으로 먼저 create
4. 동일 `recId`의 Storage 객체를 create-only upload
5. 기존 단일 head transaction 실행

head create는 `claimedBase == 0`, head update는 `claimedBase == current revision`인 REC만 허용한다.
Storage create도 동일 REC의 존재를 Rules에서 확인한다. 따라서 과거 REC은 재생성할 수 없고,
`A → B → A` 재지정은 서버 규칙으로 거부된다.

## 4. 오류 계약

- REC의 확정 실패: `WRITE_CLAIM_FAILED`
- REC 결과 미확정: `WRITE_CLAIM_OUTCOME_UNKNOWN`
- 두 오류는 자동 재시도하지 않는다. 결과 미확정이면 Storage와 head를 호출하지 않는다.
- 기존 upload/head 결과 미확정 계약은 유지한다.

## 5. 검증

- fake: `REC → upload → transaction` 순서, REC 실패 시 upload/transaction 0, callback 재실행 시 REC 1회
- adapter unit: REC 문서 ID와 `claimedBase` 전달
- emulator Rules: 승인 UID, REC 없는 upload/head 거부, REC write-once, object create-only,
  같은 base 두 writer 중 한 head만 이동, `A → B → A` 거부, delete 전부 거부
- 기본 unit/typecheck/check와 고객 번들 hash 회귀 확인

## 6. STOP

실제 UID, IAM 연결, Rules 배포, 실제 프로젝트·bucket, UI 연결, delete 권한/API, 정리 주체·주기,
신규 의존성·다운로드가 필요하면 중단한다.

## 7. CODEX 검수 (2026-08-14)

- 판정: **CODEX_PASSED**, 발견 결함 0.
- targeted unit 51/51, 전체 unit 1322/1322, Chromium E2E 134/134,
  local `demo-denn-emulator` Rules 13/13, `git diff --check` PASS.
- 고객 번들 SHA-256:
  `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`.
- 실제 Firebase·실제 UID·IAM·배포·UI·delete·자동 정리는 NOT TESTED/금지 유지.
- 구현·종료 커밋: `7843e85` (일반 fast-forward push 완료).
