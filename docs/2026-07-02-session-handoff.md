# 2026-07-02 세션 핸드오프 — ★사이즈 하단앵커 refH 전달 버그 해결 (세로✓/가로✓)

> HEAD = **`35140bb`** (push됨). 안정 체크포인트 = **`b07257a`**(수정 본체). 진단 오버레이 = `75b4068`.
> 관련 메모리: [[project_mobile_pc_guide_settings_attempt]] [[reference_devserver_nocache]] [[project_image_anchored_frame]]

---

## 1. 오늘 커밋
| 커밋 | 내용 | 상태 |
|---|---|---|
| `75b4068` | **`?dbgUM=1` 온스크린 진단 오버레이 재삽입**(기본 OFF, 게이트 밖 no-op). anc[] 필드: `um umBy ay cmH refH fh fy sz sg mb cv iy bg op`. RM 정의 직후 IIFE + drawFrame frameHit 직전 push. sessionStorage 래치(share import reload로 쿼리 지워져도 유지). | ✓ |
| `b07257a` | **★사이즈 하단앵커 refH 전달 수정(3곳)** | ✓ 검증완료 |
| `35140bb` | 진단 오버레이에 `__userMoved` 감시자 + `umBy`(um 켠 라인번호) 추가 | ✓ |

---

## 2. ★★ 해결된 버그 — "사이즈 여러 개 선택하면 액자가 위로 올라감"
### 증상
소비자가 다른 사이즈(A2→A3→b5) 선택 시, 작은 사이즈가 **하단 정렬 안 되고 중심에 떠오름**(위로 올라감). 세로·가로 전부.

### 근본 원인 (진단 오버레이로 확정)
운영자 기준높이 `frameAnchorRefCmH`(A2=60cm)가 **소비자에 전달 안 됨** → drawFrame 하단앵커 핀 조건 `RM.__opAnchorRefHV>0` 이 false → 핀 미작동 → 모든 사이즈가 동일 중심(image-anchor iy)에 그려짐. 오버레이에 `refH=- op=0`으로 딱 찍힘. (`frameSizeAnchor`=ay=1(하단)은 전달됨 → ay는 맞는데 refH만 빠진 게 핵심 단서.)

**전달이 3중으로 막혀 있었음:**
1. `DENN_MOBILE_FIELDS_V`(L~3286) 목록에 `frameAnchorRefCmH` **누락** → 모바일 편집 저장 시 `dennPickMobileFieldsV`가 `.mobile`서 드롭.
2. 모바일 편집 시 `dennRouteSaveV`가 base를 동결(`keep=prev`) → **base에도 미기록**(소비자 가로=base 읽기라 가로 영원히 실패).
3. 두 번째 저장 경로 `currentRoomSettingsV48`(L~5660)이 `frameAnchorRefCmH`를 **아예 미계산**(prev 폴백만 의존 → stale/null).

### 수정 (`b07257a`, 3곳)
- `DENN_MOBILE_FIELDS_V`에 `'frameAnchorRefCmH'` 추가(.mobile 기록 + 세로 병합 획득).
- `dennRouteSaveV`: 앵커쌍(`frameSizeAnchor`+`frameAnchorRefCmH`)을 **base에도 기록**(기기무관 불변량이므로. 소비자 가로/PC=base 읽기서도 걸림).
- `currentRoomSettingsV48`: `frameAnchorRefCmH` 라이브 계산(V33 L3125와 대칭, `RM.__lastCmH` 사용).

### 검증 결과 (실폰, 오버레이 숫자)
- 수정 전: `refH=- op=0`, b5 fy=0.476/0.489(떠 있음).
- 수정 후: **`refH=60 op=1`**, b5 fy=0.558(가로)/0.545(세로) → **바닥이 선반 라인에 붙음**. 세로·가로 둘 다 A2↔b5 바닥 고정 확인.

---

## 3. ★ 전달 함정 (오늘 최대 삽질) — window.S stale
운영자 데이터는 **저장은 정상**(localStorage `denn_admin`의 운영자키 `gb178...`에 base.refH=60, mobile.refH=60 확인됨). 그런데 **`dennShareCreate()`가 `window.S`를 공유**하는데, mockup 편집기 저장은 **localStorage에만** 쓰고 window.S엔 안 실림 → **denn-admin 새로고침 안 하면 공유가 stale**(refH 없는 옛 데이터가 폰으로).

### 우회 (검증에 사용, 확실)
denn-admin 콘솔에서 **localStorage 직접 공유**:
```js
dennShareCreate({state:JSON.parse(localStorage.getItem('denn_admin'))}).then(u=>{const url=u.replace('.html#','.html?dbgUM=1#');console.log('▶',url);try{copy(url)}catch(e){}});
```
`dennShareCreate`는 `state=opts.state||window.S`라 opts.state 우선 → 최신 localStorage(refH=60) 확실히 업로드. `.html#`→`.html?dbgUM=1#` 치환으로 진단 자동 ON.
- ⚠️ **`dennShareCreate`는 denn-admin.html에만 정의**(편집기/목업 콘솔에선 undefined). 반드시 denn-admin 탭 콘솔.
- ⚠️ **실운영 공유 경로도 이 stale 이슈가 있는지 미점검**(다음 후보) — 실제 소비자에게도 mockup편집기 저장이 window.S 미반영이면 동일 문제 가능. denn-admin 저장 시 window.S↔localStorage 동기 여부 확인 필요.

---

## 4. 진단 오버레이 사용법 (게이트로 유지 중)
- URL에 `?dbgUM=1` (share hash면 `?dbgUM=1#share=...` — `#` **앞에**). sessionStorage 래치라 reload 후에도 유지.
- 좌상단 초록 `anc[P/L(fs)] um= umBy= ay= cmH= refH= fh= fy= sz= sg= mb= cv= iy= bg= op=`.
- 판정: `op=1 refH=60`이면 전달 OK. `um=1`이면 force OFF(운영자 프리셋 미적용)—`umBy`에 켠 라인번호 찍힘.
- ★모바일 함정: 캔버스 살짝 터치(ontouchmove L2210)·핀치(L3966)·휠도 `um=1` 켬 → 검증 시 **캔버스/슬라이더 만지지 말 것**. um=1이면 "기본설정으로"(dennReqMirrorV, um=0 복귀) 후 재측정.

---

## 5. 폐기/주의
- **um 거짓양성 아님**(감시자 확인) — um=1은 실제 터치. 검증 시 손대지 말 것.
- 진단 오버레이·감시자는 **게이트로 무해**하므로 유지(사용자 결정). 제거는 추후.

---

## 6. 다음 작업 후보
1. **실운영 공유 경로의 window.S stale 점검**(§3) — 실제 소비자도 refH 못 받을 가능성.
2. §6(전 핸드오프) **사이즈 미선택+템플릿 선택 시 저장 사이즈 자동 적용** — 미착수.
3. 진단 오버레이/감시자 제거(원인 다 잡히면).

---

## 7. 환경
- dev서버 no-cache([[reference_devserver_nocache]], 포트 8000) + cloudflared 터널(`C:\Users\써드플로어\tools\cloudflared.exe`, URL 매번 랜덤). 오늘 터널=`toronto-venture-newspapers-events.trycloudflare.com`(재시작 시 바뀜).
- 공유=위 §3 한 줄(localStorage 직접). 검증=실폰 필수(PC DevTools 에뮬은 fullscreen/orientation 미흉내).
