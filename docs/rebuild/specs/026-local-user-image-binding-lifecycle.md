# 스펙 026 — 로컬 사용자 이미지 binding 생명주기

## 상태

- 작성: Codex
- 구현: Claude Code
- 기준 HEAD: `4a76864`
- 범위: 고객이 선택한 로컬 이미지의 decode·메모리 binding·교체·cleanup 계약
- 제품 화면 연결: 제외

## 목적

스펙 021 executor와 스펙 022 surface가 요구하는
`imageRef → CanvasImageSource` 메모리 binding을 로컬 사용자 이미지에서 안전하게 만든다.
파일명·경로·blob URL·data URL을 plan, React 상태, 오류, 로그, DOM, storage에 노출하지 않고,
StrictMode·교체·늦은 완료·실패·unmount에서도 drawable과 URL 수명을 한 소유자가 회수한다.

이 스펙은 실제 고객 미리보기 화면을 완성하지 않는다. 색 선택, frame logical width,
projection→adapter→surface 배선은 사전 조사에서 분리된 Founder 결정 후 후속 스펙에서 다룬다.

## 근거

- 레거시 사용자 사진은 파일 선택 후 `FileReader.readAsDataURL`과 `HTMLImageElement`로 decode하고
  transform을 `{scale:1,x:0,y:0}`으로 초기화한다:
  `denn-mockup-tool.html:1283`, `1374-1391`.
- 같은 파일 재선택을 위해 input 값을 비운다: `denn-mockup-tool.html:1408`.
- 현재 executor는 이미 decode된 `CanvasImageSource`만 받고 URL을 해석하지 않는다:
  `apps/mockup/src/canvas/types.ts`.
- product-plan adapter의 `imageRef`는 제한된 합성 key이며 drawable을 받지 않는다:
  `apps/mockup/src/canvas/productPlan.ts`.
- 상세 조사:
  `docs/codex-claude-handoff/reviews/2026-07-29-customer-preview-connection-investigation.md`.

## 결정

### 1. 범위 분리

이번 스펙은 로컬 사용자 파일만 다룬다.

- 카탈로그·Firebase 이미지: 입력 금지
- network/fetch: 금지
- CORS 설정: 불필요하며 변경 금지
- 파일 선택 UI와 고객 화면 mount: 제외
- pointer/pan/zoom: 제외, transform은 `{scale:1,x:0,y:0}`으로만 생성

### 2. decode 방식

production browser adapter는 `Blob`/`File`에서 `URL.createObjectURL`로 private blob URL을 만들고
`HTMLImageElement`의 load/error 이벤트로 decode 완료를 판정한다.

- data URL을 만들지 않는다.
- `createImageBitmap`을 사용하지 않는다.
- blob URL은 owner 내부 closure에서만 보유한다.
- 성공 drawable은 `HTMLImageElement` identity 그대로 binding에 둔다.
- URL은 성공·실패·교체·dispose 모든 종료 경로에서 정확히 1회 revoke한다.
- URL revoke는 drawable이 load를 마친 뒤 수행한다. drawable binding은 유지된다.

이는 제품 UX 결정이 아니라 이 모듈의 메모리 소유권 결정이다. 실제 iOS Safari·Android
Chrome·Samsung Internet·카카오 인앱 동작은 이 스펙 자동 게이트만으로 PASS 처리하지 않고
`NOT TESTED`로 남긴다.

### 3. 공개 API

`apps/mockup/src/canvas/localImageBinding.ts`에 framework-free core를 둔다.

```ts
type LocalImageBindingState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      imageState: {
        imageRef: string;
        intrinsicSize: { width: number; height: number };
        transform: { scale: 1; x: 0; y: 0 };
      };
    }
  | { status: "failed"; code: LocalImageBindingErrorCode };

interface LocalImageBindingController {
  getSnapshot(): LocalImageBindingState;
  subscribe(listener: () => void): () => void;
  load(input: Blob): void;
  clear(): void;
  dispose(): void;
  readonly bindings: PreviewImageBindings;
}

function createLocalImageBindingController(
  options?: LocalImageBindingOptions,
): LocalImageBindingController;
```

정확한 타입 이름은 구현 중 더 명확한 이름으로 조정할 수 있지만 의미를 확장하면 안 된다.
React wrapper가 필요하면 같은 디렉터리에 얇은
`useLocalImageBinding`을 추가해 `useSyncExternalStore`로 core snapshot을 구독한다.

### 4. 상태와 정보 경계

- React/core 공개 상태에는 blob URL, data URL, `Blob`/`File`, 파일명, MIME 원문, 예외,
  drawable을 넣지 않는다.
- ready 상태에는 안전한 `imageState`만 둔다.
- drawable은 `bindings.get(imageRef)`로만 조회한다.
- `imageRef`는 파일명·시간·random·URL에서 만들지 않는다.
- controller-local 증가 sequence로 `user-image-<sequence>`를 만들며 스펙 020 문법과
  128자 제한을 만족한다.
- 오류는 고정 code만 사용한다. 최소 code:
  `INVALID_INPUT | DECODE_FAILED | INVALID_DIMENSIONS | DISPOSED`.
- 오류 payload에 URL·파일명·MIME·예외 message/stack을 포함하지 않는다.
- 정상 흐름에서 throw하지 않는다. hostile port/accessor 예외도 안전한 실패로 닫는다.

### 5. 세대와 cleanup

- `load`마다 generation을 증가시킨다.
- 새 load는 이전 pending load를 무효화하고 그 URL/handler를 정리한다.
- 이전 load의 늦은 load/error는 최신 snapshot·binding을 변경하지 않는다.
- `clear`는 pending/ready를 모두 제거하고 `idle`로 돌아간다.
- `dispose`는 pending handler·URL·binding·listener를 회수하고 이후 callback을 무력화한다.
- dispose 이후 `load`는 throw하지 않고 `DISPOSED` 상태/결과로 닫는다.
- listener는 구독 해제 후 호출되지 않는다.
- 같은 파일의 재선택 가능성은 controller가 막지 않는다. 실제 `<input>.value=""` 처리는 후속
  UI 소유자의 책임으로 명시한다.

## 허용 파일

### production

- `apps/mockup/src/canvas/localImageBinding.ts`
- 필요 시 `apps/mockup/src/canvas/useLocalImageBinding.ts`

### test

- 대응 `apps/mockup/src/canvas/*.test.ts`
- `apps/mockup/src/e2e/canvas-fixture.tsx`
- `tests/e2e/canvas-surface.spec.ts`

### config

- 기존 test harness가 production dist를 오염하지 않는 범위의 최소 설정 수정만 허용
- 신규 의존성·package.json·pnpm-lock.yaml 변경 금지
- `packages/ui/src/theme.css` 변경 금지

### docs

- 이 스펙의 `DONE (Claude)` append
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- `docs/handoff/2026-07-29-spec-026-local-image-binding-handoff.md`
- `docs/codex-claude-handoff/CURRENT.md`

허용 목록 밖 변경은 `BLOCKED`다.

## 구현 요구사항

1. browser API는 injectable ports 뒤에 둬 framework-free unit에서 결정적으로 검증한다.
2. 기본 port는 `URL.createObjectURL`, `URL.revokeObjectURL`, `new Image()`를 lazy하게 사용한다.
   import 시 DOM 접근은 0이다.
3. `load`가 받은 Blob을 저장하거나 직렬화하지 않는다.
4. natural width/height는 유한 양수만 허용한다.
5. ready binding과 `imageState.imageRef`는 정확히 일치한다.
6. 이전 binding은 교체 시 제거되며 다시 조회되지 않는다.
7. production console 출력, storage, fetch, Firebase import는 0이다.
8. 기존 surface·executor·adapter API를 변경하지 않는다.

## 테스트

### unit

- import 시 browser API 접근 0
- loading→ready와 intrinsic size·초기 transform
- 생성된 imageRef 문법·증가·파일명 비의존
- binding은 drawable identity를 그대로 반환
- decode 실패·0/NaN/Infinity dimensions
- load A pending→load B→A 늦은 성공/실패가 B를 덮지 않음
- ready A→load B에서 A binding 제거
- clear/dispose의 handler·URL·binding·listener 정리
- 모든 URL 정확히 1회 revoke
- dispose 이후 callback 무력화와 throw 0
- throwing ports/getters가 식별정보 없는 오류로 닫힘
- snapshot/오류 직렬화에 URL·파일명·MIME·base64·예외 0
- 입력 Blob 비변형

### 실제 Chromium E2E

기존 OS temp staging의 전용 Canvas fixture에서만 실행한다.

- Playwright `setInputFiles`로 작은 합성 PNG를 주입
- 실제 `HTMLImageElement` decode 후 surface에 binding해 픽셀 draw 확인
- 같은 input에서 같은 파일 재선택 가능하도록 fixture가 value를 비우는 계약 확인
- 빠른 A→B 교체에서 최신 이미지만 draw
- clear/unmount/remount에서 console error 0, stale draw 0
- blob URL·파일명 marker가 text/ARIA/data/storage/location/console에 0
- 320×568과 desktop에서 overflow 0, 접근 가능한 input label, axe serious/critical 0
- 고정 sleep 0, route/network request 0
- 고객 `/`에는 새 input·Canvas·fixture 링크가 0

E2E는 실제 Chromium browser API 검증이다. 실기기 4환경 검증은 아니다.

## 전체 게이트

- `corepack pnpm install --frozen-lockfile`, lockfile diff 0
- format, lint, typecheck
- unit
- build mockup/admin 독립, 기존 고객 bundle/CSS drift 수치 보고
- E2E 전체, reporter summary와 exit 0
- `check`
- `git diff --check`
- 포트 4183/4184 free, 저장소 소속 잔류 0
- OS temp `denn-e2e-*` 잔여 0
- 고객 dist E2E 전후 동일, fixture 0
- E2E 재생성 PNG가 있으면 자동 폐기하지 말고 정확한 파일과 원인을 보고

## 명시적 제외

- 고객 production 화면 mount
- case/frame 색 선택과 팔레트
- frame logical width 정책
- 멀티 zone 사진 공유 정책
- template art와 Firebase 이미지 Canvas 합성
- pointer/drag/pinch/zoom/회전
- text/clock/watermark
- print/export·저장·주문·카카오
- Firebase SDK/Auth/write, Rules/CORS/Hosting, deploy
- 운영 데이터·실제 network/live test·실기기

## 완료 조건

- 로컬 사용자 이미지 owner가 decode·binding·교체·cleanup을 단독 소유한다.
- 공개 상태·오류·DOM·로그에 source 정보가 남지 않는다.
- stale completion이 최신 이미지나 binding을 덮지 않는다.
- 실제 Chromium fixture에서 합성 파일→decode→Canvas 픽셀이 검증된다.
- 고객 production UI와 기존 API·bundle·운영/Firebase는 변경되지 않는다.
- 완료를 상품 미리보기 연결 완료로 기록하지 않는다.

## QUESTIONS

없음. 사전 조사 F-1~F-7·F-9는 이 스펙 범위 밖으로 유지한다. F-8은 사용자에게 보이는
제품 동작을 확정하지 않고 이 모듈의 private 메모리·cleanup 방식으로 위와 같이 한정했다.

---

### DONE (Claude) — 2026-07-29

기준 HEAD `377d350` → 코드/test 커밋 `ae798d5`. **Codex 독립 검증 전이므로 스펙 종료가 아니다.**

- **공개 API(§3 그대로):** `createLocalImageBindingController(options?) → {getSnapshot, subscribe, load,
  clear, dispose, bindings}`, 상태 `idle | loading | ready | failed`, 오류 code 4종
  (`INVALID_INPUT | DECODE_FAILED | INVALID_DIMENSIONS | DISPOSED`). `bindings`는 스펙 021
  `PreviewImageBindings`를 그대로 만족한다. 얇은 wrapper `useLocalImageBinding()`은
  `useSyncExternalStore`로 snapshot만 구독하고 unmount 시 dispose하며, StrictMode 재마운트에는 새 controller를
  넘긴다. **기존 surface·executor·adapter API 무변경.**
- **decode·URL(§2):** `Blob` → private blob URL → `HTMLImageElement.onload/onerror`. data URL·
  `createImageBitmap` **미사용**. URL은 closure 밖으로 나가지 않으며 **decode 완료 후** revoke하고 drawable
  binding은 유지된다. 성공·실패·교체·clear·dispose **모든 종료 경로에서 정확히 1회** revoke(테스트가 생성 URL 집합과
  revoke 집합의 완전 일치·중복 0을 단언).
- **정보 경계(§4):** 공개 snapshot은 안전한 `imageState`(합성 `imageRef`, intrinsic size, 고정
  `{scale:1,x:0,y:0}`)뿐이고 blob URL·`Blob`·파일명·MIME·예외·drawable은 들어가지 않는다. `imageRef`는
  controller-local 증가 sequence `user-image-<n>`으로 파일명·시간·random·URL에 의존하지 않으며 스펙 020 문법과
  128자 제한을 만족한다. 직렬화 검사로 `blob:`·파일명 marker·`image/png`·`base64`·`data:`·예외 문자열 부재를 고정했다.
- **세대·cleanup(§5):** `load`마다 generation 증가 → 이전 pending은 handler detach + URL revoke, **늦은
  성공/실패는 snapshot 참조와 binding을 바꾸지 못한다**. 새 load 시작 즉시 이전 binding 제거(어떤 ref로도 조회 불가).
  `clear`는 pending 취소·binding 제거·`idle` 복귀, `dispose`는 pending handler·URL·binding·listener 회수 후
  callback 무력화, 이후 `load`는 **throw 없이** `DISPOSED`. 구독 해제된 listener는 호출되지 않고, throwing listener도
  owner를 깨뜨리지 못한다. 같은 파일 재선택은 controller가 막지 않으며 `<input>.value=""`는 UI 소유자 책임으로 fixture가
  구현하고 E2E가 고정한다.
- **runtime 안전:** import·생성 시 browser API 접근 **0**(node 환경 unit이 `Image` 미정의 상태에서 직접 증명),
  hostile port(`createObjectUrl`/`createImage`/`src` setter/`naturalWidth` getter/`revokeObjectUrl`)와 malformed
  입력에서 **throw 0**, 입력 Blob 저장·직렬화·변형 0.
- **실제 Chromium E2E 7건(58 → 65):** 합성 단색 PNG를 테스트에서 `node:zlib`로 만들어 `setInputFiles`로 주입 —
  실제 decode → binding → **클립 안 사진색 / 클립 밖 body색**, `input.value` 비움 후 같은 파일 재선택,
  빠른 A→B 교체에서 최신만 draw, clear·unmount·remount에서 stale draw 0·console error 0,
  `blob:`·파일명·`base64`가 text/ARIA/data-*/storage/location/console에 0, 320×568·desktop에서 overflow 0·
  라벨 연결된 input·axe serious/critical 0, localhost 외 network request 0. 고객 `/`에는 canvas·fixture 링크에
  더해 **`input[type=file]`도 0**. 고정 sleep 0.
- **게이트:** frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 755**(716 → 755,
  신규 39) / build(mockup 217.69·gzip **68.40** / CSS 11.32·**3.16**, md5 `a9b44036…` **byte-identical**;
  admin 193.53·61.09 / 8.54·2.64 무변경) / **e2e 65 PASS**·reporter 요약·exit 0 자체 종료 23초 / check PASS /
  `git diff --check` clean / 포트 4183·4184 free·저장소 소속 잔류 0 / OS temp `denn-e2e-*` 잔여 0 /
  고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0.
- **⚠️ 재생성된 추적 PNG 2개는 자동 폐기하지 않았다:**
  `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`(50,814 → 50,801 B),
  `browse-mobile-390x844.png`(49,683 → 49,455 B). 고객 dist가 E2E 전후 동일하고 번들·CSS가 byte-identical이므로
  렌더 입력은 불변이지만 **픽셀 동일성은 이 게이트로 증명하지 않았다(NOT VERIFIED)**. 복원 여부는 **Founder 결정**이며
  승인 전까지 손대지 않는다(커밋도 하지 않음).
- **무변경:** `packages/**` 전체·`apps/admin`·고객 `App.tsx`·`BrowseFlow`·`TemplateThumbnail`·catalog controller·
  **production Canvas surface 전체**·운영 HTML·Firebase 설정/Rules·`poc/**`·`package.json`·`pnpm-lock.yaml` = diff 0.
- **NOT TESTED:** 실기기 4환경의 blob URL·decode, 대용량 사진 메모리·성능, EXIF 회전, 선명도, 운영 이미지.
- ⚠️ **이 완료는 로컬 이미지 owner 완료이며 상품 미리보기·고객 Canvas 연결 완료가 아니다.** 고객 production 화면에는
  아무것도 mount하지 않았다. 인계: `docs/handoff/2026-07-29-spec-026-local-image-binding-handoff.md`.

**PNG 후속(2026-07-29) — 정정:** 위 재생성된 추적 PNG 2개는 세션 지시 한 번으로 `git checkout --`을 실행해
HEAD 바이트로 되돌린 적이 있다. **그러나 그 복원이 승인된 절차라는 근거는 저장소에 없으며, 지금 dirty한 PNG 2개
(Codex 독립 E2E가 다시 생성한 것)에 대한 복원 승인도 없다.** 앞선 기록의 "Founder가 현재 PNG 복원을 승인했다"·
"checkout/restore가 승인된 절차다"라는 취지의 서술은 **철회한다**. 현재 규칙은 다음과 같다: Claude는
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png`과 `browse-mobile-390x844.png`을 **restore·checkout·
stage·commit하지 않는다.** 커밋된 PNG는 0이고, 픽셀 동일성은 `NOT VERIFIED`다.
