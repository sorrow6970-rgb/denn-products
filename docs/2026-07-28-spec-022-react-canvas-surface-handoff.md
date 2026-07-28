# 2026-07-28 — 스펙 022 React Canvas surface·DPR·생명주기 핸드오프

정본 스펙: `docs/rebuild/specs/022-react-canvas-surface-lifecycle.md` (DONE는 스펙 하단)
코드/test 커밋: `d03cf20` · 문서 커밋: 별도

## 한 줄

호출자가 만든 `PreviewRenderPlan` + 메모리 drawable binding을 받아 **실제 `<canvas>`/`CanvasRenderingContext2D`에서 스펙 021 executor를 실행하는 재사용 surface**를 만들었다. 상품 plan projection·가짜 상품 Canvas는 만들지 않았고, 고객 탐색 화면에는 연결하지 않았다.

## 파일

| 경로 | 역할 |
| --- | --- |
| `apps/mockup/src/canvas/surface.ts` | framework-free 엔진(`createPreviewSurface`), `PREVIEW_DPR_CAP=2`, `LOGICAL_SIZE_TOLERANCE_PX=0.5` |
| `apps/mockup/src/canvas/usePreviewCanvasSurface.ts` | React 19 callback-ref(cleanup 반환) 하나가 element·RO·rAF 소유 |
| `apps/mockup/src/canvas/PreviewCanvasSurface.tsx` | `role="img"` canvas + 안전 상태 표현 |
| `apps/mockup/src/canvas/surface.css` | 기존 토큰만 사용(신규 토큰 0, `packages/ui` 무변경) |
| `apps/mockup/src/canvas/surface.test.ts` · `PreviewCanvasSurface.test.tsx` | unit 33건 |
| `apps/mockup/e2e-canvas-fixture.html` · `src/e2e/canvas-fixture.tsx` · `vite.e2e-fixture.config.ts` | E2E 전용 harness(별도 빌드) |
| `tests/e2e/canvas-surface.spec.ts` | 실제 Chromium Canvas 검증 8건 |
| `package.json` | `test:e2e`가 harness 빌드 후 Playwright 실행 |

## 공개 API

```ts
PreviewCanvasSurface({ plan, imageBindings, accessibleName, className })
usePreviewCanvasSurface({ plan, imageBindings }) -> { ref, state }
createPreviewSurface(ports) -> { requestDraw, dispose }
PREVIEW_DPR_CAP = 2
```
상태 = `"waiting-for-size" | "ready" | "failed"` 3종(코드·index·예외 미저장).

## 크기·DPR 적용 순서

1. 관측 content-box CSS 크기(RO `contentBoxSize`, 첫 draw는 bounding rect)
2. **`|css − plan.logicalCanvas| ≤ 0.5px`(축별)** — 벗어나면 executor 미실행, 안전 실패(임의 배율 재해석 없음)
3. `computeBackingStoreSize({cssSize, deviceDpr, dprCap: PREVIEW_DPR_CAP})`
4. `canvas.width/height` **변경 시에만 대입**(대입은 context state를 초기화)
5. **매 draw** `setTransform(dpr,0,0,dpr,0,0)`
6. `executePreviewRenderPlan({context, plan, imageBindings})`

canvas의 CSS width/height는 `plan.logicalCanvas`로 지정 → 불변식이 구조적으로 성립. 캔버스를 축소하지 않고 wrapper가 스크롤(페이지 overflow 0).

## DPR 상수

`apps/mockup/src/canvas/surface.ts`의 `PREVIEW_DPR_CAP = 2`. **고객 preview surface 전용** — 레거시 room cap 4·print DPI·관리자 Canvas 무관. 근거는 실기기 검증을 통과한 POC preview 상한. unit(1/2/3.5 → 1/2/2) + E2E(`deviceScaleFactor 3` → backing 600×400) 고정.

## 소유권·cleanup

| 시점 | 동작 |
| --- | --- |
| ref attach | 엔진 생성 → RO 1개 등록 → 최초 draw 예약 |
| resize | RO 콜백이 rAF **1개**만 예약(이미 있으면 재사용), draw 시점에 재측정 → 마지막 유효 크기 |
| plan/binding 변경 | effect가 snapshot 게시 + 현재 소유자에 재draw(재부착·observer 재생성 0) |
| ref cleanup / unmount | `dispose()` = observer disconnect + rAF cancel + 이후 콜백 전면 무력화 |
| StrictMode mount→cleanup→mount | active observer 1개·pending rAF 1개 유지 |

draw는 항상 최신 snapshot을 읽으므로 오래된 예약 draw가 새 plan을 덮지 않는다. `devicePixelRatio`는 draw 시점에만 읽는다.

## 실제 Canvas E2E와 `getImageData` 위치

`tests/e2e/canvas-surface.spec.ts`가 `/e2e-canvas-fixture.html`을 열고: fill/stroke/**clip+draw-image-cover** 픽셀(클립 안=drawable 색, drawRect 안·클립 밖=body 색) · `deviceScaleFactor` 1·3 backing · 새 logical size rerender · 0-size→복구 · unmount/remount console error 0 · 320px·desktop overflow 0 · accessible name · axe serious/critical 0 · 고정 sleep 0(전부 `expect.poll`). **`getImageData`는 테스트 측 `page.evaluate` 안에서만** 쓰고, production source 금지 스캔 unit이 이를 고정한다.

## fixture가 고객 `/`에 노출되지 않는 근거

- 별도 HTML entry(`/e2e-canvas-fixture.html`)이며 `index.html`·`main.tsx`·`App.tsx`·`BrowseFlow.tsx`는 fixture나 surface를 **import·링크·분기하지 않음**(grep + E2E 확인)
- E2E 1건이 고객 `/`에서 **canvas 0개, fixture 링크 0개, 문서 내 문자열 0**을 확인
- `pnpm build`·`pnpm check`는 fixture를 **빌드하지 않음**. ⚠️ **정정: 최초 구현은 `test:e2e`가 fixture를 `apps/mockup/dist`에 append했다(운영 산출물 오염). 현재는 `test:e2e`가 고객 앱·관리자 앱·fixture를 모두 `.e2e-staging/`에 빌드하고 preview 서버가 staging을 서빙하므로 `apps/mockup/dist`는 E2E가 읽지도 쓰지도 않는다 — 아래 '재검증 보완' 참조**
- 별도 빌드를 택한 이유: 고객 빌드의 두 번째 input으로 넣으면 Rollup이 공유 청크를 분리해 **고객 자산 그래프·해시가 바뀐다**(실측). 별도 빌드에서는 고객 번들이 **byte-identical**

## 게이트 결과

| 항목 | 값 |
| --- | --- |
| frozen install / lockfile diff | exit 0 / **0** |
| format · lint · typecheck | PASS |
| **unit** | **467** (434 → 467, 신규 33) |
| build | mockup JS 217.69 kB·gzip **68.40** / CSS 11.32 kB·gzip **3.16**(md5 `a9b44036…` = 스펙 021과 동일), admin 193.53·61.09 / 8.54·2.64 무변경 |
| **e2e** | **57 PASS** (49 → 57, 신규 8) · reporter 요약 출력 · **exit 0 자체 종료(18초)** |
| 포트·잔류 | 4183/4184 free · 저장소 소속 Vite/esbuild 잔류 0 |
| check · `git diff --check` | PASS · clean |

스펙 018 PNG는 E2E 재생성분을 **복원·미커밋**.

## 무변경

`packages/**`(render·shared·firebase·spaces·**ui**), `apps/admin/**`, 기존 mockup React UI, 운영 HTML, Firebase 설정·Rules, `poc/**`, 디자인 PNG. Firebase SDK/Auth/write/CORS·실제 network·live test·deploy 0. 스펙 021 globalSetup exact-handle 종료 구조 무변경.

## NOT TESTED / 미착수

실제 운영 이미지·Firebase Storage·**CORS-clean**, **실기기 4환경**(Safari·Android·Samsung·카카오), 실기기 선명도·성능·회전 = **NOT TESTED**. pointer/touch/wheel/pinch·회전·text/clock/watermark·print/PNG·저장·주문 = 미착수. **surface 완료 ≠ 상품 미리보기 완료** — 선택 상태→`CasePlanInput`/`FramePlanInput` projection과 케이스/액자 색 결정은 후속 스펙이다.

---

## 재검증 보완 (2026-07-28) — E2E fixture의 고객 dist 오염 제거 — 코드 커밋 `1f0791d`

### 확인된 결함 (내 이전 주장 정정)

`test:e2e`가 실행하던 `vite.e2e-fixture.config.ts`는 `outDir:"dist"`·`emptyOutDir:false`였으므로 **`apps/mockup/dist`에 `e2e-canvas-fixture.html`과 전용 JS/CSS가 append**됐다. 이전 DONE·handoff의 **"운영 산출물에 fixture 미포함" 서술은 거짓**이었고, `build → test:e2e → deploy` 순서면 fixture가 배포될 수 있었다. 고객 `/`에 링크가 없다는 검사도 **직접 URL 접근·배포 혼입을 막지 못한다**.

### 수정 구조

| 항목 | 변경 후 |
| --- | --- |
| fixture 출력 | `apps/mockup/vite.e2e-fixture.config.ts` → **`../../.e2e-staging/mockup`** |
| `test:e2e` | `vite build apps/mockup --outDir ../../.e2e-staging/mockup --emptyOutDir` → `vite build apps/admin --outDir ../../.e2e-staging/admin --emptyOutDir` → fixture 빌드(staging append) → `playwright test` |
| preview 서버 | `scripts/e2e-preview.mjs`의 `PREVIEW_APPS`가 앱별 `{root, outDir}`을 갖고 `preview()`에 `build.outDir` 전달 → **staging 서빙** |
| 스펙 021 계약 | exact-handle 소유·teardown callback·`127.0.0.1`/`::1` 사전 거부·close 경로 **무변경**(서빙 디렉터리만 변경) |
| 정리 방식 | 고객 dist에 **쓰지 않으므로 사후 삭제 불필요** — broad delete·포트/PID kill·globalTeardown sweep **0**, 새 서버·포트 **0** |
| staging | `.e2e-staging/` gitignored 〔⚠️ **정정: `hosting.public:"."`이라 저장소 내부는 배포 후보였다 — 아래 보완 2에서 OS temp로 이전**〕 |

### 재검증 (요구 순서대로)

| 단계 | 결과 |
| --- | --- |
| clean 고객 build → 파일 목록+SHA256 기록 | mockup `index.html`/`index-D9dnc5BM.css`/`index-R95W5Hp2.js`, admin `index.html`/`index-hSnRi2Ws.css`/`index-Dt6l7Y_-.js` |
| `test:e2e` | **57 PASS · reporter summary · exit 0**(18초 자체 종료), 포트 4183/4184 free, 잔류 0 |
| 후 고객 dist 목록+해시 | **IDENTICAL** |
| 고객 dist 내 `e2e`/`fixture` 파일 | **0건** |
| 실패 경로 1회(임시 실패 spec) | exit 1(18초) → dist **IDENTICAL**, fixture **0건** |
| self-contained | 두 dist를 **삭제한 채** `test:e2e`만 실행 → **57/57 PASS·exit 0**, 실행 후에도 **dist 디렉터리 없음**(E2E가 고객 경로에 아무것도 쓰지 않음을 증명) |
| 재빌드 | 기록된 해시 **정확히 재현** |
| 게이트 | frozen exit 0·**lockfile diff 0** / format·lint·typecheck / **unit 468**(467→468) / build 수치 동일 / check PASS / `git diff --check` clean / 스펙018 PNG 복원·미커밋 |

### 무변경

**production Canvas surface API·UI 로직 무변경**(`apps/mockup/src/canvas/**` diff 0). 변경 파일 = `.gitignore` · `package.json` · `scripts/e2e-preview.mjs` · `scripts/e2e-preview.test.mjs` · `apps/mockup/vite.e2e-fixture.config.ts`. `packages/**`·admin 앱·운영 HTML·Firebase 설정/Rules·POC·디자인 PNG 무변경, 네트워크·live·deploy 0.

### 유지되는 NOT TESTED

실제 운영 이미지·CORS-clean·실기기 4환경·선명도/성능/회전. pointer·회전·text/clock·print·저장·주문 미착수. surface 완료 ≠ 상품 미리보기 완료. **스펙 022 종료 문서 처리는 하지 않았다.**

---

## 재검증 보완 2 (2026-07-28) — staging을 Hosting public 밖으로 — 코드 커밋 `d24e836`

### 확인된 결함 (재정정)

`.e2e-staging/`은 `apps/mockup/dist` 밖이었지만 **Firebase Hosting public 밖이 아니었다.**

| 근거 | 값 |
| --- | --- |
| `firebase.json` `hosting.public` | **`"."`**(저장소 전체) |
| `hosting.ignore` | staging 항목 **없음**(`firebase.json`·`.firebaserc`·`**/.git/**`·`docs/**`·`스크린샷/**`·`*.md`·`*.ps1`·`*.bat`·`*.py`·`backup.json`·`*.rules`) |
| `.firebaseignore` | **없음** |
| firebase-tools | `**/*`를 `dot:true`로 glob |

→ **gitignore는 배포 제외 근거가 아니다.** 이전 문서의 "staging은 배포 소스 아님"은 **거짓**이었고 세 문서에서 모두 정정했다.

### 수정 구조

| 항목 | 변경 후 |
| --- | --- |
| staging 생성 | `scripts/e2e-run.mjs`가 **`mkdtemp(os.tmpdir(), "denn-e2e-")`**로 실행별 디렉터리 생성, 경로를 로그로 출력 |
| 빌드 | mockup·admin·fixture를 그 절대경로로 빌드(`--outDir`, `DENN_E2E_FIXTURE_OUT_DIR`) |
| Playwright | `DENN_E2E_STAGING`로 경로 전달, `tests/global-setup.ts`가 `join(staging, app)`만 preview |
| fixture config | `DENN_E2E_FIXTURE_OUT_DIR` **필수** + **OS temp 밖 경로 거부**(fail-closed, `dist` 폴백 불가) |
| preview 모듈 | 서빙 디렉터리를 **보관하지 않음** — spec의 절대 `outDir`을 받고 없으면 기동 전 거부 |
| 스펙 021 계약 | in-process exact-handle 소유·teardown callback·포트 사전 거부·close 경로 **무변경** |
| cleanup | **이번 실행이 만든 디렉터리 하나만** 제거, 가드 `isDisposableStagingPath`(OS temp 바로 아래 + `denn-e2e-` 접두사만; temp root·상위·중첩·모든 repo 경로 거부) |
| 금지사항 | broad delete·포트/PID kill·taskkill·globalTeardown sweep **0**, 새 서버·포트 **0**, **Firebase 설정·Rules 무변경** |

### 재검증

| 단계 | 결과 |
| --- | --- |
| clean 고객 build 목록+SHA-256 | mockup 3파일 / admin 3파일 기록 |
| `test:e2e` | **57 PASS · summary · exit 0**(19초), staging = `C:\Users\<user>\AppData\Local\Temp\denn-e2e-XXXXXX` (**repo root 밖 · OS temp 아래**), 포트 free, 잔류 0 |
| 후 고객 dist | **IDENTICAL**(SHA-256) |
| 저장소 내 fixture/staging **빌드 산출물** | **0건** |
| 실패 경로 1회 | exit 1(19초) → dist **IDENTICAL**, 저장소 산출물 **0건**, temp 잔여 staging **0건** |
| 재빌드 | 기록 해시 **정확히 재현** |
| 게이트 | frozen exit 0·**lockfile diff 0** / format·lint·typecheck / **unit 472**(468→472) / build 동일 / check PASS / `git diff --check` clean / PNG 복원·미커밋 |

### 실제 경계 (정확히)

저장소에 남는 fixture 관련 파일은 **소스 2개뿐**: `apps/mockup/e2e-canvas-fixture.html`, `apps/mockup/src/e2e/canvas-fixture.tsx`. 이는 `index.html`·`src/main.tsx`와 같은 범주의 **소스**이며 빌드 산출물이 아니다(브라우저가 실행할 수 없는 `.tsx` 모듈을 참조하므로 단독으로는 동작하지 않는다).

⚠️ **남은 사실(스펙 022 이전부터, 이번 스펙 금지 범위):** `hosting.public:"."` + 현 ignore 목록이면 `apps/**`·`packages/**`·`tests/**`·`scripts/**`·`node_modules/**` 등 **저장소 소스 전체가 이미 배포 후보**다. 좁히려면 `firebase.json` 수정이 필요한데 이번 스펙이 금지하므로 **손대지 않고 Codex 결정 항목으로 남긴다**.

### 무변경

**production Canvas surface API·UI 무변경**(`apps/mockup/src/canvas/**` diff 0). 변경 파일 = `scripts/e2e-run.mjs`(신규)·`scripts/e2e-run.test.mjs`(신규)·`scripts/e2e-preview.mjs`·`scripts/e2e-preview.test.mjs`·`tests/global-setup.ts`·`apps/mockup/vite.e2e-fixture.config.ts`·`package.json`·`.gitignore`. **`firebase.json`·Rules·`packages/**`·admin·운영 HTML·POC·PNG 무변경.** 네트워크·live·deploy 0. **스펙 022 종료 문서는 처리하지 않았다.**
