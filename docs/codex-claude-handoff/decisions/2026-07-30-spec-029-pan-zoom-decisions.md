# 스펙 029 이미지 이동·확대(pan/zoom) 편집 계약 결정

상태: **확정 · 2026-07-30 Founder 최종 결정 (D-2·D-3·D-5·D-6·D-7 일괄 승인)**

근거 조사: `docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`
승인 문장(원문): `스펙 029 Founder 권장안 D-2·D-3·D-5·D-6·D-7 일괄 승인.`
기록 시점 Git: `rebuild/modern-studio`, HEAD=origin=`2ded576`, ahead/behind 0/0

## 1. Founder 승인 (제품·UX 결정)

| ID | 결정 | 승인 내용 |
| --- | --- | --- |
| **D-2** | 활성 zone UX | case multi-zone은 **슬롯 카드 선택 + 활성 슬롯 표시**. 캔버스 히트테스트로 zone을 고르지 않는다 |
| **D-3** | scale 범위·단위 | **단일 범위 `1.0 ~ 5.0`**, 내부는 **무차원**, **표시만 %**. 휠·버튼은 **승산(multiplicative)** 방식으로 통일 |
| **D-5** | 초기화 버튼 | **단일 `원래대로` 버튼** 하나. 레거시의 `맞춤`+`↺` 중복(둘 다 `{scale:1,x:0,y:0}`)을 재현하지 않는다 |
| **D-6** | 핀치 지원 | **1차는 핀치 미지원**. 슬라이더 · 버튼 · 휠 · 키보드 · 마우스 drag를 제공한다 |
| **D-7** | 클립 안 빈 공간 | **빈 공간 금지**. **최소 scale 1.0** + cover clamp 유지로 원천 차단 |

### 승인 근거 요약

- **D-3 / D-7**: 레거시는 휠·핀치가 `0.3~5`, 슬라이더·버튼이 `30~500%`로 두 축이 어긋났고(`denn-mockup-tool.html:1451-1464`, `:1559-1564`), `drawImgT`의 clamp가 `Math.abs`라 **scale<1에서 클립 안에 빈 공간이 생겼다**(`:1550-1552`). 최소 scale을 1.0으로 올리면 인쇄물에 흰 여백이 나가는 경로 자체가 없어진다.
- **D-6**: 2손가락 핀치를 가로채면 **브라우저 200% 확대 제스처를 빼앗는다**. 레거시 액자도 오버플로 시 핀치를 포기하고 슬라이더로 대체한 선례가 있다(`:1521`, `:1527`). 덧붙여 핀치는 **Playwright로 구동할 수 없어**(단일 탭만 제공) 검증이 구조적으로 불가능하다.
- **D-2**: 레거시에는 캔버스로 zone을 고르는 경로가 아예 없고 "마지막 업로드 zone"이 활성이었다(`:1365-1372`, `:1382`). 리빌드는 이미 slot별 UI를 가지고 있어 슬롯 선택이 정합적이다.
- **D-5**: 버튼 2개가 동일 동작이라 UI 중복이다(`:1565-1567`).

## 2. Codex 계약 결정 (같은 라운드에서 확정, 참조용)

| ID | 결정 |
| --- | --- |
| **D-1** | 편집 상태는 `scale`(무차원)과 **축별 normalized pan `x/y ∈ [-1,1]`** 을 저장한다. `x/y`는 현재 scale에서 계산한 축별 `maxPan` 대비 비율이며 **`maxPan=0`인 축은 0**이다. **plan 생성 시에만** 현재 zone의 logical px로 환산한다 |
| **D-4** | 키보드 이동은 축별 normalized pan **0.02/step**, Shift는 **0.10/step** |
| **D-8** | **composer가 slot별 transform을 소유**한다. 스펙 026 image owner는 drawable·ref·intrinsic만 소유하고 **기존 리터럴 transform 계약을 바꾸지 않는다** |
| **D-9** | 이미지 교체·삭제, model/template/frame-size 변경 시 해당 transform을 **초기화**한다. **색상 변경과 활성 slot 전환에서는 유지**한다 |

D-1이 normalized 저장으로 확정된 이유: 액자 logical canvas는 `resolveFrameLogicalWidth`(`max(1, round(min(content, 500)))`)와 `ResizeObserver`로 **resize마다 변한다**(`apps/mockup/src/preview/previewContracts.ts:83-87`, `PreviewComposer.tsx:227-241`). logical px로 저장하면 창 크기·방향이 바뀔 때 구도가 이동하고 clamp 한계까지 함께 변한다. case는 `modelLogicalSize` 고정이라 무해하므로, 같은 단위를 쓰면 한쪽이 반드시 틀린다.

## 3. 이 결정이 만드는 불변식

1. 편집 상태에 **logical px pan을 저장하지 않는다**(normalized만). logical px는 plan 생성 시의 파생값이다.
2. **scale < 1.0은 존재하지 않는다** → cover가 항상 유지되고 클립 안 빈 공간이 나오지 않는다.
3. **핀치 제스처를 가로채지 않는다** → 브라우저 확대 제스처가 보존된다.
4. 스펙 026 owner와 `packages/render` 기하 계약은 **무변경**이다(재사용만).
5. 색 변경·활성 slot 전환은 구도를 보존하고, 형상이 바뀌는 변경(모델·템플릿·사이즈·이미지 교체/삭제)만 초기화한다.

## 4. 이 결정에 포함되지 않은 것 (여전히 미결정·미검증)

- 실기기 4환경(iOS Safari · Android Chrome · 삼성 인터넷 · 카카오 인앱)에서의 스크롤·제스처 충돌 → **실기기 육안 검증 필요**
- 실제 200% 브라우저 확대에서의 조작성 → **NOT TESTED**
- `touch-action` 적용 범위·조건(현재 `surface.css`에 선언 0), 터치 팬의 스크롤 양보 게이트 세부
- 인쇄/export 경로의 pan 재현(레거시 frame 하드코딩 `dim.w/500` 문제) → 별도 스펙
- 2손가락 핀치(D-6으로 1차 제외)의 향후 도입 여부
- 대용량 사진에서의 드래그 프레임률·메모리

## 5. 다음 단계

Codex가 이 결정을 입력으로 **스펙 029 구현 계약**을 작성한다. Claude Code는 그 스펙이 저장소에 기록되기 전까지 pointer/pan/zoom 제품 코드·테스트·CSS·설정을 작성하지 않는다.
