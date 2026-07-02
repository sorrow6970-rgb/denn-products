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
| `6028817` | **사이즈앵커가 스케일 조작(um=1)에도 유지** — 게이트 `!userMoved`→`!__anchorImgV` + 앵커값 always-run | ✓ 검증완료 |
| `2530ae2` | **공유 stale 방지**(dennShareCreate=localStorage roomBackgroundSettings 덮어씀) + **가로 회전 시 방향별 기준스케일(sg) 재적용** | ✓ 검증완료 |
| `e46f59f` | **양방향 사이즈↔템플릿** — 사이즈 미선택 시 템플릿 클릭하면 저장 사이즈 자동적용(denn-v110 최외곽 래퍼) | ✓ 검증완료 |

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

## 2b. ★★ 2차 버그 해결 — 사이즈앵커가 스케일 조작 시 꺼짐 (`6028817`)
### 증상
소비자가 **기준스케일 슬라이더를 만지면**(um=1) 운영자 사이즈앵커(상단/중앙/하단)가 **통째로 꺼져**, 그 뒤 사이즈를 바꿔도 하단정렬 안 되고 작은 사이즈가 공중에 뜸. (초기 진입 후 스케일/사이즈 건드리면 재현. 진단 오버레이 `um=1 refH=- op=0 umBy=:2207`(input 리스너)로 확정.)
### 근본
- drawFrame 핀 게이트가 `!RM.__userMoved` → 스케일/사이즈 조작(input 리스너 L2207가 sg-/rm- trusted input에 um=true)도 앵커 해제.
- 앵커값(refH·방향)이 `!um` force 블록(L4160) 안에만 세팅 → um=1이면 refH가 안 실려 op=0.
### 수정 (옵션1 안전형 — 사용자 선택)
- **핀 게이트 `!RM.__userMoved`→`!RM.__anchorImgV`**(L4098): `__anchorImgV`는 **직접 드래그로만** 세팅(dennCaptureUserAnchorV; 스케일/핀치/사이즈선택 무관). → 스케일·사이즈 조정은 앵커 유지, **직접 드래그만** 앵커 해제(그 위치 자유, 튐 없음).
- **앵커값 always-run 블록**(force 블록 직후, 소비자·`!admin`): `RM.__opAnchorRefHV`+`rm-size-anchor`+`RM.__opImgPosV`를 **um 무관** 운영자 프리셋서 세팅. 위치/스케일/배경은 여전히 force(`!um`)만 강제(자유조작 보존).
- 핀은 **스테이트리스**(매 렌더 운영자 refH 재계산)라 image-anchor 재글루와 충돌/드리프트 없음. 방향은 `(ay-0.5)` 부호로 상단(0)/하단(1) 자동, 중앙(0.5) 무영향. **배경별 앵커설정 존중.** 관리자 편집 브랜치는 원본 유지(위험0).
### ★설계 함정 (검토 중 폐기한 접근)
- 단순 "핀 항상 적용"(`!um` 제거만) → **드래그 후 놓는 순간 핀이 튕김**(cy=드래그중심+`(ay-.5)(refH-fh)` 오프셋). 폐기.
- 세션 엣지 앵커(`__anchorYabs` fh-키잉) → **image-anchor 블록이 매 렌더 중심을 재글루 → 스테이트풀 엣지와 싸워 드리프트**. 폐기. **결론=스테이트리스 핀 + 드래그(`__anchorImgV`)만 예외가 이 아키텍처에 맞음.**

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

## 3b. ★ 실운영 공유 stale 점검 결과 (Explore 에이전트 매핑)
**실운영엔 Firebase 자동 발행이 아예 없음.** 운영자 저장(saveCurrentRoomKeyV48/saveSettingsV33→writeAdminV48)은 **localStorage `denn_admin` + IndexedDB(기기 로컬)** 뿐. denn-admin `persistState`도 로컬 전용, Firebase "auto-sync"는 **이미지 오프로딩만**(templates/·proofs/·placeholders/), 상태 JSON 미업로드. 소비자(denn-mockup-tool, `?share=` 없이)는 **localStorage/IndexedDB만** 읽음(loadAdminState/loadAdminFresh) — 부팅 Firebase fetch 없음.
- 소비자가 운영자 데이터를 받는 경로 = **오직 수동 링크**: `?share=`(dennShareCreate→temp-share JSON, **window.S 공유**) / `?space=`(암호화 Firestore spaces/{token}, 단일 씬) / 같은 브라우저.
- ⚠️**결론: 실제 소비자도 stale 위험 있음** — `?share=` 링크가 `window.S`를 공유하므로, 운영자가 mockup 편집기 저장 후 denn-admin 새로고침 없이 링크 만들면 refH 없는 옛 데이터가 감. **권장 수정=dennShareCreate가 stale window.S 대신 localStorage(denn_admin)를 기본으로 읽기**(우리가 우회로 쓴 `{state:...}`를 기본값화). 미착수(다음 후보).
- Firebase config: bucket `denn-products.firebasestorage.app`, 익명 auth. 고정경로=templates/·placeholders/·proofs/·temp-share/(임시)·Firestore spaces/{token}.

---

## 3c. ★ 공유 stale 수정 + 가로 회전 sg 재적용 완료 (`2530ae2`, 검증✓)
### (1) dennShareCreate stale 방지 (denn-admin L14713)
`state=opts.state||window.S`였던 것 → `opts.state` 없으면 **window.S 베이스 + localStorage['denn_admin']의 최신 `roomBackgroundSettings` 덮어씀**. window.S는 denn-admin 로드 스냅샷이라 mockup 편집기(별도 탭/iframe) 저장이 반영 안 됨(storage 리스너 없음). roomBackgroundSettings는 경량 설정값(이미지 없음)이라 덮어도 공유 안 무거워짐(검증: 491KB). 이미지는 window.S의 Firebase 오프로드 URL 유지. → **운영자가 denn-admin 새로고침 없이 평소 공유해도 소비자가 최신 refH 받음.**
### (2) 가로 회전 시 방향별 sg 재적용 (denn-mockup, always-run 블록)
증상: 소비자가 세로서 스케일 슬라이더 만지면(um=1) → 가로 회전 시 액자 바닥 뜸. 원인=**sg(기준스케일)는 세로(.mobile)/가로(base)가 다른데(예 세로50/가로74), um=1이면 force가 스킵돼 회전해도 옛 방향 sg 잔존** → 액자 크기 틀림(fh∝sg) → 앵커 바닥 어긋남(앵커 바닥=cy_iy+0.5·refH·K, K∝sg). 진단=오버레이 성공(sg=74)/실패(sg=50) fh비율 일치. 수정=**`RM.__lastOriV` 비교로 '방향 전환 시에만'** 그 방향 운영자 `guideScale` 재적용(um 무관). ★한 방향 안에선 소비자 핀치-줌(sg-scale) 유지 — 매 렌더 강제하면 모바일 핀치 먹통되므로 회전 시에만. ★★교훈=**사이즈앵커 절대위치(바닥)는 sg에 종속**(cm기반이라도 K∝sg). 소비자가 sg를 바꾸면 앵커 바닥이 드리프트 → 방향별 sg 일관성이 앵커 정확도의 전제. (image기반 바닥앵커=frameAnchorImgY는 07-01 롤백됨, 크로스컨텍스트 픽셀오차.)

---

## 3d. ★ 양방향 사이즈↔템플릿 선택 완료 (`e46f59f`, 검증✓)
사이즈 미선택(`__dennSizeUnset`=전체 브라우징) 상태에서 템플릿 클릭 시 **무반응이던 문제**(캔버스가 게이트 오버레이에 가려짐). 수정=**최외곽 `selFTplByRef` 래퍼**(`denn-v110-template-to-size`, gate 완화 블록 13248 직후 삽입):
- `__dennSizeUnset` 시 클릭 템플릿의 저장 사이즈(sizeId/frameSizeId/frameSizeIds/size.* 등, `tplKeys`로 추출) → `window.FS`와 매칭해 인덱스 해석 → 그 사이즈 칩으로 `window.selFSz(chip,idx)` 호출(게이트 해제+그리드 동기 재빌드) → 재빌드된 그리드서 `byIdxOnclick('this,'+i+')')`로 카드 찾아 `oldTplSel(card,i)` 선택.
- 특정 사이즈 없는 전체사이즈 공용 템플릿 → `window.__dennSelectSizeToastV()` 반투명 안내(1.6s 페이드) 후 종료(폴백).
- 사이즈 이미 선택됐으면 기존 동작 무영향. ★자체 완결(V95/본체 IIFE 스코프 함수 의존 안 함 — tplKeys/sizeKeys 인라인 복제). ★selFTplByRef 다중래핑(6522~12380) 위에 최외곽으로 얹어 모든 클릭 진입점 커버.

---

## 6. 다음 작업 후보
1. 진단 오버레이/감시자(`?dbgUM=1`) 제거(원인 다 잡히면).
2. (선택) 소비자 핀치-줌(sg 변경) 시 앵커 바닥 드리프트 — 현재는 방향 전환서만 리셋. 완전 고정 원하면 image기반 바닥앵커 재검토(위험, 07-01 롤백 이력).

---

## 7. 환경
- dev서버 no-cache([[reference_devserver_nocache]], 포트 8000) + cloudflared 터널(`C:\Users\써드플로어\tools\cloudflared.exe`, URL 매번 랜덤). 오늘 터널=`toronto-venture-newspapers-events.trycloudflare.com`(재시작 시 바뀜).
- 공유=위 §3 한 줄(localStorage 직접). 검증=실폰 필수(PC DevTools 에뮬은 fullscreen/orientation 미흉내).
