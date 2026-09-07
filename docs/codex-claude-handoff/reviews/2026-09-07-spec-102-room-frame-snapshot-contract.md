# spec102 — 독립 frame snapshot 계약 검토

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
