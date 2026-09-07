# Spec094 — C5 복구 안내 handoff

2026-09-07. DONE / CODEX_PASSED / LOCAL_VERIFIED (동일 Codex 검토, 독립 아님).
[계약](../rebuild/specs/094-admin-c5-recovery-guidance.md),
[검수](../codex-claude-handoff/reviews/2026-09-07-spec-094-admin-c5-recovery-guidance.md).

기준 HEAD=origina80cd9c·0/0. 이전0931e322c1/cfb1a32와승인기록a80cd9c 정상전송확인 후094진행.
제품의 실패 안내만 현재 버튼권한에 맞춰 분리. 코드/증거11파일 `38257ef`, 종료9문서는별도커밋·push예정.
제품1+신규SSRtest1(9건)+기존E2E문구2개1파일+6PNG/JSON/README8=11.

- check format/lint/typecheck/unit/build PASS, 단위2526/2526(2517+9),95파일.
- canonical1회267 tests·exit0/last-run passed. 출력절단후앱의명령기록으로exit0/전체56.626초확인.
  순수E2E시간/말미상세집계확인불가를명시하며재실행0. 변경6PNG직접검수·F-9해소.
- 측정18건PASS, 활성12/비활성78, overflow/axe중대/console/외부시도0, PNG SHA불일치0.
- 고객entry SHA2E70F01B…2B2B28E 불변, 운영자entry B0A1F85F…85711246. 전체hash는검수참조.
- 기존100hash중90동일;허용증거8+canonical예외spec018PNG2변경. 보호복원/stage/commit0.
  ports6개잔류0·이번staging부재,diff--checkPASS. Rules/config/port/controller/fixture/package수정0.

보호/user dirty 및별도roadmap/spec091handoff2를제외한다. 실제Firebase/UID/운영/배포/자동화0.
전체85~88%는기존관리추정유지,잔여100-88=12~100-85=15%.실측률/최종스펙수확인불가.
다음은NEXT의잔여기능/기존승인읽기전용대조.새출시범위나권한선택필요시질문하고제품구현은멈춘다.
