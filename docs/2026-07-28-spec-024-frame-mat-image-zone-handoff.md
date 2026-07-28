# 2026-07-28 — 스펙 024 액자 plan mat·image zone 분리 핸드오프

정본 스펙: `docs/rebuild/specs/024-frame-plan-mat-image-zone-separation.md` (DONE는 스펙 하단)
코드/test 커밋: `a9eb68f` · 문서 커밋: 별도

## 한 줄

`FramePlanInput`에 **필수 `matRect`** 를 추가해 프레임 body·mat·사진 영역을 서로 다른 rect로 표현하게 하고, `logicalCanvas ⊇ frameRect ⊇ matRect ⊇ imageZone` 포함관계를 fail-closed로 검증하고, 실제 Chromium 픽셀로 세 영역이 구분됨을 고정했다.

## 정정된 `FramePlanInput`

```ts
interface FramePlanInput {
  readonly kind: "frame";
  readonly logicalCanvas: Size;
  readonly frameRect: Rect;   // 프레임 body 전체
  readonly matRect: Rect;     // NEW 필수 — 프레임 band 안쪽 mat 채움
  readonly imageZone: Rect;   // mat 안쪽 사진 clip/cover
  readonly frameColor: HexColor;
  readonly matColor: HexColor;
  readonly image: ImageIntrinsicSize;
  readonly transform: ImageTransform;
  readonly imageRef: string;
  readonly innerBorder?: StrokeSpec;
}
```

`matRect ?? imageZone` 호환 fallback **없음**. 기존 caller(plan unit fixture, executor unit fixture)는 전부 명시 수정.

## command rect

| layer | rect |
| --- | --- |
| `frame:body` | `frameRect` |
| `frame:mat` | **`matRect`**(이전에는 `imageZone`) |
| `frame:user-image` | clip·cover = `imageZone` |
| `frame:inner-border`(선택) | `imageZone` — 레거시 4-band fill과 동등하지 않음, 상품 어댑터는 아직 공급 금지 |

executor 어휘·실행 순서·layer id 무변경.

## containment·오류 우선순위

읽기(snapshot) → 색 → image size → transform → imageRef → innerBorder → **far-edge overflow(`NON_FINITE_RESULT`)** → **containment(`INVALID_ZONE`)** → cover 계산.

- 경계 공유는 포함으로 허용, `frameRect`가 canvas보다 작아도 허용
- **epsilon·tolerance·clamp·abs·round·자동 축소/이동 0**

## getter drift 차단·hostile runtime

`readRectOnce`/`readSizeOnce`/`readTransformOnce`가 각 필드를 **1회만** 읽어 새 plain 객체로 복사하고, command 생성은 snapshot만 사용한다. 세 reader와 public 진입점에 예외 경계를 둬 **hostile getter·throwing Proxy get/has trap·revoked Proxy가 밖으로 throw하지 않고** `INVALID_ZONE`이 된다(기존 error code 무확장, 예외 객체 미저장).

> ⚠️ 이전 프레임 경로는 이런 입력에서 **실제로 throw했다** — 이번 스펙에서 발견해 수정했다.

테스트: 세 rect × (x/y/width/height) throwing getter · Proxy trap · revoked Proxy · drift rect(검증 후 다른 값 반환)에도 snapshot 1개만 사용 · 실패 payload는 `{ok, code}`뿐.

## 실제 Chromium 대표 픽셀

합성 plan: `frameRect 0,0,300,200` ⊃ `matRect 20,20,260,160` ⊃ `imageZone 60,50,180,100`, frame `#663300` / mat `#FFFF00` / drawable `#00FF00`.

| 위치 | 기대 색 |
| --- | --- |
| (5,5) · (5,100) · (295,195) | frame `#663300` |
| (30,30) · (270,170) · (55,100) · (150,45) | mat `#FFFF00`(사진 zone 바로 밖 포함) |
| (150,100) · (62,52) · (238,148) | drawable `#00FF00` |

clip 밖 번짐 0 · console error 0 · axe serious/critical 0 · 고정 sleep 0. `getImageData`는 테스트 측 `page.evaluate`에서만.

## harness가 builder를 import하지 않는 이유

Tailwind source scan이 harness 파일의 모든 단어를 utility 후보로 읽어, builder import가 utility와 겹치는 단어 2개를 **고객 stylesheet에 +2.3 kB**(`.transform`·`.ring`) 유입시켰다(실측). 이번 스펙이 `packages/ui` 변경을 금지하므로 `@source not` 확장 대신 **harness의 frame plan을 literal로 작성**하고 **builder → 그 literal 동일성을 unit test로 고정**했다. 결과 고객 번들 **byte-identical**.

## 게이트 결과

| 항목 | 값 |
| --- | --- |
| frozen install / lockfile diff | exit 0 / **0** |
| format · lint · typecheck | PASS |
| **unit** | **604** (568 → 604, 신규 36) |
| build | mockup JS 217.69 kB·gzip **68.40** / CSS 11.32 kB·gzip **3.16**(`index-D9dnc5BM.css` = byte-identical), admin 193.53·61.09 / 8.54·2.64 무변경 |
| **e2e** | **58 PASS**(57 → 58) · reporter 요약 · **exit 0 자체 종료(18초)** |
| 포트·잔류 | 4183/4184 free · 저장소 소속 잔류 0 · **OS temp `denn-e2e-*` 잔여 0** |
| 고객 dist | 파일 목록+**SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| check · `git diff --check` | PASS · clean |
| PNG | 재생성 스펙018 1개 복원·**미커밋** |

## 무변경 확인

`packages/shared|firebase|ui|spaces` · `apps/admin` · 고객 `App.tsx`/`BrowseFlow`/catalog controller · **production Canvas surface 전체**(`surface.ts`·`surface.css`·`PreviewCanvasSurface.tsx`·`usePreviewCanvasSurface.ts`·`executePreviewPlan.ts`·`types.ts`) · 운영 HTML · Firebase 설정·Rules · `poc/**` · 디자인 PNG = `git diff` **0**. 허용된 앱 변경은 **테스트 전용 harness와 E2E test뿐**. 네트워크·live·deploy 0.

## NOT TESTED / 후속 필수 결정

- 실제 상품 adapter(스펙 023 geometry → plan 조립) · 운영 이미지 · CORS-clean · 실기기 · 선명도/성능 = **NOT TESTED**
- 이번 완료는 **표현 능력 정정**이며 실제 상품 Canvas 연결 완료가 아니다
- **후속 adapter 스펙의 필수 결정**: builtin `full`의 `P=8` inset과 uploaded transparent의 `P=0` 판정 — 어댑터가 `matRect`와 `imageZone`을 같은 rect로 넘기면 타입은 통과하지만 레거시와 시각적으로 다르다
- `firebase.json` `hosting.public:"."` 위험 그대로 → **Hosting 격리 전 배포 금지**
