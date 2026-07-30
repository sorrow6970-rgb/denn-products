# NEXT CLAUDE PROMPT

상태: `COMMITTED` → Codex 최종 hash 확인 대기 (다음 스펙 착수 금지)

# 스펙 029 종료 완료 · 다음 지시 대기

Codex가 보완 라운드 1 코드 **`110511e`** 와 문서 **`0512c8d`** 를 독립 재검증해 승인했고,
Claude Code가 **종료 문서만** 하나의 문서 커밋으로 처리해 일반 fast-forward push했다.
스펙 029는 **DONE**, 상태는 `COMMITTED`다.

## 루프·정지 보고 규칙 (유지)

- 진행할 수 없거나 loop가 중단되면 멈춘 이유, 확인 근거와 마지막 Git 상태, 자동 해결 가능 여부,
  권장 다음 단계, 그대로 붙여넣을 수 있는 재개 프롬프트를 한 번 보고한다.
- 상태·HEAD·ahead/behind·dirty 경로·감시 문서 fingerprint가 30분 동안 변하지 않으면 loop를 일시정지하고
  같은 다섯 항목을 한 번 보고한다. 동일 원인으로 반복 알림하지 않는다.
- **개별 스펙 DONE만으로 전체 DENN loop를 종료하지 않는다.**
- 폴링 주기 tier: 5분 = `WAITING_FOR_CLAUDE`·`CORRECTION_REQUIRED`·`READY_FOR_COMMIT`,
  15분 = `READY_FOR_CODEX`·`COMMITTED`·`WAITING_FOR_NEXT_SPEC`.

## 스펙 029 최종 기록

- 커밋 순서: `95fcf92`(구현 코드) → `197527c`(구현 문서) → `110511e`(보완 코드) → `0512c8d`(보완 문서)
  → 이 커밋(종료 문서)
- 최종 판정: unit **944/944**, E2E **91/91**, build mockup JS **263.31 kB**/gzip **81.60**,
  CSS **15.47/3.88**, admin **무변경**, `git diff --check` PASS, 포트·OS temp·저장소 프로세스 0,
  dist SHA-256 E2E 전후 동일·fixture 0, network/live/Firebase/CORS/deploy **0**
- 보완 2건: ① `pointerup`이 pending transform을 **정확히 1회 flush**(나머지 종료는 폐기, 이중 commit·
  다음 세션 오염 0) ② `setPointerCapture` 실패 시 **즉시 abort**(capture 없는 drag 계속 금지)
- 확정 계약: normalized 저장 + plan 직전 환산 · probe plan으로 어댑터 공식 비복제 · 잘못된 입력 거부 ·
  generation 가드 · rAF 1회 병합 · 슬라이더 100~500%/버튼·휠 1.1 승산 · 화살표 0.02·Shift 0.10 ·
  단일 `원래대로` · 슬롯 카드 선택 · **터치 drag·핀치 미지원 + `touch-action` 선언 0** ·
  초기화 행렬(색상·활성 슬롯 전환은 유지) · 스펙 026 owner와 `packages/**` 무변경

## NOT TESTED (스펙 029 종료 후에도 유지)

2손가락 핀치(미구현 + Playwright 구동 불가) · 터치 drag · 실기기 4환경(iOS Safari · Android Chrome ·
삼성 인터넷 · 카카오 인앱) · 실제 200% 브라우저 확대 · print/export 경로의 pan 재현(레거시 frame
하드코딩 `dim.w/500`은 별도 스펙) · 대용량 이미지의 실기기 성능 · EXIF 회전 · 운영 카탈로그·이미지.

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 스펙 018 PNG 2개와 **Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`** 외 변경이 없는지 확인.
3. Codex가 종료 문서 커밋의 hash를 확인해 `DONE`을 기록했는지, 또는 **다음 스펙(030 등)** 을 push했는지 본다.
4. 새 지시가 없으면 **어떤 파일도 수정·commit·push하지 않고** 조용히 대기한다(반복 보고 금지).

## 금지 (계속 유지)

- **다음 스펙(030 등)·사전조사·신규 기능 착수** (Codex 지시 전)
- 스펙 029 코드 재수정(승인 완료 — 재검증 없는 수정 금지), 확정된 D-1~D-9 값 변경
- 터치 drag·핀치 구현, 전역 `touch-action:none`, 무조건 `preventDefault`
- 스펙 026 owner의 리터럴 transform 변경, `packages/**` 변경
- 핀치·실기기·200% 확대를 "검증됨"으로 기록하는 것
- 신규 의존성, Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live, 운영 데이터·이미지, deploy
  (`hosting.public:"."` → Hosting 격리 전 배포 금지)
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup,
  사용자·Codex 소유 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
