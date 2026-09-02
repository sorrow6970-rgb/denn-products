# Spec 084 handoff - local visual readiness audit

## 상태

- `READY_FOR_CODEX` — Codex 검수 라운드 1 보완 완료(2026-08-31), 결과는 아래 `보완 라운드 1 결과` 절
- active unit: `spec-084-local-visual-readiness-audit`, fix_round `1`
- 기준: 검수 시작 `HEAD=origin=b903976`, ahead/behind `0/0`
- 직전 완료: spec 083 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- next: `CODEX_SPEC_084_REVIEW_ROUND_2`

## 목적

현재 고객·운영자 화면의 local Chromium 시각 증거를 같은 기준으로 수집하고, 제품 route와 합성 fixture를
구분한 감사 보고서를 만든다. 이 단위에서는 제품 UI/CSS를 수정하지 않는다.

## 직접 확인된 출발점

- spec 018, 063, 080 결과는 고객 제품 화면 증거다.
- spec 083 결과는 실제 제품 panel을 사용하지만 full-page PNG에 fixture 제목·진단·제어 UI가 함께 있다.
  최종 운영자 시각 승인 자료가 아니므로 spec 084에서 제품 panel locator 증거를 별도로 만든다.
- 고객 composer, 운영자 shell/editor/error state를 한 provenance 표로 비교하는 결과가 아직 없다.

## Claude Code 실행 범위

정본 `docs/rebuild/specs/084-local-visual-readiness-audit.md`를 그대로 따른다.

허용되는 비문서 변경은 신규 `tests/e2e/local-visual-readiness.spec.ts`와
`docs/rebuild/results/spec-084/**`뿐이다. 제품 source/CSS, 기존 test/config/script, package/lockfile,
Rules/Firebase config는 수정하지 않는다.

각 PNG에 `PRODUCT_ROUTE`, `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`, `FIXTURE_CONTROL_ONLY` provenance를
붙이고, fixture를 제품 route라고 부르지 않는다. P0/P1/P2 finding은 기록만 하며 고치지 않는다.

## 검증 및 종료

- `node scripts/check.mjs`
- `node scripts/e2e-run.mjs`
- `git diff --check`
- forbidden diff, bundle hash, 포트/temp, 보호 hash 확인

완료 시 구현·결과 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. Codex 검수 전 제품
UI 보완, 실제 기기·Firebase/network/emulator/deploy, 다음 스펙을 시작하지 않는다.

## 보호·기존 dirty

다음은 수정·삭제·restore·checkout·stage·commit하지 않는다.

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- spec 018 PNG 두 장
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`, `AGENTS.md` 및 기타 기존 Founder/user dirty

## 감사 수행 결과 — Claude Code (2026-08-31)

- 계약 문서 대행 commit `6304cfb`, 감사 산출물 `3c2e9f8`. 신규는 `tests/e2e/local-visual-readiness.spec.ts`,
  `docs/rebuild/results/spec-084/**`(PNG **15** + README + `measurements.json`), 감사 보고서
  `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`뿐이다.
  제품 source/CSS·기존 test/config/script·package/lockfile·Rules diff **0**.
- 등급(PNG 15장): `PRODUCT_ROUTE` **7** / `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` **8** /
  `FIXTURE_CONTROL_ONLY` 0. measurement-only 3건은 모두 route다(최초 보고의 14장·4건·7/7은 오기였고
  보완 라운드 1에서 정정했다).
  발급 panel은 locator 캡처 + fixture chrome 비교차·내부 harness testid 0 단언으로 spec 083 PNG 문제를
  구조적으로 해결했다.
- 자동 측정 18건: overflow 0(320~1280), 화면 밖 control 0, 제품 영역 44px 미만 2건(C5 select 23px),
  키보드 순서=DOM 순서, focus 표시 누락 0, axe serious/critical 0, console error/warning 0, 외부 요청 0,
  Canvas 0x0 0, 금지 문자열 0. 측정 설계 2건(fixture 버튼 오탐·프로그램적 focus 오탐)은 자체 정정했다.
- finding 8건 분류만, 제품 UI 수정 0: P1 5건(composer 미리보기 위치 · 스타일 없는 영어 파일 선택 ·
  Space 인증 후 잔존 안내 · admin 제품 route가 데모 셸 · C5 select 23px), P2 3건.
- NOT TESTED: 제품 entry의 Space·C5·발급 panel, C5 쓰기 실패 상태, 실기기·preview channel·운영 데이터.
- 실측: `node scripts/check.mjs` PASS(unit **2466/2466**, build 2), canonical `node scripts/e2e-run.mjs`
  **Chromium 203 passed / 0 failed / 0 skip / 0 retry**(신규 19), `git diff --check` PASS, 포트·temp·
  `test-results`·`debug.log` 잔류 0.
- bundle 무변경: 고객 `index-CRHkWFoL.js` 340.60 kB `5b569772…`, admin `index-BeV6iIrs.js` 295.32 kB
  `bdbc113a…`. 보호 대상 hash 동일, spec 018 PNG 2장만 canonical E2E가 다시 썼고 stage/restore 0
  (`ace8d75b…`→`7504f96a…`, `6bdcb88c…`→`99ec9df3…`).
- 상태 `READY_FOR_CODEX`, next `CODEX_SPEC_084_REVIEW`. 후속 UI 보완·다음 스펙은 시작하지 않았다.

## 보완 라운드 1 결과 — Claude Code (2026-08-31)

Codex `CORRECTION_REQUIRED` 라운드 1의 네 항목만 처리했다. 허용 파일 밖 변경 0, 제품 UI/CSS·제품
source·fixture·기존 test/config/script·package/lockfile/workspace·Rules/Firebase config 변경 0, 실제
Firebase/network/emulator/deploy 0, 다음 스펙 0.

- **개수·등급 정정.** `measurements.json` 18건 = **PNG 15장 + measurement-only 3건**, PNG 등급
  `PRODUCT_ROUTE` **7** / `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` **8** / `FIXTURE_CONTROL_ONLY` **0**.
  spec DONE·결과 README·감사 보고서·이 handoff·STATE/NEXT/CURRENT/live log를 실제 값으로 고쳤다.
- **참조 정정.** 감사 보고서 자동 측정표의 `44px 미만 pointer target 2건`은 F-2가 아니라 C5 select
  **F-5**를 가리킨다. 다른 finding의 의미·우선순위는 그대로다.
- **고정 시각(test-only).** composer 시계가 실제 `Date.now()`를 읽는 것이 원인이었다. 캡처 spec의
  `beforeEach`에서 첫 `goto` 이전에 `page.clock.setFixedTime(2026-08-31T00:30:00Z)`을 적용하고
  `timezoneId: Asia/Seoul`도 고정했다(표시 `09:30`). `install`이 아닌 `setFixedTime`이라 타이머는 실제
  시간으로 계속 돌고 제품 ticker 동작은 그대로다.
- **나머지 픽셀 흔들림.** ① 이미 시작된 색 transition이 촬영 시점에 보간 중 → 캡처 직전
  `document.getAnimations()` 전부 `finish()`. ② 카드 모서리 raster가 로드마다 달라짐(geometry는 동일,
  같은 페이지 연속 촬영은 바이트 동일) → `--disable-partial-raster`. timeout·retry·skip·screenshot
  tolerance는 추가하지 않았다.
- **재현성 증명.** canonical `node scripts/e2e-run.mjs` **연속 2회**에서 spec-084 PNG **15장 SHA-256 전부
  동일**, `measurements.json`도 바이트 동일. 두 회차 모두 Chromium **203 passed / 0 failed / 0 skipped /
  0 retry**.
- **실측.** `node scripts/check.mjs` PASS(unit **2466/2466**, 92 파일, build 2), `git diff --check` PASS,
  포트 4183/4184/4185/8080/9099/9199 LISTENING 0, `denn-e2e-*`·`test-results`·`playwright-report`·
  `debug.log` 잔류 0. bundle 무변경(고객 `index-CRHkWFoL.js` 340.60 kB `5b569772…`, admin
  `index-BeV6iIrs.js` 295.32 kB `bdbc113a…`).
- **보호 대상.** design README·spec 038·`packages/render/src/plan/index.ts`·`pnpm-workspace.yaml`·
  `AGENTS.md`·`taste-v2/**` 시작/종료 hash 동일, restore·checkout·stage·commit 0. spec 018 PNG 2장은
  canonical E2E가 다시 썼고 stage/restore 0: desktop `ace8d75b…` → 1회차 무변경 → 2회차 `4a1f9fe8…`,
  mobile `6bdcb88c…` → 두 회차 무변경.
- 상태 `READY_FOR_CODEX`, next `CODEX_SPEC_084_REVIEW_ROUND_2`. 후속 UI 보완·다음 스펙·실제
  Firebase/network/emulator/deploy는 시작하지 않았다.
