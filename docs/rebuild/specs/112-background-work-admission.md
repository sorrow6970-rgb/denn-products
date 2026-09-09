# 112 — 비중단 작업의 단일 슬롯·늦은 자원 해제

2026-09-09 / baseline2b6d739 / 계약자체검토완료.111 합성픽셀probe 뒤 자원수명 기반을 구현한다.

## 목표·정확범위

논리취소만으로 아직끝나지않은native작업의슬롯을재사용하지않는순수admission을만든다.
한instance에서실행중작업또는보유자원은최대1이다.복수instance전체/엔진내부메모리한도는보증하지않는다.
코드2개:신규 apps/mockup/src/room-placement/work-admission.ts와work-admission.test.ts.
문서7개:이112spec,112review/handoff,STATE/NEXT/CURRENT/live.
기존100/102/109/decoder/제품UI/fixture/Rules/config/package/lock/보호22 수정0.
native호출/실제사진·데이터/운영/설치/자동화0.신뢰된연결부가물리완료를알려주는순수내부primitive다.

## API와 상태

`createRoomBackgroundWorkAdmission()` → frozen `{begin,getState,dispose}`.생성/import I/O0.
getState는idle/pending/held/blocked/disposed. begin은frozen실패{ok:false,code} 또는{ok:true,ticket}.
ticket은frozen `{settle(resource:unknown):void,release():void}`.타이머/Promise/파일/metadata/허가정보0.
resource는null(물리작업실패·자원없음) 또는신뢰된객체 `{release():void}`.release함수1회캡처·this보존.
begin은idle에서만pending예약,그외BUSY/BLOCKED/DISPOSED.모든reserve는외부getter/callback보다먼저확정한다.

1. ticket.release는취소/보유자원해제요청이다. pending에서는예약을유지하고논리취소만표시한다.
   신뢰된port가실제작업정착을관찰해settle하기전새begin은BUSY.절대시간/abort성공으로추정0.
2. 최초settle(null)은물리실패완료→idle.최초유효resource는held,이미취소/dispose면즉시release1회.
3. held에서release는자원release시도를먼저표시하고호출한다.정리중재진입begin도BUSY여야한다.
   정상반환후에만idle.정리throw는blocked로잠가알수없는자원을두고새할당하지않는다.
4. 무효resource/release getter throw/함수없음은blocked. 예외원문반환/log0.
5. dispose는영구종료.held는release1회, pending은나중settle자원해제까지책임지되begin은계속DISPOSED.
6. 중복/늦은settle의새객체는즉시release.동일객체는WeakSet으로한번만admit/정리하고재사용하지않는다.
   현재held인같은객체중복은조기release하지않는다.다른wrapper로같은자원숨기기는신뢰포트위반/탐지불가.
7. getter/cleanup재진입에서새세대자원을닫지않는다.미해결cleanup이면futurebegin차단,
   기존소유자원은원래ticket/dispose경로로계속정리할수있다.

고정실패코드 ROOM_BACKGROUND_WORK_BUSY / BLOCKED / DISPOSED. 공개결과에원본자원/width/bytes/PII0.
settle은권한토큰이나물리완료검출기가아니다.호출자가실제Promise정착에서만이를호출해야한다.
실제decoder연결/완료observer/사용허가는후속별도계약이며이primitive만으로decodeAllowed를바꾸지않는다.

## 검증·완료

합성unit:idle→pending→held→idle,취소pending슬롯유지,late成功/실패,dispose,중복동일/새자원,
release/getter예외·재진입·release시도최대1·callerthis·세대분리·frozen·I/O0.
targeted Vitest, `node scripts/check.mjs`,번들3종SHA·보호22SHA·diff--check·정확2+7범위.
순수비연결단위E2E0/PNG출력0.기존111의36PASS를이번단위결과로재사용0.
코드/문서일반commit/push후다음실제decoderport연결계약검토.새제품결정·권한·범위밖충돌만STOP.

### DONE (Codex)

코드b779c1a,정확2파일. 단발ticket과pending/held예약,논리취소와물리완료분리,late중복정리,
정리불명blocked·WeakSet한번만소유·재진입예약·영구dispose 구현.
targeted23/23,전체3235=3212+23,format/lint328·7typecheck·2build PASS.
초기TS7006은settle인자unknown명시로수정.자체검토중idle의late정리재진입예약과revokedProxy방어를보강했다.
번들3종SHA·보호22SHA동일,diff--check PASS.순수미연결계약으로E2E실행0·PNG출력0.
CODEX_PASSED는동일Codex자체검토다.물리완료는trustedport통지이며실제decoder검출/중단보증아님.
