# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

# 스펙 028 사전 조사 — 템플릿 아트 Canvas 합성·CORS-clean 계약

기준 HEAD: `beb16ea`

읽기 전용으로 다음을 조사한다. 구현·설정·테스트·PNG·lockfile는 수정하지 않는다.

1. 레거시 case/frame 템플릿 아트의 정확한 layer 순서, 좌표, clip, opacity, fallback
2. 스펙 018 image projection의 source kind와 Firebase trust boundary를 Canvas decode에
   재사용할 수 있는지
3. `crossOrigin="anonymous"` 설정 시점, Storage bucket CORS 요구와 taint 실패 판정
4. 운영 URL을 fetch하지 않고 합성 fixture만으로 검증 가능한 경계
5. current render-plan command vocabulary에 template-art command가 필요한지, 기존
   `draw-image-cover` 재사용이 의미적으로 안전한지
6. uploaded case template, builtin frame template, generated preview 각각의 지원/거부 계약
7. template art decode owner의 API, cache identity, stale generation, cleanup 책임
8. 사용자 사진 binding과 template art binding을 합칠 때 imageRef namespace·secret 경계
9. load 실패 시 preview 차단/placeholder/body-only 중 레거시 근거와 제품 결정 필요 항목
10. print/export·pointer보다 먼저 구현해야 하는 최소 순서와 허용 파일 후보
11. 실제 bucket CORS·token 수명·운영 이미지 분포 중 `NOT VERIFIED` 항목
12. Firebase/Hosting 설정 변경 또는 실제 network가 필요한 지점과 STOP 조건

산출물:

- `docs/codex-claude-handoff/reviews/2026-07-29-template-art-canvas-cors-investigation.md`
- `docs/codex-claude-handoff/CURRENT.md` 최소 갱신
- `Automation/DENN_AUTOMATION_STATE.md`와 `Automation/NEXT_CLAUDE_PROMPT.md`는 이 Codex
  handoff 상태를 포함한 채 조사 완료 상태로 함께 정리

근거는 파일·라인으로 인용하고 `CONFIRMED`, `NOT DECIDED`, `NOT VERIFIED`, `NOT TESTED`를
구분한다. 실제 Firebase GET, 이미지 다운로드, live test, CORS 변경, Rules/Hosting/deploy,
운영 URL/token/base64 복사는 금지한다.

문서 전용 commit을 일반 fast-forward push하고 HEAD=origin, ahead/behind 0/0을 확인한다.
아래 PNG 2개는 restore, checkout, stage, commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

조사 후 구현 스펙을 작성하거나 다음 기능을 시작하지 말고 Codex 판정을 기다린다.
