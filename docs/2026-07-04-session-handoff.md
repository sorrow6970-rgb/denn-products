# 2026-07-04 세션 핸드오프 — 이 PC 배포 셋업 · A~C 라이브 · dvh→lvh · 발행본 payload 다이어트(A 근본해결)

> 소비자 라이브: **https://design.dennproducts.com** / 관리자: **https://design.dennproducts.com/denn-admin.html**
> (Firebase 기본: denn-products.web.app 동일)
> 이전 핸드오프: [2026-07-03](2026-07-03-handoff.md)

---

## 오늘 한 것 (전부 라이브 배포됨)

### 1. ★이 PC에서 Firebase 배포 가능하게 셋업 (핸드오프의 "다른 PC 필요" 해소)
- 이 PC엔 Node/npm/winget 없음 → **단독 Firebase CLI 바이너리**(firepit): `C:\Users\user\firebase-cli\firebase.exe` (v15.22.4).
- ★첫 실행 welcome wizard가 `welcome.js:115` JSON.parse 크래시 → **`FIREPIT_VERSION=1` 환경변수로 우회 필수**(안 하면 Node REPL `>`에 멈춤).
- 래퍼 `C:\Users\user\firebase-cli\fb.cmd`(FIREPIT_VERSION 설정 후 exe 호출, ASCII 주석만).
- 로그인: sorrow6970@gmail.com 완료(프로필 캐시 → 재로그인 불필요). `firebase login`만 실제 터미널 필요, 이후 배포는 Claude가 실행.
- 배포: `cd C:\repo\denn-products && FIREPIT_VERSION=1 C:\Users\user\firebase-cli\firebase.exe deploy --only hosting --non-interactive`
- `.firebase/` 배포캐시 gitignore 추가.

### 2. 어제 A·B·C 라이브 배포 (어제 커밋만·미배포였던 것) + 실기기 검증
- **C(내공간 전체화면 뒤로가기 버튼 잔존)**: ✅ 실기기 확인 — 고쳐짐.
- **B(아이폰 전체화면)**: ⏸️ A(발행본 미로딩) 때문에 가이드배경조차 못 열어 **검증 불가** → A 해결됐으니 재검증 대상.
- **A(특정 폰 발행본 JSON 미로딩)**: 아래 4번에서 근본원인 재규명·해결.

### 3. 액자 모바일 뷰포트 레이아웃 dvh→lvh (`denn-mockup-tool.html` L12728)
- 주소창 토글 시 빈 공간 버그: `#page-frame.main.on` 높이 `svh`(작은값 고정)가 원인 → 처음 **dvh**로 바꿈(빈 공간 해소).
- 실기기 피드백: dvh는 박스는 커지나 `applyStableScale`(L4785)이 resize 120ms 뒤 `transition:none`으로 **점프**(안 매끄러움) + 주소창 뜰 때 dvh 작아 **액자 축소**.
- → **lvh**(large viewport 고정값)로 전환: clientHeight 불변 = 스케일 점프 없음 + 항상 큰 액자.
- 헤더 상수 95px → `var(--denn-header-h, 95px)` + 측정 훅(모바일 2행 줄바꿈 대응, L2791). `.preview-area` min-height 50vh/46vh→0.
- ⚠️ **남은 회귀(item 2, 미해결)**: 갤럭시서 **카카오 인앱=액자 작음 / 삼성 가로=너무 큼 / 카카오=주소창 안 사라짐**. lvh가 인앱웹뷰/브라우저별로 불균일 → 재설계 필요.

### 4. ★★★ A 근본해결 — 발행본 payload 다이어트 (`denn-admin.html`)
- **증상 재정의**: "특정 폰서 JSON 안 뜸"의 실제 정체 = **하드 실패 아님, 느려서 한참 뒤에 뜸**. `published/state.json`이 **492KB**(그중 **base64 이미지 351KB=71%**)라 느린 모바일망서 로딩 지연.
  - 분석: guideBackgrounds #1 한 개가 base64 238KB, clockSettings 86KB, watermark 27KB가 base64로 박힘(나머지 이미지는 이미 URL). gzip으로도 279KB(base64는 압축 안 됨).
  - 왜 일부 기기만? = **강제 `?share=` 로드로 localStorage 심어진 기기(운영자 폰/PC)만 캐시로 즉시 표시**, 캐시 없는 신규 기기는 매번 492KB fetch 대기.
- **수정**: `dennPublishState`에 `dennExternalizeState()` 훅 추가 — 발행 직전 state를 순회해 `data:image;base64` 문자열을 **Storage(`published/assets/`, 내용해시 경로로 dedup)에 업로드하고 URL로 치환**. 실패 이미지는 원본 유지(발행 항상 성공). 소비자는 기존 URL 이미지처럼 처리(소비자 코드 무변경). `published/`는 storage.rules상 공개read+op write.
- **검증**: 운영자 재발행(📢게시) 후 `published/state.json` = **492KB→142KB(-71%), 잔존 base64 0개**, 외부화 자산 URL 4개 전부 공개 200(image/jpeg 등). → 신규/모바일서 초기 로드 대폭 단축.
- **운영 주의**: 앞으로도 관리자에 base64 이미지가 들어오면 **재발행 시 자동 외부화**됨(추가 조치 불필요). 단 재발행 1회는 운영자가 📢게시로 해야 반영.

### 5. 진단 계측(`?debug=1`) 보강 (`denn-mockup-tool.html`)
- 부트 시 발행본 fetch: **404(게시 전=정상 없음)와 403/5xx 오류 구분**, 실패 시 **에러명·HTTP상태·소요초** 표시(디버그 모드는 자동숨김 없음).
- `?debug=1` 시 **화면 하단에 `ADM=published/local · frameSizes · tpl · UA` 상시 박스** → 폰서 콘솔 없이 진단.

---

## ▶ 다음 작업 (순서 — 안정적인 것부터 하나씩 검증)

### 1. A 최종 확인 (거의 완료)
- 느렸던 그 폰에서 재열기 → 빠르게 뜨는지 확인. 되면 A 종결 + **B(아이폰 전체화면) 재검증** 진행.

### 2. 레이아웃 브라우저별 편차 (미해결, 우선) — 원인 2개 코드 확인됨
- 증상: 카카오 인앱=액자 작음 / 삼성브라우저 가로=너무 큼 / 카카오=주소창 안 사라짐.
- **원인 A (삼성 가로 큼)**: 가로 폰은 `innerWidth`가 860 초과(예 ~915) → `applyStableScale`(L4801)이 `innerWidth>860?.868:.56`에서 **데스크톱 배율 .868** 적용 + CSS `@media(max-width:860px)` 모바일 바텀시트 레이아웃 미적용(데스크톱 레이아웃) → 액자 과대. ※코드 전반이 `innerWidth>860`을 '데스크톱/관리자 폰박스' 판정에 다수 사용(L14140/14199/14226 등)이라 breakpoint 전역 변경은 위험.
- **원인 B (카카오 작음·주소창 잔존)**: 인앱 웹뷰가 `lvh` 미지원 시 폴백 `100vh`(≈현재 작은 뷰포트)로 떨어져 작게 잡힘. lvh 지원이 브라우저마다 달라 편차.
- **접근(정석)**: CSS 뷰포트단위(lvh/svh/dvh)+860 너비분기 대신 **JS `visualViewport.height` 실측→`--denn-vvh`로 구동** + 모바일 판정을 너비 아닌 기기(pointer:coarse 등)로. 단 지금 정상인 **삼성 세로 회귀 방지**가 관건 → 각 브라우저 실측 후 적용.
- **진단 도구 배포됨**: `?debug=1` 시 좌상단 실시간 패널(inner/visualViewport/lvh지원/미디어분기/area.clientH/scale). 카카오·삼성 × 세로·가로 4케이스 값 수집 → 그걸로 정밀 수정. [[feedback-measure-dom-before-iterating]]

### 3. B 아이폰 전체화면 재검증 (A 해결로 가능해짐)

### 4. (선택) 어제 핸드오프 잔여
- **②**: 대부분 4번(다이어트)로 해소. 추가로 경량 version.json 선확인(재방문 시 142KB도 스킵)은 선택.
- **③ 슬라이더 위치 readout 튐**(로드/배경전환 시 X/Y 숫자 튐, 실렌더 정상=시각버그, rmRender 끝 ~L4262 setVal).
- **④ 카페24 파킹 완전 제거**(.com Cloudflare 이전, 리스크 커서 보류).

---

## 환경/재개 메모
- 오늘 커밋(로컬, **아직 GitHub push 안 함** — origin보다 앞섬): `9e58d14`(dvh) · `4f93086`(lvh+gitignore) · `ac26a20`(진단계측) · `d44f1f5`(발행 다이어트). push 여부는 사용자 확인 후.
- 이 PC 배포법: 위 §1. 다른 PC는 여전히 `npm i -g firebase-tools` + `firebase login` 경로.
- 관리자 데이터=클라우드 동기화(admin/state.json), 어느 기기서든 로그인=최신.
- 배포 사이클: 로컬 수정 → (실폰 검증) → commit → firebase deploy --only hosting → 라이브. 데이터 변경은 📢게시만.
