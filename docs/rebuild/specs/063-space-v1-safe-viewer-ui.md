# 스펙 063 — space V1 안전 차단 viewer UI/UX

상태: **IMPLEMENTED / READY_FOR_CODEX / LOCAL_ONLY / NO_NETWORK / NO_DEPLOY**

기준 커밋: `e9dbb9e` (스펙 062 종료)
작성·구현: Claude (Founder FF-5=A — "V1 안전 차단 이후 UI/UX는 Claude 담당")

---

## 1. 목표 (WHY)

스펙 062에서 `space-scene-v1`은 발급 당시 액자 방향(portrait/landscape)과 capture geometry를
저장하지 않는다는 사실이 확정됐고, Founder는 **FF-1=A** — 방향 근거가 없는 V1 exact replay는
fail-closed 를 승인했다. 구현 `a09278a`는 `composeSpaceFramePlan()`이 V1에 대해 **성공 plan을 전혀
만들지 않도록** 바꿨다.

그 결과 지금 고객이 기존 `?space=` 링크를 열면, 비밀번호는 통과하지만 화면에는
`시안을 표시할 수 없습니다.` 한 줄만 뜬다. 그것도 **카탈로그를 내려받고 · 사진(proof)을 요청하고 ·
폰트를 확인하고 · Canvas plan을 시도한 뒤**에 뜬다. 즉

- 고객은 왜 안 되는지, 무엇을 해야 하는지 알 수 없고,
- 절대 성공할 수 없는 것이 확실한 경로에 대해 네트워크·디코드 작업이 실제로 수행된다.

이 스펙은 그 두 가지를 고친다. **V1 replay 자격을 가장 먼저 판정**하고, 실패면 Modern Studio 기준의
차분한 한국어 안내를 보여준다.

## 2. 범위 (SCOPE)

### 포함

1. `SpacePostAuthFrameView`의 **V1 preflight gate** — catalog load / proof owner / Image decode /
   font load / Canvas plan보다 **먼저** 판정.
2. Modern Studio 기준 **안전 차단 UI**(한국어) + 전용 CSS.
3. `SpacePostAuthFrameView` 단위 테스트 신규.
4. `tests/e2e/space-production-route.spec.ts`를 새 계약(안전 오류 + 요청 0)으로 갱신.
5. 시각 검증 결과(`docs/rebuild/results/spec-063/`) + handoff/STATE/NEXT/CURRENT/live log 갱신.

### 제외 (하지 않는다)

- `space-scene-v2` schema, geometry/catalog fingerprint 알고리즘, V2 issuer
- admin orientation 선택 UI
- V1 migration / 재발급 / same-token rewrite
- 실제 Firebase/project/token/document/network, 실제 proof·catalog object 접근
- write / publish / deploy / cutover
- Rules / firebase config / package.json / lockfile 변경, 신규 의존성
- 기존 browse/preview 디자인 개편
- `packages/spaces` 리더 변경 (V1 원문은 읽기만 하고 되쓰지 않는다)

> **STOP 조건:** V2 schema 또는 geometry fingerprint를 정의해야 하는 순간 임의로 정하지 않고 멈춘다.
> 이번 단위는 **V1 안전 차단 viewer UI까지만** 완료한다.

## 3. 대상 (WHERE)

| 파일 | 변경 |
|---|---|
| `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md` | 신규 (이 문서) |
| `apps/mockup/src/space/SpacePostAuthFrameView.tsx` | preflight gate + 안전 차단 UI + composition 분리 |
| `apps/mockup/src/space/space-post-auth-frame-view.css` | 신규 |
| `apps/mockup/src/space/SpacePostAuthFrameView.test.tsx` | 신규 |
| `tests/e2e/space-production-route.spec.ts` | 새 계약으로 갱신 |
| `docs/rebuild/results/spec-063/*.png` | 신규 시각 결과 |
| `docs/handoff/2026-08-20-...-handoff.md`, `Automation/*`, `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md` | 상태 동기화 |

참조(변경 없음): `apps/mockup/src/space/proof-image.ts`(`classifySpaceV1FrameReplay`),
`apps/mockup/src/space/frame-plan.ts`, `docs/rebuild/design/README.md`.

보존 제약(CLAUDE.md §4) 관련: **§4-3/§4-4**(Firestore `spaces/{token}` 불변, V1 페이로드 원문 무변경)와
**§4-9**(한국어 UI)만 해당한다. Storage rules·auth·인쇄 CORS·호스팅 라우팅은 건드리지 않는다.

## 4. 컴포넌트 구조 (React hook 규칙)

조건부 hook 호출을 만들지 않기 위해 **wrapper / child 분리**를 택했다.

```text
SpacePostAuthFrameView(props)          ← export. hook은 useMemo 1개, 무조건 호출
  └ preflightSpaceV1Replay(scene)      ← pure. imgT 1회 read + classifySpaceV1FrameReplay
       ├ blocked              → <SpaceReplayBlockedNotice/>      (hook 0개)
       └ exact-replay-proven  → <SpaceExactFrameComposition/>    (기존 hook 전부)
```

계약:

1. `useMemo` 하나만 wrapper에서 **무조건** 호출한다. 분기는 **자식 컴포넌트 선택**이지 hook skip이 아니다.
2. `SpaceExactFrameComposition`은 **module-private**다. export하지 않으므로 어떤 fixture·미래 caller도
   gate를 우회해 composition을 mount할 수 없다.
3. blocked이면 composition이 아예 mount되지 않으므로 `usePublicCatalog`,
   `useSourceBoundReadiness`, `useContentLogicalWidth`, `useSpaceFrameFonts`의 hook·effect가
   **존재하지 않는다**. 기존 owner/readiness/font lifecycle 계약은 proven 경로에서 그대로 유지된다.
4. `scene.design.imgT` 접근은 try/catch로 감싼다. hostile/throwing accessor는 예외가 아니라
   **blocked**로 떨어진다(fail-closed).
5. `exact-replay-proven`은 **오늘 도달 불가능**하다. `classifySpaceV1FrameReplay()`는 항상
   `{ok:false}`를 반환한다. 이 분기는 향후 explicit-orientation scene version을 위한 자리이며,
   의도된 미도달 상태다.

### 4.1 네트워크 차단 순서 (증명 대상)

```text
[비밀번호 미인증]
  요청 0 · viewer UI 0                       ← SpacePasswordGate가 renderReady를 부르지 않음
        |
   비밀번호 승인 (Firestore document read + AES-GCM 복호화 = 이미 완료된 gate)
        |
[preflight]  ← 여기서 판정. 아래 중 어느 것도 아직 시작되지 않음
        |
        ├─ blocked ─→ 안전 안내 렌더. 이후 catalog fetch 0 / proof fetch 0 / template art 0
        |             / Image() 생성 0 / font check 0 / Canvas plan 0 / retry 0
        |
        └─ proven ─→ catalog → asset request → proof owner → width → font → plan → Canvas
```

즉 blocked 경로에서 **published catalog와 proof image를 요청하지 않는다.** V1 오류를 알아내기 위해
네트워크를 쓰지 않는다는 것이 이 스펙의 핵심 안전 성질이다.

## 5. UI/UX 설계

### 5.1 전달해야 하는 의미 (Founder 지정 4가지)

| 의미 | 화면 문구 |
|---|---|
| 이전 버전 시안이다 | 뱃지 `이전 버전 시안` + `이 링크는 이전 버전에서 발급된 시안입니다.` |
| 발급 당시 구도를 정확히 증명할 수 없다 | `현재 버전에서는 발급 당시의 액자 방향과 사진 구도를 정확히 증명할 수 없습니다.` |
| 임의 변환 없이 안전하게 중단했다 | `구도를 임의로 바꿔 보여드리지 않기 위해 시안 표시를 안전하게 중단했습니다.` |
| 운영자에게 새 링크를 요청하라 | `담당자에게 새 시안 링크를 요청해 주세요.` |

제목은 `이 시안은 지금 화면에 표시할 수 없습니다`. "오류/실패/에러"라는 단어를 쓰지 않는다 —
고객 잘못도 시스템 고장도 아니고, **의도적으로 멈춘 상태**이기 때문이다.

### 5.2 표시하지 않는 것

- raw 오류 코드(`SPACE_PROOF_*`, `SPACE_VIEW_*`), URL, token, 비밀번호, catalog/template/size ID, UID,
  SDK 메시지 — **전부 0**. 단위 테스트가 문자열 단위로 검사한다.
- **Canvas·이미지 placeholder·스켈레톤 0.** 액자 모양 자리표시자는 "이게 당신이 저장한 구도"라는
  잘못된 인상을 준다. 이 상태가 존재하는 이유 자체가 그 주장을 거부하는 것이다.
- **자동 재시도 버튼 0.** 재시도는 payload에 애초에 없는 근거를 만들어내지 못한다.
- 카카오 URL·신규 외부 링크 0 (이번 범위에서 추측해 넣지 않는다).

### 5.3 Modern Studio 매핑

기존 토큰만 사용한다. 새 색 리터럴·새 토큰·`@denn/ui` 변경 0.

| 요소 | 규격 |
|---|---|
| 뱃지 | 기존 `Badge`(`--accent-soft` bg + `--ink`, radius 999, 11px/700) |
| 제목 | 17px/700, `--ink`, `word-break: keep-all` |
| 본문 카드 | `--panel` bg + 1px `--line` + `--radius`(12px), 14px/1.6, `--ink` |
| 다음 행동 | `--accent-soft` bg + 1px `--accent` + `--radius`, 14px/700, `--ink` |

`--accent` 위에 흰 글씨를 쓰지 않는다(2026-07-22 웜토프 결정: 흰색 약 3.35:1로 AA 미달, `--ink` 약
5.20:1). 그래서 강조 블록도 `accent-soft` + `ink` 조합이다.

CSS 특이도 주의: 안내는 `.denn-shell__inner` 안에 렌더되고 그 안의 `p` 규칙이 (0,1,1)이므로,
문단 규칙은 `.denn-space-blocked .denn-space-blocked__body p` (0,2,1)로 쓴다 — 동률이면 import
순서가 승자를 정하게 된다. `browse.css`의 `.denn-browse .denn-browse__summary-title`과 같은 관례다.

### 5.4 접근성

- `section[aria-labelledby]` + `h2` — 기존 `h1`(비공개 시안 확인) 아래 올바른 heading 순서.
- 본문 블록에 `role="alert"` — 비밀번호가 승인된 **직후** 상태가 바뀌므로, 결과를 기다리던 시점에
  스크린리더가 읽는다. `role="alert"`는 `aria-live="assertive"` + `atomic`을 함의하므로 별도 지정 없음.
- **자동 포커스 이동은 하지 않는다.** `role="alert"` 낭독과 focus 이동을 함께 하면 이중 낭독이 되고,
  기존 `SpacePasswordGate`의 오류 처리 관례(`role="alert"` only)와도 어긋난다.
- 인터랙티브 요소가 0개이므로 키보드 트랩이 없고, Tab 순서·페이지 스크롤이 기존과 동일하다.
- 색만으로 상태를 표현하지 않는다(뱃지 텍스트 + 제목 + 문장).
- 320px에서 가로 overflow 0: 모든 블록 `min-width:0` / `max-width:100%`, 한국어 줄바꿈은
  `word-break: keep-all` + `overflow-wrap: anywhere`.

## 6. 검증 절차 (VERIFY)

- [ ] targeted unit: `vitest run apps/mockup/src/space/SpacePostAuthFrameView.test.tsx`
- [ ] mockup typecheck: `tsc --noEmit -p apps/mockup/tsconfig.json`
- [ ] format / lint (Biome)
- [ ] 정본 check: `node scripts/check.mjs` (format → lint → typecheck ×7 → unit → build ×2)
- [ ] 전체 Chromium E2E: `node scripts/e2e-run.mjs`
- [ ] 390×844 / 1280×800 시각 확인 (`docs/rebuild/results/spec-063/`)
- [ ] safe-state Canvas 0, catalog/proof request 0
- [ ] console error/warning 0
- [ ] accessibility serious/critical 0
- [ ] `git diff --check`
- [ ] 변경 파일이 허용 범위뿐인지 확인
- [ ] `package.json` / lockfile / Rules / firebase config diff 0
- [ ] 고객 production bundle 파일명·byte·SHA-256 기록
- [ ] 포트 4183/4184/4185/8080/9099/9199 잔류 0

### 6.1 E2E 계약 (`tests/e2e/space-production-route.spec.ts`)

모든 HTTPS는 **정규식 catch-all**로 intercept한다(문자열 glob은 스펙 061에서 조용히 매치되지 않았다).
catalog·proof 두 정확한 URL만 합성 응답하고 나머지는 abort — 실제 외부 egress 0.

두 엔드포인트를 **일부러 응답 가능한 상태로 둔다**: 요청 수 0이 "제품 결정"이지 "fixture가 깨져서"가
아님을 증명하기 위해서다.

| 테스트 | 검증 |
|---|---|
| `blocks an unproven V1 scene with zero catalog and proof traffic` | 인증 전 요청 0 · viewer UI 0 → 인증 후 안전 안내(제목/본문/다음 행동) · `role="alert"` · Canvas 0 · `<img>` 0 · retry 0 · 버튼 0 · **요청 0** · `documentReads 1`/`sceneOpens 1` · 비밀·내부코드 비노출 · console error/warning 0 · axe serious/critical 0 |
| `never retries on its own, on re-render or after a reload` | resize 재렌더 + 1.5s 대기 후 요청 0 · reload 후 재인증에도 요청 0, Canvas 0 (이전 성공 plan 재사용 0) |
| `unmounting ... leaves no view and starts no deferred work` | unmount 후 view 0 · 지연 작업/요청 0 |
| `fits a 320px viewport without horizontal overflow` | `documentElement.scrollWidth <= clientWidth`, view 우측 경계 ≤ viewport |
| `spec063 screenshot mobile-390x844` / `desktop-1280x800` | 시각 결과 산출 |

### 6.2 삭제된 시나리오와 대체 coverage

스펙 061의 세 번째 E2E `unmounting the production route prevents a late proof result from restoring
canvas`는 **도달 불가능**해졌다. 그 시나리오는 "proof 요청이 나간 뒤 unmount → 늦게 도착한 이미지가
Canvas를 되살리는가"를 봤는데, preflight 이후 **proof 요청 자체가 발생하지 않으므로** 테스트가 기다리는
`proofRequested` promise가 영원히 resolve되지 않는다(= 무한 대기, 가짜 실패).

근거 없이 coverage를 없애지 않기 위해, 같은 성질이 아래에서 계속 검증된다.

| 원래 성질 | 대체 coverage |
|---|---|
| 늦게 도착한 proof 결과를 수용하지 않음 | `apps/mockup/src/space/proof-image-owner.test.ts` — `clear drops pending and ready state without accepting late results` |
| dispose 후 늦은 load/binding 0 | 같은 파일 — `dispose drops bindings and later load fails without creating another image` |
| 교체된 옛 source의 늦은 ready snapshot 무시 | `apps/mockup/src/space/source-bound-readiness.test.ts` — `invalidates the old source before replacement and ignores a late old ready snapshot` |
| unmount 시 owner 정리 | 같은 파일 — `disposes both owners once and permanently disables loads, resolves and bindings` |
| route unmount 후 화면·작업 잔류 0 | 이번 스펙의 세 번째 E2E(위 표) |

스펙 061의 두 번째 E2E `fails closed for an invalid catalog without loading proof`도 같은 이유로
production route에서는 재현할 수 없다 — **catalog를 아예 요청하지 않기** 때문이다. catalog 실패
fail-closed 자체는 `apps/mockup/src/catalog/*` 단위 테스트와
`tests/e2e/mockup-catalog.spec.ts`에서 계속 검증된다. 새 E2E는 그 대신 "catalog 엔드포인트가 정상
응답 가능한 상태여도 요청이 0"이라는 더 강한 성질을 검증한다.

## 7. 알려진 범위 밖 회귀 (STOP 대상)

`tests/e2e/space-frame-view.spec.ts`(스펙 060 fixture E2E) 2건은 **이번 작업 이전, 기준 커밋
`e9dbb9e`에서 이미 실패 상태**다. 스펙 062가 `composeSpaceFramePlan()`을 fail-closed로 바꾸면서
`preview-canvas`가 더 이상 나타나지 않기 때문이며, 스펙 062는 FF-5=A에 따라 E2E를 실행하지도
수정하지도 않았다.

- 기준 baseline 측정(이번 세션, 변경 전): **3 failed / 145 passed**
  - `space-frame-view.spec.ts:7` — `preview-canvas` toBeVisible 실패
  - `space-frame-view.spec.ts:72` — `preview-canvas` toBeVisible 실패
  - `space-production-route.spec.ts:41` — `preview-canvas` toBeVisible 실패 (← 이번 스펙에서 해소)

`space-frame-view.spec.ts`와 그 fixture `apps/mockup/src/e2e/space-frame-fixture.tsx`는 이번 스펙의
**허용 파일 목록 밖**이다. 따라서 수정하지 않았고, Founder 결정 없이는 수정하지 않는다. 자세한 선택지는
`### QUESTIONS` 참조.

## 8. NOT TESTED / 계속 금지

- 실제 Firebase project/token/document, 운영 V1 scene 분포: **NOT TESTED**
- 실제 published catalog·proof object, CORS, 실제 폰트·기기 렌더: **NOT TESTED**
- V2 schema/fingerprint/issuer/admin orientation UI/migration: **NOT IMPLEMENTED**
- write / publish / deploy / cutover / same-token rewrite: **금지**

---

### QUESTIONS

**Q1. `tests/e2e/space-frame-view.spec.ts`(+ `apps/mockup/src/e2e/space-frame-fixture.tsx`) 처리.**

이 두 파일은 허용 목록 밖이라 손대지 않았다. 하지만 §7대로 기준 커밋에서 이미 실패 중이고,
"전체 Chromium E2E PASS" 게이트는 이 파일을 갱신하지 않는 한 달성할 수 없다. 두 테스트는
`SpacePostAuthFrameView`가 V1 scene으로 `preview-canvas`를 그리기를 기대하는데, 이는 FF-1=A와
정면으로 모순된다.

선택지:

- **A (권장):** 이번 스펙의 허용 파일 목록에 `tests/e2e/space-frame-view.spec.ts`를 추가하고, 스펙
  061 production-route와 동일하게 **안전 차단 기대값**으로 갱신한다. fixture의 owner/font/dispose
  계측 자산은 남기되, 도달 불가능해진 canvas 단계 단언은 §6.2 형식으로 대체 coverage를 명시하고
  제거한다. `apps/mockup/src/e2e/space-frame-fixture.tsx`는 그대로 둔다.
- B: fixture를 composition child에 직접 붙일 수 있도록 `SpaceExactFrameComposition`을 export한다.
  → **권장하지 않는다.** gate를 우회할 수 있는 seam이 생기고, "안전 gate를 건너뛰는 경로 0"이라는
  이번 스펙의 핵심 성질이 무너진다.
- C: 두 테스트를 그대로 실패 상태로 남긴다. → E2E 게이트가 영구히 red가 되어 회귀 감지 능력을 잃는다.

Founder 결정 전까지 이 두 파일은 변경하지 않는다.

---

## DONE (Claude, 2026-08-20)

### 구현

| 파일 | 내용 |
|---|---|
| `apps/mockup/src/space/SpacePostAuthFrameView.tsx` | `preflightSpaceV1Replay()` + wrapper/child 분리. `SpaceReplayBlockedNotice` 신규, 기존 본문은 module-private `SpaceExactFrameComposition`으로 이동(로직 무변경) |
| `apps/mockup/src/space/space-post-auth-frame-view.css` | 신규. 기존 토큰만, 새 색 리터럴 0 |
| `apps/mockup/src/space/SpacePostAuthFrameView.test.tsx` | 신규 15 케이스 |
| `tests/e2e/space-production-route.spec.ts` | 안전 차단 계약으로 재작성 (6 테스트) |
| `docs/rebuild/results/spec-063/*.png` | 390×844 / 1280×800 |

`packages/spaces` 리더, `proof-image.ts`, `frame-plan.ts`, `@denn/ui`, browse/preview UI는 변경 0.

### 검증 결과

- targeted unit `SpacePostAuthFrameView.test.tsx`: **15/15 PASS**
- `node scripts/check.mjs`: **PASS** — format / lint / typecheck ×7 / unit **1627/1627** (70 files) / build ×2
- 전체 Chromium E2E `node scripts/e2e-run.mjs`: **149 passed / 2 failed**
  - 실패 2건은 전부 `tests/e2e/space-frame-view.spec.ts` — **기준 커밋 `e9dbb9e`에서 이미 실패**
    (변경 전 baseline 실측 **3 failed / 145 passed**). 이번 스펙이 그중 production-route 1건을 해소했고,
    남은 2건은 허용 파일 목록 밖이라 손대지 않았다 (§7, `QUESTIONS` Q1).
  - 신규/갱신 production-route 6건은 **전부 PASS**
- safe-state Canvas **0**, catalog/proof/art 외부 요청 **0**(인증 전후 모두), retry **0**
- console error/warning **0**, `pageerror` **0**
- accessibility serious/critical **0** (axe)
- 320px 가로 overflow **0** (`scrollWidth <= clientWidth`)
- 실제 외부 egress **0** — 모든 HTTPS 정규식 catch-all 유지, exact 2 URL만 합성 응답
- `git diff --check` **PASS**
- `package.json` / `pnpm-lock.yaml` / `firebase.json` / `firestore.rules` / `storage.rules` diff **0**, 신규 의존성 **0**
- 포트 4183/4184/4185/8080/9099/9199 잔류 **0**
- 고객 production entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
  (직전 `index-Df973d19.js` 320,713 / `4389D6D6...` 대비 +1,305 bytes = 안내 UI + CSS)

### 주의 — 보호 파일 부수효과

`tests/e2e/mockup-browse.spec.ts`는 전체 E2E 실행 시 `docs/rebuild/results/spec-018/*.png` 2개를
**무조건 다시 쓴다**. 따라서 "전체 Chromium E2E 실행" 요구를 만족시키는 과정에서 두 PNG의 mtime이
갱신됐다. 두 파일은 보호 대상이므로 **stage/commit/restore하지 않았고** working tree에 그대로 둔다.

### NOT TESTED / 금지 유지

실제 Firebase project/token/document, 운영 V1 scene 분포, 실제 catalog/proof object, CORS, 실기기·실폰트
렌더, V2 schema/fingerprint/issuer, admin orientation UI, migration/재발급, write/publish/deploy/cutover.

### 상태

**READY_FOR_CODEX.** Codex 독립 검수 전 최종 DONE으로 확정하지 않는다. 다음 V2/admin UI 스펙은 자동
시작하지 않는다.
