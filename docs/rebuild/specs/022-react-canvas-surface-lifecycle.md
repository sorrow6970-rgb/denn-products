# 022 — React Canvas surface·DPR·생명주기

## 목표 (WHY)

스펙 019의 backing-store 계산과 스펙 021의 Canvas executor를 실제 브라우저
`<canvas>`·`CanvasRenderingContext2D`에 연결하는 재사용 가능한 React surface를 만든다.

이번 단계는 “무엇을 그릴지”를 정하는 상품 미리보기 단계가 아니다. 호출자가 이미 만든
`PreviewRenderPlan`과 메모리 drawable binding을 전달하면, surface가 CSS 크기·DPR
backing·React mount/update/cleanup을 관리하고 executor 결과를 접근 가능한 상태로
알리는 기반만 완성한다.

근거:

- `docs/rebuild/specs/019-canvas-geometry-contract.md`
- `docs/rebuild/specs/020-deterministic-render-plan.md`
- `docs/rebuild/specs/021-canvas-plan-executor.md`
- `docs/codex-claude-handoff/reviews/2026-07-28-react-canvas-lifecycle-investigation.md`
- `poc/platform-compatibility/src/App.tsx`의 `useCanvasDpr`

## 범위 (SCOPE)

### 포함

- `apps/mockup`의 재사용 가능한 React Canvas surface
- 실제 `<canvas>` 생성과 2D context 획득
- `ResizeObserver` 기반 CSS 크기 관측
- 같은 frame 안 resize 통합을 위한 단일 `requestAnimationFrame`
- 스펙 019 `computeBackingStoreSize` 재사용
- preview 전용 DPR 상한 `2`
- backing width/height 조건부 갱신
- logical 좌표계용 `context.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0)`
- 스펙 021 `executePreviewRenderPlan` 호출
- StrictMode mount→cleanup→mount와 stale callback 차단
- 성공·대기·실패 상태의 안전하고 접근 가능한 표현
- 실제 Chromium Canvas를 사용하는 자동 E2E
- 기존 전체 자동 게이트와 E2E 종료 결정성 회귀 확인

### 제외(하지 않을 것)

- 고객 탐색 완료 화면에 상품 미리보기로 연결
- 선택 상태→`CasePlanInput`/`FramePlanInput` 변환
- 스펙 020 builder 계약 변경
- 케이스 `photoZones`, 라운드 clip, 그림자, camera, magsafe
- 케이스 색상 선택·`caseColor` 기본값 확정
- 액자 색상 선택·`frameColors[].fill` 연결
- 사용자 업로드·운영 이미지·Firebase 이미지 다운로드
- URL/base64/blob/storagePath 해석
- `crossOrigin`, CORS header, taint 검사
- pointer/touch/mouse/wheel/pinch와 pan/zoom
- 회전 transform
- text/clock/watermark
- print/PNG/export, 저장, 주문, 카카오 전송
- Firebase SDK/Auth/write/Rules/CORS/Hosting 변경
- 관리자 앱·운영 HTML·POC·디자인 PNG 변경
- 실제 네트워크·live test·배포
- 실기기 4환경 검증
- 제품 전체의 DPR 정책 또는 print DPR/DPI 확정

## 대상 (WHERE)

주 구현 대상:

- `apps/mockup/src/canvas/PreviewCanvasSurface.tsx`
- `apps/mockup/src/canvas/usePreviewCanvasSurface.ts`
- 필요 시 같은 디렉터리의 최소 타입·순수 helper
- 위 경계의 unit test
- `tests/e2e/`의 실제 Canvas surface 전용 검증

재사용:

- `@denn/render`의 `computeBackingStoreSize`
- `@denn/render`의 `PreviewRenderPlan` 타입
- `apps/mockup/src/canvas/executePreviewPlan.ts`
- `apps/mockup/src/canvas/types.ts`
- `@denn/ui`의 기존 상태·카드·숨김 텍스트 primitive

변경 금지:

- `packages/render/src/geometry/**`
- `packages/render/src/plan/**`
- `packages/shared/**`
- `packages/firebase/**`
- `packages/spaces/**`
- `apps/admin/**`
- 운영 HTML, Firebase 설정·Rules, `poc/**`, 기존 디자인 PNG

`packages/ui`는 신규 토큰이나 primitive가 실제로 필요하지 않다. 기존 토큰으로 해결하고
이번 스펙에서 변경하지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 조사 QUESTIONS 결정

#### Q1 — plan 입력

이번 스펙에서는 (a)·(b)·(c) 중 어느 것도 제품 동작으로 채택하지 않는다.

- body-only 상품 plan을 만들지 않는다.
- 합성 drawable을 고객 UI에 표시하지 않는다.
- 스펙 020의 필수 image 계약을 변경하지 않는다.

surface API는 호출자가 완성한 `PreviewRenderPlan`과 `PreviewImageBindings`를 받는다.
실제 상품 plan projection은 별도 후속 스펙이다. 합성 plan/drawable은 자동검증 fixture
안에서만 허용한다.

#### Q2 — DPR

preview surface의 명시적 정책 상수는 `2`로 한다.

- 근거: 실기기 검증을 통과한 `poc/platform-compatibility`의 preview Canvas 상한.
- 적용 범위: 이번 고객 앱 preview surface만.
- room Canvas의 레거시 상한 4, print DPI, 관리자 Canvas에는 전파하지 않는다.
- hook 내부의 숨은 숫자로 두지 말고 이름 있는 상수로 export한다.
- 테스트가 `devicePixelRatio > 2`에서 effective DPR 2를 고정한다.

#### Q3 — 케이스 색

이번 스펙에서는 케이스 plan을 만들지 않으므로 `#1A1A1A`를 제품 기본값으로 채택하지
않는다. 해당 레거시 값은 후속 상품 plan projection 스펙의 근거로만 보존한다.

#### Q4 — 액자 색

액자 탐색 selection에 색상 단계가 없으므로 이번 스펙에서 다루지 않는다. selector·상태
계약 확장은 후속 스펙으로 남긴다.

### 2. 공개 surface 계약

권장 형태:

```ts
type PreviewCanvasSurfaceProps = {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
  readonly accessibleName: string;
  readonly className?: string;
};
```

세부 계약:

- `accessibleName`은 빈 문자열·공백만 허용하지 않는다.
- DOM에는 URL, token, base64, storagePath, `imageRef`, `layerId`, raw catalog를 쓰지 않는다.
- surface 상태에는 drawable이나 source 문자열을 복제하지 않는다.
- Canvas drawable은 caller가 소유하며 surface는 dispose하지 않는다.
- component는 `plan`이나 `imageBindings`를 변경하지 않는다.
- executor Result의 안전한 `code`만 내부 상태 전이에 사용할 수 있다.
- 사용자 메시지에는 code, command index, 원문 예외를 노출하지 않는다.

### 3. CSS·logical·backing 계약

다음 관계를 지킨다.

1. canvas의 관측된 content-box CSS 크기를 `cssSize`로 사용한다.
2. 유효한 크기는 width·height가 finite이고 각각 `> 0`인 경우뿐이다.
3. 이번 surface의 필수 불변식은 관측된 `cssSize == plan.logicalCanvas`이다. 허용
   오차는 브라우저의 subpixel 측정을 고려해 각 축 0.5 CSS px 이하로 제한한다.
4. 실제 실행 logical size는 `plan.logicalCanvas`이다.
5. 두 크기가 허용 오차 밖이면 executor를 실행하지 않고 안전 실패 상태로 둔다.
   surface가 plan 좌표를 임의 배율로 재해석하지 않는다.
6. backing 계산에는 관측된 `cssSize`를 전달한다.

```text
backingSize =
  computeBackingStoreSize({
    cssSize,
    deviceDpr: current devicePixelRatio,
    dprCap: PREVIEW_DPR_CAP, // 2
  })
```

7. `canvas.width/height = backingSize`로 조건부 대입한다.
8. backing 대입은 context state를 초기화하므로 대입 뒤에
   `setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0)`을 실행한다.
9. backing이 동일해도 매 render 실행 전에 transform을 필요한 값으로 명시한다.
10. 그 뒤에만 `executePreviewRenderPlan`을 호출한다.

surface는 canvas의 명시적 CSS width/height를 plan logical size에 맞춘다. 이번
surface는 제품의 반응형 plan 생성기가 아니므로 `max-width: 100%` 등으로 실제 CSS
크기만 축소하지 않는다. viewport에 맞는 새 plan·logical size를 만드는 책임은 후속
plan projection 계층에 있다. E2E fixture는 viewport 안에 들어가는 logical size만 쓴다.

### 4. ResizeObserver·rAF

- `ResizeObserver`는 canvas 한 대상만 관측한다.
- observer callback에서 즉시 backing·draw를 반복하지 않고, pending rAF가 없을 때만
  하나를 예약한다.
- 같은 frame의 여러 resize entry는 마지막 유효 크기만 반영한다.
- 0×0, 음수, NaN, Infinity는 draw하지 않고 `waiting-for-size` 상태로 둔다.
- fractional CSS size는 layout을 다시 쓰지 않고 그대로 backing 계산에 전달한다.
- CSS 크기와 plan logical size의 허용 오차를 넘으면 draw하지 않는다.
- backing width/height가 이전 값과 같으면 속성을 다시 대입하지 않는다.
- orientation 전용 listener는 추가하지 않는다. orientation 변화는 resize로만 반영한다.
- arbitrary timer와 고정 sleep을 쓰지 않는다.

### 5. React 생명주기

- mount마다 generation 또는 동등한 소유권 토큰을 만든다.
- cleanup은 observer disconnect, pending rAF cancel, ref/context 참조 해제까지 수행한다.
- cleanup된 세대의 observer/rAF callback은 아무 상태도 갱신하거나 draw하지 않는다.
- StrictMode의 mount→cleanup→mount에서 active observer와 pending rAF는 각각 최대 1개다.
- plan·binding identity가 바뀌면 현재 세대에서 새 snapshot을 실행한다.
- 오래된 plan의 예약된 draw가 새 plan 결과를 덮지 않는다.
- unmount 뒤 React state update·Canvas operation·console error가 없어야 한다.
- `devicePixelRatio`는 실제 draw 예약이 실행될 때 읽는다. import 시 `window` 접근 금지.

React 19 callback ref의 cleanup 반환 방식으로 element·observer·rAF 소유권을 묶는다.
별도 effect에서 같은 observer를 다시 만들지 않는다. 최신 plan·binding은 ref로
전달할 수 있으나, ref callback identity를 매 render마다 바꿔 불필요한 detach/attach를
일으키지 않는다.

### 6. context·executor 오류

- `canvas.getContext("2d") === null`은 안전 실패 상태다.
- backing 계산 실패, `setTransform` throw, executor failure를 모두 throw 없이 안전
  실패 상태로 변환한다.
- 실패 뒤 자동 retry timer를 만들지 않는다.
- 다음 유효 resize 또는 새로운 plan/binding 입력은 새 실행 기회가 될 수 있다.
- 실패 메시지는 “미리보기를 표시할 수 없습니다”처럼 고정된 일반 문구만 사용한다.
- 성공 시 상태 텍스트는 시각적으로 과도한 제품 UI를 만들지 않되 screen reader가
  준비 여부를 알 수 있어야 한다.
- Canvas 자체에는 `role="img"`와 안전한 accessible name을 제공하거나, 동등한
  접근성 구조를 사용한다. 중복 이름·중복 live announcement를 만들지 않는다.

### 7. 실제 브라우저 E2E harness

제품 탐색 UI에 test-only query, debug route, 전역 객체를 추가하지 않는다.

허용 방식:

- 테스트 전용 Vite entry/fixture를 기존 mockup Vite 인스턴스가 명시적으로 빌드·serve
  하도록 구성하거나,
- production 앱 UI와 분리된 동등한 최소 harness.

조건:

- 일반 고객 `/` 화면에는 fixture 링크·조건 분기·합성 Canvas가 나타나지 않는다.
- fixture는 합성 `PreviewRenderPlan`과 in-memory same-origin drawable만 사용한다.
- fixture에 운영 URL·token·base64 fixture를 넣지 않는다.
- 별도 서버나 별도 포트를 추가하지 않는다.
- 스펙 021의 `tests/global-setup.ts` exact-handle 소유권과 종료 구조를 변경하지 않는다.
- E2E 종료 후 4183/4184 free, 저장소 실행 소속 잔류 0을 유지한다.

fixture를 production build 결과에 포함해야 한다면 경로와 이유를 보고하고, 고객
entry에서 도달 불가능하며 제품 기능으로 오인되지 않는지 검증한다. 더 안전한 기존
도구 방식이 확인되면 그 방식을 우선한다.

### 8. 자동검증

#### Unit

DOM 라이브러리를 새로 설치하지 않는다. 순수 scheduler/lifecycle helper와 fake port로
다음을 고정한다.

- DPR 1, 2, 3.5 → effective 1, 2, 2
- backing 변경 시에만 width/height 대입
- backing 대입 뒤 setTransform, 그 뒤 executor
- 동일 backing 재실행에서도 transform/executor 순서 유지
- resize burst→rAF 1개
- 마지막 유효 size 반영
- 0-size→draw 0
- cleanup→observer disconnect+rAF cancel
- stale observer/rAF→draw·state update 0
- StrictMode mount→cleanup→mount에서 active owner 1개
- plan A 예약 뒤 plan B→B만 최종 실행
- null context·backing 실패·setTransform throw·executor failure 안전 처리
- URL/token/imageRef/layerId가 상태·오류에 없음

#### E2E — 실제 Chromium Canvas

최소 다음을 확인한다.

- 실제 `<canvas>`와 실제 2D context
- fill-rect·stroke-rect 실제 실행
- 합성 drawable을 사용하는 clip+draw-image-cover 실제 실행
- 테스트 코드 안에서만 `getImageData`로 대표 픽셀을 읽어 fill/stroke/clip 결과 확인
- production source에는 `getImageData`, `toBlob`, `toDataURL` 추가 0
- deviceScaleFactor 1과 3에서 backing 및 effective DPR(상한 2) 확인
- 새 logical size의 plan으로 rerender한 뒤 CSS·backing·픽셀 결과 갱신
- 0-size→복구
- unmount/remount 또는 StrictMode 경로에서 console error 0
- 320px·desktop에서 overflow 0
- Canvas accessible name 존재
- axe serious/critical 0
- 고정 sleep 0

브라우저 픽셀 검증은 Chromium 자동검증이다. Safari/Android/Samsung/카카오와 실제
운영 이미지·CORS-clean을 PASS로 기록하지 않는다.

### 9. 보존·금지 검사

- 신규 외부 의존성 0
- Firebase SDK/Auth/write/Rules/CORS 변경 0
- 실제 network/live test/deploy 0
- 운영 HTML·관리자 앱·POC·디자인 PNG 변경 0
- production source의 `fetch`, `getDownloadURL`, URL 해석, `crossOrigin`,
  `getImageData`, `toBlob`, `toDataURL` 추가 0
- product `/`에 test-only query/debug UI 추가 0
- 스펙 021 E2E exact-handle teardown 구조 변경 0

## 검증 절차 (VERIFY)

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] install 전후 `pnpm-lock.yaml` diff 0
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test:unit`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] `git diff --check`
- [ ] E2E 명령 최종 reporter 요약·exit 0
- [ ] 종료 후 포트 4183/4184 free·저장소 실행 소속 Vite/esbuild 잔류 0
- [ ] E2E가 기존 추적 PNG를 재생성하면 시각 변경이 없는 파일은 복원하고 미커밋
- [ ] 코드/test와 문서/handoff 커밋 분리
- [ ] push 후 HEAD=origin, ahead/behind 0/0, working tree clean

검증 보고에는 다음을 명시한다.

- 실제 component/hook 공개 API
- logical/CSS/backing 크기의 실제 적용 순서
- DPR 상수 위치와 적용 범위
- observer/rAF/ref/effect 소유권·cleanup 순서
- 실제 Canvas E2E 시나리오와 `getImageData` 사용 위치
- fixture가 고객 `/`에 노출되지 않는 근거
- 최종 unit/e2e 수와 번들·CSS gzip 수치
- 실기기·운영 이미지·CORS-clean NOT TESTED

## 완료 정의 (DONE)

- 실제 브라우저 Canvas surface가 plan+binding을 받아 스펙 021 executor를 실행한다.
- DPR 상한 2가 preview surface에만 명시적으로 적용된다.
- backing 초기화→transform→executor 순서가 고정된다.
- resize burst·0-size·stale callback·StrictMode cleanup이 결정적으로 검증된다.
- 실제 Chromium 픽셀로 fill/stroke/clip-image가 검증된다.
- 제품 탐색 UI에 가짜 상품 Canvas나 test-only route가 노출되지 않는다.
- 기존 434 unit·49 E2E 기준에서 회귀가 없고 새 테스트 수를 정확히 보고한다.
- E2E가 reporter summary와 exit 0으로 자체 종료하고 포트·프로세스가 남지 않는다.
- 범위 밖 기능과 미검증 사실을 PASS로 기록하지 않는다.

## 위험 (RISK)

- DPR 상한 2는 고객 preview surface에만 한정된 결정이며 인쇄·room·관리자 정책이 아니다.
- Chromium 픽셀 검증은 Safari 계열의 Canvas·DPR 동작을 증명하지 않는다.
- synthetic drawable은 운영 Firebase 이미지의 CORS-clean을 증명하지 않는다.
- plan projection이 아직 없으므로 surface 완료는 상품 미리보기 완료가 아니다.
- `canvas.width/height` 대입은 context 상태를 초기화하므로 실행 순서가 바뀌면 화면이
  비거나 transform이 중복될 수 있다.
- ResizeObserver와 rAF cleanup이 불완전하면 StrictMode에서 stale draw가 발생할 수 있다.

### QUESTIONS

없음. 조사에서 나온 Q1~Q4는 이번 스펙의 범위를 surface-only로 제한하여 위와 같이
해결했다. 상품 plan projection·케이스/액자 색상 선택은 후속 스펙에서 별도로 결정한다.

---

### DONE (Claude) — 2026-07-28

- **공개 API:** `PreviewCanvasSurface({plan, imageBindings, accessibleName, className})`(`apps/mockup/src/canvas/PreviewCanvasSurface.tsx`) · `usePreviewCanvasSurface({plan, imageBindings}) → {ref, state}`(`usePreviewCanvasSurface.ts`) · framework-free 엔진 `createPreviewSurface(ports) → {requestDraw, dispose}`(`surface.ts`) · 상수 `PREVIEW_DPR_CAP = 2`·`LOGICAL_SIZE_TOLERANCE_PX = 0.5`. 상태는 `"waiting-for-size" | "ready" | "failed"` 3종뿐(code·commandIndex 미저장).
- **surface-only 준수(§1):** 상품 plan projection·body-only 상품 plan·합성 drawable의 고객 UI 노출 **전부 없음**. 스펙 020 builder 계약 **무변경**. 케이스/액자 색, `photoZones`, 색상 선택 단계는 손대지 않음. 고객 탐색 화면(`App.tsx`/`BrowseFlow.tsx`)은 **surface를 import하지도 않음**(E2E로도 확인).
- **크기·DPR 적용 순서(§3):** 관측 content-box CSS 크기(ResizeObserver `contentBoxSize`, 첫 draw는 bounding rect) → **`|css − plan.logicalCanvas| ≤ 0.5px`(축별) 불변식 위반 시 executor 미실행·안전 실패** → `computeBackingStoreSize({cssSize, deviceDpr, dprCap: 2})` → **backing은 값이 바뀔 때만 대입**(대입이 context state를 초기화하므로) → **매 draw `setTransform(dpr,0,0,dpr,0,0)`**(backing 무변경 시에도) → `executePreviewRenderPlan`. canvas의 CSS width/height는 `plan.logicalCanvas`로 지정하므로 불변식이 구조적으로 성립하고, 축소는 하지 않고 wrapper가 스크롤한다.
- **DPR 상수 위치·범위(§1 Q2):** `apps/mockup/src/canvas/surface.ts`의 export 상수 `PREVIEW_DPR_CAP = 2`, **고객 preview surface 전용**. 레거시 room cap 4·print DPI·관리자 Canvas에 전파 0. unit이 device DPR 1/2/3.5 → effective 1/2/2를 고정하고, E2E가 `deviceScaleFactor 3`에서 300×200 논리 plan → backing 600×400을 고정.
- **소유권·cleanup 순서(§5):** **React 19 callback ref + cleanup 반환** 하나가 element·**ResizeObserver 1개**·**pending rAF 1개**를 소유(별도 effect가 observer를 다시 만들지 않음, ref identity 고정). resize burst는 rAF 1개로 통합되고 draw 시점에 재측정하므로 **마지막 유효 크기**만 반영. cleanup = `dispose()` → observer disconnect + rAF cancel + 이후 콜백 전면 무력화(state 갱신·draw 0). plan/binding identity 변경은 **현재 소유자에서 재실행**(재부착 없음)하고, draw는 항상 최신 snapshot을 읽어 **오래된 예약 draw가 새 plan을 덮지 않음**. `devicePixelRatio`는 draw 시점에만 읽음(import 시 window 접근 0).
- **안전 실패(§6):** null context·`getContext` throw·backing 계산 실패·`setTransform` throw·executor 실패 → 전부 **throw 없이 `failed`**, 자동 retry timer 0. 0×0/음수/NaN/Infinity → `waiting-for-size`(draw 0, backing 대입 0)이며 이후 유효 resize로 복구. 메시지는 고정 문구(`미리보기를 표시할 수 없습니다.` 등)만, code·index·원문 예외 노출 0.
- **접근성:** canvas `role="img"` + `aria-label`(공백뿐인 이름은 canvas 자체를 렌더하지 않고 실패 문구), 상태는 `role="status"` **1개**(성공/대기는 `VisuallyHidden`), 스크롤 wrapper는 키보드 도달 가능(axe `scrollable-region-focusable` 대응). 중복 이름·중복 live 영역 0.
- **E2E harness(§7):** `apps/mockup/e2e-canvas-fixture.html` + `apps/mockup/src/e2e/canvas-fixture.tsx`를 **별도 빌드**(`apps/mockup/vite.e2e-fixture.config.ts`, `emptyOutDir:false`로 dist에 append)로 만들고 `test:e2e` 스크립트가 Playwright 앞에서 실행한다. **고객 빌드의 두 번째 input으로 넣는 방식은 Rollup 공유 청크 분리를 유발해 고객 자산 그래프가 바뀌므로 채택하지 않았다** — 별도 빌드로 **고객 번들 byte-identical**(`index-D9dnc5BM.css` md5 `a9b44036cb2e5910b23c147aa578696c`). `pnpm build`·`check`는 fixture를 **생성하지 않음**(운영 산출물에 미포함). 새 서버·포트 0, 스펙 021 `tests/global-setup.ts` exact-handle 소유·종료 구조 **무변경**. fixture는 합성 hex 색상과 **in-memory same-origin drawable**(offscreen canvas)만 사용(운영 URL·token·base64 0).
- **실제 Chromium 검증(§8 E2E, 신규 8):** 실제 `<canvas>`+2D context / `fill-rect`·`stroke-rect`·**clip+`draw-image-cover`** 픽셀(클립 안=drawable 색, drawRect 안이지만 클립 밖=body 색 → clip 실제 적용 증명) / `deviceScaleFactor` 1·3에서 backing·effective DPR(상한 2) / 새 logical size plan으로 rerender 시 CSS·backing·픽셀 갱신 / 0-size → 복구 / unmount·remount(StrictMode 경로) console error 0 / 320px·desktop overflow 0 / accessible name / axe serious·critical 0 / **고정 sleep 0**(전부 `expect.poll`). **`getImageData`는 테스트 측 `page.evaluate` 안에서만** 사용. 추가 테스트 1건이 **고객 `/`에 canvas·fixture 경로가 없음**을 확인.
- **unit(신규 33 → 총 467):** DPR 1/2/3.5 · backing 조건부 대입 · 대입→transform→executor 순서(backing 무변경 시에도 transform·executor 순서 유지) · resize burst→rAF 1 · 마지막 유효 size · 0-size draw 0 · cleanup(disconnect+cancel) · stale observer/rAF 무효화 · StrictMode 소유자 1개 · plan A 예약 후 plan B만 실행 · null context/backing 실패/`setTransform` throw/executor 실패 안전 처리 · 상태에 URL/token/imageRef/layerId 0 · **production source 금지 API 스캔**(`getImageData`/`toBlob`/`toDataURL`/`fetch(`/`crossOrigin`/`getDownloadURL`/`new Image`/`new URL`/`firebase`/`setTimeout`/`setInterval`/`orientationchange`/`: any` 0) · 실제 `HTMLCanvasElement`·`CanvasRenderingContext2D`가 port를 구조적으로 만족(컴파일 타임) · 컴포넌트 정적 계약(react-dom/server, jsdom/RTL 미도입).
- **게이트:** frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 467**(434 → 467) / build(**mockup JS 217.69 kB·gzip 68.40 / CSS 11.32 kB·gzip 3.16 = 스펙 021과 byte-identical**, admin 193.53·61.09 / 8.54·2.64 무변경) / **e2e 57 PASS**(49 → 57) · reporter 요약 출력 · **exit 0 자체 종료(18초)** · 포트 4183·4184 free · 저장소 소속 잔류 0 / check PASS / `git diff --check` clean. E2E가 재생성한 스펙 018 PNG는 시각 변경 없어 **복원·미커밋**.
- **무변경:** `packages/**`(render·shared·firebase·spaces·**ui**), `apps/admin/**`, 기존 mockup React UI(App·BrowseFlow·catalog·TemplateThumbnail), 운영 HTML, Firebase 설정·Rules, `poc/**`, 디자인 PNG. Firebase SDK/Auth/write/CORS·실제 network·live test·deploy 0.
- **NOT TESTED(유지):** 실제 운영 이미지·Firebase Storage·CORS-clean, Safari/Android/Samsung/카카오 인앱 4환경, 실기기 선명도·성능·회전, print/PNG·저장·주문. pointer/touch/wheel/pinch·회전·text/clock/watermark **미착수**. **이 DONE은 상품 미리보기 완료가 아니다** — 선택 상태→plan projection은 후속 스펙이며, surface는 아직 고객 화면에 연결되지 않았다.
- 커밋: 코드/test `d03cf20`, 문서 분리. 핸드오프 `docs/2026-07-28-spec-022-react-canvas-surface-handoff.md`.
