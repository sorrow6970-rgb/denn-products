# DENN v36.4 Frame Template Background Toggle Hotfix

Date: 2026-05-13

## 잘못 적용된 부분

- Admin v36.4 배경색 패치에서 `templateBg()` / `builderBg()`가 값이 없을 때도 `#FFFDF8`을 반환했습니다.
- 액자 템플릿 제작 저장 시 `templateBackgroundColor`가 항상 저장되어, 사용자가 배경을 켜지 않아도 고객 목업 렌더에 밝은 배경이 깔릴 수 있었습니다.
- 고객 목업 `renderFrame()`에서 `templateBackgroundColor || canvasBgColor || backgroundColor || paperColor || '#FFFDF8'`를 조건 없이 채워 투명 템플릿의 alpha 판단이 흐려졌습니다.

## 부분 롤백한 내용

- `#FFFDF8` 강제 fallback 렌더를 제거했습니다.
- 기존 `templateBackgroundColor` / `canvasBgColor` 값은 `backgroundEnabled === true`일 때만 렌더에 쓰이도록 제한했습니다.
- 저장 시 배경 OFF이면 `templateBackgroundColor` / `canvasBgColor`를 제거하고, `backgroundEnabled:false`와 색상 기준값만 보존합니다.

## 재구축한 UI

- 액자템플릿 제작 화면의 기존 배경색상 패널을 ON/OFF 기반으로 재구축했습니다.
- UI 위치는 기존 v36.4 패치 위치인 흰색 테두리 설정 아래, 정렬 도구 위를 유지합니다.
- 구성:
  - `배경 사용` 토글
  - `배경색` color input
  - hex text input
  - `기본` 버튼
- OFF 상태에서는 색상 입력을 비활성화하고, 실제 렌더에 배경색을 적용하지 않습니다.

## 저장 필드

- `backgroundEnabled`
- `backgroundColor`
- 호환 목적:
  - ON일 때만 `templateBackgroundColor`를 같이 기록합니다.
  - OFF일 때는 `templateBackgroundColor`, `canvasBgColor`를 제거합니다.

## 미리보기용 체커보드 처리

- Admin 제작/상세설정 캔버스에는 CSS 체커보드 배경을 적용했습니다.
- 체커보드는 편집자가 투명 영역을 보기 위한 표시 전용입니다.
- 체커보드는 canvas bitmap, `dataUrl`, 고객 목업, 시안 저장 이미지에 bake되지 않습니다.

## 렌더 조건

- Admin 제작 미리보기:
  - `배경 사용 ON`일 때만 `destination-over`로 선택 색상을 채웁니다.
  - OFF일 때는 투명 canvas 상태를 유지합니다.
- Admin 상세설정 미리보기:
  - 템플릿의 `backgroundEnabled === true`일 때만 배경색을 뒤에 채웁니다.
- 고객 목업 렌더:
  - 업로드/투명 템플릿은 `backgroundEnabled === true`일 때만 배경색을 채웁니다.
  - legacy/builtin 템플릿은 기존 종이 배경 fallback을 유지했습니다.

## 검증 결과

- `denn-admin-v35-bugfix-stable.html` script parse OK
- `denn-mockup-tool-v35-bugfix-stable.html` script parse OK
- 직접 `localStorage.setItem('denn_admin', ...)` 추가 없음: 0개 유지
- 주문/카카오/케이스/고해상도 인쇄파일 관련 코드는 수정하지 않았습니다.

## 남은 위험

- 브라우저 자동화 도구가 현재 세션에 노출되지 않아 실제 화면 클릭 검증은 수행하지 못했습니다.
- 기존 데이터 중 과거 잘못된 패치로 저장된 `templateBackgroundColor`는 이제 `backgroundEnabled:true`가 없으면 렌더되지 않습니다. 의도적으로 배경을 쓰려는 템플릿은 제작/수정 화면에서 `배경 사용`을 켠 뒤 다시 저장해야 합니다.
