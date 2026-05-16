# DENN v36.5 누적 패치 정리 분석

작성일: 2026-05-14

## 기준

- 작업 기준 파일
  - `working/denn-admin-v35-bugfix-stable.html`
  - `working/denn-mockup-tool-v35-bugfix-stable.html`
- 정리 전 고정 백업
  - `backups/v36.5-before-patch-cleanup-analysis-20260514-174330`
- 이번 단계에서 HTML 기능 코드는 수정하지 않음

## [1] 현재 구조 요약

현재 프로젝트는 단일 HTML 파일 뒤쪽에 기능별 보정 스크립트를 계속 추가해 온 구조다. Admin 파일은 `<script>` 109개, `<style>` 71개이고, Mockup 파일은 `<script>` 72개, `<style>` 26개다.

저장은 크게 아래 흐름을 공유한다.

- 관리자 상태: `denn_admin`, IndexedDB `denn_shared_db` / `kv` / `denn_admin_state`
- 주문 상태: IndexedDB `denn_shared_db` / `denn_order_requests`
- 액자 템플릿: `ADM.frameTemplates` 계열
- 고객 목업: 관리자 상태를 읽어서 `FTPLS`, `curFTpl`, `renderFrame()`에서 렌더

렌더링 핵심 함수는 뒤쪽 패치에서 반복적으로 감싸져 있다.

- Admin
  - `fbRender`: 49회 hit
  - `fbExport`: 34회 hit
  - `openZoneEditor`: 33회 hit
  - `renderFTplsByCategory`: 30회 hit
  - `goTab`: 78회 hit
  - `setTimeout`: 454회
- Mockup
  - `renderFrame`: 53회 hit
  - `buildFrameTplGrid`: 20회 hit
  - `selFTplByRef`: 16회 hit
  - `switchTab`: 14회 hit
  - `setTimeout`: 200회

## [2] 중복/충돌 가능성이 높은 부분

1. `fbRender` 계열
   - 액자템플릿 제작 미리보기, 시계, 흰색테두리, 배경색, 저장용 캡처가 모두 이 경로에 걸려 있다.
   - 현재 배경 ON/OFF 토글이 생겼지만 미리보기에 반영되지 않는 이유도 이쪽 가능성이 높다.

2. `openZoneEditor / zeRender / zeRenderList`
   - 상세설정 진입, 문구 필드, 이름2, 동적 문구, 흰색테두리 UI, 상세 미리보기 이미지가 이 경로를 여러 번 감싼다.
   - 오른쪽 패널 튐, 문구 필드 잔상, 이름2 찌꺼기 후보가 여기 있다.

3. `renderFrame`
   - 프레임 ON/OFF, 흰색테두리, 템플릿 이미지, 동적 문구, 사이즈 필터, HiDPI, 주문/출력 연동이 여러 번 wrapper로 붙어 있다.
   - 고객 목업에서 저장 템플릿과 직접 업로드 렌더가 다르게 보이는 문제의 위험 지점이다.

4. 지연 렌더
   - `setTimeout(... 40/120/320/700)` 식의 보정이 여러 시대 패치에 남아 있다.
   - 화면이 1초 뒤 바뀌거나 글씨가 붙었다 떨어지는 증상의 대표 원인이다.

## [3] 실제 버그로 이어질 가능성이 높은 부분

1. 배경 ON/OFF 토글 미리보기 미반영
   - 현재 `drawBgUnderCanvas()`가 `globalCompositeOperation='destination-over'` 방식으로 뒤에 칠하는 구조다.
   - 하지만 기존 `fbRender()`가 먼저 불투명 배경을 칠하면, 뒤에 배경색을 칠해도 화면에는 보이지 않는다.
   - 따라서 배경색은 후처리 wrapper가 아니라 실제 `fbRender` 권한 경로 안에서 조건부로 처리해야 한다.

2. 이름2 찌꺼기
   - Admin에는 `denn-v87-name2-textbox-toggle`과 `denn-v36-3-dynamic-frame-text-fields-admin`이 동시에 있다.
   - Mockup에도 `denn-v87-name2-mockup`과 `denn-v36-3-dynamic-frame-text-fields-mockup`이 동시에 있다.
   - 둘 다 이름2를 생성/숨김/기본값 처리하므로, 템플릿에 실제 필드가 없는데 UI 잔상이 남을 수 있다.

3. 상세설정 UI 튐
   - `openZoneEditor`가 여러 패치에서 재호출/후처리된다.
   - `zeRenderList`가 패널을 재생성하면서 스크롤, 선택 상태, 필드 버튼 위치가 흔들릴 수 있다.

4. 템플릿 이미지/투명 렌더 불일치
   - `dataUrl`, `sourceDataUrl`, `builderArtDataUrl`, `artDataUrl`, `originalDataUrl`, `generatedDetailPreview`의 용도 분리가 불완전하다.
   - 썸네일/상세 미리보기용 이미지가 최종 고객 렌더용 overlay로 잘못 쓰이면 투명/프레임 합성이 틀어질 수 있다.

## [4] 삭제해도 되는 코드 후보

아직 바로 삭제하면 위험하다. 아래는 "삭제 후보"가 아니라 "통합 후 비활성화 후보"다.

- 과거 흰색테두리 후처리 wrapper
  - 현재 최종 흰색테두리 권한 모듈로 흡수되었는지 확인 후 비활성화 가능
- 이름2 전용 v87 패치
  - 동적 문구 필드 시스템이 완전히 담당한다면 비활성화 가능
- 오래된 `setTimeout` 기반 상세설정/제작 미리보기 보정
  - 통합 렌더 스케줄러가 생긴 뒤 단계적으로 제거 가능
- 템플릿 카드 UI 보정 중 반복되는 버튼/레이아웃 패치
  - 현재 카드 구조가 안정되면 하나의 카드 렌더 함수로 흡수 가능

## [5] 통합해야 하는 함수 후보

1. Admin 액자템플릿 제작
   - `fbRender`
   - `fbExport`
   - `drawClockLayer`
   - `drawWhite`
   - 배경색 ON/OFF 처리

2. Admin 상세설정
   - `openZoneEditor`
   - `zeRender`
   - `zeRenderList`
   - `saveZones`
   - 동적 문구 필드 관리자

3. Mockup 액자 렌더
   - `renderFrame`
   - `realTemplateSrc`
   - `drawUploadedTemplatePhotos`
   - `drawUploadedTemplateOverlay`
   - 동적 문구 입력값 resolver

4. 저장/로드
   - 관리자 상태 저장
   - IndexedDB 우선 로드
   - localStorage fallback
   - JSON import/export

## [6] 절대 건드리면 안 되는 핵심 기능

- `renderCase()`와 폰케이스 렌더
- 주문 저장소 `denn_order_requests`
- `DENNOrderRequestV36`
- `DENNPrintExportV36`
- 카카오채널 문의 흐름
- 시안 이미지 저장
- 기존 IndexedDB/localStorage key
- 내공간보기 기본값/사이즈가이드/드래그 안정화 영역
- 현재 정상으로 보이는 저장 템플릿 선택 렌더

## [7] 리팩토링 우선순위

1. 현재 기준 백업 고정
   - 완료: `backups/v36.5-before-patch-cleanup-analysis-20260514-174330`

2. Admin `fbRender` 권한 정리
   - 첫 번째 정리 대상.
   - 배경 ON/OFF 토글 미리보기 반영은 여기에서 해결해야 한다.
   - 후처리 `destination-over` 방식보다 본 렌더의 배경 레이어에 조건부 삽입하는 방식이 안전하다.

3. Admin 상세설정 문구 필드 정리
   - 이름2 전용 패치와 동적 필드 패치를 통합한다.
   - 실제 템플릿에 없는 필드는 UI에 남지 않게 한다.

4. Mockup `renderFrame` 정리
   - 저장 템플릿 이미지, 동적 문구, 배경색, 프레임/시계 레이어 순서를 하나의 기준으로 맞춘다.

5. 저장/로드 정리
   - JSON/IndexedDB/localStorage 혼선 방지용 adapter를 문서화하고, 직접 쓰기 경로를 막는다.

6. CSS 스코프 정리
   - 전역 버튼/input/canvas/card 스타일 충돌은 마지막 단계에서 처리한다.

## [8] 안전하게 패치하는 단계별 작업안

### 1단계: 기능 정지 상태에서 지도 만들기

- 지금처럼 패치 목록, wrapper 목록, 저장 경로를 문서화한다.
- 이 단계에서는 HTML 기능 코드를 수정하지 않는다.

### 2단계: `fbRender`만 정리

- 목표: 액자템플릿 제작 미리보기의 배경 ON/OFF 반영.
- 범위: Admin `fbRender` 계열만.
- 금지: 상세설정, 목업툴, 주문, 케이스 수정 금지.

### 3단계: 상세설정 문구 필드 정리

- 목표: 이름2/동적 필드 찌꺼기 정리.
- 범위: `openZoneEditor`, `zeRenderList`, 동적 필드 버튼만.
- 금지: 템플릿 이미지 저장 경로 수정 금지.

### 4단계: Mockup `renderFrame` 정리

- 목표: 고객 목업 렌더의 최종 레이어 순서 고정.
- 범위: 액자 렌더만.
- 금지: `renderCase()` 수정 금지.

### 5단계: 저장/로드 정리

- 목표: JSON/IndexedDB/localStorage 기준을 명확히 한다.
- 범위: adapter와 문서화.
- 금지: 기존 데이터 삭제/초기화 금지.

## 다음 권장 작업

가장 먼저 할 일은 `fbRender` 권한 정리다. 현재 배경 ON/OFF 토글이 미리보기에 안 보이는 문제는 토글 UI 문제가 아니라, `fbRender`가 이미 불투명 배경을 그린 뒤 후처리로 배경색을 넣고 있기 때문일 가능성이 높다.

따라서 다음 패치는 "Admin 액자템플릿 제작 미리보기 렌더 경로에서 배경 레이어를 본 렌더 안으로 이동"만 단독으로 진행하는 것이 가장 안전하다.
