# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

# 스펙 026 구현 — 로컬 사용자 이미지 binding 생명주기

정본:
`docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`

위 스펙을 처음부터 끝까지 읽고 허용 파일 안에서만 구현·검증한다.

핵심 범위:

- framework-free local image binding controller
- private blob URL + `HTMLImageElement` decode
- safe synthetic imageRef, intrinsic size, 고정 초기 transform
- generation 기반 stale 차단
- 성공·실패·교체·clear·dispose의 정확한 URL/handler/binding cleanup
- 필요 시 얇은 `useSyncExternalStore` React wrapper
- 전용 E2E fixture에서 합성 파일→실제 Chromium decode→Canvas 픽셀 검증

고객 production 화면에는 mount하지 않는다. 색·frame logical width·멀티 zone 공유·template art·
pointer·print·Firebase·deploy는 구현하지 않는다.

코드/test와 문서/DONE/handoff는 분리 커밋하고 일반 fast-forward push한다. 전체 게이트와
HEAD=origin, ahead/behind 0/0, clean을 보고한 뒤 다음 기능은 시작하지 않는다.

허용 파일 밖 변경, 신규 의존성, 실제 network, 운영 데이터, 제품 결정이 필요하면 즉시
`BLOCKED` 또는 `FOUNDER_DECISION_REQUIRED`로 멈춘다.
