# 015 — 고객 앱 공개 카탈로그 연결

## 목표 (WHY)

스펙 012~014에서 검증한 공개 카탈로그 읽기 경계를 신규 고객 앱 `apps/mockup`에 처음 연결한다.

이번 단계는 전체 상품 선택 화면을 만드는 것이 아니다. 고객 앱이 시작될 때 고정 공개 카탈로그를 안전하게 읽고, 로딩·성공·실패·수동 재시도 상태를 접근 가능한 UI로 표현하는 최소 데이터 흐름을 확립한다.

## 범위 (SCOPE)

### 포함

- `apps/mockup`에서 `@denn/firebase` 공개 reader 사용
- 모듈 단위 reader 1개와 React 생명주기 연결
- loading / ready / error 상태 계약
- StrictMode 초기 중복 effect에서도 실제 fetch 1회
- 늦은 응답·unmount·수동 재시도 경합 방지
- 오류 code/retryable 기반의 안전한 한국어 사용자 메시지
- `@denn/ui` Card·Button·Badge 기반 최소 상태 UI
- fake transport/unit 및 Playwright route interception E2E
- `apps/mockup`의 기존 프리미티브 데모를 연결 상태 확인용 최소 셸로 정리

### 제외(하지 않을 것)

- 실제 네트워크 재검증·실제 공개 객체 추가 GET
- 상품/템플릿/프레임/색상 목록 및 상세 화면
- Canvas·미리보기·이미지 preload·CORS canvas 검증
- 선택·편집·저장·주문·카카오 이동
- Router·Zustand·React Query/SWR·Service Worker
- localStorage·IndexedDB·Cache API·persistent/offline cache
- 자동 retry/backoff·polling·refetch interval·focus refetch
- Firebase SDK·Auth·write·Rules·CORS·Hosting·배포
- 관리자 앱 연결 또는 관리자 UI 변경
- 스펙 012 문서 모델·스펙 013 reader API·5 MiB·10초 정책 변경
- 운영 카탈로그 원문·이름·ID·URL·issue path의 로그·snapshot·문서화

## 대상 (WHERE)

- `apps/mockup/src/`의 공개 카탈로그 연결 모듈·hook·상태 UI
- `apps/mockup/package.json`의 `@denn/firebase: workspace:*`
- `apps/mockup/src/**/*.test.ts`
- `tests/e2e/`의 mockup 연결 E2E
- 꼭 필요한 `@denn/ui` 스타일. 새 primitive가 필요한 경우 기존 API로 불가능한 근거를 먼저 보고한다.
- `docs/2026-07-23-spec-015-mockup-catalog-connection-handoff.md`

근거:

- 스펙 012 `CatalogDocumentV1`
- 스펙 013 `createPublicCatalogReader`
- 스펙 014 실제 Node·Browser CORS 검증
- `CLAUDE.md` §4 데이터 호환·오류·보안 제약

## 구현 지시 (WHAT / HOW)

1. **기준선과 가드**
   - `rebuild/modern-studio`, HEAD=origin, clean을 확인한다.
   - 운영 HTML·Firebase 설정/Rules·POC·PNG·admin 앱의 기준 hash를 기록한다.
   - 스펙 014 live 명령과 실제 endpoint를 실행하지 않는다. 모든 자동검증은 Playwright route/fake reader만 사용한다.

2. **의존 경계**
   - `apps/mockup`에 `@denn/firebase: workspace:*`만 추가한다.
   - `@denn/firebase`가 이미 가진 `@denn/shared` 방향을 유지한다.
   - Firebase SDK나 별도 data-fetching/state library를 설치하지 않는다.
   - 앱은 `buildPublicCatalogUrl`을 직접 조합하지 않고 `createPublicCatalogReader`만 사용한다.

3. **reader 소유권**
   - production reader는 앱 모듈에서 **한 번만** 생성한다. React render/effect 안에서 매번 생성하지 않는다.
   - endpoint·timeout·maxBytes를 앱에서 덮어쓰지 않는다. 스펙 013 기본 10초·5 MiB를 그대로 사용한다.
   - hook/상태 로직은 테스트에서 fake `PublicCatalogReader`를 주입할 수 있어야 한다.
   - import 시 요청 금지. 앱이 mount되어 load 명령을 시작할 때만 요청한다.

4. **상태 계약**

   ```ts
   type PublicCatalogUiState =
     | { status: "idle" }
     | { status: "loading"; requestId: number }
     | {
         status: "ready";
         requestId: number;
         document: CatalogDocumentV1;
         warningCount: number;
       }
     | {
         status: "error";
         requestId: number;
         code: PublicCatalogErrorCode;
         retryable: boolean;
       };
   ```

   - 동등한 discriminated union은 허용한다.
   - raw response, 전체 URL, correlationId, issue path를 UI state에 중복 저장하지 않는다.
   - 성공 document는 메모리에만 유지하여 후속 기능이 사용할 수 있게 하되 DOM·console·storage에 직렬화하지 않는다.
   - 실패를 빈/default 카탈로그 성공으로 바꾸지 않는다.

5. **초기 load와 StrictMode**
   - 첫 mount에서 load를 시작한다.
   - React StrictMode의 `mount→cleanup→mount`에도 기존 reader의 in-flight 병합을 통해 underlying fetch가 **정확히 1회**여야 한다.
   - cleanup은 해당 caller의 signal만 abort한다. 공유 fetch나 두 번째 caller를 취소하지 않는다.
   - correlationId는 비민감 고정 prefix와 앱 내부 증가 번호처럼 안전하게 만든다. 시간·사용자·카탈로그 값을 넣지 않는다.
   - render 중 fetch, 숨은 두 번째 effect, prefetch는 금지한다.

6. **경합·생명주기**
   - 각 load에 증가하는 request generation/id를 부여한다.
   - 완료 시 현재 generation과 일치하고 mount가 유효할 때만 상태를 반영한다.
   - unmount 후 state update가 없어야 한다.
   - 이전 요청의 늦은 success/error가 더 최근 retry 결과를 덮어쓰지 않는다.
   - abort는 화면에서 치명 오류로 깜박이지 않게 하되, 실제 network/validation 실패를 숨기지 않는다.
   - 임의 `setTimeout`·고정 sleep을 사용하지 않는다.

7. **수동 재시도**
   - 자동 retry는 0이다.
   - `retryable:true` 오류에서만 “다시 시도” 버튼을 제공한다.
   - 한 번 클릭은 settle된 이전 load 뒤 새 fetch 정확히 1회다.
   - loading 중 버튼을 disabled하거나 중복 클릭을 차단한다.
   - validation/auth/not-found처럼 `retryable:false`인 오류에는 재시도 버튼을 표시하지 않고 새로고침/관리자 문의 수준의 안내만 제공한다.
   - retry 성공 시 error가 남지 않고 ready로 전환한다.

8. **안전한 사용자 메시지**
   - 사용자에게 error code 원문·HTTP status·URL·issue path를 직접 노출하지 않는다.
   - 최소 매핑:
     - timeout/offline/server/rate-limit → “카탈로그를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.”
     - forbidden/not-found → “카탈로그를 사용할 수 없습니다. 관리자에게 문의해 주세요.”
     - invalid JSON/catalog/size → “카탈로그 데이터에 문제가 있습니다. 관리자에게 문의해 주세요.”
     - unknown → 일반 안전 메시지
   - 개발 console에 result/error/document를 출력하지 않는다.
   - 빈 catch, 오류 삼키기, 성공 UI fallback 금지.

9. **최소 UI**
   - 기존 `@denn/ui`와 웜 토프 토큰만 사용한다.
   - 화면은 다음 의미만 명확히 표현한다.
     - loading: `role="status"` 또는 `aria-live="polite"`, “카탈로그를 불러오는 중”
     - ready: “카탈로그 준비 완료”
     - warning이 있으면 값·path 없이 “일부 이전 데이터가 호환 처리되었습니다”
     - error: `role="alert"`와 안전 메시지
   - ready에서 상품명·ID·컬렉션 내용·이미지를 아직 렌더하지 않는다.
   - 기존 UI 프리미티브 데모 입력·가짜 주문 버튼은 제거하거나 “개발 데모”로 남기지 않는다. 제품 기능으로 오인되지 않는 최소 셸이어야 한다.
   - 320px에서 가로 overflow 0, 터치 버튼 44px, focus-visible을 유지한다.

10. **framework-free 상태 테스트**
    - 새 DOM 테스트 의존성을 추가하지 않는다.
    - reducer/controller 또는 동등한 순수 경계를 분리하여 fake reader·제어 Promise로 검증한다.
    - 필수:
      - idle→loading→ready
      - warningCount 전달
      - error code/retryable만 보존하고 catalogIssues/path 폐기
      - retryable 실패→수동 retry→ready
      - non-retryable에서 retry 거부
      - 중복 retry 클릭→추가 load 0
      - stale success/error 무시
      - unmount/detach 후 통지 0
      - abort cleanup
      - console 호출 0

11. **E2E route interception**
    - 실제 Firebase 요청은 보내지 않고, 고정 URL을 `page.route`로 가로채 합성 JSON을 반환한다.
    - success fixture는 스펙 012의 최소 유효 legacy fixture를 재사용하거나 비민감 최소 fixture로 만든다.
    - 필수 시나리오:
      1. 지연 응답: loading 표시 후 ready
      2. StrictMode 초기 underlying request **정확히 1회**
      3. 500: 안전 error + retry 버튼, 클릭 후 200 → ready, 총 요청 2회
      4. invalid JSON 또는 invalid catalog: 관리자 문의 error, retry 버튼 없음
      5. ready/error 320·1280: overflow 0, console error 0, axe serious/critical 0
      6. admin 앱은 공개 endpoint 요청 0이며 기존 셸 무변경
    - raw fixture가 실패 screenshot/trace에 과다 노출되지 않도록 합성 최소값만 사용한다.
    - 실제 endpoint miss가 발생하면 테스트가 즉시 실패하도록 외부 요청 차단/검출 가드를 둔다.

12. **기본 게이트와 네트워크 0 증명**
    - `test:unit`, `test:e2e`, `check`에서 실제 Firebase host network는 0이어야 한다.
    - 스펙 014 `*.live.test.ts`는 계속 제외한다.
    - `test:live:*`를 실행하지 않는다.
    - package/lockfile 변경은 workspace dependency importer 변화만 설명하고 frozen 재현을 확인한다.

13. **문서·커밋**
    - 상태 전이, StrictMode 1-fetch 근거, 오류 메시지 매핑, E2E 요청 수를 보고한다.
    - 코드/test와 문서/핸드오프 커밋을 분리하고 `spec 015:` 접두사를 사용한다.
    - 스펙 하단 `### DONE (Claude)`에 변경·검증·미검증·위험을 append한다.
    - push 후 HEAD=origin, ahead/behind `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] frozen install, lockfile diff 설명 가능
- [ ] format/lint/typecheck/unit/build/e2e/check PASS
- [ ] 앱 import만으로 request 0, mount 초기 underlying request 1
- [ ] StrictMode cleanup/remount 후에도 request 1
- [ ] loading→ready와 warning 안전 안내
- [ ] retryable error→수동 retry 1회→ready
- [ ] non-retryable error에 retry 버튼 없음
- [ ] stale 완료·unmount 이후 상태 갱신 0
- [ ] raw document/error/URL/issue path console·DOM·storage 0
- [ ] 320·1280 overflow 0, 터치 44px, focus-visible
- [ ] axe serious/critical 0, console error 0
- [ ] Playwright에서 모든 공개 URL route intercept, 실제 network 0
- [ ] admin 앱 endpoint 요청 0·UI 무변경
- [ ] 스펙 014 live 명령·실제 GET 0
- [ ] Firebase SDK/Auth/write/Rules/CORS/Hosting/deploy 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 무변경
- [ ] HEAD=origin, ahead/behind 0/0, clean

## 완료 정의 (DONE)

- 고객 앱이 mount되면 기존 공개 reader로 카탈로그를 한 번만 읽는다.
- loading·ready·error·수동 retry가 안전한 상태 계약과 접근 가능한 UI로 동작한다.
- StrictMode·abort·retry·늦은 응답 경합이 자동검증된다.
- 성공 document는 메모리에만 있고 아직 상품 UI·Canvas·저장·주문에는 사용되지 않는다.
- 모든 자동검증은 합성 응답이며 실제 네트워크·Firebase 변경·배포가 없다.

## 위험 (RISK)

- StrictMode effect 재실행은 중복 GET 위험이 있다. reader singleton과 스펙 013 in-flight 병합, E2E request count로 고정한다.
- 앱이 document 전체를 메모리에 보유하므로 후속 selector에서 불필요한 대형 복제를 피해야 한다.
- 현재 persistent cache가 없어 offline에서는 실패 UI가 정상 동작이다. 이를 기본 카탈로그로 숨기지 않는다.
- 이번 셸은 데이터 연결 확인 단계라 실제 상품 탐색 경험이 아니다. 다음 스펙에서 검증된 read model을 기반으로 화면을 단계적으로 만든다.
- 롤백은 코드/test와 문서 커밋을 역순 revert한다. Firebase·운영 롤백은 없어야 한다.

### QUESTIONS

- 없음. 기존 `@denn/ui`만으로 접근 가능한 상태 UI를 만들 수 없거나 StrictMode 1-fetch를 API 변경 없이 보장할 수 없으면 임의 확장하지 말고 근거와 선택지를 보고한다.
