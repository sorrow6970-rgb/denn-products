# 조사 — 로컬 액자 PNG export 연결부

작성: Claude Code, 2026-07-31 · **읽기 전용 조사. 제품 코드·테스트·CSS·설정 변경 0.**
지시: `Automation/NEXT_CLAUDE_PROMPT.md`(`aaf9268`) · 선행 조사 `918ee9e`(Codex 승인)
기준: HEAD=origin=`aaf9268`
**실제 network·live·Firebase·업로드·주문 전송·배포 0.** 근거는 전부 로컬 소스다.

---

## 0. 네 줄 요약

1. **★★ export가 `logicalWidth`를 바꾸면 P-6이 깨진다.** 현재 frame plan의 논리 폭은
   **측정된 CSS 폭**에서 나오고(`resolveFrameLogicalWidth`), 폰트 크기·wrap 폭이 **전부 그 폭의 %**다.
   인쇄 폭으로 **다시 빌드하면 재측정 → 재wrap**이라 줄바꿈이 달라질 수 있다.
   **줄바꿈 동일성을 구조적으로 보장하는 유일한 방법은 plan을 그대로 두고 transform만 거는 것**이다.
2. **★ 그 transform 패턴은 이미 검증돼 있다.** `surface.ts`가 매 draw마다
   `setTransform(dpr,0,0,dpr,0,0)` 후 **같은 plan을 같은 executor로** 실행한다.
   인쇄는 `dpr` 자리에 `printScale`이 들어가는 **같은 구조**다.
3. **★ 다만 `surface.ts`를 재사용할 수는 없다.** 이 surface는 관측 CSS 크기가
   `plan.logicalCanvas`와 **0.5px 이내로 같아야** 하고 아니면 `failed`를 낸다(`:110-117`).
   인쇄는 정의상 크기가 다르므로 **별도의 얇은 실행 경로**가 필요하다.
4. **★ 지금 export를 붙일 seam이 없다.** `plan`·`imageBindings`는 `PreviewComposer` 내부
   `useMemo` 지역값이고 밖으로 나가지 않는다. 리빌드 전체에 `toBlob`·`toDataURL`·다운로드 **0건**이다.

---

## 1. seam — 지금 무엇이 어디에 있나

### 1.1 export가 필요로 하는 세 가지 (전부 `PreviewComposer.tsx` 내부)

| 필요 | 현재 위치 | 밖으로 나가나 |
| --- | --- | --- |
| 승인된 최신 plan | `built` `useMemo` → `const plan = built?.plan ?? null`(`:534-677`) | **아니오** |
| `imageBindings` | `useMemo`(`:513-522`), 슬롯별 prefix + art 합성 | **아니오** |
| font readiness | `fontsReady` state + `fontsAvailable` 콜백(`:326-368`) | **아니오** |

`plan`은 **이미 fail-closed로 게이트**돼 있다 — `artBlocked`면 `null`, 슬롯 이미지가 `ready`가 아니면
`null`, 텍스트가 있는데 `fontsReady`가 아니거나 요청 family가 없으면 `null`(`:613-630`).

> **결론**: `plan !== null`이라는 사실 자체가 **"art·user image·font가 전부 준비됐다"는 증명**이다.
> export가 별도의 준비 판정을 만들 필요가 **없고, 만들면 두 번째 진실 원천이 된다.**

### 1.2 seam 후보 (관측이지 선택이 아님)

`built`는 `{plan, maxPan}`을 이미 반환한다. export에 필요한 것은
**`plan` + `imageBindings`** 두 개뿐이며 둘 다 이미 같은 컴포넌트 안에 있다.
따라서 seam은 **새 상태를 만드는 일이 아니라 이미 있는 두 값을 export 함수에 넘기는 일**이다.

`plan`이 `null`이면 버튼이 **없거나 비활성**이어야 한다 — 이것이 §4의 UI 규칙과 만난다.

---

## 2. ★★ 좌표: 왜 "plan 재빌드"가 P-6과 충돌하는가

### 2.1 논리 폭의 출처

```ts
// PreviewComposer.tsx:562-566
const logicalWidth =
  geometry.kind === "frame" && contentWidth !== null
    ? resolveFrameLogicalWidth(contentWidth) : null;
if (geometry.kind === "frame" && logicalWidth === null) return null;
```

```ts
// previewContracts.ts:83-87
export const FRAME_MAX_LOGICAL_WIDTH = 500;
return Math.max(1, Math.round(Math.min(contentBoxWidth, FRAME_MAX_LOGICAL_WIDTH)));
```

즉 논리 폭은 **관측 CSS 폭을 500으로 상한한 정수**다.

### 2.2 텍스트가 그 폭에 종속돼 있다

```ts
// PreviewComposer.tsx:631-639 (font availability check)
sizePx: (zone.fontSizePercent / 100) * logicalWidth,
```

`fontSizePercent`·`boxWidthPercent`가 **논리 폭의 %**다. wrap은 `buildFrameProductPlan` 안에서
**주입된 `measureText`로 한 번** 확정된다(스펙 031).

**따라서 `logicalWidth`를 인쇄 폭(예: 2480px)으로 바꿔 재빌드하면 폰트 픽셀 크기가 달라지고
`measureText`가 다시 호출되어 wrap이 재계산된다.** 힌팅·서브픽셀 때문에 **같은 줄바꿈이 나온다는
보장이 없다** — 이는 P-6이 명시적으로 금지한 "재측정으로 대체로 같음에 기대는 방식"이다.

### 2.3 반대로, uniform transform은 구조적으로 안전하다

plan을 **바꾸지 않으면** `draw-text` 커맨드의 `lines[{text,width}]`가 **이미 확정된 값 그대로**다.
executor는 그 lines를 그리기만 한다. 스케일은 context transform이 담당하므로
**wrap이 다시 계산될 여지 자체가 없다.**

### 2.4 그 패턴의 기존 근거

```ts
// surface.ts:151 — 매 draw마다
context.setTransform(dpr, 0, 0, dpr, 0, 0);
// 그 직후 같은 plan을 같은 executor로
const result = execute({ context, plan: snapshot.plan, imageBindings: snapshot.imageBindings });
```

`executePreviewPlan.ts` 헤더가 명시한다 — **DPR/backing transform은 caller의 책임**이고 executor는
**논리 좌표만** 그린다. 즉 `dpr` 자리에 `printWidth / plan.logicalCanvas.width`를 넣는 것은
**새 능력이 아니라 이미 있는 계약의 다른 인자**다.

레거시도 사실상 같은 일을 했다: `renderFramePrint`가 `drawImageT(..., dim.w/500)`으로
**하드코딩 500 기준 배율**을 곱한다. **그 500이 리빌드의 `FRAME_MAX_LOGICAL_WIDTH`와 같은 수**다.

### 2.5 ★ 남는 위험 (NOT VERIFIED)

- **비정수 배율**: `printWidth / logicalWidth`는 대개 정수가 아니다(예: 2480/500 = 4.96).
  선·사각형 경계에 **반픽셀**이 생길 수 있다. 미리보기에서는 DPR 2에서만 보던 문제다.
- **letter-spacing 품질**: 스펙 031의 자간은 **glyph 단위 `fillText`** 다. 4.96배에서 각 glyph 위치가
  transform으로 스케일되면 **누적 반올림**이 어떻게 보이는지 **측정된 바 없다**
  (스펙 032 결정 문서가 이미 NOT VERIFIED로 기록한 항목).
- **`draw-image-cover`의 clip**: 클립 경계가 배율 후 반픽셀에 걸리면 **1px 이가 빠질 수 있다.**

**→ 이 세 가지는 실제 픽셀로 확인해야 하며, 조사만으로 "안전하다"고 말할 수 없다.**

---

## 3. 캔버스·`toBlob`·object URL 소유권

### 3.1 detached canvas가 필요한 이유

`surface.ts`는 **화면 캔버스 전용**이다(`:110-117`의 logicalCanvas 일치 검사).
인쇄는 `document.createElement("canvas")`로 만든 **DOM에 붙지 않은** 캔버스여야 하고,
`width`/`height`에 **인쇄 픽셀**을 직접 넣은 뒤 `setTransform(scale,0,0,scale,0,0)` → executor 실행이다.

### 3.2 taint — 현재 구조에서는 안전하지만 **검증 대상**이다

| 이미지 | 출처 | taint |
| --- | --- | --- |
| 고객 사진 | `URL.createObjectURL(blob)`(`localImageBinding.ts:89`) | same-origin → 안전 |
| 템플릿 아트 (`data-image`) | `data:` URL | 안전(주석 `:218`) |
| 템플릿 아트 (`firebase-download-image`) | `crossOrigin="anonymous"` **src 이전에 설정**(`:217-220`) | 버킷 CORS가 살아 있어야 안전 |

세 번째가 CLAUDE.md §4 제약 7 그 자체다. **anonymous 실패를 crossOrigin 없이 재시도하지 않는다**는
규율이 이미 코드에 있다(`:214`) — 재시도했다면 **tainted canvas → 인쇄 0×0**이 된다.

**그래도 `toBlob`은 taint를 `SecurityError`로 던질 수 있으므로 반드시 감싸야 한다.**

### 3.3 `toBlob` 실패 3종과 P-3

| 실패 | 처리 |
| --- | --- |
| 콜백 `blob === null` | **파일 0개.** 부분 파일·빈 파일 금지 |
| 동기 throw (`SecurityError` 등) | **파일 0개** |
| executor가 `ok:false` | **`toBlob`을 아예 호출하지 않는다** |

**순서가 중요하다**: executor 결과를 먼저 확인하고 `ok`일 때만 `toBlob`한다.
레거시는 반대였다 — `renderFramePrint`가 아트 로드 실패를 `warnings`에 넣고도
**아트 빠진 PNG를 그대로 반환**해 다운로드·주문까지 보냈다. **P-3이 금지한 바로 그 동작이다.**

### 3.4 object URL 수명

레거시 `downloadBlob`:

```js
var a=document.createElement('a'), url=URL.createObjectURL(blob);
a.download=fileName; a.href=url; document.body.appendChild(a); a.click();
setTimeout(function(){URL.revokeObjectURL(url); a.remove()}, 800);
```

**800ms 타이머 기반 해제**다. 관측되는 문제:

- 탭이 그 사이 닫히면 **revoke가 실행되지 않는다**(누수).
- 800ms는 **근거 없는 상수**다. 느린 기기에서 다운로드가 시작되기 전에 해제될 여지가 있다.

리빌드에서는 **생성한 쪽이 반드시 해제**하고, 컴포넌트 unmount·재생성 시에도 **살아 있는 URL이
1개를 넘지 않게** 하는 편이 안전하다(스펙 031 시계 타이머의 **generation guard + ≤1 live** 규율과 동형).

---

## 4. physical size가 `null`/error일 때의 UI

스펙 032가 이미 정했다: **cm이 없으면 인쇄를 만들지 않는다**(P-2·P-3).
`projectFramePrintPhysicalSize`는 `{widthCm,heightCm}` / `null` / `{ok:false}` 세 가지를 낸다.

| 상태 | 버튼 | 안내 |
| --- | --- | --- |
| `ok` + 값 | 활성 | — |
| `ok` + `null` (cm 미입력) | **비활성** | "아직 이 사이즈는 인쇄 파일을 만들 수 없다"는 취지의 **고정 문구** |
| `ok:false` (반쪽·범위 밖) | **비활성** | 같은 고정 문구 (코드·수치 노출 금지) |
| `plan === null` | **비활성** | 기존 미리보기 사유 문구가 이미 있다 |

접근성 규율은 이미 저장소에 있다: `PREVIEW_MESSAGES`가 **코드·id·파일명·URL·예외를 담지 않는
고정 문구**이고(`previewContracts.ts:89-101`), 스펙 031 텍스트 입력이
`aria-describedby`로 사유를 연결한다. **같은 방식이면 된다.**

> ⚠️ **비활성 버튼만 두면 이유를 모른다.** `disabled`는 스크린리더가 이유를 읽지 못하므로
> **사유 문구를 `aria-describedby`로 묶는 것**이 사실상 필수다.

---

## 5. provisional 해상도 계산의 순수 함수 경계

레거시 `CONFIG`(`denn-mockup-tool.html:11242-11248`):

```js
var CONFIG={ version:'v36.5-print-resolution-step2',
  dpi:300, minLongSide:3000, maxPixels:36000000, fallbackLongSide:3508 };
```

`framePrintSize`(`:11318-11340`) 순서:

1. `cm` 있으면 `round(cm / 2.54 * dpi)`, 없으면 **`aspect` + `fallbackLongSide` 추정**
2. 긴 변 `< minLongSide`면 **업스케일**
3. 픽셀 수 `> maxPixels`면 `sqrt` 비율로 **다운스케일**(하한 900)

### 5.1 P-2·P-4a가 이 함수에 거는 제약

- **★ 2단계 `fallbackLongSide` 분기는 재현 금지다.** cm이 없으면 **인쇄를 만들지 않는다**(P-2).
  `aspect`로 추정하는 순간 P-2 위반이다.
- 나머지(cm→px, min 업스케일, maxPixels 다운스케일)는 **인자를 받는 순수 함수**로 만들 수 있고,
  **상수는 명시적 provisional 표식과 함께 한 곳에** 두면 인쇄소 확인 후 상수만 바꾸면 된다(P-4a).
- **결정성**: `Date.now()`·`Math.random()`·DOM 접근이 들어가지 않으므로 unit으로 완전히 고정된다.

### 5.2 관측된 함정

- **`minLongSide` 업스케일과 `maxPixels` 다운스케일이 서로 싸울 수 있다.** 매우 긴 비율에서
  업스케일 후 픽셀 수가 상한을 넘으면 다운스케일이 다시 긴 변을 `minLongSide` 아래로 떨어뜨린다.
  레거시는 **재검사하지 않는다** → 결과가 두 제약을 **동시에 만족하지 못할 수 있다**.
  fail-closed 규율대로면 **그 경우 실패해야 한다**(조용히 어기지 말 것).
- `maxPixels` 다운스케일의 하한 `900`은 **또 다른 근거 없는 상수**다.

---

## 6. 동일성 검증 방법

**전제: plan을 재빌드하지 않으면 lines·rotation·pan·layer는 "검증"이 아니라 "동어반복"이 된다** —
같은 plan 객체이므로 다를 수가 없다. 그래서 검증의 초점은 **"정말 같은 plan이 쓰였는가"** 다.

| 무엇 | 어떻게 | 층 |
| --- | --- | --- |
| export가 미리보기와 **같은 plan 인스턴스**를 소비 | 주입한 fake executor가 받은 `plan`을 미리보기 plan과 **깊은 비교** | unit |
| `draw-text`의 `lines` 불변 | export 경로 전후로 plan을 **JSON 직렬화 비교** | unit |
| transform이 **uniform**(a==d, b==c==0) | fake context가 기록한 `setTransform` 인자 검사 | unit |
| 호출 **순서**: 크기 지정 → setTransform → execute → (ok면) toBlob | fake의 호출 로그 순서 검증 | unit |
| 준비 실패 시 **파일 0개, retry 0** | fake `toBlob` 호출 횟수 **0** | unit |
| 실제 픽셀 | Chromium에서 export 캔버스와 미리보기 캔버스를 **같은 크기로 정규화 후 비교** | E2E |
| PNG 바이트 | 같은 입력으로 **두 번 export → 바이트 동일**(결정성) | E2E |

**NOT TESTED로 남을 것**: 실제 인쇄물, 인쇄소 파일 수용 여부, 대용량 이미지 메모리·성능,
실기기 `toBlob` 한계(스펙 032가 이미 NOT VERIFIED로 기록).

E2E는 이미 `tests/e2e/mockup-preview.spec.ts` 하나에 스펙별 `test.describe`로 쌓여 있으므로
같은 파일에 붙이는 것이 기존 관례와 맞다.

---

## 7. hard boundary — 경로에 들어가면 안 되는 것

| 금지 | 근거 |
| --- | --- |
| Storage/Firebase **업로드** | P-4a — 인쇄소 확인 전 **차단** |
| **주문 payload** 생성·저장·전송 | P-5, 그리고 주문은 별도 스펙 |
| **IndexedDB 주문 저장** | 레거시 `saveDennOrderRequestV36`가 하던 일. 이번 범위 밖 |
| **카카오 열기** | 레거시 `createOrder`의 `openKakao` |
| 실제 network·fetch | 조사·구현 모두 |
| **고객 문구를 텍스트로 저장·전송** | P-5c — 문구는 **PNG 픽셀로만** 존재한다 |
| 파일명에 고객 문구·id·token | P-5c의 연장. 레거시 `safeName(sz.name)`은 **제품 사이즈명**이라 별개지만, 파일명 규칙은 스펙이 정해야 한다 |

**로컬 다운로드와 E2E는 P-4a가 명시적으로 허용**한다.

레거시 V36 경로(`denn-mockup-tool.html:9732`)는 **다운로드 + IndexedDB 주문 저장 + 카카오 열기**를
**한 함수에 묶어** 두었다. 리빌드는 **PNG 생성까지만** 하고 나머지는 **아예 코드로 존재하지 않아야** 한다.

> **참고**: 레거시에는 `framePrintSize`가 **두 개** 있다 — V36(`:9732`, cm 무시, 하드코딩
> `longSide=3000`)과 V36.5(`:11318`, `frameCm` 기반). **V36이 여전히 주문 버튼에 연결돼 있다.**
> 즉 레거시 주문 PNG는 **cm을 전혀 안 볼 수도 있다**(NOT VERIFIED — 실행 확인 안 함).

---

## 8. 구현 허용 파일 후보 (제안이 아니라 최소 집합의 관측)

| 파일 | 왜 |
| --- | --- |
| `apps/mockup/src/print/printSize.ts`(신규) + `.test.ts` | §5의 순수 계산. **DOM·Canvas 없음** |
| `apps/mockup/src/print/exportFramePng.ts`(신규) + `.test.ts` | detached canvas + transform + executor + `toBlob`. **주입 포트로** fake 검증 |
| `apps/mockup/src/preview/PreviewComposer.tsx` | 버튼·비활성 사유·`plan`/`imageBindings` 전달 seam |
| `apps/mockup/src/preview/previewContracts.ts` | 고정 안내 문구 추가 |
| `apps/mockup/src/preview/*.css` (해당 파일) | 버튼 스타일 |
| `tests/e2e/mockup-preview.spec.ts` | §6 E2E |
| spec·handoff·CURRENT·live·Automation 문서 | 기록 |

**건드리지 않아야 하는 것**: `packages/render/**`(plan 계약 무변경이 이 접근의 핵심),
`packages/shared/**`, `apps/admin/**`, `packages/render/src/geometry/**`,
`canvas/localImageBinding.ts`·`templateArtBinding.ts`·`placement.ts`,
`canvas/surface.ts`(화면 전용 불변식을 인쇄 때문에 완화하면 미리보기 보호가 약해진다),
운영 HTML, lockfile·의존성.

---

## 9. STOP — 결정이 필요한 것

| # | 항목 | 누가 |
| --- | --- | --- |
| **★ E-1** | **C-1 확정** — §2가 uniform transform에 유리한 근거를 모았지만 **선택은 Codex 몫**이며 이 조사는 고르지 않았다 | **Codex** |
| **E-2** | §2.5의 **비정수 배율·자간·clip 반픽셀**을 **구현 전에 측정**할지, 구현 후 E2E로 판정할지 | **Codex** |
| **E-3** | §5.2 — `minLongSide`와 `maxPixels`가 **동시에 만족 불가**할 때 실패로 볼지 | **Codex** |
| **E-4** | **파일명 규칙** (제품 사이즈명 포함 여부, 타임스탬프 형식) — P-5c와 닿는다 | **Founder** |
| **E-5** | 다운로드 UI 위치·문구, 비활성 사유의 정확한 한국어 | **Founder** |
| **E-6** | provisional 상수(300dpi/3000/36M)를 **UI에 노출**할지(운영자·고객이 임시값임을 알아야 하는가) | **Founder** |

---

## 10. 범위와 한계

- **읽기 전용.** 파일 수정 0. 실행한 것은 read/grep/git 조회뿐이다.
- **실제 network·live·Firebase·업로드·주문 전송·배포 0.** 신규 의존성 0.
- **NOT VERIFIED**: §2.5의 세 가지 픽셀 위험(측정 안 함) · 레거시 주문 버튼이 실제로 V36
  경로를 쓰는지(실행 안 함) · 실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 ·
  인쇄소 요구(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기).
- **뒤집지 않은 것**: 스펙 032 P-1~P-6, 선행 029/030/031 확정분.
  **C-1(후보 A/B/C)은 고르지 않았다.** 스펙 032 조사 보고서에 대한 **Codex 재검토는 여전히 미완**이다.
- **Founder F-A~F-E**(admin 인증·쓰기·발행)는 **이 조사와 독립**이며 여전히 미결이다.
  이번 범위는 P-4a가 허용한 **로컬 생성·다운로드·E2E뿐**이다.
