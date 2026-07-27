# 2026-07-27 — Canvas 렌더 계약 조사 (스펙 019 사전 근거, 읽기 전용)

> **성격:** 읽기 전용 근거 수집. 코드·CSS·JSX·테스트·설정·PNG 무변경. `packages/render` 구현·Canvas UI·실제 Firebase GET·이미지 다운로드·live test 없음.
> **목적:** 케이스·액자 Canvas 편집기를 연결하기 전 레거시 렌더 좌표계·비율·DPR·이미지 배치·템플릿 합성·CORS-clean·인쇄 출력 계약을 파일·라인으로 확정한다.
> **표기:** `CONFIRMED`=직접 코드로 검증(본인 spot-verify 또는 인용 라인 직접 확인), `AGENT-SWEEP`=읽기 전용 전수 grep으로 수집(핵심은 CONFIRMED로 재검증), `NOT VERIFIED`=코드로 확정 불가(실측/실기기/실제 네트워크 필요), `NOT DECIDED`=근거 없음 또는 레거시 내 모순(후속 결정 필요).
> **민감정보:** 실제 상품명·ID·이미지 URL·token·base64는 복사하지 않는다. 물리 용지 치수(cm)·기본 픽셀값은 공식/단위 근거로만 인용한다.

라인 인용 기준 = 스펙 018 종료 HEAD `3ff7a6b`. 레거시 파일은 모두 `denn-mockup-tool.html`(별도 표기 없으면).

---

## 0. 한 줄 결론

레거시는 **케이스·액자·룸이 서로 다른 canvas 사이징·DPR 정책**을 쓴다. **케이스 preview backing = `model.w/h`(DPR 없음), 액자 preview backing = `~500px` 논리크기(DPR 없음, HiDPI 모듈 정의되나 미호출), 룸만 DPR-aware(clamp [1,4])**. 사용자 이미지 배치는 케이스·액자가 **동일 cover-fit 수학**(`baseSc=max(w/iw,h/ih)`, 중심 앵커, `drawImgT`에서만 pan clamp)을 공유하되 액자만 회전 지원·zone transform 소유 방식이 다르다. **인쇄는 preview와 완전 독립**하게 물리 cm→300 DPI 픽셀로 원본에서 재렌더한다. CORS-clean은 전역 `crossOrigin` src-setter monkey-patch(firebasestorage URL에만, src보다 먼저)에 의존하고, 인쇄 실패 시 **주문은 preview-only fallback으로 저장**(하드 차단 아님 — legacy-analysis §7 "주문 차단"과 상충하는 override 동작). 리빌드 정본 DPR 패턴은 POC `useCanvasDpr`(DPR clamp [1,2], `setTransform(dpr)`, ResizeObserver)이며 논리좌표=CSS px가 레거시 룸 방식보다 깨끗하다.

---

## 표 1. 함수별 역할 · 입력 · 출력 · 근거

| 함수 | 역할 | 입력 | 출력/효과 | 근거 | 확정 |
|---|---|---|---|---|---|
| `renderCase` | 케이스 preview 합성 | `curModel`, `caseImg(s)`, `caseImgT(s)`, `curCTpl`, `opts` | `#caseCanvas`에 draw | `1651` | CONFIRMED |
| `renderCaseCustom` | dieline 케이스 분기 | `m.dieline` 있는 model | dieline+magsafe 오버레이 draw | `1696` | AGENT-SWEEP |
| `window.renderFrame`(active) | 액자 preview 합성 | `curFSz`(aspect), `curFCol`, `curFTpl`, `frameImg`, `frameImgT` | `#frameCanvas` 사이즈+draw | `3115`(classic dead `1754`, 회전 wrapper `7355`) | CONFIRMED |
| `drawImgT`(preview) | 사용자 이미지 cover-fit + pan clamp | `ctx,img,x,y,w,h,T{scale,x,y}` | `ctx.drawImage` + `T.x/y` clamp 변형 | `1543` | CONFIRMED |
| `drawImageT`(print) | 인쇄용 cover-fit, **clamp 없음**, pan에 `scale` 곱 | `ctx,img,x,y,w,h,T,scale` | `ctx.drawImage` | `11371`(dup `9732`) | CONFIRMED |
| `drawSlot`/`drawTemplatePhotoSlot` | zone clip(원/라운드/사각) 후 이미지 draw | zone rect, `T` | clip+`drawImgT` | `1818`,`3062` | AGENT-SWEEP |
| `drawCover`/`drawCoverFocus` | **룸 배경** cover-fit(포커스점) | `roomImg`, `scale/zoom`, `ox/oy` 또는 `fx/fy` | `ctx.drawImage` | `3834`,`3838` | AGENT-SWEEP |
| `cPos` | 화면좌표→canvas backing 좌표 | `canvas,e` | `{x:(clientX-rect.left)*(canvas.width/rect.width),…}` | `1535` | CONFIRMED |
| `templateSourceForDesign`/`realTemplateSrc`/`templateSrcForPrint` | 템플릿 이미지 소스 우선순위(스펙 018과 동일) | `tpl` | 문자열 src 또는 null | `3025`,`3029`,`11354` | CONFIRMED |
| `loadImg`/`loadImage`/`loadImageStable` | 이미지 로드(다중 정의, **명시 crossOrigin 없음** → 전역 patch 의존) | `src,cb` | `Image` | `2960`,`6691`,`11257`,`15620` | AGENT-SWEEP |
| `DENN_FRAME_PREVIEW_HIDPI_V361.prepare` | 액자 preview DPR backing(정의됨, **미호출**) | `canvas,w,h` | backing=`w*r`, `setTransform(r)` | 정의 `10456`, ratio `10284`, **호출부 NOT FOUND** | CONFIRMED |
| `rmSizeCanvas`(override) | 룸 canvas DPR 사이징 | area 크기, `roomImg` | backing=CSS×dpr | `4033` | CONFIRMED |
| `applyPreviewScale` | 액자 preview **CSS transform:scale**(backing 무변경) | area 크기, userScale | `wrap.style.transform` | `10401` | AGENT-SWEEP |
| `framePrintSize`/`casePrintSize` | 인쇄 픽셀 크기(cm→DPI 또는 aspect) | `sz`/`model` | `{w,h,dpi}` | `11318`,`9732` | CONFIRMED |
| `renderFramePrintV365` | 액자 인쇄 PNG 재렌더 | `sz,tpl,frameImg,frameImgT` | off-DOM canvas→blob | `11404` | AGENT-SWEEP |
| `canvasToBlob`/`canvasToBlobSafe` | `toBlob('image/png')`(null→reject/null) | canvas | Blob | `11255`,`11133` | CONFIRMED |
| `fallbackCreate` | 인쇄 실패 시 preview-only 주문 저장 | type,customer,error | 주문 저장(printBlob null) | `11164` | CONFIRMED |
| `needsCors` | firebasestorage URL만 CORS 필요 판정 | url string | boolean | `11646` | CONFIRMED |
| `applyWatermark` | **저장 시에만** 워터마크 bake | srcCanvas | 새 canvas | `1848` | AGENT-SWEEP |
| `DENN_FRAME_ORIENTATION_V64`/`applyAspect` | 회전 시 `sz.aspect` 뒤집기 | mode | `sz.aspect=landscape?1/base:base` | `7186`,`7211` | CONFIRMED |

`DENNPrintExportV36`/`DENNOrderRequestV36`의 **base 정의는 이 파일에 없음**(외부 주입); 모든 print/order 로직은 로컬 v36.5 override 계층. (AGENT-SWEEP, `NOT FOUND` in mockup)

---

## 표 2. 케이스 vs 액자 좌표계 비교

| 항목 | 케이스 | 액자 | 근거 | 확정 |
|---|---|---|---|---|
| transform state | `caseImgT={scale:1,x:0,y:0}`, 멀티존 `caseImgTs[]` | `frameImgT={scale:1,x:0,y:0(+rot)}` | `985`,`986`,`989` | CONFIRMED |
| 회전 | 없음 | `frameImgT.rot`(회전 시 재유도) | `7189-7196` | CONFIRMED |
| 좌표 변환 | 공유 `cPos()` | 동일 공식 인라인(별 helper) | `1535`,`10465` | CONFIRMED |
| cover-fit 수학 | `baseSc=max(w/iw,h/ih)*scale` | 동일 | `1545` | CONFIRMED |
| pan clamp | `drawImgT`에서 `|offset|≤|img-zone|/2` | 동일(회전 경로는 clamp 없음) | `1550-1552`,`7346` | CONFIRMED |
| zoom 앵커 | **zone 중심**(pointer 앵커 없음) | 동일 | `1553`(중심식), 핸들러에 앵커 수학 없음 | CONFIRMED |
| scale clamp | 0.3–5(휠/핀치), 30–500%(슬라이더) | 동일 | `1451`,`1475`,`1561` | CONFIRMED |
| 멀티존 transform 소유 | **zone별 개별**(`caseImgTs[i]`) | 업로드 zone **전부 단일 `frameImgT` 공유** | `1665` vs `3074` | CONFIRMED |
| backing 크기 | `model.w/h`(DPR 없음) | `~500px` 논리(DPR 없음, HiDPI 미호출) | `1047` vs `3119`,`10456` | CONFIRMED |
| 화면 크기 방식 | model px 그대로 + CSS scale | CSS `transform:scale`(applyPreviewScale) | `2850`,`10401` | AGENT-SWEEP |

> **판단:** 사용자 이미지 배치 수학은 케이스·액자가 **동일**(공유 가능). 차이는 회전(액자만)·멀티존 소유(케이스 개별 vs 액자 공유)·canvas 사이징뿐. **근거 없이 통합하지 않되, cover-fit/clamp/좌표변환 코어는 하나의 순수 함수로 공유하는 것이 근거 있는 통합.**

---

## 표 3. preview Canvas vs print Canvas 비교

| 항목 | preview(액자) | preview(케이스) | print(액자 V365) | print(케이스 legacy) | 근거 | 확정 |
|---|---|---|---|---|---|---|
| backing 크기 | `pw=max(260,prevMaxW\|\|500)`, `ph=pw*aspect`, cap `maxH=round(500*1.04)` | `model.w × model.h` | `round(cm.w/2.54*300) × round(cm.h/2.54*300)` | `model.w×scale`, `scale=min(5,max(3,3000/max(w,h)))` | `3119` / `1047` / `11321` / `9732` | CONFIRMED |
| DPR 적용 | **없음**(active) | **없음** | 없음(순수 인쇄 px) | 없음 | `3119`,`1047`,`11407` | CONFIRMED |
| 크기 근거 | UI 미리보기 크기 | model 논리 px | 물리 cm × 300 DPI | 논리 px × 배율 | — | CONFIRMED |
| 하한/상한 | maxH clamp | — | minLong `3000`, maxPixels `36,000,000`(초과 시 축소, floor 900) | scale 3~5 | `11329-11337` | CONFIRMED |
| DPI | 화면(N/A) | 화면(N/A) | `300`(CONFIG) | ~3000 longSide 유도 | `11242-11248` | CONFIRMED |
| 소스 | preview 이미지 | preview 이미지 | **원본에서 재렌더**(preview 업스케일 아님) | 재렌더 | `11404` | CONFIRMED |
| pan 스케일 | `drawImgT`(clamp) | 동일 | `drawImageT`, `T.x*scale`(scale=`dim.w/500`) | `T.x*sx`(sx=`dim.w/model.w`) | `11377`,`9732` | CONFIRMED |
| 합성 위치 | on-DOM canvas | on-DOM canvas | `document.createElement('canvas')` off-DOM | off-DOM | `11407` | CONFIRMED |

> 물리 cm 예시(용지 표준, 상품 아님): A2≈42.5×60, A4≈21×29.7. 공식 `px=round(cm/2.54*300)` 만 근거로 인용.

---

## 표 4. Layer draw 순서 (실제 코드 순서, 조건부 표기)

### 케이스 — `renderCase`(비 dieline)

| # | layer | 조건 | 근거 |
|---|---|---|---|
| 1 | 케이스 body(단색/그라데이션/투명 체커) | 항상 | `1657`(def `1685`) |
| 2 | 사용자 이미지(멀티존 clip+`drawImgT` / 단일 photoSlot / safe·printArea rect) | 템플릿·이미지 유무 | `1660-1682` |
| 3 | 템플릿 art 이미지(full canvas, async onload) | 템플릿 선택 시 | `1679` |
| 4 | `drawCams`(물리 카메라 범프) | 항상(onload/no-tpl) | `1679/1682`(def `1741`) |
| 5 | `drawMagsafeLayer` | `opts.magsafe` | `1679/1682`(def `1703`) |
| 6 | `drawPost`(safe 가이드 dash·magsafe/dieline 가이드·`textObjs`) | 가이드는 opts 조건부 | `1708`,`1735` |
| — | 워터마크 | **저장 시만**(preview 아님) | `1848` |

### 액자 — `window.renderFrame`(active `3115`)

| # | layer | 조건 | 근거 |
|---|---|---|---|
| 1 | 프레임 body(shadow+fill+grain+gloss) | `frameVisible()` | `3124` |
| 2 | mat/paper area fill(`tplBg` 또는 흰 `IX,IY,IW,IH`)+6% 검정 stroke | 항상 | `3126-3129` |
| 3 | 사용자 이미지(업로드=zone별 `drawImgT`, 빌트인=레이아웃별 `drawSlot`) | 템플릿 유형 | `3133`,`3134-3140` |
| 4 | 템플릿 overlay art(업로드, async) | 업로드 템플릿 | `3133`(helper `3093`) |
| 5 | text zones(업로드 `textZones` clip+회전) 또는 빌트인 `drawFTxt` | 템플릿 유형 | `3133`,`3134-3140` |
| 6 | clock(`drawClockLayer`) | `clockVisible` | `3131`(def `1816`) |
| 7 | white inner border(`drawTemplateWhiteBorder`) | baked 아니고 설정 시 | `3131`(def `3101`) |
| 8 | `clearFrameBands`(프레임 숨김+B>0 시 border band 지움) | 조건부 | `3131` |
| — | 워터마크 | **저장 시만** | `1848` |

### 인쇄(액자 V365 `11404` / 케이스 `9732`)
bg fill(가능 시) → 사용자 이미지 `drawImageT`(zone/full) → overlay art `drawImage` → text zones → white border bars. **카메라/magsafe/dieline/clock/워터마크는 인쇄 blob에 bake 안 함**(preview 전용 장식). 근거 `11412-11442` / `9732`.

> `maskMode` 식별자 **NOT FOUND** — 마스킹은 clip-path만(`clipZone` `11341`, `drawSlot` clip `1819`). `allowColorChange`는 tint/텍스트색 UI 게이팅 플래그이며 **draw layer 아님**(`11704`,`11852`). (CONFIRMED)

---

## 표 5. 이미지 transform 상태와 수식

| 개념 | 수식/값 | 근거 | 확정 |
|---|---|---|---|
| 초기 transform | `{scale:1, x:0, y:0}`(+ 액자 `rot`) | `985`,`986` | CONFIRMED |
| cover base scale | `baseSc = max(w/iw, h/ih)` (iw/ih=naturalWidth/Height) | `1545` | CONFIRMED |
| 최종 scale | `sc = baseSc * T.scale` | `1546` | CONFIRMED |
| pan clamp(preview) | `maxTx=|iw*sc - w|/2`; `T.x=clamp(T.x, -maxTx, +maxTx)` | `1550-1552` | CONFIRMED |
| draw 위치(preview) | `dx = x + (w - iw*sc)/2 + T.x` (중심 앵커) | `1553` | CONFIRMED |
| draw 위치(print) | `dx = x + (w - iw*sc)/2 + T.x*scale` (clamp 없음, pan 업스케일) | `11377` | CONFIRMED |
| 회전(액자만) | `swap = |rot|%180===90; rw=swap?ih:iw; sc=max(w/rw,h/rh)*T.scale; translate(x+w/2+T.x, y+h/2+T.y); rotate(rot·π/180)` | `7346-7347` | AGENT-SWEEP |
| 화면→canvas 좌표 | `(clientX-rect.left) * (canvas.width / rect.width)` | `1535` | CONFIRMED |
| drag pan | `panStart = pointer - T`; move: `T = pointer - panStart` | `1470`,`1490`,`1502-1506` | AGENT-SWEEP |
| wheel zoom | `Δ = deltaY>0?-0.08:0.08; scale = clamp(scale+Δ, 0.3, 5)` | `1451-1458` | AGENT-SWEEP |
| pinch zoom | `ratio = dist/lastDist; scale = clamp(scale*ratio, 0.3, 5)`; `dist=√(dx²+dy²)` | `1475-1487` | AGENT-SWEEP |
| slider zoom | `scale = val/100`, `stepZoom` clamp 30–500% | `1559-1563` | CONFIRMED |
| zone rect(케이스) | `zx=zone.x/100*W`, … (퍼센트 기반) | `1664` | AGENT-SWEEP |
| zone rect(액자 업로드) | `x=IX + z.x/100*IW`, … (프레임 내부 IX,IY,IW,IH 기준) | `3074` | AGENT-SWEEP |

> **zoom 앵커 = zone 중심**(pointer/pinch-midpoint 앵커 아님). 재구현 시 pointer-anchored zoom을 원하면 근거 없는 신규 동작 → 별도 결정. (NOT DECIDED)

---

## 표 6. DPR · resize · orientation 처리

| 컨텍스트 | backing 크기 | DPR clamp | ctx scale | resize/orientation 트리거 | 근거 | 확정 |
|---|---|---|---|---|---|---|
| 케이스 preview | `model.w × model.h` | **없음** | 없음 | model 선택시만 | `1047` | CONFIRMED |
| 액자 preview(active) | 논리 `pw×ph`(~500) | **없음**(HiDPI `prepare` 미호출) | 없음 | ResizeObserver→CSS scale, 회전→aspect flip | `3119`,`10456`,`10373`,`7211` | CONFIRMED |
| 액자 HiDPI(미사용) | `w*r` | `[1, 2.25]`(MODE 1/1.75/2.25, MAX_PIXELS 7.2M) | `setTransform(r)` | — | `10284`,`10292-10301` | CONFIRMED(미호출) |
| 룸 canvas(base override) | `CSS × dpr` | `[1, 4]`(주석 "상한 3"↔코드 `,4)` 불일치) | 없음(backing px로 draw) | `resize`/`orientationchange` 160ms | `4037`,`4056`,`4825` | CONFIRMED |
| 룸 canvas(V106 phone) | `w × dpr`, `RATIO 0.462` | `[1, 4]` | 없음 | `resize`→coverFit | `14498-14500`,`14516` | AGENT-SWEEP |
| 룸 canvas(V107 rotate-fs) | `cw × dpr` | `[1, 4]` | 없음 | `resize`/`orientationchange` | `14595-14597`,`14985` | AGENT-SWEEP |
| **POC 정본** `useCanvasDpr` | `round(rect × dpr)` | `[1, 2]`(`DPR_CAP=2`) | `setTransform(dpr,…)` | `ResizeObserver`+`orientationchange`, sleep 없음 | `poc/.../App.tsx:116-166` | CONFIRMED |
| 회전 시 transform 보존 | `frameImgT.scale/x/y` 보존, `rot`만 재유도; print도 동일 `frameImgT` 사용 | — | — | `7189-7196`,`11407` | CONFIRMED |

> **관측:** 레거시는 preview에 DPR을 안 쓰고(케이스/액자) 룸에만 적용 → preview 선명도 불균일. **리빌드 정본 = POC `useCanvasDpr`**: 논리좌표=CSS px, backing=CSS×min(dpr,cap), `ctx.setTransform(dpr)`, ResizeObserver. DPR 상한값(2 vs 4)은 **NOT DECIDED**(POC 2, 레거시 룸 4·주석 3 모순).

---

## 표 7. CORS-clean · 실패 · 출력 차단 계약

| 항목 | 동작 | 근거 | 확정 |
|---|---|---|---|
| crossOrigin 설정 시점 | 전역 monkey-patch가 `src` 대입 **전에** `crossOrigin='anonymous'` 설정 | `11655-11657` | CONFIRMED |
| crossOrigin 조건 | `needsCors`: `data:`/`blob:`→false, `firebasestorage.(googleapis.com\|app)`→true | `11646-11650` | CONFIRMED |
| loadImg 계열 | 명시 crossOrigin 없음 → 전역 patch에 의존 | `2960`,`6691`,`11257` | AGENT-SWEEP |
| tint/export 명시 경로 | `img.crossOrigin='anonymous'`(src 전) + 실패 시 crossOrigin 없이 재시도(같은 URL) | `12119`,`12138` | AGENT-SWEEP |
| bucket CORS 전제 | 코드/주석이 firebasestorage가 `Access-Control-Allow-Origin` 보낸다고 가정(미설정 시 taint) | `12133`,`12707`,legacy §7 | NOT VERIFIED(버킷 설정은 in-repo 아님) |
| taint 검출 | `getImageData` try/catch → `{error:'…tainted…CORS 미설정 가능성'}`, `pass=hasData && !error && goldRatio>15` | `12694-12710` | CONFIRMED |
| toBlob/toDataURL | 인쇄 `canvasToBlob(canvas,'image/png')` null→**reject**; 안전판 `canvasToBlobSafe` null→resolve(null) | `11255`,`11133` | CONFIRMED |
| 0×0 방지(인쇄) | `framePrintSize` minLong 3000·floor 900 → 항상 큰 canvas | `11329-11337` | CONFIRMED |
| 인쇄 실패 시 주문 | **하드 차단 아님** — `fallbackCreate`가 `printBlob:null`+`width/height:0`+warning으로 preview-only 주문 저장 | `11164-11185` | CONFIRMED |
| legacy-analysis §7 "tainted=주문 차단" | v36.5 override 실제 동작(preview-only fallback)과 **상충** → 목표 계약 재확정 필요 | `00-legacy-analysis.md:138` vs `11164` | NOT DECIDED |
| preview 성공 ⇒ print 성공? | **아니오** — print는 독립 재렌더(다른 canvas/소스 로드). preview taint-clean이 print taint-clean을 보장 안 함 | `11404-11446` | CONFIRMED |
| 썸네일(스펙 018) crossOrigin | 표시 전용이라 crossOrigin **불필요**(Canvas 미사용) | 스펙 018 | CONFIRMED |

> **Canvas CORS-clean은 실제 네트워크 없이 무엇까지 자동검증 가능한가:** (a) `crossOrigin`이 src보다 먼저 설정되는지 = DOM 단위 검증 가능, (b) `needsCors` 분류 = 순수 유닛, (c) taint 시 `toBlob`/`getImageData`가 예외→fallback 경로 = 합성 tainted canvas(교차출처 이미지 없이도 `<img>` 없이 재현은 제한적)로 부분 검증, (d) **실제 firebasestorage CORS 헤더로 clean draw 되는지 = 실제 네트워크 필요(NOT VERIFIED, 후속 실기 스펙)**.

---

## 표 8. 책임 분리안 (@denn/shared · render · firebase · apps)

| 계층 | 책임(권장) | 하지 않을 것 | 의존 방향 |
|---|---|---|---|
| **@denn/render**(순수) | geometry/layout/transform/layer-plan: cover-fit(`baseSc=max(w/iw,h/ih)`)·pan clamp·zone rect(퍼센트→px)·backing-size 유도(container CSS + aspect + DPR cap → backing px)·**layer 순서 plan**(그리기 아님)·인쇄 px(`cm/2.54*dpi`, minLong/maxPixels clamp)·aspect flip(회전) | Canvas/DOM/`ctx`·이미지 로드·React·Firebase·네트워크 | `render → shared`만 |
| **@denn/shared**(순수) | 검증된 catalog view + 타입(이미 `CatalogDocumentV1`·browse selector·image projection). 렌더 입력용 최소 view 제공 | render/Firebase/React/IO 의존 | 루트(무의존) |
| **@denn/firebase** | Canvas-usable 신뢰 이미지 source + **CORS 정책**: `resolvePublicImageSource`(스펙 018) + "이 src는 crossOrigin 필요/불필요"를 명시하는 Canvas 변형. taint 위험 URL을 DOM 전달 전 판정 | fetch/SDK/preload·`ctx` | `firebase → shared`만 |
| **apps/mockup** | Canvas DOM·`getContext`·`ctx.drawImage`(render의 layer-plan 실행)·ResizeObserver·DPR backing 세팅(`useCanvasDpr` 패턴)·pointer/touch 이벤트→논리좌표 변환·React lifecycle·이미지 `<img>`/`Image` 로드 | geometry 수학 재구현(→ render 호출) | 패키지 조합 |

**불변식(현행 유지):** `render`는 React/Firebase/DOM 무의존(현 `packages/render/src/index.ts`가 `@denn/shared`의 `Result`만 import). `shared`는 render/Firebase/React 무의존. `firebase→shared` 단방향. app이 조합. (CONFIRMED, `packages/render/src/index.ts:1-4`)

---

## 표 9. CONFIRMED / NOT VERIFIED / NOT DECIDED 요약

| 항목 | 상태 |
|---|---|
| cover-fit 수학(케이스=액자 공유) `baseSc=max(w/iw,h/ih)` | **CONFIRMED** |
| preview pan clamp는 `drawImgT`에서만·중심 앵커·scale 0.3~5 | **CONFIRMED** |
| 케이스 backing=`model.w/h`(DPR 없음), 액자 backing=논리 px(DPR 없음, HiDPI 미호출) | **CONFIRMED** |
| 룸만 DPR-aware(clamp [1,4], 주석 3↔코드 4) | **CONFIRMED(모순 플래그)** |
| 인쇄=cm/2.54×300 DPI, minLong 3000/maxPixels 36M, preview와 독립 재렌더 | **CONFIRMED** |
| crossOrigin은 src보다 먼저, firebasestorage URL에만(전역 patch) | **CONFIRMED** |
| taint 검출=`getImageData`/`toBlob` try/catch | **CONFIRMED** |
| 인쇄 실패→preview-only 주문 저장(하드 차단 아님) | **CONFIRMED(§7 문서와 상충)** |
| 멀티존 transform: 케이스 개별 vs 액자 공유 | **CONFIRMED** |
| aspect: 액자 `sz.aspect=H/W`(회전 시 flip), 케이스 `model.w/h` | **CONFIRMED** |
| 목표 DPR 상한값(2 vs 4) | **NOT DECIDED** |
| 목표 주문-차단 계약(하드 차단 vs preview-only fallback) | **NOT DECIDED** |
| zoom 앵커(중심 vs pointer) 목표값 | **NOT DECIDED** |
| 실제 firebasestorage bucket CORS 헤더 현재 설정 여부 | **NOT VERIFIED(in-repo 아님, 실제 GET 금지)** |
| 실제 인쇄 파일 픽셀/DPI 정확도·프린터 호환 | **NOT VERIFIED(실제 출력 필요)** |
| 실기기 4환경·200% 확대에서 canvas 선명도·회전 | **NOT VERIFIED** |
| `DENNPrintExportV36`/`DENNOrderRequestV36` base 정의(외부 주입) | **NOT VERIFIED(mockup 내 NOT FOUND)** |
| 출력 DPI·pixel 크기 최종 확정 | **NOT DECIDED(임의 확정 금지)** |

---

## 표 10. 스펙 019 권장 최소 범위 · 명시적 제외 · 후속 순서

### 권장 첫 단위 = **순수 geometry(@denn/render) + apps의 얇은 DPR backing adapter까지**(정적 preview·pointer 미포함)

편집기 전체를 한 번에 구현하지 않는다. 근거: 레거시 렌더는 layer/canvas/DPR/print가 서로 얽혀 있고(래퍼 다수), pointer/회전/CORS는 각기 독립 리스크. 가장 안전한 첫 단위는 **부작용 없는 수학 + DPR backing 유도**다.

**스펙 019 포함(권장 최소):**
1. `@denn/render` 순수 함수: `coverFit(zoneW,zoneH,imgW,imgH,T)`→draw rect(중심+clamp), `zoneRect(percent, containerRect)`, `frameBackingSize(containerCss, aspect, dprCap)`, `printPixelSize(cm, dpi, {minLong,maxPixels})`, `resolveAspect(sz, orientation)`, **`layerPlan(kind, inputs)`**(그리기 아님, 순서 있는 layer 기술). 케이스·액자 공유 코어 + kind별 차이(회전/멀티존)만 분기.
2. 숫자 허용오차 유닛 테스트(golden 아님).
3. (선택) apps에 `useCanvasDpr` 패턴의 backing/DPR adapter만(그리기 없음) — POC 코드 이식 수준.

**명시적 제외(스펙 019에서 안 함):**
- 실제 `ctx.drawImage` 합성 렌더(→ 다음 단위), pointer/touch drag/scale, 텍스트/시계, 인쇄 blob/toDataURL, 실제 이미지 로드·CORS-clean 실검증, 실제 Firebase GET, upload/저장/주문/시안, Canvas UI 추가, Firebase SDK/Rules/CORS 변경, 신규 패키지, 배포, 운영 HTML 수정.

**권장 단계 분리(후속 스펙 순서):**
1. **geometry contract**(순수, 스펙 019) — 수학/rect/backing/print px/layer-plan.
2. **deterministic renderer** — layer-plan을 offscreen/실 canvas에 정적으로 draw(합성 fixture, 이미지 없이 shape/fill부터), Playwright로 CSS/backing/aspect/DPR/overflow 검증.
3. **image loading / CORS** — `@denn/firebase` Canvas-clean 신뢰 source + crossOrigin(src 전), taint fallback. 실검증은 실기 스펙.
4. **pointer transform** — drag/pan/pinch/wheel→논리좌표, clamp, (앵커 정책 결정).
5. **text / clock** — text zones·wrap·clock layer.
6. **print / export** — cm→px 재렌더, `toBlob`, 실패 fallback 계약(주문 차단 정책 확정 후).

### 확정 필요(스펙 019 착수 전 Codex 결정 권장)
- DPR 상한(2 vs 4), 주문-차단 계약(하드 vs preview-only fallback), zoom 앵커(중심 vs pointer), 케이스·액자 코어 공유 범위. **임의 확정 금지**(NOT DECIDED로 남김).

---

## 조사 준수 확인

- 코드·CSS·JSX·테스트·설정·lockfile·운영본·PNG **무변경**(읽기 전용). `packages/render` 구현·Canvas UI **미착수**. 실제 Firebase GET·이미지 다운로드·live test·배포 **미실행**.
- 보고서에 실제 상품명·ID·이미지 URL·token·base64 **미복사**(물리 cm·기본 px·공개 bucket명만 공식 근거로 인용).
- 케이스·액자 수학은 **근거 있는 공유 코어만** 통합 제안(무근거 통합 금지), 출력 DPI/픽셀은 **임의 확정하지 않음**(cm→300DPI는 레거시 관측값으로만 기록).
- 확인 불가 = **NOT VERIFIED**, 근거 없음/모순 = **NOT DECIDED**. 핵심 결론은 파일명+라인(대부분 직접 spot-verify).
