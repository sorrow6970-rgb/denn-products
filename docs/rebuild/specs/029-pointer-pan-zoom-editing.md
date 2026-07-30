# 스펙 029 — 고객 미리보기 이미지 이동·확대 편집

상태: **READY FOR IMPLEMENTATION**

기준은 조사 커밋 `2ded576`, Founder 결정 기록 `7701c7a`,
`docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`,
`docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`다.

## 1. 목적과 경계

현재 선택된 case/frame 이미지 슬롯의 확대와 이동을 편집한다. 기존
`computeCoverDrawRect`, `clientPointToLogical`, zone별 plan transform과 스펙 026~028의
이미지 생명주기를 재사용한다. `packages/render` 기하·plan과 스펙 026 image owner 계약은 변경하지 않는다.

## 2. 확정 계약

### 상태·환산

- composer가 슬롯별 `{scale,x,y}`를 소유한다.
- `scale`은 무차원 `1.0~5.0`, `x/y`는 현재 scale의 축별 `maxPan` 대비 `[-1,1]`이다.
- `maxPan=0`인 축은 0이다. logical px는 plan 직전에만 `normalized * maxPan`으로 환산한다.
- resize는 normalized 값을 유지하고 현재 geometry로 다시 환산한다.
- NaN/Infinity/범위 밖 값과 hostile getter/Proxy는 throw 없이 안전 실패한다. 기본값 생성이나
  잘못된 입력의 clamp 복구는 금지한다.
- 스펙 026 owner는 drawable/ref/intrinsic만 소유하고 기존 리터럴 transform을 바꾸지 않는다.

### 선택·초기화

- case multi-zone은 슬롯 카드로 선택하고 활성 슬롯을 시각·접근 가능하게 표시한다.
  캔버스 히트테스트로 슬롯을 선택하지 않는다.
- 편집 컨트롤은 활성 슬롯만 변경하며 슬롯별 transform은 독립적이다. frame은 단일 슬롯이다.
- 이미지 교체·삭제와 model/template/frame-size 변경 시 해당 transform을 `1/0/0`으로 초기화한다.
- 색상 변경과 활성 슬롯 전환에서는 유지한다. 이미지가 없는 슬롯의 편집 컨트롤은 비활성화한다.

### 확대

- 슬라이더는 100~500%이며 내부에는 1.0~5.0만 저장한다.
- 확대/축소 버튼과 휠은 동일한 `1.1` 승산 규칙(`*1.1`, `/1.1`)을 사용한다.
- 휠은 활성 편집 영역에서 실제 scale이 바뀔 때만 기본 동작을 막는다.
- 초기화 UI는 단일 `원래대로` 버튼이다.
- 핀치는 구현하지 않고 브라우저 확대 제스처를 가로채지 않는다.

### 이동·생명주기

- 마우스/pen Pointer Events와 pointer capture를 사용한다.
- 시작 logical point와 시작 transform을 snapshot하고, 누적 delta가 아닌 시작점 대비 절대 delta를
  `clientPointToLogical`로 변환한다.
- 각 축은 normalized `[-1,1]`로 제한하며 clip 안 빈 공간을 허용하지 않는다.
- `pointerup`, `pointercancel`, `lostpointercapture`, 선택 변경, unmount가 세션을 종료한다.
- generation/token으로 종료 후 늦은 이벤트를 무효화한다.
- 화살표 키는 normalized 0.02, Shift+화살표는 0.10씩 이동한다.
- pointer move 상태 반영은 requestAnimationFrame당 최대 1회로 병합한다.
- StrictMode attach→detach→attach에서 listener/capture 누수나 영구 비활성화가 없어야 한다.
- 임의 timer, 렌더 중 입력 mutation, 전역 listener 누수는 금지한다.

### 접근성·스크롤

- 확대/축소/초기화는 실제 `button`, 확대 값은 접근 가능한 `input[type=range]`를 사용한다.
- 기존 focus-visible, 44px target, console error 0, axe serious/critical 0 계약을 유지한다.
- 1차는 터치 drag와 핀치를 지원하지 않는다. 전역 `touch-action:none`과 무조건 `preventDefault()`를
  추가하지 않아 기존 페이지/가로 스크롤을 보존한다.

## 3. 오류 우선순위

1. slot/geometry/intrinsic/transform snapshot 실패
2. 유한성·범위 검증 실패
3. cover/maxPan 계산 실패
4. plan adapter/build 실패

실패 시 preview를 차단하고 부분 plan이나 이전 슬롯 transform을 재사용하지 않는다.
예외 객체, URL, imageRef, catalog 원문은 오류 payload에 넣지 않는다.

## 4. 허용 파일

- `apps/mockup/src/preview/PreviewComposer.tsx`
- `apps/mockup/src/preview/PreviewComposer.test.tsx`
- `apps/mockup/src/preview/previewContracts.ts`
- `apps/mockup/src/preview/previewContracts.test.ts`
- `apps/mockup/src/preview/imageTransform.ts` 및 `.test.ts`(신규 가능)
- `apps/mockup/src/preview/PreviewSection.tsx`
- `apps/mockup/src/canvas/surface.css`
- `tests/e2e/mockup-preview.spec.ts`
- 이 스펙, 관련 handoff/live/CURRENT/Automation 문서

금지: `packages/**`, `apps/admin/**`, 운영 HTML, Firebase/CORS/Rules/Hosting, POC,
`package.json`, `pnpm-lock.yaml`, 신규 의존성, network/live/deploy, 운영 데이터, 스펙 018 PNG 두 파일.
허용 파일 확장이 필요하면 구현을 멈추고 근거와 최소 확장안을 보고한다.

## 5. 필수 검증

Unit:

- scale 경계·승산 확대/축소·reset
- normalized↔logical 환산, 양 축 clamp, `maxPan=0`, resize 보존
- multi-zone 독립성과 frame 단일 상태
- 초기화/유지 행렬
- hostile getter/Proxy/revoked Proxy와 drift, throw 0
- pointer generation·cancel·lost capture·unmount·rAF 병합
- StrictMode listener/capture 누수 0

실제 Chromium E2E:

- 슬롯 선택과 활성 표시
- mouse drag 후 픽셀 변화, clip 빈 공간 0, 캔버스 밖 pointerup 종료
- 휠·슬라이더·버튼·키보드·Shift·`원래대로`
- 비활성 슬롯 불변, resize 후 normalized 구도 유지
- 320px/desktop 기존 스크롤, console error 0, axe serious/critical 0, 고정 sleep 0

NOT TESTED:

- 2손가락 핀치, 실제 모바일 4환경, 실제 200% 브라우저 확대
- print/export pan, 대용량 이미지의 실기기 성능

합성 이벤트나 정적 추론으로 위 항목을 PASS 처리하지 않는다.

## 6. 완료 게이트

- frozen install, lockfile diff 0, 신규 의존성 0
- format, lint, typecheck, unit, 독립 build, 전체 E2E, `git diff --check`
- bundle/CSS 예상 밖 유입 0, 포트 4183/4184·OS temp·저장소 소속 잔류 프로세스 0
- 고객 dist SHA-256 E2E 전후 동일, fixture 0
- 허용 파일과 실제 diff 일치, 스펙 018 PNG 제외
- 실제 network/live/Firebase/CORS/Rules/Hosting/deploy 0

코드·테스트와 문서 커밋을 분리해 일반 fast-forward push한다. 완료 후 HEAD=origin,
ahead/behind 0/0을 확인하고 `READY_FOR_CODEX`에서 다음 기능을 시작하지 않는다.

---

### DONE (Claude) — 2026-07-30

기준 `2ded576`(조사) · `7701c7a`(결정) → 코드/test 커밋 `95fcf92`. **Codex 독립 검증 전이므로 종료가 아니다.**
인계: `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`.

- **§2 상태·환산**: composer가 슬롯별 `{scale,x,y}`를 소유하고 `scale`은 무차원 **1.0~5.0**, `x/y`는 축별
  `maxPan` 대비 **[-1,1]**이다. `maxPan=0` 축은 0으로 고정되고 logical px는 **plan 직전에만**
  `normalized * maxPan`으로 환산한다. resize는 normalized를 유지한 채 현재 geometry로 재환산한다.
  `readNormalizedTransform`은 **범위 밖·비유한·hostile getter/Proxy trap/revoked Proxy를 거부**하며
  **clamp 복구도 기본값 생성도 하지 않는다**. 스펙 026 owner의 리터럴 transform은 **무변경**이다.
- **§2 어댑터 공식 비복제**: `maxPan`을 얻기 위해 zone/mat rect 공식을 복사하지 않고, pan 0 + 현재 scale로
  **probe plan**을 만들어 `draw-image-cover`의 `clipRect`/`drawRect`에서 축별 `maxPan`을 읽은 뒤 실제 plan을
  만든다(`maxPan`은 scale에만 의존). 두 단계 중 하나라도 실패하면 **plan을 만들지 않는다**.
- **§2 선택·초기화**: case multi-zone은 **슬롯 카드**(`aria-pressed` + `편집 중`) 선택이고 **캔버스
  히트테스트는 없다**. frame은 단일 슬롯이라 피커를 렌더하지 않는다. 이미지 교체·삭제·실패는 **그 슬롯만**,
  model/template/frame-size/kind 변경은 **전체** 초기화하며 **색상 변경과 활성 슬롯 전환은 유지**한다.
  활성 슬롯 사진이 ready가 아니면 편집 컨트롤 전부 `disabled`다.
- **§2 확대**: 슬라이더 **100~500%**(내부 1.0~5.0), 버튼·휠 모두 **`*1.1` / `/1.1`**, 초기화는 **단일
  `원래대로`**. 휠은 **실제 scale이 바뀔 때만** 기본 동작을 막는다(React `onWheel`이 passive라 비-passive
  리스너를 직접 부착). **핀치는 구현하지 않았고 브라우저 확대 제스처를 가로채지 않는다.**
- **§2 이동·생명주기**: mouse/pen Pointer Events + `setPointerCapture`, 시작 point·transform snapshot 후
  **절대 delta**(`clientPointToLogical`). 양 축 `[-1,1]` + 최소 scale 1.0이라 **클립 안 빈 공간이 생길 수
  없다**. `pointerup`·`pointercancel`·`lostpointercapture`·선택 변경·unmount가 세션을 종료하고
  **generation 가드**가 늦은 이벤트를 무효화한다. 화살표 **0.02**, Shift **0.10**. pointer move 반영은
  **rAF당 1회 병합**이며 임의 timer는 없다. unmount에서 dispose + ref 해제로 **StrictMode 재mount가 새
  컨트롤러를 만든다**(영구 비활성화 없음).
- **§2 접근성·스크롤**: 실제 `button`/`input[type=range]`, 44px, focus-visible, 고정 문구만 노출.
  **전역 `touch-action:none`도 무조건 `preventDefault`도 추가하지 않았다**(E2E가 body·area·canvas의
  `touch-action`이 모두 `auto`임을 실측) → 기존 페이지·가로 스크롤 보존.
- **§3 오류 우선순위**: snapshot → 유한성/범위 → cover/maxPan → adapter/build 순으로 실패하면 preview를
  차단하고 **부분 plan·이전 슬롯 transform을 재사용하지 않는다**. 예외·URL·imageRef·원문은 노출하지 않는다.
- **⚠️ 구현 중 결함 발견·수정**: **stale animation frame이 다음 세션의 pending 값을 소비**해 재-grab 직후
  첫 move가 사라졌다 → stale frame은 `pending`을 건드리지 않고 즉시 return하도록 수정(신규 unit이 고정).
- **unit 신규 45건**: scale 경계·승산·reset / 환산·양 축 clamp·`maxPan=0`·**resize 보존** / 거부 vs
  clamp 금지·필드 1회 읽기·throwing getter·Proxy trap·revoked Proxy·drift / 절대 delta·경계 /
  rAF 1회 병합·3종 종료·stale 무시·selection abort·**generation 가드**·dispose 후 재생성·hostile port.
- **실제 Chromium E2E 신규 5건**: drag로 반쪽 경계가 **y=50→70**(빈 공간 0, 다른 존 불변, `maxPan.x=0`
  축은 가로 drag로도 불변, 캔버스 밖 `pointerup` 후 불변) / 버튼·휠·슬라이더·키보드·`원래대로` /
  슬롯 전환에도 **두 구도 유지**·교체 시 그 슬롯만 초기화 / 액자 **1280→360 resize 후 같은 비율 지점 색
  동일**(normalized 구도 유지) / 320px 오버플로 0·`touch-action` 전부 `auto`·44px·axe 0·console 0.
- **게이트**: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck /
  **unit 938**(893 → 938) / build(mockup JS **254.06 → 263.19 kB**, gzip **78.90 → 81.56**;
  CSS **13.80 → 15.47**, gzip **3.53 → 3.88**; admin 무변경) / **e2e 90 PASS**(85 → 90)·exit 0 /
  `git diff --check` clean / 포트 4183·4184 free / OS temp·저장소 소속 프로세스 0 / 고객·운영자 dist
  **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0. 번들 증가 원인 = 편집 상태 모듈 + drag
  컨트롤러 + 컨트롤 UI + 2단계 plan 경로.
- **무변경**: `packages/**`·`apps/admin/**`·운영 HTML·Firebase 설정/Rules/CORS/Hosting·POC·manifest·
  lockfile·PNG = diff 0. `localImageBinding.ts`(스펙 026 owner)와 `productPlan.ts`도 수정하지 않았다.
- **NOT TESTED**: 2손가락 핀치(미구현 + Playwright 구동 불가), 터치 drag(1차 미지원), 실기기 4환경,
  실제 200% 확대, print/export pan 재현, 대용량 사진 성능·EXIF, 운영 카탈로그·이미지.
- **PNG**: 스펙 018 재생성분 2개는 restore·checkout·stage·commit **하지 않았다**.
  `Automation/DENN_AUTOMATION_RUNBOOK.md`의 미커밋 변경은 **Codex 소유로 판단해 손대지 않았다**.

---

### DONE (Claude) — 보완 라운드 1 (2026-07-30)

기준 `197527c`(+ Codex 지적) → 코드/test 커밋 `110511e`. **Codex 재검증 전이므로 종료가 아니다.**

- **지적 1 — 릴리즈 flush(`imageTransform.ts`)**: `end(pointerId, "pointerup")`이 **대기 중인 최신
  transform을 버렸다**. 릴리즈 직전 `move`가 아직 animation frame을 기다리는 중이면 사진이 **손을 놓은
  위치보다 한 프레임 뒤**에 남는다. 이제 `pointerup`만 **정확히 1회 flush**한 뒤 종료하고,
  `pointercancel`·`lostpointercapture`·selection abort·unmount/dispose는 **pending을 폐기**한다.
  flush는 state 정리와 frame 취소 **후에** 실행되므로 종료 후 늦은 rAF는 여전히 commit 0이고, 같은 값이
  두 번 commit되거나 **다음 세션의 pending을 소비하는 경로가 없다**. `cancelFrame`은 frame 유무와 무관하게
  **항상 pending을 비운다**.
- **지적 2 — capture 실패(`PreviewComposer.tsx`)**: `setPointerCapture`가 throw하면 **capture 없는 drag가
  계속**됐다(포인터가 요소를 벗어나면 move/up이 도달하지 않아 세션이 반쯤 열린 채 남는다). 이제 throw 시
  방금 시작한 세션을 **즉시 abort**하고 `dragSlotRef.current`를 비운다.
- **유지된 계약**: normalized 저장 · plan 직전 환산 · `maxPan=0` 고정 · 1.1 승산 · 0.02/0.10 키보드 스텝 ·
  단일 `원래대로` · generation 가드 · rAF 1회 병합 · 터치 drag·핀치 미지원 · `touch-action` 선언 0 ·
  초기화 행렬 · 스펙 026 owner와 `packages/**` 무변경.
- **신규 회귀 테스트**: `pointerup` flush 1회 / frame이 이미 실행된 경우 중복 commit 0 / move 없는
  `pointerup`은 commit 0 / flush가 다음 세션에 누출·소비되지 않음 / 다른 pointerId의 stale end는 flush 0 /
  throwing subscriber에도 세션 종료·재사용 가능 / abort·dispose 폐기 / **실제 Chromium**: capture 거부 시
  픽셀 불변 + 원복 후 정상 drag.
- **게이트**: frozen exit 0 · **lockfile diff 0** · 신규 의존성 0 / format·lint·typecheck /
  **unit 944**(938 → 944) / **e2e 91 PASS**(90 → 91) · exit 0 / `git diff --check` clean /
  포트 4183·4184 free · OS temp 0 · 저장소 소속 프로세스 0 / dist **SHA-256 E2E 전후 동일 · fixture 0** /
  네트워크·live·deploy 0. **번들**: mockup JS **263.19 → 263.31 kB**(gzip **81.56 → 81.60**),
  **CSS 무변경**, admin 무변경.
- **변경 파일**: `imageTransform.ts`(+ test) · `PreviewComposer.tsx` · `tests/e2e/mockup-preview.spec.ts`.
  CSS·설정·manifest·lockfile·`packages/**` 무변경. 스펙 018 PNG 2개와 Codex 소유 미커밋
  `Automation/DENN_AUTOMATION_RUNBOOK.md`는 **손대지 않았다**.
- **NOT TESTED 유지**: 2손가락 핀치 · 터치 drag · 실기기 4환경 · 실제 200% 확대 · print/export pan ·
  대용량 성능·EXIF · 운영 카탈로그·이미지.

---

### CODEX_PASSED — 스펙 029 종료 (2026-07-30)

Codex가 코드 **`110511e`**(보완 라운드 1)와 문서 **`0512c8d`** 를 독립 재검증해 **승인 가능**으로 판정했다.
이 섹션으로 스펙 029를 **DONE**으로 종료한다(기능 코드·테스트·CSS·설정 변경 0, 문서 전용).

**Codex 독립 검증 결론**

- `pointerup`이 pending transform을 **정확히 1회 flush**하고 `pointercancel`·`lostpointercapture`·
  abort·dispose는 **폐기**함을 확인.
- **stale callback과 다음 세션 오염 0**, `setPointerCapture` 실패 시 **즉시 abort**를 확인.

**Codex 독립 게이트**

| 항목 | 결과 |
| --- | --- |
| frozen install | PASS, lockfile diff **0**, 신규 의존성 0 |
| format · lint · typecheck | PASS |
| unit | **944 / 944 PASS** |
| build | PASS — mockup JS **263.31 kB** / gzip **81.60**, CSS **15.47 / 3.88**; admin **무변경** |
| E2E | **91 / 91 PASS**, 정상 exit |
| `git diff --check` | PASS |
| 포트 4183 · 4184 / OS temp `denn-e2e-*` | listener **0** / **0** |
| HEAD = origin, ahead/behind | `0512c8d`, **0 / 0** |
| working tree | Codex 소유 RUNBOOK + 알려진 스펙 018 PNG 2개만 |

Claude Code의 자체 실측치(unit 944, E2E 91 exit 0, 동일 build 수치, dist SHA-256 E2E 전후 동일·fixture 0,
저장소 소속 프로세스 0)와 **일치**했다.

**확정 계약 (스펙 029 최종)**

1. 편집 상태 = 슬롯별 `scale`(무차원 1.0~5.0) + 축별 normalized pan `[-1,1]`, **plan 직전에만** logical px
   환산, `maxPan=0` 축은 0, resize는 normalized 유지 후 재환산.
2. `maxPan`은 pan 0 probe plan의 cover 명령에서 읽어 **어댑터 rect 공식을 복제하지 않는다**. 두 단계 중
   하나라도 실패하면 plan 미생성(부분 plan·이전 transform 재사용 0).
3. 잘못된 입력은 **거부**하며 clamp 복구·기본값 생성을 하지 않고, hostile getter/Proxy는 throw 0으로 닫힌다.
4. mouse/pen Pointer Events + capture, **`pointerup`은 1회 flush**·나머지 종료는 폐기, generation 가드,
   rAF 1회 병합, capture 실패 시 즉시 abort.
5. 슬라이더 100~500% / 버튼·휠 `*1.1`·`/1.1`(휠은 scale이 실제로 바뀔 때만 preventDefault) /
   화살표 0.02·Shift 0.10 / 단일 `원래대로` / 슬롯 카드 선택 + `편집 중` / 사진 미준비 시 전부 disabled.
6. **터치 drag·핀치 미지원, `touch-action` 선언 0** → 기존 페이지·가로 스크롤과 브라우저 확대 제스처 보존.
7. 초기화: 이미지 교체·삭제·실패 → 그 슬롯만 / model·template·frame-size·kind → 전체 /
   색상 변경·활성 슬롯 전환 → 유지.
8. 스펙 026 image owner와 `packages/**`는 **무변경**(재사용만).

**NOT TESTED (종료 후에도 유지)**

- 2손가락 핀치(미구현 + Playwright 구동 불가)
- 터치 drag(1차 미지원)
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)
- 실제 200% 브라우저 확대
- print/export 경로의 pan 재현(레거시 frame 하드코딩 `dim.w/500`은 별도 스펙)
- 대용량 이미지의 실기기 성능 · EXIF 회전 · 운영 카탈로그·이미지

⚠️ 이 종료는 **합성 fixture에서 마우스·휠·슬라이더·버튼·키보드로 구도를 조절한 단계**이며 터치·실기기·
인쇄/export·주문·배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
**다음 스펙은 지시 대기.**
