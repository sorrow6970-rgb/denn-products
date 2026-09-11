# 124 — 준비bridge 합성 native 검증

2026-09-11 / 기준3287aaf / DONE / CODEX_PASSED(동일Codex 구현·자체검수).
사용자 `이어서해줘` 및 기존 중요사항외 루틴. 새 제품결정은 없으며 실사진·UI·운영권한 확대0.

## 목표 (WHY)

123의 합성unit을 넘어 실제100+123+121+119 경로에 native FileReader/createImageBitmap을 결속한다.
검증대상은 치수 인계와 자원수명·차단 순서다. 사진의방향/색/픽셀재현·제품룸UI 구현이 아니다.

## 범위 / 대상 (SCOPE / WHERE)

정확 코드6:

- 신규 apps/mockup/src/e2e/background-absence-preparation-check.ts
- 수정 apps/mockup/src/e2e/room-background-file-fixture.tsx — import/고유prepare-prefix dispatch/buttons만
- 신규 tests/e2e/background-absence-preparation.spec.ts
- 신규 tests/background-absence-preparation.config.ts
- 수정 scripts/e2e-run.mjs — 정확 selector3 추가만
- 수정 scripts/e2e-run.test.mjs — selector3검증만

문서7: 이spec,124 review/handoff,STATE/NEXT/CURRENT/live.
기존room-placement 제품코드·기존E2E단언/122codec·기본앱·barrel·CSS·Rules·package/lockfile변경0.
기존보호/사용자23(AGENTS.md/debug.log/별도문서/설정포함) 수정/복원/stage금지.
실사진/UID/Firebase/운영/배포/설치/다운로드/예약자동화0. 로컬fixture localhost만.

## 구현 (WHAT / HOW)

1. 122의수작업3×2 core-only JPEG(DQT/DHT/SOF/SOS)·PNG(IHDR/IDAT/IEND)를새fixture private helper로
   재사용한다. 기존122파일은수정하지않는다. Canvas 인코딩·실제사진metadata제거·다운로드0.
2. 123port의 readRequest는같은identity에같은Blob/maxEdge64만 반환. 실제100controller를사용하고
   frame capture는48×32 치수+release 카운터인 합성자원. actual FileReader는119기본경로.
3. trusted decode는검사된동일Blob/options를그대로native createImageBitmap에전달.
   reject case만resizeWidth:0으로같은Blob의native거절유도. 다른Blob로바꾸거나제품오류처리수정0.
4. native완료관찰 후 promise delivery gate를보류해 clear/dispose/source-change/pending-replace를실행.
   이는브라우저decoder 자체중단이아니라완료인계지연시험. gate해제후known microtask정착확인.
5. complete가성공하면100 readPrepared치수확인 후 controller.clear/dispose→port.dispose.
   native wrapper.close가bitmap.close를호출한횟수와native너비/높이0을확인한다.
   failure-only finally safety-close 전 needsSafetyClose:false 필수. GC/메모리반납완료주장0.
6. metadata case는APP0/tEXt를처음부터합성해118에서거절. capture-fail/source-fail은lookup/read/decode0.
   요청시각까지native read/bitmap/Canvas/URL/Image 호출0. 원bitmap·개인정보·rawSDK에러노출0.

### 검증행렬 (2형식 × 9경로 = 엔진당18)

| action | 첫결과 | frame release | lookup/read/decode | native close |
|---|---|---|---|---|
| normal | ok,frame48×32/background3×2 | 1 | 1/1/1 | 1 |
| clear | CANCELLED | 1 | 1/1/1 | late1 |
| dispose | DISPOSED | 1 | 1/1/1 | late1 |
| source-change | SUPERSEDED | 1 | 1/1/1 | 1 |
| pending-replace | 첫SUPERSEDED/둘째BACKGROUND_FAILED | 2 | 1/1/1(추가0) | late1 |
| reject | BACKGROUND_FAILED | 1 | 1/1/1 | 0 |
| metadata | BACKGROUND_FAILED | 1 | 1/1/0 | 0 |
| capture-fail | CAPTURE_FAILED | 0(획득0) | 0/0/0 | 0 |
| source-fail | SOURCE_BLOCKED | 0(capture0) | 0/0/0 | 0 |

오류코드는기존ROOM_PREPARATION_ 접두. 모든실패ready:null,최종port/controller disposed,
원bitmap있으면해제뒤0×0,없으면null. pending교체이외둘째결과null. 정상외자동재시도0.
순서는source gate→capture→lookup→read→decode. frame capture 호출은capture-fail1/source-fail0.
report는고정code/boolean/카운터/치수만. 외부요청·console warning/error·pageerror0,
Canvas/URL.createObjectURL/Image생성0,canvas/img/input[type=file] DOM0.

## 검증 (VERIFY)

- `node node_modules/vitest/vitest.mjs run scripts/e2e-run.test.mjs`
- `node scripts/check.mjs` 전체. 기준unit3528+selector3=3531 예상(실측전PASS표시금지).
- `node scripts/e2e-run.mjs --absence-preparation-chromium-only`
- 같은명령 `--absence-preparation-firefox-only`, `--absence-preparation-webkit-only`.
  엔진별workers1,기존base/globalSetup/4183·4184·4185서버소유권/temp삭제guard 불변.
  설치된Playwright/브라우저만. Firefox는기존122에서검증한일반실행권한을도구심사로요청가능하나
  실제권한거절/설치요구/flaky는STOP,우회/반복재시도하지않는다.
- 기존 `--background-lifecycle-only`46 및 `--absence-decode-chromium-only`12 회귀.
  새54+기존58=112 예상. default전체E2E는보호PNG를쓰기때문에실행하지않는다.
- selector외인자/혼합거부,보호23·기본번들3 SHA불변,diff--check,정확code6/docs7,
  자기temp부재/포트listen0. 자체검수후코드/문서분리일반commit/push(119지속승인).

## 위험 / 판정

소형합성codec경로만증명한다. native PASS여도일반metadata지원/실사진/실기기/원bitmap그리기/UI/
운영허가는생기지않는다. 기존116PNG14불일치미해결. 기존모듈변경필요/새권한/게이트설명불가면STOP.
확인되지않은네이티브동작은NOT TESTED로남기며성공수를추정하지않는다.

### QUESTIONS

새 Founder 질문 없음. 이비연결검증범위외구현은허용하지않는다.

### DONE (Codex) — 2026-09-11

코드ce9d4cf,정확코드6(신규3/기존3의한정추가). 계약검토→구현→자체검수,독립검수아님.
actual100/123/121/119+native FileReader/createImageBitmap,2합성형식9경로를실행했다.

| 실행 | 실측 결과 |
|---|---|
| runner selector unit | 32/32 PASS(기존29+추가3) |
| 전체check | format/lint354파일,typecheck7,unit3531/3531=3528+3(116파일),build2 PASS |
| 신규Chromium | 18/18 PASS,4.4s |
| 신규Firefox | 18/18 PASS,44.7s; 도구승인된일반환경,설치0 |
| 신규WebKit | 18/18 PASS,42.0s |
| 기존Chromium lifecycle | 46/46 PASS,5.6s |
| 기존Chromium absence-decode | 12/12 PASS,3.1s |

새54=18×3,기존58=46+12,이번브라우저합계112 모두PASS. 이번124브라우저실패/재시도0.
최초check는추가버튼배열format1건실패,허용fixture추가부분format후전체check PASS. 단언완화0.
기존500kB chunk warning 유지. 전체canonical E2E(보호PNG재생성)는실행하지않았다.

정상은최종clear전해제0/clear후양쪽1,실패·취소는최종정리전이미필요자원해제됨을beforeCleanup으로검증.
모든case needsSafetyClose:false,source/capture실패lookup/read/decode0,metadata read1/decode0,
pending교체추가lookup/read/decode0,외부egress/console warning·error/pageerror/Canvas/URL/Image0.
nativebitmap은존재시해제후0×0. frame은합성치수자원이지actual frame paint가아니다.

보호/사용자23와기본번들3 SHA시작값동일. 정확code6/docs7외추가변경0,diff--check PASS.
자기temp Y5o2ra/AE6M9G/cEUl2R/IsnQXO/EcUPjF 모두부재,4183/4184/4185 listen0.
실사진·일반metadata·실기기·기본룸UI·운영 NOT TESTED/미개방,기존116PNG14불일치미해결유지.

다음은실제표시를위한제한paint사용권과준비세대결속의계약검토다. 현재size-only결과를drawable로
가장하지않고102 paint계약/100·123소유권과차이를조사한다. 새제품코드는새정확계약전착수0.
