# DENN v36.5 Print Size Hotfix Report

Date: 2026-05-15

## 기준 파일

- `working/denn-mockup-tool-v35-bugfix-stable.html`
- `working/denn-admin-v35-bugfix-stable.html`

## 백업 경로

- `backups/v36.5-before-print-size-hotfix-20260515-171041/`

## 원인

A2 테스트 출력이 `2125 x 3000px`로 저장된 것은 A2 실측 cm 기반 출력이 아니라 기존 긴 변 `3000px` fallback 출력 경로로 떨어진 상태였다.

원인 후보는 두 가지였다.

1. 선택된 액자 사이즈 객체가 `wcm/hcm` 형태가 아닐 경우 cm 값을 읽지 못함
2. 기존 `DENNPrintExportV36.renderPrintFile/downloadPrintFile` 경로가 후속 래핑 이후에도 옛 3000px 출력 함수를 계속 사용할 여지

## 수정 내용

- `frameCm()`가 다양한 사이즈 필드명을 읽도록 보정
  - `wcm/hcm`
  - `wCm/hCm`
  - `widthCm/heightCm`
  - `cmW/cmH`
  - `printWcm/printHcm`
  - `printWidthCm/printHeightCm`
  - `w/h`, `width/height` 단, 200cm 초과 값은 픽셀값으로 보고 제외
- 사이즈명/라벨/설명 텍스트에서 `60×42.5`, `21×29.7` 같은 cm 표기를 파싱
- 대표 사이즈명 fallback 추가
  - A2: `42.5 x 60cm`
  - A3: `30.6 x 42.6cm`
  - A4: `21 x 29.7cm`
  - B5: `18.6 x 26.3cm`
- A2 300dpi 실측 출력을 위해 maxPixels를 `36,000,000`으로 상향
- `DENNPrintExportV36` 인쇄 출력 wrapper를 더 강하게 고정
  - 원본 render/download 함수는 별도 보존
  - frame 출력은 항상 v36.5 출력 함수로 연결
  - case 출력은 기존 경로 유지
  - load 이후에도 160ms/600ms/1200ms 재설치로 후속 덮어쓰기 방지

## 기대 출력

세로 A2 기준:

- `42.5 x 60cm`
- 300dpi
- 약 `5020 x 7087px`

가로 모드에서는 `7087 x 5020px`로 전환된다.

## 검증 결과

- Mockup script parse: OK `73/73`
- Admin script parse: OK `109/109`
- 직접 `localStorage.setItem('denn_admin', ...)`: `0`
- `denn_admin_pw` 비밀번호 저장 코드는 기존 코드이며 이번 패치 대상이 아님

## 남은 확인

브라우저에서 새로고침 후 콘솔에서 다음을 확인한다.

```js
DENNPrintExportV36.framePrintSizeV365(curFSz)
DENNPrintExportV36.renderPrintFile('frame').then(r => console.log(r.canvas.width, r.canvas.height, r.printResolutionVersion))
```

정상이라면 A2 세로 기준 `5020 7087 v36.5-print-resolution-step2`에 가깝게 출력된다.

