# 2026-05-31 세션 핸드오프 — 룸 설정 스키마 리빌드 컷오버 (2a까지 완료)

> 사무실 PC에서 이어가기용. **모든 커밋 origin/main push 완료, 워킹트리 clean.**
> 핵심 계약/설계는 별도 문서 3개에 있음(§5). 이 문서는 현재 위치 + 다음 작업.

---

## 0. 복원 절차 (사무실 PC)

```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -7          # 71f25d2(2a)가 HEAD인지 확인
git status                    # clean, origin과 동기화 확인
claude
```
자연어 한 줄:
> "docs/2026-05-31-session-handoff-cutover.md 읽고 컷오버 2b부터 이어가자."

---

## 1. 지금까지 한 일 (이번 세션 전체)

처음엔 "B1 default-room 위치 자가차단" 버그 진단에서 시작 → 진단 중 **데이터 모델 자체가 누적 찌꺼기로 망가져 있음**을 확인 → 재준 결정으로 **스키마 리빌드 컷오버**로 전환.

### 커밋 맵 (오래된 → 최신, 전부 push됨)
| 커밋 | 내용 |
|---|---|
| `9636c80` | **B1**: default-room 위치 자가차단 해제(isUntouched 재작성) + 사용자 드래그 보존(`__dennUserMovedFrame`). 검증 PASS. |
| `9436400` | **스키마 계약 v1.0** (`roomSettings.operator/user` 중첩). 결정 D1~D5 확정. |
| `73a8d2e` | 1단계 설계 문서 |
| `2947d25` | **1단계 구현**: `roomSettings` 파생 미러(`roomSchemaSyncV1`) + `roomRead` 어댑터 + 상속 읽기 2곳(B1/V79) 전환. 쓰기 미변경. 동등성 검증 PASS. |
| `b41d2a6` | 2단계 설계 문서 (D6=ii 확정) |
| `71f25d2` | **2a 구현**: 가이드 배경 `user:<bgId>` 키 분리 = **양방향 오염 차단(전진)**. 검증 PASS. |

---

## 2. 현재 데이터 모델 상태 (실제 코드)

`denn-mockup-tool.html` 파일 끝 `<script id="denn-room-schema-v1">` (B1 wrap `denn-room-common-inherit-v82` 바로 뒤).

- **신 스키마**(파생 read view, derived): `A.roomSettings = {operator:{default,<bgId>}, user:{default,<bgId>}, __schemaVersion:1}` — `roomSchemaSyncV1(A)`가 매 호출 구 flat에서 재동기화.
- **구 flat**(여전히 source of truth): `A.roomBackgroundSettings`.
  - `__denn_room_common_default__`(②) = operator.default
  - `default-room` = user.default
  - `<bgId>` = operator.<bgId> (운영자, `__adminPreset`)
  - **`user:<bgId>`(신규, 2a)** = user.<bgId> (소비자 조정값)
- **키 라우팅**: `window.scopedKeyV2(rawKey)` — 소비자+가이드배경이면 `user:` prefix. adminRoomSetup(운영자)/default-room/uploaded-room/② 는 그대로. 저장/로드 진입점 3곳(`loadSettingsV33`/`saveSettingsV33`/`saveCurrentRoomKeyV48`)에서 경유.
- **상속**: B1(default-room←②), V79 `applyCommonToGuideIndex`(user:<bgId>←operator<bgId>→②). 둘 다 `roomRead('operator',…)` 경유.

### 노출 전역(콘솔 디버그용)
`window.roomSchemaSyncV1` / `window.roomRead(scope,key)` / `window.scopedKeyV2(rawKey)` / `window.dennApplyCommonToDefaultRoomV82()`

---

## 3. 다음 작업 = 2b (마이그레이션 + 클린업)

설계 문서 `docs/2026-05-31-cutover-phase2-design.md` §5(D6) 기준.

1. **기존 오염 `<bgId>` → `user:<bgId>` 마이그레이션** (D6=ii, 1회 멱등):
   - `<bgId>` 중 `__adminPreset` 없는 것(= 사용자 조정 잔존) → `user:<bgId>`로 이동. operator는 비우고 첫 진입 시 ② 상속.
   - `__adminPreset` 있는 것 → operator 유지. user는 lazy.
2. **user.default(default-room)에 묻은 운영자 마커 클린업**:
   - ⚠️ 이번 세션 발견: default-room에 `__savedFromAdminRoomSetup:true`가 묻어 있어 B1이 "운영자 저장본 보존"으로 상속을 차단함(`roomRead_op_fcX:40`인데 `d_fcX:24.51`로 안 따라간 원인).
   - user 영역(default-room/user:<bgId>)에서 `__adminPreset`/`__savedFromAdminRoomSetup` 제거 필요.
   - **주의**: 그 마커가 *지금도* default-room에 묻는 활성 경로가 있는지 확인할 것(현재는 과거 잔존물로 추정, 미확인). 활성이면 그 경로도 막아야 함.
3. 마커 정교화(`__inheritedFrom`/`__userTouched`)는 점진(계약 §5).

→ **2b는 데이터 변환이라 멱등성/롤백 신중히.** 1·2a처럼 설계 문서부터 → 승인 → 구현 → 검증 → push.

### 이후
- **3단계**: 운영자 도구 별도 파일 `denn-room-default-tool.html` 신규(operator만 생산).
- **4단계**: 구 flat 쓰기 제거 + `isAdminRoomSetup`/setup 분기(20+곳) / `roomSavePaused`·pause / `Storage.prototype.setItem` 가로채기 정리.

---

## 4. 검증 verifier 모음 (콘솔, Ctrl+Shift+R 후)

**오염 차단(2a) 회귀 확인** — 가이드 배경 선택 후 슬라이더 조정 전/후:
```js
(function(){var rs=(window.ADM||{}).roomBackgroundSettings||{};var A=window.ADM||{};var idx=window.RM&&RM.guideIndex;var bg=(A.guideBackgrounds||[])[idx];var raw=(bg&&(bg.id||bg.name))||('guide-'+idx);window.__t2={raw:raw,op:JSON.stringify(rs[raw]||null),user:JSON.stringify(rs['user:'+raw]||null)};console.log('raw:',raw,'op존재',!!rs[raw],'user존재',!!rs['user:'+raw]);})();
```
조정 후: `operator_불변:true` / `user_변경됨:true` 면 OK.
```js
(function(){var rs=(window.ADM||{}).roomBackgroundSettings||{};var t=window.__t2||{};console.table({operator_불변:JSON.stringify(rs[t.raw]||null)===t.op,user_변경됨:JSON.stringify(rs['user:'+t.raw]||null)!==t.user});})();
```

**스키마 동등성**:
```js
(function(){var A=window.ADM||{};if(window.roomSchemaSyncV1)roomSchemaSyncV1(A);var rs=A.roomBackgroundSettings||{},S=A.roomSettings||{};function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}console.table({op_default:eq((S.operator||{}).default,rs['__denn_room_common_default__']),user_default:eq((S.user||{}).default,rs['default-room']),scopedKey_fn:typeof window.scopedKeyV2});})();
```

**B1 default-room 상속**(기본화면 상태에서):
```js
(function(){var A=window.ADM||{};var rs=A.roomBackgroundSettings=A.roomBackgroundSettings||{};var c=rs['__denn_room_common_default__']=rs['__denn_room_common_default__']||{};['frameCenterX','frameX','guideCenterX','guideX'].forEach(function(k){c[k]=40});var d=rs['default-room']||{};delete d.__dennUserMovedFrame;delete d.__savedFromAdminRoomSetup;delete d.__adminPreset;window.ADM=A;window.dennApplyCommonToDefaultRoomV82();console.table({rm_guideIndex:(window.RM||{}).guideIndex,applied:!!rs['default-room'].__dennCommonInheritV82,d_fcX:rs['default-room'].frameCenterX});})();
```
기대: `rm_guideIndex:null`, `applied:true`, `d_fcX:40`.

---

## 5. 참조 문서 (필독 순서)

1. `docs/2026-05-31-room-settings-schema-contract.md` — **스키마 v1.0 계약**(불변식 I1~I6, 키 모델, 마이그레이션 맵, D1~D5). 최상위 기준.
2. `docs/2026-05-31-cutover-phase1-design.md` — 1단계 설계.
3. `docs/2026-05-31-cutover-phase2-design.md` — 2단계 설계(D6=ii). 2b 구현의 직접 근거.

---

## 6. 원칙 (계속 유지)

- 컷오버 **단계별 독립 커밋 + 검증 PASS 후 push.** 회귀 폭탄 회피.
- 보호영역 무수정: `zeRender/renderFrame/renderCase/fbExport/sendKakao/openZoneEditor`.
- **V363(프레임 텍스트)·Phase C(이미지 tint/캐시) 무수정** — 룸 설정 스키마 범위 밖(계약 I6).
- 불변식: 목업툴은 `operator` 안 씀 / 운영자도구는 `user` 안 씀 / 사이즈 상속 안 흐름(C 정책) / `__userTouched` 보존(B2-다).
- 콘솔 진단 5원칙: 한 줄 / ```js / 주석 제거 / 절차 안내 / 한 줄 버전.
- 롤백: 각 단계 직전 커밋. 2a 롤백 = `user:` 키 무시 시 구 동작(operator 보존, 데이터 손실 0).

---

## 7. 작업 환경/역할 (참고)

- Claude(채팅) = 번역기. 진단/코드는 Claude Code 전담. 추천은 명시 요청 시만.
- 워크플로우: 자연어 의뢰 → 사전평가 → 승인 → 패치 → 검증(Ctrl+Shift+R+콘솔) → push.
- 작업 폴더 밖(C:\repo\denn-products) 나가지 말 것.
