# 014 — 실제 공개 카탈로그 읽기 검증

## 목표 (WHY)

스펙 013의 읽기 어댑터가 실제 Firebase Storage 공개 객체 `published/state.json`에서도 동작하는지 격리된 검증 도구로 확인한다.

실제 CORS·HTTP 응답·지연·크기·JSON·스펙 012 카탈로그 계약을 검증하되, 응답 원문·상품명·ID·이미지 경로 등 운영 데이터는 저장·출력·커밋하지 않는다. 이번 단계는 앱 연결이나 배포 승인이 아니다.

## 범위 (SCOPE)

### 포함

- 사용자가 승인한 실제 공개 객체의 read-only GET
- Node에서 기존 `createPublicCatalogReader`를 통한 실제 1회 검증
- 로컬 앱 origin의 브라우저에서 CORS 실제 1회 검증
- 기본 자동검증과 분리된 명시적 opt-in live 검증
- 원문을 폐기하고 안전한 집계값만 남기는 결과 요약
- 실행 전후 운영본·Firebase·프로세스·작업트리 가드

### 제외(하지 않을 것)

- Firebase write/delete, Auth, SDK 설치, Rules·CORS 설정 변경
- 앱에서 reader import/call, loading/error UI, 제품 기능
- `admin/state.json`, `backup.json`, `?space=`, 고객·주문 데이터
- 응답 원문·JSON·상품명·ID·URL·`dataUrl`·`storagePath` 저장/출력
- HAR·trace·video·screenshot·브라우저 다운로드
- retry·cache-buster·부하/반복 요청·persistent cache·offline fallback
- 5 MiB 상한 상향, 스키마 자동수정·마이그레이션
- Firebase Hosting preview/production 배포

## 대상 (WHERE)

- `packages/firebase/src/public-catalog/`의 검증 전용 코드·테스트
- 별도 live Vitest/Playwright 설정 또는 동등한 명시적 opt-in 도구
- `docs/codex-claude-handoff/reviews/2026-07-23-live-public-catalog-read-report.md`
- `docs/2026-07-23-spec-014-live-public-catalog-handoff.md`
- 이 스펙, 인덱스, `CURRENT.md`

제품 앱 소스와 스펙 013 production API는 원칙적으로 수정하지 않는다. 검증 가능성 때문에 변경이 필요하면 최소 범위와 이유를 먼저 보고한다.

## 구현 지시 (WHAT / HOW)

1. **기준선·승인·가드**
   - `rebuild/modern-studio`, HEAD=origin, clean을 확인한다.
   - 사용자의 “다음 진행”은 고정 공개 객체에 대한 이번 read-only 검증 2회만 승인한 것으로 기록한다.
   - 운영 HTML·Firebase 설정/Rules·POC·PNG와 앱 소스의 기준 hash를 기록한다.
   - 실제 endpoint는 스펙 013의 `PUBLIC_CATALOG_LOCATION`과 `buildPublicCatalogUrl()`만 사용한다.

2. **기본 게이트와 live 게이트 분리**
   - 평상시 `test:unit`, `test:e2e`, `check`, import만으로 실제 network가 절대 발생하지 않아야 한다.
   - live 파일은 기본 Vitest/Playwright include에서 명시적으로 제외한다.
   - `DENN_LIVE_PUBLIC_CATALOG_READ=1` 같은 명시적 opt-in 없이는 live 명령이 성공으로 위장하지 말고 요청 전에 실패해야 한다.
   - endpoint·token·credential을 환경변수나 CLI 인자로 받지 않는다.
   - 새 runtime dependency를 추가하지 않는다. 기존 Vitest·Playwright·Vite만 사용한다.

3. **요청 예산**
   - 전체 실제 GET은 최대 2회다.
     1. Node: 기존 `createPublicCatalogReader().load(...)` 1회
     2. Browser: 로컬 mockup origin에서 고정 URL CORS fetch 1회
   - 자동 retry, preflight 목적의 별도 GET/HEAD, cache-buster를 금지한다.
   - 요청 횟수를 안전한 요약에 기록한다. 2회를 넘기면 검증 실패다.

4. **Node adapter 검증**
   - 기존 기본 timeout 10초, 최대 5 MiB를 그대로 사용한다.
   - 성공 조건은 `source:"network"`이며 스펙 012 `readLegacyCatalog`를 통과한 문서와 report를 반환하는 것이다.
   - 원문 text/JSON 또는 document 내부 값을 console·assertion message·snapshot·파일에 넣지 않는다.
   - 안전 집계만 계산한 뒤 document 참조를 버린다.

5. **브라우저 CORS 검증**
   - 로컬 mockup dev/preview origin에서 `fetch(buildPublicCatalogUrl(), {method:"GET", cache:"no-store"})`를 1회 실행한다.
   - 성공 조건: fetch가 CORS로 차단되지 않음, HTTP 2xx, body 1회 수신, UTF-8 byte가 `0 < n <= 5 MiB`, JSON parse 성공.
   - 페이지에서 Node로 반환하는 값은 status, response type, content-type 유무, content-length 안전 숫자, 실제 byte 수, elapsed ms, JSON parse 성공 여부뿐이다.
   - body·parsed JSON·header 전체·전체 URL을 Playwright 결과나 console로 반환하지 않는다.
   - trace/video/screenshot/HAR는 `off`, 다운로드·localStorage·IndexedDB·Cache API 사용은 0이어야 한다.
   - Node와 Browser 사이 byte 동일성은 발행 시점 경합 때문에 완료 조건으로 삼지 않는다.

6. **안전한 결과 스키마**
   - 저장 가능한 필드:
     - UTC/KST 실행 시각
     - endpoint 식별자 `published/state.json`(전체 URL 제외)
     - Node/Browser 요청 횟수
     - success/failure code
     - HTTP status, response type, content-type 존재/정규화된 media type
     - UTF-8 byte 수, elapsed ms
     - source schema(`legacy-v0` 또는 유효 V1), collection별 **개수**
     - warning/fatal **개수**, 스펙 012 issue code별 개수
     - `__publishedAt` 등 호환 필드는 값이 아닌 존재 여부만
   - 저장 금지: 원문, 객체 값, 상품/브랜드 이름, item ID, 임의 unknown path/value, 이미지 URL/path, data URL, token, 전체 endpoint URL.
   - 스펙 012 issue path는 실제 ID/인덱스가 섞일 가능성이 있으므로 live 보고서에는 저장하지 않고 code별 개수만 저장한다.
   - 오류·assertion·console도 동일한 금지 규칙을 따른다.

7. **sanitizer 검증**
   - live 실행기와 별개로 fake 민감 fixture를 사용해 안전 요약기를 unit test한다.
   - 이름·ID·token·URL·base64·`dataUrl`·`storagePath`·원문 marker가 직렬화된 요약과 오류에 0건임을 확인한다.
   - 비유한 수·음수 count·미정의 필드는 안전하게 거부한다.
   - live 실패 시 raw error 객체를 그대로 stringify하지 말고 미리 정의한 safe code로만 변환한다.

8. **실행 순서**
   - 먼저 기본 frozen/format/lint/typecheck/unit/build/e2e/check를 통과시킨다.
   - opt-in Node 검증을 1회 실행한다. 실패하면 원문 없이 code만 보고하고 브라우저 요청은 수행하지 않은 채 대기한다.
   - Node 성공 후 opt-in Browser CORS 검증을 1회 실행한다.
   - 어느 단계든 실패하면 5 MiB·timeout·Rules·CORS를 즉시 바꾸지 않는다.
   - 성공 후 다시 기본 unit/e2e/check를 실행해 live 경로가 기본 게이트에 섞이지 않았음을 확인한다.

9. **실행 후 정리**
   - 로컬 서버·브라우저·Node 프로세스를 종료하고 사용 포트가 free인지 확인한다.
   - response/json/tmp/log/HAR/trace/video/screenshot가 repo와 임시 작업 경로에 생성되지 않았음을 확인한다.
   - `git status`에서 승인된 검증 도구·문서 외 파일이 없고 운영 데이터 파일이 untracked/staged가 아님을 확인한다.

10. **문서·커밋**
    - 검증 도구/테스트와 안전한 결과 문서를 별도 커밋한다.
    - 결과 보고서는 §6 허용 필드만 포함한다. 원문 표본이나 실제 필드 값을 “근거”로 붙이지 않는다.
    - 스펙 하단 `### DONE (Claude)`에 실제 요청 수, 성공/실패, 안전 집계, 미검증, 무변경 가드를 기록한다.
    - push 후 HEAD=origin, ahead/behind `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] 기본 frozen install 및 lockfile diff 0
- [ ] 기본 format/lint/typecheck/unit/build/e2e/check PASS
- [ ] 기본 게이트·import에서 실제 network 0
- [ ] opt-in 없을 때 요청 전 실패, 성공/skip 위장 없음
- [ ] Node 실제 GET 정확히 1회, 기존 adapter·10초·5 MiB 사용
- [ ] Browser 실제 GET 정확히 1회, CORS·2xx·크기·JSON parse 확인
- [ ] 전체 실제 요청 2회 이하, retry/HEAD/cache-buster 0
- [ ] 안전 요약 sanitizer fake 테스트
- [ ] 보고서·console·assertion·git에 원문/이름/ID/URL/base64/path/token 0
- [ ] trace/video/screenshot/HAR/download/browser storage 0
- [ ] 실행 후 서버·포트·프로세스·임시 산출물 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG·앱 소스 무변경
- [ ] Firebase SDK/Auth/write/Rules/CORS/deploy 0
- [ ] HEAD=origin, ahead/behind 0/0, clean

## 완료 정의 (DONE)

- 기존 스펙 013 adapter가 실제 공개 객체를 1회 읽고 스펙 012 검증까지 성공한다.
- 로컬 브라우저 origin에서 별도 1회 요청이 실제 CORS·HTTP·크기·JSON 조건을 통과한다.
- 기본 자동검증은 계속 network-free이고 live 검증은 명시적 opt-in으로만 실행된다.
- 저장·출력된 결과는 안전 집계뿐이며 운영 카탈로그 원문이나 식별값이 어디에도 남지 않는다.
- 운영본·Firebase·앱 연결·배포는 변경되지 않는다.

## 위험 (RISK)

- 공개 객체도 운영 데이터다. 읽기 자체는 공개 GET이지만 원문 유출을 막기 위해 요청 수와 출력 필드를 강하게 제한한다.
- 실제 파일이 5 MiB를 넘거나 계약에 맞지 않으면 실패가 올바른 결과다. 상한·파서·Rules를 즉시 완화하지 않고 별도 분석 스펙을 만든다.
- Node fetch는 CORS를 강제하지 않으므로 Browser 검증을 분리한다.
- live 결과는 실행 시점의 스냅샷이며 장기 가용성·offline·장애 복구를 보장하지 않는다.
- 롤백은 검증 도구와 문서 커밋을 역순 revert한다. Firebase·운영 롤백은 없어야 한다.

### QUESTIONS

- 없음. 실제 응답이 실패하거나 민감해 보이는 구조를 포함하면 값을 출력하지 말고 safe code와 개수만 보고한 뒤 중단한다.

### DONE (Claude) — 2026-07-23

**요약:** 스펙 013 고정 공개 reader를 실제 환경에서 opt-in으로 격리 검증했다. **실제 GET = Node 1 + Browser 1 = 총 2회**(예산 준수), 두 채널 모두 **성공**. 원문·식별값은 어디에도 저장/출력/커밋하지 않고 안전 집계만 문서화했다. 앱 연결·Firebase 변경·배포 없음.

**변경 파일 (도구/테스트 — 별도 커밋):**
- `packages/firebase/src/public-catalog/live/safe-summary.ts` — 순수 sanitizer(`buildNodeSummary`/`buildBrowserSummary`). counts/codes/status/byte/elapsed/존재 boolean만. issue는 code별 개수만(path 제거). 비유한·음수·비정수 count·미정의 필드 거부.
- `.../live/safe-summary.test.ts` — fake 민감 fixture로 직렬화 요약·오류에 이름/ID/token/URL/base64/path 0건 검증(+숫자 거부).
- `.../live/node-live.live.test.ts` — `*.live.test.ts`(기본 Vitest 제외). opt-in Node 실제 read 1회(기존 adapter·10s·5 MiB), 안전 요약만 `process.stdout.write`. opt-in 없으면 **요청 전 실패**.
- `tests/e2e-live/public-catalog-cors.live.spec.ts` — 별도 Playwright config. opt-in browser CORS 1회, 안전 primitive만 반환. trace/video/screenshot off.
- `vitest.config.ts`(live 제외) · `vitest.live.config.ts` · `playwright.live.config.ts` · `package.json`(scripts `test:live:node`/`test:live:browser`) · `scripts/check.mjs`(biome 대상).

**실제 요청 결과(안전 집계):**
- Node: **success / OK**, requests 1, `source:"network"`, 스펙 012 `readLegacyCatalog` 통과. (해당 실행에서 세부 count는 stdout 미출력=Vitest console 인터셉트; 재현용 `process.stdout.write` 고정, 예산 위해 재실행 안 함.)
- Browser: **success / OK**, requests 1, corsBlocked **false**, httpStatus **200**, responseType `cors`, contentTypePresent true, byteLength **192419**(≈188 KiB, `0<n≤5 MiB`), jsonParseOk **true**, elapsedMs 4227.
- 합계 실제 GET **2회**(retry/HEAD/cache-buster 0). 보고서 `docs/codex-claude-handoff/reviews/2026-07-23-live-public-catalog-read-report.md`(§6 허용 필드만).

**게이트(기본, network-free):** frozen install lock diff **0**(deps 무변경) · format/lint/typecheck PASS · **unit 107**(sanitizer 11 신규, live 제외) · build 독립 · **e2e 4/4** · check PASS. opt-in 없을 때 live 명령은 요청 전 실패(성공/skip 위장 없음) 확인.

**정리·가드:** 로컬 preview 서버 종료·포트 free 확인. repo/임시경로에 response/json/tmp/log/HAR/trace/video/screenshot **0**(`test-results/.last-run.json`은 status만·gitignored). `git status`에 승인된 도구·문서 외 파일 없음, 운영 데이터 파일 없음. 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**앱 소스 전부 hash UNCHANGED**, Firebase SDK/Auth/write/Rules/CORS·deploy 0, 신규 의존성 0.

**미검증/위험:** 실행 시점 스냅샷(장기 가용성·offline 미보장). Node/Browser byte 동일성은 완료 조건 아님. 5 MiB·timeout·Rules·CORS는 실패해도 임의 변경하지 않음. 세부 Node 안전 집계 미출력은 도구 세부(데이터 무관).

### 종료 대기 — Codex 재검증

- 다음: Codex 스펙 014 재검증 대기. 다음 스펙·앱 연결 미착수.
