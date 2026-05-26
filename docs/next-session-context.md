# 다음 세션 작업 컨텍스트 (2026-05-22 작업 종료 시점, v3 — PC UI 리뉴얼 신설)

## 다음 세션 작업 순서 (재준 확정)

1. **[다음 1순위]** 액자 기본 이미지(placeholder) 기능 추가 (PC/모바일 공통)
2. **[그 다음]** 템플릿 색상/그림자 토글 활성화 조건 변경 (PC/모바일 공통)
3. **[그 다음]** PC UI 전체 리뉴얼 — 좌측 사이드바 + 시안 그리드 + 메인 캔버스 구조
4. **[그 다음]** Phase 3: Firestore 통합 — 어드민/mockup-tool 데이터 동기화
5. **[그 다음]** 모바일 최적화 1단계: 바텀시트 레이아웃 적용
6. **[그 다음]** 모바일 최적화 2단계: 바텀시트 적용 후 나머지 모바일 UX 수정 항목 재평가 → 개별 진행
7. **[최종]** Phase 4: 1차 배포

### 이미 해결된 항목 (참고)
- "액자 자체 스케일 조정 바" 모바일 제거 — 12c78aa로 완료
- **PC 액자 스케일 슬라이더 회귀 픽스** — 000ffce: lock(`installFrameWrapScaleLock`)에 사용자 input bypass 플래그 추가. v39 자동 호출(스케일 튐 차단)은 유지
- **PC 새로고침 시 100% 리셋** — a4d3d2f: viewport>860일 때 v36.1 IIFE 진입 직후 localStorage 두 키 제거 (모바일은 미수정)

---

## 작업 1 — 액자 기본 이미지(placeholder) 기능 추가 (PC/모바일 공통)

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

### 진행 상황 (2026-05-26 기준)
| 항목 | 상태 | 비고 |
|---|---|---|
| 기능부 (어드민 저장 + mockup-tool 본 캔버스 표시) | ✅ | `66f737d` 외 |
| mockup-tool 시안 카드 썸네일 placeholder 강제 노출 | ✅ | `5f3fa74` — v37 CSS `!important` 잠금 돌파 |
| 변경요청 1 — 이미지 수정 패널 제거 | ✅ | `4b79bb2` — ze-modal에서 중복 기능 제거 |
| A1 어드민 카드 📷 뱃지 (본체 패치 → MutationObserver 전환) | ✅ | `1e3faeb` — wrap chain 의존 0 + 16px 골드 아웃라인 디자인 |
| A3 어드민 가이드 모달 재진입 표시 | ✅ | 메모리는 stale, 실측 결과 이미 정상 작동 (코드 변경 0) |
| A4 mockup-tool selFTplByRef 시안 전환 placeholder | ✅ | 메모리는 stale, 실측 결과 이미 정상 작동 (코드 변경 0) |
| 변경요청 2-A — UI 정돈 (우측 컨트롤 통합 + 모달 광폭화) | ✅ | `f76c9dd` — ze-aux-grid를 .ze-controls 최상단으로, 모달 width 1600px, 우측 패널 36% |
| 변경요청 2-B — 가이드 깜빡임 픽스 | ✅ | `f76c9dd` — syncGuideOverlay sig 비교로 innerHTML reset skip |
| 변경요청 3 — 모달 ON/OFF 마스터 토글 | ✅ | `609d3e2` — 휘발성 toggles, 모달 열 때 ON 리셋 |
| A2 — 캔버스 placeholder overlay + z-index 회귀 + 잘림 시각화 | ✅ | `609d3e2` — canvas z-index:3, 2-layer (outer opacity 0.3 + inner clip 1.0), cover 계산 |
| 개선 1 — 가이드 선 의미 강화 (3분할 + 십자 + 안전영역) | ✅ | `efaa830` SVG overlay + `0175575` 회귀 픽스(sig stale + 토글 결합 해제) |
| 개선 2 — placeholder 이미지 조작 (drag/wheel) + addZone 모드 분리 + type-btn 동기화 | ✅ | placeholder IIFE 안 ZE.editMode/phPanning 휘발 상태 + setZT wrap |

**→ 작업 1 (액자 기본 이미지 placeholder) 완전 종료. 작업 2 진입 가능.**

### A1 회귀 원인 (메모 자산)
- 본체 `renderFTplsByCategory` (L1345) 마지막 줄 패치 시도 → 후속 wrap 5단(L2976/L3014/L3230/L3295) 누적이 본체 호출 결과를 가로채면서 setTimeout 발사 0건
- 사용자 verifier로 setTimeout hook → `calls:0`, `threw:null` → 호출 자체가 도달 못함 확인
- MutationObserver(`#frame-tpl-grid-a` childList, subtree:false)로 우회 → wrap chain 의존 0, badge 부착은 손자 레벨이라 무한루프 0
- **교훈**: wrap chain이 두꺼운 함수의 본체 패치는 신뢰 불가. observer/직접 hook이 self-closing.

### URL escape 픽스 (메모 자산)
- `style="...background:url(\"...\")..."` — 외부 `"`와 내부 `"` 충돌로 URL 빈 문자열 잘림
- 해결: `url('...')` (single quote), URL 내부 `'`는 `%27`로 percent-encode
- `replace(/"/g,'%22').replace(/'/g,'%27')` 안전 패턴

### 백로그 (향후 검토)
- **이미지 최적화**: placeholder 자동 리사이즈(예: max 1920px) + WebP 변환 + Firebase Storage `cacheControl` metadata 설정. 현재 원본 그대로 업로드 → 대용량 파일 전송 비용/속도 비효율
- **포토샵 스타일 드래그 가이드선**: 룰러 + 자유 배치 가이드. 사용 빈도 낮음(가끔 정렬용), 작업 분량 큼(200~300줄). Phase 4 배포 후 v2에서 사용자 피드백 기반 재검토

---

## 작업 2 — 템플릿 색상/그림자 토글 활성화 조건 변경 (PC/모바일 공통)

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

## 작업 3 — PC UI 전체 리뉴얼

### 배경
재준 레퍼런스 확인: **MOIITEE 청첩장 디자인 툴 스타일**. 현재 mockup-tool PC UI(좌측 설정 패널 + 우측 액자 미리보기)를 전문적인 디자인 툴 스타일로 전면 재설계.

### 목표 구조
- **최좌측 (네비게이션 아이콘바)**: 카테고리 진입 — 좁고 아이콘만 (예: 스타일링/디자인/오프닝/카테고리 등 — mockup-tool 실제 카테고리에 맞게 매핑)
- **두 번째 컬럼 (시안 그리드)**: 선택한 카테고리의 시안 썸네일 그리드
- **메인 영역 (캔버스)**: 선택한 시안을 큰 화면 미리보기. 액자/폰 프레임으로 감싸기
- **상단 헤더**: 로고, 프로젝트 이름, 저장 상태, 공유/저장/MyPage
- **하단/측면**: 테마 컬러, 사진/문구 편집 기능 (정확한 배치는 작업 시 결정)

### 현재 mockup-tool과의 매핑 이슈
- 레퍼런스는 청첩장 디자인 툴, mockup-tool은 액자/케이스 시안 툴
- 사진 업로드/문구 입력/색상/그림자 설정 등 편집 기능을 어디 배치할지가 핵심
- 카테고리 구조 매핑 필요

### 원칙
- 모바일은 이 작업 시점에 건드리지 않음 (모바일 작업은 작업 5에서 진행)
- 보호 영역(zeRender/renderFrame/fbExport/sendKakao/openZoneEditor) 무수정
- 작업 전 사전 평가:
  1. 현재 레이아웃 → 새 레이아웃 변환 영향 범위
  2. 편집 기능(사진 업로드/문구 입력/색상/그림자) 배치 제안
  3. 보호 영역과의 충돌 가능성
  4. 작업 분량 추산 (대/중/소)
- 사전 평가 후 재준 승인 받고 단계별 진행

---

## 작업 4 — Phase 3: Firestore 통합 (어드민 ↔ mockup-tool 동기화)

### 배치 이유
- 모바일 본격 작업 (작업 5 바텀시트) **이전**에 진행
- 데이터 동기화 인프라 위에서 모바일 반복 테스트 효율 ↑
- 어드민에서 시안 추가/수정 → 모바일 mockup-tool에서 즉시 반영되는 흐름 확보

### 사전 평가 시점에 검토할 것
- 현재 IndexedDB(`denn_admin_state`) + localStorage(`denn_admin`) 구조와 Firestore 매핑 설계
- 시안 이미지/placeholder 이미지(작업 1 결과물)는 Storage 그대로 유지, 메타데이터만 Firestore로
- 보호 영역 저장키(`denn_admin`, `denn_shared_db`, `denn_order_requests`)와의 관계 정리

---

## 작업 5 — 모바일 최적화 1단계: 바텀시트 레이아웃

### 전제
- Phase 3 Firestore 통합 완료 후 진입 (모바일 반복 테스트 효율)
- 작업 3 PC UI 리뉴얼 완료 후 진입 (모바일 디자인 톤 일관성)

### 목표 디자인
- 상단: 액자 미리보기 영역 (항상 표시, 화면 대부분 차지)
- 하단 고정 탭바: 카테고리 아이콘 (mockup-tool 실제 카테고리에 맞게)
- 탭 아이콘 탭 시 → 해당 설정 패널이 하단에서 위로 올라오는 바텀시트
- 다시 탭 또는 X 닫기 → 패널 내려가고 미리보기 풀화면

### 옵션 — 진입 시 재준이 선택
- **A.** 현재 PC 레이아웃을 세로로 정리 (단순 재배치)
- **B.** 바텀시트 방식 (위 목표 디자인) ← 새 옵션
- **C.** 다른 형태

### 원칙
- 모바일 전용 (`@media`로 분리, PC는 작업 3에서 만든 새 레이아웃 유지)
- 보호 영역 무수정

---

## 작업 6 — 모바일 최적화 2단계: 바텀시트 적용 후 나머지 UX 수정 재평가

### 방식
- 작업 5 적용 후 실사용해보고
- 아래 미해결 항목들을 하나씩 재검토해서 정말 필요한지 판단
- 각 항목 진행 전 재준 승인 받고 개별 작업

### 재평가 대상 항목 (보류 중)
1. **모바일 액자 사이즈 설정 UX (드롭다운 변경)**
   - 현재 칩(`.chips.c2 #frame-sz-chips`) → 드롭다운(`<select>`)
   - 바텀시트 구조에서 자연스럽게 해결됐을 수도

2. **프레임 보이기 영역 UI 정리** (PC/모바일 공통)
   - 안내 문구("OFF 시 프레임 레이어만 숨기고...") 삭제
   - 토글 위치를 "시계 표시" 토글 바로 위로 이동

3. **모바일 "색상 선택 → 맞춤 설정" UI 정리**
   - "색조/채도/값" 라벨 중앙 정렬 (모바일 환경)
   - 영문 변경: 색조 → Hue, 채도 → Saturation, 값 → Value (또는 H/S/V)

### 원칙
- 바텀시트 적용 후 실제 사용 흐름 보고 필요성 재검토
- 일부 항목은 새 레이아웃에서 자연스럽게 해결됐을 수 있음
- 보호 영역 무수정

---

## 1차 배포 전 전체 로드맵 (재확인)

- ✅ Phase 1: 템플릿 색상/그림자 — 완료 (Phase C로 진입)
- ⏳ Phase 2: PC/모바일 공통 정비 (작업 1·2) — 다음 세션
- ⏳ Phase 2.5: PC UI 전체 리뉴얼 (작업 3) — 배포 전 적용
- ⏳ Phase 3: Firestore 통합 (작업 4)
- ⏳ Phase 4: 모바일 최적화 (작업 5 바텀시트 → 작업 6 보류 항목 재평가)
- ⏳ Phase 5: 1차 배포 + 안정화 (작업 7)
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
