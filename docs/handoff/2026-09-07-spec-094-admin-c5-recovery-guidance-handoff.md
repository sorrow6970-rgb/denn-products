# Spec094 — C5 복구 안내 handoff

2026-09-07. DONE / CODEX_PASSED / LOCAL_VERIFIED (동일 Codex 검토, 독립 아님).
[계약](../rebuild/specs/094-admin-c5-recovery-guidance.md),
[검수](../codex-claude-handoff/reviews/2026-09-07-spec-094-admin-c5-recovery-guidance.md).

기준 HEAD=origina80cd9c·0/0. 이전0931e322c1/cfb1a32와승인기록a80cd9c 정상전송확인 후094진행.
제품의 실패 안내만 현재 버튼권한에 맞춰 분리. 코드/증거11파일 `38257ef`, 종료9문서 `5a1abe6`.
정상push a80cd9c..5a1abe6 성공,HEAD=origin5a1abe6·0/0확인.이전전송예정은해소됐다.
이전송영수증5문서는별도커밋하며최종HEAD는Git기록으로확인한다.
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

## 다음 경계 초기 대조 — 코드 수정 없이 확인

[레거시 §2/7](../rebuild/00-legacy-analysis.md), [현재 고객 App](../../apps/mockup/src/App.tsx),
[현재 운영자 App](../../apps/admin/src/App.tsx), [033 계약](../rebuild/specs/033-local-frame-png-export.md)를 읽었다.
기존 미커밋 로드맵 보고서는 참고만 했고 수정/stage하지 않았다. 다음은 전수 parity 감사가 아닌 초기 범위 확인이다.

| 잔여 영역 | 현재 확인 | 다음 구현 전 필요한 구분 |
|---|---|---|
| 룸 목업/사이즈 가이드 | 레거시 §2에는 기능 명시, 현재 App 진입점은 catalog/space이며 해당 전용 진입 미확인 | 현재 render/schema/미지원 계약을 먼저 대조; 기존 시안/보호plan 변경을 자동 허용하지 않음 |
| 주문·카카오 | 033은 로컬 PNG만 포함하고 업로드/주문/카카오를 명시 제외 | 로컬 구성과 실제 전송·개인정보 계약을 분리; 주문 개방 승인 아님 |
| 전체 catalog authoring | 현재 admin은 준비·로컬치수·read/auth·gate 뒤 치수/V2발급 표면 | 모델/템플릿/zone/폰트/브랜드 관리 전부의 완료 근거 없음; 필드별 후속 범위 필요 |
| 발행/운영전환 | 로컬 검증과 실제 운영 활성화는 다름 | 기존 F-B·운영보류·UID/비용 정책을 유지; 배포/발행 구현으로 확장 금지 |

소스 검색: 양 앱 src에서 test/e2e를 제외하고 RoomMockup/SizeGuide/requestFullscreen/sendKakao/
DENNOrder/kakaoUrl/ZoneEditor 이름의 제품 진입을 확인하지 못했다. 이름 검색만으로 모든 대체 구현이
없다고 단정하지 않는다. `publish` 검색에는 단순 observer 갱신 함수도 있어 발행 구현 증거로 세지 않았다.
rebuild/README의 '스펙007·스캐폴드미시작'은 과거 요약이므로 현재 상태 근거로 사용하지 않는다.
새 첫 출시 제외 범위나 우선순위를 승인받은 것으로 기록하지 않는다. 상세 계약 대조까지 문서/읽기 전용으로
진행할 수 있으나 제품 구현은 다음 스펙과 결정 경계를 확인한 뒤에만 시작한다.
