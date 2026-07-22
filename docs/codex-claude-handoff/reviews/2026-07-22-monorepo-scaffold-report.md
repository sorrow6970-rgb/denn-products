# 2026-07-22 · 스펙 010 실제 리빌드 모노레포 스캐폴드 — 근거 보고

> 성격: 실제 리빌드 골격 스캐폴드 구현 근거. 제품 기능·Firebase SDK/연결·암호화·Canvas 없음. **어떠한 Firebase deploy도 실행하지 않음.**
> 스펙 `docs/rebuild/specs/010-monorepo-scaffold.md`. 기준 HEAD `64ca533`(문서 커밋 `9ed0fa5`).

## 0. 시작 상태

- 브랜치 `rebuild/modern-studio`, 기준 HEAD `64ca533`, 원격 동기화, clean에서 시작.
- Node v24.18.0 · Corepack 0.35.0. pnpm은 Corepack로 실행(전역 설치·enable·PATH 변경 없음, `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`). 관리자 권한 불필요.

## 1. 정확 버전 (npm registry, 스캐폴드 직전 재확인) · 세대 무변경

| 패키지 | 고정 버전 | 비고 |
|---|---|---|
| react / react-dom | **19.2.7** | POC 001 검증값. latest 19.2.8은 §5 release-age로 미채택 |
| @types/react / -dom | 19.2.17 / 19.2.3 | |
| typescript | 7.0.2 | Apache-2.0 |
| vite | 8.1.5 | |
| @vitejs/plugin-react | **6.0.3** | latest 6.0.4는 §5 release-age로 미채택 (optional peer는 §스펙009 VERIFIED) |
| tailwindcss / @tailwindcss/vite | 4.3.3 | |
| vitest | 4.1.10 | |
| @playwright/test / @axe-core/playwright | 1.61.1 / 4.12.1 | axe MPL-2.0(devDep) |
| @types/node | 24.13.3 | Node 24 major |

- **major 세대 무변경**(스펙 006/009 확정과 동일). react/react-dom·plugin-react는 patch 차이만 있었고, §5 사유로 POC 검증 patch(19.2.7/6.0.3)를 고정. 라이선스 전부 permissive.

## 2. 워크스페이스 구조

```
package.json           private · packageManager pnpm@11.15.1 · engines ">=24 <25" · 중앙 devDeps
.nvmrc                 24
pnpm-workspace.yaml    apps/* · packages/*   (minimumReleaseAgeExclude 없음, §5)
pnpm-lock.yaml         단일 lockfile
biome.json             linter preset=recommended + formatter (poc 미포함, 명시 경로로 스캔)
tsconfig.base.json     strict · bundler resolution · jsx react-jsx · noEmit · verbatimModuleSyntax
vitest.config.ts       packages/**/src/**/*.test.ts (node env)
playwright.config.ts   두 앱 vite preview(4183/4184) webServer
tests/e2e/scaffold.spec.ts
scripts/check.mjs       format→lint→typecheck→unit→build 집계
apps/mockup, apps/admin  Vite+React19+TS+Tailwind v4 최소 셸
packages/shared|firebase|spaces|render|ui  최소 경계·export
```

- 워크스페이스 인식: **2 apps + 5 packages = 7 프로젝트**(+루트 = 8 scope).

## 3. 패키지 경계 (계약)

- 내부 의존성은 `workspace:*` + 패키지명 import. **상대 `../packages/*/src` 침투 0**(grep 확인), 순환 의존 0.
- 방향: `apps/{mockup,admin} → @denn/ui, @denn/shared`. `@denn/firebase`·`@denn/render → @denn/shared`(허용 방향, `import type Result`). `@denn/shared`는 다른 @denn 미의존(루트).
- 책임(미구현 명시):
  - `@denn/shared`: `BRAND`, `APP_IDS`(distinct), `Result`, `Id` 타입만.
  - `@denn/ui`: 웜 토프 토큰 상수(`WARM_TAUPE`, accent-ink `#191A1D`) + `theme.css` **단일 원본**(두 앱이 import, 복제 없음) + `UI_CLASS`.
  - `@denn/firebase`: repository **port** 타입 + `FIREBASE_NOT_IMPLEMENTED`. SDK·network·config·env 없음.
  - `@denn/spaces`: `SpaceToken`/`SpaceSchemaVersion` 타입만. PBKDF2/AES 없음, 링크 호환 주장 없음.
  - `@denn/render`: `RenderInput`/`RenderOutput`/`RenderResult` 인터페이스만. Canvas 없음.
- 공유 패키지는 `window.*` 전역 미생성.

## 4. 두 앱 최소 셸

- 각 앱 독립 Vite entry·독립 build output(한 앱 빌드에 다른 앱 코드 미포함, dist grep 확인).
- React 19 `createRoot` + `StrictMode`, Router·Zustand 없이 단일 화면.
- 식별 정보만: Mockup "DENN PRODUCTS Mockup Rebuild"/"Scaffold ready", Admin "DENN PRODUCTS Admin Rebuild"/"Scaffold ready". 가짜 컨트롤 없음.
- `@denn/shared` 상수 + `@denn/ui/theme.css`를 실제 import해 경계를 빌드로 증명.
- 웜 토프 토큰: accent `#9F887A` 배경 badge 위 라벨 = accent-ink `#191A1D`(흰색 아님). 외부 폰트/이미지/CDN/네트워크 없음.

## 5. release-age 정책 재검증 (스펙 009 정책 적용)

- pnpm 11.15.1 기본 release-age 정책이 계속 작동(`pnpm config get minimumReleaseAge`=undefined이나 실제 cutoff≈now-24h).
- **스펙 009 때 필요했던 Biome 2.5.5 allowlist는 이제 불필요**: Biome 2.5.5(2026-07-21 08:01 배포)가 임계 기간을 지나 정상 설치됨 → allowlist 제거 확인.
- **최신 patch 회피로 allowlist 완전 제거**: react 19.2.8(2026-07-21 15:41)·@vitejs/plugin-react 6.0.4(2026-07-22 04:16)는 cutoff 안이라 latest 채택 시 allowlist 필요. 대신 **aged·POC 검증 patch**(react/react-dom 19.2.7=2026-06-01, plugin-react 6.0.3=2026-06-23)를 고정해 **`minimumReleaseAgeExclude` 없이 frozen install EXIT 0**.
- `minimumReleaseAge=0` **미사용**. 장기 release-age 기간 정책 **NOT DECIDED**. 다음 설치/업그레이드 시 재검증.

## 6. `.gitignore` 정상화

- 데이터 백업 보호 유지: `*.json`, `DENN-current-data-*.json`, `DENN-data-*.json`, `backup.json` 계속 무시(신규 데이터 JSON 차단).
- 설정 JSON 정상 추적(negation): `!package.json`, `!**/package.json`, `!tsconfig*.json`, `!**/tsconfig*.json`, `!biome.json`, `!**/biome.json` → **`git add -f` 불필요**.
- 빌드 산출물 무시: `node_modules/`, `**/dist/`, `coverage/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo`.
- 기존 추적 `firebase.json`·`.firebaserc`는 무변경·무untrack(검증: hash 동일). 신규 staged JSON 전수 검토 — 데이터 백업 JSON staged 0.

## 7. 게이트 결과 (Corepack pnpm, 로컬)

| 게이트 | 명령 | 결과 |
|---|---|---|
| frozen install | `pnpm install --frozen-lockfile` | ✅ EXIT 0, **lockfile diff 0** |
| format | `biome format …` | ✅ 0 |
| lint | `biome lint --error-on-warnings …` | ✅ 0 |
| typecheck | `tsc --noEmit`(7 프로젝트) | ✅ 0 |
| unit | `vitest run` | ✅ **4/4**(shared exports·distinct app id·웜토프 토큰·accent-ink=ink) |
| build | `vite build apps/mockup && vite build apps/admin` | ✅ 독립 빌드 |
| e2e | `playwright test` | ✅ **4/4**(2 앱 × 320/desktop) |
| check(집계) | `node scripts/check.mjs` | ✅ 0 |

- e2e 검증: 각 앱 title·h1·"Scaffold ready"·app-id, **교차 앱 텍스트 부재**, 320/desktop **overflow 0**, **console error 0**, **axe serious/critical 0**(color-contrast 포괄 제외 없음).

## 8. 번들 크기 (gzip)

| 앱 | JS(gzip) | CSS(gzip) | 예산 | 판정 |
|---|---:|---:|---|---|
| mockup(고객) | **60.16 KB** | 1.82 KB | JS 250 / CSS 75 | ✅ 여유 |
| admin(관리자) | **60.16 KB** | 1.82 KB | JS 350 / CSS 75 | ✅ 여유 |

## 9. 운영본 보존 (hash 무변경)

| 파일 | 결과 |
|---|---|
| denn-mockup-tool.html | UNCHANGED (`70d2b41…`) |
| denn-admin.html | UNCHANGED (`9190aba…`) |
| firebase.json | UNCHANGED (`0c2ac7f…`) |
| .firebaserc | UNCHANGED (`a1098a3…`) |
| firestore.rules | UNCHANGED (`50eaef8…`) |
| storage.rules | UNCHANGED (`b733b74…`) |

- 기존 POC `platform-compatibility`·`toolchain-workspace` diff 0. **Firebase deploy 미실행.** Router/Zustand/Radix/shadcn/firebase SDK 미설치. 소스 내 network/firebase/secret/외부 URL 0(dist의 Tailwind 라이선스 주석 URL 제외).

## 10. NOT APPLICABLE / 미검증 / 위험

- **Firebase/Rules 테스트 = NOT APPLICABLE — SDK/Rules 무변경.** (PASS로 꾸미지 않음)
- placeholder export는 초기 내부 계약이며 실제 구현이 아님. 패키지별 별도 빌드 계약은 후속 스펙.
- Hosting `public: "."` 상태에서 신규 소스가 루트에 존재 → **deploy 금지 유지**, Hosting public 격리는 별도 cutover 스펙.
- 실제 제품 기능·Firebase·암호화·Canvas 호환은 이번에 검증되지 않음.

## 11. 롤백

- 스펙 010 scaffold·handoff 커밋 역순 `git revert` 또는 `apps/`·`packages/`·루트 workspace 파일 제거. 운영본·Firebase 롤백 없음.
