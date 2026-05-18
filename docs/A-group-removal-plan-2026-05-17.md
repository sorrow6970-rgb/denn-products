# A 그룹 8개 wrap 제거 설계 — 2026-05-17

> [[A-group-verification-2026-05-17]] 에서 안전 확정된 8개 wrap의 실제 제거 설계.
> 모든 라인 번호는 `denn-admin.html` 기준. 본 문서 작성 시점에 직접 Read로 재확인 완료.

## 한눈에 — 제거 패턴 분류

| 패턴 | 케이스 | 설명 |
|---|---|---|
| **L-단순** (Line-level) | #2, #6, #7, #9 | IIFE는 보존, 헬퍼 + wrap 라인만 떼냄 |
| **L-롤백포함** | #7, #8 | L-단순 + 롤백 함수 1줄 삭제 |
| **B-제한분해** (Block-partial) | #4, #8, #10 | IIFE 내부에서 헬퍼 + wrap만 제거. IIFE 자체와 다른 wrap은 보존 |
| **B-위험** | #10 | 헬퍼 제거 시 같은 IIFE 내 save-wrap이 의존하는 DOM이 사라짐 — 흡수 작업 필요 |
| **B-IIFE혼재** | #15 | IIFE 안에 다른 wrap (goTab, initFrameBuilder) 동거. openZoneEditor 분만 외과적 제거 |

## wrap #2 — `installDetailBorder` (v15/v18 영역)

- **제거 라인**: `denn-admin.html:3257`, `denn-admin.html:3261`
- **패턴**: L-단순
- **IIFE 범위**: 약 3240~3272. **IIFE는 보존** (clock cleanup, fbRender wrap, renderFTplsByCategory wrap 등 무관한 코드가 함께 들어있음)
- **제거 대상**:
  - `L3257` `function installDetailBorder(){...}` (1줄)
  - `L3261` `var oldOpen=window.openZoneEditor;...` (1줄)
- **부수 영향**: 없음. `installDetailBorder` 는 `denn-v15-detail-border` 요소를 제거하는 1줄짜리 헬퍼. wrap #15(v84)의 `hideLegacyDetail` 이 이미 같은 요소를 visibility/display 모두 차단함.
- **검증 후 확인 1건**: `denn-v15-detail-border` DOM 요소가 winner(L8639 v56)에서도 hidden 상태로 유지되는지 1회 육안 확인 권장.

## wrap #4 — `installSizeControl` (v35 detail-size-selector)

- **제거 라인**: `denn-admin.html:4508-4513` (헬퍼) + `denn-admin.html:4576-4589` (wrap)
- **패턴**: B-제한분해
- **IIFE 범위**: 4400대 ~ 4605 (`denn-v35-detail-size-selector` 스크립트 IIFE)
- **제거 대상**:
  - `L4508-4513` `function installSizeControl(){...}` (6줄)
  - `L4576-4589` `var oldOpen=window.openZoneEditor; if(typeof oldOpen==='function'&&!oldOpen.__v35SizeSelector){...} window.openZoneEditor=wrappedOpen; }` (14줄)
- **보존 대상**: 같은 IIFE의 `clearSizeTarget`, `applySizeSelection`, `currentSizeInfo`, `coverRect`, `resizeDetailCanvasToSize`, `renderDetail`, `oldZeBindEvents` wrap, `window.zeRender=renderDetail` (L4590), `saveSelectedSize`, `saveZones`/`saveZonesOnly` wrap — 모두 다른 책임 영역.
- **부수 영향**: `installSizeControl` 은 `#denn-v35-ze-size-card`, `#denn-v38-ze-size-card` 카드 중복 제거가 책임. v50 (#10) wrap의 `installDetailSizeSync` (L7624) 가 같은 카드들 + `denn-v50-ze-size-card` 까지 모두 정리 → **v50이 이미 동일 책임을 흡수**. 단, #10도 제거 대상이므로 winner(L8639) 본체가 이 청소 책임을 지는지 확인 필요.
- **확인 항목**: winner 본체가 `denn-v50-ze-size-card` 또는 동등한 사이즈 카드를 생성/유지하는지 — 아니라면 winner에 흡수 필요. (3단계 작업)

## wrap #6 — `syncDetail` v42 (denn-v42-detail-preview-guide)

- **제거 라인**: `denn-admin.html:7005-7008` (헬퍼) + `denn-admin.html:7009-7012` (wrap) + `denn-admin.html:7016` (롤백)
- **패턴**: L-롤백포함
- **IIFE 범위**: 약 6990 ~ 7017 (`denn-v42-detail-preview-guide` 스크립트)
- **제거 대상**:
  - `L7005-7008` `function syncDetail(){syncWhitePanel();renderRatioNote(); var box=by('denn-v38-ze-size-checks');if(box&&!box.__dennV42RatioBind){...}}` (4줄)
  - `L7009-7012` `if(typeof previous.openZoneEditor==='function'&&!previous.openZoneEditor.__dennV42DetailGuide){ var open=function(){...}; open.__dennV42DetailGuide=true; window.openZoneEditor=open; }` (4줄)
  - `L7016` `window.dennRollbackDetailPreviewGuideV42=function(){...};` (1줄) — 외부 호출처 없음 확정 (verification §검증 결과 0건)
- **보존 대상**: 같은 IIFE의 `window.zeRender=function(){...}` (L6995-7004), `beforeSave`/`wrapSave` 헬퍼 (L7013-7014), `wrapSave('saveZones',...)` (L7015) — zeRender 와 save 책임은 다른 통합 단계에서 처리.
- **부수 영향**: `__dennV42RatioBind` 플래그가 box에 부착됨 — DOM 노드가 사라지면 자동 정리. `syncWhitePanel`, `renderRatioNote` 는 IIFE 내 다른 곳에서 호출되므로 보존.

## wrap #7 — `syncDetail` v44 (denn-v44-transparent-detail-overlay)

- **제거 라인**: `denn-admin.html:7150` (헬퍼) + `denn-admin.html:7151` (wrap) + `denn-admin.html:7152` (롤백)
- **패턴**: L-롤백포함
- **IIFE 범위**: 7024 ~ 7153 (`denn-v44-transparent-detail-overlay` 스크립트)
- **제거 대상**:
  - `L7150` `function syncDetail(){syncWhitePanel();renderRatioNote()}` (1줄)
  - `L7151` `if(typeof previous.openZoneEditor==='function'&&!previous.openZoneEditor.__dennV44Overlay){var open=function(){var r=previous.openZoneEditor.apply(this,arguments);setTimeout(syncDetail,140);return r};open.__dennV44Overlay=true;window.openZoneEditor=open}` (1줄)
  - `L7152` `window.dennRollbackTransparentDetailOverlayV44=function(){...};` (1줄)
- **보존 대상**: 같은 IIFE의 `window.zeRender=...`, `window.saveZones=function(){return saveDetail(true)}`, `window.saveZonesOnly=function(){return saveDetail(false)}` (L7148-7149), `saveDetail`/`writeTargets`/`syncWhitePanel`/`syncSizeCanvas`/`renderRatioNote` 등 헬퍼 다수 — 모두 zeRender/save 책임이라 별도 통합.
- **이름 충돌 처리**: v42 의 `syncDetail` (L7005) 와 동명. **다른 IIFE라 격리됨**. v42, v44 둘 다 제거하면 충돌 자체가 사라짐.

## wrap #8 — `syncDetailCopy` (denn-v45-design-canvas-only)

- **제거 라인**: `denn-admin.html:7287-7292` (헬퍼) + `denn-admin.html:7293` (wrap) + `denn-admin.html:7297` (롤백)
- **패턴**: B-제한분해 + L-롤백포함
- **IIFE 범위**: 7162 ~ 7298 (`denn-v45-design-canvas-only` 스크립트)
- **제거 대상**:
  - `L7287-7292` `function syncDetailCopy(){...}` (6줄)
  - `L7293` `if(typeof previous.openZoneEditor==='function'&&!previous.openZoneEditor.__dennV45DesignCanvas){var open=function(){...};open.__dennV45DesignCanvas=true;window.openZoneEditor=open}` (1줄)
  - `L7297` `window.dennRollbackDesignCanvasOnlyV45=function(){...};` (1줄)
- **보존 대상** (같은 IIFE이지만 책임 다름):
  - `L7280-7283` `drawWhiteGuide` (zeRender 가 호출)
  - `L7284-7286` `window.zeRender=function(){...}` (zeRender 책임)
  - `L7294` `var oldGo=window.goTab;...if(id==='frame-builder')[120,360,900].forEach(...)` — **goTab wrap, 빌더 UI 정리 책임**, openZoneEditor 와 무관
  - `L7295-7296` DOMContentLoaded / load 핸들러 — `hideBuilderFrameUi` 호출, 빌더 책임

## wrap #9 — `hideDetailBorder` (denn-v49-render-authority-lock)

- **제거 라인**: `denn-admin.html:7545` (헬퍼) + `denn-admin.html:7546` (wrap)
- **패턴**: L-단순
- **IIFE 범위**: 약 7480 ~ 7552 (`denn-v49-render-authority-lock` 스크립트)
- **제거 대상**:
  - `L7545` `function hideDetailBorder(){var p=by('denn-v15-detail-border');if(p)p.style.display='none'}` (1줄)
  - `L7546` `var oldOpen=window.openZoneEditor;if(typeof oldOpen==='function'&&!oldOpen.__dennV49Authority){window.openZoneEditor=function(){var r=oldOpen.apply(this,arguments);[0,120,420].forEach(function(ms){setTimeout(hideDetailBorder,ms)});return r};window.openZoneEditor.__dennV49Authority=true}` (1줄)
- **보존 대상**: 같은 IIFE의 `window.fbRender=...` (L7543), `window.fbExport=...` (L7544), `oldGo` goTab wrap (L7547), DOMContentLoaded / load 핸들러 (L7548-7550), `dennRollbackRenderAuthorityLockV49` (L7551) — **모두 빌더 책임이라 별도 작업**.
- **롤백 함수**: L7551 은 builder 책임에 묶여있고 alert만 띄움 — 본 1단계에서는 보존.

## wrap #10 — `installDetailSizeSync` (denn-v50-detail-builder-sync) ⚠️ B-위험

- **제거 라인**: `denn-admin.html:7624-7634` (헬퍼) + `denn-admin.html:7694` (wrap)
- **패턴**: B-위험 (헬퍼 제거 시 같은 IIFE 내 save-wrap이 의존하는 DOM 사라짐)
- **IIFE 범위**: 7566 ~ 7702 (`denn-v50-detail-builder-sync` 스크립트)
- **제거 대상**:
  - `L7624-7634` `function installDetailSizeSync(){...}` (11줄) — `denn-v50-ze-size-card` 생성 + `denn-v38-ze-size-checks` 체크박스 렌더
  - `L7694` `var oldOpen=window.openZoneEditor;if(...){window.openZoneEditor=function(){var r=oldOpen.apply(this,arguments);[0,80,220,520].forEach(function(ms){setTimeout(function(){installDetailSizeSync();var p=by('denn-v15-detail-border');if(p)p.style.display='none';try{window.zeRender&&zeRender()}catch(e){}},ms)});return r};window.openZoneEditor.__dennV50Sync=true}` (1줄)
- **보존 대상**: 같은 IIFE의 `selectedDetailVals` (L7635), `saveZones`/`saveZonesOnly` wrap (L7695), `fbExport` wrap (L7696), `goTab` wrap (L7697), DOMContentLoaded / load 핸들러 (L7698-7700), `dennRollbackDetailBuilderSyncV50` (L7701).
- **⚠️ 잠재 회귀**:
  - `selectedDetailVals` (L7635) → `readChecks('denn-v38-ze-size-checks')` 호출.
  - 이 DOM 요소(`#denn-v38-ze-size-checks`)는 `installDetailSizeSync` 가 생성. wrap 제거 시 winner(L8639 v56) 본체가 같은 ID를 만들지 않으면 `selectedDetailVals` 는 항상 `targetValues(tpl())` fallback 으로 동작 → 사용자가 detail-modal에서 사이즈 체크박스를 바꿔도 save-wrap이 못 읽음 → **저장 시 변경 누락**.
  - winner 본체 (L8639 v56) 또는 후속 wrap (#16 v87, #18 v363) 이 `denn-v38-ze-size-checks` DOM을 만드는지 사전 확인 필수.
  - wrap #10의 wrap 내 부수동작: `denn-v15-detail-border` 숨김 → wrap #9, #15 가 이미 처리 → 중복.
  - wrap #10의 wrap 내 `zeRender()` 호출 → 이미 winner 본체가 image onload 후 zeRender 호출 → 중복.
- **권장 처리 순서**: wrap #10은 A 그룹 마지막에 처리. `denn-v38-ze-size-checks` DOM 생성 책임을 winner 본체에서 한 번 더 확인한 후 제거.

## wrap #15 — `hideLegacyDetail` / `detailLater` (denn-v84-white-border-flicker-lock) ⚠️ B-IIFE혼재

- **제거 라인**: `denn-admin.html:10746-10758` (detailLater 헬퍼) + `denn-admin.html:10759-10769` (openZoneEditor wrap)
- **패턴**: B-IIFE혼재 (IIFE 안에 builder 책임 wrap들이 동거)
- **IIFE 범위**: 10693 ~ 10792 (`denn-v84-white-border-flicker-lock` 스크립트)
- **제거 대상**:
  - `L10746-10758` `function detailLater(){...}` (13줄) — detail-modal 전용
  - `L10759-10769` `var oldOpen=window.openZoneEditor; if(typeof oldOpen==='function'&&!oldOpen.__dennV84WhiteBorderFlickerLock){window.openZoneEditor=function(){hideLegacyDetail();var modal=by('ze-modal');if(modal)modal.classList.add('denn-v84-detail-preparing');var r=oldOpen.apply(this,arguments);detailLater();return r}; window.openZoneEditor.__dennV84WhiteBorderFlickerLock=true;}` (11줄)
- **보존 대상**:
  - `L10699-10711` `function hideLegacyDetail()` — settleAll/later/goTab wrap/initFrameBuilder wrap이 호출. **detail-modal과 무관해 보이지만 builder context에서도 호출됨**. 본체 유지 필수.
  - `L10712-10735` `settleBuilderWhite` — builder 책임
  - `L10736-10739` `settleAll`, `L10740-10745` `later` — builder 책임
  - `L10770-10779` `var oldGo=window.goTab;...` — goTab wrap (builder 책임)
  - `L10780-10789` `var oldInit=window.initFrameBuilder;...` — initFrameBuilder wrap
  - `L10790-10791` DOMContentLoaded 핸들러
- **CSS 동반 제거 후보**:
  - `L10685-10691` `#ze-modal.denn-v84-detail-preparing #ze-canvas, ... { ... }` — detailLater에서만 토글하던 클래스. **헬퍼와 wrap 제거 시 이 CSS 룰도 사용처 없어짐** → CSS 블록도 함께 제거 가능. 단, CSS 블록 안에 다른 셀렉터가 섞여있으면 분리 필요 — 사전 확인.

## 제거 권장 순서 (1단계 안에서)

| 순번 | wrap # | 패턴 | 사전 확인 사항 |
|---|---|---|---|
| 1 | #6 | L-롤백포함 | 없음 — 가장 깔끔 |
| 2 | #7 | L-롤백포함 | 없음 |
| 3 | #2 | L-단순 | 없음 |
| 4 | #9 | L-단순 | 없음 |
| 5 | #8 | B-제한분해 | goTab wrap (L7294) 와 hideBuilderFrameUi 호출처는 보존 — 라인만 정확히 떼기 |
| 6 | #4 | B-제한분해 | `denn-v50-ze-size-card` (v50의 책임) 가 winner 본체에서 살아남는지 1회 확인 |
| 7 | #15 | B-IIFE혼재 | 1) `hideLegacyDetail` 본체 보존 확인 (settleAll/later 의존). 2) CSS `denn-v84-detail-preparing` 셀렉터 블록 별도 분리 가능 여부 |
| 8 | #10 | B-위험 | winner 본체 + 후속 wrap에서 `denn-v38-ze-size-checks` DOM 생성 여부 사전 확인. **없다면 winner 본체에 흡수해야 안전** — 본 1단계가 아닌 2~3단계로 미루는 것도 옵션 |

## 본 1단계 작업의 누적 효과 (예상)

- 제거 라인 총합: 대략 **78줄** (헬퍼 + wrap + 롤백 4개)
- 영향받는 함수: `openZoneEditor` 정의 21개 → 13개로 감소 (#2, #4, #6, #7, #8, #9, #10, #15 wrap 8개 제거)
- 무관한 IIFE 코드는 모두 보존 — 빌더/사이즈/저장 책임 무손상
- `dennRollbackDetailPreviewGuideV42`, `dennRollbackTransparentDetailOverlayV44`, `dennRollbackDesignCanvasOnlyV45` 세 롤백 함수 제거 (외부 호출처 0건 검증 완료)

## 다음 단계 (별도 작업)

- **2단계 (B 그룹)**: wrap #3, #5, #11, #13, #18, #19 — 헬퍼/alias 유지하고 wrap만 제거
- **3단계 (C 그룹)**: wrap #17, #20, #21 — IIFE 분해 + zeRender / setZePreviewZoom / fbRender 등과 묶음 통합. 본체(L8639 v56) 와 winner(L13739) 통합도 함께.

— end —
