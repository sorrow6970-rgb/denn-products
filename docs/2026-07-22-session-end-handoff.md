# 2026-07-22 작업 종료 핸드오프 — 스펙 004~010 완료

> 브랜치 `rebuild/modern-studio`. 종료 HEAD **`<이 커밋 후 값>`**(직전 승인 HEAD `1d30a2c`). main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.
> 오늘 스펙 004~010이 전부 Codex **승인 가능**으로 종료. 다음 스펙·기능 구현은 **미착수(대기)**.

## 오늘 완료 (전부 Codex 승인)

| 스펙 | 내용 | 승인 기준 HEAD |
|---|---|---|
| 004 | 카라멜 앰버 팔레트 전환(POC) | `7406460` |
| 005 | 카라멜 앰버 실기기 표시 검증(4환경 PASS) | (승인) |
| 006 | 프런트엔드 기술 스택 최종 검토(읽기 전용) | (승인) |
| 007 | 웜 토프 팔레트 마이그레이션(POC) | `95c8445` |
| 008 | 웜 토프 실기기 표시 검증(4환경 PASS) | `4df8181` |
| 009 | TS7 린트(Biome+tsc) + 최소 pnpm workspace POC | `1f3e67d` |
| 010 | 실제 리빌드 모노레포 스캐폴드(2 apps + 5 packages) | `1d30a2c` |

## 확정 상태

- **디자인:** Modern Studio(B) 웜 토프 `#9F887A`/`#BAA598`/`#EEE8E1`, accent-ink `#191A1D`, 카카오 `#FEE500`. accent 위 일반 텍스트 = ink. 결정서 `decisions/2026-07-22-warm-taupe-palette.md`.
- **기술 스택(확정):** Node 24 LTS(`>=24 <25`, `.nvmrc`=24) · pnpm 11.15.1(Corepack, 단일 lockfile) · React 19.2.7 · Vite 8.1.5 · TypeScript 7.0.2 · Tailwind v4 · Biome 2.5.5(lint+format, `--error-on-warnings`)+`tsc --noEmit` · Vitest 4 · Playwright/axe. typescript-eslint는 TS7 미지원으로 미도입.
- **모노레포(스펙 010):** 루트 pnpm workspace + `apps/mockup`·`apps/admin` + `packages/shared|firebase|spaces|render|ui`(placeholder 골격). `@denn/ui/theme.css` = 웜 토프 토큰 단일 원본. 경계 `workspace:*`+export(상대 침투 0·순환 0). 게이트 전부 통과(frozen diff 0/format·lint·typecheck 0/unit 6/build 독립 gzip 60.16KB/e2e 4).
- **release-age:** pnpm 11 기본 정책 작동. aged patch 고정으로 `minimumReleaseAgeExclude` 불필요. `minimumReleaseAge=0` 미사용, 장기 정책 **NOT DECIDED**.

## 무변경·금지 (유지)

- 운영 HTML(`denn-mockup-tool.html`·`denn-admin.html`)·`firebase.json`·`.firebaserc`·`firestore.rules`·`storage.rules` **hash 무변경**. 기존 POC(`platform-compatibility`·`toolchain-workspace`) 무변경.
- **Hosting `public: "."` 상태 → 어떤 Firebase deploy도 금지**(Hosting 격리는 별도 cutover 스펙 전까지).
- Firebase SDK/연결·암호화·Canvas·카탈로그/주문/시안 기능·Router/Zustand/Radix/shadcn 미도입.

## 재개 방법 (다음 세션)

1. `CLAUDE.md` → `docs/rebuild/README.md` → `docs/codex-claude-handoff/CURRENT.md` 순서 읽기.
2. `git status`/HEAD/origin 동기화·clean 확인. 브랜치 `rebuild/modern-studio`.
3. 모노레포 게이트 재현: `poc`가 아닌 **루트**에서 `export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && corepack pnpm install --frozen-lockfile && corepack pnpm run check && corepack pnpm run test:e2e`.
4. Codex가 다음 스펙(기능 구현/Firebase 연결/Hosting 격리 등)을 작성할 때까지 **대기**. 임의 착수 금지.

## 다음 후보 (Codex 스펙 대기 — 미착수)

- `@denn/ui` 컴포넌트 확장 · `@denn/render` Canvas · `@denn/firebase` SDK 연결 · `@denn/spaces` 암호화 · 카탈로그/주문/시안 기능 이전 · Hosting public 격리·cutover·배포.
