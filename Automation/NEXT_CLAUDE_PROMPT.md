# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

## 스펙 031 구현

기준 브랜치 `rebuild/modern-studio`, 기준 커밋 `e3dc2b1`.

먼저 다음 정본을 전부 읽는다.

- `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`
- `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`
- `docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`
- `Automation/DENN_AUTOMATION_RUNBOOK.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `docs/codex-claude-handoff/CURRENT.md`

스펙 허용 파일과 계약 안에서만 구현한다.

1. 액자 `textZones`와 다섯 key만 결정적 `draw-text` plan으로 만든다.
2. wrap은 주입 측정 포트로 plan 생성 시 확정한다. 기본 80 UTF-16 code unit·2줄이며 초과는 차단한다.
3. 고객 색·그림자, defaultTexts 자동값, case 자유 배치 텍스트는 만들지 않는다.
4. 시계는 plan 밖 물리적 하드웨어 DOM overlay다. custom image timer 0, text fallback은 분 경계 갱신,
   활성 timer 1개 이하와 lifecycle 정리를 보장한다.
5. 신규 의존성, admin, geometry, image owner, template art, placement, 운영 HTML,
   Firebase/network/live/deploy, print/export 구현은 금지한다.

코드/test와 문서를 분리해 일반 fast-forward push한다. 필수 unit·Chromium E2E 및 전체 게이트 결과를
handoff에 기록하고 미검증 항목은 NOT TESTED로 남긴다.

스펙 018 PNG 두 개는 restore/checkout/stage/commit하지 않는다. 다른 예상 밖 파일은 사용자 소유로
보고 멈춘다. push 후 HEAD=origin 0/0과 `READY_FOR_CODEX`를 기록하며 Codex 승인 전 종료 문서나
다음 스펙을 시작하지 않는다.
