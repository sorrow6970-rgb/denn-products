# 2026-07-23 스펙 011 핸드오프 — @denn/ui 공유 기반 프리미티브

> 브랜치 `rebuild/modern-studio`. 스펙 011 구현 완료(로컬, 자동검증 전부 통과). Codex 재검증 대기.
> main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.

## 무엇을 했나

`@denn/ui`에 Modern Studio 웜 토프 디자인 계약 위에 재사용 프리미티브 6종을 만들고, 두 앱이 패키지 경계로 소비하도록 데모 셸을 재구성했다. 제품 기능은 만들지 않았다.

- 프리미티브: **Button**(primary/ghost/kakao) · **Card** · **Badge** · **Chip**(선택 토글, aria-pressed) · **TextField**(label + description/error ARIA) · **VisuallyHidden**(clip 패턴).
- 토큰: `theme.css`가 단일 원본. 누락 토큰(`--panel`/`--radius`/`--radius-lg`/`--shadow-soft`/`--shadow` + success) 보강, @theme·:root 동일화. `--accent` 위 텍스트=`--accent-ink`, kakao=`#191600`, 흰색-on-웜토프 없음.
- 상태 계약: 44px 터치, focus-visible 링, hover는 `@media (hover:hover)`, `prefers-reduced-motion`, disabled=native, 색만으로 상태 전달 금지.

## 검증 (Node 24.18.0 / pnpm 11.15.1)

| 게이트 | 결과 |
|---|---|
| `install --frozen-lockfile` + lock diff | 성공, diff **0** |
| `format:check` / `lint` / `typecheck` | PASS |
| `test`(unit) | **25/25** (토큰 드리프트 + 컴포넌트 ARIA 계약) |
| `build` (mockup·admin 독립) | PASS, JS gzip ≈ 61.07/61.08KB, CSS 2.62KB |
| `test:e2e` (2 앱 × 320·1280) | **4/4** (focus-visible·44px·overflow 0·axe 0·console 0) |
| `check`(aggregate) | PASS |

## 방식 결정 (중요)

- React 의미/ARIA 계약은 **저장소에 이미 있는 `react-dom/server`의 `renderToStaticMarkup`**으로 node 환경에서 검증. **jsdom/happy-dom/RTL 미도입.** `@denn/ui`에 react/react-dom(peer+dev, 기존 lockfile 버전)·@types(dev)만 추가 → **신규 다운로드 0**(lockfile importer 항목만 증가).
- 토큰 드리프트는 **전체 CSS 스냅샷이 아니라** 토큰 이름·값을 명시 검증(스펙 §2 지시).
- axe color-contrast 발견: muted `#71717A`는 흰 카드 위(4.84)는 통과하나 페이지 bg `#F4F4F5` 위(4.39)는 미달 → 식별 문단을 흰 Card 안으로 옮겨 해소(토큰값 무변경).

## 무변경/금지 (유지)

- 운영 HTML·`firebase.json`·`.firebaserc`·`firestore.rules`·`storage.rules`·`poc/**`·`docs/rebuild/design/*.png` **hash UNCHANGED**.
- Firebase SDK/Router/Zustand/Radix/shadcn **신규 설치 0**, 네트워크 요청·**배포 0**. Hosting `public:"."` 무변경.

## 수동 확인(데스크톱 Chrome 실측)

- primary/ghost/kakao/disabled 시각 구분 ✅, 키보드 focus-visible 링 ✅, 선택 칩 채움 마크+볼드(색 외 신호) ✅, 오류 필드 보더+텍스트+aria-invalid ✅.
- 320px overflow 0·44px는 e2e 프로그램 검증 정본. **브라우저 200% 육안 재확인은 이번 세션 미수행**(스펙상 실기기 4환경은 이번 자동 완료 조건 아님).

## 다음

- Codex 스펙 011 재검증 대기. 이후 후보: `@denn/render` Canvas · `@denn/firebase` SDK 연결 · `@denn/spaces` 암호화 · 카탈로그/주문/시안 기능 · Hosting 격리·cutover. **새 스펙 없이 임의 착수 금지.**
