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

1. `2026-05-18 | Claude Code | claude/move-data-safety-panel | 데이터 보호 패널을 좌측 사이드바 내부로 이동(알림 가림 해소)`
2. `2026-05-18 | Claude Code | claude/fix-save-and-dpr | fbExport 1.5x 원복 + DPR 최소2 supersampling 강제`
3. `2026-05-18 | Claude Code | claude/fix-template-sharpness | ze-canvas DPR + fbExport 해상도 1.5x로 템플릿 문구 선명도 개선`
4. `2026-05-18 | Claude Code | claude/fix-boxw-slider | 박스 너비 슬라이더 가이드 박스 즉시 반영`
5. `2026-05-18 | Claude Code | claude/fix-ze-coords-v365 | v365 zeBindEvents wrap 좌표계 버그 + Guard-A 부작용 수정`
