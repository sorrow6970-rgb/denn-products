# 2026-06-01 세션 핸드오프 — 운영자 디폴트 전파 (기반 정리 필요)

> 목표였던 것: "운영자가 공통 편집기에서 강하게 잡은 룸 디폴트(②)를 소비자 목업툴이 새로고침 시 그대로 읽어오고, 리셋도 ²로 복귀."
> 결과: **단계1·2는 완료(커밋·푸시).** 단계3(강제전파)+설정 persistence는 **깊은 기반 문제**로 보류 — 즉석 패치로 계속 새 층이 터짐. **다음 세션 = 기반 먼저(foundation-first).**

---

## 0. 복원
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -8     # d45dc8e 가 HEAD (단계1·2 + 단계3 revert)
```

## 1. 완료(커밋·푸시됨)
| 커밋 | 내용 | 위치 |
|---|---|---|
| `83f17a6` | **운영자 편집기**가 ②(__denn_room_common_default__) 정상 읽기/표시 (RM.bgId를 adminRoomSetup 키로 고정 + bgKey 보강) | openRoomMockup L3793, bgKey L2836 |
| `148d4ce` | **단계1**: applySettingsV33이 `frameCenterX→guideCenterX→frameX` 우선 읽어 액자/가이드 desync 기본 차단 | applySettingsV33 L2923 |
| `4ef50c8` | **단계2**: "기본설정으로" 리셋이 옛 ①(roomInitialGuideScale) 대신 **②** 읽도록 (default-room 전용 컨텍스트) | v92b baseline() L7970 |
| `6039127`→`d45dc8e` | 단계3(forceFresh 강제전파) 적용 후 **revert**(드래그+재진입 desync 노출) | applyCommonToDefaultRoom L12786 |

**검증된 성과**: 편집기 ② 표시 정상 / 액자·가이드 분리 없음 / "기본설정으로"→②(90) 복귀.

## 2. 미완(보류) — 깊은 기반 문제
- **단계3 운영자 강제전파(새 창/새로고침→②)**: 두 방식 다 실패. ①forceFresh(모달-오픈 재시드)=desync+flicker. ②freshSeed(모달 열기 직전 동기 시드)=refresh→90은 됐으나 **②가 durable하지 않아** 무의미 + 잔여 flicker.
- **운영자 설정(기울기/그림자/햇빛 등) persistence**: 운영자가 ON 저장→새로고침→OFF. **상속·apply는 정상**(defroom이 ²를 정확히 따라옴, 데이터로 증명). 문제는 ②가 안 남음.

## 3. 근본 원인 (7가지, 이번 세션 진단)
1. **멀티스토어 불일치(핵심)**: `LS ②tilt=false / IDB ②tilt=true`로 갈라짐. `mergeAdminStates(idb, local)`(L4448)가 `scoreAdmin` 높은 store(보통 키 많은 localStorage)를 primary로 골라 **stale LS의 ²를 선택** → 새로고침 시 운영자 설정 사라짐. `loadAdminFresh`(L4494)가 그 머지결과를 다시 persistAdmin → **피드백 루프**.
2. **멀티탭 클로버**: 소비자 탭이 전체 ADM blob(stale ² 포함)을 저장(writeAdminV48 L5082 / persist L2833)하며 운영자 ²를 덮음. 컷오버가 "키 분리"는 했으나 "전체 blob 저장"은 안 막음(계약 phase4 "Storage 가로채기").
3. **위치 다중표현**: frameX/frameCenterX/guideX/guideCenterX/frameLeft 혼재. applySettingsV33(V33, L2923)은 frameX, applyRoomSettings(V48, L4993)는 frameCenterX 등 **로드 경로마다 읽는 필드 다름** → desync. (단계1로 V33만 보강, 통합은 미완)
4. **①/② 분열**: roomInitialGuideScale(①)이 옛 잔재로 여러 곳에서 읽힘. 단계2로 리셋만 ²로 돌림. 통합 미완.
5. **4겹 reset 권한**: sgReset = v73/v81/v90/v92b 래핑. baseline→sourceFromStore→pickGuide(`__guideResetDefaults` 스냅샷 우선)→uiDefault(①). (단계2는 v92b baseline 한 점만 고침)
6. **액자/가이드 크기 미세여백(우/하)**: 크기는 일치(내 size fix가 no-op). 여백은 **frameSnap=프레임캔버스 복사(L1679)=`renderFrame` 출력물 내부**. **renderFrame은 보호영역(무수정)** — 실제 주문 출력물. 손대지 말 것.
7. **모달 오픈 다중 setTimeout 재적용 flicker**: loadSettingsV33(120ms)→syncInitialGuideFrame(여러 delay)→applyCommonToDefaultRoom(600ms). 값이 잠깐 흔들리다 자리잡음.

## 4. 다음 세션 — 기반 먼저(권장 순서)
**application 패치(전파/리셋)는 기반이 안정돼야 버팀.** 순서:
1. **Storage 일관성**: ②/운영자-preset 키의 **단일 진실** 확립. 후보 — 머지에서 운영자 키는 IDB(a) 우선(`mergeAdminStates` L4463 근처에 시도했었음, 단독으론 부족했음 → loadAdminFresh persist 루프까지 봐야), + 소비자 persist가 운영자 키 보존(clobber guard), + persist 경로(L2833 포함) 전수.
2. **위치 통합(D2)**: frameCenterX/Y 하나로. applySettingsV33↔applyRoomSettings 읽기 필드 일치 + 가이드 슬라이더(sg-ox-r)도 동일 기준.
3. 그 위에 **단계3 강제전파 재시도**(freshSeed = 모달 열기 직전 동기 시드, openRoomMockup wrapOpen에서. 단계1+위치통합 후엔 desync 없음) + **flicker 제거**(재시드를 loadSettingsV33 전에).

### 이번에 시도했다 되돌린 것(참고, 재사용 가능)
- `freshSeedDefaultRoomV82`: openRoomMockup(wrapOpen) 안 동기 호출, 페이지로드당 1회 플래그, `requestSaveSettingsV33` 호출 금지(빈 모달 UI 덮음). refresh→② 됐으나 ² durability에 막힘.
- writeAdminV48 clobber guard: 비-admin 저장 시 ②/preset를 최신 LS에서 보존. (admin은 그대로 씀)
- mergeAdminStates 운영자키 IDB-우선. (단독 부족 — persist 피드백 루프 동반 처리 필요)

## 5. 보호/불변
- **renderFrame/zeRender/renderCase/fbExport·V363·Phase C 무수정**(I5/I6). 미세여백은 renderFrame 소관 = 건드리지 말 것.
- 멀티탭 클로버는 **같은 브라우저 2탭 테스트 전용** 현상 — 실제 운영(운영자/소비자 다른 기기)엔 없음. 단 테스트가 계속 막히니 기반 정리에 포함 권장.
- 검증: 단일 탭으로 격리 + LS/IDB 양쪽 값 확인(이번 세션 진단 verifier 재사용).

## 6. 참조
- 설계: docs/2026-06-01-operator-default-propagation-design.md (R1/R2/R3 + 위치 다중표현 정밀 매핑)
- 계약: docs/2026-05-31-room-settings-schema-contract.md (D2 위치통합, I1~I6, "Storage 가로채기"·"위치 다중표현" 정리 대상)
- 컷오버: docs/2026-06-01-session-handoff-cutover-close.md, docs/2026-06-01-cutover-phase2b-design.md
