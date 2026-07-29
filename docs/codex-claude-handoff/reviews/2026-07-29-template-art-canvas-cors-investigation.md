# 스펙 028 사전 조사 — 템플릿 아트 Canvas 합성·CORS-clean 계약 (읽기 전용)

- 일자: 2026-07-29
- 기준 HEAD: `beb16ea`(스펙 027 승인·종료 지점)
- 범위: `Automation/NEXT_CLAUDE_PROMPT.md`의 조사 12항목
- **구현·설정·테스트·PNG·lockfile 변경 0. 실제 Firebase GET·이미지 다운로드·live test·CORS 변경·Rules/Hosting/deploy 0.**
- 운영 URL·token·base64를 이 문서에 복사하지 않았다. 근거는 파일·라인과 필드명으로만 적는다.
- 표기: `CONFIRMED`(코드 근거로 확정) · `NOT DECIDED`(제품/계약 결정 필요) · `NOT VERIFIED`(운영 실측 불가) · `NOT TESTED`(실행 안 함)

> 한 줄: **템플릿 아트는 "이미지를 하나 더 그리는 일"이 아니다.** 레거시 아트 경로는 ① 캔버스/맷 rect에 **stretch**로 그리고
> ② 일부 업로드 템플릿은 **아트 픽셀을 읽어 crop rect를 추정**하며 ③ 그 픽셀 읽기는 **CORS-clean이 아니면 실패**한다.
> 현재 render-plan 어휘에는 stretch도 source-crop도 없다.

---

## 1. Q1 — 레거시 템플릿 아트의 layer 순서·좌표·clip·opacity·fallback

### 1.1 케이스 (`CONFIRMED`)

`denn-mockup-tool.html:1651-1683` (`renderCase`)

| 순서 | 레이어 | 좌표/clip |
| --- | --- | --- |
| 1 | body 채우기 | `drawCaseBody(ctx, W, H, r)` — 캔버스 전체(라운드 사각) |
| 2 | zone 사진 | zone별 percent→px, `type==='circle'`/`cornerR`/사각 clip 후 `drawImgT`(cover+pan clamp) — `:1660-1672` |
| 3 | **템플릿 아트** | `ctx.drawImage(tplImg, 0, 0, W, H)` — **캔버스 전체에 stretch**, clip 없음, `globalAlpha` 설정 없음(=1) — `:1679` |
| 4 | 카메라/MagSafe/post | `drawCams` → `drawMagsafeLayer`(옵션) → `drawPost` — **모두 아트 `onload` 콜백 안** |

- 아트 진입 조건: `curCTpl && curCTpl.id!=='none' && curCTpl.dataUrl` (`:1658`).
- **fallback**: `tplImg.onerror` **핸들러가 없다**(`:1679`). 아트 로드가 실패하면 3·4단계가 통째로 실행되지 않아
  **카메라/MagSafe/가이드까지 사라진 상태로 멈춘다**. 매 렌더마다 `new Image()`를 만들어 캐시도 없다.
- 아트가 없는 템플릿(`id==='none'` 또는 `dataUrl` 없음)은 `:1681`의 단순 사진 배치 경로로 빠진다.

### 1.2 액자 (`CONFIRMED`)

`denn-mockup-tool.html:3118-3145` + `:3093-3097`

| 순서 | 레이어 | 좌표/clip |
| --- | --- | --- |
| 1 | 프레임 body | `fillRect(0,0,W,H)` + grain/gradient — `:1763-1766` 계열 |
| 2 | mat | `fillRect(IX,IY,IW,IH)`(+ 지원 variant에서만 `strokeRect` 테두리) — `:3129` |
| 3 | 사진 | uploaded면 `drawUploadedTemplatePhotos(...)`, builtin이면 `drawSlot(cx,cy,cw,ch)`(P=8 inset) — `:3133-3134` |
| 4 | **템플릿 아트(uploaded 전용)** | `loadImg(tplSrc, ov => drawUploadedTemplateOverlay(ctx, ov, tpl, IX, IY, IW, IH, ...))` — `:3133` |
| 5 | 텍스트/시계/흰 내부보더 | 아트 다음, `rect(IX,IY,IW,IH)` **clip 안에서** 그린다 — `:3133`, `afterContent()` `:3131` |

`drawUploadedTemplateOverlay` (`:3093-3097`) 분기:

- `designCanvasTemplate(tpl)` → `ctx.drawImage(ov, IX, IY, IW, IH)` = **mat rect에 stretch**
- 그 외 + `needsLegacyBuilderCrop(tpl)` → `detectLegacyInnerRect(ov)`로 얻은 source rect로 **9-인자 source-crop** `drawImage`
- crop 실패(`null`)면 다시 전체 stretch

- **opacity**: 아트 경로에 `globalAlpha` 설정 없음(=1). 파일 내 `globalAlpha` 사용처는 워터마크/룸 계열뿐(`:1873`, `:4083-4090`) — `CONFIRMED`.
- **fallback**: `loadImg` 실패 시 `if(!ov){afterContent();return}` — **아트만 생략하고 사진·텍스트·시계는 계속 그린다**(`:3133`).
  케이스와 정반대 동작이다.
- builtin 액자(`full`/`duo`/`trio`/`text_only`/`top_text`)에는 **아트 이미지가 없다**(슬롯+텍스트만, `:3134-3140`) — `CONFIRMED`.

### 1.3 도출

- 케이스 아트 = **캔버스 전체 stretch**, 액자 아트 = **mat rect stretch 또는 source-crop**.
- 두 경우 모두 **cover 아님**(현재 어휘의 `draw-image-cover`는 잘림/확대를 전제).
- 실패 정책이 제품 두 곳에서 서로 다르다(케이스=렌더 중단, 액자=아트 생략).

---

## 2. Q2 — 스펙 018 projection·trust boundary를 Canvas decode에 재사용 가능한가

| 사실 | 근거 | 판정 |
| --- | --- | --- |
| `projectCatalogTemplateImage(document,{templateKind,templateId})` → `{status:"available", sourceKind:"data-image"\|"https-image", value}` 또는 `unavailable(reason: none\|generated-preview\|invalid-reference)` | `packages/shared/src/catalog/images/project.ts:20-29,89-110` | **CONFIRMED — 그대로 재사용 가능** |
| case는 `dataUrl`만, frame은 `dataUrl→sourceDataUrl→builderArtDataUrl→artDataUrl→originalDataUrl` | `project.ts:31-39` (레거시 `templateSourceForDesign` `denn-mockup-tool.html:3025`와 동일) | **CONFIRMED** |
| `generatedDetailPreview === true`면 전체 체인 차단 | `project.ts:95-97`, 레거시 `:3025` | **CONFIRMED** |
| `storagePath`는 소스가 아니다(URL로 만들지 않는다) | `project.ts:6-7` | **CONFIRMED** |
| `resolvePublicImageSource`가 `data:`는 무판정 통과, https는 **호스트=`firebasestorage.googleapis.com` + 경로 `/v0/b/<bucket>/o/`** 만 통과 | `packages/firebase/src/public-images/trust.ts:25-27,33-54` | **CONFIRMED** |
| 두 함수 모두 **순수·동기·네트워크 0** | `project.ts:83-88`, `trust.ts:1-5` | **CONFIRMED** |

**결론**: 아트의 "무엇을 로드해도 되는가" 판정은 **이미 존재하고 Canvas와 무관하다**. 스펙 028은 이 두 경계를 **그대로 재사용**하고,
새로 정의할 것은 그 다음 단계(decode 소유자·CORS 속성·plan 표현)뿐이다.

주의: 현재 `TemplateThumbnail`은 이 결과를 `<img src>`로만 쓰고 **Canvas에 그리지 않으며 `crossOrigin`도 설정하지 않는다**
(`apps/mockup/src/browse/TemplateThumbnail.tsx:1-4,36`) — 즉 지금까지는 taint가 문제되지 않았다. `CONFIRMED`.

---

## 3. Q3 — `crossOrigin` 설정 시점 · bucket CORS 요구 · taint 판정

| 항목 | 내용 | 판정 |
| --- | --- | --- |
| 설정 시점 | `crossOrigin`은 **`src` 대입 전에** 설정해야 한다. 레거시는 `HTMLImageElement.prototype.src` **setter를 패치**해 `firebasestorage.(googleapis.com\|app)` URL이면 자동으로 `crossOrigin='anonymous'`를 넣는다(`denn-mockup-tool.html:11638-11662`, `setAttribute`도 동일 처리) | **CONFIRMED** |
| 적용 대상 판정 | `needsCors(v)` = `data:`/`blob:` 제외 + `/firebasestorage\.(googleapis\.com\|app)/i` 매치 (`:11646-11650`) | **CONFIRMED** |
| 개별 지정 | 일부 경로는 직접 `img.crossOrigin='anonymous'`(`:12119`, `:12764`) | **CONFIRMED** |
| ⚠️ 위험한 레거시 폴백 | crossOrigin 로드 실패 시 **crossOrigin 없이 재시도**(`:12136-12138`) → 성공하면 **캔버스가 taint**되어 인쇄 파일이 0×0이 된다(CLAUDE.md §4-7). **복제 금지 대상** | **CONFIRMED** |
| bucket CORS 요구 | `crossOrigin='anonymous'` 요청이 성공하려면 Storage 버킷이 **`Access-Control-Allow-Origin`** 을 응답해야 한다. 실패 시 이미지는 **로드 자체가 실패**(`onerror`)한다 — 로드된 뒤 taint되는 게 아니다 | **CONFIRMED(브라우저 계약)** |
| taint 판정 방법 | tainted canvas에서 `getImageData`/`toBlob`/`toDataURL`이 `SecurityError`를 던진다. 즉 **preview 그리기만 하면 taint를 감지할 수 없고**, 픽셀을 읽는 순간(인쇄/내보내기/legacy crop 감지)에만 드러난다 | **CONFIRMED(브라우저 계약)** |
| 현재 실행기 | executor는 `drawImage`만 호출하고 픽셀을 읽지 않는다(`apps/mockup/src/canvas/types.ts:19-33`) → **아트를 그려도 preview 자체는 taint 여부와 무관하게 보인다** | **CONFIRMED** |
| 운영 버킷의 실제 CORS 설정 | 이 조사에서 네트워크 접근 금지 → 확인 불가 | **NOT VERIFIED** |
| 다운로드 URL token 수명 | 동일 이유로 확인 불가 | **NOT VERIFIED** |

**핵심 함의**: preview만 보면 CORS 문제가 **조용히 통과**하고, 나중에 인쇄/export 단계에서 터진다.
따라서 스펙 028은 “아트가 그려졌다”가 아니라 **“CORS-clean으로 로드됐다”를 명시적으로 확인·기록**해야 한다.

---

## 4. Q4 — 운영 URL 없이 합성 fixture만으로 검증 가능한 경계

| 검증 가능(합성 fixture) | 방법 |
| --- | --- |
| `crossOrigin` 속성이 `src` **이전에** 설정되는가 | 테스트 측에서 `HTMLImageElement` 생성/속성 순서를 관측(스펙 026·027에서 쓴 `addInitScript` 계측과 동일 방식) |
| **ACAO 없는 응답 → 로드 실패** 처리 | Playwright `route.fulfill`로 헤더 **없이** PNG 응답 → `onerror` 경로 확인 |
| **ACAO 있는 응답 → 로드 성공 + CORS-clean** | `route.fulfill`에 `Access-Control-Allow-Origin: *` 포함 → 로드 성공, 그린 뒤 **테스트 측 `getImageData`가 성공**함을 확인(= taint 아님) |
| **taint 실제 발생** | ACAO 없이 `crossOrigin` **미설정**으로 로드시켜 그린 뒤 테스트 측 `getImageData`가 `SecurityError`를 던지는지 확인(회귀 방지용 음성 대조군) |
| 아트 layer 순서·좌표·clip 픽셀 | 합성 단색/격자 PNG로 rect 경계 픽셀 비교 |
| 실패 시 UX(차단/생략) | 라우트 abort로 재현 |
| 검증 **불가**(합성으로 대체 못 함) | 운영 버킷 CORS 실제 설정, 운영 token 수명·회전, 운영 아트의 투명도/여백 분포, 실기기 브라우저별 CORS 캐시 동작 → **NOT VERIFIED / NOT TESTED** |

기존 자산 재사용 가능: `tests/e2e/mockup-preview.spec.ts`의 라우트·PNG 생성 방식, `canvas-surface.spec.ts`의 픽셀 helper.

---

## 5. Q5 — 현재 command 어휘로 템플릿 아트를 표현할 수 있는가

현재 어휘(`packages/render/src/plan/types.ts`, `apps/mockup/src/canvas/types.ts:19-33`):
`fill-rect` · `stroke-rect` · `draw-image-cover`(clipRect + drawRect, 5-인자 `drawImage`만).

| 레거시 아트 그리기 | 현재 어휘로 표현? | 판정 |
| --- | --- | --- |
| 케이스: 캔버스 전체 stretch `drawImage(art,0,0,W,H)` | `draw-image-cover`의 drawRect를 캔버스로 두면 **좌표는 같아지지만 의미가 다르다**. cover는 "종횡비 유지 + 잘림"이고 실제 필요한 것은 **비율 무시 stretch**. 아트의 종횡비가 캔버스와 다르면 **다른 그림이 나온다** | **표현 불가(의미 불일치)** |
| 액자 uploaded: mat rect stretch | 위와 동일 | **표현 불가(의미 불일치)** |
| 액자 legacy builder crop: 9-인자 source-crop | 실행기가 **source-crop 오버로드를 의도적으로 배제**했다(`canvas/types.ts:19-33` 주석) | **표현 불가** |
| 아트 위 텍스트/시계 | 이번 범위 밖(스펙 027 제외 항목) | 해당 없음 |

**권고**: `draw-image-cover` 재사용은 **의미적으로 안전하지 않다**. 최소 하나의 신규 command
(예: `draw-image-stretch` = clipRect + destRect, 종횡비 무시)가 필요하고, legacy crop이 필요한 템플릿은
**지원 대상에서 제외**하거나 별도 command(source rect 포함)를 도입해야 한다 — 후자는 `packages/render` 계약 확장이므로
**Codex 결정 항목**이다. `NOT DECIDED`.

---

## 6. Q6 — 템플릿 종류별 지원/거부 계약

| 종류 | 아트 존재 | 현재 preview 지원 상태 | 스펙 028에서 제안 |
| --- | --- | --- | --- |
| **case uploaded**(`dataUrl` 있음) | 있음(캔버스 전체 stretch) | 아트 없이 body+사진만 렌더 중 | stretch command 도입 시 **지원 가능** |
| **case**(`id==='none'` 또는 `dataUrl` 없음) | 없음 | 정상 | 그대로 |
| **frame builtin `full`** | **없음**(슬롯+텍스트만) | 지원 중(스펙 023/027) | 변경 없음 — **아트 필요 없음** |
| frame builtin `duo`/`trio`/`text_only`/`top_text` | 없음 | 스펙 023이 **미지원으로 실패** | 변경 없음(별도 스펙) |
| **frame uploaded + design source + `designCanvasTemplate`** | 있음(mat rect stretch) | 아트 없이 렌더 | stretch command 도입 시 **지원 가능** |
| **frame uploaded + legacy builder crop 필요** | 있음(픽셀 분석 crop) | 아트 없이 렌더 | **거부 권고**(픽셀 읽기 + source-crop 필요, §7) |
| **generated preview**(`generatedDetailPreview===true`) | 없음(차단) | projection이 `unavailable`로 차단 | **아트 없이 렌더 유지**(현행 그대로) |

`detectLegacyInnerRect`(`denn-mockup-tool.html:3076-3091`)는 아트를 축소 캔버스에 그린 뒤 **`getImageData`로 밝기 히스토그램을 만들어**
안쪽 사각형을 추정한다. 즉 **CORS-clean이 아니면 이 경로 자체가 SecurityError**이고, 결정적이지도 않다(임계값 `.42`, `minRun` 등 휴리스틱).
결정적 render-plan과 상성이 나쁘다. `CONFIRMED`.

---

## 7. Q7 — 템플릿 아트 decode owner의 API·cache identity·stale·cleanup

스펙 026 로컬 이미지 owner와 **다른 점**이 본질이다.

| 항목 | 로컬 사진(스펙 026) | 템플릿 아트(신규 필요) |
| --- | --- | --- |
| 입력 | `Blob`(사용자 파일) | **문자열 소스**(`data:` 또는 신뢰된 https) — projection+trust 통과분만 |
| URL 소유 | owner가 blob URL을 만들고 **1회 revoke** | **revoke 대상 없음**(외부 URL). 대신 **`crossOrigin`을 src 이전에 설정**해야 함 |
| 캐시 identity | 없음(매번 새 파일) | 같은 템플릿을 반복 선택하므로 **캐시가 의미 있음**. 후보 키 = (sourceKind, value) 해시가 아니라 **소스 문자열 자체** → 문자열이 메모리에 남는다(비밀 경계 §8) |
| stale | generation으로 늦은 완료 차단(`localImageBinding.ts`) | **동일 패턴 필요**(템플릿 전환이 빈번) |
| cleanup | dispose에서 handler·URL·binding 회수 | handler·binding 회수 + **캐시 수명 정책 필요**(무한 보존은 레거시의 실패 사례: `window.__denn*Cache` `:2743`, `:3040`, `:3180`) |
| 실패 | `DECODE_FAILED` 등 고정 code | 동일 + **CORS 실패와 일반 로드 실패를 구분할 수 없음**(브라우저가 이유를 알려주지 않음) → 단일 code 권고 |

**권고 API 초안**(구현 아님): 스펙 026 controller와 같은 모양(`getSnapshot/subscribe/load/clear/dispose/bindings`)에
입력만 `{sourceKind, value}`로 바꾼 별도 owner. `load` 시 `image.crossOrigin = "anonymous"`를 **`src` 대입 전에** 설정하고,
`data:` 소스에는 설정하지 않는다(불필요하며 일부 브라우저에서 부작용). `NOT DECIDED`(캐시 정책·code 집합은 Codex 결정).

---

## 8. Q8 — 사용자 사진 binding과 아트 binding 결합 시 namespace·비밀 경계

- 스펙 027이 이미 **slot namespace**를 쓴다: plan의 ref는 `<slotId>.<ownerRef>`이고 lookup은
  `withImageRefPrefix`로 자기 namespace만 응답한다(`apps/mockup/src/canvas/compositeImageBindings.ts`). 아트는
  `template-art.` 같은 **별도 namespace 하나**를 추가하면 충돌 없이 합쳐진다. `CONFIRMED(패턴 존재)`
- **비밀 경계**: `imageRef`는 스펙 020 문법(알파뉴메릭 + `. _ -`)이라 **URL을 담을 수 없다**
  (`packages/render/src/plan/build.ts:28-40`). 아트 소스 문자열(https 다운로드 URL·token 또는 base64)은
  **owner closure 안에만** 남아야 하며 plan·React state·DOM·로그·storage에 넣으면 안 된다 —
  스펙 018/026/027이 이미 강제해 온 규칙과 동일. `CONFIRMED`
- 위험 지점: 캐시 키로 소스 문자열을 쓰면 **문자열이 오래 살아남는다**. 키를 owner 내부 Map에만 두고
  **밖으로 노출하지 않는 것**이 전제. `NOT DECIDED`(캐시 키 설계).

---

## 9. Q9 — 아트 로드 실패 시 정책

| 후보 | 레거시 근거 | 평가 |
| --- | --- | --- |
| **아트만 생략하고 계속**(body+사진+텍스트) | 액자 경로가 정확히 이렇게 한다(`:3133` `if(!ov){afterContent();return}`) | 레거시 일관성 있음. 단 **고객이 실제 상품과 다른 그림을 본다** |
| **preview 차단(안내만)** | 케이스 경로는 사실상 이 결과(아트 실패 시 이후 레이어까지 중단, `:1679`) — 다만 **의도된 설계가 아니라 핸들러 누락의 부작용** | 안전하지만 아트 있는 템플릿에서 preview가 자주 비어 보일 수 있음 |
| **placeholder 표시** | 레거시 근거 **없음**(썸네일 placeholder는 목록 UI 전용, `TemplateThumbnail.tsx:20-26`) | 새 제품 결정 |

→ **`FOUNDER_DECISION_REQUIRED`**: 아트 로드 실패 시 ① 아트 생략 후 계속 ② preview 차단 ③ placeholder 중 무엇인가.
케이스/액자를 **동일 정책**으로 통일할지도 함께 결정 필요. `NOT DECIDED`

---

## 10. Q10 — 최소 구현 순서와 허용 파일 후보 (print/pointer보다 먼저)

권고 순서(각 단계가 독립적으로 검증 가능):

1. **plan 어휘 확장 결정**(§5) — `packages/render` 계약 변경이므로 **Codex 스펙 필요**. 이것이 정해지기 전에는 앱 작업 불가.
2. **아트 decode owner**(`apps/mockup/src/canvas/**`) — `crossOrigin` 순서, generation, 캐시, 실패 code. 합성 fixture로 CORS 성공/실패 대조.
3. **projection → plan 조립 확장**(`apps/mockup/src/preview/**`) — 지원 variant만 아트 레이어를 추가, 미지원은 현행 유지.
4. **고객 `/` E2E** — 아트 픽셀·layer 순서·실패 정책·누출 0.
5. 그 다음에야 print/export(여기서 taint가 실제로 문제됨)와 pointer/pan/zoom.

허용 파일 후보: `packages/render/src/plan/**`(1단계 결정 시), `apps/mockup/src/canvas/**`,
`apps/mockup/src/preview/**`, 대응 unit test, `tests/e2e/mockup-preview.spec.ts`(또는 신규 spec), 문서.
`packages/firebase`·`packages/shared`는 **재사용만 하고 변경 불필요**(§2).

---

## 11. Q11 — `NOT VERIFIED` 항목

- 운영 Storage 버킷의 **실제 CORS 구성**(ACAO 헤더 유무·허용 origin 목록)
- 다운로드 URL **token의 수명·회전 여부**
- 운영 카탈로그의 아트 분포: uploaded vs builtin 비율, `designCanvasTemplate` 조건 충족 비율,
  **legacy builder crop이 필요한 템플릿이 실제로 존재하는지**
- 운영 아트의 투명도/여백 특성(= stretch 시 시각 품질)
- 브라우저별 CORS 캐시 동작(같은 URL을 `crossOrigin` 없이 먼저 로드한 뒤 재요청할 때의 캐시 오염)

---

## 12. Q12 — Firebase/Hosting 변경 또는 실제 network가 필요한 지점 (STOP 조건)

| 지점 | 필요 여부 | 처리 |
| --- | --- | --- |
| 버킷 CORS가 실제로 ACAO를 주지 않는 경우 | **Firebase Storage CORS 설정 변경 필요** | **STOP** — CLAUDE.md §4·런북 §보안 위반. Founder 승인·별도 스펙 |
| 운영 이미지로 실제 로드 검증 | 실제 network 필요 | **STOP**(스펙에 명시 승인 없으면) |
| Rules/Hosting/`hosting.public` | 이번 범위에서 불필요 | 변경 금지 유지 |
| 합성 fixture 기반 CORS 성공/실패 검증 | 불필요(라우트로 헤더 제어) | 자동 진행 가능 |
| `packages/render` 어휘 확장 | 계약 변경 | **Codex 스펙 필요**(임의 확장 금지) |

---

## 13. 요약 — 결정이 필요한 항목

| # | 항목 | 종류 |
| --- | --- | --- |
| D-1 | 아트를 위한 **신규 command**(stretch) 도입 여부와 이름·계약 | Codex(계약) |
| D-2 | **legacy builder crop 템플릿 지원/거부** (픽셀 분석 + source-crop 필요) | Codex(계약) |
| D-3 | 아트 **로드 실패 정책**(생략/차단/placeholder)과 case·frame 통일 여부 | **Founder** |
| D-4 | 아트 **캐시 정책**(키·수명·상한)과 소스 문자열 보존 경계 | Codex |
| D-5 | 운영 버킷 CORS 미설정으로 판명될 경우의 처리(설정 변경은 Founder 승인 사항) | **Founder** |

## 14. 이 조사에서 하지 않은 것

- 실제 Firebase GET·이미지 다운로드·live test·CORS 설정 변경·Rules/Hosting/deploy: **0**
- 코드·설정·테스트·PNG·lockfile 변경: **0**
- 구현 스펙 작성·다음 기능 착수: **없음**(Codex 판정 대기)
