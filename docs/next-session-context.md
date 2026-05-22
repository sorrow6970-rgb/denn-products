# 다음 세션 작업 컨텍스트 (2026-05-22 작업 종료 시점, 재정의 v2)

## 다음 세션 작업 순서 (재준 확정)

1. **[다음 1순위]** 액자 기본 이미지(placeholder) 기능 추가 (PC/모바일 공통)
2. **[그 다음]** 템플릿 색상/그림자 토글 활성화 조건 변경 (PC/모바일 공통)
3. **[그 다음]** Phase 3: Firestore 통합 — 어드민/mockup-tool 데이터 동기화
4. **[그 다음]** 모바일 최적화 1단계: 모바일 전체 레이아웃 (바텀시트 패턴) 적용
5. **[그 다음]** 모바일 최적화 2단계: 바텀시트 적용 후 실사용 검토 → 나머지 모바일 UX 수정 항목 하나씩 재평가 후 진행
6. **[최종]** Phase 4: 1차 배포

### 이미 해결된 항목 (참고)
- "액자 자체 스케일 조정 바" 모바일 제거 — 12c78aa로 완료, 재준 검증 완료

### 핵심 재정의 사항
- 작업 1·2는 **PC/모바일 공통** 우선 (모바일 단독 UX는 바텀시트 이후 일괄 재평가)
- Phase 3 (Firestore)를 모바일 본격 작업 **이전**에 배치 — 데이터 동기화 인프라 위에서 반복 모바일 테스트 효율 ↑
- 보류 항목(사이즈 드롭다운 / 프레임 보이기 정리 / HSV 라벨)은 모두 **작업 5에서 바텀시트 적용 후 필요성 재판단**

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

## 작업 3 — Phase 3: Firestore 통합 (어드민 ↔ mockup-tool 동기화)

### 배치 이유
- 모바일 본격 작업 (작업 4 바텀시트) **이전**에 진행
- 데이터 동기화 인프라가 깔린 상태에서 모바일 반복 테스트가 훨씬 효율적
- 어드민에서 시안 추가/수정 → 모바일 mockup-tool에서 즉시 반영되는 흐름 확보

### 사전 평가 시점에 검토할 것
- 현재 IndexedDB(`denn_admin_state`) + localStorage(`denn_admin`) 구조와 Firestore 매핑 설계
- 시안 이미지/placeholder 이미지(작업 1 결과물)는 Storage 그대로 유지, 메타데이터만 Firestore로
- 보호 영역 저장키(`denn_admin`, `denn_shared_db`, `denn_order_requests`)와의 관계 정리

---

## 작업 4 — 모바일 최적화 1단계: 바텀시트 레이아웃 적용

### 전제
- Phase 3 Firestore 통합 완료 후 진입 (데이터 동기화 인프라 위에서 반복 모바일 테스트 효율 ↑)

### 목표 디자인
- 상단: 액자 미리보기 영역 (항상 표시, 화면 대부분 차지)
- 하단 고정 탭바: 카테고리 아이콘 (상품 선택 / 템플릿 / 이미지 / 텍스트 / 도형 / 장식 등 — mockup-tool 실제 카테고리에 맞게)
- 탭 아이콘 탭 시 → 해당 설정 패널이 하단에서 위로 올라오는 바텀시트
- 다시 탭 또는 X 닫기 → 패널 내려가고 미리보기 풀화면

### 현재 모바일 구조와의 차이
- 현재: PC 레이아웃을 세로로 단순 펼침 (액자 위, 좌측 패널 아래 + split-pane handle)
- 변경 후: 모바일 전용 완전 재구성 (액자 위, 탭바 아래, 설정은 바텀시트 슬라이드)

### 옵션 — 진입 시 재준이 선택
- **A.** 현재 split-pane 구조 유지 + 다듬기 (가장 보수적)
- **B.** 바텀시트 방식 (위 목표 디자인) ← 새 옵션
- **C.** 다른 형태

### 사전 검토 요청 (모바일 최적화 진입 시점에 판단용)
1. 현재 mockup-tool 카테고리 구조 (상품 선택/템플릿/이미지/텍스트 등)와 바텀시트 탭바 매핑 적합성
2. 바텀시트 라이브러리 도입 vs 자체 구현 비용
3. 보호 영역과의 충돌 가능성

### 원칙
- 모바일 전용 (`@media`로 분리, PC는 기존 좌우 분할 레이아웃 유지)
- 보호 영역 무수정

---

## 작업 5 — 모바일 최적화 2단계: 바텀시트 적용 후 보류 항목 재평가

### 방식
- 작업 4 (바텀시트) 적용 후 실사용해보고
- 아래 미해결 항목들을 하나씩 재검토해서 정말 필요한지 판단
- 각 항목 진행 전 재준 승인 받고 개별 작업

### 재평가 대상 항목 (보류 중)

#### 1) 모바일 액자 사이즈 설정 UX (드롭다운 변경)
- 현재: 칩(`.chips.c2 #frame-sz-chips`) — 카드 형식
- 변경 후보: 모바일에서 드롭다운(`<select>`) 형태
- 사전 조사 시작점:
  - HTML: `denn-mockup-tool.html` line 301 `<div class="chips c2" id="frame-sz-chips">`
  - JS 빌드: line 769 `buildUI()` 안 `fsc.innerHTML=FS.map(...)`
  - 선택 핸들러: `selFSz`
- **재평가 포인트**: 바텀시트 구조에서 사이즈 선택 UI가 어떻게 배치되는지에 따라 드롭다운 불필요할 수도

#### 2) 프레임 보이기 영역 UI 정리 (PC/모바일 공통)
- 안내 문구 삭제: "OFF 시 프레임 레이어만 숨기고..." 같은 문구 제거
- 토글 위치 이동: "시계 표시" 토글 바로 위로
- 사전 조사 시작점:
  - "시계 표시": `denn-mockup-tool.html` line 337 `<div class="sec-label">06 시계 표시</div>`
  - "프레임 보이기" 토글: `tog-frame-visible` ID (line 10092 sweep 코드 참조)
  - 안내 문구 DOM: `denn-frame-visible-row` 내부 추정
- **재평가 포인트**: 바텀시트 적용 후에도 동일한 정리가 필요한지

#### 3) 모바일 "색상 선택 → 맞춤 설정" UI 정리
- "색조/채도/값" 라벨 중앙 정렬 (모바일 환경)
- 영문 변경: 색조 → Hue, 채도 → Saturation, 값 → Value (또는 H/S/V 짧은 표기)
- 사전 조사 시작점:
  - 라벨 텍스트 grep: "색조", "채도", "값"
  - HSV 컨트롤 위치: color picker 모달 또는 inline panel
- **재평가 포인트**: 바텀시트 색상 패널에서 어떻게 배치되는지 보고 재판단

### 원칙
- 바텀시트 적용 후 실제 사용 흐름 보고 필요성 재검토
- 일부 항목은 바텀시트 구조에서 자연스럽게 해결됐을 수 있음
- 보호 영역 무수정
- PC 영향 있는 항목(예: 2번)은 PC/모바일 공통으로 진행

---

## 1차 배포 전 전체 로드맵 (재확인)

- ✅ Phase 1: 템플릿 색상/그림자 — 완료 (Phase C로 진입)
- ⏳ Phase 2: PC/모바일 공통 정비 (작업 1·2) — 다음 세션
- ⏳ Phase 3: Firestore 통합 (작업 3)
- ⏳ Phase 4: 모바일 최적화 (작업 4 바텀시트 → 작업 5 보류 항목 재평가)
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
