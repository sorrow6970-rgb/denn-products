# toolchain-workspace — 스펙 009 POC (삭제 가능)

TypeScript 7 린트 전략과 최소 pnpm workspace 구조를 검증하는 **격리 POC**다. 제품 코드·Firebase 없음. 저장소 루트에 `apps/`·`packages/`를 만들지 않으며 이 디렉터리 안에서만 동작한다.

## 무엇을 증명하나

1. **TS7 린트 조합**: `@biomejs/biome`(lint+format) + `tsc --noEmit`(타입) 역할 분리. typescript-eslint는 TS7 미지원(§보고서)이라 미설치.
2. **최소 pnpm workspace**: `apps/probe`가 `packages/shared-probe`를 `workspace:*` + 패키지 export로 참조(상대 src 침투 없음), 단일 `pnpm-lock.yaml`, frozen install 재현.

## 구조

```
package.json            # private, packageManager=pnpm@11.15.1, engines.node>=24, 중앙 devDeps(biome/tsc/@types/node)
pnpm-workspace.yaml     # apps/*, packages/*  (+ pnpm11 minimumReleaseAgeExclude 자동 생성)
pnpm-lock.yaml          # 단일 lockfile
biome.json              # linter recommended(preset) + formatter
tsconfig.base.json      # 공통 strict 옵션
packages/shared-probe/  # 프레임워크 비의존 함수·타입 export (types→src, default→dist)
apps/probe/             # workspace:*로 shared 참조, node:test 1건
scripts/verify-fixtures.mjs  # lint/format/type 게이트가 실제로 실패하는지 재현
```

## 실행 (Corepack, 전역 설치 없음)

pnpm은 전역 설치하지 않고 Corepack로 실행한다. `packageManager` 필드가 pnpm 11.15.1을 고정한다.

```bash
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack pnpm install --frozen-lockfile   # 재현 설치
corepack pnpm run typecheck               # tsc --noEmit (두 leaf)
corepack pnpm run lint                    # biome lint --error-on-warnings
corepack pnpm run format:check            # biome format
corepack pnpm run test                    # shared build + node --test (경계 실행)
corepack pnpm run check                   # 위 전부 한 번에
corepack pnpm run verify:fixtures         # 각 게이트가 나쁜 입력을 거부하는지 재현
```

## 결과 요약 (검증 시점)

- 정상 상태: typecheck / lint / format / test **모두 PASS**.
- fixture: lint(사용하지 않는 import) / format(잘못된 공백) / type(타입 오류) 각각 게이트를 **정상 실패**시킴(영구 실패 파일 미커밋).
- frozen install 재현, lockfile diff 0, npm/yarn lockfile 없음, app→shared는 패키지명 import.
- 상세 근거·정확 버전: `docs/codex-claude-handoff/reviews/2026-07-22-ts7-lint-pnpm-workspace-poc-report.md`.

이 POC는 도구·경계·lockfile 동작만 증명한다. 실제 `apps/mockup`·`apps/admin`·공유 packages 확장은 별도 스캐폴드 스펙에서 수행한다.
