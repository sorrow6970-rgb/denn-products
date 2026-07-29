# 스펙 027 인계 — 고객 상품 미리보기 composer 연결

- 일자: 2026-07-29
- 기준 HEAD: `835eaaa`(Codex 스펙 커밋) → 코드/test 커밋 `175a363`
- 스펙 정본: `docs/rebuild/specs/027-customer-preview-composer-connection.md`
- 상태: 구현·자체 검증 완료 → Codex 독립 검증 대기. **스펙 종료 아님.**

> ⚠️ 이 완료는 **로컬 사용자 사진 기반 첫 고객 Canvas preview 연결**이다. 템플릿 아트, 운영 이미지
> CORS-clean, pointer/pan/zoom, 회전, text/clock, print/export, 저장·주문, Firebase·배포 완료가 아니다.

---

## 1. 변경 파일 (허용 목록 안, 커밋 `175a363`)

| 파일 | 성격 |
| --- | --- |
| `apps/mockup/src/preview/PreviewSection.tsx` | 신규 — 명시적 `미리보기 만들기` 단계 |
| `apps/mockup/src/preview/PreviewComposer.tsx` | 신규 — 색·사진·plan·surface 연결 |
| `apps/mockup/src/preview/previewContracts.ts` | 신규 — 팔레트·색 필터·logical width·고정 문구 |
| `apps/mockup/src/preview/previewContracts.test.ts` | 신규 unit |
| `apps/mockup/src/preview/PreviewComposer.test.tsx` | 신규 unit(정적 렌더) |
| `apps/mockup/src/canvas/compositeImageBindings.ts` | 신규 framework-free binding-map 헬퍼 |
| `apps/mockup/src/canvas/compositeImageBindings.test.ts` | 신규 unit |
| `apps/mockup/src/browse/BrowseFlow.tsx` | 수정 — 완료 요약 다음에 composer 배치 |
| `apps/mockup/src/browse/browse.css` | 수정 — composer 레이아웃·44px·focus-visible |
| `tests/e2e/mockup-preview.spec.ts` | 신규 — 실제 고객 `/` Chromium E2E 9건 |

허용 파일 밖 변경 **0**(packages·admin·운영 HTML·Firebase·POC·PNG·manifest·lockfile 무변경), 신규 의존성 **0**.

## 2. Founder 승인 UX 계약 이행

| 계약 | 구현 |
| --- | --- |
| 선택 완료 후 자동 Canvas 금지 | 완료 요약 다음에 `미리보기 만들기` 버튼만 렌더. 열기 전 Canvas·색·파일 UI **0** |
| 명시적 색 선택, 자동 선택 0 | `color` 초기값 `null`. 어떤 스와치도 `aria-pressed="true"`로 시작하지 않음 |
| case 8색, transparent 제외 | `CASE_BODY_COLORS` = 레거시 solid 8색(`denn-mockup-tool.html:322-330`). `transparent`·패턴 **없음** |
| frame은 valid solid만, grain 제외 | `readFrameColorOptions`가 정확한 `#RRGGBB` + 이름 있는 항목만 통과, `grain: true`·`red`·`#ABC`·이름 없음 전부 제외. 지원 색 0이면 안내만 |
| 이미지 준비 전 Canvas 0 | 모든 필수 slot이 `ready`여야 plan 생성. 하나라도 loading/failed/clear면 plan·Canvas 즉시 제거 |
| frame width = `max(1, round(min(content, 500)))` | `resolveFrameLogicalWidth`. 측정 전(`null`)·0·NaN·Infinity는 **대기**(기본값 생성 0) |
| resize 시 재계산 | 자체 `ResizeObserver`가 content-box를 관측 → 새 width로 geometry→plan 재생성 |
| case는 `modelLogicalSize` + scroll wrapper | 스펙 022 surface 그대로. CSS transform 축소 **미도입** |

## 3. 연결 경계

`CatalogBrowseSelection`(ids) → `projectCase/FramePreviewGeometry` → 명시 색 + 준비된 `UserImageState`
→ `buildCase/FrameProductPlan` → 소유자별 `imageBindings` 결합 → `PreviewCanvasSurface`.

- raw `CatalogDocumentV1`은 **projection 입력으로만** 사용하고 Canvas props로 전달하지 않는다.
- executor·surface·adapter·`packages/**` 계약 **무변경**.
- projection/adapter 실패는 code·sourceIndex·ID를 노출하지 않고 고정 문구(`미리보기를 만들 수 없습니다.`)로 닫는다.

## 4. ⚠️ 구현 중 발견·수정한 결함 — owner 간 `imageRef` 충돌

스펙 026 owner는 **자기 sequence**로 `user-image-1`을 발급한다. 따라서 zone이 2개면 **두 owner가 같은
`user-image-1`을 내고**, 결합 lookup이 첫 owner의 사진을 두 zone 모두에 그린다(E2E가 실제로 이 증상을
잡았다: zone 1에 zone 0의 사진이 그려짐).

수정: composer가 slot 단위로 namespace를 붙인다. plan 입력의 `imageRef`는 `<slotId>.<ownerRef>`이고
lookup은 `withImageRefPrefix(slotId + ".")` 뷰로 **자기 namespace만** 응답한다. 결과 ref
(`case-zone-0.user-image-1`)는 스펙 020 식별자 문법(알파뉴메릭 시작 + `. _ -`, ≤128자)을 그대로 만족한다.
unit이 이 충돌 시나리오를 직접 고정한다.

## 5. 실제 Chromium E2E (고객 `/`, 신규 9건)

합성 카탈로그를 route로 주입하고(그 외 Firebase 요청은 abort + 카운트) 사진은 `node:zlib`로 만든 단색 PNG를
`setInputFiles`로 넣는다. 저장소에 이미지 파일 추가 0, 실제 network 0.

1. **case 전체 흐름** — 선택 완료 시 Canvas 0 → composer 열기 → 색 선택(“사진을 선택해 주세요.”) → zone 0만
   선택해도 Canvas 0 → zone 1까지 선택 → Canvas. CSS 크기 `300×200`(= `modelLogicalSize`), 픽셀:
   (75,50)=사진 A, (225,50)=사진 B, (150,150)=body `#1A1A1A`. **zone별 독립 사진 실증**
2. **교체·재선택·clear** — 한 zone만 교체되고 다른 zone 유지, `input.value === ""`라 같은 파일 재선택 가능,
   한 zone을 clear하면 **부분 미리보기 없이** Canvas 제거
3. **선택 변경** — 제품 종류 변경 시 Canvas 0·composer 닫힘, 새 선택에서는 **열지 않은** 새 단계로 시작
4. **frame** — grain·비 hex 색 미표시, 사전 선택 0, 색+사진 후 Canvas. `width ≤ 500`,
   `height = round(width × 1.4)`, 픽셀: 프레임 밴드 / mat(8px inset 안쪽) / 사진 3구역 구분
5. **좁은 뷰포트(320)** — 더 좁은 logical width가 나오고 페이지 가로 overflow 0
6. **누출 0** — 파일명 marker·`blob:`·`base64`·카탈로그 색 ID·`PLAN_BUILD_FAILED`가 text/속성(ARIA·data-*)/
   localStorage/sessionStorage/location/console에 **0**
7. **키보드 전용** — 열기 버튼 Enter, 스와치 Enter로 `aria-pressed="true"`, 파일 input 포커스 도달
8·9. **320×568 / 1280×800 매트릭스** — overflow 0, 컨트롤 높이 ≥44px, axe serious/critical 0,
   console error·warning 0, 예상 밖 요청 0

## 6. 게이트 실측

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, lockfile diff **0**, 신규 의존성 0 |
| `format:check` / `lint` / `typecheck` | PASS |
| `test:unit`(= `check`) | **797 PASS**(755 → 797, 신규 42), 33 파일 |
| build mockup | JS **217.69 → 248.23 kB**(gzip **68.40 → 77.53**), CSS **11.32 → 13.80 kB**(gzip **3.16 → 3.53**) |
| build admin | 193.53 / 61.09, 8.54 / 2.64 = **무변경** |
| `test:e2e` | **78 PASS**(69 → 78, 신규 9), reporter 요약, **exit 0 자체 종료** |
| `git diff --check` | clean |
| 포트 4183·4184 | 실행 직후 TIME_WAIT 2건 관측 → 재확인 시 **free**, 리스너·잔류 프로세스 0 |
| 저장소 소속 node·esbuild | 0 |
| OS temp `denn-e2e-*` | 잔여 **0** |
| 고객 dist | mockup·admin **SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| 네트워크 / live / deploy | **0**(합성 카탈로그 route만, 그 외 요청 abort·카운트 0) |

### 번들 증가 원인 (요구된 기록)

미리보기가 **처음으로 고객 번들에 포함**됐기 때문이다. 새로 실려 들어간 것: Canvas surface(022) +
plan executor(021) + plan builder(020/024/025) + geometry projection(023) + local image binding(026) +
composer UI. JS gzip **+9.13 kB**, CSS gzip **+0.37 kB**(composer 레이아웃 규칙). admin은 이 코드를
전혀 import하지 않아 **바이트 무변경**이다.

### E2E 소요 시간 (정직 기록)

전체 스위트 wall-clock이 이전 라운드(58건 약 20초)보다 길어져 **2.1분 ~ 3.5분**(두 번 실행, 둘 다 78/78 PASS,
exit 0)으로 측정됐다. 같은 테스트의 개별 소요가 실행 간 5.4초 ↔ 1.6초로 흔들려 **호스트 부하 변동**으로 보이며,
앱 회귀로 단정할 근거는 없다(고객 번들 증가분은 위 수치뿐). **재현·원인 확정은 NOT VERIFIED**.

## 7. 무변경 확인

`packages/**`(shared·render·firebase·ui·spaces) / `apps/admin/**` / 운영 HTML / `firebase.json`·Rules /
`poc/**` / `package.json` / `pnpm-lock.yaml` = `git diff` **0**. 기존 E2E fixture(`canvas-fixture.tsx`)와
`canvas-surface.spec.ts`도 이번 라운드에서 **수정하지 않았다**.

## 8. NOT TESTED · 후속

- **NOT TESTED**: 실제 기기(iPhone Safari·Android Chrome·삼성 인터넷·카카오 인앱), 실제 200% 확대,
  운영 카탈로그의 색·zone·사이즈 분포, 운영 이미지, 대용량 사진 메모리·성능, EXIF 회전, 선명도.
- **미착수**: 템플릿 아트·Firebase 이미지 Canvas 합성, pointer/pan/zoom·회전, text/clock/watermark,
  print/export, 저장·주문·카카오, Firebase SDK/Auth/Rules/CORS/Hosting, deploy.
- `hosting.public:"."` → **Hosting 격리 전 배포 금지** 유지.

## 9. PNG (Codex E2E 재생성분)

`docs/rebuild/results/spec-018/browse-desktop-1280x800.png`과 `browse-mobile-390x844.png`은 Codex 독립 E2E가
재생성한 dirty 산출물이다. 이번 라운드에서도 **restore·checkout·stage·commit 하지 않았다** → working tree는
이 2개 때문에 dirty하고 커밋된 PNG는 **0**이다.

## 10. 커밋 / 롤백

| 순서 | 커밋 | 내용 |
| --- | --- | --- |
| 1 | `175a363` | 코드·테스트 (composer, 계약, binding 결합, BrowseFlow·CSS, E2E 9) |
| 2 | (문서) | 스펙 027 DONE, 이 인계, `CLAUDE_LIVE_PATCH_LOG.md`, `CURRENT.md` |

**롤백 순서: 문서 커밋 → 코드 커밋**(역순 revert). `835eaaa`로 되돌리면 라운드 전 상태다.

## 11. 보완 라운드 1 (2026-07-29) — frame 색 중복 dedup

기준 `075ee01`(+ Codex 지적 `f5c0039`) → 코드/test 커밋 `6fb8630`.

| 항목 | 내용 |
| --- | --- |
| 지적 | `frameColors`의 서로 다른 항목이 같은 canonical fill을 가지면 swatch의 React key·`data-testid`가 중복되고, 값으로 비교하는 선택 상태 때문에 여러 버튼이 동시에 `aria-pressed=true`가 될 수 있었다 |
| 수정 | canonical uppercase 값 기준 **결정적 dedup** — source order의 **첫 유효 항목과 이름 보존**, 이후 중복 미표시. 유효 항목만 색을 선점(앞선 grain/형식 오류가 뒤 solid를 가리지 않음) |
| 유지 | 자동 선택 0 · raw id/object/diagnostic 미노출 · property 1회 읽기 · hostile getter throw 0 |
| 신규 테스트 | 5건(대소문자 2개→1, 같은 색 3개→1, 서로 다른 색 순서 유지, 무효 항목 미선점, markup swatch 1개·pressed 0) |

**게이트**: frozen exit 0 · lockfile diff 0 · format·lint·typecheck / **unit 802**(797→802) /
build(mockup JS 248.29 kB·gzip **77.55**, CSS 13.80·**3.53**; admin 무변경) / **e2e 78 PASS·exit 0·16.9초** /
check PASS / `git diff --check` clean / 포트 free · temp 0 · 고객 dist SHA-256 E2E 전후 동일·fixture 0.

**§6의 E2E 소요 의문 해소**: 같은 78건이 이번에 **16.9초**로 끝나, 직전 라운드의 2.1~3.5분은 **호스트 부하**였고
앱 회귀가 아니었음이 확인됐다(그 항목의 `NOT VERIFIED`는 이로써 해소).

**PNG**: Codex E2E 재생성분 2개는 이번 라운드에서도 미복원·미커밋 → working tree dirty, 커밋된 PNG 0.

## 12. 종료 (2026-07-29)

Codex 최종 판정 **승인 가능**, 승인 기준 HEAD **`06d9700`**. 종료 시점 실측치:
unit **802/802**, E2E **78/78 PASS·exit 0**, mockup JS/CSS gzip **77.55 / 3.53 kB**,
admin **61.09 / 2.64 kB**, 포트 free, OS temp 잔여 0, `git diff --check` PASS, HEAD=origin·0/0.
canonical frame fill dedup과 source-order 첫 유효 이름 보존, 고객 `/`의 실제 case/frame Canvas 픽셀·
키보드·320px/desktop·axe·누출 0이 독립 검증됐다.

- **NOT TESTED**: 실제 기기, 실제 200% 확대, 운영 이미지, 대용량 사진 메모리·성능, EXIF 회전.
- **미착수**: template art, Firebase image CORS-clean 합성, pointer/pan/zoom, print/export,
  저장·주문, Firebase·deploy.
- **PNG**: Codex E2E 재생성분 2개는 미복원·미커밋 → working tree dirty(정직 기록), 커밋된 PNG 0.
- 종료 커밋: 이 문서를 포함한 문서 전용 커밋. 기능 코드·설정·테스트는 승인본 그대로다.
