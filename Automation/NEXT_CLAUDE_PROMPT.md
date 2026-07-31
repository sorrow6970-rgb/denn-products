# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 스펙 031 구현 완료 — Codex 독립 검증 대기

Claude Code가 2026-07-31에 스펙 031을 §4 허용 파일 안에서만 구현하고 코드/test와 문서를 분리 커밋해
일반 fast-forward push했다.

- 코드/test 커밋: `78095f8` (기준 계약 `3927420`, 결정 정본 `e3dc2b1`)
- 인계: `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`
- 정본 §DONE: `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`
- 변경 파일 18개 전부 §4 허용 목록 안(신규 `clockOverlay.ts`·`clockOverlay.test.ts` 포함)
- `package.json`·`pnpm-lock.yaml`·신규 의존성 **0**, network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 알려진 스펙 018 PNG 2개는 restore·checkout·stage·commit하지 않았다

## 검증 요약

frozen exit 0 / lockfile·manifest diff 0 / format·lint·typecheck / **unit 1081**(995→1081) /
build mockup JS 280.33 kB gzip 86.52, CSS 17.82/4.30, admin 무변경 / **E2E 114 PASS**(99→114) exit 0 /
`git diff --check` clean / 포트 4183·4184 free / OS temp 0 / 고객 dist SHA-256 E2E 전후 동일·fixture 0.

## Codex 검증 요청

독립 게이트를 재실행하고, 특히 다음 세 가지 설계 판단을 함께 판정해 달라.

1. **★ 허용 파일 준수 방식(인계 §3)** — 배럴 `packages/render/src/plan/index.ts`와
   `packages/shared/src/catalog/preview/index.ts`가 §4 밖이라, **배럴을 넓히지 않고 구조적 타입**
   (`Parameters<typeof buildPreviewRenderPlan>`, `FramePlanInput["textZones"]` 등)으로 새 타입을
   참조했다. `tsc` 검증 강도는 named import와 동일하고 배럴 content diff는 **0**이다. DRY 관점에서
   배럴 최소 확장이 낫다고 판단되면 그렇게 지시해 달라. 그러면 보완한다.
2. **★ 입력 거부를 빌더 시험 빌드로 구현한 것(인계 §2.2)** — 스펙 §2.2의 "wrap 결과가 maxLines를
   넘으면 입력 commit을 거부"를 만족시키기 위해, composer가 wrap을 재구현하는 대신 plan 인자를
   보관했다가 후보 값으로 **실제 빌더를 한 번 더 호출**한다. 키 입력마다 빌드가 한 번 더 도는 비용이
   있으므로, 다른 구조(예: 빌더가 wrap 헬퍼를 노출)를 원하면 지시해 달라.
3. **시계 오버레이의 DOM 구조와 timer 계약** — `pointer-events:none`·`aria-hidden`·percent 위치,
   custom image timer 0, 텍스트는 분 경계 후 60초, 활성 timer ≤1 + generation 가드.

## Claude 다음 작업

**없다.** Codex 판정 전까지 저장소를 수정하지 않는다. `CORRECTION_REQUIRED`가 오면 지정된 파일과 재현
범위 안에서만 보완하고, 승인되면 종료 문서만 처리한다. 다음 스펙은 착수하지 않는다.
알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
