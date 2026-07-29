# 2026-07-28 세션 핸드오프 — 스펙 025 상품 render-plan 어댑터

기준: 브랜치 `rebuild/modern-studio`, 착수 HEAD `0c058e4`(스펙 024 종료 지점).
스펙: `docs/rebuild/specs/025-product-render-plan-adapter.md`, 사전 조사 `docs/codex-claude-handoff/reviews/2026-07-28-product-render-plan-adapter-investigation.md`.

> **이 작업은 순수 adapter 완료이며, 상품 미리보기·Canvas 연결 완료가 아니다.**
> 고객 화면은 어댑터를 import조차 하지 않는다.

---

## 1. 무엇을 만들었나 (3계층 분리)

| 계층 | 책임 | 이번 변경 |
| --- | --- | --- |
| `@denn/shared` | 카탈로그 → **중립 geometry** | `FramePreviewGeometry.contentInsetPx: 0|8` 추가 |
| `apps/mockup` (신규 어댑터) | geometry + **호출자 명시 외형** + 사용자 이미지 상태 + 논리 width → plan | `buildCaseProductPlan` / `buildFrameProductPlan` |
| `@denn/render` | 카탈로그 무관 검증 + command 생성 | 케이스 zone별 `image`·`transform` 필수화 |

---

## 2. 계약 정정 1 — 케이스 zone별 이미지 (`@denn/render`)

- `CaseImageZone`이 **필수 `image`(intrinsic size)와 `transform`을 소유**한다.
- `CasePlanInput.image` / `CasePlanInput.defaultTransform` **제거**. **호환 fallback·deprecated overload·`zone.image ?? input.image` 없음.**
- 근거: 레거시는 zone별 독립 이미지·transform (`denn-mockup-tool.html:1662` `caseImgs[i]‖caseImg`, `:1665` `caseImgTs[i]‖…`). 공통 intrinsic size로는 비율이 다른 zone의 cover rect를 만들 수 없다.
- 무변경: zone 정렬·layer id·command 순서·guide·오류 code 집합. 누락 시 `image`→`INVALID_ZONE`, `transform`→`INVALID_TRANSFORM`.
- 수정된 기존 caller: `packages/render/src/plan/build.test.ts`(케이스 fixture·표), `apps/mockup/src/canvas/executePreviewPlan.test.ts`(`realCasePlan`).

**핵심 검증**: 같은 크기 zone 2개에 `100×100`(scale 1) / `400×100`(scale 2) 이미지를 주면 clip rect는 같고 draw rect는 **310×310 vs 2480×620**으로 갈린다(공통 intrinsic이면 불가능).

---

## 3. 계약 정정 2 — `contentInsetPx` (`@denn/shared`)

```
type === "uploaded" && design source 존재  →  0
그 밖의 지원 variant(builtin `full`, source 없는 uploaded)  →  8   (logical px)
```

- design source 판정은 **스펙 018과 같은 게이트·같은 필드 순서**를 내부 predicate `hasCatalogTemplateDesignSource`(공개 surface 미포함)로 재사용: `generatedDetailPreview === true`면 없음 → `dataUrl` → `sourceDataUrl` → `builderArtDataUrl` → `artDataUrl` → `originalDataUrl`, 각 후보는 **non-empty string일 때만** 존재.
- **반환은 숫자뿐** — source 문자열·필드명·URL 종류·token·중간 boolean 비노출(테스트가 `SECRETMARKER`/`data:`/`base64`/필드명 부재를 직접 검사).
- 레거시 `P = uploadedTransparentTpl ? 0 : 8`(`:3130`)은 **복제하지 않았다**: uploaded+source 경로는 `:3133`에서 `return`하므로 그 식의 `0` 분기는 도달 불가이고, inset 0은 그 경로가 mat rect를 그대로 쓰기 때문에 생긴다.

---

## 4. 어댑터 공개 API (`apps/mockup/src/canvas/productPlan.ts`)

```ts
buildCaseProductPlan({ geometry, bodyColor, zoneImages: ReadonlyMap<string, UserImageState> })
buildFrameProductPlan({ geometry, frameColor, logicalWidth, userImage })
  → { ok: true, plan: PreviewRenderPlan }
  | { ok: false, code: ProductPlanErrorCode, zoneSourceIndex?: number }
```

- 성공 시 **중간 입력이 아니라 `buildPreviewRenderPlan`을 통과한 `PreviewRenderPlan`**을 반환한다.
- `CatalogDocumentV1`·raw template·drawable·`imageBindings`·URL을 **받지 않는다**. zone lookup key는 geometry의 `case-zone-<sourceIndex>`이고 **추가 map entry는 무시**된다.
- code 9종: `INVALID_ADAPTER_INPUT` `MISSING_APPEARANCE` `INVALID_APPEARANCE` `MISSING_USER_IMAGE` `MISSING_ZONE_IMAGE` `INVALID_IMAGE_STATE` `INVALID_LOGICAL_SIZE` `NON_POSITIVE_RECT` `PLAN_BUILD_FAILED`.

### frame 실제 계산 (테스트로 고정)

| 입력 | 결과 |
| --- | --- |
| `W=400`, `aspect=1.4` | `H = round(400×1.4) = 560` |
| `pct=5` | `B = max(1, round(400×5/100)) = 20` |
| — | `frameRect = {0,0,400,560}` |
| — | `matRect = {20,20,360,520}` |
| `P=8` | `imageZone = {28,28,344,504}` |
| `P=0` | `imageZone = {20,20,360,520}` (= `matRect`) |
| `pct=0.01` | `round(0.04)=0` → **1로 clamp** |

epsilon·clamp·abs·추가 반올림·자동 확대/축소/이동 0. `innerBorder` 미공급(command 3개). containment는 스펙 024 builder가 재검증.

### 안전 경계

- 색은 정확한 `#RRGGBB`만(uppercase canonical). 공백·`#ABC`·alpha hex·named·`transparent`·`rgba()`·CSS 변수·비문자열 거부, **missing과 invalid를 다른 code로** 구분. **첫 색 자동 선택·웜 토프 토큰·`#1A1A1A`·기본 width `500` 전부 없음**(`logicalWidth`는 호출자 필수 양의 정수).
- 케이스 zone 이미지가 하나라도 없으면 **전체 실패**(`MISSING_ZONE_IMAGE` + `zoneSourceIndex`). 조용한 skip·부분 plan·shape 근사 0.
- `imageRef`는 스펙 020 문법 그대로 요구하고 trim·변환·생성하지 않음(URL 형태 → `INVALID_IMAGE_STATE`).
- 모든 값은 **1회 읽기 plain snapshot** 후 계산·builder 입력에 사용(getter drift 테스트: 첫 스냅샷만 사용). `ReadonlyMap.get` 자체가 throw해도 `INVALID_ADAPTER_INPUT`.
- hostile getter·Proxy trap·revoked Proxy·null/primitive/array 입력에서 **throw 0**. 유한 입력 overflow는 성공하지 않음(`PLAN_BUILD_FAILED`).
- 실패 payload는 **안전 code + 선택적 `zoneSourceIndex`뿐** — plan code·예외·색 원문·이름·ID·`imageRef`·URL·token 0.
- 오류 우선순위: 입력 snapshot → appearance → frame logical width → 이미지 상태 → rect 계산 → builder.

### 디렉터리 판단 (스펙 제안과 다른 점)

스펙은 `apps/mockup/src/plan/`을 제안했으나, `src/plan/**` 디렉터리를 두면 Tailwind source scan이 **고객 stylesheet에 `.transform`·`.uppercase`(+0.69 kB, gzip 3.16→3.36)** 를 추가함을 실측했다(plan 필드명 `transform`은 회피 불가). 이번 스펙이 `packages/ui`(‑ `@source not` 경계가 있는 곳) 변경을 금지하므로, 이미 scan에서 제외된(스펙 021) **framework-free `apps/mockup/src/canvas/`** 에 배치했다. 파일에 Canvas 의존 코드는 전혀 없다. 결과 고객 번들 **byte-identical**.

---

## 5. 게이트 결과

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, **lockfile diff 0**, 신규 의존성 0 |
| format / lint / typecheck | PASS |
| unit | **672** (604 → 672: 어댑터 57, shared `contentInsetPx` 10, plan 계약 정정 등) |
| build mockup | JS 217.69 kB / gzip **68.40**, CSS 11.32 kB / gzip **3.16** — `index-D9dnc5BM.css` md5 `a9b44036cb2e5910b23c147aa578696c` = **byte-identical** |
| build admin | 193.53 / 61.09, 8.54 / 2.64 = 무변경 |
| e2e | **58 PASS**(신규 E2E 0), reporter 요약, **exit 0 자체 종료 19초** |
| staging | `…\AppData\Local\Temp\denn-e2e-FgWt13` (OS temp), 실행 후 `denn-e2e-*` 잔여 **0** |
| 포트 | 4183·4184 free, 저장소 소속 잔류 node **0** |
| 고객 dist | mockup·admin **파일 목록 + SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| `pnpm run check` | PASS |
| `git diff --check` | clean |
| 네트워크 / live test / deploy | **0** |

재생성된 스펙 018 PNG는 복원했고 커밋하지 않았다.

## 6. 무변경 확인 (`git diff` 0)

고객 `App.tsx`·`BrowseFlow`·catalog controller / **production Canvas surface 전체**(`surface.ts`·`surface.css`·`PreviewCanvasSurface.tsx`·`usePreviewCanvasSurface.ts`·`executePreviewPlan.ts`·`canvas/types.ts`) / `packages/firebase|ui|spaces` / `apps/admin` / 운영 HTML / `firebase.json`·Rules / `poc/**` / PNG / `package.json` / `pnpm-lock.yaml`.

## 7. NOT TESTED · 후속

- **NOT TESTED**: 실제 사용자 이미지 load·binding·CORS-clean·운영 이미지·실기기·선명도.
- **후속 스펙 대상**: 고객 화면 연결, 색 선택 UI, 파일 선택/업로드, 케이스 `modelLogicalSize`와 CSS logical size 연결 정책, pointer·회전·text/clock·print/export·저장·주문.
- ⚠️ `firebase.json` `hosting.public:"."` → **Hosting 격리 전 배포 금지**(이번 스펙 범위 밖, 유지).

## 8. 커밋 / 롤백

| 순서 | 커밋 | 내용 |
| --- | --- | --- |
| 1 | `4a23f22` | 코드·테스트 (`@denn/render` 계약, `@denn/shared` `contentInsetPx`, 어댑터 + 테스트) |
| 2 | (문서) | 스펙 020·023 정정 append, 스펙 025 DONE, 이 핸드오프, `CURRENT.md` |

**롤백 순서: 문서 커밋 → 코드 커밋** (역순 revert).

---

## 9. 보완 라운드 1 — Codex 1차 재검증 (2026-07-29)

기준 HEAD `bfcf8d7`. Codex 차단 2건은 모두 **현재 스펙 범위 안의 snapshot 계약 위반**이라
`docs/codex-claude-handoff/AUTO_REVIEW_LOOP.md`에 따라 자동 구현·검증·분리 커밋·fast-forward push했다.
**Codex 최종 승인 전이므로 스펙은 종료 처리하지 않는다.**

### 9.1 보완 1 — case plan 입력의 정확한 1회 snapshot (`packages/render/src/plan/build.ts`)

결함(확인됨): `buildCase`가 검증에 쓴 값을 **다시 읽어** command를 만들었다.
`input.bodyColor` 2회(검증 `:151` → `case:body` 색 `:229`), `input.zones` 2회(`Array.isArray` → 배열 참조),
`zone.id` 4회(문법·중복 검사·`seen.add`·layer id), `zone.imageRef` 2회, `zone.order` 4회, `zone.guide` 2회,
`validateZoneRect`의 `units` 3회·`x/y/width/height` 각 2회, `validateStroke`의 `color` 2회·`width` 3회.
따라서 첫 읽기에 정상값, 두 번째 읽기에 다른 값을 주는 getter는 **검증되지 않은 값을 성공 plan에 넣을 수 있었다.**

수정: 사용되는 모든 필드를 **정확히 한 번** 읽어 plain normalized snapshot을 만들고, 이후 검증·정렬·command
생성은 snapshot만 읽는다.

| snapshot | 읽는 위치 | property read count |
| --- | --- | --- |
| `logicalCanvas` (+ `width`,`height`) | `readSizeOnce` | 1 / 1 / 1 |
| `bodyColor` | `buildCase` 지역 const | 1 |
| `zones` (+ `length`) | `buildCase` 지역 const | 1 / 1 |
| zone element `[index]` | 루프 | zone당 1 |
| `zone.id` | `readCaseZoneOnce` | 1 (문법·중복·layer id 전부 지역 const) |
| `zone.imageRef` | `readCaseZoneOnce` | 1 |
| `zone.rect` (+ `units`,`x`,`y`,`width`,`height`) | `validateZoneRect` | 1 / 각 1 |
| `zone.order` | `readCaseZoneOnce` | 1 |
| `zone.image` (+ `width`,`height`) | `readSizeOnce` | 1 / 각 1 |
| `zone.transform` (+ `scale`,`x`,`y`) | `readTransformOnce` | 1 / 각 1 |
| `zone.guide` (+ `color`,`width`) | `validateStroke` | 1 / 각 1 |
| `input.kind` | `buildPreviewRenderPlan` | 1 (이전 3회) |
| `input.innerBorder` (frame) | `buildFrame` | 1 (이전 2회) |

- 검증 후 caller object/property **재조회 0**. normalized snapshot 구조는 기존 `NormalizedZone`
  (`{id, imageRef, rect, image, transform, guide?, index, key}`) 그대로이고, 이제 그 필드가 전부 단일 읽기 결과다.
- **읽기·검증 순서를 바꾸지 않았다** → 오류 code·우선순위·layer ID·정렬(`key` → 원본 index)·guide 순서·
  frame 계약·executor 어휘 **무변경**. 호환 fallback·deprecated overload **0**.
- hostile getter·Proxy get/has trap·revoked Proxy는 여전히 **throw 0**(zone 단위 신규 테스트 포함).

### 9.2 보완 2 — `zoneImages.get` 단일 읽기 (`apps/mockup/src/canvas/productPlan.ts`)

결함(확인됨): `typeof (map as {get?}).get !== "function"` 검사에서 1회, `.get.bind(map)`에서 **다시 1회** 읽었다.
호출마다 다른 함수를 반환하는 getter라면 **검증한 함수와 실제 lookup 함수가 달라질 수 있었다.**

수정: `const getter = (map as {get?: unknown}).get`로 **정확히 1회** 읽고, **그 값**의 함수 여부를 검증하고,
**그 동일 함수만** bind·호출한다. `zoneImages` 자체도 1회 읽기(기존 유지), `get` property read count = **1**,
lookup 함수 호출 = **필요한 zone당 정확히 1회**(추가 map entry는 조회조차 하지 않음).
`get` property 접근 예외와 lookup 함수 예외 모두 `INVALID_ADAPTER_INPUT`(throw 0), 실제 `Map`/`ReadonlyMap` 호환 유지.

### 9.3 추가 안전 보완 — geometry zone `sourceIndex`

`sourceIndex`는 **0-based non-negative integer만** 허용한다. 음수·소수·`NaN`·`±Infinity`·비숫자·누락은
`INVALID_ADAPTER_INPUT`이다. 정상 projection index는 그대로 통과하며(비연속 `7` 포함) 실패 payload는
`{ok, code, zoneSourceIndex}`의 **안전한 숫자 index뿐**(원문·id·색·imageRef 추가 0).
같은 라운드에서 geometry `percentRect`의 `x/y/width/height`도 각 **1회 읽기**로 정정했다.

### 9.4 회귀 고정 근거

신규 테스트 **44건**(render 26 / mockup adapter 18). 수정 **전** 소스로 이 테스트들을 실행하면
**20건이 실패**(read count·drift·`get` 단일 읽기·`sourceIndex` 검증)하고 수정 후 전부 통과한다 —
즉 테스트가 결함을 실제로 고정한다. 각 getter의 read count를 명시적으로 단언하고, 두 번째 읽기에서
throw하도록 만든 입력에서도 첫 snapshot으로 **성공**함을 확인한다. malformed·Proxy·revoked 기존 테스트는 무회귀.

### 9.5 게이트 (보완 라운드 1)

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, `pnpm-lock.yaml` diff **0**, 신규 의존성 **0** |
| `format:check` / `lint` / `typecheck` | PASS |
| `test:unit` | **716 PASS**(672 → 716, 신규 44), 28 파일 |
| `build` | mockup JS 217.69 kB / gzip **68.40**, CSS 11.32 kB / gzip **3.16**(`index-D9dnc5BM.css` 동일) · admin 193.53 / 61.09, 8.54 / 2.64 = **무변경** |
| `test:e2e` | **58 PASS**(신규 E2E 0), reporter 요약, **exit 0 자체 종료 19초** |
| `check` | PASS |
| `git diff --check` | clean |
| 포트 / 프로세스 | 4183·4184 free, 저장소 소속 node·esbuild 잔류 **0** |
| OS temp | `denn-e2e-*` 신규 잔여 **0** |
| 고객 dist | mockup·admin 파일 목록 + **SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| 스펙 018 PNG | E2E가 재생성 → 시각 변경 없음(고객 dist byte-identical) → 복원·**미커밋** |
| 네트워크 / live / deploy | **0** |

### 9.6 무변경 (이번 라운드)

`packages/shared`·`packages/firebase|ui|spaces`·`apps/admin`·고객 `App.tsx`·`BrowseFlow`·catalog controller·
**production Canvas surface 전체**·frame builder 동작·executor·운영 HTML·`firebase.json`·Rules·`poc/**`·PNG·
`package.json`·`pnpm-lock.yaml` = `git diff` **0**. 변경 파일은 **4개뿐**:
`packages/render/src/plan/build.ts`(+ `.test.ts`), `apps/mockup/src/canvas/productPlan.ts`(+ `.test.ts`).

### 9.7 유지되는 사실

- **NOT TESTED**: 실제 사용자 이미지 load·binding·CORS-clean·운영 이미지·실기기·선명도.
- 이 라운드도 **순수 adapter 보완**이며 상품 미리보기·고객 Canvas 연결 완료가 아니다.
- `hosting.public:"."` → **Hosting 격리 전 배포 금지**.

### 9.8 커밋 / 롤백 (보완 라운드 1)

| 순서 | 커밋 | 내용 |
| --- | --- | --- |
| 3 | `6682e04` | 코드·테스트 (case 단일 읽기 snapshot, `zoneImages.get` 단일 읽기, `sourceIndex` 검증) |
| 4 | (문서) | 이 절, 스펙 025 DONE append, `CURRENT.md` |

**롤백 순서: 문서 커밋 → 코드 커밋**(역순 revert). 기준 HEAD `bfcf8d7`로 되돌리면 라운드 전 상태다.
