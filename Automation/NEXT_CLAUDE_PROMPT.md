# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

# 스펙 031 사전 조사 완료 — Codex 검토 대기

Claude Code가 2026-07-31에 읽기 전용 조사 범위만 수행하고 문서 전용으로 커밋해 일반 fast-forward
push했다.

- 보고서: `docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`(13항목)
- 기준 HEAD `57d43b6`
- 커밋 파일(허용 목록과 정확히 일치): 위 보고서(신규), `docs/codex-claude-handoff/CURRENT.md`,
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `Automation/DENN_AUTOMATION_STATE.md`, 이 문서
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff 0, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0
- 알려진 스펙 018 PNG 2개는 restore·checkout·stage·commit하지 않았다

## 핵심 발견 (검토 우선순위)

1. **텍스트는 두 개의 다른 모델이다** — 액자는 운영자가 좌표를 찍은 키 기반 `textZones`(고객은 값만),
   케이스는 고객이 드래그하는 자유 배치 `textObjs`. 코드·데이터 공유 0.
2. **★ 인쇄/export에 시계가 없다** — 미리보기에만 존재해 고객이 본 화면과 인쇄물이 구조적으로 다르다.
3. **레거시 결함 3건**(재현 금지): `"0"` 소실 · 줄 수 상한 2 vs 3 불일치 · 기본 글자색 뒤집힘.
4. **★ wrap 딜레마**: `measureText`가 필요한데 plan은 순수해야 한다 → **측정 포트 주입으로 `lines[]`를
   plan에 확정**할 것을 권고. 레거시의 미리보기≠인쇄가 반대 선택에서 나왔다.
5. 카탈로그는 텍스트·시계 필드를 **보존만 하고 투영은 0**, `packages/render` plan에 **텍스트 어휘 0**.

## Codex 다음 작업

조사 보고서를 검토해 **Founder 결정 요청(F-1~F-8)** 과 **Codex 구조 결정(C-1~C-11)** 을 확정하고,
구현 스펙(또는 추가 조사 지시)을 작성한다. 특히 다음 두 가지는 제품 정책이므로 Founder 승인이 필요하다.

- **F-4 시계를 인쇄물에 포함할 것인가**(포함하지 않는다면 미리보기에 그 사실을 명시해야 한다)
- **F-3 운영자 `defaultTexts`를 고객 입력 초기값으로 넣을 것인가**(넣으면 `'WEDDING'` 같은 운영자
  샘플이 인쇄물에 들어간다)

## Claude 다음 작업

**없다.** 구현 계약이 저장소에 기록되고 상태가 `WAITING_FOR_CLAUDE`로 바뀌기 전까지 텍스트·시계 관련
제품 코드·테스트·CSS·설정을 작성하지 않는다. 이 기간에는 저장소를 수정하지 않고 폴링만 유지한다.
알려진 스펙 018 PNG 2개는 계속 손대지 않는다.
