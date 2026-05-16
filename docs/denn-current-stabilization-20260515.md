# DENN Current Stabilization - 2026-05-15

## Baseline

- Source package: `C:\Users\user\Desktop\drive-download-20260515T111859Z-3-001\handoff-packages\DENN-handoff-20260515-182236`
- Source admin: `working\denn-admin-v35-bugfix-stable.html`
- Source mockup: `working\denn-mockup-tool-v35-bugfix-stable.html`
- Latest data JSON: `C:\Users\user\Desktop\drive-download-20260515T111859Z-3-001\DENN-current-data-2026-05-15T09-21-56.json`

The source filenames still use `v35`, but the handoff notes state that these files include the latest v36/v36.5 work and should be treated as the current baseline.

## Backup

Created before patching:

- `backups\v36-current-stabilize-20260515\denn-admin-v35-bugfix-stable.backup-before-current-stabilize.html`
- `backups\v36-current-stabilize-20260515\denn-mockup-tool-v35-bugfix-stable.backup-before-current-stabilize.html`
- `backups\v36-current-stabilize-20260515\DENN-current-data-2026-05-15T09-21-56.backup-before-current-stabilize.json`

## Output Files

- `working\denn-admin-v36-current-stabilized.html`
- `working\denn-mockup-tool-v36-current-stabilized.html`
- `docs\denn-current-stabilization-20260515.md`

## Static Audit

| Item | Admin before | Admin after | Mockup before | Mockup after |
|---|---:|---:|---:|---:|
| Inline script blocks | 110 | 111 | 74 | 75 |
| Script syntax errors | 0 | 0 | 0 | 0 |
| Duplicate id groups, static scan | 25 | 25 | 11 | 11 |
| Direct `localStorage.setItem('denn_admin')` | 0 | 0 | 0 | 0 |

Static duplicate id counts did not drop because many duplicates are inside legacy HTML strings and compatibility wrappers. Instead of deleting those high-risk wrappers, this pass adds a final runtime sweep that removes duplicate UI nodes only if they actually appear in the live DOM.

## Patch Summary

### Admin

Added:

- `<style id="denn-current-admin-stability-css">`
- `<script id="denn-current-admin-stability-sweep">`
- `<style id="denn-current-detail-preview-stability-css">`
- `<script id="denn-current-detail-preview-stability">`

Purpose:

- Stabilize frame template cards so size/category badges do not wrap/crop as easily.
- Hide empty legacy UI setting cards when old UI rows have already been removed.
- Remove duplicate live DOM nodes for known accumulated ids when they appear:
  - clock preset UI
  - frame builder white-border controls
  - size/frame enabled rows
  - order-list shell
  - room common default UI
- Schedule the cleanup after `goTab()` and `renderFTplsByCategory()` without changing the core save/render logic.
- Stabilize the frame template detail preview modal by preserving canvas CSS size and scroll position across repeated `zeRender()` calls.
- Re-sync the detail guide overlay after the canvas settles, instead of letting several delayed wrappers fight over the visible position.
- Remove transient legacy opening/preparing classes after the detail preview has settled.

### Mockup

Added:

- `<style id="denn-current-mockup-stability-css">`
- `<script id="denn-current-mockup-stability-sweep">`

Purpose:

- Keep frame preview scale controls inside their container.
- Remove duplicate live DOM nodes for known accumulated ids when they appear:
  - frame visible toggle row
  - frame preview scale controls
  - admin room setup top bar
- Sync the visible frame toggle class with `window.DENN_FRAME_VISIBLE`.
- Schedule the cleanup after `switchTab()`, `openRoomMockup()`, and `renderFrame()` without replacing the render pipeline.

## Explicitly Not Changed

- No new v36 feature implementation.
- No order/print/export logic changes.
- No `sendKakao()` behavior changes.
- No `renderCase()` / `renderFrame()` rewrite.
- No IndexedDB or `denn_admin` schema changes.
- No bulk deletion of legacy wrappers.

## Remaining Risk

- The files still contain many old compatibility wrappers. They are deliberately left in place because prior work showed broad deletion can regress template save/detail/mockup flows.
- Static duplicate id scanners will still report duplicates because legacy HTML strings remain.
- Browser-level smoke testing is still recommended after importing the 2026-05-15 JSON into the same origin.

## Next Recommended Checks

1. Restore `DENN-current-data-2026-05-15T09-21-56.json` into the browser using the existing restore helper.
2. Open admin and verify:
   - frame template card badges no longer crop badly
   - frame template tab does not visibly stack duplicate controls
   - order list tab still opens
3. Open mockup and verify:
   - frame visible toggle remains stable
   - room setup mode top bar appears once
   - frame download and Kakao paths still work
4. Only after this pass should the next functional item be patched.
