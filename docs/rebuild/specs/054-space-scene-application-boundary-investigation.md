# 스펙 054 후보 — space scene application 경계 조사

상태: **FOUNDER_DECISION_REQUIRED / INVESTIGATION_ONLY / NO_NETWORK**

## 1. 목적

스펙 053의 검증된 `SpaceSceneV1` ready snapshot을 실제 고객 화면에 적용하기 전에, 공개 catalog 참조,
사진 transform, proof 이미지 URL, room/gallery 지원 여부를 분리한다. 이번 단위는 조사와 결정 선택지만
기록하며 renderer/UI/network를 구현하지 않는다.

## 2. 확인된 사실

### 2.1 scene은 프레임 전용이다

레거시 `captureScene()`은 `curFTpl`, `curFSz`, `curFCol`, 단일 `frameImgT`만 저장한다
(`denn-mockup-tool.html:15627-15643`). product kind와 case model/zone은 저장하지 않는다. 따라서 현재
`space-scene-v1`을 case scene으로 추론할 근거가 없다.

### 2.2 catalog 참조는 검증되지 않았다

scene의 `tplId`, `sizeId`, `colorId`는 nullable string으로만 읽힌다
(`packages/spaces/src/read.ts:130-168`). 현재 `buildCatalogBrowseIndex`는 visible size와 template의 display/
size compatibility를 구축하지만 scene을 대조하는 API는 없다
(`packages/shared/src/catalog/browse/build.ts:59-190`).

레거시는 color를 `frameColors[].id === colorId || fill === colorId`로 찾는다
(`denn-mockup-tool.html:15826`). 현재 preview의 `readFrameColorOptions`는 solid `#RRGGBB`만 남기고 grain을
제외하며 ID를 버린다(`apps/mockup/src/preview/previewContracts.ts:43-78`). 따라서 ID/legacy fill을 먼저
catalog row에 대조한 뒤 지원 가능한 canonical solid fill로 투영해야 한다.

### 2.3 사진 transform은 현재 모델과 단위가 다르다

레거시 `frameImgT.x/y`는 pointer의 Canvas 좌표에서 직접 계산되는 픽셀 오프셋이다
(`denn-mockup-tool.html:1502-1530`). scene에는 capture 당시 Canvas 크기, zone 크기, 이미지 natural size가
없다. 현재 리빌드 transform의 `x/y`는 현재 scale에서 maxPan에 대한 normalized `[-1,1]` 비율이며 resize
불변이다(`apps/mockup/src/preview/imageTransform.ts:6-26`).

따라서 scene의 finite x/y를 현재 normalized x/y로 그대로 복사하거나 clamp하는 것은 같은 구도를
재현한다는 근거가 없다. nonzero offset의 정확 변환은 현재 payload만으로 **UNCONFIRMED**다. scale은 양쪽
모두 cover 배율 성격이지만 legacy는 0.3까지 허용했던 코드가 남아 있고 현재는 1~5만 허용한다. rot도
scene reader는 임의 finite number를 허용하지만 현재 제품은 quarter-turn만 지원한다.

### 2.4 proof URL은 별도 trust가 필요하다

발급 경로는 data URL 사진을 Storage `proofs/`로 올린 뒤 `photoUrl`에 넣는다
(`denn-mockup-tool.html:15725-15730`). 현재 `resolvePublicImageSource`는 알려진 bucket의 REST host/path를
허용하지만 object prefix를 `proofs/`로 제한하지 않는다
(`packages/firebase/src/public-images/trust.ts:24-62`). space proof는 encoded object path를 정확히
검증하는 별도 resolver가 필요하다. 실제 URL/CORS/object 생존은 **NOT TESTED**다.

### 2.5 editable PreviewComposer는 view-only renderer가 아니다

현재 `PreviewComposer`는 file input, color 선택, pan/zoom/rotation, text 편집, print download를 소유한다.
scene의 원격 사진과 고정 transform을 주입하는 props가 없고 room/gallery 기능도 없다
(`apps/mockup/src/preview/PreviewComposer.tsx:148-310`). 이를 억지로 재사용하면 view-only와 편집 상태가
혼합된다.

레거시 viewer는 `replayScene` 뒤 room canvas를 합성하고 gallery를 별도 렌더한다
(`denn-mockup-tool.html:15821-15984`). 리빌드에는 이에 대응하는 room application/render port가 없다.

## 3. 안전한 단계 분리

### 단계 V1 — 순수 참조 검증기

입력은 `CatalogDocumentV1 + SpaceSceneV1`, 출력은 raw catalog/URL/고객 문구를 포함하지 않는 detached
지원 snapshot 또는 안전 오류 code다.

- frame-only임을 명시하고 tplId/sizeId/colorId null·missing·duplicate/unsupported를 fail-closed
- template과 size compatibility를 현재 catalog 정본으로 검증
- colorId를 exact row id 또는 exact fill로 찾되, 최종 출력은 지원 가능한 canonical solid fill만
- photoUrl은 이 단계에서 fetch하지 않고 별도 proof URL resolver의 입력 후보로만 분류
- imgT/room/gallery는 “보존됨”과 “현재 적용 가능”을 분리해 지원 상태를 반환
- 입력 불변, raw id/url/text/error 비노출

### 단계 V2 — 이미지와 frame view-only plan

proof-prefix URL trust, CORS-clean image load, image natural size와 실제 geometry가 준비된 뒤에만 transform
변환 가능성을 다시 판단한다. nonzero legacy x/y를 증명할 수 없으면 표시를 거부한다. editable composer와
별도 component/port를 사용한다.

### 단계 V3 — room/gallery

room layout, background image trust/load, controls/settings/common의 명시 스키마와 renderer를 별도 스펙으로
정의한다. V1/V2 완료를 room 동등 구현으로 부르지 않는다.

## 4. Founder 결정 선택지

### S-1 — 다음 구현 단위

- **A (권장):** V1 순수 catalog 참조 검증기와 합성 fake/unit만 구현한다. App/UI/network 변경 0.
- B: V1과 frame renderer를 함께 구현한다. transform/URL 근거가 부족해 권장하지 않는다.

### S-2 — product kind와 필수 참조

- **A (권장):** `space-scene-v1`은 frame-only다. tplId/sizeId/colorId/photoUrl이 모두 유효하고 현재
  catalog에서 지원될 때만 frame 후보로 인정한다. case 또는 자동 기본값/대체 선택은 0.
- B: null/missing 참조에 catalog 첫 항목을 자동 선택한다. 원래 시안과 달라질 수 있다.

### S-3 — color 호환

- **A (권장):** legacy처럼 exact row ID 또는 exact fill을 허용하되, grain·invalid fill·중복 모호성은
  fail-closed하고 canonical solid `#RRGGBB`만 출력한다.
- B: 유사 색/첫 색으로 대체한다. 시안 오표시 위험이 있다.

### S-4 — legacy transform

- **A (권장):** V1은 원본 transform을 validated-but-unapplied로 분류한다. nonzero x/y를 normalized 값으로
  복사·clamp하지 않는다. 변환 계약이 증명되기 전 renderer를 열지 않는다.
- B: x/y를 `[-1,1]`로 clamp해 적용한다. 단위가 달라 동일 구도를 보장하지 못한다.

### S-5 — room/gallery

- **A (권장):** 현재는 unsupported로 명시하고 별도 room 계약 전 표시 완료로 간주하지 않는다.
- B: room을 무시하고 frame만 보여주며 기존 space 재현이 끝났다고 간주한다. 제품 보존 근거가 없다.

## 5. S-1~S-5=A의 최소 허용 범위

- `apps/mockup/src/space/scene-reference.ts`와 unit 또는 동등한 순수 경계
- 필요 시 기존 public selector/projector의 공개 API를 넓히지 않는 local helper
- 스펙 054/handoff/STATE/NEXT/CURRENT/live log

package/lockfile, App/UI, Firebase facade, Rules/config, E2E 변경은 필요하지 않다.

## 6. 계속 금지

실제 Firebase/project/config/token/document/network, 이미지 fetch/decode, App/UI/Canvas/room 적용,
transform clamp/추측, catalog fallback/자동 선택, Rules/deploy/write/delete/publish, 신규 dependency.

## 7. NOT TESTED / UNCONFIRMED

- 실제 scene ID와 현재 catalog의 일치율·null 빈도: **NOT TESTED**
- legacy capture 당시 Canvas/zone/image 크기: **payload에 없음 / UNCONFIRMED**
- nonzero x/y의 정확 변환: **UNCONFIRMED**
- proof URL path/CORS/object 생존과 이미지 natural size: **NOT TESTED**
- grain color의 결정적 리빌드 렌더: **NOT IMPLEMENTED**
- room/gallery renderer와 opaque controls/settings/common 매핑: **NOT IMPLEMENTED**

## 8. 결론

현재 근거로 안전하게 구현 가능한 다음 단위는 V1 순수 catalog 참조 검증기뿐이다. S-1~S-5 결정 전
제품 구현을 시작하지 않는다.
