# 스펙 082 shared Canvas plan executor boundary handoff

- 상태: `READY_FOR_CODEX / CORRECTION ROUND 2 DONE / NN-2=A / NON_UI / NO_LIVE_NETWORK / E2E 160-0` (보완 2026-08-27)
- 구현: 계약 문서 commit `aa7e048`, 제품 commit `307521f`
- 선행: spec 081 `DONE / CODEX_PASSED`
- spec: `docs/rebuild/specs/082-shared-canvas-plan-executor-boundary.md`
- 다음 transition: `CLAUDE_SPEC_082_IMPLEMENTATION`

## 목적

실제 admin Space V2 issue UI 전에, 고객 앱 내부에 있는 React 비의존 Canvas plan executor를
`@denn/render`의 단일 구현으로 옮긴다. mockup에는 thin re-export만 남겨 기존 caller와 검증을 유지한다.
admin UI, proof exporter, SDK composition은 이번 단위에 없다.

## 핵심 경계

- executor 의미·오류·preflight·save/restore·rotation/text 동작 변경 0
- cross-app import와 구현 복제 0
- `packages/render/src/plan/index.ts` 보호 파일 수정 0
- package/lockfile/Rules/firebase config 변경 0
- 실제 Firebase/network/live/deploy 0
- 전체 Chromium E2E는 local fixture만 사용

## 진행도

전체 리빌드 **84~87% 완료 / 13~16% 잔여**. 구조 선행 작업이므로 완료율은 올리지 않는다.

## 구현 결과 (2026-08-27, Claude Code)

계약 범위만 구현했다. 조항별 대조와 실측표는 스펙 082의 `### DONE (Claude) — 2026-08-27`이 정본이다.

- 신규 `packages/render/src/canvas/{types.ts, execute-preview-plan.ts, index.ts}` + `render/src/index.ts`
  export, `apps/mockup/src/canvas/{types.ts, executePreviewPlan.ts}`는 thin re-export, executor test는
  최소 변경 — 총 7개 파일뿐이다.
- executor 의미·오류·preflight·save/restore·rotation/text 동작 변경 **0**, cross-app import와 구현
  복제 **0**(테스트가 `toBe`로 같은 참조임을 고정), 보호 파일 `render/src/plan/index.ts` 수정 **0**,
  package/lockfile/Rules/firebase config 변경 **0**, 실제 Firebase/network/live/deploy **0**.
- **Tailwind drift 0** → `packages/ui/src/theme.css` 손대지 않음. bundle 변화는 mockup entry 하나
  (+5 bytes)이고 통제 빌드 대조로 minified 식별자 재배치임을 확인했다. admin 전체·CSS 2개는
  byte-identical이다.
- targeted executor **87/87**, typecheck 3개 PASS, 전체 `node scripts/check.mjs` PASS
  (unit **2409/2409**), `git diff --check` PASS, forbidden diff 0, EOL 3/3, 포트·temp 잔류 0.
- **전체 Chromium E2E는 158 passed / 1 failed다.** 실패는 스펙 082 원인이 아니며(HEAD로 되돌려도 동일
  재현) firebase/storage vendor chunk의 `_getAuthToken`이 마커 `getAuth`에 부분 일치한 것이다. 수정은
  스펙 082 허용 범위 밖이라 기록만 했고 **"전체 E2E PASS"라고 기록하지 않는다.**
- 실제 admin issue UI가 구현됐다고 기록하지 않는다. 다음은 Codex 검수(`CODEX_SPEC_082_REVIEW`)다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.

## Codex 라운드 2 재검수 · correction 3/3 (2026-08-27)

- 독립 전체 check unit **2409/2409**, Chromium **160/160** PASS 재현.
- forbidden detector가 direct `name(`만 찾아 alias import/property extraction/bracket access를 놓치며,
  Firestore-only 제목과 SDK trace 0 설명도 stale이다.
- 같은 `admin-auth-read.spec.ts` 한 파일에서 reference-level 검사·import allowlist·exact proof adapter
  positive와 문구를 보완한다. 상태 `READY_FOR_CLAUDE`, final correction round `3/3`.

## Codex 보완 라운드 1 재검수 · NN-2 대기 (2026-08-27)

- `HEAD=origin=3600198`, ahead/behind 0/0. NN-1 두 파일 diff 적합, 전체 check unit **2409/2409** PASS.
- 전체 Chromium **158/159**, 실패 `uploadBytes` 동일 재현. Storage vendor dead export/오류 라벨과
  승인된 production `getStorage` 호출이 스펙 036-era raw bundle 금지 검사에 걸린다.
- Founder NN-2: A(권장: app-owned read-only 호출 경계로 test-only 정정), B 제품 bundling 재설계,
  C E2E 예외. 상태 `FOUNDER_DECISION_REQUIRED`; 다음 UI/스펙은 시작하지 않는다.

## Founder NN-2=A 승인 (2026-08-27)

- correction round 2 허용 제품 파일은 `tests/e2e/admin-auth-read.spec.ts` 하나뿐이다.
- 승인된 read-only Storage 제품 연결은 유지하고 app-owned 호출 표면을 검사하도록 test-only 정정한다.
- 상태 `READY_FOR_CLAUDE`, next `CLAUDE_CORRECTION`. admin UI와 다음 스펙은 시작하지 않는다.

## Codex 독립 검수 (2026-08-27)

- `HEAD=origin=f8bb8e3`, ahead/behind 0/0. targeted executor **87/87**, 전체 check unit
  **2409/2409**, build 2개, diff/port gate PASS.
- 전체 Chromium은 **158/159**로 동일 재현. `getAuth` raw substring이 Storage vendor의
  `_getAuthToken`을 오인했으며 스펙 082 제품 회귀는 아니다. 다만 전체 E2E PASS도 아니다.
- `packages/render/src/index.ts`의 `RENDER_NOT_IMPLEMENTED`가 실제 Canvas executor export와 모순되는
  stale 문구도 확인했다.
- 최소 보완은 원래 허용 밖 test 파일을 필요로 해 Founder **NN-1** 범위 선택 대기다. 상태
  `FOUNDER_DECISION_REQUIRED`; correction과 admin UI/다음 스펙은 시작하지 않는다.

## Founder NN-1=A 승인 (2026-08-27)

- exact scope 확장 승인: `tests/e2e/admin-auth-read.spec.ts`, `packages/render/src/index.ts` 두 파일뿐이다.
- correction round 1에서 Storage `_getAuthToken` 오탐과 stale constant만 정정한다.
- 상태 `READY_FOR_CLAUDE`, next `CLAUDE_CORRECTION`. UI와 다음 스펙은 시작하지 않는다.

## 보완 라운드 1 — Founder NN-1=A (2026-08-27, Claude Code)

허용된 정확히 두 파일만 고쳤다. 상세 근거와 실측표는 스펙 082의
`### DONE (Claude) — 보완 라운드 1 (2026-08-27)`이 정본이다. 검수·NN-1 문서 commit `ecc9720`,
보완 commit `8d4458d`.

- **`tests/e2e/admin-auth-read.spec.ts`** — `getAuth`를 raw substring이 아니라 전체 식별자로 본다.
  079/080이 승인한 lazy `firebase/storage` 때문에 Storage SDK 내부 `_getAuthToken`이 걸린 오탐이었다.
  고객 staging 자산 raw 3 → 식별자 매치 **0**, 실제로 Auth를 쓰는 admin 번들 raw 9 → 매치 **6**으로
  실제 사용은 계속 전부 차단된다. 테스트 삭제·경계 약화 없음.
- **`packages/render/src/index.ts`** — `RENDER_NOT_IMPLEMENTED`가 같은 파일이 export하는 Canvas
  executor를 "이후 구현"이라 말하던 모순을 고쳐, 남은 미구현인 generic `RenderInput -> RenderOutput`
  facade만 가리키게 했다.
- 전체 `node scripts/check.mjs` PASS(unit **2409/2409**), **build 산출물 14개 모두 보완 전과
  byte+SHA-256 동일**, `git diff --check` PASS, 허용 외 diff 0, EOL clean, 포트·temp 잔류 0.
- **전체 Chromium E2E는 158 passed / 1 failed로 159/159가 아니다.** `getAuth`는 통과하고, 가려져 있던
  `uploadBytes` 등 6개 마커가 드러났다 — 5건은 storage vendor chunk의 dead export/오류 라벨 오탐,
  1건 `getStorage`는 스펙 079(MM-1=A)가 승인한 고객 자신의 호출이다. NN-1=A 범위 밖이라 고치지 않고
  기록만 했다.
- 다음은 Codex 재검수(`CODEX_SPEC_082_REVIEW`)다. 실제 admin issue UI와 다음 스펙은 시작하지 않았다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.

## 보완 라운드 2 — Founder NN-2=A (2026-08-27, Claude Code)

허용된 제품 파일 한 개(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드는 무변경이다. 상세
근거와 실측표는 스펙 082의 `### DONE (Claude) — 보완 라운드 2 (2026-08-27)`이 정본이다. 재검수·NN-2
문서 commit `60507b3`, 보완 commit `65c5b46`.

- **전체 Chromium E2E 160 passed / 0 failed** (기존 159 + 신규 call-surface 테스트 1). 158/1 해소.
- 번들 전체 substring 검사가 vendor export 맵과 `_throwIfRoot()` 라벨을 고객 호출로 오인하던 것을
  걷어내고, 고객의 **자기 소유 production source**(`apps/mockup/src` + 유일하게 import하는
  `space-read`, 58파일)를 검사하도록 바꿨다 — write/admin subpath import 0, 쓰기·열거·다운로드 API
  호출 0, 승인된 `getStorage`/`ref`/`getMetadata`/`getBytes` 호출은 실제로 존재.
- 같은 검사를 admin write surface에 겨누면 `uploadBytes`가 FAIL로 잡힌다(이빨 확인). Storage vendor
  chunk의 `.이름(` 호출 형태는 0이다. 테스트 삭제·E2E 예외 없이 경계는 오히려 강해졌다.
- targeted `admin-auth-read` **4/4**, 전체 `node scripts/check.mjs` PASS(unit **2409/2409**),
  **build 산출물 14개 byte+SHA-256 무변경**, `git diff --check` PASS, 변경 한 파일뿐, EOL clean,
  포트·temp 잔류 0.
- 다음은 Codex 재검수(`CODEX_SPEC_082_REVIEW`)다. 실제 admin issue UI와 다음 스펙은 시작하지 않았다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.

## 보완 라운드 3 — 최종 3/3 (2026-08-27, Claude Code)

- 기준 `HEAD=origin=298c224`, ahead/behind 0/0. Codex 재검수 문서 commit `298c224`, 보완 commit
  `68bd25c`. 허용된 **제품 파일 한 개**(`tests/e2e/admin-auth-read.spec.ts`)만 고쳤고 제품 코드와
  승인된 read-only Storage 연결은 한 줄도 바꾸지 않았다.
- **전체 Chromium E2E 161 passed / 0 failed** — 라운드 2의 160 + 신규 detector self-check 1.
- **결함.** 라운드 2 guard는 `\bname\s*\(` 직접 호출만 잡아 같은 API에 도달하는 세 경로를 통과시켰다:
  `import { uploadBytes as u } from "firebase/storage"; u()` / `const u = storage.uploadBytes; u()` /
  `storage["uploadBytes"]`.
- **보완.** 주석 제거된 app-owned production source에서 금지 10종(`uploadBytes`·
  `uploadBytesResumable`·`uploadString`·`updateMetadata`·`deleteObject`·`list`·`listAll`·
  `getDownloadURL`·`getBlob`·`getStream`)의 **reference 자체**를 ① bare whole identifier ②
  `.name` property ③ `["name"]` bracket 세 형태로 금지한다. 실측: 금지 10종 property 0 · bracket 0,
  bare identifier는 `list` 외 9종 0.
- **`list` 면제.** 지역 변수 `list`와 `data-testid="template-list"`가 일반 영어로 충돌해 `list`에만
  bare 형태를 적용하지 않고, 이유를 검사 지점 주석에 적었다. 고객 앱이 `firebase/*`를 직접 import하지
  않음을 같은 테스트가 단언하므로 Storage `list`는 namespace property로만 도달 가능하고 property·
  bracket 형태가 커버한다 — **잃는 커버리지는 없다**.
- **detector self-check(신규 테스트).** alias import·property extraction·bracket property·직접 호출은
  **잡히고**, `storage.list`/`storage["list"]`는 잡히되 `const list = categories; list.some(...)`는
  **안 잡히며**, 줄/블록 주석 속 이름은 **무시**됨을 같은 파일에서 증명한다.
- **검사 source·import 경계.** `apps/mockup/src`(unit test·`e2e/` 제외) + `packages/firebase/src/index.ts`
  + `public-catalog` + `public-images` + `space-read` production = **66파일**. `apps/mockup` production
  import specifier는 `@denn/firebase` 루트와 `@denn/firebase/space-read`만 허용하고 `firebase/*` 직접
  import는 실패한다.
- **승인 positive 고정.** read 경계 확인을 `packages/firebase/src/space-read/proof-sdk-facade.ts`의 exact
  call(`storage.getStorage(`·`storage.ref(`·`storage.getMetadata(`·`storage.getBytes(`)로 못박아, 동명
  함수가 대신 만족시켜 실제 Storage 호출이 감시 밖으로 나가는 일을 막는다.
- **문구 정정.** bundle 테스트 제목을 `the customer bundle carries no Auth product API and no private
  admin path`로 바꾸고 파일 상단 설명도 승인 현실(Firestore read + Storage read, Auth 0, admin private
  path 0, 쓰기·삭제·열거·download URL 0)로 맞췄다. Auth whole-identifier·admin private path·runtime
  external request 0 단언은 유지했고 테스트 삭제·skip·E2E 예외는 없다.
- **실측.** targeted `admin-auth-read` Chromium **5/5**, **전체 Chromium 161/161**, 전체
  `node scripts/check.mjs` **PASS**(format·lint·typecheck 7개·unit **2409/2409**·build 2개),
  **build 산출물 14개 byte+SHA-256 동일**, `git diff --check` PASS, 변경 경로 한 파일뿐, EOL
  `i/lf w/lf`, 포트 4183/4184/4185/8080/9099/9199 · `test-results`/temp 잔류 0.
- 보호 spec-018 PNG 2개는 dirty 그대로 두고 stage/commit/restore하지 않았다.
- 상태 `READY_FOR_CODEX`, next `CODEX_SPEC_082_REVIEW`. 실제 admin issue UI와 다음 스펙, 자동화는
  시작하지 않았다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.
