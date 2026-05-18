# 다음 세션 작업 컨텍스트 (2026-05-18 작업 종료 시점)

## 오늘 완료한 작업
- 1단계 정리 완료 (커밋 59d605c, 85줄 제거)
- 어제 픽스 (Guard-A + Guard-B) 적용 (커밋 5771b4f)
- 화질 개선 (백킹 660→1200, 표시 크기/줌 부작용 해결)
- Firebase 가입 + 프로젝트 생성
- Blaze 업그레이드 + 5000원 한도
- Storage 활성화 + 익명 인증 + 보안 규칙
- Firebase SDK 통합 (Step 1)
- fbExport 자동 업로드 통합 (Step 2)
- Firebase 자동 마이그레이션 진행 중 (data: 프리픽스 + storagePath 없는 모든 템플릿)

## 다음 작업 — Phase 1: 템플릿 색상/그림자 변환

### 사전 분석 완료
docs/work-log.md 또는 별도 분석 보고에 6 Stage 분할안 있음.

### 사양 결정사항
- 어드민 업로드: 흰색/검정 둘 다 호환 (자동 감지 + 수동 override)
- 액자 템플릿 상세설정에 "색상 변경 허용 ON/OFF" 토글 추가
- 고객(목업툴): 자유 입력 컬러 피커 + 그림자
- 일괄 설정: 템플릿 + 사용자 문구 통합
- 어드민 OFF 시 고객 측 컨트롤 비활성화

### 작업 계획 (Phase 분할)
- Phase A: Stage 1+2+3 (저위험, 데이터 모델 완성, 4~5h)
  - Stage 1: 어드민 토글 UI + preserveDetailFields (1~2h)
  - Stage 2: maskMode 자동 감지 + 수동 override (1~2h)
  - Stage 3: 고객 state 확장 (1h)
- Phase B: Stage 5 프로토타입 (그림자+마스크 검증, 1h)
- Phase C: Stage 4+5 본격 (중~고위험, 5~7h)
- Phase D: Stage 6 검증 (1~2h)

### 핵심 우려사항
1. 그림자 + 마스크 합성 인터랙션 (Stage 5 초반 프로토타입 필수)
2. v94 preserveDetailFields (L12022) 누락 시 필드 손실
3. 검정 PNG 자동 감지 정확도 (수동 override로 해결)
4. v363/v364 wrap과의 충돌 사전 확인 필요

### 보호 영역
- 보호 함수: zeRender, renderFrame, fbExport (직접 수정 금지)
- 보호 저장키: denn_admin, denn_shared_db, denn_order_requests
- 1단계 정리 완료 영역 (openZoneEditor)

## 1차 배포 전 전체 로드맵
- Phase 1: 템플릿 색상/그림자 (9~14시간) ← 다음 작업
- Phase 2: 가이드 이미지 업로드 (2~3일)
- Phase 3: 내공간보기 직접 연결 (5~7일, Firebase 인프라 활용)
- Phase 4: 1차 배포 + 안정화 (2~3일)
- Phase 5: 2단계/3단계 wrap 정리 (배포 후)

총 예상: 약 2~3주

## 작업 환경
- 메인 도구: Claude Code (PowerShell)
- 보조 도구: Codex Cloud (분석/검토)
- 워크플로우: 자연어 의뢰 → Claude Code가 직접 main push
- 검증: 브라우저에서 admin.html 새로고침 (Ctrl+Shift+R)

## Firebase 정보
- 프로젝트: denn-products
- Storage: denn-products.firebasestorage.app
- 요금제: Blaze + 5000원 예산 한도
- API config: denn-admin.html L13692 부근에 하드코딩됨

## 다음 세션 시작 방법

집/회사 PC에서 시작 시:
1. PowerShell 열기
2. cd C:\repo\denn-products
3. git pull origin main  ← 필수
4. claude
5. 자연어 한 줄: "docs/next-session-context.md 읽고 Phase 1 Stage 1+2+3 진행하자"
