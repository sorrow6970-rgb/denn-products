# 스펙 055 후보 — space proof image와 view-only frame plan 경계 조사

상태: **CLAUDE_WORKING / IMPLEMENTATION_APPROVED / LOCAL_ONLY / NO_NETWORK**

Founder 승인(2026-08-19): **T-1=A, T-2=A, T-3=A, T-4=A, T-5=A**.

## 1. 목적

스펙 054의 `requires-proof-resolution` 이후를 실제 이미지 요청 전에 분리한다. 이번 단위는 현재
Storage URL·Rules·image owner·frame plan 계약을 읽기 전용으로 대조하고 결정 선택지만 작성한다.
제품 코드, 실제 Firebase/network/image load/UI/renderer는 변경하지 않는다.

## 2. 확인된 사실

### 2.1 발급된 사진은 Firebase download URL이다

레거시 `uploadDataUrl()`은 `proofs/...` ref에 `uploadString(..., 'data_url')` 후
`getDownloadURL(snap.ref)` 결과를 scene에 저장한다(`denn-mockup-tool.html:15555-15563`). 발급 시 기존
사진 source가 data URL이 아니면 그 source를 그대로 저장하는 분기도 있다
(`denn-mockup-tool.html:15725-15730`). 따라서 과거 scene의 모든 photoUrl이 `proofs/`라고 증명할 수는
없다. 안전한 rebuild는 외부/다른 prefix URL을 호환 추측하지 않고 fail-closed할 수 있다.

### 2.2 현재 일반 image trust는 proof 전용이 아니다

`resolvePublicImageSource`는 HTTPS, `firebasestorage.googleapis.com`, 정본 bucket path, userinfo 부재만
검사한다(`packages/firebase/src/public-images/trust.ts:24-62`). encoded object path가 `proofs/`인지,
query가 media download 형태인지 검사하지 않는다. 따라서 template/published URL용 기존 함수를 그대로
space proof 권위로 사용할 수 없다.

현재 `storage.rules`의 `match /proofs/{p=**}`는 public read와 size 제한 write를 허용한다
(`storage.rules:59`). 이 사실은 URL이 proof prefix인지 판정하는 근거일 뿐, object 존재·실제 MIME·이미지
decode·CORS-clean Canvas를 local resolver가 증명한다는 뜻이 아니다. 이 네 항목은 **NOT TESTED**다.

### 2.3 실행 가능한 URL 매핑

정본 REST 형태는 `/v0/b/{bucket}/o/{encodeURIComponent(objectPath)}?alt=media`다
(`packages/firebase/src/public-catalog/location.ts:21-28`). 따라서 전용 resolver 후보는:

1. HTTPS + exact host + exact bucket segment + userinfo/fragment 없음
2. `/o/` 뒤 segment를 `decodeURIComponent`로 정확히 한 번 decode
3. decoded path가 `proofs/`로 시작하고 뒤에 non-empty object name 존재
4. `alt=media` 정확히 하나, token은 없거나 non-empty 하나, unknown/duplicate query 거부

이다. double-encoded `proofs%252F...`는 한 번 decode 뒤 `proofs%2F...`라 거부된다. 성공값만 원본 src를
image owner에 넘기고 실패는 URL/token 없는 고정 code만 반환해야 한다. object name의 실제 존재나
download 성공은 resolver 범위 밖이다.

### 2.4 현재 plan에는 URL을 직접 넣을 수 없다

render executor의 `imageRef`는 메모리 lookup key이며 URL로 해석하지 않는다
(`apps/mockup/src/canvas/executePreviewPlan.ts:7`, `:270-279`). `buildFrameProductPlan`도 positive intrinsic
size, synthetic imageRef와 normalized transform을 요구한다
(`apps/mockup/src/canvas/productPlan.ts:329-390`, `:465-499`). 따라서 순서는 URL trust → CORS-first image
owner load/decode → intrinsic size와 synthetic ref → geometry/plan이어야 한다.

기존 `templateArtBinding`은 remote source에서 `crossOrigin='anonymous'`를 src보다 먼저 지정하고,
generation/late result/dispose와 safe error를 검증한다(`apps/mockup/src/canvas/templateArtBinding.ts`). 동작
패턴은 재사용할 수 있지만 template artwork라는 소유 의미와 space proof photo lifecycle은 다르므로,
editable `PreviewComposer`에 억지로 연결하거나 owner 이름만 바꿔 공유하는 결정은 아직 승인되지 않았다.

### 2.5 neutral transform만 현재 의미가 대응한다

두 모델 모두 image cover를 기준으로 scale 1, center x/y 0, rotation 0이 neutral 상태다. 반면 nonzero legacy
x/y는 Canvas px이고 현재 x/y는 maxPan 대비 normalized 비율이라 변환 근거가 없다(스펙 054 §2.3).
따라서 첫 view-only plan 후보는 `scale===1 && x===0 && y===0 && (rot absent 또는 0)`만 허용할 수 있다.
다른 값은 clamp/default/부분 표시하지 않고 `UNSUPPORTED_TRANSFORM`으로 닫아야 한다. 실제 과거 scene 중
neutral 비율은 **NOT TESTED**다.

### 2.6 view-only renderer는 별도 composition이 필요하다

현재 `PreviewComposer`는 file picker, color/text edit, pan/zoom/rotation, print export를 소유한다
(`apps/mockup/src/preview/PreviewComposer.tsx:148-310`). space gate ready snapshot과 public catalog load,
proof image owner, geometry projector, optional template art owner, plan builder를 조합하는 별도 view-only
controller/component가 없다. image load 실패나 geometry/template art/text measurement 실패 때 부분 화면을
성공으로 보이면 기존 시안과 다른 결과가 되므로 whole-frame fail-closed가 필요하다.

room/gallery가 미지원이므로 frame plan 성공도 전체 space replay 완료는 아니다.

## 3. 안전한 단계 분리

### V2-A — 순수 proof URL resolver + transform eligibility

- pure/synchronous, URL parse 외 IO 0
- exact known bucket + decoded `proofs/` prefix + constrained media query
- 성공에만 src, 실패에는 raw URL/token 0
- neutral transform만 `identity-supported`, 나머지는 `unsupported`
- App/UI/image owner/plan 변경 0

### V2-B — 전용 remote proof image owner

- `crossOrigin='anonymous'` before src, positive natural size, synthetic imageRef
- duplicate load, replacement, late load/error, dispose, StrictMode lifecycle, safe error
- resolver 성공 src만 입력; owner가 URL 정책을 재해석하지 않음
- 실제 network 대신 injected fake/unit 우선

### V2-C — view-only frame plan composition

- catalog/scene 재검증 → V1 refs → proof resolver → owner ready → frame geometry → plan
- neutral transform만 current identity로 투영
- scene text는 기존 text-zone 계약으로 exact 적용하되 measurement/font 실패는 whole-frame failure
- template art도 필요하면 기존 trust/owner가 ready인 경우만 plan 생성
- edit/file input/print/order/Kakao/room/gallery 0, replay complete 주장 0

## 4. Founder 결정 선택지

### T-1 — proof URL trust

- **A (권장):** exact Firebase REST host/bucket + once-decoded `proofs/` prefix만 허용한다. 외부 URL과 다른
  prefix는 fail-closed한다.
- B: 기존 일반 Firebase image trust를 재사용한다. 다른 public prefix를 proof로 오인할 수 있다.

### T-2 — query 계약

- **A (권장):** `alt=media` 정확히 하나, optional non-empty token 하나만 허용하고 unknown/duplicate query와
  fragment를 거부한다.
- B: query 전체를 허용한다. 실제 download URL에 필요하지 않은 표면이 넓어진다.

### T-3 — transform 지원

- **A (권장):** exact neutral transform만 identity로 지원하고 나머지는 fail-closed한다.
- B: nonzero 값을 clamp/copy한다. legacy px와 normalized 단위 차이를 해결하지 못한다.

### T-4 — 다음 구현 단위

- **A (권장):** V2-A pure resolver/eligibility와 unit까지만 구현한다. network/UI/plan 0.
- B: V2-A~C를 한 번에 구현한다. owner lifecycle과 composition 실패 경계가 함께 열려 검증 범위가 크다.

### T-5 — future renderer 소유

- **A (권장):** editable PreviewComposer와 분리된 view-only controller/component를 사용한다.
- B: PreviewComposer를 read-only props로 확장한다. 편집/print 상태와 원격 scene lifecycle이 결합된다.

## 5. T-1~T-5=A의 최소 다음 허용 범위

- `apps/mockup/src/space/proof-image.ts`와 unit 또는 동등한 pure local 경계
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log
- package/lockfile, App/UI, Firebase SDK/facade, image owner, Canvas/plan, Rules/config/E2E 변경 0

## 6. 계속 금지와 미확인

실제 Firebase/project/bucket/object/network, 이미지 fetch/decode, App/UI/Canvas/renderer/room/gallery,
Rules/config/deploy/write/delete/publish, external URL fallback, transform clamp/추측, 신규 dependency는 금지다.

- 실제 space photo URL 분포·neutral transform 비율: **NOT TESTED**
- proof object 존재/MIME/bytes/CORS/image natural size: **NOT TESTED**
- token 없는 public media URL의 기존 scene 사용 여부: **NOT TESTED**
- nonzero transform 변환: **UNCONFIRMED**
- full view-only frame 및 room/gallery replay: **NOT IMPLEMENTED**

## 7. 결론

현재 local 근거로 안전하게 여는 최소 단위는 V2-A다. T-1~T-5 결정 전 구현하지 않는다.

## 8. 승인된 V2-A 구현 계약

- `resolveSpaceProofImageUrl(unknown)`은 exact HTTPS REST host/bucket/object/query를 동기 검증한다.
- `/o/` 뒤에는 slash 없는 단일 encoded segment만 허용하고 `decodeURIComponent`를 한 번 적용한 뒤
  `encodeURIComponent` canonical roundtrip을 확인한다. decoded path는 `proofs/` + non-empty suffix여야 한다.
- query key는 exact `alt`, `token`만 허용한다. `alt=media` 정확히 하나가 필수이고 token은 없거나 non-empty
  하나다. duplicate/unknown query, fragment, userinfo, custom port는 거부한다.
- 성공에만 원본 src를 반환한다. 실패 code에는 URL/object/token을 넣지 않는다. fetch/SDK/DOM은 0이다.
- `resolveSpaceProofTransform(unknown)`은 plain finite object이며 `scale===1`, `x===0`, `y===0`,
  `rot===undefined || rot===0`인 경우에만 current identity transform을 반환한다. null/malformed는 invalid,
  valid non-neutral은 unsupported다. clamp/default/coercion은 0이다.
- hostile getter/Proxy는 안전 실패하고 입력을 변경하지 않는다.

허용 파일은 `apps/mockup/src/space/proof-image.ts`, 해당 unit, 이 스펙과 spec 055 handoff/상태 문서뿐이다.
App/UI/image owner/Canvas/plan/Firebase SDK/Rules/config/E2E/package/lockfile 변경은 승인되지 않았다.
