# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

## 스펙 033 로컬 액자 PNG export 구현

정본 계약 `docs/rebuild/specs/033-local-frame-png-export.md`를 먼저 읽고 허용 파일 안에서만
구현한다. E-1/C-1은 승인된 preview plan을 그대로 detached `HTMLCanvasElement` context에
uniform transform으로 실행하는 방식이다. plan 재빌드·재측정·plan scaling은 금지한다.
E-2 픽셀 위험은 Chromium pixel E2E로 판정하고, E-3 두 해상도 제약 충돌은 파일 생성 전
fail-closed한다.

Founder E-4~E-6 정본 `b0f633c`의 파일명·버튼·안내 문구를 그대로 구현한다. 로컬 PNG 생성과
다운로드만 허용하며 upload/order/IndexedDB order/Kakao/Firebase/network/live/deploy 코드는
만들지 않는다. `packages/render/**`, `packages/shared/**`, `apps/admin/**`,
`apps/mockup/src/canvas/surface.ts`, lockfile·manifest·의존성은 변경하지 않는다.

계약 문서와 상태 전환 문서를 먼저 별도 일반 fast-forward commit/push한 뒤 제품 구현을 별도
commit/push한다. 각 단계에서 HEAD=origin, ahead/behind 0/0과 허용 범위를 확인한다. 알려진 spec018
PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않는다.

구현 후 frozen, format/lint/typecheck, 전체 unit, 독립 build, 전체 Chromium E2E,
`git diff --check`, forbidden diff, dist hash, ports 4183/4184, OS temp를 실행하고 결과와
NOT TESTED를 handoff에 기록한다.

## 확정 경계

- E-1/C-1: 동일 plan + detached canvas + uniform context transform
- E-2: 실제 Chromium pixel E2E 실패 시 `CORRECTION_REQUIRED`
- E-3: `minLongSide`·`maxPixels` 동시 충족 불가 시 파일 0
- E-4: `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`
- E-5: 미리보기 아래 독립 영역, `인쇄용 파일 내려받기`, 고정 사유 + `aria-describedby`
- E-6: `인쇄 설정은 인쇄소 확인 전 임시값입니다.` 상시 표시, 수치 비노출

실제 인쇄물·실기기·대용량 메모리/성능·인쇄소 수용성은 검증 결과에서 `NOT TESTED`로 남긴다.
인쇄소 요구가 확인되기 전 실제 upload/order/deploy는 계속 금지한다.
