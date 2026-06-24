# 2026-06-24 세션 핸드오프 — 관리자/소비자 모바일 액자위치 저장·반영 근본 해결 + 캔버스 비율 통일

> 상태: origin/main = `3563637` (push 완료). 로컬 HEAD = `be33fea` (폭-fill, **미push·준비만**, 내일 적용).
> 시작: `fe6ecd2`(06-24 중반). 큰 흐름: 모바일 액자위치 저장이 안 되는/F5에 죽는 문제를 **장시간 콘솔 프로브 진단**으로 근본까지 추적 → **저장 로직 3건 근본 해결**. 남은 건 전부 **렌더/정렬** 계열.

---

## 1. 오늘 origin에 올라간 핵심 커밋 (net 효과)
| 커밋 | 내용 |
|---|---|
| `b1234d5` | **Option A** — 관리자 부트 저장 억제(첫 사용자조작 전 persist 차단) |
| `1951b06` | **d87d36a 재적용** — currentSettingsV33에 frameCenterX/Y 기록 |
| `3563637` | **소비자 캔버스 0.462 통일** — v106 coverFit 고정비율 |

(중간에 add+revert 쌍 2개가 net-zero로 히스토리에 남음: `9920c4c`/`833ccba` = forceMobileCenterStart 어드민가드 시도→철회, `6a05145`/`c1d5772` = opener fresh-refresh 시도→철회. 둘 다 **틀린 가설**이라 철회.)

**로컬 보류**: `be33fea` = 소비자 캔버스 **폭-기준 fill**(레터박스 제거). 미push, 내일 첫 작업으로 검증 후 push.

---

## 2. 해결됨 (저장 로직 — 안전)

### A. 관리자 모바일 액자위치 저장 안 됨 / F5 회귀 → `1951b06` (d87d36a 재적용)
- **근본**: `currentSettingsV33`(V33 저장의 값소스)에 **`frameCenterX`가 없음**. 저장 후 ~1.8초에 도는 **지연 V33 저장**이 `merged = Object.assign(defaults(), prev, currentSettingsV33())`에서 `merged.frameCenterX`를 **`prev.frameCenterX`(base/top-level, =어제값)로 폴백** → `dennRouteSaveV`가 `.mobile.frameCenterX`를 그 base값으로 박제. 읽기(`applySettingsV33`/소비자)는 frameCenterX 우선 → 어제값으로 회귀.
- **왜 어제는 안 터졌나**: 데이터 전수 덤프로 확정 — **모든 백업에서 `.mobile.frameCenterX == base.frameCenterX == 50.129`**. 즉 `.mobile.frameCenterX`가 독립값으로 산 적이 없어 덮어도 무해(no-op)였음. 오늘 새 위치를 넣자 비로소 드러남. **데이터 복원으로 해결 불가 → 코드(d87d36a)가 정답.**
- **수정**: `currentSettingsV33`이 `guideCenterX/Y`·`currentFrameAnchorV48`과 동일하게 RM.pos에서 frameCenterX/Y 기록 → write↔read 필드 일치. 관리자 회귀 + 소비자 미반영 **동시 해결**.
- **타임라인 증거**: 저장 400ms에 ADM+LS=신규(15.95/2833) → 1800/2500ms에 예전값(50.129/2834,2835)으로 덮임. `.mobile.frameX=신규`인데 `frameCenterX만 base`. LS rev > IDB rev = V33 persist(LS-only)가 나중에 따로 씀.
- **PC누수 안전**: d87d36a는 과거 PC누수(부트 컨텍스트 불일치 저장이 RM.pos를 base로 씀)를 냈었으나, 지금은 **Option A가 부트 저장을 막아** 그 벡터 차단.

### B. 부트 자동저장 오염 (F5마다 .mobile→base, __opRev 폭증) → `b1234d5` (Option A)
- **근본**: 부트 중 `sgToggle()→saveSettingsV33`(L4099), applyControls input 디스패치→scheduleUserSaveV48 등 자동저장이 settle 전 발사 → transient 상태(currentSettingsV33 frameCenterX 누락 등)를 persist.
- **수정**: `window.__dennRoomBootBlockV` 플래그 — 관리자(`dennIsAdminSetupV`)에서 **첫 사용자 조작(isTrusted) 전까지** `saveSettingsV33`/`saveCurrentRoomKeyV48` persist 차단. 6초 안전망. 신규 스크립트 `denn-v109` + 두 함수 가드 1줄씩. F5마다 재무장.
- ★ **저장 함수만 막음** — 부트 로드의 IDB 화해(L2280 loadAdminState)·persist()·마이그(persistBoth)는 안 막음(별개).

### C. 소비자 캔버스 비율 불일치 (액자 잘림) → `3563637`
- **근본**: 소비자 실폰(≤860) 경로 **v106 coverFit**(L13717)이 캔버스를 **이미지 자연비율(0.80)**로 사이징(614폭 > area 390 → 잘림). 관리자 **v107**(L13799)은 고정 **0.462** 폰박스(`dennIsMobileEditCtxV && innerWidth>860`일 때만). 같은 위치%·bgScale인데 캔버스 비율이 달라 구도 어긋남.
- **수정**: v106 coverFit을 이미지비율 대신 **`RATIO=0.462` 고정** + area-contain fit으로 변경 → 소비자 = 관리자와 동일 비율. **검증됨**: 소비자 canvas 362x783(0.462), RM.pos 0.228,0.746 양쪽 일치 = 구도 보존.

---

## 3. 미해결 — 내일 (전부 렌더/정렬 계열, 저장 로직 안전)

### 3-1. 소비자 캔버스 레터박스 제거 (준비됨 = `be33fea`, 미push)
- 현재 0.462 통일(3563637)은 **height-기준 contain**이라 좁은 폰서 좌우 ~28px 레터박스(canvas 362 < area 390).
- 사용자 원칙: **"관리자 저장 비율(0.462)은 절대 깨면 안 됨"** + 레터박스 없이 폰 폭 꽉 채움.
- **준비된 수정(be33fea)**: v106 fit을 **width-기준 fill**로 — `var RATIO=0.462,w=aw,h=Math.round(w/RATIO);` (height-기준 `h=ah,w=h*RATIO;if(w>aw)…` 대체). 폭 꽉 참 + 0.462 불변 + 높이 넘침(crop/scroll 허용).
- **내일 첫 작업**: be33fea 로드 후 검증 — 폭채움·비율 0.462·**액자(y=0.746) 세로 넘침에 안 잘리는지**. 잘리면 정렬(상단 vs 중앙) 또는 세로 스크롤 결정. 검증 프로브는 §6 참조. 합격 시 push.

### 3-2. 가로↔세로 회전 시 저장값 문제
- 세로→가로→세로 후 위치가 달라짐(왕복). 06-22부터 미해결(__userMoved 토글 드리프트 의심). 저장 근본은 d87d36a로 잡혔으니, **읽기/회전 경로**에서 재확인 필요.

### 3-3. 가로화면(rotate-fs) 중앙정렬 풀림 (액자 상단으로)
- 06-23에 한 번 잡았다가(b66d93a/a2b6d38) 재발 정황. rotate-fs 캔버스 사이징(V107 `__dennLsArV`)·스크롤 센터(dennGatedRevealV/__ctr) 경로.

### 3-4. 전체 저장 검증 재실행
- **D (PC/모바일 격리)**: PC 토글서 저장 → base만 바뀌고 .mobile 불변(역도).
- **C (회전)**: 소비자 세로(.mobile)↔가로(base) 스왑 왕복 안정.
- (오늘 A=관리자저장+F5생존, B=소비자세로반영은 로컬 확인됨.)

---

## 4. ★★ 진단 여정 핵심 (왜 이렇게 길었나 + 교훈)

오늘 증상이 계속 바뀌어 보인 이유 = **여러 버그가 겹쳐 있었고**, 진단 중 **데이터까지 한 번 소실**됐기 때문. 실제 순서:
1. "F5 후 중앙회귀" → 처음엔 base 오염으로 오판. 실제는 **frameCenterX 필드 desync**(d87d36a).
2. 진단용 프로브 남발(setItem 후킹·quota 테스트·RM 상태변경) + 새로고침 반복 → **denn_admin의 roomBackgroundSettings가 23→1로 소실.** IDB-primary 머지(L2280)·자동저장이 줄어든 상태를 박제. **백업(premigrate2b/snapshots)에서 rbsKeys=23 복구.**
3. 그 후 **읽기전용·한 번에 하나·트리거 명시** 규칙으로 전환 → 차근차근 범인 격리:
   - "저장 안 됨"으로 보인 것들 = bootBlock(Option A)·roomSavePaused·opener.persistState(클로버 오판)·**지연 V33 저장**까지 차례로 배제/확정.
   - 최종 = **지연 V33 저장의 frameCenterX base 폴백**(d87d36a) + **저장이 1.3초 지연 반영**(너무 일찍 찍어 옛값 본 착시).
4. 데이터 전수 덤프로 **"어제도 .mobile==base였다"** 확정 → 코드 버그(가려져 있던 것)임을 입증.

---

## 5. ★ 함정/교훈 (오늘)
- **데이터 진단은 순수 읽기 전용만.** localStorage.setItem(임시 키도)·Storage 후킹·RM 상태변경·rmRender/save/load 호출 금지(persist 유발). 새로고침은 loadAdminState(IDB-primary)+persist+마이그를 돌려 **손상본을 양쪽 스토어에 박제**. 진단 전 **denn_admin+IDB(denn_admin_state) 둘 다 백업**, **단일 탭**(크로스탭 storage 리스너 차단).
- **저장이 ~1.3초 지연 반영** — 저장 직후 즉시 프로브는 옛값을 봄. 검증은 **3초 대기 후**.
- **IDB-primary 부트(L2280 `dbGet || localStorage`, rev 무시)** — IDB가 stale이면 F5에 LS를 덮음. (이번 버그는 아니었지만 안전망으로 loadAdminState rev-머지 검토 여지.)
- **rmSizeCanvas 다겹 래핑**: base(L1900 이미지비율 contain) → v47 → v72(bg aspect) → v106(실폰 cover, L13717) → v107(관리자 폰박스 0.462, L13799). 컨텍스트별로 다른 래퍼가 최종 비율 결정.
- **add+revert로 깨끗이 되돌림** — 미push 상태라 reset 대신 push 범위(`3563637:main`)로 보류 커밋 분리.

---

## 6. 내일 첫 작업용 검증 프로브 (읽기 전용)

**3-1 레터박스(be33fea 로드 후, 소비자 세로뷰):**
```js
(function(){var a=document.getElementById('rm-canvas-area'),c=document.getElementById('rm-canvas');var ar=a.getBoundingClientRect(),cr=c.getBoundingClientRect();var p=(window.RM&&window.RM.pos)||{x:.5,y:.5};var fy=cr.top+p.y*cr.height;console.log('areaW:',a.clientWidth,'| canvas:',c.width+'x'+c.height,'| 비율:',(c.width/c.height).toFixed(3),'| 폭채움?:',c.width>=a.clientWidth-1,'| 세로넘침:',(c.height-a.clientHeight)+'px','| canvas top/bot(area):',Math.round(cr.top-ar.top)+'/'+Math.round(cr.bottom-ar.bottom),'| 액자세로보임?:',fy>=ar.top&&fy<=ar.bottom);})()
```
합격: `폭채움?:true` + `비율:0.46x` + `액자세로보임?:true`.

**저장 회귀 없음(관리자, 저장 후 3초·F5):**
```js
(function(){var k='gb178090163762667a6ee41aea468',A=JSON.parse(localStorage.getItem('denn_admin')||'{}'),v=(A.roomBackgroundSettings||{})[k]||{},m=v.mobile||{};console.log('.mobile fCX/fX:',m.frameCenterX,'/',m.frameX,'| base fCX:',v.frameCenterX,'| __opRev:',v.__opRev);})()
```
합격: 저장 3초후·F5후 `.mobile.fCX`=옮긴 값, base 불변.

---

## 7. 참조
- 직전: docs/2026-06-23-session-handoff.md
- 핵심 커밋: `b1234d5`(Option A) · `1951b06`(d87d36a) · `3563637`(캔버스 0.462) [origin], `be33fea`(폭-fill, 로컬 보류)
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[localStorage quota 데드락]] [[feedback_verification_workflow]]
