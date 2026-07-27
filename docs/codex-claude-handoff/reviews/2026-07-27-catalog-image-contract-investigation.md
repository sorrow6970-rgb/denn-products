# 2026-07-27 — 카탈로그 이미지 참조 계약 조사 (스펙 018 사전 근거, 읽기 전용)

> **성격:** 읽기 전용 근거 수집. 코드·CSS·테스트·lockfile·운영본 무변경. 실제 Firebase GET·이미지 다운로드·live 테스트 없음.
> **목적:** 고객 카탈로그 탐색 화면에 상품 썸네일을 붙이기 전, 레거시 이미지 참조 계약(`dataUrl`/`storagePath`/대체 필드/URL 변환/CORS/fallback)을 추측 없이 확정할 근거를 파일·라인으로 고정한다.
> **표기:** `CONFIRMED`=직접 코드로 검증, `AGENT-SWEEP`=읽기 전용 전수 grep으로 수집(핵심 항목은 별도 CONFIRMED), `NOT VERIFIED`=코드로 확인 불가(실측/실데이터 필요), `NOT DECIDED`=코드 근거 없음(후속 결정 필요).
> **민감정보:** 실제 상품명·ID·전체 이미지 URL·base64·다운로드 token은 본 보고서에 복사하지 않는다. Storage path **prefix**만 인용한다.

라인 인용은 파일 로드 시점(스펙 017 종료 HEAD `0dc2050`) 기준.

---

## 0. 한 줄 결론

레거시 **소비자 앱(`denn-mockup-tool.html`)은 `storagePath`로 URL을 만들지 않는다.** 마이그레이션이 Firebase `getDownloadURL` 결과(https 다운로드 URL)를 **`dataUrl` 필드에 덮어써** 저장하므로, 소비자 렌더는 전적으로 `dataUrl`(= base64 `data:` URL **또는** https 다운로드 URL)에 의존한다. `storagePath`는 운영자측 영속·마이그레이션 부기(bookkeeping)용이다. 따라서 **탐색 썸네일 계약은 소비자 관점에서 `dataUrl` 우선 체인 하나로 수렴 가능**하지만, 현재 스펙 012 read 경계는 `dataUrl`이 https URL인 경우를 모델링하지 않아 보완이 필요하다.

---

## 표 1. 필드별 의미 / 소비 위치 / 근거 / 확정 상태

| 필드 | 의미 | 소비(읽기) 위치 | 정의(쓰기) 위치 | 확정 |
|---|---|---|---|---|
| `dataUrl` | 케이스·액자 템플릿의 **1차/정본 이미지 필드**. 마이그레이션 전=base64 `data:` URL, 마이그레이션 후=**https 다운로드 URL이 이 필드에 덮어써짐**. 썸네일과 인쇄 Canvas 양쪽의 소스. | 소비자 우선체인 `mockup:3025`,`mockup:11001`; 케이스 썸네일 `mockup:1045`; 케이스 Canvas `mockup:1658`,`1679`(AGENT-SWEEP) | 마이그레이션 덮어쓰기 `admin:15098` (CONFIRMED); 업로드 시 base64 세팅(AGENT-SWEEP `admin:1051`,`1528`) | CONFIRMED |
| `storagePath` | 업로드 성공 후 `dataUrl` **옆에 병기**되는 상대 객체 경로. 삭제 부기·"이미 호스팅됨" 마이그레이션 skip-guard·persist-strip 플래그로만 사용. **URL로 역변환하지 않음.** | 운영자 skip/strip `admin:15161`,`6046`(AGENT-SWEEP/CONFIRMED); 마이그레이션 기록 `admin:15099`(CONFIRMED). **소비자앱: `mockup:59` 단 1회, 존재 카운트용** (CONFIRMED grep 전수) | 마이그레이션 `admin:15099`(CONFIRMED) | CONFIRMED |
| `sourceDataUrl` | 액자 빌더 템플릿의 **풀해상도 원본 아트**, `dataUrl` 다음 대체 체인. | 우선체인 `mockup:3025`,`mockup:11001`; 로드아트/내보내기(AGENT-SWEEP `admin:12896`,`15593`) | 빌더 저장(AGENT-SWEEP `admin:12944`) | CONFIRMED(체인)/AGENT-SWEEP(정의) |
| `builderArtDataUrl` | 빌더 산출 아트 레이어. 대체 체인 멤버. | `mockup:3025`,`mockup:11001` (CONFIRMED) | AGENT-SWEEP `admin:12945` | CONFIRMED(체인) |
| `artDataUrl` | 전이(transient) 빌더 객체(`CB`/`FB`)의 **라이브 작업 아트** + 템플릿 대체 체인 멤버. | `mockup:3025`,`mockup:11001` (CONFIRMED) | AGENT-SWEEP `admin:2265`,`2273` | CONFIRMED(체인) |
| `originalDataUrl` | 빌더 스케일 전 **원본 업로드** 보존. 체인 최후 비-null 멤버. | `mockup:3025`,`mockup:11001` (CONFIRMED) | AGENT-SWEEP `admin:12946` | CONFIRMED(체인) |
| `icon` | 이미지가 없을 때 표시하는 이모지/글리프 **플레이스홀더**. 이미지 소스 아님. | 케이스 썸네일 fallback `mockup:1045` (`t.dataUrl?…:t.icon||'📷'`) (CONFIRMED) | 빌트인 아이콘(AGENT-SWEEP `mockup:1002`) | CONFIRMED |
| `generatedDetailPreview` | true면 "이 `dataUrl`은 실제 아트가 아닌 저해상 생성 프리뷰"라는 **게이트 플래그**. 소스 리졸버가 이 경우 `dataUrl`을 건너뛰고 null 반환. | 우선체인 게이트 `mockup:3025`,`mockup:11001`; 관리자 `admin:4155`(CONFIRMED) | 해제 `admin:4156`(CONFIRMED). set=true 위치 NOT FOUND(외부 세팅으로 취급) | CONFIRMED |
| `editorOverlayImages[]` | 액자 템플릿의 **운영자 전용** 가이드 오버레이 배열 `{id,name,dataUrl,visible,opacity,storagePath}`. 개별 `dataUrl` 각각 `editor-overlays/{tplId}/`로 마이그레이션. | 운영자 렌더/strip(AGENT-SWEEP `admin:14253`,`6051`); **소비자앱 NOT FOUND** | AGENT-SWEEP `admin:14203`,`14243` | AGENT-SWEEP |
| `realTemplateSrc`(mockup)/`realFrameTemplateSrc`(admin) | 액자 템플릿의 **정본 "그릴 수 있는 소스" 리졸버.** 썸네일·인쇄 공용. | 다수(AGENT-SWEEP `mockup:11356`,`admin:4167`) | mockup `3029`=`templateSourceForDesign(tpl)`(CONFIRMED); admin `4155`=**`dataUrl`만**(CONFIRMED) | CONFIRMED |
| `templateSourceForDesign`(mockup) | 정본 **우선 체인 보유 함수**(표 2·4). | `realTemplateSrc`가 호출 `mockup:3029` (CONFIRMED) | `mockup:3025` (CONFIRMED) | CONFIRMED |
| `templateSrcForPrint`(mockup) | 인쇄/내보내기 소스 리졸버. `realTemplateSrc` 우선, 없으면 `dataUrl`(게이트) fallback. | 인쇄 Canvas `mockup:11407`(AGENT-SWEEP) | `mockup:11354`(AGENT-SWEEP) | AGENT-SWEEP |
| 순수 `templateSrc` 필드 | 독립 필드로 **NOT FOUND** | — | — | NOT FOUND |
| `imageSrc` | 대체 체인 구현 로컬 헬퍼(여러 독립 정의). | `mockup:11001`(CONFIRMED); admin `9134`,`13513`,`13866`(AGENT-SWEEP) | 동일 | CONFIRMED(mockup) |
| `crossOrigin` | firebasestorage 호스팅 이미지를 Canvas 오염 없이 그리기 위해 `'anonymous'` 설정. 전역 monkey-patch + tint/export 명시 할당. | 전역 patch `mockup:11656`,`11662`(CONFIRMED); 명시 `mockup:12119`,`12764`(AGENT-SWEEP) | 동일 | CONFIRMED(전역) |
| `denn-cors-fix-image-src-setter` | 전역 crossOrigin 주입 IIFE의 `<script id=…>` 래퍼. | — | `mockup:11639`(블록 `11638-11667`) CONFIRMED; `admin:15663`(AGENT-SWEEP) | CONFIRMED(mockup) |

---

## 표 2. 케이스 · 액자별 thumbnail / Canvas·print 소스 비교

| 제품 유형 | 탐색 썸네일 소스 | Canvas/인쇄 원본 소스 | 같은가? | 근거 |
|---|---|---|---|---|
| **케이스 템플릿** | `t.dataUrl` (없으면 `t.icon` 이모지) | `curCTpl.dataUrl` (동일 필드) | **동일 필드** | 썸네일 `mockup:1045`(CONFIRMED); Canvas `mockup:1658`,`1679`(AGENT-SWEEP). 케이스는 별도 고해상 필드 없음 |
| **액자 템플릿** | `imageSrc`/`realTemplateSrc` 체인(=`dataUrl` 우선) — 관리자 그리드는 `realFrameTemplateSrc`=**`dataUrl`만** | `templateSrcForPrint`→`realTemplateSrc`→`imageSrc` 체인 | **같은 리졸버 공유** (둘 다 `dataUrl` 우선). `dataUrl` 부재/`generatedDetailPreview` 시에만 `sourceDataUrl`/`builderArt…`/`original…`로 분기 | 썸네일 `mockup:11001`,`admin:4155/4167`; 인쇄 `mockup:11354-11361`,`11407`(AGENT-SWEEP) |

- **핵심:** 썸네일 전용/인쇄 전용으로 나뉜 **별도 필드는 없다.** 둘은 하나의 우선 체인을 공유하고, `dataUrl`이 있으면 썸네일=인쇄 동일 소스다. → 스펙 018(썸네일)과 후속 인쇄 스펙은 **동일 이미지 참조 모델**을 재사용할 수 있다.

---

## 표 3. `dataUrl` / `storagePath` / `dual` / `none` 상태표

| 상태 | 의미 | 레거시 소비자 렌더 처리 | 현재 리빌드 read(스펙 012) 처리 | 확정 |
|---|---|---|---|---|
| `none` | 이미지 필드 없음 | `icon` 이모지 플레이스홀더 표시 (`mockup:1045`) | `imageReferences` 미집계 | CONFIRMED |
| `dataUrl`(base64) | `dataUrl`이 `data:` URL | `<img src=data:…>` + Canvas 직접 사용(오염 없음) | `read.ts:342-345` → `data:` 스킴 매치 → 이미지로 집계 | CONFIRMED |
| `dataUrl`(https 다운로드 URL) | **마이그레이션 후** `dataUrl`이 firebasestorage https URL(`?alt=media&token=…`) | `<img src=https…>` + `needsCors`가 crossOrigin 부여(`mockup:11646-11650`) | **`read.ts:346` → `INVALID_DATA_URL` 경고**(비-`data:` 문자열). 즉 현행 read는 https-in-dataUrl을 이미지로 인식하지 않음 ⚠️ | CONFIRMED(갭) |
| `storagePath`(단독) | 상대 경로만 존재 | 소비자앱은 **URL 미생성**(카운트만 `mockup:59`) | `read.ts:348-355` 상대경로 보존; URL 스킴이면 fatal `UNSAFE_STORAGE_PATH` | CONFIRMED |
| `dual`(둘 다) | `dataUrl`+`storagePath` 병존 | **런타임 우선순위: `dataUrl`만 읽음**(storagePath 무시). onerror시 storagePath→dataUrl **fallback 없음(NOT FOUND)** | `read.ts:357` → `dual`로 집계(하나 버리지 않음) | CONFIRMED |

**영속(persist) 시 dual 처리(운영자측, 소비자 무관):** `admin:6046-6049` — 병기된 `storagePath`가 있고 값이 아직 `data:` 문자열이면 무거운 `dataUrl`을 null로 strip. 다운로드 URL(비-`data:`)은 strip되지 않아 그대로 남음. `editorOverlayImages`도 조건부 strip `admin:6051-6055`. (CONFIRMED)

---

## 표 4. 책임 분리안 (@denn/shared / @denn/firebase / apps/mockup)

> 스펙 016 계약(**selector output에 raw item·image·base64·path 미포함**, `016:100,276,297`)을 깨지 않도록, 이미지는 **ID 기반 별도 projection/resolver 경계**로 분리한다. base64를 selector output에 직접 넣는 안은 금지.

| 계층 | 책임(권장) | 하지 않을 것 |
|---|---|---|
| **@denn/shared** (순수, IO 0) | (a) 레거시 우선 체인·게이트를 **순수 함수**로 고정: `dataUrl → sourceDataUrl → builderArtDataUrl → artDataUrl → originalDataUrl`, `generatedDetailPreview` 게이트(근거 `mockup:3025`,`11001`). (b) ID로 템플릿 이미지 참조를 **분류**해 최소 descriptor 반환: `{ kind: 'none'|'data-url'|'download-url'|'storage-path'|'dual', … }`. **표 3의 `dataUrl=https URL` 케이스를 위해 `download-url` 종류 추가**(현 `LegacyImageReference`엔 없음, `types.ts`). | 원본 base64/URL 문자열을 browse **selector**(스펙 016) output·diagnostic에 복제·직렬화 금지. 대형 dataUrl 복제 금지. |
| **@denn/firebase** (Storage/전송 지식) | (a) 필요 시 `storagePath → URL` 빌더(`encodeURIComponent`(전체 경로)→`%2F` + `?alt=media`, 근거 `mockup:848`/`location.ts`). **단, 소비자 경로는 대개 불필요**(URL이 이미 `dataUrl`에 있음). (b) firebasestorage URL 여부·CORS/`crossOrigin` 정책 소유(근거 predicate `mockup:11646-11650`). (c) 실제 GET/이미지 로드는 별도 승인 스펙. | import 시 네트워크 0. token/전체 URL을 오류·로그에 노출 금지(스펙 013 계약 `types.ts:36-48`). |
| **apps/mockup** (DOM/UI) | (a) 해석된 참조를 소비하는 **표시 전용 `<img>`**: `loading="lazy"`, `decoding="async"`. (b) **표시 썸네일은 `crossOrigin` 불필요**(Canvas에 그리지 않으므로 오염·CORS 실패 회피 — 표 5·6). (c) onerror → **중립 플레이스홀더**(icon/텍스트), 다른 상품 이미지 금지. (d) 비동기 해석이 생기면 스펙 015식 generation/abort로 stale·unmount 가드. | selector output에 이미지 주입 금지. 전 이미지 선로딩 금지. base64/URL/token을 data-attr·console·analytics에 기록 금지. |

**요지:** 우선순위·분류=`@denn/shared`(순수 비즈니스 규칙), URL/CORS/전송=`@denn/firebase`, DOM/lazy/onerror/stale=`apps/mockup`. 이미지 참조는 selector와 **분리된 ID 기반 resolver**로 노출한다.

---

## 표 5. CORS — 썸네일 표시 vs Canvas/인쇄 분리

| 구분 | crossOrigin 필요? | 근거 | 결론 |
|---|---|---|---|
| 단순 `<img>` 썸네일(표시만) | **불필요** | 일반 img는 cross-origin이라도 crossOrigin 없이 정상 표시. `needsCors`는 Canvas 오염 방지 목적(`mockup:11646-11650`) | 스펙 018은 crossOrigin/taint 문제를 **회피**(Canvas 미사용) |
| Canvas/인쇄(CORS-clean → PNG) | **필요** | tainted canvas=0×0 인쇄=주문 차단(legacy-analysis §7 L138). `crossOrigin='anonymous'` + 버킷 CORS(`origin:["*"]`,GET/HEAD) | **후속 인쇄 스펙**에서 다룸(스펙 018 제외) |

- 레거시 `crossOrigin` 조건성: `needsCors(v)` = `data:`/`blob:`이면 false, `/firebasestorage\.(googleapis\.com|app)/i`이면 true — 즉 **firebasestorage URL에만** 적용, `!this.crossOrigin`일 때만(`mockup:11656`,`11662`). (CONFIRMED)
- tint/export 경로는 **무조건** `crossOrigin='anonymous'` 후, 실패 시 **crossOrigin 없이 동일 URL 재시도**(`mockup:12138`, AGENT-SWEEP).
- **Canvas taint 여부는 썸네일 단계에서 검증 불가**(실제 Canvas draw+read 필요) → 인쇄 스펙에서 검증. 스펙 018에선 NOT APPLICABLE.

---

## 표 6. CONFIRMED / NOT DECIDED / 후속 실측 필요

| 항목 | 상태 | 비고 |
|---|---|---|
| 소비자앱이 `storagePath`로 URL 미생성(전적 `dataUrl` 의존) | **CONFIRMED** | `mockup` 전수 grep = `storagePath` 1회(`:59` 카운트) |
| 이미지 필드 우선순위 `dataUrl→sourceDataUrl→builderArt→art→original` + `generatedDetailPreview` 게이트 | **CONFIRMED** | `mockup:3025`,`11001` 동일 |
| 케이스=단일 `dataUrl`, 액자=동일 체인 공유(썸네일=인쇄) | **CONFIRMED** | 표 2 |
| 마이그레이션이 다운로드 URL을 `dataUrl`에 덮어씀 | **CONFIRMED** | `admin:15098-15099` |
| 현행 read(스펙012)가 `dataUrl`=https URL을 `INVALID_DATA_URL`로 경고(모델 갭) | **CONFIRMED(갭)** | `read.ts:346`. 스펙 018/후속에서 `download-url` 종류 추가 필요 |
| `storagePath` 상대경로, URL 스킴은 fatal 거부 | **CONFIRMED** | `read.ts:114-115,351`; `012:122,261` |
| 관측된 path prefix: `templates/`,`guides/`,`editor-overlays/{tplId}/`,`mockups/`,`proofs/`,`published/`,`admin/` | **CONFIRMED(prefix)** | 고유 파일명 미인용 |
| 다운로드 URL 형식(`?alt=media&token=…`)에 token 포함 | **CONFIRMED** | `getDownloadURL`(`admin:14839`) 결과에 token. 로그/복제 금지 대상 |
| `dual`시 런타임 우선순위=`dataUrl`, storagePath→dataUrl **onerror fallback 없음** | **CONFIRMED(NOT FOUND)** | 소비자 onerror 스왑 미발견 |
| `dataUrl` MIME whitelist·최대 바이트·base64 유효성 하드 검증 | **없음(NOT FOUND)** | 업로드는 `data:` 접두만 검사(`admin:14834`), SVG는 `imageSize` 0×0 특례(AGENT-SWEEP `admin:4438`) |
| **published/state.json 실제 템플릿이 URL인지 base64인지 비율** | **NOT VERIFIED** | 실제 GET 금지 → 실측은 사용자 승인·별도 스펙. read가 둘 다 보존하므로 계약은 둘 다 수용해야 함 |
| dual에서 소비자 우선순위·Storage 실패시 dataUrl fallback 정책 | **NOT DECIDED** | 레거시 런타임 fallback 근거 없음. 임의 확정 금지 |
| 다운로드 URL의 장기 유효성/토큰 회전/캐시 헤더 | **NOT VERIFIED** | 스펙 013 §254와 동일: fake fetch로 미검증 |
| `editorOverlayImages`의 고객 노출 여부 | **CONFIRMED(운영자 전용)** | 소비자앱 NOT FOUND → 썸네일 대상 아님 |

---

## 스펙 018 권장 최소 범위 / 명시적 제외

### 권장 최소 범위(WHAT)
1. **순수 이미지 참조 selector(@denn/shared):** 검증된 `CatalogDocumentV1`에서 **템플릿 ID → 이미지 참조 descriptor**를 만드는 순수 함수. 레거시 우선 체인+`generatedDetailPreview` 게이트를 한 곳에 고정. 종류=`none|data-url|download-url|storage-path|dual`. **base64/URL 원문을 browse selector(스펙 016) output엔 넣지 않고**, 이미지 resolver를 별도 경계로 분리.
2. **read 경계 보완(@denn/shared):** `dataUrl`이 https 다운로드 URL인 정상 케이스를 `INVALID_DATA_URL`이 아닌 별도 분류로 인식(현 갭 `read.ts:346`). 합성 fixture로만 검증.
3. **표시 전용 썸네일 컴포넌트(apps/mockup):** 해석된 참조를 `<img loading="lazy" decoding="async">`로 표시, **crossOrigin 미사용**, onerror→중립 플레이스홀더(가짜 상품 이미지 금지), lazy(전 이미지 선로딩 금지). 비동기 생기면 stale/unmount 가드.
4. **합성 fixture 단위/E2E:** 실데이터 없이 data-url/download-url/storage-path/dual/none·onerror·플레이스홀더·누출 0(DOM/console/analytics에 base64·전체 URL·token 없음) 검증.

### 명시적 제외(스펙 018에서 하지 않음)
- Canvas·인쇄·CORS-clean·crossOrigin·taint 검증(→ 후속 인쇄 스펙)
- 실제 Firebase GET·이미지 다운로드·`getDownloadURL` 호출·live 테스트
- `storagePath`→URL 실제 변환의 실데이터 검증(URL은 이미 `dataUrl`에 있어 소비자엔 대개 불필요)
- dual 런타임 우선순위·Storage 실패 fallback **확정**(NOT DECIDED — 근거 확보 후)
- 사진 업로드·zone·텍스트 편집·저장·주문·시안
- Firebase SDK/Auth/write·Rules·CORS·Hosting·배포
- 관리자 앱 이미지 UI 변경
- 신규 패키지 설치, object URL 도입(현 참조엔 revoke 필요 없음 — data:/https 직접 사용)

---

## 근거 파일 요약(핵심)

- `denn-mockup-tool.html:59`(storagePath 유일 사용=카운트), `:848`/`:908`(수동 URL 공식=state/share JSON 전용), `:3025`/`:3029`(우선체인·realTemplateSrc), `:11001`(imageSrc), `:11638-11667`(crossOrigin needsCors IIFE) — **CONFIRMED**
- `denn-admin.html:4155-4156`(realFrameTemplateSrc=dataUrl-only·게이트), `:6044-6055`(dual persist-strip), `:14833-14841`(uploadDataUrl→getDownloadURL), `:15093-15102`(마이그레이션이 URL을 dataUrl에 기록) — **CONFIRMED**
- `packages/shared/src/catalog/read.ts:114-115,342-359`(dataUrl `data:`만 유효·storagePath URL 스킴 fatal·image tally), `types.ts`(LegacyImageReference: none/data-url/storage-path/dual — **download-url 없음**)
- `packages/firebase/src/public-catalog/location.ts`(URL 공식), `reader.ts:20,129,140`·`types.ts:36-48`(5MiB=전체 JSON 한정·오류에 body/base64/token/full URL 없음)
- `packages/shared/src/catalog/browse/types.ts`(BrowseTemplate에 이미지 필드 없음), `apps/mockup/src/browse/BrowseFlow.tsx`(현 탐색 UI=텍스트 전용)
- 스펙: `012:110-122,244,261` · `013:214,254,276` · `016:25,100,276,297` · legacy-analysis `§4 L83`,`§7 L138`
- AGENT-SWEEP(읽기 전용 전수, 핵심은 위 CONFIRMED로 재검증): 관리자 대체필드 정의·마이그레이션 skip/strip·editorOverlayImages·admin crossOrigin 블록 등.

---

## 조사 준수 확인

- 코드·CSS·테스트·lockfile·운영본 **무변경**(읽기 전용). 실제 Firebase GET·이미지 다운로드·live 테스트 **미실행**. 스펙 018 구현·Canvas·업로드·저장·주문·신규 패키지·배포 **미착수**.
- 보고서에 실제 상품명·ID·전체 이미지 URL·base64·token **미복사**(path prefix만).
- 확인 불가 항목은 **NOT VERIFIED**, 코드 근거 없는 항목은 **NOT DECIDED**로 표기.
