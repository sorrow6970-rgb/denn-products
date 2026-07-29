# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

# 스펙 028 구현 — 템플릿 아트 stretch·CORS-clean owner

정본:
`docs/rebuild/specs/028-template-art-stretch-cors-owner.md`

Founder 결정은 `아트 실패 시 미리보기 차단`이다. 스펙 전체를 읽고 허용 파일 안에서만
구현·검증한다.

핵심:

- 신규 `draw-image-stretch`, source-crop 0
- case images → art → guides, frame image → art → inner-border
- legacy builder crop variant request 전 거부
- 스펙 018 projection + 기존 Firebase trust boundary 재사용
- remote는 crossOrigin anonymous를 src보다 먼저, 실패 시 재시도 0
- global/cross-selection cache 0
- URL/token/base64는 owner closure·drawable 밖 0
- required art loading/failure/unsupported는 Canvas 0
- no-art/builtin/generated-preview는 기존 preview 유지
- 합성 route로 ACAO 성공·실패와 실제 픽셀/CORS-clean 검증

코드/test와 문서를 분리 commit하고 일반 fast-forward push한다. HEAD=origin,
ahead/behind 0/0을 확인한다. 아래 PNG 2개는 restore, checkout, stage, commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

실제 Firebase GET, 운영 이미지 다운로드, CORS/Rules/Hosting 변경, live/deploy는 금지한다.
필요하면 즉시 BLOCKED로 보고한다. 다음 기능은 시작하지 않는다.
