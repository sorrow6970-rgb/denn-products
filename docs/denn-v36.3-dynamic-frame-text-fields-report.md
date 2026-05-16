# DENN v36.3 Dynamic Frame Text Fields Report

작성일: 2026-05-12

## 기준 파일

- `working/denn-admin-v35-bugfix-stable.html`
- `working/denn-mockup-tool-v35-bugfix-stable.html`

파일명은 v35이지만, 현재 작업 기준은 v36 주문제작/카카오 문의 흐름이 승격된 최신본입니다.

## 백업

- `backups/v36.3-dynamic-frame-text-fields-before/`
  - `denn-admin-v35-bugfix-stable.before-dynamic-text-fields-20260512-135007.html`
  - `denn-mockup-tool-v35-bugfix-stable.before-dynamic-text-fields-20260512-135007.html`

## 현재 해시

- Admin SHA256: `16AB1809160B87148AFF5F2600B0655D59F89B8B689B4321AAFDCDBEC73C8C37`
- Mockup SHA256: `ABD78518363A06868AC2071194CFC889F588FEE5A798396BECF5C2373827C518`

## 적용 내용

### 관리자 액자 템플릿 상세설정

- `textFields` 메타데이터를 추가했습니다.
- 기존 `textZones` 구조는 유지했습니다.
- 기존 키 호환을 유지했습니다:
  - `main`
  - `name`
  - `name2`
  - `date`
  - `sub`
- 상세설정 우측에 `문구 필드 관리` UI를 추가했습니다.
- 필드 추가/이름 변경/삭제를 지원합니다.
- 추가 필드는 예를 들어 `main2`, `name3`, `date2`, `sub2`, `custom`처럼 저장됩니다.
- 저장 시 `textFields`, `textZones`, `defaultTexts`가 함께 저장됩니다.

### 고객 목업툴

- 템플릿의 `textFields` 또는 `textZones`를 기준으로 문구 입력칸을 자동 생성합니다.
- 기존 고정 입력칸은 숨기고, 동적 입력칸을 표시합니다.
- 기존 템플릿처럼 `textFields`가 없는 경우에는 `textZones` 또는 기존 기본 키를 fallback으로 사용합니다.
- 동적 필드 값은 기존 `renderFrame()`의 텍스트 맵에 연결했습니다.
- 시안 이미지 저장은 기존 `frameCanvas`를 사용하므로 동적 문구가 함께 반영됩니다.
- 기존 `renderCase()`는 수정하지 않았습니다.

## 호환 처리

- 기존 템플릿은 `textFields`가 없어도 열립니다.
- 기존 `main/name/date/sub/name2`는 계속 동작합니다.
- 기존 `textZones` 배열은 삭제하지 않았습니다.
- 기존 관리자 저장 구조, IndexedDB, 주문 저장 구조는 변경하지 않았습니다.
- `localStorage.setItem('denn_admin', ...)` 직접 호출은 추가하지 않았습니다.

## 검증

- Admin HTML script syntax check: 통과
- Mockup HTML script syntax check: 통과
- `localStorage.setItem('denn_admin', ...)` 직접 호출 검색: 추가 없음

## 남은 확인 항목

- 실제 브라우저에서 다음 흐름을 눈으로 확인해야 합니다.
  - 상세설정 열기
  - `이름 2`, `날짜 2`, `기타 문구` 추가
  - 캔버스 클릭으로 위치 지정
  - 전체 저장
  - 고객 목업툴에서 입력칸 자동 생성
  - 입력 후 시안 이미지 저장

현재 환경에서는 Chrome/Playwright 실행 도구가 감지되지 않아 정적 검증까지만 완료했습니다.

## 최종 상태

`DYNAMIC_FRAME_TEXT_FIELDS_STATIC_READY`

