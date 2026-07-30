# 스펙 029 인계 — 고객 미리보기 이미지 이동·확대(pan/zoom) 편집

- 일자: 2026-07-30
- 기준 HEAD: `2ded576`(조사) → `7701c7a`(Founder 결정) → 코드/test 커밋 `95fcf92`
- 스펙 정본: `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`
- 결정 정본: `docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`
- 조사 근거: `docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`
- 상태: 구현·자체 검증 완료 → **Codex 독립 검증 대기. 스펙 종료 아님.**

> ⚠️ 이 완료는 **합성 fixture에서 마우스·휠·슬라이더·버튼·키보드로 구도를 조절한 단계**다.
> 터치 drag·핀치·실기기·실제 200% 확대·인쇄/export pan 재현은 포함하지 않는다.

---

## 1. 변경 파일 (허용 목록 안, 커밋 `95fcf92`)

| 파일 | 성격 |
| --- | --- |
| `apps/mockup/src/preview/imageTransform.ts` | **신규** framework-free 편집 상태 + drag 세션 컨트롤러 |
| `apps/mockup/src/preview/imageTransform.test.ts` | **신규** unit 45건 |
| `apps/mockup/src/preview/PreviewComposer.tsx` | 슬롯별 transform 소유·환산·컨트롤 UI·pointer/wheel |
| `apps/mockup/src/preview/PreviewComposer.test.tsx` | 컨트롤 정적 계약 7건 + 기존 1건 범위 정정 |
| `apps/mockup/src/preview/previewContracts.ts` | `PREVIEW_EDIT_LABELS` 고정 문구 |
| `apps/mockup/src/canvas/surface.css` | 편집 컨트롤 스타일(44px·focus-visible), **`touch-action` 선언 0** |
| `tests/e2e/mockup-preview.spec.ts` | 실제 Chromium E2E 5건 |

허용 파일 밖 변경 **0**: `packages/**`·`apps/admin/**`·운영 HTML·Firebase 설정/Rules/CORS/Hosting·POC·
`package.json`·`pnpm-lock.yaml`·PNG **무변경**, 신규 의존성 **0**.
`apps/mockup/src/canvas/localImageBinding.ts`(스펙 026 owner)와 `productPlan.ts`는 **건드리지 않았다**.

## 2. 계약 이행

| 스펙 항목 | 구현 |
| --- | --- |
| §2 상태 | composer가 슬롯별 `{scale, x, y}` 소유. `scale` 무차원 **1.0~5.0**, `x/y`는 축별 `maxPan` 대비 **[-1,1]** |
| §2 환산 | `maxPan=0`인 축은 0. logical px는 **plan 직전에만** `normalized * maxPan` |
| §2 resize | normalized를 유지하고 현재 geometry로 재환산 → 액자 폭이 바뀌어도 같은 구도 |
| §2 안전 실패 | `readNormalizedTransform`이 **범위 밖·비유한·hostile getter/Proxy trap/revoked Proxy를 거부**(null). **clamp 복구·기본값 생성 없음** |
| §2 owner | 스펙 026 owner의 리터럴 transform **무변경**(drawable·ref·intrinsic만 사용) |
| §2 선택 | case multi-zone은 **슬롯 카드**(`aria-pressed`) + `편집 중` 표시. **캔버스 히트테스트 0**. frame은 단일 슬롯(피커 미렌더) |
| §2 초기화 | 이미지 교체·삭제·실패는 **그 슬롯만** `1/0/0`, model/template/frame-size/kind 변경은 **전체** 초기화. **색상 변경·활성 슬롯 전환은 유지** |
| §2 비활성 | 활성 슬롯 사진이 ready가 아니면 range·zoom·reset·pan 버튼 전부 `disabled` |
| §2 확대 | 슬라이더 **100~500%**(내부 1.0~5.0), 버튼·휠 모두 **`*1.1` / `/1.1`**, 초기화는 **단일 `원래대로`** |
| §2 휠 | **실제 scale이 바뀔 때만** `preventDefault`(경계에서는 페이지 스크롤 유지). React `onWheel`이 passive라 **비-passive 리스너를 직접 부착** |
| §2 이동 | mouse/pen Pointer Events + `setPointerCapture`. 시작 logical point·시작 transform snapshot 후 **절대 delta**(`clientPointToLogical`) |
| §2 clamp | 양 축 `[-1,1]`, 최소 scale 1.0 → **클립 안 빈 공간 불가** |
| §2 종료 | `pointerup`·`pointercancel`·`lostpointercapture`·선택 변경·unmount 전부 세션 종료 |
| §2 stale | generation 가드. 종료된 세션의 늦은 frame·다른 pointerId의 move/end는 무효 |
| §2 키보드 | 화살표 **0.02**, Shift+화살표 **0.10**(pan 버튼 그룹 안에서 동작) |
| §2 rAF | pointer move 반영은 **프레임당 1회 병합**(최신 값만 commit). 임의 timer **0** |
| §2 StrictMode | unmount에서 dispose **+ ref 해제** → 재mount에서 새 컨트롤러 생성(영구 비활성화 없음) |
| §2 접근성 | 실제 `button`/`input[type=range]`, 44px, focus-visible, 고정 문구만 노출 |
| §2 스크롤 | **전역 `touch-action:none` 0·무조건 `preventDefault` 0** → 기존 페이지·가로 스크롤과 브라우저 확대 제스처 보존 |
| §3 오류 우선순위 | snapshot → 유한성/범위 → cover/maxPan → adapter/build 순서로 실패하면 **plan 자체를 만들지 않는다**(부분 plan·이전 transform 재사용 0). code·URL·imageRef·원문 미노출 |

### 2.1 설계 판단 — 두 번 build 하는 이유

`maxPan`은 zone/mat rect에서 나오고 그 공식은 어댑터(`productPlan.ts`)에 있다. 그 공식을 composer에
복사하면 **두 사본이 조용히 갈라진다**. 그래서 ① pan 0 + 현재 scale로 **probe plan**을 만들어
`draw-image-cover`의 `clipRect`/`drawRect`에서 축별 `maxPan`을 얻고 ② 그 값으로 실제 plan을 만든다.
`maxPan`은 scale에만 의존하므로 probe는 정확하고, 두 단계 중 하나라도 실패하면 preview가 열리지 않는다.

### 2.2 구현 중 발견·수정한 결함

**stale animation frame이 다음 세션의 pending 값을 소비**했다. 종료된 세션의 frame이 먼저 실행되면
`pending`을 비운 뒤 generation 불일치로 return해, **새 세션의 첫 move가 사라졌다**(재-grab 직후 1프레임
누락). 수정: stale frame은 **`pending`을 건드리지 않고** 즉시 return한다(세션 종료는 항상 자기 frame을
취소하므로 남은 pending은 새 세션 소유). unit이 이 시나리오를 고정한다.

## 3. 검증

### 3.1 unit (신규 45건, framework-free)

scale 경계·1.1 승산 양방향·reset / normalized↔logical 환산·양 축 clamp·`maxPan=0` 핀·**resize 보존**
(같은 normalized가 2배 geometry에서 2배 logical) / `maxPanFromRects` / read의 **거부 vs clamp 금지**·
필드별 1회 읽기·throwing getter·Proxy trap·revoked Proxy·drift 무효 / 절대 delta·경계 clamp /
drag 세션: rAF 1회 병합·최신값만 commit·다른 pointer 무시·3종 종료·stale end 무시·selection abort·
**generation 가드**·dispose 후 재생성(StrictMode)·hostile port(throw 0)·슬롯 값 독립.

### 3.2 실제 Chromium E2E (신규 5건)

| # | 검증 |
| --- | --- |
| 1 | 마우스 drag(아래 20 logical px) → 반쪽 경계가 y=50→**y=70**으로 이동(실제 픽셀), 존 안 **빈 공간 0**, **다른 존 불변**, `maxPan.x=0`인 축은 **가로 drag로도 불변**, 캔버스 밖 `pointerup` 후 이동해도 **불변** |
| 2 | 버튼 100→110→121→110%, 휠 동일 규칙, 슬라이더 250%/100%, **100% 아래로 안 내려감**, 키보드 ArrowDown×5로 픽셀 변화, `원래대로`가 scale+구도 복원 |
| 3 | 슬롯 카드 `aria-pressed` 1개만 true, zone 0 편집 후 **슬롯 전환에도 두 구도 유지**(zone 1은 100%), 컨트롤이 활성 슬롯만 변경, **사진 교체 시 그 슬롯만 초기화** |
| 4 | 액자: 피커 없음, 200% + Shift 이동 후 **뷰포트 1280→360 resize에도 같은 비율 지점의 색이 동일**(normalized 구도 유지), scale 유지 |
| 5 | 320px: `documentElement` 가로 오버플로 0, **`touch-action`이 body·area·canvas 모두 `auto`**, 편집 컨트롤 전부 44px 이상, axe serious/critical **0**, console error **0** |

기존 E2E 회귀 0(85 → **90 PASS**). 고정 sleep 0(`expect.poll`만 사용).

### 3.3 게이트 실측

| 항목 | 결과 |
| --- | --- |
| `install --frozen-lockfile` | exit 0, lockfile diff **0**, 신규 의존성 0 |
| `format:check` / `lint` / `typecheck` | PASS |
| `test:unit` (= `check`) | **938 PASS**(893 → 938, 신규 45), 36 파일 |
| build mockup | JS **254.06 → 263.19 kB**(gzip **78.90 → 81.56**), CSS **13.80 → 15.47 kB**(gzip **3.53 → 3.88**) |
| build admin | 193.53 / 61.09, 8.54 / 2.64 = **무변경** |
| `test:e2e` | **90 PASS**(85 → 90, 신규 5), exit 0, 16~17초 |
| `git diff --check` | clean |
| 포트 4183·4184 | free |
| OS temp `denn-e2e-*` / 저장소 소속 node·esbuild | **0 / 0** |
| 고객·운영자 dist | **SHA-256 E2E 전후 동일**, fixture 파일 **0** |
| 네트워크 / live / Firebase / CORS / deploy | **0** |

**번들 증가 원인**: 편집 상태 모듈 + drag 컨트롤러 + 컨트롤 UI + 2단계 plan 경로(JS gzip **+2.66 kB**),
CSS는 신규 컨트롤 규칙(**+1.67 kB**, gzip +0.35). admin은 이 코드를 import하지 않아 무변경.

## 4. NOT TESTED · NOT VERIFIED

- **2손가락 핀치**: 구현하지 않았고 Playwright로 구동도 불가(단일 탭만) → **NOT TESTED**
- **터치 drag**: 1차 미지원(코드에서 `pointerType === "touch"`를 무시)
- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)의 스크롤·제스처 충돌
- 실제 200% 브라우저 확대에서의 조작성
- print/export 경로의 pan 재현(레거시 frame 하드코딩 `dim.w/500` 문제는 별도 스펙)
- 대용량 사진에서의 drag 프레임률·메모리, EXIF 회전
- 운영 카탈로그·운영 이미지

## 5. 미착수 (유지)

legacy builder crop 지원 · builtin multi-zone · text/clock/watermark · print/export · 저장·주문 ·
카카오 · Firebase SDK/Auth/Rules/CORS/Hosting · deploy. `hosting.public:"."` →
**Hosting 격리 전 배포 금지** 유지.

## 6. PNG · 타 주체 파일

- `docs/rebuild/results/spec-018/browse-*.png` 2개는 이번에도 **restore·checkout·stage·commit 하지 않았다**.
- `Automation/DENN_AUTOMATION_RUNBOOK.md`의 미커밋 변경은 **Codex 소유로 판단해 손대지 않았다**.

## 7. 커밋 / 롤백

| 순서 | 커밋 | 내용 |
| --- | --- | --- |
| 1 | `95fcf92` | 코드·테스트(편집 상태·컨트롤러·composer·컨트롤 UI·CSS·unit·E2E) |
| 2 | (문서) | 이 인계 + 스펙 029 정본 + live log + CURRENT + Automation |

**롤백 순서: 문서 커밋 → 코드 커밋**(역순 revert). `7701c7a`로 되돌리면 라운드 전 상태다.
