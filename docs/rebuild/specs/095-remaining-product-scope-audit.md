# 095 — 잔여 제품 기능·승인 경계 대조

2026-09-07. 기준 `rebuild/modern-studio`, HEAD=origin `e083aec`, ahead/behind0/0.
DONE / DOCUMENT_REVIEW_PASSED. 사용자 `응 다음진행해줘`와094 NEXT의 읽기 전용 지시.
동일 Codex가 조사·검수한다. 제품 구현 계약이 아니며 다음 기능의 채택을 대신 승인하지 않는다.

## WHY

전체 리빌드의 잔여 기능을 개별 스펙 수와 혼동하지 않고, 기존 데이터 읽기·제품 구현·합성 검증·운영
개방을 구별한다. 룸/가이드/주문·카카오/전체 catalog authoring/발행의 다음 안전한 범위를 정리한다.

## SCOPE / WHERE

소스·레거시 HTML·기존 계약·결정·테스트를 정적으로 읽는다. 실제 데이터 파일/서비스는 읽지 않는다.
허용 변경은 다음7문서뿐이다.

1. 이 문서.
2. `docs/codex-claude-handoff/reviews/2026-09-07-spec-095-remaining-product-scope-audit.md` 신규.
3. `docs/handoff/2026-09-07-spec-095-remaining-product-scope-audit-handoff.md` 신규.
4. `Automation/DENN_AUTOMATION_STATE.md`.
5. `Automation/NEXT_CLAUDE_PROMPT.md`.
6. `docs/codex-claude-handoff/CURRENT.md`.
7. `docs/live/CLAUDE_LIVE_PATCH_LOG.md`.

이미 미커밋인 roadmap 보고서/spec091handoff는 읽기만 하고 변경·stage하지 않는다.
apps/packages/tests/Rules/config/package/lockfile/운영 HTML/PNG/보호 파일 수정0. 테스트·브라우저·emulator 실행0.
실제 Firebase/UID/운영 데이터/주문 전송/배포/발행/삭제/자동화·의존성 설치0.
taste-v2/**,design/README,spec038,spec018PNG2,render/plan/index.ts,pnpm-workspace.yaml,AGENTS.md 보호 유지.

## WHAT / HOW

- 기능별로 레거시 근거, 현재 코드, 검증의 한계, 남은 작업, 승인 경계를 연결한다.
- 데이터 필드 보존을 렌더/편집 기능의 구현으로 세지 않는다. 오래된 README 상태보다 개별 정본·소스를 우선한다.
- 현재 인쇄 치수와 액자 외곽 실측/방 사진 보정 치수를 동일하다고 추측하지 않는다.
- 현재 불허 범위가 단위별 제외인지 명시적인 운영/정책 차단인지 구별한다.
- 안전한 후속 후보를 제시하되 새 제품 의미가 필요하면 QUESTIONS에 남기고 제품 코드는 작성하지 않는다.

## VERIFY / DONE 조건

- 주요 주장마다 저장소 경로와 심볼/절을 연결; 부재 검색의 한계·정적 검토와 테스트 실행 차이를 명시.
- 신규 테스트 통과 수를 만들지 않는다.094 검증은 인용이며 이번 실행이 아님을 기록.
- 시작 dirty22파일 hash 보존, 변경은 위7문서뿐, staged 금지 경로0, `git diff --check` PASS.
- 완료는 문서 조사/검수 완료이지 전체 리빌드/후속 제품 완료가 아니다.
- 검증된 문서만 일반 커밋·push. [전송 승인](../../codex-claude-handoff/decisions/2026-09-07-scoped-origin-push-authorization.md) 범위만.

## RISK

이름 검색의 누락 가능성, 레거시 다중 재정의, 인쇄 치수를 외곽 치수로 오해하는 위험이 있다.
실행하지 않은 마지막 런타임 경로를 확정하지 않고, 기존 운영 데이터와 사용자 작업을 보존한다.

### QUESTIONS

RG-1은 [조사 §5](../../codex-claude-handoff/reviews/2026-09-07-spec-095-remaining-product-scope-audit.md)의
후속 최소 제품 범위 선택이다. 미승인 상태이며 이 문서는 답을 대신 선택하지 않는다.

### DONE (Codex) — 2026-09-07

5개 잔여 축을 레거시·현재 코드·정본·기존 테스트와 대조했다. 문서 검수 통과이며 제품 테스트 PASS가 아니다.
다음 RG-1 제품 선택은 미승인. canonical 인쇄 cm를 외곽/방 실측으로 추측하지 않고 구현 착수는 보류한다.
제품/테스트/운영 실행0. 허용7문서와 기존 dirty22파일 보존·링크·diff 검증 후 문서만 정상 전송한다.
