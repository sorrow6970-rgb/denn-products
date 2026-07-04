# 2026-07-05 세션 핸드오프 — 발행본 다이어트(A해결)·프레임툴 고정·룸dvh + 미해결(아이폰 사이즈칩·스케일)

> 소비자: **https://design.dennproducts.com** / 관리자: **/denn-admin.html** · 이전: [2026-07-04](2026-07-04-session-handoff.md)
> ★이 PC 배포 가능: `cd C:\repo\denn-products && FIREPIT_VERSION=1 C:\Users\user\firebase-cli\firebase.exe deploy --only hosting --non-interactive` (상세: 07-04 핸드오프 §1)

---

## 오늘 한 것 (전부 라이브 배포·커밋 완료, GitHub push됨)

### 1. ★A(신규/모바일 발행본 JSON 미로딩) 근본해결 — 발행 payload 다이어트
- **실제 원인**: 하드실패 아님, `published/state.json`이 **492KB**(그중 base64 이미지 351KB=71%)라 느린 모바일서 로딩 지연. 캐시 있는 기기(운영자 폰/PC)만 즉시 표시.
- **수정**(`denn-admin.html` `dennExternalizeState`): 발행 직전 state 내 base64 이미지를 Storage(`published/assets/`, 내용해시 dedup)로 외부화+URL 치환. → 운영자 재발행 후 **492KB→142KB(base64 0), 검증 완료**. 소비자 코드 무변경.
- **아이폰 데이터 로드 정상 확인**: `?debug=1` 부트박스 `ADM=published frameSizes=9 tpl=31` (iOS 18.7). **A는 종결.**

### 2. 프레임툴 "고정" (사용자 결정 — 소비자 혼동 방지)
- 그동안 dvh/lvh 뷰포트 단위로 주소창 토글 시 흔들림/점프 반복 → **페이지 스크롤 잠금으로 주소창 고정** 방식 채택(룸뷰 `denn-room-scroll-lock`과 동일 개념).
- `html:has(#page-frame.main.on){overflow:hidden;overscroll-behavior:none}` + 컨테이너 `svh`(고정 가시높이) (`denn-mockup-tool.html` L12728 부근). 중앙정렬은 기존 flex center.
- 고정 후 액자 축소 보정: 하단여백 `158→126px`, 스케일러 `MOB_CAP 0.9→0.96`, 모바일 배율 `.92→.97` (L10207-10208). **크기/중앙 적절성은 미검증(아이폰 사이즈 미선택 상태라 판단 보류).**

### 3. 룸뷰 모바일 높이 vh→dvh
- `#room-modal>div` 등이 `100vh`라 삼성 인터넷 하단 주소창 뜰 때 하단메뉴 잘림 → `dvh`로 전환(vh 폴백). **삼성서 안 잘림 확인.** `#room-modal` 스코프.

### 4. measure-and-fit 리팩터 1단계 — 프레임 mobile 판정 너비→터치
- `previewMode()`(L10095): `innerWidth<=860` → `pointer:coarse && min(w,h)<=900`이면 mobile. 가로 폰(891)이 데스크톱으로 오판돼 액자 과대되던 것 방지(아이폰 가로 포함). 진짜 데스크톱만 너비 분기.

### 5. 진단 도구 (`?debug=1`)
- **하단 박스**: `ADM=published/local · frameSizes · tpl · UA` + **둘째 줄 `FS=<개수> chips=<개수> ★ERR <init에러>`**(오늘 추가). 폰서 콘솔 없이 원인 파악.
- **좌상단 패널**: inner/visualViewport/lvh·svh·dvh 지원/미디어분기(>860)/headerH/area.clientH/scale 실시간. 둘 다 `pointer-events:none`.

---

## ▶ 내일 이어서 (미해결 — 우선순위)

### 1. 🔴 신규/아이폰: frameSizes=9인데 **사이즈 칩이 하나도 안 뜸** (최우선)
- 증상: 아이폰(캐시 없음)서 데이터는 로드(frameSizes=9)됐는데, 사이즈 선택 UI(`#frame-sz-chips`)가 비어 "먼저 액자 사이즈를 선택해 주세요"만 뜸. 캐시 있는 기기만 정상.
- 흐름: `init()`(L937)→`FS=ADM.frameSizes.filter(!hideInMockup)`(L942, 발행본은 9중 8개 보임)→`buildUI()`(L979)→칩 `FS.map`(L983). **정상이면 칩 8개.**
- 유력 가설: **iOS서 init()이 도중 throw** → buildUI 미실행 → 칩 빈 채. (오늘 배포한 `FS/chips/★ERR` 진단으로 확정 가능.)
- **다음 액션**: 아이폰 `?debug=1` 하단박스 **둘째 줄** 스샷 확보 → `FS=0`(FS 문제) / `chips=0 FS=8`(빌드 문제) / `★ERR ...`(init 죽음=근본) 판별 후 수정.

### 2. 스케일 슬라이더 요청 (사용자, 미착수)
- **(a)** 프레임툴 **가로 회전 시 액자 스케일 기본 100%** 로.
- **(b)** **세로에서 ~155% 이상 액자가 잘림** → 슬라이더 최대를 "화면 꽉 차는 지점(fillU, L10210-10212 로직)"으로 제한해 잘리는 구간 차단. 현재 `#frame-preview-scale`/미니슬라이더 max 동적 계산부 점검.

### 3. 신규 방문자 기본 액자 표시 여부 (A/B 결정 대기)
- 현재 신규는 "사이즈 선택" 온보딩(`__dennSizeUnset` 게이트, L991). 사용자는 **기본 액자 자동 표시(B)** 를 원하는 듯 → 확정 시 신규 로드 시 기본 사이즈+템플릿 자동선택 추가. ※단 1번(칩 미표시) 먼저 해결돼야 의미 있음.

### 4. 룸뷰 가로 확대 엄청됨 (삼성/크롬 큼, 카카오 정상)
- 원인: 가로 폰 너비>720이라 룸 모바일 CSS(@max720)/@max480 미적용 → 데스크톱 룸 레이아웃 + `rmRender`(L3901) 가로 스케일. 카카오(851)도 >720이나 정상이라 rmRender의 mobileLandscape(L3903)/cap 로직 추가 확인 필요. measure-and-fit 원리로 룸에도 적용 예정(2단계).

### 5. 프레임툴 고정 후 크기/중앙 최종 검증
- 아이폰 사이즈칩 해결 후, 액자 뜬 상태로 크기·중앙 적절성 확인. 부족하면 여백(126)·MOB_CAP(0.96)·배율(.97) 재조정.

### 6. (낮음) 카카오 프레임 작음(웹뷰 높이 731로 실제 작음, 하단여백 축소로 일부 완화됨) · 새로고침 잔상 깜빡임(로딩 커버 예정) · 룸 캔버스 색 반전(일시적, 새로고침 사라짐 — 재발 시 스샷).

### 7. (신규 기능 요청) 프레임툴 전체화면보기 — 단순 크게보기용
- 프레임툴에도 **전체화면보기** 버튼 추가. **단순 보기 전용**(편집·조작 없음), 액자를 **화면에 꽉 차게** 표시.
- **가로 액자면 가로로 꽉 차게**(회전/방향에 맞춰 화면 최대 채움). 그냥 크게 확인하는 용도.
- 참고 구현: 룸뷰의 전체화면(`denn-room-fullscreen-active`/`denn-rotate-fs`, L3150·3174 등)과 아이폰 CSS 폴백(`setRoomFullscreenLayout`, `dennEnterFsLandscapeV` L14360) 패턴 재사용 검토. 프레임 캔버스(`#frameCanvas`)를 뷰포트 꽉 채워 contain/cover로 표시.

---

## 환경/재개 메모
- 오늘 커밋 13개 GitHub push 완료(origin/main). 다른 PC서 `git pull`로 이어받기 가능.
- 검증 흐름: `?debug=1` 하단박스(ADM/FS/chips/ERR) + 좌상단 뷰포트 패널 활용. 카카오·삼성·아이폰 × 세로·가로 실측이 레이아웃 수정의 근거.
- 배포는 이 PC 가능(위). 데이터 변경(재발행)은 운영자가 관리자 📢게시.
