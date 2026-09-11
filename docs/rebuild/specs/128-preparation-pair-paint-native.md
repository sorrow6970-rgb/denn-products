# 128 — 같은 준비세대의 native pair paint 검증

최종전송:code16780ea/docs83ea33a 일반push,HEAD=origin83ea33a·0/0 확인. 최종기록1회.

2026-09-11 / 기준033916e. 사용자 루틴에 따른 합성 검증 계약.
CONTRACT_REVIEW_PASSED(동일Codex 자체검토). 127 DONE 유지.

## 목표와 근거

127의 명시 controller/paint port,125 배경work,102 실제frame capturer와공유executor를
한cohort로연결한다. 합성codec는126의core-only3×2JPEG/비대칭PNG. 102의native
surface 패턴을따르되DOM에연결하지않는다. 기존단일paint검증을쌍결속증명으로대체하지않는다.

## 정확 파일

코드6:
- 신규 apps/mockup/src/e2e/preparation-pair-paint-check.ts
- 수정 apps/mockup/src/e2e/room-background-file-fixture.tsx — import/pair- dispatch/버튼만
- 신규 tests/e2e/preparation-pair-paint.spec.ts
- 신규 tests/preparation-pair-paint.config.ts
- 수정 scripts/e2e-run.mjs — 3 pair-paint selector만
- 수정 scripts/e2e-run.test.mjs — selector3

문서7: 이spec,128review/handoff,STATE/NEXT/CURRENT/live.
기존제품코드/시험/config/보호23/package/lockfile/Rules/defaultUI 변경0.
실사진/실제Firebase/운영/설치/다운로드/배포/자동화0. localhost합성시험만.
Canvas encode/export/screenshot/fileinput/URL/Image/외부요청0.

## 행렬과 synthetic reference

2형식 ×10경로(normal,fractional,clear,dispose,source-change,pending-clear,replace,
background-fail,frame-fail,metadata) ×3엔진 = 신규60.
- sourceIdentity/backgroundIdentity는고정합성object. lookup은같은identity와Blob만준다.
  실제FileReader/createImageBitmap단발,replace때만새cohort로2회. 늦은완료는gate로통제.
- frame plan은4×2의비대칭2색fill-rect만. 실제102capture+공유execute를사용하며art/font/network0.
  capture scale normal1/fractional1.25,privatecanvas ceil backing. release는1×1로축소후소유참조폐기.
- 16×12 detached target/reference와frame reference surface를명시생성한다.
  backgroundRect normal(1,1,12,8),frameRect(4,3,6,3).
  fractional background(1.25,1.75,12,8),frame(4.25,3.5,7,3.5).
  같은환경native bitmap직접draw→공유executor로만든별도frame surface직접draw를reference로삼는다.
  pair호출경유없는reference이며decode/color/실사진방향의독립기준은아니다.
- RGBA전체동일/비어있지않음/외곽투명/배경→frame순서를검사. 두scale을재현한다.
  background-fail은실제배경copy후throw/frame0;frame-fail은양copy후throw.
  partial reference와일치할수있어도result는FAILED이며target은비공개. 두자원종료1회.
- clear/dispose/source-change:준비view를잡은뒤상태변경,copy0.
  pending-clear:bitmap관찰뒤prepare취소·late해제,view/target0.
  replace:같은identity의새prepare완료뒤옛view.paint RELEASED/copy0,새view만두copy허용.
- metadata는frame capture후배경검사실패,decode0,frame release1,target0.
- beforeCleanup상태/해제카운터·모든nativebitmap0×0/privateframe1×1,
  needsSafetyClose/needsSafetyFrame:false를finally실패정리망전에보고한다.
  GC/물리메모리회수증명은아니다.
- factory/before-click I/O0. reader/bitmap normal1/replace2/metadata bitmap0.
  Canvas getContext는no-view인metadata/pending-clear1,기타4,replace5.
  DOM표시/외부요청시도/console warning/error/pageerror0. 실패target배포0.

## 게이트

새 --pair-paint-chromium-only / --pair-paint-firefox-only / --pair-paint-webkit-only,
격리config,workers1,추가인자/조합거부. selector38=35+3예상.
전체check3637=3634+3예상,실행후확정.
신규60 +기존Chromiumpaint16/preparation18/lifecycle46/decode12=92,총152예상.
Firefox는120~126같은일반실행권한도구승인. 권한거절/설치/flaky STOP.
보호23/기본번들3SHA불변,exact6+7,diff--check,자기temp부재/4183/4184/4185listen0.
코드/문서분리일반commit/push는119지속승인. 기본전체E2E는보호PNG때문에실행0.

## 다음과 한계

실제제품룸표시/사진선택/사용자interaction은별도정확계약. 기존116PNG14미해결,
일반사진metadata허용범위/운영권한추가0. 실제화면전에는098geometry/기존product source계약,
RG-2/RG-3/PG-1과현재명시UI승인을대조하고새제품선택만Founder에게묻는다.
단순계약작성·자체검증·일반전송확인질문은반복하지않는다. 전체가중진척분모UNCONFIRMED.

### QUESTIONS

새Founder질문없음. 아직실사진/UI/운영검증아님.

### DONE (Codex)

### 구현 중 보완 R1 — 합성 여백 좌표

최초Firefox18 PASS/2FAIL(52.0s). JPEG/PNG fractional 모두pixels.equal:true이나
borderClear:false. y=0.75는row0의0.25범위를차지하므로외곽투명요구와모순이었다.
실측reference/actual일치는유지됐으며제품pair결함으로단정하지않는다.
합성y를1.75로옮겨외곽1행을확보한다. fractional scale/좌표·RGBA전부동일·borderClear
기존단언은그대로이고제품코드변경0. 수정뒤3엔진/전체check 재실행필수.

## 2026-09-11 — 128 완료 / 자체검수

코드16780ea CODEX_PASSED/DONE(동일Codex,독립검수아님). code6/docs7.
최종selector38=35+3,전체check3637=3634+3(119파일),format/lint364,typecheck7,build2 PASS.
R1 후 신규Chromium20(4.9s)/Firefox20(49.4s)/WebKit20(46.6s)=60 PASS.
기존Chromiumpaint16(4.0s)+preparation18(4.3s)+lifecycle46(5.3s)+decode12(3.2s)=92 PASS.
최종152=60+92 PASS. 최초Firefox2FAIL 및fixture/typecheck보완이력은위R1에보존.
단언삭제/허용오차추가/기존제품코드변경/재시도로실패은폐0.
실제102capturer+공유executor+127controller/port+125work 결속,두scaleRGBA일치,
옛view copy0,partialfail비공개,close/cleanup·safe-net미사용·외부시도0 검증.
보호23/번들3SHA불변,exactscope/diff--check PASS. 자기temp9
tBSrYZ/wdPhnn/5OrDj6/sCba1B/EXuVOe/eJJdRZ/OzhKFG/XjpWHQ/VyAB7j 부재,
4183/4184/4185 listen0.
기본룸UI/실사진/실기기/운영은NOT TESTED·미개방,기존116PNG14미해결.
이번시편은fill-rect frame+core-only사진이며일반사진/폰트/전체프레임효과확장증명아님.

다음 구조 경계는 현재 PreviewComposer의 committed final plan/borrowed bindings/source identity다.
101조사당시source producer가없던문제가남았다. DOM surface ready나probe/frameTrialRef를정본으로
읽지않고현재render의frame/no-clock/final plan/owner incarnation과즉시무효화경계를선행계약화한다.
128을근거로기본UI/일반사진/시계생략을자동허가하지않는다. 중요제품선택만Founder에게묻는다.
총리빌드완료율/남은총스펙수는분모미확정으로UNCONFIRMED.095의잔여기능축을계속추적한다.
