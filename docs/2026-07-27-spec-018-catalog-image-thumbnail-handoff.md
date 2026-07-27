# 스펙 018 핸드오프 — 카탈로그 이미지 참조·안전한 썸네일 (자동검증 단계 완료)

날짜: 2026-07-27
브랜치: `rebuild/modern-studio` · 기준 HEAD `fb6f078`
범위: 스펙 018만. 스펙 001~017 결과·운영본·Firebase·admin·POC·디자인 PNG 무변경.

> 이 DONE은 **합성 이미지 기반 thumbnail 자동검증 완료**다. 실제 운영 이미지·실기기·Canvas CORS-clean·출시 완료를 의미하지 않는다.

---

## 1. 변경 파일

**코드/테스트 커밋**
- `packages/shared/src/catalog/images/project.ts`·`index.ts`·`project.test.ts` (신규) — 순수 image projection
- `packages/shared/src/catalog/read.ts`·`read.test.ts`·`fixtures/index.ts` (수정) — https-in-dataUrl 인정
- `packages/shared/src/catalog/index.ts` (수정) — images export
- `packages/firebase/src/public-images/trust.ts`·`index.ts`·`trust.test.ts` (신규) — 원격 이미지 신뢰 경계
- `packages/firebase/src/index.ts` (수정) — public-images export
- `apps/mockup/src/browse/TemplateThumbnail.tsx` (신규) + `BrowseFlow.tsx`·`browse.css`·`App.tsx` (수정) — 표시 전용 썸네일
- `tests/e2e/mockup-browse.spec.ts` (수정) — 이미지 시나리오·누출·이미지 viewport matrix·스펙 018 스크린샷

**문서/핸드오프 커밋**
- `docs/rebuild/results/spec-018/browse-{mobile-390x844,desktop-1280x800}.png` (신규, 합성 fixture 시각 근거)
- 이 핸드오프 + 스펙 018 `### DONE (Claude)` + `CURRENT.md`

## 2. 이미지 projection과 신뢰 경계

- **projection(@denn/shared, 순수):** `projectCatalogTemplateImage(document, {templateKind, templateId})` → `{status:"available", sourceKind:"data-image"|"https-image", value}` | `{status:"unavailable", reason:"none"|"generated-preview"|"invalid-reference"}`.
  - browse selector와 **분리**(스펙 016 output에 이미지 필드 0). 원본 template 미반환, decode/fetch/clone/base64 재인코딩 0, `value`=원본 문자열 참조 1개.
  - 우선순위: frame=`dataUrl→sourceDataUrl→builderArtDataUrl→artDataUrl→originalDataUrl`, case=`dataUrl`만(조사 근거: case=단일 dataUrl). `generatedDetailPreview===true`→`generated-preview`. 앞 필드 빈/무효면 다음 유효 필드로. storagePath는 소스로 쓰지 않음. dual=dataUrl 계열만.
  - 분류: `data:`→data-image, `new URL` 파싱+protocol `https:`→https-image, 그 외(http/javascript/blob/상대/공백/파싱실패)→건너뜀. unknown id/kind→`unavailable`(throw 0).
- **신뢰 경계(@denn/firebase, no SDK/네트워크):** `resolvePublicImageSource({kind,value})` → `{ok:true, src, kind:"data-image"|"firebase-download-image"}` | `{ok:false, reason:"missing"|"invalid"|"untrusted"}`.
  - data-image는 URL 판정 없이 통과. https는 **protocol https: + host `firebasestorage.googleapis.com` + path가 `/v0/b/denn-products.firebasestorage.app/o/`로 시작 + userinfo 없음**만 통과, 그 외 untrusted/invalid. fetch/HEAD/preload 0, storagePath→URL 생성 0, import 시 네트워크 0.
  - token/query는 성공 결과 `src`에만. 실패 결과·오류에 URL/token 미포함(직렬화 검사).
  - 신뢰 host는 조사에서 근거 확인된 `firebasestorage.googleapis.com` **1개만**(직접 `*.firebasestorage.app` image host는 근거 없어 미추가).

## 3. dataUrl / storagePath / dual 처리

| 케이스 | projection | 표시 |
|---|---|---|
| `data:` dataUrl | available data-image | `<img src=data:…>` |
| https dataUrl(Firebase 다운로드 URL) | available https-image → 신뢰 통과 시 firebase-download-image | `<img src=https…>`(crossOrigin 없음) |
| https dataUrl(비신뢰 host/bucket) | available https-image → 신뢰 **차단** | placeholder(요청 0) |
| storagePath 단독 | unavailable(none) | placeholder |
| dual(dataUrl+storagePath) | dataUrl 계열만 사용 | dataUrl 기준 표시, **storagePath fallback 없음** |
| 없음/generatedDetailPreview/무효 문자열 | unavailable(none/generated-preview/invalid-reference) | placeholder |

- **read.ts 보완:** https dataUrl은 `INVALID_DATA_URL` 경고를 만들지 않고 dataUrl 계열 참조로 집계(`imageReferences.dataUrl`/`dual`). `data:` 유효 유지, 그 외 문자열은 기존 `INVALID_DATA_URL` 유지, storagePath URI-scheme fatal 계약 불변. 스펙 012 기존 테스트 무회귀.

## 4. thumbnail / fallback / 접근성

- 표시 전용 `<img loading="lazy" decoding="async" alt="">` — 카드의 가시 템플릿명이 접근 이름이므로 thumbnail은 장식(`alt=""`). Canvas·crossOrigin·object URL·preload 없음.
- fixed aspect-ratio box(56px×4:3, `object-fit:contain`)로 **로드 전후 layout shift 0**. placeholder도 같은 박스+"이미지 없음"(`aria-hidden` 장식) → 카드 label로 의미 유지.
- unavailable 또는 `onError`→placeholder. **stale onError 하드닝(Codex 재검증)**: `img`에 **`key={src}`** → source마다 별도 DOM 노드(이전 source의 늦은 error는 분리·detach된 옛 노드에서 발생, 새 노드에 도달 못 함) + `onError` **event-target 가드**(`event.currentTarget`의 src가 현재 src와 일치할 때만 실패 기록). 실패 판정은 순수 헬퍼 `isThumbnailFailed(currentSrc, failedSrc)`(node 단위 테스트)로 분리 — source A 실패가 다른 source B를 실패로 만들지 않음, 동일 B 실패는 1회 안정(재설정/loop 0), unmount setState/console 0. URL/token은 state/ARIA/data/error/log에 신규 복제 0.
  - **DOM 참고:** 살아있는 thumbnail 인스턴스의 in-app A→B src 스왑은 UI로 도달 불가(ready→reload 경로 없음, template 목록은 template id로 keyed). 따라서 src-스왑 경합은 `key={src}`로 구조적으로 차단하고, 상태 수준(순수 유닛)+도달 가능한 동작(Playwright: 실패 이미지 1회 요청·unmount clean)으로 검증. 새 DOM 테스트 라이브러리는 설치하지 않음(지시 준수).
- 이미지 느리거나 실패해도 카드 선택/키보드/focus/44px 유지(색·이미지 외 체크/텍스트/aria로 상태 전달).
- 토큰/URL/base64는 **thumbnail `img[src]`와 resolver 메모리에만** 존재. text/ARIA/data/error/console/storage/location에 미노출(E2E 검증).

## 5. 누출 검사(E2E)

- 합성 token marker(`SYNTH_TOKEN_MARKER`)가 정확히 한 `img[src]`에만 존재, `body.innerText`·`src` 외 속성·local/sessionStorage·`location`에 **미검출**. console error 0.
- 비신뢰 host는 신뢰 경계가 img src 전에 차단 → **외부 요청 0**(untrusted 카운터 0). 정확 catalog URL만 + 허용 Firebase 이미지만 route hit, unexpected 0.

## 6. 전체 게이트 결과

- `corepack pnpm install --frozen-lockfile` exit 0, `pnpm-lock.yaml` diff 0, 신규 의존성 0.
- `node scripts/check.mjs`: format / lint(`--error-on-warnings`) / typecheck(7) / **unit 242** / build **PASS(exit 0)**. mockup JS gzip **68.37KB**(스펙 017 67.66 + 0.71, 예산 내), admin 61.09KB 무변경.
- `pnpm test:e2e`: **49/49 PASS, exit 0**(scaffold 2 + 스펙 015 mockup-catalog 9 + 스펙 017·018 browse 38). 스펙 012/015/016/017 무회귀. 종료 후 preview 포트 4183/4184 미점유, 저장소 소속 vite/esbuild 잔류 0.
- `git diff --check` 공백오류 0. `@denn/shared` React/Firebase/IO 의존 0, `@denn/firebase→@denn/shared` 단방향 유지, browse selector output에 image/base64/path 0.
- 이미지 E2E viewport(320×568·390×844·844×390·932×390·768×1024·1280×800): 수평 overflow 0 / control 44×44 / thumbnail box viewport 내 / axe serious·critical 0 / console 0.

## 7. 미검증 / 남은 위험

- 실제 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱, 실제 200% 확대, **실제 운영 이미지** = **NOT TESTED**.
- 실제 Firebase GET·이미지 다운로드·`test:live:*` = 미실행.
- token 포함 다운로드 URL은 표시 중 `img[src]`에 존재(정상, "DOM 0" 아님). base64 data URL은 decode/clone/직렬화/선로딩으로 증폭하지 않음.
- 단순 thumbnail 성공이 **Canvas CORS-clean을 증명하지 않음**(후속 인쇄 스펙).
- published 실데이터의 base64/https 비율·다운로드 token 수명/회전/캐시 = 미확인(NOT VERIFIED). `storagePath` fallback 없음 → dataUrl 로드 실패 시 placeholder가 정상.

## 8. 운영/Firebase 무변경

- `denn-mockup-tool.html`·`denn-admin.html`·`firebase.json`·`.firebaserc`·`storage.rules`·`firestore.rules`·`apps/admin/**`·`poc/**`·`docs/rebuild/design/*-B.png`·`docs/rebuild/results/spec-017/*.png` = baseline hash UNCHANGED.
- Firebase SDK/`getDownloadURL`/Auth/write·Rules/CORS·Hosting·deploy 0. crossOrigin 전역 setter 이식 0. 신규 패키지 0.

## 9. 롤백

DONE/handoff 문서 커밋 → 앱·패키지 코드/test 커밋 순서로 역 `git revert`. Firebase·운영·배포 롤백 없음.
