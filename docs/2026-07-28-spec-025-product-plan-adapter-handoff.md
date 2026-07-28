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
