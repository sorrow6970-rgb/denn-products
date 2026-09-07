# 096 — 로컬 인쇄 크기 상대 비교

2026-09-07, 기준HEAD=origin f7c9ecd·0/0. DONE / CODEX_PASSED / LOCAL_VERIFIED(동일 Codex).
코드·시험·합성증거12파일 b03f8d4. 아래 실패/STOP은 보완 전 이력이며 현재 해소됐다.
[RG-1=A](../../codex-claude-handoff/decisions/2026-09-07-rg1-print-size-comparison-decisions.md) 승인.

## WHY / WHAT

고객이 두 인쇄 크기의 상대 비율을 비교한다. 현재 치수는 인쇄 cm이며 액자 외곽이나 방 실측이 아니다.
기존 Modern Studio 토큰과 native details/select/SVG diagram을 사용한다. 새 이미지/아이콘/의존성0.
멀티스텝 제품 UI는 design-taste-frontend의 명시적 제외 대상이므로 이 스킬을 적용하지 않는다.

- 앱-local 순수 모델은 readLegacyCatalog→browse selector→projectFramePrintPhysicalSize를 재사용한다.
  정상 정규화된 메모리 문서만 사용, canonical pair 없음/무효는 비교에서 제외, 이름/aspect 추론0.
  입력오류는 안전한 invalid 결과. ID/원문 오류/전체문서/사진은 결과 UI에 넣지 않는다.
- 액자 모드에서 유효한 비교 대상이2개 이상일 때만 접힌 `인쇄 크기 비교` 진입을 표시한다.
  0/1개면 비교가 불가능하므로 진입0. 다른 목적의 사이즈 선택/미리보기에는 영향0.
  일부 치수 부재는 패널에 안내한다. 두 크기를 A/B로 각각 명시 선택, 자동 첫 선택0.
  동일 항목 중복은 불가. 등록 순서/폭·높이 그대로, 자동 portrait 정렬/회전0.
- 두 선택의 최대변 M에 대해 s=80/M, SVG100×100 내부 x=10, 바닥y=90를 공유한다.
  폭=w*s, 높이=h*s. 공통축척이며 개별fit/비균등비율변형0. A실선/B점선+텍스트로 구별한다.
  SVG는 설명 있는 이미지 역할, 실제 cm표기는 텍스트에 두고 이름이 그래프에 겹치지 않는다.
- 패널 설명: `인쇄 치수의 상대 비율입니다. 액자 외곽이나 화면의 실제 크기를 뜻하지 않습니다.`
  초기/한개 선택은 안내만, 두개일 때 윤곽도 표시. 명시 선택해제, catalog identity 변경 시 선택 무효화.
  source/index용 비개인 key만 DOM value에 사용. 외부 I/O/저장/Canvas/이미지 생성0.

## WHERE — 정확한 허용 범위

제품: 신규 apps/mockup/src/size-comparison/{model.ts,model.test.ts,PrintSizeComparison.tsx,
PrintSizeComparison.test.tsx,size-comparison.css}, 기존 apps/mockup/src/browse/BrowseFlow.tsx 연결1곳.
시험: 신규 tests/e2e/print-size-comparison.spec.ts.
증거: docs/rebuild/results/spec-096/{comparison-320x568.png,comparison-390x844.png,
comparison-1280x800.png,README.md} 신규4개.
문서: 이계약,RG-1결정,096review/handoff,STATE/NEXT/CURRENT/live.
2026-09-07 사용자 `응 승인해`로 정확히 두 파일의 최소 예외를 승인했다:
tests/e2e/admin-write-pending-error.spec.ts의 README 출력 헤더와
docs/rebuild/results/spec-093/README.md의094 이력5줄 보존만. 기존 단언/fixture/표/PNG/측정 변경0.
기존제품/test/fixture/Rules/config/package/lockfile/shared API/인쇄export/Space는그외변경금지.
기존미커밋roadmap/spec091handoff·보호파일은stage/commit금지.기존증거변경예상0,
canonical에의한spec018PNG2재생성기존명시예외만허용(복원/stage/commit0).범위밖생성물은STOP.

## VERIFY

- unit: 명시cm만/부재/무효/hostile/순서/입력불변/legacy메모리정규화/두선택기하/중복·부재거부.
  SSR: 초기접힘/무선택/0·1개비노출/오류안전/설명. 동작검증은E2E에서별도.
- E2E: real고객route+합성catalog interception. 외부요청실행0,case비노출,
  0/1/invalid catalog 비노출,명시A/B선택/중복방지/해제/재진입,사진/Canvas0.
  320/390/1280 viewport에서공통비율·DOM overflow0·44px·keyboard/focus·axe serious/critical0·console0,
  3PNG직접열람.100%상대viewport이며실기기/실물크기/스크린리더실낭독NOT TESTED.
- node scripts/check.mjs, node scripts/e2e-run.mjs canonical1회. 실패시원인확인/in-scope보완만,
  timeout/retry/worker검증완화0. 양entry SHA와보호/기존증거baseline101hash 비교.
- git diff--check,허용경로,포트4183/4184/4185/8080/9099/9199및본인staging잔류0.
  검증된코드/증거와종료문서는분리commit/일반push.실패/추가결정필요시STOP.

## STOP / NOT TESTED

보호taste-v2/**,design/README,spec038,spec018PNG2,render/plan/index.ts,pnpm-workspace.yaml,AGENTS.md 유지.
운영데이터/UID/Firebase/실물출력/실기기/배포/발행/삭제/자동화/신규의존성0. RG-1 의미를 확대하지 않는다.
전체실측완료율불명,이전85~88%는관리추정이력.국소기능추가로전체완료/출시가능이라고기록하지않는다.

### 검증 / STOP 이력 (Codex, 2026-09-07)

check format/lint/typecheck/unit2545/2545/build PASS. canonical1회268 PASS/3 FAIL(54.9초),
신규3viewport의 정확한 라벨 선택자 실패. 기존267+신규빈상태1=268 PASS이며 전체 PASS 아님.
096 PNG0, 그림/axe/시각 검수는 해당 실패 이후 단계에 도달하지 못해 NOT TESTED.
기존093 생성기가093 README의094 검수 이력5줄을 제거했다. 허용 밖 결과라 보완/재실행/전송 중단.
기존101hash 중98동일, spec018 PNG2는 승인된 재생성 예외이며 README1은 범위 STOP이다.
상세 [096 검수](../../codex-claude-handoff/reviews/2026-09-07-spec-096-local-print-size-comparison.md).

### QUESTIONS

093 README와 tests/e2e/admin-write-pending-error.spec.ts의 README 헤더에 한해094 이력 보존을
허용하는 최소 범위 확장은 사용자 `응 승인해`로 승인됐다. WHERE에 정확히 추가했다.
그 외 신규096 시험 보완은 기존 범위이며 게이트 완화 없이 재검증한다.

### DONE (Codex, 2026-09-07)

승인 예외2파일의094 이력 보존 완료.093 README는 시작SHA와 같아 최종diff0/커밋미포함이다.
신규 E2E에서 getByRole로 정확한 접근성 이름을 검사하고, option의 native disabled 속성과
ArrowDown의 중복 선택 건너뛰기를 검사한다. 키보드 focus3px/재진입 초기화도 PASS.
제품 코드 추가 보완0, 기존093 단언/fixture/측정 변경0,timeout/retry/worker 완화0.

- 최초268/3 FAIL(54.9초),보완1 268/3 FAIL(53.4초),보완2 최종271/271 PASS(52.8초).
- 최종 check: format/lint/typecheck/unit2545/2545(97파일,2.87초)/두앱build PASS.
- 320/390/1280 PNG3 직접 검토,선택·공통축척·해제·재진입·44px·overflow0·axe중대0·console0·외부시도0.
- 기존101hash 중100동일,기존예외spec018mobile만변경.093 README/18PNG/측정과 보호 나머지동일.
- 포트6개0/staging UfF5R7 제거/diff--check PASS.정확 SHA와한계는096검수.
- 제품·시험8+합성증거4=12파일 b03f8d4.종료8문서는별도commit/push로 처리한다.

새 서비스/권한/실물크기/방/저장 의미 확장0. 실제 기기/스크린리더/실제Firebase/운영NOT TESTED.
다음은 남은 룸 목업의 데이터·좌표·보존 경계 읽기 전용 조사 후보다.097구현계약/제품착수0.
