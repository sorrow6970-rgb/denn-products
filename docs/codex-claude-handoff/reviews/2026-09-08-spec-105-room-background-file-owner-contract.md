# Spec105 — bounded file owner 계약 검토

최신 전송2026-09-09: 사용자 정확범위 전송 승인 후77773db/bc1c240 일반push 성공.
HEAD=origin bc1c240·0/0 확인(같은7문서 최종기록 전). CODEX_PASSED 유지, 시험재실행/코드변경0.
최종기록 commit/push 뒤 방향/EXIF 조사 루틴으로 진행. 아래 전송대기는 해소된 이력이다.

## 최신 구현 자체 검토 — 2026-09-09

**CODEX_PASSED / LOCAL_VERIFIED**, 코드77773db. 동일 Codex의 구현 후 재검토이며 독립 에이전트 검증 아님.
targeted83/83, mockup typecheck, check(format/lint319·7프로젝트·unit2924·2앱build), Chromium292/292 PASS.
292=기존281+신규11,2924=기존2841+신규83. E2E56.1초; runtime 결과는105 계약 구현 완료 절에 명시.

검토한 주요 경계: native size-before-read, 동기 검사에서 snapshot까지 외부 실행0, view의 buffer 동일성,
immutable Blob 사본1회, cached Promise/reentrant getter, startup throw와 보류성공, 중첩load, terminal cleanup.
새 browser11개는 decoder/Image/Canvas/URL/egress0; 실제사진·방향·기기안전 증거로 확장하지 않는다.
고객/admin entry·고객CSS SHA 동일. 보호/별도20 SHA동일·PNG2 중 desktop만 canonical 재생성예외,
복원/stage/commit0. 허용5코드/시험 및105문서7 외 새경로0, ports0/temp제거/diff--check PASS.

코드5파일은 로컬커밋77773db.105문서7은 별도 로컬 커밋 대상이며 원격 전송 전 정확범위 승인 필요.
실제서비스/운영/Rules/설치/자동화0. 다음 EXIF/방향·소비자 계약 후보는 아직 미착수.
아래는 계약 작성 당시 검토 이력이다.

2026-09-08 / baseline d063ae1 / CONTRACT_REVIEW_PASSED (동일 Codex 문서 자체 검토).
[계약](../../rebuild/specs/105-room-background-file-owner-contract.md).
독립 에이전트 검수나 구현 PASS가 아니다. 사용자 `착수해줘`의 NEXT 문서 작업만 수행했다.

## 검토 결과

| 항목 | 계약 판단 / 근거 |
|---|---|
| size-before-read | §4: native Blob/File brand·전체 N·필수 maxEdge 검증 후에만 slice/reader 허용; oversize truncation 우회0 |
| 검사/소비 동일성 | §5: fixed non-shared private buffer를104 검사 후 외부 실행 간격 없이 Blob으로 복사; mutable bytes를 결과로 내보내지 않음 |
| 복사 수 | §5: 결과 N + snapshot N = 2N≤40,000,000 bytes; 원본/내부저장/GC/다중job 포함한 실제 peak 보장과 명확히 분리 |
| 취소·재진입 | §6: cached Promise 선설치·startup 이벤트 보류·terminal-first·abort 최대1회·late 결과 무시; 인계된 Blob은 회수 불가 |
| 해제 의미 | take1회·미인계 release·owner 참조 제거만; 즉시 GC/물리 I/O 정착/벽시계 상한 UNCONFIRMED |
| 104 보존 | source import만, parser 변경0; orientation NOT_VERIFIED/decodeAllowed:false 유지 |
| 검증 범위 | §7/8: 합성 unit + 기존 분리 fixture의 native FileReader; 결정적 fake 실패와 native 실측을 분리 |
| 권한 경계 | 후속5코드/시험경로 열거; 이번은7문서만.100/102·decoder·제품 UI·운영·설치0 |

## 설계 대안의 정리

- 원본 File을 검사 뒤 재읽어 넘기는 방식은 채택하지 않는다. 동일 결과를 보존하는 책임이 흐려진다.
- mutable Uint8Array lease를 그대로 주는 방식도 채택하지 않는다. caller mutation 후 과거104 결과만 남을 수 있다.
- 불변 Blob snapshot의 명시 복사 비용을 장부에 포함한다. 이를 zero-copy 최적화로 소개하지 않는다.
- 반복 load owner 대신 단발 job을 정했다. 같은 job 중복run은 같은Promise/읽기1회다.
  새 job들을 계속 생성하는 상위 코드를 제한한 것은 아니므로 실제 연결부 동시 admission은 여전히 STOP이다.

공식 근거는 계약 §3의 W3C File API 2026-08-23 Working Draft(2026-09-08 본문 확인).
§3.1.1/3.2/3.3.1의 Blob, §6.2/6.3/6.4의 FileReader를 확인했다.
draft 지위를 최종 표준으로 과장하지 않으며 브라우저 실행 결과와 혼동하지 않는다.

## 보류 경계

제품 구현·native browser·실제사진·EXIF·decoder·기기 peak·다중 job 제한·100/102 연결 NOT TESTED.
계약을 읽고 구현하는 다음 지시가 오기 전 제품/시험 생성·실행0. Founder 추가 제품 선택 질문은 현재 없다.
권한·예산 기본값·새 형식 또는 허용 경로 확장이 필요하면 STOP한다.

## 이번 문서 검증

로컬 읽기 전용 검사 실측:

- 신규3문서 전체 및 상태4문서의 이번 추가분 로컬 링크 **16/16** 경로 존재 확인.
- 허용 변경 **7/7**, 시작 보호/별도dirty SHA-256 **22/22** 일치; 총dirty **29=22+7**, 추가 경로0.
- `git diff --check` PASS, 신규3문서 trailing whitespace0, staged0.
- HEAD=origin **로컬 추적ref** d063ae1, ahead/behind0/0. fetch하지 않아 원격 최신성 재조회는 하지 않았다.
- apps/packages/tests/Rules/config/manifest/lock의 이번 추가 변경0. pnpm-workspace.yaml의 기존3줄 및
  render/plan의 기존 상태는 그대로 남아 있으므로 전체 working tree를 clean 또는 무조건 forbidden diff0이라 부르지 않는다.
- 제품/시험/browser/빌드/PNG 재생성0, stage/commit/push/fetch0. Git 전역 ignore 접근 경고와 LF→CRLF 안내는
  설정 변경 없이 보존했다. 이전104 테스트 수를105 PASS로 쓰지 않는다.

추가 자체 검토에서 startup factory 반환 중 취소·cancel-before-run의 cached Promise·handler 재진입 cleanup을
§6에 명시해 읽기 재시작 여지를 없앴다. 구현이나 실제 브라우저 안전성 검증을 수행한 것은 아니다.
