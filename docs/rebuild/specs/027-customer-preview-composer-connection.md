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
