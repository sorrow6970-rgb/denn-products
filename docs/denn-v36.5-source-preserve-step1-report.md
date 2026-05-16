# DENN v36.5 Source Preserve Step 1 Report

Date: 2026-05-15

## Goal

액자 템플릿 제작/수정 저장 시 업로드 원본 이미지 데이터를 잃지 않도록 원본 보존 필드를 추가했다.

이번 단계는 저장 구조 보강만 진행했다. 화면 미리보기 렌더, 목업툴 렌더, 고해상도 인쇄 출력 해상도는 변경하지 않았다.

## Backup

`C:\Users\써드플로어\Documents\Codex\2026-04-28\pc-json-pc\DENN-v35-refactor-work\backups\v36.5-before-source-preserve-step1-20260515-152335`

## Modified File

`C:\Users\써드플로어\Documents\Codex\2026-04-28\pc-json-pc\DENN-v35-refactor-work\working\denn-admin-v35-bugfix-stable.html`

## Preserved Fields

- `sourceDataUrl`
- `builderArtDataUrl`
- `originalDataUrl`
- `originalImageWidth`
- `originalImageHeight`
- `sourceImageWidth`
- `sourceImageHeight`

## Changes

1. 신규 액자 템플릿 제작 저장 시 `FB.artDataUrl` 원본을 별도 source/original 필드로 보존한다.
2. 기존 템플릿을 수정 저장할 때 기존 source/original 필드가 새 템플릿 객체에서 사라지지 않도록 보존한다.
3. 수정 중 새 이미지를 올린 경우 새 원본 이미지와 원본 치수를 source 필드에 반영한다.
4. 기존 `dataUrl`은 그대로 유지한다. 배경색, 체커보드, 렌더용 합성 이미지를 원본 필드에 굽지 않는다.

## Not Changed

- 고객 목업툴 `renderFrame`
- 고해상도 인쇄 출력 canvas
- 주문제작/카카오 문의 흐름
- 케이스 렌더
- 템플릿 표시 방식

## Verification

- Admin script parse: OK, 109/109
- Mockup script parse: OK, 72/72
- Active Admin/Mockup files direct `localStorage.setItem('denn_admin', ...)`: 0

## SHA256

- Admin: `D0DFD6AF49A2B7824C14A2EAEA05EE12B3E245140657E42A33738FF9B26616AE`
- Mockup: `375052967F607A2A820D52F14CA6568AFF1417AB08E9ACAE4AA9876F4B1A9FCC`

## Next Step

2단계에서 인쇄용 출력 해상도 정책을 별도로 정의한다. 화면 미리보기는 가볍게 유지하고, 관리자 인쇄파일 생성에서만 사이즈별 목표 px를 적용하는 방식이 안전하다.
