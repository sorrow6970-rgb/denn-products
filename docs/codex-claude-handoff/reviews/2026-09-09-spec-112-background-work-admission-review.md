# Spec112 — 단일 작업 예약 자체검토

2026-09-09 / code b779c1a / CODEX_PASSED(동일 Codex 자체검토).
[계약](../../rebuild/specs/112-background-work-admission.md).

취소후에도실제settle통지전pending을유지한다.유효자원은held로보유하고release가끝나기전새begin은BUSY다.
해제throw/무효자원/getter실패는blocked로잠가미확인자원을두고새작업을열지않는다.
동일object중복은현재자원을조기해제하지않으며다른late자원만한번정리한다.
정리중재진입과idle상태의late전달에도settling카운터로새할당을막는다.
WeakSet과identity예약은동일객체만추적한다.다른wrapper로같은자원을숨기는악성port를탐지하지는않는다.

실측:targeted23,전체unit3235=3212+23,format/lint328·7프로젝트typecheck·2앱build PASS.
초기20unitPASS뒤타입검사TS7006을unknown으로고쳤다. 추가3건으로late예약/revokedProxy/해제불명차단을고정했다.
전체gate재통과. 사용자문자열/원문오류/이미지/bytes/권한반환0,기본import/생성I/O0는source구조로확인.
customerJS FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
customerCSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
adminJS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 기존동일.
보호22SHA불변,diff--check PASS. 이번E2E/native실행0·PNG출력0.

한instance의신뢰된port계약이다.복수instance전체상한/실제메모리/GC/타이머/Promise자동중단이아니다.
실제decoderport는정착시점에만settle해야한다.임의settle호출로물리완료를증명할수는없다.
제품decode허가·실제사진·UI·운영은계속미연결이다.
