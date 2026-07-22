# 006 — 프런트엔드 기술 스택 최종 검토

상태: **READY FOR READ-ONLY EVIDENCE REPORT**

## 목표 (WHY)

전체 리빌드 스캐폴드를 생성하기 전에 프런트엔드 런타임·빌드·패키지 관리자·테스트·UI 기반의 정확 버전과 호환성을 공식 근거로 확정할 수 있는 보고서를 만든다.

이 스펙은 설치나 스캐폴드 작업이 아니다. 후보를 검증하고 사용자와 Codex가 최종 승인할 결정 자료만 만든다.

## 적용 결정서

- `docs/codex-claude-handoff/decisions/2026-07-22-tailwind-v4-adoption.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-dependency-and-technology-policy.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-performance-and-resource-budgets.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`

## 확정된 선행 결정

- React + TypeScript + Vite 방향
- Tailwind CSS v4 세대
- Modern Studio 디자인 토큰은 CSS custom properties가 원본
- 기존 운영본과 신규 리빌드 병행
- Canvas·데이터 계약은 프레임워크 독립 코어로 분리
- Firebase는 유지 후보지만 이번 스펙에서 연결하지 않음

## 검토 대상

- Node.js 지원 버전과 프로젝트 고정 방식
- pnpm 정확 버전과 Corepack 사용 방식
- React / React DOM
- TypeScript
- Vite / `@vitejs/plugin-react`
- Tailwind CSS v4 / `@tailwindcss/vite`
- Vitest
- Playwright / axe-core
- React Router
- 상태 관리 후보(Zustand 포함, 필요성 검토)
- UI primitive 후보(Radix/shadcn 포함, 설치 방식과 소유 코드 범위 검토)
- ESLint·formatter 구성
- 모노레포 workspace 도구를 pnpm만으로 충분히 운영할지 여부

## 조사 원칙

- 공식 문서, 공식 release, npm registry metadata만 근거로 사용한다.
- 검색 요약·블로그·Wikipedia를 버전 근거로 사용하지 않는다.
- 각 패키지의 정확 버전, release 상태, Node 요구사항, peer dependency, 라이선스를 기록한다.
- POC에서 검증한 버전과 현재 공식 버전이 다르면 차이와 업그레이드 위험을 설명한다.
- 최신 버전이라는 이유만으로 선택하지 않는다.
- TypeScript 7 등 신세대 도구는 생태계 호환성을 별도로 확인한다.
- 설치하지 않고 `npm view` 등 읽기 전용 metadata 조회를 우선한다.

## 산출물

새 읽기 전용 검토 보고서:

`docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md`

보고서에는 다음 표를 포함한다.

| 항목 | POC 버전 | 현재 후보 버전 | 공식 요구사항 | 호환성 | 라이선스 | 권고 |
|---|---|---|---|---|---|---|

추가 필수 내용:

- 확정 가능 항목
- 사용자 결정이 필요한 항목
- 추가 POC가 필요한 항목
- 전체 스캐폴드에서 설치할 패키지 최소 목록
- 당장 설치하지 않을 선택 패키지 목록
- Node/pnpm 버전 고정 파일 제안
- 단일 lockfile 정책
- 예상 초기 품질 명령
- 스캐폴드 롤백 방식

## 금지

- package.json·lockfile 생성 또는 수정
- 패키지 설치·업데이트
- `apps/`, `packages/` 또는 workspace 생성
- Firebase 초기화·연결
- 애플리케이션 코드 수정
- Preview·production 배포
- 후보를 확정으로 선행 기록
- 전체 의존성을 한꺼번에 도입하는 제안

## 검증 절차

- [ ] 모든 버전이 공식 metadata와 일치
- [ ] Node 요구사항과 peer dependency 충돌 없음
- [ ] 라이선스 기록
- [ ] POC 검증 결과와 차이 설명
- [ ] Tailwind v4 결정 준수
- [ ] 기술별 필요성·대안·도입 시점 구분
- [ ] 미확인 항목을 NOT VERIFIED로 표시
- [ ] 저장소 코드·설정·lockfile 무변경

## 완료 정의

- 읽기 전용 보고서만 작성된다.
- 전체 스택을 확정할 근거와 남은 사용자 결정이 분리된다.
- Codex가 보고서를 검증한 뒤 사용자에게 최종 선택안을 제시할 수 있다.
- 스캐폴드 구현은 별도 후속 스펙으로 남는다.

## QUESTIONS

- 보고서 작성 후 사용자와 Codex가 최종 스택을 승인한다.

### DONE (Claude) — 2026-07-22

- **산출물:** 읽기 전용 근거 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md` (npm registry metadata + Tailwind 공식 문서 근거, 설치·스캐폴드 없음).
- **조사 결과 요약:**
  - 스택 세대 확정 가능: React 19 / react-dom 19 / TypeScript 7 / Vite 8 + @vitejs/plugin-react 6 / Tailwind v4 + @tailwindcss/vite / Vitest 4 / Playwright 1.61 + @axe-core/playwright. POC↔후보 차이는 전부 patch 단계.
  - @vitejs/plugin-react 6 optional peer = **VERIFIED**(peerDependenciesMeta optional=true, 필수 peer는 vite ^8.0.0뿐).
  - 라이선스 전부 permissive(axe MPL-2.0 devDep).
  - **리스크: typescript-eslint(≤6.0) ↔ TypeScript 7.0.2 비호환** → 린트 전략 미확정.
- **Codex 최종 판정 = 승인 가능.** 승인 기준 HEAD **`94f6da9`**.
- **승인된 기준:** ①Node 24 LTS 기본 런타임 ②pnpm = Corepack + `packageManager` 정확 버전 + 단일 `pnpm-lock.yaml` ③React 19 / Vite 8 / TS 7 / Tailwind v4 기본 후보 ④Vitest 4 / Playwright / axe 검증 도구 ⑤Router·Zustand는 실제 요구 시까지 미도입 ⑥Radix/shadcn은 필요한 컴포넌트만 선택 도입 ⑦정확 patch는 스캐폴드 직전 재확인·lockfile 고정.
- **미확정(후속):** TypeScript 7 린트 조합 · 최소 pnpm workspace 구조.
- **다음 단계:** "TS7 린트 전략 + 최소 pnpm workspace" 소형 POC.
- **무변경:** package.json·lockfile·node_modules·apps/·packages/·workspace·Firebase·앱 코드·PNG·운영본.
