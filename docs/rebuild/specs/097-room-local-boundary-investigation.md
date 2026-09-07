# 097 — 룸 목업 최소 로컬 경계 조사

2026-09-07. 기준7a1a981/rebuild/modern-studio,origin 추적ref와0/0.
DOCUMENT DONE / DOCUMENT_REVIEW_PASSED(동일 Codex). 사용자 `응 다음`은096 NEXT의 문서 조사 지시다.
제품 구현 계약이나 룸 제품 의미 승인이 아니다.

## 목표 (WHY)

룸 목업의 좌표·배경·역할별 설정·Space 의존성을 실제 코드로 추적하여 다음 최소 후보와
Founder 결정이 필요한 경계를 좁힌다. 인쇄 cm를 액자 외곽/방 실측이라고 가정하지 않는다.

## 범위 (SCOPE)

정적 파일 읽기만으로 레거시 유효 정의/래퍼,배경 fit·드래그·축척·원근/효과,flat 설정 및
현재 shared/render/Space의 경계를 조사한다. 런타임 실행 순서가 증명되지 않으면 UNCONFIRMED.
비교 후보와 파일 경계,안전한 합성 검증 방법은 제안일 뿐 채택/구현하지 않는다.
제품코드/test/Rules/config/package/lockfile/기존증거/보호파일 변경0.
실제데이터/UID/실제네트워크/사진수집/브라우저/emulator/배포/발행/설치/삭제/자동화0.

## 대상 (WHERE)

허용 문서 정확7개:

- docs/rebuild/specs/097-room-local-boundary-investigation.md
- docs/codex-claude-handoff/reviews/2026-09-07-spec-097-room-local-boundary-investigation.md
- docs/handoff/2026-09-07-spec-097-room-local-boundary-investigation-handoff.md
- Automation/DENN_AUTOMATION_STATE.md
- Automation/NEXT_CLAUDE_PROMPT.md
- docs/codex-claude-handoff/CURRENT.md
- docs/live/CLAUDE_LIVE_PATCH_LOG.md

별도 사용자dirty22개 및 보호taste-v2/**,design/README,spec038,spec018PNG2,
render/plan/index.ts,pnpm-workspace.yaml,AGENTS.md는읽기외조작/stage/commit0.

## 조사 지시 (WHAT / HOW)

1. 레거시 분석/095/096 및 결정 정본을 기준으로 함수 정의와 후속 래퍼를 추적한다.
2. 좌표/인쇄cm/외곽/실측보정/효과의 입력과 소유권을 나누고,분기별 정적 사실과 미확정을 구별한다.
3. 현재 모듈에서 재사용 가능한 읽기/순수기하와 보호 plan·Space 미지원 경계를 표로 정리한다.
4. 최소 로컬 후보와 전체 룸 재현의 차이,새 권한/제품 결정 및 후속 파일 후보를 기록한다.
5. 구현은 시작하지 않고 결정이 필요하면 질문을 최소화해 NEXT에 남긴다.

## 검증 (VERIFY)

문서 로컬 링크/라인 근거 존재,Git diff--check,허용7경로 및 시작dirty22개 SHA불변을 확인한다.
제품/Rules/config/test/PNG/번들 무변경이며 unit/build/E2E는 실행하지 않는다.
조사 완료는 DOCUMENT_REVIEW_PASSED/DOCUMENT DONE,제품 검증 PASS가 아니다.
스코프 내 문서만 별도 일반commit/push,보호/별도dirty는제외.전체실측률/최종스펙수는추정하지 않는다.

## 위험 (RISK)

레거시 다중 재정의·동적 install 때문에 마지막 텍스트 정의=실제 최종 실행을 보장하지 않는다.
운영데이터/배경 실측/실물 외곽/모든과거시안 재현은 NOT TESTED.다음 API/schema/제품결정은미승인.

### DONE (Codex)

정적래퍼/좌표/배경/역할/시계DOM/Space경계 조사완료. [결과](../../codex-claude-handoff/reviews/2026-09-07-spec-097-room-local-boundary-investigation.md).
제품/test/Rules/config/운영/브라우저 실행0.문서만 검증하며 제품 PASS를 새로 선언하지 않는다.
RG-2=A/B 후보만 제안,방향 선택전 다음제품계약/구현0.정확검증/전송결과는handoff와live에기록한다.

### QUESTIONS

RG-2=A:로컬참고용룸배치를단계적으로준비하고첫구현은순수좌표·세대소유권/fake로한정할지
Founder결정대기.실측·원근·운영프리셋·Space·저장확장승인아님.현재어느후보도선택하지않았다.
