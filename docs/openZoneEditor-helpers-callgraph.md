# `openZoneEditor` Wrap-Helpers Call Graph — 2026-05-17

> [[openZoneEditor-mapping]] 의 wrap들이 호출하는 헬퍼 25개를 grep으로 확인.
> 목적: 각 헬퍼가 **openZoneEditor wrap 외에** 다른 곳에서도 호출되는지 — 즉, wrap만 제거해도 헬퍼는 살려둬야 하는지 판단.

## 분류 기준

- 🟢 **wrap-only** — 정의된 헬퍼가 자신을 부르는 openZoneEditor wrap 외에는 호출처가 없음. wrap 제거 시 헬퍼도 같이 제거 가능.
- 🟡 **다른 곳에서도 호출** — wrap을 제거해도 다른 코드 경로에서 호출되므로 헬퍼는 보존 필요.
- 🔴 **외부 노출** — `window.xxx = ...` 로 글로벌 노출. 운영 핫픽스/콘솔/외부 모듈 호출 가능성 — 정의를 유지해야 함.

## 헬퍼 25개 호출 그래프

| 헬퍼 | 정의 라인 | 다른 호출처 | 상태 | 정리 가능 여부 |
|---|---|---|---|---|
| `installDetailBorder` | 3257 | (없음) | 🟢 | wrap #2 제거 시 같이 삭제 가능 |
| `renameDetailUi` | (외부 정의) | **3779** (`normalizeTemplateCards`), **3783** (`goTab` wrap), **3784** (DOMContentLoaded × 2) | 🟡 | wrap #3 제거 가능 — 단, `renameDetailUi` 자체는 보존 (DOMContentLoaded 등에서 호출) |
| `installSizeControl` | 4508 | (wrap #4 외 없음) | 🟢 | wrap #4 제거 시 같이 삭제 가능 |
| `installDetailMulti` | 6593 | **6660** (`window.dennV38InstallMultiSizeCheckboxes` 내부) | 🟡 | wrap #5 제거 가능 — 단, 외부 노출 함수 `dennV38InstallMultiSizeCheckboxes`가 호출하므로 보존 |
| `syncDetail` (v42) | 7005 | (wrap #6 외 없음) | 🟢 | wrap #6 제거 시 같이 삭제 가능 |
| `syncDetail` (v44, **이름 충돌**) | 7150 | (wrap #7 외 없음) | 🟢 | wrap #7 제거 시 같이 삭제 가능. ⚠️ 같은 이름 두 번 정의 — 둘 다 같은 IIFE 안이므로 7150이 7005를 가린다 |
| `syncDetailCopy` | 7287 | (wrap #8 외 없음) | 🟢 | wrap #8 제거 시 같이 삭제 가능 |
| `hideDetailBorder` | 7545 | (wrap #9 외 없음) | 🟢 | wrap #9 제거 시 같이 삭제 가능 |
| `installDetailSizeSync` | 7624 | (wrap #10 외 없음) | 🟢 | wrap #10 제거 시 같이 삭제 가능 |
| `stabilizeDetail` (v53) | 8089 | **8119** `window.dennV53StabilizeDetailSettings=stabilizeDetail` (외부 노출 alias). **8236**, **10751**, **10755** 에서 `dennV53StabilizeDetailSettings` 호출 | 🔴 | wrap #11 제거 가능 — 하지만 v53의 `stabilizeDetail` 본체는 v54 wrap(8236)과 v84 wrap(10751,10755)이 의존. **본체 유지 필수** |
| `stabilizeDetail` (v54, **재정의**) | 8235 | 자기 wrap (8244, 8245) | 🟢 wrap 내부 한정 | wrap #12 제거 시 같이 삭제. v54 본체는 `dennV53StabilizeDetailSettings`를 부르는 thin wrapper |
| `stabilizeDetail` (v55, **재정의**) | 8384 | **8425** `window.dennV55StabilizeFrameTemplateDetail=stabilizeDetail` (외부 노출) | 🔴 | wrap #13 제거 가능 — alias 노출은 보존 필요 (다른 코드/콘솔에서 호출 가능) |
| `hideLegacyDetail` | 10699 | 같은 IIFE 내 **10737, 10750, 10754, 10762** (모두 v84 내부) | 🟢 | wrap #15 제거 시 IIFE 전체와 함께 삭제 가능 |
| `detailLater` | 10746 | 같은 IIFE 내 wrap 10765 만 | 🟢 | wrap #15 제거 시 함께 삭제 가능 |
| `dennV53StabilizeDetailSettings` | 8119 (alias) | **8236** (v54 stabilizeDetail), **10751, 10755** (v84) | 🔴 | v53 본체와 alias 모두 유지 필수 |
| `drawUnderlay` | 12589 | 같은 IIFE 내 **12611** (`zeRender` wrap) | 🟢 | wrap #17 제거 시 IIFE 전체와 함께 삭제 가능. ⚠️ 단, **zeRender wrap이 동일 IIFE에 같이 있음** — drawUnderlay는 zeRender 통합 작업과 함께 처리해야 함 |
| `ensureTypes` | 11154 | 같은 IIFE 내 **11205, 11237, 11262, 11286** | 🟢 | wrap #16 IIFE 내부 한정 |
| `normalizeZones` | 11195 | 같은 IIFE 내 **11200** (`ensureTypes` 안) | 🟢 | wrap #16 IIFE 내부 한정 |
| `syncEnabledToggle` | 11204 | 같은 IIFE 내 **11219, 11240, 11270** | 🟢 | wrap #16 IIFE 내부 한정 |
| `ensureFields` | 12693 | **18곳** — 같은 IIFE 내 다수 + **12897** `window.DENNDynamicFrameTextFieldsV363={ensureFields, renderButtons}` (외부 노출) | 🔴 | wrap #18 제거 가능 — 단, 외부 노출 alias 보존 필수 |
| `renderButtons` | 12755 | 같은 IIFE + **12897** 외부 노출 + **12989** (wrap #19 v363-parity에서 호출) | 🔴 | 외부 노출 + 다른 wrap 의존 → 보존 필수 |
| `canonicalTemplate` | 12945 | **12962, 12974, 12976, 12987, 12989, 13003** + **13009** `window.DENNFrameTemplateParityAdminV363={canonicalTemplate, ...}` 외부 노출 | 🔴 | wrap #19 자체보다 훨씬 폭넓게 쓰임. 본체 유지 필수 |
| `installGuidePanel` | 13225 | (wrap #20 외 없음) | 🟢 | wrap #20 제거 시 같이 삭제 가능 |
| `drawZeBackground` | 13219 | 같은 IIFE 내 **13314** (`zeRender` wrap) | 🟢 | wrap #20 IIFE 한정. ⚠️ zeRender wrap이 동일 IIFE에 있어 함께 처리 |
| `scheduleGuideOverlay` | 13268 | 같은 IIFE 다수 + **13319** (`setZePreviewZoom` wrap) + **13332** `window.addEventListener('resize', scheduleGuideOverlay)` | 🟡 | wrap #20 제거 가능 — 단, resize 이벤트 리스너와 setZePreviewZoom wrap이 의존 → 본체 유지 필요. **`window.removeEventListener` 도 함께 정리해야 함** |
| `settleSeries` | 13736 | **13745, 13778** (winner wrap + zeRender wrap, 둘 다 동일 IIFE) | 🟢 | winner wrap 통합 시 흡수 |
| `scheduleSettle` | 13732 | **13737, 13763, 13784** (`window.addEventListener('resize', ...)`) | 🟡 | winner IIFE 내 + resize 리스너 의존 → 통합 시 resize 처리 보존 필요. ⚠️ L9425에 v72 빌더용 `scheduleSettle` 동명 함수가 있지만 다른 IIFE라 격리됨 |

## 롤백 함수 4개

| 함수 | 정의 | 다른 호출처 | 상태 |
|---|---|---|---|
| `dennRollbackDetailPreviewGuideV42` | 7016 | (grep 결과 정의 라인만) | 🟢 호출처 없음 → 안전 제거 가능 |
| `dennRollbackTransparentDetailOverlayV44` | 7152 | (정의만) | 🟢 안전 제거 |
| `dennRollbackDesignCanvasOnlyV45` | 7297 | (정의만) | 🟢 안전 제거 |
| `dennRollbackCanonicalSaveDetailV56` | 8662 | (정의만, alert만 띄움) | 🟢 안전 제거 |

⚠️ 콘솔/외부 스크립트에서 호출될 가능성은 grep으로 확인 불가. 운영 절차서나 백업 스크립트에 참조가 없는지는 사용자 판단 필요.

## 핵심 발견

### A. wrap만 깔끔히 떼낼 수 있는 케이스 (8개)
- wrap #2 (installDetailBorder)
- wrap #4 (installSizeControl)
- wrap #6, #7, #8 (syncDetail/syncDetailCopy 계열)
- wrap #9 (hideDetailBorder)
- wrap #10 (installDetailSizeSync)
- wrap #15 (hideLegacyDetail/detailLater — v84 IIFE 전체)

### B. wrap은 제거 가능하나 헬퍼/alias는 보존해야 하는 케이스 (5개)
- wrap #3 → `renameDetailUi` 유지 (goTab, DOMContentLoaded 의존)
- wrap #5 → `installDetailMulti` 유지 (`dennV38InstallMultiSizeCheckboxes` 외부 노출)
- wrap #11 → `stabilizeDetail` v53 본체 + `dennV53StabilizeDetailSettings` alias 유지
- wrap #13 → `stabilizeDetail` v55 본체 + `dennV55StabilizeFrameTemplateDetail` alias 유지
- wrap #18, #19 → `ensureFields/renderButtons/canonicalTemplate` 본체 + `DENNDynamicFrameTextFieldsV363`, `DENNFrameTemplateParityAdminV363` 외부 노출 유지

### C. 다른 wrap과 함께 묶어 통합해야 하는 케이스 (3개)
- wrap #17 (v96) → 동일 IIFE 안에 `zeRender` wrap 동거 → openZoneEditor + zeRender 통합 시 함께 처리
- wrap #20 (v36.4) → 동일 IIFE 안에 `zeRender`, `setZePreviewZoom`, `fbRender`, `fbExport` wrap + 다수 헬퍼 동거 → 매우 큰 단위 통합 필요
- wrap #21 (winner) → 동일 IIFE 안에 `zeRender` wrap + resize 리스너 → settleSeries/scheduleSettle/resize 핸들러 보존

### D. 동명 재정의 (이름 충돌)
- `syncDetail`: v42(7005) vs v44(7150) — IIFE 격리로 충돌 없음
- `stabilizeDetail`: v53(8089) vs v54(8235) vs v55(8384) — 모두 다른 IIFE. **v53만 외부 alias(dennV53StabilizeDetailSettings) 통해 살아있고, v54/v55의 본체는 wrap이 죽으면 같이 죽음**
- `scheduleSettle`: v72-builder(9425) vs current(13732) — 다른 IIFE 격리

### E. 통합 우선순위 제안
1. **1단계 (가장 안전)**: A 그룹 8개 wrap 제거 — 다른 곳에서 헬퍼를 안 쓰므로 wrap+헬퍼 통째로 삭제
2. **2단계**: B 그룹 5개 wrap 제거 — 헬퍼/alias만 남기고 wrap만 떼냄
3. **3단계**: C 그룹 3개 — IIFE 전체를 분해해 본체로 흡수 (가장 큰 작업)

— end —
