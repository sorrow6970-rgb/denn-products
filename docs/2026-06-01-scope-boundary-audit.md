# 운영자↔소비자 쓰기 경계 감사 (2a/2b 이후) — 3단계 보류 결정 대비

> 작성: 2026-06-01. 3단계(운영자 도구 별도 파일)를 **보류**(렌더 공유 비용 과다)하고, 대신
> 현 `?adminRoomSetup` 모드에서 **operator/consumer 쓰기 scope 경계가 빈틈없는지** 감사. 결론 = **경계 airtight**(코드 변경 불필요).

---

## 0. 결론 (TL;DR)
- **불변식 I1/I2(목업툴은 operator에 안 씀 / 운영자는 user에 안 씀)는 현재 코드에서 지켜짐.** 라이브 위반 0.
- 모든 소비자 쓰기는 `scopedKeyV2` 경유 → `user:`/`default-room`/`uploaded-room` 키. operator 키(②/마커 `<bgId>`)는 운영자 경로(`markSavedAdminPreset` + admin 모드 scopedKeyV2 passthrough)에서만.
- 과거 유일한 cross-scope writer(어드민 가이드스케일 sync, COMMON_KEY 직접 씀)는 **dead code**(L12493 `return;`로 비활성).
- 잔여 = 정확성 무관한 **latent/청결 항목 2개**(§3) — 4단계에서 처리.

---

## 1. 라이브 쓰기 경로 전수 (roomBackgroundSettings[...]=)

| 경로 | 위치 | 키 결정 | scope 판정 |
|---|---|---|---|
| `saveSettingsV33`(구) | L2935 | `scopedKeyV2(bgKey())` | ✓ (실제 전역은 V48로 재할당, 아래) |
| `loadSettingsV33` 기본 시드 | L2927 | `scopedKeyV2(bgKey())` | ✓ 읽기측 시드 |
| `setUploadedDefaults` | L2993 | 인자 key(=upload 흐름) | ✓ uploaded/direct(예약 user) |
| 업로드 배경 기록 | L3746 | `setupUploadKey||'direct-room-upload'` | ✓ 운영자=operator키 / 소비자=direct(user) |
| **`markSavedAdminPreset`** | L4667/4696 | `currentBgKey()`(4514, admin=setupKey) | ✓ operator 키 + 마커. `default-room` 차단(2b) |
| **`saveCurrentRoomKeyV48`** | L5115 | `scopedKeyV2(currentBgKeyV48())` L5107 | ✓ **실제 전역 saveSettingsV33/saveRoomBackgroundSettings** |
| `applyCommonToGuideIndex`(V79) | L8125 | `scopedKeyV2(raw)` | ✓ 상속 시드 → user: 키(2a) |
| B1 v82 상속 | L12889 | `'default-room'` | ✓ user.default |
| migrate-2b | L13045 | `user:`+이동 / tombstone | ✓ |
| ~~어드민 스케일 sync~~ | L12511/12545 | `__denn_room_common_default__` | **DEAD**(L12493 return) |

### 결정적 사실
- **L5418 `window.saveSettingsV33 = window.saveRoomBackgroundSettings`** → 전역 저장은 `saveCurrentRoomKeyV48`(L5105) 경유. 그 안 L5107 `if(window.scopedKeyV2)key=scopedKeyV2(key)` → **모든 소비자 자동저장이 user 키로 라우팅**. 구 L2932 본체는 셰도잉됨.
- 운영자 마커 `=true`는 **L4661/4662(markSavedAdminPreset) 단 하나**(2b 감사서 확인). consumer 경로에서 operator 마커/②를 쓰는 라이브 코드 없음.

---

## 2. dead code 확인
`denn-admin-guide-scale-sync` IIFE(L~12490~): 함수 본문 첫 줄 **L12493 `return;`** → `purgeStored`/`syncIndexedDB`(COMMON_KEY·default-room 강제 덮어쓰기) 전부 **도달 불가**. 주석: "강제 덮어쓰기 제거(스냅백/캡처클리어 원인), syncIIFE_alive:false". → 과거 cross-scope 오염원이 이미 무력화됨. **4단계에서 블록 자체 삭제 권장**(현재는 무해).

---

## 3. Latent / 청결 항목 (정확성 무관 — 4단계 처리)

### (L1) operator 키의 마커 비일관
- 운영자 모드 자동저장(`saveCurrentRoomKeyV48`)은 operator 키를 **마커 없이** 씀. 마커는 명시적 "관리자 저장"(`markSavedAdminPreset`)에서만 추가.
- `roomSavePaused()`(L5355)는 **시간창(1400ms) 일시정지**일 뿐, 운영자 모드 자동저장을 영구 차단하지 않음 → 마커 없는 operator 키가 실제로 생길 수 있음.
- **영향**: 2b 마이그레이션은 "마커 없는 `<bgId>` = 소비자 오염 → user:로 이동·tombstone"으로 분류. 현재는 rev2 done이라 **재실행 안 함 → 안전**. 단 **미래에 migration REV를 올리면** 마커 없는 *정상 운영자 자동저장* 키를 오분류해 user:로 옮길 위험.
- **권장(4단계)**: 운영자 자동저장도 operator 키에 `__adminPreset` 부여(또는 scope를 마커 아닌 위치로만 판정 — 3단계 도구 분리 시 자연 해소). migration REV 올릴 땐 이 점 반드시 고려.

### (L2) dead sync 블록 잔존
- §2의 비활성 IIFE + `uiSettings.roomInitialGuideScale`(①) 흔적. 4단계 "비활성 IIFE 시체 삭제"(계약 §9) 대상.

### (비위반) uploaded/direct 경로
- `setUploadedDefaults`/L3746은 raw key를 쓰지만 키가 `uploaded-room`/`direct-room-upload`(scopedKeyV2 예약 passthrough, user 영역) 또는 admin 모드 operator 키 → scope 정합. 위반 아님.

---

## 4. 권고
- **코드 변경 없음.** 경계는 2a/2b로 이미 airtight.
- 3단계(별도 파일)는 보류 유지 — 오염은 해결됐고 렌더 공유 비용이 과다(별도 탐색서: rmRender/sgDraw/RM/SG/룸모달 ~1500-2000줄 복제 필요).
- 다음 후보 = **4단계 일부 저위험 청결 작업**: dead sync 블록 삭제, operator 마커 일관화(L1), `?adminRoomSetup` 중복 판별 함수 정리. 단 각각 독립 커밋 + 검증.
- 참조: docs/2026-05-31-room-settings-schema-contract.md(I1~I6), docs/2026-06-01-cutover-phase2b-design.md.
