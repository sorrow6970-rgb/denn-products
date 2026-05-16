# DENN v36.4 Frame Template Background OFF Render Hotfix

Date: 2026-05-13

## 원인

- 이전 배경색 ON/OFF 재구축에서 고객 목업 `renderFrame()`의 강제 배경 fill을 제거했습니다.
- 그런데 고객 목업은 프레임을 먼저 전체 영역에 그린 뒤 템플릿 내부를 렌더합니다.
- 배경 OFF인 투명 템플릿에서 내부 베이스를 아무것도 채우지 않으면, 투명 영역 뒤로 이미 그려진 검정/어두운 프레임 베이스가 그대로 노출되었습니다.

## 수정 내용

- 저장 구조는 그대로 유지했습니다.
  - `backgroundEnabled === true`일 때만 선택 배경색을 사용합니다.
  - 배경 OFF 저장 정책은 변경하지 않았습니다.
- 고객 목업 미리보기에서 프레임이 ON이고 업로드/투명 템플릿이면, 프레임 내부 베이스만 기존 종이색 `#FFFDF8`로 복구했습니다.
- 이 보정은 템플릿 `dataUrl`에 배경을 bake하지 않습니다.
- Admin 제작/상세설정의 배경 ON/OFF UI는 변경하지 않았습니다.

## 검증 결과

- Admin script parse OK
- Mockup script parse OK
- 직접 `localStorage.setItem('denn_admin', ...)` 추가 없음: 0개 유지

## 남은 위험

- 실제 브라우저 자동 검증은 현재 도구 노출 제한으로 수행하지 못했습니다.
- 고객 목업 화면에서 해당 템플릿을 다시 선택해 내부가 검정으로 깔리지 않는지만 시각 확인하면 됩니다.
