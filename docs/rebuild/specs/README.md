# 리빌드 스펙 워크플로 (Codex ↔ Claude Code)

> 이 폴더는 **Codex가 작성하고 Claude Code가 소비하는** 작업 스펙의 단일 위치다.
> 규칙 전문은 루트 `CLAUDE.md` §1 참조.

작업 전에는 `/CLAUDE.md` → `docs/rebuild/README.md` → `docs/codex-claude-handoff/CURRENT.md` → 적용 `decisions/` → 현재 스펙 순서로 읽는다. 스펙 번호가 같아도 `docs/codex-claude-handoff/instructions/` 문서는 준비 이력이며 이 폴더의 현재 스펙을 대체하지 않는다.

## 흐름

```
Codex        →  NNN-<slug>.md 작성 (분석·구현 지시·검증 절차)
Claude Code  →  스펙 읽고 코드 구현 → 검증 실행 → 스펙 하단 ### DONE 에 결과 보고
사용자        →  확인 / 다음 스펙 지시
```

- Claude Code는 **스펙에 명시된 범위만** 구현한다. 범위 밖 리팩터·확장 금지.
- 불명확/모순 → 임의 결정 금지. 스펙 하단 `### QUESTIONS`에 남기고 확인 요청.
- 커밋은 스펙 단위, 메시지에 `spec NNN:` 접두어.

## 파일명

`NNN-<slug>.md` — `NNN`은 3자리 순번(001부터), `<slug>`는 소문자-하이픈.
예: `007-warm-taupe-palette-migration.md`, `012-room-mockup-engine.md`, `020-space-gate-viewonly.md`

## 스펙 템플릿

새 스펙은 아래 구조를 따른다 (Codex 작성):

```markdown
# NNN — <제목>

## 목표 (WHY)
이 작업이 무엇을 달성하는가. 사용자/제품 관점 한두 문장.

## 범위 (SCOPE)
- 포함: ...
- 제외(하지 않을 것): ...   ← 스코프 고정용, 반드시 명시

## 대상 (WHERE)
- 새/수정 파일 경로, 관련 패키지, 참조할 레거시 함수/식별자
  (예: legacy `openRoomMockup`(L1725), `RM` 상태 → `packages/render` + `apps/mockup`)

## 구현 지시 (WHAT / HOW)
1. 단계별 지시...
2. ...
- 보존 제약 체크: CLAUDE.md §4 중 이 작업이 건드리는 항목 명시

## 검증 절차 (VERIFY)
- [ ] 유닛/e2e 테스트 (명령 포함)
- [ ] 수동 확인 항목 (예: `?space=<기존토큰>` 링크가 열리는지)
- [ ] 회귀 체크 (레거시 동작 대비)
- 완료 정의(DONE): 이 조건들이 전부 통과하면 완료.

## 위험 (RISK)
회귀 가능성, 데이터 마이그레이션 위험, 롤백 방법.
```

## 구현 후 (Claude Code 작성)

스펙 파일 하단에 append:

```markdown
### DONE (Claude) — YYYY-MM-DD
- 변경 파일/커밋: ...
- 검증 결과: (각 VERIFY 항목 pass/fail + 근거)
- 남은 이슈 / 후속 스펙 제안: ...
```

## 상태 인덱스 (선택)

진행 현황을 한눈에 보려면 이 표를 갱신:

| Spec | 제목 | 상태 | 비고 |
|------|------|------|------|
| 001 | 모바일 플랫폼 호환성 POC | 승인·실기기 기록 존재 | 기본 Android Chrome 일부 NOT TESTED |
| 002 | 모바일 확대 CTA 접근성 | DONE | 4환경 재검증 PASS |
| 003 | 가로 Canvas 3:4 비율 | DONE | 4환경 재검증 PASS |
| 004 | 카라멜 앰버 팔레트 전환 | DONE | 자동검증 Codex 승인, PNG 별도 후속 |
| 005 | 카라멜 앰버 실기기 표시 검증 | DONE | 4환경 PASS, Codex 승인 |
| 006 | 프런트엔드 기술 스택 최종 검토 | DONE | Codex 승인, 후속 소형 POC 2건 남음 |
| 007 | 웜 토프 팔레트 마이그레이션 | DONE | POC 코드·명암비 테스트 마이그레이션·자동검증 통과, 실기기 표시 NOT TESTED |
| 008 | 웜 토프 실기기 표시 검증 | DONE | 4환경 12항목 PASS(사용자 확인), 실기기 표시 검증 완료 |
| 009 | TS7 린트 + 최소 pnpm workspace POC | DONE | Biome+tsc·최소 workspace 채택 권고, typescript-eslint↔TS7 비호환 재현 |
| 010 | 실제 리빌드 모노레포 스캐폴드 | DONE | 루트 workspace·2 apps·5 packages, 게이트 통과·운영본 hash 무변경 |
| 011 | Modern Studio 공유 UI 기반 프리미티브 | DONE | Codex 승인, 토큰·프리미티브·접근성 계약 및 자동 게이트 통과 |
| 012 | 레거시 카탈로그 읽기 계약·정규화·fixture | READY | `@denn/shared` legacy-v0→Catalog V1 순수 읽기 경계, unknown 보존·오류 보고 |
