# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 스펙 031 Founder 결정 정본 기록 완료 — Codex 구현 계약 대기

Claude Code가 2026-07-31에 Founder 결정을 문서 전용으로 기록하고 일반 fast-forward push했다.

- 정본: `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`
- 기준: Codex 승인 조사 커밋 `7636367`
- 커밋 파일(허용 목록과 일치): 위 결정 문서(신규), `docs/codex-claude-handoff/CURRENT.md`,
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `Automation/DENN_AUTOMATION_STATE.md`, 이 문서
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff 0, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·secret 접근 0
- 알려진 스펙 018 PNG 2개는 restore·checkout·stage·commit하지 않았다

## ★ F-4 확정 — 시계는 물리적 하드웨어 미리보기

시계는 **완제품에 부착되는 물리적 시계 하드웨어**이고, 화면은 그 자리를 합성해 보여줄 뿐이다.

- **print/export 미포함이 정상이다.** 레거시가 인쇄에서 시계를 빼 온 것은 **결함이 아니라 의도**였다.
- **F-5(인쇄 시각의 의미)는 불필요**해졌다.
- **`packages/render`는 시계 때문에 확장하지 않는다.** 텍스트(`textZones`) 때문에만 확장한다.
- 시계는 **plan에 담기지 않으며** print/export와 공유할 **결정적 plan을 전제하지 않는다**.
- 시계 구현 범위 = **preview overlay 계약 + timer lifecycle뿐**(조사 §8.4 ⓐ):
  ① DOM 오버레이 분리 여부(저장소에 선례 있음) ② 1초 갱신이 실제로 필요한지
  ③ **타이머가 정확히 하나만 살아 있는지**(언마운트·템플릿 전환·토글·StrictMode, 레거시 누수 미재현)
  ④ 실물 부착을 알리는 고객 안내 문구 필요 여부

## Founder 텍스트 묶음 (일괄 승인)

- **F-1** 1차는 액자 key 기반 `textZones`만. 케이스 자유 배치는 별도 스펙
- **F-2** 고객 색·그림자 1차 미지원, 운영자 zone 스타일이 단일 정본
- **F-3** `defaultTexts`는 placeholder로만 표시(값 자동 입력 금지)
- **F-6** zone별 길이 상한 + **초과 입력 차단**(자르기·말줄임·자동복구 없음)
- **F-7** zone별 줄 수 상한, **기본 2줄**
- **F-8** 다섯 키 균일 처리, **`name2` 기본값 없음**(admin 확장은 별도 스펙)

## Codex 다음 작업

이 결정을 입력으로 **스펙 031 구현 계약**(`docs/rebuild/specs/031-*.md`)을 작성한다.
최소한 다음을 확정해 달라.

- 조사 **C-1~C-7·C-9~C-11**(wrap 측정 포트 주입, `draw-text` 형태, 폰트 스펙 구조체, letter-spacing
  구현, zone 회전, clip 없음, 빈 값에서 `"0"` 유효, executor 텍스트 capability와 fail-closed,
  오류 우선순위, 투영 확장)
- **C-8은 F-4 확정으로 갈래가 정해졌다** — 시계는 plan 밖 preview overlay다
- zone별 **길이·줄 수 상한의 구체 값과 저장 위치**(카탈로그 필드 vs 계약 기본값)
- 시계 오버레이의 **DOM 분리 여부**와 **1초 갱신 필요성**
- 허용 파일 목록과 게이트, NOT TESTED 경계

## Claude 다음 작업

**없다.** 구현 계약이 Git 히스토리에 기록되고 상태가 `WAITING_FOR_CLAUDE`로 바뀌기 전까지 텍스트·시계
제품 코드·테스트·CSS·설정을 작성하지 않는다. 계약이 미커밋(untracked)이면 Codex의 push를 기다린다.
알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
