# 스펙 062 - space V1 방향·사진 transform 재현 차단 계약

상태: **FOUNDER_APPROVED / IMPLEMENTATION_IN_PROGRESS / LOCAL_UNIT_ONLY / NO_NETWORK / UI_IMPLEMENTATION_0**

기준 커밋: `ce7d819` (스펙 061 종료)

## 1. 목적

production space route가 local synthetic frame을 표시하게 된 뒤에도 `space-scene-v1`의 사진 구도가 실제
발급 당시와 같은지는 별개의 문제다. 이 문서는 legacy 액자 방향, 사진 scale/pan/rotation 저장 단위와 현재
normalized transform을 대조해 안전하게 재현 가능한 범위와 STOP 조건을 정한다.

조사 단계는 완료됐다. 2026-08-20 Founder가 FF-1=A~FF-5=A를 승인했으며, 아래 §7.1의 좁은
비시각적 correction과 합성 단위 테스트만 후속 구현 범위다. UI/CSS, Rules/config, package/lockfile,
실제 Firebase/network/운영 데이터와 배포는 변경하지 않는다.

## 2. 확인된 사실

### 2.1 V1 scene은 방향과 좌표 기준을 저장하지 않는다

legacy `captureScene()`은 `tplId`, `sizeId`, `colorId`, texts, `frameImgT`, `clockOn`을 저장한다. 그러나 다음은
저장하지 않는다(`denn-mockup-tool.html:15626-15646`).

- frame orientation mode (`portrait` / `landscape`)
- capture 당시 logical canvas width/height
- 사진 zone의 capture 당시 rect
- capture 당시 frame thickness/content inset
- proof image natural width/height
- catalog revision 또는 geometry fingerprint

현재 `readSpaceScene()`도 이 V1 shape만 읽으며 orientation이나 capture basis를 복원하지 않는다
(`packages/spaces/src/read.ts:18-40,130-168`).

### 2.2 legacy x/y는 absolute logical Canvas px다

pointer 좌표는 화면 CSS px를 logical Canvas 좌표로 바꾼 뒤 `frameImgT.x/y`에 직접 저장된다
(`denn-mockup-tool.html:1501-1530`). unrotated `drawImgT()`는 다음 순서로 그린다
(`denn-mockup-tool.html:1542-1555`).

```text
baseScale = max(zoneWidth / imageWidth, zoneHeight / imageHeight)
drawScale = baseScale * frameImgT.scale
maxPanX = abs(drawWidth - zoneWidth) / 2
maxPanY = abs(drawHeight - zoneHeight) / 2
x/y = clamp(frameImgT.x/y, -maxPan, +maxPan)
draw at centered cover rect + x/y logical pixels
```

scale 입력은 legacy UI에서 `0.3..5`다(`denn-mockup-tool.html:1510-1517,1526-1530,1558-1563`).
`drawImgT()`가 x/y를 직접 clamp·mutate하므로 scene에는 마지막 render가 남긴 absolute logical px가 들어간다.

### 2.3 legacy 방향은 size aspect와 image rotation을 함께 바꾼다

`DENN_FRAME_ORIENTATION_V64`는 `orientationFree === true`인 템플릿에서 portrait/landscape를 허용한다.
landscape는 size object의 in-memory `aspect`를 역수로 바꾸고 canvas width/height를 transpose하며,
`frameImgT.rot`은 `-90`, `0`, `90` 중 하나다
(`denn-mockup-tool.html:7186-7212,7233-7278,7280-7318,7350-7387`).

rotated `drawImgT()`는 image width/height를 swap해 cover scale을 구하고 중심 + absolute x/y에서 회전한다.
이 branch에는 unrotated branch의 x/y clamp도 없다(`denn-mockup-tool.html:7340-7347`).

중요하게 `captureScene()`은 `frameImgT.rot`은 복사하지만 orientation mode와 당시 변형된 aspect는 저장하지
않는다. `rot=0`은 portrait일 수도 있고 landscape에서 회전 버튼을 누르지 않은 상태일 수도 있다.

### 2.4 현재 transform은 다른 단위다

현재 `NormalizedTransform`은 다음 계약이다
(`apps/mockup/src/preview/imageTransform.ts:6-40,172-190`).

- scale: `1..5`
- x/y: 현재 scale의 축별 maxPan에 대한 normalized `[-1,1]`
- rotation: clockwise quarter-turn `0|1|2|3`
- logical pan: plan 직전에 `normalized * current maxPan`으로 계산

이 계약은 resize에 안정적이고 빈 공간을 허용하지 않는다. 반면 legacy x/y는 capture logical px이고
scale `< 1`을 허용했다. 두 shape가 이름만 같을 뿐 같은 좌표계는 아니다.

### 2.5 현재 identity 성공 판정도 전체 구도 동일성을 증명하지 않는다

현재 `resolveSpaceProofTransform()`은 `{scale:1,x:0,y:0,rot:0|undefined}`를 current identity로 성공 처리한다
(`apps/mockup/src/space/proof-image.ts:114-147`). 그러나 이 함수는 orientation 또는 catalog geometry를 받지
않는다.

따라서 V1 scene이 landscape에서 발급됐지만 `rot=0`이면 current catalog의 base aspect로 그려질 수 있다.
사진 transform 자체가 중앙이어도 frame orientation이 다르므로 발급 당시 구도와 같다는 결론은 성립하지
않는다. 스펙 055의 “exact neutral legacy state” 표현은 **transform 필드만 중립**이라는 뜻으로 좁혀야 하며,
전체 frame replay의 exactness 근거로 사용할 수 없다.

이 문제는 스펙 061이 실제 운영에 배포되기 전에 발견됐다. 실제 운영 project/object 요청이나 배포는 0이다.

### 2.6 current catalog만으로 historical orientation을 증명할 수 없다

현재 template의 `orientationFree`를 읽으면 지금의 허용 여부는 알 수 있다. 하지만 V1 scene에는 catalog
revision/fingerprint가 없으므로 발급 당시에도 같은 값이었다는 durable proof가 없다. 현재 mutable catalog의
flag를 historical proof처럼 쓰는 것은 안전하지 않다.

같은 이유로 frame thickness, aspect, template geometry가 발급 뒤 바뀌지 않았다는 것도 payload만으로
증명할 수 없다. 현재 pipeline은 latest compatible catalog를 사용하므로, V1 성공을 “현재 catalog 기준의
부분 replay” 이상으로 부르면 안 된다.

## 3. 변환 가능성 판정

| V1 값 | orientation/capture basis가 별도로 증명될 때 | V1 payload만으로 | 판정 |
|---|---|---|---|
| `scale=1,x=0,y=0,rot=0` | portrait가 증명되면 current identity와 대응 | orientation 누락 | **NOT PROVEN** |
| `1<=scale<=5,x=0,y=0,rot=0` | 같은 orientation·single rect geometry라면 centered zoom 의미가 대응 | orientation/geometry revision 누락 | **CONDITIONAL ONLY** |
| `scale<1` | legacy는 빈 공간 가능, current는 금지 | 직접 대응 불가 | **UNSUPPORTED** |
| nonzero x/y | legacy capture maxPan을 알면 축별 `x/maxPan` 후보 계산 가능 | canvas/zone/image/capture geometry 누락 | **UNCONFIRMED** |
| `rot=-90|90` | explicit landscape + geometry가 있으면 quarter-turn 후보 존재 | orientation/geometry 누락, rotated pan clamp도 다름 | **UNCONFIRMED** |
| arbitrary rot | legacy source emitter 근거 없음 | reader는 finite만 허용 | **INVALID/UNSUPPORTED 후보** |

단순히 x/y를 `[-1,1]`로 clamp하거나 legacy canvas 기본 폭 `500`으로 나누는 것은 같은 구도를 보장하지 않는다.
`ADM.uiCustom.prevMaxW`, aspect, border, inset과 image aspect에 따라 maxPan이 달라지며 이 값들은 V1 scene의
durable snapshot이 아니다.

## 4. 안전한 목표 구조 후보

### 4.1 기존 V1

- scene 원문은 수정하거나 되쓰지 않는다.
- orientation 또는 capture basis가 없는 V1 값을 heuristic으로 normalized transform에 바꾸지 않는다.
- exact replay가 필요한 production gate에서는 `ORIENTATION_UNCONFIRMED` 또는
  `TRANSFORM_UNSUPPORTED`로 fail-closed한다.
- partial/current-catalog replay를 허용하려면 exact replay와 다른 제품 의미·사용자 표시가 필요하므로
  별도 Founder 결정과 UI/UX 설계가 필요하다.

### 4.2 future scene shape

향후 새 발급 format은 최소한 다음 의미를 durable하게 가져야 한다.

```text
frameOrientation: portrait | landscape
transformEncoding: normalized-max-pan-v1
transform:
  scale: 1..5
  x/y: -1..1
  rotationQuarterTurns: 0|1|2|3
geometry/catalog evidence:
  발급 당시 선택 geometry가 이후에도 같은지 판단할 revision 또는 canonical fingerprint
```

정확한 V2 schema, fingerprint 알고리즘, 새 token 발급·migration 정책은 이번 조사에서 확정하지 않는다.
Firestore `spaces/{token}`은 update/delete 불변이므로 기존 token을 조용히 덮어쓰는 migration도 허용되지
않는다. V2 발급은 별도 계약이 필요하다.

## 5. 실패 시나리오

```text
V1 scene: sizeId=S, imgT={scale:1,x:0,y:0,rot:0}
                         |
             orientation field 없음
                /                    \
      발급 당시 portrait          발급 당시 landscape
        current base aspect          reciprocal aspect
                \                    /
          같은 V1 payload로 구분 불가
                         |
             exact replay NOT PROVEN
```

| 시나리오 | heuristic 표시 | 안전한 동작 |
|---|---|---|
| landscape `rot=0`을 portrait로 표시 | frame aspect와 crop 왜곡 | fail-closed |
| absolute x/y를 normalized x/y로 복사 | 작은 값은 거의 중앙, 큰 값은 clamp | fail-closed |
| x/y를 500으로 나눔 | actual maxPan과 무관 | fail-closed |
| scale 0.3을 1로 clamp | 고객이 본 빈 공간/crop 변경 | fail-closed |
| current `orientationFree`를 historical flag로 사용 | catalog 변경 시 오판 | exact proof로 사용 금지 |
| V1을 same token에 V2로 덮어쓰기 | immutable Firestore 계약 위반 | 새 발급 계약 전 금지 |

## 6. 합성 검증 후보

Founder 승인 뒤 첫 non-UI correction은 pure classifier와 unit으로 제한할 수 있다.

- V1 orientation field 부재는 exact replay eligible로 분류하지 않음
- identity-looking landscape ambiguity가 성공하지 않음
- `scale<1`, nonzero pan, nonzero/arbitrary rot는 clamp·coerce 없이 typed failure
- future explicit normalized input은 V1 shape와 혼동하지 않음
- hostile getter/drifting getter는 safe failure, 원문·URL·ID 출력 0
- frame plan failure 뒤 owner/Image/Canvas 후속 호출 0

fake/unit은 분류와 호출 순서만 증명한다. 실제 legacy scene 분포, 운영 catalog history, real image pixels,
visual parity는 증명하지 않는다.

## 7. Founder 결정 선택지

2026-08-20 Founder 결정: **FF-1=A, FF-2=A, FF-3=A, FF-4=A, FF-5=A 승인**.

### FF-1 - 현재 V1 exact replay 판정

- **A (권장):** orientation/capture evidence가 없는 V1 frame은 exact replay가 증명되지 않은 것으로
  fail-closed한다. 현재 identity-looking transform도 전체 frame exactness 근거로 사용하지 않는다.
- B: current catalog와 portrait를 best-effort로 가정해 계속 표시한다. 잘못된 landscape 표시 위험을 수용한다.

### FF-2 - legacy transform 수학

- **A (권장):** centered zoom `1..5`는 orientation·geometry가 별도로 증명될 때만 조건부 대응으로 기록한다.
  V1 scale `<1`, nonzero x/y, rot는 heuristic 변환하지 않는다.
- B: clamp와 기본 폭 500 기반 변환을 허용한다. 동일 구도 근거가 없어 권장하지 않는다.

### FF-3 - future format 방향

- **A (권장):** 별도 후속 계약에서 explicit orientation + normalized transform encoding + geometry/catalog
  evidence를 가진 새 scene version을 설계한다. V1 reader는 그대로 유지한다.
- B: V1에 optional 필드를 추가하고 같은 schema 이름으로 의미를 확장한다. 구·신 판별이 모호해진다.

### FF-4 - 기존 V1 migration

- **A (권장):** 자동 변환·same-token rewrite 0. 원본 앱 또는 운영자 확인으로 정확한 basis를 얻는 별도
  재발급 절차가 승인될 때만 새 immutable token 후보를 검토한다.
- B: client가 최초 열람 시 heuristic으로 새 transform을 저장한다. 오변환·권한·불변 계약 문제가 있다.

### FF-5 - 다음 구현 범위

- **A (권장):** pure eligibility/classifier, frame-plan fail-closed 연결과 unit만 허용한다. UI/CSS/문구,
  V2 issuer, admin/customer composition, Firebase/network/E2E/deploy는 0이다.
- B: V2 발급 UI와 viewer 표시까지 함께 구현한다. 실제 UI/UX 구현 단계이므로 이번 Codex 범위를 벗어난다.

### 7.1 승인된 첫 correction 계약

허용 제품 파일은 다음 네 파일뿐이다.

- `apps/mockup/src/space/proof-image.ts`
- `apps/mockup/src/space/proof-image.test.ts`
- `apps/mockup/src/space/frame-plan.ts`
- `apps/mockup/src/space/frame-plan.test.ts`

계약:

1. V1 transform을 한 번만 snapshot해 malformed input, 지원 불가능한 legacy transform,
   orientation/capture evidence 부재를 서로 다른 safe code로 분류한다.
2. `{scale:1,x:0,y:0,rot:0|undefined}`와 centered zoom도 V1 payload만으로는 exact replay 성공이 아니다.
3. `scale<1`, `scale>5`, nonzero pan, nonzero/arbitrary rotation은 clamp/coerce하지 않고 unsupported다.
4. frame plan은 V1 exact replay eligibility를 proof URL 해석·proof owner·template art·text measure·Canvas plan보다
   먼저 검사하고 실패 시 후속 호출 0으로 끝낸다. 부분 plan과 이전 성공 plan 재사용은 없다.
5. future explicit normalized scene은 별도 version 계약 전까지 V1 classifier 입력으로 성공 처리하지 않는다.
6. hostile/drifting getter는 safe invalid failure이며 원문 URL·ID·오류 문자열을 결과에 넣지 않는다.

검증은 targeted unit, typecheck와 기존 non-network check까지만 허용한다. 새 E2E fixture/시나리오 작성,
실제 browser/network 실행은 이번 correction 범위가 아니다. 스펙 061의 V1 synthetic Canvas 성공 기대는 이
fail-closed 정책과 더 이상 양립하지 않으므로 다음 UI/UX 인계에서 안전 오류 화면 기대값으로 갱신해야 한다.
그 E2E/UI 변경은 이번 단위에서 하지 않는다.

## 8. UI/UX 인계 경계

FF-5=A의 pure correction 이후 V2 발급 화면, partial replay 안내, orientation 선택·표시는 실제 UI/UX 구현이다.
그 단계에 도달하면 Codex는 구현하지 않고 Founder에게 알린 뒤 Claude용 범위·파일·검증 계약을 작성한다.

## 9. NOT TESTED / 계속 금지

- 실제 Firebase project/token/document, 운영 V1 scene의 orientation/transform 분포: **NOT TESTED**
- 실제 published catalog history와 `orientationFree` 변경 이력: **UNCONFIRMED**
- real legacy/current pixel parity, 모바일·폰트·CORS: **NOT TESTED**
- 제품 코드/UI/CSS/test/Rules/config/package/lockfile 변경: **0**
- 실제 network/write/migration/publish/deploy/cutover: **금지**

## 10. 조사 결론

V1 payload만으로 발급 당시 frame orientation과 absolute pan의 기준을 복원할 수 없다. 따라서 기존
client-only local code에서 V1 전체 frame exact replay는 **보장 불가능**하다. 특히 현재 identity 성공은
transform 필드 중립만 확인할 뿐 landscape ambiguity를 제거하지 못한다.

FF-1~FF-5는 모두 A로 승인됐다. 먼저 §7.1의 pure fail-closed correction만 구현·검증한다. V2 issuer/UI와
기존 production-route E2E의 표시 기대값 변경 단계는 Claude 인계 대상이다.
