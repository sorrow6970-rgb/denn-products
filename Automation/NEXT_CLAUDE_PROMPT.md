# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 스펙 032 Founder 결정 정본 기록 완료 — Codex 구현 계약 대기

Claude Code가 2026-07-31에 Founder 결정을 문서 전용으로 기록하고 일반 fast-forward push했다.

- 정본: `docs/codex-claude-handoff/decisions/2026-07-31-spec-032-print-export-decisions.md`
- 기준 HEAD `d55a9b8`
- 제품 코드·테스트·CSS·설정·manifest·lockfile diff **0**, 신규 의존성 0, 인쇄 제품 코드 **0**
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

## ⚠️ 절차 기록

Codex의 마지막 지시는 "보완된 Founder 질문을 **Codex가 승인하기 전 확정하지 않는다**"였으나,
Founder가 순서를 **명시적으로 앞당겨** 일괄 승인했다. **조사 보고서 자체에 대한 Codex 재검토는
여전히 미완**이다. 재검토에서 질문의 전제가 틀렸다고 밝혀지면 해당 결정 항목은 다시 열어야 한다.

## 확정된 것

- **P-1** 액자 인쇄만. 케이스는 별도 스펙
- **P-2** 물리 치수는 **카탈로그 명시 필드에서만**, 이름 파싱 금지. cm 필드가 없으므로 **스키마 확장 +
  admin 입력 UI는 별도 스펙**. **치수가 없으면 인쇄를 만들지 않는다**
- **P-3** 경고가 있으면 **인쇄 파일을 만들지 않는다(fail-closed)**. 부분 파일 0
- **P-4a** 레거시 수치는 **임시값**으로 구현·검증하되 **인쇄소 확인 전까지 업로드·주문 전송·배포 차단**
- **P-5** 색·사진 transform과 시계 유무는 담고, **고객 문구 원문은 텍스트로 저장·전송하지 않는다**
- **P-6** 미리보기와 인쇄의 **줄바꿈 동일 필수**(C-1 후보 선택에 제약만 건다)

## Codex 다음 작업

이 결정과 보완된 조사 보고서를 입력으로 **스펙 032 구현 계약**(`docs/rebuild/specs/032-*.md`)을 작성한다.
최소한 다음을 확정해 달라.

- **★ C-1**: 인쇄 좌표를 얻는 방법 — 조사 §8.1의 **후보 A / B / C 중 택일**
  (A는 계약 변경 0이고 `surface.ts`의 DPR 경로로 이미 검증된 패턴이나, 인쇄 배율의 자간 품질이
  NOT VERIFIED다. C는 좌표의 두 번째 진실 원천이라 비권장)
- **C-2~C-8**: 캔버스 소유자 · 이미지 소스 재사용 · 실패 계약 · 회전/pan · 시계 · 오류 payload · 검증
- 허용 파일 목록, 게이트, NOT TESTED 경계
- P-4a의 **출력 차단 조건**을 스펙에 명시적으로 남길 것

## Claude 다음 작업

**없다.** 구현 계약이 Git 히스토리에 기록되고 상태가 `WAITING_FOR_CLAUDE`로 바뀌기 전까지 인쇄 관련
제품 코드·테스트·CSS·설정을 작성하지 않는다. 계약이 untracked면 Founder 상시 승인에 따라 계약과 Codex
전환 문서만 대행 커밋한 뒤 착수한다. 알려진 스펙 018 PNG 2개와
`packages/render/src/plan/index.ts`는 계속 손대지 않는다.
