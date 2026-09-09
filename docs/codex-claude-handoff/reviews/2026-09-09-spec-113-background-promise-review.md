# 스펙 113 검토 — Promise 정착 연결

2026-09-09 / 코드 fe1b837 / CODEX_PASSED (동일 Codex 자체 검토).

[계약](../../rebuild/specs/113-background-promise-settlement.md)의 정확 코드2개만 구현했다.
112 자체와 100 preparation, 109 입력 증거, 제품 앱 import는 변경하지 않았다.

## 확인 결과

- 시작 전 예약, native Promise then 관찰, 논리 취소 후 pending 유지, 늦은 성공 release와
  rejection 반환, held 해제, dispose, getter/cleanup 재진입, 세대 격리: 합성20/20 PASS.
- native Promise가 아닌 thenable은 getter 호출0으로 거부한다. start throw/무효 반환은
  OUTCOME_UNKNOWN 및 blocked. 관찰 불가능한 숨긴 작업까지 해제했다고 주장하지 않는다.
- 전체 check: 3255=3235+20 unit, format/lint330, 7 typecheck, 2 build PASS.
  첫 lint 실패는 의도한 then fixture의 좁은 설명 예외로 수정 후 전체 재검증했다.
- 고객 JS SHA FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
  CSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
  admin JS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246: 모두 기존과 같다.
- 보호/별도 dirty22 SHA 불변. 신규 debug.log는 수정·stage·commit하지 않는다.
  diff--check PASS. 기존 build chunk500kB 경고는 남아 있으며 이번 변경의 신규 경고가 아니다.

## 제한 및 다음

이 검증은 trusted Promise 포트의 수명·예약 검증이다. 실제 decoder/사진 사용허가/메모리 상한/
100 sink 통합/다른 엔진/실기기는 NOT TESTED. 변조된 realm/Promise species 또는 포트가 숨긴
작업을 방어하는 sandbox가 아니다. 실제 native 브라우저 Promise 검증은 별도 범위로 남긴다.
다음은 100 sink에 인계할 안전한 lease와 113 수명 소유권을 대조하는 계약 검토다.
미검증 decodeAllowed:false를 true로 바꾸거나 사용자 승인을 반복 요청하지 않는다.
