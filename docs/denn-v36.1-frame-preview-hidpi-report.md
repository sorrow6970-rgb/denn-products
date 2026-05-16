# DENN v36.1 Frame Preview HiDPI Report

작성일: 2026-05-11

## 기준 파일

- 고객 목업툴: `working/denn-mockup-tool-v35-bugfix-stable.html`
- 관리자: `working/denn-admin-v35-bugfix-stable.html`

파일명은 v35이지만 현재 내용은 v36 주문제작/고해상도 인쇄파일 기능이 승격된 최신본이다.

## 백업 경로

- `backups/v36.1-frame-preview-hidpi-before/`
- 고객 목업툴 백업: `denn-mockup-tool-v35-bugfix-stable.before-hidpi-20260511-132643.html`
- 관리자 백업: `denn-admin-v35-bugfix-stable.before-hidpi-20260511-132643.html`

## 해시

- 고객 목업툴 패치 전 SHA256: `BFBD0A651C5797CE55B2A36DCFAD7B30B4325B11E774F755F4282AFD9F77574A`
- 고객 목업툴 패치 후 SHA256: `CB982D4886A19BBD431CD880243D0CD2809EAFC9EFF451BE5BADFBA56AB7D60D`
- 관리자 SHA256: `BA0F01C1064B652CA9A324CBC3A7B1DB1D128C14E6FD09A44859E218102A1EDD`

## 기존 흐림 원인 추정

- `frameCanvas`가 화면 표시 크기와 실제 canvas backing store 크기를 거의 같은 값으로 사용했다.
- 모바일 DPR 2~3 환경에서는 CSS로 축소/확대된 preview가 실제 디바이스 픽셀 밀도를 충분히 쓰지 못해 텍스트가 흐릿하게 보일 수 있었다.
- 기존 `renderFrame()`은 `canvas.width / canvas.height`를 렌더 좌표 기준으로 직접 사용하므로, 단순히 canvas backing store만 키우면 좌표계와 스케일 계산이 깨질 위험이 있었다.

## 적용한 HiDPI 방식

- `window.DENN_FRAME_PREVIEW_HIDPI_V361` 모듈 추가.
- 기존 논리 canvas 크기(logical size)는 유지.
- 실제 canvas backing store만 `devicePixelRatio`와 내부 선명도 모드 기준으로 확대.
- `ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)` 적용 후 기존 draw 좌표계는 logical px 기준으로 유지.
- `ctx.imageSmoothingEnabled = true`, `ctx.imageSmoothingQuality = 'high'` 적용.
- `frameCanvas.dataset.dennLogicalW/H`와 `dataset.dennHidpiRatio`로 logical/backing 크기를 분리 기록.
- pointer 좌표 보정용 `cPos()`를 frameCanvas에서 logical size 기준으로 보정.
- 기존 preview scale 계산이 backing store 크기에 흔들리지 않도록 `scaleFrame` / `applyFramePreviewScaleV36`를 logical size 기준 보정 함수로 연결.

## 적용 pixelRatio

- 기본 모드: `sharp`
- 내부 모드 비율:
  - `normal`: 1
  - `sharp`: 1.75
  - `ultra`: 2.25
- 실제 적용 비율: `max(devicePixelRatio, modeRatio)` 후 최대 `2.25`로 제한
- 최대 픽셀 수 제한: 약 `7.2MP`
- 제한 초과 시 pixelRatio를 자동 하향

## 모바일 preview scale 변경

- 기존 desktop scale 흐름은 최대한 유지.
- 861px 미만 모바일에서는 frame preview 최소 스케일을 `0.34`로 보정해 너무 작게 보이는 상황을 줄였다.
- `.canvas-wrap`의 transform 계산은 logical canvas 크기 기준으로만 수행한다.

## 보호한 기능

- `dlCanvas()`
- `sendKakao()`
- `DENNPrintExportV36`
- `DENNOrderRequestV36`
- 액자 고해상도 인쇄파일 생성용 독립 canvas
- 케이스 preview

이번 패치는 고객 액자 preview canvas에만 적용되며, 고해상도 인쇄파일 canvas 생성 로직은 수정하지 않았다.

## 테스트 결과

- HTML script 추출 후 `node --check` 통과.
- `localStorage.setItem('denn_admin')` 직접 호출 수: 0.
- `DENNPrintExportV36` 문자열 존재 확인.
- `DENNOrderRequestV36` 문자열 존재 확인.
- `renderFrame` 존재 확인.
- `frameCanvas` 존재 확인.

## 브라우저 테스트 제한

- Chrome headless와 Edge headless 모두 이 PC 환경에서 GPU 프로세스 오류로 종료되어 자동 DOM 측정 테스트를 완료하지 못했다.
- 오류 요약: `GPU process isn't usable. Goodbye.`
- 실제 화면 검증은 일반 브라우저에서 고객 목업툴 액자 탭을 열어 다음 값을 확인하면 된다:
  - `frameCanvas.dataset.dennLogicalW`
  - `frameCanvas.dataset.dennLogicalH`
  - `frameCanvas.dataset.dennHidpiRatio`
  - `frameCanvas.width > logicalW`
  - `frameCanvas.height > logicalH`

## 남은 리스크

- 액자 preview canvas 자체가 고해상도 backing store가 되므로 일반 시안 PNG 저장 파일도 이전보다 픽셀 수가 커질 수 있다.
- 누적 패치 구조상 과거 preview scale wrapper가 남아 있으나, 마지막 HiDPI 모듈이 logical size 기준으로 다시 보정하도록 했다.
- 브라우저 자동 측정은 GPU 오류 때문에 제한되었으므로 실제 모바일 기기에서 텍스트 선명도 체감 확인이 필요하다.

## 최종 상태

FRAME_PREVIEW_HIDPI_READY
