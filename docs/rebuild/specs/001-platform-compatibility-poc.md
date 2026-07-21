# 001 — 모바일 플랫폼 호환성 POC

상태: **READY FOR USER APPROVAL**

## 목표 (WHY)

전체 리빌드 스캐폴드와 기술 버전을 고정하기 전에, 후보 프런트엔드 도구와 Modern Studio 디자인의 최소 산출물이 실제 목표 모바일 브라우저에서 깨지지 않는지 검증한다.

이 POC는 제품 기능을 구현하지 않는다. Tailwind 세대 선택, viewport·safe area·키보드·회전·Canvas·Fullscreen fallback 설계에 필요한 관측 근거를 만든다.

## 적용 결정서

- `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-performance-and-resource-budgets.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-dependency-and-technology-policy.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-error-logging-observability.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`

## 범위 (SCOPE)

### 포함

- 삭제 가능한 독립 POC 디렉터리 1개
- 후보 Node·pnpm·Vite·TypeScript·React·Tailwind 버전의 공식 근거 기록
- Modern Studio 핵심 토큰의 최소 UI
- 소형 모바일부터 데스크톱까지 레이아웃 스트레스 화면
- `dvh`·`svh`·safe area 관측
- 입력 포커스·가상 키보드·Visual Viewport 관측
- 세로↔가로 회전 관측
- Canvas CSS 크기·backing-store·DPR 관측
- Fullscreen·orientation API 기능 탐지와 정상 fallback
- 수평 overflow·버튼 이탈·터치 크기 자동 검사
- 실제 기기 수동 검증표
- Tailwind v4 유지 또는 v3.4 비교 필요성에 대한 결과 보고

### 제외

- 모노레포 본 구조 생성
- `apps/`, `packages/` 생성
- React Router·Zustand·Firebase·shadcn 설치
- Firebase 초기화·인증·Storage·Firestore
- 운영·Preview 데이터 읽기·쓰기
- 기존 HTML·Firebase 설정·Rules 수정
- 액자·케이스·룸·템플릿·주문 기능 구현
- 실제 이미지 업로드
- production 및 Firebase Preview Channel 배포
- 기존 `?space=` 링크 접근
- 디자인 시안 전체 재현

## 대상 (WHERE)

신규 임시 디렉터리:

```text
poc/platform-compatibility/
  README.md
  package.json
  src/
  tests/
  results/
```

루트 workspace, 기존 package 설정, Firebase Hosting에는 연결하지 않는다. POC는 자기 디렉터리 안에서만 설치·실행·삭제 가능해야 한다.

루트에 lockfile 또는 설정을 만들지 않는다. POC에서 생성되는 lockfile은 POC 디렉터리 안에 둔다.

## 사전 게이트 — 버전 근거

코드를 생성하기 전 `poc/platform-compatibility/README.md`에 다음을 기록한다.

- 실행일
- Node·pnpm 후보와 공식 지원 근거
- Vite 후보의 공식 Node·브라우저 요구사항
- React 후보의 공식 stable 버전
- Tailwind v4의 공식 브라우저 호환 조건
- Tailwind v3.4 비교 후보의 지원 근거
- Vitest·Playwright 후보의 공식 release 또는 package metadata
- 각 패키지 라이선스
- 실제 설치할 정확 버전

허용 출처:

- 공식 문서·공식 changelog·공식 GitHub release
- npm registry의 공식 package metadata

금지 출처:

- Wikipedia
- 블로그·검색 요약만으로 버전 확정
- 기억에 의존한 `latest`

공식 근거와 설치 버전이 다르면 구현을 중단하고 `QUESTIONS`에 기록한다.

## 구현 지시 (WHAT / HOW)

### 1. 최소 기술 구성

- React·TypeScript·Vite 후보만 사용한다.
- 스타일 후보는 Tailwind v4를 우선 관측하되 비교 가능한 최소 CSS fallback을 둔다.
- React Router, Zustand, Firebase, Radix, shadcn은 설치하지 않는다.
- 외부 이미지·폰트·API 요청 없이 동작한다.
- 시스템 폰트 fallback을 사용한다.
- POC는 정적 파일만 생성한다.

### 2. 화면 구성

한 페이지에 다음 영역을 구현한다.

#### A. 환경 진단 패널

표시 항목:

- user agent의 민감하지 않은 브라우저 범주
- `window.innerWidth/innerHeight`
- `visualViewport.width/height/offsetTop/scale`—지원 시
- `devicePixelRatio`
- orientation 값—지원 시
- `document.fullscreenEnabled`
- `screen.orientation.lock` 지원 여부
- CSS `100vh`, `100svh`, `100dvh` 측정값
- safe-area가 적용된 진단 박스
- `CSS.supports()` 결과: `height:100dvh`, `color:color-mix(...)`, `@property` 사용 여부를 확인할 수 있는 관측

전체 UA 원문을 외부로 전송하거나 저장하지 않는다. 진단 정보는 화면에만 표시한다.

#### B. 반응형 편집기 스트레스 레이아웃

- 상단 브랜드 바
- 중앙 비율 유지 Canvas 프리뷰
- 긴 한국어 라벨을 포함한 도구 목록
- 최소 44×44 버튼
- 색상 스와치
- 긴 텍스트 input
- sticky 또는 fixed CTA
- 하단 내비게이션
- 모바일 바텀시트
- 데이터가 많은 스크롤 영역

320px 너비와 낮은 가로 화면에서도 수평 페이지 overflow가 없어야 한다.

#### C. 키보드·바텀시트

- input과 textarea
- 포커스 시 현재 Visual Viewport 수치 표시
- CTA와 포커스 입력이 키보드에 가려지는지 육안 확인 가능
- 바텀시트 내부 스크롤과 페이지 스크롤의 경계를 명확히 함
- 키보드가 닫힌 뒤 레이아웃과 스크롤이 안정적으로 복구돼야 함

입력값은 네트워크·웹 저장소에 저장하지 않는다.

#### D. Canvas·DPR

- 고정 종횡비 Canvas 1개
- ResizeObserver 또는 단일 레이아웃 소유자를 통해 크기 갱신
- CSS 크기와 backing-store 크기 표시
- DPR 상한 2 적용 여부 표시
- 회전·resize 후 그림과 비율이 유지되는지 확인할 기준선·텍스트 렌더
- 인쇄 export는 구현하지 않음

#### E. Fullscreen·orientation fallback

- 기능 탐지 결과를 먼저 표시
- Fullscreen 요청 버튼
- 요청 실패·거부 시 사용자에게 정상적인 fallback 메시지
- orientation lock은 지원되고 fullscreen 상태인 경우에만 시도
- 중복 전환 차단
- 최소 상태 머신:

```text
idle → entering → active → exiting → settling → idle
```

- 임의의 다중 timer 보정 금지
- 지원하지 않는 웹뷰에서도 페이지 핵심 조작은 유지

### 3. Modern Studio 토큰

다음 확정값을 사용한다.

- accent `#C0614A`
- accent-2 `#D8846F`
- accent-soft `#F6E6E1`
- kakao `#FEE500`

테라코타 위 흰색 일반 텍스트 명암비를 계산하고 결과를 기록한다. AA 미달이면 POC에서 임의로 확정 토큰을 변경하지 말고 대안 색상 후보와 계산값만 결과에 제안한다.

Tailwind 기능이 지원되지 않을 때도 핵심 레이아웃·텍스트·버튼은 CSS fallback으로 사용 가능해야 한다.

### 4. 오류·관측

- 외부 오류 수집 도구를 추가하지 않는다.
- 오류는 POC 화면의 진단 영역에 안전한 코드로 표시한다.
- 빈 `catch` 금지
- UA, 입력값, 화면 캡처를 외부로 전송하지 않는다.
- 브라우저 콘솔에 예상하지 않은 오류가 없어야 한다.

### 5. 자동 검사

최소 viewport:

| 구분 | viewport |
|---|---:|
| 소형 모바일 | 320×568 |
| 일반 모바일 | 360×800 |
| iPhone 계열 | 390×844 |
| 대형 모바일 | 430×932 |
| 모바일 가로 | 844×390 |
| 태블릿 | 768×1024 |
| 데스크톱 | 1280×800 |

각 viewport에서 검사:

- `document.documentElement.scrollWidth <= clientWidth`
- 핵심 CTA viewport 이탈 없음
- 주요 버튼 최소 44×44
- input·Canvas·바텀시트가 부모 영역을 밀어내지 않음
- 예상하지 않은 console error 0건
- 페이지 스크린샷
- axe 기반 자동 접근성 검사—POC 도구 선택이 필요하면 최소 의존성 근거 기록

### 6. 실제 기기 검증표

`results/device-matrix.md`에 다음 환경을 기록한다.

| 환경 | 최소 검증 |
|---|---|
| iPhone Safari | 세로·가로, 키보드, safe area, fullscreen fallback |
| Android Chrome | 세로·가로, 키보드, fullscreen |
| 카카오톡 인앱 | 레이아웃, 키보드, 회전, fullscreen fallback |
| Samsung Internet | 레이아웃, 키보드, 회전, CSS 기능 |

각 환경마다:

- 기기/OS/브라우저 또는 앱 버전—확인 가능한 범위
- 실행 URL 또는 로컬 접근 방법
- CSS 기능 결과
- 버튼 밀림·겹침·overflow
- 키보드 전후 viewport
- 회전 전후 상태
- Canvas DPR·비율
- Fullscreen·orientation 결과
- 스크린샷 또는 영상 파일명
- PASS / FAIL / NOT TESTED

사용자가 실제 기기에서 검증하지 않은 항목은 추정으로 PASS 처리하지 않는다.

## 검증 절차 (VERIFY)

Claude Code는 정확한 명령을 POC README에 기록하고 다음 결과를 제출한다.

- [ ] POC 디렉터리 밖 변경 0건—본 스펙 결과 기록 제외
- [ ] frozen lockfile 설치 성공
- [ ] TypeScript strict 검사 성공
- [ ] lint 성공—도입한 경우
- [ ] 유닛 테스트 성공
- [ ] production build 성공
- [ ] viewport 자동 검사 전부 성공
- [ ] 스크린샷 생성
- [ ] console error 0건
- [ ] 접근성 자동 검사
- [ ] 번들 gzip 크기 기록
- [ ] Tailwind 기능 지원·fallback 결과 기록
- [ ] 실제 기기 행은 PASS/FAIL/NOT TESTED로 정직하게 기록
- [ ] Firebase·운영 URL·운영 데이터 요청 0건

## 완료 정의 (DONE)

다음이 모두 충족돼야 한다.

1. 공식 출처 기반 정확 버전과 라이선스 기록
2. 자동 viewport 매트릭스 통과
3. Tailwind v4 호환과 fallback 결과 확보
4. 적어도 사용 가능한 실제 기기 환경에서 결과 기록
5. 미검증 환경을 명시
6. Tailwind v4/v3.4 권고안
7. Vite·React·Node·pnpm 버전 권고안
8. POC가 독립적으로 삭제 가능
9. 기존 운영 파일과 Firebase 무변경
10. Codex 재검증 판정

## 위험 (RISK)

- 데스크톱 에뮬레이션은 실제 인앱 웹뷰 동작을 대체하지 못한다.
- 카카오 앱·System WebView 업데이트 상태에 따라 결과가 달라질 수 있다.
- Fullscreen·orientation은 브라우저 정책과 사용자 제스처에 의존한다.
- 로컬 네트워크 접근 방식에 따라 모바일 테스트가 막힐 수 있다.
- POC가 통과해도 제품 전체 성능·기능 호환을 보장하지 않는다.

## 롤백

- POC 디렉터리와 본 스펙의 결과 기록만 제거하면 된다.
- 루트 설정, 기존 앱, Firebase에 연결하지 않으므로 운영 롤백은 발생하지 않아야 한다.
- POC 외 파일이 변경됐다면 구현을 완료 처리하지 않고 먼저 변경 범위를 보고한다.

## QUESTIONS

- 실제 기기 검증 시 사용할 접근 URL은 구현 후 사용자 승인 아래 별도 결정한다. 외부 공개 배포는 이 스펙 범위가 아니다.

## 구현 후 보고 형식

### DONE (Claude) — YYYY-MM-DD

- 커밋:
- 정확한 설치 버전과 공식 근거:
- 변경 파일:
- 실행 명령·결과:
- viewport 자동 검사:
- 번들 크기:
- Tailwind v4 기능·fallback:
- 실제 기기 매트릭스:
- 미검증:
- 권고 스택:
- 알려진 위험:
- 롤백:
