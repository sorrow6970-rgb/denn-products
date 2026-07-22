# 010 — 실제 리빌드 모노레포 스캐폴드

상태: **READY FOR CLAUDE IMPLEMENTATION**

## 목표 (WHY)

스펙 001~009에서 검증·확정한 기술과 안전 계약을 실제 리빌드 코드베이스의 최소 골격으로 만든다.

두 앱(`mockup`, `admin`)과 다섯 공유 패키지(`shared`, `firebase`, `spaces`, `render`, `ui`)가 단일 pnpm workspace·단일 lockfile·공통 품질 게이트 아래에서 독립적으로 빌드되는 상태까지만 구현한다. 제품 기능과 운영 Firebase 연결은 후속 스펙에서 하나씩 추가한다.

## 범위 (SCOPE)

### 포함

- 저장소 루트 Node 24/pnpm workspace/TypeScript/Biome/Vitest/Playwright 공통 설정
- 루트 `.gitignore`를 설정 JSON 추적과 데이터 백업 차단이 양립하도록 정리
- `apps/mockup`, `apps/admin` Vite+React+TypeScript+Tailwind v4 최소 셸
- `packages/shared`, `firebase`, `spaces`, `render`, `ui` 최소 패키지 경계와 export
- Modern Studio 웜 토프 토큰을 `@denn/ui`의 단일 CSS 원본으로 연결
- 앱→공유 패키지 `workspace:*` 의존성과 package export 검증
- root format/lint/typecheck/unit/build/e2e/check 명령
- 앱 분리 빌드, 기본 접근성·viewport·콘솔 오류 E2E
- 정확 버전·lockfile·번들 크기·검증 결과 보고

### 제외(하지 않을 것)

- 기존 `denn-mockup-tool.html`, `denn-admin.html` 이동·복사·수정·삭제
- `legacy/` 생성
- 기존 `firebase.json`, `.firebaserc`, Storage/Firestore Rules 변경
- Firebase SDK 설치·초기화·인증·네트워크 요청·Emulator 연결
- 운영 데이터·Storage·Firestore 접근 또는 쓰기
- 실제 PBKDF2/AES-GCM 암복호화 구현
- 실제 Canvas 렌더·이미지 로드·인쇄 PNG 구현
- 카탈로그·관리자·시안·주문 기능 이전
- React Router·Zustand·Radix/shadcn 도입
- 디자인 시안 PNG 재편집
- POC 두 디렉터리 수정·삭제 또는 신규 앱 코드로 복사
- Hosting preview/production 배포와 `firebase.json` public 경로 전환
- 기존 운영 URL·rewrites·캐시 헤더 변경
- `minimumReleaseAge=0`, peer 무시, force 설치, 전역 pnpm 설치

## 대상 (WHERE)

### 루트 신규·수정

- `.nvmrc`, `.gitignore`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- `biome.json`, `tsconfig.base.json`, `vitest.config.ts`, `playwright.config.ts`
- `tests/e2e/scaffold.spec.ts`
- 필요 시 스캐폴드 검증 전용 소형 스크립트(역할·삭제 조건 명시)

### 앱

- `apps/mockup/`
- `apps/admin/`

각 앱의 허용 최소 파일은 `package.json`, `tsconfig.json`, `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`와 필요할 때만 `src/app.css`다.

### 공유 패키지

- `packages/shared/`
- `packages/firebase/`
- `packages/spaces/`
- `packages/render/`
- `packages/ui/`

각 패키지는 `package.json`, `tsconfig.json`, `src/index.ts`를 기본으로 하며 실제 책임을 구현하지 않고 타입·상수·인터페이스·명시적 미구현 경계만 export한다. `@denn/ui`는 `src/theme.css` export를 추가할 수 있다.

### 문서

- 신규 보고서: `docs/codex-claude-handoff/reviews/2026-07-22-monorepo-scaffold-report.md`
- 신규 핸드오프: `docs/2026-07-22-spec-010-monorepo-scaffold-handoff.md`
- 이 스펙 DONE, `docs/rebuild/specs/README.md`, `docs/codex-claude-handoff/CURRENT.md`

## 구현 지시 (WHAT / HOW)

### 1. 시작 가드와 정확 버전

1. 브랜치 `rebuild/modern-studio`, 기준 HEAD `64ca533`, 원격 동기화, clean 상태를 확인한다.
2. 설치 전 공식 npm metadata로 React/React DOM 19, TypeScript 7, Vite 8와 React plugin, Tailwind v4와 Vite plugin, Biome 2.5.5, Vitest 4, Playwright/axe, Node/React 타입의 정확 버전·engines·peer·license를 다시 확인한다.
3. major 세대는 확정값을 바꾸지 않는다. patch가 스펙 006/009 값과 달라졌다면 설치 전에 차이와 위험을 보고한다. 공식 metadata가 정합한 patch만 정확 버전으로 고정한다.
4. Node는 `>=24 <25`, `.nvmrc=24`, pnpm은 Corepack + `packageManager: pnpm@11.15.1`을 사용한다. `corepack enable`, 전역 설치, PATH 변경을 하지 않는다.
5. 스펙 009의 Biome allowlist 필요성을 현재 시점에 재검증한다. 제거 후 frozen install이 정책 거부되면 정확한 Biome 2.5.5 관련 9항목만 유지한다. 임계 기간이 지나 정상 설치되면 불필요한 allowlist를 제거한다. `minimumReleaseAge=0`은 금지한다.

### 2. `.gitignore` 정상화

1. 기존 데이터 백업 보호 의도를 유지한다. `DENN-current-data-*.json`, `DENN-data-*.json`, `backup.json`, 백업 디렉터리 등은 계속 추적하지 않는다.
2. blanket `*.json` 때문에 실제 설정을 `git add -f`로 추가하는 방식을 반복하지 않는다.
3. 루트와 apps/packages의 `package.json`, `tsconfig*.json`, `biome.json`은 정상 `git add`로 추적되도록 명시적 예외를 둔다.
4. `node_modules/`, 각 앱·패키지 `dist/`, `coverage/`, `playwright-report/`, `test-results/`를 명시적으로 무시한다.
5. 기존 추적 중인 `firebase.json`을 수정하거나 추적 해제하지 않는다. 설정 외 데이터 JSON이 staged되지 않았는지 전체 신규 JSON을 검토한다.

### 3. 루트 workspace 계약

1. 루트 `package.json`은 `private: true`, ESM, engines, packageManager, 정확 devDependency를 갖는다.
2. `pnpm-workspace.yaml`은 `apps/*`, `packages/*`만 포함한다. `poc/*`를 실제 workspace에 포함하지 않는다.
3. 루트 script는 `format:check`, `lint`(`--error-on-warnings`), `typecheck`, `test:unit`, `build`, `test:e2e`, `check`를 단일 진입점으로 제공한다. `check` 순서는 format→lint→typecheck→unit→build다.
4. 도구 의존성은 루트 devDependency로 중앙화한다. leaf는 앱 런타임 의존성과 workspace 의존성만 선언한다.
5. 단일 `pnpm-lock.yaml`만 생성한다. npm/yarn/bun lockfile을 만들지 않는다.

### 4. 패키지 경계

허용 의존 방향:

```text
apps/mockup → @denn/ui, @denn/shared
apps/admin  → @denn/ui, @denn/shared
ui/firebase/spaces/render → @denn/shared 허용
shared → 다른 @denn 패키지 금지
```

1. 내부 의존성은 `workspace:*`로 선언하고 패키지명으로 import한다. `../../packages/*/src` 상대 침투와 순환 의존성을 금지한다.
2. 정식 이름 `@denn/shared|firebase|spaces|render|ui`를 사용하고 모두 private으로 둔다.
3. `@denn/shared`: 브랜드 이름·앱 식별자 같은 무해한 상수와 공통 Result/ID 수준 타입만 허용한다. 레거시 스키마를 추측해 확정하지 않는다.
4. `@denn/firebase`: SDK 없이 repository port·초기화 상태 타입 또는 명시적 placeholder export만 둔다. 네트워크 호출·환경변수·Firebase config 금지.
5. `@denn/spaces`: 암호화를 구현하지 않고 token·버전 식별자 타입만 둔다. 기존 링크 호환을 주장하지 않는다.
6. `@denn/render`: 프레임워크 비의존 렌더 입력·출력 인터페이스 또는 상수만 둔다. Canvas 구현 금지.
7. `@denn/ui`: Modern Studio 토큰 CSS의 단일 원본과 최소 layout primitive용 타입/상수만 둔다. React 컴포넌트 확장은 후속 스펙으로 남긴다.
8. 공유 패키지는 `window.*` 전역을 만들지 않는다.

### 5. 두 앱 최소 셸

1. 각 앱은 독립 Vite entry와 독립 build output을 갖고 한 앱 빌드에 다른 앱 코드가 포함되지 않아야 한다.
2. React 19 `createRoot`와 StrictMode를 사용하고 Router·Zustand 없이 단일 화면만 렌더한다.
3. 제품 기능처럼 보이는 가짜 컨트롤 없이 다음 식별 정보만 표시한다.
   - Mockup: “DENN PRODUCTS Mockup Rebuild”, “Scaffold ready”
   - Admin: “DENN PRODUCTS Admin Rebuild”, “Scaffold ready”
4. `@denn/shared` 상수와 `@denn/ui/theme.css`를 실제 import하여 workspace 경계를 빌드로 증명한다.
5. 웜 토프 토큰은 `#9F887A`, `#BAA598`, `#EEE8E1`, accent-ink `#191A1D`, Kakao `#FEE500`을 사용한다. accent 위 일반 텍스트는 ink를 사용한다.
6. 320px에서 가로 overflow가 없고 safe-area 계약을 훼손하지 않는다. 실제 CTA는 만들지 않아도 된다.
7. 외부 폰트·이미지·CDN·네트워크 요청을 추가하지 않는다.

### 6. Tailwind v4

1. 각 앱 Vite 설정에서 공식 `@tailwindcss/vite` 통합을 사용한다.
2. `@denn/ui/theme.css`에서 Tailwind v4 import·theme mapping과 plain CSS token fallback의 단일 권위를 설계한다. 두 앱에 토큰을 복제하지 않는다.
3. 최신 CSS 기능이 없어도 텍스트·기본 배경이 무너지지 않는 fallback을 유지한다.
4. Tailwind v3 config나 병행 설치를 만들지 않는다.

### 7. 테스트·품질 게이트

1. Vitest는 `@denn/shared` export, 웜 토프 토큰 문자열과 accent-ink 계약, 앱 식별자 비중복을 검증한다.
2. Playwright는 두 앱을 서로 다른 로컬 포트에서 실행해 각 앱 제목·헤딩·상태, 320×568/데스크톱 overflow 0, console error 0, axe serious/critical 0과 color-contrast 포괄 제외 없음, 교차 앱 텍스트 부재를 검증한다.
3. 고정 sleep, 무조건 retry, skip/only를 사용하지 않는다.
4. 각 앱 빌드 gzip JS/CSS를 기록하고 고객 JS 250KB·관리자 JS 350KB·CSS 75KB 예산 안인지 확인한다.
5. Firebase/Rules 테스트는 `NOT APPLICABLE — SDK/Rules 무변경`으로 기록한다. PASS로 꾸미지 않는다.

### 8. 운영본 보존 가드

구현 전후 다음 파일의 blob hash 또는 git diff를 비교해 무변경을 증명한다.

- `denn-mockup-tool.html`, `denn-admin.html`
- `firebase.json`, `.firebaserc`, `storage.rules`, `firestore.rules`

현재 Hosting `public: "."`이므로 신규 소스가 운영 배포 대상 트리에 존재할 수 있다. 이번 스펙에서는 어떠한 Firebase deploy도 실행하지 않는다. 실제 Hosting public 경로 분리는 별도 cutover/배포 스펙에서 처리한다.

## 검증 절차 (VERIFY)

- [ ] 시작 HEAD `64ca533`, 원격 동기화, clean 기록
- [ ] 정확 metadata·peer·license 기록, major 세대 무변경
- [ ] Node `>=24 <25`, `.nvmrc=24`, Corepack pnpm 11.15.1
- [ ] release-age allowlist 필요성 재검증과 최종 상태 기록
- [ ] 설정 JSON을 `git add -f` 없이 추적 가능, 데이터 백업 JSON은 계속 무시
- [ ] 단일 루트 pnpm lockfile, 다른 lockfile 0, frozen install lockfile diff 0
- [ ] workspace 2 apps + 5 packages 정확히 인식
- [ ] 내부 의존성 `workspace:*`, 상대 src 침투 0, 순환 의존 0
- [ ] format check PASS, lint warning/error 0, strict typecheck 오류 0
- [ ] Vitest unit 전체 PASS
- [ ] mockup/admin 독립 production build PASS 및 gzip 예산 내
- [ ] Playwright 두 viewport×두 앱 PASS, overflow 0, console error 0
- [ ] axe serious/critical 0, color-contrast 포괄 제외 없음
- [ ] 네트워크/Firebase SDK/config/secret/외부 URL 검색 0
- [ ] Router·Zustand·Radix/shadcn 미설치
- [ ] 기존 POC 두 디렉터리 무변경
- [ ] 운영 HTML·Firebase config/Rules hash 무변경
- [ ] Preview channel·production 배포 미실행
- [ ] 보고서에 변경 파일, 정확 버전, 명령별 결과, 번들 크기, 미검증, 위험, 롤백 기록

완료 정의(DONE): 루트 workspace와 2개 앱·5개 패키지 골격이 계약대로 생성되고 frozen install부터 E2E까지 모든 적용 게이트를 통과하며 운영본·Firebase·POC가 무변경이고, scaffold 코드/config 커밋과 결과 핸드오프 커밋을 분리해 push한 뒤 로컬=원격·작업트리 clean을 확인하고 Codex 재검증을 요청한다.

## 위험 (RISK)

- Hosting `public: "."` 상태에서 신규 소스가 루트에 생기므로 배포 금지를 지키고 후속 Hosting 격리 전에는 deploy하지 않는다.
- package skeleton placeholder를 실제 구현 완료로 오해하지 않도록 미구현 책임을 명시한다.
- source export는 초기 내부 계약이다. 패키지별 별도 빌드가 필요해지면 후속 스펙에서 출력 계약을 정한다.
- blanket JSON ignore 수정 시 데이터 백업이 staged될 수 있으므로 신규 JSON 전체를 검토한다.
- 실제 제품 기능·Firebase·암호화·Canvas 호환은 이번 스펙에서 검증되지 않는다.
- 롤백은 스펙 010 scaffold·handoff 커밋을 역순 `git revert`한다. 운영본과 Firebase는 별도 롤백이 없어야 한다.

## QUESTIONS

- 정확 patch metadata가 승인 세대와 충돌하거나 필수 peer가 새로 발생하면 설치하지 말고 보고한다.
- Firebase SDK 또는 실제 기능 코드가 skeleton 빌드에 필요해 보이면 임의 도입하지 말고 후속 스펙으로 분리한다.

### DONE (Claude) — 작성 대기
