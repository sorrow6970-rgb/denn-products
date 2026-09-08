# Spec103 — 룸 배경 입력정책 조사 인수인계

2026-09-08. 기준 HEAD=origin 추적ref cc0bc4c·0/0. 동일 Codex 문서 조사·검토.
[조사 계약](../rebuild/specs/103-room-background-input-policy-investigation.md),
[결과·RG-3 선택지](../codex-claude-handoff/reviews/2026-09-08-spec-103-room-background-input-policy-investigation.md).

최신: 사용자 `승인하고 계약 검증 해줘`로 [RG-3=A](../codex-claude-handoff/decisions/2026-09-08-rg3-room-background-input-policy-decisions.md) 승인.
[104 handoff](2026-09-08-spec-104-room-background-input-preflight-handoff.md)가 현재 포인터다.
104 CONTRACT_REVIEW_PASSED/READY_FOR_IMPLEMENTATION(동일 Codex), 이번에는 계약까지만, 제품 미착수.
아래 선택 대기/7문서는103 조사 당시 이력. 현재 누적11문서 unstaged, commit/push0.

## 결과

- 026 owner는 decode 전 byte/형식/픽셀 예산 검사기가 아니다. 기존 PNG proof 후보는 앞부분/치수만 검사한다.
- EXIF 시험은 적용/미적용 치수를 둘 다 허용한다. 기존 PASS를 룸 방향 일치 보장으로 사용하지 않는다.
- 101에서 누락한 상위 성능정책20MB/40MP/화면2048–2560px/preview 약8MP/DPR2를 확인했다.
  룸 전용 정확 byte/입력변/동시자원·실기기 안전 예산은 여전히 미확정이다.
- RG-3=A 제안: 첫 룸 배경은 정적 JPEG·PNG, 파일≤20,000,000 bytes·이미지≤40,000,000 pixels,
  초과/미지원/검증 불가 명시 거부, 자동 형식변환/초과입력 자동축소0. 아직 미채택.
  허용입력의 화면 다운샘플은 별개다. B는 추가형식/변환 요구부터 별도 조사.
- A를 선택해도 다음은 pure preflight의 구현 계약·공식형식 근거·합성 시험 설계부터다.
  실제 사진/룸UI/운영 활성화 승인 아님. 기존 고객/admin/Space 정책을 바꾸지 않는다.

## 상태와 다음 지시

DOCUMENT DONE / DOCUMENT_REVIEW_PASSED(동일 Codex). active spec-103-room-background-input-policy,
state FOUNDER_DECISION_REQUIRED, next FOUNDER_RG3_BACKGROUND_INPUT_POLICY.
제품 완료 정본은102 DONE/CODEX_PASSED 유지. 이번 문서7개만 미커밋이며 stage/commit/push0.
보호/별도dirty22 유지. 제품/test/config/Rules/기존증거/실제사진/서비스/브라우저/emulator 실행0.
다음104 계약/제품 구현은 RG-3 답변 전 시작하지 않는다. 예약 자동화0.

문서 링크·범위·SHA·diff 검증 결과는 아래에 실측 기록한다. 과거102 테스트 수를103 결과로 사용하지 않는다.

문서 검증 실측: 신규3문서 링크/지정라인23/23, 시작dirty22/22 SHA256 동일, 정확 허용7문서만 변경, git diff --check PASS. 산술20,000,000/20,971,519/971,519 bytes와RGBA8 가정152.587890625 MiB 대조. HEAD=origin 추적cc0bc4c·0/0, staged0, commit/push0. 제품/시험/브라우저 실행0.
