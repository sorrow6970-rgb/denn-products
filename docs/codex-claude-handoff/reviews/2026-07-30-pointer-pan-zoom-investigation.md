# 스펙 029 사전 조사 — 고객 미리보기 이미지 이동·확대(pointer/pan/zoom) 계약

- 일자: 2026-07-30
- 성격: **읽기 전용 조사**. 제품 코드·테스트·설정·CSS·lockfile 변경 **0**, 구현 스펙 아님.
- 기준 HEAD: `d21531c` (스펙 028 종료 직후)
- 지시: `Automation/NEXT_CLAUDE_PROMPT.md`(상태 `WAITING_FOR_CLAUDE`, active_unit `spec-029-pointer-pan-zoom-investigation`)
- 실제 network·live·Firebase·CORS·운영 데이터 접근 **0**

## 0. 한 줄 결론

**pan/zoom은 "리스너 3개 붙이는 일"이 아니다.** 리빌드에는 이미 `computeCoverDrawRect`(cover+pan clamp)와
`clientPointToLogical`이 있고 plan/adapter도 zone별 `transform`을 받는다 — 즉 **기하는 이미 준비돼 있다**.
막힌 것은 두 가지 계약이다: ⓐ **pan 값의 단위·기준 공간**(액자 logical canvas는 뷰포트에 따라 매 resize
바뀌므로 logical px 저장은 "화면 크기 바뀌면 사진이 움직인다"를 만든다) ⓑ **transform의 소유자**(현재
스펙 026 owner가 `transform`을 **리터럴 타입 `{scale:1,x:0,y:0}`** 으로 고정 발행한다). 이 둘을 정하지 않고
리스너를 붙이면 레거시가 겪은 것과 같은 "미리보기≠인쇄", "회전/리사이즈 후 위치 틀어짐"을 새 코드에서
재생산한다.

---

## 1. 레거시 case/frame 이미지 이동·확대 동작 (CONFIRMED, `denn-mockup-tool.html`)

### 1.1 상태 모델

| 항목 | 근거 | 내용 |
| --- | --- | --- |
| 단일 case transform | `:989`, `:1404` | `caseImgT = {scale, x, y}` |
| zone별 transform | `:989` `var caseImgTs=[]`, `:1665` | **zone마다 독립** `caseImgTs[i] = {scale,x,y}` |
| 활성 zone | `:1365-1372` | `getActiveImgT()`는 `curCTpl.photoZones.length > 1`일 때만 `caseImgTs[activeCaseZone]`을 반환, 아니면 `caseImgT`. `setActiveZone(i)`는 인덱스만 바꾼다 |
| 활성 zone 선정 | `:1382` | **업로드한 zone이 곧 활성 zone**(`loadZoneImg`가 `activeCaseZone=i`). 캔버스를 클릭해 zone을 고르는 경로는 **없다** |
| 액자 transform | `:1502`, `:1780` | `frameImgT` **단 하나**(액자는 multi-zone 편집 없음) |
| 초기값 | `:1381`, `:1404`, `:1565-1567` | 항상 `{scale:1, x:0, y:0}` |

### 1.2 pan 좌표계와 clamp 공식

- 좌표 변환: `cPos` (`:1535`) = `(client - rect.left) * canvas.width / rect.width` → **캔버스 backing px**.
  레거시는 DPR을 쓰지 않아 backing == logical이었다.
- 드래그: `panStart = p - T` (`:1431`, `:1502`), 이동 중 `T = p - panStart` (`:1443`, `:1506`) — 즉 **절대 위치
  추적**(누적 델타가 아니다).
- clamp: **렌더 함수 `drawImgT`(`:1543-1556`) 안에서** 수행된다.
  ```
  baseSc = max(w/iw, h/ih)                  // cover
  sc     = baseSc * T.scale
  maxTx  = |iw*sc - w| / 2,  maxTy = |ih*sc - h| / 2
  T.x    = clamp(T.x, -maxTx, +maxTx)       // ★ T를 직접 변형(mutate)
  dx     = x + (w - iw*sc)/2 + T.x          // center-anchored
  ```
  - `Math.abs`이므로 **줌아웃(scale<1, 이미지<존)에서도 ±|차이|/2 만큼 이동 가능** → 클립 안에 **빈 공간이 생길
    수 있다**(레거시 허용 동작).
  - clamp가 **렌더 중 상태를 변형**하기 때문에 "드래그가 경계에서 멈춤"이 자연히 성립한다(코멘트 `:1547-1549`).
- 인쇄 경로는 **clamp가 없고**(`drawImageT` `:11371-11379`) pan에 해상도 배율을 곱한다:
  `dx = x + (w-iw*sc)/2 + T.x * scale`.
  - case: `scale = sx = dim.w / model.w` (`renderCasePrint`, `:9732`) → **미리보기 캔버스(=model.w)와 일치**.
  - frame: `scale = dim.w / 500` (`:11418`, `:11421`, `:11431`) — 그런데 액자 미리보기 캔버스 폭은
    `ADM.uiCustom.prevMaxW || 500` (`:1758-1759`)이다. **운영자가 `prevMaxW`를 바꾸면 미리보기와 인쇄의 pan이
    어긋난다**(하드코딩 500 = 기본값에만 맞는 가정).

### 1.3 zoom 범위·초깃값·증감

| 입력 | 근거 | 규칙 |
| --- | --- | --- |
| 휠 | `:1451-1459`, `:1510-1518` | `deltaY>0 ? -0.08 : +0.08` **가산**, clamp **0.3 ~ 5** |
| 핀치(2손가락) | `:1479-1487`, `:1529` | `scale *= dist/lastDist` **승산**, clamp **0.3 ~ 5** |
| 슬라이더 | `:309`, `:414`, `:1559-1560` | `range min=30 max=500 value=100` (%) → `scale = value/100` |
| ± 버튼 | `:1561-1564`, `:310-315` | `±25`(%p), clamp **30 ~ 500** |
| 맞춤/초기화 | `:1565-1567` | `맞춤`·`↺` 모두 `{scale:1,x:0,y:0}` + 슬라이더 100% (두 버튼의 동작이 **동일**) |

**불일치(CONFIRMED)**: 휠/핀치는 0.3~5, 슬라이더/버튼은 0.30~5.00을 % 정수로만 표현 → 휠로 만든
`0.34`가 슬라이더 표시(정수 %)와 어긋난다. 또 휠·핀치는 `getActiveImgT()`를 바꾸면서도 슬라이더 표시값은
**항상 `caseImgT.scale`** 로 계산한다(`:1455`, `:1482`) → **multi-zone에서 표시값이 틀린다**.
그리고 case 1손가락 터치의 시작 오프셋은 `caseImgT`(`:1470`)를, 이동은 `getActiveImgT()`(`:1490`)를 쓴다 →
**multi-zone 첫 터치에서 사진이 튄다**. 이 3건은 **재현 대상이 아니라 회피 대상**이다.

### 1.4 선택 변경·교체·삭제 시 초기화

| 사건 | 근거 | 동작 |
| --- | --- | --- |
| zone 이미지 업로드/교체 | `:1381-1382` | 해당 zone `T` 초기화 + 활성 zone 이동 |
| zone 이미지 삭제 | `:1403-1406` | 이미지 `null` + `T` 초기화 |
| case/frame 이미지 삭제 | `:1408` | 이미지 `null` + `T` 초기화 + 슬라이더/드롭존 UI 원복 |
| 템플릿·모델 변경 | — | **T를 초기화하지 않는다**(`selModel`/`selCTpl`에 T 리셋 없음) → 존 배치가 바뀌어도 옛 pan이 남고, 다음 렌더의 clamp가 뒤늦게 잘라낸다 |

### 1.5 이벤트 소유권 (레거시 실측)

- case 캔버스: `mousedown` 우선순위 **①텍스트 드래그 ②이미지 pan**(`:1422-1433`). `mouseup`·`mouseleave`
  모두 종료(`:1447-1448`) — **pointer capture 없음**, 캔버스 밖으로 나가면 드래그가 끊긴다.
- 터치: `touchstart {passive:true}` / `touchmove {passive:false}` + `preventDefault()`(`:1472-1474`) →
  **case는 팬 중 페이지 스크롤이 죽는다**.
- frame 터치: `frameScaleOverflowV()`(`:1500`)가 **preventDefault보다 먼저** 게이트로 동작 —
  액자 미리보기가 스크롤 컨테이너보다 크면 **이미지 팬/핀치를 포기하고 네이티브 스크롤에 양보**한다
  (`:1521`, `:1527`). 줌은 슬라이더로만.
- frame 터치 중 `__dennFramePreviewFreezeV`로 미리보기 스케일을 얼리고 `touchend`에서 해제 + 1회 재적용
  (`:1522`, `:1532`), `touchcancel`도 반드시 해제(`:1533`).
- rAF 병합: `requestStableFrameRender()`(`:1536`)가 프레임당 1회 렌더로 합친다(case는 즉시 `renderCase()`).
- 별 surface(룸 목업)의 교훈 — **참고만**: `setPointerCapture`(`:4150`, `:4172`), `document` capture 리스너
  (`:4174`, `:4199`), 2손가락 핀치 시 `RM.dragging=false`로 1손가락 드래그를 **매 move마다 재차단**(`:4246`),
  드래그가 위치를 "사용자 소유"로 표시해 운영자 디폴트 강제가 되돌리지 못하게 하는 플래그(`:4192`).
  스펙 029는 **다른 surface**이므로 코드 재사용 대상이 아니고, 설계 교훈으로만 인용한다.

### 1.6 접근성 (레거시 CONFIRMED 결함)

- 확대/축소 슬라이더는 native `input[type=range]` → 키보드 조작 가능(`:309`, `:414`).
- 그러나 `－`/`맞춤`/`＋`/`↺`는 **`div.z-btn` + `onclick`**(`:310-315`) — `role`·`tabindex`·`aria` 없음 →
  **키보드·스크린리더로 접근 불가**. 캔버스 자체에도 키보드 이동 경로가 **없다**(pan은 마우스/터치 전용).

---

## 2. 리빌드에서 재사용 가능한 계약 (CONFIRMED)

| 스펙 | 파일 | 재사용 가능성 |
| --- | --- | --- |
| 019 geometry | `packages/render/src/geometry/cover.ts` | **그대로 사용**. `computeCoverDrawRect`가 cover base·drawScale·**pan clamp**를 계산하고 `appliedTransform`·`maxPan`을 반환한다. 입력 transform을 **변형하지 않는다**(레거시와 다른 안전한 순수 함수) |
| 019 geometry | `geometry/point.ts` | **그대로 사용**. `clientPointToLogical`은 **logical/CSS px** 기준이고 DPR·backing을 쓰지 않는다(주석에 `cPos` 대응 명시). 범위 밖 좌표는 clamp하지 않는다 |
| 019 types | `geometry/types.ts:31` | `ImageTransform {scale, x, y}` — `x/y`는 **"이미지 중심 기준 logical px"** 로 문서화돼 있다 |
| 020/025 plan | `packages/render/src/plan/types.ts:46-93` | `CaseImageZone.transform`이 **zone마다 필수**(025), `FramePlanInput.transform`은 단일. plan은 순수·JSON-safe |
| 025 adapter | `apps/mockup/src/canvas/productPlan.ts:63-95` | `readImageState()`가 `transform`을 **1회 읽어** `scale>0`·`x/y` 유한을 검증한 snapshot으로 만든다. 편집된 transform을 그대로 받을 수 있다 |
| 022 surface | `apps/mockup/src/canvas/surface.ts:24-27`, `PreviewCanvasSurface.tsx` | DPR cap **2**, 그리기 순서 고정(측정→불변식→backing→setTransform→executor), 캔버스는 `role="img"`+`aria-label` |
| 026 owner | `apps/mockup/src/canvas/localImageBinding.ts:34`, `:249` | ⚠️ **`transform`이 리터럴 타입 `{readonly scale:1; readonly x:0; readonly y:0}`** 로 고정 발행된다. 편집 가능한 transform의 소유자를 **여기로 둘 수는 없다**(타입 자체가 1/0/0) |
| 027 composer | `apps/mockup/src/preview/PreviewComposer.tsx:208-288` | slot별 owner 상태를 모아 plan을 memo로 만든다. transform state를 얹을 자연스러운 자리 |

### 2.1 ★ 가장 중요한 발견 — 액자 logical canvas는 가변이다

- `resolveFrameLogicalWidth`(`previewContracts.ts:83-87`) = `max(1, round(min(contentBoxWidth, 500)))`,
  그리고 composer가 `ResizeObserver`로 content box를 관찰해 **resize마다 재계산**한다
  (`PreviewComposer.tsx:227-241`, `:278`).
- 따라서 **액자 pan을 logical px로 저장하면 창 크기/방향 변경 시 사진이 실제로 이동한다**(clamp 한계도 함께
  변해 잘린다). case는 `modelLogicalSize` 고정이라 이 문제가 없다 → **case와 frame에서 같은 단위를 쓰면
  한쪽이 반드시 틀린다**.
- 레거시의 인쇄 pan 배율(`dim.w/500`, `dim.w/model.w`)이 존재하는 이유도 동일한 문제이며, 액자 쪽은 이미
  하드코딩 500 때문에 취약하다(§1.2).
- **권장**: `transform.x/y`를 **정규화 pan**(예: `maxPan` 대비 −1..+1, 또는 zone 크기 대비 비율)으로 **상태에
  저장**하고, plan을 만들 때만 현재 zone 크기로 logical px로 환산한다. 이렇게 하면 resize·DPR·인쇄 해상도가
  달라도 같은 구도가 재현된다. 단 이는 **계약 변경**이므로 Codex/Founder 결정 사항이다(§5 D-1).

---

## 3. 이벤트 소유권과 생명주기 (리빌드 기준, CONFIRMED / NOT DECIDED)

- **pointer capture 필요**: 레거시는 capture가 없어 캔버스를 벗어나면 드래그가 끊긴다. 리빌드는
  `setPointerCapture(pointerId)` + `pointerup/pointercancel/lostpointercapture` 3종 종료 경로를 모두
  닫아야 한다(룸 surface가 실제로 이 패턴을 쓴다, `:4150`).
- **StrictMode**: 앱은 React 19 + StrictMode 이중 mount/cleanup을 이미 전제로 owner를 설계했다
  (`localImageBinding`/`templateArtBinding`이 dispose·generation guard 보유). pan/zoom도 **framework-free
  컨트롤러 + 얇은 hook** 형태가 기존 관례와 일치한다.
- **stale 이벤트 차단**: owner들이 쓰는 `generation` 카운터 패턴을 그대로 적용해 드래그 세션마다 generation을
  올리고, 종료 후 도착한 move/up을 무효화한다.
- **선택 변경·파일 교체·unmount 중 드래그 종료**: composer는 선택 변경 시 remount/dispose로 plan·Canvas를
  즉시 없앤다(스펙 027/028 계약). 진행 중 드래그는 **캡처 해제 + 세션 종료**가 필요하고, transform을
  초기화할지(레거시는 교체/삭제에서만 초기화, 템플릿 변경에서는 유지 §1.4)는 **NOT DECIDED**.
- **listener·rAF 소유권**: 렌더는 이미 surface engine이 소유한다. pan 중 매 move마다 plan을 다시 만들면
  React 리렌더가 프레임을 먹으므로 **rAF 병합**(레거시 `requestStableFrameRender` 대응)이 필요하다.
  다만 "plan을 rAF로 만드느냐, transform state만 rAF로 커밋하느냐"는 설계 결정(NOT DECIDED).

---

## 4. 모바일·접근성 (CONFIRMED 제약 / NOT DECIDED)

- **스크롤 충돌이 실재한다**: `surface.css`의 `.denn-canvas-surface`는 `overflow-x: auto`이고 캔버스는
  `max-width:100%`로 **축소하지 않는다**(주석에 명시). 즉 320px 화면에서 case 캔버스는 가로 스크롤 컨테이너
  안에 있고, 그 컨테이너는 키보드 도달을 위해 `tabIndex={0}`이다(`PreviewCanvasSurface.tsx:53-56`).
  → 캔버스 위 드래그를 무조건 `preventDefault`하면 **가로 스크롤과 페이지 세로 스크롤을 둘 다 죽인다**.
  레거시 액자가 쓴 **"넘치면 네이티브 스크롤에 양보"** 게이트(§1.5)가 그대로 유효한 참고 해법이다.
- **`touch-action` 범위**: 현재 CSS에 `touch-action` 선언이 **하나도 없다**(`surface.css` 전문 확인).
  캔버스에만 `touch-action: none`을 주면 세로 스크롤까지 막히고, 주지 않으면 팬 제스처가 스크롤에 먹힌다 →
  **범위·조건이 결정 사항**(예: 드래그 중에만 동적으로, 또는 `pan-y`만 허용).
- **브라우저 확대 보존**: 2손가락 핀치를 이미지 줌으로 가로채면 **200% 브라우저 확대 제스처를 빼앗는다**
  (스펙 018/027 게이트에 "실제 200% 확대"가 계속 NOT TESTED로 남아 있는 항목). 레거시는 액자에서 핀치를
  포기하고 슬라이더로 대체한 선례가 있다.
- **키보드 경로가 필요**: 레거시엔 pan 키보드 경로가 없고 ±버튼도 div다(§1.6). 리빌드는 기존 관례
  (44px 타깃·`focus-visible`·axe 0·console 0 — 스펙 018/027 E2E 게이트)를 지켜야 하므로 **화살표 이동 +
  버튼형 확대/축소 + 초기화**를 실제 `button`/`input[type=range]`로 제공하는 것이 정합적이다.
- 캔버스는 `role="img"`이므로 **캔버스 자체를 조작 위젯으로 만들려면** 별도의 접근 가능한 컨트롤(또는
  `role`/키보드 처리 추가)이 필요하다 — 현재 계약을 바꾸는 일이라 결정 사항.

---

## 5. 제품·계약 결정이 필요한 항목 (차단 QUESTIONS)

| ID | 결정 | 왜 임의 결정 불가 | 권장(참고) |
| --- | --- | --- | --- |
| **D-1** | `transform.x/y`의 **단위·기준 공간**(logical px 저장 vs 정규화 저장) | 액자 logical canvas가 resize마다 변한다(§2.1). 잘못 고르면 "창 크기 바꾸면 사진 움직임"·"미리보기≠인쇄"가 구조적으로 생긴다 | **정규화 저장** + plan 생성 시 환산 (Codex 계약 결정) |
| **D-2** | **활성 zone UX**(case multi-zone) | 레거시엔 캔버스로 zone을 고르는 경로가 없고 "마지막 업로드 zone"이 활성이다. 캔버스 히트테스트로 고를지, 슬롯 UI로 고를지는 제품 UX | 슬롯 카드 선택(이미 slot별 UI 존재) + 활성 슬롯 표시 (**Founder**) |
| **D-3** | **scale 최소·최대와 단위**(0.3~5 vs 30~500%, 휠 가산 vs 승산) | 레거시가 두 축으로 불일치(§1.3). 표시값 계약이 곧 UX | 0.3~5 단일 진실 + 표시만 %, 휠·핀치·버튼 모두 **승산**으로 통일 (**Founder** 확인) |
| **D-4** | **키보드 이동 단위**(px? zone 대비 %? Shift 가속?) | 정규화 저장을 택하면 px 단위 자체가 재정의된다 | zone 대비 2%/스텝, Shift 10% (Codex) |
| **D-5** | **초기화 버튼 구성**("맞춤"과 "초기화"가 레거시에서 동일 동작) | 버튼 2개를 그대로 옮기면 중복 UI | 단일 `원래대로` 1개 (**Founder**) |
| **D-6** | **핀치 지원 여부** | 브라우저 200% 확대 제스처와 충돌하고 Playwright로 검증 불가(§6) | 1차는 **핀치 미지원**(슬라이더·버튼·휠만), 실기기 검증 후 재검토 (**Founder**) |
| **D-7** | **클립 안 빈 공간 허용 여부**(scale<1에서 leak) | 레거시는 허용(abs clamp §1.2, `cover.ts`도 §RISK로 명시). 인쇄물에 흰 여백이 나갈 수 있는 제품 이슈 | 최소 scale을 **1.0**으로 올려 빈 공간 원천 차단, 또는 clamp를 비대칭으로 (**Founder**) |
| **D-8** | **transform 소유자**(owner 타입 확장 vs composer 상태) | 스펙 026 owner의 `transform`은 리터럴 `1/0/0`이라 확장하면 026 계약 변경 | **composer가 slot별 transform state 소유**, owner는 ref+intrinsic만 유지 (Codex) |
| **D-9** | **선택/템플릿 변경 시 transform 유지 여부** | 레거시는 교체·삭제만 초기화, 템플릿 변경은 유지(§1.4) — 존 배치가 바뀌면 구도가 깨진다 | 템플릿·모델·사이즈 변경 시 **초기화** (Codex) |

---

## 6. 검증 설계 (실행 가능/불가 분리)

**framework-free unit (가능)**
- transform reducer: 드래그 시작/이동/종료, 휠, 버튼, 초기화의 결정성. `computeCoverDrawRect`의 `maxPan`과
  일치하는 clamp, `scale` 경계(min/max)에서의 고정, NaN/Infinity/음수 scale 입력 안전 실패.
- hostile 입력(getter/Proxy)·1회 읽기 규율은 스펙 027/028에서 이미 요구된 패턴이라 동일 적용.

**React lifecycle (가능)**
- StrictMode 이중 mount에서 리스너·capture 누수 0, unmount 중 진행 드래그 종료, 선택 변경 시 dispose,
  stale move/up 무효화.

**실제 Chromium E2E (부분 가능)**
- 가능: `page.mouse.down/move/up` 드래그, `page.mouse.wheel`, 키보드 조작, 슬라이더/버튼, 320px·desktop,
  axe 0, console 0, DPR 1/3(`canvas-surface.spec.ts:87`, `:627-628`이 이미 두 프로젝트를 나눠 검증),
  드래그 후 **캔버스 픽셀 좌표 검증**(스펙 027이 쓰는 방식).
- 단일 터치: `test.use({ hasTouch: true })` + `page.touchscreen.tap`으로 제한적 검증 가능.
- **NOT TESTED(구조적)**: **2손가락 핀치는 Playwright API로 구동할 수 없다**(touchscreen은 단일 탭만 제공).
  JS로 합성 `TouchEvent`를 dispatch하는 것은 실제 제스처가 아니므로 PASS로 기록해서는 안 된다.
  현재 `playwright.config.ts`에는 chromium **desktop 프로젝트 1개**뿐이고 `hasTouch` 프로젝트가 없다.
- **NOT TESTED(실기기 전용)**: iOS Safari·Android Chrome·삼성 인터넷·카카오 인앱의 스크롤/제스처 충돌,
  실제 200% 브라우저 확대, 주소창 토글로 인한 리사이즈 중 드래그, 대용량 사진에서의 드래그 프레임률.

---

## 7. 권장 최소 구현 범위 (1단계)

1. **계약 먼저**: D-1(pan 단위)과 D-8(소유자)을 확정한다. 그 전에는 앱 코드 작업 불가 — 스펙 028의
   "어휘 먼저" 순서와 동일한 이유다.
2. `packages/render`는 **무변경**으로 시작한다(`computeCoverDrawRect`·`clientPointToLogical`이 이미 충분).
   정규화 pan을 택하면 환산은 **adapter(`productPlan.ts`) 또는 신규 순수 helper**에서 한다.
3. framework-free `imageTransformController`(신규) + 얇은 hook: 드래그 세션·generation·capture 종료·
   rAF 커밋만 담당하고 렌더/plan은 건드리지 않는다.
4. composer가 slot별 transform을 소유하고 기존 `UserImageState`에 합쳐 plan을 만든다(owner 무변경).
5. UI는 **접근 가능한 컨트롤**(버튼/슬라이더/화살표 키)로 먼저 완성하고, 마우스 드래그+휠을 추가한다.
   터치 팬은 스크롤 양보 게이트와 함께, 핀치는 D-6 결정 전까지 **미지원**.
6. E2E는 §6의 "가능" 목록만 PASS로 기록하고 핀치·실기기는 NOT TESTED로 남긴다.

## 8. 허용 파일 후보 (구현 스펙이 승인될 경우)

- `apps/mockup/src/canvas/imageTransform*.ts` (신규 컨트롤러 + test)
- `apps/mockup/src/canvas/useImageTransform.ts` (얇은 hook)
- `apps/mockup/src/preview/PreviewComposer.tsx` (+ test) — transform state 소유·전달
- `apps/mockup/src/preview/previewContracts.ts` (+ test) — 고정 문구·한계값 상수
- `apps/mockup/src/canvas/productPlan.ts` (+ test) — 정규화→logical 환산을 여기 둘 경우에만
- `apps/mockup/src/canvas/surface.css` — `touch-action` 범위를 바꿀 경우에만
- `tests/e2e/mockup-preview.spec.ts`, 필요 시 `playwright.config.ts`(hasTouch 프로젝트 추가)
- 문서: 해당 스펙 DONE·`CURRENT.md`·live log·handoff

**변경 금지 후보**: `packages/render/**`(기하 재사용만), `packages/shared/**`, `localImageBinding.ts`
(026 계약), `templateArtBinding.ts`(028 승인분), admin, 운영 HTML, Firebase 설정/Rules/CORS, lockfile.

## 9. STOP 조건

- D-1(pan 단위)·D-8(소유자)이 확정되기 전 구현 착수
- 스펙 026 owner의 `transform` 리터럴 타입을 바꿔야 하는 설계
- `packages/render` 기하 계약(clamp 공식·단위) 변경이 필요해짐
- 핀치를 "검증됨"으로 기록해야 하는 상황(Playwright로 재현 불가)
- 브라우저 200% 확대 제스처를 가로채는 설계
- 캔버스 `role="img"`/접근 가능한 이름 계약을 깨야 하는 설계
- 신규 의존성(제스처 라이브러리 등), Firebase/network/live/deploy, 운영 데이터 접근
- 실기기 육안 검증 없이는 판정할 수 없는 스크롤/제스처 충돌
- flaky한 pointer E2E(재현 불가한 좌표·타이밍 의존)

## 10. 이번 조사에서 하지 않은 것

- 스펙 029 **구현 문서 작성 없음**, pointer/pan/zoom **구현 0**
- 제품 코드·테스트·설정·CSS·lockfile 변경 **0**(`git diff` 상 문서만)
- 신규 의존성 0, Firebase/network/live/deploy 0, 운영 데이터·이미지 접근 0
- 스펙 018 PNG 2개 restore·checkout·stage·commit **하지 않음**
- 다음 기능 착수 없음 — Codex 검토 대기
