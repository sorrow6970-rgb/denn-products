# 스펙 028 — 템플릿 아트 stretch command·CORS-clean binding

## 상태

- 작성: Codex
- Founder 결정: 2026-07-29 `아트 실패 시 미리보기 차단 승인`
- 기준 HEAD: `72bcd8d`
- 배포: 금지

## 목적

스펙 027 고객 Canvas에 실제 템플릿 아트를 올리기 위한 최소 계약을 구현한다.

- 레거시와 같은 stretch layer
- 스펙 018 projection + Firebase trust boundary 재사용
- remote art는 `crossOrigin="anonymous"`를 `src`보다 먼저 설정
- load 실패 시 케이스·액자 모두 preview fail-closed
- URL/token/base64는 owner closure와 실제 drawable 내부에만 존재

이번 스펙은 legacy builder crop, builtin multi-zone, text/clock, pointer, print/export,
Firebase CORS 설정 변경, 실제 network/live/deploy를 구현하지 않는다.

## 결정

### 1. 신규 command

`@denn/render`에 `draw-image-stretch` command를 추가한다.

```ts
{
  type: "draw-image-stretch";
  layerId: string;
  imageRef: string;
  destRect: Rect;
}
```

- source image의 aspect를 보존하지 않고 `destRect` 전체로 5-인자 `drawImage`한다.
- source rect/crop/9-인자 drawImage는 없다.
- opacity, blend mode, transform, rotation은 없다.
- `destRect`는 유한·양수이며 logical canvas 안에 완전히 포함되어야 한다.
- imageRef는 기존 restricted synthetic identifier 계약을 그대로 따른다.
- executor는 preflight에서 전체 command와 binding을 검증한 뒤 draw한다.
- 오류 code 집합과 정보 비노출 계약은 확장하지 않는다.

### 2. plan 입력과 layer 순서

case/frame input에 선택적 `templateArt`를 추가한다.

```ts
interface TemplateArtSpec {
  readonly imageRef: string;
  readonly destRect: Rect;
}
```

호환 fallback은 없다. 명시됐을 때만 command를 만든다.

- case: body → zone user images → `case:template-art` → guides
- frame: body → mat → user image → `frame:template-art` → inner border

case `destRect`는 logical canvas 전체다. frame `destRect`는 `matRect`다.

### 3. legacy crop 거부

frame uploaded template이 레거시 `needsLegacyBuilderCrop` 조건에 해당하면 아트 preview를
지원하지 않는다. 픽셀 분석 crop이나 stretch fallback으로 근사하지 않는다.

`@denn/shared`에 source 문자열을 반환하지 않는 순수 placement projection을 둔다.

```ts
type CatalogTemplateArtPlacement =
  | { status: "none" }
  | { status: "stretch"; target: "case-canvas" | "frame-mat" }
  | { status: "unsupported"; reason: "legacy-builder-crop" | "invalid-template" };
```

판정은 레거시 `templateSourceForDesign`, `builderTemplate`,
`needsLegacyBuilderCrop` 근거(`denn-mockup-tool.html:3025-3028`)를 그대로 사용한다.

- case + available real art → `case-canvas`
- frame uploaded + real art + `needsLegacyBuilderCrop === false` → `frame-mat`
- frame uploaded + `needsLegacyBuilderCrop === true` → unsupported
- no source, builtin, generated preview → none
- raw template, source 문자열, field name, ID는 결과에 포함하지 않는다.

### 4. decode owner

`apps/mockup/src/canvas/`에 framework-free template-art binding controller와 얇은 React
wrapper를 둔다. 공개 상태는 다음 의미만 가진다.

```ts
idle | loading | ready({imageRef}) | failed({code})
```

- 입력은 trust boundary를 통과한 `{kind:"data-image"|"firebase-download-image", src}`다.
- `src`는 React state, Result, 오류, 로그, DOM text/ARIA/data, storage/location, plan에
  저장하지 않는다.
- `data-image`: crossOrigin을 설정하지 않고 src를 대입한다.
- `firebase-download-image`: `image.crossOrigin = "anonymous"` 후 src를 대입한다.
- imageRef는 owner가 만든 `template-art-<generation>` 형태의 안전 key다.
- generation으로 stale load/error를 차단한다.
- clear/dispose/selection 변경 시 handler와 binding을 제거한다.
- 첫 버전은 cross-selection/global cache를 두지 않는다. source/token 문자열은 현재 owner
  수명보다 오래 보존하지 않는다.
- remote anonymous load 성공은 브라우저가 ACAO를 승인한 경우로 간주한다. onerror는 원인을
  구분하지 않는 단일 안전 code로 닫는다.
- crossOrigin 없는 재시도는 금지한다.

### 5. fail-closed UX

Founder 승인에 따라 실제 아트가 필요한 template에서 다음이면 Canvas를 렌더하지 않는다.

- trust 실패
- legacy crop unsupported
- loading
- decode/CORS 실패
- binding 누락

고객에게는 고정 문구 `템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.`만
표시한다. URL, token, source kind, error code, template ID를 출력하지 않는다.

아트가 원래 없는 builtin/no-source/generated-preview template은 기존 body+사진 preview를
유지한다. “실패”와 “원래 없음”을 혼동하지 않는다.

## 연결

`PreviewComposer`가 선택된 template ID로 다음을 각각 호출한다.

1. `projectCatalogTemplateImage`
2. `resolvePublicImageSource`
3. placement projection
4. template-art owner

placement가 stretch이고 owner가 ready일 때만 `templateArt`를 product-plan builder에
전달한다. art binding은 `template-art.` namespace로 기존 composite binding에 합친다.
selection/template 변경 시 owner를 unmount/dispose하고 이전 art/plan을 즉시 제거한다.

## 허용 파일

- `packages/render/src/plan/**`
- `packages/shared/src/catalog/images/**` 및 export 1줄
- `apps/mockup/src/canvas/types.ts`
- `apps/mockup/src/canvas/executePreviewPlan.ts`와 대응 test
- `apps/mockup/src/canvas/templateArtBinding*` 신규
- `apps/mockup/src/canvas/productPlan.ts`와 대응 test
- `apps/mockup/src/preview/PreviewComposer.tsx`와 대응 test
- 필요 시 E2E fixture 최소 수정
- `tests/e2e/mockup-preview.spec.ts`
- 이 스펙 DONE, CURRENT, live log, handoff

`packages/firebase`는 기존 API 재사용만 하고 변경하지 않는다. admin, 운영 HTML,
Firebase config/Rules/CORS/Hosting, POC, PNG, manifests, lockfile는 변경 금지다. 신규
의존성 금지.

## 필수 unit

- stretch command validation, containment, order, deterministic JSON-safe result
- malformed/hostile input throw 0, getter drift 차단
- executor preflight failure Canvas operation 0
- executor stretch draw 순서와 restore 우선순위
- placement: case stretch, frame safe stretch, legacy crop unsupported, builtin/no source/generated
  none
- owner: crossOrigin-before-src, data no crossOrigin, stale, error, clear/dispose, no cache
- source/token/base64가 public snapshot/result/plan/error에 0
- composer: no art continues, required art loading/failed/unsupported blocks, ready adds layer

## 필수 Chromium E2E

- 합성 data art가 case user image 위에 stretch되어 실제 픽셀로 보임
- 합성 trusted Firebase URL + ACAO → anonymous load, Canvas pixel read 성공(CORS-clean)
- 같은 URL + ACAO 없음 → load 실패, Canvas 0, 고정 안내
- crossOrigin 없는 재시도·두 번째 request 0
- selection 변경 중 늦은 art 완료가 새 preview를 오염하지 않음
- frame safe uploaded art는 mat rect에 stretch
- legacy crop variant는 request 전에 차단
- builtin/no-art frame은 기존 preview 유지
- URL/token/base64/source kind/code가 text/ARIA/data/storage/location/console/plan에 0
- 기존 case/frame local-photo E2E와 320px/desktop/keyboard/axe 회귀 0
- `getImageData`는 테스트 측에서만 사용

## 전체 게이트

- frozen install, format, lint, typecheck, unit, build
- 전체 E2E reporter summary와 exit 0
- `git diff --check`
- ports 4183/4184 free, OS temp `denn-e2e-*` 0
- 고객 dist E2E 전후 SHA-256 동일, fixture 0
- bundle 변화 원인·수치 기록

## STOP

- 실제 bucket CORS 설정 변경 필요
- 실제 Firebase GET/운영 이미지 다운로드 필요
- legacy crop/source-crop 지원 없이는 주요 요구를 충족할 수 있음이 확인됨
- source URL/token을 React state/plan/DOM에 넣어야 하는 설계
- 신규 의존성, Firebase/Rules/Hosting/deploy, 예상 밖 파일, flaky/잔류

## 완료 의미

완료는 합성 fixture에서 CORS-clean 템플릿 아트를 고객 preview에 fail-closed로 합성한 단계다.
운영 bucket CORS, 운영 이미지, 실기기, print/export CORS-clean, pointer, 주문·배포 완료가
아니다.

---

### DONE (Claude) — 2026-07-29

기준 HEAD `7a2b2cd` → 코드/test 커밋 `f7b3f61`. **Codex 독립 검증 전이므로 스펙 종료가 아니다.**

- **§1 신규 command**: `draw-image-stretch {layerId, imageRef, destRect}`를 `@denn/render`에 추가했다. 5-인자
  `drawImage`로 destRect를 채우며 source rect/crop·9-인자·opacity·blend·transform·rotation은 **없다**. destRect는
  유한·양수이고 logical canvas에 **완전히 포함**돼야 하며(clamp·shrink 0), imageRef는 기존 제한 식별자 문법 그대로다.
  executor는 preflight에서 검증한 뒤에만 그리고, **오류 code 집합은 확장하지 않았다**(`INVALID_ID`/`INVALID_ZONE`/
  `NON_FINITE_RESULT` 재사용).
- **§2 layer 순서**: case = body → zone 사진 → `case:template-art` → guides, frame = body → mat → 사진 →
  `frame:template-art` → inner border. `templateArt`는 **명시됐을 때만** command가 생기고 호환 fallback은 없다.
  destRect는 case가 logical canvas 전체, frame이 matRect(adapter 계산).
- **§3 legacy crop 거부**: `projectCatalogTemplateArtPlacement`가 `none` / `stretch(case-canvas|frame-mat)` /
  `unsupported(legacy-builder-crop|invalid-template)`만 반환한다. 판정은 레거시 `templateSourceForDesign`·
  `builderTemplate`·`needsLegacyBuilderCrop`(`:3025-3028`)을 그대로 쓰고, **source 문자열·field name·ID·raw
  template을 반환하지 않으며** hostile 입력에서 throw 0이다.
- **§4 decode owner**: `templateArtBinding` + 얇은 `useTemplateArtBinding`. 입력은 trust boundary 통과분
  `{kind, src}`이고 **remote는 `crossOrigin="anonymous"`를 `src`보다 먼저** 설정(테스트가 write 순서를 직접 단언),
  `data-image`는 미설정. key는 `template-art-<generation>`, generation으로 stale 차단, clear/dispose에서 handler·
  binding 회수, **cross-selection/global cache 0**(같은 소스도 다시 로드). onerror는 원인 구분 없는 **단일 code**이며
  **crossOrigin 없는 재시도 0**. `src`는 owner closure와 실제 drawable 안에만 존재한다.
- **§5 fail-closed**: trust 실패·legacy crop unsupported·loading·decode 실패·binding 누락이면 **Canvas를 렌더하지
  않고** 고정 문구(`템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.`)만 보여준다. 아트가 **원래 없는**
  builtin·no-source·generated-preview는 기존 body+사진 preview를 그대로 유지한다("실패"와 "원래 없음" 구분).
- **§연결**: placement → `projectCatalogTemplateImage` → `resolvePublicImageSource` → owner 순서로만 호출하고,
  art binding은 `template-art.` namespace로 기존 composite binding에 합류한다. selection/template 변경 시
  composer가 remount돼 owner가 dispose되고 이전 art·plan이 즉시 사라진다.
- **실제 Chromium E2E 7건**: `data:` 아트가 캔버스 전체에 stretch돼 사진 위에 보임(투명 절반으로 사진 비침, network 0) /
  신뢰 URL 아트가 **anonymous 1회 요청**으로 로드되고 mat rect에만 stretch되며 **테스트 측 `getImageData` 성공(=CORS-clean)** /
  로드 실패 시 **Canvas 0 + 고정 안내 + 재시도 0** / legacy crop variant는 **요청 전 차단** / builtin은 기존 preview 유지 /
  선택 변경 후 늦은 아트가 새 preview를 오염시키지 않음 / URL·token·`base64`·source kind·code가 DOM·ARIA·data·storage·
  location·console에 **0**(스펙 018이 허용한 썸네일 `img[src]` 한 곳만 제외).
- **⚠️ 시뮬레이션 한계(정직 기록)**: **ACAO 헤더가 없는 응답은 재현할 수 없다** — Playwright의 `route.fulfill`이
  응답에 `access-control-allow-origin`을 자동으로 붙인다(실측: 헤더 없이 fulfill해도 anonymous 로드 성공·canvas readable).
  따라서 **"ACAO 없음 ⇒ 로드 실패"는 `NOT TESTED`** 이고, E2E가 증명하는 것은 **실패 시 fail-closed·재시도 0**이다.
  부수 관측: 같은 URL을 스펙 018 썸네일(non-CORS)이 먼저 요청한 뒤 owner가 anonymous로 요청하며(태그 `plain`→`cors`),
  이 환경에서는 CORS-clean이었다. 캐시 오염 가능성은 **NOT VERIFIED**.
- **게이트**: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck / **unit 876**(802 → 876,
  신규 74) / build(mockup JS **248.29 → 253.92 kB**, gzip **77.55 → 78.82**; CSS **13.80/3.53 무변경**; admin 무변경) /
  **e2e 85 PASS**(78 → 85, 신규 7)·exit 0 자체 종료 16.2초 / check PASS / `git diff --check` clean / 포트 4183·4184 free /
  OS temp `denn-e2e-*` 0 / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0.
  번들 증가 원인 = 아트 owner + placement projection + stretch 실행 경로(JS gzip **+1.27 kB**), CSS 신규 규칙 없음.
- **무변경**: `packages/firebase`(재사용만)·`apps/admin`·운영 HTML·Firebase 설정/Rules/CORS·`poc/**`·PNG·manifest·
  lockfile = diff 0. 기존 E2E fixture와 `canvas-surface.spec.ts`도 수정하지 않았다.
- **NOT TESTED**: 운영 bucket CORS 실제 설정, ACAO 부재 시 실제 실패, 운영 아트 이미지, 실기기, 실제 200% 확대,
  print/export의 taint 검증, 대용량 아트 성능. **미착수**: legacy crop 지원·builtin multi-zone·text/clock·pointer·
  print/export·저장·주문·Firebase·deploy.
- **PNG**: Codex E2E 재생성분 2개는 restore·checkout·stage·commit **하지 않았다**(working tree dirty, 커밋된 PNG 0).
- ⚠️ 이 완료는 **합성 fixture에서 CORS-clean 아트를 fail-closed로 합성한 단계**이며 운영 CORS·실기기·print/export·
  주문·배포 완료가 아니다. 인계: `docs/handoff/2026-07-29-spec-028-template-art-handoff.md`.

---

### DONE (Claude) — 보완 라운드 1 (2026-07-29)

기준 `cebcaad`(+ Codex 지적) → 코드/test 커밋 `d4fb99b`. **Codex 재검증 전이므로 종료가 아니다.**

- **지적 1 — art source 1회 snapshot(`templateArtBinding.ts`)**: `source.kind`/`source.src`를 **예외 경계 밖에서**
  읽어 hostile getter·Proxy trap·revoked Proxy가 `load()` 밖으로 throw할 수 있었고, drift가 검증값과 실제 대입값을
  가르게 할 수 있었다. 이제 `readSourceOnce()`가 **경계 안에서 각 필드를 정확히 1회** 읽어 plain snapshot을 만들고,
  검증·`crossOrigin`/`src` 대입·load 결과 처리는 **snapshot만** 사용한다. hostile 입력은 element를 만들지도 않고
  기존 `INVALID_INPUT`으로 닫히며 원본 예외·URL은 저장되지 않는다. **crossOrigin-before-src·data URL 예외·재시도 0·
  generation guard·cache 0 계약은 그대로**다.
- **지적 2 — placement 전체 1회 snapshot(`placement.ts`)**: source 체인과 legacy-builder marker를 helper마다 다시
  읽어, 첫 읽기가 legacy crop variant를 가리켜도 이후 drift가 근거를 지우면 **`stretch`로 fail-open**할 수 있었다.
  이제 `readTemplateOnce()`가 `generatedDetailPreview`·legacy source 5필드·`type`·`builtBy`·`exportVersion`·
  `overlayScope`·`frameBaked`를 **각각 1회** 읽어 boolean만 남긴 snapshot을 만들고(케이스 체인도 같은 `dataUrl` 읽기를
  재사용), 모든 판정이 snapshot에서만 이뤄진다. 따라서 **첫 snapshot이 legacy crop이면 이후 drift와 무관하게
  `unsupported: legacy-builder-crop`을 유지**한다. 기존 안정 입력의 none/stretch/unsupported 결과·오류 우선순위
  **무변경**, Result에 source 문자열·필드명·template ID **미추가**.
- **선택적 정리**: composer의 `artBlocked` 표현식에서 `noUselessTernary` 1줄만 정리(의미 변경 0).
- **신규 회귀 테스트 17건**: 필드별 read count 1, drifting `kind`/`src`(첫 snapshot 사용 — 드리프트된 remote kind가
  crossOrigin을 추가하지 못함), drifting source/marker(legacy crop 유지), 각 필드 throwing getter, throwing Proxy trap,
  revoked Proxy(양쪽 모두 throw 0).
- **게이트(보완 라운드 1)**: frozen exit 0·**lockfile diff 0**·신규 의존성 0 / format·lint·typecheck /
  **unit 893**(876 → 893) / build(mockup JS **254.06 kB**·gzip **78.90**, CSS **13.80/3.53 무변경**, admin 무변경) /
  **e2e 85 PASS**·exit 0·16.4초 / check PASS / `git diff --check` clean / 포트 4183·4184 free·잔류 0 /
  OS temp `denn-e2e-*` 0 / 고객 dist **SHA-256 E2E 전후 동일·fixture 0** / 네트워크·live·deploy 0.
- **PNG**: Codex E2E 재생성분 2개는 이번에도 restore·checkout·stage·commit **하지 않았다**.

---

### CODEX_PASSED — 스펙 028 종료 (2026-07-30)

Codex가 보완 코드 **`d4fb99b`** 를 독립 재검증해 **승인 가능**으로 판정했다. 최종 문서 기준 HEAD `baa0d78`.
이 섹션으로 스펙 028을 **DONE**으로 종료한다(기능 코드·설정·테스트 변경 0, 문서 전용).

**Codex 독립 검증 결론**

- `templateArtBinding`: source `kind`/`src`를 예외 경계 안에서 **각각 1회** 읽은 snapshot만 검증·대입·binding에
  사용하며 hostile getter · Proxy trap · revoked Proxy는 **throw 없이 안전 실패**한다.
- catalog placement: source 체인과 legacy-builder marker를 **각각 1회** 읽은 snapshot으로만 판정하며,
  **첫 snapshot이 legacy crop이면 getter drift가 `stretch`로 fail-open시키는 경로가 없다**.
- 변경 범위는 허용된 source/test 4개와 lint 의미 보존 1줄로 한정되고 `git diff --check`를 통과했다.

**Codex 독립 게이트**

| 항목 | 결과 |
| --- | --- |
| frozen install | PASS, lockfile diff **0** |
| format · lint · typecheck | PASS |
| unit | **893 / 893 PASS** |
| build | PASS — mockup JS **254.06 kB** / gzip **78.90 kB**, CSS 13.80 / 3.53 kB; admin JS 193.53 / 61.09 kB, CSS 8.54 / 2.64 kB |
| E2E | **85 / 85 PASS**, exit 0 |
| `git diff --check` | PASS |
| 포트 4183 · 4184 | listener **0** |
| OS temp `denn-e2e-*` / 저장소 소속 node·esbuild | **0 / 0** |
| 고객 dist fixture | **0** |
| HEAD = origin, ahead/behind | `baa0d78`, **0 / 0** |

Claude Code도 같은 트리에서 재실측했고 위 수치와 **일치**했다(unit 893, e2e 85 PASS exit 0 19.5초,
build 동일, `git diff --check` clean, 포트 free, temp 0).

**확정 계약 (무변경 유지)**

1. template-art source `kind`/`src`는 예외 경계 안에서 각각 1회 읽은 plain snapshot만 검증·대입·binding에 쓴다.
2. hostile getter · Proxy trap · revoked Proxy는 throw 없이 안전 실패한다.
3. placement source 체인과 legacy-builder marker는 각각 1회 snapshot된다.
4. 첫 snapshot이 legacy crop이면 getter drift로 `stretch`가 되는 fail-open 경로가 없다.
5. crossOrigin-before-src · data URL 예외 · 재시도 0 · generation guard · cache 0 ·
   기존 none/stretch/unsupported 결과와 오류 우선순위 · 원문 비노출 계약은 유지된다.

**NOT TESTED / NOT VERIFIED (종료 후에도 유지)**

- 운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패
- 운영 이미지 · 카탈로그
- 실기기 4환경과 실제 200% 확대
- print/export taint
- 대용량 아트 성능
- 썸네일(non-CORS)과 owner(anonymous)의 동일 URL 캐시 오염 가능성

⚠️ 이 종료는 **합성 fixture에서 CORS-clean 템플릿 아트를 고객 preview에 fail-closed로 합성한 단계**이며
운영 bucket CORS · 운영 이미지 · 실기기 · print/export CORS-clean · pointer · 주문 · 배포 완료가 아니다.
`hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지. **다음 스펙은 지시 대기.**

**PNG**: `spec-018/browse-desktop-1280x800.png`·`browse-mobile-390x844.png`은 이번 종료 라운드에서도
restore·checkout·stage·commit **하지 않았다**(working tree dirty, 커밋된 PNG 0).
