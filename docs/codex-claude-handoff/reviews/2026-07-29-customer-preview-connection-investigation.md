# 스펙 026 사전 조사 — 고객 상품 미리보기 연결 계약 (읽기 전용)

- 일자: 2026-07-29
- 기준 HEAD: `377d350` (`rebuild/modern-studio`, HEAD=origin, ahead/behind 0/0, clean)
- 범위: `Automation/NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 10문항
- **구현·UI 수정·설정/테스트/PNG 변경 0. 실제 Firebase GET·이미지 다운로드·live test·브라우저 파일 선택·deploy 0.**
- 이 문서에는 운영 상품명·선택 ID·전체 URL·token·base64를 옮기지 않았다. 근거는 파일·라인과 필드명으로만 적는다.

> 결론 한 줄: **기하(geometry)는 이미 카탈로그에서 나오고 어댑터·surface도 준비돼 있으나, 색·사용자 사진·frame 논리 width·image binding 소유자·마운트 지점이 전부 비어 있다.** 비어 있는 값 중 최소 4건은 근거만으로 확정할 수 없는 **Founder 결정 항목**이다.

---

## 0. 현재 연결 상태 (실측)

| 사실 | 근거 |
| --- | --- |
| 고객 앱은 `PreviewCanvasSurface`·`buildCaseProductPlan`·`buildFrameProductPlan`·`projectCase/FramePreviewGeometry`를 **production 코드에서 한 번도 import 하지 않는다** | `apps/mockup/src/App.tsx:1-8`, `apps/mockup/src/browse/BrowseFlow.tsx:6-31` (import 목록에 없음). 저장소 전체에서 해당 심볼의 non-test 참조는 정의부(`canvas/productPlan.ts:170,252`, `canvas/PreviewCanvasSurface.tsx:26`)와 E2E fixture뿐 |
| 선택 완료 시 화면은 **텍스트 요약**으로 끝난다 | `BrowseFlow.tsx:312-351` (`CompletionSummary`) |
| Canvas 실행기·surface·adapter는 이미 검증돼 있다 | 스펙 021·022·024·025 (`canvas/executePreviewPlan.ts`, `canvas/surface.ts`, `canvas/productPlan.ts`) |

즉 스펙 026은 “새 렌더러”가 아니라 **선택 상태 → 색 → 사용자 사진 → plan → surface의 배선(wiring)과 그 소유권 정의**다.

---

## 1. Q1 — case/frame plan을 만들기 위해 부족한 값

`buildCaseProductPlan` / `buildFrameProductPlan`의 실제 입력(`apps/mockup/src/canvas/productPlan.ts:157-168`, `230-236`) 기준.

| 입력 | 필요 계층 | 현재 공급원 | 상태 |
| --- | --- | --- | --- |
| `productKind` | UI 분기 | `browse/selection.ts:16,39` | **있음** |
| `modelId` (case) | `projectCasePreviewGeometry` | `selection.ts:23`, UI `BrowseFlow.tsx:134` | **있음** |
| `frameSizeId` (frame) | `projectFramePreviewGeometry` | `selection.ts:24`, UI `BrowseFlow.tsx:181` | **있음** |
| `templateId` | 두 projection 공통 | `selection.ts:26`, UI `BrowseFlow.tsx:270` | **있음** |
| case `modelLogicalSize` | plan `logicalCanvas` | `packages/shared/src/catalog/preview/types.ts:86-88` | **있음(projection)** |
| case zones(`id`,`sourceIndex`,`percentRect`) | zone clip/cover | `preview/types.ts:77-89` | **있음(projection)** |
| frame `aspect`·`borderPercentOfWidth`·`matColor`·`contentInsetPx` | frame rect 계산 | `preview/types.ts:91-105` | **있음(projection)** |
| case `bodyColor` (`#RRGGBB`) | `buildCaseProductPlan` 필수 | **없음.** 카탈로그에 case 색 필드 자체가 없음(`packages/shared/src/catalog/types.ts:50-60`), 레거시는 HTML 팔레트 + 전역 초기값 | **미공급 · 결정 필요** |
| frame `frameColor` (`#RRGGBB`) | `buildFrameProductPlan` 필수 | 카탈로그에 `frameColors[{id,name,fill,grain,custom}]`가 **존재**하고 검증도 됨(`catalog/types.ts:57`, `catalog/read.ts:83`) — 그러나 **browse selector 없음**(`catalog/browse/index.ts` export 목록에 색 없음), projection도 색을 반환하지 않음(스펙 023) | **부분 공급 · 선택 단계 미존재** |
| frame `logicalWidth` (양의 정수) | `buildFrameProductPlan` 필수 | **없음.** 레거시는 `ADM.uiCustom.prevMaxW || 500` 기반(`denn-mockup-tool.html:1758`)이고 스펙 025는 기본값 `500`을 명시적으로 금지 | **미공급 · 결정 필요** |
| `UserImageState.imageRef` | zone/frame 이미지 키 | **없음.** 앱에 파일 입력·decode·ref 생성 코드 0 | **미공급** |
| `UserImageState.intrinsicSize` | cover 계산 | **없음** (decode 후에만 알 수 있음) | **미공급** |
| `UserImageState.transform` | pan/zoom | **없음** (앱에 pointer 핸들러 0) | **미공급** |
| case `zoneImages` map 키 `case-zone-<sourceIndex>` | 어댑터 lookup | 키 규칙은 확정(`productPlan.ts:152`, projection `preview/types.ts:78-79`) | 규칙 **있음**, 값 **없음** |
| `imageBindings` (`imageRef` → drawable) | surface 실행 | 포트 타입만 존재(`canvas/types.ts:43-45`), 소유자·구현 없음 | **미공급** |
| 마운트 지점 | 화면 배치 | 없음(§0) | **미공급** |

**부족분 요약: ① case 색 ② frame 색 선택 단계 ③ frame 논리 width ④ 사용자 사진 상태 3종 ⑤ image binding 소유자 ⑥ 마운트 지점.**

---

## 2. Q2 — 레거시 고객 사진 생명주기 (파일·라인)

### 2.1 단일 사진 경로(케이스 단일 zone / 액자)

| 단계 | 근거 | 내용 |
| --- | --- | --- |
| 입력 | `denn-mockup-tool.html:1281-1282` | `dropF(e,type)` / `loadF(inp,type)` — drag&drop과 `<input type=file>` 둘 다 같은 `handleF`로 합류 |
| decode | `:1283` | `new FileReader()` → `readAsDataURL` → `new Image()` → `img.onload` |
| 상태 반영 | `:1283` | `caseImg`/`frameImg` = **HTMLImageElement**, `caseImgT`/`frameImgT` = `{scale:1,x:0,y:0}`로 **초기화**, 썸네일 `<img>.src = img.src`(같은 data URL 재사용), zoom UI 100% 리셋, `renderCase()`/`renderFrame()` |
| 초기 상태 | `:977`, `:986` | `caseImg=null, frameImg=null`, `frameImgT={scale:1,x:0,y:0}` |
| 리셋 | `:1408` (`resetImg`) | 이미지 null + transform 리셋 + **`input.value=''`**(같은 파일 재선택 가능) + UI 토글 |

### 2.2 zone별(멀티 zone) 경로

| 단계 | 근거 | 내용 |
| --- | --- | --- |
| 입력 생성 | `:1347-1355` | zone마다 `input[type=file][accept=image/*]`를 **`display:none`**으로 만들고 drop 영역 클릭이 `fileInp.click()` 대행 |
| drop | `:1393-1401` | `DataTransfer`로 파일을 숨은 input에 복제한 뒤 같은 로더 호출 |
| decode·저장 | `:1374-1391` (`loadZoneImg`) | FileReader → Image → `caseImgs[i]=img`, **`caseImgTs[i]={scale:1,x:0,y:0}`**, `activeCaseZone=i`, UI 재생성, `renderCase()`, 캔버스로 스크롤 |
| 활성 transform | `:1365-1371` | zone이 2개 이상이면 `caseImgTs[active]`, 아니면 단일 `caseImgT` |
| 리셋 | `:1403-1406` | 해당 zone만 null + transform 리셋 |
| 저장 구조 | `:988-989` | `caseImgs[]`(Image), `caseImgTs[]`(transform) 병렬 배열 — **zone id가 아니라 index 키** |

### 2.3 draw

| 단계 | 근거 |
| --- | --- |
| zone 순회·clip | `:1660-1672` — `zone.x/y/w/h`를 캔버스 W/H의 퍼센트로 환산, `type==='circle'`/`cornerR`/사각 clip |
| zone 이미지 선택 | `:1662` `caseImgs[i] || caseImg`(단일 이미지 폴백), `:1665` `caseImgTs[i] || (i===0 ? caseImgT : {scale:1,x:0,y:0})` |
| cover 계산 | `:1543-1551` (`drawImgT`) — `baseSc=max(w/iw,h/ih)`, `sc=baseSc*T.scale`, pan clamp `|T|≤|img*sc − zone|/2` |
| 템플릿 아트 오버레이 | `:1679` — `curCTpl.dataUrl`을 매 렌더마다 `new Image()`로 만들어 zone 위에 덮어 그림 |
| 단일 photoSlot 폴백 | `:1673-1677` |
| 캔버스 크기 | `:1047`, `:1095`, `:1216`, `:2458` — `canvas.width=curModel.w; canvas.height=curModel.h` |

**리빌드와의 대응**: `drawImgT`의 수식은 스펙 019 `computeCoverDrawRect`와 **동일**하다(`packages/render/src/geometry/cover.ts:6-10,54-62`). 단 레거시는 클램프 결과를 `T` 객체에 **되써서 입력을 변형**(`:1551`)하는 반면 스펙 019는 입력을 변형하지 않는다 → 새 구조에서는 **transform 소유자(상태)가 클램프된 값을 저장할지, 원본을 유지할지**를 명시해야 한다(드래그 “경계에서 멈춤” 체감이 여기서 나온다).

### 2.4 cleanup

| 항목 | 실측 |
| --- | --- |
| URL revoke | **없음** — 사용자 사진 경로는 `data:`라 revoke 대상이 아님 |
| in-flight abort | **없음** — 이전 `Image`의 `onload`를 취소·무효화하지 않음 |
| 캐시 해제 | **없음** — 템플릿/시계 이미지들은 전역 `window.__denn*Cache` 객체에 무기한 보존(예: `:2743`, `:3040`, `:3180`) |
| 컴포넌트 언마운트 개념 | 없음(비 React) |

---

## 3. Q3 — 브라우저 이미지 계약(data: / blob: / HTMLImageElement / ImageBitmap)

### 3.1 레거시 실측

| API | `denn-mockup-tool.html` | `denn-admin.html` | 용도 |
| --- | --- | --- | --- |
| `FileReader.readAsDataURL` + `new Image()` | 사용(사용자 사진 `:1283`,`:1390`; 룸 배경 `:2073`; 기타 `:4680`) | 사용 | **사용자 사진의 유일한 경로** |
| `URL.createObjectURL` / `revokeObjectURL` | 2회 / 2회 (`:9732` 주문·인쇄 IIFE, `:11256` `downloadBlob`) | 7 / 5 | **다운로드·내보내기 전용**, 사진 입력 아님 |
| `createImageBitmap` | **0** | **0** | 미사용 |
| `HTMLImageElement.decode()` | **0** | **0** | 미사용(로드 완료 판정은 `complete && naturalWidth`) |
| `OffscreenCanvas` | **0** | **0** | 미사용 |
| `canvas.toBlob` | 12 | 0 | 인쇄/내보내기 |

### 3.2 현재 리빌드가 이미 정한 것

| 계약 | 근거 |
| --- | --- |
| 실행기는 **이미 디코드된 drawable만** 받는다. URL을 절대 해석·fetch·`Image.src` 대입하지 않는다 | `apps/mockup/src/canvas/types.ts:5-7`, `36-45` |
| drawable 타입은 `CanvasImageSource` — `HTMLImageElement`·`ImageBitmap`·`HTMLCanvasElement` 모두 구조적으로 만족 | `canvas/types.ts:31,44` |
| `imageRef`는 **키일 뿐** URL/base64/token이 아니며 문법이 제한돼 있다(`^[A-Za-z0-9][A-Za-z0-9._-]*$`, 1..128) | `packages/render/src/plan/build.ts:28-40` |
| URL/base64/token은 React state·에러·로그·`data-*`·ARIA·스토리지에 **넣지 않는다**(썸네일에서 이미 강제) | `browse/TemplateThumbnail.tsx:5-9` |

### 3.3 선택지별 경계 (근거 기반 비교, **결정 아님**)

| 방식 | 메모리·수명 | 필요한 cleanup | StrictMode/stale 위험 | CORS |
| --- | --- | --- | --- | --- |
| `data:` URL → `HTMLImageElement` (레거시와 동일) | base64 문자열(원본의 약 4/3)과 디코드 비트맵을 **동시** 보유 | 참조 해제만 | 낮음(문자열이 불변) — 단 URL 문자열이 state·props를 타고 흐르지 않게 해야 함 | same-origin, taint 없음 |
| `blob:` URL → `HTMLImageElement` | 문자열 대신 Blob 핸들 | **`revokeObjectURL` 필수** | 높음 — StrictMode의 mount→cleanup→mount에서 조기 revoke 시 이미지 로드 실패 | same-origin, taint 없음 |
| `createImageBitmap(File)` → `ImageBitmap` | 디코드 비트맵만 | **`close()` 필수**(누락 시 GPU/메모리 누수) | 중간 — 소유권 이전 규칙 필요 | same-origin, taint 없음 |

공통 실패 경계(어느 방식이든 스펙 026이 명시해야 함): **decode 실패**, **취소(사용자가 다른 파일 재선택)**, **언마운트 중 완료**, **같은 파일 재선택**(레거시는 `input.value=''`로 해결 `:1408`), **동시 다중 zone 로드**. 기존 코드에 재사용 가능한 두 패턴이 있다 — src별 keyed child로 stale 오류를 차단(`TemplateThumbnail.tsx:61-64`), 단일 소유자 cleanup으로 observer/rAF를 회수(`canvas/usePreviewCanvasSurface.ts:27-66`).

> `NOT DECIDED`: data: / blob: / ImageBitmap 중 무엇을 채택할지. 근거만으로는 “레거시가 data:를 썼다”는 사실만 확정되고, 새 구조의 메모리·cleanup 트레이드오프는 제품 결정이다.

---

## 4. Q4 — 사용자 로컬 이미지 vs 카탈로그/Firebase 이미지

| 축 | 사용자 로컬 사진 | 카탈로그·Firebase 이미지 |
| --- | --- | --- |
| 출처 | 파일 선택/드롭 → `FileReader`(`:1283`) | 카탈로그 문서의 이미지 필드 → 공개 다운로드 URL 또는 `data:`(`packages/shared/src/catalog/images/project.ts:23,89-106`) |
| 신뢰 경계 | 없음(사용자 소유, 앱이 만든 문자열 아님) | `resolvePublicImageSource`가 **호스트·버킷 경로**만 통과(`packages/firebase/src/public-images/trust.ts:25-27,33-54`) |
| 현재 리빌드의 사용처 | 없음 | 썸네일 `<img>` **표시 전용** — Canvas에 그리지 않음, `crossOrigin` 설정 안 함(`TemplateThumbnail.tsx:1-4,36`) |
| CORS-clean 필요? | **불필요** — `data:`/`blob:`는 same-origin이라 canvas를 taint하지 않음 | **Canvas에 그리는 순간 필수** |
| 레거시 처리 | 해당 없음 | `Image.prototype.src`/`setAttribute` 패치로 Storage URL에 `crossOrigin='anonymous'` 자동 주입(`:11638-11662`), 개별 지정(`:12119`, `:12764`), **실패 시 crossOrigin 없이 재시도**(`:12138`) |

**핵심 결론 2가지**

1. **스펙 026이 사용자 사진만 그리면 CORS 요구가 발생하지 않는다.** 프레임/케이스 body·mat는 색 채우기이고(`packages/render/src/plan/build.ts:224-233,281-286`), 사용자 사진은 same-origin이다.
2. **템플릿 아트를 Canvas에 올리는 순간** CORS-clean 계약(버킷 CORS + `crossOrigin`)과 실패 정책이 필요하다. 레거시의 “crossOrigin 없이 재시도”(`:12138`)는 **tainted canvas → 인쇄 파일 0×0**이라는 CLAUDE.md §4-7 제약과 정면으로 충돌하므로 **그대로 복제하면 안 된다**. 현재 plan 어휘에는 템플릿 아트 command 자체가 없다(스펙 020).

---

## 5. Q5 — 색: 레거시 팔레트·기본값·저장 위치

| 항목 | 레거시 근거 | 내용 |
| --- | --- | --- |
| case body 색 초기값 | `:977` | `caseColor='#1A1A1A'` (전역 변수 하드코딩) |
| case 팔레트 | `:323` 이하 | HTML에 스와치가 하드코딩돼 있고 **첫 스와치에 `on` 클래스**가 이미 붙어 있음 |
| case 색 변경 | `:1274` (`setCaseColor`) | 전역 변수 갱신 + 재렌더. **저장소 없음(세션 전역 변수)** |
| case 투명 옵션 | `:1686-1689` | `caseColor==='transparent'`이면 12px 체커보드를 그린다 — **색이 아니라 패턴** |
| 기기 본체 색(별도 축) | `:338`, `:1742` | `phoneColor` — case 색과 다른 변수 |
| frame 팔레트 | `:1000` | `FC = ADM.frameColors || [블랙/화이트/오크/월넛/골드/실버 6종 하드코딩 폴백]` — 각 항목 `{id,name,fill,grain}` |
| frame 색 기본 선택 | `:1042`, `:1046` | 칩 렌더 시 `i===0 ? ' on'`, 초기화 시 `curFCol=FC[0]` → **첫 색 자동 선택** |
| frame 색 변경 | `:1218` (`selFCol`) | 전역 `curFCol` 갱신 + 재렌더 |
| frame 색 사용 | `:1763-1765` | `fc.fill`로 body를 채우고 `fc.grain`이면 세로 줄 텍스처를 **난수로** 덧그림 |
| 리빌드 카탈로그 | `catalog/types.ts:57`, `catalog/read.ts:83` | `frameColors[{id,name,fill,grain,custom}]`가 문서 스키마에 존재·검증됨 |
| 리빌드 선택자/projection | `catalog/browse/index.ts`, 스펙 023 | 색 selector **없음**, geometry projection도 색(mat 제외) 미반환 |
| 스펙 025 제약 | `docs/rebuild/specs/025-*.md` §1 Q3 | 색은 호출자가 준 **정확한 `#RRGGBB`만**, 첫 색 자동 선택·웜토프·`#1A1A1A` 기본값 **금지** |

> `FOUNDER_DECISION_REQUIRED` (색)
> - **F-1**: case body 팔레트의 정본은 어디인가? (카탈로그에 없음 → 새 필드 신설 vs 앱 상수 vs frame 팔레트 재사용)
> - **F-2**: `transparent` case를 지원하는가? 현재 plan 어휘로는 표현 불가(색 채우기만 존재)이므로 **미지원**이 기본이며, 지원하려면 어휘 확장이 필요하다.
> - **F-3**: `grain`(원목 텍스처)을 지원하는가? 현재 어휘에 없고, 레거시 구현은 `Math.random()` 기반이라 **결정적 plan과 양립하지 않는다**.
> - **F-4**: 최초 진입 시 색 미선택 상태를 허용하는가? (레거시는 자동 첫 색, 스펙 025는 자동 선택 금지 → “색을 고르기 전에는 미리보기 없음” 또는 “Founder가 정한 명시적 초기 색”)

---

## 6. Q6 — `modelLogicalSize` / `logicalWidth` ↔ 스펙 022 CSS 불변식

### 6.1 현재 확정된 계약

| 계약 | 근거 |
| --- | --- |
| canvas의 **CSS 크기 == `plan.logicalCanvas`**(축당 ≤0.5px), 위반 시 executor 미실행·안전 실패 | `canvas/surface.ts:26-27`, `canvas/PreviewCanvasSurface.tsx:57-66` |
| backing store = **관측된 CSS 크기 × min(devicePixelRatio, 2)** | `canvas/surface.ts:18-24` |
| 큰 논리 크기는 축소하지 않고 **wrapper가 스크롤**(가로 스크롤 컨테이너는 키보드 도달 가능) | `PreviewCanvasSurface.tsx:53-56`, `canvas/surface.css` |
| 관측은 ResizeObserver content-box, 첫 draw만 `getBoundingClientRect()` 폴백 | `canvas/usePreviewCanvasSurface.ts:31-55` |

### 6.2 레거시 비교

| 상품 | 레거시 backing | 레거시 CSS 크기 | DPR |
| --- | --- | --- | --- |
| 케이스 | `curModel.w × curModel.h`(`:1047`,`:1095`,`:1216`,`:2458`) | 명시 CSS 크기 없음 → 속성값 그대로 + 래퍼의 `max-width:9x vw`(`:2810`,`:2835`,`:10031-10034`) | **미적용**(backing=논리 px) |
| 액자 | `round(pw) × round(ph)`, `pw` = `max(260, prevMaxW‖500)` 기준(`:1758-1759`) | `.canvas-wrap`에 **CSS `transform: scale`** 적용(`:2770`,`:2809`,`:2834`,`:12935-12938`) | 미적용 |

### 6.3 도출되는 위험·책임 구분

1. **case는 값이 이미 있고 그대로 쓸 수 있다.** `modelLogicalSize`는 레거시 backing과 같은 값이다 → `logicalCanvas`로 직결 가능. 다만 세로 길이(모델에 따라 수백 px)가 CSS 크기가 되므로 **작은 뷰포트에서 큰 세로 스크롤**이 생긴다(스펙 025 RISK에 이미 기록됨).
2. **frame은 값 자체가 없다.** 레거시의 `prevMaxW‖500`은 **운영자 UI 설정값**이지 상품 기하가 아니며 스펙 025가 기본값 사용을 금지했다. 따라서 `logicalWidth`는 **정책 결정**이다.
3. **CSS `transform: scale` 래퍼는 스펙 022 불변식과 충돌할 수 있다.** ResizeObserver의 content-box는 스케일 전 레이아웃 크기를 보고하지만, 첫 draw의 `getBoundingClientRect()` 폴백은 **스케일된 값**을 돌려준다(`usePreviewCanvasSurface.ts:36-39`). 즉 레거시식 축소 래퍼를 그대로 쓰면 첫 프레임에서 불변식 위반 → 안전 실패가 날 수 있다. **스펙 026은 “축소는 CSS transform이 아니라 스크롤”이라는 스펙 022 결정을 유지하거나, measure 계약을 명시적으로 바꿔야 한다.**
4. **DPR 책임은 surface에만 있다**(`surface.ts:18-24`). 어댑터·projection·상태는 DPR을 몰라야 하며, 레거시가 DPR을 쓰지 않았다는 사실은 “선명도”가 **NOT TESTED**임을 뜻한다.

> `FOUNDER_DECISION_REQUIRED`
> - **F-5**: frame `logicalWidth` 정책 — 고정 상수인가, 사이즈별 값인가, 뷰포트 종속인가? (뷰포트 종속이면 같은 선택이 기기마다 다른 plan을 만든다 = 결정성 약화)
> - **F-6**: 작은 뷰포트에서 case 미리보기를 **스크롤**할 것인가 **축소**할 것인가? 축소를 택하면 스펙 022 불변식 또는 measure 계약을 바꿔야 한다.

---

## 7. Q7 — 최소 책임 분리 제안 (022 surface · 023 projection · 025 adapter 연결)

| # | 계층 | 성격 | 입력 | 출력 | cleanup |
| --- | --- | --- | --- | --- | --- |
| 1 | 선택 상태 (**기존**) | 순수 reducer | `BrowseAction`, browse index | `CatalogBrowseSelection`(ids) | 없음 |
| 2 | 외형 상태 (**신규**) | 순수 reducer | 색 선택 액션, 사용 가능한 색 목록 | `{caseBodyColor?: hex, frameColor?: hex}` — **기본값 없음, 미선택은 `null`** | 없음 |
| 3 | 사용자 이미지 소유자 (**신규**) | React hook + 순수 core | `File`(또는 zone별 `File`) | `{imageRef, intrinsicSize, transform}` + `imageRef → drawable` Map | 로드 세대(generation) 가드, 언마운트 시 drawable 해제(방식에 따라 revoke/close), `input.value=''` |
| 4 | 기하 projection (**기존**) | 순수 함수 | `CatalogDocumentV1` + ids | `CasePreviewGeometry` / `FramePreviewGeometry` | 없음 |
| 5 | plan 어댑터 (**기존**) | 순수 함수 | geometry + 명시 색 + 이미지 상태(+ frame `logicalWidth`) | 검증된 `PreviewRenderPlan` | 없음 |
| 6 | surface (**기존**) | React + 엔진 | `plan`, `imageBindings`, `accessibleName` | `<canvas>` 그리기 + 안전 상태 | 자체 소유(observer/rAF) — 이미 구현됨 |

**경계 규칙(근거 기반)**

- 3번만이 파일·decode·drawable 수명을 안다. 5번은 drawable을 **받지 않는다**(`productPlan.ts:6-9`), 6번은 plan을 **만들지 않는다**(`PreviewCanvasSurface.tsx:1-4`).
- `imageBindings`의 소유자는 3번이며, 6번은 그것을 복제·변형·해제하지 않는다(`PreviewCanvasSurface.tsx:3-4`).
- `imageRef`는 3번이 **합성**한다. 스펙 020 문법(`build.ts:28-40`)을 지켜야 하고 파일명·경로·MIME을 넣으면 안 된다(파일명은 사용자 데이터다) → 예: `user-image-<zone index>-<증가 seq>`.
- 2번의 색은 5번에 **문자열 그대로** 전달된다. 5번이 대문자 canonical만 수행한다(`productPlan.ts:49-54`).
- 재계산 경계: (1,2,3) 중 하나라도 바뀌면 4→5를 다시 돌려 새 `plan` 참조를 만들고, 6번은 `plan`/`imageBindings` 참조가 바뀔 때만 다시 그린다(`usePreviewCanvasSurface.ts:70-74`).

---

## 8. Q8 — 접근성 요구

| 항목 | 현재/레거시 근거 | 스펙 026이 정해야 할 계약 |
| --- | --- | --- |
| 파일 입력 | 레거시는 `display:none` input + 대리 클릭(`:1348`,`:1355`)과 `opacity:0` 오버레이(`:476`) | **접근 가능한 이름이 있는 `<input type="file">`**(가시 label 또는 label 연결). 대리 클릭만으로는 키보드/스크린리더 도달이 보장되지 않으므로 레거시 패턴을 복제하지 않는다 |
| 진행/오류 안내 | surface는 고정 문구 + `role="status"`(`PreviewCanvasSurface.tsx:19-24,67-78`) | 파일 **선택 중 / 디코드 실패 / 지원하지 않는 형식**에 대한 별도 고정 문구가 필요(코드·예외·파일명 금지) |
| 이미지 교체 | `resetImg`가 `input.value=''` 수행(`:1408`) | 같은 파일 재선택이 동작해야 하고, 교체 시 이전 drawable이 새 것을 덮지 않아야 함(세대 가드) |
| canvas 이름 | `role="img"` + `aria-label`, 빈 이름이면 canvas 자체를 렌더하지 않음(`PreviewCanvasSurface.tsx:26-31,59-66`) | 사진 유무·상품 종류를 반영한 **안전한** 이름 규칙(상품명·ID·파일명 금지) |
| 키보드 흐름 | 스크롤 wrapper `tabIndex={0}`(`PreviewCanvasSurface.tsx:53-56`) | 선택 → 색 → 사진 → 미리보기의 **탭 순서**와 포커스 이동(사진 반영 후 포커스 도난 금지). 레거시는 업로드 후 캔버스로 자동 스크롤(`:1385-1386`)하는데, 포커스 이동은 아님 |
| 320px / 200% 확대 | 기존 E2E 매트릭스에 320×568 포함, axe serious/critical 0 게이트(`tests/e2e/mockup-browse.spec.ts:524 부근`, `tests/e2e/canvas-surface.spec.ts:158-179`) | 미리보기 추가 후에도 **가로 overflow 0 · 44px 터치 타깃 · axe 0** 유지 |

---

## 9. Q9 — Founder 결정 필요 vs 근거만으로 확정 가능

### 9.1 `FOUNDER_DECISION_REQUIRED`

| # | 항목 | 왜 결정이 필요한가 |
| --- | --- | --- |
| F-1 | case body 팔레트의 정본 | 카탈로그에 없음(`catalog/types.ts:50-60`). 새 스키마 필드/앱 상수/미지원 중 택일은 제품 결정 |
| F-2 | `transparent` case 지원 여부 | 현재 plan 어휘에 패턴 채우기가 없음. 지원 시 어휘 확장 필요 |
| F-3 | `grain`(원목) 지원 여부 | 레거시 구현이 난수 기반이라 결정적 plan과 충돌 |
| F-4 | 색 미선택 초기 상태 UX | 스펙 025가 자동 첫 색을 금지 → “미선택 시 미리보기 없음” 정책이 필요 |
| F-5 | frame `logicalWidth` 정책 | 레거시 값은 운영자 UI 설정(`prevMaxW`)이며 기본값 사용이 금지됨 |
| F-6 | 작은 뷰포트 축소 vs 스크롤 | 축소를 택하면 스펙 022 불변식/measure 계약 변경이 필요 |
| F-7 | 템플릿 아트를 미리보기에 넣을지 | 넣으면 CORS-clean·plan 어휘 확장·Firebase 이미지 Canvas 사용이 동시에 필요(§4) |
| F-8 | 이미지 표현 방식(data/blob/ImageBitmap) | 메모리·cleanup 트레이드오프. 레거시 근거는 data:뿐 |
| F-9 | 멀티 zone에서 사진 1장 공유 허용 여부 | 레거시는 `caseImgs[i] || caseImg` 폴백(`:1662`)으로 **공유**하지만, 스펙 025 어댑터는 zone마다 이미지가 없으면 **전체 실패**(`MISSING_ZONE_IMAGE`) |

### 9.2 근거만으로 확정 가능 (결정 불필요)

| 항목 | 근거 |
| --- | --- |
| case `logicalCanvas` = `modelLogicalSize` | `preview/types.ts:86-87` = 레거시 backing(`:1047`) |
| zone lookup 키 = `case-zone-<sourceIndex>` | `preview/types.ts:78-79`, `productPlan.ts:152` |
| cover/pan 수식 | `cover.ts:6-10,54-62` == 레거시 `drawImgT`(`:1543-1551`) |
| 사진 업로드 시 transform은 `{scale:1,x:0,y:0}`로 초기화 | `:1283`, `:1381` |
| 같은 파일 재선택을 위해 input 값을 비운다 | `:1408` |
| 사용자 로컬 사진에는 CORS 요구가 없다 | §4 |
| DPR 상한 2는 preview 전용 | `canvas/surface.ts:18-24` |
| 어댑터·surface는 drawable/plan 소유권을 넘지 않는다 | `productPlan.ts:6-9`, `PreviewCanvasSurface.tsx:1-4` |
| `imageRef` 문법 제약 | `build.ts:28-40` |

---

## 10. Q10 — 스펙 026 제안 (최소 범위 · 허용 파일 · 검증 · 제외)

### 10.1 최소 구현 범위 제안

> 전제: F-1·F-4·F-5·F-8·F-9가 먼저 결정돼야 한다. 미결정 상태로는 구현을 시작할 수 없다.

1. **외형 상태(순수)**: 색 선택 reducer + “미선택” 표현. 기본값·자동 첫 색 없음.
2. **사용자 이미지 소유자**: 파일 1건 → decode → `{imageRef, intrinsicSize}` + drawable Map. 세대 가드·언마운트 안전·같은 파일 재선택·실패 코드(identity-free).
3. **배선 컴포넌트**: 선택 완료 + 색 선택 + 사진 존재 → projection → adapter → `PreviewCanvasSurface`. 실패는 기존 고정 문구로만 표시.
4. **transform은 이번 범위에서 고정값 `{scale:1,x:0,y:0}`**(pointer/pinch는 별도 스펙). 이렇게 하면 legacy 대비 “이동/확대”가 빠지지만, plan·surface 계약은 완전히 검증된다.

### 10.2 허용 파일 후보

| 파일 | 성격 |
| --- | --- |
| `apps/mockup/src/canvas/`(신규 순수 모듈 1~2개) | Tailwind source scan 회피가 검증된 위치(스펙 025 DONE) |
| `apps/mockup/src/browse/BrowseFlow.tsx` | 완료 시 미리보기 렌더 지점 |
| `apps/mockup/src/browse/browse.css` 또는 신규 CSS 1개 | 레이아웃(고객 CSS 증가분을 보고해야 함) |
| 대응 `*.test.ts(x)` | unit |
| `tests/e2e/*.spec.ts` | 실제 Chromium 검증 |
| 문서(`docs/**`) | DONE/handoff/CURRENT |

**변경 금지 유지**: `packages/ui`·`packages/firebase`·`packages/spaces`·`apps/admin`·운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·lockfile.

### 10.3 검증 항목 제안

- **unit**: 색 reducer(기본값 0), imageRef 합성 문법, 세대 가드(늦게 도착한 decode가 최신 상태를 덮지 않음), 실패 코드에 파일명·URL·예외 0, projection→adapter 배선의 성공/실패 매핑.
- **E2E(실제 Chromium)**: 파일 선택은 Playwright `setInputFiles`로 **합성 이미지 바이트**를 주입(브라우저 파일 대화상자 없음), 선택 완료→색 선택→사진→canvas 픽셀 확인(body 색과 사진 영역 구분), 320px overflow 0, axe serious/critical 0, console error 0, 고객 dist에 fixture 0.
- **게이트**: 기존과 동일(frozen install·lockfile diff 0·format·lint·typecheck·unit·build(gzip 기록)·e2e·check·`git diff --check`·포트/temp/dist 해시).

### 10.4 명시적 제외

pointer/드래그/핀치 zoom, 회전, 텍스트·시계·워터마크, 템플릿 아트 합성, 인쇄/export, 저장·주문·카카오, Firebase write/Rules/CORS/Hosting/배포, 운영 이미지·실기기 검증, admin.

---

## 11. NOT VERIFIED / NOT TESTED

- **NOT VERIFIED**: 운영 카탈로그의 실제 `frameColors` 분포·`custom` 필드 사용 여부, `prevMaxW` 운영 실제값, 멀티 zone 템플릿의 운영 비중, `?space=` 공유 페이로드에 색/사진이 어떻게 들어가는지(이번 조사 범위 밖).
- **NOT TESTED**: 실제 사용자 이미지 load/decode, 실제 브라우저 파일 선택, CORS-clean, 실기기 4환경, 선명도·성능. 이 문서는 **읽기 전용 근거 정리**이며 어떤 코드도 실행하지 않았다.
- 이 조사는 스펙 026을 **작성하지 않는다**. 구현 스펙은 Codex가 위 결정 항목을 처리한 뒤 별도로 작성한다.
