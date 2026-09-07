# 091 - 고객 호환 정보성 배지 노출 정책

## 목표 (WHY)

Founder F-7=A에 따라 성공한 이전 데이터 호환의 정보성 배지만 숨긴다.
정본: 2026-09-07-ui-audit-f4-f7-f8-decisions.md. 기준 `6992aba`, 상태 DONE / CODEX_PASSED / LOCAL_VERIFIED.
Codex가 작성·구현·검증한다. F-8=A는 발행 당시 logical size 유지로 결정 종료, 코드 변경 없음.

## 범위 (SCOPE)

CatalogStatus ready 분기의 `일부 이전 데이터가 호환 처리되었습니다` Badge만 제거한다.
warningCount/reader/controller/정규화/BrowseFlow diagnostics·실패/수동 retry·고객 헤더는 그대로다.
안내를 다른 화면으로 옮기거나 새 로그/수집/자동 retry를 추가하지 않는다. 스타일/Canvas/크기 변경 없음.

## 대상 (WHERE)

- 제품/test: `apps/mockup/src/App.tsx`, 신규 `apps/mockup/src/App.catalog-status.test.tsx`,
  `tests/e2e/mockup-catalog.spec.ts`의 warning 사례와 증거만.
- 이 계약, `docs/handoff/2026-09-07-spec-091-customer-compatibility-notice-handoff.md`, STATE/NEXT/CURRENT/live,
  results/spec-091/README.md 및 `catalog-ready-{390x844,1280x800}.png`.
- 직접 재생성 증거: spec084 `browse-ready-{1280x800,390x844}.png`,
  `composer-ready-{1280x800,390x844,844x390}.png`, spec085 `composer-workbench-{1280x800,390x844,844x390}.png`.
  두 폴더 README 출처 정정, spec084 measurements.json의 해당 고객 항목 직접 변화만 허용.
- 재개 승인(2026-09-07): spec088 `photo-picker-{320x568,390x844,1280x800}.png`와 README를
  증거 범위에 추가. Space timeout 읽기 전용 조사 및 로컬 재검증만 추가 승인됐다.
  Space 제품/test/timeout/worker/retry 변경과 게이트 완화는 금지한다.
- 보호: taste-v2/**, design README, spec038, spec018 PNG2, render/plan/index.ts,
  pnpm-workspace.yaml, AGENTS.md. 기존 canonical spec018 재생성 예외만 hash보고, restore/stage/commit0.
- admin/packages/Rules/config/fixture/package/lockfile/운영 네트워크/실제 UID/emulator/deploy/자동화 금지.

## 구현 지시 (WHAT / HOW)

1. ready 상태의 정보성 배지만 삭제하고 다른 렌더 분기·DOM 순서는 보존한다. `Badge` import는
   고객 브랜드 카드에서도 사용하므로 유지한다. warningCount 필드를 제거하거나 0으로 조작하지 않는다.
2. 별도 SSR test는 hook 상태만 합성 주입한다. warningCount 0/3의 ready 양쪽에서 배지0,
   loading/실제 오류와 재시도 경계 유지. 원본 warning/식별자 신규 노출0. 새 public export 없음.
3. warning E2E는 기존 합성 응답을 그대로 사용하여 ready·정보성배지0·정상 request1·unexpected0을
   고정한다. 기존 invalid JSON/catalog/500→retry 및 BrowseFlow 항목 누락 안내 검사는 유지한다.
4. 390/1280 신규 PNG를 합성 응답을 주입한 제품 route에서 생성한다. actual catalog 빈도/상태로 일반화 금지.

## 검증 절차 (VERIFY)

targeted 새 SSR + 기존 catalog controller unit → check → canonical 순차 실행.
기존 controller warningCount=3 전달 테스트·BrowseFlow 누락 안내·오류 회귀가 그대로 PASS여야 한다.
PNG 직접 확인, admin entry hash 동일, 보호 hash·허용경로·diff --check·PNG README 유일성,
포트4183/4184/4185/8080/9099/9199·staging 정리 확인. 원인 미확정 실패는 STOP, 기대값 약화/skip/retry0.
제품/test/증거와 문서 별도 일반 commit/push. 실제 운영·실기기 NOT TESTED. 신규 의존성0.

## 위험 (RISK)

성공 호환 정보와 실제 항목 누락/로드 실패를 혼동해 중요한 경고까지 숨기는 것이 핵심 위험이다.
오직 ready Badge 한 줄의 삭제로 제한한다. 배지 높이 제거로 전체 화면 캡처 위치는 달라질 수 있다.

### QUESTIONS

사용자 `응`으로 아래 STOP의 읽기 전용 조사·증거 범위 추가·재검증을 승인했다. F-7=A 유지.
전체 제품 완성/실운영 검증 완료로 간주하지 않는다.

### STOP REPORT (Codex, 2026-09-07, 재개 승인 전 이력)

- 구현: ready 배지 한 줄 제거, SSR 4건 추가, 기존 warning E2E 기대값과 캡처만 갱신. 미커밋.
- targeted SSR 4 + controller 9 = 13/13 PASS. check exit0, unit2517/2517(94파일,2.99초),
  format/lint/typecheck/build PASS. canonical exit1: 229 PASS + 1 FAIL = 230건(52.2초), skip/retry0.
- 범위 밖 실패: `tests/e2e/space-production-route.spec.ts:405`, unavailable proof 사례의 line410.
  5000ms 동안 기대 오류 안내 대신 `시안을 확인하는 중입니다…`가 유지됐다. 원인 UNCONFIRMED.
  fixture에 합성 이미지 생성/hash 등의 비동기 단계가 있지만 어느 단계에서 지연됐는지 증거 없음.
  환경 탓/과거 timeout과 동일 원인/이번 변경과 무관하다고 단정하지 않는다.
- 범위 밖 재생성: spec088 photo-picker PNG3이 변경됐다. 캡처 허용 범위에 없으므로 미스테이지로
  보존하고 README088도 변경하지 않는다. 기존 SHA 표와 현재 dirty 이미지가 불일치한다.
- 신규 spec091 캡처2 직접 확인. canonical 전체 PASS를 뜻하지 않는다. spec084 고객5장/spec085 3장도
  실패한 실행에서 재생성됐으며 README에 이를 명시한다. measurements.json diff0.
- 실패 원본: `test-results/space-production-route-an--e4162-nd-never-retries-on-its-own-chromium/error-context.md`,
  `test-results/.last-run.json`. 보존 사본 위치는 handoff 참조.
- admin hash 불변. 고객 hash와 보호 PNG 변경은 handoff에 기록. 보호20 중 spec018 PNG2만 이번
  canonical로 변경, 나머지18동일. 보호 restore/stage/commit0. 포트6개/staging 잔류0.
- 이후 코드 변경/추가 게이트 실행/stage/commit/push 중단. Space 읽기 전용 원인 조사,
  spec088 PNG3+README 증거 범위 추가와 spec091 재검증은 아직 승인받지 않았다.
  Space 제품/test/timeout/worker/retry 변경은 별도 승인 경계다. 기대값 약화나 예외 PASS로 닫지 않는다.

### DONE (Codex) — 2026-09-07

- 사용자 재개 승인 후 Space fixture/controller와 실패 error-context를 읽었다. fixture:127의
  toBlob/arrayBuffer, :176 이후 factory의 PNG/digest await, production-controller.ts:202 이후
  reader/factory/prepare await 경계를 확인했다. 당시 어느 await가 늦었는지 trace가 없어 원인은
  UNCONFIRMED다. 실제 PBKDF2 지연으로 단정하지 않는다(해당 fixture opener는 합성이다).
- Space 소스/test/timeout/worker/retry 및 이번 제품/test3파일 추가 수정0. 재검증 명령:
  `node_modules/.bin/vitest.cmd run apps/mockup/src/App.catalog-status.test.tsx apps/mockup/src/catalog/controller.test.ts`
  exit0,13/13(705ms). `node scripts/check.mjs` exit0, unit2517/2517(94파일,2.95초),
  format/lint/typecheck/build PASS. `node scripts/e2e-run.mjs` exit0, **230/230 PASS,51.1초**,
  skip/retry0. 이전 Space 실패 사례 이번1.7초 PASS, 최초 원인은 미확정으로 보존한다.
- 현재 제품/test diff는 승인된3파일뿐이다. warningCount 전달 test 유지, 실제 catalog 실패·수동 retry·
  browse diagnostics 회귀 게이트 PASS. synthetic catalog 캡처2 + 기존 직접 영향 PNG11 =13장 직접 확인.
  spec088 영역3장은 직전 실패 실행과 SHA도 같다. F-8 크기/Canvas 코드 변경0.
- 고객 entry SHA2E70F01BA9DC341D10B158587BB30EE8075A2EDE7E66B716BC67903432B2B28E,
  342.26kB/gzip104.86. admin SHA 불변, 기존 chunk 크기 경고 유지. measurements.json diff0.
- 보호20 중18동일, 기존 canonical 예외 spec018 PNG2 변경(hash는 handoff). 보호 restore/stage/commit0.
  포트4183/4184/4185/8080/9099/9199 잔류0, 이번 임시 staging F78DMO 자동 제거, debug.log0.
- 동일 Codex의 코드·테스트·증거 최종 검토에서 추가 결함 미발견. 독립된 다른 검수자나 Founder의
  시각 디자인 승인으로 표현하지 않는다. 최초 실패가 해결된 원인을 증명한 것도 아니다.
- 제품/test/PNG16파일과 문서10파일을 분리 commit/push한다. 최종 hash는 handoff/Git 참조.
  실제 Firebase/운영 데이터/UID/live/emulator/deploy/실기기 NOT TESTED, 운영전환 보류, 자동화0.
  다음 스펙은 착수하지 않는다. 잔여 전체 로드맵과 실제 기기·운영 승인 경계는 후속 수동 검토 대상이다.
