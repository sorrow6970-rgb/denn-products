# 2026-05-28 핸드오프 — 작업 3 (PC UI 전체 리뉴얼) Phase 1 진행

> 파일: `denn-mockup-tool.html`. 현재 main HEAD: `2fd76bd`.
> 검증: GitHub Pages 새로고침(`Ctrl+Shift+R`) + 콘솔 verifier 1줄. PC = 창 너비 ≥861px.

---

## 1. 보호 영역 (절대 수정 금지)
- 함수: `zeRender`, `renderFrame`, `renderCase`, `fbExport`, `sendKakao`, `openZoneEditor`
- 저장키: `denn_admin`, `denn_shared_db`, `denn_order_requests`, IndexedDB `denn_admin_state`

## 2. 작업 3 확정 방향 (재준)
- 레퍼런스: MOIITEE 디자인 툴. **"모든 설정을 아이콘 드로어"** 방식 → 모바일 바텀시트(작업 5)와 1:1 매핑 목적.
- **PC(≥861px) 4컬럼 셸**: `[기능 아이콘 레일 | 기능 메뉴(드로어) | 캔버스 | 우측(요소 리스트+액션)]`.
- **모바일(<861px)·기존 패치·렌더 함수 무수정** — DOM 이주 방식이나 모바일 진입 시 원래 구조로 restore.
- 케이스+액자 둘 다 대상이나 **액자(#page-frame) 먼저** 구현 중. 케이스는 다음.

## 3. 이번 세션 완료 (Phase 1, 액자, 전부 push됨)

### 3-A. 액자 스케일 리워크 (작업 3 진입 전, A·B·C 완료 — 별도 핸드오프 `2026-05-27-scale-task2-handoff.md` 3절)
- (A/B) 로드·탭전환 작은-스케일 점프 제거 (`3d947c1`, ResizeObserver)
- (C) cap 해제 + 영역 초과 스크롤 (`e8be317`/`86abca3`/`9fae79d`) + info-bar 패널 이동

### 3-B. PC 셸 (작업 3 Phase 1)
| 커밋 | 내용 |
|---|---|
| `fc78fdf` | 4컬럼 셸 골격 + 기존 조각 DOM 이주 |
| `fa8f187` | 기능 아이콘 레일 + 메뉴 전환(setGroup) + 우측 리스트 |
| `a512220` | 문구 별도 아이콘, 우측=액션 항시, 레일 풀높이, 주문버튼 MutationObserver |
| `d2e4388` | 우측 **요소 리스트(행별 ×삭제)** + **기본설정으로 버튼** |
| `cd64ab7` | 컬럼 폭 해상도 연동(clamp vw), 패딩 통일, 템플릿 그리드 풀높이 |
| `b30f052` | 좌우 컨트롤 박스 폭 동일, 템플릿 카드 2열·확대 |
| `a1e751d` | **사이즈+템플릿 한 드로어 통합(A안)** — 아이콘 6→5 |
| `aebf92c` | **사이즈 칩 → 드롭다운(proxy)**, 아이콘명 시안→템플릿 |

### 현재 셸 구조 (HEAD 2fd76bd, 3-C 반영 후)
- 좌측 레일 **5아이콘**: `🖼템플릿 · 🌄이미지 · 🎨색상 · ✍문구 · 🕐시계` (클릭 시 메뉴 컬럼에 해당 그룹만 노출).
- **🖼템플릿 드로어** = 사이즈 **드롭다운**(상단) → 그 사이즈 템플릿 그리드(2열, 하단). 사이즈 먼저 → 그 사이즈 시안 흐름.
- 캔버스: 작업 C 스케일/스크롤 유지, 스케일 컨트롤러 하단 중앙.
- 우측 컬럼: info-bar(메뉴 상단으로 이동) 제외하고 → **요소 리스트(메인/이름/날짜/추가문구/이미지/시계, 행별 ×삭제)** + **↺ 기본설정으로** + 액션 스택(내공간/저장/주문/홈).
- 컬럼 폭 `clamp` 해상도 연동: 레일 80~108 / 메뉴=액션 264~380.

### 3-C. 룸 모달(내공간보기) 다듬기 (Phase 1 후속, 2026-05-28 후속 세션)
| 커밋 | 내용 |
|---|---|
| `9ee8b79` | 룸 캔버스 베이지 fallback → 그레이스케일 2톤 통일 |
| `0ae7c39` | `rmSizeCanvas` 전체 렌더 스케일 ↑ — 아일랜드 꽉 차게 |
| `9fe5789` | 액자 '크기' 슬라이더 제거 — 사이즈 가이드로 통일 |
| `87bd9ba` | 액자 탭 아이콘 🖼 → frame outline SVG |
| `637351d` | 액자 기본값 버튼 제거 + 사이즈 가이드 UI 크기 통일 |
| `b76d787` | 액자 이중 사각 아이콘 + 패널 축소·캔버스 확장 + 기본 흰색 |
| `5da3bd1` | `b76d787` 부분 롤백 — 액자 아이콘+캔버스 흰색만 유지, 나머지 복귀 |
| `431e584` | 액자 탭 — 사이즈 가이드 ↔ 액자 기울기 순서 swap |
| `3911d92` | 룸 모달 액션 버튼 순서 — 메인 셸과 정렬 |
| `2fd76bd` | 햇빛 토글 골드(#C8A864)→다크그레이 + 안내 박스 웜 톤 제거 |

- 셸 우측 액션 스택의 **내공간보기 모달** UI 다듬기 트랙. 메인 셸과 톤·순서 정렬 + 골드 잔존 제거가 핵심.
- 가드: next-session-context.md L254 "내공간보기 기본값/사이즈가이드/드래그 안정화 영역" 보호 — 위 커밋들은 톤/순서/아이콘 등 시각 다듬기 위주.

## 4. 핵심 구현 메모 (코드 위치)
- **`denn-v94-pc-shell-css` / `denn-v94-pc-shell-frame`** (파일 끝): 셸 빌드/원복.
  - `build()`: PC면 #page-frame을 4컬럼 셸로. 패널 자식을 마커 id로 분류(`#frame-sz-chips`·`#frame-tpl-grid`→tpl, `#frame-drop`→img, `#frame-color-chips`→color, `#f-main`/`#frame-text-style-box`→text, `#tog-clock`→clock, 그 외→우측 액션). preview-area→캔버스. `moved[]`에 원위치 기록.
  - `restore()`: <861px 진입 시 `moved` 역이주 → 원래 구조 복원(모바일 split-pane 정상화). MutationObserver disconnect.
  - `setGroup(g)`: 아이콘 클릭 시 해당 `.dps-group`만 노출.
  - 우측: `buildRightExtras` = 요소 리스트(`renderElemList`, `clearElem`) + `resetFrameDefaults`(confirm 후 applyFrameDefaultTexts force + resetImg + resetFrameTransform).
  - 주문 버튼(`denn-v36-order-btn-frame`)이 숨은 패널에 늦게 주입돼도 MutationObserver가 우측 액션 컬럼으로 이동.
- **`denn-v96-size-dropdown`** (파일 끝): 사이즈 칩 → `#frame-sz-select` 드롭다운. **칩 클릭 대리(proxy)** 방식이라 `selFSz` 래퍼(v36 기본문구/v80 사이즈권한)·`denn-size-disabled`·템플릿 필터 그대로. 칩은 `display:none`(JS 실패 시 fallback). 칩 .on/rebuild를 MutationObserver로 select 동기화. PC·모바일 공통.

## 5. 다음에 할 일 (우선순위 미확정 — 재준 선택)
1. **레일/메뉴 디자인 다듬기** — 아이콘 비주얼, 빈 공간, 색감.
2. **케이스 페이지(#page-case)도 동일 셸 적용** — 현재 액자만. (build/restore를 case로 확장)
3. **첫 화면 템플릿 쇼케이스** — `next-session-context.md` 백로그 참조. **제작 제약**: 템플릿=(디자인×사이즈), 선택 템플릿 사이즈=주문 사이즈여야 제작 가능 → 사이즈-first 필연. 다양성은 "디자인별 1카드 갤러리 → 선택 시 사이즈" 방향이나 **디자인↔사이즈변형 연결 데이터 키 확인 선행**.
4. **상단 탭바 정리(헤더 통합)** — 현재 탭바(케이스/액자)와 셸 공존. 케이스 셸 적용 후 통합.

## 6. 백로그 (별도 처리, next-session-context.md에도 기록)
- **[버그] 가로모드(landscape) 이미지 회전 이상** — UI 아닌 렌더/이미지 방향(EXIF orientation 추정) 처리로 접근. renderFrame 보호영역 인접 주의.
- **[기능] 풀 편집 히스토리(②b)** — 시간순 로그 + 특정 수정만 비선형 undo. 캔버스 즉시렌더 구조라 명령/스냅샷 시스템 필요 = 대규모. 배포 후 v2.

## 7. verifier 모음 (콘솔 1줄, 액자 탭에서)
### 셸 구조
```js
(()=>{const sh=document.querySelector('#page-frame .denn-pc-shell');if(!sh)return'셸 없음';const tpl=sh.querySelector('.dps-group[data-g="tpl"]');return JSON.stringify({icons:[...sh.querySelectorAll('.dps-icon .dps-lab')].map(l=>l.textContent),tpl_has_size:!!(tpl&&tpl.querySelector('#frame-sz-chips')),tpl_has_grid:!!(tpl&&tpl.querySelector('#frame-tpl-grid')),elem_rows:sh.querySelectorAll('.dps-elem-row').length,has_reset:!!sh.querySelector('.dps-reset-btn'),action_in_right:!!sh.querySelector('.dps-action .denn-frame-action-stack')},null,2)})()
```
### 사이즈 드롭다운
```js
(()=>{const sel=document.getElementById('frame-sz-select'),chips=document.getElementById('frame-sz-chips');return JSON.stringify({dropdown:!!sel,options:sel?sel.options.length:0,chips_hidden:chips?getComputedStyle(chips).display==='none':null,active:sel&&sel.selectedIndex>=0?sel.options[sel.selectedIndex].textContent:null},null,2)})()
```

## 8. 환경
- 메인: Claude Code (PowerShell, `C:\repo\denn-products`). 워크플로우: 자연어 의뢰 → main 직접 push.
- 모바일 테스트: `https://sorrow6970-rgb.github.io/denn-products/denn-mockup-tool.html`
- 콘솔 진단 5원칙: verifier 1줄 + ```js + 주석 제거 + 입력 절차 안내.
- 참고 스크린샷은 로컬 `SCREEN SHOT/`(gitignore됨).
