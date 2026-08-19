# 스펙 053 space production composition 조사 handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_GATED / NO_NETWORK`
- 정본: `docs/rebuild/specs/053-space-production-composition-investigation.md`
- 기준: 스펙 052 구현 `49f51fb`, 종료 문서 `6116a17`

## 확인 결과

- 현재 production App은 space query 분기 없이 catalog를 즉시 load한다.
- controller/read/open은 준비됐지만 React UI, env config, lazy production factory, scene application port는 없다.
- 레거시 replay는 전역 DOM/Canvas 상태를 직접 조작하므로 그대로 이식할 수 없다.
- scene ID/URL/opaque room 설정은 현재 catalog/CORS/renderer와 아직 대조되지 않았다.

## Founder 결정

- R-1=A 권장: space mode 독점, invalid fail-closed, 일반 browse/factory 0
- R-2=A 권장: exact-true + complete config, explicit submit lazy named app
- R-3=A 권장: 첫 단위는 password gate와 safe ready snapshot까지만
- R-4=A 권장: 후속 catalog 검증 + view-only scene application 계약

## 구현 완료

- Founder R-1=A/R-2=A/R-3=A/R-4=A 승인.
- space 독점 mode, exact-true complete config, submit lazy facade, password UI와 StrictMode lifecycle 구현.
- 일반 browse는 no-space에서만 mount하며 invalid/disabled config의 Firebase request는 Chromium에서 0.
- targeted 32/32, unit 1495/1495, Chromium 143/143 PASS.
- 고객 entry `index-Det4NToI.js` 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 커밋 `5e4be63`. 실제 Firebase/network/config/deploy/scene 적용은 계속 금지다.
