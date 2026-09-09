# Spec106 — 배경 방향 조사 인수인계

2026-09-09 / baseline5a4341b / 조사 DONE, DOCUMENT_REVIEW_PASSED(동일 Codex 자체 검토).
후속 parser 계약 READY / SPEC107_BOUNDED_ORIENTATION_PARSER_CONTRACT.

최신: 사용자 `응 승인 다음진행`으로 CIPA 동의 승인. Exif3.1 정본4,451,181bytes/267쪽 확보,
필요한 IFD/Orientation/APP1절과 방향표·그림 확인. SHA/페이지는106 review 최신 섹션.
규격 default1 확인과 모든 미확인 파일 허용을 구분한다. 아래 미취득/권한 STOP은 승인 전 이력이다.
제품/test/config변경·시험실행0. 문서7개만 일반 commit/push 후107 parser-only 계약으로 진행한다.

- [106 조사 스펙](../rebuild/specs/106-room-background-orientation-investigation.md)
- [근거·후속 시험표](../codex-claude-handoff/reviews/2026-09-09-spec-106-room-background-orientation-investigation.md)
- [RG-3 승인](../codex-claude-handoff/decisions/2026-09-08-rg3-room-background-input-policy-decisions.md)

105는77773db 구현,bc1c240 문서,5a4341b 최종기록 push 완료다. 그 검증은83/2924/292이며106 재시험이 아니다.
106은 공식 공개 CIPA목록/다운로드안내·W3C PNG·WHATWG HTML·Adobe namespace 및 로컬코드를 읽었다.
Exif3.1 본문은 면책조건 동의 필요로 취득하지 않았다. 수락/우회0.
PNG eXIf는 오래된 정보일 수 있다. parser 성공과 픽셀에 대한 의미 증명을 구분한다.
기존 EXIF E2E는 회전 적용/무시를 둘다 허용해8방향 증거가 아니다.

후속: 사용자 조건 동의 권한 또는 적법하게 제공한 본문 확인 후 parser-only 계약부터 작성한다.
strict/native 단일처리·P1/P2 소유권은 아직 후보, 구현/브라우저 NOT TESTED.
현재 decodeAllowed:false·orientation NOT_VERIFIED, 검증 불가 거부 유지. UI/실제사진/운영은 열지 않는다.

문서7개만 신규/수정, 보호/별도dirty22 유지. 접근조건 STOP 때문에 stage/commit/push0.
최종 검증: 로컬 링크12/12, 허용문서7/7, 보호/별도dirty SHA22/22 동일, 예상 밖 경로0.
총dirty29=문서7+기존22. git diff--check/신규3문서 whitespace PASS, staged0.
HEAD=origin 로컬추적5a4341b·ahead/behind0/0, 이번 fetch/push0. 제품/test/config 추가변경·실행0, 예약자동화0.
Git global ignore 접근경고는 설정변경 없이 기록했고, 기존 user dirty를 검사 실패로 오인하거나 지우지 않았다.
진행: 안전한 파일읽기·불변 인계까지 완료, 방향·decode·룸 UI 연결은 남음. 전체 작업량 분모가 없어 실측완료율 확인불가.
