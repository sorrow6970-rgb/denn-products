# 스펙 060 post-auth frame view 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / LOCAL_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/060-space-post-auth-frame-view-investigation.md`
- 기준: 스펙 059 종료 `4fb30cc`

## 확인 결과

- 인증 성공 뒤에만 catalog hook을 mount할 별도 child가 필요하다.
- source-bound readiness controller는 영구 dispose형이라 StrictMode-safe React owner wrapper가 필요하다.
- measured logical width, conditional exact-font gate, current plan-only Canvas를 하나의 derived status로 합쳐야 한다.
- 실제 production App 연결 전에 injectable 합성 browser fixture가 안전하다.

## Founder 결정 대기

권장값은 **DD-1=A, DD-2=A, DD-3=A, DD-4=A, DD-5=A**다.

- DD-1=A: ready-only child, scene만 전달
- DD-2=A: source-bound controller 전용 StrictMode-safe hook
- DD-3=A: measured width + conditional exact-font gate
- DD-4=A: 단일 fail-closed derived status, stale Canvas 0
- DD-5=A: injectable view/browser fixture만, production App 연결 0

결정 전 구현하지 않는다. 실제 Firebase/network/production connection/deploy는 금지다.
