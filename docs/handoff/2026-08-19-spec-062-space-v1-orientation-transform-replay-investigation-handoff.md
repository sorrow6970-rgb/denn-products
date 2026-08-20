# 스펙 062 space V1 방향·사진 transform 재현 차단 및 Claude UI/UX handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_UNIT_ONLY / NO_NETWORK / UI_IMPLEMENTATION_0`
- 정본: `docs/rebuild/specs/062-space-v1-orientation-transform-replay-investigation.md`
- 구현: `a09278a` (`spec 062: block unproven v1 frame replay`)

## 핵심 발견

- V1 scene은 `frameImgT`는 저장하지만 portrait/landscape mode, capture canvas/zone/image basis,
  catalog revision/geometry fingerprint를 저장하지 않는다.
- legacy x/y는 absolute logical Canvas px이고 현재 x/y는 maxPan 기준 normalized 값이다.
- `rot=0`은 portrait와 unrotated landscape를 구분하지 못한다.
- 따라서 현재 identity-looking transform 성공도 전체 frame exact replay를 증명하지 않는다.
- 실제 운영 Firebase/network/data는 조회하지 않았고 스펙 061은 deploy되지 않았다.

## Founder 결정과 구현

- FF-1=A~FF-5=A 승인.
- pure classifier가 malformed/unsupported/orientation-unconfirmed를 safe code로 분리한다.
- frame plan은 catalog/width/proof/template-art/text-measure/Canvas plan 전에 V1을 fail-closed한다.
- targeted 59/59, 전체 non-network check PASS(unit 1612/1612), production build PASS.
- 고객 entry `index-Df973d19.js` 320,713 bytes, SHA-256
  `4389D6D60367314FF80FC0793E1085C6646DAD946FA23CA2A3911013331A2453`.
- browser/E2E 실행·수정, UI/CSS/문구 변경, Firebase/network/write/deploy는 0이다.

## Claude 다음 수동 범위

이제 V2 발급 화면, V1 안전 오류/재발급 안내, orientation 선택·표시는 실제 UI/UX 단계다. 사용자 지시에
따라 Codex는 구현하지 않는다. Claude는 구현 전에 다음을 스펙으로 고정한다.

1. V1은 best-effort Canvas, 자동 fallback, 자동 migration 없이 안전 오류로 유지한다.
2. V2는 새 immutable token과 별도 scene version을 사용한다. V1 reader와 기존 token을 변경하지 않는다.
3. explicit orientation, normalized transform, geometry/catalog evidence의 정확한 비시각 schema/fingerprint가
   미확정이면 임의 정의하지 않고 STOP한다.
4. admin issuer의 orientation 선택·재현 가능성 안내와 viewer의 exact/partial/unsupported 상태를 Modern Studio
   디자인 정본에 맞춰 설계한다. 기존 browse/preview UI를 범위 밖에서 바꾸지 않는다.
5. 스펙 061 production-route E2E의 V1 Canvas 성공 기대를 안전 오류 기대값으로 갱신하고 모든 HTTPS
   catch-all 차단과 외부 egress 0을 유지한다.
6. 실제 Firebase/project/token/network/write/deploy, 운영 데이터, same-token rewrite는 금지한다.

Claude 구현 후 Codex는 계약·안전 경계·회귀 게이트를 독립 검수한다.

## NOT TESTED

운영 V1 scene 분포, historical catalog/orientation flag, 실제 pixel parity, Firebase/network/CORS/mobile/font,
V2 schema/fingerprint/issuer/migration/UI/deploy는 NOT TESTED/NOT IMPLEMENTED 또는 미결정이다.
