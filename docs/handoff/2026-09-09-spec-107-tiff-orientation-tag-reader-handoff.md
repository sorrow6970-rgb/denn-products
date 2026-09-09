# Spec107 — TIFF 방향 태그 reader 인수인계

2026-09-09 / baseline1a35951 / DONE / CODEX_PASSED(동일 Codex 자체 검토).

- [계약](../rebuild/specs/107-tiff-orientation-tag-reader.md)
- [검증·실패 보완 근거](../codex-claude-handoff/reviews/2026-09-09-spec-107-tiff-orientation-tag-reader-review.md)
- [106 공식 출처](../codex-claude-handoff/reviews/2026-09-09-spec-106-room-background-orientation-investigation.md)

신규 background-orientation.ts/test.ts2개만 구현.0th IFD tag reader, 성공도PARTIAL/decodeAllowed:false.
targeted101/101,unit3025=2924+101,format/lint/typecheck/두앱build PASS.
고객JS/CSS·adminJS SHA baseline일치,제품연결0. 기존 PNG포함보호dirty22 유지.
E2E/브라우저/실제사진/전체metadata·픽셀방향·decoder/룸UI 검증0. 이번 신규독립검수0.
제품2+문서7만 일반commit/push 대상.1061a35951은 이미push완료.
코드aa7ed09.문서링크7/7·범위9/9·보호dirty SHA22/22·diff--check PASS,관련포트listener0.

다음은 container의 profile 식별·중복/미확인 경계 조사·계약이다. 기존104/105 변경이나decode 허가로 건너뛰지 않는다.
중요 선택/권한/충돌 외 scoped 루틴 계속 승인 유지. 예약자동화/운영/설치/발행/삭제0.
진행: byte사전검사·파일소유권·방향tagreader 완료. 사진의 실제회전검증·decode·룸UI통합은 아직 남는다.
전체 리빌드 실측완료율은 전체업무량 분모가 없어 확인할 수 없다.
