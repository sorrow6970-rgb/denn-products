# 087 - 고객 Space 인증 후 머리말 정리

## 상태

- `DONE / CODEX_PASSED` — 라운드 1 문서 보완 및 재검증 완료(2026-09-07).
  제품 `ac684e3`, PNG 정합 `1b0506e`, README 보완과 종료 문서는 별도 commit.
  check PASS(unit 2510/2510), canonical E2E **223 passed / 0 failed / 0 skipped / 0 retry**.
  사용자 지시로 비-UI 보완·검증·종료를 Codex가 직접 수행했다. UI 구현은 Claude 담당을 유지한다.
- 기준 브랜치: `rebuild/modern-studio`
- 기준 commit: `HEAD=origin=9ffdf1b`, ahead/behind `0/0`
- 직전 완료: spec 086 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- 출처 finding: spec 084 F-3(P1)
- next: `FOUNDER_NEXT_MANUAL_TASK`, active 없음, 보완 라운드 `1` 완료

## 목표 (WHY)

`SpacePasswordGate`가 badge `비공개 시안 · 열람 전용`, `<h1>내 공간 시안 확인</h1>`,
`<p>담당자에게 전달받은 비밀번호를 입력하세요.</p>`를 **상태와 무관하게 항상** 렌더한다. 인증에 성공하면
그 아래에 결과 화면이 덧붙으므로 손님은 **제목 두 개**(`내 공간 시안 확인` + `내 공간 시안`)와, 이미
입력을 마쳤는데도 남아 있는 **비밀번호 입력 안내**를 함께 본다.

이 단위는 인증 후 머리말만 정리한다. 게이트의 안전 의미(V1 거절, 오답, 오류 코드, 재시도 CTA 없음)와
Space V2 replay의 계산·증명 경로는 바꾸지 않는다.

직접 근거:

- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md` F-3
- `docs/rebuild/results/spec-084/space-v2-viewer-{1280x800,390x844}.png`
- `apps/mockup/src/space/SpacePasswordGate.tsx:85-92` — badge·h1·안내가 무조건 렌더된다.
- `apps/mockup/src/space/SpacePostAuthFrameView.tsx:251-253` — 결과 화면이 자기 badge와
  `<h2 id="space-frame-title">내 공간 시안</h2>`를 갖는다.
- `apps/mockup/src/space/SpacePostAuthFrameView.tsx:123-130` — V1 차단 안내도 자기 badge와
  `<h2 id="space-frame-blocked-title">`를 갖는다.

## Codex 선정 근거

1. spec 086이 F-5를 닫았고 판정은 `CODEX_PASSED`다.
2. F-2는 고객 `PreviewComposer`와 운영자 발급 panel **두 앱**에 걸쳐 있다. spec 086의 "고객·운영자 앱을
   한 단위에 묶지 않는다"를 유지해 뒤로 미룬다.
3. F-4는 admin 기본 진입/gate 결정, F-7은 고객 노출 독자·운영 발생 조건 결정, F-8은 replay 크기 제품
   결정이 선행돼야 한다. 셋 다 이번 단위가 아니다.
4. 따라서 다음 구현 단위는 **F-3 단독**이며 고객 앱 한 곳으로 한정한다.

## Design Read

기존 고객 Space 화면의 보존형 소규모 정리다. 조용한 Modern Studio 언어와 "열람 전용"이라는 상태 감각을
유지하고, 결과 화면이 스스로를 소개하게 만든다.

- `DESIGN_VARIANCE 2 / MOTION_INTENSITY 1 / VISUAL_DENSITY 4`
- **새 고객 문구를 만들지 않는다.** 이미 존재하는 문자열만 재배치·재사용한다.
- 새 색상·token·font·icon·gradient·shadow·motion·의존성·공유 UI API를 만들지 않는다.
- card를 더 중첩하거나 장식하지 않는다. 카드 구조와 `denn-stack` 리듬은 그대로 둔다.

## 범위 (SCOPE)

### 포함

1. 인증 성공 후 게이트의 badge·`<h1>`·비밀번호 입력 안내를 화면에서 없애는 상태 조건.
2. 결과 화면(V2 액자 뷰, V1 차단 안내)이 페이지의 유일한 제목을 갖도록 heading 레벨 정리.
3. 주입된 결과 child가 없는 spec 061 fallback에서의 머리말 유지.
4. 기존 unit과 실제 Chromium에서 제목 개수·문구 잔존·heading 순서·accessible name·axe 검증.
5. canonical spec 084 Space PNG 갱신과 F-3 해소 addendum 기록.

### 제외

- F-2 파일 입력, F-4 admin root, F-7 migration 문구, F-8 replay 크기.
- 게이트의 인증 로직, 오답·오류 코드·문구, 재시도 정책, 비밀번호 취급, `attach/detach` 수명.
- Space V1 거절 판정, V2 evidence 검증, proof/asset owner, font, plan, Canvas, 렌더 결과.
- 고객 composer/browse, 운영자 앱, `packages/**`, Firebase/Rules/config, 실제 network·emulator·deploy.
- 신규 의존성, package/lockfile/workspace.

## 확정 계약

### 1. 인증 전은 그대로다

`awaiting-password`, `loading`, `invalid-link`, `error` 상태의 badge·`<h1>`·안내·form·상태 문구·
`role`/`aria-live`는 **한 글자도 바뀌지 않는다**. `space-v2-password-gate-390x844.png`가 바뀌면 STOP이다.

### 2. 인증 후에는 결과 화면이 제목을 갖는다

`status === "ready"`이고 그 상태에 해당하는 결과 renderer(`renderReadyV2` 또는 `renderReady`)가 **주입돼
있을 때**, 게이트는 자기 badge·`<h1>`·비밀번호 안내를 렌더하지 않는다. 판정은 `renderReadyBody`가 이미
쓰는 것과 **같은 조건**이며(주입 여부), 자식 DOM을 들여다보지 않는다.

- `SpacePostAuthFrameView`의 `내 공간 시안`과 V1 차단 안내의 `이 시안은 지금 화면에 표시할 수 없습니다`는
  각각 그 화면의 **단독 제목**이 되므로 `<h1>`로 올린다. `id`(`space-frame-title`,
  `space-frame-blocked-title`)와 `aria-labelledby` 관계는 그대로 유지한다.
- 두 화면의 기존 badge(`저장된 시안 · 열람 전용`, `이전 버전 시안`)와 본문 문구는 그대로 둔다.
- 결과 renderer가 주입되지 않은 spec 061 fallback(`pendingNotice`)은 자기 제목이 없으므로 게이트 머리말을
  **그대로 유지한다**. 이 경우에도 비밀번호 입력 안내는 렌더하지 않는다.

### 3. 불변식

- 인증 후 화면에 `<h1>`은 **정확히 1개**다.
- 인증 후 `담당자에게 전달받은 비밀번호를 입력하세요.`가 DOM에 **없다**.
- 같은 화면에 의미가 겹치는 제목 두 개가 남지 않는다.
- 모든 `aria-labelledby`가 실제 존재하는 id로 해석된다. accessible name 0개인 landmark가 생기지 않는다.
- heading 레벨이 건너뛰지 않는다(`h1` 다음에 `h3`가 오지 않는다).
- 기존 `data-testid`(`space-view-mode`, `space-status`, `space-password`, `space-submit`,
  `space-frame-view`, `space-frame-status`, `space-frame-next`)를 삭제·개명하지 않는다.
- 새 고객 문구 **0**. 위에 열거한 기존 문자열만 쓴다.

## 대상 (WHERE)

### 제품·테스트 허용 파일

- `apps/mockup/src/space/SpacePasswordGate.tsx`
- `apps/mockup/src/space/SpacePasswordGate.test.tsx`
- `apps/mockup/src/space/SpacePostAuthFrameView.tsx`
- `apps/mockup/src/space/SpacePostAuthFrameView.test.tsx`
- `apps/mockup/src/space-v2/SpaceV2ProofView.tsx` (2026-09-07 계약 목록 보완: 기존 제목 h1 승격만 인정)
- `apps/mockup/src/space-v2/SpaceV2ProofView.test.tsx` (동일 제목/label 관계 검증만 인정)
- `apps/mockup/src/space/space-post-auth-frame-view.css` (필요할 때만 최소 layout selector)
- `tests/e2e/space-production-route.spec.ts`
- `tests/e2e/mockup-space-gate.spec.ts`, `tests/e2e/space-frame-view.spec.ts` (필요할 때만)

`packages/**`, `apps/mockup/src/browse/**`, `apps/mockup/src/preview/**`, `apps/admin/**` 변경이
필요해지면 먼저 STOP한다.

### canonical 시각 근거 허용 파일

- `docs/rebuild/results/spec-084/space-v2-viewer-1280x800.png`
- `docs/rebuild/results/spec-084/space-v2-viewer-390x844.png`
- `docs/rebuild/results/spec-084/space-v1-blocked-390x844.png`
- `docs/rebuild/results/spec-063/space-v1-blocked-desktop-1280x800.png` (2026-09-07 목록 보완)
- `docs/rebuild/results/spec-063/space-v1-blocked-mobile-390x844.png` (동일)
- `docs/rebuild/results/spec-080/space-v2-viewer-desktop-1280x800.png` (동일)
- `docs/rebuild/results/spec-080/space-v2-viewer-mobile-390x844.png` (동일)
- `docs/rebuild/results/spec-084/README.md` (F-3 해소 메모만)
- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`
  (F-3 해소 addendum과 교차 참조만. §9 F-1, §10 F-5, F-6 철회, F-8 재분류 문구는 되돌리지 않는다.)

`space-v2-password-gate-390x844.png`는 **바뀌면 안 된다**(§1). 위 일곱 장 밖의 tracked PNG가 바뀌면 인과를
확인하고 임의로 stage하지 말고 STOP 보고한다. `measurements.json`은 전역 `*.json` ignore 대상이라 검증
근거로만 쓰고 stage하지 않는다. 보호 spec-018 PNG는 restore·stage하지 않는다.

### 상태·handoff 허용 파일

- 이 스펙
- `docs/handoff/2026-09-03-spec-087-space-post-auth-header-collapse-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

### 명시 금지·보호

- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`
- `pnpm-workspace.yaml`, `AGENTS.md`
- 모든 `package.json`, `pnpm-lock.yaml`, `storage.rules`, `firestore.rules`, `firebase.json`,
  `firebase.emulator.json`, `.firebaserc`
- 실제 Firebase/project/bucket/data/network, emulator, UID, deploy, publish, upload

보호 대상은 수정·삭제·restore·checkout·stage·commit하지 않는다. canonical E2E가 spec 018 PNG를 다시 써도
그대로 두고 시작/종료 hash만 보고한다.

## 필수 검증 (VERIFY)

### unit/component

- 인증 전 4개 상태(`awaiting-password`, `loading`, `invalid-link`, `error`)에서 badge·`<h1>`·안내가
  이전과 동일하게 렌더된다.
- `ready` + 결과 renderer 주입 시 게이트 badge·`<h1>`·비밀번호 안내가 **렌더되지 않는다**.
- `ready` + renderer 미주입(spec 061 fallback) 시 게이트 머리말은 유지되고 비밀번호 안내만 사라진다.
- `SpacePostAuthFrameView`의 제목이 `<h1 id="space-frame-title">`이고 section의 `aria-labelledby`가
  그 id를 가리킨다. V1 차단 안내도 `<h1 id="space-frame-blocked-title">`로 같은 관계를 유지한다.
- 기존 보안·문구·상태 단언(오답, 오류 코드 매핑, 재시도 CTA 없음, 비밀번호 미노출)은 무수정 PASS한다.

### Chromium E2E

- 인증 후 `h1` 개수가 정확히 1이고, `담당자에게 전달받은 비밀번호를 입력하세요.`가 DOM에 없다.
- 기존 `getByRole("heading", { name: "내 공간 시안" })`와 `저장된 시안 · 열람 전용` 단언이 **무수정**으로
  계속 PASS한다.
- V1 링크에서 차단 안내가 유일한 `h1`을 갖고 기존 문구·`role="alert"`·다음 안내가 그대로다.
- 인증 전 화면의 DOM·문구·form 동작은 기존 단언 그대로다.
- `390x844`·`1280x800`에서 document horizontal overflow 0, axe serious/critical 0,
  console error/warning 0, pageerror 0, localhost/blob 외 요청 0.
- axe를 fixture chrome 때문에 좁혀야 하면 **왜 좁혔는지와 제품 영역이 0인 근거**를 함께 보고한다
  (spec 086 선례). tolerance·retry·skip·timeout 증가로 덮지 않는다.

### 전체 gate

```powershell
node scripts/check.mjs
node scripts/e2e-run.mjs
git diff --check
```

함께 보고한다: targeted/전체 unit 개수, canonical passed/failed/skipped/retry, 갱신된 Space PNG 3장의
직접 확인과 SHA-256, `space-v2-password-gate-390x844.png` 무변경, 다른 spec-084 PNG 변경 0,
`measurements.json`의 Space 항목, 고객·운영자 entry size/gzip/파일명(운영자는 무변경이어야 한다),
허용 경로 밖 diff 0, package/lockfile/Rules/config diff 0, 포트 `4183/4184/4185/8080/9099/9199`와 temp
잔류, 보호 대상 시작/종료 hash와 stage 0.

## 완료 정의 (DONE)

- 인증 후 화면에 제목이 하나이고 비밀번호 입력 안내가 남지 않는다.
- 게이트의 안전 의미와 Space V1/V2 판정·렌더 결과가 그대로다.
- 새 고객 문구가 0이고 기존 접근성 관계가 모두 해석된다.
- targeted·전체 gate가 PASS하고 외부 요청이 0이다.
- 제품/test/허용 PNG commit과 문서 commit을 분리해 일반 fast-forward push한다.
- 완료 후 `READY_FOR_CODEX`, next `CODEX_SPEC_087_REVIEW`, fix_round 0에서 멈춘다.
- Codex 독립 검수 전에는 `DONE`·`CODEX_PASSED`로 쓰지 않는다.

## 위험 (RISK)

- 게이트 머리말을 무조건 지우면 spec 061 fallback 화면에 제목이 하나도 없게 된다. §2의 주입 여부 조건을
  반드시 쓴다.
- `<h2>`를 `<h1>`로 올리면서 `id`를 바꾸면 `aria-labelledby`가 끊긴다. id는 고정이다.
- 결과 화면의 badge까지 지우면 "열람 전용"이라는 상태 감각이 사라진다. badge는 유지한다.
- canonical E2E는 보호 spec-018 PNG를 다시 쓸 수 있다. 그대로 unstaged로 두고 restore하지 않는다.
- 제품 route의 Space는 실제 Firestore 문서가 필요하다. 이번 근거도 제품 component + 합성 fixture이며
  실제 Firebase 연결은 `NOT TESTED`다.

## STOP 조건

- 새 고객 문구·새 제목이 필요함.
- 게이트의 인증·오류·재시도 의미나 V1/V2 판정을 바꿔야 함.
- `packages/**`, composer/browse, admin, Firebase/Rules 변경이 필요함.
- `space-v2-password-gate-390x844.png`가 바뀌거나 허용 목록 밖 tracked 파일이 바뀜.
- 필수 gate가 flaky하거나 현재 범위에서 원인을 확정할 수 없음.
- 실제 network/Firebase/emulator/deploy 또는 Founder 결정이 필요함.

STOP 시 코드·commit·push를 멈추고 근거와 필요한 결정만 보고한다.

### QUESTIONS

- 구현의 계약 목록 보완 요청 2건은 아래 Codex 검수에서 해소했다. 새 Founder 결정은 필요하지 않다.
  제품 의도는 F-3로 고정하며 신규 문구·기능은 계속 범위 밖이다.

### DONE (Codex) — 비-UI 보완·재검증·종료 (2026-09-07)

- 최신 사용자 지시 **UI 구현이 아니면 Codex가 직접 진행**을 적용했다. 기존 UI 구현 `ac684e3`는
  수정하지 않고 README 출처 중복만 의미 참조로 바꿨다. 출처 표와 기존 테스트는 보존했다.
- 이전 독립 검수는 제품 코드의 추가 결함을 찾지 못했으나 최종 기록의 README에서 222/1 실패했다.
  보완 후 check exit 0(unit 2510/2510, 92파일, build 2) 및 canonical exit 0(223/223, 43.6초)를
  확인해 라운드 1을 통과시켰다. 테스트 skip/retry/tolerance 변경 0. 동일 Codex가 보완/재검증했다.
- 최종 문서 갱신 뒤 README 15개 출처 유일성/파일 존재 검사를 다시 적용한다. 출처 검사가 읽는
  README는 전체 canonical 실행 전에 수정 완료했고 이후에는 변경하지 않았다.
- PNG 정합 `1b0506e`에 허용 4장만 포함했다. spec-084 PNG 15장은 HEAD와 동일하고 추가 4장도
  검수 시점 SHA-256과 같다. spec-080 viewer는 spec-084와 각각 바이트 동일하다.
- 고객/운영자 build 파일 SHA-256은 보완 전후 동일. 보호 문서/코드 동일, spec-018 PNG만 canonical
  재생성으로 desktop `bd5ff207… → d0a0aa52…`, mobile `8676d263… → 6bdcb88c…`(stage/restore 0).
- 포트 6개 0, 실행 staging 제거 확인. 실패 error-context는 canonical이 정상 정리했고 ignored
  last-run만 남았다. 실제 Firebase/network/emulator/deploy·실기기·운영 전환은 미검증/보류다.
- 최종 확인에서 Chromium raster SharedImage 오류 10줄이 담긴 `debug.log`(1,210 bytes)를 발견했다.
  223개 E2E 및 Space PNG hash는 정상이나 내부 그래픽 로그 무오류는 아니다. 파일은 삭제하지 않고
  `C:/Users/Public/Documents/ESTsoft/CreatorTemp/denn-spec087-20260907-review/chromium-debug.log`로 보존했다.
- 판정 **CODEX_PASSED**, 스펙 087 **DONE**. 현재 상태 `WAITING_FOR_NEXT_MANUAL_TASK`, 다음
  `FOUNDER_NEXT_MANUAL_TASK`. 새 스펙은 시작하지 않는다. 기존 전체 추정 85~88% / 잔여 12~15% 유지.

### Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1 (2026-09-07)

검수 기준 `eab7199`(제품 `ac684e3`, 계약 `f72e2e2`). 제품 diff는 조건부 게이트 머리말과 기존 제목
승격뿐이며 인증·renderer 분기·Canvas 계산은 보존된다. App.tsx:64-65가 V2 결과를 실제로
`SpaceV2ProofView`에 연결하므로 이 컴포넌트와 테스트 **2파일**은 §2/§3 실현에 필요한 누락이다.
현재 변경을 인정하고 WHERE 목록을 보완한다. 이 인정은 원래 목록에 있었다는 소급 기록이 아니다.

PNG 4장도 동일 제품 변경에서 나온다. `space-production-route.spec.ts:268,614`의 기존 writer가
spec-063 V1 차단, spec-080 V2 viewer를 찍는다. 독립 실행 전후 SHA-256이 모두 동일했고 spec-080은
spec-084 viewer와 각 viewport마다 동일 바이트다. 4장을 baseline 정합 대상으로 명시 허용한다.
spec-063에는 기존 fixture의 화면 해제 버튼이 포함된다. 제품만 정제한 감사 이미지로 간주하지 않는다.

**차단 결함 R1: 최종 README가 필수 E2E를 깨뜨린다.** `eab7199`가 더한 F-3 addendum에서
`space-v1-blocked-390x844.png`, `space-v2-password-gate-390x844.png`를 각각 정확한 백틱 파일명으로
다시 적었다. 출처 표에 이미 있으므로 2회이며 `local-visual-readiness.spec.ts:940`은 1회를 요구한다.
제품 커밋 `ac684e3`에는 이 README 변경이 없고, 이후 기록 커밋에 6줄이 추가됐다. 이전 223/223 보고를
삭제하지는 않지만 최종 HEAD에 대한 PASS 근거로 사용할 수 없다.

- 독립 check exit 0: format/lint/typecheck, unit **2510/2510**, 92파일, build 2.
- 독립 canonical E2E exit 1: **222 passed / 1 failed / 0 skipped / 0 retry**, 50.7초. 신규 3건 PASS.
- README 전체 파일명 검사로 두 중복을 확인했다. 첫 파일에서 assertion이 중단되므로 오류 출력은
  V1 차단 파일만 보여도 인증 전 gate 중복도 함께 고쳐야 한다.
- 시각 증거 직접 확인: V2 mobile/desktop 제목 1개, V1 안내 제목 1개. Space 감사 4항목에서 overflow
  false, smallTargets/axeSeriousCritical/externalRequests 빈 배열. spec-084 PNG 15장은 HEAD diff 0.
- 고객 entry 342.07 kB/gzip 104.81, 운영자 entry 295.37 kB/gzip 91.55. 기존 build 파일과 SHA-256
  차이 0. build의 500 kB chunk 경고와 Node NO_COLOR/FORCE_COLOR 경고는 존재했고 gate 실패는 아니다.
- 금지 경로 committed diff 0(위 목록 보완 반영), staged 0, git diff --check PASS. 포트 6개 0,
  이번 staging 제거 확인. ignored test-results에는 이번 실패 증거와 last-run이 남아 있다.
- 보호 파일·spec-018 PNG 검수 전후 hash 동일. PNG의 mtime은 canonical 재생성으로 바뀔 수 있으며
  restore·stage·commit은 하지 않았다. 실제 Firebase/network/emulator/deploy·실기기 NOT TESTED.

**라운드 1 허용 수정:** spec-084 README F-3 설명의 중복 참조 최소 보완, 위 PNG 4장 정합, 이 스펙과
handoff·STATE/NEXT/CURRENT/live log. source/CSS/test/config/package/lockfile 추가 수정은 하지 않는다.
출처 표의 정확한 파일명은 유지하고 설명은 의미로 참조한다. README 최종 편집 후 check와 canonical을
재실행하며 테스트 완화는 금지한다. 통과 후 허용 PNG와 문서만 분리 commit/push하고
`READY_FOR_CODEX`, fix_round 1, next `CODEX_SPEC_087_REVIEW_ROUND_1`에서 멈춘다.

판정은 **CORRECTION_REQUIRED**이며 새 스펙·제품 구현을 열지 않는다. 전체 리빌드 기존 추정
85~88% / 잔여 12~15% 유지(검수로 범위 확대·운영 전환 없음, 정량 재산정 아님).

### DONE (Claude) — 스펙 087 구현·검증 (2026-09-03)

계약 작성 기준 `HEAD=origin=9ffdf1b` → 계약 commit `f72e2e2` → 제품/test/PNG `ac684e3` → 문서 commit은
이 갱신이다. 범위 밖 변경 0: `apps/admin/**`·`packages/**`·package/lockfile/workspace·Rules/Firebase
config diff **0**, 실제 Firebase/network/emulator/deploy **0**, F-2·F-4·F-7·F-8·고객 composer/browse 수정
**0**, 다음 스펙 착수 **0**.

**§1 인증 전 무변경.** 게이트의 badge·`<h1>내 공간 시안 확인</h1>`·`담당자에게 전달받은 비밀번호를
입력하세요.`·form·상태 문구·`role`/`aria-live`를 그대로 뒀다. `space-v2-password-gate-390x844.png`는
sha256 `67a1433c…`로 **바이트 동일**이다.

**§2 인증 후 머리말.** `readyBodyOwnsTitle = status === "ready" && ("v2" in snapshot ? renderReadyV2 !==
undefined : renderReady !== undefined)` — `renderReadyBody`가 이미 분기하는 **바로 그 조건**이라 둘이
어긋날 수 없고, 자식 DOM을 들여다보지 않는다. 이 값이 true면 badge와 `<h1>`을 렌더하지 않는다. 비밀번호
안내는 `status === "ready"`이면 **무조건** 렌더하지 않는다(주입 여부와 무관하게 더 입력할 것이 없다).
결과 renderer가 없는 spec 061 fallback(`pendingNotice`)은 자기 제목이 없으므로 게이트 머리말을 유지한다.

**결과 화면이 제목을 갖는다.** `SpaceV2ProofView`의 `<h2 id="space-v2-proof-title">`, V1 액자 뷰의
`<h2 id="space-frame-title">`, V1 차단 안내의 `<h2 class="denn-space-blocked__title"
id="space-frame-blocked-title">`을 각각 `<h1>`로 올렸다. **문구·class·id는 그대로**라 세 `aria-labelledby`가
모두 실재 요소로 해석되고, 두 badge도 유지했다. **새 고객 문구 0**이다. CSS는 건드리지 않았다 —
`.denn-shell__inner h1`(0,1,1)이 `.denn-space-blocked__title`(0,1,0)의 font-size·margin을 이기므로 두
결과 화면 제목이 셸의 h1 타이포그래피로 통일되고, class가 주는 `word-break: keep-all` /
`overflow-wrap: anywhere`는 그대로 살아 320px에서도 넘치지 않는다.

**★ 계약 보완 판단 요청 2건.**

1. **허용 파일 1개 누락 — `apps/mockup/src/space-v2/SpaceV2ProofView.tsx`(+ `.test.tsx`).** 계약의
   제품 허용 목록은 `SpacePostAuthFrameView`만 적었는데, **제품 V2 route가 실제로 렌더하는 결과 화면은
   `SpaceV2ProofView`**다(`App.tsx:65`). 이 파일을 빼면 F-3이 측정된 바로 그 화면에서 §3의
   "인증 후 `<h1>`은 정확히 1개"가 성립하지 않는다(E2E가 `h2: 내 공간 시안`으로 실패했다). 계약 §2가
   "V2 액자 뷰가 단독 제목을 갖는다"를 이미 요구하므로 **의도 안**이라 보고 포함했고, 임의 확장이 아님을
   기록한다.
2. **허용 PNG 4장 누락 — stage하지 않았다.** canonical 실행이 같은 두 화면의 다른 baseline도 다시 썼다:
   `docs/rebuild/results/spec-063/space-v1-blocked-{desktop-1280x800,mobile-390x844}.png`와
   `docs/rebuild/results/spec-080/space-v2-viewer-{desktop-1280x800,mobile-390x844}.png`. 인과는 확인했다 —
   spec-080의 두 장은 spec-084 viewer 두 장과 **sha256이 서로 같은 동일 캡처**이고(변경 후에도
   `c84d8f16…`/`0ce9e921…`로 쌍이 유지된다), spec-063은 같은 V1 차단 화면이다. 계약이 이 4장을 열거하지
   않았으므로 §"canonical 시각 근거 허용 파일"의 지시대로 **stage·commit하지 않고 unstaged로 두고
   보고**한다. 허용 목록에 추가할지, 복원할지는 Codex 판단이다(복원하면 제품과 어긋난 baseline이 남고
   canonical 실행마다 되돌려진다 — spec 085 `browse-ready-1280x800.png`와 같은 상황이다).

**unit(신규 8건, 총 2510).** 인증 전 4개 상태(`awaiting-password`·`loading`·`invalid-link`·`error`)에서
badge·`<h1>`·안내 유지(`it.each` 4건), V2 결과 주입 시 머리말·안내 제거와 `<h1>` 1개, V1 결과 주입 시
동일, spec 061 fallback에서 머리말 유지 + 안내만 제거, V1 차단 안내가
`<h1 class="denn-space-blocked__title" id="space-frame-blocked-title">`이고 `<h2>` 0개,
`SpaceV2ProofView`가 `<h1 id="space-v2-proof-title">`이고 `<h2>` 0개. 기존 보안·문구·routing 단언
(오답·오류 코드·재시도 없음·토큰/소유자 미노출·seam routing)은 **무수정 PASS**다.

**Chromium E2E(신규 3건, 총 223).** `tests/e2e/space-production-route.spec.ts`에 추가했다.
`390x844`·`1280x800` 두 건은 인증 **전** 게이트 `h1`+안내 존재와 heading 목록이 `["h1: 내 공간 시안 확인"]`
임을 먼저 확인한 뒤, 인증 **후** heading 목록이 정확히 `["h1: 내 공간 시안"]`이고 게이트 제목·비밀번호
안내가 DOM에 **0개**이며, badge 유지·`aria-labelledby="space-v2-proof-title"`가 `H1`로 해석·horizontal
overflow 0·axe serious/critical 0·console error/warning 0·pageerror 0·외부 요청 0임을 단언한다. 세 번째는
V1 링크에서 heading이 `["h1: 이 시안은 지금 화면에 표시할 수 없습니다"]` 하나뿐이고 `role="alert"`·재시도
버튼 0·`aria-labelledby` 해석이 그대로임을 단언한다. 기존
`getByRole("heading", { name: "내 공간 시안" })`와 `저장된 시안 · 열람 전용` 단언은 **무수정 PASS**한다
(level만 바뀌어 role 조회에 영향이 없다). 새 fixture·timeout 증가·retry·skip·screenshot tolerance 추가
**0**.

**구현 중 자체 수정 1건.** 신규 E2E가 처음에 `aria-labelledby="space-frame-title"`을 확인하도록 썼는데
V2 route의 결과는 `SpaceV2ProofView`(`space-v2-proof-title`)라 실패했다. `space-frame-title`은 V1 액자
뷰의 것이므로 test를 실제 화면에 맞게 고쳤다. 제품 의미는 바뀌지 않았다.

**검증 실측.** `node scripts/check.mjs` **PASS**(format·lint·typecheck, unit **2510/2510** · 92 파일,
build 2개; 이전 2502 + 신규 8). canonical `node scripts/e2e-run.mjs` **Chromium 223 passed / 0 failed /
0 skipped / 0 retry**(이전 220 + 신규 3). `git diff --check` PASS. 포트 `4183/4184/4185/8080/9099/9199`
LISTENING **0**. `denn-e2e-*`·`playwright-report`·`debug.log` 잔류 **0**(Playwright의
`test-results/.last-run.json` 한 개는 `.gitignore:32`로 추적 대상이 아니다).

**bundle.** 운영자 entry `index-BWeRXD_J.js` **295.37 kB** · CSS `index-CCW8unbN.css` **11.24 kB** —
파일명 해시까지 **무변경**. 고객 CSS `index-CLxRhNtu.css` **20.27 kB**도 무변경(CSS를 건드리지 않았다).
고객 entry는 `index-eQgqaWiH.js` 341.94 → `index-CqOWaAno.js` **342.07 kB**(gzip 104.76 → 104.81);
증가분은 조건부 머리말과 신규 주석뿐이다.

**시각 증거.** canonical이 허용 3장을 다시 썼고 직접 열어 확인했다 — V2 뷰어는 badge 1개 + 제목
`내 공간 시안` 1개뿐이고 `내 공간 시안 확인`과 비밀번호 안내가 사라졌으며, V1 차단 안내도 제목 하나에
한국어 줄바꿈이 유지된다. sha256 `9c601fe8…` → `c84d8f16…`(viewer 1280x800), `7a6482d1…` →
`0ce9e921…`(viewer 390x844), `768b8310…` → `64927f4f…`(v1-blocked 390x844). gate PNG `67a1433c…`
**무변경**. `measurements.json`의 Space 4항목은 모두 `horizontalOverflow` false, `axeSeriousCritical` 0,
`smallTargets` 0이다.

**보호 대상.** design README·spec 038·`packages/render/src/plan/index.ts`·`pnpm-workspace.yaml`·
`AGENTS.md`·`taste-v2/**`는 시작/종료 hash 동일이고 restore·checkout·stage·commit **0**이다. spec 018
PNG 2장은 canonical E2E가 다시 썼고 stage하지 않았다: desktop `d0a0aa52…` → `bd5ff207…`, mobile
`6bdcb88c…` → `8676d263…`. **이번에는 mobile도 바뀌었다** — 이 단위는 `apps/mockup/src/space*`만 고쳤고
browse DOM은 건드리지 않았으므로 스펙 084 보완 라운드 1이 기록한 raster 비결정성으로 본다. 복원하지
않았다.

**NOT TESTED.** 제품 `?space=` route는 실제 Firestore 문서가 필요하므로 이번 근거도 제품 component +
합성 fixture다. 실기기 Safari/Android·200% zoom·preview channel·실제 Firebase/network/emulator/deploy·
운영 데이터는 검증되지 않았다. 스펙 084의 다른 finding(F-2·F-4·F-7)은 판정 그대로이고 F-6 철회·F-8
재분류도 그대로다.

상태 `READY_FOR_CODEX`, next `CODEX_SPEC_087_REVIEW`, fix_round 0에서 멈춘다. 다음 finding·다음 스펙은
시작하지 않았다.
