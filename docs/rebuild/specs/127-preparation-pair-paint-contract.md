# 127 — 준비세대에 결속된 frame/background paint

2026-09-11 / 기준 f3d76e7. 사용자 스펙 간 루틴 범위의 비연결 코드 계약.
CONTRACT_REVIEW_PASSED(동일 Codex 정적 자체검토, 독립검수 아님). 126 DONE.

## 목표 / 근거

preparation.ts(100)는 같은 cohort의 frame/background를 session aggregate로 소유하지만
크기만 외부에 준다. 123 port도 size-only factory를 사용한다. 102 frame snapshot과125 background
paint lease는 이미 각각 제한 paint를 갖는다. 126 native48 PASS는 둘의동일세대증명이 아니다.
따라서 기존 cohort 안에 명시 paint 모드를 추가한다. 외부 registry/다른decode/size로 자원복원0.

## 정확 범위

코드4:
- 수정 apps/mockup/src/room-placement/preparation.ts
- 신규 apps/mockup/src/room-placement/preparation-paint.test.ts
- 수정 apps/mockup/src/room-placement/background-absence-preparation-port.ts
- 신규 apps/mockup/src/room-placement/background-absence-paint-port.test.ts

문서7: 이spec,127 review/handoff,STATE/NEXT/CURRENT/live.
기존시험/102/119/121/125 구현,fixture/runner/config/barrel/defaultUI/Rules/package/lockfile/
보호23 변경0. 실사진/실제Firebase/운영/배포/설치/다운로드/자동화0.

## API와 소유권

- 기존 createRoomPreparationController / createRoomBackgroundAbsencePreparationPort는
  size-only 표면/에러/동작을 유지하고 paint getter도 읽지 않는다. 기존시험과 hostile paint로 검증.
- 명시 createRoomPaintPreparationController(input) 및
  createRoomBackgroundAbsencePaintPreparationPort(environment) 추가.
  private 공통 구현을 각각 공유; 기존 cohort/session/admission/검사/decode를 중복생성하지 않는다.
- 새 paint controller는 기존기능과 readPaintPrepared(request)를 갖는다.
  sourceIdentity/backgroundIdentity가 현재 ready cohort와 일치하며 source gate가 유효할때만
  frozen {frameSize,backgroundSize,paint} 반환. 크기도 frozen사본. rawlease/bytes/identity반환0.
  view는 특정 cohort에 폐쇄적으로 결속된다. 같은 identity로 다시prepare해도 옛view는 RELEASED,
  새view/자원을 그리거나 해제하지 못한다. 준비 전/중/clear/dispose엔 view없음.
- 새 모드만 admit에서 release를 먼저 확보한 뒤 size와 paint를 한번캡처/receiver보존.
  getterthrow·잘못된paint면 기존 CAPTURE_FAILED/BACKGROUND_FAILED,해제1시도.
  paint모드 getter후cohort종료를검사한다. duplicate/late자원은 기존owner규칙대로정리.
- aggregate와view가 같은 Resource를 참조; retire시 c.view/c.pair를 먼저 지우고 기존aggregate해제.
  별도 registry/weakmap추가0. view는 자원release를 노출하지 않으며 controller clear/dispose가소유.
- 새123 paint port는125 명시paintfactory로동일검증/lookup/cancel선등록/singlehandoff를 공유.
  decoder는 trusted wrapper필수. port.dispose 시전달된lease도폐기되므로 controller도함께dispose해야한다.
  port단독종료는 다음paint실패로검출하지만 정상완료로추정하지않는다.

## 동기 pair paint

view.paint({target,frameRect,backgroundRect}):
- controller disposed → DISPOSED, 옛cohort/종료 → RELEASED, controller내paint재진입 → BUSY.
- 모든request/rect 필드를단일캡처하며각외부getter뒤cohort종료확인.
  target은trusted 내부object. 두rect 모두x/y finite,w/h finite양수,각자encodedsize기반단일scale.
  relative aspect오차<=1e-9. 두rect를모두검증한뒤첫copy를호출하여틀린frameRect에서도background0.
- 현재source gate를입력후/배경전·후/프레임후검사한다. readSource와필드마다cohort종료확인.
  source identity/kind/projectionOk/planReady/clockPreview조건은100과동일.
- 배경.paint({target,rect:backgroundRect}) → 성공결과.ok===true 확인 → source/current재확인 →
  프레임.paint({target,rect:frameRect}) → 성공결과/current/source재확인 → ok:true.
  고정오류 ROOM_PREPARED_PAINT_INVALID_INPUT|RELEASED|DISPOSED|BUSY|SOURCE_CHANGED|FAILED.
  rawcode/SDK/target/bytes노출0. input불량은pair보존, source변경은해당cohort retire.
  portpaint false/throw/thenable결과는FAILED로해당cohort retire; 양쪽release1시도.
  prepare 결과가이미성공이어도controller상태는empty로전환. 준비오류union을늘리지않는다.
- copy/결과getter/cleanup재진입중clear/교체/dispose면나머지copy0,성공반환0.
  이전cohort실패처리가새cohort를정리하면안된다. cleanup중dispose는최종DISPOSED 우선.
- Canvas픽셀원자성아님. 배경이이미그려진후프레임실패가능. caller는완전히성공하기전
  detached destination을공개하지않고실패destination을폐기해야한다. 자동retry/부분표시0.
- trusted 동기ports만. 악의적async 내부copy의부작용까지보안적으로되돌린다는주장0.

## 검증

- 새 controller 시험:기본모드getter0,명시형shape/단일getter/this,ready전gate,
  양쪽정상순서,각rect불량선차단,clear/dispose/replacement/동일identity옛view,
  source변경,request/rect/source/result/paint/cleanup재진입,
  frame/background paint부재/throw/false/thenable,partialfailure후나머지0,
  nestedpaint BUSY,duplicate/late자원/close throw의at-most-once.
- 새port시험:실제100새controller+123새port+125work+119byte검사,합성reader/decoder/frame만.
  정상copy순서/read1/decode1/close1,metadata0decode,clear중pendinglateclose,
  wrongidentitylookup/portdispose/sourcechange 후copy0. 기존sizeport paintgetter0.
- targeted 새2+기존preparation.test.ts/background-absence-preparation-port.test.ts/
  background-absence-paint.test.ts/frame-snapshot.test.ts; 전체 node scripts/check.mjs.
- 기존 Chromium --absence-paint-chromium-only16/--absence-preparation-chromium-only18/
  --background-lifecycle-only46/--absence-decode-chromium-only12 = 회귀92.
  새pair의native/3엔진은이번NOT TESTED,다음합성결속검증계약으로분리.
- 보호23/번들3SHA불변,exact4+7,diff--check,자기temp부재/고정포트0.
  동일119지속전송승인으로code/test와문서분리일반commit/push.

## 위험 / 다음 경계

현재변경은비연결 내부API이며새제품정책아님. 실제룸UI·사진입력·표시·저장/발행/운영추가0.
같은cohort pair의native테스트→별도room composition계약 순서. 116PNG14미해결.
추가권한/보호충돌/스펙밖결함/재현불가게이트면 STOP. 진척분모 UNCONFIRMED.

### QUESTIONS

새Founder질문없음. 실패target 비공개는향후실제caller가따라야하며이단위에서UI를열지않는다.

### DONE (Codex)

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
