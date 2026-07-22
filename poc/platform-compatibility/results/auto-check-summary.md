# 자동 검사 결과 요약 — 001 플랫폼 호환성 POC

실행일: 2026-07-21 · 실행 환경: Node v24.18.0 / npm 11.16.0 / Windows · Playwright Chromium(headless-shell 149.0.7827.55)

## 설치·빌드·타입·테스트

| 게이트 | 명령 | 결과 |
|---|---|---|
| frozen lockfile 설치 | `npm ci` | ✅ 성공, 취약점 0 |
| 타입 검사(strict) | `npm run typecheck` (tsc 7.0.2 --noEmit) | ✅ 0 오류 |
| 프로덕션 빌드 | `npm run build` (vite 8.1.5) | ✅ 성공 |
| 유닛 테스트 | `npm run test:unit` (vitest 4.1.10) | ✅ 10/10 |
| viewport e2e | `npm run test:e2e` (playwright 1.61.1) | ✅ 10/10 |

## 번들 크기 (gzip)

| 산출물 | raw | gzip | 예산(고객 초기) | 판정 |
|---|---:|---:|---:|---|
| JS `index.js` | 206.20 KB | **65.52 KB** | 250 KB | ✅ 여유 |
| CSS `index.css` | 10.27 KB | **3.28 KB** | 75 KB | ✅ 여유 |
| index.html | 0.49 KB | 0.33 KB | — | — |

JS gzip 65.5KB는 대부분 React+ReactDOM. 후보 스택의 baseline 번들이 고객 예산 내.

## viewport 자동 매트릭스 (전부 통과)

viewport: 320×568 · 360×800 · 390×844(P) · 844×390(L) · 430×932(P) · 932×430(L) · 768×1024(P) · 1024×768(L) · 1280×800 · 1440×900

각 화면 통과 항목:
- 수평 페이지 overflow 없음 (`scrollWidth ≤ clientWidth`)
- 주요 CTA viewport 내 + 높이 ≥44px
- 모든 버튼 ≥44×44
- 예상하지 않은 console error 0건
- 스크린샷 생성(`results/screenshots/*.png`, 10장)
- axe 접근성 분석

## 접근성 (axe)

- **`scrollable-region-focusable`**: 스크롤 영역 키보드 포커스 불가 → `tabindex=0` 추가로 **해결**.
- **`color-contrast`**: ⚠️ **확정 토큰 발견사항**. 아래 참조. spec §3에 따라 토큰 임의변경 없이 기록·대안만 제안.
  → e2e는 `color-contrast`를 하드페일에서 제외(기록만), 그 외 serious/critical a11y는 **0건**.

## ★ 명암비 발견사항 (Modern Studio 토큰)

| 조합 | 대비 | 일반텍스트 AA(4.5) | 큰텍스트/UI(3.0) |
|---|---:|---|---|
| 흰색 / 테라코타 `#C0614A` | **4.16:1** | ❌ 미달 | ✅ 통과 |
| 진회색 `#1A1400` / 카카오 `#FEE500` | ~15:1 | ✅ | ✅ |

- 확정 테라코타 `#C0614A`는 **흰색 일반 텍스트와 4.16:1로 AA(4.5:1) 미달**(AA-large·UI 경계는 통과).
- **토큰을 변경하지 않는다(spec §3).** 사용 권고안:
  1. 흰색 텍스트는 **큰/굵은 텍스트(≥18.66px bold 또는 ≥24px)** 또는 **비텍스트 UI(버튼면·아이콘)** 에만 `#C0614A` 사용.
  2. 일반 본문/작은 라벨은 진한 잉크색(예 `#1A1410`) 사용.
- **대안 색상 후보(흰색 일반텍스트 AA 충족, 계산값)** — 확정 아님, 사용자 결정용:

| 후보 | 흰색 대비 | 비고 |
|---|---:|---|
| `#B85A44` | **4.58:1** | 최소 변경(테라코타 톤 유지, AA 갓 통과) |
| `#B0553F` | 4.98:1 | 여유 |
| `#A94E38` | 5.48:1 | 더 진함 |

## CSS 기능·fallback (진단 패널이 실측)

- 데스크톱 Chromium(149)에서는 `100dvh/svh` · `color-mix()` · `@property` · container query 전부 지원.
- ★ **미검증(실기기 필요)**: 카카오 인앱 웹뷰/구형 System WebView에서 위 기능 지원 여부. 미지원 시 plain-CSS fallback으로
  핵심 레이아웃·버튼·텍스트 유지되는지는 **실기기 진단 패널**(`CSS.supports` 배지)로만 확정된다 → `device-matrix.md`.

## 권고 스택 (POC 근거)

- 후보 스택(React 19.2.7 / Vite 8.1.5 / TS 7.0.2 / Tailwind 4.3.3)은 **데스크톱 baseline에서 통과**.
- **Tailwind v4 vs v3.4**: v4의 브라우저 하한(Chrome 111 / Safari 16.4 / Firefox 128)이 **카카오 인앱 웹뷰 실기기 검증 통과 시 v4 유지 권고**.
  실기기에서 `color-mix`/`@property` 미지원 확인되면 v3.4 비교 필요. → 실기기 결과에 종속(현재 NOT TESTED).
- TS 7.0.2(네이티브 컴파일러)는 본 POC 빌드·타입검사에서 문제 없음.

---

## 2026-07-22 · 스펙 004 카라멜 앰버 팔레트 재검증 (현재 결과)

> 위 2026-07-21 섹션의 테라코타 수치는 **당시 사실로 보존**한다. 아래는 카라멜 앰버 전환 후의 **현재** 측정값이다.
> 실행 환경: Node / npm · Playwright Chromium(desktop-emulated). 실기기 색상 검증은 별도(NOT TESTED).

### 자동 게이트

| 게이트 | 명령 | 결과 |
|---|---|---|
| frozen lockfile 설치 | `npm ci` | ✅ 취약점 0 |
| 타입 검사(strict) | `npm run typecheck` | ✅ 0 오류 |
| 유닛 테스트 | `npm run test:unit` | ✅ **31/31** (명암비 accent-ink 통과 케이스 추가) |
| 프로덕션 빌드 | `npm run build` | ✅ JS gzip **66.47 KB** / CSS gzip **3.35 KB** (예산 내) |
| viewport e2e | `npm run test:e2e` | ✅ **11/11** (color-contrast **포괄 제외 제거** — serious/critical 0) |

- **color-contrast 정책 변경(스펙 004):** 과거(테라코타)에는 확정 토큰 특성상 하드페일에서 제외·기록만 했으나, 카라멜 앰버 전환에서는 accent 위 텍스트를 accent-ink로, accent-soft/흰색 위 텍스트를 ink로 지정해 **미달 노드를 제거**했다. 이제 e2e는 color-contrast를 포함한 모든 serious/critical을 하드페일한다. 10개 viewport 전부 위반 0.
- 스펙 002(확대 접근성)·스펙 003(Canvas 3:4·DPR) 검사도 동일 e2e에서 재실행되어 회귀 없음.

### 명암비 측정값 (카라멜 앰버, `src/lib/contrast.ts` 계산)

| 조합 | 대비 | 일반텍스트 AA(4.5) | 큰텍스트/UI(3.0) | 적용 |
|---|---:|:---:|:---:|---|
| 흰색 `#FFFFFF` / accent `#B0894E` | **3.21:1** | ❌ | ✅ | 일반 크기 텍스트 **미사용** |
| accent-ink `#191A1D` / accent `#B0894E` | **5.41:1** | ✅ | ✅ | **primary 버튼·브랜드바·활성 칩 라벨** |
| 흰색 / accent-2 `#C6A46B` | **2.35:1** | ❌ | ❌ | accent-2 위 흰색·일반 텍스트 금지 |
| accent `#B0894E` / accent-soft `#F2E9DA` | **2.67:1** | ❌ | ❌ | accent-soft 위 텍스트는 **ink** 사용 |
| ink `#191A1D` / 흰색 | 17.4:1 | ✅ | ✅ | 제목·본문·secondary 버튼 라벨 |
| 진회색 `#1A1400` / 카카오 `#FEE500` | 14.35:1 | ✅ | ✅ | 카카오 CTA(무변경) |

- **결론:** accent(#B0894E)는 흰색과 양방향 3.21:1이라 **일반 크기 텍스트 색으로 부적합** → 채움·보더·포인트 전용. 텍스트는 accent-ink(on-accent) 또는 ink(on-light)로 확정 적용. WCAG 2.2 AA 충족.
- **실기기 색상 표시**는 새 팔레트로 재확인 전까지 `device-matrix.md`에서 **NOT TESTED**로 분리 유지.
