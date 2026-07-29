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

## 10. PNG 후속 (2026-07-29, Founder 승인 후)

Founder가 §6의 **정확한 두 파일**에 대해 복원을 승인했다. `git checkout --`로 그 두 경로만 HEAD 승인본으로
되돌렸고(복원 후 바이트 수 50,814 / 49,683 = HEAD와 일치), 그 외 파일은 건드리지 않았다.
결과: working tree **clean**, HEAD=origin `0859e50`, ahead/behind 0/0, 커밋된 PNG **0**.
새 산출물은 채택하지 않았으며 픽셀 동일성은 여전히 `NOT VERIFIED`다.
