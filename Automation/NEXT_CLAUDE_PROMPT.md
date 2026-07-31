# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

# 스펙 030 Founder 결정 정본 기록 완료 — Codex 구현 계약 대기

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

## Codex 다음 작업

이 결정을 입력으로 **스펙 030 구현 계약**(`docs/rebuild/specs/030-*.md`)을 작성한다.
구현 계약에는 최소한 다음을 명시한다.

- 허용 파일 목록(특히 `packages/render` 계약 변경 범위 — "packages 무변경" 경계를 처음 깨는 지점)
- `rotationQuarterTurns` 저장·검증·거부 규칙과 오류 우선순위에서의 위치
- probe plan → `maxPan` → 실제 plan 파이프라인에서의 회전 취급
- case multi-zone 슬롯별 회전 UI와 초기화 행렬(029 D-9 상속) 명세
- 합성 EXIF fixture 실측 검증 설계와 NOT TESTED 경계

## Claude 다음 작업

**없다.** 구현 계약이 저장소에 기록되고 상태가 `WAITING_FOR_CLAUDE`로 바뀌기 전까지
회전 관련 제품 코드·테스트·CSS·설정을 작성하지 않는다. 이 기간에는 저장소를 수정하지 않고
폴링만 유지한다. 알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
