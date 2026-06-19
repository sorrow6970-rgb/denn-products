# 2026-06-19 세션 핸드오프 — WYSIWYG 배경 크롭 재설계(focus 모델, 이중경로)

> 상태: 작업 완료, **커밋/푸시 전**(사용자 시각검증 대기). 시작 HEAD `168b932`.
> 직전: `docs/2026-06-18-session-handoff.md` §3 "★미해결 — WYSIWYG 재설계(승인됨)".

## 1. 목표
배경 크롭이 캔버스 비율에 종속(`drawCover`의 cover-fit + 오버플로 비율 팬) → 같은 운영자 프리셋이 관리자(~0.799)/소비자(1.5)/실폰(0.46)에서 다르게 보이던 문제.
→ 저장모델을 **이미지 기준 좌표**(`bgZoom` + `bgFocusX/Y`, 0~1)로 전환. focus점을 캔버스 중앙에 두고 cover 유지되게 clamp → 비율 무관 동일 구도.

## 2. 마이그레이션 정책(사용자 결정): **이중경로(무위험)**
- 기존 프리셋(신규 필드 없음)은 **레거시 `drawCover` 경로 그대로** → 회귀 0.
- `bgZoom` 있는 프리셋만 새 `drawCoverFocus` 경로.
- 운영자가 배경 슬라이더를 **직접 조작(event.isTrusted)** 하는 순간부터 focus 모델로 전환 → 저장 시 신규 필드 기록. 점진적 정착.
- **자동 일괄 변환 안 함**(미채택).

## 3. 구현(전부 `denn-mockup-tool.html`)
모델 판정을 **`RM.__bgUseFocusV` 플래그로 중앙화**. 배경 슬라이더(`rm-bg-scale/ox/oy`)를 거치는 모든 apply/snapshot 경로가 이 플래그를 세팅·인코딩.

- **신규 함수(메인 블록 L3452~, drawCover 옆):**
  - `drawCoverFocus(ctx,img,x,y,w,h,zoom,fx,fy)` — focus 중앙배치 + cover clamp.
  - `dennBgIsFocusModel(s)` — `s.bgZoom` 유무로 모델 판정. `window` 노출.
  - `dennApplyBgSlidersV(s)` — settings→슬라이더 역매핑 + `RM.__bgUseFocusV` 세팅(공용). focus: zoom→%, focusX/Y→(-50..50). `window` 노출.
  - `dennSnapshotBgV(o)` — 슬라이더→현재 모델 필드 기록(focus면 bgZoom/bgFocusX/Y, 레거시 제거). `window` 노출.
  - `dennBgOnInputV()` — isTrusted 조작 시 `RM.__bgUseFocusV=true`. `window` 노출.
- **렌더 분기(`rmRender` L3958):** `RM.__bgUseFocusV`면 `drawCoverFocus`, 아니면 기존 `drawCover` 3분기(direct-upload/portrait/기타) **그대로**. portrait 줌범프(×1.04)·direct-upload(max1) 보존.
- **apply 경로 3곳:** `applySettingsV33`(→`dennApplyBgSlidersV(s)`), V48 apply(`currentRoomSettingsV48` 짝, L5371), 내보내기 `applyBgSettings`(L14679, setSV/Math 인라인).
- **snapshot 경로 2곳:** `currentSettingsV33`(`return dennSnapshotBgV({...})`), `currentRoomSettingsV48`(L5464 `return st` 직전).
- **슬라이더 oninput 3개(L523/530/537):** `if(event&&event.isTrusted&&window.dennBgOnInputV)dennBgOnInputV();` 추가. **프로그램적 setSV(dispatch input)는 isTrusted=false라 오플립 안 됨**(핵심 가드).
- **`DENN_MOBILE_FIELDS_V`(L3197):** `bgZoom/bgFocusX/bgFocusY` 추가(레거시 3필드도 호환 유지). `.mobile` 라우팅/병합 그대로 동작.

## 4. 슬라이더 의미 재매핑
- `rm-bg-scale`(50~200) → `bgZoom`(÷100, 렌더서 1~2 clamp).
- `rm-bg-ox`/`rm-bg-oy`(-50~50) → `bgFocusX/Y = 0.5 + v/100`(0~1). 라벨/표시 유지.

## 5. ★미검증 — 다음 세션(사용자 시각검증 필수)
JS 런타임 부재로 자동 구문검사 못 함(수동 정독만). 콘솔 검증기 1개로 데이터 확인 + 스크린샷.
```js
(function(){var by=function(i){return document.getElementById(i)},n=function(v,d){v=parseFloat(v);return isFinite(v)?v:d},c=window.RM&&RM.canvas,k=window.dennCurScopedKeyV&&dennCurScopedKeyV(),st=(window.ADM&&ADM.roomBackgroundSettings||{})[k]||{};console.log(JSON.stringify({focusModel:!!(window.RM&&RM.__bgUseFocusV),key:k,canvas:c?c.width+'x'+c.height:'none',ratio:c?+(c.width/c.height).toFixed(3):0,uiZoom:+(n((by('rm-bg-scale')||{}).value,100)/100).toFixed(3),uiFocusX:+(.5+n((by('rm-bg-ox')||{}).value,0)/100).toFixed(3),uiFocusY:+(.5+n((by('rm-bg-oy')||{}).value,0)/100).toFixed(3),stored:{bgZoom:st.bgZoom,bgFocusX:st.bgFocusX,bgFocusY:st.bgFocusY,bgScale:st.bgScale},mobile:st.mobile?{bgZoom:st.mobile.bgZoom,bgFocusX:st.mobile.bgFocusX,bgFocusY:st.mobile.bgFocusY}:null}));})();
```
검증 시나리오:
1. **레거시 무회귀:** 기존 운영자 프리셋(신규 필드 없음)을 소비자/관리자/실폰에서 → 변경 전과 동일(`focusModel:false`, 레거시 경로).
2. **WYSIWYG:** 관리자에서 한 배경 슬라이더 조작(→`focusModel:true`)·저장 → `stored.bgZoom/bgFocusX/Y` 기록 확인 → 소비자 넓은창·실폰·관리자 프리뷰(0.462)에서 **focus점 주변 구도 동일**한지 육안.
3. **세로(.mobile):** 가로(base)↔세로(.mobile) 각 방향 신규 필드 적용·재병합. 회전 시 `loadSettingsV33` 재실행(2c75a36)과 충돌 없는지.
4. **점진 전환:** 레거시 프리셋 슬라이더 1회 조작 시 focusModel 플립 → 저장 후 새 경로(첫 터치 시 focus=중앙 기준 약간 점프=의도).

## 6. 보호/불변(준수)
- 기존 `drawCover` **무수정**(레거시 경로 보존=이중경로 핵심). `renderFrame/zeRender/fbExport/sendKakao/openZoneEditor` 무수정.
- V107 관리자 📱프리뷰는 이미 `RATIO=0.462` → 추가 작업 불필요(focus 모델이 비율 종속 제거하므로 프리뷰 비율 일치는 보기 편의로 강등).
- 토글 유지, 모바일 격리저장/`?viewAs=mobile`·`scopedKeyV2` 경계 불변.

## 6b. 추가 작업 — 모바일 가로/세로 UX (시각검증 통과, PC 크롬 DevTools)
같은 세션에서 사용자 실시간 검증으로 다음을 수정(콘솔 probe + 스샷 반복).
- **① 가이드배경 선택 즉시 4:5 로드(검증✓)**: 선택 경로(L6048 `rmSelectGuide`)·`applyGuide`(L6003)가 `bgSrc(bg)`(=PC dataUrl만 반환)로 이미지를 로드 → 세로에서도 PC가 뜨고 회전해야 4:5로 바뀌던 근본. → `dennGuideBgSrcV(bg)`(세로=mobileDataUrl)로 변경. v108에 `rmSelectGuide` 정착 재적용 래퍼(`swapBgForOrientation`+loadSettingsV33)도 추가. imgRatio 1.5→0.8 확인.
- **② 가로 전체화면 배경 꽉 채움(검증✓)**: ⚠️**함정 — `window.rmSizeCanvas`가 3중 재정의**(L3619 죽음 / **L5270=V47 활성 base** / L6980=v72 래퍼). 처음 L3619(죽은 함수)에 고쳐 안 먹었음. → **최외곽 V107 래퍼(L13729)** 에서 rotate-fs면 캔버스를 **이미지 비율로 두고 뷰포트 cover**(932×621 등)로 강제 — PC 비율 유지+레터박스 없음. 모달 카드까지 풀블리드 CSS(`#room-modal`/`>div`/area inset:0, 흰 카드·둥근모서리·여백 제거).
- **③ 가로 액자=PC**: `forceMobileCenterStart`/`syncGuide*`의 중앙정렬을 **세로(isRoomPortrait)에서만** 실행. + ②의 이미지비율 cover로 액자 체감크기도 PC와 일치.
- **④ X→세로**: 물리 회전은 브라우저 한계 → **`framePortraitPrompt`(프레임툴과 동일 "세로로 돌려주세요" 오버레이) 재사용**(roomMode 문구). `__dennAwaitPortraitV` 플래그, 세로 복귀 시 onChange가 해제. 안드로이드는 `orientation.lock`도 시도.
- **가로 세로 스크롤 + 커스텀 조절바**: cover로 캔버스가 세로로 길어(클립) → 영역 `overflow-y:auto`. 네이티브 스크롤바 숨기고 **커스텀 반투명 상시노출 조절바**(`#denn-rot-scrollbar`+thumb, 드래그/스와이프). 진입 시 1회 **(ch-vh)/2 중앙 시작**(결정적), 진입 페이드(`denn-room-entering` 440ms)로 점프 가림.
- **⚠️ isRoomLandscape 미노출 함정**: probe의 `window.isRoomLandscape`가 undefined라 `landscape:false` 오판 → `window.isRoomLandscape` 노출 추가로 해소.
- **어드민 배경설정 중앙 가이드선**: `dennDrawCenterGuideV`(rmRender L3937 base, 활성) — 어드민 셋업(PC·모바일 무관)에서 캔버스 정중앙 빨강 점선 십자(어두운 underlay). 배경 중앙 맞추기용. 소비자 미표시.

## 6c. 후속 미세조정 (커밋 2)
- **배경 슬라이더 미세조정**: `rm-bg-scale` step 0.5, `rm-bg-ox/oy` step 0.1 (픽셀 단위 미세조정). focus apply(`dennApplyBgSlidersV`)도 0.5/0.1 정밀 보존(정수 반올림 제거).
- **가로 중앙 시작 + 점프**: V107 센터링을 `scrollHeight` 기반(읽기=리플로우 강제)으로 신뢰성 ↑. 진입 페이드(`denn-room-entering`)를 **세로→가로 전환 시점(onChange 상단)** 으로 이동 → loadSettingsV33+이미지스왑+cover+센터 정착(640ms)까지 가려 점프 숨김. `__dennRotCentered`도 상단에서 리셋.

## 7. 별건(이번 범위 밖)
- 회전 "요동"(전환 순간 깜빡임) — 캔버스 크기 변화 시퀀스 로깅 선행 필요. 미착수.
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[feedback_verification_workflow]] [[feedback_mockup_iife_scoping]]
