# 스펙 061 production space frame route 연결 handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_SYNTHETIC / NO_EXTERNAL_EGRESS / PRODUCTION_APP_CONNECTED`
- 정본: `docs/rebuild/specs/061-space-production-frame-route-connection-investigation.md`
- 조사 기준: `851ed26` (스펙 060 종료)
- 조사 커밋: `4a50004`

## 확인 결과

- production `SpaceRoute`는 gate까지만 연결돼 있고 ready child는 placeholder다.
- 스펙 060의 `SpacePostAuthFrameView`는 ready scene과 catalog reader만 받으면 기존 seam에서 mount할 수 있다.
- 연결 뒤 password 성공 시점부터 고정 public catalog GET과 proof/optional art browser Image read가 열린다.
- 기존 합성 fixture는 모든 port를 대체했으므로 production root와 default catalog/Image 결합은 NOT TESTED다.
- controller factory만 교체하고 fixed catalog/proof URL은 Playwright intercept로 응답하는 좁은 fixture가
  실제 외부 egress 없이 이 공백을 검증할 수 있다.

## Founder 결정

- **EE-1=A:** 기존 ready seam에 production frame view 연결
- **EE-2=A:** controller factory만 좁게 주입
- **EE-3=A:** catalog 명시 retry 외 자동 retry/fallback 0
- **EE-4=A:** production root + intercepted fixed URL 합성 browser 검증
- **EE-5=A:** App/test/fixture/E2E/문서 최소 범위만 구현

## 구현 결과

- `SpaceRoute` ready seam에 `SpacePostAuthFrameView`와 production `publicCatalogReader`를 연결했다.
- production default controller는 유지하고 root에는 합성 검증용 controller factory 하나만 추가했다.
- non-production fixture는 production root/default reader/browser Image owner를 사용한다.
- Playwright는 `/^https:\/\//` catch-all에서 exact catalog/proof URL만 합성 응답하고 그 밖의 HTTPS를
  차단해 실제 외부 egress를 0으로 유지한다.
- pre-auth 요청 0, ready Canvas 1, invalid catalog fail-closed, unmount 뒤 late proof 차단,
  metadata·token·password·URL 비노출과 accessibility serious/critical 0을 검증했다.

## 자체 검수와 최종 게이트

- 첫 문자열 glob catch-all이 모든 HTTPS 요청을 가로채지 못해 신규 E2E가 3개 실패했다. 제품 코드 변경 없이
  정규식 catch-all로 교정했고 최종 Chromium 결과는 **148/148 PASS**다.
- targeted App unit **3/3**, mockup typecheck, targeted format/lint, 전체 check **PASS**.
- 전체 unit **1609/1609**, production build PASS.
- customer entry `index-CVr4hkHb.js`, **322,548 bytes**, SHA-256
  **`E70626F22B181C3BC5DBCE4F5B6B644E3AC026B814ECFAE3AC8D1738D9384334`**.
- `git diff --check` PASS, listen ports 4183/4184/4185/8080/9099/9199 및 `denn-e2e-*` temp 잔류 0.

## 계속 닫힌 경계

실제 Firebase/project/config/token/document, actual catalog/proof/art network, 운영 bucket/CORS/object,
실제 모바일·운영 폰트 시각 정확도는 **NOT TESTED**다. room/gallery/clock/non-neutral transform, 편집·인쇄·
주문·발행·write/delete, Rules/CORS/Hosting 변경과 deploy/cutover는 구현·승인하지 않았다. 다음 단위는 자동
시작하지 않는다.
