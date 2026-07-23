# 현재 상태

상태: **✅ 스펙 011 공유 UI 기반 프리미티브 구현 완료(로컬, 자동검증 전부 통과) — Codex 재검증 대기**

> 스펙 011 구현 완료(로컬, 2026-07-23): `@denn/ui`에 Button/Card/Badge/Chip/TextField/VisuallyHidden 6종 + 웜 토프 토큰 계약 완성. 게이트 전부 통과: frozen install diff 0 / format·lint·typecheck 0 / unit **25/25**(토큰↔CSS 드리프트 가드 + 컴포넌트 ARIA 계약) / build 독립(mockup·admin JS gzip ≈61.07/61.08KB, CSS 2.62KB) / e2e **4/4**(키보드 focus-visible·44px 터치·320/1280 overflow 0·axe serious/critical 0·console 0). React 의미 계약은 저장소 기존 `react-dom/server` renderToStaticMarkup으로 검증(**jsdom/happy-dom/RTL 미도입**), @denn/ui react/react-dom peer+dev는 기존 lockfile 버전이라 **신규 다운로드 0**. 토큰 드리프트는 이름·값 명시 검증(전체 스냅샷 아님). axe: muted가 페이지 bg(#F4F4F5) 위 4.39 미달 → 식별 문단을 흰 Card로 이동해 해소(토큰 무변경). 운영 HTML·`firebase.json`·`.firebaserc`·Rules 2종·`poc/**`·디자인 PNG **hash UNCHANGED**, Firebase SDK/Router/Zustand/Radix/shadcn 신규 설치 0, **deploy 미실행**. 코드/설정 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-011-ui-primitives-handoff.md`, DONE는 스펙 하단.

> 스펙 011(2026-07-23): `docs/rebuild/specs/011-ui-foundation-primitives.md`. `@denn/ui`의 웜 토프 토큰 계약과 Button/Card/Badge/Chip/TextField/VisuallyHidden 최소 프리미티브를 고정한다. 두 앱의 스캐폴드 셸에서 패키지 소비·모바일 44px 터치·focus-visible·ARIA·320px overflow·axe를 검증한다. 제품 기능·최종 레이아웃·Canvas·Firebase·Router/Zustand·Radix/shadcn·배포는 제외한다.

> Codex 최종 승인(2026-07-22): 스펙 010 = **승인 가능**(기준 HEAD `1d30a2c`). 모노레포 구조·품질 게이트 타당, @denn/spaces v1-only 계약 정정 완료. frozen diff 0/format·lint·typecheck 0/unit 6/6/build 독립(gzip 60.16KB)/e2e 4/4/경계(상대 침투 0·순환 0)/release-age allowlist 불필요/운영 HTML·firebase.json·.firebaserc·Rules 6 hash UNCHANGED·POC 무변경·Router/Zustand/shadcn/Firebase SDK 미설치·deploy 미실행 확인. **다음 스펙·기능 구현은 미착수(대기).**

> 스펙 010 구현 완료(로컬, 2026-07-22): 루트 pnpm workspace + `apps/mockup`·`apps/admin` + `packages/shared|firebase|spaces|render|ui`(2 apps + 5 packages). react/react-dom 19.2.7·plugin-react 6.0.3(aged patch)·TS 7.0.2·Vite 8.1.5·Tailwind v4·Biome 2.5.5·Node 24. release-age allowlist **불필요**(aged patch로 frozen EXIT 0). 게이트 전부 통과: frozen diff 0 / format·lint·typecheck 0 / unit 4/4 / build 독립(mockup·admin JS gzip 60.16KB, 예산 내) / e2e 4/4(overflow 0·console 0·axe serious 0·교차앱 격리). 경계 `workspace:*`+export(상대 침투 0·순환 0), 각 패키지 placeholder(미구현 명시). **운영 HTML·firebase.json·.firebaserc·Rules hash 전부 UNCHANGED**, POC 무변경, Router/Zustand/shadcn/Firebase SDK 미설치, **deploy 미실행**. `.gitignore` 정상화(설정 JSON `add -f` 불필요, 데이터 백업 무시 유지). 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-monorepo-scaffold-report.md`, 핸드오프 `docs/2026-07-22-spec-010-monorepo-scaffold-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 009 = **승인 가능**(기준 HEAD `1f3e67d`). 확정: Node 24 LTS major(engines `">=24 <25"`+`.nvmrc`=24) · pnpm 11.15.1+Corepack+단일 lockfile · TS 7.0.2 · **Biome 2.5.5(lint+format,`--error-on-warnings`)+`tsc --noEmit` 채택** · typescript-eslint TS7 미지원 미도입 · 최소 pnpm workspace 채택 · minimumReleaseAgeExclude Biome 9항목 유지 · minimumReleaseAge=0 안 함 · 장기 release-age 정책 NOT DECIDED · 스캐폴드 시 allowlist 재검증. **스펙 006 미확정 2건(TS7 린트·최소 workspace) 해소.** 실제 루트 apps/packages/workspace는 스펙 010에서만 생성.

> 스펙 009 구현 완료(로컬, 2026-07-22): 격리 POC `poc/toolchain-workspace/`. Corepack로 pnpm 11.15.1 실행(전역 설치·PATH 변경 없음). **채택 권고: Biome 2.5.5(lint+format, --error-on-warnings) + tsc 7.0.2 --noEmit + 최소 pnpm workspace.** typescript-eslint↔TS7 = 재현된 비호환(peer `<6.1.0`)으로 미설치(force 없음). 정상 게이트 typecheck/lint/format/test 전부 PASS, fixture 3종(lint/format/type) 정상 실패, `workspace:*`+export 경계(상대 침투 0), 단일 lockfile frozen 재현. Node 24 LTS major 고정(engines `">=24 <25"` + `.nvmrc`=24). **release-age: pnpm config=undefined이나 pnpm11 기본 정책 실제 작동 → Biome 2.5.5 allowlist(minimumReleaseAgeExclude 9항목) 유지 시 frozen EXIT 0/제거 시 EXIT 1; release-age 기간·장기 공급망 정책 NOT DECIDED, minimumReleaseAge=0 비활성화 안 함.** 설정 json은 루트 `.gitignore` `*.json` 때문에 `git add -f`. 루트 apps/packages/lockfile·운영본·Firebase·기존 POC·디자인 무변경. 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-ts7-lint-pnpm-workspace-poc-report.md`, 핸드오프 `docs/2026-07-22-spec-009-toolchain-poc-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 008 웜 토프 실기기 표시 = **승인 가능**(기준 HEAD `4df8181`). 4환경×12항목 PASS·영상 관측과 직접 확인 근거 구분·device-matrix 41줄 append-only·001~007 보존·코드/CSS/토큰/테스트/PNG/운영/Firebase/Rules 무변경·영상 저장소 미추가·preview 종료 확인. 주의: 실기기 "오류 없음"은 화면 오류 관측 카드 기준(네이티브 콘솔 원격 디버깅 아님), 데스크톱 자동검증 콘솔 0과 혼동 금지.

> 스펙 008(2026-07-22): 웜 토프 실기기 표시 = iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 **4환경 12항목 전부 PASS**(FAIL 없음). 증거=영상 `screen shot/KakaoTalk_20260722_153026136.mp4`(저장소 미추가)에서 카카오·Samsung 관측 + 사용자 추가 직접 확인, iPhone·Android는 사용자 직접 확인. Samsung·카카오 수동 회전·핀치/200% 확대 정상, 카카오 orientation lock 강제 실패→정상 fallback. 상세 기기·OS·브라우저 버전 = 미기록(추정 안 함). 코드·CSS·토큰·테스트·PNG·운영본·Firebase 무변경, preview 종료. 기록=`device-matrix.md` 스펙 008 별도 섹션(001~007 무변경). 핸드오프 `docs/2026-07-22-spec-008-warm-taupe-device-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 007 웜 토프 마이그레이션 = **승인 가능**(기준 HEAD `95c8445`). 토큰 중앙화·양 계층 일치·accent-ink `#191A1D`·명암비 정합·color-contrast 포괄 제외 없음·이전 리터럴 잔존 0·002/003/fullscreen 회귀 없음·운영/Firebase/001~006 무변경 확인. 자동검증 단계 완료, 새 팔레트 실기기 색상 = NOT TESTED(스펙 008에서 검증).

> 스펙 007 구현 완료(로컬, 2026-07-22): POC 토큰을 웜 토프 `#9F887A`/`#BAA598`/`#EEE8E1`(accent-ink `#191A1D`·kakao 유지)로 중앙 계층에서 교체. 흰색/accent 3.35(미달)→accent-ink 5.20(AA), accent-soft 위 텍스트=ink(14.31). 이전 팔레트 리터럴 실행 코드 잔존 0. 자동검증 typecheck 0 / unit 34 / build(JS gzip 66.47KB) / e2e 11(color-contrast serious/critical 0), 002 확대·003 Canvas·fullscreen 회귀 없음. 코드↔핸드오프 커밋 분리, 디자인 PNG·운영본·001~006 결과는 code 커밋 미포함. 핸드오프 `docs/2026-07-22-spec-007-warm-taupe-handoff.md`. 실기기 표시는 별도 후속 검증.

> 최신 디자인 결정(2026-07-22): Modern Studio(B) 포인트색은 **웜 토프 `#9F887A` / `#BAA598` / `#EEE8E1`**, accent-ink `#191A1D`, 카카오 `#FEE500`으로 최종 확정. 결정서 `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md`, 구현 계약 `docs/rebuild/specs/007-warm-taupe-palette-migration.md`. 이전 카라멜 앰버 스펙 004·005는 당시 검증 이력으로 보존하며 현재 팔레트 기준으로 사용하지 않는다. TS7 린트·최소 pnpm workspace POC는 스펙 007 이후로 순서를 조정한다.

> Codex 최종 승인(2026-07-22): 스펙 006 기술 스택 조사·정정 = **승인 가능**. 승인 기준: Node 24 LTS 기본 · pnpm(Corepack+packageManager+단일 lockfile) · React19/Vite8/TS7/Tailwind v4 기본 후보 · Vitest4/Playwright/axe 검증도구 · Router·Zustand 미도입(요구 시) · Radix/shadcn 컴포넌트별 · 정확 patch는 스캐폴드 직전 lockfile 고정. **미확정=TS7 린트 조합·최소 pnpm workspace 구조(소형 POC).**

> 스펙 006(2026-07-22): 읽기 전용 근거 보고 `docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md`. npm registry metadata + Tailwind 공식 문서 근거. 설치·스캐폴드·package.json/lockfile 무변경. 핵심: 스택 세대(React19/TS7/Vite8/Tailwind v4/Vitest4/Playwright1.61)는 확정 가능·전부 patch 차이. **리스크=typescript-eslint(≤6.0)↔TS 7.0.2 비호환 → 린트 전략 소형 POC 필요**. 권고: **Node 24 LTS**(POC가 24.18.0 통과, 지원 2028-04까지)·Tailwind v4·pnpm 단일 lockfile(Corepack `packageManager` 고정). @vitejs/plugin-react optional peer는 metadata상 optional=true로 **VERIFIED**. 남은 결정=라우팅/상태/UI 도입 시점·TS7 린트 전략.

> 스펙 005(2026-07-22): 새 팔레트 실기기 표시 = iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 **4환경 12항목 전부 PASS**(사용자 직접 확인, 육안). 스크린샷 = 카카오 인앱만 사용자 1장 제공(Codex 채팅 첨부 `codex-clipboard-a8e46ce7-1893-4cb7-817a-2b5875c08b73.png`, 저장소 미추가)·나머지 3환경 없음, 상세 버전 미기록, CSS.supports 기존과 동일. 코드·CSS·토큰·PNG 무변경, preview 종료. 기록=`device-matrix.md` 스펙 005 별도 섹션(001·002·003 무변경). 핸드오프 `docs/2026-07-22-spec-005-device-validation-handoff.md`.

> Codex 최종 재검증(2026-07-22): 스펙 004 팔레트 전환·accent-ink `#191A1D`·디자인 접근성 규격·POC 코드/CSS·명암비 테스트·color-contrast 포함 자동검증·002/003 자동 회귀 = **승인 가능**. 승인 기준 HEAD `7406460`.
> 스펙 004 자동검증 단계 완료. 새 팔레트 실기기 색상은 이후 **스펙 005에서 4환경 PASS·Codex 승인**으로 해소됨. **Tailwind v4 채택 확정**(결정서 2026-07-22). PNG·전체 스캐폴드·Firebase·배포는 계속 대기.

> 기본 배율 1~14: iPhone Safari·Samsung Internet·카카오 인앱 = 전체 **PASS**(Android Chrome NOT TESTED). 자동검증 Codex 승인 기준 HEAD `f4dae95`.
> **확대(200%/핀치) 접근성 게이트:** 최초 4환경 공통 FAIL을 발견했으나 스펙 002 수정·재검증으로 해소.
> **스펙 002 구현 완료(로컬):** 순수 `computeViewportLayout(scale>1.01→isZoomed, keyboardInset=0)`로 확대/키보드 구분 → `.page[data-zoomed]`로 확대 시 `.bottomnav` fixed→흐름 전환 + `.content` 120px 예약여백 정상화 + 키보드 inset 오인 제거. 색상·sheet·역스케일 미변경. 자동검증 typecheck 0 / unit 30 / build(JS gzip 66.44KB) / e2e 11 통과.
> **스펙 002 실기기 완료:** iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 확대 재검증 전부 **PASS**. 접근성 확대 FAIL 해소.
> 색상 결정: **카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA`, accent-ink `#191A1D` 확정**. PNG 재생성은 별도 후속 스펙으로 분리한다.
> **스펙 004 구현 완료(로컬):** 디자인 기준 문서 + 001 POC 코드·CSS·명암비 테스트를 카라멜 앰버로 전환. accent 위 텍스트=accent-ink(5.41:1), accent-soft/흰색 위 텍스트=ink. `#B0894E`는 흰색과 양방향 3.21:1이라 채움·보더 전용. e2e color-contrast **포괄 제외 제거**(serious/critical 0 강제). 자동검증 typecheck 0 / unit 31 / build(JS gzip 66.47KB) / e2e 11 통과. 카카오·확대(002)·Canvas(003) 로직 무변경. 핸드오프 `docs/2026-07-22-spec-004-palette-handoff.md`. 새 팔레트 실기기 색상은 NOT TESTED로 분리.
> **스펙 003 실기기 완료:** 4환경 세로↔가로 Canvas `3:4`·DPR 재검증 전부 **PASS**. 카카오 가로 FAIL 해소. Android Chrome 전체 1~14는 여전히 일부 미검증이지만 확대·Canvas 게이트는 PASS 근거 확보.

## 현재 결론

- 기존 운영 HTML과 Hosting 경로는 그대로 유지한다(무변경 확인).
- 신규 리빌드는 별도 디렉터리에 추가한다. POC = `poc/platform-compatibility/`(삭제 가능).
- Modern Studio(B) 디자인 방향은 확정됐다.
- 기술 스택은 스펙 006에서 읽기 전용 검토했고, 전체 스캐폴드 승인은 아직 나지 않았다.
- 001 POC가 구현되고 로컬 자동검증을 통과했다.
- **Tailwind v4 채택 확정**(4환경 기능 근거 확보, 결정서 2026-07-22). v3.4 병행 설치 금지.

## 브랜치/기준

- 작업 브랜치: **`rebuild/modern-studio`** (HEAD는 아래 커밋). main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.
- production 비교 기준 태그: `prod-baseline-20260721`.

## 001 POC — 완료(로컬)

- 정확 버전(npm registry): React 19.2.7 / react-dom 19.2.7 / Vite 8.1.5 / @vitejs/plugin-react 6.0.3 / TypeScript 7.0.2 / tailwindcss·@tailwindcss/vite 4.3.3 / vitest 4.1.10 / @playwright/test 1.61.1 / @axe-core/playwright 4.12.1 / @types/react 19.2.17 / @types/react-dom 19.2.3. 라이선스 전부 MIT/Apache(axe MPL, devDep).
- 패키지 매니저: npm(`npm ci` frozen). pnpm 미설치라 POC는 npm 사용(README에 근거).
- 자동검증 PASS: `npm ci` / `tsc --noEmit`(strict) / `vitest`(10/10) / `vite build`(JS gzip 65.5KB·CSS 3.3KB) / `playwright`(viewport 10/10).
- ★ 명암비 발견: 흰색/테라코타 `#C0614A` = **4.16:1**(일반텍스트 AA 미달, AA-large/UI 통과). 토큰 미변경, 대안 계산 제안(`#B85A44` 4.58:1 등) — spec §3.
- 접근성: scrollable-region-focusable 해결. color-contrast는 토큰 발견사항으로 기록(하드페일 제외).

### Codex 1차 판정 "수정 후 재검증" — 3건 보완 완료 (POC 범위 내)
1. **orientation lock 실제 시도**: `fullscreen.ts`에 순수 `orientationLockPlan(supported, inFullscreen)` + 컨트롤러가 상태 'active'(전체화면 확인) 후에만 `screen.orientation.lock('landscape')` 시도. 미지원/거부/실패는 비치명적으로 결과만 관측(`OrientationLockResult`), 화면(섹션 E)에 표시. 종료(settling)·detach 시 unlock. 단일 권위·추가 timer 없음. 유닛 3건 추가(총 13/13).
2. **LAN 주소 고정 제거**: device-matrix에서 특정 IP를 기준으로 기록하지 않고 `http://<현재-PC-LAN-IP>:4173` + 현재 IP 확인 안내(예시 IP는 예시로만 명시).
3. **NOT TESTED 명확화**: 14항목·메타 표 바로 위에 "빈 셀=NOT TESTED, 실제 결과 전 PASS/FAIL 금지" 규칙 명시.
- 재검증: typecheck/unit(13)/build(JS gzip 66.1KB)/e2e(10/10) 전부 통과. 운영파일 무변경.

### Codex 2차 판정 "수정 후 재검증" — orientation lock 비동기 종료 경합 1건 보완
- 문제: `so.lock('landscape')` await 중 FS 종료·detach 시, 늦은 성공이 stale하게 `locked`/결과 `locked`를 복원 + 종료 후 결과가 `locked`에서 안 풀림.
- 수정(`fullscreen.ts`): (1) 세대 토큰 `lockGen`(모든 시도 시작 시 ++, 종료·detach 시 ++로 무효화). (2) 순수 `isLockStillValid({attemptGen,currentGen,detached,state,inFullscreen})`로 Promise 완료 시 재확인 — 유효할 때만 `locked` 기록. (3) 늦은 성공(무효)은 `releaseOrientation()`으로 안전 unlock. (4) 종료(settling) 시 결과 `locked→idle` 초기화. (5) `detached` 플래그로 detach 후 `setLockResult`/`dispatch` 통지 차단. 단일 권위·단일 rAF 유지, 임의 timer 없음. 경합 유닛 5건 추가(총 18/18).
- 재검증: typecheck/unit(18)/build(JS gzip 66.25KB)/e2e(10/10) 통과. 운영파일 무변경. **실기기 lock 동작은 NOT TESTED 유지.**

### Codex 3차 판정 "수정 후 재검증" — React StrictMode 재attach 생명주기 1건 보완
- 문제: StrictMode(dev)가 effect를 attach→detach→attach로 재실행. `detach()`가 `detached=true`로 두는데 `attach()`가 복구 안 해, 재attach 후 `dispatch`/`setLockResult`가 계속 조기 return → FS 관측·lock 처리 비활성.
- 수정(`fullscreen.ts` attach): (1) 재attach 시 `detached=false` 복구. (2) `lockGen++`로 새 세션 시작(이전 세대 in-flight lock은 `isLockStillValid`로 계속 무효 — 세대 분리 유지). (3) 단일 attach 정책: 기존 handler 제거 후 등록. (4) 각 detach는 자기 handler만 제거(클로저 캡처). 임의 timer 없음.
- 테스트: `tests/unit/fullscreen-controller.test.ts`(DOM 목, attach→detach→attach 재활성·단일 listener·중복 attach 3건) + `tests/e2e/fullscreen.spec.ts`(FS 버튼 클릭 → 상태처리/정상 fallback 관측, 실제 FS 성공 강제 안 함).
- 재검증: typecheck/unit(**21/21**, 3파일)/build(JS gzip 66.27KB)/e2e(**11**: viewport 10 + fullscreen 1) 통과. 운영파일 무변경. **실기기 NOT TESTED 유지.**

## 실기기 검증 — 완료(3환경) / Android Chrome 대기

- **완료(2026-07-21, 사용자 수행 · Codex가 device-matrix 기록):**
  - iPhone Safari = 1~14 **PASS**. `fullscreenEnabled=false`·`orientation.lock=false`지만 정상 fallback. CSS.supports 전부 지원.
  - Samsung Internet = 1~14 **PASS**. 전부 정상. CSS.supports 전부 지원.
  - 카카오 인앱 웹뷰 = 1~14 **PASS**. Fullscreen 진입 성공(state=active), orientation lock 실패했으나 정상 fallback, 물리 가로 회전 시 가로 레이아웃 정상. CSS.supports 전부 지원.
- **대기: Android Chrome = NOT TESTED**(추정으로 PASS 금지).
- 증거: `KakaoTalk_20260721_210031114.png`, `_210414899.jpg`, `_210414899_01.jpg`, `_210705947.jpg`.
- 상세 기록: `poc/platform-compatibility/results/device-matrix.md`.
- LAN 접근(재현): `npm run preview -- --host` → `http://<이-PC-LAN-IP>:4173`(같은 Wi-Fi, 방화벽 승인 필요, 인터넷 비공개).

## 다음 작업

1. **스펙 010 Codex 재검증** — 스캐폴드 구조·경계·운영본 hash 무변경·배포 미실행 판정.
2. 이후 기능 구현 스펙 순차 진행(각각 별도 스펙): @denn/ui 컴포넌트 확장 · @denn/render Canvas · @denn/firebase SDK 연결 · @denn/spaces 암호화 · 카탈로그/주문/시안 기능 · Hosting public 격리·cutover·배포.
- **주의:** Hosting `public: "."` 상태이므로 배포 격리 전에는 어떤 Firebase deploy도 하지 않는다.

## 시작 조건

- (Android Chrome 검증 시) 사용자가 해당 기기에서 POC 접속·14항목 확인·결과 전달.
- LAN 접근 불가 시: 임시 HTTPS 채널 필요성·안전조치 보고 후 사용자 승인(임의 외부배포 금지).

## Claude Code 금지 (유지)

- 기존 HTML 이동·삭제·수정 / Firebase 연결 / 운영 데이터 접근·쓰기 / 전체 앱·모노레포 스캐폴드 / Preview·production 배포 / Tailwind v3.4 병행 설치·무근거 버전 변경 / force push·reset --hard·clean·자동 merge.

## 검증 요청 형식

```text
검증 요청
커밋: <hash>
목적: <변경 목적>
변경 파일: <목록>
실행한 검사: <명령과 결과>
미검증: <항목>
남은 위험: <위험>
롤백: <방법>
```
