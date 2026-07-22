# 2026-07-22 핸드오프 — 스펙 010 실제 리빌드 모노레포 스캐폴드 (Codex 재검증 대기)

> 실제 리빌드 골격: 루트 pnpm workspace + `apps/mockup`·`apps/admin` + `packages/shared|firebase|spaces|render|ui`. 단일 lockfile·공통 품질 게이트 아래 독립 빌드.
> 제품 기능·Firebase SDK/연결·암호화·Canvas·Router/Zustand/shadcn·배포 **없음**. 운영 HTML·Firebase config/Rules **hash 무변경**.
> 스펙 `docs/rebuild/specs/010-monorepo-scaffold.md`. 근거 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-monorepo-scaffold-report.md`. 기준 HEAD `64ca533`.

## 결론

- 루트 workspace(2 apps + 5 packages = 7)와 공통 게이트가 계약대로 생성되고 frozen install→E2E까지 전부 통과.
- 두 앱 독립 빌드(교차 코드 미포함), 웜 토프 토큰은 `@denn/ui/theme.css` 단일 원본.
- release-age allowlist **불필요**(aged patch 고정). 운영본·Firebase·기존 POC 무변경. Firebase deploy 미실행.

## 정확 버전 (세대 무변경)

react/react-dom **19.2.7** · @vitejs/plugin-react **6.0.3** · typescript 7.0.2 · vite 8.1.5 · tailwindcss/@tailwindcss/vite 4.3.3 · vitest 4.1.10 · @playwright/test 1.61.1 · @axe-core/playwright 4.12.1 · @types/node 24.13.3 · @types/react 19.2.17 · @types/react-dom 19.2.3 · @biomejs/biome 2.5.5. Node `>=24 <25`, `.nvmrc`=24, pnpm 11.15.1(Corepack).

> react/plugin-react는 latest(19.2.8/6.0.4)가 pnpm 기본 release-age cutoff 안이라, **POC 검증·aged patch(19.2.7/6.0.3)**를 고정해 `minimumReleaseAgeExclude` 없이 frozen install EXIT 0. `minimumReleaseAge=0` 미사용, 장기 정책 NOT DECIDED.

## 게이트 (로컬)

| 게이트 | 결과 |
|---|---|
| frozen install | ✅ EXIT 0, lockfile diff 0 |
| format / lint(`--error-on-warnings`) / typecheck | ✅ 0 |
| unit(vitest) | ✅ 4/4 |
| build(mockup·admin 독립) | ✅ mockup JS gzip 60.16KB / admin 60.16KB / CSS 1.82KB (예산 내) |
| e2e(playwright, 2 앱 × 320/desktop) | ✅ 4/4 (title·heading·status·교차앱 부재·overflow 0·console 0·axe serious 0) |
| check(집계) | ✅ 0 |

## 경계

- app→shared/ui는 `workspace:*`+패키지명 import(상대 src 침투 0, 순환 0). firebase/render→shared(허용). shared는 @denn 미의존.
- 각 패키지는 타입·상수·미구현 경계만 export(placeholder). `window.*` 전역 없음.
- Firebase/Rules 테스트 = **NOT APPLICABLE — SDK/Rules 무변경**(PASS로 꾸미지 않음).

## `.gitignore` 정상화

- 데이터 백업(`*.json`/`DENN-*`/`backup.json`) 계속 무시 + 설정 JSON negation(`!**/package.json`,`!**/tsconfig*.json`,`!biome.json`) → **`git add -f` 불필요**. 빌드 산출물 무시. firebase.json/.firebaserc 무변경·무untrack. 데이터 JSON staged 0.

## 커밋 구성 (분리)

1. **scaffold code/config:** 루트 설정 + `.gitignore` + apps/2 + packages/5 + tests + scripts + `pnpm-lock.yaml`.
2. **handoff/결과:** 보고서 · 이 문서 · `specs/010`(DONE) · `specs/README` · `CURRENT.md`.

## 운영본 보존 (hash)

denn-mockup-tool.html `70d2b41` · denn-admin.html `9190aba` · firebase.json `0c2ac7f` · .firebaserc `a1098a3` · firestore.rules `50eaef8` · storage.rules `b733b74` = 전부 **UNCHANGED**. 기존 POC 두 디렉터리 diff 0.

## 위험 / 롤백

- Hosting `public: "."`이라 신규 소스가 루트에 존재 → **deploy 금지 유지**(Hosting 격리는 별도 cutover 스펙). placeholder를 실제 구현으로 오해 금지.
- 롤백: 스펙 010 커밋 역순 `git revert` 또는 신규 디렉터리 제거. 운영본·Firebase 롤백 없음.

## Codex 재검증 요청

중점: (1) 신규 파일이 루트 apps/packages/workspace + 설정에만, POC/운영/legacy 무변경 (2) 정확 버전·세대 무변경·release-age allowlist 상태 (3) `git add -f` 없이 설정 JSON 추적·데이터 백업 무시 (4) 단일 lockfile·frozen diff 0 (5) 경계(workspace:*, 상대 침투 0, 순환 0) (6) 독립 빌드·예산 (7) e2e/axe·교차앱 격리 (8) 운영 HTML·Firebase config/Rules hash 무변경 (9) 배포 미실행.

## 계속 대기

- Firebase SDK 연결 · 암호화 · Canvas 렌더 · 카탈로그/주문/시안 기능 · Router/Zustand/shadcn · Hosting 격리·배포 — 각각 후속 스펙.
