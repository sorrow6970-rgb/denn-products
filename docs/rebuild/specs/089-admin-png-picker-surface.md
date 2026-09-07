# 089 - 운영자 PNG 선택 표면 정리

## 목표 (WHY)

spec-084 F-2의 운영자 표면을 고객 spec088과 같은 한국어 선택 위계로 정리한다.
2026-09-07 사용자 UI 직접 구현·연속 진행 승인에 따라 Codex가 계약 → 구현 → 검증한다.
기준 HEAD=origin 추적 ref `0465f24`, ahead/behind 0/0. 상태: DONE / CODEX_PASSED / LOCAL_VERIFIED.

## 범위 (SCOPE)

- AdminSpaceV2IssuePanel의 native PNG 선택 외형·접근 가능한 상태만 변경한다.
- 기존 Modern Studio 토큰, 글꼴, radius를 사용한다. 작고 정적인 form 개선이며 새로운 시각 자산,
  모션, 의존성, 공유 UI API를 추가하지 않는다. 랜딩용 디자인 패턴은 운영자 작업 UI에 적용하지 않는다.
- owner/Canvas/frozen draft/발급/인증/저장/gate/기본 진입은 무변경. F-4/F-7/F-8은 별도 제품 결정이다.
- 실제 Firebase/network/live/emulator/UID/운영 데이터/배포/발행/삭제/운영 쓰기 금지.

## 대상 (WHERE)

제품·test 허용 4파일:

- `apps/admin/src/space-v2/AdminSpaceV2IssuePanel.tsx`
- `apps/admin/src/space-v2/admin-space-v2-issue.css`
- `apps/admin/src/space-v2/AdminSpaceV2IssuePanel.test.tsx`
- `tests/e2e/admin-space-v2-issue.spec.ts`

문서·자동 생성 증거:

- 이 계약과 `docs/handoff/2026-09-07-spec-089-admin-png-picker-handoff.md`
- STATE/NEXT/CURRENT/live log
- `docs/rebuild/results/spec-089/README.md`, `png-picker-{320x568,390x844,1280x800}.png`
- 기존 canonical 직접 재생성: spec-083 `issue-desktop-1280x800.png`, `issue-mobile-390x844.png`;
  spec-084 `operator-space-v2-issue-frozen-{1280x800,390x844}.png`
- spec-084 README 출처 정정만. 기존 자동 측정 `measurements.json`은 이번 control로 인한 운영자 발급
  항목 변화만 허용하며 다른 항목/수동 수치 조정은 금지한다.

보호: taste-v2/**, design/README.md, spec038, spec018 PNG 2장, render/plan/index.ts,
pnpm-workspace.yaml, AGENTS.md. 기존 dirty 보존, 수정·restore·stage·commit 금지.
기존 canonical의 spec018 PNG 재생성은 기존 검증 예외를 유지하고 hash만 비교·보고한다.
고객 앱·packages·Rules·config·fixture·package/lockfile 무변경. 그 밖의 PNG 변경은 STOP.

## 구현 지시 (WHAT / HOW)

1. 제목 `시안 이미지 (PNG)`와 input id/testid/accept=image/png 유지. 기존 실제 native input을
   한국어 label 표면 전체에 투명 overlay로 배치한다. display:none/aria-hidden/중복 button/JS click 금지.
   선택 동작 `PNG 선택`, ready에서는 `PNG 바꾸기`. 상태는 idle `선택 안 됨`, loading `준비 중`,
   ready `선택됨`, failed `선택 실패`. 이 상태는 로컬 image owner만 뜻하고 저장/발급 성공이 아니다.
2. 제목의 id를 aria-labelledby, 상태의 id를 aria-describedby로 연결한다. 추가 live region은 만들지
   않고 기존 panel status를 보존한다. 원본 파일명/경로/blob URL/오류 원문 노출 0.
3. 실제 input 면적 44px 이상, 키보드 focus-visible은 검정 outline. 320px overflow 0.
   기존 fieldset disabled가 nested input에도 적용되게 한다. disabled 표면은 중립 색/금지 cursor로
   구분하며 baseline 전·freeze 후에는 chooser를 열 수 없다. 새 unlock 동작은 없다.
4. 기존 onChange를 **그대로 보존**한다: 첫 file이 있을 때만 owner.load. 고객과 달리 운영자 handler는
   input.value를 비우지 않는다. 이번에 value 초기화/같은 경로 재선택 의미를 바꾸거나 삭제 UI를 넣지 않는다.
   취소 시 owner 유지, 서로 다른 파일의 교체, 실패 후 명시적 교체를 기존 lifecycle에서 검증한다.
5. CSS는 새 file 표면 클래스에 한정한다. 기존 select/range/password/버튼의 스타일을 변경하지 않는다.

## 검증 절차 (VERIFY)

- `node_modules/.bin/vitest run apps/admin/src/space-v2/AdminSpaceV2IssuePanel.test.tsx`
- `node scripts/check.mjs` 완료 후 `node scripts/e2e-run.mjs` 순차 실행. worker/timeout/retry/skip 변경 0.
- SSR input/type/label/description/한국어 상태. Chromium 320/390/1280에서 native Enter/Space chooser,
  취소 상당 이벤트, 다른 파일 교체, disabled 전후, 44px, focus, overflow, axe, console, 외부 egress 0.
- 기존 실패 PNG/발급/StrictMode/객체 정리 E2E 유지. 새 테스트도 발급/저장 호출 0을 단언한다.
- 신규 3 PNG는 ready 선택 표면과 제목을 캡처한다. 기존 4 PNG는 frozen 표면이다.
  모두 PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE이며 제품 기본 /admin route 검증으로 일반화하지 않는다.
- PNG 직접 확인·hash, 고객 bundle hash 동일, 보호 hash, forbidden diff, git diff --check,
  포트 4183/4184/4185/8080/9099/9199 및 실행 staging 정리 확인.
- 실제 OS chooser 시각·실기기·운영 route는 NOT TESTED. 원인 미확정 gate 실패는 STOP한다.

## 위험 (RISK)

투명 input의 keyboard focus/fieldset disabled 상속과 작은 화면 배치가 회귀 경계다.
시각 개선이 freeze 해제나 새 업로드 권한처럼 보이지 않게 disabled 상태를 명시적으로 검증한다.
spec088 최초 범위 밖 timeout 원인은 UNCONFIRMED 이력으로 유지하며 재발을 무시하지 않는다.

### QUESTIONS

이번 표면 변경에 새로운 Founder 결정 없음. F-4 기본 운영자 화면, F-7 진단 노출, F-8 replay 크기는
이번 종료 뒤 결정 대기한다. 다음 구현에 임의로 편입하지 않는다.

### DONE (Codex, 2026-09-07)

- 제품/test 4파일 + 허용 PNG 7장, 총 11파일 commit `f95cb29`. onChange·owner·editable·freeze·발급·
  gate 무변경. CSS는 선택 표면에 한정했고 select/range/password 스타일 유지. 새 SSR 1건·E2E 3건,
  기존 invalid PNG 검사에 실패 상태/명시적 정상 파일 교체 단언 추가. 기존 단언 삭제/완화 0.
- targeted unit 22/22 PASS. 최초 check PASS(unit 2512/2512), canonical **230/230 PASS(50.0초)**.
  확대 캡처에서 outline이 잘리는 것을 발견해 제품이 아닌 캡처 locator만 first fieldset으로 넓혔다.
  이때 check가 test 체인 줄바꿈 format 1건으로 exit 1. 해당 test만 formatter 적용 후 최종 check
  **exit 0: format/lint/typecheck/build PASS, unit 2512/2512(92파일, 2.98초)**.
- 최종 canonical `node scripts/e2e-run.mjs` **exit 0, 230 passed / 0 failed / 0 skipped / 0 retry,
  51.1초**. 두 canonical 사이 제품 코드 변경 0. timeout/worker/기대값 완화 0.
- 새 320/390/1280 검사: baseline 전 disabled, Enter/Space chooser, 취소 상당 이벤트 후 기존 owner,
  서로 다른 파일 교체(URL 생성:해제 1:0 → 2:1), 기존 native value 유지, freeze 후 disabled와 focus
  불가, issue/write factory 0, 실제 외부 egress 0, console error/warning 0, axe serious/critical 0,
  overflow 0, input width/height >=44px. loading은 기존 owner 상태에서 매핑하며 새 지연 fixture는 없다.
- PNG 7장 직접 확인. 신규 3장은 ready 편집 상태(초점 포함)이고 기존 4장은 frozen 상태다.
  원본 파일명/경로를 새 DOM 문구·로그에 노출하지 않는다. 실제 OS chooser/보조기술의 native value
  낭독은 NOT TESTED이며 파일 입력 자체의 value를 제거했다는 주장이 아니다.
- 고객 entry `index-qnJvLZZR.js` 342,371 bytes, SHA-256
  `879FBEF1482D3DBC0075C27C22A1D76FC7C4392C985FF5AD2FC2BFDC39EB1896` — spec088과 동일.
  운영자 `index-u3oWJ96z.js` 296,116 bytes(gzip 91.72 kB), SHA-256
  `D604F9BA069A1D97A3765288549C3860F2E279D2938A3B14052AC607CC1FC3AF`, CSS 12.31 kB.
  기존 500 kB chunk 경고는 유지한다. lazy adapter/SDK 코드 변경 없음.
- 보호 20파일 중 19개 hash 동일. 기존 canonical 재생성으로 spec018 desktop만 `D0A0AA52… →
  FCB869CAF8B126357765CB49EBF47AC07DDAA9A0ACF324DFD0EC142C80DB7A74`; mobile은 동일.
  보호 파일 restore/stage/commit 0. 나머지 고객/패키지/Rules/config/package/lockfile diff 0,
  spec084 measurements.json diff 0. 변경 경로는 계약 허용 파일 + 기존 보호/user dirty뿐이다.
- `git diff --check` PASS. 포트 4183/4184/4185/8080/9099/9199 LISTENING 0, 두 실행 staging
  `denn-e2e-fnI2Y2`, `denn-e2e-7QbC2A` 제거 확인. 신규 debug.log 없음, last-run passed/failedTests [].
- 최종 diff·접근성·캡처 검토에서 추가 결함 미발견. 동일 Codex의 검토로 CODEX_PASSED/DONE 판정;
  별도 에이전트 독립 검수나 Founder 시각 취향 승인은 아니다. 최초 spec088 timeout UNCONFIRMED는
  이력으로 유지한다. 실제 운영 route·기기·Firebase/UID/배포 NOT TESTED/보류 유지.
- 다음은 F-4/F-7/F-8 제품 결정 대기. 선택지/근거는 이 단위 handoff에 있으며 어느 안도 채택하지 않았다.
  전체 기존 계획 추정 85~88% 완료/12~15% 잔여 유지. 번호/테스트 수로 진행률을 계산하지 않는다.
