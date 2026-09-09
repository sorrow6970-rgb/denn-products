# 114 — 배경 작업 lease와 준비 컨트롤러 연결

2026-09-09 / baseline9997bcd / CONTRACT_REVIEW_PASSED (동일 Codex 자체 검토).

## 목표 (WHY)

100의 startBackground sink에 실제 완료된 작업의 검증된 치수·단발 release를 인계한다.
113의 상태 전용 API를 cast/임의 side-channel로 우회하지 않고 명시적인 opt-in API를 추가한다.
사용자 연속 작업 지시에 따른 구조 구현이며 새 사진 정책/운영 권한 승인이 아니다.

## 범위 (SCOPE / WHERE)

정확 코드4개:
- apps/mockup/src/room-placement/promise-work.ts (기존 API 보존 + opt-in lease factory)
- apps/mockup/src/room-placement/promise-work.test.ts (기존 회귀 + lease 검사)
- 신규 apps/mockup/src/room-placement/background-preparation-port.ts
- 신규 apps/mockup/src/room-placement/background-preparation-port.test.ts

문서7개: 이 spec,114 review/handoff,STATE/NEXT/CURRENT/live.
100 preparation.ts/102 snapshot/109 file evidence/112 admission/기본 앱/UI/Rules/config/package/
lock/보호22/debug.log 수정0. 실제사진/실제decoder/network/운영/배포/설치/예약자동화0.

## 구현 지시 (WHAT / HOW)

1. 기존 createRoomBackgroundPromiseWork의 task shape/result 및 release-only 자원 계약은 유지한다.
   새 createRoomBackgroundPromiseLeaseWork는 별도 factory다. mode는 module-private 고정값이며
   호출자 flag/validator 주입0. 새 task에 takeLease(): BackgroundSizeLease|null만 추가한다.
2. 기존 112가 원자원의 release를 먼저 확보한 뒤 새 mode만 width/height를 한 번씩 읽는다.
   두 값은 안전한 정수,1..1,000,000. 이는 내부 수명/치수 계약이며 RG-3 40MP/기기별 maxEdge를
   대체하지 않는다. 실제 decode 전 원본 예산 검사는 여전히 필요하다.
   getter throw/무효는 기존 ticket.release로 정리 후 FAILED. 정리 불명이면 blocked 유지.
   각 getter 뒤 cancel/dispose를 재확인해 이후 getter나 성공 인계를 계속하지 않는다.
3. takeLease는 성공·held 상태에서 1회만 frozen {width,height,release}를 반환한다.
   result는 원래처럼 {ok:true}이며 raw resource/Blob/paint 권한0. take 전후 cancel/dispose는
   소유권을 무효화하고 release 시도 최대1. 외부 소비자가 다른 wrapper로 원자원을 다시 입수하지 않는다.
4. createRoomBackgroundPreparationPort(start:unknown)는 trusted start(identity) 함수를 캡처한다.
   invalid factory는 안전한 INVALID_INPUT. 성공은 frozen {ok:true,port}.
   port는 startBackground(identity,sink),getState,dispose. 하나의 lease work owner를 공유한다.
   sink.complete/fail을 호출 전 캡처·this 보존. 무효 sink는 안전한 고정 예외로 실패하며 start 호출0.
   정상 startBackground는 frozen {cancel}을 반환하고 task.result 성공 뒤 takeLease→complete를 호출한다.
5. BUSY/FAILED/blocked 등은 sink.fail로 한 번만 전달한다. cancel 또는 port.dispose 후 callback0,
   pending 슬롯은 유지하고 늦은 자원은 해제한다. sink callback throw 시 lease.release를 시도하고
   raw 예외/재시도/다른 callback0. 전달 후 자원은 소비자 release 또는 owner.dispose가 정리한다.
6. 100 컨트롤러를 실제 import해 합성 포트로 연결한다. capture-before-start, clear/dispose,
   pending 교체(BUSY), ready 교체(이전 release 후 새 작업), source 변경, late 실패/성공을 고정한다.
   컨트롤러 dispose/clear와 port dispose는 별개이며 최종 소유자가 함께 종료해야 한다.
   port 단독 dispose가 100의 상태를 자동 수정한다고 주장하지 않는다.

## 검증 (VERIFY)

새/기존 targeted unit 및 전체 node scripts/check.mjs. callback 재진입·getter 예외·동일lease
두 번 take 금지·조기 cancel·cleanup blocked·raw 노출0·기존 task shape 불변을 포함한다.
번들3종/보호22 SHA, 정확4코드+7문서 scope, diff--check. 기본 앱/실제 decoder 연결이 없어
native/E2E는 NOT TESTED. 이전 단위 Chromium 결과를 재사용하지 않는다.
일반 scoped commit/push, 같은 Codex 자체 검토 명시. 다음 실제 bounded decoder 입력/자원 계약을
검토하되 PARTIAL/decodeAllowed:false를 임의 허가로 올리지 않는다.

## 위험 (RISK)

의미 없는 치수가 구조적으로 유효할 수 있다. trusted 포트는 정규화된 실제 픽셀 크기를 제공할
의무가 있으며 이 단위가 실제 사진 방향·메모리 안전성을 증명하지 않는다. 102는 별도 frame
lease를 계속 소유하고 100은 치수만 소비한다. bitmap/paint 인계는 여기서 확대하지 않는다.

### DONE (Codex)

코드8ae5853. 정확4파일, 기존 task shape 보존 및 opt-in frozen size lease 인계·100 연결 완료.
targeted55=기존20+추가22+연결13, 전체3290=3255+35, format/lint332·7typecheck·2build PASS.
동일 Codex 자체 검토 CODEX_PASSED. source 변경/clear/dispose/교체/late cleanup/정리 불명 검증.
보호22 SHA 및 고객JS/CSS·adminJS SHA 동일, diff--check PASS. native/E2E/실제사진/제품연결0.
