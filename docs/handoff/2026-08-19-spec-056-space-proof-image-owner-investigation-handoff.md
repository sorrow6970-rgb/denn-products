# 스펙 056 space proof image owner 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/056-space-proof-image-owner-investigation.md`
- 기준: 스펙 055 종료 `a54e27b`

## 확인 결과

- plan/executor는 URL이 아닌 decoded drawable의 synthetic ref를 요구한다.
- template-art owner lifecycle은 참고 가능하지만 proof trust 재검증과 intrinsic ready snapshot이 없다.
- dedicated owner는 resolver 재검증, CORS-before-src, one-active generation, safe state/binding을 소유해야 한다.
- fake unit은 순서와 lifecycle만 증명하며 실제 network/CORS/decode는 증명하지 않는다.

## Founder 결정

- V-1=A 권장: proof 전용 framework-free controller
- V-2=A 권장: owner 내부에서 spec055 trust 재검증
- V-3=A 권장: anonymous CORS, src 1회, retry/cache/fallback 0
- V-4=A 권장: one-active generation + safe intrinsic/binding
- V-5=A 권장: controller/fake unit만, hook/App/network/plan 0

결정 전 구현하지 않는다.
