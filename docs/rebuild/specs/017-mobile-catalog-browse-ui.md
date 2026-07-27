# 017 — 모바일 우선 고객 카탈로그 탐색 UI

## 목표 (WHY)

스펙 015가 메모리에 보유한 `CatalogDocumentV1`과 스펙 016의 browse selector를 고객 앱에 연결하여, 고객이 케이스 또는 액자 제작 대상을 단계적으로 선택할 수 있는 첫 실제 탐색 화면을 만든다.

이번 단계는 텍스트 기반 선택 흐름과 반응형 레이아웃만 완성한다. 이미지·Canvas·편집·저장·주문은 연결하지 않는다.

## 범위 (SCOPE)

### 포함

- 케이스/액자 제품 유형 선택
- 케이스: 모델 → 카테고리 → 템플릿
- 액자: 사이즈 → 카테고리 → 템플릿
- 스펙 016 selector만을 통한 option/filter 생성
- 순수 selection reducer와 상위 선택 변경 시 하위 선택 무효화
- 빈 collection·빈 filter·진단 존재의 안전한 UI
- 모바일 우선 320px 이상 반응형 레이아웃
- 키보드·스크린리더·44px 터치 타깃·focus-visible
- 합성 fixture E2E와 실제 network 0 가드

### 제외(하지 않을 것)

- 이미지 URL·thumbnail·preload·`dataUrl`·`storagePath`
- Canvas·렌더링·사진 업로드·텍스트 편집
- 선택 저장·URL query·localStorage·IndexedDB
- 가격·재고·검색·정렬·페이지네이션
- 주문·카카오 CTA·시안 저장·내 공간
- 모델→템플릿 직접 필터
- built-in 템플릿 신규 생성
- Router·Zustand·React Query/SWR
- 실제 Firebase GET·스펙 014 live 테스트
- Firebase SDK/Auth/write·Rules·CORS·Hosting·배포
- 관리자 앱 UI 변경

## 대상 (WHERE)

- `apps/mockup/src/App.tsx`
- `apps/mockup/src/catalog/`의 browse hook/view adapter
- `apps/mockup/src/browse/`의 selection reducer·컴포넌트
- `apps/mockup/src/*.css` 또는 동등한 앱 전용 스타일
- `tests/e2e/mockup-catalog.spec.ts` 및 필요한 합성 fixture
- `docs/rebuild/results/spec-017/`의 합성 fixture 기반 대표 화면 PNG 2장
- `docs/2026-07-27-spec-017-mobile-catalog-browse-ui-handoff.md`

근거:

- 데이터 흐름: `docs/rebuild/specs/015-mockup-public-catalog-connection.md`
- selector 관계: `docs/rebuild/specs/016-catalog-browse-selector-contract.md`
- 레거시 제품 축: `denn-mockup-tool.html`의 `MODELS`·`CTPLS`와 `FS`·`FCATS`·`FTPLS`
- 디자인·모바일 컴포넌트: `docs/rebuild/design/README.md`
- 모바일 안정성: `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`

## 구현 지시 (WHAT / HOW)

1. **기준선·가드**
   - `rebuild/modern-studio`, HEAD=origin, clean을 확인한다.
   - 운영 HTML·Firebase 설정/Rules·POC·PNG·admin 앱의 기준 hash를 기록한다.
   - `test:live:*`와 실제 Firebase endpoint를 실행하지 않는다.
   - Playwright의 모든 Firebase Storage 요청은 합성 route로 가로채며 miss는 즉시 실패한다.

2. **Catalog ready 연결**
   - 스펙 015의 loading/error/retry UI를 그대로 유지한다.
   - `state.status==="ready"`에서만 `buildCatalogBrowseIndex(state.document)`를 호출한다.
   - index는 `useMemo` 또는 동등한 방식으로 document identity당 한 번 생성한다.
   - React 컴포넌트에서 raw `document.data.*`를 직접 필터하지 않는다.
   - 모든 option은 스펙 016의 공개 selector로만 얻는다.
   - document·raw item·image 값은 DOM, data attribute, console, storage에 직렬화하지 않는다.

3. **제품 유형**

   ```ts
   type ProductKind = "case" | "frame";
   ```

   - 첫 화면에서 “휴대폰 케이스”와 “액자”를 명시적으로 선택하게 한다.
   - 초기값을 임의로 case/frame 중 하나로 자동 선택하지 않는다.
   - 두 선택은 `fieldset/legend` 또는 접근 가능한 radiogroup으로 구현한다.
   - 선택 상태는 색 외에 체크/텍스트/`aria-checked` 또는 `aria-pressed`로 표현한다.
   - 유형 변경은 이전 유형의 모델·사이즈·카테고리·템플릿 선택을 전부 초기화한다.

4. **selection 상태 계약**

   ```ts
   type CatalogBrowseSelection = {
     readonly productKind: ProductKind | null;
     readonly modelId: string | null;
     readonly frameSizeId: string | null;
     readonly categoryId: string;
     readonly templateId: string | null;
   };
   ```

   - 초기 `categoryId`는 virtual `"all"`, 나머지는 null이다.
   - 상태에는 ID만 보관하고 label·option·document를 중복 저장하지 않는다.
   - 순수 reducer/action으로 구현하고 React·IO를 의존하지 않는다.
   - 존재하지 않는 ID를 action으로 받으면 상태를 변경하지 않는다.

5. **상태 전이**
   - 제품 유형 변경: model/size/template를 null, category를 all로 초기화.
   - 케이스 모델 변경: category/template는 유지한다. 모델→템플릿 직접 관계가 없기 때문이다.
   - 액자 사이즈 변경: category를 all, template를 null로 초기화한다.
   - category 변경: template를 null로 초기화한다.
   - template 변경: 현재 selector 결과에 포함된 ID만 선택 가능하다.
   - 같은 항목 재선택은 안정적인 no-op 또는 선택 유지이며 토글 해제로 만들지 않는다.
   - catalog document가 새 identity로 바뀌어 기존 ID가 사라지면 안전하게 무효 선택을 정리한다. 자동으로 첫 항목을 대신 선택하지 않는다.

6. **점진적 단계**
   - 제품 유형을 고르기 전에는 후속 선택 영역을 표시하지 않는다.
   - 케이스:
     1. 모델 선택 필수
     2. 모델 선택 후 카테고리 표시
     3. 카테고리 선택 상태에서 템플릿 표시
   - 액자:
     1. 사이즈 선택 필수
     2. 사이즈 선택 후 카테고리 표시
     3. 선택한 사이즈+카테고리에 맞는 템플릿 표시
   - 카테고리의 기본 선택은 virtual “전체”다.
   - 모델은 템플릿 필터에 사용하지 않는다. 선택 조합에만 포함한다.
   - 액자 템플릿은 반드시 `selectFrameTemplates(index,{categoryId,sizeId})` 결과를 사용한다.

7. **선택 UI**
   - 모델·사이즈·카테고리는 `Chip` 또는 동일한 접근 가능한 button/radio 패턴을 사용한다.
   - 템플릿은 이미지 없는 텍스트 카드/button으로 표시한다.
   - 템플릿 카드에는 label과 선택 상태만 표시한다. raw type·sourceIndex·diagnostic code는 고객에게 노출하지 않는다.
   - `kind`를 표시해야 한다면 “기본”/“업로드”처럼 고객에게 의미 있는 안전 라벨만 사용한다. `other`를 추정 번역하지 않는다.
   - source order를 유지하며 UI에서 임의 정렬하지 않는다.
   - selected state는 `aria-pressed`/`aria-checked`, 시각 체크, 굵기 중 둘 이상으로 표현한다.

8. **카테고리 가용성**
   - 카테고리별 현재 조건의 template 개수는 selector 호출 결과 길이로만 계산한다.
   - 결과가 0인 catalog/builtin category는 숨기지 않고 disabled 또는 “0개”로 명확히 표시할 수 있다.
   - virtual “전체” 결과가 0이어도 화면에서 제거하지 않는다.
   - disabled category는 선택할 수 없어야 한다.
   - 액자 size 변경 후 이전 category가 더 이상 유효하지 않도록 §5에서 all로 초기화한다.

9. **빈 상태·진단**
   - 모델 0개: “선택 가능한 휴대폰 모델이 없습니다.”
   - 액자 사이즈 0개: “선택 가능한 액자 사이즈가 없습니다.”
   - 현재 filter의 템플릿 0개: “현재 조건에 맞는 템플릿이 없습니다.”
   - 빈 상태를 기본/가짜 option으로 채우지 않는다.
   - `index.diagnostics.length>0`이면 값·code·path 없이 “일부 카탈로그 항목은 표시되지 않을 수 있습니다.”라는 일반 안내만 제공한다.
   - warning/diagnostic 개수는 내부 테스트에는 사용할 수 있으나 고객 UI에 반드시 표시할 필요는 없다.
   - 오류를 ready/빈 catalog로 위장하지 않는다.

10. **완료 상태**
    - 케이스는 productKind+modelId+templateId가 있으면 선택 완료다.
    - 액자는 productKind+frameSizeId+templateId가 있으면 선택 완료다.
    - 완료 시 선택한 option label로 텍스트 요약을 제공한다.
    - 요약은 현재 index에서 label을 다시 조회하며 state에 label을 저장하지 않는다.
    - “선택 완료”는 `role="status"` 또는 `aria-live="polite"`로 알린다.
    - 다음 기능 CTA·주문 버튼·가짜 저장 버튼을 만들지 않는다. “다음 단계 준비 중” 같은 비활성 제품 CTA도 만들지 않는다.

11. **모바일 레이아웃**
    - mobile-first 단일 열, desktop에서만 최대 폭 또는 2열 정렬을 허용한다.
    - 320px에서 좌우 overflow 0, 텍스트/버튼 잘림 0.
    - 선택 Chip/Card는 최소 44×44px 터치 영역.
    - 긴 한글/영문 label은 카드 밖으로 밀지 말고 wrap한다. 의미 있는 label을 CSS ellipsis로 숨기지 않는다.
    - 가로 chip row를 사용할 경우 해당 영역만 명시적 horizontal scroll이고 페이지 전체 horizontal scroll은 0이어야 한다.
    - `100dvh` 의존 고정 footer·bottom CTA는 이번 범위에서 만들지 않는다.
    - safe-area를 침범하는 fixed 요소를 만들지 않는다.
    - hover-only 동작 금지. `@media (hover:hover)` 원칙을 유지한다.
    - `prefers-reduced-motion`을 존중하고 필수 animation을 만들지 않는다.

12. **디자인**
    - `@denn/ui`와 `@denn/ui/theme.css`의 웜 토프 토큰을 단일 기준으로 사용한다.
    - 새 색상 리터럴·흰색-on-accent 일반 텍스트 금지.
    - 현재 단계, 선택 상태, disabled 상태를 색만으로 구분하지 않는다.
    - 앱 전용 layout CSS는 허용하지만 공통 primitive를 복제하지 않는다.
    - Radix/shadcn 등 신규 UI 의존성을 설치하지 않는다.

13. **순수 reducer 테스트**
    - 초기 상태
    - product kind 변경 전체 초기화
    - 케이스 model 변경 시 category/template 유지
    - frame size 변경 시 category=all/template=null
    - category 변경 시 template=null
    - 유효 template만 선택
    - unknown/disabled ID no-op
    - 같은 선택 재실행 안정성
    - catalog 교체 후 사라진 선택 정리, 첫 항목 자동선택 없음
    - 완료 조건(case/frame)
    - reducer 입력·selector 결과 불변

14. **컴포넌트/E2E 합성 fixture**
    - 실제 상품명·ID·이미지를 사용하지 않는다.
    - fixture 최소 구성:
      - 모델 2개
      - 케이스 category 2개, categorized+uncategorized template
      - 액자 visible size 2개+hidden 1개
      - frame category 2개
      - all/restricted/unmatched template
      - diagnostic을 발생시키는 안전 합성 항목
    - 필수 E2E:
      1. loading→ready 후 제품 유형 2개 표시
      2. 케이스: 모델→category→template→완료 요약
      3. 케이스 모델 변경 시 template 유지
      4. 액자: size→category→compatible template→완료 요약
      5. 액자 size 변경 시 category/template 초기화
      6. category 변경 시 template 초기화
      7. 빈 models/sizes/templates 안내
      8. diagnostic 일반 안내, code/path/합성 secret marker DOM 0
      9. 실제 Firebase host 요청 0, route miss 0, console error 0
      10. admin 앱 endpoint 요청 0·UI 무변경

15. **반응형·접근성 게이트**
    - 모바일 계약 §10의 최소 matrix를 그대로 포함한다:
      - 320×568
      - 360×800
      - 390×844 및 844×390
      - 430×932 및 932×430
      - 768×1024 및 1024×768
      - 1280×800
      - 1440×900
    - 각 주요 상태에서 document horizontal overflow 0.
    - 모든 선택 control 44×44 이상.
    - keyboard Tab/Enter/Space로 유형·모델/사이즈·카테고리·템플릿 선택 가능.
    - focus-visible 링 존재.
    - `fieldset/legend` 또는 명시적 group label.
    - axe serious/critical 0.
    - 합성 fixture만 사용한 대표 screenshot을 최소 모바일 390×844와 desktop 1280×800에서 생성한다.
    - screenshot에는 실제 운영 이름·ID·이미지·URL이 없어야 하며 `docs/rebuild/results/spec-017/`에 커밋해 자동 matrix의 시각 근거로 남긴다.
    - 기존 `docs/rebuild/design/*-B.png` 5종은 수정하지 않는다.
    - 실제 iOS Safari·Android Chrome·Samsung Internet·카카오 인앱과 실제 200% 확대는 **NOT TESTED**로 기록하고 자동 PASS로 꾸미지 않는다. UI 안정 후 별도 실기기 스펙에서 검증한다.

16. **성능·자원**
    - `buildCatalogBrowseIndex`는 document identity당 반복 생성하지 않는다.
    - raw document나 selector output을 JSON clone/stringify하지 않는다.
    - render 중 network·storage·console 0.
    - 각 render에서 모든 category/template를 불필요하게 다중 필터하지 않도록 작은 derived map/useMemo는 허용한다.
    - 제품 기능 코드 때문에 mockup JS gzip이 기존 64.40KB에서 비정상 급증하면 원인을 보고한다. 임의 예산 상향 금지.

17. **문서·커밋**
    - 제품 유형별 단계, reducer 전이표, selector 호출 위치, 빈/진단 UI, viewport 결과를 보고한다.
    - 실기기·실제 확대는 NOT TESTED로 명시한다.
    - 코드/test와 문서/핸드오프 커밋을 분리하고 `spec 017:` 접두사를 사용한다.
    - 스펙 하단 `### DONE (Claude)`에 변경·검증·미검증·위험을 append한다.
    - push 후 HEAD=origin, ahead/behind `0/0`, clean을 확인한다.

## 검증 절차 (VERIFY)

- [ ] frozen install, lockfile diff 0
- [ ] format/lint/typecheck/unit/build/e2e/check PASS
- [ ] ready에서만 browse index 생성, selector 외 raw filter 0
- [ ] 케이스 모델→카테고리→템플릿 흐름
- [ ] 액자 사이즈→카테고리→템플릿 흐름
- [ ] 모델→템플릿 직접 필터 0
- [ ] 상위 선택 변경 시 정의된 하위 reset
- [ ] unknown/disabled 선택 no-op
- [ ] 빈 상태·진단 일반 안내
- [ ] DOM/console/storage에 raw document·image·path·diagnostic code 0
- [ ] 모바일 계약의 10개 viewport/direction matrix overflow 0
- [ ] control 44×44, keyboard, focus-visible, axe serious/critical 0
- [ ] 합성 모바일·desktop 대표 screenshot 2장, 실제 운영 데이터 0
- [ ] 실제 Firebase host request 0, route miss 0
- [ ] 실제 GET·test:live:* 0
- [ ] admin 앱 UI·endpoint 요청 0
- [ ] 실제 4환경·200% 확대 NOT TESTED 정직 기록
- [ ] Firebase SDK/Auth/write·Rules/CORS/Hosting/deploy 0
- [ ] 운영 HTML·Firebase 설정/Rules·POC·PNG 무변경
- [ ] HEAD=origin, ahead/behind 0/0, clean

## 완료 정의 (DONE)

- 고객 앱에서 케이스와 액자 탐색을 모바일 우선 단계형 UI로 수행할 수 있다.
- 모든 option/filter는 스펙 016 selector 결과에서 나오며 레거시 raw 데이터 접근이 UI에 흩어지지 않는다.
- 선택 reducer의 reset·무효 선택·완료 조건이 자동검증된다.
- 320px부터 1440px, 모바일·태블릿 가로까지 자동 접근성과 레이아웃 게이트를 통과한다.
- 이미지·Canvas·저장·주문·실제 네트워크·Firebase 변경·배포는 없다.
- 이 DONE은 **자동검증 단계 완료**다. 실제 4환경·200% 확대는 별도 실기기 스펙을 통과하기 전까지 출시 완료로 간주하지 않는다.

## 위험 (RISK)

- 모델→케이스 템플릿 직접 관계는 근거가 없다. 모델 선택을 template filter로 사용하지 않는다.
- built-in 템플릿 공급원이 아직 확정되지 않아 selector에 존재하는 항목만 표시한다. 빈 “기본 액자” category를 가짜 항목으로 채우지 않는다.
- 텍스트 카드만으로는 최종 상품 탐색 UX가 아니다. 이미지 참조·CORS·fallback 계약을 별도 스펙에서 확정한 뒤 thumbnail을 추가한다.
- 실제 모바일 브라우저와 200% 확대는 자동 Chromium 결과로 대체할 수 없다. 별도 실기기 검증 전 완료로 주장하지 않는다.
- 롤백은 코드/test와 문서 커밋을 역순 revert한다. Firebase·운영 롤백은 없어야 한다.

### QUESTIONS

- 없음. 가격·노출 순서·모델별 템플릿 관계·built-in 공급원이 필요하면 임의 생성하지 말고 후속 결정으로 보고한다.

---

### DONE (Claude) — 2026-07-27 (자동검증 단계 완료)

- **구현:** `apps/mockup`에 스펙 015 ready document → 스펙 016 selector 기반 단계형 탐색 UI를 붙였다.
  - `apps/mockup/src/browse/selection.ts` — 순수 selection reducer(`reduceSelection(state,action,index)`) + 헬퍼(`templatesFor`/`isCategorySelectable`/`isSelectionComplete`/`sanitize→reconcile`). React·IO 의존 0, selector만 사용, ID만 저장.
  - `apps/mockup/src/browse/BrowseFlow.tsx` — 제품유형→(모델|사이즈)→카테고리→템플릿 단계형 컴포넌트. 옵션은 전부 스펙 016 공개 selector. `document.data` 직접 필터 0.
  - `apps/mockup/src/browse/browse.css` — 앱 전용 레이아웃(웜 토프 토큰만, 새 색상 리터럴 0, 흰색-on-accent 0).
  - `apps/mockup/src/App.tsx` — ready에서만 `buildCatalogBrowseIndex`(`useMemo`, document identity당 1회) → `BrowseFlow`. 스펙 015 loading/error/retry 무변경.
  - `apps/mockup/src/browse/selection.test.ts`(reducer 18) + `tests/e2e/mockup-browse.spec.ts`(흐름 10 + matrix 10 + keyboard 1 + 스크린샷 2) + `playwright.config.ts`(두 preview webServer에 `gracefulShutdown{SIGTERM,5s}`).
- **상태 전이:** 유형 변경=전체 초기화 / 케이스 모델 변경=category·template 유지 / 액자 사이즈 변경=category=all·template=null / category 변경=template=null / 무효·disabled ID=no-op(동일 참조) / 같은 값 재선택=안정 no-op(토글 해제 아님) / catalog 교체=사라진 선택 정리·**첫 항목 자동선택 없음**.
- **selector 호출 위치:** `App.tsx`(index 생성), `BrowseFlow`(selectModels/CaseCategories/FrameCategories/FrameSizes + templatesFor→selectCase/FrameTemplates + isCategorySelectable + 요약 label 재조회), reducer 헬퍼(membership/validity). raw filter 0.
- **빈/진단 UI:** 모델/사이즈/템플릿 0개 안전 안내, 0개 카테고리 disabled+"(0)", 진단은 code/path 없는 일반 안내만.
- **게이트:** frozen lockfile diff 0(의존성 manifest 무변경, 신규 의존성 0) / format·lint·typecheck / **unit 202**(스펙 016 184 + reducer 18 신규) / build 독립(mockup JS gzip **67.66KB** = 64.40KB+3.26KB, 예산 내) / **e2e 34 PASS·exit 0**(admin 2+스펙015+스펙017, 015 무회귀) / check PASS.
- **E2E 잔류 프로세스 조사(Codex 지시):** 실행 전/후 PID·PPID·CommandLine 차집합 → 저장소 소속 `vite`/`esbuild` 잔류 0, 포트 4183/4184 LISTENING 0, Playwright exit 0(이전 "잔류 node"는 하네스 런타임+별개 저장소 `custom-o` 혼입이었음). 실제 잔류 0이라 포트 강제 종료 안전망은 근거 없음 → 미추가(다른 프로세스 taskkill/SIGKILL 안 함). webServer `gracefulShutdown{SIGTERM,5s}`만 유지.
- **키보드 전용:** Tab 도달 후 케이스·액자 두 흐름을 마우스 없이 각 단계 focus-visible 확인 + Enter/Space 교차 활성화로 완료 요약까지 검증.
- **viewport matrix(10):** 320×568·360×800·390×844·844×390·430×932·932×390·768×1024·1024×768·1280×800·1440×900 전부 수평 overflow 0 / control 44×44 & 폭 내 / axe serious·critical 0 / console error 0.
- **누출 0:** DOM에 raw document·이미지·path·diagnostic code·합성 secret marker 미검출(E2E 검증). 정확 catalog URL만 요청(hit 1/unexpected 0), route miss=즉시 실패, admin endpoint 요청 0.
- **시각 근거:** `docs/rebuild/results/spec-017/browse-{mobile-390x844,desktop-1280x800}.png`(합성 fixture만, 운영 데이터 0). `docs/rebuild/design/*-B.png` 5종 무수정.
- **NOT TESTED(정직 기록):** 실제 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱, 실제 200% 확대, 실제 Firebase GET·`test:live:*`. **이 DONE은 자동검증 단계 완료이며 실기기 검증 전 출시 완료가 아님.**
- **무변경:** 운영 HTML·Firebase 설정/Rules 2종·`poc/**`·디자인 PNG·`apps/admin/**` baseline hash UNCHANGED. Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0. Router/Zustand/새 라이브러리 0.
- **커밋:** 코드/test와 문서/핸드오프 분리(`spec 017:`). 핸드오프 `docs/2026-07-27-spec-017-mobile-catalog-browse-ui-handoff.md`.

---

### Codex 최종 판정 — 승인 가능 (2026-07-27)

- **판정:** 스펙 017 = **승인 가능**. **승인 기준 HEAD = `711bb3e`**.
- **게이트 최종:** **unit 202** / **e2e 34** / **check PASS**.
- **키보드 전용:** 케이스·액자 **전체 흐름**을 마우스 없이 각 단계 focus-visible 확인 + **Enter·Space 교차 활성화**로 완료 요약까지 검증.
- **E2E 잔류 프로세스:** 저장소 소속 preview/Vite/esbuild 잔류 **0**, 포트 4183/4184 LISTENING 0, Playwright exit 0.
- **teardown:** `globalTeardown`·포트 기반 강제 종료 **없음**. webServer `gracefulShutdown{signal:"SIGTERM", timeout:5000}`만 유지.
- **유지(NOT TESTED):** 실제 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 4환경, 실제 200% 확대, 실제 Firebase GET·Canvas·이미지·저장·주문·배포는 미착수. 이 승인은 **자동검증 단계 종료**이며 실기기 검증 전 출시 완료가 아니다.
