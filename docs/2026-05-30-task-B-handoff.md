# 2026-05-30 핸드오프 — 작업 B (사이즈 가이드 저장/복원/기본설정 정상화)

> 파일: `denn-mockup-tool.html`. 정책 = **②(`__denn_room_common_default__`) 단일 source of truth**, 진행 방식 = 옵션 C(단계적).
> **세션 종료 사유**: 재준 자리 비움. B1 G4 보정 amend까지 완료, **재검증 전이라 push 보류**.

---

## 0. 현재 git 상태 (이어받을 때 필독)

| 항목 | 값 |
|---|---|
| 로컬 HEAD | `7a6223d` (B1 wrap + SyntaxError fix + G4 보정, 모두 amend로 단일 커밋) |
| origin/main | `bd21981` (세션1까지 push됨) |
| 상태 | **로컬이 origin보다 ahead 1** (= `7a6223d` 미push) |
| 워킹트리 | clean (이 MD 커밋 전 기준) |

**중요**: `7a6223d`(B1)는 **재검증 PASS 전까지 push 금지.** 이 핸드오프 MD는 별도 커밋으로 push해도 됨(문서, 코드 영향 0).

---

## 1. 오늘 완료/진행 커밋

| 커밋 | 내용 | 상태 |
|---|---|---|
| `bd21981` | **세션1**: `denn-admin-guide-scale-sync` IIFE 비활성(맨 위 `return;`) + 옵션A 미커밋분 통합. scale 슬라이더 스냅백/강제덮기 제거. | ✅ **push 완료**, 재준 검증 PASS |
| `7a6223d` | **세션2 B1**: `denn-room-common-inherit-v82` wrap 신설 — 기본화면(default-room)이 ② 상속(사이즈 제외). 초안→SyntaxError fix→G4 자가차단 보정까지 amend 누적. | ⏸ **로컬만, push 보류 (재검증 대기)** |

세션1 검증 결과(통과): `syncIIFE_alive:false`, 슬라이더 80→120% 후 회귀 없음.

---

## 2. 세션 2 B1 — 무엇을 만들었나

**목표**: 기본화면(배경 미선택 = `default-room`)이 어드민 공통 기본값 ②(`__denn_room_common_default__`)의 위치/스케일/그림자 등을 상속. **단 사이즈 필드는 제외**(주문 사이즈-first 제약 = C 정책).

**구현**: `denn-mockup-tool.html` 파일 끝 `<script id="denn-room-common-inherit-v82">` (현재 L12817~12914). 본체 무수정, wrap만.

**동작 흐름**:
- 트리거: `openRoomMockup` wrap(open 후 600ms) + `rmClearRoom` wrap(450ms) + setup(load/800/2000ms).
- `applyCommonToDefaultRoom()`: 가드 4종 통과 시 → `buildSeed(common, prev)`로 ②에서 사이즈 strip + 기존 사이즈 보존 → `window.ADM`에 시드 → `loadRoomBackgroundSettings()`(=loadSettingsV33) 재호출로 UI 반영.
- 마커: 시드본에 `__dennCommonInheritV82:true` 부착.

**가드 4종** (`applyCommonToDefaultRoom`):
1. `isAdmin()` — adminRoomSetup 모드면 skip
2. `isDefaultRoomNow()` — RM.bgId==='default-room' & !roomImg & guideIndex==null
3. `usefulCommon(common)` — ②에 `__denn` 외 키 존재
4. `isUntouched(prev, common)` — 아래 보정판

**사이즈 제외 키**(`SIZE_KEYS`): defaultSizeId, sizeId, frameSizeId, primarySizeId, adminGuideSize{Id,Name,Wcm,Hcm,Orientation}, guideSize{Id,Name,Wcm,Hcm,Orientation}, runtimeGuideSize{Id,Name,Wcm,Hcm,Orientation}.

---

## 3. 자가-차단 버그 진단 + G4 보정판 (최종 적용본)

### 버그 (검증으로 발견)
초안 `isUntouched`는 `frameCenter`가 50/40에서 0.8 이상 벗어나면 "사용자가 만짐"으로 판정.
→ B1이 한 번 ②(51.5/42.1) 상속하면, 그 후 default-room이 51.5/42.1 → **다음부터 "touched"로 오판 → 영구 자가-차단.**
verifier 증거: `G4_untouched:false`, `prev_fx:51.5`, `prev_inheritKeys:[__dennInherited..., __dennCommonInheritV82]`.

### 보정판 로직 (L12848 `isUntouched(st, common)`)
- **(가)** 50/40 근처(`nearDefault`) → 항상 상속 허용(true)
- **(나)** 우리 상속본(`st.__dennCommonInheritV82`) **그리고** 현재 위치가 아직 ②값과 일치(`matchCommon`, 0.8 이내) → 상속 후 미조정으로 보고 재상속 허용(true)
- 그 외 → touched(false) = 보존

### 5개 케이스 검증 표
| default-room 상태 | nearDefault | 마커 | 값=②? | 판정 | 결과 |
|---|---|---|---|---|---|
| 순정 50/40 | ✅ | — | — | untouched | 상속 ✅ |
| 상속본 51.5/42.1, ②=51.5 (현 케이스) | ❌ | ✅ | ✅ | untouched | **재상속 ✅ (자가차단 해제)** |
| 상속본, ②가 60/30으로 바뀜, prev=옛51.5 | ❌ | ✅ | ✅(옛②) | untouched | 새 ② 재상속 ✅ |
| 상속 후 사용자가 드래그 70/20 | ❌ | ✅ | ❌ | touched | **보존 ✅ (B2-다)** |
| 사용자 직접 조정(마커 없음) | ❌ | ❌ | — | touched | 보존 ✅ |

한계(무해): 사용자 조정값이 우연히 ②와 0.8 이내면 재상속 — 어차피 같은 값.

---

## 4. 재준 복귀 시 재검증 절차

### 0) 사전 — ② 존재 확인 (콘솔)
```js
(function(){var A={};try{A=JSON.parse(localStorage.getItem('denn_admin')||'{}')}catch(e){}var c=(A.roomBackgroundSettings||{})['__denn_room_common_default__']||{};console.table({common_saved:!!c.__adminPreset,c_fx:c.frameCenterX,c_fy:c.frameCenterY,c_scale:c.guideScale});})();
```

### 1) Ctrl+Shift+R → 모달 열기(배경 선택 X) → 1초 → G1~G4 verifier
```js
(function(){var RM=window.RM||{},A=window.ADM||(function(){try{return JSON.parse(localStorage.getItem('denn_admin')||'{}')}catch(e){return{}}})(),rs=A.roomBackgroundSettings||{},common=rs['__denn_room_common_default__'],prev=rs['default-room']||{};function num(v){v=parseFloat(v);return isFinite(v)?v:null}var uc=!!(common&&typeof common==='object'&&Object.keys(common).filter(function(k){return k.indexOf('__denn')!==0}).length>0),fx=prev.frameCenterX!=null?num(prev.frameCenterX):num(prev.frameX),fy=prev.frameCenterY!=null?num(prev.frameCenterY):num(prev.frameY),untouched=!(prev.__adminPreset||prev.__savedFromAdminRoomSetup)&&((fx==null)||Math.abs(fx-50)<0.8)&&((fy==null)||Math.abs(fy-40)<0.8);console.table({G1_notAdmin:!(new URLSearchParams(location.search||'').has('adminRoomSetup')),G2_isDefaultRoom:!!(RM&&!RM.roomImg&&RM.guideIndex==null&&(RM.bgId==='default-room'||!RM.bgId)),G3_usefulCommon:uc,G4_simple:untouched,window_ADM:!!window.ADM,RM_bgId:RM.bgId,prev_fx:fx,prev_fy:fy,prev_inheritKeys:Object.keys(prev).filter(function(k){return k.indexOf('__denn')===0}),common_fx:common&&common.frameCenterX});})();
```
> 주: 위 verifier의 `G4_simple`은 **초안 로직**(50/40만)이라 상속본이면 false로 나올 수 있음. **실제 보정판 통과 여부는 아래 2) `applied`로 판정**.

### 2) applied 확인 (핵심 판정)
```js
(function(){var A={};try{A=JSON.parse(localStorage.getItem('denn_admin')||'{}')}catch(e){}var rs=A.roomBackgroundSettings||{},c=rs['__denn_room_common_default__']||{},d=rs['default-room']||{};console.table({applied:!!d.__dennCommonInheritV82,c_fx:c.frameCenterX,d_fx:d.frameCenterX,c_fy:c.frameCenterY,d_fy:d.frameCenterY,c_scale:c.guideScale,d_scale:d.guideScale,d_defaultSizeId:d.defaultSizeId});})();
```
**기대**: `applied:true` + `d_fx≈c_fx`, `d_fy≈c_fy`, `d_scale=c_scale` + `d_defaultSizeId` 기존 유지(사이즈 미상속).

### 3) 어드민 변경 반영 (B1 본질 테스트)
어드민 "공통 기본값 설정"에서 위치/스케일 변경 저장 → 목업툴 Ctrl+Shift+R → 모달 열기 → 2) verifier → **새 ②값 반영 확인**.

### 4) B2-다 회귀 (사용자 조정 보존)
기본화면에서 액자 드래그(②와 다르게) → 모달 닫기 → 재진입 → **내 조정값 유지(②로 안 덮음)** 확인.

### 5) 무영향 확인
가이드 배경 / 업로드 배경 / adminRoomSetup 모드 / 주문 사이즈 — 모두 기존대로.

---

## 5. 재검증 결과별 분기

- **PASS (2·3·4 다 OK)** → `git push origin main` (`7a6223d`) → **B2 단독 재평가**로 진행.
- **`applied:false` 재발** → 가드 아님. **V48 Storage 가드 revert** 가 원인(아래 6번). 2차 픽스로 분기.

### 6. V48 Storage 가드 revert (예상되는 2차 이슈)
- `openRoomMockup` V48 wrap(L5651)이 열 때 `pauseRoomAutoSave(1800)` + 180/520ms 재호출 → **~1900ms 저장 일시정지**.
- 일시정지 중 `Storage.prototype.setItem`(L5364~5371)이 `denn_admin` 쓰기를 **버리고 `restoreAdminSnapshotV48`로 window.ADM까지 옛값 복원.**
- B1의 open후 600ms 시드는 이 구간 한복판 → revert 가능.
- **2차 픽스 방향** (PASS 안 되면): (a) 로드 시점(일시정지 없음) seed 추가, (b) localStorage+IndexedDB 양쪽 쓰기(재로드 시 `loadAdminFresh`가 IDB-primary 머지 → IDB 안 쓰면 다음 로드에 덮임), (c) 일시정지 중 쓰기는 저장해둔 원본 `window.__dennRoomStorageSetItemV48`로 우회.
- **판별법**: 모달 연 뒤 3초(일시정지 만료 후) 수동 `window.dennApplyCommonToDefaultRoomV82()` → 그때 `applied:true`면 revert 타이밍 확정.

---

## 7. B1 이후 남은 작업 (작업 B 전체 로드맵)

- **B1** (현재): default-room이 ② 상속 — **재검증 대기 중**
- **B2 재평가**: 정책 B2-다(현행 유지 + ② 우선 로드) 채택됨. B1 후 "재진입 시 ② 반영"이 대부분 달성되는지 보고 미세조정 필요 여부 판단. (완전휘발/휘발키는 백로그)
- **B3**: "기본설정" 버튼(`denn-room-reset-fix` L12593)이 ②/배경별 저장값 따라가게 일관화. 현재 reset-fix의 `uiGuideScale`은 ①만 봄(9675c6b ⓑ) → ② 기준으로 보정. B1의 "② 베이스 추출(buildSeed)" 재사용 권장.
- **세션 1.5 (백로그, 우선순위 낮음)**: 관리자 공통설정 모드에서 "저장" 누르기 전 V48 자동저장이 ②를 사전 오염 → 운영자만 영향. (일반모드 무영향 확인됨)
- **C (분석만, 수정 금지)**: 내공간↔목업툴 연동 — 고객 액자 반영 정상 / 공통설정 사이즈 미반영(의도) / 설정값만 반영. B1~B3 후 회귀검증으로 유지 확인.
- **다음 세션 이후**: A(가로모드 회전 PNG 미연동), D(스케일 vs 가이드선 미세 불일치) — 작업 B 무관, 별도 세션.

---

## 8. 데이터 키 / 저장 구조 (필독)

- 저장소: `localStorage.denn_admin` + `IndexedDB denn_shared_db/kv/denn_admin_state` (어드민·목업툴 공유). 읽기 우선순위 = **IDB-primary 머지**(loadAdminFresh L4494, hydrateState).
- **①** `A.uiSettings.roomInitialGuideScale` — 가이드 배율 숫자 하나. 세션1에서 sync IIFE 비활성으로 default-room 강제덮기 중단. **정책상 폐기/②종속** 방향.
- **②** `A.roomBackgroundSettings['__denn_room_common_default__']` — 전체 프리셋(위치/스케일/그림자). **단일 source of truth.** 어드민 "공통 기본값 설정 → 관리자 저장"(`markSavedAdminPreset` L4655)이 여기 씀.
- **default-room** `A.roomBackgroundSettings['default-room']` — 기본화면 저장. B1이 ②에서 상속(사이즈 제외).
- 마커: `__dennCommonInheritV82`(B1 상속본), `__dennInheritedCommonDefault`(기존 상속 시스템), `__adminPreset`/`__savedFromAdminRoomSetup`(관리자 저장 표식).

---

## 9. 보호 영역 (절대 수정 금지) — 이번 작업 무수정 확인됨

`zeRender / renderFrame / renderCase / fbExport / sendKakao / openZoneEditor` 본체.
- 검증: `git diff 6ba67f6..7a6223d` 의 모든 hunk가 파일 끝 wrap 영역(L12478~12914)에만 위치. 보호함수 정의 라인 변경 0건 확인.
- V33/V48 본체도 미접촉(전부 wrap으로 우회).

---

## 10. 다음 세션 복원 절차

```bash
cd C:\repo\denn-products
git pull origin main          # 이 핸드오프 MD 가져오기
git status                    # 로컬에 7a6223d(B1)가 ahead 1 인지 확인 (push 안 된 상태가 정상)
git log --oneline -3          # 7a6223d / bd21981 / ... 확인
claude
```
자연어 한 줄:
> "docs/2026-05-30-task-B-handoff.md 읽고 B1 재검증부터. 4번 절차대로 verifier 돌릴게."

---

## 11. 작업 환경 / 원칙

- 워크플로우: 자연어 의뢰 → 사전평가 → 승인 → 패치 → 검증 → push.
- 무관 영역 미접촉. wrap 단계로 본체 보호.
- 콘솔 진단 5원칙: 한 줄 + ```js 블록 + 주석 제거 + 입력 절차 안내 + 한 줄 버전 별도.
- 검증: Ctrl+Shift+R + 콘솔 verifier. push는 재준 검증 PASS 후.
- amend 활용: push 전 커밋은 amend로 깔끔하게 유지(B1이 그렇게 단일 커밋).
