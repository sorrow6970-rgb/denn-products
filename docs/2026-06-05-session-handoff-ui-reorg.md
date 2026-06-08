# 2026-06-05 세션 핸드오프 — 목업툴 UI 재구성 (탭/섹션/정보바) + admin 빌더 마감

> 범위: `denn-mockup-tool.html` 프레임 편집 패널 UI 정리(PC 셸 기준) + `denn-admin.html` 데이터보호 패널 접힘.
> 상태: **이번 세션 작업 전부 완료·커밋·푸시.** 작업 트리 clean.
> 안전: 모두 가산적 UI 변경(라우팅/CSS/정적 라벨). 렌더 본체(renderFrame 등) 무수정.

## 0. 복원/확인
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -6   # HEAD = 25f7e9d
```

## 1. 이번 세션 완료 항목 (모두 HEAD=25f7e9d, 직전 4b22b18/3c41ee6/f91e8c5 포함)

### A. 프레임 편집 탭 재구성 (denn-mockup-tool.html, PC 셸 `denn-v94-pc-shell-frame`)
- **탭 순서 교환**: 문구(text) ↔ 색상(color) — `ICONS` 배열(L12033 부근)에서 문구를 색상 앞으로.
- **문구별 색상/그림자 → 색상 탭**: 정적 `#frame-text-style-box`를 "05 문구" 섹션에서 빼내 "03 프레임 색상" 다음 자체 `<div>` 래퍼로 이동. 그룹 라우팅(~L12137)에 `else if(q('#frame-text-style-box')){groups.color.appendChild(node);}` 추가.
- **프레임 보이기 → 설정(clock) 탭**: `#denn-frame-visible-row`(installFrameToggle가 색상 섹션 뒤로 늦게 주입)를 설정 탭으로 이동 고정.
  - `__placeFrameVis()`(~L12168): 래퍼 `#denn-frame-vis-section` 생성 → 그 안에 `<div class="sec-label">프레임 표시</div>` + 박스(row) 순서로 묶어 **"제목(박스 밖) + 박스"** 구조(시계 표시와 동일). `[60,300,900]ms` 타이머 + gbox MutationObserver로 주입 시점 무관 보장.
  - **떠도는 `<hr>` 제거 2곳**: ① 색상 그룹 — `frame-color-chips`.closest('div')의 nextElementSibling이 HR이면 제거(행 이동 후 orphan). ② 클록 그룹 — `groups.clock`의 자식 중 HR 전부 제거.
  - **구분선 없음**: 사용자 확정 = 줄 긋지 말고 **여백만으로 구분**. `#denn-frame-vis-section{margin-top:16px}`(border-top/padding 제거). 시계 표시도 위에 줄이 없어 일관.

### B. 섹션 타이틀 정리 (denn-mockup-tool.html 정적 HTML)
- 프레임 페이지 6개 `.sec-label`에서 번호 접두 제거: "01 액자 사이즈"→"액자 사이즈", "02 템플릿"→"템플릿", "03 프레임 색상"→"프레임 색상"(L342 부근), "04 이미지 업로드", "05 문구 입력", "06 시계 표시".
  - (사유: 탭 재정렬로 번호 순서가 어긋나 무의미.)
  - **케이스 제작 페이지(L228~306, 01~08)는 번호 유지** — 이번에 순서 변경 안 함. 필요 시 후속.
- `.sec-label` CSS(L62): `font-size:9px`→`12.5px`, `font-weight:700`, `letter-spacing:0`, `color:var(--ink)`(uppercase 제거) — 크게·볼드·진한색. **케이스 라벨도 공통 적용**되어 같이 커짐.

### C. 정보바 확대 (denn-mockup-tool.html)
- `.denn-pc-shell .dps-menu>.info-bar`에 `padding:12px 16px;gap:16px` + `span{font-size:13px}`, `strong{font-weight:700}`.

### D. (직전) admin 데이터보호 패널 기본 접힘 (f91e8c5)
- `installPanel()`(L5979): `p.className='collapsed'`.

### E. (직전) 내공간보기 캔버스 채움/cover (4b22b18, 3c41ee6) — 별도 워크스트림, 완료.

## 2. 검증 상태
- 사용자 스샷 확인 완료: 탭 순서, 정보바, 섹션 번호제거+볼드, 프레임 표시(박스 밖 제목·여백 구분) 전부 OK.
- 색상 탭 프레임 색상 아래 orphan hr 제거 확인.

## 3. 보호/불변
- 렌더 본체 무수정(renderFrame/zeRender/fbRender 등).
- installFrameToggle 4개 주입기 본체 무수정 — 셸의 `__placeFrameVis`에서 사후 정규화로만 처리.
- 모바일(flat, <861px)에서는 셸 미적용 → "프레임 표시" 제목/이동은 PC 셸 한정. 모바일은 기존 평면 패널 그대로(회귀 없음). 모바일에도 제목 필요 시 installFrameToggle 주입 HTML 또는 모바일 경로 보강 필요(이번 범위 외).

## 4. 앞으로 남은 작업 (우선순위순 — 메모리 인덱스 기준)

### 높음 — 기반/안정성
1. **Storage 단일 진실 — 단계 D2/단계3** ([[project_storage_single_source]]): `__opRev` 단조 리비전으로 운영자 ② durability 확보(단계 A 완료). 통과 후 D2 → 운영자 디폴트 전파 단계3.
2. **운영자 디폴트 전파 — 왕복유지 복원** ([[project_operator_default_propagation]]): 현재 미러 모델로 "절대 안 틀어짐" 확보했으나 **세션 조정 왕복유지는 의도적 포기** 상태. 살리려면 멀티스토어/위치 다중표현 기반 정리 선행 필요.

### 중간 — 컷오버/정리
3. **룸 스키마 컷오버 3·4단계 (격리/청결)** ([[project_cutover_room_schema]]): 공유 모듈 추출 필요해 보류. 1/2a/2b(오염 차단)는 완료.
4. **Dead code 청소 — 2026-06-08 완료/교정**: 실제 죽은 코드는 `isUntouched`(10줄) **하나뿐**이었고 제거함(90e5a82 이후 커밋). buildSeed·단계3 플래그(`__dennDefaultRoomFreshSeededV82`)는 이미 제거돼 있었음. ⚠️ **이전 리스트 오류 정정**: `V79`(공통디폴트 상속 아키텍처)·`rmSelectGuide`("orphan v33")는 **죽은 코드가 아니라 활성 핵심 경로** — 건드리지 말 것. 상세 [[project_dead_code_audit]].

### 중간 — Phase C (placeholder / 색상 / textless)
5. **Placeholder 잔존 surface** ([[project_placeholder_progress]], 10일 전 메모 — 현 코드 재확인 필요):
   - 어드민 메인 카드 📷 노란 뱃지 (renderFTplsByCategory 본체 직접 패치, Phase 1)
   - 어드민 모달 중앙 캔버스 `#ze-canvas` placeholder overlay (Phase 4)
   - 어드민 가이드 이미지 모달 재진입 표시 (refreshGuideForced)
   - mockup-tool `selFTplByRef` wrap chain (Phase 3)
   - ON/OFF 토글(Phase 5) → UI 정돈(Phase 6)
   - (단, 카드 썸네일은 61d559d로 합성 방식 재구현됨 — 메모 항목과 대조 필요)
6. **Phase C 작업2 textless 이중잠금 / 케이스 모델 V363 게이팅** ([[project_phase_c_task2_case_model]], [[project_phase_c_textless_dual_lock]]).

### 낮음 — UI 후속(이번 워크스트림 연장)
7. 케이스 제작 페이지 섹션 번호(01~08) 제거 여부 — 사용자 결정 대기.
8. 모바일(평면 패널)에서 "프레임 표시" 제목/배치 일관성(현재 PC 셸 한정).

### ★ 미정리 상위 로드맵 (2026-06-05 사용자 언급 — 다음 세션 첫 작업으로 사용자와 함께 backlog 정리할 것)
> 메모리/핸드오프가 개별 버그/기능 단위만 추적해 **제품 로드맵 차원이 통째로 누락**됨. 다음 세션에서 사용자에게 전체 나열받아 `project_roadmap_backlog` 메모리로 구조화 예정.
- **고객 패스워드 → 내공간 시안 확인 툴 (신규)**: 현재 패스워드 락은 denn-admin.html에만 존재(관리자용). 고객이 패스워드 입력 → 바로 내공간 툴로 본인 시안 확인하는 고객용 진입 플로우는 미구현.
- **모바일 버전 다듬기 (작업 5/6)**: PC 셸(작업3) 완료, 모바일 바텀시트 드로어(작업5)·모바일 스케일/스크롤 cap(작업6)은 의도적 보류 상태(docs/2026-05-27·05-28 핸드오프 참조).
- **(등등) 사용자가 기억하는 추가 항목** — 다음 세션에 수집.

## 5. 참조
- 직전 핸드오프: `docs/2026-06-04-session-handoff-builder-3col.md`(admin 빌더, 완료), `docs/2026-06-02-session-handoff-mirror-model.md`(운영자 디폴트 미러).
- 관련 코드: PC 셸 `denn-v94-pc-shell-frame`(~L12025), `__placeFrameVis`(~L12168), `.sec-label`(L62), 정보바(~L11998), `#denn-frame-vis-section`(~L2561).
