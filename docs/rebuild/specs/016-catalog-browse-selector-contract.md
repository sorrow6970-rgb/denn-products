# 016 — 고객 카탈로그 탐색 selector 계약

## 목표 (WHY)

스펙 015가 메모리에 보유한 `CatalogDocumentV1`에서 고객 탐색에 필요한 모델·카테고리·사이즈·템플릿 선택지만 안전하게 추출하는 순수 selector 계약을 `@denn/shared`에 만든다.

레거시의 관계 규칙을 React 컴포넌트마다 다시 구현하지 않고 한 곳에 고정한다. 이번 단계는 데이터 관계와 질의 결과만 만들며 화면·이미지·Canvas는 구현하지 않는다.

## 범위 (SCOPE)

### 포함

- 모델 선택지
- 케이스 카테고리→케이스 템플릿 관계
- 액자 카테고리·사이즈→액자 템플릿 관계
- 레거시 액자 사이즈 별칭·전체 사이즈 규칙
- 원본 순서 보존
- reserved category·orphan relation·unsupported type·unknown size 진단
- UI에 원본 opaque 객체를 노출하지 않는 readonly view model
- 합성 fixture 기반 순수 unit/property-style 테스트

### 제외(하지 않을 것)

- `apps/mockup` 연결·React hook·화면·라우팅
- 상품 카드·이미지 URL 선택·thumbnail·preload
- Canvas·렌더링·텍스트 zone·시계/일반액자 필터
- 실제 카탈로그 GET·live 테스트·운영 데이터 사용
- 선택 상태·URL query·localStorage·Zustand
- 가격·재고·정렬 우선순위·검색·페이지네이션
- built-in 템플릿을 코드에서 새로 생성
- 데이터 수정·마이그레이션·write model
- 스펙 012 parser 또는 Catalog V1 구조 변경
- Firebase SDK/Auth/write·Rules·CORS·Hosting·배포

## 대상 (WHERE)

- `packages/shared/src/catalog/browse/*` 또는 동등한 하위 구조
- `packages/shared/src/catalog/index.ts`
- `packages/shared/src/catalog/**/*.test.ts`
- `docs/2026-07-23-spec-016-catalog-browse-selectors-handoff.md`

근거:

- `denn-mockup-tool.html` `init`, `templateFrameSizeKeys`, `templateMatchesCurrentFrameSize`, `buildFrameTplGrid`
- `denn-admin.html` case/frame category와 `categoryId` 필터
- 스펙 012 `CatalogDocumentV1`·원본 불변·unknown 보존
- 스펙 015 성공 document 메모리 보유 계약

## 구현 지시 (WHAT / HOW)

1. **기준선·가드**
   - `rebuild/modern-studio`, HEAD=origin, clean을 확인한다.
   - 운영 HTML·Firebase 설정/Rules·POC·PNG·두 앱의 기준 hash를 기록한다.
   - 실제 Firebase endpoint와 스펙 014 live 명령을 실행하지 않는다.

2. **공개 API**

   ```ts
   buildCatalogBrowseIndex(document: CatalogDocumentV1): CatalogBrowseIndex

   selectModels(index): readonly BrowseOption[]
   selectCaseCategories(index): readonly BrowseCategory[]
   selectCaseTemplates(index, { categoryId? }): readonly BrowseTemplate[]
   selectFrameCategories(index): readonly BrowseCategory[]
   selectFrameSizes(index): readonly BrowseSize[]
   selectFrameTemplates(index, { categoryId?, sizeId? }): readonly BrowseTemplate[]
   ```

   - 동등한 좁은 API는 허용한다.
   - selector는 IO·전역 상태·React·Firebase를 몰라야 한다.
   - 입력은 스펙 012를 통과한 `CatalogDocumentV1`만 받는다. parser를 내부에서 다시 호출하지 않는다.

3. **출력 view model**

   최소 의미:

   ```ts
   type BrowseOption = {
     readonly id: string;
     readonly label: string;
     readonly description?: string;
     readonly sourceIndex: number;
   };

   type BrowseCategory = BrowseOption & {
     readonly kind: "all" | "builtin" | "catalog";
   };

   type BrowseSize = BrowseOption & {
     readonly aspect?: number;
   };

   type BrowseTemplate = BrowseOption & {
     readonly kind: "builtin" | "uploaded" | "other";
     readonly categoryId?: string;
     readonly sizeScope: "all" | "restricted" | "unmatched";
   };
   ```

   - 원본 item·unknown field·image 값·zone·전체 path를 output에 포함하지 않는다.
   - `label`은 검증된 `name`, `description`은 문자열인 `sub`만 사용한다.
   - `aspect`는 유한 양수일 때만 포함한다.
   - 새 객체/배열로 만들되 대형 unknown 값·base64를 복제하지 않는다.
   - `readonly` 타입을 제공하고 selector가 원본을 수정하지 않는다.

4. **인덱스와 순서**
   - 각 collection의 원본 배열 순서를 그대로 유지한다.
   - 이름·ID 알파벳 정렬, locale 정렬, 인기순 정렬을 임의로 추가하지 않는다.
   - ID lookup과 질의가 필요하면 내부 `Map`을 사용할 수 있으나 public JSON/snapshot에 raw source를 넣지 않는다.
   - 같은 입력으로 반복 실행하면 deep-equal 결과가 나와야 한다.

5. **가상 카테고리**
   - UI 동작용 `all`은 selector가 반환하는 virtual category다.
   - 액자에는 레거시 근거가 있는 virtual `builtin` category를 추가할 수 있다.
   - virtual category는 `kind`로 구분하며 저장 데이터로 역직렬화하지 않는다.
   - catalog의 실제 category ID가 `all`/`builtin`과 충돌하면 실제 category를 별도 탭으로 노출하지 않고 `RESERVED_CATEGORY_ID` 진단을 남긴다.
   - 레거시 case 기본값에 들어 있는 `{id:"all"}`은 중복 “전체” 탭을 만들지 않는다.
   - selector가 `none` 또는 여섯 built-in frame template을 새로 생성하지 않는다. document에 있는 템플릿만 인덱싱한다.

6. **카테고리 관계**
   - category 미선택/`all`은 해당 template collection 전체를 원본 순서로 반환한다.
   - catalog category는 template의 문자열 `categoryId`와 **정확히 일치**할 때만 포함한다.
   - frame `builtin` category는 `type==="builtin"`만 포함한다.
   - frame catalog category는 레거시처럼 `type==="uploaded"`이면서 `categoryId`가 일치한 항목만 포함한다.
   - case template은 레거시처럼 type에 상관없이 `categoryId` 정확 일치로 필터한다.
   - categoryId가 없으면 “전체”에는 남고 특정 category에는 포함하지 않는다.
   - 존재하지 않는 categoryId 참조는 항목을 전체 목록에서 삭제하지 않고 `ORPHAN_CATEGORY_REFERENCE`로 진단한다.
   - 알 수 없는 filter categoryId를 호출하면 throw/fallback 전체 반환이 아니라 빈 결과를 반환한다.

7. **액자 template type**
   - `builtin`, `uploaded`는 각각 명시적 kind로 매핑한다.
   - 스펙 012가 warning으로 보존한 그 외 type은 `kind:"other"`와 `UNSUPPORTED_TEMPLATE_TYPE` 진단으로 유지한다.
   - `other`는 “전체” 질의에는 보존하되 `builtin`/catalog category 결과에는 포함하지 않는다.
   - unknown type을 uploaded로 추정하지 않는다.

8. **숨김 사이즈**
   - `frameSizes[].hideInMockup === true`는 레거시 `init` 근거에 따라 고객용 사이즈 선택지에서 제외한다.
   - false/누락은 표시한다. truthy 문자열 등을 true로 추정하지 않는다.
   - 숨김은 원본 삭제가 아니며 진단 오류로 세지 않는다.
   - 숨김 사이즈를 filter로 요청하면 알 수 없는 size와 동일하게 빈 결과를 반환한다.

9. **액자 사이즈 key 정규화**
   - key 정규화는 `String(value).trim().toLowerCase()`와 동등하게 하되 JSON scalar 문자열/유한 숫자만 받는다. 객체를 `"[object Object]"`로 만들지 않는다.
   - size 측 key:
     - `id`, `name`, `sub`, `sizeId`, `frameSizeId`
   - template 측 key:
     - `sizeId`, `frameSizeId`, `frameSize`, `targetSizeId`, `targetFrameSizeId`, `sizeKey`, `frameSizeKey`
     - 배열 `sizeIds`, `frameSizeIds`, `targetSizeIds`, `frameTargetSizeIds`
     - 객체 `size.{id,sizeId,frameSizeId,name,sub}`
   - 중복 key는 첫 순서를 보존해 제거한다.

10. **전체 사이즈 의미**
    - 다음은 `sizeScope:"all"`이다.
      - `type==="builtin"`
      - `allFrameSizes===true`
      - `sizeScope==="all"` 또는 `sizeMode==="all"`
      - template size key가 하나도 없음
      - key에 `__denn_all_frame_sizes__`, `__all_frame_sizes__`, `all`, `*`, `전체 사이즈 공용`, `전체사이즈공용` 중 하나가 있음
    - 명시 key가 있고 알려진 visible size 하나 이상과 매칭되면 `restricted`.
    - 명시 key가 있으나 어떤 visible size와도 매칭되지 않으면 `unmatched`와 `UNKNOWN_SIZE_REFERENCE` 진단.
    - size 미선택은 all/restricted/unmatched를 포함한 전체 template을 원본 순서로 반환한다.
    - size 선택 시 `all` 또는 해당 size와 key 교집합이 있는 `restricted`만 반환한다. `unmatched`는 반환하지 않는다.

11. **진단 계약**

   ```ts
   type CatalogBrowseDiagnosticCode =
     | "RESERVED_CATEGORY_ID"
     | "ORPHAN_CATEGORY_REFERENCE"
     | "UNSUPPORTED_TEMPLATE_TYPE"
     | "UNKNOWN_SIZE_REFERENCE"
     | "INVALID_DISPLAY_FIELD";

   type CatalogBrowseDiagnostic = {
     readonly code: CatalogBrowseDiagnosticCode;
     readonly collection: string;
     readonly sourceIndex: number;
   };
   ```

   - 안정적인 code·collection·sourceIndex만 둔다.
   - 실제 name·ID·URL·dataUrl·storagePath·unknown value/path를 message에 복사하지 않는다.
   - 진단은 중복 없이 결정적인 순서로 반환한다.
   - label/id가 런타임에서 예상과 달리 유효 문자열이 아니면 throw하지 말고 해당 option을 제외하고 `INVALID_DISPLAY_FIELD`를 남긴다. parser 계약이 정상이라면 발생하지 않는 방어선이다.
   - 관계 문제를 빈/default 성공으로 숨기지 않는다.

12. **불변성과 자원**
   - selector는 입력 객체·배열·item을 수정하거나 필드를 추가하지 않는다.
   - JSON stringify/parse 딥클론 금지.
   - base64·unknown extension을 순회·복제하지 않는다.
   - 인덱스 생성은 collection 전체 항목 수에 대해 선형 또는 합리적인 선형+key 처리여야 한다.
   - 개별 filter 호출 때 전체 CatalogDocument를 반복 딥스캔하지 않는다.

13. **필수 합성 fixture/test**
   - 실제 운영 데이터·스펙 014 응답 사용 금지.
   - models/categories/sizes/templates 원본 순서와 label/description
   - 입력 불변, 반복 실행 deep-equal, 결과에 raw item/image/unknown 0
   - case `all` reserved 중복 제거
   - category exact match, uncategorized는 all에만, orphan 진단
   - frame all/builtin/catalog category semantics
   - unknown type=other+진단, catalog category에서 제외
   - hidden size 제외
   - 모든 단일/배열/nested size alias
   - case/trim/lower normalization과 숫자 key
   - 모든 all-size flag/sentinel
   - restricted matching, unmatched 진단, unknown/hidden size query 빈 결과
   - malformed display 방어 진단
   - 진단 직렬화에 fixture의 secret name/id/path/base64 marker 없음
   - `@denn/shared`의 React/Firebase/다른 `@denn/*` 의존 0

14. **앱·운영 영향**
   - `apps/mockup`은 selector를 아직 import/call하지 않는다.
   - 스펙 015 UI·상태·reader request count·E2E를 그대로 유지한다.
   - 두 앱 build·E2E 회귀를 확인한다.
   - 실제 network, Firebase SDK/Rules/deploy는 `NOT APPLICABLE`이며 PASS로 꾸미지 않는다.

15. **문서·커밋**
   - 레거시 category/size 근거, public view model, all/restricted/unmatched 규칙, 진단 표를 보고한다.
   - 코드/test와 문서/핸드오프 커밋을 분리하고 `spec 016:` 접두사를 사용한다.
   - 스펙 하단 `### DONE (Claude)`에 변경·검증·미검증·위험을 append한다.
   - push 후 HEAD=origin, ahead/behind `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] frozen install, lockfile diff 0
- [ ] format/lint/typecheck/unit/build/e2e/check PASS
- [ ] 순수 selector, IO·React·Firebase 의존 0
- [ ] 원본 순서·불변·멱등 결과
- [ ] raw item·unknown·image/base64 복제 0
- [ ] case/frame category exact 관계와 reserved/orphan 진단
- [ ] hidden size 제외
- [ ] size alias·정규화·all sentinel 전체 테스트
- [ ] all/restricted/unmatched query 결과
- [ ] unknown type·unknown size·malformed display 진단
- [ ] 진단에 실제 값/path/base64 0
- [ ] 앱 import/call 0, 스펙 015 UI/E2E 무회귀
- [ ] 실제 Firebase GET·test:live:* 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 무변경
- [ ] Firebase SDK/Auth/write/Rules/CORS/Hosting/deploy 0
- [ ] HEAD=origin, ahead/behind 0/0, clean

## 완료 정의 (DONE)

- 검증된 Catalog V1에서 고객 탐색용 모델·카테고리·사이즈·템플릿 view를 순수하게 만든다.
- category와 frame-size 관계가 레거시 근거대로 한 곳에서 처리된다.
- reserved/orphan/unknown 관계는 조용히 유실되지 않고 안전 진단으로 관측된다.
- selector output은 UI에 필요한 최소 필드만 가지며 운영 원문·이미지·opaque 값을 복제하지 않는다.
- 앱 UI·실제 네트워크·Firebase·배포는 변경되지 않는다.

## 위험 (RISK)

- 레거시 사이즈 연결은 여러 별칭과 sentinel을 사용한다. 일부만 구현하면 특정 템플릿이 사라지므로 모든 근거 필드를 표 기반 테스트로 고정한다.
- `categoryId` 없는 템플릿은 전체에는 보이지만 특정 탭에는 보이지 않는다. 이를 임의 category로 배정하지 않는다.
- built-in 기본 템플릿은 런타임 코드에서 생성되기도 한다. 이번 selector는 CatalogDocument에 없는 항목을 만들지 않으므로 built-in 공급원은 후속 제품 스펙에서 별도로 결정한다.
- selector가 document 전체를 복제하면 base64 메모리가 급증할 수 있다. 최소 view만 생성하고 원본 참조를 output에 노출하지 않는다.
- 롤백은 코드/test와 문서 커밋을 역순 revert한다. Firebase·운영 롤백은 없어야 한다.

### QUESTIONS

- 없음. 실제 레거시 근거 밖의 모델→템플릿 직접 관계, 가격, 노출 우선순위가 필요해지면 임의 추론하지 말고 별도 스펙으로 남긴다.

### DONE (Claude) — 2026-07-23

**요약:** `@denn/shared`에 검증된 `CatalogDocumentV1`에서 고객 탐색 view를 만드는 **순수 selector**를 구현. category/frame-size 관계·레거시 별칭/sentinel·hidden size·all/restricted/unmatched·안전 진단을 한 곳에 고정. 앱 import/call 0, 실제 GET/live 0, 두 앱·운영본 무변경.

**변경 파일 (코드/test):**
- `packages/shared/src/catalog/browse/keys.ts` — `normalizeSizeKey`·`isAllSizeKey`·`ALL_SIZE_SENTINELS`·`sizeItemKeys`·`templateSizeKeys`.
- `.../browse/types.ts` — `BrowseOption/Category/Size/Template`·`CatalogBrowseDiagnostic(+code)`·`CatalogBrowseIndex`.
- `.../browse/build.ts` — `buildCatalogBrowseIndex`.
- `.../browse/select.ts` — 6 selectors.
- `.../browse/{index.ts}` 배럴, `packages/shared/src/catalog/index.ts`에서 `export * from "./browse"`.
- 테스트 3종(`keys/build/select`, 67 케이스).

**레거시 근거:** `frameSizeKey`(`String(v).trim().toLowerCase()`)·`isAllFrameSizeKey`·`templateFrameSizeKeys`·`currentFrameSizeKeys`(mockup L1120-1143), case/frame `categoryId` 필터, `hideInMockup`(mockup init). 스펙 §9의 array 별칭 `targetSizeIds`/`frameTargetSizeIds`는 레거시 2종(`sizeIds`/`frameSizeIds`)의 확장으로 스펙 계약대로 포함. 근거 밖 모델→템플릿 관계·가격·우선순위는 만들지 않음.

**public view model:** `id`(검증 string)·`label`(검증 `name`)·`description`(문자열 `sub`만)·`sourceIndex`, category `kind`(all/builtin/catalog), size `aspect`(유한 양수만), template `kind`(builtin/uploaded/other)·`categoryId?`·`sizeScope`. **원본 item·unknown·image/base64·zone·path를 output/diagnostic에 복제하지 않음**(직렬화 검사로 고정).

**all/restricted/unmatched(§10):** `type==="builtin"` / `allFrameSizes===true` / `sizeScope|sizeMode==="all"` / size key 없음 / all-sentinel key → **all**. 명시 key가 visible size와 매칭 → **restricted**. 명시 key인데 매칭 0 → **unmatched** + `UNKNOWN_SIZE_REFERENCE`. size 미선택=all/restricted/unmatched 전체, size 선택=all + 교집합 restricted(unmatched 제외), hidden/unknown size 질의=빈 결과.

**진단 표:** `RESERVED_CATEGORY_ID`(catalog id가 `all`/frame `builtin` 충돌, 별도 탭 미노출·중복 없음), `ORPHAN_CATEGORY_REFERENCE`(존재하지 않는 categoryId 참조, 전체 목록엔 유지), `UNSUPPORTED_TEMPLATE_TYPE`(그 외 type 문자열→kind other, builtin/catalog 결과 제외), `UNKNOWN_SIZE_REFERENCE`, `INVALID_DISPLAY_FIELD`(id/name 무효 시 option 제외). code/collection/sourceIndex만, 중복 제거·결정적 순서(collection→sourceIndex→code). 실제 값/path/base64 없음.

**불변/멱등/성능:** 입력 deep-freeze에서 성공+원본 무변경, 반복 실행 deep-equal, JSON 딥클론 없음, unknown/base64 미순회, 인덱스 1회 생성 후 filter는 사전계산 entry에 대해 선형.

**검증 결과(Node 24.18.0 / pnpm 11.15.1):** frozen install lock diff **0**(shared package.json 무변경) · format/lint/typecheck PASS · **unit 184**(browse 67 신규) · build 독립 · **e2e 11**(스펙 015 무회귀) · check PASS. `@denn/shared` React/Firebase/`@denn/*` 의존 0, IO 0, 앱 import/call 0. 실제 Firebase GET·`test:live:*` 미실행. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**두 앱 소스 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, 신규 의존성 0.

**미검증/위험:** built-in 템플릿 공급원은 이번 selector 범위 밖(후속 제품 스펙). 합성 fixture만 사용(실 운영·스펙 014 응답 미사용). 모델→템플릿 직접 관계·가격·정렬 우선순위는 근거 없어 미구현.

### 종료 대기 — Codex 재검증

- 다음: Codex 스펙 016 재검증 대기. 다음 기능 미착수.
