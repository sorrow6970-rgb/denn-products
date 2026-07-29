# 스펙 027 — 고객 상품 미리보기 composer 연결

## 상태

- 작성: Codex
- Founder 결정: 2026-07-29 권장안 승인
- 기준 HEAD: `6b18931`
- 구현: Claude Code
- 배포: 금지

## 목적

스펙 017의 카탈로그 선택 완료 화면에서 명시적인 **미리보기 만들기** 단계로 진입해,
스펙 023 geometry projection, 스펙 025 product-plan adapter, 스펙 026 local image binding,
스펙 022 Canvas surface를 고객 화면에서 처음 연결한다.

이번 스펙은 로컬 사용자 사진과 결정적 solid-color preview까지만 다룬다. 템플릿 아트,
Firebase 이미지 합성, pointer/pan/zoom, 회전, text/clock/watermark, print/export, 저장,
주문, 실제 network/live/deploy는 포함하지 않는다.

## Founder 승인 UX 계약

1. 카탈로그 선택 완료 직후 Canvas를 자동 생성하지 않는다.
2. 완료 요약 다음에 `미리보기 만들기` 버튼을 제공하고, 사용자가 활성화하면 별도 composer
   단계가 열린다.
3. 색은 사용자가 명시적으로 선택한다. 첫 항목·기본색을 자동 선택하지 않는다.
4. 필요한 모든 로컬 이미지가 준비되기 전에는 Canvas를 만들지 않고 업로드 요청을 표시한다.
5. frame logical width는 실제 composer content-box 폭을 사용하되 `500` logical px를 넘지
   않는다. 유효 폭은 `max(1, round(min(contentBoxWidth, 500)))`이다.
6. frame composer resize 시 새 logical width로 geometry→plan을 다시 계산한다.
7. case는 스펙 023의 `modelLogicalSize`를 유지하고 스펙 022의 scroll wrapper 정책을 따른다.
   CSS transform 축소를 추가하지 않는다.

## 색상 계약

### 케이스

카탈로그에 case body 색이 없으므로 이번 첫 연결은 레거시 고객 팔레트에서 확인된 solid
8색을 앱 내부 상수로 사용한다.

| 이름 | 값 |
|---|---|
| 블랙 | `#1A1A1A` |
| 화이트 | `#FFFFFF` |
| 베이지 | `#D4C5B0` |
| 네이비 | `#2B3A4A` |
| 버건디 | `#7B3F3F` |
| 그린 | `#3A5C3A` |
| 브라운 | `#8B4513` |
| 라벤더 | `#C8A0D0` |

근거: `denn-mockup-tool.html:322-330`. `transparent`는 현재 render-plan 어휘로 표현할 수
없으므로 표시·근사하지 않는다.

### 액자

`CatalogDocumentV1.frameColors` 중 정확한 `#RRGGBB` solid 항목만 표시한다. 첫 색 자동 선택은
금지한다. `grain: true` 항목은 현재 결정적 render-plan이 texture를 표현하지 못하므로
solid로 근사하지 않고 제외한다. 지원 색이 없으면 안전한 안내를 표시하고 Canvas를 만들지
않는다. raw catalog 객체·색 ID·진단 code는 DOM에 노출하지 않는다.

색상 컨트롤은 실제 `<button type="button">`, `aria-pressed`, 텍스트 이름을 가지며 최소
44×44px 터치 영역과 `:focus-visible`을 제공한다. 색만으로 선택 상태를 전달하지 않는다.

## 이미지 계약

- case zone마다 독립된 접근 가능한 `<input type="file" accept="image/*">`를 제공한다.
- 하나의 사진을 여러 zone에 자동 공유하지 않는다.
- frame은 단일 파일 입력을 제공한다.
- 같은 파일 재선택이 가능하도록 UI owner가 처리한다.
- 각 owner는 스펙 026 `useLocalImageBinding`을 사용한다.
- 모든 필수 owner가 `ready`일 때만 plan을 만든다.
- loading/failed/clear/unmount 시 이전 plan과 Canvas를 즉시 제거한다.
- 파일명·MIME·blob URL·data URL·drawable·예외는 text, ARIA, `data-*`, location, storage,
  console, plan에 노출하지 않는다.
- 지원하지 않는 파일·decode 실패는 고정된 안전 문구로 안내한다.

## 연결 경계

새 composer는 다음 순서만 사용한다.

1. 현재 ids-only `CatalogBrowseSelection`
2. `projectCasePreviewGeometry` 또는 `projectFramePreviewGeometry`
3. 명시 색 + 준비된 `UserImageState`
4. `buildCaseProductPlan` 또는 `buildFrameProductPlan`
5. owner들의 `imageBindings`를 조회 전용 합성 map으로 결합
6. `PreviewCanvasSurface`

projection/adapter 실패는 code·sourceIndex·ID를 DOM에 출력하지 않고 고정 안내로 닫는다.
raw `CatalogDocumentV1`은 projection 경계에서만 사용하며 Canvas component props로 전달하지
않는다. executor와 surface 계약을 수정하지 않는다.

## 상태·재선택

- product kind, model/frame size, category, template 중 하나가 바뀌면 composer를 닫고 모든
  local image owner를 unmount/dispose하며 색·파일·plan을 초기화한다.
- `미리보기 만들기`를 다시 눌러야 새 선택의 composer가 열린다.
- 색 변경은 ready 이미지 owner를 유지한 채 새 plan만 만든다.
- frame resize는 이미지 owner와 선택 색을 유지한 채 새 plan만 만든다.
- stale 이전 selection/resize/decode 결과가 현재 Canvas를 덮으면 안 된다.

## UI·접근성

- composer는 `BrowseFlow`의 완료 요약 다음 DOM 순서에 배치한다.
- 제목, 색 선택, 파일 선택, 상태 안내, Canvas 순으로 자연스러운 탭 순서를 유지한다.
- Canvas accessible name은 `케이스 미리보기` 또는 `액자 미리보기` 고정 문구만 사용한다.
- 파일 선택·decode 후 포커스를 강제로 이동하거나 자동 스크롤하지 않는다.
- 320×568과 desktop에서 페이지 수평 overflow 0, 컨트롤 44×44, axe serious/critical 0,
  console error 0을 유지한다.
- 실제 200% 확대·iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱은
  `NOT TESTED`로 기록한다.

## 허용 파일

production:

- `apps/mockup/src/App.tsx`
- `apps/mockup/src/browse/BrowseFlow.tsx`
- `apps/mockup/src/browse/browse.css`
- `apps/mockup/src/preview/**` 신규
- 필요 시 `apps/mockup/src/canvas/**`의 framework-free binding-map 조합 helper와 test만

test:

- 위 신규/수정 production 파일의 unit test
- `tests/e2e/mockup-preview.spec.ts` 신규
- 기존 E2E fixture는 실제 고객 `/` 검증으로 대체할 수 없는 보조 검증에 한해 최소 수정

docs:

- 이 스펙 DONE append
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- `docs/handoff/2026-07-29-spec-027-customer-preview-handoff.md`

그 밖의 packages, admin, 운영 HTML, Firebase 설정/Rules, POC, PNG, package manifests,
lockfile는 변경 금지다. 신규 의존성 금지.

## 필수 자동 검증

unit:

- 색 미선택·이미지 미준비에서 plan/Canvas 없음
- case 8색 정확성, 자동 선택 없음, transparent 없음
- frame valid solid 필터, grain 제외, 자동 선택 없음
- 모든 case zone 독립 image owner와 누락 fail-closed
- frame width `round(min(content,500))`, resize 재계산, 0-size 대기
- selection 변경 시 composer reset·owner cleanup
- safe error/no identifier leakage

Chromium E2E:

- 고객 `/`에서 case 전체 흐름: 선택 → composer 열기 → 색 선택 → zone 파일 선택 → 실제 픽셀
- frame 전체 흐름: 색 선택 → 파일 선택 → 320px/desktop 폭과 최대 500 logical width
- 색·파일 미선택 시 Canvas 0
- 같은 파일 재선택, 교체, clear, selection 변경 중 in-flight stale 0
- 파일명/blob URL/base64/ID/code가 DOM·ARIA·data/storage/location/console에 0
- 키보드 전용 진입·색 선택·파일 input 도달·focus-visible
- 320×568 및 desktop overflow 0, 44px, axe 0, console 0
- 실제 network 0, admin endpoint 0
- 고객 dist에 E2E fixture 0, E2E 전후 고객 dist SHA-256 동일

전체:

- frozen install
- format, lint, typecheck, unit, build
- E2E reporter summary와 exit 0
- `git diff --check`
- 포트 4183/4184 free
- OS temp `denn-e2e-*` 잔여 0
- 번들 변화의 원인·수치 기록

## STOP 조건

다음이면 임의 확장하지 않고 `FOUNDER_DECISION_REQUIRED` 또는 `BLOCKED`로 멈춘다.

- 위 palette/width/단계 계약으로 실제 plan을 만들 수 없음
- published catalog의 지원 frame color가 전혀 없어 합성 fixture 밖 계약을 정할 수 없음
- template art 또는 Firebase image를 Canvas에 넣어야만 요구 UX가 성립
- packages/render/shared/firebase API 변경 필요
- 신규 의존성, 실제 network/live/Firebase/deploy 필요
- 기존 고객 browse 회귀, flaky, 잔류 프로세스, 예상 밖 파일 변경

## 완료 정의

이 스펙 완료는 **로컬 사용자 사진 기반 첫 고객 Canvas preview 연결**이다. 템플릿 아트,
운영 이미지 CORS-clean, pointer/pan/zoom, 회전, text/clock, print/export, 저장·주문,
Firebase·배포 완료를 의미하지 않는다.

---

### DONE (Claude) — 2026-07-29

기준 HEAD `835eaaa` → 코드/test 커밋 `175a363`. **Codex 독립 검증 전이므로 스펙 종료가 아니다.**

- **UX 계약 이행**: 선택 완료만으로는 Canvas를 만들지 않고 `미리보기 만들기` 버튼만 렌더한다(열기 전 색·파일 UI·Canvas 0).
  색은 초기 `null`이고 어떤 스와치도 `aria-pressed="true"`로 시작하지 않는다. case는 레거시 solid **8색**
  (`denn-mockup-tool.html:322-330`)만 쓰고 `transparent`는 표시·근사하지 않는다. frame은 카탈로그의 **정확한 `#RRGGBB` +
  이름 있는 solid만** 표시하고 `grain: true`는 제외하며, 지원 색이 0이면 안내만 하고 Canvas를 만들지 않는다.
  필수 이미지가 모두 `ready`일 때만 plan을 만들고 loading/failed/clear/unmount에서는 plan·Canvas를 즉시 없앤다.
  frame logical width는 자체 `ResizeObserver`가 관측한 content-box로 **`max(1, round(min(content, 500)))`**,
  측정 전·0·NaN·Infinity면 기본값을 만들지 않고 대기하며, resize 시 geometry→plan을 재계산한다. case는 스펙 023
  `modelLogicalSize` + 스펙 022 scroll wrapper 그대로이고 CSS transform 축소를 넣지 않았다.
- **연결 경계**: ids-only 선택 → `projectCase/FramePreviewGeometry` → 명시 색 + 준비된 `UserImageState` →
  `buildCase/FrameProductPlan` → owner별 binding 결합 → `PreviewCanvasSurface`. raw `CatalogDocumentV1`은
  **projection 입력으로만** 쓰고 Canvas props로 넘기지 않는다. executor·surface·adapter·`packages/**` **무변경**.
  실패는 code·sourceIndex·ID 없이 고정 문구로 닫는다.
- **⚠️ 구현 중 발견·수정한 결함**: 스펙 026 owner는 각자 `user-image-1`부터 번호를 매기므로 **zone이 2개면 ref가 충돌**해
  첫 zone의 사진이 두 zone 모두에 그려졌다(E2E가 실제로 검출). composer가 slot namespace를 붙여 plan은
  `<slotId>.<ownerRef>`를 쓰고 lookup은 `withImageRefPrefix`로 자기 namespace만 응답하도록 수정했다. 결과 ref는
  스펙 020 식별자 문법을 그대로 만족하며 unit이 충돌 시나리오를 고정한다.
- **실제 Chromium E2E 9건(고객 `/`)**: case 전체 흐름(선택 완료 시 Canvas 0 → 색 → zone 0만으로는 Canvas 0 → 두 zone
  모두 준비 후 Canvas, CSS `300×200`, 픽셀 (75,50)=사진 A / (225,50)=사진 B / (150,150)=body) · 교체·같은 파일
  재선택(`input.value === ""`)·clear 시 부분 미리보기 0 · 선택 변경 시 composer 닫힘과 새 단계 · frame(미지원 색 미표시,
  사전 선택 0, `width ≤ 500`, `height = round(width×1.4)`, 프레임/mat/사진 3구역 픽셀) · 좁은 뷰포트에서 더 좁은 width와
  overflow 0 · 파일명·`blob:`·`base64`·색 ID·실패 code가 DOM/ARIA/data/storage/location/console에 **0** ·
  키보드 전용 진입·색 선택·파일 input 도달 · 320×568/1280×800에서 overflow 0·44px·axe 0·console 0. 실제 network 0.
- **게이트**: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 797**(755 → 797, 신규 42) /
  **e2e 78 PASS**(69 → 78, 신규 9)·exit 0 / check PASS / `git diff --check` clean / OS temp `denn-e2e-*` 0 /
  고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 포트 4183·4184는 실행 직후 TIME_WAIT 2건 후 **free**(리스너·잔류 0).
- **번들 변화와 원인(요구 기록)**: 미리보기가 처음으로 고객 번들에 포함돼 mockup JS **217.69 → 248.23 kB**
  (gzip **68.40 → 77.53**), CSS **11.32 → 13.80 kB**(gzip **3.16 → 3.53**). 새로 실린 것 = Canvas surface(022) +
  executor(021) + plan builder(020/024/025) + projection(023) + local image binding(026) + composer UI.
  **admin은 바이트 무변경**.
- **E2E 소요 시간(정직 기록)**: 전체 스위트가 이전 20초대에서 **2.1~3.5분**으로 늘었다(두 번 실행 모두 78/78·exit 0).
  같은 테스트의 개별 시간이 실행마다 5.4초↔1.6초로 흔들려 호스트 부하 변동으로 보이나 **원인 확정은 NOT VERIFIED**.
- **무변경**: `packages/**`·`apps/admin/**`·운영 HTML·Firebase 설정/Rules·`poc/**`·manifest·lockfile = diff 0.
  기존 E2E fixture와 `canvas-surface.spec.ts`도 수정하지 않았다.
- **NOT TESTED**: 실제 기기·실제 200% 확대·운영 카탈로그 분포·운영 이미지·대용량 사진 메모리/성능·EXIF 회전·선명도.
- **PNG**: Codex E2E가 재생성한 스펙 018 스크린샷 2개는 restore·checkout·stage·commit **하지 않았다**(working tree dirty,
  커밋된 PNG 0).
- ⚠️ 이 완료는 **로컬 사용자 사진 기반 첫 고객 Canvas preview 연결**이며 템플릿 아트·운영 이미지 CORS-clean·pointer·
  print/export·저장·주문·Firebase·배포 완료가 아니다. 인계: `docs/handoff/2026-07-29-spec-027-customer-preview-handoff.md`.

---

### DONE (Claude) — 보완 라운드 1 (2026-07-29)

기준 HEAD `075ee01`(+ Codex 지적 커밋 `f5c0039`) → 코드/test 커밋 `6fb8630`. **Codex 재검증 전이므로 종료가 아니다.**

- **지적(재현 확인)**: `frameColors`의 서로 다른 항목이 같은 canonical fill을 가질 수 있다(예 `#1a1a1a` / `#1A1A1A`).
  기존 `readFrameColorOptions`는 둘 다 반환했고 composer는 `key`·`data-testid`·선택 비교에 **값**을 쓰므로
  **중복 key/test id**가 생기고 한 번 클릭에 **두 버튼이 동시에 `aria-pressed=true`** 로 보일 수 있었다.
- **수정**: canonical uppercase `value` 기준으로 **결정적 dedup**. source order의 **첫 유효 항목과 그 이름을 보존**하고
  뒤의 중복은 표시하지 않는다. **유효 항목만 색을 선점**하므로 앞선 `grain`·형식 오류 항목이 뒤의 solid를 가리지 않는다.
  자동 선택 **0**, raw id/object/diagnostic 미노출, 각 property **1회 읽기**, hostile getter **throw 0** 유지.
- **테스트(신규 5)**: 대소문자만 다른 2개 → 첫 1개 / 같은 색 3개 → 1개 / 서로 다른 색은 source order 유지 /
  무효 첫 항목이 색을 선점하지 않음 / 컴포넌트 markup에 swatch **1개**·`aria-pressed="true"` **0**.
- **게이트(보완 라운드 1)**: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck /
  **unit 802**(797 → 802) / build(mockup JS **248.29 kB**·gzip **77.55**, CSS **13.80**·**3.53** — dedup 코드만큼
  +0.06 kB, admin 무변경) / **e2e 78 PASS**·**exit 0·16.9초** / check PASS / `git diff --check` clean /
  포트 4183·4184 **free** / OS temp `denn-e2e-*` 0 / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·deploy 0.
- **이전 라운드 E2E 소요 의문 해소**: 같은 78건 스위트가 이번에 **16.9초**로 끝났다(직전 라운드 2.1~3.5분).
  즉 그때의 지연은 **호스트 부하**였고 앱 회귀가 아니었음이 실측으로 확인됐다.
- **PNG**: Codex E2E 재생성분 2개는 이번에도 **restore·checkout·stage·commit 하지 않았다**(working tree dirty, 커밋된 PNG 0).
