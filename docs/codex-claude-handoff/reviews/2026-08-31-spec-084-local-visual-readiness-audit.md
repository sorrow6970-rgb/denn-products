# 스펙 084 — 운영 연결 전 로컬 시각 준비도 감사 보고서

- 작성: Claude Code, 2026-08-31
- 기준: `rebuild/modern-studio`, 감사 시작 `HEAD=origin=94db3e2`(계약 commit 이후 `6304cfb`), ahead/behind 0/0
- 증거: `docs/rebuild/results/spec-084/**`(PNG **15장** + `measurements.json` **18건** = PNG 15 +
  measurement-only 3) · `tests/e2e/local-visual-readiness.spec.ts`
- 성격: **감사 전용.** 제품 UI/UX·CSS·문구·layout 수정 0. finding은 분류만 하고 고치지 않는다.
- 보완: Codex 검수 라운드 1(2026-08-31)에서 개수·참조·screenshot 결정성을 정정했다. 판정과 finding의
  의미·우선순위는 바뀌지 않았다. 상세는 §8.

## 1. 이 감사가 답하는 질문

"자동 테스트가 통과한다"와 "이 화면을 손님과 운영자에게 보여도 된다"는 다른 문장이다. 이 단위는 그
사이의 공백을 측정한다. 특히 spec 083 PNG는 화면 제목이 `E2E fixture (not a product screen)`이고 하단에
진단값·상태 전환 버튼이 붙어 있어 기능 증거로는 유효하지만 UI 승인 자료로는 쓸 수 없었다. 이번
결과물은 그 혼동을 구조로 제거한다 — 제품 영역만 locator로 캡처하고, 모든 이미지에 신뢰 등급을 붙였다.

## 2. 수집한 증거와 신뢰 등급

| 등급 | 장수 | 대상 |
|---|---|---|
| `PRODUCT_ROUTE` | 7 | 고객 browse 2, 고객 composer 3, 운영자 shell 2 |
| `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | 8 | 고객 Space 4, 운영자 C5 편집기 2, 운영자 발급 panel 2 |
| `FIXTURE_CONTROL_ONLY` | 0 | 캡처하지 않음(의도) |
| **합계** | **15** | 저장된 PNG 전부 |

PNG를 저장하지 않은 320px measurement-only 3건(고객 browse·고객 composer·운영자 shell)은 모두
`PRODUCT_ROUTE`이며, PNG 15장과 합쳐 `measurements.json` **18건**이 된다.

`PRODUCT_ROUTE`는 빌드된 제품 entry를 그대로 열고 카탈로그 JSON만 로컬에서 응답한 화면이다. Space와
운영자 편집기/발급 panel은 제품 entry의 gate가 기본 off이거나 실제 Firestore 문서가 필요해 로컬에서
제품 route로 도달할 수 없으므로 fixture 등급으로만 기록했다 — **운영 route 전체로 일반화하지 않는다.**

`space-v2-issue-frozen-*.png`는 spec 083 fixture에서 `space-v2-issue-panel` 영역만 찍었다. fixture 제목과
진단 section이 panel bounding box와 **겹치지 않음**을 DOM locator로 단언하고, panel 안에 harness testid가
0개임도 함께 단언한다(`local-visual-readiness.spec.ts`).

## 3. 자동 측정 결과 (18건 전수)

| 측정 | 결과 |
|---|---|
| horizontal overflow (`scrollWidth > clientWidth`) | **0건** — 320/390/844/1280 전부 |
| viewport 밖으로 나간 interactive control | **0건** |
| 44px 미만 pointer target(제품 영역 한정) | **2건** — C5 편집기의 select. 아래 **F-5** |
| native range | 별도 기록. 모두 높이 44px(track 폭은 컨테이너를 따름) |
| 키보드 walk 순서 = DOM 순서 | **전 화면 일치** |
| focus 표시 없는 stop | **0건**(outline 또는 box-shadow 기준) |
| axe serious/critical | **0건** |
| console error / pageerror | **0건** |
| console warning | **0건** |
| localhost·blob 외 요청 | **0건**(카탈로그 URL은 로컬 응답으로 가로채 별도 기록) |
| Canvas 필요한 화면의 0x0 | **0건**(composer 488x683 / 286x400 / 216x302, Space viewer 320x480, 발급 panel 500x750 / 316x474) |
| 금지 문자열(토큰·object path·SDK 메시지) 노출 | **0건** |

측정 원본은 `measurements.json`이다. axe 0은 접근성 통과와 동의어가 아니며, 색 대비·스크린리더·실기기
동작은 여기서 증명되지 않는다.

### 측정 설계에서 바로잡은 두 가지

- **fixture control 오탐 제거.** 처음에는 페이지 전체에서 target 크기를 쟀고, 그 결과 발급 panel 화면에
  fixture 버튼 14개가 "44px 미만 제품 결함"으로 잡혔다. 제품 영역으로 측정 범위를 좁히자 0건이 됐다.
  fixture control을 제품 결함으로 보고하는 것은 이 스펙이 없애려는 혼동 그 자체다.
- **focus 오탐 제거.** 처음에는 `element.focus()` 후 outline만 읽어 고객 browse/composer가 "focus 표시
  없음"으로 나왔다. Chromium은 프로그램적 focus에 `:focus-visible`을 적용하지 않으므로 이는 거짓
  음성이었다. 실제 Tab 이동으로 바꾸고 box-shadow도 함께 읽자 **전 화면 focus 표시 확인**으로 정정됐다.

## 4. 직접 관찰과 finding

자동 측정과 분리해, 저장된 PNG를 직접 보고 판정한 결과다.

### F-1 (P1) — 고객 composer의 미리보기가 모든 컨트롤 아래에 있다 — **스펙 085에서 해소됨(§9)**

`composer-ready-390x844.png`, `composer-ready-1280x800.png`, `composer-ready-844x390.png`.

색상·사진·확대·회전·위치 이동·문구까지 **모든 편집 컨트롤이 먼저 오고 Canvas가 맨 아래**에 온다.
390x844에서 Canvas 상단은 페이지 y≈1370px, 1280x800에서도 y≈1220px으로 첫 화면 밖이다. 손님은 "위치를
왼쪽으로 이동"을 누른 뒤 스크롤해야 결과를 본다. 844x390(가로)에서는 Canvas 자체가 683px로 뷰포트보다
높아 한 화면에 액자 전체가 들어오지 않는다. 1280px에서도 단일 컬럼이라 우측 여백이 비고 미리보기와
컨트롤을 동시에 볼 수 없다. 주문 전 확인이 제품의 핵심 가치라는 점에서 출시 전 수정 대상이다.

### F-2 (P1) — 파일 선택이 브라우저 기본 위젯이고 문구가 영어다

`composer-ready-*.png`의 `Choose File No file chosen`, `operator-space-v2-issue-frozen-*.png`의
`Choose File proof.png`.

한국어 UI 안에서 유일하게 영어이고, Modern Studio의 라운드·보더·높이 토큰을 따르지 않는 유일한
컨트롤이다. 고객 화면과 운영자 화면 양쪽에 같은 형태로 있다. 접근성 측면에서도 label과 위젯이 시각적으로
분리돼 보인다.

### F-3 (P1) — Space 인증 후에도 "비밀번호를 입력하세요"가 남는다 — **스펙 087에서 해소됨(§11)**

`space-v2-viewer-1280x800.png`, `space-v2-viewer-390x844.png`.

`SpacePasswordGate`가 badge·`<h1>내 공간 시안 확인</h1>`·`담당자에게 전달받은 비밀번호를 입력하세요.`를
**상태와 무관하게 항상** 렌더하고, 인증 성공 뒤 그 아래에 `저장된 시안 · 열람 전용 / 내 공간 시안`
블록이 추가된다. 결과적으로 성공 화면에 제목이 둘이고, 이미 입력을 마친 손님에게 입력하라는 안내가
남는다. 상태 완결성·정보 위계 문제이며 안전 의미를 바꾸지는 않는다.

### F-4 (P1) — 운영자 제품 route가 아직 UI 프리미티브 데모 셸이다

`operator-shell-default-off-1280x800.png`, `operator-shell-default-off-390x844.png`.

`http://localhost:4184/`(제품 기본값)에는 `관리자 셸 · UI 프리미티브 데모` badge, `버튼 (데모 — 동작
없음)`, `보기 옵션 (데모 — 저장 없음)`, 데모 검색어 입력, 그리고 **상시 빨간 오류 상태의 `담당자` 필드
(`필수 항목입니다`)** 가 있다. 실제 운영 작업 표면(C5 편집기·발급 panel)은 gate off로 보이지 않는다.
데모 오류가 실제 오류로 읽힐 수 있고, 운영자에게 노출되는 첫 화면이 제품이 아니라 스캐폴드다. 다만 이
상태에서 저장·발급 같은 조작이 존재하지 않아 P0가 아니라 P1로 둔다.

### F-5 (P1) — C5 편집기의 select가 스타일 없는 23px 네이티브 위젯이다 — **스펙 086에서 해소됨(§10)**

`operator-c5-editor-ready-clean-1280x800.png`(518x23), `operator-c5-editor-ready-clean-390x844.png`(316x23).

바로 아래 `인쇄 폭/높이` 입력은 Modern Studio 토큰(라운드·보더·높이)을 따르는데 `액자 사이즈` select만
브라우저 기본이다. 높이 23px는 44px 규칙에도 미달한다. 이 화면의 44px 미만 target은 이 항목 하나뿐이다.

### F-6 — **철회(2026-09-03 재확인)**

기존 판정은 사실과 달랐다. `App.tsx`가 별도 `Card`로 감싸지 않지만 `FramePrintSizeEditor`의 root가
spec 041부터 이미 `<Card>`다. 증거 PNG는 inner `denn-stack` locator를 캡처해 바깥 카드의 padding과
border가 잘렸을 뿐이다. 제품과 fixture 모두 같은 component root를 사용하므로 결함 목록에서 철회한다.

### F-7 (P2) — 고객 화면에 마이그레이션 진단 문구가 보인다

`browse-ready-*.png`, `composer-ready-*.png` 상단의 `일부 이전 데이터가 호환 처리되었습니다`.

내부 처리 결과를 손님에게 알린다. 카탈로그 내용에 따라 나타나므로 이 감사의 합성 카탈로그가 유발한
측면이 있고, 운영 카탈로그에서 항상 뜨는지는 **NOT TESTED**다. 문구의 대상 독자가 손님이 맞는지 후속
판단이 필요하다.

### F-8 — **검증된 finding 아님 / 제품 결정 대기(2026-09-03 재확인)**

`space-v2-viewer-*.png`의 320x480은 제품의 반응형 폭을 측정한 값이 아니다. 합성 fixture가 V2 replay
evidence에 `logicalWidth: 320`, `aspect: 1.5`를 선언했고 viewer가 발행 당시 logical size를 그대로
재현한 결과다. 이 근거로 desktop 확대 부재를 제품 결함으로 일반화할 수 없다. 발행 당시 size 충실
재현과 열람 기기 폭 재계산 중 어느 계약을 택할지는 별도 Founder 제품 결정으로 보류한다.

### 관찰(결함 아님)

- `space-v1-blocked-390x844.png`에는 focusable control이 0개다. spec 063이 재시도 CTA를 두지 않기로 한
  결과와 일치하므로 결함으로 분류하지 않는다.
- composer의 액자 미리보기에 시계(`09:30`)가 보이는 것은 이 감사의 합성 카탈로그가 시계 opt-out을
  명시하지 않았기 때문이다. 제품 결함이 아니라 fixture 데이터의 결과다. 표시되는 값 자체는 보완 라운드
  1에서 test-only 고정 시각으로 못박았다(§8) — 제품은 여전히 실제 시각을 읽는다.
- `인쇄용 파일 내려받기` 비활성과 `이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다`도 합성 사이즈에
  cm이 없어 나온 정상 동작이다.

## 5. 화면별 판정표

| 화면 | 상태 | 자동 측정 | 시각 판정 |
|---|---|---|---|
| 고객 browse | ready | PASS | FINDING(F-7) |
| 고객 composer | ready + 실제 Canvas | PASS | FINDING(F-1, F-2, F-7) |
| 고객 Space V2 | 비밀번호 게이트 | PASS | PASS |
| 고객 Space V2 | 인증 후 열람 | PASS | FINDING(F-3), F-8은 제품 결정 대기 |
| 고객 Space V1 | 표시 거부 | PASS | PASS |
| 운영자 shell | 제품 기본값 | PASS | FINDING(F-4) |
| 운영자 C5 편집기 | ready-clean | FINDING(44px, F-5) | FINDING(F-5), F-6 철회 |
| 운영자 발급 panel | frozen draft | PASS | FINDING(F-2) |
| 고객/운영자 제품 route의 Space·C5·발급 | — | `NOT TESTED` | 실제 network/gate 필요 |
| dirty/conflict/save-error 등 쓰기 실패 상태 | — | `NOT TESTED` | 도달 절차 미정의 |
| 실기기·preview channel·운영 데이터 | — | `NOT TESTED` | 별도 승인 단위 |

## 6. 후속 UI 보완 후보 (승인 아님)

우선순위 순의 **후보 목록**이며, 실제 수정 범위와 스펙 번호는 Codex 검수와 Founder 결정으로 정한다.

1. composer 레이아웃: 미리보기를 컨트롤보다 위 또는 sticky로 올리고, 데스크톱 2컬럼과 가로 뷰포트에서의
   Canvas 높이 상한을 정한다(F-1).
2. 파일 선택 컨트롤을 `@denn/ui` 버튼 + 한국어 문구로 감싼다. 고객·운영자 양쪽(F-2).
3. Space 게이트/뷰어 헤더 분리: 인증 후에는 입력 안내를 제거하고 제목을 하나로 만든다(F-3).
4. admin root를 운영자 작업 표면으로 바꾸고 데모 섹션과 상시 오류 필드를 제거한다(F-4).
5. C5 native select의 의미를 유지하면서 Modern Studio form 표면과 높이 44px 이상을 적용한다(F-5).
6. 고객 대상 진단 문구의 독자를 재검토한다(F-7). V2 replay size는 UI 결함이 아니라 별도 제품 결정이다.

## 7. 이번 단위의 경계

- 제품 source·CSS·기존 test·config·package/lockfile·Rules 변경 **0**. 신규 파일은 visual spec 1개와
  결과 폴더뿐이다.
- 실제 Firebase/project/bucket/network/emulator/UID/deploy **0**. 외부 요청 측정값도 0이다.
- 보호 대상(`taste-v2/**`, design README, spec 038, spec 018 PNG 2장, `packages/render/src/plan/index.ts`,
  `pnpm-workspace.yaml`, `AGENTS.md`)은 읽기만 했고 stage/commit/restore하지 않았다.
- 이 보고서는 finding을 **분류만** 한다. 수정과 후속 스펙 착수는 Codex 검수 후 별도 승인 사항이다.

## 8. 보완 라운드 1 (2026-08-31, Codex CORRECTION_REQUIRED)

Codex 독립 검수가 지적한 네 항목을 이 단위 안에서 닫았다. finding의 내용·우선순위·판정표는 그대로다.

1. **개수·등급 정정.** 실제 산출물은 PNG **15장** + measurement-only **3건** = `measurements.json`
   **18건**이고, PNG 등급은 `PRODUCT_ROUTE` **7** / `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` **8** /
   `FIXTURE_CONTROL_ONLY` **0**이다. 이 보고서 머리말과 §2, 결과 README, spec DONE, handoff,
   STATE/NEXT/CURRENT/live log를 실제 값으로 고쳤다. PNG 파일 자체는 처음부터 15장이었고 표기만 틀렸다.
2. **교차 참조 정정.** §3의 `44px 미만 pointer target 2건`은 파일 선택(F-2)이 아니라 C5 select(**F-5**,
   518x23 · 316x23)를 가리킨다.
3. **촬영 시각 고정.** composer PNG 3장이 재실행마다 달랐던 원인은 액자 미리보기 시계가 실제
   `Date.now()`를 읽기 때문이다(spec 031 §2.7 — 시계는 하드웨어 표시이고 인쇄/주문에는 도달하지 않는다).
   캡처 spec에서 `page.clock.setFixedTime`으로 제품 코드 실행 전에 시각을 `2026-08-31 09:30 KST`로
   고정하고 `timezoneId`도 함께 고정했다. `install`이 아니라 `setFixedTime`이므로 타이머는 실제 시간으로
   계속 돌고, 제품의 분 경계 ticker는 원래대로 시작·해제된다. 제품 source·fixture·기존 test는 무변경이다.
4. **나머지 픽셀 흔들림의 실제 원인 두 가지.** browse PNG의 소수 픽셀 차이는 시계와 무관했다.
   - `transition-duration:0s` 주입은 **이미 시작된** transition을 멈추지 않는다(CSS Transitions 규정).
     준비 클릭이 남긴 색 transition이 촬영 시점에 보간 중이어서 chip 색이 `170,150,139`과 최종값
     `159,136,122` 사이에서 갈렸다. 캡처 직전 `document.getAnimations()`를 모두 `finish()`시켜 끝값으로
     스냅한다.
   - 그 뒤에도 카드 모서리 안티에일리어싱이 로드마다 달랐다. 같은 페이지를 두 번 찍으면 바이트 동일하고
     네 번의 새 로드에서 `getBoundingClientRect()`가 전부 동일했으므로 layout이 아니라 raster 문제였다.
     Chromium의 partial raster가 compositor tile의 이전 픽셀을 재사용해 가장자리가 tile 이력에
     의존한 것이며, `--disable-partial-raster` 하나만으로 네 로드가 모두 바이트 동일해졌다.
5. **증명.** 보완 후 canonical `node scripts/e2e-run.mjs`를 **연속 2회** 실행해 spec-084 PNG **15장의
   SHA-256이 모두 동일**하고 `measurements.json`도 바이트 동일함을 확인했다(각 회차 Chromium 203/203
   PASS). timeout·retry·skip·screenshot tolerance는 추가하지 않았다 — 세 조건 모두 비교를 느슨하게 하는
   대신 같은 픽셀을 두 번 같게 그리게 한다.

## 9. 후속 해소 — F-1, 스펙 085 (2026-09-02)

이 절은 **후속 기록**이다. 위 §4의 F-1 본문은 감사 시점(2026-08-31)의 실측 그대로 두고, 여기에 해소
결과만 덧붙인다. F-6/F-8의 후속 사실 정정은 §10을 우선한다.

- **F-1 — 해소**(`docs/rebuild/specs/085-customer-composer-visible-preview-workbench.md`, 제품 commit
  `7351696`). composer가 preview pane → controls pane 순서의 작업대가 됐고(`<960px` 한 열,
  `>=960px` 왼쪽 sticky preview + 오른쪽 controls), 액자 Canvas는 pane 폭·500px 상한·
  `viewportHeight-96` 높이 예산을 반영한 logical plan으로 다시 만든다(CSS 축소가 아니다).
  같은 fixture로 측정한 before → after: 390x844 액자 상단 page y **1620 → 973**, 1280x800 **1403 → 880**
  (문서 높이 2303 → 1636), 844x390 Canvas **488x683 → 210x294**(예산 294 이하).
- **증거.** 신규 product-route PNG 3장은 `docs/rebuild/results/spec-085/`에 있다.
  `docs/rebuild/results/spec-084/`의 `composer-ready-*.png` 3장과 `measurements.json`은 canonical 실행이
  현재 제품 기준으로 갱신했고, 감사 당시의 원본은 git history에 남아 있다. 고객 shell의 desktop 폭이 바뀌어 `browse-ready-1280x800.png`도
  함께 갱신됐다.
- **그대로 남은 검증된 finding.** F-2(영어 native 파일 선택), F-3, F-4, F-5, F-7(고객 진단 문구)은
  스펙 085 범위 밖이다. F-6/F-8은 §10에서 정정한다.
- **NOT TESTED는 그대로다.** 실기기·preview channel·운영 데이터·실제 Firebase/network는 이번에도
  검증되지 않았다.

## 10. 후속 사실 정정과 다음 단위 선정 (2026-09-03)

- **F-6 철회.** `FramePrintSizeEditor` root가 이미 `<Card>`이고 제품/fixture 모두 같은 component를
  쓴다. inner locator 캡처가 카드 외곽을 잘라낸 것이 원인이므로 결함으로 유지하지 않는다.
- **F-8 재분류.** 저장된 V2 PNG의 320x480은 합성 fixture가 선언한 발행 당시 logical size를 viewer가
  재현한 결과다. desktop 반응형 크기의 제품 증거가 아니므로 UI finding에서 제외한다. replay size 계약은
  별도 Founder 제품 결정이다.
- **F-5 후속 착수.** Codex는 F-5 단독을 spec 086으로 선정했다. 이 시점에는 계약 문서만 작성했고 제품
  수정은 없다. 구현과 독립 검수 통과 전에는 F-5를 해소로 표시하지 않는다.

## 10. 후속 해소 — F-5, 스펙 086 (2026-09-03)

이 절은 **후속 기록**이다. 위 §4의 F-5 본문은 감사 시점(2026-08-31)의 실측 그대로 두고 해소 결과만
덧붙인다. 다른 finding의 의미·우선순위와 §5 판정표는 바뀌지 않는다. §9의 F-1 기록, F-6 철회와 F-8
재분류(2026-09-03 Codex 선정)도 되돌리지 않는다.

- **F-5 — 해소**(`docs/rebuild/specs/086-admin-c5-select-accessibility-surface.md`). `FramePrintSizeEditor`의
  `액자 사이즈` `<select>`가 component 전용 stylesheet
  (`apps/admin/src/admin-write/frame-print-size-editor.css`)로 인접 `TextField`와 같은 Modern Studio form
  표면을 갖는다: `min-height: 44px`, `width: 100%`, `1px var(--line)` border, `var(--radius)`,
  `var(--surface)`, `var(--ink)`, `font: inherit`. `:focus-visible`은 `.denn-field__input`과 같은 3px
  `var(--accent-ink)` outline + 2px offset이고, disabled는 `cursor: not-allowed` + `opacity: 0.55`로
  Button·Chip과 같은 비색상 단서를 쓴다.
- **native select를 유지했다.** custom listbox/combobox로 바꾸지 않았고 `appearance`도 재설정하지
  않았다 — 목록이 열린다는 유일한 시각 단서인 disclosure arrow를 지우면 결함이 방향만 바뀐다.
  label/id, `data-testid`, option 값·순서·문구, legacy disabled, 첫 항목 자동 선택 0, C5 load/save/CAS
  의미는 그대로다.
- **증거.** `docs/rebuild/results/spec-084/operator-c5-editor-ready-clean-{1280x800,390x844}.png`을
  canonical 실행이 다시 썼고 두 장을 직접 확인했다. `measurements.json`의 두 C5 항목에서
  `smallTargets` **0건**(감사 당시 `518x23` · `316x23`), `horizontalOverflow` false,
  `axeSeriousCritical` 0이다. Chromium E2E는 두 viewport에서 44px·containment·Tab focus ring·disabled
  단서·선택 계약·axe·console·network를 함께 단언한다.
- **그대로 남은 finding.** F-2(영어 native 파일 선택), F-3(Space 헤더), F-4(운영자 root 데모 셸),
  F-7(고객 진단 문구)은 스펙 086 범위 밖이고 화면에 그대로 있다. F-6은 철회, F-8은 별도 Founder 제품
  결정이다.
- **NOT TESTED는 그대로다.** 제품 route의 C5 gate는 여전히 off이고 실기기·preview channel·운영
  데이터·실제 Firebase/network는 이번에도 검증되지 않았다.

## 11. 후속 해소 — F-3, 스펙 087 (2026-09-03)

이 절은 **후속 기록**이다. 위 §4의 F-3 본문은 감사 시점(2026-08-31)의 실측 그대로 두고 해소 결과만
덧붙인다. 다른 finding의 의미·우선순위와 §5 판정표는 바뀌지 않는다. §9 F-1, §10 F-5, F-6 철회, F-8
재분류도 되돌리지 않는다.

- **F-3 — 해소**(`docs/rebuild/specs/087-space-post-auth-header-collapse.md`, 제품 commit `ac684e3`).
  `SpacePasswordGate`는 인증 **전**에는 그대로지만, 결과 renderer가 주입된 `ready` 상태에서는 자기
  badge와 `<h1>내 공간 시안 확인</h1>`을 렌더하지 않고, `담당자에게 전달받은 비밀번호를 입력하세요.`는
  `ready`이면 무조건 렌더하지 않는다. 판정은 `renderReadyBody`가 이미 쓰는 **주입 여부**와 같은 조건이라
  둘이 어긋날 수 없다.
- **결과 화면이 제목을 갖는다.** `SpaceV2ProofView`(`space-v2-proof-title`), V1 액자 뷰
  (`space-frame-title`), V1 차단 안내(`space-frame-blocked-title`)의 기존 `<h2>`가 각각 `<h1>`이 됐다.
  **문구·class·id는 그대로**라 세 `aria-labelledby`가 모두 해석되고 두 badge도 남아 있다. 새 고객 문구는
  **0**이며 CSS는 수정하지 않았다.
- **결과 renderer가 없는 spec 061 fallback**(`pendingNotice`)은 자기 제목이 없으므로 게이트 머리말을
  유지한다 — 머리말을 무조건 지웠다면 그 화면에 제목이 하나도 남지 않았을 것이다.
- **증거.** `space-v2-viewer-{1280x800,390x844}.png`와 `space-v1-blocked-390x844.png`를 canonical 실행이
  다시 썼고 직접 확인했다(`9c601fe8…` → `c84d8f16…`, `7a6482d1…` → `0ce9e921…`, `768b8310…` →
  `64927f4f…`). 인증 **전** 화면인 `space-v2-password-gate-390x844.png`는 `67a1433c…`로 **무변경**이다.
  `measurements.json`의 Space 4항목은 `horizontalOverflow` false, `axeSeriousCritical` 0,
  `smallTargets` 0이다. 감사 당시의 원본은 git history에 남아 있다.
- **범위 밖 baseline 4장.** 같은 두 화면의 다른 baseline인 `docs/rebuild/results/spec-063/
  space-v1-blocked-*.png`와 `docs/rebuild/results/spec-080/space-v2-viewer-*.png`도 canonical 실행이 다시
  썼다. 스펙 087의 허용 목록에 없어 **stage하지 않았고** Codex 판단을 요청한다.
- **그대로 남은 finding.** F-2(영어 native 파일 선택), F-4(운영자 root 데모 셸), F-7(고객 진단 문구)은
  스펙 087 범위 밖이고 화면에 그대로 있다.
- **NOT TESTED는 그대로다.** 제품 `?space=` route는 실제 Firestore 문서가 필요하므로 이번 근거도 제품
  component + 합성 fixture이며, 실기기·preview channel·운영 데이터·실제 Firebase/network는 검증되지
  않았다.
