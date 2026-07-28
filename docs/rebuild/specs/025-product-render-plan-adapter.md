# 025 — 상품 geometry → preview render-plan 순수 어댑터

## 목표 (WHY)

스펙 023의 카탈로그 중립 geometry와 호출자가 명시한 상품 색·사용자 이미지 상태를
스펙 020/024의 결정적 `PreviewRenderPlan`으로 조립한다.

이 과정에서 현재 케이스 plan의 “모든 zone이 하나의 intrinsic image size를 공유”하는
계약 결함을 먼저 바로잡는다. 레거시는 zone별 이미지가 독립적이므로 서로 다른 비율의
이미지를 공통 크기로 cover 계산하면 잘못된 draw rect가 만들어진다.

근거:

- `docs/codex-claude-handoff/reviews/2026-07-28-product-render-plan-adapter-investigation.md`
- `docs/rebuild/specs/018-catalog-image-reference-and-thumbnail.md`
- `docs/rebuild/specs/020-deterministic-render-plan.md`
- `docs/rebuild/specs/023-catalog-preview-geometry-projection.md`
- `docs/rebuild/specs/024-frame-plan-mat-image-zone-separation.md`
- `packages/render/src/plan/types.ts`
- `denn-mockup-tool.html:1380-1382,1662-1665,3025,3119-3140`

## 범위 (SCOPE)

### 포함

- `CasePlanInput`의 이미지 크기·transform을 zone별 필수 값으로 정정
- `FramePreviewGeometry`에 안전한 `contentInsetPx: 0 | 8` projection 추가
- `apps/mockup`의 framework-free 순수 어댑터 2종
  - `buildCaseProductPlan`
  - `buildFrameProductPlan`
- 명시적 상품 색상과 사용자 이미지 상태 검증
- frame logical size·frame/mat/image rect 계산
- `buildPreviewRenderPlan` 호출과 안전한 오류 매핑
- malformed·hostile runtime 입력, getter drift, 비유한 계산 방어
- 합성 fixture 기반 unit과 기존 전체 게이트 회귀

### 제외(하지 않을 것)

- 고객 React UI·탐색 reducer·색상 선택 단계 변경
- 실제 `<canvas>` surface 연결
- 파일 선택·업로드·decode·`Image` 생성·binding map 생성
- URL·base64·blob·token·storagePath 해석 또는 복사
- Firebase GET·SDK·Auth·write·Rules·CORS·Hosting 변경·배포
- 첫 색·웜 토프·`#1A1A1A`·논리 width `500` 자동 기본값
- 이미지 없는 케이스 zone의 조용한 skip 또는 부분 plan
- 원형·라운드·multi-zone 액자·template art·inner border 근사
- pointer/touch/wheel/pinch·회전·text/clock/watermark
- print/PNG/export·저장·주문·카카오 전송
- 실제 운영 데이터·운영 이미지·실기기 검증
- 운영 HTML·관리자 앱·POC·디자인/결과 PNG 변경

## 대상 (WHERE)

주 구현 대상:

- `packages/render/src/plan/types.ts`
- `packages/render/src/plan/build.ts`
- `packages/render/src/plan/build.test.ts`
- `packages/shared/src/catalog/preview/`
- `apps/mockup/src/plan/` 또는 같은 의미의 framework-free 디렉터리
- 관련 unit fixture·export

허용되는 연쇄 수정:

- 변경된 `CasePlanInput`을 사용하는 기존 test/E2E fixture caller
- 스펙 020·023 문서 하단의 현재 계약 정정 append

변경 금지:

- 고객 `App.tsx`, `BrowseFlow`, catalog controller, production Canvas surface
- `packages/firebase/**`, `packages/ui/**`, `packages/spaces/**`
- `apps/admin/**`
- 운영 HTML, Firebase 설정·Rules, `poc/**`, PNG

신규 외부 의존성은 추가하지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 사전 조사 QUESTIONS 결정

| 항목 | 결정 |
|---|---|
| Q1 `contentInsetPx` 판정 위치 | 카탈로그 의미를 소유한 `@denn/shared` projection이 판정해 `FramePreviewGeometry.contentInsetPx`로 반환한다. 앱 어댑터는 raw template을 읽지 않는다. |
| Q2 logical width·반올림 | frame `logicalWidth`는 호출자 필수 **양의 정수**다. 기본값은 없다. `logicalHeight = Math.round(logicalWidth * aspect)`, band `B = Math.max(1, Math.round(logicalWidth * borderPercentOfWidth / 100))`로 계산한다. |
| Q3 색 공급 | case `bodyColor`, frame `frameColor` 모두 호출자 필수 `#RRGGBB`. 첫 색 lookup·자동 선택·UI 토큰 기본값을 금지한다. 유효 색은 uppercase canonical 값으로 plan에 전달한다. |
| Q4 zone 이미지 누락 | 케이스 geometry의 zone 하나라도 대응 이미지가 없으면 전체를 `MISSING_ZONE_IMAGE`로 실패시킨다. 조용한 skip·부분 plan을 만들지 않는다. |
| 케이스 공통 intrinsic 결함 | `CaseImageZone`이 자기 `image`와 `transform`을 필수로 소유한다. `CasePlanInput.image`와 `defaultTransform`은 제거한다. |
| case logical canvas | 스펙 023 `modelLogicalSize`를 그대로 사용한다. 축소·반올림·viewport 보정은 하지 않는다. 실제 UI 연결 시 별도 결정한다. |

### 2. 케이스 render-plan 계약 정정

현재 계약을 다음 의미로 정정한다.

```ts
interface CaseImageZone {
  readonly id: string;
  readonly imageRef: string;
  readonly image: ImageIntrinsicSize;
  readonly rect: ZoneRect;
  readonly transform: ImageTransform;
  readonly order?: number;
  readonly guide?: StrokeSpec;
}

interface CasePlanInput {
  readonly kind: "case";
  readonly logicalCanvas: Size;
  readonly bodyColor: HexColor;
  readonly zones: readonly CaseImageZone[];
}
```

- 각 zone의 `computeCoverDrawRect`는 반드시 그 zone의 `image`와 `transform`을 쓴다.
- 공통 image/default transform fallback을 남기지 않는다.
- zone 정렬·layer ID·command 순서·guide 동작은 스펙 020 그대로 유지한다.
- frame 계약과 executor command vocabulary는 변경하지 않는다.
- 모든 기존 caller는 새 필드를 명시적으로 제공하도록 수정한다.
- 호환 fallback, deprecated overload, `zone.image ?? input.image`를 만들지 않는다.

### 3. frame inset projection

`FramePreviewGeometry`에 다음 필드를 추가한다.

```ts
readonly contentInsetPx: 0 | 8;
```

판정:

- `type === "uploaded"`이고 유효 design source가 존재하면 `0`
- 스펙 023이 지원하는 builtin `full` 또는 design source 없는 uploaded면 `8`
- 지원 불가 variant는 기존 projection 오류를 유지

design source 존재 판정은 스펙 018과 같은 의미를 사용한다.

1. `generatedDetailPreview === true`면 source 없음
2. 그 외에는 `dataUrl`
3. `sourceDataUrl`
4. `builderArtDataUrl`
5. `artDataUrl`
6. `originalDataUrl`

각 후보는 non-empty string일 때만 존재한다. 필요하면 스펙 018 구현과 순수 predicate를
공유하도록 안전하게 refactor할 수 있지만, projection 결과에는 source 문자열·필드명·URL
종류·token을 넣지 않는다. `hasDesignSource`를 별도 공개하지 않고 최종 숫자 `0 | 8`만
반환한다.

레거시의 `P = uploadedTransparentTpl ? 0 : 8` 식을 그대로 복제하지 않는다. uploaded+
source 경로는 그 식을 쓰기 전에 return하며, inset 0은 해당 경로가 mat rect를 직접 쓰는
결과다. `8`은 비율이 아닌 logical px다.

### 4. 공개 어댑터 API

정확한 파일명은 기존 명명과 충돌하지 않는 범위에서 조정할 수 있으나 공개 의미는
다음과 같아야 한다.

```ts
interface UserImageState {
  readonly imageRef: string;
  readonly intrinsicSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly transform: {
    readonly scale: number;
    readonly x: number;
    readonly y: number;
  };
}

type ProductPlanErrorCode =
  | "INVALID_ADAPTER_INPUT"
  | "MISSING_APPEARANCE"
  | "INVALID_APPEARANCE"
  | "MISSING_USER_IMAGE"
  | "MISSING_ZONE_IMAGE"
  | "INVALID_IMAGE_STATE"
  | "INVALID_LOGICAL_SIZE"
  | "NON_POSITIVE_RECT"
  | "PLAN_BUILD_FAILED";

type ProductPlanResult =
  | { readonly ok: true; readonly plan: PreviewRenderPlan }
  | {
      readonly ok: false;
      readonly code: ProductPlanErrorCode;
      readonly zoneSourceIndex?: number;
    };

buildCaseProductPlan(input: {
  readonly geometry: CasePreviewGeometry;
  readonly bodyColor: string;
  readonly zoneImages: ReadonlyMap<string, UserImageState>;
}): ProductPlanResult;

buildFrameProductPlan(input: {
  readonly geometry: FramePreviewGeometry;
  readonly frameColor: string;
  readonly logicalWidth: number;
  readonly userImage: UserImageState;
}): ProductPlanResult;
```

- 두 함수는 React hook이 아닌 동기·순수 함수다.
- 성공 시 중간 `CasePlanInput`/`FramePlanInput`이 아니라 검증 완료된
  `PreviewRenderPlan`을 반환한다.
- adapter는 `buildPreviewRenderPlan`을 반드시 통과시킨다.
- adapter는 `CatalogDocumentV1`, raw template, drawable, `imageBindings`를 받지 않는다.
- case zone lookup key는 geometry의 synthetic `case-zone-<sourceIndex>`다.
- 추가 map entry는 결과에 영향을 주지 않는다.
- 같은 입력 snapshot은 deep-equal 결과를 만든다.

### 5. frame rect 계산

정상 frame 입력은 다음 순서로 계산한다.

```text
W = logicalWidth                         // positive integer, no default
H = round(W * aspect)
frameRect = { x: 0, y: 0, width: W, height: H }
B = max(1, round(W * borderPercentOfWidth / 100))
matRect = { x: B, y: B, width: W - 2B, height: H - 2B }
P = geometry.contentInsetPx              // exactly 0 or 8
imageZone = {
  x: B + P,
  y: B + P,
  width: W - 2B - 2P,
  height: H - 2B - 2P
}
```

- `H`, `B`, rect 좌표·크기가 모두 finite여야 한다.
- mat/image width 또는 height가 0 이하이면 `NON_POSITIVE_RECT`.
- epsilon·clamp·abs·추가 반올림·자동 확대/축소/이동을 넣지 않는다.
- `matColor`는 geometry 값을 그대로 사용한다.
- `innerBorder`는 공급하지 않는다.
- 최종 containment는 스펙 024 builder가 다시 검증한다.

### 6. 색·이미지 안전 경계

- 색은 정확한 `^#[0-9A-Fa-f]{6}$`만 허용하고 uppercase로 canonicalize한다.
- missing과 invalid를 구분한다.
- `transparent`, alpha hex, rgba, named color, CSS variable, whitespace 보정은 거부한다.
- `imageRef`는 스펙 020 restricted synthetic identifier 계약을 그대로 통과해야 한다.
- adapter가 imageRef를 trim·변환·생성하지 않는다.
- adapter는 URL/base64/token/secret detector라고 주장하지 않는다.
- caller는 imageRef에 URL/base64/token/secret을 전달하면 안 된다.
- user image의 intrinsic size·transform은 각 property를 한 번 읽은 plain snapshot으로
  검증한다.
- 성공·실패 결과에 drawable, source URL, storagePath, raw catalog를 넣지 않는다.
- 실패 결과는 `code`와 필요한 경우 `zoneSourceIndex`만 가진다. `planCode`,
  exception, ID, imageRef, 색 원문을 echo하지 않는다.

### 7. runtime 안전·결정성

- public 함수는 `unknown` runtime 입력에도 throw하지 않아야 한다.
- null·primitive·부분 객체·throwing getter·Proxy get/has trap·revoked Proxy를
  fail-closed로 처리한다.
- 입력 property를 한 번 읽어 plain normalized snapshot을 만든 뒤 계산과 builder 입력에
  snapshot만 사용한다.
- `ReadonlyMap.get` property와 호출 자체의 예외도 밖으로 던지지 않는다.
- getter drift가 첫 snapshot 이후 결과를 바꾸지 않아야 한다.
- 유한 입력 계산 overflow가 성공 결과로 나오지 않아야 한다.
- 입력 객체·map·geometry·image state를 변경하지 않는다.
- Date, random, locale, DOM, React, Canvas, IO, network, 전역 상태를 사용하지 않는다.

### 8. 오류 매핑

- 누락 appearance → `MISSING_APPEARANCE`
- 형식이 잘못된 appearance → `INVALID_APPEARANCE`
- frame `userImage` 누락 → `MISSING_USER_IMAGE`
- case zone lookup 누락 → `MISSING_ZONE_IMAGE` + 해당 geometry의 숫자
  `sourceIndex`
- image state shape·intrinsic·transform·imageRef 오류 → `INVALID_IMAGE_STATE`
- frame logical width가 정수가 아니거나 finite positive가 아님 → `INVALID_LOGICAL_SIZE`
- 계산된 mat/image rect가 non-positive → `NON_POSITIVE_RECT`
- 그 밖 `buildPreviewRenderPlan` 실패 → `PLAN_BUILD_FAILED`
- malformed outer/geometry/map access → `INVALID_ADAPTER_INPUT`

우선순위는 입력 snapshot → appearance → logical size(frame) → 필요한 이미지 상태 →
rect 계산 → render-plan builder 순서로 고정한다. 먼저 발생한 단계의 안전 code만 반환한다.

### 9. unit 검증

최소 다음을 고정한다.

- 케이스 zone 2개가 서로 다른 intrinsic size·transform을 사용하여 서로 다른 cover
  draw rect를 생성
- `CasePlanInput` 공통 image/default transform 잔존 0
- 케이스 geometry 순서·source index·synthetic id 보존
- case zone 하나 누락 시 전체 실패·partial plan 0·정확한 `zoneSourceIndex`
- 추가 zone map entry 무시
- body/frame 색 정상·canonical uppercase
- 색 missing/공백/alpha/named/transparent/CSS var 거부
- frame logical width 양의 정수 요구, `500` default 0
- `H=round(W*aspect)`, `B=max(1,round(W*pct/100))`
- uploaded+source inset 0, builtin/source 없는 uploaded inset 8
- 너무 작은 frame에서 `NON_POSITIVE_RECT`
- frame plan의 `frameRect ⊇ matRect ⊇ imageZone`
- innerBorder command 0
- shared projection은 source 문자열 없이 `contentInsetPx`만 반환
- generated detail preview gate와 source 우선순위 각 후보
- malformed·hostile getter·map get throw·revoked Proxy에서 throw 0
- getter drift 시 첫 snapshot만 사용
- 극단 유한 입력 overflow가 성공하지 않음
- deep-freeze 입력 비변형·결정성·모든 성공 숫자 finite
- 성공/실패 직렬화에 상품명·선택 ID·imageRef·URL·base64·token·path·예외 0
- 기존 frame plan/executor/surface와 스펙 015~024 회귀

새 Canvas 픽셀 E2E는 필수가 아니다. 이 스펙은 순수 plan 조립이며 스펙 022·024가
executor/surface/세 rect 픽셀을 이미 검증했다. 다만 변경된 케이스 plan caller 때문에
기존 E2E fixture를 수정했다면 전체 E2E는 반드시 통과해야 한다.

### 10. 문서 정합성

- 스펙 020 하단에 현재 케이스 zone별 image/transform 계약 정정을 append한다.
- 스펙 023 하단에 현재 `FramePreviewGeometry.contentInsetPx` 계약 정정을 append한다.
- 과거 승인 기록·당시 게이트 수치는 수정하지 않는다.
- 신규 handoff와 CURRENT에 “순수 adapter 완료이며 고객 Canvas 연결 완료가 아님”을
  명시한다.

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
- [ ] E2E reporter summary·명령 exit 0·자체 종료
- [ ] 종료 후 포트 4183/4184 free·저장소 소속 잔류 0
- [ ] OS temp `denn-e2e-*` 신규 잔여 0
- [ ] 고객 mockup/admin dist 파일 목록·SHA-256 E2E 전후 동일·fixture 0
- [ ] E2E가 PNG를 재생성하면 시각 변경 없는 파일은 복원·미커밋
- [ ] 고객 UI·production Canvas surface·Firebase·운영본·POC·PNG 무변경
- [ ] 실제 network·live test·deploy 0
- [ ] 코드/test와 문서/handoff 커밋 분리
- [ ] push 후 HEAD=origin, ahead/behind 0/0, working tree clean

구현 보고에는 다음을 명시한다.

- 정정된 `CasePlanInput`과 기존 caller 수정 범위
- `contentInsetPx` 판정과 source 문자열 비노출 근거
- 두 adapter의 실제 공개 API·Result
- frame `W/H/B/matRect/imageZone` 계산 결과
- 색·이미지 누락·hostile 입력 오류 우선순위
- zone별 서로 다른 intrinsic cover 계산 테스트
- 최종 unit/e2e 개수와 bundle/CSS gzip
- dist/temp/포트/프로세스 종료 결과
- 무변경·NOT TESTED 범위

## 완료 정의 (DONE)

- 케이스 plan이 zone마다 독립 intrinsic size·transform을 사용한다.
- shared frame projection이 raw source 없이 `contentInsetPx: 0 | 8`을 결정한다.
- 두 순수 adapter가 명시적 색·이미지·logical width에서 검증된 plan을 만든다.
- 기본 색·기본 width·이미지 skip·형상 근사가 없다.
- malformed·hostile 입력이 throw·부분 plan·민감정보 포함 오류를 만들지 않는다.
- 전체 자동 게이트와 기존 회귀가 통과한다.
- 고객 UI·실제 Canvas 연결·Firebase·운영본·배포는 변경되지 않는다.
- 완료를 “상품 미리보기 완성”으로 기록하지 않는다.

## 위험 (RISK)

- 이 스펙은 plan을 만들 뿐 실제 사용자 이미지 load·binding·CORS-clean을 검증하지 않는다.
- 케이스 `modelLogicalSize`를 CSS logical size로 직접 연결하면 작은 viewport에서 큰 내부
  스크롤이 생길 수 있다. 실제 layout 연결 전 별도 정책이 필요하다.
- source 존재 판정은 합성 fixture와 레거시 코드 근거만 검증한다. 운영 variant 분포는
  `NOT VERIFIED`다.
- 허용 문자만으로 구성된 secret을 imageRef 문법만으로 식별할 수 없다. caller·binding
  경계를 계속 지켜야 한다.
- `firebase.json`의 `hosting.public: "."` 위험은 그대로이며 Hosting 격리 전 배포 금지다.

### QUESTIONS

없음. 사전 조사 Q1~Q4와 추가로 발견한 케이스 공통 intrinsic 계약 충돌을 위 결정으로
고정했다.
