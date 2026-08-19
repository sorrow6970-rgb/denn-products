# 스펙 054 space scene application 경계 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK`
- 정본: `docs/rebuild/specs/054-space-scene-application-boundary-investigation.md`
- 기준: 스펙 053 구현 `5e4be63`, 종료 문서 `f0600a3`

## 핵심 발견

- scene은 frame-only이며 case/model/zone 정보가 없다.
- tpl/size/color는 catalog와 아직 대조되지 않았다.
- legacy imgT x/y는 Canvas px, 현재 x/y는 normalized maxPan 비율이다. capture 크기가 없어 정확 변환은
  UNCONFIRMED다.
- proof URL은 별도 `proofs/` prefix trust가 필요하다.
- editable PreviewComposer는 view-only renderer가 아니며 room/gallery renderer는 없다.

## Founder 결정

- S-1=A 권장: 다음은 V1 순수 참조 검증기만
- S-2=A 권장: frame-only + 필수 exact 참조, fallback 0
- S-3=A 권장: exact ID/fill → canonical solid, grain/모호성 거부
- S-4=A 권장: transform validated-but-unapplied, clamp/복사 0
- S-5=A 권장: room/gallery unsupported, 완료로 간주하지 않음

결정 전 구현 0. 실제 network/image/UI/renderer/room/deploy는 계속 금지다.
