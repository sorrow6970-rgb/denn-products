# NEXT CLAUDE PROMPT

상태: `COMMITTED`

## 스펙 031 종료 완료 — 다음 스펙 대기

Claude Code가 2026-07-31에 Codex 승인에 따라 종료 문서만 하나의 문서 커밋으로 처리하고 일반
fast-forward push했다.

- 승인 코드/test: `88b64e6` (보완 라운드 1, 최초 구현 `78095f8`), 승인 문서: `b7d46d3`
- 정본 §CODEX_PASSED: `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`
- 인계 §9: `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`
- 이 라운드는 **문서 전용**이다. 기능 코드·test·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 88b64e6..HEAD -- apps packages tests` = 0줄), 신규 의존성 0, network·live·deploy 0
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

## 최종 검증 결과

**unit 1088/1088** · 실제 Chromium **E2E 116/116** ·
frozen install·format·lint·typecheck·build·`git diff --check` **PASS** ·
포트 4183·4184 및 OS temp staging 잔류 **0** · lockfile·manifest diff **0** · 신규 의존성 **0** ·
고객 dist SHA-256 E2E 전후 **동일**.

**잔류 프로세스 command-line 검사는 NOT TESTED**다.

## 스펙 031에서 확정된 것

액자 `textZones` 다섯 키(닫힌 범위 검증 · `maxChars` 80 / `maxLines` 2 기본 · 초과는 입력 차단 ·
`"0"`은 유효) · `defaultTexts`는 placeholder 전용이고 `name2`엔 없음 · **wrap은 주입 측정 포트로
빌더에서 한 번 확정**해 `draw-text`가 이미 wrap된 lines만 담음 · **요청 폰트 미가용 시 텍스트 plan
fail-closed** · executor 텍스트 capability는 선택적이고 없으면 preflight fail-closed ·
letter-spacing은 glyph별 `fillText` · **시계는 하드웨어**라 **mat rect 기준** DOM 오버레이이며
plan·인쇄·주문에 없고 custom image timer 0 · 텍스트는 분 경계 60초 · 활성 timer ≤1 ·
**선언된 사진 실패 시 텍스트로 대체하지 않고 숨김**.

## NOT TESTED (다음 스펙이 이어받을 항목)

- **잔류 프로세스 command-line 검사**
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)의 **IME · 폰트 · 오버레이**
- **system font 대체** 결과, 실제 **인쇄물 가독성**
- **실제 print/export의 텍스트 출력** — 인쇄 경로는 아직 이 plan을 소비하지 않는다
- **실제 물리 시계와 오버레이 위치의 일치 여부**
- case 자유 배치 텍스트(F-1) · admin `name2` 기본값(F-8) · 고객 색/그림자(F-2)

## 미결로 남은 구조 판단 2건

최초 라운드에서 올렸고 **명시 지시 없이 승인으로 수용**된 것으로 기록했다. 후속 스펙에서 정리할 수 있다.

1. 배럴(`plan/index.ts`·`preview/index.ts`) 최소 확장 대신 **구조적 타입**을 쓴 것
2. 입력 거부를 **빌더 시험 빌드**로 구현한 것(키 입력마다 빌드 1회 추가)

## Codex 다음 작업

이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 스펙 031은 `DONE`이다.
그 다음 스펙의 조사 지시 또는 구현 계약을 작성한다.

## Claude 다음 작업

**없다.** 다음 스펙은 착수하지 않는다. Codex가 새 스펙을 기록하고 상태를 `WAITING_FOR_CLAUDE`로
바꾸기 전까지 저장소를 수정하지 않고 폴링만 유지한다. 알려진 스펙 018 PNG 2개와
`packages/render/src/plan/index.ts`는 계속 손대지 않는다.
