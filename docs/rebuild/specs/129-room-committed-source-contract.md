# 129 — 룸 committed source 등록·무효화 규약

2026-09-11 / 기준3157325. 사용자 스펙간루틴에 따른 선행계약.
CONTRACT_REVIEW_PASSED(동일Codex 정적자체검토). 구현 전 작성,128DONE 유지.

## 조사 / WHY

PreviewComposer.tsx의 built(plan/maxPan),imageBindings,entries/art의같은확정입력만source후보이다.
frameTrialRef는probe중에도갱신되므로정본아님. usePreviewCanvasSurface는effect에서snapshot을
갱신하므로surface.ready역시committed source증명이아니다.
useLocalImageBinding/useTemplateArtBinding은state/bindings/load/clear만노출한다.
localImageBinding.dispose는ready=null/listeners.clear지만마지막snapshot상태를갱신하지않는다.
따라서 React state의ready나같은imageRef만으로현재owner가살아있다고단정할수없다.

먼저프레임워크독립등록규약을구현한다. React/Composer연결시점·ownerincarnation의실제증명은
다음정확계약이며이번helper가Reactcommit을관찰하거나rawpixels를독립복사한다고주장하지않는다.

## 정확 범위

신규2: apps/mockup/src/room-placement/committed-source.ts, committed-source.test.ts.
문서7: 이spec,129review/handoff,STATE/NEXT/CURRENT/live.
기존제품·hook·UI·시험·fixture·config·Rules·manifest·lockfile·보호23수정0.
실사진/실제Firebase/운영/발행/배포/설치/다운로드/예약자동화0.

## API / WHAT

createRoomCommittedSourceOwner({onInvalidate})는콜백한번캡처/receiver보존,생성시호출0.
잘못된factory는고정 ROOM_SOURCE_INVALID_INPUT. 반환owner는frozen이며
begin(),readSource(),invalidate(),dispose(),getState()만. IO/타이머/UUID/외부registry0.

- begin():이전source를즉시분리하고새고유opaque ticket을생성한다.
  처음/빈상태에서는notify0,이전pending/ready가있으면onInvalidate1시도.
  ticket {commit(raw):boolean,invalidate()}는frozen. 동일객체내용을다시commit해도새identity.
- ticket.commit은최신ticket만최대1시도;늦은/중복/무효화후commit은getter0/false.
  최신입력불량은해당ticket폐기/notify1. oldticket.invalidate는새ticket에영향0.
- raw필수:kind==="frame",projectionOk===true,planReady===true,clockPreview===null,
  plan객체(kind==="frame",logicalCanvas양변유한[1,1e6]),imageBindings.get함수,
  isCurrent함수. 필드한번캡처/매외부getter뒤ticket현재성검사.
  validation은최소형태 gate이며렌더plan전체검증·명령복사·pixel retain 아님.
- isCurrent는trusted producer의동기현재성증명port,commit/readSource/borrowed binding.get
  전후에서===true만인정. false/throw/thenable은사용0·해당source분리/notify1.
  체크재진입readSource/get은null/undefined로거부하며정상외부체크를별도로폐기하지않는다.
  proof실행중다른ticket.commit은getter0/false(미소비)이며proof정착후명시commit가능.
  binding.get 재진입도undefined로거부하여중첩borrow호출0.
- source등록성공때고유opaqueidentity와고정framegate·plan참조·검사된bindingwrapper를frozen으로반환.
  readSource는유효하면같은객체,그외null. imageBindings.get은캡처한원receiver를사용하며전후현재성
  체크를통과한drawable만빌려준다. 입력ref가string이아니면호출0/undefined.
  빌린plan/drawable을변경·복사·해제0. 계획내용불변성과owner변경즉시무효화는producer의의무다.
  악의적인isCurrent가거짓true를주는경우를보안적으로인증한다는주장0.
- invalidate()/dispose()는source/ticket을먼저분리후notify. dispose후재개0.
  notify중begin/dispose/readSource재진입에도옛cleanup이새source를덮지않는다.
  notify throw면cleanup성공을추정하지않고owner를blocked로고정(source없음/begin불가).
  dispose가우선. raw exception/identity/plan/bytes를로그/오류/UI에출력0.
- state empty/pending/ready/blocked/disposed,notify자동retry0.

## 실제 연결 시 후속 의무

begin은입력변경진입에,commit은React가채택한묶음의commit-phase에호출해야한다.
render중source등록/자원생성·해제0,버려진render는commit0.
isCurrent는최신plan/bindings/projection/clock와borrowed owner incarnation/liveness를증명해야한다.
현재hookstate만캡처한()=>true 구현은금지. 실제어떤hook읽기port가필요한지후속계약에서
명시하며이번에기존hook을조용히바꾸지않는다. onInvalidate는127.clear와결속할후보.

## VERIFY

새unit:factory인자/getter/this/IO0,최신ticket단발,old/중복getter0,입력별failclosed,
field재진입,guardfalse/throw/reentrant,bindingsreceiver/전후무효화/throw/비문자ref,
invalidate/dispose/cleanupthrow·재진입,동일입력새identity,borrowed release0,
실제127controller의readSource로결속하여변경즉시pair폐기·pending취소/late해제.
targeted 새시험+preparation-paint.test.ts+frame-snapshot.test.ts.
node scripts/check.mjs; 기존Chromium --pair-paint-chromium-only20,
--absence-paint-chromium-only16,--absence-preparation-chromium-only18 = 회귀54.
새source의React/native연결증명아님. 보호23/번들3SHA불변,exact2+7,diff--check,temp/포트0.
119지속승인code/docs분리일반commit/push. 기본전체E2E/보호PNG재생성0.

## STOP / 다음

현재React wiring/sourceproducer의완전한liveness는NOT TESTED.129를그증명으로넘겨쓰지않는다.
다음은현재hook의읽기전용owner증명port와commit시점연결계약. 새UI·시계생략·사진지원축소/
운영권한추가가필요하면별도제품결정. 구조검토/검증단계의일반승인질문은반복하지않는다.
리빌드전체완료율분모와잔여총스펙수UNCONFIRMED.

### QUESTIONS

이번새제품질문없음.

### DONE (Codex)

fe58f07 DONE / CODEX_PASSED (동일 Codex 자체검수, 독립 검수 아님).
새 unit 52, targeted 189=137+52, 전체 check 3,689=3,637+52 (120파일) PASS.
format/lint 366파일, typecheck 7, build 2 PASS. 기존 Chromium 회귀 54=20+16+18 PASS.
실제 102/127과 합성 owner 연결로 준비완료/진행중 변경 취소·late lease 해제를 확인했다.
React/native source 연결은 아직 NOT TESTED. 보호23/번들3 SHA 불변, exact code2/docs7,
diff --check PASS. 자기 temp3 부재, 4183/4184/4185 listen0. 새 제품권한 없음.
