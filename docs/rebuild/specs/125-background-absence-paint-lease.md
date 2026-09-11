# 125 — 부재검사 배경의 제한 paint lease

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


2026-09-11 / 기준76ebe36. 사용자 스펙 간 루틴 진행 지시에 따른 비연결 구현 계약.
CONTRACT_REVIEW_PASSED(동일 Codex 정적 자체검토). 구현 결과는 별도 DONE에 기록한다.

## 목표와 조사 결론

100 preparation은 width/height/release만 받아서 치수 사본만 반환한다. 123도121의 치수lease만 전달한다.
102 frame-snapshot에는 private surface.copyTo 기반 paint가 있으나 배경에는 대응 권한이 없다.
따라서 치수로 drawable을 복원하거나 두 번째 decode로 별도 그림을 만들지 않는다.
먼저121의 단일 소유권 안에 명시적 별도 paint factory를 추가한다. 100/123 세대별 paint 연결과
최종 표시·UI는 후속 계약이다. 이번에는 background lease 자체의 취소/해제 후 paint0만 증명한다.

## 정확 범위

코드3:

- 수정 apps/mockup/src/room-placement/background-absence-decode.ts
- 신규 apps/mockup/src/room-placement/background-paint-lease.ts
- 신규 apps/mockup/src/room-placement/background-absence-paint.test.ts

문서7: 이spec,125 review/handoff,STATE/NEXT/CURRENT/live. 기존시험/100/102/123/112/119/118 수정0.
barrel·기본UI·fixture·E2E config/runner·Rules·package/lockfile·보호/사용자23 변경0.
실사진/실제UID/Firebase/운영/배포/설치/다운로드/자동화0. RG-2/RG-3/PG-1 의미 유지.

## API와 소유권

- 기존 `createRoomBackgroundAbsenceDecodeWork(environment)`의 동작/오류/치수lease 필드/환경 캡처는 불변.
  기존 mode에서는 decoder 결과의 copyTo를 읽지도 않는다. hostile copyTo getter로 회귀를 고정한다.
- 같은 모듈에 명시적 `createRoomBackgroundAbsencePaintWork(environment)` factory 추가.
  기존119/121/112 수명 구현을 private 공통 함수로 공유한다. admission/byte 검사/decode 중복0.
- 새 factory의 환경도 trusted decode 필수/createReader 선택. 정상 decode 결과는
  `{width,height,close(),copyTo(target,sourceRect,destinationRect)}`인 trusted wrapper.
  raw ImageBitmap을 그대로 새paintmode에 넘기면copyTo부재로DECODE_FAILED. 기본native adapter 추가0.
- close를 먼저 확보하고 admission에 등록한 뒤 기존 expected 치수 검증. 새mode에서만 copyTo를
  한 번 캡처하고 원 receiver를 보존. 무효/throw면 close1회 후 기존DECODE_FAILED,
  capture 중 cancel/dispose면 이후 getter/paint 권한 공개0. 늦은 결과는 copyTo를 읽지 않고close한다.
- task의result/cancel/release 계약은 기존과 동일. takeLease1회로 frozen
  `{width,height,release,paint}`만 반환. raw bitmap/Blob/bytes/context는 반환하지 않는다.
  기존 factory는 정확 `{width,height,release}`만 반환. 타입도 별도 정확 결과로 유지한다.
- release/cancel은 stopped와 copy 참조를 먼저 지운 뒤close. close throw는112 blocked 유지.
  old lease나task는 새작업을해제하지않는다. pending취소의물리슬롯은정착때까지유지.

## paint 계약

새helper는모듈내 trusted callback을받아제한lease를만든다. 공개barrel/기본UI로노출하지않는다.
`paint({target,rect:{x,y,width,height}})`는 동기이고 fixed result만 반환한다.
target은 내부 trusted destination object이며 임의객체를 Canvas라고 인증하는 경계가 아니다.
rect는 단일캡처, x/y finite, w/h finite양수, scale도finite양수. 원본aspect에 대해
sx=w/encodedWidth, sy=h/encodedHeight, 상대차<=1e-9만 허용(102와 같은 부동소수 허용오차).
destination.height=encodedHeight*sx로 정규화하고 source crop은전체encoded크기(0,0,width,height).
crop/fit/회전/자동축소/사진방향 추정0. target의transform/clip/배경clear는caller책임.

검사순서: disposed → released → painting BUSY → request와필드검사 → copy → 종료재검사.
각 외부getter 후종료를확인하며 취소/해제/dispose 뒤추가getter/copy0.
잘못된입력은lease를보존. nestedpaint는BUSY/copy0.
copy throw면lease를종료하고 PAINT_FAILED. copy 도중release/dispose는성공반환금지.
오류는 `ROOM_BACKGROUND_PAINT_INVALID_INPUT|RELEASED|DISPOSED|BUSY|FAILED`만;
raw error/target/identity/bytes/log0. 자동retry/async paint/target 공개0.
동기copy가이미쓴픽셀은되돌릴수없다. caller는실패한destination을공개하면안된다.
copyTo는동기trusted port의의무. 악의적/비동기copyTo가그리기를보류하는것까지보안적으로막는다는주장0.
GC/메모리회수·원자적인frame+background paint는이번증명아님.

## 구조 선택 비교 / 후속 경계

| 후보 | 판정 |
|---|---|
| size-only 그대로화면에사용 | 불충분:원그리기권한없음 |
| decoder를다시불러paint자원획득 | 미채택:중복decode·서로다른snapshot위험 |
| 외부bitmap registry | 미채택:기존100세대/해제와분리된side-channel위험 |
| 기존work내명시paintfactory | 채택:검증/슬롯/close공유,기존mode불변. 이번125한정 |

다음100/123에연결할때는source/background identity 및하나의prepare세대와paint권한을같이묶어야한다.
100readPrepared가성공했다는사실만으로별도registry 자원을같은것으로인정하면안된다.
source변경검사/clear/교체중두자원paint0·실패destination공개0은아직NOT TESTED.

## 검증

실제121/119/112,합성reader/decoder/copyTo만 사용. 신규native paint/UI/실사진은 NOT TESTED.

- 새paint시험:정상단일decode/인계1,치수-only회귀,입력snapshot/this,aspect/crop,
  invalid/mismatch/metadata/copy부재/throw,copygetter재진입,read/decode취소·late,
  paintgetter종료/nestedpaint/copythrow/close재진입·throw/oldlease의newwork격리.
- targeted: 새시험+background-absence-decode.test.ts+background-absence-preparation-port.test.ts+
  work-admission.test.ts+frame-snapshot.test.ts.
- 전체 `node scripts/check.mjs`.
- 기존 `--absence-preparation-chromium-only`, `--absence-preparation-firefox-only`,
  `--absence-preparation-webkit-only` 각18; `--background-lifecycle-only`46;
  `--absence-decode-chromium-only`12. 기존회귀112이며125native paint 증명아님.
  Firefox는124와같은승인된일반실행환경,권한거절/설치/flaky는STOP.
- 보호23/기본번들3 SHA불변,정확code3/docs7,diff--check,자기temp부재/포트0.
  코드/문서분리일반commit/push는119지속승인. 기존게이트/단언완화0.

### QUESTIONS

새Founder질문없음. 실제룸UI·사진·추가metadata·저장/Space/운영권한을이계약에추가하지않는다.
