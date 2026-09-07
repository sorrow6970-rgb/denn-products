# spec096 로컬 인쇄 크기 상대 비교 — 최종 검수

2026-09-07. 동일 Codex 구현/검토, 독립 검수 아님.
DONE / CODEX_PASSED / LOCAL_VERIFIED. 코드·시험·증거12파일 b03f8d4.

## 최종 재검증 — 사용자 예외 승인 후 보완2 완료

사용자 `응 승인해`로093 README와 생성 테스트 헤더 두 파일만 이력 보존하도록 승인했다.
결정/계약을 먼저 갱신하고 보완했다.093 README는 시작 SHA와 동일,최종 Git diff0이며 커밋에 넣지 않았다.
생성 테스트의 변경은 기존094 설명5줄뿐이다. 기존 단언/fixture/PNG/측정은 변경하지 않았다.

| 단계 | 단위/check | canonical E2E |
|---|---|---|
| 최초(직전 턴) | 2545 PASS | 268 PASS/3 FAIL,54.9초;정확 getByLabel |
| 보완1(예외 승인 후) | 2545 PASS | 268 PASS/3 FAIL,53.4초;option toBeDisabled retarget |
| 보완2 최종 | format/lint/7typecheck/unit97파일2545/2545(2.87초)/2build PASS | 271/271 PASS,52.8초,exit0,last-run passed |

소스 확인: 설치된 playwright-core1.61.1의 lib/coreBundle.js에 포함된 getElementLabels는 label의
elementText를 사용한다. elementState는 disabled 검사를 follow-label로 retarget하고, option은
wrapping label.control인 select로 바뀐다. 실패 출력의 `<option disabled>`와 enabled 판정이 설명된다.
신규 시험을 역할+정확한 접근성 이름으로 바꾸고 native option.disabled=true 및 실제 ArrowDown이
중복 항목을 건너뛰어 size-1을 선택하는 동작을 검사했다. focus outline3px,접힘/재진입 무선택도 유지한다.
제품 코드 수정으로 문제를 감추지 않았고 기존 단언 삭제/timeout/retry/worker 완화0이다.

합성 catalog는 실제 고객 route에서 가로채 제공했다.신규3viewport 모두 catalog1/외부시도0/console0,
Canvas0/유출검사0/overflow0/44px이상/axe serious·critical0.빈/단일유효크기 비노출1건도PASS.
최종 기존267+신규4=271. 단위 기존2526+신규19=2545. 신규 기능에 실제 서버 데이터 사용0.

### 시각 검수

[096 증거](../../rebuild/results/spec-096/README.md)의 PNG3개를 모두 직접 열었다.
320px는 선택상자가 세로로 배열되고 설명은 여러 줄로 읽힌다.390px도 세로,1280px는 가로 두 열이다.
실선A/점선B 및 치수·텍스트 범례가 구분되고 같은 왼쪽/바닥 기준에서 상대 비율을 유지한다.
현재 합성 표본에서 글자/도형 겹침·가로 overflow·조작 불가 finding0.스크린샷은 패널 crop이며
파일명의 viewport가 전체 PNG 픽셀 크기를 뜻하지 않는다.화면 실물cm/외곽/방배치 근거가 아니다.
실제 기기/스크린리더 낭독/다양한 운영 catalog의 최종 시각 수용은 NOT TESTED다.

### 최종 무결성·범위

기존101개 중100 SHA동일(101-1). spec018mobile만 기존 canonical 명시 예외로
12DD3C80AF6884A22AC50F987111AA70C35595F5132D4D83B1D434421FF423B2 →
5043D55564D51A7F577EDBC520C2062C3FDA8FF277FE9B7C105E3FB8B0D135BD.
spec018desktop는 재생성 후 시작hash와 같으며 수동 복원하지 않았다.보호복원/stage/commit0.
093README SHA46DD5BD864E526D2F92EB895C2D2CED4AD7C59B73D4AF4E97ABC06AE30AAED50,
18PNG/측정 및 그 외 baseline동일. 양 앱 entry SHA는 아래 첫 실행과 동일하다.
포트4183/4184/4185/8080/9099/9199 listener0,staging UfF5R7 부재,debug.log 신규0,diff--check PASS.
코드·시험8+신규증거4=12파일 b03f8d4.기존 보호/별도 사용자dirty 제외,종료8문서별도 전송한다.
실제Firebase/UID/운영/Rules/config/의존성/배포/발행/삭제/자동화0.
전체 실측 진행률 확인불가,기존85~88% 관리추정 상향0.다음제품은 아직 착수하지 않았다.

아래는 실패·승인 대기 당시의 기록이며 현재 판정은 위 최종 결과가 우선한다.

## 승인과 구현

[RG-1=A](../decisions/2026-09-07-rg1-print-size-comparison-decisions.md)는 실제 사용자 승인이다.
[096 계약](../../rebuild/specs/096-local-print-size-comparison.md)을 먼저 작성하고 구현했다.
앱-local 모델은 기존 정규화/인쇄 cm 정본만 사용한다. 접힌 native details, 명시 A/B 선택,
공통 축척 SVG와 실제 크기가 아니라는 설명을 추가했다. 2개 미만이면 진입을 표시하지 않는다.
제품5신규+BrowseFlow1, 단위 테스트는 신규5 중2, 별도 E2E1파일이다. 전부 미커밋이다.
방사진/액자 외곽/실물1:1/회전/저장/Space/운영 의미를 확장하지 않았다.

## 실행 근거

| 검사 | 실제 결과 |
|---|---|
| `node scripts/check.mjs` | exit0; format/lint,7 typecheck,97파일 unit2545/2545, 두 앱 build PASS |
| 단위 증가 | 기존2526 + 신규19 = 2545 |
| `node scripts/e2e-run.mjs` | 최초1회 exit1; 268 passed / 3 failed / 전체271,54.9초 |
| E2E 집계 | 기존267 + 신규 빈/단일 크기1 =268 PASS; 신규 viewport3 FAIL |
| 신규 PNG | 0장. 실패 후 선택/기하/axe/캡처 단계 미도달, 시각 NOT TESTED |
| 포트 | 4183/4184/4185/8080/9099/9199 listener0 |
| 이번 staging | `denn-e2e-ientgk` 디렉터리 제거됨 |
| Git | HEAD=origin 로컬 추적ref f7c9ecd,0/0; fetch/stage/commit/push0 |
| 최종 문서 검사 | `git diff --check` PASS, staged 목록0; 기존 dirty와 신규096파일 모두 미스테이지 |

첫 check 도구 반환 후 보조 저장 직렬화 오류가 있었으나 앱 명령 기록에서 완료 exit0와 전체
check 출력을 다시 읽어 확인했다. 테스트 실패로 숨기거나 재실행하지 않았다.
build의 기존 chunk-size 경고는 유지된다. 실제 기기/스크린리더 낭독/Firebase/운영은 NOT TESTED.

## F-1 — 신규 E2E 선택자 실패

`tests/e2e/print-size-comparison.spec.ts:59`의
`getByLabel('비교 크기 A', {exact:true})` focus 단언이 세 viewport에서 element not found로 실패했다.
로컬 `test-results/print-size-comparison-relative-print-comparison-320x568-chromium/error-context.md`
에는 `combobox "비교 크기 A"`가 나타난다. 따라서 accessible name 자체가 없다는 제품 결함으로
단정하지 않는다. wrapping label과 select 옵션 텍스트에 따른 선택자 차이는 조사 후보다.
역할+접근성 이름 기반 getByRole 선택자 검증이 in-scope 보완 후보이며 아직 적용하지 않았다.
단언 삭제/timeout 증가/retry/worker 변경으로 PASS를 만들지 않는다.

## F-2 — 기존 증거 생성기의 이력 손실, 범위 STOP

`tests/e2e/admin-write-pending-error.spec.ts:411` 이후 README 생성부는 고정 헤더와 표를 새로 쓴다.
`git diff -- docs/rebuild/results/spec-093/README.md`에서094에 추가했던 검수 이력5줄이 제거됐다.
18PNG/표/측정은 바뀌지 않았다. 생성기가 누락한 문단은 과거093과 수정된094 증거를 구별하는 근거다.
096 계약은 기존 증거 변경을 금지하므로 자동 복원이나 기존 테스트 수정을 하지 않고 중단했다.

아직 미승인인 최소 예외 요청:

1. `tests/e2e/admin-write-pending-error.spec.ts`의 README 헤더 문자열에 기존094 이력만 보존.
2. `docs/rebuild/results/spec-093/README.md`의 해당094 문단만 회복.

기존 테스트 단언/fixture/표/PNG/측정 변경은 요청하지 않는다. 사용자 승인 뒤 계약에 이 두 파일의
정확한 예외를 기록한 후 F-1 보완과 check/canonical/3PNG 직접 검토를 진행한다.
현재는 추가 구현/실행/전송0. 운영 권한이나 새 제품 결정을 요청하는 것이 아니다.

## Hash / 보호

시작 기존 결과/보호·별도 dirty101개 중98개 SHA동일(101-3). 변화3개는 아래와 같다.

| 경로 | 시작 SHA-256 | 실행 후 SHA-256 |
|---|---|---|
| spec018 desktop PNG | BDB7EAD2E8F5A82746236D68474D215678823CF168D5141075B1D19E0A4C163D | 91572C5C544242785733F9EF82714D54667E4C2DD1362820C14C56531671F361 |
| spec018 mobile PNG | 12DD3C80AF6884A22AC50F987111AA70C35595F5132D4D83B1D434421FF423B2 | 94CE5D15BA3F7B66CCDE59B9F6A9DC42FA5EE94781AFF2714DD7139AE1642180 |
| spec093 README | 46DD5BD864E526D2F92EB895C2D2CED4AD7C59B73D4AF4E97ABC06AE30AAED50 | BB0D93200FA280D15DB1CF62E74CFBE2D75651577D17FABC5835739388C4F73B |

첫2개는 canonical의 기존 명시 예외이며 복원/stage/commit하지 않았다. 마지막1개는 F-2 STOP이다.
그 외 보호/사용자 작업 hash변경0. 범위 밖 변경0이라고 주장하지 않는다.

- 고객 `index-jnlo-lEH.js`: FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A
- 운영자 `index-C5iqMAWP.js`: B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 (불변)

## 종료 경계

096 DONE/CODEX_PASSED 아님. 095 문서 DONE,094 제품 DONE은 유지한다.
실제 Firebase/UID/배포/발행/삭제/자동화0. 신규 E2E의 실패 뒤 네트워크/axe 검사를 실행하지 못했으므로
신규 전체 시나리오의 해당 gate가 통과했다고 기록하지 않는다.
전체85~88%는 과거 관리추정, 잔여12~15%=100-88~100-85. 현재 실측률/최종 스펙수/종료일 확인불가.
이번 미검증 기능 추가로 진행률을 상향하지 않는다.
