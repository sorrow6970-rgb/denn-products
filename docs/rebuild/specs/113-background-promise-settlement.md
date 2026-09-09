# 113 — Promise 정착과 작업 슬롯 연결

2026-09-09 / baseline eaef514 / CONTRACT_REVIEW_PASSED (동일 Codex 자체 검토).

## 목적과 범위

112의 trusted settle 통지를 실제 Promise fulfillment/rejection 관찰에 연결한다.
이는 내부 주입 포트 수명 관리이며 사진 디코딩 허가나 drawable 전달 API가 아니다.
109의 PARTIAL / decodeAllowed:false는 유지한다. 100 startBackground의 논리 취소와
물리 작업 완료를 분리하는 기반이며 100/102/109/112 자체와 제품 UI는 변경하지 않는다.

정확 코드: 신규 `apps/mockup/src/room-placement/promise-work.ts`, `promise-work.test.ts`.
문서: 이 spec, 113 review/handoff, STATE/NEXT/CURRENT/live의 7개.
기존 보호/별도 dirty22 및 새로 관찰한 debug.log는 수정·stage·commit하지 않는다.
실제 사진/native decoder/운영/설치/Rules/config/package/lock/예약 자동화는 금지한다.

## 계약

- createRoomBackgroundPromiseWork()는 I/O 없이 하나의 112 admission을 소유한다.
  start(unknown)에서 함수가 아니면 INVALID_INPUT, 슬롯 불가면 해당 BUSY/BLOCKED/DISPOSED.
  성공은 frozen `{ok:true, task}`. task는 frozen `{result, cancel, release}`.
  result는 Promise의 안전 결과 `{ok:true}` 또는 고정 코드 실패이며 원자원/예외 원문을 노출하지 않는다.
- 시작 함수를 호출하기 전에 슬롯을 예약한다. start는 trusted 내부 함수이며 실제 작업을
  대표하는 native Promise를 반환해야 한다. 기본 포트/타이머/자동 retry/abort 호출은 없다.
  native Promise.prototype.then을 캡처해 호출하며 임의 thenable의 then은 실행하지 않는다.
  변조된 JS realm/Promise species, 숨긴 별도 작업은 신뢰 경계 밖이다.
- fulfillment 값은 `{release():void}` 소유 자원으로 112에 전달한다. 유효하면 held를 유지하고
  result 성공. null/무효 자원은 성공으로 처리하지 않는다. rejection은 작업 완료·자원 없음으로
  settle(null) 후 FAILED. rejection 시 숨긴 자원이 없다는 것은 trusted start 포트 의무다.
- cancel/release는 같은 멱등 논리 종료다. pending이면 결과 CANCELLED지만 슬롯은 계속 pending.
  이후 실제 fulfillment에서 release를 시도하고 rejection에서 슬롯을 반환한다.
  이미 성공한 task의 release는 result를 바꾸지 않고 자원만 해제한다.
- dispose는 영구 DISPOSED이며 pending 결과도 DISPOSED. 늦은 자원 해제 책임은 유지한다.
- start 동기 throw 또는 Promise 아닌 반환은 물리 완료를 증명하지 못하므로 UNKNOWN +
  112 invalid settlement로 blocked 처리한다. 새 작업을 열지 않는다. 이미 숨겨진 작업의
  결과를 회수할 수 있다고 주장하지 않는다. 이런 trusted port 위반은 자동 복구하지 않는다.
- 재진입 중 취소/dispose 및 자원 release getter 재진입도 새 작업과 성공 결과를 잘못 열지 않는다.
  포트의 release가 throw하면 112 blocked를 보존한다. 한 owner만의 제한이며 전역 메모리 상한 아님.
- 코드 접두사 ROOM_BACKGROUND_WORK_: INVALID_INPUT, BUSY, BLOCKED, DISPOSED,
  FAILED, CANCELLED, OUTCOME_UNKNOWN. 오류 원문/PII/Blob/bytes 결과·로그 노출 0.

## 검증과 후속

deferred native Promise 합성 unit: 정상/거부/취소/늦은 완료/dispose/held 해제/재진입/무효 포트,
thenable 실행0, 중복 cancel/release, 정리 throw 차단, 무할당 import, raw error 노출0.
targeted unit, 전체 `node scripts/check.mjs`, 번들3종 SHA, 보호22 SHA, scope/diff 검사.
순수 비연결 단위이므로 native/E2E NOT TESTED. 110/111 결과를 이번 실행으로 재사용하지 않는다.
같은 범위 구현·검증·일반 commit/push 후 100 sink 연결 가능성을 검토한다.
실제 사진 허가/회전 의미/지원 기기/최대 메모리 보증은 후속 계약 없이 확대하지 않는다.

### DONE (Codex)

코드 fe1b837, 동일 Codex 자체 검토 CODEX_PASSED (독립 검수 아님).
targeted 20/20, 전체 3255=3235+20, format/lint 330파일·7개 typecheck·2개 build PASS.
처음 lint는 의도적인 hostile thenable fixture를 경고했다. 해당 한 줄에 목적을 밝힌 예외를
추가하고 전체 check를 다시 통과했다. 제품 lint 설정이나 단언은 완화하지 않았다.
번들 고객 JS/CSS·admin JS SHA 동일, 보호22 SHA 동일, diff--check PASS.
새 debug.log는 출처 확인 없이 사용자/별도 파일로 제외한다. native/E2E 실행0은 계약상 분리다.
