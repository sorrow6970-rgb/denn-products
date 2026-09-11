# 127 preparation pair paint 자체검토

2026-09-11 / f3d76e7 기준. CONTRACT_REVIEW_PASSED(동일Codex,독립검수아님).

100의실제aggregate소유권에paintview를묶는후보를채택. 외부registry/중복decode/현재크기만맞춘
별도자원미채택. 기존모드불변/명시모드/옛cohort무효/두rect선검증/부분픽셀실패비공개,
정확code4/docs7및시험경계에모순없음. 새제품정책·UI·운영승인추가0.
구현/새pair검증은NOT TESTED;126native48은개별background검증이다.


## 2026-09-11 — 127 구현·자체검증 완료

코드d21a49d CODEX_PASSED/DONE(동일Codex;독립검수아님). exactcode4/docs7.
신규unit60, targeted317=257+60(6파일), 전체check3634=3574+60(119파일) PASS.
format/lint361,typecheck7,build2 PASS. 최초lint의test non-null4/thenable표현1을
허용신규시험내에서명시null검사/실제Promise로고친후PASS,규칙·게이트완화0.
정적자체검토에서scale곱 overflow 선검증을보강하고회귀시험포함,최종targeted/check재실행PASS.
기존Chromiumpaint16(3.9s)+preparation18(4.1s)+lifecycle46(5.1s)+decode12(3.2s)=92 PASS.
기존mode paint/copyTo getter0,cohort별view/교체후옛view0,양rect선검증,
source/입력/결과/paint/cleanup재진입,부분실패후frame0,단발lookup/read/decode와close1 검증.
보호23/번들3 SHA불변,exactscope/diff--check PASS,자기temp vlnr4B/nD1e43/msCdDT/d567Pn 부재,
4183/4184/4185 listen0. 새pair native/실제룸UI/실사진/운영은NOT TESTED·미개방.
기존116PNG14미해결. 다음은같은cohort의두paint권한을합성native로검증하는정확계약이다.
