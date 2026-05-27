# 2026-05-27 핸드오프 — 작업 2(문구별 색상/그림자) + 액자 스케일 리워크

> 이어서 수정하기 위한 현재 상태 + 미해결 항목 정리. 파일: `denn-mockup-tool.html` (고객 목업툴).
> 현재 main HEAD: `489a04f` (B2 revert 직후 = `78f0d79` 일원화 상태와 동일 코드).
> 검증 방식: GitHub Pages 새로고침(`Ctrl+Shift+R`) + 콘솔 verifier 1줄 → 스크린샷.

---

## 1. 보호 영역 (절대 수정 금지)
- 함수: `zeRender`, `renderFrame`, `renderCase`, `fbExport`, `sendKakao`, `openZoneEditor`
- 저장키: `denn_admin`, `denn_shared_db`, `denn_order_requests`, IndexedDB `denn_admin_state`

---

## 2. 작업 2 — "05 문구 입력" 토글/펼침/row 게이팅 (대체로 완료, 검증됨)

### 최종 정책 (재준 확정)
- **`_image` row(PNG 박힌 텍스트, UI 라벨 "템플릿 문구")** 표시는 어드민 `allowColorChange`로 게이팅.
- **V363 사용자 입력 문구**(defaultTexts 기반 동적 입력칸) 색/그림자는 입력칸 있으면 항상 허용.
- 마스터 토글 **OFF → "전체 문구 공통 설정"만 노출**, **ON → 해당 항목 row 드롭다운**.
- `_image` **내부 로직(마스크 컴포지트/Phase C 색변경) 무수정** — 표시/게이팅만 조정.

### 동작 매트릭스
| allowColorChange | V363 입력칸 | 박스 | _image row |
|---|---|---|---|
| false | 없음 | 숨김+잠금 | — |
| false | 있음 | 표시·ON 가능 | 숨김 |
| true | 없음 | 표시·ON | 표시 |
| true | 있음 | 표시·ON | 표시 + V363 row |

### 관련 커밋 (검증 완료)
- `8d2605a` allowColorChange 게이트를 `_image` row 전용 분리 + 조정대상 0이면 박스 숨김 (`applyGating` `:11020` 본체 수정 + CSS `denn-phase-c-box-hidden`)
- `b6b30ea` 마스터 OFF=공통설정만 / ON=개별 row 드롭다운 (`:not(.on)` row 숨김 규칙)
- (`eec26b3`/`0b88be1`는 그 전 단계 = `_image` 항상표시 회귀픽스, 이후 정책 바뀌어 `b6b30ea`가 덮음)

### 핵심 아키텍처 메모
- 실제 문구 필드/row 엔진 = **V363** (`denn-v36-3-dynamic-frame-text-fields` IIFE, `:9251`). 정적 입력칸(main/name/date/sub)·`buildFrameTextStyleControls`는 hidden/죽음. → 문구 row 관련은 **V363 내부(`build`/`syncStyleRows`/`templateFields`) 직접 수정**, 새 wrap 금지.
- 토글 잠금 3중 레이어: v70(`:6249`) + v97(`:7037`) + Phase C `applyGating`(`:11020`). `__dennPhaseCImageAllows`(=allowColorChange) 공유.

### 작업 2 잔여 (선택)
- name2 누락 엣지: v70 `allowedKeys`(`:6236`)에 name2 없음 → 커스텀 키만 있는 시안에서 토글 잠길 수 있음. **별도 작업으로 분리하기로 함.**

---

## 3. 액자 스케일 리워크 — ⚠️ 미완성, 베이스로 되돌린 상태

### 현재 베이스 (`489a04f` = `78f0d79` 코드)
- **스케일 방식**: `transform:scale` (v361 `applyPreviewScale` `:8997`)
- **스케일러 일원화 완료**: v39 `applyStableScale` 무력화(`:3961` 가드), `installFrameWrapScaleLock` 비활성(`:10585` early return), v23/v36 스케일러는 기존부터 무력화. → **v361 단일 스케일러.**
- **PC 기준 계수 0.868** (기존 슬라이더 155% = 새 100% 기본값). 모바일은 0.56 유지. 공식: `scale = fit × (mobile?0.56:0.868) × (slider/100)`, `fit=min(1.45, area/logicalSize)` (`:9006`, `:3967`).
  - 적용 위치 2곳: v361 `:9006`(live), v39 `:3967`(무력화됨이지만 계수는 맞춰둠).

### 되돌린 것 (실패한 시도들)
- `484b328` **B2(CSS 사이징 + 스크롤 + 플래시 제거)** → **revert(`489a04f`)**. 이유: 스크롤 안 됨 + 확대축소 매끄럽지 않음 + 튐 여전.
- `07369ac` scale-lock 우회 밴드에이드 → 일원화(`78f0d79`)로 대체됨.

### 🔧 미해결 — 다음에 고칠 항목 (우선순위 순)

**(A) 튐(jitter) — 최우선.**
- 증상: 스케일이 짧게 튀는 현상. 78f0d79에서 "튐 없다"고 했었으나, 이후 "여전하다" 피드백 있음 → **현재 베이스에서 재확인 필요.**
- 진단 포인트: 로드 직후 / 슬라이더 input / 리사이즈 중 **언제** 튀는지 특정. 매 renderFrame마다 v361 `scheduleScale[0,80,220ms]`이 여러 번 적용하는 게 원인일 수 있음(중간값 깜빡임).
- 가설: scheduleScale의 다중 틱(0/80/220) 사이 중간 fit/scale이 잠깐 적용 → 튐. 단일 적용 or 디바운스 검토.

**(B) 초기 작은-스케일 플래시.**
- 증상: 새로고침 직후 정말 짧게 작은 스케일로 보였다가 정상화.
- 원인 추정: 로드 시 canvas 기본 attribute(400×400) 또는 첫 applyPreviewScale가 미정착 area 크기로 계산 → 작게 → 정정.
- 시도했던 fix(B2의 `visibility:hidden` 후 노출)는 B2와 함께 revert됨. transform 방식 유지하면서 별도로 적용 가능.

**(C) 스케일 확대 시 미리보기 스크롤 (영역 초과분).**
- 요구: 액자를 영역 밖까지 키우면 **컨트롤 패널 말고 미리보기(모달) 영역에 상하/좌우 스크롤바.**
- 난점: `transform:scale`은 레이아웃 footprint를 안 만들어 스크롤 영역이 안 생김.
- 실패한 접근(B2): transform 제거 + 캔버스 CSS width/height 직접 사이징 → 스크롤은 이론상 되나 **실제로 스크롤 안 됨 + 확대축소 끊김**. 원인 재분석 필요(아마 `safe center` flex + overflow 조합 or 캔버스 사이징 타이밍 문제).
- 대안: **B1(사이저 래퍼)** — transform 유지하고 스케일 크기를 가진 sizer DOM을 감싸 footprint 생성 + `#frame-preview-area{overflow:auto}`. transform 메커니즘 유지라 확대축소는 매끄러울 것.

### 레이아웃 메모 (참고, 정상 동작 중)
- `9e21636` PC 좌측 패널 내부 스크롤(`@media(min-width:861px) #page-frame .panel{max-height:calc(100vh-95px)}`) → 드롭다운 시 미리보기 안 흔들림. (정상)
- `.main{display:grid; 340px 1fr; min-height:calc(100vh-95px)}`(`:33`), `.preview-area{...justify/align center; overflow:hidden; min-height:500px}`(`:142`), `.canvas-wrap{position:relative;z-index:1}`(`:147`).
- 프레임 미리보기 영역(`#frame-preview-area` `:347`) 오버레이는 워터마크(`wm-ov-frame`, canvas-wrap 내부)뿐. 사이즈가이드 `sg-canvas`는 룸 모달 전용.

---

## 4. 재검증 verifier 모음 (콘솔 1줄)

### 스케일 상태 (실제 적용된 transform 읽기)
```js
(()=>{const a=document.getElementById('frame-preview-area'),w=document.querySelector('#page-frame .canvas-wrap'),c=document.getElementById('frameCanvas');if(!a||!c||!w)return'미리보기없음';const m=(w.style.transform||'').match(/scale\(([\d.]+)\)/);return JSON.stringify({screen:innerWidth+'x'+innerHeight,applied_scale:m?+m[1]:null,area_h:Math.round(a.clientHeight),canvas:c.width+'x'+c.height,slider:(window.getFramePreviewUserScaleV361&&getFramePreviewUserScaleV361())||'?',mode:(window.DENNFramePreviewScaleV361&&DENNFramePreviewScaleV361.mode())||'?'},null,2);})()
```

### 작업 2 게이팅 상태
```js
(()=>{const $=id=>document.getElementById(id),vis=n=>{if(!n)return false;const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&r.height>0},t=window.curFTpl||{},box=$('frame-text-style-box');return JSON.stringify({tpl:t.name||t.id,allowColorChange:!!t.allowColorChange,master_on:!!(box&&box.classList.contains('on')),image_row_visible:vis($('fts-row-_image')),visible_color_rows:[...document.querySelectorAll('#frame-text-style-body .frame-text-style-row')].filter(r=>vis(r)).map(r=>r.id.replace('fts-row-','')),box_hidden:!!(box&&box.classList.contains('denn-phase-c-box-hidden'))},null,2);})()
```

---

## 5. 환경
- 메인: Claude Code (PowerShell, `C:\repo\denn-products`). 워크플로우: 자연어 의뢰 → main 직접 push.
- 모바일 테스트: `https://sorrow6970-rgb.github.io/denn-products/denn-mockup-tool.html`
- 콘솔 진단 5원칙: verifier 1줄 + ```js 블록 + 주석 제거 + 입력 절차 안내.
