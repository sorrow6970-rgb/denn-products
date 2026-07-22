# DENN 리빌드 문서 인덱스

이 문서는 리빌드 문서의 단일 진입점이다. 구현 규칙의 원본은 `docs/codex-claude-handoff/decisions/`, 현재 작업의 원본은 `docs/codex-claude-handoff/CURRENT.md`다.

## 현재 상태

- 방향: 기존 운영본 유지 + 신규 리빌드 병행 구축
- 디자인: Modern Studio(B), 카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA`, accent-ink `#191A1D`, 카카오 `#FEE500`(문서·POC 코드·테스트=스펙 004 반영, PNG 재생성=별도 스펙)
- 기술 스택: 후보 상태, 최종 확정 전
- 구현: 시작 전
- 현재 단계: 문서·기준선 정리 및 기술 스택 결정 준비

## 읽기 순서

1. `/CLAUDE.md`
2. 이 문서
3. `../codex-claude-handoff/README.md`
4. `../codex-claude-handoff/CURRENT.md`
5. 현재 작업에 적용되는 `../codex-claude-handoff/decisions/`
6. 현재 `specs/NNN-*.md` 하나
7. 필요한 참고 문서만 선택

## 문서 역할

| 위치 | 역할 | 권위 |
|---|---|---|
| `/CLAUDE.md` | 짧은 작업 진입점·금지사항 | 요약 |
| `../codex-claude-handoff/CURRENT.md` | 현재 단계와 작업 포인터 | 현재 상태 원본 |
| `../codex-claude-handoff/decisions/` | 사용자와 확정한 불변 규칙 | 세부 규칙 원본 |
| `specs/` | Codex가 작성하는 구현 단위 | 현재 구현 계약 |
| `design/` | 디자인 토큰과 시안 | 디자인 기준 |
| `00-legacy-analysis.md` | 레거시 1차 인벤토리 | 참고, 완전성 보장 없음 |
| `../codex-claude-handoff/reviews/` | Codex 검증 결과 | 해당 검증 시점의 판정 |
| 과거 날짜별 handoff | 이력 | 참고 |

## 문서 충돌

```text
사용자 최신 결정
→ decisions
→ 현재 spec
→ CURRENT
→ CLAUDE 요약
→ rebuild 참고
→ 과거 handoff
```

충돌 시 코드로 먼저 해결하지 말고 질문한다.

## 확정 결정 목록

- 변경 및 패치 누적 방지
- 모바일 반응형 및 기기 호환
- 데이터 호환 및 마이그레이션
- 운영 전환·배포·롤백
- 보안 및 개인정보
- 품질 게이트
- 오류 처리·로그·관측
- 성능 예산 및 리소스 관리
- 접근성
- 의존성 및 기술 선택
- Modern Studio 카라멜 앰버 팔레트

상세 링크는 `/CLAUDE.md` §6과 `../codex-claude-handoff/README.md`를 따른다.

## 구현 시작 조건

1. 운영 기준선과 롤백 근거 확인
2. 기술 스택 공식 검증과 사용자 확정
3. Codex가 첫 구현 스펙 작성
4. Claude Code가 적용 결정서와 스펙을 읽고 질문 해소
5. 품질 게이트 실행 환경 준비

조건을 충족하기 전 기존 운영 파일 이동, 패키지 설치, 리빌드 코드 생성을 하지 않는다.
