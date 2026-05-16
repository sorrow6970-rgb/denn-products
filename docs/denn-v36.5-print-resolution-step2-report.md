# DENN v36.5 Print Resolution Step 2 Report

## 기준 파일

- `working/denn-admin-v35-bugfix-stable.html`
- `working/denn-mockup-tool-v35-bugfix-stable.html`

## 백업

- `backups/v36.5-before-print-resolution-step2-20260515-162413`

## 작업 목적

화면 미리보기 렌더와 주문/관리자용 액자 인쇄 출력 렌더를 분리했다.  
고객 화면의 `renderFrame()` 미리보기는 기존 안정 경로를 유지하고, `DENNPrintExportV36.renderPrintFile('frame')`만 별도 해상도 정책으로 감쌌다.

## 수정 파일

- `working/denn-mockup-tool-v35-bugfix-stable.html`

## 추가 모듈

- `<script id="denn-v36-5-print-resolution-step2">`
- `window.DENN_FRAME_PRINT_RESOLUTION_V365`
- `DENNPrintExportV36.renderFramePrintV365`
- `DENNPrintExportV36.framePrintSizeV365`

## 출력 해상도 정책

- 목표 DPI: 300
- 최소 긴 변: 3000px
- 기본 fallback 긴 변: 3508px
- 최대 픽셀 수: 22MP

A4/A3처럼 물리 cm 값이 있는 액자 사이즈는 `cm / 2.54 * 300dpi` 기준으로 계산한다.  
A2처럼 너무 큰 출력은 브라우저 메모리 보호를 위해 22MP 이내로 자동 축소한다.

## 렌더 분리 내용

- 화면용 `renderFrame()`은 수정하지 않았다.
- 케이스 인쇄 출력은 기존 `DENNPrintExportV36` 경로를 그대로 사용한다.
- 액자 인쇄 출력만 새 `renderFramePrintV365()`로 처리한다.
- 템플릿 이미지 소스는 화면 렌더와 같은 resolver를 우선 사용해 시각 결과가 달라지지 않게 했다.
- 템플릿 배경색은 `backgroundEnabled` 계열 값이 ON일 때만 출력에 반영한다.
- OFF 상태에서는 배경색을 강제로 bake하지 않는다.
- 작업용/화면용 체커보드는 출력에 포함하지 않는다.

## 겹쳐 로딩 안정화

- 화면 미리보기 쪽은 기존 `__dennFrameRenderSeq` 순번 가드가 이미 있어 이전 이미지 로드가 늦게 도착해 화면을 덮는 구조는 아니었다.
- 이번 단계에서는 화면 렌더를 건드리지 않고, 인쇄 출력 이미지 로딩만 Promise 캐시(`loadImageStable`)로 중복 로딩을 줄였다.
- 같은 템플릿 이미지가 반복 출력될 때 매번 새 `Image()`를 만들지 않도록 했다.

## 검증 결과

- Admin script parse: `109/109 OK`
- Mockup script parse: `73/73 OK`
- 직접 `localStorage.setItem('denn_admin', ...)`: `0`

## SHA256

- Admin: `D0DFD6AF49A2B7824C14A2EAEA05EE12B3E245140657E42A33738FF9B26616AE`
- Mockup: `DC6392AB27707CDC25C515CCCD3F09718E304B68D187E68BFA655FF1145BCE17`

## 남은 위험

- 실제 브라우저에서 대형 A2 출력 시 PC 메모리 상태에 따라 PNG blob 생성 시간이 길어질 수 있다.
- 원본 템플릿 이미지 자체가 낮은 해상도로 저장된 기존 템플릿은 출력 canvas 크기를 올려도 원본 이미지 디테일이 완전히 복구되지는 않는다.
