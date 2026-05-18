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

### 🔖 세션 종료 메모 (2026-05-18)
- **Firebase Storage 연동: Step 1 완료, Step 2는 다음에**
  - Step 1 완료: SDK init + `window.dennFirebase` 헬퍼 + `docs/firebase-setup.md` 설정 가이드
  - Step 2 대기: fbExport 4개 경로(L1269/L2160/L2330/L3974)에 자동 업로드 wrap 추가, dataUrl → Storage URL 교체, `t.storagePath` 저장(삭제용), graceful degrade(실패 시 dataUrl 유지)
  - **다음 세션 진입 전 사용자가 할 일**: Firebase Console에서 Anonymous Auth 활성화 + Storage Rules 적용 + 콘솔 테스트(`dennFirebase.uploadDataUrl`) 통과
  - 통과 확인 후 Step 2 진행

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

1. `2026-05-19 | Claude Code | claude/ze-canvas-display-fix | ze-canvas 백킹/표시 분리 (1200 supersample + 660 display, 표시·줌 안정화)`
2. `2026-05-19 | Claude Code | claude/ze-canvas-1200x1400 | ze-canvas 백킹 660×760 → 1200×1400 (글씨 흐림 해결)`
3. `2026-05-19 | Claude Code | claude/firebase-storage-step2 | Firebase Storage 자동 업로드 wrap (fbExport 후처리, data:→URL 교체)`
4. `2026-05-18 | Claude Code | claude/backup-skip-unchanged | 자동 백업 무변경 시 중복 파일 스킵`
5. `2026-05-18 | Claude Code | claude/auto-backup-feature | JSON 자동 백업 + 폴더 지정(FS Access API) + 보존 7일`
