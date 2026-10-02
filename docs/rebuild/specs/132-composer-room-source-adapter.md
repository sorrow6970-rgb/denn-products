# 132 — 실제 Composer의 룸 source adapter

2026-09-11 / 기준 e0f69e7=origin·0/0. 131 code595cb6a/docs e0f69e7 DONE.
상태: READY_FOR_CODEX / PARTIALLY_IMPLEMENTED (2026-10-02). FP-3/S-28/FP-4/FP-5 및 FP-6 계약작성 승인 유효.
최신 S46: 측정 세션 helper/test 구현,표적173/공통3930 PASS. 실제 plan/React/print 연결·native 새 검증은 미완.
최신 S43~S45: 고정owner 구현과 공유plan 결합 검증PASS;최종check3889,Chromium12/Firefox12/WebKit9PASS3FAIL.
기존3FAIL보존,실제Composer/source/capture/print 통합 미완. 다음은plan-bound 수명 계약 검토(재승인 질문0).
사용자 `응 승인,`으로 공유 빌더 수정에 따른 admin 번들 변화 허용. 아래 S-28 STOP은 승인 전 이력이다.
FP-1=A/FP-2 공급 진단 완료,debug.log 단일보존예외 승인. 아래 이전 단계 상태는 이력이다.
최신: S-24~S-27 통합 문서 검토 완료.35경로/예정 명령/회귀/기본 UI 비간섭을 통합했다.
FP-3 직접 승인과 정확 경계는 FP-1 결정 정본의 2026-09-14 절을 따른다. 아래 미승인/STOP은 이력이다.
새 구현·검증은 승인된 로컬 범위만 진행하며,게이트 실측 전 제품 DONE/PASS로 표시하지 않는다.
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
- 소비자가 없을 때 추가 snapshot Canvas/URL/네트워크0. print의 동일 plan/출력 크기/단발 계약은
  유지한다. 관리형 font 차용·인코딩 후 확인의 향후 보완 범위는 S-20/S-23으로 명시한다.

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

### S-16. 드래그 결속 — 최소 내부 port 설계

다음은 현재 132의 구조 설계 선택이며 구현 승인/검증 완료가 아니다.
`imageTransform.ts`의 기존 begin/move/end/abort/dispose와 commit/RAF 계약은 유지한다.
추가 내부 표면은 두 개로 한정한다(신규 dependency/전역 registry 없음).

```ts
type DragInputStatus = Readonly<{
  revision: number;
  phase: "settled" | "pending" | "disposed";
}>;
// DragController에 추가: 같은 상태에서는 같은 불변 객체 반환
interface DragInputReadPort {
  readInputStatus(): DragInputStatus;
}
// DragSessionPorts에 선택적으로 추가: snapshot 변경 후 동기 통지
interface DragInputNoticePort {
  onInputStatusChange?: (status: DragInputStatus) => void;
}
```

revision은 controller 수명 내 단조 증가하며 이전 snapshot은 재사용하지 않는다.
사진 경로/원문/포인터 좌표를 이 상태에 넣지 않는다. 인스턴스 간 동일 revision은 같은 identity가 아니다.
현재 pending 또는 마지막 commit에 전달한 transform과 scale/x/y/rotation의 숫자값을 비교한다.
참조만 달라진 동일값·잘못된 pointer·거부된 입력·begin만 한 경우는 새 pending 통지를 만들지 않는다.
기존 호출자의 commit 횟수/RAF 합치기/정상 pointerup flush/취소 폐기 계약은 변경하지 않는다.

| 사건 | source용 상태 전환 | 순서/회귀 조건 |
| --- | --- | --- |
| 실제 move 수락 | 새 revision, pending | controller snapshot 먼저 교체 → 동기 통지 → 생존/session 재확인 → RAF 예약 |
| 연속 move | 새값이면 새 pending revision | 매 move마다 새 RAF를 만들지 않음; A→B→A도 이전 snapshot 부활0 |
| RAF 또는 pointerup flush | commit 전달 후 새 settled revision | React에 입력을 전달한 것과 React commit 완료를 구분; caller의 intentRevision 일치까지 source 차단 |
| cancel/abort/예약 실패 | pending 폐기 후 새 settled revision | 아직 적용하지 않은 draft만 철회,이미 전달된 마지막 입력은 보존; 옛 lease 재활성화0 |
| dispose/통지 실패 | disposed, 이후 현재성 false | 자원/구독 해제; 예외를 성공 통지로 취급하지 않음 |

통지가 재진입하여 end/dispose/new session을 호출하면 바깥 move가 그 뒤에 RAF를 예약하거나 새 session의
pending을 소비하지 않는다. snapshot 교체 후 통지하므로 callback 안에서 읽어도 옛 settled 상태가 아니다.
통지 예외는 source 연결을 fail-closed로 종료하며,이때도 pending/예약 정리가 누락되지 않아야 한다.
숫자 revision overflow는 재사용하지 않고 연결 종료로 처리한다.

Composer는 통지에서131 invalidate를 먼저 호출하고,S-15 ledger에 별도의 source settlement revision을
반영해 React commit을 요청한다. cancel로 화면 transform이 같아도 새 commit/candidate가 필요하다.
이때 문구·색 등 다른 pending 입력을 덮어쓰지 않는다. readSource/get/capture/paint 전후에는
캡처한 controller snapshot의 identity/settled/생존과 caller의 commit revision을 함께 검사한다.
구독통지 하나만 믿거나 phase만 settled이면 오래된 candidate를 허용하는 방식은 금지한다.

필수 검증: move 직후 RAF 전 capture0,동일값/noop,서로 다른 pointer,연속 move,move→cancel,
pointerup 1회 flush,late RAF,requestFrame throw,통지 throw/재진입,dispose/StrictMode,
cancel 뒤 unrelated render·새 commit 구분. 현재 모두 NOT TESTED.

### S-17. 부모·catalog 결속 — 현재성 identity와 전달 경계

기존 controller는 detach 후에도 getState()가 마지막 ready를 반환할 수 있다.
따라서 자식에 getState만 노출하거나 document 참조만 비교하는 방식은 채택하지 않는다.
같은 document 객체가 새 요청에서 다시 반환되는 경우까지 구분하기 위해 새 읽기 port를 설계한다.

```ts
type ReadyCatalogIdentity = Readonly<{ document: CatalogDocumentV1 }>;
// PublicCatalogController,hook에서 전달할 안정된 메서드
interface ReadyCatalogReadPort {
  readReadyIdentity(): ReadyCatalogIdentity | null;
}
```

성공한 각 load generation마다 새로운 불변 wrapper를 한 번 만들고,active+ready인 동안만 동일 wrapper를
반환한다. idle/loading/error/detach에서는 null이다. 내부 검증 대상은 wrapper identity와 document이며,
requestId/URL/오류 원문을 source/DOM에 추가하지 않는다. wrapper 동결이 document 깊은 불변성 증명은 아니다.
카탈로그는 기존 읽기 결과를 수정하지 않는 입력으로 사용하며,임의 in-place 변경 감지 기능을 새로 주장하지 않는다.
기존 getState/subscribe/reader/retry/error/UI 스키마는 그대로 둔다. 이 port를 읽어도 load 호출은0이다.

hook→App→BrowseFlow→PreviewSection(props 전달 유지)→Composer로 같은 읽기 함수를 전달한다.
source 후보는 부모가 채택한 ready identity를 캡처하고,isCurrent에서 현재 readReadyIdentity와 같은지 검사한다.
detach/restart/같은 document 재수신 시 옛 proof는 false다. 없는/throwing port는 source만 차단한다.
기존 standalone preview나 SSR에 source consumer가 없으면 새 기능 때문에 UI를 차단하지 않는다.
standalone source 시험은 합성 동일 계약 port를 반드시 제공한다.

selection은 부모의 pending ledger와 같은 reducer를 사용한다. 새로운 selection 수락 시 자식 invalidate가
setter보다 앞선다. 부모 render에서 선택/문서를 live ref에 덮어쓰지 않는다. 새 catalog/index 문맥의
reconcile은 해당 문맥의 pending revision으로 결속하고,기존 선택을 자동 대체하지 않는다.
자식 layout effect가 부모보다 먼저 실행될 수 있음을 가정하고,문맥 rebase가 아직 commit되지 않았으면
source를 등록하지 않는다. 부모의 새 revision 상태 반영으로 후속 commit에서만 등록하게 한다.
source의 무한 대기/불필요한 reconcile 반복도 native 검증 대상이다.

공식 근거: [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore),
확인2026-09-11. snapshot 안정성·불변성과 변경 구독 계약을 명시한다. React가 임의 source lease의
즉시 무효화를 대신 수행한다는 근거는 아니므로 위 별도 currentness 검사를 유지한다.
현재 제품의 retry는 error 전용이며,이 설계로 ready 중 새로고침이나 운영 네트워크 시험을 추가하지 않는다.

필수 검증: loading/error/detach null,같은 ready wrapper 안정성,같은 document의 다음 generation은
다른 wrapper,old async settle 무시,StrictMode restart,같은 tick selection2회/noop,
부모 교체 후 child commit 이전 read0,child-first layout/rebase,unmount/port throw. 현재 NOT TESTED.

### S-18. 구조 부분의 정확 파일과 남은 폰트 계약

위 S-16/S-17 구조 검토에 필요한 파일은 원래 WHERE의13개에 아래9개를 더한 **22개**로 정리한다.
이는 향후 구조 구현 계약의 파일 목록이며,이번에 이22개를 수정해도 된다는 승인이 아니다.

1. apps/mockup/src/preview/imageTransform.ts
2. apps/mockup/src/preview/imageTransform.test.ts
3. apps/mockup/src/App.tsx
4. apps/mockup/src/App.test.tsx
5. apps/mockup/src/catalog/usePublicCatalog.ts
6. apps/mockup/src/catalog/usePublicCatalog.test.ts (신규)
7. apps/mockup/src/catalog/controller.ts
8. apps/mockup/src/catalog/controller.test.ts
9. apps/mockup/src/browse/BrowseFlow.test.tsx (신규)

PreviewSection은 기존props전달로충분하므로 수정목록에 추가하지 않는다. 실제 타입/시험에서 추가 필요가
확인되면 먼저 계약 수정한다. 기존 selection reducer,131hook,공유 executor/plan/print는 이 목록에 없다.
원래13에있는 composer helper/test와native fixture에서ledger/현재성 통합을검증하고,기본전체E2E는금지한다.
구조 부분 자체검토: 경계/생존/noop/실패/정확경로 명시 완료. 구현·unit/native PASS를 뜻하지 않는다.

폰트가 남은 전체계약 차단 조건이다. S-12는 byte 로드만 검증했고,현재 executor는 승인된 family 문법의
shorthand와fallback을 직접 사용한다. 측정만 내부alias를 쓰는 것으로는 공급identity가 결속되지 않는다.
다음 문서 단계에서 다음 둘의 실제 지원 여부·파일범위·검증법을 비교하여 하나의 기술안을 확정한다:

- catalog 원문은 유지하고 측정/preview/capture가 같은 관리형 runtime family binding을 사용하는 경계.
- 공유 executor의 주입 경계에서 같은 font proof를 요구하되 plan 의미·print/Space를 바꾸지 않는 경계.

둘 다 원본 catalog의 자동 family 치환·폰트변환·미지원문구삭제를 허용하지 않는다.
font axes/weight/style/optical sizing/kerning/자간을 동일 환경에서 제어·재현 가능한지 먼저 검증 조건을
작성한다. 단순 엔진간 pixel 동일성을 새 완료조건으로 만들거나 사후 tolerance로 통과시키지 않는다.
정확 FontFace descriptor/API 지원이 확인되지 않은 부분은 UNCONFIRMED로 남긴다.
product font 등록/배포허가는 FP-2에 없으므로 코드/자산적용은 하지 않는다.
다음은 **FONT_MEASURE_EXECUTE_BINDING_CONTRACT_REVIEW**,승인 재질문 없이 같은문서8에서 진행한다.

이번 공식 폰트 API 대조에서 추가 확인한 한계:
[CSS Font Loading §2](https://www.w3.org/TR/css-font-loading-3/)(2023-04-06 Working Draft,
확인2026-09-11)는 style/weight/family 등 matching descriptor와 실제 face에 작용하는
variationSettings/featureSettings를 구분한다. normal byte에style=italic을붙이는것은실제italic공급증명이아니다.
동일하게S-12의weight400등록만으로모든엔진에서의variable axis선택을증명하지않는다.
[WHATWG HTML Canvas text styles](https://html.spec.whatwg.org/multipage/canvas.html#text-styles)의
API 정의와 별개로 현재3엔진의descriptor/측정/실행일치 native시험은NOT TESTED다.
이근거는새제품font옵션·신규FontFace등록을실행해도된다는승인이아니다.

### S-19. 측정과 실행 결속 — 실제 호출부 대조와 기술안 선택

2026-09-11, 기준05d0971. 아래는 코드 읽기와 문서 설계 결과이며 실행 결과가 아니다.

| 소비자 | 현재 근거 | 설계에서 유지/추가할 경계 |
| --- | --- | --- |
| 문구 측정·trial | PreviewComposer.tsx:createMeasurePort/fontShorthand/built/commitText | 동일 owner의 runtime geometry와 측정 port를 probe/trial/final 모두 사용 |
| 고객 preview | canvas/PreviewCanvasSurface.tsx → usePreviewCanvasSurface.ts → surface.ts | plan/bindings와 font binding을 한 snapshot으로 commit; draw 때 차용 |
| 룸 capture | room-placement/frame-snapshot.ts:createFrameSnapshotCapturer | 기존 execute 주입과 readSource 전후 검사를 재사용;102 코드는 변경하지 않음 |
| 인쇄 | print/exportFramePng.ts:run, PreviewComposer.tsx:onExport | 같은 plan 객체 그대로 실행; 클릭 때 차용하고 toBlob 이후에도 유효성 확인 |
| Space V1 | space/frame-plan.ts:composeSpaceFramePlan, SpacePostAuthFrameView.tsx:preflightSpaceV1Replay | 현재 fail-closed 재생 계약 유지; 관리형 alias로 재생을 우회 개방하지 않음 |
| Space V2 | space-v2/SpaceV2ProofView.tsx | 완성 PNG plan 표시 유지; 새 font 로드나 catalog 재구성 없음 |

두 대안을 비교한 뒤 **runtime alias 사전 projection**을 기술안으로 선택한다.
이는 Founder의 특정 제품 폰트 채택이나 제품 적용 승인이 아니라 구현 구조 선택이다.

| 대안 | 이점 | 부담/판정 |
| --- | --- | --- |
| 측정 전 geometry의 family를 owner 전용 alias로 결속 | 기존 builder/공유 executor가 같은 font 문자열 사용; 완성 plan을 print에서 재작성하지 않음 | alias의 수명·등록 오염 검사와 출력 차용 필요. 선택 |
| 공유 executor에 family resolver/proof를 새 인자로 추가 | 원래 family를 plan에 유지 가능 | 모든 호출자의 측정 resolver와 실행 resolver 결속,공유 API·admin/Space 회귀 확대. 이번에는 미채택 |

projection은 원본 catalog/ProjectedGeometry를 수정하지 않는 별도 메모리 값이다. 각 text zone의
원래 family/weight/style와 승인된 원본 byte를 정확히 대응시킨 후 fontFamily만 내부 alias로 바꾼다.
원래 family가 미지원이면 다른 family로 바꾸지 않는다. 동일 원본의 alias는 대체 폰트가 아니다.
alias는 owner 세대별 고유 ASCII 이름이며 PlanFontSpec의1..64/금지문자 규약을 만족한다.
이전 alias를 재활용하지 않는다. 고객 문구/ID/URL/UID를 이름에 넣지 않는다.
완성 plan의 alias를 나중에 치환하지 않는다. catalog 쓰기·Space 저장 스키마·발행·로그로 내보내지 않는다.
현재 선택은 로컬 Composer/preview/room capture/print 경계만이며 범용 직렬화 폰트 계약이 아니다.

### S-20. plan-bound 차용·현재성·소유권

소비자에게 native FontFace/원본 byte/등록 삭제 권한을 노출하지 않는다. 내부 공통 표면 후보:

```ts
interface FontBoundExecution {
  acquire(): FontExecutionLease | null;
}
interface FontExecutionLease {
  isCurrent(): boolean;
  execute: typeof executePreviewRenderPlan;
  release(): void;
}
```

factory는 완성 plan의 정확한 객체 identity,측정에 사용한 font owner 세대/요청 목록/context profile을
결속한다. execute는 다른 plan을 거부하고 같은 공유 executor에 원래 plan을 그대로 전달한다.
그리기 전후 검사·context 준비만 감싸며 별도 텍스트 renderer/재줄바꿈/plan clone을 만들지 않는다.
measure port도 같은 owner/currentness/profile을 검사한다. 비동기 자원 취득·등록·해제는 render 밖이다.
render의 trial/probe는 이미 준비된 차용의 읽기 전용 측정만 사용한다.

owner의 상태는 preparing → ready → retired/disposed다. 준비가 완료된 새 세대만 새 identity를 발급한다.
retire 시 먼저 모든 proof를 무효화하고 통지한 뒤 등록 해제를 진행한다. 남은 차용은 물리적 해제를
늦출 수 있지만 retired proof를 다시 유효하게 만들 수 없다. release는 멱등이며 차용자는 다른 owner를
dispose하지 않는다. 늦은 load 성공/StrictMode cleanup/동일 byte 재등록도 옛 proof를 복구하지 않는다.

검사는 단순 fonts.ready/check가 아니다. 소유한 face의 identity·loaded 상태·등록 membership,
family/style/weight/stretch/unicodeRange 및 feature/variation/metric descriptor의 채택된 직렬화값을
대조한다. 동일 alias에 추가 face가 생기거나 소유 face가 사라지거나 descriptor가 바뀌면 차단한다.
FontFaceSet 이벤트가 없는 변경도 read/acquire/measure/execute 전후 직접 검사 대상으로 둔다.
다른 alias의 관계없는 font 변화만으로 모든 source를 폐기하지 않는다. 전역 폰트 함수를 monkey-patch하지 않는다.
이 검사는 관찰 가능한 현재 상태와 앱 owner 규약을 증명할 뿐,검사 사이 외부 스크립트의 일시적
삭제→복원 이력 전체를 검출하는 감시 기능이 아니다. native 호출 중 브라우저 내부 변경까지 보장한다고
주장하지 않는다. glyph coverage/shape 증명이 별도로 없으면 현재성 검사만으로 성공을 만들지 않는다.

```text
같은 byte/face 세대 → runtime geometry → measure → final plan + binding
                                              ├ preview draw 차용
                                              ├ 102 capture 차용 → 픽셀 lease
                                              └ print 차용 → draw → toBlob → 재검사 → download
retire/오염 → proof false → source 차단 + 진행 중 결과의 성공 인계 차단
```

preview의 plan/imageBindings/font binding은 같은 committed snapshot이어야 한다. 기존 hook의 passive
plan/bindings 갱신만으로는 부족하므로 layout commit 결속과 미완 render 비공개를 설계한다.
surface는 snapshot 차용 실패 시 execute0,ready 보고0. 외부 port 재진입 후에도 다시 검사한다.
이미 일부 그린 뒤 검사 실패한 경우에는 성공을 보고하지 않고 해당 surface를 숨기거나 비워야 한다.
이를 '모든 실패에서 Canvas 호출0'으로 과장하지 않는다. 같은 plan에서 binding만 바뀌어도 재검사한다.

102 capture는 기존 execute 주입에서 이 binding을 차용/해제한다. 기존 source gate에는 font proof를
포함한다. capture 완료 후 lease는 픽셀을 보유하지만 source가 무효해지면 기존 paint gate가 차단한다.
102의 bitmap lease가 native font를 직접 소유하거나 caller font를 delete하지 않는다.

print request에는 선택적 binding을 추가하는 설계다. 관리형 plan 생산자는 반드시 같은 binding을
전달하고,없는 경우 legacy 경로로 우회하지 못하도록 Composer 경계에서도 검사한다. 기존 비관리형
호출자의 API 동작은 유지한다. 시작 전 차용 실패는 Canvas/toBlob/download0이다. 정상 차용은 async
toBlob 완료/실패까지 유지하고 finally에서 release한다. 인코딩 뒤 또는 URL 생성 중 retire/dispose면
download0/자기 URL 회수이며 신규 retry0. 원래 클릭 plan을 보존하므로 일반 문구 편집만으로 진행 중
인쇄를 취소하는 새 제품 정책은 만들지 않는다. 이 검사는 font 수명과 기존 unmount/dispose 경계다.
prepare/save/restore/release/외부 callback 예외와 재진입에도 안전 오류만 반환해야 한다.

### S-21. 자간 측정 불일치 — 코드 근거와 보완 설계

현재 packages/render/src/plan/build.ts:measureWithSpacing은 문장 전체 measureText 결과에
code point 사이 자간을 더한다. 공유 execute-preview-plan.ts:draw-text는 자간이0이 아니면
Array.from으로 각 code point를 따로 measure/paint한다. 다음 두 값의 동일성은 현재 코드로 보장되지 않는다.

```text
현재 wrap 폭 = measure(문장) + (n-1) × spacing
현재 paint의 논리 advance = Σ measure(codePoint[i]) + (n-1) × spacing
```

공백·kerning·ligature·결합문자 등에서 전체 측정이 개별 측정의 합과 같다는 가정은 금지한다.
이것은 정적 코드에서 확인한 알고리즘 차이이며,특정 폰트/기기에서 실제 오차를 실측했다는 주장은 아니다.
이번 native 실행0. S-12의 단일 문구 폭 결과로 이 결함의 수치를 추정하지 않는다.

선택한 최소 보완 설계는 builder에서 spacing !=0일 때 **같은 기존 TextMeasurePort를 code point별로
호출하여 합산**하는 것이다. spacing0은 기존 문장 전체 측정/그리기를 유지한다. TextMeasureRequest,
plan 스키마,공유 executor 공개 API는 변경하지 않는다. Σ는 기존 executor 순서와 동일하게 누적한다.
마지막 glyph 이후 불필요한 spacing은 line.width에 포함하지 않는다. negative spacing/빈 줄/한 글자/
명시 newline/maxChars/maxLines도 기존 제약을 유지한다. 합계 overflow·throw/non-finite는 fail-closed다.
이는 기존 code-point 그리기 모델과 폭을 일치시키는 보완이며 grapheme-aware shaping 구현이 아니다.
결합문자/ZWJ/IVS/미지원 script를 자동 정규화·삭제하거나 전체 Unicode 지원 완료로 표시하지 않는다.

fake 반례는 예를 들어 measure('AV')=15,measure('A')=10,measure('V')=10,spacing=2로 둔다.
수정 전17과 paint22의 차이를 재현하고 수정 후 line.width22를 검사한다. 이 숫자는 합성 test 정의이지
DM Sans 실측값이 아니다. spacing0이면15 유지,정렬 left/center/right와 wrap 경계까지 검사한다.
변경이 shared builder에 미치므로 기존 productPlan 및 전체 unit 회귀를 필수로 둔다.
packages/render/src/plan/index.ts는 보호 대상이며 수정/복원/stage0이다.

### S-22. 재현 프로필과 미검증 조건

관리형 font의 기술 검증 후보는 원본 hash/face/명시 weight400 또는700/style과 같은 context profile의
결속이다. DM Sans는 실제 normal/italic byte를 구분하고,opsz의 진단 기준값은 fvar 기본값9로 고정해
자동 optical-size 영향을 분리하는 후보를 시험한다. Noto Sans KR는 실제 normal byte만 후보이며
기본 축값100을 normal400으로 혼동하지 않는다. Noto italic/faux italic은 공급 완료가 아니다.
이는 기존3원본의 검증 행렬이며 모든 family/스타일을 제품에 채택한 결정이 아니다.

profile 후보는 direction=ltr,kerning=normal,stretch/caps=normal,textRendering=auto,
native letterSpacing/wordSpacing=0px다. 실제 자간은 S-21의 기존 수동 배치를 따른다.
측정·preview·capture·print에서 같은 profile을 적용하고 canvas 언어 문맥도 동일하게 결속한다.
지원되지 않는 속성에 일반 JS 필드를 추가한 뒤 성공이라고 하지 않는다. native 지원/직렬화·실제효과를
구분하고,필수 제어가 미지원이면 해당 profile은 미검증/차단이다. 존재하지 않는 Canvas opticalSizing
API를 가정하지 않는다. descriptor로 지정한 opsz/wght가 최종 효과를 고정하는지는 별도 native gate다.

공식 근거(모두 확인2026-09-11):

- [W3C CSS Font Loading Module Level3 §2/§3](https://www.w3.org/TR/css-font-loading-3/),
  2023-04-06 Working Draft: binary FontFace,mutable descriptor,FontFaceSet 검사 API. matching descriptor와
  실제 feature/variation 설정을 구분한다. 이 문서는 DENN owner/lease의 원자성 증명이 아니다.
- [WHATWG HTML Canvas text styles](https://html.spec.whatwg.org/multipage/canvas.html#text-styles),
  HTML Standard: font shorthand 및 direction/kerning/spacing 등의 상태를 정의한다. 명세에 API가
  있다는 사실과 설치된 세 엔진의 지원은 별개다. font 문자열 직렬화만으로 glyph 선택을 증명하지 않는다.
- [W3C CSS Fonts Level4 §4.6/§7/§8](https://www.w3.org/TR/2026/WD-css-fonts-4-20260907/),
  2026-09-07 Working Draft: descriptor와 속성의 적용 순서,variation/optical sizing을 구분한다.
  지원하지 않는 축이나 범위 밖 값을 그대로 적용했다고 가정하지 않는다. Recommendation으로 부르지 않는다.

검증은 서로 다른 세 가지를 구분한다:

1. fake: owner/차용/currentness/순서·오류·자간 반례. 실제 font나 native glyph 증명 아님.
2. 같은 엔진·같은 byte/profile: 전체·개별 측정,줄바꿈,같은 plan preview/capture/print를 비교.
   동일 backing/transform 비교와 print의 다른 배율 비교를 분리하고,DPR/배율이 다른 PNG의 hash 일치를
   요구하지 않는다. 논리 줄/정렬·유한 좌표와 같은 조건의 pixels를 검사한다.
3. 엔진 간 비교: 실측 차이를 그대로 보고한다. 사후 tolerance/폰트 교체로 PASS를 만들지 않는다.

필수 실패 행렬: 없는 family,DM의 한글,미공급 Noto italic,unsupported cluster,face delete/add/descriptor
변경,늦은 load,retire 중 measure/execute/toBlob,StrictMode/unmount,foreign plan/다른 binding,
same-plan 새 binding,preview RAF 지연,release 중복/재진입/예외. glyph 경로를 증명할 수 없는 요청은
차단하며 photo-only 완료 선언은 하지 않는다. 현재 이 행렬과 axes/profile 효과는 **NOT TESTED**다.

### S-23. 향후 정확 파일 범위와 다음 검토

S-18 구조22 + 다음13 = **향후 구현 후보35파일**. 이번 수정 허용은 계속 문서8개뿐이다.

1. apps/mockup/src/canvas/font-bound-execution.ts (신규: 공통 차용 타입/공유 executor wrapper)
2. apps/mockup/src/canvas/font-bound-execution.test.ts (신규)
3. apps/mockup/src/canvas/PreviewCanvasSurface.tsx
4. apps/mockup/src/canvas/PreviewCanvasSurface.test.tsx
5. apps/mockup/src/canvas/usePreviewCanvasSurface.ts
6. apps/mockup/src/canvas/usePreviewCanvasSurface.test.ts (신규)
7. apps/mockup/src/canvas/surface.ts
8. apps/mockup/src/canvas/surface.test.ts
9. apps/mockup/src/print/exportFramePng.ts
10. apps/mockup/src/print/exportFramePng.test.ts
11. packages/render/src/plan/build.ts
12. packages/render/src/plan/build.test.ts
13. apps/mockup/src/canvas/productPlan.test.ts

원래 WHERE의 composer-font-proof는 owner/준비 proof를,S-23의 font-bound-execution은 차용과 실행 결속을
담당하도록 분리한다. 102/129/131,shared executor/types/index,admin,Space 제품 파일,원본 catalog,
Rules/config/manifest/lockfile/CSS/font asset 배치 파일은 이 목록에 없다. 기존 Space/인쇄/unit 회귀는
읽기·실행 대상으로 지정할 수 있지만 몰래 수정하지 않는다. 새 필요 경로는 먼저 계약을 보완한다.

다음은 **SPEC132_CONSOLIDATED_CONTRACT_REVIEW**다. 같은 문서8에서 분산된 WHERE/WHAT/VERIFY를
S-16~S-23과 대조하고 정확 단위/opt-in native 명령·합성 font 주입·자산 권한을 하나의 착수 계약으로
정리한다. 일반 기술안은 재승인 질문 없이 검토한다. 이번 설계 선택만으로 제품 font 등록/새 취득/
다운로드·설치·변환·배포를 시작하지 않는다. 실제 제품 적용은 FP-2 범위 밖임을 유지한다.
전체132는 CONTRACT_REVIEW_IN_PROGRESS,후보35의 구현/제품 게이트 NOT TESTED.131 DONE 유지.

### S-24. 통합 착수 범위 — 로컬 연결 검증, 승인 전 실행 금지

2026-09-11 기준102860e. S-24~S-27은 분산된 WHERE/WHAT/VERIFY를 통합한다.
이번 판정은 **CONSOLIDATED_DOCUMENT_REVIEW_PASSED(동일 Codex)**이며 구현 승인이 아니다.
FP-2는 S-11의 blank-page9 진단까지만 승인했다. 실제 Composer fixture 연결/native 행렬은 그 범위 밖이다.
다음 권한을 **FP-3 로컬 통합 구현·검증**으로 분리하며,아직 Founder가 승인하지 않았다.

FP-3 요청 범위는 아래35 code/test 파일과 기존 문서8이다. 제품용 font 자산 배치/기본 UI 폰트 변경은
포함하지 않는다. 기본 앱은 공급 provider/consumer를 새로 생성하거나 font를 fetch/등록하지 않는다.
실제 Composer 컴포넌트의 adapter를 E2E 전용 entry에서 공급 port로 연결해 시험한다.
원래 기능의 일반 preview/print를 유지하되 새 source의 font 증명을 기존 fonts.check로 대신하지 않는다.
필요한 font 공급 port가 없는 text source는 차단한다. no-text 시험을 전체 text 지원 증명으로 확대하지 않는다.
이 범위 완료 명칭은132 로컬 Composer 연결 검증이며 운영 폰트 공급/실제 고객 룸 화면 완료가 아니다.

정확35경로(원13+구조9+폰트13,중복0):
```text
apps/mockup/src/preview/PreviewComposer.tsx
apps/mockup/src/preview/PreviewComposer.test.tsx
apps/mockup/src/preview/composer-room-source.ts
apps/mockup/src/preview/composer-room-source.test.ts
apps/mockup/src/preview/composer-font-proof.ts
apps/mockup/src/preview/composer-font-proof.test.ts
apps/mockup/src/e2e/composer-room-source-fixture.tsx
apps/mockup/src/e2e/canvas-fixture.tsx
tests/composer-room-source/source.spec.ts
tests/composer-room-source.config.ts
scripts/e2e-run.mjs
scripts/e2e-run.test.mjs
apps/mockup/src/browse/BrowseFlow.tsx
apps/mockup/src/preview/imageTransform.ts
apps/mockup/src/preview/imageTransform.test.ts
apps/mockup/src/App.tsx
apps/mockup/src/App.test.tsx
apps/mockup/src/catalog/usePublicCatalog.ts
apps/mockup/src/catalog/usePublicCatalog.test.ts
apps/mockup/src/catalog/controller.ts
apps/mockup/src/catalog/controller.test.ts
apps/mockup/src/browse/BrowseFlow.test.tsx
apps/mockup/src/canvas/font-bound-execution.ts
apps/mockup/src/canvas/font-bound-execution.test.ts
apps/mockup/src/canvas/PreviewCanvasSurface.tsx
apps/mockup/src/canvas/PreviewCanvasSurface.test.tsx
apps/mockup/src/canvas/usePreviewCanvasSurface.ts
apps/mockup/src/canvas/usePreviewCanvasSurface.test.ts
apps/mockup/src/canvas/surface.ts
apps/mockup/src/canvas/surface.test.ts
apps/mockup/src/print/exportFramePng.ts
apps/mockup/src/print/exportFramePng.test.ts
packages/render/src/plan/build.ts
packages/render/src/plan/build.test.ts
apps/mockup/src/canvas/productPlan.test.ts
```

역할/순서:
- shared build.ts와 기존 build/productPlan 시험: S-21 자간 합산 반례를 먼저 고정한다.
  공개 TextMeasurePort/plan/공유 executor/index.ts 변경0. 기존 wrap 결과가 달라지는 경우 근거를 기록한다.
- composer-font-proof: 준비/owner 세대/공급 port/currentness. font-bound-execution: plan 차용/실행/해제.
  공급 port는 원본 identity·검증된 요청 범위·native face를 결속하는 내부 capability다.
  fixture가 임의 boolean을 반환한 결과를 실제 glyph 검증으로 부르지 않는다.
- imageTransform/BrowseFlow/catalog/App: S-16/S-17 pending/ready identity. 기존 request/retry 정책 확대0.
- PreviewComposer/composer-room-source: 실제130 image/art proof와131 commit의 결속.
  공급/소비 port는 명시적 주입이며 운영 singleton/window/query 경로에서 켜지지 않는다.
- surface/hook/print: S-20의 동일 commit snapshot과 차용. no-binding 기존 호출은 종전 경로를 유지하고,
  관리형 plan 생산자는 binding을 누락한 채 그 경로를 사용할 수 없도록 생산자 시험을 둔다.
- fixture/config/runner: 아래 전용 명령만. 기존 photo/art/capture/source를 fake 구현으로 대체하지 않는다.
  fake는 오류/순서 시험,실제 font byte/native 시험은 별개 그룹이다.

전체35경로 밖 변경이 필요하면 먼저 계약을 보완한다. packages/render/src/plan/index.ts 등 보호23,
shared executor/types,Space/admin 제품파일,Rules/config/manifest/lockfile/새 dependency/자산 배치는 제외한다.
이 목록의 테스트 config1개는 FP-3 승인 후의 예외 후보이며 firebase/앱 빌드 config 변경 허가가 아니다.

### S-25. 공급 fixture·출력과 실패 경계 통합

원본은 S-11의 이미 보관된3 TTF 및2고지만 읽는다. S-12 size/SHA 불일치나 부재면 실행 전 STOP,
재다운로드/폰트 변환/OS 설치/원본 덮어쓰기0. inspect.py/probe.mjs/native-results.json도 수정하지 않는다.
Node 시험은 원본을 repo-relative 경로 추정이 아니라 test 파일 위치에서 정확 S-11 경로로 해결한다.
font byte/고지/실제 FontFace를 제품 번들·DOM·로그·storage·Git에 넣지 않는다.

E2E entry는 기존 e2e-canvas-fixture.html의 composerSource 전용 분기다. 제품 App URL 분기 추가0.
합성 catalog/사진/문구와 실제 승인 후보 font byte를 구분한다. runtime alias는 E2E에서만 등록한다.
시험의 route handler는 localhost:4183의 전용 /__spec132-font/{normal,italic,korean}3개만 메모리로
fulfill한다. 서버에 font 폴더를 노출하거나 실제 외부 host를 허용하지 않는다.
각 URL에 대응하는 byte는 Node SHA 검사를 통과한 정확 원본이다. 다른 path/font 요청은 차단한다.
page 소유 synthetic blob만 기존131의 생성·미해제 검사 후 허용한다. 실제 Firebase/운영 GET0.

native font 시험은 먼저 개별 공급/axis/profile capability를 확인하고 실제 Composer로 진행한다.
지원하지 않는 속성에 expando를 쓰거나 fake coverage로 green을 만들지 않는다.
cmap의 개별 문자 지원과 cluster/shape를 분리하고,진단된 합성 문자열만 수용하는 test 공급 port를 사용한다.
이것은 제품용 범용 coverage parser 구현이 아니다. 범용 사용자 문구 수용에는 별도 제품 공급 계약이 필요하다.
초기 행렬은 S-12 문구,AV/To/ffi,한글 완성형,분해자모/결합부호/ZWJ/미공급 style의 차단·진단을
명시적으로 구분한다. unknown cluster를 성공 처리하거나 원문을 정규화/삭제하지 않는다.

font profile/opsz9는 S-22의 검증 후보이지 이미 통과한 플랫폼 지원 계약이 아니다.
세 엔진 중 필수 capability가 미지원이면 해당 gate FAIL/NOT VERIFIED로 기록하고 기술 보완 범위를
먼저 검토한다. 플랫폼 축소/폰트 교체/skip/사후 tolerance로 통과시키지 않는다.

print는 클릭 snapshot의 plan과 font binding을 차용한다. ordinary text edit는 font owner를 retire시키지
않으며 이미 시작한 출력의 내용도 바꾸지 않는다. font 공급 교체/오염/unmount/dispose만 무효 인계를 막는다.
toBlob 이후 URL 생성/다운로드 직전 검사와 finally release를 시험한다. 이미 draw한 뒤 무효화된 결과는
배출0이지 draw 호출0이 아니다. 원본 plan 재작성/줄바꿈 재실행/자동 retry0.

### S-26. 실행 명령·필수 회귀 — 계약 정의; 실제 실행 결과 S-28/S-29

현재 scripts/e2e-run.mjs는 임의 argv를 거부한다. 아래 composer-source selector4개는
**FP-3 승인 후 runner와 test를 함께 추가하는 명령**이다. 2026-09-14 추가했으며 실제 실행은 S-29를 따른다.
tests/composer-room-source.config.ts는 기본 tests/e2e와 분리한 native3 projects와
regression-chromium project1을 정의한다. base/globalSetup/4183·4184·4185의 strictPort는 유지한다.

```powershell
pnpm exec vitest run packages/render/src/plan/build.test.ts apps/mockup/src/preview apps/mockup/src/canvas apps/mockup/src/browse apps/mockup/src/catalog apps/mockup/src/print apps/mockup/src/App.test.tsx scripts/e2e-run.test.mjs
node scripts/check.mjs
node scripts/e2e-run.mjs --composer-source-chromium-only
node scripts/e2e-run.mjs --composer-source-firefox-only
node scripts/e2e-run.mjs --composer-source-webkit-only
node scripts/e2e-run.mjs --composer-source-regression-only
git diff --check
```

새3 selector는 전용 config의 chromium/firefox/webkit 중 하나만,회귀 selector는 regression-chromium만
선택하고 workers=1을 고정한다. 혼합/unknown args는 staging/브라우저 생성 전에 거부한다.
regression-chromium의 정확 기존 파일6개:
- tests/e2e/canvas-surface.spec.ts
- tests/e2e/mockup-preview.spec.ts
- tests/e2e/space-frame-view.spec.ts
- tests/e2e/space-production-route.spec.ts
- tests/e2e/preparation-pair-paint.spec.ts
- tests/room-source-native/source.spec.ts

문서 PNG를 쓰는 시험은 다음 title/group 정규식으로 사전 제외한다:
`spec 085 evidence|spec 088 Korean picker|spec063 screenshot|spec080 screenshot`.
spec088 keyboard/picker 비시각 회귀는 신규132의 입력 시나리오로 보완하며 제외 개수를 결과에 보고한다.
나머지 기존 text/print/Space/source/owner/pair 단언을 완화하지 않는다.
선정 목록을 실행 전에 확인하며 현재 085 evidence의 파일목록 검사도 이 제외 그룹에 포함된다.
기본 전체 E2E/보호018 PNG 재생성은 금지한다. 예정 native 개수는 구현 후 수집값으로 보고한다.

debug 보호 재발 방지: 새4 selector의 Playwright 실행 cwd와 outputDir를 자기 OS temp staging으로 둔다.
runner가 config 경로를 repo 기준 절대 경로로 전달하고 해당 config/test가 필요한 repo 참조를 명시적으로
해결하도록 한다. Vite build cwd와 다른 selector 동작은 유지한다. 새 옵션의 args/cwd 조합을 unit으로
검사한다. 전용 config에서 실행할6 회귀는 위 생성 시험 제외 후 repo-relative fs 의존성을 재검사한다.
사용자 repo debug.log를 browser 로그 경로로 사용하지 않는다. 종료 후 보호SHA가 변하면 STOP한다.
임시 경로는 기존 isDisposableStagingPath 검증을 통과한 자기 경로만 정리한다.
점유 포트의 타 프로세스 kill/강제 재사용0;binary/Java/의존성 설치·다운로드0.

게이트 표:
| 단계 | 반드시 확인 | 현재 |
| --- | --- | --- |
| 순수/fake | 자간 AV 반례·negative/0/한 글자/overflow,noop/연속 입력·부모 rebase,차용·재진입·예외 | NOT TESTED |
| 실제 React | child-first commit/중단 render/StrictMode,art·photo old proof,clock/case 차단 | NOT TESTED |
| 실제 font | byte identity/face/style/axis/profile,없는 family·누락·오염·retire,같은 plan의 측정/출력 | NOT TESTED |
| 기존 회귀 | 지정6파일의 비생성 단언,default UI/외부 요청/font 추가0 | NOT TESTED |
| 공통 | check/typecheck/build,정확35+8,diff,보호23,번들변화/포트/temp | NOT TESTED |

코드 변경 후 고객 JS hash는 달라질 수 있으므로 실제 size/SHA를 보고한다. 고객 CSS는 불변 확인한다.
S-28 정정 승인(2026-09-14): 공유 빌더 수정에 따른 admin 번들 변화만 허용하고,admin src/config
변경0·기존 plan/issue 회귀 통과·번들 size/SHA 실측 기록을 강제한다. 운영/배포 권한 확대가 아니다.
신규 test config는 기존 format/lint의 tests 대상 안에 들어간다. dependency/lockfile 변경은 필요하지 않다.
전체132 로컬 통합의 CODEX_PASSED는 이 게이트를 모두 실제 실행한 뒤에만 기록한다.

### S-27. 통합 검토 판정과 필요한 권한

통합 문서 검토 완료:35파일/역할/명령/회귀/기본 UI 비간섭/폰트와 인쇄 수명/자산 권한을 분리했다.
현재 제품 적용 권한은 없다. FP-2의9 blank-page 진단을 실제 Composer 통합검증 권한으로 확대하지 않는다.
**FP-3 요청(미승인):** S-24의35파일 로컬 구현·합성 unit·S-26 opt-in native,기존 원본3개를 테스트
페이지에서만 사용하는 등록/실행. 일반 문서·코드 전송은 지속119의 승인된 스펙 범위 안에서만 가능하다.
기본 제품 font 로드/자산 배포/운영·UI 개방/추가 취득·설치·변환/실제 데이터는 요청에서 제외한다.

state FOUNDER_DECISION_REQUIRED,next FOUNDER_FP3_LOCAL_COMPOSER_INTEGRATION_SCOPE.
2026-09-11 저장 실패 후 실제 unstaged 작업 문서는 spec/STATE/NEXT 3개뿐이었다.
당시 문서8 표기는 예정 범위를 실제 저장 개수처럼 기록한 오류이며,2026-09-14 나머지5개를 동기화한다.
STOP 규약에 따라 stage/commit/push/코드/새 진단0. 최종 현재 상태는 live의 재개 검증 기록을 따른다.
FP-1/FP-2 또는 보호 로그 예외를 다시 묻는 것이 아니라 새 로컬 통합 실행 범위의 확인이다.
승인 후35파일 계약대로 구현→검증→같은 범위 보완 루틴을 수행한다. 승인 전 다음 스펙을 만들지 않는다.
131 DONE,132 NOT_IMPLEMENTED. 실기기/일반사진/실제 룸 UI/운영은 여전히 미완이며 전체 진척률 분모 미확정.

### S-28. FP-3 구현 착수 결과 / admin 번들 게이트 충돌

2026-09-14 FP-3 직접 승인 후 정확 허용 code/test10파일을 수정/추가했다.
- build.ts/build.test.ts: 자간!=0 개별 code point 누적 측정. 합성 반례6 FAIL을 먼저 재현한 뒤 보완.
- catalog/controller.ts/controller.test.ts: active+ready의 generation별 immutable wrapper,detach 무효화.
- preview/imageTransform.ts/imageTransform.test.ts: RAF 전 pending 통지,settlement/취소/재진입/동기RAF 처리.
- scripts/e2e-run.mjs/e2e-run.test.mjs: opt-in4 selector·자기 staging cwd·절대 config 경로.
- tests/composer-room-source.config.ts 및 composer-room-source/source.spec.ts: native profile/원본 검증
  사전 게이트만 작성. 실제 Composer 연결 fixture/폰트 owner/print binding은 아직 미구현.

targeted5파일413/413 PASS. check PASS:format/lint375파일,7프로젝트typecheck,unit3757/3757,
2앱 build. 기존3732+이번추가25=3757(자간7+catalog3+drag11+selector4=25).
이는132 부분 코드의 공통 검증이지 전체 구현 또는 native 게이트 통과가 아니다.
새 native/브라우저/E2E/실제font등록 실행0. CSS/admin 불변 게이트 확인에서 모순을 발견해 정지했다.

S-21/S-24는 공유 build.ts 수정을 명시 승인했으나 S-26은 admin JS 불변을 요구한다.
admin의 space-v2/issue-composition.ts가 같은 buildPreviewRenderPlan을 import/call하므로 수정이
번들에 포함된다. 해당 admin 입력은 textZones/measureText를 전달하지 않으며 admin src diff0.
공유 함수 변화가 번들에 전파된 것으로 판단하지만 byte 변화만으로 모든 admin 동작 불변을 증명하지 않는다.

| 산출물 | 기존 기록 | 이번 실측 |
| --- | --- | --- |
| admin entry |294873bytes/B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246|294910bytes/2A25F27A178E6CC8877A46D515F2EB32DDED848F26DAA87B791139F7853AEF21|
| 고객 entry |345944bytes/FAF40F5709E329CACC4E2DB730326F224FB4B84C590561EB5CFB5C663021CB43|346959bytes/6182B4B409ACFC8B44550467F6942ED625538BCFB59E3C37AE57A14CE93ACE3C|
| 고객 CSS |6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81|동일|

증감:admin294910-294873=37bytes,고객346959-345944=1015bytes. 기존 값은 live의 선행 완료 기록이다.
원본 번들 파일을 복원하거나 보호 파일을 건드려 hash를 맞추지 않는다. 변경 권한은 앱 소스 수정과
실제 배포까지 확대되지 않는다. 기존 gate를 PASS로 덮거나 native 실행을 계속하지 않았다.

### QUESTIONS — S-28 해소 완료 (2026-09-14)

공유 빌더의 승인된 자간 보완에 따른 admin 번들 변화만 허용하고,admin 검증 기준을
`admin src/config 변경0 + 기존 plan/issue 회귀 통과 + 번들 size/SHA 실측 기록`으로 정정할 것인가?
권장 이유: 공통 함수를 복제/우회하거나 빌드 설정을 바꾸지 않고 기존 승인 범위를 유지한다.
사용자 `응 승인,`으로 이 게이트 정정을 승인했다. FP-3 자체도 유효하며 반복해서 묻지 않는다.
승인 시 이 조건부터 정정하고 남은 실제 Composer 연결·폰트 수명/print·native행렬 구현을 계속한다.
132 DONE 아님. 현재 code/test10+docs8 unstaged,HEAD102860e,commit/push0.

### S-29. S-28 승인 후 native preflight 실측과 기술 보완 경계 (2026-09-14)

사용자 `응 승인,`은 S-28 번들 정정의 직접 승인이다. admin src/config 변경0을 유지한 채
`apps/admin/src/space-v2/issue-composition.test.ts`, `apps/mockup/src/canvas/productPlan.test.ts`,
`packages/render/src/plan/build.test.ts` targeted309/309 PASS를 확인했다.
번들 수치는 S-28과 동일하며 이번 check 재실행도 format/lint375·7typecheck·unit3757/3757·2build PASS.
이 PASS는 현재 부분 코드의 회귀 결과이지132 전체 통합 완료가 아니다.

#### 실제 실행 기록

모든 native 명령은 `node scripts/e2e-run.mjs` 뒤 아래 selector를 전달했다.
승인된 로컬 원본5 SHA 확인 후 테스트 페이지에서만3 face를 등록·자기 face를 해제한다.

| 순서 | selector / 환경 | 결과 | 해석 |
| --- | --- | --- | --- |
| 1 | --composer-source-chromium-only / 기본 | 4 PASS | profile1 + font load3 |
| 2 | --composer-source-firefox-only / 기본 | 4 FAIL | test body 전 newPage의 _page 접근 실패 |
| 3 | --composer-source-firefox-only / 일반 실행 권한 허용 후 | 4 PASS | 동일 명령/기준; 최초 실패 이력 유지 |
| 4 | --composer-source-webkit-only / 일반 실행 | 3 PASS / 1 FAIL | native profile 첫 실패 fontKerning |
| 5 | --composer-source-webkit-only / 일반 실행 | 3 PASS / 1 FAIL | 같은 기준을 일괄 실패 목록으로 출력하여4속성 부재 확인 |

Firefox 최초 오류는 `browserContext.newPage: Cannot read properties of undefined (reading '_page')`.
실행 환경을 구분한 재실행은 허용됐으며 browser binary/보안 설정/검증 기준을 바꾸지 않았다.
내부 원인은 UNCONFIRMED, 제품·폰트 실패 또는 일반적인 flaky 해소라고 단정하지 않는다.

마지막 WebKit 진단은 native getter/setter 존재, setter readback, own-property 부재 기준을 모두 유지하고
최초 한 항목에서 중단하던 assertion을 실패 배열 전체 비교로 바꿨다. 결과:
- fontKerning: expected normal / native false / value null / own false
- fontStretch: expected normal / native false / value null / own false
- fontVariantCaps: expected normal / native false / value null / own false
- textRendering: expected auto / native false / value null / own false

direction/letterSpacing/wordSpacing는 실패 목록에 없다. expando 대입으로 지원을 흉내 내지 않았다.
이는 현재 설치된 Playwright WebKit 실행의 결과이며 모든 Safari/iOS 버전에 대한 단정이 아니다.
Chromium/Firefox 결과는 assertion 출력 변경 전 실행이다. 세 엔진을 최종 파일 상태로 모두 재검증했다고
표현하지 않는다. 반복 실행을 더해 검증 범위가 늘었다고 집계하지 않는다.

폰트3개 각각의 loaded/membership/양수 finite width/자기 해제는 PASS.
axis 적용 효과·glyph 선택·cluster shaping·실제 Composer·동일 plan preview/print는 NOT VERIFIED.
--composer-source-regression-only 및 전체132 통합 시험은 아직 실행하지 않았다.
S-25의 필수 capability 실패 규약에 따라 실제 Composer 연결 강행과 stage/commit/push는 보류한다.

#### 공식 근거와 기술 대안 검토 — 동일 Codex, 구현 승인/통과 아님

확인일2026-09-14. 아래는 공개 표준의 의미이며 설치된 엔진의 지원 여부는 위 실측으로 구분한다.

| 출처 | 확인 내용 | 이 작업의 한계 |
| --- | --- | --- |
| [WHATWG HTML Standard — Canvas text styles / text preparation](https://html.spec.whatwg.org/multipage/canvas.html#text-styles) | fontKerning/Stretch/VariantCaps/textRendering 값을 텍스트 준비에 사용한다. fontKerning auto는 엔진 재량, normal은 kerning 적용이다. | 부재한 API를 default 또는 JS 필드로 바꿔 normal 제어와 동등하다고 증명하지 못한다. |
| [W3C CSS Font Loading Module Level 3 — FontFace interface](https://www.w3.org/TR/css-font-loading-3/#fontface-interface) | featureSettings/variationSettings는 대응 @font-face descriptor 의미를 가지며 지원 폰트의 feature에 영향을 준다. style/weight/stretch 등 matching descriptor만으로 글꼴을 변형하는 것은 아니다. | face descriptor가 Canvas4속성 전체를 대체한다는 보장은 확인하지 못했다. 기존 load PASS도 이를 증명하지 않는다. |

검토 결과: **현재 S-22의 명시적 native profile 그대로는 설치된 WebKit 게이트를 통과할 수 없다.**
다음 일반 기술 검토는 새 Founder 질문 없이 이 문서8 안에서 진행할 수 있다:
1. 원본 byte·runtime alias·동일 plan·font lease 불변을 유지하면서, face feature/variation descriptor와
   Canvas font/state가 측정과 실행을 동일하게 결속할 수 있는지 각4속성별로 분석한다.
   descriptor 선언만으로 동등성을 인정하지 말고, kerning/ligature/축/기본값 오염의 반례를 설계한다.
2. 명시 제어 대체가 안 되면, 같은 엔진 내 measure/paint 일치와 엔진 간 동일 결과가 계약에서 각각
   필요한 범위를 구분한다. 엔진 기본 동작의 동일성은 현재 UNCONFIRMED이며 자동 채택하지 않는다.
3. 대안은 현재 **후보 / NOT TESTED**다. 새 profile을 고르기 전에 근거·정확 테스트·fail-closed·
   호출부 및 허용 파일 영향에 대한 계약 검토를 완료한다. 후속 진단이 필요하면 먼저 같은 S-24/S-25
   로컬 권한과 대조하고, 허용 진단만 수행한다. 구현 기준을 먼저 낮추고 시험을 green으로 만들지 않는다.

WebKit 제외/필수 gate skip/새 브라우저 설치·다운로드/폰트 교체/제품 출력 의미 변경은 자동 해법이 아니다.
그런 범위 확대가 실제로 필요할 때에만 정확한 별도 결정을 요청한다. FP-3와 S-28 재승인 질문0.
현재 신규 제품 결정 대기가 아니라 BLOCKED_VERIFICATION / SPEC132_FONT_PROFILE_COMPATIBILITY_REVIEW.

#### 보존·정리·인계

5회 runner staging의 마지막 경로명은 OpIG7O/Zoh8qZ/7HnX3Q/cECw39/i8qvmV이다
(각 이름 앞 `denn-e2e-`). 기존 검증된 자기 temp 정리 후 각각 Test-Path false를 확인했다.
해당 staging의 실패 artifact는 보존된 파일로 안내하지 않는다. 위 결과는 실행 출력의 기록이다.
4183/4184/4185 LISTENING 잔류0을 netstat 필터로 확인했다. 다른 프로세스 종료0.
이는 시스템 전체 브라우저 프로세스 부재를 검증했다는 뜻은 아니다.

보호/사용자23 SHA 세션 시작 대비 동일,code/test10 + docs8 외 task 변경0,staged0,diff--check PASS.
HEAD102860e 및 로컬 origin 추적 ref0/0; 이번 원격 fetch/조회/commit/push0.
현재 룸 source 결속·font owner·print binding은 여전히 미구현.131 DONE 유지,132 DONE/CODEX_PASSED 아님.
기본 제품 폰트 공급/실제 룸 UI/운영 Firebase/실제 데이터/배포/의존성·원본 취득/예약 자동화0.

### S-30. 폰트 profile 대안의 제한 진단 계약 (2026-09-14)

사용자 `응 루틴으로 진행해`로 S-29 기술 검토를 계속한다. FP-3/S-28 승인 범위는 변경하지 않는다.
실행 전 범위 확인: 기존 tests/composer-room-source/source.spec.ts에 진단1개만 추가한다.
원본5 SHA 검사와 normal DM Sans 원본 byte1개,기존 localhost 전용 route만 재사용한다.
기존 required native accessor gate는 그대로 유지하며,진단 성공으로 해당 실패를 상쇄하지 않는다.
제품 파일/폰트 공급/새 dependency/config/기존 원본 파일 변경0. 파일별35 허용 경계 유지.

진단은 같은 고정 문구 AV To ffi abc/32px/weight400/opsz9,face feature normal/kern0/kern1을
구분한다. 새 Canvas를 각각 connected/detached로 만들고 baseline과 CSS kerning normal/none,
textRendering auto/optimizeSpeed/optimizeLegibility,stretch/caps 및 font shorthand 설정을 비교한다.
각 조건의 독립 Canvas2개를 비교하여 width와 실제 ImageData byte 일치 여부를 출력한다.
표면 문자열 getter만 같음을 pixel 동일성으로 간주하지 않는다. 픽셀 원문/PNG 파일 저장0.
같은 문구의 일치만으로 전체 문자 지원 또는 다른 출력 배율을 증명하지 않는다.
특정 API/기능이 실제 작동하는지 확인하는 후보 탐색이며,출력 수치에 맞춰 기대값/tolerance를 정하지 않는다.
native3 selector를 각1회 실행하여 결과·browser.version을 기록하고 원래 gate 실패는 유지한다.
callback/assertion의 무결성·자기face/Canvas 해제·차단 route만 진단 시험의 PASS 범위다.
CSS/descriptors가4속성을 대체한다는 판단은 공식 표준·native 차이·공유 executor 호출부를 모두 대조한다.
동등성이 입증되지 않으면 구현/commit/push 보류를 유지하고 정확한 잔여 설계 문제를 보고한다.

#### S-30 실측 결과 / 대안 검토 완료 — 2026-09-14

기존 source.spec.ts의 진단1개만 추가했다. 제품 소스의 이번 추가 변경0,required profile gate 변경0.
`node scripts/check.mjs` PASS:format/lint375,7typecheck,unit3757/3757(123파일),2build.
세 selector의 최종 동일 파일 실행: Chromium5/5 exit0,Firefox5/5 exit0,WebKit4/5 exit1.
Firefox/WebKit은 이전과 같은 일반 실행 권한을 받아 수행했고 설정/바이너리/설치 변경0.
5개=required profile1+기존 font preflight3+새 탐색 진단1이다. 탐색 진단 PASS는 profile PASS가 아니다.
WebKit의4속성 native gate 실패는 그대로 재현됐다. 이번 탐색의24조건×3엔진=72쌍,
각2개의 독립 Canvas=144개에서 같은 조건의 width/pixels pairEqual이 true였다.
이는 measure 폭이 실제 glyph 배치 advance와 맞거나 print 배율이 같다는 증명이 아니다.

고정 합성 문구 `AV To ffi abc`,32px,DM Sans normal원본/weight400/opsz9. 아래는 connected Canvas:
단위는 measureText.width의 CSS px이며 반올림하지 않은 JS 관찰값이다.
baseline은 native kerning을 설정하지 않은 상태(auto 또는 API부재)로 S-22의 normal profile이 아니다.

| 설치 엔진 browser.version | baseline 폭 | CSS kern none 폭 | CSS kern none 픽셀 vs baseline | face kern0 폭 |
| --- | --- | --- | --- | --- |
| Chromium 149.0.7827.55 | 184.95986938476562 | 184.95986938476562 | 동일 | 190.94387817382812 |
| Firefox 151.0 | 184.93333435058594 | 184.93333435058594 | 동일 | 190.9166717529297 |
| Webkit 26.5 | 184.9599151611328 | 190.9439239501953 | 동일 | 190.9439239501953 |

**반례:** WebKit CSS kern none의 폭 차이 =
190.9439239501953 - 184.9599151611328 = 5.9840087890625px지만 두 Canvas의 ImageData 전체는 동일했다.
같은 width의 face kern0 경우는 baseline과 픽셀이 달랐다. 따라서 CSS의 computedStyle readback이나
측정 값 변화만을 근거로 paint까지 같은 kerning 제어가 적용됐다고 해석할 수 없다.
이것은 위 조건의 반례이며 모든 font/크기 또는 모든 Safari가 틀렸다는 주장이 아니다.

- detached Canvas에서 CSS7변형은 세 엔진 모두 baseline과 같은 폭/픽셀이었다. computedStyle은
  빈 값이었다. 현 print는 detached Canvas이므로 connected CSS 제어를 print에 그대로 적용할 수 없다.
- face kern0은 세 엔진에서 폭과 픽셀이 baseline과 달랐다. kern1은 세 엔진에서 baseline과 같았다.
  feature 설정의 효과를 확인했으나 normal kerning 강제·모든 문구/크기/축/스타일의 동등성은 미증명이다.
- shorthand small-caps는 세 엔진에서 실제 픽셀/폭을 바꿨다. 반면 CSS small-caps는 바꾸지 않았다.
  Firefox는 shorthand small-caps를 적용한 뒤에도 별도 native fontVariantCaps getter가 normal이었다.
  그러므로 getter 하나만으로 실제 font shorthand 상태를 모두 설명하면 안 된다.
- shorthand expanded는 이 원본/문구에서 픽셀이 같았다. 해당 font의 폭 변화 가능성까지 진단한
  것이 아니므로 'stretch 제어 대체 성공'이라고 판정하지 않는다.
- WebKit connected CSS optimizeSpeed는 폭192.5120086669922 및 픽셀을 바꿨다.
  같은 CSS의 detached 결과는 baseline과 같았다. CSS text-rendering이 DOM 부착과 무관하게
  같은 실행 profile을 공급한다는 대안은 이 결과로 입증되지 않았다.
- 다른 엔진의 숫자 차이를 허용 오차로 덮지 않았다. S-22의 엔진 내 동일 plan 검증과 엔진 간
  관찰값 보고를 계속 구분한다. 새로운 snapshot/PNG/폰트 byte 저장 또는 제품 font 선택0.

#### 4속성별 판단 및 현재 호출부 영향

| 대상 | 가능한 일부 수단 | 남는 결함 / 판정 |
| --- | --- | --- |
| kerning=normal | FontFace featureSettings의 kern 설정 | CSS는 위 반례로 전체 대안으로 불충분. descriptor는 실제 효과가 있으나 다른 상위 속성/optical sizing과 결합된 고정 profile은 NOT PROVEN. |
| stretch=normal | font shorthand + 단일 alias/face matching | 이 font에서 expanded 픽셀 변화가 없어 실제 제어 반례/복구를 입증하지 못함. 선언만으로 PASS 불가. |
| caps=normal | font shorthand normal/small-caps | shorthand 효과는 있음. 별도 getter와 shorthand가 독립인 엔진도 있으므로 매 font assignment 뒤 일치/복구 시험 필요. |
| textRendering=auto | 엔진 기본값 또는 CSS | WebKit native 검사 불가,CSS connected/detached 차이 관찰. descriptor는 이 렌더링 힌트 전체를 대체하지 않음. |

정적 호출부: `packages/render/src/canvas/execute-preview-plan.ts`의 draw-text는 각 command에서
`text.font = fontSpec`을 수행한 후 fillText하고,자간!=0이면 code point별 measureText도 호출한다.
`apps/mockup/src/canvas/surface.ts`는 DPR setTransform 후 executor에 전달하고,
`apps/mockup/src/print/exportFramePng.ts`는 detached Canvas에 printScale을 설정한 후 같은 plan을 전달한다.
따라서 wrapper 준비 시 한 번 확인하는 것만으로 이후 font 할당과 connected/detached 조건을 보장할 수 없다.
width/height를 재설정해 context를 초기화하는 우회도 현재 DPR/printScale을 지울 수 있어 채택하지 않았다.
공유 executor/print/surface 제품 코드는 이번 수정0이다.

공식 본문 확인2026-09-14(검색 요약을 근거로 쓰지 않음):
- [W3C CSS Fonts Level4 §7.2 Feature and variation precedence](https://www.w3.org/TR/css-fonts-4/#feature-variation-precedence):
  face descriptor 뒤에 optical sizing과 variant/kerning 관련 속성이 적용될 수 있다.
  descriptor 값만으로 최종 feature/축 고정을 추론하지 않는다. 이 문서는 Working Draft다.
- [WHATWG HTML Canvas text styles](https://html.spec.whatwg.org/multipage/canvas.html#text-styles):
  font shorthand의 해석과 별도 텍스트 상태를 구분한다. 글꼴 매칭/텍스트 준비에는 font source와
  context의 속성이 사용된다. 요소 CSS readback은 Canvas 필수 속성의 native 지원 증명이 아니다.
- [WebKit 공식 소스 CanvasRenderingContext2D.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/canvas/CanvasRenderingContext2D.cpp):
  setFont 경로가 computedStyle의 fontDescription을 기반으로 해석하는 코드를 확인했다.
  main은 가변이고 설치 binary와 commit 일치 미확인이다. 위 runtime 차이의 원인을 확정하는 증거로
  사용하지 않으며,비공개 구현에 의존하는 제품 코드를 작성하지 않는다.

#### 다음 안전한 기술 단위

현재 간단한 대체2안(CSS-only / face-descriptor-only)은 **네 필수 조건 전체의 동등성 NOT PROVEN**.
S-22 gate를 green으로 바꾸거나 WebKit을 제외하지 않는다.132 BLOCKED_VERIFICATION 유지.
다음은 `SPEC132_ISOLATED_PROFILE_CONTRACT_REVIEW`: 같은8문서에서 **격리된 측정·실행 환경 후보**를
설계한다. 깨끗한 context/명시 face feature/동일 font assignment를 조합하되 다음을 먼저 검토한다:

1. S-20의 같은 plan·같은 executor·차용 수명 및 print 단발/배율 계약을 바꾸지 않는 정확 준비·복구 방식.
2. DOM 부착/CSS 오염/font shorthand 변경 뒤에도 측정/paint가 같은 조건임을 확인할 실제 반례 행렬.
   Canvas 추가 생성/owner/전달 port가35 허용 파일 안에서 완결되는지,default 추가 Canvas0도 확인한다.
3. 차단 조건·원래 gate를 대체할 수 있는 동등성 근거를 먼저 문서 검수한다. 기본값 추측,
   글자 삭제/photo-only/근사치/엔진별 결과 재작성으로 성공시키지 않는다.
4. 기존3원본의 style/weight400·700,opsz,미지원 문자/cluster와 실제 공유 executor·preview/capture/print
   경로를 포함하기 전에는 공급/native 통합 PASS 또는 전체132 DONE을 선언하지 않는다.

이는 다음 검토의 범위이지 격리 구조 채택이나 필수 게이트 완화 승인이 아니다.
제품 지원 축소/출력 의미 변경/새 라이브러리·binary·취득이 필요할 때에만 정확한 별도 결정을 요청한다.
FP-3/S-28 재승인이나 일반 검토 진행 여부는 묻지 않는다.

이번 첫 Chromium 요청은 도구 결과 직렬화 오류로 출력을 확보하지 못했다. 그 실행 PASS는 집계하지 않았다.
자기 temp/포트 부재 확인 후 같은 명령을 다시 실행하여 위 exit0과 결과를 확보했다.
프로세스 CIM 조회는 접근 거부되어 재시도/권한 우회하지 않았으며 전체 프로세스 잔류0을 주장하지 않는다.
확보된3 실행 staging(Yu5QQh/WIZPNo/S16VoF;각 denn-e2e- 접두)은 기존 runner가 자기 범위만 정리했다.
최종 경로 부재/포트/보호SHA/diff 검증은 live 마지막 항목에 기록한다.

### S-31. 격리 context와 배율 보존의 후보 / 선행 진단 (2026-09-14)

사용자 `어떻게 해결하지? 다음 진행해줘`에 따라 격리 후보를 검토한다. 기존 native gate는 유지한다.
후보 I-1(connected Canvas CSS만 보정)은 S-30 반례로 불충분하다.
후보 I-2: 측정/실행은 같은 소유권의 DOM 미부착 Canvas 환경에 한정하고,명시한 FontFace를 사용한다.
preview는 목표 backing/DPR 크기에서 실행한 픽셀을 같은 backing 크기의 표시 Canvas로1:1 전달하며,
print는 원래 출력 backing/printScale의 detached Canvas에서 직접 실행/encode하는 구조를 검토한다.
preview 비트맵을 확대해서 인쇄하는 안이 아니다. 계획좌표/문구/줄바꿈/공유 executor는 재작성하지 않는다.

I-2의 문제: 추가 Canvas 메모리/owner 수명,표시 target의 clip·alpha·filter 오염,전달/restore 실패,
색공간·투명 pixel의1:1 복사 여부를 검증해야 한다. 기존 surface/print는 executor 호출 전에
DPR/printScale을 설정하므로 width 재할당 또는 무조건 reset으로 그것을 지우면 안 된다.
복사되는 것은 계획이 아니라 그 배율에서 렌더한 픽셀이며,이 단계 추가는 S-20 직접 실행 구조의
변경 후보다. 아직 구현 계약 채택/필수4속성 검사 대체/제품 코드 연결 승인이 아니다.

선행 진단은 기존 tests/composer-room-source/source.spec.ts에1개만 추가한다. 제품 변경0.
기존3원본·3 localhost route만 사용하며 기존5 SHA 고정,추가취득/등록의 제품 노출0.
3face(normal/italic/Korean)×2weight(400/700)×3size(12/32/64)×2scale(1/2)=36조건.
같은 immutable byte/명시 wght 및 DM opsz9/kern1 descriptor,고정 공급 가능한 합성 문구만 사용한다.
각 조건에서 깨끗한 detached context2개의 measure/pixels 재현과,hostile CSS가 있는 connected
Canvas로 같은 backing 크기1:1 전송 후 pixel byte 일치를 검사한다. 투명 바탕의 유색 글자를 써서
완전 opaque 예시만으로 전송을 증명하지 않는다. 소유 context에 설정한 uniform scale이 유지되는지도 검사한다.
native4속성이 모두 존재하는 엔진에서는 별도 reference에 S-22값을 명시하여 후보와 실제 width/pixel을
비교한다. 없는 엔진은 비교 불가(null)로 기록한다. null을 동등성 PASS로 해석하지 않는다.
이는 shared executor/실제 Composer/PNG encode를 아직 포함하지 않는 격리·픽셀 전송 진단이다.
같은72이상 임의 수로 coverage를 부풀리지 않고 실제 조건36×3엔진 결과만 보고한다.
raw ImageData/PNG/원본 파일 저장0,자기 face/Canvas만 해제,세 native selector만 실행한다.

#### S-31 실측 결과 — 2026-09-14 (선행 진단, 통합 완료 아님)

| 설치 엔진 | 전용 명령 결과 | 격리 pair/전송/배율 | S-22 명시 설정 reference |
| --- | --- | --- | --- |
| Chromium149.0.7827.55 |6/6 PASS,exit0|각36/36|36/36 폭·픽셀 동일|
| Firefox151.0 |6/6 PASS,exit0|각36/36|36/36 폭·픽셀 동일|
| WebKit26.5 |5/6 PASS,exit1|각36/36|36개 비교 불가(null)|

각6개는 기존 required1+font load3+S-30 탐색1+S-31 탐색1이다.
새 조건은36×3=108개이며,각 조건의 독립 격리 Canvas pair·투명 바탕 유색 pixel1:1 전달·uniform scale
보존이 모두 통과했다. reference는 native setter 전체가 있는2엔진×36=72개만 비교했다.
WebKit36개 null은 PASS/동등성 증명으로 바꾸지 않았다. 원래 네 accessor gate FAIL은 그대로다.
확정 결과 원문은 실행 출력에서 추출했으며 원본 font/pixel/PNG 파일 저장0이다.
같은 size/font 조건의 두 Canvas 일치이지 실제 미리보기→PNG 인쇄 또는 모든 크기/문자 증명은 아니다.

공통 check 첫 실행은 unit 단계에서 추가 출력이 없어 Codex가 해당 실행 세션만 Ctrl-C로 중단(exit1)했다.
실패한 test assertion을 본 것은 아니며 원인 UNCONFIRMED다. 다른 프로세스 종료/설정 변경0.
이후3엔진 선행 진단을 순차 수행하고 같은 `node scripts/check.mjs`를 재실행하여 exit0을 확인했다:
format/lint375,7프로젝트typecheck,unit3757/3757(123파일),2build PASS.
단위/타입/기능 기준이나 timeout을 변경하지 않았다. 첫 중단 기록은 없애지 않는다.

구조 검토 결론:
- CSS-only 반례를 피하는 **격리 +1:1 표시 전달의 실행 가능성**은 위108조건에서 확인했다.
- 실제 공유 executor/Composer/PNG encode,모든 실사용 font size·문구·axes·단말·색공간은 NOT VERIFIED.
- 원래 S-20의 provided context 직접 실행과 S-22의 literal native4속성 요구를 그대로 만족하는
  구현은 아니다. 두 기준을 몰래 green으로 만들거나 테스트를 삭제할 수 없다.
- 다음에는 I-2 구조에 맞는 새 검증 계약이 필요하다. 현재 파일35에 대응시킬 후보는
  composer-font-proof(격리 measure/face owner),font-bound-execution(목표별 실행 차용),
  surface/hook(표시 backing/DPR의1:1 인계),print(출력 backing/scale 직접 실행),
  Composer/source(같은plan/currentness 결속)와 기존 허용 테스트다. 실제 API/소유권은 아직 확정하지 않았다.

추가 Canvas는 크기에 비례한 메모리와 복사 비용이 발생한다. 이번 진단의 성공은 운영 메모리 예산 승인이
아니다. 목표가 W×H backing의 RGBA8이면 pixel plane 하나의 산술값은4×W×H bytes이며,
브라우저 내부 복사·GPU·font cache까지 포함한 실제 사용량은 UNCONFIRMED다.
복사 대상의 clip/alpha/filter/색공간 오염과 restore 실패,retire 중 전송 차단,default Canvas0,
실패한 프레임의 성공 인계0,print의 clicked-plan 고정/단발 encode를 새 계약에서 반드시 다룬다.

공식 근거 추가 확인2026-09-14:
[WHATWG Canvas — Premultiplied alpha](https://html.spec.whatwg.org/multipage/canvas.html#premultiplied-alpha-and-the-2d-rendering-context)
및 [pixel manipulation](https://html.spec.whatwg.org/multipage/canvas.html#pixel-manipulation):
색 표현 전환은 유한 정밀도로 손실이 생길 수 있으므로1:1 복사를 선언만으로 완전 동일하다고 하지 않는다.
이번은 drawImage 뒤 실제 ImageData 전체 비교로 위 조건을 검증했으며 putImageData 우회는 사용하지 않았다.

### S-32. FP-4 — 격리 렌더링 계약 전환 제안 (PENDING)

권장 제안은 I-2(격리된 측정/렌더링 + 표시 Canvas1:1 전달,print는 출력 해상도로 직접 실행)다.
**현재 승인 아님.** FP-3/S-28은 유효하나,이번 제안은 검토로 드러난 S-20 실행 구조와 S-22 검증 방법의
변경이다. native4속성 미지원이라는 기존 FAIL을 예외 종료한 것으로 기록하지 않는다.

요청하는 결정: 이 구조를 다음 계약 작성의 방향으로 선택하고,스펙132의 실행·소유권·검증 계약을
그에 맞게 재작성/검토할 것인가? 승인 시 먼저 같은 문서8에서 정확 변경 범위와 대체 검증을 확정한다.
현재35파일에 수용되는지 확인하고,그 밖 파일/API/의존성이 필요하면 따로 STOP한다.
구현은 보완 계약 검수를 통과한 뒤에만 기존 로컬 권한 안에서 재개한다.

새 검증의 요구는 다음과 같다:
- 같은 명시 font byte/face·문구·plan에서 measure/preview/capture/print 결속;다른 환경으로 자동 fallback0.
- 불일치/실패/오염/retire 때 성공 보고와 출력 인계 차단.
- 실제3엔진 통합 검증 및 glyph/axis/currentness·실제 공유 executor·출력 배율 검증.
- native 속성이 없는 경우를 지원된 것처럼 위조하지 않으며,대체 경로의 근거·한계·필수 실패 시험 명시.
- 기존 결과를 재사용해 미검증 영역을 PASS로 만들지 않고,새 검증 계약 자체를 먼저 검수.

이는 검사 한 개를 skip하자는 요청이나 운영/폰트 배포 승인 요청이 아니다.
실제 서비스/운영 데이터/원본 취득·변환/설치/배포/보호 변경/실제 룸 UI 개방은 계속 금지한다.
state FOUNDER_DECISION_REQUIRED,next FOUNDER_FP4_ISOLATED_RENDERING_CONTRACT.
131 DONE/132 PARTIALLY_IMPLEMENTED 유지,commit/push0. FP-4 전환 미선택 시 현재 실패를 보존하고 구현 보류.

### S-33. FP-4 승인 후 실행·소유권·검증 계약 (2026-09-14)

직전 FP-4 질문에 사용자 `응 승인할게`로 I-2 방향의 계약 수정·검토를 승인했다.
FP-4=APPROVED_CONTRACT_DIRECTION. S-32의 PENDING은 이전 이력이다.
검수 통과 후 S-24의35파일/문서8 안에서 FP-3 로컬 구현을 재개할 수 있다. 운영 승인 확대0.

#### 기존 절과의 우선순위

- S-19 runtime alias 사전 projection,원래 plan identity/좌표/줄/문구 유지.
- S-20의 **caller context 직접 텍스트 실행**만 관리형 경로에서 대체한다.
  측정은 owner의 private detached Canvas,실행은 목적별 private detached Canvas로 제한한다.
  같은 owner/profile/alias/font assignment를 사용하되 같은 context 객체 하나를 공유할 필요는 없다.
  동시 측정/실행이나 context 상태 누출을 공유하지 않는다.
- S-22 literal4 native accessor 요구는 **이전 직접 실행 profile의 진단**으로 보존한다.
  새로운 I-2의 완료 기준은 아래 행렬이다. WebKit4속성이 지원된다는 주장/expando/skip0.
  원래 FAIL 이력과72 reference 일치/36 비교불가를 소급 PASS로 바꾸지 않는다.
  새 경로는 engine-local effective profile이며 이전4속성 의미와 모든 glyph가 동등하다는 계약이 아니다.
  다른 엔진끼리 픽셀 일치를 요구하지 않는다. text 삭제/폰트 교체/자동 fallback0.
- S-20 차용/retire/async print, S-21 자간, S-24 default 무주입 비간섭과35경로는 유지한다.
- S-26 admin 불변 표현은 S-28에 따른다. 보호PNG 생성 시험 제외 이외 새 skip0.
  새 I-2 통합 검증이 실제 통과하기 전에는 기존 native gate를 재분류하여 green으로 만들지 않는다.

#### 목적별 target / 실행 수명

| 목적 | 할당·실행·인계 | 종료 / 실패 |
| --- | --- | --- |
| 측정 | font owner가 lang=en/ko를 명시한 detached Canvas를 생성,준비된 face와 동일 shorthand로 측정 | source/byte/face 검사 전후;중간 값 외부 공개0;owner cleanup |
| preview | 기존 computeBackingStoreSize의 정확 width/height/effectiveDpr로 private target을 생성,같은 shared executor1회 | 성공/current일 때만 표시 Canvas에 같은 width/height로1:1 전달;자기 target release |
| 102 capture | 기존 execute 주입의 closure가 capture backing/scale을 알고 private target에서 실행,102 소유의 목적 Canvas로1:1 전달 | 102 API 변경0;기존 readSource gate/bitmap lease 유지;추가 frame 해제 |
| print | 기존 computeFramePrintPixelSize와 printScale로 private 출력 target 직접 실행 | 같은 target toBlob1회,결과 이후 currentness 검사;preview 확대0;URL은 기존 exporter 소유 |

preview 표시 Canvas는 surface의 전용 소유다. 전달 직전에 **동일 width라도 다시 할당**해
bitmap/clip/state stack을 초기화하고 identity transform으로 drawImage(source,0,0,width,height)한다.
같은 backing 크기의5인자 전달로 확대·재샘플링 요청0. 전달 후 기존 effectiveDpr를 명시적으로 재설정한다.
이 reset은 **관리형 표시 target만** 대상이며 기존 unmanaged의 conditional resize 계약은 바꾸지 않는다.
caller의 임의 clip/save stack을 보존하는 범용 도구가 아니다. 외부 Canvas를 몰래 차용·초기화하지 않는다.
reset/복사/배율 재설정/현재성 확인 실패 시 ready0;surface가 숨김/clear 경계를 유지한다.
private target의 명시 scale은 reset 이후 적용하며 연결·스타일 오염·다른 document/색공간이면 차단한다.
draw 성공 이전에는 표시 target 변경0;뒤늦은 실패는 일부 그리기 발생 가능,성공 인계0이다.

private target은 실행 단위마다 새로 생성한다. pool/전역 registry/재사용0.
prepare callback은 font owner가 제공하며 빈 boolean fake로 font/glyph 지원을 주장하지 않는다.
내부 단위 `renderIsolatedPlanFrame`은 font-bound-execution.ts에 둔다:
입력 plan/bindings/정확 backing/scale/language,자기 canvas factory,currentness,context 준비 capability;
결과는 안전 code 또는 frame(present/encode/release)다. native context/Canvas/font byte를 결과에 노출하지 않는다.
목적당 caller가 기존 preview/capture/print 한도를 먼저 적용해야 한다. helper도 양의 safe integer
backing/유한scale/4WH safe arithmetic을 검사하되 새로운 운영 메모리 budget을 추측하지 않는다.
실제 할당 실패는 안전 오류다. print 진행 동안 전체 target2개를 불필요하게 유지하지 않도록 exporter의
기존 target 대신 private target을 encode한다. PNG 완료 callback이 없으면 임의 timeout으로 성공하지 않는다.

prepare/currentness/create/drawImage/toBlob은 예외·재진입 경계다. 외부 호출 전후 proof와 생존을 검사한다.
release는 멱등이고 완료 frame의 display/encode를 차단한다. encode는 frame당 최대1회다.
release가 비동기 encode 도중 호출되면 논리적으로 즉시 무효화하되 private bitmap의 물리적 해제는
callback settlement까지 유예한다. 늦은 blob은 실패로 소비하고 download0. 새 retry0.
현재성 자체가 throw하면 false. 오류에 SDK/원문/alias/문구/ID/예외 message를 넣지 않는다.
이 내부 primitive는 font owner/acquire를 대신하지 않는다. 이후 binding wrapper가 정확 plan identity,
face 차용 수명과 prepare를 결속하고 finally 해제한다. 미연결 primitive PASS는 전체132 PASS가 아니다.

#### 실제 font effective profile과 네이티브 수용 기준

lang(en/ko),direction ltr,byte/hash/style/weight400·700/DM opsz9 및 kern1을 명시한다.
지원 native 속성은 setter/readback을 검사하고,부재는 capability 정보로 남긴다.
detached 요소 CSS를 지원API 대체로 사용하거나 unsupported property에 expando를 쓰지 않는다.
새 target에서 font assignment 이후에도 효과가 유지되는지 실제 shared executor로 확인한다.
DM opsz9와40의 기준 비교·weight400과700의 비교는 실제 효과 진단이고,descriptor readback만으로
최종 선택 축을 단정하지 않는다. 해당 기준을 증명하지 못한 요청은 production 지원으로 기록하지 않는다.

| 게이트 | 사전 고정 입력/판정 | 증명 범위 |
| --- | --- | --- |
| 순서/fake | 동일plan/bindings/scale,잘못된size/currentness false면allocate0,prepare/execute실패면present0,release/encode 단발·예외·재진입 | 제어흐름만,실제font 아님 |
| target native | source와표시 동일 backing;hostile clip/alpha/composite/shadow/filter/transform/save-stack 후reset;전체ImageData exact | 같은엔진·같은색표현 조건;새 tolerance0 |
| 3원본 native | S31의36조건/엔진+공유executor text/spacing0·양수·음수/줄바꿈/회전;reference가능72는비교,WebKit부재별도 | same-engine effective profile;전체Unicode/실기기 아님 |
| PNG/배율 | 같은plan을capture/print 동일배율로각실행해서pixel비교;다른배율은논리줄/정렬과각배율의독립reference비교 | 미리보기확대0;PNG decode까지;축소PNG간hash 요구0 |
| owner | delete/add/descriptor변화,foreignplan,late load,measure/draw/encode중retire,StrictMode | stale ready/성공인계0 |
| 소비자 | 실제Composer/130/131/102,parent/drag pending,source 미연결과기본앱IO0 | fake source 대체0 |
| 기존 회귀 | S26의6파일,공통check,보호23SHA/번들/포트/temp | 116WebKitPNG14 별도미해결 유지 |

공식 근거 재확인2026-09-14:
[WHATWG canvas element](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)와
[Canvas state](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-state):
width/height의 동일값 재할당도 bitmap dimensions 초기화 절차를 수행한다.
[Canvas text styles](https://html.spec.whatwg.org/multipage/canvas.html#text-styles):
Canvas 텍스트 상태와font shorthand를 구분한다. reset은font 출력 일치나glyph support 증명이 아니다.
색변환/alpha의 한계는 S31 공식근거와 그대로 유지한다.

#### 정확 파일 대응 / 자체 검수

S24의35개에 추가0. 이번 첫 구현은 기존 허용 신규2개
`apps/mockup/src/canvas/font-bound-execution.ts`와 `font-bound-execution.test.ts`의
격리 frame primitive/순서 fake부터 수행한다. 아직 App/Composer/print에 연결하지 않는다.
이후 composer-font-proof(측정/face/준비),surface/hook(관리형 표시),exportFramePng(직접 encode),
composer-room-source/fixture(102 closure)로 위 경계를 연결한다. native 행렬은 기존 source.spec/config만 사용.
기존 shared executor/types/index·102/129/131·admin/Space 파일 변경0.
동일 Codex 검수: reset 소유권,출력배율,async 해제,예전gate 보존,범위35와대체행렬 대조 완료.
판정 **FP4_REVISED_CONTRACT_REVIEW_PASSED_SAME_CODEX**. 실제 새 구현/native 통합 PASS는 별도 기록.
다음 SPEC132_ISOLATED_FRAME_IMPLEMENTATION_AND_VERIFICATION; 중요 승인 재질문0.

### S-34. FP-4 첫 구현·검증 결과 / 기술 보완 필요 — 2026-09-14

FP-4 방향 승인과 S33 문서 자체검수 후 첫 격리 primitive를 구현했다. 아직 font owner/Composer/print 연결은 없다.
이번 code/test 변경5개: font-bound-execution.ts/test(신규2),composer-room-source-fixture.tsx(신규),
e2e/canvas-fixture.tsx,기존 native source.spec.ts. 기존10개에4개를 더해 전체 task code/test14 + docs8 unstaged.
기본 앱 import/관리형 provider 생성0. fixture의 no-text shared-executor probe를 text/glyph 지원으로 확대하지 않는다.

구현: 새 private Canvas,정확 backing/scale,prepare→execute,관리형 display reset→1:1 전달,
같은 private target 단발 toBlob,stale/재진입/예외 차단,encode 중 release의 물리적 해제 유예.
factory는 새 private target 소유권을 넘기는 trusted 내부 port다. 제품 font proof를 구현한 것으로 보지 않는다.

검증 명령과 결과:
- 최초 `pnpm exec biome ...`와 `pnpm exec vitest ...`: 실행파일을 찾지 못해 exit1,시험 본문 미실행.
  로컬 .bin CMD가 실제 존재함을 확인하고 동일 도구 직접 호출. 설치/PATH/config 수정0.
- `.\\node_modules\\.bin\\vitest.cmd run apps/mockup/src/canvas/font-bound-execution.test.ts`: 최종29/29 PASS.
- `node scripts/check.mjs`: 최종exit0,format/lint378파일,7프로젝트 typecheck,unit3786/3786(124파일),2build PASS.
  기존3757+신규29=3786. 최초26시험에색/alpha/크기변경3시험 추가. fake는순서/실패/수명 증거만이다.
- fixture의 속성 이름 문자열이 Tailwind scan의 사용하지 않는 CSS utility를 생성하여 고객CSS가 잠시 변했다.
  설정/CSS를 바꾸지 않고 같은 native 속성의 문자열 표기만 나누어 생성 부작용 제거. 실제 필터 오염 시험 유지.
  최종 고객CSS/고객JS/adminJS bytes·SHA는 S28/S31과 동일. 기존chunk500kB경고 유지.

| 실행 | 결과 | 정확 의미 |
| --- | --- | --- |
| Chromium / 첫 primitive |7/7 PASS|3배율의1:1 표시·save-stack/reset·PNG roundtrip PASS|
| Firefox / 제한 환경 |7FAIL exit1|본문 전 newPage _page 오류;폰트/제품 실패 아님;원인UNCONFIRMED|
| Firefox / 일반 환경 허용 |6PASS/1FAIL exit1|표시/배율은PASS,PNG roundtrip3개FAIL|
| Firefox / direct-PNG 비교 진단 추가 후 |6PASS/1FAIL exit1|아래 reference3개동일;원래PNG 단언FAIL 유지|
| WebKit / 일반 환경 |5PASS/2FAIL exit1|새 primitive 미완료 + 기존4속성 native FAIL|
| WebKit / capability 읽기 진단 후 |5PASS/2FAIL exit1|색/alpha readback 부재확인;원래FAIL 유지|

각7=기존6+primitive1. 반복 실행은새coverage로합산하지 않는다.
새 fixture의 배율은1/1.25/2,원래plan100×60. backing은100×60/125×75/200×120.
투명배경 위rgba(74,53,40,0.73) 합성draw-image-cover. 텍스트/실사진/실제Composer 없음.

Firefox151.0에서 직접 executor PNG와격리 PNG를 각각encode/decode하여 비교한3개는전체RGBA byte일치였다.
그러나 둘 모두 PNG 전 reference Canvas 픽셀과 다르다:

| 배율 | PNG 전후 다른 RGBA sample수 | 최대 채널 절대차(0..255) | direct-PNG와격리-PNG |
| --- | ---: | ---: | --- |
|1|1588|23|동일|
|1.25|2388|37|동일|
|2|7160|32|동일|

sample수는다른채널개수이지pixel개수가아니다. maxDelta=max(abs(actual[i]-expected[i])).
이결과는격리primitive에만차이가생긴다는가설을위조건에서배제한다. PNG encoder/decoder/색변환/alpha중
어느단계가원인인지는UNCONFIRMED. 반올림손실이라고단정하거나23/37/32를허용오차로채택하지않는다.
pngReference=true는출력전후 무손실을증명하지않는다. 기본PNG단언/예전실패는그대로유지했다.

WebKit26.5의 getContextAttributes는 function이지만 반환값은
`{desynchronized:false,willReadFrequently:false}`였다. alpha/colorSpace 키는없다.
primitive가필수로확인한alpha===true/colorSpace===srgb 조건에서안전실패한다.
sRGB/alpha 미지원이확인된것이아니라 **readback으로증명불가**다. TS타입에키가있다고runtime지원을
가정하면안됨이실제코드에서확인됐다. 새primitive의WebKit 전달/PNG는NOT VERIFIED.
createImageBitmap은function으로확인했으나이번primitive결과로decode성공을주장하지않는다.

진단 뒤 fixture의초기할당/실패도finally에서자기Canvas를정리하도록범위를확대했다.
이최종cleanup변경후 targeted29/check3786 PASS;native전체는그변경후재실행하지않았으므로
최종source전체native PASS를주장하지않는다. 기존색/PNG판정기준은변경0.

#### 다음 기술 검토 — 승인 요청 아님

state BLOCKED_VERIFICATION,next SPEC132_PIXEL_PROFILE_TECHNICAL_REVIEW,pending Founder결정 NONE.
FP3/S28/FP4는유효하다. 임의PASS/commit/push/실제Composer연결보다다음범위의기술검토가먼저다:
1. 새Canvas의최초context획득권한을owner가보증하는capability와색공간명시생성계약을검토한다.
   이미다른옵션으로초기화된외부target을받지않고도preview/102/print를연결할수있는지35파일안에서확인.
   getContextAttributes 키부재를지원true로위조하거나검사한줄만제거하지않는다.
2. Firefox에서기존direct-PNG도동일한차이를내므로PNG내부픽셀/디코더/alpha변환을분리하는
   제한진단을먼저설계한다. 같은단계의reference비교와원래무손실단언을구분한다.
   투명도를버리거나배경을덧칠하거나newencoder/의존성/고객출력정책을묵시변경하지않는다.
3. S33의실제네이티브적용성보완을검수한뒤에만코드보완. 해당검토는중요Founder선택이아니므로재질문0.
   새제품의미/지원범위축소/권한이필요해지는경우에만별도중지한다.

최종보호23 SHA동일,허용외추가0,staged0,diff--check PASS.
HEAD102860e/local origin추적0/0;새원격조회/fetch/commit/push0.
자기staging WTozYM/alNvcQ/1sCaQc/lcbTSc/3Csxrf/9QM2rv6개부재,4183/4184/4185 LISTENING0.
전역프로세스목록의잔류0을주장하지않는다. 운영/배포/새취득·설치/예약자동화0.
131 DONE/132 PARTIALLY_IMPLEMENTED. 최종폰트결속/실제룸UI/실기기/운영은미완,전체리빌드분모UNCONFIRMED.

### S-35. 색공간 생성 소유권·PNG 단계 분리 보완 계약 — 2026-09-14

S34 다음 기술 검토를 사용자 `이어서하자`로 재개한다. FP4 재승인 대상 아님.
공식 [Canvas2D settings](https://html.spec.whatwg.org/multipage/canvas.html#canvasrenderingcontext2dsettings)
(확인2026-09-14)은 최초 생성의 alpha=true,colorSpace=srgb 기본을 정의한다.
반복getContext는기존context의생성옵션을변경하는방법이아니다. readback키부재를수정해서true로만들지않는다.

선택한 보완은 생성 소유권을 가진 내부 display capability다:
- `createIsolatedDisplayTarget(createCanvas)`가 trusted factory의 새Canvas를 넘겨받아 최초2D context를
  alpha:true/colorSpace:srgb로 생성한다. caller는 반환element를DOM에붙일수있으나
  다른Canvas를capability로위장하거나사후처음부터다른옵션의context를주입하지않는다.
- 이미임의로획득한HTMLCanvasElement를present에직접넘기는API는폐기한다.
  present는발급된capability만받으며내부context identity/해제/ownerDocument를검사한다.
  JSX의기존unmanaged경로는유지;향후managed surface는전용owner가생성한element만표시한다.
  102의createSurface도같은capability를closure로묶을수있으며102공개API변경은필요없다.
- native readback값이있으면alpha/colorSpace 모순을거부한다. 값이없을때허용근거는
  **최초생성권한+명시생성요청+표준기본+native행동시험**이지미지원getter의가짜readback이아니다.
  trusted createCanvas가새미사용Canvas를반환한다는주입계약을어기는악성factory감지전체를주장하지않는다.
  외부기존Canvas는capability로자동adopt하지않는다.전역registry/전역API변조0.
- private target도동일최초생성계약,색/alpha명시.충돌하는readback은실패.
  target생성·전달·release/currentness는fake반례와3엔진native로검증한다.
  getContextAttributes함수자체부재/예외는이단계에서계속실패로둔다.
- display release는자기bitmap해제·사용종료이며DOMmount/unmount는caller소유;privateframe해제와구분.

PNG는제품encode를바꾸기전에진단:
기존source.spec.ts에별도blank-page단계분리시험을추가한다. 합성rgba1개,같은Canvas를
직접ImageBitmap화한경우와toBlob후ImageBitmap화한경우를비교한다.
premultiplyAlpha default/none/premultiply × colorSpaceConversion default/none의6조합을각각기록한다.
모든조합을측정하며성공한옵션만고르는제품fallback0. PNG byte/픽셀파일/URL저장0.
정확RGBA전체비교,다른sample수/최대채널차와직접Canvas복사일치를보고한다.
원래무손실단언을삭제하지않고진단결과로encoder/decoder단계를구분한뒤기술검수한다.
새依存/PNGencoder/배경합성/투명도삭제/운영출력정책변경0.

정확변경은기존35내font-bound-execution.ts/test,composer-room-source-fixture.tsx,source.spec.ts와8문서.
동일Codex설계검수:소유권으로임의기존target과최초생성context를구분하고,진단과제품옵션채택분리완료.
S33의알파/색공간readback만으로판정하는초기primitive조건을위생성capability조건으로정정한다.
새native조건PASS는아직아님. S29~34의FAIL이력/옛gate/116문제는보존한다.

#### S-35 기술 검수 결과 — PNG 비교 단계 정정

최초소유권보완후WebKit에서도새private실행/1:1표시/배율3조건은통과했다.
기존색/alpha키는여전히부재이며native지원으로위조하지않았다.
단계분리12조건에서Firefox/WebKit 모두Canvas→ImageBitmap→Canvas는6/6차이0.
PNG를거치면6옵션모두같은차이를보였다(Firefox324 sample/max2,WebKit648/max1;alpha변경0).
옵션중하나로통과시키는대안은위조건에서근거없다. encoder/decoder/정밀도중정확원인은미확정이다.

기존직접executor PNG와격리PNG는각3배율에서동일했다. 따라서후속검증은**같은단계**를비교한다:
1. private 실행/표시픽셀 ↔ 같은plan/배율의직접실행픽셀:전체RGBA exact.
2. 격리PNG decode ↔ 같은plan/배율의직접PNG decode:전체RGBA exact.
3. PNG전픽셀 ↔ PNG후픽셀:roundtrip 관찰값을계속출력하되이를추가1:1전달손실과혼동하지않는다.

이는숫자tolerance확대나Firefox예외가아니며,모든엔진에서동일기준을쓴다.
S33의PNG단계비교요구를실제시험이PNG전후무손실까지확대했던오류를정정한다.
S34/S35의png=false/차이수치와실패이력은보존한다. 제품encoder/옵션/투명도/색/PNGbyte변경0.
공식[Canvas premultiplied alpha](https://html.spec.whatwg.org/multipage/canvas.html#premultiplied-alpha-and-the-2d-rendering-context)
(확인2026-09-14)은반투명표현전환의유한정밀도손실을명시한다. 모든PNG변환의byte동일성을보장하는문서가아니다.
[ImageBitmap options](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap)
는default premultiply동작이구현별일수있음을명시한다.이번실측의정확원인단정에는사용하지않는다.
같은단계의추가손실0과절대무손실보장은구분한다. 가시품질/실기기/전체이미지지원PASS로확대0.

동일Codex기술검수통과:품질임계값/제품지원/출력의미확대없음,명시FP4와35파일범위내시험정정.
새primitive의단계동일비교를재실행한다. 옛literal4속성gate는전체폰트통합검증전까지유지.
다음실행은Chromium/Firefox/WebKit3selector,기존회귀selector,check/보호/번들검사.

### S-36. 격리 target 보완 완료 / 다음 font owner — 2026-09-14

S35의생성소유권과동일PNG단계비교를구현·검증했다. 변경code/test4개는
font-bound-execution.ts/test,composer-room-source-fixture.tsx,source.spec.ts이며전체 task14개안이다.
문서8외확대0. 기본앱/실제Composer/제품font등록/print연결은아직추가하지않았다.

- display는trusted factory가새미사용Canvas를넘기고helper가처음context를생성한capability만허용한다.
  임의HTMLCanvasElement/가짜capability/해제된owner/명시색충돌/중간해제는거부한다.
  native키부재를true로고치지않으며JS/TS필드추가0. 같은context와최초생성권한을내부에서보유한다.
- 새unit5개추가로primitive34/34,최종check3791/3791(이전3786+5),124파일 PASS.
  format/lint378,7typecheck,2build PASS. 독립다른검수자가아닌동일Codex 자체검수다.
- 최종3native 명령:Chromium8/8 exit0,Firefox8/8 exit0,WebKit7/8 exit1.
  WebKit의남은1실패는보존중인옛S22 literal4속성gate다. 새로운primitive/PNG시험은3엔진모두PASS.
  8개=이전7+단계분리진단1. 전체132/native profile 지원PASS로합산하지않는다.
- 새primitive는3배율×3엔진=9조건에서1:1표시/scale·reset/직접PNG와동일단계비교PASS.
  글꼴text/axis/Composer결속은아직NOT VERIFIED;no-text성공으로대체하지않는다.
- 단계분리diagnostic은Canvas/PNG2종×premultiply3×색변환2=12조건/엔진,총36관찰.
  Canvas직접경로는세엔진모두6조건sample차이0. PNG경로Chromium0,Firefox324/max2,
  WebKit648/max1(각옵션6개가동일;alpha변경0). 옵션선택으로회피하지않고제품옵션유지.
- 투명PNG전후raw값의차이는S34/S35대로계속출력한다. 최종WebKit도각배율1/1.25/2에서
  2604/4170/10688 sample차이,max21/42/28을관찰했으나직접PNG와는3조건모두동일했다.
  이관찰은원본대비절대무손실주장이아니며숫자를허용오차로채택하지않았다.

실행중발견한진단시험의부수효과:
Chromium최초2실행은픽셀조건은모두맞았으나getImageData 반복readback성능warning3개로7PASS/1FAIL.
warning원문을확인한뒤**진단용decoded buffer만**최초getContext에willReadFrequently:true를지정했다.
제품render/display context설정/console기준변경0,경고무시필터0. 이후위3엔진최종본검증통과범위확인.
최종공통check는진단보완뒤다시실행해exit0확인. 이전실패를삭제하지않는다.

기존 S26 회귀 selector:138/138 PASS(exit0,1.1m). 지정6파일의수집범위이며전체기본E2E라고부르지않는다.
제외11개=085 evidence(3캡처+1목록검사)+088 Korean picker3+063 screenshot2+080 screenshot2.
고정6파일전체149후보중138실행+11제외. 이11개를PASS로계상하지않고,기존132계약의예정대체coverage는
아직실제Composer결속이후검증할부분으로남긴다. 보호PNG생성시험을실행하지않았다.

정리:자기staging8개We1Ttj/vPhxfE/c4DHYg/ltXE9m/aKmwaw/SIYJLI/KU9bm7/AXnIEr부재,
4183/4184/4185 LISTENING0. 보호23SHA동일,예상외경로0,staged0,diff--checkPASS.
고객JS346959/adminJS294910/CSS22675bytes 및SHA는S28/S34와동일.
HEAD102860e/로컬origin추적0/0;이번fetch/새원격조회/commit/push0.

현재 CODEX_WORKING / SPEC132_FONT_OWNER_IMPLEMENTATION_AND_VERIFICATION,Founder대기NONE.
S34의기술차단은위범위에서해소됐으며FP3/S28/FP4재승인질문0.
다음작업은S19~S25의composer-font-proof.ts/test에서공급byte·face identity/descriptor/membership,
retire/차용/늦은로드/해제,정확요청family/style/문자범위와격리측정준비를구현한다.
prepare:true 같은fixture stub을실제font증명으로승격하지않는다.
그다음같은plan binding→실제Composer/131source/102capture/print결속과3엔진text행렬을순서대로검증한다.
이단계가완료되기전옛literalgate를삭제/green화하거나132 DONE/전송완료로기록하지않는다.
131 DONE/132 PARTIALLY_IMPLEMENTED 유지. 실제UI·실기기·운영·배포·새취득·설치·자동화0.
### S-37. 관리형 font owner 구현·검증 — 2026-09-14

이번 재개에서 S19/S20/S24/S25/S33의 허용 범위 안에 composer-font-proof.ts/test를 추가했다.
기존 E2E fixture와 source.spec.ts만 함께 보완했다. 누적 code/test16(기존14+신규2), 문서8.
실제 Composer/preview/102capture/print 생산자 연결, 기본 제품 font 공급은 아직 구현하지 않았다.

- 공급 port는 bytes/byteLength/SHA-256, 정확 family/400 또는700/normal 또는italic/lang,
  native descriptor 직렬화와 검증된 정확 문자열 목록을 받는다. URL/local()/자동 fallback 입력0.
- 입력 byte/descriptor/문자 목록을 먼저 복사한다. load 명시 호출 전 환경 호출0.
  SHA 불일치면 UUID/FontFace/등록/Canvas0. digest와 UUID/native 생성 port는 신뢰 경계이며 fake는 실제 hash 증명이 아니다.
- owner마다 새 UUID alias(고객 정보0), 새 native binary face와 private detached 측정 Canvas를 소유한다.
  load 단발, 늦은 digest/load·폐기 중 add/Canvas/getContextAttributes 재진입의 ready 부활0.
- isCurrent/acquire/measure/prepare 전후에 face identity/status/alias 중복/membership/descriptor stamp를 읽는다.
  무관한 다른 alias는 허용하고, event 없는 drift를 발견하면 terminal retire한다.
  관찰 사이 외부의 삭제→복원 이력 전체를 감시한다는 주장은 하지 않는다.
- retire→모든 observer 통지→마지막 차용/진행 중 native 호출 반환 후 자기 자원 해제 순서다.
  중복 release/retire, listener 예외, 등록 후 throw, cleanup 예외에 안전하게 실패한다.
  물리 해제 예외는 재시도하지 않으며 '예외에도 native 해제 성공'이라고 주장하지 않는다.
- measure는 검증 목록에 있고 해당 요청의 substring인 정확 fragment만 수용한다.
  substring 또는 code point 포함만으로 shaping을 승인하지 않는다. 누락/unknown은 null, 정규화/문구 삭제0.
  크기 유한성/양수·측정폭 유한성/음수와 native font assignment 무시를 검사한다.
- prepare는 같은 document/lang의 새 private target 전용이다. native 속성이 있을 때만 설정/readback,
  없는 속성 expando0. fake profile 성공을 native glyph/축 효과 증명으로 승격하지 않는다.

검증 결과:
- 새 owner unit58/58. 기존 primitive34와 함께 총92개(58+34); 최종 targeted 결과는 아래 종료 기록.
- 최종 node scripts/check.mjs exit0: format/lint380 files,7 project typecheck,unit3849/3849
  (=직전3791+신규58),125 test files,고객/admin build2 PASS.
- 최초 공통검사는 test의 non-null assertion14개 lint 경고로 실패했다.
  runtime required() 검사로 교체했으며 lint 설정/경고 허용은 바꾸지 않았다.
- 실제 원본3×weight2=6조건/엔진, 각12/32/48px=18폭 비교/엔진.
  Chromium/Firefox는 각6조건 모두 load/측정/reference동일/unknown거부/descriptor drift 차단/
  차용 종료 전 등록 유지/최종 자기 등록 해제 PASS. 이36폭 비교는 glyph 전체나 실제 Composer 증명이 아니다.
- WebKit은6조건 모두 ready를 거부했다. variationSettings readback 부재와 unicodeRange
  U+0-10FFFF→U+0-10ffff 직렬화 차이가 관찰됐다. 원인별 처리는 S38이며 FAIL을 보존한다.
- 처음 Chromium8PASS/1FAIL은 kern1→생략형 직렬화 불일치였다.
  진단2회에서 같은 실패를 확인하고, native canonical 공급값을 '"kern"'으로 정정 후9/9 PASS.
  비교 자체를 삭제하거나 arbitrary descriptor 변화 허용0. 실제 의미는 계속 kern=1이다.
- 원본은 기존 고정 로컬3TTF/2OFL만 Node SHA 검사 후 사용. 시험 요청은
  localhost의 기존 승인3font route로만 fulfill; 제품 route 공급/다운로드/설치/운영GET0.
  실제 byte는 console/DOM/Git에 내보내지 않는다. 보고는 정적 진단 descriptor와 boolean/count만 남긴다.

### S-38. variation descriptor 검증 차단 / 다음 기술 계약 — 2026-09-14

현재 **BLOCKED_VERIFICATION / SPEC132_FONT_AXIS_OWNERSHIP_TECHNICAL_CONTRACT_REVIEW**.
Founder pending NONE. FP3/S28/FP4는 유효하다. 재승인 질문 대신 아래 기술 검토부터 한다.
S36의 다음 Composer 연결은 이 font gate 해소 이후다. 131 DONE/132 부분 구현 유지.

공식 근거(본문 확인2026-09-14):
- [CSS Font Loading3 §2](https://www.w3.org/TR/css-font-loading-3/#fontface-interface),
  W3C WD2023-04-06: binary face/descriptor/load/mutable state를 구분한다.
  API 명세가 설치 브라우저의 지원 증명은 아니다.
- [CSS Fonts4 §6.12/§13](https://www.w3.org/TR/2026/WD-css-fonts-4-20260913/#font-feature-settings-prop),
  W3C WD2026-09-13: feature 값 생략은1이며 직렬화는 CSSOM 원칙을 따른다.
  이번 kern 정정은 기능을 끄거나 조건을 완화한 것이 아니다.
- [WebKit FontFace.idl](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/css/FontFace.idl):
  조회한 main 소스는 FontFaceDescriptors variationSettings를 FIXME/주석으로 둔다.
  설치된26.5 빌드와 동일 commit이라는 증명은 없으며, 본문을 native 실측 대신 사용하지 않는다.
  실측 부재와 일치하는 보조 근거다. S31의 constructor 인자 전달만으로 opsz9 적용을 보장했다는 해석은 폐기한다.
- [CSS Font Loading3 §2.3/§4.2](https://www.w3.org/TR/css-font-loading-3/#font-face-css-connection):
  CSS @font-face는 연결된 face를 만들고 rule/src 변경은 identity와 membership에 영향을 준다.
  CSS-connected face는 fonts.delete만으로 지울 수 없다.
- [CSS Fonts4 font feature/variation descriptors](https://www.w3.org/TR/css-fonts-4/#font-rend-desc):
  CSS rule descriptor는 별도 조사 가능한 제어 표면이다. 현재 앱/설치 엔진에서 동작은 NOT TESTED.

구분 및 대안:
1. unicodeRange 대소문자는 값 의미와 직렬화 차이 문제다. 정확한 U+ 범위 파싱/동등성만
   허용하는 정규화는 기술 후보이며, variationSettings 부재를 해결하지 않는다. 전체문자열 무조건 lowercase0.
2. native variationSettings에 일반 JS 값을 넣거나 undefined를 expected로 인정하는 방법은 불허한다.
   현재 strict binary-face owner는 계속 fail-closed다. glyph 삭제/다른 폰트/플랫폼 제외0.
3. CSS-connected @font-face의 rule descriptor + face identity + 소유 source bytes를 함께 증명하는
   공급 경계는 **조사 후보**, 아직 선택/구현되지 않았다. detached canvas의 element CSS로 미지원
   Canvas 속성을 덮는 S30 실패안과는 구분하지만, S33 계약을 자동 충족한다고 주장하지 않는다.
   이 후보는 자기 rule/stylesheet 및 자기 blob URL 수명, src 변경/재연결·alias 중복 탐지,
   lease 중 retire/늦은 load, rule 제거 전 무효 통지와 실제 등록 해제를 새로 계약화해야 한다.
4. 다음 작업은 같은8문서에서 위 후보의 정확 내부 port/byte→face 결속/해제/허용35파일 대조와
   로컬 native 진단의 opsz9대40/weight400대700/readback/실제pixels/오염 반례를 먼저 작성·자체검토한다.
   기존 테스트 원본과 localhost opt-in 경계만 사용한다. 새 파일/다운로드/폰트변환/제품등록 권한 확대0.
   그 계약 검수 전 owner gate 완화·새 CSS/URL 공급 구현·실제 Composer 결속·commit/push0.
5. 후보가35파일/기존 테스트 권한 안에서 안전하게 성립하면 기술 보완을 루틴 진행한다.
   제품 정책/자산 변환/추가 공급/범위 밖 권한이 실제 필요할 때만 Founder에게 선택을 요청한다.

#### S37 종료 실측 / 인계

최종 targeted92/92(신규owner58+기존격리34), check3849/3849 PASS.
최종 native Chromium9/9(exit0),Firefox9/9(exit0),WebKit7PASS/2FAIL(exit1).
WebKit의 새owner gate1 + 옛literal gate1을 그대로 보존했다. native 검증 추가는1test/engine이며,
전체132 통과·production 지원·실제 Composer/text 출력 결속으로 확대하지 않는다.
최종 기존 회귀 명령 --composer-source-regression-only:138/138 PASS(exit0,1.1m).
S26의 기존6파일/보호PNG 생성11건 제외 유지; 기본 전체E2E는NOT RUN. 제외11을PASS로세지않는다.

보호23 SHA 불변,정확 task code/test16+문서8,추가범위0/staged0/git diff--check PASS.
고객JS346959bytes SHA6182B4B409ACFC8B44550467F6942ED625538BCFB59E3C37AE57A14CE93ACE3C,
adminJS294910bytes SHA2A25F27A178E6CC8877A46D515F2EB32DDED848F26DAA87B791139F7853AEF21,
고객CSS22675bytes SHA6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81로S36동일.
원본TTF3 size240164/285040/10414588,OFL2 size4482/4388 및 고정SHA는S12와동일.
이번자기staging11개(ZAHNu8/FyJEAe/GE4Eza/MhbTBJ/wskP7l/HhtkJH/JpOWWO/HJ7wtU/vWrsUR/JAE8Js/cEc4VP)
부재와4183/4184/4185 LISTENING0 확인. 타프로세스중지/임의폴더삭제0.
HEAD102860e/로컬origin추적0/0,새원격조회/fetch/stage/commit/push0.
Git globalignore 접근경고와LF→CRLF 경고는보존;설정변경0.
동일Codex자체검수다. 기술차단상태/다음S38계약검토를STATE/NEXT/CURRENT/review/handoff/결정/live에동기화했다.

### S-39. CSS-connected font 공급 후보의 선행 검토·진단 계약 — 2026-09-14

S38 다음 기술 검토다. 기존35파일 내 기술 보완이며 FP3/S28/FP4 범위·원본·운영 금지는 유지한다.
현재 binary owner 실패는 그대로 보존한다. 아래 진단 통과가 전체132 또는 제품 폰트 승인인 것은 아니다.

**검토 후보:** 원본을 SHA검증한 뒤 자기 Blob URL과 자기 @font-face rule을 생성하고,
rule의 native CSSStyleDeclaration/face identity/document membership/원본 URL을 함께 확인하는
registration capability를 owner에 결속한다. FontFace.variationSettings의 expando나 undefined 기본값 추정0.
CSS-connected face는 fonts.delete 대신 자기 rule 제거로 해제하며 URL은 자기 것만 회수한다.
Canvas의 element CSS로 미지원 Canvas 속성을 대신하지 않는다. private detached measure/render는 S33 유지.

예정 내부 경계는 register(alias,ownedBytes,descriptors)→{face,read(),release()}다.
read는 소유 stylesheet/rule 객체 identity·연결·disabled/media·정확 descriptor/src와 alias 유일성·
native face 관찰값을 검사해 stamp를 반환한다. 외부의 임의 boolean이나 caller rule을 채택하지 않는다.
CSS variation descriptor가 실제 native getter/setter에서 보존되고 효과가 비교되기 전 ready0.
load/측정/실행의 등록 차용은 S20과 동일하며 retire는 즉시 논리 무효화,
진행 중 load/차용 뒤에만 자기 rule/URL을 물리 해제한다. 부분 생성 throw도 자기 자원만 정리한다.
src 교체/rule 제거·재삽입/stylesheet 교체/동일 alias 추가는 old face를 복구하지 못한다.
기존 binary owner는 strict 관찰 경계를 유지한다. CSS 등록을 선택한 경우만 별도 증명을 사용한다.
실제 구현 전 진단 결과를 다시 자체검토하고 정확 타입/수용 기준을 기록한다.

**먼저 실행할 진단**: 기존 tests/composer-room-source/source.spec.ts 하나에 테스트1개 추가.
기존 승인 원본3 TTF는 동일 SHA 검사 및 localhost3 route로 읽고,자기 Blob URL만 생성한다.
blank page의 자기 style/rule로 native FontFace를 등록한다. 고객/App route 등록0.
DM normal/italic: opsz9/40×weight400/700=4상태씩, Noto normal:weight400/700=2상태.
각 상태 size12/32/48px에서 같은 문구 측정/paint(ImageData aggregate)와 descriptor readback을 기록한다.
- native rule variation readback과 정확 등록 face1개/load를 검사한다.
- opsz9↔40 및 weight400↔700의 폭·pixel 차이를 별도 기록한다.
  같은 픽셀이라고 즉시 축 지원을 단정하거나 width 차이만으로 모든 재현을 승인하지 않는다.
- CSS-connected face의 fonts.delete 반환 및 rule 제거 뒤 membership 제거를 확인한다.
- rule descriptor 변경/삭제·재삽입의 face/rule identity 변화도 진단한다.
- 원본 byte/alias/URL/픽셀원문은 출력0; 정적 조건과 boolean/수치만 보고한다.
- finally에서 자기 style 제거/자기 URL 회수/자기 Canvas 해제,외부 request0.
  URI 생성은 테스트 원본의 메모리 Blob만이며 신규 취득·전송·설치가 아니다.
기존9테스트 삭제/skip/기대값변경0. 명령은 기존 --composer-source-{chromium,firefox,webkit}-only.
source1개 변경과 같은8문서만 사용한다. shared executor/제품source/설정/보호변경0.

공식 재확인: CSS Font Loading3 §2.3/§4.2의CSS face/rule 연결 및 delete=false,
CSS Fonts4 §4.6의variation descriptor를 S38 링크에서 다시 읽었다(2026-09-14).
판정: 선행 진단 계약 자체검수 PASS(동일 Codex), CSS 공급 제품구현/진단 결과는 아직 NOT TESTED.
일반 기술 진행은 재승인 질문 없이 이어가되, native 차이를 숨기거나 새 권한이 필요하면 중지한다.

S39 진단 환경 보완: 최초 WebKit about:blank에서 randomUUID 부재,그 다음 자기 font Blob 로드의
NetworkError를 관찰했다. Node UUID 생성과 기존 localhost E2E fixture의 idle 문서로 한정해 재검증한다.
다른 네트워크/운영 허용이나 제품 mount 등록을 추가하지 않는다. 원인 전체를 확정한 것은 아니며
blank-page 실패 기록을 보존한다. localhost의 기존 정적 fixture 자원+승인3font route만 허용한다.

### S-39 결과 / 동일 Codex 자체검수 — 2026-09-14

CSS-connected 소유권 전제 자체는 진단에서 확인했으나 필수 축 증명은 WebKit에서 실패했다.
선행 계약/결과 검토는 동일 Codex이며 독립 검수나 전체132 통과가 아니다.

| 최종 설치 엔진 | dedicated 합계 | CSS 진단 | 축 효과 관찰 |
| --- | --- | --- | --- |
| Chromium149.0.7827.55 | 10 PASS / 0 FAIL | PASS | 21쌍 모두 픽셀 차이 양수,폭 차이 있음 |
| Firefox151.0 | 10 PASS / 0 FAIL | PASS | 21쌍 모두 픽셀 차이 양수; Noto3쌍은 폭 차이 없음 |
| WebKit26.5 | 7 PASS / 3 FAIL | FAIL | DM opsz 비교12쌍 모두 폭·픽셀 차이0;weight9쌍은 차이 있음 |

10상태 = DM2face×2opsz×2weight + Noto1face×2weight.
엔진당21비교 = 3face×3size의 weight9쌍 + DM2face×3size×2weight의 opsz12쌍.
크기는12/32/48이며 합성 문자열만 사용했다. 한 문자열/크기 집합의 실측을 모든 글리프에 일반화하지 않는다.
세 엔진 모두10face load, CSS-connected face의 delete=false,규칙 제거후 font set 부재,
동일문구 새 rule/새 face identity 및 최종 owned face0을 반환했다.
WebKit의10개 variation descriptor readback은 빈 문자열이다. CSS 지정값이 그대로 native face에
반영됐다고 주장할 수 없고 opsz 효과도 관찰하지 못했다. 정확히 어떤 기본 opsz로 렌더했는지는 UNCONFIRMED.
WebKit에서는 readback assertion에서 실패해 뒤의 route-count assertions까지 실행되지 않았다.
라우팅은 localhost fixture/승인3font 경로로 한정했지만 이를 별도의 외부 egress 전수 PASS로 쓰지 않는다.
CSS 공급 owner/실제 Composer/plan binding/print는 이번에 구현하지 않았다.

재현 명령: node scripts/e2e-run.mjs --composer-source-chromium-only,
--composer-source-firefox-only, --composer-source-webkit-only(각각 따로 실행).
처음 WebKit about:blank에서 UUID API 부재로 실패하고 Node UUID 공급으로 보완했다.
다음 about:blank의 FontFace.load NetworkError 후 기존 localhost idle fixture로 보완했다.
세 번째 WebKit 실행이 위 최종7/3이며 앞선 실패2회를 숨기지 않는다. 기존9검사 기대값 변경0.
S37 owner gate와 이전 literal gate는 계속 FAIL;새 진단1개가 추가되어 FAIL 합계3이다.
공통 node scripts/check.mjs exit0: format/lint380파일,7패키지typecheck,125unit파일3849/3849,2앱build.
이번 targeted-only unit/기존138회귀/기본전체E2E 재실행0; S37 targeted92/회귀138 PASS는 과거 결과다.

### FP-5 제안 — 로컬 static font 후보 검증 예외 (PENDING, 미승인)

기존 원본을 수정하지 않고 DM normal/italic의 opsz9·weight400/700 4개와 Noto weight400/700 2개의
full static 검증 사본을 만드는 후보다. browser의 variation descriptor 지원에 맡기는 부분을 줄이려는
가설이며 출력 정확도·기존 계약 동등성은 NOT TESTED. CSS 후보 실패만으로 다른 모든 기술 대안의 불가능을 증명하지 않는다.

[fontTools 공식 instancer 문서](https://fonttools.readthedocs.io/en/latest/varLib/instancer.html)
(제목 fontTools.varLib.instancer,확인2026-09-14)는 모든 축에 좌표를 지정하면 full static font를
생성할 수 있다고 설명한다. 이는 DENN 결과의 재현성·폰트 사용권·브라우저 PASS 근거가 아니다.
PATH Python과 bundled Python에 -B importlib.util.find_spec('fontTools')를 각각 실행했고 모두
NOT_INSTALLED다. 머신 전체 미설치라고 단정하지 않는다. 신규 취득/설치/변환은0이다.

다음 예외 제안은 fontTools를 로컬 검증 전용 격리 환경에 도입하고 사본6개를 생성·검증하는 범위다.
제품 package/lockfile 추가,글꼴 원본 덮어쓰기,제품 공급 교체,원격 전송/배포는 포함하지 않는다.
승인 전 설치/다운로드/변환/새 공급 구현0;승인 후에도 다음 정확 계약과 자체검수를 먼저 수행한다:
- 공식 공급처와 정확 버전·배포물 hash·필요 의존성·설치/입출력 경로·명령·허용 파일을 고정한다.
- 원본3개/OFL2개 SHA를 유지하고 사본별 입력축/도구버전/결과hash/cmap/name/가변축 제거를 기록한다.
- OFL 원문/저작권과 Reserved Font Name 취급을 확인한다. 현재 Noto OFL의 'Source' 예약명과
  modified-version 조건은 보존하며 이름 처리 및 재배포 가능 여부를 미검증 승인으로 확대하지 않는다.
- 신규 다운로드 대상은 검증 도구의 사전 고정 범위만;추가폰트 취득/실제사진/운영데이터0.
- 최소 사본 진단→3엔진 native 축/폭/픽셀·해제 대조→기존 gate와 계약 동등성 재검토 순으로 한다.
  이전 실패 삭제/skip/플랫폼 제외/오차 완화0. 정적화만으로 전체132 DONE 처리0.

현재 FOUNDER_DECISION_REQUIRED,next FOUNDER_FP5_LOCAL_STATIC_FONT_SCOPE.
FP3/S28/FP4는 승인 유지. FP5 예외 결정 전에는 기존 금지 경계를 넘지 않는다.

### S-40. FP-5 승인 / 고정 축 사본6개 로컬 진단 계약 — 2026-09-14

Founder '응 승인'으로 직전 FP5 최소 예외 승인. 사전 계약/동일 Codex 자체검수 후 실행한다.
이 절은 폰트 변환·신규 도구 금지의 정확한 로컬 예외이며 제품 공급 교체 계약이 아니다.

**도구/경로**: fontTools4.65.0 pure Python wheel만 사용,추가 의존성0.
공식 [PyPI 배포 metadata](https://pypi.org/pypi/fonttools/4.65.0/json) 확인2026-09-14.
fonttools-4.65.0-py3-none-any.whl,1196441bytes,
SHA2563060b8c1fc2329fa20265b7c138614143ea7c1624e26c5c180c76aeb74deae6f.
URL https://files.pythonhosted.org/packages/e6/35/f894ceb867118c0261d0f69a9bd516b045a3754238f76c88a49513ac7a83/fonttools-4.65.0-py3-none-any.whl
공식 metadata 조회는 기본 sandbox 소켓거부 후 승인된 권한검사로 성공했다. 제품 endpoint 요청0.
격리 root: C:/repo/denn-products/test-results/spec-132-font-static/fp5-20260914/
git-ignored 확인. 기존 원본 root/S12 hash는 유지한다.
허용 ignored 파일: requirements.txt, instantiate.py, manifest.json, packages/**(도구),
output/{dm-normal-400,dm-normal-700,dm-italic-400,dm-italic-700,noto-400,noto-700}.ttf,
output/DM-Sans-OFL.txt,output/Noto-Sans-KR-OFL.txt.
설치는 기존 Python3.14의 pip26.1.1, --isolated --no-deps --no-compile --no-cache-dir
--disable-pip-version-check --require-hashes --target <root>/packages -r <root>/requirements.txt.
requirements는 위 wheel URL+hash 한 줄;index 탐색/전역 install/PATH/registry 수정0.
디렉터리가 예상 밖 기존내용과 겹치면 덮지 않고 STOP. 환경변수로제품module검색경로변경0.

**변환**: 기존3TTF/2OFL SHA확인→full axis pin→사본만생성.
DMnormal/italic 각각 opsz9,wght400/700;Noto wght400/700. 다른 축이 발견되면 STOP.
instantiateVariableFont(inplace=False,optimize=True,overlap=KEEP_AND_SET_FLAGS,updateFontNames=False).
겹침 제거/추가 라이브러리/서브셋/WOFF변환0. 모든 glyph/cmap 보존,시간 재계산0.
검증용 고유 family 'DENN FP5 <id>'로 name1/2/3/4/6/16/17/21/22/25의 관련 식별자를 정리하고,
weight/style bits는400/700와normal/italic에맞춘다. 저작권/라이선스name0/13/14 원문과OFL사본유지.
NotoOFL의예약명Source를검증사본의primary family에사용하지않는다. 배포법률승인으로확대0.
각사본을같은원본에서두번독립생성해메모리byte일치를확인하고한개만저장한다.
fvar/gvar/avar/HVAR/VVAR/MVAR/cvar 부재,전체 cmap/glyph수 동일,정확weight/style/name/license,
해당synthetic문구cmap수록,결과byte SHA/size를manifest로고정한다. 이검사는shaping전수증명아님.

**native**: 기존 source.spec.ts에 별도진단1개만추가,이전10test변경/skip0.
Node에서고정manifest/6사본/원본SHA확인,허용localhost6static+3original route만사용한다.
3엔진에서6사본×3size(12/32/48)=18조건씩:
- 원본 reference에명시variation을적용;지원확인이되는엔진만동일폭/픽셀비교를기록.
- 사본은variation descriptor없이단일face/고유alias load;weight/style/readback,측정·paint·PNG decode단계,
  ownedface/Canvas/URL해제·routecount/rejected0을검증. raw bytes/pixels/alias/URL로그0.
- WebKit원본variation부재는'비교불가'로표시하고사본load PASS를동등성PASS로확대하지않는다.
- 비교결과가달라도오차를임의허용하지않고진단값을보존한다. 이전requiredgate실패는유지한다.
제품owner/Composer/102capture/print연결은0. 진단결과후동등성/검증대체조건을기술검토한다.
명령은기존3개 --composer-source-{chromium,firefox,webkit}-only,공통check,보호/hash/diff/port.
기존138회귀는제품코드미변경인이번진단에서재실행필수아님;실행여부구분.

tracked수정은기존source.spec.ts와동일8문서만. ignored도구/사본은Git전송대상아님.
판정: DOCUMENT_REVIEW_PASSED_SAME_CODEX / CODEX_WORKING. 설치/변환/native 결과는실행전NOT TESTED.

### S-40 결과 — FP5 로컬 진단 완료 / 2026-09-14

fontTools4.65.0 wheel1개 SHA검증 설치 PASS(--require-hashes,--no-deps).
격리도구를 sandbox에서읽지못해 최초 instantiate 실행은 ttLib import 단계실패(변환/출력0).
접근거부를읽기전용확인후권한검사를받아같은스크립트를실행했고,원본3/OFL2 SHA유지와
6사본×2독립생성=12변환 byte일치·cmap/glyph목록·license/name/style/table검증 PASS.
추가의존성/전역설치/제품package/lockfile변경0. 도구접근권한/ACL을임의변경하지않았다.
산출물은S40의ignored경로에보존,설치코드와검증사본은제품bundle/commit에포함하지않는다.

| 사본 | bytes | SHA-256 |
| --- | ---: | --- |
| dm-normal-400 | 56784 | d1976fdc92c6881f7a4ecb58e0a2c71be101a6b61e74843294c1608409956980 |
| dm-normal-700 | 56832 | 638ca386b4fe9e91129d6a8a035c716ef2bdb549d241be76c03eaef7c8318a11 |
| dm-italic-400 | 61256 | 480c13eff0447a0e87b0805adcfdc0c2e26aa8236779328879d7bef782c561d1 |
| dm-italic-700 | 61260 | 96d76c26f9a850848843494ba1b05c91bdb7d10d5cd8a00b3a863753d65c0740 |
| noto-400 | 6224840 | e5056d590ea3a6b64a6dc6fea10f49df784e5ca0b602a994c001e8eba64b2cda |
| noto-700 | 6222696 | 213ae39172bfd470d87024791a8e09e052df6fea85ff35f6e9e013fb876c09ce |

manifest SHA C9348AB342D60BAA08A7979536D119DAFA97FEC8E9B8FEDB2482782AAB029802,
instantiate.py SHA4FD1F43F4D011F27364FACE80B4E933BB81A5DB223C4FE6E534C127DC9CD76C4.
DM각glyph486/cmap403,Noto각glyph24964/cmap23174는원본과동일목록이다.
glyph개수·cmap동일은outline동일·shaping전수PASS가아니다. style/weight/name정적화의기술검증이다.

최종 명령은 node scripts/e2e-run.mjs --composer-source-<engine>-only(각각실행):
| 설치 엔진 | 기존+새진단 합계 | 새 static 진단 | 원본 대비18조건 |
| --- | --- | --- | --- |
| Chromium149.0.7827.55 | 11/11 PASS exit0 | 18/18 반복폭/픽셀/PNG PASS | 9정확동일,9픽셀차이;그중3폭차이 |
| Firefox151.0 | 11/11 PASS exit0 | 18/18 반복폭/픽셀/PNG PASS | 9정확동일,9픽셀차이;폭차이0 |
| WebKit26.5 | 8PASS/3FAIL exit1 | 18/18 반복폭/픽셀/PNG PASS | 18모두비교불가(null),동일성PASS0 |

새진단54조건=6사본×3크기×3엔진. 원본과비교36조건=18×2엔진 중18동일/18픽셀차이.
같은사본의반복실행동일성과원본대비동일성을구분했다. WebKit null을0오차로집계하지않는다.
세엔진각각승인localhost사본6+원본3=9요청정확1회,외부route거부카운트0,error/warning이벤트0,
자기face잔류0/자기BlobURL잔류0,6face-pair해제PASS. 이것은해당진단의라우팅관찰범위다.
DMnormal700의Chromium폭최대차이0.001708984375px(48px에서);픽셀sample차이최대133/Firefox82.
DMnormal400/DMitalic400/700는각3크기정확동일,DMnormal700/Noto400/700는각3크기픽셀차이.
픽셀차이는640×100 RGBA 배열의서로다른채널sample수이며오차허용치가아니다.
고객모든문구·줄바꿈·클리핑에대한영향상한은NOT VERIFIED. 작은실측을무시가능으로승격0.

Firefox첫실행은11건모두browserContext.newPage의_page TypeError로본문시작전실패했다.
기존판정은보존하고권한검사후같은명령재실행11PASS. 정확내부원인전체는UNCONFIRMED;
제한환경실패를폰트결함이나무조건flaky통과로바꾸지않는다.
WebKit최초8/3후집계출력보존을위한동일재실행도8/3. 기존CSS축/owner/literal3FAIL그대로.
사본native통과로제품owner게이트를완화하거나기존10test를수정하지않았다.

공통 node scripts/check.mjs exit0:format/lint380,7typecheck,125unit파일3849/3849,2build.
S37 targeted92/기존회귀138은이번재실행0. 기본전체E2E NOT RUN. 제품코드추가수정0.
이번source.spec.ts1개+동일8문서,누적code/test16+docs8 unstaged;protected23 SHA불변,
추가경로0/staged0/diff--check PASS. HEAD102860e/로컬origin추적0/0,새fetch/commit/push0.
고객JS/adminJS/CSS size346959/294910/22675와S39의SHA3개동일;원본TTF3/OFL2 SHA동일.
자기staging95xfhV/BgSgm7/W4gwod/xad4nn/J3KOPZ부재,4183/4184/4185 LISTENING0.
기존NO_COLOR/FORCE_COLOR/build큰chunk경고와Gitglobalignore/EOL경고보존,설정변경0.

### S-41. 정적화 동등성 기술 검토 / FP-6 선택 필요 (미승인)

S40후읽기전용으로고정fontTools4.65.0의코드와원본/사본의합성문구glyph를대조했다.
근거: 격리 packages/fontTools/ttLib/tables/_g_l_y_f.py:_setCoordinates의otRound,
같은파일1306의좌표toInt,2053의toInt 정의;varLib/instancer/__init__.py:1134이후metrics설명.
glyphSet(location=고정축)과static glyphSet을DecomposingRecordingPen으로펼쳐같은명령/좌표순서를비교했다.
새변환/출력생성0. 아래숫자는1000unitsPerEm 폰트의font-unit값이며CSS px값이아니다.

| 사본 | 조사한고유glyph | 소수좌표/변경좌표 | 최대좌표차이 | 최대advance차이 |
| --- | ---: | ---: | ---: | ---: |
| dm-normal-400 | 10 | 0/0 | 0 | 0 |
| dm-normal-700 | 10 | 225/225 | 0.484375 | 0.480712890625 |
| dm-italic-400 | 10 | 0/0 | 0 | 0 |
| dm-italic-700 | 10 | 229/229 | 0.484375 | 0.480712890625 |
| noto-400 | 6 | 312/312 | 0.499267578125 | 0.4898681640625 |
| noto-700 | 6 | 312/312 | 0.499267578125 | 0.020263671875 |

전체표의분해outline명령순서와좌표개수는동일했다. fontTools보간과정적사본의정수좌표차이를확인했고,
native픽셀차이가단순alias문자열만의차이라고볼수없다. 모든엔진내부shaping원인을완전히증명한것은아니다.
DMitalic700은outline값차이가있어도현재native샘플픽셀은동일했다. 따라서숫자반올림분석만으로
각픽셀차이의일대일원인/전체문구영향/정적화개선가능성없음을단정하지않는다.

S19는원래family와'승인된동일원본byte'의alias projection을전제로한다.
사본6개는다른byte이고일부측정/픽셀도다르므로,기존관리형공급에조용히넣으면그전제가바뀐다.
FP5는진단승인일뿐이며이채택을포함하지않는다. owner requiredKeys의variationSettings를지우는
단순패치나크기오차허용은하지않는다. WebKit의원본profile증명부재도별개로남는다.

**FP-6 미승인 제안**: 사본6개를향후로컬리빌드검증의별도고정폰트정본으로채택하는계약작성을허용할지.
선택한다면원본과의pixel-identical주장을하지않고,고정SHA에따른명시적fontrevision으로구분한다.
- local opt-in owner에정적증명(축없음+정확hash/size/weight/style/license)을별도분기로검토한다.
  원본variable분기의엄격검사는유지한다. 제공byte와증명이안맞으면네트워크/등록전거부한다.
- 사본정본의동일plan/동일엔진measure→preview→102capture→print간0허용오차검증은유지한다.
  문자열경계·굵기·줄바꿈·자간·한글을추가검증하고전체문구지원으로확대하지않는다.
- 기존catalog/legacy/Space V1/V2/발행당시시안은재기록/조용한폰트치환0.
  기본제품폰트공급/실제UI/운영적용/배포/신규폰트취득은계속제외한다.
- 정확대체gate와owner증명계약이검수되고native통합이통과하기전까지기존WebKit3FAIL보존.
- 새정본을선택하지않으면기존원본유지/132미완료로남기며다른정밀도보존후보는별도계약에서검토한다.

이절은후보검토이며채택/추가제품코드구현승인아님.
현재 FOUNDER_DECISION_REQUIRED,next FOUNDER_FP6_LOCAL_STATIC_CANONICAL_CONTRACT.
FP5_LOCAL_DIAGNOSTIC_COMPLETED,131 DONE/132부분구현 유지. FP3/FP4/FP5 재승인질문0.

### S-42. FP-6 승인 / 로컬 고정 폰트 정본 계약 — 2026-09-14

**권한**: 사용자 '응 다음 승인'은 직전 FP-6 질문(사본6개를 향후 로컬 리빌드의 별도 폰트 기준으로
삼는 계약 작성)을 승인한다. 이 절은 그 계약이며 이번 턴은 문서8개만 변경한다.
새 owner 코드/시험 실행/제품 적용을 이번 승인에 덧붙이지 않는다. FP5 설치/진단은 완료 이력이다.
기존131 DONE,132 PARTIALLY_IMPLEMENTED. 계약 검수와 native 구현 PASS는 별개다.

#### A. 기준의 의미와 원본 보존

기존 S19의 '동일 원본 byte의 alias' 전제는 **variable 공급에는 계속 적용**한다.
별도 static 공급만 이 절의 정확 사본 byte를 정본으로 삼는다. 원본과 동일한 파일 또는
pixel-identical 대체품이라고 부르지 않는다. S40의18/36 픽셀차이,WebKit18 비교불가는 그대로다.
원본/canonical catalog/legacy/Space V1/V2/발행당시시안의 fontFamily를 자동 치환하지 않는다.
첫 범위는 명시적 E2E 주입뿐; 제품 App/기본 entry/운영 singleton/global font registry는 연결0.

정본 revision은 아래6개 고정 문자열이다. 뒤의 id를 S40 표의 정확 SHA/bytes/style/weight/lang에 대응시킨다.
manifest SHA C9348AB342D60BAA08A7979536D119DAFA97FEC8E9B8FEDB2482782AAB029802와S40 생성 script/
wheel SHA·고지 이력을 증거로 사용한다. runtime에서 manifest 파일을 fetch/신뢰하여 allowlist를 확장하지 않는다.

| revision | 사본 id | weight/style | 언어 |
| --- | --- | --- | --- |
| fp5-static-v1/dm-normal-400 | dm-normal-400 | 400/normal | en |
| fp5-static-v1/dm-normal-700 | dm-normal-700 | 700/normal | en |
| fp5-static-v1/dm-italic-400 | dm-italic-400 | 400/italic | en |
| fp5-static-v1/dm-italic-700 | dm-italic-700 | 700/italic | en |
| fp5-static-v1/noto-400 | noto-400 | 400/normal | ko |
| fp5-static-v1/noto-700 | noto-700 | 700/normal | ko |

같은revision의byte/hash/name/style/축/생성옵션을교체하지않는다. 바뀌면새revision계약필요.
원본 glyph/cmap목록 보존은 전수shaping증명이아니며 기존 파일은 그대로 유지한다.
정적화 도구는runtime/제품의존성이아니다. 사본6개·OFL2는S40 ignored경로에만보존한다.

#### B. 공급 표면과 신뢰 경계

첫 구현 후보는 기존 composer-font-proof.ts 안의 별도 createManagedStaticFontOwner다.
기존 createManagedFontOwner/ManagedFontSupply 호출자의 의미·variable 필수검사는 유지한다.
새 입력은 { revision, bytes }만 받는다. URL/local()/arbitrary hash/descriptors/family/weight/
verifiedTexts/noAxes:boolean 같은 caller 주장은 정본 선택·증명 입력으로 받지 않는다.
추가 키/미등록 revision/타입·정확 길이 불일치/읽기 예외는 factory에서 null,환경 port호출0.
정본의 immutable 내부6항목 표에서 family='DENN FP5 <id>',weight/style/lang/byteLength/hash와
제한된 진단 문자열 집합을 취한다. 내부표 자체는byte가아니며6폰트binary를코드에import하지않는다.

factory는 받은 ArrayBuffer를 고유 snapshot으로 보관한다. load 호출 전에는digest/UUID/face/
등록/Canvas0. load는 snapshot의SHA를 신뢰된digest port로 확인한 후에만 UUID/face를 만든다.
hash 불일치/다른 사본/원본을 넣은 경우UUID/FontFace/등록/Canvas0,load=false.
digest/FontFace 생성은기존신뢰facade경계이며fake digest PASS는실제해시증명이아니다.
cmap/축파싱을브라우저제품runtime에새로구현하지않는다. 검증된allowlist SHA와bytes 결속으로
S40의no-variable-table 증거를 재사용한다. 임의파일에대한'정적폰트다'판정은지원하지않는다.

새 owner는기존ManagedFontOwner동작+readonly revision을노출하는내부타입으로설계한다.
lease의identity는매owner마다고유해야하며같은revision의owner를재생성해도이전identity/alias를재사용0.
revision은폰트byte기준,identity는현재등록세대다. 어느하나로다른하나를대체하지않는다.
반환owner/표/문자집합은caller변경으로증명을넓힐수없어야한다. native face/raw byte는노출0.
문자범위는진단용한정이며caller가임의문자열을'검증됨'으로추가할수없다.

#### C. descriptor 검사 분리 (검사 삭제가 아니라 증거 분리)

| 항목 | 원본 variable owner | 새 static owner |
| --- | --- | --- |
| byte identity | 기존 SHA 검사 | 내부6항목의정확 SHA+길이 필수 |
| variationSettings | 기존필수native일치,부재면거부 | 고정byte의축부재증거;native지원시 normal 검사,미지원은undefined/부재만 |
| style/weight/stretch | 기존그대로 | 정본normal/italic·400/700·normal과native일치 필수 |
| unicodeRange | 기존strict 유지 | 전범위 U+0-10FFFF 또는 관찰된 U+0-10ffff만;그밖의범위/부재는거부 |
| featureSettings | 기존그대로 | 생성값 '"kern"',native '"kern"' 또는 '"kern" 1'만허용 |
| identity/membership | 기존그대로 | 단일자기face,loaded,중복alias/교체/삭제/변경이면retire |
| optional native fields | 기존snapshot 유지 | 새face의default요청/지원readback과원본stamp를보존,후속drift거부 |

새factory는static face 생성에서 축좌표를 전달하지 않는다. 지원환경의 variation normal과
부재환경을구분한다. 빈문자열/타입오류/숫자축문자열/throw는자동정상으로취급하지않는다.
native미지원속성에expando를만들거나커스텀값으로지원여부를위조하지않는다.
두 unicode 표기는S37 실측의동일전범위만해석하는국소예외다. 생성후실제raw stamp는그대로비교하여
의미상같다는이유로실행중descriptor 변경을놓치지않는다. generalCSS parser/범위확대0.
optional display/sizeAdjust/ascent/descent/lineGap등이native로존재하면default요청값과일치해야한다.
없는optional속성을지원확인으로기록하지않고fresh trusted constructor/고정byte/동일엔진진단범위로남긴다.
이검사들은browser전체의event간삭제→복원이나임의악성facade를완벽히탐지하는보안경계가아니다.

#### D. 수명·측정·실행

S20/S33/S35/S37의단발load,ready부활금지,retire→통지→마지막차용후자원해제,
재진입/throw/late-success/oldcleanup/중복release검사를static에도그대로적용한다.
부재glyph/미지원style/미등록revision이면임의대체font·기본값·자동retry0.
measure/prepare 전후에같은owner·lang·같은document·private detached target·descriptor stamp를확인한다.
nativeprofile속성부재를expando로보충하지않는다. 추가profile지원판정은FP4의격리계약을따른다.

진단본문은en='AV To ffi DENN',ko='한글 가나다'로고정하고,이본문의유한한연속code-point
부분문자열(공백/빈문자열포함)만첫내부진단집합으로선언한다. 이선언은범용shaping인증이아니다.
실제계약검증에서는본문/fragment/한글완성형/공백/빈문자열을각각measure/paint대조하며,
본문외emoji/분해자모/결합부호/ZWJ/unknown/unsupporteditalic을거부하는행렬을둔다.
정규화/문자삭제/임의범위자동확장0. 일반고객문구지원은별도제품공급계약과native증거가필요하다.

고정byte기준이달라질수있는원본비교와,같은고정byte/동일엔진/동일plan내의측정·그리기일치를분리한다.
후자의허용오차는0이며원본과의차이를이유로후자의오차를넓히지않는다.
preview/capture/print간비교는동일출력배율·동일PNG decode단계끼리한다(S35).
줄바꿈경계/자간/클리핑은실제builder/executor통합단계에서별도로검증한다.
현재54진단만으로실제Composer/102capture/print통합PASS를선언하지않는다.

#### E. 다음 첫 구현 후보 범위 (이번 턴 미실행)

| 파일 | 예정 변경 |
| --- | --- |
| apps/mockup/src/preview/composer-font-proof.ts | static factory/내부6항목표·mode분리·기존수명재사용 |
| apps/mockup/src/preview/composer-font-proof.test.ts | static입력/hash/mode/descriptor/수명 회귀;기존variable58개유지 |
| apps/mockup/src/e2e/composer-room-source-fixture.tsx | E2E의명시적버튼에서만static owner 주입·차용·해제 진단 |
| tests/composer-room-source/source.spec.ts | pinned6사본허용route/nativeowner검사 추가,이전11test유지 |

4개모두기존S24/S37 허용파일이다. 새root export/API/package/config/runner/락파일/제품UI수정0.
test-only버튼은이미분리된fixture의검증제어이고제품UI연결이아니다. mount만으로font load/등록0.
Node에서S40manifest/사본/OFL의고정hash확인,localhost기존fixture+정확6static routes만허용.
사본부재/hash변경시STOP;기존FP5승인을재다운로드·재변환·영구배포에확대하지않는다.
실제PreviewComposer/plan binding/102capture/print연결은이4파일첫단위에포함하지않는다.
그다음통합은기존35파일계약과새정본revision결속을대조한후진행하며,이번계약완료를그통합승인으로쓰지않는다.

예정 검증:
- targeted: pnpm exec vitest run apps/mockup/src/preview/composer-font-proof.test.ts apps/mockup/src/canvas/font-bound-execution.test.ts
- node scripts/check.mjs
- node scripts/e2e-run.mjs --composer-source-chromium-only (firefox/webkit도각각)
- node scripts/e2e-run.mjs --composer-source-regression-only (기존6파일/보호PNG생성군제외유지)
- git diff --check,보호23/원본5/고정사본6/manifest/code범위·번들hash·자기port/temp확인

unit은위조static표시/다른revision·길이/해시·snapshot변경·load중폐기·native예외·차용유지·
동일revision새owner ABA·descriptor drift·미지원문자·variable부재속성거부회귀를고정한다.
native는6사본×3size=18조건/엔진에서실제owner load/차용measure와독립된같은사본FontFace의
폭·동일단계pixel/PNG를비교한다. baseline도별도alias/같은descriptor/lang/profile을사용한다.
float허용오차0,폰트byte기준은동일하다. 부정시험은wrongbyte1개·style/descriptor변경·retire·lateload/
임의context·미지원문자·중복alias·재등록을포함하며정확test개수는구현후수집한다.

#### F. 기존3FAIL과 완료 기준

| 기존 WebKit 실패 | 현재 유지 이유 | 향후 대체 검토에 필요한 증거 |
| --- | --- | --- |
| CSS axis diagnostic | 원본variation descriptor미지원실측 | static전용정본에서는필수공급이아니나이력보존;분류변경은통합검수후 |
| actual variable owner | 원본variable strict분기의정상적인fail-closed | staticowner3엔진수명/측정/출력PASS와variable엄격부정시험을분리 |
| literal Canvas profile | native속성부재실측 | FP4격리target+실제staticfont+Composer/capture/print통합동등성 |

이번문서작업에서는3FAIL의assert/skip/expectedFailure/selector를변경하지않는다.
첫staticowner gate가PASS해도전체dedicated suite는기존3FAIL을포함할수있고이를green이라고부르지않는다.
최종132완료전기존gate의증명대체표·실제통합·기존회귀검수를따로기록해야한다.
엔진제외/무조건skip/사후tolerance/불명결과성공취급/증거없는canonical채택확대0.

#### G. 계약 자체검수 / 다음 상태

동일Codex가S19~S26/S33~S41 및현재owner/fixture/test와대조했다.
FP6승인대상과미승인제품적용분리,정확6hash/증거출처,variable검사보존,static no-axes신뢰근거,
문자집합한계/owner세대/기존3FAIL/후속4파일범위를명시했다. DOCUMENT_REVIEW_PASSED_SAME_CODEX.
새코드·native시험은NOT IMPLEMENTED/NOT TESTED. 같은Codex의자체검수이며독립재검수아니다.
이번실행은문서diff/hash/Git읽기전용검사만이다. check3849/Chromium11/Firefox11/WebKit8+3은S40과거결과.
상태 READY_FOR_CODEX,next SPEC132_STATIC_OWNER_IMPLEMENTATION_SCOPE_REVIEW,Founder제품방향pending NONE.
다음작업은이4파일첫구현단위의최종범위검토다. 계약작성승인만으로이번턴에서제품코드구현은시작하지않는다.

### S-43. S42 첫4파일 구현 착수 검토 — 2026-09-14

사용자 '응 검토하고 다음 루틴대로 쭉 진행해'에 따라S42 E의4파일 구현·검증을이번단위로진행한다.
같은Codex가표면/기존58fake/fixture/11native시험과대조해IMPLEMENTATION_SCOPE_REVIEW_PASSED.
S42정본6hash·제한문자집합·mode분리·기존variable검사보존을그대로구현한다.
공유수명helper만private로분리하고기존publicfactory의동작은보존한다. static은{revision,bytes}외입력거부.
사전보호23/누적16+8범위/HEAD102860e·로컬origin0/0 확인. 변경4+동일8문서;추가파일0.
static native fixture는idle mount에서I/O0,명시적검증버튼후에만정확6사본을주입한다.
새owner gate에서독립staticreference와18조건/엔진,fragment와부정시나리오를검증한다.
기존11native/variable58 삭제·기대완화0. oldWebKit3FAIL은기록하고3엔진결과와분리한다.
계약에없던제품/운영공급·Composer/print연결/설치/변환/원본·보호변경/자동화0.
새중요결정이없는기술보완은현재범위에서진행한다. 전체132완료·전송조건은아직충족하지않는다.

#### S43 검증 결과 — 2026-09-14 (동일 Codex 자체검수)

실제 변경은 S42의4파일이다. static factory는 내부6 revision/길이/SHA에만 결속하고
입력 snapshot→단발 SHA 검사→UUID/FontFace 생성 순서를 지킨다. 임의 descriptor/noAxes 입력,
다른 hash,미지원 문자/style은 실패 처리한다. variable public factory의 필수 축 검사와58개 시험은 유지했다.
공유 private 수명 helper는 static/variable 초기 descriptor 검사만 분기한다.
추가 static fake38 + 기존 variable58 + 격리 primitive34 = 표적130/130 PASS.
공통 unit3849+38=3887/3887,125파일;format/lint380·7typecheck·2build PASS.

첫 Chromium 실행은 readback 성능 warning18건 때문에 새 시험1FAIL/기존11PASS였다.
경고를 제외하지 않고 안전 분류자로 Canvas2D repeated getImageData 경고임을 확인했다.
검증용 비교 Canvas 두 개와 PNG decode Canvas를 같은 명시 willReadFrequently:true로 만들고
error/warning0 조건을 그대로 유지했다. 이는 검증 대상 backing 설정이며 제품 Canvas 옵션 변경이 아니다.
S44의 공유 격리 렌더러/독립 기준은 기존 기본 생성 옵션을 그대로 사용한다.
TS7023 합성 toString 반환형 및 getContext 옵션 변수 사용 시 RenderingContext 추론 오류를 보완했다.
중간 format 실패도 수정 후 공통 게이트 전체를 다시 실행했다.
pnpm exec vitest의 로컬 launcher 실패와 추측한 tsgo/prettier 경로 MODULE_NOT_FOUND는 도구 실행 실패다.
설치하지 않고 실제 저장소 entry/biome/check를 사용했다. 이 실패들을 테스트 PASS로 계산하지 않는다.

고객 CSS가22713bytes로 늘어난 원인은 fixture의 boolean !italic이 Tailwind의 important italic
클래스로 스캔된 것이다. 해당38bytes를 메모리에서 제외한 SHA가 기존CSS SHA와 정확히 같음을 확인했다.
동치 boolean 비교로 고쳐22675bytes 및 원래 고객JS/hash를 복원했다. CSS/config 수정0.
검증된 raw static/font lease 검사에는 변경하지 않았다.

S43 최종 native: Chromium149.0.7827.55 12/12,Firefox151.0 12/12,
WebKit26.5 9PASS/3FAIL. 새 owner 시험은3엔진 모두PASS;기존3FAIL은 원본 CSS축/variable owner/
literal native Canvas profile이다. expect/skip/선택자를 완화하지 않았다.
body6×3size×3엔진=54조건,fragment(4×6+2×5)×3엔진=102조건의 폭·픽셀·같은단계 PNG 비교PASS.
이는 공통 본문 전체Unicode/원본동일/실제Composer 통합 증명이 아니다.
각 엔진6경로 각1회,거부요청0,새시험pageerror/error/warning0,자기font/DOMCanvas/URL잔류0.
기존6파일 opt-in 회귀138/138도PASS. 기본전체E2E/보호PNG생성군은 실행하지 않았다.

### S-44. 다음 루틴: 고정 owner와 공유 builder/executor 결합 검증 계약 — 2026-09-14

S43 첫 owner 검증은 통과했지만, fixture가 직접 fillText한 결과만으로 S20의 plan 결속을 증명하지 않는다.
현재 코드를 대조했다: PreviewComposer의 probe/final/commitText는 buildFrameProductPlan을 사용하고,
공유 buildPreviewRenderPlan은 측정 port로 최종 lines/width를 만든다. font-bound-execution은 이미
isCurrent/prepare/execute를 주입받지만 실제 owner와 공유 text plan의 결합은 아직 시험하지 않았다.
따라서 다음 기술 단계는 같은 승인35파일 중 fixture/source.spec.ts 2개만의 결합 시험이다.
같은 Codex 범위 검토 PASS. 새 Founder 제품 방향/권한 요청 없음; FP3/FP4/FP6의 로컬 한정 유지.

- 기존 static 명시 버튼의 진단에 공유 builder→공유 executor→격리 frame을 연결한다.
- 6사본 각각 동일 owner lease와 alias로 최종 text plan을 만들고 변경 없이 재사용한다.
- 독립 기준은 같은 고정 byte의 별도 FontFace/측정 context로 따로 만든 기준 plan이다.
  기준 plan은 비교 전용이며 실제 출력 plan을 복제/치환하는 구현으로 사용하지 않는다.
- 합성 frame320×240, 고정 본문, 글자크기32px, box64px에서
  (left,spacing0),(center,spacing+1px),(right,spacing-1px) 3조건을 검사한다.
  같은 줄 텍스트/width, 코드포인트별 측정과 공유 자간 배치, 실제 wrapping을 대조한다.
- 각 plan을 배율1/1.25/2에서 격리 render/present/encode한다.
  6×3×3=54조건/엔진. 같은 단계 ImageData와 PNG decode끼리 허용오차0,
  본문 밖 glyph·일반 문구·다른 엔진 간 pixel 동일성 주장은 하지 않는다.
- fresh detached context와 lang/현재성, 동일 plan 객체·imageBindings 전달, 자기 frame/display/bitmap
  해제를 확인한다. 결과는 id/boolean/조건 개수만, raw plan/alias/문구/bytes/URL 출력0.
- 이전 owner 부정/수명 검증과 기존11 native test/3 WebKit FAIL은 그대로 보존한다.
- 이 시험은 아직 실제 PreviewComposer,131 source/102 capture,exportFramePng UI 통합이 아니다.
  관리형 세션의 render/commit 차용,plan identity+binding,일반 편집 중 async print 수명은 후속 구현 대상이다.
- 제품 font 공급/UI/CSS/기존 공개 API/config/Rules/원본/보호 변경0. native3/회귀138/공통check와
  scope/hash 확인을 실행한다. 이 기술 시험 PASS만으로 기존3FAIL 분류 변경/132 DONE/전송은 하지 않는다.

#### S44 구현·검증 결과 — 2026-09-14

추가 구현은 위2개 fixture/test뿐이다. 새 static 시험 안에서 공유 builder의 실제 줄바꿈과 자간
측정을 쓰고, 동일 완성 plan을 renderIsolatedPlanFrame→공유 executor→present/encode에 전달했다.
독립 정본 face의 별도 측정/plan/그리기와 비교했다. 기본 고객 App/Composer/print 제품 파일 변경0.
각6revision×(left0,center+1,right-1)×(scale1,1.25,2)=54조건/엔진,
3엔진 합162조건의 lines/width,raw pixel,PNG decode,동일plan·bindings,현재성 모두PASS.
각 plan이 실제2줄 이상을 만들었음도 검사했다. 반복 실행 횟수로 조건 수를 부풀리지 않는다.
shared-plan 시험은 기존 static native test1개에 포함되므로 test수는 여전히12개/엔진이다.

최종 실행:
- node node_modules/vitest/vitest.mjs run (S42의정확2파일):130/130 PASS.
- node scripts/check.mjs:format/lint380,7typecheck,125unit파일3887/3887,2build PASS.
- node scripts/e2e-run.mjs --composer-source-chromium-only:12/12 PASS.
- 동일 --composer-source-firefox-only:12/12 PASS(기존 페이지 생성 환경 제한에 대한 실행권한 검사 후).
- 동일 --composer-source-webkit-only:9PASS/3FAIL(exit1),새 static/shared-plan 결합 시험PASS.
- 동일 --composer-source-regression-only:138/138 PASS(S44 최종파일 재실행).
- 이번 실패3개 외 새 실패0. 별도116의WebKit PNG14 이슈까지 해결했다는 뜻이 아니다.

같은 Codex 자체검수 LOCAL_STATIC_OWNER_AND_SHARED_PLAN_PASSED;독립 검수/전체132 CODEX_PASSED 아님.
첫4파일 외 기존task12+보호plan1의SHA는 S42 시점과 같다. 총task code/test16+docs8 unstaged 유지.
stage/commit/push/원격조회0. 기존 필수 실패의 대체 검수와 실제 호출부 통합 전 전송은 계속 보류한다.
사본6/OFL2/manifest,원본3/OFL2는 고정hash 검사PASS. 새설치/다운로드/변환/운영/자동화0.
고객JS346959bytes SHA6182B4B409ACFC8B44550467F6942ED625538BCFB59E3C37AE57A14CE93ACE3C,
고객CSS22675bytes SHA6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
adminJS294910bytes SHA2A25F27A178E6CC8877A46D515F2EB32DDED848F26DAA87B791139F7853AEF21 유지.

#### S44 마지막 snapshot 자체검수 보완 / 최종 게이트

첫 구현의 ArrayBuffer.prototype.slice.call도 caller의 constructor/종별 생성 훅을 조회한다.
이 경계는 입력의 자체 slice 메서드만 우회하는 것으로 충분하지 않다.
합성 constructor getter를 둔 새 회귀에서 수정 전1FAIL/97PASS(98시험)를 재현했다.
공유·분리된 buffer 거부 시험도 추가했다. static factory는 new ArrayBuffer(정본길이)를 직접 만들고
Uint8Array view를 통해 내부buffer에 복사하도록 보완했다. caller constructor/slice를 호출하지 않는다.
variable API/기존58시험은 변경하지 않았다. 부모가 원본byte를 바꿔도 내부 SHA/face byte는 불변이다.
이 검증은 전역 intrinsic 자체가 악성 스크립트에 교체된 환경까지 보장한다는 의미가 아니다.

같은 허용 owner.ts/test 2파일만 보완했다. 합성 변수 constructor 명칭의 lint 실패는
readConstructor로 정정했다. 최종표적132/132=58+40+34,
check3889/3889=3849+40(format/lint380·7typecheck·125unit파일·2build) PASS.
보완 후 native3를 모두 재실행:Chromium12/12,Firefox12/12,WebKit9PASS/기존3FAIL.
고정owner/fragment/shared-plan 조건은모두PASS(각54/102/162조건),추가실패0.
기존6파일회귀138/138도보완후재실행PASS. 위130/3887은이2시험추가전실행값이다.
번들/보호/범위/포트·staging 검사를다시하고 동일8문서의최신값은132/3889로맞춘다.

### S-45. 후속 실제 호출부 대조 / 다음 루틴 지시 — 2026-09-14

이번 read-only 대조의 근거:
- PreviewComposer.tsx의 built/probe/commitText는 별도 빌드 호출이다. 최종 plan만 source로 보내야 한다.
- usePreviewCanvasSurface.ts는 현재 passive effect로 plan/bindings를 넘긴다. 아직font binding이 없다.
- exportFramePng.ts는 click plan을 그대로 쓰지만 관리형font 차용·encode후 현재성 검사는 아직 없다.
- createIsolatedDisplayTarget은 새 detached Canvas만 받는다. 이미DOM에 붙은 React canvas를
  constructor에 넘기거나 이 guard를 삭제하여 연결 완료로 처리할 수 없다.
- 102 frame-snapshot.ts는 createSurface의 context/copyTo/release capability를 소유한다.
  임의 native canvas/toBlob API라고 가정하지 않고 기존102 port의 의미를 유지해야 한다.

다음은 SPEC132_PLAN_BOUND_LIFETIME_CONTRACT_REVIEW다. Founder 결정 대기가 아니다.
기존 S19/S20/S24/S33/S35/S42의 승인35파일 안에서 아래 연결 계약을 먼저 완성하고 같은 Codex가 검토한다:
1. ready owner의 제한된 요청과 runtime alias/원래family·style·weight·revision을 측정 세션으로 결속한다.
   render 도중 acquire한 차용이 중단 render에서 누수되지 않도록 세션 생성·해제와순수측정을 분리한다.
   trial/probe/final이 동일 측정 세션을 사용하고,최종 plan 객체·font binding·image bindings를 함께 commit한다.
2. 별도 font-bound execution binding은 foreign plan/다른 font identity/누락된 binding을 거부한다.
   같은 plan 안의 모든 draw-text 요청과 alias를 검사하고 일반 정본으로 조용히fallback하지 않는다.
   readonly TS 타입만으로 runtime plan 불변이라고 가정하지 않는다. caller plan을 재작성/치환하지 않는다.
3. preview는 새 managed display 생성→commit 후 attach→snapshot에 맞는draw→해제 순서를 명시한다.
   기존 무주입 UI 분기는 추가Canvas/font I/O0과 기존접근성/레이아웃 계약을 유지한다.
4. capture는 실제102의 context/copyTo/release를 감싸고,print는 private frame encode와같은 font 차용을
   callback settlement까지 유지한다. 일반 문구 편집만으로 이전click을 취소하지 않으며 retire/unmount/
   오염/URL생성중재진입은성공인계0. 기존공개102/129/131/shared executor/보호index 변경0.
5. 정확수정파일/단위·합성부정행렬·3엔진실제Composer검증을 고정한 뒤 범위내 구현을 진행한다.
   첫후속검토의읽기대상은composer-font-proof/font-bound-execution/PreviewComposer/surface/hook/
   exportFramePng와각시험이다. 이S45는아직완성된binding API 또는그구현PASS를선언하지않는다.

일반 기술 보완은 재승인 질문 없이 이어간다. 제품지원 확대,승인35파일·계약 밖 API/자산권한/실기기·운영이 필요하면
그때만 정확 근거와 질문을 남긴다. 기존3FAIL은 통합·증명대체 검수 전 그대로 보존한다.
131 DONE/132부분구현 유지. 고정폰트 준비→공유plan 결합 검증까지 진행했으며 실제Composer/source/
capture/print 연결과실기기·운영전환은남았다. 확정된 전체 작업량 분모가 없어 전체%를 새로 추정하지 않는다.

### S-46. 재개 / 측정 세션의 첫 구현 계약 — 2026-10-02

기준 cc013c4(82343e9 부분 구현 checkpoint 포함). 사용자 '현재상태 검토하고 이어서하자'.
131 DONE/132 부분 구현 및 기존 WebKit3FAIL 유지. 이번 계약은 S45 전체 연결 완료가 아니라
그 선행 조건인 측정 세션만 다룬다. 같은 Codex의 코드 대조·계약 자체검토, Founder 신규 결정0.
정확 코드 범위: apps/mockup/src/preview/composer-font-proof.ts 및 같은 .test.ts 두 파일.
문서는 기존8개 범위 안에서만 갱신한다. 기본 앱/Composer/print/공유 API/보호 경로 변경0.

#### 수명·호출 계약

- createManagedFontMeasurementSession은 이미 준비된 고정 owner와 명시 요청 목록만 받는다.
  각 항목은 {owner, request}; revision은 owner.revision에서 캡처한다. 임의 byte/descriptor/검증 boolean 입력0.
- 생성은 향후 effect/명시적 수명 소유자가 render 밖에서 실행한다. 생성 중 기존 owner.acquire를
  항목당 한 번만 호출하며 load/retire/fetch/DOM 생성은 호출하지 않는다. render/trial/probe의 측정은
  이미 확보된 lease만 사용한다. 이 helper 자체로 React의 실제 호출 위치가 증명되는 것은 아니다.
- 1~6개의 기존 static revision만 허용. 입력 요청을 복사하고 family/weight/italic/문자열을 검사한다.
  같은 원래 family+weight+italic 중복, alias/identity 중복, 서로 다른 language 혼합은 거부한다.
  혼합 language 지원이나 기존 제품 지원 축소의 결정이 아니라 이 로컬 단일 context 세션의 거부 경계다.
- 세션은 frozen bindings(revision, 원래family/weight/italic, alias, identity, language)와
  TextMeasurePort 호환 measureText, isCurrent, release를 제공한다. native face/bytes/owner는 노출0.
- measureText는 정확 alias/weight/italic, sans-serif fallback, 양수 유한 크기와 문자열만 수용한다.
  요청 문자열/fragment의 증명은 기존 owner.measure가 담당한다. family fallback/정규화/새 acquire0.
  잘못된 입력·예외·부정/비유한 폭·재진입·현재성 상실은 NaN으로 builder의 기존 실패 경로에 전달한다.
- 모든 lease의 현재성을 측정 전후 확인한다. 어느 하나라도 stale이면 세션 전체 실패.
  release는 먼저 논리 무효화하고 외부 current/measure 호출이 끝난 뒤 자기 lease를 각각 한 번 해제한다.
  일부 acquire 실패/throw/late validation 실패 때도 확보한 lease 전부 해제, 한 release 예외가 나머지를 막지 않는다.
- 일반 문구 편집은 측정 요청만 변경하며 세션/owner를 retire하지 않는다. 소유자 교체/unmount에서
  세션을 해제한다. 인쇄는 나중에 별도 plan-bound lease를 callback settlement까지 유지해야 한다.
  세션.release를 print 수명의 대체물로 사용하지 않는다. 현재 세션 API는 plan/capture/print를 실행하지 않는다.

#### 검증과 다음 순서

합성 시험: 복수 style·alias routing, snapshot 불변, 반복 측정 acquire0, 부분 실패 cleanup,
throw/invalid/duplicate/mixed language, 요청 getter 및 current/measure 중 release·재진입,
부정·NaN·Infinity 폭, stale 전후, 여러 session 독립·멱등 release. fake는 native glyph/pixel 증명이 아니다.
기존 owner/primitive 표적과 공통 check를 실행하며 보호23/정확 경로/번들SHA/diff를 대조한다.
이2파일은 기본 앱 및 native fixture에서 새 API를 아직 호출하지 않으므로 이번 단계의 native/E2E는
기존9월14일 결과와 분리하고 재실행하지 않는다. 실제 연결 시 S26의3엔진/회귀를 반드시 재실행한다.
후속은 runtime geometry projection→최종 plan identity/내용 증명→동일 commit snapshot→private display/
102 surface/async print 연결의 정확 계약 및 구현이다. 세션만으로 이 단계들이 완료됐다고 기록하지 않는다.
전체132 게이트는 미충족이므로 자동 완료/자동 전송/다음 스펙0. 예약 반복 작업도 생성하지 않는다.

#### S46 구현 결과 / 다음 계약 검토

createManagedFontMeasurementSession 및 immutable bindings/measureText/isCurrent/release 구현.
기존2파일 변경. request 배열과 text 배열의 caller iterator가 내용을 바꿔치기하는2시험을 추가해
수정 전2FAIL/137PASS 재현 후 길이 단일 캡처+index 직접 읽기로 보완했다.
중간 generator return/type narrowing 관련 TypeScript 오류를 수정했고 최종 공통게이트를 다시 실행했다.
최종 표적173/173(기존 owner98+새session41+primitive34),unit3930/3930(3889+41),125파일,
format/lint380·7typecheck·2build PASS. 동일 Codex 자체검수, 실제 폰트/React 통합 증명은 아니다.
새 helper는 아직 호출부와 연결하지 않았으며 이번 native/E2E 미실행. 기존3FAIL 유지.
고객 entry346959bytes/gzip106.39kB, CSS22675bytes/gzip5.15kB,
admin entry294910bytes/gzip91.40kB; S44의3개SHA 모두 그대로다. 큰 chunk 경고는 숨기지 않았다.
보호23SHA 불변, 허용code2+docs8만 변경,staged0/diff--checkPASS,4183/4184/4185 LISTENING0.
새 temp/browser/emulator0. HEAD cc013c4=로컬origin추적0/0,새원격조회/stage/commit/push0.

다음 SPEC132_PLAN_BINDING_CONTRACT_REVIEW에서는 session.bindings를 이용한 사전 geometry projection,
probe/trial/final에 동일 session 사용, 최종plan에 대한 정확 객체 identity+runtime 내용 불변 증명을
먼저 설계한다. 현재 binding 필드 목록만으로 실제 plan의 provenance를 증명했다고 하지 않는다.
새 내부 helper는 승인목록의 composer-room-source.ts/test 또는 기존 font-bound-execution.ts/test 안에서
정확 역할을 고정한 뒤 구현한다. plan을 사후 clone/alias 치환하거나 readonly만으로 신뢰하지 않는다.
ordinary edit 동안 print lease 독립 유지, effect/commit cleanup과 owner retirement 구분을 시험한다.
실제 React hookup 전 중단 render/no consumer I/O0/child-first commit의 정확 수명 계약을 선행한다.
추가 Founder 결정은 현재 없음. 전체132 완료·운영 폰트 공급·실기기·배포는 계속 미완/금지다.

### S-47. 최종 plan 생성·독립 실행 차용 계약 — 2026-10-02

S46 위에 다음 연결을 구현한다. 같은 Codex 기술 검토, 기존 FP3/FP6 범위.
코드6파일: composer-font-proof.ts/test, 새 composer-room-source.ts/test,
canvas/font-bound-execution.ts/test(모두 S24 승인35 목록). 문서는 기존8개.

- 새 buildManagedFrameProductPlan은 이미 검증된 frame geometry 및 customer text를 필드별 snapshot한다.
  활성 문구 zone의 원래 family/weight/italic를 session.bindings에 정확히 대응시키고 별도 geometry의
  fontFamily만 owner alias로 projection한다. 원래 geometry/catalog/map을 변경하지 않는다.
  placeholder는 실행 입력에 넣지 않는다. 비활성 문구에는 font 공급을 요구하지 않는다.
- 같은 기존 buildFrameProductPlan과 session.measureText로 plan을 생성한다. 외부 builder/plan 주입0.
  생성 전후 session current 확인, 활성 문구의 모든 draw-text alias/style 확인 후 helper가 소유한
  새 builder plan의 plain 객체/배열 전체를 deep-freeze한다. 값·줄·좌표·alias를 사후 재작성하지 않는다.
  plan 내용 불변은 readonly 타입 대신 이 소유 객체의 runtime freeze로 강제한다. caller plan을
  받아 동결하는 API가 아니다. 성공 반환은 정확 plan과 그 plan에만 결속된 FontBoundExecution이다.
- 측정 세션에 borrowExecution을 추가한다. 생성 시 캡처한 owner/request를 새로 acquire하고
  alias/identity/language가 측정 때 값과 같은지 전부 확인한다. 각 실행 차용은 독립 lease를 소유한다.
  실패하면 부분 차용도 전부 해제한다. 새 borrow는 live measurement session에서만 가능하다.
  이미 취득한 execution lease는 session.release 후에도 owner가 current이면 유지하며,
  owner retire/오염/unmount에 대한 owner retirement가 발생하면 결과 성공 인계를 차단한다.
- 실행 차용은 isCurrent/prepare/execute/release만 노출한다. prepare는 private native context의
  프로필을 확인하며 scale을 변경하지 않는다. execute는 정확 bound plan만 허용하고 기존 shared
  executor에 같은 plan 및 caller imageBindings를 전달한다. 외부 executor를 제품 proof로 주입0.
  current/prepare/shared draw 전후 실패는 안전 코드만 반환. release 재진입 때 논리 무효화 후
  외부 실행이 끝날 때까지 자기 font lease 물리 해제를 미룬다. 이미 일부 그린 실패는 성공0이다.
- binding은 geometry/plan만 결속한다. image binding identity·130 proof·131 source·React commit
  결속은 다음 연결 범위이며 여기서 완료로 기록하지 않는다. 일반 문구 편집의 새 plan 생성은
  같은 session/owner를 retire하지 않는다. 이전 클릭의 plan/실행 lease를 유지한다.
- 지금은 helper/fake만 연결한다. 실제 Composer/surface/print UI에는 아직 적용하지 않는다.
  future print는 borrow를 draw부터 async encode settlement까지 보유하고 URL/download 직전 current를
  다시 확인한다. 기존 isolated primitive의 frame release와 font release를 하나의 owner로 묶는 연결을
  다음 단계에서 검증한다. native context 이외 capture102 capability를 임의 Canvas로 가정하지 않는다.

합성 필수 행렬: 원래 geometry 불변/placeholder0/없는 family 실패/정확 style/최종 wrapping,
runtime plan nested mutation 거부/동일 내용의 foreign plan 거부/scale 보존/모든 text 검사,
execution acquire 실패 cleanup/measure session release 후 진행 중 차용 유지/owner retire 차단,
current·prepare·draw 재진입/throw/중복 release/old plan 유지. 기존 helper/primitive/productPlan 회귀와
공통 check, 번들/보호23/diff/정확파일을 확인한다. 실제 glyph/React/native PASS와 분리한다.
새 API는 기본/native entry에서 미호출이라 이번 native3/회귀138 재실행0; 실제 연결 후 필수다.
기존 WebKit3FAIL은 보존,132 부분 구현 유지. 다음은 private frame/async encode 수명 연결,
그 후 실제 React/source/capture 통합이다. 기존 실패의 증명 대체 검수 전 완료·자동 전송0.

### S-48. private frame·async encode 독립 수명 연결 계약 — 2026-10-02

S47 내부 plan 결속 위에서 같은 승인 파일 canvas/font-bound-execution.ts/test만 연결한다.
새 renderFontBoundPlanFrame은 FontBoundExecution과 정확 plan/이미지/크기/scale,
외부 이미지·proof 현재성 및 새 private Canvas factory를 명시 입력으로 받는다.
font execution lease를 먼저 취득한 후 기존 renderIsolatedPlanFrame을 호출한다.
language/prepare/execute는 취득 lease에서만 공급하며 외부 executor 주입은 받지 않는다.
같은 모듈이 생성한 shared-executor binding의 비공개 identity 기록을 요구하며, 구조만 흉내 낸
binding/acquire/execute를 전달하여 성공을 위조하는 seam을 열지 않는다. 이 내부 identity는
폰트/glyph/130 proof/native pixels 검증을 대신하는 attestation으로 주장하지 않는다.
기존 primitive의 scale·private bitmap·display target 계약은 변경하지 않는다.

반환 owner는 같은 IsolatedPlanFrame 표면을 유지하되 font borrow와 private frame을 함께 소유한다.
present/encode 전후에 외부 현재성과 실행 lease 현재성을 모두 확인한다. 단, 취득 후 측정 session
해제만으로 이미 진행 중인 출력의 폰트를 해제하지 않는다. 실제 owner retirement는 계속 차단한다.
release는 논리적으로 즉시 무효화하고 private primitive를 release한다. 동기 present 또는 async
encode가 진행 중이면 font 물리 해제는 해당 호출/Promise settlement까지 미룬다.
late Blob을 성공으로 인계하지 않으며 새 URL/download/retry를 생성하지 않는다.
callback이 오지 않는 encode 전체의 절대 시간 상한은 보장하지 않으며 임의 timeout으로
진행 중 native resource를 해제하지 않는다. 호출자는 항상 finally에서 반환 frame을 release한다.

필수 합성 시험: 성공 생성/present/encode·중복 release, 실패 생성의 부분 lease cleanup,
외부 proof 및 font current 상실, encode 중 release·늦은 Blob 및 null/throw,
동기 copy 재진입, 측정 session 해제 후 완료 유지, executor 주입 우회0.
실제 React/131 source/102 capture/print UI wiring 및 native3 실행은 아직 포함하지 않는다.
S47/S48 자체검증 후 다음은 위 실제 commit/source/capture 통합 계약 대조다.

### S47~S48 구현 결과 (같은 Codex) — 2026-10-02

위 계약 코드6파일 구현. 기존 S46 code2를 보존하고 plan projection/binding/frame lifetime을 더했다.
성공 plan은 원래 geometry/values/placeholder를 건드리지 않는 정확 builder 결과이며 소유 tree만 동결.
측정 및 다른 활성 execution handle 재사용 거부, 실행별 새 lease stamp 대조와 reverse cleanup,
prepare/execute/current 재진입 guard·외부 호출 중 논리 무효화/지연 물리 해제 구현.
shared executor를 변경하지 않고 native receiver 보존 Proxy로 각 호출/속성 전후 current를 검사한다.
외부 executor 및 구조 위조 binding은 private frame owner에서 거부하며 scale 재설정0.
같은 plan의 private bitmap + font borrow를 async encode settlement까지 유지한다.
retire/release 뒤 늦은 Blob 성공 인계0. 측정 session 해제만으로 이전 클릭을 retire하지 않는다.

실제 실행:
- 표적 `node node_modules/vitest/vitest.mjs run apps/mockup/src/preview/composer-font-proof.test.ts apps/mockup/src/preview/composer-room-source.test.ts apps/mockup/src/canvas/font-bound-execution.test.ts apps/mockup/src/canvas/productPlan.test.ts`
  → exit0,4파일343/343 = 직전2 helper173 + 기존 productPlan99 + 새71.
- `node scripts/check.mjs` → exit0; format/lint382,7typecheck,126unit파일4001/4001
  = 직전3930+새71,2build PASS. 중간 lint unused import/TypeScript export·discriminant·
  fake callback return type 오류를 수정 후 최종 전체 재실행했다. 중간 결과를 최종 PASS로 대신하지 않는다.
- 자체검토 후 execution handle 재사용·구조 위조 executor 우회 차단 및 새 회귀를 추가했다.
  모든 새 테스트는 합성 protocol 또는 genuine owner + 합성 native 환경 시험이며 native glyph 증명이 아니다.
- 새 API는 기본/native entry에서 미호출. 이번 native/E2E/실기기0,9월14일12/12/9PASS3FAIL 및138은 과거값.
- 고객JS346959/CSS22675/adminJS294910bytes 및 S46 SHA3개 불변. 기존 chunk >500kB 경고는 보존.
- code/test6+docs8만 새/추가 변경. 보호/user23 SHA불변,staged0,git diff --check PASS.
  실제 Rules/config/의존성/자산 원본/운영 요청/배포/자동화/새 install0.
- 포트4183/4184/4185 NOT VERIFIED: 명시 Get-NetTCPConnection 조회가 접근 거부됨.
  앞선 오류 숨김 조회의 빈 출력으로 잔류0을 주장하지 않는다. 이번 서버/브라우저 실행0,권한 우회0.
- HEAD cc013c4=로컬origin tracking0/0; 새 원격 조회/stage/commit/push0.

READY_FOR_CODEX / SPEC132_REACT_SOURCE_COMMIT_CONTRACT_REVIEW.
131 DONE/132 부분 구현 유지. S47/S48 local helper 수명 결속은 완료됐으나 실제 React/source/capture/
print integration,기존 WebKit3FAIL의 증명 대체 검수,실기기 및 운영 전환은 미완이다.
다음 일반 기술 작업은 동일 승인35 목록 안에서 실제 호출부와 130/131/102 proof 경계 대조,
plan·binding·이미지의 동일 commit 및 async print owner 연결 계약을 먼저 고정하는 것이다.
전체 로드맵 분모 미확정으로 리빌드 전체 완료율을 추정하지 않는다.

### S-49. 집 재개 / 실제 commit·출력 연결 계약 검토 — 2026-10-02

기준 HEAD `1fac0d9f8a0318f025af4c01038dbc6ccc311e8e`, 코드 체크포인트 `1b25748`.
사용자의 이번 직접 지시: 로컬 보존·fast-forward 동기화, 계약 선행, 보호/기존 WebKit 실패 보존,
누락 도구·폰트 임의 설치/다운로드0, 실제 운영/배포/자동화 변경0. 아래는 동일 Codex의
정적 호출부 검토와 연결 요구 계약이며, 실제 연결 구현/검증 PASS나 전체132 DONE이 아니다.

#### 실제 코드 대조

- PreviewComposer.tsx: `commitText`는 frameTrialRef와 기존 measureText로 trial을 만들고,
  built의 buildWith가 probe/final을 각각 생성한다. frameTrialRef를 render 중 갱신한다.
  S47 managed helper/session/execution은 아직 이 호출부에 연결되지 않았다.
- 현재 props에는 managed 공급/source consumer 연결이 없고, PreviewCanvasSurface에는
  plan/imageBindings만 전달된다. 기존 fonts.ready/check는 새 managed source의 증명으로 사용하지 않는다.
- usePreviewCanvasSurface.ts: 첫 snapshot은 ref 초기값, 이후 plan/bindings는 passive effect로
  별도 게시한다. 이것만으로 새 React commit과 source의 동일성을 증명할 수 없다.
- 130 proof는 localImageBinding/templateArtBinding의 `readReadyProof`에서 exact ready identity를
  검사한다. read-only liveness이며 drawable 보유·차용·cleanup 권한은 제공하지 않는다.
- 131 useRoomCommittedSource는 caller의 입력 변경 전 invalidate를 요구한다. layout effect가
  candidate를 129 owner에 commit한다. 129는 React commit 감지기나 pixel snapshot이 아니다.
- 102 정본은 `room-placement/frame-snapshot.ts`이다. createSurface의 context/copyTo/release를
  획득하고 transform→execute→current 확인 후 lease를 반환한다. 임의 Canvas/toBlob로 해석하지 않는다.
- exportFramePng.ts: plan/bindings를 click request에서 읽고 동일 plan을 실행하지만 managed
  execution을 차용하지 않는다. encode 후 disposed 검사는 있으나 font/image current 검사와
  createObjectUrl/triggerDownload의 재진입 후 current 검사까지 갖춘 것은 아니다.

#### 연결 요구 계약 — 다음 구현의 필수 불변식

1. managed 공급과 source consumer는 S24 로컬 E2E opt-in으로만 연결한다. 기본 앱의
   기존 preview/print·접근성·레이아웃을 유지하며 신규 fetch/font 등록/추가 Canvas I/O0.
   공급 없이 text source를 성공으로 게시하지 않는다. case/clock을 frame source로 위장하지 않는다.
2. 공급 수명 소유자는 render 밖에서 session을 준비/해제한다. render의 trial/probe/final은
   이미 준비된 같은 session의 순수 측정만 사용한다. prepare 중단/StrictMode/unmount 정리를
   명시하고 render 안 acquire/load/release, render 중 committed ref 갱신을 하지 않는다.
   edit trial은 마지막 실제 commit의 입력/session에서만 수행하며 거부한 문구를 게시하지 않는다.
3. adapter 소유의 불변 candidate는 exact final plan/execution/imageBindings, 입력·catalog epoch,
   필요한 이미지별 exact ready proof, font/session identity와 trial 입력을 함께 결속한다.
   plan 사후 clone/alias 재작성0, catalog/customer 입력 동결·변경0, probe는 source로 게시0.
   get/proof/current 호출 전후 현재성 검사 및 throw/reentrant invalidate는 실패로 닫는다.
4. render 후보와 committed 후보를 구분한다. managed preview snapshot·131 source candidate·
   print click의 출발점을 같은 committed record로 고정한다. abandoned render는 이전 commit을
   바꾸지 않는다. child-first layout/ref 순서에서 아직 게시되지 않은 후보를 ready로 보지 않는다.
   managed branch는 commit publication 후 draw를 예약하고 callback/RAF 전후 epoch를 검사한다.
   selection/catalog/photo/art/pending drag는 기존 S16~S18처럼 입력 변경 전에 source invalidate한다.
5. source 현재성과 진행 중 print의 현재성은 별도다. ordinary text/transform commit은 source를
   갱신하되 이미 click에서 취득한 font execution lease를 session 교체만으로 해제하지 않는다.
   print는 클릭의 exact plan/bindings와 독립 lease를 보유한다. font owner retirement, 사용한
   이미지 ready proof 상실, unmount/dispose는 성공 인계를 차단한다. 새로운 source identity와
   다르다는 이유만으로 정상 old-click 출력을 취소하는 guard를 넣지 않는다.
6. managed preview display는 trusted factory가 새 unused detached Canvas를 생성한 뒤 commit에서
   attach한다. 기존 JSX Canvas를 createIsolatedDisplayTarget에 adopt하지 않는다. 같은 final plan의
   private frame을 managed target에 1:1 present하고 effective DPR/observed CSS 규약을 유지한다.
   attach/cleanup/failed draw의 display·font·frame 소유권을 분리하며 실패한 부분 bitmap을 ready로 표시0.
7. capture는 기존102 API/129/131/shared executor를 수정하지 않고 승인 경로의 adapter로 연결한다.
   102의 createSurface/context/copyTo/release와 managed private primitive 사이의 정확 capability
   변환, transform 적용 주체, shared executor 1회, 실패 시 부분 cleanup을 먼저 시험 가능한
   계약으로 확정한다. 기존102 execute test seam을 arbitrary executor 성공 증명으로 사용하지 않는다.
   이 세부 adapter는 이번 정적 검토만으로 확정/구현 완료하지 않았다.
8. managed print는 기존 size/fileName/one-export-at-a-time/URL creator 규약을 유지한다.
   private frame에서 정확 plan을 한 번 렌더·encode하고 preview bitmap 확대0. font/frame 차용은
   callback settlement까지 보유, finally release한다. encode 결과/URL 생성 전후/download 전후에
   독립 current와 disposed를 검사한다. URL 생성 중 재진입 무효화면 그 URL을 정확히 회수하고
   download를 시작하지 않는다. 이미 외부 download가 발생한 뒤의 무효화는 성공 보고를 차단할
   수 있으나 발생한 외부 효과를 취소했다고 주장하지 않는다. timeout/retry/late Blob 성공0.

#### 정확 범위·검증 계획·진행 경계

다음 첫 구현 후보는 승인 목록의 composer-room-source.ts/test에 committed candidate 결속을
추가하는 단위다. 이어 PreviewComposer.tsx/test, PreviewCanvasSurface.tsx/test,
usePreviewCanvasSurface.ts/test, surface.ts/test, exportFramePng.ts/test, E2E fixture/test를
각 계약 확정 후 연결한다. S24의35경로 밖 API/102/129/131/보호/shared barrel 변경0.
새 제품 방향 결정은 현재 없다. capture capability의 정확 내부 형태와 managed display DOM
연결은 후속 세부 계약·시험으로 확정할 기술 항목이며 이번 문서를 implementation-ready로 읽지 않는다.

필수 합성 부정 시험: mixed plan/execution/image/proof, foreign plan/epoch, abandoned render,
child-first publication, StrictMode cleanup, input invalidate-before-update, stale RAF/drag,
ordinary edit 동안 old print 유지, photo/art/font retirement 차단, URL 생성 중 dispose,
late/null/throw encode, 부분 attach/capture cleanup 및 no-consumer I/O0.
도구 복구 후 표적 unit와 공통 check, 실제 Composer3엔진·기존 회귀를 실행한다.
기존 WebKit3FAIL은 삭제/skip/추정 PASS0; 과거4001/343을 이번 실행값으로 재사용하지 않는다.

집 preflight 실측: Node v24.18.0 존재. node_modules 없음, S11 원본/고지 root 없음,
S42 고정 output root와 manifest.json 없음. SHA는 파일 부재로 NOT VERIFIED.
Vitest/typecheck/build 및 native 필수 검증을 실행할 수 없어 코드 구현·검증·전송은 중지한다.
설치/다운로드/변환/브라우저 취득0. 기존 자산/도구가 복구된 환경에서 동일 checkpoint와
SHA를 확인한 뒤 위 첫 단위 세부 계약→구현→검증으로 재개한다.

### S-50. 집 검증환경 복구 승인·실행 계약 — 2026-10-02

사용자 `응 승인할게`: 직전 질문의 기존 계약 검증용 폰트 재취득·재생성 및 필요한 로컬
검증 도구 설치를 직접 승인했다. S49의 설치/다운로드 금지는 아래 정확 복구에 한해 대체한다.
운영/배포/자동화/제품 폰트 선정/새 의존성 버전/보호파일 변경 승인은 아니다.

- S11 pin/URL의 원본3+고지2만 기존 ignored 경로에 재취득. 기존파일 덮어쓰기0,
  contents metadata size/git blob SHA 및 S12 SHA256/size 일치를 검사한다.
- packageManager pnpm11.15.1, Node24, 기존 lockfile의 frozen install만 허용.
  package/lock/workspace 수정0, 공급망·engine 검사 우회0, 전역설치0.
- Python3.14.5/pip26.1.1 존재 실측. S40 fontTools4.65.0 wheel URL/SHA를 그대로
  --isolated/--no-deps/--no-compile/--no-cache-dir/--require-hashes/--target로 격리 복구.
- static6 및 manifest는 S40/S42의 정확 정본 byte/hash를 유지한다. 원래 instantiate.py와
  manifest는 ignored이고 이 PC에 없으며 tracked 저장소에도 생성 script 본문이 없다.
  기존 script를 확보할 수 없으면 임의 구현으로 기존 SHA를 바꾸거나 정본을 갱신하지 않는다.
  재생성 승인만으로 새 byte/revision/manifest를 기존 정본이라 주장하지 않는다.
- Playwright는 lockfile 고정 버전에 대응하는 브라우저만 필요한 경우 로컬 복구 가능.
  실제 native 실행 전 static 정본과 도구 상태를 검사한다. 기존 WebKit3FAIL 보존.
- 복구 실패·정본 불일치는 기록 후 중지, 추정PASS/skip/대체font0.

#### S50 복구 결과 / 설치 정책·보호 충돌 STOP

원본3+고지2 다운로드 완료: S12 size/SHA256와 고정 contents metadata의 Git blob SHA
5/5 일치, 고지 header 확인. 원본/고지는 ignored 경로만 사용하고 Git 전송0.
corepack pnpm11.15.1 install --frozen-lockfile 실행 exit1.
161개 package 배치와239개 lock entry 공급망검사는 완료됐으나 ERR_PNPM_IGNORED_BUILDS:
@firebase/util1.15.2,protobufjs7.6.5 build script 차단. install PASS로 기록하지 않는다.
설치기가 보호 pnpm-workspace.yaml에 allowBuilds 및 두 'set this to true or false' 줄을
자동 추가했다. 시작3줄→6줄,기존3줄 유지. 수동수정/복원/stage/commit0,증거 그대로 보존.
승인된 도구 설치가 보호파일 변경·build script 정책 해제를 허용한 것은 아니므로 중지한다.
approve-builds/정책우회/추가설치/테스트/제품구현/전송0.
node_modules의 Vitest/Biome 파일 존재는 확인했으나 전체 도구정상/게이트PASS가 아니다.
fontTools 설치·static 변환·browser 설치는 아직 실행하지 않았다.
기존 instantiate.py/manifest 부재와 정본 SHA 문제도 남아 있다. WebKit3FAIL 유지.
재개에는 설치기 추가3줄 처리와 build script 미실행 설치방식의 명시 결정,
원래 S40 script/manifest 확보 또는 별도의 새 검증자산 revision 계약이 필요하다.

#### S50 설치기 추가분 처리 승인 — 2026-10-02

사용자 `응 다음 진행해줘`: 직전 질문의 설치기 추가3줄만 제거하고 build script를
실행하지 않는 --ignore-scripts 설치 재시도를 승인했다. 기존3줄/다른보호파일은 유지.
정확명령 corepack pnpm install --frozen-lockfile --ignore-scripts.
approve-builds/전역정책변경/의존성버전변경0. 기존 static script/manifest 정본 부재는 별도 미해결.

#### S50 승인 후 재시도 결과 / checkout format 게이트 STOP

설치기 추가3줄만 제거,원래 workspace3줄과 package/lock의 Git 내용 diff0.
corepack pnpm install --frozen-lockfile --ignore-scripts exit0(pnpm11.15.1).
공급망239entry 검사캐시통과·lock동일,build script 실행/approve-builds0.
표적4파일 Vitest exit0,343/343 PASS(이번 집 실측).
node scripts/check.mjs exit1: format382파일검사·377errors·수정0.
첫 단계 실패이므로 lint/typecheck/전체unit/build는 이번 공통검사에서 NOT RUN.

읽기전용 원인근거: 시스템Git core.autocrlf=true,
apps/admin/src/App.test.tsx 및 composer-room-source.ts와 보호 render/plan/index.ts는
index LF/worktree CRLF,eol attr없음. apps/packages/tests/scripts 중404파일은 i/lf w/crlf,
5파일은 i/lf w/lf. Biome default LF와 checkout의CRLF 차이가 출력에서 확인된다.
377개 각각의 추가 차이 여부까지 전수분리한 것은 아니므로 전부 EOL뿐이라 단정하지 않는다.
보호 포함 일괄포맷/Git전역설정/config변경0,새 제품code수정/commit/push0.
pnpm-workspace.yaml은내용diff0이나status에M이보일수있으며staging/강제복원으로숨기지않는다.
일괄변경 대신 별도 LF 검증사본에서 게이트를 재현하는 범위를 검토 후 재개한다.
static script/manifest 정본 부재 및 WebKit3FAIL은 별도 계속 보존.

### S-51. 별도 LF 검증사본 계약 — 2026-10-02

사용자 `응 그대로 진행해줘`: 원본작업트리를 그대로 두고 별도LF사본에서 재검증 승인.
ignored test-results/spec-132-lf-validation 아래 고유 run 디렉터리만 생성한다.
현재 working tree의 tracked apps/packages/scripts/tests 및 필요한 정적 root config/합성
cutover candidate/rules 비교자료만 복사한다. legacy운영HTML/backup/secret/.git/실제데이터0.
사본의 text만CRLF→LF,그외내용/바이너리동일. 원본각파일SHA를 전후확인하고manifest기록.
의존성은 기존lockfile그대로offline/frozen/ignore-scripts install하여 workspace link가
원본이 아닌 사본package를 참조하게 한다. 원본node_modules공유junction으로 검증을 위조0.
사본cwd에서node scripts/check.mjs 실행,format/lint/typecheck/unit/build 결과를원본과구분.
Firebase/live/emulator/배포/native실행0. 사본build출력은제품출력으로복사하지않는다.
실패시정확단계와근거보고/중지,원본일괄포맷/config완화0. static 정본부재·WebKit3FAIL 유지.

#### S51 실행 결과 / 사본 번들 동일성 STOP

사본: test-results/spec-132-lf-validation/run-ab3ce606-0c78-4b2c-a3f6-909f3b61c35d.
prepare.mjs로425파일복사/419텍스트LF정상화,manifest에원본/사본SHA기록.
offline/frozen/ignore-scripts install exit0,161reused/0downloaded.
@denn/shared realpath는사본packages/shared,원본workspace 링크사용0.
node scripts/check.mjs exit0:format382/lint382,typecheck7,126unit파일4001/4001,build2 PASS.
검사후 원본425파일SHA재확인 변경0.사본결과이며원본CRLFformat PASS로재기록하지않는다.
큰chunk>500kB 경고 및plugin timings경고보존.이번native/E2E/emulator/live0.

별도번들동일성: 고객JS346959bytes/adminJS294910bytes는기존값과동일이나
고객CSS26511bytes(gzip5.82kB)는기준22675bytes보다3836bytes 증가,동일성FAIL.
고객JS SHA6182B4B409ACFC8B44550467F6942ED625538BCFB59E3C37AE57A14CE93ACE3C는기준일치.
adminJS는크기동일이나SHABFC5DE7970CBE014256FEE90A53BF52F97D9C12B39585339256A2A759EEAC5DE로
기준2A25F27A178E6CC8877A46D515F2EB32DDED848F26DAA87B791139F7853AEF21와불일치한다.
S51 사본에는 root.gitignore와docs등기본탐색자료가없다.자동source탐색 Tailwind의
컨텍스트차이는원인후보이지입증된원인이아니다.제품CSS수정이나임의baseline갱신0.
필수번들게이트차이로중지;기존ignored/font/native실패를숨기지않는다.
다음기술검토는사본의source검색/ignore 컨텍스트를원본과대조해증가원인을분리하는것.
보호포함원본포맷/config변경0,제품코드/commit/push0. static정본script/manifest부재도유지.

### S-52. LF사본 source탐색 컨텍스트 원인분리 — 2026-10-02

사용자 `응 다음 작업 진행해`: S51 번들차이의 읽기전용 대조와 사본내 재현 보완.
기존 사본run-ab3ce606에서 현재산출물 byte/SHA 기록후 원본.gitignore만 그대로복사해
build2를재실행한다. 하나의변수만추가,제품source/config/.git/운영자료변경0.
사본결과SHA를 S44/S48의 고객JS/CSS/adminJS 정본과 각각대조한다.
일치하지않으면검색컨텍스트 원인을추가분리하되 baseline완화/보호변경/추정PASS0.
일치하면 같은사본 공통check재실행 및 원본425SHA불변을확인한다.
기존 실패기록은이력유지,static정본부재/WebKit3FAIL의해결로확대0.

#### S52 첫 실험 / 다음 한 변수

.gitignore만복사한build2 exit0이나CSS26640/customerJS기준SHA일치/adminJS SHA변경.
baseline동일성미해결. .gitignore추가로+129bytes도관찰,원인확정0.
다음은 사본내빈.git 디렉터리만추가하여scanner의Git경계/ignore적용여부를분리한다.
원본.git 읽기/복사/수정0,사본을실제Gitcheckout이나원격연결로만들지않는다.
source/config/의존성변경0,재build동일성과반복실행안정성을확인한다.

#### S52 재현 보완·최종 결과

사본내빈.git 경계추가후build2 exit0,고객CSS22675bytes와기준SHA6CA8E14C…일치,
adminJS294910bytes/SHA2A25F27A…일치,고객JS346959bytes/SHA6182B4B4…일치.
다시같은사본에서node scripts/check.mjs exit0:format382/lint382/typecheck7,
126unit파일4001/4001/build2 PASS.재build후에도3기준size/전체SHA동일.
Git경계유무에따라source탐색/ignore 컨텍스트가달라지는사본문제임을통제실험으로재현했다.
정확scanner내부원인전체를추적한것은아니며제품코드결함/폰트해결로확대하지않는다.
원본425파일SHA불변,.gitignore원본SHA불변.원본.git읽기/복사/수정0.
ignored prepare.mjs에.gitignore복사+빈.git경계생성을추가하여다음사본에서재발방지.
고객CSS기준과adminJS기준을바꾸지않고S51번들동일성장벽해소.
원본CRLFformat실패는이력보존,사본PASS와구분.이번native/E2E0/WebKit3FAIL유지.

남은필수native장벽은기존static6/instantiate.py/manifest정본부재다.
원본5재취득과로컬도구는복구됐으나원래script/manifest내용은SHA만으로복원할수없다.
기존ignored FP5폴더전송또는새정본revision의별도계약/승인이필요;임의기존SHA교체0.
현재문서5로컬보존,제품코드/보호config변경/commit/push0.

### 집 재개 checkpoint 인계 — 2026-10-02

사용자의 직접 commit/push/handoff 요청으로 S46~S48 부분 작업만 전송한다.
원격 bfa0da4 문서1커밋을 그대로 fast-forward 반영하고 겹치는 상태3문서는 양쪽 이력을 보존했다.
코드6 커밋1b25748,문서8 별도커밋/실제 전송 결과는 live 마지막 항목 및 최종보고 참조.
당일 공통check4001/4001을 다시 확인했고 동기화 뒤 표적343/343 PASS.132 DONE이나 실패 면제0.
다음은 실제 React/130/131/102/print의 동일 commit 및 독립 수명 연결 계약 대조부터다.
Git에 없는 S11~S12 원본/고지와 S42 고정사본/고지는 집에서 존재/SHA를 확인해야 한다.
자산/기존도구 부재는 해당 native 검증 STOP이며 추가 다운로드/변환/설치로 자동 보완하지 않는다.
보호/user23 및 실제운영/배포 경계 유지. 실제자동화 상태 조회/변경0,오늘 새구현0.
