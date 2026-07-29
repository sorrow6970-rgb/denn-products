# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

# 스펙 026 사전 조사 — 고객 상품 미리보기 연결 계약

스펙 025의 product-plan adapter를 실제 고객 Canvas에 연결하기 전에 필요한 근거를 읽기
전용으로 조사한다. 구현·UI 수정·실제 네트워크 요청은 하지 않는다.

## 조사 질문

1. 현재 `apps/mockup` 선택 상태에서 case/frame plan을 만들기 위해 부족한 값은 무엇인가?
   모델·템플릿·사이즈·색·사용자 이미지·transform·logical width별 공급원을 파일/라인으로 표로 만든다.
2. 레거시 고객 앱의 파일 선택 → decode → intrinsic size → transform 초기화 → image binding →
   Canvas draw → cleanup 생명주기를 파일/라인 근거로 추적한다.
3. `data:`/blob URL/HTMLImageElement/ImageBitmap 중 실제 레거시와 현재 브라우저 계약이 무엇인지
   확인하고, 메모리·URL revoke·StrictMode·stale load·abort 실패 경계를 정리한다.
4. 사용자 로컬 이미지와 카탈로그/Firebase 이미지를 분리한다. CORS-clean이 필요한 경로와 필요하지
   않은 경로를 근거로 구분하며 실제 URL·token은 복사하지 않는다.
5. case body color와 frame color의 레거시 팔레트·선택 기본값·상태 저장 위치를 확인한다.
   새 기본값이나 첫 색 자동 선택을 제안하지 말고 미확정은 `NOT DECIDED`로 둔다.
6. case `modelLogicalSize`와 frame `logicalWidth`를 스펙 022의 CSS logical size 불변식에 연결할
   수 있는지 확인한다. 모바일 viewport, scroll/scale, DPR 책임을 구분한다.
7. 스펙 022 surface, 023 projection, 025 adapter를 연결하는 최소 책임 분리를 제안한다.
   React component/hook, 순수 state/controller, image-binding owner의 입력·출력·cleanup을 표로 만든다.
8. 접근성 요구를 조사한다: 파일 input label, 오류·진행 상태, 이미지 교체, 키보드 흐름,
   320px/200% 확대에서 필요한 계약.
9. 실제 상품 Canvas 연결에 앞서 반드시 Founder 결정이 필요한 항목과, 근거만으로 확정 가능한 항목을
   별도 표로 구분한다.
10. 스펙 026의 최소 구현 범위, 허용 파일 후보, unit/E2E/실제 브라우저 검증 항목, 명시적 제외 범위를
    제안한다.

## 산출물과 허용 파일

- 신규:
  `docs/codex-claude-handoff/reviews/2026-07-29-customer-preview-connection-investigation.md`
- 최소 상태 갱신:
  `docs/codex-claude-handoff/CURRENT.md`
- 현재 프롬프트 기록 append:
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

위 3개 외 파일은 수정하지 않는다. 조사 보고서와 상태 문서를 하나의 문서 전용 commit으로 만들고
현재 브랜치에 일반 fast-forward push한 뒤 `HEAD=origin`, ahead/behind 0/0, clean을 보고한다.

## 금지

- 앱·패키지·CSS·테스트·설정·lockfile·PNG 수정
- 실제 Firebase GET, 이미지 다운로드, live test, 브라우저 파일 선택
- 운영 데이터·상품명·ID·전체 URL·token·base64 복사
- UI·Canvas 연결·파일 업로드·색 선택 구현
- Firebase SDK/Auth/write, Rules/CORS/Hosting, deploy
- 다음 기능 구현 또는 스펙 026을 DONE으로 기록

근거가 충돌하거나 제품 결정이 필요하면 보고서에 `FOUNDER_DECISION_REQUIRED`로 기록하고 구현하지
않는다. 예상 밖 파일·dirty 상태·divergence가 있으면 `BLOCKED`로 멈춘다.
