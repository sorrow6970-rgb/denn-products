# Spec 087 handoff - customer Space post-auth header collapse

## 상태

- `READY_FOR_CODEX` — 구현·검증 완료(2026-09-03), 결과는 아래 `구현 결과` 절
- 기준 `HEAD=origin=9ffdf1b` → 계약 `f72e2e2` → 제품/test/PNG `ac684e3`, ahead/behind `0/0`
- active unit: `spec-087-space-post-auth-header-collapse`, fix_round `0`
- next: `CODEX_SPEC_087_REVIEW` (**계약 보완 판단 2건 요청**)
- 직전 완료: spec 086 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`

## Claude Code가 수행할 것

정본 `docs/rebuild/specs/087-space-post-auth-header-collapse.md`를 처음부터 끝까지 읽고 그 범위만
구현·검증한다. 실제 UI 구현은 Claude Code 담당이다.

- spec 084 **F-3** 하나만 처리한다.
- 인증 **전** 화면은 한 글자도 바꾸지 않는다. `space-v2-password-gate-390x844.png`가 바뀌면 STOP이다.
- 인증 **후**에는 게이트가 자기 badge·`<h1>내 공간 시안 확인</h1>`·`담당자에게 전달받은 비밀번호를
  입력하세요.`를 렌더하지 않고, 결과 화면(V2 액자 뷰 / V1 차단 안내)이 유일한 제목을 갖는다. 각 결과
  화면의 기존 `<h2>`를 `<h1>`로 올리되 `id`와 `aria-labelledby`는 고정이다.
- 판정은 결과 renderer **주입 여부**로 한다(`renderReadyBody`가 이미 쓰는 조건). 주입이 없는 spec 061
  fallback은 자기 제목이 없으므로 게이트 머리말을 유지하고, 비밀번호 안내만 사라진다.
- **새 고객 문구를 만들지 않는다.** 이미 있는 문자열만 재배치한다.
- 게이트의 인증 로직·오류 코드·재시도 정책·비밀번호 취급, Space V1/V2 판정과 렌더 결과는 바꾸지 않는다.

## 검증과 산출물

- unit: 인증 전 4개 상태 무변경, `ready`+renderer 주입 시 게이트 머리말 0, fallback 시 머리말 유지,
  결과 화면 `<h1 id=...>`와 `aria-labelledby` 유지, 기존 보안·문구 단언 무수정 PASS.
- Chromium: 인증 후 `h1` 1개·비밀번호 안내 DOM 부재, 기존 `내 공간 시안` heading과
  `저장된 시안 · 열람 전용` 단언 무수정 PASS, V1 차단 안내 유일 `h1`, 두 viewport에서 overflow 0·axe
  serious/critical 0·console/pageerror/network 0.
- 전체 `node scripts/check.mjs`, `node scripts/e2e-run.mjs`, `git diff --check`.
- Space PNG 3장(`space-v2-viewer-{1280x800,390x844}`, `space-v1-blocked-390x844`)만 갱신하고 직접
  확인한다. gate PNG는 무변경이어야 한다. `measurements.json`은 ignored 검증 근거일 뿐 stage 0.
- 운영자 entry 무변경, 고객 bundle 변화, forbidden diff, 포트/temp를 보고한다.

제품/test/PNG commit과 문서 commit을 분리해 일반 fast-forward push하고 `READY_FOR_CODEX`, next
`CODEX_SPEC_087_REVIEW`에서 멈춘다. 다음 finding이나 스펙을 시작하지 않는다.

## 왜 이 단위인가 (Codex 선정)

spec 086이 F-5를 닫고 `CODEX_PASSED`를 받았다. 남은 finding 중 F-2는 고객·운영자 **두 앱**에 걸쳐 있어
spec 086이 세운 "한 단위에 두 앱을 묶지 않는다"에 걸리고, F-4는 admin 기본 진입/gate 결정, F-7은 고객
노출 독자·운영 발생 조건 결정, F-8은 replay 크기 제품 결정이 선행돼야 한다. 고객 앱 한 곳에서 닫히고
새 제품 결정이 필요 없는 것은 **F-3**뿐이다.

## 금지·보호

실제 Firebase/network/emulator/deploy, Rules/config, package/lockfile/workspace, `packages/**`, 운영자 앱,
고객 composer/browse, Space 인증·판정 의미 변경은 금지다. 다음 기존 Founder/user dirty와 보호 대상은
수정·복원·stage·commit하지 않는다.

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- spec 018 PNG 두 장
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`, `AGENTS.md`

## 구현 결과 (2026-09-03)

- 계약 `f72e2e2`, 제품/test/PNG `ac684e3`, 문서 commit은 이 갱신이다. `apps/admin/**`·`packages/**`·
  package/lockfile/workspace·Rules/Firebase config diff **0**, 실제 Firebase/network/emulator/deploy
  **0**, F-2·F-4·F-7·F-8·고객 composer/browse 수정 **0**.
- **§1 인증 전 무변경.** `space-v2-password-gate-390x844.png` sha256 `67a1433c…` **바이트 동일**.
- **§2 인증 후.** `readyBodyOwnsTitle`(= `renderReadyBody`가 쓰는 주입 여부와 같은 조건)이면 게이트
  badge·`<h1>`을 렌더하지 않고, 비밀번호 안내는 `ready`이면 무조건 렌더하지 않는다. renderer가 없는
  spec 061 fallback은 머리말을 유지한다.
- **결과 화면 3곳의 `<h2>` → `<h1>`.** `SpaceV2ProofView`, V1 액자 뷰, V1 차단 안내. 문구·class·id
  그대로라 `aria-labelledby` 3개가 모두 해석되고 badge도 유지. **새 고객 문구 0**, CSS 수정 0.
- **★ 계약 보완 판단 요청 2건.** ① 허용 파일에 `apps/mockup/src/space-v2/SpaceV2ProofView.tsx`(+test)가
  없었다 — 제품 V2 route가 실제로 렌더하는 결과 화면이라 빼면 §3 "h1 1개"가 그 화면에서 성립하지 않는다
  (E2E가 `h2`로 실패). §2가 이미 요구하는 의도 안이라 보고 포함했다. ② canonical이 같은 두 화면의 다른
  baseline 4장(`spec-063/space-v1-blocked-*`, `spec-080/space-v2-viewer-*`)도 다시 썼다. 허용 목록에
  없으므로 **stage하지 않고** 인과만 확인해 보고한다(spec-080 두 장은 spec-084 viewer와 sha256이 같은
  동일 캡처다).
- **검증.** `node scripts/check.mjs` PASS(unit **2510/2510**, 92 파일, build 2개; 신규 unit 8).
  canonical `node scripts/e2e-run.mjs` **Chromium 223 passed / 0 failed / 0 skipped / 0 retry**
  (기존 220 + 신규 3). `git diff --check` PASS, 포트 6개·temp 잔류 0.
- **bundle.** 운영자 `index-BWeRXD_J.js` 295.37 kB · CSS `index-CCW8unbN.css` 11.24 kB **무변경**,
  고객 CSS `index-CLxRhNtu.css` 20.27 kB **무변경**, 고객 entry 341.94 → `index-CqOWaAno.js`
  **342.07 kB**.
- **증거.** 허용 3장 갱신·직접 확인: `9c601fe8…` → `c84d8f16…`, `7a6482d1…` → `0ce9e921…`,
  `768b8310…` → `64927f4f…`. `measurements.json` Space 4항목 overflow false·axe 0·smallTargets 0.
- **보호 대상.** hash 동일, restore·stage·commit 0. spec 018 PNG는 canonical이 다시 썼고 stage하지
  않았다(desktop `d0a0aa52…` → `bd5ff207…`, **mobile도 이번엔 `6bdcb88c…` → `8676d263…`** — browse DOM은
  건드리지 않았으므로 기존 raster 비결정성으로 본다).
- **NOT TESTED.** 제품 `?space=` route(실제 Firestore 필요)·실기기·200% zoom·preview channel·실제
  Firebase/network/emulator/deploy·운영 데이터.
- 상태 `READY_FOR_CODEX`, next `CODEX_SPEC_087_REVIEW`, fix_round 0. 다음 finding·다음 스펙은 시작하지
  않았다.
