# 2026-05-27 핸드오프 — 작업 2(문구별 색상/그림자) + 액자 스케일 리워크(완료)

> 이어서 수정하기 위한 현재 상태 정리. 파일: `denn-mockup-tool.html` (고객 목업툴).
> 현재 main HEAD: `9fae79d` (작업 2 + 액자 스케일 리워크 A·B·C **전부 완료·검증됨**).
> 검증 방식: GitHub Pages 새로고침(`Ctrl+Shift+R`) + 콘솔 verifier 1줄 → 스크린샷.
> ⚠️ 아래 2절의 `:라인번호`는 스케일 리워크 삽입(applyPreviewScale 부근 ~+30줄)으로 소폭 밀렸을 수 있음 — 검색으로 확인.

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

## 3. 액자 스케일 리워크 — ✅ 완료 (A·B·C 전부 해결·검증됨)

### 최종 구조 (v361 단일 스케일러, `transform:scale` 유지)
- **스케일러 일원화**: v39 `applyStableScale` 무력화(가드), `installFrameWrapScaleLock` 비활성, v23/v36 기존 무력화 → **v361 `applyPreviewScale` 단일.**
- **공식**: `scale = fit × (mobile?0.56:0.868) × (slider/100)`, `fit=min(1.45, (area-48)/logicalSize)`.
  - **fit cap(1.45)은 유지** → 기본(slider 100%) 표시 크기 불변(`fit×0.868≤1.26<1.45`라 기본은 cap 미도달).
  - **PC만 최종 scale cap 제거**(안전 상한 4). 모바일은 기존 1.45 cap 유지.
- **슬라이더**: PC `{default:100, min:60, max:300}`, 모바일 `{140, 80, 220}`.

### (A) 로드/탭 전환 시 작은-스케일 점프 — ✅ 해결 (B와 동일 현상이었음)
- **진짜 원인**: 기본 활성 페이지가 `#page-case`(L196 `class="... on"`)라 `#page-frame`은 로드 시 display:none → `frame-preview-area`가 **탭 전환 전까지 0×0**. 이때 첫 `applyPreviewScale`가 작은 scale(0.28)을 칠하고, 액자 탭 전환으로 area 정착되며 1.2로 스냅 = 점프. ((B) "초기 플래시"도 같은 메커니즘 → 함께 해결.)
- **픽스**: `applyPreviewScale`에서 area<120px면 transform 미적용 + `visibility:hidden`로 보류, **ResizeObserver**(`ensureAreaScaleObserver`)가 area 크기 변화(탭 전환=display none→실측 포함) 시 재호출 → 첫 정상 area에서 정상 scale로 한 번에 노출(`dennScaleReady`).
- **커밋**: `761b6d3`(초기 시도 — 시간 budget 재시도라 탭 미전환 시 0.28 고정 버그) → **`3d947c1`(ResizeObserver로 교정, 검증 완료)**. ※ 시간 재시도 방식 폐기, 이벤트 기반이 정답.

### (C) cap 해제 + 영역 초과 시 미리보기 스크롤 — ✅ 완료
- **cap 해제**: 위 공식대로 PC 최종 cap만 제거 → slider 119%+ dead zone 사라짐. 기본값 무영향(검증).
- **스크롤(B1 사이저 + 내부 스크롤 래퍼 분리)**: `ensureScaleSizer`가 `.canvas-wrap`을 **`.denn-scale-scroll` > `.denn-scale-sizer`** 2겹으로 감쌈.
  - `.denn-scale-sizer`: 크기 = `(논리W×scale) × (논리H×scale)` → **footprint 생성**. 내부 flex center로 wrap 정렬 → `transform-origin:center`(현행) 그대로 정합(B2가 막힌 origin 변경 회피).
  - `.denn-scale-scroll`: `position:absolute; inset:0; overflow:auto; align/justify safe center; z-index:1` → **스크롤 전담**. `safe center`로 영역 초과 시 상/좌 도달성 확보(B2가 막혔던 지점).
  - **`#frame-preview-area`는 overflow:hidden** 유지 → 그 안 absolute 오버레이(스케일 컨트롤러 `#frame-preview-scale-box` top:54px, `prev-top`, `empty-state`)가 **스크롤에 안 휩쓸리고 뷰포트 고정**.
- **info-bar(사이즈/프레임 요약) 이동**: 미리보기 하단(absolute) → **좌측 패널 최상단**(static 재배치). `ib-sz`/`ib-fc` id 유지라 갱신 JS 무영향.
- **PC 전용 스코프**: 전부 `@media(min-width:861px)`. 모바일(≤860px)은 두 래퍼 `display:contents`로 무력화 → 레이아웃 무변경.
- **커밋**: `e8be317`(cap 해제 + 사이저 스크롤) → `86abca3`(info-bar 패널 이동) → **`9fae79d`(스크롤 래퍼 분리 = 컨트롤러/오버레이 고정)**. CSS 블록: `denn-v92-frame-scale-scroll-css`, `denn-v93-infobar-panel-css`.

### 남은 것
- **액자 스케일 리워크 종료.** 모바일 스케일/스크롤 cap은 의도적으로 손대지 않음(작업 5/6 모바일 단계에서 별도 판단).
- 레이아웃 참고: `.main{display:grid; 340px 1fr; min-height:calc(100vh-95px)}`, `9e21636` 좌측 패널 내부 스크롤(정상).

---

## 4. 재검증 verifier 모음 (콘솔 1줄)

### 스케일 상태 (cap·사이저·스크롤 래퍼 포함)
```js
(()=>{const a=document.getElementById('frame-preview-area'),w=document.querySelector('#page-frame .canvas-wrap'),sc=a&&a.querySelector('.denn-scale-scroll'),sz=a&&a.querySelector('.denn-scale-sizer'),D=window.DENNFramePreviewScaleV361;if(!a||!w)return'미리보기없음';const m=(w.style.transform||'').match(/scale\(([\d.]+)\)/);return JSON.stringify({mode:D&&D.mode(),slider:D&&D.get(),slider_max:D&&D.config.desktop.max,applied_scale:m?+m[1]:null,sizer:sz?sz.style.width+' x '+sz.style.height:'없음',scroll_wrap:!!sc,area_overflow:getComputedStyle(a).overflow,scrollable:sc?(sc.scrollWidth>sc.clientWidth||sc.scrollHeight>sc.clientHeight):false,infobar_in_panel:!!document.querySelector('#page-frame .panel>.info-bar')},null,2);})()
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
