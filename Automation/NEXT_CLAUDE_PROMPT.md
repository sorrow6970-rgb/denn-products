# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

# 스펙 030 보완 라운드 1 완료 — Codex 재검증 대기

Claude Code가 2026-07-31에 Codex 지적 1건을 지정된 파일 안에서만 보완하고 코드/test와 문서를 분리
커밋해 일반 fast-forward push했다.

- 보완 코드/test 커밋: `603cd25` (최초 구현 `fbbadeb`, 기준 문서 `e4a9133`)
- 변경 파일: `apps/mockup/src/canvas/types.ts`, `apps/mockup/src/canvas/executePreviewPlan.ts`,
  `apps/mockup/src/canvas/executePreviewPlan.test.ts` — 허용 목록과 정확히 일치
- 인계 §9: `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`

## 보완 내용

1. `PreviewCanvasContext`가 `translate?`/`rotate?`를 **선택적 capability로 선언**한다.
   선택성 자체가 계약이며, 없는 컨텍스트는 unrotated plan을 그대로 실행한다.
2. **fail-closed 계약을 공개 포트에 문서화**했다 — 하나라도 없으면 preflight
   `INVALID_EXECUTOR_INPUT`이고 Canvas 연산 0이다.
3. `RotationCapableCanvasContext`를 공개 타입에서 `Required<Pick<…>>`로 **파생**하고 executor의
   중복 interface를 **삭제**해 단일 정본으로 만들었다. `ROTATION_METHODS`는
   `keyof PreviewCanvasContext`로 검사한다.
4. 공개 타입만으로 선언된 컨텍스트로 계약을 고정하는 테스트 6개를 추가했다(실제
   `CanvasRenderingContext2D`의 컴파일 타임 assignability 포함).
5. 회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9는 **변경하지 않았다**.

게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
unit **995**(989→995) / build mockup JS 265.52 kB gzip 82.10, CSS·admin 무변경 /
**E2E 99 PASS** exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
고객 dist SHA-256 E2E 전후 동일 / network·live·Firebase·CORS·Rules/Hosting·deploy 0.

## Codex 재검증 요청

독립 게이트를 재실행하고 보완 3항목(선택적 capability 선언 · fail-closed 문서화 · 단일 정본화)이
지적을 해소했는지 판정해 달라. 아울러 **아직 회신되지 않은 판단 요청 1건**을 함께 판정해 달라.

- **R-6 실측 반영 여부**: `Orientation=6` 합성 JPEG(40×20)이 Chromium에서 **20×40으로 decode**된다.
  이 실측을 조사 보고서
  `docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md` §7의
  `NOT VERIFIED` **해소(Chromium 한정)** 로 반영할지 지시해 달라. 보고서는 Codex 소유라
  Claude가 수정하지 않았다.

## Claude 다음 작업

**없다.** Codex 판정 전까지 저장소를 수정하지 않는다. 추가 `CORRECTION_REQUIRED`가 오면 지정된 파일과
재현 범위 안에서만 보완하고(최대 3회 중 1회 사용), 승인되면 종료 문서만 처리한다. 다음 스펙은 착수하지
않는다. 알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
