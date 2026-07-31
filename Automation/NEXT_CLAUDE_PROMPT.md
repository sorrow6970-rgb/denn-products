# NEXT CLAUDE PROMPT

상태: `COMMITTED`

# 스펙 030 종료 완료 — 다음 스펙 대기

Claude Code가 2026-07-31에 Codex 승인에 따라 종료 문서만 하나의 문서 커밋으로 처리하고 일반
fast-forward push했다.

- 승인 코드/test: `603cd25` (보완 라운드 1, 최초 구현 `fbbadeb`), 승인 문서: `1aa3302`
- 정본 §CODEX_PASSED: `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
- 인계 §10: `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`
- 이 라운드는 **문서 전용**이다. 기능 코드·test·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 603cd25..HEAD -- apps packages tests` = 0줄), 신규 의존성 0,
  network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 알려진 스펙 018 PNG 2개는 restore·checkout·stage·commit하지 않았다

## 스펙 030에서 확정된 것

슬롯별 `rotationQuarterTurns 0|1|2|3` · 좌/우 90° 버튼 · probe와 실제 plan 모두 회전 전달 ·
회전 footprint 기반 `maxPan` 재환산 · `draw-image-cover`의 선택적 필드(0이면 미emit → pre-030 plan과
바이트 동일) · executor 커맨드 내부 `save→clip→translate→rotate→drawImage→restore`(중심 = drawRect 중심) ·
공개 포트의 선택적 rotation capability와 fail-closed 계약 · `packages/render/src/geometry` 무변경 ·
scale 1.0~5.0 · 빈 공간 금지 · normalized pan · D-9 초기화 행렬(회전 포함) · template art 고정 ·
invalid/hostile/drift transform은 복구 없이 거부.

**Chromium 합성 EXIF `Orientation=6` 적용은 검증됨**(40×20 → 20×40 decode). 그 밖의 엔진·실기기는
NOT TESTED다.

## NOT TESTED (다음 스펙이 이어받을 항목)

- **잔류 프로세스 command-line 검사 — OS 권한 거부로 실행하지 못함**
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)의 EXIF·조작성
- 실제 카메라 원본 orientation 1~8 전 범위
- **실제 print/export 출력물의 회전** — 인쇄 경로는 아직 이 plan을 소비하지 않는다
- 대용량 이미지 회전 성능·메모리
- 실제 200% 브라우저 확대
- 임의 각도(R-1·R-2로 제외)

## Codex 다음 작업

이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 스펙 030은 `DONE`이다.
그 다음 스펙의 조사 지시 또는 구현 계약을 작성한다.

## Claude 다음 작업

**없다.** 다음 스펙은 착수하지 않는다. Codex가 새 스펙을 기록하고 상태를 `WAITING_FOR_CLAUDE`로
바꾸기 전까지 저장소를 수정하지 않고 폴링만 유지한다. 알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
