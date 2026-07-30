# NEXT CLAUDE PROMPT

상태: `FOUNDER_DECISION_REQUIRED`

# 스펙 030 이미지 회전 — Founder 결정 대기

조사 커밋 `8734307`은 Codex가 문서 범위와 근거를 검토해 승인했다.
아래 제품 결정을 Founder가 승인하기 전에는 어떤 파일도 수정·stage·commit·push하지 않는다.

## 권장안

- R-1: 고객 사진 회전은 90° 배수만 지원한다. UI는 `왼쪽으로 90°`, `오른쪽으로 90°` 버튼이다.
- R-2: 임의 각도를 도입하지 않으므로 스펙 029의 scale 1.0~5.0과 빈 공간 금지 계약을 변경하지 않는다.
- R-3: 액자 가로/세로 aspect 전환은 사진 회전과 분리하고 이번 스펙에는 도입하지 않는다.
- R-4: case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- R-5: template art는 고정하고 사용자 사진만 회전할 수 있게 한다.
- R-6: EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode 동작을 합성 EXIF fixture로 실측한다.

Codex 구조 계약 C-1~C-9는 `Automation/DENN_AUTOMATION_STATE.md`와 조사 보고서 §9.2대로 확정한다.

Founder 승인 문장:

```text
스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인.
```

결정 전에는 구현 스펙, 제품 코드·테스트·CSS·설정, 신규 의존성,
Firebase/network/live/deploy, 운영 데이터 접근을 금지한다. Codex 소유 RUNBOOK과 스펙 018 PNG도
restore·stage·commit하지 않는다. 동일 결정 대기 상태에서는 반복 보고하지 않는다.
