# NEXT CLAUDE PROMPT

상태: `CODEX_PASSED / READY_FOR_COMMIT`

# 스펙 027 종료 문서 처리

Codex 승인 기준 HEAD는 `06d9700`이다. 기능 코드·설정·테스트를 수정하지 말고 종료 문서만
처리한다.

허용 파일:

- `docs/rebuild/specs/027-customer-preview-composer-connection.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- `docs/handoff/2026-07-29-spec-027-customer-preview-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`

종료 기록:

- Codex 최종 판정: 승인 가능
- 승인 기준 HEAD: `06d9700`
- unit 802/802
- E2E 78/78 PASS, exit 0
- mockup JS/CSS gzip 77.55/3.53 kB
- admin JS/CSS gzip 61.09/2.64 kB
- frame canonical fill dedup과 source-order 첫 항목 보존
- 고객 `/` 실제 case/frame Canvas 픽셀, keyboard, 320px/desktop, axe, 누출 0 검증
- 실제 기기·200% 확대·운영 이미지·대용량 성능·EXIF 회전은 NOT TESTED
- template art, Firebase image CORS-clean, pointer, print, 저장·주문, deploy는 미착수

아래 PNG 2개는 restore, checkout, stage, commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

문서 전용 커밋을 일반 fast-forward push하고 HEAD=origin, ahead/behind 0/0을 확인한다.
working tree는 PNG 2개 때문에 dirty라고 기록한다. 다음 기능은 시작하지 않는다.
