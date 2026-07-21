# 003 — 가로 화면 Canvas 3:4 비율 복구

상태: **READY FOR CLAUDE IMPLEMENTATION**

## 목표 (WHY)

모바일 가로 화면에서 Canvas 컨테이너가 `3:4` 비율을 잃고 가로로 납작해지는 결함을 CSS 최소 변경으로 해결한다. 세로·가로·태블릿·데스크톱 전체 viewport에서 Canvas 표시 비율과 DPR backing-store가 각각 올바르게 유지돼야 한다.

## 적용 결정서

- `docs/codex-claude-handoff/decisions/2026-07-21-change-and-patch-policy.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-performance-and-resource-budgets.md`

## 범위 (SCOPE)

### 포함

- `.canvas-wrap`의 상충하는 폭·높이 제약을 단일 폭 제약으로 교체
- 기존 `3 / 4` aspect ratio 유지
- 세로·가로 전체 Playwright viewport에서 Canvas 비율 회귀 검사
- 기존 DPR/backing-store 동작 회귀 확인
- 실제 기기 4환경의 세로↔가로 회전 재검증 기록

### 제외

- Canvas 렌더링 수학·`useCanvasDpr`·DPR 상한 변경
- Canvas 자체에 두 번째 비율 보정 추가
- 스펙 002의 확대·키보드·CTA 코드 변경
- 카라멜 앰버 토큰·명암비·PNG 변경
- bottom sheet·Fullscreen·orientation lock 변경
- 새 의존성·JavaScript resize 보정·timer 추가
- 기존 운영 HTML·Firebase·전체 스캐폴드 변경

## 대상 (WHERE)

- `poc/platform-compatibility/src/styles.css`
- `poc/platform-compatibility/tests/e2e/viewport.spec.ts`
- 완료 결과 문서:
  - `poc/platform-compatibility/results/device-matrix.md`
  - `docs/codex-claude-handoff/CURRENT.md`
  - `docs/2026-07-21-poc-001-handoff.md`

## 증거와 원인 계약

- 실기기 증거: `KakaoTalk_20260721_220932985.jpg`
- 카카오 인앱 가로 화면 측정: CSS `794×247`, backing `1588×494`, DPR `2`.
- DPR/backing 배율은 정상이나 CSS 박스 비율은 약 `3.2:1`로, 계약값 `3:4(width/height=0.75)`를 위반한다.
- 원인은 `.canvas-wrap { width:100%; aspect-ratio:3/4; max-height:60vh }`에서 가로 화면의 `max-height`가 높이만 클램프하고 `width:100%`가 남아 비율을 깨는 CSS 제약 충돌이다.
- `useCanvasDpr` 또는 Canvas drawing 코드를 원인으로 취급하거나 수정하지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 공식 `.canvas-wrap` 규칙 직접 수정

기존 공식 selector 한 곳을 다음 계약으로 수정한다.

```css
.canvas-wrap {
  width: min(100%, 45vh);
  aspect-ratio: 3 / 4;
  margin-inline: auto;
}
```

- 기존 `max-height: 60vh`는 제거한다.
- 기존 `display`, `place-items`, `background`, `border-radius`, `overflow`는 유지한다.
- `calc(60vh * 3 / 4)`, `!important`, 후행 중복 selector, media-query별 보정, JS inline style을 사용하지 않는다.
- 내부 `.canvas-wrap canvas { width:100%; height:100% }`는 변경하지 않는다.
- `45vh`는 `3:4` 비율에서 높이 최대 `60vh`가 되도록 유도하는 단일 폭 상한이다. 별도의 `60vh` 높이 상한을 다시 추가하지 않는다.

### 2. E2E 비율 회귀 검사

기존 `tests/e2e/viewport.spec.ts`의 `MATRIX` 반복 안에 Canvas 검사를 추가한다.

- `canvas`의 `getBoundingClientRect()`를 읽는다.
- 모든 기존 10개 viewport에서 다음을 검증한다.
  - `width > 0`
  - `height > 0`
  - `Math.abs(width / height - 0.75) <= 0.01`
- 실패 메시지에는 viewport 이름과 실제 width·height·ratio를 포함한다.
- 특히 기존 landscape 3개(`844×390`, `932×430`, `1024×768`)가 반드시 같은 검사 경로를 통과해야 한다.
- 고정 sleep, 별도 테스트용 제품 코드, viewport 목록 복제를 추가하지 않는다.

### 3. DPR/backing 분리 검증

- 비율 검사는 CSS 박스 계약이고 DPR은 backing-store 계약이므로 판정을 섞지 않는다.
- 기존 화면의 `CanvasInfo` 표시와 backing-store 생성 로직은 수정하지 않는다.
- E2E에서 안정적으로 읽을 수 있다면 `canvas.width / rect.width`와 `canvas.height / rect.height`가 표시 DPR 상한 정책과 모순되지 않는지 관측값을 보고한다. 이를 위해 제품 코드를 변경하지 않는다.
- 반올림 1px 차이를 결함으로 오판하지 않는다.

## 검증 절차 (VERIFY)

### 자동

- [ ] `npm ci` — frozen lockfile 설치 성공
- [ ] `npm run typecheck` — 오류 0
- [ ] `npm run test:unit` — 기존 30개 이상 전부 통과
- [ ] `npm run build` — 성공 및 gzip 크기 기록
- [ ] `npm run test:e2e` — 기존 11개 테스트 전부 통과하며 viewport 10개 각각 Canvas 비율 assertion 실행
- [ ] landscape 3개에서 실제 측정한 Canvas CSS width×height와 ratio를 완료 보고에 기록
- [ ] console error·수평 overflow·터치 크기·axe 기존 게이트 회귀 없음
- [ ] `git diff --check` — 오류 0
- [ ] 변경 범위가 POC CSS/E2E와 현재 스펙·상태 문서에 한정됨

### 실제 기기 — 사용자 수행

아래 환경에서 세로→가로→세로로 회전한다. 사용자가 전달하지 않은 결과는 `NOT TESTED`로 남긴다.

- iPhone Safari
- Android Chrome
- Samsung Internet
- 카카오톡 인앱 웹뷰

각 환경에서:

- [ ] 세로 Canvas가 `3:4`로 보임
- [ ] 가로 Canvas가 납작하거나 늘어나지 않고 `3:4` 유지
- [ ] 회전 후 CSS 크기·backing 크기가 갱신됨
- [ ] DPR 표시와 선명도 정상
- [ ] 가로 화면에서 Canvas·CTA·본문이 겹치거나 수평 overflow를 만들지 않음
- [ ] 다시 세로로 돌아왔을 때 비율 복구

스펙 002 확대 게이트도 같은 실기기 세션에서 함께 확인할 수 있지만, 결과표와 판정은 각각 분리 기록한다.

## 완료 정의 (DONE)

1. `.canvas-wrap` 공식 규칙만으로 모든 자동 viewport에서 `width/height=0.75±0.01`
2. DPR/backing 로직 무변경 및 기존 자동 게이트 통과
3. 카카오 가로 재현이 해소됨
4. 실제 기기 결과를 PASS/FAIL/NOT TESTED로 정직하게 기록
5. 4환경 검증 전 Canvas FAIL과 001 종료 보류를 해제하지 않음
6. 확대·색상·sheet·운영 코드로 범위 확장 없음
7. Codex 최종 diff 재검증 판정

## 위험 (RISK)

- 가로 화면에서 Canvas가 폭 전체를 사용하지 않고 중앙의 세로형 프리뷰로 작아지는 것은 의도한 trade-off다.
- `vh`는 모바일 브라우저 UI에 따라 변할 수 있으나 `width`와 `aspect-ratio`가 함께 계산되므로 비율 자체는 유지돼야 한다.
- 실제 제품의 Canvas 종횡비가 기능별로 달라지는 문제는 이 POC의 고정 `3:4` 계약과 별도다.
- 확대 접근성 스펙 002의 실기기 결과는 별도 보류 상태다.

## 롤백

- 구현 커밋 하나를 `git revert <commit>`로 되돌린다.
- POC 밖 운영 코드·Firebase·데이터 변경은 없어야 한다.
- 롤백 시 카카오 가로 Canvas 비율 FAIL을 다시 활성 상태로 기록한다.

## QUESTIONS

- 없음. 구현 중 고정 `3:4` 외의 제품 비율 요구가 발견되면 범위를 넓히지 말고 기록 후 중단한다.

## 구현 후 보고 형식

### DONE (Claude) — YYYY-MM-DD

- 커밋:
- 변경 파일:
- CSS 변경:
- viewport별 Canvas 측정(특히 landscape 3개):
- 명령별 자동검증 결과:
- DPR/backing 회귀:
- 실기기 4환경 결과(PASS/FAIL/NOT TESTED):
- 미검증:
- 남은 위험:
- 롤백:

