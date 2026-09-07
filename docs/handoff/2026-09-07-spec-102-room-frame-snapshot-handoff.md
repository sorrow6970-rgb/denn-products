# spec102 — 독립 frame snapshot 계약 인수인계

## 구현 완료 — 2026-09-07

DONE / CODEX_PASSED / LOCAL_VERIFIED. 코드 `37c581e`, 동일 Codex 구현·자체 검토(독립 검수 아님).
Q-102-1 사용자 승인 후 정확4파일 구현. 기본 제품 route/100/Composer/owner/print 수정0.

- targeted room-placement 200/200 = 기존114 + 신규86.
- `node scripts/check.mjs` PASS: format/lint/7개 프로젝트 typecheck/unit2745/2745/build.
- 최종 `node scripts/e2e-run.mjs` canonical281/281(50.3초) = 기존271 + 신규10. 이전 실행도281/281(50.8초).
- 합성 Chromium 정수/비정수 scale, clip/회전/확정 text: 독립 두 단계 기준 대비 RGBA 차이0;
  borrowed 원본을 변경해도 사본 픽셀 차이0. 별도 source 교체/release/dispose는 copy0, cleanup1.
- 초기 테스트의 Number.MIN_VALUE 거부 기대값은 잘못된 계약 해석이어서 정정했고 유효성 시험을 추가했다.
  테스트 lint2건도 해당 파일에서 보완. 최종 자체검토로 함수의 custom bind/call을 읽지 않고
  Reflect.apply로 receiver를 유지하도록 고정. 실패 은닉/timeout/retry/worker/tolerance 완화0.
- 양앱 entry와 고객 CSS SHA-256 불변:
  customer `FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`;
  admin `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`;
  customer CSS `6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81`.
- baseline105 중 최종104 동일; 기존 canonical 예외 spec018 PNG2 재생성, 최종 desktop은 시작 SHA 동일,
  mobile은 `1103D366D28B33D07411CB34942FFBDC32E8C82F44AC00324BAAD1C4EAB84374`.
  두 PNG 모두 복원/stage/commit0. 나머지 보호/별도dirty20 SHA동일, 전체 별도dirty22 전송제외.
- 포트4183/4184/4185/8080/9099/9199 listener0; 이번 temp staging 두 곳 제거 확인; diff--check PASS.

신규 테스트의 외부 egress/console error·warning0은 합성 픽셀 시나리오에서 측정했다.
실제 사진/배경 decoder/source producer/두 자원 합성/룸 UI/실기기/메모리회수/CORS는 NOT TESTED.
운영/Firebase/UID/배포/발행/삭제/설치/예약 자동화0. 이번 고객 화면 변화0, 전체실측완료율 확인불가.
다음은 배경 입력 정책·decode 전 예산 경계의 문서 조사. 새 계약 전 제품 확장0, 새 제품 선택이면 STOP.
아래 계약만 완료/미구현/중단 기록은 해당 시점의 이력이다.

## 최신 재개 — WORKING / Q-102-1 APPROVED

사용자 `응 자동진행 재개해줘`로 Q-102-1 정정 승인. §6/§7 일치 확인 후 코드4+문서7 구현·검증 중.
live copyTo/BUSY, release/RELEASED, dispose/DISPOSED. 아래 중단은 해소된 이력이다.

## 최신 상태 — CORRECTION_REQUIRED / Q-102-1 대기

2026-09-07. 시작HEAD=origin6c0e0ac·0/0. 최신 사용자 승인: 막힘·새 결정·권한 변경 없는 경우
스펙 간 계약→구현→검증을 이어간다. 예약 자동화 생성/운영/보호파일 예외를 승인한 것은 아니다.
착수 전 계약 §6(release 중 paint BUSY)와 §7(released 우선) 모순을 발견해 구현 중단했다.
제안은 live copyTo 중 BUSY, release 뒤 RELEASED, dispose 뒤 DISPOSED. 사용자 확인 전 미채택.
Q-102-1 확인 후 계약 정정·재검토부터 자동 루틴 재개. 코드/시험실행0, 이번7문서 미커밋·stage/push0.
아래 READY_FOR_IMPLEMENTATION은 모순 발견 전 이력이다. 전체 진행률 변화0.

전송확인2026-09-07:계약7문서e130764 정상push2dcf7b4..e130764,HEAD=origin e130764·0/0.
링크15/15·dirty22/22 SHA동일·diff--check PASS. STATE/NEXT/CURRENT/live/이handoff 영수증5문서만 추가.
아래전송계획완료,보호/별도작업 제외. 제품/시험0 유지. 최종영수증 HEAD는 Git으로 확인한다.

2026-09-07. 기준2dcf7b4. CONTRACT_REVIEW_PASSED / READY_FOR_IMPLEMENTATION.
[계약](../rebuild/specs/102-room-frame-snapshot-contract.md),
[검토](../codex-claude-handoff/reviews/2026-09-07-spec-102-room-frame-snapshot-contract.md).
동일 Codex 문서검토이며 제품구현/시험 통과 아님. 사용자 `응 진행해줘`로101 NEXT의 계약 차례만 수행했다.

확정 final plan의 동기 capture·필수 scale/예산·ceil backing/crop·private surface/release/paint,
한 capturer당 lease1·BUSY/재진입/부분실패·trusted target 한계와 합성 Canvas 검증을 계약화했다.
후속 코드/시험4파일: frame-snapshot.ts/test.ts 신규2, canvas-fixture.tsx 제한 분기1,
room-frame-snapshot.spec.ts 신규1. 기존100/Composer/owner/print/packages/config/UI는 변경하지 않는다.
명시 구현 착수 전 코드생성·브라우저 실행0. 실제 배경형식/예산 기본값/source producer/룸 UI는 여전히 미확정/NOT TESTED.

active spec-102-room-frame-snapshot / completed spec101문서DONE·100제품DONE 유지 /
next CODEX_SPEC_102_IMPLEMENT_AND_VERIFY. 정확 구현 지시는 NEXT. 새Founder질문 없음.
이번 문서7개만 일반commit/push, 보호/별도dirty22 제외. 제품/test/build/E2E/Canvas 실행0.
실제Firebase/UID/운영/배포/발행/삭제/설치/자동화0. 전체실측진행률 확인불가·화면변화0.

문서검증: 링크/지정라인15/15·시작dirty22/22 SHA동일·diff--check PASS. 정확7문서외새변경0.
신규제품/시험3경로 부재·기존fixture 미변경. 배율예시 산술확인, unit/브라우저 결과를 주장하지 않는다.
