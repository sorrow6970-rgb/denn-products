# 스펙 026 인계 — 로컬 사용자 이미지 binding 생명주기

- 일자: 2026-07-29
- 기준 HEAD: `377d350` → 코드/test 커밋 `ae798d5`
- 스펙 정본: `docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`
- 상태: 구현·자체 검증 완료 → Codex 독립 검증 대기. **스펙 종료 아님.**

> ⚠️ 이 완료는 **로컬 이미지 owner 완료**이며 상품 미리보기·고객 Canvas 연결 완료가 아니다.
> 고객 production 화면에는 아무것도 mount하지 않았다.

---

## 1. 무엇을 만들었나

| 파일 | 성격 | 내용 |
| --- | --- | --- |
| `apps/mockup/src/canvas/localImageBinding.ts` | 신규 · framework-free | `createLocalImageBindingController()` — private blob URL·decode·binding·generation·cleanup의 단독 소유자 |
| `apps/mockup/src/canvas/useLocalImageBinding.ts` | 신규 · 얇은 React wrapper | `useSyncExternalStore`로 core snapshot 구독 + unmount 시 dispose |
| `apps/mockup/src/canvas/localImageBinding.test.ts` | 신규 unit(37) | fake port 기반 결정적 검증 |
| `apps/mockup/src/canvas/useLocalImageBinding.test.ts` | 신규 unit(2) | `react-dom/server`(node env)로 초기 snapshot·누출 0 |
| `apps/mockup/src/e2e/canvas-fixture.tsx` | 수정 | 파일 선택 UI + 선택 이미지 plan (E2E 전용) |
| `tests/e2e/canvas-surface.spec.ts` | 수정 | 실제 Chromium decode·픽셀·누출·접근성 E2E 7건 추가 |

허용 파일 밖 변경 **0**. 신규 의존성 **0**(합성 PNG는 `node:zlib`로 테스트에서 생성).

## 2. 공개 API (스펙 §3 그대로)

```ts
createLocalImageBindingController(options?: { ports?: LocalImageBindingPorts })
  → { getSnapshot, subscribe, load, clear, dispose, bindings }

type LocalImageBindingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; imageState: { imageRef; intrinsicSize; transform: {scale:1,x:0,y:0} } }
  | { status: "failed"; code: "INVALID_INPUT" | "DECODE_FAILED" | "INVALID_DIMENSIONS" | "DISPOSED" }
```

- `bindings`는 스펙 021 `PreviewImageBindings` 포트를 그대로 만족한다(`get(imageRef)`).
- `useLocalImageBinding()` → `{ state, bindings, load, clear }`. **동작을 추가하지 않는다.**
- 기존 surface·executor·adapter API **무변경**.

## 3. 생명주기 계약(구현된 규칙)

| 규칙 | 구현 |
| --- | --- |
| import·생성 시 browser API 접근 0 | 기본 port는 `URL.createObjectURL`/`revokeObjectURL`/`new Image()`를 **port 본문에서만** 호출 → 첫 `load()` 시점에 접근. node 환경 unit이 이를 직접 증명(`Image` 미정의 상태에서 생성·구독·clear·dispose 정상) |
| decode 방식 | `Blob` → private blob URL → `HTMLImageElement.onload/onerror`. **data URL·`createImageBitmap` 미사용** |
| URL 노출 | URL은 controller closure 안에만 존재. snapshot·오류·DOM·로그·storage에 **0** |
| revoke 시점 | `onload`에서 **natural size를 읽은 뒤** revoke. drawable binding은 유지 |
| revoke 횟수 | 성공·실패·교체·clear·dispose **모든 종료 경로에서 정확히 1회**(`revokeOnce` 플래그) |
| generation | `load`마다 증가. 이전 pending은 handler detach + URL revoke, **늦은 성공/실패는 snapshot·binding을 바꾸지 못함**(동일 참조 유지로 검증) |
| binding 교체 | 새 `load` 시작 즉시 이전 binding 제거 → 이후 어떤 ref로도 조회 불가 |
| imageRef | controller-local 증가 sequence `user-image-<n>`. 파일명·시간·random·URL 비의존, 스펙 020 문법·128자 만족 |
| intrinsic size | 유한 양수만 허용. 0·음수·NaN·Infinity → `INVALID_DIMENSIONS`(binding 없음) |
| clear | pending 취소 + binding 제거 + `idle` 복귀 |
| dispose | pending handler·URL·binding·listener 회수, 이후 callback 무력화, 이후 `load`는 **throw 없이** `DISPOSED` |
| throw 0 | 정상 경로는 물론 hostile port(createObjectUrl/createImage/src setter/naturalWidth getter/revoke)·throwing listener에서도 throw 0 |
| 입력 Blob | 저장·직렬화·변형 **0** |
| 같은 파일 재선택 | controller는 막지 않으며, `<input>.value=""`는 **UI 소유자 책임**임을 fixture가 구현·E2E가 고정 |

## 4. 실제 Chromium E2E (신규 7건, 58 → 65)

합성 PNG(20×20 단색)를 테스트에서 `node:zlib`로 생성해 `setInputFiles`로 주입한다. 저장소에 이미지 파일을 추가하지 않았고 다운로드도 없다.

1. 선택 → 실제 decode → binding → **클립 안은 사진색, 클립 밖·바깥 영역은 body색**(clip 실증)
2. 선택 후 `input.value === ""`, clear 후 동일 파일 재선택이 다시 `ready`가 되고 픽셀도 갱신
3. 빠른 A→B 교체에서 **최신 B만** draw
4. clear/unmount/remount에서 stale draw 0, console error 0
5. `blob:`·파일명 marker·`base64`가 text/속성(ARIA·data-*)/localStorage/sessionStorage/location/console에 **0**
6. 320×568·desktop에서 overflow 0, 파일 input의 **접근 가능한 이름**(연결된 label) 확인, axe serious/critical 0
7. 로컬 파일 decode 중 **localhost 외 network request 0**

추가로 기존 "고객 화면" E2E에 **`input[type=file]` 0**을 더했다. 고정 sleep 0.

## 5. 게이트 실측

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, `pnpm-lock.yaml` diff **0**, 신규 의존성 0 |
| `format:check` / `lint` / `typecheck` | PASS |
| `test:unit`(= `check`) | **755 PASS**(716 → 755, 신규 39), 30 파일 |
| build mockup | JS 217.69 kB / gzip **68.40**, CSS 11.32 kB / gzip **3.16** — `index-D9dnc5BM.css` md5 `a9b44036cb2e5910b23c147aa578696c` = **byte-identical** |
| build admin | 193.53 / 61.09, 8.54 / 2.64 = **무변경** |
| `test:e2e` | **65 PASS**(58 → 65), reporter 요약, **exit 0 자체 종료 23초** |
| `check` | PASS |
| `git diff --check` | clean |
| 포트 4183·4184 | free |
| 저장소 소속 node·esbuild 잔류 | 0 |
| OS temp `denn-e2e-*` | 잔여 **0** |
| 고객 dist | mockup·admin **파일 목록+SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| 네트워크 / live / deploy | **0** |

## 6. ⚠️ 재생성된 추적 PNG 2개 — 자동 폐기하지 않음

`test:e2e`가 스펙 018 스크린샷 2개를 다시 썼다. **런북 §필수 안전 규칙에 따라 복원·폐기하지 않고 그대로 두었으며 커밋도 하지 않았다**(허용 파일 밖).

| 파일 | HEAD | 실행 후 | 차이 |
| --- | --- | --- | --- |
| `docs/rebuild/results/spec-018/browse-desktop-1280x800.png` | 50,814 B | 50,801 B | −13 B |
| `docs/rebuild/results/spec-018/browse-mobile-390x844.png` | 49,683 B | 49,455 B | −228 B |

원인(확인된 사실): 이 두 파일은 `tests/e2e/mockup-browse.spec.ts`의 spec018 스크린샷 테스트가 매 실행마다 다시 쓴다. 이번 라운드는 **고객 dist가 E2E 전후 SHA-256 동일**이고 고객 번들·CSS가 **byte-identical**이므로 렌더 입력은 바뀌지 않았다. 즉 차이는 PNG 인코딩 산출물 차이로 보이며, **픽셀 동일성은 이 게이트만으로 증명하지 않았다(NOT VERIFIED)**.

→ **Founder 결정 필요**: 이 두 파일을 HEAD 승인본으로 복원할지, 새 산출물을 채택할지. 승인 전까지 손대지 않는다.

## 7. 무변경 확인

`packages/**` 전체(`render`·`shared`·`ui`·`firebase`·`spaces`) / `apps/admin` / 고객 `App.tsx`·`BrowseFlow`·`TemplateThumbnail`·catalog controller / **production Canvas surface**(`surface.ts`·`PreviewCanvasSurface.tsx`·`usePreviewCanvasSurface.ts`·`executePreviewPlan.ts`·`types.ts`·`productPlan.ts`) / 운영 HTML / `firebase.json`·Rules / `poc/**` / `package.json` / `pnpm-lock.yaml` = `git diff` **0**.

## 8. NOT TESTED · 후속

- **NOT TESTED**: 실기기 4환경(iOS Safari·Android Chrome·삼성 인터넷·카카오 인앱)의 blob URL·decode 동작, 대용량 사진 메모리·성능, EXIF 회전, 선명도, CORS-clean(로컬 파일은 해당 없음), 운영 이미지.
- **미착수(스펙 026 제외 범위 유지)**: 고객 화면 mount, 색 선택·팔레트, frame logical width 정책, 멀티 zone 사진 공유, template art·Firebase 이미지 합성, pointer/pan/zoom, text/clock/watermark, print/export·저장·주문, Firebase·배포.
- `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.

## 9. 커밋 / 롤백

| 순서 | 커밋 | 내용 |
| --- | --- | --- |
| 1 | `ae798d5` | 코드·테스트 (controller, hook, unit 39, fixture, E2E 7) |
| 2 | (문서) | 스펙 026 DONE, 이 인계, `CLAUDE_LIVE_PATCH_LOG.md`, `CURRENT.md` |

**롤백 순서: 문서 커밋 → 코드 커밋**(역순 revert). 기준 `377d350`으로 되돌리면 라운드 전 상태다.

---

## 10. PNG 후속 (2026-07-29) — 정정

이 절의 이전 서술("Founder 승인 후 복원", "checkout/restore가 승인됐다")은 **철회한다.**

사실 관계:

- §6의 두 파일은 세션 지시 한 번으로 `git checkout --`이 실행돼 HEAD 바이트(50,814 / 49,683)로 되돌아간 적이 있다.
- **그 복원이 승인된 절차라는 근거는 저장소에 없다.** 이후 Codex 독립 검증 E2E가 같은 두 파일을 다시 생성했고,
  **현재 dirty한 산출물에 대한 복원 승인은 존재하지 않는다.**
- 따라서 현재 규칙: Claude는 이 두 파일을 **restore·checkout·stage·commit하지 않는다.** 보완 라운드에서도
  손대지 않았고 커밋된 PNG는 **0**이다.
- 픽셀 동일성은 `NOT VERIFIED`다.

## 11. 보완 라운드 1 (2026-07-29) — 실제 hook owner 생명주기

Codex 지적 3건에 대한 보완. 기준 HEAD `449b027`(+ Codex 문서 커밋 `73e4e2b`) → 코드/test 커밋 `25c421b`.

### 11.1 지적 1 — 실제 mount 환경 검증 부재 (정정)

**철회하는 이전 서술**: §4-4의 "clear/unmount/remount"는 **canvas surface만** unmount한 것이며 **hook owner의
unmount를 증명하지 않는다**. `renderToStaticMarkup` unit도 초기 snapshot만 증명한다. 두 근거로 owner 생명주기를
PASS로 기록했던 부분을 정정한다.

**이번 라운드에 추가한 실제 검증**(모두 실제 Chromium, 고정 sleep 0):

| E2E | 검증 내용 |
| --- | --- |
| StrictMode 생존 | 루트가 `<StrictMode>`라 owner는 이미 mount→cleanup→remount를 거친 상태. 그 뒤 파일 선택이 `ready`가 되고 픽셀이 사진색 → **살아 있는 controller** 확인. url outstanding 0·중복 0 |
| owner unmount | `fx-owner-off`로 **hook을 소유한 컴포넌트 자체**를 unmount → 파일 input·canvas 사라짐, **outstanding url 0·중복 0**. `fx-owner-on` 재마운트 시 상태 `idle`(새 controller)·canvas는 합성 plan을 그림(**stale 사진 0**) |
| in-flight 중 unmount | `ready` 대기 없이 즉시 unmount → outstanding url이 0으로 수렴, 재마운트 상태 `idle`(늦은 `onload`가 되살리지 못함) |
| 반복 cycle | 3회 pick→owner off→on: **created 3 / revoked 3 / outstanding 0 / duplicates 0** |

전 케이스에서 console **error 0·warning 0**(단, Chromium의 `willReadFrequently` 성능 권고는 **테스트 측
`getImageData` 반복 읽기**가 원인이라 제외하고 그 사유를 코드에 남겼다).

object URL 계측은 **테스트 측 `page.addInitScript`** 로 `window.URL`을 감싸 수행했다 — production 모듈에는
관측용 훅을 추가하지 않았고 URL은 여전히 closure 안에만 있다.

### 11.2 지적 2 — cleanup 내 `setController(...)` 위험 (수정함)

이전 구현은 effect **cleanup에서 `setController(...)`** 를 호출해 실제 unmount 시점에 state update를 시도했다.
현재 구현은 controller를 소유 레코드 `{controller, disposed}`에 담고, **cleanup은 dispose + 플래그 설정만** 하며
교체 controller는 **다음 mount의 effect 본문**에서 발행한다. 결과: **실제 unmount 경로에 state update 0**,
StrictMode remount 후에도 live controller 유지(위 E2E가 고정).

### 11.3 지적 3 — 문서 사실관계 (정정)

§10과 아래 문서에서 PNG 복원 관련 승인 주장을 철회했다. 검증한 항목만 PASS로 기록하고 나머지는 `NOT TESTED`다.

### 11.4 보완 라운드 1 게이트

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, lockfile diff **0**, 신규 의존성 0 |
| `format:check` / `lint` / `typecheck` | PASS |
| `test:unit` / `check` | **755 PASS**(변동 없음 — 이번 보완은 실제 브라우저 검증이라 unit 증가 0) |
| build mockup | JS 217.69 kB / gzip **68.40**, CSS 11.32 kB / gzip **3.16**, md5 `a9b44036cb2e5910b23c147aa578696c` **byte-identical** |
| build admin | 193.53 / 61.09, 8.54 / 2.64 **무변경** |
| `test:e2e` | **69 PASS**(65 → 69, 신규 4), reporter 요약, **exit 0 자체 종료 20초** |
| `git diff --check` | clean |
| 포트 4183·4184 | free |
| 저장소 소속 node·esbuild 잔류 | 0 |
| OS temp `denn-e2e-*` | 0 |
| 고객 dist | E2E 전후 **SHA-256 동일**, fixture 파일 0 |
| PNG | Codex E2E가 만든 dirty 산출물 **미복원·미커밋** |
| 네트워크 / live / deploy | 0 |

**NOT TESTED(유지)**: 실기기 4환경 blob URL·decode, 대용량 사진 메모리·성능, EXIF 회전, 선명도, 운영 이미지.
여전히 **로컬 이미지 owner 완료이며 상품 미리보기·Canvas 연결 완료가 아니다**(고객 화면 mount 0).

## 12. 종료 (2026-07-29)

Codex 최종 판정 **승인 가능**, 승인 기준 HEAD **`69db696`**. 종료 시점 실측치는 §11.4와 일치한다:
unit **755/755**, E2E **69/69 PASS·exit 0**, mockup JS/CSS gzip **68.40 / 3.16 kB**,
admin **61.09 / 2.64 kB**, 포트 free, temp 잔여 0, `git diff --check` PASS, HEAD=origin·0/0.
실제 Chromium에서 hook owner의 **StrictMode mount→cleanup→remount / owner unmount / in-flight 중
unmount / 반복 remount**가 검증됐다.

- **NOT TESTED**: 실제 기기, 운영 이미지, 대용량 사진 메모리·성능, EXIF 회전.
- **미착수**: 고객 화면 mount, 색·logical width 정책, 멀티 zone 공유, template art·Firebase 이미지,
  pointer/print/저장/주문, Firebase·network·deploy.
- **PNG**: Codex E2E 재생성 산출물 2개는 미복원·미커밋 → working tree dirty(정직 기록), 커밋된 PNG 0.
- 종료 커밋: 이 문서를 포함한 문서 전용 커밋. 코드·설정·테스트는 승인본 그대로다.
