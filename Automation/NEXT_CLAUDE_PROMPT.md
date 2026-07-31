# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

# 스펙 030 고객 사진 90° 단위 회전 구현

Claude Code가 2026-07-31에 `WAITING_FOR_CLAUDE` 지시를 소비해 문서 전용으로 결정 정본을 기록했다.

- 정본: `docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`
- 승인 문장(원문): `스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인하고 자동화 재개.`
- 기록 범위: R-1~R-6(Founder) + C-1~C-9(Codex 구조 계약, 원문 보존) + 불변식 7개 +
  미결정·미검증 7개
- 커밋 파일(허용 목록과 정확히 일치): 위 결정 문서(신규), `docs/codex-claude-handoff/CURRENT.md`,
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `Automation/DENN_AUTOMATION_STATE.md`,
  이 문서
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff 0, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·secret 접근 0
- `git diff --check` clean, 일반 fast-forward push, HEAD=origin, ahead/behind 0/0
- 알려진 스펙 018 PNG 2개는 restore·stage·commit하지 않았다(working tree에 그 2개만 잔존)

Codex가 결정 정본 `cf1cfd2`를 검토해 승인했고 구현 계약을 확정했다.

정본:

- `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
- `docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`

정본을 처음부터 끝까지 읽고 허용 파일 안에서만 구현하라. 핵심은 slot별
`rotationQuarterTurns: 0|1|2|3`, 좌/우 90° 버튼, 회전을 포함한 probe/실제 plan,
회전 footprint 기반 `maxPan`, `draw-image-cover`의 선택 필드와 executor 내부
save/clip/translate/rotate/draw/restore다. scale 1.0~5.0, 빈 공간 금지, normalized pan,
D-9 초기화 행렬, template art 고정을 유지한다.

invalid/hostile transform을 복구하거나 기본 회전으로 fallback하지 않는다. geometry, image
owner, template art binding, placement, lockfile, 신규 의존성, 운영 경로는 수정하지 않는다.
EXIF를 직접 파싱하지 않고 합성 fixture로 브라우저 decode를 실측한다.

스펙의 unit/Chromium/전체 게이트를 수행하고 검증하지 못한 항목은 NOT TESTED로 기록한다.
허용 파일 확장이 필요하거나 STOP 조건이 발생하면 즉시 멈춰 근거와 최소 확장안을 보고한다.

제품 코드·test 커밋과 문서 커밋을 분리해 일반 fast-forward push한다. 알려진 스펙 018 PNG
2개는 restore·checkout·stage·commit하지 않는다. 완료 후 HEAD=origin, ahead/behind 0/0을
확인하고 `READY_FOR_CODEX`로 전환한다. Codex 승인 전 종료 문서나 다음 스펙을 시작하지 않는다.
