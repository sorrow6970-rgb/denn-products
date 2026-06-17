# 2026-06-17 세션 핸드오프 — 모바일/PC 가이드배경 설정 재설계 단계0~4 + 모바일 회전·세로배경 UX

> 상태: 모두 origin/main push 완료(ahead 0, clean). HEAD `d0add1e`.
> ★ **세로(4:5) 배경 업로드 + 회전 풀스크린 등 후반 기능은 사용자 "내일 검증" — 미검증.** 단계0·1은 검증 통과.

## 0. 복원
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -30
```

## 1. 오늘 한 일 (계획서 `shimmying-mixing-cat.md` 단계0~4 + 사용자 즉석 UX 다수)

### A. 단계0 검증 + 후속 버그픽스 (검증 통과)
- 단계0(앵커 복원 + admin-setup 단일배경 잠금) 콘솔/육안 검증: **잠금 OK**.
- 검증 중 발견 버그 3건 수정(`fef89dd`): ①앵커 비중앙 시 햇빛 토글/기본값 등 **재렌더가 액자 Y를 anchorYabs로 스냅백** → drawFrame 앵커 핀을 "표시 크기(sizePct) 바뀐 렌더에서만" 작동(크기 무변동 재렌더는 옮긴 Y 존중), `dennCaptureAnchorTargetV`에 `__anchorSize` 기록. ②햇빛 기본값 운영자 모드=공장 리셋(defaultSun). ③햇빛 슬라이더 렉→`rmRenderRAF` coalesce.

### B. 단계1 저장 격리 (검증 통과, `caac0bb`)
- `dennRouteSaveV(prev,merged)` 단일 라우팅: 모바일 컨텍스트면 base 보존 + `key.mobile`에만 레이아웃 필드 기록. `saveSettingsV33`·`saveCurrentRoomKeyV48` 양쪽 경유. 콘솔 검증: base.frameX≠mobile.frameX 격리 확인.
- `DENN_MOBILE_FIELDS_V`=위치/크기/앵커/가이드 스케일·위치/배경(bgScale,bgOffsetX/Y). 조명·그림자·기울기는 base 공유.
- `dennCurScopedKeyV` window 노출(콘솔 검증용, bgKey IIFE-local 문제 해소).

### C. 단계2·3 (구조 대전환 — 미검증)
- **핵심 설계 변경**: 별도 모바일 팝업창(viewAs=mobile) → **PC 편집기 안의 'PC|모바일' 토글**(`__dennAdminMobileV` 런타임 플래그). 관리자 바(`installAdminBar` L5024 + denn-v79c + **권위=denn-v79d `build()` L8613**, build가 tick으로 innerHTML 덮어쓰므로 거기에 토글 필수)에 세그먼트 버튼. `dennIsMobileEditCtxV()`=플래그 우선(viewAs 하위호환).
- 캔버스만 세로 폰 박스: `denn-v107`(L13556~) 최종 래퍼가 넓은 PC창(>860)+토글ON이면 rm/sg 캔버스를 세로(RATIO 0.462≈9:19.5)+라운드 베젤로. 컨트롤 패널은 PC 그대로.
- 읽기 병합 `dennMergeMobileV(base)`: **`isRoomPortrait()` 기준**(세로에서만 .mobile 병합, **가로 모바일=PC와 비율 동일→base 사용**). 주입: applySettingsV33·applyRoomSettings 진입 + rmRender 강제 프리셋(__op) + applyGuide/stabilizeCurrentGuide의 st. `isRoomMobile`/`isRoomPortrait` window 노출.
- viewAs 강제: `isRoomMobile`/`isRoomPortrait`/`measureBaseV48`가 `dennIsMobileEditCtxV()`면 모바일·portrait 강제.

### D. 단계4 배경이동 + 모바일 회전 UX (미검증)
- 배경 좌우/상하 이동 슬라이더(`rm-bg-ox/oy`, drawCover ox/oy 패닝) + 캡처/복원/내보내기 반영. 룸 모달 모바일 시트 '배경' 탭 이동 목록에 추가(restructure L13296).
- **모바일 회전 풀스크린**(`denn-v108` L13629~): 세로=일반(좌우잘림), **가로 회전 시 자동 전체화면**(`setRoomFullscreenLayout`, Fullscreen API 미사용)으로 배경 풀샷. `denn-rotate-fs` 클래스로 가로 시 **헤더·하단바·사용안내 전부 숨김 + 캔버스 100vw/100dvh + 우상단 ✕ 1개**(누르면 해제+`orientation.lock('portrait')` 베스트에포트). 세로 복귀=자동 해제.
- 전체화면 버튼 모바일 숨김(JS 인라인 !important), 회전 안내 문구(하단 메뉴바 위 측정 배치, 3초 페이드).
- **프레임(액자) 편집화면 가로 차단**: 룸 닫힘+모바일+가로면 '세로로 돌려주세요' 오버레이.
- **폰 터치 액자 드래그 버그**(검증됨 해결, `9ee7996`): 캔버스 `touch-action:pan-x pan-y`→`none`. 프레임 드래그=포인터 핸들러(installGuideDragEvents, sg-canvas) → pan-action이 스크롤로 먹던 것.
- 사이즈 가이드 눈금 라벨 50cm마다(가로 풀스크린 겹침 해결). 모바일 가이드배경 선택 카드 55→104px. 진입 점프 페이드인 가림(`denn-room-entering`).

### E. 세로(4:5) 배경 별도 업로드 (미검증, `d0add1e`)
- `dennGuideBgSrcV(bg)`: 세로 모바일이면 `bg.mobileDataUrl`, 아니면 `bg.dataUrl`. loadGuideImage·rmSelectGuide·`swapBgForOrientation`(회전 스왑, window.dennSwapRoomBgV 노출→관리자 토글에서도 스왑) 사용.
- admin 가이드 카드에 '📱 모바일 세로(4:5) 배경' 업로드 UI(`buildMobileBgRow`, denn-admin) + **업로드 시 1400px·JPEG0.85 다운스케일**(localStorage 용량 보호). `bg.mobileDataUrl` 저장.

## 2. ★ 내일 검증할 것 (미검증 기능)
1. **세로 배경 업로드**: 관리자 카드 '📱 세로 배경 올리기' → 세로폰/세로토글에서 4:5 표시, 가로 회전 시 원본 복귀, 관리자 모바일 토글에서 스왑.
2. **회전 풀스크린**: 세로=안내문구(메뉴 위, 3초)·전체화면버튼 없음 / 가로=메뉴 전부 숨김+배경 풀+✕ / 세로 복귀 자동 해제 / 프레임화면 가로=세로 오버레이.
3. **PC|모바일 토글**: 관리자 편집기 상단 토글 → 캔버스 세로 폰 형태(베젤), 컨트롤 PC 유지, .mobile 격리 저장(가로/PC는 base).
- 검증법: F12 기기툴바(Ctrl+Shift+M)+회전 아이콘, 또는 실폰. orientation.lock은 **안드로이드만**(iOS Safari 미지원).

## 3. ⚠️ 미해결 / 후속
- **세로 배경 Storage 미이전**: 현재 base64(다운스케일)로 localStorage 저장. 많이 올리면 quota 위험([[project_localstorage_quota_deadlock]]). 후속으로 admin `migrateGuideBgs`(L14916)에 `mobileDataUrl`→`mobileStoragePath` 추가 필요(블라인드 수정 위험해 보류).
- **세로 진입 점프**: `denn-room-entering` 페이드인(480ms)으로 가림. 근본은 다중 렌더 패스 정착 순서.

## 4. 보호/불변 (준수)
- 본체 무수정: renderFrame/zeRender/fbExport/sendKakao/openZoneEditor.
- 키: denn_admin/denn_shared_db/denn_order_requests. 신규는 `roomBackgroundSettings[key].mobile`(설정) + `guideBackgrounds[i].mobileDataUrl`(이미지).
- 저장(viewAs/플래그)·읽기(isRoomPortrait) 판정 분리. 소비자 실폰은 플래그 없이도 세로면 .mobile/세로배경 봄.

## 5. 참조
- 계획서: `C:\Users\써드플로어\.claude\plans\shimmying-mixing-cat.md`
- 직전 핸드오프: `docs/2026-06-16-session-handoff.md`
- 핵심 코드(mockup): dennRouteSaveV/dennMergeMobileV(L3146~), dennGuideBgSrcV(L1773직전), denn-v107(L13556 캔버스 폰박스), denn-v108(L13629 회전 풀스크린/안내/스왑), installGuideDragEvents(L3636 포인터 드래그), isRoomPortrait/Mobile(L3388~).
- 핵심 코드(admin): renderPolishedGuideCards(L5702)+buildMobileBgRow, PC|모바일 토글=installAdminBar(L5024)/denn-v79d build(L8613), migrateGuideBgs(L14916).
- 메모리: [[project-mobile-pc-guide-settings-attempt]] [[feedback_verification_workflow]] [[feedback_mockup_iife_scoping]] [[project_localstorage_quota_deadlock]] [[guidebg_clobber_guard]]
