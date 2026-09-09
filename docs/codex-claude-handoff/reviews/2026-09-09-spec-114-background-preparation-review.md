# 114 연결 검토

2026-09-09 / 8ae5853 / CODEX_PASSED (동일 Codex 자체 검토, 독립 검수 아님).
[계약](../../rebuild/specs/114-background-preparation-lease-bridge.md).

release 확보 뒤 치수 검사, 단발 takeLease, ready 이전/이후 취소 및 소스 변경을 확인했다.
기존113 task 키는 cancel/release/result 그대로이며 원래 경로는 width getter를 읽지 않는다.
새 경로는 frozen width/height/release만 인계하고 원자원이나 paint 권한은 전달하지 않는다.
100을 실제 import한 합성 연결에서 capture-first, pending 교체 BUSY, ready 교체 자원 반환,
source invalidation, clear/dispose/late 및 callback throw 정리를 검증했다.
port 단독 dispose로 controller 상태가 자동 변경되는 계약은 없다. 최종 소유자가 함께 정리한다.

targeted55=20+22+13, check3290=3255+35, format/lint332·7typecheck·2build PASS.
처음 검증부터 PASS. 구현 검토 중 start 함수 안의 dispose 재진입을 callback 전에 재확인하도록 했다.
보호22/번들3종 SHA 불변·diff--check PASS. native/E2E 및 실제 decoder/사진/기기 메모리는 NOT TESTED.
다음은 실제 decoder 경계 계약 검토. PARTIAL을 제품 사용허가로 자동 승격하지 않는다.
