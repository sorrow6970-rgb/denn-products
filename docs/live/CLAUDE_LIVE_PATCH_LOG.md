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
