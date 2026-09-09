# 120 — 부재증거 owner의 격리 native 인계 검증

2026-09-09 /276158e /CONTRACT_REVIEW_PASSED(동일Codex 자체검토).
사용자의 지속루틴·고정Git전송승인 및119 다음포인터에 따른 합성시험만 수행한다.

## 목표 / 정확 범위

119의실제FileReader→118검사→Blob 인계가브라우저에서도byte동일성/취소경계를지키는지확인한다.
새decode/표시기능이나실제사진접근은없다. 형식전체유효성·현실사진방향·운영허가로승격하지않는다.

허용코드5:

- apps/mockup/src/e2e/room-background-file-fixture.tsx —119 전용합성분기/버튼만
- tests/e2e/background-absence-owner.spec.ts —신규
- tests/background-absence-owner.config.ts —신규opt-in 3엔진
- scripts/e2e-run.mjs —고정selector3종만추가
- scripts/e2e-run.test.mjs —selector회귀3건만추가

문서7: 이spec,120 review/handoff,STATE/NEXT/CURRENT/live.
제품코드104~119/기존시험/기본config/앱entry/UI/Rules/package/lock/보호23 변경0.
실제사진/운영/Firebase/배포/설치/다운로드/예약자동화0.

## 구현 계약

기존격리route의jpeg/png/evidenceBytes 합성구조를재사용한다. 새absence-접두11개 버튼:
`jpeg,png,file,metadata-jpeg,metadata-png,unknown-jpeg,release,cancel-before,cancel,dispose,late`.
JPEG/PNG는envelope-only이며nativepixel decode시험이아니다. file도합성File,일치하지않는MIME으로
들어와도출력MIME은119검사format이다. metadata는기존합성tag없는Exif,unknown은APP0로거부확인.

실제FileReader사용,run同一Promise/단발read,byte동일성은인계Blob.arrayBuffer로시험에서만비교한다.
release선행take=null,사후원본byte변경은Blob에영향0,반복take=null,frozen쌍/evidence확인.
cancel-before read0,즉시cancel/dispose read1/abort1/실패고정,metadata 실패lease0.
late는native FileReader의실제load를시험전용신뢰된wrapper가받아취소→저장해둔onload호출 순으로
전달한다. 실제I/O+합성늦은이벤트배달이며브라우저가취소후이벤트를발생시킨다는주장은아니다.
wrapper는시험후nativehandler참조를finally에서제거한다. source/reader/URL/data를보고서에노출하지않는다.
fixture보고서에는고정code/boolean/작은scalar evidence만. 제품logging/UI에연결하지않는다.

E2E: 모든mode각엔진동일기대값,초기read0. 완료후read0/1,abort0/1,URL/Image/Canvas/ImageBitmap0.
metadata거부는METADATA_UNVERIFIED,success도decodeAllowed:false. 화면canvas/img/fileinput0.
localhost밖요청은기록후abort,외부시도0·consolewarning/error0·pageerror0 단언한다.

`--background-absence-{chromium,firefox,webkit}-only`는새config의고정project/worker1만선택한다.
추가인자/timeout/임의test forwarding0. 기본selector/기존단언불변,기존capability/mismatch와독립.

## 검증 / DONE

selectorunit,전체check,새E2E11×3=33을엔진별순차실행,기존Chromium46회귀 재실행.
보호23/번들3SHA불변,정확code5/docs7,diff--check,관련포트/자기temp정리. 설치필요·flaky·권한·scope오류STOP.
기존116의14불일치는기존이력그대로다. 새33PASS가orientation지원PASS아님.
문서·수치·commit전scope자체검토후승인된고정GitHub/동일브랜치일반전송.

### QUESTIONS

새제품선택없음. 후속실제decode/admission/표시결합은별도정확계약전0.

### DONE (Codex) —2026-09-09

코드5d5c30a,정확5파일. 동일Codex 자체검수 CODEX_PASSED(독립검수아님).
check3397=3394+selector3,selector26 PASS. 새E2E33=3엔진×11 PASS:
Chromium2.9s,Firefox27.9s,WebKit23.9s,각exit0. 기존Chromium46회귀5.3s PASS(exit0).
Firefox최초제한환경은11FAIL(newPage생성오류);앱없는about:blank도동일실패였고권한받은
일반환경진단PASS후동일11시험재실행PASS. 제품/단언/timeout/의존성변경0,실패이력보존.
보호23+번들3SHA불변,정확code5/docs7,diff--check PASS,관련포트0/자기staging5개부재확인.
native증거는인계/취소만이며pixel decode/실제사진/운영지원NOT TESTED. 전송결과는별도기록한다.
