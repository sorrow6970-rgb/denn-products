# 2026-07-28 — 상품 render-plan 앱 어댑터 조사 (스펙 025 사전 근거, 읽기 전용)

> **성격:** 읽기 전용 근거 수집. 앱·패키지·테스트·CSS·설정·lockfile **무변경**. 실제 Firebase GET·이미지 다운로드·live test·Firebase/Rules/CORS/Hosting 변경·배포 **없음**. **스펙 025 구현 미착수.**
> **목적:** 스펙 023 `CasePreviewGeometry`/`FramePreviewGeometry` + 호출자 제공 색상·사용자 이미지 상태 → 스펙 020/024 `CasePlanInput`/`FramePlanInput` 결합을 담당하는 **`apps/mockup` 순수 어댑터** 계약을 확정한다.
> **표기:** `CONFIRMED`=이 조사에서 해당 파일·라인을 직접 읽어 확인 / `NOT VERIFIED`=코드로 확정 불가 / `NOT DECIDED`=근거 없음·상충(결정 필요, 임의 확정 금지).
> **기준:** 리빌드 라인 = HEAD `b51568d`(스펙 024 종료). 레거시 라인 = 이번 조사에서 직접 재확인.
> **민감정보:** 운영 데이터·상품명·ID 원문·URL·token·base64 **미복사**.

---

## 0. 한 줄 결론

어댑터가 필요한 값은 **세 갈래**로 완전히 분리된다: **카탈로그 기하**(스펙 023 projection) · **명시적 외형 입력**(색상 — 카탈로그에 근거 없음) · **사용자 이미지 상태**(imageRef+intrinsic+transform, 정의상 호출자 소유). 이번 조사에서 새로 확정된 핵심은 **프레임 사진 영역의 inset이 template variant에 따라 두 값뿐**이라는 것이다 — **uploaded + design source ⇒ `imageZone == matRect`(inset 0)**, **그 밖의 지원 variant(builtin `full`, source 없는 uploaded) ⇒ mat에서 사방 8 logical px inset**. 그리고 레거시의 `P = uploadedTransparentTpl ? 0 : 8`(`:3130`)은 **도달 불가 분기**다: uploaded+source는 `:3133`에서 `return`하므로 `P`가 쓰이는 코드에 오지 않는다. 즉 **`P`가 실제로 쓰일 때 값은 항상 8**이고, inset 0은 `P`가 아니라 **uploaded 경로가 mat rect(`IX,IY,IW,IH`)를 그대로 쓰기 때문**에 발생한다. 또 `P=8`은 **비율이 아니라 고정 logical px**이며, 레거시 preview 논리크기는 `prevMaxW‖500` 기반 공식으로 정해지고 **canvas CSS 크기 = 논리 크기**로 설정된다(`:3119`) — 스펙 022 불변식과 이미 일치한다. 어댑터는 **논리 width를 필수 호출자 입력**으로 받아야 하며 `500`을 라이브러리 기본값으로 넣을 근거는 없다.

---

## 표 1. case 선택·geometry·image state → `CasePlanInput` 매핑

`CasePlanInput` = `packages/render/src/plan/types.ts:60-68`, 검증 `plan/build.ts:154-158`(케이스 경로).

| plan 필드 | 공급원 | 근거 | 확정 |
|---|---|---|---|
| `kind: "case"` | 선택 상태 `productKind` | `apps/mockup/src/browse/selection.ts:22` | CONFIRMED |
| `logicalCanvas` | **`CasePreviewGeometry.modelLogicalSize` 그대로 사용 가능** — 레거시 케이스 canvas가 정확히 `model.w/h`이고 CSS도 동일 px | `packages/shared/src/catalog/preview/types.ts`(modelLogicalSize), 레거시 `denn-mockup-tool.html:1047` | CONFIRMED / 단 표 6 §CSS 참조 |
| `bodyColor` | **명시적 호출자 입력(`#RRGGBB`)** — 카탈로그에 케이스 색 필드 없음, 레거시는 HTML 하드코딩 스와치 8종 + 전역 `caseColor` 기본 `#1A1A1A` | 스와치 `:322-330`, 기본값 `:977`, setter `:1274`; `models` 알려진 필드에 색 없음(`packages/shared/src/catalog/read.ts:68-79`) | CONFIRMED(근거) / 값은 표 7 |
| `image`(intrinsic) | **호출자 사용자 이미지 상태**(zone별) | `plan/build.ts:156`(zones 비어도 필수) | CONFIRMED |
| `defaultTransform` | **호출자 입력**; 레거시 기본값 `{scale:1,x:0,y:0}`은 zone 최초 접근·업로드 시 생성 | `:985`, `:1367-1368`, `:1380-1381` | CONFIRMED |
| `zones[].id` | 스펙 023이 만든 **`case-zone-<sourceIndex>`** 를 그대로 전달(문법 `^[A-Za-z0-9][A-Za-z0-9._-]*$` 통과) | `preview/project.ts`(id 합성), 문법 `plan/build.ts:33-34` | CONFIRMED |
| `zones[].rect` | `CasePreviewGeometry.zones[].percentRect` → `{units:"percent", …}` | `preview/types.ts`, `plan/types.ts:24-38` | CONFIRMED |
| `zones[].imageRef` | **zone별 호출자 imageRef**(메모리 binding key) | `plan/types.ts:47-51` | CONFIRMED |
| `zones[].transform` | **zone별 호출자 transform**(없으면 `defaultTransform` 사용 — plan 계약이 이미 지원) | `plan/build.ts:178-180` | CONFIRMED |
| `zones[].order` | 사용 안 함(스펙 023이 원본 순서를 보존하고 `order` 필드도 없음) | 조사 2026-07-28 표4 | CONFIRMED |
| `zones[].guide` | **이번 범위 밖**(레거시 safe/printArea 가이드는 dash 선) | 스펙 023 §제외 | 후속 |

**연결 방식(권고):** `zones[].id`(`case-zone-<i>`)를 키로 하는 **`ReadonlyMap<string, UserImageState>`** 를 호출자가 넘긴다. 어댑터는 geometry의 zone 목록을 순회하며 map을 조회하고, **누락 zone은 명시적 실패**로 처리한다(표 8). index 재계산·재정렬을 하지 않으므로 id↔상태 연결이 안전하다. (권고, 근거: 스펙 023 id 계약 + 표 5 레거시 per-zone 모델)

---

## 표 2. frame 선택·geometry·appearance → `FramePlanInput` 매핑

`FramePlanInput` = `packages/render/src/plan/types.ts:70-95`(스펙 024 이후 `matRect` 필수), 검증·containment `plan/build.ts:246-283`.

| plan 필드 | 계산식 / 공급원 | 근거 | 확정 |
|---|---|---|---|
| `kind: "frame"` | 선택 상태 | `selection.ts:22` | CONFIRMED |
| `logicalCanvas` | **호출자 입력 `W`** + `H = W × aspect`(반올림 정책 필요) — projection은 `aspect`만 준다 | `preview/types.ts`(aspect), 레거시 `:3119` | 표 6 / **NOT DECIDED**(반올림·소유권) |
| `frameRect` | `{x:0, y:0, width:W, height:H}` — 레거시 프레임 body는 캔버스 전체 | 레거시 `:3124` | CONFIRMED |
| `B`(band 두께) | **`B = max(1, round(W × borderPercentOfWidth / 100))`** — 폭 기준 퍼센트 | 레거시 `:3120`, projection `borderPercentOfWidth` | CONFIRMED |
| `matRect` | `{x:B, y:B, width:W-2B, height:H-2B}` | 레거시 `:3122`(`IX=B,IY=B,IW=W-2B,IH=H-2B`) | CONFIRMED |
| `imageZone` | **variant별 inset**: uploaded+source ⇒ `matRect` 그대로 / 그 밖의 지원 variant ⇒ `matRect`를 사방 **8 logical px** inset | 표 3 | CONFIRMED |
| `frameColor` | **호출자 입력**(카탈로그 `frameColors[].fill`은 있으나 선택 단계·projection 출력에 없음) | `denn-admin.html:853` vs `selection.ts:21-27`, `preview/types.ts` | 표 7 |
| `matColor` | **projection `matColor`**(canonical 대문자 `#RRGGBB`, 기본 `#FFFFFF`) | `preview/project.ts`(mat 해석) | CONFIRMED |
| `image` / `imageRef` / `transform` | **단일** 사용자 이미지 상태(프레임은 zone 공유) | 표 5, `plan/build.ts:252-256` | CONFIRMED |
| `innerBorder` | **공급 금지**(레거시 4-band fill과 stroke는 동등하지 않음) | 스펙 024 §2, `plan/types.ts:88-93` | CONFIRMED |
| `B=0` 예외 | 레거시는 design-canvas 템플릿 + 프레임 숨김일 때 `B=0` | 레거시 `:3121` | 이번 범위 밖(프레임 숨김 UI 없음) |

---

## 표 3. frame template variant별 inset 판정 (`P=0` / `P=8` / 지원 불가)

레거시 흐름을 라인으로 추적한 결과다. **`P`의 삼항식과 실제 도달 경로가 다르다.**

| variant | 레거시 사진 영역 | inset | 스펙 023 지원 | 근거 | 확정 |
|---|---|---|---|---|---|
| `uploaded` + design source **있음**, zone 데이터 없음 | `drawTemplatePhotoSlot(IX,IY,IW,IH)` = **mat 전체** | **0** | ✅ 지원 | `:3133`(분기 진입 후 **`return`**) → `:3068-3072` | CONFIRMED |
| `uploaded` + source 있음, 단일 zone `0,0,100,100` | zone 퍼센트 = `IX + 0%·IW …` = **mat 전체** | **0** | ✅ 지원 | `:3069-3074` | CONFIRMED |
| `uploaded` + source 있음, zone이 sub-rect 또는 2개 이상 | zone별 sub-rect / 다중 | — | ❌ 스펙 023이 실패 | `:3074`, 스펙 023 DONE | CONFIRMED |
| `builtin` `full` | `drawSlot(cx,cy,cw,ch)` = **mat에서 `P` inset** | **8** | ✅ 지원 | `:3130`(`cx=IX+P …`), `:3134` | CONFIRMED |
| `uploaded` + source **없음** | `:3133` 분기 미진입 → id 미매칭 → `:3140` else `drawSlot(cx,cy,cw,ch)` | **8** | ✅ 스펙 023은 지원(zone 데이터 없으면) | `:3133`,`:3140` | CONFIRMED |
| `builtin` `top_text`(0.7 높이)·`duo`(2)·`trio`(3)·`text_only`(0)·`circle`(원) | 각각 sub-rect/다중/없음/원형 | — | ❌ 스펙 023이 실패 | `:3135-3139` | CONFIRMED |
| 미지의 `builtin` id | `:3140` else = mat inset 8 | (8) | ❌ 스펙 023이 실패(추정 금지) | `:3140`, 스펙 023 DONE | CONFIRMED |
| `designCanvasTemplate(tpl)` | mat 흰 채움·6% stroke **건너뜀**, 프레임 숨김이면 `B=0` | — | 별도 축 | `:3121`,`:3125`,`:3128-3129` | CONFIRMED / 표 13 Q6 |

**`P = uploadedTransparentTpl ? 0 : 8`(`:3130`)의 실제 의미(CONFIRMED):**
`uploadedTransparentTpl = tpl.type==='uploaded' && realTemplateSrc(tpl) && !tpl.whiteInnerBorder`(`:3125`)인데, **uploaded+source는 `:3133`에서 `return`** 하므로 `P`가 쓰이는 `:3130` 이후 코드(빌트인 dispatch)에 **도달하지 않는다**. 따라서 **`P`가 실제로 사용될 때 값은 항상 8**이고, inset 0은 `P`가 아니라 uploaded 경로가 mat rect를 그대로 쓰는 데서 나온다. `whiteInnerBorder`는 uploaded 경로에서 overlay/inner-border 표시에만 영향하며 **inset 결정에는 도달하지 않는다.**

**어댑터 판정에 필요한 입력(권고):** 문자열 소스가 아니라 **boolean/variant 하나**로 충분하다 —
`contentInsetPx = (type === "uploaded" && hasDesignSource) ? 0 : 8`.
`hasDesignSource`는 표 4 우선순위 체인의 **존재 여부(boolean)** 이며, 스펙 023 projection이 이 판정을 `FramePreviewGeometry`에 **추가로 노출**하는 것이 자연스럽다(카탈로그 의미는 `@denn/shared` 소유). 현재 projection 출력에는 없다 → **스펙 025의 필수 결정**(표 13 Q1).

---

## 표 4. `realTemplateSrc` / `templateSourceForDesign` 필드 우선순위와 민감정보 경계

| 항목 | 내용 | 근거 | 확정 |
|---|---|---|---|
| 함수 관계 | `realTemplateSrc(tpl)` = `templateSourceForDesign(tpl)`(동일 함수 위임) | `:3029`, `:3025` | CONFIRMED |
| 게이트 | `tpl.generatedDetailPreview`가 truthy면 **무조건 `null`** | `:3025` | CONFIRMED |
| 우선순위 체인 | `dataUrl` → `sourceDataUrl` → `builderArtDataUrl` → `artDataUrl` → `originalDataUrl` → `null` | `:3025` | CONFIRMED |
| 리빌드 동일 체인 | 스펙 018 projection이 **같은 순서**를 이미 구현 | `packages/shared/src/catalog/images/project.ts:33-39`, 게이트 `:77` | CONFIRMED |
| **민감정보 경계** | 어댑터는 이 **문자열을 받지도 반환하지도 않아야 한다** — inset 판정에 필요한 것은 **존재 여부 boolean**뿐 | 표 3 결론 | 권고 |
| 혼합 금지 | 이 체인은 **템플릿 art 소스**이며 사용자 업로드 사진이 아니다. plan의 `imageRef`와 절대 혼합 금지 | `images/project.ts:1-14`, `plan/types.ts:5-10` | CONFIRMED |
| `designCanvasTemplate` 중복 정의 | `:3026`은 `templateSourceForDesign(tpl)`(전체 체인) 사용, `:7120-7123`은 **`t.dataUrl`만** 검사 → **의미가 다른 두 정의**가 공존 | `:3026`, `:7120-7123` | **NOT VERIFIED**(어느 정의가 최종 유효한지 스코프 확인 불가) |

---

## 표 5. case zone별 이미지·transform 우선순위

| 항목 | 레거시 동작 | 근거 | 확정 |
|---|---|---|---|
| 상태 변수 | `caseImg`(단일 legacy) · `caseImgT`(단일) · `caseImgs[]`(zone별) · `caseImgTs[]`(zone별) · `activeCaseZone` | `:985-990` | CONFIRMED |
| **이미지 우선순위** | `img = caseImgs[i] ‖ caseImg` — **zone별 우선, 없으면 legacy 단일 이미지** | `:1662` | CONFIRMED |
| **transform 우선순위** | `T = caseImgTs[i] ‖ (i===0 ? caseImgT : {scale:1,x:0,y:0})` — zone별 우선, **zone 0만** legacy 단일 transform으로 fallback, 그 외 zone은 항등 | `:1665` | CONFIRMED |
| 업로드 시 | `caseImgs[i]=img; caseImgTs[i]={scale:1,x:0,y:0}; activeCaseZone=i` → **새 이미지마다 transform 초기화** | `:1380-1382` | CONFIRMED |
| 최초 접근 시 | `if(!caseImgTs[activeCaseZone]) caseImgTs[activeCaseZone]={scale:1,x:0,y:0}` → **lazy 기본 transform** | `:1367-1368` | CONFIRMED |
| 제거 시 | `caseImgs[i]=null; caseImgTs[i]={scale:1,x:0,y:0}` | `:1404` | CONFIRMED |
| **이미지 없는 zone** | `if(!img) return;` → **조용히 건너뜀**(그 zone은 비고 템플릿 art만 덮임) | `:1663` | CONFIRMED |
| 프레임 쪽 | `frameImgT` **단일**, 업로드 zone 전부 같은 `T` 공유 | `:986`, `:3074` | CONFIRMED |
| **리빌드 권고** | 스펙 020 `CaseImageZone.imageRef`는 **필수**이므로 zone 하나라도 이미지가 없으면 plan을 만들 수 없다 → 레거시처럼 건너뛰지 말고 **명시적 실패**(표 8 `MISSING_ZONE_IMAGE`) | `plan/types.ts:46-58`, `build.ts:167` | 권고 / 표 13 Q4 |

---

## 표 6. `logicalCanvas` 계산·소유권

| # | 항목 | 값·근거 | 확정 |
|---|---|---|---|
| 1 | 레거시 프레임 논리크기 | `customPrev = uiCustom.prevMaxW ‖ 500` · `maxW = max(260, customPrev)` · `maxH = max(320, round(customPrev×1.04))` · `pw = maxW, ph = pw×aspect` · **`if (ph > maxH) { ph = maxH; pw = ph/aspect }`** · `logicalW = round(pw), logicalH = round(ph)` | `:3119` CONFIRMED |
| 2 | 레거시 CSS 크기 | `canvas.width/height = logicalW/logicalH`, **`canvas.style.width/height = 같은 px`** → 레거시도 **CSS == 논리** | `:3119` CONFIRMED |
| 3 | 스펙 022 불변식 | 관측 CSS 크기와 `plan.logicalCanvas` 차이가 축당 **0.5px 초과면 executor 미실행·안전 실패**; surface가 canvas CSS 크기를 `plan.logicalCanvas`로 지정 | `apps/mockup/src/canvas/surface.ts`(`LOGICAL_SIZE_TOLERANCE_PX`), `PreviewCanvasSurface.tsx` | CONFIRMED |
| 4 | 케이스 논리크기 | `modelLogicalSize`(예 320×620)를 그대로 쓰면 canvas CSS도 그 크기 → 좁은 viewport에서 wrapper 가로 스크롤(스펙 022 CSS가 이미 그렇게 설계) | `:1047`, `surface.css` | CONFIRMED / 표 13 Q5 |
| 5 | `prevMaxW`·`500` | 관리자 UI 설정값이며 `CatalogV1` 모델에 없음 → **라이브러리/어댑터 기본값 근거 없음** | `:3119`, 스펙 023 Q14 | **NOT DECIDED**(임의 500 금지) |
| 6 | 권고 소유권 | **논리 width는 어댑터의 필수 입력**, `H = width × aspect`는 어댑터가 계산. viewport에 맞는 width 산출은 **상위 React layout 책임**(어댑터는 순수 함수) | 스펙 022 §3(반응형 plan 생성기 아님) | 권고 |
| 7 | 반올림 | 레거시는 `round(pw)`·`round(ph)`·`B=max(1,round(...))`. 어댑터가 **어디서 몇 번 반올림**할지, 정수 강제 여부는 미정 — containment(`canvas ⊇ frame ⊇ mat ⊇ image`)가 exact 비교이므로 규칙이 필요 | `:3119-3120`, `plan/build.ts:268-275` | **NOT DECIDED** |
| 8 | 작은 논리크기 | `W-2B ≤ 0` 또는 `mat − 2×8 ≤ 0`이면 rect width/height가 non-positive → builder가 `INVALID_ZONE`(readRectOnce가 finite positive 요구) | `plan/build.ts:302-316` | CONFIRMED / 어댑터 사전 실패는 표 8 |

---

## 표 7. 색상 공급·기본값 허용 여부

| 값 | 카탈로그 근거 | 권고 | 확정 |
|---|---|---|---|
| case `bodyColor` | **없음** — 레거시 HTML 팔레트 8종·기본 `#1A1A1A` | **명시적 `#RRGGBB` 호출자 입력**(어댑터 기본값 없음) | `:322-330`,`:977` CONFIRMED / 값 **NOT DECIDED** |
| frame `frameColor` | `frameColors[].fill`(`#RRGGBB`)은 존재하나 **선택 단계·projection 출력에 없음** | (a) 검증된 hex를 호출자가 전달 **또는** (b) `frameColorId`로 projection이 lookup — **택일 필요**. 어댑터가 카탈로그를 직접 읽는 것은 계층 위반(표 9) | `denn-admin.html:853`, `selection.ts:21-27` / **NOT DECIDED** |
| 첫 색 자동 선택 | 레거시는 `curFCol = FC[0]` 강제 | **금지**(스펙 023이 이미 자동 선택 금지로 종료) | 레거시 `:1046` CONFIRMED / 리빌드 채택 **금지** |
| `matColor` | projection이 canonical 대문자 `#RRGGBB` 제공(기본 `#FFFFFF`) | 그대로 전달 | `preview/project.ts` CONFIRMED |
| 웜 토프 토큰 | `WARM_TAUPE`(`#9F887A` 등)은 **UI 디자인 토큰** | **상품 색 기본값으로 사용 금지** | `packages/ui/src/index.ts:7` CONFIRMED |
| `'transparent'` | 레거시 케이스 체커보드 분기 | 스펙 020 색 어휘 밖 → **거부**(어댑터 입력 검증에서 실패) | `:1686-1688` CONFIRMED |
| alpha·CSS 변수·named color | 레거시 mat outline `rgba(0,0,0,.06)`, `'red'` 등 | **거부** — plan은 정확한 `#RRGGBB`만(`build.ts:27,47`) | CONFIRMED |
| 대소문자 | projection은 대문자 canonical; plan 정규식은 대소문자 모두 허용 | 어댑터가 입력 hex를 canonical 대문자로 정규화할지 미정 | **NOT DECIDED**(소소) |

---

## 표 8. adapter 오류 코드 (권고 초안)

payload는 **`code`만**(+필요 시 `zoneSourceIndex?` 같은 index 수치). **상품명·model/template/color ID 원문·imageRef·URL·token·base64·storagePath·raw catalog·원문 예외 금지**(스펙 016/018/023 선례: `browse/types.ts:26-37`, `preview/types.ts`).

| 실패 | 권고 code | 비고 |
|---|---|---|
| 어댑터 입력 자체가 malformed(null/primitive/hostile getter) | `INVALID_ADAPTER_INPUT` | throw 금지(스펙 021·023·024 선례) |
| 외형 입력 누락(`bodyColor`/`frameColor` 없음) | `MISSING_APPEARANCE` | 기본색 생성 금지 |
| 외형 입력이 `#RRGGBB` 아님(alpha·named·transparent·CSS var) | `INVALID_APPEARANCE` | 원문 미보존 |
| 프레임 사용자 이미지 상태 없음 | `MISSING_USER_IMAGE` | plan 필수 필드라 대체 불가 |
| 케이스 zone 중 일부 이미지 없음 | `MISSING_ZONE_IMAGE`(+`zoneSourceIndex`) | 레거시 skip과 다름(표 5) |
| 논리 width 누락·비유한·비양수 | `INVALID_LOGICAL_SIZE` | `500` 기본값 금지 |
| mat/image rect가 non-positive(너무 작은 논리크기) | `NON_POSITIVE_RECT` | builder 실패 전 사전 판정 권고 |
| 지원 불가 template variant | `UNSUPPORTED_TEMPLATE_VARIANT` | 스펙 023 실패 전달 포함 |
| 스펙 023 projection 실패 | `PROJECTION_FAILED`(+ projection code 그대로 전달) | code만 전달, 원문 없음 |
| `buildPreviewRenderPlan` 실패 | `PLAN_BUILD_FAILED`(+ plan code) | plan code 집합 확장 금지 |
| 이미지 상태의 `imageRef`가 plan 문법 위반 | `INVALID_IMAGE_REF` | 값 미노출 |

---

## 표 9. 계층별 책임·의존성

| 계층 | 책임 | 하지 않을 것 | 의존 방향 |
|---|---|---|---|
| `@denn/shared` | catalog raw → **중립 geometry**(+ 표 3의 variant/`hasDesignSource` boolean 추가 후보) | render/React/DOM/Firebase 의존, 색·이미지·CSS 크기 결정 | 루트(무의존) |
| **`apps/mockup` adapter(신규, 순수)** | geometry + **명시적 외형** + **사용자 이미지 상태** + **논리 width** → `CasePlanInput`/`FramePlanInput` → `buildPreviewRenderPlan` 호출 | 카탈로그 직접 파싱, 색·이미지 기본값 생성, drawable/binding map 수령, DOM·React·IO | shared·render 조합 |
| `@denn/render` | 카탈로그 의미 없이 plan 검증·명령 생성(containment·snapshot·safe Result) | catalog·색 정책·이미지 로드 | render → shared(`type Result`만) |
| `apps/mockup` UI(후속) | 논리 width 산출, 색 선택 UI, 파일 선택·decode·binding map, surface 연결 | — | 조합 |

**불변식(CONFIRMED):** `packages/render/src/index.ts:1-5`(render → shared의 `type Result`만), `packages/shared/src/index.ts`(무의존), `apps/mockup/src/App.tsx:1-8`(앱이 조합). 어댑터를 앱에 두면 이 방향을 그대로 유지한다.

**binding map 경계(CONFIRMED):** surface는 `plan`과 `imageBindings`를 **별개 prop**으로 받는다(`PreviewCanvasSurface.tsx`), executor는 `imageRef`를 **메모리 binding 조회 키로만** 쓴다(`apps/mockup/src/canvas/types.ts`, 스펙 021 승인 계약). → **어댑터는 drawable·binding map을 받지 않고 plan만 만든다.**

---

## 표 10. 공개 API 후보 비교

| 후보 | 장점 | 단점 | 평가 |
|---|---|---|---|
| **A. `buildCaseProductPlan` + `buildFrameProductPlan`(권고)** | 입력 타입이 kind별로 정확(케이스=zone map, 액자=단일 이미지), 오류 분기 단순, 테스트 표가 명확 | 함수 2개 | **권고** |
| B. product-kind union 단일 함수 | 호출부 하나 | 케이스/액자 입력이 크게 달라 union 판별·옵셔널이 늘고, 스펙 020이 이미 kind별 입력을 분리한 이유와 충돌 | 비권고 |
| C. React hook | 앱 연결 편의 | 순수성 상실(스펙 025 범위는 순수 어댑터) | 범위 밖 |

**초안(확정 아님):**

```ts
// apps/mockup/src/plan/ — framework-free, 순수. drawable·binding map·URL 미수령.
interface UserImageState {
  readonly imageRef: string;                                     // 메모리 binding key (URL/base64/token 아님)
  readonly intrinsicSize: { readonly width: number; readonly height: number };
  readonly transform: { readonly scale: number; readonly x: number; readonly y: number };
}

buildCaseProductPlan(input: {
  readonly geometry: CasePreviewGeometry;                          // 스펙 023
  readonly bodyColor: string;                                      // 명시적 #RRGGBB
  readonly zoneImages: ReadonlyMap<string, UserImageState>;        // key = case-zone-<i>
  readonly defaultTransform: UserImageState["transform"];
}): ProductPlanResult<CasePlanInput>;

buildFrameProductPlan(input: {
  readonly geometry: FramePreviewGeometry;                         // 스펙 023
  readonly contentInsetPx: 0 | 8;                                  // 표 3 variant 판정 결과
  readonly frameColor: string;                                     // 명시적 #RRGGBB
  readonly logicalWidth: number;                                   // 필수 (500 기본값 없음)
  readonly userImage: UserImageState;
}): ProductPlanResult<FramePlanInput>;

type ProductPlanResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: ProductPlanErrorCode; readonly zoneSourceIndex?: number };
```

---

## 표 11. unit / E2E 검증 (권고)

| 유형 | 검증 |
|---|---|
| unit | 케이스: geometry+색+zone map → `CasePlanInput` 정확 매핑(zone id·percent rect·순서 보존) |
| unit | 케이스: zone 하나 누락 → `MISSING_ZONE_IMAGE`(+index), 조용한 skip 0 |
| unit | 액자: `B = max(1, round(W×pct/100))`, `matRect = {B,B,W-2B,H-2B}` 정확 |
| unit | 액자: `contentInsetPx` 0/8에 따라 `imageZone == matRect` vs mat inset 8 |
| unit | 액자: `H = W × aspect` + 반올림 규칙(스펙에서 확정된 규칙대로) |
| unit | 작은 W → `NON_POSITIVE_RECT`(builder 도달 전) |
| unit | 색: 누락·alpha·named·`transparent`·CSS 변수 거부, 웜 토프 토큰 기본값 0 |
| unit | 결과 plan을 `buildPreviewRenderPlan`에 넣어 **containment 통과**(canvas ⊇ frame ⊇ mat ⊇ image) |
| unit | projection 실패·plan 실패 전달 시 code만, 원문 0 |
| unit | hostile 입력(getter/Proxy/revoked)에서 throw 0 |
| unit | 입력 비변형·결정성·JSON-safe·모든 number finite |
| unit | 오류·성공 직렬화에 이름/ID/imageRef/URL/base64/token/path 0 |
| E2E | **불필요**(순수 어댑터). 실제 Canvas 픽셀은 스펙 022·024 harness가 이미 커버 → 앱 화면 연결은 후속 스펙 |

---

## 표 12. 스펙 025 포함 / 제외 / 후속

| 구분 | 항목 |
|---|---|
| **포함(권고 최소)** | `apps/mockup`의 순수 어댑터 2함수, 표 8 오류 계약, 표 3 inset 적용, `B`/`matRect`/`imageZone` 계산, 논리 width 필수 입력, zone id↔이미지 상태 연결, 합성 fixture unit |
| 포함(조건부) | `contentInsetPx`를 어디서 판정할지 — projection 확장(권고) vs 어댑터 입력(임시) 중 **Codex 결정 후** |
| **후속 UI 연결로 연기** | 고객 화면 Canvas 연결, 논리 width 산출(layout), 색 선택 UI/selector 확장, 프레임 색 lookup 경로 |
| **후속 이미지/CORS 스펙으로 연기** | 파일 선택·업로드, decode/load, binding map 생성, Firebase Storage, CORS-clean, `crossOrigin` |
| 후속(그 외) | pointer/pinch/wheel·회전·text/clock/watermark·print/export·저장·주문·Hosting 격리·배포·실기기 |
| **NOT VERIFIED** | 운영 카탈로그의 uploaded/builtin 분포, `designCanvasTemplate` 중복 정의의 최종 유효본, 사이즈별 `frameThickness` 존재, `prevMaxW` 실제 설정값 |
| **NOT DECIDED** | 케이스/액자 색 공급 방식·기본값, 논리 width 소유·반올림 규칙, `contentInsetPx` 판정 위치, zone 이미지 누락 정책, case `logicalCanvas`를 model px로 둘지 |

---

## 표 13. QUESTIONS / NOT VERIFIED

| # | 항목 | 성격 | 내용 |
|---|---|---|---|
| **Q1** | `contentInsetPx` 판정 위치 | **차단** | 표 3의 판정은 `type==='uploaded'` + **design source 존재 boolean**만 필요하다. 카탈로그 의미이므로 `@denn/shared` projection이 `FramePreviewGeometry`에 boolean/variant를 **추가**하는 것이 자연스럽지만 스펙 023 출력은 현재 `{aspect,borderPercentOfWidth,matColor}`뿐이다. (a) projection 확장 (b) 어댑터 필수 입력으로 호출자 위임 중 **결정 필요**. 어댑터가 카탈로그를 직접 읽는 것은 계층 위반. |
| **Q2** | 논리 width 소유·반올림 | **차단** | `500`·`prevMaxW`는 근거 없음(표 6 §5). width를 필수 입력으로 받고 `H=W×aspect`를 어댑터가 계산하되 **반올림 시점(W만? H만? B 계산 전?)** 을 스펙이 고정해야 한다(containment가 exact 비교). |
| **Q3** | 색 공급 방식 | **차단** | case `bodyColor`·frame `frameColor` 모두 **명시적 hex 입력** vs `frameColorId` projection lookup 중 택일. 첫 색 자동 선택은 금지 유지. |
| **Q4** | zone 이미지 누락 정책 | **차단** | 레거시는 **조용히 skip**(`:1663`), 스펙 020은 zone별 `imageRef` **필수**. 전체 실패 / 이미지 있는 zone만으로 plan 생성(=zone 부분 집합) 중 결정 필요. 후자는 "조용한 제외"에 가까워 권고하지 않는다. |
| **Q5** | case `logicalCanvas` | NOT DECIDED | `modelLogicalSize`(예 320×620)를 그대로 쓰면 CSS도 그 크기 → 모바일에서 가로 스크롤. 스케일된 논리크기를 쓰려면 zone percent는 그대로여도 되지만 **누가 크기를 정할지** 결정 필요. |
| **Q6** | `designCanvasTemplate` 계열 | NOT DECIDED | mat 흰 채움·6% stroke skip·`B=0`(프레임 숨김) 동작(`:3121`,`:3128-3129`)은 이번 범위 밖으로 두는 것이 안전하나, 해당 템플릿이 스펙 023 "uploaded full-mat"과 교집합을 가질 수 있다. |
| **Q7** | `P` 삼항식 사문화 | 보고 | `:3130`의 `uploadedTransparentTpl ? 0 : 8`은 **도달 불가**(`:3133` return). 리빌드는 `P` 식을 복제하지 말고 **표 3의 경로 기반 판정**을 쓰는 것이 정확하다. |
| Q8 | `designCanvasTemplate` 중복 정의 | **NOT VERIFIED** | `:3026`(전체 소스 체인)과 `:7120-7123`(`dataUrl`만)의 의미가 다르며 최종 유효본을 스코프로 확정하지 못했다. |
| Q9 | 운영 분포 | **NOT VERIFIED** | uploaded vs builtin, source 유무, zone 데이터 유무의 실제 비율은 실제 카탈로그 GET 없이 확인 불가. |
| Q10 | `prevMaxW` | **NOT VERIFIED** | `A.uiCustom.prevMaxW`는 관리자 UI 설정 추정이며 `CatalogV1` 모델에 없다. |

---

## 변경·무변경 파일

| 구분 | 파일 |
|---|---|
| **변경(문서 2개)** | `docs/codex-claude-handoff/reviews/2026-07-28-product-render-plan-adapter-investigation.md`(신규, 이 문서) · `docs/codex-claude-handoff/CURRENT.md`(상태 최소 반영) |
| **무변경(확인)** | `apps/**` · `packages/**` · `tests/**` · `scripts/**` · 설정(`package.json`·`pnpm-lock.yaml`·`vite*.config.ts`·`playwright.config.ts`·`vitest.config.ts`·`biome.json`) · CSS · 운영 `denn-*.html` · `firebase.json`·`.firebaserc`·Rules · `poc/**` · 디자인·결과 PNG |
| **미실행** | 실제 Firebase GET · 이미지 다운로드 · live test · 배포 · 신규 의존성 |

---

## 조사 준수 확인

- 읽기 전용. 앱·패키지·테스트·CSS·설정·lockfile **무변경**, **스펙 025 구현 미착수**.
- 실제 네트워크·live test·Firebase/Rules/CORS/Hosting 변경·배포 **0**.
- **임의 결정 금지 준수**: 논리 width 기본값 `500`·케이스/액자 기본색·웜 토프 토큰 오용·zone 이미지 누락 정책·반올림 규칙·`contentInsetPx` 판정 위치 = 전부 Q/NOT DECIDED로 남김.
- 운영 데이터·상품명·ID 원문·URL·token·base64 **미복사**(기본 카탈로그 스키마와 좌표 공식만 인용).
- 확인 못 한 것은 **NOT VERIFIED**로 기록하고 추측하지 않음.
