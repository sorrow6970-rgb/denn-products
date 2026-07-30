# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` (스펙 029 구현 제출 · 독립 검증 대기)

# 스펙 029 구현 완료 · Codex 독립 검증 대기 (다음 기능 착수 금지)

스펙 §4 허용 파일 안에서만 구현하고 코드/test와 문서를 **분리 커밋**해 일반 fast-forward push했다.

- 코드/test: **`95fcf92`** (기준 `7701c7a`)
- 문서: 이 커밋 — 스펙 029 정본 §DONE, `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`,
  live log, `CURRENT.md`, Automation 2개

## 루프·정지 보고 규칙 (유지)

- 진행할 수 없거나 loop가 중단되면 멈춘 이유, 확인 근거와 마지막 Git 상태, 자동 해결 가능 여부,
  권장 다음 단계, 그대로 붙여넣을 수 있는 재개 프롬프트를 한 번 보고한다.
- 상태·HEAD·ahead/behind·dirty 경로·감시 문서 fingerprint가 30분 동안 변하지 않으면 loop를 일시정지하고
  같은 다섯 항목을 한 번 보고한다. 동일 원인으로 반복 알림하지 않는다.
- 개별 스펙 DONE만으로 전체 DENN loop를 종료하지 않는다.
- 폴링 주기 tier: 5분 = `WAITING_FOR_CLAUDE`·`CORRECTION_REQUIRED`·`READY_FOR_COMMIT`,
  15분 = `READY_FOR_CODEX`·`COMMITTED`·`WAITING_FOR_NEXT_SPEC`.

## 제출 내용 (검증 대상)

- **상태 모델**: composer가 슬롯별 `{scale, x, y}` 소유. `scale` 무차원 **1.0~5.0**, `x/y`는 축별 `maxPan`
  대비 **[-1,1]**, `maxPan=0` 축은 0 고정, logical px 환산은 **plan 직전에만**, resize는 normalized 유지 후 재환산.
- **어댑터 공식 비복제**: pan 0 **probe plan**의 `draw-image-cover`(`clipRect`/`drawRect`)에서 축별 `maxPan`을
  읽고 그 값으로 실제 plan을 만든다. 둘 중 하나라도 실패하면 **plan 미생성**(부분 plan·이전 transform 재사용 0).
- **안전 실패**: `readNormalizedTransform`이 범위 밖·비유한·hostile getter/Proxy trap/revoked Proxy를 **거부**
  (clamp 복구·기본값 생성 없음). 스펙 026 owner와 `packages/**`는 **무변경**.
- **입력**: mouse/pen Pointer Events + capture, 시작 snapshot 기준 절대 delta, rAF **1회 병합**,
  `pointerup`·`pointercancel`·`lostpointercapture`·선택 변경·unmount 종료 + **generation 가드**.
- **UI**: 슬라이더 100~500%, 버튼·휠 **`*1.1`/`/1.1`**(휠은 scale이 실제로 바뀔 때만 preventDefault),
  화살표 **0.02**/Shift **0.10**, 단일 **`원래대로`**, 슬롯 카드 선택 + `편집 중`, 사진 미준비 시 전부 disabled.
- **스크롤 보존**: 터치 drag·핀치 미구현, **`touch-action` 선언 0**, 무조건 `preventDefault` 0.
- **초기화 행렬**: 이미지 교체·삭제·실패 → 그 슬롯만 / model·template·frame-size·kind → 전체 /
  색상 변경·활성 슬롯 전환 → 유지.
- **구현 중 수정한 결함**: stale animation frame이 다음 세션의 pending 값을 소비해 재-grab 첫 move가 누락됨.

## 게이트 실측 (Claude)

- frozen install exit 0, **lockfile diff 0**, 신규 의존성 0
- format · lint · typecheck PASS
- **unit 938**(893 → 938, 신규 45) / **e2e 90 PASS**(85 → 90, 신규 5) · exit 0
- 독립 build PASS — mockup JS **254.06 → 263.19 kB**(gzip **78.90 → 81.56**),
  CSS **13.80 → 15.47**(gzip **3.53 → 3.88**), admin **무변경**
- `git diff --check` clean / 포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0
- dist **SHA-256 E2E 전후 동일**, fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**

## NOT TESTED (유지)

2손가락 핀치(미구현 + Playwright 구동 불가) · 터치 drag(1차 미지원) · 실기기 4환경 ·
실제 200% 브라우저 확대 · print/export pan 재현 · 대용량 사진 성능·EXIF · 운영 카탈로그·이미지.

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 스펙 018 PNG 2개와 **Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`** 외 변경이 없는지 확인.
3. Codex가 `CODEX_PASSED` / `CORRECTION_REQUIRED` / 다음 지시를 기록했는지 본다.
   - `CORRECTION_REQUIRED` → 지정된 허용 파일 범위만 보완하고 코드/문서 분리 커밋.
   - `CODEX_PASSED` → 종료 문서만 처리.
4. 변화가 없으면 **어떤 파일도 수정·commit·push하지 않고** 조용히 대기한다.

## 금지 (계속 유지)

- 다음 기능·다음 스펙(030 등) 착수, 확정된 D-1~D-9 값 변경·확장
- 터치 drag·핀치 구현, 전역 `touch-action:none`, 무조건 `preventDefault`
- 스펙 026 owner의 리터럴 transform 변경, `packages/**` 변경
- 핀치·실기기·200% 확대를 "검증됨"으로 기록하는 것(합성 이벤트는 PASS 근거 아님)
- 신규 의존성, Firebase/network/live/deploy, 운영 데이터·이미지 접근
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup,
  사용자·Codex 소유 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
