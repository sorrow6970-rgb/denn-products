# 132 — 실제 Composer의 룸 source adapter

2026-09-11 / 기준 e0f69e7=origin·0/0. 131 code595cb6a/docs e0f69e7 DONE.
상태: CONTRACT_REVIEW_IN_PROGRESS. FP-1=A/FP-2 공급 진단 완료,debug.log 단일보존예외 승인.
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

### S-8. 공식 공급 후보 조사 — 2026-09-11

공식 저장소의 목록·METADATA·OFL 텍스트만 읽었다. 폰트 binary 요청/취득0.
아래는 수용 검증 **후보**이지 승인된 catalog family 목록이나 자동 대체 순서가 아니다.
DM Sans는 기존 합성 fixture 문자열과 비교하기 위해, Noto Sans KR은 한국어 지원 후보를
분리 검토하기 위해 조사했다. 실제 운영 catalog의 사용 font 목록은 조회하지 않았다.

| 문서 후보 ID | 공개 metadata에서 확인한 공급물 | 한계와 수용 조건 |
| --- | --- | --- |
| FC-1 | DM Sans: `DMSans[opsz,wght].ttf` normal, `DMSans-Italic[opsz,wght].ttf` italic; wght 100–1000, opsz 9–40 | metadata subsets는 latin/latin-ext/menu. 한국어 지원 증거로 사용할 수 없음. opsz 고정값·style/weight별 재현 정책 미선정 |
| FC-2 | Noto Sans KR: `NotoSansKR[wght].ttf` normal; wght 100–900; korean 등 subset 표기 | 열람한 metadata에는 italic face가 없다. 임의 synthetic italic 금지. 한국어 표기가 모든 입력·shaping 지원을 증명하지 않음 |

출처/제목/확인일(모두 2026-09-11):

- [Google Fonts — DM Sans METADATA.pb](https://github.com/google/fonts/blob/main/ofl/dmsans/METADATA.pb).
  source commit 표기 `d0520ba03bd780f5dccb3024854463d44f699b78`.
- [Google Fonts — Noto Sans KR METADATA.pb](https://github.com/google/fonts/blob/main/ofl/notosanskr/METADATA.pb).
  source commit 표기 `523d033d6cb47f4a80c58a35753646f5c3608a78`.
- [Noto CJK fonts README](https://github.com/notofonts/noto-cjk): Google Fonts 배포와 upstream의 명칭이 다름을 명시.
  `Noto Sans CJK KR`과 `Noto Sans KR`을 같은 파일/hash/face로 취급하지 않는다.
- [DM fonts upstream](https://github.com/googlefonts/dm-fonts): 열람 시 archived 표시.
  upstream HEAD를 현 Google Fonts 공급물과 자동 동일시하지 않는다.

위 source commit은 배포 metadata가 가리키는 upstream 이력일 뿐, 열람한 google/fonts `main`의
배포 commit pin이나 실제 binary 버전·SHA 증명이 아니다. mutable URL을 로드 경로로 채택하지 않는다.
공급 commit, 정확 binary version, face index, 내부 name/axis 값은 UNPINNED/NOT PROVIDED.
upstream_info의 조사/버전 설명도 binary 검사나 실제 릴리스 고정을 대신하지 않는다.

### S-9. 사용권 근거와 배포 조건

확인일 2026-09-11. 라이선스 본문 확인과 DENN의 자산 취득/배포 승인을 구분한다.

- [DM Sans OFL.txt](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt):
  OFL 1.1, 2014 DM Sans Project Authors 저작권 표기. 열람한 header에는 별도 RFN 선언이 없다.
- [Noto Sans KR OFL.txt](https://github.com/google/fonts/blob/main/ofl/notosanskr/OFL.txt):
  OFL 1.1, 2014–2021 Adobe 저작권 및 Reserved Font Name `Source` 선언을 확인했다.
  다른 upstream/버전에 이 선언을 자동 전용하지 않는다.
- [SIL Open Font License Official Text — 1.1](https://openfontlicense.org/open-font-license-official-text/):
  조건부 사용·소프트웨어와 묶음 재배포를 허용한다. 저작권·라이선스 동봉, 폰트 자체 OFL 유지,
  폰트 단독 판매 금지, 수정본의 RFN 및 저작자 보증/홍보 제한이 있다.
  폰트로 만든 산출물 자체에 OFL을 강제하지 않는다. 조건 위반 시 권리가 종료된다.
- [SIL OFL-FAQ 1.1-update7 — §§1.1,1.3,1.10–1.13](https://openfontlicense.org/ofl-faq/):
  그림/인쇄 산출물과 폰트 파일 전달은 다르다. 앱에 묶는다고 앱 전체를 OFL로 바꿀 필요는 없지만,
  클라이언트에 파일을 전달하는 공급에는 해당 저작권·사용권 보존 조건을 반영해야 한다.

DENN 후보 수용 규칙: 승인된 원본 byte와 같은 배포 revision의 OFL/저작권을 함께 고정하고,
배포 시 열람 가능한 고지 위치를 별도 정확 계약에 포함한다. 현재 CSS alias 설계를 binary
내부 family명 수정 허가로 간주하지 않는다. 변환·subset·static instance 생성은 이번 범위 밖이다.
문서상 사용권 조건은 확인했지만 특정 취득 파일과의 일치·실제 고지 배포는 NOT TESTED다.

### S-10. 자산 수용 기록 초안 / 다음 권한 경계

| 수용 기록 | FC-1 | FC-2 |
| --- | --- | --- |
| 대상 후보 수 | normal/italic 2파일 | normal 1파일 |
| 공급처 후보 | google/fonts `ofl/dmsans` | google/fonts `ofl/notosanskr` |
| 배포 commit / binary version | UNPINNED / NOT PROVIDED | UNPINNED / NOT PROVIDED |
| byte 수 / SHA-256 / 내부 face | NOT PROVIDED | NOT PROVIDED |
| 사용권 원문 확인 | OFL 1.1 본문 확인; 실제 파일 결속 미검증 | OFL 1.1 + RFN Source 확인; 실제 파일 결속 미검증 |
| 실제 glyph·언어·shaping / 3엔진 | NOT TESTED | NOT TESTED |
| 취득 / OS설치 / 제품 등록 | 미승인 / 금지 / 미승인 | 미승인 / 금지 / 미승인 |

총 후보 binary 수는 2+1=3. 크기·전송비·메모리·실제 glyph 지원률은 추정하지 않는다.
문서상 variable 후보는 원본 유지가 가능하지만 axes와 optical sizing 검증이 추가로 필요하다.
static 공급은 axes 선택을 줄일 수 있어도 정확 별도 공급물·사용권 확인이 필요하며, 위 variable
파일을 변환하여 만드는 것은 승인되지 않았다. 둘 중 구현 형식을 아직 채택하지 않는다.

권장 다음 범위(FP-2, 아직 미승인): FC-1/FC-2의 원본 후보 3파일과 해당 고지를 **로컬 공급 검증용**으로만
취득할 권한. 실행 전 같은 공급 commit의 정확 URL/목적 경로/허용 파일·검사 절차를 문서로 고정한다.
OS 설치·패키지 설치·변환·제품 bundle 포함·자동 fallback·기존 catalog 수정·운영/배포는 제외한다.
선정은 검사 후보의 선정일 뿐 실제 고객 폰트/기본 디자인 변경 승인이 아니다.
권한 없이 binary 조회/다운로드하거나 '문서 조사'로 우회하지 않는다. 파일을 사용자가 제공하는
경우도 출처·OFL·정확 byte 결속 검증을 생략하지 않는다.

공개 후보 조사 자체검토 통과(PUBLIC_EVIDENCE_REVIEW_PASSED, 동일 Codex). S-1~S-7 원칙 유지.
현재 132 전체는 BLOCKED_FONT_ASSET_AUTHORITY / 제품 구현·자산 검증 NOT TESTED.
131 DONE 유지. FP-1=A 재승인 질문0; FP-2 취득 범위 확정 전 제품/다음 스펙 착수0.
STOP 규약에 따라 이번 조사 문서8은 unstaged로 보존하고 commit/push하지 않는다.

### S-11. FP-2 승인 후 정확 로컬 검증 계약

2026-09-11 사용자 `응 진행해`: 직전 명시한 원본3파일+사용권 고지의 로컬 검증용 다운로드 승인.
S-10의 미승인/STOP은 이전이력이다. 설치·제품적용·배포는 여전히 금지한다.
공개 GitHub API `/repos/google/fonts/commits/main`에서 직접 확인한 배포 pin:
`8e44913e4ff26fc997e6856c1ec40ff4791c98c5`. upstream source hash가 아닌 배포 저장소 commit이다.

정확 다운로드5개: URL 접두사
`https://raw.githubusercontent.com/google/fonts/8e44913e4ff26fc997e6856c1ec40ff4791c98c5/`
뒤에 아래 경로를 segment별 URL encode해서 붙인다. 인증정보 없이 공개 HTTPS만 사용한다.

| 원격 경로 | 로컬 상대 파일명 |
| --- | --- |
| `ofl/dmsans/DMSans[opsz,wght].ttf` | `DMSans[opsz,wght].ttf` |
| `ofl/dmsans/DMSans-Italic[opsz,wght].ttf` | `DMSans-Italic[opsz,wght].ttf` |
| `ofl/notosanskr/NotoSansKR[wght].ttf` | `NotoSansKR[wght].ttf` |
| `ofl/dmsans/OFL.txt` | `DM-Sans-OFL.txt` |
| `ofl/notosanskr/OFL.txt` | `Noto-Sans-KR-OFL.txt` |

목적 디렉터리: `C:/repo/denn-products/test-results/spec-132-font-supply/8e44913e4ff26fc997e6856c1ec40ff4791c98c5/`.
시작 시 부재 확인,기존파일 덮어쓰기0. 기존 `test-results/` ignore 사용,gitignore변경0.
추가 허용 로컬진단파일은 같은 디렉터리의 `inspect.py`, `probe.mjs`, 생성결과 `native-results.json`뿐.
Python 표준라이브러리/기설치 Playwright만 사용,추가설치0. 이들은 제품/정규test 코드가 아니며 Git전송0.

검사 순서(시행 전 자체검토):

1. 같은 pin의 GitHub contents metadata에서 파일별 size/git blob SHA를 확인한다.
   진단용 다운로드 상한은 파일당32MiB,고지1MiB로 한정(성능/제품 budget 승인 아님).
2. 고정 URL만 취득,파일수/byte수/git blob SHA 일치와 SHA-256 기록. redirect/예상밖파일이면 STOP.
3. 고지 header와OFL본문을 읽고byte결속. TT sfnt table 범위/name/fvar/OS2와 Unicode cmap
   기본매핑을 제한적으로 검사한다. 전체 font validator/라이선스 법률검증이라고 부르지 않는다.
4. 합성 문자집합: ASCII 인쇄문자95,한글완성형 U+AC00–D7A3,대표분해자모 U+1100/U+1161/U+11A8,
   합성문구 `DENN 2026`, `한글 가나다`. codepoint 검사는 shaping/실제고객문구 지원 증명이 아니다.
5. blank page에서 byte기반 FontFace,합성 alias,명시적 normal/italic·weight400으로 각각 로드.
   Chromium/Firefox/WebKit에서 등록·measure/paint·cleanup,request 전부차단/요청0 확인.
   실제앱라우트/OS font목록/운영/preview서버0. timeout/error는숨기거나fallback으로PASS처리0.
6. 3엔진×3파일=9개 로드 진단만 기대한다. 모든weight/opsz·pixel동일성·wrap/shaping 재현은
   별도계약 미검증으로 남긴다. native로드 성공도 glyph지원 또는132제품PASS가 아니다.
7. 정확문서8/보호23/번들3/Git diff검증 후 문서만 일반 commit/push. binary/진단물전송0.

FontTools는 기설치 runtime에서 import 불가 확인; 설치하지 않는다. 제한적 표준라이브러리
binary검사와 기설치 browser 진단으로 검증범위를 명시적으로 낮추며,제품용 parser로 재사용하지 않는다.
공식 참조(확인2026-09-11): [OpenType name](https://learn.microsoft.com/en-us/typography/opentype/spec/name),
[fvar](https://learn.microsoft.com/en-us/typography/opentype/spec/fvar), S-6 cmap/OS2 및 CSS Font Loading.
현재 계약 자체검토 PASS(동일Codex); 실제 취득/진단 결과는 다음 S-12에만 기록한다.

### S-12. 고정 원본 취득·로컬 진단 결과 — 2026-09-11

S-11 pin에서 고지2+TTF3만 취득. 각 size와 Git blob SHA를 공개 contents metadata와 대조해
5/5 일치했다. SHA-256은 아래 실측이다. 이는 같은 HTTPS 공급처의 byte 일치 검사이며
독립 서명 검증이나 공급망 무결성 전체 보장은 아니다. binary/진단물은 S-11 로컬경로에만 보존.

| 로컬 파일 | bytes | SHA-256 |
| --- | ---: | --- |
| DMSans[opsz,wght].ttf | 240164 | 8CD08D97E89C24D0AA92EDD2F0F4C8EE6195EEE9B7C9F154865A58B02F0C1C0D |
| DMSans-Italic[opsz,wght].ttf | 285040 | 22259C0CC8237221B80F44C76BA8D36E6BCE3CDA72779F5B2773643D499720AE |
| NotoSansKR[wght].ttf | 10414588 | 194018E6B2B293A7964F037B25C0249CE1418BC9AB3C971060A03AA57861E252 |
| DM-Sans-OFL.txt | 4482 | 9AF36190332437F5ECD09974DE43C1F7C77A310A996CDD8CEB25628B458840E1 |
| Noto-Sans-KR-OFL.txt | 4388 | 1C05C68C34F9708415AADA51F17E1B0092D2CEA709BF4A94CD38114F9E73D7D9 |

실측 합산: 240164+285040+10414588+4482+4388=10948662 bytes.
제품전송량/메모리/예산 승인 아님. 고지 원문을 로컬에서 읽어 S-9 header/OFL 조건과 대조했다.
같은 pin의 정확 고지 byte와 결속했지만 실제 제품의 고지 배포는 수행하지 않았다.

제한적 `inspect.py` 실측(기설치 Python 표준라이브러리만,설치0):

| 파일 | name table / axes(min/default/max) | 기본 cmap 실측 |
| --- | --- | --- |
| DM normal | Version 4.004; typographic DM Sans / 9pt Regular; opsz9/9/40,wght100/400/1000 | ASCII95/95; 한글완성형0/11172; 대표자모0/3 |
| DM italic | Version 4.004; typographic DM Sans / 9pt Italic; 동일 axes | ASCII95/95; 한글완성형0/11172; 대표자모0/3 |
| Noto KR | Version 2.004-H2; typographic Noto Sans KR / Thin; wght100/100/900 | ASCII95/95; 한글완성형11172/11172; 대표자모3/3 |

셋 모두 단일 TrueType sfnt(face0),sfnt checksum PASS,OS/2 fsType0 확인.
특히 Noto의 기본 axis weight는100이다. metadata의weight400 또는family표시만 보고 기본glyph
instance를Regular로 추정하지 않는다. DM의 nameID1은 DM Sans 9pt,ID16은DM Sans로 구분된다.
DM은cmap4,Noto는cmap12로 위범위를 검사. format14 존재는 확인했지만 variation sequence 처리,
GSUB/GPOS·분해자모 shaping·모든문자/스타일·실제고객문구는 검증하지 않았다.
fsType0 또는 cmap매핑은 법적허가·브라우저실제glyph사용 증명이 아니다.

blank-page `probe.mjs`: Chromium149.0.7827.55/Firefox151.0/WebKit26.5 ×3파일=9/9
byte기반 FontFace.load→명시적style/weight400→등록→합성문구measure/paint→해제 통과.
page request0, pageerror/console error·warning0,모든자기 browser close. 앱라우트/preview서버0.
브라우저 프로세스 수준의 모든 egress를 계측한 것은 아니다. 공급취득 HTTPS와 page 요청을 혼동하지 않는다.

| 동일 합성문구 폭(px) | Chromium | Firefox | WebKit |
| --- | ---: | ---: | ---: |
| DM normal / DENN 2026 | 163.58392333984375 | 163.56666564941406 | 170.55990600585938 |
| DM italic / DENN 2026 | 164.11192321777344 | 164.11666870117188 | 171.3919219970703 |
| Noto normal / 한글 가나다 | 154.36793518066406 | 156.13333129882812 | 154.36793518066406 |

위 차이는 실제 측정값이며 정확 재현 PASS가 아니다. 원인/variation·optical sizing·실제glyph선택
분리는 UNCONFIRMED. tolerance를 사후 완화하지 않는다. S-5 재현행렬/제품132게이트는 NOT TESTED.

실행 이력: 최초 public API는 sandbox socket 거부,승인된 일반실행으로같은공개조회 성공.
최초 native는 browser.newPage `_page` TypeError(exit1),제품/font실패로단정0. 같은스크립트의
허가된 일반실행은exit0/9완료. 최초오류의내부원인은UNCONFIRMED,제품회귀flaky해소주장0.
DEBUG browser 로그에는 Chromium SharedImage 및 Firefox 내부 경고/오류가 있었음;
page console0과 전체 browser stderr0은 다르며 후자를 주장하지 않는다. 제품UI검수PASS도아님.

판정: LOCAL_SUPPLY_DIAGNOSTIC_COMPLETED(동일Codex). FP-2 로컬취득작업 완료,132제품아직미구현.
다음은 같은문서 범위에서 공급물identity·axes·문자지원·재현차이를 입력/부모commit 계약과 연결해
정확 구현범위 및 필요한 후속검증을 검토한다. 새로운font선정/제품등록/다운로드를 자동개방하지 않는다.
이미 승인된FP-1/FP-2 반복질문0. 실제제품 적용·설치·배포는별도경계,운영변경0.

### S-13. 최종 보호 검사 STOP

`debug.log`가1438bytes로변경됨.기존1075byte prefix의SHA256은이전기준
`1B43DE30EE51AB9A246522FFC1D998229A6ADD31EC7BE6E089A3CA950B90FE23`과동일.
추가363bytes/3줄은0911/135850.460의Chromium SharedImage오류이며최초진단시각과일치한다.
전체새SHA는`2D4C9622F42F2F9DAEF857E0A0C4CBDC4385FBAF5B0D590DB67678F794A45A6F`.
이근거로최초browser실행의자동추가기록으로판단하며,직접로그편집/삭제/복원은하지않는다.
보호23전체불변게이트 FAIL:22불변+debug1변경.기본번들3불변/diff--check PASS/문서8unstaged.
fetch로HEAD=origin e4df5c9·0/0확인.발견후stage/commit/push·추가진단/구현0.
사용자에게추가로그를보존·계속전송제외하는이번예외처리를요청한다.임의baseline갱신0.
FP-2승인은유효하고취득진단결과를폐기하지않지만132종료/전송PASS로확대하지않는다.

로컬진단재현식별SHA256:
- inspect.py:8636791A55CCAE9AB0A747D4A86BDBC098C4B93509A54B80F2D724F6E334F815
- probe.mjs:0FF2714CB0446FA182C0AD5454B31A92E033F5BCD8351C5D2CD23121DFC88D1B
- native-results.json:717ECB1546FB03E8B9D734AD68F96F46C02E5C63526AB1B392FF147DDE327B03

### S-14. 보호 예외 승인 반영

2026-09-11 사용자 `응 루틴대로 중요결정외엔 우선 진행 해`는직전질문의debug.log추가3줄
보존/Git제외예외를승인했다.결정정본의단일SHA/1438bytes를재개시재확인,이외22기준은그대로다.
S-13 FAIL/STOP이력은삭제하지않는다.파일자체수정·복원·삭제·Git전송0.
향후임의보호변경허가아님.현재기술계약검토와문서8일반전송을재개하며FP-1/FP-2재질문0.

### S-15. 입력·부모·폰트 결속 추가 검토 — 2026-09-11

이번은 문서 설계 검토만이다. 아래 후보는 아직 구현 승인/구현 완료가 아니다.
현재 파일을 다시 읽어 다음 시간차를 확인했다(줄번호는 이번 읽기 기준).

| 경계 | 현재 코드 근거 | 계약 보완 후보 / 검증 의무 |
| --- | --- | --- |
| React 연속 입력 | PreviewComposer.tsx:505,857–863의 updater,938–947의 passive editRef 기반 wheel | 변경을 채택하는 event에서 최신 pending 입력으로 다음값을 한 번 계산하고,실제변경이면invalidate를setter보다 먼저 수행. updater/render 내부 무효화0 |
| 드래그 RAF 이전 | imageTransform.ts:337–341의move는pending을저장하고schedule;공개move반환void,ports.commit은RAF/정상pointerup에서만호출 | commit callback에만invalidate를붙이면늦음. controller가수락한실제변경을schedule전에알리는내부port후보 검토.취소/동일위치/다른pointer를구분 |
| 취소 후 다시 사용 | imageTransform.ts:353–367의pointerup flush/기타cancel은pending폐기 | pending무효화뒤cancel이면옛source자동복구0.실제화면의변경없음을새commit에서증명한새candidate만허용;RAF실패도무한pending이되지않도록settlement검증 |
| 부모 selection | BrowseFlow.tsx:71의reduceSelection은setter안;key는선택ID5개만포함 | 부모event도동일pending ledger에서순수reduceSelection을실행,no-op는epoch유지.변경수락즉시자식source무효화,후속parentcommit만새epoch채택 |
| catalog 교체 | BrowseFlow.tsx:63–67의passive reconcile,App.tsx:74–95의외부store document/index전달 | 자식prop/key만으로상위변경시점보장불가.현재catalog를읽는좁은port 또는상위owner무효화가필요;후보파일13의범위재검토 |
| 문구 trial | PreviewComposer.tsx:frameTrialRef는render에서갱신;commitText는closure textValues로trial | commit된geometry/사진/font증명과최신pending 문구를결합해동일builder로검사.버려진render의trial/다른field옛값사용금지 |

일반 기술 방향 후보는 **pending 입력과 committed 입력의 명시적 분리**다.
입력마다 `(incarnation, intentRevision, immutableDraft)`를 묶고, 수락한 실제변경만 새 revision을 만든다.
event/observer/controller 경계에서 pending draft를 갱신한 뒤 React에는 계산된 snapshot을 넘긴다.
render는 그 snapshot만 읽고,layout commit은 자신이그린revision이현재pending과같을때만source후보를등록한다.
늦은commit이더새pending을덮어쓰거나,unrelated rerender가이전candidate를다시살리는것을금지한다.
UI전용textError/exporting/active-slot표시변경은그자체로plan변경이아니다.단,active-slot교체시pending drag
취소는별도처리한다.동일tick2회wheel/서로다른문구field/width변경도pending에서계산해야한다.

pending값을모든render에서ref에복사하는방식은채택하지않는다.외부자원생성·무효화도render에서하지않는다.
React 공식 [useState](https://react.dev/reference/react/useState)와
[useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)(확인2026-09-11)는
setter후현재closure값이즉시바뀌지않고updater가순수해야하며,개발StrictMode에서추가검사실행이있음을설명한다.
위ledger/epoch는React가자동제공하는보장이아니라DENN이구현·시험해야하는후보설계다.

부모catalog 조사 정정: 현재 `catalog/controller.ts:retry`는retryable **error**에서만실행되므로
제품의ready→ready실시간새로고침이이미존재한다고주장하지않는다. `usePublicCatalog.ts`는
useSyncExternalStore로snapshot을구독하지만자식source가현controller상태를동기조회하는port를노출하지않는다.
외부주입/교체시험의sameID새document와실제경로의loading/unmount를구분하여시험해야한다.
상위변경을관찰할수없는standalone source연결은인증된현재성으로취급하지않는다.

파일범위 검토결과: 현재13후보는 **미확정**으로 유지한다.드래그수락시점이controller안에있으므로
`apps/mockup/src/preview/imageTransform.ts`와그기존`imageTransform.test.ts`가추가후보다.
상위snapshot port를택하면`apps/mockup/src/App.tsx`·`apps/mockup/src/catalog/usePublicCatalog.ts`와
해당회귀시험까지필요할수있다.기존목록밖코드를조용히수정하지않고정확최종목록을먼저확정한다.
기존PublicCatalogController의network/retry정책을늘리거나운영load시험을하는범위가아니다.

폰트 보완: `packages/render/src/canvas/execute-preview-plan.ts:564–586`은font shorthand를설정하고,
자간0은문자열전체fillText,자간이있으면글자별measure/paint한다.현재진단은32px/weight400/자간0만이다.
따라서hash·family가같아도axes/optical sizing/kerning·자간·실행context가일치했다는증명은아직없다.
S-12의엔진간폭차이를오차허용으로덮지않는다.다음재현계약은동일환경의measure→preview→capture
일치검증과엔진간차이관찰을구분해야한다.엔진간pixel동일성이나차이원인은아직미확정이다.
내부alias를측정에만쓰고executor가원래family+fallback을쓰는연결은허용하지않는다.
공유executor/plan/print변경이필요하다면별도정확범위를먼저검토하며보호render/plan/index.ts는열지않는다.

다음 검토 순서: 드래그 수락·settlement port와부모snapshot port의최소 API/정확파일목록 확정 →
동일owner font 측정/실행 binding 및재현검증 조건 → 전체132계약자체검토.
기술QUESTIONS1/2/3은구체화됐지만아직구현가능판정완료가아니다.제품등록/새자산취득/코드수정0.
