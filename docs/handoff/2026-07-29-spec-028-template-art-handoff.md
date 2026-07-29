# 스펙 028 인계 — 템플릿 아트 stretch command·CORS-clean binding

- 일자: 2026-07-29
- 기준 HEAD: `7a2b2cd`(Codex 스펙 커밋) → 코드/test 커밋 `f7b3f61`
- 스펙 정본: `docs/rebuild/specs/028-template-art-stretch-cors-owner.md`
- Founder 결정: **아트 실패 시 미리보기 차단(fail-closed)**
- 상태: 구현·자체 검증 완료 → Codex 독립 검증 대기. **스펙 종료 아님.**

> ⚠️ 이 완료는 **합성 fixture에서 CORS-clean 템플릿 아트를 fail-closed로 합성한 단계**다. 운영 bucket CORS,
> 운영 이미지, 실기기, print/export CORS-clean, pointer, 주문·배포 완료가 아니다.

---

## 1. 변경 파일 (허용 목록 안, 커밋 `f7b3f61`)

| 파일 | 성격 |
| --- | --- |
| `packages/render/src/plan/types.ts` | `draw-image-stretch` command + 선택적 `templateArt` 입력 |
| `packages/render/src/plan/build.ts` | 아트 1회 읽기·검증·layer 순서 |
| `packages/render/src/plan/build.test.ts` | 신규 unit |
| `packages/shared/src/catalog/images/placement.ts` | 신규 placement projection |
| `packages/shared/src/catalog/images/placement.test.ts` | 신규 unit |
| `packages/shared/src/catalog/images/index.ts` | export 2줄 |
| `apps/mockup/src/canvas/executePreviewPlan.ts` (+ test) | stretch 실행 |
| `apps/mockup/src/canvas/templateArtBinding.ts` (+ test) | 신규 아트 owner |
| `apps/mockup/src/canvas/useTemplateArtBinding.ts` | 얇은 React wrapper |
| `apps/mockup/src/canvas/productPlan.ts` (+ test) | 아트 key → destRect |
| `apps/mockup/src/preview/PreviewComposer.tsx` (+ test) | 연결·fail-closed |
| `apps/mockup/src/preview/previewContracts.ts` | 고정 안내 문구 2개 |
| `tests/e2e/mockup-preview.spec.ts` | 실제 Chromium E2E 7건 |

허용 파일 밖 변경 **0**(`packages/firebase` 재사용만, admin·운영 HTML·Firebase 설정/Rules·POC·PNG·manifest·lockfile 무변경), 신규 의존성 **0**.

## 2. 계약 이행

| 스펙 항목 | 구현 |
| --- | --- |
| §1 신규 command | `draw-image-stretch {layerId, imageRef, destRect}` — 5-인자 `drawImage`로 destRect를 채운다. source rect/crop·9-인자·opacity·blend·transform·rotation **없음**. destRect는 유한·양수이며 logical canvas에 **완전히 포함**(clamp·shrink 0). imageRef는 기존 제한 식별자 문법 그대로. executor는 **preflight 후** 그린다. 오류 code 집합 **무확장** |
| §2 layer 순서 | case: body → zone 사진 → `case:template-art` → guides / frame: body → mat → 사진 → `frame:template-art` → inner border. `templateArt`는 **명시됐을 때만** command가 생기고 호환 fallback 없음 |
| §2 destRect | case = logical canvas 전체, frame = matRect (adapter가 계산) |
| §3 legacy crop 거부 | `projectCatalogTemplateArtPlacement`가 `none` / `stretch(case-canvas\|frame-mat)` / `unsupported(legacy-builder-crop\|invalid-template)`만 반환. 판정은 레거시 `templateSourceForDesign`·`builderTemplate`·`needsLegacyBuilderCrop`(`denn-mockup-tool.html:3025-3028`) 그대로. **source 문자열·field name·ID·raw template 미노출**, hostile 입력에 throw 0 |
| §4 decode owner | 입력은 trust boundary 통과분 `{kind, src}`. **remote는 `crossOrigin="anonymous"`를 `src`보다 먼저**, `data-image`는 미설정. `template-art-<generation>` key, generation으로 stale 차단, clear/dispose에서 handler·binding 회수, **cache 없음**(같은 소스도 다시 로드). onerror는 **원인 구분 없는 단일 code**, **crossOrigin 없는 재시도 0** |
| §4 정보 경계 | `src`는 owner closure와 실제 drawable 안에만. 공개 snapshot·Result·오류·DOM·storage·plan에 **0** |
| §5 fail-closed | trust 실패 / legacy crop unsupported / loading / decode 실패 / binding 누락 → **Canvas 렌더 0**, 고객에게는 고정 문구 `템플릿 이미지를 불러오지 못해 미리보기를 표시할 수 없습니다.`(로딩 중에는 준비 문구). 아트가 **원래 없는** builtin·no-source·generated-preview는 기존 preview 유지 |
| §연결 | placement → `projectCatalogTemplateImage` → `resolvePublicImageSource` → owner. art binding은 `template-art.` namespace로 기존 composite에 합류. selection/template 변경 시 composer가 remount돼 owner가 dispose되고 이전 plan·Canvas가 즉시 사라진다 |

## 3. 실제 Chromium E2E (고객 `/`, 신규 7건)

| # | 검증 |
| --- | --- |
| 1 | case + `data:` 아트 → **캔버스 전체 stretch**, 불투명 좌반부가 사진 위에 보이고 우반부(투명)로 사진이 비침. `data:`는 **network 요청 0** |
| 2 | frame + 신뢰 URL 아트(ACAO 응답) → **anonymous 요청 1회**, mat rect에만 stretch(프레임 밴드는 아트색 아님), **테스트 측 `getImageData` 성공 = CORS-clean** |
| 3 | 아트 로드 실패 → **Canvas 0** + 고정 안내, **anonymous 요청 정확히 1회**(재시도 0) |
| 4 | legacy builder crop variant → **요청 전에 차단**(anonymous 요청 0) |
| 5 | builtin 액자 → 기존 art-free preview 유지, 아트 요청 0 |
| 6 | 아트 있는 선택 → 다른 선택으로 전환 → 새 preview가 이전 아트로 오염되지 않음 |
| 7 | 아트 URL·token·`alt=media`·`base64`·source kind·실패 code가 text/ARIA/data-*/storage/location/console에 **0**(스펙 018이 허용한 **썸네일 `img[src]` 한 곳만** 제외) |

### 3.1 ⚠️ 시뮬레이션 한계 (정직 기록)

**ACAO 헤더가 없는 응답을 재현할 수 없다.** Playwright의 `route.fulfill`이 채운 응답에는
`access-control-allow-origin`이 자동으로 붙는다(실측: ACAO를 넣지 않고 fulfill해도 anonymous 로드가
**성공**하고 canvas가 **readable**이었다). 따라서 **"ACAO 없음 ⇒ 로드 실패"는 `NOT TESTED`** 이며,
E2E가 증명하는 것은 **로드가 실패했을 때 fail-closed로 닫히고 재시도하지 않는다**는 계약이다(실패는
`route.abort()`로 재현).

부수 관측(참고): 같은 아트 URL을 **스펙 018 썸네일 `<img>`(CORS 없음)** 이 먼저 요청하고 그 다음 owner가
anonymous로 요청한다(요청 태그 `plain` → `cors`). 이 환경에서는 anonymous 로드가 정상적으로 CORS-clean이었다.
브라우저 캐시가 non-CORS 응답을 anonymous 요청에 재사용해 taint를 유발할 수 있는지는 **NOT VERIFIED**다.

## 4. 게이트 실측

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, lockfile diff **0**, 신규 의존성 0 |
| `format:check` / `lint` / `typecheck` | PASS |
| `test:unit`(= `check`) | **876 PASS**(802 → 876, 신규 74), 35 파일 |
| build mockup | JS **248.29 → 253.92 kB**(gzip **77.55 → 78.82**), CSS **13.80 kB / 3.53** = **무변경** |
| build admin | 193.53 / 61.09, 8.54 / 2.64 = **무변경** |
| `test:e2e` | **85 PASS**(78 → 85, 신규 7), reporter 요약, **exit 0 자체 종료 16.2초** |
| `git diff --check` | clean |
| 포트 4183·4184 | free |
| OS temp `denn-e2e-*` | 잔여 **0** |
| 고객 dist | mockup·admin **SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| 네트워크 / live / deploy | **0**(합성 route만, 그 외 요청 abort·카운트 0) |

**번들 증가 원인**: 아트 owner + placement projection + stretch command/실행 경로가 고객 번들에 추가됐다
(JS gzip **+1.27 kB**). CSS는 신규 규칙이 없어 **바이트 무변경**, admin은 이 코드를 import하지 않아 무변경.

## 5. 무변경 확인

`packages/firebase`(재사용만) · `apps/admin/**` · 운영 HTML · `firebase.json`·Rules·CORS · `poc/**` ·
PNG · `package.json` · `pnpm-lock.yaml` = `git diff` **0**. E2E fixture(`canvas-fixture.tsx`)와
`canvas-surface.spec.ts`도 수정하지 않았다.

## 6. NOT TESTED · 후속

- **NOT TESTED**: 운영 bucket CORS 실제 설정, ACAO 부재 시 실제 브라우저 실패, 운영 아트 이미지,
  실기기 4환경, 실제 200% 확대, print/export의 CORS-clean(=taint) 검증, 대용량 아트 성능.
- **NOT VERIFIED**: 썸네일(non-CORS)과 owner(anonymous)가 같은 URL을 쓸 때의 브라우저 캐시 오염 가능성.
- **미착수**: legacy builder crop 지원, builtin multi-zone, text/clock/watermark, pointer/pan/zoom,
  print/export, 저장·주문, Firebase 설정/Rules/Hosting, deploy.
- `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.

## 7. PNG (Codex E2E 재생성분)

`docs/rebuild/results/spec-018/browse-desktop-1280x800.png`과 `browse-mobile-390x844.png`은 이번 라운드에서도
**restore·checkout·stage·commit 하지 않았다** → working tree dirty, 커밋된 PNG **0**.

## 8. 커밋 / 롤백

| 순서 | 커밋 | 내용 |
| --- | --- | --- |
| 1 | `f7b3f61` | 코드·테스트 (command, placement, owner, adapter, composer, E2E 7) |
| 2 | (문서) | 스펙 028 DONE, 이 인계, `CLAUDE_LIVE_PATCH_LOG.md`, `CURRENT.md` |

**롤백 순서: 문서 커밋 → 코드 커밋**(역순 revert). `7a2b2cd`로 되돌리면 라운드 전 상태다.

## 9. 보완 라운드 1 (2026-07-29) — 1회 snapshot fail-closed

기준 `cebcaad` → 코드/test 커밋 `d4fb99b`.

| 지적 | 결함 | 수정 |
| --- | --- | --- |
| 1 | `templateArtBinding`이 `source.kind`/`src`를 **예외 경계 밖에서** 읽어 hostile getter·Proxy가 `load()` 밖으로 throw할 수 있었고 drift가 검증값과 대입값을 가를 수 있었다 | `readSourceOnce()`가 경계 안에서 **각 1회** 읽어 snapshot 생성 → 검증·crossOrigin/src 대입·결과 처리 모두 snapshot만 사용. hostile 입력은 element 생성 없이 `INVALID_INPUT`으로 닫힘 |
| 2 | `placement`가 source 체인·builder marker를 helper마다 재읽어, 첫 읽기가 legacy crop이어도 drift가 근거를 지우면 **`stretch`로 fail-open** 가능 | `readTemplateOnce()`가 사용 필드 전부를 **각 1회** 읽어 boolean snapshot 생성 → 모든 판정이 snapshot 기반, 첫 snapshot이 legacy crop이면 **결과 유지** |
| 선택 | composer `artBlocked`의 `noUselessTernary` lint info | 표현식 1줄 정리(의미 변경 0) |

**유지된 계약**: crossOrigin-before-src · data URL 예외 · 재시도 0 · generation stale guard · cache 0 ·
기존 none/stretch/unsupported 결과와 오류 우선순위 · Result에 source/필드명/ID 미추가.

**신규 회귀 테스트 17건**: 필드별 read count, drifting kind/src, drifting source/marker(legacy crop 유지),
throwing getter, throwing Proxy trap, revoked Proxy.

**게이트**: frozen exit 0 · lockfile diff 0 · format·lint·typecheck / **unit 893**(876→893) /
build(mockup JS **254.06 kB**·gzip **78.90**, CSS 13.80/3.53 무변경, admin 무변경) / **e2e 85 PASS·exit 0·16.4초** /
check PASS / `git diff --check` clean / 포트 free · temp 0 · 고객 dist SHA-256 E2E 전후 동일 · fixture 0.

**PNG**: Codex E2E 재생성분 2개는 이번 라운드에서도 미복원·미커밋.

## 10. 세션 종료 (2026-07-29) — 미완 상태로 마감

Founder 지시로 세션을 마감하고 **Claude Code의 5분 자동 루프를 종료**했다(cron job 취소).

- **스펙 028은 종료되지 않았다.** `DONE`도 `CODEX_PASSED`도 아니며, Codex correction review 도중 세션이 끝났다.
- 보완 라운드 1(`d4fb99b` 코드 + `b18b652` 문서)은 push됐으나 **그에 대한 Codex 재검증은 실행되지 않았다(NOT TESTED)**.
- HEAD = origin = `b18b652`, ahead/behind 0/0, staged 0, 미추적 0.
  working tree 잔여는 §7의 PNG 2개뿐이며 이번 세션에서도 restore·checkout·stage·commit 하지 않았다.
- 다음 세션 범위는 §9의 보완 2건(ⓐ art source 예외 경계 내 단일 snapshot, ⓑ placement 전체 단일 snapshot과
  getter drift fail-open 차단)의 **재검증 또는 추가 보완**으로 한정한다. 새 기능·다음 스펙은 착수하지 않는다.
- 세션 인계 정본: `docs/handoff/2026-07-29-session-end-handoff.md`.
- 이번 마감 라운드는 **문서 전용 커밋**이며 기능 코드·설정·테스트 변경 0, 실제 network·live·Firebase·CORS·deploy 0.
