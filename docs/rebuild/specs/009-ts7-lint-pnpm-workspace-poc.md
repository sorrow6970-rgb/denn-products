# 009 — TypeScript 7 린트 전략 + 최소 pnpm workspace POC

상태: **READY FOR CLAUDE IMPLEMENTATION**

## 목표 (WHY)

전체 리빌드 스캐폴드 전에 남은 기술 불확실성 두 가지를 삭제 가능한 소형 POC로 해소한다.

1. TypeScript 7에서 신뢰할 수 있는 린트·포맷·타입검사 조합을 결정한다.
2. 두 앱과 공유 코어를 수용할 최소 pnpm workspace 구조와 단일 lockfile 동작을 검증한다.

이 POC의 결과는 실제 리빌드 골격을 만드는 다음 스펙의 입력이다. 이번 작업에서 실제 `apps/`·`packages/`를 만들거나 운영 코드를 이전하지 않는다.

## 범위 (SCOPE)

### 포함

- 작업 시작 시 Node·pnpm·린트 후보의 공식 npm metadata 재확인
- `poc/toolchain-workspace/` 내부에만 삭제 가능한 pnpm workspace 생성
- 최소 앱 probe 1개와 공유 패키지 probe 1개 구성
- workspace protocol 로컬 의존성, TypeScript project references 또는 동등한 명시적 경계 검증
- 단일 `pnpm-lock.yaml`, frozen install, 중복 버전·peer 경고 검사
- Biome 기반 린트·포맷 + `tsc --noEmit` 조합 실측
- ESLint non-type-aware 대안의 가능성·한계 비교
- 의도적 오류 fixture로 lint와 typecheck의 역할 분리 검증
- 결과 보고서·핸드오프·CURRENT 갱신

### 제외(하지 않을 것)

- 저장소 루트 `package.json`, `pnpm-workspace.yaml`, lockfile 생성·수정
- 실제 루트 `apps/`, `packages/`, `legacy/` 생성
- 기존 운영 HTML 이동·복사·수정·삭제
- POC `platform-compatibility`의 npm lockfile·코드·테스트 변경
- React/Vite/Tailwind/Firebase 전체 설치 또는 앱 스캐폴드
- React Router·Zustand·Radix/shadcn 도입
- typescript-eslint peer 충돌을 `--force`, `--legacy-peer-deps`, peer 무시 설정으로 우회
- TypeScript 세대 하향
- 전역 pnpm·Biome·ESLint 설치, 시스템 PATH·레지스트리·사용자 전역 설정 변경
- Firebase·Rules·운영 데이터·Hosting·preview/production 배포
- 기능 구현, 디자인·PNG 변경

## 대상 (WHERE)

- 신규 격리 POC: `poc/toolchain-workspace/`
  - 루트 `package.json`
  - `pnpm-workspace.yaml`
  - `pnpm-lock.yaml`
  - Node/pnpm 고정 파일과 lint/format/TS 설정
  - `apps/probe/`
  - `packages/shared-probe/`
  - POC 전용 README와 검증 결과
- 신규 근거 보고서: `docs/codex-claude-handoff/reviews/2026-07-22-ts7-lint-pnpm-workspace-poc-report.md`
- 신규 핸드오프: `docs/2026-07-22-spec-009-toolchain-poc-handoff.md`
- 상태: 이 스펙의 DONE, `docs/rebuild/specs/README.md`, `docs/codex-claude-handoff/CURRENT.md`
- 필수 결정:
  - `docs/codex-claude-handoff/decisions/2026-07-21-dependency-and-technology-policy.md`
  - `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
  - `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`
- 선행 근거:
  - `docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md`

## 구현 지시 (WHAT / HOW)

### 1. 시작 가드와 metadata 재확인

1. 브랜치 `rebuild/modern-studio`, 기준 HEAD `5987734`, 원격 동기화, clean 상태를 확인한다.
2. 설치 전에 공식 npm registry metadata만 읽기 전용으로 조회하고 결과를 보고서에 기록한다.
   - Node 실제 버전
   - Corepack 사용 가능 여부와 버전
   - pnpm 11.x 후보의 정확 버전·engines·license
   - TypeScript 7 후보의 정확 버전·engines·license
   - `@biomejs/biome` 후보의 정확 버전·engines·license
   - ESLint 후보와 typescript-eslint의 정확 버전·peerDependencies
3. 정확 버전은 조회 결과로만 고정한다. 기억에 의존하거나 무조건 `latest`를 설치하지 않는다.
4. Corepack 사용이 불가능하거나 pnpm 실행에 전역 설치·관리자 권한·저장소 밖 설정 변경이 필요하면 중단하고 먼저 보고한다. `npm install -g pnpm`으로 대체하지 않는다.

### 2. 격리 workspace 최소 구조

1. 모든 생성물과 설치 결과는 `poc/toolchain-workspace/` 안에만 둔다.
2. POC 루트는 `private: true`, 정확한 `packageManager`, Node 24 engines, 단일 `pnpm-lock.yaml`을 갖는다.
3. workspace는 최소 두 leaf로 구성한다.
   - `packages/shared-probe`: 프레임워크 비의존 TypeScript 함수·타입 1~2개를 export
   - `apps/probe`: `workspace:*`로 shared-probe를 참조하고 결과를 사용하는 작은 TypeScript 진입점
4. 실제 제품명과 혼동되지 않도록 패키지명에 `probe`를 포함한다. `@denn/shared` 같은 향후 정식 이름을 선점하지 않는다.
5. root script가 workspace 전체의 `typecheck`, `lint`, `format:check`, `test`를 한 번에 실행하도록 한다. 테스트는 최소 import 경계 1건이면 충분하며 새 테스트 프레임워크를 추가할 필요가 없으면 Node 내장 test 또는 단순 실행 검증을 우선한다.
6. leaf마다 동일 도구를 중복 설치하지 말고 루트 devDependency로 중앙화한다. 런타임 dependency는 필요한 leaf에만 선언한다.
7. TypeScript 경계는 소스 파일의 상대경로 침투가 아니라 package export와 workspace 의존성을 통해 사용한다. 앱에서 `../../packages/.../src` 직접 import를 금지한다.

### 3. TS7 린트 후보 실측

#### 후보 A — 기본 권고 실측

- Biome를 lint+format 도구로 사용하고 TypeScript 의미 검사는 `tsc --noEmit`이 담당한다.
- 다음을 각각 독립 명령으로 검증한다.
  - 올바른 코드: lint·format check·typecheck 모두 PASS
  - 명백한 lint fixture(예: 사용하지 않는 import/변수): lint FAIL
  - 타입 오류 fixture: typecheck FAIL
  - 포맷 오류 fixture: format check FAIL
- 오류 fixture는 영구 실패 상태로 커밋하지 않는다. 자동화 스크립트 또는 fixture 복사본으로 실패를 관측한 뒤 정상 상태로 복구하고 최종 게이트를 PASS시킨다.

#### 후보 B — 비교 대상

- ESLint core만으로 TypeScript 파일을 완전하게 파싱·타입 인지할 수 있다고 가정하지 않는다.
- 현재 typescript-eslint가 TS7 peer를 지원하지 않으면 설치하지 말고 metadata 충돌을 **재현된 비호환**으로 기록한다.
- ESLint non-type-aware 방식을 실제 설치해 비교할 필요가 있다면 JavaScript/config 파일 범위에 한정하고, TypeScript 품질 게이트를 대체할 수 없음을 명시한다.
- `--force`, peer 무시, prerelease 조합은 사용하지 않는다.

### 4. pnpm workspace 검증

1. 최초 설치 후 lockfile을 생성하고 설치 로그의 peer·deprecated·lifecycle script 경고를 기록한다.
2. `node_modules`를 지우는 파괴적 검증은 POC 디렉터리의 정확한 절대경로를 확인한 경우에만 수행한다. 가능하면 별도 임시 복사 또는 pnpm의 frozen 검증을 우선한다.
3. `pnpm install --frozen-lockfile`이 변경 없이 재현됨을 확인한다.
4. `pnpm --recursive` 또는 root scripts로 두 leaf가 모두 검사되는지 확인한다.
5. `pnpm list --depth 0 -r` 등 읽기 전용 목록으로 도구 중복·예상 밖 runtime dependency를 확인한다.
6. root 외 npm/yarn lockfile이 생기지 않았는지 확인한다.
7. POC 기준 최소 구조가 실제 전체 리빌드에서 `apps/mockup`, `apps/admin`, 공유 packages로 확장 가능한지 보고서에서 설명하되 이번에 그 디렉터리는 만들지 않는다.

### 5. 판정 규칙

- **Biome + tsc 채택 권고:** TS7 코드에서 lint/format/type 오류가 각각 올바르게 검출되고 workspace 전체 명령·frozen install이 안정적으로 통과
- **ESLint non-type-aware 채택 권고:** Biome에 치명적 미지원이 있고 ESLint 대안이 TS 파일에 필요한 규칙을 안전하게 제공한다는 근거가 있을 때만
- **TS 세대 재검토:** 타입 인지 ESLint가 제품 필수라는 새 요구가 확인되고 Biome+tsc로 대체 불가능할 때만 별도 의사결정으로 제안. 이번 POC에서 임의 하향 금지
- **workspace 채택:** 앱과 공유 코어의 독립 경계·단일 lockfile·root 품질 게이트가 실제로 작동하면 최소 pnpm workspace 구조 승인 권고
- 실패나 충돌이 있으면 보정 패치를 누적하지 말고 원인과 대안을 보고한다.

## 검증 절차 (VERIFY)

- [ ] 시작 HEAD/원격/clean과 Node·Corepack 실제 상태 기록
- [ ] 후보 패키지의 공식 metadata·peer·license 기록
- [ ] 모든 신규 파일·설치 결과가 `poc/toolchain-workspace/` 내부에만 존재
- [ ] POC root `private`, Node engines, 정확한 `packageManager`, 단일 pnpm lockfile 확인
- [ ] `workspace:*` 의존성과 package export를 통한 app→shared import 성공
- [ ] 상대경로 src 침투 0
- [ ] 정상 상태에서 root `typecheck`, `lint`, `format:check`, `test` 모두 PASS
- [ ] lint 오류 fixture가 lint를 실패시킴
- [ ] 타입 오류 fixture가 typecheck를 실패시킴
- [ ] 포맷 오류 fixture가 format check를 실패시킴
- [ ] fixture 검증 후 정상 상태 복구 및 최종 전체 게이트 PASS
- [ ] frozen install 재현 성공, lockfile diff 0
- [ ] peer/deprecated/취약점/설치 스크립트 경고를 숨기지 않고 기록
- [ ] typescript-eslint↔TS7 지원 여부를 실제 metadata로 판정하고 force 설치하지 않음
- [ ] 루트·기존 POC·운영본·Firebase·디자인 PNG 무변경
- [ ] 결과 보고서에 채택 권고, 보류 항목, 정확 버전, 명령별 결과, 위험, 롤백 기록

완료 정의(DONE): 격리 POC가 위 검증을 완료하고 Biome+tsc 및 최소 pnpm workspace의 채택 여부를 근거로 제시하며, 코드/설정 커밋과 결과 핸드오프 커밋을 분리해 push하고 로컬=원격·작업트리 clean을 확인한 뒤 Codex 재검증을 요청한다.

## 위험 (RISK)

- Biome는 TypeScript 타입검사를 대체하지 않는다. 반드시 `tsc --noEmit`을 별도 필수 게이트로 유지한다.
- typescript-eslint가 이후 TS7 지원을 추가할 수 있으나 이번 결정은 검증 시점의 공식 metadata를 기준으로 한다.
- Corepack·pnpm 캐시는 저장소 밖 사용자 캐시에 생성될 수 있다. 전역 활성화·시스템 설정 변경과 구분해 보고하고, 승인 없는 전역 설치는 금지한다.
- POC의 두 leaf가 실제 제품 복잡성을 증명하지는 않는다. 도구·경계·lockfile 동작만 검증한다.
- 롤백은 스펙 009 POC 및 결과 문서 커밋을 역순 `git revert`한다. 운영본·Firebase 롤백은 없어야 한다.

## QUESTIONS

- Corepack이 현재 Node 환경에서 제공되지 않거나 pnpm 실행에 저장소 밖의 영구 설정 변경이 필요하면, 실행 전에 사용자에게 허용 범위를 질문한다.

### DONE (Claude) — 작성 대기
