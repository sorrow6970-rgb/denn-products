# 018 — 카탈로그 이미지 참조·안전한 썸네일 계약

## 목표 (WHY)

스펙 017의 텍스트 탐색 화면에 카탈로그가 실제로 보유한 케이스·액자 템플릿 이미지를 안전하게 표시한다.

레거시 소비자 앱의 이미지 우선순위와 `generatedDetailPreview` 게이트를 순수 계약으로 고정하고, 스펙 016의 “browse selector에 raw 이미지/base64/path를 넣지 않는다”는 경계를 유지한다. 이미지가 없거나 안전하게 사용할 수 없거나 로드에 실패해도 가짜 상품 이미지로 대체하지 않고 중립 placeholder로 복구한다.

근거 문서:

- `docs/codex-claude-handoff/reviews/2026-07-27-catalog-image-contract-investigation.md`
- `docs/rebuild/00-legacy-analysis.md` §4, §7
- `denn-mockup-tool.html`의 `templateSourceForDesign`, `imageSrc`, 템플릿 thumbnail 소비 위치
- 스펙 012·013·016·017

## 범위 (SCOPE)

### 포함

- `@denn/shared`
  - 검증된 `CatalogDocumentV1`에서 템플릿 ID로 이미지 참조를 조회하는 **별도 순수 image projection**
  - 레거시 우선순위:
    `dataUrl → sourceDataUrl → builderArtDataUrl → artDataUrl → originalDataUrl`
  - `generatedDetailPreview === true` 게이트
  - `data:` 이미지와 HTTPS 이미지 URL의 구분
  - `dataUrl`이 HTTPS Firebase 다운로드 URL인 정상 레거시 형태를 스펙 012 read report에서 `INVALID_DATA_URL`로 오진하지 않도록 보완
- `@denn/firebase`
  - 표시 가능한 원격 이미지 URL의 신뢰 경계
  - HTTPS 및 기존 Firebase Storage host/bucket 판정
  - URL 원문이나 token을 오류·진단에 복사하지 않는 안전한 결과 타입
- `apps/mockup`
  - 스펙 017의 케이스·액자 template card에 표시 전용 thumbnail 추가
  - `loading="lazy"`, `decoding="async"`
  - 이미지 없음·차단·로드 실패 시 중립 placeholder
  - 이미지와 텍스트 label의 접근 가능한 결합
- 합성 fixture 기반 unit/E2E
- 모바일·landscape·desktop viewport 회귀 검증

### 제외(하지 않을 것)

- 실제 Firebase GET, 이미지 다운로드, `test:live:*`
- Firebase SDK, `getDownloadURL`, Auth, write
- `storagePath`를 URL로 변환하거나 fallback으로 사용하는 기능
- Canvas draw, 인쇄, PNG export, CORS-clean/taint 검증
- `crossOrigin` 설정 또는 레거시 전역 Image setter monkey-patch 이식
- 이미지 업로드, object URL, Blob cache
- prefetch/preload 또는 모든 이미지를 선로딩하는 기능
- retry, persistent cache, service worker, offline image cache
- 이미지 편집, crop, zone, 색상변경, 확대 모달
- 선택 저장, 시안공간, 주문, 카카오 연결
- 관리자 앱 변경
- 실제 상품 데이터·이미지·URL·token을 fixture/문서/스크린샷에 저장
- browse selector 타입에 raw 이미지/base64/path 추가
- 신규 패키지 설치
- Firebase Rules/CORS/Hosting/배포 변경
- dual 참조에서 `storagePath` fallback을 임의로 추가

## 대상 (WHERE)

주요 대상:

- `packages/shared/src/catalog/images/**` 신규
- `packages/shared/src/catalog/read.ts`
- `packages/shared/src/catalog/types.ts`
- `packages/shared/src/catalog/index.ts`
- 관련 합성 fixture/unit test
- `packages/firebase/src/public-images/**` 신규 또는 책임이 명확한 동등 경로
- `packages/firebase/src/index.ts`
- `apps/mockup/src/browse/BrowseFlow.tsx`
- `apps/mockup/src/browse/browse.css`
- 필요 시 `apps/mockup/src/browse/TemplateThumbnail.tsx`
- `tests/e2e/mockup-browse.spec.ts`

참조만 하고 변경하지 않을 대상:

- `denn-mockup-tool.html`
- `denn-admin.html`
- `apps/admin/**`
- `poc/**`
- Firebase 설정·Rules
- 디자인 PNG

## 구현 지시 (WHAT / HOW)

### 1. 기존 계약을 먼저 고정

구현 전 다음 불변조건을 코드 주석과 테스트 근거에 명시한다.

1. 소비자 레거시는 `storagePath`를 이미지 URL로 변환하지 않는다.
2. 마이그레이션 후 `dataUrl`에는 `data:` URL뿐 아니라 HTTPS Firebase 다운로드 URL도 존재할 수 있다.
3. 액자 이미지 우선순위는 다음과 같다.

   ```text
   dataUrl
   sourceDataUrl
   builderArtDataUrl
   artDataUrl
   originalDataUrl
   ```

4. `generatedDetailPreview === true`이면 그 템플릿은 고객용 실제 아트 이미지로 노출하지 않는다.
5. `storagePath` 단독 참조는 이번 스펙에서 표시 불가다.
6. dual은 레거시처럼 `dataUrl` 계열만 소비한다. 로드 실패 시 `storagePath` fallback을 만들지 않는다.

### 2. `@denn/shared` image projection

스펙 016 browse selector와 분리된 순수 경계를 만든다.

권장 공개 형태:

```ts
type CatalogTemplateKind = "case" | "frame";

type CatalogImageProjection =
  | { status: "available"; sourceKind: "data-image" | "https-image"; value: string }
  | { status: "unavailable"; reason: "none" | "generated-preview" | "invalid-reference" };

function projectCatalogTemplateImage(
  document: CatalogDocumentV1,
  input: { templateKind: CatalogTemplateKind; templateId: string },
): CatalogImageProjection;
```

명칭은 저장소 관례에 맞게 조정할 수 있으나 다음 계약은 변경하지 않는다.

- 입력은 검증된 `CatalogDocumentV1`과 kind+ID다.
- 출력은 browse option에 합치지 않는 별도 projection이다.
- 원본 template 객체를 반환하지 않는다.
- ID를 찾지 못하면 throw하지 않고 `unavailable`.
- 입력 document를 변경하지 않는다.
- 이미지 문자열을 decode, fetch, clone, base64 재인코딩하지 않는다.
- 반환 `value`는 원본 문자열 참조 하나뿐이다. 별도 JSON clone을 만들지 않는다.
- issue/diagnostic에는 `value`, URL, token, base64, source path를 넣지 않는다.
- `icon`은 이미지 source로 반환하지 않는다. placeholder UI의 보조 label 후보일 뿐이다.

#### 소스 분류

- `data-image`
  - 문자열이 `data:`로 시작하는 기존 호환 형태
  - MIME whitelist를 근거 없이 새로 만들지 않는다.
  - 빈 문자열은 unavailable
- `https-image`
  - `URL` 파싱이 가능하고 protocol이 정확히 `https:`
  - `http:`, `javascript:`, `blob:`, 상대 URL, 공백-only, 파싱 실패는 unavailable
- `storagePath`
  - projection source로 사용하지 않는다.
- 대체 필드도 동일한 분류 규칙을 적용한다.

### 3. 스펙 012 read report 보완

현재 `dataUrl`의 비-`data:` 문자열을 모두 `INVALID_DATA_URL` warning으로 기록하는 동작을 다음처럼 좁힌다.

- 유효한 `data:` 값: 기존처럼 유효
- 파싱 가능한 `https:` URL: 레거시 정상 image reference로 인정하며 `INVALID_DATA_URL`을 만들지 않음
- 그 외 문자열: 기존 `INVALID_DATA_URL` warning 유지
- `storagePath`의 URI scheme fatal 거부 계약은 변경하지 않음
- whole-catalog image reference 집계는 기존 의미를 보존하되, HTTPS-in-`dataUrl`도 dataUrl 계열 참조로 집계
- 기존 스펙 012 fixture·guard·unknown 보존·non-finite·deep contract 테스트를 깨지 않음

`LegacyImageReference` 타입을 바꿔야 한다면 `download-url` 또는 의미가 같은 명시적 종류를 추가할 수 있다. 기존 `data-url|storage-path|dual` 소비자가 깨지지 않는지 전수 검색하고 테스트한다.

### 4. `@denn/firebase` 원격 이미지 신뢰 경계

`@denn/shared`의 `https-image`를 곧바로 DOM에 넣지 않는다. `@denn/firebase`가 표시 허용 여부를 판정한다.

허용 조건:

- protocol은 `https:`
- hostname은 기존 Firebase Storage 공개 이미지에 사용되는 host만
  - `firebasestorage.googleapis.com`
  - 조사에서 실제로 근거가 확인된 동등 Firebase Storage host가 있으면 테스트 근거와 함께 최소 추가
- URL path가 기존 프로젝트 bucket `denn-products.firebasestorage.app`을 가리킴
- userinfo(username/password) 없음

반환 타입:

```ts
type PublicImageSourceResult =
  | { ok: true; src: string; kind: "data-image" | "firebase-download-image" }
  | { ok: false; reason: "missing" | "invalid" | "untrusted" };
```

정확한 이름은 조정 가능하다.

안전 계약:

- `data-image`는 네트워크 URL 판정 없이 통과
- 신뢰하지 않는 HTTPS URL은 fetch하지 않고 실패
- URL query/token은 결과의 `src` 이외 필드, 오류, 로그, DOM text, ARIA, data attribute에 복사하지 않음
- import 시 네트워크 0
- fetch/HEAD/Image preload 0
- `storagePath` URL builder는 이번 스펙에서 추가하지 않음

### 5. thumbnail UI

스펙 017 template card 내부에만 thumbnail을 추가한다.

- case/frame 모두 같은 표시 컴포넌트 계약 사용
- 이미지가 허용되면:
  - `<img loading="lazy" decoding="async">`
  - 의미 중복을 피하도록 적절한 `alt` 결정
    - card의 가시적 템플릿명이 이미 접근 가능한 이름이면 thumbnail은 `alt=""`
  - 고정 aspect-ratio box
  - `object-fit: contain`을 기본으로 사용해 원본 전체가 잘리지 않게 함
- unavailable 또는 `img.onerror`:
  - 중립 placeholder 표시
  - “이미지 없음”처럼 이해 가능한 짧은 텍스트 또는 `aria-hidden` 장식 + 기존 card label 유지
  - 다른 상품 이미지, 임의 stock image, 가짜 thumbnail 금지
- `onerror` 이후 같은 실패 URL을 반복 재설정하여 loop를 만들지 않음
- 선택/키보드/focus/44px 계약 유지
- 이미지가 느리거나 실패해도 template 선택 가능
- 이미지 로드 전후 card 크기가 변하지 않도록 aspect-ratio 공간 예약
- 모든 template 이미지를 JS로 선로딩하지 않음
- React state에는 template ID별 최소 실패 상태만 허용한다. URL/token을 별도 상태·로그로 복제하지 않는다.

#### 원문 노출의 현실적 허용 범위

이미지를 표시하려면 source 문자열은 브라우저의 `img[src]`에 존재해야 한다. 따라서 “DOM 전체에 URL/base64가 0”을 완료 조건으로 사용하지 않는다.

허용 위치:

- 실제 thumbnail의 `img[src]`
- image projection/resolver의 메모리 내 `value/src`

금지 위치:

- `textContent`
- 사용자 메시지
- `aria-*`
- `data-*`
- diagnostic/error 객체
- console
- analytics
- localStorage/sessionStorage/IndexedDB
- URL query/hash
- screenshot 파일명·테스트 제목·문서

### 6. 상태 변경과 catalog 교체

- catalog document가 바뀌면 현재 ID로 projection을 다시 계산한다.
- 이전 이미지의 `onerror`가 새 catalog/template 상태를 덮지 않게 React key 또는 generation에 준하는 식별 경계를 둔다.
- 실제 fetch controller는 만들지 않는다. 브라우저 `<img>` 로드 수명주기만 사용한다.
- unmount 후 setState warning/console error가 없어야 한다.

### 7. CSS·디자인

- `@denn/ui/theme.css`의 기존 웜 토프 토큰만 사용
- 새 브랜드 색상 literal 금지
- placeholder도 기존 surface/ink/muted/border 토큰 사용
- 320px에서 thumbnail·label·선택 표시가 card 폭을 밀어내지 않음
- 긴 이름 wrap 유지
- landscape 낮은 높이에서도 가로 overflow 0
- `prefers-reduced-motion` 존중
- 필수 정보나 선택 상태를 이미지·색상만으로 전달하지 않음

## 검증 절차 (VERIFY)

### A. 정적·경계 검사

- [ ] 신규 의존성 0, lockfile diff 0
- [ ] `@denn/shared`는 React/Firebase/IO 의존 0 유지
- [ ] `@denn/firebase → @denn/shared` 단방향 유지
- [ ] browse selector output 타입에 image/base64/path 필드 추가 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·admin·디자인 PNG 무변경
- [ ] 실제 네트워크·live test·deploy 0

### B. unit — `@denn/shared`

합성 식별자와 작은 합성 이미지 문자열만 사용한다.

- [ ] case `dataUrl` 선택
- [ ] frame 우선순위 5단계 각각
- [ ] 앞 필드가 빈/무효일 때 다음 유효 필드 선택
- [ ] `generatedDetailPreview === true` → unavailable
- [ ] unknown template ID/kind → unavailable, throw 0
- [ ] `data:` → data-image
- [ ] valid HTTPS → https-image
- [ ] http/javascript/blob/relative/공백/invalid → unavailable
- [ ] storagePath-only → unavailable
- [ ] dual → dataUrl 계열만 선택, storagePath fallback 0
- [ ] 입력 deep-freeze 상태에서 비변형
- [ ] 원본 template/unknown 필드가 결과로 누출되지 않음
- [ ] readLegacyCatalog: HTTPS-in-dataUrl은 `INVALID_DATA_URL` warning 0
- [ ] 기존 malformed dataUrl warning과 unsafe storagePath fatal 유지
- [ ] 스펙 012 기존 테스트 무회귀

### C. unit — `@denn/firebase`

- [ ] data-image 통과
- [ ] 올바른 Firebase Storage HTTPS/bucket 통과
- [ ] 다른 host/bucket, http, userinfo, malformed URL 거부
- [ ] token/query가 error/reason/직렬화된 실패 결과에 없음
- [ ] import/create 호출 네트워크 0
- [ ] storagePath URL 생성 0

### D. E2E — route/network 차단 상태

실제 Firebase·외부 이미지 요청이 발생하지 않도록 합성 fixture와 route interception을 사용한다.

필수 시나리오:

1. 작은 합성 `data:image/...` thumbnail 표시
2. 이미지 없는 template → placeholder
3. 허용되지 않은 HTTPS → 요청 전 placeholder, 외부 hit 0
4. 허용 형식의 합성 Firebase URL → route가 작은 합성 이미지 응답
5. 이미지 route 실패 → placeholder, card 선택은 정상
6. case/frame 선택 흐름과 완료 summary 유지
7. 이미지 로드 전후 layout shift로 control이 폭 밖으로 나가지 않음
8. keyboard Enter/Space/focus-visible 무회귀
9. 스펙 015 loading/error/retry 무회귀
10. admin endpoint/image request 0

누출 검사:

- [ ] 합성 secret marker가 DOM text/ARIA/data attributes/console/storage/location에 없음
- [ ] 합성 marker는 해당 thumbnail `img[src]`에서만 허용
- [ ] diagnostic code/path/원본 template 객체가 화면에 없음

viewport:

- [ ] 최소 `320×568`, `390×844`, `844×390`, `932×390`, `768×1024`, `1280×800`
- [ ] page horizontal overflow 0
- [ ] interactive control 44×44 이상
- [ ] image box가 viewport 밖으로 나가지 않음
- [ ] axe serious/critical 0
- [ ] console error 0

### E. 기본 명령

- [ ] `corepack pnpm install --frozen-lockfile`
- [ ] frozen 실행 전후 `pnpm-lock.yaml` diff 0
- [ ] `corepack pnpm run format:check`
- [ ] `corepack pnpm run lint`
- [ ] `corepack pnpm run typecheck`
- [ ] `corepack pnpm run test:unit`
- [ ] `corepack pnpm run build`
- [ ] `corepack pnpm run test:e2e`
- [ ] `corepack pnpm run check`
- [ ] E2E exit 0, preview 포트 해제, 저장소 소속 신규 Vite/esbuild 잔류 0
- [ ] `git diff --check`

### F. 수동 시각 확인

합성 fixture에서만 확인한다.

- [ ] mobile/desktop에서 이미지·placeholder·label 균형
- [ ] 이미지 비율이 달라도 card가 밀리거나 잘리지 않음
- [ ] 선택 체크·“선택됨”·focus ring이 thumbnail 때문에 가려지지 않음

실제 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱과 실제 상품 이미지는 이번 자동 완료 조건이 아니며 `NOT TESTED`로 기록한다.

## 완료 정의 (DONE)

다음을 모두 만족해야 자동검증 단계 완료다.

- 이미지 projection이 browse selector와 분리되어 있다.
- 레거시 5단계 우선순위와 generated-preview 게이트가 테스트로 고정됐다.
- HTTPS-in-dataUrl read 오진이 해소되고 스펙 012 계약이 회귀하지 않았다.
- 신뢰하지 않는 원격 URL은 요청 전에 차단된다.
- template card가 이미지·placeholder 양쪽에서 선택 가능하고 접근 가능하다.
- URL/base64/token은 허용된 `img[src]`와 resolver 메모리 외에 노출되지 않는다.
- 실제 네트워크·Firebase 변경·Canvas·배포 없이 모든 자동 게이트가 통과한다.
- 코드/test 커밋과 DONE/handoff 문서 커밋을 분리한다.
- HEAD=origin, ahead/behind 0/0, clean 상태로 Codex 재검증을 요청한다.

이 DONE은 **합성 이미지 기반 thumbnail 자동검증 완료**다. 실제 운영 이미지·실기기·Canvas CORS-clean·출시 완료를 의미하지 않는다.

## 위험 (RISK)

- token 포함 Firebase 다운로드 URL은 이미지를 표시하는 동안 `img[src]`에 존재한다. 이를 “DOM 0”으로 허위 보고하지 말고 허용 위치를 제한한다.
- base64 data URL은 크기가 클 수 있다. decode/clone/직렬화/선로딩으로 메모리를 추가 증폭하지 않는다.
- 단순 thumbnail 성공은 Canvas CORS-clean을 증명하지 않는다.
- 실제 published catalog의 base64/HTTPS 비율은 확인하지 않았다.
- 다운로드 URL token의 장기 유효성·회전·캐시 정책은 확인하지 않았다.
- `storagePath` fallback이 없으므로 dataUrl 로드 실패는 placeholder가 정상 동작이다.
- arbitrary HTTPS를 shared가 구문상 분류하더라도 firebase 신뢰 경계가 실제 DOM 전달 전에 차단해야 한다.
- 이미지 로드 순서가 비결정적이므로 stale `onerror`가 새 선택을 덮지 않게 해야 한다.

롤백:

1. DONE/handoff 문서 커밋
2. 앱·패키지 코드/test 커밋

순서로 역 `git revert`. Firebase·운영·배포 롤백은 없어야 한다.

## QUESTIONS

- 없음. 다음 항목은 이번 스펙에서 결정하지 않고 명시적으로 제외한다.
  - 실제 운영 이미지 구성 비율
  - storagePath URL 변환/fallback
  - Canvas CORS-clean
  - 다운로드 token 수명·회전
  - 실제 이미지 MIME/크기 상한

---

### DONE (Claude) — 2026-07-27 (합성 이미지 자동검증 완료)

- **@denn/shared image projection(순수):** `catalog/images/project.ts` `projectCatalogTemplateImage(document,{templateKind,templateId})` → `available{sourceKind:data-image|https-image,value}` | `unavailable{reason:none|generated-preview|invalid-reference}`. browse selector와 분리(스펙 016 output 이미지 필드 0), 원본 template 미반환·decode/fetch/clone 0·`value`=원본 문자열 1개. 우선순위 frame `dataUrl→sourceDataUrl→builderArtDataUrl→artDataUrl→originalDataUrl`·case `dataUrl`만, `generatedDetailPreview` 게이트, `data:`/`https:` 분류(그 외 건너뜀), unknown id/kind→unavailable(throw 0), storagePath 비소스·dual=dataUrl 계열만.
- **read.ts 보완:** https dataUrl(마이그레이션 다운로드 URL)을 `INVALID_DATA_URL` 대신 dataUrl 계열 참조로 인정·집계. `data:` 유효 유지·그 외 문자열 경고 유지·storagePath URI-scheme fatal 불변. 스펙 012 무회귀.
- **@denn/firebase 신뢰 경계(no SDK/네트워크):** `public-images/trust.ts` `resolvePublicImageSource` — data-image 통과, https는 host `firebasestorage.googleapis.com`+bucket path `/v0/b/denn-products.firebasestorage.app/o/`+userinfo 없음만 통과(그 외 untrusted/invalid), token은 성공 `src`에만·실패/오류 미포함, fetch/preload/storagePath→URL 0.
- **thumbnail(apps/mockup):** `TemplateThumbnail` 표시 전용 `<img loading=lazy decoding=async alt="">`(projection→신뢰 경계), unavailable/onError→중립 placeholder(같은 aspect box=layout shift 0), 실패는 `failedSrc===src` 추적(stale onError·loop·unmount 경고 0), crossOrigin/Canvas/object URL 0. 문자열은 `img[src]`+resolver 메모리에만.
- **게이트:** frozen install exit 0·lockfile diff 0·신규 의존성 0 / format·lint·typecheck / **unit 237** / build(mockup JS gzip 68.37KB, admin 61.09 무변경) / **e2e 47 PASS·exit 0**(스펙 012/015/016/017 무회귀; 종료 후 preview 포트 미점유·저장소 vite/esbuild 잔류 0) / check PASS / `git diff --check` clean.
- **E2E(합성+route interception만):** data:image 표시·routed Firebase 이미지 로드(hit 1)·비신뢰 https 요청 전 차단(외부 hit 0)·이미지 없음/preview placeholder·route 실패→placeholder+선택 정상·token marker는 `img[src]`에만(text/aria/data/console/storage/location 0)·admin endpoint 0. 이미지 viewport matrix(320×568·390×844·844×390·932×390·768×1024·1280×800) overflow 0·44×44·box in-frame·axe 0·console 0. 실제 Firebase GET·이미지 다운로드·`test:live:*` 미실행.
- **시각 근거:** `docs/rebuild/results/spec-018/browse-{mobile-390x844,desktop-1280x800}.png`(합성만, 운영 데이터/URL/token 0). **스펙 017 스크린샷·`docs/rebuild/design/*-B.png`·운영 HTML·Firebase 설정/Rules·admin·POC hash UNCHANGED.**
- **NOT TESTED(정직 기록):** 실제 4환경·실제 200% 확대·**실제 운영 이미지**·Canvas CORS-clean. published base64/https 비율·token 수명은 NOT VERIFIED. 이 DONE은 자동검증 단계이며 출시 완료가 아님.
- **커밋:** 코드/test와 문서/핸드오프 분리(`spec 018:`). 핸드오프 `docs/2026-07-27-spec-018-catalog-image-thumbnail-handoff.md`.

### Codex 재검증 요청 — HEAD 갱신 후 판정 대기.
