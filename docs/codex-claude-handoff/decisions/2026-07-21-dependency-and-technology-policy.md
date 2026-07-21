# 결정: 의존성 및 기술 선택 정책

결정일: 2026-07-21

상태: **확정 · 스캐폴드와 의존성 변경의 필수 계약**

## 핵심 결정

> 기술 스택은 공식 문서·POC·사용자 승인 후 버전을 고정한다. 핵심 데이터·렌더링·암호화 로직은 프레임워크 독립적으로 유지하고, 중복 라이브러리와 스펙 없는 의존성 추가를 금지한다.

## 1. 확정 절차

1. 제품 요구와 제약 확인
2. 후보 비교
3. 공식 문서에서 지원 버전 확인
4. 번들·브라우저·라이선스 영향 확인
5. 작은 proof-of-concept
6. 사용자 승인
7. 정확한 버전과 lockfile 고정

기억이나 `latest` 추정에 의존하지 않는다.

## 2. 현재 후보

- pnpm workspace
- Vite + TypeScript
- React
- React Router
- Zustand
- Tailwind CSS + shadcn/ui/Radix
- Native Canvas 2D
- Firebase modular SDK
- Vitest
- Playwright

공식 검증과 사용자 확정 전까지 제안 상태다.

## 3. 중복 금지

동일 목적의 상태관리, 폼, UI 시스템, 날짜 유틸, Canvas 렌더러 등을 병렬 도입하지 않는다. 추가와 교체를 스펙에서 구분한다.

## 4. 프레임워크 독립 영역

다음은 React·Zustand·Tailwind에 의존하지 않는다.

- 데이터 스키마·마이그레이션
- 암호화
- Canvas 렌더 수학·인쇄 export
- Repository 인터페이스
- 주문·시안 도메인 모델

## 5. 패키지 추가 조건

- 해결할 문제
- 직접 구현보다 나은 이유
- 기존 패키지로 불가능한 이유
- 번들 크기
- 브라우저 지원
- 유지보수 상태
- 라이선스·보안
- 대체 후보
- 제거·교체 가능성

소수 함수만 필요할 때 대형 패키지를 추가하지 않는다.

## 6. 버전과 설치

- 단일 `pnpm-lock.yaml`
- CI frozen lockfile
- Node·pnpm 버전 명시
- workspace 주요 버전 통일
- 전역 설치 비의존
- CDN·npm 동일 패키지 혼용 금지

## 7. 업데이트

- patch/minor도 전체 CI 후 병합
- major는 별도 스펙
- 주요 도구 업그레이드는 영향 분석
- 여러 major 동시 변경 금지
- 자동 업데이트의 운영 자동 병합 금지
- 지원 종료·보안 취약점 우선 대응

## 8. 라이선스·공급망

상업 사용, 재배포, 공개 의무, 폰트·아이콘·이미지, transitive dependency, 설치 스크립트, 유지보수 상태를 확인한다. registry·서비스 토큰을 Git에 넣지 않는다.

## 9. shadcn/ui

- 프로젝트 소유 코드로 취급
- Modern Studio 토큰과 접근성 적용
- 필요한 컴포넌트만 추가
- 화면별 임의 복제·변형 금지
- 공통 UI 패키지 관리
- 업데이트 diff와 행동 회귀검증

## 10. Tailwind

- 디자인 토큰 우선
- 반복 class 조합은 공통화
- `!important`·arbitrary value 남용 금지
- 동적 class 안전한 매핑
- Canvas·인쇄 규칙을 억지로 Tailwind화하지 않음

## 11. 상태관리

- 서버 데이터와 UI 상태 구분
- 모든 상태의 전역화 금지
- 도메인 경계와 단방향 흐름
- 순환 구독 금지
- 계산 가능 값 중복 저장 금지
- DOM·Canvas·Firebase 객체 영속 상태 저장 금지
- 저장 부작용은 Application service에서 수행

## 12. 제거

사용하지 않는 의존성은 import, package, 설정, 타입을 함께 제거하고 lockfile·번들·회귀 결과를 확인한다.

## 13. 금지 사항

- 스펙 없는 설치
- 버전 미확인 설치
- `--force`로 충돌 무시
- 중복 상태관리·UI 시스템
- 핵심 도메인의 UI 프레임워크 종속
- 즉흥 CDN 추가
- 라이선스 미확인 에셋
- 취약점 무시
- lockfile 없는 배포
- 의존성 업데이트와 기능 변경 혼합

## Claude Code 반영 지시

Claude Code는 이 결정서를 `CLAUDE.md`와 모든 스캐폴드·패키지 변경 스펙의 강제 규칙으로 참조한다. 사용자 확정 전에 후보 스택의 패키지를 설치하지 않는다.
