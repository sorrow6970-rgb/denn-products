# 스펙 055 space proof image·view-only plan 조사 handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/055-space-proof-image-view-plan-investigation.md`
- 기준: 스펙 054 종료 `8c70a46`

## 확인 결과

- 기존 image trust는 known bucket만 보고 `proofs/` prefix/query를 검증하지 않는다.
- proof URL은 once-decoded object path와 media query를 분리 검증해야 한다.
- render plan에는 URL이 아니라 loaded drawable의 synthetic imageRef와 intrinsic size가 필요하다.
- 정확히 neutral인 legacy transform만 현재 identity transform과 대응하며 nonzero 변환은 UNCONFIRMED다.
- editable PreviewComposer와 별도 view-only composition이 필요하다.

## Founder 결정과 완료

- T-1=A: exact bucket + decoded `proofs/` prefix
- T-2=A: exact-one `alt=media`, optional single token, 나머지 query/fragment 거부
- T-3=A: exact neutral transform만 지원
- T-4=A: V2-A pure resolver/eligibility + unit만
- T-5=A: future renderer는 editable composer와 분리

구현 `82d89ce`. targeted 38/38, 전체 check unit 1552/1552, Chromium 143/143 PASS. 고객 entry/hash
동일. 실제 Firebase/network/object/image/CORS/owner/plan/UI/renderer/Rules/deploy는 NOT TESTED/미구현이다.
다음 후보는 V2-B remote proof image owner 경계 조사이며 자동 시작하지 않는다.
