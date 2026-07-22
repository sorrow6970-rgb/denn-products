# CLAUDE.md — DENN PRODUCTS 리빌드 작업 규칙

> Claude Code가 작업 시작 시 읽는 프로젝트 진입점이다. 세부 계약의 원본은 `docs/codex-claude-handoff/decisions/`에 있으며, 이 문서는 그 규칙을 약화하거나 대체하지 않는다.

## 1. 현재 결정

- 기존 모놀리식 운영본은 유지하고, 신규 앱을 별도 디렉터리에 병행 구축한다.
- 기존 `denn-mockup-tool.html`, `denn-admin.html`, 현재 Hosting 경로는 cutover 전까지 이동·삭제·이름 변경하지 않는다.
- 리빌드는 기능·데이터 계약을 검증하며 점진적으로 진행한다.
- UI/UX는 **Modern Studio(B)**로 리뉴얼한다.
- 최신 확정 포인트 팔레트는 **카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA`**, accent 위 일반 텍스트는 `#191A1D`, 카카오 CTA는 `#FEE500`이다. 현재 POC 코드·테스트 반영은 스펙 004, PNG 재생성은 별도 스펙 대기 상태다.
- Codex는 분석·스펙·검증을 담당하고 Claude Code는 구현·테스트·커밋·푸시·승인된 배포를 담당한다.
- 기술 스택은 아직 후보 상태다. 사용자 최종 확정 전 패키지를 설치하거나 스캐폴드를 만들지 않는다.

## 2. 작업 전 필수 읽기 순서

1. 이 `CLAUDE.md`
2. `docs/rebuild/README.md`
3. `docs/codex-claude-handoff/README.md`
4. `docs/codex-claude-handoff/CURRENT.md`
5. 현재 작업에 적용되는 `docs/codex-claude-handoff/decisions/*.md`
6. 현재 작업 하나의 `docs/rebuild/specs/NNN-*.md`
7. 현재 작업에 필요한 분석·디자인·레거시 참조만 선택적으로 읽기

`docs/rebuild/` 전체와 과거 핸드오프 전체를 매번 읽지 않는다.

## 3. 문서 충돌 우선순위

```text
사용자의 최신 명시적 결정
→ 확정 decisions 문서
→ 현재 작업 spec
→ CURRENT.md
→ CLAUDE.md 요약
→ docs/rebuild 참고 문서
→ 과거 핸드오프
```

충돌·모순·빈 결정이 있으면 임의로 해석하지 않는다. 구현을 중단하고 현재 스펙의 `QUESTIONS`에 기록한 뒤 사용자 확인을 받는다.

## 4. 협업 절차

1. Codex가 `docs/rebuild/specs/NNN-<slug>.md`에 목표·범위·구현 지시·검증·롤백을 작성한다.
2. Claude Code는 현재 스펙과 적용 결정서를 읽는다.
3. 스펙에 없는 기능 추가·리팩터링·패키지 설치를 하지 않는다.
4. Claude Code가 구현하고 정해진 품질 게이트를 실행한다.
5. 완료 보고에 커밋, 변경 파일, 명령별 결과, 미검증 항목, 위험, 롤백 방법을 기록한다.
6. Codex가 diff를 읽기 전용으로 검증해 `승인 가능`, `수정 후 재검증`, `재설계 필요` 중 하나로 판정한다.
7. Preview·production·Rules·데이터 마이그레이션은 각각 사용자 승인을 받는다.

## 5. 절대 금지

- 기존 운영 HTML과 Hosting 경로의 선행 이동·삭제
- 원인이 확인되지 않은 보정 패치
- 함수 후행 재정의·래퍼 누적·`V2/final/fix/latest` 병렬 구현
- 신규 `window.*` 전역 상태
- 초기화 순서를 맞추는 임의 `setTimeout`
- 빈 `catch`와 실패 성공 처리
- 구버전·신버전의 동일 운영 데이터 동시 쓰기
- 사용자 승인 없는 운영 데이터 쓰기·변환·삭제
- 스펙 없는 의존성 설치
- Preview와 필수 검증 없는 production 배포
- 비밀번호·토큰·고객 데이터·이미지의 로그 기록

## 6. 확정 결정서

작업에 관련된 문서를 반드시 적용한다.

- 변경·패치 누적: `docs/codex-claude-handoff/decisions/2026-07-21-change-and-patch-policy.md`
- 모바일·기기 호환: `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
- 데이터·마이그레이션: `docs/codex-claude-handoff/decisions/2026-07-21-data-compatibility-and-migration.md`
- 배포·cutover·롤백: `docs/codex-claude-handoff/decisions/2026-07-21-deployment-cutover-and-rollback.md`
- 보안·개인정보: `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`
- 품질 게이트: `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
- 오류·로그·관측: `docs/codex-claude-handoff/decisions/2026-07-21-error-logging-observability.md`
- 성능 예산: `docs/codex-claude-handoff/decisions/2026-07-21-performance-and-resource-budgets.md`
- 접근성: `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- 의존성·기술 선택: `docs/codex-claude-handoff/decisions/2026-07-21-dependency-and-technology-policy.md`
- PC 간 핸드오프·재개: `docs/codex-claude-handoff/decisions/2026-07-21-cross-device-handoff-and-resume.md`
- 디자인 팔레트: `docs/codex-claude-handoff/decisions/2026-07-21-caramel-amber-palette.md`

## 7. 확정 디자인과 참고 자료

- 디자인 기준: `docs/rebuild/design/README.md`
- 시안: `docs/rebuild/design/*-B.png`
- 레거시 1차 인벤토리: `docs/rebuild/00-legacy-analysis.md`
- 스펙 작성 규칙: `docs/rebuild/specs/README.md`

디자인 PNG는 시각 참고이며 픽셀 고정 계약이 아니다. 실제 데이터, 모바일 safe area, 키보드, 접근성, Canvas 비율을 반영하면서 토큰과 정보 계층을 유지한다.

## 8. 기술 스택 후보 — 미확정

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

스캐폴드 직전에 공식 문서, 지원 버전, 브라우저, 번들, 라이선스를 확인하고 작은 POC와 사용자 승인 후 정확한 버전을 고정한다.

## 9. 기존 계약 처리

- Firebase 프로젝트, 기존 데이터, Storage URL, `?space=<token>`, 암호화·인쇄·카카오 흐름은 호환 조사 대상이다.
- 현행 Firebase Rules는 기존 동작을 깨지 않도록 보존하되 영구 설계로 확정하지 않는다.
- 공개 쓰기 경로는 별도 보안 스펙, Emulator 테스트, 마이그레이션·롤백, 사용자 승인 없이 변경하지 않는다.
- 신버전 초기에는 기존 운영 데이터를 읽기만 하고 별도 개발 경로에만 쓴다.
- 운영 전환은 별도 cutover 스펙에서만 수행한다.

## 10. 현재 작업

실제 현재 상태와 작업 포인터는 `docs/codex-claude-handoff/CURRENT.md`만 수정해 관리한다. 이 문서에 작업 번호를 중복 기록하지 않는다.
