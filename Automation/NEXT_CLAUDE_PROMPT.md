# NEXT CLAUDE PROMPT

상태: `FOUNDER_DECISION_REQUIRED`

스펙 034(`ff7a49a`)·035(`e9e2af6`)는 Codex 독립 검증을 통과해 DONE이다(`267ea72`). 그 뒤 2026-08-10에
**F-A~F-E 선택지 조사(읽기 전용)** 를 마쳐
`docs/codex-claude-handoff/reviews/2026-08-10-admin-auth-write-founder-decision-options.md`에 정리했고,
같은 날 `CORRECTION_REQUIRED` 판정에 따라 그 문서의 **사실 오류·논리 모순을 보완**했다(초판 `24d0c04`).

제품 코드 diff는 **0**이며 **리빌드(`apps/**`·`packages/**`)** 에는 Auth·저장·발행 코드가 한 줄도 없다.
⚠️ **레거시 `denn-admin.html`·`denn-mockup-tool.html`에는 해당 코드가 존재한다** — "0건"은 리빌드
범위에 한정된 사실이다. `storage.rules`는 **파일이 의도하는 정책만 확인**됐고 **실제 배포 여부와
거부 동작은 UNCONFIRMED**다.

**F-A~F-E는 다섯 항목 모두 미결이다.** 조사 문서 §8의 승인 프롬프트는 **예시 문장이며 Founder가
말한 적이 없다** — 승인으로 취급하지 않는다. 각 항목의 최소 안전 권장안도 **Claude의 권장이지
결정이 아니다**.

대기 중인 결정:

- **F-A** 운영자 Auth 도입 시점·인증 방식·허용 계정 정책 (+ `firebase` SDK **신규 의존성 승인**)
- **F-B** `admin/state.json` 저장만 vs `published/state.json` 발행까지
- **F-C** 레거시 운영 경로 공유 vs 리빌드 전용 격리
- **F-D** legacy `wcm`/`hcm` 정규화 결과 되쓰기 vs 메모리 전용
- **F-E** **택일**: **E2-best-effort**(단일 활성 편집자 전제 + 단조 revision + 쓰기 직전 재확인,
  **경합 창과 잔류 last-writer-wins 손실 가능성을 명시적으로 수용**) vs
  **E3-strong**(last-writer-wins 불허, 원자적 precondition·잠금의 지원 가능성을 별도 조사·검증하기
  전까지 **쓰기 구현 차단**, Rules 변경·Firestore 잠금은 별도 승인 대상)

**단계 관계**: 최소 권장 **1단계는 Auth + `admin/state.json` 읽기뿐이고 쓰기는 0**이다.
"저장만(B1)"은 **향후 쓰기 단계를 열 경우의 정책 권장안이지 현재 구현 허가가 아니다.**
**쓰기 계약은 Founder가 쓰기 단계 착수를 별도로 승인하기 전에는 작성하지 않는다.**

Founder가 위를 명시적으로 결정하기 전에는 **결정 문서 작성도, 구현도, Codex 구조 결정(X-1~X-7)도
시작하지 않는다.** 실제 Firebase/network/live/emulator/Rules/Hosting/deploy 실행과 변경도 금지한다.
자동화 루프는 삭제된 상태이며 **새 자동화나 반복 작업을 만들지 않는다**.

알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 건드리지 않는다.
