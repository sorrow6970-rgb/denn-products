# DENN PRODUCTS — 배포 전 작업 계획 (재준 확정 순서 v2)

> 갱신: 2026-06-08. 저장만 하고, 실제 코드 작업은 각 항목 진입 시
> **"사전 평가 → 재준 승인 → 단계 진행"** 순서로 한다.

---

## 현재 상태 (2026-06-08 야간 갱신, 전부 push됨; HEAD≈`d8d9f09`)

### ★★ 다음 세션(내일) 시작점 — 사용자 지정 순서
1. **가이드배경 순서 변경** [안전·소, 조사완료] — admin 카드에 ←/→ + `moveGuideBg(i,dir)`. 안정 id라 재정렬 무손상. (상세: docs/2026-06-08-session-handoff.md §2)
2. **가이드배경별 표시가능 사이즈 화이트리스트** [중상, 사전평가 필요] — 배경별 allowedSizeIds 저장→내공간보기/게이트 사이즈 필터.
3. ~~가이드배경 dataUrl→Firebase Storage 이전~~ → ✅ **이미 완료(2026-06-10 검증)**. admin 마이그 인프라(`dennFirebase.uploadDataUrl` L14648 → `migrateGuideBgs` L14891 → `sweepHeavyV2` L14989 자동트리거)가 가동돼 가이드배경 4개 전부 `dataUrl=https URL`+`storagePath`로 in-memory·localStorage 영속화(reload-safe, LS 경량화 달성). reader(`bg.dataUrl` 직접)는 URL이라 무수정 동작. ⚠️ `slimSnapshotState`(L5865) guideBg slim 조건이 frameTemplates(L5881)보다 허술하나 **undo 스냅샷 링(SNAP_KEY) 전용**이라 메인 데이터 무영향 — 옛 스냅샷 복원 시 가이드 깨질 잠재버그만 남음(우선순위 낮음, 미수정).

### 오늘(2026-06-08) 완료분 — 작업5 마감 + 손실 재발방지
- **작업5 고객 시안확인**: 게이트 3컬럼 UI 확대·버튼테두리 통일·상하여백 대칭(`3042dab`,`2b53595`) + **배경별 사이즈 기준위치(앵커)**(`54ea908`, drawFrame 단일지점 강제·관리자모드 전용) + **게이트 시계 표시 복원**(`54ea908`, clockOn 캡처/복원; ⚠️기존 발급분은 재발급/수정저장 필요).
- **데이터 손실 재발방지**(`d8d9f09`): guideBackgrounds 4→1 clobber 가드(mockup 전용, ≤1로 축소시 저장본 유지). 용량 문제 아니었음(0.68MB). 상세 핸드오프·메모리 참조.

---

## (이전) 현재 상태 (HEAD≈`b7ffba7` 시점)
- **작업1 ✅ Phase A/B 완료**(-127줄): 비활성 sun residue/preserve wrap(v43/v44)·v361 ScaleLock 도달불가 본체·renderFrame 순수 no-op(v13) 제거. **pre-v20 renderFrame wrap 8겹(L2363~2594)은 v20(L2702 fresh redefine)이 끊은 orphan=죽은 코드지만, 같은 IIFE에 라이브 부수효과(drawClockLayer·DENN_FRAME_VISIBLE·switchTab/togFrame wrap·DOMContentLoaded)가 섞여 통째 삭제 불가 → 무해해 보류.** 후속 원하면 orphaned 재할당부만 외과 제거.
- **작업2 ✅** 케이스탭에서 액자(#page-frame) 누출 차단: `#page-case`·셸 비활성(:not(.on)) force-hide. 셀렉터 특이도(셸 1,1,0 이기려면 1,2,0+!important) 주의.
- **작업3 ✅(골격)** 폰케이스 PC 셸 신설 `denn-v101-pc-shell-case`(방식 A, 액자 denn-v94 미러). 6 드로어: 기종/템플릿/이미지/색상(케이스+휴대폰)/텍스트/설정. 정보바 메뉴 상단 이동. **인터랙션 정밀검증은 미완(케이스 비활성이라 후순위).**
- **작업4 ✅** 폰케이스 탭 진입 차단 `denn-v102-case-tab-disable`: `__DENN_CASE_ENABLED`(기본 false) 플래그+switchTab 게이트+'(준비중)' 표시+토스트. **재활성=`dennSetCaseTabEnabled(true)` 또는 플래그 한 줄 true.** 토스트 위치도 셸 캔버스 중앙으로 수정(showToast).
- (이전 세션) 백로그 감사: 옛 #1·#2·#4·#5·#6은 이미 완료, #3(룸스키마 3·4단계)만 잔존. #7 케이스 섹션번호 제거 완료.

### ~~다음 세션 시작점 = 작업5~~ → ✅ 작업5 사실상 마감(2026-06-08): 발급·게이트 재현·배경별 위치/스케일/햇빛/앵커·시계·UI 완료. 남은 후속=모바일 최적화 / 링크 회수(삭제). 다음 시작점은 위 ★★(가이드배경 순서·표시사이즈)로 이동.

---

## [공통 원칙 — 모든 작업에 적용]
- 보호 영역 무수정: `zeRender` / `renderFrame` / `fbExport` / `sendKakao` / `openZoneEditor` 함수 본체
- 보호 스토리지 키 무수정: `denn_admin` / `denn_shared_db` / `denn_order_requests`
- 각 작업 진입 시 **사전 평가 먼저 보고**: (1) 변경 위치 (2) 작업 분량(대/중/소) (3) 위험 요소 (4) 기존 기능 회귀 가능성
- 가벼우면 바로 적용, 위험 있으면 재준 승인 후 단계 진행
- UI/UX는 유지하고 내부 데이터 흐름만 정리하는 방향(리빌드 정신 그대로)
- 관련 없는 영역 동시 수정 금지

---

## [작업 1] 패치 누적 찌꺼기 제거 (목업툴 액자탭 + 어드민)
- 다중 패치로 누적된 wrap 코드 부채 정리. 기존 기능은 100% 그대로 유지.
- 진행 중이던 룸 설정 스키마 리빌드 4단계(구 코드 청소)와 연결됨:
  - 완료: 1단계(신 스키마 인프라 + 읽기 어댑터, 구와 100% 동일성 증명, push됨)
  - 미완료: 2단계(쓰기 scope 분리·오염 차단), 3단계(운영자 도구 별도 파일), 4단계(구 코드 청소)
- 사전 평가 시 함께 보고: 제거 대상 wrap 목록 + 각 wrap이 현재 실제로 무엇을 하는지 + 제거 시 회귀 위험
- 안정 상태마다 커밋으로 체크포인트화. 회귀 발생 시 롤백.

## [작업 2] 폰케이스탭에 액자툴이 같이 출력되는 문제 수정
- 증상: 목업툴에서 "폰케이스" 탭 진입 시 액자 탭 요소까지 같은 화면에 함께 렌더됨.
- 사전 평가: 탭 전환 시 렌더 대상 분기/표시 토글이 어디서 새는지 진단 보고 후 수정.

## [작업 3] 케이스 UI를 액자 UI와 동일하게 통일
- 폰케이스탭 UI를 액자탭과 동일한 구조/레이아웃/컨트롤로 맞춤.
- 작업 4에서 케이스 탭을 사용자에게 비활성 처리하더라도, UI 통일 작업은 미리 완료해둔다.
- 사전 평가: 액자 UI 대비 케이스 UI 차이점 목록 + 통일 시 변경 범위 보고.

## [작업 4] 케이스 탭 진입 차단 (개발 완료 전까지)
- 차단 방식: **비활성** — 탭은 보이되 사용자가 진입하지 못하게 비활성 + "준비 중" 안내.
- 단, 내부 케이스 UI(작업 3)는 미리 완성해둔 상태로 둔다. 차단은 진입만 막는 용도.
- 개발 완료 후 한 줄 토글(플래그)로 즉시 활성화할 수 있게 구현.

## [작업 5] 내공간보기 — 패스워드 개별 설정 탭  ★다음 세션 시작점(사전평가 완료, 결정 확정)
- 고객 "내공간보기"를 토큰 + 패스워드 방식으로 개별 접근 가능하게.

### 사전평가 결과(2026-06-08)
- **현황**: Firebase는 admin(L14503~)에 **Storage + 익명인증만**(Firestore/RTDB 없음). 현 `?share=`(mockup-tool L674~)는 운영자→소비자 어드민 JSON import일 뿐 **고객별 인증 없음**. 내공간=`openRoomMockup`(L1725), roomBackgroundSettings 로컬/IDB. → 작업5는 **완전 신규**.
- **분량 대(大), 위험 중상~상**(패스워드 보안·Firebase 규칙·신규 접근경로). 기존 `?share=`는 건드리지 말고 **신규 `?space=<token>` 라우트로 분리(가산적)**.

### 재준 확정 결정(2026-06-08)
1. **백엔드 = Firestore 추가**(SDK + 보안규칙으로 진짜 게이팅). admin의 기존 firebaseConfig(denn-products) 재사용 + firebase-firestore SDK 추가.
2. **패스워드 설정 주체 = 운영자**(admin에서 시안별 토큰+패스워드 발급 → 고객에게 링크+비번 전달).
3. **게이트 대상 = 열람만(view-only)**. (조정·저장은 범위 외 → 저장경로 토큰분리 불필요, 작업 단순화.)
4. 보호키(denn_admin/denn_shared_db/denn_order_requests) 무수정. 신규 Firestore 컬렉션(예 `spaces/{token}`)로 격리.

### ★ 재설계(2026-06-08, 의도 2회 정정 후 확정) — flat 이미지 ❌ / 내공간 씬 재현 ⭕
**최종 흐름**: 운영자가 admin '고객 시안 확인' 탭 → "내공간 시안 만들기" 버튼 → mockup `?spaceCreate=1` 창에서 **고객 사진+프레임+가이드배경+위치**를 시안별로 구성 → 그 창에서 "비공개 공간 발급"(현재 씬 스냅샷+비번) → 링크 생성 → 고객에게 전달 → 고객 `?space=<token>`+비번 → **운영자가 설정한 내공간보기 씬이 그대로 열림(view-only)** → 확정 시 카카오 채널 연동.
**확정 결정**: 프레임 내용=고객 사진/디자인 포함 · 구성=기존 admin 룸셋업 엔진 재사용(단 발급버튼은 '고객 시안 확인' 탭에, 공통설정과 분리) · 가이드배경/위치=시안별 개별 지정.

**완료(이번 세션)**:
- ✅ **stage1**: Firestore 암호화 기반 — `dennSpace.create/load`(PBKDF2+AES-GCM, `spaces/{token}.enc`), docs/firestore.rules(read 익명·create-once·update/delete 차단). Firebase 콘솔 Firestore 활성화+규칙 게시 완료. **payload만 씬 스냅샷으로 바꿔 재사용**.
- ✅ **stage2(재설계)**: admin '고객 시안 확인' 탭 = **런처**(`dennOpenSpaceCreate`→ mockup `?spaceCreate=1` 새 창) + 발급공간 목록(localStorage `denn_proof_spaces`, storage 이벤트 반영). 이미지 업로드 방식 폐기.

**남음(다음 — mockup-tool 핵심, ~200줄)**:
- **stage3a `?spaceCreate=1` 발급**: 플로팅 "비공개 공간 발급" 버튼 → 현재 씬 스냅샷 캡처 → 사진/가이드배경 dataUrl은 Storage 업로드(URL), 나머지 설정은 인라인 → `dennSpace.create({roomSettings:scene, password})` → `denn_proof_spaces`에 {token,label,pw,url} 기록 + 링크 표시.
  - **스냅샷 모델 `space-scene-v1`**: `design{tplId:curFTpl.id, sizeId:curFSz.id, colorId:curFCol.id, texts:{main,name,name2,date,sub}, photoUrl(Storage), imgT:frameImgT}` + `room{bgId:RM.bgId, guideIndex:RM.guideIndex, guideBgUrl(Storage/URL), pos:RM.pos, settings:currentRoomSettingsV48()}`.
- **stage3b `?space=<token>` 게이트 재현**: 비번 통과 후(현재 게이트는 이미지표시 → **씬 재현으로 교체**): 사진/배경 로드 → `selFTplByRef`로 tpl 선택 → size/color/texts 적용 → RM(bgId/guideIndex/pos)+room settings 적용 → `openRoomMockup` 호출 **view-only**(편집 비활성) → 카카오 확정 버튼(브랜드 kakaoUrl).
- **참고 코드**: RM(L1678~), `openRoomMockup`(L1725), `currentRoomSettingsV48`(L5116), `selFTplByRef`(L1070), `applyFrameDefaultTexts`(L1058). 기존 게이트(이미지표시 showProof)·CSS는 재현용으로 교체.
- **단계**: 3a 발급 → 검증 → 3b 게이트 재현 → end-to-end 검증. 각 커밋.

## [작업 6] 1차 온라인 업로드 (모바일 최적화 전)
- 모바일 최적화 본격 작업 전에 먼저 라이브로 배포(Cafe24 호스팅 업로드).
- 목적: 실기기 실제 URL에서 모바일 테스트를 반복하기 위함.
- 사전 평가: 배포 시 점검 항목(CORS/tainted canvas, Firebase 규칙, 공유 URL 동작, localStorage 용량) 체크리스트 보고 후 업로드.

## [작업 7] 모바일 하단 탭 UI 수정 + 모바일 최적화 (바텀시트)
- 레이아웃: **바텀시트 방식 확정**.
  - 상단: 미리보기 영역 풀화면(항상 표시)
  - 하단: 고정 탭바(mockup-tool 실제 카테고리에 맞춘 아이콘)
  - 탭 클릭 시 해당 설정 패널이 하단에서 위로 슬라이드업, 재탭/X로 닫으면 미리보기 풀화면
- `@media`로 PC와 완전 분리. PC 레이아웃 영향 없게.
- 바텀시트 적용 후 재평가 대상(보류 중): 액자 사이즈 드롭다운 UX / 프레임 보이기 영역 UI 정리 / 색상 선택 UI 정리
