# DENN v36.5 before-bg-toggle 기준 롤백 안정화 보고서

작성일: 2026-05-14

## 롤백 기준

사용자가 지정한 아래 백업 파일 2개를 기준으로 working 파일을 복원했다.

- Admin 기준: `DENN-v35-refactor-work/backups/v36.4-frame-template-bg-toggle-before-20260513-105918/denn-admin-v35-bugfix-stable.before-bg-toggle.html`
- Mockup 기준: `DENN-v35-refactor-work/backups/v36.4-frame-template-bg-toggle-before-20260513-105918/denn-mockup-tool-v35-bugfix-stable.before-bg-toggle.html`

## 백업한 현재 파일

복원 전 working 파일은 아래 폴더에 보존했다.

- `DENN-v35-refactor-work/backups/v36.5-before-rollback-current-broken-20260514-124306/`

보존 파일:

- `denn-admin-v35-bugfix-stable.before-rollback.html`
- `denn-mockup-tool-v35-bugfix-stable.before-rollback.html`

## 복원한 파일

아래 working 파일 2개를 지정 백업 기준으로 덮어썼다.

- `DENN-v35-refactor-work/working/denn-admin-v35-bugfix-stable.html`
- `DENN-v35-refactor-work/working/denn-mockup-tool-v35-bugfix-stable.html`

복원 후 SHA256:

- Admin: `52035A49BDEC0C73DFC0907CF1C8D655212A0619DE0D64F40311D926FF9A1DD9`
- Mockup: `06847959250E43A0F33BAB34F5E90B2693EC35F888338AA70EB6AB81BCAFE101`

위 해시는 지정한 `before-bg-toggle` 백업 파일의 해시와 일치한다.

## 정적 검증 결과

- Admin HTML inline script parse: OK, 108개 script 파싱 통과
- Mockup HTML inline script parse: OK, 71개 script 파싱 통과
- 직접 `localStorage.setItem('denn_admin', ...)` 호출: 0개

참고:

- `denn_admin_pw` 비밀번호 저장용 호출은 기존 코드에 존재하나, 관리자 데이터 본체 `denn_admin` 직접 setItem 호출은 없다.

## 주요 기능 존재 확인

Mockup 파일에서 확인:

- `DENNOrderRequestV36` 존재
- `DENNPrintExportV36` 존재
- `function renderFrame` 존재
- `function renderCase` 존재

Admin 파일에서 확인:

- `function openZoneEditor` 존재
- `function saveZones` 존재
- `function fbExport` 존재
- 액자 템플릿 저장 구조 `frameTemplates` 존재
- 주문 의뢰 메뉴 관련 코드 존재

## 제거/초기화된 패치 영역

이번 작업은 수동 삭제가 아니라 파일 단위 복원이다.

따라서 `v36.4-frame-template-bg-toggle-before-20260513-105918` 이후에 working 파일에 추가되었던 변경은 working 기준에서 제거되었다.

초기화된 것으로 보는 범위:

- 잘못 들어가던 배경 토글/배경색 재구축 시도
- 이후 배경 OFF 렌더 핫픽스 변형 시도
- 오늘 진행 중이던 체커보드 투명도 조정 일부
- 오늘 진행 중이던 작업용 가이드 이미지 UI 위치 변경 일부

정확한 기능별 차이는 별도 diff 검토가 필요하다.

## 아직 주의해야 할 누적 패치

롤백 기준 파일 안에도 아래 누적 보정 블록은 남아 있다.
이들은 현재 기준의 일부이므로 바로 삭제하지 않는다.

- `denn-v94-frame-template-edit-mode`
- `denn-v95-frame-template-list-ui-stabilize`
- `denn-v96-detail-template-image-underlay`
- `denn-v363-dynamic-frame-text-fields`
- `denn-v36-4-frame-template-tools`

주의:

- 위 블록들은 액자 템플릿 수정모드, 목록 UI 안정화, 상세설정 이미지 underlay, 동적 문구 필드, 템플릿 필터/도구 계열과 연결되어 있다.
- 이후 문제가 발생하면 전체 삭제가 아니라, 해당 기능 단위로 원인 확인 후 최소 보정한다.

## 이후 재적용해야 할 패치 후보

아직 바로 적용하지 않는다. 시각 확인 후 한 번에 하나씩 진행한다.

1. 복원 기준 화면 확인
   - 액자템플릿 제작 진입
   - 액자템플릿 상세설정 진입
   - 고객 목업 기본 렌더
   - 주문/시안/카카오 기본 흐름

2. 배경색 기능 재검토
   - 기본은 투명
   - 배경 사용 ON일 때만 배경색 적용
   - `dataUrl`에 배경색 bake 금지

3. 프레임 내부 빈 영역 표시 재검토
   - 이미지가 비어 있을 때만 약한 체커보드와 안내문구 표시
   - 고객 결과물에 체커보드 포함 금지

4. 작업용 가이드 이미지 재검토
   - 관리자 상세설정 전용
   - 고객 목업/주문/시안/인쇄 렌더 제외

5. 상세설정/제작 미리보기 튐 안정화
   - 렌더 호출 타이밍
   - 이미지 load 순서
   - 중복 wrapper 호출

## 권장 다음 순서

1. 사용자가 복원된 working 파일을 브라우저에서 직접 확인한다.
2. 정상 기준으로 보이면 이 상태를 새 체크포인트로 고정한다.
3. 다음 패치는 기능 1개씩만 적용한다.
4. 각 패치마다 `검토 -> 백업 -> 최소 수정 -> 정적 검증 -> 시각 확인` 순서를 따른다.

## 최종 상태

`ROLLBACK_BASE_READY`

