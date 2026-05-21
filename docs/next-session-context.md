# 다음 세션 작업 컨텍스트 (2026-05-22 작업 종료 시점)

## 오늘 완료한 작업

### 모바일 share 기능 완성 (b522cf4 ~ de90727)
- `?share=<URL>` query + `#share=<path>` hash fragment 양쪽 지원 (카톡 인앱 query strip 우회)
- 짧은 URL 지원 (Firebase Storage path만 share 값으로 사용)
- 모바일 화면 toast로 단계별 진행 상태 표시 (1/5 ~ 5/5)
- reload 직전 hash 제거 (`history.replaceState`) → `location.replace`가 hash-only 변경으로 no-op 되는 버그 차단
- share IIFE에서 IndexedDB(`denn_shared_db/kv/denn_admin_state`)도 직접 저장 → `loadAdminFresh`의 머지에서 share 데이터 묻히는 문제 해결
- 검증: `[init] FTPLS=32 / raw=32 / uploaded=32 / denn_admin 213772b`

### 모바일 split-pane 레이아웃 (fcd36db ~ 12c78aa)
- mobile-layout-v1: 액자 위 + 설정 아래 재배치 (`order` flex), sticky preview, 62vh 크기 제한
- 핫픽스: `.page.on` 토글 보존, vh → svh로 주소창 변동 흔들림 해결
- split-pane handle: 모바일에서만 미리보기/설정 사이 드래그 가능한 18px 핸들 inject + 25~75% 분할 비율 + localStorage 저장 + drag 종료 시 resize 이벤트로 renderFrame 재계산
- 비활성 페이지 leak 차단: `.page:not(.on){display:none!important}` (기존 line 8601의 `.on` 무시 룰 우회)
- `#frame-preview-scale-box` 모바일 hide: CSS만으론 v36 IIFE의 동적 `<style>` race 패배 → JS로 `inline display:none !important` 강제 + MutationObserver(`#frame-preview-area` 스코프) + setTimeout 9회 시리즈

### 잘못 막은 것 롤백 (4cb8650)
- 877390b/40f5f16의 사진 줌(핀치 + zoom 슬라이더) 차단은 사용자 의도 오해석 → 롤백
- 사용자의 정확한 의도는 `#frame-preview-scale-box`(액자 자체 스케일 슬라이더) → 12c78aa로 정확 타겟 hide

---

## 다음 세션 작업 순서 (재준 확정)

1. **[다음 1순위]** 액자 기본 이미지(placeholder) 기능 추가
2. **[추가]** 템플릿 색상/그림자 토글 활성화 조건 변경 (PC/모바일 공통)
3. **[추가]** "액자 자체 스케일 조정 바" 모바일 제거 — **12c78aa로 완료**, 검증만 필요
4. **[추가]** 모바일 액자 사이즈 설정 UX 변경 (드롭다운)
5. **[추가]** 프레임 보이기 영역 UI 정리 (PC/모바일 공통)
6. **[추가]** 모바일 "색상 선택 → 맞춤 설정" UI 정리
7. **[그 다음]** Phase 3: Firestore 통합 — 어드민/mockup-tool 데이터 동기화
8. **[그 다음]** 모바일 최적화 본격 작업
9. **[최종]** Phase 4: 1차 배포

---

## 작업 1 — 액자 기본 이미지(placeholder) 기능 추가

### 의도
- 어드민 "액자 템플릿 → 상세 설정"에 **"기본 이미지" 업로드 필드** 추가
- Firebase Storage 업로드 시스템 재활용
- 시안별 별개 지정
- mockup-tool에서 고객이 사진 업로드 전 이 기본 이미지 표시
- 고객 사진 업로드 시 본인 사진으로 교체
- 기본 이미지 미설정 시 fallback: 기존 동작 유지 (empty-state)

### 원칙
- 보호 영역(zeRender/renderFrame/fbExport/sendKakao/openZoneEditor) 무수정
- PC/모바일 양쪽 적용
- 폰케이스 템플릿은 일단 제외, 액자만 우선
- **작업 전 사전 평가** (작업 분량/위험 요소/변경 위치) 먼저 보고
- 가벼우면 바로 적용, 위험 있으면 승인 받고 진행

### 사전 조사 시작점
- 어드민 상세 설정 modal: `denn-admin.html` line 615 부근(`slot-tpl-name`) + zone editor 영역
- Firebase Storage 업로드: `denn-admin.html` 14029~14048 (fbExport 자동 업로드 wrap)
- 시안 데이터 모델: `S.frameTemplates[i]`에 `placeholderImage`/`placeholderStoragePath` 같은 키 추가 검토
- mockup-tool 표시: `renderFrame` 진입 시 `frameImg`가 없으면 `tpl.placeholderImage` 사용

---

## 작업 2 — 템플릿 색상/그림자 토글 활성화 조건 변경

### 현재 동작 (문제)
- mockup-tool 좌측 패널 "문구별 색상/그림자" 영역에서 문구가 추가되지 않은 시안의 경우, Phase C에서 추가한 **"템플릿 문구" `_image` zone row의 색상/그림자 토글까지 전부 막힘**
- 사용자가 "문구 없어도 템플릿 자체 색상은 바꾸고 싶은데 왜 안 되지" 혼란

### 개선 의도
- 문구 row는 "추가된 것만 표시" (현재 동작 유지)
- `_image` (템플릿 본체) 색상/그림자 토글은 **문구 유무와 무관하게 활성화**
- 즉 토글을 막는 게 아니라, "있는 row만 띄워주는" 방식

### 참고
- Phase C 완료 시점 commit: `cee947f` — swap hook 도입
- API: `window.dennPhaseCCustomerColor.{getState, autoVerify, autoEnable, forceRebuild, clearDebug, debugRender, dedupRows}`
- `_image` zone row가 어드민 `allowColorChange`와 게이팅된 부분이 있는지 확인 필요

### 원칙
- 보호 영역 무수정
- PC/모바일 공통 적용
- 사전 평가 후 적용

---

## 작업 3 — "액자 자체 스케일 조정 바" 모바일 제거

### 현재 상태
- **12c78aa로 완료** (`#frame-preview-scale-box` 모바일 강제 hide)
- 사용자 모바일 검증 완료 ("해결했어")
- 다음 세션에서는 PC 회귀만 가볍게 확인 (PC에서 박스 여전히 표시 + 정상 동작)

### 건드리지 말아야 할 것 (재확인)
- 업로드한 사진의 캔버스 내부 확대/축소 (zoom) — `frameImgT.scale`
- 캔버스 내부 드래그 이동 (pan) — `frameImgT.x/y`
- → 이건 그대로 유지

### 핵심 식별 정보
- 박스 element: `#frame-preview-scale-box` (v36 IIFE, line 3865/3944 `frame-preview-area`에 appendChild)
- 핸들 연동: `applyStableScale` (`#page-frame .canvas-wrap`에 transform scale 적용) — `area.clientWidth/Height` 기반 fit 자동 계산
- 동적 style 충돌: line 3912-3914 `document.head.appendChild`로 추가되는 style — CSS만으론 race 패배, JS inline style 필요

---

## 작업 4 — 모바일 액자 사이즈 설정 UX 변경

### 의도
- 현재: 액자 사이즈 선택 UI = 칩(`.chips.c2 #frame-sz-chips`) — 카드 형식
- 변경: **모바일에서는 드롭다운(`<select>`) 형태**로 변경
- PC는 기존 칩 UI 유지
- `@media` 미디어 쿼리로 분리

### 사전 조사 시작점
- HTML: `denn-mockup-tool.html` line 301 `<div class="chips c2" id="frame-sz-chips">`
- JS 빌드: line 769 `buildUI()` 안에서 `fsc.innerHTML=FS.map(...)`로 칩 생성
- 선택 핸들러: `selFSz` 함수

### 구현 옵션
- A. 칩과 select를 둘 다 만들고 `@media`로 보임/숨김 토글 (DOM 중복 but 간단)
- B. JS로 모바일에서만 select 렌더링 (DOM 단일 but matchMedia 분기 필요)

---

## 작업 5 — 프레임 보이기 영역 UI 정리 (PC/모바일 공통)

### 1) 안내 문구 삭제
- 현재: "OFF 시 프레임 레이어만 숨기고 사진과 시계 좌표는 유지합니다." 같은 안내 문구
- 변경: **안내 문구 제거 (토글만 남기기)**

### 2) 토글 위치 이동
- 현재: 이미지 업로드/색상 설정 부근
- 변경: **"시계 표시" 토글 바로 위로 이동**
- 즉 토글 순서: `... → 프레임 보이기 → 시계 표시 → ...`

### 사전 조사 시작점
- "시계 표시" 영역: `denn-mockup-tool.html` line 337 `<div class="sec-label">06 시계 표시</div>` 부근
- "프레임 보이기" 토글: `tog-frame-visible` ID (line 10092 sweep 코드에서 참조)
- 안내 문구 DOM: `denn-frame-visible-row` 안에 있을 가능성

### 원칙
- 보호 영역 무수정
- PC/모바일 공통 적용

---

## 작업 6 — 모바일 "색상 선택 → 맞춤 설정" UI 정리

### 현재 동작 (문제)
- mockup-tool 좌측 패널 "문구별 색상/그림자" → 색상 선택 → 맞춤 설정 영역
- "색조 / 채도 / 값" 슬라이더 라벨이 모바일에서 모두 검정 텍스트로 식별 어려움
- 정렬도 흩어져 있어 가독성 낮음

### 개선 의도
1. "색조 / 채도 / 값" 라벨을 전부 **중앙 정렬** (모바일 환경)
2. 라벨 텍스트를 **영어로 변경**:
   - 색조 → Hue
   - 채도 → Saturation
   - 값 → Value
   - (또는 H / S / V 짧은 표기도 검토 가능 — 판단)

### 원칙
- **모바일 전용 변경** (`@media` 미디어 쿼리로 분리)
- PC는 기존 동작/표기 유지
- 보호 영역 무수정
- 사전 평가 후 적용

### 사전 조사 시작점
- 라벨 텍스트가 코드상 어디서 출력되는지 grep: "색조", "채도", "값"
- HSV 컨트롤은 color picker 모달 또는 inline panel 어디?
- 영문화는 **이 색상 선택 영역의 라벨만** 영문 변경 (전체 UI i18n 아님)
- 정렬은 flex/grid 중앙 정렬로 충분한지 확인

---

## 1차 배포 전 전체 로드맵 (재확인)

- ✅ Phase 1: 템플릿 색상/그림자 — 완료 (Phase C로 진입)
- ⏳ Phase 2: 모바일 UX 본격 정비 (작업 1~6) — 다음 세션
- ⏳ Phase 3: Firestore 통합 (어드민 ↔ mockup-tool 동기화)
- ⏳ Phase 4: 모바일 최적화 본격
- ⏳ Phase 5: 1차 배포 + 안정화
- ⏳ Phase 6: 2단계/3단계 wrap 정리 (배포 후)

---

## 보호 영역 (절대 수정 금지)

- 함수: `zeRender`, `renderFrame`, `renderCase`, `fbExport`, `sendKakao`, `openZoneEditor`
- 저장키: `denn_admin`, `denn_shared_db`, `denn_order_requests`
- IndexedDB 스키마: `denn_admin_state`
- 시안 이미지 저장, 내공간보기 기본값/사이즈가이드/드래그 안정화 영역

## 작업 환경

- 메인 도구: Claude Code (PowerShell)
- 보조 도구: Codex Cloud (분석/검토)
- 워크플로우: 자연어 의뢰 → Claude Code가 직접 main push
- 검증: 브라우저에서 새로고침 (Ctrl+Shift+R) + 모바일 GitHub Pages

## Firebase 정보

- 프로젝트: denn-products
- Storage: denn-products.firebasestorage.app
- 요금제: Blaze + 5000원 예산 한도
- Authorized Domains: `sorrow6970-rgb.github.io` 추가됨
- API config: `denn-admin.html` L13951~14002 부근에 하드코딩

## 모바일 테스트

- mockup-tool: `https://sorrow6970-rgb.github.io/denn-products/denn-mockup-tool.html`
- admin: `https://sorrow6970-rgb.github.io/denn-products/denn-admin.html`
- 캐시 무시: 시크릿 탭 / iOS Safari 기록 삭제 / 모바일 Chrome 사이트 데이터 삭제
- 배포 상태: https://github.com/sorrow6970-rgb/denn-products/actions

## 다음 세션 시작 방법

집/회사 PC에서 시작 시:
1. PowerShell 열기
2. `cd C:\repo\denn-products`
3. `git pull origin main`  ← 필수
4. `claude`
5. 자연어 한 줄:
   > "docs/next-session-context.md 읽고 작업 1 (액자 기본 이미지) 사전 평가부터 시작하자"
