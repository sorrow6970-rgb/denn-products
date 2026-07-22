# 2026-07-22 핸드오프 — 스펙 009 TS7 린트 + 최소 pnpm workspace POC (Codex 재검증 대기)

> 격리 POC `poc/toolchain-workspace/`로 남은 기술 불확실성 2건(TS7 린트 조합·최소 pnpm workspace)을 실측 해소.
> 스펙 `docs/rebuild/specs/009-ts7-lint-pnpm-workspace-poc.md`. 근거 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-ts7-lint-pnpm-workspace-poc-report.md`.
> 기준 HEAD `5987734`(문서 커밋 `83cc3c8`). 루트 apps/packages/lockfile·운영본·Firebase·기존 POC·디자인 무변경.

## 결론 (채택 권고)

1. **린트 조합 = Biome 2.5.5(lint+format, `--error-on-warnings`) + `tsc --noEmit`(타입).** typescript-eslint는 TS7 미지원(peer `>=4.8.4 <6.1.0`, 재현된 비호환)이라 미설치·미채택.
2. **최소 pnpm workspace 채택 권고.** app↔shared 경계(패키지 export/`workspace:*`)·단일 lockfile·루트 게이트·frozen 재현 작동. 전체 리빌드에서 `apps/mockup`·`apps/admin`·`packages/*`로 확장 가능(이번엔 미생성).
3. TS 세대 유지(임의 하향 금지). typescript-eslint의 향후 TS7 지원은 그 시점 metadata로 재판정.

## 환경 / 정확 버전

- Node v24.18.0 · Corepack 0.35.0. pnpm은 PATH에 없어 **Corepack로 실행**(전역 설치·enable·PATH 변경 없음, `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`). 관리자 권한 불필요, pnpm 캐시는 저장소 밖.
- pnpm 11.15.1 · typescript 7.0.2 · @biomejs/biome 2.5.5 · @types/node 24.13.3 (npm registry metadata).
- POC 루트 `engines.node ">=24 <25"` + `.nvmrc`=`24` (Node 24 LTS major 고정).

## 게이트 실측

| 구분 | 명령 | 결과 |
|---|---|---|
| typecheck | `tsc --noEmit`(shared+app) | ✅ 0 |
| lint | `biome lint --error-on-warnings .` | ✅ 0 |
| format:check | `biome format .` | ✅ 0 |
| test | shared build + `node --test`(경계) | ✅ 2/2 |
| check | 위 집계 | ✅ 0 |
| pnpm -r | `pnpm -r run typecheck` | ✅ 2 leaf |
| frozen | `pnpm install --frozen-lockfile` | ✅ lockfile diff 0 |
| fixtures | `verify:fixtures`(lint/format/type) | ✅ 각 exit 1(정상 거부) |

- 경계: app→shared는 **패키지명 import만**(상대 src 침투 0). `pnpm list -r --depth 0`로 도구 중앙화·app의 유일 런타임 dep(shared workspace link) 확인.
- 설치 경고: peer/deprecated/lifecycle/취약점 **없음**.
- **★ release-age 정책(config≠실측):** `pnpm config get minimumReleaseAge`=`undefined`·`.npmrc` 없음이나 **pnpm 11.15.1 기본 release-age 정책이 실제 작동**. Biome 2.5.5가 검증 시점 cutoff 안이라, `pnpm-workspace.yaml`의 `minimumReleaseAgeExclude`(Biome 2.5.5 + 플랫폼별 optional 9항목)를 **유지해야 frozen install EXIT 0**(제거 시 EXIT 1 — 실측). release-age 기간·장기 공급망 정책은 **NOT DECIDED**, `minimumReleaseAge=0` 비활성화 안 함, 기간을 프로젝트 설정으로 고정하지 않음. Biome이 임계 기간을 지나거나 스캐폴드 시점에 allowlist 필요성 재검증·불필요 시 제거.
- 역할 분리: Biome≠타입검사. `tsc --noEmit` 필수 병행. `noUnusedImports`는 warning이라 게이트 실패엔 `--error-on-warnings` 필요.

## 커밋 구성 (분리)

1. **code/config:** `poc/toolchain-workspace/**` (설정 json은 루트 `.gitignore` `*.json` 때문에 `git add -f`; node_modules/dist는 gitignore).
2. **handoff/결과:** 이 문서 · 보고서 · `specs/009`(DONE) · `specs/README` · `CURRENT.md`.

## 저장소 영향 / 무변경

- 신규 파일은 `poc/toolchain-workspace/` 내부만. 루트 `package.json`·`pnpm-workspace.yaml`·lockfile·실제 `apps/`·`packages/`·`legacy/` 미생성.
- 기존 `poc/platform-compatibility`·운영 HTML·Firebase·디자인 PNG **무변경**. 전역 pnpm/Biome/ESLint 미설치.

## 위험 / 롤백

- Biome는 타입검사 대체 불가 → `tsc --noEmit` 필수 유지. POC 2 leaf는 도구·경계·lockfile만 증명(제품 복잡성 아님).
- 롤백: 스펙 009 커밋 역순 `git revert` 또는 `poc/toolchain-workspace/` 삭제. 운영본·Firebase 롤백 없음.

## Codex 재검증 요청

읽기 전용 판정 요청. 중점: (1) 모든 설치·생성이 `poc/toolchain-workspace/` 내부, (2) typescript-eslint↔TS7 metadata 판정·force 미사용, (3) 정상 게이트 PASS·fixture 3종 정상 실패, (4) `workspace:*`+export 경계·상대 침투 0, (5) 단일 lockfile·frozen 재현, (6) 루트·기존 POC·운영/Firebase/디자인 무변경, (7) Corepack 사용이 전역 설정 변경과 구분됨.

## 계속 대기

- 전체 스택 최종 확정 · 별도 리빌드 스캐폴드 스펙 · Firebase · 배포 · PNG.
