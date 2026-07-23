# 012 — 레거시 카탈로그 읽기 계약·정규화·fixture

## 목표 (WHY)

신규 리빌드가 기존 `S`/`ADM` 카탈로그를 화면과 렌더러에서 임시 보정하지 않고, `@denn/shared`의 단일 경계에서 안전하게 읽도록 한다.

이번 스펙은 운영 데이터를 옮기거나 저장하는 마이그레이션이 아니다. 저장소에 포함된 레거시 기본 구조와 합성 fixture만으로 입력 검증, 순수 정규화, 오류·경고 보고, 원본 불변성을 자동검증하여 이후 Firebase 읽기와 Canvas 구현의 데이터 기반을 마련한다.

## 범위 (SCOPE)

### 포함

- `@denn/shared`의 카탈로그 타입과 런타임 읽기 경계
- 버전 없는 레거시 입력(`legacy-v0`) 판별
- 신규 내부 읽기 모델 `CatalogDocumentV1`(`schemaVersion: 1`)
- 최소 공통 영역: `brand`, `models`, case/frame categories·templates, `frameSizes`, `frameColors`, `frameThickness`, `clockSettings`, `customFonts`, case/frame mockup, `guideBackgrounds`, `watermark`
- 레거시 flat `roomBackgroundSettings`
- `__opRev`, `__cloudRev`, `__publishedAt`
- `dataUrl`·`storagePath` 이미지 참조 분류
- 합성 정상/오류 fixture
- 오류·경고·통계 보고, 원본 불변·결정성·V1 재입력 검증

### 제외(하지 않을 것)

- 실제 `backup.json`, 고객·운영 데이터, Firebase 운영 데이터 열람·복사·커밋
- localStorage, IndexedDB, 파일 선택기, 네트워크, Firebase SDK 연결
- 운영/개발 경로 쓰기, 앱 시작 시 자동 변환·저장
- 레거시 `denn-*.html` 수정 또는 내부 함수 import
- 카탈로그 편집 UI·앱 연결·Canvas·이미지 다운로드·CORS 실검증
- flat room 설정을 목표 `roomSettings.operator/user`로 변환
- `space-scene-v1`, 주문 데이터 파싱
- base64 외부화·업로드·원본 삭제
- Firebase Rules·Hosting·배포
- Zod 등 런타임 스키마 의존성
- 신규 영속 포맷 write serializer

## 대상 (WHERE)

- `packages/shared/src/catalog/*` 또는 동등한 책임 구조
- `packages/shared/src/index.ts`
- `packages/shared/src/**/*.test.ts`
- `packages/shared/test-fixtures/catalog/*` 또는 동등한 fixture 위치
- 검증에 꼭 필요한 기존 테스트 설정

읽기 근거:

- `docs/rebuild/00-legacy-analysis.md` §4, §7
- `docs/codex-claude-handoff/decisions/2026-07-21-data-compatibility-and-migration.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`
- `denn-admin.html` 최초 `DEF`/`load`와 후속 필드 보강 코드
- `denn-mockup-tool.html`의 `ADM` 소비 경로

레거시 HTML은 읽기 전용 근거다. 신규 패키지에서 호출·import하지 않는다.

## 구현 지시 (WHAT / HOW)

1. **기준선·운영 가드**
   - `rebuild/modern-studio`, HEAD=origin, clean을 확인한다.
   - 운영 HTML, Firebase 설정/Rules, POC, PNG의 기준 hash를 기록하고 종료 시 무변경을 확인한다.
   - 실제 고객 이름·연락처·사진·시안 토큰·비밀번호·운영 백업을 저장소에 추가하지 않는다.

2. **공개 API와 의존성**
   - `@denn/shared`는 다른 `@denn/*`, React, Firebase에 의존하지 않는다.
   - 타입, guard/normalizer, 오류 코드, 보고서 타입을 책임별로 분리하고 `src/index.ts`에서 명시적으로 export한다.
   - 다음 책임을 분리한다. 이름은 동등하게 더 명확히 조정할 수 있다.

     ```ts
     readLegacyCatalog(input: unknown): CatalogReadResult
     isCatalogDocumentV1(input: unknown): input is CatalogDocumentV1
     ```

   - 정상 제어 흐름에서 throw하지 않고 성공/실패가 구분되는 `Result` 계열을 반환한다.
   - 실패 시 기본 카탈로그를 성공값으로 반환하지 않는다.

3. **버전 계약**
   - 버전 없는 `S`/`ADM` 입력은 `sourceVersion: "legacy-v0"`로 기록한다.
   - 성공 출력은 다음 의미의 wrapper로 제한한다.

     ```ts
     type CatalogDocumentV1 = {
       schemaVersion: 1;
       migratedFrom: "legacy-v0";
       data: CatalogV1;
     };
     ```

   - `migratedAt`은 넣지 않는다. 실행 시각이 결정성을 깨면 안 된다.
   - V1은 신규 내부 읽기 모델이며 Firebase 저장·운영 write 승인을 뜻하지 않는다.
   - V1 재입력은 검증 후 동등한 결과여야 하며 중첩 wrapper를 만들지 않는다.
   - 지원하지 않는 `schemaVersion`은 추정하지 않고 `UNSUPPORTED_SCHEMA_VERSION` 실패로 반환한다.

4. **필드 모델링**
   - 레거시에서 확인된 필드만 타입에 넣고 근거 없는 enum·필수값·기본값을 만들지 않는다.
   - 소비에 필수인 `id`, `name`은 존재와 타입을 검증한다.
   - 선택 필드는 누락 가능성을 타입으로 표현한다.
   - `frameTemplate.type`의 미확인 문자열을 강제로 거부하지 않는다. known value를 구분하되 unknown 문자열은 경고와 함께 보존한다.
   - zone/clock/mockup 등 세부 계약이 후속 렌더 스펙에 속하는 객체는 JSON-safe opaque/extensions로 보존한다.
   - 함수, DOM 객체, `Blob`, 순환 참조처럼 JSON 카탈로그가 될 수 없는 값은 거부한다.

5. **정규화**
   - 루트는 null이 아닌 plain object여야 한다.
   - collection은 배열이어야 하며 잘못된 타입을 빈 배열로 바꾸지 않는다.
   - 최초 `DEF` 근거로 누락 가능한 최상위 collection만 명시적 default로 보강하고 `defaultsApplied`에 경로를 기록한다.
   - 문자열은 보존한다. 표시 편의를 위한 trim·번역·대소문자 변경을 하지 않는다. 빈 ID는 오류다.
   - 숫자는 finite 여부를 검사한다. 크기·비율·두께처럼 양수여야 하는 필드의 0/음수/`NaN`/무한대를 거부한다.
   - 같은 collection의 중복 ID는 오류이며 마지막 값 우선으로 덮지 않는다.
   - 배열 순서와 `null`/누락 차이를 근거 없이 바꾸지 않는다.
   - 원본 object/array를 mutate하지 않는다.

6. **이미지 참조**
   - 최소 다음을 구분한다.

     ```ts
     type LegacyImageReference =
       | { kind: "none" }
       | { kind: "data-url"; dataUrl: string }
       | { kind: "storage-path"; storagePath: string }
       | { kind: "dual"; dataUrl: string; storagePath: string };
     ```

   - `dataUrl`은 문자열과 `data:` 스킴까지만 검사한다. 디코딩·MIME·크기·CORS는 후속 스펙이다.
   - `storagePath`는 문자열로 보존하되 `javascript:` 같은 URL 스킴을 Storage path로 받지 않는다.
   - 둘 다 있으면 하나를 버리지 않고 `dual`로 보고한다.
   - fetch, 디코딩, 업로드를 하지 않는다.

7. **unknown 보존과 보고서**
   - unknown 필드를 조용히 버리지 않는다. JSON-safe 값을 `extensions` 또는 동등한 명시적 컨테이너에 경로별로 보존한다.
   - 최소 보고서:

     ```ts
     type CatalogReadReport = {
       sourceVersion: "legacy-v0" | "catalog-v1";
       defaultsApplied: string[];
       warnings: CatalogIssue[];
       unknownPaths: string[];
       counts: Record<string, number>;
       imageReferences: { dataUrl: number; storagePath: number; dual: number };
     };
     ```

   - issue는 안정적인 `code`와 `path`를 포함한다. 원문 고객 데이터·base64·토큰을 message/log에 복사하지 않는다.
   - warning과 fatal을 구분하고 fatal이 하나라도 있으면 전체 성공으로 표시하지 않는다.

8. **fixture**
   - 실제 운영 export를 사용하지 않는다.
   - 최소 fixture:
     - `DEF` 근거 최소 legacy-v0
     - 허용된 누락 필드와 defaults 보고
     - dataUrl/storagePath/dual
     - flat `roomBackgroundSettings`
     - 리비전 필드
     - unknown top-level/nested JSON-safe 필드
     - 중복 ID, collection 타입 오류, 비정상 숫자, 위험한 storage path
     - 지원하지 않는 version, 함수·순환 참조
   - 실제 사진 base64 대신 짧은 합성 문자열만 사용한다.
   - 실제처럼 보이는 이름·전화번호·토큰을 넣지 않는다.

9. **테스트**
   - 동일 입력을 두 번 읽으면 출력과 보고서가 동일해야 한다.
   - deep-freeze 입력에서도 성공하고 전후 deep equality가 유지돼야 한다.
   - legacy→V1 후 V1 재입력이 동등해야 한다.
   - unknown/extensions와 배열 순서가 유지돼야 한다.
   - 오류 fixture는 정해진 code/path로 실패하고 기본값 성공으로 둔갑하지 않아야 한다.
   - collection·이미지 참조 count가 보고서와 일치해야 한다.
   - 테스트 중 fetch, Firebase, localStorage, IndexedDB, 파일 쓰기가 발생하지 않아야 한다.

10. **앱 영향**
    - 이번 스펙에서 두 앱은 새 파서를 호출하지 않는다.
    - UI·라우팅·상태·Canvas와 연결하지 않는다.
    - 앱 bundle과 E2E가 기준선에서 비정상적으로 변하지 않아야 한다.

11. **문서·커밋**
    - 실제 확인 필드와 의도적으로 opaque/extensions로 남긴 영역을 보고서에서 구분한다.
    - 이 스펙 하단 `### DONE (Claude)`에 변경 파일, fixture, 오류 코드, 결과, 미검증, 위험을 append한다.
    - 코드/fixture/test와 문서/핸드오프 커밋을 분리하고 `spec 012:` 접두사를 사용한다.
    - push 후 HEAD=origin, ahead/behind `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] frozen install 성공, lockfile diff 0
- [ ] format / lint / typecheck / test / build / e2e / check 통과
- [ ] legacy-v0 성공 fixture와 V1 재입력 검증
- [ ] deep-freeze·불변성·결정성
- [ ] defaults 경로 보고 일치
- [ ] unknown top-level/nested 보존 및 경고
- [ ] collection 순서·개수·중복 ID
- [ ] dataUrl/storagePath/dual count와 원문 참조 보존
- [ ] flat room 설정·리비전 보존
- [ ] unsupported version·잘못된 collection/숫자/path/JSON 입력 실패
- [ ] 실패 결과에 민감 원문/base64 없음
- [ ] 앱에서 파서 사용 0, 네트워크·브라우저 저장소·파일 쓰기 0
- [ ] `@denn/shared`의 다른 `@denn/*`·React·Firebase 의존 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 무변경, deploy 0

## 완료 정의 (DONE)

- `@denn/shared`에 레거시 카탈로그 단일 public read boundary가 존재한다.
- legacy-v0와 Catalog V1을 구분하고 미지원 버전을 거부한다.
- 성공 시 알려진 필드, extensions, 리비전, 이미지 참조와 읽기 보고서를 반환한다.
- 잘못된 입력은 기본값으로 덮지 않고 code/path가 있는 실패가 된다.
- 원본 불변·결정성·V1 재입력·unknown 보존이 자동검증된다.
- 운영 데이터·Firebase·앱 기능·배포는 건드리지 않는다.

## 위험 (RISK)

- 레거시는 같은 개념을 여러 형태로 가진다. 근거가 약한 중첩 구조를 억지로 통합하지 않고 extensions로 남긴다.
- 합성 fixture는 실제 약 35MB 백업의 모든 변형을 대표하지 못한다. 실제 샘플은 개인정보 제거·사용자 승인·읽기 전용 절차를 갖춘 별도 스펙에서 검증한다.
- V1은 내부 읽기 모델이지 write/cutover 계약이 아니다.
- unknown 보존은 메모리를 늘릴 수 있다. 이번에는 정확성을 우선하고 대용량 성능은 익명화 fixture 확보 후 측정한다.
- 롤백은 스펙 012 코드/fixture/test와 문서 커밋을 역순 revert한다. 운영/Firebase 롤백은 없어야 한다.

### QUESTIONS

- 없음. 실제 근거 없이 필드를 필수화하거나 여러 형태를 합쳐야 한다면 임의 결정하지 말고 해당 경로·관측 형태·선택지를 기록하고 대기한다.

### DONE (Claude) — 2026-07-23

**요약:** `@denn/shared`에 legacy-v0 `S`/`ADM` 카탈로그(또는 Catalog V1 wrapper)를 내부 읽기 모델 `CatalogDocumentV1`으로 검증·정규화하는 **단일 read boundary**를 구현. 순수·결정적·부작용 없음(원본 불변). 운영 데이터·Firebase·앱·Canvas·배포 무변경, 신규 의존성 0.

**변경 파일 (코드/fixture/test):**
- `packages/shared/src/catalog/json.ts` — `JsonValue`/`JsonObject`, `isPlainObject`, `cloneJsonSafe`(원본 비변형 JSON-safe 딥클론; 함수·심볼·bigint·비평범객체(Date/Map/Blob/DOM)·순환 거부).
- `packages/shared/src/catalog/types.ts` — `CatalogV1`(known 필드 뷰), `CatalogItemV1`, `CatalogDocumentV1`, `LegacyImageReference`, `CatalogIssue`/`CatalogIssueCode`, `CatalogReadReport`, `CatalogReadResult`.
- `packages/shared/src/catalog/read.ts` — `readLegacyCatalog(input): CatalogReadResult`, `isCatalogDocumentV1`.
- `packages/shared/src/catalog/index.ts` — 카탈로그 public 배럴.
- `packages/shared/src/index.ts` — `export * from "./catalog"`.
- `packages/shared/src/catalog/fixtures/index.ts` — 합성 fixture(실제 데이터·PII·실제 base64 없음). 함수/순환은 팩토리.
- `packages/shared/src/catalog/read.test.ts` — 계약 테스트.

**모델링 근거(실제 확인 vs opaque):**
- 실제 확인 필드(denn-admin.html `DEF` L846 + legacy-analysis §4): `brand`, `models{id,name,w,h,…}`, `caseCategories`, `caseTemplates`, `frameTemplates{id,name,type,dataUrl,storagePath,…}`, `frameCategories`, `frameSizes{id,name,aspect,…}`, `frameColors`, `frameThickness`, `clockSettings`, `customFonts`, `caseMockup`, `frameMockup`, `guideBackgrounds{id,dataUrl,storagePath,…}`, `watermark`, flat `roomBackgroundSettings`, `__opRev`/`__opRevAt`/`__cloudRev`/`__publishedAt`.
- **의도적 opaque/보존(후속 렌더 스펙 소관):** zone/clock/mockup 등 아이템 내부 세부 객체와 known 컨테이너의 추가 필드는 검증하지 않고 그대로 보존한다.
- **id/name:** 모든 아이템 `id`(비어있지 않은 string) 검증. `name`(string)은 DEF 인스턴스가 name을 가진 컬렉션에만 요구(`models`·`caseCategories`·`frameCategories`·`frameTemplates`·`frameSizes`·`frameColors`). `guideBackgrounds`·`caseTemplates`·`customFonts`는 name 근거 없어 **요구하지 않음**.
- **frameTemplate.type known 값** = `{builtin, uploaded}`(레거시 `type:'…'`·`.type===` grep 근거). 그 외 문자열은 **거부하지 않고 경고+보존**(`UNKNOWN_FRAME_TEMPLATE_TYPE`).
- **양수 숫자 검증**: `frameThickness`·`frameSizes[].aspect`·`models[].w`·`models[].h`(present일 때 finite>0, 아니면 `INVALID_NUMBER`).
- 근거 없이 enum·필수값·기본값을 만들지 않았고, 여러 형태를 억지로 통합하지 않았다(QUESTIONS 불필요).

**unknown/보고 설계:** unknown **top-level** 키는 제자리 보존 + `unknownPaths`·`UNKNOWN_FIELD` 경고. unknown 키의 nested 값(객체/배열)은 통째로 보존(라운드트립으로 검증). known 컨테이너 내부의 추가 필드는 §4 지시대로 opaque 보존(개별 열거 안 함). `defaultsApplied`는 누락된 최상위 collection을 빈 배열로 보강한 경로만 기록(내용 위조 없음).

**오류 코드(fatal / warning):**
- fatal: `ROOT_NOT_OBJECT`, `UNSUPPORTED_SCHEMA_VERSION`, `MALFORMED_V1_DOCUMENT`, `NON_JSON_VALUE`, `CIRCULAR_REFERENCE`, `COLLECTION_NOT_ARRAY`, `ITEM_NOT_OBJECT`, `MISSING_ID`, `INVALID_ID`, `MISSING_NAME`, `INVALID_NAME`, `DUPLICATE_ID`, `INVALID_NUMBER`, `UNSAFE_STORAGE_PATH`(`javascript:`/`vbscript:` 스킴 거부).
- warning: `UNKNOWN_FIELD`, `UNKNOWN_FRAME_TEMPLATE_TYPE`, `INVALID_DATA_URL`(문자열이나 `data:` 스킴 아님), `INVALID_REVISION`.
- issue는 `{code, path}`만 — 원문 고객 데이터·base64·토큰을 담지 않는다(테스트로 고정).

**이미지 참조:** `frameTemplates`·`caseTemplates`·`guideBackgrounds` 아이템의 `dataUrl`/`storagePath`를 `none|data-url|storage-path|dual`로 분류. 둘 다 있으면 `dual`(하나 버리지 않음). `dataUrl`은 문자열+`data:` 스킴만 검사(디코딩·MIME·CORS는 후속). fetch/업로드 없음.

**검증 결과(Node 24.18.0 / pnpm 11.15.1):** frozen install lock diff **0**(shared package.json 무변경) · format/lint/typecheck PASS · **unit 50/50**(catalog 24 신규: 결정성·deep-freeze 불변성·legacy→V1 재입력 동등·unknown 보존·이미지 count·오류 code/path fixture) · build 독립(JS gzip ≈61.09KB) · **e2e 4/4**(앱 무변경) · check PASS. `@denn/shared`의 React/Firebase/다른 `@denn/*` 의존 **0**, IO(fetch/localStorage/IndexedDB) **0**, 앱 파서 사용 **0**. 운영 HTML·Firebase 설정/Rules·`poc/**`·디자인 PNG **UNCHANGED**, deploy 0.

**미검증/위험:**
- 합성 fixture는 실제 ~35MB 백업의 모든 변형을 대표하지 못한다. 실제 샘플 검증은 개인정보 제거·사용자 승인·읽기 전용 절차를 갖춘 별도 스펙.
- V1은 **내부 읽기 모델**이며 Firebase 저장/운영 write/cutover 계약이 아니다.
- flat `roomBackgroundSettings`는 목표 `roomSettings.operator/user`로 **변환하지 않고** 보존만 한다(후속 스펙).
- unknown 보존은 메모리를 늘릴 수 있음(정확성 우선, 대용량 성능은 익명화 fixture 후 측정).

### DONE (Claude) — 2026-07-23 재검증 보완 (기준 HEAD 32eab2e → aae7187)

Codex "수정 후 재검증" 4건만 보완. 컴포넌트 API 축소/토큰/앱 구조 변경 없음, 신규 의존성 0.

1. **`isCatalogDocumentV1` 얕은 guard 강화** — `input`이 plain object이고 **정확히 3키**(`schemaVersion:1`, `migratedFrom:"legacy-v0"`, plain-object `data`)일 때만 true. 추가 키·잘못된 필드·비객체 `data`·다른 version·비객체 입력은 false. 읽기 경로의 V1 감지에는 영향 없음(감지는 `schemaVersion` 존재로 별도 수행).
2. **nested unknown 보존·경고 + 명시적 타입 계약** — known 객체(`brand`/`clockSettings`/`watermark`)와 known 아이템(`models`/`caseCategories`/`frameCategories`/`frameSizes`/`frameColors`/`frameTemplates`, 근거 DEF L846-856)의 **추가 필드를 nested `unknownPaths`+`UNKNOWN_FIELD` 경고로 보고하고 제자리 보존**한다. 명시적 타입 계약 = `report.extensions: CatalogExtensions`(= `Record<path, JsonValue>`), 경로별 보존값을 타입으로 노출. 스키마 근거 없는 컬렉션(`caseTemplates`/`guideBackgrounds`/`customFonts`)과 더 깊은 중첩은 §4대로 opaque(과잉 필수화 방지).
3. **non-finite 거부** — `cloneJsonSafe`가 NaN/±Infinity를 트리 어디서든(unknown/extensions 포함) `NON_FINITE_NUMBER`로 거부(JSON 라운드트립·결정성 보호). 유한 0/음수는 여전히 필드 단위 `INVALID_NUMBER`.
4. **카탈로그 전체 이미지 순회·집계 + 모든 URL scheme 거부** — 클론 전체를 재귀 순회해 **어느 깊이의** `dataUrl`/`storagePath`든 분류·집계(예: `watermark.dataUrl`, 중첩 `editorOverlayImages[].storagePath`). `storagePath`는 **선행 URI scheme이 있으면 전부**(`javascript:`뿐 아니라 `https:` 등) `UNSAFE_STORAGE_PATH`로 거부(스토리지 경로는 상대경로여야 함). `dataUrl`은 `data:` 스킴만 유효, 그 외 문자열은 `INVALID_DATA_URL` 경고.

**추가 fixture/test:** guard accept/reject, nested-unknown extensions, 전체 카탈로그 이미지 집계(watermark+중첩 overlay), `https:` storagePath 거부, unknown 내부 NaN 거부, known 필드 Infinity 거부.

**재검증 결과(Node 24.18.0 / pnpm 11.15.1):** frozen install lock diff **0**(shared package.json 무변경) · format/lint/typecheck PASS · **unit 57/57**(catalog 31) · build 독립(JS gzip ≈61.09KB) · **e2e 4/4**(앱 무변경) · check PASS. `@denn/shared`의 React/Firebase/다른 `@denn/*` 의존 0, IO 0, 앱 파서 사용 0. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0. 코드 커밋 `aae7187` / 문서 커밋 분리.

**주의(설계 결정):** URL scheme을 가진 `storagePath`(예: 전체 `https://` 다운로드 URL)는 이제 fatal이다. 레거시에 그런 값이 있으면 별도 스펙에서 URL 필드 분리·정규화로 다룬다(이번엔 Codex 지시대로 전부 거부).

### DONE (Claude) — 2026-07-23 재검증 보완 2 (기준 HEAD b85810a → fba378b)

Codex "수정 후 재검증" 2건(3건 승인, 2건 보완).

1. **`isCatalogDocumentV1` 실제 deep contract 검사** — 3키 shell 검사에 더해 **`readLegacyCatalog(input).ok`를 재사용**한다. 따라서 `{schemaVersion:1, migratedFrom:"legacy-v0", data:{models:"invalid"}}`처럼 read가 fatal로 판단하는 V1은 guard도 **false**. collection 타입·non-finite nested·unsafe storagePath·item id/name 등 규칙이 **한 곳(read)**에서만 정의돼 갈라지지 않는다. 순환 없음(`readLegacyCatalog`는 guard를 호출하지 않음). 정상 V1은 계속 true.
2. **storagePath scheme 선행 공백 우회 차단** — scheme 검사 시 **검사값만 `trimStart`**(원본 보존)하여 `" https://…"`·`"\tjavascript:…"`도 `UNSAFE_STORAGE_PATH`로 실패한다. `dataUrl`의 `data:` 검사도 동일하게 trim된 값으로 수행.
3. **경로 leading-dot 방지** — `joinPath(base, seg)` helper 도입(`base===""`면 seg만). 이미지 issue 경로·자식 재귀 모두 사용 → 루트 객체에 직접 `storagePath`가 있으면 오류 path는 `".storagePath"`가 아니라 정확히 `"storagePath"`. 중첩 경로는 그대로(`frameTemplates[0].storagePath`).

**추가 fixture/test:** guard deep-contract false(malformed collection·non-finite nested·unsafe storagePath) + 정상 V1 true, `" https://"`·`"\tjavascript:"` storagePath 거부, 루트 storagePath 오류 path=`"storagePath"`(no leading dot).

**재검증 결과(Node 24.18.0 / pnpm 11.15.1):** frozen install lock diff **0** · format/lint/typecheck PASS · **unit 61/61**(catalog 35) · build 독립(JS gzip ≈61.09KB) · **e2e 4/4**(앱 무변경) · check PASS. shared React/Firebase/`@denn/*` 의존 0, IO 0, 앱 파서 0, 신규 의존성 0. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0. 코드 커밋 `fba378b` / 문서 커밋 분리.

### 종료 — Codex 최종 승인 (2026-07-23)

- **판정: 승인 가능. 승인 기준 HEAD `a6fd990`.** 스펙 012 종료.
- 게이트 최종: frozen diff 0 / format·lint·typecheck / unit 61 / build 독립 / e2e 4 / check PASS. `@denn/shared`의 React/Firebase/`@denn/*` 의존 0·IO 0·앱 파서 0·신규 의존성 0, 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG 무변경, deploy 0.
- 유지(종료 시점 사실):
  - **합성 fixture만** 검증됨.
  - 실제 약 **35MB 운영 백업(`backup.json`)은 아직 검증하지 않음** — 개인정보 제거·사용자 승인·읽기 전용 절차를 갖춘 별도 스펙.
  - **Catalog V1은 내부 읽기 모델**이며 write/cutover 승인이 아님.
  - flat `roomBackgroundSettings`는 **보존만** 하며 `roomSettings.operator/user`로 변환하지 않음(후속 스펙).
  - Firebase·앱·Canvas·운영 데이터·배포 무변경.
- 다음: Codex 다음 스펙 대기. 기능 구현 미착수.
