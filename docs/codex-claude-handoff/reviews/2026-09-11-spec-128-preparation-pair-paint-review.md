# 128 native pair 자체검토

033916e 기준 / 2026-09-11. CONTRACT_REVIEW_PASSED(동일Codex).
실제102snapshot+127cohort+125background를고정합성채널로만결속.
exact6+7,60+92행렬,부분실패비공개/옛cohort무효/reference의증명한계·정리근거를검토했다.
구현/실측NOT TESTED. 독립검수/실기기/실사진/운영증명아님.

## R1: fixture 좌표와 투명 외곽 조건 정정

최초Firefox18/20,2FAIL(52.0s). 두fractional의equal:true/nonempty:true/borderClear:false.
y=0.75가row0영역에걸리므로blank border조건을만족하는시편이아니었다.
계약·fixture y=1.75로수정,단언/게이트/제품코드불변. 환경flaky로무시하거나재시도PASS로숨기지않음.
새3엔진/전체check재실행후판정. 최초typecheck의imageBindings null→undefined도신규fixture내
기존PreviewImageBindings타입에맞춰수정했으며원래타입계약변경0.


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
