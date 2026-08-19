# 스펙 062 space V1 방향·사진 transform 재현 조사 handoff

- 상태: `FOUNDER_DECISION_REQUIRED / DOCUMENT_ONLY / NO_NETWORK / UI_IMPLEMENTATION_0`
- 정본: `docs/rebuild/specs/062-space-v1-orientation-transform-replay-investigation.md`
- 기준: `ce7d819` (스펙 061 종료)

## 핵심 발견

- V1 scene은 `frameImgT`는 저장하지만 portrait/landscape mode, capture canvas/zone/image basis,
  catalog revision/geometry fingerprint를 저장하지 않는다.
- legacy x/y는 absolute logical Canvas px이고 현재 x/y는 maxPan 기준 normalized 값이다.
- `rot=0`은 portrait와 unrotated landscape를 구분하지 못한다.
- 따라서 현재 identity-looking transform 성공도 전체 frame exact replay를 증명하지 않는다.
- 실제 운영 Firebase/network/data는 조회하지 않았고 스펙 061은 deploy되지 않았다.

## 권장 Founder 결정

- FF-1=A: evidence 없는 V1 exact replay fail-closed
- FF-2=A: centered zoom은 orientation/geometry가 별도 증명될 때만 조건부, heuristic pan/rot 변환 0
- FF-3=A: future explicit orientation + normalized encoding + geometry evidence의 새 version
- FF-4=A: V1 자동 migration/same-token rewrite 0
- FF-5=A: 첫 correction은 pure classifier/plan gate/unit만, UI/CSS/issuer/network 0

FF-1~FF-5 결정 전 제품 구현은 0이다. pure correction 이후 V2 발급·표시 단계는 실제 UI/UX 구현이므로
Codex가 구현하지 않고 Founder에게 알린 뒤 Claude로 인계한다.

## NOT TESTED

운영 V1 scene 분포, historical catalog/orientation flag, 실제 pixel parity, Firebase/network/CORS/mobile/font,
V2 schema/issuer/migration/deploy는 NOT TESTED 또는 미결정이다.
