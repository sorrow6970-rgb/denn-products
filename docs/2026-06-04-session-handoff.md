# 2026-06-04 세션 핸드오프

> 큰 줄기: 토글 버그 → 카드 썸네일 합성 → 카테고리/사이즈 필터 위계 → 액자 가로세로(orientationFree) → admin 컨트롤 패널 아코디언(미완).
> **미완 1건**: admin 액자 빌더 "컨트롤 패널 아코디언" — 카드는 생겼으나 섹션 이동이 안 돼 비어 보임. 내일 이어서.

## 0. 복원
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -12   # 5d6e430 가 마지막 push, 그 위 accordion 커밋이 오늘 마지막
```

## 1. 오늘 push 완료 (origin/main)
| 커밋 | 내용 |
|---|---|
| ef18f52 | 그림자 토글 시각 ② 동기화 + per-section '기본값' 버튼 `num is not defined` 수정(v39/v40 IIFE에 로컬 num) |
| 673442b·61d559d | uploaded 템플릿 **카드 썸네일을 본 캔버스와 동일 합성**(흰배경→사진 zone클립→아트). 헬퍼는 renderFrame IIFE라 `window.dennZoneCompositeHelpersV`로 노출. per-card placeholderImageUrl, 선택카드만 frameImg. stale 재빌드(placeholder onload→buildFrameTplGrid) |
| 168b1bf | **카테고리/사이즈 필터 위계 역전** — 사이즈=절대 상위(자동전환 제거), 카테고리를 사이즈+시계그룹 기준 비활성. denn-v95 게이팅 수정 |
| 481f937 | **최초 진입 = 사이즈 미선택**(denn-v97 게이트): 드롭다운 '사이즈를 선택하세요', 캔버스/그리드/카테고리/문구패널 잠금. selFSz로 선택 시 해제. curFSz 안 건드림(래퍼 게이팅) |
| 3828db2 | **액자 가로세로 = orientationFree plain 액자에서만**(B2). admin '가로세로 호환' 토글 + 저장(makeTemplate+fbExport래퍼)/편집복원. mockup v64 방향 UI를 플래그에서만 노출+세로강제. + **문구 연동**(우측 dps-elem-list를 isFrameTextKeyAllowed로 게이팅) |
| 5d6e430 | 내공간 사이즈가이드(sg-ori)도 동일 게이팅 + sgDraw 사이즈 라벨을 사각형 밖 **우상단·컴팩트**로 이동 |

## 2. 미완 — admin 컨트롤 패널 아코디언 (커밋은 됨, 동작 미흡)
**파일**: denn-admin.html, 스크립트 `denn-v98-builder-accordion`(</body> 직전).
**의도**: 액자 빌더 우측(builder-side) 흩어진 컨트롤을 접는 그룹 카드 3개로 정리 — 🗂영역·정렬 / 🎨테두리·색상·배경 / 📝템플릿·저장.
**현재 문제(스샷 2026-06-04 16:22)**:
- 그룹 카드 3개는 생성됐으나 **접힌 채 비어 보임** — 섹션 `appendChild` 이동이 대부분 실패.
- 실제 섹션(흰색테두리 설정 v50패널·고객 색상/그림자 phase1·흰색테두리 사용)은 **카드 밖에 그대로** 펼쳐짐.
- **디자인 템플릿 업로드 / 시계 안내**는 builder-side가 아닌 **별도(우측) 컬럼**이라 그룹에서 누락.
- 사용자 피드백: "너무 한곳에 모여있다", "3번째 패널(우측 컬럼) 비어 보인다 → 업로드 이미지 크기를 키워 채우는 것도".

**원인 추정(내일 확인)**:
- 섹션들이 `.builder-side`가 아니라 **다른 컨테이너/컬럼**(builder-main 또는 v50/phase1이 만든 별도 영역)에 있어서 셀렉터가 못 잡거나, regroup 타이밍이 주입보다 일러 이동 실패.
- v50/v51이 흰테두리를 **재배치**(denn-v50-builder-white-panel)하는데, 그 패널의 실제 위치/부모가 builder-side가 아닐 수 있음.

**내일 할 일**:
1. admin 빌더에서 콘솔로 실제 DOM 확인:
   `['denn-v50-builder-white-panel','denn-v364-builder-bg-panel','fb-allow-color-wrap','fb-zone-list','fb-cat-sel','fb-tpl-name'].map(function(id){var e=document.getElementById(id);return id+' → '+(e?(e.closest('.builder-side,.builder-main')||{}).className+' / parent='+e.parentElement.id:'없음')})` — 각 섹션이 어느 컬럼/부모에 있는지.
2. regroup이 **builder-side 한정**인데 섹션이 builder-main/우측컬럼에 있으면 → 그룹 카드를 **올바른 컨테이너**에 만들고, 셀렉터를 컬럼 무관 전역 id로(이미 id 기반) 잡되 카드 위치를 사용자가 본 레이아웃에 맞게.
3. 우측 컬럼(디자인 업로드·시계 안내) 비어 보임 → 업로드 박스 확대 또는 그 컬럼도 그룹에 합치기.
4. "한곳에 모임" → 그룹 카드를 좌/우 컬럼에 분배하거나 기본 접힘 상태로.

**안전장치**: 아코디언은 **가산적·가역적**(요소를 move만, 삭제 없음). 망가지면 `denn-v98-builder-accordion` 스크립트만 제거하면 원복.

## 3. 이번 세션 핵심 메모/함정 (메모리에도 기록)
- **mockup IIFE 스코프 함정** [[feedback_mockup_iife_scoping]]: denn-mockup-tool은 분리된 `<script>` 다수. top-level 함수 ≠ 전역. 크로스블록 호출은 window 노출 필요(num·썸네일 헬퍼 2번 당함).
- **렌더 헬퍼 노출**: `window.dennZoneCompositeHelpersV`(drawPhotos/drawOverlay/loadImg/bg/realSrc) — renderFrame IIFE 내부 헬퍼.
- **필터 위계** [[project_frame_size_category_filter]]: 사이즈=상위 고정, 카테고리=종속 비활성, 최초 미선택 게이트(v97).
- **defaultTexts 출처**: tpl.defaultTexts ← ADM.frameTemplates(admin). 적용 applyFrameDefaultTexts(L1056/L1068).
- **orientationFree**: admin '가로세로 호환' 토글 → 템플릿 플래그. mockup v64(액자 방향) + sg-ori(사이즈가이드)가 이 플래그로 게이팅.

## 4. 보호/불변
- renderFrame/zeRender/renderCase/V363/Phase C **본체 무수정** — 전부 래퍼/헬퍼 노출/게이트로만 처리.
- 가로 통째 회전 구현은 **폐기**(쓸 일 없음). 대신 orientationFree로 방향 전환 자체를 plain 액자로 제한.

## 5. 참조
- 직전 핸드오프: docs/2026-06-02-session-handoff-mirror-model.md
- 메모리: MEMORY.md (오늘 추가: feedback_mockup_iife_scoping, project_card_thumbnail_composite, project_frame_size_category_filter)
