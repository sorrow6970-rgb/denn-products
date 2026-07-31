# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 스펙 032 사전 조사(인쇄/내보내기) 완료 — Codex 검토 대기

Claude Code가 2026-07-31에 **Founder 지시로 자동 전환**해 읽기 전용 조사만 수행하고 문서 전용으로
커밋해 일반 fast-forward push했다.

- 보고서: `docs/codex-claude-handoff/reviews/2026-07-31-print-export-investigation.md`(12항목)
- 기준 HEAD `b763174`
- 제품 코드·테스트·CSS·설정·manifest·lockfile diff **0**, 신규 의존성 0,
  network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

## 운영 규칙 갱신 (Founder, 2026-07-31)

개별 스펙 `DONE`에서 멈추지 않고 **다음 권장 스펙의 읽기 전용 조사로 자동 전환**한다.
**구현은 조사 승인과 필요한 Founder 결정 뒤에만** 시작한다.
자동화는 **전체 리빌드 DONE 또는 Founder의 명시적 중단**에서만 멈춘다.
다음 스펙은 **스펙 019 §506의 후속 순서**를 근거로 고른다.

## 핵심 발견 (검토 우선순위)

1. **인쇄 경로가 두 세대다** — 케이스는 V36 구경로, 액자만 V365. 해상도 산식도 텍스트 처리도 다르다.
2. **★ 액자의 물리 치수를 이름 텍스트로 추측한다** — 사이즈 이름을 바꾸면 인쇄 해상도가 바뀔 수 있다.
   카탈로그 스키마에 cm 필드가 없다.
3. **★ 경고가 주문을 막지 않는다** — 아트가 빠진 PNG가 그대로 주문으로 나간다.
4. **회전(030)은 인쇄에서 무시**되고, **시계(031 F-4) 제외는 정상**이다.
5. 리빌드는 인쇄 코드 0줄이지만 재료는 모두 있다. 인쇄는 **같은 plan을 인쇄 해상도로 다시 만드는 것**이며,
   **인쇄 폭 재생성 + 미리보기 `lines` 재사용**을 권고한다.

## Codex 다음 작업

조사 보고서를 검토해 **Founder 결정 요청(P-1~P-6)** 과 **Codex 구조 결정(C-1~C-8)** 을 확정하고,
구현 스펙(또는 추가 조사 지시)을 작성한다. 특히 다음은 제품 정책이라 Founder 승인이 필요하다.

- **P-2 인쇄 물리 치수를 어디서 얻는가** — 이름 파싱을 계속 쓸 수 없다면 카탈로그 스키마 확장이
  필요하고 admin 스펙이 동반된다
- **P-3 경고가 있으면 인쇄를 만들 것인가** — 미리보기는 이미 fail-closed다
- **P-5 주문 payload에 선택 내용을 담을지** — 고객 문구는 개인정보라 보존 범위 결정이 필요하다

## Claude 다음 작업

**없다.** 구현 계약이 Git 히스토리에 기록되고 상태가 `WAITING_FOR_CLAUDE`로 바뀌기 전까지 인쇄 관련
제품 코드·테스트·CSS·설정을 작성하지 않는다. 계약이 untracked면 Founder 상시 승인에 따라 계약과 Codex
전환 문서만 대행 커밋한 뒤 착수한다. 알려진 스펙 018 PNG 2개와
`packages/render/src/plan/index.ts`는 계속 손대지 않는다.
