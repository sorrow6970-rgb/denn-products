# 2026-07-28 — 스펙 023 카탈로그 미리보기 기하 projection 핸드오프

정본 스펙: `docs/rebuild/specs/023-catalog-preview-geometry-projection.md` (DONE·QUESTIONS는 스펙 하단)
코드/test 커밋: `5a7cbd7` · 문서 커밋: 별도

## 한 줄

선택 ID + `CatalogDocumentV1` → **케이스/액자 기하만** 결정적으로 뽑는 **순수 `@denn/shared` projection**을 추가했다. 색·사용자 이미지·CSS logical size·`PreviewRenderPlan` 조립은 손대지 않았고, 사각형으로 표현 못 하는 zone/template은 **근사 없이 실패**시킨다.

## 파일

| 경로 | 역할 |
| --- | --- |
| `packages/shared/src/catalog/preview/types.ts` | Result·diagnostic·geometry 타입(render 비의존 plain data) |
| `packages/shared/src/catalog/preview/project.ts` | projection 구현(레거시 근거 주석 포함) |
| `packages/shared/src/catalog/preview/index.ts` | 공개 surface |
| `packages/shared/src/catalog/preview/project.test.ts` | unit 96 |
| `packages/shared/src/catalog/index.ts` | `export * from "./preview"` 1줄 |

그 외 **무변경**: `apps/**`, `packages/render|firebase|ui|spaces`, 운영 HTML, Firebase 설정·Rules, `poc/**`, 디자인 PNG (`git diff HEAD -- …` 비어 있음). 신규 의존성 0.

## 공개 API

```ts
projectCasePreviewGeometry(document, { modelId, templateId })
  -> PreviewProjectionResult<{ modelLogicalSize:{width,height},
                               zones:[{ id, sourceIndex, percentRect{x,y,width,height} }] }>

projectFramePreviewGeometry(document, { frameSizeId, templateId })
  -> PreviewProjectionResult<{ aspect, borderPercentOfWidth, matColor }>

PreviewProjectionResult<T> = { ok:true, value:T, diagnostics } | { ok:false, code, diagnostics }
```

- **error code 8종**: `INVALID_INPUT`·`INVALID_COLLECTION`·`ITEM_NOT_FOUND`·`AMBIGUOUS_ITEM`·`INVALID_ITEM`·`INVALID_GEOMETRY`·`UNSUPPORTED_ZONE_SHAPE`·`UNSUPPORTED_FRAME_TEMPLATE`
- **diagnostic code 5종**: `LEGACY_ZONES_ALIAS`·`PHOTO_SLOT_FALLBACK`·`INVALID_MAT_COLOR`·`INNER_BORDER_OMITTED`·`ALPHA_OUTLINE_OMITTED` (`code`+`collection`+선택적 `sourceIndex`만)

## Q1~Q14가 코드에 반영된 방식

| Q | 코드 반영 |
| --- | --- |
| Q1 케이스 색 | API·output에 없음(레거시 `#1A1A1A` 미채택) |
| Q2 액자 색 | API·output에 없음, **첫 색 자동 선택 없음** |
| Q3 logical | 케이스 `modelLogicalSize`(모델 w/h)만, 액자 `aspect`만. px 크기 미생성 |
| Q4 zone id | **원본 index** 기반 `case-zone-<index>`, 재번호 없음 |
| Q5 원형·라운드 | `UNSUPPORTED_ZONE_SHAPE`로 **전체 실패**(사각 근사·조용한 제외 0) |
| Q6 inner border | output 제외 + `INNER_BORDER_OMITTED` |
| Q7 alpha 색 | 생략 + `ALPHA_OUTLINE_OMITTED`, 불투명 근사 없음 |
| Q8 multi-zone | `UNSUPPORTED_FRAME_TEMPLATE` |
| Q9 thickness | size별 → top-level까지만, **`5.5` 하드코딩 없음**, 둘 다 없으면 실패 |
| Q10 template 미선택 | blank ID·lookup 실패 = 명시적 실패 |
| Q11 zone 검증 | 이 경계에서 런타임 검증(read 계약 무확장) |
| Q12 size별 thickness | opaque 값이 유한 양수일 때만 우선(타입 승격 없음) |
| Q13 운영 분포 | 합성 fixture만, `NOT VERIFIED` 유지 |
| Q14 `prevMaxW` | 미사용 |

## 케이스 zone 공급원·ID·shape 규칙

1. `photoZones`(배열) → 2. `zones`(alias, diagnostic) → 3. 단일 `photoSlot`(diagnostic) → 4. 없으면 `INVALID_GEOMETRY`.
**명시적으로 존재하는 빈 배열은 fallthrough 없이 실패**(`photoSlot`으로 덮지 않음).
zone별: plain object · `x/y` 유한 · `w/h` 양수 · **정확한 0..100 경계 내**(clamp·정수화 없음) · `type` 부재/`""`/`"rect"`만 사각 · `cornerR>0`·미지 `type`·`circle` → `UNSUPPORTED_ZONE_SHAPE`. 원본 순서 유지, id는 원본 index로 합성.

## 액자 aspect·thickness·template·mat 규칙

- `aspect`: `frameSizes[].aspect` 유한 양수 필수(레거시 `‖1` 미복제)
- `borderPercentOfWidth`: size별 `frameThickness` → top-level `frameThickness`. **상위가 존재하지만 invalid면 하위로 숨기지 않고 실패**, 둘 다 없으면 실패
- template: **단일 full-mat 사각형만 지원** — uploaded(zone 데이터 없음 / 단일 `0,0,100,100` zone·photoSlot), builtin **`full`**. `duo`·`trio`·`text_only`·`top_text`·미지 builtin id·미지 `type` → `UNSUPPORTED_FRAME_TEMPLATE`, builtin `circle`·원형 zone → `UNSUPPORTED_ZONE_SHAPE` (근거 `mockup:3134-3140`, `:3044-3047`, `:3069-3074`)
- `matColor`: 플래그 3별칭(`true/1/'1'/'true'/'on'`) + 색 4별칭, **정확한 `#RRGGBB`만**, canonical 대문자, 그 외/비활성 → `#FFFFFF`(원문 미보존, 유효 후보가 있었으면 `INVALID_MAT_COLOR`)

## hostile 입력·누출 방지 테스트 목록

null/undefined/primitive/array document · `data` 비객체 · malformed selection(null·primitive·필드 누락·비문자열) · **throwing getter**(document `data`, zone `x`) · **Proxy get trap** · **revoked Proxy** · hostile selection Proxy → 전부 throw 0 + 실패 Result. blank/공백 ID 거부 · trim된 ID가 다른 item을 찾지 않음 · 중복 ID `AMBIGUOUS_ITEM` · 비배열 collection `INVALID_COLLECTION` · 비 plain-object item `INVALID_ITEM` · primitive/nullish 항목 skip · **성공·실패 직렬화에 이름/ID/categoryId/`data:`/base64/path 0** · deep-freeze 입력 비변형 · 동일 입력 deep-equal · JSON round-trip 동일 · 실패 payload 키 = `ok/code/diagnostics`.

## 게이트 결과

| 항목 | 값 |
| --- | --- |
| frozen install / lockfile diff | exit 0 / **0** |
| format · lint · typecheck | PASS |
| **unit** | **568** (472 → 568, preview 96 신규) |
| build | mockup JS 217.69 kB·gzip **68.40** / CSS 11.32 kB·gzip **3.16**, admin 193.53·**61.09** / 8.54·**2.64** — 전부 동일 |
| **e2e** | **57 PASS**(신규 E2E 0) · reporter 요약 · **exit 0 자체 종료** |
| 포트·잔류 | 4183/4184 free · 저장소 소속 잔류 0 · **OS temp `denn-e2e-*` 잔여 0** |
| 고객 dist | 파일 목록+**SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| check · `git diff --check` | PASS · clean |
| PNG | 재생성된 스펙018 2개 복원·**미커밋** |

## NOT TESTED / 미착수

실제 published catalog의 opaque caseTemplate 변형 분포(합성 fixture만) · 실제 운영 데이터 · Canvas 연결·실제 미리보기 픽셀 · CORS-clean · 실기기 = **NOT TESTED**. 색 선택·사용자 이미지·CSS logical size·`PreviewRenderPlan` 조립·표현 불가 shape의 render 어휘 확장 = **후속 스펙**. `firebase.json` `hosting.public:"."` 위험 그대로 → **Hosting 격리 전 배포 금지**.

## QUESTIONS (구현하지 않음)

1. 퍼센트 경계를 **정확 비교**로 구현 → `0.1+99.9`가 부동소수로 `100.00000000000001`이 되어 거부됨. 허용 오차를 임의로 만들지 않았다.
2. builtin `full`은 mat이 아니라 `P=8` 안쪽에 사진을 그림(`mockup:3130`,`:3134`) → 후속 어댑터가 imageZone을 mat 전체로 쓰면 8px 차이.
3. zone `type`의 빈 문자열(`""`)을 사각으로 인정했다(§4의 "non-empty" 표현 근거). `"rect"`만 허용할지 결정 필요.
4. `frameThickness` 존재 판정에서 `null`을 "존재-but-invalid"로 보아 실패시켰다. 부재로 볼지 결정 필요.
5. 실패 Result는 §2 형태(`code`+`diagnostics`)를 지켜 **실패 zone의 index를 노출하지 않는다**. 필요하면 계약 확장이 필요하다.
