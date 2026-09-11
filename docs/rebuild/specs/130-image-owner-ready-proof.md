# 130 — 이미지 owner의 현재 준비상태 읽기 전용 증명

2026-09-11 / 기준 bf37bcf=origin·0/0. 129 fe58f07/bf37bcf DONE.
사용자 스펙간 루틴에 따른 선행 계약. CONTRACT_REVIEW_PASSED(동일 Codex 정적 자체검토).

## WHY

129의 isCurrent는 실제 owner 생존 증명을 필요로 한다. canvas/localImageBinding.ts 및
templateArtBinding.ts는 dispose 후 마지막 ready snapshot을 그대로 남길 수 있다.
hooks의 ready 상태나 같은 imageRef만으로 사용 가능성을 증명하지 않는다.
이번에는 실제 owner의 현재 snapshot/세대/ready incarnation에 묶인 읽기 port만 추가한다.
React commit 등록, Composer 및 룸 UI 연결은 다음 계약이며 이번 완료 주장에 포함하지 않는다.

## SCOPE / 정확 파일

코드·시험 8개:
- apps/mockup/src/canvas/localImageBinding.ts
- apps/mockup/src/canvas/templateArtBinding.ts
- apps/mockup/src/canvas/useLocalImageBinding.ts
- apps/mockup/src/canvas/useTemplateArtBinding.ts
- apps/mockup/src/canvas/image-ready-proof.test.ts
- apps/mockup/src/canvas/useImageReadyProof.test.ts
- scripts/e2e-run.mjs
- scripts/e2e-run.test.mjs

문서 7개: 이 spec, 130 review/handoff, STATE/NEXT/CURRENT/live.
기존 코드의 load/clear/dispose 정책·URL/CORS/ready snapshot 의미는 변경하지 않는다.
기본 UI/CSS/Composer/Rules/config/manifest/lockfile/보호23 수정0.
실사진/실제UID/Firebase/운영/삭제/발행/배포/설치/다운로드/예약자동화0.

## WHAT / HOW

1. 두 실제 factory의 반환 확장 타입(LocalImageProofController/TemplateArtProofController)에
   readReadyProof(expectedState: unknown)를 추가한다. 기존 BindingController 타입은 유지하여
   합성 space owner 계약을 넓히지 않는다. 기존 snapshot 객체와
   === 일치할 때만 검사한다. 외부 expectedState의 getter는 읽지 않는다.
   disposed, idle/loading/failed, pending 존재, ready 부재 또는 ready가 현재 세대가 아니면 null.
2. private ready record에 그 load의 generation 및 고유 opaque identity를 둔다.
   각 성공 완료마다 새 identity를 부여한다. URL/drawable/Blob/문자열 ID를 proof에 내보내지 않는다.
3. 반환은 frozen {isCurrent():boolean}. 발급 당시 generation, ready.identity, 안전한 snapshot
   참조만 캡처한다. ready record/drawable 자체를 proof closure가 직접 캡처하지 않는다.
   isCurrent는 !disposed, 같은 generation, pending 없음, 같은 state 객체, 같은 ready.identity를
   모두 만족할 때만 true다. 호출에 IO/상태변경/notify/retain/release/타이머0.
   dispose 후 snapshot이 ready로 남아도 false; 다른 owner의 같은 imageRef는 대체 증명이 아니다.
   clear/새 load/실패/교체 후 옛 증명 부활0. 동일 세대 handler 중복 완료도 옛 snapshot/identity 무효.
4. hook의 readReadyProof()는 해당 render의 state와 controller를 고정해 호출한다.
   나중에 controller.getSnapshot()을 읽어 옛 render가 새 준비본을 자동 채택하지 않는다.
   StrictMode의 existing owner 교체 규약·effect 수·deps 불변. 앱 화면에 새 호출자/행동 추가0.
5. art 없음은 ready proof로 위장하지 않는다. projection이 art 없음을 명시하는 경우의 source
   정책은 후속 연결 계약에서 다룬다. 이 proof는 render plan/폰트/입력 전체의 현재성 증명이 아니다.
6. 새 --local-image-owner-only selector만 추가: canvas-surface.spec.ts에
   --grep local.*image.binding --workers=1. 기본 selector 및 기존 시험은 변경0.
   로컬 user image binding 7건 + real hook lifecycle 4건을 선택하며 customer route/보호018PNG 시험 제외.
   CLI 임의 args/조합은 기존처럼 거부한다.

## VERIFY

- 새 controller 시험: null 상태들, exact snapshot, fake/Proxy getter0, frozen/정보 최소,
  repeated read IO/notify0, clear/load/invalid/error/dispose/late/동일ref 다른owner/중복 완료,
  외부 port/notify 재진입 중 false, 원 binding/URL 해제 동작 불변.
  129 source의 isCurrent에 실제 controller proof를 연결해 source/borrow가 무효화되는지 확인.
- hook SSR 시험: 초기 IO0/null, ready proof forwarding, old render가 새 snapshot 자동 채택0.
  SSR로 effect/StrictMode 증명을 주장하지 않는다. 기존 native hook lifecycle 4건은 별도 회귀다.
- targeted 신규2 + 기존 localImageBinding/templateArtBinding/useLocalImageBinding +129시험.
- node node_modules/vitest/vitest.mjs run scripts/e2e-run.test.mjs
- node scripts/check.mjs: format/lint/typecheck/unit/build.
- node scripts/e2e-run.mjs --local-image-owner-only (기존 11 목표).
- node scripts/e2e-run.mjs --pair-paint-chromium-only (기존 20).
- 고객 JS는 실제 controller/hook 추가로 SHA 변경이 예상된다. 크기/해시를 기록한다.
  CSS 및 admin JS는 불변을 확인한다. 변경된 JS를 기존 SHA로 잘못 보고하지 않는다.
- 보호23 SHA 불변, exact code8/docs7, diff--check, 자기 staging 부재/포트0.
- 완료 후 자체 재검수→code/docs 분리 일반 commit/push→Git0/0.119 지속 승인 범위.

## RISK / STOP / 다음

ready-state proof는 pixel snapshot/GC 증명도, React committed source 결속 증명도 아니다.
추가 mutation/API/제품 선택이 필요하면 계약 밖 코드를 임의 변경하지 않는다.
현재 owner의 기존 lifecycle 결함을 발견하면 범위·영향을 먼저 분리해 기록한다.
다음은 이 port들을 129에 전달할 실제 commit phase와 입력 즉시무효화의 정확 계약이다.
일반 구조 검토는 사용자 재승인 대기가 아니며 실질 제품/권한 선택만 질문한다.
전체 리빌드 완료율 분모와 잔여 총스펙 수 UNCONFIRMED, 실제 룸 UI/사진/운영 미완.

### QUESTIONS

새 제품 질문 없음.

### DONE (Codex)

01a35fa DONE / CODEX_PASSED (동일 Codex 자체검수).
R1 후 targeted192 / 전체 check3725=3689+36 (122파일) PASS.
신규36=controller29+hook SSR6+selector1. format/lint368, typecheck7, build2 PASS.
기존 Chromium local owner11(4.7s)+pair20(4.9s)=31 PASS.
보호23 SHA 불변, exact code8/docs7, diff--check PASS. temp pFO4t3/vTWBl0 부재·포트0.
고객 index-DEIIu6v-.js 345944bytes (이전345362 대비 +582),
SHA256 FAF40F5709E329CACC4E2DB730326F224FB4B84C590561EB5CFB5C663021CB43.
고객CSS/adminJS 해시 불변. 실제 React source 결속/실사진/실기기/운영은 NOT TESTED.

R1 기록: 최초 targeted192 PASS 뒤 check의 기존 SyntheticArtOwner/FakeArtOwner typecheck4건 FAIL.
공통 BindingController에 필수 메서드를 추가한 호환 오류. 실제 factory 반환 확장 타입과 hook의
owned 타입에만 한정하여 보완한다. 기존 fake/fixture 수정0, 필수 proof를 optional로 완화하지 않음.
