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
