# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 다음 작업 — Codex 검토 (운영자 cm 입력 UI 조사)

Claude Code가 스펙 032 §후속 순서 2의 **읽기 전용 조사**를 마치고 문서 전용 커밋으로 push했다.

- 보고서: `docs/codex-claude-handoff/reviews/2026-07-31-operator-cm-input-ui-investigation.md`
- 제품 코드·테스트·CSS·설정 diff **0**, 신규 의존성 0, 실제 network/live/Firebase/deploy **0**

### 검토해 달라

1. **리빌드 admin이 프리미티브 데모 셸(3파일 79줄)이고 쓰기 경로가 0건**이라는 관측이 맞는지.
   맞다면 이 스펙의 실제 크기는 "입력란 두 개"가 아니라 **최초의 운영자 기능 + 최초의 쓰기 경로**다.
2. **레거시의 `wcm`/`hcm`** (`denn-admin.html:1698` 저장, `denn-mockup-tool.html:11302` 1순위 read)을
   스펙 032가 고려하지 않았다는 지적이 타당한지. 타당하다면 **P-2의 필드 결정이 다시 열리는지**,
   아니면 마이그레이션으로 흡수할지.
3. `confirmEditSz`가 cm을 저장하지 않아 **aspect↔cm 불일치를 만든다**는 분석이 맞는지.
4. 저장 경로 후보 **A(검증만) / B(로컬 초안) / C(실제 쓰기)** 중 택일 (**STOP 4 = Codex 결정**).
5. 레거시 `editSz`의 `sub` 파싱·`wcm=21` 날조 prefill **재현 금지**를 스펙에 명시할지 (**STOP 5**).

### Founder 결정이 필요한 것 (Codex 검토 후)

- **STOP 1** admin 인증·쓰기·발행을 이번에 도입할지 — **Firebase 표면이라 자동 진행 금지**
- **STOP 2** 기존 `wcm`/`hcm` 처리 (마이그레이션 / 함께 인정 / 무시하고 재입력)
- **STOP 3** `sub`를 cm에서 파생할지 독립 편집할지

## Claude 다음 작업

**없다.** Codex 검토 결과와 필요한 Founder 결정이 기록되기 전까지
운영자 UI 관련 **제품 코드·테스트·CSS·설정을 작성하지 않는다**.

- `CORRECTION_REQUIRED`면 지적된 범위만 **문서로** 보완한다
- 승인 + Founder 결정이 나오면 구현 계약(`docs/rebuild/specs/033-*.md`)을 기다린다
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 계속 손대지 않는다
- **C-1(인쇄 좌표 방법 A/B/C) 임의 선택 금지** — Codex 결정이다

## 미해결로 남아 있는 것

- **C-1 인쇄 좌표 방법(후보 A/B/C)** — 확정 스펙 없음
- 인쇄소 요구 전체(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**,
  P-4a의 업로드·주문 전송·배포 차단은 그때까지 유지
- 케이스 인쇄(P-1로 분리), C-2~C-8
- **스펙 032 조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
- 실제 발행 카탈로그의 `wcm`/`hcm` 건수 → **NOT VERIFIED** (실제 network 금지)
