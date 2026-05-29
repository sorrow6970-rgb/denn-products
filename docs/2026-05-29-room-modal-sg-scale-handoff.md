# 2026-05-29 핸드오프 — 룸 모달 사이즈 가이드 스케일 + 다중 이슈

> 파일: `denn-mockup-tool.html`, `denn-admin.html`. 현재 main HEAD: `9675c6b`.
> **세션 종료 사유**: 사용자 PC 이동(집), 같은 컨텍스트로 이어서 작업 예정.

---

## 1. 오늘 push 완료된 commit (시간순, 모두 main 반영)

| 커밋 | 내용 | 비고 |
|---|---|---|
| `5fb4466` | 이미지 업로드 박스·미리보기 확대 (`.drop-zone` 패딩, max-height 100→420, 세로 이미지 자연 비율 연동) | OK |
| `c7c13e9` | 액자 가로 transpose — v64 wrap에 ADM.uiCustom.prevMaxW 임시 조정 + sz.frameThickness × aspect + L9095 applyPreviewScale fit aw/ah swap | OK, 사용자 확인 |
| `8b892fd` | 회전 애니메이션 — 좌90도↔세로 untwist 방향(prev rot 기반 동적 deg) + setTimeout 콜백 동기 render → snap 깜빡임 fix | OK |
| `a76fadd` | 시계 그룹(시계액자/일반액자) Top tab + 카드 좌측 하단 뱃지, 어드민 6곳/고객 mockup-tool 동시 적용 | OK |
| `59d3bf1` | 사용자 업로드 배경 — 메모리(`RM.userBgs`) only, X 버튼, A 옵션 | OK |
| `b9dd850` | X 클릭 시 캔버스 초기 배경 복귀 — `dataUrl===RM.roomImg.src` 비교 fallback 추가 | OK |
| `11c10b8` | 룸 모달 기준 스케일(sg-scale) 슬라이더가 액자도 같이 — v75 onWheel redraw(`applyFrameAnchorV48+rmRender+markRoomDirty`)와 동일 로직 input/change에 부착 | **부분적**, applyFrameAnchorV48이 위치만 조정하고 크기 안 바꿈을 못 알아챘음 |
| `3fc7f0a` | "기본설정으로" 마스터 버튼이 사이즈 가이드를 `sgReset`로 위임 — `.rm-action-reset` cloneNode로 기존 addEventListener 제거 후 새 onclick. 5개 reset 중 사이즈 가이드만 `window.sgReset` 호출 (= "사이즈가이드 기본값" 버튼과 동일) | OK |
| `2871fe9` | 어드민 공통값 → default-room 자동 동기화 + 캡처값 무효화 (한 줄 wrap) | OK 그러나 부족 |
| `9675c6b` | (1) `denn-admin-guide-scale-sync` wrap 강화: localStorage + IndexedDB + window.ADM 3곳 동기화 + `default-room`/`__denn_room_common_default__` 두 키 모두 + `guideScale`/`sg-scale-r/n`/`__guideResetDefaults.guideScale` 모든 필드 + storage 이벤트 리스너 + setTimeout [200,800,2000,4000]ms 여러 시점 + `applyToUI`로 슬라이더 즉시 어드민값으로 강제 (2) `uiGuideScale` 단순화 — default-room fallback 제거, `A.uiSettings.roomInitialGuideScale`만 사용 (3) `denn-admin.html` 6곳 `denn-mockup-tool-v35-bugfix-stable.html` → `denn-mockup-tool.html` 일괄 교체 | **이 commit이 새 회귀 문제 유발** ★ |

---

## 2. 🔴 9675c6b가 일으킨 새 회귀 문제 (다음 세션 우선 처리)

### 증상
- 사용자가 룸 모달에서 sg-scale 슬라이더를 80→120%로 조정
- **조정 직후 자동으로 어드민 공통값(82.5%)으로 회귀**
- 액자만 커지고 가이드는 82.5%로 강제 복원 → 분리처럼 보임

### 원인
9675c6b의 `denn-admin-guide-scale-sync` IIFE 안 `sync()`가:
```
window.addEventListener('load',function(){
  [200,800,2000,4000].forEach(function(ms){setTimeout(sync,ms)});
});
```
4번의 setTimeout이 페이지 로드 후 4초 동안 발동. 그 사이에 사용자가 슬라이더 조정 → sync() 안 `applyToUI(adminGS)`가 isDefault일 때 sg-scale을 어드민값으로 강제 → 회귀.

또한 MutationObserver가 `room-modal` display 변경 시도 sync 호출 → 모달 열 때 어드민값으로 reset.

### 해결 방향 옵션
- **A**: setTimeout 호출을 페이지 로드 시 1회만으로 줄이고, `applyToUI`도 페이지 로드 시 + modal display 변경 시만 (사용자 슬라이더 조정 후엔 호출 안 함)
- **B**: 9675c6b 자체를 `git revert`로 되돌리고 어드민 동기화는 더 보수적으로 재구현
- **C**: `applyToUI`에 "사용자가 최근 N초 안에 슬라이더 조작했으면 skip" 같은 게이팅

추천: **A** (가장 작은 변경)

---

## 3. 🟡 미해결 이슈 (다음 세션 후순위)

### (a) 룸 모달 처음 열 때 캔버스 사이즈 두 번 변화 (큰→작은)
- 사용자 진단 결과: 1345×757 → 약 400ms 후 689×388로 정착
- 원인 미확정 — modal `display:flex` 직후 area `clientWidth` 측정 시점과 정착 시점 차이
- 시도: openRoomMockup wrap 제거 → 큰 사이즈 지속 600→400ms 단축, 근본 해결 안 됨
- 5fb4466 의심(`#rm-drop` 패딩, `#rm-room-thumb` max-height 변경이 좌측 패널 layout 변동)했으나 미확인

### (b) 액자/사이즈가이드 진짜 fit 정렬
- 11c10b8이 슬라이더에 `applyFrameAnchorV48 + rmRender` 호출 추가했으나, **`applyFrameAnchorV48`은 RM.pos(위치)만 조정하고 크기는 안 건드림** (L5272 본체 분석으로 확인)
- 결과: 슬라이더 조정 시 액자 위치만 살짝 따라가고 크기는 그대로 → 사용자가 본 "분리"
- 미세조정 wrap(frame box → sg 박스 강제 정렬) 시도했다가 동기화 깨져서 revert (그 직전 b9dd850로 git checkout HEAD로 완전 복귀)
- 해결: sg-scale 변경 시 `rm-size`도 비례(`sgVal * 0.2`)로 조정해야 액자 크기도 같이 변함

### (c) 어드민 "관리자 저장" 버튼이 `A.uiSettings.roomInitialGuideScale` 업데이트 안 함
- `?adminRoomSetup=...&adminRoomDefault=1` URL로 진입한 관리자 모드의 저장 버튼
- 코드 추적: `saveAdminRoomPreset` → `markSavedAdminPreset`이 `A.roomBackgroundSettings[currentBgKey()]`에만 저장 (특정 키, 예: `__denn_room_common_default__`)
- **`A.uiSettings.roomInitialGuideScale`은 절대 업데이트 안 함**
- 따라서 일반 mockup-tool로 돌아가서 새로고침해도 이전 어드민 공통값 그대로 (사용자 본 "저장 안 됨")
- 시도: `#denn-admin-room-save` 버튼 wrap으로 추가 저장 — 미커밋 상태에서 git checkout으로 revert됨
- 해결: 관리자 저장 시점에 슬라이더 값을 `uiSettings.roomInitialGuideScale`에도 commit하는 wrap (revert된 코드 다시 적용 + 검증)

### (d) 어드민 페이지 로컬 서버 접속 안 됨
- 사용자 호소 — 어드민에서 페이지 연동 안 됨
- 추측: 사용자 로컬 환경 캐시/포트 이슈 가능성. github.io에서도 같은지 미확인
- 9675c6b가 6곳 URL을 올바른 `denn-mockup-tool.html`로 수정해서 이 부분은 해결됐을 가능성

### (e) `default-room`/`__denn_room_common_default__`/`__dennRoomGuideInitialDefaults` 찌꺼기
- 9675c6b sync()가 자동 정리하도록 만들었으나 사용자 슬라이더 조정 즉시 회귀하는 부작용 (위 2번 항목과 연결)
- 사용자에게 1회용 콘솔 청소 명령 제공해 정리는 됨

---

## 4. 데이터 키와 우선순위 (필독)

`localStorage.denn_admin` (또는 `IndexedDB denn_shared_db.kv.denn_admin_state`) 구조:

```
A.uiSettings.roomInitialGuideScale       ← 어드민 공통 기본값 (사용자 어드민 UI에서 설정한 값)
A.roomBackgroundSettings['default-room'] ← 일반 사용자 default-room 저장
  .guideScale                              가이드 스케일 (사용자 슬라이더 조정 시 저장됨)
  .sg-scale-r / .sg-scale-n                슬라이더 input.value 직접 저장 필드
  .__guideResetDefaults.guideScale         "기본설정으로" 누를 때 사용되는 캡처 default
A.roomBackgroundSettings['__denn_room_common_default__']  ← common 풀 (어드민이 채우는 의도)
window.__dennRoomGuideInitialDefaults[bgKey]  ← 메모리 캡처값 (배경 첫 진입 시 자동 저장, 사용자 조정값이 캡처되어 "기본"으로 굳는 버그의 원흉)
```

**사용자가 "공통값 74"라고 부른 것**: 실제로는 `default-room.guideScale = 0.74`였음. 진짜 어드민 공통값(`uiSettings.roomInitialGuideScale`)은 0.825였고 사용자가 어드민에서 80으로 바꾸려다 저장 안 됨.

**현재 (콘솔 청소 후) 상태**: 세 곳 모두 어드민 공통값(0.825)으로 통일됨. 9675c6b sync()가 유지.

---

## 5. revert / 시도했다가 폐기한 작업

| 시도 | 결과 |
|---|---|
| sgDraw 본체 forEach 안에 frame box 강제 정렬 inline check 추가 + denn-frame-guide-sync wrap (rmRender 끝에 frame box 저장 + sgDraw 재호출) | szId 매칭 실패 + 동기화 깨짐 → revert |
| 위치값 보정 (sg-ox/sg-oy를 RM.pos에 자동 동기화) | 위 wrap과 함께 revert |
| sg-scale 100% 강제 reset (페이지 로드 + modal MutationObserver) | 어드민 공통값 무시 → 사용자 항의로 어드민값으로 변경, 그러다 결국 9675c6b 종합 wrap에 통합 |
| `#cat-tabs` 숨김 + `.tpl-clock-badge` overlay (어드민) | a76fadd로 commit됨 (살아있음) |
| `denn-room-reset-fix`의 `uiGuideScale` 우선순위 (default-room 우선) | "74로 고정" 항의 → 9675c6b에서 단순화(어드민 공통값만) |

---

## 6. 다음 세션 시작 방법 (집 PC)

```bash
cd C:\repo\denn-products
git pull origin main          # 9675c6b까지 받기
claude                         # Claude Code 실행
```

자연어 한 줄:
> "docs/2026-05-29-room-modal-sg-scale-handoff.md 읽고 2번 (9675c6b sync setTimeout 회귀)부터 해결하자"

---

## 7. 작업 환경 / 보호 영역

- 워크플로우: 자연어 의뢰 → Claude Code가 직접 main push
- 보호 영역: `zeRender`, `renderFrame` 본체, `denn_admin` 저장키, IndexedDB `denn_admin_state` 스키마 (wrap 단계로 해결)
- 검증: 브라우저 강력 새로고침(Ctrl+Shift+R) + 콘솔 verifier
- 콘솔 진단 5원칙: 한 줄 + ```js 블록 + 주석 제거 + 입력 절차 안내

## 8. 사용자 컨디션 메모

- 오늘 세션 종반 사용자 매우 스트레스 받음
- 부작용 누적 + 콘솔 명령 실수로 한 번 데이터 손실 발생 (어드민 가이드 배경 비워짐 → 사용자 재등록)
- 다음 세션 시작 시: 차분히 분석부터, 추측 fix 자제, 한 가지씩 검증 후 진행할 것
- 사용자 의도가 모호하면 옵션 제시하고 결정 받기 (A/B/C 형식)
