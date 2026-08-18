# 스펙 045 — deploy-safe Hosting/admin route 로컬 패키징

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_DEPLOY**

## Founder 방향

- 사용자의 “다음 진행”을 스펙 044 권장 `K-2=A`로 해석한다.
- K-1 비용 정책과 K-3 actual cutover 전략은 미결정 상태로 유지한다.
- 실제 Firebase/preview/production 배포, UID, Rules, 운영 write flag는 열지 않는다.

## 목표

저장소 루트 `hosting.public: "."`를 직접 배포하지 않고, OS temp 아래 allowlist staging에 고객 Vite
build·admin Vite build·필수 legacy HTML 두 개만 조립한다. `/`, `/admin/`, legacy 두 파일의 로컬 route를
Chromium/HTTP로 검증하고 staging은 실행 후 정확히 삭제한다.

## 계약

1. staging은 `scripts/e2e-run.mjs`가 만든 실행별 OS temp 디렉터리 아래에만 존재한다.
2. 고객 build는 root에, admin build는 `/admin/`에 배치하고 admin asset base는 `/admin/`이다.
3. legacy 보존 파일은 `denn-admin.html`, `denn-mockup-tool.html` 정확히 두 개만 복사한다.
4. docs/tests/source/config/Rules/secret/backup/fixture HTML은 public artifact에 포함하지 않는다.
5. 조립 전 각 Vite output의 top-level은 `index.html`과 `assets/`만 허용한다.
6. temp candidate config는 `public: "public"`, `/admin` rewrite, HTML no-cache만 표현하며 실제
   `firebase.json`을 수정하거나 firebase CLI에 전달하지 않는다.
7. local preview server는 exact handle로 소유·종료하며 기존 포트를 재사용하거나 프로세스를 kill하지 않는다.

## 허용 파일

- `scripts/hosting-stage.mjs` + unit
- `scripts/e2e-run.mjs`, `scripts/e2e-preview.mjs`와 해당 unit의 최소 확장
- `tests/global-setup.ts`, `playwright.config.ts`
- 신규 Hosting route E2E
- 이 스펙/handoff/STATE/NEXT/CURRENT/live log

## 검증

- path guard, allowlist, collision, candidate config unit
- `/` 고객 rebuild, `/admin/` admin rebuild
- legacy 두 HTML은 HTTP로 존재 확인만 하고 브라우저 실행 0
- fixture/docs/tests/source/config/Rules가 public artifact에 0
- `pnpm check`, 전체 Chromium, 고객 hash 동일, diff-check, 포트/temp 잔류 0

## 금지

실제 `firebase.json`·Rules·package/lockfile 수정, Firebase CLI, preview/production deploy, 실제 network/UID,
운영 write flag·운영 쓰기·발행·delete, 보호 대상 stage/restore/commit.

### DONE (Codex)

- OS temp allowlist staging 조립기와 경로·빌드 산출물·legacy 파일 검증 unit을 구현했다.
- 고객 build는 `/`, `/admin/` base로 별도 생성한 admin build는 `/admin/`에 배치했다.
- 실제 `firebase.json` 대신 temp 내부 candidate config만 생성했고 Firebase CLI 호출은 0이다.
- Chromium에서 `/`, `/admin/`, legacy HTML 두 개의 HTTP 존재와 public top-level allowlist를 검증했다.
- 검증: targeted unit 18/18, `pnpm check` PASS(unit 1366/1366), Chromium 141/141,
  고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  `git diff --check` PASS, 포트 4183/4184/4185 및 OS temp 잔류 0.
- 실제 Firebase/network/UID/Rules·Hosting 배포/운영 write flag·운영 쓰기·발행·delete는
  NOT TESTED이며 계속 금지한다.
