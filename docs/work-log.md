# 작업 로그 (`docs/work-log.md`)

## 이 파일의 목적
- 이 파일은 **Codex**와 **Claude Code**가 같은 저장소에서 병행 작업할 때 충돌을 줄이고, 작업 맥락을 빠르게 공유하기 위한 공용 로그입니다.
- 작업 시작 전/종료 후 상태를 동일한 형식으로 기록해, 리팩터링 진행 상황과 일반 기능 개발 진행 상황을 함께 추적합니다.

## 작업 시작 시 반드시 확인할 것
- [ ] `main` 최신 상태 동기화 여부 확인 (`git pull`)
- [ ] 현재 작업 브랜치/PR 상태 확인
- [ ] `현재 진행 중인 작업` 섹션에서 Claude Code/Codex 활성 작업 영역 확인
- [ ] 작업 영역이 아래 규칙에 부합하는지 확인
  - [ ] 1단계 완료 영역(안전 영역)인지
  - [ ] 2·3단계 진행 예정/진행 중 영역을 침범하지 않는지
  - [ ] 보호 함수/저장키를 건드리지 않는지

## 작업 종료 시 반드시 업데이트할 것
- [ ] 아래 9개 섹션(작업 템플릿)을 채움
- [ ] `현재 진행 중인 작업` 섹션 업데이트 (완료/보류/인계 반영)
- [ ] `최근 완료한 작업 5건`에 요약 추가
- [ ] 커밋 메시지에 `[Codex]` 또는 `[Claude]` 라벨 명시
- [ ] 메인 브랜치 직접 푸시 없이 PR 제출

---

## 작업 기록 템플릿 (복사해서 사용)
> 아래 블록을 복사해 새 작업 항목을 추가하세요.

### 1) 작업 메타 (날짜/작성자/브랜치/PR)
- 날짜: 
- 작성자: 
- 도구: 
- 브랜치: 
- PR 링크: 
- 관련 이슈/요청: 

### 2) 작업 유형 (기능/버그/UI/일반)
- [ ] 새 기능 추가
- [ ] 사용자 영향 버그 픽스
- [ ] UI 개선
- [ ] 일반 수정/업데이트
- 요약: 

### 3) 변경 파일 목록
- [ ] `docs/work-log.md`
- [ ] 기타 파일 없음 (또는 아래 명시)
- 추가 파일:
  - `경로/파일명`

### 4) 작업 영역 분류 (1단계 완료/2·3단계 진행/미정리)
- 대상 영역:
- 분류:
  - [ ] 1단계 완료 영역 (상대적 안전)
  - [ ] 2·3단계 진행(예정) 영역 **(원칙적으로 작업 금지)**
  - [ ] 정리 안 된 영역 (가능하나 신중)
- 판단 근거:

### 5) 보호 함수·저장키 비침범 체크
- 보호 함수 미수정 확인:
  - [ ] `openZoneEditor`
  - [ ] `zeRender`
  - [ ] `renderFrame`
  - [ ] `fbRender`
  - [ ] `sendKakao`
  - [ ] `DENNPrintExportV36`
  - [ ] `DENNOrderRequestV36`
- 보호 저장키/스토어 미변경 확인:
  - [ ] `denn_admin`
  - [ ] `denn_shared_db`
  - [ ] `denn_order_requests`

### 6) wrap 추가 여부 및 사유
- wrap 추가 여부:
  - [ ] 없음 (원칙)
  - [ ] 있음 (예외)
- 예외 사유(있는 경우 필수):
- 추후 정리 가능성/제거 계획:

### 7) 수동 스모크 테스트 결과 (admin/mockup)
- Admin (`denn-admin.html`):
  - [ ] 해당 없음
  - [ ] 실행함
  - 결과:
- Mockup (`denn-mockup-tool.html`):
  - [ ] 해당 없음
  - [ ] 실행함
  - 결과:
- 비고(환경 이슈/재현 조건):

### 8) Claude Code 검증 요청 포인트
- Claude Code에 확인 요청할 항목:
  1. 
  2. 
  3. 
- 예상 충돌 지점(있다면):

### 9) 롤백 방법/리스크 메모
- 롤백 방법:
- 사용자 영향 리스크:
- 배포 전 추가 확인 필요사항:

---

## 현재 진행 중인 작업 (실시간 업데이트용)
> 최신 작업이 위로 오도록 추가하세요.

- [x] `2026-05-19 | Claude Code | phase1-c-installguidepanel-fix | C안: installGuidePanel insertBefore NotFoundError 1줄 수정 | 상태: 완료`
  - 범위: denn-admin.html L13350 한 줄 교체.
    - 이전: `if(anchor&&anchor.nextSibling)controls.insertBefore(panel,anchor.nextSibling);else controls.insertBefore(panel,controls.firstChild);`
    - 이후: `if(anchor)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else controls.insertBefore(panel,controls.firstChild);`
  - 원인: `controls.querySelector('.denn-v363-field-manager')`는 descendant 매칭(직접 자식 아님)이라 `anchor.nextSibling`이 controls의 직접 자식이 아니어서 `controls.insertBefore(panel, X)`에서 NotFoundError. anchor의 부모(inner `<div>`)에 직접 삽입하도록 변경.
  - 기원: v36.4 베이스라인(initial commit a7ecac8c). Phase 1 무관, 사전 잠재 버그.
  - 보호 함수 무수정 (openZoneEditor/zeRender/renderFrame/fbExport/sendKakao 본체 불변). installGuidePanel은 v36.4 모듈 내부 함수, 보호 함수 외.
  - 부수효과: 패널 위치가 `.ze-label → .denn-v363-field-manager → .denn-v364-guide-panel → .ze-type-btn(×4)` 순서로 그룹화 → 시각적 흐름 자연스러움 (이전엔 NotFoundError로 패널이 아예 안 떴을 가능성).
  - 백업 태그: `phase1-c-installguidepanel-start` @ `bb0971f`.

- [x] `2026-05-19 | Claude Code | phase1-b2-trigger-fix | B v2 후속: sweepHeavyV2 트리거 누락 보강 (fbExport 명시 + processGuideBgs wrap + 글로벌 노출) | 상태: 완료`
  - 범위: denn-admin.html Firebase auto-sync IIFE — 3 곳 변경, 보호 함수 무변.
    1. `wrapFbExport` finally 블록에 `setTimeout(sweepHeavyV2, 250/1550)` 명시 추가 — sweep() 내부 호출과 중복이지만 멱등(defense in depth).
    2. `wrapProcessGuideBgs` 신규 — `window.processGuideBgs`를 wrap. FileReader 비동기 완료 후 800/2000ms에 sweepHeavyV2 호출. 가이드 업로드는 fbExport 경로와 무관하므로 별도 후크 필수였음.
    3. `window.dennSweepHeavy` 외부 노출 — 콘솔/이벤트 핸들러에서 수동 트리거 가능.
    4. `install()` 재시도 조건: `fbOk && guideOk` 둘 다 성공할 때까지 재시도 (각각 다른 시점에 정의될 수 있음).
  - 원인 진단: B v2의 sweep()이 sweepHeavyV2를 호출하지만, processGuideBgs는 fbExport를 트리거하지 않으므로 가이드 업로드 직후 sweep 자체가 발동 안 함. fbExport 경로로 fold하던 가정이 틀림.
  - 보호 함수 본체 무변 (openZoneEditor/zeRender/renderFrame/fbExport/sendKakao), 저장키 스키마 무변. fbExport는 wrap만 추가, processGuideBgs도 외부 wrap.
  - 검증: 가이드 1개 업로드 → 콘솔에 `[firebase] migrated guideBg gb_xxx → guides/...` 자동 출력, 5초 후 `S.guideBackgrounds[].storagePath` 부여됨. 수동 트리거: `window.dennSweepHeavy()`.

- [x] `2026-05-19 | Claude Code | phase1-b2-localstorage-heavy-fields | B안 v2: heavy state 필드 마이그(guideBgs/mockups) + snapshot 슬림화 + deletedKeys 누수 청소 | 상태: 완료`
  - 범위:
    1. denn-admin.html L5280 `delGuideBg` — `S.deletedGuideBackgroundKeys.push(bg.dataUrl)` 1줄 제거 (RC-1 미래 누수 차단). key+id push는 보존 → merge 부활방지 로직 무영향. base64를 키로 저장하던 패턴 종식.
    2. denn-admin.html `denn-v35-admin-data-safety-final` IIFE 내부:
       - `MAX_SNAPS`: 12 → 5
       - `slimSnapshotState(s)` helper 신규 — **조건부** strip (storagePath가 있어야만 dataUrl을 null로). 마이그 부분 실패 시 데이터 유실 방지.
       - `addSnapshot`의 `clone(S)` → `slimSnapshotState(S)`
       - `autoSlimExistingRingOnce()` — IIFE 시작 시 기존 ring을 1회 자동 slim → 본체 `denn_admin` setItem 차단 즉시 해소. 멱등.
    3. denn-admin.html Firebase auto-sync IIFE 확장:
       - `migrateGlobal(host, dataField, pathField, basePath)` helper (단일 string 필드용)
       - `migrateGuideBgs()` — `S.guideBackgrounds[].dataUrl` → `guides/{id}.{ext}`, `bg.storagePath` 부여
       - `cleanupDeletedKeys()` — `S.deletedGuideBackgroundKeys`의 `data:` 엔트리 필터, 청소량 로그
       - `sweepHeavyV2()` — 위 4종 호출. 기존 `sweep()` 끝에 통합.
       - `extFromDataUrl()` mime → 확장자 매핑 (png/jpg/webp/gif).
       - 신규 path 필드: `S.guideBackgrounds[].storagePath`, `S.frameMockupStoragePath`, `S.caseMockupStoragePath`.
  - 보호 함수 무수정 (openZoneEditor/zeRender/renderFrame/fbExport/sendKakao 본체 불변).
  - 저장키 스키마 superset 호환 (`denn_admin`은 필드 추가만, `denn_shared_db`/`denn_order_requests` 무접촉). `denn_admin_snapshots_v35`의 state는 slim 버전으로 변경 — 같은 빌드 내에서만 유의미한 데이터라 외부 호환 영향 없음.
  - 사용자 임시 hook(Storage.prototype.setItem 차단)은 페이지 새로고침 시 자동 제거됨. 코드 변경 불필요.
  - 백업 태그: `phase1-b2-localstorage-v2-start` @ `bb8a013` (B v1 직후, dev 서버 셋업 직후).
  - 충돌 위험: 낮음. 신규 sweep은 기존 sweep과 같은 cadence에 통합, 모두 멱등. snapshot 슬림화의 conditional strip이 마이그 실패에도 안전.
  - 사용자 검증 목표: `JSON.stringify(S).length`<2MB, `denn_admin`<2MB, `denn_admin_snapshots_v35`<500KB, QuotaExceededError=0.

- [x] `2026-05-19 | Claude Code | local-dev-server-setup | 로컬 정적 dev 서버 (file:// 5MB localStorage 풀 회피) | 상태: 완료`
  - 범위:
    1. `start-dev.ps1` 신규 — node→python 폴백, 포트 8000/8080/5500 자동선택, ASCII-only(PS5.1 호환), Get-NetTCPConnection -State Listen으로 점유 검사.
    2. `docs/local-dev.md` 신규 — 사용법 + 데이터 이전 절차(file://→localhost) A~E + 트러블슈팅.
  - 코드 무수정 (HTML/JS 변경 없음). 서버 설정 + docs만.
  - 백그라운드: Windows file:// origin은 모든 로컬 HTML이 단일 ~5MB localStorage 풀 공유. 우리 데이터 100KB여도 setItem 실패. http://localhost:PORT는 별도 origin → 풀 분리.
  - 사용자 액션: `.\start-dev.ps1` 후 `dennDownloadCurrentDataV35()` 로 file:// 측 백업 → http://localhost/... 어드민 콘솔에서 `S = JSON.parse(...); await persistState()` 로 가져오기. Firebase Storage 템플릿/익명 인증은 origin 무관 → 이전 불필요.
- [x] `2026-05-19 | Claude Code | phase1-b-localstorage-migration-expand | B안: localStorage 마이그레이션 확장 (source/builder/original) + 스냅샷 cleanup 헬퍼 + mockup-tool CORS 패치 | 상태: 완료`
  - 범위:
    1. denn-admin.html Firebase auto-sync wrap 본체 재작성 — `migrateOnce` helper + `syncOne` string-identity 그룹화. 4 필드(dataUrl/sourceDataUrl/builderArtDataUrl/originalDataUrl) 동시 마이그, 동일 data: URL은 1회 업로드 후 공유. 동시성 가드 `inFlight[id+':'+suffix]`. 신규 path 필드 3개(`sourceStoragePath`, `builderArtStoragePath`, `originalStoragePath`).
    2. denn-admin.html `clearStalePaths`: data:인데 대응 storagePath가 있는 경우 path 자동 삭제 → 재마이그 유도 (RC-1/RC-4 동시 해결, 편집 재업로드 시 stale 잔존 방지). orphan deletePath는 B안 범위 외(별도 cleanup 작업).
    3. denn-admin.html `preserveDetailFields` 1줄 추가 — 신규 3개 path 필드 보존.
    4. denn-admin.html `window.dennCleanupHeavySnapshots(opt)` 신규 — 자동 실행 금지(사용자 콘솔 호출 전용). 안전장치: `denn_backup_config_v1`의 `lastAutoAt`/`lastAutoFile` 또는 `lastManualAt` 확인 → 없으면 abort + 경고. `{force:true}` 옵션으로 우회 가능.
    5. denn-mockup-tool.html — admin과 동일 `denn-cors-fix-image-src-setter` IIFE 추가 (RC-3 해결, 고객 측 canvas taint 차단). 멱등 가드 동일.
  - 보호 함수 무수정 (fbRender/renderFrame/fbExport/openZoneEditor/sendKakao 본체 불변). 저장키 스키마는 superset 호환 (필드 추가만).
  - 마이그 로그에 `saved bytes` 표시 → 정량 효과 측정 가능.
  - 백업 태그: `phase1-b-localstorage-start` @ `8188991` (A안 직후).
  - 충돌 위험: 낮음. wrap 본체 재작성이지만 동일 책임 범위 내 확장 (4 필드 → 동일 패턴, 동일 inFlight 가드 방식).
- [x] `2026-05-19 | Claude Code | cors-fix-image-src-setter | Step 1-1: Firebase Storage URL용 crossOrigin 글로벌 wrap | 상태: 완료`
  - 범위: denn-admin.html 말미 `denn-cors-fix-image-src-setter` IIFE 신규. HTMLImageElement.prototype.src 세터 + setAttribute('src') 양쪽 패치, `needsCors`가 firebasestorage 도메인 매치 시에만 `crossOrigin='anonymous'` 자동 부여.
  - 보호 함수 무수정 (fbRender/renderFrame/fbExport 본체 불변). 백업 태그 `phase1-cors-fix-start` @ a8bfe83.
  - 충돌 위험: 낮음. 비-Firebase URL은 통과(needsCors false), 기존 `img.crossOrigin` 설정값은 보존(`!this.crossOrigin` 가드), data:/blob: 명시 제외.
  - wrap 예외 사유: 외부 인프라(Firebase Storage) 통합 부작용 보정. `Image.prototype.src` 세터 패치는 49개 호출 위치 어디서든 효과를 발휘해야 하므로 모듈 wrap이 아닌 prototype 레벨 패치가 자연스러움. 단일 글로벌 wrap 1건.
  - 의존성: Step 1-2 (Storage CORS 헤더 설정, 사용자 Cloud Shell 작업) 완료 시점부터 효과 발현. 단독으로는 회귀 무 (현재도 0KB이므로 더 나빠질 게 없음).
- [x] `2026-05-19 | Claude Code | firebase-setup-cors-required | Step 1-2 가이드: Firebase Storage CORS 필수화 (firebase-setup.md §3) | 상태: 완료`
  - 범위: docs/firebase-setup.md §3 "선택" → "필수" 격상. Cloud Shell gsutil cors set 명령 + cors.json (GET+HEAD, origin *) + 검증 콘솔 스니펫 추가.
  - 사용자 작업 필요: Console → Cloud Shell → gsutil 4개 명령 (cors.json 생성 → cors set → cors get 확인).

- [x] `2026-05-19 | Claude Code | phase1-stage3-customer-override-api | Phase1 Stage 3: 고객(목업툴) 텍스트 색상/그림자 override state API | 상태: 완료`
  - 범위: denn-mockup-tool.html 상단 모듈 변수 `dennFrameTextOverrides={}` 신규(L655 부근), 말미에 `denn-phase1-text-override-api` IIFE 신규
  - 충돌 위험: 낮음. 신규 state + 신규 API 네임스페이스. 기존 코드 접점은 `selFTplByRef` wrap 1곳(템플릿 전환 시 auto clearAll).
  - 메모: 데이터 모델/공개 API만. 렌더/UI 통합은 Phase C (Stage 4+5) 예정. API: `window.dennFrameTextOverrideAPI.{get,set,replace,clear,clearAll,all,bulkSet,allowedByTemplate,isHexColor,normalizeShadow}`. shape: `{ color:'#RRGGBB', shadow:{enabled,color,blur,dx,dy} }`. allowedByTemplate()는 curFTpl.allowColorChange를 게이트로 사용.
- [x] `2026-05-19 | Claude Code | phase1-stage2-mask-mode | Phase1 Stage 2: maskMode 자동 감지 + 수동 override (auto/white/black) | 상태: 완료`
  - 범위: denn-admin.html 동일 IIFE 확장 — `detectMaskModeFromDataUrl` 함수, 라디오 UI, fbExport wrap 분기(manual 즉시 / auto 비동기 감지)
  - 충돌 위험: 낮음. 신규 자료(`t.maskMode`, `t.maskModeSource`)만 추가, 기존 렌더러 무영향.
  - 메모: 120×120 다운샘플 후 불투명 픽셀 평균 휘도(0.299R+0.587G+0.114B) <128 이면 'black' 판정. UI는 `색상 변경 허용` 카드 하단에 라디오 3개 + 상태표시 영역. 편집 진입 시 maskModeSource로 'auto'/수동 복원.
- [x] `2026-05-19 | Claude Code | phase1-stage1-allow-color-toggle | Phase1 Stage 1: 어드민 빌더 '색상 변경 허용' 토글 + preserveDetailFields 확장 | 상태: 완료`
  - 범위: denn-admin.html — preserveDetailFields(L12037 직후) 1줄 직접 수정(`['allowColorChange','maskMode','maskModeSource'].forEach...`), 말미에 `denn-phase1-color-toggle` IIFE 신규
  - 충돌 위험: 낮음. preserveDetailFields는 보호 함수 외(편집-저장 보존 로직), 라인 1줄만 추가(기존 패턴 동일). 외부에서 fbExport는 wrap 패턴(v94 router → firebase → phase1 체인).
  - 메모: `__dennFrameTemplateEditIndex` 폴링(250ms)으로 편집 진입/이탈 시 UI 복원/리셋. fbExport wrap은 capturedEditIdx + beforeLen 두 단서로 신규 저장/v94 edit save 모두 호환. wrap 예외 사유: 외부 모듈(v94 edit-mode + firebase auto-sync) 사이에 들어가는 추가 통합 레이어로 분리가 자연스러움.

### 🔖 세션 종료 메모 (2026-05-19) — Phase 1 Stage 1+2+3 완료
- **다음 작업: Phase B (Stage 5 프로토타입, 그림자+마스크 합성 검증, ~1h)**
  - 검증 포인트: maskMode='black' 템플릿에서 customer 텍스트 색상을 흰색으로 + shadow.color='#000' 적용했을 때 시인성/마스크 합성 자연스러운지
  - 1차 데이터 모델은 본 세션에서 완성 → Phase C에서 UI/렌더 통합 본격 진행
- **다음 작업 진입 전 사용자가 할 일**: 어드민에서 새 액자 템플릿 1~2개 업로드 → '색상 변경 허용' ON + 마스크 모드 '자동' 저장 → 콘솔에서 `S.frameTemplates.find(t=>t.allowColorChange)` 로 필드 저장 확인. 또는 기존 템플릿 '수정하기' 진입 시 토글이 OFF 상태로, 라디오는 '자동 감지'로 복원되는지 확인.
- **참고**: 본 세션 변경은 모두 신규 필드/IIFE 추가라 기존 렌더 경로(zeRender/renderFrame/fbRender)는 무영향. 회귀 없음.

### 🔖 이전 세션 종료 메모 (2026-05-18)
- **Firebase Storage 연동: Step 1 완료, Step 2는 다음에**
  - Step 1 완료: SDK init + `window.dennFirebase` 헬퍼 + `docs/firebase-setup.md` 설정 가이드
  - Step 2 대기: fbExport 4개 경로(L1269/L2160/L2330/L3974)에 자동 업로드 wrap 추가, dataUrl → Storage URL 교체, `t.storagePath` 저장(삭제용), graceful degrade(실패 시 dataUrl 유지)
  - **다음 세션 진입 전 사용자가 할 일**: Firebase Console에서 Anonymous Auth 활성화 + Storage Rules 적용 + 콘솔 테스트(`dennFirebase.uploadDataUrl`) 통과
  - 통과 확인 후 Step 2 진행

- [x] `2026-05-19 | Claude Code | claude/watermark-preview-overlay-off | 고객 미리보기 워터마크 오버레이 제거 (저장 시에만 출력) | 상태: 완료`
  - 범위: denn-mockup-tool.html L708 초기화 호출에서 `updateWatermarkOverlay();` 제거 (1줄)
  - 충돌 위험: 매우 낮음. 호출처 1곳(전수 grep 확인). 함수 정의(L1399) 및 DOM 요소(L293 `#wm-ov-case`, L349 `#wm-ov-frame`)는 그대로 보존 — DOM의 `display:none` 기본 스타일로 자연 비표시.
  - 메모: 진단 — 워터마크가 두 경로로 출력 중이었음. (1) `applyWatermark` (저장 시 캔버스 합성, 의도된 동작): dlCanvas/sendKakao/room mockup/dlRoomMockup 등 6곳에서 호출. (2) `updateWatermarkOverlay` (미리보기 DOM 오버레이, 의도 외): 페이지 부트 시 한 번 호출되어 `<img>` 요소를 `display:block`으로. denn-admin.html:510 안내문("시안 이미지 저장 시 워터마크가 자동으로 삽입됩니다")과 실제 동작 불일치 → 안내문 기준에 맞춰 미리보기 오버레이만 제거. `applyWatermark` 경로(저장)는 무수정.
- [x] `2026-05-19 | Claude Code | claude/ze-canvas-display-fix | ze-canvas 백킹/표시 분리 (1200 supersample + 660 display) | 상태: 완료`
  - 범위: denn-admin.html 4곳 — (1) v56 zeRender L8150에서 `displayBox=fit(..,660,760)` 별도 계산 후 `ZE._displayW/H` 저장, (2) L1527 setZePreviewZoom — `ZE._displayW||c.width/dpr` 사용, (3) L11414 v89 applyZoomCss — `ZE._displayW||c.width` (기존 fallback 유지), (4) L13699 canvasCssSize — `ZE._displayW||c.width/dpr` 사용
  - 충돌 위험: 낮음. 모든 변경에 dead-code 경로용 fallback 유지(기존 동작 보존). v89/v118/v364 wrap은 모두 체인 호출이라 그대로 통과.
  - 메모: 직전 1200×1400 변경 후 두 부작용 발생 — (a) c.width=1200 그대로 CSS에 쓰여서 표시 1.8배 큼, (b) v89 `applyZoomCss`가 `c.width*z` (/dpr 누락) 으로 마지막에 덮어써서 더 어긋남. 백킹은 1200(선명), 표시는 660(영역 맞춤) 분리해 모두 해결. 줌 100% 기준점 = 기존과 동일 (660 × 1.0). DPR>1 환경에서는 v89 applyZoomCss가 historically `c.width*z` (overflow) 였으나 `ZE._displayW`가 설정되면 정상 동작 — 부수적 latent 버그 부분 개선.
- [x] `2026-05-19 | Claude Code | claude/ze-canvas-1200x1400 | ze-canvas 미리보기 백킹 상한 660×760 → 1200×1400 (글씨 흐림 해결) | 상태: 완료`
  - 범위: denn-admin.html L8153 활성 zeRender(`window.fbExport` 본체 v56 계열) 내 `fit(currentRatio(t,ZE.img),660,760)` → `fit(..,1200,1400)`
  - 충돌 위험: 낮음. 사전 검증: ZE.canvas.width 절대좌표 사용 0건(모두 `nx/W*100` 정규화 또는 마우스 `canvas.width/rect.width` 비율). v15/v53/v54/v55/v363/v364 모두 W,H 비례 그리기라 백킹 크기 변화에 무관. v364(L13371) zeRender는 `oldZe.apply` 체인이라 v56 그대로 호출.
  - 메모: 진단(see prior turn) — fbExport longSide=1800 PNG를 백킹 660px(DPR=1)에 다운샘플 → 2.7배 압축으로 글씨 흐림 + 줌 시 CSS 업스케일로 누적 흐림. 백킹 상한을 1200×1400으로 키워 원본 1800에 근접(다운샘플 1.5배 수준). DPR=2 환경에서 백킹 = 2400×2800 (~27MB). 백업 태그 `backup-pre-ze-canvas-1200x1400-2026-05-19`. L7353/L7757에 동일 660×760 dead-code 잔존(현재 활성 zeRender 아님) — 추후 정리 단계에서 같이 처리.
- [x] `2026-05-19 | Claude Code | claude/firebase-storage-step2 | Firebase Storage 자동 업로드 wrap (fbExport 후처리) | 상태: 완료`
  - 범위: denn-admin.html 말미에 `__dennFirebaseAutoSyncInstalled` IIFE 신규(단일 wrap), Step 1 모듈 직후 배치
  - 충돌 위험: 낮음 (window.fbExport 최상위 래핑, 기존 v94 router / v364 setTimeout 꼬리(1300ms) 이후 sweep)
  - 메모: load+1000ms 시점에 wrap 설치. 호출 후 +200ms/+1500ms 두 번 `tplArr()` sweep → `data:` 프리픽스이면서 `storagePath` 없는 모든 템플릿을 `templates/{id}.png` 경로로 업로드. 성공 시 `t.dataUrl=URL`, `t.storagePath=경로`, `persistState()` + 재렌더. 실패 시 dataUrl 유지(graceful degrade). 동시 업로드는 `inFlight[id]` 가드. Firebase 미설정/실패 시 자동 noop. **wrap 예외 사유**: 외부 서비스(Firebase Storage) 통합은 fbExport 본체와 책임이 다른 비동기 후처리라 분리 wrap이 자연스러움. work-log 원칙(추가 금지)에 대한 예외 1건으로 명시.
  - 다음 단계 후보: (a) 삭제 시 `dennFirebase.deletePath(t.storagePath)` hook, (b) Storage CORS 설정(재편집 시 캔버스 합성 회귀 회피), (c) 기존 dataUrl 템플릿 일괄 마이그레이션 도구.
- [x] `2026-05-18 | Claude Code | claude/backup-skip-unchanged | 자동 백업이 변경 없을 때 중복 파일 생성하지 않도록 스킵 | 상태: 완료`
  - 범위: denn-admin.html runAutoBackup / dennRunManualBackup
  - 메모: lastBackedUpJson 모듈 변수에 직전 직렬화 결과 보관. 동일하면 스킵 + 콘솔 로그. 수동 백업 직후에도 갱신해 직후 자동 주기 중복 회피.
- [x] `2026-05-18 | Claude Code | claude/auto-backup-feature | JSON 자동 백업 + 폴더 지정(File System Access API) 구현 | 상태: 완료`
  - 범위: denn-admin.html 기존 데이터 보호 IIFE 내부 확장 (L5640-5754 블록). 신규 wrap 없음.
  - 충돌 위험: 낮음 (기존 패널/스냅샷 로직 보존, 새 헬퍼만 추가하고 updatePanel UI 확장)
  - 메모: Chrome/Edge에서 폴더 1회 선택 → IndexedDB(denn_backup)에 핸들 보관. 자동 파일 백업(5/10/30/60분 주기) + 수동 백업 모두 동일 폴더로. 파일명 denn-backup-{auto|manual}-YYYY-MM-DD-HHmm.json. 7일 지난 auto 파일 자동 삭제. Firefox/Safari는 기본 다운로드 폴더 fallback. 새 localStorage 키 denn_backup_config_v1 (보호 키 미접촉). 보호 함수 무수정.
- [x] `2026-05-18 | Claude Code | claude/firebase-storage-step1 | Firebase Storage 연동 Step 1 (SDK init + 업로드 헬퍼) | 상태: 완료`
  - 범위: denn-admin.html 말미에 Firebase SDK 모듈 import + window.dennFirebase 헬퍼, docs/firebase-setup.md 신규
  - 충돌 위험: 없음 (격리된 module script, 다른 코드와 분리)
  - 메모: SDK만 활성화. fbExport 자동 연동(Step 2)은 사용자가 Console에서 Anonymous Auth + Storage Rules 설정하고 콘솔 테스트 통과 후 진행. docs/firebase-setup.md에 Console 세팅 절차 명시.
- [x] `2026-05-18 | Claude Code | claude/restore-quality-improve | DPR 강제 해제 + fbExport 1600x2400으로 화질 본격 개선 | 상태: 완료`
  - 범위: denn-admin.html zeRender(L8024) dpr 최소 2→1, fbExport 모든 경로(L1269, L2160, L2330, L3974) 800x1000~1200 → 1600x2400
  - 충돌 위험: 낮음 (DPR 자연값 회귀 + 단순 상수 확대)
  - 메모: 이전 DPR=2 강제는 FHD 모니터에서 이미지가 업스케일되어 어색한 안티앨리어싱 유발. 자연 DPR로 되돌리고, fbExport 해상도를 2배로 키워 합성 dataUrl 자체를 고해상도화. localStorage 확보 예정이라 4x 픽셀 부담 감수. 신규 업로드부터 자동 적용. 기존 템플릿은 재업로드/재저장 필요.
- [x] `2026-05-18 | Claude Code | claude/move-data-safety-panel | 데이터 보호 패널 우하단 → 좌측 사이드바 내부로 이동 | 상태: 완료`
  - 범위: denn-admin.html #denn-data-safety-panel CSS(L5624) + installPanel JS(L5714)
  - 충돌 위험: 낮음 (단일 패널 위치 변경)
  - 메모: position:fixed 제거. .sidebar 내부 .sb-foot 바로 위에 삽입. 알림 토스트와 더 이상 겹치지 않음. 사이드바 width 215px에 자동 맞춤.
- [x] `2026-05-18 | Claude Code | claude/fix-save-and-dpr | fbExport 1.5x 원복(저장/오픈 회귀 해소) + DPR 최소2 강제(supersampling) | 상태: 완료`
  - 범위: denn-admin.html zeRender(L8024), fbExport(L2330)
  - 충돌 위험: 낮음 (원복 + 작은 상수 변경)
  - 메모: fbExport 1200x1800 → localStorage 용량 초과로 saveNow 실패 → t.dataUrl 누락 → openZoneEditor 차단. 800x1200으로 원복. DPR=1 모니터에서도 텍스트 선명도 개선 위해 최소 2x 강제 (supersampling).
- [x] `2026-05-18 | Claude Code | claude/fix-template-sharpness | ze-canvas DPR 적용 + fbExport 합성 해상도 1.5x | 상태: 완료`
  - 범위: denn-admin.html setZePreviewZoom (L1527), 활성 zeRender (L8022), 활성 fbExport (L2330)
  - 충돌 위험: 낮음 (drawing/hit 코드는 canvas.width 기준이라 DPR 확대해도 그대로 동작; setZePreviewZoom만 CSS 표시를 ÷dpr로 보정)
  - 메모: ze-canvas 백킹을 DPR배수로 키워 레티나/4K에서 텍스트 선명. fbExport 합성 dataUrl 800×1200→1200×1800. 원본은 originalDataUrl로 풀해상도 보존 중. localStorage 부담 고려해 2x 대신 1.5x.
- [x] `2026-05-18 | Claude Code | claude/fix-boxw-slider | 텍스트 박스 너비 슬라이더가 가이드 박스 폭을 직접 결정하도록 변경 | 상태: 완료`
  - 범위: denn-admin.html zeTextGuideBox (L1645-1649)
  - 충돌 위험: 낮음 (가이드 박스 그리기 로직만)
  - 메모: 기존엔 박스폭=min(slider, 텍스트폭)이라 짧은 텍스트에선 슬라이더 무반응. 변경 후 박스폭=max(min, slider, 텍스트폭)로 슬라이더가 즉시 박스 폭에 반영됨. 텍스트 wrap은 기존대로 bwPx 기준.
- [x] `2026-05-18 | Claude Code | claude/fix-ze-coords-v365 | 상세설정 문구 추가/위치 이동 실제 원인 수정 | 상태: 완료`
  - 범위: denn-admin.html (v365 zeBindEvents wrap pass-through화 + Guard-A 제거)
  - 충돌 위험: 낮음 (래퍼만 정리, 본체 무수정)
  - 메모: 진짜 원인은 v365 wrap이 0~1 정규화 좌표를 쓰는데 base zeHitZone/zeRender는 캔버스픽셀/0~100% 기대 → hit 항상 -1, 신규 zone은 좌상단 박힘. Guard-A는 base mousedown(dragging먼저→setZT)을 항상 차단해서 activeType 전환을 막고 있었음.
- [x] `2026-05-18 | Codex | codex/diagnosis-text-field-position | 상세설정 문구 추가/위치 이동 불가 진단 문서화 | 상태: 완료`
  - 범위: docs/bug-diagnosis-text-field-position.md (신규)
  - 충돌 위험: 낮음 (문서 작업만, HTML 무수정)
  - 메모: 원인 후보를 #18/#19(v363 dynamic/parity wrap) 중심으로 정리 (실제 원인은 v365 wrap이었음)

---

## 최근 완료한 작업 5건
> 최신 완료 작업이 위로 오도록 유지하세요. (최대 5건)

1. `2026-05-19 | Claude Code | phase1-c-installguidepanel-fix | C안: installGuidePanel insertBefore NotFoundError 1줄 수정`
2. `2026-05-19 | Claude Code | phase1-b2-trigger-fix | B v2 후속: sweepHeavyV2 트리거 누락 보강`
3. `2026-05-19 | Claude Code | phase1-b2-localstorage-heavy-fields | B안 v2: heavy state 필드 마이그 + snapshot 슬림화 + deletedKeys 누수 청소`
4. `2026-05-19 | Claude Code | local-dev-server-setup | 로컬 정적 dev 서버 (start-dev.ps1 + docs/local-dev.md)`
5. `2026-05-19 | Claude Code | phase1-b-localstorage-migration-expand | B안 v1: localStorage 마이그레이션 확장 (4 필드) + 스냅샷 cleanup 헬퍼 + mockup-tool CORS 패치`
