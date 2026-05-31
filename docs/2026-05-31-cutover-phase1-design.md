# 컷오버 1단계 설계 — roomSettings 읽기 어댑터 + 파생 동기화

> 작성: 2026-05-31. 상위 계약: `docs/2026-05-31-room-settings-schema-contract.md` (v1.0).
> 본 문서 = 스키마 v1.0의 **첫 코드 단계** 설계. 승인 후 구현.

---

## 0. 1단계의 정체 (오해 방지)

§8의 "1단계"는 **오염을 막는 단계가 아니다.** 오염 차단(쓰기 scope 분리)은 **2단계**다.
1단계 = **신 스키마 인프라를 깔고 "구 flat과 100% 동일"함을 증명하는 안전 정지점.**
→ 2단계 쓰기 분리가 안전하게 갈라지도록 동등성을 보증.

---

## 1. 목표 / 불변 (1단계 한정)

- 신 스키마 `A.roomSettings` 신설 + **상속 읽기**를 그 경유로 전환.
- **데이터 의미 변경 0.** 신 스키마 = 구 flat의 derived view(파생 미러).
- **쓰기 경로 미변경** — 구 `roomBackgroundSettings`가 여전히 source of truth.
- operator/user **가이드 배경 분리는 2단계** (1단계는 같은 소스 노출).
- 보호영역 / V363 / Phase C 무수정 (계약 I5·I6).
- 롤백 = 어댑터 제거 1회. 데이터 손실 0.

---

## 2. 구성요소

### A. `roomSchemaSyncV1(A)` — 멱등, 매 로드 호출
구 flat → `A.roomSettings` 파생(구가 진실이라 매번 재동기화):
```
operator.default  ← roomBackgroundSettings['__denn_room_common_default__']
user.default      ← roomBackgroundSettings['default-room']
operator.<bgId>   ← roomBackgroundSettings[bgId]   (A.guideBackgrounds 순회)
user.<bgId>       ← roomBackgroundSettings[bgId]   (1단계는 operator와 동일 소스)
__schemaVersion = 1
```
- 위치 정규화: **반환값에서만** `frameCenterX/Y`로 normalize(구 frameX/guideCenterX→frameCenterX). 원본 flat 미변경.
- 호출 시점: `adm()` 직후 또는 `loadAdminFresh` 완료 후(IDB-primary 머지 뒤라야 최신).

### B. `roomRead(scope, key)` — 읽기 어댑터
```
roomRead(scope, key):
  A = adm(); roomSchemaSyncV1(A)
  return (A.roomSettings[scope] && A.roomSettings[scope][key]) || flatFallback(scope, key)
```

### C. 호출부 전환 (1단계는 **상속 읽기만**, 최소)
- **B1** `applyCommonToDefaultRoom`(L12879)의 `rs[COMMON_KEY]` 읽기 → `roomRead('operator','default')`
- **V79** `commonPreset`/`applyCommonToGuideIndex`(L8100/8102)의 ② 읽기 → `roomRead('operator', bgId|'default')`
- 그 외 읽기(`loadSettingsV33` st[key] 등)·**모든 쓰기는 2단계.**
- 값 동일(operator.default===②) → **동작 불변.**

### D. 동등성 검증 verifier (콘솔 5원칙)
```js
(function(){var A=window.ADM||{};if(window.roomSchemaSyncV1)roomSchemaSyncV1(A);var rs=A.roomBackgroundSettings||{},S=A.roomSettings||{};function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}var out={op_default:eq((S.operator||{}).default,rs['__denn_room_common_default__']),user_default:eq((S.user||{}).default,rs['default-room']),ver:S.__schemaVersion};var bgs=A.guideBackgrounds||[],bad=[];bgs.forEach(function(b,i){var k=(b&&(b.id||b.name))||('guide-'+i);if(!eq((S.operator||{})[k],rs[k]))bad.push(k)});out.bg_mismatch=bad.length?bad.join(','):'none';console.table(out);})();
```
→ `op_default:true`, `user_default:true`, `bg_mismatch:'none'` = **1단계 PASS.**

### E. 롤백
- `roomSchemaSyncV1`/`roomRead` 제거 + 호출부 2곳 원복.
- `A.roomSettings`는 derived → 잔존해도 무해. 데이터 손실 0.

---

## 3. 코드 배치 / 커밋

- 새 wrap 1개 `<script id="denn-room-schema-v1">` (파일 끝, B1 옆). 본체·보호영역 무수정.
- 단일 커밋: `feat(mockup-tool): roomSettings v1 파생 미러 + 상속 읽기 전환 (cutover phase1)`.

---

## 4. 회귀 표면 / 위험

| 항목 | 평가 |
|---|---|
| 읽기 결과 변화 | 없음(derived, 동등성 verifier로 보증) |
| 쓰기 | 미변경 |
| 타이밍 | sync가 IDB 머지 뒤 호출돼야 — `adm()` 래핑으로 보장 |
| 가이드 배경 분리 | 1단계 아님(2단계) — 오염은 아직 안 막힘 |

---

## 5. 1단계 PASS 기준

1. 동등성 verifier 전부 true (op_default / user_default / bg_mismatch:none)
2. default-room 상속(9636c80) 동작 **불변** (검증1·2 재확인)
3. scale / 그림자 / 햇빛 / 사이즈 미상속 회귀 없음

---

## 6. 이후 단계 미리보기

- **2단계**: 쓰기 scope 분리 — 목업툴은 `user.*`만 쓰기, `currentBgKeyV48` setup 분기 제거. **여기서 오염 차단.**
- **3단계**: 운영자 도구 `denn-room-default-tool.html` 신규(operator만 생산).
- **4단계**: 구 flat 쓰기 제거 + adminRoomSetup 분기 / pause / Storage 가로채기 정리.

각 단계 독립 커밋 + 검증 PASS 후 다음. 롤백 = 직전 커밋.
