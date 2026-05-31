# 룸 설정 데이터 스키마 계약 (v1.0)

> 작성: 2026-05-31. 목적 = **목업툴(소비자)** ↔ **운영자 디폴트 도구(신규 리빌드)** 사이의 데이터 인터페이스를 못 박아,
> 가이드 배경 양방향 오염 / 저장 3중 경로 / 위치 다중 표현 등 누적 찌꺼기를 단일 모델로 접는다.
> **이 문서는 계약(contract)이다. 코드 변경 전 합의 확정본.** 결정 D1~D5는 §12에 확정 기록.
>
> **v1.0 확정사항(D1~D5)**: D1=중첩객체 / D2=가이드오프셋 액자위치로 통합 / D3=운영자도구 별도파일 / D4=uploaded-room 범위 밖(사용자 영역) / D5=user 키 lazy 상속.

---

## 1. 왜 (배경)

현 구조의 근본 문제 = **운영자가 소비자용 목업툴을 `?adminRoomSetup` 모드로 띄워 디폴트를 저장**한다.
→ 운영자/사용자가 **같은 키·같은 저장 경로**를 공유 → 양방향 오염, isAdmin 땜빵, pause/Storage 가로채기.

해법 = **역할별 키 분리(스키마) + 도구 분리.**
- 목업툴 = 사용자 키만 쓰고, 운영자 키는 **읽기 전용 상속 소스**.
- 운영자 도구(신규) = 운영자 키만 쓴다.

---

## 2. 현 데이터 모델 (정리 대상 = 찌꺼기 실태)

저장소: `localStorage.denn_admin` + `IndexedDB denn_shared_db/kv/denn_admin_state` (읽기 = IDB-primary 머지, `loadAdminFresh`+`scoreAdmin`).

`A.roomBackgroundSettings` (flat map):

| 키 | 역할(현재) | 문제 |
|---|---|---|
| `__denn_room_common_default__` (②) | 운영자 공통 디폴트 | 운영자 전용이나 키만으로 역할 구분 없음 |
| `default-room` | 사용자 기본화면 | ②에서 상속(V82 B1) |
| `<bgId>` (가이드 배경별) | **운영자+사용자 공유** | ⚠️ 단일 키 → 양방향 오염 |
| `uploaded-room` | 업로드 배경 | (이번 범위 밖) |

`A.uiSettings.roomInitialGuideScale` (①) — 가이드 배율 숫자 하나. **폐기 방향**(세션1에서 강제덮기 중단).

찌꺼기 목록(세션 진단):
1. `bgKey` 9개 중복 정의 (전역 덮어쓰기)
2. 위치 다중 표현: `frameX/Y` · `frameCenterX/Y` · `guideX/Y` · `guideCenterX/Y` · `frameLeft/Top`
3. 저장 3중 경로: `saveSettingsV33` / `saveCurrentRoomKeyV48` / `markSavedAdminPreset`
4. `Storage.prototype.setItem` 가로채기 + pause + 스냅샷 revert
5. 비활성 IIFE 시체 (`denn-admin-guide-scale-sync`)
6. 상속 3종: V79 `applyCommonToGuideIndex` / V82 B1 / `denn-room-reset-fix`
7. 키 난립 + IDB-primary 머지 `scoreAdmin`(신선도 무시)
8. 가이드 배경 운영자/사용자 미분리
9. **`adminRoomSetup` URL 분기 20+곳 산재**(정독 결과):
   - 어드민 모드 판별 함수 **중복**: `isAdminRoomSetupV48`(L4997) / `isAdminRoomSetupMarkerV51`(L3545) / `isAdminRoomSetupUploadV33`(L3641) / `active()` 3중복(L8146/8176/8219) / 각 wrap 로컬 `isAdmin`·`qSetup`·`setupKey`(L3008/4515/4580/4725/4788/4990/6759/7284/7763/7882/8341 등)
   - **키 분기**: `currentBgKey`(L4515)·`currentBgKeyV48`(L4990)에서 `?adminRoomSetup` 있으면 그 값을 저장 키로 반환 → 운영자가 소비자 목업툴 키 공간에 직접 씀(오염 구조의 핵심 진입점)
   - **부트 분기**: L15 `denn-admin-room-boot` 클래스 토글 (`adminRoomSetup`/`roomOnly`)

### ⚠️ 스키마 범위 밖 (무수정 보호 경계 — 정독으로 확정)
아래는 **룸 설정 데이터와 무관**하며 이 스키마 작업이 **건드리면 안 되는** 영역:
- **V363** = `DENNFrameTemplateParityV363` / `DENNFrameDynamicTextsV363` / `denn-v363-*` (L1520/2152/9487~9698) — **프레임 텍스트 필드(main/name/date/sub + 동적 문구)** 처리. 룸 배경/위치/그림자와 무관.
- **Phase C** = `__dennPhaseCImageAllows` / `__dennPhaseCCustomerColor` / `drawImage` 래핑·캔버스 캐시 (L6429/7216/10556~10803) — **고객측 이미지 색조(tint)/색상 + 렌더 캐시**. 보호영역(renderFrame) 인접. 룸 설정과 무관.
- 위 둘은 §10 불변식 I5(보호영역 무수정)의 연장. 마이그레이션/리빌드 대상 아님.

---

## 3. 새 스키마 (제안)

`A.roomSettings` 신설 (중첩, 역할 명시):

```
A.roomSettings = {
  operator: {                 // 운영자 도구만 씀. 목업툴은 읽기 전용.
    default: { ...preset },    // = 구 ② (__denn_room_common_default__), A4 기준
    "<bgId>": { ...preset }    // 가이드 배경별 운영자 디폴트
  },
  user: {                     // 목업툴(소비자)만 씀.
    default: { ...preset },    // = 구 default-room
    "<bgId>": { ...preset }    // 가이드 배경별 사용자 조정값
  },
  __schemaVersion: 1
}
```

- **scope** = `operator` | `user`. **key** = `default` | `<bgId>`.
- 구 flat `roomBackgroundSettings`는 마이그레이션 후 **읽기 호환만 유지**(쓰기 중단), 다음 단계서 제거.

### preset 단일 형상 (위치/표시 필드)

| 필드 | 의미 | 단위 |
|---|---|---|
| `frameCenterX`, `frameCenterY` | **액자 중심 위치(단일 진실)** | 0~100 % |
| `guideScale` | 가이드/액자 배율 | 1.0=100% |
| `guideOpacity` | 가이드 투명도 | 0~1 |
| `frameTiltEnabled` | 기울기 | bool |
| `framePerspectiveX/Y` | 원근 | 숫자 |
| `shadow*` | 그림자(Enabled/Opacity/Blur/Direction/Distance) | 기존 의미 |
| `sunlight*` | 햇빛(Enabled/Opacity/Angle/Spread/Warm/Rays/RayThickness/X/Y) | 기존 의미 |
| `showRuler` | 눈금 | bool |

> **위치 단일화(D2 확정=통합)**: 구 `frameX/frameCenterX/guideX/guideCenterX/frameLeft`를 모두 `frameCenterX/Y` 하나로 접는다.
> 진단(검증 ①)에서 위치 키들이 같이 움직임을 확인 → 가이드선 별도 오프셋(`guideOffsetX/Y`)은 **두지 않음.**
> 로드 시 `frameCenterX/Y` → `RM.pos`; 파생값(frameLeft 등)은 렌더에서 계산, **저장 안 함**.

### 사이즈 = 절대 상속 안 함 (C 정책)
`defaultSizeId/sizeId/frameSizeId/primarySizeId/adminGuideSize*/guideSize*/runtimeGuideSize*`
→ **preset에 미포함.** 사이즈는 **주문 사이즈**가 런타임에 주입. operator→user 상속 대상 아님.

---

## 4. 저장/로드 계약

### 단일 키 해석
```
resolveScope() = isOperatorTool() ? 'operator' : 'user'
resolveKey()   = 현재 가이드배경 bgId || 'default'
```
- `bgKey` 9중복 → **단일 `bgKey(bg,i)` 하나로** 통일.

### 쓰기
- **목업툴**: `roomSettings.user[key] = current()` 만. operator 절대 안 씀.
- **운영자 도구**: `roomSettings.operator[key] = current()` 만. user 절대 안 씀.
- 단일 저장 함수 1개(scope 인자). `saveSettingsV33`/`saveCurrentRoomKeyV48`/`markSavedAdminPreset` 3중 → 1개로.
- **pause/Storage 가로채기 제거**: 도구 분리로 동시 쓰기 경쟁이 사라져 불필요.

### 읽기 (목업툴)
```
load(key):
  u = roomSettings.user[key]
  if (u && !u.__pristine) return u            // 사용자 조정값 우선(보존)
  op = roomSettings.operator[key] || roomSettings.operator.default
  seed = clone(op); strip 사이즈; mark __inheritedFrom=key
  roomSettings.user[key] = seed; return seed   // 상속 1회
```
- **default-room** = `user.default` ← `operator.default`(②) 상속. (= 현 B1 9636c80 동작을 스키마로 일반화)
- **가이드 배경 선택** = `user.<bgId>` ← `operator.<bgId>` 상속. (= 현 V79를 스키마로)
- 사용자 드래그/조정 → `user.<key>`만 변경. **operator 불변 = 오염 원천 제거.**

### "기본설정" 버튼 (B3)
```
reset(key): roomSettings.user[key] = inherit(operator[key]); 모든 필드 일괄(토글/그림자/햇빛/위치)
```
- 현재 배경의 **운영자 디폴트로 초기화**, 사용자 흔적 제거.

---

## 5. 상속 마커 (단일화)

| 마커 | 의미 |
|---|---|
| `__inheritedFrom` | 이 user 프리셋이 operator에서 상속됨(어느 key) |
| `__userTouched` | 사용자가 조정함 → 보존(상속 안 함). (현 `__dennUserMovedFrame` 일반화) |

- 구 마커(`__adminPreset`,`__savedFromAdminRoomSetup`,`__dennInheritedCommonDefault`,`__dennCommonInheritV82`,`__guideResetDefaults`) → 새 2종으로 수렴.
- 운영자 여부는 **scope 위치**로 판단(마커 불필요).

---

## 6. 마이그레이션 맵 (1회, `__schemaVersion` 가드)

| 구 (flat `roomBackgroundSettings`) | 신 (`roomSettings`) |
|---|---|
| `__denn_room_common_default__` | `operator.default` |
| `default-room` | `user.default` (+ `__inheritedFrom:'default'` 유지) |
| `<bgId>` with `__adminPreset` | `operator.<bgId>` **만**(D5 lazy: user.<bgId>는 사용자 첫 진입 때 상속 생성) |
| `<bgId>` without preset (사용자값) | `user.<bgId>` |
| `uiSettings.roomInitialGuideScale` (①) | `operator.default.guideScale`로 흡수 후 폐기 |
| 위치 다중 키 | `frameCenterX/Y`로 정규화(우선순위: frameCenterX→guideCenterX→frameX) |

- 사이즈 키는 마이그레이션에서 **제외(주입 방식)**.
- 마이그레이션은 **localStorage+IDB 양쪽**에 1회 기록, 이후 구 키 읽기만 호환.

---

## 7. 도구 분리 형태

- **운영자 도구 = 별도 파일** 권장 (예 `denn-room-default-tool.html`).
  - 같은 목업툴 내 `?adminRoomSetup` 모드로 두면 분리 이점(저장 경로/메모리 격리) 반감.
  - 운영자 도구는 `roomSettings.operator`만 생산. 렌더는 목업툴과 공유 가능(읽기 전용).
- 보호영역(`zeRender/renderFrame/renderCase/fbExport/sendKakao/openZoneEditor`) **무수정** — 렌더는 resolved preset을 입력으로 받기만. 스키마는 그 앞단.

---

## 8. 단계적 컷오버 / 롤백

1. **스키마 합의(이 문서 확정).**
2. **9636c80 검증/push** — default-room 완결분(스키마 무관 안전판).
3. 목업툴: `roomSettings` 신설 + 마이그레이션 + **읽기**를 신 스키마로(쓰기는 구·신 병행) → 검증.
4. 목업툴: 쓰기를 신 스키마로, 가이드 배경 user 키만 쓰게 → **오염 차단** → 검증/push.
5. 운영자 도구 신규(operator만 생산) → 검증.
6. 구 flat 키 쓰기 완전 제거 → 검증/push.
- 각 단계 독립 커밋 + 검증 PASS 후 다음. 롤백 = 직전 커밋.
- 마이그레이션은 비가역 아님(구 키 보존, 신 키 추가식).

---

## 9. 무엇이 사라지나 (찌꺼기 → 계약 매핑)

| 찌꺼기 | 처리 |
|---|---|
| bgKey 9중복 | 단일 정의 |
| 위치 다중 표현 | `frameCenterX/Y` 단일화 |
| 저장 3중 경로 | scope 기반 단일 함수 |
| Storage 가로채기/pause | 도구 분리로 제거 |
| 비활성 sync IIFE | 삭제 |
| 상속 3종(V79/V82/reset-fix) | load/inherit 단일 계약 |
| ①(roomInitialGuideScale) | operator.default.guideScale 흡수 후 폐기 |
| 가이드 배경 미분리 | operator/user scope 분리 |
| **adminRoomSetup 분기 20+곳** | **도구 분리로 제거.** scope는 "어느 도구냐"(목업툴=user / 운영자도구=operator)로 결정 → `isAdminRoomSetup*` 판별·`?adminRoomSetup`→key 분기·중복 `active()` **전부 불필요.** `currentBgKey`/`currentBgKeyV48`의 setup 반환 라인 삭제 |
| **V363 / Phase C** | **(범위 밖) 무수정 보존.** 룸 설정 아님(프레임 텍스트 / 이미지 tint) |

---

## 10. 불변식 (계약 위반 = 버그)

- I1. 목업툴은 `roomSettings.operator`에 **절대 쓰지 않는다.**
- I2. 운영자 도구는 `roomSettings.user`에 **절대 쓰지 않는다.**
- I3. 사이즈 키는 어떤 상속/저장에도 operator→user로 흐르지 않는다.
- I4. `__userTouched` 프리셋은 operator 변경으로 덮이지 않는다(정책A).
- I5. 보호영역 함수 본체는 무수정. 입력은 resolved preset.
- I6. **V363(프레임 텍스트)·Phase C(이미지 tint/캐시)는 룸 설정 스키마와 무관 → 무수정.** 스키마 작업이 이들을 건드리면 계약 위반.

---

## 11. 미해결 단기 버그와의 관계

- **기울기 토글 UI 동기화**(데이터 true/UI off → 재저장 시 데이터 손상): 스키마와 무관한 **로드 시 UI 반영** 버그. 스키마 컷오버 전/중 어디서든 처리 가능. 단독으로 먼저 고쳐도 됨.
- **어드민 영속화 간헐 유실(pause)**: 운영자 도구 분리(pause 제거)로 자연 소멸. 그 전 임시로 `clearRoomAutoSavePause` 한 줄 가능.

---

## 12. 결정 확정 (D1~D5)

- **D1 = 중첩 객체.** `roomSettings.operator/user` (flat 접두어 안 씀).
- **D2 = 통합.** 가이드선 오프셋 별도 안 둠. 위치는 `frameCenterX/Y` 하나(§3). 검증 ①에서 같이 움직임 확인.
- **D3 = 별도 파일.** 운영자 도구 = `denn-room-default-tool.html` 신규. 목업툴 내 모드 유지 안 함.
- **D4 = uploaded-room 범위 밖.** uploaded-room은 사용자 영역, 운영자 디폴트 없음. operator 디폴트 대상 = `default`(②) + 가이드 배경뿐.
- **D5 = lazy 상속.** 마이그레이션 시 `<bgId>`(__adminPreset)는 `operator.<bgId>`만 생성. `user.<bgId>`는 사용자 첫 진입 때 lazy 상속(B1 패턴 동일).

---

## 13. 다음 액션
1. ✅ D1~D5 확정(§12), 정독 반영(§2·§9 adminRoomSetup / V363·Phase C 범위 밖) → **v1.0 확정.**
2. ✅ `9636c80`(default-room) 검증 PASS + push 완료 (안전판 확보).
3. ▶ **컷오버 1단계 설계**(§8 step 3: `roomSettings` 신설 + 마이그레이션 + 읽기 전환). 단계별 독립 커밋 + 롤백 절차.
4. 승인 후 코드 착수. 보호영역(I5)·V363·Phase C(I6) 무수정 유지.
