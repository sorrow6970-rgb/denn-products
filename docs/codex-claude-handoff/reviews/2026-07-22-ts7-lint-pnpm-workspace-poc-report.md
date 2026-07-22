# 2026-07-22 · 스펙 009 TS7 린트 전략 + 최소 pnpm workspace POC — 근거 보고

> 성격: 격리 POC(`poc/toolchain-workspace/`) 실측 근거 보고. 저장소 루트 `apps/`·`packages/`·lockfile·운영본·Firebase·기존 POC·디자인 무변경.
> 스펙 `docs/rebuild/specs/009-ts7-lint-pnpm-workspace-poc.md`. 선행 근거 `docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md`.

## 0. 시작 상태

- 브랜치 `rebuild/modern-studio`, 기준 HEAD `5987734`(문서 커밋 후 `83cc3c8`), 원격 동기화, clean.
- **Node v24.18.0**, **Corepack 0.35.0** 사용 가능. `pnpm`은 시스템 PATH에 없음 → **Corepack로 실행**(전역 설치·`corepack enable`·PATH 변경 없음). pnpm 캐시는 저장소 밖 사용자 캐시(Corepack 관리).
- `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`으로 프롬프트 없이 `packageManager` 고정 버전(pnpm 11.15.1)을 내려받아 실행. 관리자 권한 불필요.

## 1. 후보 정확 버전·metadata (npm registry, 2026-07-22 읽기 전용)

| 패키지 | 버전 | engines(node) | license | 비고 |
|---|---|---|---|---|
| pnpm | 11.15.1 | >=22.13 | MIT | Corepack `packageManager`로 고정 |
| typescript | 7.0.2 | >=16.20.0 | Apache-2.0 | 타입 게이트(`tsc --noEmit`) |
| @biomejs/biome | 2.5.5 | >=14.21.3 | MIT OR Apache-2.0 | lint + format |
| @types/node | 24.13.3 | — | MIT | Node 24 major에 맞춰 고정(latest 26은 미채택) |
| eslint | 10.7.0 | ^20.19 \|\| ^22.13 \|\| >=24 | MIT | 미설치(비교 대상) |
| typescript-eslint | 8.65.0 | ^18.18 \|\| ^20.9 \|\| >=21.1 | MIT | **미설치** — peer 충돌 §2 |

## 2. ★ typescript-eslint ↔ TS7 = 재현된 비호환 (force 없이 판정)

- `npm view typescript-eslint peerDependencies` = `{ eslint: '^8.57.0 || ^9.0.0 || ^10.0.0', typescript: '>=4.8.4 <6.1.0' }`.
- 현재 TypeScript **7.0.2**는 `>=4.8.4 <6.1.0` 범위 밖 → typescript-eslint 8.65.0은 **TS7을 peer로 지원하지 않음**.
- 따라서 **설치하지 않았다**(`--force`·`--legacy-peer-deps`·peer 무시·prerelease 조합 미사용). metadata만으로 비호환을 확정.
- 결론: TS7 환경에서 **타입 인지 ESLint 조합은 현재 불가**. 타입 품질은 `tsc --noEmit`이 담당한다.

## 3. 격리 workspace 구조

`poc/toolchain-workspace/` 내부에만 생성. 저장소 루트 무변경.

```
package.json          private:true · packageManager pnpm@11.15.1 · engines.node>=24 · 중앙 devDeps(biome/tsc/@types/node)
pnpm-workspace.yaml   apps/* · packages/*  (+ pnpm11이 minimumReleaseAgeExclude 자동 추가, §5)
pnpm-lock.yaml        단일 lockfile
biome.json            linter.rules.preset=recommended + formatter(space/2/100)
tsconfig.base.json    strict · nodenext · noUnused* · verbatimModuleSyntax · types:[]
packages/shared-probe 프레임워크 비의존 함수·타입(addPoints/describe/ProbePoint) export. exports types→src, default→dist
apps/probe            workspace:* 로 shared 참조, node:test 1건, tsconfig types:["node"]
scripts/verify-fixtures.mjs  게이트 실패 재현기
```

- **경계**: `apps/probe`는 `@probe/shared-probe`를 **패키지명으로만** import(`main.ts`·`main.test.ts`). `../../packages/.../src` 상대 침투 **0**(grep 확인, 주석 언급 제외). pnpm이 `apps/probe/node_modules/@probe/shared-probe → ../../packages/shared-probe` 심볼릭 링크 생성.
- **도구 중앙화**: biome·tsc·@types/node는 루트 devDependency 1곳. leaf에 중복 설치 없음(`pnpm list -r --depth 0` 확인). 런타임 dependency는 app의 `@probe/shared-probe`(workspace link)뿐.
- **패키지명**: `probe`를 포함해 정식 이름(`@denn/*`) 선점 안 함.

## 4. 게이트 실측 (Corepack pnpm)

### 정상 상태 — 전부 PASS

| 게이트 | 명령 | 결과 |
|---|---|---|
| typecheck | `tsc --noEmit`(shared+app) | ✅ exit 0 |
| lint | `biome lint --error-on-warnings .` | ✅ exit 0 (4 files, 0 warning) |
| format:check | `biome format .` | ✅ exit 0 |
| test | shared build + `node --test`(경계 실행) | ✅ 2/2 pass |
| check(집계) | 위 전부 | ✅ exit 0 |
| pnpm -r recursion | `pnpm -r run typecheck` | ✅ 2 leaf 모두 실행 |

- `node --test`는 app→shared 경계를 **런타임으로 1건** 통과(`addPoints`/`describe`). Node 24 type stripping으로 `.ts` 테스트 실행, 의존성은 빌드된 `dist`(default export)로 로드.

### 오류 fixture — 게이트가 정상 거부 (`verify:fixtures`)

| fixture | 게이트 | 결과 |
|---|---|---|
| 사용하지 않는 import | `biome lint --error-on-warnings` | ✅ exit 1 (`lint/correctness/noUnusedImports`) |
| 잘못된 공백 | `biome format` | ✅ exit 1 (Formatter would have printed…) |
| 타입 오류 | `tsc --noEmit` | ✅ exit 1 (`TS2322`) |

- 세 fixture 모두 임시 파일로 생성→실패 관측→삭제. **영구 실패 파일 미커밋**(검증 후 `apps/probe/src`에 `main.ts`·`main.test.ts`만 잔존).
- ★ 주의: Biome 기본에서 `noUnusedImports`는 warning이라 `biome lint`만으로는 exit 0. 게이트가 실제로 실패하려면 **`--error-on-warnings`** 필요 → lint 스크립트에 반영.
- ★ 역할 분리 확인: Biome는 **타입검사를 대체하지 않는다**. 타입 오류는 `tsc --noEmit`만 잡음. 반드시 두 게이트를 병행.

## 5. pnpm workspace 동작

- **frozen install 재현**: `pnpm install --frozen-lockfile` = "Already up to date", **lockfile git diff 0**.
- **단일 lockfile**: `pnpm-lock.yaml` 1개. `package-lock.json`·`yarn.lock` 없음.
- **설치 경고**: peer·deprecated·lifecycle-script·취약점 경고 **없음**. pnpm 11이 공급망 보호 기능으로 `pnpm-workspace.yaml`에 `minimumReleaseAgeExclude`(biome 9개 항목)를 자동 추가함 — 최근 배포 패키지의 age-gate 예외 목록이며, 재현 설치를 위해 그대로 커밋. `latest`/force 아님.
- **Corepack 캐시**: pnpm 바이너리는 Corepack 사용자 캐시(저장소 밖)에 존재. 전역 활성화·시스템 설정 변경 없음.

## 6. 채택 권고

- **후보 A 채택 권고: Biome 2.5.5(lint+format, `--error-on-warnings`) + `tsc --noEmit`(타입).** TS7에서 lint/format/type 오류가 각각 정상 검출되고 workspace 전체 게이트·frozen install이 안정적으로 통과. 타입 인지 규칙은 `tsc`가 대체.
- **후보 B(ESLint) 미채택**: typescript-eslint가 TS7 미지원(재현). ESLint non-type-aware만으로는 TS 타입 품질 게이트를 대체 불가 → 이번 POC에서 설치·비교 불필요로 판단(강행 설치 금지 준수).
- **TS 세대 유지**: 타입 인지 ESLint가 제품 필수라는 새 요구는 확인되지 않음 → TS7 임의 하향 안 함. typescript-eslint의 향후 TS7 지원은 그 시점 metadata로 재판정.
- **최소 pnpm workspace 채택 권고**: app↔shared 독립 경계(패키지 export)·단일 lockfile·루트 품질 게이트·frozen 재현이 실제로 작동. 전체 리빌드에서 `apps/mockup`, `apps/admin`, `packages/*`(render/data/domain 등)로 **확장 가능**(이번엔 그 디렉터리 미생성).

## 7. 예상 초기 품질 명령 (스캐폴드 시)

`corepack pnpm install --frozen-lockfile` · `pnpm run typecheck` · `pnpm run lint` · `pnpm run format:check` · `pnpm run test` · `pnpm run check`. Corepack + `packageManager` 고정, 전역 pnpm 비의존.

## 8. 위험·롤백

- Biome는 타입검사를 대체하지 않음 → `tsc --noEmit` 필수 게이트 유지.
- typescript-eslint의 TS7 지원은 미래에 바뀔 수 있음(이번 판정은 검증 시점 metadata 기준).
- POC 2 leaf는 실제 제품 복잡성을 증명하지 않음 — 도구·경계·lockfile 동작만 검증.
- **롤백**: 스펙 009 POC/결과 커밋 역순 `git revert`. `poc/toolchain-workspace/` 삭제로 완전 제거 가능. 운영본·Firebase 롤백 없음.

## 9. 저장소 영향

- 신규 파일은 **`poc/toolchain-workspace/` 내부에만** 존재. `node_modules`·`dist`는 `.gitignore`. 루트 `package.json`·`pnpm-workspace.yaml`·lockfile 미생성. 실제 `apps/`·`packages/`·`legacy/` 미생성.
- 기존 `poc/platform-compatibility`·운영 HTML·Firebase·디자인 PNG **무변경**.
