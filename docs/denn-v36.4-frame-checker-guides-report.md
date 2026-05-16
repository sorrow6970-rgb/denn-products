# DENN v36.4 액자 템플릿 체커보드/작업용 가이드 이미지 핫픽스

## 기준 파일

- `working/denn-admin-v35-bugfix-stable.html`
- `working/denn-mockup-tool-v35-bugfix-stable.html`

## 백업

- `backups/v36.4-frame-checker-guides-before-20260513-121206/`

## 기존 요청이 반영되지 않았던 원인

- 작업용 가이드 이미지 코드는 일부 존재했지만, 상세설정 모달의 실제 DOM 위치를 너무 좁게 가정하고 있었다.
- `.ze-controls` 또는 `.ze-canvas-stage` 구조가 패치 누적으로 달라지면 패널/오버레이가 붙지 않을 수 있었다.
- 액자 템플릿 배경은 실제 저장 배경과 편집용 투명 확인 배경이 섞여 있어, 배경 OFF 상태에서도 흰색/어두운 면이 렌더되는 회귀가 생길 수 있었다.

## 수정 파일

- `working/denn-admin-v35-bugfix-stable.html`
- `working/denn-mockup-tool-v35-bugfix-stable.html`

## 추가/수정한 UI 위치

- 상세설정 모달의 컨트롤 영역에 `작업용 가이드 이미지` 패널을 안정적으로 삽입하도록 보정했다.
- 기존 `새 이미지 업로드(기존 이미지 교체)` 흐름과 분리된 관리자 전용 패널이다.
- 패널은 기존 DOM 위치가 달라져도 컨트롤 영역 또는 모달 본문 안쪽에 붙도록 방어 로직을 추가했다.

## 저장 필드

- 관리자 전용 필드: `editorOverlayImages`
- 항목 구조:
  - `id`
  - `name`
  - `dataUrl`
  - `visible`
  - `opacity`

## 고객 렌더 제외 방식

- `editorOverlayImages`는 상세설정 미리보기 오버레이 전용으로만 사용한다.
- 고객 목업툴 렌더, 시안 저장, 주문 이미지, 인쇄 렌더에서 이 필드를 참조하지 않는다.
- 가이드 이미지를 `dataUrl`, `sourceDataUrl`, `builderArtDataUrl`, `artDataUrl`, `originalDataUrl`에 복사하지 않는다.

## 미리보기용 체커보드 처리

- 액자 템플릿 제작/상세설정 미리보기에서 배경 OFF 또는 투명 영역 확인이 필요한 경우 회색 체커보드를 편집용으로 표시한다.
- 체커보드는 저장 데이터가 아니며 템플릿 이미지에 bake하지 않는다.
- 고객 목업툴에서는 저장 템플릿 선택 후 고객 이미지가 없는 경우, 어두운 면 대신 체커보드와 `이미지를 업로드하세요` 안내를 표시하도록 보정했다.

## 렌더 조건

- 배경 ON: 저장된 배경색을 가장 뒤 레이어에만 렌더한다.
- 배경 OFF: 실제 템플릿 배경은 투명 상태를 유지하고, 편집/빈 이미지 확인용 체커보드만 별도로 표시한다.
- 고객 이미지가 업로드되면 기존처럼 액자 내부 paper fill 위에 고객 이미지/템플릿을 렌더한다.

## 검증 결과

- Admin HTML: 108개 script parse OK
- Mockup HTML: 71개 script parse OK
- 직접 `localStorage.setItem('denn_admin', ...)` 호출: 0개 유지
- 주요 추가 함수 확인:
  - `drawPreviewBaseUnderCanvas`
  - `installGuidePanel`
  - `ensureGuideOverlay`
  - `syncGuideOverlay`
  - `drawFrameEmptyChecker`

## 남은 위험

- 상세설정 모달 DOM이 이후 큰 폭으로 바뀌면 작업용 가이드 패널 삽입 위치는 다시 확인이 필요하다.
- 실제 브라우저에서 가이드 이미지 2장 이상 업로드, 투명도, 삭제, 저장 후 재진입까지 시각 검증이 필요하다.
- 체커보드가 고객 빈 상태에 보이는 방식이 너무 강하면, 고객 화면에서는 문구만 유지하고 체커보드는 관리자 화면에만 제한하는 후속 조정이 가능하다.

