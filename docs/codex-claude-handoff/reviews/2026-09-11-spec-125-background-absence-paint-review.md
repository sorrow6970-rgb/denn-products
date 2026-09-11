# 125 제한 paint 소유권 조사·계약 자체검토

125 전송완료: code5b1d172/docsfb85ab5,HEAD=originfb85ab5·0/0 확인. 최종기록1회후다음native계약.


## 구현 완료 — 2026-09-11

코드5b1d172,동일Codex 자체검수 CODEX_PASSED/DONE(독립검수아님).
신규unit40,targeted277=기존237+40(5파일),전체check3571=3531+40(117파일) PASS.
format/lint356,typecheck7,build2 PASS. 기존3엔진54(Chromium18/4.1s,Firefox18/43.3s,
WebKit18/40.9s)+Chromium46/5.3s+12/3.2s=112 PASS. 게이트실패/재시도0.
기존size-only copyTo getter0,paint단일인계/단일scale/종료후copy0,close실패blocked,
oldlease-newcohort격리 및실패cleanup중dispose우선순위를검증했다.
보호23/기본번들3 SHA불변,diff--check PASS,code3/docs7외추가변경0.
자기temp RxOBp3/m0eNe1/bUU2yw/iDp3oQ/uGOSpO 부재,4183/4184/4185listen0.
125native paint/준비된쌍의paint결속/룸UI/실사진/실기기/운영은NOT TESTED,기존116PNG14미해결.
다음은명시paintfactory의합성native픽셀·해제검증계약이다. 원자원공개/UI/실사진권한은추가하지않는다.


기준76ebe36,2026-09-11. CONTRACT_REVIEW_PASSED(동일Codex,독립검수아님).
[계약](../../rebuild/specs/125-background-absence-paint-lease.md).

- [100](../../../apps/mockup/src/room-placement/preparation.ts)의Resource/admit/readPrepared는치수만취급.
- [121](../../../apps/mockup/src/room-placement/background-absence-decode.ts)는검사된동일Blob을한번decode하고
  close를112에등록한뒤치수를검증하며size-only lease를1회인계한다. 여기에명시factory를분리하면
  byte/자원검사를중복하지않고copy권한을같은작업내에서캡처할수있다.
- [102](../../../apps/mockup/src/room-placement/frame-snapshot.ts)의privatecopyTo/단일scale/종료재검사
  원칙은재사용하되source검사를배경lease에꾸며넣지않는다. 배경단일자원과준비된쌍의소유권은별개다.
- 125는background권한만. 100/123쌍의current-source검사/원자적destination공개/UI연결은후속미완.
  외부registry/중복decode를쓰지않고기존factory의copyTo getter0을회귀로고정한다.

코드3/docs7만가능한구조검토. 새nativepaint는NOT TESTED. 실제서비스/보호/제품의미변경0.
