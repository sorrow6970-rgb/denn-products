# 2026-06-18 세션 핸드오프 — 모바일 토글/회전/세로배경 안정화 + 가이드배경 미러 버그 수정

> 상태: HEAD `2c75a36` (origin/main push 완료).
> 시작점: 06-17 핸드오프의 "미검증 3종"(세로배경/회전풀스크린/PC|모바일토글) 검증.

## 1. 커밋 순서 (이번 세션)
- `776e7ee` 룸모달 모바일↔PC 비가역 복원(v104 teardown) + PC|모바일 토글 **제거** + L4157 가드 + 관리자 바 nowrap CSS.
- `747eb65` PC|모바일 토글 **재추가** (v104 teardown으로 PC 복원 안정화돼 재도입).
- `f382b14` **가이드배경 미러 버그 수정**(핵심) + 4:5 자동로드(roomSrc/스왑가드/프리캐시) + redrawRoomSoon 단일패스.
- `f45c8e4` 핸드오프 문서.
- `2c75a36` **회전 시 방향별 설정 재병합**(가로=base(PC)/세로=.mobile 전환 정확도) — v108 onChange 방향전환 감지 → loadSettingsV33 재실행.

## 2. 이번 세션에서 잡은 것 (검증 완료)
### A. v104 룸시트 비가역 → PC 복귀 teardown (✓)
- `denn-v104-room-sheet` build()가 모바일폭(≤860)에서 가이드/탭바/액션을 **DOM 이동 + pane display:none**으로 재구성하나 **PC 복귀 경로 없어** 좌우 메뉴가 영구히 빔(F12 기기툴바 왕복/창 리사이즈). → `teardown()` 추가: 옮긴 노드 원위치 복원 + pane 복원 + resize 분기(>860 teardown/≤860 build) + 모바일 탭핸들러 PC 가드. (776e7ee)

### B. ★가이드배경 미러 버그 (핵심, f382b14) — "관리자 저장값이 목업툴에 반영 안 됨"의 진짜 원인
- `loadSettingsV33` 미러에서 `if(RM.roomImg)__srcKey='__denn_room_common_default__'`가 **`user:<bgId>` 판정보다 먼저** 실행됨. 가이드 이미지도 RM.roomImg에 로드되므로 가이드배경이 "촬영사진"으로 오판 → **공통 ②에서 미러**(그 배경의 운영자 프리셋·`.mobile` 4:5값 무시).
- 수정: **가이드 키 판정을 RM.roomImg 검사보다 앞으로**. → 소비자가 운영자 `gb<id>`의 base+`.mobile`을 정상 미러. 콘솔 데이터 검증 완료(`base{s:1,ox:-26,oy:0} mobile{s:1.02,ox:-1,oy:-50}` 일치).
- ⚠️ 관리자 저장 자체는 처음부터 정상이었음(운영자 키 `.mobile`에 제대로 저장됨). 버그는 **읽기 미러**.

### C. 4:5 세로배경 자동로드 (f382b14)
- `rmSelectGuide`가 `RM.roomSrc` 미세팅 → `swapBgForOrientation` 가드(`want===roomSrc`)가 stale 오판해 세로배경 자동적용 실패. → roomSrc 동기화 + 가드를 `RM.roomImg.src` 기준으로 교정. 방향별 이미지 프리캐시(`dennPreloadGuideBgV`) + 캐시 동기 스왑.

### D. 회전 시 방향별 설정 재병합 (정착값 ✓, 2c75a36)
- `dennMergeMobileV`(병합)는 `applySettingsV33`/`loadSettingsV33` 호출 시에만 평가 → **회전 시 재호출 안 돼** 세로 진입 후 가로로 돌리면 PC원본 이미지에 세로(.mobile) 배경설정이 남던 빈틈.
- 수정: v108 `onChange`에 방향전환 감지(`__dennRotOriV2`) → 바뀌면 `loadSettingsV33()` 재실행. **정착값 검증 완료**(가로 `100/-26/0` PC원본, 세로 `102/-1/-50` 4:5).
- ⚠️단, 전환 **순간**의 깜빡임(요동)은 여전 — 정착 전 다중 패스 churn(아래 §3 회전요동과 동일 뿌리).

## 3. ★미해결 — 다음 세션 (사용자 결정: 신중히)
### WYSIWYG: 배경 크롭이 캔버스 비율에 종속 → 컨텍스트별 다르게 보임
- `drawCover`(L3431 근처)의 `scale=max(w/iw,h/ih)×scale` + offset(overflow 비율)이 **캔버스 비율 종속**. 측정: 관리자 프리뷰 canvas 0.799, 넓은창 소비자 1.501, 실폰 ~0.46 — 비율 제각각이라 **같은 bg값이 다르게 크롭**. 데이터는 일치하는데 화면이 다른 이유.
- **재설계 플랜(승인됨)**:
  1. 저장모델 `bgScale/bgOffsetX/Y`(캔버스기준) → **`bgZoom`+`bgFocusX/Y`(이미지 0~1 좌표)**.
  2. `drawCover` 재작성: 캔버스 비율 무관하게 **focus점을 항상 중앙 배치**(cover 채움 유지).
  3. 하위호환: 신규필드 있으면 사용, 없으면 기존값 1회 변환(마이그레이션). 기존 운영자 프리셋 보존.
  4. 관리자 📱프리뷰 캔버스를 **실폰 비율(~0.46)** 로 고정(V107 폰박스 비율 교정 동반) → 튜닝/보기 일치.
- ⚠️ `drawCover`는 **전 배경(PC/모바일/전 가이드) 공용 + 저장값 의미 변경** → 회귀 위험 큼. 전수 검증·마이그레이션 필수. 즉흥 수정 금지.

### 회전 요동 (부분 미해결)
- 모바일 가로↔세로 회전 시 "배경 여러 번 로드되듯 요동" + "가로에서 한참 뒤 스케일 또 바뀜". 원인 추정: ①방향별 다른 이미지 비동기 로드(프리캐시로 완화 시도) + ②다중 사이징 패스(coverFit/redrawRoomSoon/onChange×2/V47/V106) 경쟁 + ③dvh/영역 settle.
- 시도: 프리캐시+캐시 동기 스왑, redrawRoomSoon/v108 redraw 디바운스(f382b14에 포함). **마스크(흰/그레이 오버레이)는 사용자가 "가리지 말고 근본"이라 반려 → 전부 revert함.**
- 미수집: **캔버스 크기 변화 시퀀스 로깅**(어느 시점·몇 번·어떤 크기로 리사이즈되는지) — 이걸 받아 정확히 짚어야. WYSIWYG 재설계와 함께 보면 됨(둘 다 캔버스 사이징 일관성 문제).

## 4. 보호/불변 (준수)
- 본체 무수정: renderFrame/zeRender/fbExport/sendKakao/openZoneEditor. **drawCover는 코어라 재설계 시 극도로 신중**.
- 토글은 **유지**(재추가됨). 모바일 격리저장/읽기·?viewAs=mobile 경로 유지.

## 5. 참조
- 직전: `docs/2026-06-17-session-handoff.md`
- 핵심 코드: 미러 `loadSettingsV33`(L3150~, 수정 L3165 근처), `dennRouteSaveV`(L3200), `scopedKeyV2`(L14160 운영자=<bgId>/소비자=user:<bgId>), `drawCover`(L3431), `dennPreloadGuideBgV`(L1783직후), swapBgForOrientation/v108(L13790~), redrawRoomSoon(L3409), v104 teardown(L13490~).
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[project_operator_default_propagation]] [[feedback_verification_workflow]]
