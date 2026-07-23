# 011 — Modern Studio 공유 UI 기반 프리미티브

## 목표 (WHY)

`apps/mockup`과 `apps/admin`이 이후 기능을 구현할 때 화면마다 버튼·입력·카드·상태 표현을 다시 만들지 않도록 `@denn/ui`에 작고 명확한 공통 기반을 만든다.

이번 스펙은 제품 기능이나 최종 화면을 만드는 단계가 아니다. 웜 토프 Modern Studio 디자인 계약, 모바일 터치 영역, 키보드 포커스, 확대·좁은 화면 대응을 재사용 가능한 프리미티브와 자동검증으로 고정하는 단계다.

## 범위 (SCOPE)

### 포함

- `@denn/ui` 디자인 토큰 완성 및 토큰 단일 원본 계약 강화
- React 기반 최소 프리미티브:
  - `Button` (`primary` / `ghost` / `kakao`)
  - `Card`
  - `Badge`
  - `Chip`
  - `TextField`
  - `VisuallyHidden`
- 상태 계약:
  - 기본·hover 가능한 환경·focus-visible·disabled
  - 오류/설명 텍스트를 색상만이 아니라 텍스트와 ARIA 관계로 표현
- 두 앱의 기존 스캐폴드 셸에서 같은 `@denn/ui` 컴포넌트를 소량 사용해 패키지 경계와 실제 렌더를 검증
- 유닛·타입·E2E·접근성·반응형 검증 보강
- 디자인 문서와 코드 토큰 간 드리프트 검출

### 제외(하지 않을 것)

- 목업 편집기·어드민 대시보드·카탈로그·주문·시안공간 등 실제 제품 기능
- 최종 데스크톱/모바일 화면 전체 레이아웃 구현
- Canvas 렌더러 및 이미지 업로드
- Firebase SDK 설치·초기화·인증·Storage/Firestore 접근
- React Router, Zustand, Radix, shadcn/ui, 아이콘·폼 라이브러리 신규 도입
- Storybook 또는 별도 문서 사이트 도입
- Google Fonts 등 외부 폰트 네트워크 요청
- 다크 모드
- 디자인 PNG 수정·재생성
- 운영 HTML·Firebase 설정·Rules·Hosting·배포 변경
- 기존 POC 수정

## 대상 (WHERE)

- `packages/ui/package.json`
- `packages/ui/src/index.ts`
- `packages/ui/src/theme.css`
- `packages/ui/src/components/*` 또는 동등한 내부 구조
- `packages/ui/src/*.test.ts(x)`
- `apps/mockup/src/App.tsx`
- `apps/admin/src/App.tsx`
- `tests/e2e/*`
- 검증에 꼭 필요한 기존 루트 테스트 설정

참조 원본:

- `docs/rebuild/design/README.md`
- `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-performance-and-resource-budgets.md`

## 구현 지시 (WHAT / HOW)

1. **기준선과 범위 가드**
   - 시작 시 브랜치가 `rebuild/modern-studio`이고 HEAD가 원격과 일치하며 작업 트리가 clean인지 확인한다.
   - 운영 HTML, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, 기존 POC의 기준 hash를 기록한다.
   - 구현 종료 시 같은 대상이 무변경인지 다시 확인한다.

2. **토큰 계약 완성**
   - `packages/ui/src/theme.css`를 CSS 토큰의 단일 원본으로 유지한다.
   - 현재 누락된 디자인 기준 토큰 `--panel`, `--radius`, `--radius-lg`, `--shadow-soft`, `--shadow`와 필요한 성공 상태 토큰을 `docs/rebuild/design/README.md` 값에 맞춘다.
   - Tailwind v4 `@theme` 계층과 plain CSS fallback 계층이 의미상 동일해야 한다.
   - `WARM_TAUPE`와 CSS의 색상값이 달라지면 자동검증이 실패하도록 한다. 단순 문자열 전체 CSS 스냅샷보다 필요한 토큰 이름·값을 명시적으로 검증한다.
   - `--accent` 위 일반 텍스트는 `--accent-ink`, 카카오 CTA는 `#FEE500` 위 `#191600`을 사용한다.
   - 흰색-on-웜토프 일반 텍스트를 만들지 않는다.

3. **패키지 계약**
   - `@denn/ui`는 React를 중복 번들하지 않도록 적절한 `peerDependencies` 계약을 사용한다. workspace 앱의 React 19와 충돌하지 않아야 한다.
   - 공개 API는 `packages/ui/src/index.ts` 한 곳에서 명시적으로 export한다.
   - 앱이 `packages/ui/src/*`를 상대경로로 침투해 import하지 못하게 한다.
   - 순환 의존성을 만들지 않는다. `@denn/ui`가 앱 패키지에 의존하면 안 된다.
   - variant 문자열과 public prop 타입은 좁은 union으로 고정한다. 임의 문자열 class API를 디자인 variant 대용으로 만들지 않는다.

4. **공통 동작 계약**
   - 모든 프리미티브는 기존 HTML 속성과 React 표준 props를 전달할 수 있어야 한다.
   - `Button`의 기본 `type`은 폼 오작동을 막기 위해 `button`으로 한다. 소비자가 명시한 `type`은 보존한다.
   - `Button`·상호작용 `Chip`은 최소 터치 타깃 `44×44 CSS px`을 충족한다.
   - disabled는 실제 `disabled` 속성 또는 의미에 맞는 비상호작용 상태를 사용하고, 시각적 흐림만으로 흉내 내지 않는다.
   - `focus-visible`은 배경과 구분되는 링/윤곽을 제공하며 `outline: none`만 남기지 않는다.
   - hover 스타일은 hover 가능한 포인터 환경에서만 보조적으로 적용한다. hover가 없어도 상태와 기능을 이해할 수 있어야 한다.
   - 애니메이션을 추가한다면 `prefers-reduced-motion`에서 제거 또는 최소화한다.

5. **컴포넌트별 계약**
   - `Button`
     - variant는 `primary | ghost | kakao`.
     - 아이콘 전용 버튼 API는 이번 범위에 넣지 않는다.
     - 로딩 상태가 필요하다는 근거가 없으므로 이번 스펙에서 임의 추가하지 않는다.
   - `Card`
     - 의미 없는 중첩 div를 강제하지 않는 단순 표면 컨테이너다.
     - 기본적으로 인터랙티브하지 않다.
   - `Badge`
     - 정보·상태 텍스트용이며 클릭 컨트롤로 사용하지 않는다.
     - accent-soft 배경 + ink 텍스트를 기본으로 한다.
   - `Chip`
     - 이번 스펙에서는 선택 버튼 계약으로 한정한다.
     - `aria-pressed`와 시각 상태가 일치해야 하고 색만으로 선택 상태를 표현하지 않는다.
   - `TextField`
     - 화면에 보이는 label을 기본 계약으로 한다.
     - 설명·오류 메시지는 안정적인 id로 `aria-describedby`에 연결한다.
     - 오류 시 `aria-invalid`를 설정하고 오류 텍스트를 실제로 렌더한다.
     - controlled/uncontrolled 표준 input 사용을 막지 않는다.
   - `VisuallyHidden`
     - 스크린리더에는 남고 화면에서만 숨겨지는 검증된 패턴으로 구현한다.
     - `display:none` 또는 `visibility:hidden`을 사용하지 않는다.

6. **두 앱 통합**
   - 기존 스캐폴드의 앱 식별자와 mockup/admin 격리를 유지한다.
   - 두 앱 각각에서 동일한 `@denn/ui` 프리미티브를 최소 2종 이상 실제 렌더해 패키지 소비를 검증한다.
   - 제품처럼 보이는 가짜 메뉴·주문·업로드·저장 기능을 만들지 않는다.
   - 버튼 클릭으로 네트워크 요청, 저장, 탐색 같은 실제 부작용을 만들지 않는다.
   - 좁은 화면에서 가로 overflow가 발생하지 않아야 한다.

7. **테스트**
   - 토큰 값과 공개 variant 계약을 유닛 테스트한다.
   - Button 기본 type/명시 type/disabled, Chip `aria-pressed`, TextField label·설명·오류 ARIA 연결을 테스트한다.
   - 구현 편의를 위해 jsdom/happy-dom 또는 React Testing Library를 새로 도입하지 않는다. 현재 도구만으로 계약을 충분히 검증할 수 없다면 임의 설치하지 말고 `QUESTIONS`로 보고한다.
   - Playwright에서 실제 브라우저 렌더 기준으로 두 앱의 키보드 focus-visible, 터치 타깃, 320px 가로 overflow 0, axe serious/critical 0, console error 0을 검증한다.
   - 색상 대비 검사는 포괄적으로 제외하지 않는다.

8. **문서와 커밋**
   - 이 스펙 하단 `### DONE (Claude)`에 변경 파일, 실행 명령, 결과, 미검증, 위험을 append한다.
   - 코드/설정 커밋과 결과 문서/핸드오프 커밋을 분리한다.
   - 커밋 제목은 `spec 011:` 접두사를 사용한다.
   - push 후 로컬=원격, ahead/behind `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] `corepack pnpm install --frozen-lockfile` 성공 및 전후 `pnpm-lock.yaml` diff 0
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] 토큰 이름·값·CSS fallback↔공개 상수 정합 테스트 통과
- [ ] Button·Chip·TextField 핵심 의미/ARIA 계약 테스트 통과
- [ ] mockup/admin 각각 독립 빌드 및 앱 식별자 유지
- [ ] Playwright 320px·데스크톱에서 가로 overflow 0
- [ ] 상호작용 컨트롤 최소 `44×44 CSS px`
- [ ] 키보드 Tab으로 포커스 도달 및 focus-visible 식별 가능
- [ ] axe serious/critical 0, 브라우저 console error 0
- [ ] 앱→`@denn/ui`는 패키지 export로만 접근, 상대 `src` 침투 0, 순환 의존 0
- [ ] 운영 HTML·Firebase 설정/Rules·기존 POC·디자인 PNG 무변경
- [ ] Firebase SDK/Router/Zustand/Radix/shadcn 신규 설치 0, 네트워크 요청·배포 0

### 수동 확인

- [ ] 데스크톱에서 primary/ghost/kakao가 디자인 규격과 시각적으로 구분됨
- [ ] 키보드만으로 모든 데모 컨트롤에 접근 가능하고 포커스 위치가 보임
- [ ] 320px에서 텍스트·버튼이 잘리거나 화면 밖으로 밀리지 않음
- [ ] 브라우저 200% 확대에서 읽기·포커스·컨트롤 접근이 유지됨
- [ ] disabled/selected/error 상태가 색만으로 전달되지 않음

실기기 4환경 검증은 이번 스펙의 자동 완료 조건이 아니다. 데스크톱/에뮬레이션 검증 후 위험이 발견되거나 실제 제품 레이아웃에 처음 적용되는 시점에 별도 실기기 스펙으로 분리한다.

## 완료 정의 (DONE)

- 위 6개 프리미티브가 좁고 명시적인 public API로 `@denn/ui`에서 제공된다.
- 웜 토프 토큰의 CSS/TypeScript 정합성과 주요 접근성 계약이 자동검증으로 고정된다.
- mockup/admin 두 앱이 동일 프리미티브를 패키지 경계로 소비하며 기존 앱 격리·빌드·E2E 게이트를 유지한다.
- 모든 자동 게이트가 통과하고 수동 확인 결과가 사실대로 기록된다.
- 운영본·Firebase·POC·PNG·배포가 무변경이다.

## 위험 (RISK)

- 너무 많은 variant나 합성 API를 미리 만들면 실제 요구가 생기기 전에 새 추상화 부채가 된다. 명시된 컴포넌트와 상태만 구현한다.
- CSS 토큰과 TypeScript 상수의 이중 표현은 드리프트 위험이 있다. 이번 스펙에서는 자동 정합 테스트로 막고, 빌드 시 코드 생성 같은 복잡한 체계는 도입하지 않는다.
- 폰트 파일을 아직 번들하지 않으므로 OS별 자간·줄바꿈이 다를 수 있다. 외부 폰트 요청을 추가하지 않고 시스템 fallback으로 검증하며, 실제 폰트 자산 정책은 후속 스펙으로 남긴다.
- UI 셸의 시각 변경은 제품 기능 완성을 뜻하지 않는다. 데모 컨트롤에 실제 기능을 연결하지 않는다.
- 롤백은 스펙 011 코드/설정 커밋과 문서 커밋을 역순 `git revert`한다. 운영/Firebase 롤백은 없어야 한다.

### QUESTIONS

- 없음. 구현 중 현재 도구만으로 React 의미 계약을 검증할 수 없어 새 테스트 의존성이 필요하다고 판단되면 설치 전에 여기에 근거·후보·영향을 기록하고 대기한다.
- (해소) React 의미/ARIA 계약은 **이미 저장소에 있는 `react-dom/server`의 `renderToStaticMarkup`**으로 node 환경에서 정적 HTML을 렌더해 검증했다. jsdom/happy-dom/RTL을 **도입하지 않았다**. `@denn/ui`에 react/react-dom(peer + 기존 lockfile 버전과 동일한 dev), @types/react·@types/react-dom(dev)만 추가했고 신규 다운로드 0(lockfile은 importer 항목만 추가). 따라서 임의 신규 의존성 없음.

### DONE (Claude) — 2026-07-23

**요약:** `@denn/ui`에 6개 프리미티브(Button/Card/Badge/Chip/TextField/VisuallyHidden)와 웜 토프 토큰 계약을 구현하고, 두 앱이 패키지 경계로 소비하도록 데모 셸을 재구성했다. 모든 자동 게이트 통과. 운영본·Firebase·POC·PNG·배포 무변경.

**변경 파일 (코드/설정):**
- `packages/ui/package.json` — react/react-dom `peerDependencies`(`^19.2.0`) + dev(react 19.2.7 / react-dom 19.2.7 / @types/react 19.2.17 / @types/react-dom 19.2.3, 전부 기존 lockfile 버전). 신규 다운로드 0.
- `packages/ui/src/index.ts` — 단일 public export(WARM_TAUPE + 6 컴포넌트 + 타입). 좁은 union(`ButtonVariant`)만 노출.
- `packages/ui/src/components/{Button,Card,Badge,Chip,TextField,VisuallyHidden}.tsx` — 프리미티브 구현.
- `packages/ui/src/theme.css` — 누락 토큰(`--panel`/`--radius`/`--radius-lg`/`--shadow-soft`/`--shadow` + success) 보강, @theme·:root 두 계층 동일화, 프리미티브 CSS(44px 터치, focus-visible 링, hover는 `@media (hover:hover)`, `prefers-reduced-motion`).
- `packages/ui/src/index.test.ts` — 토큰 값 + **CSS↔WARM_TAUPE 드리프트 가드**(토큰 이름·값 명시 검증, 전체 스냅샷 아님).
- `packages/ui/src/components/components.test.tsx` — Button 기본/명시 type·disabled·variant, Chip aria-pressed, TextField label·description·error ARIA 연결을 `renderToStaticMarkup`로 검증.
- `packages/ui/tsconfig.json` — 토큰 테스트의 `node:fs`용 `types:["node"]`(앱과 동일 패턴).
- `apps/mockup/src/App.tsx`·`apps/admin/src/App.tsx` — @denn/ui 프리미티브 6종 실렌더 데모 셸. 클릭 부작용 없음(사이즈/보기 칩은 로컬 UI 상태만). 앱 식별자·격리 유지.
- `tests/e2e/scaffold.spec.ts` — 키보드 focus-visible 링·44px 터치 타깃·320/데스크톱 overflow 0·axe serious/critical 0·console 0. 프리미티브 실렌더 확인.
- `vitest.config.ts` — `.tsx` 테스트 포함 + `esbuild.jsx:"automatic"`(jsdom 미도입).
- `pnpm-lock.yaml` — packages/ui importer devDependencies만 추가(신규 패키지 0).

**실행 명령·결과 (Node 24.18.0 / pnpm 11.15.1, Corepack):**
- `pnpm install --frozen-lockfile` → 성공, 전후 `pnpm-lock.yaml` diff **0**.
- `pnpm run format:check` → PASS.
- `pnpm run lint`(`--error-on-warnings`) → PASS.
- `pnpm run typecheck`(7 프로젝트 `tsc --noEmit`) → PASS.
- `pnpm run test`(unit) → **25/25 PASS**(토큰 드리프트 + 컴포넌트 계약).
- `pnpm run build` → mockup·admin **독립 빌드** PASS(각 JS gzip ≈ **61.07/61.08KB**, CSS gzip 2.62KB; React 단일 번들).
- `pnpm run test:e2e` → **4/4 PASS**(mockup/admin × 320·1280).
- `pnpm run check`(aggregate) → PASS.

**계약/경계 확인:**
- 앱→`@denn/ui`는 패키지 export로만 접근(상대 `src` 침투 0), `@denn/ui`→앱 의존 0(순환 0).
- 토큰 드리프트 가드: accent/accent-2/accent-soft/accent-ink/kakao가 @theme(`--color-*`)·:root(`--*`)·WARM_TAUPE에서 동일해야 통과. `--accent` 위 텍스트=`--accent-ink`, kakao=`#191600`. 흰색-on-웜토프 일반 텍스트 없음(테스트로 고정).
- 신규 설치 0: Firebase SDK/React Router/Zustand/Radix/shadcn 미설치(package.json·lockfile 확인). 네트워크 요청·배포 0.

**무변경 확인(baseline hash 대조):** `denn-mockup-tool.html`·`denn-admin.html`·`firebase.json`·`.firebaserc`·`firestore.rules`·`storage.rules`·`poc/**`·`docs/rebuild/design/*.png` **전부 UNCHANGED**.

**수동 확인(이번 세션, 데스크톱 Chrome 실측):**
- ✅ primary(웜토프)·ghost(화이트+라인)·kakao(옐로+볼드)·disabled가 시각적으로 구분됨(스크린샷 확인).
- ✅ 키보드 Tab으로 첫 컨트롤(“기본”)에 도달, focus-visible 링(짙은 ink 아웃라인+offset)이 명확히 보임(스크린샷 확인).
- ✅ 선택 칩(A4)은 색 외에 **채워진 사각 마크 + 볼드**로 상태 전달, 오류 필드는 **빨간 보더 + “필수 항목입니다” 텍스트 + aria-invalid**로 색 외 신호 제공.
- 320px overflow 0 및 44px 터치 타깃은 **e2e 프로그램 검증(scrollWidth≤clientWidth, boundingBox≥44)**으로 확정. 브라우저 창 축소 캡처는 고정 해상도라 별도 신호가 없어 e2e 결과를 정본으로 사용.

**미검증/위험:**
- 브라우저 200% 확대의 **사람 육안** 재확인은 이번 세션에서 별도로 수행하지 않음(스펙상 실기기 4환경은 이번 스펙의 자동 완료 조건 아님). 반응형 flex-wrap + e2e overflow 0으로 위험 낮음. 실제 제품 레이아웃 첫 적용 시 실기기 스펙으로 분리 검증.
- 폰트는 시스템 fallback(외부 폰트 요청 없음) — OS별 자간 차이 가능성은 후속 폰트 자산 정책으로 남김.
- 데모 셸의 시각 변경은 제품 기능 완성이 아님(데모 컨트롤에 실제 부작용 없음).

### DONE (Claude) — 2026-07-23 재검증 보완 (기준 HEAD 9baec46 → 611707d)

Codex "수정 후 재검증" 2건만 최소 보완. 컴포넌트 API·토큰·앱 구조 리팩터링 없음, 신규 의존성 없음.

1. **Vitest 무효 설정 경고 제거** — `vitest.config.ts`의 `esbuild:{ jsx:"automatic" }` 제거. Vite 8은 oxc 변환기를 쓰므로 이 esbuild 옵션은 무시되며 `"Both esbuild and oxc options were set. oxc options will be used and esbuild options will be ignored."` 경고를 냈다. **oxc가 `.tsx` 테스트를 automatic JSX 런타임으로 기본 처리**하므로 옵션·잘못된 주석 제거만으로 충분(새 변환기/테스트 의존성 없음). 재실행 결과: unit 여전히 **25→26 PASS**, 해당 경고 **0**.
2. **Chip disabled 계약 완성** — Chip은 이미 native `disabled`를 `...rest`로 전달하므로 컴포넌트 변경 없음. `theme.css`에 `.denn-chip:disabled{cursor:not-allowed;opacity:.55}` 추가(Button과 동일 원칙), hover 규칙에 `:not(:disabled)` 추가로 비활성 Chip hover 표현 제외. 정적 테스트에 **Chip이 native disabled를 전달(+ disabled여도 aria-pressed 유지)** 검증 추가(unit 26). 두 앱 데모에 disabled Chip 1개씩 배치, e2e에서 **disabled Chip 존재·native disabled·44px 유지**(터치 타깃 루프 포함)를 검증. 제품 기능 추가 없음.

**재검증 결과(Node 24.18.0 / pnpm 11.15.1):** frozen install lock diff **0** · format/lint/typecheck PASS · unit **26/26**(esbuild/oxc 경고 0) · build 독립(JS gzip ≈61.09KB) · e2e **4/4**(disabled Chip 검증 포함). 운영 HTML·Firebase 설정/Rules·`poc/**`·디자인 PNG **UNCHANGED**, 신규 설치·배포 0. 코드 커밋 `611707d` / 문서 커밋 분리.

