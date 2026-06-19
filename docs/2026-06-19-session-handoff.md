# 2026-06-19 세션 핸드오프 — WYSIWYG focus 모델 시도→철회, 모바일 가로/세로 UX, 배경 리프트

> 상태: HEAD `2d1f63a` (origin/main push 완료). 시작 `168b932`.
> 긴 세션. focus 모델을 도입했다가 소비자 전달 문제로 **비활성화(레거시 복귀)**. 그 외 가로/세로 UX 다수 적용.

## 1. 오늘 커밋 (시간순)
- `841dbac` WYSIWYG focus 모델(이중경로) + 모바일 가로/세로 UX 다수 (① 4:5 즉시로드, ② 가로 풀블리드, ③ 가로 액자=PC, ④ X→세로안내, 가로 스크롤/조절바, 중앙 가이드선, isRoomLandscape 노출)
- `762759f` 배경 슬라이더 step 0.5/0.1 + 가로 중앙시작·점프 페이드
- `21de809` **★focus 모델 비활성화 — 레거시 배경 전용 복귀** (dennBgIsFocusModel→false, dennBgOnInputV→no-op)
- `41d8228` 안내문구 모바일 숨김 + 배경 슬라이더 ±버튼 (롤백 유실분 복원)
- `2d1f63a` 모바일 세로 배경 자동 리프트 + 어드민 프리뷰 메뉴존 실측 교정 (롤백 유실분 복원)

## 2. 현재 적용/유효 상태
- **배경 모델 = 레거시(bgScale/bgOffsetX/bgOffsetY)**. focus(bgZoom/bgFocusX/Y) 함수는 코드에 잔존하나 `dennBgIsFocusModel`이 항상 false라 미사용.
- **모바일 가로(landscape)**: 자동 전체화면(v108) + 배경 cover로 뷰포트 꽉 채움(②) + 세로 스크롤 + 커스텀 반투명 조절바 + 진입 중앙시작/페이드. X(✕)=`framePortraitPrompt`로 "세로로 돌려주세요" 안내(④).
- **모바일 세로**: 하단 메뉴(17.4%)>상단(6.5%) 비대칭 보정 → **자동 리프트**: rmRender에서 배경+액자+가이드를 `ctx.translate(0,-H*0.0545)`, sgDraw(룰러)도 동일 `RM.__bgLiftV`만큼. 배경 안 키움(하단 빈 부분=레터박스는 하단 메뉴가 가림). 요소 transform 미사용. `isRoomPortrait()&&!rotate-fs`에서만(PC 무영향).
- **어드민 배경설정 중앙 가이드선**(dennDrawCenterGuideV, rmRender L3990대): 십자 점선(얇게 — 진하게는 사용자 반려), cx=W/2·cy=H/2(리프트 translate 안이라 보이는영역 중앙에 표시). PC·모바일 둘 다.
- **어드민 📱 프리뷰 메뉴존**(V107 #denn-mobile-menu-overlay): 상단 6.5% / 하단 17.4%(실측 헤더61·메뉴162÷932).
- **배경 슬라이더**: 크기 step 0.5 / 좌우·상하 step 0.1 + **±버튼**(dennBgNudgeV, 클릭당 0.5). 안내문구(#rm-usage-guide-v33) 모바일 숨김(실폰≤720 + admin-mobileview).

## 3. ★미해결 — 저장 문제(다음 세션, 사용자: "나중에")
**어드민에서 맞춘 모바일 배경 위치가 소비자에 반영 안 됨.**
- 진단(콘솔): 운영자키 gb...의 `.mobile.bgFocusY=0.567`(focus 저장됨)인데, 소비자키 `user:gb...`는 **레거시(bgOffsetY=-50)** 이고 소비자가 그걸 읽음. `focusModel=false`.
- **근본**: 소비자 가이드배경 렌더는 **V48 경로(applyGuide→applyRoomSettings)** 가 자기 키(user:)를 직접 읽음. **V33 미러(loadSettingsV33, 운영자값 복사)가 V48 경로엔 안 닿음.** focus 모델이 이 틈을 드러냄(레거시여도 동일 구조 문제 잠재).
- focus 비활성(21de809)으로 운영자 저장은 레거시가 되지만, **소비자 V48가 stale user:key를 읽는 구조 자체는 그대로** → 운영자가 레거시로 재저장 + 소비자 stale user:key 갱신(미러가 V48에 닿게) 필요. **다음 세션 핵심.**

## 4. ★함정(오늘 시간 소모 — 다음에 주의)
- **rmSizeCanvas 3중 정의**: L3619(죽음)/**L5270=V47 활성 base**/L6980=v72 래퍼. 죽은 함수 고쳐 한참 헤맴. 캔버스 사이징은 활성 base나 최외곽 V107 래퍼에.
- **bgSrc(L5319 등)=dataUrl(PC)만** 반환. 방향 무관. (focus 시절 ① 4:5는 dennGuideBgSrcV로 해결했었음 — 지금 레거시.)
- **isRoomLandscape 미노출** → probe에서 window.isRoomLandscape undefined로 오판(노출 추가됨, 841dbac).
- **V33 loadSettingsV33 미러 ≠ V48 applyGuide** — 소비자 배경/위치 전달의 핵심 분기점.
- **리프트는 요소 transform 금지**(rm/sg 둘 다 걸면 sgDraw가 rm rect에 sg 재배치 → 이중이동·빈 폰박스). **내용 translate**만.

## 5. 운영 메모(중요)
- ⚠️ **미커밋 작업을 git checkout으로 롤백하면 그 세션 수정이 다 날아감.** 오늘 리프트/안내문구/±버튼이 롤백 때 같이 유실됨(대화 기록으로 재생성해 복원·커밋). **앞으로 좋은 변경은 즉시 커밋 후 실험만 롤백.**
- focus 모델 미사용 함수(drawCoverFocus 등) 잔존 — 향후 WYSIWYG 재설계 시 **V48 통합 전제**로만 재도입.

## 6. 참조
- 직전: docs/2026-06-18-session-handoff.md
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[feedback_verification_workflow]]
