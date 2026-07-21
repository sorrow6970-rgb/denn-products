# 기준선·브랜치·기술검증 보고 검증

검증일: 2026-07-21

판정: **기준선·브랜치 승인 / 기술 버전은 POC 후 확정**

## Git 검증 결과

- `main = origin/main = 805b61d`
- `805b61d`는 `623a929` 이후의 docs-only 커밋
- 커밋에는 문서·디자인 26개만 포함되고 운영 HTML·Firebase 파일은 포함되지 않음
- annotated tag `prod-baseline-20260721` 존재
- 태그 객체가 최종적으로 `df856db`를 가리킴
- 태그 메시지에 URL·확인 시각·마커·8커밋 차이가 기록됨
- `rebuild/modern-studio = origin/rebuild/modern-studio = 805b61d`
- 현재 작업 트리는 clean

기준선 태그와 리빌드 브랜치 구성은 승인한다.

## 기술 조사 판정

후보 스택의 방향과 리스크 분석은 타당하다. 하지만 정확 버전과 호환 하한은 아직 확정하지 않는다.

사유:

- 카카오 인앱 웹뷰의 최소 엔진 버전이 확인되지 않음
- 실제 Android System WebView 업데이트 상태가 사용자 기기마다 다를 수 있음
- Tailwind v4의 최신 CSS 기능이 목표 웹뷰에서 실제 동작하는지 POC가 없음
- React Router 8의 정확한 런타임·Node·ESM 제약을 스캐폴드 시점 공식 문서와 패키지 메타데이터로 다시 확인해야 함
- Playwright 버전 근거는 Wikipedia가 아니라 공식 release/package 정보를 사용해야 함
- 최신 버전 목록만으로 번들 예산·빌드 결과·상호 호환을 증명할 수 없음

## 다음 단계 권고

첫 구현은 전체 모노레포 스캐폴드가 아니라 **플랫폼 호환 POC**로 한다.

목표:

- 후보 Vite/Tailwind 조합의 최소 산출물이 목표 웹뷰에서 표시되는지 확인
- Modern Studio 핵심 토큰과 `@property`·`color-mix()` fallback 검증
- `dvh`, safe area, Visual Viewport, 키보드, 회전 이벤트 관찰
- Canvas CSS 크기/backing-store/DPR 기본 동작
- Fullscreen·orientation 지원 여부를 기능 탐지하고 fallback 표시
- 수평 overflow와 버튼 밀림 확인

POC 금지 범위:

- Firebase 연결·운영 데이터 접근
- 기존 HTML 수정·이동
- 전체 앱 구조 구현
- 데이터 모델·렌더 엔진 구현
- production/Preview 배포

POC 결과에 따라:

- Tailwind v4가 목표 실제 기기에서 통과하면 v4 후보 유지
- 실패하면 v3.4 또는 필요한 CSS fallback을 비교
- React Router는 POC에 필수가 아니므로 별도 공식 검증 후 선택
- 정확한 Node·pnpm·Vite·React·Router·Tailwind 버전은 호환 결과와 함께 사용자 승인 후 고정

## 다음 사용자 결정

`001-platform-compatibility-poc.md`를 첫 구현 스펙으로 발행할지 결정한다. 실제 카카오 인앱·Samsung Internet·iPhone Safari 검증은 사용자의 기기 협조가 필요하다.
