# 스펙 030 사전 조사 — 고객 이미지 "회전"의 실제 범위와 계약

- 일자: 2026-07-30
- 성격: **읽기 전용 조사**. 제품 코드·테스트·CSS·설정·manifest·lockfile 변경 **0**, 구현 스펙 아님.
- 기준 HEAD: `8d20b6d`(스펙 029 종료 직후)
- 지시: `Automation/NEXT_CLAUDE_PROMPT.md`(상태 `WAITING_FOR_CLAUDE`, active_unit `spec-030-image-rotation-investigation`)
- 실제 network·live·Firebase·CORS·운영 데이터 접근 **0**

## 0. 한 줄 결론

**레거시에 "사진 회전" 기능은 없다.** 회전이라는 단어가 붙은 것은 네 가지 서로 다른 것이고, 그중 고객
사진 픽셀을 실제로 돌리는 것은 **액자 가로/세로(±90°) 한 가지뿐**이며 그마저도 ⓐ `orientationFree`
템플릿에서만 노출되고 ⓑ **인쇄 경로가 그 회전을 무시**하며 ⓒ 레거시 코드 자신이 "끝까지 동작하지 않는다"고
기록해 둔 상태다. 따라서 스펙 030은 "레거시 이식"이 아니라 **신규 기능 정의**이고, 가장 먼저 정해야 하는
것은 각도 집합이다. **90° 배수만 허용하면** 스펙 019/029 수학이 거의 그대로 살지만, **임의 각도를 허용하면
스펙 029에서 Founder가 확정한 `scale 1.0~5.0`(D-3)과 "클립 안 빈 공간 금지"(D-7)가 수학적으로 깨진다**
(45°에서 cover 최소 배율이 1.0이 아니게 된다). 이건 구현 난이도가 아니라 **확정 계약 충돌**이라 Founder
결정 없이는 진행할 수 없다.

---

## 1. "회전"의 네 가지 소유자 (CONFIRMED, 근거 라인)

| # | 무엇 | 근거 | 대상 | 인쇄 반영 |
| --- | --- | --- | --- | --- |
| 1 | **액자 가로/세로 ±90°** | `denn-mockup-tool.html:7180-7352` (`DENN_FRAME_ORIENTATION_V64`) | **고객 사진 픽셀** | ❌ **무시됨**(§4) |
| 2 | **룸 목업 기울기(tilt)** | `:524-535`(UI 「기울기 — 벽면 각도에 맞춰 회전과 원근 보정」), `:2130` `ctx.rotate(tiltDeg…)` | 룸 사진 위의 **액자 목업 전체** | 룸은 인쇄 대상 아님 |
| 3 | **워터마크 기울기** | `denn-admin.html:579` (`wm-rotation`, −180~180), `denn-mockup-tool.html:1875` | **워터마크 오버레이** | 저장 시만 |
| 4 | **텍스트 존 회전** | `denn-admin.html:1771`(`ze-rot`) → `z.rotation`; preview `:1794`·`:2588`, print `:9732`·`:11392` | **텍스트 존** | ✅ **반영됨** |

추가로 `:2311`·`:2347`·`:2354`·`:2376`의 "회전"은 **룸 전체화면/기기 방향 전환** 처리이고(§3),
`:1976`·`:2036`의 "회전 시 스왑"도 같은 룸 캔버스 문맥이다. **상품 이미지 편집과 무관하다.**

**정정 대상 오해**: "레거시에 사진 회전이 있다"는 표현은 #1만 가리키며, #2~#4는 사진이 아니다. #4는
"회전이 인쇄까지 반영된 선례"로서만 인용 가치가 있다.

## 2. #1 액자 가로/세로 ±90°의 실제 동작 (CONFIRMED)

### 2.1 상태와 각도 집합

- `state = window.DENN_FRAME_ORIENTATION_V64 = {mode:'portrait'|'landscape', rot:0|90|-90}` (`:7186`).
- `normalizeRot`(`:7188`)은 **0 / 90 / −90만 허용**한다(`270→-90`, 그 외 전부 `0`). **임의 각도는 존재하지
  않는다.**
- `ensureTransform()`(`:7190-7196`)이 그 값을 **사용자 이미지 transform에 기록**한다:
  `frameImgT.rot = normalizeRot(frameImgT.rot ?? state.rot)`.
- UI는 `액자 방향` 세로/가로 세그먼트 + 가로일 때만 나오는 `none/left(-90)/right(+90)` 행(`:7320-7338`),
  그리고 **`orientationFree === true` 템플릿에서만 노출**된다(`frameOrientationAllowed` `:7353`,
  `updateOrientUiVisibility` `:7354`). 아니면 `enforceOrientationGate`(`:7355`)가 portrait·rot 0으로 강제한다.
- `setOrientation`은 CSS `transform: rotate()` 애니메이션(350ms) 후 상태를 확정하고
  **`sz.aspect`를 `1/base`로 바꾼다**(`applyAspect` `:7206-7212`).

### 2.2 렌더 경로: 전역 `drawImgT`를 래핑한다

`:7342-7348`

```js
var oldDrawImgT = window.drawImgT;
window.drawImgT = function(ctx,img,x,y,w,h,T){
  T = T || ensureTransform();
  var rot = normalizeRot(T.rot != null ? T.rot : state.rot);   // ★ 전역 state 폴백
  if(!rot && typeof oldDrawImgT === 'function') return oldDrawImgT.apply(this, arguments);
  var swap = Math.abs(rot)%180===90, rw = swap?ih:iw, rh = swap?iw:ih,
      sc = Math.max(w/rw, h/rh) * num(T.scale,1);              // 회전 footprint 기준 cover
  ctx.save();
  ctx.translate(x+w/2+num(T.x,0), y+h/2+num(T.y,0));           // pan은 화면축, 회전 前
  ctx.rotate(rot*Math.PI/180);
  ctx.drawImage(img, -iw*sc/2, -ih*sc/2, iw*sc, ih*sc);
  ctx.restore();
};
```

여기서 **읽어낼 수 있는 세 가지 사실**:

1. **cover 기준은 회전된 footprint**(`swap`으로 iw/ih 교체) — 90° 배수 회전의 올바른 처리다.
2. **pan은 화면축에서 회전 전에 적용**된다 → "오른쪽으로 끌면 오른쪽으로 간다"가 유지된다(좋은 UX 기준선).
3. ⚠️ **회전 경로는 pan clamp를 완전히 잃는다.** clamp는 원본 `drawImgT`(`:1543-1556`) 안에 있는데
   회전 시에는 그 함수를 **호출하지 않는다** → 가로 ±90에서는 사진을 존 밖으로 끌어낼 수 있다.
4. ⚠️ **전역 `state.rot` 폴백이 케이스까지 오염시킨다.** `T.rot`이 없으면 `state.rot`을 쓰는데,
   `renderCase`가 넘기는 `caseImgTs[i]`에는 `rot`이 **없다**(`:1381`, `:1665`) → **액자를 가로로 둔 상태에서
   케이스를 렌더하면 케이스 사진도 ±90° 돌아간다.** 레거시 자신이 같은 원인을 문서화해 두었다(`:15026`).

### 2.3 레거시 코드가 스스로 남긴 "동작하지 않음" 기록 (CONFIRMED)

`:15015-15029` 주석 전문 요지:

- 액자 '가로' = 캔버스 통째 90° CSS 회전 시도는 **현재 비활성(no-op)**.
- 이유: v36.1 스케일러가 `renderFrame` 후 `setTimeout(0/80/220ms)`로 `.canvas-wrap` transform을 3회
  재설정해 회전 합성을 지운다. 캔버스에 직접 rotate하면 **`cPos`(rect 기반 mouse→pixel 매핑)가 회전을 몰라
  드래그 좌표가 어긋난다**.
- `setOrientation('landscape')`이 `sz.aspect = 1/base`로 transpose를 시도하지만
  **`normFrameRatio`(`:2659`)가 `max(w,h)/min(w,h)`로 즉시 되돌린다**(항상 ≥ 1 = portrait) →
  **캔버스 픽셀 비율은 언제나 portrait로 유지**된다.
- 그래서 실제로 보이는 현상은 **"이미지만 압축되며 가로로 돌아감"** 이고, 그 직접 원인이 `drawImgT`의
  `state.rot` 폴백이라고 적혀 있다.

→ **결론: #1은 "구현되어 운영 중인 기능"이 아니라 미완 상태다. 보이는 동작을 그대로 재현하면 버그를
재현하는 것이다.**

## 3. 기기 방향 · fullscreen · 룸 tilt와의 구분 (CONFIRMED)

| 축 | 레거시 위치 | 성격 | 상품 이미지 회전과의 관계 |
| --- | --- | --- | --- |
| 기기 방향 전환 / 회전 전체화면 | `:2311`(「회전 전체화면(항상 landscape…」), `:2347`·`:2354`·`:2376`, 룸 캔버스 사이저 | **룸 미리보기 표시**를 기기 방향에 맞추는 셸 로직 | **무관**. 사진 transform을 바꾸지 않는다 |
| orientation lock / fullscreen API | 리빌드 코드에 **존재 0**(`apps/mockup/src`·`packages/ui/src` grep 결과 없음) | 미도입 | 스펙 030 범위 아님 |
| 룸 액자 tilt | `:524-535` UI, `:2130` | 벽면 각도 보정(회전 + 원근), **액자 목업**에 적용 | **무관**. 인쇄 대상도 아님 |
| 스펙 019 `resolveOrientedAspect` | `packages/render/src/geometry/aspect.ts` | **숫자만 뒤집는 순수 함수**. 주석에 "does not swap width/height or touch any template transform, and it knows nothing about orientation-lock / fullscreen" 명시 | **액자 사이즈 aspect** 축. 사진 회전과 **별개 축**으로 이미 분리돼 있다 |

**중요**: 리빌드는 이미 "액자 방향(aspect)"과 "사진 transform"을 **다른 함수**로 분리해 두었다.
스펙 030이 이 분리를 무너뜨리면(예: 방향 토글이 사진 rot을 같이 쓰게 하면) 레거시의 #1 오염 구조를
새 코드에 다시 만든다. `resolveOrientedAspect`는 **아직 어디서도 호출되지 않는다**(grep 결과 사용처 0) —
즉 액자 가로/세로 자체가 리빌드에 **미구현**이다.

## 4. preview ↔ print/export 좌표계 (CONFIRMED — 현재 불일치)

- 인쇄 경로의 이미지 그리기는 두 곳 모두 **회전을 모른다**:
  - V36 `drawImageT` (`:9732` 내부): `base = max(w/iw, h/ih)`, `drawImage(img, dx, dy, iw*sc, ih*sc)` —
    `T.rot` 미사용, `ctx.rotate` 없음, 차원 swap 없음.
  - V365 `drawImageT` (`:11371-11379`): 동일. `renderFramePrintV365`(`:11404-11431`)는
    `T = window.frameImgT`를 그대로 넘기므로 **`rot` 필드는 있는데 무시**된다.
- 반면 **텍스트 존 회전은 인쇄에서 반영**된다(`:9732`·`:11392`의 `ctx.rotate(z.rotation*…)`).
- 즉 현재 레거시는 **"미리보기는 사진이 90° 돌아 보이는데 인쇄 파일은 안 돌아간 사진"** 을 만들 수 있다.
  스펙 029 조사에서 이미 기록한 **frame pan 배율 하드코딩(`dim.w/500`)** 문제와 같은 계열의 결함이다.
- 리빌드는 print/export 경로가 **아직 없다**(스펙 미착수). 따라서 스펙 030은
  **"회전을 plan에 넣으면 나중 print 스펙이 그 plan을 그대로 소비해야 한다"** 는 계약을 먼저 못 박을 수 있는
  유일한 시점이다. 회전을 UI 상태로만 두고 plan에 넣지 않으면 print 스펙이 같은 함정을 반복한다.

## 5. 회전 후 수학 — cover / maxPan / normalized pan / clip / multi-zone

### 5.1 90° 배수 (안전, 계약 변경 최소)

`θ ∈ {0, 90, 180, 270}`이면 회전된 이미지의 footprint는 정확히 `swap` 여부로 결정된다.

```
swap      = (θ % 180 === 90)
imgW', imgH' = swap ? (ih, iw) : (iw, ih)
baseScale = max(zoneW / imgW', zoneH / imgH')      // 스펙 019 cover와 동일 형태
drawW', drawH' = imgW' * baseScale * scale, imgH' * baseScale * scale
maxPan.x  = |drawW' - zoneW| / 2                   // 스펙 019 §3과 동일 공식
maxPan.y  = |drawH' - zoneH| / 2
```

- **스펙 029의 normalized pan `[-1,1]`(D-1)이 그대로 유효**하다. 단 `maxPan`이 회전에 따라 바뀌므로
  "정규화 값 유지 + 재환산" 규칙(D-1)이 **회전 토글에도 그대로 적용**된다 → 회전해도 구도가 튀지 않는다.
- pan을 **화면축**에 유지하면(레거시와 동일, §2.2-2) 90°에서 x/y 의미가 바뀌지 않는다.
  pan을 이미지축에 저장하면 90°마다 축이 바뀌어 "위로 끌었는데 옆으로 간다"가 된다 → **화면축 권장**.
- clip은 zone rect 그대로 → 변화 없음. **최소 scale 1.0에서 cover가 계속 성립**한다(D-7 유지).
- multi-zone: 회전은 **슬롯별 transform 필드**여야 한다. 전역 상태를 쓰면 §2.2-4의 케이스 오염이 재발한다.

### 5.2 임의 각도 (계약 충돌 — Founder 결정 필요)

- 회전 사각형의 AABB는 `(|w·cosθ| + |h·sinθ|, |w·sinθ| + |h·cosθ|)`이다. AABB 기준 cover는 **보수적
  과대추정**(필요보다 더 확대)이고, "회전 사각형이 축정렬 zone을 덮는 최소 배율"은 90° 배수처럼 단순
  닫힌 형태가 아니다.
- 핵심 충돌: **정사각형 zone·정사각형 사진에서 45° 회전 시 cover 최소 배율은 √2 ≈ 1.414**다.
  스펙 029에서 Founder가 확정한 **`scale` 하한 1.0(D-3)** 과 **빈 공간 금지(D-7)** 를 동시에 지킬 수 없다.
  → 선택지는 ⓐ 각도를 90° 배수로 제한 ⓑ 하한을 **각도 종속**(`minScale(θ) ≥ 1`)으로 바꿈
  ⓒ 회전 상태에서만 빈 공간 허용 ⓓ 회전 시 자동 확대(사용자가 만든 scale을 시스템이 덮어씀) 중 하나다.
  **모두 D-3/D-7 재해석이므로 Founder 결정 사항이다.**
- 임의 각도는 슬라이더 UX·표시 단위·스냅(0/90/180/270 근처)까지 결정 대상이 늘어난다.

## 6. 초기화 행렬 · 회전 중심 · 증분 · 접근성

- **초기화**: 스펙 029 D-9가 이미 "이미지 교체·삭제·실패 → 그 슬롯만 / model·template·frame-size·kind →
  전체 / 색상 변경·활성 슬롯 전환 → 유지"로 확정돼 있다. `rot`을 **같은 transform 객체의 필드**로 두면
  이 행렬이 자동 상속된다(신규 규칙 0). 별도 상태로 빼면 행렬을 한 벌 더 정의해야 한다 → **필드 편입 권장**.
- **회전 중심**: 레거시는 **zone 중심 + pan 오프셋**(`translate(x+w/2+T.x, …)` 후 rotate) — 즉 "현재 보이는
  구도의 중심"에서 돈다. 이미지 중심 기준으로 바꾸면 회전 시 구도가 점프한다 → **레거시 방식 권장**.
- **증분**: 레거시 UI는 `none / left(-90) / right(+90)`의 **절대값 3버튼**(`:7333-7337`)이고 누적 증분이
  아니다. 90° 배수만 지원한다면 **`왼쪽으로 90°` / `오른쪽으로 90°` 상대 증분 2버튼**이 더 단순하고
  키보드 접근도 쉽다(현재 편집 UI가 이미 실제 `button`).
- **접근성**: 스펙 029가 확립한 계약을 그대로 승계해야 한다 — 실제 `button`, 44px, `focus-visible`,
  axe serious/critical 0, console 0, 고정 문구만 노출. 회전 상태는 **`aria-pressed` 또는 상태 텍스트**로
  전달해야 하고(색·아이콘만으로 전달 금지: 팔레트 결정서 §접근성), 캔버스는 `role="img"`이므로
  회전 조작을 캔버스 제스처로만 두면 키보드 사용자가 접근할 수 없다.

## 7. decode · EXIF · CORS/taint 검증 한계

- **레거시는 EXIF를 전혀 다루지 않는다**: `exif|imageOrientation|createImageBitmap` grep 결과 **0건**.
  즉 아이폰 세로 사진의 방향은 전적으로 브라우저의 `<img>` 기본 동작에 의존해 왔다.
- **리빌드도 `<img>` 경로**다: 스펙 026 owner가 `new Image()` + object URL로 디코드하고
  `naturalWidth/naturalHeight`를 읽는다(`apps/mockup/src/canvas/localImageBinding.ts:91`, `:231`).
  최신 Chromium/Safari는 `<img>`에 EXIF orientation을 적용하고 `naturalWidth/Height`도 **회전 적용 후 값**을
  준다 → cover 수학은 대체로 맞게 동작한다. **단 이 저장소에서 실측된 적이 없다(NOT VERIFIED).**
- **직접 EXIF 파싱은 권장하지 않는다**: 브라우저가 이미 적용하는 엔진에서 **이중 회전**이 되고, 파서를
  들이면 신규 의존성 금지 원칙과 충돌한다. 대신 **가정을 검증하는 E2E**를 두는 편이 싸다.
- **검증 가능**: Node 쪽에서 캔버스가 만든 JPEG 바이트에 `APP1(Exif)` 세그먼트(Orientation=6)를
  **바이트 스플라이싱**으로 삽입해 합성 fixture를 만들 수 있다(신규 의존성 0, 스펙 027/028이 PNG를
  손으로 만든 것과 같은 방식). 이걸로 Chromium에서 `naturalWidth/Height`와 실제 픽셀이 어떻게 나오는지
  **실측**할 수 있다.
- **검증 불가(NOT TESTED)**: iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱의 EXIF 적용 여부와
  `naturalWidth` 규약, 실제 카메라 원본(대용량 + 다양한 orientation 1~8), 실제 200% 확대.
- **CORS/taint**: 회전은 `ctx.rotate` + `drawImage`만 추가하므로 **taint 위험을 새로 만들지 않는다**.
  taint는 소스가 CORS-clean인지에만 달려 있고(스펙 028), 회전 자체는 픽셀을 읽지 않는다. 다만 **print/export
  단계에서 픽셀을 읽을 때** 기존 위험이 그대로 유지된다.

## 8. 스펙 019·020·025~029 재사용 경계 (CONFIRMED)

| 대상 | 판정 |
| --- | --- |
| `computeCoverDrawRect`(019 §3) | 90° 배수라면 **입력 단계에서 `image` w/h를 swap해 그대로 재사용 가능**. 함수 자체는 회전을 모르므로 **변경 불필요**. 임의 각도에서는 cover 정의가 달라져 **재사용 불가** |
| `resolveOrientedAspect`(019 §6) | 액자 aspect 축 전용. **호출처 0**(미사용) — 액자 가로/세로를 도입한다면 여기서 시작해야 하고, **사진 rot과 섞지 말 것** |
| `clientPointToLogical`(019 §5) | 회전과 무관(화면축 좌표 변환). 재사용 |
| plan 어휘(020/024/028) | `draw-image-cover`에 **rotation 필드가 없고**, `draw-image-stretch`는 명시적으로 "no rotation"(`packages/render/src/plan/types.ts:150-157`), `FramePlanInput.transform`은 "single, NON-rotated transform (no rotation field in this spec)"(`:112`) → **회전을 plan에 넣으려면 `packages/render` 계약 변경이 필수**(현재 스펙 029 금지 목록) |
| executor(021) | 헤더에 **"no setTransform/scale/rotate/translate"** 를 못 박았다(`apps/mockup/src/canvas/executePreviewPlan.ts:10-11`) → 회전 실행은 **executor 계약 확장** 없이는 불가능 |
| adapter(025) | `readImageState`가 `transform`의 `scale/x/y`만 1회 읽어 검증한다(`productPlan.ts:82-94`) → `rot` 추가 시 **여기 검증도 확장** 필요 |
| owner(026) | `transform`이 리터럴 `{scale:1,x:0,y:0}`이므로 **회전 소유자가 될 수 없다**(스펙 029 D-8과 동일한 이유) |
| composer(027/029) | 슬롯별 transform을 이미 소유하고 `maxPan` 재환산 파이프라인이 있다 → **`rot` 필드를 얹기에 정확히 맞는 자리** |
| 028 template art | 아트는 `draw-image-stretch`(회전 0)로 그린다. 사진만 회전하면 **아트와 사진의 각도가 어긋날 수 있다** → "아트가 있는 템플릿에서 사진 회전을 허용할지"가 별도 결정 |

**요약**: 회전은 스펙 029처럼 "앱 레이어만 고쳐서" 끝나지 않는다. **`packages/render`(plan 어휘 + executor)
계약 변경이 전제**이고, 그건 지금까지 모든 스펙이 지켜 온 "packages 무변경" 경계를 처음 깨는 일이다.

---

## 9. 결정 필요 항목 (Founder / Codex 분리)

### 9.1 Founder 결정 (제품·UX·정책)

| ID | 질문 | 권장안 | 근거 |
| --- | --- | --- | --- |
| **R-1** | 고객이 사진을 회전할 수 있어야 하는가? (그렇다면 어떤 각도 집합) | **90° 배수만**(`왼쪽 90°`/`오른쪽 90°`) | 임의 각도는 D-3(하한 1.0)·D-7(빈 공간 금지)와 충돌(§5.2). 90° 배수면 019/029 수학이 그대로 산다 |
| **R-2** | 임의 각도를 원한다면 D-3/D-7 중 무엇을 바꾸는가 | (R-1에서 90° 배수 선택 시 불필요) 바꿔야 한다면 **하한을 각도 종속 `minScale(θ)`으로** | 자동 확대는 사용자가 만든 scale을 시스템이 덮어써 놀람을 준다 |
| **R-3** | 액자 **가로/세로(aspect 전환)** 를 리빌드에 도입하는가? 사진 회전과 별개 기능으로? | **별개 기능으로 분리**, 이번 스펙에서는 **미도입** | 레거시는 둘을 한 상태로 묶어 케이스 오염·인쇄 불일치를 만들었다(§2). `resolveOrientedAspect`가 이미 분리된 축을 제공 |
| **R-4** | 회전 UI를 **case에도** 제공하는가(멀티존 각 슬롯) | **제공**(슬롯별 독립) — 다만 R-1이 90° 배수일 때만 단순 | 레거시는 케이스 회전 UI가 없고, 있는 것처럼 보인 건 전역 폴백 버그였다 |
| **R-5** | 아트가 있는 템플릿(028)에서 사진 회전을 허용하는가 | **허용**(아트는 고정, 사진만 회전) | 아트는 `stretch`로 캔버스/mat에 고정돼 있어 사진 회전과 독립. 단 시각적 정합은 운영자 책임 |
| **R-6** | EXIF 방향을 앱이 직접 정규화하는가 | **하지 않는다**(브라우저 `<img>` 기본 동작에 의존 + 실측 E2E 추가) | 직접 파싱은 이중 회전 위험 + 신규 의존성. §7 |

### 9.2 Codex 계약 결정 (수학·구조)

| ID | 항목 | 권장안 |
| --- | --- | --- |
| **C-1** | `rot`의 저장 위치 | 스펙 029 normalized transform의 **네 번째 필드**(`{scale, x, y, rot}`). 전역 상태 금지(§2.2-4) → D-9 초기화 행렬 자동 상속 |
| **C-2** | 각도 표현 | 정수 degree, 허용 집합 `{0, 90, 180, 270}`(정규화는 `((v%360)+360)%360`). 그 밖의 값은 **거부**(clamp 복구 금지 — 029와 동일 규율) |
| **C-3** | pan 축 | **화면축 유지**. `maxPan`은 **회전된 footprint**로 계산(§5.1) → 회전 토글 시 normalized 값 유지 + 재환산 |
| **C-4** | 회전 중심 | zone 중심 + 현재 pan(레거시와 동일) → 회전 시 구도 점프 없음 |
| **C-5** | plan 어휘 | `draw-image-cover`에 **선택적 `rotationQuarterTurns: 0|1|2|3`** 추가 vs **신규 `draw-image-rotated-cover`** 커맨드. 권장 = **선택적 필드**(명시 없으면 기존과 바이트 동일, 기존 결과 무변경) |
| **C-6** | executor | 회전 실행은 `save → translate(중심) → rotate → drawImage → restore`로 **한 커맨드 안에 캡슐화**하고, "no transform" 문구를 "**커맨드 내부에서만, 반드시 restore와 짝지어**"로 정정 |
| **C-7** | adapter/probe | 029의 **probe plan(pan 0) → maxPan → 실제 plan** 파이프라인을 유지하고, probe에 `rot`을 **포함**해야 한다(회전이 maxPan을 바꾸므로) |
| **C-8** | print/export 계약 | 회전은 **plan에 담긴다** = 나중 print 스펙이 같은 plan을 소비하면 자동으로 일치한다. "UI만 회전" 설계는 §4의 레거시 결함을 재생산하므로 금지 |
| **C-9** | 실패 우선순위 | 029 §3 순서 유지 + `rot` 검증을 "유한성·범위" 단계에 편입. 회전 검증 실패도 **plan 미생성**(부분 plan 금지) |

## 10. 권장 최소 구현 순서

1. **R-1 확정**(각도 집합). 여기서 90° 배수가 아니면 §5.2 때문에 D-3/D-7 재결정까지 끝나야 진행 가능.
2. `packages/render` **계약 확장**(C-5, C-6) + geometry는 **무변경**(입력 swap으로 재사용, C-3).
   plan/executor unit이 "명시 없으면 기존 결과 바이트 동일"을 고정한다.
3. `productPlan` adapter에 `rot` 검증·전달(C-7).
4. composer 상태에 `rot` 편입(C-1) + 회전 버튼 2개(접근 가능한 `button`) + 상태 텍스트.
   초기화 행렬은 D-9 그대로 상속.
5. E2E: 90° 회전 후 **실제 픽셀**로 footprint·구도 유지·clamp 검증, 슬롯 독립, resize 유지.
6. EXIF 합성 fixture E2E(§7)로 `<img>` 기본 동작을 **실측 기록**(실기기는 NOT TESTED로 남긴다).

## 11. 허용 파일 후보 (구현 스펙 승인 시)

- `packages/render/src/plan/types.ts`, `build.ts`(+ test) — C-5
- `apps/mockup/src/canvas/executePreviewPlan.ts`(+ test) — C-6
- `apps/mockup/src/canvas/productPlan.ts`(+ test) — C-7
- `apps/mockup/src/preview/imageTransform.ts`(+ test) — C-1~C-4
- `apps/mockup/src/preview/PreviewComposer.tsx`(+ test), `previewContracts.ts`(+ test) — UI·문구
- `apps/mockup/src/canvas/surface.css` — 버튼 스타일이 필요할 때만
- `tests/e2e/mockup-preview.spec.ts`
- 문서: 해당 스펙 DONE·handoff·live log·`CURRENT.md`·Automation

**변경 금지 후보**: `packages/render/src/geometry/**`(입력 swap으로 재사용 — 회전 때문에 cover 공식을
바꾸지 말 것), `localImageBinding.ts`(026 owner), `templateArtBinding.ts`·`placement.ts`(028 승인분),
`apps/admin/**`, 운영 HTML, Firebase 설정/Rules/CORS/Hosting, `package.json`·`pnpm-lock.yaml`, PNG.

## 12. 검증 설계

**framework-free unit**: `rot` 정규화·거부(비정수·범위 밖·NaN·hostile getter/Proxy) / 회전별 `maxPan`
재계산(90°에서 x·y 교체 확인) / 회전 토글 시 normalized 값 유지 / 초기화 행렬에 `rot` 포함 /
`{0,180}`과 `{90,270}`의 footprint 대칭성 / plan builder: `rot` 미지정 시 **기존 커맨드와 완전히 동일**.

**실제 Chromium E2E**: 90° 회전 후 **픽셀 좌표 검증**(두톤 사진의 경계가 세로→가로로 바뀌는지),
회전 후에도 clip 안 빈 공간 0, 회전 + drag/zoom 조합, 슬롯별 독립, resize 후 구도 유지, 키보드만으로
회전, 320px 스크롤 보존, axe 0, console 0, 고정 sleep 0. **EXIF 합성 JPEG**로 `naturalWidth/Height`와
그려진 픽셀 실측.

**NOT TESTED로 남을 것**: 실기기 4환경의 EXIF·제스처, 실제 카메라 원본 orientation 1~8, 실제 200% 확대,
print/export 실제 출력물(스펙 미착수), 대용량 회전 성능·메모리, 임의 각도(도입 시 별도).

## 13. 지원 불가 · 근거 부족

- **레거시 액자 가로/세로 동작의 "그대로 재현"은 불가**하며 시도해서도 안 된다: 캔버스 비율이 절대
  transpose되지 않아(`normFrameRatio`) 보이는 결과가 "압축된 회전 이미지"이고, 코드가 스스로 미완이라고
  기록했다(§2.3).
- **`orientationFree` 카탈로그 플래그가 운영 데이터에 실제로 몇 개 켜져 있는지 확인하지 않았다**(운영
  데이터 접근 0) → 이 기능의 실사용 수요는 **근거 부족**이다. R-3 결정 전에 운영자 확인이 필요하다.
- 임의 각도 UX(스냅·표시·손잡이)는 레거시 선례가 **없다** → 전부 신규 결정.

## 14. STOP 조건

- R-1(각도 집합)이 확정되기 전 구현 착수
- 임의 각도를 D-3/D-7 재결정 없이 도입해야 하는 상황
- `packages/render/src/geometry/**`의 cover/clamp 공식을 바꿔야 하는 설계
- 회전을 **plan 밖**(UI 상태만)에 두어 print/export가 다시 어긋나는 설계
- 회전 상태를 **전역**으로 두어 case/frame이 서로 오염되는 설계
- 스펙 026 owner의 리터럴 transform을 바꿔야 하는 설계
- EXIF를 직접 파싱해야 하거나 신규 의존성이 필요한 상황
- 실기기 EXIF 동작을 "검증됨"으로 기록해야 하는 상황
- Firebase/network/live/deploy, 운영 데이터·이미지 접근이 필요해지는 경우
- 회전 E2E가 flaky해 좌표·타이밍 의존이 남는 경우

## 15. 이번 조사에서 하지 않은 것

- 구현 스펙 작성 **없음**, 회전 구현 **0**
- 제품 코드·테스트·CSS·설정·manifest·lockfile 변경 **0**(문서 전용)
- 신규 의존성 0, Firebase·network·live·deploy 0, 운영 데이터·이미지 접근 0
- 스펙 018 PNG 2개와 Codex 소유 `Automation/DENN_AUTOMATION_RUNBOOK.md`: restore·stage·commit **하지 않음**
- 다음 기능 착수 없음 — Codex 검토 대기
