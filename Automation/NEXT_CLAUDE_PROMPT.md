# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX` (Founder 결정 접수·기록 완료 → Codex 구현 계약 대기)

# 스펙 029 Founder 결정 승인됨 · Codex 구현 계약 대기 (구현 착수 금지)

Founder가 `스펙 029 Founder 권장안 D-2·D-3·D-5·D-6·D-7 일괄 승인.`을 그대로 승인했고, Claude Code가
결정을 정본 문서로 기록해 문서 전용 커밋으로 push했다:
`docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`.

## 루프·정지 보고 규칙 (유지)

- 진행할 수 없거나 Claude loop가 중단되면 멈춘 이유, 확인 근거와 마지막 Git 상태, 자동 해결 가능 여부,
  권장 다음 단계, 그대로 붙여넣을 수 있는 정확한 재개 프롬프트를 한 번 보고한다.
- 상태·HEAD·ahead/behind·dirty 경로·감시 문서 fingerprint가 30분 동안 전혀 변하지 않으면 loop를
  일시정지하고 같은 다섯 항목을 한 번 보고한다.
- 동일 정지 원인이 유지되는 동안 반복 알림하지 않는다.
- 개별 스펙 DONE만으로 전체 DENN loop를 종료하지 않는다.
- 폴링 주기 tier: 5분 = `WAITING_FOR_CLAUDE`·`CORRECTION_REQUIRED`·`READY_FOR_COMMIT`,
  15분 = `READY_FOR_CODEX`·`COMMITTED`·`WAITING_FOR_NEXT_SPEC`.

## 확정된 계약 (구현 스펙이 전제할 값)

**Founder 승인 (제품·UX)**

- D-2: case multi-zone은 **슬롯 카드 선택 + 활성 슬롯 표시**(캔버스 히트테스트로 zone 선택 없음)
- D-3: scale **1.0 ~ 5.0** 단일 범위, 내부 **무차원**, **표시만 %**, 휠·버튼은 **승산**
- D-5: **단일 `원래대로` 버튼**(레거시 `맞춤`+`↺` 중복 재현 금지)
- D-6: **1차 핀치 미지원** — 슬라이더·버튼·휠·키보드·마우스 drag만
- D-7: **클립 안 빈 공간 금지** — 최소 scale 1.0 + cover clamp 유지

**Codex 계약**

- D-1: 편집 상태 = `scale`(무차원) + 축별 **normalized pan `x/y ∈ [-1,1]`**(현재 scale의 축별 `maxPan`
  대비 비율, `maxPan=0`인 축은 0). **plan 생성 시에만** 현재 zone의 logical px로 환산
- D-4: 키보드 이동 = normalized **0.02/step**, Shift **0.10/step**
- D-8: **composer가 slot별 transform 소유**, 스펙 026 image owner 무변경(drawable·ref·intrinsic만)
- D-9: 이미지 교체·삭제, model/template/frame-size 변경 시 **초기화**. 색상 변경·활성 slot 전환은 **유지**

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 알려진 PNG 2개(및 Codex 소유 미커밋 문서) 외 변경이 없는지 확인.
3. Codex가 **스펙 029 구현 계약**(`docs/rebuild/specs/029-*.md`)과 허용 파일 목록을 push했는지 본다.
4. 스펙이 있으면 `WAITING_FOR_CLAUDE`로 보고 그 범위만 구현한다. 없으면 **어떤 파일도 수정·commit·push
   하지 않고** 조용히 대기한다(반복 보고 금지).

## 금지 (스펙 029 구현 계약이 push되기 전까지)

- pointer/pan/zoom 제품 코드·테스트·CSS·설정 변경
- 스펙 029 구현 문서를 Claude가 작성하는 것(구현 스펙은 Codex 소유)
- 승인된 값(D-1~D-9)을 임의로 바꾸거나 확장하는 것
- 스펙 026 owner의 `transform` 리터럴 타입 변경, `packages/render` 기하 계약 변경
- 핀치를 구현하거나 "검증됨"으로 기록하는 것(합성 TouchEvent는 PASS 근거 아님)
- 신규 의존성, Firebase/network/live/deploy, 운영 데이터·이미지 접근
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup, 사용자·Codex 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
