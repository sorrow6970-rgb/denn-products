# 스펙 059 post-auth view composition 조사 handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/059-space-post-auth-view-composition-investigation.md`
- 기준: 스펙 058 종료 `60a1677`

## 확인 결과

- space route는 password 성공 뒤에도 public catalog를 load하지 않아 frame plan 입력이 없다.
- readiness adapter에 전달할 proof/art source를 한 경계에서 결정하는 pure projector가 없다.
- layout은 measured content box, text는 fonts.ready/check + 2D measure, Canvas는 plan success 뒤에만 가능하다.
- 첫 구현에서 React/network/Image/Canvas를 열면 lifecycle이 너무 많이 결합된다.

## Founder 결정

권장값은 **CC-1=A, CC-2=A, CC-3=A, CC-4=A, CC-5=A**다.

- CC-1=A: catalog는 post-auth child mount 뒤만
- CC-2=A: pure asset-request projector, whole request success 뒤 load
- CC-3=A: measured width + existing helper
- CC-4=A: exact font gate + plan-ready Canvas only
- CC-5=A: 첫 구현은 projector + unit만

Founder는 **CC-1=A, CC-2=A, CC-3=A, CC-4=A, CC-5=A**를 승인했다.

## 구현·검증

- 구현 `3c5b3ed`: `frame-asset-request.ts`와 unit만 추가했다.
- detached catalog snapshot을 사용하고 proof/art가 모두 유효할 때만 source를 반환한다.
- targeted 11/11, 전체 unit 1602/1602, Chromium 143/143, format/lint/typecheck/build PASS.
- 고객 entry SHA-256 `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB` 동일.
- 실제 network/Image/React/layout/font/Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.
