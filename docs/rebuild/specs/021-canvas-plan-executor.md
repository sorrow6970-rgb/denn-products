# 021 — Canvas render-plan executor 계약

## 목표 (WHY)

스펙 020의 결정적 preview render plan을 Canvas 2D 명령으로 안전하게 실행하는 경계를 만든다.

`@denn/render`는 계속 순수 geometry·plan만 소유하고, Canvas DOM과 `CanvasRenderingContext2D` 실행 책임은 `apps/mockup`에 둔다. 이번 단계에서는 호출자가 이미 메모리에 준비한 합성 drawable binding만 사용하며 URL 해석·이미지 로드·CORS·React 화면 연결은 하지 않는다.

근거:

- `docs/rebuild/specs/019-canvas-geometry-contract.md`
- `docs/rebuild/specs/020-deterministic-render-plan.md`
- `docs/codex-claude-handoff/reviews/2026-07-27-canvas-render-contract-investigation.md`
- 스펙 020의 `fill-rect`, `draw-image-cover`, `stroke-rect` 명령 의미
- 책임 분리: render=순수 plan, app=Canvas DOM·context·image lifecycle

## 범위 (SCOPE)

### 포함

- `apps/mockup` 내부의 React 비의존 Canvas plan executor
- 스펙 020 명령 3종 실행
- 명시적 메모리 image binding lookup
- 실행 전 plan/context/binding preflight
- logical canvas 전체 clear
- Canvas state save/restore 균형
- clip 격리와 draw 순서 보존
- Canvas operation 예외를 throw하지 않는 안전 Result로 변환
- 식별정보 없는 실패 위치·코드
- recording fake context 기반 결정적 unit test
- 기존 전체 자동 회귀 게이트

### 제외(하지 않을 것)

- React component/hook 및 실제 고객 화면 연결
- `<canvas>` 생성·querySelector·getContext 호출
- 실제 `Image`, `HTMLImageElement`, `ImageBitmap` 생성
- URL/base64/data/blob/storagePath를 drawable로 변환
- `imageRef`를 URL로 사용
- fetch·Firebase Storage·getDownloadURL
- crossOrigin·CORS header·taint·getImageData·toBlob
- 실제 브라우저 Canvas 픽셀·스크린샷·golden 비교
- DPR cap 선택·backing width/height 설정·setTransform
- ResizeObserver·orientation listener
- pointer/touch/mouse/wheel/pinch
- 액자 회전
- template art·camera·magsafe·text·clock·watermark
- print/PNG/export·주문·저장·시안공간
- 관리자 앱·운영 HTML·Firebase 설정/Rules·POC·PNG 변경
- 실제 네트워크·live test·배포
- 신규 패키지 설치

## 대상 (WHERE)

구현 대상:

- `apps/mockup/src/canvas/executePreviewPlan.ts`
- `apps/mockup/src/canvas/types.ts` 또는 동일 책임의 최소 타입 파일
- 같은 경계의 unit test

필요하면 파일명은 저장소 관례에 맞게 최소 조정할 수 있다.

참조만 하고 변경하지 않을 대상:

- `packages/render/src/plan/**`
- `packages/render/src/geometry/**`
- `packages/shared/**`
- `packages/firebase/**`
- `packages/spaces/**`
- `packages/ui/**`
- `apps/mockup`의 기존 React UI·catalog·browse 파일
- `apps/admin/**`
- 운영 HTML
- Firebase 설정·Rules
- `poc/**`
- 기존 디자인·결과 PNG

`apps/mockup/package.json`은 `@denn/render` workspace 의존성이 아직 없다면 그 링크 추가만 허용한다. 새 외부 패키지는 금지한다.

## 구현 지시 (WHAT / HOW)

### 1. 공개 executor 계약

권장 API:

```ts
executePreviewRenderPlan({
  context,
  plan,
  imageBindings,
}): CanvasExecutionResult
```

입력 의미:

- `context`: 호출자가 얻은 Canvas 2D 실행 대상
- `plan`: 스펙 020의 검증된 `PreviewRenderPlan`
- `imageBindings`: `imageRef`를 메모리 drawable로 연결하는 read-only lookup

계약:

- executor는 context/canvas를 스스로 찾거나 생성하지 않는다.
- `imageRef`를 URL로 파싱·fetch·decode하지 않는다.
- 자동 retry, fallback image, persistent cache가 없다.
- 명령 순서를 바꾸거나 합치지 않는다.
- 정상적인 잘못된 입력과 Canvas operation 실패에 throw하지 않는다.
- 반환 Result에는 URL, imageRef, layerId, token, 원본 오류 message/stack이 없다.

### 2. Canvas context port

실제 DOM 타입에 과도하게 결합하지 않도록 executor가 필요한 최소 surface만 선언한다.

예시:

```ts
interface PreviewCanvasContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;

  save(): void;
  restore(): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
}
```

정확한 타입은 조정 가능하지만 다음은 금지한다.

- `any`
- 임의 method 이름과 argument 배열
- executor 내부 `getContext`
- `setTransform`, `scale`, `rotate`
- URL string을 drawable로 받는 overload

실제 `CanvasRenderingContext2D`가 구조적으로 이 port를 만족해야 한다. unit에서는 외부 DOM 라이브러리 없이 recording fake를 사용한다.

### 3. image binding

권장 형태:

```ts
interface PreviewImageBindings {
  get(imageRef: string): CanvasImageSource | undefined;
}
```

또는 `ReadonlyMap<string, CanvasImageSource>`를 사용할 수 있다.

필수 계약:

- 값은 이미 decode·준비된 Canvas drawable이다.
- key는 스펙 020의 synthetic `imageRef`다.
- executor는 key를 URL로 취급하지 않는다.
- executor는 binding 전체를 복제·직렬화·로그하지 않는다.
- 누락 binding은 실행 전에 탐지한다.
- 누락 오류 결과에는 실제 key를 넣지 않는다.
- 같은 ref가 여러 command에 쓰이면 같은 binding을 재사용할 수 있다.

실제 URL→drawable 결합과 CORS 정책은 후속 스펙이다.

### 4. preflight — draw 전에 전량 검증

실제 Canvas operation을 하나라도 수행하기 전에 다음을 확인한다.

- context가 필요한 method와 writable style/lineWidth surface를 가진다.
- plan은 plain object이고 kind·logicalCanvas·commands가 유효하다.
- logicalCanvas width/height는 finite `> 0`.
- command 배열의 각 항목은 알려진 type만 사용한다.
- 각 rect 숫자는 finite이고 width/height `> 0`.
- stroke width는 finite `> 0`.
- color는 스펙 020과 동일한 `#RRGGBB`.
- layerId는 비어 있지 않은 string이다.
- 모든 `draw-image-cover`의 imageRef에 binding이 존재한다.
- drawable 값이 `null`/`undefined`가 아니다.

preflight 실패 시:

- Canvas method 호출 0
- style/lineWidth 변경 0
- `{ok:false, code, commandIndex?}`만 반환
- commandIndex는 안전한 0-based number이며 해당 값이 없으면 생략
- 부분 plan을 실행하지 않는다.

스펙 020 builder를 다시 호출하거나 geometry를 재계산하지 않는다.

### 5. 실행 전후 전체 상태 격리

정상 실행 순서:

1. `context.save()` — outer state
2. `clearRect(0, 0, plan.logicalCanvas.width, plan.logicalCanvas.height)` 정확히 1회
3. plan command를 원래 순서대로 실행
4. `context.restore()` — outer state

outer save 성공 이후에는 성공·실패와 관계없이 outer restore를 `finally` 성격으로 정확히 한 번 시도한다.

주의:

- Canvas pixel은 state restore로 롤백되지 않는다.
- preflight는 구조·binding 실패의 부분 draw를 방지하지만, 실행 중 context가 throw하면 이미 그려진 픽셀은 남을 수 있다.
- 실패한 frame을 화면에 commit하지 않는 staging/double-buffer 정책은 앱 통합 후속 스펙이다.
- executor가 성공하지 않았는데 “원자적 렌더 성공”이라고 주장하지 않는다.

### 6. 명령별 실행

#### `fill-rect`

```text
context.fillStyle = command.color
context.fillRect(x, y, width, height)
```

#### `stroke-rect`

```text
context.strokeStyle = command.color
context.lineWidth = command.width
context.strokeRect(x, y, width, height)
```

픽셀 정렬을 위한 0.5 보정이나 width clamp를 임의로 추가하지 않는다.

#### `draw-image-cover`

반드시 다음 순서를 지킨다.

```text
context.save()
context.beginPath()
context.rect(clip.x, clip.y, clip.width, clip.height)
context.clip()
context.drawImage(
  boundDrawable,
  draw.x, draw.y, draw.width, draw.height
)
context.restore()
```

inner save가 성공한 뒤 `beginPath`, `rect`, `clip`, `drawImage` 중 하나가 실패해도 inner restore를 정확히 한 번 시도한다.

그림의 source crop overload(9개 인자), smoothing 정책, globalCompositeOperation을 추가하지 않는다.

### 7. 실패 Result와 우선순위

권장 결과:

```ts
type CanvasExecutionErrorCode =
  | "INVALID_EXECUTOR_INPUT"
  | "INVALID_PLAN"
  | "MISSING_IMAGE_BINDING"
  | "CANVAS_OPERATION_FAILED"
  | "CANVAS_RESTORE_FAILED";

type CanvasExecutionResult =
  | {
      ok: true;
      executedCommands: number;
    }
  | {
      ok: false;
      code: CanvasExecutionErrorCode;
      commandIndex?: number;
    };
```

계약:

- 원본 exception, message, stack, layerId, imageRef를 반환·로그하지 않는다.
- preflight 실패가 Canvas 실행 실패보다 우선한다.
- command 실행 실패 후 restore도 실패하면 state 복구 실패를 숨기지 않는다.
- 권장 우선순위:
  1. outer restore 실패 → `CANVAS_RESTORE_FAILED`
  2. inner restore 실패 → `CANVAS_RESTORE_FAILED`
  3. 그 외 Canvas method/property 실패 → `CANVAS_OPERATION_FAILED`
- 성공 `executedCommands`는 plan command 수와 정확히 같다.
- clear는 command count에 포함하지 않는다.

### 8. 예외·restore 상태머신

다음 경로를 명시적으로 테스트한다.

- outer `save()` 실패 → restore 호출 0
- outer save 성공 후 clear 실패 → outer restore 1회
- inner save 실패 → inner restore 0, outer restore 1회
- inner save 성공 후 beginPath/rect/clip/drawImage 실패 → inner restore 1회 + outer restore 1회
- inner restore 실패 → outer restore도 시도
- command 성공 후 outer restore 실패 → 성공으로 반환 금지
- restore 중 발생한 예외도 밖으로 throw하지 않음

`try/finally`만 겹쳐 결과가 덮이는 모호한 구현을 피하고, 실행 오류와 restore 오류를 안전한 boolean/code 상태로 수집한다.

### 9. 로그·관측

이번 executor는 기본적으로 console에 아무것도 출력하지 않는다.

- `console.log/error/warn` 금지
- callback telemetry 추가 금지
- 예외 객체 저장 금지
- Result의 code·commandIndex·executedCommands만 관측 가능

향후 앱 오류 UI 매핑은 별도 통합 스펙에서 한다.

### 10. 기존 계약 보존

- `@denn/render` 스펙 019·020 코드는 변경하지 않는다.
- `RENDER_NOT_IMPLEMENTED`는 전체 renderer/print 완료를 의미하지 않으므로 제거하지 않는다.
- 기존 browse/catalog/thumbnail UI를 executor에 연결하지 않는다.
- 신규 executor를 앱 mount에서 호출하지 않는다.
- 이 스펙 DONE을 실제 Canvas 화면 완료로 기록하지 않는다.

## 검증 절차 (VERIFY)

### A. 정적 경계

- [ ] 신규 외부 의존성 0
- [ ] `@denn/render` workspace link 외 manifests 최소 변경
- [ ] lockfile은 workspace importer 변경만 허용하며 외부 resolution 신규 0
- [ ] packages/render/shared/firebase/spaces/ui 코드 변경 0
- [ ] 기존 apps/mockup React UI·catalog·browse 코드 변경 0
- [ ] apps/admin·운영 HTML·Firebase 설정/Rules·POC·PNG 변경 0
- [ ] 실제 네트워크·live test·deploy 0
- [ ] executor에 React/Firebase/fetch/Image/getDownloadURL 참조 0

### B. recording fake

외부 DOM test library 없이 다음을 기록하는 fake를 만든다.

- property assignment: fillStyle/strokeStyle/lineWidth
- method name과 numeric arguments
- drawable은 안전한 합성 object identity만 기록하고 직렬화하지 않음
- 특정 operation index/method에서 throw하도록 제어 가능

테스트 결과나 snapshot에 URL·base64·token을 넣지 않는다.

### C. 정상 실행 unit

- [ ] empty command plan → outer save, clear, outer restore; executedCommands=0
- [ ] fill command 정확한 style→fillRect 순서
- [ ] stroke command 정확한 style→lineWidth→strokeRect 순서
- [ ] image command save→beginPath→rect→clip→drawImage→restore 순서
- [ ] 전체 case plan의 command 순서 보존
- [ ] 전체 frame plan의 command 순서 보존
- [ ] clearRect는 논리폭·논리높이로 정확히 1회
- [ ] 동일 imageRef 다중 command는 동일 drawable identity 사용
- [ ] 성공 executedCommands가 command 수와 일치
- [ ] executor가 plan·binding·drawable을 변경하지 않음

### D. preflight unit

- [ ] null/undefined/primitive context·plan·bindings에서 throw 0
- [ ] 누락 context method
- [ ] malformed logicalCanvas
- [ ] commands 비배열
- [ ] unknown command type
- [ ] malformed rect/color/stroke width
- [ ] missing image binding
- [ ] binding value null/undefined
- [ ] 모든 preflight 실패에서 Canvas operation·property assignment 0
- [ ] 오류 직렬화에 layerId/imageRef/URL/token/message/stack 없음

### E. restore·예외 unit

- [ ] §8의 모든 실패 경로
- [ ] 모든 경로에서 밖으로 throw 0
- [ ] outer/inner save 성공 횟수와 restore 시도 횟수 대응
- [ ] Canvas operation 실패 후 이후 command 실행 중단
- [ ] 실패 commandIndex 정확
- [ ] restore 실패 우선순위 정확
- [ ] 부분 픽셀 롤백을 성공으로 주장하지 않음

### F. 금지 동작

- [ ] `imageRef`를 URL parser/fetch/Image.src에 전달 0
- [ ] `setTransform`, `scale`, `rotate`, `translate` 호출 0
- [ ] `getImageData`, `toBlob`, `toDataURL` 호출 0
- [ ] `document`, `window`, querySelector, getContext 호출 0
- [ ] console 출력 0

### G. 실제 Canvas 범위 정직성

- [ ] unit recording fake 통과를 실제 브라우저 Canvas 픽셀 검증으로 보고하지 않음
- [ ] 새 Canvas E2E 수 0이라고 명시
- [ ] 실제 browser Canvas·이미지·CORS-clean·DPR·실기기 = NOT TESTED

### H. 전체 게이트

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] 실행 전후 lockfile 예상 범위 확인
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test:unit`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] `git diff --check`
- [ ] 기존 e2e exit 0, preview 포트 해제, 저장소 소속 신규 Vite/esbuild 잔류 0

## 완료 정의 (DONE)

다음을 모두 만족해야 완료다.

- apps/mockup에 React 비의존 Canvas plan executor가 존재한다.
- 스펙 020 명령 3종을 원래 순서대로 실행한다.
- 모든 imageRef는 메모리 binding lookup key로만 사용된다.
- 구조·binding 오류는 draw 전 preflight에서 실패한다.
- outer/inner Canvas state restore 계약이 모든 예외 경로에서 테스트됐다.
- Result에 식별값·exception·URL/token이 없다.
- actual Canvas 생성·화면 연결·image load/CORS·DPR/pointer/print는 시작하지 않았다.
- recording fake unit과 전체 기존 게이트가 통과한다.
- 실제 Canvas 픽셀·브라우저 동작은 NOT TESTED로 유지한다.
- 코드/test 커밋과 DONE/handoff 문서 커밋을 분리한다.
- HEAD=origin, ahead/behind 0/0, clean으로 Codex 재검증을 요청한다.

## 위험 (RISK)

- preflight는 구조·binding 오류의 부분 draw만 막는다. 실행 중 Canvas가 throw하면 픽셀은 롤백되지 않는다.
- save/restore 실패는 Canvas 상태 오염 가능성을 뜻한다. 후속 앱 통합에서 해당 frame을 commit하지 않는 staging 전략이 필요하다.
- recording fake는 브라우저 Canvas 구현을 대신하지 않는다. 실제 clip·drawImage·CORS-clean은 후속 검증이 필요하다.
- executor가 imageRef를 URL로 해석하면 스펙 020 신뢰 경계가 깨진다.
- DPR transform은 caller 책임으로 남아 있다. 이번 executor는 logical coordinate만 실행한다.

롤백:

1. DONE/handoff 문서 커밋
2. executor 코드/test 커밋

순서로 역 `git revert`. 운영/Firebase/배포 롤백은 없어야 한다.

## QUESTIONS

- 없음. 다음은 의도적으로 후속에 남긴다.
  - 실제 Canvas element/context 생성과 React lifecycle
  - staging/double-buffer commit
  - 실제 image binding load와 CORS-clean
  - 제품 DPR cap·backing adapter
  - pointer·zoom·회전
  - text/clock/template art
  - print/export와 주문 실패 정책

---

### DONE (Claude) — 2026-07-28

- **구현:** `apps/mockup/src/canvas/`에 React 비의존 Canvas plan executor. `types.ts`(port·Result 타입) + `executePreviewPlan.ts`(`executePreviewRenderPlan({context, plan, imageBindings})`) + `executePreviewPlan.test.ts`(recording fake unit 36). `apps/mockup/package.json`에 `@denn/render` **workspace link만** 추가(외부 패키지 0).
- **context port:** `PreviewCanvasContext` = 9 method(`save/restore/clearRect/fillRect/beginPath/rect/clip/drawImage/strokeRect`) + 3 style(`fillStyle/strokeStyle/lineWidth`)만. `any` 0·임의 method 이름/argument 배열 0·내부 `getContext` 0·`setTransform/scale/rotate/translate` 0·9인자 drawImage overload 0·URL string drawable overload 0. 실제 `CanvasRenderingContext2D`가 port를 구조적으로 만족함을 **컴파일 타임 단정**(`CanvasRenderingContext2D extends PreviewCanvasContext`, typecheck에서 깨짐)로 고정. unit은 외부 DOM 라이브러리 없이 recording fake만 사용.
- **image binding:** `PreviewImageBindings = { get(imageRef): CanvasImageSource | undefined }`(`ReadonlyMap<string, CanvasImageSource>`가 구조적으로 만족). imageRef는 **lookup key 전용** — URL parse/fetch/decode/`Image.src` 0. 실제로 그리는 ref만 **ref당 1회** 조회하고 동일 ref는 동일 drawable identity 재사용(테스트로 고정), binding 전체 복제·직렬화·로그 0, 누락 오류에 **실제 key 미포함**.
- **preflight(draw 전 전량 검증):** args 객체 → context surface → bindings surface → plan(kind·logicalCanvas finite>0·commands 배열) → command별(알려진 type·layerId 비어있지 않은 string·rect 숫자 finite & width/height>0·색상 `#RRGGBB`·stroke width finite>0·imageRef 비어있지 않은 string) → 모든 `draw-image-cover` binding 존재·비nullish. 실패 시 **Canvas method 호출 0·style/lineWidth 대입 0**(테스트로 `ops` 빈 배열 확인), `{ok:false, code, commandIndex?}`만, 부분 plan 실행 0. 스펙 020 builder 재호출·geometry 재계산 0.
- **preflight 한계(정확 기록):** preflight는 **읽기만** 한다(`"fillStyle" in ctx`·`typeof ctx.lineWidth === "number"`). 대입 없이 실제 writability를 증명할 수 없고 대입은 §4가 금지하므로, throw하는 setter는 preflight가 아니라 실행 중 `CANVAS_OPERATION_FAILED`로 드러난다.
- **binding 조회가 throw하는 경우(스펙 미명시 → 판단 기록):** 호출자 lookup이 던지면 draw 전에 `INVALID_EXECUTOR_INPUT` + `commandIndex`로 반환(예외 객체 미저장). throw를 밖으로 내보내지 않기 위한 선택이며 별도 code를 만들지 않았다.
- **실행 순서:** outer `save()` → `clearRect(0,0,logicalCanvas.width,logicalCanvas.height)` **정확히 1회**(command count 미포함) → plan command **원래 순서 그대로**(재정렬·병합 0) → outer `restore()`. outer save 성공 후에는 성공·실패 무관하게 outer restore **정확히 1회 시도**. `draw-image-cover`는 `save→beginPath→rect→clip→drawImage→restore` 고정(0.5 보정·width clamp·source crop 9인자·smoothing·globalCompositeOperation 추가 0), inner save 성공 후 중간 실패 시 inner restore 1회 시도.
- **Result:** 성공 `{ok:true, executedCommands}`(= `plan.commands.length`). 실패 `{ok:false, code, commandIndex?}`, code=`INVALID_EXECUTOR_INPUT|INVALID_PLAN|MISSING_IMAGE_BINDING|CANVAS_OPERATION_FAILED|CANVAS_RESTORE_FAILED`. **layerId·imageRef·URL·token·원본 message/stack 미포함**(직렬화 키가 `ok/code/commandIndex`뿐임을 테스트로 확인). 우선순위=outer restore 실패 → inner restore 실패 → 그 외 operation 실패. preflight 실패가 실행 실패보다 우선. restore 실패는 절대 성공으로 보고하지 않음.
- **예외·restore 상태머신 테스트(§8 전 경로):** outer save 실패→restore 0 / clear 실패→outer restore 1·commandIndex 없음 / inner save 실패→inner restore 0·outer restore 1 / inner `beginPath|rect|clip|drawImage` 각각 실패→inner+outer restore 각 1 / inner restore 실패→`CANVAS_RESTORE_FAILED`·outer restore도 시도 / command 성공 후 outer restore 실패→성공 아님 / style 대입(`fillStyle/strokeStyle/lineWidth`) throw→`CANVAS_OPERATION_FAILED` / 첫 실패 후 이후 command 실행 중단 / 모든 경로에서 밖으로 throw 0.
- **로그·관측 0:** console `log/warn/error/info/debug` spy로 성공·실패·malformed 경로 전부 호출 0 확인. telemetry callback 0, 예외 객체 저장 0.
- **금지 동작 검증:** Proxy로 접근된 context 속성을 수집해 **선언한 12개 key만** 접촉함을 확인(`setTransform/scale/rotate/translate/getImageData/toBlob/toDataURL/getContext/canvas/globalCompositeOperation/imageSmoothingEnabled` 접촉 0). 주석 제거 후 source 스캔으로 `fetch(`·`new Image`·`ImageBitmap`·`createImageBitmap`·`getContext`·`querySelector`·`document`·`window`·`setTransform`·`getImageData`·`toBlob`·`toDataURL`·`crossOrigin`·`getDownloadURL`·`firebase`·`react`·`console.`·`new URL`·`devicePixelRatio`·`ResizeObserver`·`: any` 참조 0.
- **비변형:** 실제 스펙 020 case/frame plan(빌더로 생성)을 실행해도 plan 직렬화·bindings size/identity·drawable 내용 무변경.
- **게이트:** `install --frozen-lockfile` exit 0 / lockfile diff = **mockup importer `@denn/render` link 3줄만**(외부 resolution 신규 0) / format·lint·typecheck / **unit 408**(canvas 36 신규, 372→408) / build 독립(**mockup JS gzip 68.40KB·admin 61.09KB = 무변경** — executor가 앱 mount에 연결되지 않아 번들에 포함되지 않음) / **e2e 49 PASS·exit 0**(기존 회귀만, **새 Canvas E2E 0**) / check PASS / `git diff --check` clean / 포트 4183·4184 LISTENING 0·저장소 소속 Vite/esbuild 잔류 0.
- **무변경:** `packages/render|shared|firebase|spaces|ui` 코드, 기존 `apps/mockup` React UI·catalog·browse 파일, `apps/admin/**`, 운영 HTML, Firebase 설정/Rules, `poc/**`, 결과·디자인 PNG. e2e가 `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`를 재생성했으나 **커밋하지 않고 원본 복원**(스펙 017·018과 동일 처리). 실제 네트워크·live test·deploy 0.
- **미검증(NOT TESTED):** recording fake 통과는 **실제 브라우저 Canvas 픽셀 검증이 아니다**. 실제 clip/drawImage 결과·CORS-clean·이미지 load·선명도·DPR·실기기 = NOT TESTED. `<canvas>` 생성·React 화면 연결·staging/double-buffer commit·pointer·회전·text/clock/template art·print/export·주문 = **미착수**. executor는 앱 mount에서 호출되지 않음(스펙 §10). 이 DONE은 실제 Canvas 화면 완료가 아니다.
- 커밋: 코드/test(`54d23f8`)와 DONE/handoff 문서 분리. 핸드오프 `docs/2026-07-28-spec-021-canvas-plan-executor-handoff.md`.

### DONE 보완 (Claude) — 2026-07-28 (Codex "수정 후 재검증" 2건)

- **[1] hostile getter/Proxy에서도 public executor throw 0 (필수).** preflight의 **모든 property 읽기**를 try/catch 안으로 옮기고 2단계로 분리했다: (a) `readExecutorSurface` = args→context/bindings/plan 읽기·context surface·bindings 검사 → 예외 시 `INVALID_EXECUTOR_INPUT`, (b) `normalizePlan` = plan/command 읽기 → 예외 시 `INVALID_PLAN`. throwing accessor·throwing Proxy `get`/`has` trap·revoked Proxy(`Array.isArray`가 던지는 경우 포함)가 모두 안전 분류된다. **preflight 실패 시 Canvas method 호출 0·style/lineWidth 대입 0 유지**(테스트에서 `ops` 빈 배열 확인).
- **[1-a] bindings `get` 1회 캡처:** stage (a)에서 `bindings.get`을 한 번 읽어 pre-bound 함수로 보관하고 이후 caller 객체에서 다시 읽지 않는다(두 번째 읽기에서 던지는 getter 차단, `ReadonlyMap` 호환 유지).
- **[1-b] plain normalized snapshot(§4 권고 채택):** preflight가 검증한 값을 **각각 정확히 1회만 읽어** 새 plain object로 복사한다 — `logicalCanvas`(width/height)와 command별 draw에 필요한 필드만(`fill-rect`=rect+color, `stroke-rect`=rect+color+width, `draw-image-cover`=clipRect+drawRect+**drawable identity**). **`layerId`·`imageRef`는 snapshot에 복사하지 않는다**(draw에 불필요·Result 누출 원천 차단). 실행 단계는 snapshot만 읽으므로 **검증 시 정상값 → draw 시 다른 값/예외를 반환하는 getter drift가 불가능**하다(clearRect도 snapshot 값 사용).
- **[1-c] 변경하지 않은 것:** Canvas method/property 실행은 기존 `attempt()` 경계 그대로, setter writability는 여전히 mutation으로 시험하지 않음(§6), 정상 실행 순서·restore 우선순위·Result API·오류 code 집합 무변경.
- **[1-d] 추가 테스트 12건(canvas unit 36 → 48):** context method getter throw(save/restore/clearRect/drawImage/strokeRect) · `lineWidth` getter throw · Proxy `get` trap 전면 throw · Proxy `has` trap throw(fillStyle/strokeStyle) · **style 값은 애초에 읽지 않음**(throwing `fillStyle`/`strokeStyle` getter는 무해 → `ok:true`로 "읽지 않음"을 증명) · args container getter throw(context/plan/imageBindings) · `bindings.get` property getter throw · plan `kind`/`logicalCanvas`/`commands` getter throw · commands **배열 element** getter throw(Proxy array) · command `type`/`layerId`/`rect`/`color`/`imageRef`/`clipRect`/`drawRect` getter throw · rect 필드(`height`) getter throw · **revoked Proxy** 3종(context·bindings→`INVALID_EXECUTOR_INPUT`, plan→`INVALID_PLAN`) · **getter drift 2종**(command rect/color: 1회만 읽고 첫 값으로 그림 / plan commands·logicalCanvas: 1회만 읽어 `executedCommands`·clear 크기 고정). 전부 `expect(...).not.toThrow()` + preflight 실패 경로는 Canvas operation·style 대입 0.
- **[2] Tailwind v4 CSS bundle drift 제거 (필수).** **실측 원인 확인:** `apps/mockup/src/canvas`를 트리에서 잠시 제외하고 빌드해 대조 → 있을 때 **11.99 KB / gzip 3.35 KB**, 없을 때 **11.32 KB / gzip 3.16 KB**(Codex 수치와 일치). 생성 CSS diff로 확인한 **실제 추가분은 `.block`·`.transform` + transform용 `@layer properties`·`--tw-rotate-*`/`--tw-skew-*` `@property` 5개**(대부분의 670 bytes). Tailwind v4 자동 source 탐지가 앱 하위 **비-UI 로직·테스트 파일까지 class 후보로 스캔**한 것이 원인(executor는 JSX·className 0).
  - **정정:** Codex가 든 5종 중 **`.visible`·`.fixed`·`.hidden`은 스펙 020 baseline CSS에 이미 존재**했다(기존 browse UI source 유래). drift는 `.block`·`.transform`(+scaffolding) 2종이다.
  - **수정:** Tailwind root인 `packages/ui/src/theme.css`(양 앱이 import하는 유일한 `@import "tailwindcss"`)에 **`@source not "../../../apps/mockup/src/canvas/**/*";` 1줄**(경로는 이 CSS 파일 기준 상대경로) + 근거 주석. 범위=그 **비-UI 디렉터리 하나뿐** — 앱 JSX/tsx·browse 컴포넌트·`@denn/ui` source는 계속 스캔된다. safelist/blocklist·`source(none)`·executor 문자열 개명/난독화 **없음**.
  - **결과:** mockup CSS **11.99→11.32 KB / gzip 3.35→3.16 KB**, 스펙 020 baseline과 **byte-identical**(md5 `a9b44036cb2e5910b23c147aa578696c`, `diff` 무차이). admin CSS **8.54 KB / gzip 2.64 KB 무변경**(동일 hash). mockup/admin JS gzip 68.40/61.09 KB 무변경.
- **재검증 게이트:** frozen exit 0·lockfile diff 추가 0(이전 importer link만) / format·lint(`--error-on-warnings`)·typecheck 7 프로젝트 / **unit 420**(408→420, canvas 36→48) / build 독립(위 수치) / **e2e 49 PASS·exit 0**(기존 회귀만, 새 Canvas E2E 0; 320/1280 포함 viewport matrix·overflow 0·44px·axe 0·console 0 회귀 없음) / check PASS / `git diff --check` clean / 포트 4183·4184 LISTENING 0·저장소 소속 Vite/esbuild 잔류 0.
- **변경 파일:** `apps/mockup/src/canvas/executePreviewPlan.ts`·`executePreviewPlan.test.ts` + **`packages/ui/src/theme.css`(Tailwind source 범위 1줄, 예외로 보고)**. `apps/mockup/src/canvas/types.ts`·기존 mockup React UI·catalog·browse·`apps/admin/**`·`packages/{render,shared,firebase,spaces}`·운영 HTML·Firebase 설정/Rules·`poc/**`·결과 PNG 무변경(e2e 재생성 스펙018 PNG 2개는 커밋 없이 복원). 네트워크·live test·deploy 0, 신규 의존성 0.
- **미검증 유지:** recording fake·Proxy 기반 검증은 **실제 브라우저 Canvas 픽셀 검증이 아니다.** 실제 clip/drawImage·CORS-clean·이미지 load·DPR·실기기 = NOT TESTED. `<canvas>`/React 연결·staging commit·pointer·회전·text/clock·print·주문 미착수, executor는 앱 mount 미연결(번들 미포함). 코드/test/config 커밋(`71c0bd8`)과 문서 커밋 분리.

### DONE 보완 2 (Claude) — 2026-07-28 (E2E 종료 결정성)

- **조사 먼저(코드 무수정):** standalone `corepack pnpm run test:e2e`를 계측 스크립트로 3회 반복. 3회 모두 **스스로 exit 0**(18/19/19초), 49 PASS, 실행 후 4183/4184 **free**, 저장소 소속 잔류 프로세스 0 → 내 환경에서 **자연 재현은 안 됨**(Codex 보고를 오탐으로 단정하지 않음 — 타이밍 의존).
- **실행 중 소유 관계(실측):** `port 4183` 소유자 = `node …\vite\bin\vite.js preview apps/mockup --port 4183`(pid X) → **부모 = `cmd.exe /d /s /c "vite preview apps/mockup …"`(Playwright가 소유한 PID)** → 그 부모 = `node …@playwright\test\cli.js test`. **즉 Playwright는 shell wrapper만 소유하고, 포트를 쥔 실제 서버는 그 자식이다.**
- **근본 원인(playwright-core 소스로 확인):** `launchProcess`는 webServer command를 항상 `shell: true`로 spawn하고 `detached: process.platform !== "win32"` — win32에서는 프로세스 그룹이 없다. webServer의 `attemptToGracefullyClose`는 **win32에서 즉시 `"Graceful shutdown is not supported on Windows"`를 throw** → 우리 설정의 `gracefulShutdown`은 **win32에서 no-op**이고 항상 `killProcess()`로 폴백한다. `killProcess()`는 `taskkill /pid <wrapper> /T /F`이며 **`processClosed`면 아예 skip**된다. teardown은 그 뒤 `await waitForCleanup`(wrapper의 `close` 이벤트)인데, `close`는 **상속된 stdout/stderr 파이프가 닫혀야** 발생한다 → 살아남은 자손이 파이프를 쥐면 **teardown이 무한 대기**하고 포트도 계속 LISTENING. **이전 config 주석의 "SIGTERM→5s force-kill" 기록은 Windows 실제 동작과 불일치**(정정 완료).
- **결정적 재현(원인 증명):** 실행 중 **wrapper cmd.exe만** `/F`로 강제 종료(자손은 남김) → 49 테스트 전부 PASS 후 명령이 **124초간 미종료**, 4183/4184 **둘 다 LISTENING**(고아 vite node 소유). 기록한 **정확한 PID 2개**만 종료하자 즉시 `49 passed (2.1m)` + **exit 0**. Codex 보고와 동일 형태.
- **수정(최소·저장소 전용):** `scripts/e2e-preview.mjs` — **Vite의 기존 Node API `preview()`**(루트 devDependency `vite`, **신규 의존성 0**)로 preview 서버를 **in-process** 기동. webServer command를 `node scripts/e2e-preview.mjs <mockup|admin> <port>`로 교체 → **wrapper가 spawn한 node 자신이 포트 소유자**(고아가 될 자손이 없음). 런처는 자기 수명만 관리한다: **SIGTERM/SIGINT/SIGHUP/SIGBREAK** / **stdin EOF**(runner가 준 파이프가 죽으면) / **부모 PID 소멸(고아 감지, `process.kill(pid,0)` 존재 확인만)** → **자기가 띄운 서버만 close 후 exit 0**. 앱 화이트리스트(mockup/admin)와 포트 범위 검증 포함.
- **금지사항 준수:** 포트 번호 기반 kill 0 · `globalTeardown` 재도입 0 · broad `taskkill`/`SIGKILL`/`Stop-Process` 안전망 0 · 타 저장소·타 사용자 프로세스 종료 0 · `reuseExistingServer:false` 유지 · 신규 의존성 0. `gracefulShutdown`은 **POSIX 경로에서 의미가 있으므로 유지**하고(런처가 SIGTERM 처리) win32 no-op임을 주석에 명시.
- **수정 후 검증:** (a) **고아 가드 직접 증명** — Playwright와 동일한 형태(`cmd /d /s /c node scripts/e2e-preview.mjs mockup 4183`)로 띄운 뒤 wrapper만 `/F` 종료 → 포트 소유자가 wrapper의 **직속 자식**임을 확인하고 **856ms 후 자기 종료·포트 해제**(수정 전에는 무한 생존). (b) **standalone 3회 연속** — 전부 **스스로 exit 0**(20/18/19초), **49 passed**, 실행 후 4183/4184 **free**, 저장소 소속 vite/esbuild/preview 잔류 **0**. 고정 sleep으로 성공을 꾸미지 않았고, 수동 종료가 필요한 실행은 없었다.
- **테스트로 고정(+11, unit 420 → 431):** `scripts/e2e-preview.test.mjs` — 인자 화이트리스트/포트 검증, shutdown **멱등**(close 1회·exit 1회), close 실패에도 exit 0·reject 0, 4개 시그널 배선, stdin `end`/`close`, **부모 소멸 시에만** 종료(살아 있으면 no-op), dispose가 타이머 해제, 모듈 import만으로 **서버 기동 0**. `vitest.config.ts` include에 `scripts/**/*.test.mjs` 추가(최소 config 변경).
- **회귀 없음:** executor production API·normalized snapshot·Result **무변경**, Tailwind `@source` 예외 **유지**(mockup CSS 11.32 KB / gzip 3.16 KB·admin 8.54 / 2.64 동일), UI/CSS 변경 0. 게이트: frozen exit 0·lockfile diff 0 / format·lint·typecheck / **unit 431** / build / **e2e 49 PASS** / check PASS / `git diff --check` clean. 변경 파일=`scripts/e2e-preview.mjs`(신규)·`scripts/e2e-preview.test.mjs`(신규)·`playwright.config.ts`·`vitest.config.ts`. 운영본·Firebase·Rules·POC·admin·디자인 PNG 무변경, e2e 재생성 스펙018 PNG는 커밋 없이 복원, 네트워크·live·deploy 0.
- **불확실성(정직 기록):** Codex 실행에서 **어떤 이유로 wrapper 링크가 끊겼는지**(스케줄링·CPU 부하·다른 프로세스의 트리 kill 등)는 로그가 없어 확정 불가. 확인된 것은 (1) 그 상태가 실제로 발생하면 **무한 대기 + 포트 잔존**이 필연이고, (2) 수정 후에는 그 상태를 인위적으로 만들어도 **856ms 안에 자기 종료·포트 해제**된다는 것이다. 리눅스/CI(POSIX)에서는 detached 프로세스 그룹 + 실제 SIGTERM 경로라 원래 이 실패 형태가 아니며, 런처는 그 경로에서도 정상 동작한다.

### DONE 보완 3 (Claude) — 2026-07-28 (E2E 종료 결정성 — 2차)

- **1) 수정 전(`c204b60`) 재현 시도:** Codex와 동일한 **일반 비TTY 실행**(`cmd /c … > log`, `DEBUG=pw:webserver`)으로 재실행 → **exit 0 / 19초 / 49 PASS**, `pw:webserver` 로그는 `Terminating the WebServer` → `Terminated the WebServer` 0.58초. **내 환경에서는 이번에도 자연 재현되지 않음**(Codex 관측을 오탐으로 보지 않음).
- **2) Codex 증상의 구조적 설명(근거: vite 8.1.5 소스):** Vite `preview()`는 **자체 host 리스너**를 단다 — `process.once("SIGTERM", …)` + (`CI !== "true"`일 때) **`process.stdin.on("end", …)`**, 콜백은 `await server.close()` 후 `process.exit()`. 또한 close 경로(`createServerCloseFn`)는 **자기가 추적한 소켓만** destroy한 뒤 `httpServer.close()`를 기다린다. 따라서 자식 런처 설계에서 **stdin EOF로 close가 시작되면 포트는 즉시 해제되지만**, `close()`가 (추적 밖 keep-alive/신규 소켓 때문에) 미해결이면 `process.exit()`에 도달하지 못해 **프로세스는 살아남고 상속 파이프를 계속 쥔다** → **포트 LISTENING 0 + Node 프로세스 잔존 + 최종 summary/exit 없음**. 이는 Codex가 보고한 형태와 정확히 일치한다. **직접 재현은 못 했으므로 "증거와 일관된 최유력 설명"으로 기록**한다.
- **3) Codex의 "부모 대기 순환" 가설 검토(실측):** 런처의 부모는 `cmd.exe` wrapper이고 `cmd /c`는 자식 종료를 기다린다(프로세스 트리로 확인). 두 조건은 서로 독립이라 **교착(순환 대기)은 아니지만**, wrapper가 살아 있는 정상 경로에서 부모-소멸 가드는 **아무 역할도 하지 못한다** — 즉 런처 내부 close가 멈춘 상황을 해결할 수 없다. 가설을 단정하지 않고 이렇게 정정한다.
- **4) 수정(Codex 권장 구조 채택):** `webServer`를 **완전히 제거**하고 `tests/global-setup.ts`(globalSetup)에서 Vite `preview()`로 **서버 2개를 Playwright 러너 프로세스 안에 직접 생성**, globalSetup이 반환하는 **teardown 콜백에서 그 두 handle만 close**. **자식 프로세스·shell wrapper·상속 파이프가 아예 없다** → orphan/pipe 계열 실패 전체가 소멸. 실행 중 실측: **4183·4184 둘 다 러너 PID가 소유**(vite 자식 프로세스 0).
- **5) 종료 결정성 보강:** close 전에 `httpServer.closeAllConnections()` + `closeIdleConnections()`로 **keep-alive 소켓을 먼저 끊고**(Vite 자체 destroy는 추적분만 처리), `close()`를 **타임아웃으로 한정**한다. **타임아웃·실패는 던져서 보고**하며 exit 0으로 숨기지 않는다(handle별로 전부 시도 후 집계). `preview()`가 host에 추가한 **SIGTERM/stdin 리스너는 차집합으로 정확히 그것만 제거**(러너가 stdin EOF·SIGTERM으로 중간에 죽는 것을 방지; 기존 리스너는 보존).
- **6) "기존 서버 거부" 계약(정정):** `strictPort: true`만으로는 부족함을 **실측**했다 — 와일드카드(0.0.0.0)에 바인드된 낡은 서버는 Vite의 `localhost`(::1) 바인드와 **충돌하지 않아 그대로 통과**했다(그 실행은 exit 0). 그래서 시작 전에 **`127.0.0.1`·`::1` 두 루프백에 connect-only 프로브**를 돌려 응답이 있으면 **거부(throw)** 한다. 재검증: 와일드카드 낡은 서버가 있는 상태에서 **1초 만에 exit 1**, `port 4183 is already in use on 127.0.0.1 — refusing to reuse an existing server`, 서버 기동 0.
- **7) 금지사항 준수:** 포트/PID 검색 기반 kill 0 · `taskkill`/`SIGKILL`/`Stop-Process` 0 · 다른 프로세스 종료 0 · 포트로 찾아 죽이는 globalTeardown 0 · 부분 기동 시 **정확한 handle만** 정리 · close 실패 은폐 0 · 임의 sleep으로 통과시키지 않음(전부 lifecycle/handle 기반).
- **8) 수정 후 검증(같은 비TTY 실행 방식):**
  - **연속 3회**: exit **0 / 0 / 0**, wall 21·21·22초, **49/49 PASS + 최종 reporter 요약 출력**, 실행 후 4183/4184 **LISTENING 0**, 저장소 소속 Node/Vite/esbuild 잔류 **0**.
  - **실패 경로 1회**: 의도적으로 실패하는 임시 spec(두 서버에 실제 200 응답 확인 후 실패) → **exit 1, 2초 내 종료**, 포트 free, 잔류 0. 임시 spec은 삭제(커밋 없음).
  - **SIGINT 경로**: Windows 콘솔 제어 이벤트 제약으로 **실행하지 못함(미검증)**. 다만 서버가 러너 **프로세스 내부**에 있으므로 러너가 죽으면 서버도 함께 사라진다 — orphan이 구조적으로 불가능하다.
- **9) 테스트로 고정(unit 431 → 434, 런처 11 → 14):** app 화이트리스트·spec별 `strictPort` 전달·잘못된 app/port 거부(서버 기동 0)·**부분 기동 실패 시 시작된 handle만 close 후 원본 오류 재throw**·`preview()`가 추가한 host 리스너만 제거(기존 리스너 보존)·close 전 `closeAllConnections`/`closeIdleConnections`·**멈춘 close는 타임아웃으로 보고**(다른 handle은 계속 close)·거부/집계 메시지·빈 목록 no-op·**포트 점유 프로브 3상태(open/refused/timeout)** 및 두 루프백 거부.
- **10) 회귀·게이트:** executor production API·normalized snapshot·Result **무변경**, Tailwind `@source` 유지, UI/CSS 무변경. frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 434** / build(**mockup CSS 11.32 KB·gzip 3.16 / JS 68.40 · admin 8.54/2.64 · 61.09 — 전부 동일**) / **e2e 49 PASS** / check PASS / `git diff --check` clean. 변경 파일 = `scripts/e2e-preview.mjs`(재작성) · `scripts/e2e-preview.test.mjs`(재작성) · `playwright.config.ts`(webServer 제거→globalSetup) · `tests/global-setup.ts`(신규). 운영본·Firebase·Rules·POC·admin·디자인 PNG 무변경, e2e 재생성 스펙018 PNG 복원(커밋 없음), 네트워크·live·deploy 0.
- **11) 남은 불확실성:** Codex 실행의 정확한 트리거는 로그가 없어 확정 불가. 확인된 것은 (i) 자식 프로세스 기반 webServer는 상속 파이프 때문에 **어떤 잔존 자손이든 명령 종료를 막을 수 있다**는 구조적 사실, (ii) Vite preview의 stdin/SIGTERM 자동 종료 경로가 `close()` 미해결 시 **정확히 Codex가 본 상태**(포트 free + 프로세스 잔존 + 미종료)를 만든다는 점, (iii) 새 구조는 자식 프로세스 자체가 없고 close가 타임아웃으로 한정되며 실패를 보고한다는 점이다.

### Codex 최종 판정 — 승인 가능 (2026-07-28)

- **판정:** 스펙 021 = **승인 가능**. **승인 기준 HEAD = `3b540cf`**.
- **Codex 독립 재검증:** `check` PASS / **unit 434/434** / build PASS(**mockup JS gzip 68.40KB**, **admin JS gzip 61.09KB**) / **E2E 49/49 PASS + 최종 reporter 요약 출력 + 명령 자체 exit 0** / 포트 **4183·4184 free** / HEAD=origin·ahead/behind **0/0** / E2E 재생성 PNG 복원 후 working tree clean.
- **확정된 executor 계약:** `apps/mockup`의 React 비의존 Canvas plan executor `executePreviewRenderPlan({context, plan, imageBindings})` — 스펙 020 명령 3종을 원래 순서로 실행(outer save → clear 1회 → 명령 → outer restore; image는 save→beginPath→rect→clip→drawImage→restore). `imageRef`는 **메모리 binding lookup key 전용**(URL 해석·fetch·`Image` 0). preflight가 draw 전 전량 검증 후 **plain normalized snapshot**(각 값 1회 읽기, layerId·imageRef 미복사, drawable은 identity)을 만들고 실행은 snapshot만 읽는다 → hostile getter/Proxy trap/revoked Proxy/getter drift에서도 **밖으로 throw 0**, preflight 실패 시 Canvas 호출·style 대입 0. Result는 식별정보 없는 `{ok, code, commandIndex?}`, restore 실패는 성공으로 보고하지 않음, console 출력 0.
- **확정된 E2E 종료 구조:** Playwright `webServer` **자식 프로세스 제거** / `globalSetup`에서 Vite preview 서버 2개를 **in-process exact handle**로 소유 / 반환 teardown callback에서 **해당 handle만 close** / 기존 서버는 **`127.0.0.1`·`::1` connect-only probe로 사전 거부** / 부분 시작 실패 시 **이미 생성된 정확한 handle만 정리** / `closeAllConnections`+`closeIdleConnections` 후 close / **종료 timeout·실패를 exit 0으로 숨기지 않고 throw** / **포트·PID 기반 kill, taskkill, SIGKILL, Stop-Process, globalTeardown sweep 없음**.
- **확정된 Tailwind 경계:** Tailwind root `packages/ui/src/theme.css`의 `@source not "…/apps/mockup/src/canvas/**/*"`로 비-UI executor를 class 후보 스캔에서 제외 — mockup CSS는 스펙 020 baseline과 동일(11.32 KB / gzip 3.16 KB), admin 8.54 / 2.64 KB 무변경.
- **NOT VERIFIED:** **SIGINT 경로 = Windows 콘솔 제어 이벤트 제약으로 미검증**(서버가 러너 프로세스 내부에 있어 러너가 죽으면 함께 사라지므로 orphan은 구조적으로 불가능하다는 논거만 있음).
- **NOT TESTED(후속):** **실제 브라우저 Canvas 픽셀·이미지 load·CORS-clean·DPR·실기기 검증**. recording fake·Proxy 기반 unit 통과는 실제 Canvas 검증이 아니다. `<canvas>` 생성·React 화면 연결·staging/double-buffer commit·pointer/zoom·액자 회전·text/clock/template art·print/export·주문 정책·Firebase·배포 = **미착수**. executor는 앱 mount에서 호출되지 않으며 번들에 포함되지 않는다.
- **다음:** 후속 순서 = 실제 Canvas element/context + React lifecycle → image binding load/CORS-clean → pointer → text/clock → print. **Codex 다음 스펙 지시 대기.**
