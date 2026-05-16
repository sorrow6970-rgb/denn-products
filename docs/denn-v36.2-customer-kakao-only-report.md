# DENN v36.2 Customer Kakao Only Report

Date: 2026-05-12

## 기준 파일

- `working/denn-mockup-tool-v35-bugfix-stable.html`
- `working/denn-admin-v35-bugfix-stable.html`

## 백업

- `backups/v36.2-customer-kakao-only-before/`

## 변경 요약

- 고객 목업툴의 `주문제작 의뢰하기` 모달을 카카오채널 문의 중심으로 단순화했다.
- 고객 모달의 고해상도 인쇄파일 다운로드 버튼을 숨겼다.
- 고객 모달의 `카카오채널로 시안 보내기` 동작을 `시안 이미지 저장 -> 카카오채널 채팅 URL 열기` 흐름으로 변경했다.
- 고객 모달에서 `DENNPrintExportV36.renderPrintFile(...)`, 주문 저장, `printBlob` 생성을 호출하지 않도록 최종 동작을 보정했다.
- `DENNPrintExportV36` 자체와 IndexedDB 주문 저장 함수는 삭제하지 않았다. 관리자 주문의뢰 목록/인쇄파일 다운로드 기능 보존을 위해 유지한다.

## 고객 화면 모달 문구

- 제목: `주문제작 의뢰하기`
- 이름 라벨: `주문자명`
- 메모 라벨: `추가요청사항`
- 추가요청사항 placeholder: `원하시는 문구, 색상, 요청사항 등을 적어주세요.`
- 버튼: `카카오채널로 시안 보내기`

## 유지한 기능

- `시안 이미지 저장`
- `dlCanvas('frame')`
- `dlCanvas('case')`
- 워터마크 포함 preview 저장 흐름
- 카카오 URL을 `/chat` 주소로 보정하는 흐름
- 관리자 고해상도 인쇄파일 다운로드 기능
- 관리자 주문의뢰 목록 기능

## 검증

- Mockup HTML script syntax: PASS
- `localStorage.setItem('denn_admin', ...)` 직접 호출 수: 0
- 고객용 최종 보정 모듈: `denn-v36-2-customer-kakao-only`

## 해시

- Mockup SHA256: `26427161B333A84C9B5BD70785FAAA118787B63F70D2368A3EE79879B0FD5531`
- Admin SHA256: `15C4781D289EA4D8505ABEA9ED1BF25E7E4F00DBB3BBA4A0DE4167C89827C0A0`

## 남은 리스크

- 기존 v36 주문/인쇄 모듈은 호환성 때문에 파일 안에 유지되어 있다. 고객 UI에서는 마지막 보정 모듈이 주문 저장/인쇄파일 생성을 차단한다.
- 카카오 자동 파일 첨부는 지원하지 않는다. 고객이 저장된 시안 이미지를 채팅창에 직접 첨부해야 한다.

## 최종 상태

CUSTOMER_KAKAO_ONLY_READY
