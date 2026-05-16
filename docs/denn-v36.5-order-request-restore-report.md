# DENN v36.5 Order Request Restore Report

Date: 2026-05-14

## Backup

- `C:\Users\써드플로어\Documents\Codex\2026-04-28\pc-json-pc\DENN-v35-refactor-work\backups\v36.5-before-order-request-restore-20260514-131509`

## Scope

- Restored only the customer mockup order request save path.
- Modified only `working/denn-mockup-tool-v35-bugfix-stable.html`.
- Did not modify admin UI, frame/template rendering, case rendering, Kakao URL correction, preview save, or background/template features.

## Cause

The order module and admin order list were both present and already pointed to the same IndexedDB store:

- DB: `denn_shared_db`
- Store: `denn_order_requests`

The likely break was that customer order save depended on `DENNPrintExportV36.renderPrintFile(type)` succeeding first. If print export failed, the order object was never saved to `denn_order_requests`, so the admin order list had nothing to display.

## Fix

Added a small wrapper module:

- `denn-v36-5-order-request-restore`

Behavior:

- Keeps the existing order flow first.
- If `DENNOrderRequestV36.create()` fails during print export, saves a preview-only fallback order to the same `denn_order_requests` store.
- If `saveAndOpen()` still fails, saves the same fallback order and attempts the normal preview save.
- Does not create a new schema.
- Does not directly write `denn_admin` to localStorage.

Fallback orders include:

- `id`
- `createdAt`
- `updatedAt`
- `type`
- `status: "new"`
- `customer`
- `product`
- `preview`
- `previewBlob` when available
- `printBlob: null`
- `restoreMode: "preview-only-fallback"`

## Verification

- Admin script parse: OK, `108/108`
- Mockup script parse: OK, `72/72`
- Direct `localStorage.setItem('denn_admin', ...)`: `0`
- Admin SHA256:
  - `52035A49BDEC0C73DFC0907CF1C8D655212A0619DE0D64F40311D926FF9A1DD9`
- Mockup SHA256:
  - `6FF18DC60F8861BA498B90ECE603C4A4CD1C29A90E4A6E572422B981FB209881`

## Remaining Risk

- If IndexedDB itself is blocked or unavailable, the fallback cannot save either.
- Fallback orders do not contain a high-resolution print blob. They are meant to restore admin order visibility when print export blocks customer order save.
