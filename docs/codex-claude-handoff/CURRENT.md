# 현재 상태

상태: **🟡 스펙 017 모바일 우선 고객 카탈로그 탐색 UI = READY. 케이스/액자 단계형 텍스트 선택만 구현하며 이미지·Canvas·저장·주문·실제 GET·배포는 미착수.**

> 스펙 017(2026-07-27): `docs/rebuild/specs/017-mobile-catalog-browse-ui.md`. 스펙 015 ready document와 스펙 016 selector를 `apps/mockup`에 연결한다. 제품 유형을 먼저 고르고 케이스는 모델→카테고리→템플릿, 액자는 사이즈→카테고리→템플릿으로 진행한다. 모델→템플릿 직접 관계는 근거가 없어 필터하지 않는다. 순수 ID reducer로 상위 선택 변경 시 하위 선택을 명시적으로 reset하고, 빈 collection/filter와 browse diagnostics는 가짜 기본값 없이 안전 안내한다. 모바일 320px부터 desktop·landscape의 overflow/44px/keyboard/focus/axe를 합성 route E2E로 검증한다. 실제 4환경·200% 확대는 NOT TESTED로 남긴다. 이미지·Canvas·업로드·저장·주문·Router/Zustand·실제 GET·Firebase/배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 016 = **승인 가능**(기준 HEAD `d7fc334`). `@denn/shared` 순수 browse selector(`buildCatalogBrowseIndex`+6 selectors) 확립. 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 184**(browse 67) / build 독립 / e2e 11(스펙 015 무회귀) / check PASS. **유지: 고객 탐색용 모델·카테고리·사이즈·템플릿 selector 계약 완료, `categoryId` 정확 일치, 레거시 size alias·전체 사이즈 sentinel 전부 반영, reserved/orphan/unknown은 안전 진단으로 보존, raw item·unknown·이미지·base64는 output에 없음, built-in 템플릿 미생성, 모델→템플릿 직접 관계·가격·노출 우선순위 미확정, 합성 fixture만 검증, 앱 UI 연결·Canvas·실제 네트워크·Firebase·배포 미착수.** **다음 스펙·기능 미착수(대기).**

> 스펙 016 구현 완료(로컬, 2026-07-23): `@denn/shared`에 순수 browse selector(`buildCatalogBrowseIndex` + `selectModels/CaseCategories/CaseTemplates/FrameCategories/FrameSizes/FrameTemplates`). 검증된 `CatalogDocumentV1`에서 고객 탐색 view만 추출(IO/React/Firebase/전역상태 0). `categoryId` 정확 일치, virtual `all`(case+frame)·`builtin`(frame), reserved id 충돌→`RESERVED_CATEGORY_ID`(중복 탭 없음). frame-size key 레거시 전 별칭(single 7·array 4·nested 5, `String(v).trim().toLowerCase()`·scalar string/finite number만) + all flag/sentinel/no-key→all·매칭→restricted·명시무매칭→unmatched+`UNKNOWN_SIZE_REFERENCE`. `hideInMockup===true` 제외(진단 아님), hidden/unknown size 질의→빈 결과. type builtin/uploaded/other(other=진단+전체에만), orphan categoryId→`ORPHAN_CATEGORY_REFERENCE`(전체 유지), id/name 무효→option 제외+`INVALID_DISPLAY_FIELD`. output=최소 readonly view(원본/unknown/image/base64/path 미복제), 진단 code/collection/sourceIndex만·결정적·중복 제거. 원본 순서·입력 불변(deep-freeze)·멱등(deep-equal), JSON 딥클론/ base64 순회 없음, built-in 템플릿 미생성. 게이트: frozen diff 0(shared package.json 무변경)/format·lint·typecheck/**unit 184**(browse 67 신규: 표 기반 key·sentinel·진단·all/restricted/unmatched·leak 0)/build 독립/**e2e 11**(스펙 015 무회귀)/check PASS. `@denn/shared` React/Firebase/`@denn/*` 의존 0, IO 0, 앱 import/call 0, 실제 GET·`test:live:*` 미실행. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**두 앱 소스 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, 신규 의존성 0. 코드/test 커밋과 문서 커밋 분리. 핸드오프 `docs/2026-07-23-spec-016-catalog-browse-selectors-handoff.md`, DONE는 스펙 하단. **유지: built-in 템플릿 공급원·모델→템플릿 직접 관계·가격·정렬 우선순위는 근거 없어 미구현(후속 스펙), 합성 fixture만.**

> 스펙 016(2026-07-23): `docs/rebuild/specs/016-catalog-browse-selector-contract.md`. 스펙 015가 메모리에 보유한 Catalog V1에서 고객 탐색용 최소 view를 만드는 순수 selector 계약이다. case/frame `categoryId` 정확 관계, frame size의 레거시 단일·배열·nested 별칭과 전체 사이즈 sentinel, hidden size, all/restricted/unmatched를 중앙화한다. reserved category·orphan relation·unknown type/size는 조용히 삭제하지 않고 값/path 없는 안전 진단으로 남긴다. 원본 순서·불변·멱등을 지키며 raw item·unknown·이미지/base64를 output에 복제하지 않는다. 앱 import/call·UI·실제 Firebase GET·live 명령·Firebase/배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 015 = **승인 가능**(기준 HEAD `6951685`). `apps/mockup` mount 시 스펙 013 공개 reader로 카탈로그 1회 read하는 최소 연결 셸(loading/ready/error/수동 retry). 재검증 보완(검증 2건: StrictMode+실제 reader 병합 통합 테스트·고정 sleep 제거) 반영. 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 117** / build 독립(mockup JS gzip 64.40KB) / **e2e 11**(admin 2+mockup 9) / check PASS. **유지: loading/ready/error/수동 retry 흐름 완료, StrictMode `start()→detach()→start()`에서 underlying fetch 1회(첫 caller REQUEST_ABORTED·두 번째 caller OK·최종 ready), 자동 retry/polling/persistent cache 없음, 성공 document는 메모리에만, 상품 탐색·Canvas·이미지·선택·저장·주문 미착수, 실제 endpoint 재요청 없음, Firebase SDK/Auth/write·Rules/CORS·Hosting·배포 무변경.** **다음 스펙·기능 미착수(대기).**

> 스펙 015 재검증 보완(2026-07-23, 검증 2건·**production 코드 무변경**): (1) StrictMode 생명주기 + **실제 reader** 병합 통합 테스트 추가(`strictmode-reader-integration.test.ts`, framework-free): `createPublicCatalogReader({fetch:controlledFakeFetch})`를 `PublicCatalogController`에 주입, `start()→detach()→start()`를 첫 shared fetch pending 중 실행 → gate resolve → **underlying fetch 1회**·최종 ready·첫 caller signal aborted+결과 `REQUEST_ABORTED`·두 번째 caller `OK`·stale 미덮음(timer-free microtask flush). (2) `mockup-catalog.spec.ts` 고정 sleep 제거(setTimeout 200/150 → 테스트 제어 gate: 진입→loading→gate resolve→ready), Playwright 초기 요청 테스트명 `production initial mount request is exactly once`로 정정. 재검증: frozen diff 0(의존성 무변경)/format·lint·typecheck/**unit 117**(통합 1 신규, 3회 안정)/build 독립/**e2e 11**(admin 2+mockup 9)/check PASS. production 코드/API/UI/오류매핑/reader 계약 무변경, 실제 Firebase GET·`test:live:*` 미실행, 신규 의존성 0. 코드/test 커밋과 문서 커밋 분리.

> 스펙 015 구현 완료(로컬, 2026-07-23): `apps/mockup`을 스펙 013 공개 reader로 mount 시 카탈로그 1회 읽는 최소 연결 셸로 전환. 모듈 단위 reader **singleton**(import 시 네트워크 0), framework-free `PublicCatalogController`(generation·per-load AbortController·stale/detach guard·자체 REQUEST_ABORTED 비치명)+`useSyncExternalStore` hook. **StrictMode mount→cleanup→mount에도 reader in-flight 병합으로 underlying fetch 정확히 1회**(E2E hit count 고정). retryable 오류만 수동 재시도(클릭당 새 fetch 1회, 중복 무시), 자동 retry/polling/cache 0. code→안전 한국어 메시지(코드/status/URL/path 미노출), 성공 document는 메모리에만(DOM/console/storage 직렬화 0). UI=@denn/ui Card/Button/Badge만(loading role=status·ready+warning Badge·error role=alert+retry Button), 프리미티브 데모 제거. 게이트: frozen diff 0(mockup importer에 `@denn/firebase` link만, 신규 패키지 0)/format·lint·typecheck/**unit 116**(controller 9 신규)/build 독립(mockup JS gzip 64.40KB, 250KB 예산 내)/**e2e 12**(admin 2+mockup 10, route interception+합성 fixture만·실제 network 0). E2E: 지연→ready·StrictMode 1요청·500→retry→200(2요청)·invalid JSON/catalog retry 버튼 없음·320/1280 overflow 0/axe 0/console 0·admin endpoint 0·셸 무변경. `*.live.test.ts`·`test:live:*` 미실행. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**admin 앱 소스 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, Router/Zustand/data-fetching lib 0, 신규 의존성 0. 코드/test 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-015-mockup-catalog-connection-handoff.md`, DONE는 스펙 하단. **유지: 실제 endpoint 재요청 없음(스펙 014 결과 유지), offline은 실패 UI 정상(기본 카탈로그로 숨기지 않음), 상품 탐색 화면 아님(후속 스펙).**

> 스펙 015(2026-07-23): `docs/rebuild/specs/015-mockup-public-catalog-connection.md`. `apps/mockup`이 mount될 때 스펙 013 reader로 공개 카탈로그를 읽는 첫 제품 연결이다. production reader singleton+in-flight 병합으로 React StrictMode에서도 초기 underlying fetch 1회를 보장하고, generation/abort로 stale·unmount 경합을 차단한다. UI는 접근 가능한 loading/ready/error와 retryable 오류의 수동 재시도만 제공한다. 자동검증은 fake reader와 Playwright route interception만 사용하며 실제 GET·live 명령은 0이다. 상품/템플릿 UI·Canvas·이미지·선택·저장·주문·Router/Zustand·cache·Firebase SDK/Auth/write·Rules/CORS·Hosting·배포는 제외한다.

> 스펙 015(2026-07-23): `docs/rebuild/specs/015-mockup-public-catalog-connection.md`. `apps/mockup`이 mount될 때 스펙 013 reader로 공개 카탈로그를 읽는 첫 제품 연결이다. production reader singleton+in-flight 병합으로 React StrictMode에서도 초기 underlying fetch 1회를 보장하고, generation/abort로 stale·unmount 경합을 차단한다. UI는 접근 가능한 loading/ready/error와 retryable 오류의 수동 재시도만 제공한다. 자동검증은 fake reader와 Playwright route interception만 사용하며 실제 GET·live 명령은 0이다. 상품/템플릿 UI·Canvas·이미지·선택·저장·주문·Router/Zustand·cache·Firebase SDK/Auth/write·Rules/CORS·Hosting·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 014 = **승인 가능**(기준 HEAD `7c5d04a`). 스펙 013 고정 공개 reader를 opt-in으로 실제 검증(**Node 1 + Browser 1 = GET 2회**, 둘 다 성공: Node source:network·스펙 012 통과, Browser CORS 미차단·HTTP 200·byteLength 192419≈188 KiB≤5 MiB·JSON parse OK). 순수 sanitizer가 안전 집계만(이름/ID/token/URL/base64/path/원문 0, issue는 code별 개수), live는 `*.live.test.ts` 기본 제외+별도 Playwright config·opt-in 없으면 요청 전 실패. 기본 게이트 network-free: frozen diff 0/format·lint·typecheck/**unit 107**/build 독립/e2e 4/check PASS. repo·임시경로 산출물 0(`test-results/.last-run.json`=status만·gitignored), 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·앱 소스 hash UNCHANGED, Firebase SDK/Auth/write/Rules/CORS·deploy 0, 신규 의존성 0. 도구·결과 문서 커밋 분리. 보고서 `reviews/2026-07-23-live-public-catalog-read-report.md`. **유지: 실행 시점 스냅샷·장기 가용성/offline 미검증, 총 GET 2회, 앱 연결·Firebase 변경·배포 미착수, 운영 카탈로그 원문·식별값 저장소에 없음.** **다음 스펙·앱 연결 미착수(대기).**

> 스펙 014 구현·실행 완료(로컬, 2026-07-23): 스펙 013 고정 공개 reader를 opt-in으로 실제 검증. **실제 GET = Node 1 + Browser 1 = 2회**(예산 준수), 둘 다 **성공**. Node: success/OK, `source:"network"`, 스펙 012 통과. Browser: success/OK, corsBlocked false, HTTP 200, responseType `cors`, byteLength **192419**(≈188 KiB ≤5 MiB), jsonParseOk true, elapsedMs 4227. 순수 sanitizer(`safe-summary.ts`)가 counts/codes/status/byte/elapsed/존재 boolean만 남기고 이름/ID/token/URL/base64/path/원문 0(issue는 code별 개수, path 제거). live는 `*.live.test.ts`(기본 Vitest 제외)+별도 Playwright config, opt-in(`DENN_LIVE_PUBLIC_CATALOG_READ=1`) 없으면 요청 전 실패(위장 없음). 기본 게이트 network-free: frozen diff 0(deps 무변경)/format·lint·typecheck/**unit 107**(sanitizer 11 신규, live 제외)/build 독립/**e2e 4/4**/check PASS. repo·임시경로에 response/json/tmp/log/HAR/trace/video/screenshot 0(`test-results/.last-run.json`=status만·gitignored), 포트 free. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**앱 소스 전부 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·deploy 0, 신규 의존성 0. 도구/테스트 커밋과 결과 문서 커밋 분리. 보고서 `reviews/2026-07-23-live-public-catalog-read-report.md`(§6 허용 필드만), 핸드오프 `docs/2026-07-23-spec-014-live-public-catalog-handoff.md`. **유지: 실행 시점 스냅샷(장기 가용성·offline 미보장), 실패해도 5 MiB·timeout·Rules·CORS 임의 변경 금지, 앱 연결·Firebase 변경·배포 없음.**

> 스펙 014(2026-07-23): `docs/rebuild/specs/014-live-public-catalog-read-validation.md`. 스펙 013의 고정 공개 `published/state.json` reader를 실제 환경에서 격리 검증한다. 기본 게이트는 network-free로 유지하고 명시적 opt-in에서만 Node adapter 1회와 로컬 browser CORS 1회(총 2회 이하)를 수행한다. 원문·이름·ID·URL·이미지 경로·base64·token은 저장/출력/커밋하지 않고 byte·elapsed·status·collection/issue code 개수 등 안전 집계만 문서화한다. 실패 시 5 MiB·timeout·Rules·CORS를 즉시 바꾸지 않고 safe code만 보고한다. 앱 연결·Firebase SDK/Auth/write·Rules/CORS·Hosting·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 013 = **승인 가능**(기준 HEAD `ed553b2`). `@denn/firebase` `createPublicCatalogReader` read-only 공개 카탈로그 REST adapter 확립. 재검증 보완 2라운드 반영(1라운드: 구현; 2라운드: transport-독립 timeout 상태머신·endpoint 고정·correlationId 공백 거부). 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 96**(firebase 35) / build 독립 / e2e 4 / check PASS. Firebase SDK·신규 의존성 0, `@denn/firebase`→`@denn/shared` 방향 유지, 앱 import/call 0, 실제 network/브라우저 저장소 0, 운영본·Firebase·Rules·`poc/**`·PNG 무변경, deploy 0. **유지: fake fetch만 검증(실제 CORS·캐시 header·지연 미검증, 실제 published/state.json 미요청), 5 MiB 초기 안전 상한, persistent cache·retry·offline fallback 없음, Firebase SDK·Auth·write·Rules·앱 연결·배포 무변경.** **다음 스펙·앱 연결 미착수(대기).**

> 스펙 013 재검증 보완(2026-07-23, HEAD `03f5eeb`→`d99c046`): Codex "수정 후 재검증" 2건+소형 1건. (1) **timeout을 transport 협조와 무관하게 강제** — `runFetch`를 단일 상태머신(`settle` 1회)으로 재작성, timeout timer vs work 파이프라인 경쟁. transport나 `response.text()`가 signal 무시·pending이어도 `timeoutMs`에 반드시 `NETWORK_TIMEOUT` settle, `controller.abort()`는 정리 힌트. 늦은 resolve/reject no-op(덮어쓰지 않음)+`doWork` 내부 catch로 unhandled rejection 없음, in-flight 정리→다음 load 새 fetch. (2) **endpoint 고정** — `PublicCatalogReaderOptions.location` 제거, 항상 `PUBLIC_CATALOG_LOCATION`, `buildPublicCatalogUrl()` 인자 없는 고정 builder, 호출자 URL 주입 불가. (3) **correlationId 공백 거부** — `""`+공백만(`"   "`)도 `trim`으로 요청 전 `INVALID_REQUEST`(원본 echo, 정상값 무변경). 재검증: frozen diff 0 / format·lint·typecheck / **unit 96**(firebase 35) / build 독립 / e2e 4. firebase tsconfig `types:["node"]` 추가(unhandledRejection 관측). Firebase SDK·신규 의존성 0, 앱 0 usage, 운영본·Rules·POC·PNG **UNCHANGED**, deploy 0. 코드 `d99c046`/문서 커밋 분리.

> 스펙 013 구현 완료(로컬, 2026-07-23): `@denn/firebase`에 `createPublicCatalogReader` read-only REST adapter. 고정 공개 `published/state.json` 결정적 media URL(`encodeURIComponent`→`%2F`·`?alt=media`·cache-buster 없음, 근거 mockup L848). 주입 `FetchLike`(GET·no-store·auth/body 없음·body 1회), import 시 네트워크 미접촉(미주입 시 load 시점 global fetch lazy, 없으면 `INVALID_REQUEST`). 내부 AbortController timeout(기본 10s) + caller signal, **옵션 A** 취소 격리(한 caller abort는 그 caller만 `REQUEST_ABORTED`, 공유 fetch 유지→타 caller 정상). 동시 fetch 1회 병합·settle 후 새 fetch·늦은 완료 미덮음, timer/listener 정리. 5 MiB: Content-Length 사전검사 + `TextEncoder` UTF-8 byte 재검사(string.length 아님). 안전 오류 계약(category/code/retryable/correlationId + httpStatus/스펙012 issue code·path만, body/base64/token/URL 미노출), retry/cache/stale 없음. 성공은 스펙 012 `readLegacyCatalog` 통과분만, warning은 report로 전달. 게이트 전부 통과: frozen diff 0(firebase package.json 무변경) / format·lint·typecheck / **unit 91**(firebase 30 신규) / build 독립(JS gzip ≈61.09KB) / e2e 4(앱 무변경). **Firebase SDK·신규 의존성 0**, `@denn/firebase`→`@denn/shared` 방향 유지, 앱 import/call 0, 실제 network/브라우저 저장소 0. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0(Rules/deploy=NOT APPLICABLE). 코드/test 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-013-public-catalog-adapter-handoff.md`, DONE는 스펙 하단.

> 스펙 013(2026-07-23): `docs/rebuild/specs/013-public-catalog-read-adapter.md`. `@denn/firebase`에 고정 공개 Storage 객체 `published/state.json` read-only REST adapter를 만든다. 주입 fake fetch로 URL·timeout/abort·5MiB·HTTP/JSON/Catalog V1 오류·민감정보 비노출·동시 요청 병합을 검증한다. 실제 네트워크·Firebase SDK·앱 연결·cache/retry·쓰기·Rules·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 012 = **승인 가능**(기준 HEAD `a6fd990`). `@denn/shared` legacy 카탈로그 단일 read boundary(`readLegacyCatalog`/`isCatalogDocumentV1`) 확립. 재검증 보완 2라운드 반영(1차 4건: guard 강화·nested-unknown extensions·non-finite 거부·전체 이미지 순회; 2차 2건: deep V1 guard(read 재사용)·storagePath trimStart scheme·joinPath leading-dot). 게이트 최종: frozen diff 0 / format·lint·typecheck / **unit 61**(catalog 35) / build 독립 / e2e 4 / check PASS. shared React/Firebase/`@denn/*` 의존 0·IO 0·앱 파서 0·신규 의존성 0, 운영본·Firebase·`poc/**`·PNG 무변경, deploy 0. **유지: 합성 fixture만 검증(실제 ~35MB `backup.json` 미검증), Catalog V1은 내부 읽기 모델(write/cutover 승인 아님), flat roomBackgroundSettings는 보존만(변환 안 함).** **다음 스펙·기능 구현 미착수(대기).**

> 스펙 012 2차 재검증 보완(2026-07-23, HEAD `b85810a`→`fba378b`): Codex "수정 후 재검증"(3건 승인·2건 보완). (1) `isCatalogDocumentV1`가 3키 shell + **`readLegacyCatalog(input).ok` 재사용**으로 deep contract 검사 → `{schemaVersion:1,migratedFrom:"legacy-v0",data:{models:"invalid"}}` 등 read가 fatal로 보는 V1은 guard도 false, 규칙 단일 출처(순환 없음). (2) storagePath scheme 검사 시 **검사값만 `trimStart`**(원본 보존) → `" https://"`·`"\tjavascript:"`도 `UNSAFE_STORAGE_PATH`. (3) `joinPath` helper로 leading-dot 방지 → 루트 storagePath 오류 path=`"storagePath"`(no dot). 재검증: frozen diff 0 / format·lint·typecheck / **unit 61**(catalog 35) / build 독립 / e2e 4. shared React/Firebase/@denn/* 의존 0, IO 0, 앱 파서 0, 신규 의존성 0. 운영본·POC·PNG·Firebase **UNCHANGED**, deploy 0. 코드 `fba378b`/문서 커밋 분리.

> 스펙 012 재검증 보완(2026-07-23, HEAD `32eab2e`→`aae7187`): Codex "수정 후 재검증" 4건. (1) `isCatalogDocumentV1` 얕은 guard 강화(정확히 3키 {schemaVersion:1, migratedFrom:"legacy-v0", plain-object data}만 true). (2) nested unknown 보존·경고 + 명시적 타입 계약 — known 객체/아이템(DEF L846-856 근거)의 추가 필드를 nested `unknownPaths`+`UNKNOWN_FIELD`로 보고하고 `report.extensions`(`CatalogExtensions`=path→JsonValue)로 노출, 근거 없는 컬렉션·깊은 중첩은 opaque. (3) `cloneJsonSafe`가 NaN/±Infinity를 어디서든(unknown/extensions 포함) `NON_FINITE_NUMBER`로 거부. (4) 카탈로그 전체 재귀 순회로 모든 `dataUrl`/`storagePath` 집계(watermark·중첩 editorOverlayImages 포함), `storagePath`의 **모든 URL scheme**(`javascript:`뿐 아니라 `https:` 등) `UNSAFE_STORAGE_PATH` 거부. 재검증: frozen diff 0 / format·lint·typecheck / **unit 57**(catalog 31) / build 독립(JS gzip ≈61.09KB) / e2e 4. shared React/Firebase/@denn/* 의존 0, IO 0, 앱 파서 0, 신규 의존성 0. 운영본·POC·PNG·Firebase **UNCHANGED**, deploy 0. 코드 `aae7187`/문서 커밋 분리. 주의: URL scheme storagePath는 이제 fatal(별도 스펙).

> 스펙 012 구현 완료(로컬, 2026-07-23): `@denn/shared`에 `readLegacyCatalog`/`isCatalogDocumentV1` 단일 read boundary. legacy-v0 `S`/`ADM`(또는 V1 wrapper)를 `CatalogDocumentV1` 내부 읽기 모델로 검증·정규화. JSON-safe 딥클론(함수·비평범객체·순환 거부, **원본 비변형**), unknown top-level 제자리 보존+`unknownPaths`, flat `roomBackgroundSettings`·`__opRev/__cloudRev/__publishedAt`·`dataUrl/storagePath/dual` 보존. 근거 있는 필드만 모델링(DEF L846 + legacy-analysis §4), zone/clock/mockup 내부는 opaque, unknown `frameTemplate.type`은 경고+보존. 오류 `{code,path}`만(원문·base64·토큰 없음), warning/fatal 구분, `UNSUPPORTED_SCHEMA_VERSION`·`MALFORMED_V1` 거부. 게이트 전부 통과: frozen diff 0(shared package.json 무변경) / format·lint·typecheck / **unit 50**(catalog 24 신규: 결정성·deep-freeze 불변성·legacy→V1 재입력 동등·unknown 보존·이미지 count·오류 code/path) / build 독립(JS gzip ≈61.09KB) / e2e 4(앱 무변경). **신규 스키마 라이브러리(Zod) 미설치**, React/Firebase/다른 `@denn/*` 의존 0, IO 0, 앱 파서 사용 0, 합성 fixture만(PII·실제 base64 없음). 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0. 코드/fixture/test 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-012-legacy-catalog-read-handoff.md`, DONE는 스펙 하단.

> 스펙 012(2026-07-23): `docs/rebuild/specs/012-legacy-catalog-read-contract.md`. 운영 데이터·Firebase·앱에 연결하지 않고 `@denn/shared`에서 legacy-v0 `S`/`ADM`을 `CatalogDocumentV1` 내부 읽기 모델로 검증·정규화한다. unknown/extensions·flat room 설정·리비전·dataUrl/storagePath를 보존하고 오류 code/path·통계·원본 불변·결정성·V1 재입력을 합성 fixture로 검증한다. 실제 백업·개인정보·운영 write·자동 마이그레이션·Canvas·배포는 제외한다.

> Codex 최종 승인(2026-07-23): 스펙 011 = **승인 가능**(기준 HEAD `9c17dc9`). 프리미티브 6종(Button/Card/Badge/Chip/TextField/VisuallyHidden) + 웜 토프 토큰 계약 확립. 게이트 최종: frozen diff 0 / format·lint·typecheck / unit **26** / build 독립 / e2e **4** / **oxc·esbuild 경고 0**. 재검증 보완 2건(vitest ignored esbuild 옵션 제거·Chip disabled 계약 완성) 반영 완료. 경계 상대 침투 0·순환 0, 신규 설치(Firebase SDK/Router/Zustand/Radix/shadcn) 0, 배포 0, 운영본·Firebase·POC·PNG 무변경. **유지: 실기기 4환경은 이번 완료 조건 아니었음, 브라우저 200% 육안 재확인 미수행.** **다음 스펙·기능 구현 미착수(대기).**

> 스펙 011 재검증 보완(2026-07-23, HEAD `9baec46`→`611707d`): Codex "수정 후 재검증" 2건 최소 보완. (1) `vitest.config.ts`의 ignored `esbuild.jsx` 제거 → Vite 8 **oxc/esbuild 충돌 경고 0**(oxc가 .tsx를 automatic JSX로 기본 처리, 새 변환기/의존성 없음). (2) Chip disabled 계약 완성 → `.denn-chip:disabled`(cursor:not-allowed+dim) + hover에 `:not(:disabled)`, 정적 테스트에 native disabled 전달 검증, 두 앱 데모에 disabled Chip 1개씩 + e2e에서 존재·disabled·44px 검증. 재검증: frozen diff 0 / format·lint·typecheck / unit **26/26**(경고 0) / build 독립(JS gzip ≈61.09KB) / e2e **4/4**. 운영본·POC·PNG·Firebase 무변경, 배포 0. 코드 커밋 `611707d` / 문서 커밋 분리.

> 스펙 011 구현 완료(로컬, 2026-07-23): `@denn/ui`에 Button/Card/Badge/Chip/TextField/VisuallyHidden 6종 + 웜 토프 토큰 계약 완성. 게이트 전부 통과: frozen install diff 0 / format·lint·typecheck 0 / unit **25/25**(토큰↔CSS 드리프트 가드 + 컴포넌트 ARIA 계약) / build 독립(mockup·admin JS gzip ≈61.07/61.08KB, CSS 2.62KB) / e2e **4/4**(키보드 focus-visible·44px 터치·320/1280 overflow 0·axe serious/critical 0·console 0). React 의미 계약은 저장소 기존 `react-dom/server` renderToStaticMarkup으로 검증(**jsdom/happy-dom/RTL 미도입**), @denn/ui react/react-dom peer+dev는 기존 lockfile 버전이라 **신규 다운로드 0**. 토큰 드리프트는 이름·값 명시 검증(전체 스냅샷 아님). axe: muted가 페이지 bg(#F4F4F5) 위 4.39 미달 → 식별 문단을 흰 Card로 이동해 해소(토큰 무변경). 운영 HTML·`firebase.json`·`.firebaserc`·Rules 2종·`poc/**`·디자인 PNG **hash UNCHANGED**, Firebase SDK/Router/Zustand/Radix/shadcn 신규 설치 0, **deploy 미실행**. 코드/설정 커밋과 문서/핸드오프 커밋 분리. 핸드오프 `docs/2026-07-23-spec-011-ui-primitives-handoff.md`, DONE는 스펙 하단.

> 스펙 011(2026-07-23): `docs/rebuild/specs/011-ui-foundation-primitives.md`. `@denn/ui`의 웜 토프 토큰 계약과 Button/Card/Badge/Chip/TextField/VisuallyHidden 최소 프리미티브를 고정한다. 두 앱의 스캐폴드 셸에서 패키지 소비·모바일 44px 터치·focus-visible·ARIA·320px overflow·axe를 검증한다. 제품 기능·최종 레이아웃·Canvas·Firebase·Router/Zustand·Radix/shadcn·배포는 제외한다.

> Codex 최종 승인(2026-07-22): 스펙 010 = **승인 가능**(기준 HEAD `1d30a2c`). 모노레포 구조·품질 게이트 타당, @denn/spaces v1-only 계약 정정 완료. frozen diff 0/format·lint·typecheck 0/unit 6/6/build 독립(gzip 60.16KB)/e2e 4/4/경계(상대 침투 0·순환 0)/release-age allowlist 불필요/운영 HTML·firebase.json·.firebaserc·Rules 6 hash UNCHANGED·POC 무변경·Router/Zustand/shadcn/Firebase SDK 미설치·deploy 미실행 확인. **다음 스펙·기능 구현은 미착수(대기).**

> 스펙 010 구현 완료(로컬, 2026-07-22): 루트 pnpm workspace + `apps/mockup`·`apps/admin` + `packages/shared|firebase|spaces|render|ui`(2 apps + 5 packages). react/react-dom 19.2.7·plugin-react 6.0.3(aged patch)·TS 7.0.2·Vite 8.1.5·Tailwind v4·Biome 2.5.5·Node 24. release-age allowlist **불필요**(aged patch로 frozen EXIT 0). 게이트 전부 통과: frozen diff 0 / format·lint·typecheck 0 / unit 4/4 / build 독립(mockup·admin JS gzip 60.16KB, 예산 내) / e2e 4/4(overflow 0·console 0·axe serious 0·교차앱 격리). 경계 `workspace:*`+export(상대 침투 0·순환 0), 각 패키지 placeholder(미구현 명시). **운영 HTML·firebase.json·.firebaserc·Rules hash 전부 UNCHANGED**, POC 무변경, Router/Zustand/shadcn/Firebase SDK 미설치, **deploy 미실행**. `.gitignore` 정상화(설정 JSON `add -f` 불필요, 데이터 백업 무시 유지). 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-monorepo-scaffold-report.md`, 핸드오프 `docs/2026-07-22-spec-010-monorepo-scaffold-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 009 = **승인 가능**(기준 HEAD `1f3e67d`). 확정: Node 24 LTS major(engines `">=24 <25"`+`.nvmrc`=24) · pnpm 11.15.1+Corepack+단일 lockfile · TS 7.0.2 · **Biome 2.5.5(lint+format,`--error-on-warnings`)+`tsc --noEmit` 채택** · typescript-eslint TS7 미지원 미도입 · 최소 pnpm workspace 채택 · minimumReleaseAgeExclude Biome 9항목 유지 · minimumReleaseAge=0 안 함 · 장기 release-age 정책 NOT DECIDED · 스캐폴드 시 allowlist 재검증. **스펙 006 미확정 2건(TS7 린트·최소 workspace) 해소.** 실제 루트 apps/packages/workspace는 스펙 010에서만 생성.

> 스펙 009 구현 완료(로컬, 2026-07-22): 격리 POC `poc/toolchain-workspace/`. Corepack로 pnpm 11.15.1 실행(전역 설치·PATH 변경 없음). **채택 권고: Biome 2.5.5(lint+format, --error-on-warnings) + tsc 7.0.2 --noEmit + 최소 pnpm workspace.** typescript-eslint↔TS7 = 재현된 비호환(peer `<6.1.0`)으로 미설치(force 없음). 정상 게이트 typecheck/lint/format/test 전부 PASS, fixture 3종(lint/format/type) 정상 실패, `workspace:*`+export 경계(상대 침투 0), 단일 lockfile frozen 재현. Node 24 LTS major 고정(engines `">=24 <25"` + `.nvmrc`=24). **release-age: pnpm config=undefined이나 pnpm11 기본 정책 실제 작동 → Biome 2.5.5 allowlist(minimumReleaseAgeExclude 9항목) 유지 시 frozen EXIT 0/제거 시 EXIT 1; release-age 기간·장기 공급망 정책 NOT DECIDED, minimumReleaseAge=0 비활성화 안 함.** 설정 json은 루트 `.gitignore` `*.json` 때문에 `git add -f`. 루트 apps/packages/lockfile·운영본·Firebase·기존 POC·디자인 무변경. 보고서 `docs/codex-claude-handoff/reviews/2026-07-22-ts7-lint-pnpm-workspace-poc-report.md`, 핸드오프 `docs/2026-07-22-spec-009-toolchain-poc-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 008 웜 토프 실기기 표시 = **승인 가능**(기준 HEAD `4df8181`). 4환경×12항목 PASS·영상 관측과 직접 확인 근거 구분·device-matrix 41줄 append-only·001~007 보존·코드/CSS/토큰/테스트/PNG/운영/Firebase/Rules 무변경·영상 저장소 미추가·preview 종료 확인. 주의: 실기기 "오류 없음"은 화면 오류 관측 카드 기준(네이티브 콘솔 원격 디버깅 아님), 데스크톱 자동검증 콘솔 0과 혼동 금지.

> 스펙 008(2026-07-22): 웜 토프 실기기 표시 = iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 **4환경 12항목 전부 PASS**(FAIL 없음). 증거=영상 `screen shot/KakaoTalk_20260722_153026136.mp4`(저장소 미추가)에서 카카오·Samsung 관측 + 사용자 추가 직접 확인, iPhone·Android는 사용자 직접 확인. Samsung·카카오 수동 회전·핀치/200% 확대 정상, 카카오 orientation lock 강제 실패→정상 fallback. 상세 기기·OS·브라우저 버전 = 미기록(추정 안 함). 코드·CSS·토큰·테스트·PNG·운영본·Firebase 무변경, preview 종료. 기록=`device-matrix.md` 스펙 008 별도 섹션(001~007 무변경). 핸드오프 `docs/2026-07-22-spec-008-warm-taupe-device-handoff.md`.

> Codex 최종 승인(2026-07-22): 스펙 007 웜 토프 마이그레이션 = **승인 가능**(기준 HEAD `95c8445`). 토큰 중앙화·양 계층 일치·accent-ink `#191A1D`·명암비 정합·color-contrast 포괄 제외 없음·이전 리터럴 잔존 0·002/003/fullscreen 회귀 없음·운영/Firebase/001~006 무변경 확인. 자동검증 단계 완료, 새 팔레트 실기기 색상 = NOT TESTED(스펙 008에서 검증).

> 스펙 007 구현 완료(로컬, 2026-07-22): POC 토큰을 웜 토프 `#9F887A`/`#BAA598`/`#EEE8E1`(accent-ink `#191A1D`·kakao 유지)로 중앙 계층에서 교체. 흰색/accent 3.35(미달)→accent-ink 5.20(AA), accent-soft 위 텍스트=ink(14.31). 이전 팔레트 리터럴 실행 코드 잔존 0. 자동검증 typecheck 0 / unit 34 / build(JS gzip 66.47KB) / e2e 11(color-contrast serious/critical 0), 002 확대·003 Canvas·fullscreen 회귀 없음. 코드↔핸드오프 커밋 분리, 디자인 PNG·운영본·001~006 결과는 code 커밋 미포함. 핸드오프 `docs/2026-07-22-spec-007-warm-taupe-handoff.md`. 실기기 표시는 별도 후속 검증.

> 최신 디자인 결정(2026-07-22): Modern Studio(B) 포인트색은 **웜 토프 `#9F887A` / `#BAA598` / `#EEE8E1`**, accent-ink `#191A1D`, 카카오 `#FEE500`으로 최종 확정. 결정서 `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md`, 구현 계약 `docs/rebuild/specs/007-warm-taupe-palette-migration.md`. 이전 카라멜 앰버 스펙 004·005는 당시 검증 이력으로 보존하며 현재 팔레트 기준으로 사용하지 않는다. TS7 린트·최소 pnpm workspace POC는 스펙 007 이후로 순서를 조정한다.

> Codex 최종 승인(2026-07-22): 스펙 006 기술 스택 조사·정정 = **승인 가능**. 승인 기준: Node 24 LTS 기본 · pnpm(Corepack+packageManager+단일 lockfile) · React19/Vite8/TS7/Tailwind v4 기본 후보 · Vitest4/Playwright/axe 검증도구 · Router·Zustand 미도입(요구 시) · Radix/shadcn 컴포넌트별 · 정확 patch는 스캐폴드 직전 lockfile 고정. **미확정=TS7 린트 조합·최소 pnpm workspace 구조(소형 POC).**

> 스펙 006(2026-07-22): 읽기 전용 근거 보고 `docs/codex-claude-handoff/reviews/2026-07-22-frontend-stack-finalization-report.md`. npm registry metadata + Tailwind 공식 문서 근거. 설치·스캐폴드·package.json/lockfile 무변경. 핵심: 스택 세대(React19/TS7/Vite8/Tailwind v4/Vitest4/Playwright1.61)는 확정 가능·전부 patch 차이. **리스크=typescript-eslint(≤6.0)↔TS 7.0.2 비호환 → 린트 전략 소형 POC 필요**. 권고: **Node 24 LTS**(POC가 24.18.0 통과, 지원 2028-04까지)·Tailwind v4·pnpm 단일 lockfile(Corepack `packageManager` 고정). @vitejs/plugin-react optional peer는 metadata상 optional=true로 **VERIFIED**. 남은 결정=라우팅/상태/UI 도입 시점·TS7 린트 전략.

> 스펙 005(2026-07-22): 새 팔레트 실기기 표시 = iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 **4환경 12항목 전부 PASS**(사용자 직접 확인, 육안). 스크린샷 = 카카오 인앱만 사용자 1장 제공(Codex 채팅 첨부 `codex-clipboard-a8e46ce7-1893-4cb7-817a-2b5875c08b73.png`, 저장소 미추가)·나머지 3환경 없음, 상세 버전 미기록, CSS.supports 기존과 동일. 코드·CSS·토큰·PNG 무변경, preview 종료. 기록=`device-matrix.md` 스펙 005 별도 섹션(001·002·003 무변경). 핸드오프 `docs/2026-07-22-spec-005-device-validation-handoff.md`.

> Codex 최종 재검증(2026-07-22): 스펙 004 팔레트 전환·accent-ink `#191A1D`·디자인 접근성 규격·POC 코드/CSS·명암비 테스트·color-contrast 포함 자동검증·002/003 자동 회귀 = **승인 가능**. 승인 기준 HEAD `7406460`.
> 스펙 004 자동검증 단계 완료. 새 팔레트 실기기 색상은 이후 **스펙 005에서 4환경 PASS·Codex 승인**으로 해소됨. **Tailwind v4 채택 확정**(결정서 2026-07-22). PNG·전체 스캐폴드·Firebase·배포는 계속 대기.

> 기본 배율 1~14: iPhone Safari·Samsung Internet·카카오 인앱 = 전체 **PASS**(Android Chrome NOT TESTED). 자동검증 Codex 승인 기준 HEAD `f4dae95`.
> **확대(200%/핀치) 접근성 게이트:** 최초 4환경 공통 FAIL을 발견했으나 스펙 002 수정·재검증으로 해소.
> **스펙 002 구현 완료(로컬):** 순수 `computeViewportLayout(scale>1.01→isZoomed, keyboardInset=0)`로 확대/키보드 구분 → `.page[data-zoomed]`로 확대 시 `.bottomnav` fixed→흐름 전환 + `.content` 120px 예약여백 정상화 + 키보드 inset 오인 제거. 색상·sheet·역스케일 미변경. 자동검증 typecheck 0 / unit 30 / build(JS gzip 66.44KB) / e2e 11 통과.
> **스펙 002 실기기 완료:** iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 확대 재검증 전부 **PASS**. 접근성 확대 FAIL 해소.
> 색상 결정: **카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA`, accent-ink `#191A1D` 확정**. PNG 재생성은 별도 후속 스펙으로 분리한다.
> **스펙 004 구현 완료(로컬):** 디자인 기준 문서 + 001 POC 코드·CSS·명암비 테스트를 카라멜 앰버로 전환. accent 위 텍스트=accent-ink(5.41:1), accent-soft/흰색 위 텍스트=ink. `#B0894E`는 흰색과 양방향 3.21:1이라 채움·보더 전용. e2e color-contrast **포괄 제외 제거**(serious/critical 0 강제). 자동검증 typecheck 0 / unit 31 / build(JS gzip 66.47KB) / e2e 11 통과. 카카오·확대(002)·Canvas(003) 로직 무변경. 핸드오프 `docs/2026-07-22-spec-004-palette-handoff.md`. 새 팔레트 실기기 색상은 NOT TESTED로 분리.
> **스펙 003 실기기 완료:** 4환경 세로↔가로 Canvas `3:4`·DPR 재검증 전부 **PASS**. 카카오 가로 FAIL 해소. Android Chrome 전체 1~14는 여전히 일부 미검증이지만 확대·Canvas 게이트는 PASS 근거 확보.

## 현재 결론

- 기존 운영 HTML과 Hosting 경로는 그대로 유지한다(무변경 확인).
- 신규 리빌드는 별도 디렉터리에 추가한다. POC = `poc/platform-compatibility/`(삭제 가능).
- Modern Studio(B) 디자인 방향은 확정됐다.
- 기술 스택은 스펙 006에서 읽기 전용 검토했고, 전체 스캐폴드 승인은 아직 나지 않았다.
- 001 POC가 구현되고 로컬 자동검증을 통과했다.
- **Tailwind v4 채택 확정**(4환경 기능 근거 확보, 결정서 2026-07-22). v3.4 병행 설치 금지.

## 브랜치/기준

- 작업 브랜치: **`rebuild/modern-studio`** (HEAD는 아래 커밋). main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.
- production 비교 기준 태그: `prod-baseline-20260721`.

## 001 POC — 완료(로컬)

- 정확 버전(npm registry): React 19.2.7 / react-dom 19.2.7 / Vite 8.1.5 / @vitejs/plugin-react 6.0.3 / TypeScript 7.0.2 / tailwindcss·@tailwindcss/vite 4.3.3 / vitest 4.1.10 / @playwright/test 1.61.1 / @axe-core/playwright 4.12.1 / @types/react 19.2.17 / @types/react-dom 19.2.3. 라이선스 전부 MIT/Apache(axe MPL, devDep).
- 패키지 매니저: npm(`npm ci` frozen). pnpm 미설치라 POC는 npm 사용(README에 근거).
- 자동검증 PASS: `npm ci` / `tsc --noEmit`(strict) / `vitest`(10/10) / `vite build`(JS gzip 65.5KB·CSS 3.3KB) / `playwright`(viewport 10/10).
- ★ 명암비 발견: 흰색/테라코타 `#C0614A` = **4.16:1**(일반텍스트 AA 미달, AA-large/UI 통과). 토큰 미변경, 대안 계산 제안(`#B85A44` 4.58:1 등) — spec §3.
- 접근성: scrollable-region-focusable 해결. color-contrast는 토큰 발견사항으로 기록(하드페일 제외).

### Codex 1차 판정 "수정 후 재검증" — 3건 보완 완료 (POC 범위 내)
1. **orientation lock 실제 시도**: `fullscreen.ts`에 순수 `orientationLockPlan(supported, inFullscreen)` + 컨트롤러가 상태 'active'(전체화면 확인) 후에만 `screen.orientation.lock('landscape')` 시도. 미지원/거부/실패는 비치명적으로 결과만 관측(`OrientationLockResult`), 화면(섹션 E)에 표시. 종료(settling)·detach 시 unlock. 단일 권위·추가 timer 없음. 유닛 3건 추가(총 13/13).
2. **LAN 주소 고정 제거**: device-matrix에서 특정 IP를 기준으로 기록하지 않고 `http://<현재-PC-LAN-IP>:4173` + 현재 IP 확인 안내(예시 IP는 예시로만 명시).
3. **NOT TESTED 명확화**: 14항목·메타 표 바로 위에 "빈 셀=NOT TESTED, 실제 결과 전 PASS/FAIL 금지" 규칙 명시.
- 재검증: typecheck/unit(13)/build(JS gzip 66.1KB)/e2e(10/10) 전부 통과. 운영파일 무변경.

### Codex 2차 판정 "수정 후 재검증" — orientation lock 비동기 종료 경합 1건 보완
- 문제: `so.lock('landscape')` await 중 FS 종료·detach 시, 늦은 성공이 stale하게 `locked`/결과 `locked`를 복원 + 종료 후 결과가 `locked`에서 안 풀림.
- 수정(`fullscreen.ts`): (1) 세대 토큰 `lockGen`(모든 시도 시작 시 ++, 종료·detach 시 ++로 무효화). (2) 순수 `isLockStillValid({attemptGen,currentGen,detached,state,inFullscreen})`로 Promise 완료 시 재확인 — 유효할 때만 `locked` 기록. (3) 늦은 성공(무효)은 `releaseOrientation()`으로 안전 unlock. (4) 종료(settling) 시 결과 `locked→idle` 초기화. (5) `detached` 플래그로 detach 후 `setLockResult`/`dispatch` 통지 차단. 단일 권위·단일 rAF 유지, 임의 timer 없음. 경합 유닛 5건 추가(총 18/18).
- 재검증: typecheck/unit(18)/build(JS gzip 66.25KB)/e2e(10/10) 통과. 운영파일 무변경. **실기기 lock 동작은 NOT TESTED 유지.**

### Codex 3차 판정 "수정 후 재검증" — React StrictMode 재attach 생명주기 1건 보완
- 문제: StrictMode(dev)가 effect를 attach→detach→attach로 재실행. `detach()`가 `detached=true`로 두는데 `attach()`가 복구 안 해, 재attach 후 `dispatch`/`setLockResult`가 계속 조기 return → FS 관측·lock 처리 비활성.
- 수정(`fullscreen.ts` attach): (1) 재attach 시 `detached=false` 복구. (2) `lockGen++`로 새 세션 시작(이전 세대 in-flight lock은 `isLockStillValid`로 계속 무효 — 세대 분리 유지). (3) 단일 attach 정책: 기존 handler 제거 후 등록. (4) 각 detach는 자기 handler만 제거(클로저 캡처). 임의 timer 없음.
- 테스트: `tests/unit/fullscreen-controller.test.ts`(DOM 목, attach→detach→attach 재활성·단일 listener·중복 attach 3건) + `tests/e2e/fullscreen.spec.ts`(FS 버튼 클릭 → 상태처리/정상 fallback 관측, 실제 FS 성공 강제 안 함).
- 재검증: typecheck/unit(**21/21**, 3파일)/build(JS gzip 66.27KB)/e2e(**11**: viewport 10 + fullscreen 1) 통과. 운영파일 무변경. **실기기 NOT TESTED 유지.**

## 실기기 검증 — 완료(3환경) / Android Chrome 대기

- **완료(2026-07-21, 사용자 수행 · Codex가 device-matrix 기록):**
  - iPhone Safari = 1~14 **PASS**. `fullscreenEnabled=false`·`orientation.lock=false`지만 정상 fallback. CSS.supports 전부 지원.
  - Samsung Internet = 1~14 **PASS**. 전부 정상. CSS.supports 전부 지원.
  - 카카오 인앱 웹뷰 = 1~14 **PASS**. Fullscreen 진입 성공(state=active), orientation lock 실패했으나 정상 fallback, 물리 가로 회전 시 가로 레이아웃 정상. CSS.supports 전부 지원.
- **대기: Android Chrome = NOT TESTED**(추정으로 PASS 금지).
- 증거: `KakaoTalk_20260721_210031114.png`, `_210414899.jpg`, `_210414899_01.jpg`, `_210705947.jpg`.
- 상세 기록: `poc/platform-compatibility/results/device-matrix.md`.
- LAN 접근(재현): `npm run preview -- --host` → `http://<이-PC-LAN-IP>:4173`(같은 Wi-Fi, 방화벽 승인 필요, 인터넷 비공개).

## 다음 작업

1. **스펙 010 Codex 재검증** — 스캐폴드 구조·경계·운영본 hash 무변경·배포 미실행 판정.
2. 이후 기능 구현 스펙 순차 진행(각각 별도 스펙): @denn/ui 컴포넌트 확장 · @denn/render Canvas · @denn/firebase SDK 연결 · @denn/spaces 암호화 · 카탈로그/주문/시안 기능 · Hosting public 격리·cutover·배포.
- **주의:** Hosting `public: "."` 상태이므로 배포 격리 전에는 어떤 Firebase deploy도 하지 않는다.

## 시작 조건

- (Android Chrome 검증 시) 사용자가 해당 기기에서 POC 접속·14항목 확인·결과 전달.
- LAN 접근 불가 시: 임시 HTTPS 채널 필요성·안전조치 보고 후 사용자 승인(임의 외부배포 금지).

## Claude Code 금지 (유지)

- 기존 HTML 이동·삭제·수정 / Firebase 연결 / 운영 데이터 접근·쓰기 / 전체 앱·모노레포 스캐폴드 / Preview·production 배포 / Tailwind v3.4 병행 설치·무근거 버전 변경 / force push·reset --hard·clean·자동 merge.

## 검증 요청 형식

```text
검증 요청
커밋: <hash>
목적: <변경 목적>
변경 파일: <목록>
실행한 검사: <명령과 결과>
미검증: <항목>
남은 위험: <위험>
롤백: <방법>
```
