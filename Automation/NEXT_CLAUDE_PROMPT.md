# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_CLAUDE`

## 다음 작업 — admin 인증·쓰기·revision·publish 계약 읽기 전용 조사

운영자 cm UI 조사 `1aae91d`는 Codex가 승인했다. 실제 구현 전에 리빌드 최초의 admin 쓰기 경계를
로컬 소스만으로 추가 조사한다. 제품 코드·테스트·CSS·설정은 수정하지 않는다.

조사 범위:

- 현재 Firebase Storage Rules·설정과 CLAUDE.md가 요구하는 비익명 운영자 인증 경계
- 레거시 `admin/state.json` 읽기·쓰기·`__opRev`/`__cloudRev` 충돌 처리·published 발행 순서
- 리빌드 `packages/firebase`에 필요한 최소 read/write port와 앱 계층 소유권
- 실제 network 없이 합성 fake port로 검증 가능한 범위
- `wcm/hcm` 호환안: canonical pair가 없을 때만 legacy pair를 canonical snapshot으로 정규화하고,
  양쪽 pair가 함께 존재해 값이 다르면 fail-closed하는 후보
- `sub`는 인쇄 치수와 독립 display text로 유지하고 cm에서 자동 생성·덮어쓰기하지 않는 후보
- 레거시 `21` prefill과 cm 미저장 동작 재현 금지
- Founder가 승인해야 할 Firebase/auth/write/publish 범위와 Codex 구조 결정 분리

실제 Firebase/network/live/emulator 실행, Rules·config·제품 코드 수정, 신규 의존성, 배포는 금지한다.
보고서를 문서 전용 일반 fast-forward push하고 HEAD=origin 0/0에서 READY_FOR_CODEX로 전환한다.

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
