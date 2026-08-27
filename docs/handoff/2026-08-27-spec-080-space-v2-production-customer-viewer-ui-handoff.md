# 스펙 080 Space V2 production customer viewer UI handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_VERIFIED / UI CONNECTED / NO_LIVE_NETWORK` (2026-08-27)
- 기준: `HEAD=origin=c9c0c3d`, ahead/behind `0/0`
- 구현: 계약 문서 commit `971c5fa`, 제품 commit `2319d1a`
- spec: `docs/rebuild/specs/080-space-v2-production-customer-viewer-ui.md`
- 선행: spec 078·079 `DONE / CODEX_PASSED`
- Founder 정본: LL-1~LL-6=A, MM-1~MM-6=A

## 다음 구현

Claude Code가 기존 `?space=` production route의 V1 의미를 보존하면서 V2 document dispatch, proof reader,
browser PNG decoder/drawable owner, replay controller와 React Canvas UI를 연결한다.

V2 성공은 실제 proof PNG를 `PreviewCanvasSurface`로 표시한다. V1은 스펙 063 안전 차단 UI를 그대로
유지한다. malformed V2는 V1으로 fallback하지 않고, 자동 retry·catalog/template/font fallback은 0이다.

디자인은 기존 Modern Studio light theme를 사용한다. proof가 유일한 주 시각 요소이며 새 이미지·토큰·
폰트·의존성·장식 모션은 없다. desktop/mobile 신규 screenshot과 targeted production-route Chromium,
axe/overflow/console/egress를 검증한다.

## 계속 닫힌 범위

actual Firebase/network/live/UID/data, Rules/CORS/Hosting deploy, admin issue UI, URL/clipboard, 운영 쓰기,
publish, orphan cleanup, package/lockfile/config 변경은 금지다. 전체 Chromium suite는 보호 PNG 부수효과로
NOT RUN이며 targeted production-route E2E만 실행한다.

전체 리빌드 진행도는 **81~84% 완료 / 16~19% 잔여**다. 문서 준비만으로 완료율을 올리지 않는다.

## 구현 결과 (2026-08-27, Claude Code)

계약 범위만 구현했다. 조항별 대조와 실측표는 스펙 080의 `### DONE (Claude) — 2026-08-27`가 정본이다.

- 신규 `apps/mockup/src/space-v2/browser-png-decoder.ts` · `production-controller.ts` ·
  `SpaceV2ProofView.tsx`와 각 test 3개. 수정은 `space/composition.ts` · `space/SpacePasswordGate.tsx` ·
  `App.tsx`와 그 test, e2e fixture, targeted E2E spec뿐이며 신규 결과 PNG 2개를 추가했다. V2 전용
  CSS는 필요하지 않아 만들지 않았다.
- exact `space-v2` marker만 V2 pipeline으로 가고 malformed V2는 V1으로 fallback하지 않는다. V1 route와
  스펙 063 안전 차단 UI는 그대로다. decoder와 drawable binding은 한 owner가 소유하고, V2 dependency는
  lazy·최대 1회 생성이며 document reader와 같은 config·같은 named app을 쓴다.
- 전체 `node scripts/check.mjs` PASS(unit **2278/2278**), targeted Chromium
  `space-production-route.spec.ts` **14/14 PASS**(axe·console·pageerror·320px overflow·keyboard
  submit·외부 request 0), 신규 desktop/mobile screenshot 육안 확인, `git diff --check` PASS, 허용 외
  diff 0, 검사 포트 잔류 0.
- 고객 bundle은 계약대로 변경됐다: `index-6js4DafP.js`/322,018 B → `index-nLbiXJi7.js`/340,481 B
  (+18,463 B) + 신규 lazy `firebase/storage` chunk 34,890 B. **admin bundle/CSS와 고객 CSS는
  무변경**이다.
- **full Chromium suite는 보호 spec-018 PNG 재기록 때문에 NOT RUN**이며 full-E2E PASS라고 기록하지
  않는다. actual Firebase/network/live/CORS/deploy/UID/admin issue UI/publish/orphan cleanup은
  **0 / NOT TESTED**다.
- 다음은 Codex 검수(`CODEX_SPEC_080_REVIEW`)다. 다음 스펙과 자동화·반복 작업은 시작하지 않았다.
- 전체 리빌드 진행도 **83~86% 완료 / 14~17% 잔여**.

## Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-27)

- 기준 `HEAD=origin=c63fe1b`, ahead/behind `0/0`.
- 독립 PASS: targeted unit **62/62**, 전체 check(unit **2278/2278**), 임시 스테이징 targeted Chromium
  **14/14**, 고객 entry exact SHA-256, `git diff --check`, 검사 포트 잔류 0. full Chromium은 계약대로
  NOT RUN이다.
- 결함 1: gate에 실제 form submit 경계가 없고 E2E는 password input이 아닌 submit button에 Enter를
  보낸다. 따라서 "password form keyboard submit" 기록은 폐기하고 semantic form + input Enter +
  exact-once 증거로 교체해야 한다.
- 결함 2: desktop/mobile 결과 PNG에 합성 fixture 전용 `화면 해제` control이 포함됐다. fixture 자체는
  수정하지 않고 screenshot 직전에 control만 숨겨 production customer surface를 다시 캡처한다.
- 허용 범위는 `SpacePasswordGate.tsx`와 test, targeted E2E spec, PNG 2개와 이 spec-080 문서군뿐이다.
  나머지 제품 코드/UI/CSS는 수정하지 않는다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3, next `CLAUDE_CORRECTION`. 진행도 **83~86% / 14~17% —
  변동 없음**.

## 보완 라운드 1 (2026-08-27, Claude Code)

Codex 라운드 1이 지적한 두 결함만 고쳤다. 조항별 대조와 실측표는 스펙 080의
`### DONE (Claude) — 보완 라운드 1 (2026-08-27)`이 정본이다. 검수 문서 commit `7c5fccb`,
보완 commit `280a6dc`.

- 비밀번호 input과 버튼을 semantic `<form onSubmit>`으로 묶고 `Button`에 `type="submit"`을 명시했다.
  버튼 `onClick`을 제거해 제출 경로가 하나뿐이며 `onSubmit`은 `preventDefault()` 뒤 기존 `submit()`을
  정확히 한 번 호출한다. 레이아웃·문구·password 즉시 삭제·single-flight는 그대로다.
- targeted E2E는 password input에서 Enter를 눌러 실제 제출을 검증하고 `documentReads` 1 ·
  `proofReads` 1 · `decodes` 1 · URL 무변경 · 성공 Canvas를 단언한다. 버튼 Enter는 더 이상 쓰지 않는다.
- spec-080 PNG 2개는 fixture 제품 코드를 건드리지 않고 캡처 직전 `[data-testid="fixture-unmount"]`만
  숨긴 뒤 재생성했다. 육안 확인 결과 `화면 해제`가 보이지 않는다.
- 전체 `node scripts/check.mjs` PASS(unit **2281/2281**), targeted Chromium **14/14 PASS**,
  `git diff --check` PASS, 허용 외 diff 0, 검사 포트 잔류 0. 고객 entry는 `index-BUT7Bmak.js` /
  340,604 B(+123 B)이고 고객 CSS·admin entry·admin CSS는 SHA-256까지 무변경이다.
- full Chromium suite는 보호 spec-018 PNG 때문에 계속 NOT RUN이며 actual Firebase/network/live/deploy는
  0 / NOT TESTED다.
- 상태 `READY_FOR_CODEX`, fix_round 1/3, next transition `CODEX_SPEC_080_REVIEW`.
- 전체 리빌드 진행도 **83~86% 완료 / 14~17% 잔여 — 변동 없음**.

## Codex 재검수 — CORRECTION_REQUIRED 라운드 2 (2026-08-27)

- 기준 `HEAD=origin=3b7c72c`, ahead/behind 0/0. form 기능 targeted unit **11/11**, targeted Chromium
  **14/14**, customer bundle exact, screenshot 2개 직접 검수는 PASS다.
- 전체 `node scripts/check.mjs`는 format 단계 FAIL. 보완된 세 TS/TSX/E2E 파일이 clean Windows
  checkout에서 `i/lf w/crlf`다. system `core.autocrlf=true`, 현재 `.gitattributes`에 이 경로들의 LF
  정책이 없다.
- 라운드 2는 `.gitattributes`에 정확한 세 파일만 `text eol=lf`로 고정하고 전체 check 재현성을
  증명한다. semantic code/test·PNG 변경은 허용하지 않는다.
- 상태 `CORRECTION_REQUIRED`, fix_round 2/3, next `CLAUDE_CORRECTION`. 진행도 **83~86% / 14~17% —
  변동 없음**.

## 보완 라운드 2 (2026-08-27, Claude Code)

Codex 라운드 2가 지적한 clean checkout EOL 재현성 한 가지만 고쳤다. 상세 근거와 실측표는 스펙 080의
`### DONE (Claude) — 보완 라운드 2 (2026-08-27)`가 정본이다. 재검수 문서 commit `1ae514a`, 보완
commit `85ac204`.

- `biome format`으로 결함을 재현했다 — diff는 전부 `␍`(CR)뿐이고 코드 내용 차이는 0이었다.
- `.gitattributes`에 정확히 세 경로(`SpacePasswordGate.tsx` · `SpacePasswordGate.test.tsx` ·
  `tests/e2e/space-production-route.spec.ts`)만 `text eol=lf`로 고정하고 worktree 사본을 LF로
  변환했다. 전역 `*.ts`/`*.tsx` 규칙으로 넓히지 않았다.
- `git ls-files --eol`이 세 파일 모두 `i/lf w/lf attr/text eol=lf`를 보고한다.
- 제품 semantic diff 0: staged diff는 `.gitattributes` 한 파일뿐, 세 파일은 `git diff --exit-code`
  clean, 고객 entry 해시는 Codex 기록값과 동일(`index-BUT7Bmak.js` / 340,604 B /
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1`).
- 전체 `node scripts/check.mjs` PASS(format 포함, unit **2281/2281**), targeted Chromium
  **14/14 PASS**, `git diff --check` PASS, 허용 외 diff 0, 검사 포트 잔류 0. spec-080 PNG는 재생성
  후 byte-identical이다.
- full Chromium suite는 보호 spec-018 PNG 때문에 계속 NOT RUN이며 actual Firebase/network/live/deploy는
  0 / NOT TESTED다.
- 상태 `READY_FOR_CODEX`, fix_round 2/3, next transition `CODEX_SPEC_080_REVIEW`.
- 전체 리빌드 진행도 **83~86% 완료 / 14~17% 잔여 — 변동 없음**.

## Codex 최종 검수 — PASSED (2026-08-27)

- 최종 기준 `HEAD=origin=4765502`, ahead/behind 0/0.
- exact 3-path LF policy, semantic diff 0, targeted unit **11/11**, 전체 check(unit **2281/2281**),
  OS temp targeted Chromium **14/14**, customer entry exact SHA-256, diff/port gate가 모두 PASS했다.
- 추가 결함 0. full Chromium suite는 계약대로 NOT RUN이고 actual Firebase/network/live/deploy는 0 /
  NOT TESTED다.
- 다음 순서는 비-UI 스펙 081 admin frozen issue session이다. 실제 admin UI/UX는 그 다음 Claude Code
  단위이며 이 handoff에서 시작하지 않는다.
