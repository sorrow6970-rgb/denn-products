# 2026-07-05 세션 핸드오프 (오후) — 사이즈칩 근본해결·프레임 스케일/전체화면·룸 세로가로 분리(WIP)

> 소비자: **https://design.dennproducts.com** / 관리자: **/denn-admin.html** · 오전분: [2026-07-05](2026-07-05-session-handoff.md)
> ★이 PC 배포: `cd C:\repo\denn-products && FIREPIT_VERSION=1 C:\Users\user\firebase-cli\firebase.exe deploy --only hosting --non-interactive`
> 검증: `?debug=1` 하단 boot 박스(ADM/FS/chips 등) + 좌상단 뷰포트 패널. 실기기(삼성/아이폰) × 세로/가로 실측 필수.

---

## 오늘 한 것 (전부 배포·커밋·push 완료)

### 1. ★신규/아이폰 사이즈칩 미표시 — 근본해결 (오전 최우선 종결) · `9744e8c`
- **증상**: 발행본(frameSizes=9) 로드되는데 사이즈 칩 0개("먼저 액자 사이즈를 선택해 주세요"만). 캐시 있는 기기만 정상.
- **진단 여정**(boot 박스 다단계 계측): `FS=0`(필터0)·`★ERR`없음(init throw 아님) → `pubFS=9 lsFS=0 initFS=0 initPub=N mdl=0`(발행본은 멀쩡, init이 쓰는 ADM이 빈 객체) → `ADMlog[0]:(none)`(setAdmin/persist류 아님).
- **근본원인**: `Storage.prototype.setItem` 오버라이드(룸뷰 데이터 보호 가드, L6247)가 **부팅 초기 ADM이 비었을 때 캡처된 빈 스냅샷** + 세이브-포즈(~1400ms) 활성 상태에서 load 핸들러의 발행본 `denn_admin` 저장을 가로채 → 저장 차단(lsFS=0) + `restoreAdminSnapshotV48(빈 스냅샷)` → **window.ADM={} (전역 var라 init이 읽는 ADM도 비워짐)** → FS=0. 느린 아이폰서만 타이밍 겹쳐 재현.
- **수정**: (a) setItem 가드는 '유효 스냅샷(frameSizes 있음) + 들어오는 값이 더 빈약할 때'만 차단, (b) restoreAdminSnapshotV48는 데이터 있는 ADM을 빈 스냅샷으로 안 덮음. 룸뷰 보호 기능 유지.
- **검증**: 아이폰(iOS18.7) 캐시삭제 후 `FS=8 chips=8`, 액자 정상 렌더 확인. **종결.**

### 2. 프레임 프리뷰 스케일 재정의 · `8efd1dc`,`4b79ad9`,`60b1302`
- **원인**: 모바일 scale이 고정 `MOB_CAP=0.96`으로만 제한 + `fit`의 1.45캡에 묶여 넓은 화면서 액자가 화면을 못 채우고, 슬라이더 숫자(135→110 점프)가 무의미.
- **수정**(`applyPreviewScale` L10214~): `noClipMax = min(__dennFW/s.w, __dennFH/s.h)`(1.45캡 없는 실제 화면-딱맞 배율) 기준으로. **모바일 100% = noClipMax×1.57**(세로 액자가 작게 잡혀 시원하게), **가로 액자는 ×0.75 보정**(좌우 삐짐 방지, `__landscM`). 상한: 세로 1.8·가로 1.35배. 슬라이더 **50~100%(기본100)**, fillU 동적max 제거.
- **중앙 보정**: `#page-frame.main.on` `padding-bottom 126→173px`(전체화면 버튼 +1행으로 액자가 아래로 밀리던 것).

### 3. 프레임툴 "전체화면 보기" 신규 · `43c3c90`,`b8e54e3`,`0d9ddbd`
- 소비자용 크게보기(편집X). `#frameCanvas` 스냅샷(toDataURL)을 오버레이에 contain으로 크게. **방향-반응**(세로면 세로, 폰 가로 돌리면 가로 자동). **밝은 갤러리 배경**(검정→중립). ✕/여백탭 종료.
- **주소창 숨김**: 클릭 즉시 `requestFullscreen`(★toDataURL 前 호출해야 삼성/크롬서 허용). iOS 미지원(오버레이만).
- V108 편집기 강제세로(`framePortraitPrompt(...,false)` L14568)를 전체화면-보기 중 스킵(`__dennFrameFsViewV`).
- 버튼: 액션스택(L397) + 모바일 msheet 액션바 전폭(`denn-msheet-ab-fsview`, L12925).

### 4. 룸뷰 전체화면 세로/가로 버튼 분리 — **WIP, 이슈 있음** · `b53f4d1`,`01bba57`
- 세로=`openRoomFullscreenView`/`setRoomFullscreenLayout(true)`, 가로=`dennEnterFsLandscapeV`. 하단 액션 그룹(`rm-right-actions`)으로 이동, `rm-action-btn` 스타일(가로=골드). 클릭 즉시 requestFullscreen(주소창 숨김). 전체화면 종료 플로팅(`rm-fs-exit-float`). `hideFsBtn` 모바일 강제숨김 제거. 옛 상단 플로팅(`#denn-fs-enter-btn`)·`#rm-fullscreen-btn` 상단CSS 제거.

---

## ▶ 내일 이어서 (미해결 — 우선순위)

### 1. 🔴 룸 세로/가로 버튼 순서·배치 이상 (오늘 낸 회귀)
- 증상: 세로→가로 인접·상단이어야 하는데 **기본설정/돌아가기와 섞여** 배치(가로가 세로보다 위, 기본설정 아래 세로 등).
- 원인: 모바일 `.denn-rm-bar .rm-action-btn:not(.reset):not(.order):not(.save){order:2!important}`(특이도 ~150)가 내 `#room-modal .rm-action-fs{order:-1!important}`(특이도 110)을 **특이도로 이김** → fs버튼이 order:2(=돌아가기와 동급). `.rm-right-actions`는 `grid 1fr 1fr`(L14061).
- **수정안**: order 규칙에 `:not(.rm-action-fs)` 추가 + `.rm-action-fs` 특이도↑(`#room-modal .denn-rm-bar .rm-action-btn.rm-action-fs{order:-2!important}`) 또는 fs 2개를 전폭(`grid-column:1/-1`)로 상단 2줄 배치. 순서는 DOM(fsP→fsL)이 이미 세로→가로.

### 2. 🔴 세로 전체화면 시 하단 메뉴 잔존 (오늘 낸 이슈)
- 증상: 세로 전체화면 눌러도 **하단바 메뉴가 그대로 뜨고 주소창만 사라짐**(캔버스-only가 안 됨).
- 원인: 하단바 `#room-modal .denn-rm-bar{position:absolute;bottom:0;z-index:30}`(L14053)가 `denn-room-fullscreen-active` 중에도 **안 숨겨짐**. (이전엔 모바일서 portrait 전체화면을 hideFsBtn로 사실상 안 썼음 → 미노출.)
- **수정안**: `#room-modal.denn-room-fullscreen-active .denn-rm-bar{display:none!important}` (+ 필요시 다른 잔존 메뉴 요소). 종료는 `rm-fs-exit-float`(우상단) 사용.

### 3. 가로 전체화면 문제 — 기존 이슈(파악만, 오늘 미수정)
- 사용자: "가로 전체화면 문제는 앞선 핸드오프에 있음". 이전 핸드오프의 룸 가로확대/rotate-fs 관련(오전 핸드오프 §4 "룸뷰 가로 확대 엄청됨: rmRender mobileLandscape/cap") 참조. 세로/가로 버튼 정리(1,2) 후 재점검.

### 4. 프레임 중앙(액자 위치) = 운영자 공통설정
- 룸뷰 액자 위치는 어드민 저장값이라 소비자 코드로 못 바꿈. 조정 필요 시 관리자에서. (사용자 확인: "그냥 둬".)
- 참고: 하단바에 버튼 추가되며 **관리자 룸셋업 메뉴영역도 확장** 필요할 수 있음(버튼 늘어남) — 미확인.

### 5. (이전 핸드오프 잔여) 룸뷰 가로확대(§4)·새로고침 깜빡임(§6)·카카오 프레임 작음 등 — 오전 핸드오프 참조.

---

## 환경/재개 메모
- 오늘 커밋(오후): `9744e8c`(사이즈칩)·`8efd1dc`·`60b1302`·`43c3c90`·`4b79ad9`·`b8e54e3`·`0d9ddbd`·`b53f4d1`·`01bba57`. 전부 origin/main push, 라이브 배포됨.
- 스케일 로직 핵심: `applyPreviewScale`의 `noClipMax`/`FILL_M`/`__landscM`(L10214~). 슬라이더 min50 max100 기본100(L403), config(L10050).
- 룸 전체화면: `setRoomFullscreenLayout`(L3668)·`ensureRoomFsExitBtn`(신규)·`dennEnterFsLandscapeV`(L14446)·버튼생성(L13895). CSS `.rm-action-fs`(L3153).
- 검증은 실기기 우선(삼성 확인 중, 아이폰 재점검 대기). Chrome 확장 미연결로 데스크톱 자동검증 불가.
