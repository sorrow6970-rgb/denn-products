# NEXT CLAUDE PROMPT

상태: `COMMITTED` → 다음 읽기 전용 조사 진행 중

## 스펙 032 종료 (DONE)

Codex가 `315356a`를 독립 검증해 통과시켰고, Claude가 종료 문서를 별도 fast-forward push했다.
기능 코드·테스트 추가 수정 **0**.

- 구현 커밋 `c10e7a6` / 계약 `2a0cfd3` / 결정 정본 `0443137`
- 인계: `docs/handoff/2026-07-31-spec-032-print-physical-size-handoff.md`
- 최종 게이트: frozen·format·lint·typecheck·build PASS, unit **1109/1109**,
  Chromium E2E **116/116**, diff check·forbidden diff·ports 4183/4184·OS temp PASS

## 다음 작업 — 운영자 cm 입력 UI 읽기 전용 조사

계약 §후속 순서 2다. Claude가 **읽기 전용 조사 보고서**를 작성해
`docs/codex-claude-handoff/reviews/`에 남기고 **문서 전용 커밋**으로 push한다.

**제품 코드·테스트·CSS·설정 변경 0.** `apps/admin/**`은 **조사 대상이지 수정 대상이 아니다.**

조사가 답해야 할 것:

- 현재 `apps/admin`의 사이즈 편집 표면이 존재하는지, 존재한다면 무엇을 저장하는지
- 스펙 032가 만든 `printWidthCm`/`printHeightCm` 계약을 UI가 만족시키려면 필요한 것
  (all-or-nothing 입력, `> 0`·`<= 500` 검증, 저장 경로, 기존 카탈로그 무회귀)
- 운영자가 **한쪽만 입력한 중간 상태**를 UI가 어떻게 다뤄야 하는지 (read는 fatal이므로 저장 차단 필요)
- 레거시 admin의 사이즈 편집 동작과 저장 스키마 근거
- Founder 결정이 필요한 항목과 Codex 결정이 필요한 항목의 분리

## Codex 다음 작업

조사 보고서를 검토하고, 필요하면 보완 지시 후 **구현 계약**(`docs/rebuild/specs/033-*.md`)을 작성한다.

## Claude 금지 사항 (유지)

- 조사 승인과 필요한 Founder 결정 전 **구현 착수 금지**
- `apps/admin/**` 수정은 **스펙이 명시 허용할 때만**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 계속 손대지 않는다
- **C-1(인쇄 좌표 방법 A/B/C) 임의 선택 금지** — Codex 결정이다

## 미해결로 남아 있는 것

- **C-1 인쇄 좌표 방법(후보 A/B/C)** — 확정 스펙 없음
- 인쇄소 요구 전체(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**,
  P-4a의 업로드·주문 전송·배포 차단은 그때까지 유지
- 케이스 인쇄(P-1로 분리), C-2~C-8
- **조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
