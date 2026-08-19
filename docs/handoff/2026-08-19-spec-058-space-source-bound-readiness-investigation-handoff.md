# 스펙 058 source-bound readiness adapter 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / LOCAL_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/058-space-source-bound-readiness-investigation.md`
- 기준: 스펙 057 종료 `1e8e1bb`

## 확인 결과

- 기존 owner ready state는 source를 노출하지 않아 그 자체로 현재 scene과의 동일성을 증명하지 못한다.
- 안전한 adapter는 owner를 독점 소유하고 exact source + ready snapshot + binding 존재를 함께 확인해야 한다.
- replacement/clear/dispose는 tracked source를 먼저 무효화하고 기존 owner generation에 late result 차단을
  맡겨야 한다.
- 현재 space route에는 post-auth catalog/layout/font/Canvas composition이 없어 React/UI 연결은 별도 계약이다.

## Founder 결정 대기

권장값은 **BB-1=A, BB-2=A, BB-3=A, BB-4=A, BB-5=A**다.

- BB-1=A: framework-free adapter + unit
- BB-2=A: adapter의 raw owner 독점 소유
- BB-3=A: exact source + ready + binding 전부 요구
- BB-4=A: source-first lifecycle + combined subscribe/composite bindings
- BB-5=A: 기존 owner/hook/App/UI/E2E 변경 0

결정 전 구현하지 않는다. 실제 Image/network/CORS/React/catalog/layout/font/Canvas/UI/deploy는 미검증/금지다.
