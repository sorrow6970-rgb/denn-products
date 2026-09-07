# spec100 — 준비 controller 계약 검토

2026-09-07. 기준04ccfae. CONTRACT_REVIEW_PASSED / IMPLEMENTATION_NOT_STARTED.
[계약](../../rebuild/specs/100-room-preparation-controller-contract.md).
동일Codex 문서검토이며 독립검수·제품CODEX_PASSED·unit PASS가 아니다.

## 검토 결과

| 099 쟁점 | 100에서 확정한 경계 |
|---|---|
| ready 문자열에 source증명 없음 | opaque source/background token, readSource gate 전후 확인, readPrepared 재검사. getState만으로 사용할 권한 없음 |
| 시계 hidden을 no-clock으로 오인 | kind frame/projectionOk/planReady/clockPreview===null, 정확token 모두요구. 실제producer의 projection증명은 후속검증 |
| mutable/borrowed 자원의 화면노출 | 독립lease의수명만 소유, 공개결과는크기복사뿐; 렌더함수/그리기권한 없음 |
| frame만 획득한채 취소 | pending은controller소유; 완성후098 aggregate한개로 양도; 취소선점후cleanup |
| startBackground sync완료·return 전취소 | 유효cancel확인 전결과보류, cancellation-needed latch, 무효task/throw시임시자원정리 |
| clear 후 promise 미정착 | public취소결과 먼저정착, 나중completion은lease격리/정리. 실제브라우저취소보증아님 |
| 재진입과 중복소유 | lease identity예약·release먼저캡처·필드한번읽기·모든외부호출후cohort재확인 |

근거: [098 session](../../../apps/mockup/src/room-placement/session.ts),
[099 source/owner 조사](2026-09-07-spec-099-room-local-adapter-boundary-investigation.md),
[clock projection](../../../packages/shared/src/catalog/preview/project.ts#L590),
[surface state](../../../apps/mockup/src/canvas/surface.ts#L84).
기존session은 pending부분자원을 받지 않으므로 controller의 partial소유권을 별도로 명시했다.
기존API를 변경하지 않고 내부aggregate로 연결하는 계약이며 실제코드의 정확성은 아직 검증하지 않았다.

## 계약에서 고정한 실패 타임라인

| 상황 | 요구하는 결과 |
|---|---|
| A capture안에서 B prepare가 시작됨 | A반환lease정리, A background시작0, B귀속변경0 |
| A start가 synccomplete한뒤 throw | ready공개0, frame/background정리, BACKGROUND_FAILED |
| A start중 clear, 그뒤 task가반환됨 | public CANCELLED 유지, 나중확보cancel1회, late자원정리 |
| A취소후 Bready, A가동일lease 재통지 | 이미기록한lease 재해제0, B정상자원변경0 |
| 올바른tokens로 readPrepared하지만 source가변함 | 해당cohort정리/null, 새source자동채택0 |
| ready후 dispose | lease정리, 과거성공promise불변, 이후readPrepared null |

아래는 승인하지 않았다: 실제Canvas snapshot/메모리예산·형식/byte cap·UI초기값·background선택·
원격이미지/전체룸효과/Space/저장/발행/print변경. 실제port가증명을거짓으로제공하거나 다른wrapper로
같은underlying자원을이중양도하는 경우는 이fakecontroller가 검증할 수 없는 port계약위반이다.
유효release/cancel을 전달받지 못한 경우 전체회수를 주장하지 않는다. 무응답task의 자동timeout0.

## 구현과 검증 상태

이번변경은 계약/검토/handoff+STATE/NEXT/CURRENT/live의7문서뿐이다.
preparation.ts/preparation.test.ts는 아직 생성하지 않았다. 테스트/build/E2E/browser/emulator실행0.
다음구현에서는 계약§7의 gate·정상/실패·취소·늦은/중복·재진입·소유권검증 및 전체check/canonical이 필요하다.
기존098/099의 테스트수를100실행결과로 쓰지 않는다. 실제룸UI·메모리·서버·실기기는 NOT TESTED.
보호/별도dirty22파일은보존, 문서만검증·일반commit/push. READY_FOR_IMPLEMENTATION에서대기한다.
전체실측완료율확인불가. 100은계약완료이지제품완료가 아니며과거관리추정률상향0.

문서검증 실측: 신규3문서 로컬링크/지정라인13/13 PASS, 시작dirty22/22 SHA동일,
정확7문서외이번변경0, git diff--check PASS, staged0. 신규제품2파일 모두부재를확인했다.
문서검사이지 단위/빌드/브라우저 검증은 아니다. 계약문서만일반전송한다.
