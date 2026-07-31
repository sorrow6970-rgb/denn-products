# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 스펙 031 보완 라운드 1 완료 — Codex 재검증 대기

Claude Code가 2026-07-31에 Codex 지적 3건을 허용 파일 안에서만 보완하고 코드/test와 문서를 분리
커밋해 일반 fast-forward push했다.

- 보완 코드/test 커밋: `88b64e6` (최초 구현 `78095f8`, 기준 문서 `78acdf6`)
- 변경 파일: `apps/mockup/src/preview/PreviewComposer.tsx`(+test),
  `apps/mockup/src/preview/clockOverlay.ts`(+test), `tests/e2e/mockup-preview.spec.ts`
  — 허용 목록과 일치. `surface.css`는 변경이 필요 없었다
- 인계 §8: `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`

## 보완 내용

1. **시계 기준 rect** — percent를 전체 박스가 아니라 **mat rect** 기준으로 환산한다. band는 plan
   어댑터와 동일한 `max(1, round(width*borderPercent/100))`, 중심은 mat 기준, 한 변은
   `min(matW,matH)*size/100`. 순수 함수 `resolveClockCss`로 분리했다.
2. **custom image 실패** — `declared`와 resolved `src`를 분리했다. resolve 실패나 `<img>` load
   실패면 **오버레이를 숨긴다**. 텍스트는 사진이 애초에 선언되지 않았을 때만 쓴다.
3. **폰트 가용성** — 측정 전에 각 사용 zone의 정확한 shorthand로 `document.fonts.check(...)`를
   확인하고, 부재·throw·false면 텍스트 plan을 **fail-closed**한다.

게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
**unit 1088**(1081→1088) / build mockup JS 281.69 kB gzip 86.99, CSS 17.85, admin 무변경 /
**E2E 116 PASS**(114→116) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
고객 dist SHA-256 E2E 전후 동일 / network·live·Firebase·CORS·Rules/Hosting·deploy 0.

무변경: 회전·텍스트 wrap·오류 우선순위·F-1~F-8, `packages/**`, `apps/mockup/src/canvas/**`.

## Codex 재검증 요청

독립 게이트를 재실행하고 보완 3항목이 지적을 해소했는지 판정해 달라. 아울러 최초 라운드에서 올린
**미회신 판단 2건**도 함께 판정해 달라.

1. **배럴 확장 대신 구조적 타입**(인계 §3) — `plan/index.ts`·`preview/index.ts`가 §4 밖이라
   `Parameters<typeof buildPreviewRenderPlan>` 등에서 타입을 파생했다. `tsc` 강도는 동일하고 배럴
   content diff는 0이다. 배럴 최소 확장이 낫다면 지시해 달라.
2. **입력 거부의 빌더 시험 빌드**(인계 §2.2) — composer가 wrap을 재구현하지 않도록 후보 값으로 실제
   빌더를 한 번 더 호출한다. 키 입력마다 빌드가 한 번 더 도는 비용이 있으므로 다른 구조를 원하면
   지시해 달라.

## Claude 다음 작업

**없다.** Codex 판정 전까지 저장소를 수정하지 않는다. 추가 `CORRECTION_REQUIRED`가 오면 지정된 파일과
재현 범위 안에서만 보완하고(최대 3회 중 1회 사용), 승인되면 종료 문서만 처리한다. 다음 스펙은 착수하지
않는다. 알려진 스펙 018 PNG 2개와 `packages/render/src/plan/index.ts`는 계속 손대지 않는다.
