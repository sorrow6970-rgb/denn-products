# Spec 092 — C5 실패·복구 안내 시각 감사 결과

2026-09-07, 기준 HEAD `54aa472`, `rebuild/modern-studio`. **LOCAL_VERIFIED / CODEX_PASSED**.
구현자와 검토자는 같은 Codex다. 독립 검수·Founder 최종 시각 승인·운영 검증을 뜻하지 않는다.
테스트·증거18파일 커밋 `36eb15a`, 종료 문서7파일은 별도 커밋한다.

## 1. 근거와 실행 결과

- [계약](../../rebuild/specs/092-admin-c5-failure-state-visual-audit.md),
  [새 감사 테스트](../../../tests/e2e/admin-write-failure-visual.spec.ts).
- [측정 원본](../../rebuild/results/spec-092/measurements.json),
  [PNG15개의 SHA/출처/준비 절차](../../rebuild/results/spec-092/README.md).
- `node scripts/check.mjs`: 최초/최종 모두 exit0, format/lint/7개 package·app typecheck/unit/build PASS.
  unit94파일·2517/2517, 최초2.83초/최종2.88초. 기존 build의500kB chunk 경고는 유지.
- `node scripts/e2e-run.mjs`: 최초246/246(47.6초), 최종246/246(48.6초), 각각 exit0,
  failed/skipped/retry0. 기존230 + 신규 상태·viewport15 + manifest1 =246.
- 최초 PASS 후 자체 검토에서 fixture CID의 정확한 값 누출 검사를 보강했다. 테스트1줄만 보완 후
  최종 check/canonical 실행. 원인 불명 실패 재시도나 timeout/worker/retry/허용차 변경이 아니다.
- 최종 새 PNG15·JSON·README는 최초 산출물과 SHA-256 동일.15개 PNG 전부 직접 열어 확인했다.
  별도 targeted 브라우저 실행은 없으며 신규16건은 두 canonical 안에서 실행됐다.

## 2. 화면별 판정

모두 `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`. 실제 editor Card의 border/padding/내용을 포함하며,
진단/인증 카드/fixture 제목은 bbox 비중첩 검사로 분리했다. 외부 shadow 완전 재현은 주장하지 않는다.
PNG 수치는 Card 크기이며 viewport 크기와 다르다. 아래 PASS는 이 제한된 감사의 판정이다.

| 상태 | 320x568: PNG / 판정 | 390x844: PNG / 판정 | 1280x800: PNG / 판정 |
|---|---|---|---|
| dirty-valid | 288×523 / PASS | 358×470 / PASS | 560×450 / PASS |
| dirty-invalid | 288×523 / PASS | 358×470 / PASS | 560×450 / PASS |
| conflict | 288×547 / PASS | 358×494 / PASS | 560×450 / PASS |
| outcome-unknown | 288×547 / PASS | 358×494 / PASS | 560×450 / PASS |
| discard-confirmation (conflict에서 진입) | 288×601 / PASS | 358×602 / PASS | 560×450 / PASS |

시각 확인:15개 모두 안내 전문과 입력/버튼이 잘리지 않는다. invalid의 빈 높이·비활성 저장,
conflict/unknown의 다른 안내와 재로드, discard의 명시 폐기 버튼을 구분할 수 있다.
320px에서는 버튼이 세로로 감싸지고,390px 폐기 상태에서는 긴 버튼 때문에3행이 된다.
내용에 따른 정상 세로 흐름이며,601px 카드가568px viewport보다 길다는 것만으로 결함으로 판정하지 않았다.
좁은 화면의 한국어 일부 어절 줄바꿈은 보이지만 글자 누락/겹침은 발견하지 못했다.
실제 사용자 이해도·스크린리더 낭독은 NOT TESTED다.

## 3. 측정과 동작

- 5상태×3viewport=15측정 모두 document/Card 가로 넘침0, axe serious/critical0,
  console error/warning/pageerror0, 외부 요청 시도0. 외부는 이동 전 차단되며 실제 SDK/서버를 호출하지 않는다.
- enabled controls는 (5+4+1+1+1)×3=36개 관찰,44px 미만0. disabled는 (0+1+4+4+5)×3=42개로
  별도 기록. native option을 버튼 개수로 세지 않았다.
- 실제 Tab으로 제품 stops36개에 도달했고 DOM 순서 일치, focus-visible 및 outline/중앙 가림 검사 PASS.
  fixture/auth stops는 별도로 제외. 중심점 검사는 초점 테두리 전체의 픽셀 인증과 같지 않다.
- 제품 text/ARIA/data에서 WRITE_*·합성 CID/API/도메인/경로·fixture 진단 누출0.
- dirty2상태 save0/base none, conflict/unknown/discard3상태 save1/base3. 모든 상태 revision3/factory1.
  캡처/키보드/axe 전후 동일. discard 캡처 후 명시 폐기·reload3건은 ready-clean/revision3/save1.
  이 관찰 구간 밖의 영구 무재시도나 실제 head 원자성을 주장하지 않는다.

P1/P2 시각 finding은 이번15개에서 미발견. 위험이 없는 제품/최종 출시 가능이라는 뜻은 아니다.
save-error/load-error/auth expiry/loading/saving·다른 discard 출처·실기기·실제 인증/쓰기·배포는 NOT TESTED.

## 4. 변경·보호·정리

변경은 신규test1 + 결과17(PNG15/JSON/README) + 계약/handoff/보고서/STATE/NEXT/CURRENT/live7 =25파일.
직전 미커밋 로드맵/spec091handoff2개는 보존하며 이번 작업 커밋에 넣지 않는다.
제품/기존test/scripts/Rules/config/package/lockfile 변경0. 작업 전후 기존 결과·보호63파일을 비교했고,
명시 예외인 spec018 PNG2 외61개 동일. 보호20개 중18개 동일,2개만 canonical 재생성 예외다.
어떤 보호 파일도 수동 수정/복원/stage/commit하지 않는다.
합성 measurements.json은 기존 *.json 무시 규칙에 걸려 해당 단일 허용 파일만 `git add -f`로 추적했다.
.gitignore 변경0, 다른 JSON 추가0. 실제 데이터/백업 파일이 아니라 이 테스트가 생성한 측정값이다.

| SHA-256 | 시작 | 최종 |
|---|---|---|
| 보호 spec018 desktop | BDB7EAD2E8F5A82746236D68474D215678823CF168D5141075B1D19E0A4C163D | 91572C5C544242785733F9EF82714D54667E4C2DD1362820C14C56531671F361 |
| 보호 spec018 mobile | 5043D55564D51A7F577EDBC520C2062C3FDA8FF277FE9B7C105E3FB8B0D135BD | 1103D366D28B33D07411CB34942FFBDC32E8C82F44AC00324BAAD1C4EAB84374 |

고객 `index-LpX-FRZg.js`: `2E70F01BA9DC341D10B158587BB30EE8075A2EDE7E66B716BC67903432B2B28E`.
운영자 `index-DqxJJNtB.js`: `D868510748C60622888FE7E2D6C1B88E119700FD94F74B1D183D7065E6311D30`.
둘 다091 기준과 동일. `git diff --check` PASS. Git의 기존 global ignore 읽기 권한/LF·CRLF 경고는 있으나
검사 exit0이며 이를 제품 오류로 세지 않는다. 4183/4184/4185/8080/9099/9199 listener0.
이번 staging `denn-e2e-0G2gue`, `denn-e2e-w90xjU`는 runner 종료 후 부재 확인. 타 프로세스 kill0.

## 5. 이후와 진행률

현재 감사는 완료. 연속 진행 지시에 따라 다음 안전 후보는 **C5 나머지 실패·진행 상태의 합성 검증
가능성 조사**다. 먼저 기존 load/save/auth 포트·controller·테스트로 정확한 도달/복구 계약을 확인한다.
제품 의미를 바꾸지 않는 test-only 후보만 별도 스펙으로 작성한다. 새로운 상태 의미/권한/정책이나
실제 서비스가 필요하면 중단하며,092 범위를 소급 확대하지 않는다.

전체85~88%는 기존 관리 추정 유지, 잔여는100-88=12~100-85=15%. 이번 감사만으로 수치를 올리지 않는다.
전체 실측 완료율/최종 잔여 스펙 수/종료일은 확인 불가. 룸·가이드·주문/카카오·전체 catalog 관리·운영
전환은 이 감사로 완료되지 않는다. 실제 운영 연결/UID/배포/자동화는 계속0이다.
