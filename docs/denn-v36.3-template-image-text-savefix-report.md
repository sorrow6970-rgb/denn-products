# DENN v36.3 Template Image/Text Save Fix

Date: 2026-05-12

## Scope

- Stabilized admin detail-save persistence for frame template image/text metadata.
- Stabilized customer mockup loading for template image source fallbacks.
- Stabilized dynamic text field editing so user-cleared or edited fields are not silently restored to template defaults.

## Files

- `working/denn-admin-v35-bugfix-stable.html`
- `working/denn-mockup-tool-v35-bugfix-stable.html`

## Backup

- `backups/v36.3-template-image-text-savefix-before-20260512-144536/`

## Notes

- No direct `localStorage.setItem('denn_admin', ...)` calls were added.
- Existing `denn_admin` / IndexedDB shared state flow is preserved.
- The patch is limited to save confirmation and customer frame template/dynamic text preview paths.

## Verification

- Admin scripts syntax check: OK
- Mockup scripts syntax check: OK
- Direct `localStorage.setItem('denn_admin', ...)` search: no matches

Status: READY_FOR_BROWSER_CHECK
