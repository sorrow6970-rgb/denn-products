# 스펙 032 사전 조사 — 인쇄/내보내기(print/export)의 실제 계약

작성: Claude Code, 2026-07-31 · 기준 커밋 `b763174` · **읽기 전용(구현 0)**
착수 근거: **Founder 지시**(개별 스펙 DONE에서 멈추지 말고 다음 권장 스펙 조사로 자동 전환) +
스펙 019 §506이 명시한 후속 순서 **deterministic renderer → image/CORS → pointer → text/clock → print**
의 **마지막 항목**. 020·021 / 026·028 / 029·030 / 031이 끝나 다음은 `print`다.

> ⚠️ 이 라운드는 Codex의 `NEXT_CLAUDE_PROMPT` 지시가 아니라 **Founder 지시로 시작**했다. 범위는 이전
> 조사 라운드들과 동일하게 **읽기 전용·문서 전용**으로 스스로 제한했다.

---

## 0. 한 줄 결론

**인쇄 경로는 하나가 아니라 두 세대가 공존하고, 리빌드에는 인쇄 코드가 한 줄도 없다.**

- **케이스는 구버전(V36), 액자만 신버전(V365)** 이 처리한다 — `patchedRender`가 `type==='case'`면
  **옛 구현으로 되돌린다**(`:11453-11455`). 두 경로는 **해상도 산식도, 텍스트 처리도 다르다**.
- 액자는 **실물 cm → 300dpi**로 계산하지만, cm를 **필드 8종 → 이름 텍스트 파싱 → 하드코딩 표**로
  **추측**한다(`:11298-11317`). 케이스는 **cm도 dpi도 없이** 화면 논리 크기를 3~5배로 늘릴 뿐이다.
- **경고는 주문을 막지 않는다.** 템플릿 아트 로드 실패는 `warnings`에 문자열만 남기고 **아트가 빠진
  PNG를 그대로 반환**한다(`:11423-11425`).
- 스펙 029~031이 확정한 것 중 **인쇄에 반영된 것은 텍스트뿐**이다. **사진 회전(030)은 무시**되고,
  **시계(031 F-4)는 의도적으로 제외**가 맞다.
- 리빌드는 **인쇄 코드 0**이다(`RENDER_NOT_IMPLEMENTED`가 "print/PNG export는 후속 스펙"이라고 명시).
- **인쇄 좌표를 얻는 방법은 아직 정해지지 않았다.** 미리보기 `lines`를 빌더에 되돌리는 경로가
  **현재 API에 없으므로**(§8.1) 후보 A/B/C 중 하나를 Codex가 골라야 한다.

---

## 1. 두 세대가 공존한다 (CONFIRMED)

| 세대 | 위치 | 담당 | 진입점 |
| --- | --- | --- | --- |
| **V36** | `mockup:9732` IIFE | **케이스 전부** + 액자(구) | `window.DENNPrintExportV36` |
| **V365** | `mockup:11242~11480` | **액자만** | `api.renderPrintFile`를 **패치** |

```js
function patchedRender(type){
  if(type==='case') return oldRender(type);   // ← 케이스는 옛 구현 그대로
  return renderFramePrintV365();
}
```
`mockup:11453-11455`. `patchedDownload`도 동일하게 분기한다(`:11458-11463`).

→ **케이스 인쇄는 V365의 해상도·안정화 작업을 하나도 받지 못했다.**

---

## 2. 해상도 계약이 제품군마다 다르다 (CONFIRMED)

### 2.1 액자 (V365) — 실물 cm 기준 300dpi

`CONFIG`(`:11242-11248`):

| 키 | 값 | 의미 |
| --- | --- | --- |
| `version` | `v36.5-print-resolution-step2` | 결과 payload에 실림 |
| `dpi` | **300** | cm → px 환산 |
| `minLongSide` | **3000** | 긴 변이 이보다 작으면 **업스케일** |
| `maxPixels` | **36,000,000** | 초과 시 **다운스케일**(하한 900) |
| `fallbackLongSide` | **3508** | cm를 못 구했을 때 긴 변(≈A4 300dpi) |

`framePrintSize`(`:11318-11340`): cm가 있으면 `round(cm/2.54*300)`, 없으면 `aspect`와
`fallbackLongSide`로 만든 뒤 → `minLongSide` 업스케일 → `maxPixels` 다운스케일.

### 2.2 케이스 (V36) — cm도 dpi도 없다

`casePrintSize`(`:9732` 내부): `scale = min(5, max(3, 3000 / max(W,H)))`,
`w = round(model.w * scale)`, `h = round(model.h * scale)`. 반환 payload의 `dpi:300`은
**계산에 쓰이지 않는 상수 표기**다(`:11169`, `:11244`와 무관).

→ **케이스 인쇄물의 실제 해상도는 모델의 화면 논리 크기에 종속**되며 물리 치수와 연결이 없다.

### 2.3 ★ 액자의 물리 치수는 "추측"된다 (CONFIRMED — 위험)

`frameCm(sz)`(`:11298-11317`)는 이 순서로 시도한다:

1. 필드쌍 **8종**: `wcm/hcm`, `wCm/hCm`, `widthCm/heightCm`, `cmW/cmH`, `printWcm/printHcm`,
   `printWidthCm/printHeightCm`, `w/h`, `width/height`
2. 실패하면 **텍스트 파싱**: `[sub, sizeText, label, name, id, key].join(' ')`에서 `cmFromText`
3. 그래도 실패하면 **하드코딩 표** `knownCm(sz)`

→ **운영자가 사이즈 이름을 바꾸면 인쇄 해상도가 바뀔 수 있다.** `w/h`가 후보에 있는 것도 위험하다 —
케이스 모델의 `w/h`는 **논리 px**인데 액자에서는 **cm로 해석**된다.
카탈로그 V1의 `frameSizes` allowlist(`packages/shared/src/catalog/read.ts:82`)는
`id·name·sub·aspect·custom·clock` 뿐이라 **cm 필드는 스키마에 아예 없다**.

---

## 3. 인쇄가 그리는 것과 그리지 않는 것 (CONFIRMED)

### 3.1 액자(V365) 레이어 순서 `:11407-11443`

```
배경색(bgEnabled) → 사진(photoZones clip, drawImageT) → 템플릿 아트 오버레이
→ textZones(drawSimpleTextZone) → 흰 테두리(whiteBorderBaked)
```

**시계 없음**(스펙 031 F-4로 **정상 확정**). **회전 없음**(스펙 030 조사 §4로 확인된 결함).

### 3.2 케이스(V36)

```
템플릿 dataUrl 있으면: 사진(zone clip) → 아트 오버레이
없으면: safeMargin/printArea 안에 사진
→ textObjs(drawTextObject)
```

→ **케이스는 `textZones`를 그리지 않고 `textObjs`만 그린다.** 스펙 031 F-1이 케이스 텍스트를 범위 밖으로
둔 것과 **일관**되지만, 리빌드가 케이스 인쇄를 만들 때 **레거시 `textObjs`를 재현할지**는 미결이다.

### 3.3 pan 배율의 frame 하드코딩 (CONFIRMED — 재현 금지)

`drawImageT(ctx,img,x,y,w,h,T,scale)`에서 액자는 `scale = dim.w/500`(`:11418`, `:11421`, `:11431`),
케이스는 `sx = dim.w/model.w`. **`500`은 미리보기 기본 폭 상수**이고 운영자가
`ADM.uiCustom.prevMaxW`를 바꾸면(`:3119`) **미리보기와 인쇄의 pan이 어긋난다**.
스펙 029 조사에서 이미 기록된 결함이며 **리빌드는 normalized pan을 쓰므로 이 문제가 없다**.

---

## 4. CORS와 tainted canvas (CONFIRMED — 주문 차단 등급)

- 전역 IIFE(`:11638-11665`)가 **`Image.prototype.src` setter와 `setAttribute`를 패치**해 Firebase
  Storage URL이면 `crossOrigin='anonymous'`를 자동 주입한다.
- `canvasToBlob`(`:11255`)은 `canvas.toBlob(...)`을 쓰고 실패 시 **reject**한다.
- CLAUDE.md §4-7의 런치 차단 조건: **tainted canvas면 인쇄파일 0×0 = 주문 차단.**

**리빌드 현황**: 스펙 026/028이 이미 `crossOrigin`을 **`src` 대입 전에** 설정하는 계약을 확립했고
(028 §CODEX_PASSED), 실패는 fail-closed다. 인쇄 스펙은 **그 계약을 그대로 쓰면 되고 새로 만들 필요가
없다**. 다만 **운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패는 여전히 NOT TESTED**다(028 종료 기록).

---

## 5. 경고가 주문을 막지 않는다 (CONFIRMED — 결함)

```js
var ov = await loadImageStable(src);
if(ov) ctx.drawImage(ov,0,0,dim.w,dim.h);
else warnings.push('frame template image failed');   // :11423-11425
```

→ **템플릿 아트가 없는 인쇄 파일이 그대로 반환**되고, `createOrder`(`:9732`)는 그 blob을 IndexedDB에
저장하고 **다운로드까지 시킨 뒤 카카오를 연다**. `warnings`는 order payload의
`print.warnings`에 담기지만 **어떤 흐름도 그것을 보고 멈추지 않는다**.

미리보기 쪽은 스펙 028에서 **아트 실패 시 캔버스를 아예 만들지 않는(fail-closed)** 계약으로 바꿨다.
→ **인쇄도 같은 규율을 적용할지가 결정 항목**이다(§9 P-3).

---

## 6. 주문 흐름과의 결합 (CONFIRMED)

`createOrder(type, customer, opts)`(`:9732`):

1. `DENN_PREVIEW_DOWNLOAD_READY.ensure(type)` 대기
2. `renderPrintFile(type)` → 인쇄 blob
3. 미리보기 캔버스 `toBlob` → preview blob
4. IndexedDB `denn_order_requests`에 **printBlob·previewBlob 포함** 저장
5. `opts.download !== false`면 **인쇄 파일 다운로드**
6. `opts.openKakao`면 250ms 뒤 **카카오 채널 열기**(`ADM.brand.kakaoUrl`)

`product` payload는 **이름 3개뿐**(`frameSizeName`/`templateName`/`categoryName` 또는
`modelName`/…). **선택한 색·문구 값·pan/zoom·회전·시계 상태가 주문서에 없다** → 운영자는 첨부된 PNG로만
주문 내용을 파악한다. 스펙 031에서 확인했듯 **`clockOn`도 주문에 없다**.

---

## 7. 리빌드 현황 (CONFIRMED)

- `apps/mockup`·`packages/**`에 **인쇄/내보내기 구현이 0건**이다(실제 코드 grep 0).
- `packages/render/src/index.ts:28`의 `RENDER_NOT_IMPLEMENTED`가
  **"the Canvas executor (ctx draw) + print/PNG export are implemented in a later spec"** 라고 명시한다.
- 하지만 **재료는 이미 다 있다**:
  - **결정적 plan**(020/024/025) — 같은 plan을 더 큰 캔버스에 실행하면 인쇄가 된다
  - **executor**(021 + 030 rotation + 031 text capability) — DPR/backing transform을 caller가 소유
  - **normalized pan/scale**(029) — 해상도에 독립적이라 `dim.w/500` 같은 하드코딩이 필요 없다
  - **quarter-turn 회전**(030 C-8) — **"회전은 plan에 담기므로 print가 같은 plan을 소비하면 자동
    일치"** 가 이미 계약이다
  - **wrap 확정 텍스트**(031) — `lines`가 **plan 안에** 있으므로 재측정 없이 재사용할 여지가 있다

→ **인쇄 스펙의 핵심은 "새 렌더러를 만드는 것"이 아니라 "이미 승인된 plan의 좌표를 인쇄 해상도로 옮기는
것"** 이다. **다만 그 방법은 아직 정해지지 않았다** — §8.1의 후보 A/B/C 중 하나를 Codex가 골라야 한다.
`lines`를 빌더에 **입력으로 되돌리는 경로는 현재 존재하지 않으므로**(§8.1 정정) "추가 계약 없이 된다"고
말할 수 없다.

---

## 8. ★ 핵심 설계 논점

### 8.1 ★ 인쇄 좌표를 어떻게 얻는가 — 후보 3개 (Codex 결정 대상)

> **정정(보완 라운드 1)**: 최초 보고서는 "인쇄 폭으로 plan을 재생성하면서 미리보기 `lines`를 그대로
> 전달하면 되고 **추가 계약이 필요 없다**"고 단정했다. **그 경로는 현재 API에 존재하지 않는다.**
> `FrameTextZoneInput`(`packages/render/src/plan/types.ts:145-167`)에는 **prewrapped `lines` 입력이
> 없고**, `buildPreviewRenderPlan`은 값이 있으면 **항상 `measureText`로 다시 wrap**한다
> (`build.ts:771-779`). `lines`는 **`draw-text` command의 출력**으로만 존재한다.
> 아래 세 후보를 실제 코드 근거로 비교하고, 선택은 **Codex 결정 항목 C-1**로 남긴다.

지켜야 할 불변식은 넷이다 — **① 줄바꿈 ② 회전 ③ pan/구도 ④ 레이어 순서**가 미리보기와 동일할 것.

#### 후보 A — 승인된 미리보기 plan을 그대로 실행하고, 앱이 소유한 context에 logical→print 변환을 건다

**코드 근거(가장 강함)**: executor 헤더가
**"no setTransform and no scale(): DPR/backing transform stays the caller's job and this executor
draws in logical coordinates only"** 라고 못 박았다(`apps/mockup/src/canvas/executePreviewPlan.ts:10-11`).
그리고 **이미 그렇게 동작하는 선례가 있다** — `apps/mockup/src/canvas/surface.ts:7-8`의 상태 기계는
`canvas.width/height = backing` → **`setTransform(effectiveDpr)`** → executor 실행이다.
즉 **DPR 2 미리보기는 이미 "같은 논리 plan을 더 높은 실제 해상도로 실행"한 결과**이고, 인쇄는 배율만
훨씬 큰 **같은 패턴**이다.

| 불변식 | 어떻게 보장되는가 |
| --- | --- |
| 줄바꿈 | **동일한 `lines` 배열을 그대로 실행**하므로 재측정 자체가 없다 |
| 회전 | 동일한 `draw-text`/`draw-image-cover` command의 `rotationDegrees`·`rotationQuarterTurns` |
| pan/구도 | 동일한 `drawRect`(이미 normalized→logical 환산이 끝난 값) |
| 레이어 순서 | 동일한 command 배열 |

- **빌더 계약 변경 0**, 새 입력 타입 0. 필요한 것은 **앱 계층의 캔버스 크기 + `setTransform`** 뿐이다.
- 텍스트는 `fillText`가 변환된 컨텍스트에서 실행되므로 **래스터 확대가 아니라 벡터로 다시 래스터화**된다
  (폰트 크기 = logical px × 배율).
- **주의**: executor의 바깥 `save()` 다음 `clearRect(0,0,plan.width,plan.height)`가 **변환된 좌표계**에서
  실행되므로 전체 면을 덮는다(`executePreviewPlan.ts` 실행부). 이는 의도대로지만 **검증 대상**이다.
- **미검증 위험**: 인쇄 배율(수십 배)에서 `letterSpacing`을 glyph별 `fillText`로 그릴 때 누적 반올림이
  미리보기와 다른 자간을 만들 수 있는지 — **NOT VERIFIED**.

#### 후보 B — 검증된 prewrapped 텍스트를 받는 **명시적 새 builder 계약**

`FrameTextZoneInput`에 `lines`(또는 별도 print 전용 입력)를 추가하고, 좌표는 **인쇄 폭에서 다시 계산**한다.

| 불변식 | 어떻게 보장되는가 |
| --- | --- |
| 줄바꿈 | 전달된 `lines`를 **그대로 사용**(재측정 금지) |
| 회전 | 인쇄 폭에서 다시 계산하되 각도는 동일 값 |
| pan/구도 | **normalized pan**(스펙 029)이 해상도 독립이라 재환산해도 같은 구도 |
| 레이어 순서 | 같은 빌더 |

- **비용**: 텍스트 command를 만드는 경로가 **둘(측정형/전달형)** 이 되고, 스펙 031이 확립한
  "측정은 빌더가 한 번만" 규율에 **예외**가 생긴다. 전달된 `lines`가 실제 값·`maxChars`·`maxLines`와
  **일치하는지 검증**하는 계약이 추가로 필요하다(불일치를 복구하지 않고 거부해야 한다).
- **장점**: 인쇄 폭에서 좌표가 새로 계산되므로 후보 A의 "누적 변환" 우려가 없다.

#### 후보 C — 순수 plan-scaling 계약

plan의 모든 길이 필드에 배율을 곱하는 순수 함수.

| 불변식 | 어떻게 보장되는가 |
| --- | --- |
| 네 가지 모두 | **곱셈만 하므로 구조적으로 동일**(빠뜨리는 필드가 없다면) |

- **위험(가장 큼)**: 좌표의 **두 번째 진실 원천**이 생긴다. 곱해야 할 필드가
  `Rect` 4개 × 커맨드마다 + `origin` + `lineHeightPx` + `letterSpacingPx` + `font.sizePx` +
  **각 `lines[].width`** + `stroke width`로 흩어져 있어, **필드가 하나 추가될 때마다 여기도 고쳐야 한다**.
  스펙 030·031이 실제로 필드를 추가했다는 사실이 이 위험이 이론이 아님을 보여준다.
- 레거시의 `dim.w/500`(§3.3)이 정확히 이 형태의 결함이었다.

> **판단**: 코드 근거만 놓고 보면 **후보 A가 가장 적은 계약 변경으로 네 불변식을 모두 구조적으로
> 보장**하고, **이미 DPR 경로로 검증된 패턴**이다. 다만 인쇄 배율에서의 자간·품질은 **실측 전까지
> NOT VERIFIED**이므로, 최종 선택은 Codex가 C-1에서 확정한다.

### 8.2 인쇄 캔버스는 누가 만드는가

executor는 **`<canvas>`를 만들지 않는다**(스펙 021 §1 하드 경계). 인쇄도 그 경계를 지키려면
**앱 계층이 offscreen 캔버스를 만들어 context를 주입**해야 한다. `OffscreenCanvas` 사용 여부는
브라우저 지원·신규 의존성 관점에서 결정 항목이다(§9 C-2).

### 8.3 무엇을 "인쇄 성공"으로 볼 것인가

미리보기는 스펙 026/028/031에서 **fail-closed**를 확립했다(이미지·아트·폰트가 준비되지 않으면 캔버스
자체를 만들지 않는다). 인쇄에도 같은 규율을 적용하면 **경고가 있는 파일은 아예 만들지 않는다**.
이것이 §5의 레거시 결함을 원천 차단한다.

---

## 9. 결정 필요 항목

### 9.1 Founder 결정 (제품·정책)

| ID | 질문 | Claude 권장 | 근거 |
| --- | --- | --- | --- |
| **P-1** | **케이스 인쇄를 이번 스펙에 포함하는가** | **액자만 먼저**, 케이스는 별도 스펙 | 케이스는 V36 구경로 + `textObjs`(범위 밖, F-1)라 텍스트 모델이 다르다. 액자만 하면 029~031 계약을 그대로 재사용한다 |
| **P-2** | **인쇄 물리 치수를 어디서 얻는가** | **카탈로그에 명시 필드 추가**(운영자 입력) — 이름 파싱 **금지** | `frameCm`이 이름 텍스트를 파싱한다(§2.3). 사이즈 이름을 바꾸면 인쇄 해상도가 바뀌는 것은 제품 사고다. 단 **스키마 확장은 admin 스펙**이 필요하다 |
| **P-3** | **경고가 있으면 인쇄를 만들 것인가** | **만들지 않는다(fail-closed)** — 미리보기와 동일 규율 | §5. 아트가 빠진 PNG가 주문으로 나가면 잘못된 제품이 인쇄된다 |
| **P-4** | **DPI·최대 픽셀 값을 어떻게 다룰 것인가** | **P-4a(임시값 + 출력 차단)** 를 권장하되 Founder가 택한다 | 레거시 관측값일 뿐 **인쇄소 근거가 없다**. 아래 별도 표 참조 |
| **P-5** | **주문 payload에 무엇을 담을 것인가** | **항목별로 다르다** — 아래 별도 표 참조 | 성격이 다른 데이터를 한 문장으로 묶을 수 없다 |
| **P-6** | 미리보기와 인쇄의 **줄바꿈이 달라도 되는가** | **안 된다** — §8.1 (a)+wrap 재사용 | 고객이 승인한 화면과 인쇄물이 달라지면 안 된다 |

#### P-4 상세 — 레거시 수치에는 **인쇄소 근거가 없다**

`300dpi` · `minLongSide 3000` · `maxPixels 36,000,000` · `fallbackLongSide 3508`은
**레거시 코드에서 관측한 값일 뿐**이고, 이것이 **실제 인쇄소 요구사항이라는 근거는 저장소 어디에도
없다**(§12 NOT VERIFIED). 따라서 선택지는 "값을 정하는 것"이 아니라 **"확인 전에 무엇을 허용할 것인가"** 다.

| ID | 선택지 | 내용 |
| --- | --- | --- |
| **P-4a** | **임시 호환값으로 구현하되 출력을 차단** *(권장)* | 레거시 값을 **명시적 임시값(provisional)** 으로 표기해 구현·검증까지 진행한다. **단 실제 인쇄 파일의 업로드·주문 전송·배포는 인쇄소 확인 전까지 차단**한다. 로컬 다운로드와 E2E는 허용 |
| **P-4b** | **확인 전 구현 자체 보류** | 인쇄소 요구(해상도·색공간·재단 여백·파일 형식)를 받기 전에는 인쇄 스펙을 시작하지 않는다 |

**P-4a를 권장하는 이유**: 좌표·wrap·회전 계약(§8.1)의 정합성은 **해상도 수치와 무관하게** 검증할 수 있고,
수치는 나중에 상수만 바꾸면 된다. 반대로 **잘못된 파일이 실제 주문으로 나가는 위험**은 출력 차단으로
완전히 막을 수 있다. P-4a를 택하면 **"인쇄소 확인"이 배포 전 차단 조건으로 문서에 남아야 한다**.

> 함께 확인이 필요한 것(현재 저장소에 근거 **0**): **색공간/ICC**, **재단 여백(bleed)·안전선**,
> **파일 형식**(PNG 외 요구 여부), **최대 파일 크기**. 이번 조사 범위 밖이며 P-4b를 택하면 함께 받아야 한다.

#### P-5 상세 — 성격이 다른 세 데이터를 **분리**한다

최초 보고서는 "색·문구 값·사진 변형·시계 유무"를 **한 항목으로 묶어** "담는다"고 권장했다. 세 데이터의
**개인정보 성격이 서로 달라** 하나의 결정으로 묶을 수 없다. 각각 **① 인쇄 PNG 포함 ② 로컬 IndexedDB
메타데이터 저장 ③ 주문 payload 전송 ④ 보존 기간** 을 따로 정한다.

| 데이터 | 성격 | ① PNG 포함 | ② 로컬 저장 | ③ 주문 전송 | ④ 보존 | Claude 권장 |
| --- | --- | --- | --- | --- | --- | --- |
| **색 · 사진 transform**(scale·pan·quarter turn) | **비개인** 설정값 | 이미 픽셀로 포함 | 가능 | 가능 | 주문 처리 기간 | **P-5a: 담는다** — 재현·재인쇄에 필요하고 개인정보가 아니다 |
| **시계 유무**(`clockOn`) | **비개인** 제품 구성 | 포함 안 됨(F-4) | 가능 | 가능 | 주문 처리 기간 | **P-5b: 담는다** — 실물 시계 부착 여부는 **운영자가 알아야 할 제품 구성**인데 지금 주문서에 없다 |
| **고객 문구 원문**(`main`/`name`/`name2`/`date`/`sub`) | **개인정보 가능성 높음**(이름·날짜·기념 문구) | **이미 픽셀로 포함됨** | ? | ? | ? | **P-5c: 스펙 032 기본 범위에서 제외(최소안)** |

**P-5c 최소안(권장)**: 고객 문구를 **텍스트로 저장하지도 전송하지도 않는다.** 이미 인쇄 PNG에 픽셀로
들어가 있어 **주문 처리에 추가 저장이 필수가 아니다**. 텍스트로 별도 저장·전송하려면
**개인정보 처리방침 · 보존 기간 · 삭제 절차에 대한 별도 승인**이 필요하며 이 스펙의 범위가 아니다.

> 스펙 031이 이미 **"오류 payload에 고객 원문을 넣지 않는다"** 를 규율로 세웠다. P-5c는 그 규율을
> **저장·전송 경로까지 일관되게 확장**하는 것이다. 문구를 저장하기로 정한다면 **STOP 조건 8**이 발동해
> 개인정보 정책 승인이 선행되어야 한다.

### 9.2 Codex 구조 결정 (계약)

| ID | 결정 | Claude 권장 |
| --- | --- | --- |
| **C-1** | **인쇄 좌표를 얻는 방법** — §8.1의 **후보 A / B / C 중 택일** | 코드 근거상 **후보 A**(승인된 plan + 앱 소유 context 변환)가 계약 변경 0이고 DPR 경로로 이미 검증된 패턴이라 가장 강하다. **단 인쇄 배율에서의 자간·품질이 NOT VERIFIED**이므로 실측 후 확정한다. 후보 C(순수 scaling)는 좌표의 두 번째 진실 원천을 만들어 레거시 `dim.w/500` 결함을 재생산하므로 **비권장** |
| **C-2** | 인쇄 캔버스 소유자 | **앱 계층**이 offscreen 캔버스를 만들어 context 주입. executor의 "캔버스 생성 금지" 경계 유지. `OffscreenCanvas` vs `document.createElement` 는 지원·의존성 근거로 확정 |
| **C-3** | 이미지 소스 | 스펙 026/028 계약 **그대로 재사용**(crossOrigin-before-src, 재시도 0, fail-closed). 새 로더 금지 |
| **C-4** | 실패 계약 | 인쇄도 **fail-closed**. 부분 파일·경고 동반 파일 **생성 금지**(P-3 확정 시) |
| **C-5** | 회전·pan | **plan이 이미 담고 있으므로 추가 작업 0**(030 C-8, 029 normalized). `dim.w/500` 재현 금지 |
| **C-6** | 시계 | **인쇄에 넣지 않는다**(031 F-4 확정). 별도 코드 불필요 |
| **C-7** | 오류 payload | 기존 규율 유지 — 고객 원문·URL·token·catalog id·예외 원문 **미포함** |
| **C-8** | 검증 | Chromium에서 **실제 PNG 바이트**를 만들고 크기·특정 좌표 픽셀을 확인. 대용량은 `maxPixels` 경계값으로 |

---

## 10. 최소 구현 순서 (권장)

1. 인쇄 크기 계산(순수 함수 + unit) — cm/dpi/min/max 경계
2. 인쇄 plan 생성(미리보기 `lines` 재사용) — unit
3. offscreen 캔버스 + executor 실행 → PNG blob — Chromium E2E
4. fail-closed 규율 연결(이미지·아트·폰트·측정)
5. 주문 payload 확장(P-5 확정 후)
6. 케이스 인쇄(P-1이 포함으로 확정될 때만)

---

## 11. STOP 조건

1. `packages/render/src/geometry/**` 수정이 필요할 때
2. 스펙 026 image owner / 028 art / 029 pan / 030 rotation / 031 text 계약을 **바꿔야** 할 때
3. 신규 의존성(이미지 인코더·폰트·PDF)이 필요할 때
4. **카탈로그 스키마 확장**(P-2의 cm 필드)이 필요해질 때 — admin 스펙 동반
5. `apps/admin/**` 또는 운영 HTML 수정이 필요할 때
6. 실제 network·Firebase·운영 데이터 접근이 필요할 때
7. 인쇄 파일을 **실제로 업로드/전송**해야 할 때(주문 흐름 변경)
8. 고객 문구를 **저장**해야 해서 개인정보 보존 정책이 필요할 때(P-5)
9. 미리보기와 인쇄의 줄바꿈을 일치시킬 수 없을 때(P-6)
10. `maxPixels` 한계로 요구 해상도를 만들 수 없을 때
11. Founder 결정(P-1~P-6) 없이 정책을 확정해야 할 때
12. **인쇄소 확인 없이** 인쇄 파일을 실제 업로드·주문 전송·배포해야 할 때(P-4a의 차단 조건)
13. §8.1의 후보(A/B/C)가 **정해지지 않은 채** 인쇄 좌표 코드를 써야 할 때

---

## 12. 이번 조사에서 하지 않은 것

- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` 변경 **0**
- 구현 스펙 작성 **0**(Codex 소유), 인쇄·내보내기 제품 코드 **0**
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·이미지 접근 **0**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts` **미변경**

### NOT VERIFIED / NOT TESTED

- 레거시 인쇄 경로를 **실행하지 않았다**(코드 근거만). 실제 PNG 바이트·해상도·색을 확인하지 않았다.
- `CONFIG`의 **300dpi / minLongSide 3000 / maxPixels 36,000,000 / fallbackLongSide 3508**의 **출처와
  인쇄소 요구사항**이 저장소에 없다.
- `knownCm(sz)` 하드코딩 표의 내용과 운영 카탈로그의 실제 사이즈 필드 — **운영 데이터 미열람**.
- 운영 bucket CORS·ACAO 부재 시의 실제 tainted canvas 실패(스펙 028에서도 NOT TESTED 유지).
- 대용량 이미지에서의 인쇄 메모리·성능, 실기기 브라우저의 `toBlob` 한계.
- **인쇄 배율에서의 자간·텍스트 품질**(후보 A의 `letterSpacing` glyph별 `fillText` 누적 반올림) — 실측 전.
- **색공간/ICC · 재단 여백(bleed)·안전선 · 파일 형식 · 최대 파일 크기** — 저장소에 근거 **0**.

---

## 13. 보완 라운드 1 (2026-07-31) — Codex 지적 3건

세 건 모두 유효했다. **문서 전용**으로 보완했고 제품 코드는 손대지 않았다.

### 지적 1 — C-1의 `lines` 재사용 경로가 현재 API에 없다 (★ 가장 중요)

최초 §8.1은 "인쇄 폭으로 재생성 + 미리보기 `lines` 재사용, **추가 계약 불필요**"라고 **단정**했다.
**사실이 아니다**: `FrameTextZoneInput`(`plan/types.ts:145-167`)에 **`lines` 입력이 없고**,
빌더는 값이 있으면 **항상 `measureText`로 다시 wrap**한다(`build.ts:771-779`). `lines`는
**`draw-text` command의 출력**으로만 존재한다.

→ 해당 문장을 **제거**하고 §8.1을 **후보 A/B/C 비교**로 다시 썼다. 각 후보가 **줄바꿈·회전·pan·레이어
순서** 네 불변식을 **어떻게** 보장하는지 표로 명시했다. 새로 찾은 근거로 **후보 A가 가장 강하다** —
executor 헤더가 "transform은 caller의 몫"이라고 못 박았고(`executePreviewPlan.ts:10-11`),
**`surface.ts:7-8`이 이미 `setTransform(dpr)` 후 같은 plan을 실행**하고 있어 **DPR 미리보기가 곧 그
패턴의 검증된 사례**다. 다만 선택은 **Codex C-1**로 남겼고 자간 품질은 NOT VERIFIED로 기록했다.

### 지적 2 — P-5가 서로 다른 개인정보 결정을 한 문장에 묶었다

"색·문구 값·사진 변형·시계 유무를 담는다"를 **세 데이터로 분리**하고, 각각 **① PNG 포함 ② 로컬 저장
③ 주문 전송 ④ 보존 기간**을 나눈 표로 다시 썼다(§9.1 P-5 상세).
**최소안 P-5c**: 고객 문구는 **이미 PNG에 픽셀로 들어가므로** 텍스트로 **저장·전송하지 않는다**.
별도 개인정보 정책 승인 없이는 스펙 032 기본 범위에서 **제외**한다. 비개인 항목(색·transform·시계 유무)만
담기를 권장했다.

### 지적 3 — P-4의 수치는 출처가 없다

`300dpi`·`3000`·`36M`·`3508`이 **레거시 관측값일 뿐 인쇄소 요구로 확인된 바 없음**을 선택지에 명시하고,
**P-4a(임시값으로 구현하되 실제 업로드·주문·배포는 인쇄소 확인 전까지 차단)** 와
**P-4b(확인 전 구현 보류)** 로 갈랐다. 함께 받아야 할 미확인 항목(색공간/ICC·재단 여백·파일 형식·최대
크기)도 적었고, STOP 조건 **12·13**을 추가했다.

### 바꾸지 않은 것

§1~§7의 레거시 조사 결과(두 세대 공존 · 해상도 산식 차이 · 물리 치수 추측 · 경고가 주문을 막지 않음 ·
회전 무시 · 시계 제외 정상 · CORS · 주문 결합)와 §10 최소 구현 순서, C-2~C-8은 **그대로**다.
