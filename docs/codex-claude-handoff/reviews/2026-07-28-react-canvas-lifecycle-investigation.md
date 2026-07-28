# 2026-07-28 — React Canvas 생명주기·DPR 연결 조사 (스펙 022 사전 근거, 읽기 전용)

> **성격:** 읽기 전용 근거 수집. 제품 코드·CSS·테스트·설정·lockfile·운영본·PNG **무변경**. 실제 Firebase GET·이미지 다운로드·live test·배포 **미실행**. **스펙 022 구현 미착수.**
> **목적:** 스펙 022 범위를 "실제 `<canvas>` + `CanvasRenderingContext2D` + React 생명주기 + DPR backing 연결"로 안전하게 작성할 수 있도록, 현재 리빌드 코드와 레거시의 **실제 계약**을 파일·라인으로 고정한다.
> **표기:** `CONFIRMED`=이 조사에서 해당 파일·라인을 직접 읽어 확인 / `NOT VERIFIED`=코드로 확정 불가(실측·실기기·실제 네트워크 필요) / `NOT DECIDED`=근거 없음 또는 상충(결정 필요, 임의 확정 금지).
> **기준:** 리빌드 파일 라인 = HEAD `d0af25d`(스펙 021 종료). 레거시 라인 = `denn-mockup-tool.html`(이번 조사에서 직접 재확인).
> **민감정보:** 실제 상품명·ID·이미지 URL·token·base64 미복사.

---

## 0. 한 줄 결론

Canvas **표면(surface) 계층**(element·context·DPR backing·resize·executor 호출)은 지금 바로 근거 있게 만들 수 있다 — 스펙 019 `computeBackingStoreSize`(dprCap 필수)·스펙 021 executor·POC `useCanvasDpr` 패턴이 이미 있다. **막히는 것은 "무엇을 그릴지"다:** 현재 선택 상태는 **id 5개뿐**이고(`selection.ts:21-27`), 스펙 020 `FramePlanInput`은 **imageRef·image·transform·imageZone을 전부 필수**로 요구하므로(`plan/types.ts:70-83`, `build.ts:240-246`) **사용자 이미지 없이는 액자 plan 자체를 만들 수 없다**. 케이스도 `zones: []`로 body만 그릴 수는 있으나 **`image` intrinsic size가 여전히 필수**다(`build.ts:159`). 또 케이스 body 색은 카탈로그에 없고 레거시 UI 상태(`denn-mockup-tool.html:977` `caseColor='#1A1A1A'`), 액자 body 색은 카탈로그에 있으나(`frameColors[].fill`) **현재 browse selector·selection에 색 단계가 없다**. 따라서 스펙 022는 **표면+생명주기 중심**으로 좁히고, plan 입력 공급원 3건(Q1 이미지 필수, Q2 dprCap 값, Q3 body 색 출처)은 **Codex 결정 후** 확장하는 것을 권장한다.

---

## 표 1. 현재 선택 상태 → render-plan 입력 대응표

현재 완료 시점에 확보되는 값(전부 **id 문자열**): `selection.ts:21-27`, 완료 판정 `BrowseFlow.tsx:320`, 요약 출력 `BrowseFlow.tsx:328-341`.

| render-plan이 요구하는 값 | 현재 selection/index에서 얻을 수 있는가 | 근거 | 상태 |
|---|---|---|---|
| 제품 종류(case/frame) | **예** — `selection.productKind` | `selection.ts:22` | CONFIRMED |
| 케이스 모델 id | **예** — `selection.modelId` | `selection.ts:23` | CONFIRMED |
| 액자 사이즈 id | **예** — `selection.frameSizeId` | `selection.ts:24` | CONFIRMED |
| 분류 id | **예** — `selection.categoryId`(가상 `all` 포함) | `selection.ts:19,25` | CONFIRMED |
| 템플릿 id | **예** — `selection.templateId` | `selection.ts:26` | CONFIRMED |
| 액자 **aspect**(H/W) | **부분** — `BrowseSize.aspect`(유한 양수일 때만 존재, 없을 수 있음) | `browse/types.ts:16-18`, `browse/build.ts:114-119` | CONFIRMED |
| 케이스 **모델 픽셀 w/h** | **아니오**(browse view에 없음) — 원본 `models[].w/h`에만 존재 | `browse/types.ts:5-10` vs `read.ts:73-74,261-263` | CONFIRMED |
| **liquid/logical canvas 크기** | 아니오 — 어느 쪽에도 없음(레거시는 케이스=model px, 액자=preview px) | `denn-mockup-tool.html:1047`, `:3119` | CONFIRMED |
| **bodyColor / frameColor / matColor** | 아니오 — 색 선택 단계·selector 자체가 없음 | `browse/types.ts` 전체, `BrowseFlow.tsx:76-108` | CONFIRMED |
| **zones**(케이스) | 아니오 — 원본 `caseTemplates[i].photoZones`에만, 스키마 미모델링(opaque) | `read.ts:64-65`, 레거시 `:1660-1670` | CONFIRMED |
| **imageZone / frameRect**(액자) | 아니오 — 레거시 공식으로 유도 가능(표 3) | 레거시 `:3120-3122` | CONFIRMED |
| **image intrinsic size**(필수) | 아니오 — 사용자 업로드 이미지가 이번 범위에 없음 | `plan/types.ts:64-65,77`, `build.ts:159,244` | CONFIRMED |
| **transform**(scale/x/y) | 아니오 — pointer/업로드 미착수, 초기값도 제품 결정 | `plan/types.ts:66,79` | NOT DECIDED |

**메모리 위치·경계(CONFIRMED):** 검증된 원본은 `PublicCatalogUiState.ready.document`(`catalog/types.ts:12`)에만 있고, `App.tsx:19-20`이 그 문서로 browse index를 1회 만들며(`useMemo`), `BrowseFlow`는 **index(표시용 view)와 document(원본)를 별개 prop으로** 받는다(`App.tsx:35`, `BrowseFlow.tsx:50-56`). 원본을 DOM/상태로 노출하지 않고 값만 꺼내는 **기존 승인 패턴 = 스펙 018 projection**(`packages/shared/src/catalog/images/project.ts:71-92`: id로 조회 → 최소 결과만 반환, 원본 item 미반환·미변형). **Canvas 계층에도 동일 패턴(순수 projection → 최소 값)을 쓰면 raw catalog·URL·token을 새로 노출하지 않는다.**

---

## 표 2. 케이스 필드 근거표 (`CasePlanInput` — `plan/types.ts:60-68`)

| 필드 | 필수 | 실제 공급원 | 근거 | 상태 |
|---|---|---|---|---|
| `logicalCanvas` | 필수(`build.ts:157`) | 레거시는 **backing=`model.w × model.h`**(CSS 크기와 무관, DPR 없음). 리빌드 정본(POC)은 **CSS px 논리크기**. 두 정의가 다름 | 레거시 `:1047`(`c.width=curModel.w;c.height=curModel.h`), POC `App.tsx:125-133` | **NOT DECIDED**(정의 충돌) |
| `bodyColor`(`#RRGGBB`) | 필수(`build.ts:158`) | **카탈로그에 없음.** 레거시는 UI 전역 상태 `caseColor`(기본 `#1A1A1A`), `'transparent'`면 체커보드 | 레거시 `:977`, `:1686-1691`; `models` 알려진 필드에 색 없음 `read.ts:68-79` | **NOT DECIDED** |
| `image`(intrinsic w/h) | **필수(zones가 비어도)** | 사용자 업로드 이미지 — 이번 범위 밖 | `build.ts:159` | **차단(Q1)** |
| `defaultTransform` | 필수(`build.ts:160`) | 레거시 초기값 `{scale:1,x:0,y:0}`(pointer 조작 결과) | 레거시 `:977` 인접 상태·조사보고서 표5 | CONFIRMED(초기값), 조작은 범위 밖 |
| `zones[]` | 배열 필수(빈 배열 허용) | 원본 `caseTemplates[i].photoZones`(퍼센트 x/y/w/h) — **CatalogDocumentV1에 스키마 없음(opaque)** | 레거시 `:1660-1664`; `read.ts:64-65`("caseTemplates … 아이템 opaque") | **NOT VERIFIED**(필드 존재는 레거시 근거, 검증 계층 없음) |
| `zone.rect.units` | — | 레거시는 **퍼센트**(`zone.x/100*W`) → 스펙 020 `percent` 지원과 일치 | 레거시 `:1664`, `plan/types.ts:24-38` | CONFIRMED |
| `zone.transform` | 선택 | zone별 개별 transform(`caseImgTs[i]`) | 레거시 `:1665` | CONFIRMED(구조), 값은 범위 밖 |
| `zone.guide` | 선택 | 레거시 safe/printArea 가이드 dash — 스펙 020은 실선 `stroke-rect`만 | 조사보고서 표4(케이스 layer 6) | 부분 표현만 가능 |
| **표현 불가 1** | — | 케이스 body는 **라운드 사각+그림자**(`rr(ctx,2,2,W-4,H-4,r)`+shadow) → 스펙 020은 `fill-rect`만 | 레거시 `:1691` | **범위 밖(근사)** |
| **표현 불가 2** | — | zone clip이 **원형/라운드**일 수 있음(`type==='circle'`, `cornerR`) → 스펙 020 clip은 사각뿐 | 레거시 `:1667-1668`, `plan/types.ts:96-101` | **범위 밖** |

---

## 표 3. 액자 필드 근거표 (`FramePlanInput` — `plan/types.ts:70-83`)

레거시 `window.renderFrame` 본문에서 이번 조사로 직접 확인(`:3115-3131`).

| 필드 | 필수 | 실제 공급원 / 레거시 공식 | 근거 | 상태 |
|---|---|---|---|---|
| `logicalCanvas` | 필수(`build.ts:241`) | `pw=max(260, uiCustom.prevMaxW‖500)`, `ph=pw*aspect`, `aspect=sz.aspect‖1`, maxH clamp `round(prevMaxW*1.04)` | 레거시 `:3119` | CONFIRMED(레거시), 리빌드 정의는 **NOT DECIDED** |
| `frameRect` | 필수(`build.ts:242`) | 프레임 body = **캔버스 전체** `fillRect(0,0,W,H)` (+shadow) | 레거시 `:3124` | CONFIRMED |
| `imageZone` | 필수(`build.ts:242`) | `B=max(1, round(W*thickPct/100))`, **`IX=B, IY=B, IW=W-2B, IH=H-2B`** | 레거시 `:3120,:3122` | CONFIRMED |
| 두께 `thickPct` | — | `sz.frameThickness ?? admin.frameThickness ?? 5.5` — **사이즈별 필드는 `frameSizes` 알려진 필드 목록에 없음**(top-level `frameThickness`만 모델링) | 레거시 `:3120`; `read.ts:82`(frameSizes 필드), `types.ts:58`(`frameThickness?: number`) | **부분 CONFIRMED / 사이즈별 값 NOT VERIFIED** |
| `frameColor`(`#RRGGBB`) | 필수(`build.ts:243`) | `fc.fill` = `frameColors[].fill`(예: `#1A1A1A`) — **단, browse selector·selection에 색 단계 없음** | 레거시 `:3124`; `read.ts:83`; 고정 fixture `fixtures/index.ts:20` | **차단(Q4)** |
| `matColor`(`#RRGGBB`) | 필수(`build.ts:243`) | `tplBg`(템플릿 배경) 또는 흰색 `#fff` | 레거시 `:3126-3128` | CONFIRMED(흰색 기본), `tplBg` 유도는 NOT VERIFIED |
| `innerBorder` | 선택 | 레거시 mat 외곽선 = **`rgba(0,0,0,.06)`, lineWidth 1.5** → 스펙 020은 **`#RRGGBB` 알파 없음** | 레거시 `:3129`, `build.ts:47`(HEX 정규식) | **표현 불가(Q5)** |
| `image` / `imageRef` / `transform` | **전부 필수** | 사용자 업로드 이미지 — 이번 범위 밖 → **액자 plan 자체를 만들 수 없음** | `build.ts:244-246`, `plan/types.ts:77-80` | **차단(Q1)** |
| 콘텐츠 inset `P=8` | — | 사진/텍스트 영역은 mat에서 8px 더 안쪽(`cx=IX+P …`) | 레거시 `:3130` | CONFIRMED(스펙 020 미표현) |
| aspect flip(회전) | — | `resolveOrientedAspect` 존재하나 회전은 스펙 021 제외 유지 | `geometry/index.ts:9`, 스펙 021 §제외 | 범위 밖 |

---

## 표 4. CSS 크기 · logical size · backing size · DPR 책임표

| # | 값 | 누가 정하나 | 계산/적용 | 근거 | 상태 |
|---|---|---|---|---|---|
| 1 | **canvas CSS width/height** | 앱 CSS(레이아웃) | 컨테이너 기반. 관측은 `getBoundingClientRect()`(fractional 허용) | POC `App.tsx:125` | CONFIRMED(패턴) |
| 2 | **`plan.logicalCanvas`** | plan 생성자(앱) | 스펙 020 plan의 좌표 기준. executor는 이 값으로만 `clearRect` | `plan/types.ts:110-114`, `executePreviewPlan.ts`(clear는 snapshot의 width/height) | CONFIRMED |
| 3 | **`canvas.width/height`(backing)** | 앱 | `computeBackingStoreSize({cssSize, deviceDpr, dprCap})` → `max(1, round(css*min(dpr,cap)))` | `geometry/backing.ts:24-43` | CONFIRMED |
| 4 | **`effectiveDpr`** | 앱(입력 dprCap) | `min(deviceDpr, dprCap)`, **dprCap 기본값 없음(필수 입력)** | `backing.ts:20-21,34` | CONFIRMED / 값은 **NOT DECIDED** |
| 5 | **`ctx.setTransform(dpr,0,0,dpr,0,0)`** | 앱 | backing 설정 **직후**, executor 호출 **전**. 이후 모든 draw는 논리(CSS) px | POC `App.tsx:129-133` | CONFIRMED(패턴) |

**필수 불변식(권장):** `plan.logicalCanvas == cssSize`(2==1)여야 `setTransform(dpr)` 이후 executor의 `clearRect(0,0,logicalW,logicalH)`가 **backing 전체**를 지운다. 두 값이 어긋나면 잔상 또는 과다 clear가 생긴다. 이 등식은 **스펙 022에서 명시적으로 고정할 계약**이다(현재 어떤 코드도 강제하지 않음 — CONFIRMED, 미구현).

---

## 표 5. React mount / update / cleanup 순서표

현재 앱: `main.tsx:9` **StrictMode 사용**(mount→cleanup→mount 2회 실행). React 19.2.7 / `@types/react` 19.2.17.

| 단계 | 발생 | 필요한 동작 | 위험 | 근거 |
|---|---|---|---|---|
| mount #1 (StrictMode) | effect/ref 실행 | canvas element 확보, backing 계산, `getContext('2d')` 1회, ResizeObserver 등록 | context를 **모듈 전역에 캐시하면** 두 번째 mount에서 stale element 참조 | `main.tsx:9`; 기존 대응 선례 `usePublicCatalog.ts:17-28`(인스턴스별 ref + generation) |
| cleanup #1 | 즉시 | RO disconnect, orientation listener 해제, 예약된 rAF 취소, `context` 참조 해제 | 해제 누락 시 두 번째 mount에서 **RO 2개**·중복 draw | POC `App.tsx:167-170`(RO disconnect + listener 제거) |
| mount #2 | 즉시 | #1과 동일 재실행. **element가 동일 인스턴스라도 새로 획득**해야 안전 | 첫 mount의 비동기 결과가 두 번째에 반영되면 stale | 스펙 015 선례(generation guard) `catalog/controller.ts:20-24` |
| selection/plan 변경 | 렌더 | 새 plan으로 **동일 순서 재실행**(backing 재계산 → setTransform → execute) | plan 변경과 resize가 겹치면 이중 draw | — |
| resize 관측 | RO 콜백 | CSS 크기 → backing 재계산 → 변경 시에만 `canvas.width/height` 대입 → setTransform → execute | 매 콜백 무조건 backing 대입 시 **context state 초기화 + RO 루프** 위험(표 6) | POC `App.tsx:129-130`(변경 시에만 대입) |
| unmount | — | RO disconnect, listener 제거, rAF 취소, executor 재진입 차단 | 누수·unmount 후 draw | POC `App.tsx:167-170` |

**ref callback vs effect(근거 있는 판단):**
- `@types/react@19.2.17`는 **ref callback이 cleanup 함수를 반환**할 수 있다(`node_modules/.pnpm/@types+react@19.2.17/node_modules/@types/react/index.d.ts:176-185`). → element 부착/해제와 RO 등록/해제를 **element 수명에 정확히** 묶을 수 있다(CONFIRMED).
- 반면 POC 선례와 기존 앱 선례(`usePublicCatalog`)는 `useEffect` 기반이다(POC `App.tsx:121-171`).
- **권장:** element 획득·RO 등록·listener 등록은 **ref callback + 반환 cleanup**(element 교체에 정확), plan/selection 변경에 따른 재실행은 **effect**로 분리. 단 이 조합은 저장소에 선례가 없으므로 **스펙 022에서 명시적으로 지정**해야 한다(현 상태: 선택지 2개 모두 근거 있음 → 스펙에서 택일).
- **비동기 이미지 로딩은 이번 범위 제외** → 합성 in-memory drawable만 쓰면 **취소 토큰/AbortController가 필요 없다.** 필요한 최소 생명주기는 위 6줄뿐이다(CONFIRMED: executor는 동기 함수 — `executePreviewPlan.ts`의 `executePreviewRenderPlan`이 `CanvasExecutionResult`를 즉시 반환).

---

## 표 6. Resize · 0-size · fractional-size 처리표

| 상황 | 관측 방법 | 처리 | 근거/상태 |
|---|---|---|---|
| 일반 resize | `ResizeObserver`(element 단위) | 콜백에서 CSS 크기 재측정 → backing 재계산 | POC `App.tsx:164-165` CONFIRMED |
| ResizeObserver 지원 | 스펙 001 POC가 지원 여부를 화면에 표기하는 항목으로 사용 | 리빌드 대상 4환경 실측 표는 **미기록** | 스펙 001 `:156` CONFIRMED / 실기기 지원 표 **NOT VERIFIED** |
| 최초 0×0 / `display:none` | `getBoundingClientRect()`가 0 | `computeBackingStoreSize`가 **`NON_POSITIVE_SIZE`로 안전 실패** → draw 건너뛰기(예외 없음) | `backing.ts:31` CONFIRMED |
| fractional CSS px | rect가 소수 | `round(css*dpr)`로 정수 backing, `max(1,…)` 하한 | `backing.ts:35-36` CONFIRMED |
| 빠른 연속 resize | RO가 프레임마다 콜백 | **rAF 코얼레싱**(예약 1개, 다음 프레임에 1회 실행) — 고정 sleep/타이머 불필요 | 패턴은 근거 있음(스펙 019 §제외 목록에 rAF 명시), 저장소 내 구현 선례 **없음** → 스펙에서 지정 |
| RO 루프(`ResizeObserver loop completed…`) | 콘솔 경고 | **backing 대입을 값이 바뀔 때만** 수행 + canvas 자체 CSS 크기를 콜백에서 변경하지 않기 | POC `App.tsx:129-130` CONFIRMED(조건부 대입) |
| orientation | POC는 `orientationchange` **추가** 청취 | 회전 시 CSS 크기가 바뀌면 RO만으로 충분하나, POC가 별도 청취를 유지한 이유는 문서화되지 않음 | POC `App.tsx:166` CONFIRMED(존재) / **필요성 NOT VERIFIED** |
| 불필요 backing reset | — | `canvas.width` 대입은 **컨텍스트 상태를 초기화**(transform 포함)하므로 값이 같으면 대입 금지 | 표 7 §순서 참조. 조건부 대입 근거 POC `:129-130` |

---

## §7. executor 호출 전후 계약 (표 4·5의 실행 순서 상세)

**필수 순서(권장, 각 단계 근거):**

1. CSS 크기 측정 → `computeBackingStoreSize({cssSize, deviceDpr, dprCap})`. 실패(0-size 등)면 **draw하지 않고 종료**(`backing.ts:31`).
2. `canvas.width/height`를 **값이 다를 때만** 대입. — `width/height` 대입은 컨텍스트 상태(transform·style)를 초기화하므로, 대입 후에는 반드시 3을 다시 해야 한다(HTML 표준 동작; 저장소 코드로는 미검증 → 스펙에서 명문화).
3. `getContext('2d')` (동일 canvas면 **같은 컨텍스트 객체가 반환**되므로 재사용 가능; 저장소 코드로 미검증 → 명문화).
4. `ctx.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0)` — **반드시 2 이후, executor 호출 전**(POC `App.tsx:133`).
5. `executePreviewRenderPlan({context, plan, imageBindings})` 호출. executor는 내부에서 `save → clearRect(0,0,plan.logicalCanvas.w/h) → 명령 → restore` 순으로 동작한다(스펙 021 §5, 구현 `executePreviewPlan.ts`).
   - **transform 적용 위치 검증:** executor의 `clearRect`는 **논리 좌표**를 쓴다. 4에서 setTransform(dpr)이 걸려 있으면 논리 크기 × dpr = backing 전체가 지워지므로 **정확**하다. 단 이는 `plan.logicalCanvas == cssSize`일 때만 성립한다(표 4 불변식).
   - executor는 `setTransform/scale/rotate/translate`를 **호출하지 않는다**(스펙 021 §2 포트에 없음) → 4의 transform은 executor 실행 내내 유지된다. executor의 outer `save/restore`는 그 transform을 보존한다.
6. 결과 처리: `{ok:true, executedCommands}` 또는 `{ok:false, code, commandIndex?}`. **실패 시 화면/접근성 계약은 미정의** — 현재 어떤 코드도 executor 실패를 UI로 매핑하지 않는다(스펙 021 §9가 "앱 오류 UI 매핑은 별도 통합 스펙"으로 명시). 스펙 022에서 정할 항목: 실패 시 canvas를 비울지·마지막 성공 프레임을 남길지, `role="img"`/`aria-label`/대체 문구를 어떻게 둘지. **NOT DECIDED**
7. **누출 금지 유지:** 실패 Result에는 URL·imageRef·layerId·원문 오류가 없다(스펙 021 승인 계약). UI 문구는 스펙 015 선례처럼 **code→안전 한국어 메시지** 매핑만 사용해야 한다(`catalog/messages.ts` 선례).

---

## §9. E2E 격리 방식 (제품 UI에 테스트 전용 경로를 만들지 않고)

| 방식 | 내용 | 새 서버/포트 | 스펙 021 종료 구조 영향 | 평가 |
|---|---|---|---|---|
| **A. 기존 route interception**(권장) | 실제 앱을 그대로 열고, 고정 카탈로그 URL만 합성 fixture로 응답 → 실제 선택 흐름 → 실제 canvas 렌더 | **불필요** | 없음(서버·포트 그대로) | 선례 `tests/e2e/mockup-catalog.spec.ts:26-42`, 정확 URL 외 요청은 abort+실패 처리 |
| B. 별도 test fixture entry(HTML/JS) | 테스트 전용 진입점으로 canvas만 마운트 | 새 entry 필요(빌드 산출물 증가) | globalSetup preview root가 앱 dist라 **추가 진입점/포트 검토 필요** | 제품 번들 오염 위험 → 비권장 |
| C. 제품 UI에 debug query/route | `?debug=canvas` 등 | 불필요 | 없음 | **금지 대상**(요구사항) |
| D. 컴포넌트 단위(jsdom 등) | 브라우저 없이 canvas 검증 | — | — | 저장소는 jsdom/RTL 미도입(스펙 011 결정) → 비권장 |

**권장 = A.** 실제 브라우저 Canvas·DPR을 검증하면서 제품 UI에 테스트 전용 표면을 만들지 않는다. DPR 검증은 **Playwright의 `deviceScaleFactor`를 테스트 측에서 지정**(프로젝트/`test.use`)하면 되고, 서버·포트·globalSetup exact-handle 소유 구조를 **전혀 건드리지 않는다**(`playwright.config.ts` globalSetup 유지). **무회귀 기준: 기존 e2e 49 PASS·unit 434 PASS를 그대로 유지하고, 신규 Canvas E2E는 추가분으로만 계산**한다.

---

## 표 7. 자동검증 가능 / 불가능 구분표

| 검증 항목 | Chromium 자동검증 | 방법 | 상태 |
|---|---|---|---|
| `canvas.width/height`가 CSS×dpr과 일치 | **가능** | `page.evaluate`로 속성 읽기 + `deviceScaleFactor` 지정 | CONFIRMED(도구 존재) |
| `ctx` transform이 dpr로 설정됨 | **가능(간접)** | 논리 좌표로 그린 도형이 backing 상 dpr배 위치에 나타나는지 픽셀 검사 | 가능 |
| **fill/stroke 실제 픽셀 색·위치** | **가능** | 이미지 없이 `fill-rect`/`stroke-rect`만 있는 plan → 테스트 측 `getImageData` 또는 스크린샷 | 가능 |
| **clip 동작(`draw-image-cover`)** | **가능(조건부)** | **same-origin 합성 drawable**(예: 앱이 만든 offscreen canvas / `createImageBitmap`)만 사용하면 taint 없음 | 가능하나 **Q1 결정 필요** |
| `getImageData` 사용 경계 | **테스트에서만 허용** | production 코드는 스펙 021에서 금지(포트에 없음)·소스 스캔으로 고정 중 | CONFIRMED |
| 0-size/`display:none`에서 예외 없음 | **가능** | 컨테이너를 숨겼다 보이기 | 가능 |
| resize 후 backing 갱신·잔상 없음 | **가능** | viewport 변경 후 속성+픽셀 확인 | 가능 |
| **실제 기기 선명도·성능·회전** | **불가능** | 실기기 필요 | **NOT TESTED 유지** |
| **CORS-clean·실제 이미지 로드** | **불가능(이번 범위 제외)** | 실제 Firebase Storage 필요 | **NOT TESTED 유지** |
| 인쇄 PNG 정확도 | **불가능** | 후속 print 스펙 | NOT TESTED |

**스펙 018 신뢰 경계 침범 회피(CONFIRMED 원칙):** 이번 단계의 drawable은 **네트워크에서 온 이미지가 아니라 앱이 메모리에서 만든 same-origin 합성 소스**여야 한다. 그러면 `resolvePublicImageSource`(스펙 018)·crossOrigin·taint 판정을 **건드리지 않는다**. 실제 URL→drawable 결합은 후속 스펙이다(스펙 021 §3 명시).

---

## 표 8. 스펙 022 포함 / 제외 제안표

| 구분 | 항목 | 근거 |
|---|---|---|
| **포함(권장 최소)** | `apps/mockup`에 Canvas surface 계층: element ref + `getContext('2d')` + `computeBackingStoreSize` 적용 + `setTransform(dpr)` + executor 호출 | 스펙 019·021이 이미 존재, 앱 연결만 남음 |
| 포함 | StrictMode 안전 생명주기(중복 RO/listener/draw 0, unmount 누수 0) | `main.tsx:9`, 선례 `usePublicCatalog.ts` |
| 포함 | ResizeObserver + rAF 코얼레싱, 0-size/fractional 안전 처리, backing 조건부 대입 | 표 6 |
| 포함 | executor 실패 → **안전한 접근성 상태**(code→한국어 메시지, 식별정보 0) | 스펙 021 §9 + 스펙 015 messages 선례 |
| 포함 | 실제 Chromium E2E: 속성·픽셀·resize·0-size (route interception 방식, 서버 구조 무변경) | 표 7·§9 |
| 포함(조건부) | **그릴 plan의 최소 공급원** — Q1·Q2·Q3 결정 후에만 확정 가능 | 표 1~3 |
| **제외(후속 유지)** | 실제 운영 이미지 로딩 / Firebase Storage URL·CORS-clean binding | 스펙 021 §3 |
| 제외 | pointer/touch/wheel/pinch, zoom 앵커 | 스펙 019·021 제외 유지 |
| 제외 | 회전 transform, text/clock/watermark/template art | 스펙 020 §10, 021 §제외 |
| 제외 | print/PNG/export, 저장·주문 | 조사보고서(2026-07-27) 표 10 후속 순서 |
| 제외 | Firebase SDK/Auth/write/Rules, 배포 | CLAUDE.md §4 |
| 제외 | 실기기 4환경 | NOT TESTED 유지 |
| 제외 | 케이스 라운드/그림자 body·원형/라운드 zone·알파 stroke 재현 | 표 2·3(스펙 020 vocabulary 밖) |

---

## 표 9. QUESTIONS / NOT DECIDED / NOT VERIFIED

| # | 항목 | 성격 | 내용 |
|---|---|---|---|
| **Q1** | **이미지 없는 preview가 불가능한 구조** | **차단** | `FramePlanInput`은 `imageRef`·`image`·`transform`·`imageZone`이 **전부 필수**(`build.ts:244-246`) → **액자 plan 자체를 만들 수 없음**. `CasePlanInput`도 `zones: []`여도 `image` intrinsic size 필수(`build.ts:159`). 선택지: (a) 스펙 022를 **케이스 body-only**로 제한하고 `image`에 그리지 않는 명시적 placeholder 크기를 문서화, (b) **합성 in-memory drawable**(앱이 만든 offscreen canvas)을 바인딩해 실제 clip/draw까지 검증, (c) 스펙 020 입력 계약을 image optional로 **확장**(승인된 계약 변경). **임의 선택하지 않음.** |
| **Q2** | **dprCap 제품 값** | **차단** | `computeBackingStoreSize`는 `dprCap` **필수·기본값 없음**(`backing.ts:20-21`). 앱이 호출하려면 어떤 값이든 전달해야 함. POC=2(`poc/.../App.tsx:116`), 레거시 룸=4(주석 3과 모순). 스펙 019가 **제품 정책 미확정**으로 종료. 선택지: (a) Codex가 값 확정, (b) 스펙 022에서 **required prop**으로만 두고 앱 호출부 값은 스펙에 명시된 상수로 고정. **앱에 2/4를 임의 하드코딩하지 않음.** |
| **Q3** | 케이스 `bodyColor` 출처 | **차단(케이스 렌더 시)** | 카탈로그에 케이스 색 필드 없음(`read.ts:68-79`). 레거시는 UI 상태 `caseColor` 기본 `#1A1A1A`(`:977`). 디자인 토큰 사용은 **제품 결정**. |
| **Q4** | 액자 색 선택 단계 부재 | 차단(액자 렌더 시) | `frameColors[].fill`은 카탈로그에 있으나(`read.ts:83`) browse selector·selection에 **색 단계가 없음**(`browse/types.ts`, `selection.ts:21-27`). 스펙 016 selector 확장이 선행되어야 함. |
| **Q5** | mat 외곽선 알파 색 | NOT DECIDED | 레거시 `rgba(0,0,0,.06)`/1.5(`:3129`) vs 스펙 020 `#RRGGBB` 전용(`build.ts:47`) → 근사(불투명 hex)·생략·계약 확장 중 택일 필요. |
| **Q6** | `logicalCanvas` 정의 | NOT DECIDED | 레거시 케이스=model px backing(`:1047`), 액자=preview px(`:3119`) vs 리빌드 POC=CSS px 논리크기. 표 4 불변식(`logicalCanvas == cssSize`) 채택 여부 확인 필요. |
| **Q7** | executor 실패 시 UI/접근성 | NOT DECIDED | 스펙 021 §9가 후속으로 미룸. 빈 화면/마지막 프레임 유지/대체 문구 중 택일. |
| **Q8** | ref callback vs effect | 선택 필요 | 둘 다 근거 있음(React 19 ref cleanup `@types/react:176-185` / POC·앱 선례 effect). 스펙에서 택일 권장. |
| **Q9** | orientation listener 필요성 | NOT VERIFIED | POC는 `orientationchange`를 추가 청취(`App.tsx:166`)하나 RO만으로 충분한지 실기기 근거 없음. |
| **Q10** | 케이스 zones 스키마 | NOT VERIFIED | `photoZones`는 레거시 근거(`:1660-1664`)뿐, `CatalogDocumentV1`은 caseTemplates를 opaque 처리(`read.ts:64-65`) → 검증 계층 없이 사용 불가. |
| Q11 | 사이즈별 `frameThickness` | NOT VERIFIED | 레거시 `sz.frameThickness` 참조(`:3120`)하나 `frameSizes` 알려진 필드 목록에 없음(`read.ts:82`). |
| Q12 | ResizeObserver 실기기 지원 | NOT VERIFIED | 스펙 001이 항목으로만 언급(`:156`), 4환경 실측 표 미기록. |
| Q13 | `canvas.width` 대입의 컨텍스트 초기화·동일 `getContext` 반환 | NOT VERIFIED(저장소 내) | HTML 표준 동작이나 저장소 코드/테스트로 고정된 근거 없음 → 스펙에서 명문화 + E2E로 고정 권장. |

---

## 표 10. 변경 · 무변경 파일 목록

| 구분 | 파일 |
|---|---|
| **변경(문서 2개)** | `docs/codex-claude-handoff/reviews/2026-07-28-react-canvas-lifecycle-investigation.md`(신규, 이 문서) · `docs/codex-claude-handoff/CURRENT.md`(상태 1줄+요약) |
| **무변경(확인)** | `apps/**`(mockup·admin 소스 전체) · `packages/**`(shared·render·firebase·spaces·ui) · `tests/**` · `scripts/**` · `playwright.config.ts` · `vitest.config.ts` · `package.json`·`pnpm-lock.yaml` · 운영 `denn-*.html` · `firebase.json`·`.firebaserc`·Rules · `poc/**` · 디자인·결과 PNG |
| **미실행** | 실제 Firebase GET · 이미지 다운로드 · `test:live:*` · deploy · 신규 의존성 설치 |

---

## 조사 준수 확인

- 읽기 전용. 제품 코드·CSS·테스트·설정·lockfile·운영본·PNG **무변경**, 스펙 022 **구현 미착수**.
- 실제 네트워크 요청·live test·배포 **0**.
- 근거 없는 값(기본 zone·색상·캔버스 크기·transform·DPR 상한)을 **임의 생성하지 않음** — 전부 Q/NOT DECIDED/NOT VERIFIED로 남김.
- 인용은 파일+라인(리빌드는 HEAD `d0af25d`, 레거시는 이번 조사에서 직접 재확인한 라인).
- 실제 상품명·ID·이미지 URL·token·base64 **미복사**.
