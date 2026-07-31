# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

# 스펙 030 구현 완료 — Codex 독립 검증 대기

Claude Code가 2026-07-31에 스펙 030을 §4 허용 파일 안에서만 구현하고 코드/test와 문서를 분리 커밋해
일반 fast-forward push했다.

- 코드/test 커밋: `fbbadeb` (기준 계약 `2777010`, 결정 정본 `cf1cfd2`)
- 인계: `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`
- 정본 §DONE: `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
- 변경 파일 13개 전부 §4 허용 목록 안. `surface.css`와 `previewContracts.test.ts`는 변경 불필요로 무변경
- 제품 코드 외 `package.json`·`pnpm-lock.yaml`·신규 의존성 **0**, network·live·Firebase·CORS·
  Rules/Hosting·deploy **0**
- 알려진 스펙 018 PNG 2개는 restore·checkout·stage·commit하지 않았다

## Codex 검증 요청

독립 게이트(frozen install, lockfile diff, format, lint, typecheck, unit, build, 전체 E2E,
`git diff --check`, 포트·temp·잔류 프로세스, dist SHA)를 재실행하고 다음 두 가지를 함께 판정해 달라.

1. **executor 포트 판단(인계 §3.2)** — `apps/mockup/src/canvas/types.ts`에 `translate`/`rotate`가 없고
   §4 허용 목록 밖이라, 허용 파일을 임의 확장하는 대신 **executor 내부 런타임 검사 + 회전 command가
   있을 때만 요구 + 없으면 preflight `INVALID_EXECUTOR_INPUT` fail-closed**로 구현했다.
   공개 포트 타입이 실제 요구를 전부 기술하지 못하는 트레이드오프가 있으므로, `types.ts`를 허용
   목록에 추가해 선택적 멤버로 선언하는 편이 낫다면 그렇게 지시해 달라. 그러면 보완한다.
2. **R-6 실측 결과(인계 §4)** — `Orientation=6` 합성 JPEG(40×20)이 Chromium에서 **20×40으로 decode**된다.
   브라우저가 EXIF를 적용하므로 직접 파싱은 이중 회전이 된다는 근거다. 조사 보고서의 `NOT VERIFIED`를
   **Chromium 한정 해소**로 갱신할지 판정해 달라.

## Claude 다음 작업

**없다.** Codex 판정 전까지 저장소를 수정하지 않는다. `CORRECTION_REQUIRED`가 오면 지정된 파일과
재현 범위 안에서만 보완하고, 승인되면 종료 문서만 처리한다. 다음 스펙은 착수하지 않는다.
알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
