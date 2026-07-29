# Claude Live Patch Log

현재 프롬프트 단위의 구현·검증 기록만 append한다. 제품 결정이나 스펙 정본을 대신하지 않는다.

## 2026-07-29 — 스펙 025 보완 라운드 1

- 기준: `bfcf8d7`
- 코드/test: `6682e04`
- 문서: `2ae9f9a`
- 상태: Codex 독립 검증 PASS, 스펙 025 승인·종료
- 변경 범위:
  - `packages/render/src/plan/build.ts`
  - `packages/render/src/plan/build.test.ts`
  - `apps/mockup/src/canvas/productPlan.ts`
  - `apps/mockup/src/canvas/productPlan.test.ts`
- 핵심:
  - case builder 전체 1회 normalized snapshot
  - `zoneImages.get` property 단일 읽기
  - `sourceIndex` non-negative integer 검증
  - drift/hostile getter 회귀 테스트
- Codex 실측:
  - frozen PASS
  - check PASS, unit 716
  - E2E 58/58 PASS, exit 0
  - mockup JS/CSS gzip 68.40/3.16 kB
  - admin JS/CSS gzip 61.09/2.64 kB
  - 포트 4183/4184 free, temp staging 잔여 0
- 검증 중 재생성된 추적 PNG 1개는 Founder의 정확한 파일 승인 후 HEAD 승인본으로 복원했다.
- NOT TESTED: 실제 사용자 이미지 load/binding, CORS-clean, 운영 이미지, 실기기, 선명도.
- 다음: `FOUNDER_DECISION_REQUIRED` — 승인된 스펙 026 없음, 읽기 전용 대기.

## 2026-07-29 — 스펙 026 사전 조사 전이

- Founder가 보호형 루프 계속 진행을 승인했다.
- 상태: `WAITING_FOR_CLAUDE`
- 범위: 고객 상품 미리보기 연결 계약의 읽기 전용 근거 조사
- 구현·UI·Canvas 연결·실제 network·Firebase·deploy: 금지
- 결과: review 보고서 push 후 Codex 독립 검수

## 2026-07-29 — 스펙 026 사전 조사 (읽기 전용)

- 기준: `377d350` (HEAD=origin, 0/0, clean)
- 상태: `WAITING_FOR_CLAUDE` → 조사 완료 → `READY_FOR_CODEX`
- 범위: `Automation/NEXT_CLAUDE_PROMPT.md` 조사 10문항, 읽기 전용
- 변경 파일(허용 3개만):
  - `docs/codex-claude-handoff/reviews/2026-07-29-customer-preview-connection-investigation.md` (신규)
  - `docs/codex-claude-handoff/CURRENT.md`
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- 핵심 근거:
  - 고객 production 코드에 surface/adapter/projection import **0** (`App.tsx:1-8`, `BrowseFlow.tsx:6-31`)
  - 부족분 6종: case 색 / frame 색 선택 단계 / frame `logicalWidth` / `UserImageState` /
    `imageBindings` 소유자 / 마운트 지점
  - 레거시 사진 = `readAsDataURL` + `HTMLImageElement`, transform 초기화, revoke/abort/캐시 해제 없음
    (`denn-mockup-tool.html:1283`, `:1374-1391`, `:1408`)
  - `createImageBitmap`/`.decode()`/`OffscreenCanvas` 사용 0, `createObjectURL`은 다운로드 전용
  - 사용자 사진은 CORS 요구 없음 / 템플릿 아트를 Canvas에 올리면 필수 (`:11638-11662`, `:12138`)
  - 색·크기 계약이 스펙 025·022 제약과 충돌하는 지점 확인
- `FOUNDER_DECISION_REQUIRED` 9건, 근거로 확정 가능 9건을 분리해 기록
- 실행하지 않음: 코드/설정/테스트/PNG/lockfile 변경, 실제 Firebase GET, 이미지 다운로드,
  live test, 브라우저 파일 선택, deploy
- NOT TESTED: 실제 이미지 load/decode·binding·CORS-clean·실기기·선명도
- 다음: Codex 독립 검수 → 구현 스펙 026 작성(Claude는 착수하지 않음)
