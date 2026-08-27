# 스펙 081 Space V2 admin frozen issue session handoff

- 상태: `CORRECTION_REQUIRED / ROUND 2 / NON_UI / NO_LIVE_NETWORK` (Codex 재검수 2026-08-27)
- Codex 재검수 기준: `HEAD=origin=c6ea3bf`, ahead/behind `0/0`
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

## 보완 라운드 1 (2026-08-27, Claude Code)

Codex 라운드 1이 지적한 fail-closed 3건만 고쳤다. 세 지적 모두 맞았다. 상세 근거와 실측표는 스펙
081의 `### DONE (Claude) — 보완 라운드 1 (2026-08-27)`이 정본이다. 검수 문서 commit `46b4754`,
보완 commit `096e65e`.

- **semantic preflight**: `beginDraft`가 `readLegacyCatalog` · `projectFramePreviewGeometry` ·
  `projectCatalogTemplateImage` · 순수 `encodeFrameReplayEvidenceV1`을 재사용해 exporter·UUID·hash·
  crypto 이전에 검증하고 detached 값만 저장한다. `structuredClone`은 제거했고 기존 preparation/
  bundle/identity 파일은 수정하지 않았다.
- **writer failure envelope**: 임의 문자열 code cast 제거. exact keys · 알려진 code/category ·
  boolean retryable · 이번 시도의 correlation id 일치를 확인하고 어긋나면 outcome-unknown/null.
- **writer success envelope**: prepared bundle의 token·objectPath와 둘 다 일치할 때만 승인하고
  confirmedToken은 로컬 token. 그 밖은 outcome-unknown/null, token null.
- 추가로 correlation id 형식 위반은 writer 호출 전 로컬 종료, `.gitattributes`에 신규 두 경로만
  `text eol=lf` 고정.
- 회귀 **43건 추가**(파일 101건), session+bundle+write-port **199/199**, 전체 `node scripts/check.mjs`
  PASS(unit **2382/2382**), **production bundle 두 개 exact 유지**, EOL **2/2**, `git diff --check`
  PASS, 허용 외 diff 0, 포트 잔류 0.
- **Chromium E2E와 emulator는 계속 NOT RUN**이며 actual Firebase/network/live/UID/deploy 등은
  **0 / NOT TESTED**다.
- 상태 `READY_FOR_CODEX`, fix_round 1/3, next transition `CODEX_SPEC_081_REVIEW`.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.

## Codex 재검수 — CORRECTION_REQUIRED 라운드 2

- 라운드 1의 기존 3개 결함과 EOL은 해결됐고 전체 check(unit 2382/2382), bundle/diff/port gate는
  PASS했다. targeted 독립 실측은 **189/189**이며 199/199 기록은 정정한다.
- known code와 잘못된 known category/retryable 조합이 definite failure로 승인되는 잔여 결함 1건을
  임시 test FAIL로 재현했다.
- 라운드 2는 `issue-session.ts/test`의 exhaustive code metadata mapping과 spec081 문서만 허용한다.
- 상태 `CORRECTION_REQUIRED`, fix_round 2/3. 실제 UI/SDK/network/live는 계속 닫는다.
