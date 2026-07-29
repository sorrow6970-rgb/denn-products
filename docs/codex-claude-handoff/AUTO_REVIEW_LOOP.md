# Codex ↔ Claude Code 보호형 자동 검수 루프

## 현재 설정

```yaml
enabled: true
mode: current-spec-only
max_fix_rounds: 3
auto_commit: true
auto_fast_forward_push: true
auto_close_after_codex_approval: true
auto_start_next_spec: false
deploy: forbidden
```

이 파일은 반복 가능한 구현·검수 작업의 기본 권한 범위를 정한다. 사용자의 최신 명시적
지시와 현재 스펙이 항상 우선한다.

## 목적

이미 범위와 완료 조건이 정해진 현재 스펙에서는 매 라운드마다 사용자에게 “계속할까요?”를
묻지 않고 다음 순서를 자동 반복한다.

```text
현재 스펙 확인
→ Claude Code 구현·자체 검증
→ 코드/test 커밋
→ 문서/DONE/handoff 커밋
→ fast-forward push
→ Codex 독립 검수
→ in-scope 보완이면 Claude Code가 자동 수정·재검증·push
→ Codex 승인 시 종료 문서 커밋·push
→ STOP (다음 스펙은 사용자/Codex 지시 대기)
```

## 자동으로 진행해도 되는 작업

현재 `docs/rebuild/specs/NNN-*.md`의 명시적 범위 안에서만 다음을 자동 수행할 수 있다.

- 스펙이 지정한 소스·테스트·설정·문서 수정
- 합성 fixture와 저장소 내부 테스트 데이터 작성
- `corepack pnpm install --frozen-lockfile`
- format·lint·typecheck·unit·build·E2E·`check` 실행
- 검증 중 도구가 재생성한 추적 PNG를 시각 변경이 없을 때 원상 복원
- 코드/test와 문서/DONE/handoff를 분리 커밋
- 현재 브랜치에 fast-forward push
- Codex가 지적한 **현재 스펙 범위 안의 재현 가능한 결함** 보완
- Codex 최종 승인 후 종료 문서만 별도 커밋·push

자동 push는 다음 조건을 모두 만족할 때만 허용한다.

- push 직전 working tree가 의도한 변경만 포함
- 원격과 merge/rebase 없이 fast-forward 가능
- force push가 아님
- 검증 결과와 문서 수치가 실제 출력과 일치
- 변경 금지 파일의 hash/diff가 유지됨

## 즉시 멈추는 조건 (STOP)

아래 조건이 하나라도 발생하면 코드를 더 변경하거나 commit/push하지 말고, 안전한
읽기 전용 근거를 모아 `STOP REPORT`를 사용자에게 보고한다.

### 제품·계약

- 스펙이 없거나 현재 스펙의 범위·입력·완료 조건이 불명확함
- 코드 근거가 서로 충돌하거나 새로운 제품 결정을 요구함
- API·스키마·데이터 의미를 스펙 밖으로 확장해야 함
- 기존 동작을 근사·추측·기본값 생성으로만 구현할 수 있음
- Codex 지적을 고치려면 다음 스펙 범위를 선행해야 함

### 보안·운영·외부 상태

- Firebase SDK/Auth/write, Rules, CORS, Hosting 설정 또는 배포 필요
- 실제 운영 데이터·백업·PII·secret·token을 읽거나 저장해야 함
- 실제 네트워크/live test/이미지 다운로드가 스펙에 명시적으로 승인되지 않음
- 운영 HTML, production/Firebase branch, 운영 태그를 변경해야 함
- 외부 시스템에 쓰기·메시지 발송·배포·결제 등 되돌리기 어려운 작업 필요

### 의존성·도구

- 신규 외부 의존성 설치 또는 정확 버전 변경이 필요하지만 스펙에 없음
- 관리자 권한·전역 설치·PATH/레지스트리 변경이 필요
- 공급망 정책을 끄거나 peer/engine 검사를 우회해야 함

### Git·파일 안전

- 시작 시 working tree가 dirty이고 변경 소유자를 구분할 수 없음
- HEAD와 origin이 diverged하거나 non-fast-forward push가 필요
- merge·rebase·force push·reset·broad restore/delete가 필요
- 스펙 변경 금지 파일이나 baseline hash가 예상치 않게 달라짐
- 예상하지 못한 대량 diff·binary diff·생성 파일이 발생

### 검증·루프 한계

- 동일한 본질의 결함이 보완 후 다시 발생
- Codex의 “수정 후 재검증”이 누적 3라운드를 초과
- 테스트가 재현 불가·flaky이거나 결과가 환경에 따라 달라짐
- test 명령이 종료되지 않거나 포트·프로세스·temp artifact가 남음
- 필수 게이트 실패를 현재 스펙 범위 안에서 원인 확정할 수 없음
- 보고 수치·문서·실제 출력이 일치하지 않음

사용자가 “중지”, “대기”, “오늘 여기까지”라고 말하면 즉시 STOP한다.

## STOP REPORT 형식

```markdown
자동 루프 중지

- 현재 스펙 / HEAD:
- 중지 조건:
- 확인된 사실과 파일·라인 근거:
- 실행한 읽기 전용 검사:
- 변경 여부:
- 커밋·push 여부:
- 사용자에게 필요한 결정 1~3개:
- 안전하게 재개할 조건:
```

추측으로 선택지를 채우지 않는다. 확인할 수 없는 것은 `확인할 수 없음` 또는
`NOT VERIFIED`로 적는다.

## 라운드별 필수 기록

- 기준 HEAD와 신규 코드/문서 커밋
- 정확한 변경 파일과 Codex 지적별 수정 근거
- 실제 실행 명령·exit code·unit/E2E 개수·build gzip
- lockfile·dist·PNG·운영/Firebase 무변경 확인
- 포트·프로세스·temp artifact 종료 상태
- NOT TESTED·NOT DECIDED·남은 위험
- HEAD=origin, ahead/behind, clean

## 승인 후 동작

Codex가 `승인 가능`으로 판정하면 Claude Code는 추가 질문 없이 다음만 자동 수행한다.

1. 현재 스펙 DONE 하단에 최종 승인과 승인 기준 HEAD 기록
2. `CURRENT.md`를 현재 스펙 승인·종료 상태로 갱신
3. 문서 전용 종료 커밋
4. fast-forward push
5. 동기화·clean 확인 후 정지

다음 번호 스펙을 작성하거나 기능을 시작하지 않는다. 다음 스펙 착수는 사용자의
“다음 진행” 또는 Codex가 작성·push한 새 스펙이 있어야 한다.

## 현재 적용

이 규칙은 스펙 025의 남은 snapshot 보완 라운드부터 적용한다. 현재 확인된 보완은
case render-plan builder의 검증 후 property 재읽기 제거와 product adapter의
`zoneImages.get` property 단일 읽기다. 둘은 현재 스펙 범위 안이므로 자동 진행할 수
있다. API 의미 변경, 신규 의존성, 고객 UI/Canvas 연결, Firebase·배포가 필요해지면
즉시 STOP한다.
