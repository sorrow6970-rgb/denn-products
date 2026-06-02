# 운영자 디폴트(②) → 소비자 초기화면(default-room) 반영 — 정밀 설계

> 작성: 2026-06-01. 목표 = "운영자가 공통 편집기에서 강하게 잡은 디폴트(②)를 소비자 목업툴이 읽어옴".
> 즉석 패치로 2번 깨진 뒤(desync, 스냅백) 3갈래 정밀 조사 → 근본 원인 3개 확정. **단계별 독립 적용 + 즉시 검증.**

---

## 0. 증상 ↔ 근본 원인 (3개, file:line 확정)

| # | 증상 | 근본 원인 | 위치 |
|---|---|---|---|
| **R1** | 강제 전파 시 **액자/가이드 분리(desync)** | default-room은 `loadSettingsV33`→`applySettingsV33`(V33)로 로드되는데, **RM.pos를 `s.frameX`로만 읽음**(L2923). 그런데 ②는 위치를 **`frameCenterX`**로 저장. → frameX 없음 → RM.pos=기본(50/40), 가이드 슬라이더는 `guideX` → **프레임≠가이드** | 로드 L2923(applySettingsV33) vs 저장 L4691/L5034(frameCenterX/guideX) |
| **R2** | "기본설정으로" → **82.5(①)**, ②(90) 아님 | 리셋 최종(v92b sgReset L8039)→`baseline`→`sourceFromStore`→`pickGuide`. default-room은 B1 `buildSeed`가 **`__guideResetDefaults` 스냅샷을 삭제**(L12765) → pickGuide 폴백 `uiDefault()`(L7938)가 **① `roomInitialGuideScale`** 읽음 | uiDefault L7938 / buildSeed L12765 |
| **R3** | 운영자 ² 저장이 **조정한 소비자에 안 흘러감** | B1 `isUntouched`(L12748)가 **`__dennUserMovedFrame`**(소비자 드래그, 영구 저장 L12797) 있으면 false → ② 재상속 차단(B2-다 보존 정책) | isUntouched L12752 |

> 정상 경로 확인: B1은 ② 변경을 **재상속할 수 있음**(`__dennCommonInheritV82` 마커면 isUntouched=true). 막는 건 오직 (a) 드래그 흔적 (b) 위치 필드 불일치(R1)로 인한 desync.

---

## 1. 설계 원칙
- **초기화면(default-room)만 운영자 강제.** uploaded-room(자기 사진)은 `isDefaultRoomNow()`(L12741, RM.roomImg 있으면 false)로 제외 → 무영향.
- 위치는 **`frameCenterX/Y`를 단일 기준**으로(계약 D2). 로드/리셋/시드 모두 frameCenterX 우선.
- 단계별 독립 커밋 + 검증. R1(desync)부터 — 이게 풀려야 R3(강제 전파)이 안전.

---

## 2. 단계별 수정안

### 단계 1 — R1: applySettingsV33 위치 읽기 견고화 (desync 차단)
`applySettingsV33`(L2923)의 RM.pos 읽기를 `applyRoomSettings`(L4993)와 동일하게:
```
// 현재: RM.pos.x=clamp(s.frameX,...)/100
// 변경: cx = s.frameCenterX != null ? s.frameCenterX : (s.guideCenterX != null ? s.guideCenterX : s.frameX)
//       RM.pos.x = clamp(num(cx,50),0,100)/100  (y 동일, 기본 40)
```
- 효과: default-room이 ²의 `frameCenterX`를 읽어 **프레임이 ²위치로** → 가이드와 정렬.
- 가이드 슬라이더(`sg-ox-r`)도 frameCenter와 맞추기 위해, 로드 직후 정렬 보장(기존 `syncInitialGuideFrame`/`alignGuideToFrame` 호출 경로 확인 후 필요 시 1회 호출).
- **위험**: 본체 함수. 단 frameCenterX 없으면 frameX 폴백이라 기존 동작 보존. 소비자/운영자 공용 로드라 회귀 검증 필수.

### 단계 2 — R2: 리셋이 ②를 읽도록 (uiDefault 통합)
`uiDefault()`(v92b, L7938)가 ① 대신 **②(`__denn_room_common_default__`)** 를 읽도록:
```
// 현재: guideScale: clamp(uiSettings.roomInitialGuideScale), frameCenterX:50, frameCenterY:40
// 변경: var c = roomRead('operator','default') || rs['__denn_room_common_default__'];
//       guideScale: isFinite(c.guideScale)? c.guideScale : ①폴백
//       frameCenterX: isFinite(c.frameCenterX)? c.frameCenterX : 50  (y 40)
//       guideX/Y/guideOpacity/showRuler도 ② 우선
```
- 추가: v81 `baseDefaults`(L7333)도 동일하게 ② 우선(리셋 권한 다층 방어).
- 효과: default-room "기본설정으로" → ②의 스케일·위치. (스냅샷 없는 default-room이 폴백으로 uiDefault 타므로 한 점 수정으로 해결)
- **위험**: 낮음. 폴백 경로만 ②로. guide-bg는 자기 `__guideResetDefaults` 스냅샷 우선이라 무영향.

### 단계 3 — R3: 새 창/강제 새로고침 시 운영자 강제 (operator-strong)
B1 `applyCommonToDefaultRoom`(L12776): **페이지 로드 후 첫 적용은 `isUntouched` 무시하고 ② 강제 재상속**.
```
var forceFresh = !window.__dennDefaultRoomFreshSeededV82;
if(!forceFresh && !isUntouched(prev,common)) return;
window.__dennDefaultRoomFreshSeededV82 = true;
rs['default-room'] = buildSeed(common, prev);
```
- 단, **단계 1(R1) 적용 후**에만 — 안 그러면 desync 재발(지난 실패 원인).
- 세션 중 조정은 보존(첫 적용 후 forceFresh=false). 새 창/F5마다 ②로 시작.
- **위험**: 중. 단계 1 검증 통과가 전제. 미통과 시 보류.

---

## 3. 검증 (단계별)
- **단계 1**: ²에 frameCenterX≠50 저장 → 소비자 초기화면 진입 → **액자+가이드 같은 위치**(분리 없음). 콘솔: RM.pos.x*100 ≈ ②.frameCenterX.
- **단계 2**: 소비자 스케일 조정 → "기본설정으로" → **②의 스케일·위치**(82.5 아님, desync 없음).
- **단계 3**: 소비자 드래그 → **F5 강제 새로고침** → 초기화면이 **②로 복귀**(액자/가이드 정렬). 세션 중 재조정은 보존. uploaded-room은 불변.
- 각 단계 검증 verifier는 구현 시 콘솔 5원칙으로 제공.

## 4. 롤백
- 단계별 독립. 단계 1 = applySettingsV33 원복. 단계 2 = uiDefault/baseDefaults 원복. 단계 3 = forceFresh 줄 제거.
- 직전 안전점: `83f17a6`(편집기 fix).

## 5. 참조
- 위치 다중표현: applySettingsV33(L2896/2923) vs applyRoomSettings(L4967/4993) vs markSavedAdminPreset(L4684) vs currentRoomSettingsV48(L5005).
- B1: denn-room-common-inherit-v82(L12717~). 리셋: v92b(L7863~, sgReset L8039, uiDefault L7938).
- 계약 D2(위치 frameCenter 통합), B2-다(조정 보존 — default-room 초기화면에 한해 operator-strong로 완화).
