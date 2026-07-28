# 023 — 카탈로그 미리보기 기하 projection

## 목표 (WHY)

고객 앱의 선택 ID와 `CatalogDocumentV1`에서, 실제 미리보기 plan을 만들 때 필요한
케이스·액자 기하만 안전하고 결정적으로 추출한다.

이번 단계는 상품 미리보기를 화면에 연결하는 단계가 아니다. 카탈로그 의미를 소유하는
`@denn/shared`가 레거시 별칭·우선순위·지원 불가 형상을 판정하여 render 비의존 중립
geometry를 반환하고, 색상 선택·사용자 이미지·화면 크기·`PreviewRenderPlan` 조립은
후속 앱 계층 스펙에 남긴다.

근거:

- `docs/codex-claude-handoff/reviews/2026-07-28-catalog-render-plan-projection-investigation.md`
- `docs/rebuild/specs/016-catalog-browse-selectors.md`
- `docs/rebuild/specs/019-canvas-geometry-contract.md`
- `docs/rebuild/specs/020-deterministic-render-plan.md`
- `docs/rebuild/specs/022-react-canvas-surface-lifecycle.md`
- `denn-mockup-tool.html:1046-1047,1660-1681,3101-3129,11030-11031`
- `denn-admin.html:848-854,2191,2326,9783-9784`

## 범위 (SCOPE)

### 포함

- `@denn/shared`의 순수 case/frame preview geometry projection
- 선택 ID의 정확 일치 lookup과 중복·누락 거부
- 케이스 모델 논리 크기 `models[].w/h`
- 케이스 사각 photo zone의 퍼센트 geometry
- `photoZones`·`zones` 별칭과 `photoSlot` 단일 fallback
- 원본 순서 기반의 결정적 synthetic zone ID
- 액자 aspect와 border thickness 비율
- 액자 template mat 색상 해석
- 안전한 Result·diagnostic 계약
- 합성 fixture 기반 unit test
- 기존 자동 게이트 회귀 확인

### 제외(하지 않을 것)

- `CasePlanInput`·`FramePlanInput`·`PreviewRenderPlan` 생성
- `@denn/render` 의존 또는 스펙 019·020 계약 변경
- 고객 탐색 UI·선택 reducer·Canvas surface 연결
- 케이스 body color 결정 또는 레거시 `#1A1A1A` 기본값 채택
- `'transparent'` 케이스·체커보드
- 액자 색상 선택 단계·`frameColorId`·`frameColors[].fill` 연결
- 사용자 이미지·intrinsic size·transform·drawable·binding map
- URL/base64/blob/token/storagePath 해석 또는 복사
- 원형·라운드 zone을 사각형으로 근사
- 라운드 body·그림자·mat alpha 외곽선
- inner border를 `stroke-rect`로 근사
- 액자 multi-zone을 단일 zone으로 축소
- pointer/touch/wheel/pinch·회전·text/clock/watermark
- print/PNG/export·저장·주문·카카오 전송
- 실제 Firebase GET·이미지 다운로드·live test
- Firebase SDK/Auth/write/Rules/CORS/Hosting 변경·배포
- 운영 HTML·관리자 앱·POC·디자인 PNG 변경
- 실제 운영 데이터·실기기 검증

## 대상 (WHERE)

주 구현 대상:

- `packages/shared/src/catalog/preview/`
- `packages/shared/src/catalog/index.ts`의 공개 export
- 합성 fixture와 unit test

변경 금지:

- `packages/render/**`
- `packages/firebase/**`
- `packages/ui/**`
- `packages/spaces/**`
- `apps/mockup/**`
- `apps/admin/**`
- 운영 HTML, Firebase 설정·Rules, `poc/**`, 디자인 PNG

신규 외부 의존성은 추가하지 않는다.

## 구현 지시 (WHAT / HOW)

### 1. 이번 스펙의 결정

사전 조사 Q1~Q14를 다음과 같이 처리한다.

| 항목 | 결정 |
|---|---|
| Q1 케이스 body color | 카탈로그 geometry가 아니므로 이번 API에 포함하지 않는다. 후속 호출자 필수 입력으로 남긴다. |
| Q2 액자 색 | 선택 단계가 없으므로 이번 API에 포함하지 않는다. 첫 색 자동 선택을 금지한다. |
| Q3 logical canvas | 케이스 projection은 레거시 근거인 모델 `w/h`를 `modelLogicalSize`로 반환한다. 액자는 `aspect`만 반환한다. 실제 CSS logical size는 후속 앱 계층이 정한다. |
| Q4 zone ID | 원본 배열의 0-based source index로 `case-zone-<index>`를 합성한다. 정렬이나 필터 후 index로 다시 번호를 매기지 않는다. |
| Q5 원형·라운드 zone | 전체 projection을 명시적으로 실패시킨다. 사각 근사·조용한 제외 금지. |
| Q6 inner border | 이번 output에서 제외한다. 레거시 4-band fill과 스펙 020 stroke는 동등하지 않다. |
| Q7 alpha 색 | 생략한다. 불투명 색으로 근사하거나 render 색 계약을 확장하지 않는다. |
| Q8 액자 multi-zone | 명시적으로 지원하지 않으며 해당 template은 실패시킨다. 단일 zone 근사 금지. |
| Q9 thickness fallback | 유효한 size별 값 → 유효한 top-level 값까지만 사용한다. 둘 다 없으면 실패한다. 근거가 HTML 상수뿐인 `5.5`를 라이브러리 기본값으로 넣지 않는다. |
| Q10 template 미선택 | 현 UI 완료 계약상 지원하지 않는다. 빈 template ID나 lookup 실패는 명시적 실패다. |
| Q11 zone 검증 | 이번 projection 경계가 opaque caseTemplate의 지원 subset을 런타임 검증한다. Catalog read 계약은 확장하지 않는다. |
| Q12 size별 thickness | opaque 보존값에 finite positive number가 실제 있으면 우선 사용한다. 타입을 전역 Catalog 모델의 known field로 승격하지 않는다. |
| Q13 운영 분포 | 합성 fixture만 검증하고 `NOT VERIFIED` 유지. |
| Q14 `prevMaxW` | 앱 UI 설정이므로 사용하지 않는다. frame output은 aspect만 반환한다. |

### 2. 공개 API와 반환 타입

정확한 이름은 기존 `catalog/browse`, `catalog/images` 명명과 충돌하지 않는 범위에서
조정할 수 있으나 다음 의미를 유지한다.

```ts
type PreviewProjectionDiagnostic = {
  readonly code: PreviewProjectionDiagnosticCode;
  readonly collection: "caseTemplates" | "frameTemplates" | "models" | "frameSizes";
  readonly sourceIndex?: number;
};

type PreviewProjectionResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly diagnostics: readonly PreviewProjectionDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly code: PreviewProjectionErrorCode;
      readonly diagnostics: readonly PreviewProjectionDiagnostic[];
    };

type CasePreviewGeometry = {
  readonly modelLogicalSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly zones: readonly {
    readonly id: string; // case-zone-<original source index>
    readonly sourceIndex: number;
    readonly percentRect: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
  }[];
};

type FramePreviewGeometry = {
  readonly aspect: number; // H / W
  readonly borderPercentOfWidth: number;
  readonly matColor: string; // canonical uppercase #RRGGBB
};

projectCasePreviewGeometry(
  document: CatalogDocumentV1,
  selection: { readonly modelId: string; readonly templateId: string },
): PreviewProjectionResult<CasePreviewGeometry>;

projectFramePreviewGeometry(
  document: CatalogDocumentV1,
  selection: { readonly frameSizeId: string; readonly templateId: string },
): PreviewProjectionResult<FramePreviewGeometry>;
```

반환값에는 raw item, 상품명, 선택 ID 원문, category ID, 이미지 필드, URL, base64,
token, storagePath를 넣지 않는다. 오류와 diagnostic도 code·collection·sourceIndex
외의 원문 값을 포함하지 않는다.

### 3. 공통 lookup·입력 안전

- public 함수는 `unknown` runtime 입력에도 throw하지 않아야 한다.
- document shell과 selection shape를 property getter 예외까지 안전하게 읽는다.
- selection ID는 빈 문자열·공백만을 거부하고, trim한 값으로 다른 item을 찾지 않는다.
- 해당 collection이 배열이 아니면 실패한다.
- ID는 정확 일치로 찾는다.
- 일치 0개는 `ITEM_NOT_FOUND`, 2개 이상은 `AMBIGUOUS_ITEM`으로 실패한다.
- 찾은 item이 plain object가 아니면 `INVALID_ITEM`으로 실패한다.
- getter/Proxy/revoked Proxy 등 runtime property read 예외를 밖으로 던지지 않는다.
- 같은 입력은 deep-equal 결과를 반환하고 입력을 변경하지 않는다.
- JSON stringify 가능한 plain data만 반환한다.
- `Date`, random, locale 정렬, IO, 전역 상태를 사용하지 않는다.

정확한 오류 코드 집합은 위 의미를 흐리지 않는 선에서 최소화하되 최소 다음을
구분한다.

- `INVALID_INPUT`
- `INVALID_COLLECTION`
- `ITEM_NOT_FOUND`
- `AMBIGUOUS_ITEM`
- `INVALID_ITEM`
- `INVALID_GEOMETRY`
- `UNSUPPORTED_ZONE_SHAPE`
- `UNSUPPORTED_FRAME_TEMPLATE`

### 4. 케이스 geometry

#### 모델

- 선택한 model의 `w`, `h`는 finite positive number여야 한다.
- 문자열 숫자 coercion, abs, clamp, fallback을 하지 않는다.
- 성공 시 그대로 `modelLogicalSize`로 반환한다.

#### zone 공급원

우선순위:

1. `photoZones`가 배열이면 그것을 사용한다.
2. 그렇지 않고 `zones`가 배열이면 그것을 legacy alias로 사용한다.
3. 둘 다 배열이 아니고 `photoSlot`이 plain object면 단일 zone 배열로 사용한다.
4. 어느 것도 없으면 `INVALID_GEOMETRY`로 실패한다.

빈 `photoZones` 또는 빈 `zones`는 “없음”으로 바꾸거나 `photoSlot`로 덮지 않는다.
선택된 명시 배열이 비어 있으면 `INVALID_GEOMETRY`다.

각 zone:

- plain object여야 한다.
- `x`, `y`, `w`, `h`가 finite number여야 한다.
- `w`, `h`는 `> 0`이어야 한다.
- 퍼센트 값을 clamp하거나 정수화하지 않는다.
- `x/y/w/h`로 계산한 경계가 0..100을 벗어나면 실패한다.
- `type === "circle"`이면 `UNSUPPORTED_ZONE_SHAPE`.
- `cornerR`가 존재하고 finite `> 0`이면 `UNSUPPORTED_ZONE_SHAPE`.
- 알 수 없는 non-empty `type`도 지원한다고 추정하지 말고 `UNSUPPORTED_ZONE_SHAPE`.
- `type`이 없거나 명시적으로 사각형임이 레거시 근거로 확인된 값만 허용한다.
- 원본 순서를 유지한다. 임의 order·label 정렬을 하지 않는다.
- ID는 `case-zone-${sourceIndex}`로 만든다.

`photoSlot`에 zone shape 필드가 없으면 사각형으로 취급할 수 있다. 레거시 기본
`{x:5,y:5,w:90,h:90}`은 필드 자체가 모두 없을 때 새로 만들지 않는다. 즉
`photoSlot`도 실제 네 필드를 가져야 한다.

### 5. 액자 geometry

#### aspect

- 선택한 frameSize의 `aspect`는 finite positive number여야 한다.
- 누락 시 레거시 UI fallback `1`을 라이브러리 기본값으로 만들지 않고
  `INVALID_GEOMETRY`로 실패한다.
- output은 H/W 비율 그대로다. pixel width/height를 만들지 않는다.

#### border thickness

우선순위:

1. 선택한 frameSize의 opaque `frameThickness`
2. document data의 top-level `frameThickness`

각 값은 finite positive number일 때만 유효하다. 상위 값이 존재하지만 invalid이면
하위 fallback으로 숨기지 말고 `INVALID_GEOMETRY`로 실패한다. 둘 다 없으면 실패한다.
HTML 상수 `5.5`를 추가하지 않는다.

성공 값은 `borderPercentOfWidth`로 반환한다. `B=max(1,round(W*pct/100))` pixel
계산은 실제 logical width가 정해지는 후속 앱 어댑터의 책임이다.

#### template·mat

- frameTemplate lookup은 필수다.
- template이 multi-zone 종류(`duo`, `trio`, 또는 조사에서 확인한 동등한 다중 zone
  형태)이면 `UNSUPPORTED_FRAME_TEMPLATE`.
- 단일 zone임을 확인할 수 없는 알 수 없는 template type도 성공으로 추정하지 않는다.
- mat 사용 플래그와 색상 별칭은 조사 보고서 표 5의 확인된 목록만 지원한다.
- mat가 꺼져 있거나 유효한 색 필드가 없을 때 레거시 렌더 fallback과 동일하게
  `#FFFFFF`를 반환한다.
- 유효한 mat 색은 정확한 `#RRGGBB`만 받고 canonical uppercase로 반환한다.
- 잘못된 색 문자열은 원문을 보존하지 않고 `#FFFFFF` fallback과 안전 diagnostic을
  남긴다.
- inner border·mat alpha outline은 output에 포함하지 않는다.

### 6. diagnostic

diagnostic은 정상 projection을 허용하되 근거 있는 fallback이나 생략을 알리는 용도다.
최소 다음 상황을 구분한다.

- legacy alias `zones` 사용
- `photoSlot` fallback 사용
- invalid mat color → white fallback
- 지원 계약상 inner border 정보 생략
- 지원 계약상 alpha outline 정보 생략

원형/라운드 zone, multi-zone, invalid geometry, lookup 모호성은 warning으로 성공시키지
않고 fatal Result로 반환한다.

diagnostic 배열 순서는 탐색·source 순서로 결정적이어야 하며 중복 code를 임의로
합치지 않는다. 단, 동일 source의 동일 원인 중복 보고는 하나만 둔다.

### 7. 의존성·보안 경계

- `@denn/shared`는 React, DOM, Canvas, Firebase, `@denn/render`, 다른 `@denn/*`에
  새로 의존하지 않는다.
- projection source에 fetch, localStorage, IndexedDB, Image, URL 생성, base64 decode,
  storagePath 해석을 넣지 않는다.
- `projectCatalogTemplateImage`를 호출하거나 그 결과를 geometry에 합치지 않는다.
- `CatalogBrowseIndex` output을 raw catalog 복원 수단으로 사용하지 않는다.
- 선택 ID는 lookup에만 사용하고 성공·실패 payload에 echo하지 않는다.
- 실제 카탈로그·운영 데이터·PII fixture를 사용하지 않는다.

### 8. 자동검증

#### Unit

합성 fixture만 사용해 최소 다음을 고정한다.

- case model `w/h`와 사각 `photoZones` 투영
- `photoZones` 원본 순서와 `case-zone-0`, `case-zone-1`
- `zones` alias diagnostic
- `photoSlot` 단일 fallback diagnostic
- collection·selection·item malformed 입력과 hostile getter/Proxy가 throw 0
- lookup 0개·중복 ID 2개 명시적 실패
- 모델 크기 NaN/Infinity/0/음수/문자열 거부
- zone 좌표 NaN/Infinity, non-positive size, 0..100 경계 초과 거부
- circle·positive cornerR·unknown type가 사각 근사 없이 실패
- 빈 explicit zone 배열 실패
- frame aspect 정상·invalid/missing 거부
- size별 thickness 우선
- top-level thickness fallback
- 존재하지만 invalid한 상위 thickness가 하위 fallback으로 숨겨지지 않음
- thickness 둘 다 없음 실패, 하드코딩 5.5 결과 없음
- 단일 frame template 성공
- multi-zone·unknown template type 실패
- mat 플래그·색 별칭의 확인된 조합
- invalid mat color→`#FFFFFF`+diagnostic
- inner border·alpha outline 정보가 output에 없고 diagnostic만 존재
- 성공·실패 직렬화에 ID 원문·이름·URL·base64·token·storagePath 0
- 입력 deep-freeze 비변형
- 동일 입력 deep-equal 결정성
- 결과 전 숫자 finite

#### 회귀

- 기존 catalog read·browse·image projection unit 전부 통과
- 기존 render geometry·plan·executor·surface unit 전부 통과
- 앱을 변경하지 않으므로 신규 Canvas/product E2E는 만들지 않는다.
- 기존 E2E 전체를 실행해 스펙 015~022 회귀와 종료 결정성을 확인한다.
- E2E OS-temp staging·exact-handle teardown 계약을 변경하지 않는다.

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
- [ ] E2E reporter summary·명령 exit 0
- [ ] 종료 후 포트 4183/4184 free·저장소 실행 소속 잔류 0
- [ ] OS temp `denn-e2e-*` 신규 잔여 0
- [ ] 고객 mockup/admin dist가 E2E 전후 동일하고 fixture 파일 0
- [ ] E2E가 기존 추적 PNG를 재생성하면 시각 변경 없는 파일은 복원·미커밋
- [ ] 운영 HTML·Firebase 설정/Rules·앱·다른 패키지·POC·PNG 무변경
- [ ] 실제 network/live test/deploy 0
- [ ] 코드/test와 문서/handoff 커밋 분리
- [ ] push 후 HEAD=origin, ahead/behind 0/0, working tree clean

검증 보고에는 다음을 명시한다.

- 실제 공개 API·Result·diagnostic code
- Q1~Q14가 코드에 어떻게 반영됐는지
- case zone 공급원과 ID 합성·shape 거부 규칙
- frame aspect·thickness·template·mat 규칙
- 반환 payload의 정확한 필드
- hostile runtime 입력·누출 방지 테스트 목록
- 최종 unit/e2e 수와 bundle/CSS gzip 수치
- 실제 운영 데이터·Canvas 연결·실기기 NOT TESTED

## 완료 정의 (DONE)

- `@denn/shared`가 선택 ID와 Catalog V1에서 지원 가능한 case/frame geometry만
  결정적으로 반환한다.
- raw catalog의 opaque 필드를 projection 경계에서 방어적으로 검증한다.
- 사각형으로 표현할 수 없는 zone/template을 근사하거나 조용히 제외하지 않는다.
- 케이스 색·액자 색·사용자 이미지·CSS logical size를 임의 기본값으로 채우지 않는다.
- projection 결과가 `@denn/render`·React·Firebase·DOM·IO에 의존하지 않는다.
- 결과·오류·diagnostic에 원문 ID·이름·이미지·URL·token·path가 없다.
- 기존 472 unit·57 E2E 기준에서 회귀가 없고 새 수를 정확히 보고한다.
- 앱·Canvas·Firebase·운영본·배포가 변경되지 않는다.
- 범위 밖 기능과 운영 데이터 분포를 PASS로 기록하지 않는다.

## 위험 (RISK)

- 합성 fixture는 실제 published catalog의 opaque caseTemplate 변형을 모두 대표하지 않는다.
- 원형·라운드 case와 multi-zone frame은 이번 스펙에서 의도적으로 실패하므로 해당
  상품은 후속 render vocabulary 확장 전까지 미리보기를 만들 수 없다.
- size별 `frameThickness`는 read model의 known field가 아니므로 운영 분포는 여전히
  확인되지 않았다.
- 케이스 model px와 실제 CSS logical size를 결합하는 정책은 후속 앱 어댑터에서
  결정해야 한다.
- geometry projection 완료는 실제 product plan·Canvas preview·CORS-clean을 증명하지
  않는다.
- `firebase.json`의 `hosting.public: "."` 위험은 그대로이며, Hosting 격리 전에는
  어떤 배포도 하면 안 된다.

### QUESTIONS

없음. 사전 조사 Q1~Q14는 이번 스펙을 render 비의존 geometry projection으로
제한하고 위 규칙으로 결정했다. 색상 선택·사용자 이미지·CSS logical size·plan 조립,
지원 불가 shape의 render 계약 확장은 각각 후속 스펙으로 분리한다.

---

### DONE (Claude) — 2026-07-28

- **구현 위치:** `packages/shared/src/catalog/preview/{types,project,index}.ts` + `project.test.ts`, `catalog/index.ts`에 `export * from "./preview"` 추가. **그 외 파일 무변경**(앱·`@denn/render`·firebase·ui·spaces·운영 HTML·Firebase 설정/Rules·POC·PNG diff 0). 신규 외부 의존성 0.
- **공개 API:** `projectCasePreviewGeometry(document, {modelId, templateId})` → `{modelLogicalSize:{width,height}, zones:[{id, sourceIndex, percentRect{x,y,width,height}}]}` / `projectFramePreviewGeometry(document, {frameSizeId, templateId})` → `{aspect, borderPercentOfWidth, matColor}`. 둘 다 `PreviewProjectionResult<T>` = `{ok:true,value,diagnostics}` | `{ok:false,code,diagnostics}`.
- **오류 코드(8):** `INVALID_INPUT` · `INVALID_COLLECTION` · `ITEM_NOT_FOUND` · `AMBIGUOUS_ITEM` · `INVALID_ITEM` · `INVALID_GEOMETRY` · `UNSUPPORTED_ZONE_SHAPE` · `UNSUPPORTED_FRAME_TEMPLATE`. **diagnostic 코드(5):** `LEGACY_ZONES_ALIAS` · `PHOTO_SLOT_FALLBACK` · `INVALID_MAT_COLOR` · `INNER_BORDER_OMITTED` · `ALPHA_OUTLINE_OMITTED`(각각 `code`+`collection`+선택적 `sourceIndex`만).
- **Q1~Q14 반영:** Q1 케이스 body color·Q2 액자 색 = **API에 없음**(첫 색 자동 선택 없음) / Q3 케이스는 `modelLogicalSize`(모델 w/h)만, 액자는 `aspect`만 반환 / Q4 zone id = **원본 index 기반 `case-zone-<index>`**(정렬·필터 후 재번호 없음) / Q5 원형·라운드 → **전체 실패**(사각 근사·조용한 제외 0) / Q6 inner border **output 제외 + diagnostic** / Q7 alpha 색 **생략 + diagnostic** / Q8 multi-zone **실패** / Q9 thickness = size별 → top-level까지만, **`5.5` 하드코딩 없음**(둘 다 없으면 실패) / Q10 template 미선택·blank ID = 명시적 실패 / Q11 opaque caseTemplate의 지원 subset을 이 경계에서 런타임 검증(read 계약 무확장) / Q12 size별 `frameThickness`는 opaque 값이 유한 양수일 때만 우선 사용(타입 승격 없음) / Q13 합성 fixture만·`NOT VERIFIED` 유지 / Q14 `prevMaxW` 미사용.
- **케이스 규칙:** `modelLogicalSize`는 `models[].w/h` **그대로**(문자열 coercion·abs·clamp·fallback 0; 누락/0/음수/NaN/Infinity/숫자문자열 → `INVALID_GEOMETRY`). zone 공급원 = `photoZones` → `zones`(alias diagnostic) → 단일 `photoSlot`(diagnostic); **명시적으로 존재하는 빈 배열은 fallthrough 없이 실패**. zone별 = plain object · `x/y` 유한 · `w/h` 양수 · **정확한 0..100 경계 내**(clamp·정수화 없음) · `type` 없음/`""`/`"rect"`만 사각으로 인정 · `cornerR>0` 또는 미지의 `type` → `UNSUPPORTED_ZONE_SHAPE`. 원본 순서 유지, `label`·`order` 기반 정렬 없음.
- **액자 규칙:** `aspect`는 유한 양수 필수(레거시 `‖1` 미복제). thickness는 **size별 → top-level** 순서이며 상위 값이 존재하지만 invalid면 **하위로 숨기지 않고 실패**. template은 **"단일 full-mat 사각형"만 지원** — uploaded(zone 데이터 없음 / 단일 `0,0,100,100` zone 또는 photoSlot)와 **builtin `full`**만 통과, `duo`·`trio`·`text_only`·`top_text`·미지 builtin id·미지 `type` → `UNSUPPORTED_FRAME_TEMPLATE`, builtin `circle`·원형/라운드 zone → `UNSUPPORTED_ZONE_SHAPE`(근거 `denn-mockup-tool.html:3134-3140`, `:3044-3047`, `:3069-3074`). mat 색 = 플래그 3별칭(`true/1/'1'/'true'/'on'`) + 색 4별칭 + **정확한 `#RRGGBB`만**, canonical **대문자**, 그 외 `#FFFFFF`(원문 미보존 + `INVALID_MAT_COLOR`), 비활성도 `#FFFFFF`.
- **반환 payload 정확한 필드:** case = `modelLogicalSize.width/height`, `zones[].id/sourceIndex/percentRect.x,y,width,height` / frame = `aspect`, `borderPercentOfWidth`, `matColor`. 그 외 어떤 필드도 없음(테스트로 키 집합 고정). raw item·상품명·선택 ID·categoryId·이미지·URL·base64·token·storagePath **0**(성공·실패 모두 직렬화 검사).
- **hostile 입력·누출 방지 테스트:** null/undefined/primitive/array document · `data` 비객체 · malformed selection(null/primitive/필드 누락/비문자열) · **throwing getter**(document `data`, zone `x`) · **Proxy get trap** · **revoked Proxy** · hostile selection Proxy → 전부 `expect(...).not.toThrow()` + 실패 Result. 추가로 blank/공백 ID 거부, trim된 ID가 다른 item을 찾지 않음, 원문 미echo, deep-freeze 입력 비변형, 동일 입력 deep-equal 결정성, JSON round-trip 동일, 실패 payload 키 = `ok/code/diagnostics`.
- **게이트:** frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 568**(472 → 568, preview 96 신규) / build(**mockup JS 217.69 kB·gzip 68.40 / CSS 11.32 kB·gzip 3.16, admin 193.53·61.09 / 8.54·2.64 — 전부 동일**) / **e2e 57 PASS**(신규 E2E 0)·reporter 요약·**exit 0 자체 종료** / check PASS / `git diff --check` clean / 포트 4183·4184 free·잔류 0 / **OS temp `denn-e2e-*` 잔여 0** / 고객 mockup·admin dist **파일 목록+SHA-256 E2E 전후 동일·fixture 파일 0** / 재생성 스펙018 PNG 복원·미커밋.
- **NOT TESTED / 유지:** 실제 published catalog의 opaque caseTemplate 변형 분포(합성 fixture만) · 실제 운영 데이터 · Canvas 연결·실제 미리보기 픽셀 · CORS-clean · 실기기. **이 DONE은 상품 미리보기 완료가 아니다** — 색 선택·사용자 이미지·CSS logical size·`PreviewRenderPlan` 조립은 후속 앱 계층 스펙이다. `hosting.public:"."` 위험도 그대로이며 Hosting 격리 전 배포 금지.
- 커밋: 코드/test `5a7cbd7`, 문서 분리. 핸드오프 `docs/2026-07-28-spec-023-catalog-preview-projection-handoff.md`.

### QUESTIONS (구현하지 않고 보고)

1. **퍼센트 경계의 부동소수 edge:** §4의 "0..100 벗어나면 실패"를 **정확 비교**로 구현했다. IEEE754에서 `0.1 + 99.9 = 100.00000000000001`이므로 그런 저작값은 거부된다. 허용 오차를 임의로 만들지 않았다 — 필요하면 Codex가 tolerance를 명시해야 한다.
2. **builtin `full`의 콘텐츠 inset:** 레거시 `full`은 mat 영역이 아니라 `P=8`만큼 안쪽(`cx,cy,cw,ch`)에 사진을 그린다(`:3130`,`:3134`). 이번 output은 사각형 개수만 판정하고 rect를 반환하지 않으므로, 후속 앱 어댑터가 imageZone을 mat 전체로 쓸 경우 레거시와 8px 차이가 난다. 이번 스펙 범위 밖으로 두었다.
3. **`type` 빈 문자열 취급:** §4가 "알 수 없는 **non-empty** type"만 거부하도록 규정했으므로 `""`·`null`·부재를 사각으로 인정했다. 더 엄격하게 `"rect"`만 허용할지는 결정 필요.
4. **`frameThickness` "존재" 판정:** `undefined`만 부재로 보고 `null`은 존재-but-invalid로 처리해 실패시켰다. `null`을 부재로 볼지 결정 필요.
5. **실패 Result의 위치 정보:** §2의 error 형태가 `code`+`diagnostics`뿐이므로 실패한 zone의 `sourceIndex`를 노출하지 않는다(진단 코드 집합도 §6의 5종으로 제한). 실패 지점 index가 필요하면 계약 확장이 필요하다.
