# 2026-06-08 세션 핸드오프 — 작업5(고객 시안확인) 마감 + 데이터 손실 재발방지

> 범위: `denn-mockup-tool.html` 중심(고객 게이트 UI·배경별 사이즈 앵커·시계 복원·clobber 가드).
> 상태: **이번 세션 작업 전부 커밋·푸시 완료.** 작업 트리 clean. HEAD = `d8d9f09`.
> 안전: 모두 가산적. 렌더 본체 수식 무수정(drawFrame 앵커 강제는 `dennIsAdminSetupV()`+비중앙 앵커에서만, 기본=중앙이면 무영향).

## 0. 복원/확인
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -6   # HEAD = d8d9f09
```

## 1. 이번 세션 완료 (커밋순)

### A. 고객 시안확인 게이트 UI 다듬기 (`?space=<token>`)
- `3042dab` 3컬럼 확대: 카드 폭 1500→1820px, 좌/우 아일랜드 200→220px. 액션버튼(시안원본·카카오확정) 테두리=갤러리 미선택 썸네일색(`3px solid #ece6dd; radius:10`).
- `2b53595` 시안 이미지 상하 여백 대칭: 제목을 가운데 흰 아일랜드 **안 상단에 유지** + 하단에 제목 블록 **투명 cloneNode 스페이서** → 이미지 위아래 여백 동일. (이전에 제목을 밖으로 뺐다가 사용자 의도와 달라 되돌림.)
- 함수: `showComposed()` (mockup ~L13730대). 좌=`leftIsland`(버튼), 중=`mainIsland`(캔버스+제목+스페이서), 우=`galIsland`(다른 공간 썸네일).

### B. 배경별 "사이즈 기준 위치(앵커)" — 관리자 배경설정 모드 전용 (`54ea908`)
- 문제: 탁자 배경에서 액자 크기를 줄이면 중심 기준 스케일이라 공중에 뜸.
- 해결: 배경별 세로 슬라이더 `#rm-size-anchor`(상단0~중앙50~하단100, 관리자 모드만 표시). **`drawFrame` 단일 렌더 지점에서 앵커 강제** — `RM.__anchorYabs`(앵커 높이) 기준으로 cy 재계산 → 스케일 슬라이더·표시사이즈(A2→A3)·휠 등 **어떤 크기변경/위치-리셋 경로가 끼어도 고정 높이 유지**. 드래그 중엔 자유 이동(스킵), 드래그 끝/앵커 변경 시 타깃 재캡처.
- 저장: `frameSizeAnchor` 가산(`currentSettingsV33`/`currentRoomSettingsV48` → `saveCurrentRoomKeyV48`), 로드 `applyRoomSettings`(배경 로드 시 `RM.__anchorYabs=null` 리셋→첫 렌더 lazy-init).
- 헬퍼: `dennAnchorAyV`/`dennCaptureAnchorTargetV`/`dennSetSizeAnchorV`/`dennUpdateSizeAnchorReadoutV`. 기본=중앙(50)이면 소비자·게이트 전부 무영향(회귀 없음).

### C. 고객 게이트 시계 표시 수정 (`54ea908`)
- 원인: 씬에 **시계 토글 상태 미저장** → 게이트에서 `clockVisible()`가 꺼짐으로 판단.
- 해결: `captureScene().design.clockOn` 가산(`clockVisible(curFSz,curFTpl)` 결과 저장), `replayScene`/`replayEditable`에서 `opts.clock`+`tog-clock` 클래스 복원.
- ⚠️ **이미 발급된 공간은 clockOn이 없어 그대로** — 해당 시안 수정→재저장(또는 재발급)해야 시계 박힘.

### D. ★ 가이드배경 축소 clobber 방지 가드 (`d8d9f09`) — 데이터 손실 재발방지
- 사고: `ADM.guideBackgrounds`가 4→1(빈 dataUrl default1)로 줄고 `roomBackgroundSettings`는 20개 생존. **용량 문제 아님(0.68MB).** 사용자 본인 JSON 백업으로 복구.
- 원인(유력): 목업툴(소비자/운영자 룸설정 창)이 stale·축소된 ADM 사본을 `saveCustomerAdminStateToLocalStorage`로 되써넣어 발생(로드 직후 무조건 되써넣기 L2160 포함).
- 가드 `guardGuideBgsLSV`(mockup L37대): 목업툴은 guideBackgrounds를 **읽기만** 하므로 LS 쓰기 직전 저장본 비교 → '쓰려는 게 실제이미지(dataUrl>200 or storagePath) **≤1개**인데 저장본 **≥2개**'면 clobber로 간주, 저장본 유지+in-memory ADM 치유(`writeAdminV48` 경유 IDB도 보호). 검증: 시뮬레이션 4→1 차단(`차단작동 YES`).
- **⚠️ 가드는 mockup 전용이 의도.** admin은 guideBackgrounds 소유자라 2→1 삭제 등 자유로워야 함 → admin persist엔 동일 가드 넣지 말 것(정상 삭제 차단됨).
- 한계: 이미 LS+IDB 둘 다 축소된 뒤엔 복구 불가(예방만). 근본대책=가이드배경 dataUrl을 Firebase Storage로 이전해 LS 경량화(미착수).

## 2. 내일 작업 (사용자 지정 — 다음 세션 시작점)
1. **가이드배경 순서 변경** [안전·소(小), 조사 완료]
   - 안정 id 기반(`bgKey(bg,i)=bg.id||'guide-'+i`)이라 배열 재정렬해도 per-bg 설정 무손상.
   - admin `renderPolishedGuideCards`(denn-admin.html L5652대) 카드 actions에 ←/→ 버튼 + `moveGuideBg(i,dir)` swap 함수(`delGuideBg` L4233 패턴 미러: 배열 swap→`saveNow()`→`renderGuideBgs()`).
   - 목업툴 갤러리(`rmLoadGuideBgs` mockup L1702대)·신규 발급 게이트(`scene.room.gallery` 캡처 순서)에 자동 반영. 기존 발급분은 스냅샷 순서 유지.
2. **가이드배경별 표시가능 사이즈 화이트리스트** [중상, 사전평가 필요]
   - 예: 배경A → A2/A3/B5 허용, 100호·50호 제외.
   - admin 배경 카드에 사이즈 체크리스트 설정 → 배경별 `allowedSizeIds` 저장 → 목업툴 내공간보기 사이즈 게이트(메모리 [[project_frame_size_category_filter]])·게이트 재현에서 필터.
   - 시작 시 설계 질문: 빈 화이트리스트=전체허용 vs 전체차단 / 표시사이즈 UI 위치 / 게이트에도 적용할지.

## 3. 보호/불변 (이번 세션 준수 확인)
- 보호 함수 본체 무수정: `zeRender`/`renderFrame`/`fbExport`/`sendKakao`/`openZoneEditor`. (drawFrame은 보호 외, 앵커 강제는 가산·게이팅.)
- 보호 키 무수정: `denn_admin`/`denn_shared_db`/`denn_order_requests`. (가드는 denn_admin **축소만 차단**, 구조 무변경.)
- 작업5는 `denn_order_requests`(주문의뢰)와 독립 — `spaces/{token}`(Firestore) 격리 유지.

## 4. 참조
- 직전 핸드오프: `docs/2026-06-05-session-handoff-ui-reorg.md`.
- 백로그: `docs/next-session-context.md`(이번 세션 반영해 갱신함).
- 관련 메모리: 가이드배경 clobber 가드 / [[project_localstorage_quota_deadlock]] / 사이즈·카테고리 필터 위계.
