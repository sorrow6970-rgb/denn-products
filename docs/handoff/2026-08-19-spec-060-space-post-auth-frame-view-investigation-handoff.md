# 스펙 060 post-auth frame view 완료 handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK / PRODUCTION_APP_NOT_CONNECTED`
- 정본: `docs/rebuild/specs/060-space-post-auth-frame-view-investigation.md`
- 조사: `e19c8f5`
- 구현: `6670fb3`
- StrictMode 보완: `98f4430`

## Founder 결정과 결과

Founder 승인 **DD-1=A~DD-5=A**에 따라 ready-only scene seam, injectable post-auth frame view,
source-bound owner hook, measured content width, conditional exact-font gate와 합성 browser fixture를 구현했다.
current catalog/asset/owner/width/font/plan이 모두 성공한 경우에만 Canvas를 mount한다.

자체 검수에서 StrictMode의 state initializer 이중 호출이 effect 밖 owner를 만들 수 있는 결함을 발견했다.
initializer를 inert하게 바꾸고 실제 controller를 effect setup 안에서 생성·동일 cleanup에서 dispose하도록
수정했다. fixture는 development React의 실제 StrictMode replay와 추가 unmount/remount를 검증한다.

## 검증

- `pnpm check`: PASS, unit 1608/1608
- Chromium E2E: 145/145
- 외부 fixture request 0, owner subscription/포트/temp 잔류 0
- 고객 entry SHA-256:
  `C724A8941A5935A685B624EB3DF4A7081EEB8778E83C92BCB8CF7073D3C6B758`

## 계속 닫힌 경계

production `App.tsx` 연결, 실제 Firebase/network/CORS/운영 object, 실제 다양한 폰트·viewport 시각 검증,
편집·인쇄·주문·발행·write/delete/deploy는 수행하지 않았다. 다음 작업은 자동 시작하지 않는다.
