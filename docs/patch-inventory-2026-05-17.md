# Patch Inventory — denn-admin.html (2026-05-17)

- Source: `denn-admin.html` (13788 lines)
- Blocks analyzed: **179**
- JS function names tracked: 910  |  CSS selectors tracked: 473
- Function overrides found (dead defs): 1021
- CSS selector overrides found: 41

> Method: for each `<script id='denn-...'>` and `<style id='denn-...'>` block, 
> extract definitions (function/window.x/const x = ...) or CSS selectors. 
> The **last** definition by line number wins; earlier ones are dead-code candidates. 
> Side-effect-only blocks (event listeners, IIFE, observers) cannot be judged statically and 
> are listed as **gray zone**. No HTML was modified.

## Block status summary

| Status | Count | Meaning |
|---|---|---|
| alive | 54 | every definition in block is the final winner |
| dead | 0 | every definition overridden by a later block |
| mixed | 125 | some defs win, some lose — needs review |
| side-effect | 0 | no top-level defs detected (IIFE/listeners) — can't judge statically |
| TOTAL | 179 | — |

## Per-area block stats

| Area | Blocks | Alive | Dead | Mixed | Side-effect |
|---|---|---|---|---|---|
| final | 2 | 1 | 0 | 1 | 0 |
| current | 4 | 3 | 0 | 1 | 0 |
| v10 | 2 | 1 | 0 | 1 | 0 |
| v11 | 2 | 0 | 0 | 2 | 0 |
| v12 | 2 | 0 | 0 | 2 | 0 |
| v13 | 2 | 1 | 0 | 1 | 0 |
| v14 | 2 | 0 | 0 | 2 | 0 |
| v16 | 2 | 0 | 0 | 2 | 0 |
| v17 | 2 | 1 | 0 | 1 | 0 |
| v18 | 2 | 0 | 0 | 2 | 0 |
| v19 | 2 | 1 | 0 | 1 | 0 |
| v20 | 2 | 1 | 0 | 1 | 0 |
| v21 | 1 | 0 | 0 | 1 | 0 |
| v22 | 2 | 1 | 0 | 1 | 0 |
| v23 | 2 | 1 | 0 | 1 | 0 |
| v24 | 1 | 0 | 0 | 1 | 0 |
| v25 | 1 | 0 | 0 | 1 | 0 |
| v26 | 2 | 1 | 0 | 1 | 0 |
| v27 | 2 | 0 | 0 | 2 | 0 |
| v29 | 2 | 1 | 0 | 1 | 0 |
| v32 | 2 | 0 | 0 | 2 | 0 |
| v33 | 3 | 1 | 0 | 2 | 0 |
| v34 | 2 | 0 | 0 | 2 | 0 |
| v35 | 28 | 10 | 0 | 18 | 0 |
| v36 | 7 | 4 | 0 | 3 | 0 |
| v36-3 | 3 | 1 | 0 | 2 | 0 |
| v36-4 | 2 | 0 | 0 | 2 | 0 |
| v36-5 | 2 | 0 | 0 | 2 | 0 |
| v37 | 1 | 0 | 0 | 1 | 0 |
| v38 | 2 | 1 | 0 | 1 | 0 |
| v39 | 2 | 1 | 0 | 1 | 0 |
| v40 | 2 | 1 | 0 | 1 | 0 |
| v41 | 2 | 0 | 0 | 2 | 0 |
| v42 | 2 | 1 | 0 | 1 | 0 |
| v44 | 2 | 1 | 0 | 1 | 0 |
| v45 | 2 | 0 | 0 | 2 | 0 |
| v46 | 1 | 0 | 0 | 1 | 0 |
| v48 | 2 | 1 | 0 | 1 | 0 |
| v49 | 2 | 0 | 0 | 2 | 0 |
| v5 | 2 | 0 | 0 | 2 | 0 |
| v50 | 2 | 0 | 0 | 2 | 0 |
| v51 | 2 | 0 | 0 | 2 | 0 |
| v52 | 2 | 1 | 0 | 1 | 0 |
| v53 | 2 | 1 | 0 | 1 | 0 |
| v54 | 2 | 1 | 0 | 1 | 0 |
| v55 | 2 | 0 | 0 | 2 | 0 |
| v56 | 2 | 0 | 0 | 2 | 0 |
| v59 | 1 | 0 | 0 | 1 | 0 |
| v6 | 2 | 1 | 0 | 1 | 0 |
| v61 | 1 | 0 | 0 | 1 | 0 |
| v66 | 1 | 0 | 0 | 1 | 0 |
| v67 | 1 | 1 | 0 | 0 | 0 |
| v68 | 2 | 1 | 0 | 1 | 0 |
| v69 | 1 | 0 | 0 | 1 | 0 |
| v70 | 2 | 1 | 0 | 1 | 0 |
| v71 | 2 | 1 | 0 | 1 | 0 |
| v72 | 2 | 0 | 0 | 2 | 0 |
| v73 | 2 | 0 | 0 | 2 | 0 |
| v74 | 2 | 1 | 0 | 1 | 0 |
| v75 | 1 | 0 | 0 | 1 | 0 |
| v76 | 1 | 0 | 0 | 1 | 0 |
| v77 | 2 | 1 | 0 | 1 | 0 |
| v78 | 2 | 1 | 0 | 1 | 0 |
| v79 | 5 | 2 | 0 | 3 | 0 |
| v80 | 2 | 0 | 0 | 2 | 0 |
| v81 | 1 | 0 | 0 | 1 | 0 |
| v82 | 1 | 0 | 0 | 1 | 0 |
| v83 | 2 | 1 | 0 | 1 | 0 |
| v84 | 2 | 1 | 0 | 1 | 0 |
| v85 | 2 | 0 | 0 | 2 | 0 |
| v86 | 2 | 1 | 0 | 1 | 0 |
| v87 | 2 | 1 | 0 | 1 | 0 |
| v88 | 1 | 0 | 0 | 1 | 0 |
| v89 | 2 | 0 | 0 | 2 | 0 |
| v91 | 1 | 0 | 0 | 1 | 0 |
| v93 | 2 | 0 | 0 | 2 | 0 |
| v94 | 2 | 1 | 0 | 1 | 0 |
| v95 | 2 | 1 | 0 | 1 | 0 |
| v96 | 1 | 0 | 0 | 1 | 0 |

## Final authority — winning function definitions

All 910 function names with their final definition line and block.

| Function | Line | Block ID | Kind |
|---|---|---|---|
| `$` | 2737 | denn-final-js | func |
| `B` | 3116 | denn-v13-admin-js | var |
| `K` | 12322 | denn-v36-admin-korean-label-fix | func |
| `actionKey` | 13489 | denn-v36-5-order-actions-singleflight-admin | func |
| `active` | 13375 | denn-v36-5-admin-render-stability | var |
| `activeBuilderInfo` | 8785 | denn-v61-frame-template-save-authority | func |
| `activeBuilderInfoNoTargetFallback` | 8779 | denn-v61-frame-template-save-authority | func |
| `activeBuilderKey` | 8325 | denn-v55-three-issue-stabilize | func |
| `activeField` | 12751 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `activeFrameCat` | 4198 | denn-v34-admin-frame-upload-stable | func |
| `activeIdx` | 9092 | denn-v69-initial-size-toggle-sync | func |
| `activeIndex` | 10510 | denn-v82-frame-builder-clock-toggle-authority | func |
| `activeInfo` | 10261 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `activeSize` | 6786 | denn-v40-builder-render-rules | func |
| `activeZone` | 11198 | denn-v87-name2-textbox-toggle | func |
| `addAlign` | 2740 | denn-final-js | func |
| `addBuilderWhiteThickness` | 2981 | denn-v11-admin-js | func |
| `addBuilderWhiteToggle` | 2924 | denn-v10-safe-js | func |
| `addCardWhiteThickness` | 2984 | denn-v11-admin-js | func |
| `addCheck` | 4127 | denn-v33-admin-stable | func |
| `addClockTools` | 3023 | denn-v12-admin-js | func |
| `addFTpls` | 4226 | denn-v34-admin-frame-upload-stable | window |
| `addField` | 12931 | denn-v36-3-frame-template-parity-admin | func |
| `addFrameControls` | 2786 | denn-v5-ui-settings-script | func |
| `addNewField` | 12778 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `addNum` | 4126 | denn-v33-admin-stable | func |
| `addPreviewScaleUI` | 3205 | denn-v14-admin-js | func |
| `addSnapshot` | 5680 | denn-v35-admin-data-safety-final | func |
| `addSz` | 7492 | denn-v48-final-size-stability | window |
| `addSzV33` | 4167 | denn-v33-admin-finalize | window |
| `addVals` | 8685 | denn-v59-builder-capture-union | func |
| `afterLoad` | 2783 | denn-v5-ui-settings-script | func |
| `afterRender` | 6838 | denn-v40-builder-render-rules | func |
| `afterSave` | 6458 | denn-v37-size-save-controller-final | func |
| `allById` | 13605 | denn-current-admin-stability-sweep | func |
| `allValue` | 13060 | denn-v36-4-frame-template-tools | func |
| `annotate` | 6435 | denn-v37-size-save-controller-final | func |
| `annotateBadges` | 5823 | denn-v35-admin-data-safety-final | func |
| `annotateCards` | 6647 | denn-v38-multi-size-checkbox | func |
| `annotateClockBadges` | 5398 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `annotateFrameBadges` | 6261 | denn-v36-size-frame-enabled-admin-final | func |
| `apply` | 13212 | denn-v36-4-frame-template-tools | func |
| `applyBgToSaved` | 13209 | denn-v36-4-frame-template-tools | func |
| `applyBuilderClockFromSize` | 4746 | denn-v35-frame-builder-size-clock-sync | func |
| `applyBuilderTargets` | 6635 | denn-v38-multi-size-checkbox | func |
| `applyBulk` | 11639 | denn-v93-frame-template-bulk-category | func |
| `applyCanvasBox` | 9337 | denn-v71-frame-builder-preview-stability | func |
| `applyCanvasCss` | 13699 | denn-current-detail-preview-stability | func |
| `applyClockPreset` | 10298 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `applyClockStateToSize` | 5805 | denn-v35-admin-data-safety-final | func |
| `applyDetailedUICustom` | 2778 | denn-v5-ui-settings-script | window |
| `applyFBDefaults` | 2791 | denn-v5-ui-settings-script | func |
| `applyLabels` | 4331 | denn-v35-size-input-height-width-final | func |
| `applyPreviewDefaultsToGlobal` | 3127 | denn-v13-admin-js | func |
| `applySize` | 5346 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `applySizeSelection` | 4495 | denn-v35-detail-size-selector | func |
| `applySizeToForm` | 4058 | denn-v33-admin-stable | func |
| `applyTargetChecks` | 11834 | denn-v94-frame-template-edit-mode | func |
| `applyTemplateFilters` | 13137 | denn-v36-4-frame-template-tools | func |
| `applyThumbGuide` | 3656 | denn-v22-admin-js | func |
| `applyThumbRatio` | 10943 | denn-v85-frame-template-card-layout-lock | func |
| `applyToAdminPreview` | 9729 | denn-v76-ui-settings-save-authority | func |
| `applyZoomCss` | 11361 | denn-v89-ze-scroll-render-stability | func |
| `ar` | 3057 | denn-v13-admin-js | var |
| `arr` | 13051 | denn-v36-4-frame-template-tools | func |
| `arrangeActions` | 3801 | denn-v29-admin-js | func |
| `assignCards` | 11605 | denn-v93-frame-template-bulk-category | func |
| `autoCleanSavedClock` | 3026 | denn-v12-admin-js | func |
| `base` | 12780 | denn-v36-3-dynamic-frame-text-fields-admin | var |
| `before` | 2948 | denn-v10-safe-js | var |
| `beforeSave` | 7013 | denn-v42-detail-preview-guide | func |
| `bestNode` | 8717 | denn-v59-builder-capture-union | func |
| `bg` | 9355 | denn-v71-frame-builder-preview-stability | var |
| `bgColorValue` | 13156 | denn-v36-4-frame-template-tools | func |
| `bgEnabled` | 13155 | denn-v36-4-frame-template-tools | func |
| `bgId` | 5230 | denn-v35-guide-bg-detail-modal-final | func |
| `bgKey` | 5573 | denn-v35-guide-bg-card-ui-polish | func |
| `bgLike` | 3367 | denn-v17-admin-js | func |
| `bind` | 10173 | denn-v79d-common-default-open-authority | func |
| `bindBuilderSizeClock` | 4770 | denn-v35-frame-builder-size-clock-sync | func |
| `bindGrid` | 11654 | denn-v93-frame-template-bulk-category | func |
| `bindList` | 5445 | denn-v35-clock-onoff-selection-sync-final | func |
| `bindPair` | 9742 | denn-v76-ui-settings-save-authority | func |
| `bindRemove` | 5164 | denn-v35-mockup-remove-click-fix | func |
| `bindSizeClick` | 5029 | denn-v35-size-clock-onoff-final | func |
| `bindSizeSync` | 3698 | denn-v23-admin-js | func |
| `bindSnap` | 2743 | denn-final-js | func |
| `bindWatermarkPreview` | 5993 | denn-v35-watermark-live-preview-final | func |
| `boot` | 13328 | denn-v36-4-frame-template-tools | func |
| `borderState` | 8354 | denn-v55-three-issue-stabilize | func |
| `buildCatTabs` | 9225 | denn-v70-hide-builtin-frame-templates | window |
| `buildPanel` | 3207 | denn-v14-admin-js | window |
| `builderActiveKey` | 6611 | denn-v38-multi-size-checkbox | func |
| `builderBg` | 13162 | denn-v36-4-frame-template-tools | func |
| `builderBgColor` | 13160 | denn-v36-4-frame-template-tools | func |
| `builderBgEnabled` | 13159 | denn-v36-4-frame-template-tools | func |
| `builderBgState` | 13161 | denn-v36-4-frame-template-tools | func |
| `builderBgToggle` | 13158 | denn-v36-4-frame-template-tools | func |
| `builderInitialVals` | 6617 | denn-v38-multi-size-checkbox | func |
| `builderTargets` | 8112 | denn-v53-detail-link-stability | func |
| `builderWhite` | 8518 | denn-v56-canonical-save-detail | func |
| `builderWhiteState` | 6050 | denn-v35-frame-builder-clean-export-final | func |
| `buttonOn` | 7364 | denn-v48-final-size-stability | func |
| `bwPx` | 7104 | denn-v44-transparent-detail-overlay | var |
| `by` | 13686 | denn-current-detail-preview-stability | func |
| `c` | 10283 | denn-v80-frame-builder-clock-preset-and-render-guard | var |
| `callOriginalExport` | 12048 | denn-v94-frame-template-edit-mode | func |
| `canonicalAll` | 12962 | denn-v36-3-frame-template-parity-admin | func |
| `canonicalFields` | 12938 | denn-v36-3-frame-template-parity-admin | func |
| `canonicalTemplate` | 12945 | denn-v36-3-frame-template-parity-admin | func |
| `canonicalWhite` | 8502 | denn-v56-canonical-save-detail | func |
| `canvas` | 13691 | denn-current-detail-preview-stability | func |
| `canvasCssSize` | 13693 | denn-current-detail-preview-stability | func |
| `canvasRect` | 7080 | denn-v44-transparent-detail-overlay | func |
| `captureBuilderTargets` | 8536 | denn-v56-canonical-save-detail | func |
| `captureTargets` | 8794 | denn-v61-frame-template-save-authority | func |
| `captureWhite` | 8819 | denn-v61-frame-template-save-authority | func |
| `categoryMatches` | 13088 | denn-v36-4-frame-template-tools | func |
| `cats` | 13057 | denn-v36-4-frame-template-tools | func |
| `cbExport` | 3607 | denn-v20-admin-js | window |
| `cbRender` | 2745 | denn-final-js | window |
| `centerSnap` | 11346 | denn-v89-ze-scroll-render-stability | func |
| `cfg` | 4162 | denn-v33-admin-finalize | func |
| `cfgFromInputs` | 4360 | denn-v35-size-input-height-width-final | func |
| `cfgFromUI` | 4951 | denn-v35-size-clock-onoff-final | func |
| `checkInput` | 5266 | denn-v35-guide-bg-detail-modal-final | func |
| `checkedFrom` | 8171 | denn-v54-size-render-lock | func |
| `checkedIds` | 12493 | denn-v36-order-admin-bulk | func |
| `checkedKeys` | 6787 | denn-v40-builder-render-rules | func |
| `checkedVals` | 7223 | denn-v45-design-canvas-only | func |
| `clamp` | 13692 | denn-current-detail-preview-stability | func |
| `cleanClock` | 3184 | denn-v14-admin-js | func |
| `cleanClockDataUrl` | 3302 | denn-v16-admin-js | func |
| `cleanClockStrong` | 3353 | denn-v17-admin-js | func |
| `cleanClockV15` | 3244 | denn-v14-admin-js | func |
| `cleanClockV18` | 3430 | denn-v18-admin-stability | func |
| `cleanClockV19` | 3504 | denn-v19-admin-stability | func |
| `cleanCurrentClockImageV12` | 3195 | denn-v14-admin-js | window |
| `cleanKey` | 12916 | denn-v36-3-frame-template-parity-admin | func |
| `cleanOverlayCanvas` | 6052 | denn-v35-frame-builder-clean-export-final | func |
| `cleanupUiSettings` | 3782 | denn-v27-admin-js | func |
| `clearClockImg` | 3691 | denn-v23-admin-js | window |
| `clearEditMode` | 11931 | denn-v94-frame-template-edit-mode | func |
| `clearForm` | 7450 | denn-v48-final-size-stability | func |
| `clearMissing` | 11581 | denn-v93-frame-template-bulk-category | func |
| `clearMockup` | 5151 | denn-v35-mockup-remove-click-fix | window |
| `clearSizeTarget` | 4491 | denn-v35-detail-size-selector | func |
| `clearTargets` | 6546 | denn-v38-multi-size-checkbox | func |
| `clearWatermark` | 5977 | denn-v35-watermark-live-preview-final | window |
| `clockBase` | 6101 | denn-v35-frame-builder-size-clock-link-final | func |
| `clockCfg` | 8827 | denn-v61-frame-template-save-authority | func |
| `clockEnabledOf` | 4926 | denn-v35-size-clock-onoff-final | func |
| `clockFromSize` | 10267 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `clockOf` | 4809 | denn-v35-size-list-live-stabilizer-final | func |
| `clockOn` | 9057 | denn-v69-initial-size-toggle-sync | func |
| `clockOnFromButton` | 5310 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `clockSource` | 3502 | denn-v19-admin-stability | func |
| `clockSrc` | 3186 | denn-v14-admin-js | func |
| `clockValue` | 7342 | denn-v48-final-size-stability | func |
| `clone` | 5660 | denn-v35-admin-data-safety-final | func |
| `cloneSetting` | 5215 | denn-v35-guide-bg-detail-modal-final | func |
| `closeGuideBgDetail` | 5268 | denn-v35-guide-bg-detail-modal-final | window |
| `col` | 8725 | denn-v59-builder-capture-union | var |
| `collectDefaults` | 12816 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `commonMeta` | 9995 | denn-v79-room-common-default-admin | func |
| `commonSetting` | 9991 | denn-v79-room-common-default-admin | func |
| `confirm` | 12395 | denn-v36-admin-order-labels-stable | window |
| `confirmEditSz` | 7487 | denn-v48-final-size-stability | window |
| `confirmEditSzV33` | 4174 | denn-v33-admin-finalize | window |
| `controlHTML` | 5250 | denn-v35-guide-bg-detail-modal-final | func |
| `controlValue` | 4345 | denn-v35-size-input-height-width-final | func |
| `count` | 5661 | denn-v35-admin-data-safety-final | func |
| `cover` | 9309 | denn-v71-frame-builder-preview-stability | func |
| `coverRect` | 4514 | denn-v35-detail-size-selector | func |
| `curCat` | 11563 | denn-v93-frame-template-bulk-category | func |
| `current` | 12054 | denn-v94-frame-template-edit-mode | var |
| `currentBuilderClock` | 10286 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `currentCat` | 13058 | denn-v36-4-frame-template-tools | func |
| `currentClock` | 4870 | denn-v35-size-list-live-stabilizer-final | func |
| `currentDetailTpl` | 6588 | denn-v38-multi-size-checkbox | func |
| `currentGuideScale` | 9969 | denn-v79-room-common-default-admin | func |
| `currentIndex` | 5771 | denn-v35-admin-data-safety-final | func |
| `currentRatio` | 8044 | denn-v53-detail-link-stability | func |
| `currentRoomDefaultSize` | 9822 | denn-v77-ui-room-default-size-retire | func |
| `currentScale` | 9871 | denn-v78-ui-frame-preview-scale-retire | func |
| `currentSize` | 13059 | denn-v36-4-frame-template-tools | func |
| `currentSizeInfo` | 4501 | denn-v35-detail-size-selector | func |
| `currentTemplate` | 12566 | denn-v96-detail-template-image-underlay | func |
| `currentTpl` | 13218 | denn-v36-4-frame-template-tools | func |
| `dashRect` | 6808 | denn-v40-builder-render-rules | func |
| `dedupeId` | 13618 | denn-current-admin-stability-sweep | func |
| `deep` | 12914 | denn-v36-3-frame-template-parity-admin | func |
| `defaultClock` | 10282 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `defaultRoomSizeIdFromList` | 4044 | denn-v33-admin-stable | func |
| `defaultSizeId` | 9675 | denn-v76-ui-settings-save-authority | func |
| `defaultTexts` | 8610 | denn-v56-canonical-save-detail | func |
| `defaults` | 7319 | denn-v48-final-size-stability | func |
| `defaultsRoom` | 4118 | denn-v33-admin-stable | func |
| `delFTpl` | 3939 | denn-v32-admin-stable | window |
| `delGuideBg` | 5296 | denn-v35-guide-bg-detail-modal-final | window |
| `deleteActiveField` | 12802 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `deleteClockPreset` | 4659 | denn-v35-size-list-live-preview-clock-presets | window |
| `deleteClockPresetFinal` | 4886 | denn-v35-size-list-live-stabilizer-final | window |
| `deleteDennOrderRequestV36` | 12316 | denn-v36-order-admin-js | window |
| `dennAlignZone` | 2741 | denn-final-js | window |
| `dennCleanClockV15` | 3249 | denn-v14-admin-js | window |
| `dennDownloadCurrentDataV35` | 5699 | denn-v35-admin-data-safety-final | window |
| `dennDownloadLatestSnapshotV35` | 5700 | denn-v35-admin-data-safety-final | window |
| `dennGuideBgSet` | 5271 | denn-v35-guide-bg-detail-modal-final | window |
| `dennRestoreLatestSnapshotV35` | 5708 | denn-v35-admin-data-safety-final | window |
| `dennRollbackAdminCenterNormalizeV53` | 6219 | denn-v46-admin-guide-bg-return-refresh | window |
| `dennRollbackBuilderCaptureUnionV59` | 8743 | denn-v59-builder-capture-union | window |
| `dennRollbackBuilderRenderRulesV40` | 6849 | denn-v40-builder-render-rules | window |
| `dennRollbackBuilderWhitePanelRelocateV52` | 7921 | denn-v52-builder-white-panel-relocate | window |
| `dennRollbackBuilderWhiteUiPolishV51` | 7865 | denn-v51-builder-white-ui-polish | window |
| `dennRollbackCanonicalSaveDetailV56` | 8662 | denn-v56-canonical-save-detail | window |
| `dennRollbackDesignCanvasOnlyV45` | 7297 | denn-v45-design-canvas-only | window |
| `dennRollbackDetailBuilderSyncV50` | 7701 | denn-v50-detail-builder-sync | window |
| `dennRollbackDetailLinkStabilityV53` | 8120 | denn-v53-detail-link-stability | window |
| `dennRollbackDetailPreviewGuideV42` | 7016 | denn-v42-detail-preview-guide | window |
| `dennRollbackFinalSizeStabilityV48` | 7509 | denn-v48-final-size-stability | window |
| `dennRollbackFrameTemplateSaveAuthorityV61` | 8944 | denn-v61-frame-template-save-authority | window |
| `dennRollbackRemoveBuilderWhiteBorderV41` | 6890 | denn-v41-remove-builder-white-border | window |
| `dennRollbackRenderAuthorityLockV49` | 7551 | denn-v49-render-authority-lock | window |
| `dennRollbackSizeRenderLockV54` | 8261 | denn-v54-size-render-lock | window |
| `dennRollbackSizeSaveControllerV37` | 6508 | denn-v37-size-save-controller-final | window |
| `dennRollbackThreeIssueStabilizeV55` | 8426 | denn-v55-three-issue-stabilize | window |
| `dennRollbackTransparentDetailOverlayV44` | 7152 | denn-v44-transparent-detail-overlay | window |
| `dennRollbackWhiteBorderGuideV39` | 6766 | denn-v39-white-border-guide-final | window |
| `dennSaveUISettingsV76` | 10037 | denn-v79-room-common-default-admin | window |
| `dennSyncUISettingsV76` | 10030 | denn-v79-room-common-default-admin | window |
| `dennV15DrawClock` | 3254 | denn-v14-admin-js | window |
| `dennV15SetZoneWhite` | 3258 | denn-v14-admin-js | window |
| `dennV15SetZoneWhiteThickness` | 3259 | denn-v14-admin-js | window |
| `dennV16CleanCurrentClock` | 3304 | denn-v16-admin-js | window |
| `dennV17CleanCurrentClock` | 3388 | denn-v17-admin-js | window |
| `dennV18CleanCurrentClock` | 3462 | denn-v18-admin-stability | window |
| `dennV18RemoveClock` | 3463 | denn-v18-admin-stability | window |
| `dennV19CleanCurrentClock` | 3539 | denn-v19-admin-stability | window |
| `dennV19RemoveClock` | 3540 | denn-v19-admin-stability | window |
| `dennV20RemoveClock` | 3619 | denn-v20-admin-js | window |
| `dennV38InstallMultiSizeCheckboxes` | 6660 | denn-v38-multi-size-checkbox | window |
| `dennV59CaptureBuilderDetailHandoff` | 8742 | denn-v59-builder-capture-union | window |
| `dennV80ApplyBuilderClockPreset` | 10569 | denn-v82-frame-builder-clock-toggle-authority | window |
| `detailImageSrc` | 8624 | denn-v56-canonical-save-detail | func |
| `detailLater` | 10746 | denn-v84-white-border-flicker-lock | func |
| `detailPrimary` | 6589 | denn-v38-multi-size-checkbox | func |
| `detailTargets` | 8341 | denn-v55-three-issue-stabilize | func |
| `detailVals` | 8609 | denn-v56-canonical-save-detail | func |
| `detailZonePath` | 7259 | denn-v45-design-canvas-only | func |
| `detectLegacyInnerRect` | 7236 | denn-v45-design-canvas-only | func |
| `digital` | 3722 | denn-v24-admin-fb-raw-clock | func |
| `dims` | 9263 | denn-v71-frame-builder-preview-stability | func |
| `dimsFromForm` | 5309 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `disableBuilderWhite` | 6863 | denn-v41-remove-builder-white-border | func |
| `done` | 11646 | denn-v93-frame-template-bulk-category | var |
| `downloadBlob` | 13502 | denn-v36-5-order-actions-singleflight-admin | func |
| `downloadObj` | 5690 | denn-v35-admin-data-safety-final | func |
| `drawAdminPreviewClock` | 3555 | denn-v19-admin-stability | func |
| `drawBgUnderCanvas` | 13196 | denn-v36-4-frame-template-tools | func |
| `drawBuilderBg` | 13201 | denn-v36-4-frame-template-tools | func |
| `drawBuilderFrameGuide` | 3267 | denn-v14-admin-js | func |
| `drawBuilderFrameOverlay` | 3775 | denn-v27-admin-js | func |
| `drawBuilderGrid` | 7194 | denn-v45-design-canvas-only | func |
| `drawBuilderSafeGuide` | 3659 | denn-v22-admin-js | func |
| `drawBuilderWhiteBorder` | 7186 | denn-v45-design-canvas-only | func |
| `drawBuilderWhiteOverlay` | 2931 | denn-v10-safe-js | func |
| `drawBuilderWhiteOverlayV11` | 7542 | denn-v49-render-authority-lock | window |
| `drawClock` | 3723 | denn-v24-admin-fb-raw-clock | func |
| `drawClockClean` | 3551 | denn-v19-admin-stability | func |
| `drawClockImage` | 3052 | denn-v13-admin-js | func |
| `drawClockImg` | 3391 | denn-v17-admin-js | func |
| `drawClockImgV18` | 3472 | denn-v18-admin-stability | func |
| `drawClockRaw` | 3688 | denn-v23-admin-js | func |
| `drawCover` | 6048 | denn-v35-frame-builder-clean-export-final | func |
| `drawDashedBorder` | 6724 | denn-v39-white-border-guide-final | func |
| `drawDennClockImage` | 3022 | denn-v12-admin-js | window |
| `drawDetailFrameOverlay` | 3260 | denn-v14-admin-js | func |
| `drawDetailGrid` | 7267 | denn-v45-design-canvas-only | func |
| `drawDetailPhotoPlaceholders` | 7260 | denn-v45-design-canvas-only | func |
| `drawDigital` | 4059 | denn-v33-admin-stable | func |
| `drawDigitalClock` | 3687 | denn-v23-admin-js | func |
| `drawFrameBase` | 4296 | denn-v34-frame-builder-crisp-render | func |
| `drawFrameBox` | 4062 | denn-v33-admin-stable | func |
| `drawFrameBuilder` | 3799 | denn-v29-admin-js | func |
| `drawGrid` | 9328 | denn-v71-frame-builder-preview-stability | func |
| `drawGuide` | 6811 | denn-v40-builder-render-rules | func |
| `drawGuides` | 2742 | denn-final-js | func |
| `drawImg` | 3021 | denn-v12-admin-js | func |
| `drawImgCenter` | 2971 | denn-v11-admin-js | func |
| `drawPreviewClock` | 4061 | denn-v33-admin-stable | window |
| `drawPreviewClockSafe` | 4383 | denn-v35-size-input-height-width-final | func |
| `drawRawClock` | 3621 | denn-v20-admin-js | func |
| `drawSafeGuides` | 7081 | denn-v44-transparent-detail-overlay | func |
| `drawSlotPath` | 6047 | denn-v35-frame-builder-clean-export-final | func |
| `drawTemplateImageForDetail` | 7253 | denn-v45-design-canvas-only | func |
| `drawTemplateWhiteBorder` | 7674 | denn-v50-detail-builder-sync | func |
| `drawTextHandleLabel` | 8047 | denn-v53-detail-link-stability | func |
| `drawTextZone` | 7271 | denn-v45-design-canvas-only | func |
| `drawUnderlay` | 12589 | denn-v96-detail-template-image-underlay | func |
| `drawWhite` | 9321 | denn-v71-frame-builder-preview-stability | func |
| `drawWhiteBorder` | 8046 | denn-v53-detail-link-stability | func |
| `drawWhiteBorderOnly` | 6051 | denn-v35-frame-builder-clean-export-final | func |
| `drawWhiteGuide` | 7280 | denn-v45-design-canvas-only | func |
| `drawZeBackground` | 13219 | denn-v36-4-frame-template-tools | func |
| `drawZones` | 4070 | denn-v33-admin-stable | func |
| `drawZonesOverlay` | 4297 | denn-v34-frame-builder-crisp-render | func |
| `dropFTpl` | 4230 | denn-v34-admin-frame-upload-stable | window |
| `dropWatermark` | 5968 | denn-v35-watermark-live-preview-final | window |
| `each` | 8995 | denn-v68-size-status-stabilizer | func |
| `ed` | 4718 | denn-v35-size-list-live-preview-clock-presets | var |
| `edge` | 7245 | denn-v45-design-canvas-only | func |
| `editIdx` | 7317 | denn-v48-final-size-stability | func |
| `editSz` | 7485 | denn-v48-final-size-stability | window |
| `editSzV33` | 4180 | denn-v33-admin-finalize | window |
| `enforce` | 8000 | denn-v53-detail-link-stability | func |
| `enforceChecks` | 6571 | denn-v38-multi-size-checkbox | func |
| `enhanceFrameTemplateCards` | 2940 | denn-v10-safe-js | func |
| `enhanceList` | 4860 | denn-v35-size-list-live-stabilizer-final | func |
| `enhanceSizeList` | 4691 | denn-v35-size-list-live-preview-clock-presets | func |
| `ensureBanner` | 11891 | denn-v94-frame-template-edit-mode | func |
| `ensureBar` | 11590 | denn-v93-frame-template-bulk-category | func |
| `ensureBuilderBgPanel` | 13179 | denn-v36-4-frame-template-tools | func |
| `ensureBuilderUi` | 7540 | denn-v49-render-authority-lock | func |
| `ensureClock` | 3684 | denn-v23-admin-js | func |
| `ensureClockClean` | 3194 | denn-v14-admin-js | func |
| `ensureClockPresetVisible` | 5046 | denn-v35-clock-preset-visible-anchor-final | func |
| `ensureControl` | 6682 | denn-v39-white-border-guide-final | func |
| `ensureFields` | 12693 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `ensureFilterBar` | 13103 | denn-v36-4-frame-template-tools | func |
| `ensureFrameToggle` | 9059 | denn-v69-initial-size-toggle-sync | func |
| `ensureGuideOverlay` | 13262 | denn-v36-4-frame-template-tools | func |
| `ensureGuides` | 13224 | denn-v36-4-frame-template-tools | func |
| `ensureManager` | 12723 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `ensureNote` | 6826 | denn-v40-builder-render-rules | func |
| `ensureOpenFn` | 10083 | denn-v79b-room-common-default-card-visible | func |
| `ensurePanel` | 9565 | denn-v74-frame-builder-visible-panel-stabilizer | func |
| `ensurePreviewBox` | 5927 | denn-v35-watermark-live-preview-final | func |
| `ensureRoots` | 5213 | denn-v35-guide-bg-detail-modal-final | func |
| `ensureShell` | 12455 | denn-v36-order-admin-bulk | func |
| `ensureTypes` | 11154 | denn-v87-name2-textbox-toggle | func |
| `ensureV5Defaults` | 2776 | denn-v5-ui-settings-script | func |
| `ensureWatermark` | 5916 | denn-v35-watermark-live-preview-final | func |
| `ensureWhitePanel` | 10376 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `esc` | 13052 | denn-v36-4-frame-template-tools | func |
| `escAttr` | 13604 | denn-current-admin-stability-sweep | func |
| `exportFromBuilder` | 8915 | denn-v61-frame-template-save-authority | func |
| `exportRouter` | 12060 | denn-v94-frame-template-edit-mode | func |
| `exportWrap` | 6869 | denn-v41-remove-builder-white-border | var |
| `fallbackTexts` | 7137 | denn-v44-transparent-detail-overlay | func |
| `fbExport` | 13304 | denn-v36-4-frame-template-tools | window |
| `fbRender` | 13299 | denn-v36-4-frame-template-tools | window |
| `fbSelectSize` | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard | window |
| `fd` | 4161 | denn-v33-admin-finalize | func |
| `field` | 6828 | denn-v40-builder-render-rules | var |
| `fieldLabel` | 12663 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `fillDefaultSizeSelect` | 4093 | denn-v33-admin-stable | func |
| `fillForm` | 7434 | denn-v48-final-size-stability | func |
| `fillFormFromSize` | 4964 | denn-v35-size-clock-onoff-final | func |
| `fillSizeForm` | 4818 | denn-v35-size-list-live-stabilizer-final | func |
| `findByKey` | 6535 | denn-v38-multi-size-checkbox | func |
| `findSize` | 7230 | denn-v45-design-canvas-only | func |
| `findSizeByKey` | 4473 | denn-v35-detail-size-selector | func |
| `finishEditSave` | 12019 | denn-v94-frame-template-edit-mode | func |
| `finishRendering` | 12203 | denn-v95-frame-template-list-ui-stabilize | func |
| `first` | 8888 | denn-v61-frame-template-save-authority | var |
| `fit` | 9291 | denn-v71-frame-builder-preview-stability | func |
| `fitByCm` | 4051 | denn-v33-admin-stable | func |
| `fitSize` | 4289 | denn-v34-frame-builder-crisp-render | func |
| `fix` | 12325 | denn-v36-admin-korean-label-fix | func |
| `fixClockUI` | 3301 | denn-v16-admin-js | func |
| `fixFrameAxisLabels` | 4117 | denn-v33-admin-stable | func |
| `fixShell` | 12376 | denn-v36-admin-order-labels-stable | func |
| `flagOn` | 13154 | denn-v36-4-frame-template-tools | func |
| `fmt` | 8500 | denn-v56-canonical-save-detail | func |
| `fmtDate` | 12422 | denn-v36-order-admin-bulk | func |
| `fn` | 11440 | denn-v91-white-label-final-lock | var |
| `forceV33` | 4181 | denn-v33-admin-finalize | func |
| `formDims` | 7396 | denn-v48-final-size-stability | func |
| `frameColorCard` | 5117 | denn-v35-clock-toggle-button-and-preset-position-final | func |
| `frameOf` | 4817 | denn-v35-size-list-live-stabilizer-final | func |
| `frameOn` | 9058 | denn-v69-initial-size-toggle-sync | func |
| `frameOnFromButton` | 6231 | denn-v36-size-frame-enabled-admin-final | func |
| `frameOnFromSize` | 6230 | denn-v36-size-frame-enabled-admin-final | func |
| `frameRect` | 6801 | denn-v40-builder-render-rules | func |
| `frameSizeKey` | 4043 | denn-v33-admin-stable | func |
| `frameVal` | 5330 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `frameValue` | 7341 | denn-v48-final-size-stability | func |
| `fullSettle` | 10420 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `getCfgFromInputs` | 3695 | denn-v23-admin-js | func |
| `getClock` | 4938 | denn-v35-size-clock-onoff-final | func |
| `getClockCfg` | 6049 | denn-v35-frame-builder-clean-export-final | func |
| `getClockEnabledUI` | 4946 | denn-v35-size-clock-onoff-final | func |
| `getClockSrc` | 3049 | denn-v13-admin-js | func |
| `getCurrentClock` | 4627 | denn-v35-size-list-live-preview-clock-presets | func |
| `getDennOrderRequestV36` | 12316 | denn-v36-order-admin-js | window |
| `getDims` | 4928 | denn-v35-size-clock-onoff-final | func |
| `getFrame` | 4937 | denn-v35-size-clock-onoff-final | func |
| `getLoadedImage` | 12575 | denn-v96-detail-template-image-underlay | func |
| `getSize` | 5329 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `getThickness` | 2980 | denn-v11-admin-js | func |
| `getTpl` | 3256 | denn-v14-admin-js | func |
| `getZP` | 11225 | denn-v87-name2-textbox-toggle | window |
| `go` | 13658 | denn-current-admin-stability-sweep | var |
| `goTab` | 13324 | denn-v36-4-frame-template-tools | window |
| `grid` | 12196 | denn-v95-frame-template-list-ui-stabilize | func |
| `handleClick` | 12316 | denn-v36-order-admin-js | func |
| `handlePanelChange` | 12538 | denn-v36-order-admin-bulk | func |
| `handlePanelClick` | 12512 | denn-v36-order-admin-bulk | func |
| `has` | 2911 | denn-v10-safe-js | func |
| `hasExplicitField` | 12932 | denn-v36-3-frame-template-parity-admin | func |
| `hasName2Field` | 11147 | denn-v87-name2-textbox-toggle | func |
| `hideBuilderFrameUi` | 7187 | denn-v45-design-canvas-only | func |
| `hideDefaultClockControls` | 3634 | denn-v21-admin-clock-ui | func |
| `hideDetailBorder` | 7545 | denn-v49-render-authority-lock | func |
| `hideDupes` | 3749 | denn-v26-admin-ui-dedupe-js | func |
| `hideFrameDefaultsInUI` | 3028 | denn-v12-admin-js | func |
| `hideLegacyDetail` | 10699 | denn-v84-white-border-flicker-lock | func |
| `hideOldMatControls` | 2921 | denn-v10-safe-js | func |
| `hideOldUIControls` | 4075 | denn-v33-admin-stable | func |
| `hideRetiredRow` | 9882 | denn-v78-ui-frame-preview-scale-retire | func |
| `hideRetiredUiRows` | 9984 | denn-v79-room-common-default-admin | func |
| `hideRow` | 10605 | denn-v83-hide-risky-ui-scale-controls | func |
| `hit` | 13419 | denn-v36-5-admin-render-stability | var |
| `host` | 12719 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `i` | 3517 | denn-v19-admin-stability | var |
| `idx` | 12973 | denn-v36-3-frame-template-parity-admin | var |
| `imageSize` | 4219 | denn-v34-admin-frame-upload-stable | func |
| `imageSrc` | 12918 | denn-v36-3-frame-template-parity-admin | func |
| `inferBase` | 12917 | denn-v36-3-frame-template-parity-admin | func |
| `init` | 7505 | denn-v48-final-size-stability | func |
| `initCaseBuilder` | 2746 | denn-final-js | window |
| `initFrameBuilder` | 11102 | denn-v86-builder-white-immediate-authority | window |
| `initV32` | 4002 | denn-v32-admin-stable | func |
| `initV33` | 4148 | denn-v33-admin-stable | func |
| `initialGuideBgSetting` | 5217 | denn-v35-guide-bg-detail-modal-final | func |
| `install` | 12081 | denn-v94-frame-template-edit-mode | func |
| `installBuilderMulti` | 6628 | denn-v38-multi-size-checkbox | func |
| `installBuilderSafeSlider` | 3658 | denn-v22-admin-js | func |
| `installBuilderWhitePanel` | 7647 | denn-v50-detail-builder-sync | func |
| `installCardButtons` | 12061 | denn-v94-frame-template-edit-mode | func |
| `installCaseBuilderSafeMargin` | 3597 | denn-v20-admin-js | func |
| `installCaseSafeSliders` | 3657 | denn-v22-admin-js | func |
| `installClockButton` | 3251 | denn-v14-admin-js | func |
| `installClockPresetTools` | 4673 | denn-v35-size-list-live-preview-clock-presets | func |
| `installClockUI` | 3541 | denn-v19-admin-stability | func |
| `installClockUIV18` | 3465 | denn-v18-admin-stability | func |
| `installCommonCard` | 10013 | denn-v79-room-common-default-admin | func |
| `installDetailBorder` | 3257 | denn-v14-admin-js | func |
| `installDetailMulti` | 6593 | denn-v38-multi-size-checkbox | func |
| `installDetailSizeSync` | 7624 | denn-v50-detail-builder-sync | func |
| `installExportRouter` | 12052 | denn-v94-frame-template-edit-mode | func |
| `installFrameSizeUI` | 4145 | denn-v33-admin-stable | func |
| `installFrameToggle` | 7349 | denn-v48-final-size-stability | func |
| `installFrameUploadNote` | 4144 | denn-v33-admin-stable | func |
| `installFrameUploadNoteV18` | 3479 | denn-v18-admin-stability | func |
| `installGuidePanel` | 13225 | denn-v36-4-frame-template-tools | func |
| `installLightClockUI` | 3608 | denn-v20-admin-js | func |
| `installPanel` | 5733 | denn-v35-admin-data-safety-final | func |
| `installPresetBox` | 4900 | denn-v35-size-list-live-stabilizer-final | func |
| `installPresetUi` | 10346 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `installSafeMarginInList` | 3580 | denn-v20-admin-js | func |
| `installSaveButtonAuthority` | 8932 | denn-v61-frame-template-save-authority | func |
| `installScale` | 3402 | denn-v17-admin-js | func |
| `installSizeControl` | 4508 | denn-v35-detail-size-selector | func |
| `installUISettingsV32` | 3984 | denn-v32-admin-stable | func |
| `installUISettingsV33` | 4081 | denn-v33-admin-stable | func |
| `installUITidy` | 3705 | denn-v23-admin-js | func |
| `isActionButton` | 12208 | denn-v95-frame-template-list-ui-stabilize | func |
| `isAll` | 11783 | denn-v94-frame-template-edit-mode | func |
| `isAllSizeValue` | 4457 | denn-v35-detail-size-selector | func |
| `isBuilderTemplate` | 7233 | denn-v45-design-canvas-only | func |
| `isBuiltin` | 11562 | denn-v93-frame-template-bulk-category | func |
| `isClockOn` | 5083 | denn-v35-clock-toggle-button-and-preset-position-final | func |
| `isDesignCanvasTemplate` | 8042 | denn-v53-detail-link-stability | func |
| `isEl` | 10890 | denn-v85-frame-template-card-layout-lock | func |
| `isEnabled` | 11203 | denn-v87-name2-textbox-toggle | func |
| `isOnFrameBuilder` | 9408 | denn-v72-frame-builder-entry-flicker-guard | func |
| `iw` | 6720 | denn-v39-white-border-guide-final | var |
| `key` | 11784 | denn-v94-frame-template-edit-mode | func |
| `label` | 11584 | denn-v93-frame-template-bulk-category | func |
| `later` | 13655 | denn-current-admin-stability-sweep | func |
| `listDennOrderRequestsV36` | 12316 | denn-v36-order-admin-js | window |
| `load` | 3721 | denn-v24-admin-fb-raw-clock | func |
| `loadArt` | 11883 | denn-v94-frame-template-edit-mode | func |
| `loadClockPreset` | 4872 | denn-v35-size-list-live-stabilizer-final | window |
| `loadImage` | 3352 | denn-v17-admin-js | func |
| `loadImg` | 4060 | denn-v33-admin-stable | func |
| `loadSizeToBuilder` | 4069 | denn-v33-admin-stable | func |
| `loadTemplateIntoBuilder` | 11937 | denn-v94-frame-template-edit-mode | func |
| `lockTemplate` | 8869 | denn-v61-frame-template-save-authority | func |
| `lumAt` | 3441 | denn-v18-admin-stability | func |
| `makePresetBox` | 5104 | denn-v35-clock-toggle-button-and-preset-position-final | func |
| `makeTemplate` | 8879 | denn-v61-frame-template-save-authority | func |
| `markPlaced` | 9409 | denn-v72-frame-builder-entry-flicker-guard | func |
| `markRendering` | 12197 | denn-v95-frame-template-list-ui-stabilize | func |
| `markSelectedSize` | 4840 | denn-v35-size-list-live-stabilizer-final | func |
| `markWhitePanel` | 9476 | denn-v73-frame-builder-legacy-timer-guard | func |
| `mat` | 3120 | denn-v13-admin-js | var |
| `maxRegisteredSide` | 4050 | denn-v33-admin-stable | func |
| `memoryTargets` | 8687 | denn-v59-builder-capture-union | func |
| `metaText` | 10075 | denn-v79b-room-common-default-card-visible | func |
| `migrateClock` | 3404 | denn-v17-admin-js | func |
| `mixed` | 6799 | denn-v40-builder-render-rules | func |
| `mockupUrlFor` | 5477 | denn-v35-guide-bg-real-room-setup-final | func |
| `modal` | 13689 | denn-current-detail-preview-stability | func |
| `movePanel` | 7899 | denn-v52-builder-white-panel-relocate | func |
| `msg` | 3499 | denn-v19-admin-stability | func |
| `n` | 9671 | denn-v76-ui-settings-save-authority | func |
| `name` | 6403 | denn-v37-size-save-controller-final | var |
| `navToBuilderAndLoad` | 11968 | denn-v94-frame-template-edit-mode | func |
| `needsLegacyBuilderCrop` | 7235 | denn-v45-design-canvas-only | func |
| `nextKey` | 12742 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `norm` | 13053 | denn-v36-4-frame-template-tools | func |
| `normField` | 12919 | denn-v36-3-frame-template-parity-admin | func |
| `normFrameRatio` | 2738 | denn-final-js | func |
| `normalize` | 11411 | denn-v91-white-label-final-lock | func |
| `normalizeAllFlags` | 7330 | denn-v48-final-size-stability | func |
| `normalizeAllSizes` | 4049 | denn-v33-admin-stable | func |
| `normalizeCard` | 10897 | denn-v85-frame-template-card-layout-lock | func |
| `normalizeCenterSetting` | 5231 | denn-v35-guide-bg-detail-modal-final | func |
| `normalizeField` | 12669 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `normalizeFlags` | 7320 | denn-v48-final-size-stability | func |
| `normalizeFrameNote` | 3707 | denn-v23-admin-js | func |
| `normalizeFrameUploadNote` | 3664 | denn-v22-admin-js | func |
| `normalizeRoomCenters` | 6187 | denn-v46-admin-guide-bg-return-refresh | func |
| `normalizeSavedTemplate` | 8847 | denn-v61-frame-template-save-authority | func |
| `normalizeSize` | 6043 | denn-v35-frame-builder-clean-export-final | func |
| `normalizeTemplateCards` | 3779 | denn-v27-admin-js | func |
| `normalizeWhiteBorderData` | 2913 | denn-v10-safe-js | func |
| `normalizeZone` | 11189 | denn-v87-name2-textbox-toggle | func |
| `normalizeZones` | 11195 | denn-v87-name2-textbox-toggle | func |
| `num` | 13688 | denn-current-detail-preview-stability | func |
| `numInput` | 5265 | denn-v35-guide-bg-detail-modal-final | func |
| `observe` | 9133 | denn-v69-initial-size-toggle-sync | func |
| `onBuilder` | 10479 | denn-v81-frame-builder-open-safe-mode | func |
| `onButton` | 6374 | denn-v37-size-save-controller-final | func |
| `onOfSize` | 5420 | denn-v35-clock-onoff-selection-sync-final | func |
| `once` | 13490 | denn-v36-5-order-actions-singleflight-admin | func |
| `open` | 13741 | denn-current-detail-preview-stability | var |
| `openCommonDefault` | 10164 | denn-v79d-common-default-open-authority | func |
| `openCustomerMockupV35` | 5892 | denn-v35-admin-data-safety-final | window |
| `openFrameTemplateDetail` | 3938 | denn-v32-admin-stable | window |
| `openGuideBgDetail` | 5485 | denn-v35-guide-bg-real-room-setup-final | window |
| `openRoomCommonDefaultSetupV79` | 10085 | denn-v79b-room-common-default-card-visible | window |
| `openZoneEditor` | 13309 | denn-v36-4-frame-template-tools | window |
| `options` | 11585 | denn-v93-frame-template-bulk-category | func |
| `overlayClockOnBuilder` | 2974 | denn-v11-admin-js | func |
| `overlayClockOnSizePreview` | 2973 | denn-v11-admin-js | func |
| `p` | 3511 | denn-v19-admin-stability | func |
| `paint` | 11627 | denn-v93-frame-template-bulk-category | func |
| `paintBuilder` | 4298 | denn-v34-frame-builder-crisp-render | func |
| `paintBuilderClockFromSize` | 6122 | denn-v35-frame-builder-size-clock-link-final | func |
| `paintButton` | 7369 | denn-v48-final-size-stability | func |
| `paintClock` | 7379 | denn-v48-final-size-stability | func |
| `paintClockButton` | 5084 | denn-v35-clock-toggle-button-and-preset-position-final | func |
| `paintFrame` | 7384 | denn-v48-final-size-stability | func |
| `pair` | 4092 | denn-v33-admin-stable | func |
| `parseSub` | 9259 | denn-v71-frame-builder-preview-stability | func |
| `patchConfirm` | 12391 | denn-v36-admin-order-labels-stable | func |
| `patchFontHelp` | 2885 | denn-v6-admin-js | func |
| `patchGoTab` | 12545 | denn-v36-order-admin-bulk | func |
| `patchLayout` | 2739 | denn-final-js | func |
| `patchRender` | 10544 | denn-v82-frame-builder-clock-toggle-authority | func |
| `patched` | 10638 | denn-v83-hide-risky-ui-scale-controls | var |
| `persist` | 11787 | denn-v94-frame-template-edit-mode | func |
| `persistIfChanged` | 6205 | denn-v46-admin-guide-bg-return-refresh | func |
| `persistNow` | 2975 | denn-v11-admin-js | func |
| `persistSoft` | 3067 | denn-v13-admin-js | func |
| `persistStrong` | 5800 | denn-v35-admin-data-safety-final | func |
| `persistTemplateState` | 12821 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `pix` | 3437 | denn-v18-admin-stability | func |
| `place` | 11036 | denn-v86-builder-white-immediate-authority | func |
| `placePresetBeforeFrameColors` | 5121 | denn-v35-clock-toggle-button-and-preset-position-final | func |
| `placeholder` | 3933 | denn-v32-admin-stable | func |
| `polish` | 7837 | denn-v51-builder-white-ui-polish | func |
| `positionPreview` | 5936 | denn-v35-watermark-live-preview-final | func |
| `prepare` | 9491 | denn-v73-frame-builder-legacy-timer-guard | func |
| `prepareDetail` | 8628 | denn-v56-canonical-save-detail | func |
| `preserveDetailFields` | 11973 | denn-v94-frame-template-edit-mode | func |
| `preserveGuideScale` | 9973 | denn-v79-room-common-default-admin | func |
| `preserveOriginalSource` | 8900 | denn-v61-frame-template-save-authority | func |
| `preserveScale` | 9875 | denn-v78-ui-frame-preview-scale-retire | func |
| `preserveSelectedRoomSize` | 9818 | denn-v77-ui-room-default-size-retire | func |
| `presetItems` | 10315 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `previewSz` | 6320 | denn-v36-size-frame-enabled-admin-final | window |
| `primaryDetailSize` | 7231 | denn-v45-design-canvas-only | func |
| `primarySize` | 7049 | denn-v44-transparent-detail-overlay | func |
| `processCTpls` | 3606 | denn-v20-admin-js | window |
| `processClockDataURL` | 3020 | denn-v12-admin-js | func |
| `processFTpls` | 4235 | denn-v34-admin-frame-upload-stable | window |
| `processGuideBgs` | 5295 | denn-v35-guide-bg-detail-modal-final | window |
| `props` | 13402 | denn-v36-5-admin-render-stability | var |
| `pulse` | 11433 | denn-v91-white-label-final-lock | func |
| `px` | 13417 | denn-v36-5-admin-render-stability | var |
| `py` | 13418 | denn-v36-5-admin-render-stability | var |
| `queued` | 5608 | denn-v35-admin-save-render-stabilizer-final | var |
| `quick` | 11089 | denn-v86-builder-white-immediate-authority | func |
| `raf` | 13687 | denn-current-detail-preview-stability | func |
| `rawClockSrc` | 3685 | denn-v23-admin-js | func |
| `readBox` | 8686 | denn-v59-builder-capture-union | func |
| `readCheckTargets` | 8318 | denn-v55-three-issue-stabilize | func |
| `readChecks` | 8493 | denn-v56-canonical-save-detail | func |
| `readDims` | 5339 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `readForm` | 7397 | denn-v48-final-size-stability | func |
| `readPair` | 7390 | denn-v48-final-size-stability | func |
| `readSnaps` | 5678 | denn-v35-admin-data-safety-final | func |
| `readState` | 6401 | denn-v37-size-save-controller-final | func |
| `readWatermarkControls` | 5917 | denn-v35-watermark-live-preview-final | func |
| `ready` | 4580 | denn-v35-detail-size-selector | func |
| `realFrameTemplateSrc` | 3937 | denn-v32-admin-stable | func |
| `rebuildSystemUi` | 2886 | denn-v6-admin-js | func |
| `rect` | 6713 | denn-v39-white-border-guide-final | func |
| `refresh` | 3708 | denn-v23-admin-js | func |
| `refreshAll` | 3665 | denn-v22-admin-js | func |
| `refreshBuilderClockToggle` | 3623 | denn-v20-admin-js | func |
| `refreshClockViews` | 3694 | denn-v23-admin-js | func |
| `refreshGuideBgCards` | 6210 | denn-v46-admin-guide-bg-return-refresh | func |
| `refreshPresetSelect` | 10331 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `relabel` | 8971 | denn-v67-size-status-labels | func |
| `remove` | 8996 | denn-v68-size-status-stabilizer | func |
| `renameActiveField` | 12793 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `renameDetailUi` | 3771 | denn-v27-admin-js | func |
| `render` | 13754 | denn-current-detail-preview-stability | var |
| `renderAuthority` | 9482 | denn-v73-frame-builder-legacy-timer-guard | func |
| `renderBulkOrders` | 12496 | denn-v36-order-admin-bulk | func |
| `renderButtons` | 12755 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `renderCTpls` | 3605 | denn-v20-admin-js | window |
| `renderChecks` | 7618 | denn-v50-detail-builder-sync | func |
| `renderClean` | 9641 | denn-v75d-frame-builder-repeat-click-guard | func |
| `renderClockPresetList` | 4894 | denn-v35-size-list-live-stabilizer-final | window |
| `renderDetail` | 4529 | denn-v35-detail-size-selector | func |
| `renderDetailChecks` | 8025 | denn-v53-detail-link-stability | func |
| `renderDetailPreview` | 5273 | denn-v35-guide-bg-detail-modal-final | func |
| `renderDetailSizeCard` | 8360 | denn-v55-three-issue-stabilize | func |
| `renderFTplsByCategory` | 13284 | denn-v36-4-frame-template-tools | window |
| `renderFTplsTab` | 13289 | denn-v36-4-frame-template-tools | window |
| `renderFast` | 9594 | denn-v74-frame-builder-visible-panel-stabilizer | func |
| `renderFrames` | 8979 | denn-v67-size-status-labels | window |
| `renderGuideBgs` | 5595 | denn-v35-guide-bg-card-ui-polish | window |
| `renderGuideCardsRealSetup` | 5495 | denn-v35-guide-bg-real-room-setup-final | func |
| `renderGuideList` | 13252 | denn-v36-4-frame-template-tools | func |
| `renderGuideSoon` | 5626 | denn-v35-admin-save-render-stabilizer-final | func |
| `renderList` | 9203 | denn-v70-hide-builtin-frame-templates | func |
| `renderOrders` | 12316 | denn-v36-order-admin-js | func |
| `renderPolishedGuideCards` | 5580 | denn-v35-guide-bg-card-ui-polish | func |
| `renderPreview` | 7463 | denn-v48-final-size-stability | func |
| `renderRatioNote` | 7057 | denn-v44-transparent-detail-overlay | func |
| `renderSizeCard` | 8584 | denn-v56-canonical-save-detail | func |
| `renderStable` | 10411 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `renderStableOrders` | 12364 | denn-v36-admin-order-labels-stable | func |
| `renderStatus` | 7421 | denn-v48-final-size-stability | func |
| `renderSzPreview` | 6330 | denn-v36-size-frame-enabled-admin-final | window |
| `renderTabs` | 9197 | denn-v70-hide-builtin-frame-templates | func |
| `renderUIExample` | 2780 | denn-v5-ui-settings-script | window |
| `renderWatermarkPreview` | 5946 | denn-v35-watermark-live-preview-final | window |
| `renderWatermarkUI` | 5985 | denn-v35-watermark-live-preview-final | window |
| `renderWithSizeClockOverride` | 10530 | denn-v82-frame-builder-clock-toggle-authority | func |
| `renderWrap` | 6745 | denn-v39-white-border-guide-final | var |
| `rerenderOrders` | 13515 | denn-v36-5-order-actions-singleflight-admin | func |
| `resetFrameInput` | 4218 | denn-v34-admin-frame-upload-stable | func |
| `resetGuideBgDetail` | 5270 | denn-v35-guide-bg-detail-modal-final | window |
| `resetUIV33` | 4116 | denn-v33-admin-stable | window |
| `resizeDetailCanvasToSize` | 4518 | denn-v35-detail-size-selector | func |
| `resizeDetailTo` | 6590 | denn-v38-multi-size-checkbox | func |
| `resolve` | 11794 | denn-v94-frame-template-edit-mode | func |
| `resolveSize` | 13062 | denn-v36-4-frame-template-tools | func |
| `resolveSizeKey` | 9167 | denn-v70-hide-builtin-frame-templates | func |
| `restore` | 13710 | denn-current-detail-preview-stability | func |
| `restoreCenter` | 11355 | denn-v89-ze-scroll-render-stability | func |
| `restoreClockControls` | 3663 | denn-v22-admin-js | func |
| `restoreSoon` | 11338 | denn-v89-ze-scroll-render-stability | func |
| `retarget` | 10150 | denn-v79c-room-common-default-savebar-entry | func |
| `rewire` | 4427 | denn-v35-size-input-height-width-final | func |
| `rf` | 4713 | denn-v35-size-list-live-preview-clock-presets | var |
| `rg` | 10112 | denn-v79b-room-common-default-card-visible | var |
| `rmSz` | 7496 | denn-v48-final-size-stability | window |
| `roomSet` | 4119 | denn-v33-admin-stable | func |
| `root` | 12666 | denn-v36-3-dynamic-frame-text-fields-admin | var |
| `row` | 2891 | denn-v6-admin-js | func |
| `rr` | 9296 | denn-v71-frame-builder-preview-stability | func |
| `run` | 12552 | denn-v36-order-admin-bulk | func |
| `runFb` | 13452 | denn-v36-5-admin-render-stability | func |
| `safeCat` | 9196 | denn-v70-hide-builtin-frame-templates | func |
| `safeJsonSave` | 12286 | denn-v35-stabilized-save-authority | func |
| `safeToast` | 5605 | denn-v35-admin-save-render-stabilizer-final | func |
| `save` | 11571 | denn-v93-frame-template-bulk-category | func |
| `saveAdminState` | 4208 | denn-v34-admin-frame-upload-stable | func |
| `saveAll` | 6002 | denn-v35-watermark-live-preview-final | window |
| `saveClockPreset` | 4873 | denn-v35-size-list-live-stabilizer-final | window |
| `saveClockPresetFromPreview` | 4874 | denn-v35-size-list-live-stabilizer-final | window |
| `saveDetail` | 8611 | denn-v56-canonical-save-detail | func |
| `saveDetailTargets` | 6605 | denn-v38-multi-size-checkbox | func |
| `saveEdit` | 12036 | denn-v94-frame-template-edit-mode | func |
| `saveGuideBgDetail` | 5269 | denn-v35-guide-bg-detail-modal-final | window |
| `saveNow` | 8677 | denn-v59-builder-capture-union | func |
| `saveNowSafe` | 4925 | denn-v35-size-clock-onoff-final | func |
| `saveOnlyWrap` | 4602 | denn-v35-detail-size-selector | var |
| `saveSelectedSize` | 4591 | denn-v35-detail-size-selector | func |
| `saveSoft` | 13096 | denn-v36-4-frame-template-tools | func |
| `saveSoon` | 5617 | denn-v35-admin-save-render-stabilizer-final | func |
| `saveWrap` | 4597 | denn-v35-detail-size-selector | var |
| `saveZones` | 12848 | denn-v36-3-dynamic-frame-text-fields-admin | window |
| `saveZonesOnly` | 12858 | denn-v36-3-dynamic-frame-text-fields-admin | window |
| `schedule` | 12242 | denn-v95-frame-template-list-ui-stabilize | func |
| `scheduleFilters` | 13152 | denn-v36-4-frame-template-tools | func |
| `scheduleGuideOverlay` | 13268 | denn-v36-4-frame-template-tools | func |
| `scheduleRender` | 6681 | denn-v39-white-border-guide-final | func |
| `scheduleSettle` | 13732 | denn-current-detail-preview-stability | func |
| `scheduleZe` | 13346 | denn-v36-5-admin-render-stability | func |
| `scope` | 8721 | denn-v59-builder-capture-union | var |
| `scopeLabel` | 8899 | denn-v61-frame-template-save-authority | func |
| `score` | 13607 | denn-current-admin-stability-sweep | func |
| `scrollHostForZoneList` | 13358 | denn-v36-5-admin-render-stability | func |
| `sealNewTemplates` | 8194 | denn-v54-size-render-lock | func |
| `sealWhite` | 8842 | denn-v61-frame-template-save-authority | func |
| `selectFrameSizeForEdit` | 6289 | denn-v36-size-frame-enabled-admin-final | window |
| `selectSizeFromList` | 4683 | denn-v35-size-list-live-preview-clock-presets | func |
| `selected` | 4165 | denn-v33-admin-finalize | func |
| `selectedBuilder` | 9274 | denn-v71-frame-builder-preview-stability | func |
| `selectedBuilderIndex` | 6102 | denn-v35-frame-builder-size-clock-link-final | func |
| `selectedBuilderSize` | 7175 | denn-v45-design-canvas-only | func |
| `selectedBuilderTargets` | 7636 | denn-v50-detail-builder-sync | func |
| `selectedBuilderVals` | 6618 | denn-v38-multi-size-checkbox | func |
| `selectedClockOn` | 5100 | denn-v35-clock-toggle-button-and-preset-position-final | func |
| `selectedDetailVals` | 8041 | denn-v53-detail-link-stability | func |
| `selectedDomIndex` | 9086 | denn-v69-initial-size-toggle-sync | func |
| `selectedFrameSize` | 6044 | denn-v35-frame-builder-clean-export-final | func |
| `selectedIndex` | 4739 | denn-v35-frame-builder-size-clock-sync | func |
| `selectedKeys` | 11578 | denn-v93-frame-template-bulk-category | func |
| `selectedPreset` | 10341 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `selectedSizeOrDefault` | 4057 | denn-v33-admin-stable | func |
| `selectedTargets` | 7533 | denn-v49-render-authority-lock | func |
| `set` | 9744 | denn-v76-ui-settings-save-authority | func |
| `setActiveEnabled` | 11210 | denn-v87-name2-textbox-toggle | func |
| `setBusy` | 13497 | denn-v36-5-order-actions-singleflight-admin | func |
| `setClockButton` | 5311 | denn-v35-clock-onoff-save-stabilizer-final | func |
| `setClockEnabledUI` | 4939 | denn-v35-size-clock-onoff-final | func |
| `setClockValues` | 4635 | denn-v35-size-list-live-preview-clock-presets | func |
| `setEditIdx` | 7318 | denn-v48-final-size-stability | func |
| `setEditMode` | 9098 | denn-v69-initial-size-toggle-sync | func |
| `setForm` | 4337 | denn-v35-size-input-height-width-final | func |
| `setFrameButton` | 6232 | denn-v36-size-frame-enabled-admin-final | func |
| `setFrameDefaults` | 3770 | denn-v27-admin-js | func |
| `setFrameNote` | 4166 | denn-v33-admin-finalize | func |
| `setFrameTemplateWhiteThicknessV11` | 2985 | denn-v11-admin-js | window |
| `setHiddenSelect` | 6565 | denn-v38-multi-size-checkbox | func |
| `setLabel` | 5926 | denn-v35-watermark-live-preview-final | func |
| `setManual` | 10516 | denn-v82-frame-builder-clock-toggle-authority | func |
| `setMode` | 7386 | denn-v48-final-size-stability | func |
| `setOut` | 10294 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `setPresetStatus` | 10327 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `setRange` | 11866 | denn-v94-frame-template-edit-mode | func |
| `setSwitch` | 11853 | denn-v94-frame-template-edit-mode | func |
| `setText` | 11410 | denn-v91-white-label-final-lock | func |
| `setVal` | 11860 | denn-v94-frame-template-edit-mode | func |
| `setWhite` | 7076 | denn-v44-transparent-detail-overlay | func |
| `setWhiteThickness` | 7077 | denn-v44-transparent-detail-overlay | func |
| `setZT` | 12868 | denn-v36-3-dynamic-frame-text-fields-admin | window |
| `setZePreviewZoom` | 13319 | denn-v36-4-frame-template-tools | window |
| `settingFor` | 5232 | denn-v35-guide-bg-detail-modal-final | func |
| `settle` | 13719 | denn-current-detail-preview-stability | func |
| `settleAll` | 10736 | denn-v84-white-border-flicker-lock | func |
| `settleBuilderWhite` | 10712 | denn-v84-white-border-flicker-lock | func |
| `settleSeries` | 13736 | denn-current-detail-preview-stability | func |
| `setupText` | 5574 | denn-v35-guide-bg-card-ui-polish | func |
| `side` | 9561 | denn-v74-frame-builder-visible-panel-stabilizer | func |
| `signature` | 5674 | denn-v35-admin-data-safety-final | func |
| `sizeAllowsClock` | 9280 | denn-v71-frame-builder-preview-stability | func |
| `sizeByKey` | 6796 | denn-v40-builder-render-rules | func |
| `sizeClock` | 4731 | denn-v35-frame-builder-size-clock-sync | func |
| `sizeClockEnabled` | 6108 | denn-v35-frame-builder-size-clock-link-final | func |
| `sizeClockValue` | 6109 | denn-v35-frame-builder-size-clock-link-final | func |
| `sizeDims` | 6033 | denn-v35-frame-builder-clean-export-final | func |
| `sizeIndexFor` | 11825 | denn-v94-frame-template-edit-mode | func |
| `sizeKey` | 13061 | denn-v36-4-frame-template-tools | func |
| `sizeLabel` | 8501 | denn-v56-canonical-save-detail | func |
| `sizeList` | 9164 | denn-v70-hide-builtin-frame-templates | func |
| `sizeMatches` | 13081 | denn-v36-4-frame-template-tools | func |
| `sizeOptions` | 5245 | denn-v35-guide-bg-detail-modal-final | func |
| `sizeRatio` | 3955 | denn-v32-admin-stable | func |
| `sizes` | 13056 | denn-v36-4-frame-template-tools | func |
| `snap` | 13705 | denn-current-detail-preview-stability | func |
| `stabilize` | 12237 | denn-v95-frame-template-list-ui-stabilize | func |
| `stabilizeCard` | 12212 | denn-v95-frame-template-list-ui-stabilize | func |
| `stabilizeDetail` | 8384 | denn-v55-three-issue-stabilize | func |
| `stabilizePanel` | 9577 | denn-v74-frame-builder-visible-panel-stabilizer | func |
| `stabilizeWhiteBorderControl` | 3027 | denn-v12-admin-js | func |
| `stablePersist` | 12289 | denn-v35-stabilized-save-authority | func |
| `stableZeBind` | 4568 | denn-v35-detail-size-selector | var |
| `stamp` | 5698 | denn-v35-admin-data-safety-final | func |
| `start` | 11451 | denn-v91-white-label-final-lock | func |
| `state` | 10074 | denn-v79b-room-common-default-card-visible | func |
| `statusOptions` | 12451 | denn-v36-order-admin-bulk | func |
| `sub` | 6404 | denn-v37-size-save-controller-final | var |
| `submitSize` | 6433 | denn-v37-size-save-controller-final | func |
| `summary` | 5662 | denn-v35-admin-data-safety-final | func |
| `swapWH` | 4426 | denn-v35-size-input-height-width-final | window |
| `sweep` | 13643 | denn-current-admin-stability-sweep | func |
| `switchBuilderPreview` | 6619 | denn-v38-multi-size-checkbox | func |
| `switchFCat` | 13294 | denn-v36-4-frame-template-tools | window |
| `switchOn` | 8778 | denn-v61-frame-template-save-authority | func |
| `sync` | 9107 | denn-v69-initial-size-toggle-sync | func |
| `syncArtPreview` | 11877 | denn-v94-frame-template-edit-mode | func |
| `syncBanner` | 11904 | denn-v94-frame-template-edit-mode | func |
| `syncBgFromEdit` | 13203 | denn-v36-4-frame-template-tools | func |
| `syncBuilderBgInputs` | 13170 | denn-v36-4-frame-template-tools | func |
| `syncBuilderBgUi` | 13163 | denn-v36-4-frame-template-tools | func |
| `syncButtonFromSelected` | 5819 | denn-v35-admin-data-safety-final | func |
| `syncCanvasCss` | 4299 | denn-v34-frame-builder-crisp-render | func |
| `syncClockControls` | 9082 | denn-v69-initial-size-toggle-sync | func |
| `syncClockToggle` | 9283 | denn-v71-frame-builder-preview-stability | func |
| `syncCurrentFlagsFromButtons` | 7454 | denn-v48-final-size-stability | func |
| `syncDetail` | 7150 | denn-v44-transparent-detail-overlay | func |
| `syncDetailCanvas` | 7258 | denn-v45-design-canvas-only | func |
| `syncDetailCopy` | 7287 | denn-v45-design-canvas-only | func |
| `syncEnabledToggle` | 11204 | denn-v87-name2-textbox-toggle | func |
| `syncFromSize` | 6250 | denn-v36-size-frame-enabled-admin-final | func |
| `syncGlobals` | 12709 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `syncGuideOverlay` | 13272 | denn-v36-4-frame-template-tools | func |
| `syncManagerInputs` | 12773 | denn-v36-3-dynamic-frame-text-fields-admin | func |
| `syncModelFromControls` | 9684 | denn-v76-ui-settings-save-authority | func |
| `syncSaveButtonLabel` | 11911 | denn-v94-frame-template-edit-mode | func |
| `syncSelected` | 5433 | denn-v35-clock-onoff-selection-sync-final | func |
| `syncSizeCanvas` | 7050 | denn-v44-transparent-detail-overlay | func |
| `syncSizeControls` | 3697 | denn-v23-admin-js | func |
| `syncUIFromV32` | 3983 | denn-v32-admin-stable | func |
| `syncUIFromV33` | 4074 | denn-v33-admin-stable | func |
| `syncUIRange` | 2779 | denn-v5-ui-settings-script | window |
| `syncUISettings` | 3704 | denn-v23-admin-js | func |
| `syncUi` | 3734 | denn-v25-admin-ui-persist | func |
| `syncWhiteForSave` | 7136 | denn-v44-transparent-detail-overlay | func |
| `syncWhiteMeta` | 8017 | denn-v53-detail-link-stability | func |
| `syncWhitePanel` | 7065 | denn-v44-transparent-detail-overlay | func |
| `targetLabel` | 9186 | denn-v70-hide-builtin-frame-templates | func |
| `targetValues` | 11809 | denn-v94-frame-template-edit-mode | func |
| `templateBg` | 13157 | denn-v36-4-frame-template-tools | func |
| `templateRatio` | 7232 | denn-v45-design-canvas-only | func |
| `templateSizeTarget` | 4479 | denn-v35-detail-size-selector | func |
| `templateSizes` | 13072 | denn-v36-4-frame-template-tools | func |
| `templates` | 13055 | denn-v36-4-frame-template-tools | func |
| `textDraw` | 11253 | denn-v87-name2-textbox-toggle | window |
| `th` | 8724 | denn-v59-builder-capture-union | var |
| `tick` | 10182 | denn-v79d-common-default-open-authority | func |
| `tidyCards` | 3202 | denn-v14-admin-js | func |
| `tidyTemplateCards` | 13635 | denn-current-admin-stability-sweep | func |
| `tidyUiSettings` | 13625 | denn-current-admin-stability-sweep | func |
| `toast` | 10259 | denn-v80-frame-builder-clock-preset-and-render-guard | func |
| `toast2` | 3427 | denn-v18-admin-stability | func |
| `toastMsg` | 11786 | denn-v94-frame-template-edit-mode | func |
| `toastSafe` | 7033 | denn-v44-transparent-detail-overlay | func |
| `tog` | 8722 | denn-v59-builder-capture-union | var |
| `toggle` | 11621 | denn-v93-frame-template-bulk-category | func |
| `toggleFrameTemplateWhiteBorderV10` | 2986 | denn-v11-admin-js | window |
| `toggleSizeClockEnabled` | 7502 | denn-v48-final-size-stability | window |
| `toggleSizeFrameEnabled` | 7503 | denn-v48-final-size-stability | window |
| `toggleWatermark` | 5955 | denn-v35-watermark-live-preview-final | window |
| `tpl` | 7576 | denn-v50-detail-builder-sync | func |
| `tplArr` | 12915 | denn-v36-3-frame-template-parity-admin | func |
| `tplMargin` | 3655 | denn-v22-admin-js | func |
| `txt` | 10930 | denn-v85-frame-template-card-layout-lock | var |
| `uniq` | 11804 | denn-v94-frame-template-edit-mode | func |
| `updBg` | 4120 | denn-v33-admin-stable | func |
| `updateClockPreset` | 4653 | denn-v35-size-list-live-preview-clock-presets | window |
| `updateClockPresetFinal` | 4875 | denn-v35-size-list-live-stabilizer-final | window |
| `updateClockUploadUI` | 3693 | denn-v23-admin-js | func |
| `updateDennOrderStatusV36` | 12316 | denn-v36-order-admin-js | window |
| `updatePanel` | 5719 | denn-v35-admin-data-safety-final | func |
| `updateSz` | 2789 | denn-v5-ui-settings-script | window |
| `uploadClockImg` | 3690 | denn-v23-admin-js | window |
| `uploadGuides` | 13240 | denn-v36-4-frame-template-tools | func |
| `uploadWatermark` | 5956 | denn-v35-watermark-live-preview-final | window |
| `usefulSetting` | 5216 | denn-v35-guide-bg-detail-modal-final | func |
| `val` | 2984 | denn-v11-admin-js | var |
| `valid` | 9056 | denn-v69-initial-size-toggle-sync | func |
| `validColor` | 13054 | denn-v36-4-frame-template-tools | func |
| `validIdx` | 6355 | denn-v37-size-save-controller-final | func |
| `visible` | 13606 | denn-current-admin-stability-sweep | func |
| `visibleBase` | 13093 | denn-v36-4-frame-template-tools | func |
| `visibleNode` | 8818 | denn-v61-frame-template-save-authority | func |
| `visibleTemplates` | 11817 | denn-v94-frame-template-edit-mode | func |
| `w` | 6805 | denn-v40-builder-render-rules | var |
| `watchFrameNote` | 4188 | denn-v33-admin-finalize | func |
| `whiteState` | 9315 | denn-v71-frame-builder-preview-stability | func |
| `wireSizeList` | 4846 | denn-v35-size-list-live-stabilizer-final | func |
| `withFormSize` | 4370 | denn-v35-size-input-height-width-final | func |
| `wrap` | 13690 | denn-current-detail-preview-stability | func |
| `wrapAll` | 13280 | denn-v36-4-frame-template-tools | func |
| `wrapDetailSave` | 6606 | denn-v38-multi-size-checkbox | func |
| `wrapPersist` | 5740 | denn-v35-admin-data-safety-final | func |
| `wrapSave` | 12969 | denn-v36-3-frame-template-parity-admin | func |
| `wrapped` | 12548 | denn-v36-order-admin-bulk | var |
| `wrappedFb` | 13459 | denn-v36-5-admin-render-stability | var |
| `wrappedOpen` | 4578 | denn-v35-detail-size-selector | var |
| `wrappedSaveAll` | 12299 | denn-v35-stabilized-save-authority | var |
| `writeControlsFromModel` | 9696 | denn-v76-ui-settings-save-authority | func |
| `writeFrameFlag` | 6255 | denn-v36-size-frame-enabled-admin-final | func |
| `writeSize` | 7407 | denn-v48-final-size-stability | func |
| `writeSnaps` | 5679 | denn-v35-admin-data-safety-final | func |
| `writeTargets` | 8835 | denn-v61-frame-template-save-authority | func |
| `zeBindEvents` | 13388 | denn-v36-5-admin-render-stability | window |
| `zeDefaultTexts` | 12842 | denn-v36-3-dynamic-frame-text-fields-admin | window |
| `zeRender` | 13314 | denn-v36-4-frame-template-tools | window |
| `zeRenderList` | 13373 | denn-v36-5-admin-render-stability | window |
| `zone` | 13403 | denn-v36-5-admin-render-stability | var |
| `zonePath` | 9304 | denn-v71-frame-builder-preview-stability | func |
| `zoneRadiusPx` | 6046 | denn-v35-frame-builder-clean-export-final | func |
| `zones` | 7261 | denn-v45-design-canvas-only | var |
| `zonesFromTemplate` | 11870 | denn-v94-frame-template-edit-mode | func |
| `zoom` | 13776 | denn-current-detail-preview-stability | var |

## Dead-code candidates — function definitions overridden later

Total: 1021 overridden function definitions.

| Function | Dead line | Dead block | Winner line | Winner block |
|---|---|---|---|---|
| `fbSelectSize` | 2744 | denn-final-js | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `fbRender` | 2745 | denn-final-js | 13299 | denn-v36-4-frame-template-tools |
| `initFrameBuilder` | 2746 | denn-final-js | 11102 | denn-v86-builder-white-immediate-authority |
| `clamp` | 2775 | denn-v5-ui-settings-script | 13692 | denn-current-detail-preview-stability |
| `val` | 2777 | denn-v5-ui-settings-script | 2984 | denn-v11-admin-js |
| `row` | 2781 | denn-v5-ui-settings-script | 2891 | denn-v6-admin-js |
| `buildPanel` | 2782 | denn-v5-ui-settings-script | 3207 | denn-v14-admin-js |
| `load` | 2784 | denn-v5-ui-settings-script | 3721 | denn-v24-admin-fb-raw-clock |
| `saveAll` | 2785 | denn-v5-ui-settings-script | 6002 | denn-v35-watermark-live-preview-final |
| `renderFrames` | 2787 | denn-v5-ui-settings-script | 8979 | denn-v67-size-status-labels |
| `editSz` | 2788 | denn-v5-ui-settings-script | 7485 | denn-v48-final-size-stability |
| `addSz` | 2790 | denn-v5-ui-settings-script | 7492 | denn-v48-final-size-stability |
| `initFrameBuilder` | 2792 | denn-v5-ui-settings-script | 11102 | denn-v86-builder-white-immediate-authority |
| `fbSelectSize` | 2793 | denn-v5-ui-settings-script | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `renderSzPreview` | 2794 | denn-v5-ui-settings-script | 6330 | denn-v36-size-frame-enabled-admin-final |
| `n` | 2815 | denn-v6-admin-js | 9671 | denn-v76-ui-settings-save-authority |
| `drawDennClockImage` | 2816 | denn-v6-admin-js | 3022 | denn-v12-admin-js |
| `renderSzPreview` | 2832 | denn-v6-admin-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `uploadClockImg` | 2857 | denn-v6-admin-js | 3690 | denn-v23-admin-js |
| `applyClockPreset` | 2868 | denn-v6-admin-js | 10298 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `saveClockPresetFromPreview` | 2872 | denn-v6-admin-js | 4874 | denn-v35-size-list-live-stabilizer-final |
| `loadClockPreset` | 2878 | denn-v6-admin-js | 4872 | denn-v35-size-list-live-stabilizer-final |
| `renderClockPresetList` | 2879 | denn-v6-admin-js | 4894 | denn-v35-size-list-live-stabilizer-final |
| `addClockTools` | 2880 | denn-v6-admin-js | 3023 | denn-v12-admin-js |
| `renderFrames` | 2894 | denn-v6-admin-js | 8979 | denn-v67-size-status-labels |
| `goTab` | 2896 | denn-v6-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `num` | 2912 | denn-v10-safe-js | 13688 | denn-current-detail-preview-stability |
| `toggleFrameTemplateWhiteBorderV10` | 2943 | denn-v10-safe-js | 2986 | denn-v11-admin-js |
| `processFTpls` | 2946 | denn-v10-safe-js | 4235 | denn-v34-admin-frame-upload-stable |
| `fbRender` | 2947 | denn-v10-safe-js | 13299 | denn-v36-4-frame-template-tools |
| `fbExport` | 2948 | denn-v10-safe-js | 13304 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 2949 | denn-v10-safe-js | 13284 | denn-v36-4-frame-template-tools |
| `renderSzPreview` | 2950 | denn-v10-safe-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `goTab` | 2951 | denn-v10-safe-js | 13324 | denn-v36-4-frame-template-tools |
| `saveAll` | 2952 | denn-v10-safe-js | 6002 | denn-v35-watermark-live-preview-final |
| `num` | 2968 | denn-v11-admin-js | 13688 | denn-current-detail-preview-stability |
| `getClockSrc` | 2969 | denn-v11-admin-js | 3049 | denn-v13-admin-js |
| `loadImg` | 2970 | denn-v11-admin-js | 4060 | denn-v33-admin-stable |
| `drawDennClockImage` | 2972 | denn-v11-admin-js | 3022 | denn-v12-admin-js |
| `uploadClockImg` | 2976 | denn-v11-admin-js | 3690 | denn-v23-admin-js |
| `clearClockImg` | 2977 | denn-v11-admin-js | 3691 | denn-v23-admin-js |
| `renderSzPreview` | 2978 | denn-v11-admin-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `fbRender` | 2979 | denn-v11-admin-js | 13299 | denn-v36-4-frame-template-tools |
| `drawBuilderWhiteOverlayV11` | 2982 | denn-v11-admin-js | 7542 | denn-v49-render-authority-lock |
| `fbExport` | 2983 | denn-v11-admin-js | 13304 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 2987 | denn-v11-admin-js | 13284 | denn-v36-4-frame-template-tools |
| `goTab` | 2988 | denn-v11-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `persist` | 3017 | denn-v12-admin-js | 11787 | denn-v94-frame-template-edit-mode |
| `num` | 3018 | denn-v12-admin-js | 13688 | denn-current-detail-preview-stability |
| `loadImage` | 3019 | denn-v12-admin-js | 3352 | denn-v17-admin-js |
| `cleanCurrentClockImageV12` | 3024 | denn-v12-admin-js | 3195 | denn-v14-admin-js |
| `uploadClockImg` | 3025 | denn-v12-admin-js | 3690 | denn-v23-admin-js |
| `goTab` | 3029 | denn-v12-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `buildPanel` | 3030 | denn-v12-admin-js | 3207 | denn-v14-admin-js |
| `fbRender` | 3031 | denn-v12-admin-js | 13299 | denn-v36-4-frame-template-tools |
| `num` | 3047 | denn-v13-admin-js | 13688 | denn-current-detail-preview-stability |
| `by` | 3048 | denn-v13-admin-js | 13686 | denn-current-detail-preview-stability |
| `loadImg` | 3051 | denn-v13-admin-js | 4060 | denn-v33-admin-stable |
| `uploadClockImg` | 3069 | denn-v13-admin-js | 3690 | denn-v23-admin-js |
| `cleanCurrentClockImageV12` | 3085 | denn-v13-admin-js | 3195 | denn-v14-admin-js |
| `renderSzPreview` | 3087 | denn-v13-admin-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `fbRender` | 3109 | denn-v13-admin-js | 13299 | denn-v36-4-frame-template-tools |
| `addSz` | 3138 | denn-v13-admin-js | 7492 | denn-v48-final-size-stability |
| `confirmEditSz` | 3140 | denn-v13-admin-js | 7487 | denn-v48-final-size-stability |
| `by` | 3179 | denn-v14-admin-js | 13686 | denn-current-detail-preview-stability |
| `num` | 3180 | denn-v14-admin-js | 13688 | denn-current-detail-preview-stability |
| `persist` | 3181 | denn-v14-admin-js | 11787 | denn-v94-frame-template-edit-mode |
| `loadImage` | 3182 | denn-v14-admin-js | 3352 | denn-v17-admin-js |
| `drawClock` | 3188 | denn-v14-admin-js | 3723 | denn-v24-admin-fb-raw-clock |
| `uploadClockImg` | 3192 | denn-v14-admin-js | 3690 | denn-v23-admin-js |
| `drawBuilderWhiteOverlayV11` | 3197 | denn-v14-admin-js | 7542 | denn-v49-render-authority-lock |
| `fbRender` | 3200 | denn-v14-admin-js | 13299 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 3203 | denn-v14-admin-js | 13284 | denn-v36-4-frame-template-tools |
| `goTab` | 3206 | denn-v14-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3238 | denn-v14-admin-js | 13686 | denn-current-detail-preview-stability |
| `num` | 3239 | denn-v14-admin-js | 13688 | denn-current-detail-preview-stability |
| `persist` | 3240 | denn-v14-admin-js | 11787 | denn-v94-frame-template-edit-mode |
| `loadImg` | 3243 | denn-v14-admin-js | 4060 | denn-v33-admin-stable |
| `uploadClockImg` | 3250 | denn-v14-admin-js | 3690 | denn-v23-admin-js |
| `paintClock` | 3253 | denn-v14-admin-js | 7379 | denn-v48-final-size-stability |
| `openZoneEditor` | 3261 | denn-v14-admin-js | 13309 | denn-v36-4-frame-template-tools |
| `zeRender` | 3262 | denn-v14-admin-js | 13314 | denn-v36-4-frame-template-tools |
| `saveZones` | 3263 | denn-v14-admin-js | 12848 | denn-v36-3-dynamic-frame-text-fields-admin |
| `saveZonesOnly` | 3264 | denn-v14-admin-js | 12858 | denn-v36-3-dynamic-frame-text-fields-admin |
| `drawBuilderWhiteOverlayV11` | 3266 | denn-v14-admin-js | 7542 | denn-v49-render-authority-lock |
| `fbRender` | 3268 | denn-v14-admin-js | 13299 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 3270 | denn-v14-admin-js | 13284 | denn-v36-4-frame-template-tools |
| `goTab` | 3271 | denn-v14-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3297 | denn-v16-admin-js | 13686 | denn-current-detail-preview-stability |
| `n` | 3298 | denn-v16-admin-js | 9671 | denn-v76-ui-settings-save-authority |
| `persist` | 3299 | denn-v16-admin-js | 11787 | denn-v94-frame-template-edit-mode |
| `toastSafe` | 3300 | denn-v16-admin-js | 7033 | denn-v44-transparent-detail-overlay |
| `uploadClockImg` | 3305 | denn-v16-admin-js | 3690 | denn-v23-admin-js |
| `renderSzPreview` | 3306 | denn-v16-admin-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `saveClockPreset` | 3307 | denn-v16-admin-js | 4873 | denn-v35-size-list-live-stabilizer-final |
| `updateClockPreset` | 3308 | denn-v16-admin-js | 4653 | denn-v35-size-list-live-preview-clock-presets |
| `deleteClockPreset` | 3309 | denn-v16-admin-js | 4659 | denn-v35-size-list-live-preview-clock-presets |
| `renderClockPresetList` | 3310 | denn-v16-admin-js | 4894 | denn-v35-size-list-live-stabilizer-final |
| `drawBuilderWhiteOverlayV11` | 3311 | denn-v16-admin-js | 7542 | denn-v49-render-authority-lock |
| `renderFrames` | 3312 | denn-v16-admin-js | 8979 | denn-v67-size-status-labels |
| `by` | 3348 | denn-v17-admin-js | 13686 | denn-current-detail-preview-stability |
| `num` | 3349 | denn-v17-admin-js | 13688 | denn-current-detail-preview-stability |
| `save` | 3350 | denn-v17-admin-js | 11571 | denn-v93-frame-template-bulk-category |
| `msg` | 3351 | denn-v17-admin-js | 3499 | denn-v19-admin-stability |
| `p` | 3360 | denn-v17-admin-js | 3511 | denn-v19-admin-stability |
| `installClockUI` | 3380 | denn-v17-admin-js | 3541 | denn-v19-admin-stability |
| `uploadClockImg` | 3389 | denn-v17-admin-js | 3690 | denn-v23-admin-js |
| `renderSzPreview` | 3395 | denn-v17-admin-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `fbRender` | 3397 | denn-v17-admin-js | 13299 | denn-v36-4-frame-template-tools |
| `installFrameUploadNote` | 3399 | denn-v17-admin-js | 4144 | denn-v33-admin-stable |
| `processFTpls` | 3400 | denn-v17-admin-js | 4235 | denn-v34-admin-frame-upload-stable |
| `renderFrames` | 3405 | denn-v17-admin-js | 8979 | denn-v67-size-status-labels |
| `goTab` | 3406 | denn-v17-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3425 | denn-v18-admin-stability | 13686 | denn-current-detail-preview-stability |
| `save` | 3426 | denn-v18-admin-stability | 11571 | denn-v93-frame-template-bulk-category |
| `loadImg` | 3428 | denn-v18-admin-stability | 4060 | denn-v33-admin-stable |
| `uploadClockImg` | 3464 | denn-v18-admin-stability | 3690 | denn-v23-admin-js |
| `renderSzPreview` | 3476 | denn-v18-admin-stability | 6330 | denn-v36-size-frame-enabled-admin-final |
| `fbRender` | 3478 | denn-v18-admin-stability | 13299 | denn-v36-4-frame-template-tools |
| `goTab` | 3480 | denn-v18-admin-stability | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3498 | denn-v19-admin-stability | 13686 | denn-current-detail-preview-stability |
| `save` | 3500 | denn-v19-admin-stability | 11571 | denn-v93-frame-template-bulk-category |
| `load` | 3501 | denn-v19-admin-stability | 3721 | denn-v24-admin-fb-raw-clock |
| `uploadClockImg` | 3538 | denn-v19-admin-stability | 3690 | denn-v23-admin-js |
| `renderSzPreview` | 3556 | denn-v19-admin-stability | 6330 | denn-v36-size-frame-enabled-admin-final |
| `fbRender` | 3557 | denn-v19-admin-stability | 13299 | denn-v36-4-frame-template-tools |
| `installFrameUploadNote` | 3558 | denn-v19-admin-stability | 4144 | denn-v33-admin-stable |
| `goTab` | 3559 | denn-v19-admin-stability | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3576 | denn-v20-admin-js | 13686 | denn-current-detail-preview-stability |
| `num` | 3577 | denn-v20-admin-js | 13688 | denn-current-detail-preview-stability |
| `saveSoft` | 3578 | denn-v20-admin-js | 13096 | denn-v36-4-frame-template-tools |
| `rawClockSrc` | 3579 | denn-v20-admin-js | 3685 | denn-v23-admin-js |
| `uploadClockImg` | 3618 | denn-v20-admin-js | 3690 | denn-v23-admin-js |
| `drawPreviewClock` | 3622 | denn-v20-admin-js | 4061 | denn-v33-admin-stable |
| `goTab` | 3624 | denn-v20-admin-js | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3633 | denn-v21-admin-clock-ui | 13686 | denn-current-detail-preview-stability |
| `goTab` | 3635 | denn-v21-admin-clock-ui | 13324 | denn-v36-4-frame-template-tools |
| `by` | 3651 | denn-v22-admin-js | 13686 | denn-current-detail-preview-stability |
| `num` | 3652 | denn-v22-admin-js | 13688 | denn-current-detail-preview-stability |
| `clamp` | 3653 | denn-v22-admin-js | 13692 | denn-current-detail-preview-stability |
| `saveSoft` | 3654 | denn-v22-admin-js | 13096 | denn-v36-4-frame-template-tools |
| `by` | 3680 | denn-v23-admin-js | 13686 | denn-current-detail-preview-stability |
| `num` | 3681 | denn-v23-admin-js | 13688 | denn-current-detail-preview-stability |
| `clamp` | 3682 | denn-v23-admin-js | 13692 | denn-current-detail-preview-stability |
| `saveSoft` | 3683 | denn-v23-admin-js | 13096 | denn-v36-4-frame-template-tools |
| `loadImg` | 3686 | denn-v23-admin-js | 4060 | denn-v33-admin-stable |
| `drawPreviewClock` | 3689 | denn-v23-admin-js | 4061 | denn-v33-admin-stable |
| `setVal` | 3696 | denn-v23-admin-js | 11860 | denn-v94-frame-template-edit-mode |
| `renderSzPreview` | 3699 | denn-v23-admin-js | 6330 | denn-v36-size-frame-enabled-admin-final |
| `previewSz` | 3700 | denn-v23-admin-js | 6320 | denn-v36-size-frame-enabled-admin-final |
| `editSz` | 3701 | denn-v23-admin-js | 7485 | denn-v48-final-size-stability |
| `addSz` | 3702 | denn-v23-admin-js | 7492 | denn-v48-final-size-stability |
| `confirmEditSz` | 3703 | denn-v23-admin-js | 7487 | denn-v48-final-size-stability |
| `by` | 3718 | denn-v24-admin-fb-raw-clock | 13686 | denn-current-detail-preview-stability |
| `num` | 3719 | denn-v24-admin-fb-raw-clock | 13688 | denn-current-detail-preview-stability |
| `clockCfg` | 3720 | denn-v24-admin-fb-raw-clock | 8827 | denn-v61-frame-template-save-authority |
| `rr` | 3724 | denn-v24-admin-fb-raw-clock | 9296 | denn-v71-frame-builder-preview-stability |
| `fbRender` | 3725 | denn-v24-admin-fb-raw-clock | 13299 | denn-v36-4-frame-template-tools |
| `by` | 3732 | denn-v25-admin-ui-persist | 13686 | denn-current-detail-preview-stability |
| `n` | 3733 | denn-v25-admin-ui-persist | 9671 | denn-v76-ui-settings-save-authority |
| `by` | 3748 | denn-v26-admin-ui-dedupe-js | 13686 | denn-current-detail-preview-stability |
| `by` | 3767 | denn-v27-admin-js | 13686 | denn-current-detail-preview-stability |
| `n` | 3768 | denn-v27-admin-js | 9671 | denn-v76-ui-settings-save-authority |
| `saveSoft` | 3769 | denn-v27-admin-js | 13096 | denn-v36-4-frame-template-tools |
| `saveZonesOnly` | 3774 | denn-v27-admin-js | 12858 | denn-v36-3-dynamic-frame-text-fields-admin |
| `by` | 3795 | denn-v29-admin-js | 13686 | denn-current-detail-preview-stability |
| `n` | 3796 | denn-v29-admin-js | 9671 | denn-v76-ui-settings-save-authority |
| `sizeRatio` | 3797 | denn-v29-admin-js | 3955 | denn-v32-admin-stable |
| `rr` | 3798 | denn-v29-admin-js | 9296 | denn-v71-frame-builder-preview-stability |
| `by` | 3825 | denn-v32-admin-stable | 13686 | denn-current-detail-preview-stability |
| `n` | 3826 | denn-v32-admin-stable | 9671 | denn-v76-ui-settings-save-authority |
| `clamp` | 3827 | denn-v32-admin-stable | 13692 | denn-current-detail-preview-stability |
| `esc` | 3828 | denn-v32-admin-stable | 13052 | denn-v36-4-frame-template-tools |
| `saveNow` | 3829 | denn-v32-admin-stable | 8677 | denn-v59-builder-capture-union |
| `clockBase` | 3830 | denn-v32-admin-stable | 6101 | denn-v35-frame-builder-size-clock-link-final |
| `parseSub` | 3831 | denn-v32-admin-stable | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 3832 | denn-v32-admin-stable | 9263 | denn-v71-frame-builder-preview-stability |
| `normalizeSize` | 3841 | denn-v32-admin-stable | 6043 | denn-v35-frame-builder-clean-export-final |
| `normalizeAllSizes` | 3858 | denn-v32-admin-stable | 4049 | denn-v33-admin-stable |
| `formDims` | 3859 | denn-v32-admin-stable | 7396 | denn-v48-final-size-stability |
| `cfgFromInputs` | 3860 | denn-v32-admin-stable | 4360 | denn-v35-size-input-height-width-final |
| `setVal` | 3870 | denn-v32-admin-stable | 11860 | denn-v94-frame-template-edit-mode |
| `applySizeToForm` | 3871 | denn-v32-admin-stable | 4058 | denn-v33-admin-stable |
| `selectedSizeOrDefault` | 3884 | denn-v32-admin-stable | 4057 | denn-v33-admin-stable |
| `drawDigital` | 3889 | denn-v32-admin-stable | 4059 | denn-v33-admin-stable |
| `loadImg` | 3890 | denn-v32-admin-stable | 4060 | denn-v33-admin-stable |
| `drawPreviewClock` | 3891 | denn-v32-admin-stable | 4061 | denn-v33-admin-stable |
| `renderSzPreview` | 3897 | denn-v32-admin-stable | 6330 | denn-v36-size-frame-enabled-admin-final |
| `previewSz` | 3914 | denn-v32-admin-stable | 6320 | denn-v36-size-frame-enabled-admin-final |
| `editSz` | 3915 | denn-v32-admin-stable | 7485 | denn-v48-final-size-stability |
| `confirmEditSz` | 3916 | denn-v32-admin-stable | 7487 | denn-v48-final-size-stability |
| `addSz` | 3922 | denn-v32-admin-stable | 7492 | denn-v48-final-size-stability |
| `name` | 3924 | denn-v32-admin-stable | 6403 | denn-v37-size-save-controller-final |
| `swapWH` | 3929 | denn-v32-admin-stable | 4426 | denn-v35-size-input-height-width-final |
| `renderFrames` | 3931 | denn-v32-admin-stable | 8979 | denn-v67-size-status-labels |
| `renderFTplsByCategory` | 3940 | denn-v32-admin-stable | 13284 | denn-v36-4-frame-template-tools |
| `arr` | 3946 | denn-v32-admin-stable | 13051 | denn-v36-4-frame-template-tools |
| `installFrameUploadNote` | 3951 | denn-v32-admin-stable | 4144 | denn-v33-admin-stable |
| `processFTpls` | 3953 | denn-v32-admin-stable | 4235 | denn-v34-admin-frame-upload-stable |
| `loadSizeToBuilder` | 3956 | denn-v32-admin-stable | 4069 | denn-v33-admin-stable |
| `fbSelectSize` | 3966 | denn-v32-admin-stable | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `fbRender` | 3967 | denn-v32-admin-stable | 13299 | denn-v36-4-frame-template-tools |
| `fbExport` | 3970 | denn-v32-admin-stable | 13304 | denn-v36-4-frame-template-tools |
| `name` | 3972 | denn-v32-admin-stable | 6403 | denn-v37-size-save-controller-final |
| `pair` | 3988 | denn-v32-admin-stable | 4092 | denn-v33-admin-stable |
| `saveAll` | 3994 | denn-v32-admin-stable | 6002 | denn-v35-watermark-live-preview-final |
| `installFrameSizeUI` | 3995 | denn-v32-admin-stable | 4145 | denn-v33-admin-stable |
| `goTab` | 4003 | denn-v32-admin-stable | 13324 | denn-v36-4-frame-template-tools |
| `by` | 4038 | denn-v33-admin-stable | 13686 | denn-current-detail-preview-stability |
| `num` | 4039 | denn-v33-admin-stable | 13688 | denn-current-detail-preview-stability |
| `clamp` | 4040 | denn-v33-admin-stable | 13692 | denn-current-detail-preview-stability |
| `esc` | 4041 | denn-v33-admin-stable | 13052 | denn-v36-4-frame-template-tools |
| `saveNow` | 4042 | denn-v33-admin-stable | 8677 | denn-v59-builder-capture-union |
| `ensureRoots` | 4045 | denn-v33-admin-stable | 5213 | denn-v35-guide-bg-detail-modal-final |
| `parseSub` | 4046 | denn-v33-admin-stable | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 4047 | denn-v33-admin-stable | 9263 | denn-v71-frame-builder-preview-stability |
| `normalizeSize` | 4048 | denn-v33-admin-stable | 6043 | denn-v35-frame-builder-clean-export-final |
| `clockBase` | 4052 | denn-v33-admin-stable | 6101 | denn-v35-frame-builder-size-clock-link-final |
| `formDims` | 4053 | denn-v33-admin-stable | 7396 | denn-v48-final-size-stability |
| `setVal` | 4054 | denn-v33-admin-stable | 11860 | denn-v94-frame-template-edit-mode |
| `cfgFromInputs` | 4055 | denn-v33-admin-stable | 4360 | denn-v35-size-input-height-width-final |
| `sizeClock` | 4056 | denn-v33-admin-stable | 4731 | denn-v35-frame-builder-size-clock-sync |
| `renderSzPreview` | 4063 | denn-v33-admin-stable | 6330 | denn-v36-size-frame-enabled-admin-final |
| `previewSz` | 4064 | denn-v33-admin-stable | 6320 | denn-v36-size-frame-enabled-admin-final |
| `editSz` | 4065 | denn-v33-admin-stable | 7485 | denn-v48-final-size-stability |
| `confirmEditSz` | 4066 | denn-v33-admin-stable | 7487 | denn-v48-final-size-stability |
| `addSz` | 4067 | denn-v33-admin-stable | 7492 | denn-v48-final-size-stability |
| `swapWH` | 4068 | denn-v33-admin-stable | 4426 | denn-v35-size-input-height-width-final |
| `fbSelectSize` | 4071 | denn-v33-admin-stable | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `fbRender` | 4072 | denn-v33-admin-stable | 13299 | denn-v36-4-frame-template-tools |
| `fbExport` | 4073 | denn-v33-admin-stable | 13304 | denn-v36-4-frame-template-tools |
| `renderGuideBgs` | 4121 | denn-v33-admin-stable | 5595 | denn-v35-guide-bg-card-ui-polish |
| `processGuideBgs` | 4142 | denn-v33-admin-stable | 5295 | denn-v35-guide-bg-detail-modal-final |
| `delGuideBg` | 4143 | denn-v33-admin-stable | 5296 | denn-v35-guide-bg-detail-modal-final |
| `by` | 4157 | denn-v33-admin-finalize | 13686 | denn-current-detail-preview-stability |
| `num` | 4158 | denn-v33-admin-finalize | 13688 | denn-current-detail-preview-stability |
| `saveNow` | 4159 | denn-v33-admin-finalize | 8677 | denn-v59-builder-capture-union |
| `clockBase` | 4160 | denn-v33-admin-finalize | 6101 | denn-v35-frame-builder-size-clock-link-final |
| `norm` | 4163 | denn-v33-admin-finalize | 13053 | denn-v36-4-frame-template-tools |
| `setForm` | 4164 | denn-v33-admin-finalize | 4337 | denn-v35-size-input-height-width-final |
| `name` | 4169 | denn-v33-admin-finalize | 6403 | denn-v37-size-save-controller-final |
| `by` | 4197 | denn-v34-admin-frame-upload-stable | 13686 | denn-current-detail-preview-stability |
| `cats` | 4204 | denn-v34-admin-frame-upload-stable | 13057 | denn-v36-4-frame-template-tools |
| `by` | 4281 | denn-v34-frame-builder-crisp-render | 13686 | denn-current-detail-preview-stability |
| `num` | 4282 | denn-v34-frame-builder-crisp-render | 13688 | denn-current-detail-preview-stability |
| `toastMsg` | 4283 | denn-v34-frame-builder-crisp-render | 11786 | denn-v94-frame-template-edit-mode |
| `deep` | 4284 | denn-v34-frame-builder-crisp-render | 12914 | denn-v36-3-frame-template-parity-admin |
| `saveNow` | 4285 | denn-v34-frame-builder-crisp-render | 8677 | denn-v59-builder-capture-union |
| `parseSub` | 4286 | denn-v34-frame-builder-crisp-render | 9259 | denn-v71-frame-builder-preview-stability |
| `sizeDims` | 4287 | denn-v34-frame-builder-crisp-render | 6033 | denn-v35-frame-builder-clean-export-final |
| `normalizeSize` | 4288 | denn-v34-frame-builder-crisp-render | 6043 | denn-v35-frame-builder-clean-export-final |
| `selectedFrameSize` | 4290 | denn-v34-frame-builder-crisp-render | 6044 | denn-v35-frame-builder-clean-export-final |
| `rr` | 4291 | denn-v34-frame-builder-crisp-render | 9296 | denn-v71-frame-builder-preview-stability |
| `zoneRadiusPx` | 4292 | denn-v34-frame-builder-crisp-render | 6046 | denn-v35-frame-builder-clean-export-final |
| `drawSlotPath` | 4293 | denn-v34-frame-builder-crisp-render | 6047 | denn-v35-frame-builder-clean-export-final |
| `drawCover` | 4294 | denn-v34-frame-builder-crisp-render | 6048 | denn-v35-frame-builder-clean-export-final |
| `getClockCfg` | 4295 | denn-v34-frame-builder-crisp-render | 6049 | denn-v35-frame-builder-clean-export-final |
| `fbRender` | 4300 | denn-v34-frame-builder-crisp-render | 13299 | denn-v36-4-frame-template-tools |
| `fbExport` | 4301 | denn-v34-frame-builder-crisp-render | 13304 | denn-v36-4-frame-template-tools |
| `init` | 4302 | denn-v34-frame-builder-crisp-render | 7505 | denn-v48-final-size-stability |
| `by` | 4310 | denn-v35-size-input-height-width-final | 13686 | denn-current-detail-preview-stability |
| `num` | 4311 | denn-v35-size-input-height-width-final | 13688 | denn-current-detail-preview-stability |
| `fmt` | 4312 | denn-v35-size-input-height-width-final | 8500 | denn-v56-canonical-save-detail |
| `saveNow` | 4313 | denn-v35-size-input-height-width-final | 8677 | denn-v59-builder-capture-union |
| `readForm` | 4314 | denn-v35-size-input-height-width-final | 7397 | denn-v48-final-size-stability |
| `parseSub` | 4315 | denn-v35-size-input-height-width-final | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 4316 | denn-v35-size-input-height-width-final | 9263 | denn-v71-frame-builder-preview-stability |
| `normalizeSize` | 4324 | denn-v35-size-input-height-width-final | 6043 | denn-v35-frame-builder-clean-export-final |
| `clockBase` | 4344 | denn-v35-size-input-height-width-final | 6101 | denn-v35-frame-builder-size-clock-link-final |
| `syncClockControls` | 4350 | denn-v35-size-input-height-width-final | 9082 | denn-v69-initial-size-toggle-sync |
| `fit` | 4378 | denn-v35-size-input-height-width-final | 9291 | denn-v71-frame-builder-preview-stability |
| `renderSzPreview` | 4387 | denn-v35-size-input-height-width-final | 6330 | denn-v36-size-frame-enabled-admin-final |
| `previewSz` | 4402 | denn-v35-size-input-height-width-final | 6320 | denn-v36-size-frame-enabled-admin-final |
| `addSz` | 4403 | denn-v35-size-input-height-width-final | 7492 | denn-v48-final-size-stability |
| `name` | 4405 | denn-v35-size-input-height-width-final | 6403 | denn-v37-size-save-controller-final |
| `confirmEditSz` | 4410 | denn-v35-size-input-height-width-final | 7487 | denn-v48-final-size-stability |
| `editSz` | 4419 | denn-v35-size-input-height-width-final | 7485 | denn-v48-final-size-stability |
| `by` | 4452 | denn-v35-detail-size-selector | 13686 | denn-current-detail-preview-stability |
| `n` | 4453 | denn-v35-detail-size-selector | 9671 | denn-v76-ui-settings-save-authority |
| `esc` | 4454 | denn-v35-detail-size-selector | 13052 | denn-v36-4-frame-template-tools |
| `fmt` | 4455 | denn-v35-detail-size-selector | 8500 | denn-v56-canonical-save-detail |
| `saveSoft` | 4456 | denn-v35-detail-size-selector | 13096 | denn-v36-4-frame-template-tools |
| `parseSub` | 4458 | denn-v35-detail-size-selector | 9259 | denn-v71-frame-builder-preview-stability |
| `sizeDims` | 4459 | denn-v35-detail-size-selector | 6033 | denn-v35-frame-builder-clean-export-final |
| `sizeKey` | 4472 | denn-v35-detail-size-selector | 13061 | denn-v36-4-frame-template-tools |
| `arr` | 4474 | denn-v35-detail-size-selector | 13051 | denn-v36-4-frame-template-tools |
| `currentTpl` | 4478 | denn-v35-detail-size-selector | 13218 | denn-v36-4-frame-template-tools |
| `key` | 4504 | denn-v35-detail-size-selector | 11784 | denn-v94-frame-template-edit-mode |
| `bwPx` | 4540 | denn-v35-detail-size-selector | 7104 | denn-v44-transparent-detail-overlay |
| `txt` | 4544 | denn-v35-detail-size-selector | 10930 | denn-v85-frame-template-card-layout-lock |
| `label` | 4561 | denn-v35-detail-size-selector | 11584 | denn-v93-frame-template-bulk-category |
| `by` | 4622 | denn-v35-size-list-live-preview-clock-presets | 13686 | denn-current-detail-preview-stability |
| `n` | 4623 | denn-v35-size-list-live-preview-clock-presets | 9671 | denn-v76-ui-settings-save-authority |
| `saveSoft` | 4624 | denn-v35-size-list-live-preview-clock-presets | 13096 | denn-v36-4-frame-template-tools |
| `toastSafe` | 4625 | denn-v35-size-list-live-preview-clock-presets | 7033 | denn-v44-transparent-detail-overlay |
| `setVal` | 4626 | denn-v35-size-list-live-preview-clock-presets | 11860 | denn-v94-frame-template-edit-mode |
| `applyClockPreset` | 4641 | denn-v35-size-list-live-preview-clock-presets | 10298 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `loadClockPreset` | 4642 | denn-v35-size-list-live-preview-clock-presets | 4872 | denn-v35-size-list-live-stabilizer-final |
| `saveClockPreset` | 4643 | denn-v35-size-list-live-preview-clock-presets | 4873 | denn-v35-size-list-live-stabilizer-final |
| `saveClockPresetFromPreview` | 4652 | denn-v35-size-list-live-preview-clock-presets | 4874 | denn-v35-size-list-live-stabilizer-final |
| `renderClockPresetList` | 4664 | denn-v35-size-list-live-preview-clock-presets | 4894 | denn-v35-size-list-live-stabilizer-final |
| `init` | 4721 | denn-v35-size-list-live-preview-clock-presets | 7505 | denn-v48-final-size-stability |
| `by` | 4729 | denn-v35-frame-builder-size-clock-sync | 13686 | denn-current-detail-preview-stability |
| `n` | 4730 | denn-v35-frame-builder-size-clock-sync | 9671 | denn-v76-ui-settings-save-authority |
| `c` | 4732 | denn-v35-frame-builder-size-clock-sync | 10283 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `setVal` | 4738 | denn-v35-frame-builder-size-clock-sync | 11860 | denn-v94-frame-template-edit-mode |
| `fbSelectSize` | 4762 | denn-v35-frame-builder-size-clock-sync | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `init` | 4780 | denn-v35-frame-builder-size-clock-sync | 7505 | denn-v48-final-size-stability |
| `go` | 4785 | denn-v35-frame-builder-size-clock-sync | 13658 | denn-current-admin-stability-sweep |
| `by` | 4795 | denn-v35-size-list-live-stabilizer-final | 13686 | denn-current-detail-preview-stability |
| `n` | 4796 | denn-v35-size-list-live-stabilizer-final | 9671 | denn-v76-ui-settings-save-authority |
| `fmt` | 4797 | denn-v35-size-list-live-stabilizer-final | 8500 | denn-v56-canonical-save-detail |
| `saveSoft` | 4798 | denn-v35-size-list-live-stabilizer-final | 13096 | denn-v36-4-frame-template-tools |
| `toastSafe` | 4799 | denn-v35-size-list-live-stabilizer-final | 7033 | denn-v44-transparent-detail-overlay |
| `setVal` | 4800 | denn-v35-size-list-live-stabilizer-final | 11860 | denn-v94-frame-template-edit-mode |
| `dims` | 4801 | denn-v35-size-list-live-stabilizer-final | 9263 | denn-v71-frame-builder-preview-stability |
| `c` | 4810 | denn-v35-size-list-live-stabilizer-final | 10283 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `selectFrameSizeForEdit` | 4844 | denn-v35-size-list-live-stabilizer-final | 6289 | denn-v36-size-frame-enabled-admin-final |
| `editSz` | 4845 | denn-v35-size-list-live-stabilizer-final | 7485 | denn-v48-final-size-stability |
| `applyClockPreset` | 4871 | denn-v35-size-list-live-stabilizer-final | 10298 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `renderFrames` | 4912 | denn-v35-size-list-live-stabilizer-final | 8979 | denn-v67-size-status-labels |
| `init` | 4913 | denn-v35-size-list-live-stabilizer-final | 7505 | denn-v48-final-size-stability |
| `by` | 4921 | denn-v35-size-clock-onoff-final | 13686 | denn-current-detail-preview-stability |
| `n` | 4922 | denn-v35-size-clock-onoff-final | 9671 | denn-v76-ui-settings-save-authority |
| `fmt` | 4923 | denn-v35-size-clock-onoff-final | 8500 | denn-v56-canonical-save-detail |
| `toastSafe` | 4924 | denn-v35-size-clock-onoff-final | 7033 | denn-v44-transparent-detail-overlay |
| `setVal` | 4927 | denn-v35-size-clock-onoff-final | 11860 | denn-v94-frame-template-edit-mode |
| `defaultClock` | 4936 | denn-v35-size-clock-onoff-final | 10282 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `toggleSizeClockEnabled` | 4947 | denn-v35-size-clock-onoff-final | 7502 | denn-v48-final-size-stability |
| `formDims` | 4961 | denn-v35-size-clock-onoff-final | 7396 | denn-v48-final-size-stability |
| `selectFrameSizeForEdit` | 4981 | denn-v35-size-clock-onoff-final | 6289 | denn-v36-size-frame-enabled-admin-final |
| `editSz` | 4982 | denn-v35-size-clock-onoff-final | 7485 | denn-v48-final-size-stability |
| `previewSz` | 4983 | denn-v35-size-clock-onoff-final | 6320 | denn-v36-size-frame-enabled-admin-final |
| `renderSzPreview` | 4984 | denn-v35-size-clock-onoff-final | 6330 | denn-v36-size-frame-enabled-admin-final |
| `confirmEditSz` | 5003 | denn-v35-size-clock-onoff-final | 7487 | denn-v48-final-size-stability |
| `addSz` | 5011 | denn-v35-size-clock-onoff-final | 7492 | denn-v48-final-size-stability |
| `name` | 5013 | denn-v35-size-clock-onoff-final | 6403 | denn-v37-size-save-controller-final |
| `annotateCards` | 5019 | denn-v35-size-clock-onoff-final | 6647 | denn-v38-multi-size-checkbox |
| `renderFrames` | 5028 | denn-v35-size-clock-onoff-final | 8979 | denn-v67-size-status-labels |
| `init` | 5037 | denn-v35-size-clock-onoff-final | 7505 | denn-v48-final-size-stability |
| `by` | 5045 | denn-v35-clock-preset-visible-anchor-final | 13686 | denn-current-detail-preview-stability |
| `renderFrames` | 5072 | denn-v35-clock-preset-visible-anchor-final | 8979 | denn-v67-size-status-labels |
| `by` | 5081 | denn-v35-clock-toggle-button-and-preset-position-final | 13686 | denn-current-detail-preview-stability |
| `toastSafe` | 5082 | denn-v35-clock-toggle-button-and-preset-position-final | 7033 | denn-v44-transparent-detail-overlay |
| `toggleSizeClockEnabled` | 5096 | denn-v35-clock-toggle-button-and-preset-position-final | 7502 | denn-v48-final-size-stability |
| `renderFrames` | 5128 | denn-v35-clock-toggle-button-and-preset-position-final | 8979 | denn-v67-size-status-labels |
| `editSz` | 5130 | denn-v35-clock-toggle-button-and-preset-position-final | 7485 | denn-v48-final-size-stability |
| `previewSz` | 5132 | denn-v35-clock-toggle-button-and-preset-position-final | 6320 | denn-v36-size-frame-enabled-admin-final |
| `init` | 5133 | denn-v35-clock-toggle-button-and-preset-position-final | 7505 | denn-v48-final-size-stability |
| `by` | 5148 | denn-v35-mockup-remove-click-fix | 13686 | denn-current-detail-preview-stability |
| `toastSafe` | 5149 | denn-v35-mockup-remove-click-fix | 7033 | denn-v44-transparent-detail-overlay |
| `persist` | 5150 | denn-v35-mockup-remove-click-fix | 11787 | denn-v94-frame-template-edit-mode |
| `init` | 5175 | denn-v35-mockup-remove-click-fix | 7505 | denn-v48-final-size-stability |
| `by` | 5203 | denn-v35-guide-bg-detail-modal-final | 13686 | denn-current-detail-preview-stability |
| `num` | 5204 | denn-v35-guide-bg-detail-modal-final | 13688 | denn-current-detail-preview-stability |
| `esc` | 5205 | denn-v35-guide-bg-detail-modal-final | 13052 | denn-v36-4-frame-template-tools |
| `saveNow` | 5206 | denn-v35-guide-bg-detail-modal-final | 8677 | denn-v59-builder-capture-union |
| `toastSafe` | 5207 | denn-v35-guide-bg-detail-modal-final | 7033 | denn-v44-transparent-detail-overlay |
| `sizeKey` | 5208 | denn-v35-guide-bg-detail-modal-final | 13061 | denn-v36-4-frame-template-tools |
| `parseSub` | 5209 | denn-v35-guide-bg-detail-modal-final | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 5210 | denn-v35-guide-bg-detail-modal-final | 9263 | denn-v71-frame-builder-preview-stability |
| `defaultSizeId` | 5211 | denn-v35-guide-bg-detail-modal-final | 9675 | denn-v76-ui-settings-save-authority |
| `findSize` | 5212 | denn-v35-guide-bg-detail-modal-final | 7230 | denn-v45-design-canvas-only |
| `defaults` | 5214 | denn-v35-guide-bg-detail-modal-final | 7319 | denn-v48-final-size-stability |
| `setVal` | 5233 | denn-v35-guide-bg-detail-modal-final | 11860 | denn-v94-frame-template-edit-mode |
| `modal` | 5234 | denn-v35-guide-bg-detail-modal-final | 13689 | denn-current-detail-preview-stability |
| `openGuideBgDetail` | 5267 | denn-v35-guide-bg-detail-modal-final | 5485 | denn-v35-guide-bg-real-room-setup-final |
| `drawCover` | 5272 | denn-v35-guide-bg-detail-modal-final | 6048 | denn-v35-frame-builder-clean-export-final |
| `drawGuide` | 5288 | denn-v35-guide-bg-detail-modal-final | 6811 | denn-v40-builder-render-rules |
| `renderGuideBgs` | 5289 | denn-v35-guide-bg-detail-modal-final | 5595 | denn-v35-guide-bg-card-ui-polish |
| `init` | 5297 | denn-v35-guide-bg-detail-modal-final | 7505 | denn-v48-final-size-stability |
| `by` | 5305 | denn-v35-clock-onoff-save-stabilizer-final | 13686 | denn-current-detail-preview-stability |
| `num` | 5306 | denn-v35-clock-onoff-save-stabilizer-final | 13688 | denn-current-detail-preview-stability |
| `toastSafe` | 5307 | denn-v35-clock-onoff-save-stabilizer-final | 7033 | denn-v44-transparent-detail-overlay |
| `saveNow` | 5308 | denn-v35-clock-onoff-save-stabilizer-final | 8677 | denn-v59-builder-capture-union |
| `toggleSizeClockEnabled` | 5322 | denn-v35-clock-onoff-save-stabilizer-final | 7502 | denn-v48-final-size-stability |
| `setVal` | 5328 | denn-v35-clock-onoff-save-stabilizer-final | 11860 | denn-v94-frame-template-edit-mode |
| `clockCfg` | 5331 | denn-v35-clock-onoff-save-stabilizer-final | 8827 | denn-v61-frame-template-save-authority |
| `base` | 5332 | denn-v35-clock-onoff-save-stabilizer-final | 12780 | denn-v36-3-dynamic-frame-text-fields-admin |
| `editSz` | 5365 | denn-v35-clock-onoff-save-stabilizer-final | 7485 | denn-v48-final-size-stability |
| `selectFrameSizeForEdit` | 5366 | denn-v35-clock-onoff-save-stabilizer-final | 6289 | denn-v36-size-frame-enabled-admin-final |
| `writeSize` | 5367 | denn-v35-clock-onoff-save-stabilizer-final | 7407 | denn-v48-final-size-stability |
| `name` | 5369 | denn-v35-clock-onoff-save-stabilizer-final | 6403 | denn-v37-size-save-controller-final |
| `sub` | 5370 | denn-v35-clock-onoff-save-stabilizer-final | 6404 | denn-v37-size-save-controller-final |
| `confirmEditSz` | 5377 | denn-v35-clock-onoff-save-stabilizer-final | 7487 | denn-v48-final-size-stability |
| `addSz` | 5387 | denn-v35-clock-onoff-save-stabilizer-final | 7492 | denn-v48-final-size-stability |
| `name` | 5389 | denn-v35-clock-onoff-save-stabilizer-final | 6403 | denn-v37-size-save-controller-final |
| `bind` | 5406 | denn-v35-clock-onoff-save-stabilizer-final | 10173 | denn-v79d-common-default-open-authority |
| `renderFrames` | 5411 | denn-v35-clock-onoff-save-stabilizer-final | 8979 | denn-v67-size-status-labels |
| `by` | 5419 | denn-v35-clock-onoff-selection-sync-final | 13686 | denn-current-detail-preview-stability |
| `paint` | 5421 | denn-v35-clock-onoff-selection-sync-final | 11627 | denn-v93-frame-template-bulk-category |
| `schedule` | 5439 | denn-v35-clock-onoff-selection-sync-final | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `editSz` | 5443 | denn-v35-clock-onoff-selection-sync-final | 7485 | denn-v48-final-size-stability |
| `selectFrameSizeForEdit` | 5444 | denn-v35-clock-onoff-selection-sync-final | 6289 | denn-v36-size-frame-enabled-admin-final |
| `renderFrames` | 5456 | denn-v35-clock-onoff-selection-sync-final | 8979 | denn-v67-size-status-labels |
| `toggleSizeClockEnabled` | 5457 | denn-v35-clock-onoff-selection-sync-final | 7502 | denn-v48-final-size-stability |
| `init` | 5464 | denn-v35-clock-onoff-selection-sync-final | 7505 | denn-v48-final-size-stability |
| `by` | 5473 | denn-v35-guide-bg-real-room-setup-final | 13686 | denn-current-detail-preview-stability |
| `esc` | 5474 | denn-v35-guide-bg-real-room-setup-final | 13052 | denn-v36-4-frame-template-tools |
| `saveNow` | 5475 | denn-v35-guide-bg-real-room-setup-final | 8677 | denn-v59-builder-capture-union |
| `bgKey` | 5476 | denn-v35-guide-bg-real-room-setup-final | 5573 | denn-v35-guide-bg-card-ui-polish |
| `done` | 5488 | denn-v35-guide-bg-real-room-setup-final | 11646 | denn-v93-frame-template-bulk-category |
| `renderGuideBgs` | 5511 | denn-v35-guide-bg-real-room-setup-final | 5595 | denn-v35-guide-bg-card-ui-polish |
| `init` | 5512 | denn-v35-guide-bg-real-room-setup-final | 7505 | denn-v48-final-size-stability |
| `by` | 5570 | denn-v35-guide-bg-card-ui-polish | 13686 | denn-current-detail-preview-stability |
| `esc` | 5571 | denn-v35-guide-bg-card-ui-polish | 13052 | denn-v36-4-frame-template-tools |
| `saveNow` | 5572 | denn-v35-guide-bg-card-ui-polish | 8677 | denn-v59-builder-capture-union |
| `init` | 5596 | denn-v35-guide-bg-card-ui-polish | 7505 | denn-v48-final-size-stability |
| `by` | 5659 | denn-v35-admin-data-safety-final | 13686 | denn-current-detail-preview-stability |
| `wrapped` | 5743 | denn-v35-admin-data-safety-final | 12548 | denn-v36-order-admin-bulk |
| `init` | 5753 | denn-v35-admin-data-safety-final | 7505 | denn-v48-final-size-stability |
| `by` | 5768 | denn-v35-admin-data-safety-final | 13686 | denn-current-detail-preview-stability |
| `num` | 5769 | denn-v35-admin-data-safety-final | 13688 | denn-current-detail-preview-stability |
| `toastSafe` | 5770 | denn-v35-admin-data-safety-final | 7033 | denn-v44-transparent-detail-overlay |
| `buttonOn` | 5772 | denn-v35-admin-data-safety-final | 7364 | denn-v48-final-size-stability |
| `paint` | 5778 | denn-v35-admin-data-safety-final | 11627 | denn-v93-frame-template-bulk-category |
| `clockCfg` | 5792 | denn-v35-admin-data-safety-final | 8827 | denn-v61-frame-template-save-authority |
| `base` | 5793 | denn-v35-admin-data-safety-final | 12780 | denn-v36-3-dynamic-frame-text-fields-admin |
| `toggleSizeClockEnabled` | 5831 | denn-v35-admin-data-safety-final | 7502 | denn-v48-final-size-stability |
| `confirmEditSz` | 5840 | denn-v35-admin-data-safety-final | 7487 | denn-v48-final-size-stability |
| `addSz` | 5853 | denn-v35-admin-data-safety-final | 7492 | denn-v48-final-size-stability |
| `idx` | 5858 | denn-v35-admin-data-safety-final | 12973 | denn-v36-3-frame-template-parity-admin |
| `saveAll` | 5867 | denn-v35-admin-data-safety-final | 6002 | denn-v35-watermark-live-preview-final |
| `editSz` | 5875 | denn-v35-admin-data-safety-final | 7485 | denn-v48-final-size-stability |
| `renderFrames` | 5881 | denn-v35-admin-data-safety-final | 8979 | denn-v67-size-status-labels |
| `by` | 5915 | denn-v35-watermark-live-preview-final | 13686 | denn-current-detail-preview-stability |
| `by` | 6027 | denn-v35-frame-builder-clean-export-final | 13686 | denn-current-detail-preview-stability |
| `num` | 6028 | denn-v35-frame-builder-clean-export-final | 13688 | denn-current-detail-preview-stability |
| `deep` | 6029 | denn-v35-frame-builder-clean-export-final | 12914 | denn-v36-3-frame-template-parity-admin |
| `toastMsg` | 6030 | denn-v35-frame-builder-clean-export-final | 11786 | denn-v94-frame-template-edit-mode |
| `saveNow` | 6031 | denn-v35-frame-builder-clean-export-final | 8677 | denn-v59-builder-capture-union |
| `parseSub` | 6032 | denn-v35-frame-builder-clean-export-final | 9259 | denn-v71-frame-builder-preview-stability |
| `rr` | 6045 | denn-v35-frame-builder-clean-export-final | 9296 | denn-v71-frame-builder-preview-stability |
| `fbExport` | 6070 | denn-v35-frame-builder-clean-export-final | 13304 | denn-v36-4-frame-template-tools |
| `name` | 6075 | denn-v35-frame-builder-clean-export-final | 6403 | denn-v37-size-save-controller-final |
| `first` | 6076 | denn-v35-frame-builder-clean-export-final | 8888 | denn-v61-frame-template-save-authority |
| `by` | 6099 | denn-v35-frame-builder-size-clock-link-final | 13686 | denn-current-detail-preview-stability |
| `num` | 6100 | denn-v35-frame-builder-size-clock-link-final | 13688 | denn-current-detail-preview-stability |
| `setVal` | 6117 | denn-v35-frame-builder-size-clock-link-final | 11860 | denn-v94-frame-template-edit-mode |
| `fbSelectSize` | 6152 | denn-v35-frame-builder-size-clock-link-final | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `fbExport` | 6160 | denn-v35-frame-builder-size-clock-link-final | 13304 | denn-v36-4-frame-template-tools |
| `goTab` | 6166 | denn-v35-frame-builder-size-clock-link-final | 13324 | denn-v36-4-frame-template-tools |
| `num` | 6186 | denn-v46-admin-guide-bg-return-refresh | 13688 | denn-current-detail-preview-stability |
| `by` | 6228 | denn-v36-size-frame-enabled-admin-final | 13686 | denn-current-detail-preview-stability |
| `saveNow` | 6229 | denn-v36-size-frame-enabled-admin-final | 8677 | denn-v59-builder-capture-union |
| `installFrameToggle` | 6242 | denn-v36-size-frame-enabled-admin-final | 7349 | denn-v48-final-size-stability |
| `currentSize` | 6249 | denn-v36-size-frame-enabled-admin-final | 13059 | denn-v36-4-frame-template-tools |
| `bind` | 6269 | denn-v36-size-frame-enabled-admin-final | 10173 | denn-v79d-common-default-open-authority |
| `toggleSizeFrameEnabled` | 6275 | denn-v36-size-frame-enabled-admin-final | 7503 | denn-v48-final-size-stability |
| `editSz` | 6284 | denn-v36-size-frame-enabled-admin-final | 7485 | denn-v48-final-size-stability |
| `addSz` | 6294 | denn-v36-size-frame-enabled-admin-final | 7492 | denn-v48-final-size-stability |
| `confirmEditSz` | 6307 | denn-v36-size-frame-enabled-admin-final | 7487 | denn-v48-final-size-stability |
| `renderFrames` | 6325 | denn-v36-size-frame-enabled-admin-final | 8979 | denn-v67-size-status-labels |
| `by` | 6351 | denn-v37-size-save-controller-final | 13686 | denn-current-detail-preview-stability |
| `num` | 6352 | denn-v37-size-save-controller-final | 13688 | denn-current-detail-preview-stability |
| `fmt` | 6353 | denn-v37-size-save-controller-final | 8500 | denn-v56-canonical-save-detail |
| `arr` | 6354 | denn-v37-size-save-controller-final | 13051 | denn-v36-4-frame-template-tools |
| `editIdx` | 6356 | denn-v37-size-save-controller-final | 7317 | denn-v48-final-size-stability |
| `defaults` | 6357 | denn-v37-size-save-controller-final | 7319 | denn-v48-final-size-stability |
| `dims` | 6358 | denn-v37-size-save-controller-final | 9263 | denn-v71-frame-builder-preview-stability |
| `formDims` | 6365 | denn-v37-size-save-controller-final | 7396 | denn-v48-final-size-stability |
| `frameValue` | 6366 | denn-v37-size-save-controller-final | 7341 | denn-v48-final-size-stability |
| `clockValue` | 6367 | denn-v37-size-save-controller-final | 7342 | denn-v48-final-size-stability |
| `paintButton` | 6379 | denn-v37-size-save-controller-final | 7369 | denn-v48-final-size-stability |
| `paintClock` | 6389 | denn-v37-size-save-controller-final | 7379 | denn-v48-final-size-stability |
| `installFrameToggle` | 6394 | denn-v37-size-save-controller-final | 7349 | denn-v48-final-size-stability |
| `paintFrame` | 6399 | denn-v37-size-save-controller-final | 7384 | denn-v48-final-size-stability |
| `setVal` | 6400 | denn-v37-size-save-controller-final | 11860 | denn-v94-frame-template-edit-mode |
| `writeSize` | 6412 | denn-v37-size-save-controller-final | 7407 | denn-v48-final-size-stability |
| `persist` | 6421 | denn-v37-size-save-controller-final | 11787 | denn-v94-frame-template-edit-mode |
| `setMode` | 6426 | denn-v37-size-save-controller-final | 7386 | denn-v48-final-size-stability |
| `later` | 6434 | denn-v37-size-save-controller-final | 13655 | denn-current-admin-stability-sweep |
| `fillForm` | 6444 | denn-v37-size-save-controller-final | 7434 | denn-v48-final-size-stability |
| `clearForm` | 6463 | denn-v37-size-save-controller-final | 7450 | denn-v48-final-size-stability |
| `editSz` | 6468 | denn-v37-size-save-controller-final | 7485 | denn-v48-final-size-stability |
| `confirmEditSz` | 6470 | denn-v37-size-save-controller-final | 7487 | denn-v48-final-size-stability |
| `addSz` | 6475 | denn-v37-size-save-controller-final | 7492 | denn-v48-final-size-stability |
| `rmSz` | 6479 | denn-v37-size-save-controller-final | 7496 | denn-v48-final-size-stability |
| `renderFrames` | 6500 | denn-v37-size-save-controller-final | 8979 | denn-v67-size-status-labels |
| `toggleSizeClockEnabled` | 6502 | denn-v37-size-save-controller-final | 7502 | denn-v48-final-size-stability |
| `toggleSizeFrameEnabled` | 6503 | denn-v37-size-save-controller-final | 7503 | denn-v48-final-size-stability |
| `init` | 6504 | denn-v37-size-save-controller-final | 7505 | denn-v48-final-size-stability |
| `by` | 6523 | denn-v38-multi-size-checkbox | 13686 | denn-current-detail-preview-stability |
| `esc` | 6524 | denn-v38-multi-size-checkbox | 13052 | denn-v36-4-frame-template-tools |
| `num` | 6525 | denn-v38-multi-size-checkbox | 13688 | denn-current-detail-preview-stability |
| `fmt` | 6526 | denn-v38-multi-size-checkbox | 8500 | denn-v56-canonical-save-detail |
| `sizes` | 6527 | denn-v38-multi-size-checkbox | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 6528 | denn-v38-multi-size-checkbox | 12915 | denn-v36-3-frame-template-parity-admin |
| `key` | 6529 | denn-v38-multi-size-checkbox | 11784 | denn-v94-frame-template-edit-mode |
| `allValue` | 6530 | denn-v38-multi-size-checkbox | 13060 | denn-v36-4-frame-template-tools |
| `uniq` | 6531 | denn-v38-multi-size-checkbox | 11804 | denn-v94-frame-template-edit-mode |
| `parseSub` | 6532 | denn-v38-multi-size-checkbox | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 6533 | denn-v38-multi-size-checkbox | 9263 | denn-v71-frame-builder-preview-stability |
| `sizeLabel` | 6534 | denn-v38-multi-size-checkbox | 8501 | denn-v56-canonical-save-detail |
| `targetValues` | 6536 | denn-v38-multi-size-checkbox | 11809 | denn-v94-frame-template-edit-mode |
| `writeTargets` | 6549 | denn-v38-multi-size-checkbox | 8835 | denn-v61-frame-template-save-authority |
| `saveNow` | 6556 | denn-v38-multi-size-checkbox | 8677 | denn-v59-builder-capture-union |
| `readChecks` | 6557 | denn-v38-multi-size-checkbox | 8493 | denn-v56-canonical-save-detail |
| `renderChecks` | 6581 | denn-v38-multi-size-checkbox | 7618 | denn-v50-detail-builder-sync |
| `selectedDetailVals` | 6604 | denn-v38-multi-size-checkbox | 8041 | denn-v53-detail-link-stability |
| `fn` | 6608 | denn-v38-multi-size-checkbox | 11440 | denn-v91-white-label-final-lock |
| `targetLabel` | 6642 | denn-v38-multi-size-checkbox | 9186 | denn-v70-hide-builtin-frame-templates |
| `openZoneEditor` | 6653 | denn-v38-multi-size-checkbox | 13309 | denn-v36-4-frame-template-tools |
| `fbExport` | 6655 | denn-v38-multi-size-checkbox | 13304 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 6656 | denn-v38-multi-size-checkbox | 13284 | denn-v36-4-frame-template-tools |
| `goTab` | 6657 | denn-v38-multi-size-checkbox | 13324 | denn-v36-4-frame-template-tools |
| `by` | 6672 | denn-v39-white-border-guide-final | 13686 | denn-current-detail-preview-stability |
| `num` | 6673 | denn-v39-white-border-guide-final | 13688 | denn-current-detail-preview-stability |
| `fmt` | 6674 | denn-v39-white-border-guide-final | 8500 | denn-v56-canonical-save-detail |
| `tplArr` | 6675 | denn-v39-white-border-guide-final | 12915 | denn-v36-3-frame-template-parity-admin |
| `persist` | 6676 | denn-v39-white-border-guide-final | 11787 | denn-v94-frame-template-edit-mode |
| `state` | 6677 | denn-v39-white-border-guide-final | 10074 | denn-v79b-room-common-default-card-visible |
| `drawGuide` | 6727 | denn-v39-white-border-guide-final | 6811 | denn-v40-builder-render-rules |
| `exportWrap` | 6749 | denn-v39-white-border-guide-final | 6869 | denn-v41-remove-builder-white-border |
| `init` | 6762 | denn-v39-white-border-guide-final | 7505 | denn-v48-final-size-stability |
| `by` | 6779 | denn-v40-builder-render-rules | 13686 | denn-current-detail-preview-stability |
| `num` | 6780 | denn-v40-builder-render-rules | 13688 | denn-current-detail-preview-stability |
| `esc` | 6781 | denn-v40-builder-render-rules | 13052 | denn-v36-4-frame-template-tools |
| `sizes` | 6782 | denn-v40-builder-render-rules | 13056 | denn-v36-4-frame-template-tools |
| `key` | 6783 | denn-v40-builder-render-rules | 11784 | denn-v94-frame-template-edit-mode |
| `isAll` | 6784 | denn-v40-builder-render-rules | 11783 | denn-v94-frame-template-edit-mode |
| `activeIndex` | 6785 | denn-v40-builder-render-rules | 10510 | denn-v82-frame-builder-clock-toggle-authority |
| `frameOn` | 6797 | denn-v40-builder-render-rules | 9058 | denn-v69-initial-size-toggle-sync |
| `clockOn` | 6798 | denn-v40-builder-render-rules | 9057 | denn-v69-initial-size-toggle-sync |
| `state` | 6800 | denn-v40-builder-render-rules | 10074 | denn-v79b-room-common-default-card-visible |
| `wrap` | 6841 | denn-v40-builder-render-rules | 13690 | denn-current-detail-preview-stability |
| `init` | 6844 | denn-v40-builder-render-rules | 7505 | denn-v48-final-size-stability |
| `by` | 6860 | denn-v41-remove-builder-white-border | 13686 | denn-current-detail-preview-stability |
| `arr` | 6861 | denn-v41-remove-builder-white-border | 13051 | denn-v36-4-frame-template-tools |
| `persist` | 6862 | denn-v41-remove-builder-white-border | 11787 | denn-v94-frame-template-edit-mode |
| `drawBuilderWhiteOverlayV11` | 6867 | denn-v41-remove-builder-white-border | 7542 | denn-v49-render-authority-lock |
| `go` | 6883 | denn-v41-remove-builder-white-border | 13658 | denn-current-admin-stability-sweep |
| `init` | 6886 | denn-v41-remove-builder-white-border | 7505 | denn-v48-final-size-stability |
| `by` | 6902 | denn-v42-detail-preview-guide | 13686 | denn-current-detail-preview-stability |
| `num` | 6903 | denn-v42-detail-preview-guide | 13688 | denn-current-detail-preview-stability |
| `esc` | 6904 | denn-v42-detail-preview-guide | 13052 | denn-v36-4-frame-template-tools |
| `saveSoft` | 6905 | denn-v42-detail-preview-guide | 13096 | denn-v36-4-frame-template-tools |
| `tpl` | 6906 | denn-v42-detail-preview-guide | 7576 | denn-v50-detail-builder-sync |
| `sizes` | 6907 | denn-v42-detail-preview-guide | 13056 | denn-v36-4-frame-template-tools |
| `isAll` | 6908 | denn-v42-detail-preview-guide | 11783 | denn-v94-frame-template-edit-mode |
| `key` | 6909 | denn-v42-detail-preview-guide | 11784 | denn-v94-frame-template-edit-mode |
| `parseSub` | 6910 | denn-v42-detail-preview-guide | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 6911 | denn-v42-detail-preview-guide | 9263 | denn-v71-frame-builder-preview-stability |
| `checkedVals` | 6912 | denn-v42-detail-preview-guide | 7223 | denn-v45-design-canvas-only |
| `findSize` | 6920 | denn-v42-detail-preview-guide | 7230 | denn-v45-design-canvas-only |
| `primarySize` | 6921 | denn-v42-detail-preview-guide | 7049 | denn-v44-transparent-detail-overlay |
| `syncSizeCanvas` | 6922 | denn-v42-detail-preview-guide | 7050 | denn-v44-transparent-detail-overlay |
| `renderRatioNote` | 6929 | denn-v42-detail-preview-guide | 7057 | denn-v44-transparent-detail-overlay |
| `ensureWhitePanel` | 6938 | denn-v42-detail-preview-guide | 10376 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `syncWhitePanel` | 6950 | denn-v42-detail-preview-guide | 7065 | denn-v44-transparent-detail-overlay |
| `setWhite` | 6961 | denn-v42-detail-preview-guide | 7076 | denn-v44-transparent-detail-overlay |
| `setWhiteThickness` | 6965 | denn-v42-detail-preview-guide | 7077 | denn-v44-transparent-detail-overlay |
| `drawTextZone` | 6971 | denn-v42-detail-preview-guide | 7271 | denn-v45-design-canvas-only |
| `bwPx` | 6973 | denn-v42-detail-preview-guide | 7104 | denn-v44-transparent-detail-overlay |
| `txt` | 6977 | denn-v42-detail-preview-guide | 10930 | denn-v85-frame-template-card-layout-lock |
| `drawWhiteGuide` | 6988 | denn-v42-detail-preview-guide | 7280 | denn-v45-design-canvas-only |
| `zeRender` | 6995 | denn-v42-detail-preview-guide | 13314 | denn-v36-4-frame-template-tools |
| `syncDetail` | 7005 | denn-v42-detail-preview-guide | 7150 | denn-v44-transparent-detail-overlay |
| `open` | 7010 | denn-v42-detail-preview-guide | 13741 | denn-current-detail-preview-stability |
| `wrapSave` | 7014 | denn-v42-detail-preview-guide | 12969 | denn-v36-3-frame-template-parity-admin |
| `by` | 7029 | denn-v44-transparent-detail-overlay | 13686 | denn-current-detail-preview-stability |
| `num` | 7030 | denn-v44-transparent-detail-overlay | 13688 | denn-current-detail-preview-stability |
| `deep` | 7031 | denn-v44-transparent-detail-overlay | 12914 | denn-v36-3-frame-template-parity-admin |
| `saveSoft` | 7032 | denn-v44-transparent-detail-overlay | 13096 | denn-v36-4-frame-template-tools |
| `tpl` | 7034 | denn-v44-transparent-detail-overlay | 7576 | denn-v50-detail-builder-sync |
| `sizes` | 7035 | denn-v44-transparent-detail-overlay | 13056 | denn-v36-4-frame-template-tools |
| `isAll` | 7036 | denn-v44-transparent-detail-overlay | 11783 | denn-v94-frame-template-edit-mode |
| `key` | 7037 | denn-v44-transparent-detail-overlay | 11784 | denn-v94-frame-template-edit-mode |
| `parseSub` | 7038 | denn-v44-transparent-detail-overlay | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 7039 | denn-v44-transparent-detail-overlay | 9263 | denn-v71-frame-builder-preview-stability |
| `checkedVals` | 7040 | denn-v44-transparent-detail-overlay | 7223 | denn-v45-design-canvas-only |
| `findSize` | 7048 | denn-v44-transparent-detail-overlay | 7230 | denn-v45-design-canvas-only |
| `drawWhiteGuide` | 7095 | denn-v44-transparent-detail-overlay | 7280 | denn-v45-design-canvas-only |
| `drawTextZone` | 7102 | denn-v44-transparent-detail-overlay | 7271 | denn-v45-design-canvas-only |
| `txt` | 7108 | denn-v44-transparent-detail-overlay | 10930 | denn-v85-frame-template-card-layout-lock |
| `zeRender` | 7119 | denn-v44-transparent-detail-overlay | 13314 | denn-v36-4-frame-template-tools |
| `writeTargets` | 7130 | denn-v44-transparent-detail-overlay | 8835 | denn-v61-frame-template-save-authority |
| `saveDetail` | 7138 | denn-v44-transparent-detail-overlay | 8611 | denn-v56-canonical-save-detail |
| `saveZones` | 7148 | denn-v44-transparent-detail-overlay | 12848 | denn-v36-3-dynamic-frame-text-fields-admin |
| `saveZonesOnly` | 7149 | denn-v44-transparent-detail-overlay | 12858 | denn-v36-3-dynamic-frame-text-fields-admin |
| `by` | 7167 | denn-v45-design-canvas-only | 13686 | denn-current-detail-preview-stability |
| `num` | 7168 | denn-v45-design-canvas-only | 13688 | denn-current-detail-preview-stability |
| `deep` | 7169 | denn-v45-design-canvas-only | 12914 | denn-v36-3-frame-template-parity-admin |
| `sizes` | 7170 | denn-v45-design-canvas-only | 13056 | denn-v36-4-frame-template-tools |
| `isAll` | 7171 | denn-v45-design-canvas-only | 11783 | denn-v94-frame-template-edit-mode |
| `key` | 7172 | denn-v45-design-canvas-only | 11784 | denn-v94-frame-template-edit-mode |
| `parseSub` | 7173 | denn-v45-design-canvas-only | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 7174 | denn-v45-design-canvas-only | 9263 | denn-v71-frame-builder-preview-stability |
| `fit` | 7181 | denn-v45-design-canvas-only | 9291 | denn-v71-frame-builder-preview-stability |
| `rr` | 7182 | denn-v45-design-canvas-only | 9296 | denn-v71-frame-builder-preview-stability |
| `zonePath` | 7183 | denn-v45-design-canvas-only | 9304 | denn-v71-frame-builder-preview-stability |
| `cover` | 7184 | denn-v45-design-canvas-only | 9309 | denn-v71-frame-builder-preview-stability |
| `whiteState` | 7185 | denn-v45-design-canvas-only | 9315 | denn-v71-frame-builder-preview-stability |
| `fbRender` | 7201 | denn-v45-design-canvas-only | 13299 | denn-v36-4-frame-template-tools |
| `fbExport` | 7217 | denn-v45-design-canvas-only | 13304 | denn-v36-4-frame-template-tools |
| `currentTpl` | 7222 | denn-v45-design-canvas-only | 13218 | denn-v36-4-frame-template-tools |
| `isDesignCanvasTemplate` | 7234 | denn-v45-design-canvas-only | 8042 | denn-v53-detail-link-stability |
| `txt` | 7274 | denn-v45-design-canvas-only | 10930 | denn-v85-frame-template-card-layout-lock |
| `zeRender` | 7284 | denn-v45-design-canvas-only | 13314 | denn-v36-4-frame-template-tools |
| `goTab` | 7294 | denn-v45-design-canvas-only | 13324 | denn-v36-4-frame-template-tools |
| `by` | 7312 | denn-v48-final-size-stability | 13686 | denn-current-detail-preview-stability |
| `num` | 7313 | denn-v48-final-size-stability | 13688 | denn-current-detail-preview-stability |
| `fmt` | 7314 | denn-v48-final-size-stability | 8500 | denn-v56-canonical-save-detail |
| `sizes` | 7315 | denn-v48-final-size-stability | 13056 | denn-v36-4-frame-template-tools |
| `valid` | 7316 | denn-v48-final-size-stability | 9056 | denn-v69-initial-size-toggle-sync |
| `dims` | 7331 | denn-v48-final-size-stability | 9263 | denn-v71-frame-builder-preview-stability |
| `frameOn` | 7339 | denn-v48-final-size-stability | 9058 | denn-v69-initial-size-toggle-sync |
| `clockOn` | 7340 | denn-v48-final-size-stability | 9057 | denn-v69-initial-size-toggle-sync |
| `setVal` | 7385 | denn-v48-final-size-stability | 11860 | denn-v94-frame-template-edit-mode |
| `persist` | 7416 | denn-v48-final-size-stability | 11787 | denn-v94-frame-template-edit-mode |
| `settle` | 7481 | denn-v48-final-size-stability | 13719 | denn-current-detail-preview-stability |
| `renderFrames` | 7504 | denn-v48-final-size-stability | 8979 | denn-v67-size-status-labels |
| `by` | 7520 | denn-v49-render-authority-lock | 13686 | denn-current-detail-preview-stability |
| `num` | 7521 | denn-v49-render-authority-lock | 13688 | denn-current-detail-preview-stability |
| `deep` | 7522 | denn-v49-render-authority-lock | 12914 | denn-v36-3-frame-template-parity-admin |
| `sizes` | 7523 | denn-v49-render-authority-lock | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 7524 | denn-v49-render-authority-lock | 12915 | denn-v36-3-frame-template-parity-admin |
| `saveNow` | 7525 | denn-v49-render-authority-lock | 8677 | denn-v59-builder-capture-union |
| `toastMsg` | 7526 | denn-v49-render-authority-lock | 11786 | denn-v94-frame-template-edit-mode |
| `parseSub` | 7527 | denn-v49-render-authority-lock | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 7528 | denn-v49-render-authority-lock | 9263 | denn-v71-frame-builder-preview-stability |
| `fit` | 7529 | denn-v49-render-authority-lock | 9291 | denn-v71-frame-builder-preview-stability |
| `selectedBuilder` | 7530 | denn-v49-render-authority-lock | 9274 | denn-v71-frame-builder-preview-stability |
| `key` | 7531 | denn-v49-render-authority-lock | 11784 | denn-v94-frame-template-edit-mode |
| `allValue` | 7532 | denn-v49-render-authority-lock | 13060 | denn-v36-4-frame-template-tools |
| `writeTargets` | 7534 | denn-v49-render-authority-lock | 8835 | denn-v61-frame-template-save-authority |
| `rr` | 7535 | denn-v49-render-authority-lock | 9296 | denn-v71-frame-builder-preview-stability |
| `zonePath` | 7536 | denn-v49-render-authority-lock | 9304 | denn-v71-frame-builder-preview-stability |
| `cover` | 7537 | denn-v49-render-authority-lock | 9309 | denn-v71-frame-builder-preview-stability |
| `whiteState` | 7538 | denn-v49-render-authority-lock | 9315 | denn-v71-frame-builder-preview-stability |
| `drawWhite` | 7539 | denn-v49-render-authority-lock | 9321 | denn-v71-frame-builder-preview-stability |
| `grid` | 7541 | denn-v49-render-authority-lock | 12196 | denn-v95-frame-template-list-ui-stabilize |
| `fbRender` | 7543 | denn-v49-render-authority-lock | 13299 | denn-v36-4-frame-template-tools |
| `fbExport` | 7544 | denn-v49-render-authority-lock | 13304 | denn-v36-4-frame-template-tools |
| `openZoneEditor` | 7546 | denn-v49-render-authority-lock | 13309 | denn-v36-4-frame-template-tools |
| `goTab` | 7547 | denn-v49-render-authority-lock | 13324 | denn-v36-4-frame-template-tools |
| `by` | 7570 | denn-v50-detail-builder-sync | 13686 | denn-current-detail-preview-stability |
| `num` | 7571 | denn-v50-detail-builder-sync | 13688 | denn-current-detail-preview-stability |
| `esc` | 7572 | denn-v50-detail-builder-sync | 13052 | denn-v36-4-frame-template-tools |
| `deep` | 7573 | denn-v50-detail-builder-sync | 12914 | denn-v36-3-frame-template-parity-admin |
| `sizes` | 7574 | denn-v50-detail-builder-sync | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 7575 | denn-v50-detail-builder-sync | 12915 | denn-v36-3-frame-template-parity-admin |
| `saveNow` | 7577 | denn-v50-detail-builder-sync | 8677 | denn-v59-builder-capture-union |
| `isAll` | 7578 | denn-v50-detail-builder-sync | 11783 | denn-v94-frame-template-edit-mode |
| `uniq` | 7579 | denn-v50-detail-builder-sync | 11804 | denn-v94-frame-template-edit-mode |
| `key` | 7580 | denn-v50-detail-builder-sync | 11784 | denn-v94-frame-template-edit-mode |
| `parseSub` | 7581 | denn-v50-detail-builder-sync | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 7582 | denn-v50-detail-builder-sync | 9263 | denn-v71-frame-builder-preview-stability |
| `fmt` | 7583 | denn-v50-detail-builder-sync | 8500 | denn-v56-canonical-save-detail |
| `sizeLabel` | 7584 | denn-v50-detail-builder-sync | 8501 | denn-v56-canonical-save-detail |
| `targetValues` | 7585 | denn-v50-detail-builder-sync | 11809 | denn-v94-frame-template-edit-mode |
| `writeTargets` | 7594 | denn-v50-detail-builder-sync | 8835 | denn-v61-frame-template-save-authority |
| `readChecks` | 7601 | denn-v50-detail-builder-sync | 8493 | denn-v56-canonical-save-detail |
| `enforce` | 7608 | denn-v50-detail-builder-sync | 8000 | denn-v53-detail-link-stability |
| `selectedDetailVals` | 7635 | denn-v50-detail-builder-sync | 8041 | denn-v53-detail-link-stability |
| `fit` | 7660 | denn-v50-detail-builder-sync | 9291 | denn-v71-frame-builder-preview-stability |
| `currentRatio` | 7661 | denn-v50-detail-builder-sync | 8044 | denn-v53-detail-link-stability |
| `grid` | 7662 | denn-v50-detail-builder-sync | 12196 | denn-v95-frame-template-list-ui-stabilize |
| `textDraw` | 7663 | denn-v50-detail-builder-sync | 11253 | denn-v87-name2-textbox-toggle |
| `txt` | 7667 | denn-v50-detail-builder-sync | 10930 | denn-v85-frame-template-card-layout-lock |
| `isDesignCanvasTemplate` | 7673 | denn-v50-detail-builder-sync | 8042 | denn-v53-detail-link-stability |
| `zeRender` | 7681 | denn-v50-detail-builder-sync | 13314 | denn-v36-4-frame-template-tools |
| `openZoneEditor` | 7694 | denn-v50-detail-builder-sync | 13309 | denn-v36-4-frame-template-tools |
| `fbExport` | 7696 | denn-v50-detail-builder-sync | 13304 | denn-v36-4-frame-template-tools |
| `goTab` | 7697 | denn-v50-detail-builder-sync | 13324 | denn-v36-4-frame-template-tools |
| `by` | 7836 | denn-v51-builder-white-ui-polish | 13686 | denn-current-detail-preview-stability |
| `goTab` | 7861 | denn-v51-builder-white-ui-polish | 13324 | denn-v36-4-frame-template-tools |
| `by` | 7898 | denn-v52-builder-white-panel-relocate | 13686 | denn-current-detail-preview-stability |
| `goTab` | 7910 | denn-v52-builder-white-panel-relocate | 13324 | denn-v36-4-frame-template-tools |
| `by` | 7950 | denn-v53-detail-link-stability | 13686 | denn-current-detail-preview-stability |
| `num` | 7951 | denn-v53-detail-link-stability | 13688 | denn-current-detail-preview-stability |
| `esc` | 7952 | denn-v53-detail-link-stability | 13052 | denn-v36-4-frame-template-tools |
| `norm` | 7953 | denn-v53-detail-link-stability | 13053 | denn-v36-4-frame-template-tools |
| `sizes` | 7954 | denn-v53-detail-link-stability | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 7955 | denn-v53-detail-link-stability | 12915 | denn-v36-3-frame-template-parity-admin |
| `currentTpl` | 7956 | denn-v53-detail-link-stability | 13218 | denn-v36-4-frame-template-tools |
| `saveNow` | 7957 | denn-v53-detail-link-stability | 8677 | denn-v59-builder-capture-union |
| `isAll` | 7958 | denn-v53-detail-link-stability | 11783 | denn-v94-frame-template-edit-mode |
| `key` | 7959 | denn-v53-detail-link-stability | 11784 | denn-v94-frame-template-edit-mode |
| `resolveSizeKey` | 7960 | denn-v53-detail-link-stability | 9167 | denn-v70-hide-builtin-frame-templates |
| `uniq` | 7970 | denn-v53-detail-link-stability | 11804 | denn-v94-frame-template-edit-mode |
| `targetValues` | 7974 | denn-v53-detail-link-stability | 11809 | denn-v94-frame-template-edit-mode |
| `writeTargets` | 7982 | denn-v53-detail-link-stability | 8835 | denn-v61-frame-template-save-authority |
| `parseSub` | 7989 | denn-v53-detail-link-stability | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 7990 | denn-v53-detail-link-stability | 9263 | denn-v71-frame-builder-preview-stability |
| `fmt` | 7991 | denn-v53-detail-link-stability | 8500 | denn-v56-canonical-save-detail |
| `sizeLabel` | 7992 | denn-v53-detail-link-stability | 8501 | denn-v56-canonical-save-detail |
| `readChecks` | 7993 | denn-v53-detail-link-stability | 8493 | denn-v56-canonical-save-detail |
| `borderState` | 8010 | denn-v53-detail-link-stability | 8354 | denn-v55-three-issue-stabilize |
| `fit` | 8043 | denn-v53-detail-link-stability | 9291 | denn-v71-frame-builder-preview-stability |
| `drawGrid` | 8045 | denn-v53-detail-link-stability | 9328 | denn-v71-frame-builder-preview-stability |
| `label` | 8048 | denn-v53-detail-link-stability | 11584 | denn-v93-frame-template-bulk-category |
| `textDraw` | 8063 | denn-v53-detail-link-stability | 11253 | denn-v87-name2-textbox-toggle |
| `txt` | 8068 | denn-v53-detail-link-stability | 10930 | denn-v85-frame-template-card-layout-lock |
| `zeRender` | 8077 | denn-v53-detail-link-stability | 13314 | denn-v36-4-frame-template-tools |
| `stabilizeDetail` | 8089 | denn-v53-detail-link-stability | 8384 | denn-v55-three-issue-stabilize |
| `openZoneEditor` | 8097 | denn-v53-detail-link-stability | 13309 | denn-v36-4-frame-template-tools |
| `fn` | 8108 | denn-v53-detail-link-stability | 11440 | denn-v91-white-label-final-lock |
| `builderWhite` | 8113 | denn-v53-detail-link-stability | 8518 | denn-v56-canonical-save-detail |
| `fbExport` | 8116 | denn-v53-detail-link-stability | 13304 | denn-v36-4-frame-template-tools |
| `by` | 8137 | denn-v54-size-render-lock | 13686 | denn-current-detail-preview-stability |
| `norm` | 8138 | denn-v54-size-render-lock | 13053 | denn-v36-4-frame-template-tools |
| `isAll` | 8139 | denn-v54-size-render-lock | 11783 | denn-v94-frame-template-edit-mode |
| `sizes` | 8140 | denn-v54-size-render-lock | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 8141 | denn-v54-size-render-lock | 12915 | denn-v36-3-frame-template-parity-admin |
| `key` | 8142 | denn-v54-size-render-lock | 11784 | denn-v94-frame-template-edit-mode |
| `resolve` | 8143 | denn-v54-size-render-lock | 11794 | denn-v94-frame-template-edit-mode |
| `uniq` | 8153 | denn-v54-size-render-lock | 11804 | denn-v94-frame-template-edit-mode |
| `saveNow` | 8157 | denn-v54-size-render-lock | 8677 | denn-v59-builder-capture-union |
| `writeTargets` | 8158 | denn-v54-size-render-lock | 8835 | denn-v61-frame-template-save-authority |
| `activeBuilderKey` | 8165 | denn-v54-size-render-lock | 8325 | denn-v55-three-issue-stabilize |
| `captureBuilderTargets` | 8178 | denn-v54-size-render-lock | 8536 | denn-v56-canonical-save-detail |
| `whiteState` | 8189 | denn-v54-size-render-lock | 9315 | denn-v71-frame-builder-preview-stability |
| `fbExport` | 8217 | denn-v54-size-render-lock | 13304 | denn-v36-4-frame-template-tools |
| `detailVals` | 8224 | denn-v54-size-render-lock | 8609 | denn-v56-canonical-save-detail |
| `stabilizeDetail` | 8235 | denn-v54-size-render-lock | 8384 | denn-v55-three-issue-stabilize |
| `openZoneEditor` | 8241 | denn-v54-size-render-lock | 13309 | denn-v36-4-frame-template-tools |
| `fn` | 8252 | denn-v54-size-render-lock | 11440 | denn-v91-white-label-final-lock |
| `by` | 8275 | denn-v55-three-issue-stabilize | 13686 | denn-current-detail-preview-stability |
| `num` | 8276 | denn-v55-three-issue-stabilize | 13688 | denn-current-detail-preview-stability |
| `norm` | 8277 | denn-v55-three-issue-stabilize | 13053 | denn-v36-4-frame-template-tools |
| `esc` | 8278 | denn-v55-three-issue-stabilize | 13052 | denn-v36-4-frame-template-tools |
| `isAll` | 8279 | denn-v55-three-issue-stabilize | 11783 | denn-v94-frame-template-edit-mode |
| `sizes` | 8280 | denn-v55-three-issue-stabilize | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 8281 | denn-v55-three-issue-stabilize | 12915 | denn-v36-3-frame-template-parity-admin |
| `currentTpl` | 8282 | denn-v55-three-issue-stabilize | 13218 | denn-v36-4-frame-template-tools |
| `key` | 8283 | denn-v55-three-issue-stabilize | 11784 | denn-v94-frame-template-edit-mode |
| `resolve` | 8284 | denn-v55-three-issue-stabilize | 11794 | denn-v94-frame-template-edit-mode |
| `uniq` | 8294 | denn-v55-three-issue-stabilize | 11804 | denn-v94-frame-template-edit-mode |
| `saveNow` | 8298 | denn-v55-three-issue-stabilize | 8677 | denn-v59-builder-capture-union |
| `fmt` | 8299 | denn-v55-three-issue-stabilize | 8500 | denn-v56-canonical-save-detail |
| `parseSub` | 8300 | denn-v55-three-issue-stabilize | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 8301 | denn-v55-three-issue-stabilize | 9263 | denn-v71-frame-builder-preview-stability |
| `sizeLabel` | 8302 | denn-v55-three-issue-stabilize | 8501 | denn-v56-canonical-save-detail |
| `writeTargets` | 8303 | denn-v55-three-issue-stabilize | 8835 | denn-v61-frame-template-save-authority |
| `targetValues` | 8310 | denn-v55-three-issue-stabilize | 11809 | denn-v94-frame-template-edit-mode |
| `captureBuilderTargets` | 8331 | denn-v55-three-issue-stabilize | 8536 | denn-v56-canonical-save-detail |
| `builderWhite` | 8342 | denn-v55-three-issue-stabilize | 8518 | denn-v56-canonical-save-detail |
| `sealWhite` | 8346 | denn-v55-three-issue-stabilize | 8842 | denn-v61-frame-template-save-authority |
| `fbExport` | 8394 | denn-v55-three-issue-stabilize | 13304 | denn-v36-4-frame-template-tools |
| `openZoneEditor` | 8406 | denn-v55-three-issue-stabilize | 13309 | denn-v36-4-frame-template-tools |
| `fn` | 8417 | denn-v55-three-issue-stabilize | 11440 | denn-v91-white-label-final-lock |
| `by` | 8444 | denn-v56-canonical-save-detail | 13686 | denn-current-detail-preview-stability |
| `num` | 8445 | denn-v56-canonical-save-detail | 13688 | denn-current-detail-preview-stability |
| `norm` | 8446 | denn-v56-canonical-save-detail | 13053 | denn-v36-4-frame-template-tools |
| `esc` | 8447 | denn-v56-canonical-save-detail | 13052 | denn-v36-4-frame-template-tools |
| `deep` | 8448 | denn-v56-canonical-save-detail | 12914 | denn-v36-3-frame-template-parity-admin |
| `isAll` | 8449 | denn-v56-canonical-save-detail | 11783 | denn-v94-frame-template-edit-mode |
| `sizes` | 8450 | denn-v56-canonical-save-detail | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 8451 | denn-v56-canonical-save-detail | 12915 | denn-v36-3-frame-template-parity-admin |
| `toastMsg` | 8452 | denn-v56-canonical-save-detail | 11786 | denn-v94-frame-template-edit-mode |
| `saveNow` | 8453 | denn-v56-canonical-save-detail | 8677 | denn-v59-builder-capture-union |
| `parseSub` | 8454 | denn-v56-canonical-save-detail | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 8455 | denn-v56-canonical-save-detail | 9263 | denn-v71-frame-builder-preview-stability |
| `key` | 8463 | denn-v56-canonical-save-detail | 11784 | denn-v94-frame-template-edit-mode |
| `resolve` | 8464 | denn-v56-canonical-save-detail | 11794 | denn-v94-frame-template-edit-mode |
| `uniq` | 8474 | denn-v56-canonical-save-detail | 11804 | denn-v94-frame-template-edit-mode |
| `writeTargets` | 8478 | denn-v56-canonical-save-detail | 8835 | denn-v61-frame-template-save-authority |
| `targetValues` | 8485 | denn-v56-canonical-save-detail | 11809 | denn-v94-frame-template-edit-mode |
| `sealWhite` | 8522 | denn-v56-canonical-save-detail | 8842 | denn-v61-frame-template-save-authority |
| `activeBuilderInfo` | 8530 | denn-v56-canonical-save-detail | 8785 | denn-v61-frame-template-save-authority |
| `rr` | 8552 | denn-v56-canonical-save-detail | 9296 | denn-v71-frame-builder-preview-stability |
| `zonePath` | 8553 | denn-v56-canonical-save-detail | 9304 | denn-v71-frame-builder-preview-stability |
| `cover` | 8554 | denn-v56-canonical-save-detail | 9309 | denn-v71-frame-builder-preview-stability |
| `drawWhite` | 8555 | denn-v56-canonical-save-detail | 9321 | denn-v71-frame-builder-preview-stability |
| `clockCfg` | 8556 | denn-v56-canonical-save-detail | 8827 | denn-v61-frame-template-save-authority |
| `fbExport` | 8559 | denn-v56-canonical-save-detail | 13304 | denn-v36-4-frame-template-tools |
| `first` | 8574 | denn-v56-canonical-save-detail | 8888 | denn-v61-frame-template-save-authority |
| `currentTpl` | 8583 | denn-v56-canonical-save-detail | 13218 | denn-v36-4-frame-template-tools |
| `saveZones` | 8622 | denn-v56-canonical-save-detail | 12848 | denn-v36-3-dynamic-frame-text-fields-admin |
| `saveZonesOnly` | 8623 | denn-v56-canonical-save-detail | 12858 | denn-v36-3-dynamic-frame-text-fields-admin |
| `openZoneEditor` | 8639 | denn-v56-canonical-save-detail | 13309 | denn-v36-4-frame-template-tools |
| `by` | 8669 | denn-v59-builder-capture-union | 13686 | denn-current-detail-preview-stability |
| `num` | 8670 | denn-v59-builder-capture-union | 13688 | denn-current-detail-preview-stability |
| `norm` | 8671 | denn-v59-builder-capture-union | 13053 | denn-v36-4-frame-template-tools |
| `isAll` | 8672 | denn-v59-builder-capture-union | 11783 | denn-v94-frame-template-edit-mode |
| `sizes` | 8673 | denn-v59-builder-capture-union | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 8674 | denn-v59-builder-capture-union | 12915 | denn-v36-3-frame-template-parity-admin |
| `deep` | 8675 | denn-v59-builder-capture-union | 12914 | denn-v36-3-frame-template-parity-admin |
| `toastMsg` | 8676 | denn-v59-builder-capture-union | 11786 | denn-v94-frame-template-edit-mode |
| `parseSub` | 8678 | denn-v59-builder-capture-union | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 8679 | denn-v59-builder-capture-union | 9263 | denn-v71-frame-builder-preview-stability |
| `key` | 8680 | denn-v59-builder-capture-union | 11784 | denn-v94-frame-template-edit-mode |
| `resolve` | 8681 | denn-v59-builder-capture-union | 11794 | denn-v94-frame-template-edit-mode |
| `uniq` | 8682 | denn-v59-builder-capture-union | 11804 | denn-v94-frame-template-edit-mode |
| `visible` | 8683 | denn-v59-builder-capture-union | 13606 | denn-current-admin-stability-sweep |
| `activeBuilderInfo` | 8684 | denn-v59-builder-capture-union | 8785 | denn-v61-frame-template-save-authority |
| `captureTargets` | 8688 | denn-v59-builder-capture-union | 8794 | denn-v61-frame-template-save-authority |
| `switchOn` | 8716 | denn-v59-builder-capture-union | 8778 | denn-v61-frame-template-save-authority |
| `captureWhite` | 8718 | denn-v59-builder-capture-union | 8819 | denn-v61-frame-template-save-authority |
| `writeTargets` | 8729 | denn-v59-builder-capture-union | 8835 | denn-v61-frame-template-save-authority |
| `sealWhite` | 8730 | denn-v59-builder-capture-union | 8842 | denn-v61-frame-template-save-authority |
| `rr` | 8731 | denn-v59-builder-capture-union | 9296 | denn-v71-frame-builder-preview-stability |
| `zonePath` | 8732 | denn-v59-builder-capture-union | 9304 | denn-v71-frame-builder-preview-stability |
| `cover` | 8733 | denn-v59-builder-capture-union | 9309 | denn-v71-frame-builder-preview-stability |
| `drawWhite` | 8734 | denn-v59-builder-capture-union | 9321 | denn-v71-frame-builder-preview-stability |
| `clockCfg` | 8735 | denn-v59-builder-capture-union | 8827 | denn-v61-frame-template-save-authority |
| `makeTemplate` | 8736 | denn-v59-builder-capture-union | 8879 | denn-v61-frame-template-save-authority |
| `lockTemplate` | 8737 | denn-v59-builder-capture-union | 8869 | denn-v61-frame-template-save-authority |
| `scopeLabel` | 8738 | denn-v59-builder-capture-union | 8899 | denn-v61-frame-template-save-authority |
| `fbExport` | 8739 | denn-v59-builder-capture-union | 13304 | denn-v36-4-frame-template-tools |
| `by` | 8750 | denn-v61-frame-template-save-authority | 13686 | denn-current-detail-preview-stability |
| `num` | 8751 | denn-v61-frame-template-save-authority | 13688 | denn-current-detail-preview-stability |
| `norm` | 8752 | denn-v61-frame-template-save-authority | 13053 | denn-v36-4-frame-template-tools |
| `isAll` | 8753 | denn-v61-frame-template-save-authority | 11783 | denn-v94-frame-template-edit-mode |
| `sizes` | 8754 | denn-v61-frame-template-save-authority | 13056 | denn-v36-4-frame-template-tools |
| `tplArr` | 8755 | denn-v61-frame-template-save-authority | 12915 | denn-v36-3-frame-template-parity-admin |
| `deep` | 8756 | denn-v61-frame-template-save-authority | 12914 | denn-v36-3-frame-template-parity-admin |
| `key` | 8757 | denn-v61-frame-template-save-authority | 11784 | denn-v94-frame-template-edit-mode |
| `resolve` | 8758 | denn-v61-frame-template-save-authority | 11794 | denn-v94-frame-template-edit-mode |
| `uniq` | 8768 | denn-v61-frame-template-save-authority | 11804 | denn-v94-frame-template-edit-mode |
| `parseSub` | 8769 | denn-v61-frame-template-save-authority | 9259 | denn-v71-frame-builder-preview-stability |
| `dims` | 8770 | denn-v61-frame-template-save-authority | 9263 | denn-v71-frame-builder-preview-stability |
| `rr` | 8831 | denn-v61-frame-template-save-authority | 9296 | denn-v71-frame-builder-preview-stability |
| `zonePath` | 8832 | denn-v61-frame-template-save-authority | 9304 | denn-v71-frame-builder-preview-stability |
| `cover` | 8833 | denn-v61-frame-template-save-authority | 9309 | denn-v71-frame-builder-preview-stability |
| `drawWhite` | 8834 | denn-v61-frame-template-save-authority | 9321 | denn-v71-frame-builder-preview-stability |
| `persist` | 8894 | denn-v61-frame-template-save-authority | 11787 | denn-v94-frame-template-edit-mode |
| `toastMsg` | 8898 | denn-v61-frame-template-save-authority | 11786 | denn-v94-frame-template-edit-mode |
| `fbExport` | 8940 | denn-v61-frame-template-save-authority | 13304 | denn-v36-4-frame-template-tools |
| `by` | 8993 | denn-v68-size-status-stabilizer | 13686 | denn-current-detail-preview-stability |
| `arr` | 8994 | denn-v68-size-status-stabilizer | 13051 | denn-v36-4-frame-template-tools |
| `clockOn` | 8997 | denn-v68-size-status-stabilizer | 9057 | denn-v69-initial-size-toggle-sync |
| `frameOn` | 8998 | denn-v68-size-status-stabilizer | 9058 | denn-v69-initial-size-toggle-sync |
| `sync` | 9000 | denn-v68-size-status-stabilizer | 9107 | denn-v69-initial-size-toggle-sync |
| `schedule` | 9019 | denn-v68-size-status-stabilizer | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `wrap` | 9024 | denn-v68-size-status-stabilizer | 13690 | denn-current-detail-preview-stability |
| `observe` | 9034 | denn-v68-size-status-stabilizer | 9133 | denn-v69-initial-size-toggle-sync |
| `boot` | 9041 | denn-v68-size-status-stabilizer | 13328 | denn-v36-4-frame-template-tools |
| `by` | 9054 | denn-v69-initial-size-toggle-sync | 13686 | denn-current-detail-preview-stability |
| `sizes` | 9055 | denn-v69-initial-size-toggle-sync | 13056 | denn-v36-4-frame-template-tools |
| `paint` | 9072 | denn-v69-initial-size-toggle-sync | 11627 | denn-v93-frame-template-bulk-category |
| `schedule` | 9121 | denn-v69-initial-size-toggle-sync | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `later` | 9126 | denn-v69-initial-size-toggle-sync | 13655 | denn-current-admin-stability-sweep |
| `wrap` | 9127 | denn-v69-initial-size-toggle-sync | 13690 | denn-current-detail-preview-stability |
| `boot` | 9142 | denn-v69-initial-size-toggle-sync | 13328 | denn-v36-4-frame-template-tools |
| `by` | 9158 | denn-v70-hide-builtin-frame-templates | 13686 | denn-current-detail-preview-stability |
| `templates` | 9159 | denn-v70-hide-builtin-frame-templates | 13055 | denn-v36-4-frame-template-tools |
| `cats` | 9160 | denn-v70-hide-builtin-frame-templates | 13057 | denn-v36-4-frame-template-tools |
| `isBuiltin` | 9161 | denn-v70-hide-builtin-frame-templates | 11562 | denn-v93-frame-template-bulk-category |
| `esc` | 9162 | denn-v70-hide-builtin-frame-templates | 13052 | denn-v36-4-frame-template-tools |
| `norm` | 9163 | denn-v70-hide-builtin-frame-templates | 13053 | denn-v36-4-frame-template-tools |
| `allValue` | 9165 | denn-v70-hide-builtin-frame-templates | 13060 | denn-v36-4-frame-template-tools |
| `sizeKey` | 9166 | denn-v70-hide-builtin-frame-templates | 13061 | denn-v36-4-frame-template-tools |
| `targetValues` | 9177 | denn-v70-hide-builtin-frame-templates | 11809 | denn-v94-frame-template-edit-mode |
| `renderFTplsByCategory` | 9226 | denn-v70-hide-builtin-frame-templates | 13284 | denn-v36-4-frame-template-tools |
| `switchFCat` | 9227 | denn-v70-hide-builtin-frame-templates | 13294 | denn-v36-4-frame-template-tools |
| `renderFTplsTab` | 9231 | denn-v70-hide-builtin-frame-templates | 13289 | denn-v36-4-frame-template-tools |
| `boot` | 9232 | denn-v70-hide-builtin-frame-templates | 13328 | denn-v36-4-frame-template-tools |
| `by` | 9256 | denn-v71-frame-builder-preview-stability | 13686 | denn-current-detail-preview-stability |
| `num` | 9257 | denn-v71-frame-builder-preview-stability | 13688 | denn-current-detail-preview-stability |
| `sizes` | 9258 | denn-v71-frame-builder-preview-stability | 13056 | denn-v36-4-frame-template-tools |
| `render` | 9343 | denn-v71-frame-builder-preview-stability | 13754 | denn-current-detail-preview-stability |
| `fbSelectSize` | 9380 | denn-v71-frame-builder-preview-stability | 10453 | denn-v80-frame-builder-clock-preset-and-render-guard |
| `by` | 9406 | denn-v72-frame-builder-entry-flicker-guard | 13686 | denn-current-detail-preview-stability |
| `root` | 9407 | denn-v72-frame-builder-entry-flicker-guard | 12666 | denn-v36-3-dynamic-frame-text-fields-admin |
| `prepare` | 9413 | denn-v72-frame-builder-entry-flicker-guard | 9491 | denn-v73-frame-builder-legacy-timer-guard |
| `settle` | 9418 | denn-v72-frame-builder-entry-flicker-guard | 13719 | denn-current-detail-preview-stability |
| `scheduleSettle` | 9425 | denn-v72-frame-builder-entry-flicker-guard | 13732 | denn-current-detail-preview-stability |
| `goTab` | 9430 | denn-v72-frame-builder-entry-flicker-guard | 13324 | denn-v36-4-frame-template-tools |
| `initFrameBuilder` | 9440 | denn-v72-frame-builder-entry-flicker-guard | 11102 | denn-v86-builder-white-immediate-authority |
| `by` | 9473 | denn-v73-frame-builder-legacy-timer-guard | 13686 | denn-current-detail-preview-stability |
| `root` | 9474 | denn-v73-frame-builder-legacy-timer-guard | 12666 | denn-v36-3-dynamic-frame-text-fields-admin |
| `onBuilder` | 9475 | denn-v73-frame-builder-legacy-timer-guard | 10479 | denn-v81-frame-builder-open-safe-mode |
| `settle` | 9496 | denn-v73-frame-builder-legacy-timer-guard | 13719 | denn-current-detail-preview-stability |
| `schedule` | 9505 | denn-v73-frame-builder-legacy-timer-guard | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `goTab` | 9511 | denn-v73-frame-builder-legacy-timer-guard | 13324 | denn-v36-4-frame-template-tools |
| `initFrameBuilder` | 9521 | denn-v73-frame-builder-legacy-timer-guard | 11102 | denn-v86-builder-white-immediate-authority |
| `by` | 9558 | denn-v74-frame-builder-visible-panel-stabilizer | 13686 | denn-current-detail-preview-stability |
| `root` | 9559 | denn-v74-frame-builder-visible-panel-stabilizer | 12666 | denn-v36-3-dynamic-frame-text-fields-admin |
| `onBuilder` | 9560 | denn-v74-frame-builder-visible-panel-stabilizer | 10479 | denn-v81-frame-builder-open-safe-mode |
| `pulse` | 9601 | denn-v74-frame-builder-visible-panel-stabilizer | 11433 | denn-v91-white-label-final-lock |
| `goTab` | 9608 | denn-v74-frame-builder-visible-panel-stabilizer | 13324 | denn-v36-4-frame-template-tools |
| `initFrameBuilder` | 9618 | denn-v74-frame-builder-visible-panel-stabilizer | 11102 | denn-v86-builder-white-immediate-authority |
| `by` | 9636 | denn-v75d-frame-builder-repeat-click-guard | 13686 | denn-current-detail-preview-stability |
| `onBuilder` | 9637 | denn-v75d-frame-builder-repeat-click-guard | 10479 | denn-v81-frame-builder-open-safe-mode |
| `goTab` | 9655 | denn-v75d-frame-builder-repeat-click-guard | 13324 | denn-v36-4-frame-template-tools |
| `by` | 9670 | denn-v76-ui-settings-save-authority | 13686 | denn-current-detail-preview-stability |
| `clamp` | 9672 | denn-v76-ui-settings-save-authority | 13692 | denn-current-detail-preview-stability |
| `state` | 9673 | denn-v76-ui-settings-save-authority | 10074 | denn-v79b-room-common-default-card-visible |
| `sizeKey` | 9674 | denn-v76-ui-settings-save-authority | 13061 | denn-v36-4-frame-template-tools |
| `arr` | 9676 | denn-v76-ui-settings-save-authority | 13051 | denn-v36-4-frame-template-tools |
| `persist` | 9721 | denn-v76-ui-settings-save-authority | 11787 | denn-v94-frame-template-edit-mode |
| `bind` | 9748 | denn-v76-ui-settings-save-authority | 10173 | denn-v79d-common-default-open-authority |
| `dennSyncUISettingsV76` | 9760 | denn-v76-ui-settings-save-authority | 10030 | denn-v79-room-common-default-admin |
| `dennSaveUISettingsV76` | 9761 | denn-v76-ui-settings-save-authority | 10037 | denn-v79-room-common-default-admin |
| `wrapped` | 9764 | denn-v76-ui-settings-save-authority | 12548 | denn-v36-order-admin-bulk |
| `go` | 9775 | denn-v76-ui-settings-save-authority | 13658 | denn-current-admin-stability-sweep |
| `txt` | 9786 | denn-v76-ui-settings-save-authority | 10930 | denn-v85-frame-template-card-layout-lock |
| `by` | 9807 | denn-v77-ui-room-default-size-retire | 13686 | denn-current-detail-preview-stability |
| `state` | 9808 | denn-v77-ui-room-default-size-retire | 10074 | denn-v79b-room-common-default-card-visible |
| `hideRetiredRow` | 9809 | denn-v77-ui-room-default-size-retire | 9882 | denn-v78-ui-frame-preview-scale-retire |
| `dennSyncUISettingsV76` | 9827 | denn-v77-ui-room-default-size-retire | 10030 | denn-v79-room-common-default-admin |
| `dennSaveUISettingsV76` | 9834 | denn-v77-ui-room-default-size-retire | 10037 | denn-v79-room-common-default-admin |
| `go` | 9846 | denn-v77-ui-room-default-size-retire | 13658 | denn-current-admin-stability-sweep |
| `by` | 9869 | denn-v78-ui-frame-preview-scale-retire | 13686 | denn-current-detail-preview-stability |
| `state` | 9870 | denn-v78-ui-frame-preview-scale-retire | 10074 | denn-v79b-room-common-default-card-visible |
| `dennSyncUISettingsV76` | 9894 | denn-v78-ui-frame-preview-scale-retire | 10030 | denn-v79-room-common-default-admin |
| `dennSaveUISettingsV76` | 9901 | denn-v78-ui-frame-preview-scale-retire | 10037 | denn-v79-room-common-default-admin |
| `go` | 9913 | denn-v78-ui-frame-preview-scale-retire | 13658 | denn-current-admin-stability-sweep |
| `by` | 9967 | denn-v79-room-common-default-admin | 13686 | denn-current-detail-preview-stability |
| `state` | 9968 | denn-v79-room-common-default-admin | 10074 | denn-v79b-room-common-default-card-visible |
| `save` | 9977 | denn-v79-room-common-default-admin | 11571 | denn-v93-frame-template-bulk-category |
| `openRoomCommonDefaultSetupV79` | 10003 | denn-v79-room-common-default-admin | 10085 | denn-v79b-room-common-default-card-visible |
| `rg` | 10046 | denn-v79-room-common-default-admin | 10112 | denn-v79b-room-common-default-card-visible |
| `go` | 10056 | denn-v79-room-common-default-admin | 13658 | denn-current-admin-stability-sweep |
| `by` | 10073 | denn-v79b-room-common-default-card-visible | 13686 | denn-current-detail-preview-stability |
| `install` | 10094 | denn-v79b-room-common-default-card-visible | 12081 | denn-v94-frame-template-edit-mode |
| `go` | 10123 | denn-v79b-room-common-default-card-visible | 13658 | denn-current-admin-stability-sweep |
| `openCommonDefault` | 10139 | denn-v79c-room-common-default-savebar-entry | 10164 | denn-v79d-common-default-open-authority |
| `by` | 10256 | denn-v80-frame-builder-clock-preset-and-render-guard | 13686 | denn-current-detail-preview-stability |
| `num` | 10257 | denn-v80-frame-builder-clock-preset-and-render-guard | 13688 | denn-current-detail-preview-stability |
| `arr` | 10258 | denn-v80-frame-builder-clock-preset-and-render-guard | 13051 | denn-v36-4-frame-template-tools |
| `saveSoft` | 10260 | denn-v80-frame-builder-clock-preset-and-render-guard | 13096 | denn-v36-4-frame-template-tools |
| `key` | 10342 | denn-v80-frame-builder-clock-preset-and-render-guard | 11784 | denn-v94-frame-template-edit-mode |
| `goTab` | 10427 | denn-v80-frame-builder-clock-preset-and-render-guard | 13324 | denn-v36-4-frame-template-tools |
| `initFrameBuilder` | 10444 | denn-v80-frame-builder-clock-preset-and-render-guard | 11102 | denn-v86-builder-white-immediate-authority |
| `by` | 10478 | denn-v81-frame-builder-open-safe-mode | 13686 | denn-current-detail-preview-stability |
| `once` | 10480 | denn-v81-frame-builder-open-safe-mode | 13490 | denn-v36-5-order-actions-singleflight-admin |
| `settle` | 10483 | denn-v81-frame-builder-open-safe-mode | 13719 | denn-current-detail-preview-stability |
| `goTab` | 10489 | denn-v81-frame-builder-open-safe-mode | 13324 | denn-v36-4-frame-template-tools |
| `by` | 10508 | denn-v82-frame-builder-clock-toggle-authority | 13686 | denn-current-detail-preview-stability |
| `sizes` | 10509 | denn-v82-frame-builder-clock-toggle-authority | 13056 | denn-v36-4-frame-template-tools |
| `fbRender` | 10553 | denn-v82-frame-builder-clock-toggle-authority | 13299 | denn-v36-4-frame-template-tools |
| `boot` | 10576 | denn-v82-frame-builder-clock-toggle-authority | 13328 | denn-v36-4-frame-template-tools |
| `by` | 10604 | denn-v83-hide-risky-ui-scale-controls | 13686 | denn-current-detail-preview-stability |
| `apply` | 10616 | denn-v83-hide-risky-ui-scale-controls | 13212 | denn-v36-4-frame-template-tools |
| `goTab` | 10649 | denn-v83-hide-risky-ui-scale-controls | 13324 | denn-v36-4-frame-template-tools |
| `by` | 10698 | denn-v84-white-border-flicker-lock | 13686 | denn-current-detail-preview-stability |
| `later` | 10740 | denn-v84-white-border-flicker-lock | 13655 | denn-current-admin-stability-sweep |
| `openZoneEditor` | 10761 | denn-v84-white-border-flicker-lock | 13309 | denn-v36-4-frame-template-tools |
| `goTab` | 10772 | denn-v84-white-border-flicker-lock | 13324 | denn-v36-4-frame-template-tools |
| `initFrameBuilder` | 10782 | denn-v84-white-border-flicker-lock | 11102 | denn-v86-builder-white-immediate-authority |
| `by` | 10888 | denn-v85-frame-template-card-layout-lock | 13686 | denn-current-detail-preview-stability |
| `arr` | 10889 | denn-v85-frame-template-card-layout-lock | 13051 | denn-v36-4-frame-template-tools |
| `isActionButton` | 10891 | denn-v85-frame-template-card-layout-lock | 12208 | denn-v95-frame-template-list-ui-stabilize |
| `txt` | 10893 | denn-v85-frame-template-card-layout-lock | 10930 | denn-v85-frame-template-card-layout-lock |
| `normalize` | 10968 | denn-v85-frame-template-card-layout-lock | 11411 | denn-v91-white-label-final-lock |
| `schedule` | 10974 | denn-v85-frame-template-card-layout-lock | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `renderFTplsByCategory` | 10984 | denn-v85-frame-template-card-layout-lock | 13284 | denn-v36-4-frame-template-tools |
| `renderFTplsTab` | 10993 | denn-v85-frame-template-card-layout-lock | 13289 | denn-v36-4-frame-template-tools |
| `goTab` | 11002 | denn-v85-frame-template-card-layout-lock | 13324 | denn-v36-4-frame-template-tools |
| `by` | 11035 | denn-v86-builder-white-immediate-authority | 13686 | denn-current-detail-preview-stability |
| `goTab` | 11092 | denn-v86-builder-white-immediate-authority | 13324 | denn-v36-4-frame-template-tools |
| `by` | 11145 | denn-v87-name2-textbox-toggle | 13686 | denn-current-detail-preview-stability |
| `currentTpl` | 11146 | denn-v87-name2-textbox-toggle | 13218 | denn-v36-4-frame-template-tools |
| `setZT` | 11236 | denn-v87-name2-textbox-toggle | 12868 | denn-v36-3-dynamic-frame-text-fields-admin |
| `zeDefaultTexts` | 11246 | denn-v87-name2-textbox-toggle | 12842 | denn-v36-3-dynamic-frame-text-fields-admin |
| `zeRenderList` | 11261 | denn-v87-name2-textbox-toggle | 13373 | denn-v36-5-admin-render-stability |
| `openZoneEditor` | 11277 | denn-v87-name2-textbox-toggle | 13309 | denn-v36-4-frame-template-tools |
| `by` | 11312 | denn-v89-ze-scroll-render-stability | 13686 | denn-current-detail-preview-stability |
| `wrap` | 11313 | denn-v89-ze-scroll-render-stability | 13690 | denn-current-detail-preview-stability |
| `canvas` | 11314 | denn-v89-ze-scroll-render-stability | 13691 | denn-current-detail-preview-stability |
| `clamp` | 11315 | denn-v89-ze-scroll-render-stability | 13692 | denn-current-detail-preview-stability |
| `snap` | 11316 | denn-v89-ze-scroll-render-stability | 13705 | denn-current-detail-preview-stability |
| `restore` | 11332 | denn-v89-ze-scroll-render-stability | 13710 | denn-current-detail-preview-stability |
| `setZePreviewZoom` | 11371 | denn-v89-ze-scroll-render-stability | 13319 | denn-v36-4-frame-template-tools |
| `zeRender` | 11390 | denn-v89-ze-scroll-render-stability | 13314 | denn-v36-4-frame-template-tools |
| `by` | 11409 | denn-v91-white-label-final-lock | 13686 | denn-current-detail-preview-stability |
| `by` | 11557 | denn-v93-frame-template-bulk-category | 13686 | denn-current-detail-preview-stability |
| `arr` | 11558 | denn-v93-frame-template-bulk-category | 13051 | denn-v36-4-frame-template-tools |
| `esc` | 11559 | denn-v93-frame-template-bulk-category | 13052 | denn-v36-4-frame-template-tools |
| `templates` | 11560 | denn-v93-frame-template-bulk-category | 13055 | denn-v36-4-frame-template-tools |
| `cats` | 11561 | denn-v93-frame-template-bulk-category | 13057 | denn-v36-4-frame-template-tools |
| `visible` | 11564 | denn-v93-frame-template-bulk-category | 13606 | denn-current-admin-stability-sweep |
| `install` | 11665 | denn-v93-frame-template-bulk-category | 12081 | denn-v94-frame-template-edit-mode |
| `schedule` | 11672 | denn-v93-frame-template-bulk-category | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `renderFTplsByCategory` | 11682 | denn-v93-frame-template-bulk-category | 13284 | denn-v36-4-frame-template-tools |
| `renderFTplsTab` | 11691 | denn-v93-frame-template-bulk-category | 13289 | denn-v36-4-frame-template-tools |
| `goTab` | 11700 | denn-v93-frame-template-bulk-category | 13324 | denn-v36-4-frame-template-tools |
| `by` | 11776 | denn-v94-frame-template-edit-mode | 13686 | denn-current-detail-preview-stability |
| `arr` | 11777 | denn-v94-frame-template-edit-mode | 13051 | denn-v36-4-frame-template-tools |
| `templates` | 11778 | denn-v94-frame-template-edit-mode | 13055 | denn-v36-4-frame-template-tools |
| `sizes` | 11779 | denn-v94-frame-template-edit-mode | 13056 | denn-v36-4-frame-template-tools |
| `deep` | 11780 | denn-v94-frame-template-edit-mode | 12914 | denn-v36-3-frame-template-parity-admin |
| `num` | 11781 | denn-v94-frame-template-edit-mode | 13688 | denn-current-detail-preview-stability |
| `norm` | 11782 | denn-v94-frame-template-edit-mode | 13053 | denn-v36-4-frame-template-tools |
| `esc` | 11785 | denn-v94-frame-template-edit-mode | 13052 | denn-v36-4-frame-template-tools |
| `schedule` | 12087 | denn-v94-frame-template-edit-mode | 12242 | denn-v95-frame-template-list-ui-stabilize |
| `renderFTplsByCategory` | 12102 | denn-v94-frame-template-edit-mode | 13284 | denn-v36-4-frame-template-tools |
| `renderFTplsTab` | 12107 | denn-v94-frame-template-edit-mode | 13289 | denn-v36-4-frame-template-tools |
| `goTab` | 12112 | denn-v94-frame-template-edit-mode | 13324 | denn-v36-4-frame-template-tools |
| `by` | 12194 | denn-v95-frame-template-list-ui-stabilize | 13686 | denn-current-detail-preview-stability |
| `arr` | 12195 | denn-v95-frame-template-list-ui-stabilize | 13051 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 12249 | denn-v95-frame-template-list-ui-stabilize | 13284 | denn-v36-4-frame-template-tools |
| `renderFTplsTab` | 12259 | denn-v95-frame-template-list-ui-stabilize | 13289 | denn-v36-4-frame-template-tools |
| `goTab` | 12269 | denn-v95-frame-template-list-ui-stabilize | 13324 | denn-v36-4-frame-template-tools |
| `by` | 12340 | denn-v36-admin-order-labels-stable | 13686 | denn-current-detail-preview-stability |
| `esc` | 12341 | denn-v36-admin-order-labels-stable | 13052 | denn-v36-4-frame-template-tools |
| `fmtDate` | 12342 | denn-v36-admin-order-labels-stable | 12422 | denn-v36-order-admin-bulk |
| `patchGoTab` | 12384 | denn-v36-admin-order-labels-stable | 12545 | denn-v36-order-admin-bulk |
| `wrapped` | 12387 | denn-v36-admin-order-labels-stable | 12548 | denn-v36-order-admin-bulk |
| `run` | 12397 | denn-v36-admin-order-labels-stable | 12552 | denn-v36-order-admin-bulk |
| `by` | 12420 | denn-v36-order-admin-bulk | 13686 | denn-current-detail-preview-stability |
| `esc` | 12421 | denn-v36-order-admin-bulk | 13052 | denn-v36-4-frame-template-tools |
| `downloadBlob` | 12423 | denn-v36-order-admin-bulk | 13502 | denn-v36-5-order-actions-singleflight-admin |
| `imageSrc` | 12572 | denn-v96-detail-template-image-underlay | 12918 | denn-v36-3-frame-template-parity-admin |
| `active` | 12577 | denn-v96-detail-template-image-underlay | 13375 | denn-v36-5-admin-render-stability |
| `zeRender` | 12609 | denn-v96-detail-template-image-underlay | 13314 | denn-v36-4-frame-template-tools |
| `openZoneEditor` | 12618 | denn-v96-detail-template-image-underlay | 13309 | denn-v36-4-frame-template-tools |
| `by` | 12652 | denn-v36-3-dynamic-frame-text-fields-admin | 13686 | denn-current-detail-preview-stability |
| `currentTpl` | 12653 | denn-v36-3-dynamic-frame-text-fields-admin | 13218 | denn-v36-4-frame-template-tools |
| `cleanKey` | 12654 | denn-v36-3-dynamic-frame-text-fields-admin | 12916 | denn-v36-3-frame-template-parity-admin |
| `inferBase` | 12655 | denn-v36-3-dynamic-frame-text-fields-admin | 12917 | denn-v36-3-frame-template-parity-admin |
| `addField` | 12681 | denn-v36-3-dynamic-frame-text-fields-admin | 12931 | denn-v36-3-frame-template-parity-admin |
| `hasExplicitField` | 12687 | denn-v36-3-dynamic-frame-text-fields-admin | 12932 | denn-v36-3-frame-template-parity-admin |
| `openZoneEditor` | 12878 | denn-v36-3-dynamic-frame-text-fields-admin | 13309 | denn-v36-4-frame-template-tools |
| `zeRenderList` | 12891 | denn-v36-3-dynamic-frame-text-fields-admin | 13373 | denn-v36-5-admin-render-stability |
| `saveSoft` | 12963 | denn-v36-3-frame-template-parity-admin | 13096 | denn-v36-4-frame-template-tools |
| `openZoneEditor` | 12986 | denn-v36-3-frame-template-parity-admin | 13309 | denn-v36-4-frame-template-tools |
| `renderFTplsByCategory` | 12996 | denn-v36-3-frame-template-parity-admin | 13284 | denn-v36-4-frame-template-tools |
| `fbExport` | 13001 | denn-v36-3-frame-template-parity-admin | 13304 | denn-v36-4-frame-template-tools |
| `by` | 13050 | denn-v36-4-frame-template-tools | 13686 | denn-current-detail-preview-stability |
| `by` | 13341 | denn-v36-5-admin-render-stability | 13686 | denn-current-detail-preview-stability |
| `raf` | 13342 | denn-v36-5-admin-render-stability | 13687 | denn-current-detail-preview-stability |
| `clamp` | 13343 | denn-v36-5-admin-render-stability | 13692 | denn-current-detail-preview-stability |
| `px` | 13394 | denn-v36-5-admin-render-stability | 13417 | denn-v36-5-admin-render-stability |
| `py` | 13395 | denn-v36-5-admin-render-stability | 13418 | denn-v36-5-admin-render-stability |
| `hit` | 13396 | denn-v36-5-admin-render-stability | 13419 | denn-v36-5-admin-render-stability |
| `by` | 13488 | denn-v36-5-order-actions-singleflight-admin | 13686 | denn-current-detail-preview-stability |
| `render` | 13664 | denn-current-admin-stability-sweep | 13754 | denn-current-detail-preview-stability |

## Dead-code candidates — CSS selectors overridden later

Total: 41 overridden top-level selector rules.
(CSS specificity & order matter in the cascade — these are *textual* overrides only; 
a 'losing' rule may still partially apply via differing properties. Manual review needed.)

### CSS override pairs (dead-block → winner-block) by selector count

| Dead block | Winner block | # selectors overridden |
|---|---|---|
| denn-v85-frame-template-card-layout-lock-css | denn-v95-frame-template-list-ui-stabilize-css | 5 |
| denn-v50-detail-builder-sync-css | denn-v84-white-border-flicker-lock-css | 2 |
| denn-v50-detail-builder-sync-css | denn-v51-builder-white-ui-polish-css | 2 |
| denn-v89-ze-scroll-render-stability-css | denn-current-detail-preview-stability-css | 2 |
| denn-v36-4-frame-template-tools-css | denn-current-detail-preview-stability-css | 2 |
| denn-v5-ui-settings-style | denn-v6-admin-css | 1 |
| denn-v11-admin-css | denn-v12-admin-css | 1 |
| denn-v12-admin-css | denn-v14-admin-css | 1 |
| denn-v14-admin-css | denn-current-admin-stability-css | 1 |
| denn-v16-admin-css | denn-current-admin-stability-css | 1 |
| denn-v14-admin-css | denn-v16-admin-css | 1 |
| denn-v14-admin-css | denn-v32-admin-css | 1 |
| denn-v27-admin-css | denn-v32-admin-css | 1 |
| denn-v16-admin-css | denn-v19-admin-style | 1 |
| denn-v18-style | denn-v19-admin-style | 1 |
| denn-v32-admin-css | denn-v33-admin-css | 1 |
| denn-v41-remove-builder-white-border-css | denn-v49-render-authority-lock-css | 1 |
| denn-v45-design-canvas-only-css | denn-v74-frame-builder-visible-panel-stabilizer-css | 1 |
| denn-v45-design-canvas-only-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v49-render-authority-lock-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v56-canonical-save-detail-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v50-detail-builder-sync-css | denn-v86-builder-white-immediate-authority-css | 1 |
| denn-v51-builder-white-ui-polish-css | denn-v86-builder-white-immediate-authority-css | 1 |
| denn-v51-builder-white-ui-polish-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v72-frame-builder-entry-flicker-guard-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v73-frame-builder-legacy-timer-guard-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v80-frame-builder-clock-preset-and-render-guard-css | denn-v84-white-border-flicker-lock-css | 1 |
| denn-v50-detail-builder-sync-css | denn-current-detail-preview-stability-css | 1 |
| denn-v55-three-issue-stabilize-css | denn-v56-canonical-save-detail-css | 1 |
| denn-v66-frame-thumb-fit-css | denn-v95-frame-template-list-ui-stabilize-css | 1 |
| denn-v80-frame-builder-clock-preset-and-render-guard-css | denn-v86-builder-white-immediate-authority-css | 1 |
| denn-v93-frame-template-bulk-category-css | denn-v95-frame-template-list-ui-stabilize-css | 1 |
| denn-v88-ze-zoom-scroll-fix-css | denn-current-detail-preview-stability-css | 1 |

## Per-block verdict

| Start | End | Block ID | Type | Status | Note |
|---|---|---|---|---|---|
| 2732 | 2734 | denn-final-css | style | alive | all 9 defs are winners |
| 2735 | 2750 | denn-final-js | script | mixed | 9/12 defs win |
| 2751 | 2772 | denn-v5-ui-settings-style | style | mixed | 18/19 defs win |
| 2773 | 2800 | denn-v5-ui-settings-script | script | mixed | 8/20 defs win |
| 2801 | 2812 | denn-v6-admin-css | style | alive | all 13 defs are winners |
| 2813 | 2902 | denn-v6-admin-js | script | mixed | 3/14 defs win |
| 2903 | 2907 | denn-v10-safe-css | style | alive | all 11 defs are winners |
| 2908 | 2959 | denn-v10-safe-js | script | mixed | 7/16 defs win |
| 2960 | 2964 | denn-v11-admin-css | style | mixed | 6/7 defs win |
| 2965 | 2994 | denn-v11-admin-js | script | mixed | 10/22 defs win |
| 2995 | 3013 | denn-v12-admin-css | style | mixed | 16/17 defs win |
| 3014 | 3038 | denn-v12-admin-js | script | mixed | 7/15 defs win |
| 3039 | 3043 | denn-v13-admin-css | style | alive | all 2 defs are winners |
| 3044 | 3148 | denn-v13-admin-js | script | mixed | 7/16 defs win |
| 3149 | 3175 | denn-v14-admin-css | style | mixed | 19/22 defs win |
| 3176 | 3277 | denn-v14-admin-js | script | mixed | 17/41 defs win |
| 3278 | 3294 | denn-v16-admin-css | style | mixed | 13/15 defs win |
| 3295 | 3319 | denn-v16-admin-js | script | mixed | 3/15 defs win |
| 3320 | 3345 | denn-v17-admin-css | style | alive | all 11 defs are winners |
| 3346 | 3411 | denn-v17-admin-js | script | mixed | 7/20 defs win |
| 3412 | 3422 | denn-v18-style | style | mixed | 7/8 defs win |
| 3423 | 3485 | denn-v18-admin-stability | script | mixed | 9/16 defs win |
| 3486 | 3495 | denn-v19-admin-style | style | alive | all 7 defs are winners |
| 3496 | 3565 | denn-v19-admin-stability | script | mixed | 10/18 defs win |
| 3566 | 3572 | denn-v20-admin-css | style | alive | all 6 defs are winners |
| 3573 | 3630 | denn-v20-admin-js | script | mixed | 9/16 defs win |
| 3631 | 3640 | denn-v21-admin-clock-ui | script | mixed | 1/3 defs win |
| 3641 | 3647 | denn-v22-admin-css | style | alive | all 14 defs are winners |
| 3648 | 3671 | denn-v22-admin-js | script | mixed | 8/12 defs win |
| 3672 | 3676 | denn-v23-admin-css | style | alive | all 10 defs are winners |
| 3677 | 3714 | denn-v23-admin-js | script | mixed | 15/27 defs win |
| 3715 | 3729 | denn-v24-admin-fb-raw-clock | script | mixed | 3/8 defs win |
| 3730 | 3742 | denn-v25-admin-ui-persist | script | mixed | 1/3 defs win |
| 3743 | 3745 | denn-v26-admin-ui-dedupe | style | alive | all 1 defs are winners |
| 3746 | 3755 | denn-v26-admin-ui-dedupe-js | script | mixed | 1/2 defs win |
| 3756 | 3763 | denn-v27-admin-css | style | mixed | 6/7 defs win |
| 3764 | 3788 | denn-v27-admin-js | script | mixed | 5/9 defs win |
| 3789 | 3791 | denn-v29-admin-css | style | alive | all 2 defs are winners |
| 3792 | 3807 | denn-v29-admin-js | script | mixed | 2/6 defs win |
| 3808 | 3821 | denn-v32-admin-css | style | mixed | 11/12 defs win |
| 3822 | 4010 | denn-v32-admin-stable | script | mixed | 8/47 defs win |
| 4011 | 4034 | denn-v33-admin-css | style | alive | all 17 defs are winners |
| 4035 | 4153 | denn-v33-admin-stable | script | mixed | 28/54 defs win |
| 4154 | 4193 | denn-v33-admin-finalize | script | mixed | 9/16 defs win |
| 4194 | 4277 | denn-v34-admin-frame-upload-stable | script | mixed | 7/9 defs win |
| 4278 | 4306 | denn-v34-frame-builder-crisp-render | script | mixed | 5/22 defs win |
| 4307 | 4440 | denn-v35-size-input-height-width-final | script | mixed | 8/25 defs win |
| 4441 | 4447 | denn-v35-detail-size-selector-css | style | alive | all 5 defs are winners |
| 4448 | 4606 | denn-v35-detail-size-selector | script | mixed | 16/30 defs win |
| 4607 | 4618 | denn-v35-size-list-live-css | style | alive | all 10 defs are winners |
| 4619 | 4725 | denn-v35-size-list-live-preview-clock-presets | script | mixed | 9/20 defs win |
| 4726 | 4791 | denn-v35-frame-builder-size-clock-sync | script | mixed | 4/11 defs win |
| 4792 | 4917 | denn-v35-size-list-live-stabilizer-final | script | mixed | 14/27 defs win |
| 4918 | 5041 | denn-v35-size-clock-onoff-final | script | mixed | 10/28 defs win |
| 5042 | 5077 | denn-v35-clock-preset-visible-anchor-final | script | mixed | 1/3 defs win |
| 5078 | 5138 | denn-v35-clock-toggle-button-and-preset-position-final | script | mixed | 6/13 defs win |
| 5139 | 5144 | denn-v35-mockup-remove-click-fix-css | style | alive | all 4 defs are winners |
| 5145 | 5180 | denn-v35-mockup-remove-click-fix | script | mixed | 2/6 defs win |
| 5181 | 5198 | denn-v35-guide-bg-detail-css | style | alive | all 15 defs are winners |
| 5199 | 5301 | denn-v35-guide-bg-detail-modal-final | script | mixed | 18/36 defs win |
| 5302 | 5415 | denn-v35-clock-onoff-save-stabilizer-final | script | mixed | 8/26 defs win |
| 5416 | 5469 | denn-v35-clock-onoff-selection-sync-final | script | mixed | 3/11 defs win |
| 5470 | 5517 | denn-v35-guide-bg-real-room-setup-final | script | mixed | 3/10 defs win |
| 5518 | 5566 | denn-v35-guide-bg-card-ui-polish | style | alive | all 8 defs are winners |
| 5567 | 5601 | denn-v35-guide-bg-card-ui-polish | script | mixed | 4/8 defs win |
| 5602 | 5641 | denn-v35-admin-save-render-stabilizer-final | script | alive | all 4 defs are winners |
| 5642 | 5654 | denn-v35-data-safety-css | style | alive | all 11 defs are winners |
| 5655 | 5901 | denn-v35-admin-data-safety-final | script | mixed | 21/38 defs win |
| 5902 | 5911 | denn-v35-watermark-live-preview-style | style | alive | all 8 defs are winners |
| 5912 | 6015 | denn-v35-watermark-live-preview-final | script | mixed | 13/14 defs win |
| 6016 | 6023 | denn-v35-frame-builder-clean-export-css | style | alive | all 2 defs are winners |
| 6024 | 6095 | denn-v35-frame-builder-clean-export-final | script | mixed | 10/20 defs win |
| 6096 | 6180 | denn-v35-frame-builder-size-clock-link-final | script | mixed | 5/11 defs win |
| 6181 | 6224 | denn-v46-admin-guide-bg-return-refresh | script | mixed | 4/5 defs win |
| 6225 | 6346 | denn-v36-size-frame-enabled-admin-final | script | mixed | 9/19 defs win |
| 6347 | 6510 | denn-v37-size-save-controller-final | script | mixed | 9/38 defs win |
| 6511 | 6518 | denn-v38-multi-size-checkbox-css | style | alive | all 6 defs are winners |
| 6519 | 6662 | denn-v38-multi-size-checkbox | script | mixed | 18/42 defs win |
| 6663 | 6667 | denn-v39-white-border-guide-css | style | alive | all 3 defs are winners |
| 6668 | 6768 | denn-v39-white-border-guide-final | script | mixed | 7/16 defs win |
| 6769 | 6774 | denn-v40-builder-render-rules-css | style | alive | all 4 defs are winners |
| 6775 | 6851 | denn-v40-builder-render-rules | script | mixed | 12/24 defs win |
| 6852 | 6855 | denn-v41-remove-builder-white-border-css | style | mixed | 1/2 defs win |
| 6856 | 6892 | denn-v41-remove-builder-white-border | script | mixed | 3/9 defs win |
| 6893 | 6896 | denn-v42-detail-preview-guide-css | style | alive | all 2 defs are winners |
| 6897 | 7018 | denn-v42-detail-preview-guide | script | mixed | 2/29 defs win |
| 7019 | 7023 | denn-v44-transparent-detail-overlay-css | style | alive | all 3 defs are winners |
| 7024 | 7154 | denn-v44-transparent-detail-overlay | script | mixed | 14/34 defs win |
| 7155 | 7161 | denn-v45-design-canvas-only-css | style | mixed | 3/5 defs win |
| 7162 | 7299 | denn-v45-design-canvas-only | script | mixed | 22/42 defs win |
| 7300 | 7307 | denn-v48-final-size-stability-css | style | alive | all 4 defs are winners |
| 7308 | 7511 | denn-v48-final-size-stability | script | mixed | 30/42 defs win |
| 7512 | 7516 | denn-v49-render-authority-lock-css | style | mixed | 2/3 defs win |
| 7517 | 7553 | denn-v49-render-authority-lock | script | mixed | 5/29 defs win |
| 7554 | 7565 | denn-v50-detail-builder-sync-css | style | mixed | 3/9 defs win |
| 7566 | 7703 | denn-v50-detail-builder-sync | script | mixed | 7/36 defs win |
| 7704 | 7832 | denn-v51-builder-white-ui-polish-css | style | mixed | 16/18 defs win |
| 7833 | 7867 | denn-v51-builder-white-ui-polish | script | mixed | 2/4 defs win |
| 7868 | 7894 | denn-v52-builder-white-panel-relocate-css | style | alive | all 5 defs are winners |
| 7895 | 7923 | denn-v52-builder-white-panel-relocate | script | mixed | 2/4 defs win |
| 7924 | 7945 | denn-v53-detail-link-stability-css | style | alive | all 4 defs are winners |
| 7946 | 8122 | denn-v53-detail-link-stability | script | mixed | 10/41 defs win |
| 8123 | 8132 | denn-v54-size-render-lock-css | style | alive | all 2 defs are winners |
| 8133 | 8263 | denn-v54-size-render-lock | script | mixed | 3/21 defs win |
| 8264 | 8270 | denn-v55-three-issue-stabilize-css | style | mixed | 2/3 defs win |
| 8271 | 8428 | denn-v55-three-issue-stabilize | script | mixed | 7/31 defs win |
| 8429 | 8439 | denn-v56-canonical-save-detail-css | style | mixed | 4/5 defs win |
| 8440 | 8664 | denn-v56-canonical-save-detail | script | mixed | 13/43 defs win |
| 8665 | 8745 | denn-v59-builder-capture-union | script | mixed | 11/40 defs win |
| 8746 | 8946 | denn-v61-frame-template-save-authority | script | mixed | 18/37 defs win |
| 8947 | 8967 | denn-v66-frame-thumb-fit-css | style | mixed | 1/2 defs win |
| 8968 | 8984 | denn-v67-size-status-labels | script | alive | all 2 defs are winners |
| 8985 | 8989 | denn-v68-size-status-stabilizer-css | style | alive | all 1 defs are winners |
| 8990 | 9050 | denn-v68-size-status-stabilizer | script | mixed | 2/11 defs win |
| 9051 | 9151 | denn-v69-initial-size-toggle-sync | script | mixed | 10/17 defs win |
| 9152 | 9154 | denn-v70-hide-builtin-frame-templates-css | style | alive | all 1 defs are winners |
| 9155 | 9238 | denn-v70-hide-builtin-frame-templates | script | mixed | 7/20 defs win |
| 9239 | 9251 | denn-v71-frame-builder-preview-stability-css | style | alive | all 2 defs are winners |
| 9252 | 9390 | denn-v71-frame-builder-preview-stability | script | mixed | 14/19 defs win |
| 9391 | 9401 | denn-v72-frame-builder-entry-flicker-guard-css | style | mixed | 2/3 defs win |
| 9402 | 9455 | denn-v72-frame-builder-entry-flicker-guard | script | mixed | 2/9 defs win |
| 9456 | 9468 | denn-v73-frame-builder-legacy-timer-guard-css | style | mixed | 2/3 defs win |
| 9469 | 9534 | denn-v73-frame-builder-legacy-timer-guard | script | mixed | 3/10 defs win |
| 9535 | 9553 | denn-v74-frame-builder-visible-panel-stabilizer-css | style | alive | all 4 defs are winners |
| 9554 | 9631 | denn-v74-frame-builder-visible-panel-stabilizer | script | mixed | 4/10 defs win |
| 9632 | 9666 | denn-v75d-frame-builder-repeat-click-guard | script | mixed | 1/4 defs win |
| 9667 | 9793 | denn-v76-ui-settings-save-authority | script | mixed | 7/19 defs win |
| 9794 | 9803 | denn-v77-ui-room-default-size-retire-css | style | alive | all 2 defs are winners |
| 9804 | 9857 | denn-v77-ui-room-default-size-retire | script | mixed | 2/8 defs win |
| 9858 | 9865 | denn-v78-ui-frame-preview-scale-retire-css | style | alive | all 1 defs are winners |
| 9866 | 9924 | denn-v78-ui-frame-preview-scale-retire | script | mixed | 3/8 defs win |
| 9925 | 9962 | denn-v79-room-common-default-admin-css | style | alive | all 6 defs are winners |
| 9963 | 10068 | denn-v79-room-common-default-admin | script | mixed | 8/14 defs win |
| 10069 | 10134 | denn-v79b-room-common-default-card-visible | script | mixed | 5/8 defs win |
| 10135 | 10159 | denn-v79c-room-common-default-savebar-entry | script | mixed | 1/2 defs win |
| 10160 | 10186 | denn-v79d-common-default-open-authority | script | alive | all 3 defs are winners |
| 10187 | 10250 | denn-v80-frame-builder-clock-preset-and-render-guard-css | style | mixed | 7/9 defs win |
| 10251 | 10472 | denn-v80-frame-builder-clock-preset-and-render-guard | script | mixed | 17/24 defs win |
| 10473 | 10502 | denn-v81-frame-builder-open-safe-mode | script | mixed | 1/5 defs win |
| 10503 | 10581 | denn-v82-frame-builder-clock-toggle-authority | script | mixed | 5/9 defs win |
| 10582 | 10598 | denn-v83-hide-risky-ui-scale-controls-css | style | alive | all 1 defs are winners |
| 10599 | 10659 | denn-v83-hide-risky-ui-scale-controls | script | mixed | 2/5 defs win |
| 10660 | 10692 | denn-v84-white-border-flicker-lock-css | style | alive | all 5 defs are winners |
| 10693 | 10793 | denn-v84-white-border-flicker-lock | script | mixed | 4/9 defs win |
| 10794 | 10882 | denn-v85-frame-template-card-layout-lock-css | style | mixed | 5/10 defs win |
| 10883 | 11013 | denn-v85-frame-template-card-layout-lock | script | mixed | 5/13 defs win |
| 11014 | 11029 | denn-v86-builder-white-immediate-authority-css | style | alive | all 3 defs are winners |
| 11030 | 11114 | denn-v86-builder-white-immediate-authority | script | mixed | 3/5 defs win |
| 11115 | 11123 | denn-v87-name2-textbox-toggle-css | style | alive | all 7 defs are winners |
| 11124 | 11139 | denn-v88-ze-zoom-scroll-fix-css | style | mixed | 2/3 defs win |
| 11140 | 11288 | denn-v87-name2-textbox-toggle | script | mixed | 10/16 defs win |
| 11289 | 11306 | denn-v89-ze-scroll-render-stability-css | style | mixed | 1/3 defs win |
| 11307 | 11399 | denn-v89-ze-scroll-render-stability | script | mixed | 4/12 defs win |
| 11400 | 11460 | denn-v91-white-label-final-lock | script | mixed | 5/6 defs win |
| 11461 | 11550 | denn-v93-frame-template-bulk-category-css | style | mixed | 10/11 defs win |
| 11551 | 11712 | denn-v93-frame-template-bulk-category | script | mixed | 14/25 defs win |
| 11713 | 11766 | denn-v94-frame-template-edit-mode-css | style | alive | all 6 defs are winners |
| 11767 | 12119 | denn-v94-frame-template-edit-mode | script | mixed | 31/43 defs win |
| 12120 | 12188 | denn-v95-frame-template-list-ui-stabilize-css | style | alive | all 10 defs are winners |
| 12189 | 12281 | denn-v95-frame-template-list-ui-stabilize | script | mixed | 7/12 defs win |
| 12282 | 12311 | denn-v35-stabilized-save-authority | script | alive | all 3 defs are winners |
| 12312 | 12314 | denn-v36-order-admin-css | style | alive | all 9 defs are winners |
| 12315 | 12319 | denn-v36-order-admin-js | script | alive | all 6 defs are winners |
| 12320 | 12337 | denn-v36-admin-korean-label-fix | script | alive | all 2 defs are winners |
| 12338 | 12402 | denn-v36-admin-order-labels-stable | script | mixed | 4/10 defs win |
| 12403 | 12415 | denn-v36-order-admin-bulk-css | style | alive | all 9 defs are winners |
| 12416 | 12559 | denn-v36-order-admin-bulk | script | mixed | 10/13 defs win |
| 12560 | 12626 | denn-v96-detail-template-image-underlay | script | mixed | 3/7 defs win |
| 12627 | 12638 | denn-v36-3-dynamic-frame-text-fields-admin-css | style | alive | all 10 defs are winners |
| 12639 | 12899 | denn-v36-3-dynamic-frame-text-fields-admin | script | mixed | 21/29 defs win |
| 12900 | 13011 | denn-v36-3-frame-template-parity-admin | script | mixed | 13/17 defs win |
| 13012 | 13043 | denn-v36-4-frame-template-tools-css | style | mixed | 28/30 defs win |
| 13044 | 13335 | denn-v36-4-frame-template-tools | script | mixed | 57/58 defs win |
| 13336 | 13481 | denn-v36-5-admin-render-stability | script | mixed | 15/18 defs win |
| 13482 | 13585 | denn-v36-5-order-actions-singleflight-admin | script | mixed | 5/6 defs win |
| 13586 | 13598 | denn-current-admin-stability-css | style | alive | all 7 defs are winners |
| 13599 | 13671 | denn-current-admin-stability-sweep | script | mixed | 10/11 defs win |
| 13672 | 13680 | denn-current-detail-preview-stability-css | style | alive | all 5 defs are winners |
| 13681 | 13788 | denn-current-detail-preview-stability | script | alive | all 17 defs are winners |

## Gray zone — side-effect-only blocks (cannot judge statically)

These blocks register listeners, run IIFEs, mutate DOM at load, etc. 
Whether they are still in effect depends on runtime order, not function-name shadowing. 
Manual inspection required.

| Start | End | Block ID | Type |
|---|---|---|---|
