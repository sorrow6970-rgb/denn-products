# 컷오버 2단계 설계 — 쓰기 scope 분리 (오염 차단)

> 작성: 2026-05-31. 상위: 스키마 v1.0 + 1단계(2947d25). 본 문서 = 2단계 설계. 승인 후 구현.

---

## 0. 2단계의 정체

**재준이 처음 본 양방향 오염을 실제로 막는 단계.**
- default-room/② 분리는 B1(9636c80)+1단계로 **이미 완료.**
- 남은 오염 = **가이드 배경**: 소비자/운영자가 **같은 flat 키 `<bgId>`를 공유** → 소비자 조정이 운영자 디폴트 덮음(검증 ①로 확정).
- 2단계 = **가이드 배경 쓰기를 user 전용 키로 분리** → operator 키 불가침.

---

## 1. 키 네임스페이스 (flat 레벨; roomSettings 중첩은 derived 유지)

| 논리 | flat 키 | 비고 |
|---|---|---|
| operator.default | `__denn_room_common_default__` (②) | 그대로 |
| user.default | `default-room` | 그대로(B1) |
| operator.`<bgId>` | `<bgId>` | 그대로(운영자, `__adminPreset`) |
| **user.`<bgId>`** | **`user:<bgId>`** | **신규** — 소비자 가이드 배경 조정값 |

> default 계열은 이미 분리됨. **2단계 신설 = `user:<bgId>` 하나.**

---

## 2. 핵심 변경

### A. scope 키 헬퍼 `scopedKey(rawKey)`
```
scopedKey(rawKey):
  if (isAdminRoomSetup()) return rawKey            // 운영자 → operator 키 그대로
  if (rawKey === 'default-room' || rawKey === 'uploaded-room'
      || rawKey === '__denn_room_common_default__') return rawKey
  return 'user:' + rawKey                          // 소비자 + 가이드 배경 → user 키
```

### B. 키 함수에 일괄 적용 (저장↔로드 키 **반드시 일치**)
- `currentBgKeyV48()`(L4989, 저장) → 반환을 `scopedKey()`로 후처리
- `currentBgKey()`(L4514, V33) → 동일
- `bgKey()`(L2836, 로드)의 가이드배경 케이스 → 동일
- **본체 최소 수정**: 가능하면 wrap으로 반환 후처리. 불가 시 각 함수 1줄.

### C. lazy 상속 (D5) — 소비자 가이드 배경 첫 진입
`user:<bgId>` 없으면 → operator `<bgId>`(없으면 ②=operator.default)에서 상속 생성.
- V79 `applyCommonToGuideIndex`(L8102) 확장: 대상 키를 `user:<bgId>`로, 소스는 `roomRead('operator', bgId)` → 없으면 `roomRead('operator','default')`.
- 마커 `__inheritedFrom`/`__userTouched`(계약 §5)로 보존 판정(B1 패턴 일반화).

### D. roomSchemaSyncV1 갱신 (1단계 wrap 확장)
`user.<bgId> ← rs['user:'+bgId]` 우선, 없으면 operator(`rs[bgId]`). → 2단계 user: 키 반영.

### E. 마이그레이션 1회
- `<bgId>` with `__adminPreset` → operator 유지. user:`<bgId>`는 lazy.
- `<bgId>` without preset → **결정 D6**(§5).

---

## 3. 위험 / 회귀 표면

| 항목 | 평가 |
|---|---|
| 키 함수 변경 | **저장↔로드 키 불일치 = 데이터 유실** → 동일 헬퍼로 일괄, 검증 필수 |
| 가이드 배경 저장/로드 전체 영향 | 회귀 표면 큼 → 단계 검증 |
| default-room/② | 무영향(헬퍼가 통과시킴) — 1단계 동등성 유지 확인 |
| 운영자 도구 미분리(아직 같은 파일) | scope는 `isAdminRoomSetup`로 결정(3단계서 도구 분리, 4단계서 분기 제거) |

---

## 4. 검증 (PASS 기준)

1. **오염 차단**: 소비자가 가이드 배경 슬라이더 조정 → `user:<bgId>` 생성·변경, **`<bgId>`(operator) 불변** ← 핵심
2. **운영자 저장**: adminRoomSetup에서 가이드 배경 저장 → `<bgId>` 갱신, `user:<bgId>` 불변
3. **lazy 상속**: 소비자 첫 진입 → operator(`<bgId>`/②)에서 `user:<bgId>` 생성
4. **사용자 보존**: 소비자 조정 후 재진입 → user 값 유지(`__userTouched`)
5. **회귀 없음**: default-room/②/scale/그림자/햇빛/사이즈 미상속 불변

---

## 5. 결정 확정 — D6 = (ii)

기존 flat `<bgId>` 중 `__adminPreset` **없는** 것(= 소비자 조정 잔존, 이미 오염된 상태) 처리:

- **D6 = (ii) `user:<bgId>`로 이동.** 사용자 조정값으로 인정. operator.`<bgId>`는 비워 두고, 운영자 디폴트가 따로 저장된 적 없으면 소비자 첫 진입 시 ②(operator.default) 상속.
- (i) operator 흡수(오염값이 디폴트화) / (iii) 폐기(사용자값 손실)는 기각.

---

## 6. 롤백
- `scopedKey` wrap + 키 함수 원복.
- `user:<bgId>` 키는 무시 시 구 동작(operator `<bgId>` 읽음). operator 키 보존 → **데이터 손실 0.**

## 7. 커밋
- 2a: scopedKey + 키 함수 + roomSchemaSync 확장 (오염 차단 핵심)
- 2b: lazy 상속 + 마이그레이션
- 각 검증 PASS 후 push. (단일 커밋도 가능 — 분량 보고 판단)

## 8. 이후
- **3단계**: 운영자 도구 `denn-room-default-tool.html` 신규(operator만 생산).
- **4단계**: 구 flat 쓰기 제거 + `isAdminRoomSetup`/setup 분기 / pause / Storage 가로채기 정리.
