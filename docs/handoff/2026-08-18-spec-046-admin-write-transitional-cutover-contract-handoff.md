# 스펙 046 단계적 cutover 계약 handoff

상태: **FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_DEPLOY**

- Founder K-1=A/K-3=A를 기록했다.
- Firestore transitional → Storage transitional → write-disabled app → 제한 활성화 → legacy close의
  목표 단계를 정의했다.
- actual-write 전/후 rollback을 분리하고, 후에는 legacy fallback/write-back을 금지했다.
- 실제 UID와 비용 상한이 없어 P1/P4는 차단 상태다.
- 남은 결정은 L-1 비용·관찰 계약, L-2 dual-window legacy 접근, L-3 canary/close 기준이다.
- 제품 코드·Rules/config/test/package/lockfile 변경과 실제 Firebase/network/deploy/write는 0이다.
