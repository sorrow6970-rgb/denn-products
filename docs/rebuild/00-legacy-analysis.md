# DENN PRODUCTS — 레거시 시스템 1차 인벤토리 (리빌드 참조용)

> 작성: 2026-07-21. 정적 코드 조사와 로컬 비파괴 로드를 중심으로 정리한 1차 인벤토리다.
> 목적: 새 코드베이스로 옮길 때 "무엇이 있었는지 / 무엇을 반드시 보존해야 하는지"의 단일 참조.

> 한계: 운영 데이터 샘플, Firebase 실제 write/read E2E, 기존 시안 토큰 전체 라운드트립, 실제 모바일 기기 회귀를 완전히 검증한 전수 분석은 아니다. 기능·데이터 계약은 후속 스펙에서 재검증하며, 충돌 시 확정 decisions 문서를 우선한다.

기존 시스템 = **바닐라 JS 단일파일 앱 2개**.
- `denn-mockup-tool.html` ≈ 16,139줄 / 1.14 MB — 고객용 목업 툴
- `denn-admin.html` ≈ 16,275줄 / 1.33 MB — 운영자 어드민 콘솔
- 공유: Firebase 프로젝트 `denn-products`, 동일 데이터 계약(`S`/`ADM` 스키마).
- 라이브: **https://design.dennproducts.com** (루트 `/` → 목업툴, `/denn-admin.html` → 어드민). 전면 한국어 UI.

---

## 1. 제품 개요

DENN PRODUCTS = 한국 소규모 인쇄샵을 위한 **맞춤 인쇄물 시안(proof)·목업 스튜디오**. 취급 품목 = **액자(photo frame)** + **폰케이스**. 고객이 자기 사진을 올려 제품 템플릿에 배치 → 텍스트(웨딩/여행/반려/데일리 테마) 추가 → 사이즈·프레임 색상 선택 → 미리보기(실사 "내 공간에서 보기" 룸 목업 포함) → 완성된 시안을 **카카오톡**으로 샵에 전송해 주문.

역할 3종:
- **운영자(admin)** — 샵. `denn-admin.html`(패스워드/Firebase 로그인 게이트)에서 카탈로그 정의: 기종·칼선, 케이스/액자 템플릿, 사이즈, 색상, 폰트, 가이드 배경, 브랜드, 워터마크. 주문 의뢰 검토 + 고객 비공개 시안 "공간(space)" 발급.
- **고객(customer)** — `denn-mockup-tool.html`에서 시안 구성. 공개, 로그인 없음.
- **소비자(viewer)** — 운영자 발급 링크 `?space=<token>` + 비번으로 여는 사람. view-only 씬 재현.

도메인 용어: **frame templates**(액자 템플릿), **zones**(템플릿 내 텍스트/사진 영역, Zone Editor로 편집), **guide backgrounds**(가이드 배경 — 액자가 놓이는 방/벽 사진), **print resolution / print area**(인쇄 가능 영역, 기종별 칼선), **proofs / spaces**(고객별 암호화 씬), **size guide**(사이즈 가이드 — 멀티 사이즈 비교 오버레이).

---

## 2. 기능 인벤토리

**목업툴 — 액자·프레임 탭**
- 프레임 **사이즈** 칩(`frame-sz-chips`), 운영자 `frameSizes` 기반
- **템플릿** 선택 그리드: 빌트인(풀포토, 사진+문구, 사진 2/3장, 텍스트 전용, 원형 사진) + 운영자 업로드 템플릿
- **프레임 색상** 스와치(black/white/oak/walnut/gold/silver, 우드그레인 플래그)
- **이미지 업로드**(드래그드롭 `frame-drop`, `dropF`), zone별 사진 슬롯
- **문구 입력**: main / name / name2 / date / sub 동적 텍스트 필드(V363)
- **시계** 오버레이 토글(`togFrame('clock')`, `setInterval(renderFrame,1000)`)
- **내 공간에서 보기**(룸 목업, `openRoomMockup`) — 액자를 방 사진에 합성
- **사이즈 가이드**(`sg-panel`, `SG`/`sgDraw`) — 여러 사이즈 동시 오버레이, 세로/가로, 스케일/오프셋/알파
- **전체화면 보기**(`dennOpenFrameFsView`) + 가로/세로 풀스크린(모바일 난이도 높음)
- **저장/다운로드**(`dlCanvas('frame')`), 저장 시 워터마크(`applyWatermark`)
- **카카오 전송**(`sendKakao`) + **주문 의뢰** 폼(이름/연락처/메모 → `DENNOrderRequestV36`)

**목업툴 — 폰케이스 탭** *(현재 `__DENN_CASE_ENABLED`/`dennSetCaseTabEnabled`로 비활성)*
- 기종 선택, 케이스 템플릿 그리드, 멀티 이미지 업로드, 케이스 색상, 폰 색상, **맥세이프** 옵션, 텍스트, 표시 옵션

**룸 목업 서브시스템(`RM`)**
- 방/배경 사진 업로드 또는 운영자 **가이드 배경** 선택; 액자 드래그/스케일/위치; 밝기; 기울기/원근; 그림자; **햇빛** 시뮬레이션; 자; 배경별 설정 저장

**비공개 시안 공간(작업5)**
- 운영자가 `?space=<token>` 링크 + 비번 발급 → 고객이 view-only 재현 씬 열람 → 확정 시 카카오 채널

**어드민 콘솔 탭(`goTab`)**: 대시보드 · 기종&칼선 · 케이스 템플릿 · 케이스 템플릿 제작 · 액자 템플릿 · **액자 템플릿 제작** · 액자 설정 · 폰트 관리 · 브랜드 설정 · 내보내기 · **고객 시안 확인** · 주문 의뢰(동적 주입)
- 템플릿별 **Zone Editor** 모달(`openZoneEditor`/`zeRender`) — 텍스트/사진 zone 정의, 가이드 오버레이 이미지, 박스 폭, 시계 프리셋, 색상변경 권한(`allowColorChange`/`maskMode`)
- 액자/케이스 **빌더**(`FB` 상태) — 아트 업로드, zone 배치, 템플릿 저장
- 사이즈 매니저(추가/편집/멀티사이즈, 사이즈별 시계), 색상/폰트/카테고리 매니저, 커스텀 폰트 업로드
- **워터마크**, **브랜드**(이름, kakaoUrl, 강조색), 가이드 배경 매니저 + 순서
- **데이터 안전**: 폴더 선택 JSON 자동 백업(File System Access API), 스냅샷 링, 수동 내보내기/가져오기, 클라우드 발행

---

## 3. 아키텍처 & 코드 구조

**렌더링:** 순수 **네이티브 Canvas 2D**(`getContext('2d')`, `drawImage`, `toDataURL`) — html2canvas/jsPDF/차트 라이브러리 없음. 인쇄 파일 = 캔버스 합성 → PNG. 목업툴에만 캔버스 API 호출 ~132곳.

**상태/모듈 패턴:** concern별 거대 `<script>` 모놀리식. 모듈 대신 전역 가변 객체:
- 목업툴: `ADM`(운영자 카탈로그, `localStorage.denn_admin`), `RM`(룸 상태: `roomImg`,`pos`,`bgId`,`guideIndex`,`dragging`,`__userMoved`), `SG`(사이즈 가이드), `opts`(프레임 토글), `curFTpl`/`curFSz`/`curFCol`, `window.dennSpace`, `window.DENNOrderRequestV36`, `window.DENNPrintExportV36`, `window.dennFirebase`.
- 어드민: `S`(전체 카탈로그, 기본값 `DEF`), `ZE`(zone-editor 세션), `FB`(빌더 세션), `window.dennFirebase`, `dennOpenSpaceCreate`.

**핵심 구조적 특징 — 패치 레이어 누적.** 기능이 버전 IIFE(`denn-vNN-<purpose>`)로 이전 함수를 감싸며 패치됨. 고유 버전블록 마커: **어드민 402개, 목업 163개**. 핵심 함수가 수십 번 재정의(last-wins): hot-functions 문서 기준 어드민 **고유 함수명 834개, 3회 이상 정의 114개, 죽은 정의 817개**. 예: `by`(80회), `num`(35), `goTab`(28), `saveNow`(18), `zeRender`(8겹), `openZoneEditor`(7), 목업툴 `switchTab` ~10회(v18/v23/v36/v37/v39…).

**"보호" 코어(work-log 계약상 무수정):** `zeRender`, `renderFrame`, `renderCase`, `fbExport`/`fbRender`, `sendKakao`, `openZoneEditor`, `DENNPrintExportV36`, `DENNOrderRequestV36`. 모든 신규 동작은 래퍼로 우회 — 이 규칙이 래핑 폭증의 원인.

**두 앱 공유/중복:** `ADM`/`S` 데이터 형태 + Firebase 프로젝트 공유하나 로직 중복(양쪽이 Firebase init, `denn-cors-fix-image-src-setter` IIFE, storage 헬퍼, 룸/프레임 렌더 수학 각자 재구현). 목업툴은 어드민 산출물을 소비.

**가장 복잡한 영역:** Zone Editor + 사이즈/디테일 모달(`zeRender`), 룸 렌더 경로(`rmRender`, `openRoomMockup`, 가이드/그림자/햇빛/앵커 수학), 모바일 풀스크린/회전(`dennFsRevealV`, `dennGatedRevealV`, scroll-pin) — 마지막은 여러 세션을 `?fsdbg=1` 온스크린 진단으로 소모.

---

## 4. 데이터 모델

**운영자 카탈로그 `S`(=목업툴 `ADM`)** — `localStorage.denn_admin` + IndexedDB `denn_shared_db`/store `kv`/key `denn_admin_state` + 클라우드 `admin/state.json` & `published/state.json`에 영속. 형태(`DEF`):
`brand{name,sub,kakaoUrl,acc,acc2}`, `models[]{id,name,sub,info,w,h,dieline,magsafeDL,printArea}`, `caseCategories[]`, `caseTemplates[]`, `frameTemplates[]{id,name,type,dataUrl,storagePath,textZones[],zones[],photoSlot,categoryId,sizeId,clock,allowColorChange,maskMode,editorOverlayImages[]}`, `frameCategories[]`, `frameSizes[]{id,name,sub,aspect,clock}`, `frameColors[]{id,name,fill,grain}`, `frameThickness`, `clockSettings{x,y,size,customImg}`, `customFonts[]`, `caseMockup`, `frameMockup`, `guideBackgrounds[]{id,dataUrl,storagePath,...}`, `watermark{enabled,dataUrl,opacity,position}`, `roomBackgroundSettings{}`, 리비전 마커 `__opRev`/`__opRevAt`/`__cloudRev`.

**Firestore**(`firestore.rules`):
- `spaces/{token}` — 암호화 시안 씬: `{ enc:{salt,iv,ct}, ownerMeta, createdAt, schema:'space-v1' }`. `read:if true`, `create:if true`, `update/delete:if false`(불변). 토큰=문서ID, 비밀성=토큰+클라 암호화(인증 아님). 그 외 컬렉션 전부 거부.

**암호화(`dennSpace`)**: `crypto.subtle` **PBKDF2(120,000회, SHA-256) → AES-GCM 256**. 비번 파생 키; salt+iv+ct base64 in `enc`. 씬 페이로드 **`space-scene-v1`**: `design{tplId,sizeId,colorId,texts{main,name,name2,date,sub},photoUrl,imgT}` + `room{bgId,guideIndex,guideBgUrl,pos,settings}`. 사진/배경은 Storage `proofs/`에 업로드 후 URL 인라인.

**Storage 버킷 `gs://denn-products.firebasestorage.app`**(`storage.rules`, 경로별 match는 OR 결합 → catch-all read 금지):
- `admin/` — 비공개(운영자 read+write), `admin/state.json`
- `temp-share/` — public read, anon write; `?share=` 운영자→소비자 JSON 스냅샷
- `proofs/` — public read, anon write; 고객 시안 사진/배경
- `published/` — public read, 운영자 write; `published/state.json`(자동발행 카탈로그 방식B) + `published/assets/<hash>.<ext>`(외부화 base64)
- `templates/`,`placeholders/`,`guides/`,`mockups/`,`editor-overlays/{tplId}/` — public read, 운영자 write; base64→Storage URL 마이그레이션 이미지
- 20 MB write cap; `op()` = 인증 && 비익명

**IndexedDB:** `denn_shared_db`(카탈로그) + object store `denn_order_requests`(주문 의뢰, `saveDennOrderRequestV36`/`listDennOrderRequestsV36`) — 두 앱 간 same-origin 채널.

**localStorage 키:** `denn_admin`(카탈로그), `denn_admin_snapshots_v35`(undo 링), `denn_backup_config_v1`, `denn_proof_spaces`(발급 공간 목록), 레거시 `denn_admin_pre_share_*`/`denn_admin_pre_cloud_*` 백업.

**룸 설정 스키마 계약(2026-05-31, v1.0, 부분 구현):** 현 `roomBackgroundSettings` = **flat map**, 키 `__denn_room_common_default__`(운영자 공통기본), `default-room`(유저 기본), `<bgId>`(가이드bg별, 운영자+유저 **공유→양방향 오염**), `uploaded-room`. 신선도=monotonic `__opRev`(max-rev wins). **목표** 스키마 = 역할별 중첩: `roomSettings.operator{default,<bgId>}` / `roomSettings.user{default,<bgId>}`, 프리셋 `{frameCenterX/Y, guideScale, guideOpacity, frameTiltEnabled, frameTiltDeg, framePerspectiveX/Y, shadow*, sunlight*, showRuler}`, 상속 마커 `__inheritedFrom`/`__userTouched`. 컷오버 미완.

---

## 5. 외부 의존성 & 연동

- **Firebase 10.12.0 모듈러 SDK**(ES-module CDN, `gstatic.com/firebasejs`): app/auth/firestore/storage. 두 파일 동일 `firebaseConfig`(project `denn-products`, bucket `denn-products.firebasestorage.app`, sender `66131680180`).
- **Auth:** 운영자 = Email/Password(콘솔 생성) → `onAuthStateChanged`/`dennOnAuthStateV`; 소비자 = 익명(Storage/Firestore write용).
- **카카오톡** 채널 = 주 주문 경로: `sendKakao`가 `ADM.brand.kakaoUrl`(폴백 `http://pf.kakao.com/_xmBxgxfn` → `/chat` 정규화) 오픈. Kakao SDK 없이 `window.open`.
- **Google Fonts:** DM Sans, Nanum Gothic, Nanum Myeongjo, Playfair Display(목업) / Playfair Display + DM Sans(어드민) + 운영자 `customFonts`(`FontFace`).
- **호스팅:** Firebase Hosting(`firebase.json`, `/`→목업 rewrite, HTML `no-cache`); wip 채널 `denn-products--wip-cxz2mnnb.web.app`.
- 프레임워크/번들러/jQuery **없음** — 100% 바닐라 + 네이티브 Canvas + Web Crypto + File System Access API.

---

## 6. 기술 부채 & 페인 포인트 (= 리빌드 사유)

- **모놀리식 규모:** 2개 × ~16k줄 단일 파일, ~1.1–1.3 MB, 모듈/빌드 스텝 없음.
- **패치 누적:** 402(어드민)/163(목업) 버전 IIFE. hot-functions: **"죽은 정의 817개"**, `by` **80회** 재정의, `zeRender`/`openZoneEditor`/`sizes` 7–15겹. 동작이 로드 순서 last-wins에 의존.
- **래퍼-온-래퍼 취약성:** `switchTab` ~10겹; `adminRoomSetup URL 분기 20+곳 산재`, 중복 모드 감지기, `bgKey 9개 중복 정의`, `저장 3중 경로`, `위치 다중 표현(frameX/Y·frameCenterX/Y·guideX/Y·…)`.
- **Storage/쿼터 소방:** `file://` 5MB 풀 → `QuotaExceededError`; `local-dev.md`가 통째로 localhost 강제용. base64 이미지가 `denn_admin`(5.6MB) 팽창 → Storage 마이그레이션 유발.
- **데이터 손실/오염 사고:** 운영자 기본값이 소비자 write에 clobber(`__opRev` monotonic merge는 워크어라운드), `guideBackgrounds 4→1 clobber 가드`, 양방향 가이드bg 오염.
- **모바일 풀스크린/회전 불안정:** 정적 수정 반복 실패, `?fsdbg=1` 진단+영상 프레임 분석으로만 해결. 여러 핸드오프가 거의 이 문제.
- **두 파일 로직 중복**(Firebase init, CORS-fix IIFE, 렌더 수학).
- **"보호 함수" 족쇄:** `보호 함수 무수정` 규칙이 모든 변경을 외부 래퍼로 강제 → 부채 자기강화.
- **CSS 특이도 전쟁:** `!important` 전쟁을 `:not()` 트릭으로 봉합.

---

## 7. 리빌드 필수 보존 제약

- **Firebase 프로젝트 `denn-products` 유지**(bucket `denn-products.firebasestorage.app`) — 기존 발행 에셋/시안 공간/Storage URL이 여기 고정.
- **현행 Storage 계약의 호환성 조사 필요**(`storage.rules`): 비공개 `admin/`, public-read 운영자-write `published/templates/placeholders/guides/mockups/editor-overlays/`, public-read anon-write `temp-share/proofs/`. `admin/` 노출을 만드는 catch-all read는 금지한다. 공개 쓰기 경로는 영구 보존 대상으로 확정하지 않으며 별도 보안 스펙·마이그레이션·사용자 승인 없이 변경하지 않는다.
- **Firestore `spaces/{token}` 계약**(`firestore.rules`): read/create 개방, **update/delete 금지(불변)**. `?space=<token>` URL 스킴 + **PBKDF2(120k,SHA-256)→AES-GCM-256** 클라 암호화 + `space-scene-v1` 페이로드가 기존 링크와 라운드트립.
- **발행 데이터 하위호환:** 기존 `published/state.json`, `admin/state.json`, `backup.json`(~35MB 전체 export, git-ignored), `S`/`ADM` 스키마(`storagePath` 필드, monotonic `__opRev`/`__cloudRev`/`__publishedAt`). 마이그레이션은 구 flat `roomBackgroundSettings` 키를 읽어야 함.
- **운영자 vs 소비자 auth 분리:** admin write=Email/Password(비익명), 소비자 시안/공유 write=익명. 규칙은 `sign_in_provider != 'anonymous'`로 구분.
- **보호 기능 계약:** 렌더/내보내기/주문 파이프라인(`renderFrame`,`zeRender`,`fbExport`,`DENNPrintExportV36`,`DENNOrderRequestV36`,`sendKakao`). 인쇄 출력 = **CORS-clean 캔버스 → PNG**(tainted canvas = 0×0 인쇄파일 = 주문 차단). `crossOrigin='anonymous'` + 버킷 CORS(`origin:["*"]`, GET/HEAD) 유지.
- **호스팅/라우팅:** `/` = 고객 툴, `/denn-admin.html` = 콘솔, HTML `no-cache`.
- **한국어 UI** + **카카오톡** 주문 채널(`brand.kakaoUrl`) = 제품 정의 요소.
- **런치 차단 동작:** 모바일 세로/가로 풀스크린 "튐" 금지(scroll-pin), 워터마크는 저장 시만, 케이스 탭 의도적 비활성(`__DENN_CASE_ENABLED`), `?space=` 씬 재현이 운영자 설정 앵커/스케일/햇빛/시계와 일치.

**구→신 매핑 치트시트:** `S`/`DEF`↔카탈로그 모델 · `ADM`↔소비자 카탈로그 캐시 · `RM`↔룸 목업 상태 · `SG`↔사이즈 가이드 · `ZE`/`openZoneEditor`/`zeRender`↔zone 에디터 · `FB`↔빌더 · `dennSpace`↔암호화 시안 공간 · `DENNOrderRequestV36`↔주문(IDB `denn_order_requests`) · `dennFirebase`↔storage/publish 헬퍼 · `roomBackgroundSettings`→`roomSettings.operator/user` 중첩.
