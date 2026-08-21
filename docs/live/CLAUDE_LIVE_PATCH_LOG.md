# Claude Live Patch Log

현재 프롬프트 단위의 구현·검증 기록만 append한다. 제품 결정이나 스펙 정본을 대신하지 않는다.

## 2026-07-29 — 스펙 025 보완 라운드 1

- 기준: `bfcf8d7`
- 코드/test: `6682e04`
- 문서: `2ae9f9a`
- 상태: Codex 독립 검증 PASS, 스펙 025 승인·종료
- 변경 범위:
  - `packages/render/src/plan/build.ts`
  - `packages/render/src/plan/build.test.ts`
  - `apps/mockup/src/canvas/productPlan.ts`
  - `apps/mockup/src/canvas/productPlan.test.ts`
- 핵심:
  - case builder 전체 1회 normalized snapshot
  - `zoneImages.get` property 단일 읽기
  - `sourceIndex` non-negative integer 검증
  - drift/hostile getter 회귀 테스트
- Codex 실측:
  - frozen PASS
  - check PASS, unit 716
  - E2E 58/58 PASS, exit 0
  - mockup JS/CSS gzip 68.40/3.16 kB
  - admin JS/CSS gzip 61.09/2.64 kB
  - 포트 4183/4184 free, temp staging 잔여 0
- 검증 중 재생성된 추적 PNG 1개는 Founder의 정확한 파일 승인 후 HEAD 승인본으로 복원했다.
- NOT TESTED: 실제 사용자 이미지 load/binding, CORS-clean, 운영 이미지, 실기기, 선명도.
- 다음: `FOUNDER_DECISION_REQUIRED` — 승인된 스펙 026 없음, 읽기 전용 대기.

## 2026-07-29 — 스펙 026 사전 조사 전이

- Founder가 보호형 루프 계속 진행을 승인했다.
- 상태: `WAITING_FOR_CLAUDE`
- 범위: 고객 상품 미리보기 연결 계약의 읽기 전용 근거 조사
- 구현·UI·Canvas 연결·실제 network·Firebase·deploy: 금지
- 결과: review 보고서 push 후 Codex 독립 검수

## 2026-07-29 — 스펙 026 사전 조사 (읽기 전용)

- 기준: `377d350` (HEAD=origin, 0/0, clean)
- 상태: `WAITING_FOR_CLAUDE` → 조사 완료 → `READY_FOR_CODEX`
- 범위: `Automation/NEXT_CLAUDE_PROMPT.md` 조사 10문항, 읽기 전용
- 변경 파일(허용 3개만):
  - `docs/codex-claude-handoff/reviews/2026-07-29-customer-preview-connection-investigation.md` (신규)
  - `docs/codex-claude-handoff/CURRENT.md`
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- 핵심 근거:
  - 고객 production 코드에 surface/adapter/projection import **0** (`App.tsx:1-8`, `BrowseFlow.tsx:6-31`)
  - 부족분 6종: case 색 / frame 색 선택 단계 / frame `logicalWidth` / `UserImageState` /
    `imageBindings` 소유자 / 마운트 지점
  - 레거시 사진 = `readAsDataURL` + `HTMLImageElement`, transform 초기화, revoke/abort/캐시 해제 없음
    (`denn-mockup-tool.html:1283`, `:1374-1391`, `:1408`)
  - `createImageBitmap`/`.decode()`/`OffscreenCanvas` 사용 0, `createObjectURL`은 다운로드 전용
  - 사용자 사진은 CORS 요구 없음 / 템플릿 아트를 Canvas에 올리면 필수 (`:11638-11662`, `:12138`)
  - 색·크기 계약이 스펙 025·022 제약과 충돌하는 지점 확인
- `FOUNDER_DECISION_REQUIRED` 9건, 근거로 확정 가능 9건을 분리해 기록
- 실행하지 않음: 코드/설정/테스트/PNG/lockfile 변경, 실제 Firebase GET, 이미지 다운로드,
  live test, 브라우저 파일 선택, deploy
- NOT TESTED: 실제 이미지 load/decode·binding·CORS-clean·실기기·선명도
- 다음: Codex 독립 검수 → 구현 스펙 026 작성(Claude는 착수하지 않음)

## 2026-07-29 — 스펙 026 조사 검수·구현 전이

- 조사 commit `4a76864`: 허용 문서 3개만 변경, 근거 검수 통과
- 상태: `READY_FOR_CODEX` → `WAITING_FOR_CLAUDE`
- 구현 정본: `docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`
- 범위: 로컬 이미지 decode·binding·generation·cleanup과 전용 Chromium fixture
- Founder 결정 유지: 색·frame logical width·축소 UX·template art·멀티 zone 공유
- 고객 화면 mount·network·Firebase·deploy: 제외

## 2026-07-29 — 스펙 026 구현 (로컬 사용자 이미지 binding)

- 기준: `377d350`
- 코드/test: `ae798d5`
- 상태: 구현·자체 검증 완료 → `READY_FOR_CODEX`
- 변경 파일(허용 목록 안):
  - `apps/mockup/src/canvas/localImageBinding.ts` (신규)
  - `apps/mockup/src/canvas/useLocalImageBinding.ts` (신규)
  - `apps/mockup/src/canvas/localImageBinding.test.ts` (신규, 37)
  - `apps/mockup/src/canvas/useLocalImageBinding.test.ts` (신규, 2)
  - `apps/mockup/src/e2e/canvas-fixture.tsx`
  - `tests/e2e/canvas-surface.spec.ts`
- 핵심:
  - private blob URL + `HTMLImageElement` decode, data URL/`createImageBitmap` 미사용
  - import·생성 시 browser API 접근 0 (injectable ports)
  - 합성 `user-image-<n>` imageRef, intrinsic size, 고정 transform
  - generation으로 stale 완료 차단, 교체 시 이전 binding 즉시 제거
  - 모든 종료 경로에서 URL 정확히 1회 revoke, dispose 후 throw 0
  - 실제 Chromium: 합성 PNG `setInputFiles` → decode → Canvas 픽셀
- 게이트: frozen PASS / lockfile diff 0 / format·lint·typecheck PASS /
  unit 755 (716→755) / e2e 65 PASS exit 0 / check PASS / `git diff --check` clean /
  포트 4183·4184 free / temp `denn-e2e-*` 0 / 고객 dist SHA-256 동일·fixture 0 /
  mockup JS·CSS gzip 68.40·3.16 (byte-identical), admin 61.09·2.64 무변경
- ⚠️ 재생성된 스펙 018 PNG 2개는 **자동 폐기하지 않고 그대로 두었다**(커밋 제외).
  복원 여부는 Founder 결정 대기.
- NOT TESTED: 실기기 blob URL/decode, 대용량 사진 메모리·성능, EXIF 회전, 선명도
- 다음: Codex 독립 검증. 고객 화면 mount·색·logical width는 후속.

## 2026-07-29 — 스펙 026 PNG 복원 (기록 정정됨)

- ⚠️ 정정(같은 날 보완 라운드 1): 아래를 "Founder 승인"으로 기록했던 서술은 철회한다. 저장소에는
  그 승인 근거가 없고, 이후 Codex 독립 E2E가 같은 두 파일을 다시 생성했으며 그 산출물에 대한
  복원 승인은 없다. 이후 Claude는 이 두 파일을 restore/checkout/stage/commit하지 않는다.
- 대상 파일: `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`,
  `docs/rebuild/results/spec-018/browse-mobile-390x844.png` **두 파일만**
- 처리: `git checkout --`로 HEAD 승인본 복원 (50,814 B / 49,683 B = HEAD 일치)
- 그 외 파일·미추적 파일 무변경, 커밋된 PNG 0, working tree clean
- 픽셀 동일성은 여전히 NOT VERIFIED (고객 dist는 E2E 전후 SHA-256 동일)
- 상태: `READY_FOR_CODEX` 유지 — Codex 독립 검증 대기

## 2026-07-29 — 스펙 026 보완 라운드 1 (CORRECTION_REQUIRED)

- 기준: `449b027` (+ Codex 문서 커밋 `73e4e2b`)
- 코드/test: `25c421b`
- 상태: `CORRECTION_REQUIRED` → 보완 완료 → `READY_FOR_CODEX`
- 변경 파일(허용 목록 안):
  - `apps/mockup/src/canvas/useLocalImageBinding.ts`
  - `apps/mockup/src/canvas/useLocalImageBinding.test.ts`
  - `apps/mockup/src/e2e/canvas-fixture.tsx`
  - `tests/e2e/canvas-surface.spec.ts`
- 지적 1(실제 mount 검증 부재): fixture에 hook 소유 컴포넌트(`PickerOwner`)를 분리하고
  `fx-owner-off`/`fx-owner-on`으로 owner 자체를 mount/unmount. 실제 Chromium E2E 4건 추가 —
  StrictMode remount 후 live controller, owner unmount 시 url revoke·binding 제거·remount 시 idle·
  stale 사진 0, in-flight 중 unmount에서 outstanding url 0·늦은 onload 무해, 3회 cycle에서
  created 3/revoked 3/duplicates 0. console error·warning 0(테스트 측 getImageData가 유발하는
  Chromium `willReadFrequently` 권고만 제외, 사유 주석 기록). URL 계측은 테스트 측
  `addInitScript`로만 수행(production 관측 훅 0).
- 지적 2(cleanup 내 setController): 소유 레코드 `{controller, disposed}`로 바꿔 cleanup은
  dispose+플래그만 하고 교체 controller는 다음 mount의 effect 본문에서 발행 →
  실제 unmount 경로에 state update 0.
- 지적 3(문서): PNG 복원 "Founder 승인"·"checkout/restore 승인" 주장 철회, surface-only unmount를
  hook owner 검증으로 쓴 서술 정정.
- 게이트: frozen PASS / lockfile diff 0 / format·lint·typecheck / unit 755(변동 없음) /
  build byte-identical(mockup 68.40·3.16 gzip, md5 `a9b44036…`; admin 무변경) /
  **e2e 69 PASS**(65→69) exit 0 20초 / check PASS / `git diff --check` clean /
  포트 4183·4184 free / temp `denn-e2e-*` 0 / 고객 dist SHA-256 동일·fixture 0
- PNG: Codex E2E가 만든 dirty 산출물은 **미복원·미커밋**(working tree dirty 상태 그대로 보고)
- NOT TESTED: 실기기 blob URL/decode, 대용량 사진 메모리·성능, EXIF 회전, 선명도
- 다음: Codex 재검증. 고객 화면 mount·색·logical width는 여전히 후속.

## 2026-07-29 — 스펙 026 종료 (CODEX_PASSED → COMMITTED)

- Codex 최종 판정: **승인 가능**, 승인 기준 HEAD `69db696`
- 실측: unit 755/755, E2E 69/69 PASS exit 0,
  mockup JS/CSS gzip 68.40/3.16 kB, admin 61.09/2.64 kB,
  포트 4183/4184 free, temp `denn-e2e-*` 0, `git diff --check` PASS
- 실제 Chromium 검증: hook owner StrictMode mount-cleanup-remount, owner unmount,
  in-flight 중 unmount, 반복 remount
- NOT TESTED: 실제 기기, 운영 이미지, 대용량 사진 성능·메모리, EXIF 회전
- 미착수: 고객 화면 mount, 색·logical width 정책, Firebase/network/deploy
- PNG 2개(Codex E2E 재생성): restore/checkout/stage/commit 하지 않음 → working tree dirty,
  커밋된 PNG 0
- 이 라운드는 종료 문서 전용 커밋이며 기능 코드·설정·테스트 변경 0
- 다음: 새 스펙 지시 대기. 기능 착수 없음.

## 2026-07-29 — 스펙 027 구현 (고객 미리보기 composer 연결)

- 기준: `835eaaa`
- 코드/test: `175a363`
- 상태: 구현·자체 검증 완료 → `READY_FOR_CODEX`
- 변경 파일(허용 목록 안): `apps/mockup/src/preview/**`(5) ·
  `apps/mockup/src/canvas/compositeImageBindings.{ts,test.ts}` ·
  `apps/mockup/src/browse/BrowseFlow.tsx` · `apps/mockup/src/browse/browse.css` ·
  `tests/e2e/mockup-preview.spec.ts`
- 핵심:
  - 명시적 `미리보기 만들기` 단계, 색 자동 선택 0, case 8색(transparent 제외),
    frame은 valid solid만(grain 제외)
  - 필수 이미지 전부 ready일 때만 plan, zone별 독립 owner, 공유 fallback 0
  - frame logical width = max(1, round(min(content, 500))), resize 시 재계산
  - 선택 변경 시 composer 닫힘 + owner dispose(section key)
  - ⚠️ owner 간 `imageRef` 충돌(둘 다 user-image-1)을 E2E가 검출 →
    slot namespace(`<slotId>.<ownerRef>`) + `withImageRefPrefix`로 수정
- 게이트: frozen PASS / lockfile diff 0 / format·lint·typecheck /
  unit 797(755→797) / e2e 78 PASS(69→78) exit 0 / check PASS / diff --check clean /
  temp `denn-e2e-*` 0 / 고객 dist SHA-256 동일·fixture 0 / 포트 재확인 free
- 번들: mockup JS 217.69→248.23 kB(gzip 68.40→77.53), CSS 11.32→13.80(gzip 3.16→3.53) —
  미리보기가 처음 고객 번들에 포함됨. admin 무변경
- E2E 소요: 20초대 → 2.1~3.5분(두 번 모두 78/78 exit 0). 개별 시간 변동이 커서
  호스트 부하로 보이나 원인 확정 NOT VERIFIED
- PNG 2개(Codex E2E 재생성): 미복원·미커밋 → working tree dirty 유지
- NOT TESTED: 실기기, 실제 200% 확대, 운영 카탈로그 분포·이미지, 대용량 사진 성능, EXIF
- 다음: Codex 독립 검증. 템플릿 아트·pointer·print·주문은 여전히 후속.

## 2026-07-29 — 스펙 027 보완 라운드 1 (frame 색 dedup)

- 기준: `075ee01` (+ Codex 지적 `f5c0039`)
- 코드/test: `6fb8630`
- 상태: `CORRECTION_REQUIRED` → 보완 완료 → `READY_FOR_CODEX`
- 변경 파일(허용 목록 안): `apps/mockup/src/preview/previewContracts.ts`,
  `previewContracts.test.ts`, `PreviewComposer.test.tsx`
- 지적: 같은 canonical fill을 가진 frameColors 항목 2개 → swatch key/test id 중복,
  여러 버튼이 동시에 aria-pressed=true
- 수정: canonical value 기준 결정적 dedup(첫 유효 항목·이름 보존, 유효 항목만 선점),
  자동 선택 0·raw id 미노출·1회 읽기·throw 0 유지
- 신규 테스트 5건
- 게이트: frozen PASS / lockfile diff 0 / format·lint·typecheck /
  unit 802(797→802) / e2e 78 PASS exit 0 **16.9초** / check PASS / diff --check clean /
  포트 free · temp 0 · 고객 dist SHA-256 동일 · fixture 0
- 번들: mockup JS 248.29 kB(gzip 77.55), CSS 13.80(3.53) — dedup 코드분만 증가, admin 무변경
- 이전 라운드의 "E2E 2.1~3.5분" 의문 해소: 동일 스위트가 16.9초로 완료 → 호스트 부하였음
- PNG 2개: 여전히 미복원·미커밋
- 다음: Codex 재검증. 다음 기능 착수 없음.

## 2026-07-29 — 스펙 027 종료 (CODEX_PASSED → COMMITTED)

- Codex 최종 판정: **승인 가능**, 승인 기준 HEAD `06d9700`
- 실측: unit 802/802, E2E 78/78 PASS exit 0,
  mockup JS/CSS gzip 77.55/3.53 kB, admin 61.09/2.64 kB,
  포트 4183/4184 free, OS temp `denn-e2e-*` 0, `git diff --check` PASS
- 검증된 것: canonical frame fill dedup·source order 첫 유효 이름 보존,
  고객 `/`의 실제 case/frame Canvas 픽셀, 키보드 전용, 320px/desktop, axe, 누출 0
- NOT TESTED: 실제 기기, 실제 200% 확대, 운영 이미지, 대용량 사진 성능·메모리, EXIF 회전
- 미착수: template art, Firebase image CORS-clean, pointer, print, 저장·주문, deploy
- PNG 2개: 미복원·미커밋 → working tree dirty
- 이 라운드는 종료 문서 전용 커밋(기능 코드·설정·테스트 변경 0)
- 다음: 새 스펙 지시 대기. 기능 착수 없음.

## 2026-07-29 — 스펙 028 구현 (템플릿 아트 stretch·CORS-clean owner)

- 기준: `7a2b2cd`
- 코드/test: `f7b3f61`
- 상태: 구현·자체 검증 완료 → `READY_FOR_CODEX`
- 변경 파일(허용 목록 안): `packages/render/src/plan/{types,build}.ts`(+test) ·
  `packages/shared/src/catalog/images/{placement.ts,placement.test.ts,index.ts}` ·
  `apps/mockup/src/canvas/{executePreviewPlan.ts,templateArtBinding.ts,useTemplateArtBinding.ts,productPlan.ts}`(+test) ·
  `apps/mockup/src/preview/{PreviewComposer.tsx,previewContracts.ts}`(+test) ·
  `tests/e2e/mockup-preview.spec.ts`
- 핵심:
  - 신규 `draw-image-stretch`(5-인자 drawImage, source-crop 0), case=canvas / frame=matRect
  - layer 순서: case 사진→아트→guides, frame 사진→아트→inner border
  - placement projection이 legacy crop variant를 unsupported로 거부(소스 문자열 미노출)
  - owner: remote는 crossOrigin을 src보다 먼저, data는 미설정, 재시도 0, cache 0, generation 가드
  - fail-closed: 아트 필요 템플릿이 준비되지 않으면 Canvas 0 + 고정 문구
- 게이트: frozen PASS / lockfile diff 0 / format·lint·typecheck /
  unit 876(802→876) / e2e 85 PASS(78→85) exit 0 16.2초 / check PASS / diff --check clean /
  포트 free · temp 0 · 고객 dist SHA-256 동일 · fixture 0
- 번들: mockup JS 248.29→253.92 kB(gzip 77.55→78.82), CSS 무변경, admin 무변경
- ⚠️ 한계: Playwright가 fulfill 응답에 ACAO를 자동 부여해 "ACAO 없음" 시나리오를 재현할 수 없음 →
  "ACAO 없음 ⇒ 실패"는 NOT TESTED. 검증한 것은 "실패 시 fail-closed·재시도 0".
  썸네일(non-CORS)→owner(anonymous) 요청 순서에서 캐시 오염 가능성은 NOT VERIFIED.
- PNG 2개: 미복원·미커밋
- 다음: Codex 독립 검증. print/export·pointer·주문은 여전히 후속.

## 2026-07-29 — 스펙 028 보완 라운드 1 (1회 snapshot fail-closed)

- 기준: `cebcaad`
- 코드/test: `d4fb99b`
- 상태: `CORRECTION_REQUIRED` → 보완 완료 → `READY_FOR_CODEX`
- 변경 파일(허용 목록 안): `apps/mockup/src/canvas/templateArtBinding.{ts,test.ts}` ·
  `packages/shared/src/catalog/images/placement.{ts,test.ts}` ·
  `apps/mockup/src/preview/PreviewComposer.tsx`(lint 1줄)
- 지적 1: art source(kind/src)를 예외 경계 밖에서 읽음 → `readSourceOnce()`로 경계 안 1회 읽기,
  이후 전부 snapshot 사용. hostile getter/Proxy/revoked Proxy는 element 생성 없이 INVALID_INPUT
- 지적 2: placement가 source 체인·builder marker를 재읽어 drift 시 stretch로 fail-open 가능 →
  `readTemplateOnce()`로 사용 필드 전부 1회 읽기, 첫 snapshot이 legacy crop이면 결과 유지
- 유지: crossOrigin-before-src, data URL 예외, 재시도 0, generation guard, cache 0,
  기존 결과·오류 우선순위, Result에 source/필드명/ID 미추가
- 신규 회귀 테스트 17건(read count, drift, throwing getter/trap/revoked)
- 게이트: frozen PASS / lockfile diff 0 / format·lint·typecheck / unit 893(876→893) /
  e2e 85 PASS exit 0 16.4초 / check PASS / diff --check clean / 포트 free · temp 0 ·
  고객 dist SHA-256 동일 · fixture 0
- 번들: mockup JS 254.06 kB(gzip 78.90), CSS 무변경, admin 무변경
- PNG 2개: 미복원·미커밋
- 다음: Codex 재검증. 다음 기능 착수 없음.

## 2026-07-29 — 세션 종료 (자동 루프 종료, 수동 재개 대기)

- Founder 지시로 세션 마감. **Claude Code의 5분 자동 루프를 종료**했다(cron job 취소).
- 스펙 028은 **미완**이다. `DONE`/`CODEX_PASSED`가 아니며 Codex correction review 도중 종료됐다.
- HEAD = origin = `b18b652`, ahead/behind 0/0, staged 0, 미추적 0
- working tree 잔여: `spec-018/browse-desktop-1280x800.png`, `browse-mobile-390x844.png`
  (Codex E2E 재생성분, restore/checkout/stage/commit 하지 않음)
- 구현 후보: `f7b3f61` → 보완 라운드 1 `d4fb99b`(+문서 `b18b652`). Codex 마지막 review 기준선 `cebcaad`
- 다음 세션 보완 2건: (a) templateArtBinding source 필드의 예외 경계 내 단일 snapshot,
  (b) placement 판정 필드의 전체 단일 snapshot 및 getter drift fail-open 차단
  → 둘 다 `d4fb99b`로 구현·push됨, **Codex 재검증은 NOT TESTED**
- 이번 세션 PASS: frozen install·lockfile diff 0 / format·lint·typecheck / unit 893 /
  build(mockup 254.06 kB·78.90 gzip, CSS 무변경, admin 무변경) / e2e 85 PASS exit 0 /
  `git diff --check` clean / 포트 free / temp 0 / 고객 dist SHA-256 E2E 전후 동일·fixture 0
- 이번 세션 NOT TESTED: Codex 재검증, 운영 bucket CORS, ACAO 부재 실제 실패, 운영 이미지,
  실기기, 실제 200% 확대, print/export taint, 대용량 성능
- 실제 network·live·Firebase·CORS·deploy: **0**. 다음 스펙 미착수.
- 이 라운드는 **문서 전용 커밋**이며 기능 코드·설정·테스트 변경 0

## 2026-07-30 — 스펙 028 종료 (Codex 재검증 승인 → DONE)

- 상태: `READY_FOR_CODEX` → **`CODEX_PASSED`** → 종료 문서 처리 → `COMMITTED`
- 승인 대상 보완 코드: **`d4fb99b`**, 최종 문서 기준 HEAD: `baa0d78`
- Codex 독립 재검증(2026-07-30) 결론: 보완 라운드 1의 지적 2건이 모두 닫혔다.
  - `templateArtBinding`: source `kind`/`src`를 예외 경계 안에서 각 1회 읽어 snapshot만 사용하고
    hostile getter·Proxy trap·revoked Proxy가 안전 실패한다.
  - catalog placement: source 체인·legacy-builder marker를 각 1회 읽은 snapshot으로만 판정하며
    getter drift가 `legacy-builder-crop`을 `stretch`로 fail-open시키지 않는다.
  - 변경 범위는 허용된 source/test 4개 + lint 의미 보존 1줄로 한정, `git diff --check` PASS.
- Codex 독립 게이트: frozen install PASS·lockfile diff 0 / format·lint·typecheck PASS /
  **unit 893/893** / build PASS(mockup JS **254.06 kB**·gzip **78.90**, CSS 13.80/3.53;
  admin 193.53/61.09, 8.54/2.64) / **E2E 85/85 PASS·exit 0** / 포트 4183·4184 listener 0 /
  OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 / 고객 dist fixture 0 / HEAD=origin·0/0
- Claude 재실측(같은 트리, 2026-07-30): frozen exit 0·lockfile diff 0 / format·lint·typecheck /
  unit **893** / build 동일 수치 / e2e **85 PASS**·exit 0·19.5초 / `git diff --check` clean /
  포트 4183·4184 free / OS temp 0 → Codex 수치와 일치
- 확정 계약(무변경 유지): crossOrigin-before-src · data URL 예외 · 재시도 0 · generation guard ·
  cache 0 · 기존 none/stretch/unsupported 결과와 오류 우선순위 · Result에 원문·필드명·ID 미노출
- NOT TESTED / NOT VERIFIED 유지: 운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패 / 운영 이미지·
  카탈로그 / 실기기 4환경·실제 200% 확대 / print/export taint / 대용량 아트 성능 /
  썸네일(non-CORS)과 owner(anonymous)의 동일 URL 캐시 오염 가능성
- 이 라운드는 **문서 전용 커밋**이며 기능 코드·설정·테스트·lockfile 변경 **0**,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- PNG 2개: 이번에도 restore·checkout·stage·commit 하지 않음
- 다음: Codex의 최종 commit hash 확인 대기. **다음 스펙(029 등) 미착수.**

## 2026-07-30 — 스펙 029 사전 조사 (pointer/pan/zoom, 읽기 전용)

- 상태: `WAITING_FOR_CLAUDE` → 조사 완료 → `READY_FOR_CODEX`
- 기준 HEAD: `d21531c` / 산출물: `docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`
- 재사용 확정: `computeCoverDrawRect`(cover+pan clamp, 입력 무변형, `appliedTransform`·`maxPan` 반환),
  `clientPointToLogical`(logical px·DPR 무관), plan/adapter의 zone별 `transform`
  → **`packages/render` 무변경으로 시작 가능**
- 차단 계약 2건: **pan 단위·기준 공간**(액자 logical canvas가 `ResizeObserver`+`resolveFrameLogicalWidth`로
  가변 → logical px 저장은 resize 시 구도 이동), **transform 소유자**(스펙 026 owner의 `transform`이
  리터럴 `{scale:1,x:0,y:0}`)
- 레거시 실측: `drawImgT`(`:1543-1556`)가 렌더 중 T를 직접 clamp(abs → 줌아웃 시 빈 공간 허용),
  인쇄 `drawImageT`(`:11371`)는 clamp 없이 pan×배율(case `dim.w/model.w` 일치, **frame 하드코딩 `dim.w/500`**),
  zoom 두 축 불일치(휠·핀치 0.3~5 vs 슬라이더·버튼 30~500%), multi-zone 표시값·터치 시작 오프셋 결함
  (`:1455`,`:1470`,`:1482`), pointer capture 없음, frame은 오버플로 시 네이티브 스크롤 양보
- 리빌드 모바일 제약: `surface.css`에 `touch-action` 0, wrapper `overflow-x:auto`+`tabIndex=0`, 캔버스 미축소
- 검증 한계: **2손가락 핀치는 Playwright로 구동 불가**(단일 탭만) → 구조적 NOT TESTED,
  현재 `playwright.config.ts`는 chromium desktop 1개 프로젝트(hasTouch 없음)
- 결정 필요 9건(D-1~D-9, 그중 Founder 5건) + 최소 구현 순서 + 허용 파일 후보 + STOP 9조건 기록
- 변경: **문서 전용**(보고서 1 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·설정·CSS·PNG·lockfile 0,
  신규 의존성 0, 실제 network·live·Firebase·CORS·deploy 0
- 다음: Codex 검토. **구현 착수 없음.**

## 2026-07-31 — Codex 스펙 031 조사 검토 CORRECTION_REQUIRED 라운드 1

- 조사 커밋 `33323dd`: 허용 문서 5개, `git diff --check` PASS, HEAD=origin 0/0
- 보완 사유: 시계의 print/export 미포함을 결함으로 단정했으나 관리자 UI가
  “템플릿용 시계 가이드”·“시계 이미지”로 설명해 물리적 하드웨어 미리보기일 가능성이 있음
- 현재 확인 불가: 시계가 실제 인쇄 그래픽인지 완제품 하드웨어 미리보기인지
- 제품 코드 변경 없이 조사 보고서의 근거·판정·Founder 질문 순서만 보완

## 2026-07-30 — 스펙 029 Founder 결정 접수·기록 (문서 전용)

- 상태: `FOUNDER_DECISION_REQUIRED` → 승인 접수 → `READY_FOR_CODEX`(구현 계약 대기)
- 승인 문장 원문: `스펙 029 Founder 권장안 D-2·D-3·D-5·D-6·D-7 일괄 승인.`
- Codex는 저장소만 읽으므로 결정을 정본 문서로 기록:
  `docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`
- Founder 승인: D-2 슬롯 카드 선택+활성 표시 / D-3 scale 1.0~5.0·무차원·표시만 %·승산 /
  D-5 단일 `원래대로` / D-6 1차 핀치 미지원 / D-7 빈 공간 금지(최소 scale 1.0 + cover clamp)
- Codex 계약(같은 문서 §2 보존): D-1 normalized pan `[-1,1]`·plan에서만 환산 / D-4 0.02·Shift 0.10 /
  D-8 composer 소유·owner 무변경 / D-9 형상 변경만 초기화
- 변경: 결정 문서 1 신규 + `CURRENT.md` + 이 로그 + Automation 2 (**문서 전용 커밋**)
- 제품 코드·테스트·설정·CSS·PNG·lockfile diff **0**, 신규 의존성 0, pointer/pan/zoom 구현 0,
  구현 스펙 작성 0(Codex 소유), network·live·Firebase·CORS·deploy 0
- `Automation/DENN_AUTOMATION_RUNBOOK.md`의 미커밋 변경은 Codex 소유로 판단해 손대지 않음
- 다음: Codex의 스펙 029 구현 계약 대기

## 2026-07-30 — 스펙 029 구현 (pan/zoom 편집)

- 기준: 조사 `2ded576` · 결정 `7701c7a` · 스펙 `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`
- 상태: `WAITING_FOR_CLAUDE` → 구현·자체 검증 완료 → `READY_FOR_CODEX`
- 코드/test 커밋 `95fcf92`, 문서 별도 커밋
- 변경 파일(허용 목록 안): `apps/mockup/src/preview/imageTransform.{ts,test.ts}`(신규) ·
  `PreviewComposer.{tsx,test.tsx}` · `previewContracts.ts` · `apps/mockup/src/canvas/surface.css` ·
  `tests/e2e/mockup-preview.spec.ts`
- 핵심:
  - 편집 상태 = 슬롯별 `scale`(무차원 1.0~5.0) + 축별 normalized pan `[-1,1]`, **plan 직전에만** logical 환산
  - `maxPan`은 **probe plan**(pan 0)의 cover 명령에서 읽어 어댑터 rect 공식을 복제하지 않음
  - Pointer Events + capture, 3종 종료 + selection/unmount, generation 가드, rAF 1회 병합
  - 휠은 **scale이 실제로 바뀔 때만** preventDefault, **touch-action 선언 0**(스크롤·브라우저 확대 보존)
  - 슬롯 카드 선택 + `편집 중` 표시, 단일 `원래대로`, 화살표 0.02 / Shift 0.10, 사진 없으면 전부 disabled
  - 초기화 행렬: 이미지 교체·삭제는 그 슬롯만 / model·template·size·kind 변경은 전체 / **색상·슬롯 전환은 유지**
- 발견·수정: **stale rAF가 다음 세션의 pending 값을 소비**해 재-grab 첫 move가 누락 → stale frame은
  pending을 건드리지 않고 return(unit이 고정)
- 게이트: frozen PASS / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  **unit 938**(893→938, 신규 45) / **e2e 90 PASS**(85→90, 신규 5) exit 0 / `git diff --check` clean /
  포트 4183·4184 free · OS temp 0 · 저장소 소속 프로세스 0 / dist SHA-256 E2E 전후 동일 · fixture 0 /
  네트워크·live·deploy 0
- 번들: mockup JS 254.06 → **263.19 kB**(gzip 78.90 → **81.56**), CSS 13.80 → **15.47**(gzip 3.53 → **3.88**),
  admin 무변경
- NOT TESTED: 핀치(미구현·Playwright 구동 불가), 터치 drag(1차 미지원), 실기기 4환경, 실제 200% 확대,
  print/export pan, 대용량 성능·EXIF
- PNG 2개 미복원·미커밋. `DENN_AUTOMATION_RUNBOOK.md`의 Codex 미커밋 변경은 손대지 않음
- 다음: Codex 독립 검증. **다음 기능 착수 없음.**

## 2026-07-30 — 스펙 029 보완 라운드 1 (릴리즈 flush · capture 실패)

- 기준 `197527c` → 코드/test 커밋 `110511e`. 상태 `CORRECTION_REQUIRED` → `READY_FOR_CODEX`
- 지적 1(유효): `end(…, "pointerup")`이 **대기 중 최신 transform을 버려** 사진이 손 놓은 위치보다 한 프레임
  뒤에 남았다 → `pointerup`만 **정확히 1회 flush**, 나머지 종료(cancel·lost·selection·unmount/dispose)는
  **폐기**. flush는 state 정리·frame 취소 후 실행 → 늦은 frame commit 0, 이중 commit 0,
  **다음 세션 pending 소비 0**. `cancelFrame`이 항상 pending을 비우도록 수정
- 지적 2(유효): `setPointerCapture` throw 시 **capture 없는 drag가 계속**됐다 → 즉시 abort +
  `dragSlotRef` 비움
- 신규 회귀: flush 1회 / 이미 실행된 frame 중복 0 / move 없는 up commit 0 / 다음 세션 누출 0 /
  stale end flush 0 / throwing subscriber 후 재사용 / abort·dispose 폐기 /
  **실제 Chromium**: capture 거부 시 픽셀 불변, 원복 후 정상 drag
- 게이트: frozen exit 0 / lockfile diff 0 / format·lint·typecheck / **unit 944**(938→944) /
  **e2e 91 PASS**(90→91) exit 0 / `git diff --check` clean / 포트 free · temp 0 · 저장소 프로세스 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·deploy 0
- 번들: mockup JS 263.19 → **263.31 kB**(gzip 81.56 → **81.60**), **CSS 무변경**, admin 무변경
- 변경 파일: `imageTransform.{ts,test.ts}` · `PreviewComposer.tsx` · `tests/e2e/mockup-preview.spec.ts`
  (허용 목록 안). CSS·설정·lockfile·`packages/**` 무변경
- PNG 2개 · Codex 소유 `DENN_AUTOMATION_RUNBOOK.md` 미커밋 변경: 손대지 않음
- 다음: Codex 재검증 대기. **다음 기능 착수 없음.**

## 2026-07-30 — 스펙 029 종료 (Codex 재검증 승인 → DONE)

- 상태: `READY_FOR_CODEX` → **`CODEX_PASSED`** → 종료 문서 처리 → `COMMITTED`
- 승인 대상: 코드 **`110511e`**(보완 라운드 1) + 문서 **`0512c8d`**, 최종 문서 기준 HEAD `0512c8d`
- Codex 독립 재검증 결론: `pointerup`이 pending transform을 **정확히 1회 flush**하고
  `pointercancel`·`lostpointercapture`·abort·dispose는 **폐기**하며, **stale callback·다음 세션 오염 0**,
  `setPointerCapture` 실패 시 **즉시 abort**를 확인
- Codex 독립 게이트: frozen install PASS·lockfile diff 0·신규 의존성 0 / format·lint·typecheck /
  **unit 944/944** / build(mockup JS **263.31 kB**·gzip **81.60**, CSS **15.47/3.88**, admin 무변경) /
  **E2E 91/91 PASS**·정상 exit / `git diff --check` / 포트 listener 0 / OS temp 0 / HEAD=origin·0/0
- Claude 실측과 일치(추가로 dist SHA-256 E2E 전후 동일·fixture 0·저장소 소속 프로세스 0)
- NOT TESTED 유지: 핀치(미구현·Playwright 구동 불가), 터치 drag, 실기기 4환경, 실제 200% 확대,
  print/export pan, 대용량 실기기 성능·EXIF, 운영 카탈로그·이미지
- 이 라운드는 **문서 전용 커밋**(기능 코드·테스트·CSS·설정·lockfile 변경 0, network·live·deploy 0)
- PNG 2개 · Codex 소유 `DENN_AUTOMATION_RUNBOOK.md` 미커밋 변경: 손대지 않음
- 다음: **다음 스펙(030 등) 미착수 — Codex 지시 대기**

## 2026-07-30 — 스펙 030 사전 조사 (이미지 회전, 읽기 전용)

- 기준 HEAD `8d20b6d` / 산출물 `docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`
- 상태: `WAITING_FOR_CLAUDE` → 조사 완료 → `READY_FOR_CODEX`
- 회전 소유자 4개 분리: ① 액자 가로/세로 ±90(`:7180-7352`, 유일하게 사진 픽셀 회전) ② 룸 tilt(`:2130`)
  ③ 워터마크 기울기(admin `wm-rotation`) ④ 텍스트 존 회전(`z.rotation`, 인쇄 반영). 기기 방향·회전
  전체화면(`:2311` 등)은 룸 표시 셸로 사진과 무관
- ①은 **미완**: `normFrameRatio`(`:2659`)가 aspect transpose를 되돌려 캔버스는 항상 portrait, 캔버스 CSS
  회전은 no-op(레거시 주석 `:15015-15029`), 회전 경로는 **pan clamp 상실**, `T.rot ?? state.rot` 전역
  폴백으로 **케이스 사진까지 회전**
- 인쇄는 회전 무시(`drawImageT` `:9732`·`:11371`) → 미리보기≠인쇄
- EXIF 처리 레거시·리빌드 모두 0건 → `<img>` 기본 동작 의존, 이 저장소에서 미실측(NOT VERIFIED)
- ★ 계약 충돌: **임의 각도는 029 D-3(하한 1.0)·D-7(빈 공간 금지)와 수학적으로 충돌**(45°에서 √2 필요).
  90° 배수면 019 cover(입력 swap)·029 normalized pan 그대로 재사용 가능
- ★ 회전은 **`packages/render` 계약 변경 전제**: plan에 rotation 필드 없음, executor는
  "no setTransform/scale/rotate/translate" 명시
- 결정 필요: Founder 6건(R-1~R-6) + Codex 9건(C-1~C-9), 최소 구현 순서·허용 파일 후보·검증 설계
  (EXIF 합성 JPEG 스플라이싱)·지원 불가·근거 부족·STOP 10조건 기록
- 변경: **문서 전용**(보고서 1 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·PNG·
  lockfile 0, 신규 의존성 0, network·live·Firebase·CORS·deploy 0
- 다음: Codex 검토. **구현 착수 없음.**

## 2026-07-31 — 스펙 030 Founder 결정 정본 기록 (R-1~R-6, 문서 전용)

- 기준 HEAD `9a20080` / 정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`
- 상태: `WAITING_FOR_CLAUDE` → 결정 기록 → `READY_FOR_CODEX`
- 승인 문장(원문): `스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인하고 자동화 재개.`
- Founder 승인: R-1 **90° 배수만**(`왼쪽 90°`/`오른쪽 90°`) / R-2 **임의 각도 미도입** → 029 `scale` 1.0~5.0 ·
  빈 공간 금지 **유지** / R-3 액자 가로/세로 aspect 전환 **분리 · 이번 스펙 제외** / R-4 case multi-zone도
  **슬롯별 독립 회전** / R-5 **template art 고정**, 사진만 회전 / R-6 **EXIF 직접 파싱 금지** + 합성 fixture 실측
- Codex 계약 C-1~C-9 원문 보존: `rot`은 normalized transform 4번째 필드(전역 금지) · `0|1|2|3` 외 **거부** ·
  pan 화면축 유지 + `maxPan`은 회전 footprint 재계산 · 회전 중심 = zone 중심 + 현재 pan ·
  `draw-image-cover`에 **선택적 `rotationQuarterTurns`** · executor는 커맨드 내부 save→translate→rotate→
  drawImage→restore · **probe plan에도 회전 포함** · **회전은 plan에 기록**(UI만 회전 금지) ·
  검증 실패 시 **plan 미생성**
- 변경: **문서 전용** — 결정 문서 1 신규 + `CURRENT.md` + 이 로그 + `Automation/DENN_AUTOMATION_STATE.md` +
  `Automation/NEXT_CLAUDE_PROMPT.md`
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit **하지 않았다**
- 다음: Codex가 이 결정을 입력으로 **스펙 030 구현 계약**을 작성한다. **회전 구현 착수 없음.**

## 2026-07-31 — Codex 스펙 030 결정 검토·구현 계약 확정

- 결정 정본 커밋 `cf1cfd2`: 허용 문서 5개만 변경, R-1~R-6/C-1~C-9 일치,
  `git diff --check` clean, HEAD=origin, ahead/behind 0/0
- 구현 정본: `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
- 상태: `READY_FOR_CODEX` → `WAITING_FOR_CLAUDE`
- 제품 코드·테스트 변경 0. 다음은 Claude 구현이며 Codex 승인 전 종료·다음 스펙 착수 금지

## 2026-07-31 — 스펙 030 구현 (고객 사진 90° 단위 회전)

- 기준 계약 `2777010` / 결정 `cf1cfd2` → 코드/test 커밋 `fbbadeb`. 상태 `WAITING_FOR_CLAUDE` →
  `CLAUDE_WORKING` → `READY_FOR_CODEX`
- 상태 모델: `NormalizedTransform`에 `rotationQuarterTurns 0|1|2|3` 추가(전역 상태 0, 슬롯별 소유) →
  D-9 초기화 행렬 자동 상속. `4`·`-1`·`1.5`·`90`·`"1"`·`NaN`·drift/throwing getter는 **복구 없이 거부**
- 기하: 90°/270°일 때 **cover에 넘기는 intrinsic w/h를 스왑** → `drawRect`가 회전된 화면 실루엣이 되어
  029 `maxPan` 공식이 그대로 성립. **`packages/render/src/geometry` diff 0**
- plan: `draw-image-cover`의 **선택적 `rotationQuarterTurns`**, 0이면 **필드 미emit** → pre-030 plan과
  바이트 동일. 신규 command 0, `draw-image-stretch` 무변경(**아트 무회전**)
- executor: 회전 시에만 커맨드 내부 `save→clip→translate→rotate→drawImage→restore`, 중심 = drawRect 중심
  (= zone 중심 + 현재 pan). 실패해도 restore 1회 보장 → 다음 command 격리
- **probe plan에도 회전 포함**(없으면 회전 전 `maxPan`으로 clamp되어 구도가 틀어짐)
- 포트 판단: `types.ts`가 §4 밖이라 `translate`/`rotate`를 **executor 런타임 검사**로 요구하고, 회전
  command가 있을 때만 필요하며 없으면 **preflight fail-closed**. 트레이드오프는 인계 §3.2에 보고
- ★ **R-6 실측(저장소 최초)**: `Orientation=6` 합성 JPEG(40×20) → Chromium에서 **20×40 decode** =
  브라우저가 EXIF를 **적용**한다. 직접 파싱은 이중 회전이 되므로 R-6이 옳았다. EXIF 라이브러리 0,
  바이너리 fixture 0(바이트 스플라이싱)
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  **unit 989**(944→989) / **e2e 99 PASS**(91→99) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp 0 / dist SHA-256 E2E 전후 동일 · fixture 0 / network·live·deploy 0
- 번들: mockup JS 263.31 → **265.53 kB**(gzip 81.60 → **82.11**), CSS 15.47 → **15.50**, admin 무변경
- 변경 파일 13개 모두 스펙 §4 허용 목록 안. `surface.css`는 기존 편집 컨트롤 스타일 재사용으로 **무변경**
- 스펙 018 PNG 2개: 손대지 않음
- 다음: Codex 독립 검증 대기. **종료 문서·다음 스펙 착수 없음.**

## 2026-07-31 — Codex 스펙 031 독립 검증 CORRECTION_REQUIRED 라운드 1

- 대상 코드 `78095f8`, 문서 `78acdf6`
- PASS: frozen, format/lint/typecheck, unit 1081/1081, build, Chromium E2E 114/114,
  diff check, lockfile/금지 경로 0, ports/temp
- 결함 1: clock percent가 mat가 아니라 전체 canvas 기준
- 결함 2: custom hardware image 실패가 HH:MM으로 잘못 fallback
- 결함 3: requested font availability 미검증
- 위 세 계약의 composer/clock/CSS/unit/E2E와 관련 문서만 보완

## 2026-07-31 — Codex 스펙 030 독립 검증: CORRECTION_REQUIRED 라운드 1

- frozen/format/lint/typecheck/unit **989/989**/build/E2E **99/99**/diff check/dist hash PASS
- 포트 4183·4184 및 OS temp 잔존 0; 프로세스 command-line 열람은 권한 거부로 NOT TESTED
- 결함: 회전 시 필요한 `translate`/`rotate`가 공개 `PreviewCanvasContext`에 선언되지 않아
  compile-time 계약과 runtime 요구가 불일치
- 최소 보완: `canvas/types.ts`에 선택적 capability와 fail-closed 계약을 선언하고 executor/test의
  단일 정본·호환성을 고정

## 2026-07-31 — 스펙 030 보완 라운드 1 (executor 공개 포트 capability)

- 기준 `e4a9133` → 코드/test 커밋 `603cd25`. 상태 `CORRECTION_REQUIRED` → `READY_FOR_CODEX`
- 지적(유효): executor가 회전 시 `translate`/`rotate`를 요구하는데 공개 `PreviewCanvasContext`가 둘을
  선언하지 않아, 타입을 정확히 구현한 소비자가 **컴파일 통과 후 회전 plan에서만 실패**할 수 있었다
- 보완 ①: 두 메서드를 **선택적 capability로 공개 포트에 선언**. 선택성 자체가 계약 —
  없으면 unrotated plan은 **그대로 실행**, rotated plan은 둘 다 요구
- 보완 ②: **fail-closed 계약을 공개 포트에 문서화**(하나라도 없으면 preflight
  `INVALID_EXECUTOR_INPUT` + **Canvas 연산 0**)
- 보완 ③: **단일 정본화** — `RotationCapableCanvasContext`를 공개 타입에서 `Required<Pick<...>>`로
  **파생**하고 executor 중복 interface **삭제**. `ROTATION_METHODS`는 `keyof PreviewCanvasContext`로
  검사 → 메서드명 변경 시 컴파일이 깨진다
- 신규 테스트 6: 공개 타입만으로 선언된 capability-free 컨텍스트의 unrotated PASS(transform 시도 0)·
  명시적 0도 동일·회전 1/2/3 전부 fail-closed(Canvas 연산 0)·**절반 capability도 실패**·
  함수 아닌 값도 실패·실제 `CanvasRenderingContext2D` **컴파일 타임 assignability**
- 회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9 **무변경**
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  **unit 995**(989→995) / **e2e 99 PASS** exit 0 / `git diff --check` clean / 포트 free / OS temp 0 /
  dist SHA-256 E2E 전후 동일 / network·live·deploy 0
- 번들: mockup JS 265.53 → **265.52 kB**(gzip 82.11 → **82.10**), CSS·admin 무변경
- 스펙 018 PNG 2개: 손대지 않음
- ⚠️ 판단 요청 ②(R-6 실측의 조사 보고서 NOT VERIFIED 해소 여부)는 **아직 미회신** — Codex 판정 대기
- 다음: Codex 재검증 대기. **종료 문서·다음 스펙 착수 없음.**

## 2026-07-31 — Codex 스펙 030 보완 라운드 1 재검증: CODEX_PASSED

- 승인 코드 `603cd25`, 문서 `1aa3302`
- 공개 포트 capability·단일 정본·기존 context 호환·회전 fail-closed 계약 확인
- frozen/format/lint/typecheck/unit **995/995**/build/E2E **99/99**/diff check/dist hash PASS
- 포트 4183·4184 및 OS temp 0, lockfile·신규 의존성·금지 경로 diff 0
- 잔류 프로세스 command-line 검사는 OS 권한 거부로 NOT TESTED
- Chromium 합성 EXIF Orientation=6 적용은 VERIFIED; 다른 엔진·실기기는 NOT TESTED
- 다음: Claude 종료 문서 전용 fast-forward commit/push. 다음 스펙 착수 금지

## 2026-07-31 — 스펙 030 종료 (Codex 재검증 승인 → DONE)

- 상태: `READY_FOR_CODEX` → **`CODEX_PASSED`** → 종료 문서 처리 → `COMMITTED`
- 승인 대상: 코드 **`603cd25`**(보완 라운드 1, 최초 구현 `fbbadeb`) + 문서 **`1aa3302`**
- Codex 독립 재검증 결론: 공개 포트의 **선택적 rotation capability**·**fail-closed 계약**·
  **단일 타입 정본**을 확인
- Codex 독립 게이트: frozen install / format·lint·typecheck / **unit 995/995** / mockup·admin build /
  실제 Chromium **E2E 99/99** / `git diff --check` / **dist SHA-256 전후 동일** /
  lockfile·신규 의존성·금지 경로 diff 0 / 포트 4183·4184 0 / OS temp 0
- Claude 재실측(같은 트리): `check` PASS(format·lint·typecheck·unit·build), 기능 코드 diff **0**
  (`git diff 603cd25..HEAD -- apps packages tests` = 0줄)
- ★ **판단 요청 ② 회신**: "Chromium 합성 EXIF `Orientation=6` 적용은 **검증됨**, 그 밖의 엔진·실기기는
  NOT TESTED 유지" → 40×20 + `Orientation=6` → **20×40 decode** 실측이 **검증된 사실로 확정**.
  R-6("직접 파싱 금지")이 옳았다. 조사 보고서는 Codex 소유·허용 파일 밖이라 **수정하지 않음**
- NOT TESTED 유지: **잔류 프로세스 command-line 검사(OS 권한 거부)**, 실기기 4환경 EXIF·조작성,
  카메라 원본 orientation 1~8, 실제 print/export 회전, 대용량 성능·메모리, 실제 200% 확대, 임의 각도
- 이 라운드는 **문서 전용 커밋**(기능 코드·테스트·CSS·설정·lockfile 변경 0, network·live·deploy 0)
- 스펙 018 PNG 2개: 손대지 않음
- 다음: **다음 스펙 미착수 — Codex 지시 대기**

## 2026-07-31 — Codex 스펙 031 읽기 전용 조사 전이

- 스펙 030 종료 커밋 `57d43b6`과 `HEAD=origin`, ahead/behind 0/0을 확인해 DONE으로 확정
- `docs/rebuild/specs/019-canvas-geometry-contract.md`의 후속 순서에서 pointer 다음 항목인
  **text/clock**을 스펙 031 조사 대상으로 선정
- 상태: `WAITING_FOR_CLAUDE`
- 이번 라운드는 문서 전용 조사이며 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 변경 금지
- 조사 완료 전 구현·print/export·watermark·network/live/Firebase/deploy 착수 금지
- 알려진 스펙 018 PNG 두 개는 계속 손대지 않음

## 2026-07-31 — 스펙 031 사전 조사 (텍스트 영역·시계, 읽기 전용)

- 기준 HEAD `57d43b6` / 산출물 `docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`
- 상태: `WAITING_FOR_CLAUDE` → 조사 완료 → `READY_FOR_CODEX`
- **한 줄: "텍스트"는 하나가 아니라 두 모델이고, 시계는 미리보기에만 있다.**
- 텍스트 소유자 2개 분리: ① 액자 **키 기반 `textZones`**(운영자가 좌표, 고객이 값, `:1783`·`:11427`)
  ② 케이스 **자유 배치 `textObjs`**(고객이 드래그, `:1736`·`:3038`) — 코드도 데이터도 공유 0
- zone 필드 전수(`:11387-11402`): `key/x/y/fontSize/align/boxW/letterSpacing/lineH/rotation/font/
  bold/italic/color`, 좌표·크기는 **캔버스 % 기준**, `rotation`은 **임의 각도**
- ★ 결함 3건: **빈 값 판정 불일치**(`"0"`이 일부 경로에서 사라짐, `:11388` vs `:9732`) /
  **줄 수 상한 불일치**(미리보기 2줄 vs V365 인쇄 3줄) / **기본 글자색 뒤집힘**
  (`applyFrameTextStyle` 없으면 `#111`, 있으면 `#FFF`)
- ★★ **인쇄/export에 시계가 아예 없다**(`renderFramePrintV365 :11404-11446`에 `drawClockLayer` 0회)
  → 고객이 본 화면과 인쇄물이 구조적으로 다르다
- 시계: `ADM.clockSettings` → `frameSizes[].clock` → `frameTemplates[].clock` 3단 병합, `{x,y,size,customImg}`,
  기본 88/88/12%, **로컬 시간 24h `HH:MM` 고정**(초·timezone·locale 없음), `setInterval(renderFrame,1000)`,
  **타이머 정리 부실**(덮어쓰기 전 clearInterval 없음), `drawClockLayer` **12중 재정의**
- 카탈로그: `textZones`·`clock`·`clockEnabled`·`clockSettings`·`customFonts`는 **보존만** 되고
  **투영은 0**(`project.ts`에 문자열 0회). `caseTemplates`·`customFonts`는 item 스키마 없이 불투명
- `packages/render` plan 커맨드는 4개뿐 — **텍스트 어휘 0** → 계약 확장 전제
- ★ 핵심 딜레마 기록: wrap은 `measureText`가 필요한데 plan은 순수해야 한다 →
  **측정 포트를 빌더에 주입해 `lines[]`를 plan에 확정**할 것을 권고(레거시 결함이 정확히 반대 선택에서 나옴)
- 결정 필요: Founder 8건(F-1 케이스 텍스트 방식 · F-2 고객 색/그림자 · F-3 defaultTexts 초기값 ·
  **F-4 시계 인쇄 포함 여부** · F-5 인쇄 시각 의미 · F-6 길이 상한 · F-7 줄 수 · F-8 `name2` 기본값) +
  Codex 11건(C-1~C-11)
- 검증 설계: fake 측정 포트 unit · Chromium 픽셀 E2E · **Playwright `page.clock` 고정 시각**
  (실제 시간·timezone 의존 금지) · 최소 구현 순서 · 허용 파일 후보 · STOP 12조건
- 변경: **문서 전용**(보고서 1 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·PNG·
  lockfile 0, 신규 의존성 0, network·live·Firebase·CORS·deploy 0
- 다음: Codex 검토. **구현 착수 없음.**

## 2026-07-31 — 스펙 031 조사 보완 라운드 1 (시계의 제품 의미)

- 기준 `33323dd` → 문서 전용 보완. 상태 `CORRECTION_REQUIRED` → `READY_FOR_CODEX`
- 지적(**유효**): 조사가 "인쇄에 시계가 없다"는 **코드 사실**에서 곧바로 **"구조적 불일치·결함"** 판정과
  **"인쇄 포함 권장"** 을 도출했다. 그러나 `admin:335`("⏰ 템플릿용 시계 **가이드**")·`admin:342`
  ("템플릿 제작 시 시계를 **미리 보면서 위치를 잡고**")는 시계가 **완제품의 물리적 하드웨어**일
  가능성을 지지한다
- 추가 조사로 양쪽 근거를 §3.5.1에 라인과 함께 정리했다.
  **A(하드웨어)**: "가이드" 명시 · 시계를 보며 아트 배치(=회피 대상) · 운영자가 올리는 시계 **사진**
  (`customImg`) · **독립 인쇄 구현 2개**(V36 `:9732`, V365 `:11404`)가 **모두** 시계 제외 ·
  **주문 payload에 시계 상태 없음** · **"시계액자"가 상품군 이름**
  **B(인쇄 그래픽)**: 고객 문구 "시계 **추가**" · 고객이 요소 리스트에서 **삭제 가능** ·
  **`clockOn`이 `space-scene-v1`의 `design`에 저장** · 사이즈별·템플릿별 3단 위치 데이터 ·
  "미리보기 전용은 DOM 오버레이로 분리"하는 **선례가 있는데도** 시계는 캔버스에 baked
  **C(NOT FOUND)**: 하드웨어 어휘(무브먼트·바늘·초침·타공·벽시계·건전지) **0건**,
  "시계를 인쇄한다"는 문서·주석도 **없음**
- **판정 `UNCONFIRMED`** — §0·§3.5·§10에서 "구조적 불일치"·"결함"·"인쇄 포함 권장" 단정 **제거**.
  §3.5는 이제 코드 사실만 주장한다
- Founder 결정 재구성: **F-4 제품 의미** → F-4a(하드웨어면 print 미포함 유지·preview 전용) /
  F-4b(그래픽이면 포함 여부) → F-5(F-4b일 때만 시각 의미)
- 구현 범위 분기(§8.4 신설): 하드웨어면 **결정적 plan 공유를 전제하지 않고** preview overlay 계약 +
  **timer 정리**만 → `packages/render`는 텍스트 때문에만 변경. C-8도 F-4 종속으로 변경.
  STOP 조건 11·12 추가. 최소 구현 순서에서 **1~5(텍스트)는 F-4와 무관, 6(시계)만 차단**
- **바꾸지 않은 것**: §1·§2 textZones 조사, §4~§7, C-1~C-7·C-9~C-11, §9 검증 설계
- 변경: **문서 전용**(보고서 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·manifest·
  lockfile diff 0, 신규 의존성 0, network·live·Firebase·CORS·deploy 0
- 스펙 018 PNG 2개: 손대지 않음
- 다음: Codex 재검토. **구현 착수 없음.**

## 2026-07-31 — Codex 스펙 031 보완 재검토 승인

- 보완 커밋 `7636367`: 시계 의미 `UNCONFIRMED`, 결함·인쇄 포함 단정 제거, 구현 분기 확인
- 허용 문서 5개, `git diff --check` PASS, HEAD=origin 0/0, 제품 코드 변경 0
- 상태: `FOUNDER_DECISION_REQUIRED`
- Codex C-1~C-7·C-9~C-11 승인, C-8은 Founder F-4에 종속
- Founder 결정 전 텍스트·시계 구현 금지

## 2026-07-31 — 스펙 031 Founder 결정 정본 기록 (F-1~F-4·F-6~F-8, 문서 전용)

- 기준 HEAD `7636367`(Codex 조사 승인) / 정본
  `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`
- 상태: `FOUNDER_DECISION_REQUIRED` → 결정 기록 → `READY_FOR_CODEX`
- ★★ **F-4 = 시계는 "완제품의 물리적 시계 하드웨어 미리보기"**. 조사 §3.5.1의 `UNCONFIRMED`가 Founder
  권한으로 확정됐다. 즉시 확정되는 것:
  ① **인쇄/export에 시계 미포함이 정상** — 레거시가 빼 온 것은 결함이 아니라 **의도**였다
  ② "미리보기≠인쇄"는 **문제가 아니다**(보완 라운드 1의 철회가 최종 확정)
  ③ **F-5(인쇄 시각) 불필요**
  ④ **`packages/render`는 시계 때문에 바뀌지 않는다**(텍스트 때문에만 확장)
  ⑤ 시계는 **plan에 담기지 않고** 결정적 plan 공유를 전제하지 않는다
- 시계 구현 범위(조사 §8.4 ⓐ): **preview overlay 계약 + timer lifecycle뿐** — DOM 분리 여부 ·
  1초 갱신 필요성 · **타이머 정확히 1개 보장**(레거시 누수 미재현) · 실물 부착 안내 문구
- Founder 텍스트 묶음 **일괄 승인**: F-1 1차는 액자 `textZones`만(케이스 자유배치는 별도 스펙) /
  F-2 고객 색·그림자 미지원(운영자 zone 스타일 단일 정본) / F-3 `defaultTexts`는 placeholder로만 /
  F-6 zone별 길이 상한 + **초과 입력 차단**(자르기·말줄임·자동복구 없음) / F-7 zone별 줄 수, **기본 2줄** /
  F-8 5개 키 균일 처리, **`name2` 기본값 만들지 않음**(admin 확장은 별도 스펙)
- 불변식 8개 기록: 시계는 인쇄물·plan에 없다 / **텍스트는 plan에 담겨 미리보기=인쇄** / 케이스 텍스트
  범위 밖 / 텍스트 스타일 소유자는 운영자 하나 / 운영자 샘플이 고객 값이 되지 않는다 / 초과는 입력
  차단 / 019·026·028·030 계약 무변경
- 변경: **문서 전용**(결정 문서 1 신규 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·
  manifest·lockfile diff 0, 신규 의존성 0, network·live·Firebase·CORS·deploy 0
- 스펙 018 PNG 2개: 손대지 않음
- 다음: Codex가 이 결정을 입력으로 **스펙 031 구현 계약**을 작성한다. **구현 착수 없음.**

## 2026-07-31 — Codex 스펙 031 구현 계약 작성

- Founder 결정 정본 `e3dc2b1`, HEAD=origin 0/0 확인
- 신규 정본 `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`
- 결정적 wrap 측정 포트, draw-text, executor capability, 액자 다섯 key 계약 확정
- maxChars 기본 80/상한 200 UTF-16 code unit, maxLines 기본 2/상한 5
- 시계는 plan 밖 DOM physical-hardware overlay; custom image timer 0, text fallback 분 단위
- 상태 `WAITING_FOR_CLAUDE`; 구현은 Claude만 허용 범위에서 수행

## 2026-07-31 — 스펙 031 구현 (액자 텍스트 영역 + 물리적 시계 미리보기)

- 기준 계약 `3927420` / 결정 `e3dc2b1` → 코드/test 커밋 `78095f8`. 상태 `WAITING_FOR_CLAUDE` →
  `CLAUDE_WORKING` → `READY_FOR_CODEX`
- 투영: 다섯 키 `textZones` 정규화(닫힌 범위·중복/미지원 키 거부·`maxChars` 기본 **80**·`maxLines` 기본 **2**),
  `defaultTexts`는 **placeholder 전용**이고 **`name2`에는 없음**. `clockPreview`는 3단 병합
- plan: **`draw-text`** 신규 — **이미 wrap된 lines + 측정 폭**만 담고 고객 원문(라인 외)·zone key·
  카탈로그/템플릿 id·측정 포트 **미포함**, `layerId`는 **위치 기반**
- ★ wrap은 **주입 측정 포트로 빌더에서 한 번** 확정 → plan은 순수·JSON-safe, 미리보기와 향후 print가
  **같은 lines** 소비. 측정 throw/non-finite/negative는 **fail-closed**, 폰트 정착 전 plan 미생성
- ★ 입력 거부를 **빌더 시험 빌드**로 구현(composer가 wrap을 재구현하면 빌더와 어긋날 수 있음) →
  실패 시 **직전 승인 값 유지**, 자르기·말줄임 0
- executor: `font`/`textAlign`/`textBaseline`/`fillText`/`measureText`를 **선택적 capability**로 공개 포트에
  선언(030 패턴 재사용), 없으면 **preflight fail-closed(Canvas 연산 0)**. letter-spacing은 **glyph별
  `fillText`**, `ctx.letterSpacing` 미사용
- 시계(F-4 하드웨어): 신규 `clockOverlay.ts` framework-free + 시계·스케줄러 주입.
  **`pointer-events:none`·`aria-hidden` DOM 오버레이**, percent 위치라 resize 유지, **plan·인쇄·주문 밖**.
  **custom image timer 0**, 텍스트는 **분 경계 후 60초**(1초 interval 금지), **활성 timer ≤1** +
  generation 가드. 잘못된 placement/이미지는 **오버레이만 숨김**
- ★ 허용 파일 준수: 배럴(`plan/index.ts`·`preview/index.ts`)이 §4 밖이라 **확장 대신 구조적 타입**으로
  새 타입 참조(`tsc` 강도 동일, 배럴 content diff 0). 인계 §3에 판단 확인 요청
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  **unit 1081**(995→1081) / **e2e 114 PASS**(99→114) exit 0 / `git diff --check` clean /
  포트 free / OS temp 0 / dist SHA-256 E2E 전후 동일 · fixture 0 / network·live·deploy 0
- 번들: mockup JS 265.52 → **280.33 kB**(gzip 86.52), CSS 15.50 → **17.82**(gzip 4.30), admin 무변경
- 변경 파일 18개 전부 §4 허용 목록 안(신규 `clockOverlay.ts`·`clockOverlay.test.ts` 포함)
- 스펙 018 PNG 2개: 손대지 않음
- 다음: Codex 독립 검증 대기. **종료 문서·다음 스펙 착수 없음.**

## 2026-07-31 — 스펙 031 보완 라운드 1 (시계 기준 rect · 이미지 실패 · 폰트 가용성)

- 기준 `78acdf6` → 코드/test 커밋 `88b64e6`. 상태 `CORRECTION_REQUIRED` → `READY_FOR_CODEX`
- 지적 **3건 모두 유효**
- ① **시계 percent 기준이 mat rect였다**: 전체 박스에 적용해 band가 클수록 위치가 틀렸다 →
  band를 **plan 어댑터와 동일 산식**으로 구해 mat 기준 중심과 `min(matW,matH)` 기준 한 변을 캔버스
  대비 CSS percent로 환산하는 **순수 함수 `resolveClockCss`** 로 분리. 오버레이와 그려지는 mat이
  **같은 반올림**을 쓰므로 어긋날 수 없다. E2E가 **naive `80%`가 아님**을 증명하고 resize 이동 <0.5%p
  (bit-identical이 아닌 것은 의도 — band 반올림을 mat도 겪는다)
- ② **선언된 시계 사진의 실패가 텍스트로 대체됐다**: 특정 하드웨어 자리에 일반 디지털 시계를 보여주는
  잘못 → `declared`/`src` **분리**, resolve 실패·`<img>` load 실패는 **오버레이 숨김**, 텍스트는
  **사진 미선언 시에만**. 실패 source 기억으로 재시도 루프 0, source·오류 원문 노출 0
- ③ **폰트 가용성 미확인**: `fonts.ready`는 "로딩 끝"이지 "그 family 로드됨"이 아니다 →
  **측정 전** 값 있는 zone마다 **정확한 shorthand**로 `fonts.check(...)` 확인, FontFaceSet 부재·check
  부재·throw·false면 텍스트 plan **fail-closed**(대체 측정 없음). 입력창은 게이트와 무관
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  **unit 1088**(1081→1088) / **e2e 116 PASS**(114→116) exit 0 / `git diff --check` clean /
  포트 free / OS temp 0 / dist SHA-256 E2E 전후 동일 / network·live·deploy 0
- 번들: mockup JS 280.33 → **281.69 kB**(gzip 86.99), CSS 17.82 → **17.85**, admin 무변경
- 변경 파일 5개(허용 목록과 일치), `surface.css` 변경 불필요. 회전·wrap·오류 우선순위·F-1~F-8 무변경
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: 손대지 않음
- 다음: Codex 재검증 대기. **종료 문서·다음 스펙 착수 없음.**

## 2026-07-31 — 스펙 031 종료 (Codex 재검증 승인 → DONE)

- 상태: `READY_FOR_CODEX` → **`CODEX_PASSED`** → 종료 문서 처리 → `COMMITTED`
- 승인 대상: 코드 **`88b64e6`**(보완 라운드 1, 최초 구현 `78095f8`) + 문서 **`b7d46d3`**
- Codex 독립 게이트: **unit 1088/1088** / 실제 Chromium **E2E 116/116** /
  frozen·format·lint·typecheck·build·`git diff --check` **PASS** / 포트 4183·4184·OS temp 잔류 **0** /
  lockfile·manifest diff 0 · 신규 의존성 0
- Claude 재실측(같은 트리): `check` PASS · unit 1088, 기능 코드 diff **0**
  (`git diff 88b64e6..HEAD -- apps packages tests` = 0줄)
- **NOT TESTED 유지**: **잔류 프로세스 command-line 검사** / 실기기 4환경 IME·폰트·오버레이 /
  system font 대체 / 실제 인쇄물 가독성 / **실제 print/export 텍스트 출력** /
  **실제 물리 시계와 오버레이 위치 일치** / case 텍스트·admin `name2`·고객 style(범위 밖)
- 판단 2건(배럴 확장 대신 구조적 타입 · 입력 거부의 빌더 시험 빌드)은 **명시 지시 없이 승인으로 수용**된
  것으로 기록했다
- 이 라운드는 **문서 전용 커밋**(기능 코드·테스트·CSS·설정·lockfile 변경 0, network·live·deploy 0)
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: 손대지 않음
- 다음: **다음 스펙 미착수 — Codex 지시 대기**

## 2026-07-31 — 스펙 032 사전 조사 (인쇄/내보내기, 읽기 전용)

- 기준 HEAD `b763174` / 산출물 `docs/codex-claude-handoff/reviews/2026-07-31-print-export-investigation.md`
- 착수 근거: **Founder 지시**(개별 스펙 DONE에서 멈추지 말고 다음 권장 스펙 조사로 자동 전환) +
  스펙 019 §506의 후속 순서 마지막 항목 `print`. 상태 `COMMITTED` → 조사 → `READY_FOR_CODEX`
- **한 줄: 인쇄 경로는 두 세대가 공존하고, 리빌드에는 인쇄 코드가 0줄이다.**
- ★ **케이스는 V36 구경로, 액자만 V365** — `patchedRender`가 `type==='case'`면 옛 구현으로 되돌린다
  (`:11453-11455`). 해상도 산식도 텍스트 처리도 다르다
- 해상도: 액자는 실물 cm → **300dpi**(`minLongSide 3000`·`maxPixels 36M`·`fallbackLongSide 3508`),
  케이스는 **cm·dpi 없이** `scale=min(5,max(3,3000/max(W,H)))`. payload의 `dpi:300`은 계산 미사용 상수
- ★ **액자 물리 치수를 추측한다**(`frameCm :11298-11317`): 필드 8종 → **이름 텍스트 파싱** → 하드코딩 표.
  **사이즈 이름을 바꾸면 인쇄 해상도가 바뀔 수 있다.** 카탈로그 V1 `frameSizes` allowlist에 **cm 필드 없음**
- ★ **경고가 주문을 막지 않는다**: 템플릿 아트 로드 실패는 `warnings` 문자열만 남기고 **아트 빠진 PNG를
  반환**해 IndexedDB 저장·다운로드·카카오까지 진행된다(§5). 미리보기는 028에서 fail-closed로 바꿨음
- 스펙 029~031 중 인쇄 반영은 **텍스트뿐** — **회전(030) 무시**, **시계(031 F-4) 제외는 정상**
- pan 배율 **frame 하드코딩 `dim.w/500`**(prevMaxW 변경 시 미리보기≠인쇄) — 리빌드는 normalized라 무관
- CORS: 전역 IIFE가 Firebase URL에 `crossOrigin` 자동 주입. 리빌드는 **026/028 계약 재사용으로 충분**
- 주문 payload는 **이름 3개뿐** — 색·문구·pan/zoom·회전·시계 상태 없음(운영자는 PNG로만 파악)
- ★ 핵심 논점: 인쇄는 새 렌더러가 아니라 **같은 plan을 인쇄 해상도로 다시 만드는 것**.
  **인쇄 폭으로 재생성 + 미리보기 `lines` 재사용**을 권고(좌표 정확성 + 줄바꿈 동일성 동시 확보,
  031이 이미 `lines`를 plan에 담아 추가 계약 불필요)
- 결정 필요: Founder 6건(P-1 케이스 포함 여부 · **P-2 물리 치수 출처** · **P-3 경고 시 인쇄 생성 여부** ·
  P-4 DPI/최대 픽셀 · P-5 주문 payload 확장과 개인정보 · P-6 줄바꿈 일치) + Codex 8건(C-1~C-8)
- 최소 구현 순서·STOP 11조건 기록
- 변경: **문서 전용**(보고서 1 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·PNG·
  lockfile 0, 신규 의존성 0, network·live·Firebase·CORS·deploy 0
- NOT VERIFIED: 레거시 인쇄 **미실행**(코드 근거만) · `CONFIG` 값들의 **출처와 인쇄소 요구** ·
  `knownCm` 표 내용과 운영 카탈로그 실제 필드 · 운영 CORS 실패 · 대용량 성능
- 다음: Codex 검토. **구현 착수 없음.**

## 2026-07-31 — 스펙 032 조사 보완 라운드 1 (lines 재사용 경로·P-5 분리·P-4 출처)

- 기준 `5a42b29` → 문서 전용 보완. 상태 `CORRECTION_REQUIRED` → `READY_FOR_CODEX`
- 지적 **3건 모두 유효**
- ★ **① C-1의 `lines` 재사용 경로가 현재 API에 없다**: 최초 §8.1이 "인쇄 폭 재생성 + `lines` 재사용,
  **추가 계약 불필요**"라고 단정했으나 **사실이 아니다** — `FrameTextZoneInput`(`plan/types.ts:145-167`)에
  **`lines` 입력이 없고** 빌더는 값이 있으면 **항상 `measureText`로 재wrap**한다(`build.ts:771-779`).
  `lines`는 **`draw-text` command의 출력**으로만 존재 → 단정 **제거**하고 **후보 A/B/C 비교**로 재작성,
  각 후보가 **줄바꿈·회전·pan·레이어 순서** 네 불변식을 어떻게 보장하는지 표로 명시
- 새 근거로 **후보 A가 가장 강함**: executor 헤더가 "transform은 caller의 몫"이라 못 박았고
  (`executePreviewPlan.ts:10-11`), **`surface.ts:7-8`이 이미 `setTransform(dpr)` 후 같은 plan을 실행**해
  **DPR 미리보기가 곧 그 패턴의 검증된 사례**다. 선택은 **Codex C-1**로 남기고 인쇄 배율에서의
  **자간 품질은 NOT VERIFIED** 기록. 후보 C(순수 scaling)는 좌표의 두 번째 진실 원천이라 비권장
- **② P-5 분리**: 색·사진 transform(비개인) / 시계 유무(비개인 제품 구성) / **고객 문구 원문(개인정보)** 을
  나누고 각각 **① PNG 포함 ② 로컬 저장 ③ 주문 전송 ④ 보존 기간**을 구분한 표로 재작성.
  **최소안 P-5c**: 문구는 이미 PNG에 픽셀로 있으므로 **텍스트 저장·전송 안 함**, 별도 개인정보 정책
  승인 없이는 스펙 032 범위에서 제외
- **③ P-4 출처**: `300dpi`·`3000`·`36M`·`3508`은 **레거시 관측값일 뿐 인쇄소 근거 없음**을 명시하고
  **P-4a(임시값 구현 + 실제 업로드·주문·배포 차단)** vs **P-4b(확인 전 구현 보류)** 로 분리.
  미확인 항목(색공간/ICC·재단 여백·파일 형식·최대 크기)도 기록. **STOP 조건 12·13 추가**
- 바꾸지 않은 것: §1~§7 레거시 조사 결과, §10 최소 구현 순서, C-2~C-8
- 변경: **문서 전용**(보고서 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·lockfile 0,
  신규 의존성 0, network·live·deploy 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: 손대지 않음
- 다음: Codex 재검토. **구현 착수 없음.**

## 2026-07-31 — 스펙 032 Founder 결정 정본 기록 (P-1·P-2·P-3·P-4a·P-5·P-6, 문서 전용)

- 기준 HEAD `d55a9b8` / 정본
  `docs/codex-claude-handoff/decisions/2026-07-31-spec-032-print-export-decisions.md`
- 승인 문장(원문): `스펙 032 Founder 권장안 P-1·P-2·P-3·P-4a·P-5·P-6을 일괄 승인하고 자동화를 계속 진행해.`
- ⚠️ **절차 기록**: Codex의 마지막 지시는 "보완된 질문을 Codex가 승인하기 전 확정하지 않는다"였으나
  Founder가 순서를 **명시적으로 앞당겨** 결정했다. **조사 보고서에 대한 Codex 재검토는 여전히 미완**이며,
  전제가 틀렸다고 밝혀지면 해당 항목은 다시 연다
- **P-1** 액자 인쇄만, **케이스는 별도 스펙** — 케이스는 V36 구경로 + `textObjs`(031 F-1로 범위 밖)
- **P-2** 물리 치수는 **카탈로그 명시 필드**에서만. **이름 텍스트 파싱 금지**(사이즈 이름을 바꾸면
  해상도가 바뀌는 동작은 제품 사고). 전제: V1 allowlist에 cm 필드가 **없어 스키마 확장 + admin 스펙 동반**.
  **치수 없으면 인쇄 미생성**(추측 금지)
- **P-3** 경고가 있으면 **인쇄 파일을 만들지 않는다(fail-closed)** — 미리보기(026/028/031)와 동일 규율.
  부분 파일·아트 누락 파일 0
- **P-4a** 레거시 수치는 **명시적 임시값**으로 구현·검증하되 **★ 인쇄소 확인 전까지 실제 업로드·주문
  전송·배포 차단**(로컬 다운로드·E2E는 허용). 함께 미확인: 색공간/ICC·재단 여백·파일 형식·최대 크기
- **P-5** 분리 확정 — **P-5a 색·사진 transform 담는다** / **P-5b 시계 유무 담는다**(실물 부착 여부는
  운영자가 알아야 할 제품 구성인데 지금 주문서에 없음) / **P-5c 고객 문구 원문은 텍스트로 저장·전송
  안 함**(이미 PNG에 픽셀로 포함, 별도 개인정보 승인 없이는 범위 밖 — 031 규율의 저장·전송 확장)
- **P-6** 미리보기와 인쇄의 **줄바꿈 동일 필수**. 후보 선택(C-1)에 **제약만** 걸고 A/B/C는 정하지 않음
- 불변식 7개 기록. **미결로 남긴 것**: C-1 후보 A/B/C · cm 필드 이름/단위/UI(별도 스펙) · 인쇄소 요구
  전체 · 케이스 인쇄 · C-2~C-8 · 자간 품질/대용량 성능(NOT VERIFIED) · **조사 보고서 Codex 재검토**
- 변경: **문서 전용**(결정 문서 1 신규 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·설정·
  manifest·lockfile diff 0, 신규 의존성 0, network·live·Firebase·CORS·deploy 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: 손대지 않음
- 다음: Codex가 이 결정을 입력으로 **스펙 032 구현 계약**을 작성한다. **구현 착수 없음.**

## 2026-07-31 — 스펙 032 결정 정본 커밋 인정 기록 (문서 전용, 해시만 추가)

- Founder가 `커밋 0443137을 결정 정본으로 인정`한다고 재확인했다. **결정 내용 자체는 변경 없음** —
  P-1·P-2·P-3·P-4a·P-5·P-6은 `0443137`에서 이미 확정됐다
- 문서에 **커밋 해시가 기록돼 있지 않아** 추적성을 위해 정본 문서·CURRENT·STATE·NEXT 네 곳에
  **`0443137`을 결정 정본 커밋으로 명시**했다. 그 외 문장 변경 0
- 변경: **문서 전용**. 제품 코드·테스트·CSS·설정·lockfile diff 0, 신규 의존성 0, network·live·deploy 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: 손대지 않음
- 다음: Codex 구현 계약 대기(**C-1 후보 A/B/C 택일** 포함). **구현 착수 없음.**

## 2026-07-31 — 스펙 032 구현 + Codex 승인 → DONE (`c10e7a6`, 종료 문서 분리)

- **인쇄 해상도가 나올 수 있는 곳을 "운영자가 명시한 cm 두 개"로 좁혔다.** 레거시 `frameCm`은 후보 필드
  8종 → **사이즈 이름 파싱** → 하드코딩 표 순으로 떨어져 **이름을 바꾸면 해상도가 바뀌었다**(조사 §2.3).
  P-2의 금지를 코드로 고정한 단위다
- `frameSizes[].printWidthCm`·`printHeightCm`을 allowlist에 추가(UNKNOWN_FIELD 경고 안 남)하고
  `validatePrintSizeCm` 신설 — **all-or-nothing**, 각각 finite·`> 0`·`<= 500`, 위반은
  **`INVALID_NUMBER` fatal**(clamp·반올림·기본값 0). 한쪽만 있으면 **없는 쪽 path**로 진단한다
  (있는 쪽을 탓하면 운영자가 "남긴 값"을 고치러 간다). **둘 다 없는 기존 카탈로그는 이전과 동일하게 읽힌다**
- `projectFramePrintPhysicalSize(document, frameSizeId)` → **`{widthCm,heightCm}` 또는 `null`만**.
  `null`은 "아직 인쇄 불가"이지 "기본값을 쓰라"가 아니다(P-2·P-3 fail-closed). 기존 preview projection의
  `lookupById`/`run`/`fail` 규율 재사용, 각 필드 **정확히 한 번 read**(drifting getter 방어),
  hostile getter throw·revoked Proxy는 예외 경계에서 실패로 흡수
- **추론 경로 0**을 unit으로 고정: 이름 `"A4 21x29.7cm"` · `sub`/label/id · `aspect`로 없는 변 계산 ·
  논리 `w`/`h`를 cm로 사용 — **전부 읽지 않거나 실패**
- 바꾼 파일 7개 전부 `packages/shared/src/catalog/**`(계약 허용 목록 안).
  `catalog/types.ts`·`catalog/index.ts`·`src/index.ts`는 상위 배럴이 `export *`라 **변경 불필요**
- 게이트: frozen(lockfile diff 0)·format·lint·typecheck **PASS**, unit **1109/1109**(031 시점 1088 → **+21**),
  독립 build **PASS**, Chromium E2E **116/116**, 고객 dist SHA-256 E2E 전후 **동일**(`74427f72…c9644c`),
  `git diff --check` 클린, ports 4183/4184 **0**, OS temp `denn-e2e-*` **0**. 신규 E2E **없음**
  (브라우저 동작이 아닌 순수 read/projection 계약이라 unit이 정본)
- **Codex가 `315356a`를 독립 검증해 PASS** — frozen/format/lint/typecheck/build, unit 1109/1109,
  E2E 116/116, diff check·forbidden diff·ports·OS temp 전부 통과
- 변경 0: `apps/**` · `packages/render/**` · 실제 print/export · PNG 생성 · 주문 payload · 이름 파싱 ·
  fallback 치수 · lockfile/의존성 · Firebase/Rules/CORS/Hosting/deploy · 실제 network/live
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**
- **NOT TESTED**: 실제 발행 카탈로그의 cm 필드(아직 존재하지 않음 — 값을 넣을 운영자 UI가 후속 스펙이라
  이번 검증은 전부 합성 fixture) · `aspect`↔cm 비율 불일치 진단(계약상 자동 수정 안 함, 후보로만) ·
  잔류 프로세스 command-line
- **여전히 미결**: **C-1 인쇄 좌표 방법(후보 A/B/C)** — 계약 §후속 순서 3이 A 계열을 가리키지만
  **확정 스펙 없음**, Claude 임의 선택 금지 · **인쇄소 요구 전체**(해상도·색공간/ICC·재단 여백·파일 형식·
  최대 크기, 저장소 근거 0 → 외부 확인 필요, P-4a 출력 차단 유지) · 케이스 인쇄(P-1 분리) · C-2~C-8 ·
  **조사 보고서 자체에 대한 Codex 재검토 미완**(전제가 뒤집히면 해당 결정 재개)
- 인계: `docs/handoff/2026-07-31-spec-032-print-physical-size-handoff.md`
- 다음: **운영자용 cm 입력 UI(`apps/admin/**`) 읽기 전용 조사**로 자동 전환(계약 §후속 순서 2)

## 2026-07-31 — 운영자 cm 입력 UI 읽기 전용 조사 (문서 전용, 제품 코드 diff 0)

스펙 032 §후속 순서 2. 보고서
`docs/codex-claude-handoff/reviews/2026-07-31-operator-cm-input-ui-investigation.md`.

- **① 리빌드 admin에 아무것도 없다** — `apps/admin/src`는 스펙 011 프리미티브 데모 셸 **3파일 79줄**
  (`App.tsx` 주석: `No product features, no click side effects`). 의존성에 `@denn/firebase`조차 없다.
  리빌드 전체에서 `uploadString|uploadBytes|setDoc|updateDoc|putFile|writeFile` **0건**이고
  `packages/firebase/src/index.ts`가 `FIREBASE_NOT_IMPLEMENTED`로 경계를 명시한다. 읽기도
  `published/state.json` 하나뿐(`public-catalog/location.ts:11-14`)이며 `admin/state.json`은
  **읽지도 쓰지도 않는다** → 이 스펙은 "입력란 두 개"가 아니라 **최초의 운영자 기능 + 최초의 쓰기 경로**다
- **② ★★ 레거시에 이미 명시적 cm 필드 `wcm`/`hcm`이 있다** — `denn-admin.html:1698`의 `addSz`가
  `wcm:w, hcm:h`로 저장하고(입력 id `s-wcm`/`s-hcm`, `sub`는 `w+'×'+h+' cm'` 자동 생성),
  `denn-mockup-tool.html:11302`의 `frameCm` 후보 8쌍 중 **1순위**가 `[sz.wcm, sz.hcm]`이다.
  룸 목업(`:4410`)은 아예 `pick.wcm`/`pick.hcm`만 본다. 스펙 032가 고른
  `printWidthCm`/`printHeightCm`은 **6순위**로 이미 후보에 있어 하위호환은 안전하지만,
  **운영자가 실제로 값을 넣어온 필드는 `wcm`/`hcm`**이다. 현재 리빌드 allowlist에 없어
  `recordUnknown`(`read.ts:190-194`) → **`UNKNOWN_FIELD` 경고 + `extensions` 보존 + 정상 read**이고
  `projectFramePrintPhysicalSize`는 **`null`(=P-2·P-3에 따라 인쇄 미생성)** 을 낸다 →
  운영자가 이미 정확한 치수를 넣어뒀는데도 인쇄가 안 나온다. **마이그레이션 결정 필요**
  (기본 사이즈 6개(`denn-admin.html:852`)는 `wcm`/`hcm`이 **없고** `sub` 텍스트만 있어 전부 `null` 확정)
- **③ ★ 레거시 사이즈 "수정"이 cm을 저장하지 않는다** — `confirmEditSz`(`denn-admin.html:1668-1681`)가
  `s-wcm`/`s-hcm`을 읽어 `sz.aspect=w/h`만 갱신하고 **`sz.wcm`/`sz.hcm` 대입이 없다**. `addSz`는 쓰는데
  편집은 안 쓴다 → 커스텀 사이즈는 **aspect 새 값 + cm 옛 값**으로 조용히 어긋나고, 기본 사이즈는
  영원히 cm이 없다. 게다가 `editSz`(`:1645-1653`)는 저장값이 없으면 **`sub` 정규식 파싱** →
  실패하면 **`wcm=21, hcm=21*aspect` 날조 기본값**으로 폼을 채운다. 스펙 032가 NOT TESTED로 남긴
  **"aspect↔cm 비율 불일치"의 실제 발생 메커니즘**이며 새 UI가 **재현하면 안 되는** 동작이다
- **새 UI가 만족시켜야 할 것**: half-declared는 read가 **fatal**이라 **저장 자체를 차단**해야 한다
  (통과시키면 카탈로그 전체가 안 읽혀 목업툴이 죽는다) · finite·`> 0`·`<= 500` 입력 단계 거부(clamp 금지) ·
  "둘 다 미입력"은 오류가 아니라 **"아직 인쇄 불가"** · **자동 채움(prefill) 금지**(P-2)
- **저장 경로 후보(선택 안 함)**: A 검증만(쓰기 0, 자동 진행 가능) / B 로컬 초안 / C 실제
  `admin/state.json` 쓰기(**Firebase 표면 = CLAUDE.md §1.3 자동 진행 금지**). A는 B/C의 부분집합
- **STOP**: 1 admin 인증·쓰기·발행 도입 여부(**Founder**) · 2 `wcm`/`hcm` 처리(**Founder+Codex**) ·
  3 `sub` 파생 여부(**Founder**) · 4 저장 경로 A/B/C(**Codex**) · 5 레거시 편집 동작 재현 금지 명시(**Codex**)
- 변경: **문서 전용**(조사 보고서 1 신규 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·
  설정·manifest·lockfile diff **0**, 신규 의존성 0, 실제 network·live·Firebase·CORS·deploy **0**
- **NOT VERIFIED**: 실제 `published/state.json`·`admin/state.json` 내용(실제 network 금지) —
  `wcm`/`hcm`이 몇 건인지 모른다 · 레거시 admin UI를 **실행해 보지 않았다**(근거는 전부 소스)
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**
- 유지: 스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다**(Codex 결정).
  **스펙 032 조사 보고서 Codex 재검토 미완** — 전제가 뒤집히면 STOP 2도 다시 열린다
- 다음: **Codex 검토 + Founder STOP 1~3 결정**. 구현 착수 **없음.**

## 2026-07-31 — admin 인증·쓰기·revision·publish 경계 읽기 전용 조사 (문서 전용, 제품 코드 diff 0)

지시 `802a486`. 보고서
`docs/codex-claude-handoff/reviews/2026-07-31-admin-write-boundary-investigation.md`.
**실제 Firebase·network·live·emulator 실행 0**, Rules·config·배포 변경 0.

- **① 인증 경계는 이미 확정돼 바꿀 게 없다** — `storage.rules`의
  `op() = request.auth != null && ...sign_in_provider != 'anonymous'`가 `admin/`을 **비익명만
  read+write**로 잠갔고 `okSize()`는 **20 MiB 미만**이다. 파일 주석이 **catch-all `read:if true` 금지**
  이유(겹치는 match는 OR → `admin/` 노출)와 **read 조건에 `request.resource.size` 금지**(read 시
  `resource=null`)까지 못박아 뒀다. 리빌드는 **재현이 아니라 만족**시키면 된다.
  ⚠️ 레거시 `dennCloudSaveAdminV`(`denn-admin.html:783-785`)는 미인증·익명이면 **조용히 return** —
  운영자는 저장됐다고 믿는데 로컬에만 남는다. **이 침묵은 계승 금지**
  (`ensureAdminAuth`(`:14810-14817`)는 반대로 `admin/auth-required`로 **던진다** → 이쪽을 계승)
- **② ★ write port를 실제 network 없이 검증할 선례가 이미 있다** — `public-catalog/reader.ts`가
  **주입 transport(`FetchLike`) + 안전 오류 계약(category/code/retryable/correlationId) + 100% 합성
  fake 테스트**이고, live 검증은 `*.live.test.ts`로 `vitest.config.ts:17`에서 **기본 게이트 제외**된다.
  write도 같은 형태면 **미인증 write 시도 0회·경로 allowlist 위반 거부·20 MiB 사전 거부·revision
  결정성·오류 원문 비노출**까지 fake로 전부 검증된다
- **③ ★★ 레거시 admin 동기화는 사실상 last-writer-wins다** — `__cloudRev = Date.now()`는 **벽시계**이고
  upload 전 **원격 rev 재확인이 없다**(`:736-740`). 디바운스 3초. 손실 경로 4개:
  **L-1** 기기 시계 역전 → 나중 저장이 짐 · **L-2** 디바운스 내 겹침 → 나중 upload가 원격 통째 덮어씀 ·
  **L-3** rev 동일 → 로드도 저장도 안 해 **분기 고착** · **L-4** 배열이 **개수 점수 union**이라
  항목을 지운 기기가 점수에서 지면 **삭제가 되살아남**(tombstone은 `guideBackgrounds`만 있고
  **`frameSizes`에는 없다**). **L-4가 cm UI와 직접 충돌** — 지운 사이즈가 되살아나면
  **cm 없는 인쇄 불가 사이즈가 카탈로그에 돌아온다**.
  `__opRev`(목업툴 `stampOpRevV`)는 **저장마다 +1 단조 정수**라 `__cloudRev`(벽시계)와 **의미가 다르다**
- **④ ★ publish는 admin 저장과 완전히 별개인 두 번째 쓰기다** — `dennPublishState`(`:14930-14951`)가
  `window.S`에 **localStorage의 `roomBackgroundSettings`를 덮어쓴 뒤** `__publishedAt`을 찍고
  base64를 **내용해시 경로**(`published/assets/<h32>.<ext>`)로 외부화해 발행한다(2026-07-04, 492KB 대응).
  외부화 실패는 **원본 유지 + 발행 성공**. → **발행본과 `admin/state.json`은 같은 바이트가 아니고
  순서도 무관**하며, 레거시에는 **"발행 안 된 변경"을 알리는 장치가 없다**.
  리빌드 소비자는 `published/state.json`만 읽으므로(`public-catalog/location.ts:11-14`) 여기는 일치
- **최소 port와 소유권**: `AuthPort`(비익명 판정)·`ObjectWritePort`(read/write)·**경로 allowlist**·
  20 MiB 사전 거부는 `@denn/firebase`, **revision 정책은 순수 함수로 `@denn/shared`**(fake 없이 단위 검증),
  편집 상태·저장 시점·"발행 안 됨" 표시는 `apps/admin`. **`@denn/firebase`는 바이트만 옮기고
  무엇이 최신인지 판단하지 않는다. `apps/admin`은 rev를 직접 만들지 않는다**
- **`wcm`/`hcm` 정규화안 검토**(canonical 없을 때만 승격, 둘 다 있고 값 다르면 fail-closed):
  legacy pair는 **운영자 명시 입력 필드**(`s-wcm`/`s-hcm`)라 **이름 파싱이 아니고 P-2와 충돌하지 않는다**.
  canonical이 항상 이기므로 진실 원천도 갈라지지 않고, **조용한 우선순위 규칙이 없다**는 게 핵심.
  남는 문제 — **W-1** `addSz`의 `parseFloat(...)||1`이라 무효 입력이 **1 cm**로 저장돼 있을 수 있다
  (`> 0`·`<= 500`은 통과하지만 명백히 틀림) · **W-2** `aspect`와 어긋난 값을 **그대로 canonical로 승격** ·
  **W-3** snapshot을 메모리 전용/저장 되쓰기/발행본만 중 어디에 쓸지.
  → **정규화 시점에도 범위 재검증 필수**, `aspect` 심한 불일치는 **최소한 진단으로** 남겨야 한다
- **`sub` 독립 유지안**: `sub`는 인쇄에 **아무 영향이 없으므로**(P-2) 자동 덮어쓰기는 **이득 없이 운영자
  입력만 지운다**. 독립 유지가 안전하다(표시상 경고는 검토 가치 있음, 인쇄 차단은 아님)
- **재현 금지 5종 확정**: `editSz`의 `sub` 정규식 prefill(`:1647-1648`) · **`wcm=21` 날조 기본값**(`:1649`) ·
  `addSz`의 `parseFloat||1`(`:1688`) · `confirmEditSz`의 **cm 미저장**(`:1668-1681`) ·
  **미인증 조용한 return**(`:783-785`)
- **STOP Founder**(Firebase 표면 = 자동 진행 금지): **F-A** Auth 도입 여부·시점·계정 ·
  **F-B** 쓰기 범위(admin 저장만 vs 발행까지 — 둘은 별개 동작) ·
  **★F-C** 리빌드 admin이 레거시와 **같은 `admin/state.json`을 공유할지 격리할지**(공유하면 레거시
  스키마 100% 왕복 보존 필요, 격리하면 데이터 분기) · **F-D** 정규화 snapshot 되쓰기 여부 ·
  **F-E** L-1~L-4 허용 여부(막으려면 조건부 쓰기/단일 편집자 잠금 = **범위 확대**)
- **STOP Codex**: **X-1** revision 모델(벽시계 계승 / 단조 정수 / 병행 — **벽시계가 L-1의 원인**) ·
  **X-2** 충돌 시 자동 병합 vs **fail-closed**(리빌드의 다른 모든 계약은 fail-closed) ·
  **X-3** `frameSizes` tombstone 도입(L-4 방지) · **X-4** write port 형태와 경로 allowlist ·
  **X-5** 정규화 검증 재적용 범위 · **X-6** 조사 `1aae91d`의 **STOP 4(A/B/C) 명시 답 아직 없음**
- 변경: **문서 전용**(조사 보고서 1 신규 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·
  설정·manifest·lockfile diff **0**, 신규 의존성 0
- **NOT VERIFIED**: L-1~L-4는 **소스 기반 구조적 결론이고 재현하지 않았다** · 실제
  `admin/state.json`·`published/state.json` 내용과 크기 · 실제 Storage rules가 거부하는지 ·
  레거시 admin UI 실행 확인
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**
- 유지: 스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다**(Codex 결정).
  스펙 032 조사 보고서 **Codex 재검토 미완**. `firebase.json`의 `hosting.public`은 여전히 `"."` 이라
  **deploy 금지 상태 그대로**
- 다음: **Codex 검토 + Founder F-A~F-E 결정**. 구현 착수 **없음.**

## 2026-07-31 — 로컬 액자 PNG export 연결부 읽기 전용 조사 (문서 전용, 제품 코드 diff 0)

지시 `aaf9268`. 보고서
`docs/codex-claude-handoff/reviews/2026-07-31-local-frame-png-export-seam-investigation.md`.
**실제 network·live·Firebase·업로드·주문 전송·배포 0.**

- **① ★★ export가 `logicalWidth`를 바꾸면 P-6이 깨진다** — frame plan의 논리 폭은 **측정된 CSS 폭**에서
  나온다(`PreviewComposer.tsx:562-566` → `previewContracts.ts:83-87`,
  `FRAME_MAX_LOGICAL_WIDTH=500` 상한). 그리고 `fontSizePercent`·`boxWidthPercent`가 **전부 그 폭의 %**라
  (`:631-639`) 인쇄 폭으로 재빌드하면 **폰트 픽셀 크기가 달라지고 `measureText`가 다시 호출**된다 →
  힌팅·서브픽셀 때문에 **같은 줄바꿈 보장이 없다**. P-6이 금지한 "재측정으로 대체로 같음에 기대기"다.
  **줄바꿈 동일성을 구조적으로 보장하는 유일한 길 = plan을 그대로 두고 transform만 걸기**
  (plan을 안 바꾸면 `draw-text`의 `lines[{text,width}]`가 확정값 그대로라 **재계산 여지 자체가 없다**)
- **② ★ 그 transform 패턴은 이미 검증돼 있다** — `surface.ts:151`이 매 draw마다
  `setTransform(dpr,0,0,dpr,0,0)` 후 **같은 plan을 같은 executor로** 실행하고,
  `executePreviewPlan.ts` 헤더가 **DPR/backing transform은 caller 책임, executor는 논리 좌표만**이라고
  명시한다. 인쇄는 `dpr` 자리에 `printWidth / plan.logicalCanvas.width`가 들어가는 **같은 구조**다.
  레거시도 `renderFramePrint`가 `drawImageT(..., dim.w/500)`로 사실상 같은 일을 했고,
  **그 하드코딩 500이 리빌드의 `FRAME_MAX_LOGICAL_WIDTH`와 같은 수**다
- **③ ★ 그러나 `surface.ts`는 재사용할 수 없다** — 관측 CSS 크기가 `plan.logicalCanvas`와
  **0.5px 이내**여야 하고 아니면 `failed`를 낸다(`:110-117`). 인쇄는 정의상 크기가 다르므로
  **detached canvas + 얇은 별도 실행 경로**가 필요하다. **인쇄 때문에 이 불변식을 완화하면
  미리보기 보호가 약해지므로 `surface.ts` 수정은 비권장**
- **④ ★ 지금 붙일 seam이 없다** — `plan`(`:534-677`)·`imageBindings`(`:513-522`)가
  `PreviewComposer` 내부 `useMemo` 지역값이고 밖으로 안 나간다. 리빌드 전체에 `toBlob`·`toDataURL`·
  다운로드 **0건**. 다만 `plan`은 이미 fail-closed 게이트를 통과한 값이라
  (`artBlocked`→null, 슬롯 미준비→null, 텍스트 있는데 `fontsReady`/family 없으면→null, `:613-630`)
  **`plan !== null` 자체가 "art·user image·font 준비 완료"의 증명**이다 →
  **export가 별도 준비 판정을 만들면 두 번째 진실 원천이 된다**
- **taint**: 고객 사진=`URL.createObjectURL`(same-origin, `localImageBinding.ts:89`) ·
  아트 `data:`=안전 · `firebase-download-image`만 `crossOrigin="anonymous"`를 **src 이전에** 설정하고
  (`templateArtBinding.ts:217-220`) **anonymous 실패를 crossOrigin 없이 재시도하지 않는다**(`:214`) —
  재시도했다면 **tainted canvas → 인쇄 0×0**(CLAUDE.md §4 제약 7). 그래도 `toBlob`은 `SecurityError`를
  던질 수 있어 **반드시 감싸야** 한다
- **`toBlob` 순서와 P-3**: executor 결과를 **먼저** 확인하고 **`ok`일 때만** `toBlob`.
  `blob===null`·동기 throw·executor 실패는 전부 **파일 0개**(부분·빈 파일 금지).
  레거시는 반대로 아트 로드 실패를 `warnings`에 넣고도 **아트 빠진 PNG를 반환**해 다운로드·주문까지
  보냈다 — **P-3이 금지한 바로 그 동작**
- **object URL 수명**: 레거시 `downloadBlob`은 **800ms `setTimeout`** 해제라 탭이 그 사이 닫히면
  **revoke 미실행(누수)**이고 800ms는 **근거 없는 상수**다. → **생성한 쪽이 반드시 해제 + 살아 있는
  URL ≤1**(스펙 031 시계 타이머의 generation guard 규율과 동형)
- **physical size `null`/error UI**: `ok`+값=활성 / `ok`+`null`(cm 미입력)=**비활성** /
  `ok:false`=**비활성**, 전부 **고정 문구**(코드·수치·id·URL 노출 금지 — `PREVIEW_MESSAGES` 규율).
  ⚠️ `disabled`만 두면 스크린리더가 이유를 못 읽으므로 **`aria-describedby` 연결이 사실상 필수**
- **provisional 계산**: `CONFIG = {dpi:300, minLongSide:3000, maxPixels:36000000,
  fallbackLongSide:3508}`(`denn-mockup-tool.html:11242-11248`), `framePrintSize`(`:11318-11340`)는
  cm→px → min 업스케일 → maxPixels 다운스케일(하한 900) 순.
  **★ `fallbackLongSide` 분기(cm 없을 때 `aspect` 추정)는 재현 금지** — cm 없으면 **인쇄 미생성**(P-2).
  나머지는 `Date.now`·`random`·DOM이 없어 **순수 함수로 완전히 단위 고정 가능**하고 상수는 명시적
  provisional 표식과 함께 한 곳에 두면 인쇄소 확인 후 **상수만 교체**하면 된다(P-4a).
  **함정 = min 업스케일과 maxPixels 다운스케일이 서로 싸울 수 있는데 레거시는 재검사하지 않는다** →
  두 제약을 동시에 만족 못 하는 결과가 나올 수 있다. 하한 `900`도 근거 없는 상수
- **동일성 검증 설계**: plan을 재빌드하지 않으면 lines/rotation/pan/layer 비교는 **동어반복**이므로
  초점은 **"정말 같은 plan이 쓰였는가"**. unit = 주입 fake executor가 받은 plan **깊은 비교** ·
  JSON 직렬화 **불변** · transform이 **uniform**(a==d, b==c==0) · 호출 순서(크기 지정 → setTransform →
  execute → ok면 toBlob) · 준비 실패 시 `toBlob` 호출 **0회, retry 0**.
  E2E = 정규화 후 픽셀 비교 + **같은 입력 두 번 export 시 바이트 동일**(결정성).
  기존 관례대로 `tests/e2e/mockup-preview.spec.ts`에 `test.describe`로 추가
- **hard boundary**: Storage 업로드 · 주문 payload 생성/저장/전송 · **IndexedDB 주문 저장** ·
  **카카오 열기** · 실제 network · **고객 문구 텍스트 저장·전송**(P-5c: 문구는 **PNG 픽셀로만** 존재) ·
  파일명에 고객 문구/id/token — 전부 **경로에 들어가지 않는다**. 로컬 다운로드·E2E는 **P-4a가 명시 허용**.
  레거시 V36(`:9732`)은 다운로드+IndexedDB 주문 저장+카카오 열기를 **한 함수에 묶어** 두었다
- ⚠️ **레거시에 `framePrintSize`가 두 개다** — V36(`:9732`, **cm 무시, 하드코딩 `longSide=3000`**)와
  V36.5(`:11318`, `frameCm` 기반). **주문 버튼에 연결된 쪽은 V36**이라 레거시 주문 PNG는
  **cm을 전혀 안 볼 수도 있다** — **NOT VERIFIED**(실행 확인 안 함)
- **구현 허용 파일 후보**(관측): `apps/mockup/src/print/printSize.ts`(신규, DOM/Canvas 없음) ·
  `apps/mockup/src/print/exportFramePng.ts`(신규, 주입 포트) · `PreviewComposer.tsx`(seam·버튼) ·
  `previewContracts.ts`(고정 문구) · 해당 CSS · `tests/e2e/mockup-preview.spec.ts` · 문서.
  **건드리지 말 것**: `packages/render/**`(plan 계약 무변경이 이 접근의 핵심) · `packages/shared/**` ·
  `apps/admin/**` · `geometry/**` · `localImageBinding.ts`/`templateArtBinding.ts`/`placement.ts` ·
  **`canvas/surface.ts`** · 운영 HTML · lockfile·의존성
- **STOP Codex**: **★E-1 C-1 확정**(이 조사는 근거만 모았고 **고르지 않았다**) ·
  **E-2** §2.5 픽셀 위험(비정수 배율·자간·clip 반픽셀)을 구현 전 측정할지 ·
  **E-3** minLongSide↔maxPixels 충돌 시 fail-closed 여부
- **STOP Founder**: **E-4** 파일명 규칙(P-5c와 닿음) · **E-5** 다운로드 UI 위치·문구·비활성 사유 한국어 ·
  **E-6** provisional 상수를 UI에 노출할지
- 변경: **문서 전용**(조사 보고서 1 신규 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·
  설정·manifest·lockfile diff **0**, 신규 의존성 0
- **NOT VERIFIED**: 비정수 배율·자간 품질·clip 반픽셀(**측정 안 함**) · 레거시 주문 버튼의 실제 경로 ·
  실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 · 인쇄소 요구 전체
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**
- 유지: 스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다.**
  스펙 032 조사 보고서 **Codex 재검토 미완**. Founder **F-A~F-E(admin)는 이 조사와 독립**이며 미결 —
  이번 범위는 P-4a가 허용한 **로컬 생성·다운로드·E2E뿐**
- 다음: **Codex 검토 + E-1~E-6 결정**. 구현 착수 **없음.**

## 2026-07-31 — Founder E-4·E-5·E-6 승인 기록 (문서 전용, 제품 코드 diff 0)

정본 `docs/codex-claude-handoff/decisions/2026-07-31-local-png-export-ui-decisions.md`.
승인 문장: `로컬 액자 PNG export Founder 권장안 E-4·E-5·E-6을 일괄 승인하고 자동화를 계속 진행해.`

- ⚠️ **절차 기록**: 조사 보고서 §9는 E-4·E-5·E-6을 **"결정 필요" 항목으로만** 올렸고
  **권장안을 명시하지 않았다**(스펙 032의 P-1~P-6과 다른 점). 자동화를 멈추지 않기 위해
  **이미 확정된 제약(P-5c·P-4a·`PREVIEW_MESSAGES` 규율)에서 도출한 권장안을 명시하고 그것을
  승인분으로 기록**했다. **Founder 의도와 다르면 결정 문서만 정정하면 된다** — 제품 코드는 아직 없다
- **E-4 파일명** `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png` (예: `denn-frame-21x29.7cm-20260731-153042.png`).
  **고객 문구·id·token 0** — 파일명도 저장이자 전송이므로 **P-5c가 그대로 적용**된다.
  **사이즈 이름 대신 cm 치수** — 레거시는 `safeName(sz.name)`으로 이름을 넣었는데, 이름은 운영자가
  언제든 바꿀 수 있어 **같은 물건의 파일명이 시점마다 달라진다**. cm은 인쇄물의 **물리적 사실**이고
  인쇄소가 실제로 필요로 하는 값이다(P-2의 "이름을 바꾸면 인쇄가 바뀌는 건 제품 사고"와 같은 방향).
  타임스탬프는 레거시 `Date.now()` epoch 밀리초 대신 **읽을 수 있는 로컬 `YYYYMMDD-HHmmss`**
  (사람이 읽히고 파일 목록이 시간순 정렬된다). 문자 집합은 소문자·숫자·하이픈·점으로 제한(OS·업로드 폼 안전)
- **E-5 UI** 미리보기 캔버스 **아래 독립 영역**이고 **카카오 주문 CTA와 붙이지 않는다** —
  P-4a로 **주문 전송이 차단**된 상태라 주문 버튼 옆에 두면 "누르면 주문이 들어간다"는 오해를 만든다
  (레거시 V36은 정확히 그렇게 배치해 **다운로드·IndexedDB 주문 저장·카카오 열기를 한 흐름**으로 묶었다).
  버튼 문구 **`인쇄용 파일 내려받기`** — **"주문"이라는 말을 쓰지 않는다**(실제로 주문이 안 되므로).
  실패 문구 **`인쇄용 파일을 만들지 못했습니다.`** — **"다시 시도해 주세요"를 넣지 않는다**
  (자동 retry 0이고 같은 조건이면 같은 결과라, 될 것처럼 안내하는 쪽이 더 나쁘다).
  cm 미입력·무효 비활성 문구 `이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다.`,
  미리보기 미완성 사유는 **기존 `PREVIEW_MESSAGES` 재사용**(새 문구를 만들지 않는다).
  비활성 버튼은 **`disabled` + 사유를 `aria-describedby`로 연결** — `disabled`만 두면 스크린리더가
  **이유를 읽지 못한다**(스펙 031 텍스트 입력이 이미 쓰는 패턴이라 새 것이 아니다)
- **E-6 임시 상수** **수치를 노출하지 않는다.** `300dpi`·`3000`·`36,000,000px`·결과 PNG 픽셀 크기를
  전부 고객 UI에서 숨기고 **`인쇄 설정은 인쇄소 확인 전 임시값입니다.`** 한 줄만 표시한다.
  근거: P-4a가 요구한 것은 **"임시값임을 명시"**이지 **"수치 노출"**이 아니고, 이 수치들은
  **인쇄소 확인 후 바뀔 예정**이라 고객이 기억하면 오히려 혼란이 되며, `PREVIEW_MESSAGES` 규율이
  이미 **UI 문구에 수치·코드를 담지 않는다**로 서 있어 여기서 예외를 만들면 그 규율이 약해진다.
  레거시가 상태줄에 찍던 `width×height px`는 **운영자용 정보**라 고객 화면에서 뺀다
- **불변식 6개**: 파일명에 고객 문구·id·token 0 · 사이즈 이름 미사용 · 다운로드와 주문 CTA 분리 및
  "주문" 표현 금지 · 비활성 사유는 항상 읽을 수 있음 · UI 문구에 코드·수치·id·URL·예외 0 ·
  임시값 사실은 밝히되 수치는 밝히지 않음
- **★ 이 승인만으로는 구현을 시작할 수 없다** — **E-1(= C-1 인쇄 좌표 방법 A/B/C)·E-2·E-3은
  Codex 결정이며 여전히 미결**이다. 구현 계약이 Git 히스토리에 기록되기 전까지 인쇄/export
  제품 코드·테스트·CSS·설정을 **작성하지 않는다**
- 변경: **문서 전용**(결정 문서 1 신규 + CURRENT + 이 로그 + Automation 2). 제품 코드·테스트·CSS·
  설정·manifest·lockfile diff **0**, 신규 의존성 0, 실제 network·live·Firebase·업로드·주문 전송·배포 **0**
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**
- 여전히 미결: **C-1(E-1)·E-2·E-3**(Codex) · **F-A~F-E**(admin 인증·쓰기·발행, 이 결정과 **독립**) ·
  인쇄소 요구 전체(외부 확인, **P-4a 차단 유지**) · 케이스 인쇄 · C-2~C-8 ·
  **스펙 032 조사 보고서 Codex 재검토 미완**
- 다음: **Codex가 E-1~E-3을 확정하고 구현 계약 작성**. 구현 착수 **없음.**

## 2026-07-31 — Codex 스펙 033 구현 계약 준비

- Founder가 이 Codex 대화에서 E-4·E-5·E-6 승인 원문을 명시해 `b0f633c`의 정본성 차단을 해소했다.
- **E-1/C-1**: 동일 preview plan + detached HTMLCanvasElement의 uniform transform.
  plan 재빌드·재측정·plan scaling 금지.
- **E-2**: 비정수 배율·자간·clip 위험은 실제 Chromium pixel E2E로 판정하며 불일치는 correction.
- **E-3**: minLongSide와 maxPixels를 동시에 만족하지 못하면 파일 생성 전 fail-closed.
- 구현 계약: `docs/rebuild/specs/033-local-frame-png-export.md`.
- 상태: `WAITING_FOR_CLAUDE`. 계약/상태 문서 fast-forward push 후 허용 범위 구현.
- 이번 변경은 문서 전용이다. 제품 코드·테스트·CSS·설정·lockfile 변경 0.

## 2026-07-31 — 스펙 033 로컬 액자 PNG export 구현 (`4246503`, 종료 문서 분리)

계약 `4ee162e`. **C-1 = 후보 A**(plan 고정 + detached canvas uniform transform)로 Codex가 확정.

- **★★ plan을 재빌드하지 않는 것이 핵심이다** — frame plan의 논리 폭은 **측정 CSS 폭**에서 나오고
  `fontSizePercent`·`boxWidthPercent`가 **그 폭의 %**라, 인쇄 폭으로 재빌드하면 `measureText`가 다시
  호출돼 줄바꿈이 달라질 수 있다. 승인된 **plan 인스턴스를 그대로** 넘기면 `draw-text`의
  `lines[{text,width}]`가 **이미 확정값**이라 **재wrap될 여지 자체가 없다** → **P-6이 구조적으로 성립**.
  unit이 **plan identity(`toBe`)** 와 **JSON 직렬화 전후 불변**을 고정한다
- **transform**: detached canvas의 backing에 계산된 정수 픽셀을 넣고 identity에서
  `setTransform(s,0,0,s,0,0)`을 **정확히 한 번**. `a===d`·`b===c===e===f===0`을 unit으로 고정.
  `outputHeight/logicalHeight`와 상대오차 0.005를 넘게 어긋나면 **`NON_UNIFORM_SCALE` fail-closed**
  (축별 다른 배율은 **고객이 승인한 배치를 왜곡**하므로 절대 적용하지 않는다).
  `canvas/surface.ts`는 관측 크기가 `plan.logicalCanvas`와 0.5px 이내여야 해 **재사용 불가**이고,
  인쇄 때문에 그 불변식을 완화하면 미리보기 보호가 약해지므로 **손대지 않았다**
- **순서**: 크기 지정 → `setTransform` → executor → (**ok일 때만**) `toBlob` → object URL → 다운로드.
  fake port 호출 로그로 순서를 고정
- **P-3**: executor `ok:false`면 **`toBlob`을 호출조차 하지 않는다**. `blob === null`·`toBlob` 동기 throw
  (taint `SecurityError`)도 전부 **파일 0 · retry 0**. 레거시는 반대로 아트 로드 실패를 `warnings`에
  넣고 **아트 빠진 PNG를 주문까지** 보냈다
- **object URL 수명**: **생성자가 revoke**, 살아 있는 URL **최대 1개**, 교체·unmount·dispose에서 정리.
  encode 중 unmount되면 **아무것도 넘기지 않는다**. 레거시의 **800ms 타이머**(탭 종료 시 누수)는 재현 안 함.
  E2E가 3회 export 후 **created 3 / revoked 2**를 확인
- **크기 계산**(`printSize.ts`, 순수 — DOM·시계·난수 0): `round(cm/2.54*300)` → 긴 변 3000 미만이면
  uniform upscale → 총 픽셀 36M 초과면 uniform downscale → **최종 정수에 대해 두 제약 재검사**.
  **`fallbackLongSide=3508`(aspect 추정)과 하한 900은 재현하지 않는다** — cm 없으면 **인쇄 미생성**(P-2)
- **E-4/E-5/E-6**: 파일명 `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`(고객 문구·id·token·사이즈 이름 0,
  읽을 수 있는 로컬 시각) · 미리보기 아래 **독립 블록**(주문 CTA와 분리, `.denn-print`) ·
  버튼 `인쇄용 파일 내려받기`(**"주문" 없음**) · 실패 `인쇄용 파일을 만들지 못했습니다.`(**"다시 시도" 없음**) ·
  비활성 사유 **`aria-describedby`** 연결 · `인쇄 설정은 인쇄소 확인 전 임시값입니다.` **항상 표시**,
  **수치 비노출**(E2E가 print 영역 텍스트에 **숫자 0개**임을 확인)
- **중복 클릭**: `exportBusyRef`(ref)로 막는다 — state updater는 부작용이 없어야 하고, 같은 tick의 두 클릭은
  같은 pre-render state를 읽기 때문이다
- **E-2는 실제 픽셀로 판정했다**(추론 아님): print canvas를 preview 논리 크기로 정규화한 뒤
  **차이 픽셀 비율 ≤ 2%**(noise floor 24)를 확인. **max 단일 픽셀 차이는 지표로 부적합** —
  3500px→500px 다운샘플이 하드 엣지(검은 프레임↔흰 매트)를 직접 렌더와 다르게 평균해 경계 픽셀 몇 개는
  정당하게 크게 벌어진다. **실제 결함(줄바꿈 이동·회전 실패·clip 이동)은 화면의 큰 비율이 바뀐다**.
  커버: **비정수 배율(4.96×)** · 가로 · letter-spacing 12% 한글 · **회전+확대** · **PNG 2회 바이트 동일**
- **★ 보고할 관측 ①**: **E-3 재검사는 현재 상수로 도달 불가능하다.** upscale은 긴 변이 3000이 되어 총
  픽셀 최대 `3000×3000 = 9MP`라 36MP 천장을 넘을 수 없고, downscale은 총 36MP라 긴 변이 최소
  `sqrt(36M) = 6000`이라 3000 바닥을 깰 수 없다. **가드는 유지**했다 — 상수가 바뀌면(바닥 상향·천장 하향)
  의미가 생기고, **레거시가 재검사하지 않아 두 제약 모두 어기는 파일을 내보내던 문제**를 막는 지점이다.
  불가능성과 그 이유를 unit으로 고정했다
- **★ 보고할 관측 ②**: **카탈로그 `aspect`와 cm 비율이 다르면 인쇄가 나오지 않는다.** 스펙 032가 이
  불일치를 **자동 수정하지 않고 진단 후보로만** 남겼으므로, export는 축별로 다른 배율을 적용해 배치를
  왜곡하는 대신 **`NON_UNIFORM_SCALE`로 실패**한다(E2E 전용 테스트 있음).
  → **운영자 cm 입력 UI 스펙에서 이 불일치 처리 결정이 필요하다**
- **게이트**: frozen install(lockfile diff **0**) · format · lint(`--error-on-warnings`) · typecheck **PASS**,
  unit **1174/1174**(032 시점 1109 → **+65**), 독립 build **PASS**,
  전체 Chromium E2E **129/129**(032 시점 116 → **+13**),
  고객 dist SHA-256 E2E 전후 **동일**(`9273f59b…a1580b`), `git diff --check` 클린,
  ports 4183/4184 LISTENING **0**, OS temp `denn-e2e-*` **0**
- **범위 준수**: `packages/render/**`·`packages/shared/**`·`apps/admin/**`·`canvas/surface.ts`·
  image binding owner·placement·geometry·운영 HTML·manifest·lockfile·신규 의존성 변경 **0**.
  upload·order payload·**IndexedDB order**·**Kakao**·Firebase·network·live·deploy **0**
  (E2E가 **POST/PUT/PATCH 0건 · kakao 0건 · popup 0건**을 확인)
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**
- **NOT TESTED**: **실제 인쇄물과 인쇄소 수용성**(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) ·
  실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 · 잔류 프로세스 command-line
- **P-4a에 따라 업로드·주문 전송·배포는 계속 금지**다. 산출물은 **시험용 로컬 PNG**다
- 다음: **Codex 독립 검증**. 구현 추가 수정 **없음.**

## 2026-07-31 — 스펙 033 Codex 독립 검증 및 오늘 작업 종료

- 대상: 구현 `4246503`, 구현 기록 `9e2d408`.
- frozen, format, lint, typecheck, 독립 build PASS.
- unit **1174/1174**, 전체 Chromium E2E **129/129** PASS.
- diff check, forbidden diff, 동일 rebuild dist SHA-256, ports 4183/4184, OS temp PASS.
- 알려진 spec018 PNG 두 개와 content diff 0인 `packages/render/src/plan/index.ts`는 제외했다.
- NOT TESTED: 실제 인쇄물·인쇄소 수용성, 다른 엔진/실기기 `toBlob`, 대용량 메모리·성능,
  색공간/ICC·bleed·파일 형식·최대 크기, 잔류 프로세스 command-line.
- 스펙 033 DONE. Founder 지시에 따라 다음 스펙은 시작하지 않고 자동화를 PAUSED로 전환한다.

## 2026-08-10 — 스펙 034·035 Codex 독립 검증

- 구현 `ff7a49a`·`e9e2af6`, 기록 `5097179`·`0bc2aa8`·`7fc2f07` 검토.
- frozen, format, lint, typecheck, build, check PASS. unit **1213/1213**, Chromium **131/131** PASS.
- diff check, forbidden 범위, ports 4183/4184, OS temp PASS.
- 고객 bundle byte hash 변화는 authoring 코드·문구 0건, `apps/mockup/**` diff 0, 고객 회귀 E2E PASS를
  근거로 비기능적 module graph/minifier 순서 변화로 승인했다.
- 스펙 034·035 DONE. 다음 실제 Auth·저장·충돌·발행은 `FOUNDER_DECISION_REQUIRED`.

## 2026-08-10 — F-A~F-E Founder 결정 선택지 조사 (읽기 전용)

- **목적**: 스펙 034·035가 `CODEX_PASSED`로 닫힌 뒤 남은 유일한 차단 지점인 **admin Auth·저장·
  revision·충돌·publish**에 대해, Founder가 결정할 수 있도록 근거·대안·위험·최소 안전 권장안을
  정리한다. **결정하거나 구현하지 않는다.**
- **적용 범위**: 문서 전용. 제품 코드·테스트·CSS·설정·lockfile·의존성 변경 **0**.
  실제 Firebase·network·live·emulator·Rules·Hosting·deploy 실행 **0**. 운영 데이터·secret 접근 0.
- **변경 파일**:
  - `docs/codex-claude-handoff/reviews/2026-08-10-admin-auth-write-founder-decision-options.md` (신규)
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md` (이 항목)
  - `Automation/DENN_AUTOMATION_STATE.md`
  - `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md`
- **커밋/push**: 문서 전용 단일 커밋 → `rebuild/modern-studio`에 **fast-forward push**.
  force push·merge·rebase·`reset --hard` **없음**.
- **HEAD/origin**: 조사 시작 시 HEAD = origin = `267ea72`, ahead/behind **0/0**.
  이 커밋 후 HEAD = origin (동기), 커밋 해시는 최종 보고에 기록한다.
- **실행한 검증(읽기 전용만)**:
  - `git status -sb` / `git rev-parse HEAD` / `git rev-parse origin/...` /
    `git rev-list --left-right --count HEAD...origin/...` → `267ea72`, **0/0**
  - `git log --oneline`, `git show --stat 267ea72`(Codex pass 커밋 내용 확인)
  - `md5sum`으로 `Automation/*` · `CURRENT.md` · 스펙 034/035 문서가 `267ea72` 이후 **무변경**임을 확인
  - **리빌드 범위(`apps/**`·`packages/**`) grep**: `uploadString|uploadBytes|setDoc|updateDoc|
    signInWithEmailAndPassword|onAuthStateChanged|getAuth` → **0건**,
    `firebase` 의존성 → 리빌드 package.json·lockfile **0건**
    ⚠️ **저장소 전역이 아니다** — 레거시 운영본에는 존재한다:
    `denn-admin.html` 인증 심볼 7건 + `uploadString` 2건(`:14782`, `:14838`),
    `denn-mockup-tool.html` 인증 심볼 4건 + `uploadString` 2건(`:15475`, `:15560`)
    (2026-08-10 보완: 초판의 "저장소 전역 grep 0건" 표현은 **틀렸다**)
  - 근거 라인 실측: `storage.rules:18-28`, `firestore.rules:19-21`, `firebase.json:3`,
    `denn-admin.html` 720-744 / 746-779 / 1640 / 1668-1685 / 1687-1698 / 2018 /
    14806-14828 / 14909 / 14932-14951, `denn-mockup-tool.html:15473,15521`,
    `packages/firebase/src/index.ts:2,26`, `public-catalog/location.ts:11-14`,
    `public-catalog/reader.ts:1-3`, `vitest.config.ts:17`
- **실행하지 않은 검증**: format·lint·typecheck·unit·build·E2E·`pnpm check` — **문서 전용
  변경이라 돌리지 않았다**(제품 코드 diff 0). 실제 Firebase·network·live·emulator·Rules·deploy도
  지시대로 실행하지 않았다.
- **통과하지 못한 검증**: 없음(위 읽기 전용 확인은 전부 기대치와 일치).
- **예상 밖 dirty 파일**: **없음.** 워킹트리의 3개는 전부 **알려진 보호 대상**이며
  `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`,
  `docs/rebuild/results/spec-018/browse-mobile-390x844.png`,
  content diff 0인 `packages/render/src/plan/index.ts` — **stage·commit·복원하지 않았다.**
- **남은 차단 조건 / 필요한 Founder 결정**: **F-A~F-E 전부 미결이다.**
  - F-A 운영자 Auth 도입 시점·인증 방식·허용 계정 정책 (+ `firebase` SDK **신규 의존성 승인**)
  - F-B `admin/state.json` 저장만인지 `published/state.json` 발행까지인지
  - F-C 레거시 운영 경로 공유인지 리빌드 전용 격리인지
  - F-D legacy `wcm`/`hcm` 정규화 결과를 저장소에 되쓸지 메모리 전용으로 둘지
  - F-E last-writer-wins 허용인지 revision precondition/잠금 도입인지
  - ⚠️ **조사 §8의 승인 프롬프트는 예시이며 Founder가 말한 적 없다. 승인으로 기록하지 않는다.**
- **Codex가 다음에 검토할 항목**:
  - 조사 문서의 **근거 라인 정확성**과 L-1~L-4 구조적 결론의 타당성(재현은 안 했다 = UNCONFIRMED)
  - **X-7(신규)**: 쓰기 payload에서 스펙 034 승격 필드를 제외하고 legacy pair를 어떻게 다룰지 —
    되쓰기를 허용하면 `CONFLICTING_PRINT_SIZE` fatal로 **카탈로그 전체 read 실패**가 가능하다
  - X-1 rev 표현 · X-2 충돌 시 병합 vs fail-closed · X-3 `frameSizes` tombstone ·
    X-4 write port와 경로 allowlist · X-5 정규화 검증 재적용 범위 · X-6 저장 경로 A/B/C 명시 답
  - Founder 결정이 내려진 뒤에야 구현 계약을 쓴다는 순서 자체
- **권장 다음 상태**: `FOUNDER_DECISION_REQUIRED` 유지. Founder가 F-A~F-E를 명시적으로 결정하기
  전에는 결정 문서 작성·구현·Firebase 표면 접근을 시작하지 않는다.

## 2026-08-10 — F-A~F-E 조사 문서 정확성 보완 (CORRECTION_REQUIRED)

- **목적**: 초판(`24d0c04`)의 **사실 오류·논리 모순·범위 혼동**을 고친다. **제품 결정은 하나도
  바뀌지 않는다.** 여전히 F-A~F-E는 전부 미결이다.
- **적용 범위**: 문서 전용. 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**.
  Firebase·network·live·emulator·Rules·Hosting·deploy 실행·변경 **0**.
- **고친 내용 4가지**:
  1. **"저장소 전역 grep 0건" 주장 제거.** 실제 검색 범위는 **리빌드 `apps/**`·`packages/**`뿐**이며,
     **레거시 `denn-admin.html`·`denn-mockup-tool.html`에는 Auth/write 코드가 존재한다**
     (인증 심볼 7건/4건, `uploadString` `:14782`·`:14838`·`:15475`·`:15560`).
     조사 보고서 §0·§1·신설 §1.1과 이 로그의 직전 항목 양쪽을 동일하게 고쳤다.
  2. **"인증 경계는 서버에 이미 확정" → "저장소의 `storage.rules`가 의도하는 정책은 확인됐다".**
     해당 Rules가 **실제 운영 Firebase에 배포됐는지와 실제 거부 동작은 UNCONFIRMED**로 유지한다.
     ⚠️ 같은 표현이 **2026-07-31 admin 쓰기 경계 조사 기록**(이 로그의 해당 항목,
     `CURRENT.md`, `Automation/DENN_AUTOMATION_STATE.md`)에도 남아 있다. 과거 기록은 append-only라
     문장을 지우지 않고 **`CURRENT.md`에 superseded 표시**를 달았다. 앞으로는 이 정정이 정본이다.
  3. **F-E 모순 제거.** E2(단조 rev + 쓰기 직전 재확인)는 **원자적 precondition이 아니다** —
     두 클라이언트가 같은 revision으로 재확인을 통과할 수 있어 **잔류 last-writer-wins 손실
     가능성이 남는다**. 따라서 "last-writer-wins를 허용하지 않으면서 E2를 승인한다"는 문장을
     **삭제**하고 **E2-best-effort**(경합 창과 잔류 손실을 명시적으로 수용) /
     **E3-strong**(손실 불허, 원자적 precondition·잠금 지원 가능성을 별도 조사·검증하기 전까지
     쓰기 구현 차단, Rules·Firestore 잠금은 별도 승인)으로 **택일 선택지**를 분리했다.
  4. **F-A·F-B·F-C 단계 관계 명시**(보고서 §4.4). **1단계 = Auth + `admin/state.json` 읽기,
     쓰기 0.** `B1 저장만`은 **향후 쓰기 단계를 열 경우의 정책 권장안이지 현재 구현 허가가 아니다.**
     **쓰기 계약은 Founder가 쓰기 단계 착수를 별도 승인하기 전에는 작성하지 않는다.**
- **변경 파일**:
  - `docs/codex-claude-handoff/reviews/2026-08-10-admin-auth-write-founder-decision-options.md`
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md` (직전 항목의 grep 문장 수정 + 이 항목)
  - `docs/codex-claude-handoff/CURRENT.md` (상단 "보호형 자동 검수 루프 ON" 제거 → 수동 인수인계)
  - `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md` (상태 일치 확인·갱신)
- **커밋/push**: 문서 전용 단일 커밋 → fast-forward push. force·merge·rebase·`reset --hard` 없음.
- **실행한 검증**: `git diff --check 24d0c04..HEAD`, 변경 경로가 허용 문서뿐인지 확인,
  제품 코드·의존성·lockfile diff **0** 확인, HEAD/origin/ahead-behind·dirty 경로 확인.
  (format·lint·typecheck·unit·build·E2E는 **문서 전용 변경이라 실행하지 않았다**.)
- **예상 밖 dirty 파일**: 없음. 보호 대상 3개는 stage·commit·restore·checkout 하지 않았다.
- **승인 상태**: **여전히 Founder 승인 0건.** 보고서 §8은 예시 문장이며, 7번 항목은
  **E2-best-effort / E3-strong 중 Founder가 직접 골라야 하는 자리**다.
- **권장 다음 상태**: `FOUNDER_DECISION_REQUIRED` 유지. 구현 계약·Codex 구조 결정 확정 없음.

## 2026-08-10 — F-A~F-E Founder 결정 정본 기록 (READY_FOR_CODEX)

- **목적**: Founder가 실제로 승인한 F-A~F-E를 **정본 문서로 고정**하고, 상태를
  `FOUNDER_DECISION_REQUIRED` → **`READY_FOR_CODEX`** 로 전환한다. 다음 작업은
  **"Auth + `admin/state.json` 읽기 전용 구현 계약 작성"(Codex)** 이다.
- **적용 범위**: 문서 전용. 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**.
  **`firebase` SDK는 이번에 추가하지 않았다**(추가 자체는 F-A로 승인됐고 실행은 구현 단계).
  실제 Firebase·network·live·emulator·Rules·Hosting·deploy 실행·변경 **0**.
- **기준**: `8ea0c30`.
- **승인된 결정(요약)**:
  - **F-A** Auth 도입, **1단계 = Auth + `admin/state.json` 읽기, 쓰기 0**, 기존 비익명 운영자 계정
    **1개만**, **`firebase` 모듈러 SDK 신규 의존성 승인**. 신규 계정·다중 계정·역할 권한·
    **Rules 변경은 승인하지 않음**. 계정의 실제 존재·접근 가능 여부는 **UNCONFIRMED**로 기록.
  - **F-B** `published/state.json` **발행 제외**, 쓰기를 열더라도 **admin 상태 저장만**,
    고객 공개 발행은 **별도 승인 + 별도 스펙**, 저장 UI에 **"발행되지 않음" 표시 필수**.
  - **F-C** `admin/state.json`은 **읽기만 공유**, 향후 쓰기는 **레거시와 격리된 rebuild 전용 경로**,
    경로는 **Codex 구조 계약**에서 확정, **레거시 공유 쓰기 금지**.
  - **F-D** 정규화 결과 **메모리 전용 유지**, **저장 payload에 승격 결과 미포함**,
    되쓰기·삭제·마이그레이션 **금지**.
  - **F-E** **E3-strong** — last-writer-wins 손실 **불허**, 원자적 precondition·잠금 가능성을
    **별도 조사·검증하기 전까지 쓰기 구현 차단**, Rules 변경·Firestore 잠금은 **별도 승인 대상**.
- **아직 승인되지 않은 것**: **제품 구현 자체** · 실제 Firebase/network/live/emulator/운영 데이터 접근 ·
  Rules/Hosting/배포 · 신규·다중 계정·역할 · 발행 · 레거시 공유 쓰기 · cm 되쓰기/마이그레이션 ·
  **쓰기 구현 전반**.
- **변경 파일**:
  - `docs/codex-claude-handoff/decisions/2026-08-10-admin-auth-write-boundary-decisions.md` (신규 정본)
  - `Automation/DENN_AUTOMATION_STATE.md` (`state: READY_FOR_CODEX`,
    `active_unit: admin-auth-read-only-contract`, `next_transition: WAITING_FOR_CODEX`,
    `baseline_commit: 8ea0c30`)
  - `Automation/NEXT_CLAUDE_PROMPT.md` (Codex 계약 작성 지시로 교체)
  - `docs/codex-claude-handoff/CURRENT.md` (상단 상태 블록 전환)
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md` (이 항목)
- **조사 보고서 §8의 예시 승인 프롬프트는 superseded**다. 정본은 위 결정 문서 하나뿐이며,
  **예시 문장을 실제 승인으로 기록하지 않았다** — 이번 기록은 Founder가 직접 보낸 승인 원문을
  그대로 인용한다.
- **커밋/push**: 문서 전용 단일 커밋 → fast-forward push. force·merge·rebase·`reset --hard` 없음.
- **실행한 검증**: `git diff --check 8ea0c30..HEAD`, 변경 경로가 허용 문서뿐인지 확인,
  제품 코드·테스트·의존성·lockfile diff **0** 확인, HEAD/origin/ahead-behind·dirty 경로 확인.
  (format·lint·typecheck·unit·build·E2E는 **문서 전용 변경이라 실행하지 않았다**.)
- **예상 밖 dirty 파일**: 없음. 보호 대상 3개는 restore·checkout·stage·commit 하지 않았다.
- **Codex가 다음에 할 일**: 허용 파일 목록 · AuthPort(실패 시 조용한 no-op 금지) ·
  읽기 port와 경로 allowlist(`admin/state.json` 읽기만) · 합성 fake 검증 범위(실제 network 0) ·
  `firebase` SDK 추가 방식 · NOT TESTED 경계. **쓰기 port·저장 UI·발행·revision/충돌·tombstone·
  마이그레이션은 계약에 넣지 않는다.**
- **권장 다음 상태**: `READY_FOR_CODEX` 유지. 계약이 나오면 Founder가 재검토하고,
  **구현 착수는 그 뒤 별도 승인**이다.

## 2026-08-10 — 스펙 036 구현 계약 작성 (FOUNDER_DECISION_REQUIRED)

- **목적**: Founder F-A~F-E 결정(정본 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`)의
  1단계인 **"Auth + `admin/state.json` 읽기 전용"** 구현 계약을 문서로 확정한다.
  **구현은 하지 않는다.**
- **적용 범위**: 문서 전용. 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**.
  **`firebase` SDK 미추가.** 실제 Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.
- **기준**: `6daf365`.
- **변경 파일**:
  - `docs/rebuild/specs/036-admin-auth-private-state-read.md` (신규 계약)
  - `Automation/DENN_AUTOMATION_STATE.md` (`state: FOUNDER_DECISION_REQUIRED`,
    `active_unit: spec-036-admin-auth-private-state-read-implementation-approval`,
    `baseline_commit: 6daf365`, `next_transition: WAITING_FOR_FOUNDER`)
  - `Automation/NEXT_CLAUDE_PROMPT.md` (구현 착수 승인 대기로 교체)
  - `docs/codex-claude-handoff/CURRENT.md` (상단 상태 블록 전환)
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md` (이 항목)
- **계약이 고정한 것(요약)**:
  - **범위**: Email/Password 인증 · 비익명 세션 관찰/복원 · 고정 `admin/state.json` 읽기 ·
    `readLegacyCatalog` 검증 · **메모리 전용**. 저장·쓰기·발행·업로드·revision·충돌·tombstone·
    마이그레이션 **전부 제외**.
  - **SDK/경계**: `firebase@12.16.0` **정확 고정**, 구현 단계에서만
    `packages/firebase/package.json` + `pnpm-lock.yaml`에 추가. admin 기능은
    **`@denn/firebase/admin-read` 서브패스 전용**이고 **루트 배럴
    `packages/firebase/src/index.ts`는 수정 금지**(고객 번들 오염 방지 — 근거 `:2`의 경계 선언과
    `package.json:6`의 단일 `"."` export). `packages/shared`·`packages/render` 무수정.
  - **활성화**: 기본 **비활성**. `VITE_DENN_ADMIN_FIREBASE_ENABLED=true` + **완전한** 공개 config가
    모두 있을 때만 초기화, 아니면 `UNCONFIGURED` 고정 상태 + SDK·observer·Storage **0회**.
    실제 config 하드코딩·`.env` commit·live 테스트 파일 작성 **금지**.
  - **AuthPort**: `User`/token/credential/raw error 비노출 · `onAuthStateChanged`로 초기 판정
    (`currentUser` 추정 금지) · 익명은 authenticated 불인정 · 가입/재설정/다중계정 UI 0 ·
    이메일 하드코딩 0 · password 저장·로그 0 및 시도 종료·unmount 시 정리 ·
    `browserLocalPersistence` 실패 **fail-closed** · 오류는 안전 category/code만.
    **계정 1개는 운영 정책이며 Rules가 UID/email을 강제하지 않는다는 한계를 계약에 명시했다.**
  - **AdminStateReadPort**: `ADMIN_STATE_OBJECT_PATH = "admin/state.json"` 상수(주입 불가) ·
    20 MiB 미만 · `getBytes(ref, max)` · **9단계 고정 순서** · 미인증/익명/초기화중 Storage **0회** ·
    write/upload/delete/`getDownloadURL`/published **0** · 자동 retry 0 · stale을 fresh로 위장 금지 ·
    **중복 load는 단일 in-flight 재사용**(UI 비활성화는 보조) · 늦은 결과 무시 · unmount 후 setState 0 ·
    **안전 오류 코드 15개 확정**.
  - **UI**: 8상태 · 명시적 `운영자 상태 불러오기` 클릭에서만 read · 자동 read/retry/polling 0 ·
    성공 문구 1개 · raw/경로/uid/email/SDK 원문 비표시 · 저장·발행·업로드·주문 버튼 0 ·
    **스펙 035 카드와 연결하지 않음** · `role=status`/`aria-live`/label 연결 명시.
  - **허용 파일 9경로 + 문서**, `packages/firebase/src/index.ts` 금지,
    `apps/admin/vite.config.ts`·CSS 기본 금지(필요 시 STOP).
  - **검증**: 합성 fake 전용 unit(패키지·앱) + E2E(Firebase 요청 0 · **고객 번들에
    `firebase/auth`·`firebase/storage`·admin-read 문구 0** · **고객 dist SHA-256 동일**) +
    §9 게이트 순서 + **STOP 조건 8개** + **NOT TESTED 8개**.
- **UNCONFIRMED**: **`firebase@12.16.0`이 레지스트리에 실제로 존재하는지와 Node 24/Vite 8/TS 7
  호환성**(실제 network 금지 — 설치는 구현 단계 첫 작업이며 실패 시 STOP) · 운영자 계정 실재 여부 ·
  `storage.rules` 실제 배포·거부 동작 · 실제 `admin/state.json` 존재·크기·내용.
- **커밋/push**: 문서 전용 단일 커밋 → fast-forward push. force·merge·rebase·`reset --hard` 없음.
- **실행한 검증**: `git diff --check 6daf365..HEAD`, 변경 경로가 허용 문서뿐인지 확인,
  제품 코드·테스트·manifest·lockfile·의존성 diff **0** 확인, HEAD/origin/ahead-behind·dirty 경로 확인.
  (format·lint·typecheck·unit·build·E2E는 **문서 전용 변경이라 실행하지 않았다**.)
- **예상 밖 dirty 파일**: 없음. 보호 대상 3개는 restore·checkout·stage·commit 하지 않았다.
- **권장 다음 상태**: `FOUNDER_DECISION_REQUIRED` 유지. **Founder가 계약을 검토하고 구현 착수를
  별도로 승인**해야 하며, 그 전에는 코드 작성과 `firebase` SDK 추가를 시작하지 않는다.

## 2026-08-10 — 스펙 036 계약 정확성 보완 (READY_FOR_CODEX)

- **목적**: 계약 초판(`77b5b47`)의 **버전·판정 규칙·타입·오류 매핑·상한 설명** 5개 부정확을 고친다.
  **제품 결정과 범위는 하나도 바뀌지 않았다.** 구현은 여전히 시작하지 않았다.
- **적용 범위**: 문서 전용. 제품 코드·테스트·CSS·설정·manifest·`package.json`·lockfile·의존성
  diff **0**. **`firebase` SDK 미추가.** Firebase·network·live·emulator·운영 데이터·Rules·Hosting·
  deploy 실행·변경 **0**.
- **기준**: `77b5b47`.
- **수정 항목 5가지**:
  1. **SDK 버전** — `firebase@12.16.0` → **`firebase@12.17.1` 정확 고정**(2026-08-04 최신 공식
     릴리스). 출처: <https://firebase.google.com/support/release-notes/js> ·
     <https://firebase.google.com/docs/web/setup>. **버전 존재를 VERIFIED로 기록**하고 초판의
     "존재 여부 UNCONFIRMED"는 제거했다. §9 게이트 주석과 §10 STOP 조건의 버전도 함께 고쳤다.
  2. **config 완전성 판정**(§3.1 신설) — 플래그는 **정확히
     `VITE_DENN_ADMIN_FIREBASE_ENABLED === "true"`**(`"1"`·`"TRUE"`·`"yes"`는 비활성),
     공개 config **5개**(`API_KEY`·`AUTH_DOMAIN`·`PROJECT_ID`·`STORAGE_BUCKET`·`APP_ID`)를
     **모두 `trim()` 후 비어 있지 않은 문자열**로 확보했을 때만 adapter 생성. 하나라도 없으면
     **`UNCONFIGURED` + `initializeApp`/Auth observer/Storage 0회**.
     **`packages/firebase`는 `import.meta.env`를 직접 읽지 않고 `apps/admin`이 만든 `AdminFirebaseConfig`
     만 주입받는다.** `env.d.ts`는 6개 키를 **`string | undefined`** 로 선언한다.
  3. **공개 타입 확정**(§4.1~4.2) — `Promise<Result>`처럼 **타입 인자가 빠진 표현을 제거**하고
     `packages/shared/src/index.ts:19`의 `Result<T, E>`를 **`E` 생략 없이** 사용한다.
     `OperatorAuthErrorCode` · `AdminReadErrorCode` · `SafeAdminReadError` ·
     `OperatorAuthActionResult` · `AdminStateLoadResult`를 완전 정의했고, sign-in/sign-out/load의
     **성공 value와 실패 error 형태**를 명시했다. **`correlationId`는 호출자(`apps/admin`)가 생성해
     세 시그니처 모두에 주입**하며 형식은 `/^[0-9a-f]{8,64}$/`(비식별 난수), 위반은
     `INVALID_REQUEST`(SDK 호출 0회). Firebase `User`·credential·token·raw SDK error는 공개 타입에 **없다**.
  4. **안전 오류 15개 매핑 표**(§5.3~5.4) — category / code / retryable / 발생 조건 /
     대응 SDK code·로컬 검증 단계를 표로 고정했다. **invalid credential 계열
     (`invalid-credential`·`wrong-password`·`user-not-found`·`invalid-email`·`user-disabled`)은
     계정 존재 추론을 막기 위해 `INVALID_CREDENTIAL` 하나로 통합**했다
     (`decisions/2026-07-21-security-and-privacy.md` §1 근거). `auth/too-many-requests` →
     `AUTH_RATE_LIMITED`, `auth/network-request-failed` → `NETWORK_UNAVAILABLE`,
     `storage/object-not-found` → `ADMIN_STATE_NOT_FOUND`, `storage/unauthorized` →
     `ADMIN_STATE_FORBIDDEN`, `storage/download-size-exceeded` → `RESPONSE_TOO_LARGE`,
     미등록 code는 `UNEXPECTED_ADMIN_READ_ERROR`로 접는다. **`NETWORK_TIMEOUT`은 SDK code가 아니라
     앱 wrapper 타임아웃 상태**임을 근거와 함께 구분했다(SDK는 안정된 timeout code를 보장하지 않는다).
     raw code/message 비노출, **자동 retry 0** 유지.
  5. **20 MiB 설명 정정**(§5.1) — `ADMIN_STATE_MAX_BYTES = 20 × 1024 × 1024 − 1 =
     **20,971,519 bytes**`. **서버가 read 크기를 제한하는 것이 아니다**:
     `storage.rules:14`가 **"read 조건에 `request.resource.size` 금지(read시 `resource=null` →
     항상 거부)"** 라고 명시하고, `admin/`의 `:26`은 크기 조건 없는 `allow read: if op();`다.
     이 값은 write-side `okSize()`(`:22`)와 숫자를 맞춘 **클라이언트 `getBytes` 안전 상한**이며
     **서버 read 보장으로 표현하지 않는다**.
- **변경 파일**:
  - `docs/rebuild/specs/036-admin-auth-private-state-read.md` (개정 이력 블록 + §2·§3.1·§4.1·§4.2·
    §5.1·§5.2·§5.3·§5.4·§9·§10·§11)
  - `Automation/DENN_AUTOMATION_STATE.md` (`state: READY_FOR_CODEX`,
    `active_unit: spec-036-contract-correction-review`, `next_transition: WAITING_FOR_CODEX`,
    `baseline_commit: 77b5b47`)
  - `Automation/NEXT_CLAUDE_PROMPT.md`, `docs/codex-claude-handoff/CURRENT.md`,
    `docs/live/CLAUDE_LIVE_PATCH_LOG.md` (이 항목)
- **검증 결과**: `git diff --check 77b5b47..HEAD` **PASS(클린)** · 변경 경로 = **허용 문서 5개뿐** ·
  제품 코드·테스트·manifest·`package.json`·lockfile·의존성 diff **0** ·
  `firebase` 의존성 저장소 전역 **0건**(미추가 확인) · HEAD=origin, ahead/behind **0/0** ·
  dirty = 보호 대상 3개뿐(restore·checkout·stage·commit 안 함).
  format·lint·typecheck·unit·build·E2E는 **문서 전용 변경이라 실행하지 않았다**.
- **미검증 경계(NOT VERIFIED / UNCONFIRMED)**:
  - **`firebase@12.17.1`의 실제 설치·빌드 호환성**(Node 24 / Vite 8 / TypeScript 7 / pnpm workspace)
    — **버전 존재는 VERIFIED**, 호환성은 구현 단계 `pnpm install --frozen-lockfile`에서 처음 확인된다
  - 운영자 계정의 실재·로그인 가능 여부 · `storage.rules`의 실제 배포 여부와 거부 동작
  - 실제 `admin/state.json`의 존재·크기·내용 · 실제 Storage CORS와 `getBytes` 동작
  - Firebase SDK가 timeout 계열 error code를 실제로 어떻게 내는지(그래서 wrapper 타임아웃으로 고정)
- **권장 다음 상태**: `READY_FOR_CODEX` — **Codex가 보완된 계약을 검토**하고, 그 뒤
  **Founder가 구현 착수를 별도 승인**해야 코드 작성과 SDK 추가를 시작한다.

## 2026-08-10 — 스펙 036 계약 타입·비동기 경계 보완 (READY_FOR_CODEX)

- **목적**: 계약(`9fb1456`)의 **타입 범위·비동기 권위·timeout 범위·비노출 검증 문구** 4건을 고친다.
  **제품 결정·범위는 바뀌지 않았고 구현은 시작하지 않았다.**
- **적용 범위**: 문서 전용. 제품 코드·테스트·CSS·설정·manifest·`package.json`·lockfile·의존성
  diff **0**. **`firebase` SDK 미추가.** Firebase·network·live·emulator·운영 데이터·Rules·Hosting·
  deploy 실행·변경 **0**.
- **기준**: `9fb1456`.
- **수정 내용 4가지**:
  1. **`OperatorAuthState` 오류 타입 축소**(§4.1) — `error`의 코드를 `AdminReadErrorCode` →
     **`OperatorAuthErrorCode`**. `INVALID_CATALOG`·`ADMIN_STATE_NOT_FOUND`·`ADMIN_STATE_FORBIDDEN`·
     `RESPONSE_TOO_LARGE`·`INVALID_JSON`·`AUTH_NOT_READY`·`AUTH_REQUIRED` 같은 catalog/storage·load
     전용 코드가 **인증 observer 상태에 타입상 들어올 수 없다**.
  2. **observer가 인증 상태의 유일한 권위**(§4.3 신설) — `OperatorAuthActionValue`에서
     **`state` 필드를 제거**하고 성공 값은 `correlationId`만 반환한다.
     `signInWithEmailPassword`/`signOut`의 Promise 성공은 **SDK action 완료만** 뜻하며,
     `authenticated`/`signed-out` 확정은 **`onAuthStateChanged` observer만** 담당한다.
     **action Promise 완료 순서와 observer 통지 순서를 가정하지 않으며**, UI는 action 결과의 상태로
     인증 상태를 **덮어쓰지 않는다**(덮어쓸 값 자체를 타입에서 없앤 것이 강제 수단).
     §8에 합성 테스트 3건 추가: ① sign-in Promise가 observer보다 먼저 끝나도 **조기 전환 없음**
     ② observer가 먼저 통지돼도 **늦은 action이 되돌리지 않음** ③ **sign-out 동일 규율**.
  3. **`NETWORK_TIMEOUT` 상수·범위 확정**(§5.4) — "예: 10s" 표현 제거,
     **`export const ADMIN_STATE_READ_TIMEOUT_MS = 30_000;`** 고정.
     wrapper는 **`AdminStateReadPort`의 `getBytes` 읽기에만** 적용하고
     **`signInWithEmailPassword`·`signOut`·`onAuthStateChanged`에는 적용하지 않는다** —
     Auth action은 timeout 반환 후 SDK가 **늦게 성공하면 실제 세션을 바꿔** 반환 결과와 실제 상태가
     갈라지기 때문이다. `getBytes`는 읽기 전용이므로 30초 초과 시 `NETWORK_TIMEOUT`을 반환하고
     **늦게 끝난 underlying Promise의 결과를 폐기**한다. ⚠️ **실제 SDK 요청 취소를 지원한다고
     주장하지 않는다**(대기를 포기할 뿐). 늦은 완료는 **generation/`correlationId`로 무시**하고
     UI·메모리 상태를 갱신하지 않으며 **자동 retry는 0**이다. fake timer 테스트로
     **29,999 ms 미완료 · 30,000 ms timeout · timeout 후 늦은 성공 무시**를 §8에 고정했다.
  4. **비노출 검증 문구 정정**(§8.1 신설) — 초판의 "raw secret fixture가 **결과**에 0건"은 과했다.
     성공 결과는 검증된 `CatalogDocumentV1`/`CatalogReadReport`를 반환하므로 **정상 카탈로그에
     합법적으로 들어 있는 `data:` URL·base64가 성공 값에 존재할 수 있다.** 검증을 다음으로 분리:
     ① SDK raw error에 심은 가짜 token/email/uid/raw message → `SafeAdminReadError`와
     `JSON.stringify(error)`에 **0건** ② invalid UTF-8/JSON/catalog 실패 시 **원문 bytes/JSON/base64가
     error에 0건** ③ **UI·console/log에는 성공·실패 모두** raw catalog/base64/경로/token/email/uid
     **0건** ④ 성공 `AdminStateLoadValue`의 **합법적 카탈로그 data URL 제거는 요구하지 않음**
     ⑤ 성공 값에 **원문 bytes·원문 JSON 문자열을 별도 보존하지 않음**.
     성공 값은 **메모리 전용**이며 **스펙 035 UI·localStorage·IndexedDB·주문·upload·publish와
     연결하지 않는다**.
- **변경 파일**:
  - `docs/rebuild/specs/036-admin-auth-private-state-read.md` (개정 이력 2차 블록 + §4.1·§4.3·§5.4·§8·§8.1)
  - `Automation/DENN_AUTOMATION_STATE.md` (`state: READY_FOR_CODEX`,
    `active_unit: spec-036-final-contract-review`, `baseline_commit: 9fb1456`,
    `next_transition: WAITING_FOR_CODEX`)
  - `Automation/NEXT_CLAUDE_PROMPT.md`, `docs/codex-claude-handoff/CURRENT.md`,
    `docs/live/CLAUDE_LIVE_PATCH_LOG.md` (이 항목)
- **검증 결과**: `git diff --check 9fb1456..HEAD` **PASS(클린)** · 변경 경로 = **허용 문서 5개뿐** ·
  제품 코드·테스트·`package.json`·lockfile·의존성 diff **0** ·
  `firebase` 의존성 저장소 전역 **0건**(미추가 확인) · HEAD=origin, ahead/behind **0/0** ·
  dirty = 보호 대상 3개뿐(restore·checkout·stage·commit 안 함).
  format·lint·typecheck·unit·build·E2E는 **문서 전용 변경이라 실행하지 않았다**.
- **미검증 경계(UNCONFIRMED / NOT VERIFIED)**:
  - **`firebase@12.17.1`의 실제 설치·빌드 호환성**(Node 24 / Vite 8 / TS 7 / pnpm workspace) —
    버전 **존재는 VERIFIED**, 호환성은 구현 단계 `frozen install`에서 처음 확인된다
  - **Firebase SDK가 실제로 어떤 timeout/네트워크 error code를 내는지** — 그래서 `NETWORK_TIMEOUT`을
    SDK 매핑이 아닌 **앱 wrapper 상태**로 고정했다
  - **`getBytes`가 30초 안에 끝나는지, 실제 요청이 취소되는지** — 취소는 **주장하지 않는다**
  - 운영자 계정의 실재·로그인 가능 여부 · `storage.rules` 실제 배포 여부와 거부 동작 ·
    실제 `admin/state.json` 존재·크기·내용 · 실제 Storage CORS 동작
  - **observer와 action Promise의 실제 도착 순서** — 순서를 가정하지 않는 계약으로 대응했고,
    합성 fake로만 두 순서를 재현한다
- **권장 다음 상태**: `READY_FOR_CODEX` — **Codex의 최종 계약 검토**, 그 뒤 **Founder의 구현 착수
  승인**이 있어야 코드 작성과 SDK 추가를 시작한다.

## 2026-08-10 — 스펙 036 구현 (운영자 Auth + 비공개 admin/state.json 읽기)

- **승인**: Founder가 계약 `765dfb4`와 **구현 착수**를 승인. 기준 `765dfb4`, 구현 커밋 **`fd92fbc`**.
- **구현 범위**: 운영자 Email/Password Auth · `onAuthStateChanged` 기반 **비익명** 세션 관찰 ·
  고정 `admin/state.json` 읽기 · `readLegacyCatalog` 검증 · **메모리 전용**.
  쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 **0**.
- **변경 파일(20)**: `packages/firebase/package.json`, `packages/firebase/src/admin-read/**`(9),
  `apps/admin/package.json`, `apps/admin/src/admin-read/**`(5), `apps/admin/src/App.tsx`,
  `apps/admin/src/env.d.ts`, `tests/e2e/admin-auth-read.spec.ts`, `pnpm-lock.yaml`.
  **`packages/firebase/src/index.ts` 무변경**, `apps/mockup/**`·`packages/render/**`·
  `packages/shared/**`·`storage.rules`·`firestore.rules`·`firebase.json`·`pnpm-workspace.yaml` 무변경.
- **핵심 설계**:
  - **번들 격리** — admin 기능은 `@denn/firebase/admin-read` 서브패스로만 공개하고 SDK는
    `sdk-facade.ts`의 **동적 import**로만 닿는다. 결과: **고객 `dist` SHA-256 구현 전후 동일**,
    admin 번들에서 Firebase는 **lazy 청크 4개**로 분리(unconfigured면 로드 0).
  - **observer 단일 권위** — sign-in/sign-out은 `{correlationId}`만 반환하고 상태를 쓰지 않는다.
    Promise 먼저 / observer 먼저 두 순서를 각각 unit으로 고정.
  - **인증 게이트** — `initializing`·`signed-out`·`anonymous`에서 `getBytes` 0회.
  - **경로 주입 불가** — `load`의 인자는 `{correlationId}`뿐이고 실제 요청은 항상 `admin/state.json`.
  - **timeout** — 29,999 ms 미완료 / 30,000 ms `NETWORK_TIMEOUT` / 늦은 성공 폐기(fake timer).
    **SDK 취소는 주장하지 않는다.** 자동 retry 0.
  - **비노출** — 심은 raw message·email·uid·token이 `SafeAdminReadError`와 `JSON.stringify(error)`에
    0건, 실패 payload에 원문 bytes/JSON 0건, 화면에 경로·uid·카탈로그 0건.
  - **기본 비활성** — 플래그 정확 비교 + 공개 config 5개 완전성(5키 × 3결측 전수 unit).
- **게이트 결과**: `pnpm install --frozen-lockfile` **PASS(exit 0)** · format · lint
  (`--error-on-warnings`) · typecheck PASS · unit **1258/1258**(035 시점 1213 → +45) ·
  독립 build PASS · 전체 Chromium E2E **134/134**(131 → +3) · `pnpm check` PASS ·
  `git diff --check` 클린 · 금지 diff **0** · 고객 dist SHA-256 **구현 전 = 구현 후 = E2E 후**
  (`f86d446d…7bbc09`) · ports 4183/4184 **0** · OS temp `denn-e2e-*` **0** ·
  **실제 Firebase endpoint 요청 0건**(E2E가 요청 URL 전수 검사).
- **⚠️ 미해결 — `pnpm-workspace.yaml`(커밋 안 함)**: `pnpm install`이 pnpm 11 정책으로
  `allowBuilds` 자리표시자 3줄을 자동 추가했고 그 상태의 frozen install은 **exit 1**이었다.
  출처가 이번 세션의 내 작업임을 확인하고(HEAD에 없음, 마지막 커밋은 스펙 010) Founder 지시에 따라
  **3줄을 제거**했으며, 제거 상태에서 frozen install은 **exit 0**이고 pnpm이 다시 추가하지도 않았다.
  **NOT VERIFIED**: pnpm이 무시 결정을 `node_modules/.modules.yaml`(`pendingBuilds`)에 기록하므로
  **`node_modules` 없는 새 클론에서 재발 가능**하다. 재발 시 최소 안전 해결책은
  `@firebase/util`·`protobufjs`를 **`false`**로 명시하는 것이고, 그 수정과 `pnpm approve-builds`는
  **별도 Founder 승인 대상**이다.
- **예상 밖 dirty**: 없음. 보호 대상 3개(spec-018 PNG 2개 + content diff 0인
  `packages/render/src/plan/index.ts`)는 restore·checkout·stage·commit 하지 않았다.
- **NOT TESTED**: 운영자 계정의 실제 존재·로그인 가능 여부 · `storage.rules` 실제 배포 여부와
  거부 동작 · 실제 `admin/state.json` 존재·크기·내용 · 실제 인증 만료·갱신 ·
  실제 Storage CORS와 `getBytes` 동작 · 실기기 · 쓰기 원자성 ·
  **실제 SDK 오류 코드 문자열**(매핑은 계약 표 기준이며 합성 fake로만 검증).
- **권장 다음 상태**: `READY_FOR_CODEX` — Codex 독립 검증. 다음 스펙은 시작하지 않는다.

## 2026-08-10 — 스펙 036 CORRECTION_REQUIRED 라운드 1

- **기준**: `e873049` (구현 `fd92fbc`). **보완 커밋 `b7ee207`**(제품), 종료 문서는 별도 커밋.
  지적된 **4개 결함만** 고쳤고 제품 범위·공개 8상태·observer 단일 권위는 그대로다.
- **① 초기화·observer 오류 fail-closed**
  - 재현: `createLazyFacade`가 `createFirebaseAdminFacade` **rejection을 처리하지 않아**
    ⓐ unhandled rejection ⓑ observer 미부착 → 상태가 **`initializing`에 영구 고정**.
    SDK observer의 error callback도 전달하지 않았다.
  - 수정: `AdminFirebaseFacade.onAuthStateChanged(listener, onError)`로 오류 경계를 계약에 추가,
    `sdk-facade.ts`가 Firebase error callback 전달, `createLazyFacade`가 factory rejection을
    같은 `onError`로 라우팅, `auth-port`가 `mapAuthError`를 거쳐 **안전 코드만** publish
    (`auth/network-request-failed` → `NETWORK_UNAVAILABLE`, 미등록 → `UNEXPECTED_ADMIN_READ_ERROR`).
    **rejection 전 unsubscribe 시 callback·상태 갱신 0회**, StrictMode 구독/해제 균형 유지.
  - unit: factory rejection이 unhandled 아님(`process.on("unhandledRejection")`) · 안전 매핑 ·
    raw message 비노출 · unsubscribe 후 침묵 · 준비 후 observer 오류 전달 ·
    error 상태에서 read `AUTH_REQUIRED` + `getBytes` 0회.
- **② 30,000 ms timeout 공개 계약 고정**
  - 재현: 공개 `AdminStateReadPortOptions.timeoutMs?`로 호출자가 계약 상수를 우회 가능.
  - 수정: 공개 옵션에서 제거, 공개 factory는 항상 `ADMIN_STATE_READ_TIMEOUT_MS`.
    seam `createAdminStateReadPortWithTimeout`은 `read-port.ts` 내부이며 `index.ts` 미노출.
  - unit: 런타임 `{timeoutMs:5}` 주입에도 29,999 ms 미완료 / 30,000 ms `NETWORK_TIMEOUT` ·
    공개 surface에 seam 이름 없음.
- **③ 로그아웃 동시성 차단**
  - 재현: `signOut`이 `busy`를 세우지 않아 중복 signOut과 진행 중 load/signIn이 시작 가능.
  - 수정: 내부 `busy="signing-out"` 가드. **새 공개 상태·문구 0**, 진행 중 `canSignIn`/`canLoad` false,
    완료 후에도 `signed-out` 확정은 observer만.
  - unit: 중복 signOut → `auth.signOut` 1회 · 진행 중 `read.load` 0회 · `signIn` 0회 ·
    observer 선도착 시 늦은 Promise가 상태를 덮지 않음 · 실패 시 안전 코드 + 액션 재개방.
- **④ Vite 경고 제거**
  - 재현: `import(\`./index?probe=${Date.now()}\`)` → `warning: invalid import …` 매 unit 실행.
  - 수정: `vi.resetModules()` + 정적 `import("./index")`. import side-effect 검사는 유지.
- **변경 파일(8)**: `packages/firebase/src/admin-read/`{`facade.ts`,`auth-port.ts`,`read-port.ts`,
  `sdk-facade.ts`,`admin-read.test.ts`}, `apps/admin/src/admin-read/`{`create.ts`,`controller.ts`,
  `admin-read.test.tsx`}. `packages/firebase/src/index.ts`·`pnpm-workspace.yaml`·`apps/mockup/**`·
  `packages/shared/**`·`packages/render/**`·Rules·`firebase.json` **무변경**.
- **게이트(계약 순서, 실제 수치)**: ① frozen install **exit 0** ② format **exit 0** ③ lint **exit 0**
  ④ typecheck **exit 0** ⑤ unit **1271/1271 PASS**(1258 → +13), **invalid dynamic import warning 0건**
  ⑥ 독립 build **exit 0** ⑦ 전체 Chromium E2E **134/134 PASS** ⑧ `pnpm check` PASS
  ⑨ `git diff --check` 클린 ⑩ 금지 경로 diff **0건** ⑪ 고객 dist SHA-256 빌드 후 = E2E 후 =
  **`f86d446d…7bbc09`**(구현 전 기준값과 동일) ⑫ 실제 Firebase/network 요청 **0건**
  ⑬ ports 4183/4184 **0** · OS temp `denn-e2e-*` **0**.
- **NOT VERIFIED**: **`pnpm-workspace.yaml`의 `allowBuilds`** — 이번에도 수정하지 않았고
  `pnpm approve-builds`도 실행하지 않았다. `node_modules` 없는 새 클론에서의 frozen install 재발
  여부는 확인되지 않았으며, **Codex의 새 클론 시도는 registry EACCES로 중단**돼 성공·실패 어느
  쪽으로도 단정하지 않는다. 수정은 **별도 Founder 승인 대상**이다.
- **NOT TESTED(변동 없음)**: 운영자 계정 실재·로그인 · `storage.rules` 실제 배포·거부 동작 ·
  실제 `admin/state.json` 존재·크기·내용 · 실제 인증 만료·갱신 · 실제 Storage CORS·`getBytes` ·
  실기기 · 쓰기 원자성 · **실제 SDK 오류 코드 문자열**(매핑은 합성 fake로만 검증).
- **보호 대상**: spec-018 PNG 2개 + content diff 0인 `packages/render/src/plan/index.ts` —
  restore·checkout·stage·commit **하지 않았다**.
- **권장 다음 상태**: `READY_FOR_CODEX` — Codex 독립 재검증. 다음 스펙은 시작하지 않는다.

## 2026-08-10 — 스펙 036 CORRECTION_REQUIRED 라운드 2 (문서 전용, 해시 기록 정정)

- **기준**: `1796a2d`. **제품 코드·테스트·CSS·config·manifest·lockfile·`pnpm-workspace.yaml`
  변경 0.** 제품 보완 `b7ee207`의 4개 결함은 **Codex 독립 재검증 통과**
  (frozen install · format/lint 각 **153 파일** · typecheck · unit **1271/1271** +
  invalid dynamic import warning **0** · build · Chromium **134/134** · check ·
  diff·금지 경로 diff 0 · ports 4183/4184·E2E temp 잔여 0).
- **★ 정정 내용 — 라벨이 틀렸다. 값이 사라진 게 아니다.**
  Codex가 `f86d446d…7bbc09`를 재현하지 못했다고 보고했고, 확인해 보니 **두 값 모두 현재 HEAD에서
  그대로 재현된다.** 서로 **다른 것을 측정**했을 뿐이다:
  - **`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`**
    = **고객 JS 파일 자체의 SHA-256**. 파일 `apps/mockup/dist/assets/index-W_cZpbdf.js`,
    크기 **287,741 bytes**. 재현: `sha256sum apps/mockup/dist/assets/index-W_cZpbdf.js`
  - `f86d446dde121bce287b393f905a02208b106face54b0803033eb800437bbc09`
    = **`dist` 트리 전체의 집계 다이제스트**(파일별 해시 목록을 다시 해시한 값)이며
    **JS 파일 하나의 해시가 아니다**. 재현:
    `find apps/mockup/dist -type f | sort | xargs sha256sum | sha256sum`
  - 따라서 이전 라운드들에서 이 값을 **"고객 dist SHA-256"** 이라고 적은 **라벨이 부정확**했다.
    **과거 기록은 지우거나 덮어쓰지 않았고**, 이 항목과 스펙 036 라운드 2 절로 정정한다.
  - 앞으로의 정본은 **파일 해시**다. 집계 다이제스트는 `xargs sha256sum` 출력에 **경로 문자열이
    포함**되고 정렬·셸 환경에 의존해 **기계 간 비교에 부적합**하다. 기록은
    **파일명 + 바이트 수 + 파일 해시** 세 가지를 함께 남긴다.
- **확인된 재현**: ① 현재 HEAD 독립 build 2회 동일(Codex) ② E2E 전후 동일(Codex)
  ③ 기준 계약 커밋 `765dfb4` 임시 archive를 동일 고정 toolchain으로 build → 동일(Codex)
  ④ Firebase/admin-read/고객 유출 문자열 **0건**(Codex) ⑤ 현재 HEAD에서 **두 측정 방식 모두 재현**
  (Claude). → 제품 불변식 **"기준과 현재 고객 JS byte-identical" PASS**.
- **변경 파일(5, 전부 허용 문서)**: `docs/rebuild/specs/036-admin-auth-private-state-read.md`,
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `docs/codex-claude-handoff/CURRENT.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`.
- **검증**: 변경 경로 허용 문서 5개뿐 · `git diff --check` PASS ·
  제품 코드/test/config/manifest/lockfile diff **0** · HEAD=origin, ahead/behind **0/0** ·
  working tree = 보호 대상 3개뿐(restore·checkout·stage·commit 하지 않음).
  이 라운드는 문서 전용이라 format·lint·typecheck·unit·build·E2E는 **실행하지 않았다**
  (직전 라운드 수치가 정본).
- **NOT VERIFIED(변동 없음)**: `pnpm-workspace.yaml`의 `allowBuilds` — 수정하지 않았고
  `pnpm approve-builds`도 실행하지 않았다. 새 클론 frozen install 재발 여부는 확인되지 않았고,
  **Codex의 새 클론 시도는 registry EACCES로 중단**돼 성공·실패로 단정하지 않는다.
- **권장 다음 상태**: `READY_FOR_CODEX`. 다음 스펙은 시작하지 않는다.

## 2026-08-10 — 스펙 036 CORRECTION_REQUIRED 라운드 3 (문서 위생)

- **기준**: `91acec0`. **문서 전용.** 제품 코드·테스트·CSS·config·manifest·`package.json`·
  lockfile·`pnpm-workspace.yaml` 변경 **0**. 전체 테스트는 반복하지 않았다 —
  제품 수치의 정본은 **`b7ee207`** 에 대한 Codex 독립 검증분이다.
- **커밋 구분(이 라운드의 핵심)**:
  - **제품 검증 커밋 = `b7ee207`**(구현 `fd92fbc` + 라운드 1 보완) — Codex 독립 검증 통과.
  - **문서 커밋** = 라운드 2 `91acec0`(해시 기록 정정), 라운드 3(이 항목).
    **`b7ee207` 이후 제품 코드 변경은 없다.**
- **불일치 → 정정 (4건)**
  1. `Automation/DENN_AUTOMATION_STATE.md`의 `verified_commit`이 **스펙 035 시절 값 `e9e2af6`** 로
     남아 있어, 스펙 036에서 실제로 검증된 제품 커밋과 달랐다 → **`b7ee207`** 로 정정하고
     무엇을 가리키는지 주석으로 남겼다.
  2. 같은 파일 `active_unit`이 `spec-036-codex-independent-verification`이었으나 **제품 재검증은
     이미 끝난 상태**였다 → **`spec-036-closure-doc-verification`** 으로 정정,
     `next_transition`에 "Codex는 종료 문서를 본다"를 명시.
  3. `candidate_commit`에 제품 커밋과 문서 라운드가 섞여 있었다 →
     **문서 라운드에는 제품 후보가 없음**을 명시(`last product change is b7ee207`).
  4. `docs/codex-claude-handoff/CURRENT.md` 상단 정본 요약이 ⓐ "다음 = Codex 독립 재검증"이라
     말하고 ⓑ 같은 블록 아래에서 `f86d446d…`를 다시 **"고객 dist SHA-256"** 이라 부르며
     ⓒ 게이트 수치가 **unit 1258**로 낡아 있었다 → **종료 문서 확인 단계**로 고치고,
     정본 해시를 **파일명 + 287,741 bytes + `fc7660e5…`** 로, `f86d446d…`는
     **`dist` 트리 집계 다이제스트**로만 표기하고, 수치를 **unit 1271/1271 · Chromium E2E 134/134**
     로 맞췄다.
- **보존**: live 로그와 스펙 036의 **과거 append 기록은 삭제·덮어쓰지 않았다.**
  `CURRENT.md`는 상단 정본 요약만 현재 사실로 재작성했고, 그 아래 이력 블록은 그대로 두었다.
  스펙 036은 **종료 상태 문구 한 곳만** 갱신했다.
- **변경 파일(5)**: `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
  `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
  `docs/rebuild/specs/036-admin-auth-private-state-read.md`(종료 상태 문구만).
- **검증**: `git diff --check` PASS · 변경 경로 = 허용 문서뿐 ·
  제품 코드/test/config/manifest/lockfile diff **0** · HEAD=origin, ahead/behind **0/0** ·
  working tree = 보호 대상 3개뿐(restore·checkout·stage·commit 하지 않음).
- **NOT VERIFIED(변동 없음)**: `pnpm-workspace.yaml`의 `allowBuilds` — 수정·`approve-builds`
  모두 하지 않았고, 새 클론 frozen install 재발 여부는 미확인이며 Codex 시도는 **registry EACCES로
  중단**돼 성공·실패로 단정하지 않는다.
- **권장 다음 상태**: `READY_FOR_CODEX` — **Codex의 종료 문서 확인 → 스펙 036 종료 판단.**
  다음 스펙은 시작하지 않는다.

## 2026-08-10 — 스펙 036 Codex 종료 확인 · 오늘 작업 종료

- **확인 대상**: 문서 위생·종료 문서 커밋 `a0543fb`.
- **Codex 판정**: **PASS / 스펙 036 DONE**. 라운드 3 변경은 허용 문서 5개뿐이고
  `git diff --check`가 통과했으며 제품 코드·테스트·설정·manifest·lockfile 변경은 0이다.
- **Git 근거**: 확인 시점 HEAD=origin=`a0543fb`, ahead/behind 0/0. 워킹 트리는 보호 대상
  spec-018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`만 남아 있다.
- **최종 제품 근거**: 검증 커밋 `b7ee207`, unit **1271/1271**, Chromium E2E **134/134**.
  제품 검증은 이미 완료됐으므로 이번 종료 단계에서 전체 게이트를 반복하지 않았다.
- **남은 미검증**: `pnpm-workspace.yaml`의 새 클론 `allowBuilds` 재발 여부, 실제 운영자 계정·
  Firebase/Storage/Rules/CORS·실기기·쓰기 원자성은 기존 기록대로 NOT VERIFIED/NOT TESTED다.
- **다음 상태**: `WAITING_FOR_NEXT_SPEC`. Founder가 명시적으로 재개할 때만 다음 작업을 시작한다.
  자동화나 반복 작업은 만들지 않았다.

## 2026-08-11 — 스펙 037 후보: 운영자 저장 원자성·충돌 방지 계약 (읽기 전용 조사)

- **기준**: HEAD=origin=`68fe339`, ahead/behind 0/0. 스펙 036은 DONE.
- **조사 문서 커밋**: **`768eecf`** (일반 fast-forward push, `68fe339..768eecf`)
- **상태**: `CLAUDE_WORKING` → **`FOUNDER_DECISION_REQUIRED`**
  (강한 원자성을 **증명하지 못했고**, 열린 길이 전부 **새 권한**을 요구한다)
- **변경 파일(4, 전부 문서)**:
  - `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md` (신규)
  - `Automation/DENN_AUTOMATION_STATE.md`
  - `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md`
- **실행하지 않음**: 제품 코드·test·CSS·config·manifest·`package.json`·lockfile 수정 0 ·
  `storage.rules`/`firestore.rules`/`firebase.json` 수정 0 · 신규 의존성 0 ·
  실제 Firebase endpoint·운영 bucket·emulator·운영 데이터 요청 0 ·
  upload/write/delete/publish/deploy 0 · force push·merge·rebase·`reset --hard` 0 ·
  새 자동화·반복 작업 0 · 다음 구현 스펙 착수 0 · 스펙 037 제품 코드·구현 계약 작성 0.
- **보호 대상 3개**(spec-018 PNG 2개 + content diff 0인 `packages/render/src/plan/index.ts`):
  restore·checkout·stage·commit **하지 않았다**. 커밋 후에도 working tree에 그대로 남아 있다.

### ★★ 조사 결론 — F-E는 해제되지 않았다

**현재 client-only + 기존 Rules 경계에서 E3-strong은 구현 불가능하다. 쓰기 구현을 열지 않는다.**
결론 분류 = **"현재 근거로는 보장 불가능"**, 부분적으로 **"Firestore 또는 backend가 있어야 가능"**.

1. **Firebase Web SDK 12.17.1(`@firebase/storage@0.14.4`)의 공개 Storage 쓰기 API에 조건부 쓰기가 없다.**
   `uploadBytes`(`storage-public.d.ts:500`)·`uploadBytesResumable`(`:510`)·`uploadString`(`:545`)·
   `updateMetadata`(`:490`)의 인자는 `ref`/`data`/`metadata`뿐이고 precondition 파라미터가 **아예 없다**.
   dist 전량 grep에서 `ifGenerationMatch`·`ifMetagenerationMatch`·`precondition`·`etag` **0건**.
2. **★ 내부 구현이 구조적으로 막는다.** `index.esm.js:1413-1414`의 `generation`/`metageneration`
   mapping은 `writable=false`(`:1390-1397`)이고 `toResourceString`(`:1505-1515`)이 writable만
   직렬화한다 → **요청 body에 실릴 수 없다.** 업로드 urlParams는 `{ name }`뿐(`:1825`·`:1866`),
   `updateMetadata` PATCH에 `If-Match` 없음(`:1752-1764`).
   → **generation/metageneration은 `FullMetadata` 읽기 정보이지 쓰기 precondition 입력이 아니다.**
3. **★ endpoint가 다르다** — 클라이언트는 `firebasestorage.googleapis.com/v0/b/{bucket}/o`
   (`:27`·`:571-577`)로 가고, `ifGenerationMatch`가 문서화된 곳은 `storage.googleapis.com`
   **GCS JSON API**다. 문서화되지 않은 우회는 **제품 계약으로 쓰지 않는다**.
4. **★ Storage Rules만으로는 안 된다** — Rules는 **요청별 술어**라 두 운영자가 같은 base로 동시에
   `rev+1`을 제출하면 **둘 다 통과**한다. 공식 정의상 `create`="writes to file contents",
   `update`="updates to (pre-existing) file **metadata**" 라 **콘텐츠 덮어쓰기는 `create`** 이고,
   `request.resource`는 **`generation`·`metageneration`·`etag`를 제외**한다.
   Rules는 "낡은 base 덮어쓰기"를 거르는 **약한 방어**로만 유효하다(E2 품질 향상, E3 증명 아님).
5. **★ Firestore lock만으로도 안 된다** — cross-service 원자성이 **공식 문서에 존재하지 않는다**.
   업로드 성공 후 revision 갱신 실패 / lease 만료 + clock skew / **SDK 자동 재시도**(업로드 창
   **10분**, `:37`·`:43`)의 늦은 도착에서 **손실이 남는다**.
6. **열린 길은 둘뿐이고 둘 다 새 권한을 요구한다.**
   - **C5** Firestore head 포인터(CAS) + **revision별 immutable 객체**(덮어쓰기 0).
     신규 의존성 **0**(Firestore가 이미 `firebase@12.17.1` 안에 있다)이지만
     **`firestore.rules` 변경 필수** — 현재 catch-all `allow read, write: if false`가
     새 컬렉션을 **전부 거부**한다 — 그리고 **orphan 정리 정책** 필요. **PASS(조건부·미검증)**
   - **C6** 서버/Cloud Function이 GCS JSON API `ifGenerationMatch`로 쓰기. 문서상 가장 확실(**412**)이나
     **client-only 경계를 벗어나고** 저장소에 함수 기반이 **전무**(`firebase.json`에 `functions` 블록
     없음, `functions/` 없음). **PASS**
   - 나머지(무조건 쓰기 / 쓰기 전 재확인 / Rules rev+1 / Firestore lock / 단일 운영자 UI 잠금)는
     전부 **FAIL**.
7. **★ 원자성은 L-4(삭제 부활)를 고치지 않는다.** 그건 **병합 의미론** 문제이고 tombstone 계약이
   따로 필요하다. L-1(시계 역전)·L-2(디바운스 겹침)·L-3(rev 동률 고착)은 C5/C6에서 소멸한다.

### 확인된 공식 근거 (전부 2026-08-11 확인, Firebase/Google 문서만)

| URL | 이 조사에 쓰인 결론 |
| --- | --- |
| `docs.cloud.google.com/storage/docs/request-preconditions` | 4종 precondition의 표면 = **JSON/XML API·gcloud·서버 클라이언트 라이브러리**. `ifGenerationMatch=0`=객체 부재 시에만. 실패 = **412**. **Firebase Web(JS) SDK는 언급되지 않는다** |
| `docs.cloud.google.com/storage/docs/json_api/v1/objects/insert` | `ifGenerationMatch` 등은 **JSON API 쿼리 파라미터**(`storage.googleapis.com`), Firebase 클라이언트 경로가 아니다 |
| `docs.cloud.google.com/storage/docs/metadata` | generation/metageneration은 **서버 할당**, 클라이언트가 설정 불가. **★ generation은 단조 증가가 아니다** → revision 카운터로 쓸 수 없다 |
| `docs.cloud.google.com/storage/docs/consistency` | strong read-after-write. **동시 쓰기 승자는 미문서화**, race 회피 지침은 **"use preconditions"** 뿐 |
| `firebase.google.com/docs/storage/web/file-metadata` | **generation·metageneration 읽기 전용**. `updateMetadata()`에 조건 옵션 없음 |
| `firebase.google.com/docs/storage/web/upload-files` | 조건부 업로드·generation 매칭·create-only 의미 **문서에 없음** |
| `firebase.google.com/docs/storage/security/core-syntax` | **`create`="writes to file contents" / `update`="updates to (pre-existing) file metadata" / `delete`** |
| `firebase.google.com/docs/storage/security/rules-conditions` | **`request.resource`는 generation·metageneration·etag·timeCreated·updated를 제외**. 커스텀 메타데이터는 `.metadata` |
| `firebase.google.com/docs/rules/rules-language` | Storage 메서드 목록. **원자성·동시성 서술 없음** |
| `firebase.google.com/docs/firestore/manage-data/transactions` | all-or-nothing, 경합 시 자동 재실행, 오프라인 실패. **★ Firestore 밖 서비스를 포함하는 트랜잭션 서술 없음** |

⚠️ `firebase.google.com/docs/reference/js/storage*`와 `docs/reference/security/storage`는
**JS 렌더링 참조 문서라 본문을 취득하지 못했다.** 그 자리를 **저장소에 설치된
`storage-public.d.ts`**(그 참조 문서의 생성 원본)로 대체했고 보고서 §3.1에 그렇게 기록했다.
검색 결과·블로그는 **정본으로 쓰지 않았다.**

### UNCONFIRMED (문서 근거를 찾지 못함 — 추측하지 않았다)

- Storage **Rules 평가와 object write 사이의 원자성**(직렬화 여부)
- **덮어쓰는 업로드(`create`)에서 `resource`가 이전 객체로 채워지는지**
- Storage Rules에 Firestore `exists()`에 해당하는 **"객체 부재" 판정 수단**이 있는지
- `firebasestorage.googleapis.com/v0` 표면이 **precondition 쿼리 파라미터를 수용하는지**
- 위 참조 문서 3페이지 본문

### NOT VERIFIED (실행·재현하지 않았다)

C5·C6의 **실제 동시성 동작**(표의 PASS는 문서·구조 기반 추론) · 실제 412 응답 ·
Rules의 **실제 배포 여부와 거부 동작** · 실제 `admin/state.json`·`published/state.json` 내용 ·
L-1~L-4 재현 · 운영자 계정 실재·로그인 · 인증 만료·갱신 · 실기기 ·
Firestore 청크(`firebase-firestore.js` 683,502 bytes)의 실제 번들 영향(빌드 미실행) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이전 단위에서 이월, 미해결).

### Founder 결정 질문 (승인된 적 없다 — 승인된 것처럼 기록하지 않는다)

| # | 질문 |
| --- | --- |
| **G-1** | `storage.rules` 변경을 승인하는가? (C3/C5의 격리 경로 규칙에 필요. F-A는 Rules 변경을 **명시적으로 미승인**했다) |
| **G-2** | Firestore 사용과 `firestore.rules` 변경을 승인하는가? (현재 catch-all이 새 컬렉션을 **전부 거부**한다) |
| **G-3** | backend / Cloud Function 도입을 승인하는가? (저장소에 함수 기반이 **전무**하다) |
| **G-4** | 운영 비용·복구 정책을 어떻게 정하는가? (Firestore 과금, revision 객체 누적, **orphan 정리 주체·주기**) |
| **★ G-5** | **C5(Firestore) / C6(backend) / "쓰기를 계속 열지 않는다" 중 무엇을 고르는가?** "열지 않는다"도 정당한 선택지이며, 그 경우 운영자는 계속 레거시 admin에서 저장한다(스펙 035가 남긴 현 상태) |

### Codex 구조 결정 후보 (Founder 결정 후에만 의미가 있다)

**Y-1** revision 형식(**generation은 카운터로 못 쓴다**) · **Y-2** 격리 경로 —
**경로 형태와 원자성 전략을 함께 정해야 한다**(단일 고정 경로를 고르면 C5가 성립하지 않는다) ·
**Y-3** write port 경계(⚠️ **SDK 내부 자동 재시도** 때문에 "retry 0"이 port만으로 보장되지 않는다) ·
**Y-4** 충돌 오류 코드(`retryable: false` + 재읽기 유도가 자연스럽다) ·
**Y-5** 합성 fake 검증 범위(**동시성 재현은 가능, 서버 원자성 증명은 불가**) ·
**Y-6** L-4 tombstone · **Y-7** orphan 식별·정리 규칙.

### 유지

**F-B**(발행 제외) · **F-C**(레거시 `admin/state.json`은 읽기만 공유, 향후 쓰기는 rebuild 전용 격리 경로) ·
**F-D**(정규화 메모리 전용) · **F-E**(E3-strong, 쓰기 차단) **전부 무변경**.
스펙 036 계약 무변경. 리빌드 `apps/**`·`packages/**`의 **쓰기 표면 0건** 유지
(`uploadBytes`·`uploadString`·`deleteObject`·`updateMetadata`·`setDoc`·`runTransaction`·
`addDoc`·`getFirestore` grep **0건**; 레거시 HTML 2개에는 각 2건 존재하나 손대지 않았다).
`firebase.json`의 `hosting.public`은 여전히 `"."` 이라 **deploy 금지 상태 그대로**다.

- **다음 상태**: `FOUNDER_DECISION_REQUIRED`. 다음 스펙은 자동으로 시작하지 않는다.
  자동화나 반복 작업은 만들지 않았다.

## 2026-08-11 — 스펙 037 후보 원자성 조사 **보완 라운드 1** (CORRECTION_REQUIRED, 문서 전용)

> **★ 위의 2026-08-11 초판 항목은 삭제하지 않는다.** 아래가 그 정정 기록이며,
> 초판의 5개 서술이 이 항목으로 **superseded** 된다.

- **기준**: HEAD=origin=`9c57201`, ahead/behind 0/0.
- **정정 커밋**: **`1e3fd74`** (일반 fast-forward push, `9c57201..1e3fd74`)
- **초판 커밋**: `768eecf`(조사) + `9c57201`(라이브 로그) — 보존.
- **상태**: `CORRECTION_REQUIRED` / `CLAUDE_WORKING` → **`READY_FOR_CODEX`**
  **★ 아직 `FOUNDER_DECISION_REQUIRED`로 넘기지 않는다.**
  **이 정정이 Codex 검수를 통과한 뒤에만 Founder G-1~G-5 결정을 요청한다.**
- **변경 파일(4 + 이 로그 = 허용 5개)**:
  - `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- **실행하지 않음**: 제품 코드·test·CSS·config·manifest·`package.json`·lockfile·
  `pnpm-workspace.yaml` 수정 0 · `storage.rules`/`firestore.rules`/`firebase.json` 수정 0 ·
  신규 의존성 0 · 실제 Firebase/network/live/emulator/운영 데이터 요청 0 ·
  upload/write/delete/publish/deploy 0 · force push·merge·rebase·`reset --hard` 0 ·
  자동화 생성 0 · **스펙 037 계약·제품 코드 작성 0**.
- **보호 대상 3개**(spec-018 PNG 2개 + content diff 0인 `packages/render/src/plan/index.ts`):
  restore·checkout·stage·commit **하지 않았다**. 커밋 후에도 working tree에 그대로 남아 있다.

### 정정 1 — Storage Rules의 객체 부재 판정 (초판이 틀렸다)

- **초판 서술(폐기)**: "Storage Rules에 Firestore `exists()`에 해당하는 **객체 부재 판정 수단**이
  있는지 **UNCONFIRMED**", "객체가 없을 때만 생성하는 문서화된 방법이 없다".
- **정정**: 공식 Rules 참조는 **불변성 강제 예로 `allow write: if resource == null;`** 을 명시한다.
  → `https://firebase.google.com/docs/reference/security/storage/`
  **기존 객체가 없으면 `resource`가 null**이고, 이는 **불변 객체 경로에 적용 가능한 규칙**이다.
  해당 UNCONFIRMED 항목을 **삭제**하고 보고서 §5.1에 근거로 편입했다.
- **독립 교차 확인(이 세션에서 본문 취득 성공)**:
  `https://firebase.google.com/docs/storage/security/rules-conditions` 가 `resource`를
  **"file metadata for the file that *currently exists* at the request path"** 로 정의한다.
  현재 존재하는 파일이 없으면 그 메타데이터도 없다 → `resource == null` = 객체 부재. **의미 일치.**
- **⚠️ 취득 기록 정정**: `firebase.google.com/docs/reference/**` 계열은 이 세션 WebFetch로
  **여전히 본문 미취득**(JS 렌더링 — `.../security/storage`, `.../security/storage/index.html`,
  `.../js/storage`, `.../js/storage.uploadmetadata`, `firebase.google.cn` 미러까지 전부 재시도).
  **위 인용의 출처는 Codex 검수**이며 이 문서가 그것을 채택한다.
  초판이 **"미취득"을 근거로 "수단 없음/UNCONFIRMED"를 도출한 것이 결함**이다 —
  **미취득은 도구의 한계이지 문서 부재의 증거가 아니다.** 보고서 §4.1에 그렇게 기록했다.

### 정정 2 — 업로드와 metadata가 반드시 별개 요청이라는 단정 (초판이 틀렸다)

- **초판 서술(폐기)**: "콘텐츠 업로드(POST)와 metadata 갱신(PATCH)은 **반드시** 별개 요청이다",
  "업로드와 revision metadata는 비원자적인 별개 요청".
- **정정 근거(공식)**: `https://firebase.google.com/docs/storage/web/upload-files` 가
  `uploadBytes(storageRef, file, metadata)` 형태를 지원하고,
  `https://firebase.google.com/docs/storage/web/file-metadata` 가 `customMetadata`를 쓰기 가능으로 둔다.
- **정정 근거(설치된 SDK 실측, `@firebase/storage@0.14.4` `dist/index.esm.js`)**:
  - `multipartUpload` `:1807-1821` — `toResourceString(metadata_)` 결과가
    **바이트와 같은 multipart body의 첫 파트**로 들어간다.
  - `createResumableUpload` `:1865-1876` — 메타데이터 JSON이 **세션 시작 요청의 body**다.
  - 매핑 `:1443` `new Mapping('metadata','customMetadata', true)` → **customMetadata는 writable**.
- **정정 결과**: **custom metadata는 업로드 동작에 포함될 수 있다.**
  **`updateMetadata()`를 별도로 호출한 경우에만** 업로드와 PATCH가 별개다.
- **★ 유지되는 결론**: 업로드에 metadata를 실어도 **서버 generation precondition/CAS는 생기지 않는다**
  (업로드 요청 자체가 무조건적). → **Firebase Web SDK 공개 API에 조건부 덮어쓰기가 없다는 결론은 유지.**

### 정정 3 — Rules 동시성 단정 제거 (자기모순 해소)

- **초판의 모순**: Rules 평가와 write의 원자성을 **UNCONFIRMED**라 적으면서, 동시에
  "**Rules는 동시 요청을 직렬화하지 않는다**", "**두 요청이 둘 다 통과한다**"고 **단정**하고
  결정적 타임라인(t0/t1/t2/t3)을 제시했다.
- **정정**: 그 단정과 타임라인을 **삭제**했다. 남긴 것은 사실 하나뿐이다 —
  **"공식 문서에서 고정 경로 `rev+1` 검사가 compare-and-set처럼 동작한다는 보장을 찾지 못했다."**
  근거: `https://firebase.google.com/docs/rules/rules-behavior` (Rules는 **요청 단위 평가**,
  **원자성·트랜잭션성·동시 요청 처리 서술 없음**) · `https://firebase.google.com/docs/rules/rules-language`
  (동일) · `https://docs.cloud.google.com/storage/docs/consistency`
  (**동시 쓰기 승자 미문서화**, race 회피는 **preconditions**만 제시).
- **C3 판정 변경**: **FAIL → `NOT PROVEN / UNCONFIRMED`.**
  실패표의 해당 칸도 "FAIL 증명"이 아니라 **보장 근거 부재**로 표기했다.
- **정책 결론(기록)**: F-E는 "원자성 확인 전까지 쓰기 차단"이므로
  **확인되지 않은 방식으로 쓰기를 열 수 없다 → 차단 유지.**
- **분리 명시**: **`resource == null` 불변성 규칙**(정정 1, VERIFIED)과
  **고정 경로 revision CAS**(정정 3, NOT PROVEN)는 **별개 문제**다. 보고서 §5가 (A)/(B)로 나눠 기술한다.

### 정정 4 — C5 이중 트랜잭션 모순 수정

- **초판의 모순**: ① 트랜잭션으로 rev `N` 예약 → ② `rev-N.json` 업로드 → ③ `head==base`면 커밋.
  **①이 head를 바꾸면 ③이 반드시 실패**하고, **①이 아무것도 기록하지 않으면 두 writer가 같은 N을 예약**해
  같은 경로에 쓰게 되어 "덮어쓰기 0" 전제가 무너진다.
- **정정된 후보 프로토콜(A~H, 단일 트랜잭션)** — 보고서 §6.4:
  **A** payload별 **안정적인 고유 객체 경로**(random operation id 또는 content-addressed identifier).
  **revision 번호를 경로에 쓰지 않는다** — 그것이 예약 트랜잭션을 필요하게 만든 원인이다 ·
  **B** Storage Rules **`resource == null`** 로 기존 객체 덮어쓰기 **서버 금지** ·
  **C** 객체 업로드 성공 **뒤에 Firestore 트랜잭션을 하나만** 실행 ·
  **D** 저장 시작 시 캡처한 **`expectedBase`** 와 **현재 `head`** 비교 ·
  **E** `head != expectedBase`이면 **자동으로 새 base를 채택하지 않고 명시적 충돌로 중단**
  (조용한 재시도·자동 병합 금지) · **F** 일치할 때만
  `head = { revision: expectedBase + 1, objectPath, 필요한 안전 metadata }` ·
  **G** 두 writer 중 **한 명만** head를 바꾸고 다른 writer의 객체는 **orphan** ·
  **H** **orphan 식별·보존·정리 정책은 Founder 결정 대상으로 유지**(G-4).
- **반드시 명시한 것**:
  - **Firestore 트랜잭션의 원자성은 Firestore 문서 안의 read/write에만 적용된다**
    (`https://firebase.google.com/docs/firestore/manage-data/transactions`).
  - **Storage 업로드는 그 트랜잭션에 포함되지 않는다.**
  - **★ 이 설계가 안전할 수 있는 이유는 cross-service 원자성 때문이 아니라,
    immutable 객체를 먼저 만들고 Firestore `head`만을 단일 가변 정본으로 삼기 때문이다.**
    B의 서버 강제가 빠지면 논리가 성립하지 않는다.
  - **실제 동시성·Rules 배포·브라우저 종료는 NOT VERIFIED**다.
  - **C5를 PASS 또는 승인된 구조로 확정하지 않는다.**

### 정정 5 — C6 판정 정밀화

- **초판**: C6을 **"PASS"** 로 표기.
- **정정(2층 분리)**:
  - **조건부 쓰기 메커니즘 자체 = VERIFIED** — `ifGenerationMatch` 실패 시 **412 Precondition Failed**
    보장. 근거 `https://docs.cloud.google.com/storage/docs/request-preconditions` ·
    `https://docs.cloud.google.com/storage/docs/json_api/v1/objects/insert`.
  - **DENN end-to-end 구조 = NOT DESIGNED / NOT VERIFIED** — Cloud Function/backend의 **인증**
    (운영자 non-anon 검증)·**권한**(서비스 계정 범위)·**payload 제한**·**timeout**·**재시도 정책**·
    **배포·운영 설계**가 전부 없다. 저장소에 함수 기반 자체가 없다(`firebase.json`에 `functions` 블록
    없음, `functions/` 디렉터리 없음).
- → **"C6 전체 PASS"라고 부르지 않는다.**

### 정정 후 결론 (지시된 문구 그대로)

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 확인되지 않았다.**
- **기존 client-only + 현재 Rules로 E3-strong이 보장된다는 근거는 없다.**
- **따라서 F-E에 따라 쓰기 구현은 계속 차단한다.**
- **C5와 C6은 추가 권한이 필요한 후보이며 아직 Founder 선택이나 Codex 구조 승인을 받지 않았다.**
- **조사 정정 후에만 Founder G-1~G-5 결정을 요청한다.**

### 남은 UNCONFIRMED / NOT VERIFIED

- **UNCONFIRMED**: 고정 경로 `rev+1`의 CAS 보장 · 덮어쓰기 `create`에서 `resource`가 이전 객체로
  채워지는지 · `firebasestorage.googleapis.com/v0` 표면의 precondition 쿼리 수용 여부.
- **해소됨(초판에서 삭제)**: "Storage Rules에 객체 부재 판정 수단이 있는지" → **`resource == null`**.
- **NOT VERIFIED**: C5·C6의 실제 동시성 동작 · `resource == null` 규칙의 **실제 배포·거부 동작** ·
  실제 412 · 브라우저 종료·네트워크 단절·인증 만료·중복 탭 실거동 · 실제 `admin/state.json` 내용 ·
  L-1~L-4 재현 · 운영자 계정 실재·로그인 · 실기기 · Firestore 청크 번들 실측 ·
  `firebase.google.com/docs/reference/**` 본문(이 세션 미취득) ·
  `pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).

### 검증

- `git diff --check` **PASS**(exit 0) · 변경 경로 = **허용 문서 5개뿐**
- `apps/**`·`packages/**`·`tests/**`·`package.json`·lockfile·`pnpm-workspace.yaml` diff **0**
- `storage.rules`·`firestore.rules`·`firebase.json` diff **0**
- HEAD=origin=`1e3fd74`, ahead/behind **0/0**
- working tree = **보호 대상 3개뿐**(spec-018 PNG 2개 + content diff 0인
  `packages/render/src/plan/index.ts`) — restore·checkout·stage·commit 하지 않음
- **다음 상태**: `READY_FOR_CODEX`. Codex가 보완 라운드 1을 검토한다.
  다음 스펙은 시작하지 않았고 자동화도 만들지 않았다.

## 2026-08-11 — Founder G-1~G-5 승인 기록 (문서 전용)

- **기준**: HEAD=origin=`3b4ebda`, ahead/behind 0/0.
- **정본 문서(신규)**: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`
  — **승인 원문을 그대로 수록**했다.
- **상태**: `READY_FOR_CODEX` 유지. **다음 주체 = Codex**(구조 결정 Z-1~Z-8 + 스펙 037 구현 계약 작성).
- **변경 파일(5, 전부 문서)**:
  - `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md` (신규)
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- **실행하지 않음**: 제품 코드·test·CSS·config·manifest·`package.json`·lockfile·
  `pnpm-workspace.yaml` 수정 0 · **`storage.rules`·`firestore.rules`·`firebase.json` 수정 0**
  (승인은 났으나 계약 확정 후에 한다) · 신규 의존성 0 ·
  실제 Firebase/network/live/**emulator**/운영 데이터 요청 0 · upload/write/delete/publish/deploy 0 ·
  force push·merge·rebase·`reset --hard`·broad delete 0 · 자동화 생성 0 ·
  **스펙 037 구현 계약·제품 코드 작성 0**.

### 확정된 결정

- **G-1 `storage.rules` 최소 변경 승인** — 기존 `admin/{p=**}` **광범위 write 유지 안 함** ·
  legacy `admin/state.json` **읽기 전용 고정** · **rebuild 전용 경로만 생성** 가능하고
  **`resource == null`로 덮어쓰기·삭제를 서버에서 차단** ·
  **겹치는 match의 OR 평가로 불변 조건이 우회되지 않도록 상위 admin write도 함께 좁힘** ·
  쓰기 권한은 **단순 non-anonymous 전체가 아니라 승인된 기존 운영자 UID 한정** ·
  **실제 UID가 정본으로 제공되기 전 live Rules 배포 차단**.
- **G-2 Firestore 사용 + `firestore.rules` 최소 변경 승인**(C5 검증용) —
  **rebuild 전용 head 문서 하나만 가변 정본** ·
  head 변경은 **Firestore transaction 안에서 `expectedBase == 현재 head`일 때만** ·
  **`spaces/{token}`과 기존 Firestore 계약 무변경** ·
  **Firestore SDK는 admin 전용 lazy 경계 밖으로 노출 금지**.
- **G-3** Cloud Function·backend·Admin SDK 기반 **C6 미승인 — 예비 대안으로 보류**.
- **G-4** **orphan = head에서 참조하지 않는 불변 객체**로 구분 ·
  초기 구현에서 **클라이언트 delete 권한과 자동 정리 불허** ·
  **보존 기간·비용 한도·권한 있는 정리 주체가 별도 승인되기 전 실제 운영 쓰기 미활성화**.
- **★ G-5** 스펙 037 다음 구현 계약 후보 = **C5**(고유 불변 Storage 객체 + 단일 Firestore head
  transaction) · **C3 고정 경로 CAS와 C4 lease/lock은 사용하지 않는다** ·
  C6은 **C5가 안전하게 성립하지 않을 경우** 재검토 ·
  **허용 범위 = 구현 계약 작성 + 합성 fake + 로컬 Firebase Emulator 검증까지** ·
  **실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network·Rules 배포·Hosting 배포·
  `published/state.json` 발행은 미승인** ·
  emulator에서 **동시 저장 · timeout · 늦은 성공 · 브라우저 종료 상당 실패 · 인증 만료 · 중복 탭 ·
  orphan 발생 · head 불변** 검증 · **C5가 emulator 검증을 통과하기 전에는 운영 쓰기를 열지 않는다**.

### ★ 계약이 반드시 다뤄야 할 결과 (결정이 아니라 확인된 사실)

1. **★★ G-1을 배포하면 레거시 운영자 저장 경로가 닫힌다.**
   `denn-admin.html:740` = `await window.dennFirebase.uploadDataUrl(dataUrl,'admin/state.json');`
   이것이 **현재 운영자가 상태를 저장하는 유일한 경로**다(스펙 035 종료 기록: 리빌드 admin은
   값을 저장할 수 없고 운영자는 "확인 후 레거시 admin에 직접 입력"한다).
   G-1의 "legacy `admin/state.json` 읽기 전용 고정"을 배포하면 **이 저장이 서버에서 거부된다.**
   **★ 지금 당장 깨지지는 않는다** — G-1이 **UID 정본 제공 전 배포를 차단**했고 이번 라운드에서
   `storage.rules`를 **수정하지 않았다**. 위험은 **배포 시점**에 발생한다.
   → **배포 순서가 계약 항목이다(Z-8).** 리빌드 쓰기가 emulator 검증을 통과하기 **전에** Rules를
   배포하면 **운영자가 아무 데도 저장할 수 없는 구간**이 생긴다.
2. **★ UID 한정의 적용 범위가 열려 있다.** `storage.rules:18-21`의 `op()`는 `admin/`뿐 아니라
   `published/`·`templates/`·`placeholders/`·`guides/`·`mockups/`·`editor-overlays/`의 write
   조건에도 함께 쓰인다(`:35-40`). `op()` 자체에 UID를 걸면 **레거시 발행
   (`denn-admin.html:14946` = `uploadDataUrl(dataUrl,'published/state.json')`)과 자산 업로드까지
   UID에 묶인다.** rebuild 전용 경로에만 걸면 레거시 표면은 그대로다. → **Z-1**.
3. **★ OR 우회 차단은 `admin/` match 자체를 좁혀야 한다.** `storage.rules:5-7` 머리말이 이미
   경고하듯 Firebase는 **겹치는 match를 OR** 한다. 현재 `match /admin/{p=**}`의
   `allow write: if op() && okSize();`(`:25-28`)가 하위 전부를 덮으므로, rebuild 경로를 `admin/`
   아래 두고 `resource == null`을 걸어도 **상위 규칙이 통과시켜 불변성이 무너진다.**
   → **rebuild 경로가 `admin/` 하위인지 별도 최상위인지가 계약 항목이다(Z-2).**
4. **★ Emulator 검증은 설정 변경을 수반한다.** `firebase.json`에 **`emulators` 블록이 없고**
   (현재 `hosting`·`storage`·`firestore`만), 저장소에 `firebase-tools` 의존성이 **없다**
   (CLAUDE.md §5 기준 전역 설치). G-5가 emulator 검증을 허용했으므로 그 범위로 읽히지만
   **이번 라운드에서는 아무것도 수정하지 않았다.** → **Z-6이 정확한 파일·범위를 정해야 한다.**
5. **L-4(삭제 부활)는 C5로 해소되지 않는다.** 원자성은 "누가 이기는가"를 정할 뿐 **병합 의미론을
   고치지 않는다**. `frameSizes`에는 tombstone이 없다. → **Z-7 별도 계약 필요.**

### 다음 — Codex가 결정·작성할 것 (Z-1 ~ Z-8)

**Z-1** UID 한정 적용 범위 · **Z-2** rebuild 경로 위치·형태(**revision 번호를 경로에 쓰지 않는다**만
조사에서 확정; 식별자는 operation id vs content-addressed) · **Z-3** head 문서 위치·스키마와
`firestore.rules` 이중 강제 여부 · **Z-4** write port 경계·오류 코드(⚠️ **SDK 내부 자동 재시도**로
"retry 0"이 port만으로 보장되지 않는다) · **Z-5** `expectedBase` 캡처 시점 ·
**Z-6** emulator 검증 범위·허용 파일과 7개 시나리오의 결정적 재현 방법 · **Z-7** L-4 tombstone ·
**Z-8** 배포 순서.

### 선행 결정과의 관계

**F-A**의 "Rules 변경 미승인"은 **G-1·G-2가 최소 변경으로 대체**한다(배포는 여전히 차단).
**F-B**(발행 제외)·**F-C**(레거시 읽기만 공유)·**F-D**(정규화 메모리 전용)는 **유지**되며,
G-1이 F-C를 **서버 규칙으로 더 강하게** 만든다. **F-E**(E3-strong, 쓰기 차단)도 유지되고,
G-5가 차단 해제 조건을 **"emulator 검증 통과"** 로 구체화했다 — **조사만으로는 열리지 않는다.**

### ★ 신규 보호 대상

- **`docs/rebuild/design/taste-v2/`** — **Founder 소유의 별도 작업.** 수정·삭제·stage·commit 금지.
- 같은 작업으로 보이는 **`docs/rebuild/design/README.md`**(수정됨)와
  **`docs/rebuild/specs/038-page-design-prototype.md`**(untracked)도 **손대지 않았다.**
- 기존 보호 대상 유지: `docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
  `docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`.
- **force push · merge · rebase · `reset --hard` · broad delete 하지 않는다.**

### UNCONFIRMED / NOT VERIFIED

- **신규**: 실제 운영자 **UID**(저장소에서 확인 불가 — G-1이 배포 차단으로 처리) ·
  **Emulator에서의 C5 거동**(G-5의 7개 시나리오 **전부 미실행**) ·
  **`resource == null` 규칙의 실제 거부 동작**(emulator에서도 미확인).
- **유지**: 덮어쓰기 `create`에서 `resource`가 이전 객체로 채워지는지 ·
  `firebasestorage.googleapis.com/v0` 표면의 precondition 수용 여부 ·
  실제 `admin/state.json`·`published/state.json` 내용 · L-1~L-4 재현 · 운영자 계정 실재·로그인 ·
  실기기 · Firestore 청크 번들 실측 · `pnpm-workspace.yaml`의 `allowBuilds` ·
  `firebase.google.com/docs/reference/**` 본문(세션 WebFetch 미취득; `resource == null` 인용 출처는
  Codex 검수이며 `storage/security/rules-conditions`로 교차 확인).
- **추적 종료**: 고정 경로 `rev+1`의 CAS 보장 — **G-5가 C3를 사용하지 않기로 했으므로** 더 추적하지 않는다.

### 검증

- `git diff --check` **PASS**(exit 0) · 변경 경로 = **허용 문서 5개뿐**
- `apps/**`·`packages/**`·`tests/**`·`package.json`·lockfile·`pnpm-workspace.yaml` diff **0**
- `storage.rules`·`firestore.rules`·`firebase.json` diff **0**
- working tree = **보호 대상만**(spec-018 PNG 2개 · content diff 0인
  `packages/render/src/plan/index.ts` · Founder 소유 taste-v2 작업 3개) — 전부 손대지 않음
- **다음 상태**: `READY_FOR_CODEX`에서 **멈춘다.** Codex가 구조 결정과 스펙 037 구현 계약을
  검토·작성하기 전에는 구현을 시작하지 않는다. 자동화나 반복 작업은 만들지 않았다.

## 2026-08-11 — 스펙 037 C5 구현 계약 작성 (문서 전용)

- **기준**: HEAD=origin=`dc5666d`, ahead/behind 0/0.
- **입력**: Founder **G-1~G-5**(`dc5666d`, Codex 검수 통과) + **Codex 구조 결정 Z-1~Z-8**.
- **상태**: `READY_FOR_CODEX` 유지. **다음 주체 = Codex(계약 검토)**.
- **변경 파일(6, 전부 문서)**:
  - `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md` (신규 계약)
  - `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md` (신규 핸드오프)
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- **실행하지 않음**: `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·
  `firebase.json`·`package.json`·lockfile·`pnpm-workspace.yaml` 수정 **0** · 신규 의존성 0 ·
  실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 0 ·
  upload/write/delete/publish/deploy 0 · force push·merge·rebase·`reset --hard`·broad delete 0 ·
  자동화 생성 0 · **구현 착수 0**.
- **★ 이 계약은 실제 저장 구현도 admin UI 연결도 승인하지 않는다.**

### 설계 요지 — 왜 C5인가

조사가 확인한 사실이 설계를 강제했다. **Firebase Web SDK 공개 Storage API에 generation 기반
조건부 쓰기가 없고**(`@firebase/storage@0.14.4` dist 전량 grep 0건, `generation` mapping
`writable=false`), **고정 경로 rev+1 Rules가 CAS처럼 동작한다는 보장도 공식 문서에서 찾지
못했으며**(C3 = NOT PROVEN), **Firestore lock만으로는 cross-service 간극이 남는다**(C4 = FAIL).

→ **덮어쓰기를 아예 없앤다.** 객체는 **매번 새 불투명 경로에 한 번만 생성**되고,
**가변 지점은 Firestore head 문서 하나**뿐이며 그 이동만 **transaction CAS**로 보호한다.

> **★ 안전 근거는 Storage와 Firestore 사이의 cross-service 원자성이 아니다.**
> **불변 객체를 먼저 만들고 단일 가변 정본만 CAS로 옮기기 때문**이다.
> 간극에서 실패하면 **orphan 객체 + 명시적 충돌**이 되고, **남의 바이트를 덮는 일은 일어나지 않는다.**

### 계약이 확정한 것 (Z-1 ~ Z-8)

- **Z-1 UID 제한 범위** — `rebuild-admin-state/**` 와 `/rebuildAdminState/head`에**만** 적용한다.
  **★ `op()` 본체는 건드리지 않는다** — `storage.rules:18-21`의 `op()`는 `published/`·`templates/`·
  `placeholders/`·`guides/`·`mockups/`·`editor-overlays/` write에도 함께 쓰이므로(`:35-40`),
  바꾸면 **레거시 발행(`denn-admin.html:14946`)과 자산 업로드까지 우발적으로 잠긴다.**
  UID는 **새 함수로 새 경로에만** 건다. 실제 UID는 **UNCONFIRMED** —
  **추측하지 않았고 예시 값을 실제처럼 기록하지 않았다.** 커밋 Rules에는 **표시된 placeholder**만 두고,
  emulator는 **합성 UID `emulator-operator-DO-NOT-DEPLOY`**(실제 Firebase UID 형식과 명확히 구분)를 쓴다.
- **Z-2 Storage 경로** — `rebuild-admin-state/objects/{operationId}.json`.
  **기존 `admin/{p=**}` 하위가 아닌 별도 최상위 경로**라 **겹치는 상위 match가 없고 OR 우회가
  구조적으로 발생하지 않는다**(`storage.rules:5-7` 머리말이 경고한 문제).
  `operationId` = 저장 작업 시작 시 **1회 생성하는 무작위 UUID**이며 **재시도해도 새로 만들지 않는다**.
  경로에 **revision·고객 문구·catalog id·이메일·UID·시간·파일명 금지**.
  **content-addressed identifier 미사용.** `application/json`, **20 MiB 미만**,
  **`resource == null` create-only**, **update/delete 금지**.
- **Z-3 Firestore head** — `/rebuildAdminState/head` **단일 문서**가 유일한 가변 정본.
  허용 키 **3개**(`schemaVersion: 1` / `revision`: 1 이상 정수 / `objectPath`).
  **이메일·UID·고객 문구·원문 catalog·token·오류 원문 저장 금지.**
  최초 commit은 **head 부재 확인 후 revision 1로 create**, 이후는 transaction에서
  **현재 revision과 `expectedBase`가 같을 때만 정확히 +1**.
  `firestore.rules`가 **허용 키·정확한 문서 경로·승인 UID·최초 1·이후 +1을 이중 강제**하고
  `spaces/{token}`과 catch-all은 무변경.
  **★ Firestore Rules가 Storage 객체의 실제 존재를 원자적으로 증명한다고 주장하지 않는다** —
  Rules는 `objectPath` **문자열 형태**만 검사할 수 있고, 그 간극은 **읽기 fail-closed**(Z-5)가 흡수한다.
- **Z-4 패키지·port 경계** — 공개 표면 후보 **`@denn/firebase/admin-write`**,
  **`packages/firebase/src/index.ts` 루트 배럴 무변경**, **SDK·Firestore는 admin 전용 lazy 경계 밖으로
  노출 금지**(`sdk-facade.ts:24-28` 동적 import 패턴), **주입 facade + 합성 fake**,
  기본 앱 상태에서 **write adapter 생성·네트워크 0**.
  **이번 첫 구현 단위에 저장 버튼과 실제 admin UI 연결을 포함하지 않는다.**
  **한 번에 하나의 save만**, **앱 수준 자동 retry 0 · 자동 merge 0**.
  ⚠️ **Firebase SDK 내부 재시도가 존재하므로**(업로드 재시도 창 10분, `index.esm.js:37`·`:43`)
  **"네트워크 요청 자체가 정확히 1회"라고 단정하지 않는다** — 대신 `operationId`를 고정해
  SDK가 다시 쏘아도 **같은 불투명 경로**를 향하고 `resource == null`이 **두 번째를 서버에서 거부**한다.
  **오류 8분기**: `WRITE_CONFLICT` · `WRITE_AUTH_REQUIRED` · `WRITE_FORBIDDEN` ·
  `WRITE_INVALID_INPUT` · `WRITE_UPLOAD_FAILED` · `WRITE_UPLOAD_OUTCOME_UNKNOWN` ·
  `WRITE_HEAD_FAILED` · `WRITE_COMMIT_OUTCOME_UNKNOWN`.
  **CONFLICT와 두 OUTCOME_UNKNOWN은 `retryable: false`이며 재읽기 후 사용자의 명시적 재시도만** 허용한다
  (자동 재시도가 곧 덮어쓰기 위험이다).
  **raw SDK message·email·UID·token·object bytes를 오류·로그·UI에 노출하지 않는다.**
- **Z-5 읽기 기준과 `expectedBase`** — head가 **없으면** legacy `admin/state.json`을
  **revision 0**의 초기 기준으로 읽을 수 있다. head가 **있으면 head가 가리키는 rebuild 객체만** 읽고 검증한다.
  **head가 있는데 객체가 없거나 invalid하면 fail-closed** 하고 **legacy로 조용히 fallback하지 않는다**
  (조용한 fallback은 옛 데이터를 최신처럼 보여 주고 그 위에 저장하게 만들어 **실제 손실**을 만든다).
  `expectedBase`는 **사용자가 편집을 시작한 정확한 로드 결과의 revision**으로 고정하며,
  **저장 직전 자동 재채택·자동 병합 0**. **commit 성공 후에만** 로컬 기준을 반환된 새 revision으로 갱신한다.
  **upload 성공 후 head commit 전 실패는 orphan으로 남고 head는 바뀌지 않는다.**
  **commit 결과를 확인할 수 없는 timeout은 성공이나 실패로 추측하지 않고
  `WRITE_COMMIT_OUTCOME_UNKNOWN`으로 처리**한다.
- **Z-6 Emulator 검증 계약** — 실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network **접근 0**,
  **로컬 emulator만**. 기본 unit/E2E와 **분리**해 `*.emulator.test.ts` + `vitest.emulator.config.ts` +
  **`pnpm test:emulator`** 명시적 명령에서만 실행한다(`vitest.config.ts:17`의 `*.live.test.ts`
  제외 선례를 그대로 따름). **실제 Rules로 7개 시나리오**를 검증한다:
  ① 승인된 합성 UID만 객체 생성·head transaction 가능 ② 다른 UID·익명·미인증 거부
  ③ 동일 `operationId` 덮어쓰기와 delete 거부 ④ 같은 `expectedBase`의 두 writer 중
  **head 이동은 하나뿐이고 다른 쪽은 명시적 충돌** ⑤ upload 성공 후 commit 전 중단은
  **orphan만 남기고 head 불변** ⑥ timeout·늦은 성공·commit 결과 불명에서 **조용한 재시도·덮어쓰기 0**
  ⑦ 중복 탭·인증 만료 상당에서 **조용한 데이터 손실 0**.
  **★ fake 테스트는 호출 순서와 오류 매핑을 증명할 뿐 서버 Rules 원자성을 증명하지 않는다**를 명시했다.
- **Z-7 tombstone·병합** — 스펙 037에서 **도입하지 않는다**. 저장은 **문서 전체 CAS**이며
  `expectedBase` 충돌 시 **문서 전체를 거부**한다(부분 반영 없음).
  **L-4 삭제 부활의 자동 병합은 별도 후속 스펙**으로 유지한다 — **원자성은 병합 의미론을 고치지 않는다.**
  충돌 후 최신본을 다시 읽고 재적용하는 것은 **운영자의 명시적 행동**이어야 한다.
- **Z-8 배포 순서** — **이번 스펙에서 어떤 Rules나 앱도 배포하지 않는다.**
  실제 UID · orphan 보존/비용/정리 정책 · emulator PASS가 **모두** 확인되기 전 운영 쓰기를 열지 않는다.
  **현재 legacy `admin/state.json` 저장을 먼저 닫아 운영자가 아무 데도 저장할 수 없는 구간을
  만들지 않는다.** 실제 cutover 순서는 **별도 Founder 승인과 별도 배포 스펙** 대상이며,
  이 계약은 **목표 상태와 STOP 조건만** 기록한다.

### ★ Emulator 사전 확인 결과 (읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

| 항목 | 결과 |
| --- | --- |
| **Java** | **사용 가능** — `openjdk 21.0.11 2026-04-21 LTS` (Microsoft build) |
| **firebase-tools** | **사용 가능** — 전역 **15.22.4**. **저장소 의존성이 아니다**(어느 `package.json`에도 없음) → **lockfile 변경 불필요** |
| **Firestore emulator** | **캐시됨** `~/.cache/firebase/emulators/cloud-firestore-emulator-v1.21.0.jar` |
| **Storage rules runtime** | **캐시됨** `cloud-storage-rules-runtime-v1.1.3.jar` |
| **Emulator UI** | **캐시됨** `ui-v1.15.0` |
| **Auth emulator binary** | 별도 jar **없음**. firebase-tools 내장으로 보이나 **이 조사에서 확인하지 않았다 → UNCONFIRMED** |
| **포트** 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free**(확인 시점) |
| `.firebaserc` | `projects.default = "denn-products"` ← **실제 운영 프로젝트 id** |

**결론: 현재 환경은 새 설치 없이 emulator 검증을 시작할 수 있는 것으로 보인다.**
⚠️ **Auth emulator만 UNCONFIRMED**이며, **첫 실행에서 binary 다운로드·설치·신규 의존성이
필요해지면 실행하지 말고 STOP**이다. **타 프로세스 종료와 점유 포트 강제 해제도 하지 않는다.**

### ★★ 계약이 못 박은 두 위험

- **R-1 — Rules 배포가 운영자의 유일한 저장 경로를 닫는다.**
  `denn-admin.html:740` = `uploadDataUrl(dataUrl,'admin/state.json')`이 스펙 035 기준
  **운영자가 상태를 저장하는 유일한 경로**다(리빌드 admin은 저장 불가).
  G-1의 "legacy `admin/state.json` 읽기 전용 고정"을 배포하면 **이 저장이 서버에서 거부된다.**
  **현재는 안전하다** — 이번 스펙에서 Rules를 **수정도 배포도 하지 않았고**, UID 정본 전 배포가 차단이다.
  **위험은 배포 시점이며 Z-8이 그 순서를 STOP 대상으로 못 박았다.**
- **R-2 — emulator가 실제 프로젝트 id로 뜰 수 있다.**
  `.firebaserc`의 `projects.default`가 **실제 운영 프로젝트 `denn-products`** 이므로
  `--project`를 생략한 emulator 실행은 **그 id로 동작**하고, 설정이 어긋나면 클라이언트 SDK가
  **실제 프로젝트로 나갈 수 있다.** → 계약은 **`demo-` 접두 프로젝트 id 명시를 강제**하고
  (예 `demo-denn-emulator`, Firebase가 emulator 전용으로 다루며 실제 자격 증명이 없다),
  **emulator host 환경변수가 없으면 테스트 시작 자체를 거부**하며, **`.firebaserc`는 수정하지 않는다.**

### 그 밖에 계약이 명시한 안전장치

- **R-3** emulator 사본 Rules가 실제 Rules와 갈라지면 검증이 무의미해지므로,
  **UID 라인을 제외한 diff가 0**임을 **단위 테스트가 직접 고정**한다.
  이 테스트가 없으면 "실제 Rules를 검증했다"고 말할 수 없다.
- **R-8** `op()`를 건드리면 레거시 발행·자산 업로드가 함께 잠기므로 **`op()` 무변경**을 못 박았다.
- **고객 번들 불변식**: 이번 구현 단위는 `apps/**`를 건드리지 않으므로
  **고객 dist SHA-256이 반드시 동일해야 하고**, 달라지면 원인을 밝히기 전까지 진행 금지다.

### NOT TESTED / UNCONFIRMED (계약이 끝나도 남는 것)

실제 Firebase 프로젝트에서의 동작 전부(실제 Rules 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 그 계정의 실재·로그인** · 실제 네트워크 지연·단절에서의 거동
(emulator는 로컬이라 타이밍이 다르다) · 실기기·다중 기기 동시 편집 ·
**Auth emulator binary 가용성** · 운영 규모 payload(실제 `admin/state.json` 크기·내용) ·
orphan 누적의 실제 비용 · **L-4 삭제 부활**(이 스펙이 다루지 않는다) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).

### 다음

1. **Codex가 이 계약을 검토**한다.
2. 승인되면 **Founder가 구현 착수를 별도 승인**해야 한다
   (현재 승인 범위 = **계약 작성 + 합성 fake + 로컬 emulator 검증까지**).
3. 구현 단위는 **port + Rules 목표 상태 + emulator 검증까지**이며 **UI 연결을 포함하지 않는다.**
4. 운영 쓰기 개방은 **실제 UID + orphan 정책 + emulator PASS**가 전부 확인된 뒤
   **별도 cutover 스펙**에서 다룬다.

### 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

`docs/rebuild/design/taste-v2/**`(**Founder 소유의 별도 작업**) · `docs/rebuild/design/README.md` ·
`docs/rebuild/specs/038-page-design-prototype.md` ·
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
`docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`.
**전부 손대지 않았다.** force push · merge · rebase · `reset --hard` · broad delete **0**.

### 검증

- `git diff --check` **PASS**(exit 0) · 변경 경로 = **허용 문서 6개뿐**
- `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `package.json`·lockfile·`pnpm-workspace.yaml` diff **0**
- working tree = **보호 대상만**
- **다음 상태**: `READY_FOR_CODEX`에서 **멈춘다.** 자동화나 반복 작업은 만들지 않았다.

## 2026-08-11 — Codex 스펙 037 계약 검수 · CORRECTION_REQUIRED 라운드 1

- **검수 대상**: HEAD=origin=`c654023`, ahead/behind 0/0.
- **커밋 범위**: 계약·handoff·STATE/NEXT/CURRENT/live 문서 6개뿐.
- `git diff --check dc5666d..c654023` **PASS**.
- `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `package.json`·lockfile·`pnpm-workspace.yaml` diff **0**.
- **판정**: `CORRECTION_REQUIRED`, 문서 보완 라운드 1. 제품 구현은 계속 금지.

### 결함 5건

1. baseline load에 필요한 `/rebuildAdminState/head`의 **read/get 권한 계약이 누락**됐다.
2. 합성 UID Rules 사본을 선택할 **별도 emulator config가 없어** 배포 config와 섞일 위험이 있다.
3. `WRITE_COMMIT_OUTCOME_UNKNOWN`을 **무조건 orphan으로 단정**했지만 실제 transaction이 성공했을 수도 있다.
4. Firestore transaction callback의 **SDK 내부 재실행과 callback 부작용 금지**가 명시되지 않았다.
5. `@denn/firebase/admin-write`의 **`loadBaseline`/`save` 공개 타입·입출력**이 정의되지 않았다.

### 다음

- 정확한 교정 프롬프트를 `Automation/NEXT_CLAUDE_PROMPT.md`에 기록했다.
- Claude는 허용 문서 6개만 보완하고 일반 fast-forward commit/push한 뒤 `READY_FOR_CODEX`로 전환한다.
- 실제 코드·Rules·config·test·emulator 실행·Firebase/network/live 접근은 0을 유지한다.
- 자동화나 반복 작업을 만들지 않는다.

## 2026-08-11 — 스펙 037 계약 보완 라운드 1 (CORRECTION_REQUIRED, 문서 전용)

> **★ 위의 Codex 검수 항목과 `c654023` 초판 항목은 삭제하지 않는다.** 아래가 그 정정 기록이다.

- **기준**: HEAD=origin=`c654023`, ahead/behind 0/0. `fix_round: 1 / max 3`.
- **상태**: `CORRECTION_REQUIRED` / `CLAUDE_WORKING` → **`READY_FOR_CODEX`**.
- **변경 파일(6, 전부 허용 문서)**:
  - `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md` (정정본)
  - `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
  - ※ 이 커밋은 Codex가 작업 트리에 남긴 **검수 기록과 교정 프롬프트도 함께** 커밋한다.
- **실행하지 않음**: `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·
  `firebase.json`·**`firebase.emulator.json`**·`package.json`·lockfile·`pnpm-workspace.yaml`
  수정 **0** · 신규 의존성 0 · **실제 emulator 실행 0** ·
  실제 Firebase/network/live/운영 데이터 접근 0 · upload/write/delete/publish/deploy 0 ·
  force push·merge·rebase·`reset --hard`·broad delete 0 · 자동화 생성 0 · **구현 착수 0**.

### 교정 1 — Firestore head read 권한 누락 (계약 §4.4 전면 재작성)

초판은 `create`/`update`/`delete`만 적고 **`get`을 적지 않았다.** 그런데 §6.1 baseline load가
head를 읽어야 하므로 **그대로 구현하면 기능 자체가 성립하지 않는다.**

정정된 목표 규칙:

- **`allow get: if approvedOperator() && docId == 'head'`** — 승인 UID만, **정확히 head 문서만**.
- **`allow list: if false`** — 컬렉션 열거 금지.
- **`create`/`update`도 같은 승인 UID만** 허용.
- **다른 `rebuildAdminState` 문서는 모두 거부.**
- **허용 키는 `schemaVersion`·`revision`·`objectPath` 정확히 3개뿐.**
- **create는 `revision == 1`만** 허용.
- **update는 `revision`이 정확히 1 증가하고 `objectPath`가 이전 값과 달라야** 한다.
- **`objectPath`는 `rebuild-admin-state/objects/{UUID}.json` 형태만** 허용.
- **delete 금지.** **`spaces/{token}`과 catch-all 규칙은 변경하지 않는다.**

> `objectPath` 교체 강제는 교정 3의 **결과 판정**에도 쓰인다 — head의 `objectPath`가 이번
> `operationId`를 가리키면 **commit이 성공한 것**이라고 단정할 수 있게 된다.

### 교정 2 — emulator Rules 선택을 별도 config로 고정 (§7.3)

초판은 `firebase.json`에 `emulators` 블록을 추가한다고 했다 — **배포용 config와 합성 UID Rules가
섞일 수 있어 위험**하다.

- **`firebase.json`은 구현 단계에서도 수정하지 않는다.**
- **신규 `firebase.emulator.json`** 을 emulator 전용 config로 사용하며,
  **emulator 전용 Storage/Firestore Rules 사본과 emulator 포트만** 참조한다.
- 실행 명령은 **`--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를 모두** 포함한다.
- **emulator용 Rules 사본에는 합성 UID만** 존재한다.
- **배포 대상 `storage.rules`/`firestore.rules`에는 UNCONFIRMED 실제 UID placeholder만** 존재하며
  **live 배포는 계속 차단**한다.
- **배포 대상 Rules와 emulator Rules는 UID 상수 외 diff 0임을 unit test로 고정**한다.
- **`.firebaserc`는 수정하지 않는다.**
- **emulator host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트 시작 전에 실패**한다.
- **실제 Firebase project·자격 증명·운영 bucket으로 fallback하지 않는다.**
- **허용 파일 목록에서 `firebase.json`을 제거하고 `firebase.emulator.json`을 추가**했다.

### 교정 3 — 결과 불명과 orphan 의미 수정 (§6.5)

초판은 **`WRITE_COMMIT_OUTCOME_UNKNOWN`을 orphan으로 단정**했다. 그러면 **실제로 commit이
성공했을 가능성과 모순**된다. 결과가 불명이면 **orphan인지조차 모른다.**

정정된 결과 상태:

| 상황 | 객체 | head | 코드 |
| --- | --- | --- | --- |
| upload 명확히 실패(transaction 미시작) | 생성 안 됨 | 불변 | `WRITE_UPLOAD_FAILED` |
| **upload 결과 불명**(transaction 미시작) | **없거나 orphan일 수 있음** | **불변** | `WRITE_UPLOAD_OUTCOME_UNKNOWN` |
| upload 성공 + transaction 명확히 실패 | **orphan** | **불변** | `WRITE_HEAD_FAILED` |
| **upload 성공 + transaction 결과 불명** | **★ head에 연결됐을 수도, orphan일 수도** | **★ 바뀌었을 수도** | `WRITE_COMMIT_OUTCOME_UNKNOWN` |
| upload 성공 + `expectedBase` 불일치 | orphan | 불변 | `WRITE_CONFLICT` |

- **성공·실패·orphan 여부를 추측하지 않는다.**
- **반드시 head를 다시 읽어 `objectPath`와 `revision`을 확인해야만 결과를 판정한다.**
- **`WRITE_COMMIT_OUTCOME_UNKNOWN`은 `retryable:false`.**
- **reload 전 동일 payload를 자동으로도 수동으로도 재전송하지 않는다**
  (이미 반영됐을 수 있어 불필요한 revision·객체를 만든다).
- **`WRITE_HEAD_FAILED`도 upload 이후에 발생하므로 기본 `retryable:false`로 바꿨다.**
- **별도의 "head commit만 재개" API는 이번 스펙에 만들지 않는다.**
- **명확한 upload 실패만 `WRITE_UPLOAD_FAILED`**, **서버 반영 여부가 불명확한 오류는
  `WRITE_UPLOAD_OUTCOME_UNKNOWN`** 으로 분류한다.
- **orphan의 정의도 정정**했다: orphan = head가 참조하지 않는 것이 **확인된** 불변 객체.
  **결과 불명은 orphan이 아니라 "미판정"이다.**

### 교정 4 — Firestore transaction callback 재실행 계약 (§5.5 신설)

초판의 "transaction 단 한 번"은 **앱의 호출 횟수**를 뜻했는데 그 구분을 적지 않았다.

- **앱은 `runTransaction`을 정확히 한 번 호출한다.**
- **★ Firebase SDK는 transaction callback을 내부적으로 여러 번 실행할 수 있다**
  (공식 문서 "a transaction function might run more than once", `maxAttempts` 기본 5).
- **callback 안에서는 `transaction.get`/`transaction.set` 이외의 부작용을 금지한다** —
  **UUID 생성 · Storage upload · 로그 추가 · UI 변경 · 로컬 revision 변경** 전부 금지.
- **`operationId`와 `expectedBase`는 transaction 호출 전에 고정한다.**
- **callback 재실행마다 현재 head를 다시 읽되 `expectedBase`를 자동 변경하지 않는다.**
- **재실행에서 current revision과 `expectedBase`가 다르면 `WRITE_CONFLICT`로 중단한다.**
- **Storage upload는 transaction 밖에서 선행하며 callback 재실행으로 반복되지 않는다.**
- **callback 내부 재실행과 앱 수준 retry를 문서·테스트·오류 문구에서 명확히 구분한다.**

### 교정 5 — 공개 port 타입과 baseline/save 입출력 (§5.6)

`AdminStateRevision` · `AdminStateBaselineValue{catalog, revision, source}` ·
`AdminStateSaveRequest{correlationId, expectedBase, catalog}` ·
`AdminStateSaveValue{revision, objectPath}` ·
`AdminStateWritePort{loadBaseline, save}` 를 **이름까지 고정**했다.

- **`operationId`는 port 내부에서 save 호출당 한 번 생성**하며 **외부 입력으로 받지 않는다.**
- **첫 load에서 head가 없을 때만** legacy `admin/state.json`과 **revision 0**을 반환한다.
- **head가 있으면 rebuild 객체만 읽는다.**
- **head/object/schema/catalog 불일치는 fail-closed**하며 **legacy fallback은 0**이다.
- **save 성공 후 반환 revision만** 호출자가 새 baseline으로 채택할 수 있다.
- **`loadBaseline`과 `save` 모두 단일 in-flight.**
- **`packages/firebase/src/admin-read/**`는 이번 첫 구현에서 수정하지 않는다.**
- legacy read는 **기존 공개 계약을 재사용하거나 facade에서 조합**하되 **중복 검증 규칙을 만들지 않는다.**

#### ★ 구현 전 확인 필요 — `Catalog` 타입 이름

교정 지시의 타입 블록은 **`Catalog`** 를 쓰지만 **그 이름의 타입은 저장소에 존재하지 않는다.**
`@denn/shared`가 실제로 내보내는 이름은 **`CatalogDocumentV1`**
(`packages/shared/src/catalog/types.ts` — 스펙 036 `AdminStateLoadValue.document`가 그 타입이다).
계약은 `Catalog`를 **`CatalogDocumentV1`에 바인딩**하고 **동의어 타입이나 새 타입을 만들지 않는다**고
명시했다(교정 5의 "중복 검증 규칙 금지"와 같은 이유).
`Result`는 `packages/shared/src/index.ts:19`의 기존 타입을 쓴다.

### emulator 검증 보완 — 시나리오 7 → 12개

기존 7개(승인 UID만 가능 / 다른 UID·익명·미인증 거부 / 동일 `operationId` 덮어쓰기·delete 거부 /
두 writer 중 head 이동 하나 + 명시적 충돌 / commit 전 중단은 orphan만 남고 head 불변 /
timeout·늦은 성공·결과 불명에서 조용한 재시도·덮어쓰기 0 / 중복 탭·인증 만료에서 조용한 손실 0)에
다음을 추가했다.

- **#8 승인 UID의 head `get` 성공**(baseline load 성립 확인)
- **#9 다른 UID·익명·미인증의 head `get` 거부**
- **#10 head `list` 거부**
- **#11 transaction callback 재실행 시 Storage upload 반복 0**
- **#12 commit outcome unknown은 "head가 변경됐을 수도 있음"으로 다루고 재조회로 판정**
- **synthetic Auth 계정은 emulator 내부에서만 만들며 실제 계정 생성이 아니다.**

### 신규 위험 2건

- **R-9** transaction callback 재실행이 upload를 반복하거나 부작용을 남긴다
  → §5.5 부작용 전면 금지 + upload는 transaction 밖 선행, fake·emulator 양쪽에서 검증.
- **R-10** baseline load가 head를 읽지 못해 기능이 성립하지 않는다
  → §4.4 `get` 명시 허용 + `list` 거부, emulator #8~#10이 확인.

### 유지 (초판에서 바뀌지 않은 것)

C5 구조(불변 객체 + 단일 Firestore head CAS) · Z-1(`op()` 무변경, 실제 UID UNCONFIRMED) ·
Z-2(별도 최상위 경로, UUID 1회 생성, `resource == null` create-only) ·
Z-7(tombstone·자동 merge 없음, 문서 전체 CAS, L-4는 별도 스펙) ·
Z-8(배포 0, legacy 저장을 먼저 닫지 않음) · **저장 버튼·admin UI 연결 제외** ·
emulator 사전 확인 결과(Java 21.0.11 · firebase-tools 15.22.4 전역 · emulator jar 캐시됨 ·
포트 free · **Auth emulator binary는 UNCONFIRMED**) ·
**R-1**(Rules 배포가 운영자의 유일한 저장 경로를 닫는다) ·
**R-2**(`.firebaserc` default가 실제 운영 프로젝트 `denn-products`).

### 검증

- `git diff --check c654023..HEAD` **PASS**
- 변경 경로 = **허용 문서 6개뿐**
- `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml` diff **0**
- HEAD=origin, ahead/behind **0/0**
- working tree = **보호 대상만**(`docs/rebuild/design/taste-v2/**` ·
  `docs/rebuild/design/README.md` · `docs/rebuild/specs/038-page-design-prototype.md` ·
  spec-018 PNG 2개 · `packages/render/src/plan/index.ts`) — 전부 손대지 않음
- **다음 상태**: `READY_FOR_CODEX`에서 **멈춘다.** 구현하지 않았고 자동화도 만들지 않았다.

## 2026-08-11 — 상태 동기화 (문서 전용, 새 작업 없음)

> 바로 위 `스펙 037 계약 보완 라운드 1` 항목의 **누락된 커밋 hash를 확정 기록**한다.
> 그 항목은 커밋 **이전에** 작성돼 hash가 비어 있었다. 원문은 삭제하지 않는다.

- **보완 라운드 1 커밋**: **`41b54b9`** (`c654023..41b54b9`, 일반 fast-forward push)
- 확정 검증(그 커밋 기준): `git diff --check c654023..41b54b9` **PASS** ·
  변경 파일 **허용 문서 6개뿐** · `apps/**`·`packages/**`·`tests/**`·`storage.rules`·
  `firestore.rules`·`firebase.json`·`firebase.emulator.json`·`package.json`·lockfile·
  `pnpm-workspace.yaml`·`.firebaserc` diff **0** · HEAD=origin, ahead/behind **0/0**.

### 이번 동기화에서 한 일

`Automation/NEXT_CLAUDE_PROMPT.md`를 읽었으나 **Claude가 수행할 작업 항목이 없었다** —
§1~§3은 이미 완료된 정정 내역과 **Codex가 확인할 것**이고, 다음 주체는 **Codex(보완 라운드 1 재검토)**다.
따라서 새 작업을 시작하지 않고 **문서와 실제 상태의 불일치만** 맞췄다.

| 문서 | 불일치 | 정정 |
| --- | --- | --- |
| `DENN_AUTOMATION_STATE.md` | `candidate_commit: c654023` (초판 hash) | **`41b54b9`** |
| `DENN_AUTOMATION_STATE.md` | `origin_relation`이 "started at c654023"에서 멈춰 있음 | **`c654023 -> 41b54b9`, HEAD=origin 0/0** |
| `DENN_AUTOMATION_STATE.md` | 보완 라운드 1 섹션에 커밋 hash 없음 | **`41b54b9` 명시** |
| `CURRENT.md` | 기준이 `c654023`으로만 표기 | **`c654023` → 보완 커밋 `41b54b9`** |
| `NEXT_CLAUDE_PROMPT.md` | "기준: HEAD=origin=`c654023` → 보완 커밋"(hash 공란) | **`41b54b9` 명시** + **"이 파일에 Claude 작업 항목 없음"** 배너 추가 |
| `CLAUDE_LIVE_PATCH_LOG.md` | 보완 라운드 1 항목에 커밋 hash 없음 | **이 항목으로 확정 기록** |

> **원인**: 네 문서 모두 **커밋 직전에** 작성돼 hash를 담을 수 없었다.
> 앞으로도 hash가 필요한 기록은 **커밋 후 별도 동기화 항목**으로 남긴다.

### `Automation/MANUAL_HANDOFF_PROMPTS.md` 커밋

Founder가 남긴 **수동 인수인계 고정 프롬프트 문서**가 untracked로 있었다.
이 파일은 Claude↔Codex 인수인계의 **운영 규칙 정본**(작업 시작 프롬프트 · 검수 요청 프롬프트 ·
"실제 작업 범위의 정본은 `NEXT_CLAUDE_PROMPT.md`" · 완료 시 STATE/NEXT/CURRENT/live 동기화 의무)이므로
**추적 대상으로 커밋**했다. 내용은 **수정하지 않았다.**

### 실행하지 않음

제품 코드·test·CSS·`storage.rules`·`firestore.rules`·`firebase.json`·`firebase.emulator.json`·
`package.json`·lockfile·`pnpm-workspace.yaml` 수정 **0** · 신규 의존성 0 ·
**실제 emulator 실행 0** · 실제 Firebase/network/live/운영 데이터 접근 0 ·
upload/write/delete/publish/deploy 0 · force push·merge·rebase·`reset --hard`·broad delete 0 ·
자동화·반복 작업 생성 0 · **구현 착수 0**.

### 보호 대상 (전부 손대지 않음)

`docs/rebuild/design/taste-v2/**` · `docs/rebuild/design/README.md` ·
`docs/rebuild/specs/038-page-design-prototype.md` ·
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
`docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`.

### 다음

**Codex가 보완 라운드 1(`41b54b9`)을 재검토**하고 결과와 다음 Claude 지시를
`Automation/NEXT_CLAUDE_PROMPT.md`에 남긴다. 그 전까지 Claude는 새 작업을 시작하지 않는다.

## 2026-08-11 — Codex 스펙 037 계약 재검토 · CORRECTION_REQUIRED 라운드 2

- **검수 대상**: 보완 계약 `41b54b9` + 상태 동기화 `fad819f`.
- **Git 근거**: HEAD=origin=`fad819f`, ahead/behind 0/0.
- `git diff --check c654023..41b54b9` **PASS**.
- `git diff --check 41b54b9..fad819f` **PASS**.
- 보완 커밋은 허용 문서 6개, 동기화 커밋은 상태 문서 4개 +
  `Automation/MANUAL_HANDOFF_PROMPTS.md`뿐이다.
- `apps/**`·`packages/**`·`tests/**`·Rules/config/manifest/lockfile diff **0**.
- 제품 구현·실제 emulator·Firebase/network/live·배포 실행 **0**.

### 판정

최초 지적 5건의 방향은 반영됐지만 구현 전에 닫아야 할 계약 결함 4건이 남아
**`CORRECTION_REQUIRED` 라운드 2**로 판정한다.

1. **최초 create의 CAS 누락** — head가 없을 때 `expectedBase == 0`을 확인하지 않고 revision 1을 만든다.
2. **공개 타입 미완결** — 존재하지 않는 `Catalog`를 사용하고 `SafeAdminWriteError`의 정확한 타입이 없다.
3. **호출 불가능한 결과 불명 절차** — `operationId`는 내부인데 호출자에게 head의 `objectPath` 비교를 요구한다.
4. **검증 책임 혼합** — 결정적 seam 없이 callback 재실행과 commit outcome unknown을
   “실제 Rules emulator” 표에 포함했다.

### 다음

- 정확한 문서 교정 지시는 `Automation/NEXT_CLAUDE_PROMPT.md`에 기록했다.
- Claude는 허용 문서 6개만 보완해 일반 fast-forward push하고 `READY_FOR_CODEX`로 전환한다.
- 구현·Rules/config/test 변경과 emulator 실행은 계속 금지한다.
- 자동화나 반복 작업을 만들지 않는다.

## 2026-08-11 — 스펙 037 계약 보완 라운드 2 (CORRECTION_REQUIRED, 문서 전용)

> **★ 위의 Codex 라운드 2 검수 항목, 라운드 1 항목, 초판 항목은 삭제하지 않는다.**

- **기준**: HEAD=origin=`fad819f`, ahead/behind 0/0. `fix_round: 2 / max 3`.
- **상태**: `CORRECTION_REQUIRED` / `CLAUDE_WORKING` → **`READY_FOR_CODEX`**.
- **변경 파일(6, 전부 허용 문서)**:
  - `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md` (라운드 2 정정본)
  - `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
  - ※ Codex가 작업 트리에 남긴 **라운드 2 검수 기록도 함께** 커밋한다.
- **실행하지 않음**: `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·
  `firebase.json`·`firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·
  `.firebaserc` 수정 **0** · 신규 의존성 0 · **실제 emulator 실행 0** ·
  실제 Firebase/network/live/운영 데이터 접근 0 · upload/write/delete/publish/deploy 0 ·
  force push·merge·rebase·`reset --hard`·broad delete 0 · 자동화 생성 0 · **구현 착수 0**.

### 교정 1 — 최초 head 생성도 `expectedBase == 0`을 강제 (§4.3, §5.7)

**라운드 1의 결함**: head가 없으면 `expectedBase`를 **확인하지 않고** revision 1을 생성했다.
이는 G-2의 "`expectedBase`와 현재 head가 일치할 때만 변경"과 **모순**이다.
구체적 위험: **`expectedBase`가 5인 편집 세션**(사용자가 revision 5를 보고 편집 중)이
**head가 사라진 상황에서 revision 1을 만들어 5번까지의 이력을 조용히 밀어낼 수 있었다.**

정정:

- **head 없음은 논리적 revision `0`으로 취급한다.**
- head가 없을 때 **`expectedBase === 0`인 경우에만** revision 1 create를 허용한다.
- head가 없는데 **`expectedBase !== 0`이면 upload 뒤 head는 변경하지 않고 `WRITE_CONFLICT`** 로 끝낸다.
- **`expectedBase`는 0 이상의 safe integer만** 허용하고, 그 밖의 값은
  **upload 전에 `WRITE_INVALID_INPUT`**(Storage 호출 0회)이다.
- **persisted head `revision`도 1 이상의 safe integer만 유효**하며,
  **`+1`이 여전히 safe integer가 아니면 fail-closed**한다
  (`MAX_SAFE_INTEGER + 1 === MAX_SAFE_INTEGER + 2`라 검사가 없으면 CAS가 무너진다).
- 위 분기를 **§4.3 · §5.4 · §5.7 · §6.1~§6.5 · fake/emulator 검증표**에 같은 의미로 반영했다.
- **Firestore Rules의 create `revision == 1`, update 정확히 `+1` 규칙은 유지**하고,
  **`expectedBase` 자체는 클라이언트 transaction 계약에서 검사**한다
  (Rules는 요청자의 base를 알 수 없다).

### 교정 2 — 공개 타입 블록을 실제 저장소 타입으로 완결 (§5.6)

**라운드 1의 결함**: "정확한 타입" 블록이 **존재하지 않는 `Catalog`** 를 쓰고
**설명문에서만** `CatalogDocumentV1`에 바인딩한다고 적었다. 공개 계약으로는 불완전하다.

정정:

- 타입 블록 자체가 **`CatalogDocumentV1`을 사용**한다. **`Catalog` alias나 동의어 타입을 만들지 않는다.**
- **기존 `@denn/shared`의 `Result`를 사용한다고 import/type 표면까지 명시**했다
  (`packages/shared/src/index.ts:19`의 정의를 주석으로 함께 기록).
- **`AdminWriteErrorCode`(8개 union) · `AdminWriteErrorCategory` · `SafeAdminWriteError`** 의
  정확한 공개 타입을 함께 고정했다.
- **오류 코드는 계약의 8개만 허용**하고 **category/retryable 매핑은 §5.4 정본 표 한 곳**과 일치한다.
- **안전 오류에는 `correlationId` 외** raw SDK message · email · UID · token ·
  **object bytes** · **`objectPath`** · **`operationId`** 가 **들어가지 않는다**.
- **`AdminStateRevision`의 런타임 유효 범위**를 교정 1의 safe-integer 규칙과 일치하도록 명시했다.

### 교정 3 — commit 결과 불명의 재조회 주체와 반환 의미 (§6.6)

**라운드 1의 결함**: `operationId`를 port 내부에 숨기면서 **호출자에게 head를 재조회해
`objectPath`를 비교하라**고 했다. **호출자는 내부 `operationId`를 알 수 없어 그 절차를 수행할 수 없다.**

정정:

- transaction 결과가 불명확하면 **`save` 내부가 자신이 보유한 `operationId`로
  read-only reconciliation을 수행**한다.
- **reconciliation은 write retry가 아니다** — **Storage 재업로드 0 · transaction 재호출 0**.
- **동일 save 호출 안에서 bounded read를 최대 1회** 수행한다(무한 polling 금지).
  **transaction callback 안에서 하지 않는다**(§5.5 부작용 금지).
- **판정 3분기**:
  - head가 **`{ revision: expectedBase + 1, objectPath: 이번 operationId 경로 }`** 이면
    **save 성공으로 반환**한다.
  - head가 **여전히 논리적 base revision에 머물렀음이 확인되면**(head 부재 = base `0`,
    또는 `revision === expectedBase`) **commit 미반영으로 판정**하되
    **이미 업로드된 객체는 orphan이며 자동 재전송·삭제하지 않는다** → **`WRITE_HEAD_FAILED`**.
  - **다른 writer가 head를 이동시켜 이번 commit의 중간 성공 여부를 판정할 수 없거나**
    (`revision`이 `base`도 `base+1`도 아님, 또는 `base+1`인데 `objectPath`가 우리 것이 아님),
    **reconciliation read 자체가 실패/timeout이면 `WRITE_COMMIT_OUTCOME_UNKNOWN`을 유지**한다.
- `objectPath` 비교가 성립하는 이유는 **§4.4가 update마다 `objectPath` 교체를 강제**하기 때문이다.
- **호출자에게 `operationId`나 object path를 오류로 노출하지 않는다**(성공 값에만 `objectPath`가 나간다).
- **`loadBaseline`은 정상 baseline 로드 API이고, 내부 결과 불명 reconciliation을 호출자에게
  떠넘기는 API로 사용하지 않는다.**
- 위 분기의 정확한 오류 코드와 반환값을 **§5.4 · §5.6 · §6.5 · 결정적 fake 테스트(F-4)** 에 일치시켰다.

### 교정 4 — fake와 emulator가 증명하는 항목을 분리 (§7.5)

**라운드 1의 결함**: §7.5가 **"실제 Rules 사용" 표에 transaction callback 재실행과
commit outcome unknown까지** 넣었지만, **계약에 그 둘을 emulator에서 안전하고 결정적으로
유발하는 방법이 없다.**

정정:

- **(A) emulator + 실제 Rules 검증** — **E-1~E-8**: 승인 UID / 다른 UID / 익명 / 미인증 ·
  Storage **create-only**와 `update`/`delete` 거부 · head **`get` 허용·거부** · **`list` 거부** ·
  **키 / `objectPath` 형태 / revision Rules** · **두 writer CAS** · **orphan 시 head 불변**.
  (두 writer CAS와 orphan은 **seam이 필요 없다** — 실제로 동시에 실행하고 관측하면 된다.)
- **(B) 주입 fake 결정적 검증** — **F-1~F-10**: **callback 다회 실행** · **upload 반복 0** ·
  앱 **`runTransaction` 1회** · **upload/commit outcome unknown** · **bounded reconciliation** ·
  **늦은 성공 폐기** · **오류 매핑과 비노출** · §5.7 범위 검증 · §4.3 최초 create 분기 · baseline 분기.
- **★ emulator에 callback 재실행·commit outcome unknown을 남기려면 결정적이고 비파괴적인
  재현 seam을 계약이 정확히 제시해야 한다. 제시할 수 없으므로 fake 항목으로만 분류하고
  emulator 증명이라고 주장하지 않는다.**
- **(C) 재현 금지**: 실제 network 차단 · 프로세스 강제 종료 · 포트 강제 해제 · emulator kill ·
  실제 Firebase 접근으로 **재현하지 않는다**.
- **(D) 양방향 경계**: **합성 fake는 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를
  증명하지 않는다.** 어느 쪽도 상대의 결론을 빌려 쓰지 않는다.

### ★ Codex가 확인해 줘야 할 판단 1건 — `loadBaseline` 실패 코드 이름

교정 2가 **"계약의 8개 코드만 허용"** 을 요구하는데, 8코드는 `save` 기준으로 만들어졌고
**`loadBaseline`이 겪는 "persisted head 또는 그 객체가 계약을 위반해 사용할 수 없음"** 에
정확히 대응하는 이름이 없다.

**9번째 코드를 임의로 만들지 않고 `WRITE_HEAD_FAILED`의 의미를 확장**했다 —
"head transaction이 명확히 실패했다 **또는** persisted head/그 객체가 계약을 위반해 사용할 수 없다".
둘 다 **확정된 실패**이고 **`retryable: false`** 라 성질이 같다.
**이름이 `HEAD`인데 참조 객체까지 포함하는 점은 의도적 절충**이며, 다른 이름을 원하면
**계약만 고치면 된다**(제품 코드는 아직 없다). 계약 **§0.1 · §5.4**에 기록했다.

### 신규 위험 3건

- **R-11** head가 사라진 상황에서 revision 1을 만들어 이력을 밀어낸다 → §4.3 + **F-9**.
- **R-12** 호출자가 수행할 수 없는 복구 절차를 계약이 요구한다 → §6.6 + **F-4**.
- **R-13** fake로만 가능한 것을 "실제 Rules로 검증했다"고 오인한다 → §7.5 **(A)/(B) 분리 + (D) 경계**.

### 승인 상태 문구 통일 (§16)

- **이번 라운드에서 구현 착수를 승인하지 않는다.**
- **보완 문서 push 후 상태는 `READY_FOR_CODEX`.**
- **Codex 보완 라운드 2 재검토 전 구현은 0이다.**
- **Codex 통과 후에도 실제 제품 UI 연결 · live Firebase · Rules 배포 · 운영 쓰기는 계속 금지**다.
- **★ port/Rules/config/test 구현 착수 여부를 추측하지 않는다.** G-5가 허용한 범위
  (**합성 fake · 로컬 emulator**)와 결정 문서 §2가 금지한 **"제품 구현 착수"** 의 경계 판정은
  **Codex의 다음 검수 몫**이며, 계약과 핸드오프는 **양쪽을 구분해 기록할 뿐 결론을 내리지 않는다.**

### 유지 (라운드 1에서 바뀌지 않은 것)

C5 구조(불변 객체 + 단일 Firestore head CAS) · Z-1(`op()` 무변경, 실제 UID UNCONFIRMED) ·
Z-2(별도 최상위 경로, UUID save당 1회, `resource == null` create-only) ·
Z-3 §4.4 Rules 전 분기(`get`/`list`/create/update/delete) · Z-7(tombstone·자동 merge 없음) ·
Z-8(배포 0, legacy 저장을 먼저 닫지 않음) · **저장 버튼·admin UI 연결 제외** ·
`firebase.emulator.json` + `demo-denn-emulator` 강제(`firebase.json` 무수정) ·
emulator 사전 확인 결과(Java 21.0.11 · firebase-tools 15.22.4 전역 · emulator jar 캐시됨 ·
포트 free · **Auth emulator binary UNCONFIRMED**) ·
**R-1**(Rules 배포가 운영자의 유일한 저장 경로를 닫는다) · **R-2**(`.firebaserc` default가 운영 프로젝트).

### 검증

- `git diff --check fad819f..HEAD` **PASS**
- 변경 경로 = **허용 문서 6개뿐**
- 금지 범위(`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc`) diff **0**
- HEAD=origin, ahead/behind **0/0**
- working tree = **보호 대상만**(`docs/rebuild/design/taste-v2/**` ·
  `docs/rebuild/design/README.md` · `docs/rebuild/specs/038-page-design-prototype.md` ·
  spec-018 PNG 2개 · `packages/render/src/plan/index.ts`) — 전부 손대지 않음
- **다음 상태**: `READY_FOR_CODEX`, `fix_round: 2`. 구현하지 않았고 자동화도 만들지 않았다.

### 보완 라운드 2 커밋 확정 (같은 날, 상태 동기화)

- **보완 라운드 2 커밋**: **`d5789db`** (`fad819f..d5789db`, 일반 fast-forward push)
- 확정 검증(그 커밋 기준): `git diff --check fad819f..d5789db` **PASS** ·
  변경 파일 **허용 문서 6개뿐** · `apps/**`·`packages/**`·`tests/**`·`storage.rules`·
  `firestore.rules`·`firebase.json`·`firebase.emulator.json`·`package.json`·lockfile·
  `pnpm-workspace.yaml`·`.firebaserc` diff **0** · HEAD=origin, ahead/behind **0/0**.
- 위 라운드 2 항목과 `DENN_AUTOMATION_STATE.md`·`NEXT_CLAUDE_PROMPT.md`·`CURRENT.md`는
  **커밋 직전에 작성돼 hash 자리를 비워 두었다.** 이 동기화 커밋에서 네 문서 모두 **`d5789db`** 로 채웠다
  (`candidate_commit`, 라운드 2 섹션, NEXT 헤더, CURRENT 상태 줄).
- 문서 전용이며 제품 코드·Rules·config·test·lockfile 변경 0, emulator 실행 0,
  실제 Firebase/network/live/운영 데이터 접근 0, 자동화 생성 0, **구현 착수 0**이다.
- 보호 대상 6개는 **전부 손대지 않았다.**
- **다음**: Codex가 보완 라운드 2(`d5789db`)를 재검토하고 결과와 다음 Claude 지시를
  `Automation/NEXT_CLAUDE_PROMPT.md`에 남긴다. 그 전까지 Claude는 새 작업을 시작하지 않는다.

## 2026-08-11 — Codex 스펙 037 계약 재검토 · CORRECTION_REQUIRED 라운드 3

- **검수 대상**: 보완 계약 `d5789db` + 상태 동기화 `f694211`.
- **Git 근거**: HEAD=origin=`f694211`, ahead/behind 0/0.
- `git diff --check fad819f..d5789db` **PASS**.
- `git diff --check d5789db..f694211` **PASS**.
- 변경 범위는 허용 문서와 상태 동기화 문서뿐이며 금지된 제품/Rules/config/test diff **0**.
- 실제 emulator·Firebase/network/live·배포 실행 **0**.

### 판정

라운드 2의 네 교정은 반영됐지만 최종 계약 결함 2건이 남아
**`CORRECTION_REQUIRED` 라운드 3**으로 판정한다.

1. **읽기/쓰기 오류 의미 혼합** — `loadBaseline`의 read/network/invalid 상태를
   `WRITE_UPLOAD_*` 또는 transaction 실패용 `WRITE_HEAD_FAILED`로 반환한다.
   `loadBaseline`은 기존 `SafeAdminReadError` 의미를 재사용하고 rebuild head 스키마 위반만
   baseline 전용 안전 오류로 분리해야 한다.
2. **timeout reconciliation race** — transaction timeout은 원 transaction을 취소하지 않는다.
   reconciliation 순간 head가 base라고 해도 transaction이 나중에 성공할 수 있으므로
   “미반영 확정/orphan”으로 판정할 수 없다. exact operation path 관측만 성공 확정이며,
   base 관측은 `WRITE_COMMIT_OUTCOME_UNKNOWN`을 유지해야 한다.

두 번째 항목의 잘못된 base 판정은 **Codex 라운드 2 지시에도 포함됐던 오류**이며,
이번 최종 계약 교정에서 명시적으로 바로잡는다.

### 다음

- 정확한 최종 교정 지시는 `Automation/NEXT_CLAUDE_PROMPT.md`에 기록했다.
- Claude는 허용 문서 6개만 보완해 일반 fast-forward push하고 `READY_FOR_CODEX`로 전환한다.
- 구현·Rules/config/test 변경과 emulator 실행은 계속 금지한다.
- 자동화나 반복 작업을 만들지 않는다.

## 2026-08-11 — 스펙 037 계약 보완 라운드 3 (최종, CORRECTION_REQUIRED, 문서 전용)

> **★ 위의 Codex 라운드 3 검수 항목과 라운드 2·1·초판 항목은 삭제하지 않는다.**

- **기준**: HEAD=origin=`f694211`, ahead/behind 0/0. `fix_round: 3 / max 3`.
- **상태**: `CORRECTION_REQUIRED` / `CLAUDE_WORKING` → **`READY_FOR_CODEX`**.
- **변경 파일(6, 전부 허용 문서)**:
  - `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md` (라운드 3 정정본)
  - `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
  - ※ Codex가 작업 트리에 남긴 **라운드 3 검수 기록도 함께** 커밋한다.
- **실행하지 않음**: `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·
  `firebase.json`·`firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·
  `.firebaserc` 수정 **0** · 신규 의존성 0 · **실제 emulator 실행 0** ·
  실제 Firebase/network/live/운영 데이터 접근 0 · upload/write/delete/publish/deploy 0 ·
  force push·merge·rebase·`reset --hard`·broad delete 0 · 자동화 생성 0 · **구현 착수 0**.

### 교정 1 — `loadBaseline`과 `save`의 오류 표면을 분리 (§5.4 · §5.6 · §6.1)

**라운드 2의 결함**: `loadBaseline`의 읽기/network/invalid 상태를
**`WRITE_UPLOAD_FAILED` · `WRITE_UPLOAD_OUTCOME_UNKNOWN` · `WRITE_HEAD_FAILED`** 로 표현했다.
**읽기 작업에 "upload" 오류를 반환**하고 **persisted object invalid를 "head transaction 실패"와
합치는 것은 공개 API 의미가 틀리다.**

정정:

- **`save`만 `SafeAdminWriteError`와 기존 8개 `WRITE_*` 코드를 사용한다.**
- **`loadBaseline`은 스펙 036의 공개 `SafeAdminReadError` 의미를 재사용**하되,
  **rebuild head 자체의 스키마 위반을 구분할 baseline 전용 안전 오류 1개**
  (**`REBUILD_BASELINE_INVALID`**, `category: "VALIDATION"`, `retryable: false`)만 추가한다.
- **head 없음에서 legacy read가 실패하면 스펙 036의 기존 read 오류를 그대로 보존**한다.
- **head 있음에서 참조 객체가 없거나 JSON/catalog가 invalid하면 대응하는 기존 read 오류를 보존**한다
  (`ADMIN_STATE_NOT_FOUND` / `INVALID_JSON` / `INVALID_CATALOG` …).
- **head 문서 자체의 허용 키 / `revision` / `objectPath` / `schemaVersion` 위반만
  `REBUILD_BASELINE_INVALID`** 이다.
- **read timeout/network 실패는 상태를 변경하지 않으므로 upload outcome unknown으로 부르지 않는다**
  (`NETWORK_TIMEOUT` / `NETWORK_UNAVAILABLE`).
- **`WRITE_HEAD_FAILED`는 save의 head transaction이 명확히 실패한 경우로 다시 좁혔다.**
- **오류에는 raw message · email · UID · token · object bytes/path · `operationId`를 노출하지 않는다.**
- **`packages/firebase/src/admin-read/**`를 수정하지 않는다는 경계는 유지한다.**

**확인한 사실**: `SafeAdminReadError`는 **`@denn/firebase/admin-read` 배럴이 이미 export한다**
(`packages/firebase/src/admin-read/index.ts`). 자기 package subpath 순환이 문제가 되면 구현은
**내부 relative type import**를 써도 되지만 **공개 의미는 `@denn/firebase/admin-read`의
`SafeAdminReadError`와 동일**해야 한다. **`import type`은 컴파일 시 지워지므로 런타임 결합·
번들 영향은 어느 쪽이든 0**이다.

### 교정 2 — timeout 뒤 base 관측은 commit 미반영의 증거가 아니다 (§6.6)

**라운드 2의 결함**: transaction 결과 불명 뒤 head가 논리적 base에 머물러 있으면
**commit 미반영을 확정**하고 `WRITE_HEAD_FAILED`를 반환했다.
그러나 **timeout은 SDK transaction을 취소하지 않는다.** reconciliation read 순간에는 base여도
**원 transaction이 나중에 서버에서 성공할 수 있다.**

> **★ 이 잘못된 분기는 Codex의 라운드 2 지시에도 포함됐던 오류다. 최종 계약에서 바로잡았다.**

정정된 판정:

- **transaction이 명확히 reject되어 미반영이 확정된 경우는 결과 불명 reconciliation에 들어오지 않고**
  기존 **`WRITE_HEAD_FAILED`** 또는 **`WRITE_CONFLICT`** 분기로 끝난다.
- transaction 결과가 불명확해 reconciliation에 들어온 경우:
  - head가 `revision === expectedBase + 1`이고 `objectPath`가 **이번 `operationId`** 이면 **성공 확정**.
  - head가 `revision === expectedBase + 1`이고 **다른 `objectPath`** 이면 **다른 writer 승리 확정**.
    head가 더 이상 `expectedBase`가 아니므로 **이번 operation의 late commit은 CAS에서 이길 수 없다**
    → **`WRITE_CONFLICT`**, 업로드 객체는 **orphan**.
  - head가 **여전히 논리적 base에 있으면 late commit 가능성이 남아 있으므로 미판정** →
    **`WRITE_COMMIT_OUTCOME_UNKNOWN` 유지**. **orphan이라고 부르지 않는다.**
  - head `revision`이 **`expectedBase + 1`보다 크면** 이번 commit이 중간에 성공했는지 판정할 수 없으므로
    **`WRITE_COMMIT_OUTCOME_UNKNOWN` 유지**.
  - **reconciliation read 실패/timeout도 `WRITE_COMMIT_OUTCOME_UNKNOWN`.**
- **결과 불명 시 자동 재업로드 · transaction 재호출 · 삭제 · 성공/실패 추측은 계속 0이다.**
- **bounded reconciliation read 최대 1회 규칙은 유지한다.**
- **timeout 이후 도착한 SDK 결과가 UI·반환값을 뒤집지 않는 규칙과, 원 transaction이 서버에서
  늦게 성공할 수 있다는 사실을 동시에 명시**했다 — 두 규칙은 양립한다.
  앱은 **자기 반환값을 바꾸지 않을 뿐**이고 **서버의 진실은 다음 `loadBaseline`이 알려 준다.**
- **§5.4 · §6.5~§6.6 · fake F-3~F-5 · 위험 표 · handoff의 의미를 모두 일치**시켰다.
- **orphan 정의도 정정**했다(§6.7): orphan = head가 참조하지 않는 것이 **확정된** 불변 객체 —
  §6.5의 명확한 실패·거부 분기와 §6.6의 **"다른 writer 승리 확정"** 분기에서만 그렇게 부른다.
  **두 `*_OUTCOME_UNKNOWN` 상태는 orphan이 아니라 "미판정"이다.**

### 라운드 2에서 열어 둔 질문 — 해소됨

"`loadBaseline` 실패를 8코드 안에서 어떻게 부르는가"에 대해 라운드 2는
**`WRITE_HEAD_FAILED`의 의미를 넓히는 절충**을 썼다. **교정 1이 그 절충을 폐기**했다 —
**오류 표면 자체를 분리하는 것이 옳은 답**이고, **9번째 `WRITE_*` 코드는 만들지 않았다.**

### 신규 위험 2건

- **R-14** 읽기 실패를 "upload 오류"로 보고해 공개 API 의미가 틀어진다 → §5.4 표면 분리 + **F-6**.
- **R-15** timeout 뒤 base 관측을 "미반영 확정"으로 오판해, **서버에서 나중에 성공한 commit을 실패로
  보고하고 운영자가 같은 payload를 다시 보내게 만든다** → §6.6 **미판정 유지 · orphan 아님 ·
  재전송 금지** + **F-4·F-5**.

### 승인 경계 (§16)

- **이번 라운드는 계약 문서 보완만 승인한다.**
- **보완 push 후 상태는 `READY_FOR_CODEX`, `fix_round: 3`.**
- **Codex 최종 계약 검토 전 port/Rules/config/test 구현 0.**
- **실제 제품 UI · live Firebase · Rules 배포 · 운영 쓰기는 계속 금지.**
- **★ G-5의 합성 fake·로컬 emulator 허용과 결정 문서 §2의 "제품 구현 착수" 금지 사이 경계는
  이번 문서 교정에서 추측하지 않는다. Codex 최종 검토 후 Founder 확인 대상으로 남긴다.**

### 유지 (라운드 2에서 바뀌지 않은 것)

C5 구조(불변 객체 + 단일 Firestore head CAS) · Z-1(`op()` 무변경, 실제 UID UNCONFIRMED) ·
Z-2(별도 최상위 경로, UUID save당 1회, `resource == null` create-only) ·
Z-3 §4.3 **최초 create도 `expectedBase === 0` 강제** + §4.4 Rules 전 분기 · §5.5 callback 재실행 계약 ·
§5.7 safe-integer 범위 · Z-7(tombstone·자동 merge 없음) · Z-8(배포 0) ·
**저장 버튼·admin UI 연결 제외** · `firebase.emulator.json` + `demo-denn-emulator` 강제 ·
§7.5 (A) emulator E-1~E-8 / (B) fake F-1~F-10 분리와 (C)(D) 경계 ·
emulator 사전 확인 결과(Java 21.0.11 · firebase-tools 15.22.4 전역 · jar 캐시됨 · 포트 free ·
**Auth emulator binary UNCONFIRMED**) · **R-1**(Rules 배포가 운영자의 유일한 저장 경로를 닫는다) ·
**R-2**(`.firebaserc` default가 운영 프로젝트).

### 검증

- `git diff --check f694211..HEAD` **PASS**
- 변경 경로 = **허용 문서 6개뿐**
- 금지 범위(`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc`) diff **0**
- HEAD=origin, ahead/behind **0/0**
- working tree = **보호 대상만** — 전부 손대지 않음
- **다음 상태**: `READY_FOR_CODEX`, `fix_round: 3`. 구현하지 않았고 자동화도 만들지 않았다.

### 보완 라운드 3 커밋 확정 (같은 날, 상태 동기화)

- **보완 라운드 3 커밋**: **`9805c26`** (`f694211..9805c26`, 일반 fast-forward push)
- 확정 검증(그 커밋 기준): `git diff --check f694211..9805c26` **PASS** ·
  변경 파일 **허용 문서 6개뿐** · `apps/**`·`packages/**`·`tests/**`·`storage.rules`·
  `firestore.rules`·`firebase.json`·`firebase.emulator.json`·`package.json`·lockfile·
  `pnpm-workspace.yaml`·`.firebaserc` diff **0** · HEAD=origin, ahead/behind **0/0**.
- 라운드 2에서 hash 누락 드리프트를 겪었으므로 이번에는 **문서에 hash 자리를 명시적 placeholder로
  남겨 두고**(`candidate_commit: PENDING_ROUND_3`) 커밋 직후 이 동기화 커밋에서 채웠다 —
  `DENN_AUTOMATION_STATE.md`(`candidate_commit` + 라운드 3 섹션) · `NEXT_CLAUDE_PROMPT.md` 헤더 ·
  `CURRENT.md` 상태 줄.
- 문서 전용이며 제품 코드·Rules·config·test·lockfile 변경 0, emulator 실행 0,
  실제 Firebase/network/live/운영 데이터 접근 0, 자동화 생성 0, **구현 착수 0**이다.
- 보호 대상 6개는 **전부 손대지 않았다.**
- **다음**: **Codex 최종 계약 검토**. 결과와 다음 지시를 `Automation/NEXT_CLAUDE_PROMPT.md`에 남긴다.
  그 전까지 Claude는 새 작업을 시작하지 않는다. `fix_round: 3 / max 3`에 도달했으므로,
  추가 교정이 필요하면 **라운드 한도를 넘기지 말고 Founder 확인을 먼저 받아야 한다.**

## 2026-08-11 — Codex 스펙 037 최종 계약 검토 · CONTRACT_PASSED

- **검수 대상**: 최종 보완 계약 `9805c26` + 상태 동기화 `2f0ca7d`.
- HEAD=origin=`2f0ca7d`, ahead/behind 0/0.
- `git diff --check f694211..9805c26` **PASS**.
- `git diff --check 9805c26..2f0ca7d` **PASS**.
- 보완 커밋은 허용 문서 6개, 동기화 커밋은 상태 문서 4개뿐이다.
- 금지된 제품/Rules/config/test/lockfile diff 0, emulator/Firebase/network/live/배포 실행 0.

### 최종 판정

**스펙 037 C5 계약은 PASS다.**

- `save` 8개 `WRITE_*`와 `loadBaseline`의 기존 read 오류 +
  `REBUILD_BASELINE_INVALID` 표면이 분리돼 의미가 정확하다.
- timeout은 원 transaction을 취소하지 않는다는 전제와 bounded reconciliation 5분기가 일치한다.
- base 관측은 `WRITE_COMMIT_OUTCOME_UNKNOWN`, base+1의 다른 objectPath는 `WRITE_CONFLICT`,
  exact operation path만 성공 확정으로 처리한다.
- fake와 emulator가 증명하는 범위가 분리돼 서로의 결론을 빌려 쓰지 않는다.
- 최초 create의 `expectedBase === 0`, safe integer, callback 부작용 금지,
  Rules get/list/create/update/delete 계약과 보호 경계가 유지된다.

### 다음

계약 §16이 port/Rules/config/test 구현 착수 여부를 Founder 확인 대상으로 남겼으므로
상태를 **`FOUNDER_DECISION_REQUIRED`**로 전환한다. Codex가 권한을 추론하지 않는다.

- 정확한 로컬 비-UI 구현 승인 범위와 복사 가능한 Founder 승인 문구를
  `Automation/NEXT_CLAUDE_PROMPT.md`에 기록했다.
- Founder 승인 전 Claude 작업과 저장소 쓰기·stage·commit·push·emulator 실행은 0이다.
- 자동화나 반복 작업을 만들지 않는다.

## 2026-08-11 — Founder 스펙 037 구현 착수 승인 기록 (문서 전용, 구현 미착수)

> **★ 위의 Codex `CONTRACT_PASSED` 항목과 라운드 3·2·1·초판 항목은 삭제하지 않는다.**

- **기준**: HEAD=origin=`2f0ca7d`, ahead/behind 0/0.
- **승인 대상 계약**: **`9805c26`**(보완 라운드 3) — Codex 판정 **`CONTRACT_PASSED`**.
- **정본 문서(신규)**:
  `docs/codex-claude-handoff/decisions/2026-08-11-spec-037-implementation-authorization.md`
  — **승인 원문을 그대로 수록**했다.
- **상태**: `FOUNDER_DECISION_REQUIRED` → **`READY_FOR_CODEX`**.
  **다음 주체 = Codex**(NEXT §3 **2단계**: 승인 기록과 최종 구현 허용 파일 확인).
- **변경 파일(5, 전부 문서)**:
  - `docs/codex-claude-handoff/decisions/2026-08-11-spec-037-implementation-authorization.md` (신규)
  - `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md`
  - `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
  - ※ Codex가 작업 트리에 남긴 **`CONTRACT_PASSED` 검수 기록도 함께** 커밋한다.
- **실행하지 않음**: 제품 코드·test·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` 수정 **0** ·
  신규 의존성 0 · **실제 emulator 실행 0** · 실제 Firebase/network/live/운영 데이터 접근 0 ·
  upload/write/delete/publish/deploy 0 · force push·merge·rebase·`reset --hard`·broad delete 0 ·
  자동화 생성 0.
- **★ 구현은 아직 시작하지 않았다.** 승인은 났지만 **NEXT §3 순서상 2단계(Codex 확인)가 먼저**다.

### 승인된 것

**스펙 037 최종 C5 계약 `9805c26` 승인** + **계약에 명시된 로컬 비-UI 구현·검증 착수 승인**.

- `packages/firebase/src/admin-write/**` — **write port + 합성 fake**
- `packages/firebase/package.json` — **`./admin-write` 서브패스 export**
- **배포하지 않는** `storage.rules` / `firestore.rules` **목표 파일**
  — 실제 UID는 **UNCONFIRMED placeholder만**, **파일 편집만 허용하며 배포 금지**
- **`firebase.emulator.json`** 신규 local-only config
- **emulator 전용 Storage/Firestore Rules 사본**(합성 UID만)
- `vitest.config.ts` · `vitest.emulator.config.ts` · `package.json`의 **opt-in emulator test 명령**
- `*.emulator.test.ts` 및 관련 **unit/fake 테스트**
- **기존에 캐시된 도구만** 이용한 **`demo-denn-emulator` 로컬 emulator 검증**
- 계약 / STATE / NEXT / CURRENT / live / handoff **종료 문서**

### 승인되지 않은 것

**`apps/**`와 모든 UI 연결**(저장 버튼 · admin 화면 연결 · 실제 고객/운영 경로) ·
**실제 운영자 UID 추측·기록** · **실제 Firebase project · 운영 bucket/data · live network** ·
**Rules/Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행** ·
**legacy `admin/state.json` 공유 쓰기** · **orphan 삭제/자동 정리 · client delete 권한** ·
**tombstone/자동 merge/L-4 해결** · **신규 의존성 · 도구·binary 다운로드/설치** ·
**실제 프로젝트 id 또는 `.firebaserc` 사용** · **자동화·반복 작업 생성**.

### ★ 구현 시 유일한 허용 파일 목록 (승인 범위 = 계약 §10, 일치 확인함)

```
packages/firebase/src/admin-write/**          write port + 합성 fake (신규)
packages/firebase/package.json                ./admin-write export 추가
storage.rules                                 계약 §4.2 목표 상태 · placeholder UID · 배포 금지
firestore.rules                               계약 §4.4 목표 상태 · placeholder UID · 배포 금지
firebase.emulator.json                        신규 · local-only
<emulator 전용 storage/firestore rules 사본>   합성 UID만
vitest.config.ts                              *.emulator.test.ts 제외 추가
vitest.emulator.config.ts                     신규
package.json                                  test:emulator 스크립트 추가
**/*.emulator.test.ts, 관련 unit/fake 테스트
스펙 037 handoff / CURRENT / live / STATE / NEXT
```

**여전히 금지**: **`firebase.json`** · **루트 배럴 `packages/firebase/src/index.ts`** ·
**`packages/firebase/src/admin-read/**`** · **`apps/**`** · `packages/render/**` ·
`packages/shared/**` · `.firebaserc` · 실제 `.env` · legacy HTML.

**★ `pnpm-lock.yaml` diff는 0이어야 한다** — 신규 의존성이 승인되지 않았으므로
`pnpm install --frozen-lockfile`이 통과해야 하고, 변경이 필요해지면 **STOP**이다.

### ★ emulator 실행 경계 (승인 문구의 "기존에 캐시된 도구만")

**Java `openjdk 21.0.11 LTS`** · **firebase-tools 전역 `15.22.4`**(저장소 의존성 아님) ·
**`cloud-firestore-emulator-v1.21.0.jar`** · **`cloud-storage-rules-runtime-v1.1.3.jar`** ·
**`ui-v1.15.0`** — 2026-08-11 읽기 전용 확인 기준 전부 캐시돼 있다.

- 실행은 **`--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를 모두** 포함한다.
- **host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트는 시작 전에 실패한다.**
- **`.firebaserc`는 쓰지도 수정하지도 않는다.**
- **다운로드·설치·신규 의존성·포트 강제 해제·타 프로세스 종료가 필요하면 실행하지 말고 STOP.**
- ⚠️ **Auth emulator binary 가용성은 UNCONFIRMED** — **첫 실행에서 다운로드를 시도하면 즉시 STOP.**

### 승인 후 순서 (NEXT §3)

| 단계 | 주체 | 내용 | 상태 |
| --- | --- | --- | --- |
| **1** | Claude | 승인 원문 기록 · 문서 전용 fast-forward commit/push | **이 항목에서 완료** |
| **2** | **Codex** | **승인 기록과 최종 구현 허용 파일 확인** | **다음 차례** |
| 3 | Claude | 계약의 **비-UI 구현**을 별도 commit/push | 대기 |
| 4 | Codex | frozen install · format/lint/typecheck · 전체 unit · 독립 build · 전체 Chromium E2E · diff check · forbidden diff · **고객 dist hash** · ports/temp | 대기 |
| 5 | — | **기본 게이트와 분리한 local emulator 게이트 명시 실행**(문제 시 STOP) | 대기 |

### 이 승인으로도 열리지 않는 것

- **운영 쓰기 개방** — **실제 UID + orphan 보존/비용/정리 정책 + emulator PASS**가 모두 확인된 뒤
  **별도 cutover 스펙 + 별도 Founder 승인**(계약 §9 · G-4 · G-5).
- **Rules 배포** — **실제 UID 정본** 전 차단(G-1).
  ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로 **배포 순서 자체가 STOP 대상**이다.
- **C6**(Cloud Function/backend) 보류(G-3) · **L-4 삭제 부활 해결** 별도 후속 스펙(계약 §8).

### NOT TESTED / UNCONFIRMED (승인으로 바뀌지 않는다)

실제 Firebase 프로젝트 동작 전부(실제 Rules 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절에서의 거동 ·
실기기·다중 기기 동시 편집 · **Auth emulator binary 가용성** · 운영 규모 payload ·
orphan 누적의 실제 비용 · `pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).

### 보호 대상 (전부 손대지 않음)

`docs/rebuild/design/taste-v2/**` · `docs/rebuild/design/README.md` ·
`docs/rebuild/specs/038-page-design-prototype.md` ·
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
`docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`.

### 검증

- `git diff --check 2f0ca7d..HEAD` **PASS**
- 변경 경로 = **허용 문서 5개뿐**(결정 정본 신규 + STATE/NEXT/CURRENT/live)
- 제품 코드·test·Rules·config·lockfile·`.firebaserc` diff **0**
- HEAD=origin, ahead/behind **0/0**
- working tree = **보호 대상만**
- **다음 상태**: `READY_FOR_CODEX`. **구현은 2단계 Codex 확인 후에 시작한다.**
  자동화나 반복 작업은 만들지 않았다.

### 승인 기록 커밋 확정 (같은 날, 상태 동기화)

- **Founder 승인 기록 커밋**: **`4f2ab0b`** (`2f0ca7d..4f2ab0b`, 일반 fast-forward push)
- 확정 검증(그 커밋 기준): `git diff --check 2f0ca7d..4f2ab0b` **PASS** ·
  변경 파일 **허용 문서 5개뿐**(결정 정본 신규 + STATE/NEXT/CURRENT/live) ·
  제품 코드·test·`storage.rules`·`firestore.rules`·`firebase.json`·`firebase.emulator.json`·
  `package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` diff **0** ·
  HEAD=origin, ahead/behind **0/0**.
- 네 문서(`DENN_AUTOMATION_STATE.md` 승인 섹션 · `NEXT_CLAUDE_PROMPT.md` 헤더 ·
  `CURRENT.md` 상태 줄 · 이 로그)에 **`4f2ab0b`** 을 채웠다.
- 문서 전용이며 **실제 emulator 실행 0**, 실제 Firebase/network/live/운영 데이터 접근 0,
  자동화 생성 0, **구현 착수 0**이다.
- 보호 대상 6개는 **전부 손대지 않았다.**
- **다음**: **NEXT §3 2단계 — Codex가 승인 기록과 최종 구현 허용 파일을 확인**한다.
  그 확인 전에는 **3단계 비-UI 구현을 시작하지 않는다.**

## 2026-08-11 — 스펙 037 승인 유효성 확정 + 구현 허용 범위 검토 (읽기 전용, 문서 전용)

- **기준**: HEAD=origin=`7aee0c2`, ahead/behind 0/0.
- **Founder가 `4f2ab0b`의 승인이 Claude Code에 직접 전달한 실제 Founder 승인임을 확인하고
  유효한 승인으로 확정했다.** 이어서 **다음 구현 허용 범위 검토**를 지시했다.
- **검토는 읽기 전용**으로 수행했다 — 저장소 파일 변경 0, **emulator 실행 0**,
  실제 Firebase/network/live/운영 데이터 접근 0.
- **상태**: `READY_FOR_CODEX` 유지. **다음 주체 = Codex**(NEXT §3 2단계).
- **변경 파일(5, 전부 문서)**: 결정 정본(§3.1~§3.3 추가) · STATE · NEXT · CURRENT · 이 로그.
- **★ 구현은 여전히 시작하지 않았다.**

### 검토 결과 — 막힘 없이 열리는 항목 (실측)

| 항목 | 확인 결과 |
| --- | --- |
| `packages/firebase/src/admin-write/**` | **디렉터리 없음**(현재 `admin-read`·`public-catalog`·`public-images`·`index.ts`만), **저장소 전체 `admin-write` 참조 0건** → 충돌 없음 |
| 자동 typecheck | `packages/firebase/tsconfig.json`의 `include: ["src"]` → `admin-write/**`와 `*.emulator.test.ts` **자동 포함** |
| 자동 format/lint | `biome.json`의 `files.includes`에 `packages/**/src/**/*.{ts,tsx}` → **소스·emulator 테스트 자동 대상** |
| `./admin-write` export | 기존 `./admin-read`와 **동일 패턴**(`types` + `default`) — 새 규약 불필요 |
| `storage.rules`·`firestore.rules` | **추적 중, gitignore 무영향** → 편집 가능(배포는 계속 금지) |
| emulator 전용 `*.rules` 사본 | **gitignore에 걸리지 않는다**(`git check-ignore` 확인) |
| `vitest.config.ts` exclude | **반드시 필요** — 기본 `include`의 `packages/**/src/**/*.test.{ts,tsx}`가 **`*.emulator.test.ts`도 매칭**한다(`*.live.test.ts`와 같은 이유) |
| emulator SDK API | **`connectAuthEmulator`·`connectFirestoreEmulator`·`connectStorageEmulator` 전부 설치된 SDK에 존재** → **신규 의존성 0** |
| 도구 | Java `21.0.11 LTS` · firebase-tools 전역 `15.22.4` · Firestore/Storage-rules-runtime/UI jar **캐시됨** · 필요한 포트 **전부 free** |

### ★★ 공백 2건 — Founder가 최소 범위 확장을 승인함

**공백 1 — `firebase.emulator.json`이 조용히 gitignore된다.**

- `.gitignore:2`가 **`*.json`** 이고 예외는 **`package.json`·`tsconfig*.json`·`biome.json`뿐**이다.
- `git check-ignore -v firebase.emulator.json` → **`.gitignore:2:*.json`**.
- `firebase.json`·`.firebaserc`가 멀쩡한 것은 **이미 추적 중이라서**일 뿐이다
  (gitignore는 untracked 파일에만 적용된다).
- 그대로 두면 **config가 커밋되지 않아 Codex와 다른 환경에서 emulator 게이트를 재현할 수 없다** —
  검증 자체가 무의미해진다.
- **결정 A-12: `.gitignore`에 `!firebase.emulator.json` 한 줄만 추가한다.**
  `git add -f`도 동작하지만 파일이 **계속 ignored 상태로 남아** `git clean -X`에 지워지고
  gitignore를 존중하는 도구가 건너뛴다. 무엇보다 **`.gitignore:7` 주석 자체가
  "리빌드 설정 JSON은 정상 추적 … git add -f 불필요"** 라고 밝히고 있어 예외 한 줄이 그 의도와 일치한다.

**공백 2 — `vitest.emulator.config.ts`가 format/lint 게이트를 조용히 건너뛴다.**

- `scripts/check.mjs:22-30`의 **`BIOME_TARGETS`** 와 루트 `package.json`의 `format:check`/`lint`가
  config 파일을 **명시적으로 열거**한다(`vitest.config.ts`·`vitest.live.config.ts`·
  `playwright.config.ts`·`playwright.live.config.ts`). 새 root config는 그 목록에 없다.
- `biome.json`의 `includes`에 `"*.ts"`가 있지만 **스크립트가 경로를 명시로 넘기므로 무효**다.
- **실패가 아니라 스킵**이라 게이트는 통과하는데 검사만 빠진다 — **실패보다 나쁜 형태**다.
- **결정 A-13: `scripts/check.mjs`의 `BIOME_TARGETS`에 `vitest.emulator.config.ts` 한 개만 추가**하고,
  루트 `package.json`의 `format:check`·`lint`에도 같은 파일명을 추가한다(후자는 이미 A-8 범위).

### 범위 확장의 경계

- **두 확장 모두 기계적·비제품 변경이며 각각 한 줄**이다. 새 동작을 만들지 않는다.
- **금지 항목은 하나도 열리지 않는다** — `apps/**`와 모든 UI 연결 · 실제 운영자 UID 추측 ·
  실제 Firebase project/운영 bucket/live network · Rules·Hosting 배포 · 운영 쓰기 ·
  `published/state.json` 발행 · legacy 공유 쓰기 · orphan 삭제·자동 정리 ·
  **신규 의존성·다운로드·설치** 전부 **그대로 금지**.
- **`firebase.json`·루트 배럴 `packages/firebase/src/index.ts`·`packages/firebase/src/admin-read/**`·
  `.firebaserc`도 그대로 금지.**
- **`pnpm-lock.yaml` diff 0** 요구 유지(`--frozen-lockfile` 통과 필수, 변경 필요 시 **STOP**).

### 다음

**NEXT §3 2단계 — Codex가 승인 기록·검토 결과·확장된 허용 파일(A-12·A-13 포함)을 확인**한다.
그 확인 뒤에 **3단계 비-UI 구현**을 시작한다. **구현 착수 0**, 자동화·반복 작업 생성 0.

### 검증

- `git diff --check 7aee0c2..HEAD` **PASS**
- 변경 경로 = **허용 문서 5개뿐**(결정 정본 + STATE/NEXT/CURRENT/live)
- 제품 코드·test·`storage.rules`·`firestore.rules`·`firebase.json`·`firebase.emulator.json`·
  `package.json`·lockfile·`pnpm-workspace.yaml`·`.gitignore`·`scripts/check.mjs`·`.firebaserc`
  diff **0** — **확장이 승인됐을 뿐 아직 아무것도 편집하지 않았다**
- HEAD=origin, ahead/behind **0/0** · working tree = **보호 대상만**

## 2026-08-11 — 스펙 037 C5 비-UI 구현 완료 (구현 커밋 `d83aee9`)

- **기준**: HEAD=origin=`f8590e4` → **구현 커밋 `d83aee9`** (fast-forward push, ahead/behind 0/0).
- **권한**: Founder 승인 `4f2ab0b` + 허용 범위 검토 `f8590e4`(A-12·A-13 확장 포함).
  Founder가 승인 유효성을 재확인하고 구현 착수를 지시했다.
- **상태**: `READY_FOR_CODEX` — **Codex 전체 게이트 검증(NEXT §3 4단계)** 차례.

### 구현한 것

- **`packages/firebase/src/admin-write/**`** (신규 9파일) — `constants` · `types`(공개 타입 전부) ·
  `errors`(두 오류 표면) · `head`(스키마·범위 검증) · `facade`(주입 경계) ·
  `write-port`(port 본체) · `sdk-facade`(동적 import 실 어댑터) · `index`(배럴) ·
  `emulator-env`(emulator 하네스, 배럴 미노출).
- **`packages/firebase/package.json`** — `./admin-write` 서브패스 export(기존 `./admin-read`와 동일 패턴).
  **루트 배럴 무변경**, **`admin-read/**` 무변경**.
- **`storage.rules`·`firestore.rules`** — 계약 목표 상태. **UNCONFIRMED placeholder UID**.
  **`op()` 무변경**(레거시 발행·자산 업로드가 함께 잠기지 않는다) · `admin/` write 닫힘 ·
  `rebuild-admin-state/objects/{id}` **create-only**(`resource == null`, update/delete 거부) ·
  head는 **`get`은 head 문서만 / `list` 거부 / create `revision==1` / update 정확히 `+1` +
  `objectPath` 교체 / delete 거부**. `spaces`·catch-all 무변경.
- **`firebase.emulator.json`** + **`storage.emulator.rules`·`firestore.emulator.rules`**
  — emulator 전용. **`firebase.json` 무수정**.
- **`vitest.config.ts`**(`*.emulator.test.ts` 제외) · **`vitest.emulator.config.ts`** ·
  **`package.json`**(`test:emulator` + format/lint 대상).
- **A-12 `.gitignore`** 한 줄(`!firebase.emulator.json`) · **A-13 `scripts/check.mjs`** 파일명 1개.

### 설계 요지

`save`는 **operationId를 호출당 1회** 발급하고(재시도·callback 재실행에서 재발급 0),
업로드한 뒤 **`runTransaction`을 정확히 1회** 호출한다. callback은 **순수**해서 SDK가 여러 번
돌려도 안전하다(UUID 발급·업로드·로그·로컬 revision 변경 전부 callback 밖).
**head 부재 = 논리 revision 0**이며 **`expectedBase === 0`일 때만** revision 1을 만든다.
transaction 결과가 불명확할 때만 **read-only bounded reconciliation 1회**를 수행하고,
**base 관측은 "아직 아님"이라 미판정(`WRITE_COMMIT_OUTCOME_UNKNOWN`)** 으로 남긴다 —
**timeout은 SDK transaction을 취소하지 않기 때문**이다.
`loadBaseline`은 head 없으면 **스펙 036 read port를 그대로 재사용**해 legacy를 revision 0으로 읽고,
head가 있으면 **그 객체만** 읽으며 **legacy로 조용히 fallback하지 않는다**.

### 게이트 실측

| 게이트 | 결과 |
| --- | --- |
| `pnpm install --frozen-lockfile` | **PASS**, **lockfile diff 0**(신규 의존성 0) |
| `pnpm check`(format·lint·typecheck·unit·build) | **PASS** |
| unit | **1305/1305** (기준 1271 → **+34**) |
| Chromium E2E | **134/134** (기준과 동일, 무회귀) |
| **고객 번들** | **byte-identical** — `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** · `fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685` |
| 고객 번들 유출 문자열 | `admin-write`·`rebuildAdminState`·`rebuild-admin-state`·`firebase/firestore` **0건** |
| `git diff --check` | **PASS** |
| ports 4183/4184 · 8080/9099/9199 | 전후 **free** |

### ★ emulator 게이트 — 실제 Rules로 10/10 PASS

`firebase emulators:exec --config firebase.emulator.json --project demo-denn-emulator`
로 **기본 게이트와 분리해 명시 실행**했다. **다운로드·설치·신규 의존성·포트 강제 해제·
타 프로세스 종료 0**. emulator가 `Detected demo project ID "demo-denn-emulator"` 를 확인했고
종료 후 잔여 프로세스·포트 없음. 디버그 로그 산출물도 남기지 않았다.

검증된 항목(E-1~E-8): 승인 UID만 객체 생성·head get·head 쓰기 / **다른 UID·익명·미인증 거부**
(Storage·Firestore 양쪽) / **동일 경로 재업로드 거부·delete 거부·비-JSON contentType 거부** /
**head `get` 허용, 다른 identity 거부, `list` 거부** / **키 4개·잘못된 objectPath·최초 revision≠1 거부**,
**`+2`·동일 revision·`objectPath` 미교체 거부**, **정상 `+1`+경로 교체는 통과**, **head delete 거부** /
**두 writer 동시 commit → 정확히 하나만 성공하고 head는 정확히 +1**, **진 쪽 객체는 orphan으로
남고 head는 불변**.

> ⚠️ 첫 실행에서 1건이 실패했는데, 원인은 **rule이 정상 동작한 것**이었다 —
> `resetEmulatorState`가 Firestore만 비우고 Storage는 남겨서 E-3의 "첫" 업로드가 실은 기존 객체
> 덮어쓰기였고 create-only가 거부했다. **테스트가 매 시나리오마다 새 경로를 쓰도록 고쳤다**
> (실제 save가 매번 새 UUID를 쓰는 것과 같은 형태). 제품 코드는 바뀌지 않았다.

### fake 게이트 — 34개 (§7.5 B)

호출 순서 고정 · **operationId 1회 발급**(callback 4회 재실행에도 upload 1회·UUID 1회·
`runTransaction` 1회) · **callback 재실행 중 head가 움직여도 `expectedBase` 자동 재채택 0** ·
upload 실패 시 **transaction 호출 0** · **미인증에서 네트워크 호출 0** · **단일 in-flight**
(두 번째 호출이 같은 promise 반환) · **reconciliation 5분기**(성공 확정 / 다른 writer 승리 확정
`WRITE_CONFLICT` / base 관측 미판정 / base+1 초과 미판정 / read 실패 미판정, **read 최대 1회·
재업로드 0·재transaction 0**) · **명확한 reject는 reconciliation 0회** ·
**§5.7 범위 검증**(무효 base는 Storage 호출 0회) · **§4.3 최초 create 분기**(head 부재 +
`expectedBase≠0` → `WRITE_CONFLICT`, head 쓰기 0) · **baseline 5분기** ·
**비노출**(raw message·operationId·objectPath가 오류 직렬화에 0건, 키는 정확히 4개) ·
**Rules 사본이 UID 라인만 다름**을 고정하고 **배포본에 placeholder가 남아 있음**도 고정.

### 정직하게 남기는 경계

- **합성 fake는 서버 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
  callback 재실행과 commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
  emulator 증명이라고 주장하지 않는다.
- **emulator는 실제 Firebase가 아니다.**

### NOT TESTED / UNCONFIRMED

실제 Firebase 프로젝트 동작 전부(실제 Rules 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절 · 실기기·다중 기기 동시 편집 ·
운영 규모 payload · orphan 누적 실제 비용 · **L-4 삭제 부활**(범위 밖) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월).

### 계속 닫혀 있는 것

**`apps/**`와 모든 UI 연결 · 저장 버튼 · 실제 UID · 실제 Firebase/network/live/운영 데이터 ·
Rules·Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행 · legacy 공유 쓰기 ·
orphan 삭제·자동 정리 · tombstone·자동 merge · 신규 의존성·다운로드·설치 ·
`firebase.json` · 루트 배럴 · `admin-read/**` · `.firebaserc`.**
⚠️ **Rules는 편집만 했고 배포하지 않았다.** 실제 UID 정본 전 배포 금지이며,
배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로 **배포 순서 자체가 STOP 대상**이다.

### 보호 대상 (전부 손대지 않음)

`docs/rebuild/design/taste-v2/**` · `docs/rebuild/design/README.md` ·
`docs/rebuild/specs/038-page-design-prototype.md` ·
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
`docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`.

### 다음

**NEXT §3 4단계 — Codex가 frozen install · format/lint/typecheck · 전체 unit · 독립 build ·
전체 Chromium E2E · diff check · forbidden diff · 고객 dist hash · ports/temp를 독립 검증**한다.
이어서 **5단계 local emulator 게이트를 기본 게이트와 분리해 명시 실행**한다.

## 2026-08-11 — 스펙 037 구현 보완 라운드 1 (CORRECTION_REQUIRED, 코드 커밋 `ead06ab`)

- **기준**: 구현 `d83aee9` + 문서 `d4d42d6` → **보완 커밋 `ead06ab`**(fast-forward, HEAD=origin 0/0).
- **권한 재확인**: Founder가 `4f2ab0b` 구현 착수 승인과 `f8590e4`의 **A-12·A-13 확장**이
  Claude Code에 직접 전달한 **실제 승인**임을 확인했다.
- **변경 파일(4, 전부 허용 목록)**: `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` ·
  **`sdk-facade.test.ts`(신규)**.
  **무변경**: Rules 4개 · `firebase.emulator.json` · `apps/**` · `admin-read/**` ·
  `package.json` 2개 · lockfile · `firebase.json` · `.firebaserc` · `vitest*.config.ts` ·
  `scripts/check.mjs` · `.gitignore` · 보호 대상 6개.

### 교정 1 — payload를 쓰기 전에 정본으로 런타임 검증

`save()`가 **`expectedBase` 검증 뒤, UUID 생성·업로드 전에** `request.catalog`를
**기존 `readLegacyCatalog` 정본**으로 검증한다. invalid이면 **`WRITE_INVALID_INPUT`** 이고
**UUID·Storage·Firestore 호출은 0**이다. 업로드에는 **검증된 `CatalogDocumentV1`을 직렬화**한다.

> **왜 중요한가**: `CatalogDocumentV1`은 **컴파일 타임 주장일 뿐**이고, 이 스펙의 객체는 **불변**이라
> 한 번 만들면 지울 수 없다. 읽을 수 없는 payload를 올리면 **그게 head에 영구히 앉는다.**
> 또 caller 객체가 아니라 **검증 결과를 직렬화**하므로 hostile getter가 나중에 바이트를 바꿔치기할 수 없다.

고정한 테스트: **invalid `schemaVersion`**(2) → `WRITE_INVALID_INPUT` + **호출 0** ·
**circular 입력** → `WRITE_INVALID_INPUT` + **호출 0** ·
**업로드된 JSON이 검증된 V1 wrapper**이고 같은 정본으로 **round-trip**된다.

### 교정 2 — Firebase app 소유권 명시, 두 번째 app 금지

`createFirebaseAdminWriteFacade`가 **스펙 036이 이미 소유한 기본 app을 재사용**한다.

- **기본 app 중복 `initializeApp` 0.**
- **별도 named app을 만들지 않는다** — `appName` 옵션을 **제거**했다.
  named app은 **자기 auth 상태를 따로 들고 있어서**, 운영자가 로그인한 적 없는 세션으로
  쓰기가 나갈 수 있다. **그 분리 자체가 버그**이지 우회책이 아니다.
- 기존 app의 config가 넘겨받은 config와 **키 단위로 하나라도 다르면 fail-closed**(throw).
  어떤 프로젝트가 초기화돼 있든 거기에 써 넣지 않는다.
- **`packages/firebase/src/admin-read/**` 무수정.**

### 교정 3 — emulator 옵션은 `demo-` 프로젝트에서만

`options.emulators`가 있으면 **`config.projectId`의 `demo-` 접두를 SDK 초기화 전에** 검사한다.
non-demo면 **`initializeApp`·Auth·Firestore·Storage 호출 0**으로 거부한다.
검사가 **dynamic import보다도 앞**이라 SDK 자체가 로드되지 않는다.

> emulator 배선을 실제 프로젝트 id에 물리는 것이 **로컬 실행이 운영에 닿을 수 있는 유일한 실수**다.

### 신규 `sdk-facade.test.ts` (Firebase 모듈 mock)

기존 app **재사용**(`initializeApp` 0회) · **named app 0개** ·
**키별 config 불일치 fail-closed**(`projectId`·`storageBucket` 각각) ·
Auth/Firestore/Storage를 **그 하나의 app에서** 취득(각 1회) ·
**non-demo + emulator → initializeApp·getAuth·getFirestore·getStorage·connect* 전부 0회** ·
demo면 **connect 3종 모두 호출** · emulator 미지정이면 **connect 0** ·
**non-demo라도 emulator 배선이 없으면 정상 초기화**.

### 게이트 실측

| 게이트 | 결과 |
| --- | --- |
| `pnpm check` | **PASS**(format · lint · typecheck · unit · build) |
| unit | **1318/1318** (직전 1305 → **+13**) |
| Chromium E2E | **134/134** (무회귀) |
| **고객 번들** | **byte-identical** — `index-W_cZpbdf.js` · **287,741 bytes** · `fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685` |
| **emulator 게이트** | **실제 Rules로 10/10 PASS**, 기본 게이트와 분리 실행, **다운로드·설치·포트 강제 해제 0** |
| `git diff --check` · forbidden diff | **PASS** · **0** |
| ports · 디버그 로그 산출물 | 전후 free · 0 |

### 계속 닫혀 있는 것

`apps/**`와 모든 UI 연결 · 저장 버튼 · **실제 UID** · 실제 Firebase/network/live/운영 데이터 ·
**Rules·Hosting 배포** · 운영 쓰기 · 발행 · legacy 공유 쓰기 · orphan 삭제·자동 정리 ·
tombstone·자동 merge · 신규 의존성·다운로드·설치 · `firebase.json`·루트 배럴·`admin-read/**`·`.firebaserc`.
⚠️ **Rules는 이번 라운드에서 아예 손대지 않았고** 여전히 **UNCONFIRMED placeholder** 상태라 배포 불가다.

### 경계 · NOT TESTED (변동 없음)

**합성 fake는 서버 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
실제 Firebase 프로젝트 동작 전부 · **실제 운영자 UID·계정 실재** · 실제 네트워크 지연·단절 ·
실기기·다중 기기 · 운영 규모 payload · orphan 누적 실제 비용 · **L-4**(범위 밖) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월).

### 다음

**Codex 보완 라운드 1 재검증** — 독립 게이트 + emulator 게이트 명시 실행.

## 2026-08-11 — ★★ 스펙 037 종료 — DONE / CODEX_PASSED

- **기준**: HEAD=origin=`91a7813`, ahead/behind 0/0.
- **제품 검증 커밋**: **`ead06ab`**(구현 `d83aee9` + 보완 라운드 1) · 기록 `91a7813` ·
  **종료 문서는 이 커밋**(문서 전용).
- **상태**: `READY_FOR_CODEX` → **`WAITING_FOR_NEXT_MANUAL_TASK`**.
  **다음 스펙은 자동으로 시작하지 않는다.**
- **변경 파일(6, 전부 허용 문서)**: 스펙 037 계약(상태 → DONE + §17 종료 절) ·
  spec037 handoff · STATE · NEXT · CURRENT · 이 로그.
- **제품 코드·Rules·config·test·lockfile 추가 수정 0.** 실제 Firebase/network/live/배포 0.
  자동화·반복 작업 생성 0.

### Codex 독립 재검증 결과 — `CODEX_PASSED`

| 항목 | 결과 |
| --- | --- |
| HEAD=origin | `91a7813`, ahead/behind **0/0** |
| 변경 범위 | **허용 4파일뿐** — `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` · 신규 `sdk-facade.test.ts` |
| `pnpm install --offline --frozen-lockfile` | **PASS**, **lockfile diff 0** |
| format / lint / typecheck / unit / build | **PASS** |
| unit | **1318/1318** |
| Chromium E2E | **134/134** |
| **고객 번들 SHA-256** | **`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`** |
| **local `demo-denn-emulator` Rules 게이트** | **10/10 PASS** |
| ports 4183/4184/8080/9099/9199 | 잔류 **0** |
| `git diff --check` | **PASS** |
| 추가 결함 | **없음** |

### 스펙 037이 실제로 닫은 것 — 로컬 비-UI 구현·검증까지

`@denn/firebase/admin-write` port — **불변 객체 생성 + 단일 Firestore head CAS + 결과 불명 시
bounded reconciliation**. **두 오류 표면**(`save`는 8개 `WRITE_*`, `loadBaseline`은 스펙 036
read 오류 + `REBUILD_BASELINE_INVALID`). `storage.rules`/`firestore.rules`의 **목표 상태**
(placeholder UID). emulator 전용 config와 Rules 사본. opt-in fake/emulator 검증.

**설계 요지**: 객체는 **매번 새 불투명 경로에 한 번만** 생성되고 **가변 지점은 head 하나**뿐이라,
중간에 실패해도 **참조되지 않는 객체와 그대로인 head**만 남고 **남의 바이트를 덮지 않는다.**
이는 **cross-service 원자성이 아니라 "불변 객체 우선 + 단일 가변 정본"** 이며, 문서와 코드가
그렇게 주장하지 않는다는 점을 계약이 명시한다.

### ★ 여전히 NOT TESTED이자 금지

- **실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network** — 접근 **0**, **NOT TESTED**.
- **실제 운영자 UID** — **UNCONFIRMED**. 배포 대상 Rules에 **UNCONFIRMED placeholder**가 남아 있어
  **현 상태로는 배포할 수 없다**.
- **Rules · Hosting 배포** — **금지**. ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
  **배포 순서 자체가 STOP 대상**이다. cutover는 **별도 스펙 + 별도 Founder 승인**.
- **운영 쓰기 활성화** — **금지**. 전제(**실제 UID + orphan 보존/비용/정리 정책 + emulator PASS**) 중
  **emulator PASS 하나만 충족**됐다.
- **`apps/**`와 모든 UI 연결 · 저장 버튼** — 범위 밖, **금지**.
- **`published/state.json` 발행 · legacy `admin/state.json` 공유 쓰기 · orphan 삭제·자동 정리 ·
  tombstone·자동 merge·L-4 해결** — 전부 **금지**, 각각 별도 스펙.
- **실제 네트워크 지연·단절 · 실기기 · 다중 기기 동시 편집 · 운영 규모 payload ·
  orphan 누적 실제 비용** — **NOT TESTED**.
- `pnpm-workspace.yaml`의 `allowBuilds` — 이월, **미해결**.

### 증명 경계 (유지)

> **합성 fake는 서버 Rules의 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
> transaction callback 재실행과 commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
> **emulator 증명이라고 주장하지 않는다.** **emulator는 실제 Firebase가 아니다.**

### 스펙 037 전체 이력 (보존)

계약 초판 `c654023` → 보완 라운드 1 `41b54b9` → 라운드 2 `d5789db` → **라운드 3 `9805c26`
(Codex `CONTRACT_PASSED`)** → Founder 구현 착수 승인 `4f2ab0b` → 허용 범위 검토 `f8590e4`
(**A-12 `.gitignore` · A-13 `scripts/check.mjs` 최소 확장**) → 구현 `d83aee9` →
**구현 보완 라운드 1 `ead06ab`**(payload 사전 검증 · Firebase app 소유권 · emulator `demo-` 가드) →
기록 `91a7813` → **종료(이 커밋)**.

### 다음

**`WAITING_FOR_NEXT_MANUAL_TASK`.** 다음 스펙은 **자동으로 시작하지 않는다.**
Founder가 명시적으로 지시할 때 새 작업 범위를 정한다. 자동화나 반복 작업은 만들지 않았다.
참고 후보(**아무것도 승인되지 않았다**): cutover 스펙(실제 UID → Rules 배포 순서 → 운영 쓰기) ·
admin UI 연결(저장 버튼 + 스펙 035 결합) · orphan 정책(G-4) · L-4/tombstone · 발행(F-B) · C6 재검토(G-3).

### 검증

- `git diff --check 91a7813..HEAD` **PASS** · 변경 경로 = **허용 문서 6개뿐**
- 제품 코드·Rules·config·test·lockfile diff **0**
- HEAD=origin, ahead/behind **0/0** · working tree = **보호 대상 6개만**

## 2026-08-11 — G-4 orphan 보존 방향 + 안전 삭제 조건 설계 (문서 전용 · 미커밋)

> ⚠️ **아래 초판 항목은 보완 라운드 1(이 로그 마지막 항목)이 세 가지를 정정했다.**
> ① "Storage Rules는 Firestore를 읽을 수 없다"는 **틀렸다** ②
> SDC의 objectPath 재사용 증명은 **현재 Rules에서 성립하지 않는다** ③ 변경 문서는 **6개**다.
> 원문은 이력으로 보존한다.

- **기준**: HEAD=origin=`eae9be4`, ahead/behind 0/0.
- **⚠️ 이 라운드의 문서는 지시에 따라 `commit`·`push`·`stage`하지 않았다.** Codex 검수 대기.
- **정본(신규)**: `docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`
- **변경 문서(6)** ⟵ *보완 라운드 1에서 5 → 6으로 정정*: 위 정본(신규) ·
  `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
  `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
  **`docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`**(초판에서 누락돼 있었다).
- **실행하지 않음**: 제품 코드·Rules·config·test·`package.json`·lockfile 수정 **0** ·
  **실제 객체 조회·나열·삭제 0** · 실제 Firebase/network/live/운영 데이터/실제 UID 접근 0 ·
  Rules·Hosting 배포 0 · 운영 쓰기 0 · UI 연결 0 · 발행 0 · orphan 삭제·자동 정리 0 ·
  C6 구현 0 · L-4/tombstone 구현 0 · 자동화·반복 작업 0 ·
  commit/push/stage/merge/rebase/checkout/reset **0**.

### Founder 방향 (기록된 그대로)

과거 정상 저장본을 **영구 버전 이력으로 보존할 필요는 없다** · **안전하게 식별할 수 있을 때**
삭제 후보로 본다 · **현재 사용 중이거나 저장 성공 여부가 미확정인 객체를 삭제해도 된다는 뜻은 아니다** ·
**실제 삭제·자동 정리 구현·Rules 변경·백엔드 구현·배포 승인이 아니다.**

> **확정된 것은 "과거 정상 저장본에 영구 보존 요구가 없다" 하나뿐**이고,
> 삭제 여부·시점·주체·주기는 **D-1~D-3으로 남았다.**
> 선행 G-4의 **클라이언트 delete 권한·자동 정리 불허**와 **운영 쓰기 미활성화**는 그대로 유지된다.

### ★★ 핵심 발견 — 지금은 세 집단을 구분할 수 없다

| 집단 | 정의 | Storage만으로 구분 |
| --- | --- | --- |
| **P1 현재 사용 중** | `X === head.objectPath` | **가능**(head 1회 읽기) |
| **P2 과거 정상 저장본** | 어떤 revision `R`에서 head였고 지금은 아니다 | **불가능** |
| **P3 미확정 / 늦게 성공 가능** | upload/commit 결과 불명, 또는 원 transaction이 아직 늦게 성공할 수 있다 | **불가능** |

**P2와 P3이 Storage에서 똑같이 생겼다.** 가르는 정보는 **"이 객체가 한 번이라도 head였는가"** 인데
**어디에도 기록돼 있지 않다**:

- head 문서는 **정확히 3키** — `constants.ts:33`의 `HEAD_ALLOWED_KEYS`,
  `head.ts:74-77`의 길이·키 검사, `firestore.rules`의 `validHeadKeys()`가 **`hasOnly`+`hasAll`로
  서버에서도 강제**. → **revision → objectPath 이력이 들어갈 자리가 없다.**
- 구현에 **나열도 삭제도 없다** — `facade.ts`에 `list`/`delete` 부재,
  `index.ts:7`이 *"no delete API here, by construction"*.
- `storage.rules`의 `rebuild-admin-state/objects/{objectId}`는
  **`allow update: if false` · `allow delete: if false`**.

**★ P2는 실패가 아니라 성공의 부산물이다.** `firestore.rules` update가
**`objectPath != resource.data.objectPath`** 를 강제하므로 **저장이 성공할 때마다 직전 객체가
참조에서 떨어진다.** N번 저장하면 P2가 N-1개다.

### P3이 되는 정확한 경계 (현재 구현)

`WRITE_UPLOAD_OUTCOME_UNKNOWN` → **객체 존재 여부조차 모름**, head 불변(transaction 미호출) ·
`WRITE_COMMIT_OUTCOME_UNKNOWN` → 객체는 있으나 **head가 나중에 채택할 수 있다**
(계약 §6.6 · `write-port.ts:288`).
**확정 orphan**은 `WRITE_CONFLICT`(callback, `write-port.ts:252`) ·
`WRITE_HEAD_FAILED`(`:253`) · reconciliation의 **다른 writer 승리 확정** `WRITE_CONFLICT`(`:301-302`)
뿐인데, **그 판정은 그 순간 그 클라이언트 메모리에만 있고 어디에도 남지 않는다.**

### 안전 삭제 조건 (SDC) — 4조건 AND

| # | 조건 |
| --- | --- |
| **SDC-1** | `X !== head.objectPath` (**필요조건일 뿐**) |
| **SDC-2** | **어떤 revision `R`에서 `head.objectPath === X`였다는 durable 기록이 존재한다** |
| **SDC-3** | `현재 head.revision > R` |
| **SDC-4** | SDC-1·SDC-3을 판정한 head 관측이 SDC-2 기록보다 **나중**이다 |

**증명 논리**: X가 R의 head였다면 그 commit은 **이미 성공**했으므로 **P3이 아니다**.
CAS는 `head.revision === expectedBase`일 때만 성립하고(계약 §4.3) Rules가 update를
**정확히 `+1`** 로 강제하므로 **revision은 단조 증가**한다 → `head.revision > R` 이후
**어떤 transaction도 head를 X로 되돌릴 수 없다**. ⇒ **X는 P2 확정.**

> **SDC-1·SDC-3은 head 한 번 읽기로 판정 가능하다. SDC-2만 오늘 존재하지 않는다** — 이것이 유일한 결손.

### 검증 — 단독 조건은 안전하지 않다

- **"head가 현재 가리키지 않는다" 단독 → 안전하지 않다.** 그건 **SDC-1뿐**이라 **P1만 제외**하고
  **P2와 P3을 전혀 구분하지 못한다.** P3을 지우면 뒤늦게 성공한 transaction이 가리키는 경로가 비고,
  `loadBaseline`이 **fail-closed**(계약 §6.2)되어 **운영자가 상태를 아예 읽지 못한다.**
  legacy fallback도 없다 — 그게 설계상 의도다.
- **"오래됐다" 단독 → 저장소 근거로 증명 불가.**
  **upload 쪽은 문서화된 10분 상한**이 있다(`@firebase/storage` `dist/index.esm.js:37`·`:43`).
  **commit 쪽은 상한이 없다** — `TransactionOptions.maxAttempts` 기본 5는
  (`@firebase/firestore` `dist/index.d.ts:3083`) **시도 횟수**이지 벽시계 한도가 아니고,
  총 deadline이나 "이 시각 이후 절대 도착 안 함" 보장을 **공식 문서에서 확인하지 못했다**.
  탭 정지·네트워크 단절의 지연 상한도 저장소에서 도출할 수 없다.
  **⇒ 시간 창을 쓰면 그것은 안전 증명이 아니라 Founder가 명시적으로 감수하는 리스크 수용이며,
  문서에 그렇게 적어야 한다.**

### 필요한 최소 구조 (SDC-2를 만드는 방법)

- **M-1** head에 **직전 objectPath**를 함께 기록(4번째 키) → **한 번에 정확히 하나의 P2**가 증명된다.
  변경: `firestore.rules`의 `hasOnly`/`hasAll` · `HEAD_ALLOWED_KEYS` · `validateHead` · compute · 테스트.
  한계: 정리가 한 스텝만 밀려도 **그 이전 객체는 다시 미상**.
- **M-2** **같은 transaction 안에서** append-only 이력 문서(`revision → objectPath`)를 함께 기록 →
  **완전한 체인**. **head와 이력이 둘 다 Firestore라 하나의 transaction이 다중 문서를 원자적으로
  갱신**하므로 **끊긴 체인이 생기지 않는다** — 이건 스펙 037이 불가능하다고 기록한
  **cross-service 원자성이 아니다**. 비용: 저장마다 Firestore 쓰기 1건 추가.
- **M-3** 객체 `customMetadata` → **불충분**. 업로드 시점엔 commit 결과를 모르므로
  **supersession을 증명하지 못한다.**
- (참고, 이번 범위 밖) **한 번도 head가 된 적 없는 실패 산물**은 SDC로 영원히 삭제 불가라 누적된다.
  그것까지 덮으려면 업로드 **전에** `(operationId, expectedBase)`를 durable하게 기록하고
  **`head.revision > expectedBase`** 로 "CAS에서 영원히 이길 수 없음"을 판정해야 한다 — **별도 결정**.

### ★★ 결정적 제약 — Storage Rules는 SDC를 강제할 수 없다

**Storage 보안 규칙은 Firestore를 읽을 수 없다.** 클라이언트에 `delete` 권한을 주더라도 서버는
**"이 객체가 정말 밀려났는가"를 검증할 수단이 없고**, SDC는 **클라이언트의 선의에만** 의존하게 된다 —
이 스펙이 일관되게 지켜온 fail-closed 원칙과 어긋난다.
**⇒ SDC를 실제로 강제할 수 있는 주체는 (i) 사람이 판단하는 out-of-band 삭제, 또는
(ii) Firestore와 Storage를 모두 읽을 수 있는 backend뿐이다.**

### 선택지 (권한 / 변경 / 위험)

- **O-1 운영자 수동 정리** — 저장소 밖 콘솔 접근 필요, Rules 변경 **0**.
  단 사람이 SDC를 확인하려면 **M-1/M-2 중 하나는 있어야 한다**(없으면 P2/P3 구분 불가).
  **사람이 P3을 P2로 오인하면 서버가 막아 주지 않는다.**
- **O-2 별도 백엔드/Admin SDK** — **G-3 재개** + 서비스 계정 + 함수 배포·과금.
  저장소에 `functions/`도 `firebase.json`의 `functions` 블록도 **없다**.
  **SDC를 실제로 강제할 수 있는 유일한 자동 경로**지만 **규칙이 틀리면 자동으로 손해가 난다.**
- **O-3 안전 식별 구조가 생길 때까지 삭제 보류** — 권한·변경 **0**, **오삭제 위험 0**,
  비용 단조 증가(상한 UNCONFIRMED). **현재 상태가 이것이다.**

### 남은 Founder 결정 — 3개

**D-1 완료 판정 방식**: SDC 증명(M-1/M-2 도입) / **시간 창(= 리스크 수용, 값 필요)** / 혼합 ·
**D-2 정리 주체**: 없음(보류) / 운영자 수동 / **backend(= G-3 재개)** ·
**D-3 보존 개수·주기**: 직전 K개 · 정리 주기 · 비용 상한.
> **D-1=SDC + D-2=없음** 조합도 유효하다 — 삭제는 안 일어나지만 구조는 준비된다.

### UNCONFIRMED / NOT TESTED (추정하지 않았다)

실제 `admin/state.json` 크기·내용 **NOT TESTED** · 리빌드 payload 크기 **UNCONFIRMED**
(참고 자릿수: 레거시 `published/state.json`이 base64 내장으로 **492KB**였고 외부화로 줄였다 —
`denn-admin.html:14905-14906`. **리빌드가 같다는 근거는 없다**) ·
**저장 빈도 미결정**(⚠️ 레거시 admin 저장은 **3초 디바운스**였다 —
`reviews/2026-07-31-admin-write-boundary-investigation.md:74`. **저장마다 새 불변 객체가 생기는
구조에서 이 값이 객체 수를 지배한다**) · bucket 객체 수·용량·location·storage class·기존 lifecycle
**NOT TESTED/UNCONFIRMED**(bucket 레벨이라 저장소 밖이고 `firebase.json`에 lifecycle 항목 없음) ·
GCS 요금 **UNCONFIRMED** · **늦은 commit의 실제 지연 상한 UNCONFIRMED** ·
**Storage prefix 나열이 현재 Rules에서 허용되는지 UNCONFIRMED**
(`match`가 객체 단위이고, 스펙 037 emulator가 검증한 `list` 거부는 **Firestore head 쪽**이다.
emulator로 확인 가능하나 이번 라운드에서는 실행하지 않았다).

### 인접 경계만 기록 (범위 확장 아님)

**C6(G-3)** — O-2를 고르면 그것이 곧 G-3 재개다. **L-4/tombstone** — 문서 *내부*의 삭제 의미론이라
객체 수준 orphan과 **다른 문제**이며 섞지 않는다. **발행(F-B)** — `published/`는 별도 경로라
`rebuild-admin-state/` 정책을 **상속하지 않는다**.

### 다음

**Codex 검수** → 그 뒤 **Founder가 D-1~D-3 응답**.
그 전에는 **구현 계약도 다음 구현도 시작하지 않는다.** 커밋 여부도 Codex/Founder 지시를 따른다.

## 2026-08-11 — G-4 문서 보완 라운드 1 (CORRECTION_REQUIRED · 문서 전용 · 미커밋)

> ⚠️ **아래 라운드 1 항목의 세 서술을 보완 라운드 2(이 로그 마지막 항목)가 폐기했다.**
> ① "같은 transaction의 형제 쓰기를 Rules가 볼 수 없다" · "REC과 head를 같은 transaction으로 묶을 수
> 없다" → **`getAfter()`로 가능하다** · ② "공식 문서에 총 deadline이 없다" → **lock 20초·최대 270초·
> idle 60초·유한 재시도가 명시돼 있다** · ③ `REC(objectId)` 표기 → **`objectId`는 실제로
> `"<uuid>.json"`이라 매핑이 성립하지 않았다.** 원문은 이력으로 보존한다.

- **기준**: HEAD=origin=`eae9be4`, ahead/behind 0/0.
- **⚠️ `commit`·`push`·`stage` 하지 않았다.** Codex **재검수** 대기.
- **변경 문서 6개**(= 초판에서 5개로 잘못 적었던 것을 정정): 정본
  `decisions/2026-08-11-g4-orphan-retention-decisions.md`(신규) ·
  `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
  `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
  **`docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`**.
- **실행하지 않음**: 제품 코드·`firestore.rules`·`storage.rules`·config·test·`package.json`·lockfile
  수정 **0** · **실제 객체 조회·나열·삭제 0** · 실제 Firebase/project/bucket/운영 데이터/실제 UID
  접근 0 · **emulator 실행 0** · 배포·운영 쓰기·UI 연결·발행·자동 정리·C6·L-4 구현 0 ·
  자동화·반복 작업 0 · commit/push/stage/merge/rebase/checkout/reset **0**.

### 교정 1 — "Storage Rules는 Firestore를 읽을 수 없다"는 **내 서술이 틀렸다**

공식 문서 `https://firebase.google.com/docs/storage/security/rules-conditions` (2026-08-11 확인):

> *"Using the `firestore.get()` and `firestore.exists()` functions, your security rules can evaluate
> incoming requests against documents in Cloud Firestore."*

**같은 페이지의 공식 제약 4개(인용)**

1. *"Storage Security Rules can only access documents from the **default Cloud Firestore database**
   when multiple databases are active."*
2. **★ *"No more than two Firestore documents may be accessed in a single Rules evaluation."***
3. *"…reads of documents from Storage Security Rules **count towards your project's Firestore quota
   and billing**."*
4. 첫 저장 시 **콘솔/CLI에서 두 제품 연결 권한 활성화 프롬프트**가 뜨고 **IAM role 제거로 비활성화** 가능.

⇒ 초판의 **"SDC를 강제할 수 있는 주체는 사람 또는 backend뿐"** 결론을 **폐기**하고,
**O-4 — Storage Rules가 `firestore.get()`으로 직접 서버 강제** 선택지를 신설해 분석했다.
⚠️ **클라이언트 delete 권한 승인도 구현 승인도 아니다.** 잔여 위험이 해소되기 전까지 **삭제 금지**.

> **제약 2가 설계를 지배한다** — 삭제 조건이 Firestore 문서를 **정확히 2개**(HEAD + REC) 쓰므로
> **한도를 정확히 소진하고 확장 여지가 0**이다.

⚠️ `https://firebase.google.com/docs/reference/security/storage`는 이 세션 WebFetch로 **본문 미취득**
(내비게이션만 반환 — 스펙 037 때와 동일). 위 인용은 전부 `rules-conditions`에서 왔다.

### 교정 2 — SDC 증명의 objectPath 재사용 결함

**초판의 주장**: *"`head.revision > R`이면 어떤 transaction도 head를 X로 되돌릴 수 없다."*
**현재 Rules에서 성립하지 않는다.** `firestore.rules:57-60`:

```
&& request.resource.data.revision == resource.data.revision + 1
&& request.resource.data.objectPath != resource.data.objectPath;
```

**비교 대상이 "직전 값" 하나뿐**이라 **A → B → A**가 막히지 않는다.

**★ 더 깊은 문제도 찾았다 — 삭제가 불변성 자체를 깬다.**
`storage.rules`의 create가 **`resource == null`** 이므로 **X를 지우는 순간 경로 X가 다시 생성
가능해진다.** 같은 경로에 다른 내용이 올라올 수 있고, 위 결함과 겹치면 head가 그것을 가리킬 수도 있다.
⇒ **"객체는 불변"이라는 토대는 "아무것도 지우지 않는 한"에서만 성립한다.**

**재설계 — 경로를 키로 하는 write-once 소비 기록(REC)**

```
/rebuildAdminStateObjects/{operationId}   =  { claimedBase: <0 이상 정수> }
Firestore Rules: allow create(승인 UID · 키가 정확히 claimedBase) / allow update, delete: if false
클라이언트가 업로드 *전에* 생성 = 그 경로를 선점·소각
```

- **head 규칙 보강**: create는 `firestore.get(REC(new)).claimedBase == 0`,
  update는 **`firestore.get(REC(new)).claimedBase == resource.data.revision`**.
  REC이 **write-once**라 `claimedBase`가 **불변** ⇒ **한 경로는 정확히 한 번의 전이
  (`claimedBase → claimedBase+1`)에서만 head가 될 수 있다** ⇒ **A → B → A 구조적 불가.**
  (head 규칙의 Firestore 접근 **1개**, 한도 이내.)
- **안전 삭제 조건 SDC′** (Storage delete 규칙):
  **`approvedOperator() && firestore.get(HEAD).revision > firestore.get(REC(objectId)).claimedBase + 1`**
  → **Firestore 접근 정확히 2개 = 한도와 동일, 여유 0.**
- **증명**: ① head 규칙이 REC을 요구하므로 head가 가리키는 모든 경로에 REC이 있다.
  ② X가 head였다면 그 전이는 `claimedBase_X → claimedBase_X + 1`.
  ③ `head.revision > claimedBase_X + 1` ⇒ 지금 head가 아니고 `claimedBase_X`가 불변이라
  **다시는 head가 될 수 없다** ⇒ **P2 확정.**
  ④ 한 번도 head가 아니었다면(실패 산물) 그 transaction은 `head.revision == claimedBase_X`에서만
  이길 수 있는데 이미 지났으므로 **영원히 못 이긴다.**
  ⑤ **P3은 자동 보호** — `head.revision ≤ claimedBase_X + 1` 동안 조건이 성립하지 않는다.
  **★ 하나의 조건이 P1 보호·P2 식별·P3 보호·실패 산물 회수를 모두 덮는다 ⇒ 시간 창이 필요 없다.**
- **원자성 질문에 대한 답**: head 갱신과 REC을 **같은 transaction의 다중 문서 쓰기로 묶을 수 없다** —
  Rules는 각 쓰기를 **독립 평가**하고 `get`/`exists`는 **커밋된 상태만** 보므로 형제 쓰기를 볼 수 없다.
  **그래서 원자성 대신 순서를 강제한다**: REC을 **먼저** 만들고 head 규칙이 그것을 **요구**한다.
  **REC만 만들고 head를 못 옮겨도 무해**하다(경로만 소각).
- **잔여 한계**: 삭제 후 Storage create가 다시 열려 **참조 불가능한 stray 객체**가 생길 수 있다
  (head 무결성은 안전). 차단하려면 create 규칙에도 Firestore 조회 2개를 넣어야 하고,
  그러면 **다른 writer가 먼저 head를 옮겼을 때 우리 업로드가 `WRITE_FORBIDDEN`이 되어
  계약 §5.4의 오류 의미가 바뀐다** — 트레이드오프로 기록했고 채택 여부는 결정 사항이다.

**M-1 · M-2 재검토 — 둘 다 재사용을 막지 못한다**

| 구조 | 차단? | 이유 |
| --- | --- | --- |
| **M-1** head에 **직전 objectPath 1개** | **✘ 불충분** | A→B→A에서 **직전은 B**다. A는 비교 대상에 없다 |
| **M-2** **revision → objectPath 이력** | **✘ 불충분** | 키가 `revision`이라 **경로로 역조회가 불가능**하고, **접근 한도 2** 때문에 이력 순회도 불가능하다 |

⇒ **revision→objectPath 이력만으로는 부족하고, `objectPath`(= `operationId`)를 키로 하는
uniqueness/consumption 기록이 필요하다.**

### 교정 3 — 변경 문서 개수 5 → 6

초판이 **handoff(`docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`)를 빠뜨렸다.**
STATE의 `working_tree`와 초판 live log 항목을 모두 **6개**로 정정하고 파일명을 전부 열거했다.

### 유지되는 판정

- **"head가 현재 가리키지 않는다" 단독 = 안전하지 않다** — P2/P3 미구분 →
  P3을 지우면 `loadBaseline`이 **fail-closed**되어 운영자가 상태를 아예 못 읽는다.
- **"오래됐다" 단독 = 증명 불가** — upload는 **10분** 상한이 문서화됐으나
  (`@firebase/storage` `index.esm.js:37`·`:43`) **commit 늦은 성공에는 상한이 없다**
  (`maxAttempts` 5는 **시도 횟수**, `@firebase/firestore` `index.d.ts:3083`).
  **시간 창은 리스크 수용이지 증명이 아니다.** 단 **SDC′를 채택하면 시간 창 자체가 불필요**해진다.
- **★ REC이 없는 현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ 삭제 보류(O-3)가 기본값이다.**

### 선택지 (O-4 신설)

**O-1 운영자 수동**(Rules 변경 0, 사람이 P3을 오인해도 서버가 안 막는다) ·
**O-2 backend/Admin SDK**(**G-3 재개**, 규칙이 틀리면 자동으로 손해) ·
**★ O-4 Storage Rules 서버 강제**(클라이언트 delete 권한 + IAM 활성화 필요 ·
**접근 한도 2를 정확히 소진** · Firestore quota/billing 증가 · **기본 DB만** · 실제 동작 **NOT TESTED**) ·
**O-3 삭제 보류**(위험 0, **현재 상태이자 기본값**).

### 남은 Founder 결정 — 3개 (재검수 **후에** 묻는다)

**D-1 완료 판정 방식**(SDC′ 증명 / 시간 창=리스크 수용 / 혼합) ·
**D-2 정리 주체**(없음 / 운영자 수동 / backend=G-3 재개 / **O-4 Storage Rules 서버 강제**) ·
**D-3 보존 개수·주기**.

### UNCONFIRMED / NOT TESTED

**§5 설계(REC + `firestore.get()` 규칙)의 실제 동작 NOT TESTED** — emulator로 검증 가능하나
이번 라운드에서 실행하지 않았다 · 실제 `admin/state.json` 크기·내용 **NOT TESTED** ·
리빌드 payload 크기 **UNCONFIRMED** · **저장 빈도 미결정**(⚠️ 레거시 **3초 디바운스** —
저장마다 **객체 1개 + REC 1개**가 생기는 구조에서 객체 수와 **Firestore 비용**을 지배한다) ·
bucket 객체 수·용량·location·class·lifecycle **NOT TESTED/UNCONFIRMED** ·
GCS·Firestore 요금 **UNCONFIRMED** · 늦은 commit 지연 상한 **UNCONFIRMED** ·
Storage prefix 나열 허용 여부 **UNCONFIRMED** ·
`docs/reference/security/storage` 본문 **이 세션 미취득**.

### 다음

**Codex 재검수 — 수정된 안전성 증명을 먼저 검수받는다.**
통과 후에야 **Founder에게 D-1~D-3을 다시 묻는다.** 그 전에는 구현 계약도 구현도 시작하지 않는다.

## 2026-08-11 — G-4 문서 보완 라운드 2 (CORRECTION_REQUIRED · 문서 전용 · 미커밋)

- **기준**: HEAD=origin=`eae9be4`, ahead/behind 0/0.
- **⚠️ `commit`·`push`·`stage` 하지 않았다.** Codex **재검수(라운드 2)** 대기.
- **변경 문서 6개**: 정본 `decisions/2026-08-11-g4-orphan-retention-decisions.md` ·
  `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
  `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
  `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`.
- **실행하지 않음**: 제품 코드·`firestore.rules`·`storage.rules`·config·test·`package.json`·lockfile
  수정 **0** · **실제 객체 조회·나열·삭제 0** · 실제 Firebase/project/bucket/운영 데이터/실제 UID
  접근 0 · **emulator 실행 0** · 배포·운영 쓰기·UI 연결·자동 정리 0 · 자동화 0 ·
  commit/push/stage/merge/rebase/checkout/reset **0**.

### 교정 1 — `getAfter()` 누락으로 원자성 설명이 틀렸다

**라운드 1의 서술 두 개를 폐기한다** — *"같은 transaction의 형제 쓰기를 Rules가 볼 수 없다"* ·
*"REC과 head를 같은 transaction의 다중 문서 쓰기로 묶을 수 없다"*.

**근거** — `https://firebase.google.com/docs/firestore/enterprise/security/rules-conditions`
(2026-08-11 확인):

> *"For writes, you can use the `getAfter()` function to access the state of a document **after a
> transaction or batch of writes completes but before the transaction or batch commits**."*

**★ 접근 한도 두 개를 분리했다** (라운드 1은 구분하지 않았다):

| 어디 | 한도 | 출처 |
| --- | --- | --- |
| **Storage Rules** → Firestore (`firestore.get()`) | **문서 2개** | `storage/security/rules-conditions` |
| **Firestore Rules** → Firestore | *"10 for single-document requests and query requests. 20 for multi-document reads, transactions, and batched writes."* | `firestore/enterprise/security/rules-conditions` |

**구조 A(순차) vs B(원자 동반) 재비교**

| 항목 | **A 순차** | **B 원자 동반(`getAfter`)** |
| --- | --- | --- |
| crash 시 | **REC만 남고 head 미이동** → 경로가 **소각된 채** 남음 | all-or-nothing → **REC도 head도 안 남음** |
| **★ 그 결과** | 객체에 **REC이 있다** ⇒ **SDC′로 회수 가능** | 객체에 **REC이 없다** ⇒ **영원히 판정 불가**(실패 산물 누적) |
| callback 재실행 | REC은 이미 커밋 → 무관, `compute` 순수 유지 | `tx.set(REC)`은 §5.5가 허용한 `transaction.set`이라 계약 위반 아님, 재실행 시 버퍼 리셋 |
| Rules access | head 규칙 `get` **1회**(Firestore 한도 **20** 중 1) | head 규칙 `getAfter` **1회**(동일 한도 안) |
| REC write-once | `update/delete: if false`로 성립 | 동일. **transaction 안 create도 create로 평가** |
| 경로 재사용 차단 | head 규칙의 `claimedBase == resource.data.revision` | **REC이 이미 있으면 create 실패** → 자동 차단(더 단순) |
| 최초 head create | `get(REC).claimedBase == 0` | `getAfter(REC).claimedBase == 0` |
| **스펙 037 `runTransaction` 1회 계약** | **유지**, 단 저장 순서에 **"업로드 전 Firestore 쓰기 1회"** 추가 → **계약 변경** | **유지 + 순서 변경도 없음** → **계약 변경이 더 작다** |
| **Storage create 단계 stray 차단** | **가능**(업로드 시점에 REC 존재) | **불가능**(업로드 시점에 REC 없음) |
| 비용 | Firestore 쓰기 1 + read 1 | Firestore 쓰기 1(같은 transaction) + read 1 |
| 테스트 | fake: REC→upload→transaction 순서 · emulator: REC 없는 head 거부, 재사용 거부, 고아 REC 무해 | fake: 동일 transaction 2문서 · emulator: **REC 없이 head만 쓰기 거부**(`getAfter` 동작), 재사용 거부 |

> **판정: B는 공식 근거로 실행 가능하다. 불가능하다고 단정하지 않는다.**
> **★ 다만 회수 범위가 역전된다** — B가 더 우아해 보이지만 **실패 시 REC 없는 객체**를 만들어
> **SDC′로 영원히 회수할 수 없다**. A는 반대로 **실패 산물까지 회수 가능**하고
> **Storage create 단계의 stray 차단**도 된다.
> **⇒ G-4의 목적이 "과거 정상 저장본 회수"뿐이면 둘 다 충분하고, "실패 산물까지"라면 A가 필요하다.**
> **어느 쪽도 채택하지 않았다. 둘 다 NOT TESTED.**

### 교정 2 — transaction 시간 제한

**라운드 1의 *"공식 문서에 총 deadline이 없다"* 는 부정확했다.**
**근거** — `https://docs.cloud.google.com/firestore/docs/manage-data/transactions` (2026-08-11 확인):

| 조건 | 값 |
| --- | --- |
| lock deadline | *"exceeded the lock deadline (**20 seconds**)"* |
| 최대 지속 / idle | *"exceeds the **270-second** time limit or the **60-second** idle expiration time"* |
| 최대 요청 크기 | *"maximum request size of **10 MiB**"* |
| 재시도 | 경합 시 자동 재실행하되 **유한 횟수** 후 실패 |
| 순서 | *"Read operations must always be executed before any write operations."* |

SDK `TransactionOptions.maxAttempts` 기본값 **5**(`@firebase/firestore` `dist/index.d.ts:3083`).

**★ 반드시 분리한다**

| | 상태 |
| --- | --- |
| 서버 transaction / 개별 SDK transaction의 **공식 제한** | **확정** — 20초 lock · **270초** · 60초 idle · **유한 재시도** |
| **`save()` 호출 전체의 실제 벽시계 상한** — 탭 정지 · JS 스케줄링 정지 · SDK backoff·재시도 · Storage 업로드 재시도(**10분**, `@firebase/storage` `index.esm.js:37`·`:43`) 포함 | **UNCONFIRMED** |

> **"공식 제한이 전혀 없다"(틀림)와 "호출 전체의 절대 상한을 증명하지 못했다"(사실)는 다른 진술이다.**
> 순진한 상한(5회 × 270초)은 **문서화되지 않은 재시도 간 backoff와 브라우저 정지**를 포함하지 않아
> **증명이 아니다.**
> ⚠️ **이 정정만으로 임의의 시간 기반 삭제를 안전하다고 승인하지 않는다.**
> **SDC′를 채택하면 시간 창 자체가 불필요하다.**

### 교정 3 — REC 문서 ID ↔ Storage `objectId` 매핑

**라운드 1의 결함**: Storage Rules `match /rebuild-admin-state/objects/{objectId}` 에서
**`objectId`의 실제 값은 `"<uuid>.json"`**(확장자 포함)인데 REC은 `/rebuildAdminStateObjects/{operationId}`
(**확장자 없음**)였다 → **`REC(objectId)`가 같은 문서를 가리키지 못했다.**

**확정 매핑 — 문자열 변환 0**

| # | 결정 |
| --- | --- |
| 1 | **REC 문서 ID = Storage `objectId` 세그먼트 그대로 = `"<uuid>.json"`** |
| 2 | **Storage Rules는 `objectId`를 변환 없이 직접 보간** — `firestore.get(/databases/(default)/documents/rebuildAdminStateObjects/$(objectId))` |
| 3 | **head는 `objectPath` 대신 `recId`를 담는다**(값이 곧 REC 문서 ID이자 Storage 세그먼트) |
| 4 | **전체 경로는 클라이언트가** 상수 접두사 + `recId`로 만든다(Rules는 만들지 않는다) |
| 5 | head 규칙은 **`$(request.resource.data.recId)`로 직접 보간**해 REC 조회 |
| 6 | `recId`는 **정규식으로만** 검증 — `^[0-9a-f]{8}-…-[0-9a-f]{12}[.]json$` |

**⇒ 문자열 파싱·분해·연결을 하나도 쓰지 않는다.** 양쪽 Rules가 **같은 문자열을 문서 ID로 직접 사용**한다.

**채택하지 않은 대안**: `objectPath`+`recId` 병기 후 일치 검증(**문자열 `+` 연결 필요 → 지원
UNCONFIRMED**) · `objectPath` 파싱(**`split` 등 지원 UNCONFIRMED**) ·
일치 검증 없이 `recId`만 사용(**head 경로와 REC이 어긋날 수 있어 기각**).
> **원칙: 공식 지원을 확인하지 못한 문자열 함수는 설계에 넣지 않는다.**

**head 스키마 변경(= 스펙 037 계약 변경)**: `{schemaVersion, revision, objectPath}` →
`{schemaVersion, revision, recId}` — **키 개수 3 유지**, 재사용 차단 조건도
`objectPath != …` → **`recId != resource.data.recId`**.
영향: 계약 §4.3·§4.4·§5.6 · `constants.ts` · `head.ts` · `types.ts` · `write-port.ts` ·
`firestore.rules` · unit/emulator 테스트. **아직 승인되지 않았다.**

### 유지되는 판정

- **"head 미참조" 단독 = 안전하지 않다**(P2/P3 미구분 → `loadBaseline` fail-closed).
- **"오래됐다" 단독 = 여전히 안전 증명이 아니다**(§교정 2의 분리).
- **★ REC이 없는 현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ 삭제 보류(O-3)가 기본값.**
- 라운드 1의 정정 3건(**Storage Rules가 Firestore를 읽을 수 있다** → O-4 신설 ·
  **A→B→A 미차단 + 삭제가 경로 재생성을 열어 불변성을 깬다** · **변경 문서 6개**)도 **유지**된다.

### 남은 Founder 결정 — 3개 (**재검수 통과 전까지 묻지 않는다**)

**D-1 완료 판정 방식과 구조**(SDC′+A / SDC′+B / 시간 창 / 혼합) ·
**D-2 정리 주체**(없음 / 운영자 수동 / backend=G-3 재개 / Storage Rules 서버 강제 O-4) ·
**D-3 보존 개수·주기**.

### UNCONFIRMED / NOT TESTED

**구조 A·B 및 REC + `firestore.get()`/`getAfter()` 규칙의 실제 동작 NOT TESTED**(emulator 미실행) ·
**Rules의 문자열 연결(`+`)·분해(`split` 등) 지원 여부 UNCONFIRMED**(설계에 쓰지 않았다) ·
**`save()` 호출 전체의 벽시계 상한 UNCONFIRMED**(개별 transaction 제한은 확정) ·
실제 `admin/state.json` 크기·내용 **NOT TESTED** · 리빌드 payload 크기 **UNCONFIRMED** ·
**저장 빈도 미결정**(⚠️ 레거시 **3초 디바운스**; 저장마다 **객체 1개 + REC 1개**가 생기고
Storage Rules의 `firestore.get()`도 **quota/billing에 포함**된다) ·
bucket 객체 수·용량·location·class·lifecycle **NOT TESTED/UNCONFIRMED** ·
GCS·Firestore 요금 **UNCONFIRMED** · Storage prefix 나열 허용 여부 **UNCONFIRMED** ·
`docs/reference/security/storage` 및 `docs/reference/rules/rules.firestore` 본문 **이 세션 미취득**
(WebFetch가 내비게이션만 반환 — 인용은 전부 취득 성공한 페이지에서 왔다).

### 다음

**Codex 재검수(라운드 2).** 통과 후에야 **Founder에게 D-1~D-3을 묻는다.**
그 전에는 구현 계약도 구현도 시작하지 않는다.

## 2026-08-11 — ★ G-4 보완 라운드 2 Codex 문서 검수 통과 · 오늘 세션 종료

- **기준**: HEAD=origin=`eae9be4`, ahead/behind 0/0.
- **문서 검수 결과**: **`DOCUMENT_REVIEW_PASSED`**.
- **상태**: `READY_FOR_CODEX` → **`FOUNDER_DECISION_REQUIRED`** ·
  `active_unit: g4-orphan-retention-policy` ·
  `completed_unit: spec-037-admin-write-c5-emulator`(**DONE / CODEX_PASSED 유지**) ·
  `next_transition: FOUNDER_G4_D1_D3_DECISION`.
- **⚠️ G-4 문서 6개는 여전히 `commit`·`push`·`stage` 하지 않았다.** 커밋 여부는 별도 지시를 따른다.
- **변경 문서 6개**(이번 동기화도 동일 범위): 정본
  `decisions/2026-08-11-g4-orphan-retention-decisions.md` ·
  `Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
  `docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
  `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`.
- **실행하지 않음**: 제품 코드·`firestore.rules`·`storage.rules`·config·test·`package.json`·lockfile
  수정 **0** · **실제 객체 조회·나열·삭제 0** · 실제 Firebase/project/bucket/운영 데이터/실제 UID
  접근 0 · **emulator 실행 0** · 배포·운영 쓰기·UI 연결·발행·자동 정리 0 · 자동화·반복 작업 0 ·
  commit/push/stage/merge/rebase/checkout/reset **0**.

### Codex 최종 판정

- **G-4 보완 라운드 2 문서 검수 통과.**
- **`getAfter()` 원자성 정정 · transaction 시간 제한 정정 · REC ID 매핑 정정**이 반영됐다.
- **구조 A와 B는 모두 "가능한 후보"로만 기록됐으며 어느 것도 채택되지 않았다.**
- **구조 A/B 및 REC·Rules 동작은 NOT TESTED다.**
- **실제 삭제 · 자동 정리 · Rules 변경 · head 스키마 변경 · 클라이언트 delete 권한 ·
  IAM 활성화 · 구현·배포 승인이 아니다.**
- **현재 기본 정책은 계속 `O-3 삭제 보류`다.**
- **다음 단계는 Founder의 D-1~D-3 결정이며 오늘은 결정하지 않는다.**

### 남은 Founder 결정 — **선택지 그대로 보존** (아무것도 고르지 않았다)

| # | 질문 | 선택지 |
| --- | --- | --- |
| **D-1** | 완료 판정 방식과 구조 | **SDC′ + 구조 A**(실패 산물까지 회수 · Storage create stray 차단 가능 · 계약 변경 큼) / **SDC′ + 구조 B**(원자성 서버 강제 · 계약 변경 작음 · 실패 산물 회수 불가) / **시간 창**(= 리스크 수용) / 혼합 |
| **D-2** | 정리 주체 | 없음(O-3 보류) / 운영자 수동(O-1) / backend(O-2 = G-3 재개) / Storage Rules 서버 강제(O-4) |
| **D-3** | 보존 개수·주기 | 직전 K개 · 정리 주기 · 비용 상한 |

> **D-1 = SDC′ + D-2 = 없음** 조합도 유효하다 — 삭제는 일어나지 않지만 구조는 준비된다.

### 이 세션에서 확정된 것 / 확정되지 않은 것

**확정**: Founder 방향(**과거 정상 저장본에 영구 보존 요구 없음**) · 세 집단(P1/P2/P3) 구분 문제 ·
**"head 미참조" 단독·"오래됐다" 단독으로는 안전을 증명할 수 없다** ·
**Storage Rules가 `firestore.get()`/`exists()`로 Firestore를 읽을 수 있다**(제약 4개) ·
**`getAfter()`로 원자 동반 쓰기를 강제할 수 있다** ·
**transaction 공식 제한**(lock 20초 · 최대 270초 · idle 60초 · 유한 재시도) ·
**REC ID = Storage `objectId` 세그먼트** 매핑(문자열 함수 0) ·
**현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ `O-3 삭제 보류`가 기본값.**

**확정되지 않음**: D-1~D-3 · 구조 A/B 채택 · head 스키마 변경 · Rules 변경 · 삭제 실행 ·
정리 주체 · 보존 기간·비용 한도.

### 세션 종료

**오늘 작업은 여기서 끝낸다. 다음 작업은 자동으로 시작하지 않는다.**
Founder가 D-1~D-3을 결정하면 그때 최소 파일 범위가 열린다(정본 §14).
자동화나 반복 작업은 만들지 않았다.

## 2026-08-14 — G-4 Structure A 식별 구조 로컬 구현 · READY_FOR_CODEX

- Founder 승인: **D-1=A, D-2=O-3, D-3=N**.
- 구현: write-once REC `/rebuildAdminStateObjects/{UUID.json}` 선행 create, head `recId` 전환,
  Storage/head Rules의 동일 REC 확인, A→B→A 재사용 차단.
- 삭제 경계: Storage/REC/head delete는 모두 계속 거부. 삭제 API·자동 정리·보존 스케줄 0.
- 검증: targeted unit **51/51**, Firebase typecheck PASS, `pnpm check` PASS(unit **1322/1322**),
  Chromium E2E **134/134**, local `demo-denn-emulator` Rules **13/13**.
- 실제 Firebase/project/bucket/UID/network, IAM 활성화, Rules/Hosting 배포, UI 연결 0.
- Git: 기준 HEAD=origin `eae9be4`; stage/commit/push 0. 보호 대상과 사용자 `AGENTS.md` 변경은
  수정·복원·stage하지 않았다. 다음은 `CODEX_REVIEW_SPEC_039`; 자동 다음 작업 0.

## 2026-08-14 — 스펙 039 Codex 독립 검수 통과 · 로컬 종료

- 판정: **CODEX_PASSED**, 발견 결함 0.
- 검수 범위: REC write-once, `claimedBase`, head `recId`, Storage REC 존재 검사,
  A→B→A 차단, 결과 미확정 오류, delete 전면 거부, 공개 경계·forbidden diff.
- 게이트 유지: targeted 51/51, unit 1322/1322, Chromium 134/134, emulator 13/13,
  고객 번들 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`.
- 실제 Firebase·UID·IAM·배포·UI·delete·자동 정리는 NOT TESTED/금지.
- 스펙 039: `DONE / CODEX_PASSED / LOCAL_ONLY`; 상태 `WAITING_FOR_NEXT_MANUAL_TASK`.
- stage/commit/push 0. 다음 작업 자동 시작 0.

## 2026-08-14 — 스펙 039 구현·종료 커밋 fast-forward push

- 커밋: `7843e85` — `spec 039: add orphan identification structure A`.
- 정확히 22개 스펙 039 코드·Rules 목표·test·정본/상태 문서만 포함했다.
- push: `eae9be4..7843e85`, `origin/rebuild/modern-studio`, 일반 fast-forward 성공.
- 보호 대상 6개와 사용자 `AGENTS.md`는 stage/commit하지 않았다.
- 실제 Firebase·UID·IAM·배포·UI·delete·자동 정리는 계속 금지.
- 상태: `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 작업 자동 시작 0.

- 후속 상태 동기화 커밋: `195112b` — `spec 039: record completion state`, fast-forward push 성공.

## 2026-08-14 — 스펙 040 후보 UI 연결 계약 조사 · Founder 결정 대기

- 문서 전용 조사. 제품 코드·Rules·config·test·manifest·lockfile 변경 0.
- 확인: spec 036 controller는 카탈로그/revision을 보존하지 않고, spec 035 draft는 특정 frameSize에
  연결되지 않아 현재 저장 버튼은 전체 문서 CAS 입력을 구성할 수 없다.
- 제안: baseline catalog + exact revision을 메모리에 소유하는 write-session controller 선행.
- Founder 결정: U-1~U-3, 권장값 모두 A.
- 실제 Firebase·UID·IAM·배포·운영 쓰기·UI 저장 버튼·delete·자동 정리·발행은 금지 유지.
- 신규 문서: spec 040 후보 계약 + handoff. stage/commit/push 0, 자동화 0.

## 2026-08-14 — 스펙 040 U-1~U-3 승인 · write-session controller 구현

- Founder 승인: U-1=A, U-2=A, U-3=A.
- 구현: framework-free session controller + 합성 unit. UI/App wiring/write adapter 생성 0.
- 고정: exact expectedBase, dirty 폐기 확인, single in-flight, invalid catalog write 0,
  conflict/outcome-unknown 자동 retry 0, upload 확정 실패 명시 재시도, late auth/dispose 결과 무시.
- 검증: targeted 9/9, `pnpm check` PASS(unit 1331/1331), Chromium 134/134 PASS,
  고객 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`.
- 실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/UI/delete/발행 0.
- 상태: READY_FOR_CODEX, stage/commit/push 0, 자동화 0.

## 2026-08-14 — 스펙 040 Codex 보완 라운드 1 · CODEX_PASSED

- 결함 1: 동일 `authenticated` observer 재통지가 baseline/dirty draft를 초기화 → 동등 상태 no-op.
- 결함 2: revoked Proxy 입력에서 validation throw가 reject 가능 → `WRITE_INVALID_INPUT` fail-closed.
- 회귀: baseline/dirty 보존, raw 오류 비노출, Storage/write 호출 0을 unit으로 고정.
- targeted 11/11, 전체 unit 1333/1333, `pnpm check` PASS. 추가 결함 0.
- 최종: `DONE / CODEX_PASSED / LOCAL_ONLY / NO_UI`, `WAITING_FOR_NEXT_MANUAL_TASK`.
- 실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/UI/delete/발행 0. stage/commit/push 0.

## 2026-08-14 — 스펙 040 검증 완료 변경 커밋

- 구현·계약 커밋: **`1160bc4`** — `spec 040: add local admin write session controller`.
- 포함 범위: session controller + unit + spec 040 계약 + handoff, 정확히 4개 파일.
- 종료 상태 문서 4개는 별도 일반 커밋으로 기록하고 함께 fast-forward push한다.
- 보호 대상과 기존 Founder/user 변경은 stage·commit하지 않았다.

## 2026-08-14 — 스펙 041 WIP · F-D provenance 충돌 STOP

- Founder 결정: V-1=A, V-2=A, V-3=A.
- WIP: stable ID 선택 기반 immutable print-size edit, 격리 React editor, session clean 복귀 입력.
- 검증: targeted 25/25, shared/admin typecheck PASS.
- 발견: legacy `wcm/hcm` 메모리 정규화 provenance가 baseline에서 소실되고 현재 save 직렬화가 승격
  canonical 필드를 payload에 포함할 수 있어 F-D와 충돌한다.
- 실제 운영 데이터는 조회하지 않아 영향 수는 NOT TESTED. 전체 check/E2E/hash는 STOP 이후 NOT RUN.
- 상태: `FOUNDER_DECISION_REQUIRED`; 권장 W-1=A. 완료·App 연결·실제 쓰기 금지.

## 2026-08-18 — 스펙 041 W-1=A 보완 · CODEX_PASSED

- Founder 승인: W-1=A.
- F-D 보완: baseline `promotedLegacyPrintSizeIds`, same-port exact loaded revision save 전제조건,
  legacy `wcm/hcm` 추가·변경·삭제 거부, read-time 승격 canonical만 payload에서 제거.
- 원래 canonical+legacy pair는 보존하며 legacy field 포함 size는 순수 edit/UI 모두 읽기 전용.
- 독립 보완: invalid partial 입력이 clean으로 보이던 dirty 판정을 `dirty-invalid`로 수정.
- 검증: targeted 74/74, `pnpm check` PASS(unit 1356/1356), Chromium 134/134,
  고객 JS `index-W_cZpbdf.js` 287,741 bytes · SHA-256
  `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`, diff-check PASS.
- 구현·계약 커밋 `27e6ff4`. App/UI 연결·실제 Firebase/network/emulator·Rules/config·운영 쓰기·
  발행·delete·deploy 0. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`.

## 2026-08-18 — 스펙 042 로컬 브라우저 fixture · CODEX_PASSED

- Founder 승인: X-1=A, X-2=A, X-3=A.
- 별도 HTML/Vite entry와 합성 auth/write fake로 실제 session controller/editor의 브라우저 경계를
  검증했다. production `App.tsx`·composition·Firebase adapter/network 변경 0.
- 시나리오: 명시적 baseline load, 안정 선택/prefill, invalid save 0, exact expectedBase 1회 save,
  conflict/outcome-unknown 자동 retry 0, 명시적 discard reload.
- 게이트: `pnpm check` PASS(unit 1356/1356), Chromium **139/139**(신규 5), 고객 JS SHA-256
  `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`, diff-check PASS,
  포트 4183/4184·OS temp 잔류 0.
- 구현 커밋 `d0fb7c3`. 실제 Firebase/emulator/UID/IAM/Rules·Hosting 배포/운영 쓰기/UI 연결/
  delete/발행은 NOT TESTED/금지. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-18 — 스펙 043 production 연결 전 composition 조사 · Founder 결정 대기

- Founder Y-1=A 승인에 따라 문서 전용 조사 수행.
- 확인: 기존 read env factory는 auth/read ports를 내부 소유해 write session과 동일 auth instance를
  공유할 composition API가 없으며, legacy-only load와 C5 baseline load는 서로 다른 동작이다.
- 권장: Y-2=A 단일 composition/auth, Y-3=A production auth-only card, Y-4=A 별도 write flag,
  Y-5=A 명시 load 시 rejection-safe lazy write 생성.
- 신규 spec 043 + handoff와 상태 문서만 변경. 제품 코드·Rules/config/test/package/lockfile 0,
  실제 Firebase/network/emulator/UID/IAM/배포/운영 쓰기/UI 연결/발행/delete 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; Y-2~Y-5 결정 전 구현 0.

## 2026-08-18 — 스펙 043 Y-2~Y-5=A 구현 · CODEX_PASSED

- Founder 승인: Y-2=A/Y-3=A/Y-4=A/Y-5=A.
- 구현: 단일 app composition/auth 권위, auth-only production mode, read와 분리된 exact-true write gate,
  첫 명시 baseline load 시 rejection-safe lazy write port 생성.
- 기본 production env는 write-disabled라 editor/write controller 0. 운영 write flag 설정 0.
- 독립 보강: 합성 browser fixture가 실제 composition root를 사용하며 write factory load 전 0/후 1,
  auth-only legacy load action 0을 검증한다.
- 게이트: targeted 52/52, `pnpm check` PASS(unit 1363/1363), Chromium 139/139,
  고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  `git diff --check` PASS, 포트 4183/4184·OS temp 잔류 0.
- 구현 커밋 `41e86e1`. 실제 Firebase/network/emulator/UID/IAM/Rules·Hosting 배포/운영 쓰기/발행/
  delete는 NOT TESTED/금지. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`.

## 2026-08-18 — 스펙 044 admin write cutover 준비도 조사 · Founder 결정 대기

- 스펙 043 종료 후 다음 수동 단위 착수 승인에 따라 문서 전용 조사.
- 판정 NOT READY: 실제 UID 정본 0, G-4 비용 상한 미결정, `hosting.public: "."`로 deploy-safe admin
  artifact/route 0, 최종 Rules 선행 시 legacy 무저장 구간, actual-write 후 단순 Hosting rollback 불충분.
- 후보 C-1 최종 Rules 선행은 기각. C-2 app 선행과 C-3 transitional Rules를 비교했다.
- 권장 K-1=A/K-2=A/K-3=A. 스펙 045는 결정 전 시작하지 않는다.
- 신규 spec 044 + handoff와 상태 문서만 변경. 제품 코드·Rules/config/test/package/lockfile 0,
  실제 Firebase/network/UID/Rules·Hosting 배포/운영 write flag/운영 쓰기/발행/delete 0.

## 2026-08-18 — 스펙 045 deploy-safe Hosting layout 로컬 패키징 · CODEX_PASSED

- K-2=A 방향으로 실행별 OS temp allowlist staging을 구현했다.
- 고객 `/`, admin `/admin/`, legacy HTML 두 개의 로컬 artifact/route를 검증했다.
- targeted unit 18/18, `pnpm check` PASS(unit 1366/1366), Chromium 141/141,
  고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  `git diff --check` PASS, 포트 4183/4184/4185 및 OS temp 잔류 0.
- 구현 커밋 `c896fbe`. 실제 `firebase.json`·Rules·package/lockfile·제품 앱 코드 변경 0,
  Firebase CLI/deploy/network/UID/운영 쓰기·발행·delete 0.
- K-1 비용·용량 상한과 K-3 actual cutover 전략은 미결정이다. 다음 구현 자동 시작 0.

## 2026-08-18 — Founder K-1=A/K-3=A · 스펙 046 단계적 cutover 계약

- K-1=A 비용·용량 상한/관찰 주체 전 운영 write 차단, K-3=A transitional 방향을 정본화했다.
- Firestore transitional → Storage transitional → write-disabled app → 제한 canary → legacy close의
  비원자적 단계와 각 STOP 상태를 정의했다.
- actual-write 전/후 rollback을 분리하고, 이후 legacy fallback/write-back을 금지했다.
- 공식 Firebase CLI/Rules/Hosting 문서를 2026-08-18 확인했다. 서비스별 partial deploy는 문서화되어
  있으나 cross-service atomic deploy 보장은 확인하지 못했다.
- 남은 Founder 결정: L-1 비용·관찰, L-2 dual-window 접근, L-3 canary/close 기준(권장 모두 A).
- 문서 전용. 제품 코드·Rules/config/test/package/lockfile 및 실제 Firebase/deploy/write 변경 0.

## 2026-08-18 — 스펙 047 transitional Rules 로컬 게이트 · CODEX_PASSED

- Founder 승인: L-1 최초 canary 1회/신규 객체 1개/20 MiB 미만/Founder 즉시 확인, L-2=A, L-3=A.
- 실제 운영 파일과 분리된 synthetic transitional Storage/Firestore Rules, demo-only emulator config,
  local cutover manifest validator를 구현했다.
- manifest unit 12/12, cutover emulator 4/4, `pnpm check` PASS(unit 1378/1378), Chromium 141/141,
  고객 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  diff-check·포트/temp 잔류 0.
- 구현 커밋 `b8f1ac4`. `storage.rules`/`firestore.rules`/`firebase.json`/package/lockfile/apps 변경 0.
- 실제 UID·Firebase/network/deploy/write/legacy close 0. 다음은 일반 운영 상한과 UID 결정 대기.

## 2026-08-18 — 운영 전환 보류 · 스펙 048 legacy space crypto envelope CODEX_PASSED

- Founder가 admin write 운영 전환을 보류했다. 실제 UID/운영 한도/Rules·Hosting 배포는 계속 차단.
- `@denn/spaces`에 legacy PBKDF2 120000/SHA-256 → AES-GCM-256, salt 16 bytes, IV 12 bytes,
  standard base64 `{salt,iv,ct}` 순수 crypto port를 구현했다.
- fixed vector·한글/emoji·wrong password·tamper·malformed/hostile/circular/BigInt 검증.
- targeted 20/20, `pnpm check` PASS(unit 1396/1396), Chromium 141/141,
  고객 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  diff-check·포트/temp 잔류 0.
- 구현 커밋 `283807a`. 실제 Firestore/network/link/scene/UI/deploy 변경 0. 다음 자동 시작 0.

## 2026-08-19 — 스펙 049 space document·scene read · CODEX_PASSED

- `@denn/spaces`에 `space-v1` document와 `space-scene-v1` plaintext의 local-only 순수 reader를 구현했다.
- known field detached snapshot, unknown 추가 키 호환, malformed/hostile/circular/BigInt 안전 실패를 검증했다.
- targeted 44/44, `pnpm check` PASS(unit 1422/1422), Chromium 141/141,
  고객 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  diff-check·포트/temp 잔류 0.
- 구현·계약 커밋 `3111837`. 실제 Firestore/token/link/network/scene UI/deploy 변경 0.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 050 space local read pipeline · CODEX_PASSED

- document 검증 → password 검증 → decrypt → scene 검증 순서의 local-only 순수 open port를 구현했다.
- 단계별 실패 후 후속 호출 0, safe error, 실제 Web Crypto local roundtrip을 검증했다.
- targeted 54/54, `pnpm check` PASS(unit 1432/1432), Chromium 141/141,
  고객 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  diff-check·포트/temp/debug 잔류 0.
- 구현·계약 커밋 `cee79c8`. 실제 Firebase/Firestore/token/link/network/route/UI/deploy 변경 0.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 051 space Firestore read adapter 조사 · Founder 결정 대기

- 현재 Rules, legacy, 설치 Firebase Web SDK 12.17.1과 Firebase 공식 문서만 읽었다.
- legacy custom token 때문에 24-hex 전용 제한은 호환을 증명하지 못했다.
- 권장: Q-1=A 공식 document ID single segment, Q-2=A `getDoc` memory cache,
  Q-3=A named `denn-space-viewer`·Auth 0·local unit 범위.
- 조사 커밋 `cb97129`. 제품 코드/package/Rules/config 변경 0, 실제 Firebase/network/token/document/emulator 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; 결정 전 구현 0.

## 2026-08-19 — 스펙 051 space Firestore read adapter · CODEX_PASSED

- Founder Q-1=A/Q-2=A/Q-3=A 승인에 따라 `@denn/firebase/space-read` local adapter를 구현했다.
- 공식 document-ID validator, `getDoc`, named app 재사용/config mismatch fail-closed와 Auth 0을 고정했다.
- targeted 중 lone high-surrogate 허용 결함을 발견·보완한 뒤 30/30 PASS.
- `pnpm check` PASS(unit 1462/1462), Chromium 141/141, 고객 SHA-256
  `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`, 포트/temp 잔류 0.
- 구현 커밋 `eb7bb2b`. 실제 Firebase/project/token/document/network/route/UI/deploy 0.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 052 space link/open controller · CODEX_PASSED

- 순수 `?space=` parser와 injected Firestore reader + spaces open port controller를 구현했다.
- 비밀번호 오류 재시도는 암호문을 메모리에서 재사용하고 network retry만 재조회한다. duplicate submit,
  detach/late result, safe error와 raw token/password 비노출을 검증했다.
- targeted 17/17, 직접 `node scripts/check.mjs` PASS(unit 1479/1479), Chromium 141/141,
  고객 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`,
  `git diff --check` PASS, 포트 4183/4184/8080/9099/9199·temp/debug 잔류 0.
- `pnpm check` wrapper는 PATH pnpm 11.19의 dependency-status install 시도로 실행되지 않았다. Corepack
  pnpm 11.15.1 frozen install은 기존 build script 미승인 때문에 exit 1이었으나 resolved/reused 161,
  downloaded 0으로 node_modules를 복구했다. build 승인·workspace 설정 변경은 0이다.
- 구현·계약 커밋 `49f51fb`. 실제 Firebase/project/token/document/network/route UI/scene application/
  deploy는 NOT TESTED/금지. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 053 production space composition 조사 · Founder 결정 대기

- 현재 App은 query 분기 없이 catalog를 즉시 load하고, space controller의 React UI/env/lazy factory는 없다.
- decrypt scene ID/URL/opaque room 설정은 catalog/CORS/renderer와 아직 대조되지 않았다.
- 권장: R-1=A space 독점, R-2=A submit lazy named app, R-3=A gate-only 첫 UI,
  R-4=A 후속 catalog 검증 + view-only scene application 계약.
- 신규 spec 053 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/Rules/config 변경 0,
  실제 Firebase/network/token/document/deploy/scene 적용 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; R-1~R-4 결정 전 구현 0.

## 2026-08-19 — 스펙 053 production space composition · CODEX_PASSED

- Founder R-1=A/R-2=A/R-3=A/R-4=A 승인.
- space query 독점 mode, exact-true complete config, explicit-submit lazy named facade, password UI와
  StrictMode detach→attach generation guard를 구현했다.
- no-space만 기존 browse를 mount한다. invalid/disabled config에서 catalog/Firebase request 0.
- 자체 검수에서 retryable network 오류의 재시도 폼 누락을 발견해 보완했다.
- 기존 고객 번들 “Firebase SDK 0” 게이트는 승인된 lazy Firestore 경계에 맞춰 admin Auth/Storage API 0으로
  정밀화했다. generic Firebase app constants의 `@firebase/auth|storage` 문자열은 제품 import 근거가 아니다.
- targeted 32/32, 전체 check PASS(unit 1495/1495), Chromium 143/143, diff-check PASS,
  포트 4183/4184/8080/9099/9199·temp/debug 잔류 0.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 커밋 `5e4be63`. 실제 Firebase/project/config/token/document/network/deploy와 scene 적용 0.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 054 space scene application 경계 조사 · Founder 결정 대기

- scene은 frame-only이며 catalog exact 참조 검증기가 없다.
- legacy imgT x/y는 Canvas px, 현재는 normalized maxPan 비율이다. capture 크기가 없어 정확 변환은
  UNCONFIRMED이며 clamp/직접 복사는 안전하지 않다.
- proof URL은 `proofs/` 전용 trust가 필요하고 editable PreviewComposer는 view-only가 아니며
  room/gallery renderer는 없다.
- 권장 S-1=A V1 순수 검증기, S-2=A 필수 exact 참조, S-3=A canonical solid,
  S-4=A transform 미적용, S-5=A room/gallery unsupported.
- 신규 spec 054 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/Rules/config 0,
  실제 Firebase/network/image/UI/renderer/room/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; S-1~S-5 결정 전 구현 0.

## 2026-08-19 — 스펙 054 V1 scene reference validator · CODEX_PASSED

- Founder S-1=A/S-2=A/S-3=A/S-4=A/S-5=A 승인.
- runtime catalog/scene 재검증, exact template/visible size/compatibility, exact ID/fill 단일 solid color,
  필수 HTTPS photo 후보를 pure local 경계로 구현했다. fallback·raw ID/URL/text 출력·network 0.
- transform은 `validated-unapplied`, room/gallery는 `unsupported`, replay complete는 false다.
- targeted 19/19, 전체 check PASS(unit 1514/1514), Chromium 143/143, `git diff --check` PASS.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 커밋 `62aa9d8`. 실제 Firebase/network/image fetch/proof prefix trust/UI/renderer/room/deploy는
  NOT TESTED/NOT IMPLEMENTED. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 055 proof image·view-only plan 경계 조사 · Founder 결정 대기

- 기존 Firebase image trust는 known bucket까지만 검사하고 decoded `proofs/` prefix/query는 보지 않는다.
- current plan은 URL이 아닌 CORS-first owner의 synthetic imageRef/intrinsic size를 요구한다.
- neutral legacy transform만 current identity와 대응하며 nonzero 변환은 UNCONFIRMED다.
- 권장 T-1=A exact proof prefix, T-2=A constrained media query, T-3=A neutral-only,
  T-4=A V2-A pure unit만, T-5=A editable composer와 분리된 future view-only composition.
- 신규 spec 055 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/Rules/config 0,
  실제 Firebase/network/image/UI/renderer/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; T-1~T-5 결정 전 구현 0.

## 2026-08-19 — 스펙 055 V2-A proof URL·transform boundary · CODEX_PASSED

- Founder T-1=A/T-2=A/T-3=A/T-4=A/T-5=A 승인.
- exact Firebase host/bucket, canonical once-encoded `proofs/` object, exact media query를 pure resolver로
  검증하고 성공에만 src를 반환한다.
- exact neutral legacy transform만 current identity로 투영하며 non-neutral clamp/copy/default는 0.
- targeted 38/38, 전체 check PASS(unit 1552/1552), Chromium 143/143, `git diff --check` PASS.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 `82d89ce`. 실제 Firebase/network/object/image/CORS/owner/plan/UI/renderer/deploy는 NOT TESTED/
  NOT IMPLEMENTED. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 056 remote proof image owner 경계 조사 · Founder 결정 대기

- current plan/executor는 URL이 아닌 decoded drawable의 synthetic binding/intrinsic size를 요구한다.
- template-art owner lifecycle은 참고 가능하지만 proof trust 재검증과 intrinsic ready state가 없다.
- 권장 V-1=A dedicated owner, V-2=A 내부 trust, V-3=A CORS/one assignment/no retry,
  V-4=A one-active generation, V-5=A controller/fake unit만.
- 신규 spec 056 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/Rules/config 0,
  실제 Firebase/network/Image/UI/plan/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; V-1~V-5 결정 전 구현 0.

## 2026-08-19 — 스펙 056 remote proof image owner · CODEX_PASSED

- Founder V-1=A/V-2=A/V-3=A/V-4=A/V-5=A 승인.
- dedicated framework-free owner에 내부 URL trust, anonymous CORS-before-src, one-active generation,
  safe intrinsic/binding과 replacement/clear/dispose late-result 차단을 구현했다.
- 자체 검수에서 escaped old callback을 직접 호출하도록 late-result 테스트를 강화했다.
- targeted 13/13, 전체 check PASS(unit 1565/1565), Chromium 143/143, `git diff --check` PASS.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 `8d93f98`. 실제 Firebase/network/Image decode/CORS/hook/plan/UI/renderer/deploy는 NOT TESTED/
  NOT IMPLEMENTED. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 057 view-only frame plan composition 조사 · Founder 결정 대기

- scene refs, neutral proof transform, proof owner, geometry와 product plan 준비 상태를 확인했다.
- logical width와 nonempty text measure는 caller 주입이 필요하고 template art는 none 또는 externally ready
  stretch만 안전하다.
- clock는 frame plan 밖이므로 첫 단위는 `clockOn === false`만 허용하고 성공도 `replayComplete:false`다.
- 권장 AA-1=A pure composer, AA-2=A whole-plan fail-closed, AA-3=A width/measure 주입,
  AA-4=A clock false만, AA-5=A art none/ready stretch만.
- 신규 spec 057 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/Firebase/Rules/config 0,
  실제 network/Image/font/Canvas/React/UI/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; AA-1~AA-5 결정 전 구현 0.

## 2026-08-19 — 스펙 057 view-only frame plan composition · CODEX_PASSED

- Founder AA-1=A~AA-6=A 승인. AA-6은 stale owner binding 방지를 위한 exact source-bound resolver다.
- pure composer가 scene/catalog refs, proof URL trust, neutral transform, source readiness, geometry,
  template-art trust/readiness, clock/layout/text를 순서대로 검증한다.
- 자체 검수에서 일반 HTTPS만으로 proof resolver에 도달하던 누락을 발견해 스펙 055 proof URL trust
  재검증과 untrusted resolver 호출 0 테스트를 추가했다.
- targeted 18/18, 전체 check PASS(unit 1583/1583), Chromium 143/143, `git diff --check` PASS.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 `ad0a647`. 실제 owner adapter/network/Image/font/Canvas/React/UI/clock/room/gallery/deploy는
  NOT TESTED/NOT IMPLEMENTED. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 058 source-bound readiness adapter 조사 · Founder 결정 대기

- 기존 proof/art owner ready state만으로는 현재 source와의 동일성을 증명할 수 없음을 확인했다.
- adapter가 raw owner를 독점 소유하고 exact source + ready + binding을 모두 검사해야 stale 연결을 막는다.
- source-first replacement/clear/dispose, proof/art 독립 lifecycle, combined subscribe/composite bindings를
  첫 local 계약 후보로 정했다.
- 권장 BB-1=A~BB-5=A. 신규 spec 058 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/
  Firebase/Rules/config 0, 실제 Image/network/CORS/React/catalog/layout/font/Canvas/UI/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; BB-1~BB-5 결정 전 구현 0.

## 2026-08-19 — 스펙 058 source-bound readiness adapter · CODEX_PASSED

- Founder BB-1=A~BB-5=A 승인. adapter가 proof/art owner를 독점 소유하고 source identity를 내부에만 둔다.
- exact source + ready + owner-specific ref + positive intrinsic + binding을 모두 확인한다.
- 자체 검수에서 hostile factory를 inert fail-closed로 격리하고, replacement 직전 ref를 차단해 same-ref late
  result가 새 source로 오인되지 않도록 보완했다.
- targeted 8/8, 전체 check PASS(unit 1591/1591), Chromium 143/143, `git diff --check` PASS.
- 고객 entry `index-Det4NToI.js`, 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 `f30bc8a`. 실제 Image/network/CORS/React/post-auth catalog/layout/font/Canvas/UI/deploy는
  NOT TESTED/NOT IMPLEMENTED. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 059 post-auth view composition 조사 · Founder 결정 대기

- space route는 password 성공 뒤에도 catalog를 load하지 않아 frame plan 입력이 없음을 확인했다.
- proof/art source를 exact references/placement/projection/trust로 한 번에 결정하는 pure projector가 필요하다.
- 목표 경계는 post-auth catalog만, measured width, exact font gate, plan-ready Canvas뿐이다.
- 권장 CC-1=A~CC-5=A. 신규 spec 059 + handoff와 상태 문서만 변경. 제품 코드/test/package/lockfile/
  Firebase/Rules/config 0, 실제 network/Image/React/layout/font/Canvas/UI/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; CC-1~CC-5 결정 전 구현 0.

## 2026-08-19 — 스펙 059 frame asset request projector 완료

- Founder CC-1=A~CC-5=A 승인. pure projector/unit만 구현했다(`3c5b3ed`).
- detached catalog snapshot + exact reference + proof trust + art placement/projection/trust를 all-or-nothing으로
  고정했다. hostile getter 1회 snapshot과 safe failure/source 출력 0을 검증했다.
- targeted 11/11, check PASS(unit 1602/1602), Chromium 143/143 PASS.
- 고객 entry SHA-256 `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`
  전후 동일. 실제 network/React/layout/font/Image/Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 자동 시작 0.

## 2026-08-19 — 스펙 060 post-auth frame view composition 조사 · Founder 결정 대기

- ready-only catalog child, source-bound readiness의 StrictMode-safe owner wrapper가 필요함을 확인했다.
- measured width와 conditional exact-font gate를 분리하고 current plan success일 때만 Canvas를 mount해야 한다.
- 권장 DD-1=A~DD-5=A. 첫 구현은 injectable view + 합성 browser fixture만, production App/network 0.
- 신규 spec 060 + handoff와 상태 문서만 변경. 제품 코드/test/config/package/lockfile 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; DD-1~DD-5 결정 전 구현 0.

## 2026-08-19 — 스펙 060 post-auth frame view · CODEX_PASSED

- Founder **DD-1=A~DD-5=A** 승인. `SpacePasswordGate` ready seam은 검증된 scene만 child에 전달하고,
  production `App.tsx`는 seam을 연결하지 않아 기존 placeholder를 유지한다.
- injectable post-auth view가 post-auth catalog, all-or-nothing asset request, source-bound proof/art owner,
  content-box logical width, conditional exact-font readiness와 current plan을 단일 fail-closed 상태로 합성한다.
  current success가 아니면 Canvas는 0이며 자동 retry/fallback/이전 plan 유지도 0이다.
- 합성 fixture는 in-memory catalog/auth/open/proof drawable/font port만 사용한다. pre-auth catalog/image 0,
  외부 request 0, art-none load 0, 0px→420px 복구, exact 33.6px font shorthand, textless font bypass,
  Canvas 1과 안전한 접근성 이름을 검증했다.
- 자체 검수 보완: 첫 구현의 owned-record state initializer가 개발 StrictMode의 initializer 이중 호출에서
  effect 밖 owner를 남길 수 있음을 발견했다. inert initializer + effect-owned controller로 고치고 fixture
  React를 development로 고정해 실제 setup→cleanup→setup과 추가 unmount/remount의 create/dispose exact 일치,
  owner subscription 잔류 0을 검증했다.
- 커밋: 구현 **`6670fb3`**, StrictMode 보완 **`98f4430`**.
- 게이트: `pnpm check` PASS(unit **1608/1608**), Chromium **145/145**, `git diff --check` PASS,
  포트 4183/4184/4185 및 `denn-e2e-*` temp/debug log 잔류 0.
- 고객 entry `index-DhJYvhRi.js`, 304,713 bytes, SHA-256
  **`C724A8941A5935A685B624EB3DF4A7081EEB8778E83C92BCB8CF7073D3C6B758`**.
- production `App.tsx` 연결, 실제 Firebase/project/catalog/proof/art network와 CORS/운영 object,
  실제 다양한 폰트·viewport 시각 정확도, clock/non-neutral transform/room/gallery, 편집·인쇄·주문·발행·
  write/delete/deploy는 **NOT TESTED / NOT IMPLEMENTED / 금지**다.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`. 다음 단위 자동 시작 0.

## 2026-08-19 - 스펙 061 production frame route 연결 조사 · Founder 결정 대기

- production `SpaceRoute`의 ready child가 placeholder이며 스펙 060 frame view는 아직 mount되지 않음을 확인했다.
- 연결 뒤 password 성공 시 fixed public catalog GET과 proof/optional art browser Image read가 활성화된다.
- 권장 검증은 controller factory만 합성으로 교체하고 fixed URL을 Playwright route intercept로 응답한다.
  production root/default catalog reader/Image owner를 사용하되 실제 외부 egress는 0으로 유지한다.
- 권장 **EE-1=A~EE-5=A**. 신규 spec 061 + handoff + STATE/NEXT/CURRENT/live log만 변경했다.
- 제품 코드/test/package/lockfile/Firebase/Rules/config 변경 0, 실제 Firebase/network/CORS/운영 object/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`; 결정 전 구현 0.

## 2026-08-19 - 스펙 061 production frame route 연결 · CODEX_PASSED

- Founder **EE-1=A~EE-5=A** 승인. production `SpaceRoute` ready seam에
  `SpacePostAuthFrameView`와 production `publicCatalogReader`를 연결했다.
- production default controller는 유지하고 root에는 합성 controller factory 하나만 추가했다. 일반 browse
  route는 factory 생성 0이다.
- non-production fixture는 production root/default reader/browser Image owner를 사용한다. 모든 HTTPS를
  정규식 catch-all로 intercept하고 exact catalog/proof URL만 합성 응답해 외부 egress 0을 유지했다.
- pre-auth 요청 0, ready Canvas 1, invalid catalog의 proof/Canvas 0, unmount 뒤 late proof 차단,
  metadata/token/password/URL 비노출과 accessibility serious/critical 0을 검증했다.
- 자체 검수에서 문자열 glob catch-all이 동작하지 않아 신규 E2E 3개가 실패한 사실을 확인했다. 제품 코드는
  바꾸지 않고 정규식으로 교정했으며 최종 Chromium은 **148/148 PASS**다.
- 전체 check PASS(unit **1609/1609**, 69 files), production build PASS, `git diff --check` PASS.
- 고객 entry `index-CVr4hkHb.js`, **322,548 bytes**, SHA-256
  **`E70626F22B181C3BC5DBCE4F5B6B644E3AC026B814ECFAE3AC8D1738D9384334`**.
- 구현 커밋 **`cf13a2a`**. 실제 Firebase/project/config/network/CORS/운영 object, 실제 모바일·운영 폰트
  시각 정확도, room/gallery/clock/non-neutral transform, 편집·인쇄·주문·발행·write/delete/deploy/cutover는
  **NOT TESTED / NOT IMPLEMENTED / 금지**다.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`. 다음 단위 자동 시작 0.

## 2026-08-19 - 스펙 062 V1 방향·사진 transform 재현 조사 · Founder 결정 대기

- 다음 수동 단위로 legacy space frame transform을 읽기 전용 조사했다. UI/UX 구현은 0이다.
- V1 scene은 `frameImgT`는 저장하지만 portrait/landscape mode, capture canvas/zone/image basis와 catalog
  revision/geometry fingerprint를 저장하지 않는다.
- legacy x/y는 absolute logical Canvas px이고 current x/y는 current maxPan 기준 normalized 값이다.
- `rot=0`은 portrait와 unrotated landscape를 구분하지 못하므로 현재 identity-looking transform 성공도
  전체 frame exact replay를 증명하지 않는다.
- 권장 **FF-1=A~FF-5=A**: evidence 없는 V1 exact replay fail-closed, heuristic pan/rot 변환 0,
  future version 분리, automatic migration/same-token rewrite 0, 첫 correction은 pure classifier/plan gate/unit만.
- 제품 코드/UI/CSS/test/Rules/config/package/lockfile 변경 0. 실제 Firebase/network/운영 데이터·배포 0.
- 상태 `FOUNDER_DECISION_REQUIRED`. pure correction 이후 V2 발급·표시는 UI/UX 단계이므로 Codex가
  구현하지 않고 Founder에게 알린 뒤 Claude로 인계한다.

## 2026-08-20 - 스펙 062 V1 방향·사진 transform 재현 차단 · CODEX_PASSED

- Founder **FF-1=A~FF-5=A** 승인. evidence 없는 V1 exact replay, heuristic transform,
  automatic migration/same-token rewrite를 모두 차단했다.
- `classifySpaceV1FrameReplay()`가 V1 transform을 one-read snapshot하고 malformed,
  unsupported, orientation-unconfirmed를 safe code로 구분한다.
- frame plan은 catalog/width/proof/template-art/text-measure/Canvas plan 접근 전에 V1을 fail-closed한다.
  identity-looking transform과 centered zoom도 V1 payload만으로는 성공 plan이 아니다.
- 구현 커밋 **`a09278a`**. 허용 제품 변경은 `proof-image.ts`/test와 `frame-plan.ts`/test 네 파일뿐이다.
- 검증: targeted **59/59**, `node scripts/check.mjs` PASS(format/lint/typecheck/unit **1612/1612**/build),
  `git diff --check` PASS.
- 고객 entry `index-Df973d19.js`, 320,713 bytes, SHA-256
  **`4389D6D60367314FF80FC0793E1085C6646DAD946FA23CA2A3911013331A2453`**.
- FF-5에 따라 browser/E2E 실행·수정은 0이다. 스펙 061의 V1 Canvas 성공 E2E 기대는 현재 정책과
  양립하지 않으며 Claude UI/UX 인계에서 안전 오류 기대값으로 갱신해야 한다.
- UI/CSS/문구/V2 issuer/schema/migration, 실제 Firebase/network/운영 scene/pixel parity/write/deploy는
  NOT TESTED/NOT IMPLEMENTED 또는 금지다.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 transition은 `CLAUDE_UI_UX_HANDOFF_REQUIRED`다.
  Codex는 UI/UX 구현을 시작하지 않는다.

## 2026-08-20 - 스펙 063 V1 안전 차단 viewer UI/UX · READY_FOR_CODEX

- Founder **FF-5=A**("V1 안전 차단 이후 UI/UX는 Claude 담당")에 따라 Claude가 설계·구현했다.
  정본 `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md`, handoff
  `docs/handoff/2026-08-20-spec-063-space-v1-safe-viewer-ui-handoff.md`.
- `SpacePostAuthFrameView`가 catalog load·proof owner·Image decode·font load·Canvas plan보다 **먼저**
  V1 replay 자격을 판정한다. blocked면 그 뒤 단계가 하나도 시작되지 않는다.
- 인증 전 viewer UI·요청 0 유지. 인증 후 V1에서도 catalog/proof/art 요청 0, Canvas 0, retry 0,
  자동 fallback/merge/migration 0, 이전 성공 plan 재사용 0.
- 구조는 wrapper/child 분리다. wrapper는 `useMemo` 하나만 무조건 호출하므로 조건부 hook 호출이 없고,
  `SpaceExactFrameComposition`은 module-private라 gate를 우회하는 seam이 없다. hostile `imgT`
  accessor는 예외가 아니라 blocked로 떨어진다.
- 안전 안내(한국어)는 Modern Studio 토큰만 쓴다. 오류코드·URL·token·비밀번호·ID·SDK 문구 0,
  Canvas·이미지 placeholder 0, 재시도 버튼 0, 카카오/외부 링크 0.
  `section[aria-labelledby]` + `h2` + 본문 `role="alert"`, 자동 포커스 이동 없음, 320px 가로 overflow 0.
- 변경 파일은 허용 범위뿐이다: `SpacePostAuthFrameView.tsx`, 신규
  `space-post-auth-frame-view.css`, 신규 `SpacePostAuthFrameView.test.tsx`,
  `tests/e2e/space-production-route.spec.ts`, `tests/e2e/space-frame-view.spec.ts`(Founder Q1=A로
  허용 추가), 신규 `docs/rebuild/results/spec-063/*.png`, 문서 5종.
- 검증: targeted unit **15/15**, `node scripts/check.mjs` PASS(format/lint/typecheck/unit
  **1627/1627**/build), 전체 Chromium E2E **151 passed / 0 failed**, console error/warning 0,
  `pageerror` 0, axe serious/critical 0, 실제 외부 egress 0, `git diff --check` PASS,
  package/lockfile/Rules/firebase config diff 0, 신규 의존성 0, 포트 잔류 0.
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  **`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`**.
- **Founder Q1 = A.** `tests/e2e/space-frame-view.spec.ts` 2건은 기준 커밋 `e9dbb9e`에서 이미
  실패 상태였다(변경 전 baseline 실측 **3 failed / 145 passed**, 스펙 062의 fail-closed 결과).
  Founder가 이 spec 파일만 허용 추가하기로 결정해 안전 차단 기대값으로 갱신했다. fixture
  `apps/mockup/src/e2e/space-frame-fixture.tsx`는 변경 0이며, 그 계측으로 주입된 catalog reader·
  readiness factory·font environment 호출 0을 직접 검증한다. 도달 불가 단언의 대체 coverage는
  스펙 §7.2.
- 전체 E2E 실행이 보호 대상 `docs/rebuild/results/spec-018/*.png` 2개를 무조건 다시 쓴다.
  stage/commit/restore하지 않고 working tree에 그대로 뒀다.
- V2 schema/fingerprint/issuer, admin orientation UI, V1 migration/재발급/same-token rewrite, 실제
  Firebase/network/운영 데이터/pixel parity/write/publish/deploy/cutover는 NOT TESTED/NOT IMPLEMENTED
  또는 금지다.
- 상태 `READY_FOR_CODEX`. Codex 독립 검수 전 최종 DONE 확정 안 함. 다음 V2/admin UI 스펙 자동 시작 0.

## 2026-08-20 - 스펙 063 V1 안전 차단 viewer UI/UX · CODEX_PASSED / DONE

- 구현 검증 기준 HEAD `a28e27a`의 코드·테스트·계약 diff를 독립 검토했고 추가 결함을 찾지 못했다.
- targeted unit **15/15**, `node scripts/check.mjs` PASS(unit **1627/1627**), 변경 범위 Chromium E2E
  **8/8**, `git diff --check`를 독립 재현했다.
- Claude의 전체 Chromium **151/151** 결과와 고객 entry `index-6js4DafP.js` **322,018 bytes**,
  SHA-256 `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`를 대조했다.
- spec-063 모바일·데스크톱 PNG를 직접 확인했고 안전 차단 화면의 정보 계층·문구·wrapping에 결함을
  찾지 못했다. 보호 spec-018 PNG는 stage/commit/restore하지 않았다.
- package/lockfile/Rules/Firebase config diff 0, 포트 4183/4184/4185/8080/9099/9199와 검수 temp 잔류 0.
- 실제 Firebase/project/token/document, 운영 V1 scene, 실제 catalog/proof/CORS, 실기기·실폰트,
  V2 schema/fingerprint/issuer, admin orientation UI, migration/재발급, write/publish/deploy/cutover는
  계속 **NOT TESTED / NOT IMPLEMENTED / 금지**다.
- 스펙 063은 **DONE / CODEX_PASSED**. 다음 작업은 자동 시작하지 않고
  `WAITING_FOR_NEXT_MANUAL_TASK`에서 멈춘다.
- 종료 문서 커밋 `d55e41b`를 `rebuild/modern-studio`에 일반 fast-forward push했다.

## 2026-08-20 - 스펙 064 space V2 frame replay evidence 조사 · Founder 결정 대기

- 스펙 063 다음 수동 단위로 V2 schema/fingerprint/issuer 선행 경계를 읽기 전용 조사했다.
- orientation만으로 exactness가 성립하지 않는다. current frame plan은 logical width, effective geometry,
  proof intrinsic/bytes와 renderer contract에도 의존한다.
- whole catalog hash가 아니라 closed `FrameReplayEvidenceV1` snapshot + versioned canonical SHA-256을
  권장한다. SHA-256은 signature/operator attestation이 아니다.
- 현재 `proofs/**`는 overwrite/delete 가능하고 current `/spaces` create는 V2 operator-only가 아니다.
  새 create-only UUID PNG path와 V2 approved UID Rules는 후보일 뿐 승인·구현·배포되지 않았다.
- 권장 **GG-1=A~GG-6=A**. 첫 구현 후보는 local `@denn/spaces` V2 reader/evidence encoder/hash fake
  unit만이며 UI/Firebase/Rules/network 0이다.
- 신규 spec 064 + handoff + STATE/NEXT/CURRENT/live log 6개 문서만 변경했다. 제품 코드/test/UI/CSS/
  Rules/config/package/lockfile 변경 0. 실제 Firebase/network/data/UID/write/deploy 0.
- 상태 `FOUNDER_DECISION_REQUIRED`. 결정 전 구현 계약·제품 구현·Claude UI handoff를 시작하지 않는다.

## 2026-08-20 - 스펙 064 GG-1~GG-6=A Founder 승인 · local-only 구현 준비

- Founder가 **GG-1=A, GG-2=A, GG-3=A, GG-4=A, GG-5=A, GG-6=A**를 승인했다.
- 결정 정본
  `docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`를 추가했다.
- `space-v2`/`space-scene-v2` exact nested shape, image-only frame capability, lowercase UUID v4 PNG path,
  strict ranges/base64/20 MiB 미만 계약을 고정했다.
- arbitrary object key order 대신 fixed-position tuple의 exact UTF-8 bytes를
  `denn-frame-evidence-v1`로 고정했다. SHA-256은 signature/backend attestation이 아니다.
- 첫 제품 구현 허용 범위는 `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts` V2 explicit export뿐이다.
  strict reader, detached encoder, injected/local Web Crypto SHA-256 safe create/verify와 unit만 연다.
- GG-4/GG-5는 향후 asset/issuer Rules 목표 방향 승인이다. Rules 변경, 실제 UID, Firebase adapter,
  Storage upload, Firestore create, issuer/viewer/UI, migration, orphan cleanup, 실제 network/emulator/deploy는
  계속 금지다.
- 이번 단계는 spec 064 관련 문서 7개만 변경했다. 제품 코드/test/UI/CSS/Rules/config/package/lockfile
  변경 0이며 모든 변경은 unstaged다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`. 실제 구현 검증 전
  `CODEX_PASSED`나 V2 replay 성공을 주장하지 않는다.

## 2026-08-20 - 스펙 064 첫 local-only V2 replay evidence 구현 · READY_FOR_CODEX

- Founder **GG-1=A~GG-6=A** 범위에서 `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts`만
  제품 변경했다.
- strict exact-key V2 document/scene reader, detached one-read evidence snapshot, 정본 fixed-position tuple
  UTF-8 encoder, injected/default Web Crypto SHA-256 create/verify와 safe error를 구현했다.
- exact nested keys/ranges/orientation/uppercase colors/lowercase UUID v4 path/20 MiB 미만/base64 32 bytes,
  hostile/drifting/proxy/circular/non-finite, canonical vector/key-order/`-0`, field mutation과 digest
  throw/reject/bad-length/mismatch를 unit으로 고정했다.
- 자체 검수에서 module-scope `new TextEncoder()` 때문에 미사용 V2 export가 고객 entry를 12 bytes
  변경하는 문제를 발견했다. 호출 내부 생성으로 옮긴 뒤 고객 entry가 기준과 완전히 같아졌다.
- targeted **107/107**, `node scripts/check.mjs` PASS(format/lint/all typecheck/unit **1696/1696**/
  mockup+admin build), 전체 Chromium **151/151**, `git diff --check` PASS.
- canonical vector digest는 Web Crypto와 별도 .NET SHA-256이
  `9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=`로 일치했다.
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug log 잔류 0.
- 실제 Firebase/network/project/bucket/object/UID, Rules/config/emulator/deploy, issuer/viewer/UI,
  upload/document create, V1 migration/orphan cleanup은 NOT IMPLEMENTED / NOT TESTED / 금지다.
- 구현·계약 commit **`0c5d6fa`**. 상태 `READY_FOR_CODEX`; 기록 commit의 fast-forward push 뒤 독립
  검수를 기다린다.

## 2026-08-21 - 스펙 064 독립 검수 통과 · 수동 Claude↔Codex 교대 루프 복원

- HEAD=origin `1f60bc5`, ahead/behind 0/0에서 구현 commit `0c5d6fa`와 계약을 독립 검토했다.
- 허용 제품 diff는 `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts` 세 파일뿐이고 추가 결함 0이다.
- targeted spaces **107/107**, spaces typecheck, `node scripts/check.mjs` PASS(unit **1696/1696**), 전체
  Chromium **151/151**, `git diff --check` PASS를 독립 재현했다.
- canonical vector의 별도 .NET SHA-256은
  `9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=`로 구현·테스트와 일치했다.
- 고객 entry `index-6js4DafP.js` **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`; 스펙 063 기준과 동일하다.
- 스펙 064 두 commit의 범위 밖 제품 diff 0, staged 0, 포트 4183/4184/4185/8080/9099/9199와 test
  temp/debug 잔류 0이다. 기존 보호 대상 Founder/user working-tree 변경은 건드리지 않았다.
- 최종 판정 **CODEX_PASSED / DONE**. 실제 Firebase/network/UID/Rules/emulator/deploy와
  issuer/viewer/UI/upload/document create는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.
- 사용자의 최신 지시에 따라 임시 Codex 단독 구현 루프를 중단했다. 이후에는 **Claude Code 구현·검증
  및 live log 기록 → Codex 독립 검수·재검증 → Codex 다음 스펙/프롬프트 작성 → Claude Code가 읽고
  작업**하는 수동 교대 순서만 사용한다. 자동화·반복 작업은 만들지 않는다.
- 다음 제품 단위는 아직 선택·승인되지 않았다. 상태는 `WAITING_FOR_NEXT_MANUAL_TASK`; 새 스펙을
  추측해 시작하지 않는다.

## 2026-08-21(2) - Claude Code 인계 확인 · 활성 단위 없음(HOLD) 재검증

- `Automation/NEXT_CLAUDE_PROMPT.md`를 읽었다. 상태 `WAITING_FOR_NEXT_MANUAL_TASK`,
  active_unit `none`이므로 **구현 대상 스펙 범위가 없다**. 새 스펙을 추측해 시작하지 않았고 제품
  코드·테스트·Rules·config·package/lockfile을 한 줄도 바꾸지 않았다.
- 기록된 상태가 실제와 맞는지 로컬에서 독립 재확인했다.
  - HEAD=origin `1f60bc5`, ahead/behind **0/0**, staged **0**.
  - `node scripts/check.mjs` **PASS** (format, lint, 7개 프로젝트 typecheck, unit **1696/1696**,
    mockup+admin build).
  - `vitest run packages/spaces` **125/125** PASS (crypto 18 + index 2 + open 10 + read 26 +
    v2 **69**). 기존 문서의 `107`은 crypto를 제외한 부분집합 수치이며, 전량 실행도 모두 통과했다.
  - 고객 entry `apps/mockup/dist/assets/index-6js4DafP.js` **322,018 bytes**, SHA-256
    `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159` - 기준과 일치.
  - `git diff --check` PASS. working tree 제품 diff **0** (`packages/render/src/plan/index.ts`는
    CRLF 표시만이고 내용 변경 0).
- 전체 Chromium E2E는 재실행하지 않았다. 이번 세션의 제품 diff가 0이라 검수 통과 commit `1f60bc5`
  대비 변경 무관성이 이미 증명되며, 재실행은 보호 대상 spec-018 PNG 두 개만 다시 쓴다.
- Codex 종료 문서(STATE/NEXT/CURRENT/live log/스펙 064/decisions/handoff)만 commit·fast-forward
  push 했다. 보호 대상 spec-018 PNG 두 개와 기존 Founder/user 변경(`AGENTS.md`,
  `docs/rebuild/design/README.md`, `docs/rebuild/design/taste-v2/`,
  `docs/rebuild/specs/038-page-design-prototype.md`)은 stage/commit/restore하지 않고 그대로 뒀다.
- 상태는 계속 `WAITING_FOR_NEXT_MANUAL_TASK`다. 다음 제품 단위는 사용자의 수동 지시와 Codex의 새
  `docs/rebuild/specs/NNN-*.md`가 나온 뒤에만 시작한다.

## 2026-08-21(3) - 스펙 065 local issuer projector 계약 · READY_FOR_CLAUDE

- 사용자가 막힘·중요 결정이 없으면 수동 교대 루프의 다음 문서 단계를 자동 진행하도록 지시했다.
- 스펙 064 다음 최소 단위로 `docs/rebuild/specs/065-space-v2-local-issuer-projector.md`와 handoff를
  작성했다. 이는 기존 GG shape를 조립하는 local-only 비-UI 계약이며 새 운영 정책을 만들지 않는다.
- existing catalog frame projection + explicit orientation/logical width/appearance/transform/proof descriptor를
  strict V2 evidence/scene candidate로 조립한다. text/clock/template art와 invalid input은 digest 전에
  fail-closed한다.
- 허용 제품 변경은 신규 admin module/unit, admin의 기존 workspace `@denn/spaces` dependency와 lock
  importer 최소 변경뿐이다. `App.tsx`, UI/CSS, Firebase/Rules/config, shared/spaces 제품 파일은 금지다.
- token/encryption/upload/Firestore create/link/viewer, 실제 Firebase/network/UID/emulator/deploy는 계속
  NOT IMPLEMENTED / NOT TESTED / 금지다.
- 기준 HEAD=origin `dcd893c`, ahead/behind 0/0. 제품 코드 변경 0, 문서 변경은 unstaged다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`. Claude 완료 뒤
  `READY_FOR_CODEX`에서 멈추며 다음 스펙은 시작하지 않는다.

## 2026-08-21(4) - 스펙 065 local issuer projector 구현·검증 · READY_FOR_CODEX

- 계약 문서 commit `e9e0c6d`, 구현 commit `5fc89d2`. 기준 HEAD `dcd893c`.
- 제품 변경은 정본 §3 허용 4개뿐이다: 신규 `apps/admin/src/space-v2/issue-candidate.ts`, 신규
  `issue-candidate.test.ts`, `apps/admin/package.json`의 `@denn/spaces: workspace:*` 한 줄,
  `pnpm-lock.yaml`의 admin importer link 3줄. `App.tsx`/UI/CSS/Firebase/Rules/config와
  shared·spaces 제품 파일은 무변경이다.
- `createSpaceV2FrameIssueCandidate(input, sha256?)`는 exact-key detached snapshot으로 입력을 한 번만
  읽고, geometry는 `projectFramePreviewGeometry` 결과만 사용하며, text zone·clock·available art·
  invalid-reference art를 **digest 호출 0**으로 막는다. 성공 시
  `createFrameReplayEvidenceDigestV1`를 정확히 1회 호출하고 결과를 `readSpaceSceneV2`로 재검증한
  detached `SpaceSceneV2`를 돌려준다. 범위/형식/orientation↔aspect 판정은 스펙 064 validator에
  위임했다(규칙 이중 정의 회피).
- 오류는 `SPACE_V2_ISSUE_INVALID_INPUT`/`_CATALOG_PROJECTION_FAILED`/`_UNSUPPORTED_CAPABILITY`/
  `_DIGEST_FAILED` 4개이고 `{ok, code}` 외 필드가 없다. path/id/색상/digest/token/password/UID/email/
  raw thrown message 0을 테스트로 고정했다.
- 게이트: targeted unit **52/52**, `vitest run packages/spaces` **125/125**, admin typecheck,
  `node scripts/check.mjs` PASS(unit **1748/1748**), 전체 Chromium **151/151**, `git diff --check` PASS,
  포트 4183/4184/4185/8080/9099/9199 LISTENING 0, temp/debug 잔류 0.
- 고객(mockup) entry **불변**: `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- ★ **DEVIATION**: 정본 §5의 "admin entry name/bytes/SHA-256 동일"은 충족하지 못했다. admin entry JS는
  byte-identical(226,201)이고 baseline과의 차이는 dynamic import 문자열 `./admin-write-*.js` 한 곳뿐이며
  admin JS에 이번 module 코드·식별자·계약 문자열이 0건이다(미사용 module 미포함은 증명됨). 바뀐 것은
  Tailwind v4가 `apps/admin` 소스 텍스트를 스캔해 만든 CSS다 — evidence 계약 필드명 `transform`과
  fixture가 요구하는 `italic` 때문에 admin CSS가 9,144 → 9,821 bytes로 커지고, CSS asset 변경이 entry
  chunk hash를 바꾼다. 회피 가능한 `!transform`/`uppercase`는 제거했고, 남은 두 단어는 허용 파일
  안에서 제거할 수 없다. Tailwind/vite config는 허용 파일 밖이라 건드리지 않았다. 게이트 문구 정정
  또는 별도 스펙 중 어느 쪽을 택할지는 Codex 판단으로 남긴다.
- 부수 확인: `pnpm install`이 `pnpm-workspace.yaml`에 `allowBuilds` stub을 자동 추가해 즉시 되돌렸다
  (허용 파일 밖). lockfile 변경은 admin importer 3줄뿐이고 외부 dependency/다운로드는 0이다.
- 상태 `READY_FOR_CODEX`. 다음 스펙은 시작하지 않는다. 실제 Firebase/network/UID/Rules/emulator/deploy,
  issuer 발급/viewer/UI, upload/document create는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.

## 2026-08-21(5) - 스펙 065 Codex 검수 · CORRECTION_REQUIRED 라운드 1

- 검수 기준 HEAD=origin `4c6ebf4`, candidate `5fc89d2`, ahead/behind 0/0. 허용 제품 diff 4개는 정확하다.
- 독립 재검증: targeted 신규+spaces **177/177**, admin typecheck, `node scripts/check.mjs` PASS(unit
  **1748/1748**), 전체 Chromium **151/151**, 고객 entry
  `index-6js4DafP.js` 322,018 bytes / 기준 SHA-256 불변.
- C-1: top-level snapshot이 raw catalog 참조를 보존해 geometry와 art projector가 별도 시점에 읽는다.
  canonical `readLegacyCatalog` 1회 detached document를 공유하고 drifting art getter 회귀가 필요하다.
- C-2: admin bundle deviation은 acceptance 게이트를 약화하지 않는다. spec 021의 existing
  `@source not` 선례대로 `packages/ui/src/theme.css`에 admin non-UI `space-v2/**/*`만 exact 제외한다.
  독립 baseline build의 admin entry는 `index-D0XOQpRL.js`, 226,201 bytes, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`다.
- C-3: `git diff --check dcd893c..4c6ebf4`에서 spec 065 handoff EOF blank line 1건을 확인했다.
- 보완 허용 제품 파일은 issue-candidate 코드/unit과 `packages/ui/src/theme.css` narrow exclusion뿐이다.
  package/lockfile 추가 diff, App/UI/config/Firebase/Rules/network는 금지다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1, 다음 transition `CLAUDE_CORRECTION`. 다음 스펙은 시작하지
  않는다.

## 2026-08-21(5) - 스펙 065 보완 라운드 1 (C-1~C-3) · READY_FOR_CODEX

- 보완 commit `ec7610e`. 허용 제품 파일 3개만 바꿨다:
  `apps/admin/src/space-v2/issue-candidate.ts`, 같은 디렉터리 unit, `packages/ui/src/theme.css`.
  `apps/admin/package.json`·`pnpm-lock.yaml` 추가 diff 0, `App.tsx`/UI 디자인/Vite·Tailwind config/
  Firebase/Rules/config/shared·spaces 제품 파일 무변경.
- **C-1**: `readLegacyCatalog(issue.catalog)`를 1회 호출해 JSON-safe detached document를 만들고
  geometry·template image projector가 그 document만 쓰게 했다. 실패/throw는
  `SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED`로 매핑한다. detached clone이라 image projector가 throw할
  수 없어 기존 방어 try/catch(도달 불가)는 제거했다. drifting art getter 회귀 2건을 추가했다 —
  첫 read가 art-present면 digest 0 + unsupported, art-absent면 이후 drift와 무관하게 성공, 두 경우 모두
  raw getter read는 1회다.
- **C-2**: `packages/ui/src/theme.css`의 spec 021 mockup Canvas 선례 옆에
  `@source not "../../../apps/admin/src/space-v2/**/*";` 한 줄 + 근거 문장만 추가했다.
  `source(none)`/broad exclusion/safelist/문자열 난독화/config 변경 없음.
  → admin entry `index-D0XOQpRL.js` **226,201 bytes** SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC` **baseline 복원**,
  admin CSS `index-DJ_z3tK1.css` 9,144 bytes로 복귀(`.transform`/`.italic`/transform property scaffold
  0건), `admin-write-VpnNr13n.js`도 baseline 이름. mockup entry/CSS와 기존 Canvas exclusion 불변.
- **C-3**: handoff EOF blank line 제거로 `git diff --check dcd893c..기록 HEAD` 전체 범위 PASS.
- 재검증: targeted **54/54**, `vitest run packages/spaces` **125/125**, `node scripts/check.mjs` PASS
  (unit **1750/1750**, ui·admin typecheck 포함), 전체 Chromium **151/151**, `git diff --check` PASS,
  포트 4183/4184/4185/8080/9099/9199 LISTENING 0, temp/debug 잔류 0.
- 이전 라운드의 DEVIATION(§5 admin entry hash)은 C-2로 해소됐다. 게이트 문구는 약화하지 않았다.
- 상태 `READY_FOR_CODEX`. 다음 스펙은 시작하지 않고 자동화·반복 작업도 만들지 않았다. 실제
  Firebase/network/UID/Rules/emulator/deploy와 issuer 발급/viewer/UI/upload/document create는 계속
  NOT IMPLEMENTED / NOT TESTED / 금지다.

## 2026-08-21(6) - 스펙 065 보완 라운드 1 Codex 독립 재검수 · CODEX_PASSED / DONE

- HEAD=origin `7255012`, ahead/behind **0/0**에서 보완 commit `ec7610e`와 계약을 독립 검토했다.
- 허용 제품 diff는 `issue-candidate.ts`, 해당 unit, `packages/ui/src/theme.css` 정확히 3개다. catalog
  1회 detach/동일 snapshot, narrow Tailwind source exclusion, handoff EOF 교정이 모두 계약과 일치한다.
- 독립 게이트: targeted+spaces **179/179**, admin/ui typecheck PASS, `node scripts/check.mjs` PASS
  (unit **1750/1750**), 전체 Chromium **151/151**, `git diff --check dcd893c..HEAD` PASS.
- admin entry `index-D0XOQpRL.js` **226,201 bytes**, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`; customer entry
  `index-6js4DafP.js` **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 기준과 일치한다.
- 정정: 바로 앞 Claude 완료 항목의 admin CSS **9,144 bytes** 표기는 계수 오류다. 독립 build 실측은
  `index-DJ_z3tK1.css` **9,146 bytes**이며 `.transform`/`.italic`/rotate·skew property scaffold는 모두
  0건이다. 과거 항목은 삭제하지 않고 이 항목으로 정정한다.
- 지정 포트와 `denn-e2e-*`/debug 잔류 0, staged 0. E2E가 다시 쓴 보호 spec-018 PNG와 기존 Founder/
  user working-tree 변경은 restore/checkout/stage/commit하지 않았다.
- 추가 결함 0, 최종 판정 **CODEX_PASSED / DONE**. 실제 Firebase/network/UID/Rules/emulator/deploy와
  token/encryption/upload/document create, issuer/viewer/UI 연결은 계속 NOT IMPLEMENTED / NOT TESTED /
  금지다. 다음 활성 스펙은 없으며 `WAITING_FOR_NEXT_MANUAL_TASK`에서 멈춘다.

## 2026-08-21(7) - Claude Code 다음 지시문 기록 규칙 추가

- Founder 요청에 따라 앞으로 Codex는 독립 검수와 handoff 갱신을 끝낼 때마다
  `Automation/NEXT_CLAUDE_PROMPT.md` 상단에 Claude Code에 그대로 전달할 완성된 실행 지시문을 남긴다.
- 현재는 active_unit `none`이므로 새 스펙이나 제품 구현을 시작하지 않는 HOLD 지시문을 기록했다.
- 제품 코드/test/Rules/config/package/lockfile 변경 0, 자동화·반복 작업 생성 0, 보호 대상 조작 0이다.

## 2026-08-21(8) - 전체 리빌드 진행도 상시 보고 규칙 복원

- Founder 지적대로 직전 live log 확인 보고에서 전체 리빌드 진행도를 누락했다.
- 최종 스펙 총개수는 정본에 고정돼 있지 않으므로 `현재 스펙 번호/총 스펙`의 정확한 산술 진행률은
  확인할 수 없다. 대신 production cutover까지의 7개 작업축을 기준으로 **현재 70~75% 진행,
  25~30% 잔여**로 관리 추정한다.
- 완료·고도화: stack/scaffold/shared 기반, catalog 호환, 고객 browse/preview/render/local PNG,
  admin auth/read/edit/C5 local·emulator, local Hosting/Rules gate.
- 주요 잔여: space V2 proof 준비·token/encryption·Firebase create·viewer, Claude 담당 최종 UI/UX와
  시각/실기기/preview 검증, 실제 UID·운영 한도·Rules/Firebase·production cutover/monitoring/rollback.
- 앞으로 Claude 완료 보고와 Codex의 모든 live log 확인·검수·handoff 보고에 진행률, 잔여율, 변동
  근거를 반드시 포함한다. 새 근거 없이 수치를 올리지 않는다.
- 이 기록은 운영 규칙 문서만 바꾸며 제품 코드/test/Rules/config/package/lockfile 변경 0,
  자동화·반복 작업 생성 0, 보호 대상 조작 0이다.

## 2026-08-21(9) - Claude Code HOLD 확인 · 진행도 재확인(변동 없음)

- `Automation/NEXT_CLAUDE_PROMPT.md` 확인: 상태 `WAITING_FOR_NEXT_MANUAL_TASK`, active_unit `none`.
  구현 대상 스펙이 없어 제품 코드·테스트·Rules·config·package/lockfile을 한 줄도 바꾸지 않았고 새
  스펙을 추측해 시작하지 않았다. 자동화·반복 작업 생성 0.
- 기록 상태 재확인: HEAD=origin, ahead/behind **0/0**, working tree 제품 diff **0**.
  targeted+spaces **179/179**, `node scripts/check.mjs` PASS(unit **1750/1750**).
  admin entry `index-D0XOQpRL.js` **226,201 bytes** / SHA-256 `B6E90475…B3A1F1DC`,
  customer entry `index-6js4DafP.js` **322,018 bytes** / SHA-256 `A9360EFF…E55E8159`,
  admin CSS `index-DJ_z3tK1.css` **9,146 bytes**에 `.transform`/`.italic`/rotate·skew scaffold 0건 —
  모두 스펙 065 종료 기준과 일치한다.
- 전체 Chromium E2E는 재실행하지 않았다. 검수 통과 commit `ec7610e` 이후 제품 diff가 0이라 변경
  무관성이 이미 성립하고, 재실행은 보호 대상 spec-018 PNG 두 개만 다시 쓴다.
- **전체 리빌드 진행도: 70~75% 진행 / 25~30% 잔여 — 변동 없음.** 근거: 이번 턴에 제품 단위가
  구현되지 않아 7개 작업축 중 어느 것도 상태가 바뀌지 않았다. 수치를 올릴 새 근거가 없으므로
  이전 범위를 그대로 유지한다. 잔여의 주축은 (5) space V2 발급·viewer, (6) 최종 UI/UX·시각·실기기·
  preview 통합 검증, (7) 실제 UID·Rules/Firebase·production cutover·모니터링/롤백이다.
- 보호 대상과 기존 Founder/user working-tree 변경(`AGENTS.md`, design README, `taste-v2/`, 스펙 038,
  spec-018 PNG 2개, render CRLF 표시)은 stage/commit/restore하지 않았다.
- 상태는 계속 `WAITING_FOR_NEXT_MANUAL_TASK`다. 다음 단위는 사용자의 수동 지시와 Codex의 새
  `docs/rebuild/specs/NNN-*.md`가 나온 뒤에만 시작한다.

## 2026-08-21(10) - 스펙 066 local proof asset preparation 계약 · READY_FOR_CLAUDE

- 최신 Claude HOLD 기록과 HEAD=origin `3681cb9`, ahead/behind 0/0, staged 0을 확인했다.
- 다음 최소 비-UI 단위로 `docs/rebuild/specs/066-space-v2-local-proof-asset-preparation.md`와 handoff를
  작성했다. GG-4=A의 approved path/PNG/digest shape를 local immutable snapshot 경계로만 구체화한다.
- caller PNG bytes 1회 copy → lowercase UUID v4 path → PNG signature/첫 IHDR dimensions → exact bytes
  SHA-256 descriptor → fresh upload-byte copies를 한 경계로 묶는다. full PNG decode/CRC/IDAT/IEND 성공은
  주장하지 않는다.
- 허용 제품 파일은 신규 admin non-UI module/unit 2개뿐이다. App/UI/CSS/package/lockfile/Firebase/
  Rules/config, 실제 network/upload/token/encryption/Firestore create/viewer/deploy는 계속 0이다.
- **전체 리빌드 진행도 70~75% / 잔여 25~30%, 변동 없음.** 계약 문서만 준비해 제품 작업축은 아직
  이동하지 않았다. Claude 구현 완료 후 검수 통과 시에만 변동 근거를 다시 평가한다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`. NEXT 상단에 Claude Code에 그대로
  전달할 완성된 실행 문구를 남겼다. 자동화·반복 작업 생성 0, 보호 대상 조작 0이다.

## 2026-08-21(10) - 스펙 066 local proof asset preparation 구현·검증 · READY_FOR_CODEX

- 계약 문서 commit `1ede90c`, 구현 commit `9fee315`. 기준 HEAD `3681cb9`.
- 제품 변경은 정본 §3 허용 2개 신규 파일뿐이다:
  `apps/admin/src/space-v2/proof-asset-candidate.ts`와 같은 디렉터리 unit.
  package/lockfile/Rules/firebase config/`App.tsx`/UI·CSS/shared·spaces·firebase 제품 파일 diff **0**.
- `prepareSpaceV2ProofAssetCandidate(input, sha256)`는 caller의 `Uint8Array`를 **await 전에** 한 번
  복사하고, lowercase UUID v4에서 `rebuild-space-assets/objects/{assetId}.png`를 만들며, PNG
  signature·첫 chunk length(13)·`IHDR`·IHDR width/height만 확인한 뒤 그 snapshot의 SHA-256으로 스펙
  064 `proofAsset` descriptor를 만든다. digest port에는 보존 snapshot이 아니라 별도 복사본을 넘기고,
  `copyUploadBytes()`는 호출마다 새 복사본을 준다. UUID/random/Date/network/Firebase/DOM/Canvas 사용 0,
  SHA-256 port는 필수 주입이다.
- ★ **범위 한계(숨기지 않음)**: 이 단위는 PNG decoder가 아니다. CRC/chunk sequence/IDAT/IEND/browser
  decode 성공은 **NOT TESTED**이며 성공의 의미는 "V2 descriptor를 만들 수 있는 PNG-header candidate"다.
  실제 decode·pixel 검증은 후속 asset/viewer 단계에서 별도로 fail-closed해야 한다. 이 문장을 모듈과
  unit 상단 주석에도 그대로 적었다.
- 오류는 `SPACE_V2_PROOF_INVALID_INPUT`/`_INVALID_PNG`/`_TOO_LARGE`/`_DIGEST_FAILED` 4개이고 실패
  결과는 `{ok, code}`만 가진다. bytes/UUID/path/digest/PNG header 값/token/password/UID/email/thrown
  message 0을 테스트로 고정했다.
- 게이트: 신규 targeted **55/55**, space-v2+spaces **234/234**, admin typecheck,
  `node scripts/check.mjs` PASS(unit **1805/1805**), 전체 Chromium **151/151**, `git diff --check` PASS,
  포트 4183/4184/4185/8080/9099/9199 LISTENING 0, temp/debug 잔류 0.
- bundle identity 유지: 고객 `index-6js4DafP.js` **322,018 bytes**/`A9360EFF…E55E8159`, admin
  `index-D0XOQpRL.js` **226,201 bytes**/`B6E90475…B3A1F1DC`, admin CSS `index-DJ_z3tK1.css`
  **9,146 bytes**(unwanted utility 0건). 두 bundle에 spec 066 식별자·경로 문자열 0건이다.
- mutation 확인: snapshot 복사 제거 시 "caller buffer 사후 변형" 테스트, digest 전용 복사본 제거 시
  "port 인자 변형" 테스트가 각각 실패한다(거짓 통과 아님). SHA-256 fixed vector는 `node:crypto`로
  독립 계산한 `qnSaWoyx47Xk9xTr2cXmRtN0swaEGgU6OmLPO5gnxIs=`이며 주입 Web Crypto port와 일치했다.
- **전체 리빌드 진행도: 72~76% 진행 / 24~28% 잔여.** 이전 70~75%에서 하단 경계가 소폭 올랐다.
  근거: 작업축 5(space 링크)의 잔여 중 'V2 발급'에 필요한 byte-identity 경계(proof descriptor ↔ upload
  bytes)가 local-only로 확정돼 하위 작업 하나가 실제로 닫혔다. 다만 upload/Firestore create/token
  발급/viewer는 그대로 열려 있고 작업축 6·7은 전혀 움직이지 않았으므로 상단 경계는 올리지 않았다.
- 상태 `READY_FOR_CODEX`. 다음 스펙은 시작하지 않고 자동화·반복 작업도 만들지 않았다. 보호 대상과
  기존 Founder/user working-tree 변경은 stage/commit/restore하지 않았다.

## 2026-08-21(11) - 스펙 066 Codex 독립 검수 · CODEX_PASSED / DONE

- HEAD=origin `e4bcce9`, ahead/behind 0/0에서 계약 `1ede90c`, 구현 `9fee315`와 제품 diff를 독립 검토했다.
  허용 제품 경로는 신규 proof candidate module/unit 정확히 2개다.
- bytes first-await snapshot, digest 전용 복사본, fresh upload copies, UUID v4 path, PNG header/IHDR
  dimension과 SHA-256 descriptor, safe error mapping은 계약과 일치한다. 추가 결함 0.
- 독립 게이트: space-v2+spaces **234/234**, admin typecheck, `node scripts/check.mjs` PASS(unit
  **1805/1805**), 전체 Chromium **151/151**, `git diff --check 3681cb9..HEAD` PASS.
- bundle identity: admin `index-D0XOQpRL.js` 226,201 bytes / `B6E90475…B3A1F1DC`, customer
  `index-6js4DafP.js` 322,018 bytes / `A9360EFF…E55E8159`, admin CSS `index-DJ_z3tK1.css` 9,146 bytes,
  신규 식별자와 unwanted utility 0. 지정 포트/temp/debug 잔류 0.
- full PNG CRC/chunk/IDAT/IEND/browser decode와 실제 upload/Firebase/token/document create/viewer/UI는
  계속 NOT TESTED / NOT IMPLEMENTED다. 최종 판정 **CODEX_PASSED / DONE**.
- 진행도 정정: 이전 항목의 **72~76% / 24~28%**는 “상단은 유지”라는 근거와 모순됐다. 기존 상단
  75%를 유지한 **72~75% 완료 / 25~28% 잔여**가 정본이다.

## 2026-08-21(11) - 스펙 067 local V2 document encryption candidate 계약 · READY_FOR_CLAUDE

- 정본 `docs/rebuild/specs/067-space-v2-local-document-encryption-candidate.md`와 handoff를 작성했다.
- strict `SpaceSceneV2` detached snapshot의 evidence digest를 기존 verifier와 주입 SHA-256 port로 확인한
  뒤 `SpaceCryptoPort.encryptJson`으로 한 번 암호화하고 exact `SpaceDocumentV2` outer를 다시 fail-closed
  검증하는 local-only 비-UI 경계다.
- 허용 제품 파일은 신규 admin module/unit 2개뿐이다. package/lockfile/CSS/config/Firebase/Rules 변경과
  token/UUID 생성, upload, Firestore create, 실제 network/UID/emulator/deploy, issuer/viewer/UI는 0이다.
- 전체 리빌드 진행도는 **72~75% 완료 / 25~28% 잔여, 변동 없음**. 계약 문서만 준비했으므로 제품
  작업축은 추가로 이동하지 않았다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`. NEXT 상단에 Claude Code 전달용
  완성 지시문을 남겼다. 자동화·반복 작업 생성 0, 보호 대상 조작 0이다.

## 2026-08-21(11) - 스펙 067 local document encryption candidate 구현·검증 · READY_FOR_CODEX

- 계약 문서 commit `2107a72`, 구현 commit `35b7ffd`. 기준 HEAD=origin `e4bcce9`.
- 제품 변경은 §3 허용 2개 신규 파일뿐이다:
  `apps/admin/src/space-v2/document-encryption-candidate.ts`와 같은 디렉터리 unit.
  package/lockfile/CSS/Rules/firebase config/`App.tsx`/route/UI와 shared·spaces·firebase 제품 파일
  diff **0**.
- `createSpaceV2DocumentEncryptionCandidate(input, crypto, sha256)`는 exact key 2개 input을 받아
  password를 await 전에 한 번 스냅샷하고, `readSpaceSceneV2`로 detached scene을 얻은 뒤
  **암호화 전에** `verifyFrameReplayEvidenceDigestV1`로 evidence↔digest 실제 일치를 검증한다.
  reader는 digest 형식만 보기 때문이다. 그 다음 `crypto.encryptJson(detachedScene, password)`를
  정확히 1회 호출하고, `{schema:"space-v2", enc}`를 `readSpaceDocumentV2`로 다시 검증한 detached
  값을 반환한다. SHA-256 1회 / encryptJson 1회 / decryptJson 0회 / 앱 수준 retry 0.
- PBKDF2 120,000·SHA-256·AES-GCM-256·16B salt·12B IV 계약은 재구현하지 않고 `@denn/spaces`를 그대로
  쓴다. password는 기존 non-empty string 계약만 재사용했고 trim/길이/문자 정책을 새로 만들지 않았다.
- 오류 4개(`INVALID_INPUT`/`EVIDENCE_NOT_VERIFIED`/`ENCRYPT_FAILED`/`INVALID_OUTPUT`), 실패 결과는
  `{ok, code}`뿐이다. password·scene·proof path·digest·ciphertext·token·UID/email·thrown message가
  0임을 테스트로 고정했고, 성공 outer에도 token/owner/UID/createdAt/asset path가 없다.
- 게이트: targeted **54/54**, space-v2+spaces **288/288**, admin typecheck,
  `node scripts/check.mjs` PASS(unit **1859/1859**), 전체 Chromium **151/151**, `git diff --check` PASS,
  포트 4183/4184/4185/8080/9099/9199 LISTENING 0, temp/debug 잔류 0.
- bundle identity 유지: 고객 `index-6js4DafP.js` **322,018 bytes**/`A9360EFF…E55E8159`, admin
  `index-D0XOQpRL.js` **226,201 bytes**/`B6E90475…B3A1F1DC`, admin CSS **9,146 bytes**(unwanted 0).
  두 bundle에 spec 067 식별자 0건이다.
- 로컬 roundtrip: 실제 `createSpaceCrypto()`로 암호화→복호화한 scene이 원 canonical scene과 동일하고,
  틀린 password는 `SPACE_DECRYPT_FAILED`다. network/Firebase 호출 0.
- mutation 확인: evidence 검증 제거 시 8건, raw caller scene 암호화 시 1건이 실패한다(거짓 통과 아님).
- **전체 리빌드 진행도: 74~77% 진행 / 23~26% 잔여.** 직전 정본 72~75%에서 약 +2%p.
  근거: 작업축 5(space 링크)의 잔여 중 'V2 문서 암호화 조립'이 local-only로 닫혀,
  scene→evidence→proof descriptor→**암호화 outer 문서**까지 로컬 사슬이 이어졌다. 남은 것은 token
  발급·Storage upload·Firestore create·viewer/UI 연결이다. 작업축 6·7은 이번에도 전혀 움직이지
  않았으므로 상단은 77%를 넘기지 않았다.
- 상태 `READY_FOR_CODEX`. 다음 스펙은 시작하지 않고 자동화·반복 작업도 만들지 않았다. 보호 대상과
  기존 Founder/user working-tree 변경은 stage/commit/restore하지 않았다.

## 2026-08-21(12) - 스펙 067 Codex 독립 검수 · CORRECTION_REQUIRED 라운드 1

- HEAD=origin `ab465d5`, ahead/behind 0/0에서 candidate `35b7ffd`와 허용 제품 diff 2개를 검토했다.
- 독립 게이트: unit **1859/1859**, `node scripts/check.mjs` PASS, Chromium **151/151**,
  `git diff --check e4bcce9..HEAD`, bundle identity, 신규 식별자/unwanted CSS 0, 지정 포트/temp 0.
- **C-1:** 런타임 `sha256 === undefined`가 `verifyFrameReplayEvidenceDigestV1`의 default
  `webCryptoSha256Port`를 활성화한다. 필수 주입과 module global crypto 0 계약이 우회되며 현재 boundary
  test는 valid fake만 전달해 이 경로를 잡지 못한다.
- 보완은 허용 제품 파일 2개뿐이다. SHA/crypto method를 첫 await 전에 각 1회 snapshot·검증하고,
  always-defined SHA adapter로 verifier default를 닫는다. malformed/revoked/throwing ports, getter
  one-read와 global digest 0 회귀를 추가한다.
- 상태 **CORRECTION_REQUIRED**, fix round 1, 다음 transition `CLAUDE_CORRECTION`. 다음 스펙은 시작하지
  않는다.
- 전체 리빌드 진행도는 **72~75% 완료 / 25~28% 잔여**를 유지한다. 최초 candidate의 74~77% 상승은
  CODEX_PASSED 뒤 다시 평가한다. 자동화·반복 작업 생성 0, 보호 대상 조작 0이다.

## 2026-08-21(12) - 스펙 067 보완 라운드 1 (C-1) · READY_FOR_CODEX

- 보완 commit `db61c7d`(지시 기록 commit `342e890`). 허용 제품 파일 2개만 바꿨고 호출 순서·오류 4개·
  금지 경계는 그대로다. package/lockfile/CSS/Rules/config/`App.tsx`/UI diff 0.
- **C-1 원인**: `sha256`을 검증 없이 `verifyFrameReplayEvidenceDigestV1`에 넘기면, 그 인자의 default
  `webCryptoSha256Port` 때문에 `undefined` 주입이 거부되지 않고 `globalThis.crypto.subtle.digest`가
  실행된다(필수 주입/global crypto 0 계약 위반). 기존 boundary 테스트는 유효 fake만 넘겨 이 경로를
  밟지 않았다.
- 보완: `sha256.digest`와 `crypto.encryptJson`을 각자 첫 await 전에 한 번씩만 읽어 callable 검증하고,
  SHA는 **항상-defined adapter**로 감싸 verifier default를 닫았다. 두 호출 모두 `.call(port, …)`로
  원 port의 `this`를 보존하므로 class 기반 method-style port도 그대로 동작한다. crypto도 snapshot한
  callable만 정확히 1회 호출해 method getter drift를 차단했다.
- 매핑: invalid SHA port → `EVIDENCE_NOT_VERIFIED`, invalid crypto port → `ENCRYPT_FAILED`,
  raw message 0.
- 회귀 17건 추가: malformed SHA port 7종에서 **global digest 0 + encryption 0**, malformed crypto port
  7종, method getter one-read 2건, method-style port receiver 보존 1건.
- 재검증: targeted **71/71**, space-v2 **180/180**, space-v2+spaces **305/305**, admin typecheck,
  `node scripts/check.mjs` PASS(unit **1876/1876**), 전체 Chromium **151/151**, `git diff --check` PASS,
  포트/temp 잔류 0. bundle identity(admin 226,201 / CSS 9,146 / 고객 322,018)와 bundle 내 spec 067
  식별자 0건도 그대로다.
- mutation 확인: adapter를 빼고 raw `sha256`을 넘기면 "undefined SHA port"와 "SHA method one-read"
  회귀 2건이 실패한다(거짓 통과 아님).
- ⚠ 관측 기록: 보완 직후 **첫** 단일 파일 실행 1회가 transform 31.8s/import 34.6s로 정체돼 테스트
  1건이 5s timeout으로 실패했다. 코드 변경 없이 단일 3회·확대 2회 재실행 모두 PASS(0.77~3.6s)였고
  전체 check/Chromium도 PASS다. 파일 기록 직후 로컬 I/O 정체로 판단하며 재발 시 flaky 게이트로
  즉시 보고한다.
- **전체 리빌드 진행도: 74~77% 진행 / 23~26% 잔여 — 변동 없음.** 근거: 이번 보완은 스펙 067의 기존
  범위 안 결함 수정이고 새 제품 능력을 열지 않았다(작업축 5의 암호화 조립은 이미 067 구현에서 반영).
  작업축 6·7도 불변이다.
- 상태 `READY_FOR_CODEX`. 다음 스펙은 시작하지 않고 자동화·반복 작업도 만들지 않았다. 보호 대상과
  기존 Founder/user working-tree 변경은 stage/commit/restore하지 않았다.
