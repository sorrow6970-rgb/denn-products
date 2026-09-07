# spec102 — 독립 frame snapshot 계약 검토

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

## 최신 재개 검토 — CONTRACT_REVIEW_PASSED / WORKING

사용자 `응 자동진행 재개해줘`로 Q-102-1 승인. §6/§7을 live copyTo/BUSY,
release cleanup/RELEASED, dispose/DISPOSED로 일치시켰다. 추가 copyTo0을 시험에 고정한다.
동일 Codex 정정 재검토, 아래 중단은 해소된 이력. 코드4+문서7 구현·검증 중이며 제품 PASS는 아직 아니다.

## 최신 착수 전 검토 — CORRECTION_REQUIRED

2026-09-07, HEAD6c0e0ac. 동일 Codex 재검토에서 계약 §6/§7의 release 중 paint 오류 모순 발견.
제가 앞선 계약 검토에서 놓친 항목이다. live를 먼저 닫는 release의 callback에서는 §7상 RELEASED이지만
§6 문장은 BUSY를 요구한다. 제품 결함을 실행 재현한 것이 아니며 구현/시험작성·실행0.
Q-102-1 제안: live copyTo 재진입 BUSY, release 이후 RELEASED, dispose 이후 DISPOSED.
사용자 확인 전 미채택. 기존 CONTRACT_REVIEW_PASSED는 아래 과거 기록이며 현재 착수 가능 상태가 아니다.
상태 문서7개만 동기화, stage/commit/push0. 확인 후 계약 정정·검토부터 재개한다.

2026-09-07. 기준2dcf7b4. CONTRACT_REVIEW_PASSED / IMPLEMENTATION_NOT_STARTED.
[정본 계약](../../rebuild/specs/102-room-frame-snapshot-contract.md).
동일 Codex 문서검토, 독립검수·제품 CODEX_PASSED 아님.

## 고정한 구조 결정

| 101의 열린 지점 | 102 계약 |
|---|---|
| 독립 snapshot의 의미 | 같은 final plan을 private surface에 동기 실행. borrowed owner 해제0, 원본변경 후 픽셀 독립성은 합성 Chromium으로 검증 |
| mutable surface 공개 위험 | lease는 논리크기/release/paint만. trusted copyTo/native target이 private canvas를 다루며 악의적 target에 대한 sandbox를 주장하지 않음 |
| backing/aspect | 필수 scale·maxEdge/maxPixels, ceil backing과 fractional content crop 구분. 인쇄/기기 기본값0 |
| 할당 한도 | capturer당 진행1 또는 live lease1. release 전에 다시capture하면 BUSY, 이전자원 자동폐기0 |
| 부분 실패/재진입 | capture 예약 선점, release capability 선취득, dispose 우선, 실패 출력 미공개, cleanup 최대1회 |
| 실제 source 증명 | 신뢰된 producer/final plan 전제. proof flag만으로 실제 catalog 증명이라고 주장하지 않음 |
| 브라우저 게이트 | 기존 fixture 파일의 전용 query 분기만, 새 E2E1개. product route/config/HTML/runner 변경0 |
| 비정수 픽셀 비교 | helper를 쓰지 않은 동일 scale/crop의 두 단계 reference와 RGBA 비교. 단일 direct draw와 재샘플 차이를 혼동하지 않음 |

근거:
[100 상태 전용 표면](../../../apps/mockup/src/room-placement/preparation.ts#L20),
[현재 final plan](../../../apps/mockup/src/preview/PreviewComposer.tsx#L616),
[같은 executor seam](../../../apps/mockup/src/canvas/executePreviewPlan.ts),
[별도 fixture build](../../../apps/mockup/vite.e2e-fixture.config.ts),
[기존 fixture](../../../apps/mockup/src/e2e/canvas-fixture.tsx),
[canonical runner](../../../scripts/e2e-run.mjs).
103이나 배경로더 계약을 선행하지 않는다. 실제 UI와102 capture의 결합은 별도 계약이다.

## 검토한 실패 순서

- createSurface가 dispose에 재진입한 뒤 반환 → 확보한 cleanup은 시도, lease 공개0.
- transform/executor/copyTo 중 source 교체 → 이후 성공금지, 캡처/대상 부분픽셀을 성공으로 공개하지 않음.
- live lease 중 두번째 capture → BUSY, 기존 lease 해제0.
- release callback 중 중복 paint/capture → 해제된 사용권 복구0, 옛 cleanup이 새 lease를 파괴하지 않음.
- budget 없음/초과/곱 overflow → createSurface0. fake 수치는 실제 사용자 예산 승인 아님.
- paint에서 source 변경 후 copyTo가 이미 픽셀을 썼다면 rollback 보증0, 실패 destination 폐기는 caller 책임.
- 원본변경 후 사본 독립성 시험은 token을 유지하는 합성 진단. 실제 producer는 token을 바꾸고 사용을 차단해야 함.

## 범위·검증 상태

이번 문서7개만 작성. 후속 구현은 신규 frame-snapshot.ts/test.ts, 기존 canvas-fixture.tsx의 제한 분기,
신규 room-frame-snapshot.spec.ts 정확4파일로 고정했다. 명시 구현 착수 전 생성/수정/실행0.
targeted/check/canonical/브라우저 검증은 NOT RUN. 테스트 수/성공률을 미리 기입하지 않는다.
실제룸UI/source producer/배경사진/메모리/실기기/CORS는 NOT TESTED.
문서검증 후 일반commit/push, 보호/별도dirty22 보존. 추가Founder질문 없음, 정확 구현지시NEXT.
전체실측진행률 확인불가·이번화면변화0. 100제품DONE·101문서DONE 유지,102제품DONE 아님.

문서 검증: 링크/지정라인15/15 PASS, 시작dirty22/22 SHA동일, diff--check PASS, 정확7문서외새변경0.
신규제품/시험3경로 부재, 기존fixture 미변경 확인. 예시100.5×1.25/80.25×1.25와ceil 산술 일치.
제품/시험/build/browser를 실행한 결과는 아니다.
