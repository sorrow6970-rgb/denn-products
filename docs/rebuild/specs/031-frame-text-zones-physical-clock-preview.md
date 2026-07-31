# 스펙 031 — 액자 텍스트 영역과 물리적 시계 미리보기

상태: **READY FOR IMPLEMENTATION**

근거: 조사 `33323dd`, 보완 `7636367`, Founder 결정 정본 `e3dc2b1`,
`docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`,
`docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`.

## 1. 목적과 범위

액자 카탈로그의 운영자 소유 `textZones`를 안전하게 투영하고 고객이
`main/name/name2/date/sub`의 값만 입력해 결정적 render plan에 반영하도록 한다. wrap은 plan 생성
시 확정해 미리보기와 향후 print/export가 같은 텍스트 command를 소비하게 한다.

시계는 Founder F-4에 따라 **완제품의 물리적 하드웨어 미리보기**다. render plan과 print/export에
넣지 않고 DOM preview overlay와 timer lifecycle만 구현한다.

범위 밖: 케이스 자유 배치 텍스트, 고객 색·그림자, admin `name2`, custom/remote font,
시계 print/export, 실제 print/export 구현, watermark, 주문·공유 scene schema 변경.

## 2. 확정 계약

### 2.1 투영과 snapshot

- frame preview projection에 정규화된 `textZones`와 `clockPreview`를 추가하며 카탈로그 원본을 하위
  계층에 전달하지 않는다. 각 필드는 예외 경계 안에서 정확히 한 번 읽어 plain snapshot으로 만든다.
- hostile getter/Proxy/revoked Proxy/drift, 비문자열, non-finite는 복구·clamp 없이 projection 실패다.
- key는 정확히 `main|name|name2|date|sub`; 중복은 거부한다.
- percent `x/y` `0..100`, `boxW/fontSize` `(0..100]`, `lineH` `(0..3]`,
  `letterSpacing` `[-100..100]`, `rotation` `[-360..360]` 유한값만 허용한다.
- `align`은 `left|center|right`, bold/italic은 boolean, color는 `#RRGGBB`만 허용한다.
- font family는 1..64 UTF-16 code unit이며 control, quote, semicolon, backslash를 거부한다.
  executor가 `sans-serif` fallback을 붙이며 신규/원격 font를 로드하지 않는다.

### 2.2 길이와 줄 수

- zone에 `maxChars`와 `maxLines`를 둔다.
- `maxChars`: 정수 `1..200`, 미지정 기본 **80 UTF-16 code unit**. HTML `maxLength`와 단위를 맞춘다.
- `maxLines`: 정수 `1..5`, 미지정 기본 **2줄**.
- 초과 입력은 차단한다. builder가 초과를 받으면 전체 plan을 거부한다. 자르기·말줄임·부분 command·
  이전 값 fallback은 없다.
- `undefined`와 `""`만 비어 있음이다. `"0"`은 유효하다. 공백·개행을 trim하지 않는다.
  `\n` 외 C0/C1 제어문자는 거부한다.
- wrap 결과가 maxLines를 넘으면 입력 commit을 거부하고 직전 승인 값을 유지한다.

### 2.3 결정적 측정과 wrap

- builder에 동기 측정 포트 `measureText({text,font}): number`를 주입한다. 포트는 plan에 저장하지 않아
  결과 plan은 JSON-safe다.
- throw/non-finite/negative 측정은 `TEXT_MEASUREMENT_FAILED`로 fail-closed한다.
- wrap 순서는 명시 개행 → 단어 경계 → 맞지 않는 단어의 code-point 단위 강제 분해다.
  letter-spacing은 인접 glyph 수에 spacing px를 곱해 폭에 포함한다.
- `lines[{text,width}]`를 plan에 확정한다. executor는 다시 wrap하지 않는다.
- 앱은 `document.fonts.ready` 뒤 같은 font로 측정한다. 요청 family가 준비되지 않으면 plan을
  생성하지 않으며 조용한 system fallback으로 다른 wrap을 만들지 않는다.

### 2.4 `draw-text` command

- `packages/render`에 `draw-text` 하나를 추가한다:
  `layerId`, `lines[{text,width}]`, `origin`, `align`,
  `font{family,sizePx,weight,italic,fallback}`, `color`, `lineHeightPx`,
  `letterSpacingPx`, `rotationDegrees`.
- raw zone/catalog/template ID/default text/측정 포트는 command에 넣지 않는다.
- 순서는 사진 → template art → textZones → inner border다. 시계는 plan 밖이다.
- `boxW`는 wrap 폭이며 clip이 아니다. 빈 zone에는 command를 emit하지 않는다.
- 텍스트 임의 회전은 허용하며 사진 quarter-turn 계약과 섞지 않는다.

### 2.5 executor capability

- `PreviewCanvasContext`에 `font`, `textAlign`, `textBaseline`, `fillText`, `measureText`를 선택적
  capability로 선언한다. 내부 타입은 공개 타입의 `Required<Pick<...>>`로 파생한다.
- text command가 있으면 실행 전 전부 preflight한다. 하나라도 없거나 함수가 아니면
  `INVALID_EXECUTOR_INPUT`, Canvas operation 0이다.
- 순서는 command 내부 `save → translate(origin) → rotate(optional) → glyph/line fillText → restore`.
  letter-spacing은 glyph별 fillText로 실행하고 `ctx.letterSpacing`을 쓰지 않는다.
- 예외에도 restore를 한 번 시도하고 다음 command로 진행하지 않는다. 오류에는 고객 원문, key,
  layerId, catalog/template ID, font 원문, exception message/stack을 넣지 않는다.

### 2.6 고객 값과 lifecycle

- frame composer가 다섯 plain string을 소유한다. 고객은 값만 바꾸고 zone style은 바꾸지 않는다.
- `defaultTexts`는 placeholder로만 snapshot한다. input value/plan으로 복사하지 않고 `name2`
  placeholder는 항상 없다.
- template/frame-size/model/product-kind 변경 시 다섯 값을 `""`로 초기화한다.
  사진·frame color·pan/zoom/rotation 변경에서는 유지한다.
- 현재 template에 없는 key는 숨기고 disabled한다. 각 input은 label, 길이 안내, 오류 연결을 갖는다.
  IME composition 중간값은 commit하지 않고 `compositionend`에서 한 번 검증한다.

### 2.7 물리적 시계 DOM overlay

- canvas surface와 같은 positioned wrapper에 `pointer-events:none`, `aria-hidden:true` DOM overlay로
  렌더한다. `{x,y,size,customImg}`는 logical mat rect 대비 percent이며 resize에도 percent를 유지한다.
- customImg는 기존 catalog media 해석 결과를 `<img>`로 표시하고 timer는 0개다. 새 fetch/cache/CORS
  정책을 만들지 않고 source 원문을 오류·로그·analytics에 넣지 않는다.
- customImg가 없으면 레거시 `HH:MM` 텍스트 placeholder다. 초가 없으므로 1초 interval은 금지한다.
  다음 분 경계 후 60초마다 갱신하며 clock/scheduler 포트를 주입해 테스트한다.
- 활성 text-clock overlay당 timer는 최대 1개다. toggle off, template/frame-size/model/kind 변경,
  custom image 전환, unmount, StrictMode remount에서 취소하고 stale callback은 generation으로 막는다.
- 기존 `clockOn` 공유 scene 의미를 유지하고 주문/print/export에는 추가하지 않는다.
- “실물 시계가 부착됩니다” 카피는 후속 UX 결정이므로 이번에 추가하지 않는다.

## 3. 오류 우선순위

1. catalog textZones/clock snapshot
2. zone key/style/range/duplicate
3. 고객 값 문자/길이
4. font readiness/측정
5. wrap/maxLines
6. 기존 frame geometry/image/art plan
7. draw-text 생성
8. executor preflight/실행
9. clock overlay source/timer

텍스트 실패는 부분 plan이나 fallback을 만들지 않는다. 시계 실패는 인쇄 데이터와 무관하므로
사진·텍스트 plan을 오염시키지 않고 overlay만 숨기는 identity-free 안전 실패로 분리한다.

## 4. 구현 허용 파일

- `packages/shared/src/catalog/preview/types.ts`
- `packages/shared/src/catalog/preview/project.ts`, `project.test.ts`
- `packages/render/src/plan/types.ts`
- `packages/render/src/plan/build.ts`, `build.test.ts`
- `apps/mockup/src/canvas/types.ts`
- `apps/mockup/src/canvas/executePreviewPlan.ts`, `executePreviewPlan.test.ts`
- `apps/mockup/src/canvas/productPlan.ts`, `productPlan.test.ts`
- `apps/mockup/src/preview/previewContracts.ts`, `previewContracts.test.ts`
- `apps/mockup/src/preview/PreviewComposer.tsx`, `PreviewComposer.test.tsx`
- `apps/mockup/src/preview/clockOverlay.ts`, `clockOverlay.test.ts` — 신규 허용
- `apps/mockup/src/canvas/surface.css`
- `tests/e2e/mockup-preview.spec.ts`
- 스펙 031 handoff/review/live/CURRENT/Automation 문서

금지: `packages/render/src/geometry/**`, case text, image owner/template-art/placement, `apps/admin/**`,
운영 HTML, Firebase/CORS/Rules/Hosting, POC, `package.json`, `pnpm-lock.yaml`, 신규 의존성,
print/export/watermark/order/공유 scene schema, network/live/deploy, 운영 데이터, 스펙 018 PNG 두 개.

허용 파일 확장이 필요하면 정확한 경로·이유·최소 확장안을 보고하고 멈춘다.

## 5. 필수 검증

Unit:

- 다섯 key, 중복/unknown, hostile getter/Proxy/revoked/drift
- style/font/color 범위, maxChars 1/80/200과 0/201, maxLines 기본 2와 1/5 및 0/6
- `""` 생략, `"0"` 렌더, 제어문자·길이·줄 수 초과 거부
- fake 측정의 개행·단어·긴 단어·letter-spacing wrap, 측정 throw/non-finite/negative
- 사진→art→text→border, clock command 0
- text-free 기존 context 호환, text capability preflight operation 0
- glyph/line/align/rotation/restore, defaultTexts placeholder-only와 lifecycle 초기화
- custom image timer 0, text clock timer ≤1, 분 경계와 toggle/전환/unmount/StrictMode 정리

Chromium E2E:

- 다섯 key와 `"0"` 실제 픽셀, 레이어 순서, 2줄·길이 차단, 삭제·template 초기화
- text rotation, 운영자 색 고정, 고객 색·그림자 UI 없음
- 시계 DOM overlay가 plan/order 밖이며 toggle·resize·custom image/text fallback 동작
- fake clock 분 경계, 고정 sleep 0, 잔류 timer 0
- 320px overflow 0, label/focus/IME, 44px target, axe serious/critical 0, console 0

게이트: frozen install, lockfile/new dependency 0, format/lint/typecheck/unit, 독립 build, 전체 E2E,
`git diff --check`, bundle/CSS, ports 4183/4184, OS temp, 잔류 프로세스, dist SHA-256/fixture,
허용 파일 일치.

NOT TESTED: 실기기 4환경 IME/font/overlay, system font 대체, 실제 인쇄물 가독성, case text,
admin `name2`, 고객 style, 실제 print/export 텍스트, 실제 물리 시계와 overlay 위치 일치.

## 6. 완료 조건

코드/test와 문서를 분리해 일반 fast-forward push한다. HEAD=origin 0/0에서 Codex가 독립 검증하며
승인 전 종료 문서·다음 스펙을 시작하지 않는다.

### DONE (Claude Code, 2026-07-31) — READY_FOR_CODEX

코드/test 커밋 `78095f8`, 기준 계약 `3927420`. 인계
`docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`.

구현 요약: 투영이 다섯 키 `textZones`(닫힌 범위·중복/미지원 거부·캡 기본 80/2)와 `clockPreview`
(3단 병합)를 정규화 → 어댑터가 운영자 zone과 고객 값을 짝지음 → 빌더가 **주입 측정 포트로 wrap을 한 번
확정**해 `draw-text` 커맨드(lines+width만) 생성 → executor가 선택적 text capability로 실행
(save→translate→rotate?→glyph fillText→restore, `ctx.letterSpacing` 미사용). 시계는 **plan 밖 DOM
오버레이**(pointer-events:none·aria-hidden·percent 위치, custom image timer 0, 텍스트는 분 경계 60초,
활성 timer ≤1, generation 가드).

입력 거부는 **빌더 시험 빌드**로 구현했다 — wrap을 아는 것은 빌더뿐이라 composer가 재구현하면 어긋날 수
있어, plan 인자를 보관했다가 후보 값으로 실제 빌더를 한 번 더 호출하고 실패 시 직전 승인 값을 유지한다.
자르기·말줄임·부분 plan·이전 값 fallback 0.

게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
**unit 1081**(995→1081) / build mockup JS 280.33 kB gzip 86.52, CSS 17.82/4.30, admin 무변경 /
**E2E 114 PASS**(99→114) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
고객 dist SHA-256 E2E 전후 동일·fixture 0 / network·live·deploy 0.

★ 판단 확인 요청: `plan/index.ts`·`preview/index.ts`(배럴)가 §4 밖이라 **배럴을 넓히지 않고 구조적
타입**(`Parameters<typeof buildPreviewRenderPlan>` 등)으로 새 타입을 참조했다. `tsc` 검증 강도는 동일하고
배럴 content diff는 0이다. 배럴 확장이 더 낫다고 판단되면 최소 확장으로 보완한다. 상세는 인계 §3.

NOT TESTED 유지: 실기기 4환경 IME·font·overlay, system font 대체, 실제 인쇄물 가독성, case text,
admin `name2`, 고객 style, 실제 print/export 텍스트, **실제 물리 시계와 overlay 위치 일치**.

스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다.

### 보완 라운드 1 (Claude Code, 2026-07-31) — READY_FOR_CODEX

Codex 지적 3건 모두 유효했고 허용 파일 5개 안에서만 보완했다. 코드/test `88b64e6`.

1. **시계 기준 rect**: percent를 전체 박스가 아니라 **mat rect** 기준으로 환산한다. band는 plan
   어댑터와 동일한 `max(1, round(width*borderPercent/100))`이고, 중심은 mat 기준, 한 변은
   `min(matW,matH)*size/100`이다. 순수 함수 `resolveClockCss`로 분리해 unit으로 고정했다
   (mat 안 중심 · band≠0에서 naive percent가 틀림 · portrait/landscape 짧은 변 · 스케일 불변 ·
   못 쓰는 캔버스는 null). E2E는 렌더 값이 naive `80%`가 아님과 resize 이동 <0.5%p를 확인한다.
   resize에서 bit-identical이 아닌 것은 의도다 — band 반올림을 그려지는 mat도 똑같이 겪는다.
2. **custom image 실패**: `declared`와 resolved `src`를 분리했다. 선언됐는데 resolve 실패이거나
   `<img>` load 실패면 **오버레이를 숨긴다**(텍스트 대체 금지). 텍스트는 사진이 애초에 선언되지
   않았을 때만 쓴다. 실패 source를 기억해 재시도 루프가 없고, source·오류 원문 노출 0이며 사진·텍스트
   plan은 유지된다.
3. **폰트 가용성**: 측정 전에 값이 있는 각 zone의 **정확한 `fontShorthand`** 로
   `document.fonts.check(...)`를 확인한다. FontFaceSet 부재·check 부재·throw·false면 텍스트 plan을
   **fail-closed**한다(대체 측정 없음). 텍스트 없는 액자는 그대로 동작하고 입력창은 게이트와 무관하다.

게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
**unit 1088**(1081→1088) / build mockup JS 281.69 kB gzip 86.99, CSS 17.85, admin 무변경 /
**E2E 116 PASS**(114→116) exit 0 / `git diff --check` clean / 포트 free / OS temp 0 /
dist SHA-256 E2E 전후 동일 / network·live·deploy 0.

무변경: 회전·텍스트 wrap·오류 우선순위·F-1~F-8. `surface.css`·`packages/**`·`canvas/**` 무변경.
스펙 018 PNG 2개와 `packages/render/src/plan/index.ts`는 손대지 않았다.

### CODEX_PASSED (2026-07-31)

Codex가 보완 라운드 1 커밋 `b7d46d3`(코드 `88b64e6`)을 독립 재검증해 **승인**했다.

확인된 것:

- **unit 1088/1088**, 실제 Chromium **E2E 116/116**
- frozen install · format · lint · typecheck · build · `git diff --check` **PASS**
- 포트 4183·4184 및 OS temp staging 잔류 **0**
- lockfile·manifest diff **0**, 신규 의존성 **0**

**NOT TESTED (종료 시점 유지)**:

- **잔류 프로세스 command-line 검사** — 이번 라운드에서도 실행하지 못했다
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)의 **IME · 폰트 · 오버레이**
- **system font 대체** 결과
- 실제 **인쇄물 가독성**
- **실제 print/export의 텍스트 출력** — 인쇄 경로는 아직 이 plan을 소비하지 않는다
- **실제 물리 시계와 오버레이 위치의 일치 여부**
- case 텍스트(F-1 범위 밖) · admin `name2`(F-8 별도 스펙) · 고객 style(F-2)

구현 판정(최종): 액자 `textZones` 다섯 키 + `draw-text` 커맨드(주입 측정 포트로 wrap을 plan 생성 시
확정) + executor 텍스트 capability(없으면 preflight fail-closed) + **mat rect 기준** 물리적 시계 DOM
오버레이(custom image timer 0, 텍스트는 분 경계 60초, 활성 timer ≤1, 선언된 사진 실패 시 숨김) +
요청 폰트 미가용 시 텍스트 plan fail-closed. `packages/render/src/geometry`·image owner·template art·
placement 무변경, 시계는 plan·인쇄·주문에 **들어가지 않는다**(Founder F-4).

> 최초 라운드에서 올린 판단 2건(배럴 확장 대신 구조적 타입 · 입력 거부의 빌더 시험 빌드)에 대한
> **명시적 별도 지시는 없었고**, 이번 승인으로 **현재 구현 형태가 수용된 것**으로 기록한다.

스펙 031은 **DONE**이다. 다음 스펙은 Codex 지시 전까지 착수하지 않는다.
