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
