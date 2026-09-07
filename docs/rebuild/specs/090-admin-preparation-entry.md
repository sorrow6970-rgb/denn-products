# 090 - 운영자 작업 준비 진입 화면

## 목표 (WHY)

Founder F-4=A(2026-09-07 결정 정본)에 따라 UI 데모를 정리하고 실제 남아 있는 로컬 도구와
원격 읽기 상태가 첫 화면의 목적이 되게 한다. 기준 `830a644`, 작성·구현·검토 Codex, 상태 DONE / CODEX_PASSED.

## 범위 (SCOPE)

운영자 App의 데모 3카드/보기 useState만 제거하고 첫 카드의 브랜드·제목·안내를 정리한다.
Modern Studio 기존 Card/Badge/stack/VisuallyHidden 사용, 새 CSS/아이콘/이미지/의존성 없음.
useOwnedAdminComposition, PrintSizeCmDraft, 읽기 카드, write/issue 분기 및 gate를 그대로 보존한다.
고객 F-7은 별도 spec091, F-8은 기존 계약 유지로 종료. 네트워크/배포/운영전환 없음.

## 대상 (WHERE)

- 제품/test: `apps/admin/src/App.tsx`, 신규 `apps/admin/src/App.test.tsx`, `tests/e2e/scaffold.spec.ts`.
- 문서: 이 계약, `docs/handoff/2026-09-07-spec-090-admin-preparation-entry-handoff.md`, STATE/NEXT/CURRENT/live,
  `docs/codex-claude-handoff/decisions/2026-09-07-ui-audit-f4-f7-f8-decisions.md`, spec089 handoff의 승인 링크만.
- 증거: `docs/rebuild/results/spec-090/README.md`, `admin-preparation-{320x568,1280x800}.png`;
  기존 spec084 `operator-shell-default-off-{1280x800,390x844}.png`, README 정정,
  canonical measurements.json 중 operator/shell 3항목의 직접 변화만.
- 보호: taste-v2/**, design README, spec038, spec018 PNG 2장, render/plan/index.ts,
  pnpm-workspace.yaml, AGENTS.md. 기존 dirty 보존. spec018의 기존 canonical 재생성 예외만 hash 보고,
  restore/stage/commit 금지. 그 외 예상 밖 생성물 변화 STOP.
- packages/Rules/config/fixture/package/lockfile·실제 Firebase/live/emulator/UID/배포·자동화 금지.

## 구현 지시 (WHAT / HOW)

1. 브랜드 Badge는 DENN PRODUCTS, h1은 `운영자 작업 준비`. 안내 `작업에 필요한 도구와 연결 상태를
   확인하세요.`. 실제 연결 여부를 추측한 상태 문구를 만들지 않는다. app-id는 기존 값으로
   VisuallyHidden에 보존한다. HTML title/route는 변경하지 않는다.
2. `기본/보조/카카오로 주문/비활성` 데모, 보기 옵션과 담당자 상시 오류/검색어 데모를 제거한다.
   대체 CTA나 새 로그인/연결 버튼을 만들지 않는다. 로컬 도구/원격 읽기 카드 순서와 동작은 그대로다.
3. SSR에서 제목/로컬 도구/읽기 unconfigured/데모 부재를 검증한다. env flag는 test에서 명시적으로
   false로 stub하고 afterEach 복원한다. SDK/network 호출을 허용하는 설정은 사용하지 않는다.
4. scaffold E2E의 제거된 데모 존재 단언은 승인된 부재 단언으로 교체한다. 여전히 존재하는 치수 input
   2개로 min44/실제 키보드/로컬 입력을 검증한다. gate off·읽기 unconfigured·write/issue UI 0·외부요청0,
   overflow/axe/console 기준 유지. timeout/worker/retry/skip 완화 금지.

## 검증 절차 (VERIFY)

targeted App unit → `node scripts/check.mjs` → `node scripts/e2e-run.mjs` 순차 실행.
새 2장과 기존 2장의 실제 제품 default-off route를 시각 검토한다(실제 운영 연결 아님).
고객 bundle hash 동일, 보호 hash/forbidden diff, 문서 PNG 출처 유일성, git diff --check, 포트 6개/
staging 정리 확인. 기존 shared primitive unit coverage는 그대로 남는다. 실제 기기/운영은 NOT TESTED.
원인 미확정 실패는 STOP, 승인된 범위 내 보완만 최대 3회. 코드/증거와 문서는 별도 commit/일반 push.

## 위험 (RISK)

데모 제거를 권한/gate 변경으로 오인하지 않게 읽기 카드의 실제 상태 안내를 유지한다.
정적인 안내에 준비 완료/연결됨을 추측하지 않는다. 기존 작동 컨트롤·StrictMode 소유권을 변경하지 않는다.

### QUESTIONS

F-4=A로 범위 확정, 추가 결정 없음. 이 단위 완료 뒤 승인된 F-7=A를 별도 계약으로 진행한다.

### DONE (Codex, 2026-09-07)

- 제품 `a08c462`: App 1 + SSR/E2E 2 + PNG 4 = 7파일. 데모 카드 3개·상시 오류·보기 state 제거,
  기존 local/read/write/issue 분기와 composition lifecycle 유지. 새 CSS/공유 코드/설정 변경 0.
- targeted unit 1/1, check exit0: unit **2513/2513(93파일, 2.95초)**, format/lint/typecheck/build PASS.
  canonical exit0: **230 passed / 0 failed / 0 skipped / 0 retry, 49.8초**. 순차 실행, 보완 라운드 0.
- 새 SSR은 flag false를 명시·복원한다. 실제 default-off 제품 route에서 버튼/발급 panel 0,
  local input 2개의 44px/keyboard/정상 치수 처리, overflow0/axe0/console error0/외부 요청0 통과.
  제거된 데모 존재 단언은 승인된 부재·실제 도구 단언으로 교체, shared primitive 검증은 유지.
- PNG 4장 직접 확인. 새 2장 hash는 결과 README. spec084 measurements.json diff0.
  고객 entry SHA256 `879FBEF1482D3DBC0075C27C22A1D76FC7C4392C985FF5AD2FC2BFDC39EB1896` 동일.
  admin `index-DqxJJNtB.js` 294.73kB/gzip91.36kB, CSS12.31kB;
  SHA256 `D868510748C60622888FE7E2D6C1B88E119700FD94F74B1D183D7065E6311D30`.
- 보호 20파일 중 19개 hash 동일. spec018 mobile만 기존 canonical 재생성으로
  `6BDCB88C… → EEFA9BE2EE1849442C6D6250219655348BC29588FDEF7F702D2DC91E5E7DB6AC`.
  보호 restore/stage/commit 0. 고객/packages/Rules/config/package/lockfile diff0. git diff --check PASS.
- 포트 4183/4184/4185/8080/9099/9199 LISTENING0, staging `denn-e2e-w1wvHV` 제거,
  신규 debug.log 없음. 실제 Firebase/live/실기기/운영 전환 NOT TESTED/보류 유지.
- 최종 diff·조건부 분기·4PNG 검토에서 추가 결함 미발견. same-agent CODEX_PASSED/DONE이며 별도
  독립 에이전트나 Founder 시각 승인 아님. 전체 기존 추정85~88%/잔여12~15% 유지. 다음 F-7 spec091.
