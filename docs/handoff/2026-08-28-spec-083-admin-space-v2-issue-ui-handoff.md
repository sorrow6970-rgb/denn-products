# Spec 083 handoff - Admin Space V2 issue UI

## 현재 상태

- review baseline: `HEAD=origin=749b2f2`, ahead/behind 0/0
- completed: spec 082 `DONE / CODEX_PASSED`
- active: spec 083 `CORRECTION_REQUIRED`, fix round 2
- Founder: `OO-1=A`, Q-1=A
- next: `CLAUDE_SPEC_083_CORRECTION_ROUND_2`
- 전체 리빌드: **85~88% 완료 / 12~15% 잔여**.

## Codex 독립 재검수 — 보완 라운드 2 필요

- 라운드 1의 clipboard 동기 throw와 object URL leak 보완, auth expiry/unmount/late completion 추가는
  적합하다.
- non-Promise clipboard 반환은 문서상 fixed failure지만 실제 helper/unit은 `copied`로 처리한다.
- `App.tsx` compositionRef와 panel ownerRef는 개발 StrictMode effect replay에서 첫 cleanup이 dispose한
  같은 객체를 다시 쓴다. production-build manual unmount/remount는 새 component/ref라 동일한 증명이 아니다.
- 독립 check PASS(unit 2465/2465), spec 083 E2E 21/21 PASS. canonical 전체는 기존 spec080 mobile
  screenshot의 `preview-canvas` timeout으로 **181/182**이며 원인은 NOT PROVEN이다. 재시도하지 않았다.
- 상태 `CORRECTION_REQUIRED`, fix round 2. flaky 필수 gate 때문에 자동 루프는 STOP이며 사용자의 수동
  전달 뒤에만 `Automation/NEXT_CLAUDE_PROMPT.md` 상단 라운드 2를 수행한다.

## 이전 Codex 검수 — 보완 라운드 1 필요

- clipboard 동기 throw가 fixed failure UI로 닫히지 않는다.
- object URL 생성 뒤 `createImage()` throw 시 URL이 회수되지 않으며 Codex가 `revoked=[]`로 재현했다.
- spec 083 E2E에 auth expiry-equivalent와 unmount/late completion 실제 composition 경계가 빠졌다.
- 독립 check는 unit 2458/2458 PASS. canonical Chromium은 기존 고객 V2 320px Canvas timeout으로
  176/177이며 원인은 NOT PROVEN이다. timeout 증가·skip·고객 코드 수정 없이 보완 후 전체를 재검증한다.
- 다음 지시는 `Automation/NEXT_CLAUDE_PROMPT.md` 상단 correction round 1만 따른다.

## Claude Code가 구현할 것

`docs/rebuild/specs/083-admin-space-v2-issue-ui.md`만 구현 정본으로 사용한다.

- existing authenticated C5 `ready-clean` baseline에서만 draft 시작
- PNG-only local owner와 실제 Canvas preview
- 같은 frozen generation의 fields + exact PNG exporter
- 기존 default app/Auth 재사용, 별도 exact gate default false, writer first issue까지 lazy
- password pair, single-flight, safe status/error, outcome unknown 차단
- confirmed success에서만 same-origin `?space=<token>`, 명시 copy만
- synthetic unit/E2E와 시각 결과. actual Firebase/network/emulator/deploy는 0

UI/UX 구현은 Claude Code가 담당한다. 기존 Modern Studio light 제품 UI를 보존하고 새 디자인 시스템,
landing-page 장식, 신규 dependency를 도입하지 않는다.

## 계속 닫힌 경계

실제 UID, live project/bucket/data/network, Rules·Hosting deploy, 운영 발급, publish, orphan cleanup,
password 저장·URL/자동 clipboard 포함, auto retry/merge, V1 migration, C6/backend는 승인되지 않았다.

보호 대상과 기존 dirty 파일은 수정·복원·stage·commit하지 않는다. 전체 Chromium이 spec-018 PNG를 다시
쓰더라도 그대로 둔다.

## 전달 문구

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 083 Admin Space V2 발급 UI 범위만 구현·검증해. 실제 UI/UX 구현은 Claude Code가 담당하고, actual Firebase/network/emulator/deploy는 실행하지 마.
```

완료 후 제품 commit과 기록 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. Codex
독립 검수 전 다음 스펙을 시작하지 않는다.

## 구현 완료 — Claude Code (2026-08-28)

- `HEAD=origin=ba9eb48`에서 시작. 계약 `fbf60cc`, Q-1 기록 `977af5c`, 구현 `1a7cba9`.
- **Q-1=A**: `apps/admin/package.json` 1줄 + `pnpm-lock.yaml` 3줄만 추가(`corepack pnpm install
  --offline`, downloaded 0/added 0). `pnpm-workspace.yaml`은 sha256 그대로이고 stage/commit 0.
- 신규 제품 파일: `space-v2/issue-composition.ts`(gate·lazy writer·plan helper·link),
  `space-v2/browser-proof-draft.ts`(PNG-only owner), `space-v2/AdminSpaceV2IssuePanel.tsx`,
  `space-v2/admin-space-v2-issue.css`. 수정: `App.tsx`, `admin-composition/create.ts`,
  `admin-read/config.ts`, `env.d.ts`, `vite.e2e-fixture.config.ts`.
- 신규 검증: 세 unit 파일(+49 test), `tests/e2e/admin-space-v2-issue.spec.ts`(16), E2E fixture 2개,
  `docs/rebuild/results/spec-083/` desktop·mobile 스크린샷 2장(직접 확인함).
- **실측**: `node scripts/check.mjs` PASS(unit **2458/2458**, 92 파일), canonical E2E **Chromium
  177/177**, `git diff --check` PASS, 포트·temp 잔류 0, 실제 Firebase/network/emulator/deploy 0.
- **bundle**: 고객 entry 해시 무변경(`index-CRHkWFoL.js` 340.60 kB), admin entry 226.20 → 294.61 kB
  (gzip 71.75 → 91.35), admin CSS 9.14 → 10.80 kB, write facade는 lazy `space-write-*.js` 8.47 kB로
  분리 — write SDK eager 포함 없음.
- **⚠️ 스펙 밖 변경 1건**: `issue-candidate.test.ts`의 `not.toContain("space-v2")` 단언을
  `not.toContain("issue-candidate")`로 좁혔다. 스펙이 요구한 `App.tsx` 배선과 동시에 성립 불가한
  단언이고 test의 원래 의도는 유지된다. Codex 판단을 요청한다.
- 상태 `READY_FOR_CODEX`, fix_round **0**, next `CODEX_SPEC_083_REVIEW`. 다음 스펙은 시작하지 않았다.
- 전체 리빌드 진행도 **85~88% 완료 / 12~15% 잔여**.

## 보완 라운드 1 완료 — Claude Code (2026-08-31)

- 기준 `HEAD=origin=0622ad0`. Codex review 문서 `1d03bfc`, 제품 보완 `7ce9ab4`.
- 결함 1(clipboard 동기 throw): copy 결정을 `copyLinkToClipboard()`로 분리해 missing port·동기 throw·
  rejection·non-Promise 반환을 모두 fixed `copyFailed`로 닫았다. success/link 보존, raw error 미노출.
- 결함 2(object URL leak): URL 생성을 자기 단계로 분리해 이후 어떤 실패도 정확히 1회 revoke를 지난다.
- 추가 결함(보완 중 발견): 발급 중 auth 만료 시 definite auth 실패와 outcome-unknown 경고가 baseline
  문구에 가려졌다 → 이미 일어난 시도를 먼저 보고하도록 status 순서만 바꿨다.
- 신규 검증: unit +7(**2465/2465**), spec 083 E2E 16 → **21**(copy 3경계, auth 만료 2건, unmount +
  late completion, mount/unmount/mount 순환). 세 신규 검증은 **수정 전 소스에서 FAIL**을 확인했다.
- canonical `node scripts/e2e-run.mjs` **Chromium 182 passed / 0 failed**. Codex 라운드 1의 flaky
  `space-production-route` 320px는 이번 실행 ok(3.2s) — timeout 증가·skip·retry·고객 코드 수정 0.
- 허용 파일 밖 diff 0, package/lockfile/Rules/config diff 0, `App.tsx` 무변경, 실제 Firebase/network/
  emulator/deploy 0, 보호 PNG·기존 dirty stage/commit/restore 0.
- StrictMode dev 빌드 관찰(`App.tsx` compositionRef / panel ownerRef 재생성 없음)은 스펙 문서에 기록만
  하고 고치지 않았다 — Codex 판단을 요청한다.
- 상태 `READY_FOR_CODEX`, fix_round **1**, next `CODEX_SPEC_083_REVIEW_ROUND_2`.

## 보완 라운드 2 완료 — Claude Code (2026-08-31)

- 기준 `HEAD=origin=749b2f2`. Codex review 기록 `4d7f813`, 제품 보완 `1082f55`.
- 결함 1: `copyLinkToClipboard`가 non-Promise 반환을 `copied`로 보고했다 → **fulfil하는 thenable만**
  성공이고 missing/동기 throw/rejection/non-thenable/throw하는 `then`은 fixed `failed`다. 모순된 unit도
  기대값을 바로잡았다.
- 결함 2: composition(`App.tsx`)과 proof owner(panel)를 **한 mount 동안 살아 있는 record**로 바꿨다.
  cleanup은 unmounted 표시 후 다음 task에 release하고, StrictMode replay의 두 번째 setup이 취소한다.
- owned-record replacement(`useLocalImageBinding` 방식)는 **먼저 측정한 뒤 기각**했다: replacement 후에도
  stale subtree가 dispose된 write controller에 subscribe → `subscribe`가 auth observer를 다시 붙이고
  idempotent `dispose`는 이미 끝나 detach 불가 → **2 live / 0 detach**. 범위 밖 controller를 고치지 않고
  창 자체를 없애는 쪽을 택했다.
- 증명은 **실제 React 개발 빌드**다: fixture config가 같은 entry를 `NODE_ENV=development` define으로
  `dev/`에 한 번 더 빌드하고, fixture는 제품의 `useOwnedAdminComposition`으로 composition을 만든다.
  E2E는 `fixture-effect-setups === 2`를 먼저 단언해 production 번들이 통과할 수 없게 한 뒤 baseline
  load·PNG decode·Canvas preview·단일 issue와 auth observer `1:0:1`을 고정한다. 신규 dependency·설치 0.
- 재현 증명: 이전 소유권으로 되돌려 신규 E2E 2건 **FAIL**(`auth-blocked`) 확인.
- 실측: `check` PASS(unit **2466/2466**), canonical **Chromium 184 passed / 0 failed**. Codex 라운드 2의
  flaky spec080 mobile screenshot은 이번 실행 ok(216ms) — 우회·재시도·skip 0.
- `browser-proof-draft.ts` 무변경, package/lockfile/Rules/config·고객 앱·기존 spec 064~082 diff 0,
  실제 Firebase/network/emulator/deploy 0, 보호 PNG·기존 dirty stage/commit/restore 0.
- 상태 `READY_FOR_CODEX`, fix_round **2**, next `CODEX_SPEC_083_REVIEW_ROUND_3`.
