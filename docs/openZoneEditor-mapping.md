# `openZoneEditor` Mapping — 2026-05-17

> 이전 hot-functions 분석에서 14개로 집계됐지만, 실제 정의 사이트는 **21곳** 입니다.
> (이전 분석 정규식이 ① 사전-패치 원본 `function openZoneEditor(idx){...}` L1530, 그리고
> ② `window.openZoneEditor = ...` 와 본체 `function(){...}` 가 줄바꿈으로 나뉘어 있는
> 다행(多行) wrap을 놓쳤기 때문입니다. 본 문서는 21곳 모두 수동 확인했습니다.)

## 21개 정의 매핑

| # | 라인 | 블록 ID | 형태 | wrap? | 핵심 동작 |
|---|---|---|---|---|---|
| 1 | 1530 | (사전-패치 원본 body) | `function openZoneEditor(idx)` | ❌ 원본 본체 | `S.frameTemplates[idx]` 검증 → `ZE.tplIdx/zones/ZP` 세팅 → modal `.open` → 이미지 로드 → `zeRender/zeBindEvents/syncZeGridGuideButton/updateZFontSelect/setZT/zeRenderList` 호출 |
| 2 | 3261 | `denn-v18-admin-stability` 부근 (실제 v17/v18 영역) | 1행 wrap | ✅ | post-open `setTimeout(installDetailBorder, 80)` |
| 3 | 3772 | `denn-v27-admin-js` 부근 | 1행 wrap, `__v27` 가드 | ✅ | 호출 전: `frameThickness`/`whiteInnerBorderThickness` 기본값 2 주입. 호출 후 `setTimeout(renameDetailUi, 80)` |
| 4 | 4576-4588 | `denn-v35-detail-size-selector` | 다행 wrap, `__v35SizeSelector` 가드 | ✅ | post-open 160ms: `installSizeControl()` + 이미지 로드 완료 시 `zeBindEvents()` |
| 5 | 6653 | `denn-v38-multi-size-checkbox` | 1행 wrap, `__dennV38MultiSize` 가드 | ✅ | post-open 120ms: `installDetailMulti()` |
| 6 | 7009-7011 | `denn-v42-detail-preview-guide` | 다행 wrap (via `previous` 객체), `__dennV42DetailGuide` 가드, **롤백 함수 동봉** | ✅ | post-open 120ms: `syncDetail()` |
| 7 | 7151 | `denn-v44-transparent-detail-overlay` | 1행 wrap (via `previous`), `__dennV44Overlay` 가드, 롤백 동봉 | ✅ | post-open 140ms: `syncDetail()` |
| 8 | 7293 | `denn-v45-design-canvas-only` | 1행 wrap (via `previous`), `__dennV45DesignCanvas` 가드, 롤백 동봉 | ✅ | post-open 180ms: `syncDetailCopy()` |
| 9 | 7546 | `denn-v49-render-authority-lock` | 1행 wrap, `__dennV49Authority` 가드 | ✅ | post-open [0,120,420]ms: `hideDetailBorder()` |
| 10 | 7694 | `denn-v50-detail-builder-sync` | 1행 wrap, `__dennV50Sync` 가드 | ✅ | post-open [0,80,220,520]ms: `installDetailSizeSync()` + v15 border 숨김 + `zeRender()` |
| 11 | 8095-8104 | `denn-v53-detail-link-stability` | 다행 wrap, `__dennV53DetailStable` 가드 | ✅ | 모달에 `denn-v53-opening` 클래스 추가 → post-open [0,60,140,260]ms `stabilizeDetail()` → 340ms 후 클래스 제거 |
| 12 | 8239-8248 | `denn-v54-size-render-lock` | 다행 wrap, `__dennV54SizeLock` 가드 | ✅ | `denn-v54-opening` 클래스 → [0,90,240,560,720]ms `stabilizeDetail` → 840ms 후 정리 |
| 13 | 8404-8413 | `denn-v55-three-issue-stabilize` | 다행 wrap, `__dennV55ThreeIssue` 가드 | ✅ | `denn-v55-opening` 클래스 → [0,120,320,700]ms `stabilizeDetail` → 980ms `requestAnimationFrame x2` 후 정리 |
| 14 | **8639** | `denn-v56-canonical-save-detail` | **`window.openZoneEditor=function(idx){...}` 신규 본체 (wrap 아님)** | ❌ **완전 재작성** | `prepareDetail(idx)` → `denn-v53/54/55-opening` 클래스 제거 + `denn-v56-preparing` 추가 → `syncZeGridGuideButton/updateZFontSelect/setZT/zeRenderList` 호출 → 이미지 onload 시 `renderSizeCard/zeRender/zeBindEvents` + RAF×2 후 `denn-v56-preparing` 제거하고 `.open` 추가 |
| 15 | 10759-10768 | `denn-v84-white-border-flicker-lock` | 다행 wrap, `__dennV84WhiteBorderFlickerLock` 가드 | ✅ | `hideLegacyDetail()` + `denn-v84-detail-preparing` 클래스 → 원본 호출 → `detailLater()` (내부에서 460ms 후 `dennV53StabilizeDetailSettings` 호출 및 클래스 정리) |
| 16 | 11275-11284 | `denn-v87-name2-textbox-toggle` | 다행 wrap, `__dennV87Name2` 가드 | ✅ | 호출 전: `ensureTypes()` + `normalizeZones()`. post-open [0,80,220]ms: `ensureTypes` + `syncEnabledToggle` + `zeRenderList` |
| 17 | 12616-12623 | `denn-v96-detail-template-image-underlay` | 다행 wrap, `__dennV96DetailTemplateImageUnderlay` 가드 | ✅ | post-open [80,180,360]ms: `drawUnderlay()` |
| 18 | 12876-12887 | `denn-v36-3-dynamic-frame-text-fields-admin` | 다행 wrap, `__dennV363DynamicFields` 가드 | ✅ | post-open [0,100,280]ms: `ensureFields(tpl)` + `renderButtons()` + (activeType 없으면) 첫 필드를 `setZT`로 활성화 + `zeRenderList()` |
| 19 | 12984-12992 | `denn-v36-3-frame-template-parity-admin` | 다행 wrap, `__dennV363Parity` 가드 | ✅ | 호출 전: `canonicalTemplate(tplArr()[idx])`. post-open [0,120,360]ms: 다시 `canonicalTemplate` + `DENNDynamicFrameTextFieldsV363.renderButtons()` |
| 20 | 13307-13310 | `denn-v36-4-frame-template-tools` | 1행 wrap, `__dennV364Guides` 가드 | ✅ | post-open [0,80,220,500]ms: `installGuidePanel()` + `drawZeBackground()` + `scheduleGuideOverlay()` |
| 21 | **13739-13749** | `denn-current-detail-preview-stability` ⭐ **WINNER** | 다행 wrap, `__dennCurrentDetailPreviewStability` 가드 | ✅ | `denn-current-detail-settling` 클래스 추가 → 원본 호출 → `settleSeries()` ([0,32,90,180,360]ms `scheduleSettle`) |

## 최종 winner (#21) 본체 — `denn-admin.html:13739-13749`

```js
var oldOpen=window.openZoneEditor;
if(typeof oldOpen==='function'&&!oldOpen.__dennCurrentDetailPreviewStability){
  var open=function(){
    var m=modal();
    if(m)m.classList.add('denn-current-detail-settling');
    var r=oldOpen.apply(this,arguments);
    settleSeries();
    return r;
  };
  open.__dennCurrentDetailPreviewStability=true;
  window.openZoneEditor=open;
}
```

이 winner는 wrap이므로 **실제 모달 오픈 본체는 `#14` (L8639)** 가 담당하고,
그 위에 `#15~#21` (총 7개 wrap)이 순차적으로 부가 동작을 끼워넣는 구조.

## 통합 시 보존해야 할 분기/시나리오

### A. `#14` (v56) — 본체 보존 필수
| 보존 항목 | 이유 |
|---|---|
| `prepareDetail(idx)` 호출 | `S.frameTemplates` 검증, `canonicalWhite(t)`, `ZE.tplIdx/zones/ZP/canvas/ctx` 초기화 |
| `denn-v53/54/55-opening` 클래스 제거 | wrap #11/#12/#13이 추가한 잔여 클래스 정리 (legacy 호환) |
| `denn-v56-preparing` 클래스 + RAF×2 + `.open` 토글 | 이미지 로드 전 깜빡임 방지 |
| `syncZeGridGuideButton/updateZFontSelect/setZT('main',...)/zeRenderList` | 원본 #1에서 계승 |
| `ZE.img.onerror` → 토스트 + preparing 클래스 정리 | 본체에서만 처리 |

### B. 후속 wrap들의 부가 동작 (살아있음, 통합 시 본체로 흡수해야 함)

| # | 동작 | 통합 위치 제안 |
|---|---|---|
| #15 (v84) | `hideLegacyDetail()` + `denn-v84-detail-preparing` 클래스 + 460ms 후 `dennV53StabilizeDetailSettings` | 본체 진입 직후 + `img.onload` 끝나면 460ms 후 |
| #16 (v87) | `ensureTypes()` + `normalizeZones()` 사전 → [0,80,220]ms 후 동일 + `zeRenderList` | `prepareDetail` 호출 전 + `img.onload` 내 |
| #17 (v96) | [80,180,360]ms 후 `drawUnderlay()` | `img.onload` 내 RAF 안 |
| #18 (v36.3 fields) | `ensureFields` + `renderButtons` + 빈 activeType 보정 + `zeRenderList` | 본체 안 `setZT` 호출 직전 |
| #19 (v36.3 parity) | 사전/사후 `canonicalTemplate` + `DENNDynamicFrameTextFieldsV363.renderButtons` | `prepareDetail` 내부로 흡수 가능 |
| #20 (v36.4 guides) | [0,80,220,500]ms 후 `installGuidePanel` + `drawZeBackground` + `scheduleGuideOverlay` | `img.onload` 내 |
| #21 (current, winner) | `denn-current-detail-settling` 클래스 + `settleSeries` ([0,32,90,180,360]ms) | `img.onload` 끝 / 본체 return 직전 |

### C. 롤백 함수 (3개)
- `dennRollbackDetailPreviewGuideV42` (L7016)
- `dennRollbackTransparentDetailOverlayV44` (L7152)
- `dennRollbackDesignCanvasOnlyV45` (L7297)
- `dennRollbackCanonicalSaveDetailV56` (L8662) — *이미 무력화: "backup 파일로 롤백하세요" alert만 띄움*

→ 통합 시 위 4개는 더 이상 의미 없음. 제거 가능. 단 다른 곳에서 호출되지 않는지 grep 필요.

## 안전하게 제거 가능한 정의

`#14` (L8639) 가 본체를 완전 재작성하면서, **#1~#13** 의 본체와 wrap 동작은 모두 무효화됨.
근거: `#14` 는 `oldOpen.apply(...)` 호출 없이 자체 본체로 시작 — 이전 체인이 끊어짐.

| # | 라인 | 블록 ID | 무효화 이유 |
|---|---|---|---|
| 1 | 1530 | (원본) | `#14` 가 본체 자체를 재작성. ZE 상태 세팅 로직은 `#14` 의 `prepareDetail`에 흡수됨 |
| 2 | 3261 | v17/v18 | `installDetailBorder` post-hook 의미 상실 (v50 #10에서 v15-border 자체를 숨김) |
| 3 | 3772 | v27 | `frameThickness`/`whiteInnerBorderThickness` 기본값 주입 — `canonicalWhite(t)` (`#14`에서 호출) 가 동일 책임 가능성 높음 → **확인 필요** |
| 4 | 4588 | v35 detail-size-selector | `installSizeControl` — `#14` 의 `renderSizeCard` 가 대체 가능성 → **확인 필요** |
| 5 | 6653 | v38 | `installDetailMulti` post-hook — 본체 `setZT('main',...)` + `zeRenderList`로 대체됐는지 **확인 필요** |
| 6 | 7011 | v42 | `syncDetail` — v53~v55 stabilizer가 동일 책임 |
| 7 | 7151 | v44 | 동상 |
| 8 | 7293 | v45 | 동상 |
| 9 | 7546 | v49 | `hideDetailBorder` — v50/v53 stabilizer로 대체 |
| 10 | 7694 | v50 | `installDetailSizeSync` + v15 border 숨김 — v53 stabilizer로 대체 |
| 11 | 8097 | v53 | `denn-v53-opening` 클래스 — `#14`가 명시적으로 제거함. wrap 자체가 무효 |
| 12 | 8241 | v54 | 동일 (`denn-v54-opening` 제거됨) |
| 13 | 8406 | v55 | 동일 (`denn-v55-opening` 제거됨) |

**총 13개 정의가 안전하게 제거 가능한 후보** (수정 시 `#14` 본체와 비교 검증 필수).

## 회색지대 — 통합 전 추가 확인 항목

1. `installDetailBorder`, `installSizeControl`, `installDetailMulti`, `syncDetail`, `syncDetailCopy`, `hideDetailBorder`, `installDetailSizeSync`, `stabilizeDetail`, `hideLegacyDetail`, `detailLater` 등 wrap 내부 헬퍼들이 **다른 코드 경로에서 호출되는지** grep 필요. openZoneEditor wrap만 제거해도 헬퍼 자체는 살아있을 수 있음.
2. `#14` (L8639) 가 호출하는 `prepareDetail`, `renderSizeCard`, `detailImageSrc`, `canonicalWhite` — winner 시점에 정의돼 있는지 (선언 순서) 확인.
3. `goTab` 등 다른 핫함수 wrap이 openZoneEditor 결과에 의존하는지.
4. 롤백 함수 (`dennRollbackDetailPreviewGuideV42` 등)가 외부 호출자에게 노출돼 있는지 (운영 핫픽스용 alias 가능성).

— end of mapping —
