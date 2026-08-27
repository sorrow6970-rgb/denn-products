# 스펙 081 Space V2 admin frozen issue session handoff

- 상태: `CORRECTION_REQUIRED / ROUND 1 / NON_UI / NO_LIVE_NETWORK` (Codex 검수 2026-08-27)
- Codex 검수 기준: `HEAD=origin=d7b84b0`, ahead/behind `0/0`
- 구현: 계약 문서 commit `7608977`, 제품 commit `7dc148f`
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

## 구현 결과 (2026-08-27, Claude Code)

계약 범위만 구현했다. 조항별 대조와 실측표는 스펙 081의 `### DONE (Claude) — 2026-08-27`이 정본이다.

- 신규 `apps/admin/src/space-v2/issue-session.ts` · `issue-session.test.ts` **2개뿐**이고 기존 제품
  파일은 하나도 수정하지 않았다.
- 한 frozen handle이 catalog snapshot·선택·방향·크기·색·transform과 proof exporter를 함께 소유한다.
  `issue()`는 password 쌍만 받으므로 arbitrary PNG를 metadata와 따로 주입할 수 없다. `copyFields()`는
  begin 시 1회 호출 뒤 deep clone으로 고정된다.
- 순서는 password exact match → export 1회 → fresh copy → 기존 bundle 1회 → 기존 write port 1회이며,
  각 실패는 뒤 단계 0이다. confirmed success만 token을 보존하고 objectPath/URL/clipboard 노출은 0이다.
  outcome unknown은 추측하지 않고 자동 retry·merge·새 token 발급은 0이다.
- 신규 unit **58/58**, 기존 bundle/write-port regression PASS, admin/firebase typecheck, 전체
  `node scripts/check.mjs` PASS(unit **2339/2339**). **admin/customer production bundle은 스펙
  명시값과 exact 일치**하고 CSS 2개도 SHA-256까지 무변경이다.
- `git diff --check` PASS, 허용 외 diff 0, 검사 포트 잔류 0. **Chromium E2E와 emulator는 NOT RUN**이며
  actual Firebase/network/live/UID/deploy·URL/clipboard·운영 발급·publish·orphan cleanup은
  **0 / NOT TESTED**다.
- 보고: 신규 두 파일을 LF로 커밋했지만 `.gitattributes`에 고정하지 않았다(스펙 081 허용 경로 밖).
  저장소 전체 line-ending 정책 결정 대상으로 남긴다.
- 다음은 Codex 검수(`CODEX_SPEC_081_REVIEW`)다. 실제 admin UI/UX와 production Canvas exporter 연결은
  후속 스펙이며 시작하지 않았다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여**.

## Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1

- 기준 `HEAD=origin=d7b84b0`, ahead/behind 0/0. 기존 targeted **146/146**, 전체 check(unit
  **2339/2339**), bundle/diff/port gate는 PASS했다.
- 임시 회귀 테스트 3건이 모두 실패했다: semantic-invalid frozen fields 사전 차단 누락, arbitrary writer
  error code 노출, non-UUID malformed success token 승인.
- 보완은 `issue-session.ts/test`, `.gitattributes` exact 두 경로 LF와 이 spec081 문서군만 허용한다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3. 실제 UI/SDK/network/live 범위는 계속 닫는다.
