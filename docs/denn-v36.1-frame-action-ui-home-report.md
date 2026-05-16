# DENN v36.1 Frame Action UI + Home Link Report

작성일: 2026-05-12

## 기준 파일

- 고객 목업툴: `working/denn-mockup-tool-v35-bugfix-stable.html`
- 관리자: `working/denn-admin-v35-bugfix-stable.html`

파일명은 v35이지만, 현재 내용은 v36 주문제작/고해상도 인쇄파일 기능이 승격된 최신 작업본입니다.

## 백업

작업 전 백업 위치:

- `backups/v36.1-frame-action-ui-home-before/denn-mockup-tool-v35-bugfix-stable.before-action-ui-home-20260512-121029.html`
- `backups/v36.1-frame-action-ui-home-before/denn-admin-v35-bugfix-stable.before-action-ui-home-20260512-121029.html`

## 현재 버튼 구조 감사

액자 탭 하단 기존 연결:

- `내 공간에서 보기`: `openRoomMockup()`
- `시안 이미지 저장`: `dlCanvas('frame')`
- `주문제작 의뢰하기`: v36 주문 스크립트에서 `DENNOrderRequestV36.open('frame')`로 주입

기존 중복 카카오 버튼:

- 액자 패널 안에 별도 `cta-kakao` 버튼은 없음
- v36 polish CSS/스크립트에서 기존 중복 카카오 버튼은 계속 숨김/제거 상태 유지

## 적용 내용

액자 하단 버튼을 다음 action stack 구조로 정리했습니다.

- `내 공간에서 보기`
- `시안 이미지 저장`
- `주문제작 의뢰하기`
- `홈페이지로 돌아가기`

홈페이지 링크:

- `https://dennproducts.com/`
- `target="_self"`

추가 CSS:

- `denn-v36-1-frame-action-ui-home-css`
- 액자 하단 버튼을 노란색 계열 CTA로 통일
- 주문 버튼은 기존 `DENNOrderRequestV36.open('frame')` 연결을 유지하면서 `denn-action-btn-primary` 스타일만 추가

## 수정 범위

수정한 파일:

- `working/denn-mockup-tool-v35-bugfix-stable.html`

관리자 파일:

- 코드 변경 없음
- 백업만 생성

건드리지 않은 영역:

- `renderFrame()`
- `dlCanvas()`
- `sendKakao()`
- `DENNPrintExportV36`
- `DENNOrderRequestV36`
- 고해상도 인쇄파일 생성 canvas
- IndexedDB 저장 구조
- 관리자 저장 구조
- 케이스 preview

## 검증 결과

정적 테스트:

- script 추출 후 `node --check`: 통과
- `localStorage.setItem('denn_admin', ...)` 직접 호출 수: 0
- `denn-sales-home-btn`: 1개 확인
- `denn-frame-action-stack`: 1개 확인
- 액자 영역 내부 `openRoomMockup()` 연결 확인
- 액자 영역 내부 `dlCanvas('frame')` 연결 확인
- 액자 영역 내부 `https://dennproducts.com/` 링크 확인

해시:

- 고객 목업툴 현재 SHA256: `E2DEB893B8F72F9DD9789E02CAE7408B645DD987E6F6C1D74E1E4F1B4AD55047`
- 고객 목업툴 작업 전 SHA256: `0625FF2EB9C3242DBF8822858175443DC3AB4CCFE062DF2B41C389489189540B`
- 관리자 현재 SHA256: `BA0F01C1064B652CA9A324CBC3A7B1DB1D128C14E6FD09A44859E218102A1EDD`
- 관리자 작업 전 SHA256: `BA0F01C1064B652CA9A324CBC3A7B1DB1D128C14E6FD09A44859E218102A1EDD`

## 남은 확인 사항

- 실제 브라우저에서 액자 탭 하단 버튼 시각 배치 확인 필요
- `홈페이지로 돌아가기`는 같은 탭 이동 방식이므로, 작업 중 실수 클릭을 막고 싶으면 추후 `target="_blank"`로 바꿀 수 있음

## 최종 상태

FRAME_ACTION_UI_HOME_READY
