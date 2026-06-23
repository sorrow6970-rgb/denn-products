# 2026-06-23 세션 핸드오프 — 가로↔세로 스케일 튐 해결 · 템플릿 시트/어드민 자동반영 · focus 모델 시도→롤백 · 가로 레터박스

> 상태: HEAD `21fa0f2` (origin/main push 완료). 시작 `289a23d`(06-22 핸드오프).
> 큰 흐름: 회전 튐 후속 마무리 → 템플릿/스토리지 개선 → **운영자 배경위치 가로 미반영** 근본진단 → focus 모델 완성 시도(연쇄 회귀)→**전량 롤백** → **가로 전용 단순 레터박스**로 재패치.

## 1. 오늘 커밋 (시간순, 전부 push)
- `b66d93a` 가로→세로 복귀 스케일 튐 제거 — 세로 페이드 게이트 대칭화 + 회전 즉시 동기 프리게이트(dennRotPreGateV)
- `a2b6d38` 가로→세로 잔존 튐 2종 — 즉시 숨김(transition:none) + 세로 가로스크롤 0 고정
- `ddea87c` 어드민 가이드배경 저장 자동반영(storage 리스너) + 템플릿 시트 그리드 시트높이까지 확장
- `0a85774` focus 모델 완성 Stage1(배경) **[롤백됨]**
- `afffc36` focus 모델 세로 배경크기 회귀 수정 **[롤백됨]**
- `27c664c` **focus 모델 롤백** — 세로/가로 회귀로 ddea87c 복구
- `21fa0f2` **가로 전체화면 배경 레터박스** — cover→contain (현재 HEAD, 미검증)

## 2. 가로→세로 스케일 튐 — 해결 (b66d93a + a2b6d38) ✓
- **근본=4겹 비대칭**(06-22에 가로 진입만 하드닝, 세로 복귀 비대칭): ①onChange 세로 분기(else)에 페이드 게이트 부재 ②페이드가 onChange 디바운스(+150ms) 뒤라 첫 프레임 못 가림 ③페이드 CSS `transition:opacity .26s` 양방향→숨길 때 페이드아웃 중 stale 대형 캔버스 비침("처음 큰 스케일") ④reveal `__ctr`가 세로서도 가로 센터링→정착 전 과도 폭으로 좌우 이동 후 복귀.
- 수정: onChange L14009에 세로 페이드 게이트(`__ori==='p'`)+`dennGatedRevealV(1800)`(가로 L14008 대칭, 단 중앙루프 제외) / **동기 프리게이트 `dennRotPreGateV`**(resize·orientationchange 즉시, 디바운스 전, 방향전환+roomOpen에만) / CSS entering에 `transition:none`(즉시 숨김) / `__ctr` 가로 센터링은 rotate-fs만, 세로 `scrollLeft=0`.
- ★교훈: 회전 한 방향 하드닝하면 **반대 방향도 대칭** 처리. 페이드로 "가린다"면 **숨김은 즉시(transition:none)**.

## 3. 템플릿 시트 + 어드민 자동반영 (ddea87c) ✓
- **템플릿 바텀시트 하단 빈공간**: 모바일 `.tpl-scroll{max-height:190px}`로 카드 1줄만 보이고 시트(74vh)가 더 큼. 사용자 선택="그리드 확장". 사이즈 섹션도 tpl 그룹이라 `.tpl-scroll` 직계자식 가진 템플릿 섹션만 `:has()`로 flex 채움(미지원 폴백). (예시이미지 비교 후 결정.)
- **어드민 가이드배경 저장→목업툴 자동반영**: 기존엔 새로고침 필요(목업툴이 load 시 1회만 ADM 읽음). `storage` 리스너 추가(L2285대) — 어드민이 localStorage(`denn_admin`) 쓰면 다른 탭 목업툴 감지→ADM 갱신+`rmLoadGuideBgs`+룸 재렌더. e.newValue 즉시파싱, 디바운스 180ms, 읽기/재렌더만(재persist 없음→clobber/루프 없음). ★같은 origin 다른 탭에서만 발생(같은 탭/iframe X).

## 4. ★★ 운영자 배경위치 가로 미반영 — 근본진단 (focus 모델 시도→롤백)
- **증상**: 운영자가 관리자 PC(=모바일 가로와 동일 base)서 배경위치 조정·저장해도 **소비자 모바일 가로서 적용 안 됨**(PC는 됨).
- **콘솔 프로브 확정**: 값은 정확 전달(slider.ox=-29 == operator.ox=-29). **전파 버그 아님.** 가로 전체화면 캔버스=이미지비율(V107 `__dennLsArV`)이라 `drawCover` offset 여백 0(`twMinusW=1,thMinusH=0`)→offset 화면상 무효. = **drawCover offset의 캔버스-비율 종속**(WYSIWYG). PC는 비율 달라 됨.
- **설계 확정**: `dennMergeMobileV`(L3260)가 **isRoomPortrait()에서만 .mobile 적용**→**가로=base=PC와 동일**(설계상 일관). 세로만 .mobile. 액자위치(frameCenterX/Y)도 동일(가로=base).
- **focus 모델 완성 시도(0a85774)**: bgZoom/bgFocusX/Y(이미지좌표). `dennBgIsFocusModel` 재활성(bgZoom 유무), `dennBgOnInputV` 운영자 전환, force 블록 `dennApplyBgSlidersV(__op)`, 가로 focus→스크롤 `dennRoomFocusScrollV`(focus점을 뷰포트 중앙). 검증: 가로 세로위치 매핑 정확(scroll.top=87=0.5*563-195).
- **★연쇄 회귀로 전량 롤백(27c664c)**: ①세로 배경크기 틀어짐 — base를 PC서 focus 재저장→세로 .mobile에 bgZoom:1.0 stale 섞임, focus 판정이 bgZoom 우선→.mobile.bgScale:1.17(원래 세로크기) 무시. 원인=dennSnapshotBgV 레거시삭제가 dennRouteSaveV prev병합서 되살아남. afffc36으로 복구 시도. ②**그래도 가로 중앙정렬 깨져 상단부터 나옴**. → 사용자 "롤백해야하지않아?" → `git checkout ddea87c`로 focus 일체 되돌림. **교훈=focus는 base/.mobile×레거시/focus×가로스크롤이 얽혀 코어 일괄변경 위험. 부분수정마다 딴 데서 터짐.**

## 5. 대체 채택 — 가로 전용 단순 레터박스 (21fa0f2, 미검증)
- 사용자 재지시: "pc 비율같이 레터박스 만들든 확대해 비율맞추든 **단순화**한 방법". (처음 letterbox→focus 혼동시킨 것 정정.)
- **V107 box(L13819) 캔버스 사이징 cover→contain 한 곳만 변경**: `var cw=vw,ch=cw/ar;if(ch>vh){ch=vh;cw=ch*ar}`. 배경 전체를 뷰포트에 맞춰(잘림 없이) 표시. 캔버스=이미지 비율→drawCover 전체 이미지 꽉(왜곡0). 좁은 이미지=좌우 바, 넓은 이미지=상하 바.
- `rm-canvas-area`가 이미 가로 전체화면서 `display:flex;justify-content:center;background:#000`(L3007)→캔버스 작아지면 **자동 중앙정렬+검은 좌우 바**. 캔버스≤뷰포트라 스크롤 없음(센터링 코드 inert). 페이드/gen 가드 보존.
- **가로 전용(rotate-fs), 세로·PC 완전 무관**. 배경위치(offset)는 가로서 미적용(전체표시라 moot)=수용됨.

## 6. ★미해결 / 다음 세션
### ★★ 다음 세션 우선순위 (사용자 지정 2026-06-23)
1. **가로모드 레터박스 조정** — 21fa0f2 레터박스(cover→contain)의 후속 미세조정. 점검: 바 색(현 #000)·좌우 바 정렬·넓은 이미지 상하정렬(현 area `align-items:flex-start`=상단붙음→중앙 조정 검토)·레터박스 크기/비율.
2. **가로 배경조정 시 연동** — 운영자/소비자가 배경(크기·위치)을 조정할 때 가로 레터박스 뷰에 반영/연동되게. (현재 가로는 전체표시라 offset moot — 연동 방식 설계 필요. focus 모델은 보류했으나 이 요구가 다시 focus형 접근을 부를 수 있음 → 작게 격리해서.)
3. **세로모드 액자위치 다름 수정** — 세로에서 액자(frameCenterX/Y) 위치가 기대와 다름. §4 `__userMoved` 거짓양성(반복토글 드리프트) 또는 base/.mobile 액자값 불일치 가능. 감시자 프로브로 범인 확정 후 수정.

### 기타 미해결
- **레터박스 검증 대기**(21fa0f2): 가로서 배경 전체+검은 좌우 바 확인. 점검: 바 색(#000)·정렬·넓은 이미지 상하정렬(현재 area `align-items:flex-start`라 상단붙음, 중앙 원하면 조정).
- **운영자 배경 좌우위치를 가로서 반영**하려면 focus 모델(이미지좌표) 필요하나 **코어 회귀 위험 커서 보류**(사용자가 레터박스=전체표시 선택). 재도전 시 Stage 작게+검증 철저.
- **§4 `__userMoved` 거짓양성**(가로↔세로 반복토글 후 세로서 액자위치 저장값서 틀어짐) — 06-22부터 별개 미해결. 감시자 프로브(defineProperty+stack)로 범인 추적 필요.
- **Stage2 액자 이미지-앵커**(배경 일관해도 액자-장면 위치 비율별 어긋남) — focus 보류로 함께 보류.

## 7. ★함정/교훈 (오늘)
- **코어 렌더(rmRender/drawCover/캔버스 사이징)는 base/.mobile×레거시/focus×방향(PC/세로/가로)×반복토글이 다겹으로 얽힘** → 일괄 변경 시 한 곳 고치면 딴 데 터짐. **작게 격리·검증·롤백 쉽게.**
- **미커밋 즉시 커밋**(롤백 유실 방지) — 오늘 롤백은 `git checkout ddea87c -- <file>`로 깔끔(커밋돼 있어 안전).
- 캐시: `?v=숫자` 새 URL만 확실. 콘솔 프로브로 실제 라이브값 확인이 진단 결정타.
- 사용자 의도 확인: AskUserQuestion 예시이미지(preview)로 비교 효과적. 단 "진짜해결" 프레이밍이 사용자 원의도(레터박스) 덮은 사례 — **사용자 표현 그대로 존중**.

## 8. 참조
- 직전: docs/2026-06-22-session-handoff.md
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[project_card_thumbnail_composite]] [[feedback_verification_workflow]]
