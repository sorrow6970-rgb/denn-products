# Spec 083 handoff - Admin Space V2 issue UI

## 현재 상태

- baseline: `HEAD=origin=ba9eb48`, ahead/behind 0/0
- completed: spec 082 `DONE / CODEX_PASSED`
- active: spec 083 `READY_FOR_CLAUDE`
- Founder: `OO-1=A`
- 전체 리빌드: **84~87% 완료 / 13~16% 잔여**. 이번 계약 문서만으로 수치는 올리지 않는다.

## Claude Code가 구현할 것

`docs/rebuild/specs/083-admin-space-v2-issue-ui.md`만 구현 정본으로 사용한다.

- existing authenticated C5 `ready-clean` baseline에서만 draft 시작
- PNG-only local owner와 실제 Canvas preview
- 같은 frozen generation의 fields + exact PNG exporter
- 기존 default app/Auth 재사용, 별도 exact gate default false, writer first issue까지 lazy
- password pair, single-flight, safe status/error, outcome unknown 차단
- confirmed success에서만 same-origin `?space=<token>`, 명시 copy만
- synthetic unit/E2E와 시각 결과. actual Firebase/network/emulator/deploy는 0

UI/UX 구현은 Claude Code가 담당한다. 기존 Modern Studio light 제품 UI를 보존하고 새 디자인 시스템,
landing-page 장식, 신규 dependency를 도입하지 않는다.

## 계속 닫힌 경계

실제 UID, live project/bucket/data/network, Rules·Hosting deploy, 운영 발급, publish, orphan cleanup,
password 저장·URL/자동 clipboard 포함, auto retry/merge, V1 migration, C6/backend는 승인되지 않았다.

보호 대상과 기존 dirty 파일은 수정·복원·stage·commit하지 않는다. 전체 Chromium이 spec-018 PNG를 다시
쓰더라도 그대로 둔다.

## 전달 문구

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 승인된 스펙 083 Admin Space V2 발급 UI 범위만 구현·검증해. 실제 UI/UX 구현은 Claude Code가 담당하고, actual Firebase/network/emulator/deploy는 실행하지 마.
```

완료 후 제품 commit과 기록 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. Codex
독립 검수 전 다음 스펙을 시작하지 않는다.
