# Spec104 — 룸 배경 사전 검사 계약 검토

최신2026-09-08: 코드420b2dc 구현·자체 검토 CODEX_PASSED/LOCAL_VERIFIED.
96 targeted·2841 unit·281 Chromium(52.2초) PASS. 코드6파일/문서11파일만 범위.
최종 양앱entry/고객CSS 시작 SHA동일, 보호/별도20 SHA동일·PNG2는 기존 재생성 예외/커밋제외.
typed-array intrinsic brand/경계·단방향 구조검사·고정 오류·성공이 decode 허가가 아님을 소스와 시험에서 대조했다.
독립 에이전트 검수는 아니다. 전체파일/EXIF/decoder/기기 안전성은 여전히 NOT TESTED.
실제 실행/중간실패·보완/도구버전/잔류 검증은104 계약 DONE이 정본이다. 아래는 계약 검토 당시 이력.

2026-09-08 / cc0bc4c. CONTRACT_REVIEW_PASSED — 동일 Codex 작성·자체 검토, 독립 검수 아님.
[계약](../../rebuild/specs/104-room-background-input-preflight-contract.md),
[Founder RG-3=A](../decisions/2026-09-08-rg3-room-background-input-policy-decisions.md).
이 판정은 아래 한정된 순수 검사기 계약의 일관성 검토다. 실제 로딩/표시 계약 통과가 아니다.

## 검토 결과

| 검토 항목 | 판정 / 계약 근거 |
|---|---|
| RG-3 정책 보존 | §5: decimal20,000,000 bytes·40,000,000 pixels 이하, 자동변환/초과원본축소0 |
| 거짓 MIME·기존검사 과신 | §4~7: bytes만 검사, admin/026 재사용0, envelope 이후 압축 의미 미검증 공개 |
| static/전체파일 단정 방지 | PNG animation 신호 거부와 JPEG profile 구분; 성공은 preflight-only/decodeAllowed:false |
| 읽기 전 예산이라는 잘못된 주장 방지 | §1/9: 이미 받은 bytes 검사다. File size-before-read·동일 byte owner는 별도 |
| 방향 미확인 은폐 방지 | CIPA 목록만 확인/본문 미취득. orientation NOT_VERIFIED 고정, 태그 파싱/회전/방향1추정0 |
| 탐색/할당 경계 | §4/5: view 내부·fixed buffer·외부 callback0·복사/유지0, 단방향20Mbytes·4096구조 |
| 입력 변·동시 메모리 | maxEdge 필수/기본값0. 실제 값/decoder peak는 미확정. 이 모듈 decode0 |
| 실패 계약 | §8: 고정 오류·우선순위·safe record, raw input/log0. 성공을 제품 ready로 변환0 |
| 시험과 범위 | 신규 코드/시험6파일만 후속 허용, 현재 문서11개. 실제 실행 결과와 설계 시험목록 분리 |
| 보호/운영 경계 | 기존 모듈/설정/Rules 변경0. 사진/서비스/배포/설치/자동화0 |

## 이번에 의도적으로 열지 않은 것

bounded file reader, EXIF 실제 parser, decoded orientation, mutable bytes와 후속 decode의 동일성,
취소/늦은완료/물리 decode 동시성, 화면 backing/장치별 메모리,100/102 연결은 NOT IMPLEMENTED/NOT TESTED.
특히 RG-3의 검증 불가 거부는 '사전 검사 통과면 표시'로 바뀌지 않는다.
PNG CRC/ancillary와 JPEG table/entropy의 검사범위를 분리했으므로 전체 형식 validator라고 부르지 않는다.
실제 사진 지원 개방 전에는104 결과 외에도 이 경계들의 후속 계약과 검증이 필요하다.

이번 계약 검토에서 임의 EXIF 구현 대신 미검증 상태를 노출하고, maxEdge에 제품 기본값을 만들지 않았다.
이 범위 제한은 신규 제품 선택이 아니라103의 '순수 preflight부터' 제안을 구체화한 것이다.
RG-3는 해소, 이104 범위에 추가 Founder 질문 없음. 구현은 사용자 다음 착수 지시 후 정확6파일로 한정한다.

## 문서 검증 영수증

문서 링크/허용11경로/보호·별도dirty22 SHA/Git/diff 검사를 수행한 결과는 하단에 기록한다.
unit/typecheck/check/build/E2E/browser/emulator 실행0. 과거102 결과를104 실적으로 기재하지 않는다.

문서 검증 실측: 대상7문서의 로컬 링크/지정라인43/43, 누적 허용11문서만 변경, 시작dirty22/22 SHA256 동일. git diff --check 및 신규문서 whitespace PASS. HEAD=origin 추적cc0bc4c·ahead/behind0/0, staged0, commit/push/fetch0. Git 전역 ignore 경로 접근 경고는 있었으며 설정 우회/변경0. 제품/시험/브라우저 실행0.
