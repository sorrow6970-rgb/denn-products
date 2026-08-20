# 스펙 064 space V2 frame replay evidence 조사 handoff

- 상태: `IMPLEMENTED / READY_FOR_CODEX / LOCAL_ONLY / NO_NETWORK / NO_UI`
- 정본: `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`
- Founder 결정 정본:
  `docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`
- 기준 HEAD: `2b8424e` (스펙 063 종료)

## 결론

V2에는 orientation만 추가해서는 부족하다. 현재 frame plan은 발급 시 logical width, effective aspect,
border/mat/inset, selected frame color, proof intrinsic/transform과 text/art/clock 상태에 의존한다.
전체 catalog hash는 실제 plan 영향 범위보다 넓고 unrelated 변경으로 link를 깨므로, 닫힌 versioned
`FrameReplayEvidenceV1` snapshot + canonical SHA-256이 권장 후보다.

SHA-256은 운영자 서명이나 backend attestation이 아니다. operator-issued 제한은 V2 Firestore create의
approved UID Rules가 별도로 맡아야 한다.

현재 `proofs/**`는 create/update/delete를 모두 허용하므로 immutable V2 asset으로 쓸 수 없다. 권장 후보는
`rebuild-space-assets/objects/{uuid}.png` create-only/public-read이며 encrypted scene이 object path,
bytes digest/length, PNG content type와 intrinsic dimensions를 가진다. upload와 Firestore create는
cross-service atomic이 아니므로 upload-first 뒤 document failure orphan을 수용하고 delete/정리는 별도
Founder 정책으로 둔다.

## Founder 결정

Founder가 **GG-1=A, GG-2=A, GG-3=A, GG-4=A, GG-5=A, GG-6=A**를 승인했다.

- `space-v2`/`space-scene-v2`, 새 UUID token, V1 무변경
- whole catalog가 아닌 closed evidence snapshot + canonical SHA-256
- 첫 capability는 image-only single-rect frame; text/art/clock/room unsupported
- 향후 새 UUID PNG create-only asset path + encrypted digest/metadata
- V1 create는 유지하고 향후 V2만 approved UID/exact outer keys
- 첫 구현은 local `@denn/spaces` reader/encoder/hash fake unit만

## 첫 구현 포인터

- 허용 제품 파일: 신규 `packages/spaces/src/v2.ts`, 신규 `packages/spaces/src/v2.test.ts`,
  `packages/spaces/src/index.ts` V2 명시 export
- strict V2 document/scene reader, fixed-position tuple UTF-8 encoder, injected/local Web Crypto SHA-256와
  safe digest create/verify만 구현한다.
- evidence tuple은 orientation, canonical logical width/geometry, normalized transform, immutable proof path와
  proof digest/length/intrinsic dimensions를 묶는다. digest는 signature/attestation이 아니다.
- 기존 V1 constants/read/open 결과를 바꾸지 않는다. Firebase/network/DOM/React/Canvas 호출은 0이다.
- targeted spaces unit/typecheck와 `node scripts/check.mjs`를 실행한다. 전체 Chromium 실행이 보호 PNG를
  다시 써도 restore/checkout/stage/commit하지 않는다.

## 계속 금지

GG-4/GG-5의 방향 승인은 Rules 구현·배포 승인이 아니다. 실제 Firebase/network/project/bucket/object/UID,
Rules/config/deploy, Storage upload/Firestore create, admin/customer UI, V1 migration, orphan delete/cleanup,
C6/room/gallery 확장, 신규 dependency는 계속 금지다.

실제 운영 asset 크기·발급량·orphan 비용·UID·pixel parity는 UNCONFIRMED 또는 NOT TESTED다.

## 구현·검증 결과

- 허용 제품 파일 3개만 변경했다: `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts`.
- V2 reader는 모든 nested exact key와 값 범위를 fail-closed하고, encoder는 detached one-read snapshot을
  fixed-position tuple의 UTF-8 bytes로 만든다.
- digest create/verify는 injected port 또는 local Web Crypto만 쓰며 hash failure/bad length/mismatch를
  safe code로 구분한다. 구조 reader가 crypto/network/viewer를 자동 시작하지 않는다.
- targeted **107/107**, 전체 check unit **1696/1696**, Chromium **151/151** PASS.
- 고객 entry `index-6js4DafP.js` **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 기준과 동일하다.
- Rules/Firebase/UID/issuer/viewer/UI/upload/emulator/deploy는 계속 미구현·미검증이다.
