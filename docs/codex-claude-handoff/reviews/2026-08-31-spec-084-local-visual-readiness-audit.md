# 스펙 084 — 운영 연결 전 로컬 시각 준비도 감사 보고서

- 작성: Claude Code, 2026-08-31
- 기준: `rebuild/modern-studio`, 감사 시작 `HEAD=origin=94db3e2`(계약 commit 이후 `6304cfb`), ahead/behind 0/0
- 증거: `docs/rebuild/results/spec-084/**`(PNG 14장 + `measurements.json` 18건) ·
  `tests/e2e/local-visual-readiness.spec.ts`
- 성격: **감사 전용.** 제품 UI/UX·CSS·문구·layout 수정 0. finding은 분류만 하고 고치지 않는다.

## 1. 이 감사가 답하는 질문

"자동 테스트가 통과한다"와 "이 화면을 손님과 운영자에게 보여도 된다"는 다른 문장이다. 이 단위는 그
사이의 공백을 측정한다. 특히 spec 083 PNG는 화면 제목이 `E2E fixture (not a product screen)`이고 하단에
진단값·상태 전환 버튼이 붙어 있어 기능 증거로는 유효하지만 UI 승인 자료로는 쓸 수 없었다. 이번
결과물은 그 혼동을 구조로 제거한다 — 제품 영역만 locator로 캡처하고, 모든 이미지에 신뢰 등급을 붙였다.

## 2. 수집한 증거와 신뢰 등급

| 등급 | 장수 | 대상 |
|---|---|---|
| `PRODUCT_ROUTE` | 7 | 고객 browse 2, 고객 composer 3, 운영자 shell 2 |
| `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | 7 | 고객 Space 4, 운영자 C5 편집기 2, 운영자 발급 panel 2 |
| `FIXTURE_CONTROL_ONLY` | 0 | 캡처하지 않음(의도) |

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
| 44px 미만 pointer target(제품 영역 한정) | **2건** — 아래 F-2 |
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

### F-1 (P1) — 고객 composer의 미리보기가 모든 컨트롤 아래에 있다

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

### F-3 (P1) — Space 인증 후에도 "비밀번호를 입력하세요"가 남는다

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

### F-5 (P1) — C5 편집기의 select가 스타일 없는 23px 네이티브 위젯이다

`operator-c5-editor-ready-clean-1280x800.png`(518x23), `operator-c5-editor-ready-clean-390x844.png`(316x23).

바로 아래 `인쇄 폭/높이` 입력은 Modern Studio 토큰(라운드·보더·높이)을 따르는데 `액자 사이즈` select만
브라우저 기본이다. 높이 23px는 44px 규칙에도 미달한다. 이 화면의 44px 미만 target은 이 항목 하나뿐이다.

### F-6 (P2) — 편집기가 셸의 카드 표면을 쓰지 않는다

`App.tsx`는 `FramePrintSizeEditor`를 `Card` 없이 배치한다. 다른 섹션이 모두 흰 카드 위에 놓이는 것과
달리 편집기만 배경 위에 직접 놓여 시각적 위계가 끊긴다. locator 캡처라 여백이 없는 것이 아니라, 제품
조합에도 카드가 없다.

### F-7 (P2) — 고객 화면에 마이그레이션 진단 문구가 보인다

`browse-ready-*.png`, `composer-ready-*.png` 상단의 `일부 이전 데이터가 호환 처리되었습니다`.

내부 처리 결과를 손님에게 알린다. 카탈로그 내용에 따라 나타나므로 이 감사의 합성 카탈로그가 유발한
측면이 있고, 운영 카탈로그에서 항상 뜨는지는 **NOT TESTED**다. 문구의 대상 독자가 손님이 맞는지 후속
판단이 필요하다.

### F-8 (P2) — Space viewer가 데스크톱에서 확대되지 않는다

`space-v2-viewer-1280x800.png`의 Canvas는 320x480으로, 390x844일 때와 같다. 1280px에서 카드 좌측에
작게 놓이고 우측이 비어 "시안을 확인한다"는 목적에 비해 작다.

### 관찰(결함 아님)

- `space-v1-blocked-390x844.png`에는 focusable control이 0개다. spec 063이 재시도 CTA를 두지 않기로 한
  결과와 일치하므로 결함으로 분류하지 않는다.
- composer의 액자 미리보기에 시계(`16:50`)가 보이는 것은 이 감사의 합성 카탈로그가 시계 opt-out을
  명시하지 않았기 때문이다. 제품 결함이 아니라 fixture 데이터의 결과다.
- `인쇄용 파일 내려받기` 비활성과 `이 사이즈는 아직 인쇄용 파일을 만들 수 없습니다`도 합성 사이즈에
  cm이 없어 나온 정상 동작이다.

## 5. 화면별 판정표

| 화면 | 상태 | 자동 측정 | 시각 판정 |
|---|---|---|---|
| 고객 browse | ready | PASS | FINDING(F-7) |
| 고객 composer | ready + 실제 Canvas | PASS | FINDING(F-1, F-2, F-7) |
| 고객 Space V2 | 비밀번호 게이트 | PASS | PASS |
| 고객 Space V2 | 인증 후 열람 | PASS | FINDING(F-3, F-8) |
| 고객 Space V1 | 표시 거부 | PASS | PASS |
| 운영자 shell | 제품 기본값 | PASS | FINDING(F-4) |
| 운영자 C5 편집기 | ready-clean | FINDING(44px, F-5) | FINDING(F-5, F-6) |
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
5. C5 select를 디자인 시스템 컨트롤로 교체(높이 44px 이상)하고 편집기를 카드 위에 올린다(F-5, F-6).
6. 고객 대상 진단 문구의 독자 재검토(F-7), Space viewer의 데스크톱 확대 규칙(F-8).

## 7. 이번 단위의 경계

- 제품 source·CSS·기존 test·config·package/lockfile·Rules 변경 **0**. 신규 파일은 visual spec 1개와
  결과 폴더뿐이다.
- 실제 Firebase/project/bucket/network/emulator/UID/deploy **0**. 외부 요청 측정값도 0이다.
- 보호 대상(`taste-v2/**`, design README, spec 038, spec 018 PNG 2장, `packages/render/src/plan/index.ts`,
  `pnpm-workspace.yaml`, `AGENTS.md`)은 읽기만 했고 stage/commit/restore하지 않았다.
- 이 보고서는 finding을 **분류만** 한다. 수정과 후속 스펙 착수는 Codex 검수 후 별도 승인 사항이다.
