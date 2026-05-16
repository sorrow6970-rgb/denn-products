# DENN v36.5 Template Background Save Sync Hotfix

Date: 2026-05-15

## Purpose

Fix frame template builder background ON/OFF and color values so they persist from template edit/save into detail settings and customer mockup rendering.

## Backup

- `backups/v36.5-before-template-bg-save-sync-20260515-142231/`

## Cause

- New template saves were covered by the v36.4 background save wrapper.
- Existing template edit saves used the edit-mode save path and could bypass that wrapper.
- As a result, `backgroundEnabled` and background color aliases were not always written back to the saved template object.
- Mockup rendering only accepted strict boolean `true`, so string-like restored values could be ignored.

## Changes

- Admin edit-save preservation now carries and updates:
  - `backgroundEnabled`
  - `templateBackgroundEnabled`
  - `canvasBgEnabled`
  - `backgroundColor`
  - `templateBackgroundColor`
  - `canvasBgColor`
- Admin background save wrapper now writes all supported color aliases, not only `templateBackgroundColor`.
- Admin and mockup background enabled checks now accept boolean, numeric, and string truthy values.

## Unchanged

- Frame/case render structure
- Order/Kakao flow
- Print export flow
- Template image `dataUrl`
- Checkerboard/white-border rendering

## Verification

- Admin script parse: OK, 109 scripts
- Mockup script parse: OK, 72 scripts
- Direct `localStorage.setItem('denn_admin', ...)`: 0

## Hashes

- Admin: `2E9CA06446825D501EE3B81954BF60AD35A23D4B9B6256CAA271D2C9A6FCF020`
- Mockup: `375052967F607A2A820D52F14CA6568AFF1417AB08E9ACAE4AA9876F4B1A9FCC`

## Status

TEMPLATE_BG_SAVE_SYNC_READY
