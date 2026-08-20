# 스펙 063 space V1 안전 차단 viewer UI/UX handoff

- 상태: `IMPLEMENTED / READY_FOR_CODEX / LOCAL_ONLY / NO_NETWORK / NO_DEPLOY`
- 정본: `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md`
- 기준: `e9dbb9e` (스펙 062 종료)
- 담당: Claude (Founder FF-5=A)

## 무엇을 고쳤나

스펙 062 이후 기존 `?space=` 링크는 비밀번호를 통과한 뒤 `시안을 표시할 수 없습니다.` 한 줄만
보여줬다. 그것도 **카탈로그를 받고 · proof 사진을 요청하고 · 폰트를 확인하고 · Canvas plan을 시도한
뒤**였다. 성공할 수 없는 것이 확정된 경로에 네트워크·디코드를 쓰고, 고객에게는 아무 설명도 없었다.

1. **V1 preflight gate** — `SpacePostAuthFrameView`가 catalog load / proof owner / Image decode /
   font load / Canvas plan **이전에** V1 replay 자격을 판정한다. blocked면 그 뒤 단계가 하나도
   시작되지 않는다.
2. **안전 차단 UI** — Modern Studio 토큰만 쓴 차분한 한국어 안내.

## 구조 (React hook 규칙)

```text
SpacePostAuthFrameView(props)          ← export. useMemo 1개만 무조건 호출
  └ preflightSpaceV1Replay(scene)      ← pure. imgT 1회 read + classifySpaceV1FrameReplay
       ├ blocked              → <SpaceReplayBlockedNotice/>      (hook 0개)
       └ exact-replay-proven  → <SpaceExactFrameComposition/>    (기존 hook 전부, module-private)
```

- 조건부 hook 호출 0. 분기는 **자식 컴포넌트 선택**이다.
- `SpaceExactFrameComposition`은 export하지 않는다 → gate를 우회하는 seam이 없다.
- `scene.design.imgT` 접근은 try/catch. hostile getter는 예외가 아니라 blocked로 떨어진다.
- `exact-replay-proven`은 오늘 도달 불가능하다(`classifySpaceV1FrameReplay`가 항상 실패). 향후
  explicit-orientation scene version 자리이며 의도된 미도달 상태다.
- 기존 owner/readiness/font lifecycle 계약은 proven 경로에서 그대로다.

## 화면 문구

- 뱃지 `이전 버전 시안`
- 제목 `이 시안은 지금 화면에 표시할 수 없습니다`
- `이 링크는 이전 버전에서 발급된 시안입니다.`
- `현재 버전에서는 발급 당시의 액자 방향과 사진 구도를 정확히 증명할 수 없습니다.`
- `구도를 임의로 바꿔 보여드리지 않기 위해 시안 표시를 안전하게 중단했습니다.`
- `담당자에게 새 시안 링크를 요청해 주세요.`

표시하지 않는 것: 오류 코드·URL·token·비밀번호·catalog/template/size ID·UID·SDK 메시지,
Canvas·이미지 placeholder·스켈레톤, 재시도 버튼, 카카오/외부 링크.
접근성: `section[aria-labelledby]` + `h2` + 본문 `role="alert"`, 자동 포커스 이동 없음(이중 낭독 방지),
인터랙티브 요소 0 → 키보드 트랩 0, 320px 가로 overflow 0.

## 검증

- targeted unit `SpacePostAuthFrameView.test.tsx` **15/15 PASS**
- `node scripts/check.mjs` **PASS** — format/lint/typecheck ×7/unit **1627/1627**(70 files)/build ×2
- 전체 Chromium E2E **151 passed / 0 failed** (변경 전 baseline 실측 3 failed / 145 passed)
- safe-state Canvas **0**, catalog/proof/art 요청 **0**(인증 전후), retry **0**
- console error/warning **0**, pageerror **0**, axe serious/critical **0**
- 320px `scrollWidth <= clientWidth` **PASS**
- 실제 외부 egress **0** (모든 HTTPS 정규식 catch-all, exact 2 URL만 합성 응답)
- `git diff --check` PASS · `package.json`/lockfile/Rules/firebase config diff **0** · 신규 의존성 **0**
- 포트 4183/4184/4185/8080/9099/9199 잔류 **0**
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- 시각 결과 `docs/rebuild/results/spec-063/space-v1-blocked-{mobile-390x844,desktop-1280x800}.png`

## Founder Q1 = A (해소됨)

`tests/e2e/space-frame-view.spec.ts`(스펙 060 fixture E2E) 2건은 기준 커밋 `e9dbb9e`에서 **이미
실패 중**이었다(변경 전 baseline 실측 3 failed / 145 passed). 스펙 062가 `composeSpaceFramePlan()`을
fail-closed로 바꾸면서 `preview-canvas`가 사라졌는데, 스펙 062는 FF-5=A 범위 밖이라 E2E를 실행하지도
수정하지도 않았다.

Founder가 **A**를 선택해 이 spec 파일만 허용 목록에 추가했다. fixture
`apps/mockup/src/e2e/space-frame-fixture.tsx`는 **변경하지 않았다**. 그 계측 자산을 그대로 살려,
production route가 할 수 없는 검증을 한다 — 주입된 catalog reader·readiness factory·font
environment가 **호출되지조차 않았음**. 도달 불가해진 canvas 단계 단언은 스펙 §7.2에 대체 coverage를
명시하고 제거했다. 결과: 전체 Chromium E2E **151 passed / 0 failed**.

## 보호 파일 부수효과

`tests/e2e/mockup-browse.spec.ts`가 전체 E2E 실행마다 `docs/rebuild/results/spec-018/*.png` 2개를
무조건 다시 쓴다. "전체 Chromium E2E 실행" 요구를 만족하는 과정에서 두 PNG의 mtime이 갱신됐다.
보호 대상이므로 **stage/commit/restore하지 않고** working tree에 그대로 뒀다.

## NOT TESTED / 금지

실제 Firebase project/token/document, 운영 V1 scene 분포, 실제 catalog/proof object, CORS,
실기기·실폰트 렌더는 NOT TESTED. V2 schema/fingerprint/issuer, admin orientation UI, V1
migration/재발급/same-token rewrite, write/publish/deploy/cutover는 NOT IMPLEMENTED 또는 금지.

다음 V2/admin UI 스펙은 자동 시작하지 않는다. Codex 독립 검수 전 스펙 063을 최종 DONE으로 확정하지
않는다.
