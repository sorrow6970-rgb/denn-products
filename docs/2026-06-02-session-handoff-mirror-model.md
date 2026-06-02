# 2026-06-02 세션 핸드오프 — 운영자 디폴트 "미러 모델" 완성

> 목표였던 것: 소비자 목업툴(내 공간 보기)이 운영자가 지정한 디폴트값을 **모든 컨텍스트에서 일관되게, 절대 안 틀어지게** 따라오기.
> 결과: **세 컨텍스트(기본화면·촬영배경·가이드배경) 전부 "운영자 디폴트 = 항상 기준" 단일 미러 원칙으로 완성·검증·푸시.**

---

## 0. 복원
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -10   # f3b0da0 가 HEAD
```

## 1. 최종 아키텍처 (미러 모델) — 핵심
**소비자는 자기 설정을 영구 보관하지 않는다. 컨텍스트별 운영자 디폴트를 매 로드마다 미러한다.** 단일 진입점 = `loadSettingsV33`(denn-mockup-tool.html L2953).

```
loadSettingsV33 미러 분기(운영자 모드 dennIsAdminSetupV() 제외):
  RM.roomImg 있음(촬영배경)        → ② (__denn_room_common_default__)   [키 변종 무관: direct-room-upload/uploaded-room/user:* 다 잡음]
  key === 'default-room'(기본화면) → ②
  key 'user:<bgId>'(가이드배경)    → 그 배경 운영자 프리셋 <bgId> (없으면 ② 폴백)
  → clone 후 SIZE_KEYS만 기존 보존(주문 사이즈-first), 마커 정리, st[key]에 주입
```
- **"기본설정으로"** 버튼: 실제 핸들러는 `rebindMasterReset`의 `newBtn.onclick`(L12683, **cloneNode로 버튼 교체**하므로 restructure의 addEventListener 수정은 무효 — 반드시 여기 분기). 컨텍스트별: 기본화면=`dennApplyCommonToDefaultRoomV82`, 촬영=`dennApplyCommonToUploadedRoomV82`, 가이드=재로드(미러). 전부 결국 loadSettingsV33 미러로 귀결.
- **새로고침/재진입/배경취소/업로드** = 전부 미러 → 운영자 디폴트. **왕복 유지(세션 조정 보존)는 의도적 포기**(절대 안 틀어지는 쪽 우선).

## 2. 기반 (이 위에 미러가 섬)
- **__opRev 단조 리비전 단일 진실**(5995e8a): 운영자 키 저장마다 +1, mergeAdminStates 룸키별 max-rev 승, LS clobber guard. 전수 덤프로 **LS=IDB=MEM 완전 일치** 확인. 멀티스토어 꼬임 종결. → [[project_storage_single_source]]
- **frameTiltDeg 필드**(5995e8a): 회전 각도가 ②/프리셋 스키마에 저장·적용(currentSettingsV33/V48 + applySettingsV33/applyRoomSettings + defaults). 이전엔 회전이 아예 저장 안 됐음.
- **기울기 토글 강제 OFF 제거**(7e5f63f): denn-v95 모달블록이 150/600/1500ms에 rm-tilt-tog 'on' 제거하던 것 삭제.
- **가이드 오버레이 위치 즉시 동기화**(afe7c1a): sg-canvas(절대위치 오버레이)가 액자에 늦게 붙어 "분리"되던 것 → dennSyncGuideOverlayGeomV(rAF, resize/오픈 추적).

## 3. 이번 세션 커밋 (origin/main)
| 커밋 | 내용 |
|---|---|
| 5995e8a | 기반: __opRev 단일진실 + frameTiltDeg 영속 |
| 7e5f63f | 기울기 토글 강제 OFF 제거 |
| afe7c1a | 가이드 오버레이 위치 즉시 동기화 |
| f544f86 | 단계3 강제전파(default-room→②, 플래그/150ms) — **아래 미러로 대체됨** |
| 225148d | **default-room = ② 미러로 단순화** (플래그/buildSeed/타이밍 제거) |
| 18a2049 | 촬영배경 "기본설정으로" → ② |
| f3b0da0 | **가이드배경·촬영배경도 미러로 통일** (RM.roomImg 감지) |

## 4. 진단/함정 (재발 방지)
- **"①/② 분열" 반복**: 기준 스케일이 ②.guideScale이 아니라 옛 글로벌 `uiSettings.roomInitialGuideScale`(①)을 무는 경로가 여럿. 이번에 잡은 곳: v78 guide-clear-stability `uiGuideScale`(L6799, ② 우선으로 수정), stableUploadDefaults(촬영 미러로 우회). **새 스케일 버그 나오면 roomInitialGuideScale 읽는 다른 경로 의심.**
- **업로드 키 변종**: 사진 업로드 시 RM.bgId='direct-room-upload' → bgKey/scopedKeyV2가 'user:direct-room-upload' 생성. 키 문자열 매칭하지 말고 **RM.roomImg로 촬영배경 감지**.
- **리셋 버튼 cloneNode**: rebindMasterReset(L12662)가 버튼을 cloneNode로 갈아끼움 → restructure(L12381) addEventListener 수정 무효.
- **저장 경로 다중**: persist(LS)/writeAdminV48(LS+IDB)/persistAdmin/persistMemory(메모리만). 미러는 loadSettingsV33의 persist(LS) 경유. 운영자 모드(adminRoomSetup)는 미러 전부 제외.

## 5. 미완/후속 (deferred)
1. **세션 중 "액자설정↔내공간보기" 왕복 시 조정값 유지** — 안정성 위해 의도적 포기. 살리려면 "컨텍스트 진입(select/clear/upload/refresh)에서만 미러, 단순 모달 재오픈은 보존" 구분 필요(이전 플래그 방식이 레이스로 깨졌으니 주의).
2. **코드 청소**: 미러 전환 후 dead code — B1 buildSeed/usefulCommon(미러가 대체), 단계3 잔재(__dennDefaultRoomFreshSeededV82 미사용), V79 applyCommonToGuideIndex(미러가 상위). 동작엔 무해하나 정리 권장.
3. **누적 테스트 cruft**: 소비자 user:*/default-room/uploaded-room 등은 콘솔로 1회 정리했음(운영자 ②/gb* 프리셋 보존). 운영 배포 전 깨끗한 상태에서 재검증 권장.

## 6. 보호/불변
- **renderFrame/zeRender/renderCase/fbExport·V363·Phase C 무수정**(I5/I6). 액자 미세여백은 renderFrame 소관 — 손대지 말 것.
- 운영자 편집기(?adminRoomSetup=...)는 모든 미러/리셋 분기에서 제외(dennIsAdminSetupV/isAdmin 가드). 운영자 ② 편집 동작 불변.

## 7. 참조
- 설계: docs/2026-06-02-storage-single-source-design.md (__opRev 기반)
- 메모리: [[project_storage_single_source]], [[project_operator_default_propagation]]
- 직전 핸드오프: docs/2026-06-01-session-handoff-operator-default.md (단계1·2, 미러 이전 맥락)
