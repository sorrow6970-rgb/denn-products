# DENN v36.3 Frame Template Parity Hotfix Report

작성일: 2026-05-12

## 기준 파일

- `working/denn-admin-v35-bugfix-stable.html`
- `working/denn-mockup-tool-v35-bugfix-stable.html`

파일명은 v35이지만 현재 내용은 v36 계열 주문/카카오/동적 문구 패치가 승격된 최신 작업본이다.

## 백업

- `backups/v36.3-frame-template-parity-before/denn-admin-v35-bugfix-stable.before-frame-template-parity.html`
- `backups/v36.3-frame-template-parity-before/denn-mockup-tool-v35-bugfix-stable.before-frame-template-parity.html`

## 수정 후 SHA256

- Admin: `1F23D57EF4BF40481933FAE291C789D4044B1A65AF2F79558AA60C1CEDD23F35`
- Mockup: `72939A8733B5A299B323A458E89442DAA8F7EBE25E7F040763F8B2F2C007A500`

## 원인 후보

1. 관리자 상세설정에서는 `textZones`, `textFields`, `defaultTexts`가 보이지만, 저장 후 여러 누적 wrapper를 지나면서 고객 목업이 읽는 최종 템플릿 구조가 일정하지 않았다.
2. 고객 목업의 동적 입력 생성 로직은 `textFields`가 있으면 해당 목록을 authoritative로 보고, `textZones/defaultTexts`에 남은 추가 키를 놓칠 수 있었다.
3. 고객 목업의 최종 `renderFrame` 경로는 `main/name/name2/date/sub`와 일부 동적 값만 조합했고, `main2/date2/sub2/custom...` 계열 default text fallback이 약했다.
4. 템플릿 이미지도 `dataUrl` 외 `sourceDataUrl/builderArtDataUrl/artDataUrl/originalDataUrl` 계열에 남아 있을 경우 고객 렌더 경로에서 빠질 수 있었다.

## 적용 내용

### Admin

- `denn-v36-3-frame-template-parity-admin` 모듈 추가.
- 저장/상세설정/목록렌더/템플릿 제작 저장 직후 템플릿을 canonical 형태로 정리.
- 다음 필드 보존 및 보정:
  - `dataUrl` 및 fallback 이미지 필드
  - `textZones`
  - `textFields`
  - `defaultTexts`
  - `photoZones`
  - `photoSlot`
  - `fit/objectFit`
  - `overlayScope`
  - size 관련 필드
- `saveZones`, `saveZonesOnly`, `openZoneEditor`, `fbExport`, `renderFTplsByCategory` 경로에 최소 wrapper 추가.
- 직접 `localStorage.setItem('denn_admin', ...)` 호출은 추가하지 않음.

### Mockup

- `denn-v36-3-frame-template-parity-mockup` 모듈 추가.
- 관리자 상태 로드, 초기화, 템플릿 목록 렌더, 템플릿 선택, 기본 문구 적용, 액자 렌더 직전에 템플릿 canonical 보정.
- `realTemplateSrc()` fallback을 보강해 `dataUrl` 외 저장 이미지 필드도 고객 렌더에서 사용.
- 동적 문구 입력 생성에서 `textFields`가 있어도 `textZones/defaultTexts`를 같이 병합하도록 보정.
- 최종 액자 `renderFrame`의 text zone 렌더 값에 `DENNFrameTemplateParityV363.textValues()` fallback을 추가.
- `main2`, `name2`, `date2`, `sub2`, `custom...` 같은 다중 key가 고객 입력/기본값/렌더 값으로 이어지도록 보정.

## 유지 확인

- `DENNPrintExportV36` 존재 확인.
- `DENNOrderRequestV36` 존재 확인.
- `시안 이미지 저장` 버튼 존재 확인.
- 카카오 고객 문의 흐름 관련 패치 영역은 삭제하지 않음.
- `renderCase()`는 수정하지 않음.

## 정적 검증

- Admin HTML script parse: `scripts ok 107`
- Mockup HTML script parse: `scripts ok 71`
- 직접 `localStorage.setItem('denn_admin', ...)`: 0건
- 직접 `localStorage.setItem("denn_admin", ...)`: 0건

## 남은 확인 필요

- 실제 브라우저 프로필의 IndexedDB에 저장된 특정 템플릿으로 관리자 상세설정과 고객 목업이 1:1로 일치하는지 육안 확인 필요.
- 고해상도 인쇄용 `DENNPrintExportV36.renderFramePrint()`는 고객 노출 기능이 아니어서 이번 핫픽스의 직접 대상에서 제외했다. 향후 관리자 인쇄파일에서도 다중 동적 문구가 필요하면 별도 패치가 안전하다.

## 최종 상태

`FRAME_TEMPLATE_PARITY_READY_STATIC`
