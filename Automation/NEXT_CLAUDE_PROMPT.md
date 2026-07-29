# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

# 스펙 027 구현 — 고객 상품 미리보기 composer 연결

정본:
`docs/rebuild/specs/027-customer-preview-composer-connection.md`

Founder가 스펙의 권장 UX 묶음을 승인했다. 스펙 전체를 읽고 허용 파일 안에서만 구현·검증한다.

핵심:

- 선택 완료 후 명시적 `미리보기 만들기` 단계
- 색 자동 선택 0
- case legacy solid 8색, transparent 제외
- frame catalog의 valid solid 색만, grain 근사 금지
- 필수 local image 준비 전 Canvas 0
- case zone별 독립 image owner, 공유 fallback 0
- frame content-box width 기반 logical width, max 500, resize plan 재생성
- projection → adapter → binding map → surface의 기존 경계 유지
- 실제 고객 `/` Chromium 픽셀·접근성·누출·stale 검증

현재 아래 PNG 2개는 Codex E2E가 재생성한 알려진 dirty 산출물이다. restore, checkout,
stage, commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

코드/test와 문서를 분리 commit하고 일반 fast-forward push한다. HEAD=origin,
ahead/behind 0/0을 보고하되 working tree는 위 PNG 2개 때문에 dirty라고 정확히 기록한다.
다음 기능은 시작하지 않는다.

허용 파일 밖 변경, 신규 의존성, packages API 변경, template art/Firebase image Canvas 합성,
실제 network/live/deploy, 계약 불명확이 필요하면 즉시 `BLOCKED` 또는
`FOUNDER_DECISION_REQUIRED`로 멈춘다.
