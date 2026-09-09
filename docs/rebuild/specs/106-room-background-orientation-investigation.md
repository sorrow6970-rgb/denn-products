# 106 — 룸 배경 방향·불변 Blob 소비자 경계 조사

2026-09-09 / baseline5a4341b / 조사 DONE / DOCUMENT_REVIEW_PASSED(동일 Codex) / 문서 전용.
후속 parser 계약 READY: 사용자 CIPA 동의 승인 후 Exif3.1 필요한 본문·방향 표 확인 완료.
사용자 `응 큰 문제없다면 별도 승인없이 모든스팩 진행해`에 따른 다음 scoped 루틴이다.

## 목표 (WHY)

104의 encoded 치수와105의 불변 byte 인계 이후, 사진의 회전·반전·표시 치수를 무엇으로 검증할지 조사한다.
이미지 사용 허가나 실제사진/기기안전 승인이 아니다.105의 decodeAllowed:false·orientation NOT_VERIFIED 유지.

## 범위 (SCOPE)

포함: 공식 공개 문서만 읽고 JPEG APP1/Exif·PNG eXIf·TIFF Orientation·browser 이미지 방향 처리의
근거/한계, 1~8 회전/반전, 누락/중복/불량/offset·크기 경계, 단일 방향 처리 주체와 byte 인계 후보를 비교한다.
원본/encoded와 display 치수를 구분하고104/105/100/102의 변경 필요 여부를 표시한다.
후속 최소 구현 후보·합성 시험 요구와 아직 필요한 Founder 선택/권한을 분리한다.

제외: 제품/test/config/Rules/package/lock 변경, parser/decoder/UI 구현, 실제사진·파일·URL·운영 서비스,
새 의존성/설치/다운로드 도구·emulator·배포·발행·삭제·예약자동화. 공식 문서의 공개 열람만 허용한다.
이용조건 수락/접근 제한을 요구하면 임의 수락·우회하지 않고, 취득하지 못한 본문은 미확인으로 기록한다.

## 대상 (WHERE)

문서7개만: 이106 조사스펙, `docs/codex-claude-handoff/reviews/2026-09-09-spec-106-room-background-orientation-investigation.md`,
`docs/handoff/2026-09-09-spec-106-room-background-orientation-handoff.md`, STATE/NEXT/CURRENT/live.
보호/별도dirty22는 수정·복원·stage·commit0.105 및 이전스펙 코드/계약은 읽기만 한다.

## 조사 지시 (WHAT / HOW)

1. 103/104/105와 RG-3,100/102 관련 경계를 대조한다.
2. CIPA·W3C/WHATWG·Adobe 등 문서 발행 주체의 공개 정본을 확인한다. 검색 요약/블로그는 근거로 쓰지 않는다.
3. 문서 제목·버전/지위·URL·확인일·실제로 읽은 결론과 UNCONFIRMED를 결과에 기록한다.
4. strict metadata parser / native from-image / 무검증 회전 추측을 비교하되 미확인 동작을 채택하지 않는다.
5. 통과·실패·누락·중복·취소·늦은완료·동일 byte 인계의 후속 검증표를 작성한다.
6. 근거가 부족하면 쓰기/제품 구현을 열지 않고 정확한 막힘과 필요한 선택만 보고한다.

## 검증 (VERIFY)

문서 로컬 링크/수치·판정 일관성, git diff--check, 허용7경로, 시작dirty22 hash 불변, staged/Git 관계를 확인한다.
제품 unit/build/E2E 실행0, 기존105의83/2924/292를 이번 시험 결과로 쓰지 않는다.
문서 자체 검토와 실제 parser/browser/사진 검증을 분리한다. DONE은 조사 결과와 상태 문서 동기화 후다.

## 위험 (RISK)

기존 EXIF E2E는 회전 전/후 치수를 모두 허용하므로 방향 일관성 증거가 아니다.
전체 TIFF/Exif 지원이나 metadata 부재의 의미를 추측하면 이중 회전·치수 예산 불일치가 생길 수 있다.
CIPA 최신 문서의 취득 제한, browser 명세와 구현 차이, 다중job/decoder메모리/100연결은 별도 미검증 경계다.

### QUESTIONS

사용자 `응 승인 다음진행`으로 CIPA 동의 승인 및 정본 취득 완료. 같은 권한을 다시 묻지 않는다.
정본 SHA·페이지/절·8방향 표 확인·browser 폼의 빈 식별자 복구 근거는 review 최신 섹션.
PNG 미확인 방향은 기존 RG-3 거부 유지, 허용 확대 승인으로 해석하지 않는다.

### DONE (Codex)

[조사 결과](../../codex-claude-handoff/reviews/2026-09-09-spec-106-room-background-orientation-investigation.md)와
[인수인계](../../handoff/2026-09-09-spec-106-room-background-orientation-handoff.md) 작성.
공개 공식 근거·8방향 수학 후보·byte identity/복사 장부·실패표·후속 최소 범위를 분리했다.
이전 후속 권한 BLOCKED는 해소됐다. 제품 구현/시험 실행0, 문서7개만 검증·일반 commit/push 대상.
