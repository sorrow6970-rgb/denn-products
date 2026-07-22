# 결정: Tailwind CSS v4 채택

결정일: 2026-07-22

상태: **확정 · 정확 패치 버전은 스캐폴드 직전 재검증**

## 핵심 결정

> DENN 리빌드의 스타일 도구는 Tailwind CSS v4를 사용한다. Vite 통합은 공식 `@tailwindcss/vite` 플러그인을 사용하며, v3.4와 병행 설치하지 않는다.

## 근거

### 공식 호환성

Tailwind 공식 문서 기준 v4 핵심 브라우저 하한:

- Chrome 111+
- Safari 16.4+
- Firefox 128+

공식 문서는 더 오래된 브라우저 지원이 필수라면 v3.4를 유지하도록 안내한다. v4는 `@property`, `color-mix()` 등 현대 CSS 기능을 핵심적으로 사용한다.

공식 출처:

- `https://tailwindcss.com/docs/compatibility`
- `https://tailwindcss.com/docs/installation/using-vite`
- `https://tailwindcss.com/docs/upgrade-guide`

### 프로젝트 실측

- POC 검증 버전: Tailwind CSS `4.3.3`, `@tailwindcss/vite 4.3.3`.
- iPhone Safari, Android Chrome, Samsung Internet, 카카오 인앱에서 `dvh`, `color-mix()`, `@property` 지원 결과를 확인했다.
- 4환경에서 기본 표시, 확대, 회전, Canvas, 카라멜 앰버 팔레트가 PASS했다.
- 자동검증: typecheck, unit 34/34, build, e2e 11/11, axe serious/critical 0.
- plain CSS fallback 계층에서도 핵심 레이아웃·버튼·텍스트가 유지되도록 검증했다.

따라서 현재 실제 지원 대상에서는 v3.4를 선택할 근거보다 v4를 선택할 근거가 강하다.

## 구현 규칙

- CSS-first 설정과 `@import "tailwindcss"`를 사용한다.
- Vite에서는 `@tailwindcss/vite`를 사용한다.
- v3 전용 `tailwind.config.js` 구조를 기본값으로 새로 만들지 않는다.
- v3 `@tailwind base/components/utilities` 지시문을 새 코드에 사용하지 않는다.
- Sass·Less·Stylus와 혼합하지 않는다.
- 디자인 토큰은 CSS custom properties를 단일 원본으로 두고 Tailwind가 이를 참조한다.
- Canvas 렌더링, safe-area, VisualViewport, fullscreen 상태 머신을 억지로 유틸리티 클래스화하지 않는다.
- 복잡한 브라우저 fallback은 의미가 분명한 plain CSS로 유지한다.
- `field-sizing`, `@starting-style`, `text-wrap: balance` 등 선택적 최신 기능은 실제 목표 환경 지원을 확인한 경우에만 사용한다.

## 버전 정책

- v4 세대 선택은 확정이다.
- POC의 `4.3.3`은 검증 기준 버전이지 미래 모든 설치의 영구 최신값이 아니다.
- 전체 스캐폴드 직전에 공식 npm metadata와 Vite 호환성을 다시 확인하고 정확 버전을 lockfile에 고정한다.
- 기능 구현 중 임의 업데이트하지 않는다.
- major 변경은 별도 결정과 POC가 필요하다.

## 재검토 조건

다음 중 하나가 실제 요구사항으로 발생할 때만 v3.4 또는 별도 호환 전략을 재검토한다.

- Chrome 111 미만 또는 Safari 16.4 미만을 반드시 지원해야 함
- 목표 인앱 웹뷰에서 v4 핵심 CSS 기능 미지원이 재현됨
- 전체 앱 스캐폴드에서 공식 Vite 통합과 해결할 수 없는 호환 결함 발생
- 사용자 대상 브라우저 정책이 변경됨

단순한 취향, 익숙함 또는 근거 없는 구형 브라우저 우려만으로 세대를 되돌리지 않는다.

## 금지

- v3.4와 v4 동시 설치
- POC 결과를 무시한 무근거 다운그레이드
- exact version 확인 없는 `latest` 설치
- 검증 없이 선택적 최신 CSS 기능을 핵심 흐름에 사용
- 스타일 변경과 Firebase·데이터 변경 혼합
