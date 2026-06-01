# 컷오버 2b 설계 — 마이그레이션 + user 영역 마커 클린업

> 작성: 2026-06-01. 상위: 스키마 v1.0 + 2단계 설계(`docs/2026-05-31-cutover-phase2-design.md` §5 D6=ii).
> 2a(`71f25d2`)로 **오염 차단(전진)** 완료. 2b = **과거 오염 잔존물 정리(소급)**.
> **데이터 변환이므로 멱등성/롤백 우선.** 승인 후 구현.

---

## 0. 2b의 정체

2a는 *앞으로의* 소비자 쓰기를 `user:<bgId>`로 보내 operator 키를 불가침으로 만들었다.
하지만 **2a 이전에 같은 flat `<bgId>`/`default-room`에 쌓인 잔존물**은 그대로다. 2b는 그걸 1회 정리한다.

대상 두 가지:
1. **오염 `<bgId>` → `user:<bgId>` 이동** (D6=ii). operator 디폴트가 아닌 소비자 조정 잔존을 user 영역으로.
2. **user 영역(`default-room`/`user:<bgId>`)에 묻은 운영자 마커 클린업.**
   - 오늘 진단의 핵심: `default-room`에 `__savedFromAdminRoomSetup:true`가 묻어 B1 상속이 `isUntouched()→false`로 차단됨(`d_fcX:24.51` 미추종 원인).

---

## 1. 활성 경로 조사 결과 (핸드오프 미확인 항목 해소)

**질문**: 운영자 마커(`__adminPreset`/`__savedFromAdminRoomSetup`)가 *지금도* `default-room`에 묻는 활성 경로가 있는가?

**조사**:
- 두 마커를 `=true`로 쓰는 곳은 **`markSavedAdminPreset()`(L4661–4662) 단 하나.** (다른 곳은 전부 상속 시드의 `=false`.)
- 호출자는 `saveAdminRoomPreset()`(L4701) → 관리자 바 `denn-admin-room-save` 버튼뿐. 바는 `?adminRoomSetup` 있을 때만 설치(L4714).
- `markSavedAdminPreset`이 쓰는 키 = `currentBgKey()`. 이 IIFE(`denn-v46-room-guide-bg-preset-link`, L4419~) 안의 **유효 정의는 L4514**:
  ```
  var setupKey=qs().get('adminRoomSetup'); if(setupKey)return setupKey;   // 운영자 bg 키
  ... guideIndex → bgKey / RM.bgId / 없으면 return null
  ```
  → **`default-room`을 반환하는 분기가 없다.** null이면 `markSavedAdminPreset`이 즉시 early-return.
- (L6549의 다른 `currentBgKey`는 `denn-v73-...` IIFE 내부 로컬이라 이 경로에 안 샘.)

**결론**: 정상 운영자 플로우에서 마커가 `default-room`에 묻을 수 없다. → **현 잔존물은 과거 데이터**(추정 확정).
**유일한 이론적 경로**: 운영자가 `?adminRoomSetup=default-room`으로 열고 저장 → setupKey='default-room'. 비정상이지만 차단 1줄 추천(§3-C).

---

## 2. 마이그레이션 규칙 (1회, 멱등, 플래그 가드)

진입점: 신규 스크립트 `denn-room-migrate-2b`(schema-v1 스크립트 바로 뒤). 부트 후 ADM 로드되면 1회.

### 가드
- `A.roomBackgroundSettings.__dennMigrate2bDone===true` 이면 skip. 마이그레이션 후 이 플래그를 세팅하고 persist.
- 플래그 미존재 + `roomBackgroundSettings` 존재 시에만 수행.

### 예약 키(절대 안 건드림)
`__denn_room_common_default__`(②, operator.default), `default-room`(user.default, §3에서 마커만 클린), `uploaded-room`, `direct-room-upload`, `user:`로 시작하는 키, `__`로 시작하는 메타 키.

### A. 오염 `<bgId>` 이동 (D6=ii)
예약 키가 아닌 각 flat 키 `k`에 대해:
- `hasPreset(st)` (= `__adminPreset || __savedFromAdminRoomSetup`)이면 → **operator 유지.** 손대지 않음. (user.`<bgId>`는 소비자 첫 진입 시 lazy 상속 — 기존 V79.)
- preset 없음(= 소비자 조정 잔존) →
  - `user:k`가 아직 없을 때만: `rs['user:'+k] = stripMarkers(clone(st))` (운영자 마커 제거 + `__inheritedFrom`/`__userTouched` 미설정).
  - 그 후 **operator `k` 삭제**(`delete rs[k]`). → 다음 진입 시 V79가 ②(operator.default)에서 lazy 상속. 데이터는 `user:k`에 보존.
  - `user:k`가 이미 있으면(2a 이후 소비자가 새로 만든 값): operator `k`만 삭제(중복 잔존 제거), `user:k` 불변.

> 삭제해도 값은 `user:k`로 보존 → **데이터 손실 0.** 멱등: 재실행 시 `k` 없음 → no-op(+플래그로도 차단).

### B. user 영역 마커 클린업
- `default-room`과 모든 `user:*` 키에서 **운영자 흔적 제거**:
  `__adminPreset`, `__savedFromAdminRoomSetup`, `__adminPresetSavedAt` delete.
- `default-room`은 키 자체는 유지(값/위치/사이즈/`__dennUserMovedFrame` 등 전부 보존), **마커만** 제거.
  → B1 `isUntouched()`가 더 이상 false로 막히지 않아 ② 상속 정상화.

### stripMarkers(st)
`__adminPreset`/`__savedFromAdminRoomSetup`/`__adminPresetSavedAt` 제거. (위치/사이즈/그림자/햇빛/`__dennUserMovedFrame`/`__dennCommonInheritV82` 등 나머지 전부 보존.)

---

## 3. 변경 표면

### A. 신규 스크립트만 추가 (본체 무수정 원칙)
- `denn-room-migrate-2b` 1개. 기존 함수 본체·보호영역·V363·Phase C 무수정.
- 노출 전역(롤백/수동용): `window.dennMigrate2b()`(강제 1회), `window.__dennMigrate2bDone` 조회.

### B. persist 경로 (조사 완료)
- `saveSettingsV33`은 **현재 키를 현 UI값으로 덮어쓰는 부작용**이 있음(`st[key]=Object.assign(defaults(),prev,currentSettingsV33())`, L2935) → **마이그레이션 persist에 부적합.** 사용 금지.
- `persist(A)`(L2833) = `window.ADM=A` + `saveCustomerAdminStateToLocalStorage`(전체 A 직렬화). **localStorage만**, IDB 미반영.
- `persistAdmin(A)`(L4502) = localStorage + **IDB `dbSet('denn_admin_state',A)`** 둘 다. **이게 정답.** 단 `denn-v46` IIFE 로컬이라 전역 미노출.
- ⚠️ **읽기는 IDB-primary 머지**(`loadAdminFresh`+`scoreAdmin`). localStorage만 쓰면 reload 시 IDB의 구 오염본이 부활할 수 있음(메모리 `localStorage_quota_deadlock` 인접 리스크).
  → **마이그레이션은 localStorage + IDB 양쪽 필수.**
- 구현 방안: 전역인 `saveCustomerAdminStateToLocalStorage(A)`(L13) 호출 + IDB 직접 쓰기. IDB 헬퍼(`dbSet`/`dbGet`)가 v46 IIFE 로컬이므로 → (1) `persistAdmin`/`dbSet`를 `window`에 노출하는 1줄 추가, 또는 (2) 마이그레이션 스크립트 내 `indexedDB` 직접 open(`denn_shared_db/kv/denn_admin_state`). **(1) 권장**(중복 최소).

### C. (옵션) 이론적 활성 경로 차단 1줄
- `markSavedAdminPreset` 진입부: `if(currentBgKey()==='default-room')return Promise.resolve(false)` 가드.
- §1 결론상 정상 플로우엔 불필요하나 `?adminRoomSetup=default-room` 오용 방어. **승인 시에만 포함**(본체 1줄 수정이므로 분리 결정).

---

## 4. 롤백
- 신규 스크립트 제거 = 코드 롤백. 단 **데이터는 이미 변환됨**(operator `<bgId>` 삭제, user 마커 제거).
- 역변환 안전성: 삭제된 operator `<bgId>`(non-preset)는 원래 소비자값 → operator로 되돌릴 이유 없음(오염 그 자체였음). 값은 `user:<bgId>`에 보존.
- 2a 롤백(user: 키 무시) 시: 해당 bg는 operator `<bgId>`가 비어 ②로 폴백 → 운영자 디폴트 표시. **운영자 데이터 손실 0**(operator 디폴트는 ②/preset bg에 그대로).
- **백업(승인=포함)**: 마이그레이션 직전 `roomBackgroundSettings` 스냅샷을 **별도 localStorage 키 `denn_room_premigrate2b_backup`에 1회** 저장.
  - ⚠️ A에 중첩(`A.__dennPreMigrate2bBackup`)하지 않음 — 중첩하면 매 save마다 blob이 2배로 직렬화되어 quota 영구 부담(`localStorage_quota_deadlock` 메모리 인접). 별도 키는 1회 쓰고 끝.
  - 복원: `window.dennRollbackMigrate2b()` — 백업 복원 + `__dennMigrate2bDisabled` 세팅(스크립트 잔존 시 reload 후 재마이그레이션 방지).

---

## 5. 검증 (PASS 기준, Ctrl+Shift+R 후 콘솔)

1. **마커 클린업**: `default-room`에 `__savedFromAdminRoomSetup`/`__adminPreset` 없음.
2. **B1 상속 정상화**: ② 위치 변경 → 기본화면에서 `applied:true`, `d_fcX`가 ② 추종(오늘 24.51 미추종 회귀 해소).
3. **오염 이동**: non-preset 잔존 `<bgId>` → `user:<bgId>`로 이동 + operator `<bgId>` 삭제. preset `<bgId>`는 불변.
4. **멱등**: `dennMigrate2b()` 재호출 → 변화 없음, 플래그 true.
5. **영속화**: 새로고침 후에도 클린 상태 유지(localStorage+IDB 반영 확인).
6. **회귀 없음**: 2a 오염 차단/스키마 동등성/scale·그림자·햇빛·사이즈 미상속 불변.

검증 verifier는 핸드오프 §4 + 본 §5 전용 1줄 스크립트로 구현 단계에서 제공(콘솔 5원칙).

---

## 6. 결정 (확정)
- (a) ✅ persist = localStorage + IDB 양쪽(§3-B). 구현은 IDB 자족 쓰기(`indexedDB` 직접 open)로 본체 무수정 유지.
- (b) ✅ **백업 포함** — 단 `A` 중첩이 아닌 **별도 localStorage 키**(quota 회피, §4).
- (c) ✅ **차단 1줄 포함** — `markSavedAdminPreset`에 `if(key==='default-room')return ...`(본체 1줄).
- (d) 단일 커밋(멱등 1스크립트 + 차단 1줄).

## 6.5. 1차 검증서 발견 — union-merge가 삭제 부활 (→ A3 tombstone 채택)

1차 패치(rev1, 단순 delete) 검증 결과: `migrate_done/backup/마커제거`는 PASS인데 **`stray_nonpreset_bgId:9`**(삭제 안 박힘).

**근본 원인**: `mergeAdminStates`(L4458)가 room 설정을 **키 합집합**으로 머지 —
`Object.assign({}, secondary.rbs, primary.rbs)`. `loadAdminFresh`가 부트마다 IDB∪localStorage를 머지+재persist →
**한 스토어에서 지운 키가 다른 스토어(또는 async race로 stale한 IDB)에서 부활.**
- B(마커 클린업)는 durable: `default-room`은 단일 키라 머지가 primary(clean)로 통째 덮음 → 마커 제거 유지.
- A(operator 키 삭제)는 비durable: 합집합이라 삭제 키가 살아 돌아옴.

**채택 = A3 (승인): room-key tombstone.**
- `mergeAdminStates`에 `deletedRoomKeys`(기존 `deletedGuideBackgroundKeys` 패턴) 추가. 머지 결과에서 tombstone 키 제거.
- **면제 규칙**: tombstone 키라도 값에 `__adminPreset`/`__savedFromAdminRoomSetup`이 있으면(=미래 진짜 운영자 디폴트) 제거 안 하고 tombstone 해제. → blanket tombstone이 미래 정상 운영자 키를 nuke하는 위험 차단.
- 오염값은 marker가 없으므로 영구 제거, 진짜 operator 디폴트는 보호. **데이터는 user:<bgId>에 보존(손실 0).**
- migration rev2: 기존 rev1 done 상태(user 트윈 있음, tombstone 없음)에서 재실행되어 tombstone 추가. `__dennMigrate2bRev` 가드.
- 롤백: `dennRollbackMigrate2b()`가 백업 복원 + `deletedRoomKeys=[]` 클리어(2b 신설 필드라 안전).

## 7. 구현 결과 (커밋 대상)
- 신규 스크립트 `denn-room-migrate-2b`(`denn-room-schema-v1` 바로 뒤). rev2(tombstone). 전역: `dennMigrate2b()`/`dennMigrate2bStatus()`/`dennRollbackMigrate2b()`.
- `mergeAdminStates`(L4458) room-key tombstone + 면제 규칙 (additive, core 함수 1곳).
- `markSavedAdminPreset`(L4664) 차단 1줄.
- 보호영역(render)·V363·Phase C 무수정. IDB 자족 쓰기로 `persistAdmin` 노출 불필요.
