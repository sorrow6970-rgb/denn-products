# spec092 C5 실패 상태 시각 감사 — 계약 인수인계

## 최신 종료 — 2026-09-07

사용자 연속 구현 승인에 따라 동일 Codex 계약 검토→감사test→검증→자체 검수 완료.
**DONE / CODEX_PASSED / LOCAL_VERIFIED**. 독립 검수·Founder 최종 시각 승인은 아니다.
테스트/증거18파일 커밋 `36eb15a`. closure7문서 별도 커밋 후 일반 push하며 결과를 따로 확인한다.
보고서: [092 감사](../codex-claude-handoff/reviews/2026-09-07-spec-092-admin-c5-failure-state-visual-audit.md).
신규test1+증거17+계약/보고서/handoff/상태7=25파일. 기존 roadmap/spec091handoff2는 보존·커밋 제외.
최종 check2517/2517·canonical246/246(48.6초) PASS; 최초 canonical도246/246(47.6초) PASS.
합성 CID 검사1줄 보완 후 최종 재검증. PNG15/JSON/README 두 실행 동일,15개 직접 시각 확인.
enabled36/disabled42개 별도 측정, 활성44px 미만·가로 overflow·axe중대·console·외부 시도0.
제품 hash 불변, 보호18개 불변/PNG2만 명시 canonical 예외. restore/stage/commit0.
다음은 C5 미지원 실패·진행 상태의 test-only 가능성 읽기 전용 조사 후 별도 계약 후보.
운영/UID/배포/자동화0. 전체 추정85~88%/잔여12~15% 유지, 실측률 확인 불가.
아래는 계약 작성 당시 이력이며 현재 구현 전 대기 지시가 아니다.

2026-09-07, Codex. `CONTRACT_DRAFT / READY_FOR_CODEX / NOT IMPLEMENTED / NOT TESTED`.
정본: [092 계약](../rebuild/specs/092-admin-c5-failure-state-visual-audit.md).
시작 HEAD=origin54aa472, ahead/behind0/0. 현재 번호092 중복 파일 없음 확인 후 작성했다.

## 이번 수행

사용자 `응 다음 진행해줘`에 따라 NEXT의 계약 작성만 수행했다. 기존 fixture/controller/편집기/Card와
admin-write-editor E2E를 읽어 상태별 도달 경로를 대조했다. 기존파일 수정·게이트 실행은 하지 않았다.

- 유효한 미저장 변경, invalid 입력, conflict, outcome-unknown, conflict에서 진입한 discard-confirmation.
- 5상태×3 viewport(320x568/390x844/1280x800)=15측정/15PNG로 계약. **현재 생성된 증거는0**.
- `.denn-card:has([data-testid="frame-print-size-editor"])`로 실제 제품 Card를 포함한다.
  진단·제목·auth 카드는 제품 시각 판정에서 제외하고 inner stack만 crop하는 오류를 피한다.
- 상태/저장 횟수/현재 revision, 제품 controls·44px·Tab/focus·가로 overflow·axe·외부 요청·민감문자열을
  기록한다. 기능/출처 게이트와 시각 finding 판정을 분리해 “감사 완료=제품 UI 전체 PASS”로 쓰지 않는다.
- save-error/load-error/auth expiry/loading/saving, 다른 discard 진입 출처는 첫 단위 제외.
  fixture 변경/새 seam, UI 문구나 복구 의미 변경은 금지한다.

## 검토할 핵심

1. 준비 절차와 expected fake.save 수: 미저장2상태0, conflict/unknown/폐기확인1; revision3 고정.
2. Card root와 진단 영역의 분리, disabled controls와 enabled targets 집계의 구분.
3. 미확인 시각 결함은 수정하지 않고 finding으로 기록하는 감사 성격.
4. 신규 test1파일/결과 README·JSON·PNG15/감사 보고서/계약·handoff·상태만 여는 한정 범위.
5. canonical 보호 PNG2 재생성 예외를 제외한 기존 증거 변경은 STOP. 실제 서비스 접근·배포 금지 유지.

이번에는 계약/hand off/STATE/NEXT/CURRENT/live6문서만 작성·갱신했다. 직전 미커밋6문서 중4개와
겹치므로 전체 미커밋 작업 문서는8개다(기존 spec091handoff/로드맵 보고서2개는 이번 미수정).
보호/user dirty는 별도 보존. commit/push/stage0, product/test/config/Rules/PNG 변경0.
계약 링크 검사와 git diff --check를 수행하며, 이전 unit2517/E2E230 PASS를 이번 실행으로 보고하지 않는다.
전체85~88%/잔여12~15%는 기존 관리 추정 유지, 새 실측 완료율은 확인 불가다.

## 다음 지시

092 계약만 문서 검토한다. 모순이 있으면 문서 범위에서 보완하고, 통과/승인 전 신규 test/PNG/게이트를
시작하지 않는다. 운영 전환·실제 Firebase/UID/emulator/배포/자동화 금지. 이번 계약은 새 기능 승인이 아니다.
