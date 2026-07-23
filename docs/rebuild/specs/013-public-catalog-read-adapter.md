# 013 — Firebase 공개 카탈로그 읽기 어댑터

## 목표 (WHY)

기존 고객 앱이 사용하는 Firebase Storage 공개 객체 `published/state.json`을 신규 리빌드에서도 안전하게 읽도록 `@denn/firebase`에 읽기 전용 전송 경계를 만든다.

이번 단계는 실제 운영 URL을 호출하거나 앱에 연결하지 않는다. URL 구성, HTTP·timeout·응답 크기·JSON·Catalog V1 검증 실패를 구분하고, 스펙 012 read boundary를 통과한 데이터만 성공으로 반환하도록 합성 fetch로 계약을 고정한다.

## 범위 (SCOPE)

### 포함

- `@denn/firebase` 공개 카탈로그 read-only adapter
- bucket `denn-products.firebasestorage.app`, object `published/state.json`
- 결정적 Firebase Storage media REST URL
- 주입 가능한 fetch transport
- timeout·외부 AbortSignal·자원 정리
- 동일 reader의 동시 중복 요청 병합
- HTTP/network/timeout/abort/크기/JSON/catalog 오류 구분
- `readLegacyCatalog`를 통한 legacy-v0→Catalog V1 검증
- 안정적인 error category/code/retryable/correlationId
- 민감 원문 없는 fake-response unit/integration 테스트

### 제외(하지 않을 것)

- 실제 Firebase·인터넷·운영 파일 요청
- Firebase SDK·Auth·Firestore·Storage write/delete
- `admin/state.json`, `backup.json`, `?share=`, `?space=` 읽기
- 앱 연결 및 loading/error UI
- localStorage·IndexedDB·Service Worker·Cache API·persistent cache
- stale fallback·자동 retry/backoff
- 실데이터·35MB 백업 fixture
- 운영 데이터 변환·저장·발행
- Firebase 설정·Rules·Hosting·배포
- 로그 수집 서비스

## 대상 (WHERE)

- `packages/firebase/src/public-catalog/*` 또는 동등한 구조
- `packages/firebase/src/index.ts`
- `packages/firebase/src/**/*.test.ts`
- `packages/firebase/package.json`은 기존 `@denn/shared` 의존 범위만 사용
- 꼭 필요한 기존 테스트 설정

근거:

- `denn-mockup-tool.html` 공개 `published/state.json` fetch
- `docs/rebuild/00-legacy-analysis.md` §4·§5·§7
- 데이터 호환·오류 관측·보안·성능 결정서
- 스펙 012 `@denn/shared` 카탈로그 읽기 계약

## 구현 지시 (WHAT / HOW)

1. **기준선과 가드**
   - `rebuild/modern-studio`, HEAD=origin, clean을 확인한다.
   - 운영 HTML·Firebase 설정/Rules·POC·PNG hash를 기록하고 종료 시 무변경을 확인한다.
   - 테스트에서 실제 도메인 요청이 발생하지 않도록 global fetch를 사용하지 않는다.

2. **공개 위치와 URL**
   - 공개 위치를 readonly 상수로 정의한다.

     ```ts
     { bucket: "denn-products.firebasestorage.app",
       objectPath: "published/state.json" }
     ```

   - URL 의미:

     ```text
     https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-object>?alt=media
     ```

   - object path 전체를 인코딩하여 `/`가 `%2F`가 되게 한다.
   - timestamp/random cache-buster를 넣지 않는다. URL은 결정적이어야 한다.
   - 토큰·비밀번호·사용자 입력을 URL에 받지 않는다.
   - 이 위치 정보는 공개 Firebase 설정이며 비밀이 아님을 문서화한다.

3. **transport**
   - DOM `Response` 전체가 아닌 최소 `FetchLike`/response interface로 fake 주입이 가능해야 한다.
   - production 기본 transport가 있다면 `globalThis.fetch`는 실행 시 확인하고 import 시 요청하지 않는다.
   - 테스트는 주입 transport만 사용한다.
   - GET, 인증 header/body 없음, `cache: "no-store"` 또는 동등 fresh-read 의도.
   - body는 한 번만 소비한다.

4. **API**

   ```ts
   createPublicCatalogReader(options): PublicCatalogReader
   reader.load({ correlationId, signal? }): Promise<PublicCatalogLoadResult>
   ```

   - correlationId는 호출자가 주는 비민감 opaque 값이며 빈 값은 요청 전 `INVALID_REQUEST`.
   - 성공은 `CatalogDocumentV1`, `CatalogReadReport`, source=`"network"`를 포함한다.
   - 원문 text·전체 JSON·base64를 결과 메타데이터에 중복 보관하지 않는다.

5. **timeout·취소**
   - 기본 timeout named constant 권장값 `10_000ms`.
   - 0·음수·비유한 timeout은 거부한다.
   - 내부 AbortController로 timeout을 취소한다.
   - caller signal 선행 abort=`REQUEST_ABORTED`, timeout=`NETWORK_TIMEOUT`.
   - 모든 종료 경로에서 timer·외부 abort listener를 정리한다.
   - 늦은 abort/timeout/응답이 확정 결과를 덮어쓰지 않는다.
   - fake timer/제어 Promise를 사용하고 고정 sleep을 쓰지 않는다.

6. **동시 요청 병합**
   - 같은 reader의 진행 중 공개 요청은 fetch 1회로 병합한다.
   - settle 후 in-flight를 비워 다음 load는 새 fetch를 수행한다.
   - caller별 signal이 충돌하지 않게 다음 중 하나를 명시하고 테스트한다.
     - caller abort는 해당 caller만 실패시키고 underlying fetch는 유지
     - 또는 reader 단위 취소 API로 제한
   - 첫 caller 취소가 다른 caller를 임의로 실패시키면 안 된다.

7. **응답 크기**
   - 초기 상한 named constant/options=`5 MiB`.
   - 잘못된 상한은 요청 전에 거부한다.
   - 유효한 Content-Length 초과는 body 소비 전 `RESPONSE_TOO_LARGE`.
   - body 수신 후에도 `TextEncoder` 또는 동등한 UTF-8 byte 길이를 검사한다.
   - `string.length`를 byte로 오인하지 않는다.
   - body 내용/base64를 오류에 넣지 않는다.
   - streaming 조기 중단은 이번 범위가 아니다.

8. **오류 계약**

   | 상황 | category | code | retryable |
   |---|---|---|---|
   | correlation/config | VALIDATION | `INVALID_REQUEST` | false |
   | caller 취소 | NETWORK | `REQUEST_ABORTED` | false |
   | timeout | NETWORK | `NETWORK_TIMEOUT` | true |
   | fetch reject/offline | NETWORK | `NETWORK_UNAVAILABLE` | true |
   | HTTP 404 | NETWORK | `PUBLIC_CATALOG_NOT_FOUND` | false |
   | HTTP 401/403 | AUTH | `PUBLIC_CATALOG_FORBIDDEN` | false |
   | HTTP 429 | NETWORK | `PUBLIC_CATALOG_RATE_LIMITED` | true |
   | HTTP 5xx | NETWORK | `PUBLIC_CATALOG_SERVER_ERROR` | true |
   | 기타 non-2xx | NETWORK | `PUBLIC_CATALOG_HTTP_ERROR` | 명시 |
   | 크기 초과 | VALIDATION | `RESPONSE_TOO_LARGE` | false |
   | JSON parse | VALIDATION | `INVALID_JSON` | false |
   | catalog fatal | VALIDATION | `INVALID_CATALOG` | false |
   | 예상 밖 | UNKNOWN | `UNEXPECTED_PUBLIC_CATALOG_ERROR` | false |

   - error는 category/code/retryable/correlationId와 최소 safe metadata만 가진다.
   - HTTP status는 허용하되 URL 전체·body·Firebase 원문은 금지한다.
   - catalog 상세는 스펙 012 issue code/path만 허용한다.
   - 빈 catch, console, 실패→기본 카탈로그 fallback 금지.

9. **JSON·Catalog 검증**
   - text 1회 읽기→크기 검사→`JSON.parse`→`readLegacyCatalog`.
   - legacy-v0와 유효 V1은 성공 가능하다.
   - 스펙 012 fatal은 `INVALID_CATALOG`.
   - warning만 있으면 성공하되 report에서 숨기지 않는다.
   - adapter가 카탈로그를 추가 수정하지 않는다.

10. **retry·cache**
    - 한 번의 명시적 load만 수행하며 자동 retry 없음.
    - retryable은 후속 앱 UI 판단 정보다.
    - persistent cache/stale fallback/장기 성공 캐시 없음.
    - in-flight 병합만 허용하며 실패를 이전 성공으로 바꾸지 않는다.

11. **placeholder 정합성**
    - `FIREBASE_NOT_IMPLEMENTED`는 SDK/auth/write가 미구현임을 정확히 나타내도록 조정할 수 있다.
    - 공개 REST read 하나로 전체 `DesignRepositoryPort`나 SDK가 구현됐다고 표시하지 않는다.
    - `@denn/firebase`→`@denn/shared` 방향을 유지한다.

12. **필수 테스트**
    - 고정 URL·encoded path·GET·no-store·body/header 없음
    - global fetch 0, 주입 fetch 호출 수
    - 정상 legacy와 V1 성공, warning 전달
    - 404/403/429/500/기타 HTTP 매핑
    - fetch reject, timeout, caller abort, 늦은 완료, timer/listener 정리
    - 동시 2회→fetch 1회, settle 후 새 fetch
    - Content-Length 사전 초과·실제 UTF-8 byte 초과
    - invalid JSON·invalid catalog code/path
    - error에 token/base64/body/full URL 없음
    - 실제 network·Firebase·브라우저 저장소 0

13. **앱·운영 영향**
    - 두 앱은 reader를 import/call하지 않는다.
    - Firebase SDK/env/config를 앱 bundle에 넣지 않는다.
    - 앱 build·E2E 기준선을 유지한다.
    - Rules/deploy 검증은 변경 없음으로 `NOT APPLICABLE`이며 PASS로 꾸미지 않는다.

14. **문서·커밋**
    - endpoint 근거, error table, timeout·size·dedupe 정책을 보고서에 기록한다.
    - 스펙 하단 `### DONE (Claude)`에 변경·테스트·미검증·위험을 append한다.
    - 코드/test와 문서/핸드오프 커밋을 분리하고 `spec 013:` 접두사를 사용한다.
    - push 후 HEAD=origin, `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] frozen install, lockfile diff 0
- [ ] format/lint/typecheck/unit/build/e2e/check
- [ ] 고정 URL과 기존 공개 위치 일치
- [ ] fake fetch만 사용, 실제 network 0
- [ ] legacy/V1 성공과 CatalogReadReport 전달
- [ ] HTTP/network/timeout/abort/size/JSON/catalog 오류 매핑
- [ ] 민감 원문/body/base64/token 미포함
- [ ] UTF-8 byte 기준 5 MiB
- [ ] timeout/abort 자원 정리·경합
- [ ] 동시 fetch 1회, settle 후 새 fetch
- [ ] auto retry/persistent cache/stale fallback 0
- [ ] 앱 import/call 0, bundle 비정상 증가 0
- [ ] Firebase SDK·신규 의존성 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 무변경, deploy 0

## 완료 정의 (DONE)

- `@denn/firebase`에 고정 공개 카탈로그 read-only adapter가 존재한다.
- 성공은 HTTP·크기·JSON·스펙 012 검증을 모두 통과한 Catalog V1만 반환한다.
- 실패는 안정적인 오류 계약으로 구분되고 원문 데이터를 노출하지 않는다.
- timeout·abort·동시 요청 경합과 정리가 자동검증된다.
- 실제 네트워크·앱·SDK·쓰기·배포는 건드리지 않는다.

## 위험 (RISK)

- fake fetch는 실제 Firebase CORS·cache header·지연을 검증하지 못한다. 실제 read는 사용자 승인과 별도 스펙에서 수행한다.
- 5 MiB는 약 492KB로 관측된 공개 카탈로그에 여유를 둔 초기값이다. 초과 시 몰래 높이지 않고 자산 외부화·성능을 검토한다.
- in-flight와 caller 취소 결합은 경합 위험이 있으므로 다른 caller까지 취소하지 않게 테스트로 고정한다.
- `no-store`는 fresh-read 의도이며 offline 지원이 아니다.
- 롤백은 코드/test와 문서 커밋을 역순 revert한다. 운영/Firebase 롤백은 없어야 한다.

### QUESTIONS

- 없음. 안전한 병합·caller 취소를 위해 API 변경이 필요하면 임의 결정하지 말고 선택지·영향을 기록하고 대기한다.
- (해소) §6 caller 취소는 **옵션 A**를 채택: caller abort는 해당 caller만 `REQUEST_ABORTED`로 실패시키고 공유 fetch는 계속 진행(다른 caller는 정상 완료). 테스트로 고정. API 변경 불필요.

### DONE (Claude) — 2026-07-23

**요약:** `@denn/firebase`에 고정 공개 `published/state.json` read-only REST adapter(`createPublicCatalogReader`)를 구현. 주입 fake fetch만으로 URL·timeout/abort·5MiB·HTTP/JSON/Catalog V1 오류·민감정보 비노출·동시 병합을 검증. 실제 네트워크·Firebase SDK·앱 연결·retry/cache 없음.

**변경 파일 (코드/test):**
- `packages/firebase/src/public-catalog/location.ts` — `PUBLIC_CATALOG_LOCATION`(bucket `denn-products.firebasestorage.app` · object `published/state.json`) + `buildPublicCatalogUrl`(결정적 media URL, `encodeURIComponent`→`%2F`, `?alt=media`, cache-buster 없음).
- `packages/firebase/src/public-catalog/types.ts` — `FetchLike`/`FetchLikeResponse`, error category/code, `PublicCatalogError`, `PublicCatalogLoadResult`, reader/options 계약.
- `packages/firebase/src/public-catalog/reader.ts` — `createPublicCatalogReader`, 검증·매핑·timeout·dedup.
- `packages/firebase/src/public-catalog/index.ts` — public 배럴.
- `packages/firebase/src/index.ts` — `export * from "./public-catalog"`, `FIREBASE_NOT_IMPLEMENTED` 문구를 SDK/auth/write 미구현으로 정정(REST read는 별개).
- `packages/firebase/src/public-catalog/reader.test.ts` — 계약 테스트.

**endpoint 근거:** `denn-mockup-tool.html` L848의 공개 fetch `https://firebasestorage.googleapis.com/v0/b/denn-products.firebasestorage.app/o/`+`encodeURIComponent('published/state.json')`+`?alt=media`. 레거시의 `&cb=<timestamp>`는 결정성 위해 **제거**. 이 위치는 공개 Firebase 설정이며 비밀 아님.

**transport:** 주입 `FetchLike`(GET·`cache:"no-store"`·auth header/body 없음·body 1회). import 시 네트워크 미접촉, 미주입 시 load 시점에 `globalThis.fetch` lazy 확인(없으면 `INVALID_REQUEST`). 테스트는 전부 주입, global fetch 호출 0(스파이로 확인).

**timeout·취소:** 기본 `DEFAULT_TIMEOUT_MS=10_000`, 0/음수/비유한 → `INVALID_REQUEST`. 내부 AbortController로 timeout, caller signal 선행 abort=`REQUEST_ABORTED`(fetch 미시작). fake timer + 제어 Promise로 검증, 고정 sleep 없음. 모든 종료 경로에서 timer·caller listener 정리(`getTimerCount()===0`, `removeEventListener` 호출 확인). 늦은 완료가 확정 결과를 덮지 않음.

**동시 병합(옵션 A):** 진행 중 요청은 fetch 1회로 병합, settle 후 in-flight 비워 다음 load는 새 fetch. shared outcome은 correlation-agnostic로 만들고 caller별 correlationId로 매핑. **caller abort는 그 caller만 실패, 공유 fetch 유지 → 다른 caller 정상 완료**(테스트 고정).

**응답 크기:** `DEFAULT_MAX_BYTES=5 MiB`, 잘못된 상한 → `INVALID_REQUEST`. 유효 `Content-Length` 초과 → body 소비 전 `RESPONSE_TOO_LARGE`(text 미호출 확인). 수신 후 `TextEncoder` UTF-8 byte 길이 재검사(“가”×5=15B>10 → 초과, string.length 5는 미달로 byte 기준 증명). body/base64 오류 미포함.

**오류 계약(표 그대로):** VALIDATION `INVALID_REQUEST`/`RESPONSE_TOO_LARGE`/`INVALID_JSON`/`INVALID_CATALOG`, NETWORK `REQUEST_ABORTED`(false)/`NETWORK_TIMEOUT`(true)/`NETWORK_UNAVAILABLE`(true)/`PUBLIC_CATALOG_NOT_FOUND`(404,false)/`PUBLIC_CATALOG_RATE_LIMITED`(429,true)/`PUBLIC_CATALOG_SERVER_ERROR`(5xx,true)/`PUBLIC_CATALOG_HTTP_ERROR`(기타 non-2xx, **retryable=false** 명시), AUTH `PUBLIC_CATALOG_FORBIDDEN`(401/403,false), UNKNOWN `UNEXPECTED_PUBLIC_CATALOG_ERROR`. error는 `{category,code,retryable,correlationId}` + 선택 `httpStatus`/`catalogIssues`(스펙 012 code/path)만. 원문 body/base64/token/전체 URL 없음(직렬화 검사로 고정). 빈 catch·console·기본 카탈로그 fallback 없음.

**JSON·Catalog:** text 1회→크기→`JSON.parse`→`readLegacyCatalog`. legacy-v0·유효 V1 성공, warning은 report로 그대로 전달(숨기지 않음), 스펙 012 fatal은 `INVALID_CATALOG`. adapter는 카탈로그를 추가 수정하지 않음.

**검증 결과(Node 24.18.0 / pnpm 11.15.1):** frozen install lock diff **0**(firebase package.json 무변경) · format/lint/typecheck PASS · **unit 91/91**(firebase 30 신규) · build 독립(JS gzip ≈61.09KB) · **e2e 4/4**(앱 무변경) · check PASS. **Firebase SDK·신규 의존성 0**, `@denn/firebase`→`@denn/shared` 방향 유지, 앱 import/call **0**, 실제 network/브라우저 저장소 **0**. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG **UNCHANGED**, deploy 0. Rules/deploy 검증 = **NOT APPLICABLE**(변경 없음, PASS로 꾸미지 않음).

**미검증/위험:**
- fake fetch는 실제 Firebase **CORS·cache header·실지연**을 검증하지 못함 — 실제 read는 사용자 승인·별도 스펙.
- 5 MiB는 관측 ~492KB에 여유를 둔 초기값. 초과 시 몰래 올리지 않고 자산 외부화·성능 검토.
- `no-store`는 fresh-read 의도이며 offline 지원 아님.

