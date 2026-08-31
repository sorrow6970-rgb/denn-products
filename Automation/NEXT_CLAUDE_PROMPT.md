# NEXT CLAUDE PROMPT

상태: `CODEX_PASSED` — 스펙 083 종료 문서 전용

- completed_unit: `spec-082-shared-canvas-plan-executor-boundary` — **DONE / CODEX_PASSED / LOCAL_VERIFIED / NON_UI / NO_LIVE_NETWORK**
- active_unit: `spec-083-admin-space-v2-issue-ui` — **CODEX_PASSED**, 승인 제품 `1082f55`.
- 기준: Codex 독립 재검수 `HEAD=origin=4f7bb20`, ahead/behind 0/0.
- next_transition: `CLAUDE_SPEC_083_CLOSURE`
- fix_round: `2`
- 전체 리빌드: **85~88% 완료 / 12~15% 잔여** (7개 roadmap 작업축 기반 관리 추정)

## 지금 수행할 작업 — 스펙 083 종료 문서만

제품 코드·test·fixture config·PNG·package/lockfile·Rules/config를 더 수정하거나 게이트를 다시 실행하지
않는다. 아래 6개 문서만 CODEX_PASSED와 실제 독립 gate 결과에 맞춰 종료한다.

- `docs/rebuild/specs/083-admin-space-v2-issue-ui.md`
- `docs/handoff/2026-08-28-spec-083-admin-space-v2-issue-ui-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

기록할 승인 근거:

- 승인 제품 commit `1082f55`, 현재 검수 포인터 `HEAD=origin=4f7bb20`, ahead/behind 0/0
- Codex 독립 `node scripts/check.mjs` PASS, unit **2466/2466**, build 2개
- Codex 독립 canonical Chromium **184/184 PASS**, 개발 StrictMode 2건과 spec 083 총 23건 포함
- `vite.e2e-fixture.config.ts`는 스펙이 이미 허용한 두 번째 E2E entry 조건에 해당하고 개발 bundle은
  staging 전용이다.
- 실제 Firebase/network/emulator/deploy·운영 발급은 **NOT TESTED / FORBIDDEN**

문서 전용 일반 fast-forward commit/push 후 스펙 083을
`DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`로 종료한다. 다음 스펙은 시작하지 않고
`WAITING_FOR_NEXT_MANUAL_TASK`에서 멈춘다. 보호 대상과 기존 Founder/user dirty는 restore/stage/commit하지
않는다.

Claude Code에 전달할 문구:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 CODEX_PASSED된 스펙 083 종료 문서만 동기화·commit·fast-forward push해. 제품 코드·test·fixture config·PNG를 더 수정하거나 검증을 재실행하지 말고, 다음 스펙은 시작하지 마.
```

---

## 이전 결과 — 스펙 083 보완 라운드 2 완료

**결함 1(non-Promise 반환).** `Promise.resolve(clipboard.write(link))`는 `undefined` 같은 계약 위반
반환을 **fulfilled Promise로 만들어** 아무도 하지 않은 복사를 `copied`로 보고했다. 이제 **fulfil하는
thenable만** 완료의 증거다 — 반환값을 받고, `then`이 함수인지(getter가 throw해도 닫히게) 확인한 뒤 그
`then`을 직접 호출한다. missing port · 동기 throw · rejection · non-thenable · throw하는 `then`/getter는
전부 fixed `failed`이며, "fails closed"라는 이름으로 `copied`를 기대하던 unit과 문서도 일치시켰다.

**결함 2(개발 StrictMode에서 dispose된 owner 재사용).** ref + cleanup dispose는 setup→cleanup→setup이
**같은 mount의 ref를 유지**하므로 두 번째 setup이 자기 cleanup이 dispose한 객체를 그대로 쓴다. 이제
composition(`App.tsx`)과 proof owner(panel) 각각이 **한 mount 동안 살아 있는 record**이고, cleanup은
unmounted 표시 후 **다음 task**에 release한다. replay의 두 번째 setup은 같은 task 안에서 이를 취소하고,
진짜 unmount는 취소하지 않는다.

**`useLocalImageBinding` replacement 방식을 쓰지 않은 근거(측정).** 먼저 그대로 구현해 실측한 결과 auth
observer가 **2 live / detach 0**이었다. replacement 이후에도 React가 stale subtree의 passive effect를
실행해 이미 dispose된 write controller에 subscribe하고, 그 `subscribe`가 auth observer를 다시 붙이는데
`dispose()`는 이미 실행돼 idempotent라 **영원히 detach되지 않는다**(해당 controller는 이번 라운드 허용
파일이 아니다). 살아 있는 객체 하나를 유지하면 그 창 자체가 없어진다. `useLayoutEffect` 대안도 attach
순서가 동일해 기각했다.

**실제 개발 StrictMode 증명(신규 dependency 0).** `vite.e2e-fixture.config.ts`가 **같은 fixture entry를
한 번 더**, `process.env.NODE_ENV`를 `"development"`로 define해 `dev/`에 빌드한다(`--mode development`
만으로는 NODE_ENV가 production이라 React dev 번들이 되지 않는 것을 실측했다). fixture는 composition을
**제품의 `useOwnedAdminComposition`으로** 만들므로 검증 대상은 `App.tsx`의 소유권 자체다. E2E는
`fixture-effect-setups === 2`를 먼저 단언해 production 번들이 통과할 수 없게 한 뒤, baseline load →
`ready-clean`, PNG decode + 실제 Canvas preview, freeze→password→issue **정확히 1회**, auth observer
`attached:detached:live = 1:0:1`, panel listener 2, object URL 1:0, 외부 request 0, console 0을 고정한다.
두 번째 E2E는 같은 개발 페이지에서 panel을 내렸다 올려 URL 1:1→2:1, listener 0→2, 중복 issue 0을 잡는다.

**재현 증명.** 라운드 2 이전 소유권으로 되돌려 신규 개발 StrictMode E2E 2건을 실행해 **둘 다
FAIL**(`fixture-write-status`가 `auth-blocked`)을 확인했다.

**실측(각 1회).** `node scripts/check.mjs` **PASS**(unit **2466/2466**, 92 파일, build 2개), canonical
`node scripts/e2e-run.mjs` **Chromium 184 passed / 0 failed**(기존 161 + spec 083 **23**). Codex 라운드
2에서 실패했던 `space-production-route` spec080 mobile screenshot은 이번 실행 **ok (216ms)** — timeout
증가·skip·retry·고객 코드 수정 **0**. `git diff --check` PASS, 포트 LISTENING 0, temp/`test-results`/
`debug.log` 잔류 0. 고객 entry `index-CRHkWFoL.js` **340.60 kB 해시 무변경**, admin entry 294.80 →
**295.32 kB**(gzip 91.54), admin CSS 10.80 kB 동일, lazy `space-write-*.js` **8.47 kB** 유지. 개발
StrictMode 번들은 **E2E staging(`dev/`)에만** 있고 제품 빌드·Hosting 산출물에는 없다.

**변경 범위.** `App.tsx`, `AdminSpaceV2IssuePanel.tsx`(+test), `e2e/space-v2-issue-fixture.tsx`,
`vite.e2e-fixture.config.ts`, `tests/e2e/admin-space-v2-issue.spec.ts`, 재생성된 spec-083 PNG 2장뿐이다.
`browser-proof-draft.ts`는 새 결함이 재현되지 않아 **무변경**이고, package/lockfile/Rules/config·고객
앱·기존 spec 064~082 제품/test diff는 **0**이다. 보호 spec-018 PNG 2개와 기존 Founder/user dirty는
stage/commit/restore **0**.

**⚠️ 범위 판단 1건(Codex 확인 요청).** 허용 목록(`App.tsx`·panel·spec 083 E2E fixture/test)에 더해
**`apps/admin/vite.e2e-fixture.config.ts` 한 파일**을 고쳤다. 근거는 (1) 지시 3항의 "실제 React 개발
StrictMode" 검증은 개발 번들 없이는 불가능하고, (2) 스펙 §대상 파일이 이 config를 "두 번째 entry가 실제로
필요할 때만 최소 변경"으로 이미 허용한다는 것이다. 변경은 같은 entry를 `dev/`에 한 번 더 빌드하는
플러그인 하나뿐이고 `scripts/e2e-run.mjs`·playwright config·preview 서버·제품 빌드는 무변경이다.

## 이전 다음 단계 — Codex 재검수 대기

상태 `READY_FOR_CODEX`, next `CODEX_SPEC_083_REVIEW_ROUND_3`. 다음 스펙, 실제 UID·live network·
emulator·Rules/Hosting deploy·운영 발급은 **자동으로 시작하지 않는다**.

> 직전 지시문(스펙 083 보완 라운드 2, 수행 완료 — 기록):

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 083 CORRECTION_REQUIRED 라운드 2만 구현·검증해. 실제 개발 StrictMode owner 재생성과 non-Promise clipboard fail-closed를 증명하고, canonical E2E가 다시 비결정적으로 실패하면 우회·재시도 없이 STOP해.
```

---

## 이전 이력 - 아래 내용은 현재 실행 지시가 아님

### 이전 지시 — 스펙 083 CORRECTION_REQUIRED 라운드 2 (수행 완료)

#### 지시 본문(기록)

자동 루프는 Codex canonical E2E의 비결정적 필수 gate 실패로 STOP 상태다. 사용자가 이 문구를 Claude
Code에 수동 전달한 경우에만 아래 보완을 시작한다.

1. `copyLinkToClipboard()`의 non-Promise 반환을 성공으로 표시하지 않는다. standard clipboard port의
   Promise/thenable 완료만 `copied`, missing port·동기 throw·rejection·non-Promise는 모두 fixed
   `failed`로 닫는다. 현재 모순된 unit 이름/기대값과 문서를 일치시킨다.
2. `App.tsx`의 `AdminOperatorComposition`과 `AdminSpaceV2IssuePanel`의 proof owner를 개발 StrictMode의
   effect setup→cleanup→setup 뒤에도 **live replacement**가 남는 ownership으로 바꾼다. cleanup은 이전
   객체를 정확히 한 번 dispose하고 observer/listener/object URL을 남기지 않아야 한다. 저장소의
   `useLocalImageBinding` owned-record 방식은 검증된 참고 사례지만 그대로 복사할지는 구현 근거로 결정한다.
3. production-build의 실제 unmount→새 mount를 StrictMode 증명이라고 부르지 않는다. 실제 React 개발
   StrictMode에서 composition과 proof owner가 dispose 뒤 재생성되고, baseline load·PNG decode·Canvas
   preview가 동작하며 중복 observer/listener/URL/write 0임을 검증한다. 신규 dependency·설치 없이 현재
   Vite/React/Playwright 표면으로 증명할 수 없으면 구현을 확장하지 말고 STOP한다.
4. 허용 제품 파일은 `apps/admin/src/App.tsx`와 필요한 기존 test, `AdminSpaceV2IssuePanel.tsx`와 해당 test,
   spec 083 E2E fixture/test의 최소 변경이다. `browser-proof-draft.ts`는 새 결함이 재현되지 않는 한 수정하지
   않는다. package/lockfile/Rules/config, 고객 앱, 기존 spec 064~082 source/test는 변경하지 않는다.
5. targeted 검증, `node scripts/check.mjs`, canonical `node scripts/e2e-run.mjs`를 각각 한 번 실행한다.
   기존 고객 V2 Canvas timeout이 다시 나면 재시도·timeout 증가·skip·고객 코드 수정 없이 STOP한다.

보완 코드와 기록은 모든 필수 gate가 green일 때만 별도 일반 fast-forward commit/push하고
`READY_FOR_CODEX`에서 멈춘다. 실제 Firebase/network/emulator/deploy와 다음 스펙은 시작하지 않는다.

Claude Code에 전달할 문구:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 083 CORRECTION_REQUIRED 라운드 2만 구현·검증해. 실제 개발 StrictMode owner 재생성과 non-Promise clipboard fail-closed를 증명하고, canonical E2E가 다시 비결정적으로 실패하면 우회·재시도 없이 STOP해.
```

---

## 이전 결과 — 스펙 083 보완 라운드 1 완료

**결함 1(clipboard 동기 throw).** 원인은 `.then(onOk, onErr)`가 **rejected Promise 하나만** 처리한다는
것이다. production port는 `write()` 안에서 `navigator.clipboard.writeText`를 읽으므로 capability가 없으면
Promise가 생기기 전에 throw하고 click handler를 탈출한다. copy 결정을 `copyLinkToClipboard(link,
clipboard)` 한 함수로 분리해 **missing port · 동기 throw · rejection · non-Promise 반환**을 모두 fixed
`copyFailed`로 닫았다. success와 link는 그대로 남고 raw error는 표시·log·rethrow 없이 버려진다.

**결함 2(post-URL throw에서 URL leak).** URL 생성과 `createImage()`가 같은 try에 있어 catch가 "revoke할
URL이 있는지"를 알 수 없었다. URL 생성을 **자기 단계**로 떼어내 이후 어떤 실패도 `revoke(url)`을
지나가게 했고, `live` Set 멤버십이 정확히 1회를 보장한다. state는 decode failure, drawable·frozen
handle은 0이다.

**추가 결함 1건(보완 중 발견, 같은 파일에서 닫음).** status 순서가 `!baselineReady`를 먼저 반환해서,
발급 중 auth가 만료되면 화면이 definite auth 실패 대신 "편집 기준을 …불러온 뒤에"를 보였고 같은 경로에서
**outcome-unknown 경고까지 덮였다**. 이미 일어난 시도를 먼저 보고하도록 순서만 바꿨다.

**재현 증명.** 신규 owner unit과 신규 E2E 2건을 **수정 전 소스**에 대해 실행해 각각 FAIL을 확인했다
(`revoked=[]` · copy-status 빈 문자열 · "편집 기준을 …" 문구). 검증이 결함을 실제로 잡는다.

**검증 공백 보완.** fixture의 synthetic writer가 composition이 넘긴 **실제 narrowed auth port**를 읽고
실제 auth observer가 signed-out을 publish한다. E2E로 (a) 만료+frozen draft(발급·writer 0), (b) 발급 중
만료 → late completion이 definite `SPACE_V2_ISSUE_AUTH_REQUIRED`, (c) 발급 중 unmount+session dispose →
URL created==revoked·listener 0·late completion 무영향·재mount 시 success/link 0, (d)
mount→unmount→mount 순환에서 중복 issue·URL·listener 0과 재mount panel owner 생존을 고정했다.

**실측.** `node scripts/check.mjs` **PASS**(unit **2465/2465**, 92 파일, build 2개), canonical
`node scripts/e2e-run.mjs` **Chromium 182 passed / 0 failed**(기존 161 + spec 083 **21**). Codex 라운드
1에서 실패했던 `space-production-route` "the V2 viewer fits a 320px viewport…"는 이번 실행 **ok (3.2s)**
— timeout 증가·skip·retry·고객 코드 수정은 **0**이다. `git diff --check` PASS, 포트 LISTENING 0,
temp/`test-results`/`debug.log` 잔류 0. 고객 entry `index-CRHkWFoL.js` **340.60 kB 해시 무변경**, admin
entry 294.61 → **294.80 kB**(gzip **91.35** 동일), lazy `space-write-*.js` **8.47 kB** 유지.

**변경 범위.** `AdminSpaceV2IssuePanel.tsx`(+test), `browser-proof-draft.ts`(+test), spec 083 E2E
fixture/test, 재생성된 spec-083 결과 PNG 2장뿐이다. `App.tsx`·package/lockfile/Rules/config·기존 spec
064~082 제품/test·고객 앱 diff **0**. 보호 spec-018 PNG 2개와 기존 Founder/user dirty는
stage/commit/restore **0**.

**⚠️ 관찰 1건 — Codex 판단 요청(고치지 않음).** `main.tsx`는 `<StrictMode>`이고, `App.tsx`의
`compositionRef.current ??= …` + cleanup `composition.dispose()`, panel의 `ownerRef.current ??= …` +
`owner.dispose()`는 같은 형태다. StrictMode의 mount→cleanup→mount는 같은 ref를 유지하므로 **개발
빌드에서는** 첫 cleanup 이후 composition(session 포함)과 proof owner가 재생성되지 않는다. E2E 번들은
production build라 재현·증명하지 못했고, panel만 고치면 `App.tsx`가 session을 이미 dispose한 상태여서
반쪽 수정이 된다. 이번 라운드 지시가 "필요하지 않으면 `App.tsx`를 변경하지 않는다"이므로 변경하지 않았다.

## 이전 다음 단계 — Codex 재검수 대기

상태 `READY_FOR_CODEX`, next `CODEX_SPEC_083_REVIEW_ROUND_2`. 다음 스펙, 실제 UID·live network·
emulator·Rules/Hosting deploy·운영 발급은 **자동으로 시작하지 않는다**.

> 직전 지시문(스펙 083 보완 라운드 1, 수행 완료 — 기록):

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 083 CORRECTION_REQUIRED 라운드 1만 구현·검증해. 실제 Firebase/network/emulator/deploy는 실행하지 말고, canonical E2E가 다시 비결정적으로 실패하면 우회하지 말고 STOP해.
```

---

## 이전 이력 - 아래 내용은 현재 실행 지시가 아님

### 이전 지시 — 스펙 083 CORRECTION_REQUIRED 라운드 1 (수행 완료)

#### 지시 본문(기록)

정본 `docs/rebuild/specs/083-admin-space-v2-issue-ui.md`의 Codex review 라운드 1을 읽고 아래만 보완한다.

1. `AdminSpaceV2IssuePanel`의 명시 copy가 missing clipboard, rejected Promise뿐 아니라
   **synchronous throw**도 fixed `copyFailed` 상태로 닫게 한다. success/link는 보존하고 raw error를
   노출하지 않는다. 동기 throw unit과 browser E2E를 추가한다.
2. `browser-proof-draft`에서 object URL 생성 뒤 `createImage()`가 throw해도 만든 URL을 정확히 한 번
   revoke한다. state는 fixed decode failure, drawable/frozen handle 0이어야 한다. 직접 unit으로 고정한다.
3. 스펙 E2E 6·targeted 10/12의 빠진 경계를 채운다: auth expiry-equivalent, issue 중 unmount/dispose와
   late completion, StrictMode/cleanup에서 duplicate issue·URL·listener 0. 기존 spec 081 session unit을
   단순 인용하지 말고 spec 083 composition/panel fixture가 실제로 연결되는 경계를 검증한다.
4. `issue-candidate.test.ts`의 현재 정밀화는 유지한다. 기존 고객 V2 320px E2E나 다른 spec 제품 코드를
   수정·timeout 증가·skip하지 않는다.
5. targeted unit/E2E, `node scripts/check.mjs`, canonical `node scripts/e2e-run.mjs`, diff/port/temp를 다시
   실행한다. canonical E2E가 다시 비결정적으로 실패하면 우회·재시도 반복 없이 STOP하고 정확한 출력만
   기록한다.

허용 제품 파일은 `AdminSpaceV2IssuePanel.tsx`와 해당 test, `browser-proof-draft.ts`와 해당 test,
spec 083 E2E fixture/test의 최소 변경뿐이다. 필요하지 않으면 `App.tsx`는 변경하지 않는다. package/
lockfile/Rules/config, 기존 spec 064~082 source/test, 고객 앱, 보호 대상은 변경하지 않는다.

제품 보완 commit과 기록 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. 실제
Firebase/network/emulator/deploy와 다음 스펙은 시작하지 않는다.

Claude Code에 전달할 문구:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 083 CORRECTION_REQUIRED 라운드 1만 구현·검증해. actual Firebase/network/emulator/deploy는 실행하지 말고, canonical E2E가 다시 비결정적으로 실패하면 우회하지 말고 STOP해.
```

---

## 이전 결과 — 스펙 083 구현 완료, Codex 검수 전 기록

**Q-1=A는 최소로만 썼다.** `apps/admin/package.json` **1줄** + `pnpm-lock.yaml` importer **3줄**.
`corepack pnpm install --offline --ignore-scripts` 실측 `downloaded 0, added 0`이라 신규 외부
의존성·다운로드·설치 source는 **0**이고, 사용자 dirty `pnpm-workspace.yaml`은 **sha256 그대로**이며
stage/commit하지 않았다.

**핵심은 "본 것이 발급된다"를 구조로 만든 것.** 명시적 `시안 고정`이 catalog snapshot·selection·
파생 orientation·측정된 logical width·색상·정규화 transform·PNG bytes·render plan을 **한 generation**에
묶고, 화면의 preview와 발급 source가 같은 generation을 쓴다. 이후 resize·새 baseline·디스크에서 바뀐
파일은 발급 내용에 닿지 못한다.

**gate와 lazy writer.** exact `"true"` + 완전한 config + write gate 3중이라 기본 빌드는 panel·proof
owner·adapter를 **하나도** 만들지 않는다. writer는 첫 valid issue에서만 `@denn/firebase/space-write`를
dynamic import한다 — 빌드 산출물에서 `space-write-*.js` **8.47 kB** 별도 lazy chunk로 확인된다.

**PNG owner.** MIME·확장자를 신뢰 근거로 쓰지 않는다. bytes를 한 번 복사해 **이 모듈이 고정한**
`image/png` Blob으로 감싸고 브라우저 decode가 판정한다. 파일명·blob URL·Blob·원본 MIME는 closure를
벗어나지 않고, object URL revoke는 **정확히 1회**다(첫 구현의 이중 revoke를 자체 test가 잡았다).

**plan 동등성.** admin은 `apps/mockup`을 import할 수 없어 얇은 helper를 따로 두었으므로, customer의
실제 composition에 같은 evidence를 넣어 **command JSON exact equality**를 6개 케이스에서 단언한다.
어긋나면 발급을 열지 않는다.

**실측.** `node scripts/check.mjs` PASS(unit **2458/2458**, 92 파일), canonical `pnpm run test:e2e`
**Chromium 177/177**(기존 161 + 신규 16), `git diff --check` PASS, 포트·temp 잔류 0, 실제
Firebase/network/emulator/deploy **0**. 고객 entry 해시 무변경(`index-CRHkWFoL.js` 340.60 kB),
admin entry 226.20 → **294.61 kB**(gzip 71.75 → **91.35**), admin CSS 9.14 → **10.80 kB**.
desktop/mobile 시각 결과는 `docs/rebuild/results/spec-083/`에 있고 직접 확인했다.

**⚠️ 스펙 밖 변경 1건 — Codex 판단 요청.** `apps/admin/src/space-v2/issue-candidate.test.ts`의
`expect(app).not.toContain("space-v2")` 한 줄을 `not.toContain("issue-candidate")`로 좁혔다. 스펙 083은
panel을 `App.tsx`에 조합하도록 **요구**하는데 import 경로가 `./space-v2/…`라 그 단언과 동시에 성립할 수
없다. test의 원래 의도(spec 065 candidate projector 미배선)는 유지되고 나머지 단언도 그대로다. 이 한 줄
외에 spec 064~082 제품/test 변경은 0이다.

## 다음 단계 — Codex 재검수 대기

스펙 083 구현은 `READY_FOR_CODEX`에서 멈춘다. 다음 단위는 Codex 재검수 결과와 사용자 지시가 정한다.
실제 UID·live network·emulator·Rules/Hosting deploy·운영 발급은 시작하지 않았다.

> 직전 지시문(스펙 083 구현, 수행 완료 — 기록):

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 083 Admin Space V2 발급 UI 범위만 구현·검증해. 실제 UI/UX 구현은 Claude Code가 담당하고, actual Firebase/network/emulator/deploy는 실행하지 마.
```

## 지금 수행할 작업 - 스펙 083만

정본 `docs/rebuild/specs/083-admin-space-v2-issue-ui.md`를 처음부터 끝까지 읽고 그 허용 범위만
구현·검증한다. 실제 UI/UX 구현은 Claude Code가 담당한다.

핵심 범위:

- C5 `ready-clean` baseline에서만 Space V2 draft를 시작한다.
- PNG-only local proof owner와 실제 Canvas preview를 같은 frozen generation에 묶는다.
- 별도 exact env gate는 default false, 기존 default Firebase app/Auth를 재사용하며 writer는 첫 valid
  issue action까지 lazy다.
- password는 두 입력 일치만 검사하고 즉시 지운다. confirmed success에서만 same-origin
  `?space=<token>`을 표시하고 명시 copy만 허용한다.
- synthetic unit/E2E와 desktop/mobile 시각 결과를 남긴다. actual Firebase/network/emulator/deploy는
  실행하지 않는다.

제품 commit과 기록 commit을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`에서 멈춘다. 다음 스펙은
시작하지 않는다.

Claude Code에 전달할 문구:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 083 Admin Space V2 발급 UI 범위만 구현·검증해. 실제 UI/UX 구현은 Claude Code가 담당하고, actual Firebase/network/emulator/deploy는 실행하지 마.
```

## 계속 금지

실제 UID 추측, live project/bucket/data/network, emulator, Rules·Hosting deploy, 운영 발급, publish,
orphan delete/cleanup, password 저장·URL/자동 clipboard 포함, auto retry/merge, C6/backend, V1 migration,
신규 dependency/download/install, package/lockfile 변경과 보호 대상 변경은 0이다.

---

## 이전 이력 - 아래 내용은 현재 실행 지시가 아님

## 현재 결과 — 스펙 082 종료 문서 반영 완료

Codex `CODEX_PASSED` 판정에 따라 **문서 6개만** 종료 상태로 갱신했다 — 스펙 082 DONE, 2026-08-27
핸드오프, `DENN_AUTOMATION_STATE.md`, 이 파일, `CURRENT.md`, 라이브 로그.

제품 코드·test·`package.json`/lockfile·Rules/config는 **수정·stage·restore 0**이고, 게이트도 다시
돌리지 않았다 — 승인 근거는 Codex 독립 실행 결과(`pnpm run check` PASS · unit **2409/2409** · canonical
Chromium E2E **161/161**, `admin-auth-read` 5/5 포함)다. 보호 spec-018 PNG 2개와 기존 Founder/user dirty
변경은 그대로 두었다. 문서 전용 commit을 fast-forward push하고 `HEAD=origin`, ahead/behind 0/0을
확인했다.

## 다음 단계 — 사용자 지시 대기

상태 `WAITING_FOR_NEXT_MANUAL_TASK`, next `FOUNDER_NEXT_MANUAL_TASK`. 다음 스펙, 실제 admin issue UI,
자동화는 **자동으로 시작하지 않는다**. 다음 단위는 사용자의 명시적 지시 또는 Codex가 작성·push한 신규
스펙이 정한다.

> 직전 지시문(스펙 082 종료 문서, 수행 완료 — 기록):

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 082 CODEX_PASSED 종료 문서만 처리해.
```


## Codex 독립 재검수 — CODEX_PASSED

- 라운드 7 diff는 `tests/e2e/admin-auth-read.spec.ts` 한 파일뿐이다. runtime static Firebase SDK import는
  더는 claim되지 않고, type-only static import와 기존 dynamic/type-query 경계만 허용된다.
- 독립 `pnpm run check` PASS: format/lint/typecheck, unit **2409/2409**, build 2개.
- 독립 canonical `pnpm run test:e2e`: Chromium **161 passed / 0 failed**. `admin-auth-read` 5/5 포함.
- apps/packages/package/lockfile/Rules/config diff 0, `git diff --check` PASS, 포트·temp 잔류 0.
- 추가 결함 0. 실제 admin issue UI·live network·deploy는 여전히 시작하지 않는다.

## Claude Code 다음 작업 — 스펙 082 종료 문서만

다음 6개 문서만 실제 `CODEX_PASSED` 종료 상태로 최소 갱신한다.

- `docs/rebuild/specs/082-shared-canvas-plan-executor-boundary.md`
- `docs/handoff/2026-08-27-spec-082-shared-canvas-plan-executor-boundary-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

제품 코드·test·package/lockfile·Rules/config·보호 대상은 수정/stage/restore하지 않는다. 문서만 일반
fast-forward commit/push하고 `HEAD=origin`, ahead/behind 0/0을 확인한다. 상태는
`WAITING_FOR_NEXT_MANUAL_TASK`, next transition은 `FOUNDER_NEXT_MANUAL_TASK`로 두고 다음 스펙을 자동
시작하지 않는다.

Claude Code에 전달할 문구:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 082 CODEX_PASSED 종료 문서만 처리해.
```

## 현재 결과 — 보완 라운드 7 완료(NN-6=A 예외), static SDK import는 type-only

NN-6=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 source·승인된
read-only Storage 연결·`package.json`/lockfile은 **무변경**이다.

**Codex 지적은 옳고, 라운드 6 reader로 그대로 재현했다.** 라운드 6은 모든 `firebase/*` specifier를 먼저
수집해 claim을 요구했지만, `import { ... } from "firebase/x"`와 `import type { ... }`를 **같은 허용
형태**로 셌다. 같은 입력에 라운드 6 reader를 돌리면 `import { getStorage } from "firebase/storage"`는
`unaccounted=[]`로 통과하고, 기존 dynamic facade가 `getStorage`를 aggregate 승인 Set에 이미 넣으므로
module/member equality도 움직이지 않는다.

**보완 — static은 `import type`만 claim한다.** `import type { ... }`는 런타임 전에 지워져 아무것도
건드리지 않으므로 유일한 허용 static 형태로 남고, **런타임 named import·default·namespace·side-effect
import**와 **statement가 살아남는 inline `{ type X }` clause**는 claim되지 않아 `unaccounted`로 보고된다.
type query와 이름에 bound된 dynamic import는 라운드 6 그대로다. 이유는 표기 취향이 아니라 계약이다 —
스펙 079 §4는 SDK를 dynamic import로, 스펙 080 §3은 V2 dependency를 lazy·module import 시
app/service/network 시작 0으로 계약한다. eager static import는 같은 읽기의 다른 표기가 아니라 다른
능력이다.

**before/after 실측(같은 입력, 라운드 6 reader).** runtime named import는 통과했고, inline type
modifier와 default import는 라운드 6에서도 이미 보고됐다 — 공백은 Codex가 지목한 **정확히 그 하나**다.
저장소 전체 source에 static `firebase/*` import는 **0건**(전부 dynamic import·type query)이므로 제품
회귀 수정이 아니고, 라운드 6의 admin write surface 이빨 측정(`firebase/auth` 미승인 + 승인 밖 멤버
11개)도 그대로 유효하다.

**self-check.** negative 3종(runtime named · inline type modifier · default)과
`import type { FirebaseApp } from "firebase/app"`를 `FirebaseApp`로 실제로 읽어내는 positive를 넣었고,
승인된 `Promise.all` dynamic 형태가 `getStorage`/`ref`/`getBytes`를 읽는 기존 positive도 유지된다.

**실측.** `admin-auth-read` **5/5**, **전체 Chromium E2E 161/161**, 전체 `node scripts/check.mjs`
PASS(unit **2409/2409**, 89 파일), **통제 빌드 대조 산출물 16개 byte+SHA-256 동일**,
`package.json`/lockfile diff **0**, `git diff --check` PASS, 변경 경로 한 파일뿐, EOL clean,
포트·temp 잔류 0. 테스트 삭제·skip·E2E 예외 0.

## 다음 단계 — Codex 재검수 대기

스펙 082는 NN-6=A 예외 라운드까지 끝났고 `READY_FOR_CODEX`에서 멈춘다. 다음 단위는 Codex 재검수
결과와 사용자 지시가 정한다. 실제 admin issue UI, 다음 스펙, 자동화는 시작하지 않았다.

> 직전 지시문(스펙 082 보완 라운드 7, 수행 완료 — 기록):

```text
NN-6=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 7 예외만 수행해.
```


## Codex 재검수 — CORRECTION_REQUIRED / 예외 소진

라운드 6은 모든 `firebase/*` specifier를 먼저 수집해 re-export·unbound dynamic import·namespace escape를
닫았다. 그러나 static named import와 type-only import를 같은 허용 형태로 처리한다.

```ts
import { getStorage } from "firebase/storage";
```

이 런타임 정적 import는 claim되고 `getStorage`가 승인 member Set에 추가된다. 기존 dynamic facade가 이미
같은 member를 채우므로 aggregate equality도 변하지 않아 검사를 통과한다. 이는 스펙 079의 Firebase SDK
dynamic import와 스펙 080의 lazy dependency/module-import inert 계약을 깨뜨릴 수 있다. 현재 제품 source는
dynamic import와 type query를 사용하므로 현 제품 회귀는 아니며, 향후 eager bundling을 허용하는 가드
계약 결함이다.

### Founder NN-6

- **A (권장):** `tests/e2e/admin-auth-read.spec.ts` 한 파일의 correction round 7 예외를 승인한다.
  static Firebase import는 `import type { ... }`만 허용하고 런타임 `import { ... }`는 unaccounted/fail로
  고정한다. 최소 self-check는 runtime static named import 실패, type-only static import 성공,
  현재 `Promise.all` dynamic import 성공을 포함한다. 제품 source·package/lockfile은 변경하지 않는다.
- **B:** 알려진 eager Firebase SDK import 검출 공백을 수용한다. 비권장이다.

NN-6 결정 전 Claude Code는 코드·test·문서·commit·push를 시작하지 않는다. 실제 admin issue UI와 다음
스펙도 시작하지 않는다.

> NN-6=A 승인 후 Claude Code에 전달할 지시문:

```text
NN-6=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 7 예외만 수행해.
```

## 현재 결과 — 보완 라운드 6 완료(NN-5=A 예외), 구문이 아니라 모듈에서 출발

NN-5=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드·승인된
read-only Storage 연결·`package.json`/lockfile은 **무변경**이다.

**Codex 지적은 옳다.** 라운드 5의 reader는 **구문에서 출발해 아는 형태를 찾았다**. 그래서 자신이 훑지
않는 형태로 들어온 모듈은 **애초에 보이지 않았다** — `export * from "firebase/storage"`는 순회가
`ImportKeyword`를 키로 삼아 export declaration을 훑지 않았고, `return import("firebase/storage")`는 dot
없는 dynamic import라 1차 순회에서 skip되고 변수 선언이 아니라 2차 순회에도 안 들어왔다. 둘 다
`reached`/`unaccounted`를 안 바꾸고 금지 이름도 없으며 facade가 승인 집합을 이미 채워 **파일 전체가
통과**했다.

**보완 — 모듈에서 출발한다.** 파일의 모든 `firebase/*` specifier를 **먼저 수집**하고, 각각이 reader가
이해하고 경계가 허용하는 형태에 **claim되어야** 한다. 허용 형태는 셋뿐이다 —
① `import { ... } from "firebase/x"`(`import type` 포함) ② type query `import("firebase/x").Member`
③ 이름에 bound된 dynamic import(그 이름의 멤버 읽기까지 검사). **claim되지 않은 specifier는 보고된다.**

그래서 침입 경로는 "허용 형태가 아니라서" 실패하고 **누가 그 형태를 미리 떠올릴 필요가 없다**. star
re-export · named re-export · namespace import · side-effect import · unbound dynamic import가 새 규칙
다섯 개가 아니라 **규칙 하나**로 전부 막힌다. 정당한 새 형태도 같은 방식으로 실패하는데 그건 **의도한
비용**이다 — 고치는 방법은 "그 형태가 여기 허용되는가"를 사람이 결정하는 것이다.

**before/after 실측**(라운드 5 reader를 그대로 돌림): star re-export · named re-export · returned
dynamic import는 **`unaccounted=[]`로 통과**했고, 라운드 6은 **다섯 우회 전부 검출**한다.

**self-check**에 그 다섯 + computed member + namespace를 값으로 전달 = **실패 보고 7종**을 넣었고,
**positive**로 승인된 `Promise.all` 형태가 `getStorage`/`ref`/`getBytes`로 **실제로 읽히는지**까지
단언한다(이게 없으면 reader가 아무것도 못 읽어도 통과한다).

**이빨 재실측 — 배포되는 reader 자체를 실제 코드에 겨눔.** 고객 66파일: 세 모듈 전부 승인 집합과
일치, unaccounted **0**, 금지 이름 **0**. admin write 35파일: `firebase/auth`를 승인 안 된 모듈로,
승인 밖 멤버 **11개**(`uploadBytes`·`setDoc`·`getAuth`·`signInWithEmailAndPassword` 등)를 검출하고 금지
`uploadBytes`도 잡는다. **두 surface 101개 실제 파일에서 unaccounted 0**.

**실측.** `admin-auth-read` **5/5**, **전체 Chromium E2E 161/161**, 전체 `node scripts/check.mjs`
PASS(unit **2409/2409**, 89 파일), **통제 빌드 대조 산출물 16개 byte+SHA-256 동일**,
`package.json`/lockfile diff **0**, `git diff --check` PASS, 변경 경로 한 파일뿐, EOL clean,
포트·temp 잔류 0. 테스트 삭제·skip·E2E 예외 0.

## 다음 단계 — Codex 재검수 대기

스펙 082는 NN-5=A 예외 라운드까지 끝났고 `READY_FOR_CODEX`에서 멈춘다. 다음 단위는 Codex 재검수
결과와 사용자 지시가 정한다. 실제 admin issue UI, 다음 스펙, 자동화는 시작하지 않았다.

> 직전 지시문(스펙 082 보완 라운드 6, 수행 완료 — 기록):

```text
NN-5=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 6 예외만 수행해.
```


## Codex 재검수 — CORRECTION_REQUIRED / 예외 소진

compiler scanner는 destructuring을 닫았지만 SDK module occurrence를 전부 설명하지 못한다.

```ts
export * from "firebase/storage";

function leak() {
  return import("firebase/storage");
}
```

`sdkUsage()`는 `ImportKeyword`와 변수 선언만 처리한다. 첫 코드는 `ExportKeyword`라 무시되고, 둘째는
dot 없는 dynamic import를 첫 순회에서 건너뛴 뒤 변수 선언 순회에도 들어가지 않는다. 두 코드 모두
`reached`와 `unaccounted`를 바꾸지 않으며 금지 API 이름도 직접 포함하지 않는다. 기존 facade가 승인
집합을 이미 채우므로 aggregate equality 검사는 통과한다.

따라서 closed allowlist와 "설명 못 한 형태는 모두 실패"는 **NOT PROVEN**이다. NN-3/NN-4 예외를 모두
사용했으므로 Claude Code는 Founder 결정 전에 코드·test·문서·commit·push를 시작하지 않는다.

### Founder NN-5

- **A (권장):** correction round 6 예외를 한 번 승인한다. 허용 제품 파일은
  `tests/e2e/admin-auth-read.spec.ts` 하나뿐이다. full TypeScript AST 또는 exact facade allowlist로
  scanned package의 모든 `firebase/*` import declaration, export declaration, import type, dynamic import를
  먼저 열거한다. `export *`, 직접 re-export, unbound/returned dynamic import와 namespace escape는 전부
  fail-closed여야 한다. 위 두 우회와 `export { getBytes } from "firebase/storage"` self-check를 추가한다.
  제품 코드·read-only Storage 연결·package/lockfile은 변경하지 않는다.
- **B:** 알려진 SDK re-export/escape 검출 공백을 수용한다. 비권장이다.

> NN-5=A 승인 후 Claude Code에 전달할 지시문:

```text
NN-5=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 6 예외만 수행해.
```

## 현재 결과 — 보완 라운드 5 완료(NN-4=A 예외), regex를 버리고 compiler scanner로

NN-4=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드·승인된
read-only Storage 연결·**신규 의존성은 0**이다(`typescript` 7.0.2는 이미 root devDependency).

**Codex 지적은 옳고 반복의 원인도 옳게 짚었다.** 라운드 1~4는 regex로 형태를 하나씩 막아 왔다 —
호출 → alias → property → named import — 그리고 다섯 번째(`const { list: l } = storage`)가 또 나왔다.
**형태 목록이 아니라 방법이 문제였다**: regex는 구문을 못 보니 매 라운드가 "다음에 누가 뭘 쓸까"라는
추측이었고 네 번 틀렸다.

**보완 — 컴파일러처럼 읽는다.** 저장소의 TypeScript scanner로 토큰화하고 질문 두 개로 대체한다.

**① 각 SDK 모듈이 실제로 무엇을 건네는가 — 모듈별 allowlist와 정확히 일치해야 한다.**
`firebase/app`={FirebaseApp,getApp,getApps,initializeApp} · `firebase/firestore`={doc,getDoc,
getFirestore} · `firebase/storage`={connectStorageEmulator,getBytes,getMetadata,getStorage,ref}.
**양방향**이라 목록 밖(=금지 목록에 없던 능력 포함)도, 목록이 비는 것도 실패한다. 그리고 reader가
**설명 못 하는 형태**(computed member, namespace를 값으로 전달, 모듈과 짝지을 수 없는 binding)는
**침묵이 아니라 실패**로 보고된다 — 이게 allowlist를 닫힌 집합으로 만든다.

**② 금지 이름이 어떤 구문 위치에서든 도달 가능한가** — property · string member · **braced clause**.
clause 하나가 destructuring·named import·re-export alias를 함께 덮는다(셋 다 `:`/`as` 왼쪽에서 이름을
취하므로). `list` bare identifier 면제는 유지되고 비용은 여전히 0이다.

**scanner 정확성.** `/`와 template substitution을 닫는 `}`를 parser처럼 재스캔한다. 후자를 빼면
scanner가 파일 나머지를 template 텍스트로 삼킨다(실측 35,701 → 49,364 토큰). 전진이 멈추면 throw한다.

**이빨 실측 — 합성이 아니라 실제 코드.** 같은 reader를 admin write surface(35파일)에 겨누면
`firebase/auth`를 승인 안 된 모듈로, 승인 밖 멤버 **11개**(`uploadBytes`·`setDoc`·`getAuth`·
`signInWithEmailAndPassword` 등)를 검출하고 금지 이름 `uploadBytes`도 잡는다. 고객 surface 66파일은
설명 못 한 형태 0 · allowlist 밖 0 · 금지 이름 0 — 두 surface 합쳐 실제 101파일을 모두 설명했다.

**실측.** `admin-auth-read` **5/5**, **전체 Chromium E2E 161/161**, 전체 `node scripts/check.mjs`
PASS(unit **2409/2409**, 89 파일), **통제 빌드 대조 산출물 16개 byte+SHA-256 동일**,
`git diff --check` PASS, 변경 경로 한 파일뿐, EOL clean, 포트·temp 잔류 0. 테스트 삭제·skip·E2E 예외 0.

## 다음 단계 — Codex 재검수 대기

스펙 082는 NN-4=A 예외 라운드까지 끝났고 `READY_FOR_CODEX`에서 멈춘다. 다음 단위는 Codex 재검수
결과와 사용자 지시가 정한다. 실제 admin issue UI, 다음 스펙, 자동화는 시작하지 않았다.

> 직전 지시문(스펙 082 보완 라운드 5, 수행 완료 — 기록):

```text
NN-4=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 5 예외만 수행해.
```


## Codex 재검수 — CORRECTION_REQUIRED / NN-3 예외 소진

라운드 4는 named import/re-export alias를 닫았지만 namespace destructuring을 놓친다.

```ts
const { list: l } = storage;
l(ref);

const { list } = storage;
list(ref);
```

두 입력은 `importedNames()`에 해당하지 않고 `.list` 또는 `["list"]`도 포함하지 않는다. 현
`forbiddenStorageUse()`와 동일한 합성 측정에서 둘 다 `Detected=False`다. 따라서 "모든 실제 도달
방법"과 "어떤 형태로도 reachable하지 않음"이라는 현재 설명은 **NOT PROVEN**이다.

NN-3=A 예외 라운드를 이미 사용했으므로 Claude Code는 Founder 결정 전 코드·test·문서·commit·push를
시작하지 않는다.

### Founder NN-4

- **A (권장):** correction round 5 예외를 한 번 승인한다. 허용 제품 파일은
  `tests/e2e/admin-auth-read.spec.ts` 하나뿐이다. 새 regex 한두 개로 사례만 봉합하지 말고, 저장소에 이미
  있는 TypeScript parser 또는 exact `proof-sdk-facade.ts` allowlist 방식으로 SDK namespace의 property,
  element access, destructuring과 named import/re-export를 구조적으로 검사한다. ordinary local `list`와
  비-Storage `templateList as list`는 계속 허용한다. 제품 코드와 read-only Storage 연결은 변경하지 않는다.
- **B:** 알려진 namespace destructuring 검출 공백을 수용한다. 비권장이다.

> NN-4=A 승인 후 Claude Code에 전달할 지시문:

```text
NN-4=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 5 예외만 수행해.
```

## 현재 결과 — 보완 라운드 4 완료(NN-3=A 예외), 전체 E2E 161/161

NN-3=A가 승인한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드와 승인된
read-only Storage 연결은 한 줄도 바꾸지 않았다.

**Codex 지적은 옳다.** 라운드 3은 `list`의 bare-identifier 검사를 생략하면서 근거를 "앱이
`firebase/*`를 직접 import하지 않으므로 Storage `list`는 namespace property로만 도달한다"로 댔다. 그
논증에 구멍이 있었다 — 허용된 `@denn/firebase` 루트가 `list`를 re-export하면 named alias로 도달하고,
`import { list as l } from "@denn/firebase"`는 property·bracket 어느 형태에도 맞지 않는다. 라운드 3
regex 재현 측정: **round 3 = false, round 4 = true**.

**보완.** 면제 자체는 유지한다 — 지역 변수 `list`와 `template-list` test id는 정당한 앱 코드다. 대신
**모듈 경계에서 따로 막는다**: 신규 `importedNames()`가 `import {...} from`·`export {...} from` 절에서
`as` **왼쪽** 이름만 모은다. 왼쪽이 모듈에서 나오는 이름이므로 `import { list as l }`은 Storage
`list`이고 `import { templateList as list }`는 그냥 지역 `list`다. 금지 **10종 전부**와 **모든
모듈**(SDK·허용 루트 공통)에 적용되므로 향후 re-export는 생기는 날 잡힌다.

**드리프트 차단.** `forbiddenStorageUse()` 단일 predicate가 named binding과 reference 세 형태를 함께
판정하고 self-check와 surface 스캔이 같은 함수를 쓴다. 라운드 3처럼 self-check가 실제 검사와 어긋나는
일이 구조적으로 불가능하다. self-check에는 허용 루트 alias import, `firebase/storage` named import,
re-export alias가 잡히고 `import { templateList as list }`와 지역 `list`는 안 잡히는 케이스를 넣었다.

**면제·억제 없음의 측정.** 실제 66파일 surface의 named binding 412개(고유 228개) 중 금지 10종은
**0건**이다.

**실측.** `admin-auth-read` **5/5**, **전체 Chromium E2E 161/161**, 전체 `node scripts/check.mjs`
PASS(unit **2409/2409**, 89 파일), **통제 빌드 대조 산출물 16개 byte+SHA-256 동일**(이 파일을 HEAD
버전으로 되돌려 재빌드한 결과와 대조), `git diff --check` PASS, 변경 경로 한 파일뿐, EOL clean,
포트·temp 잔류 0. 테스트 삭제·skip·E2E 예외 0.

## 다음 단계 — Codex 재검수 대기

스펙 082는 NN-3=A 예외 라운드까지 끝났고 `READY_FOR_CODEX`에서 멈춘다. 다음 단위는 Codex 재검수
결과와 사용자 지시가 정한다. 실제 admin issue UI, 다음 스펙, 자동화는 시작하지 않았다.

> 직전 지시문(스펙 082 보완 라운드 4, 수행 완료 — 기록):

```text
NN-3=A 승인. C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 082 CORRECTION_REQUIRED 라운드 4 예외만 수행해.
```


## Codex 재검수 — CORRECTION_REQUIRED / 자동 루프 중지

라운드 3의 detector는 `list`에만 bare identifier 검사를 생략한다. 따라서 다음 금지 경로가 통과한다.

```ts
import { list as l } from "@denn/firebase";
l(ref);
```

현 구현의 `list` property/bracket regex를 그대로 적용한 독립 합성 측정은
`DetectedByCurrentListForms=False`다. `apps/mockup`의 직접 `firebase/*` import 금지만으로는 충분하지
않다. 허용된 `@denn/firebase` 루트가 향후 `list`를 re-export하면 named alias로 도달할 수 있기 때문이다.
현재 self-check에는 `list` alias import가 없어서 이 누락도 보이지 않는다.

금지 10종의 whole reference/alias를 차단하라는 라운드 3 완료 조건은 **NOT PROVEN**이다. 라운드 3/3이
끝났고 같은 본질의 detector 누락이 반복됐으므로 `AUTO_REVIEW_LOOP.md`에 따라 자동 보완을 중지한다.
Claude Code는 Founder 결정 전에 코드·test·문서·commit·push를 시작하지 않는다.

### Founder NN-3

- **A (권장):** correction round 4 예외를 한 번 승인한다. 허용 제품 파일은
  `tests/e2e/admin-auth-read.spec.ts` 하나뿐이다. ordinary local `list`는 허용하면서 Storage `list`의
  named import/re-export alias(`list as l`)는 모듈 경계에서 차단하고, `firebase/storage`와 허용된
  `@denn/firebase` 루트 alias 합성 회귀를 추가한다. 제품 코드와 read-only Storage 연결은 변경하지 않는다.
- **B:** 알려진 `list` alias 검출 공백을 수용한다. 비권장이다.

> NN-3=A 승인 후 Claude Code에 전달할 지시문:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 Founder NN-3=A가 승인한 스펙 082 CORRECTION_REQUIRED 라운드 4 예외만 수행해.
```

## 현재 결과 — 보완 라운드 3 완료(최종 3/3), 전체 E2E 161/161

허용된 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드와 승인된 read-only
Storage 연결은 한 줄도 바꾸지 않았다. **전체 Chromium E2E는 161 passed / 0 failed**(라운드 2의 160 +
신규 detector self-check 1)다.

**결함.** 라운드 2의 `\bname\s*\(` 검사는 직접 호출만 잡아 `import { uploadBytes as u }` /
`const u = storage.uploadBytes; u()` / `storage["uploadBytes"]` 세 우회를 모두 통과시켰다.

**보완.** 이제 호출이 아니라 **reference 자체**를 금지한다 — 금지 10종을 bare whole identifier ·
`.name` property · `["name"]` bracket **세 형태 전부**로 차단한다. `list`만 bare 형태를 면제했는데,
앱 코드의 지역 변수와 `template-list` test id와 충돌하기 때문이며(실측 3곳 전부 무해) 고객 앱이
`firebase/*`를 직접 import하지 않음을 같은 테스트가 단언하므로 Storage의 `list`는 namespace property로만
도달 가능해 property·bracket 형태가 그대로 커버한다. 면제 이유는 검사 지점 주석에 있다.

**detector 자체를 증명한다.** 신규 self-check 테스트가 alias import·property extraction·bracket
property·직접 호출은 잡히고, `const list = categories`와 줄/블록 주석 속 이름은 잡히지 않음을 같은
파일에서 보인다. 이게 없으면 "앱이 깨끗해서"가 아니라 "detector가 눈이 멀어서" 통과해도 알 수 없다.

**경계.** 검사 source에 고객이 실제 쓰는 루트 boundary(`packages/firebase/src/index.ts` +
`public-catalog` + `public-images`)와 `space-read`, `apps/mockup/src`를 합쳐 **66파일**을 본다.
`apps/mockup` production import specifier는 `@denn/firebase` 루트와 `@denn/firebase/space-read`만
허용하고 `firebase/*` 직접 import는 실패한다. 승인된 read positive는 `proof-sdk-facade.ts`의
`storage.getStorage/ref/getMetadata/getBytes` exact call로 고정했다. bundle test 제목과 파일 상단 설명은
Firestore read + Storage **read**가 승인된 현재 상태로 정정했고, Auth whole-identifier·admin private
path·runtime external request 0 단언은 유지했다. 테스트 삭제·skip·E2E 예외는 없다.

**실측.** targeted `admin-auth-read` **5/5**, **전체 Chromium E2E 161/161**, 전체
`node scripts/check.mjs` PASS(unit **2409/2409**), **build 산출물 14개 모두 보완 전과 byte+SHA-256
동일**, `git diff --check` PASS, 변경 경로 한 파일뿐, EOL clean, 포트·temp 잔류 0.

## 다음 단계 — Codex 재검수 대기

스펙 082는 보완 라운드 3/3까지 끝났고 `READY_FOR_CODEX`에서 멈춘다. 다음 단위는 Codex 재검수 결과와
사용자 지시가 정한다. 실제 admin issue UI, 다음 스펙, 자동화는 시작하지 않았다.

> 직전 지시문(스펙 082 보완 라운드 3, 수행 완료 — 기록):

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 082 CORRECTION_REQUIRED 라운드 3만 수행해.
```


## 현재 결과 — 보완 라운드 2 완료, 전체 E2E 160/160

Founder **NN-2=A**가 허용한 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품
코드는 한 줄도 바꾸지 않았다. **전체 Chromium E2E는 160 passed / 0 failed**(기존 159 + 신규
call-surface 테스트 1)로, 라운드 1까지 남아 있던 158/1이 해소됐다.

`bundle.includes("uploadBytes")`는 번들된 Firebase 제품이 모듈 전체를 싣는 탓에 "이 앱이 쓰기를
하는가"가 아니라 "Storage SDK가 존재하는가"를 측정했고(그 이름들은 vendor export 맵과
`_throwIfRoot()` 라벨일 뿐), 같은 목록이 079(MM-1=A)가 승인한 `getStorage`까지 금지해 079 이후엔
통과할 수 없는 검사였다.

이제 번들 substring 목록에는 vendor가 만들지 않는 app-level 문자열만 남기고, 신규 테스트가 고객의
**자기 소유 production source**(`apps/mockup/src` + 유일하게 import하는 `space-read`, test·`e2e/`
제외 58파일)를 주석 제거 후 검사한다 — write/admin subpath import **0**, 쓰기·열거·다운로드 API
**호출 0**, 승인된 `getStorage`/`ref`/`getMetadata`/`getBytes` 호출은 **실제로 존재**. 라운드 1의
`getAuth` whole-identifier 검사와 default route external request 0 검사는 그대로다. 같은 검사를 admin
write surface에 겨누면 `uploadBytes`가 FAIL로 잡혀 **이빨이 있음을 측정으로 확인**했다.

**실측.** targeted `admin-auth-read` **4/4**, **전체 Chromium E2E 160/160**, 전체
`node scripts/check.mjs` PASS(unit **2409/2409**), **build 산출물 14개 모두 보완 전과 byte+SHA-256
동일**, `git diff --check` PASS, 변경 경로 한 파일뿐, EOL clean, 포트·temp 잔류 0.

## Codex 재검수 — CORRECTION_REQUIRED 라운드 3/3

현재 전체 E2E **160/160**은 독립 재현했지만 source guard가 별칭·property extraction을 놓친다. 현재
`\bapi\s*\(` 검사는 다음 세 금지 사용을 모두 통과시킨다:

- `import { uploadBytes as u } from "firebase/storage"; u()`
- `const u = storage.uploadBytes; u()`
- `storage["uploadBytes"]`

또한 test 제목과 파일 상단 설명이 여전히 Firestore-only/SDK trace 0이라고 적어 승인된 Storage read와
모순된다. 같은 허용 test 파일 안에서 닫는 최종 in-scope 보완이며 Founder 추가 결정은 필요 없다.

> Claude Code에 전달할 실행 지시문:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 082 CORRECTION_REQUIRED 라운드 3만 수행해.

허용 제품 파일은 tests/e2e/admin-auth-read.spec.ts 하나뿐이다. 제품 코드와 승인된 read-only Storage
연결은 바꾸지 마.

현재 forbidden API 검사가 `\bname\s*\(` 직접 호출만 잡아 alias import, property extraction, bracket
property를 놓친다. 주석 제거된 app-owned production source에서는 uploadBytes,
uploadBytesResumable, uploadString, updateMetadata, deleteObject, list, listAll, getDownloadURL, getBlob,
getStream의 whole identifier/reference 자체를 금지해 alias와 property extraction도 차단해. 합성 문자열
회귀로 최소 `import { uploadBytes as u }`, `const u = storage.uploadBytes; u()`,
`storage["uploadBytes"]`가 detector에 잡히고 주석 속 이름은 무시됨을 같은 파일에서 증명해.

apps/mockup production import specifier는 @denn/firebase 루트와 @denn/firebase/space-read만 허용하고,
apps/mockup이 firebase/app|auth|firestore|storage를 직접 import하면 실패하게 해. 검사 source에는 고객이
실제 쓰는 루트 public-catalog/public-images 경계와 space-read production source를 포함해. 승인된 Storage
positive는 packages/firebase/src/space-read/proof-sdk-facade.ts의 storage.getStorage/ref/getMetadata/getBytes
exact call로 고정해 다른 동명 함수가 대신 만족하지 못하게 해.

bundle test 제목과 파일 상단 설명도 Firestore+read-only Storage가 승인된 현재 상태에 맞춰 정정해.
기존 Auth whole-identifier, admin private path, runtime external request 0 단언은 유지해. 테스트 삭제·skip·
E2E 예외는 금지다.

targeted admin-auth-read와 전체 Chromium 전부 PASS, node scripts/check.mjs, bundle/CSS hash,
git diff --check, exact one-product-file diff, EOL, 포트/temp를 검증해. package/lockfile, Rules/config,
apps/packages 제품 코드, 보호 대상, 실제 Firebase/network/live/deploy/UI는 건드리지 마. 허용 test와
spec082 상태 문서만 일반 fast-forward commit/push하고 READY_FOR_CODEX에서 멈춰. 자동화는 만들지 마.
```

> 직전 지시문(스펙 082 보완 라운드 2, 수행 완료 — 기록):

## 현재 결과 — 보완 라운드 1 완료

Founder **NN-1=A**가 허용한 **정확히 두 파일만** 고쳤고 스펙 082 본 구현은 건드리지 않았다.

**① `getAuth` 마커 정밀화.** raw substring → 전체 식별자. 079/080이 승인한 lazy `firebase/storage`
때문에 Storage SDK 내부 `_getAuthToken`이 걸린 오탐이었다. 실측: 고객 staging 자산 raw **3** → 식별자
매치 **0**, 실제로 Auth를 쓰는 admin 번들 raw 9 → 매치 **6**(실제 사용은 계속 전부 차단). 테스트
삭제·경계 약화 없이 오탐만 줄였다.

**② stale constant.** `RENDER_NOT_IMPLEMENTED`가 같은 파일이 export하는 Canvas executor를 "이후
구현"이라 말하던 모순을 고쳐, 남은 미구현인 generic `RenderInput -> RenderOutput` facade만 가리키게
했다.

**실측.** 전체 `node scripts/check.mjs` PASS(unit **2409/2409**), **build 산출물 14개 모두 보완 전과
byte+SHA-256 동일**, `git diff --check` PASS, 변경 경로 허용 두 파일뿐, EOL clean, 포트·temp 잔류 0.

**전체 Chromium E2E는 158 passed / 1 failed이며 159/159가 아니다.** `getAuth` 단언은 통과하지만 마커
루프가 첫 실패에서 멈추던 탓에 가려졌던 `uploadBytes`가 드러났다. staging 자산 전체 스캔 결과 ok 5건,
**FAIL 6건** — 5건(`uploadBytes`·`uploadBytesResumable`·`uploadString`·`getDownloadURL`·`listAll`)은
lazy storage vendor chunk의 오류 라벨/export 이름 맵이라 같은 계열 오탐이고, `getStorage`는 vendor
2건 + **고객 entry의 승인된 `getStorage(app)` 호출 1건**이다. NN-1=A가 승인한 범위 밖이라 고치지 않고
기록만 했으며 **"전체 E2E PASS"라고 기록하지 않는다.**

**필요한 결정.** ① 마커 5건을 vendor dead export와 고객 호출을 구분하도록 정밀화 ② `getStorage`를
079/080 승인에 맞춰 허용으로 이동 ③ 그 수정을 어느 단위에 넣을지.

## Codex 재검수와 Founder NN-2 선택지

Codex 독립 검증도 전체 check **2409/2409 PASS**, Chromium **158/159**이며 실패 marker는
`uploadBytes`로 동일하다. `getAuth` 정밀화와 stale constant 정정 자체는 적합하다.

- **NN-2=A (권장):** 기존 스펙 079/080의 read-only Storage 승인을 보존한다. 번들 전체 vendor 문자열
  부재 검사를 폐기하고, app-owned production source/call surface가 `getStorage`, `ref`, `getMetadata`,
  `getBytes`의 read-only 경계만 사용하는지 검사한다. upload/update/delete/list/download 호출은 계속
  금지하고, 기존 Auth·admin private-path 금지 및 default route external request 0 검사는 유지한다.
  correction round 2는 `tests/e2e/admin-auth-read.spec.ts` 한 제품 파일만 수정한다.
- **NN-2=B:** write API symbol 자체가 vendor chunk에서 사라지도록 Firebase Storage adapter/import 및
  bundling을 재설계한다. 제품 코드와 bundle이 바뀌는 별도 단위가 필요하다.
- **NN-2=C:** 현재 158/159를 Founder E2E 예외로 승인한다. 권장하지 않는다.

Founder가 **NN-2=A**를 승인했다. 실제 admin issue UI와 다음 스펙은 시작하지 않는다.

> Claude Code에 전달할 실행 지시문:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 082 CORRECTION_REQUIRED 라운드 2만 수행해.

Founder NN-2=A에 따라 허용 제품 파일은 tests/e2e/admin-auth-read.spec.ts 하나뿐이다. 스펙 079/080에서
승인된 고객 read-only Storage 연결을 보존하고 제품 코드는 수정하지 마. 번들 전체 vendor chunk의 raw API
이름 부재를 고객 호출 부재로 간주하는 오래된 검사를, app-owned production source/call surface가
getStorage/ref/getMetadata/getBytes의 승인된 read-only 경계만 사용함을 검사하도록 정정해. uploadBytes,
uploadBytesResumable, uploadString, updateMetadata, deleteObject, list, listAll, getDownloadURL 호출은 계속
금지해. 기존 Auth whole-identifier, admin private path, default route Firebase/external request 0 검사는
유지하고 테스트를 삭제하거나 E2E 예외로 처리하지 마.

targeted admin-auth-read Chromium과 전체 Chromium 159/159, node scripts/check.mjs, bundle/CSS hash,
git diff --check, exact one-product-file diff, EOL, 포트/temp를 검증해. package/lockfile, Rules/config,
apps/packages 제품 코드, 보호 대상, 실제 Firebase/network/live/deploy/UI는 건드리지 마. 허용 test와
spec082 상태 문서만 일반 fast-forward commit/push하고 READY_FOR_CODEX에서 멈춰. 자동화는 만들지 마.
```

> 직전 지시문(스펙 082 보완 라운드 1, 수행 완료 — 기록):

React 비의존 Canvas plan executor와 타입을 `@denn/render`의 단일 구현으로 옮겼고
(`packages/render/src/canvas/**`), `apps/mockup/src/canvas`의 두 파일은 thin re-export만 남는다.
preflight 순서·오류 코드·command index·단일 읽기 snapshot·save/restore 우선순위·rotation/text
capability·throw 0 계약은 하나도 바뀌지 않았다. 테스트가 local 이름이 `@denn/render` export와 **같은
참조**임을 `toBe`로 고정하고, 소스 스캔은 shared 구현을 읽는다.

**Tailwind drift 0이라 `theme.css`는 손대지 않았다**(mockup/admin CSS SHA-256 동일). bundle 변화는
mockup entry 하나뿐 — `index-BUT7Bmak.js`(340,604) → `index-CRHkWFoL.js`(340,609, **+5 bytes**). 변경
4파일을 HEAD로 되돌린 통제 빌드로 이전 산출물을 재현·대조해, 차이가 offset 2328부터의 **minified
식별자 재배치**뿐이고 추가 코드·중복 사본이 없음을 확인했다. admin 전체와 mockup sibling chunk 4개는
byte-identical이다.

**Codex 독립 실측.** targeted executor **87/87**, render/mockup/admin typecheck PASS, 전체
`node scripts/check.mjs` **PASS**(unit **2409/2409**), `git diff --check` PASS, forbidden diff 0,
신규 파일 EOL **3/3**, 검사 포트 잔류 0, temp 잔류 0.

**전체 Chromium E2E는 158 passed / 1 failed이며 "전체 E2E PASS"라고 기록하지 않는다.** 실패
`tests/e2e/admin-auth-read.spec.ts:82`(마커 `getAuth`)는 **스펙 082 원인이 아니다** — 변경 4파일을
HEAD로 되돌려도 동일하게 실패하며, 문자열은 firebase/storage vendor chunk(이동 전후 SHA-256 동일)의
`_getAuthToken`이다. 스펙 079/080이 연결한 chunk이고 080·081은 전체 suite가 NOT RUN이었다. 수정은
`tests/e2e/admin-auth-read.spec.ts` 또는 고객 앱 storage 연결을 건드려야 해 **스펙 082 허용 범위
밖**이라 고치지 않고 기록만 했다.

추가로 `packages/render/src/index.ts`의 public constant `RENDER_NOT_IMPLEMENTED`가 여전히
“Canvas executor는 이후 구현”이라고 적어, 같은 파일이 실제 executor를 export하는 현재 상태와 모순된다.

## Founder NN-1 선택지

- **A (권장):** 스펙 082 보완 라운드 1의 최소 범위를 `tests/e2e/admin-auth-read.spec.ts`와
  `packages/render/src/index.ts`로 확장한다. 테스트는 실제 Auth `getAuth()` 경계를 계속 금지하되
  Storage 내부 `_getAuthToken` 부분 일치는 오탐하지 않도록 정밀화하고, stale constant는 generic
  `RenderInput -> RenderOutput` facade만 미구현이라는 사실로 바로잡는다. 고객 Storage 연결·제품 동작은
  바꾸지 않는다.
- **B:** 158/1을 Founder E2E 예외로 승인하고 stale constant만 정정한다.
- **C:** 고객 앱의 승인된 Storage 연결 자체를 재검토한다. 기존 스펙 079/080 결정과 충돌한다.

Founder가 **NN-1=A**를 승인했다. 실제 admin issue UI와 다음 스펙은 시작하지 않는다.

> Claude Code에 전달할 실행 지시문:

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 스펙 082 CORRECTION_REQUIRED 라운드 1만 수행해.

허용 제품 파일은 tests/e2e/admin-auth-read.spec.ts와 packages/render/src/index.ts 두 개뿐이다.
admin-auth-read의 고객 bundle 검사는 실제 Auth getAuth() 경계를 계속 차단하면서 Firebase Storage SDK 내부
_getAuthToken을 부분 문자열로 오인하지 않도록 최소 정밀화해. 테스트를 삭제하거나 해당 경계를 약화하지 마.
packages/render/src/index.ts의 RENDER_NOT_IMPLEMENTED 문구는 실제로 남아 있는 generic RenderInput ->
RenderOutput facade의 미구현만 정확히 말하도록 고쳐, 이미 export되는 Canvas executor를 미구현이라고 하지 마.

그 밖의 제품 코드, package/lockfile, Rules/config, 보호 대상은 수정하지 마. targeted test, node
scripts/check.mjs, 전체 Chromium E2E 159/159, git diff --check, exact diff, bundle/CSS hash, 포트/temp를 검증해.
실제 Firebase/network/live/deploy와 admin UI 구현은 금지다. 허용 코드와 spec082 상태 문서만 일반
fast-forward commit/push하고 READY_FOR_CODEX에서 멈춰. 자동화는 만들지 마.
```

> 직전 지시문(스펙 082 구현, 수행 완료 — 기록):

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md와
docs/rebuild/specs/082-shared-canvas-plan-executor-boundary.md를 읽고 스펙 082 범위만 구현·검증해.

현재 HEAD=origin=df75655, ahead/behind 0/0이다. 스펙 081은 Codex 독립 검수에서 targeted 215/215,
전체 check unit 2408/2408, build 2개, bundle/CSS exact hash, EOL/diff/port/temp gate를 통과해
DONE/CODEX_PASSED다.

스펙 082는 실제 UI가 아니다. 현재 apps/mockup/src/canvas의 React 비의존 Canvas render-plan executor와
그 타입을 동작 변화 없이 @denn/render의 단일 구현으로 옮기고, mockup 경로에는 thin re-export만 남겨.
cross-app import나 구현 복제는 금지한다. executor의 preflight, 오류 코드, commandIndex, getter 단일 읽기,
save/restore 우선순위, rotation/text capability, throw 0 계약을 바꾸지 마.

허용 제품 파일은 스펙 082에 열거된 packages/render/src/canvas/** 신규 파일,
packages/render/src/index.ts, mockup canvas의 types.ts/executePreviewPlan.ts 및 최소 test import/assertion이다.
packages/ui/src/theme.css는 source 이동으로 인한 Tailwind CSS drift를 실제 대조 빌드로 재현했을 때만 exact
non-UI @source exclusion 조정을 허용한다.

apps/admin/**, 실제 admin UI/UX/CSS/Canvas proof exporter, packages/render/src/plan/index.ts 보호 파일,
package.json/lockfile/pnpm-workspace.yaml, Rules/firebase config, 실제 Firebase/network/live/data/UID,
deploy, 운영 발급, URL/clipboard, publish/delete/orphan cleanup은 수정·실행하지 마. 신규 dependency,
설치·다운로드, 자동화도 금지한다.

targeted executor unit, render/mockup/admin typecheck, node scripts/check.mjs, 전체 local Chromium E2E,
production bundle/CSS 전후 byte+SHA-256, git diff --check, forbidden diff, 신규 EOL, 포트 6개와 temp 잔류를
검증해. E2E가 보호 PNG 두 개를 다시 써도 restore/stage/commit하지 마. 보호 대상과 기존 user dirty 파일은
그대로 둬.

구현·검증 결과를 spec 082 DONE, handoff, STATE/NEXT/CURRENT/live log에 실제 수치로 기록하고 코드와 문서를
분리한 일반 fast-forward commit/push 후 READY_FOR_CODEX에서 멈춰. 실제 admin UI 다음 스펙을 자동 시작하지 마.
```

## Codex 검수 근거

- 스펙 081 라운드 2 변경은 `issue-session.ts`와 `issue-session.test.ts` 두 파일뿐이다.
- 오류 8종의 canonical category/retryable 조합과 prototype-chain 거부가 table-driven test로 고정됐다.
- 독립 실측: targeted **215/215**, 전체 **2408/2408**, bundle/CSS 4개 SHA-256 exact, 포트 잔류 0.
- Chromium E2E와 emulator는 스펙 081에서 NOT RUN이다. 실제 Firebase/live/deploy는 계속 0이다.

## 다음 구조의 이유

admin issue UI가 현재 mockup 앱 내부 Canvas 파일을 직접 import하면 앱 경계를 깨고, executor를 복사하면
동일 render plan이 앱마다 다르게 그려질 수 있다. 먼저 공유 executor 경계를 만든 뒤 Claude Code가 다음
UI 스펙에서 admin draft/proof composition을 구현한다.
