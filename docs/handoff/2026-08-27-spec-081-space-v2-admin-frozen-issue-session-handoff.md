# 스펙 081 Space V2 admin frozen issue session handoff

- 상태: `READY_FOR_CLAUDE / CONTRACT_ONLY / NON_UI / NO_LIVE_NETWORK`
- 기준: `HEAD=origin=4765502`, ahead/behind `0/0`
- 선행: spec 080 `DONE / CODEX_PASSED`
- Founder 정본: `LL-1=A` ~ `LL-6=A`
- spec: `docs/rebuild/specs/081-space-v2-admin-frozen-issue-session.md`

## 이번 단위

Claude Code는 admin 발급 UI 전에 frozen issue session/controller만 구현한다. 한 source handle이 검증된
C5 catalog snapshot, 선택·방향·크기·색·transform과 proof exporter를 함께 소유하며, issue caller가
임의 PNG를 metadata와 따로 주입할 수 없어야 한다.

session은 proof export → 기존 `prepareSpaceV2LocalIssueBundle()` → 기존 injected
`SpaceV2IssueWritePort.issue()` 순서를 한 번만 실행한다. confirmed success만 token을 보존하고 URL,
clipboard, objectPath 노출은 없다. outcome unknown은 성공/실패로 추측하지 않으며 자동 retry·merge·새
token 자동 발급은 0이다.

## 닫힌 범위

`App.tsx`, React/UI/CSS/Canvas production exporter, admin composition, Firebase SDK wiring, Rules/config,
emulator/E2E, 실제 Firebase/network/live/UID/deploy, URL/clipboard, 운영 발급, publish, delete/orphan cleanup은
금지다. 기존 제품 파일을 수정하지 않고 신규 session/test만 추가한다.

## 검증 기준

targeted session + 기존 bundle/write-port unit, admin/firebase typecheck, 전체 `node scripts/check.mjs`,
admin/customer bundle exact hash, diff/forbidden/port gate를 실행한다. Chromium E2E와 emulator는 NOT RUN이다.

전체 리빌드 진행도는 **83~86% 완료 / 14~17% 잔여**로 유지한다. 계약 작성만으로 완료율을 올리지 않는다.

