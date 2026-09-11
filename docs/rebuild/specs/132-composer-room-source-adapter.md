# 132 — 실제 Composer의 룸 source adapter

2026-09-11 / 기준 e0f69e7=origin·0/0. 131 code595cb6a/docs e0f69e7 DONE.
상태: CONTRACT_REVIEW_IN_PROGRESS. 이 초안은 아직 구현 착수 계약이 아니다.
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

문서7: 이 spec,132review/handoff,STATE/NEXT/CURRENT/live.
후보 밖 파일이 필요하면 코드 작성 전에 계약을 다시 검토한다. 제품 의미 확대라면 Founder 질문.
현재 문서7 외 수정0. 기존131 코드 변경은 이 스펙의 묵시적 허용이 아니다.

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
