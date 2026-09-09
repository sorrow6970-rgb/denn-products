# Spec109 — P2 결속 계약 인수인계

2026-09-09 / baseline `abdc191` / CONTRACT_REVIEW_PASSED(동일 Codex 자체 검토).

계약커밋7841be0 일반push완료·HEAD=origin7841be0·0/0 확인(최종기록전).
같은허용문서 최종기록만1회commit/push후Git확인한다.코드미착수이며다음동일109 구현범위는변함없다.

- [계약](../rebuild/specs/109-background-evidence-owner-contract.md)
- [조사·검토](../codex-claude-handoff/reviews/2026-09-09-spec-109-background-evidence-owner-review.md)

108 종료기록abdc191 push완료,HEAD=origin0/0에서109 문서 작업 시작.
P2를 선택했다:기존105 owner 내부의같은view로108을검사하고 snapshot과증거를한번에인계한다.
기존factory는그대로104만쓰고새factory를분리하여하위호환을유지한다. P1추가재읽기는미채택.
2N≤40,000,000bytes는표현장부이며실제기기peak가아니다. PARTIAL/NOT_VERIFIED/decodeAllowed:false유지.

현재는문서7개만변경,제품/시험/설정변경·unit/build/E2E실행0.108의3107PASS는과거증거다.
다음109구현은계약에열거한 background-file.ts/test.ts와신규background-evidence.test.ts3개만.
targetedunit/typecheck/check·번들SHA·보호SHA·scope검증후일반commit/push한다.같은승인재질문0.
이번109는미연결owner단위이며nativebrowser/E2E·실제사진·회전·decode·UI·운영은NOT TESTED/범위밖이다.
canonical의보호PNG출력을묵인하지않고별도native결속시험계약으로분리했다.설치/예약자동화0.

전체 진행:byte검사·fileowner·TIFF태그·JPEG/PNG profile식별구현은완료.
이번에는그결과와불변사본을묶는구현계약을마쳤다.실제표시·룸UI연결과운영전환은아직남았다.
전체리빌드완료율은가중작업량분모가없어확인할수없다.

문서 게이트:링크9/9·허용7/7·보호/별도dirty SHA22/22·diff--check/whitespace PASS.
총dirty29=22+7,staged0,HEAD=origin abdc191·0/0 확인.문서7개만일반commit/push한다.
