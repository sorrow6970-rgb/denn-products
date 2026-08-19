# 스펙 061 production space frame route 연결 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/061-space-production-frame-route-connection-investigation.md`
- 기준: `851ed26` (스펙 060 종료)

## 확인 결과

- production `SpaceRoute`는 gate까지만 연결돼 있고 ready child는 placeholder다.
- 스펙 060의 `SpacePostAuthFrameView`는 ready scene과 catalog reader만 받으면 기존 seam에서 mount할 수 있다.
- 연결 뒤 password 성공 시점부터 고정 public catalog GET과 proof/optional art browser Image read가 열린다.
- 기존 합성 fixture는 모든 port를 대체했으므로 production root와 default catalog/Image 결합은 NOT TESTED다.
- controller factory만 교체하고 fixed catalog/proof URL은 Playwright intercept로 응답하는 좁은 fixture가
  실제 외부 egress 없이 이 공백을 검증할 수 있다.

## 권장 Founder 결정

- EE-1=A: 기존 ready seam에 production frame view 연결
- EE-2=A: controller factory만 좁게 주입
- EE-3=A: catalog 명시 retry 외 자동 retry/fallback 0
- EE-4=A: production root + intercepted fixed URL 합성 browser 검증
- EE-5=A: App/test/fixture/E2E/문서 최소 범위만 구현

EE-1~EE-5 결정 전 제품 구현은 0이다. 실제 Firebase/project/network/CORS/운영 object/config/deploy,
room/gallery/clock/non-neutral transform, 편집·인쇄·주문·발행·write/delete는 계속 금지다.
