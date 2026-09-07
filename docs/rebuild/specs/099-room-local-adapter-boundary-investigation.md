# 099 — 로컬 룸 adapter 계약 경계 조사

2026-09-07. 기준1b20293=origin 추적ref,0/0. DOCUMENT DONE / DOCUMENT_REVIEW_PASSED(동일 Codex).
사용자 `응 검증하고 다음`으로098 재확인 및 NEXT의 문서조사 착수. 제품 구현 승인 아님.

## 목표 (WHY)

098 순수 좌표·세대 모델을 실제 로컬 배경/시안에 연결하기 전에 현재 자원 소유권과
frame snapshot 준비 조건, 시계 누락 방지, 늦은 완료/해제 경계를 코드 근거로 좁힌다.

## 범위 (SCOPE)

포함: PreviewComposer, localImageBinding, Canvas surface와 snapshot 관련 코드·시험 정적 조사.
098 재검증은 별도 targeted unit만 실행. 099는 문서 검사만, browser/이미지 로딩/build/E2E0.
제외: 제품/test/Rules/config/package/lockfile 수정, 실제 Firebase/UID/운영data/배포/발행/삭제/
설치/자동화, UI 연결·로더·snapshot 구현, 보호파일 변경/복원/stage/commit.
실측/레거시 프리셋/Space/새 schema 권한을 만들지 않는다.

## 대상 (WHERE)

허용 문서 정확7개:

- docs/rebuild/specs/099-room-local-adapter-boundary-investigation.md
- docs/codex-claude-handoff/reviews/2026-09-07-spec-099-room-local-adapter-boundary-investigation.md
- docs/handoff/2026-09-07-spec-099-room-local-adapter-boundary-investigation-handoff.md
- Automation/DENN_AUTOMATION_STATE.md
- Automation/NEXT_CLAUDE_PROMPT.md
- docs/codex-claude-handoff/CURRENT.md
- docs/live/CLAUDE_LIVE_PATCH_LOG.md

보호/별도dirty22파일은 시작hash 보존. spec018PNG도 이번에는 실행/재생성0.

## 조사 지시 (WHAT / HOW)

1. RG-2 결정,097 조사,098 계약·검수·handoff 및 현재 구현을 대조한다.
2. 로컬 이미지 file admission→URL→decode→bindings→취소/해제와 공유 금지 경계를 추적한다.
3. Canvas plan→draw완료와 DOM clock/readiness의 차이, immutable snapshot 전달 가능성을 확인한다.
4. 세대 invalidation, partial acquisition, stale completion, reentrancy와 resize의 최소 계약 후보를 제시한다.
5. 코드로 확인된 사실/추론/미검증을 분리하고 정확한 다음 단위 후보와 금지 범위를 남긴다.
   새 제품 선택이 필요하면 Founder 질문을 좁히고 STOP; 선택 전 구현 계약 확정0.

## 검증 절차 (VERIFY)

098 코드 범위/문서/targeted 결과 재확인. 099 문서 link/line·diff--check·허용7경로·dirty22hash
및 Git 동기화를 검사한다. 동일Codex 검토이며 독립검수 아님. 문서만 일반commit/push.

## 위험 (RISK)

mutable Canvas/borrowed binding을 owned snapshot으로 오인하거나 stale 결과를 ready로 노출하는 것.
실제 이미지 decode·메모리 회수·시계 포함 렌더·물리 정확도는 이번 조사로 보증하지 않는다.
전체 실측 완료율/최종 스펙 수를 추정하지 않는다.

### DONE (Codex)

098 targeted 재실행46/46(240ms) PASS. 코드4/계약과범위 재확인, 새로운 재현결함 확인0.
099는 정적 조사만: ready 문자열은 source별 draw ack가 아니며 binding은 borrowed lookup,
clock DOM hidden은 시계없음 증명이 아님을 확인했다. detached same-plan 실행과 독립소유권을
후속 후보로 제시했고 실제adapter/UI/새제품계약은 작성·구현하지 않았다.
[조사 결과](../../codex-claude-handoff/reviews/2026-09-07-spec-099-room-local-adapter-boundary-investigation.md),
[인수인계](../../handoff/2026-09-07-spec-099-room-local-adapter-boundary-investigation-handoff.md).
문서7개만 검증 후 일반commit/push. 전체check2591/E2E271은098의 과거결과이며 이번재실행아님.
운영·배포·UI연결·자동화0. 정확 다음 계약 지시는NEXT에 남긴다.
