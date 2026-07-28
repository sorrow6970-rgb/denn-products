# 2026-07-28 — 선택 상태·카탈로그 → render-plan projection 조사 (스펙 023 사전 근거, 읽기 전용)

> **성격:** 읽기 전용 근거 수집. 앱·패키지 코드·테스트·CSS·설정·lockfile **무변경**. 실제 Firebase GET·이미지 다운로드·live test·Firebase/Rules/CORS/Hosting 변경·배포 **없음**. **스펙 023 구현 미착수.**
> **목적:** 현재 선택 상태(case/frame ID)와 `CatalogDocumentV1`을 스펙 020 `PreviewRenderPlan` 입력으로 **안전하게 투영**하기 위한 레거시 계약을 파일·라인으로 확정한다.
> **표기:** `CONFIRMED`=이 조사에서 해당 파일·라인을 직접 읽어 확인 / `NOT VERIFIED`=코드로 확정 불가 / `NOT DECIDED`=근거 없음·상충(결정 필요, 임의 확정 금지).
> **기준:** 리빌드 라인 = HEAD `207ec3b`(스펙 022 종료). 레거시 라인 = 이번 조사에서 직접 재확인(`denn-mockup-tool.html`, `denn-admin.html`).
> **민감정보:** 운영 데이터·상품명·ID 원문·URL·token·base64 **미복사**. 인용은 기본 카탈로그(`DEF`)의 공개 스키마와 좌표 공식뿐.

---

## 0. 한 줄 결론

**기하(geometry)는 카탈로그에서 나온다. 색(color)과 사용자 이미지는 카탈로그에 없다.** 케이스 논리 크기(`models[].w/h`)·zone 퍼센트 사각형(`photoZones`)·액자 aspect(`frameSizes[].aspect`)·테두리 두께(`frameThickness`)·mat 배경색(`frameTemplateBg`)·프레임 색 목록(`frameColors[].fill`)은 모두 **확정된 카탈로그 근거**가 있다. 반면 **케이스 body 색은 레거시 HTML에 하드코딩된 UI 팔레트**(`denn-mockup-tool.html:322-330`)이고, **액자 색은 카탈로그에 있으나 리빌드 UI에 선택 단계가 없으며**(스펙 016/017), **사용자 이미지(intrinsic size·transform·imageRef)는 정의상 호출자 입력**이다. 또한 스펙 020 명령 어휘로 **표현 불가능한 레거시 요소**가 확정됐다: 원형·라운드 zone(`type==='circle'`, `cornerR`), 라운드+그림자 케이스 body, mat 외곽선 `rgba(0,0,0,.06)`, inner border의 **4-band fill**(stroke-rect와 기하가 다름), 액자 multi-zone. 따라서 스펙 023은 **"카탈로그 기하만 투영하고, 색·이미지·표현 불가 요소는 명시적으로 호출자 입력 또는 진단으로 남기는" 순수 projection**으로 좁히는 것을 권고한다.

---

## 표 1. 선택 필드 → catalog collection lookup

현재 선택 상태는 **ID 5개뿐**(`apps/mockup/src/browse/selection.ts:21-27`), 완료 판정 `BrowseFlow.tsx:320`.

| 선택 필드 | lookup 대상 collection | plan 생성에 필요한가 | 근거 | 확정 |
|---|---|---|---|---|
| `productKind` | — (plan `kind` 결정) | **필수** | `packages/render/src/plan/types.ts:61,71` | CONFIRMED |
| `modelId` | `data.models[]` | **케이스 필수**(논리 크기) | `denn-admin.html:848`, `packages/shared/src/catalog/read.ts:68-79` | CONFIRMED |
| `templateId`(case) | `data.caseTemplates[]` | **케이스 필수**(zone) | `denn-admin.html:849`(기본 `[]`), `read.ts:64-65`(opaque) | CONFIRMED |
| `frameSizeId` | `data.frameSizes[]` | **액자 필수**(aspect) | `denn-admin.html:852`, `read.ts:82,264` | CONFIRMED |
| `templateId`(frame) | `data.frameTemplates[]` | **액자 필수**(mat 배경·inner border·zone) | `denn-admin.html:850`, `read.ts:84-101` | CONFIRMED |
| `categoryId` | `caseCategories`/`frameCategories` | **불필요** — plan 입력 어디에도 category 필드가 없다(탐색 필터 전용) | `plan/types.ts:60-83`, `browse/types.ts:12-14` | CONFIRMED |
| (없음) 색 선택 | `data.frameColors[]` | 액자 `frameColor`에 필요하나 **선택 단계 자체가 없음** | `denn-admin.html:853` vs `selection.ts:21-27` | **차단(Q2)** |

**lookup 규칙(권고 근거):** 스펙 018 projection이 이미 확립한 방식 — id로 collection에서 찾고(`Array.isArray` 확인 후 `find`), 없으면 **원본 item을 반환하지 않고** 최소 결과/진단만 돌려준다(`packages/shared/src/catalog/images/project.ts:54-63,71-92`). 동일 패턴을 재사용하면 raw catalog·URL·token이 새로 노출되지 않는다. (CONFIRMED)

---

## 표 2. 레거시 raw 필드 → `CasePlanInput` 매핑

`CasePlanInput` 필수 필드는 `packages/render/src/plan/types.ts:60-68`, 런타임 검증은 `plan/build.ts:157-161`.

| plan 필드 | 필수 | 레거시/카탈로그 공급원 | 정확한 근거 | 확정 |
|---|---|---|---|---|
| `kind:"case"` | 필수 | 선택 상태 | `selection.ts:22` | CONFIRMED |
| `logicalCanvas` | 필수 | `models[].w`,`models[].h`(논리 px, 예 320×620) — 레거시 케이스 canvas backing이 정확히 이 값 | `denn-admin.html:848`, `denn-mockup-tool.html:1047`(`c.width=curModel.w;c.height=curModel.h`) | CONFIRMED / **정의 충돌은 Q3** |
| `w/h` 검증 | — | read 경계가 **유한 양수**로 검증(있을 때) | `packages/shared/src/catalog/read.ts:259-263` | CONFIRMED |
| `bodyColor` | 필수(`#RRGGBB`) | **카탈로그에 없음.** 레거시는 HTML 하드코딩 스와치 8종 + 전역 상태 `caseColor`(기본 `#1A1A1A`), `'transparent'`면 체커보드 | `denn-mockup-tool.html:322-330`(마크업), `:977`(기본값), `:1274`(setter), `:1686`(transparent 분기) | **CONFIRMED(출처가 UI라는 사실) / 값 채택은 Q1** |
| `image`(intrinsic w/h) | **필수(zones가 비어도)** | 사용자 업로드 이미지 — 카탈로그 아님 | `plan/build.ts:159` | 호출자 입력(§3) |
| `defaultTransform` | 필수 | 레거시 초기값 `{scale:1,x:0,y:0}` | `denn-mockup-tool.html:985` | CONFIRMED(초기값) |
| `zones[]` | 배열 필수(빈 배열 허용) | `caseTemplates[i].photoZones`(퍼센트) / 없으면 `photoSlot` 단일 / 둘 다 없으면 safe·printArea 경로 | `:1660-1661`(zones), `:1673-1677`(photoSlot, 기본 `{x:5,y:5,w:90,h:90}`), `:1681`(safeMargin/safeInset 16 또는 printArea) | CONFIRMED |
| `zone.id` | **필수**(`^[A-Za-z0-9][A-Za-z0-9._-]*$`) | **카탈로그에 없음** — 저작 시 저장 필드는 `{x,y,w,h,type,cornerR,label}` | `denn-admin.html:2191`, 문법 `plan/build.ts:39-40` | **차단(Q4: id 합성 방식)** |
| `zone.imageRef` | 필수 | 사용자 이미지 binding key — 카탈로그 아님 | `plan/types.ts:49-51` | 호출자 입력(§3) |
| `zone.rect` | 필수 | `photoZones[i].x/y/w/h` = **모델 w/h 대비 퍼센트** → 스펙 020 `units:"percent"`와 일치 | 저작 `denn-admin.html:2191`(`z.x/m.w*100`…), 소비 `denn-mockup-tool.html:1664` | CONFIRMED |
| `zone.order` | 선택 | **카탈로그에 없음**(배열 순서만 존재) | `denn-admin.html:2191`(order 필드 없음) | CONFIRMED(부재) → 배열 index 사용 가능 |
| `zone.transform` | 선택 | 레거시는 zone별 `caseImgTs[i]`(런타임 편집 상태) | `denn-mockup-tool.html:989`,`:1665` | 호출자 입력(§3) |
| `zone.guide` | 선택 | 레거시 safe/printArea 가이드는 **dash 선**(별도 layer) | `:1681`, drawPost `:1708`,`:1735` | 부분 표현만(실선) — Q7 |
| **표현 불가 A** | — | 케이스 body = **라운드 사각 + 그림자**(`rr(ctx,2,2,W-4,H-4,r)` + shadowBlur 36) | `:1691` | **스펙 020 어휘 밖** |
| **표현 불가 B** | — | zone clip이 **원형(`type==='circle'`) 또는 라운드(`cornerR`)** 가능 | `:1667-1668`, 저작 `denn-admin.html:2191` | **스펙 020 어휘 밖(Q5)** |
| **표현 불가 C** | — | `'transparent'` body = 12px 체커보드 | `:1686-1688` | **스펙 020 어휘 밖** |

---

## 표 3. 레거시 raw 필드 → `FramePlanInput` 매핑

`FramePlanInput`은 `plan/types.ts:70-83`, 검증 `build.ts:240-246`. 레거시 본체는 `window.renderFrame`(`denn-mockup-tool.html:3115-3131`).

| plan 필드 | 필수 | 레거시 공식·공급원 | 근거 | 확정 |
|---|---|---|---|---|
| `kind:"frame"` | 필수 | 선택 상태 | `selection.ts:22` | CONFIRMED |
| `logicalCanvas` | 필수 | `pw=max(260, uiCustom.prevMaxW‖500)`, `ph=pw*aspect`, `aspect=sz.aspect‖1`, maxH clamp `round(prevMaxW*1.04)` | `denn-mockup-tool.html:3119` | CONFIRMED(레거시) / 리빌드 정의는 **Q3** |
| `frameRect` | 필수 | 프레임 body = **캔버스 전체** `fillRect(0,0,W,H)`(+shadow) | `:3124` | CONFIRMED |
| `imageZone` | 필수 | `B=max(1, round(W*thickPct/100))`, **`IX=B, IY=B, IW=W-2B, IH=H-2B`** | `:3120`,`:3122` | CONFIRMED |
| (예외) `B=0` | — | design-canvas 템플릿이고 프레임 숨김이면 `B=0` | `:3121` | CONFIRMED |
| `frameColor` | 필수(`#RRGGBB`) | `fc.fill` = `frameColors[].fill`(`{id,name,fill,grain,custom}`) | `denn-admin.html:853`, 소비 `denn-mockup-tool.html:3124` | CONFIRMED(출처) / **선택 단계 부재 = Q2** |
| 색 미선택 시 | — | 레거시는 **첫 항목**을 강제 선택(`curFCol=FC[0]`), 렌더에서도 `curFCol‖FC[0]` fallback | `:1046`,`:3118` | CONFIRMED(레거시 동작) / 리빌드 채택은 **NOT DECIDED** |
| `matColor` | 필수(`#RRGGBB`) | `tplBg`(=`frameTemplateBg(tpl)`) 있으면 그 색, 없으면 **`#fff`** | `:3126-3128`, 정의 `:3112` | CONFIRMED |
| `tplBg` 활성 플래그 | — | `backgroundEnabled‖templateBackgroundEnabled‖canvasBgEnabled`(true/1/'1'/'true'/'on') | `:3109-3110` | CONFIRMED |
| `tplBg` 색 별칭·검증 | — | `templateBackgroundColor‖canvasBgColor‖backgroundColor‖paperColor`, **`^#[0-9a-fA-F]{6}$` 통과분만**, 아니면 `#fff` | `:3111` | CONFIRMED |
| `innerBorder` | 선택 | 레거시는 **stroke가 아니라 4개 fillRect 띠**: 두께 `lw=max(1, min(IW,IH)*th/100)`(**퍼센트**), 색 `tpl.whiteBorderColor‖'#fff'`, 게이트 `whiteBorderBaked===true‖whiteInnerBorder===true`, 이미 baked면 skip | `:3101-3107`,`:3102` | **기하 불일치(Q6)** |
| `image`/`imageRef`/`transform` | **전부 필수** | 사용자 업로드 이미지 — 카탈로그 아님 | `build.ts:244-246` | 호출자 입력(§3) |
| **표현 불가 D** | — | mat 외곽선 `strokeStyle='rgba(0,0,0,.06)'`, `lineWidth 1.5` → 스펙 020은 **`#RRGGBB` 전용**(알파 없음) | `:3129`, 검증 `build.ts:27,47` | **스펙 020 어휘 밖(Q7)** |
| **표현 불가 E** | — | 액자 템플릿은 **multi photoZone** 가능(`duo`,`trio`,`circle` 등), zone은 IW/IH 퍼센트 | `denn-admin.html:850`, `denn-mockup-tool.html:3069-3074`, shape `:3050-3051` | **FramePlanInput은 단일 imageZone(Q8)** |
| **표현 불가 F** | — | 콘텐츠 inset `P=8`(사진/텍스트 영역이 mat보다 8px 안쪽) | `:3130` | 스펙 020 미표현 |

---

## 표 4. photoZone shape·단위·지원 가능 여부

| 항목 | 케이스 | 액자 | 근거 | 스펙 020 지원 |
|---|---|---|---|---|
| 저장 필드 | `{x,y,w,h,type,cornerR,label}` | `{x,y,w,h,type,…}` | `denn-admin.html:2191` / `denn-mockup-tool.html:3074` | 부분 |
| 좌표 단위 | **모델 w/h 대비 퍼센트** | **imageZone(IW/IH) 대비 퍼센트** | `:2191`(`z.x/m.w*100`) / `:3074`(`IX+z.x/100*IW`) | `units:"percent"` ✅ (액자는 컨테이너가 캔버스가 아니라 imageZone이라 **좌표계 기준이 다름**) |
| 누락값 기본 | — | `num(z.x,0)`,`num(z.w,100)` → 전체 영역 | `:3074`, `num` `:2742` | 명시 필요 |
| `id` | **없음** | **없음** | `:2191` | ❌ 필수인데 없음 → 합성 필요(Q4) |
| `order` | **없음**(배열 순서) | 없음 | `:2191` | 배열 index 사용 가능 |
| `type:'circle'` | 지원(ellipse clip) | 지원(ellipse clip) | `:1667` / `:3050` | ❌ `clipRect`만(Q5) |
| `cornerR` | 지원(라운드 clip) | **액자 경로엔 없음** | `:1668` / `:3050-3051` | ❌ (Q5) |
| `label` | 저작 메타(렌더 미사용) | — | `:2191` | 불필요 |
| zone별 transform | 런타임 `caseImgTs[i]` | 업로드 zone 전부 **단일 `frameImgT` 공유** | `:1665` / 조사 2026-07-27 표2 | 호출자 입력 |
| 별칭·마이그레이션 | `photoZones` ← `zones`, `photoSlot` ← `photoZones[0]` | 양방향 별칭 | `denn-mockup-tool.html:11030-11031`, `denn-admin.html:9783-9784` | 읽기 시 별칭 처리 필요 |
| 저작 경로 차이 | 한 빌더는 **`photoZones` 없이 `photoSlot`만** 저장, 다른 빌더는 `photoZones` 저장 | — | `denn-admin.html:2191`(push에 photoZones 없음) vs `:2326`(photoZones 포함) | 두 형태 모두 처리 필요 |
| 스키마 검증 | **없음** — `caseTemplates` 아이템은 read 경계에서 opaque(id만 검증) | `frameTemplates`는 알려진 필드 목록 있음(`zones`,`photoSlot`,`textZones`…) | `read.ts:64-65` / `read.ts:84-101` | 케이스 zone은 **NOT VERIFIED**(런타임 검증 계층 없음) |

---

## 표 5. 액자 aspect / thickness / color / mat 우선순위

| 값 | 우선순위(레거시 실제 순서) | 근거 | 확정 |
|---|---|---|---|
| `aspect`(H/W) | `sz.aspect` → 없으면 **`1`** | `denn-mockup-tool.html:3119`(`sz.aspect‖1`) | CONFIRMED |
| aspect 검증 | read 경계가 **유한 양수** 요구, 위반 시 fatal `INVALID_NUMBER` | `read.ts:264` | CONFIRMED |
| aspect 노출 | 스펙 016 `BrowseSize.aspect`는 **유한 양수일 때만** 존재(없을 수 있음) | `browse/build.ts:114-119`, `browse/types.ts:16-18` | CONFIRMED |
| `thickPct` | **`sz.frameThickness` → `admin.frameThickness` → `5.5`** | `denn-mockup-tool.html:3120` | CONFIRMED |
| top-level `frameThickness` | `DEF.frameThickness = 5.5`, read 경계에서 숫자 검증 | `denn-admin.html:854`, `packages/shared/src/catalog/types.ts:58` | CONFIRMED |
| **사이즈별** `frameThickness` | `frameSizes` 알려진 필드 목록에 **없음**(=unknown field로 보존만) | `read.ts:82` | **NOT VERIFIED**(저작 UI 존재 여부 미확인) |
| `frameColor` | `curFCol` → 없으면 `FC[0]`; `fill`은 `#RRGGBB` | `:3118`,`:3124`, 목록 `denn-admin.html:853` | CONFIRMED |
| `matColor` | `frameTemplateBg(tpl)` → 없으면 **`#fff`** | `:3126-3128`,`:3112` | CONFIRMED |
| `matColor` 활성 조건 | 3개 플래그 별칭 중 하나라도 truthy | `:3109-3110` | CONFIRMED |
| `matColor` 색 별칭 | 4개 별칭 순서 + `#RRGGBB` 검증 실패 시 `#fff` | `:3111` | CONFIRMED |
| inner border 색 | `tpl.whiteBorderColor` → 없으면 `#fff` | `:3106` | CONFIRMED |
| inner border 두께 | `whiteBorderBakedThickness` → `whiteInnerBorderThickness` → `0`(=미표시), **min(IW,IH) 대비 %** | `:3103`,`:3106` | CONFIRMED |
| inner border 게이트 | `whiteBorderBaked===true ‖ whiteInnerBorder===true`, 이미 baked면 skip | `:3104-3105`,`:3102` | CONFIRMED |
| mat 외곽선 | `rgba(0,0,0,.06)` / `lineWidth 1.5` — 조건: 업로드-투명·design-canvas 템플릿이 아닐 때 | `:3129`,`:3125` | CONFIRMED(표현 불가) |

---

## 표 6. 명시적 호출자 입력 vs 허용 가능한 레거시 default

| 값 | 카탈로그 근거 | 권고 취급 | 사유 |
|---|---|---|---|
| 케이스 `logicalCanvas` | `models[].w/h` | **카탈로그 투영** | 레거시 backing과 동일 값(`:1047`) |
| 액자 `aspect` | `frameSizes[].aspect` | **카탈로그 투영** | `:3119` |
| 액자 논리 크기(px) | 없음(레거시는 UI 상수 500) | **호출자 입력** | 리빌드는 CSS 크기 기준(스펙 022 불변식) — Q3 |
| zone 사각형(퍼센트) | `photoZones` | **카탈로그 투영** | `:2191`,`:1664`,`:3074` |
| zone `id` | 없음 | **합성 필요** | Q4 — 임의 결정 금지 |
| `bodyColor`(케이스) | **없음**(HTML 팔레트) | **호출자 입력** | `:322-330`,`:977` — Q1 |
| `frameColor` | `frameColors[].fill` | 카탈로그 투영 **단, 선택 ID 필요** | 선택 단계 부재 — Q2 |
| `matColor` | `frameTemplateBg` 또는 `#fff` | **카탈로그 투영**(fallback 포함, 근거 있음) | `:3126-3128`,`:3111` |
| `innerBorder` | 템플릿 필드 | 투영 가능하나 **기하 불일치** | Q6 |
| `thickPct` fallback `5.5` | `DEF.frameThickness` | **카탈로그 값 사용**, 문서 없는 하드 fallback은 금지 | Q9 |
| `image`(intrinsic) / `imageRef` / `transform` | 없음(사용자 업로드) | **호출자 입력 필수** | `build.ts:159,244-246` |
| `defaultTransform` 초기값 | 레거시 `{scale:1,x:0,y:0}` | 호출자 입력(기본값 제안 근거는 있음) | `:985` |

---

## 표 7. 실패 조건 · 권고 오류 코드

원칙: 스펙 016 진단 형태(**code + collection + sourceIndex만**, 값·이름·path·URL 없음)와 스펙 018 projection(원본 item 미반환)을 그대로 따른다(`browse/types.ts:26-37`, `images/project.ts:71-92`).

| 조건 | 권고 처리 | 권고 code(초안) | 근거 |
|---|---|---|---|
| `modelId`가 `models`에 없음 | **명시적 실패**(기본 모델 금지) | `MODEL_NOT_FOUND` | 논리 크기 없이는 plan 불가 |
| `models[].w/h` 누락·비양수 | **명시적 실패** | `INVALID_MODEL_SIZE` | `read.ts:259-263`은 있을 때만 검증 |
| `templateId`가 해당 collection에 없음 | **명시적 실패** | `TEMPLATE_NOT_FOUND` | 잘못된 collection 조회 포함 |
| 케이스 id인데 frame collection 조회(또는 반대) | **명시적 실패** | `TEMPLATE_KIND_MISMATCH` | 선택 상태 kind와 대조 |
| 동일 id 중복 | **명시적 실패**(첫 항목 임의 채택 금지) | `AMBIGUOUS_ID` | read 경계는 `DUPLICATE_ID`를 fatal로 봄(`types.ts:23`) |
| `frameSizeId` 없음 / `aspect` 비양수 | **명시적 실패** | `SIZE_NOT_FOUND` / `INVALID_ASPECT` | `read.ts:264` |
| zone이 `circle`/`cornerR>0` | **사각 근사 금지** → 진단 + 해당 zone 제외 또는 전체 실패(정책 필요) | `UNSUPPORTED_ZONE_SHAPE` | Q5 |
| zone 좌표 비유한·음수 크기 | 해당 zone 제외 + 진단 | `INVALID_ZONE_GEOMETRY` | `:3074` num fallback과 구분 필요 |
| `photoZones` 없음, `photoSlot`만 존재 | 단일 zone으로 투영(근거 있음) | (정상) | `:1673-1677` |
| 둘 다 없음 | zone 0개(빈 배열) + 진단 | `NO_IMAGE_ZONE` | `:1681` 경로는 safe/printArea라 별도 |
| 액자 multi-zone | **단일 imageZone으로 축소 금지** → 진단 | `UNSUPPORTED_MULTI_ZONE` | Q8 |
| `frameColor` 미선택 | **임의 첫 색 채택 금지** → 호출자 입력 요구 | `MISSING_FRAME_COLOR` | Q2 |
| 색 문자열이 `#RRGGBB` 아님 | 실패(레거시 mat은 `#fff` fallback, frame body는 fallback 없음) | `INVALID_COLOR_SOURCE` | `:3111` vs `:3124` |
| 오류 payload | **상품명·ID 원문·URL·path·token 금지**, `code`+`collection`+`sourceIndex`만 | — | `browse/types.ts:33-37` |

---

## 표 8. 계층별 책임 · 의존성

현 불변식(CONFIRMED): `@denn/shared`는 React/Firebase/`@denn/render` 미의존(`packages/shared/src/index.ts`), `@denn/render`는 DOM/React/Firebase/IO 미의존이며 `@denn/shared`의 `type Result`만 import(`packages/render/src/index.ts:1-5`), 앱이 조합(`apps/mockup/src/App.tsx:1-8`).

| 후보 | 장점 | 문제 | 의존성 방향 | 평가 |
|---|---|---|---|---|
| **A. `apps/mockup` 내부 projection** | 두 패키지를 조합하는 기존 위치, 즉시 가능 | 순수 로직이 앱에 묶여 admin 재사용 불가, 단위 테스트가 앱 계층에 쌓임 | 문제 없음 | 가능하나 차선 |
| **B. `@denn/shared` catalog projection + 앱 어댑터(권고)** | 카탈로그 해석(별칭·fallback·진단)이 카탈로그 소유 패키지에 모임, 순수 단위 테스트, admin 재사용 가능 | shared가 **스펙 020 타입을 직접 반환할 수 없음**(shared→render 의존 금지) → **render 비의존 중립 geometry 타입**으로 돌려주고 앱이 얇게 매핑 | shared(무의존) → app이 render와 조합 | **권고** |
| C. `@denn/render` 입력 어댑터 | 방향상 허용(render→shared) | 순수 렌더 엔진에 **상품 카탈로그 의미**가 들어감(별칭·fallback·상품 진단), 조사 2026-07-27 표8의 책임 분리와 충돌 | render → shared | 비권고 |

**권고 공개 API 초안(확정 아님, Codex 결정 대상):**

```ts
// @denn/shared — 순수. render/React/Firebase 미의존. 이름/URL/base64 미반환.
export interface CasePreviewGeometry {
  readonly logicalSize: { readonly width: number; readonly height: number }; // models[].w/h
  readonly zones: readonly {
    readonly sourceIndex: number;                 // 배열 순서 = 그리기 순서
    readonly percentRect: { readonly x: number; readonly y: number;
                            readonly width: number; readonly height: number };
  }[];                                            // 사각 zone만. circle/cornerR은 진단으로만 보고
}

export interface FramePreviewGeometry {
  readonly aspect: number;                        // frameSizes[].aspect (H/W)
  readonly borderPercentOfWidth: number;          // thickPct (sz → admin → 5.5)
  readonly matColor: string;                      // frameTemplateBg 또는 #FFFFFF
  readonly frameColor?: string;                   // 색 ID가 주어졌을 때만
  readonly innerBorder?: { readonly color: string; readonly percentOfMinSide: number };
}

export type CatalogPreviewProjection<T> =
  | { readonly ok: true; readonly value: T; readonly diagnostics: readonly ProjectionDiagnostic[] }
  | { readonly ok: false; readonly code: ProjectionErrorCode;
      readonly diagnostics: readonly ProjectionDiagnostic[] };

export function projectCasePreviewGeometry(
  document: CatalogDocumentV1,
  selection: { readonly modelId: string; readonly templateId: string },
): CatalogPreviewProjection<CasePreviewGeometry>;

export function projectFramePreviewGeometry(
  document: CatalogDocumentV1,
  selection: { readonly frameSizeId: string; readonly templateId: string;
               readonly frameColorId?: string },
): CatalogPreviewProjection<FramePreviewGeometry>;
```

```ts
// apps/mockup — 얇은 어댑터. geometry + 호출자 입력(색/이미지/논리 크기) → 스펙 020 입력.
buildCasePlanInput(geometry, {
  bodyColor,                    // 호출자 결정 (Q1)
  logicalCanvas,                // 호출자 결정 (Q3)
  image, defaultTransform,      // 사용자 이미지 (§3)
  zoneImageRefs,                // 합성 imageRef (§3)
  zoneIds,                      // id 합성 정책 (Q4)
}): CasePlanInput;
```

---

## §3. 사용자 이미지 입력 경계 (확정)

| 항목 | 결론 | 근거 |
|---|---|---|
| plan 생성 최소 입력 | `imageRef`(합성 문자열) + `image{width,height}`(intrinsic) + `transform{scale,x,y}` | `plan/types.ts:47-51,64-67,77-80` |
| 이미지가 없으면 | **액자 plan은 만들 수 없음**(4개 전부 필수), 케이스는 `zones:[]`여도 `image` 필수 | `build.ts:159,244-246` |
| `imageRef` 의미 | **메모리 binding-map 조회 키** — URL·base64·token 아님. executor는 URL로 쓰지 않음 | `plan/types.ts:5-10`, `apps/mockup/src/canvas/types.ts`(bindings 포트), 스펙 021 승인 계약 |
| 실제 URL 선택·로드·CORS | **스펙 023 범위 밖**(후속) | 스펙 021 §3, 스펙 022 §제외 |
| 카탈로그 템플릿 이미지 | **역할이 다름** — 템플릿 art/썸네일용 소스이며 사용자 사진이 아니다. 스펙 018 projection이 별도로 다룸 | `images/project.ts:1-14` |
| 혼합 금지 | 템플릿 `dataUrl`을 사용자 `imageRef`로 쓰면 스펙 018 신뢰 경계와 스펙 020 식별자 계약을 동시에 위반 | `images/project.ts:41-52`, `plan/build.ts:28-40` |

---

## 표 9. 스펙 023 지원 / 제외 범위 (권고)

| 구분 | 항목 | 근거 |
|---|---|---|
| **포함(권고 최소)** | 순수 `@denn/shared` projection: 케이스 `logicalSize`+사각 zone(퍼센트), 액자 `aspect`+`borderPercentOfWidth`+`matColor`(+색 ID 있을 때 `frameColor`, 템플릿 값 있을 때 `innerBorder`) | 표 2·3·5 CONFIRMED 항목만 |
| 포함 | 별칭·마이그레이션 처리(`photoZones`↔`zones`, `photoSlot` 단일 fallback), 저작 경로 2종 모두 | `:11030-11031`, `admin:2191` vs `:2326` |
| 포함 | 실패·진단 계약(표 7), 원본 item·이름·URL·path·token 미노출 | `browse/types.ts:26-37`, `images/project.ts` |
| 포함 | 합성 fixture 기반 unit test(운영 데이터 없음) | 스펙 012·016 선례 |
| **제외(후속)** | 케이스 `bodyColor` 값 결정, 액자 색 선택 단계·selector 확장 | Q1·Q2 |
| 제외 | 원형·라운드 zone의 **사각 근사**, 액자 multi-zone 축소 | Q5·Q8 |
| 제외 | 사용자 이미지·drawable·실제 URL·CORS·Canvas UI 연결 | §3, 스펙 022 §제외 |
| 제외 | 라운드+그림자 body, 체커보드, mat alpha 외곽선, inner-border 4-band 기하 | 표 2·3 표현 불가 A~F |
| 제외 | pointer/pinch/wheel·회전·text/clock/watermark·print/export·저장·주문·Firebase·배포 | CLAUDE.md §4, 스펙 019~022 제외 유지 |

---

## 표 10. 필요한 unit / E2E 검증 (권고)

| 유형 | 검증 | 비고 |
|---|---|---|
| unit | modelId/templateId/frameSizeId 정상 lookup → geometry 값 정확 | 합성 fixture |
| unit | 누락·중복·collection 불일치 → 표 7의 **명시적 실패 code**(기본값 성공 금지) | |
| unit | `photoZones` 없음 + `photoSlot` 있음 → 단일 zone, 둘 다 없음 → 빈 zone + 진단 | `:1673-1677`,`:1681` |
| unit | `zones` 별칭 입력도 동일 결과 | `:11030-11031` |
| unit | `circle`/`cornerR>0` → **근사 금지**, 진단 code | Q5 |
| unit | thickness 우선순위 3단계, aspect 없음 → 실패 또는 명시 정책 | `:3120`,`:3119` |
| unit | mat 색: 플래그 별칭 4종·색 별칭 4종·`#RRGGBB` 실패 시 `#fff` | `:3109-3111` |
| unit | 진단·오류 직렬화에 이름·ID 원문·URL·path·token **0** | 스펙 016/018 선례 |
| unit | 입력 문서 **비변형**·결정성(동일 입력 → 동일 출력) | 스펙 012/016 선례 |
| unit(앱) | geometry + 호출자 입력 → `buildPreviewRenderPlan` 성공, plan에 URL/base64 0 | 스펙 020 계약 |
| E2E | **불필요**(순수 projection). 화면 연결은 후속 스펙 | 스펙 022가 surface만 완료 |

---

## 표 11. QUESTIONS / NOT DECIDED / NOT VERIFIED

| # | 항목 | 성격 | 내용 |
|---|---|---|---|
| **Q1** | 케이스 `bodyColor` 출처 | **차단** | 카탈로그에 없음. 레거시는 HTML 하드코딩 팔레트 8종 + 기본 `#1A1A1A`(`:322-330`,`:977`). 호출자 입력·디자인 토큰·팔레트 카탈로그화 중 **결정 필요**. `'transparent'`(체커보드)는 스펙 020 어휘 밖. |
| **Q2** | 액자 색 선택 단계 | **차단** | `frameColors[].fill`은 카탈로그에 있으나(`admin:853`) 리빌드 selection/selector에 **색 단계 없음**(`selection.ts:21-27`). 레거시는 `FC[0]` 강제 선택(`:1046`) — 리빌드가 이를 따를지 미정. |
| **Q3** | `logicalCanvas` 정의 | **차단** | 케이스는 model px(320×620 등, `:1047`), 액자는 UI 상수 기반 px(`:3119`) vs 스펙 022 불변식은 **CSS 크기 == logicalCanvas**. 뷰포트에 맞는 논리 크기 산출 주체(projection vs 앱)를 결정해야 함. |
| **Q4** | zone `id` 합성 | **차단** | 카탈로그에 `id`가 없고 스펙 020은 필수+문법 제한(`build.ts:39-40`). index 기반 합성(`zone-0`…) 등 **규칙 결정 필요**(임의 결정하지 않음). |
| **Q5** | 원형·라운드 zone | NOT DECIDED | `circle`/`cornerR`(`:1667-1668`,`:3050`)은 스펙 020 `clipRect`로 표현 불가. 진단 후 제외 / 전체 실패 / 스펙 020 어휘 확장 중 선택. **사각 근사 금지**. |
| **Q6** | inner border 기하 | NOT DECIDED | 레거시는 4-band **fill**(`:3101-3107`), 스펙 020은 중앙 정렬 **stroke**. 두께 단위도 퍼센트(min(IW,IH) 대비) vs px. |
| **Q7** | alpha 색 | NOT DECIDED | mat 외곽선 `rgba(0,0,0,.06)`(`:3129`), body shadow(`:3124`) → `#RRGGBB` 전용 계약으로 표현 불가. 생략·불투명 근사·계약 확장 중 선택. |
| **Q8** | 액자 multi-zone | NOT DECIDED | `duo`/`trio`/`circle` 등 다중 zone(`admin:850`, `:3069-3074`)을 `FramePlanInput` 단일 `imageZone`으로 줄일 수 없음. |
| **Q9** | thickness fallback | NOT DECIDED | `sz.frameThickness → admin.frameThickness → 5.5`(`:3120`). 리빌드가 하드 fallback `5.5`를 채택할지, top-level 값 필수로 볼지 미정. |
| **Q10** | 케이스 template 없는 경우 | NOT DECIDED | 레거시는 template 없이도 safe/printArea 영역에 그림(`:1681`). 리빌드에서 template 미선택 상태를 지원할지 미정(현 UI는 template 선택이 완료 조건). |
| Q11 | 케이스 zone 스키마 검증 계층 | **NOT VERIFIED** | `caseTemplates` 아이템은 read 경계에서 opaque(`read.ts:64-65`) → `photoZones` 구조는 레거시 근거만 있고 검증 계층이 없음. |
| Q12 | 사이즈별 `frameThickness` | **NOT VERIFIED** | `:3120`이 참조하지만 `frameSizes` 알려진 필드에 없음(`read.ts:82`); 저작 UI 존재 여부 미확인. |
| Q13 | `photoSlot`만 있는 케이스 템플릿 비율 | **NOT VERIFIED** | 저작 경로 2종 확인(`admin:2191` vs `:2326`)했으나 운영 데이터 분포는 실제 카탈로그 GET 없이 확인 불가. |
| Q14 | `uiCustom.prevMaxW` 출처 | **NOT VERIFIED** | `:3119`가 `A.uiCustom.prevMaxW`를 읽지만 `CatalogV1` 모델에 없음(관리자 UI 설정 추정). |

---

## 변경 · 무변경 파일

| 구분 | 파일 |
|---|---|
| **변경(문서 2개)** | `docs/codex-claude-handoff/reviews/2026-07-28-catalog-render-plan-projection-investigation.md`(신규, 이 문서) · `docs/codex-claude-handoff/CURRENT.md`(상태 최소 반영) |
| **무변경(확인)** | `apps/**` · `packages/**` · `tests/**` · `scripts/**` · 설정(`package.json`·`pnpm-lock.yaml`·`vite*.config.ts`·`playwright.config.ts`·`vitest.config.ts`·`biome.json`) · CSS · 운영 `denn-*.html` · `firebase.json`·`.firebaserc`·Rules · `poc/**` · 디자인·결과 PNG |
| **미실행** | 실제 Firebase GET · 이미지 다운로드 · live test · 배포 · 신규 의존성 |

---

## 조사 준수 확인

- 읽기 전용. 앱·패키지 코드·테스트·CSS·설정·lockfile **무변경**, **스펙 023 구현 미착수**.
- 실제 네트워크 요청·live test·Firebase/Rules/CORS/Hosting 변경·배포 **0**.
- **임의 결정 금지 항목 준수**: 케이스 기본색·액자 기본색·원형/라운드 zone의 사각 근사·thickness fallback·가짜 이미지/drawable·`imageRef`에 URL·Canvas UI 연결·pointer/회전·text/clock/watermark·print/export·저장/주문 = 전부 Q/NOT DECIDED로 남김.
- 운영 데이터·상품명·ID 원문·URL·token·base64 **미복사**(기본 카탈로그 `DEF`의 공개 스키마와 좌표 공식만 인용).
- 확인 못 한 것은 **NOT VERIFIED**로 기록하고 추측하지 않음.
