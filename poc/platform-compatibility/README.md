# 001 — 플랫폼 호환성 POC

> 삭제 가능한 독립 POC. `poc/platform-compatibility/` 밖의 어떤 파일·설정·Firebase에도 연결하지 않는다.
> 제품 기능을 구현하지 않는다. 후보 프런트엔드 스택과 Modern Studio 토큰의 최소 산출물이
> 목표 모바일 브라우저(카카오 인앱·삼성 인터넷·iPhone Safari)에서 깨지지 않는지 관측한다.

관련 스펙: `docs/rebuild/specs/001-platform-compatibility-poc.md`

---

## 사전 게이트 — 버전 근거 (코드 생성 전 기록)

- **실행일**: 2026-07-21
- **출처 원칙**: 정확 버전·라이선스는 **npm registry 공식 메타데이터**(`npm view <pkg> version license`)로 확정.
  브라우저 호환은 **공식 문서**로 인용. Wikipedia·블로그·검색요약·기억(`latest`)으로 버전 확정하지 않음.

### 실행 환경 (측정값)
- Node: **v24.18.0** (측정: `node --version`)
- npm: **11.16.0** (측정: `npm --version`)
- pnpm: **미설치**. corepack 0.35.0 존재.

### 패키지 매니저 결정 (POC 한정)
전체 리빌드 워크스페이스 후보는 **pnpm**이나, 본 POC는 (1) 전역 설치 의존 회피(의존성 정책 §6),
(2) 자기완결성(루트 workspace·lockfile 미생성)을 위해 **npm**을 사용한다.
- frozen lockfile 설치 = `npm ci` (package-lock.json은 이 디렉터리 안에만 생성).
- pnpm은 전체 스캐폴드(별도 스펙) 단계에서 corepack으로 고정 검토.

### 정확 설치 버전 (npm registry 메타데이터, 2026-07-21)

| 패키지 | 고정 버전 | 라이선스 | 역할 |
|---|---|---|---|
| react | 19.2.7 | MIT | UI |
| react-dom | 19.2.7 | MIT | DOM 렌더 |
| vite | 8.1.5 | MIT | 번들·dev 서버 |
| @vitejs/plugin-react | 6.0.3 | MIT | React 플러그인 |
| typescript | 7.0.2 | Apache-2.0 | 타입 검사 (⚠️ 네이티브 컴파일러 세대) |
| tailwindcss | 4.3.3 | MIT | 스타일(v4, CSS-first) |
| @tailwindcss/vite | 4.3.3 | MIT | Tailwind v4 Vite 플러그인 |
| vitest | 4.1.10 | MIT | 유닛 테스트 |
| @playwright/test | 1.61.1 | Apache-2.0 | viewport 자동검사·E2E |
| @axe-core/playwright | 4.12.1 | MPL-2.0 | 접근성 자동검사 (⚠️ devDep 전용, 번들 미포함) |
| @types/react | 19.2.17 | MIT | 타입 |
| @types/react-dom | 19.2.3 | MIT | 타입 |

- **라이선스**: 런타임 번들 반입 = React/ReactDOM(MIT), Tailwind 산출 CSS(MIT). 나머지는 devDependency.
  axe-core = **MPL-2.0(약한 카피레프트)**이나 테스트 전용 devDep이라 배포 산출물 미포함 → 공급망 무리 없음.
- ⚠️ **TypeScript 7.0.2**는 네이티브(Go) 컴파일러 세대. 최신 stable이라 고정하되, 통합 이슈 발생 시 `QUESTIONS`에 기록.

### 공식 브라우저 요건 (인용)
- **Tailwind CSS v4**: 공식 `tailwindcss.com/docs/compatibility` 기준 최소 **Chrome 111 · Safari 16.4 · Firefox 128**.
  의존 CSS 기능: CSS custom properties, native nesting(Lightning CSS로 평탄화), `color-mix()`, math 함수(`min/max/round`).
  bleeding-edge(옵션): `field-sizing`, `@starting-style`, `text-wrap:balance`. 구브라우저 지원 필요 시 해당 유틸리티 미사용 권고.
- **Vite 8 / React 19**: 모던 evergreen 타깃(빌드 target은 vite.config에서 명시). Node 20.19+/22.12+ 계열 요구(본 POC는 Node 24로 실행).
- ★ **핵심 리스크**: 카카오 인앱 웹뷰가 구형 System WebView(Chromium < 111)일 경우 Tailwind v4의 `@property`/`color-mix`가
  미동작 → 본 POC의 진단 패널이 `CSS.supports()`로 실측하고, 미지원 시 **CSS fallback**(커스텀 프로퍼티/plain CSS)으로 핵심
  레이아웃·버튼·텍스트가 유지되는지 관측한다.

---

## 실행 명령

```bash
# (이 디렉터리 안에서)
npm install            # 최초 1회 (package-lock.json 생성)
npm ci                 # frozen lockfile 재현 설치 (검증용)
npm run typecheck      # tsc --noEmit (strict)
npm run build          # 프로덕션 빌드 (dist/) + 번들 크기
npm run test:unit      # vitest 유닛 (진단/명암비/상태머신)
npm run preview        # 빌드 산출물 로컬 서빙 (기본 4173)
npm run test:e2e       # Playwright viewport 매트릭스 + axe + 스크린샷 (preview 기동 필요)
```

- **자동 viewport 매트릭스**: 320×568, 360×800, 390×844(P/L), 430×932(P/L), 844×390, 768×1024(P/L), 1280×800, 1440×900.
  각 화면: 수평 overflow 없음 / 주요 CTA viewport 내 / 버튼 ≥44×44 / console error 0 / 스크린샷 / axe.
- **결과물**: `results/` (스크린샷·axe·요약), `results/device-matrix.md`(실기기 PASS/FAIL/NOT TESTED).

## 롤백
- 이 디렉터리(`poc/platform-compatibility/`)만 삭제하면 된다. 루트·기존 앱·Firebase 미연결이라 운영 롤백 없음.
