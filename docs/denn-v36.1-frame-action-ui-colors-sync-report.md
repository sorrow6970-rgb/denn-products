# DENN v36.1 Frame Action UI Colors + State Sync Report

Date: 2026-05-12

## Scope

- Customer mockup file only:
  - `working/denn-mockup-tool-v35-bugfix-stable.html`
- Admin file was inspected, but not modified:
  - `working/denn-admin-v35-bugfix-stable.html`

## Backup

- `backups/v36.1-frame-action-ui-colors-sync-before/`

## Changes

- Split the frame action button classes:
  - `내 공간에서 보기` -> `denn-action-btn-room`
  - `시안 이미지 저장` -> `denn-action-btn-save`
- Applied separate warm CTA colors for the two buttons.
- On customer mockup load, the state loaded from `denn_admin_state` is mirrored back through the existing localStorage helper so older fallback reads see the same latest admin data.

## Path / JSON Sync Note

The admin customer-screen button opens `denn-mockup-tool-v35-bugfix-stable.html` from the same folder as the currently opened admin file. If admin is opened from a backup/handoff folder, it will open that folder's mockup file, not the main working file.

Use this pair as the current live pair:

- `DENN-v35-refactor-work/working/denn-admin-v35-bugfix-stable.html`
- `DENN-v35-refactor-work/working/denn-mockup-tool-v35-bugfix-stable.html`

## Verification

- `node --check` on extracted mockup scripts: passed
- Direct `localStorage.setItem('denn_admin', ...)` calls in mockup: 0
- Admin SHA unchanged

