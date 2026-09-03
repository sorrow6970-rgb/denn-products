# 087 - 고객 Space 인증 후 머리말 정리

## 상태

- `READY_FOR_CLAUDE / CONTRACT_ONLY / NO_LIVE_NETWORK`
- 기준 브랜치: `rebuild/modern-studio`
- 기준 commit: `HEAD=origin=9ffdf1b`, ahead/behind `0/0`
- 직전 완료: spec 086 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- 출처 finding: spec 084 F-3(P1)
- next: `CLAUDE_SPEC_087_IMPLEMENT`

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
- `apps/mockup/src/space/space-post-auth-frame-view.css` (필요할 때만 최소 layout selector)
- `tests/e2e/space-production-route.spec.ts`
- `tests/e2e/mockup-space-gate.spec.ts`, `tests/e2e/space-frame-view.spec.ts` (필요할 때만)

`packages/**`, `apps/mockup/src/browse/**`, `apps/mockup/src/preview/**`, `apps/admin/**` 변경이
필요해지면 먼저 STOP한다.

### canonical 시각 근거 허용 파일

- `docs/rebuild/results/spec-084/space-v2-viewer-1280x800.png`
- `docs/rebuild/results/spec-084/space-v2-viewer-390x844.png`
- `docs/rebuild/results/spec-084/space-v1-blocked-390x844.png`
- `docs/rebuild/results/spec-084/README.md` (F-3 해소 메모만)
- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`
  (F-3 해소 addendum과 교차 참조만. §9 F-1, §10 F-5, F-6 철회, F-8 재분류 문구는 되돌리지 않는다.)

`space-v2-password-gate-390x844.png`는 **바뀌면 안 된다**(§1). 위 세 장 밖의 tracked PNG가 바뀌면 인과를
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

- 없음. 범위는 spec 084 F-3의 머리말 정리로 고정됐고, 새 문구가 필요해지는 순간 STOP한다.
