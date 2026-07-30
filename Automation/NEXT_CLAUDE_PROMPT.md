# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` (스펙 030 사전 조사 제출 · 검토 대기)

# 스펙 030 사전 조사 완료 · Codex 검토 대기 (회전 구현 착수 금지)

읽기 전용 조사만 수행해 문서 전용 커밋으로 push했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`(15항목).

## 루프·정지 보고 규칙 (유지)

- 진행할 수 없거나 loop가 중단되면 멈춘 이유, 확인 근거와 마지막 Git 상태, 자동 해결 가능 여부,
  권장 다음 단계, 그대로 붙여넣을 수 있는 재개 프롬프트를 한 번 보고한다.
- 상태·HEAD·ahead/behind·dirty 경로·감시 문서 fingerprint가 30분 동안 변하지 않으면 loop를 일시정지하고
  같은 다섯 항목을 한 번 보고한다. 동일 원인으로 반복 알림하지 않는다.
- 개별 스펙 DONE만으로 전체 DENN loop를 종료하지 않는다.
- 폴링 주기 tier: 5분 = `WAITING_FOR_CLAUDE`·`CORRECTION_REQUIRED`·`READY_FOR_COMMIT`,
  15분 = `READY_FOR_CODEX`·`COMMITTED`·`WAITING_FOR_NEXT_SPEC`.

## 제출 내용 요약

- **레거시에 "사진 회전" 기능은 없다.** 회전 소유자는 4개다: ① 액자 가로/세로 ±90
  (`DENN_FRAME_ORIENTATION_V64` `:7180-7352`, **유일하게 사진 픽셀 회전**) ② 룸 목업 tilt(`:2130`)
  ③ 워터마크 기울기(admin `wm-rotation`) ④ 텍스트 존 회전(`z.rotation`, **인쇄 반영**).
  기기 방향 전환·회전 전체화면(`:2311` 등)은 **룸 표시 셸**이며 사진 transform과 무관.
- **①은 미완**(레거시 주석 `:15015-15029`): aspect transpose를 `normFrameRatio`(`:2659`)가 되돌려 캔버스는
  항상 portrait, 캔버스 CSS 회전은 no-op, 회전 경로는 **pan clamp 상실**, `T.rot ?? state.rot` **전역 폴백**
  때문에 **액자를 가로로 두면 케이스 사진까지 회전**.
- **인쇄는 회전을 무시**(`drawImageT` `:9732`·`:11371`) → 미리보기 ≠ 인쇄.
- **EXIF 직접 처리 0**(레거시·리빌드 모두). 리빌드는 `<img>`+`naturalWidth` 경로라 엔진 기본 동작 의존이며
  **이 저장소에서 미실측(NOT VERIFIED)**. 직접 파싱은 이중 회전·신규 의존성 때문에 비권장.
- **★ 계약 충돌**: **임의 각도는 스펙 029 Founder 확정값과 충돌**한다 — 45°에서 cover 최소 배율이 √2라
  `scale` 하한 **1.0(D-3)** 과 **빈 공간 금지(D-7)** 를 동시에 지킬 수 없다. **90° 배수만** 허용하면
  019 cover(입력 w/h swap 재사용)와 029 normalized pan이 **그대로** 유효하다.
- **★ 회전은 `packages/render` 계약 변경 전제**: plan에 rotation 필드 없음(`draw-image-stretch`는
  "no rotation" 명시), executor 헤더는 **"no setTransform/scale/rotate/translate"**.
- **결정 필요**: Founder **R-1~R-6**(각도 집합 / D-3·D-7 재해석 / 액자 가로·세로 분리 도입 / case 회전 /
  아트 템플릿 회전 / EXIF 직접 정규화) + Codex **C-1~C-9**(rot 필드 편입, `{0,90,180,270}` 거부형 정규화,
  화면축 pan + 회전 footprint maxPan, zone 중심+pan 회전, plan 선택적 quarter-turn, 커맨드 내부
  save/rotate/restore, probe에 rot 포함, **회전은 plan에 담아 print와 자동 일치**, 실패 시 plan 미생성).
- 최소 구현 순서 · 허용 파일 후보 · 검증 설계(EXIF 합성 JPEG 바이트 스플라이싱, 신규 의존성 0) ·
  지원 불가 · 근거 부족 · STOP 10조건도 기록.

## 이번 커밋의 검증

- 변경 파일이 문서 범위와 정확히 일치(보고서 1 + `CURRENT.md` + live log + Automation 2)
- `git diff --check` PASS
- 제품 코드·테스트·CSS·설정·manifest·`pnpm-lock.yaml`·PNG diff **0**, 신규 의존성 0
- 일반 fast-forward push, push 후 HEAD=origin·ahead/behind 0/0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 스펙 018 PNG 2개와 **Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`** 외 변경이 없는지 확인.
3. Codex가 조사 검토 결과(**R-1~R-6 Founder 결정 요청** 또는 구현 스펙 / 추가 조사 지시)를 기록했는지 본다.
4. 새 지시가 없으면 **어떤 파일도 수정·commit·push하지 않고** 조용히 대기한다(반복 보고 금지).

## 금지 (계속 유지)

- **회전 구현 착수**(R-1 각도 집합 확정 전), 스펙 030 구현 문서를 Claude가 작성하는 것
- 확정된 스펙 029 값(D-1~D-9) 임의 변경, 터치 drag·핀치·전역 `touch-action` 추가
- `packages/render/src/geometry/**`의 cover/clamp 공식 변경, 스펙 026 owner의 리터럴 transform 변경
- 회전을 plan 밖(UI 상태만)에 두는 설계, 회전 상태를 전역으로 두는 설계
- EXIF 직접 파싱·신규 의존성, 실기기 EXIF 동작을 "검증됨"으로 기록하는 것
- Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live, 운영 데이터·이미지, deploy
  (`hosting.public:"."` → Hosting 격리 전 배포 금지)
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup,
  사용자·Codex 소유 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
