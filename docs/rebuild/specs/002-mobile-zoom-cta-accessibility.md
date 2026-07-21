# 002 — 모바일 확대 시 하단 CTA 접근성 복구

상태: **READY FOR CLAUDE IMPLEMENTATION**

## 목표 (WHY)

모바일 브라우저에서 핀치 확대했을 때 하단 CTA가 과도하게 커지고 본문을 가리는 접근성 출시 차단 결함을 최소 변경으로 해결한다. 확대 상태에서도 사용자가 본문을 읽고 기존 저장·주문 CTA 전체에 도달해 조작할 수 있어야 하며, 확대 해제·키보드·기본 배율 동작은 회귀하지 않아야 한다.

## 적용 결정서

- `docs/codex-claude-handoff/decisions/2026-07-21-change-and-patch-policy.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`

## 범위 (SCOPE)

### 포함

- `visualViewport.scale`을 이용한 확대 상태 판정
- 확대와 가상 키보드 축소를 구분하는 순수 계산 로직
- 확대 중 기존 `.bottomnav`의 fixed 해제 및 문서 흐름 배치
- 확대 중 fixed CTA용 `.content` 하단 예약 여백 제거
- 확대 해제 시 기존 fixed CTA·키보드 inset 동작 복구
- 순수 로직 유닛 테스트와 기존 자동 게이트
- 실제 기기 4환경 확대 재검증 기록

### 제외

- 중복 또는 대체 CTA 추가
- visual viewport 좌표 추적·역스케일·매 프레임 transform 보정
- `.sheet-backdrop`·`.sheet` 수정(위험 후보이나 결함 미재현)
- 색상 토큰 변경(카라멜 앰버 팔레트는 확정됐지만 별도 후속 스펙에서 반영)
- Tailwind 버전 확정
- 기존 운영 HTML·Firebase·루트 설정·전체 스캐폴드 변경
- 브라우저 확대 제한 또는 viewport의 `user-scalable` 변경

## 대상 (WHERE)

- `poc/platform-compatibility/src/App.tsx`
- `poc/platform-compatibility/src/styles.css`
- `poc/platform-compatibility/src/lib/diagnostics.ts` 또는 동일 책임의 기존 POC 모듈
- `poc/platform-compatibility/tests/unit/`의 관련 테스트 1개
- `poc/platform-compatibility/results/device-matrix.md`(사용자 실기기 결과만 기록)
- 완료 시 상태 문서: `docs/codex-claude-handoff/CURRENT.md`, `docs/2026-07-21-poc-001-handoff.md`

새 의존성·새 전역·새 timer를 추가하지 않는다.

## 원인 계약

이 결함에는 함께 처리해야 하는 두 원인이 있다.

1. `.bottomnav { position:fixed; left:0; right:0 }`가 확대 시 좁아진 visual viewport보다 넓게 보이고 본문 위를 지속적으로 덮는다.
2. 현재 `useViewportOwner`는 `innerHeight - visualViewport.height - offsetTop`을 항상 키보드 inset으로 간주한다. 핀치 확대도 `visualViewport.height`를 줄이므로 확대분을 키보드로 오인해 `--kbd-inset`에 큰 값을 쓰고, 하단 바의 아래 padding을 비정상적으로 키운다.

두 번째 원인을 제외한 fixed→static CSS 변경만으로 완료 처리하지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 단일 순수 계산

- 기존 viewport 레이아웃 소유자는 `useViewportOwner` 하나로 유지한다.
- 확대 판정과 키보드 inset 계산을 순수 함수 하나(또는 같은 모듈의 밀접한 순수 함수들)로 추출한다.
- 입력은 최소 `innerHeight`, `visualViewport.height`, `visualViewport.offsetTop`, `visualViewport.scale`을 받는다.
- 출력은 최소 `{ isZoomed, keyboardInset }`을 반환한다.
- 확대 기준은 부동소수점 흔들림을 고려해 `scale > 1.01`로 고정한다. 매직 넘버를 여러 위치에 복제하지 않는다.
- `scale > 1.01`이면 `isZoomed=true`, `keyboardInset=0`으로 처리한다. 확대 축소분을 키보드로 계산하지 않는다.
- 확대가 아니면 기존 의미를 보존해 `max(0, innerHeight - vvHeight - offsetTop)`을 정수 px로 계산한다.
- Visual Viewport 미지원·비정상 숫자는 안전한 기본값 `isZoomed=false`, `keyboardInset=0`으로 처리한다.
- 빈 `catch`, timer, 별도 resize/orientation listener, 신규 `window.*`를 추가하지 않는다.

### 2. DOM 상태 연결

- 순수 계산 결과를 기존 `.page` 루트의 명시적 class 또는 `data-*` 상태 하나로 전달한다.
- React state의 두 번째 권위나 별도 zoom listener를 만들지 않는다.
- 확대 진입·해제는 기존 `visualViewport` resize/scroll 관측 경로에서 갱신한다.

### 3. 확대 상태 레이아웃

- 확대 상태에서 기존 `.bottomnav`만 `position:static`으로 전환한다. DOM상 이미 `main` 뒤에 있으므로 그대로 문서 말단 CTA가 된다.
- 기존 두 버튼을 유지하며 복제 CTA를 만들지 않는다.
- 확대 상태에서 `.content`의 fixed CTA 예약용 하단 padding `120px`을 정상 콘텐츠 간격으로 줄인다.
- 확대 해제 시 기존 `position:fixed`, safe area, 키보드 inset 동작이 자동 복구돼야 한다.
- `!important`, 후행 중복 selector, JS inline style로 CSS를 덮지 않는다. 기존 공식 selector를 직접 확장한다.
- 확대 시 보이는 영역이 좁아져 한 화면에 전체 문서 폭이 보이지 않는 것 자체는 결함으로 간주하지 않는다. CTA가 본문을 지속적으로 가리지 않고, 사용자가 CTA 전체에 도달·조작할 수 있어야 한다.

### 4. 미확정 위험 격리

- bottom sheet는 이번 증거에서 재현되지 않았으므로 수정하지 않는다.
- 구현 중 sheet 결함을 발견하면 범위를 넓히지 말고 `QUESTIONS`에 재현 절차와 증거를 기록한다.

## 검증 절차 (VERIFY)

### 자동

- [ ] `npm ci` — frozen lockfile 설치 성공
- [ ] `npm run typecheck` — 오류 0
- [ ] `npm run test:unit` — 기존 테스트 + 아래 순수 계산 테스트 전부 통과
- [ ] `npm run build` — 성공 및 gzip 크기 기록
- [ ] `npm run test:e2e` — 기존 viewport/fullscreen 회귀 전부 통과
- [ ] `git diff --check` — 오류 0
- [ ] POC·현재 스펙/상태 문서 밖 변경 0건

순수 계산 유닛 테스트 최소 사례:

1. `scale=1`, viewport 축소 없음 → 확대 아님, inset 0
2. `scale=1`, 키보드 상당 viewport 축소 → 확대 아님, 양수 inset
3. `scale=2`, viewport 축소 → 확대, inset 0
4. `scale=1.005` → 확대 아님(허용 오차)
5. `scale=1.02` → 확대
6. 누락·NaN·음수 입력 → 안전한 비음수 결과

### 수동 데스크톱

- [ ] 기본 배율에서 하단 CTA가 기존처럼 fixed
- [ ] 입력 포커스/해제 후 키보드 inset 관련 기존 표시·레이아웃 회귀 없음
- [ ] 확대 상태 class/data가 확대 진입·해제에 따라 되돌아옴
- [ ] 확대 해제 후 새로고침 없이 fixed CTA 복구

### 실제 기기 — 사용자 수행

아래 4환경에서 같은 빌드를 검증하며 사용자가 전달하지 않은 결과는 `NOT TESTED`로 남긴다.

- iPhone Safari
- Android Chrome
- Samsung Internet
- 카카오톡 인앱 웹뷰

각 환경의 확대 게이트:

- [ ] 핀치 확대 시 하단 CTA가 비정상적인 키보드 inset으로 세로 팽창하지 않음
- [ ] 확대 상태에서 CTA가 본문을 지속적으로 가리지 않음
- [ ] 문서 끝으로 이동해 `시안 저장`과 `주문 제작 의뢰하기` 전체에 도달·클릭 가능
- [ ] 확대 해제 시 fixed CTA와 레이아웃 정상 복구
- [ ] 기본 배율 1~14 회귀 없음

## 완료 정의 (DONE)

1. 두 원인(fixed overlay·확대의 키보드 오인)이 모두 제거됨
2. 자동 게이트 전부 통과
3. 코드·CSS 변경이 POC 내부의 공식 구현에 한정됨
4. 실제 기기 결과가 PASS/FAIL/NOT TESTED로 정직하게 기록됨
5. 4환경 모두 PASS하기 전 접근성 FAIL과 001 종료 보류를 해제하지 않음
6. 색상·Tailwind·sheet·운영 코드에 범위 확장 없음
7. Codex가 최종 diff를 재검증해 판정

## 위험 (RISK)

- 일부 브라우저는 pinch 중 scale 값을 소수 단위로 흔들 수 있다. 단일 임계값과 기존 관측 경로로만 처리한다.
- 확대 중 키보드가 동시에 열린 경우 실제 키보드 높이를 분리하기 어렵다. 이번 계약은 확대 오인을 막고 CTA를 흐름으로 보내 핵심 기능을 유지하는 쪽을 우선한다.
- 문서 흐름 CTA는 확대 중 화면에 상시 고정되지 않는다. 이는 의도한 접근성 trade-off다.
- bottom sheet는 별도 미검증 위험으로 남는다.

## 롤백

- 구현 커밋 하나를 `git revert <commit>`로 되돌린다.
- POC 밖 운영 코드·Firebase·데이터 변경이 없어야 한다.
- 롤백 후 확대 접근성 결과는 다시 FAIL로 복귀하며 문서에 숨기지 않는다.

## QUESTIONS

- 없음. 범위 밖 결함이 발견되면 구현을 멈추고 여기에 기록한다.

## 구현 후 보고 형식

### DONE (Claude) — YYYY-MM-DD

- 커밋:
- 변경 파일:
- 순수 계산과 임계값:
- 명령별 자동검증 결과:
- 기본 배율 회귀:
- 실기기 4환경 결과(PASS/FAIL/NOT TESTED):
- 미검증:
- 남은 위험:
- 롤백:
