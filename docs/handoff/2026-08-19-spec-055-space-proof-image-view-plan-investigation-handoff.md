# 스펙 055 space proof image·view-only plan 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/055-space-proof-image-view-plan-investigation.md`
- 기준: 스펙 054 종료 `8c70a46`

## 확인 결과

- 기존 image trust는 known bucket만 보고 `proofs/` prefix/query를 검증하지 않는다.
- proof URL은 once-decoded object path와 media query를 분리 검증해야 한다.
- render plan에는 URL이 아니라 loaded drawable의 synthetic imageRef와 intrinsic size가 필요하다.
- 정확히 neutral인 legacy transform만 현재 identity transform과 대응하며 nonzero 변환은 UNCONFIRMED다.
- editable PreviewComposer와 별도 view-only composition이 필요하다.

## Founder 결정

- T-1=A 권장: exact bucket + decoded `proofs/` prefix
- T-2=A 권장: exact-one `alt=media`, optional single token, 나머지 query/fragment 거부
- T-3=A 권장: exact neutral transform만 지원
- T-4=A 권장: 다음은 V2-A pure resolver/eligibility + unit만
- T-5=A 권장: future renderer는 editable composer와 분리

실제 network/image/UI/renderer/Rules/deploy는 0. 결정 전 구현하지 않는다.
