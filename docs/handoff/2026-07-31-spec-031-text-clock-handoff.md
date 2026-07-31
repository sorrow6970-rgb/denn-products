# 스펙 031 인계 — 액자 텍스트 영역과 물리적 시계 미리보기

상태: **구현·자체검증 완료 → `READY_FOR_CODEX`** (2026-07-31)
코드/test 커밋: `78095f8` / 기준: 계약 `3927420`, 결정 정본 `e3dc2b1`, 조사 `7636367`

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
- **`pointer-events:none` + `aria-hidden`** 인 **DOM 오버레이**로, percent 위치라 **resize에도 유지**되고
  **plan·인쇄·주문에 들어갈 경로가 없다**.
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
