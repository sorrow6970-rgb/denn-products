# DENN v36.1 Frame Preview HiDPI + Scale Split Report

작성일: 2026-05-11

## 기준 파일

- 고객 목업툴: `working/denn-mockup-tool-v35-bugfix-stable.html`
- 관리자: `working/denn-admin-v35-bugfix-stable.html`

파일명은 v35이지만, 현재 내용은 v36 주문제작/고해상도 인쇄파일 기능이 승격된 최신 작업본입니다.

## 백업

작업 전 백업 위치:

- `backups/v36.1-frame-preview-hidpi-scale-before/denn-mockup-tool-v35-bugfix-stable.before-hidpi-scale-20260511-141127.html`
- `backups/v36.1-frame-preview-hidpi-scale-before/denn-admin-v35-bugfix-stable.before-hidpi-scale-20260511-141127.html`

## 수정 범위

이번 패치는 고객 목업툴의 액자 화면 미리보기 전용입니다.

- 액자 preview canvas HiDPI 보정은 기존 `denn-v36-1-frame-preview-hidpi` 모듈을 유지했습니다.
- 같은 모듈 안에 PC/모바일 preview scale 분리 로직을 연결했습니다.
- 고해상도 인쇄파일 생성 canvas, 주문제작 의뢰, 카카오채널 열기, IndexedDB 저장 구조는 수정하지 않았습니다.
- 케이스 preview는 수정하지 않았습니다.
- 관리자 HTML은 코드 수정하지 않았고, 백업만 생성했습니다.

## 적용 내용

추가/연결된 모듈:

- `window.DENN_FRAME_PREVIEW_SCALE_CONFIG_V361`
- `window.DENNFramePreviewScaleV361`
- `window.getFramePreviewUserScaleV361()`

스케일 저장 key:

- PC: `denn_frame_preview_user_scale_desktop_v361`
- 모바일: `denn_frame_preview_user_scale_mobile_v361`
- 기존 key: `denn_frame_preview_user_scale_v40`

동작 기준:

- PC 기본값: 100%
- 모바일 기본값: 140%
- breakpoint: 860px 이하를 모바일 모드로 판단
- 기존 `denn_frame_preview_user_scale_v40` 값은 PC fallback에만 사용
- 모바일 기본값은 기존 v40 값으로 덮어쓰지 않음
- resize로 PC/모바일 모드가 바뀌면 현재 모드의 scale을 다시 읽어 적용

UI 반영:

- PC 모드: `액자 스케일 · PC`
- 모바일 모드: `액자 스케일 · 모바일`
- 기본값 버튼은 현재 모드의 기본값으로 복귀
  - PC: 100
  - 모바일: 140

## HiDPI 방식

액자 preview canvas의 logical size는 유지하고, 실제 backing store만 devicePixelRatio 기반으로 키웁니다.

- 최대 pixelRatio: 2.25
- 최대 canvas 픽셀 수: 약 7.2MP
- `canvas.style.width` / `canvas.style.height`는 logical size 유지
- `ctx.setTransform(ratio, 0, 0, ratio, 0, 0)` 적용 후 기존 draw 좌표계는 logical px 기준 유지

이 방식은 화면 미리보기 선명도 전용입니다. 고해상도 인쇄파일 출력 해상도는 변경하지 않았습니다.

## 감사 결과

확인한 구조:

- `frameCanvas`
- `renderFrame()`
- `applyFramePreviewScaleV36`
- `setFramePreviewScaleV36`
- `scaleFrame`
- `frame-preview-scale-box`
- `frame-preview-scale`
- `frame-preview-scale-v`
- `.canvas-wrap` transform scale 적용부
- `DENNPrintExportV36`
- `DENNOrderRequestV36`

기존에는 액자 preview scale이 단일 key를 공유할 수 있어 모바일에서 PC 값의 영향을 받을 수 있었습니다.
이번 패치에서는 최종 scale 적용 경로에서 `getFramePreviewUserScaleV361()` 값을 사용하도록 연결했습니다.

## 테스트 결과

정적 테스트:

- `node --check DENN-v35-refactor-work/incoming-analysis/mockup-scripts-check.js`: 통과
- `localStorage.setItem('denn_admin', ...)` 직접 호출 수: 0

스케일 분기 VM 테스트:

- key 없음 + PC 폭: 100 반환 확인
- key 없음 + 모바일 폭: 140 반환 확인
- legacy `denn_frame_preview_user_scale_v40=133`:
  - PC fallback: 133 반환 확인
  - 모바일: 140 유지 확인
- PC/mobile 저장 key 분리 확인

현재 고객 목업 파일 SHA256:

`0625FF2EB9C3242DBF8822858175443DC3AB4CCFE062DF2B41C389489189540B`

## 남은 리스크

- 이 환경에서는 이전부터 Chrome/Edge headless가 GPU 프로세스 오류로 실패한 이력이 있어, 실제 모바일 브라우저 시각 확인은 별도 수동 확인이 필요합니다.
- 액자 preview scale 관련 과거 보정 스크립트가 여러 개 남아 있으나, 이번 패치는 최종 모듈에서 덮어쓰는 방식으로 최소 변경했습니다.
- 추후 누적 패치 정리 시에는 preview scale 계열 보정 스크립트를 한 번에 정리하는 단계가 필요합니다.

## 최종 상태

FRAME_PREVIEW_HIDPI_SCALE_READY
