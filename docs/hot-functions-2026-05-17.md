# Hot Functions — denn-admin.html (2026-05-17)

- Total unique function names tracked: **910**
- Functions defined >= 3 times (hot): **133**
- Total dead def count: 1021

> Approach: a single 'winner' per function is the last definition by line. 
> Hot functions (defined many times) are the highest-leverage targets — consolidating 
> them to one authoritative implementation removes the most dead code.
> Category match is by **name pattern only** (regex on function name) — manual confirmation needed.

## Top 20 most-overridden functions

| Rank | Function | Total defs | Winner line | Winner block ID |
|---|---|---|---|---|
| 1 | `by` | 93 | 13686 | denn-current-detail-preview-stability |
| 2 | `num` | 40 | 13688 | denn-current-detail-preview-stability |
| 3 | `goTab` | 33 | 13324 | denn-v36-4-frame-template-tools |
| 4 | `dims` | 19 | 9263 | denn-v71-frame-builder-preview-stability |
| 5 | `esc` | 19 | 13052 | denn-v36-4-frame-template-tools |
| 6 | `fbExport` | 19 | 13304 | denn-v36-4-frame-template-tools |
| 7 | `parseSub` | 19 | 9259 | denn-v71-frame-builder-preview-stability |
| 8 | `saveNow` | 19 | 8677 | denn-v59-builder-capture-union |
| 9 | `sizes` | 19 | 13056 | denn-v36-4-frame-template-tools |
| 10 | `fbRender` | 18 | 13299 | denn-v36-4-frame-template-tools |
| 11 | `init` | 17 | 7505 | denn-v48-final-size-stability |
| 12 | `key` | 16 | 11784 | denn-v94-frame-template-edit-mode |
| 13 | `renderFrames` | 16 | 8979 | denn-v67-size-status-labels |
| 14 | `renderSzPreview` | 15 | 6330 | denn-v36-size-frame-enabled-admin-final |
| 15 | `editSz` | 14 | 7485 | denn-v48-final-size-stability |
| 16 | `openZoneEditor` | 14 | 13309 | denn-v36-4-frame-template-tools |
| 17 | `renderFTplsByCategory` | 13 | 13284 | denn-v36-4-frame-template-tools |
| 18 | `setVal` | 13 | 11860 | denn-v94-frame-template-edit-mode |
| 19 | `addSz` | 12 | 7492 | denn-v48-final-size-stability |
| 20 | `arr` | 12 | 13051 | denn-v36-4-frame-template-tools |

## Category: ZE / 상세설정 모달  (12 hot functions)

| Function | Total defs | Winner line | Winner block ID | Override chain (oldest→newest) |
|---|---|---|---|---|
| `sizes` | 19 | 13056 | denn-v36-4-frame-template-tools | denn-v38-multi-size-checkbox → denn-v40-builder-render-rules → denn-v42-detail-preview-guide → denn-v44-transparent-detail-overlay → denn-v45-design-canvas-only → denn-v48-final-size-stability → denn-v49-render-authority-lock → denn-v50-detail-builder-sync → denn-v53-detail-link-stability → denn-v54-size-render-lock → denn-v55-three-issue-stabilize → denn-v56-canonical-save-detail → denn-v59-builder-capture-union → denn-v61-frame-template-save-authority → denn-v69-initial-size-toggle-sync → denn-v71-frame-builder-preview-stability → denn-v82-frame-builder-clock-toggle-authority → denn-v94-frame-template-edit-mode → denn-v36-4-frame-template-tools |
| `openZoneEditor` | 14 | 13309 | denn-v36-4-frame-template-tools | denn-v14-admin-js → denn-v38-multi-size-checkbox → denn-v49-render-authority-lock → denn-v50-detail-builder-sync → denn-v53-detail-link-stability → denn-v54-size-render-lock → denn-v55-three-issue-stabilize → denn-v56-canonical-save-detail → denn-v84-white-border-flicker-lock → denn-v87-name2-textbox-toggle → denn-v96-detail-template-image-underlay → denn-v36-3-dynamic-frame-text-fields-admin → denn-v36-3-frame-template-parity-admin → denn-v36-4-frame-template-tools |
| `zeRender` | 9 | 13314 | denn-v36-4-frame-template-tools | denn-v14-admin-js → denn-v42-detail-preview-guide → denn-v44-transparent-detail-overlay → denn-v45-design-canvas-only → denn-v50-detail-builder-sync → denn-v53-detail-link-stability → denn-v89-ze-scroll-render-stability → denn-v96-detail-template-image-underlay → denn-v36-4-frame-template-tools |
| `toggleSizeClockEnabled` | 7 | 7502 | denn-v48-final-size-stability | denn-v35-size-clock-onoff-final → denn-v35-clock-toggle-button-and-preset-position-final → denn-v35-clock-onoff-save-stabilizer-final → denn-v35-clock-onoff-selection-sync-final → denn-v35-admin-data-safety-final → denn-v37-size-save-controller-final → denn-v48-final-size-stability |
| `normalizeSize` | 5 | 6043 | denn-v35-frame-builder-clean-export-final | denn-v32-admin-stable → denn-v33-admin-stable → denn-v34-frame-builder-crisp-render → denn-v35-size-input-height-width-final → denn-v35-frame-builder-clean-export-final |
| `selectFrameSizeForEdit` | 5 | 6289 | denn-v36-size-frame-enabled-admin-final | denn-v35-size-list-live-stabilizer-final → denn-v35-size-clock-onoff-final → denn-v35-clock-onoff-save-stabilizer-final → denn-v35-clock-onoff-selection-sync-final → denn-v36-size-frame-enabled-admin-final |
| `sizeKey` | 5 | 13061 | denn-v36-4-frame-template-tools | denn-v35-detail-size-selector → denn-v35-guide-bg-detail-modal-final → denn-v70-hide-builtin-frame-templates → denn-v76-ui-settings-save-authority → denn-v36-4-frame-template-tools |
| `sizeLabel` | 5 | 8501 | denn-v56-canonical-save-detail | denn-v38-multi-size-checkbox → denn-v50-detail-builder-sync → denn-v53-detail-link-stability → denn-v55-three-issue-stabilize → denn-v56-canonical-save-detail |
| `sizeDims` | 3 | 6033 | denn-v35-frame-builder-clean-export-final | denn-v34-frame-builder-crisp-render → denn-v35-detail-size-selector → denn-v35-frame-builder-clean-export-final |
| `stabilizeDetail` | 3 | 8384 | denn-v55-three-issue-stabilize | denn-v53-detail-link-stability → denn-v54-size-render-lock → denn-v55-three-issue-stabilize |
| `toggleSizeFrameEnabled` | 3 | 7503 | denn-v48-final-size-stability | denn-v36-size-frame-enabled-admin-final → denn-v37-size-save-controller-final → denn-v48-final-size-stability |
| `zeRenderList` | 3 | 13373 | denn-v36-5-admin-render-stability | denn-v87-name2-textbox-toggle → denn-v36-3-dynamic-frame-text-fields-admin → denn-v36-5-admin-render-stability |

## Category: 문구 추가 / text-fields  (1 hot functions)

| Function | Total defs | Winner line | Winner block ID | Override chain (oldest→newest) |
|---|---|---|---|---|
| `drawTextZone` | 3 | 7271 | denn-v45-design-canvas-only | denn-v42-detail-preview-guide → denn-v44-transparent-detail-overlay → denn-v45-design-canvas-only |

## Category: 위치 이동 / drag  (0 hot functions)

_(no hot functions matched this pattern)_

## Other hot functions (no category match) — top 30

| Function | Total defs | Winner line | Winner block ID |
|---|---|---|---|
| `by` | 93 | 13686 | denn-current-detail-preview-stability |
| `num` | 40 | 13688 | denn-current-detail-preview-stability |
| `goTab` | 33 | 13324 | denn-v36-4-frame-template-tools |
| `dims` | 19 | 9263 | denn-v71-frame-builder-preview-stability |
| `esc` | 19 | 13052 | denn-v36-4-frame-template-tools |
| `fbExport` | 19 | 13304 | denn-v36-4-frame-template-tools |
| `parseSub` | 19 | 9259 | denn-v71-frame-builder-preview-stability |
| `saveNow` | 19 | 8677 | denn-v59-builder-capture-union |
| `fbRender` | 18 | 13299 | denn-v36-4-frame-template-tools |
| `init` | 17 | 7505 | denn-v48-final-size-stability |
| `key` | 16 | 11784 | denn-v94-frame-template-edit-mode |
| `renderFrames` | 16 | 8979 | denn-v67-size-status-labels |
| `renderSzPreview` | 15 | 6330 | denn-v36-size-frame-enabled-admin-final |
| `editSz` | 14 | 7485 | denn-v48-final-size-stability |
| `renderFTplsByCategory` | 13 | 13284 | denn-v36-4-frame-template-tools |
| `setVal` | 13 | 11860 | denn-v94-frame-template-edit-mode |
| `addSz` | 12 | 7492 | denn-v48-final-size-stability |
| `arr` | 12 | 13051 | denn-v36-4-frame-template-tools |
| `fmt` | 12 | 8500 | denn-v56-canonical-save-detail |
| `isAll` | 12 | 11783 | denn-v94-frame-template-edit-mode |
| `n` | 12 | 9671 | denn-v76-ui-settings-save-authority |
| `persist` | 12 | 11787 | denn-v94-frame-template-edit-mode |
| `saveSoft` | 12 | 13096 | denn-v36-4-frame-template-tools |
| `uploadClockImg` | 12 | 3690 | denn-v23-admin-js |
| `confirmEditSz` | 11 | 7487 | denn-v48-final-size-stability |
| `deep` | 11 | 12914 | denn-v36-3-frame-template-parity-admin |
| `tplArr` | 11 | 12915 | denn-v36-3-frame-template-parity-admin |
| `norm` | 10 | 13053 | denn-v36-4-frame-template-tools |
| `rr` | 10 | 9296 | denn-v71-frame-builder-preview-stability |
| `toastSafe` | 10 | 7033 | denn-v44-transparent-detail-overlay |

_(Full hot list: 120 more uncategorized functions with >= 3 defs)_