# 스펙 019 핸드오프 — Canvas 순수 geometry 계약 (@denn/render)

날짜: 2026-07-27
브랜치: `rebuild/modern-studio` · 기준 HEAD `655da16`
범위: 스펙 019만. 앱·Canvas UI·pointer·image/CORS·print는 미착수. 운영본·admin·POC·Firebase·PNG 무변경.

---

## 1. 변경 파일 (코드/테스트 커밋)

- `packages/render/src/geometry/types.ts` (신규) — Point/Size/Rect/PercentRect/ImageTransform/CoverDrawResult/BackingSizeResult + `GeometryResult`/`GeometryErrorCode`
- `packages/render/src/geometry/guards.ts` (신규, 내부) — `ok`/`err`/`allFinite`/`isPositive`/`clamp`
- `packages/render/src/geometry/cover.ts` (신규) — `computeCoverDrawRect`
- `packages/render/src/geometry/rect.ts` (신규) — `percentRectToLogical`
- `packages/render/src/geometry/point.ts` (신규) — `clientPointToLogical`
- `packages/render/src/geometry/aspect.ts` (신규) — `resolveOrientedAspect`
- `packages/render/src/geometry/backing.ts` (신규) — `computeBackingStoreSize`
- `packages/render/src/geometry/index.ts` (신규) — 공개 barrel(**5개 공개 함수 = 6개 geometry 계약** + 타입; guards 미노출)
- `packages/render/src/index.ts` (수정) — `export * from "./geometry"` 추가. **기존 `RenderInput`/`RenderOutput`/`RenderResult`/`RENDER_NOT_IMPLEMENTED` 유지**(제거·성공 위장 안 함)
- `*.test.ts` 5종 — cover 13 + rect 7 + point 7 + aspect 6 + backing 10(개 그룹, 총 60 케이스; 각 함수 overflow 1건 포함)

## 2. 공개 geometry API + 수식 + 레거시 근거

| 함수 | 수식 | 레거시 근거 |
|---|---|---|
| `computeCoverDrawRect({zone,image,transform,clampPan?})` | `baseScale=max(zone.w/img.w, zone.h/img.h)`; `drawScale=baseScale*scale`; `maxPan=abs(draw-zone)/2`; `pan=clamp(T, -maxPan, +maxPan)`; `origin=zone + (zone-draw)/2 + pan` | `drawImgT` `denn-mockup-tool.html:1543-1555`(preview 단일 clamp 경로), print `drawImageT:11371`(clamp 없음) |
| `percentRectToLogical(container, percent)` | `x=container.x + percent.x/100*container.w`, … | 케이스 zone `:1664`, 액자 업로드 zone `:3074` |
| `clientPointToLogical({client,clientRect,logicalSize})` | `x=(client.x-rect.x)*logicalSize.w/rect.w` | `cPos:1535`(단, backing 대신 명시 `logicalSize`) |
| `resolveOrientedAspect({portraitAspect,orientation})` | `landscape ? 1/portraitAspect : portraitAspect`(aspect=height/width) | orientation flip `:7211` |
| `computeBackingStoreSize({cssSize,deviceDpr,dprCap})` | `eff=min(dpr,cap)`; `backing=max(1, round(css*eff))` | POC `useCanvasDpr` `poc/.../App.tsx:126-128` |

- `computeCoverDrawRect` 반환: `{drawRect, baseScale, drawScale, appliedTransform, maxPan}`. **레거시는 transform을 직접 변경하지만 신규는 비변형, 보정 결과를 `appliedTransform`으로 반환**. `clampPan:false`면 입력 pan 그대로(print pan-scale 정책 미추가).
- `computeBackingStoreSize` 반환: `{cssSize, effectiveDpr, backingSize(정수)}`. **`dprCap`은 필수 입력, 기본값 없음**.

## 3. 오류 Result 계약

```ts
type GeometryErrorCode = "NON_FINITE_INPUT" | "NON_FINITE_RESULT" | "NON_POSITIVE_SIZE" | "NON_POSITIVE_SCALE" | "NON_POSITIVE_ASPECT" | "NON_POSITIVE_DPR";
type GeometryResult<T> = { ok: true; value: T } | { ok: false; code: GeometryErrorCode };
```

- **정상 잘못된 입력에 throw 없음** — 모두 `{ok:false, code}`.
- `NaN`/`±Infinity` 입력 → `NON_FINITE_INPUT`(양수 검사보다 우선). 크기/scale/aspect/dpr `≤0` → 각 `NON_POSITIVE_*`.
- **유한 입력끼리의 계산 결과가 overflow로 비유한(`Infinity`/`NaN`)이 되면 → `NON_FINITE_RESULT`**(입력 오류와 구분되는 별도 코드). 5개 함수 모두 반환 전 계산 결과를 전량 finite 검증 → **성공 Result에는 NaN/Infinity가 절대 없음**(계약, 테스트로 고정: 함수당 극단 유한입력→비유한결과 1건).
- point/pan/rect origin은 유한 음수 허용. 오류 payload에 이미지·URL·token·catalog 없음(code만).
- `@denn/shared Result`가 아니라 code 기반 최소 payload 사용(스펙 §1 허용).

## 4. 케이스·액자 공유 / 비공유 경계

- **공유(근거 있는 코어):** cover-fit·pan clamp·좌표 변환·percent rect·aspect·backing = 케이스와 **비회전** 액자 공통 수학 하나로 구현.
- **비공유(미구현, 후속):** 액자 **회전** cover 수학, 멀티존 transform state(케이스 zone별 vs 액자 단일), pointer/pinch/wheel, layer plan, print pan-scale. 스펙 §9대로 **하나의 불명확한 state/옵션으로 통합하지 않음**.

## 5. DPR 정책 미확정 유지

- `dprCap`은 **호출자 필수 입력**이며 함수 내부 기본값 없음. cap 2와 cap 4를 **입력 사례로만** 테스트(각각 640×480, 960×720 계산 검증)하고 **제품 정책으로 기록하지 않음**. POC의 2도, 레거시 룸의 4도 확정 안 함. print 300DPI/minLong/maxPixels·zoom 0.3~5도 미포함.

## 6. unit 항목과 실제 개수

- **cover(13):** 동일비율=zone / wide=height cover / tall=width cover / non-zero origin / scale>1 / **scale<1 abs clamp** / pan 한계 내 / pan ± 한계 밖 clamp / `clampPan:false` 유지 / deep-freeze 비변형 / 오류 7종(NaN·Infinity·0·음수 size·0·음수·NaN scale) / **overflow→`NON_FINITE_RESULT`**.
- **rect(6):** 0/0/100/100 / non-zero origin / 25/10/50/40 / 음수·>100 비clamp / 오류(0·음수 size·NaN·Infinity) / 비변형.
- **point(6):** 좌상단→0,0 / 중앙 / CSS 축소·확대 / **DPR/backing 무관(서로 다른 backing 가정)** / rect 밖 비clamp / 오류.
- **aspect(5):** 4/3 portrait / landscape 3/4 / 1 양방향 / 반복 비변형 / 오류(0·음수·NaN·Infinity).
- **backing(9):** DPR1 cap2 / DPR2 cap2 / DPR3.5 cap2→eff2 / DPR1.25 소수 round / 최소 1 floor / **cap4 계산되나 정책 아님** / 오류(0·음수 css·0·음수 dpr·NaN·Infinity) / 비변형. Node unit(window/DOM 없이) 실행.
- 각 함수에 **overflow→`NON_FINITE_RESULT`** 케이스 1건 추가(rect/point/aspect/backing 각 1, cover 1).
- **총 render 유닛 = 60**(그룹당 `it.each` 포함 케이스 수 합; 55 + overflow 5).

## 7. 전체 게이트

- `corepack pnpm install --frozen-lockfile` exit 0, `pnpm-lock.yaml` diff 0, **신규 의존성 0**.
- `node scripts/check.mjs`: format / lint(`--error-on-warnings`) / typecheck(7) / **unit 297**(스펙 018 237 + geometry 60) / build **PASS(exit 0)**.
- `pnpm test:e2e`: **49/49 PASS, exit 0**(스펙 015~018 회귀만; **새 Canvas E2E 없음**). 종료 후 preview 포트 미점유·저장소 vite/esbuild 잔류 0.
- `git diff --check` clean.

## 8. 금지 의존성 검사 (§H)

geometry **source**(non-test)에서 `document`·`window`·`HTMLCanvasElement`·`CanvasRenderingContext2D`·`getContext`·`drawImage`·`setTransform`·`devicePixelRatio`·`ResizeObserver`·`Image`·`fetch`·`firebase` 런타임 참조 **0**(grep 확인). `@denn/render`의 외부 import는 `index.ts`의 `type { Result } from "@denn/shared"`뿐(placeholder), geometry 파일은 상대 import만. **React/Firebase/DOM/Canvas/IO 참조 0.**

## 9. 운영/Firebase 무변경

`denn-mockup-tool.html`·`denn-admin.html`·`firebase.json`·`storage.rules`·`firestore.rules`·`apps/**`·`packages/{shared,firebase,ui,spaces}`·`poc/**`·디자인/결과 PNG = 무변경(hash baseline 동일, `apps/**` 등 diff 0). Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0.

## 10. 미검증 / 남은 위험

- 레거시 pan clamp `abs`는 scale<1에서 빈 영역 허용 — **호환 기록일 뿐 개선 아님**(스펙 RISK).
- 회전 액자·multi-zone·pointer-anchored zoom·print pan-scale은 별도 수학 → 이 결과 그대로 적용 불가(후속 스펙).
- 논리좌표=CSS px 계약은 backing과 분리 — 후속 adapter가 다시 섞으면 pointer 오차.
- 순수 geometry 통과는 실제 Canvas 선명도·합성·CORS-clean·인쇄 정확도를 **증명하지 않음**.
- DPR cap·주문차단 계약·zoom 앵커·print DPI = **NOT DECIDED 유지**. 실기기·실제 이미지·인쇄 = **NOT TESTED**.

## 11. 롤백

DONE/handoff 문서 커밋 → geometry 코드/test 커밋 순서로 역 `git revert`. 운영/Firebase/배포 롤백 없음.
