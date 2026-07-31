# 스펙 031 인계 — 액자 텍스트 영역과 물리적 시계 미리보기

상태: **DONE — Codex 승인 후 종료 문서 처리 완료 (`COMMITTED`)** (2026-07-31, §9 참조)
코드/test 커밋: `78095f8` → 보완 `88b64e6` / 기준: 계약 `3927420`, 결정 정본 `e3dc2b1`, 조사 `7636367`

## 1. 한 줄

**고객이 운영자가 만든 문구 자리에 값을 입력하고, 실물 시계는 캔버스 밖 DOM 오버레이로 보여준다.**

## 2. 구현된 계약

### 2.1 텍스트 — 한 번만 wrap되는 결정적 plan

- 투영이 **다섯 키만** 허용하고 모든 스타일 필드를 닫힌 범위로 검증한다. 중복·미지원 키·범위 밖 값은
  **전체 투영 실패**다(clamp·기본값 생성 0). 캡은 `maxChars` 기본 **80 UTF-16 code unit**(HTML
  `maxLength`와 단위 일치), `maxLines` 기본 **2**.
- `defaultTexts`는 **placeholder로만** 실리고 **`name2`에는 절대 없다** → 운영자 샘플(`'WEDDING'`)이
  고객 값이나 인쇄물에 들어갈 경로가 **구조적으로 없다**(F-3).
- **`draw-text` 커맨드**는 **이미 wrap된 lines + 측정 폭**만 담는다. 고객 원문(라인 외)·zone key·
  카탈로그/템플릿 id·측정 포트는 **들어가지 않으며**, `layerId`는 **위치 기반**(`frame:text:0`)이다.
- wrap은 **주입된 동기 측정 포트**로 **빌더에서 한 번** 확정한다 → plan은 순수·JSON-safe이고
  미리보기와 향후 print/export가 **같은 lines**를 소비한다. 순서는 **명시 개행 → 단어 경계 →
  code-point 강제 분해**, letter-spacing은 **인접 glyph 사이에만** 더한다.
- 측정이 throw/non-finite/negative면 **`TEXT_MEASUREMENT_FAILED`로 fail-closed**. 그릴 텍스트가 있으면
  **`document.fonts` 정착 전에는 plan을 만들지 않는다** — fallback으로 재고 real family로 그리면 레거시의
  미리보기≠인쇄가 그대로 재현되기 때문이다.

### 2.2 ★ 입력 거부를 "빌더 시험 빌드"로 구현한 이유

스펙 §2.2는 **wrap 결과가 `maxLines`를 넘으면 입력 commit을 거부**하라고 한다. wrap을 아는 것은
**빌더뿐**이므로, composer가 wrap을 **다시 구현하면 둘이 어긋날 수 있다**(어긋나면 캔버스가 통째로
사라지거나 고객이 부당하게 막힌다).

→ composer는 **plan을 만들 때 쓴 인자를 ref에 보관**했다가, 편집이 들어오면 **후보 값으로 실제 빌더를
한 번 더 호출**한다. 실패하면 commit을 거부하고 **직전 승인 값을 유지**한다. **자르기·말줄임·부분 plan·
이전 값 fallback 0.**

### 2.3 executor capability

`font`·`textAlign`·`textBaseline`·`fillText`·`measureText`를 **공개 포트의 선택적 capability**로 선언하고
내부 타입은 `Required<Pick<…>>`로 **파생**했다(스펙 030 보완 라운드 1에서 확립한 패턴 그대로).
텍스트 없는 plan은 기존 컨텍스트에서 **그대로 실행**되고, 텍스트 plan은 capability가 없으면
**preflight에서 fail-closed(Canvas 연산 0)** 다. letter-spacing은 **glyph별 `fillText`** 이고
`ctx.letterSpacing`은 **쓰지 않는다**(지원 편차 + 빌더가 확정한 폭과 어긋남).

### 2.4 시계 — 아트가 아니라 하드웨어 (F-4)

- 신규 `clockOverlay.ts`는 **framework-free**로 "무엇을 보여줄지"와 "언제 갱신할지"만 소유하고,
  **시계·스케줄러를 주입**받아 실제 시간·timezone에 의존하지 않는다.
- **`pointer-events:none` + `aria-hidden`** 인 **DOM 오버레이**로, **mat rect 기준** percent 위치라
  (§8-1로 정정) resize에도 mat을 따라가고 **plan·인쇄·주문에 들어갈 경로가 없다**.
- **custom image는 timer 0개.** 텍스트 `HH:MM`은 초가 없으므로 **1초 interval 금지** — **분 경계 후 60초**
  주기다. **활성 timer는 최대 1개**이고 toggle·템플릿 전환·unmount·StrictMode 재마운트에서 취소되며
  **generation 가드**가 늦은 콜백을 막는다.
- placement가 잘못됐거나 이미지가 못 쓰이면 **오버레이만 숨긴다** — 시계는 인쇄 데이터가 아니므로
  사진·텍스트 plan을 오염시키지 않는다(§3).

## 3. ★ 허용 파일을 지키기 위해 택한 방법 (Codex 확인 요청)

`packages/render/src/plan/index.ts`와 `packages/shared/src/catalog/preview/index.ts`(배럴)는 §4 허용
목록에 **없다**. 새 타입을 app 계층에서 이름으로 import하려면 배럴 확장이 필요했지만, **허용 파일을
임의로 넓히지 않고 구조적 타입으로 해결**했다.

- `productPlan.ts`: `TextMeasurePort`·`FrameTextZoneInput`·plan options를
  **`Parameters<typeof buildPreviewRenderPlan>`/`FramePlanInput["textZones"]` 에서 파생**했다.
- `PreviewComposer.tsx`: 다섯 키 목록을 **로컬 상수**로 선언하고(투영이 같은 집합을 검증한다),
  `PlanFontSpec`은 빌더의 포트 타입에서 파생했다.

**`tsc` 검증 강도는 named import와 동일**하고 배럴 diff는 **0**이다(작업 중 EOL만 바뀌어 git 기준 content
diff 0). 다만 DRY 관점에서는 배럴 확장이 더 깔끔하므로, Codex가 그 방향을 원하면 최소 확장으로 보완한다.

## 4. 검증 결과

| 게이트 | 결과 |
| --- | --- |
| frozen install / lockfile·manifest diff / 신규 의존성 | exit 0 / **0** / **0** |
| format · lint · typecheck | PASS |
| unit | **1081** (995 → 1081, 신규 86) |
| build | mockup JS **280.33 kB** (gzip **86.52**), CSS **17.82** (gzip **4.30**) / admin **무변경** |
| E2E (실제 Chromium) | **114 PASS** (99 → 114, 신규 15), exit 0 |
| `git diff --check` | clean |
| 포트 4183·4184 listener | **0** |
| OS temp `denn-e2e-*` | **0** |
| 고객 dist SHA-256 (E2E 전/후) | **동일** · fixture 유출 **0** |
| 실제 network·live·Firebase·CORS·Rules/Hosting·deploy | **0** |

### 신규 unit (86)

다섯 키·중복·unknown·hostile getter/drift / 스타일·폰트·색 범위 전수 / `maxChars` 1·80·200과 0·201,
`maxLines` 기본 2와 1·5 및 0·6 / `""` 생략과 **`"0"` 렌더** / 제어문자 거부(개행만 허용) /
fake 측정의 개행·단어·긴 단어·letter-spacing wrap / 측정 throw·non-finite·negative / 포트 미주입 /
레이어 순서(사진→아트→텍스트→테두리)와 **clock 커맨드 0** / 텍스트 없는 기존 컨텍스트 호환과
**capability 없는 컨텍스트의 preflight 연산 0** / glyph·line·align·rotation·restore / 폰트 shorthand /
실제 `CanvasRenderingContext2D` 컴파일 타임 적합성 / placeholder 전용과 lifecycle 초기화 /
**custom image timer 0**, **text clock timer ≤1**, 분 경계, toggle·전환·dispose·**generation 가드**.

### 신규 E2E (15, 실제 픽셀)

입력 → 픽셀 등장, 삭제 → 사라짐, **`"0"` 렌더** / 정의된 키만 노출 / **길이 캡이 자르지 않고 차단** /
**wrap 초과 시 직전 값 유지 + 캔버스 정상** / `defaultTexts`는 값이 되지 않음 / 텍스트가 사진 **위** /
회전 zone 렌더 / **고객 색·그림자 UI 0** / 320px 라벨·포커스·44px·axe 0·console 0 /
시계가 **캔버스 밖 DOM 오버레이**(`aria-hidden`, `pointer-events:none`) / `HH:MM` 초 없음 /
opt-out 시 완전 숨김 / **resize에도 percent 유지** / **잔류 timer 0**.

## 5. NOT TESTED (유지)

- 실기기 4환경의 **IME·폰트·오버레이** 실제 동작
- **system font 대체** 결과
- 실제 **인쇄물 가독성**
- **case 텍스트**(F-1로 범위 밖), **admin `name2`**(F-8로 별도 스펙), **고객 style**(F-2)
- 실제 **print/export의 텍스트 출력**(인쇄 경로는 아직 이 plan을 소비하지 않는다)
- **실제 물리 시계와 오버레이 위치의 일치 여부**

## 6. 범위 밖 (건드리지 않음)

`packages/render/src/geometry/**` · case text · image owner(`localImageBinding.ts`) ·
`templateArtBinding.ts` · `placement.ts` · `apps/admin/**` · 운영 HTML · Firebase/CORS/Rules/Hosting ·
POC · `package.json` · `pnpm-lock.yaml` · 신규 의존성 · print/export/watermark/order/공유 scene schema ·
알려진 스펙 018 PNG 2개(restore·stage·commit **하지 않음**).

## 7. 다음

Codex가 `78095f8`와 이 문서 커밋을 독립 검증한다. **§3의 구조적 타입 판단**을 함께 확인해 달라.
승인 전까지 Claude는 종료 문서를 쓰거나 다음 스펙을 시작하지 않는다.

---

## 8. 보완 라운드 1 (2026-07-31) — 시계 기준 rect · 이미지 실패 · 폰트 가용성

Codex 지적 **3건 모두 유효**했다. 코드/test 커밋 `88b64e6`. 변경 파일은 허용 목록의 5개
(`PreviewComposer.tsx`(+test), `clockOverlay.ts`(+test), `tests/e2e/mockup-preview.spec.ts`)이며
`surface.css`는 변경이 필요 없었다.

### 1. 시계 percent의 기준은 mat rect였다

**지적**: percent를 `.denn-preview-edit__area` 전체에 적용했으나, 정본 §2.7과 레거시의
`IX+x/100*IW`·`IY+y/100*IH`·`min(IW,IH)*size/100`에서 `IX/IY/IW/IH`는 **mat rect**다.
band가 클수록 오차가 커진다.

**보완**: band를 **plan 어댑터와 동일한 산식**(`max(1, round(width*borderPercent/100))`)으로 구해
mat rect를 만들고, **mat 기준 중심**과 **`min(matW,matH)` 기준 한 변**을 캔버스 대비 CSS percent로
환산하는 **순수 함수** `resolveClockCss`를 두었다. 오버레이와 실제로 그려지는 mat이 **같은 반올림**을
쓰므로 서로 어긋날 수 없다.

**검증**: mat 안 중심 / **band가 0이 아닐 때 naive 전체 박스 percent가 틀린다는 것을 수치로 고정** /
portrait·landscape 모두 **짧은 변** 기준 / 스케일 불변 / 못 쓰는 캔버스는 `null`.
E2E는 렌더된 값이 **naive `80%`가 아님**을 증명하고, resize 시 이동이 **0.5%p 미만**임을 확인한다.

> ⚠️ resize에서 **bit-identical이 아닌 것은 의도**다. band가 width마다 반올림되고 **그려지는 mat도 똑같이
> 반올림**되므로, 오버레이가 mat을 따라가는 것이 계약이고 차이는 반올림 크기(≈0.09%p)뿐이다.

### 2. 선언된 시계 사진의 실패가 텍스트로 대체됐다

**지적**: custom image가 **선언됐는데 resolve 실패**하면 조용히 `HH:MM` 텍스트로 떨어졌다 —
특정 하드웨어 사진 자리에 **일반 디지털 시계**를 보여주는 것은 제품을 잘못 표현한다.

**보완**: `declared`와 `src`를 **분리**했다. 선언됐는데 resolve 실패이거나 `<img>`가 **load 실패**하면
**오버레이를 숨긴다**. 텍스트 `HH:MM`은 **애초에 사진이 선언되지 않았을 때만** 쓴다. 실패한 source를
기억해 **재시도 루프가 생기지 않고**, source·오류 원문은 어디에도 노출되지 않으며 사진·텍스트 plan은
**그대로 유지**된다.

### 3. 요청한 폰트의 가용성을 확인하지 않았다

**지적**: `document.fonts.ready`는 **로딩이 끝났다**는 뜻이지 **그 family가 로드됐다**는 뜻이 아니다.
대체 폰트로 재고 real family로 그리면 wrap이 달라진다 — 레거시의 미리보기≠인쇄 그 자체다.

**보완**: **측정 전에**, 값이 실제로 있는 각 zone에 대해 **측정·executor가 쓸 바로 그 `fontShorthand`** 로
`document.fonts.check(...)`를 확인한다. **FontFaceSet 부재·check 부재·check throw·false**면 텍스트 plan을
**fail-closed**한다(대체 측정 없음). 텍스트 없는 액자는 그대로 동작하고, **입력창 자체는 게이트와 무관**해
고객은 언제든 타이핑할 수 있다.

### 게이트 (재실측)

frozen exit 0 / lockfile·manifest diff **0** / 신규 의존성 0 / format·lint·typecheck /
**unit 1088**(1081→1088) / build mockup JS **281.69 kB**(gzip **86.99**), CSS **17.85**(gzip 4.30),
admin 무변경 / **E2E 116 PASS**(114→116) exit 0 / `git diff --check` clean / 포트 4183·4184 free /
OS temp 0 / 고객 dist SHA-256 E2E 전후 **동일** / network·live·deploy **0**.

### 무변경 확인

회전·텍스트 wrap·오류 우선순위·F-1~F-8 결정 **전부 무변경**. `surface.css`·`packages/**`·
`apps/mockup/src/canvas/**` **무변경**. 스펙 018 PNG 2개와 content diff 0인
`packages/render/src/plan/index.ts`는 **restore·stage·commit하지 않았다**.

---

## 9. 종료 (2026-07-31) — CODEX_PASSED → COMMITTED

Codex가 보완 라운드 1 커밋 `b7d46d3`(코드 `88b64e6`)을 독립 재검증해 **승인**했고, Claude Code가
**종료 문서만** 하나의 문서 커밋으로 처리했다. 기능 코드·테스트·CSS·설정 변경 **0**
(`git diff 88b64e6..HEAD -- apps packages tests` = **0줄**).

### 최종 검증 결과

| 게이트 | 결과 |
| --- | --- |
| unit | **1088 / 1088** |
| 실제 Chromium E2E | **116 / 116** |
| frozen install · format · lint · typecheck · build · `git diff --check` | **PASS** |
| lockfile·manifest diff / 신규 의존성 | **0 / 0** |
| 포트 4183·4184 / OS temp staging 잔류 | **0 / 0** |
| 고객 dist SHA-256 (E2E 전/후) | **동일** |
| 실제 network·live·Firebase·CORS·Rules/Hosting·deploy | **0** |
| **잔류 프로세스 command-line 검사** | **NOT TESTED** |

Claude 재실측(같은 트리)도 `check` PASS·unit 1088로 Codex 게이트와 일치한다.

### 판단 2건의 처리

최초 라운드에서 올린 ① **배럴 확장 대신 구조적 타입**(§3) ② **입력 거부의 빌더 시험 빌드**(§2.2)에
대해 **명시적 별도 지시는 오지 않았다**. 이번 승인으로 **현재 구현 형태가 수용된 것으로 기록**한다.
후속 스펙에서 배럴을 넓히거나 wrap 헬퍼를 노출하기로 정해지면 그때 정리한다.

### 최종 상태

- 승인 코드 `88b64e6`(최초 구현 `78095f8`), 승인 문서 `b7d46d3`, 종료 문서 커밋은 이 라운드
- 커밋 파일(허용 목록과 정확히 일치): 정본 스펙(§CODEX_PASSED), 이 인계(§9),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 restore·checkout·stage·
  commit **하지 않았다**
- 다음 스펙·사전조사·기능 **미착수**

### NOT TESTED (종료 시점 유지)

- **잔류 프로세스 command-line 검사**
- 실기기 4환경의 **IME · 폰트 · 오버레이**, **system font 대체**, 실제 **인쇄물 가독성**
- **실제 print/export의 텍스트 출력**(인쇄 경로는 아직 이 plan을 소비하지 않는다)
- **실제 물리 시계와 오버레이 위치의 일치 여부**
- case 텍스트 · admin `name2` · 고객 style (모두 Founder 결정으로 범위 밖)

⚠️ 이 종료는 **합성 fixture에서 문구를 입력하고 시계 자리를 표시한 단계**이며 실기기·인쇄/export·주문·
배포 완료가 아니다. `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.
