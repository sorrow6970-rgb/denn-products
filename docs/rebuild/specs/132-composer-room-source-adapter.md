# 132 — 실제 Composer의 룸 source adapter

2026-09-11 / 기준 e0f69e7=origin·0/0. 131 code595cb6a/docs e0f69e7 DONE.
상태: CONTRACT_REVIEW_IN_PROGRESS. FP-1=A 승인으로 공급 문서 보완 완료; 전체 구현 계약은 아직 미확정.
결정 정본: [FP-1 관리형 폰트 공급](../../codex-claude-handoff/decisions/2026-09-11-fp1-managed-font-supply-decisions.md).
사용자의 스펙간 루틴에 따라 기술 검토를 계속하며 일반 구조 결정의 재승인을 요청하지 않는다.

## 목표 (WHY)

131의 합성 시안 대신 실제 PreviewComposer가 채택한 최종 plan·사진·아트·폰트와 source를
결속한다. 오래된 snapshot을 최신 시안으로 사용하는 것을 막는 것이 목적이다.
룸 화면/사진 선택/합성 조작 UI를 이 단계에서 새로 만들거나 일반사진 지원 문제를 숨기지 않는다.

## 현재 코드 근거

- `apps/mockup/src/preview/PreviewComposer.tsx`: ImageSlot은 passive effect로 state/bindings만
  보고한다. report dedup도 두 참조만 비교한다.130 readReadyProof는 아직 전달하지 않는다.
- 같은 파일의 artSource는 memo, 실제 load는 passive effect다. 현재 ready 상태만 보면
  새 요청과 이전 아트가 겹치는 commit을 구분하지 못한다.
- built는 probe와 최종 plan을 별도로 만든다. source 대상은 built.plan뿐이다.
  frameTrialRef는 render 중 갱신되므로 committed source 증명으로 사용하지 않는다.
- fontsReady는 mount 시 ready Promise 결과이고 fontsAvailable은 요청 shorthand check다.
  이후 폰트 환경 교체까지 증명하는 수명 토큰은 없다.
- 색/문구/변환/ResizeObserver/viewport/사진 변경 경로가 있으며 일부 변환은 state updater 안에서
  계산한다. updater 안에서 source invalidate·자원 해제를 하면 안 된다.
- `apps/mockup/src/browse/BrowseFlow.tsx`: 선택 dispatch가 parent state를 바꾸고 PreviewSection key가
  자식 수명을 종료한다. catalog 객체 교체 자체는 이 key에 들어있지 않다.
- clockPlacement는 DOM 시계다. 시계가 존재하는 source를 clockPreview:null로 위조하지 않는다.

## 대상 (WHERE) — 검토 중인 정확 후보

코드/시험 후보13파일(착수 전 확정 필요):
1. apps/mockup/src/preview/PreviewComposer.tsx
2. apps/mockup/src/preview/PreviewComposer.test.tsx
3. apps/mockup/src/preview/composer-room-source.ts (신규)
4. apps/mockup/src/preview/composer-room-source.test.ts (신규)
5. apps/mockup/src/preview/composer-font-proof.ts (신규)
6. apps/mockup/src/preview/composer-font-proof.test.ts (신규)
7. apps/mockup/src/e2e/composer-room-source-fixture.tsx (신규)
8. apps/mockup/src/e2e/canvas-fixture.tsx
9. tests/composer-room-source/source.spec.ts (신규)
10. tests/composer-room-source.config.ts (신규)
11. scripts/e2e-run.mjs
12. scripts/e2e-run.test.mjs
13. apps/mockup/src/browse/BrowseFlow.tsx (부모 입력 무효화 필요성 검토 대상)

현재 문서8: 이 spec,132review/handoff,STATE/NEXT/CURRENT/live,FP-1 결정 정본.
후보 밖 파일이 필요하면 코드 작성 전에 계약을 다시 검토한다. 제품 의미 확대라면 Founder 질문.
현재 문서8 외 수정0. 기존131 코드 변경은 이 스펙의 묵시적 허용이 아니다.

## 구현 방향 (WHAT / HOW) — 확정 전 검토 조건

### 1. 노출과 소유권

- 내부 attach/detach port로 readSource/invalidate를 전달한다. source 원문을 DOM·window·storage·로그에
  내보내지 않는다. 기본 화면에 새 버튼/query/room Canvas/자동 capture/자동 decode를 추가하지 않는다.
- actual131 hook +129 owner +102 capturer를 재사용한다. 전역 registry·중복 이미지 owner 금지.
- source 등록은 React commit만. render는 외부 publish·URL 생성·기존 owner 해제0.
- callback 변경/StrictMode/unmount의 attach 해제 순서를 계약과 native 시험에서 고정한다.
  과거 detach가 새 attach를 지우는 ABA 문제를 opaque incarnation으로 구분한다.
- 소비자가 없을 때 추가 snapshot Canvas/URL/네트워크0. 기존 print/export 계약은 변경하지 않는다.

### 2. 이미지와 아트

- ImageSlot은 현재 render의130 proof reader를 state/bindings와 함께 보고한다.
  old reader가 다음 decode를 채택하지 못해야 한다. report가 무한 rerender를 만들면 안 된다.
- required photo 전체와 실제 art의 proof를 source.read/get 전후에 확인한다.
- art의 '요청 입력 identity'와 '실제로 load한 identity'를 구분한다. required=false만 아트 없음이다.
  required-but-unresolved/failed/이전 요청 ready는 차단한다. 늦은 성공은 새 요청 증명이 아니다.
- catalog 동일 ID/객체 교체, slot owner 교체,clear/load/dispose 후 새 부모 report 이전도 검증한다.

### 3. 입력 즉시 무효화

- accepted color/text/scale/pan/rotate/reset/photo/viewport/width 변경은 state setter나 RAF 대기보다
  먼저 이전 source를 무효화한다. rejected text/같은값/noop는 현재 source를 불필요하게 폐기하지 않는다.
- updater 내부 부작용0. 연속 입력·동일 tick·동시 렌더에서 이전 state를 잘못 사용하지 않도록
  pending 입력과 committed 입력의 정확 소유권을 먼저 설계한다.
- 부모 selection/catalog 교체와 자식 commit 사이의 규칙을 명시한다. 이전 render ref를 최신값처럼
  publish하지 않는다. Suspense가 미완 render를 버릴 때도 source가 되살아나면 안 된다.
- 드래그 시작 자체/활성 slot 선택과 실제 plan 변경을 구분한다. mouse/keyboard/wheel/RAF 경로 모두 포함.

### 4. 폰트와 시계

- text 없는 plan과 폰트가 필요한 plan을 구분한다. 후자는 정확 측정 환경과 현재성 증명이 필요하다.
- FontFaceSet ready/check만으로 모든 이후 환경 변경을 감지한다고 주장하지 않는다.
  지원 API·이벤트·face identity/descriptor/state 재검사 또는 비교 가능한 환경 토큰을 조사한다.
  event 없는 add/delete/descriptor 변경과 OS/system font 교체도 보장 범위를 구분한다.
- 근거가 없는 브라우저 API나 보장되지 않은 전역 폰트 불변성은 UNCONFIRMED로 남긴다.
  text를 조용히 빼거나 제품 지원을 photo-only로 축소하여 통과시키지 않는다.
- clockPlacement가 있으면129의 기존 gate로 source 차단. DOM 시계를 캡처한 것으로 주장하지 않는다.

## 검증 절차 (VERIFY) — 착수 전 행렬 확정

- exact helper unit: invalid/throwing/reentrant 입력, art 요청 일치, old proof,폰트 변화·cleanup,소유권.
- 실제 Composer +130 owner +131 hook +102 capture를 synthetic catalog/photo/art/font 환경에서 검사.
  Chromium/Firefox/WebKit opt-in config,외부 요청 abort; page-owned same-origin blob만 허용.
- 기본 미선택 IO0,최종plan만capture,동일candidate불변,색/문구/변환/사진/폭/viewport 변경,
  art 교체 지연,required없음/실패,폰트 지연/실패/변화,시계/case차단,부모교체/StrictMode/중단render,
  옛lease paint0/해제1/URL누수0/console0/private원문0/기본roomUI추가0.
- 기존 mockup-preview 회귀는 screenshot 작성 테스트를 제외하는 정확 selector를 고정한다.
  보호018 PNG를 쓰는 기본전체E2E 금지. 기존131 33+owner11+pair20 회귀도 지정한다.
- node scripts/check.mjs,targetedunit,diff--check,허용경로/보호23SHA,temp·포트0.
  실제 Composer 코드 변경이므로 고객JS hash 변화는 정량 보고한다. CSS/admin 기본번들은 불변.
- code/docs 분리 일반 commit/push 후 HEAD=origin·0/0. 보호·운영 데이터 전송0.

## 위험 / 계속 금지

실사진·실측·실기기·실제UID·Firebase/운영 데이터·발행·삭제·배포·설치·예약자동화0.
보호/사용자23파일 수정·restore·stage·commit0. packages/render/src/plan/index.ts 포함.
기존116 WebKit PNG14 지원 문제는 미해결이며 이 스펙 성공으로 대체하지 않는다.
전체 리빌드 분모/잔여 총 스펙수 UNCONFIRMED. 실제 룸 UI·사진호환·주문·운영 등은 남아있다.

### QUESTIONS — 기술 검토 항목, Founder 승인 질문 아님

1. 상태 updater 밖 즉시무효화와 연속 입력/noop 보존을 함께 만족하는 정확 방식 확정.
2. 부모 selection/catalog pending 변경의 attach/invalidate 책임과 정확 파일13 필요성 확정.
3. 실제 browser font 환경 proof의 보장 한계·API 근거/테스트를 확인한 뒤 구현 가능 판정.

이 세 항목은 기술 검토를 계속한다. 불확실성을 승인된 구현 계약으로 기록하지 않는다.

### DONE (Codex)

초안/현재코드 조사만 수행. 구현·신규검증 NOT TESTED. 계약 자체검토 통과 전 제품코드 변경0.

## 2026-09-11 계약 검토 결과 — 폰트 정책 경계

재개 기준 a85da9f=origin·0/0. 기술 검토 중031의 요구와 사용 API 사이 불일치 발견.
제품코드를 붙이기 전 중지했다. 기존031/131 완료 이력을 소급 삭제하지 않으며,
그 당시 unit/native PASS가 지정 family 존재를 증명하지는 않았음을 구분한다.

### 확인된 근거

- 031 계약:33은 신규/원격 폰트 로드0, :54–55는 요청 family 미준비 시 차단,
  :216–218은 정확 shorthand의 fonts.check를 검사 수단으로 정한다.
- PreviewComposer.tsx:420–438은 실제로 check만 검사한다. :402는 mount 시 ready Promise다.
- W3C **CSS Font Loading Module Level 3**, §3.3/3.4:
  https://www.w3.org/TR/css-font-loading-3/#font-face-set-check
  (2023-04-06 Working Draft; 확인2026-09-11, Recommendation으로 부르지 않음).
  check=true는 요청 family 존재/해당 글리프 소유 증명이 아니다. 없는 family나 unicode-range로
  후보가 없어도 fallback으로 추가 로드가 필요 없으면 true다. ready 후에도 새 로드는 가능하다.
  2026-07-20 Editor's Draft https://drafts.csswg.org/css-font-loading/ §3.3에서도 같은 설명 확인.
- React **useState** https://react.dev/reference/react/useState (확인2026-09-11): updater는 순수해야 하며
  StrictMode에서 반복 호출될 수 있다. 무효화/cleanup은 updater 밖의 입력 수용 경계가 필요하다.
- React **useLayoutEffect** https://react.dev/reference/react/useLayoutEffect (확인2026-09-11):
  commit 측 effect/cleanup 규약을 source attach에 사용하되 미완 render publish를 하지 않는다.
- git ls-files의 woff/woff2/ttf/otf 결과0. 일반 rg --files 같은 확장자 검색도0.
  tracked/일반 검색 범위의 사실이며 ignored 운영자 자산·실제 카탈로그·OS 폰트 부재 주장이 아니다.
  OS 폰트 목록·실제 font 자산·사용자 데이터 조회0.

### 합성 read-only API 진단 (회귀 E2E 통과와 구분)

기존 설치된 @playwright/test의 chromium/firefox/webkit을 각각 headless 실행했다.
빈 setContent 페이지 + 모든 request abort. 브라우저별 새 context, finally browser.close().
입력 family=`__DENN_SYNTHETIC_MISSING_FONT_132_a85da9f__`; 파일 생성/다운로드0.

| engine | document.fonts.size | 가짜 family 단독 check | 가짜 family + sans-serif check | 요청수 |
|---|---:|---|---|---:|
| Chromium | 0 | true | true | 0 |
| Firefox | 0 | true | true | 0 |
| WebKit | 0 | true | true | 0 |

3엔진×2검사=6개 true 실측, 진단 명령 exit0. 구현 테스트 PASS로 집계하지 않는다.
이는 지정 폰트 검증에 check만으로 충분하다는 주장의 반례다. 현재 운영자 폰트가 실제로
빠졌다는 증거나 모든 텍스트 출력이 틀렸다는 증거는 아니다. 해당 상태는 NOT TESTED.

### 기술 후보1/2와 아직 미증명인 부분

- 입력 후보: 순수 reducer가 pending immutable snapshot을 계산 → 의미 변화가 있으면
  입력 handler에서 epoch 무효화 → React에 값 전달. noop/rejected 입력은 token을 유지한다.
  이 순서를 React updater 안에 넣지 않는다. 연속입력/재진입/중단render/늦은RAF는 아직 미구현·미검증.
- 부모 후보: selection 수용 시 동일 무효화 port, 자식 attach는 incarnation별 detach로 분리.
  외부 catalog props의 '제공 전 미래 값'은 자식이 알 수 없으므로 upstream 입력 책임까지 명시해야 한다.
  현재 후보13파일로 완결된다는 판정은 아직 하지 않는다.
- 폰트 membership/descriptor/status stamp는 일부 변경 탐지 후보일 뿐, family 존재·glyph
  coverage·OS/system font 전체 불변성의 증명이 아니다. check/load 호출 추가나 임의 측정 문자열
  폭 비교만으로 이 문제를 해결했다고 기록하지 않는다. text 삭제/photo-only 우회0.

### FP-1 — 승인 전 선택지 이력 (아래 최신 A 승인으로 대체)

권장 A: 지정 폰트 파일의 출처·사용권·family/weight/문자 범위를 확인하여 앱이 관리하는
폰트 공급 계약을 먼저 만든다. 확인 불가 폰트는 차단하며 조용한 대체를 허용하지 않는다.
이는 자산 선정/공급 방식 변경이므로 기존 '신규/원격 폰트 로드0'을 자동으로 해제하지 않는다.
A 선택 후에도 이번 다음 허용 범위는 문서 조사·공급 계약뿐이며 다운로드/설치/운영조회는 별도 권한.

B: 시스템/대체 폰트 사용을 명시적으로 허용하는 제품 계약으로 변경. 기기별 글자 모양·줄바꿈
차이 및 인쇄 검증 범위를 다시 결정해야 하며 기본값으로 채택하지 않는다.
선택 보류 시 현재처럼132 구현 보류. 기존 기능/폰트/문구를 자동 변경하지 않는다.

현재 판정: 계약 자체검토 미통과,제품코드/test/config변경0,132 신규 구현 게이트 NOT TESTED.
문서7에 중지 근거만 남긴다. 자동루프 STOP 규칙에 따라 이 상태에서 stage/commit/push0.

## FP-1=A 관리형 폰트 공급 계약 — 문서 보완 완료

2026-09-11 사용자 `응 보완해`: 직전 A 방향과 문서 보완만 승인. 위 STOP은 승인 전 이력이다.
이 절의 요구사항은 공급 자산의 수용 기준이며 제품 구현·실제 로드 성공 판정이 아니다.
판정: FONT_SUPPLY_DOCUMENT_REVIEW_PASSED(동일 Codex). 전체132 구현 계약 검토는 계속 필요하다.

### S-1. 공급 기록 — 실제 manifest가 아닌 문서 필드

| 기록 묶음 | 반드시 남길 근거 | 현재 |
|---|---|---|
| 출처 | 원 제작/배포 주체, 공식 release URL·버전, 확인일, 공급 책임 주체 | UNSELECTED |
| 사용권 | 정확 release에 대응하는 원문 license/notice, 웹 배포·앱 포함·상업 출력·변경 조건 검토 기록 | UNCONFIRMED |
| 파일 | 제공 승인된 상대 경로, 파일 형식·byte 수·SHA-256, face index(필요 시), 원본/가공 관계 | NOT PROVIDED |
| 스타일 | 실제 family·subfamily·weight·style·stretch, variable 축/허용 인스턴스, catalog 이름과의 명시 매핑 | UNCONFIRMED |
| 문자 | 실제 문자 매핑·누락·variation sequence·shaping 검증 범위와 제외 항목 | NOT TESTED |
| 재현 | 브라우저/버전·시험 입력·판정 기준·소유권/해제 기록,기기/인쇄 제한 | NOT TESTED |

공란을 '허용/지원'으로 해석하지 않는다. 이름만 같은 다른 binary/버전/굵기를 같은 자산으로 취급하지 않는다.
공급 파일 수·총byte·기기 메모리 한도·사용권 비용·실제catalog family목록은 UNCONFIRMED.
구체적 자산은 선정하지 않았다. 무료라는 소개, 저장소 공개,OS 설치 사실만으로 배포 권리를 확정하지 않는다.
fsType 등의 기술 필드는 검토 입력이고 웹 재배포 계약 원문을 대신하지 않는다는 DENN 수용 규칙을 둔다.

### S-2. 문서와 실제 파일 사이 수용 게이트

1. 공식 문서 조사: 출처·license 후보를 기록하되 binary 요청/취득0. 후보 목록과 채택을 분리한다.
2. 파일 수용 전: 공급 대상·경로·취득 권한과 사용권 근거를 확인. 권한 없으면 여기서 정지한다.
3. 허용된 정확 파일이 제공된 뒤에만 byte/hash·스타일·문자 지원을 검증할 로컬 절차를 계약화한다.
   변환/subsetting으로 누락을 감추거나 검사를 통과시키지 않는다. 필요 시 별도 범위·권리 검토.
4. 지원 family/style/문자 입력과 로드 실패 입력을 합성 시험으로 고정한 뒤 browser owner를 검증한다.
5. 위 게이트 및132의 입력/부모/commit 검토가 끝난 후에만 정확 구현 파일·명령·회귀 범위를 확정한다.

각 게이트의 성공은 다음 게이트 성공을 의미하지 않는다. 이 작업은1단계의 수용 기준 문서화만 완료했다.
아직 특정 자산 출처/라이선스 후보 조사나 파일 수용은 완료하지 않았다.

### S-3. 파일 identity와 브라우저 font 수명 — 설계 요구

- catalog family 표기는 저장 데이터 의미를 유지한다. 내부에서 승인 자산 identity에 명시 매핑한다.
  ID 유사검색·자동 family 교정·기본폰트 선택으로 호환시키지 않는다. 내부alias는 catalog에 되쓰지 않는다.
- 장래 owner는 승인한 byte/hash·face/style·매핑 revision에 묶인 FontFace를 관리한다.
  CSS family 문자열이나 document.fonts.check=true만으로 ready를 발급하지 않는다.
  구체적 API/alias 생성/등록 범위·캐시 예산·파일 형식은 후속 구현 계약에서 확정하며 현재 미구현이다.
- OS local()나 CDN fallback으로 승인되지 않은 파일을 채택하지 않는다. 임의 network URL 입력을 받지 않는다.
- 최소 상태는 unavailable→preparing→ready→retired/disposed이며,실패는 unavailable로 결과를 공개한다.
  늦은 성공은 폐기된 세대를 되살리지 않는다. retry는 명시 동작만,백그라운드 자동 재시도0.
- ready 증명에는 자산 identity,owner incarnation,정확 style/axes,승인된 입력 문자 조건을 묶는다.
  source가 차용한 증명은 측정 전후·최종plan 채택·102capture/paint 전후에 검증해야 한다.
- 입력/폰트 교체 시 옛source부터 무효화한다. in-flight 차용자가 끝나기 전에 필요한 font를
  제거하지 않고,자기 등록 자원만 정리한다. StrictMode의 옛cleanup은 새등록을 해제하지 못해야 한다.
- 모든 FontFaceSet event가 모든 변화를 알린다고 가정하지 않는다. 외부등록/삭제/descriptor drift,
  source 재진입/폐기 시 차단을 시험한다. FontFace 등록 성공만으로 전체glyph 재현을 증명하지 않는다.

### S-4. 문자와 레이아웃 — 조용한 대체 금지

- 검사 대상은 실제 편집 문구다. 임의 ASCII 문자열의 check/measure 폭만으로 한글·기호 지원을 승인하지 않는다.
- 승인 byte의 문자 매핑/누락 glyph를 검사하고,style 및 variation sequence를 구분하는 근거가 필요하다.
  개별 code point의 cmap 성공만으로 복합문자·한글 조합·ligature·emoji/ZWJ shaping까지 PASS라고 하지 않는다.
- space/newline/variation selector/결합부호는 일반 가시 glyph와 다를 수 있다.0glyph 일괄 규칙을
  코드에 바로 적용하지 않고 입력/sequence별 검증 계약을 먼저 만든다. 원문 trim/Unicode 정규화0.
- 실제 font+browser에서 승인 범위의 조합·줄바꿈·letter spacing·회전·각 style을 검증해야 한다.
  coverage 표/화면 관찰만으로 전체 Unicode 또는 모든 실제기기를 보장하지 않는다.
- 지원 불명·누락·잘못된style이면 해당 텍스트가 포함된 새source를 발급하지 않는다.
  fallback/자동 synthetic bold·italic/문구 생략·사진만 capture는 허용하지 않는다.
  입력창/안전 안내의 UI와 오류 코드·직전 시안 표시 방식은 아직 구현하지 않는다.
- 측정과 실행은 같은 폰트 증명을 사용한다. source proof에 새text값과 style이 포함되어야 하며,
  고객 preview/룸capture/인쇄의 글자와 wrap 정합성을 따로 검증한다. 기존 print 코드를 이 문서로 수정0.

### S-5. 후속 검증 행렬 (모두 NOT TESTED)

| 경계 | 필수 시험 | 수용 기준 |
|---|---|---|
| 자산 | 없는mapping/동명다른hash/버전변경/잘못된face·style/미확인사용권 | 새source0,자동대체0 |
| 글자 | 한글완성형·조합,영문/숫자/문장부호,누락문자,결합부호/variation/ZWJ | 승인범위만 통과,불명은 차단 |
| 로드 | missing family인데 check=true,load reject,hash불일치,late resolve | check만으로 ready0,세대역전0 |
| 수명 | 폰트교체/삭제,StrictMode,unmount,in-flight capture,옛cleanup | 옛proof/paint0,자원단일소유 |
| 재현 | 정확fixture의glyph·wrap·회전·굵기,preview/룸/인쇄,3브라우저 | 비교조건·허용오차 선행명시,skip을PASS로계상0 |
| 비간섭 | 미선택/빈문구/시계·case차단,외부egress,default UI | 추가로드0,기존계약유지 |

기존3엔진×2check=6true는 이전 API반례 실측일 뿐 이 행렬의 PASS가 아니다.
실제 폰트 binary·라이선스·glyph coverage·브라우저메모리·실기기·운영은 현재 미확인이다.

### S-6. 공식 근거와 검토 한계

확인2026-09-11,공식 본문만 사용. 아래 API 사실과 위 DENN 설계 요구사항은 구분한다.
- [W3C CSS Font Loading Module Level3 §2/3](https://www.w3.org/TR/css-font-loading-3/)
  (2023-04-06 Working Draft): FontFace 수명/등록 및 check/ready의 한계. 최종 Recommendation 주장0.
- [Microsoft OpenType cmap — Character to Glyph Index Mapping](https://learn.microsoft.com/en-us/typography/opentype/spec/cmap):
  문자코드와기본glyph 매핑,미지원문자의glyph0(.notdef),format14 variation sequence를 기술한다.
  이 표로전체shaping/브라우저pixel을 증명한다는 뜻이 아니다.
- [Microsoft OpenType OS/2 — fsType](https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype):
  embedding 관련기술필드의참조. 특정파일의값·사용권조건은 이번에읽지않았고 법적허용을판정하지않았다.

### S-7. 완료와 다음 범위

FP-1=A 기록·공급수용기준 문서 자체검토 완료.132 전체 구현승인/DONE 아님.
남은일: 공식 공급/사용권 후보 문서조사→정확자산 수용권한·검증계약→132전체계약 재검토.
다음 문서조사는 이spec/review/handoff·FP-1결정·STATE/NEXT/CURRENT/live,같은8파일 범위다.
새 binary/manifest/CSS/제품/test/운영/설치/보호파일0. 파일취득 권한은 이 문서에서 자동확대하지 않는다.
