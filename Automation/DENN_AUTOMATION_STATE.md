# DENN automation state

```yaml
updated_at: 2026-08-27
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-080-space-v2-production-customer-viewer-ui   # DONE, CODEX_PASSED, LOCAL_VERIFIED, UI_CONNECTED, NO_LIVE_NETWORK
active_unit: spec-081-space-v2-admin-frozen-issue-session
state: CORRECTION_REQUIRED
baseline_commit: d7b84b0   # HEAD=origin at Codex spec 081 review round 1
candidate_commit: 096e65e  # spec 081 correction round 1 (implementation 7dc148f, contract docs 7608977)
verified_commit: 4765502   # spec 080; spec 081 correction 1 has one reproduced metadata mismatch
origin_relation: "correction round 1 applied on HEAD=origin=d7b84b0, ahead/behind 0/0; pushed fast-forward"
working_tree: "Codex spec 081 correction round 2 documents are uncommitted; pre-existing protected Founder/user changes remain untouched and unstaged"
fix_round: 2
max_fix_rounds: 3
next_transition: CLAUDE_CORRECTION
automation_loop: stopped (manual Claude Code -> live log -> Codex review -> next prompt handoff only)
commit_owner: Claude Code implementation; Codex independent review and next-contract handoff
push_policy: fast-forward-only
deploy: forbidden
overall_rebuild_progress: "estimated 84-87% complete; 13-16% remaining to production cutover"
progress_basis: "7 roadmap workstreams; management estimate, not spec-count arithmetic; final spec denominator is not fixed"
```

## 스펙 081 Codex 재검수 — CORRECTION_REQUIRED 라운드 2 (2026-08-27)

- 기준 `HEAD=origin=c6ea3bf`, ahead/behind `0/0`. 보완 `096e65e`, 기록 `c6ea3bf`.
- 라운드 1의 semantic preflight, arbitrary code 차단, success token/path exact match, EOL 2/2는 확인됐다.
- 기존 게이트 PASS: session+bundle+write-port targeted 실측 **189/189**(live의 199/199는 부정확), 전체
  check(unit **2382/2382**), bundle exact, diff/port gate.
- 잔여 결함: failure envelope는 code와 category가 각각 알려진 값이고 retryable이 boolean인지만 본다.
  `AUTH_REQUIRED + VALIDATION + false`처럼 code의 정본 metadata와 불일치한 조합도 definite error로
  승인된다. 라운드 1 지시의 code/category/retryable **일관성 검사**가 미완료다.
- 임시 Codex 회귀 테스트 1건은 **FAIL**로 재현됐고 즉시 삭제했다. 제품 diff는 0이다.
- 상태 `CORRECTION_REQUIRED`, fix_round **2/3**, next `CLAUDE_CORRECTION`. 전체 진행도
  **84~87% 완료 / 13~16% 잔여 — 변동 없음**.


## 스펙 081 보완 라운드 1 수행 — fail-closed 3건 (2026-08-27)

- 기준 `HEAD=origin=d7b84b0`, ahead/behind 0/0. Codex 검수 문서 commit `46b4754`, 보완 commit
  `096e65e`. Codex가 지적한 **세 결함만** 고쳤고 기존 58건의 순서·lifecycle 계약은 하나도 되돌리지
  않았다. 세 지적 모두 **맞았다**.
- **결함 1 — semantic preflight 부재.** 기존 `freezeFields()`는 exact 6키와 `structuredClone` 성공만
  봐서 `catalog:null`처럼 clone은 되지만 계약상 invalid한 조합이 `draft-ready/canIssue:true`가 됐다.
  이제 `beginDraft`가 **기존 경계를 재사용해** exporter·UUID·hash·crypto **이전에** 검증한다 —
  `readLegacyCatalog`(catalog detach) → `projectFramePreviewGeometry`(selection reference·geometry) →
  `projectCatalogTemplateImage`(첫 capability: 텍스트 0·시계 없음·art 부재 증명) → 순수
  `encodeFrameReplayEvidenceV1`(orientation vs projected aspect·logicalWidth·color·transform).
  저장하는 값은 그 경계들이 돌려준 **detached 값**뿐이라 `structuredClone`은 제거했다(이미 detach됨).
  range/format/aspect 규칙을 이 파일에서 재기술하지 않아 drift 여지가 없다. 기존 issue
  preparation/bundle/identity 파일은 **수정하지 않았다**.
- **결함 2 — unknown writer code 유출.** 기존 코드는 `typeof code === "string"`이면 임의 문자열을
  `SpaceV2IssueErrorCode`로 cast했다. 이제 result 전체를 exact-key로 검사한다 — top-level `{ok,error}`,
  error `{category,code,retryable,correlationId}`, code·category는 스펙 074 **알려진 vocabulary**,
  `retryable`은 boolean, `correlationId`는 **이번 시도가 실제로 보낸 값**과 일치해야 한다. code→category
  표는 port의 소관이라 재도출하지 않는다(중복은 drift를 만든다). 하나라도 어긋나면
  `outcome-unknown/errorCode:null`이고 port의 문자열은 snapshot에 들어가지 않는다.
- **결함 3 — malformed success 승인.** 기존엔 non-empty token만 봤다. 이제 exact `{ok,value}` envelope의
  `token`·`objectPath`가 **prepared bundle이 이미 확정한 값과 둘 다 일치**할 때만 승인하고(추가로
  lowercase UUID v4 shape도 확인), `confirmedToken`은 port의 echo가 아니라 **로컬에서 준비한 token**을
  쓴다. non-UUID·다른 UUID·다른 path·extra/missing/hostile value는 `outcome-unknown/errorCode:null`이며
  `confirmedToken`은 null이다.
- **추가 보완.** correlation id가 port의 형식을 만족하지 않으면 writer를 부르기 전에 로컬에서 닫는다
  (아무것도 persist되지 않으므로 `PREPARATION_FAILED`). `.gitattributes`에 **정확히 두 경로만**
  `text eol=lf`로 추가했다(스펙 080 라운드 2와 같은 clean-checkout 사유, 전역 TS/TSX 정책 아님).
- **회귀 테스트 43건 추가(파일 총 101건).** preflight 0-call 24건 — `catalog:null` · 빈 catalog ·
  legacy가 아닌 문서 · 없는 frameSizeId/templateId · non-string/extra-key selection · portrait aspect에
  landscape · 잘못된 orientation · logicalWidth 0/음수/소수 · 이름 색·잘못된 hex·비문자열 색 ·
  scale 범위 밖 · pan 범위 밖 · 잘못된 rotation · transform 키 누락 · art 존재 · art 분류 불가 ·
  텍스트 존 · 물리 시계. writer failure envelope 9건(임의 code marker·unknown category·비boolean
  retryable·다른 correlationId·extra/missing key·top-level extra·non-object error·정상 failure 유지).
  writer success envelope 9건(non-UUID token·다른 token·다른 path·extra/missing key·non-object value·
  top-level extra·hostile getter·로컬 correlation id 거부). marker 문자열이 snapshot에 없음을 모두
  단언한다.
- **실측.** targeted session **101/101**, session+bundle+write-port **199/199**, admin/firebase
  typecheck PASS, 전체 `node scripts/check.mjs` **PASS**(unit **2382/2382**, 이전 2339 + 43).
- **production bundle exact unchanged.** admin entry `index-D0XOQpRL.js` / `226,201 B` /
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`, customer entry
  `index-BUT7Bmak.js` / `340,604 B` /
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1` — 스펙 081 명시값과 **여전히
  완전 일치**. CSS 2개도 SHA-256까지 무변경이다.
- `git ls-files --eol` 신규 두 파일 **2/2 `i/lf w/lf attr/text eol=lf`**. `git diff --check` PASS,
  변경 경로는 `issue-session.ts(.test.ts)` · `.gitattributes` 2줄 · spec 081 문서뿐이고 허용 외 diff
  **0**(App/UI/CSS/Canvas exporter·admin composition·`packages/**`·Rules/firebase config/emulator·
  package/lockfile·`pnpm-workspace.yaml` 무변경). 검사 포트 4183/4184/4185/8080/9099/9199 잔류 **0**.
- **Chromium E2E와 emulator는 계속 NOT RUN**이며 PASS라고 기록하지 않는다. actual Firebase/network/
  live/UID/deploy, URL/clipboard, 운영 발급, publish/delete/orphan cleanup은 **0 / NOT TESTED**다.
- 상태 `READY_FOR_CODEX`, fix_round **1/3**, next transition `CODEX_SPEC_081_REVIEW`. 다음 UI 스펙과
  자동화·반복 작업은 시작하지 않았다.
- 전체 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**(fail-closed 결함 보완이지 새 제품 능력이
  아니다).

## 스펙 081 Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-27)

- 검수 기준 `HEAD=origin=d7b84b0`, ahead/behind `0/0`. 계약 `7608977`, 구현 `7dc148f`, 기록
  `d7b84b0`을 대조했다.
- 기존 게이트는 PASS했다: session+bundle+write-port targeted **146/146**, 전체
  `node scripts/check.mjs` PASS(unit **2339/2339**), admin/customer bundle exact, `git diff --check`,
  검사 포트 잔류 0.
- 결함 1: `freezeFields()`는 exact keys와 `structuredClone`만 검사한다. `catalog:null`처럼 clone 가능한
  semantic-invalid fields를 `draft-ready/canIssue:true`로 허용한다.
- 결함 2: writer failure의 `error.code`가 어떤 string이든 `SpaceV2IssueErrorCode`로 cast돼 public
  snapshot에 노출된다. 임시 marker가 그대로 `errorCode`에 나타났다.
- 결함 3: writer success token은 non-empty string만 검사한다. malformed writer의 non-UUID marker가
  `success/confirmedToken`으로 승인됐다.
- 임시 Codex 회귀 테스트 3건은 **3/3 FAIL로 결함을 재현**했고 즉시 삭제했다. 제품 diff는 0이다.
- 신규 두 파일은 현재 `i/lf w/lf`지만 attr가 unspecified이고 system `core.autocrlf=true`다. clean
  checkout 재현성을 위해 라운드 1에 exact 두 경로 `text eol=lf`를 허용한다.
- 상태 `CORRECTION_REQUIRED`, fix_round **1/3**, next `CLAUDE_CORRECTION`. UI/SDK composition/actual
  Firebase/live는 계속 닫는다.
- 전체 리빌드 진행도 **84~87% 완료 / 13~16% 잔여 — 변동 없음**.


## 스펙 081 admin frozen issue session 구현 완료 (2026-08-27)

- 기준 `HEAD=origin=4765502`, ahead/behind 0/0. 계약 문서 commit `7608977`, 구현 commit `7dc148f`.
  허용 목록 밖 제품 파일은 만들지 않았고 기존 제품 파일은 하나도 수정하지 않았다.
- **변경 파일 2개.** 신규 `apps/admin/src/space-v2/issue-session.ts` ·
  `apps/admin/src/space-v2/issue-session.test.ts`. 같은 폴더의 추가 helper 쌍은 필요하지 않아 만들지
  않았다.
- **frozen source.** `issue()`는 password 쌍만 받는다. arbitrary PNG를 metadata와 함께 주입하는 seam은
  없다. `beginDraft(source)`가 exact 2-key handle에서 두 method를 각각 한 번 읽어 원 receiver에
  bind하고 `copyFields()`를 **정확히 한 번** 호출한 뒤 결과를 **deep clone**해 고정한다. 그래서
  begin 이후 caller가 catalog/selection/transform을 mutation하거나 exporter를 바꿔치기해도 발급되는
  값은 최초 frozen 값뿐이다. clone 불가 payload는 fail-closed다.
- **exact 순서.** password exact match(실패 시 exporter·UUID·hash·crypto·writer **0**) → frozen
  `exportProofPng()` **1회** → `Uint8Array` 확인 + fresh copy → `prepareSpaceV2LocalIssueBundle()`
  **1회** → `createCorrelationId()` → writer `issue()` **1회**. unit이 실제 호출 순서를
  `fields → export → uuid#1 → uuid#2 → sha×3 → encrypt → write`로 고정한다.
- **결과 처리.** writer confirmed success만 `success` + token이고 objectPath는 public snapshot에 없으며
  URL은 만들지 않는다. `UPLOAD/DOCUMENT_OUTCOME_UNKNOWN`은 별도 `outcome-unknown` status로 두고
  성공/실패로 추측하지 않는다. writer가 throw하거나 malformed 결과를 주면 요청이 이미 떠났으므로
  같은 `outcome-unknown`으로 닫는다. writer의 `retryable: true`는 자동 retry 권한이 아니다.
- **중단 안전성.** writer 호출 전 draft 교체/clear는 안전하므로 late completion만 버린다. writer 호출
  **뒤**의 교체/clear는 취소됐다고 추측하지 않고 session을 `outcome-unknown`으로 닫는다. 중복
  `issue()`, StrictMode성 재호출, dispose 뒤 호출은 두 번째 export/write를 만들지 않고 late 결과가
  최신 상태를 덮지 않는다(generation).
- **정보 경계.** password는 preparation 호출 직후 session local reference에서 비운다. 오류 snapshot은
  safe code만 가지며 password, UUID/token 값·조각, object path, digest, bytes, UID/email, child code,
  raw SDK message가 없다. unit이 직렬화 문자열로 이를 단언한다.
- **경계 준수.** 이 module은 `@denn/firebase/space-write`의 **type과 injected port만** 사용한다. SDK
  facade factory import, default app/Auth 생성, network, DOM, Canvas, URL, clipboard, clock, 전역
  randomness는 **0**이다. unit이 mock된 firebase entry point가 한 번도 로드되지 않고 `Date.now`·
  `Math.random`·`fetch`가 호출되지 않음을 고정한다. `App.tsx`/`main.tsx`/barrel에서 도달 불가라
  production bundle이 바뀌지 않는다.
- **실측.** 신규 session unit **58건** PASS(계약 13항목 전부 커버), 기존 `issue-bundle` ·
  `space-write` targeted regression PASS, admin/firebase typecheck PASS, 전체
  `node scripts/check.mjs` **PASS**(unit **2339/2339**, 이전 2281 + 58).
- **production bundle exact unchanged 확인.** admin entry `index-D0XOQpRL.js` / `226,201 B` /
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`, customer entry
  `index-BUT7Bmak.js` / `340,604 B` /
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1` — 스펙 081이 명시한 값과 **완전
  일치**. admin CSS `index-DJ_z3tK1.css`(9,146) · 고객 CSS `index-BjqjBda8.css`(19,381)도 SHA-256까지
  무변경이다.
- `git diff --check` PASS, 변경 경로는 허용된 신규 2개와 spec 081 문서뿐이며 허용 외 diff **0**.
  검사 포트 4183/4184/4185/8080/9099/9199 잔류 **0**, 강제 종료 0.
- **Chromium E2E와 emulator는 NOT RUN**이며 PASS라고 기록하지 않는다. actual Firebase/project/bucket/
  data/network/live/UID/deploy, URL/clipboard, 운영 발급, publish, delete/orphan cleanup은
  **0 / NOT TESTED**다. LL-4 production composition을 완료했다고 기록하지 않는다.
- **보고 사항(범위 밖이라 하지 않은 것).** 신규 두 파일은 worktree에 LF로 커밋했지만
  `.gitattributes`에 고정하지 않았다 — 스펙 081 허용 경로가 아니기 때문이다. `core.autocrlf=true`
  환경에서 재-checkout되면 스펙 080 라운드 2와 같은 format 실패가 재발할 수 있으므로, 저장소 전체
  line-ending 정책 결정 대상으로 남긴다.
- 상태 `READY_FOR_CODEX`, next transition `CODEX_SPEC_081_REVIEW`. 다음 admin UI 스펙과 자동화·반복
  작업은 시작하지 않았다.
- 전체 진행도 **84~87% 완료 / 13~16% 잔여**. admin 발급의 비-UI core가 닫혔지만 실제 admin UI/UX,
  production Canvas exporter 연결, SDK composition, 실제 Firebase/Rules 배포·live 검증은 그대로 남는다.

## 스펙 080 Codex 최종 검수 PASS · 스펙 081 계약 준비 (2026-08-27)

- 최종 검수 기준 `HEAD=origin=4765502`, ahead/behind `0/0`. 보완 commit `85ac204`, 기록 commit
  `4765502`.
- `.gitattributes`는 정확한 세 파일만 `text eol=lf`로 고정하며 세 파일 모두
  `i/lf w/lf attr/text eol=lf`다. semantic source/test와 spec-080 PNG diff는 0이다.
- 독립 targeted gate unit **11/11**, 전체 `node scripts/check.mjs` PASS(unit **2281/2281**), OS temp
  targeted Chromium **14/14**, customer entry SHA-256
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1`, diff/port gate가 PASS했다.
- 추가 결함 0. 스펙 080은 `DONE / CODEX_PASSED / LOCAL_VERIFIED / UI_CONNECTED /
  NO_LIVE_NETWORK`다. full Chromium suite는 보호 spec-018 PNG 때문에 NOT RUN이고 actual Firebase/
  network/live/deploy/actual UID는 0 / NOT TESTED다.
- Founder LL 순서에 따라 다음 수동 단위 `081-space-v2-admin-frozen-issue-session` 계약과 handoff를
  작성했다. 하나의 frozen source가 issue metadata와 proof exporter를 함께 소유하는 non-UI session만
  허용한다.
- actual admin UI/UX, App composition, Firebase SDK wiring, Rules/config, emulator/E2E, URL/clipboard,
  운영 발급·publish·delete/orphan cleanup은 스펙 081에서 계속 금지다.
- 전체 리빌드 진행도 **83~86% 완료 / 14~17% 잔여 — 문서 준비로 변동 없음**.


## 스펙 080 보완 라운드 2 수행 — clean checkout EOL 재현성 (2026-08-27)

- 기준 `HEAD=origin=3b7c72c`, ahead/behind 0/0. Codex 재검수 문서 commit `1ae514a`, 보완 commit
  `85ac204`. Codex가 지적한 **EOL 재현성 한 가지만** 고쳤고 라운드 1의 form/screenshot 결론은 하나도
  되돌리지 않았다.
- **재현 확인.** `biome format`을 세 파일에 직접 돌려 결함을 재현했다 — diff는 전부 `␍`(CR)뿐이고
  코드 내용 차이는 0이었다. 즉 실패 원인은 line ending 하나이며 Codex 판정이 정확하다.
- **원인.** system `core.autocrlf=true`이고 기존 `.gitattributes`는 `*.bat`/`*.cmd`/`*.ps1`만
  CRLF로 고정한다. commit blob은 이미 LF지만 Windows checkout이 worktree를 CRLF로 만들고, Biome은
  LF로 포맷하므로 전체 check가 format 단계에서 FAIL한다.
- **보완.** `.gitattributes`에 **정확히 그 세 경로만** `text eol=lf`로 고정했다 —
  `apps/mockup/src/space/SpacePasswordGate.tsx` · `apps/mockup/src/space/SpacePasswordGate.test.tsx` ·
  `tests/e2e/space-production-route.spec.ts`. 전역 `*.ts`/`*.tsx` 규칙이나 다른 경로 정책으로
  넓히지 않았다(저장소 전체 line-ending 정책은 별도 결정이며 이번 보완의 범위가 아니다). 이유는
  파일 주석에 남겼다. 그 뒤 세 파일의 worktree 사본을 CRLF→LF로 변환했다.
- **검증.** `git ls-files --eol`이 세 파일 모두 **`i/lf w/lf attr/text eol=lf`**로 나온다.
  `biome format` 세 파일 clean.
- **semantic diff 0 증명.** 이 보완 commit의 staged diff는 `.gitattributes | 9 +++++++++` **한
  파일뿐**이고 세 파일은 `git diff --exit-code` clean이다. 고객 entry 해시도 Codex가 기록한 값과
  **동일**하다 — `index-BUT7Bmak.js` / `340,604 B` /
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1`. 제품 semantic 변경이 없다는
  가장 직접적인 증거다.
- **실측 재검증.** 전체 `node scripts/check.mjs` **PASS**(format 포함, unit **2281/2281**),
  targeted Chromium `space-production-route.spec.ts` **14/14 PASS**, `git diff --check` PASS,
  검사 포트 4183/4184/4185/8080/9099/9199 잔류 **0**, 강제 종료 0.
- **무변경 확인.** 고객 CSS `index-BjqjBda8.css`(19,381) · admin entry `index-D0XOQpRL.js`(226,201) ·
  admin CSS `index-DJ_z3tK1.css`(9,146) 모두 SHA-256까지 동일. spec-080 PNG 2개는 E2E 재실행으로
  다시 생성됐지만 **byte-identical**이라 diff 0이고, spec-063 PNG도 diff 0이다.
- 변경 파일은 `.gitattributes`와 spec-080 상태 문서뿐이다. 제품 semantic diff, PNG 재생성 diff,
  Rules/firebase/package/lockfile 변경 **0**. 보호 대상과 기존 user working-tree 변경은 읽기만 했다.
- **full Chromium suite는 보호 spec-018 PNG 때문에 계속 NOT RUN**이며 PASS라고 기록하지 않는다.
  actual Firebase/network/live/deploy는 **0 / NOT TESTED**다.
- 상태 `READY_FOR_CODEX`, fix_round **2/3**, next transition `CODEX_SPEC_080_REVIEW`. 다음 스펙과
  자동화·반복 작업은 시작하지 않았다.
- 전체 진행도 **83~86% 완료 / 14~17% 잔여 — 변동 없음**(config 재현성 보완이지 새 제품 능력이 아니다).

## 스펙 080 Codex 재검수 — CORRECTION_REQUIRED 라운드 2 (2026-08-27)

- 재검수 기준 `HEAD=origin=3b7c72c`, ahead/behind `0/0`. 보완 commit `280a6dc`과 결과 기록을
  독립 검증했다.
- 기능·시각 보완은 통과했다. targeted gate unit **11/11**, OS temp staging targeted Chromium
  **14/14 PASS**, customer entry SHA-256
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1`. desktop/mobile PNG에서
  fixture `화면 해제`가 제거됐고 390px overflow도 보이지 않는다.
- 전체 `node scripts/check.mjs`는 **FAIL**이다. format 단계가
  `SpacePasswordGate.tsx`, `SpacePasswordGate.test.tsx`, `space-production-route.spec.ts` 3개를
  CRLF로 판정했다. `git ls-files --eol`은 세 파일 모두 `i/lf w/crlf`, system Git은
  `core.autocrlf=true`, 현재 `.gitattributes`에는 Windows script 규칙만 있음을 확인했다.
- commit blob은 이미 LF이므로 semantic code를 다시 바꾸지 않는다. 최소 durable 보완은
  `.gitattributes`에 위 정확한 3개 경로만 `text eol=lf`로 고정하고 exact 파일을 LF로 materialize한 뒤
  clean checkout 전체 check를 재현하는 것이다. 전역 `*.ts`/`*.tsx` 정책 확장은 금지한다.
- 상태 `CORRECTION_REQUIRED`, fix_round 2/3, next transition `CLAUDE_CORRECTION`. 다음 스펙과
  자동화·반복 작업은 시작하지 않는다.
- 전체 진행도 **83~86% 완료 / 14~17% 잔여 — 변동 없음**.

## 스펙 080 보완 라운드 1 수행 (2026-08-27)

- 기준 `HEAD=origin=c63fe1b`, ahead/behind 0/0. Codex 검수 문서 commit `7c5fccb`, 보완 commit
  `280a6dc`. Codex가 지적한 **두 결함만** 고쳤고 다른 계약 결론은 되돌리지 않았다.
- **보완 1 — 실제 form.** `SpacePasswordGate`의 비밀번호 input과 버튼을 semantic
  `<form onSubmit>`(`data-testid="space-password-form"`)으로 묶고 `Button`에 `type="submit"`을
  명시했다. 버튼의 `onClick`은 제거해 제출 경로가 하나뿐이고, `onSubmit`은 `preventDefault()` 뒤
  기존 `submit()`을 **정확히 한 번** 호출한다. 레이아웃·문구·password 즉시 삭제·single-flight 계약은
  그대로다(form에 `denn-stack`을 줘 기존 12px 간격이 동일하다).
- **보완 1 검증.** unit 3건이 form·`type="submit"`·input-in-form 구조와 "제출할 게 없으면 form 자체가
  없다"를 고정한다. targeted E2E helper는 **password input을 fill한 뒤 그 input에서 Enter**를 누르고
  (버튼 Enter는 더 이상 쓰지 않는다), 성공 case가 `documentReads` **1** · `proofReads` **1** ·
  `decodes` **1** · URL 무변경(preventDefault 유지) · Canvas ready를 단언한다.
- **보완 2 — screenshot 증거.** fixture 제품 코드는 **수정하지 않고** screenshot case에서 캡처 직전
  page 안의 `[data-testid="fixture-unmount"]`만 숨긴 뒤 같은 두 PNG를 재생성했다. desktop/mobile 모두
  육안 확인했고 **`화면 해제`가 보이지 않으며** production customer surface만 남았다.
- **실측.** 전체 `node scripts/check.mjs` PASS(unit **2281/2281** — 이전 2278 + form unit 3),
  targeted Chromium `space-production-route.spec.ts` **14/14 PASS**.
- **bundle 비교.** 고객 entry `index-nLbiXJi7.js` / `340,481 B` → `index-BUT7Bmak.js` / `340,604 B` /
  `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1`. 증가 **+123 B**는 form
  wrapper와 `onSubmit` 핸들러뿐이다. **고객 CSS `index-BjqjBda8.css`(19,381) · admin entry
  `index-D0XOQpRL.js`(226,201) · admin CSS `index-DJ_z3tK1.css`(9,146)는 SHA-256까지 무변경**이고
  lazy chunk 구성도 그대로다.
- 변경 파일은 허용 범위뿐 — `space/SpacePasswordGate.tsx(.test.tsx)`,
  `tests/e2e/space-production-route.spec.ts`, 기존 spec-080 PNG 2개, spec-080 상태 문서.
  viewer/controller/decoder/composition/App/fixture/CSS, `apps/admin`, `packages`, Rules/config/
  package/lockfile 변경 **0**이다. spec-063 결과 PNG는 재생성 후 byte-identical이라 diff 0이다.
- `git diff --check` PASS, 검사 포트 4183/4184/4185/8080/9099/9199 잔류 **0**, 강제 종료 0.
  Playwright `test-results/`는 제거했다.
- **full Chromium suite는 보호 spec-018 PNG 때문에 계속 NOT RUN**이며 PASS라고 기록하지 않는다.
  actual Firebase/network/live/deploy는 **0 / NOT TESTED**다.
- 상태 `READY_FOR_CODEX`, fix_round **1/3**, next transition `CODEX_SPEC_080_REVIEW`. 다음 스펙과
  자동화·반복 작업은 시작하지 않았다.
- 전체 진행도 **83~86% 완료 / 14~17% 잔여 — 변동 없음**(결함 보완이지 새 범위가 아니다).

## 스펙 080 Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-27)

- 검수 기준 `HEAD=origin=c63fe1b`, ahead/behind `0/0`. 구현 commit `2319d1a`, 결과 문서 commit
  `c63fe1b`을 스펙 080에 대조했다.
- 독립 재실행은 targeted unit **62/62**, 전체 `node scripts/check.mjs` PASS(unit **2278/2278**), 임시
  스테이징 targeted Chromium **14/14 PASS**, 고객 entry SHA-256
  `99A707FA3AF518933F848CF52948ADCBD95BE44D1544616FA93C49E486805879`, `git diff --check`, 검사 포트
  잔류 0이다. full Chromium suite는 계약대로 NOT RUN이다.
- 보완 1: 현재 gate에는 `<form>`/`onSubmit`이 없고 E2E는 password input이 아니라 submit button에
  Enter를 보낸다. 따라서 기록한 "password form keyboard submit"은 증명되지 않았다. 실제 form submit
  semantics와 password input Enter 경로, submit exact-once를 고정한다.
- 보완 2: spec-080 desktop/mobile PNG에 합성 fixture 전용 `화면 해제` control이 보인다. screenshot
  직전에 그 fixture control만 숨기고 production customer surface만 다시 캡처한다.
- 허용 보완은 `SpacePasswordGate.tsx`와 test, targeted E2E spec, spec-080 PNG 2개 및 spec-080 상태
  문서뿐이다. production viewer/controller/decoder/composition/App/fixture/CSS는 수정하지 않는다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3, next transition `CLAUDE_CORRECTION`. 다음 스펙과 자동화·
  반복 작업은 시작하지 않는다.
- 전체 진행도는 **83~86% 완료 / 14~17% 잔여 — 변동 없음**이다. 이번 판정은 범위 내 접근성·시각
  증거 보완이며 새 제품 능력을 추가하지 않는다.

## 스펙 080 customer V2 viewer 구현 완료 (2026-08-27)

- 기준 `HEAD=origin=c9c0c3d`, ahead/behind 0/0에서 시작했다. 계약 문서 commit `971c5fa`, 구현 commit
  `2319d1a`. 허용 목록 밖 제품 파일은 하나도 만들지 않았다.
- 신규 `apps/mockup/src/space-v2/`의 `browser-png-decoder.ts` · `production-controller.ts` ·
  `SpaceV2ProofView.tsx`와 각 test 3개. 기존 파일은 `space/composition.ts` ·
  `space/SpacePasswordGate.tsx` · `App.tsx`와 그 test, e2e fixture,
  `tests/e2e/space-production-route.spec.ts`만 수정했다. **V2 전용 CSS 파일은 필요하지 않아 만들지
  않았다**(기존 `surface.css`의 `overflow-x:auto` 래퍼가 320px 요구를 이미 만족한다).
- dispatch: document를 한 번 읽고 top-level `schema`를 hostile-getter 안전하게 한 번만 snapshot한다.
  exact `space-v2`만 V2 pipeline으로 가고, malformed V2는 V1으로 **fallback하지 않는다**. 그 밖의
  document는 기존 V1 opener와 스펙 063 안전 차단 UI 그대로다.
- decoder: 기존 스펙 026 `createLocalImageBindingController`를 감싸 decoder와 `imageRef → drawable`
  binding을 **한 owner**가 소유한다. module/factory 시점 DOM·`Image`·`Blob`·URL 호출 **0**, bytes는
  browser 전달 전에 fresh copy, private URL은 모든 종료 경로에서 **정확히 1회 revoke**한다.
- retry: password rejection과 proof unavailable만 명시 재시도 가능이고 그 둘만 cached document를
  유지한다. proof mismatch/decode/dimension/plan 실패는 non-retryable이며 자동 retry·fallback **0**이다.
- 실측: 전체 `node scripts/check.mjs` PASS(format/lint/typecheck 7개/unit **2278/2278**/build 2개),
  targeted Chromium `space-production-route.spec.ts` **14/14 PASS**(axe serious/critical 0, console
  error/warning 0, pageerror 0, 320px overflow 0, keyboard submit, 외부 request 0).
- 고객 bundle은 production import 때문에 계약대로 변경됐다. 변경 전 `index-6js4DafP.js` /
  `322,018 bytes` / `A9360EFF…E8159` → 변경 후 `index-nLbiXJi7.js` / `340,481 bytes` /
  `99A707FA3AF518933F848CF52948ADCBD95BE44D1544616FA93C49E486805879`. 증가분 **+18,463 bytes**는 V2
  viewer/controller/decoder이고, 별도 lazy `firebase/storage` chunk `index.esm-DtyxGWvl.js`
  **34,890 bytes**가 새로 생겼다. **admin entry `index-D0XOQpRL.js`(226,201) · admin CSS
  `index-DJ_z3tK1.css`(9,146) · 고객 CSS `index-BjqjBda8.css`(19,381)는 파일명·크기 모두 무변경**이다.
- `git diff --check` PASS, 허용 외 diff **0**. 보호 대상(`AGENTS.md`, `docs/rebuild/design/**`,
  spec 038, spec-018 PNG 2개, `packages/render/src/plan/index.ts`, `pnpm-workspace.yaml`)은 읽기만 했고
  수정·복원·stage·commit **0**이다. spec-063 결과 PNG는 재생성 후 byte-identical이라 diff **0**이다.
- 검사 포트 4183/4184/4185/8080/9099/9199 실행 전후 잔류 **0**, 강제 종료 0. Playwright가 만든
  `test-results/`는 제거했다.
- **full Chromium suite는 보호 spec-018 PNG를 다시 쓰므로 NOT RUN**이며 full-E2E PASS라고 기록하지
  않는다. actual Firebase/project/bucket/network/live/CORS/deploy/actual UID/admin issue UI/URL·
  clipboard/publish/orphan cleanup은 **0 / NOT TESTED**다.
- 상태 `READY_FOR_CODEX`, next transition `CODEX_SPEC_080_REVIEW`. 다음 스펙과 자동화·반복 작업은
  시작하지 않았다.
- 전체 진행도는 **83~86% 완료 / 14~17% 잔여**다. 고객 V2 열람 경로가 production route에서 실제
  Canvas까지 처음으로 연결됐지만, admin 발급 UI와 실제 Firebase/Rules 배포·live 검증은 그대로 남는다.

## 스펙 079 Codex 검수 통과 · 스펙 080 Claude Code UI handoff (2026-08-27)

- 스펙 079은 구현 commit `0887047`, 결과 문서 `c9c0c3d` 기준 추가 코드 결함 0으로
  `CODEX_PASSED / DONE` 처리했다.
- 독립 targeted **105/105**, Firebase typecheck, 전체 check(unit **2228/2228**), 고객 bundle exact,
  diff·forbidden·port gate가 PASS했다.
- Codex 환경의 full emulator 재실행은 Firestore Java loopback 실패로 tests 전에 중단됐다. 신규
  Auth+Storage proof integration은 분리 실행 **5/5 PASS**이며 Claude Code가 기록한 full suite
  **27/27 PASS**와 구분한다.
- 다음 수동 단위는 스펙 080 customer V2 production viewer UI다. Claude Code가 V1 호환 dispatch,
  browser PNG decoder/drawable owner, V2 replay controller와 React Canvas 화면을 연결한다.
- actual Firebase/network/live/deploy/admin issue UI는 계속 0 / NOT TESTED다. targeted production-route
  E2E만 허용하며 full Chromium suite는 보호 PNG 때문에 NOT RUN이다.
- 제품 구현은 아직 시작하지 않았다. 상태 `READY_FOR_CLAUDE`, 다음 transition
  `CLAUDE_SPEC_080_IMPLEMENTATION`이다.
- 전체 진행도는 **81~84% 완료 / 16~19% 잔여 — 문서 준비로 변동 없음**이다.

## 스펙 079 proof reader adapter 구현 완료 (2026-08-27)

- 기준 `HEAD=origin=b28b9c1`, ahead/behind 0/0에서 시작했다. 문서 commit `1d46b33`, 구현 commit
  `0887047`. 승인 범위 밖으로 확장하지 않았다.
- 제품 파일은 `packages/firebase/src/space-read/`의 신규 `proof-facade.ts`, `proof-reader.ts`,
  `proof-sdk-facade.ts`와 unit/emulator test 3개다. 기존 파일 수정은 `space-read/index.ts` 명시
  export와 `vitest.emulator.config.ts` include 1건뿐이다.
- 계약대로 exact V2 path → `getMetadata` fullPath/contentType/size → `getBytes(ref,maxBytes)` →
  metadata size와 copied byte length 일치 순서를 지켰고, metadata+bytes 전체에 단일 20초 budget을
  적용했다. 제품 retry, Auth, default/추가 app, download URL은 **0**이다.
- 기존 `denn-space-viewer` named app을 5개 config exact match로만 재사용하고 불일치는 `getStorage`
  전에 fail-closed다. `demo-` 검사는 dynamic import 전에 수행한다.
- 실측: targeted unit **105/105**, Firebase typecheck PASS, 전체 `node scripts/check.mjs` PASS
  (unit **2228/2228**), `pnpm test:emulator` **27/27** PASS(기존 `firebase.emulator.json`·
  `storage.emulator.rules`·`demo-denn-emulator` 무변경, 설치·download 0).
- 고객 entry exact 동일: `index-6js4DafP.js` / `322,018 bytes` /
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`. V2 export를 index 중간에 넣으면
  minifier symbol 재배치로 hash가 바뀌는 것을 실측하고 파일 끝 append로 확정했다.
- `git diff --check` PASS, 허용 외 diff **0** — `apps/**`, `space-read/sdk-facade.ts`, Rules, firebase
  JSON, package/lockfile, `pnpm-workspace.yaml`, root barrel 무변경. 작업 트리에 미리 있던 보호 대상
  변경은 손대지 않고 stage/commit하지 않았다.
- 검사 포트 4183/4184/4185/8080/9099/9199 실행 전후 잔류 **0**, 강제 종료 0. emulator가 생성한
  `firestore-debug.log`는 제거했다.
- 전체 Chromium E2E는 MM-6=A에 따라 **NOT RUN**이며 PASS라고 기록하지 않는다. actual Firebase/
  project/bucket/network/live/CORS/deploy/actual UID/publish/orphan cleanup **0 / NOT TESTED**,
  UI 연결 **0**, 자동화·반복 작업 **0**, 다음 스펙 시작 **0**.
- 상태 `READY_FOR_CODEX`, next transition `CODEX_SPEC_079_REVIEW`.
- 전체 진행도는 **81~84% 완료 / 16~19% 잔여 — 변동 없음**이다.

## Founder MM-1~MM-6 승인 · 스펙 079 실행 계약 (2026-08-26)

- Founder가 **MM-1=A ~ MM-6=A**를 승인했다. 기존 `denn-space-viewer` named app과
  `@denn/firebase/space-read`를 재사용하고, metadata-first bounded read, 단일 20초 budget,
  `demo-denn-emulator` opt-in 검증, package-only/full-E2E NOT RUN 범위를 확정했다.
- Claude Code 허용 제품 범위는 `packages/firebase/src/space-read/`의 신규 proof facade/reader/SDK
  adapter/test, `space-read/index.ts` export와 `vitest.emulator.config.ts` include 1건뿐이다.
- `apps/**`, production route/UI/CSS/browser decoder, Rules/emulator JSON, package/lockfile/root barrel은
  변경하지 않는다. actual Firebase/network/live/CORS/deploy/UID와 orphan cleanup도 계속 금지다.
- 상태 `READY_FOR_CLAUDE`, next transition `CLAUDE_SPEC_079_IMPLEMENTATION`. 실제 UI/UX는 이 단위가
  아니라 후속 Claude Code composition 스펙이다.
- 제품 구현과 unit/E2E/emulator는 아직 시작하지 않았다. 전체 진행도는 **81~84% 완료 / 16~19% 잔여 —
  변동 없음**이다.

## 스펙 079 proof reader adapter 조사 · Founder 결정 대기 (2026-08-26)

- `HEAD=origin=b28b9c1`, ahead/behind 0/0에서 Firebase Web SDK 12.17.1 설치 타입, 기존
  `@denn/firebase/space-read` app ownership, 목표 Storage Rules와 스펙 078 proof port를 읽기 전용으로
  대조했다.
- 공개 `getBytes(ref,maxDownloadSizeBytes?)`는 ArrayBuffer만 반환하고, `contentType`과 `size`는 별도
  `getMetadata(ref)`에서 확인한다. 권장 프로토콜은 exact V2 path → metadata fullPath/MIME/size → bounded
  bytes → metadata size와 bytes length 일치다.
- 기존 `denn-space-viewer` named app을 exact config match로 재사용하고 Auth/default/추가 app을 만들지
  않는 package-only adapter가 최소 다음 경계다. `demo-` emulator opt-in 후보도 실제 project 없이
  검증 가능하다.
- Founder **MM-1~MM-6**은 미결정이며 권장값은 모두 A다. 결정 전 Claude Code 실행 지시와 제품 구현은
  없다. 상태 `FOUNDER_DECISION_REQUIRED`, next transition `FOUNDER_MM_1_MM_6_DECISION`.
- 이번 변경은 spec/review/handoff/STATE/NEXT/CURRENT/live log 문서 7개뿐이다. unit/E2E/emulator는 실행하지
  않았고 actual Firebase/network/live/deploy/UI 연결은 0이다.
- 전체 진행도는 **81~84% 완료 / 16~19% 잔여 — 변동 없음**이다. 문서 조사만으로 완료율을 올리지
  않았다.

## 스펙 078 Codex 재검수 통과 · 종료 (2026-08-26)

- 검수 기준 `HEAD=origin=6742f3f`, ahead/behind 0/0. correction code/test commit `bed9106`과 결과 기록을
  스펙 029·030·064·078 계약에 다시 대조했다.
- 추가 결함 0. zero-pan probe와 final plan은 같은 geometry/scale/quarter-turn을 사용하고, maxPan은
  builder의 rotated clip/draw rect에서만 유도되며 normalized x/y는 기존 `toLogicalTransform()`으로만
  logical px가 된다.
- 독립 재실행 PASS: targeted **29/29**, 전체 check(unit **2153/2153** 포함), 고객 entry exact
  filename/size/SHA-256, correction 범위 `git diff --check`, 허용 8개 경로, 검사 포트 잔류 0.
- 판정 `CODEX_PASSED / DONE / LOCAL_VERIFIED / NO_UI / NO_NETWORK`. 전체 Chromium E2E·emulator는
  계약대로 NOT RUN이며 PASS라고 주장하지 않는다.
- actual Firebase/network/live/deploy, production route, React/UI/CSS, Firebase proof reader adapter,
  admin issuer와 URL/clipboard 연결은 0 / 후속 범위다.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`, active unit 없음, next transition `NEXT_MANUAL_SPEC_SELECTION`.
  다음 스펙과 자동화·반복 작업은 시작하지 않는다.
- 전체 진행도는 **81~84% 완료 / 16~19% 잔여**로 유지한다.

## 스펙 078 보완 라운드 1 완료 — normalized pan exact replay (2026-08-26)

- Founder가 Codex 검수에서 드러난 구현 결함의 최소 범위 확장을 승인했다. 허용 추가는
  `replay-controller.ts` 한 파일이며 다른 제품 범위는 열지 않았다.
- exact vector test가 V2 `normalized-max-pan-v1`의 x/y를 logical px로 환산하지 않은 결함을 재현했다:
  기대 draw origin `(-995,-65)`, 기존 실제 `(-650.5,-99.75)`.
- controller는 기존 스펙 029/030 primitive만 재사용해 zero-pan probe plan → rotated `maxPan` →
  `toLogicalTransform()` → final plan 순서로 수정했다. geometry 공식을 복제하거나 새 API/의존성을 만들지
  않았다.
- 코드/test commit `bed9106`. exact full plan vector와 source evidence/decoder result 후속 mutation에 대한
  success plan detachment를 고정했다.
- PASS: targeted **29/29**, spaces/mockup typecheck, 전체 check(unit **2153/2153** 포함), 고객 entry exact
  filename/size/SHA-256, `git diff --check`, 허용 diff, 검사 포트 잔류 0.
- 첫 전체 check는 formatter 1건에서 중단됐고 형식만 고친 뒤 처음부터 재실행해 PASS했다. 기능·type
  실패나 flaky로 기록하지 않는다.
- 전체 Chromium E2E·emulator는 계약대로 NOT RUN. actual Firebase/network/live/deploy와 UI 연결 0.
- 상태 `READY_FOR_CODEX`, fix_round 1/3, next transition `CODEX_RE_REVIEW`; 다음 스펙 시작 0.
- 전체 진행도 **81~84% 완료 / 16~19% 잔여 — 변동 없음**.

## 스펙 078 Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-26)

- 기준 `HEAD=origin=0f63af4`, ahead/behind 0/0에서 구현 범위와 계약을 대조했다.
- 독립 재실행 PASS: targeted **28/28**, 전체 check(unit **2152/2152** 포함), 고객 entry exact
  filename/size/SHA-256, `git diff --check`, 허용 commit 경로, 검사 포트 잔류 0.
- 결함은 검증 공백 1건이다. `replay-controller.test.ts`의 success test는 canvas 크기·layer 순서·
  `imageRef`만 확인해 스펙 §VERIFY 8이 요구한 rect/color/transform/quarter-turn **exact vector**를 증명하지
  못한다. evidence field wiring이 바뀌어도 이 테스트 일부가 계속 통과할 수 있다.
- 보완 범위는 `apps/mockup/src/space-v2/replay-controller.test.ts`와 spec078 상태/handoff 문서뿐이다.
  production 구현은 변경하지 않는다. exact full plan vector와 success plan detachment를 고정한 뒤 같은
  targeted/전체 check/hash/diff/port 게이트를 재실행한다.
- 전체 Chromium E2E·emulator는 계속 NOT RUN이다. actual Firebase/network/live/deploy와 UI 연결은 0.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3, 다음 transition `CLAUDE_CORRECTION`. 다음 스펙 시작 0.
- 전체 진행도는 **81~84% 완료 / 16~19% 잔여**로 유지한다. 검증 공백 정정은 roadmap 완료율을
  올리지 않는다.

## 스펙 078 local V2 viewer replay 구현 완료 (2026-08-26)

- 별도 V2 opener와 production에 미연결인 mockup V2 replay controller를 구현했다.
- proof content/length/SHA-256/intrinsic dimensions와 closed evidence frame plan, short-circuit, detached
  bytes, single-flight 거부, safe errors를 합성 fake로 고정했다.
- PASS: targeted **28/28**, spaces/mockup typecheck, 전체 check(unit **2152/2152** 포함), 고객 entry exact
  hash, `git diff --check`, forbidden diff, 검사 포트 잔류 0.
- 전체 Chromium E2E·emulator는 계약대로 NOT RUN. actual Firebase/network/live/deploy와 UI 연결 0.
- 상태 `READY_FOR_CODEX`, 다음 transition `CODEX_REVIEW`. 다음 스펙 자동 시작 0.
- 전체 진행도 추정 **81~84% 완료 / 16~19% 잔여**.

## Founder LL-1~LL-6 승인 · 스펙 078 실행 계약 (2026-08-26)

- Founder가 `LL-1=A` ~ `LL-6=A`를 승인했다. customer V2 viewer 선행, frozen proof source, C5 catalog
  snapshot, 기존 admin app/Auth, confirmed link/password 분리와 첫 non-UI viewer 단위가 확정됐다.
- 다음 Claude Code 단위는 별도 V2 opener와 local replay controller다. decrypt/strict scene/evidence digest,
  proof byteLength/SHA-256/intrinsic size, closed evidence frame plan을 injected fake로 검증한다.
- `App.tsx`, V1 controller, React/UI/CSS, Firebase asset SDK/network, admin issuer는 변경하지 않는다.
- 실제 UI/UX 단계는 후속 스펙에서 Claude Code가 담당한다. 이번 스펙은 그 전에 viewer core를 닫는다.
- 제품 구현은 아직 시작하지 않았다. 다음 transition `CLAUDE_SPEC_078_IMPLEMENTATION`.
- 진행도는 **80~83% 완료 / 17~20% 잔여**로 유지한다.

## 스펙 077 Space V2 end-to-end composition readiness (2026-08-26)

- local source audit 결과 customer production viewer는 V1 opener만 사용하며 V2 document/scene을 열지 않는다.
- admin production UI에는 catalog·selection·transform·proof PNG·password를 하나의 frozen issue draft로
  소유하는 session/composition이 없다.
- 따라서 admin 발급 UI를 먼저 활성화하면 저장은 성공하지만 customer가 열 수 없는 link를 만들 수 있다.
  customer V2 viewer 선행을 권장한다.
- Founder LL-1~LL-6은 미결정이다. 실제 UI/UX는 사용자 지시에 따라 Claude Code가 담당하지만, 결정 전
  Claude 실행 지시와 제품 구현은 시작하지 않는다.
- 이번 단위는 문서 조사만 수행했다. unit/E2E/emulator/network 실행과 제품·Rules·config 변경은 0이다.
- 진행도는 **80~83% 완료 / 17~20% 잔여**로 유지한다. 문서 조사만으로 완료율을 올리지 않는다.

## 스펙 076 SDK adapter·local emulator 통합 (2026-08-26)

- Founder `KK-1=A` ~ `KK-6=A` 범위에서 default Firebase app/Auth를 재사용하는 dynamic-import V2 SDK
  facade를 구현했다. non-demo emulator 선거부, config mismatch fail-closed, named app 0이다.
- PASS: targeted **40/40**, Firebase typecheck, 전체 check(unit **2124/2124** 포함), default emulator
  **22/22**, cutover 전용 config **4/4**, `git diff --check`, forbidden diff, 보호 hash, 포트 잔류 0.
- 최초 cutover 1회는 일반 emulator config를 잘못 선택해 1/4 실패했고 전용 config로 재실행해 4/4
  PASS했다. 코드·Rules 수정 없이 원인이 확정됐으며 이력을 숨기지 않는다.
- 전체 Chromium E2E는 Founder `KK-6=A`에 따라 **NOT RUN**. full-E2E PASS가 아니다.
- 실제 UID·Firebase/network/live·deploy·UI·URL·orphan delete/cleanup은 미구현·NOT TESTED·금지다.
- 다음 제품 단위는 admin UI composition 후보다. 사용자 지침상 실제 UI/UX 구현은 Claude Code가
  담당하므로 별도 계약·프롬프트 검토 전 자동 시작하지 않는다.
- 전체 진행도 추정 **80~83% 완료 / 17~20% 잔여**. persistence adapter+local server gate가 닫혔지만
  UI composition, 실제 UID, production validation/deploy/cutover가 남아 있다.

## 스펙 075 직접 구현·로컬 Rules 검증 (2026-08-26)

- Founder가 **`스펙 075 E2E 예외 종료 승인`**을 별도로 명시했다. 전체 Chromium E2E가 보호 PNG를
  재작성해 NOT RUN이라는 사실을 유지하면서 `DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION`으로
  종료한다. full-E2E PASS나 독립 CODEX_PASSED는 주장하지 않는다.
- Founder `JJ-1=A, JJ-2=A, JJ-3=A, JJ-4=B, JJ-5=A, JJ-6=A` 범위만 구현했다. V2 asset
  create-only/public-read, V2 document 승인 UID create, spaces list 거부와 local emulator 회귀다.
- PASS: targeted unit **75/75**, 전체 check(unit **2114/2114** 포함), default emulator **20/20**,
  cutover emulator **4/4**, `git diff --check`, UID-only Rules 동등성, forbidden diff, 검사 포트 잔류 0.
- 전체 Chromium E2E는 **NOT RUN**이다. 스펙 074 예외를 자동 승계하지 않고 스펙 075 별도 Founder
  승인을 받았다. 종료 내용 commit 하나로 push하며 self-hash bookkeeping commit은 만들지 않는다.
- 실제 UID, 실제 Firebase/network/live, deploy, SDK adapter, UI, URL, orphan delete/cleanup은 모두
  미구현·NOT TESTED·금지다.
- 전체 진행도 추정은 **79~82% 완료 / 18~21% 잔여**다. local Rules와 emulator 작업축이 검증됐지만
  production adapter·UI·실제 UID·배포/cutover가 남아 있으며 최종 스펙 분모는 고정되지 않았다.

## 스펙 074 직접 구현·로컬 검증 (2026-08-26)

- Founder가 **`스펙 074 E2E 예외 종료 승인`**을 명시했다. 보호 대상 PNG를 다시 쓰는 전체 Chromium
  E2E를 실행하지 않은 상태를 숨기지 않는 조건으로 스펙 074를
  **`DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION`**으로 종료한다.
- 같은 승인에서 `JJ-1=A, JJ-2=A, JJ-3=A, JJ-4=B, JJ-5=A, JJ-6=A`를 확정했다. 이는 다음
  local Rules/emulator 계약 착수 승인이지 실제 UID 제공, live Rules 배포, UI, orphan 삭제 승인이
  아니다.

- Founder의 최신 지시 “니가 직접 구현하고 검증후 보고”를 스펙 073에서 결정 없이 진행 가능하다고
  분리한 **JJ-7=A**로 제한해 적용했다. JJ-1~JJ-6, Rules, SDK adapter, emulator, UI, URL 발급,
  delete/orphan 정리, 실제 network/live는 열지 않았다.
- 신규 `@denn/firebase/space-write` subpath에 local facade·auth port·안전 오류 계약·upload-first
  orchestration·server-only reconciliation·single-flight를 구현하고 synthetic fake 30건으로 고정했다.
  루트 `@denn/firebase` barrel과 `apps/**`는 변경하지 않았다.
- `@denn/spaces`는 이미 존재하는 workspace 패키지이며 신규 외부 의존성이 아니다. 직접 import를
  정확히 선언하기 위해 `packages/firebase/package.json`과 lockfile importer만 갱신했다.
- PASS: targeted 30/30, Firebase typecheck, 전체 format/lint/typecheck/unit **2114/2114**/mockup+admin
  build, `git diff --check`, 고객 entry `index-6js4DafP.js` 322,018 bytes / SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`, 검사 포트 잔류 0.
- **전체 Chromium E2E는 NOT RUN.** 기존 `mockup-browse`가 보호 대상 spec-018 PNG 두 개를 다시 쓰는
  경로라 실행 승인이 거부됐고, 보호 경계를 우회하지 않았다. 따라서 spec 074를 DONE/CODEX_PASSED로
  과장하지 않고 `READY_FOR_CODEX`로 둔다.
- 실제 Firebase/project/bucket/Firestore/network, emulator, Rules, deploy, UI 연결은 모두 0 / NOT
  TESTED다. 자동화·반복 작업도 만들지 않았다.
- 전체 진행도 추정은 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다. 이번 포트는 작업축 6의
  local seam 하나를 채웠지만 배포·Rules·UI 축은 그대로라 기존 범위를 바꿀 근거가 부족하다.

## 스펙 073 Codex 최종 문서 검수 통과 · 오늘 세션 종료 (2026-08-24)

- 검수 기준 `HEAD=origin=c8234a9`, ahead/behind 0/0. 라운드 4 변경은 허용 문서 6개뿐이며
  `git diff --check` PASS, staged 0이었다.
- Firebase 공식 *Use conditions in Firebase Cloud Storage Security Rules*의 Resource Evaluation과
  보고서 §1.4·§Q7.1.1·§4·JJ-5를 대조했다. `resource.metadata`와 write의 `request.resource` metadata
  검사는 **공식 지원**, V2 Rules/runtime은 **미작성·NOT TESTED**로 정확히 분리됐다.
- 라운드 1~3의 유효한 결론을 되돌리지 않았다. 목표 public-read 시 recId 관측, GG-4 미승인 확장,
  exact-key/format·assetId 교차검사 설계 필요, 연쇄 경로 보간 `UNCONFIRMED`, 실제 IAM/live
  `NOT TESTED`, 확정 orphan 미증명과 O-3 삭제 보류가 유지된다.
- 판정: **`DOCUMENT_REVIEW_PASSED / CODEX_PASSED / DONE`**. 제품 코드/test/Rules/config/package/
  lockfile 변경과 emulator/live 실행은 0이다.
- 오늘 세션은 종료한다. JJ-1~JJ-7은 선택하지 않고 그대로 보존하며, 다음 작업은 자동 시작하지 않는다.
  다음 transition은 `FOUNDER_JJ_1_JJ_7_DECISION`이다.
- 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다.

## 스펙 073 문서 보완 라운드 4 수행 — Founder 예외 승인 (2026-08-24)

- 보완 직전 관측 기준 **HEAD=origin `a6ad189`**(아래 Founder 승인 기록 commit), ahead/behind **0/0**.
  승인문이 적은 `dc6fe11`은 그 **직전 commit**이며 그 위에 승인 commit `a6ad189`가 얹혀 있다 —
  기준선은 정합하고 라운드 4는 `a6ad189`에서 출발했다.
- Codex 최종 재검수의 **근거 정정 1건만** 반영했다. 라운드 1·2·3 통과 내용은 되돌리지 않았다.
  허용 문서 6개만 수정, **내용 commit 1개**만 남기고 self-hash bookkeeping commit은 추가하지 않았다.
- **정정 내용:** Storage Rules의 object metadata 표면(`resource.metadata` / write 평가의
  `request.resource` metadata 검사)을 `UNCONFIRMED` → **공식 지원(`OFFICIALLY SUPPORTED`, 정적 근거
  확인)** 으로 재분류했다. 근거는 Firebase 공식 **Use conditions in Firebase Cloud Storage Security
  Rules**의 *Resource Evaluation*이며 보고서에 **§1.4 「공식 문서 인용」**을 신설해 고정했다.
  **폐기한 것은 딱 둘** — *"저장소 선례 0건이므로 공식 지원도 `UNCONFIRMED`"*, *"(c1)만 Rules 표면
  근거 등급을 확보했다"* 는 비교.
- **유지된 경계:** V2 전용 Rules 미작성, exact key/format·assetId 교차검사 설계 필요,
  emulator/runtime `NOT TESTED`, 목표 public-read 구현 시 recId 관측이라는 설계 귀결, GG-4 미승인
  schema/Rules 확장, 실제 Firebase/IAM/live `NOT TESTED`, **(c1)·(c2) 모두 확정 orphan 미증명과
  O-3 삭제 보류**.
- 제품 코드/test/Rules/Firebase config/package/lockfile, `apps/**`, `packages/**`, 보호 대상 변경 **0**.
  실제 Firebase/network/**emulator**/deploy/UID/URL/UI **0**. 이 세션은 network 접근이 금지되어
  **공식 문서 URL을 직접 fetch하지 않았다** — 인용은 Codex 재검수가 제시한 것이며 보고서 §1.4에
  그 사실을 명시했다.
- 게이트: `git diff --check` PASS, 허용 6개 문서 외 diff **0**. 문서 전용 단위라 실행 게이트는 없고
  unit/E2E/typecheck/build/emulator를 하나도 돌리지 않았다.
- 상태 `READY_FOR_CODEX`, 다음 transition `CODEX_RE_REVIEW`. Founder JJ-1~JJ-7 선택, 제품 구현,
  Rules 변경, emulator 실행, 다음 스펙과 자동화·반복 작업은 시작하지 않았다.
- 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다. 라운드 4는 근거 등급 하나를
  바로잡은 문서 정정이며 제품 작업축 완료량을 늘리지 않는다.

## Founder 승인 — 스펙 073 문서 보완 라운드 4 예외 (2026-08-24)

- Founder가 이 대화에서 **`스펙 073 문서 보완 라운드 4 예외 승인`**을 명시했다.
- 자동 보완 한도 3/3을 넘는 이번 한 번의 문서 보완만 예외로 허용한다. 허용 범위는 Codex 최종
  재검수에서 확인한 Storage Rules metadata 근거 등급 정정과 관련 6개 문서 동기화뿐이다.
- 제품 코드/test/Rules/config/package/lockfile, emulator/live, JJ-1~JJ-7 선택, 다음 구현 스펙은 계속
  금지한다. 다음 transition은 `CLAUDE_DOCUMENT_CORRECTION_ROUND_4`다.
- 실행 기준은 승인 기록 직전 `HEAD=origin=dc6fe11`, ahead/behind 0/0이다.

## 스펙 073 Codex 최종 재검수 — CORRECTION_REQUIRED / 자동 보완 한도 도달 (2026-08-24)

- 검수 기준 `HEAD=origin=9707233`, ahead/behind 0/0. 라운드 3 commit 범위는 허용 문서 6개뿐이고
  `git diff --check`도 PASS했다. working tree에는 기존 보호/Founder 변경만 남고 staged 0이다.
- 라운드 3의 access-call 산술, metadata-only update 차단, 현재 default-deny와 목표 public-read 구분은
  수용한다.
- 다만 조사 보고서가 `request.resource.metadata` / `resource.metadata`의 Storage Rules 지원을
  `UNCONFIRMED`로 남긴 것은 공식 문서와 충돌한다. Firebase 공식 **Use conditions in Firebase Cloud
  Storage Security Rules**의 Resource Evaluation은 `resource.metadata`를 developer-specified custom
  metadata map으로 명시하고, write에서 `request.resource`로 새 metadata를 검사할 수 있다고 명시한다:
  https://firebase.google.com/docs/storage/security/rules-conditions
- 따라서 (c2)의 **Rules metadata 표면 자체는 공식 지원**으로 정정해야 한다. V2 전용 Rules 미작성,
  exact-key/format 설계 필요, emulator/runtime `NOT TESTED`, 목표 public-read 시 recId 관측, GG-4 미승인
  schema/Rules 확장, 확정 orphan 미증명은 그대로 유지한다.
- `fix_round` 3/3을 모두 사용했으므로 자동 라운드 4는 시작하지 않는다. Founder가 예외 라운드 4를
  명시적으로 승인하기 전까지 상태는 `BLOCKED`, JJ-1~JJ-7 선택과 다음 구현 스펙도 시작하지 않는다.
- 제품 코드/test/Rules/config/package/lockfile 변경 및 emulator/live 실행은 0이다. 전체 리빌드 진행도는
  **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다.

## 스펙 073 문서 보완 라운드 3 수행 — 최종 보완 (2026-08-24)

- 보완 직전 관측 기준 HEAD=origin `6b3bcfc`, ahead/behind 0/0. Codex 라운드 3의 **세 정정만 최소
  반영**했고 라운드 2 통과 내용은 되돌리지 않았다. 허용 문서 6개만 수정, **내용 commit 1개**만 남기고
  self-hash bookkeeping commit은 추가하지 않았다.
- 제품 코드/test/Rules/Firebase config/package/lockfile, `apps/**`, `packages/**`, 보호 대상 변경 0.
  실제 Firebase/network/**emulator**/deploy/UID/URL/UI 0.
- **보완 1 — access-call 산술.** `firestore.get()`이 반환한 **같은 문서의 필드 재사용은 추가 document
  access가 아니다.** 보고서 §Q7.1.1a를 신설해 평가별로 다시 계산했다 — **(c1)·(c2) 모두 create 1회 /
  delete 2회**이고 **(c2)의 `assetId` 교차 확인은 무료**다. 라운드 2의 "교차 확인 때문에 한도 초과"와
  "(c2)가 access-call 면에서 더 비싸다"를 **폐기**했다. 연쇄 경로 보간 지원은 계속 `UNCONFIRMED`이며
  그 전제는 두 후보 공통(미지원 시 delete 판정이 둘 다 불성립, create 게이팅은 무관)이다.
- **보완 2 — metadata update.** `updateMetadata()`는 Storage **update 요청**이고 Rules의 `update`는
  metadata-only update를 포함하므로 **목표 `allow update: if false`가 이미 차단한다.** "GG-4 목표에
  차단이 누락됐다 — 계약 공백" 주장을 **폐기**했다. 유지: V2 Rules는 미작성·`NOT TESTED`이고 향후
  match에 `update: if false`를 **명시**해야 한다. 이 저장소 emulator 게이트는 `updateMetadata` 자체를
  검증하지 않았으므로 그 지점은 `NOT TESTED`로 기록했다.
- **보완 3 — public metadata 근거 수준.** "누구나 관측 가능"이라는 **현재형 진술을 폐기**했다.
  현재 경로는 **default deny**라 관측 불가이며, 정확한 진술은 **목표 public-read Rules가 구현되면
  경로를 아는 client가 `getMetadata()`로 `customMetadata`를 읽을 수 있다는 설계 귀결**이다. 실제
  V2 Rules/runtime은 `NOT TESTED`. 안전 결론(recId를 secret으로 설계하지 않음, token을
  `customMetadata`에 넣지 않음)은 유지했다.
- **(c2) 재평가:** 라운드 2가 붙였던 "명백히 더 비싸다"의 근거 둘이 모두 폐기됐다. 남는 실제 차이는
  ① Rules metadata 표면 `UNCONFIRMED`(선례 0건) ② 목표 public-read 시 recId가 공개 식별자
  ③ GG-4 미승인 schema 확장. **두 후보 모두 확정 orphan 미증명**은 그대로다.
- 게이트: `git diff --check` PASS, 허용 6개 문서 외 diff 0. 문서 전용 단위라 실행 게이트 없음.
- 전체 진행도 **78~81% 완료 / 19~22% 잔여 — 변동 없음**. 라운드 3은 후보 비교를 정확하게 만들었을 뿐
  어느 후보도 전진시키지 않았다. 상태 `READY_FOR_CODEX`, 다음 transition `CODEX_RE_REVIEW`.
  fix_round 3/3으로 **최대 보완 횟수에 도달**했다. Founder JJ-1~JJ-7과 다음 스펙은 시작하지 않았다.

## 스펙 073 Codex 재검수 — CORRECTION_REQUIRED 라운드 3 (2026-08-24)

- 실제 HEAD=origin은 라운드 2 내용 commit `6b3bcfc`, ahead/behind 0/0이다. 별도 self-hash
  bookkeeping commit은 만들지 않았고 working tree는 재검수 시작 전 기존 보호 변경뿐이었다.
- 라운드 2의 cross-service primitive 근거 등급, privileged plaintext surface, transform-0/customMetadata
  후보 분리는 수용한다. 다만 (c2) access-call 산술과 metadata update 의미가 틀렸다.
- `get(mapping(recId))` 한 번으로 반환된 같은 문서의 `assetId`와 `token` 필드를 모두 비교할 수 있다.
  `mapping.data.assetId == objectId`는 문서 접근을 추가하지 않는다. 따라서 delete의
  `get(mapping)` 1 + `exists(spaces/token)` 1은 assetId 교차 확인을 포함해도 총 2이며, 연쇄 경로 보간이
  지원된다는 전제 아래 한도 안이다. "교차 확인을 넣으면 3개라 초과" 주장을 폐기한다.
- `updateMetadata()`는 별도 Storage update 요청이며 목표 Rules의 `allow update:false`가 차단한다.
  GG-4 목표가 update/delete false를 이미 포함하므로 "metadata update 차단 계약 공백"이라는 주장도
  폐기한다. 실제 V2 Rules는 미작성/NOT TESTED임은 유지한다.
- public metadata는 현재 경로의 사실이 아니라 **목표 public-read Rules가 작성될 경우의 설계 귀결**로
  표시한다. 공개 타입은 권한이 있을 때 `getMetadata()` 결과에 customMetadata가 포함됨을 증명하지만,
  V2 목표 Rules 실행은 NOT TESTED다.
- 제품 코드/test/Rules/config/package/lockfile과 emulator/live 변경 0. Founder JJ-1~JJ-7은 라운드 3
  재검수 전 묻지 않는다. 전체 진행도 **78~81% 완료 / 19~22% 잔여 — 변동 없음**.

## 스펙 073 문서 보완 라운드 2 수행 (2026-08-24)

- 보완 직전 관측 기준 HEAD=origin `2dd97c4`, ahead/behind 0/0. 허용 문서 6개(조사 보고서 · spec073 ·
  STATE · NEXT · CURRENT · live log)만 수정했다. 제품 코드/test/Rules/Firebase config/package/lockfile,
  `apps/**`, `packages/**`, 보호 대상 변경 0. 실제 Firebase/network/**emulator**/deploy/UID/URL/UI 0.
- **보완 1 — cross-service primitive 근거 등급.** 라운드 1이 `UNCONFIRMED`로 남긴 분류가 틀렸다.
  보고서 §Q7.1.0에서 네 층위로 분리했다 — ① Storage Rules `firestore.get()/exists()` **공식 지원**
  (G-4 §4 인용) · ② client `read:false` 문서 조회로 create를 게이팅하는 primitive **local emulator
  VERIFIED**(`storage.emulator.rules:40-45` · `firestore.emulator.rules:71-86` ·
  `cutover-rules.emulator.test.ts:83-96` · G-4 §12 **13/13 PASS**) · ③ V2 mapping Rules
  **미작성·NOT TESTED** · ④ 실제 Firebase/IAM/live **NOT TESTED**.
  "우회(bypass)" 표현도 폐기하고 **Firestore client read 권한**과 **Storage Rules service-side
  cross-product 평가**를 구분했다. ②는 `.json` 경로 검증이며 이번 세션 재실행 없음.
- **보완 2 — privileged plaintext surface.** *"버킷과 같은 신뢰 수준이라 새 노출 경로가 아니다"*
  단정을 폐기했다. private mapping은 **현재 어디에도 없는 관계의 평문 사본**을 만들고
  console/Admin SDK/service account/IAM이라는 **별도 접근 표면**을 추가한다. bucket 접근 주체와의
  principal/role overlap은 **`UNCONFIRMED`**(IAM 미열람). 금지도 승인도 하지 않고 **Founder 보안
  tradeoff**로 남겼다.
- **보완 3 — REC ID 후보 완결성.** *"opaque recId는 성립하지 않는다"* 확정을 폐기했다. wildcard가 잡는
  값은 bare UUID가 아니라 **세그먼트 전체 `"<uuid>.png"`**다. §Q7.1.1에서 **(c1) transform-0**
  (admin-state G-4 §8.2와 같은 패턴, 문자열 변환 0, 조회 패턴 자체는 VERIFIED → **성립**)과
  **(c2) 독립 recId + `customMetadata` pointer**(설치 SDK `storage-public.d.ts:500·515·277·301-303·56`
  근거로 **같은 `uploadBytes` 호출에 포함 가능**하나 Rules metadata 표면 `UNCONFIRMED`, access-call
  예산 초과 위험, **public-read라 `getMetadata()`로 공개 관측** → recId를 비밀로 둘 수 없고 token
  삽입 금지, `updateMetadata` 차단 계약 공백, **GG-4 미승인 schema 확장**)로 나눴다.
  두 후보 모두 **확정 orphan을 증명하지 못한다.**
- **보완 4 — commit 자기참조 추적 중단.** 라운드 1까지 만들던 "자기 해시 pin" bookkeeping commit
  (`534c26f`, `2dd97c4`)을 **더 만들지 않는다.** **commit은 자기 해시를 내용에 담을 수 없다**는 한계를
  숨기지 않고, 상태 문서에는 **push 후 HEAD=origin·ahead/behind 0/0 검증 사실**과 **라운드 2 내용
  commit**을 구분해 적고 해시 정본은 git 이력·세션 보고에 둔다.
- 게이트: `git diff --check` PASS, 허용 6개 문서 외 diff 0. 문서 전용 단위라 실행 게이트 없음.
- 전체 진행도 **78~81% 완료 / 19~22% 잔여 — 변동 없음**. primitive 하나가 VERIFIED로 올라간 것은
  **이미 검증돼 있던 사실의 오분류를 바로잡은 것**이지 새 검증이 아니다. 상태 `READY_FOR_CODEX`,
  다음 transition `CODEX_RE_REVIEW`. Founder JJ-1~JJ-7과 다음 스펙은 시작하지 않았다.

## 스펙 073 Codex 재검수 — CORRECTION_REQUIRED 라운드 2 (2026-08-24)

- 실제 HEAD=origin `2dd97c4`, ahead/behind 0/0이다. `63a1dec`은 라운드 1 내용 commit이고
  `2dd97c4`는 그 해시를 문서에 기록한 후속 bookkeeping commit이다.
- 라운드 1의 핵심 정정은 수용한다. 다만 기존 증거를 누락해 cross-service primitive를
  `UNCONFIRMED`로 잘못 낮춘 부분이 있다. `storage.emulator.rules:40-45`는 client-denied REC에
  `firestore.exists()`를 사용하고, `firestore.emulator.rules:71-86`은 그 REC의 client read를
  `false`로 둔다. `cutover-rules.emulator.test.ts:83-96`은 REC 생성 후 Storage upload 성공을 실제
  local emulator에서 검증했으며 G-4 정본도 13/13 PASS를 기록한다. 따라서 **primitive는 local
  emulator VERIFIED**, V2 전용 mapping은 **미작성/NOT TESTED**, 실제 IAM/live는 **NOT TESTED**로
  분리해야 한다.
- private mapping을 "bucket 객체와 같은 신뢰 수준이라 새로운 노출 경로가 아니다"라고 단정하지
  않는다. Firestore 평문 저장은 별도 persistence·IAM·console/Admin SDK 접근 표면이고, bucket과
  접근 주체가 정확히 같은지는 `UNCONFIRMED`다.
- opaque recId 후보를 path만 보고 불가능으로 확정한 분석도 불완전하다. no-extra-metadata 조건에서는
  object segment 자체(`<uuid>.png`)를 REC ID로 쓰는 transform-0 후보가 있고, 별도 opaque recId는
  upload에 포함되는 Storage custom metadata pointer 후보가 있다. 후자는 schema/Rules/security
  변경 후보일 뿐 승인되지 않았고 public-read object의 metadata 노출까지 분석해야 한다.
- 제품 코드/test/Rules/config/package/lockfile 변경과 emulator/live 실행은 계속 0이다. Founder
  JJ-1~JJ-7은 라운드 2 재검수 전 묻지 않는다. 전체 진행도 **78~81% 완료 / 19~22% 잔여 — 변동 없음**.

## 스펙 073 문서 보완 라운드 1 수행 (2026-08-24)

- 보완 직전 기준 HEAD=origin `534c26f`, 반영 commit `63a1dec`, ahead/behind 0/0.
  허용 문서 6개(조사 보고서 · spec073 · STATE · NEXT ·
  CURRENT · live log)만 수정했다. 제품 코드/test/Rules/Firebase config/package/lockfile, `apps/**`,
  `packages/**`, 보호 대상 변경 0. 실제 Firebase/network/emulator/deploy/UID/URL/UI 0.
- **보완 1**: V2-2 REC을 "평문이라 토큰 비밀성과 반드시 충돌"한다고 단정한 문구를 폐기하고, 보고서에
  §Q7.1(client-denied write-once mapping 후보 V2-2′)을 신설했다. 키·필드 후보 3종, 승인 UID
  create-only, get/list 거부, 순차 commit vs 같은 transaction+`getAfter()`, crash·미확정·늦은 성공,
  Storage Rules 문서 접근 한도 2·quota·default DB·IAM을 분리 분석했다.
  ★ **이 후보만으로는 확정 orphan을 증명하지 못한다** — V2에는 늦은 create를 무효화하는 단조값이
  없다. UNCONFIRMED 2건(Rules `get()/exists()`의 read 거부 우회 공식 인용 미취득, 연쇄 경로 보간
  지원 미확인)을 남겼다. 암호문 결론과 O-3 삭제 보류는 유지된다.
- **보완 2**: `getDoc` 결론의 근거를 설치 SDK 원문 행(`index.d.ts:2582-2595`, `:1386-1413`)으로
  고정하고, "SDK가 로컬 timeout으로 실패 처리"라는 표현을 폐기했다. `setDoc`의 Promise에는 SDK 자체
  timeout이 없으며, 정확한 경계는 **앱이 bounded timeout으로 포기해도 원 Promise·pending write가 남아
  연결 회복 시 기록된다**는 것이다. API 근거와 runtime `NOT TESTED`를 분리하고 정확한 설치 소스 경로를
  명시했다.
- **보완 3**: 실패표를 판정 축 A([현재 Rules] / [목표 후보 Rules])와 축 B(정적 / 설계 / 실행)로
  나눠 §3.1·§3.2·§3.3으로 재구성했다. 같은 assetId 거부를 목표 rule의 PASS로 기록하던 것을 고쳤고,
  `spaces` list 개방은 `UNCONFIRMED`가 아니라 **정적 사실 + 실행 NOT TESTED**로 분리했다.
- **보완 4**: 보고서·spec073·STATE/NEXT/CURRENT의 commit 기준을 실제 기록(`f1f5d20` 조사 기록,
  `534c26f` hash-pin, 이번 보완 commit)에 맞췄다.
- JJ-5 선택지를 과장 없이 고쳤다(B·C 모두 확정 orphan 미증명, 어느 선택도 삭제 승인 아님).
- 게이트: `git diff --check` PASS, 허용 6개 문서 외 diff 0. 문서 전용 단위라 실행 게이트는 없다.
- 전체 진행도 **78~81% 완료 / 19~22% 잔여 — 변동 없음**. 상태 `READY_FOR_CODEX`,
  다음 transition `CODEX_RE_REVIEW`. Founder JJ-1~JJ-7과 다음 스펙은 시작하지 않았다.

## 스펙 073 Codex 문서 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-24)

- 실제 HEAD=origin은 `534c26f`, ahead/behind 0/0이다. `f1f5d20`은 조사 보고서 기록 commit이고
  `534c26f`은 그 해시를 상태 문서에 고정한 후속 문서 commit이다.
- 핵심 Rules·SDK 조사 방향은 유지한다. 다만 V2-2 REC을 "평문이므로 토큰 비밀성과 반드시 충돌"한다고
  단정한 것은 근거가 부족하다. 클라이언트 `get/list`를 모두 거부한 private write-once Firestore
  증명 문서는 Storage Rules의 `firestore.get()/exists()`가 서버 측에서 조회할 수 있는 별도 후보다.
  이 후보의 쓰기 원자성·결과 미확정·orphan 판정 가능성과 비용을 분석한 뒤에만 선택지로 분류해야 한다.
- 설치 `@firebase/firestore` 4.17.0 공개 타입은 `setDoc` 데이터가 즉시 local cache에 들어가 future
  `get`에 반영될 수 있고(`dist/index.d.ts:2582-2595`), `getDoc`은 cache를 반환할 수 있으며
  `getDocFromServer`는 server read라고 명시한다(`:1386-1413`). 따라서 server-only reconciliation에
  `getDocFromServer`가 필요하다는 방향은 유지하되, "SDK가 timeout으로 실패했다"가 아니라 app-level
  timeout/호출 포기 뒤 원 Promise와 pending write가 남을 수 있는 경계로 정확히 써야 한다. 실제
  emulator/runtime 시나리오는 계속 `NOT TESTED`다.
- 현재 Rules 사실과 목표 Rules 후보를 실패표에서 분리한다. 특히 같은 assetId 거부는 현재
  `rebuild-space-assets` 전체 default deny와 목표 create-only rule을 혼합해 PASS로 부르지 않는다.
  `allow read`의 `get/list` 의미도 Rules 분석 결과와 실행 `NOT TESTED`를 분리한다.
- 제품 코드/test/Rules/config/package/lockfile 변경과 emulator/live 접근은 계속 0이다. JJ-1~JJ-7은
  보완 재검수 통과 전 Founder에게 묻지 않는다. 전체 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**.

## 스펙 073 persistence boundary 조사 완료 (2026-08-24)

- Codex 문서 8개를 문서 commit `c5f8384`로, 조사 보고서·기록을 `f1f5d20`으로 각각 fast-forward push했다.
  제품 코드/test/Rules/Firebase config/package/lockfile 변경 0, 실제 Firebase/network/emulator/deploy/
  UI 0. 실행한 것은 저장소 파일과 설치 SDK 타입/소스 읽기뿐이다.
- 산출물: `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md`.
- 핵심: ① `rebuild-space-assets/objects/**`는 `storage.rules` match 부재로 CRUD 전부 기본 거부다.
  ② `spaces/{token}`은 `create: if true`라 GG-5의 UID·exact keys를 둘 다 미충족이며 불변성만 PASS다.
  ③ V2는 asset↔document 연결이 암호문 안이라 G-4 구조 A의 SDC′ orphan 식별을 이식할 수 없다.
  ④ write outcome 판정에는 `getDoc`이 아니라 `getDocFromServer`가 필요하다(pending write 거짓 성공).
- 실패표 20행을 PASS/FAIL/UNCONFIRMED/NOT TESTED로 분류하고, 늦은 성공 가능성·`md5Hash` 상시 존재·
  Storage read 캐시·`spaces` list 개방·PNG 크기/발급량/orphan 비용·bucket CORS·실제 운영자 UID를
  UNCONFIRMED로 남겼다. 시간 경과만으로 미판정이 orphan이 된다고 단정하지 않았다.
- Founder 결정 질문 JJ-1~JJ-7 분리. 결정 없이 가능한 다음 최소 단위는 JJ-7=A(local `space-write`
  port + synthetic fake만, 네트워크 0)뿐이다.
- 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다(스펙 073 §7: 조사만으로 올리지
  않는다). 상태 `READY_FOR_CODEX`, 다음 transition `CODEX_INDEPENDENT_REVIEW`.

## 스펙 072 Codex 통과 + 스펙 073 조사 준비 (2026-08-24)

- HEAD=origin `452cc1a`에서 구현 `34cca25`을 독립 검토해 추가 결함 0, 최종 `CODEX_PASSED / DONE`이다.
- 독립 게이트: targeted 58/58, 확대 513/513, check PASS(unit 2084/2084), Chromium 151/151,
  bundle identity, diff/포트/temp/staged 잔류 0.
- 다음은 실제 쓰기를 열지 않는 스펙 073 persistence boundary 문서 조사다. 현재 Rules·설치 SDK·기존
  adapter를 읽어 asset upload, Firestore create, outcome unknown, reconciliation과 orphan 경계를 정리한다.
- 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여로 변동 없음**이다. 독립 검수와 조사 계약
  문서화만 했으므로 추가 제품 능력은 없다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_DOCUMENT_INVESTIGATION`.

## 스펙 072 local issue bundle 구현 완료 (2026-08-24)

- Codex 계약 문서 6개를 문서 commit `96422f8`로, 구현을 `34cca25`로 각각 일반 fast-forward push했다.
- 제품 변경은 허용 신규 2파일(`apps/admin/src/space-v2/issue-bundle.ts`와 unit)뿐이고 기존
  spec064~071 제품 파일, package/lockfile/CSS/Firebase/Rules/config/UI diff는 0이다.
- 순서 실측: top-level snapshot -> UUID assetId #1 -> UUID token #2 -> SHA #1/#2/#3 -> encrypt #1.
  identity 실패는 `IDENTITY_FAILED`로 preparation/SHA/encryption 0, preparation 실패는
  `PREPARATION_FAILED`로 UUID 재생성·retry·upload/create 0이다.
- 게이트: targeted 58/58, space-v2+spaces 513/513, admin typecheck, `node scripts/check.mjs`
  PASS(unit 2084/2084), 전체 Chromium 151/151, bundle identity 유지(고객 322,018 / admin 226,201 /
  CSS 9,146), 신규 식별자 0, `git diff --check` PASS, 포트/temp/staged 잔류 0. mutation 5종 전부 검출.
- upload, Firestore create/reconciliation, URL 발급, 실제 Firebase/Rules/network/emulator/deploy와
  viewer/admin UI는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.
- 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여**(직전 77~80%에서 +1%p). 근거는 local 발급 준비
  사슬이 identity까지 포함해 하나의 handle로 닫힌 것이고, 작업축 6·7은 이번에도 불변이라 상승폭을
  1%p로 제한했다.
- 상태 `READY_FOR_CODEX`, 다음 transition `CODEX_INDEPENDENT_REVIEW`. 다음 스펙은 시작하지 않았다.

## 스펙 072 local issue bundle 계약 준비 (2026-08-24)

- 사용자 수동 재개 지시에 따라 다음 최소 단위로 스펙 072 계약과 handoff를 작성했다.
- 스펙 071 identity pair를 먼저 만들고 그 assetId를 스펙 068 preparation에 전달하는 local-only 조합이다.
- 허용 제품 파일은 신규 `issue-bundle.ts`와 unit 2개뿐이다. upload, Firestore create, Firebase/Rules/
  network/emulator/deploy와 UI는 계속 닫혀 있다.
- 전체 리빌드 진행도는 **77~80% 완료 / 20~23% 잔여로 변동 없음**이다. 계약 문서만 준비했으므로
  제품 작업축 완료량은 아직 증가하지 않았다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`.

## 스펙 071 Codex 독립 검수 통과 · 오늘 세션 종료 (2026-08-21)

- HEAD=origin `0d4aac4`에서 구현 `eb3df01`을 독립 검토했다. 기준 `3e0a91a` 이후 제품 diff는 허용
  신규 module/unit 2개뿐이고 기존 spec064~070, package/lockfile/CSS/Rules/config/UI diff는 0이다.
- 독립 게이트: targeted 29/29, space-v2+spaces 455/455, `node scripts/check.mjs` PASS(unit 2026/2026),
  전체 Chromium 151/151, bundle identity, `git diff --check`, 포트/temp/staged 잔류 0.
- method one-read와 receiver 보존, assetId→token 순서, 0/1/2회 호출 예산, child 오류 비노출,
  collision fail-closed와 retry 0을 코드·테스트에서 대조했다. 추가 결함은 없다.
- 스펙 071 최종 `CODEX_PASSED / DONE`. 스펙 068 조합, upload, Firestore create, 실제 Firebase/Rules/
  network/emulator/deploy와 UI는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.
- 전체 리빌드 진행도는 **77~80% 완료 / 20~23% 잔여**를 유지한다. 검수는 구현 기록을 확인한
  것이므로 추가 상승은 없다.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`. 오늘 세션을 종료하고 다음 스펙은 자동 시작하지 않는다.

## 스펙 071 구현 완료 (2026-08-21)

- 계약·결정 commit `92540b4`, 구현 commit `eb3df01`. 허용 2개 신규 파일뿐이고 기존 064~070 제품
  파일과 package/lockfile/CSS/config/Rules diff 0이다.
- HH-1=A: assetId·token은 독립 UUID 두 개. original method 1회 read + receiver 보존 adapter로
  스펙 069 candidate를 assetId→token 순서로 두 번 호출한다.
- 호출 예산 0/1/2회, 세 번째 호출·retry 0, 동일 값은 `SPACE_V2_IDENTITY_COLLISION`으로 fail-closed.
- 하위 token 오류 code 비노출, 실패 결과는 `{ok, code}`뿐.
- targeted 29/29, space-v2+spaces 455/455, admin typecheck, `node scripts/check.mjs` PASS
  (unit 2026/2026), 전체 Chromium 151/151, bundle identity와 `git diff --check` PASS.
- 진행도 77~80% / 잔여 20~23%(직전 76~79%에서 +1%p). 근거는 identity 준비가 닫힌 것이며, 조합·
  upload·create는 여전히 금지라 상승폭을 제한했다. 작업축 6·7 불변.

## Founder HH-1=A 승인 + 스펙 071 계약 준비 (2026-08-21)

- Founder가 public link token과 proof object `assetId`를 독립 UUID 두 개로 만드는 `HH-1=A`를 승인했다.
  둘이 같으면 collision으로 fail-closed하고 자동 retry하지 않는다.
- 결정 정본 `docs/codex-claude-handoff/decisions/2026-08-21-space-v2-issue-identity-decisions.md`,
  스펙 `docs/rebuild/specs/071-space-v2-local-issue-identity-pair.md`, 관련 handoff를 작성했다.
- 스펙 071은 기존 UUID port를 두 번 순차 사용해 local identity pair만 만든다. 신규 admin local module/unit
  2개 외 제품 변경은 허용하지 않으며 스펙 068 preparation 조합, upload, Firestore create, 실제 Firebase/
  Rules/network/emulator/deploy와 UI는 계속 금지다.
- 전체 리빌드 진행도는 **76~79% 완료 / 21~24% 잔여로 변동 없음**이다. 이번 변경은 결정·계약
  문서화이며 제품 작업축 완료량은 증가하지 않았다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`.

## 스펙 070 Codex 통과 + Founder HH-1 결정 대기 (2026-08-21)

- HEAD=origin `3e0a91a`에서 구현 `ff3c59a`를 독립 검토했다. 허용 제품 diff 2개가 정확하고 추가 결함 0,
  최종 `CODEX_PASSED / DONE`이다.
- 독립 게이트: targeted 21/21, space-v2+spaces 426/426, `node scripts/check.mjs` PASS(unit 1997/1997),
  Chromium 151/151, bundle identity, diff/포트/temp PASS.
- 다음 local issue 조합은 token과 proof asset UUID의 관계를 결정해야 한다. 기존 스펙이 의도적으로
  보류한 구조 결정이므로 `HH-1` Founder 선택 전 새 제품 스펙을 열지 않는다.
- 진행도는 **76~79% 완료 / 21~24% 잔여로 변동 없음**이다. source adapter만 확정됐고 실제 발급
  조합·upload·create와 작업축 6·7은 불변이다.
- 상태 `FOUNDER_DECISION_REQUIRED`, 다음 transition `FOUNDER_HH_1_DECISION`.

## 스펙 070 구현 완료 (2026-08-21)

- 계약 commit `53d115c`, 구현 commit `ff3c59a`. 허용 2개 신규 파일뿐이고 기존 064~069 제품 파일과
  package/lockfile/CSS/config/Rules diff 0이다.
- 표준 `Crypto.randomUUID()` source만 사용. method 1회 read + callable 검증, 원 receiver로 호출,
  malformed source 7종은 `SOURCE_UNAVAILABLE`이며 global fallback 0.
- adapter는 형식 검증·throw 매핑·호출 횟수·retry를 하지 않는다(스펙 069 candidate 소유).
- 범위 한계: Web Crypto 선택은 난수 품질·충돌 부재의 증명이 아니다. 실제 값 1건만 형식 통과 확인.
- targeted 21/21, space-v2+spaces 426/426, admin typecheck, `node scripts/check.mjs` PASS
  (unit 1997/1997), 전체 Chromium 151/151, bundle identity와 `git diff --check` PASS.
- 진행도 76~79% / 잔여 21~24% — 변동 없음(source 명시만, 새 능력 없음).

## 스펙 069 Codex 통과 + 스펙 070 계약 준비 (2026-08-21)

- HEAD=origin `020402c`에서 구현 `e5261a2`을 독립 검토했다. 허용 제품 diff 2개가 정확하고 추가 결함 0,
  최종 `CODEX_PASSED / DONE`이다.
- 독립 게이트: targeted 41/41, space-v2+spaces 405/405, `node scripts/check.mjs` PASS(unit 1976/1976),
  Chromium 151/151, bundle identity, diff/포트/temp PASS.
- 스펙 070은 표준 `Crypto.randomUUID()` source를 spec 069 port에 맞추는 local-only adapter다. token↔
  assetId 관계, issue 조합, upload, Firestore, Firebase와 UI는 열지 않는다.
- 진행도는 **76~79% 완료 / 21~24% 잔여로 변동 없음**이다. 스펙 069는 최소 형식 경계이고 스펙 070은
  문서만 준비됐으며 작업축 6·7은 불변이다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`.

## 스펙 069 구현 완료 (2026-08-21)

- 계약 commit `361b1d3`, 구현 commit `e5261a2`. 허용 2개 신규 파일뿐이고 기존 064~068 제품 파일과
  package/lockfile/CSS/config/Rules diff 0이다.
- 주입 UUID port의 method를 1회 read + callable 검증, 원 receiver로 최대 1회 호출. lowercase UUID v4
  형식만 성공이며 trim/lowercase repair·retry·global random fallback 0.
- 오류 3개(INVALID_PORT / GENERATION_FAILED / INVALID_OUTPUT), 실패 결과는 `{ok, code}`뿐.
- 범위 한계: 형식 검증일 뿐 난수 품질·충돌 부재는 NOT PROVEN(후속 adapter 계약).
- targeted 41/41, space-v2+spaces 405/405, admin typecheck, `node scripts/check.mjs` PASS
  (unit 1976/1976), 전체 Chromium 151/151, bundle identity와 `git diff --check` PASS.
- 진행도 76~79% / 잔여 21~24% — 변동 없음(형식 경계 하나만 열렸고 발급 조합·upload·create는 닫힘).

## 스펙 068 Codex 통과 + 스펙 069 계약 준비 (2026-08-21)

- HEAD=origin `215af5b`에서 구현 `31ee0d7`을 독립 검토했다. 허용 제품 diff 2개가 정확하고 추가 결함 0,
  최종 `CODEX_PASSED / DONE`이다.
- 독립 게이트: targeted 59/59, space-v2+spaces 364/364, `node scripts/check.mjs` PASS(unit 1935/1935),
  Chromium 151/151, bundle identity, diff/포트/temp PASS.
- 스펙 069는 `GG-1=A`의 새 UUID token을 필수 주입 port + lowercase UUID v4 검증으로만 분리하는
  local-only 계약이다. token↔assetId 관계, upload, Firestore, Firebase와 UI는 열지 않는다.
- 진행도는 **76~79% 완료 / 21~24% 잔여로 변동 없음**이다. 스펙 068 통과로 후보 능력을 확정했지만
  스펙 069는 문서만 준비됐고 작업축 6·7은 불변이다.
- 상태 `READY_FOR_CLAUDE`, 다음 transition `CLAUDE_IMPLEMENTATION`.

## 스펙 068 구현 완료 (2026-08-21)

- 계약 commit `160eca0`, 구현 commit `31ee0d7`. 허용 2개 신규 파일뿐이고 기존 065·066·067 제품 파일과
  package/lockfile/CSS/config/Rules diff 0이다.
- 순서 proof(SHA #1) → scene(SHA #2) → document(verify SHA #3 + encrypt #1). 모든 입력과 두 port
  method를 첫 await 전에 snapshot하고 always-defined adapter를 세 단계가 공유한다.
- 단계별 실패 code가 이후 호출을 0으로 막고, 성공 handle은 fresh copy 3종만 제공한다.
- targeted 59/59, space-v2+spaces 364/364, admin typecheck, `node scripts/check.mjs` PASS
  (unit 1935/1935), 전체 Chromium 151/151, bundle identity와 `git diff --check` PASS.
- 진행도 76~79% / 잔여 21~24%(직전 74~77%에서 약 +2%p). 근거는 작업축 5의 local 준비 사슬 완성이며,
  작업축 6·7 불변이라 상단은 79%를 넘기지 않았다.

## 스펙 067 Codex 통과 + 스펙 068 계약 준비 (2026-08-21)

- 보완 `db61c7d` 독립 재검증: 단일 71/71, 확대 305/305, unit 1876/1876, Chromium 151/151,
  check/bundle/diff/포트/temp PASS. 이전 일시 timeout은 재발하지 않았다.
- C-1 required injection/global fallback 결함은 해소됐고 추가 결함 0. 스펙 067 최종
  `CODEX_PASSED / DONE`.
- 진행도는 local scene→proof→encrypted outer chain 완료를 반영해 **74~77% 완료 / 23~26% 잔여**로
  확정한다.
- 다음 스펙 068은 기존 065·066·067만 snapshot-safe하게 조합하는 local preparation orchestrator다.
  신규 admin module/unit 2개만 허용하고 token/upload/Firestore/Firebase/UI는 0이다.
- 계약 문서만 준비했으므로 추가 진행률 상승은 없다. 상태 `READY_FOR_CLAUDE`, 다음 transition
  `CLAUDE_IMPLEMENTATION`.

## 스펙 067 보완 라운드 1 완료 (2026-08-21)

- 보완 commit `db61c7d`. 허용 제품 파일 2개만 변경했고 package/lockfile/CSS/Rules/config diff 0이다.
- C-1: `sha256`/`crypto` method를 각자 첫 await 전에 1회만 읽어 callable 검증하고, SHA는 항상-defined
  adapter로 감싸 `verifyFrameReplayEvidenceDigestV1`의 global Web Crypto default를 닫았다.
  invalid SHA port → EVIDENCE_NOT_VERIFIED, invalid crypto port → ENCRYPT_FAILED.
- 회귀 17건 추가(global digest 0 + encryption 0, method getter one-read, method-style receiver).
- targeted 71/71, space-v2 180/180, space-v2+spaces 305/305, `node scripts/check.mjs` PASS
  (unit 1876/1876), 전체 Chromium 151/151, bundle identity와 `git diff --check` PASS.
- 진행도 74~77% / 잔여 23~26% — 변동 없음(범위 내 결함 수정, 새 능력 없음).

## 스펙 067 Codex 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-21)

- candidate `35b7ffd`의 제품 diff 2개는 정확하고 unit 1859/1859, 전체 check, Chromium 151/151,
  bundle/diff/포트/temp 게이트는 독립 PASS했다.
- C-1: 런타임 `sha256 === undefined`가 verifier default `webCryptoSha256Port`를 활성화해 필수 주입과
  global crypto 0 계약을 우회한다. 현재 boundary test는 유효 fake만 전달해 이를 잡지 못한다.
- 허용 2개 파일 안에서 SHA/crypto method를 await 전 1회 snapshot·검증하고 always-defined adapter로
  verifier default를 닫으며 malformed port/global digest 0 회귀를 추가한다.
- 상태 `CORRECTION_REQUIRED`, fix round 1, 다음 transition `CLAUDE_CORRECTION`. 스펙 067은 아직 DONE/
  CODEX_PASSED가 아니다.
- 진행도는 검수 통과 전 정본 **72~75% 완료 / 25~28% 잔여**를 유지한다. Claude의 74~77% 상승은
  candidate 통과 뒤 다시 평가한다.

## 스펙 067 구현 완료 (2026-08-21)

- 계약 commit `2107a72`, 구현 commit `35b7ffd`. 허용 2개 신규 파일뿐이고 package/lockfile/CSS/Rules/
  config diff 0이다.
- 암호화 전에 `verifyFrameReplayEvidenceDigestV1`로 evidence↔digest 일치를 검증하고, detached scene만
  `encryptJson`에 1회 넘긴 뒤 outer를 `readSpaceDocumentV2`로 재검증한다. decrypt/retry 0.
- targeted 54/54, space-v2+spaces 288/288, admin typecheck, `node scripts/check.mjs` PASS
  (unit 1859/1859), 전체 Chromium 151/151, `git diff --check` PASS.
- bundle identity 유지(admin 226,201 / CSS 9,146 / 고객 322,018), 두 bundle에 spec 067 식별자 0건.
- 진행도 74~77% / 잔여 23~26%(직전 72~75%에서 약 +2%p). 근거는 작업축 5의 암호화 문서 조립이 닫힌
  것이며, 작업축 6·7 불변이라 상단은 77%를 넘기지 않았다.

## 스펙 066 Codex 통과 + 스펙 067 계약 준비 (2026-08-21)

- 스펙 066 독립 검증: space-v2+spaces 234/234, admin typecheck, `node scripts/check.mjs` PASS(unit
  1805/1805), 전체 Chromium 151/151, bundle identity, diff, 포트/temp 잔류 0. 최종
  `CODEX_PASSED / DONE`.
- full PNG decode/CRC/IDAT/IEND와 실제 upload/Firebase/token/document create/viewer/UI는 계속 NOT TESTED/
  금지다.
- 진행도는 **72~75% 완료 / 25~28% 잔여**로 정정한다. Claude의 72~76% 기록은 “상단 유지” 근거와
  모순돼 기존 75% 상단을 유지했다.
- 다음 local-only 단위는 스펙 067이다. strict scene snapshot의 evidence digest를 기존 verifier와 주입
  SHA-256 port로 확인한 뒤 crypto port로 암호화하고 exact V2 outer candidate를 재검증한다. 신규 admin
  module/unit 2개만 허용하며 token/upload/Firestore/Firebase/UI는 0이다.
- 계약 문서만 준비했으므로 진행률은 추가 상승하지 않는다. 상태 `READY_FOR_CLAUDE`, 다음 transition
  `CLAUDE_IMPLEMENTATION`.

## 스펙 066 구현 완료 (2026-08-21)

- 계약 commit `1ede90c`, 구현 commit `9fee315`. 허용 2개 신규 파일뿐이고 package/lockfile/Rules/config
  diff 0이다.
- targeted 55/55, space-v2+spaces 234/234, admin typecheck, `node scripts/check.mjs` PASS
  (unit 1805/1805), 전체 Chromium 151/151, `git diff --check` PASS.
- bundle identity 유지: admin `index-D0XOQpRL.js` 226,201 bytes, admin CSS 9,146 bytes(unwanted 0),
  고객 `index-6js4DafP.js` 322,018 bytes. 두 bundle에 spec 066 식별자 0건.
- 범위 한계: full PNG decode/CRC/IDAT/IEND/browser decode는 NOT TESTED. upload/Firebase/token/
  Firestore create/viewer/UI는 계속 금지다.
- 진행도 72~76% / 잔여 24~28%(이전 70~75%에서 하단 상향). 근거는 작업축 5의 byte-identity 하위
  작업이 닫힌 것이며, 작업축 6·7은 불변이라 상단은 유지했다.

## 스펙 066 local proof asset preparation 준비 (2026-08-21)

- 정본 `docs/rebuild/specs/066-space-v2-local-proof-asset-preparation.md`, handoff
  `docs/handoff/2026-08-21-spec-066-space-v2-local-proof-asset-preparation-handoff.md`.
- PNG bytes를 await 전에 1회 복사하고 lowercase UUID v4 path, PNG signature/IHDR dimensions,
  SHA-256 descriptor와 fresh upload-byte copies를 같은 snapshot에 묶는 admin local-only 경계다.
- 허용 제품 파일은 신규 non-UI module/unit 2개뿐이다. App/UI/CSS/package/lockfile/Firebase/Rules/config
  변경 0, 실제 network/upload/token/encryption/document create/viewer/deploy 0이다.
- 전체 진행도는 **70~75% / 잔여 25~30% 유지**다. 계약 문서만 준비했으므로 제품 작업축 상태는 아직
  바뀌지 않았다.

## Claude Code HOLD 확인 (2026-08-21)

- active_unit `none`을 확인하고 구현하지 않았다. 제품 코드/테스트/Rules/config/package/lockfile 변경 0,
  자동화·반복 작업 생성 0, 보호 대상 조작 0.
- 재확인: HEAD=origin ahead/behind 0/0, 제품 diff 0, targeted+spaces 179/179,
  `node scripts/check.mjs` PASS(unit 1750/1750), admin/customer entry와 admin CSS 9,146 bytes 기준 일치.
- 진행도 **70~75% / 잔여 25~30% — 변동 없음**. 근거: 제품 단위 미구현이라 7개 작업축 상태 불변.

## 전체 리빌드 진행도 스냅샷 (2026-08-21)

- **현재 추정: 70~75% 진행 / 25~30% 잔여.** 최종 스펙 총개수가 고정되지 않았으므로 정확한 산술
  완료율이 아니라 production cutover까지 포함한 로드맵 관리 추정치다.
- 완료·고도화 구간: 기술 스택/모노레포/공유 기반, catalog 호환 read, 고객 browse·preview·Canvas·
  local PNG, admin auth/read와 C5 local/emulator, Hosting/Rules의 local synthetic gate.
- 진행 중 구간: space V2는 strict local evidence와 issuer projector까지만 완료했다. proof asset 준비,
  token/encryption, Firebase create, V2 viewer composition은 아직 열리지 않았다.
- 큰 잔여 구간: Claude 담당 최종 UI/UX·시각/실기기 검증, 실제 UID와 운영 한도, 실제 Rules/Firebase/
  preview 검증, 단계적 production cutover·모니터링·롤백 확인.
- 앞으로 모든 live log 확인·검수·handoff 보고에는 이 진행도와 변동 근거를 반드시 포함한다. 근거가
  바뀌지 않으면 수치를 임의로 올리지 않는다.

## 스펙 065 Codex 독립 재검수 통과 (2026-08-21)

- 검수 HEAD=origin `7255012`, 보완 commit `ec7610e`; 허용 제품 diff는 정확히 3개 파일이다.
- catalog 1회 detach와 동일 snapshot projector 사용, narrow Tailwind source exclusion, handoff EOF
  교정이 모두 계약과 일치한다. 추가 결함 0, 최종 판정 **CODEX_PASSED / DONE**.
- 독립 게이트: targeted+spaces **179/179**, admin/ui typecheck, `node scripts/check.mjs` PASS(unit
  **1750/1750**), 전체 Chromium **151/151**, `git diff --check dcd893c..HEAD` PASS.
- admin entry `index-D0XOQpRL.js` **226,201 bytes**, SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`; customer entry
  `index-6js4DafP.js` **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- admin CSS 실측은 `index-DJ_z3tK1.css` **9,146 bytes**다. 이전 완료 기록의 9,144 표기는 2-byte
  계수 오류이며, `.transform`/`.italic`/rotate·skew property scaffold는 실제로 모두 0건이다.
- 실제 Firebase/network/UID/Rules/emulator/deploy와 token/encryption/upload/document create,
  issuer/viewer/UI 연결은 계속 NOT IMPLEMENTED / NOT TESTED / 금지다. 다음 스펙은 시작하지 않는다.

## 스펙 065 Codex 보완 라운드 1 (2026-08-21)

- 독립 재검증: targeted 177/177, admin typecheck, 전체 check PASS(unit 1748/1748), Chromium 151/151,
  고객 entry 기준 불변.
- **C-1:** raw catalog가 두 projector 사이에서 drift할 수 있다. `readLegacyCatalog` 1회 detached
  document를 양쪽이 공유하고 drifting art getter 회귀를 추가한다.
- **C-2:** admin CSS bundle drift는 게이트를 약화하지 않고 기존 spec 021 선례대로
  `packages/ui/src/theme.css`에 admin non-UI `space-v2/**/*` exact source exclusion 1줄로 복원한다.
- **C-3:** `git diff --check dcd893c..4c6ebf4`의 handoff EOF blank line을 정리한다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1, 다음 transition `CLAUDE_CORRECTION`.

## 스펙 065 보완 라운드 1 완료 (2026-08-21)

- 보완 commit `ec7610e`. 허용 제품 파일 3개(issue-candidate.ts/.test.ts, packages/ui/src/theme.css)만
  변경했고 package/lockfile 추가 diff 0이다.
- C-1 `readLegacyCatalog` 1회 detach 후 두 projector가 같은 document 사용 + drifting art getter 회귀 2건.
- C-2 theme.css에 admin `space-v2` exact source exclusion 1줄 → admin entry `index-D0XOQpRL.js`
  226,201 bytes / SHA-256 `B6E90475…B3A1F1DC` baseline 복원, admin CSS 9,146 bytes 복귀.
- C-3 handoff EOF blank line 제거 → `git diff --check dcd893c..기록 HEAD` PASS.
- targeted 54/54, spaces 125/125, `node scripts/check.mjs` PASS(unit 1750/1750), 전체 Chromium 151/151.
- 이전 DEVIATION은 해소됐다. 상태 `READY_FOR_CODEX`.

## 스펙 065 구현 완료 (2026-08-21)

- 계약 commit `e9e0c6d`, 구현 commit `5fc89d2`. 제품 변경은 허용 4개 파일뿐이다.
- targeted unit 52/52, `vitest run packages/spaces` 125/125, admin typecheck,
  `node scripts/check.mjs` PASS(unit 1748/1748), 전체 Chromium 151/151, `git diff --check` PASS.
- 고객 entry `index-6js4DafP.js` 322,018 bytes / 기준 SHA-256 불변.
- ★ DEVIATION: admin entry hash는 유지되지 않았다. JS는 byte-identical(226,201)이고 차이는 상호
  파일명 참조 한 곳뿐이며 module 코드는 bundle에 0건이다. 원인은 Tailwind v4 소스 스캔이 계약 필드명
  `transform`(+fixture `italic`)을 utility로 만들어 admin CSS가 9,146 → 9,821 bytes가 된 것이다.
  허용 파일 안에서 제거할 수 없어 Codex 판단으로 남긴다. 상세는 live log와 정본 DONE 절.
- `pnpm install`이 넣은 `pnpm-workspace.yaml` allowBuilds stub은 허용 파일 밖이라 즉시 되돌렸다.

## 스펙 065 local issuer projector 준비 (2026-08-21)

- 정본 `docs/rebuild/specs/065-space-v2-local-issuer-projector.md`, handoff
  `docs/handoff/2026-08-21-spec-065-space-v2-local-issuer-projector-handoff.md`.
- 스펙 064의 strict V2 evidence를 existing catalog projection + explicit issue input으로 조립하는 admin
  local-only projector다.
- 신규 비-UI module/unit, admin의 기존 workspace `@denn/spaces` dependency와 lock importer 최소 변경만
  허용한다. `App.tsx`, UI/CSS, Firebase/Rules/config, shared/spaces 제품 파일은 금지다.
- text/clock/template art, invalid input은 digest 전에 fail-closed한다. token/encryption/upload/Firestore
  create/link/viewer는 범위 밖이다.
- 상태 `READY_FOR_CLAUDE`; Claude 구현·검증 뒤 `READY_FOR_CODEX`에서 멈춘다.

## 수동 교대 루프 복원 (2026-08-21)

- 사용자의 최신 지시에 따라 임시 Codex 단독 구현·검증 루프를 중단했다.
- 이후 순서는 **Claude Code 구현·검증 → Claude live log/STATE/NEXT/CURRENT 동기화 → Codex 독립
  코드 검수·게이트 재검증 → Codex가 다음 스펙/프롬프트 문서 작성 → Claude Code가 읽고 작업**이다.
- Codex는 제품 코드를 직접 수정하지 않는다. 새 자동화·반복 작업도 만들지 않는다.
- 스펙 064는 독립 검수 결과 **CODEX_PASSED / DONE**이다. 다음 제품 단위는 아직 선택·승인되지
  않았으므로 `WAITING_FOR_NEXT_MANUAL_TASK`에서 멈춘다.
- GG-6은 첫 local-only 계약까지만 승인했다. issuer/Firebase/Rules/viewer/UI로의 후속 확장은 별도
  수동 지시와 스펙 전까지 시작하지 않는다.

## Claude Code 인계 확인 (2026-08-21)

- Claude Code가 `Automation/NEXT_CLAUDE_PROMPT.md`를 읽었고 active_unit이 `none`이라 구현 대상
  범위가 없음을 확인했다. 제품 코드/테스트/Rules/config/package/lockfile 변경 **0**.
- 로컬 재검증: HEAD=origin `1f60bc5`, ahead/behind 0/0, staged 0, `node scripts/check.mjs` PASS
  (unit 1696/1696), `vitest run packages/spaces` 125/125, 고객 entry `index-6js4DafP.js`
  322,018 bytes / SHA-256 `A9360EFF...E55E8159` 일치, `git diff --check` PASS.
- 전체 Chromium E2E는 이번 세션 제품 diff가 0이라 재실행하지 않았다(변경 무관성으로 대체).
- 보호 대상 spec-018 PNG와 기존 Founder/user working-tree 변경은 stage/commit/restore하지 않았다.
- 상태는 `WAITING_FOR_NEXT_MANUAL_TASK` 유지. 다음 단위는 수동 지시 + 새 스펙 뒤에만 시작한다.

## 스펙 064 space V2 local replay evidence 계약 (2026-08-20)

- 정본 `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`, Founder 결정
  `docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`, handoff
  `docs/handoff/2026-08-20-spec-064-space-v2-replay-evidence-investigation-handoff.md`.
- V2 exactness에는 explicit orientation뿐 아니라 canonical logical width, effective frame geometry,
  renderer contract와 proof bytes identity가 필요하다.
- whole catalog hash 대신 닫힌 `FrameReplayEvidenceV1` snapshot + versioned canonical SHA-256을 권장한다.
  SHA-256은 운영자 서명/attestation이 아니다.
- Founder가 **GG-1=A~GG-6=A**를 승인했다. V1과 분리된 `space-v2`/`space-scene-v2`, closed evidence,
  image-only frame, 향후 immutable UUID PNG 경로와 V2 operator-only create 방향을 선택했다.
- exact local shape와 fixed-position canonical tuple을 정본에 고정했다. 첫 구현은
  `packages/spaces/src/v2.ts`, `v2.test.ts`, `index.ts` 명시 export만 허용한다.
- strict reader, detached evidence encoder, injected/local Web Crypto SHA-256 safe create/verify만 구현한다.
  기존 V1 의미와 결과는 바꾸지 않는다.
- GG-4/GG-5는 목표 방향 승인이지 Rules/UID/Firebase adapter/upload/Firestore create/emulator/deploy
  승인이 아니다. UI/issuer/viewer 연결, 실제 network와 운영 발급도 계속 0이다.
- 구현 완료: strict exact-key reader, detached snapshot/fixed tuple encoder, injected/default Web Crypto
  digest create/verify와 safe errors를 허용 3개 제품 파일에만 추가했다.
- 자체 검수에서 module-scope encoder로 인한 고객 bundle 12-byte drift를 발견해 호출 내부 생성으로
  교정했다. 최종 고객 entry는 기준과 byte/hash까지 동일하다.
- targeted **107/107**, 전체 check PASS(unit **1696/1696**), Chromium **151/151**, canonical digest의
  Web Crypto/.NET 교차 계산 일치, 포트/temp/debug 잔류 0이다.
- 고객 entry `index-6js4DafP.js` **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- 구현 commit `0c5d6fa`. 상태 `READY_FOR_CODEX`; 기록 commit의 fast-forward push 뒤 독립 검수를 기다린다.

## 스펙 063 V1 안전 차단 viewer UI/UX 완료 (2026-08-20)

- Founder FF-5=A에 따라 Claude가 UI/UX를 담당했다. 정본
  `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md`, handoff
  `docs/handoff/2026-08-20-spec-063-space-v1-safe-viewer-ui-handoff.md`.
- `SpacePostAuthFrameView`가 catalog load·proof owner·Image decode·font load·Canvas plan보다 먼저
  V1 replay 자격을 판정한다. blocked면 그 뒤 단계가 하나도 시작되지 않는다.
- wrapper/child 분리로 조건부 hook 호출 0. composition은 module-private라 gate 우회 seam이 없다.
- 안전 안내는 Modern Studio 토큰만 쓴다. 오류코드·URL·token·비밀번호·ID·SDK 문구 0,
  Canvas·이미지 placeholder 0, 재시도 버튼 0, 카카오/외부 링크 0.
- targeted unit 15/15, 전체 `node scripts/check.mjs` PASS(unit 1627/1627), 전체 Chromium E2E
  **151 passed / 0 failed** (변경 전 baseline 실측 3 failed / 145 passed).
- Founder Q1=A로 `tests/e2e/space-frame-view.spec.ts`를 허용 추가해 안전 차단 기대값으로 갱신했다.
  fixture `apps/mockup/src/e2e/space-frame-fixture.tsx`는 변경 0이며, 그 계측으로 주입된 catalog
  reader·readiness factory·font environment 호출 0을 검증한다. 도달 불가 단언의 대체 coverage는
  스펙 §7.2.
- safe-state Canvas 0, catalog/proof/art 요청 0(인증 전후), console error/warning 0,
  axe serious/critical 0, 320px 가로 overflow 0, 실제 외부 egress 0.
- 고객 entry `index-6js4DafP.js` 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- package/lockfile/Rules/firebase config diff 0, 신규 의존성 0, 포트 잔류 0.
- 전체 E2E 실행이 `docs/rebuild/results/spec-018/*.png` 2개를 무조건 다시 쓴다. 보호 대상이므로
  stage/commit/restore하지 않고 working tree에 그대로 둔다.
- 실제 V2 schema/fingerprint/issuer, admin orientation UI, migration, Firebase/network/write/deploy는
  NOT IMPLEMENTED 또는 금지다.
- Codex 독립 검수: 코드·테스트·계약 diff에서 추가 결함 0. targeted unit **15/15**,
  `node scripts/check.mjs` PASS(unit **1627/1627**), 변경 범위 Chromium E2E **8/8**를 독립 재실행했다.
  Claude의 전체 Chromium **151/151** 결과도 기록과 변경 범위로 대조했다.
- 두 spec-063 시각 결과를 직접 확인했고 안전 차단 화면의 계층·문구·320px wrapping에 결함을 찾지 못했다.
- 포트 4183/4184/4185/8080/9099/9199 및 검수 temp 잔류 0. 구현 HEAD `a28e27a`는 origin과 0/0이다.
- 상태 **DONE / CODEX_PASSED**. 다음 단위는 자동 시작하지 않고 `WAITING_FOR_NEXT_MANUAL_TASK`에서 멈춘다.

## 스펙 062 V1 방향·transform 재현 차단 완료 (2026-08-20)

- Founder FF-1=A~FF-5=A 승인. evidence 없는 V1 exact replay, heuristic transform과 same-token migration은 0이다.
- pure classifier가 malformed/unsupported/orientation-unconfirmed를 분리하고 frame plan이 proof owner·Image·
  Canvas plan 전에 fail-closed한다. 구현 `a09278a`.
- targeted 59/59, 전체 non-network check PASS(unit 1612/1612), production build PASS.
- browser/E2E 실행·수정은 FF-5 범위 밖이라 0이다. 스펙 061 V1 Canvas 성공 기대는 현재 정책과 양립하지
  않으며 다음 Claude UI/UX 인계에서 안전 오류 기대값으로 바꿔야 한다.
- 고객 entry `index-Df973d19.js` 320,713 bytes, SHA-256
  `4389D6D60367314FF80FC0793E1085C6646DAD946FA23CA2A3911013331A2453`.
- 다음은 V2 issuer/partial-replay 안내/orientation 표시의 UI/UX 단계다. Codex는 구현하지 않고 Claude 인계를
  기다린다. 실제 V2 schema/fingerprint, Firebase/network/운영 scene/pixel parity/deploy는 NOT TESTED다.

## 스펙 062 V1 방향·transform 재현 조사 (2026-08-19)

- V1 scene은 `frameImgT`만 저장하고 portrait/landscape, capture canvas/zone/image basis와 catalog revision을
  저장하지 않는다.
- legacy x/y는 absolute logical px, current x/y는 current maxPan 기준 normalized 값이다.
- `rot=0`은 portrait와 unrotated landscape를 구분하지 못해 현재 identity 성공도 exact frame replay를
  증명하지 않는다.
- 권장 FF-1=A~FF-5=A: V1 exact replay fail-closed, heuristic 0, future version 분리, migration 0,
  첫 correction은 pure classifier/plan gate/unit만.
- 제품 코드/UI/CSS/test/Rules/config/package/lockfile와 실제 network/data/deploy 변경 0.
- 상태 `FOUNDER_DECISION_REQUIRED`. V2 발급·표시는 UI/UX 단계이므로 이후 Claude 인계 대상이다.

## 스펙 061 production frame route 연결 완료 (2026-08-19)

- Founder EE-1=A~EE-5=A에 따라 production ready seam에 `SpacePostAuthFrameView`와
  `publicCatalogReader`를 연결하고 controller factory 하나만 합성 seam으로 추가했다.
- production root/default reader/browser Image owner를 쓰는 fixture에서 모든 HTTPS를 intercept·차단했다.
  pre-auth 요청 0, ready Canvas 1, invalid catalog fail-closed와 unmount 뒤 late proof 차단을 검증했다.
- 자체 검수에서 동작하지 않은 문자열 glob catch-all을 정규식으로 교정했다. 구현 `cf13a2a`.
- 전체 check PASS(unit 1609/1609), Chromium 148/148, 고객 entry 322,548 bytes,
  SHA-256 `E70626F22B181C3BC5DBCE4F5B6B644E3AC026B814ECFAE3AC8D1738D9384334`.
- 실제 Firebase/network/CORS/운영 object, 실제 모바일·폰트 시각 정확도와 deploy/cutover는 NOT TESTED/금지다.
- 상태 `WAITING_FOR_NEXT_MANUAL_TASK`; 다음 단위 자동 시작 0.

## 스펙 060 post-auth frame view 조사 (2026-08-19)

- ready-only catalog child, source-bound StrictMode owner, measured width/conditional font gate가 필요하다.
- 상태를 catalog→asset→owner→width→font→plan→Canvas 순으로 단일 fail-closed derivation한다.
- 권장 DD-1=A~DD-5=A. 첫 구현은 injectable view/browser fixture만, production App/network 0.

## 스펙 060 post-auth frame view 완료 (2026-08-19)

- Founder DD-1=A~DD-5=A 승인. ready-only scene seam과 injectable post-auth frame view를 구현했다.
- source-bound owner, measured width, conditional exact-font, current plan-only Canvas를 fail-closed로 묶었다.
- 자체 검수에서 StrictMode initializer owner 누수를 발견해 inert initializer + effect-owned controller로 보완했다.
- `pnpm check` unit 1608/1608, development-React Chromium 145/145 PASS. 구현 `6670fb3`, 보완 `98f4430`.
- production App 연결/실제 Firebase·network·CORS·폰트·운영 object/deploy는 NOT TESTED/금지다.

## 스펙 059 post-auth view composition 조사 (2026-08-19)

- space 인증 뒤 catalog가 없고 readiness adapter에 넣을 source를 단일 결정하는 projector도 없다.
- post-auth catalog, measured width, exact font gate, plan-ready Canvas가 목표 경계다.
- 권장 CC-1=A~CC-5=A. 첫 구현은 pure frame asset request projector/unit만, network/React/UI 0.

## 스펙 059 frame asset request projector 완료 (2026-08-19)

- Founder CC-1=A~CC-5=A 승인. 첫 구현 범위만 수행했다.
- exact catalog snapshot/reference/proof trust/placement/image trust를 all-or-nothing pure projector로 고정했다.
- targeted 11/11, 전체 check unit 1602/1602, Chromium 143/143 PASS. 고객 entry/hash 동일.
- 구현 `3c5b3ed`. 실제 catalog network/React/layout/font/Image/Canvas/UI/deploy는 미구현.

## 스펙 058 source-bound readiness adapter 조사 (2026-08-19)

- owner snapshot만으로 source identity를 증명할 수 없어 독점 owner adapter가 필요하다.
- exact source + ready snapshot + binding 존재를 모두 요구하고 source-first replacement/clear/dispose로 닫는다.
- 권장 BB-1=A~BB-5=A. 첫 구현은 framework-free adapter/fake unit만, React/App/UI/network 0.

## 스펙 058 source-bound readiness adapter 완료 (2026-08-19)

- Founder BB-1=A~BB-5=A에 따라 owner-exclusive framework-free adapter를 구현했다.
- exact source + current ready + owner-specific ref + live binding을 요구하고 same-ref late result도 막는다.
- targeted 8/8, 전체 check unit 1591/1591, Chromium 143/143 PASS. 고객 entry/hash 동일.
- 구현 `f30bc8a`. 실제 Image/network/CORS/React/catalog/layout/font/Canvas/UI/deploy는 미구현.

## 스펙 057 view-only frame plan composition 조사 (2026-08-19)

- 기존 scene refs, neutral transform, proof owner, frame geometry와 product plan을 순수 합성할 수 있다.
- logical width와 text measure는 주입해야 하며 template art는 none 또는 externally ready stretch만 가능하다.
- clock는 plan 밖이므로 첫 단위는 `clockOn === false`만 허용하고 성공도 `replayComplete:false`다.
- 권장 AA-1=A~AA-5=A. 결정 전 구현 0, 실제 network/Image/font/Canvas/React/UI/deploy 0.

## 스펙 057 view-only frame plan composition 완료 (2026-08-19)

- Founder AA-1=A~AA-6=A에 따라 pure composer와 source-bound resolver fake unit을 구현했다.
- proof URL trust, neutral transform, exact source readiness, geometry/art/clock/layout/text를 whole-plan
  fail-closed로 합성한다. 성공도 `replayComplete:false`다.
- targeted 18/18, 전체 check unit 1583/1583, Chromium 143/143 PASS. 고객 entry/hash 동일.
- 구현 `ad0a647`. 실제 owner adapter/network/Image/font/Canvas/React/UI/clock/room/gallery/deploy는 미구현.

## 스펙 054 space scene application 경계 조사 (2026-08-19)

- scene은 frame-only이고 tpl/size/color는 catalog와 아직 대조되지 않았다.
- legacy imgT x/y는 Canvas px, 현재는 normalized maxPan 비율이며 capture 크기가 없어 정확 변환은
  UNCONFIRMED다. room/gallery renderer도 없다.
- 권장 S-1=A V1 순수 참조 검증기, S-2=A 필수 exact 참조, S-3=A exact ID/fill solid만,
  S-4=A transform 미적용, S-5=A room/gallery unsupported.
- 조사 문서만 변경. 실제 network/image/UI/renderer/room 구현 0.

## 스펙 054 V1 scene reference validator 완료 (2026-08-19)

- Founder S-1=A/S-2=A/S-3=A/S-4=A/S-5=A에 따라 local-only 순수 validator를 구현했다.
- exact template/visible size/compatibility, exact ID/fill 단일 solid color, HTTPS photo 후보를 검증하고
  transform/room은 적용하지 않으며 replay 완료를 주장하지 않는다.
- targeted 19/19, 전체 check unit 1514/1514, Chromium 143/143 PASS.
- 고객 entry/hash 동일. 구현 `62aa9d8`.
- 실제 Firebase/network/image/proof trust/UI/renderer/room/deploy는 NOT TESTED/금지. 다음 자동 시작 0.

## 스펙 055 proof image·view-only plan 경계 조사 (2026-08-19)

- 기존 trust는 proof prefix/query 전용이 아니고 plan은 URL이 아닌 loaded drawable ref/intrinsic size를
  요구한다. neutral 외 legacy transform 변환은 계속 UNCONFIRMED다.
- 권장 T-1=A exact proof prefix, T-2=A constrained media query, T-3=A neutral-only,
  T-4=A V2-A pure unit만, T-5=A 별도 view-only composition.
- 조사 문서만 변경. 실제 network/image/UI/renderer/Rules/config 0.

## 스펙 055 V2-A proof URL·transform 경계 완료 (2026-08-19)

- Founder T-1=A~T-5=A에 따라 exact proof REST URL과 neutral transform eligibility를 pure local로 구현했다.
- targeted 38/38, 전체 check unit 1552/1552, Chromium 143/143 PASS. 고객 entry/hash 동일.
- 구현 `82d89ce`. 실제 Firebase/network/image/CORS/owner/plan/UI/renderer/deploy는 NOT TESTED/미구현.
- 다음 후보 V2-B 조사는 자동 시작하지 않는다.

## 스펙 056 remote proof image owner 경계 조사 (2026-08-19)

- plan에는 URL이 아닌 decoded binding/intrinsic size가 필요하고 기존 template-art owner는 proof trust를
  재검증하지 않는다.
- 권장 V-1=A dedicated owner, V-2=A 내부 trust, V-3=A CORS/one assignment/no retry,
  V-4=A one-active generation, V-5=A controller/fake unit만.
- 조사 문서만 변경. 실제 network/Image/UI/plan/Rules/config 0.

## 스펙 056 proof image owner 완료 (2026-08-19)

- Founder V-1=A~V-5=A에 따라 dedicated local owner와 injected fake unit을 구현했다.
- 내부 trust, CORS-before-src, one-active generation, safe intrinsic/binding, late result 차단을 고정했다.
- targeted 13/13, 전체 check unit 1565/1565, Chromium 143/143 PASS. 고객 entry/hash 동일.
- 구현 `8d93f98`. 실제 network/Image/CORS/hook/plan/UI/deploy는 NOT TESTED/미구현.

## 스펙 053 production space composition 완료 (2026-08-19)

- Founder R-1=A/R-2=A/R-3=A/R-4=A에 따라 space 독점 mode, exact-true complete config,
  submit lazy named facade, password UI와 StrictMode lifecycle을 구현했다.
- no-space만 기존 browse를 mount하고 invalid/disabled config는 Firebase init/request 0으로 fail-closed한다.
- scene은 검증된 ready snapshot까지만 도달하며 preview/image/room 적용은 0이다.
- targeted 32/32, 전체 check unit 1495/1495, Chromium 143/143 PASS.
- 고객 entry `index-Det4NToI.js` 304,634 bytes, SHA-256
  `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`.
- 구현 커밋 `5e4be63`. 실제 Firebase/network/config/deploy/scene 적용은 NOT TESTED/금지.

## 스펙 053 production space composition 조사 (2026-08-19)

- 현재 App은 query 분기 없이 catalog를 즉시 load하며, space controller의 React UI/env/lazy factory는 없다.
- decrypt scene의 ID/URL/opaque room 설정은 catalog/CORS/renderer와 아직 대조되지 않았다.
- 권장 R-1=A space 독점 모드, R-2=A explicit-submit lazy Firebase, R-3=A gate-only 첫 UI,
  R-4=A 후속 catalog 검증 + view-only scene application 계약.
- 조사 문서만 변경. 실제 Firebase/network/config/scene 적용/제품 구현 0.

## 스펙 052 space link/open controller 완료 (2026-08-19)

- `?space=` query를 순수 파싱하고 injected Firestore reader + spaces open port를 합성하는 local-only
  controller를 구현했다. 비밀번호 오류 때 암호문만 메모리에 보존하며 명시 재시도는 재조회하지 않는다.
- duplicate submit, detach/late result, network retry, outcome별 safe error와 raw token/password 비노출을 고정했다.
- targeted 17/17, 직접 `node scripts/check.mjs` unit 1479/1479, Chromium 141/141 PASS,
  고객 hash 동일, 포트/temp/debug 잔류 0. 구현 커밋 `49f51fb`.
- `pnpm check` wrapper는 PATH의 pnpm 11.19가 dependency-status install을 시도해 직접 check entrypoint로
  검증했다. Corepack 고정 pnpm 11.15.1의 frozen install은 기존 build script 미승인으로 exit 1이었으나
  resolved/reused 161, downloaded 0으로 node_modules를 복구했다. build 승인·설정 변경은 하지 않았다.
- 실제 Firebase/project/token/document/network/route UI/scene application/deploy는 NOT TESTED.
  다음 자동 시작 0.

## 스펙 051 space Firestore read adapter 완료 (2026-08-19)

- Founder Q-1=A/Q-2=A/Q-3=A 승인에 따라 `@denn/firebase/space-read` local adapter를 구현했다.
- 공식 document-ID validator, `getDoc`, named app 재사용/config fail-closed, Auth 0을 unit으로 고정했다.
- targeted 30/30, `pnpm check` unit 1462/1462, Chromium 141/141 PASS, 고객 hash 동일,
  포트/temp 잔류 0. 구현 커밋 `eb7bb2b`.
- 실제 Firebase/project/token/document/network/route/UI는 NOT TESTED. 다음 자동 시작 0.

## 스펙 051 space Firestore read adapter 조사 (2026-08-19)

- 실제 Firebase/network 없이 현재 Rules, legacy, SDK 12.17.1 타입과 Firebase 공식 문서를 조사했다.
- read adapter는 가능하지만 custom token 호환, cache source, named app 소유가 제품 계약 결정이다.
- 권장 Q-1=A/Q-2=A/Q-3=A. 결정 전 코드/package/Rules/config 변경 0.
- 조사 커밋 `cb97129`. 실제 project/token/document/emulator/deploy는 NOT TESTED/금지.

## 스펙 050 space local read pipeline 완료 (2026-08-19)

- document → password → decrypt → scene 검증 순서의 local-only 순수 open port를 구현했다.
- 단계별 실패 후 후속 호출 0, safe error, 실제 Web Crypto local roundtrip을 검증했다.
- targeted 54/54, `pnpm check` unit 1432/1432, Chromium 141/141 PASS, 고객 hash 동일,
  포트/temp/debug 잔류 0. 구현 커밋 `cee79c8`.
- 실제 Firebase/Firestore/token/link/network/route/UI는 NOT TESTED. 다음 자동 시작 0.

## 스펙 049 space document·scene read 완료 (2026-08-19)

- `space-v1` document와 `space-scene-v1` plaintext를 known-field detached snapshot으로 투영하는
  local-only 순수 reader를 구현했다.
- malformed/hostile/circular/BigInt와 known bad type은 raw 값 없이 안전 실패하며 unknown 추가 키는 무시한다.
- targeted 44/44, `pnpm check` unit 1422/1422, Chromium 141/141 PASS, 고객 hash 동일,
  포트/temp 잔류 0. 구현 커밋 `3111837`.
- 실제 Firestore/token/link/network/scene UI는 NOT TESTED. 다음 자동 시작 0.

## 스펙 048 legacy space crypto envelope 완료 (2026-08-18)

- 운영 전환은 Founder 지시로 보류했다. 실제 UID/운영 한도/deploy는 계속 차단한다.
- `@denn/spaces`에 legacy PBKDF2 120000/SHA-256 → AES-GCM-256, 16-byte salt, 12-byte IV,
  standard base64 `{salt,iv,ct}` 순수 port를 구현했다.
- targeted 20/20, `pnpm check` unit 1396/1396, Chromium 141/141 PASS, 고객 hash 동일,
  포트/temp 잔류 0. 구현 커밋 `283807a`.
- 실제 Firestore/기존 token/link/scene 적용은 NOT TESTED. 다음 자동 시작 0.

## 스펙 047 transitional Rules 로컬 게이트 완료 (2026-08-18)

- Founder L-1 canary 한정값, L-2=A, L-3=A 승인.
- 별도 synthetic transitional Rules·demo-only emulator config·fail-closed manifest validator 구현.
- manifest 12/12, cutover emulator 4/4, `pnpm check` unit 1378/1378, Chromium 141/141 PASS,
  고객 hash 동일, 포트/temp 잔류 0. 구현 커밋 `b8f1ac4`.
- 실제 운영 Rules/config·UID·Firebase/deploy/write/legacy close는 0.
- 다음에는 일반 운영 비용·용량 상한/관찰 주체와 실제 UID 정본이 필요하다.

## 스펙 046 단계적 cutover 계약 · Founder 결정 대기 (2026-08-18)

- Founder K-1=A/K-3=A를 정본에 기록했고 스펙 044는 K-1/K-2/K-3 모두 A로 종료했다.
- 목표 순서: Firestore transitional → Storage transitional → write-disabled app → 제한 canary → legacy close.
- actual-write 전/후 rollback을 분리했고 이후 legacy fallback/write-back은 금지했다.
- 실제 UID·비용 상한·관찰 주체가 없어 P1/P4는 차단 상태다.
- 다음 결정은 L-1 비용·관찰, L-2 dual-window 접근, L-3 canary/close 기준이다.
- 제품 코드·Rules/config/test/package/lockfile 변경 및 실제 Firebase/deploy/write 0.

## 스펙 045 완료 · deploy-safe Hosting layout 로컬 패키징 (2026-08-18)

- Founder K-2=A 방향으로 OS temp allowlist staging과 로컬 route 검증을 구현했다.
- 실제 `firebase.json`·Rules·package/lockfile·제품 앱 코드는 변경하지 않았고 Firebase CLI/deploy는 0이다.
- targeted 18/18, `pnpm check` PASS(unit 1366/1366), Chromium 141/141, 고객 hash 동일,
  diff-check·포트/temp PASS. 구현 커밋 `c896fbe`.
- K-1 비용·용량 상한과 K-3 actual cutover 전략은 미결정이다. 상태는 Founder 결정 대기다.

## 스펙 044 cutover 준비도 조사 · Founder 결정 대기 (2026-08-18)

- 스펙 043 종료 후 사용자의 다음 단위 착수 지시에 따라 문서 전용 조사를 진행했다.
- 운영 write NOT READY: 실제 UID 없음, G-4 비용 상한 미결정, deploy-safe Hosting/admin route 없음,
  최종 Rules 선행 시 legacy 무저장 구간, actual-write 이후 단순 Hosting rollback 불충분.
- 권장: K-1=A 비용/용량 상한 전 차단 유지, K-2=A local-only Hosting 패키징 스펙 045,
  K-3=A transitional Rules 방향.
- 제품 코드·Rules/config/test/package/lockfile 변경 0. 실제 Firebase/network/deploy/운영 쓰기 0.

## 스펙 043 완료 · gated admin write composition (2026-08-18)

- Founder Y-2=A/Y-3=A/Y-4=A/Y-5=A 승인.
- 단일 composition/auth 권위, auth-only production mode, 별도 exact-true write gate, 명시 baseline load
  시 lazy write port 생성을 구현했다.
- 독립 보강으로 합성 Chromium fixture도 production composition root를 통과하게 해 factory가 load 전 0,
  load 후 1임을 검증했다.
- targeted 52/52, `pnpm check` PASS(unit 1363/1363), Chromium 139/139, 고객 JS hash 동일,
  diff-check·포트/temp PASS.
- 구현 커밋 `41e86e1`. 운영 write flag는 설정하지 않았고 실제 Firebase/emulator/UID/IAM/Rules 배포/
  운영 쓰기·발행·delete는 NOT TESTED/금지 유지다.

## 스펙 043 composition 사전 조사 · Founder 결정 대기 (2026-08-18)

- Y-1=A에 따라 문서 전용으로 production 연결 전 composition 경계를 조사했다.
- 현재 read env factory는 auth/read port를 내부에 감춰 write session과 같은 auth instance를 공유할
  composition API가 없다. legacy-only load와 C5 baseline load도 의미가 다르다.
- 권장 결정: Y-2=A 단일 composition/auth 권위, Y-3=A production auth-only card,
  Y-4=A 별도 write enable gate, Y-5=A 명시 load 시 rejection-safe lazy write 생성.
- 제품 코드·Rules/config/test/package/lockfile 변경 0. 실제 Firebase/network/emulator/배포/운영 쓰기 0.
- Founder 결정 전 `App.tsx` 연결과 구현을 시작하지 않는다.

## 스펙 042 완료 · 로컬 브라우저 fixture (2026-08-18)

- Founder X-1=A/X-2=A/X-3=A 범위의 합성 auth/write fixture를 별도 Vite entry로 구현했다.
- 실제 session controller/editor를 사용하되 `App.tsx`, production composition, Firebase facade/network는 0이다.
- 명시적 load, 선택·prefill, invalid, exact-base save, conflict/outcome-unknown, discard reload를 검증했다.
- `pnpm check` PASS(unit 1356/1356), Chromium 139/139(신규 5), 고객 JS hash 동일,
  `git diff --check` PASS, 포트/temp 잔류 0.
- 구현 커밋 `d0fb7c3`. 실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/UI 연결/delete/발행은
  NOT TESTED/금지 유지. 다음 수동 작업을 기다린다.

## 스펙 041 완료 · W-1 F-D 보완 (2026-08-18)

- Founder V-1=A/V-2=A/V-3=A 승인 후 순수 immutable edit + 격리 React editor를 구현했다.
- `App.tsx` 연결, 실제 adapter/Firebase/network/emulator/Rules/config 변경 0.
- targeted 25/25, shared/admin typecheck PASS.
- 기존 baseline이 legacy 정규화 provenance를 버리고 save가 검증 document를 직렬화해 F-D 위반
  가능성을 확인했다. 전체 check/E2E/hash 전 안전 STOP.
- Founder W-1=A 승인. same-port exact loaded revision을 save 전제조건으로 강제하고 provenance 기반으로
  read-time 승격 canonical만 payload에서 제거했다. legacy field 추가·변경·삭제 및 직접 편집은 차단한다.
- 독립 보완: invalid partial 초안이 clean으로 보이던 dirty 판정을 수정했다.
- targeted 74/74, `pnpm check` PASS(unit 1356/1356), Chromium 134/134, 고객 hash 동일.
- 구현 커밋 `27e6ff4`. 스펙 041은 로컬 격리 범위에서 DONE / CODEX_PASSED다.


## 스펙 040 후보 계약 조사 (2026-08-14)

- 현재 read controller는 catalog/revision을 버리고, print-size draft는 특정 항목에 연결되지 않아
  저장 버튼을 바로 붙일 수 없다.
- 전체 baseline과 exact revision을 보존하는 write-session 경계를 먼저 제안했다.
- 상태: 문서 전용, 제품 코드·Rules·config·test 변경 0.
- 다음: Founder U-1~U-3 결정. 권장값은 모두 A.

### Founder 승인 및 구현

U-1=A/U-2=A/U-3=A 승인. framework-free write-session controller + unit만 구현했다.
UI/App wiring/write adapter 생성 0. targeted 9/9, 전체 unit 1331/1331, Chromium 134/134 PASS.
다음은 Codex 독립 검수다.

### Codex 최종 판정

CORRECTION_REQUIRED 2건(동일 auth 재통지 초기화, hostile input rejection)을 보완했다.
targeted 11/11, 전체 unit 1333/1333 PASS, 추가 결함 0. **CODEX_PASSED**.
다음 작업은 자동 시작하지 않는다.

## ★ Founder D-1=A · D-2=O-3 · D-3=N 구현 결과 (2026-08-14)

- **채택**: REC 선행 commit 구조 A. head는 `recId`, REC은 `/rebuildAdminStateObjects/{UUID.json}`의
  write-once `{claimedBase}`다.
- **계속 금지**: 실제 삭제, delete 권한, 자동 정리, 보존 스케줄, IAM 활성화, 실제 UID, 배포, UI.
- **로컬 검증**: targeted unit **51/51**, Firebase typecheck PASS, `pnpm check` PASS
  (unit **1322/1322**), Chromium E2E **134/134**, demo emulator Rules **13/13**.
- **Git**: 구현·종료 커밋 `7843e85`을 일반 fast-forward push했다. 다음 구현은 자동 시작하지 않는다.

### Codex 최종 판정

**CODEX_PASSED**, 발견 결함 0. 스펙 039는 로컬 범위에서 DONE이다. 실제 Firebase·UID·IAM·배포·
UI·delete·자동 정리는 NOT TESTED/금지 유지. 다음 스펙을 자동 시작하지 않고 수동 지시를 기다린다.

## ★ G-4 문서 검수 통과 + 오늘 세션 종료 — DOCUMENT_REVIEW_PASSED (2026-08-11)

Codex가 **G-4 보완 라운드 2 문서를 검수해 통과**시켰다.
**`getAfter()` 원자성 정정 · transaction 시간 제한 정정 · REC ID 매핑 정정**이 모두 반영됐음을 확인했다.

### Codex 최종 판정

- **G-4 보완 라운드 2 문서 검수 통과** — 세 정정이 반영됐다.
- **구조 A와 B는 모두 "가능한 후보"로만 기록됐고 어느 것도 채택되지 않았다.**
- **구조 A/B 및 REC·Rules 동작은 NOT TESTED다.**
- **실제 삭제 · 자동 정리 · Rules 변경 · head 스키마 변경 · 클라이언트 delete 권한 ·
  IAM 활성화 · 구현·배포 승인이 아니다.**
- **현재 기본 정책은 계속 `O-3 삭제 보류`다.**
- **다음 단계는 Founder의 D-1~D-3 결정이며 오늘은 결정하지 않는다.**

### 상태

`state: FOUNDER_DECISION_REQUIRED` · `active_unit: g4-orphan-retention-policy` ·
`completed_unit: spec-037-admin-write-c5-emulator`(**DONE / CODEX_PASSED 유지**) ·
`next_transition: FOUNDER_G4_D1_D3_DECISION` · G-4 문서 검수 결과 **`DOCUMENT_REVIEW_PASSED`**.
**오늘 세션은 여기서 종료하며 다음 작업은 자동으로 시작하지 않는다.**

### ⚠️ 문서는 여전히 미커밋이다

G-4 문서 **6개**는 지시에 따라 **`commit`·`push`·`stage` 하지 않았다**
(`working_tree` 참조). 커밋 여부는 Founder/Codex의 별도 지시를 따른다.

### 남은 Founder 결정 — **선택하지 않았다**

**D-1** 완료 판정 방식과 구조(SDC′+구조 A / SDC′+구조 B / 시간 창 / 혼합) ·
**D-2** 정리 주체(없음 O-3 / 운영자 수동 O-1 / backend O-2 = G-3 재개 / Storage Rules 서버 강제 O-4) ·
**D-3** 보존 개수·주기(직전 K개 · 주기 · 비용 상한).
**선택지는 그대로 보존한다.**

> 아래 라운드 2·1·초판 기록은 **삭제하지 않는다.**

## G-4 문서 보완 라운드 2 — CORRECTION_REQUIRED · 문서 전용 · 미커밋 (2026-08-11)

정본: `docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`(라운드 2 정정본)
기준 HEAD=origin=`eae9be4`, ahead/behind 0/0. **⚠️ `commit`·`push`·`stage` 하지 않았다.**
**변경 문서 6개.** 제품 코드·`firestore.rules`·`storage.rules`·config·test·`package.json`·lockfile
변경 **0**, 실제 객체 조회·나열·삭제 0, 실제 Firebase/project/bucket/운영 데이터/실제 UID 접근 0,
**emulator 실행 0**, 배포·운영 쓰기·UI 연결·자동 정리 0, 자동화 0.

### Codex 재검수 3건 — **또 두 건이 내 사실 오류였다**

1. **★ `getAfter()`를 누락한 원자성 설명을 정정했다.**
   라운드 1의 **"같은 transaction의 형제 쓰기를 Rules가 볼 수 없다"** ·
   **"REC과 head를 같은 transaction으로 묶을 수 없다"** 는 **틀렸다.**
   공식 문서(`firestore/enterprise/security/rules-conditions`, 2026-08-11 확인):
   *"you can use the `getAfter()` function to access the state of a document **after a transaction or
   batch of writes completes but before the transaction or batch commits**."*
   → **구조 B(원자 동반)가 실제로 가능하다.** 구조 A/B를 8개 항목으로 재비교했다.
   **★ 핵심 역전**: B는 crash 시 REC도 head도 안 남아 **업로드된 객체에 REC이 없고 SDC′로 영원히
   판정 불가**하다. A는 REC이 남아 **실패 산물까지 회수 가능**하고 **Storage create 단계의 stray
   차단**도 된다. 대신 B는 **원자성이 서버 강제**되고 **스펙 037 계약 변경이 더 작다**(업로드 전
   별도 Firestore 쓰기가 없다). **어느 쪽도 채택하지 않았고 둘 다 NOT TESTED다.**
   **★ 접근 한도 두 개를 분리**했다 — **Storage Rules → Firestore는 문서 2개**,
   **Firestore Rules는 single 10 / multi·transaction·batch 20**. 라운드 1은 이를 구분하지 않았다.
2. **★ transaction 시간 제한 서술을 정정했다.**
   라운드 1의 **"공식 문서에 총 deadline이 없다"** 는 **부정확했다.**
   공식 문서(`docs.cloud.google.com/firestore/docs/manage-data/transactions`, 2026-08-11 확인)가
   **lock deadline 20초** · **270초 최대** · **60초 idle expiration** · **유한 재시도** ·
   최대 요청 크기 **10 MiB** · 읽기가 쓰기보다 먼저를 명시한다.
   **★ 그러나 두 가지를 분리했다**: **개별 transaction의 공식 제한은 확정**이고,
   **탭 정지·JS 스케줄링 정지·SDK backoff·Storage 업로드 재시도(10분)를 포함한 `save()` 호출
   전체의 벽시계 상한은 여전히 UNCONFIRMED**다.
   **"공식 제한이 전혀 없다"(틀림)와 "호출 전체의 절대 상한을 증명하지 못했다"(사실)는 다른 진술이다.**
   ⚠️ **이 정정만으로 임의의 시간 기반 삭제를 안전하다고 승인하지 않는다.**
3. **★ REC 문서 ID ↔ Storage `objectId` 매핑을 실행 가능하게 확정했다.**
   라운드 1은 Storage Rules의 `objectId`가 실제로 **`"<uuid>.json"`** 인데 REC을
   **`{operationId}`**(확장자 없음)로 잡아 **같은 문서를 가리키지 못했다.**
   확정: **REC 문서 ID = Storage `objectId` 세그먼트 그대로(`"<uuid>.json"`)** ·
   **Storage Rules는 `objectId`를 변환 없이 직접 보간** ·
   **head는 `objectPath` 대신 `recId`를 담고**(여전히 3키) **head 규칙도 `recId`를 직접 보간** ·
   전체 경로는 **클라이언트가** 상수 접두사와 합성 · `recId`는 **정규식으로만** 검증.
   **⇒ 문자열 파싱·분해·연결을 하나도 쓰지 않는다.**
   **Rules의 문자열 `+` 연결과 `split` 등은 이번 세션에서 지원을 확인하지 못했으므로(UNCONFIRMED)
   설계에 넣지 않았다.**
   ⚠️ 이는 **스펙 037 계약 변경**이다(§4.3·§4.4·§5.6 · `constants.ts` · `head.ts` · `types.ts` ·
   `write-port.ts` · `firestore.rules` · 테스트).

### 유지되는 판정

- **"head 미참조" 단독 = 안전하지 않다**(P2/P3 미구분 → `loadBaseline` fail-closed).
- **"오래됐다" 단독 = 여전히 안전 증명이 아니다** — 개별 transaction 상한은 **존재**하지만
  **`save()` 호출 전체 상한은 UNCONFIRMED**.
- **★ REC이 없는 현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ 삭제 보류가 기본값.**
- **D-1~D-3은 재검수 통과 전까지 Founder에게 묻지 않는다.**

### 다음

**Codex 재검수(라운드 2).** 통과 후에야 Founder에게 D-1~D-3을 묻는다.

> 아래 라운드 1 기록과 초판 기록은 **삭제하지 않는다.**
> ⚠️ **라운드 1의 "형제 쓰기를 볼 수 없다"·"REC과 head를 같은 transaction으로 묶을 수 없다"·
> "공식 총 deadline 없음" 서술은 이 라운드가 폐기했다.**

## G-4 문서 보완 라운드 1 — CORRECTION_REQUIRED · 문서 전용 · 미커밋 (2026-08-11)

정본: `docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`(정정본)
기준 HEAD=origin=`eae9be4`, ahead/behind 0/0.
**⚠️ `commit`·`push`·`stage` 하지 않았다.** Codex **재검수** 대기.
**제품 코드·`firestore.rules`·`storage.rules`·config·test·`package.json`·lockfile 변경 0**,
**실제 객체 조회·나열·삭제 0**, 실제 Firebase/project/bucket/운영 데이터/실제 UID 접근 0,
**emulator 실행 0**, 배포·운영 쓰기·UI 연결·자동 정리 0, 자동화 0.
**변경 문서는 6개다**(아래 목록 · `working_tree` 참조).

### Codex 지적 3건 — 두 건은 내 사실 오류였다

1. **★ "Storage Rules는 Firestore를 읽을 수 없다"는 서술을 폐기했다.**
   공식 문서(`firebase.google.com/docs/storage/security/rules-conditions`, 2026-08-11 확인)가
   **`firestore.get()` / `firestore.exists()`** 를 명시한다 —
   *"your security rules can evaluate incoming requests against documents in Cloud Firestore."*
   **공식 제약 4개도 함께 기록**했다: **기본 Firestore DB만** · **★ 평가당 문서 접근 최대 2개** ·
   **Firestore quota/billing에 포함** · **두 제품 연결 IAM 활성화 필요**(콘솔/CLI 프롬프트,
   role 제거로 비활성화).
   → 그래서 **"강제 주체는 사람 또는 backend뿐"** 이라는 결론도 **폐기**하고
   **O-4(Storage Rules 서버 강제)** 를 신설해 분석했다.
   ⚠️ **클라이언트 delete 권한 승인도 구현 승인도 아니다** — 잔여 위험이 해소되기 전까지 **삭제 금지**.
2. **★★ SDC 증명의 objectPath 재사용 결함을 고쳤다.**
   `firestore.rules:57-60`은 **직전 값과만 다르면 통과**하므로 **A → B → A가 막히지 않는다.**
   초판의 *"head.revision > R이면 되돌아갈 수 없다"* 는 **현재 Rules에서 성립하지 않는다.**
   **★ 더 깊은 문제도 찾았다**: `storage.rules`의 create가 **`resource == null`** 이라
   **삭제하는 순간 그 경로가 다시 생성 가능해진다** — **삭제가 불변성 자체를 깬다.**
   → **재설계(§5)**: `operationId`를 **키로 하는 write-once 소비 기록 REC**
   (`/rebuildAdminStateObjects/{operationId}` = `{claimedBase}`)을 **업로드 전에** 만들고,
   head 규칙이 **`firestore.get(REC).claimedBase == resource.data.revision`** 을 요구한다.
   REC이 write-once라 `claimedBase`가 불변 ⇒ **한 경로는 정확히 한 번의 전이에서만 head가 될 수 있고
   재사용이 구조적으로 불가능**하다.
   **삭제 조건 SDC′** = `head.revision > REC.claimedBase + 1` (+ 승인 UID).
   **Firestore 접근 정확히 2개 = 한도와 동일, 여유 0.**
   **★ 이 하나가 P1 보호·P2 식별·P3 보호·실패 산물 회수를 모두 덮어 시간 창이 필요 없어진다.**
   ~~**원자성**: head 갱신과 REC을 같은 transaction의 다중 문서로 묶을 수 **없다**
   (Rules는 각 쓰기를 독립 평가하고 `get`/`exists`는 커밋된 상태만 본다).~~
   ⚠️ **위 문장은 라운드 2가 폐기했다** — 공식 `getAfter()`로 **묶을 수 있다**(구조 B).
   **순서 강제(구조 A)** 는 여전히 유효한 대안이며 실패 산물 회수 범위가 더 넓다.
   REC만 만들고 head를 못 옮겨도 **무해**(경로만 소각).
   **M-1·M-2 재검토 결과 둘 다 불충분**: M-1은 **직전 1개만** 비교하므로 A→B→A를 못 막고,
   M-2는 키가 `revision`이라 **경로로 역조회가 불가능**하며 접근 한도 2 때문에 이력 순회도 불가능하다.
   ⇒ **objectPath를 키로 한 consumption 기록이 필요하다.**
3. **변경 문서 개수를 5 → 6으로 정정**했다(handoff 포함). `working_tree`와 live log 모두 수정.

### 유지되는 판정

- **"head가 현재 가리키지 않는다" 단독 = 안전하지 않다**(P2/P3 미구분 → `loadBaseline` fail-closed).
- **"오래됐다" 단독 = 증명 불가** — upload는 **10분** 상한이 문서화됐지만
  **commit 늦은 성공에는 상한이 없다**(`maxAttempts` 5는 시도 횟수).
  **시간 창은 리스크 수용이지 증명이 아니다.** 단, **SDC′를 채택하면 시간 창 자체가 불필요**해진다.
- **REC이 없는 현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ 삭제 보류(O-3)가 기본값.**

### 다음

**Codex 재검수 — 수정된 안전성 증명을 먼저 검수받는다.**
그 뒤에 **Founder에게 D-1~D-3을 다시 묻는다.** 그 전에는 구현 계약도 구현도 시작하지 않는다.

> 아래 초판 기록과 스펙 037 이력은 **삭제하지 않는다.**

## G-4 orphan 보존 방향 + 안전 삭제 조건 설계 — 초판 (2026-08-11)

> ⚠️ **이 섹션은 초판 기록이다.** 위 보완 라운드 1이 ① "Storage Rules는 Firestore를 읽을 수 없다"
> ② SDC의 objectPath 재사용 증명 ③ 변경 문서 5개 표기를 **정정했다.** 원문은 이력으로 보존한다.



정본: **`docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`**(신규)
기준 HEAD=origin=`eae9be4`, ahead/behind 0/0.
**⚠️ 이 라운드의 문서는 지시에 따라 `commit`·`push`·`stage`하지 않았다.** Codex 검수 대기 상태다.
**제품 코드·Rules·config·test·`package.json`·lockfile 변경 0**, **실제 객체 조회·나열·삭제 0**,
실제 Firebase/network/live/운영 데이터/실제 UID 접근 0, 배포·운영 쓰기·UI 연결·발행·
자동 정리·C6·L-4 구현 **0**, 자동화 생성 0.

### Founder 방향 (기록된 그대로)

**과거 정상 저장본을 영구 버전 이력으로 보존할 필요는 없다** · **안전하게 식별할 수 있을 때
삭제 후보로 본다** · **현재 사용 중이거나 저장 성공 여부가 미확정인 객체를 삭제해도 된다는 뜻은 아니다** ·
**이번 지시는 실제 삭제·자동 정리 구현·Rules 변경·백엔드 구현·배포 승인이 아니다.**
→ 확정된 것은 **"과거 정상 저장본에 영구 보존 요구가 없다"** 하나뿐이고,
삭제 여부·시점·주체·주기는 **D-1~D-3으로 남았다**.

### ★★ 핵심 발견 — 지금은 세 집단을 구분할 수 없다

**P1 현재 사용 중**(`X === head.objectPath`, 구분 가능) ·
**P2 과거 정상 저장본** · **P3 미확정/늦게 성공 가능** — **P2와 P3이 Storage에서 똑같이 생겼다.**
가르는 정보는 **"이 객체가 한 번이라도 head였는가"** 인데 **어디에도 없다**:
head는 **정확히 3키**(`constants.ts:33` · `head.ts:74-77` · `firestore.rules`의 `hasOnly`+`hasAll`)이고,
구현에는 **나열도 삭제도 없다**(`facade.ts`에 `list`/`delete` 부재, `index.ts:7`이 명시).
`storage.rules`는 `allow update: if false` · `allow delete: if false`.
**P2는 실패가 아니라 성공의 부산물**이다 — update가 `objectPath` 교체를 강제하므로
**저장이 성공할 때마다 직전 객체가 참조에서 떨어진다.**

### 안전 삭제 조건 (SDC) — 4조건 AND

**SDC-1** `X !== head.objectPath`(필요조건일 뿐) · **SDC-2** *"revision R에서 head였다"* 는
**durable 기록** · **SDC-3** `현재 head.revision > R` · **SDC-4** 판정 순서.
**증명 논리**: X가 R의 head였다면 그 commit은 **이미 성공**했으므로 P3이 아니고, CAS는
`head.revision === expectedBase`를 요구하는데 revision은 **정확히 +1로 단조 증가**하므로
**head는 X로 되돌아갈 수 없다**. → **SDC-2만 오늘 존재하지 않는다.**

### 검증 결과

- **"head가 현재 가리키지 않는다" 단독 = 안전하지 않다.** SDC-1뿐이라 **P2와 P3을 구분하지 못한다.**
  P3을 지우면 늦게 성공한 transaction의 경로가 비고 `loadBaseline`이 **fail-closed**되어
  **운영자가 상태를 아예 못 읽는다**(legacy fallback 없음 — 의도된 설계).
- **"오래됐다" 단독 = 저장소 근거로 증명 불가.** upload는 **10분** 재시도 상한이 문서화돼 있지만
  (`@firebase/storage` `index.esm.js:37`·`:43`), **commit의 늦은 성공에는 상한이 없다** —
  `maxAttempts` 기본 5는 **시도 횟수**이지 벽시계가 아니다(`@firebase/firestore` `index.d.ts:3083`).
  **⇒ 시간 창을 쓰면 그건 안전 증명이 아니라 Founder가 감수하는 리스크 수용이다.**

### 필요한 최소 구조

**M-1** head에 **직전 objectPath**를 함께 기록(4번째 키) → 한 번에 하나의 P2 증명.
Rules `hasOnly`/`hasAll` + `HEAD_ALLOWED_KEYS` + `validateHead` + compute + 테스트 변경.
**M-2** **같은 transaction 안에서** append-only 이력 문서를 함께 기록 → 완전한 체인.
**둘 다 Firestore라 하나의 transaction이 다중 문서를 원자적으로 갱신**하므로 끊긴 체인이 없다
(**cross-service 원자성이 아니다**). **M-3** 객체 `customMetadata` = **불충분**(업로드 시점엔
commit 결과를 모른다).

### ~~★★ 결정적 제약~~ — **폐기됨 (보완 라운드 1 교정 1)**

> ⚠️ **아래 문단은 틀렸고 폐기됐다.** Storage Rules는 **`firestore.get()`/`firestore.exists()`로
> 기본 Firestore DB를 읽을 수 있다**(공식 문서). 따라서 결론도 폐기되고 **O-4(Storage Rules 서버
> 강제)** 가 존재한다. 원문은 이력으로만 남긴다.

~~**Storage Rules는 Firestore를 읽을 수 없으므로 SDC를 강제할 수 없다.**
클라이언트에 delete를 주면 서버가 "정말 밀려났는가"를 **검증할 수단이 없고** SDC가
**클라이언트 선의에만** 의존한다 — fail-closed 원칙과 어긋난다.
**⇒ SDC를 실제로 강제할 수 있는 주체는 (i) 사람이 판단하는 out-of-band 삭제, 또는
(ii) Firestore와 Storage를 모두 읽는 backend뿐이다.**~~

### 선택지

**O-1 운영자 수동**(Rules 변경 0, 그러나 사람이 P3을 오인하면 서버가 안 막아 준다) ·
**O-2 backend/Admin SDK**(**G-3 재개** · `functions/**` 신설 · SDC를 강제할 수 있는 유일한 자동 경로지만
**규칙이 틀리면 자동으로 손해**) · **O-3 보류**(위험 0, 비용 단조 증가, **현재 상태**).

### 남은 Founder 결정 — 3개

**D-1 완료 판정 방식**(SDC 증명 / 시간 창=리스크 수용 / 혼합) ·
**D-2 정리 주체**(없음 / 운영자 수동 / backend=G-3 재개) ·
**D-3 보존 개수·주기**(직전 K개 · 주기 · 비용 상한).

### UNCONFIRMED / NOT TESTED

실제 `admin/state.json` 크기·내용(**NOT TESTED**) · 리빌드 payload 크기(**UNCONFIRMED**;
참고로 레거시 `published/state.json`은 base64 내장으로 **492KB**였다 `denn-admin.html:14905-14906`) ·
**저장 빈도 미결정**(⚠️ 레거시는 **3초 디바운스**였고 저장마다 객체가 생기는 구조에서 이 값이 객체 수를
지배한다) · bucket 객체 수·용량·location·class·lifecycle(**NOT TESTED/UNCONFIRMED**, 저장소 밖) ·
GCS 요금(**UNCONFIRMED**) · **늦은 commit의 실제 지연 상한**(**UNCONFIRMED**) ·
**Storage prefix 나열이 현재 Rules에서 허용되는지**(**UNCONFIRMED** — emulator로 확인 가능하나 미실행).

### 다음

**Codex 검수** → 그 뒤 **Founder가 D-1~D-3 응답**. 그 전에는 **구현 계약도 구현도 시작하지 않는다.**

> 아래 스펙 037 종료 기록과 그 이하 이력은 **삭제하지 않는다.**

## ★★ 스펙 037 종료 — DONE / CODEX_PASSED (2026-08-11)

Codex가 보완 코드 **`ead06ab`** 와 기록 **`91a7813`** 을 독립 재검증해 **`CODEX_PASSED`** 로 판정했다.
**기능 코드·Rules·config·test·lockfile은 추가 수정 0**이고 종료 문서만 별도 fast-forward 커밋으로 처리했다.

### Codex 독립 검증 결과

| 항목 | 결과 |
| --- | --- |
| HEAD=origin | `91a7813`, ahead/behind **0/0** |
| 변경 범위 | **허용 4파일뿐** — `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` · 신규 `sdk-facade.test.ts` |
| `pnpm install --offline --frozen-lockfile` | **PASS**, **lockfile diff 0** |
| format / lint / typecheck / unit / build | **PASS** |
| unit | **1318/1318** |
| Chromium E2E | **134/134** |
| **고객 번들 SHA-256** | **`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`** |
| **local `demo-denn-emulator` Rules 게이트** | **10/10 PASS** |
| ports 4183/4184/8080/9099/9199 | 잔류 **0** |
| `git diff --check` | **PASS** |
| 추가 결함 | **없음** |

### 종료된 것 — 로컬 비-UI 구현·검증까지

`@denn/firebase/admin-write` port(**불변 객체 생성 + 단일 Firestore head CAS + 결과 불명 시
bounded reconciliation**) · **두 오류 표면**(`save`는 8개 `WRITE_*`, `loadBaseline`은 스펙 036
read 오류 + `REBUILD_BASELINE_INVALID`) · `storage.rules`/`firestore.rules` **목표 상태**
(placeholder UID) · emulator 전용 config와 Rules 사본 · opt-in fake/emulator 검증.

### ★ 여전히 NOT TESTED이자 금지

- **실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network** — 접근 **0**, **NOT TESTED**.
- **실제 운영자 UID** — **UNCONFIRMED**. 배포 대상 Rules에 **placeholder가 남아 현 상태로 배포 불가**.
- **Rules · Hosting 배포** — **금지**. ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
  **배포 순서 자체가 STOP 대상**이다. cutover는 **별도 스펙 + 별도 Founder 승인**.
- **운영 쓰기 활성화** — **금지**. 전제(실제 UID + orphan 보존/비용/정리 정책 + emulator PASS) 중
  **emulator PASS 하나만 충족**됐다.
- **`apps/**`와 모든 UI 연결 · 저장 버튼** · **발행** · **legacy 공유 쓰기** ·
  **orphan 삭제·자동 정리** · **tombstone·자동 merge·L-4** — 전부 **금지**, 각각 별도 스펙.
- **실제 네트워크 지연·단절 · 실기기 · 다중 기기 동시 편집 · 운영 규모 payload ·
  orphan 누적 실제 비용** — **NOT TESTED**. `pnpm-workspace.yaml`의 `allowBuilds` — 이월, 미해결.

### 증명 경계 (유지)

**합성 fake는 서버 Rules의 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
callback 재실행과 commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
**emulator 증명이라고 주장하지 않는다**. **emulator는 실제 Firebase가 아니다.**

### 다음

**`WAITING_FOR_NEXT_MANUAL_TASK`.** 다음 스펙은 **자동으로 시작하지 않는다**.
Founder가 명시적으로 지시할 때 새 작업 범위를 정한다. 자동화·반복 작업은 만들지 않았다.

> 아래 구현·보완·계약·승인 이력은 **삭제하지 않는다.**

## Claude 스펙 037 구현 보완 라운드 1 완료 — READY_FOR_CODEX (2026-08-11)

보완 커밋 **`ead06ab`**(기준 `d4d42d6`, fast-forward, HEAD=origin 0/0). 구현 `d83aee9`의 Codex 지적 3건.
**변경 파일 4개(전부 허용 목록)**: `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` ·
**`sdk-facade.test.ts`(신규)**. **Rules·emulator config·`apps/**`·`admin-read/**`·manifest·lockfile·
`firebase.json`·`.firebaserc`·`vitest*.config.ts`·`scripts/check.mjs`·`.gitignore` 전부 무변경.**
Founder가 `4f2ab0b` 승인과 `f8590e4`의 **A-12·A-13 확장**이 실제 승인임을 재확인했다.

### 교정 1 — payload를 쓰기 전에 정본으로 런타임 검증

`save()`가 **`expectedBase` 검증 뒤, UUID·업로드 전에** `request.catalog`를
**기존 `readLegacyCatalog` 정본**으로 검증한다. invalid이면 **`WRITE_INVALID_INPUT`** 이고
**UUID·Storage·Firestore 호출 0**이다. 업로드는 **검증된 `CatalogDocumentV1`을 직렬화**한다.
**이유**: `CatalogDocumentV1`은 **컴파일 타임 주장일 뿐**이고 이 객체는 **불변**이라,
읽을 수 없는 payload를 올리면 **head에 영구히 앉는다**. 또 caller 객체가 아니라 검증 결과를
직렬화하므로 **hostile getter가 나중에 바이트를 바꿔치기할 수 없다**.
테스트 고정: invalid `schemaVersion`·circular 입력 → **호출 0** · 업로드 JSON이 **검증된 V1 wrapper**로
**round-trip**.

### 교정 2 — Firebase app 소유권 명시, 두 번째 app 금지

`createFirebaseAdminWriteFacade`가 **스펙 036이 이미 소유한 기본 app을 재사용**한다.
**기본 app 중복 `initializeApp` 0**, **`appName` 옵션 제거**(named app은 **자기 auth 상태를 따로 들어서**
운영자가 로그인한 적 없는 세션으로 쓰기가 나갈 수 있다 — **그 분리 자체가 버그**),
기존 app config가 **키 단위로 하나라도 다르면 fail-closed**. **`admin-read/**` 무수정.**

### 교정 3 — emulator 옵션은 `demo-` 프로젝트에서만

`options.emulators`가 있으면 **`config.projectId`의 `demo-` 접두를 SDK 초기화 전에** 검사하고,
non-demo면 **`initializeApp`·Auth·Firestore·Storage 호출 0**으로 거부한다.
검사가 **dynamic import보다 앞**이라 SDK가 로드조차 되지 않는다.
**emulator 배선을 실제 프로젝트 id에 물리는 것이 로컬 실행이 운영에 닿을 수 있는 유일한 실수**다.

### 신규 `sdk-facade.test.ts` (Firebase 모듈 mock)

기존 app 재사용(`initializeApp` 0회) · named app 0개 · **키별 config 불일치 fail-closed** ·
Auth/Firestore/Storage를 그 하나의 app에서 각 1회 취득 ·
**non-demo + emulator → 모든 SDK 진입점 0회** · demo면 connect 3종 호출 ·
emulator 미지정이면 connect 0 · non-demo라도 emulator 배선 없으면 정상 초기화.

### 게이트 실측

`pnpm check` **PASS** · **unit 1318/1318**(1305 → **+13**) · **Chromium E2E 134/134** ·
**고객 번들 byte-identical**(`index-W_cZpbdf.js` · 287,741 bytes ·
`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`) ·
**emulator 게이트 실제 Rules로 10/10 PASS**(분리 실행, **다운로드·설치·포트 강제 해제 0**) ·
`git diff --check` **PASS** · **forbidden diff 0** · ports 전후 free · 디버그 로그 산출물 0.

### 계속 닫혀 있는 것

`apps/**`·UI 연결 · 저장 버튼 · **실제 UID** · 실제 Firebase/network/live/운영 데이터 ·
**Rules·Hosting 배포** · 운영 쓰기 · 발행 · legacy 공유 쓰기 · orphan 삭제·자동 정리 ·
tombstone·자동 merge · 신규 의존성·다운로드·설치.
⚠️ **Rules는 이번 라운드에 아예 손대지 않았고** 여전히 **UNCONFIRMED placeholder**라 배포 불가다.

### 다음

**Codex 보완 라운드 1 재검증** — 독립 게이트 + **emulator 게이트 명시 실행**.

> 아래 구현 완료 기록과 그 아래 승인·검토·계약 이력은 **삭제하지 않는다.**

## Claude 스펙 037 C5 비-UI 구현 완료 — READY_FOR_CODEX (2026-08-11)

구현 커밋 **`d83aee9`**(기준 `f8590e4`, fast-forward push, HEAD=origin, ahead/behind 0/0).
권한: Founder 승인 `4f2ab0b` + 허용 범위 검토 `f8590e4`(**A-12·A-13 확장 포함**). 계약 `9805c26`.

### 구현 범위 (허용 목록 안에서만)

`packages/firebase/src/admin-write/**`(신규 9파일: constants·types·errors·head·facade·write-port·
sdk-facade·index·emulator-env) · `packages/firebase/package.json`(`./admin-write` export) ·
`storage.rules`·`firestore.rules`(**목표 상태, placeholder UID, 배포 0**) ·
`firebase.emulator.json` + emulator rules 사본 2개 · `vitest.config.ts`·`vitest.emulator.config.ts`·
`package.json` · **A-12 `.gitignore` 한 줄** · **A-13 `scripts/check.mjs` 파일명 1개**.
**`firebase.json`·루트 배럴·`admin-read/**`·`apps/**`·`.firebaserc` 무변경.**

### 설계 요지

`save`는 **operationId를 호출당 1회** 발급하고(재시도·callback 재실행에서 재발급 0) 업로드한 뒤
**`runTransaction`을 정확히 1회** 호출한다. **callback은 순수**해서 SDK가 여러 번 돌려도 안전하다.
**head 부재 = 논리 revision 0**이며 **`expectedBase === 0`일 때만** revision 1을 만든다.
결과 불명일 때만 **read-only bounded reconciliation 1회**를 돌리고, **base 관측은 미판정**으로 남긴다
(**timeout은 SDK transaction을 취소하지 않는다**). `loadBaseline`은 head 없으면
**스펙 036 read port를 그대로 재사용**하고, head가 있으면 **그 객체만** 읽으며 legacy fallback 0이다.

### 게이트 실측

frozen install **PASS · lockfile diff 0**(신규 의존성 0) · `pnpm check` **PASS** ·
**unit 1305/1305**(1271 → **+34**) · **Chromium E2E 134/134**(무회귀) ·
**★ 고객 번들 byte-identical** — `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** ·
`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`,
유출 문자열(`admin-write`·`rebuildAdminState`·`firebase/firestore`) **0건** ·
`git diff --check` **PASS** · ports 4183/4184·8080/9099/9199 전후 **free**.

### ★ emulator 게이트 — 실제 Rules로 **10/10 PASS**

`firebase emulators:exec --config firebase.emulator.json --project demo-denn-emulator` 로
**기본 게이트와 분리해 명시 실행**. **다운로드·설치·신규 의존성·포트 강제 해제·프로세스 종료 0**,
emulator가 `Detected demo project ID "demo-denn-emulator"` 확인, 종료 후 잔여 0, 디버그 로그 산출물 0.
검증: 승인 UID만 가능 / **다른 UID·익명·미인증 거부**(양 서비스) / **동일 경로 재업로드·delete·
비-JSON contentType 거부** / **head `get` 허용·타 identity 거부·`list` 거부** /
**키 4개·잘못된 objectPath·최초 revision≠1·`+2`·동일 revision·`objectPath` 미교체 거부**,
정상 `+1`+경로 교체 통과, head delete 거부 / **두 writer 동시 commit → 정확히 하나만 성공,
head 정확히 +1, 진 쪽 객체는 orphan이고 head 불변**.
> ⚠️ 첫 실행 1건 실패는 **rule이 정상 동작한 결과**였다 — `resetEmulatorState`가 Firestore만 비워
> E-3의 "첫" 업로드가 실은 덮어쓰기였고 create-only가 거부했다. **테스트가 시나리오마다 새 경로를
> 쓰도록 고쳤고 제품 코드는 바뀌지 않았다.**

### fake 게이트 34개

호출 순서 · **callback 4회 재실행에도 upload 1회·UUID 1회·`runTransaction` 1회** ·
**재실행 중 head가 움직여도 `expectedBase` 자동 재채택 0** · upload 실패 시 transaction 0회 ·
미인증에서 네트워크 0 · **단일 in-flight** · **reconciliation 5분기**(read 최대 1회·재업로드 0·
재transaction 0) · **명확한 reject는 reconciliation 0회** · §5.7 범위(무효 base는 Storage 0회) ·
§4.3 최초 create 분기 · baseline 5분기 · **비노출**(오류 직렬화에 raw message·operationId·
objectPath 0건, 키 정확히 4개) · **Rules 사본이 UID 라인만 다름** + **배포본에 placeholder 잔존** 고정.

### 경계 (정직하게)

**합성 fake는 서버 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
callback 재실행·commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
emulator 증명이라 주장하지 않는다. **emulator는 실제 Firebase가 아니다.**

### 계속 닫혀 있는 것

`apps/**`와 모든 UI 연결 · 저장 버튼 · **실제 UID** · 실제 Firebase/network/live/운영 데이터 ·
**Rules·Hosting 배포** · 운영 쓰기 활성화 · 발행 · legacy 공유 쓰기 · orphan 삭제·자동 정리 ·
tombstone·자동 merge · 신규 의존성·다운로드·설치 · `firebase.json`·루트 배럴·`admin-read/**`·`.firebaserc`.
⚠️ **Rules는 편집만 했고 배포하지 않았다.** 배포하면 `denn-admin.html:740`의 저장이 서버에서
거부되므로 **배포 순서 자체가 STOP 대상**이다(계약 §9).

### NOT TESTED / UNCONFIRMED

실제 Firebase 프로젝트 동작 전부 · **실제 운영자 UID·계정 실재·로그인** · 실제 네트워크 지연·단절 ·
실기기·다중 기기 동시 편집 · 운영 규모 payload · orphan 누적 실제 비용 · **L-4**(범위 밖) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월).

### 다음

**NEXT §3 4단계 — Codex 독립 게이트 검증**(frozen · format/lint/typecheck · unit · build ·
Chromium E2E · diff check · forbidden diff · **고객 dist hash** · ports/temp),
이어서 **5단계 local emulator 게이트 명시 실행**.

> 아래 승인·검토 기록과 Codex `CONTRACT_PASSED` 기록은 **삭제하지 않는다.**

## Claude 스펙 037 승인 유효성 확정 + 구현 허용 범위 검토 — READY_FOR_CODEX (2026-08-11)

정본 갱신: `docs/codex-claude-handoff/decisions/2026-08-11-spec-037-implementation-authorization.md`
§3.1~§3.3 · 기준 HEAD `7aee0c2`.
**Founder가 `4f2ab0b`의 승인이 Claude Code에 직접 전달한 실제 승인임을 확인하고 유효한 승인으로
확정했다.** 이어서 **구현 허용 범위 검토**를 지시해 수행했다.
**검토는 읽기 전용** — 저장소 파일 변경·emulator 실행·network 접근 **0**.
**문서 전용 라운드이며 구현은 여전히 시작하지 않았다.**

### 검토 결과 — 막힘 없이 열리는 항목 (실측)

- `packages/firebase/src/admin-write/**` **디렉터리 없음**, 저장소 전체에 **`admin-write` 참조 0건** → 충돌 없음.
- **자동 typecheck**: `packages/firebase/tsconfig.json`의 `include: ["src"]`가
  `admin-write/**`와 `*.emulator.test.ts`를 **자동 포함**한다.
- **자동 format/lint**: `biome.json`의 `packages/**/src/**/*.{ts,tsx}`가 **소스·emulator 테스트를 자동 포함**.
- **`./admin-write` export**는 기존 `./admin-read`와 **동일 패턴** — 새 규약 불필요.
- `storage.rules`·`firestore.rules` **추적 중**, emulator 전용 `*.rules` 사본도 **gitignore 무영향**.
- **`vitest.config.ts` exclude는 반드시 필요**하다 — 기본 `include`의
  `*.test.{ts,tsx}`가 **`*.emulator.test.ts`도 매칭**한다(`*.live.test.ts`와 동일 이유).
- **emulator SDK API 전부 존재**: `connectAuthEmulator`·`connectFirestoreEmulator`·
  `connectStorageEmulator` → **신규 의존성 0**.
- **도구**: Java `21.0.11 LTS` · firebase-tools 전역 `15.22.4` · jar 캐시됨 · 포트 free.

### ★★ 공백 2건 — Founder가 최소 범위 확장을 승인함

1. **`firebase.emulator.json`이 조용히 gitignore된다.** `.gitignore:2`가 `*.json`이고 예외는
   `package.json`·`tsconfig*.json`·`biome.json`뿐이다(`git check-ignore -v` → `.gitignore:2:*.json`).
   `firebase.json`·`.firebaserc`가 멀쩡한 건 **이미 추적 중이라서**일 뿐이다.
   → 그대로면 **config가 커밋되지 않아 다른 환경에서 emulator 게이트를 재현할 수 없다.**
   **결정 A-12: `.gitignore`에 `!firebase.emulator.json` 한 줄 추가.**
   (`git add -f`는 파일이 ignored로 남아 `git clean -X`에 지워지고, `.gitignore:7` 주석의
   "git add -f 불필요" 의도와도 어긋난다.)
2. **`vitest.emulator.config.ts`가 format/lint를 조용히 건너뛴다.**
   `scripts/check.mjs:22-30`의 `BIOME_TARGETS`와 루트 `package.json`의 `format:check`/`lint`가
   **config 파일을 명시 열거**하고, `biome.json`의 `"*.ts"`는 **경로를 명시로 넘기므로 무효**다.
   → **실패가 아니라 스킵**이라 게이트는 통과하는데 검사만 빠진다.
   **결정 A-13: `scripts/check.mjs`의 `BIOME_TARGETS`에 파일명 1개 추가** + `package.json`의
   `format:check`·`lint`에도 동일 추가(후자는 이미 A-8 범위).

### 범위 확장의 경계

**두 확장 모두 기계적·비제품 변경이며 각각 한 줄이다.** **§2 금지 항목은 하나도 열리지 않는다** —
`apps/**` · 실제 UID · 실제 Firebase/network/live · Rules/Hosting 배포 · 운영 쓰기 · 발행 ·
legacy 공유 쓰기 · orphan 삭제 · 신규 의존성·다운로드·설치 **그대로 금지**.
**`firebase.json`·루트 배럴·`admin-read/**`·`.firebaserc`도 그대로 금지.**
**`pnpm-lock.yaml` diff 0** 요구 유지.

### 다음

**NEXT §3 2단계 — Codex가 승인 기록·검토 결과·확장된 허용 파일(A-12·A-13 포함)을 확인**한다.
그 확인 뒤에 **3단계 비-UI 구현**을 시작한다. 구현 착수 0, 자동화 생성 0.

> 아래 승인 기록 섹션과 Codex `CONTRACT_PASSED` 기록은 **삭제하지 않는다.**

## Founder 스펙 037 구현 착수 승인 기록 — 문서 전용 · READY_FOR_CODEX (2026-08-11)

정본: **`docs/codex-claude-handoff/decisions/2026-08-11-spec-037-implementation-authorization.md`**
(승인 원문 수록) · 기준 HEAD `2f0ca7d` → **승인 기록 커밋 `4f2ab0b`** ·
승인 대상 계약 **`9805c26`**(Codex `CONTRACT_PASSED`).
**문서 전용 — 제품 코드·`storage.rules`·`firestore.rules`·`firebase.json`·`firebase.emulator.json`·
`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc`·test diff 0**, 신규 의존성 0,
실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 0, 자동화 생성 0.
**★ 구현은 아직 시작하지 않았다** — NEXT §3 순서상 **2단계(Codex의 허용 파일 확인)** 가 먼저다.

### 승인된 것

**최종 계약 `9805c26` 승인** + **계약에 명시된 로컬 비-UI 구현·검증 착수 승인**.
허용 범위: **admin-write port와 합성 fake** · **배포하지 않는 `storage.rules`/`firestore.rules`
목표 파일**(실제 UID는 **UNCONFIRMED placeholder만**, **편집만 허용·배포 금지**) ·
**`firebase.emulator.json`과 emulator 전용 Rules 사본**(합성 UID만) ·
**opt-in unit/emulator 테스트**(`vitest.config.ts`·`vitest.emulator.config.ts`·`package.json` 명령) ·
**기존 캐시 도구만 이용한 `demo-denn-emulator` 로컬 검증**까지.

### 승인되지 않은 것

**`apps/**`와 모든 UI 연결**(저장 버튼·admin 화면·실제 고객/운영 경로) · **실제 운영자 UID 추측·기록** ·
**실제 Firebase project·운영 bucket/data·live network** · **Rules/Hosting 배포 · 운영 쓰기 활성화 ·
`published/state.json` 발행** · **legacy `admin/state.json` 공유 쓰기** ·
**orphan 삭제·자동 정리·client delete 권한** · **tombstone·자동 merge·L-4 해결** ·
**신규 의존성·도구/binary 다운로드·설치** · **실제 프로젝트 id 또는 `.firebaserc` 사용** ·
**자동화·반복 작업 생성**.

### ★ 구현 시 유일한 허용 파일 목록 (승인 범위 = 계약 §10, 일치 확인함)

`packages/firebase/src/admin-write/**` · `packages/firebase/package.json`(`./admin-write` export) ·
`storage.rules` · `firestore.rules`(**둘 다 placeholder UID · 배포 금지**) ·
`firebase.emulator.json` · emulator 전용 rules 사본 · `vitest.config.ts` ·
`vitest.emulator.config.ts` · `package.json`(`test:emulator`) · `**/*.emulator.test.ts`와 관련 unit/fake ·
스펙 037 handoff/CURRENT/live/STATE/NEXT.
**여전히 금지**: **`firebase.json`** · **루트 배럴 `packages/firebase/src/index.ts`** ·
**`packages/firebase/src/admin-read/**`** · **`apps/**`** · `packages/render/**` ·
`packages/shared/**` · `.firebaserc` · 실제 `.env` · legacy HTML.
**★ `pnpm-lock.yaml` diff는 0이어야 한다** — 신규 의존성이 승인되지 않았으므로
`--frozen-lockfile`이 통과해야 하고, 변경이 필요해지면 **STOP**이다.

### ★ emulator 실행 경계

**기존 캐시 도구만**(Java `21.0.11 LTS` · firebase-tools 전역 `15.22.4` ·
Firestore `v1.21.0.jar` · Storage rules runtime `v1.1.3.jar` · UI `v1.15.0`).
**`--config firebase.emulator.json` + `--project demo-denn-emulator` 를 둘 다** 명시하고,
**host 환경변수가 없거나 `demo-` 접두가 아니면 시작 전에 실패**한다. **`.firebaserc` 사용·수정 0.**
**다운로드·설치·신규 의존성·포트 강제 해제·타 프로세스 종료가 필요하면 STOP.**
⚠️ **Auth emulator binary는 UNCONFIRMED** — **첫 실행에서 다운로드를 시도하면 즉시 STOP.**

### 다음 순서 (NEXT §3)

**1단계(이 커밋) 승인 기록 완료 → 2단계 Codex가 승인 기록과 허용 파일 확인 →
3단계 Claude가 비-UI 구현 별도 commit/push → 4단계 Codex 전체 게이트 검증 →
5단계 기본 게이트와 분리한 local emulator 게이트 명시 실행(문제 시 STOP).**

### 이 승인으로도 열리지 않는 것

**운영 쓰기 개방**(실제 UID + orphan 정책 + emulator PASS 후 **별도 cutover 스펙·별도 승인**) ·
**Rules 배포**(실제 UID 정본 전 차단 — ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
**배포 순서 자체가 STOP 대상**) · **C6**(G-3 보류) · **L-4 해결**(별도 스펙).

> 아래 Codex 최종 계약 검토 기록과 그 아래 라운드 3·2·1·초판 기록은 **삭제하지 않는다.**

## Codex 스펙 037 최종 계약 검토 — CONTRACT_PASSED / FOUNDER_DECISION_REQUIRED (2026-08-11)

Codex는 보완 계약 `9805c26`과 상태 동기화 `2f0ca7d`를 최종 검토했다.

- HEAD=origin=`2f0ca7d`, ahead/behind 0/0.
- `git diff --check f694211..9805c26` PASS.
- `git diff --check 9805c26..2f0ca7d` PASS.
- 보완은 허용 문서 6개, 동기화는 상태 문서 4개뿐이다.
- 제품/Rules/config/test/lockfile diff 0, emulator/Firebase/network/live 실행 0.
- 라운드 3의 오류 표면 분리와 timeout reconciliation 정정이 계약 전반에 일치한다.

**계약 판정은 PASS다.** 다만 정본 §16이 port/Rules/config/test 구현 착수 여부를
Founder 확인 대상으로 남겼으므로 Codex가 권한을 추론하지 않는다.
정확한 승인 범위와 복사 가능한 Founder 문구는 `Automation/NEXT_CLAUDE_PROMPT.md`에 기록했다.

Founder 승인 전에는 저장소 쓰기·stage·commit·push와 구현/emulator 실행을 모두 금지한다.

> 아래 `Claude 스펙 037 계약 보완 라운드 3 완료` 섹션은 `9805c26` 완료 이력이다.

## Claude 스펙 037 계약 보완 라운드 3 완료 — READY_FOR_CODEX (2026-08-11)

계약: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`(라운드 3 정정본) ·
핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
기준 HEAD `f694211` → **보완 커밋 `9805c26`**(fast-forward push, HEAD=origin, ahead/behind 0/0).
**문서 전용 —
`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
`firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` diff 0**,
신규 의존성 0, 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 0,
upload/write/delete/publish/deploy 0, 자동화 생성 0. **구현 착수 0.**
> 이 커밋은 Codex가 작업 트리에 남긴 라운드 3 검수 기록도 함께 커밋한다.

### Codex 지적 2건을 정정했다

1. **★ `loadBaseline`과 `save`의 오류 표면을 분리했다(§5.4·§5.6·§6.1).**
   라운드 2는 **읽기 작업에 `WRITE_UPLOAD_FAILED`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`을 반환**하고
   **persisted object invalid를 "head transaction 실패"와 합쳤다** — **공개 API 의미가 틀리다.**
   정정: **`save`만** `SafeAdminWriteError` + 8개 `WRITE_*`를 쓴다.
   **`loadBaseline`은 스펙 036의 공개 `SafeAdminReadError` 의미를 재사용**하고,
   **head 문서 자체의 허용 키/`revision`/`objectPath`/`schemaVersion` 위반만**
   신규 **`REBUILD_BASELINE_INVALID`** 하나로 구분한다(**baseline 전용 유일 추가 코드**).
   head 없음의 legacy read 실패와 head 있음의 참조 객체 없음·JSON/catalog invalid는
   **스펙 036의 기존 read 오류를 그대로 보존**한다.
   **read timeout/network 실패는 상태를 변경하지 않으므로 upload outcome unknown으로 부르지 않는다**
   (`NETWORK_TIMEOUT`/`NETWORK_UNAVAILABLE`).
   **`WRITE_HEAD_FAILED`는 save의 head transaction이 명확히 실패한 경우로 다시 좁혔다.**
   오류에 raw message·email·UID·token·object bytes/path·`operationId` 비노출 유지,
   **`packages/firebase/src/admin-read/**` 무수정 경계 유지.**
   **확인**: `SafeAdminReadError`는 **`@denn/firebase/admin-read` 배럴이 이미 export한다**.
   자기 package subpath 순환이 문제면 **내부 relative type import 허용**하되 **공개 의미는 동일**해야 하며,
   **`import type`은 컴파일 시 지워져 런타임 결합·번들 영향이 어느 쪽이든 0**이다.
2. **★★ timeout 뒤 base 관측은 commit 미반영의 증거가 아니다(§6.6).**
   **timeout은 SDK transaction을 취소하지 않는다** — reconciliation read 순간에 base여도
   **원 transaction이 나중에 서버에서 성공할 수 있다.**
   **이 잘못된 분기는 Codex의 라운드 2 지시에도 포함됐던 오류이며 최종 계약에서 바로잡았다.**
   정정된 판정: **명확히 reject된 경우는 reconciliation에 들어오지 않고** 기존
   `WRITE_HEAD_FAILED`/`WRITE_CONFLICT`로 끝난다. reconciliation에 들어온 경우 —
   `revision === expectedBase + 1` **AND** `objectPath`가 이번 operation → **성공 확정** /
   `revision === expectedBase + 1` **AND** 다른 `objectPath` → **다른 writer 승리 확정
   `WRITE_CONFLICT`**(head가 더 이상 `expectedBase`가 아니라 우리 late commit은 CAS에서 이길 수 없다),
   업로드 객체는 **orphan** / **여전히 논리적 base → late commit 가능성이 남아 미판정
   `WRITE_COMMIT_OUTCOME_UNKNOWN`, orphan이라 부르지 않는다** /
   `revision > expectedBase + 1` → **판정 불가 `WRITE_COMMIT_OUTCOME_UNKNOWN`** /
   reconciliation read 실패·timeout → **`WRITE_COMMIT_OUTCOME_UNKNOWN`**.
   **자동 재업로드·transaction 재호출·삭제·성공/실패 추측 계속 0**, **bounded read 최대 1회 유지**,
   **늦게 도착한 SDK 결과가 UI·반환값을 뒤집지 않는다는 규칙과 원 transaction이 서버에서 늦게
   성공할 수 있다는 사실을 동시에 명시**했다(앱은 자기 반환값을 바꾸지 않을 뿐이고,
   서버의 진실은 다음 `loadBaseline`이 알려 준다).
   §5.4·§6.5~§6.6·fake **F-3~F-5**·위험 표·handoff의 의미를 모두 일치시켰다.

### 라운드 2에서 열어 둔 질문 — 해소됨

"`loadBaseline` 실패를 8코드 안에서 어떻게 부르는가"에 대해 라운드 2는
**`WRITE_HEAD_FAILED`의 의미를 넓히는 절충**을 썼다. **교정 1이 그 절충을 폐기**했다 —
**오류 표면 자체를 분리하는 것이 옳은 답**이고 **9번째 `WRITE_*` 코드는 만들지 않았다.**

### 신규 위험 2건

**R-14** 읽기 실패를 "upload 오류"로 보고해 공개 API 의미가 틀어짐 → §5.4 표면 분리 + F-6 ·
**R-15** timeout 뒤 base 관측을 "미반영 확정"으로 오판해 **서버에서 나중에 성공한 commit을 실패로
보고하고 운영자가 같은 payload를 다시 보내게 만듦** → §6.6 미판정 유지 + 재전송 금지 + F-4·F-5.

### 승인 경계 (§16)

**이번 라운드는 계약 문서 보완만 승인한다.** push 후 **`READY_FOR_CODEX`, `fix_round: 3`**.
**Codex 최종 계약 검토 전 port/Rules/config/test 구현 0.**
**실제 제품 UI · live Firebase · Rules 배포 · 운영 쓰기는 계속 금지.**
**★ G-5의 합성 fake·로컬 emulator 허용과 결정 문서 §2의 "제품 구현 착수" 금지 사이 경계는
이번 문서 교정에서 추측하지 않는다 — Codex 최종 검토 후 Founder 확인 대상으로 남긴다.**

> 아래 Codex 라운드 3 검수 기록과 그 아래 라운드 2·1·초판 기록은 **이력 보존을 위해 삭제하지 않는다.**

## Codex 스펙 037 계약 재검토 — CORRECTION_REQUIRED 라운드 3 (2026-08-11)

Codex는 보완 계약 `d5789db`와 상태 동기화 `f694211`을 검토했다.
HEAD=origin=`f694211`, ahead/behind 0/0, 허용 문서 범위와 `git diff --check` PASS,
제품/Rules/config/test diff 0은 확인됐다. 라운드 2의 네 교정도 반영됐다.

그러나 최종 계약 결함 2건이 남았다.

1. `loadBaseline`의 읽기 실패를 `WRITE_UPLOAD_*`/`WRITE_HEAD_FAILED`로 표현해 공개 오류 의미가 틀리다.
2. transaction timeout 뒤 head가 base인 관측은 late commit 가능성 때문에 미반영 확정 증거가 아니다.

정확한 최종 교정 지시는 `Automation/NEXT_CLAUDE_PROMPT.md`가 정본이다.
제품 구현·Rules/config/test 변경·emulator 실행은 계속 금지한다.

> 아래 `Claude 스펙 037 계약 보완 라운드 2 완료` 섹션은 `d5789db` 기록이며,
> 위 Codex 라운드 3 판정이 이를 supersede한다.

## Claude 스펙 037 계약 보완 라운드 2 완료 — READY_FOR_CODEX (2026-08-11)

계약: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`(라운드 2 정정본) ·
핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
기준 HEAD `fad819f` → **보완 커밋 `d5789db`**(fast-forward push, HEAD=origin, ahead/behind 0/0).
**문서 전용 —
`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
`firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` diff 0**,
신규 의존성 0, 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 0,
upload/write/delete/publish/deploy 0, 자동화 생성 0. **구현 착수 0.**
> 이 커밋은 Codex가 작업 트리에 남긴 라운드 2 검수 기록도 함께 커밋한다.

### Codex 지적 4건을 정정했다

1. **★ 최초 head 생성도 `expectedBase === 0`을 강제한다(§4.3).**
   라운드 1은 "head 없으면 무조건 revision 1 create"였다 — **`expectedBase`가 5인 편집 세션이
   head가 사라진 상황에서 revision 1을 만들어 이력을 조용히 밀어낼 수 있었다**(G-2 위반).
   정정: **head 없음 = 논리적 revision `0`**, **`expectedBase === 0`일 때만 create**,
   아니면 **`WRITE_CONFLICT`**(head 불변). **`expectedBase`는 0 이상 safe integer**만 허용하고
   위반은 **upload 전 `WRITE_INVALID_INPUT`**(Storage 호출 0회). **persisted `revision`은
   1 이상 safe integer이고 `+1`이 여전히 safe integer**여야 하며 아니면 **fail-closed**(§5.7).
   **Firestore Rules의 create `revision == 1` / update 정확히 `+1`은 유지**하고,
   **`expectedBase` 자체는 클라이언트 transaction 계약에서 검사**한다(Rules는 요청자의 base를 모른다).
2. **★ 공개 타입 블록을 저장소 실제 타입으로 완결했다(§5.6).**
   타입 블록이 **`CatalogDocumentV1`을 직접** 쓰고 **alias·동의어를 만들지 않는다**.
   `Result`는 **import 표면까지 명시**(`packages/shared/src/index.ts:19`).
   **`AdminWriteErrorCode`(8개 union)·`AdminWriteErrorCategory`·`SafeAdminWriteError`** 공개 타입 고정.
   **정본 매핑 표는 §5.4 한 곳**이며 category/retryable은 코드의 속성이다.
   **`SafeAdminWriteError`에는 `correlationId` 외 raw message·email·UID·token·object bytes·
   `objectPath`·`operationId`가 들어가지 않는다.** `AdminStateRevision` 런타임 범위는 §5.7과 일치.
3. **★ 결과 불명 재조회를 port 내부로 옮겼다(§6.6).**
   라운드 1은 **호출자에게 head 재조회를 요구했지만 `operationId`가 내부라 수행 불가능**했다.
   정정: **`save` 내부가 자신의 `operationId`로 read-only reconciliation**을 수행한다.
   **write retry가 아니다** — **재업로드 0 · transaction 재호출 0 · bounded read 최대 1회** ·
   **callback 안에서 하지 않는다**. 판정 3분기: `revision === expectedBase + 1` **그리고**
   `objectPath`가 우리 것 → **성공 반환** / **논리적 base에 머무름**(head 부재 또는
   `revision === expectedBase`) → **미반영 확정 `WRITE_HEAD_FAILED`**, 객체는 **orphan**이고
   **자동 재전송·삭제 0** / **그 밖 전부**(다른 writer가 head를 옮김, `base+1`인데 `objectPath`가
   다름, reconciliation read 실패·timeout) → **`WRITE_COMMIT_OUTCOME_UNKNOWN` 유지**.
   **오류에 `operationId`·object path 비노출**, **`loadBaseline`은 reconciliation API가 아니다**.
4. **★ fake와 emulator가 증명하는 항목을 분리했다(§7.5).**
   **(A) emulator + 실제 Rules** = E-1~E-8(승인/다른 UID/익명/미인증, Storage create-only·update/
   delete 거부, head `get` 허용·거부, `list` 거부, 키/경로/revision Rules, **두 writer CAS**,
   **orphan 시 head 불변**). **(B) 주입 fake** = F-1~F-10(**callback 다회 실행**, **upload 반복 0**,
   앱 `runTransaction` 1회, **upload/commit outcome unknown**, **bounded reconciliation**,
   늦은 성공 폐기, 오류 매핑·비노출, §5.7 범위, §4.3 최초 create 분기, baseline 분기).
   **★ callback 재실행과 commit outcome unknown을 emulator에서 결정적·비파괴적으로 유발할 seam을
   제시할 수 없으므로 fake 전용으로 재분류하고 emulator 증명이라고 주장하지 않는다.**
   **(C) 재현 금지**: network 차단·프로세스 강제 종료·포트 강제 해제·emulator kill·실제 Firebase.
   **(D) 양방향 경계**: fake는 Rules 원자성을, emulator는 앱 오류 분기 전체를 증명하지 않는다.

### ★ Codex가 확인해 줘야 할 판단 1건

교정 2가 **"8코드만 허용"** 을 요구하는데, 8코드는 `save` 기준이라 **`loadBaseline`의
"persisted head 또는 그 객체가 계약을 위반해 사용할 수 없음"** 에 맞는 이름이 없다.
**9번째 코드를 만들지 않고 `WRITE_HEAD_FAILED`의 의미를 확장**했다 — "head transaction 실패
**또는** persisted head/그 객체가 계약 위반으로 사용 불가". 둘 다 **확정 실패**이고
**`retryable: false`** 로 성질이 같다. **이름이 `HEAD`인데 참조 객체까지 포함하는 점은 의도적 절충**이며
다른 이름을 원하면 **계약만 고치면 된다**(제품 코드는 아직 없다). 계약 §0.1·§5.4에 기록했다.

### 신규 위험 3건

**R-11** head가 사라진 상황에서 revision 1을 만들어 이력을 밀어냄 → §4.3 + F-9 ·
**R-12** 호출자가 수행할 수 없는 복구 절차를 계약이 요구함 → §6.6 + F-4 ·
**R-13** fake로만 가능한 것을 "실제 Rules로 검증했다"고 오인 → §7.5 (A)/(B) 분리 + (D) 경계.

### 승인 상태 (문구 통일 — §16)

**이번 라운드에서 구현 착수를 승인하지 않는다.** push 후 상태는 **`READY_FOR_CODEX`**,
**Codex 보완 라운드 2 재검토 전 구현 0**, **통과 후에도 실제 제품 UI 연결·live Firebase·
Rules 배포·운영 쓰기는 계속 금지**. **★ port/Rules/config/test 구현 착수 여부는 추측하지 않고**
G-5 허용 범위(합성 fake·로컬 emulator)와 결정 문서 §2의 "제품 구현 착수" 금지를 **구분해 기록만** 했다 —
경계 판정은 **Codex의 다음 검수 몫**이다.

> 아래 Codex 라운드 2 검수 기록과 그 아래 라운드 1·초판 기록은 **이력 보존을 위해 삭제하지 않는다.**

## Codex 스펙 037 계약 재검토 — CORRECTION_REQUIRED 라운드 2 (2026-08-11)

Codex는 보완 계약 `41b54b9`와 상태 동기화 `fad819f`를 검토했다.
HEAD=origin=`fad819f`, ahead/behind 0/0, 문서 전용 범위와 `git diff --check` PASS,
제품/Rules/config/test diff 0은 확인됐다. 최초 지적 5건의 방향도 반영됐다.

그러나 구현 전 닫아야 할 계약 결함 4건이 남았다.

1. head가 없을 때 `expectedBase == 0`을 검사하지 않고 revision 1을 생성해 G-2와 모순된다.
2. “정확한 공개 타입”이 존재하지 않는 `Catalog`를 사용하고 `SafeAdminWriteError` 타입을 완결하지 않았다.
3. 내부 `operationId`를 숨기면서 결과 불명 재조회를 호출자에게 요구해 공개 API로 수행할 수 없다.
4. 실제 Rules emulator 표에 callback 재실행과 commit outcome unknown을 넣었지만 결정적 재현 방법이 없다.

정확한 교정 지시는 `Automation/NEXT_CLAUDE_PROMPT.md`가 정본이다.
제품 구현·Rules/config/test 변경·emulator 실행은 계속 금지한다.

> 아래 `Claude 스펙 037 계약 보완 라운드 1 완료` 섹션은 `41b54b9` 기록이며,
> 위 Codex 라운드 2 판정이 이를 supersede한다.

## Claude 스펙 037 계약 보완 라운드 1 완료 — READY_FOR_CODEX (2026-08-11)

계약: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`(정정본) ·
핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
기준 HEAD `c654023` → **보완 커밋 `41b54b9`**(fast-forward push, HEAD=origin, ahead/behind 0/0).
**문서 전용 — `apps/**`·`packages/**`·`tests/**`·`storage.rules`·
`firestore.rules`·`firebase.json`·`firebase.emulator.json`·`package.json`·lockfile·
`pnpm-workspace.yaml` diff 0**, 신규 의존성 0, 실제 Firebase/network/live/**emulator 실행**/
운영 데이터 접근 0, upload/write/delete/publish/deploy 0, 자동화 생성 0. **구현 착수 0.**
> 이 커밋은 Codex가 작업 트리에 남긴 검수 기록(아래 섹션·CURRENT·live log)도 함께 커밋한다.

### Codex 지적 5건을 정정했다

1. **★ Firestore head read 권한 누락 → §4.4 전면 재작성.**
   **`allow get: if approvedOperator() && docId == 'head'`**(baseline load가 성립한다),
   **`allow list: if false`**, create는 **`revision == 1`만**, update는
   **`revision`이 정확히 +1 AND `objectPath`가 이전 값과 달라야** 함,
   **허용 키 정확히 3개**, **`objectPath`는 `rebuild-admin-state/objects/{UUID}.json` 형태만**,
   **delete 금지**, **다른 `rebuildAdminState` 문서 전부 거부**,
   **`spaces/{token}`·catch-all 무변경**.
2. **★ emulator Rules 선택을 별도 config로 고정 → §7.3.**
   **`firebase.json`은 구현 단계에서도 수정하지 않는다.** 신규 **`firebase.emulator.json`** 이
   **emulator 전용 Rules 사본과 emulator 포트만** 참조하고, 실행은
   **`--config firebase.emulator.json` + `--project demo-denn-emulator`** 를 **둘 다** 포함한다.
   emulator 사본에는 **합성 UID만**, 배포 대상 Rules에는 **UNCONFIRMED placeholder만**,
   둘의 **UID 상수 외 diff 0을 unit test로 고정**. `.firebaserc` 무변경.
   **허용 파일에서 `firebase.json` 제거 · `firebase.emulator.json` 추가.**
3. **★ 결과 불명과 orphan 의미 정정 → §6.5 (결과 상태 5행 표).**
   초판은 **결과 불명을 orphan으로 단정**했는데, 그러면 **commit이 실제로 성공했을 가능성과 모순**된다.
   정정: upload 결과 불명 + transaction 미시작 → **객체는 없거나 orphan일 수 있고 head는 불변** /
   upload 성공 + transaction 명확히 실패 → **orphan, head 불변** /
   **transaction 결과 불명 → head에 연결됐을 수도, orphan일 수도 있다(미판정)**.
   **성공·실패·orphan을 추측하지 않고 head를 다시 읽어 `objectPath`와 `revision`으로만 판정**한다
   (§4.4가 update마다 `objectPath` 교체를 강제하므로 이 판정이 성립한다).
   **`WRITE_COMMIT_OUTCOME_UNKNOWN`은 `retryable:false`**, **reload 전 동일 payload 재전송은
   자동·수동 모두 금지**, **`WRITE_HEAD_FAILED`도 upload 이후 발생하므로 `retryable:false`로 변경**,
   **"head commit만 재개" API는 만들지 않는다**. **명확한 upload 실패만 `WRITE_UPLOAD_FAILED`**,
   **서버 반영 여부 불명확은 `WRITE_UPLOAD_OUTCOME_UNKNOWN`**.
4. **★ Firestore transaction callback 재실행 계약 → §5.5 신설.**
   **앱은 `runTransaction`을 정확히 1회 호출**하지만 **SDK는 callback을 여러 번 실행할 수 있다**
   (`maxAttempts` 기본 5). **callback 안에서 `transaction.get/set` 외 부작용 전면 금지** —
   **UUID 생성 · Storage upload · 로그 · UI 변경 · 로컬 revision 변경 금지**.
   **`operationId`와 `expectedBase`는 transaction 호출 전에 고정**하고,
   **재실행마다 head를 다시 읽되 `expectedBase`를 자동 변경하지 않으며** 불일치는 `WRITE_CONFLICT`.
   **upload는 transaction 밖 선행이라 재실행으로 반복되지 않는다.**
   **callback 내부 재실행 ≠ 앱 수준 retry**를 문서·테스트에서 구분한다.
5. **★ 공개 port 타입 고정 → §5.6.**
   `AdminStateRevision` · `AdminStateBaselineValue{catalog,revision,source}` ·
   `AdminStateSaveRequest{correlationId,expectedBase,catalog}` ·
   `AdminStateSaveValue{revision,objectPath}` · `AdminStateWritePort{loadBaseline,save}`.
   **`operationId`는 port 내부에서 save당 1회 생성**하고 **외부 입력이 아니다**.
   head 없음에서만 **legacy + revision 0 + `source:"legacy"`**, head 있으면 **rebuild 객체만**,
   불일치는 **fail-closed(legacy fallback 0)**, **성공 반환 revision만** 새 baseline으로 채택.
   **`loadBaseline`·`save` 각각 단일 in-flight.**
   **`packages/firebase/src/admin-read/**`는 이번 첫 구현에서 수정하지 않는다**,
   **중복 검증 규칙 금지**(`readLegacyCatalog`를 다시 구현하지 않는다).

### ★ 구현 전 확인 필요 — 교정 5의 `Catalog` 타입

교정 지시의 타입 블록은 **`Catalog`** 를 쓰지만 **그 이름의 타입은 저장소에 존재하지 않는다.**
`@denn/shared`가 실제로 내보내는 이름은 **`CatalogDocumentV1`**
(`packages/shared/src/catalog/types.ts`; 스펙 036 `AdminStateLoadValue.document`가 그 타입이다).
계약은 `Catalog`를 **`CatalogDocumentV1`에 바인딩**하고 **동의어·새 타입을 만들지 않는다**고 명시했다
(교정 5의 "중복 검증 규칙 금지"와 같은 이유). `Result`는 `packages/shared/src/index.ts:19`의 기존 타입.

### emulator 시나리오 7 → 12개

기존 7개 + **#8 승인 UID의 head `get` 성공** · **#9 다른 UID·익명·미인증의 head `get` 거부** ·
**#10 head `list` 거부** · **#11 transaction callback 재실행 시 upload 반복 0** ·
**#12 commit outcome unknown은 "head가 변경됐을 수도 있음"으로 다루고 재조회로 판정**.
**synthetic Auth 계정은 emulator 내부에서만 만들며 실제 계정 생성이 아니다.**

### 신규 위험 2건 기록

**R-9** transaction callback 재실행이 upload를 반복하거나 부작용을 남김 → §5.5 + fake·emulator 양쪽 검증.
**R-10** baseline load가 head를 읽지 못해 기능이 성립하지 않음 → §4.4 `get` 명시 + emulator #8~#10.

### 다음

**Codex가 보완 라운드 1을 재검토**한다. 구현은 시작하지 않았고 자동화도 만들지 않았다.

> 아래 Codex 검수 기록과 그 아래 `c654023` 초판 기록은 **이력 보존을 위해 삭제하지 않는다.**

## Codex 스펙 037 계약 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-11)

Codex는 문서 전용 계약 커밋 `c654023`을 검토했다. HEAD=origin, ahead/behind 0/0,
허용 문서 6개뿐, `git diff --check` PASS, 제품/Rules/config diff 0은 확인됐다.
그러나 구현 전에 반드시 닫아야 할 계약 결함 5건이 있다.

1. baseline load에 필요한 Firestore head `get` 권한이 Rules 계약에 없다.
2. 합성 UID Rules 사본을 선택할 별도 emulator config가 없어 배포 config와 섞일 수 있다.
3. `WRITE_COMMIT_OUTCOME_UNKNOWN`을 무조건 orphan으로 단정해 실제 commit 성공 가능성과 모순된다.
4. Firestore transaction callback의 SDK 내부 재실행과 부작용 금지 계약이 없다.
5. `loadBaseline`/`save` 공개 port의 정확한 타입·입출력이 없다.

정확한 교정 지시는 `Automation/NEXT_CLAUDE_PROMPT.md`가 정본이다.
제품 구현·Rules/config/test 변경·emulator 실행은 계속 금지한다.

> 아래 `Claude 스펙 037 C5 구현 계약 작성 완료` 섹션은 `c654023` 초판 기록이며,
> 위 Codex 교정 판정이 이를 supersede한다.

## Claude 스펙 037 C5 구현 계약 작성 완료 — READY_FOR_CODEX (2026-08-11)

계약: **`docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`**
핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
기준 HEAD `dc5666d`. 입력 = Founder G-1~G-5(`dc5666d`, Codex 검수 통과) + **Codex 구조 결정 Z-1~Z-8**.
**문서 전용 — `apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
`package.json`·lockfile·`pnpm-workspace.yaml` diff 0**, 신규 의존성 0,
실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근 0, upload/write/delete/publish/deploy 0,
자동화 생성 0. **구현 착수 0.**
**★ 이 계약은 실제 저장 구현도 admin UI 연결도 승인하지 않는다.**

### 계약이 확정한 것 (Z-1 ~ Z-8)

- **Z-1** UID 제한은 **`rebuild-admin-state/**`와 `/rebuildAdminState/head`에만**.
  **`op()` 본체 무변경** — 바꾸면 `published/`·`templates/`·`placeholders/`·`guides/`·`mockups/`·
  `editor-overlays/` write까지 우발적으로 잠긴다(`storage.rules:18-21`·`:35-40`).
  실제 UID는 **UNCONFIRMED**이고 **추측·예시 기록 금지**, 커밋 Rules에는 **표시된 placeholder**만.
  emulator는 **합성 UID `emulator-operator-DO-NOT-DEPLOY`**(실제 형식과 명확히 구분).
- **Z-2** `rebuild-admin-state/objects/{operationId}.json` — **별도 최상위 경로**라 OR 우회가
  **구조적으로 발생하지 않는다**. `operationId` = 저장 시작 시 **1회 생성 UUID**(재시도해도 재생성 안 함).
  경로에 **revision·문구·catalog id·이메일·UID·시간·파일명 금지**. content-addressed **미사용**.
  `application/json` · 20 MiB 미만 · **`resource == null` create-only**, update/delete 금지.
- **Z-3** `/rebuildAdminState/head` **단일 문서**, 허용 키 **3개**(`schemaVersion`=1 / `revision`≥1 정수 /
  `objectPath`). 이메일·UID·문구·원문 catalog·token·오류 원문 **금지**.
  최초 create는 **revision 1**, 이후는 transaction에서 **`expectedBase` 일치 시에만 정확히 +1**.
  `firestore.rules`가 **경로·UID·허용 키·최초 1·이후 +1을 이중 강제**.
  **★ Rules가 Storage 객체의 실제 존재를 원자적으로 증명한다고 주장하지 않는다.**
- **Z-4** `@denn/firebase/admin-write` 서브패스, **루트 배럴 무변경**, SDK·Firestore는
  **admin 전용 lazy 경계 안**, 주입 facade + 합성 fake, 기본 상태에서 **adapter 생성·네트워크 0**,
  **저장 버튼·UI 연결 제외**, **단일 in-flight**, **앱 자동 retry·merge 0**.
  ⚠️ **SDK 내부 재시도가 있으므로 "네트워크 요청 정확히 1회"를 주장하지 않는다** —
  대신 `operationId` 고정 + `resource == null`이 **두 번째 쓰기를 서버에서 거부**한다.
  **오류 8코드**(`WRITE_CONFLICT`/`AUTH_REQUIRED`/`FORBIDDEN`/`INVALID_INPUT`/`UPLOAD_FAILED`/
  `UPLOAD_OUTCOME_UNKNOWN`/`HEAD_FAILED`/`COMMIT_OUTCOME_UNKNOWN`),
  **CONFLICT·OUTCOME_UNKNOWN은 `retryable:false` + 재읽기 후 명시적 재시도만**.
  raw message·email·UID·token·object bytes **비노출**.
- **Z-5** head 없음 → legacy를 **revision 0** 기준으로 읽기 / head 있음 → **그 객체만** 읽고 검증,
  **없거나 invalid면 fail-closed(legacy 조용한 fallback 0)**.
  `expectedBase`는 **편집 시작 로드의 revision** 고정, 저장 직전 **자동 재채택·자동 병합 0**,
  **commit 성공 후에만** 로컬 기준 갱신. upload 성공 후 commit 전 실패 = **orphan + head 불변**.
  commit 결과 불명은 **추측 금지 → `WRITE_COMMIT_OUTCOME_UNKNOWN`**.
- **Z-6** **로컬 emulator만**, **`demo-` 접두 프로젝트 강제**, 기본 게이트와 **분리**
  (`*.emulator.test.ts` + `vitest.emulator.config.ts` + `pnpm test:emulator` — `*.live.test.ts` 선례 그대로),
  **실제 Rules로 7개 시나리오** 검증. 설치·다운로드·신규 의존성·포트 강제 해제·프로세스 종료는 **STOP**.
  **fake는 호출 순서·오류 매핑만 증명하고 서버 Rules 원자성을 증명하지 않는다**를 명시.
- **Z-7** **tombstone·자동 merge 도입 안 함.** 저장은 **문서 전체 CAS**, 충돌 시 전체 거부.
  **L-4 삭제 부활은 별도 후속 스펙.** 충돌 후 재읽기·재적용은 **운영자의 명시적 행동**.
- **Z-8** **이번 스펙에서 Rules·앱 배포 0.** 실제 UID + orphan 보존/비용/정리 정책 + emulator PASS가
  **모두** 확인되기 전 운영 쓰기 미개방. **legacy 저장을 먼저 닫지 않는다.**
  cutover는 **별도 Founder 승인 + 별도 배포 스펙**.

### ★ Emulator 사전 확인 (읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

**Java `openjdk 21.0.11 LTS` 사용 가능** · **firebase-tools 전역 `15.22.4` 사용 가능**
(**저장소 의존성 아님** → lockfile 변경 불필요) ·
**emulator binary 캐시됨**(`cloud-firestore-emulator-v1.21.0.jar`,
`cloud-storage-rules-runtime-v1.1.3.jar`, `ui-v1.15.0`) ·
**포트 4000·4400·4500·8080·9099·9199·4183·4184 전부 free**.
⚠️ **Auth emulator 별도 jar은 캐시에 없다** — 내장으로 보이나 **UNCONFIRMED**이며
**첫 실행에서 다운로드를 시도하면 즉시 STOP**이다.

### ★★ 계약이 못 박은 두 위험

- **R-1 Rules 배포가 운영자의 유일한 저장 경로를 닫는다.** `denn-admin.html:740`이 지금 유일한
  저장 경로다(스펙 035). **이번엔 Rules를 수정도 배포도 하지 않았고** UID 정본 전 배포가 차단이므로
  **현재는 안전**하다. 위험은 배포 시점이며 **Z-8이 순서를 STOP 대상으로 고정**했다.
- **R-2 emulator가 실제 프로젝트 id로 뜰 수 있다.** `.firebaserc`의 `projects.default`가
  **실제 운영 프로젝트 `denn-products`** 다. → **`demo-` 접두 프로젝트 id 명시 강제** +
  **emulator host 미설정 시 테스트 시작 거부** + **`.firebaserc` 수정 금지**.

### NOT TESTED / UNCONFIRMED (계약이 끝나도 남는 것)

실제 Firebase 프로젝트 동작 전부(Rules 실제 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절 · 실기기·다중 기기 ·
**Auth emulator binary 가용성** · 운영 규모 payload · orphan 누적 실제 비용 ·
**L-4 삭제 부활**(범위 밖) · `pnpm-workspace.yaml`의 `allowBuilds`(이월).

### 다음

**Codex가 이 계약을 검토**한다. 승인 후 **Founder가 구현 착수를 별도 승인**해야 한다
(현재 승인 범위 = 계약 작성 + 합성 fake + 로컬 emulator 검증까지).
구현 단위는 **port + Rules 목표 상태 + emulator 검증까지**이며 **UI 연결을 포함하지 않는다.**

## Founder G-1~G-5 승인 기록 — 문서 전용 · READY_FOR_CODEX (2026-08-11)

정본: **`docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`**(승인 원문 수록)
기준 HEAD `3b4ebda`. **문서 전용 — 제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·
`pnpm-workspace.yaml`·`storage.rules`·`firestore.rules`·`firebase.json` diff 0**, 신규 의존성 0,
실제 Firebase/network/live/emulator/운영 데이터 접근 0, upload/write/delete/publish/deploy 0,
자동화 생성 0. **스펙 037 구현 계약·제품 코드 작성 0.**

### 확정된 것

- **G-1 `storage.rules` 최소 변경 승인.** 기존 `admin/{p=**}` **광범위 write 유지 안 함** ·
  legacy `admin/state.json` **읽기 전용 고정** · rebuild 전용 경로만 **생성** 가능하며
  **`resource == null`로 덮어쓰기·삭제 서버 차단** · **겹치는 match의 OR 우회 방지**를 위해
  **상위 admin write도 함께 좁힘** · 쓰기 권한은 **승인된 기존 운영자 UID 한정**(단순 non-anon 전체 아님) ·
  **실제 UID 정본 제공 전 live Rules 배포 차단**.
- **G-2 Firestore 사용 + `firestore.rules` 최소 변경 승인**(C5 검증용).
  **rebuild 전용 head 문서 1개만 가변 정본** · head 변경은 **transaction 안에서
  `expectedBase == 현재 head`일 때만** · **`spaces/{token}` 등 기존 계약 무변경** ·
  **Firestore SDK는 admin 전용 lazy 경계 밖으로 노출 금지**.
- **G-3 C6(Cloud Function/backend/Admin SDK) 미승인 — 예비 대안 보류.**
- **G-4 orphan = head가 참조하지 않는 불변 객체.** 초기 구현에서 **클라이언트 delete 권한·자동 정리 불허** ·
  **보존 기간·비용 한도·정리 주체 별도 승인 전 실제 운영 쓰기 미활성화**.
- **★ G-5 스펙 037 다음 구현 계약 후보 = C5**(고유 불변 Storage 객체 + 단일 Firestore head transaction).
  **C3 고정 경로 CAS·C4 lease/lock 사용 안 함.** C6은 C5가 안전하게 성립하지 않을 때 재검토.
  **허용 범위 = 구현 계약 작성 + 합성 fake + 로컬 Firebase Emulator 검증까지.**
  emulator에서 **동시 저장 · timeout · 늦은 성공 · 브라우저 종료 상당 실패 · 인증 만료 · 중복 탭 ·
  orphan 발생 · head 불변** 검증. **emulator 검증 통과 전 운영 쓰기 미개방.**

### 승인되지 않은 것

실제 Firebase 프로젝트·운영 bucket·운영 데이터·**live network** · **Rules 배포**(UID 정본 전 차단) ·
**Hosting 배포** · **`published/state.json` 발행** · **C6 구현** · **클라이언트 delete·orphan 자동 정리** ·
**실제 운영 쓰기 활성화**(G-4 + G-5 양쪽 전제) · 신규/다중 계정·역할 권한 ·
레거시 `admin/state.json` 공유 쓰기 · legacy `wcm`/`hcm` 되쓰기·삭제·마이그레이션 · **제품 구현 착수**.

### ★ 계약이 반드시 다뤄야 할 결과 (결정 아님 — 사실 보고)

1. **★★ G-1을 배포하면 레거시 운영자 저장 경로가 닫힌다.** `denn-admin.html:740`이
   `uploadDataUrl(dataUrl,'admin/state.json')`으로 저장하는데, 이것이 **현재 운영자의 유일한 저장 경로**다
   (스펙 035: 리빌드 admin은 저장 불가). **지금 깨지지는 않는다** — UID 정본 전 배포가 차단이고
   이번에 `storage.rules`를 수정하지 않았다. 위험은 **배포 시점**에 발생한다 → **배포 순서가 계약 항목**(Z-8).
2. **★ UID 한정의 적용 범위가 열려 있다.** `storage.rules:18-21`의 `op()`는 `admin/`뿐 아니라
   `published/`·`templates/`·`placeholders/`·`guides/`·`mockups/`·`editor-overlays/` write에도 쓰인다(`:35-40`).
   `op()` 전역에 적용하면 레거시 발행(`denn-admin.html:14946`)·자산 업로드까지 UID에 묶인다 → **Z-1**.
3. **★ OR 우회 차단은 `admin/` match 자체를 좁혀야 한다.** 파일 머리말(`:5-7`)이 이미 경고하듯
   현재 `match /admin/{p=**}` write(`:25-28`)가 하위를 전부 덮어 `resource == null`을 무력화한다 → **Z-2**.
4. **★ Emulator 검증은 설정 변경을 수반한다.** `firebase.json`에 **`emulators` 블록이 없고**
   저장소에 `firebase-tools` 의존성이 없다. G-5 범위로 읽히지만 **이번엔 아무것도 수정하지 않았다** → **Z-6**.
5. **L-4(삭제 부활)는 C5로 해소되지 않는다** — 병합 의미론 문제, tombstone 별도 계약 → **Z-7**.

### 다음 — Codex가 작성할 것

**구조 결정 Z-1~Z-8 + 스펙 037 구현 계약.** Z-1 UID 적용 범위 · Z-2 rebuild 경로 위치·형태
(**revision 번호를 경로에 쓰지 않는다**만 확정) · Z-3 head 문서 위치·스키마 · Z-4 write port·오류 코드
(⚠️ SDK 내부 재시도로 "retry 0"이 port만으로 보장 안 됨) · Z-5 `expectedBase` 캡처 시점 ·
Z-6 emulator 검증 범위·허용 파일 · Z-7 L-4 tombstone · Z-8 배포 순서.

### 신규 보호 대상

**`docs/rebuild/design/taste-v2/`는 Founder 소유의 별도 작업이다 — 수정·삭제·stage·commit 금지.**
같은 작업으로 보이는 `docs/rebuild/design/README.md`(수정됨)와
`docs/rebuild/specs/038-page-design-prototype.md`(untracked)도 **손대지 않았다.**
기존 보호 대상(spec-018 PNG 2개 + `packages/render/src/plan/index.ts`)도 그대로 유지한다.
**force push · merge · rebase · `reset --hard` · broad delete 하지 않는다.**

## Claude 원자성 조사 보완 라운드 1 — READY_FOR_CODEX (2026-08-11)

보고서: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`
기준 HEAD `9c57201`. **문서 전용 — 제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·
`pnpm-workspace.yaml`·`storage.rules`·`firestore.rules`·`firebase.json` diff 0**, 신규 의존성 0,
실제 Firebase/network/live/emulator/운영 데이터 접근 0, upload/write/delete/publish/deploy 0,
자동화 생성 0. **스펙 037 계약·제품 코드 작성 0.**
**Founder G-1~G-5 결정은 아직 요청하지 않는다** — 이 정정이 Codex 검수를 통과한 뒤에 요청한다.

### Codex 지적 5건을 정정했다

1. **★ Storage Rules의 객체 부재 판정 — 초판이 틀렸다.** 공식 Rules 참조는 불변성 강제 예로
   **`allow write: if resource == null;`** 을 명시한다(`firebase.google.com/docs/reference/security/storage/`).
   초판의 **"객체 부재 판정 수단 없음 / UNCONFIRMED"** 주장을 **삭제**하고,
   **기존 객체가 없을 때 `resource`가 null이라는 근거**와 **불변 객체 경로에 적용 가능한 규칙**임을
   보고서 §5.1에 기록했다. 교차 확인: `storage/security/rules-conditions`가 `resource`를
   **"the file that *currently exists* at the request path"** 로 정의한다.
   ⚠️ **참조 페이지 본문은 이 세션 WebFetch로 여전히 미취득**(JS 렌더링, `.cn` 미러·`index.html` 포함
   전부 재시도) — **인용 출처는 Codex 검수**이며, 보고서 §4.1이 그 사실과 교차 확인 근거를 함께 기록한다.
   초판의 "본문 미취득" 기록은 **도구 한계이지 문서 부재의 증거가 아니다**로 정정했다.
2. **★ 업로드와 metadata가 반드시 별개 요청이라는 단정 — 틀렸다.**
   `uploadBytes(storageRef, file, metadata)` 형태가 공식 지원되고, 설치된 SDK 소스가
   **metadata JSON이 바이트와 같은 multipart body의 첫 파트**(`index.esm.js:1807-1821`)이고
   resumable에서는 **세션 시작 요청의 body**(`:1865-1876`)임을 보여 준다.
   → **custom metadata는 업로드 동작에 포함될 수 있다**, **`updateMetadata()`를 따로 부른 경우에만
   PATCH가 별개**로 정정했다. **단 업로드에 metadata를 실어도 서버 generation precondition/CAS가
   생기지 않으므로, 공개 API에 조건부 덮어쓰기가 없다는 결론은 유지**한다.
3. **★ Rules 동시성 단정 제거(자기모순 해소).** 초판은 원자성을 UNCONFIRMED라 적으면서 동시에
   "Rules는 동시 요청을 직렬화하지 않는다 / 둘 다 통과한다"고 단정했다.
   **단정과 결정적 타임라인을 삭제**하고, 남긴 것은
   **"공식 문서에서 고정 경로 `rev+1` 검사가 compare-and-set처럼 동작한다는 보장을 찾지 못했다"** 뿐이다.
   **C3 판정 = FAIL → `NOT PROVEN / UNCONFIRMED`.**
   정책 결론: **확인되지 않은 방식으로 쓰기를 열 수 없으므로 F-E 차단을 유지한다.**
   **`resource == null` 불변성 규칙과 고정 경로 revision CAS는 별개 문제**로 분리했다(보고서 §5).
4. **★ C5 이중 트랜잭션 모순 수정.** 초판의 "예약 → 업로드 → 커밋"은 모순이다 —
   예약이 head를 바꾸면 커밋의 `head==base`가 실패하고, 아무것도 기록하지 않으면 두 writer가
   **같은 N을 예약**한다. **A~H 단일 트랜잭션 후보**로 다시 분석했다(보고서 §6.4):
   **A** operation id / content-addressed id 기반 **고유 경로**(revision 번호를 경로에 쓰지 않는다) ·
   **B** Storage Rules `resource == null`로 **덮어쓰기 서버 금지** · **C** 업로드 성공 뒤
   **Firestore 트랜잭션 하나만** · **D** `expectedBase` vs 현재 head 비교 ·
   **E** 불일치 시 **자동 재채택 없이 명시적 충돌 중단** · **F** 일치 시에만
   `head = {revision: expectedBase+1, objectPath, 안전 metadata}` · **G** 한 명만 head 이동, 나머지는
   **orphan** · **H** orphan 정책은 **Founder 결정 유지**.
   **명시**: Firestore 트랜잭션 원자성은 **Firestore 문서 안의 read/write에만** 적용되고
   **Storage 업로드는 트랜잭션에 포함되지 않는다**. 이 설계가 안전할 수 있는 이유는
   **cross-service 원자성 때문이 아니라 immutable 객체를 먼저 만들고 Firestore head만을
   단일 가변 정본으로 삼기 때문**이다. 실제 동시성·Rules 배포·브라우저 종료는 **NOT VERIFIED**이며
   **C5를 PASS나 승인된 구조로 확정하지 않는다.**
5. **★ C6 판정 정밀화.** **GCS `ifGenerationMatch` 메커니즘 자체는 VERIFIED**(실패 시 412 보장,
   `docs.cloud.google.com/storage/docs/request-preconditions`). 그러나 **DENN Cloud Function/backend의
   인증·권한·payload 제한·timeout·재시도·배포·운영 설계가 존재하지 않으므로 "C6 전체 PASS"라고 부르지
   않는다** → **"조건부 쓰기 메커니즘 후보 VERIFIED / DENN end-to-end 구조 NOT DESIGNED·NOT VERIFIED"**.

### 정정 후 결론 (지시된 문구)

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 확인되지 않았다.**
- **기존 client-only + 현재 Rules로 E3-strong이 보장된다는 근거는 없다.**
- **따라서 F-E에 따라 쓰기 구현은 계속 차단한다.**
- **C5와 C6은 추가 권한이 필요한 후보이며 아직 Founder 선택이나 Codex 구조 승인을 받지 않았다.**
- **조사 정정 후에만 Founder G-1~G-5 결정을 요청한다.**

### 남은 UNCONFIRMED / NOT VERIFIED

**UNCONFIRMED**: 고정 경로 `rev+1`의 CAS 보장(§5.2) · 덮어쓰기 `create`에서 `resource`가 채워지는지 ·
`/v0` 표면의 precondition 수용 여부.
**해소됨**: "Storage Rules에 객체 부재 판정 수단이 있는지" → `resource == null`로 **해소**.
**NOT VERIFIED**: C5·C6의 실제 동시성 동작 · `resource == null` 규칙의 실제 배포·거부 · 실제 412 ·
브라우저 종료·네트워크 단절·인증 만료·중복 탭 실거동 · 실제 `admin/state.json` · L-1~L-4 재현 ·
Firestore 번들 실측 · `docs/reference/**` 본문(이 세션 미취득).

### 유지

F-B·F-C·F-D·F-E 무변경. 스펙 036 계약 무변경. 리빌드 쓰기 표면 **0건** 유지.
`firebase.json`의 `hosting.public`은 여전히 `"."` 이라 **deploy 금지 상태 그대로**다.
보호 대상 3개(spec-018 PNG 2개 + `packages/render/src/plan/index.ts`)는
**restore·checkout·stage·commit 하지 않았다.**

## Claude 운영자 저장 원자성 읽기 전용 조사 완료 — 초판 (2026-08-11)

> ⚠️ **이 섹션은 초판(`768eecf`) 기록이다. 위의 "보완 라운드 1"이 아래 5개 항목을 정정했다**:
> ① Storage Rules 객체 부재 판정(→ `resource == null`로 가능) · ② 업로드와 metadata가 반드시
> 별개 요청이라는 단정(→ 같은 요청일 수 있다) · ③ Rules 동시성 단정(→ `NOT PROVEN`) ·
> ④ C5 프로토콜(→ A~H 단일 트랜잭션) · ⑤ C6 판정(→ 메커니즘 VERIFIED / 구조 NOT DESIGNED).
> **상태도 `FOUNDER_DECISION_REQUIRED` → `READY_FOR_CODEX`로 바뀌었다.**
> 아래 원문은 이력 보존을 위해 삭제하지 않는다.

보고서: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`
기준 HEAD `68fe339`. **문서 전용 — 제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·
`storage.rules`·`firestore.rules`·`firebase.json` diff 0**, 신규 의존성 0,
**실제 Firebase endpoint·운영 bucket·emulator·운영 데이터 요청 0**, upload/write/delete/publish/deploy 0,
새 자동화·반복 작업 0. 스펙 037 제품 코드·구현 계약은 **작성하지 않았다**.

### ★★ 결론 — F-E는 해제되지 않았다

**현재 client-only + 기존 Rules 경계에서 E3-strong은 구현 불가능하다.** 따라서 **쓰기 구현을 열지 않는다.**

1. **Firebase Web SDK 12.17.1(`@firebase/storage@0.14.4`)의 공개 Storage 쓰기 API에 조건부 쓰기가 없다.**
   `uploadBytes`/`uploadBytesResumable`/`uploadString`/`updateMetadata`의 인자는 `ref`/`data`/`metadata`
   뿐이고 precondition 파라미터가 **아예 없다**. dist 전량 grep에서
   `ifGenerationMatch`·`ifMetagenerationMatch`·`precondition`·`etag` **0건**.
2. **★ 내부 구현이 그것을 구조적으로 막는다.** `index.esm.js:1413-1414`의 `generation`/`metageneration`
   mapping은 `writable = false`이고 `:1505-1515 toResourceString`이 writable만 직렬화한다 →
   **generation은 요청 body에 실릴 수 없다.** `:1825`/`:1866` 업로드 urlParams는 `{ name }` 뿐,
   `:1752-1764` updateMetadata PATCH에 `If-Match` 헤더 없음.
   `generation`/`metageneration`은 **`FullMetadata` 읽기 필드일 뿐 쓰기 precondition 입력이 아니다.**
3. **★ endpoint가 다르다.** 클라이언트는 `firebasestorage.googleapis.com/v0/...`(`:27`, `:571-577`)로 가고,
   `ifGenerationMatch`가 문서화된 곳은 `storage.googleapis.com` **GCS JSON API**다.
   문서화되지 않은 우회는 **제품 계약으로 쓰지 않는다**.
4. **★ Storage Rules만으로는 안 된다.** Rules는 **요청별 술어**라 두 운영자가 같은 base로 동시에
   `rev+1`을 제출하면 **둘 다 통과**한다. 게다가 공식 정의상 `create`="writes to file contents",
   `update`="updates to (pre-existing) file **metadata**" 라 **콘텐츠 덮어쓰기는 `update`가 아니라
   `create`** 이고, `request.resource`는 **`generation`·`metageneration`·`etag`를 제외**한다.
5. **★ Firestore lock만으로도 안 된다.** cross-service 원자성이 **공식 문서에 존재하지 않는다** —
   업로드 성공 후 revision 갱신 실패 / lease 만료+clock skew / SDK 자동 재시도(업로드 창 **10분**,
   `:37`·`:43`)의 늦은 도착에서 **손실이 남는다**.
6. **열린 길은 둘뿐이고 둘 다 새 권한이 필요하다.**
   **C5** = Firestore head 포인터(CAS) + **revision별 immutable 객체**(덮어쓰기 0) → 신규 의존성 0
   (Firestore가 이미 `firebase@12.17.1` 안에 있다)이지만 **`firestore.rules` 변경 필수**
   (현재 catch-all `allow read, write: if false`가 새 컬렉션을 전부 거부) + orphan 정리 정책 필요.
   **C6** = 서버/Cloud Function이 GCS JSON API `ifGenerationMatch`로 쓰기 → 문서상 가장 확실(412)이나
   **client-only 경계를 벗어나고** 저장소에 함수 기반이 **전혀 없다**.
7. **★ 원자성은 L-4(삭제 부활)를 고치지 않는다.** 그건 병합 의미론 문제이며 tombstone 계약이 따로 필요하다.

### 공식 근거 (전부 2026-08-11 확인, Firebase/Google 문서만)

GCS `request-preconditions`(4종 precondition은 **JSON/XML API·gcloud·서버 라이브러리** 표면,
`ifGenerationMatch=0`=부재 시에만, 실패 **412**, **Firebase Web SDK 언급 없음**) ·
`json_api/v1/objects/insert` · `storage/docs/metadata`(**generation은 서버 할당이고 단조 증가가 아니다**) ·
`storage/docs/consistency`(strong read-after-write, **동시 쓰기 승자는 미문서화**, 회피책은 "use preconditions") ·
Firebase `storage/web/file-metadata`(**generation/metageneration 읽기 전용**) · `storage/web/upload-files` ·
`storage/security/core-syntax`(**create/update 정의**) · `storage/security/rules-conditions`
(**request.resource는 generation/metageneration/etag 제외**) · `rules/rules-language` ·
`firestore/manage-data/transactions`(**Firestore 밖 서비스 트랜잭션 서술 없음**).
⚠️ `docs/reference/js/storage*`·`docs/reference/security/storage`는 JS 렌더링이라 **본문 미취득** —
그 자리를 설치된 `storage-public.d.ts`로 대체했고 보고서 §3.1에 그렇게 기록했다.

### UNCONFIRMED

Rules 평가와 object write의 **원자성** · 덮어쓰기 `create`에서 `resource`가 채워지는지 ·
Storage Rules의 "객체 부재" 판정 수단 · `/v0` 표면이 precondition 쿼리를 수용하는지 ·
참조 문서 3페이지 본문. **NOT VERIFIED**: C5·C6의 실제 동시성 동작(실행 0) · 실제 412 ·
Rules 실제 배포·거부 · 실제 `admin/state.json` · L-1~L-4 재현 · Firestore 번들 실측.

### STOP — Founder 결정 (승인된 적 없음)

**G-1** `storage.rules` 변경 승인 · **G-2** Firestore 사용 + `firestore.rules` 변경 승인 ·
**G-3** backend/Cloud Function 승인 · **G-4** 운영 비용·orphan 복구 정책 ·
**★ G-5** C5(Firestore) / C6(backend) / **"쓰기를 계속 열지 않는다"** 중 택일.

### Codex 구조 결정 후보 (미결)

**Y-1** revision 형식(generation은 카운터로 못 씀) · **Y-2** 격리 경로 —
**경로 형태와 원자성 전략은 함께 정해야 한다**(단일 고정 경로를 고르면 C5가 성립하지 않는다) ·
**Y-3** port 경계(⚠️ SDK 내부 재시도 때문에 "retry 0"이 port만으로 보장되지 않는다) ·
**Y-4** 충돌 오류 코드 · **Y-5** 합성 fake 검증 범위(동시성은 재현 가능, **서버 원자성은 증명 불가**) ·
**Y-6** L-4 tombstone · **Y-7** orphan 식별·정리.

### 유지

F-B·F-C·F-D·F-E 무변경. 스펙 036 계약 무변경. 리빌드 `apps/**`·`packages/**`의 **쓰기 표면 0건** 유지.
`firebase.json`의 `hosting.public`은 여전히 `"."` 이라 **deploy 금지 상태 그대로**다.
알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않았다.**

## Claude 스펙 033 구현 완료 — READY_FOR_CODEX (2026-07-31)

계약 `4ee162e`를 정본으로 허용 파일 안에서만 구현했다. 구현 커밋 **`4246503`**, 종료 문서는 별도 커밋.

### 구현한 계약

- **E-1/C-1** plan 인스턴스를 **그대로 전달**한다. 재빌드·재측정·prewrapped 입력·plan 좌표 scaling **0**.
  `draw-text`의 `lines`가 확정값이라 **재wrap될 여지가 구조적으로 없다** → **P-6이 성립**한다.
  unit이 **plan identity(`toBe`)** 와 **JSON 직렬화 전후 불변**을 고정한다.
- **transform** identity에서 `setTransform(s,0,0,s,0,0)` **정확히 한 번**(`a===d`, 나머지 0).
  `outputHeight/logicalHeight`와 어긋나면 **`NON_UNIFORM_SCALE` fail-closed**.
- **순서** 크기 지정 → setTransform → executor → (**ok일 때만**) `toBlob` → URL → 다운로드. 호출 로그로 고정.
- **P-3** executor 실패·`blob === null`·`toBlob` throw(taint) 전부 **파일 0, retry 0**.
- **URL 수명** 생성자가 revoke, 살아 있는 URL **최대 1개**, 교체·unmount·dispose 정리
  (E2E: 3회 export → created 3 / revoked 2).
- **E-4/E-5/E-6** 파일명 `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`, 주문 CTA와 분리,
  `aria-describedby`, **수치 비노출**(E2E가 print 영역 텍스트에 숫자 0개임을 확인).

### ★ Codex에 보고할 관측 2가지

1. **E-3 재검사는 현재 상수로 도달 불가능하다.** upscale은 총 픽셀 최대 `3000×3000 = 9MP`라 36MP 천장을
   넘을 수 없고, downscale은 총 36MP라 긴 변이 최소 `sqrt(36M) = 6000`이라 3000 바닥을 깰 수 없다.
   **가드는 유지**했다(상수 변경 시 의미가 생기고, 레거시가 재검사하지 않아 생긴 문제를 막는 지점).
   불가능성과 그 이유를 unit으로 고정했다.
2. **★ 카탈로그 `aspect`와 cm 비율이 다르면 인쇄가 나오지 않는다.** 스펙 032가 이 불일치를 **자동 수정
   하지 않고 진단 후보로만** 남겼으므로, export는 축별로 다른 배율로 **고객이 승인한 배치를 왜곡하는 대신
   `NON_UNIFORM_SCALE`로 실패**한다. E2E 전용 테스트 있음.
   → **운영자 cm 입력 UI 스펙에서 이 불일치 처리 결정이 필요하다.**

### 게이트

frozen install(lockfile diff **0**) · format · lint(`--error-on-warnings`) · typecheck **PASS**,
unit **1174/1174**(032 시점 1109 → **+65**), 독립 build **PASS**,
전체 Chromium E2E **129/129**(032 시점 116 → **+13**),
고객 dist SHA-256 E2E 전후 **동일**(`9273f59b…a1580b`), `git diff --check` 클린,
ports 4183/4184 LISTENING **0**, OS temp `denn-e2e-*` **0**.

### 범위 준수

`packages/render/**`·`packages/shared/**`·`apps/admin/**`·`canvas/surface.ts`·image binding owner·
placement·geometry·운영 HTML·manifest·lockfile·신규 의존성 변경 **0**.
upload·order payload·IndexedDB order·Kakao·Firebase·network·live·deploy **0**
(E2E가 POST/PUT/PATCH·kakao·popup **0건**을 확인).
알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**.

### NOT TESTED

실제 인쇄물·인쇄소 수용성(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) ·
실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 · 잔류 프로세스 command-line.

**P-4a에 따라 업로드·주문 전송·배포는 계속 금지**다. 산출물은 **시험용 로컬 PNG**다.

## Founder E-4·E-5·E-6 일괄 승인 기록 — 문서 전용 (2026-07-31)

정본: `docs/codex-claude-handoff/decisions/2026-07-31-local-png-export-ui-decisions.md`
승인 문장(원문): `로컬 액자 PNG export Founder 권장안 E-4·E-5·E-6을 일괄 승인하고 자동화를 계속 진행해.`
기준 HEAD `5480e54`. 제품 코드·테스트·CSS·설정·lockfile diff **0**, 신규 의존성 0,
실제 network·live·Firebase·업로드·주문 전송·배포 **0**.

### ⚠️ 절차 기록

조사 보고서 §9는 E-4·E-5·E-6을 **"결정 필요" 항목으로만** 올렸고 **권장안을 명시하지 않았다**
(스펙 032의 P-1~P-6과 다른 점). 자동화를 멈추지 않기 위해 **이미 확정된 제약(P-5c·P-4a·
`PREVIEW_MESSAGES` 규율)에서 도출한 권장안을 명시하고 그것을 승인분으로 기록**했다.
**Founder 의도와 다르면 결정 문서만 정정하면 된다** — 제품 코드는 아직 없다.

### 확정된 것

- **E-4 파일명** `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png`.
  **고객 문구·id·token 0**(파일명도 저장·전송이므로 P-5c 적용).
  **사이즈 이름 대신 cm** — 이름은 운영자가 바꾸면 같은 물건의 파일명이 달라지지만 cm은 물리적 사실이고
  인쇄소가 실제로 쓰는 정보다(P-2와 같은 방향). 레거시 `Date.now()` epoch 대신 **읽을 수 있는 로컬 시각**.
- **E-5 UI** 미리보기 아래 **독립 영역**, **카카오 주문 CTA와 분리**(P-4a로 주문 전송이 차단인데
  주문 버튼 옆에 두면 오해 — 레거시 V36은 다운로드·주문 저장·카카오를 한 흐름으로 묶었다).
  버튼 **`인쇄용 파일 내려받기`**(**"주문"이라는 말 금지**), 실패 문구에 **"다시 시도" 금지**
  (자동 retry 0 · 같은 조건이면 같은 결과). 비활성 사유는 **고정 문구 + `aria-describedby`**
  (`disabled`만 두면 스크린리더가 이유를 못 읽는다). 미리보기 미완성 사유는 **기존 `PREVIEW_MESSAGES` 재사용**.
- **E-6 임시 상수** **수치 비노출.** `300dpi`·`3000`·`36M`·결과 픽셀 크기 전부 고객 UI에 표시하지 않고
  **`인쇄 설정은 인쇄소 확인 전 임시값입니다.`** 한 줄만 밝힌다. P-4a가 요구한 것은 **"임시값 명시"**이지
  **"수치 노출"**이 아니며, 수치는 인쇄소 확인 후 바뀔 예정이라 기억하면 오히려 혼란이 된다.

### ★ 이 승인만으로는 구현을 시작할 수 없다

**E-1(= C-1 인쇄 좌표 방법 A/B/C)·E-2·E-3은 Codex 결정이며 여전히 미결**이다.
구현 계약(`docs/rebuild/specs/NNN-*.md`)이 Git 히스토리에 기록되기 전까지
인쇄/export 제품 코드·테스트·CSS·설정을 **작성하지 않는다**.

### 여전히 미결

C-1(E-1) · E-2 · E-3(Codex) · **F-A~F-E(admin 인증·쓰기·발행, 이 결정과 독립)** ·
인쇄소 요구 전체(외부 확인, P-4a 차단 유지) · 케이스 인쇄 · C-2~C-8 ·
**스펙 032 조사 보고서 Codex 재검토 미완**.

## Claude 로컬 액자 PNG export 연결부 읽기 전용 조사 완료 — READY_FOR_CODEX (2026-07-31)

보고서: `docs/codex-claude-handoff/reviews/2026-07-31-local-frame-png-export-seam-investigation.md`
지시: `aaf9268` · 선행 조사 `918ee9e`(Codex 승인)
**문서 전용. 제품 코드·테스트·CSS·설정 diff 0**, 신규 의존성 0,
**실제 network·live·Firebase·업로드·주문 전송·배포 0**.

### 핵심 관측 4개

1. **★★ export가 `logicalWidth`를 바꾸면 P-6이 깨진다.** frame plan의 논리 폭은 **측정된 CSS 폭**에서
   나오고(`resolveFrameLogicalWidth`, 상한 `FRAME_MAX_LOGICAL_WIDTH=500`), 폰트 크기·wrap 폭이 **전부
   그 폭의 %**다(`PreviewComposer.tsx:631-639`). 인쇄 폭으로 재빌드하면 **재측정 → 재wrap**이라
   줄바꿈이 달라질 수 있다. **줄바꿈 동일성의 구조적 보장 = plan을 그대로 두고 transform만 걸기**.
2. **★ 그 transform 패턴은 이미 검증돼 있다.** `surface.ts:151`이 매 draw마다
   `setTransform(dpr,0,0,dpr,0,0)` 후 **같은 plan을 같은 executor로** 실행한다. 인쇄는 `dpr` 자리에
   `printScale`이 들어가는 **같은 구조**이며, 레거시도 `drawImageT(..., dim.w/500)`으로 사실상 같은 일을
   했다(그 **500이 리빌드의 `FRAME_MAX_LOGICAL_WIDTH`와 같은 수**).
3. **★ 그러나 `surface.ts`는 재사용 불가.** 관측 CSS 크기가 `plan.logicalCanvas`와 **0.5px 이내**여야
   하고 아니면 `failed`다(`:110-117`). 인쇄는 정의상 크기가 다르므로 **별도의 얇은 실행 경로** 필요.
   (이 불변식을 인쇄 때문에 완화하면 미리보기 보호가 약해진다 → `surface.ts` 수정은 비권장)
4. **★ 지금 붙일 seam이 없다.** `plan`·`imageBindings`는 `PreviewComposer` 내부 `useMemo` 지역값이고
   밖으로 안 나간다. 리빌드 전체에 `toBlob`·`toDataURL`·다운로드 **0건**.
   다만 **`plan !== null` 자체가 "art·user image·font 준비 완료"의 증명**이므로
   (`:613-630` 게이트) export가 **별도 준비 판정을 만들면 두 번째 진실 원천**이 된다.

### 나머지 관측

- **taint**: 고객 사진=object URL(same-origin), 아트 `data:`=안전, `firebase-download-image`만
  `crossOrigin="anonymous"` **src 이전 설정**(`templateArtBinding.ts:217-220`)이고 **anonymous 실패를
  재시도하지 않는다**(`:214`) — 재시도했다면 tainted → 인쇄 0×0. 그래도 `toBlob`은 `SecurityError`를
  던질 수 있어 **반드시 감싸야** 한다.
- **`toBlob` 순서**: executor `ok` 확인 → **ok일 때만** `toBlob`. `blob===null`·throw는 **파일 0개**.
  레거시는 반대로 아트 로드 실패를 `warnings`에 넣고 **아트 빠진 PNG를 주문까지 보냈다**(P-3 위반).
- **object URL**: 레거시는 **800ms 타이머** 해제라 탭이 닫히면 누수, 느린 기기에선 조기 해제 위험.
  → **생성한 쪽이 해제 + 살아 있는 URL ≤1**(스펙 031 시계 타이머 규율과 동형).
- **physical size `null`/error**: 버튼 **비활성 + 고정 문구**(코드·수치 노출 금지). `disabled`만으로는
  이유를 못 읽으므로 **`aria-describedby` 연결이 사실상 필수**.
- **provisional 계산**: `CONFIG` = `dpi 300 / minLongSide 3000 / maxPixels 36,000,000 /
  fallbackLongSide 3508`(`denn-mockup-tool.html:11242-11248`).
  **★ `fallbackLongSide` 분기는 재현 금지**(cm 없으면 인쇄 미생성 = P-2). 나머지는 **순수 함수**로
  분리 가능(`Date.now`·`random`·DOM 없음). 함정: **min 업스케일과 maxPixels 다운스케일이 서로 싸울 수
  있고 레거시는 재검사하지 않는다** → fail-closed면 그 경우 실패해야 한다. 하한 `900`도 근거 없는 상수.
- **동일성 검증**: plan을 재빌드하지 않으면 lines/rotation/pan/layer 비교는 **동어반복**이므로 초점은
  **"정말 같은 plan이 쓰였는가"**. unit=주입 fake로 plan 깊은 비교·JSON 직렬화 불변·transform uniform
  (a==d, b==c==0)·호출 순서·실패 시 `toBlob` 호출 **0회**, E2E=정규화 픽셀 비교 + **두 번 export 바이트 동일**.
- **hard boundary**: 업로드·주문 payload·**IndexedDB 주문 저장**·**카카오 열기**·실제 network·
  **고객 문구 텍스트 저장/전송** 전부 경로 밖. 레거시 V36(`:9732`)은 이 넷을 **한 함수에 묶어** 두었다.
  ⚠️ 레거시에 `framePrintSize`가 **두 개**이고 **주문 버튼에 연결된 V36은 cm을 전혀 안 본다**
  (하드코딩 `longSide=3000`) — **NOT VERIFIED**(실행 확인 안 함).

### STOP

**Codex**: **★E-1 C-1 확정**(§2가 uniform transform에 유리한 근거를 모았으나 **선택은 하지 않았다**) ·
E-2 비정수 배율·자간·clip 반픽셀을 구현 전 측정할지 · E-3 minLongSide↔maxPixels 충돌 시 실패 처리.
**Founder**: E-4 파일명 규칙(P-5c와 닿음) · E-5 다운로드 UI 위치·문구·비활성 사유 한국어 ·
E-6 provisional 상수를 UI에 노출할지.

### NOT VERIFIED

§2.5의 세 가지 픽셀 위험(비정수 배율·자간 품질·clip 반픽셀, **측정 안 함**) ·
레거시 주문 버튼이 실제 V36 경로를 쓰는지 · 실기기 `toBlob` 한계 · 대용량 이미지 메모리·성능 ·
인쇄소 요구 전체.

### 유지

스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다.**
스펙 032 조사 보고서 **Codex 재검토 여전히 미완**. Founder **F-A~F-E(admin 인증·쓰기·발행)는 이
조사와 독립**이며 미결 — 이번 범위는 P-4a가 허용한 **로컬 생성·다운로드·E2E뿐**이다.

## Claude admin 쓰기 경계 읽기 전용 조사 완료 — READY_FOR_CODEX (2026-07-31)

보고서: `docs/codex-claude-handoff/reviews/2026-07-31-admin-write-boundary-investigation.md`
지시: `802a486` · 선행 조사 `1aae91d`(Codex 승인)
**문서 전용. 제품 코드·테스트·CSS·설정 diff 0**, 신규 의존성 0,
**실제 Firebase·network·live·emulator 실행 0**, Rules·config·배포 변경 0.

### 핵심 관측 4개

1. **인증 경계는 이미 확정돼 바꿀 게 없다.** `storage.rules`가 `admin/`을 **non-anonymous만
   read+write**로 잠갔다(`op()`, 20 MiB cap). 리빌드는 재현이 아니라 **만족**시키면 된다.
   ⚠️ 레거시 `dennCloudSaveAdminV`는 미인증 시 **조용히 return**한다 — 이 침묵은 계승 금지.
2. **★ write port를 실제 network 없이 검증할 선례가 이미 있다.**
   `public-catalog/reader.ts` = **주입 transport(`FetchLike`) + 안전 오류 계약 + 100% 합성 테스트**,
   live는 `*.live.test.ts`로 `vitest.config.ts:17`에서 **기본 게이트 제외**. write도 같은 형태면 된다.
3. **★★ 레거시 admin 동기화는 사실상 last-writer-wins다.** `__cloudRev = Date.now()`는 **벽시계**이고
   upload 전 **원격 rev 재확인이 없다**. 손실 경로 4개(L-1 시계 역전 / L-2 디바운스 내 겹침 /
   L-3 rev 동일 시 분기 고착 / **L-4 개수 점수 union이라 `frameSizes`는 tombstone이 없어 삭제 부활**).
   **L-4는 cm UI와 직접 충돌** — 지운 사이즈가 되살아나면 **cm 없는 인쇄 불가 사이즈가 돌아온다**.
4. **★ publish는 별개의 두 번째 쓰기다.** `dennPublishState`가 `window.S`에 localStorage의
   `roomBackgroundSettings`를 덮어쓰고 base64를 내용해시 경로로 외부화해 발행한다 →
   **발행본과 `admin/state.json`은 같은 바이트가 아니고 순서도 무관**하다.
   레거시에는 **"발행 안 된 변경"을 알리는 장치가 없다.**

### 지시된 후보 검토

- **`wcm`/`hcm` 정규화안**(canonical 없을 때만 승격, 둘 다 있고 다르면 fail-closed):
  legacy pair는 **운영자 명시 입력 필드**라 **P-2와 충돌하지 않고**, 조용한 우선순위가 없어 타당하다.
  남는 문제 3개 — **W-1** `parseFloat(...)||1`이라 무효 입력이 **1 cm**로 저장돼 있을 수 있다 ·
  **W-2** `aspect`와 어긋난 값을 그대로 canonical로 승격시킨다 · **W-3** snapshot을 저장에 되쓸지.
  → 정규화 시점에도 `> 0`·`<= 500` **재검증 필수**, `aspect` 불일치는 **진단으로 남겨야 한다**.
- **`sub` 독립 유지안**: `sub`는 인쇄에 영향이 없으므로(P-2) 자동 덮어쓰기는 **이득 없이 운영자 입력만
  지운다**. 독립 유지가 안전하다.
- **재현 금지 5종 확정**: `sub` 정규식 prefill · `wcm=21` 날조 기본값 · `parseFloat||1` ·
  `confirmEditSz`의 cm 미저장 · 미인증 조용한 return.

### STOP — Founder 승인 (Firebase 표면 = 자동 진행 금지)

**F-A** Auth 도입 여부·시점·계정 · **F-B** 쓰기 범위(`admin/state.json`만 vs 발행까지) ·
**★ F-C** 리빌드 admin이 레거시와 **같은 `admin/state.json`을 공유할지 격리할지**(공유하면 레거시
스키마 100% 왕복 보존 필요, 격리하면 데이터 분기) · **F-D** 정규화 snapshot 되쓰기 여부 ·
**F-E** §2.4 손실 시나리오 허용 여부(막으려면 조건부 쓰기/잠금 = 범위 확대)

### Codex 구조 결정

**X-1** revision 모델(벽시계 계승 / 단조 정수 / 병행 — **벽시계가 L-1의 원인**) ·
**X-2** 충돌 시 자동 병합 vs fail-closed · **X-3** `frameSizes` tombstone 도입 여부 ·
**X-4** write port 형태와 **경로 allowlist** · **X-5** 정규화 검증 재적용 범위 ·
**X-6** 조사 `1aae91d`의 **STOP 4(A/B/C)** 는 이번 지시가 흡수했으나 **명시 답이 아직 없다**

### NOT VERIFIED

L-1~L-4 손실 시나리오(소스 기반 구조적 결론, **재현 안 함**) · 실제 `admin/state.json`·
`published/state.json` 내용과 크기 · 실제 Storage rules 거부 동작 · 레거시 admin UI 실행 확인.

### 유지

스펙 032 P-1~P-6, 선행 029/030/031 확정분 **무변경**. **C-1은 고르지 않았다.**
스펙 032 조사 보고서 **Codex 재검토 여전히 미완**. `firebase.json`의 `hosting.public`은 여전히
`"."` 이라 **deploy 금지 상태 그대로**다.

## ⚠️ STATE yaml 헤더 정정 (2026-07-31, 문서 전용)

`1aae91d` 시점의 yaml 헤더가 **`state: CODEX_PASSED` · `next_transition: READY_FOR_COMMIT`** 로
남아 있었다. 이는 **이미 종료된 스펙 032**를 가리키는 값이고, 아래 서술 섹션·`NEXT_CLAUDE_PROMPT.md`
(`READY_FOR_CODEX`)와 **모순**됐다.

**원인**: Codex가 작업 트리의 STATE yaml을 `CODEX_PASSED`로 바꿔 둔 뒤에, Claude가 종료 문서를
쓰면서 **자기가 이전에 쓴 문자열**(`state: READY_FOR_CODEX …` → `COMMITTED` → …)을 기준으로 치환해
**두 줄만 조용히 no-op** 됐다. 같은 커밋의 다른 필드(`completed_unit`·`active_unit`·`verified_commit`·
`origin_relation`)는 전부 정상 반영됐고, **커밋된 서술 내용과 조사 보고서에는 오류가 없다.**

**정정**: yaml 헤더를 서술·NEXT와 일치하도록 `READY_FOR_CODEX` / `CODEX_VERIFYING`으로 맞췄다.
`working_tree`에 content diff 0인 `packages/render/src/plan/index.ts`도 함께 명시했다.

**교훈**: Codex와 공유하는 문서는 **치환 대상 문자열의 존재를 단언(assert)** 하고 바꾼다.
치환 실패를 조용히 넘기면 상태 기계가 **가짜 상태로 진행**할 수 있다.

**제품 코드·테스트 변경 0.** 스펙 032는 `8a4ed09`에서 이미 정상 종료(DONE)됐고 이 정정으로 바뀌지 않는다.

## Claude 운영자 cm 입력 UI 읽기 전용 조사 완료 — READY_FOR_CODEX (2026-07-31)

보고서: `docs/codex-claude-handoff/reviews/2026-07-31-operator-cm-input-ui-investigation.md`
**문서 전용. 제품 코드·테스트·CSS·설정 diff 0**, 신규 의존성 0, 실제 network/live/Firebase/deploy 0.

### 핵심 발견 3개

1. **★ 리빌드 admin에 아무것도 없다.** `apps/admin/src`는 **3파일 79줄**의 스펙 011 프리미티브
   데모 셸이고, 카탈로그·저장·인증이 전부 없다. 리빌드 전체에 **쓰기 경로 0건**이며
   `packages/firebase`는 `FIREBASE_NOT_IMPLEMENTED`로 경계를 명시한다. 읽기도
   `published/state.json` 하나뿐이고 `admin/state.json`은 **읽지도 쓰지도 않는다**.
   → "입력란 두 개"가 아니라 **최초의 운영자 기능 + 최초의 쓰기 경로**다.
2. **★★ 레거시에 이미 명시적 cm 필드 `wcm`/`hcm`이 있다**(`denn-admin.html:1698`이 저장,
   `denn-mockup-tool.html:11302`가 **1순위**로 읽음). 스펙 032가 고른
   `printWidthCm`/`printHeightCm`은 레거시 후보 **6순위**라 하위호환은 안전하지만,
   **운영자가 실제 값을 넣어온 필드는 `wcm`/`hcm`** 이다. 지금 리빌드는 이를 `UNKNOWN_FIELD`
   경고로 흘리고 projection이 **`null`(=인쇄 불가)** 을 낸다 → **마이그레이션 결정 필요**.
3. **★ 레거시 사이즈 "수정"이 cm을 저장하지 않는다.** `confirmEditSz`가 `aspect`만 갱신하고
   `wcm`/`hcm` 대입이 없다 → **aspect와 cm이 조용히 어긋난다**. `editSz`는 `sub` 정규식 파싱과
   **`wcm=21` 날조 기본값**으로 폼을 채운다. 스펙 032가 NOT TESTED로 남긴 "aspect↔cm 불일치"의
   **실제 발생 메커니즘**이며, 새 UI가 **재현하면 안 되는** 동작이다.

### STOP — 결정 필요 (저장소 쓰기 없이 보고만)

| # | 항목 | 누가 |
| --- | --- | --- |
| STOP 1 | admin에 **인증·쓰기·발행**을 이번에 도입할지, 쓰기 없는 검증 단위로 쪼갤지 (Firebase 표면 = 자동 진행 금지) | **Founder** |
| STOP 2 | 기존 `wcm`/`hcm` 처리: 마이그레이션 / read가 함께 인정 / 무시하고 재입력 | **Founder + Codex** |
| STOP 3 | `sub` 텍스트를 cm에서 파생할지 독립 편집할지 | **Founder** |
| STOP 4 | 저장 경로 후보 A(검증만) / B(로컬 초안) / C(실제 쓰기) 택일 | **Codex** |
| STOP 5 | 레거시 `confirmEditSz` 동작 재현 금지를 스펙에 명시할지 | **Codex** |

### NOT VERIFIED

실제 `published/state.json`·`admin/state.json` 내용(실제 network 금지) — `wcm`/`hcm`이 실제 몇 건인지
모른다. 레거시 admin UI를 **실행해 보지 않았다**(근거는 전부 소스).

### 유지

스펙 032 P-1~P-6과 선행 029/030/031 확정분 **무변경**. **C-1은 여전히 Codex 결정이며 고르지 않았다.**
스펙 032 조사 보고서에 대한 **Codex 재검토는 여전히 미완** — 전제가 뒤집히면 STOP 2도 다시 열린다.

## Claude 스펙 032 종료 — DONE / COMMITTED (2026-07-31)

Codex가 `315356a`를 독립 검증해 **CODEX_PASSED**했다. 기능 코드·테스트는 **추가 수정 0**이고
종료 문서만 별도 fast-forward 커밋으로 처리했다.

### Codex 최종 검증 결과

| 게이트 | 결과 |
| --- | --- |
| frozen install / format / lint / typecheck / build | PASS |
| unit | **1109/1109 PASS** |
| Chromium E2E | **116/116 PASS** |
| `git diff --check`, forbidden diff, ports 4183/4184, OS temp staging | PASS |

알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다.

### 종료된 계약

- `frameSizes[].printWidthCm`·`printHeightCm` — all-or-nothing, finite·`> 0`·`<= 500`,
  위반은 **없는/틀린 쪽 path의 `INVALID_NUMBER` fail-closed**. 둘 다 없는 기존 카탈로그는 무회귀
- `projectFramePrintPhysicalSize` → `{widthCm,heightCm}` 또는 `null`만. `null`은 "아직 인쇄 불가"이지
  "기본값을 쓰라"가 아니다
- 이름·`sub`·label·id·`aspect`·논리 `w`/`h` → cm 추론 경로 **0** (unit으로 고정)

### NOT TESTED

실제 발행 카탈로그의 cm 필드(아직 없음 — 전부 합성 fixture) · `aspect`↔cm 비율 불일치 진단 ·
잔류 프로세스 command-line

### 다음 — 읽기 전용 조사

계약 §후속 순서 2의 **운영자용 cm 입력·검증·저장 UI**(`apps/admin/**`) 조사로 자동 전환한다.
**제품 코드 변경 0**이며, 스펙과 Founder 결정이 나오기 전에는 구현하지 않는다.

**여전히 미결**: C-1 인쇄 좌표 방법(후보 A/B/C, Codex 결정) · 인쇄소 요구 전체(외부 확인) ·
케이스 인쇄(P-1 분리) · C-2~C-8 · **조사 보고서 자체에 대한 Codex 재검토 미완**.

## Claude 스펙 032 구현 완료 — READY_FOR_CODEX (2026-07-31)

`docs/rebuild/specs/032-frame-print-physical-size-catalog.md`(계약 `2a0cfd3`)를 정본으로
허용 파일 안에서만 구현했다. 구현 커밋 **`c10e7a6`**, 기준 HEAD `2a0cfd3`.

### 구현한 계약

1. **catalog read** — `frameSizes[].printWidthCm`·`printHeightCm`을 allowlist에 추가하고
   `validatePrintSizeCm`으로 검증한다. 두 필드는 **함께 있거나 함께 없어야** 하며 각각 finite,
   `> 0`, `<= 500`이다. 한쪽만 있으면 **없는 쪽 path**로 `INVALID_NUMBER`를 낸다(추측·보정 0).
   둘 다 없는 기존 카탈로그는 **그대로 읽힌다**(UNKNOWN_FIELD 경고도 없다).
2. **projection** — `projectFramePrintPhysicalSize(document, frameSizeId)`는 `{widthCm,heightCm}`
   또는 `null`만 반환한다. 기존 preview projection의 `lookupById`·`run`·`fail` 규율을 재사용해
   중복·누락·malformed id를 식별정보 없이 실패시킨다. 각 필드는 **정확히 한 번만 읽어** drifting
   getter가 검증된 값을 바꿀 수 없다.
3. **금지된 추론 0** — 이름·`sub`·label·id·`aspect`·논리 `w`/`h` 중 어느 것도 cm로 쓰지 않는다.
   `aspect`만 있고 한쪽 cm만 있는 입력은 **보완하지 않고 실패**한다.

### 게이트

- frozen install `Already up to date`, lockfile diff **0**
- format / lint(`--error-on-warnings`) / typecheck: **PASS**
- unit **1109/1109 PASS** (스펙 031 시점 1088 → **+21**)
- 독립 build: **PASS**
- 전체 Chromium E2E **116/116 PASS** (신규 E2E 없음 — 이번 단위는 순수 계약)
- 고객 dist SHA-256 E2E 전후 **동일**(`74427f72…c9644c`)
- `git diff --check` 클린(CRLF 경고만), ports 4183/4184 LISTENING **0**, OS temp `denn-e2e-*` **0**

### 범위 준수

- `apps/**`, `packages/render/**`, 실제 print/export, PNG 생성, 주문 payload, 이름 파싱,
  fallback 치수, lockfile·의존성: 변경 **0**
- Firebase/Rules/CORS/Hosting/deploy, 실제 network/live, 운영 데이터·secret: **0**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**

### NOT TESTED

- 실제 발행 카탈로그에 cm 필드를 넣은 사례(아직 존재하지 않는다 — 운영자 입력 UI는 후속 스펙)
- `aspect`와 cm 비율의 불일치 진단(계약상 이번 단위에서 자동 수정하지 않는다)
- 잔류 프로세스 command-line

## Codex 스펙 031 보완 라운드 1 재검증 — CODEX_PASSED (2026-07-31)

대상 `b7d46d3`을 독립 재검증했다.

- frozen install, format, lint, typecheck: PASS
- unit: 1088/1088 PASS
- 독립 build: PASS
- Chromium E2E: 116/116 PASS
- `git diff --check`, lockfile·금지 범위: PASS
- ports 4183/4184, OS temp staging 잔류: 0
- 잔류 프로세스 command-line: NOT TESTED

시계 mat 좌표, 선언된 custom image 실패 시 overlay 숨김, requested font availability fail-closed
세 계약이 보완됐다. Claude는 기능 코드를 더 수정하지 않고 스펙 031 종료 문서만 별도
fast-forward commit/push한다. 다음 스펙은 자동 시작하지 않는다.

## Codex 스펙 031 독립 검증 — CORRECTION_REQUIRED 라운드 1 (2026-07-31)

대상 코드 `78095f8`, 문서 `78acdf6`. frozen, format/lint/typecheck, unit 1081/1081,
build, Chromium E2E 114/114, diff check, lockfile·금지 경로 0, ports/temp를 통과했다.

승인 차단 결함:

1. clock `x/y/size` percent를 전체 canvas wrapper에 적용한다. 정본과 레거시는 frame band 안의
   **mat rect** 대비 percent라서 frame band가 있으면 실제 부착 위치가 어긋난다.
2. custom clock image source 해석 실패를 `HH:MM`으로 fallback한다. 명시된 물리 하드웨어 종류를
   바꾸는 잘못된 복구이며 resolve/load 실패 시 overlay만 숨겨야 한다.
3. `document.fonts.ready`만 기다리고 요청 family를 `FontFaceSet.check`로 확인하지 않으며,
   FontFaceSet 부재도 ready로 처리한다. system fallback 측정으로 wrap이 달라질 수 있다.

보완은 위 세 계약의 composer/clock/CSS/unit/E2E 및 관련 문서만 허용한다.

## Codex 스펙 031 구현 계약 작성 완료 (2026-07-31)

Founder 결정 정본 `e3dc2b1`을 입력으로
`docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`를 작성했다.

- C-1~C-7·C-9~C-11 승인, C-8은 시계를 plan 밖 DOM preview overlay로 확정
- `maxChars` 1..200/기본 80 UTF-16 code unit, `maxLines` 1..5/기본 2
- custom clock image timer 0, text fallback은 분 경계 + 60초 갱신
- 상태 `WAITING_FOR_CLAUDE`; Claude만 허용 범위에서 구현

## Codex 스펙 031 조사 보완 재검토 — 승인 및 Founder 결정 대기 (2026-07-31)

보완 커밋 `7636367`은 시계의 제품 의미를 `UNCONFIRMED`로 정확히 낮추고, 결함·인쇄 포함 권장 단정을
제거했으며, 하드웨어 미리보기와 인쇄 그래픽의 구현 범위를 분리했다. 허용 문서 5개만 변경했고
`git diff --check`를 통과했으며 HEAD=origin, ahead/behind 0/0이다. 제품 코드 변경은 0이다.

Codex는 C-1~C-7·C-9~C-11의 구조 방향을 조사 근거와 일치하는 것으로 승인한다. C-8 시계 표현은
Founder F-4에 종속한다. 구현 전 Founder가 F-1~F-4·F-6~F-8을 결정해야 하며,
F-5는 F-4가 인쇄 그래픽일 때만 필요하다.

## Codex 스펙 031 조사 검토 — CORRECTION_REQUIRED 라운드 1 (2026-07-31)

문서 전용 커밋 `33323dd`는 허용 파일과 일치하고 `git diff --check`를 통과했으며
HEAD=origin, ahead/behind 0/0이다. 제품 코드·테스트·설정·lockfile 변경은 0이다.

다만 보고서가 “인쇄/export에 시계가 없는 것”을 결함으로 확정하고 인쇄 포함을 권고한 근거는
불충분하다. 레거시 관리자 UI는 `denn-admin.html:335-342`에서 이를 **“템플릿용 시계 가이드”**라고
설명하고, `denn-admin.html:473-482`에서 **“시계 이미지 (커스텀)”**과
“미설정 시 텍스트형 시계”로 관리한다. 이는 인쇄 그래픽이 아니라 완제품의 물리적 시계
하드웨어/표시를 미리 보여주는 오버레이일 가능성이 있다.

현재 근거로 어느 의미가 맞는지 확인할 수 없으므로 결함 판정과 “인쇄 포함” 권장을 유지할 수 없다.
Claude는 제품 코드를 수정하지 않고 조사 보고서와 관련 상태 문서만 보완한다. 확정할 제품/운영 근거가
없으면 `UNCONFIRMED`로 낮추고 Founder에게 시계의 제품 의미부터 묻는다.

## 스펙 030 종료 확인 및 스펙 031 읽기 전용 조사 전이 (2026-07-31)

종료 문서 커밋 `57d43b6`이 `origin/rebuild/modern-studio`와 일치하고 ahead/behind 0/0이며,
working tree에는 원인이 확정된 스펙 018 PNG 두 개만 남아 있음을 확인했다. 스펙 030은 DONE이다.

다음 작업은 `docs/rebuild/specs/019-canvas-geometry-contract.md`에 기록된 후속 순서
`deterministic renderer → image/CORS → pointer → text/clock → print`에 따라
**스펙 031 고객 텍스트 영역·시계 오버레이 계약의 읽기 전용 사전 조사**로 정한다.
Claude는 제품 코드를 수정하지 않고 `Automation/NEXT_CLAUDE_PROMPT.md`의 문서 전용 범위만 조사해
fast-forward push한 뒤 `READY_FOR_CODEX`로 전환한다.

## 스펙 029 종료 확인 및 다음 조사 전이 (2026-07-30)

종료 문서 커밋 `8d20b6d`가 origin과 일치하고 ahead/behind 0/0이며 허용된 문서 파일만 포함함을 확인했다.
스펙 029는 DONE이다. 전체 리빌드 루프는 유지하고, 스펙 030 이미지 회전 계약을 구현 없이
읽기 전용으로 조사하도록 `WAITING_FOR_CLAUDE`로 전환한다.

## Codex 스펙 030 조사 검토 — Founder 결정 대기 (2026-07-30)

문서 커밋 `8734307`은 허용된 문서 5개만 변경했고 `git diff --check`를 통과했으며
HEAD=origin, ahead/behind 0/0이다. 제품 코드·테스트·CSS·manifest·lockfile 변경은 0이다.

Codex 계약은 다음으로 확정한다.

- C-1: composer의 슬롯별 normalized transform에 `rotationQuarterTurns`를 추가한다.
- C-2: 저장 값은 `0|1|2|3`; 다른 값은 복구 없이 거부한다.
- C-3: pan은 화면축이며 회전 footprint로 maxPan을 다시 계산한다.
- C-4: 회전 중심은 zone 중심 + 현재 pan이다.
- C-5: `draw-image-cover`의 선택적 `rotationQuarterTurns`로 plan 어휘를 확장한다.
- C-6: executor는 한 command 안에서 save→translate→rotate→draw→restore를 수행한다.
- C-7: probe plan에도 회전을 포함하고 normalized 값을 유지해 재환산한다.
- C-8: 회전을 plan에 기록해 향후 print/export가 같은 plan을 소비하게 한다.
- C-9: 기존 오류 우선순위에서 transform 유한성·범위 검증 단계에 회전 검증을 편입한다.

Founder 권장 결정은 R-1 90° 배수만, R-3 액자 aspect 전환 미도입·별도 기능,
R-4 case multi-zone에도 슬롯별 제공, R-5 template art와 독립적으로 사진 회전 허용,
R-6 EXIF 직접 파싱 금지·브라우저 decode 실측이다. R-2는 R-1 승인 시 불필요하다.

## Founder 스펙 030 권장안 승인 (2026-07-31)

Founder가 R-1·R-2·R-3·R-4·R-5·R-6을 일괄 승인하고 자동화 재개를 지시했다.

- 사진 회전은 90° 배수만 지원한다.
- 임의 각도는 도입하지 않고 스펙 029의 scale 1.0~5.0·빈 공간 금지를 유지한다.
- 액자 가로/세로 aspect 전환은 사진 회전과 분리하며 이번 스펙에서 제외한다.
- case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- template art는 고정하고 사용자 사진만 회전한다.
- EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode를 합성 fixture로 실측한다.

Claude가 결정 정본을 문서 전용으로 기록한 뒤 `READY_FOR_CODEX`로 전환한다. 구현은 아직 시작하지 않는다.

## Codex independent review result

Spec 028 at `cebcaad` is not yet approved. The independent `corepack pnpm check`
completed successfully (format, lint, typecheck, unit 876/876, build), and
`git diff --check 7a2b2cd..cebcaad` passed. Full E2E is intentionally deferred
until the correction below is applied.

Two fail-closed/snapshot defects require correction:

1. `apps/mockup/src/canvas/templateArtBinding.ts`
   reads `source.kind` and `source.src` outside an exception boundary. A hostile
   getter or Proxy can escape instead of producing the safe failed state.
2. `packages/shared/src/catalog/images/placement.ts`
   rereads source and legacy-builder marker fields across helper calls. Getter
   drift can make the first read indicate a legacy crop variant and a later read
   remove that evidence, incorrectly returning `stretch`.

These are normal correction items, not Founder decisions. Claude may modify only
the exact files and documentation listed in `Automation/NEXT_CLAUDE_PROMPT.md`.
The two known Spec 018 PNG changes remain excluded from every commit.

## 보완 라운드 1 결과 (Claude, 2026-07-29)

Codex 지적 2건을 지정된 파일 안에서만 보완해 push했다.

- `apps/mockup/src/canvas/templateArtBinding.ts` (+ test): source `kind`/`src`를 예외 경계 안에서
  각각 1회만 읽어 plain snapshot으로 복사하고, 검증·crossOrigin/src 대입·결과 처리에 snapshot만
  사용한다. hostile getter/Proxy trap/revoked Proxy는 element 생성 없이 기존 `INVALID_INPUT`으로 닫힌다.
- `packages/shared/src/catalog/images/placement.ts` (+ test): source 체인과 legacy-builder marker를
  각각 1회만 읽어 boolean snapshot으로 판정한다. 첫 snapshot이 legacy crop이면 이후 drift와 무관하게
  `unsupported: legacy-builder-crop`을 유지한다(fail-open 불가).
- `apps/mockup/src/preview/PreviewComposer.tsx`: 허용된 lint 정리 1줄(`noUselessTernary`)만.

계약 무변경: crossOrigin-before-src, data URL 예외, 재시도 0, generation stale guard, cache 0,
기존 none/stretch/unsupported 결과와 오류 우선순위, Result에 원문 미추가.

게이트: frozen exit 0 / lockfile diff 0 / format·lint·typecheck PASS / unit 893 (876 → 893) /
build mockup JS 254.06 kB gzip 78.90, CSS 13.80/3.53 무변경, admin 무변경 / e2e 85 PASS exit 0 /
check PASS / `git diff --check` clean / 포트 4183·4184 free / OS temp `denn-e2e-*` 0 /
고객 dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·deploy 0.

커밋: 코드/test `d4fb99b`, 문서(+ 이 상태 문서) 별도 커밋. 스펙 018 PNG 2개는 restore/checkout/
stage/commit하지 않았다.

## 세션 종료 (2026-07-29)

Founder 지시로 이번 세션을 마감하고 **Claude Code의 5분 자동 루프를 종료**했다(cron job 취소).

- 스펙 028은 **종료되지 않았다**. `DONE`도 `CODEX_PASSED`도 아니며, Codex correction review 도중
  세션이 끝났다.
- 구현 후보: `f7b3f61`(최초 구현) → `d4fb99b`(보완 라운드 1). Codex의 마지막 review 기준선은 `cebcaad`.
- 보완 2건(templateArtBinding source 단일 snapshot / placement 전체 단일 snapshot과 drift fail-open
  차단)은 `d4fb99b`로 구현·push됐고, **그에 대한 Codex 재검증은 실행되지 않았다**.
- HEAD = origin = `b18b652`, ahead/behind 0/0. working tree에는 Codex E2E가 재생성한 스펙 018 PNG
  2개만 남아 있으며 restore/checkout/stage/commit하지 않았다.
- 실제 network, live test, Firebase/CORS/Rules/Hosting, deploy: **0**.
- 다음 스펙은 착수하지 않았다.

재개는 `Automation/NEXT_CLAUDE_PROMPT.md`와
`docs/handoff/2026-07-29-session-end-handoff.md`를 읽고 **수동으로** 시작한다.

## Codex 독립 재검증 — 승인 가능 (2026-07-30)

Founder의 수동 재개 승인 후 보완 코드 `d4fb99b`를 독립 재검증했다.

- `templateArtBinding`: source `kind`/`src`를 예외 경계 안에서 각각 1회 읽어
  snapshot만 사용하며 hostile getter, Proxy trap, revoked Proxy는 안전 실패한다.
- catalog placement: source 체인과 legacy-builder marker를 각각 1회 읽은 snapshot으로만
  판정하며 getter drift가 `legacy-builder-crop`을 `stretch`로 fail-open시키지 않는다.
- 변경 범위는 허용된 source/test 4개와 lint 의미 보존 1줄로 한정되고 `git diff --check`
  를 통과했다.

독립 게이트:

- frozen install PASS, lockfile diff 0
- format, lint, typecheck PASS
- unit 893/893 PASS
- build PASS: mockup JS 254.06 kB / gzip 78.90 kB, CSS 13.80 / 3.53 kB;
  admin JS 193.53 / 61.09 kB, CSS 8.54 / 2.64 kB
- E2E 85/85 PASS, exit 0
- 포트 4183·4184 listener 0, OS temp `denn-e2e-*` 0, 저장소 소속 node/esbuild 0
- 고객 dist fixture 0
- HEAD=origin=`baa0d78`, ahead/behind 0/0
- working tree에는 알려진 스펙 018 PNG 2개와 이 로컬 Automation 전이 문서만 존재

NOT TESTED/NOT VERIFIED 유지:

- 운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패
- 운영 이미지·카탈로그, 실기기 4환경, 실제 200% 확대
- print/export taint, 대용량 아트 성능
- 썸네일(non-CORS)과 owner(anonymous)의 동일 URL 캐시 오염 가능성

스펙 028은 코드 기준 승인 가능하다. Claude Code는
`Automation/NEXT_CLAUDE_PROMPT.md`의 종료 문서 범위만 처리하고 다음 스펙을 시작하지 않는다.

## 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-30)

승인 판정에 따라 **종료 문서만** 하나의 문서 commit으로 처리하고 일반 fast-forward push했다.

- 승인 대상 보완 코드 `d4fb99b`, 문서 기준 HEAD `baa0d78`
- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/028-template-art-stretch-cors-owner.md`,
  `docs/handoff/2026-07-29-spec-028-template-art-handoff.md`,
  `docs/handoff/2026-07-29-session-end-handoff.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `docs/codex-claude-handoff/CURRENT.md`, `Automation/DENN_AUTOMATION_STATE.md`,
  `Automation/NEXT_CLAUDE_PROMPT.md`
- 기능 코드·테스트·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- Claude 재실측(같은 트리): frozen exit 0 · lockfile diff 0 / format·lint·typecheck /
  unit **893** / build 동일 수치 / e2e **85 PASS** exit 0 19.5초 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 → Codex 독립 게이트와 일치
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit **하지 않았다**(working tree에 그 2개만 잔존)
- 다음 스펙(029 등)·사전조사·기능 **미착수**

다음 전이: Codex가 이 문서 커밋의 최종 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 029 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`.

- 재사용 확정: `computeCoverDrawRect`(cover + pan clamp, 입력 무변형, `appliedTransform`·`maxPan`),
  `clientPointToLogical`(logical px, DPR 무관), plan/adapter의 zone별 `transform`
  → `packages/render` 무변경으로 시작 가능
- 차단 계약 2건: pan 단위·기준 공간(액자 logical canvas 가변), transform 소유자(스펙 026 owner의
  `transform`이 리터럴 `{scale:1,x:0,y:0}`)
- 레거시 결함(재현 금지): 인쇄 pan 배율의 frame 하드코딩 `dim.w/500`, zoom 두 축 범위 불일치,
  multi-zone 슬라이더 표시값·터치 시작 오프셋 오류, pointer capture 부재
- 검증 한계: 2손가락 핀치는 Playwright로 구동 불가 → 구조적 NOT TESTED
- 결정 필요 9건(D-1~D-9, Founder 5건) · 최소 구현 순서 · 허용 파일 후보 · STOP 9조건 기록
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (**문서 전용 커밋**)
- 제품 코드·테스트·설정·CSS·PNG·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·이미지 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- 구현 스펙 작성·pointer/pan/zoom 구현·다음 기능 착수 **없음**

다음 전이: Codex가 조사 보고서를 검토해 구현 스펙(또는 추가 조사 지시)을 작성한다. 그 전까지 Claude는
어떤 제품 코드도 만들지 않는다.

## Codex 조사 검토 — Founder 결정 대기 (2026-07-30)

문서 전용 커밋 `2ded576`은 허용 범위와 정확히 일치하고 `git diff --check`를 통과했다.
제품 코드·테스트·설정·CSS·manifest·lockfile 변경은 0이며 HEAD=origin, ahead/behind 0/0이다.

Codex 계약 결정:

- D-1: 편집 상태는 `scale`(무차원)과 축별 normalized pan `x/y ∈ [-1,1]`을 저장한다.
  `x/y`는 현재 scale에서 계산한 축별 `maxPan` 대비 비율이며 `maxPan=0`인 축은 0이다.
  plan 생성 시에만 현재 zone의 logical px로 환산한다.
- D-4: 키보드 이동은 축별 normalized pan 0.02/step, Shift는 0.10/step으로 한다.
- D-8: composer가 slot별 transform을 소유한다. 스펙 026 image owner는 drawable/ref/intrinsic만
  소유하고 기존 리터럴 transform 계약을 바꾸지 않는다.
- D-9: 이미지 교체·삭제, model/template/frame-size 변경 시 해당 transform을 초기화한다.
  색상 변경과 활성 slot 전환에서는 유지한다.

Founder 결정이 필요한 권장 묶음:

- D-2: case multi-zone은 슬롯 카드 선택 + 활성 슬롯 표시
- D-3: scale 단일 범위 1.0~5.0, 내부 무차원·표시만 %, 휠/버튼은 승산 방식
- D-5: 중복 없는 단일 `원래대로` 버튼
- D-6: 1차 핀치 미지원; 슬라이더·버튼·휠·키보드·마우스 drag 제공
- D-7: 빈 공간 금지; 최소 scale 1.0과 cover clamp 유지

위 다섯 항목은 제품 UX 결정이므로 승인 전 구현 스펙·제품 코드를 작성하지 않는다.

## Founder 결정 접수·기록 완료 (Claude Code, 2026-07-30)

Founder가 다음 문장을 그대로 승인했다: `스펙 029 Founder 권장안 D-2·D-3·D-5·D-6·D-7 일괄 승인.`
Codex는 저장소만 읽으므로 결정을 정본 문서로 남겼다:
`docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`.

승인된 값(요약): D-2 슬롯 카드 선택 + 활성 슬롯 표시 / D-3 scale **1.0~5.0** 단일 범위·내부 무차원·
표시만 %·휠·버튼 **승산** / D-5 단일 `원래대로` 버튼 / D-6 **1차 핀치 미지원**(슬라이더·버튼·휠·키보드·
마우스 drag) / D-7 **빈 공간 금지**(최소 scale 1.0 + cover clamp 유지). Codex 계약 D-1·D-4·D-8·D-9는
결정 문서 §2에 그대로 옮겨 함께 보존했다.

- 이 라운드 변경: **문서 전용**(결정 문서 1 신규 + `CURRENT.md` + live log + 이 문서 +
  `NEXT_CLAUDE_PROMPT.md`)
- 제품 코드·테스트·설정·CSS·PNG·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- pointer/pan/zoom 구현 **0**, 구현 스펙 작성 **0**(Codex 소유)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- `Automation/DENN_AUTOMATION_RUNBOOK.md`의 미커밋 변경은 **Codex 소유로 판단해 손대지 않았다**

다음 전이: Codex가 이 결정을 입력으로 **스펙 029 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.

## Codex 구현 계약 작성 완료 (2026-07-30)

Founder 승인과 결정 정본 `7701c7a`를 입력으로
`docs/rebuild/specs/029-pointer-pan-zoom-editing.md`를 작성했다.
상태를 `WAITING_FOR_CLAUDE`로 전환하며 Claude는 해당 스펙의 허용 파일과 게이트 안에서만 구현한다.

## Codex 독립 검증 — CORRECTION_REQUIRED (2026-07-30)

대상 `95fcf92` / 문서 `197527c`를 독립 확인했다.

- frozen install PASS, lockfile diff 0
- format·lint·typecheck PASS
- unit 938/938 PASS
- mockup/admin build PASS
- E2E 90/90 PASS, 정상 exit
- `git diff --check 7701c7a..197527c` PASS
- HEAD=origin=`197527c`, ahead/behind 0/0

다만 pointer 종료 계약에 실제 결함 2건이 있어 승인할 수 없다.

1. `createDragController.end()`가 pointerup 직전 rAF에 대기 중인 최신 transform을 취소한다.
   move와 pointerup이 같은 frame 안에 오면 사용자가 놓은 최종 위치가 사라지고 직전 렌더 위치로 되돌아간다.
   현재 unit test는 이 손실을 정상 동작으로 고정하고 있다. pointerup은 최신 pending 값을 정확히 한 번
   동기 commit한 뒤 종료해야 하며 pointercancel/lost/selection/unmount만 폐기해야 한다.
2. `setPointerCapture()` 예외를 무시한 채 drag session을 유지한다. capture 실패 후 포인터가 영역 밖에서
   놓이면 pointerup을 받지 못해 세션이 열린 채 남을 수 있다. capture 실패 시 즉시 해당 세션을 abort하고
   `dragSlotRef`를 비워 안전 실패해야 한다.

수정 허용 범위는 `apps/mockup/src/preview/imageTransform.ts`,
`apps/mockup/src/preview/imageTransform.test.ts`, `apps/mockup/src/preview/PreviewComposer.tsx`,
`apps/mockup/src/preview/PreviewComposer.test.tsx`와 관련 E2E/문서/Automation뿐이다.

## Codex 보완 라운드 1 재검증 — 승인 가능 (2026-07-30)

대상 코드 `110511e`, 문서 `0512c8d`를 독립 재검증했다.

- pointerup pending transform 정확히 1회 flush, cancel/lost/abort/dispose 폐기 확인
- stale callback·다음 세션 오염 0, capture 실패 즉시 abort 확인
- frozen install PASS, lockfile diff 0, 신규 의존성 0
- format·lint·typecheck PASS
- unit 944/944 PASS
- build PASS: mockup JS 263.31 kB/gzip 81.60, CSS 15.47/3.88; admin 무변경
- E2E 91/91 PASS, 정상 exit
- `git diff --check` PASS
- 포트 4183/4184 listener 0, OS temp `denn-e2e-*` 0
- HEAD=origin=`0512c8d`, ahead/behind 0/0
- working tree는 Codex 소유 RUNBOOK과 알려진 스펙 018 PNG 두 개만 남음

스펙 029는 코드 기준 승인 가능하다. Claude는 종료 문서만 처리하고 다음 스펙을 시작하지 않는다.

## 스펙 029 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

스펙 §4 허용 파일 안에서만 구현하고 코드/test와 문서를 분리 커밋했다.

- 코드/test 커밋 `95fcf92`, 기준 `7701c7a`(Founder 결정), 스펙 `029-pointer-pan-zoom-editing.md`
- 상태 모델: 슬롯별 `scale`(무차원 1.0~5.0) + 축별 normalized pan `[-1,1]`, plan 직전에만 logical 환산,
  `maxPan=0` 축 고정, resize는 normalized 유지 후 재환산
- `maxPan`은 pan 0 probe plan의 cover 명령에서 읽어 어댑터 rect 공식을 복제하지 않음(둘 중 하나라도
  실패하면 plan 미생성)
- Pointer Events + capture, 3종 종료 + selection/unmount, generation 가드, rAF 1회 병합,
  휠은 scale이 실제로 바뀔 때만 preventDefault, touch-action 선언 0(스크롤·브라우저 확대 보존)
- 슬롯 카드 선택 + `편집 중` 표시, 단일 `원래대로`, 화살표 0.02 / Shift 0.10,
  사진 미준비 슬롯은 컨트롤 전부 disabled
- 초기화: 이미지 교체·삭제·실패 → 그 슬롯만 / model·template·frame-size·kind → 전체 /
  색상 변경·활성 슬롯 전환 → 유지
- 발견·수정: stale animation frame이 다음 세션의 pending 값을 소비해 재-grab 첫 move가 누락되던 결함
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit 938 (893 → 938) / e2e 90 PASS (85 → 90) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·Firebase·CORS·deploy 0
- 번들: mockup JS 254.06 → 263.19 kB (gzip 78.90 → 81.56), CSS 13.80 → 15.47 (gzip 3.53 → 3.88),
  admin 무변경
- NOT TESTED: 2손가락 핀치(미구현·Playwright 구동 불가), 터치 drag(1차 미지원), 실기기 4환경,
  실제 200% 확대, print/export pan, 대용량 성능·EXIF
- `packages/**`·`apps/admin/**`·운영 HTML·Firebase 설정/Rules/CORS/Hosting·POC·manifest·lockfile 무변경,
  스펙 026 owner(`localImageBinding.ts`)와 `productPlan.ts`도 무수정
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`는 건드리지 않았다

다음 전이: Codex가 `95fcf92`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 029 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-30)

Codex 지적 2건은 모두 유효했고 지정된 파일 안에서만 보완해 push했다. 코드/test `110511e`, 문서 별도 커밋.

- 지적 1 (릴리즈 flush): `end(pointerId, "pointerup")`이 대기 중인 최신 transform을 버려, 릴리즈 직전
  move가 animation frame을 기다리는 중이면 사진이 손을 놓은 위치보다 한 프레임 뒤에 남았다.
  이제 `pointerup`만 정확히 1회 flush한 뒤 종료하고, `pointercancel`·`lostpointercapture`·selection
  abort·unmount/dispose는 pending을 폐기한다. flush는 state 정리와 frame 취소 후에 실행되므로 늦은 rAF는
  commit 0이고 이중 commit도 다음 세션 pending 소비도 없다. `cancelFrame`은 frame 유무와 무관하게 항상
  pending을 비운다.
- 지적 2 (capture 실패): `setPointerCapture`가 throw하면 capture 없는 drag가 계속됐다. 이제 방금 시작한
  세션을 즉시 abort하고 `dragSlotRef.current`를 비운다.
- 유지된 계약: normalized 저장, plan 직전 환산, `maxPan=0` 고정, 1.1 승산, 0.02/0.10 키보드 스텝,
  단일 `원래대로`, generation 가드, rAF 1회 병합, 터치 drag·핀치 미지원, `touch-action` 선언 0,
  초기화 행렬, 스펙 026 owner와 `packages/**` 무변경.
- 신규 회귀 테스트: flush 1회 / 이미 실행된 frame 중복 commit 0 / move 없는 pointerup commit 0 /
  다음 세션 누출·소비 0 / 다른 pointerId의 stale end flush 0 / throwing subscriber 후 세션 종료·재사용 /
  abort·dispose 폐기 / 실제 Chromium에서 capture 거부 시 픽셀 불변 + 원복 후 정상 drag.
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit 944 (938 → 944) / e2e 91 PASS (90 → 91) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·Firebase·CORS·deploy 0.
- 번들: mockup JS 263.19 → 263.31 kB (gzip 81.56 → 81.60), CSS 무변경, admin 무변경.
- 변경 파일: `apps/mockup/src/preview/imageTransform.ts`(+ test), `PreviewComposer.tsx`,
  `tests/e2e/mockup-preview.spec.ts` — 허용 목록 안. CSS·설정·manifest·lockfile·`packages/**` 무변경.
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다.

다음 전이: Codex가 `110511e`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 029 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-30)

Codex 승인(코드 `110511e`, 문서 `0512c8d`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`(§CODEX_PASSED),
  `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`(§9 + 상태 줄),
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `docs/codex-claude-handoff/CURRENT.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: unit **944/944**, E2E **91/91**, build mockup JS 263.31 kB / gzip 81.60,
  CSS 15.47 / 3.88, admin 무변경, 보완 2건(릴리즈 flush · capture 실패 즉시 abort),
  network/live/deploy **0**
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다
- NOT TESTED 유지: 2손가락 핀치(미구현·Playwright 구동 불가), 터치 drag, 실기기 4환경,
  실제 200% 브라우저 확대, print/export pan 재현, 대용량 이미지 실기기 성능·EXIF, 운영 카탈로그·이미지
- 다음 스펙(030 등)·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 030 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`(15항목).

- 회전 소유자 4개를 근거 라인과 함께 분리했다: 액자 가로/세로 ±90(사진 픽셀), 룸 tilt(액자 목업),
  워터마크 기울기, 텍스트 존 회전(인쇄 반영). 기기 방향 전환·회전 전체화면은 룸 표시 셸이며 사진과 무관.
- 액자 가로/세로는 레거시에서 미완이다: aspect transpose가 `normFrameRatio`로 되돌려지고 캔버스 CSS
  회전은 no-op이며, 회전 경로는 pan clamp를 잃고 전역 `state.rot` 폴백이 케이스 사진까지 회전시킨다.
- 인쇄 경로는 회전을 무시한다 → 미리보기와 인쇄가 어긋난다.
- EXIF는 레거시·리빌드 모두 직접 처리 0. 리빌드는 `<img>`+`naturalWidth`라 엔진 기본 동작에 의존하며
  이 저장소에서 실측된 적이 없다(NOT VERIFIED). 직접 파싱은 이중 회전·신규 의존성 때문에 비권장.
- 핵심 계약 충돌: 임의 각도는 스펙 029 Founder 확정값 D-3(scale 하한 1.0)·D-7(빈 공간 금지)와 수학적으로
  충돌한다(45°에서 cover 최소 배율 √2). 90° 배수면 019 cover와 029 normalized pan을 그대로 재사용한다.
- 회전은 `packages/render` 계약 변경이 전제다(plan에 rotation 필드 없음, executor는 transform 금지 명시).
- 결정 필요: Founder 6건(R-1 각도 집합, R-2 D-3/D-7 재해석, R-3 액자 가로/세로 분리 도입, R-4 case 회전,
  R-5 아트 템플릿 회전, R-6 EXIF 직접 정규화) + Codex 9건(C-1~C-9).
- 최소 구현 순서, 허용 파일 후보, unit/Chromium/실기기 검증 설계, 지원 불가·근거 부족, STOP 10조건 기록.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 R-1~R-6 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 회전 관련 제품 코드를 만들지 않는다.

## 스펙 030 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

`NEXT_CLAUDE_PROMPT.md`의 문서 전용 범위만 수행했다. 정본
`docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`(신규).

승인 문장(원문): `스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인하고 자동화 재개.`

기록한 Founder 결정:

- R-1: 고객 사진 회전은 90° 배수만 지원하고 `왼쪽 90°`/`오른쪽 90°` 버튼을 사용한다.
- R-2: 임의 각도를 도입하지 않아 스펙 029의 scale 1.0~5.0과 클립 안 빈 공간 금지를 유지한다.
- R-3: 액자 가로/세로 aspect 전환은 별도 기능이며 이번 스펙에서 제외한다.
- R-4: case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- R-5: template art는 고정하고 사용자 사진만 회전한다.
- R-6: EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode를 합성 EXIF fixture로 실측한다.

Codex 구조 계약 C-1~C-9는 조사 보고서와 이 문서의 기록 그대로 결정 문서 §2에 옮겨 보존했다.

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
  (`NEXT_CLAUDE_PROMPT.md`의 전이 지시 변경분 포함). 허용 파일 목록과 정확히 일치한다.
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 회전 관련 제품 코드 **0**, 구현 스펙 작성 **0**(Codex 소유), `packages/**` 무변경
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- `git diff --check` clean, 일반 fast-forward push, HEAD=origin, ahead/behind 0/0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다(working tree에 그 2개만 잔존)

다음 전이: Codex가 이 결정을 입력으로 **스펙 030 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.
그 전까지 Claude는 회전 관련 제품 코드를 만들지 않는다.

## Codex 결정 정본 검토 및 구현 계약 확정 (2026-07-31)

결정 정본 커밋 `cf1cfd2`는 허용된 문서 5개만 변경했고 `git diff --check`를 통과했다.
R-1~R-6과 C-1~C-9는 Founder 승인 및 조사 근거와 일치한다.

구현 정본은 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`다. 실효 상태를
`WAITING_FOR_CLAUDE`로 전환한다. Claude는 해당 스펙의 허용 파일·오류 우선순위·검증 계약
안에서만 구현하고, 제품 코드/test 커밋을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`로
전환한다.

## 스펙 030 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

스펙 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md` §4 허용 파일 안에서만 구현하고
코드/test와 문서를 분리 커밋했다. 코드/test `fbbadeb`, 기준 계약 `2777010`.

- 상태 모델: 슬롯별 `rotationQuarterTurns 0|1|2|3`, 전역 회전 상태 0, D-9 초기화 행렬에 회전 편입
- 잘못된 값(`4`·`-1`·`1.5`·`90`·`"1"`·`NaN`·drift/throwing getter)은 복구 없이 거부
- 90°/270°는 cover에 넘기는 intrinsic w/h를 스왑해 회전 footprint를 얻는다 → `packages/render/src/geometry`
  무변경, 029 `maxPan` 공식 그대로 성립
- `draw-image-cover`의 선택적 `rotationQuarterTurns`만 추가하고 0이면 미emit → pre-030 plan과 바이트 동일
- executor는 회전 시에만 커맨드 내부 save→clip→translate→rotate→drawImage→restore, 중심은 drawRect 중심
- probe plan에도 회전 포함, template art는 무회전
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **989**(944→989) / build mockup JS 265.53 kB gzip 82.11, CSS 15.50/3.89, admin 무변경 /
  E2E **99 PASS**(91→99) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일·fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- ★ R-6 실측(저장소 최초): `Orientation=6` 합성 JPEG(40×20)이 Chromium에서 20×40으로 decode된다 →
  브라우저가 EXIF를 적용하므로 직접 파싱은 이중 회전. 조사의 NOT VERIFIED는 Chromium 한정 해소
- ★ 판단 요청 1건: executor 포트 `apps/mockup/src/canvas/types.ts`가 §4 허용 목록 밖이라
  `translate`/`rotate`를 executor 런타임 검사로 요구하고 없으면 preflight fail-closed로 처리했다.
  허용 파일 확장이 더 낫다고 판단되면 그 방향으로 보완한다(인계 §3.2)
- 변경 파일 13개 전부 §4 허용 목록 안. `surface.css`·`previewContracts.test.ts`는 변경 불필요로 무변경
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 `fbbadeb`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## Codex 독립 검증 — CORRECTION_REQUIRED (2026-07-31, 라운드 1)

코드 `fbbadeb`, 문서 `e4a9133`의 독립 검증 결과:

- frozen install, format, lint, typecheck, unit **989/989**, mockup/admin build,
  Chromium E2E **99/99**, `git diff --check`, dist SHA-256 전후 동일: PASS
- lockfile·신규 의존성·금지 경로 diff 0, 포트 4183/4184 listener 0, OS temp 0
- 잔류 프로세스 command-line 열람은 OS 권한 거부로 **NOT TESTED**

보완 1건: `executePreviewPlan.ts`는 회전 command에서 `translate`/`rotate`를 요구하지만 공개
`PreviewCanvasContext`가 두 capability를 선언하지 않는다. 타입을 정확히 구현한 소비자가 컴파일을
통과한 뒤 회전 plan에서만 실패할 수 있으므로 `apps/mockup/src/canvas/types.ts`를 최소 허용 확장한다.
두 메서드를 선택적 capability로 선언하고, 미지원 context는 unrotated plan만 호환되며 rotated plan은
preflight fail-closed임을 문서와 테스트로 고정한다.

## 스펙 030 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 1건은 유효했고 지정된 파일 안에서만 보완해 push했다. 코드/test `603cd25`, 기준 `e4a9133`.

- 지적: executor가 회전 command에서 `translate`/`rotate`를 요구하는데 공개 `PreviewCanvasContext`가
  둘을 선언하지 않아, 타입을 정확히 구현한 소비자가 컴파일을 통과한 뒤 회전 plan에서만 실패할 수 있었다.
- 보완 1: 두 메서드를 **선택적 capability로 공개 포트에 선언**했다. 선택성 자체가 계약이며, 없는
  컨텍스트는 unrotated plan을 그대로 실행하고 회전 plan만 둘 다 요구한다.
- 보완 2: fail-closed 계약을 공개 포트에 문서화했다 — 하나라도 없으면 preflight
  `INVALID_EXECUTOR_INPUT`이고 Canvas 연산 0이다.
- 보완 3: `RotationCapableCanvasContext`를 공개 타입에서 `Required<Pick<…>>`로 파생하고 executor의
  중복 interface를 삭제했다. `ROTATION_METHODS`는 `keyof PreviewCanvasContext`로 검사하므로 메서드명이
  바뀌면 컴파일이 깨진다.
- 신규 테스트 6: 공개 타입만으로 선언된 capability-free 컨텍스트의 unrotated PASS(transform 시도 0),
  명시적 회전 0도 동일, 회전 1·2·3 전부 fail-closed(Canvas 연산 0), 절반의 capability도 실패,
  함수 아닌 값도 실패, 실제 `CanvasRenderingContext2D`의 컴파일 타임 assignability.
- 무변경: 회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9. E2E 99개 그대로 PASS.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **995**(989→995) / build mockup JS 265.52 kB gzip 82.10, CSS·admin 무변경 /
  E2E **99 PASS** exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 변경 파일: `apps/mockup/src/canvas/types.ts`, `executePreviewPlan.ts`, `executePreviewPlan.test.ts`
  — 허용 목록과 정확히 일치
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- ⚠️ 미회신: 판단 요청 ②(R-6 실측을 조사 보고서 §7 `NOT VERIFIED` 해소로 반영할지)는 이번 회신에
  판정이 없었다. 보고서는 Codex 소유라 Claude가 수정하지 않았다.

다음 전이: Codex가 `603cd25`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## Codex 보완 라운드 1 재검증 — CODEX_PASSED (2026-07-31)

코드 `603cd25`, 문서 `1aa3302`를 독립 재검증해 승인한다.

- 공개 포트의 선택적 rotation capability, fail-closed 계약, 단일 타입 정본 확인
- frozen install, format, lint, typecheck, unit **995/995**, mockup/admin build
- Chromium E2E **99/99**, `git diff --check`, dist SHA-256 전후 동일
- lockfile·신규 의존성·금지 경로 diff 0, 포트 4183/4184 0, OS temp 0
- Chromium 합성 EXIF Orientation=6 적용은 검증됨; 그 밖의 엔진·실기기는 NOT TESTED

스펙 030 기능·보완 검증을 통과했다. 다음은 Claude가 종료 문서만 별도 fast-forward push한다.

## 스펙 030 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-31)

Codex 승인(코드 `603cd25`, 문서 `1aa3302`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
  (§CODEX_PASSED), `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`(§10 + 상태 줄),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: unit **995/995**, E2E **99/99**, build mockup JS 265.52 kB / gzip 82.10,
  CSS 15.50 / 3.89, admin 무변경, 보완 1건(공개 포트 rotation capability 선언 · fail-closed 문서화 ·
  단일 타입 정본), network/live/deploy **0**
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 603cd25..HEAD -- apps packages tests` = 0줄), 신규 의존성 0
- Claude 재실측(같은 트리): `check` PASS(format·lint·typecheck·unit·build)
- ★ 판단 요청 ② 회신 반영: Chromium 합성 EXIF `Orientation=6` 적용은 **검증됨**으로 기록했고,
  그 밖의 엔진·실기기는 NOT TESTED로 유지했다. 조사 보고서는 Codex 소유·허용 파일 밖이라 수정하지 않았다
- NOT TESTED 유지: **잔류 프로세스 command-line 검사(OS 권한 거부)**, 실기기 4환경 EXIF·조작성,
  카메라 원본 orientation 1~8, 실제 print/export 회전, 대용량 성능·메모리, 실제 200% 확대, 임의 각도
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- 다음 스펙·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 031 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`(13항목, 지시 10항목 전부 포함).

- 텍스트 소유자 2개를 근거 라인과 함께 분리했다: 액자 **키 기반 `textZones`**(운영자가 좌표·글꼴,
  고객이 값만) vs 케이스 **자유 배치 `textObjs`**(고객이 드래그). 코드·데이터 공유 0.
- zone 필드 전수와 기본값, 레이어 순서(사진 → 아트 → 텍스트 → 시계 → 테두리)를 기록했다.
- 레거시 결함 3건(재현 금지): 빈 값 판정 불일치로 `"0"` 소실, 줄 수 상한 미리보기 2 / 인쇄 3,
  기본 글자색이 경로에 따라 `#111`↔`#FFF`로 뒤집힘.
- ★ 인쇄/export 경로에 **시계가 아예 없다** → 고객이 본 화면과 인쇄물이 구조적으로 다르다.
- 시계 계약: 3단 병합(`clockSettings` → `frameSizes.clock` → `frameTemplates.clock`), `{x,y,size,customImg}`,
  로컬 시간 24h `HH:MM` 고정, 1초 `setInterval`, 타이머 정리 부실, `drawClockLayer` 12중 재정의.
- 카탈로그 V1은 `textZones`·`clock`·`clockEnabled`·`clockSettings`·`customFonts`를 보존만 하고
  **투영은 0**이다. `packages/render` plan 커맨드는 4개뿐이고 **텍스트 어휘가 없다**.
- ★ 핵심 계약 딜레마: wrap은 `measureText`(Canvas)가 필요한데 plan은 순수·JSON-safe여야 한다 →
  **빌더에 측정 포트를 주입해 `lines[]`를 plan에 확정**할 것을 권고했다. 레거시 결함이 정확히 반대
  선택(executor가 wrap)에서 나왔다.
- 결정 필요: Founder 8건(F-1~F-8, 특히 **F-4 시계를 인쇄에 포함할지**)과 Codex 11건(C-1~C-11).
- 검증 설계(fake 측정 포트, Playwright `page.clock` 고정 시각, 실제 시간·timezone 의존 금지),
  최소 구현 순서, 허용 파일 후보, STOP 12조건을 기록했다.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- NOT VERIFIED: 레거시 실제 실행 0(코드 근거만), `drawClockLayer` 12중 재정의의 런타임 최종 승자,
  `customFonts` 실제 데이터 형태, 실기기 IME·폰트 대체·인쇄물 가독성.
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 F-1~F-8 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 텍스트·시계 관련 제품 코드를 만들지 않는다.

## 스펙 031 조사 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 1건은 **유효**했고 허용된 문서 안에서만 보완했다. 기준 `33323dd`, 문서 전용 커밋.

- 지적: 조사가 "인쇄에 시계가 없다"는 코드 사실에서 곧바로 "구조적 불일치·결함" 판정과 "인쇄 포함"
  권장을 도출했다. `admin:335`("템플릿용 시계 가이드")·`admin:342`("템플릿 제작 시 시계를 미리 보면서
  위치를 잡고")는 시계가 완제품의 물리적 하드웨어일 가능성을 지지한다.
- 추가 조사 결과를 보고서 §3.5.1에 양쪽 근거로 정리했다. 새로 찾은 근거: 주문 payload에 시계 상태가
  없다(하드웨어 쪽), `clockOn`이 `space-scene-v1`의 `design`에 저장된다(그래픽 쪽), 하드웨어 어휘
  (무브먼트·바늘·초침·타공·벽시계·건전지)가 두 운영본 HTML과 `docs/` 전체에서 0건이다(양쪽 다 불확정).
- **판정 `UNCONFIRMED`**: §0·§3.5·§10에서 "구조적 불일치"·"결함"·"인쇄 포함 권장" 단정을 제거했고,
  §3.5는 관측된 코드 사실만 주장한다.
- Founder 결정 순서를 재구성했다: F-4(제품 의미) → F-4a(하드웨어면 print 미포함 유지, preview 전용) /
  F-4b(그래픽이면 포함 여부) → F-5(F-4b일 때만 시각 의미).
- 구현 범위를 §8.4에서 분기했다. 하드웨어로 확정되면 print/export와 공유할 결정적 plan을 전제하지 않고
  preview overlay 계약과 timer 정리만 다룬다. C-8을 F-4 종속으로 바꾸고 STOP 조건 11·12를 추가했다.
- 바꾸지 않은 것: §1·§2 textZones 조사 전체, §4~§7, C-1~C-7·C-9~C-11, §9 검증 설계.
- 변경 파일: 보고서 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` — 허용 목록과 정확히 일치
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 보완된 보고서를 재검토한다. **F-4는 Founder 결정이 필요하며 Claude가 확정하지 않는다.**

## 스펙 031 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex가 보완 조사 `7636367`을 승인하고 `FOUNDER_DECISION_REQUIRED`로 전이한 뒤 Founder가 결정했다.
정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`(신규).

★ F-4: **시계는 "완제품의 물리적 시계 하드웨어 미리보기"다.** 조사 §3.5.1의 `UNCONFIRMED`가 확정됐다.

- print/export에 시계를 **포함하지 않는다**. 현행 동작이 곧 정답이며, 레거시 인쇄 경로가 시계를 빼 온 것은
  결함이 아니라 의도였다.
- "미리보기≠인쇄"는 문제가 아니다. F-5(인쇄 시각의 의미)는 **불필요**해졌다.
- `packages/render` 계약은 **시계 때문에 바뀌지 않는다**. 텍스트 때문에만 확장한다.
- 시계는 **plan에 담기지 않으며** print/export와 공유할 결정적 plan을 전제하지 않는다.
- 시계 구현 범위는 조사 §8.4 ⓐ 갈래 — **preview overlay 계약과 timer lifecycle뿐**이다
  (DOM 분리 여부 · 1초 갱신 필요성 · 타이머 정확히 1개 보장 · 실물 부착 안내 문구).

Founder 텍스트 묶음 일괄 승인:

- F-1: 1차는 액자 key 기반 `textZones`만. 케이스 자유 배치 텍스트는 별도 스펙.
- F-2: 고객 색·그림자 변경 1차 미지원. 운영자 zone 스타일이 단일 정본.
- F-3: 운영자 `defaultTexts`는 값으로 자동 입력하지 않고 placeholder로만 표시한다.
- F-6: zone별 길이 상한을 계약 필드로 두고 초과 입력을 차단한다. 자르기·말줄임·자동복구 없음.
- F-7: zone별 줄 수 상한, 기본 2줄로 통일한다.
- F-8: 다섯 키를 균일 처리하되 `name2` 기본값은 만들지 않는다. admin 편집기 확장은 별도 스펙.

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 텍스트·시계 제품 코드 **0**, 구현 스펙 작성 **0**(Codex 소유)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 이 결정을 입력으로 **스펙 031 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.

## 스펙 031 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

스펙 `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md` §4 허용 파일 안에서만 구현하고
코드/test와 문서를 분리 커밋했다. 코드/test `78095f8`, 기준 계약 `3927420`.

- 투영: 다섯 키 `textZones` 정규화(닫힌 범위, 중복·미지원 키 거부, `maxChars` 기본 80·`maxLines` 기본 2),
  `defaultTexts`는 placeholder 전용이며 `name2`에는 없다. `clockPreview`는 3단 병합.
- plan: `draw-text` 신규. 이미 wrap된 lines와 측정 폭만 담고 고객 원문·zone key·카탈로그/템플릿 id·
  측정 포트는 담지 않으며 `layerId`는 위치 기반이다.
- wrap은 주입된 동기 측정 포트로 빌더에서 한 번 확정한다. 측정 실패는 fail-closed이고 폰트 정착 전에는
  plan을 만들지 않는다.
- 입력 거부는 빌더 시험 빌드로 구현했다. composer가 wrap을 재구현하면 빌더와 어긋날 수 있으므로 plan
  인자를 보관했다가 후보 값으로 실제 빌더를 한 번 더 호출하고, 실패하면 직전 승인 값을 유지한다.
- executor: 텍스트 5개 멤버를 공개 포트의 선택적 capability로 선언하고 없으면 preflight fail-closed다.
  letter-spacing은 glyph별 `fillText`이며 `ctx.letterSpacing`을 쓰지 않는다.
- 시계: plan 밖 DOM 오버레이(`pointer-events:none`·`aria-hidden`·percent 위치). custom image timer 0,
  텍스트는 분 경계 후 60초, 활성 timer 최대 1개 + generation 가드. 실패는 오버레이만 숨긴다.
- ★ 허용 파일 준수: 배럴(`plan/index.ts`·`preview/index.ts`)이 §4 밖이라 확장 대신 구조적 타입으로 새
  타입을 참조했다. `tsc` 강도는 동일하고 배럴 content diff는 0이다. 배럴 확장이 낫다면 보완한다.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **1081**(995→1081) / build mockup JS 280.33 kB gzip 86.52, CSS 17.82/4.30, admin 무변경 /
  E2E **114 PASS**(99→114) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일·fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 변경 파일 18개 전부 §4 허용 목록 안(신규 `clockOverlay.ts`·`clockOverlay.test.ts` 포함)
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 `78095f8`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 031 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 3건은 모두 유효했고 허용 파일 5개 안에서만 보완해 push했다. 코드/test `88b64e6`,
기준 `78acdf6`. `surface.css`는 변경이 필요 없었다.

- 지적 1(시계 기준 rect): percent를 전체 박스에 적용해 band가 클수록 위치가 틀렸다. 정본 §2.7과
  레거시의 `IX/IY/IW/IH`는 mat rect다. → band를 plan 어댑터와 동일한
  `max(1, round(width*borderPercent/100))`으로 구해 mat 기준 중심과 `min(matW,matH)` 기준 한 변을
  캔버스 대비 CSS percent로 환산하는 순수 함수 `resolveClockCss`로 분리했다. 오버레이와 그려지는 mat이
  같은 반올림을 쓰므로 어긋날 수 없다. resize에서 bit-identical이 아닌 것은 의도이며 차이는 반올림
  크기(약 0.09%p)뿐이다.
- 지적 2(custom image 실패): `declared`와 resolved `src`를 분리했다. 선언됐는데 resolve 실패이거나
  `<img>` load 실패면 오버레이를 숨긴다. 텍스트 `HH:MM`은 사진이 애초에 선언되지 않았을 때만 쓴다.
  실패 source를 기억해 재시도 루프가 없고 source·오류 원문 노출 0이며 사진·텍스트 plan은 유지된다.
- 지적 3(폰트 가용성): 측정 전에 값이 있는 각 zone의 정확한 shorthand로 `document.fonts.check(...)`를
  확인하고, FontFaceSet 부재·check 부재·throw·false면 텍스트 plan을 fail-closed한다. 대체 측정은
  하지 않는다. 텍스트 없는 액자는 그대로 동작하고 입력창은 게이트와 무관하다.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **1088**(1081→1088) / build mockup JS 281.69 kB gzip 86.99, CSS 17.85, admin 무변경 /
  E2E **116 PASS**(114→116) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 무변경: 회전·텍스트 wrap·오류 우선순위·F-1~F-8, `packages/**`, `apps/mockup/src/canvas/**`
- 변경 파일: `PreviewComposer.tsx`(+test), `clockOverlay.ts`(+test), `tests/e2e/mockup-preview.spec.ts`
  — 허용 목록과 일치
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 restore·stage·commit
  하지 않았다

다음 전이: Codex가 `88b64e6`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 031 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-31)

Codex 승인(코드 `88b64e6`, 문서 `b7d46d3`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치):
  `docs/rebuild/specs/031-frame-text-zones-physical-clock-preview.md`(§CODEX_PASSED),
  `docs/handoff/2026-07-31-spec-031-text-clock-handoff.md`(§9 + 상태 줄),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: **unit 1088/1088**, 실제 Chromium **E2E 116/116**,
  frozen·format·lint·typecheck·build·`git diff --check` PASS, 포트 4183·4184·OS temp 잔류 0,
  lockfile·manifest diff 0, 신규 의존성 0, network·live·deploy 0
- **잔류 프로세스 command-line 검사는 NOT TESTED**로 유지했다
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 88b64e6..HEAD -- apps packages tests` = 0줄)
- Claude 재실측(같은 트리): `check` PASS(format·lint·typecheck·unit·build), unit 1088
- 판단 2건(배럴 확장 대신 구조적 타입 · 입력 거부의 빌더 시험 빌드)은 명시 지시 없이 승인으로 수용된
  것으로 기록했다
- NOT TESTED 유지: 잔류 프로세스 command-line, 실기기 4환경 IME·폰트·오버레이, system font 대체,
  실제 인쇄물 가독성, 실제 print/export 텍스트 출력, 실제 물리 시계와 오버레이 위치 일치,
  case 텍스트·admin `name2`·고객 style(범위 밖)
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 restore·checkout·stage·
  commit 하지 않았다
- 다음 스펙·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 032 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

**Founder 지시로 자동 전환**했다: 개별 스펙 DONE에서 멈추지 말고 다음 권장 스펙의 읽기 전용 조사를
수행하며, 자동화는 전체 리빌드 DONE 또는 Founder의 명시적 중단에서만 멈춘다. 구현은 조사 승인과
필요한 Founder 결정 뒤에만 시작한다.

다음 스펙은 임의 선택이 아니라 **스펙 019 §506이 명시한 후속 순서**
(deterministic renderer → image/CORS → pointer → text/clock → **print**)의 마지막 항목이다.
보고서 `docs/codex-claude-handoff/reviews/2026-07-31-print-export-investigation.md`(12항목).

- 인쇄 경로는 **두 세대 공존**: 케이스는 V36 구경로, 액자만 V365(`patchedRender`가 케이스를 되돌린다).
- 해상도 계약이 제품군마다 다르다: 액자는 실물 cm → 300dpi(min 3000 / max 36M / fallback 3508),
  케이스는 cm·dpi 없이 화면 논리 크기의 3~5배.
- ★ 액자의 물리 치수를 **필드 8종 → 이름 텍스트 파싱 → 하드코딩 표**로 추측한다. 사이즈 이름을 바꾸면
  인쇄 해상도가 바뀔 수 있고, 카탈로그 V1 `frameSizes` allowlist에 cm 필드가 없다.
- ★ **경고가 주문을 막지 않는다**: 템플릿 아트 실패 시 아트가 빠진 PNG를 그대로 반환해 저장·다운로드·
  카카오까지 진행된다. 미리보기는 스펙 028에서 fail-closed로 바꿨다.
- 스펙 029~031 중 인쇄 반영은 텍스트뿐이다. 회전(030)은 무시되고, 시계(031 F-4) 제외는 정상이다.
- 리빌드에는 인쇄 코드가 0줄이지만 재료(결정적 plan·executor·normalized pan·quarter turn·확정 lines)는
  모두 있다. 핵심은 새 렌더러가 아니라 **같은 plan을 인쇄 해상도로 다시 만드는 것**이다.
- 권고: **인쇄 폭으로 plan 재생성 + 미리보기 `lines` 재사용** → 좌표 정확성과 줄바꿈 동일성을 동시에.
- 결정 필요: Founder 6건(P-1~P-6, 특히 **P-2 물리 치수 출처**와 **P-3 경고 시 인쇄 생성 여부**) +
  Codex 8건(C-1~C-8). 최소 구현 순서와 STOP 11조건도 기록했다.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- NOT VERIFIED: 레거시 인쇄 미실행(코드 근거만), `CONFIG` 값들의 출처와 인쇄소 요구, `knownCm` 표와
  운영 카탈로그 실제 필드, 운영 CORS 실패, 대용량 성능.
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 P-1~P-6 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 인쇄 관련 제품 코드를 만들지 않는다.

## 스펙 032 조사 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 3건은 모두 유효했고 조사 문서와 상태 문서만 보완했다. 기준 `5a42b29`, 제품 코드 변경 0.

- 지적 1(가장 중요): C-1의 `lines` 재사용 경로가 **현재 API에 없다**. `FrameTextZoneInput`에 `lines`
  입력이 없고 빌더는 값이 있으면 항상 `measureText`로 재wrap하며, `lines`는 `draw-text` command의
  출력으로만 존재한다. "추가 계약 없이 가능"이라는 단정을 제거하고 §8.1을 후보 A/B/C 비교로 다시 썼다.
  각 후보가 줄바꿈·회전·pan·레이어 순서 네 불변식을 어떻게 보장하는지 표로 명시했다.
  새 근거: executor 헤더가 transform을 caller 몫으로 못 박았고 `surface.ts`가 이미 `setTransform(dpr)`
  후 같은 plan을 실행한다 → 후보 A가 가장 강하지만 인쇄 배율의 자간 품질은 NOT VERIFIED이며 선택은
  Codex C-1로 남겼다.
- 지적 2: P-5를 색·사진 transform / 시계 유무 / 고객 문구 원문으로 분리하고 각각 PNG 포함·로컬 저장·
  주문 전송·보존 기간을 구분했다. 최소안 P-5c는 고객 문구를 텍스트로 저장·전송하지 않는 것이며,
  별도 개인정보 정책 승인 없이는 스펙 032 범위에서 제외한다.
- 지적 3: P-4 수치가 레거시 관측값일 뿐 인쇄소 근거가 없음을 명시하고 P-4a(임시값 구현 + 실제 업로드·
  주문·배포 차단)와 P-4b(확인 전 구현 보류)로 갈랐다. STOP 조건 12·13을 추가했다.
- 바꾸지 않은 것: §1~§7 레거시 조사 결과, §10 최소 구현 순서, C-2~C-8
- 제품 코드·테스트·CSS·설정·manifest·lockfile diff 0, 신규 의존성 0, network·live·deploy 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

다음 전이: Codex가 보완된 보고서를 재검토한다. **Founder P-1~P-6은 Codex 승인 전 확정하지 않는다.**

## 스펙 032 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Founder가 `스펙 032 Founder 권장안 P-1·P-2·P-3·P-4a·P-5·P-6을 일괄 승인하고 자동화를 계속 진행해.`로
승인했다. 정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-032-print-export-decisions.md`(신규).

**결정 정본 커밋 `0443137`** — Founder가 이 커밋을 정본으로 명시적으로 인정했다(2026-07-31 재확인).
따라서 P-1·P-2·P-3·P-4a·P-5·P-6은 **확정**이며, Codex 구현 계약은 이 커밋을 입력으로 삼는다.

⚠️ 절차 기록: Codex의 마지막 지시는 "보완된 Founder 질문을 Codex가 승인하기 전 확정하지 않는다"였으나
Founder가 순서를 명시적으로 앞당겨 결정했다. **조사 보고서에 대한 Codex 재검토는 여전히 미완**이며,
재검토에서 질문의 전제가 틀렸다고 밝혀지면 해당 항목은 다시 열어야 한다.

- P-1: 액자 인쇄만 구현하고 케이스 인쇄는 별도 스펙으로 미룬다.
- P-2: 인쇄 물리 치수는 카탈로그 명시 필드에서만 얻고 이름 텍스트 파싱을 쓰지 않는다. 카탈로그 스키마
  확장과 admin 입력 UI는 별도 스펙이며, 치수가 없으면 인쇄를 만들지 않는다.
- P-3: 경고가 있으면 인쇄 파일을 만들지 않는다(fail-closed). 부분 파일·아트 누락 파일 0.
- P-4a: 레거시 수치를 명시적 임시값으로 구현·검증하되 **인쇄소 확인 전까지 실제 업로드·주문 전송·
  배포를 차단**한다. 로컬 다운로드와 E2E는 허용한다.
- P-5: 색·사진 transform과 시계 유무는 담고(P-5a·P-5b), **고객 문구 원문은 텍스트로 저장·전송하지
  않는다(P-5c)**. 문구는 이미 인쇄 PNG에 픽셀로 포함되며, 텍스트 저장·전송은 별도 개인정보 승인이
  필요해 이 스펙 범위가 아니다.
- P-6: 미리보기와 인쇄의 줄바꿈은 반드시 동일해야 한다. 이는 조사 §8.1 후보 선택에 제약만 걸고
  A/B/C 중 무엇을 택할지는 정하지 않는다(Codex C-1).

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
- 제품 코드·테스트·CSS·설정·manifest·lockfile diff **0**, 신규 의존성 0, 인쇄 제품 코드 **0**
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

다음 전이: Codex가 이 결정과 보완된 조사 보고서를 입력으로 **스펙 032 구현 계약**을 작성하면
`WAITING_FOR_CLAUDE`. 계약은 최소한 **C-1(후보 A/B/C 택일)** 과 허용 파일·게이트·NOT TESTED 경계를
확정해야 한다.


## F-A~F-E Founder 결정 선택지 조사 완료 — FOUNDER_DECISION_REQUIRED (Claude Code, 2026-08-10)

기준 HEAD = origin = `267ea72`(스펙 034·035 `CODEX_PASSED`), ahead/behind 0/0.
**읽기 전용 조사 + 문서 인수인계만 수행했다.** 제품 코드·테스트·설정·lockfile·의존성 diff **0**,
실제 Firebase·network·live·emulator·Rules·Hosting·deploy **0**.

정리 문서: `docs/codex-claude-handoff/reviews/2026-08-10-admin-auth-write-founder-decision-options.md`

- F-A 운영자 Auth 도입 시점·인증 방식·허용 계정 정책 (+ `firebase` SDK 신규 의존성 승인 필요)
- F-B `admin/state.json` 저장만 vs `published/state.json` 발행 포함
- F-C 레거시 운영 경로 공유 vs 리빌드 전용 격리
- F-D legacy `wcm`/`hcm` 정규화 결과 되쓰기 vs 메모리 전용
- F-E last-writer-wins 허용 vs revision precondition/잠금

**다섯 항목 모두 미결이다.** 조사 문서 §8의 승인 프롬프트는 **예시이며 Founder가 말한 적이 없다** —
승인으로 취급하지 않는다. 각 항목의 최소 안전 권장안(A2+계정 1개 / B1 / 읽기만 공유 / D1 유지 / E2)은
**Claude의 권장이지 결정이 아니다**.

Codex 다음 검토: 근거 라인 정확성, L-1~L-4 구조적 결론(재현 안 함 = UNCONFIRMED),
**X-7(신규)** 쓰기 payload에서 스펙 034 승격 필드 제외와 legacy pair 처리, X-1~X-6.

워킹트리 dirty 3개는 전부 알려진 보호 대상(spec-018 PNG 2개 + content diff 0인
`packages/render/src/plan/index.ts`)이며 stage·commit·복원하지 않았다.

다음 전이: **Founder가 F-A~F-E를 명시적으로 결정**해야 한다. 그 전에는 결정 문서 작성·구현·
Firebase 표면 접근을 시작하지 않는다. 자동화 루프는 삭제된 상태이며 새로 만들지 않는다.


## F-A~F-E 조사 문서 정확성 보완 — FOUNDER_DECISION_REQUIRED 유지 (Claude Code, 2026-08-10)

검토 기준 `24d0c04`, 판정 `CORRECTION_REQUIRED`. **문서 전용 보완이며 제품 결정 변화 0.**
제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**,
Firebase·network·live·emulator·Rules·Hosting·deploy 실행·변경 **0**.

고친 것 4가지:

1. **"저장소 전역 grep 0건" 주장 제거.** 0건은 **리빌드 `apps/**`·`packages/**` 한정**이고,
   레거시 `denn-admin.html`(인증 7건 + `uploadString` `:14782`·`:14838`)와
   `denn-mockup-tool.html`(인증 4건 + `uploadString` `:15475`·`:15560`)에는 **존재한다**.
2. **"인증 경계는 서버에 이미 확정" → "`storage.rules` 파일이 의도하는 정책은 확인".**
   실제 배포 여부와 거부 동작은 **UNCONFIRMED**로 유지.
3. **F-E 모순 제거.** E2는 원자적 precondition이 아니고 **잔류 last-writer-wins 손실 가능성이
   남는다**. **E2-best-effort**(경합 창·잔류 손실 수용) / **E3-strong**(손실 불허, 지원 가능성
   조사·검증 전까지 쓰기 구현 차단, Rules·잠금은 별도 승인)으로 **택일 분리**.
4. **단계 관계 명시.** 1단계 = Auth + `admin/state.json` **읽기**, 쓰기 0.
   `B1 저장만`은 향후 쓰기 단계의 정책 권장안이며 **현재 구현 허가가 아니다.**
   **쓰기 계약은 Founder의 쓰기 단계 착수 승인 전에는 작성하지 않는다.**

**Founder 승인은 여전히 0건이다.** 보고서 §8은 예시이며 7번 항목은 E2-best-effort / E3-strong 중
**Founder가 직접 골라야 하는 자리**다. 구현 계약·Codex 구조 결정 확정 **없음**.

워킹트리 dirty 3개는 알려진 보호 대상이며 restore·checkout·stage·commit 하지 않았다.
자동화 루프는 삭제된 상태이고 **새 자동화나 반복 작업을 만들지 않았다** — 이후는 수동 인수인계만 쓴다.

다음 전이: **Founder가 F-A~F-E를 명시적으로 결정**(F-E는 E2-best-effort / E3-strong 택일)해야 한다.


## F-A~F-E Founder 결정 정본 기록 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `8ea0c30`. **결정 정본**: `docs/codex-claude-handoff/decisions/2026-08-10-admin-auth-write-boundary-decisions.md`
(승인 원문 그대로 수록). 조사 보고서 §8의 예시 프롬프트는 **superseded**.

**Founder 승인 (2026-08-10, 실제 승인)**

- **F-A** 운영자 Auth 도입. **1단계 = Auth + `admin/state.json` 읽기, 쓰기 0.**
  기존 비익명 운영자 계정 **1개만**. **`firebase` 모듈러 SDK 신규 의존성 승인.**
  신규 계정·다중 계정·역할 권한·**Rules 변경은 승인하지 않음**.
  ⚠️ 계정의 실제 존재·접근 가능 여부는 저장소에서 확인 불가 → **UNCONFIRMED**로 기록.
- **F-B** `published/state.json` **발행 제외**. 쓰기를 열더라도 **admin 상태 저장만**.
  고객 공개 발행은 **별도 승인 + 별도 스펙**. 저장 UI에 **"발행되지 않음" 표시 필수**.
- **F-C** `admin/state.json`은 **읽기만 공유**. 향후 쓰기는 **레거시와 격리된 rebuild 전용 경로**.
  경로는 **Codex 구조 계약**에서 확정. **레거시 파일 공유 쓰기 금지**.
- **F-D** 정규화 결과 **메모리 전용 유지**, **저장 payload에 승격 결과 미포함**,
  되쓰기·삭제·마이그레이션 **금지**(별도 스펙 + 별도 승인).
- **F-E** **E3-strong** — last-writer-wins 손실 **불허**, 원자적 precondition·잠금 가능성을
  **별도 조사·검증하기 전까지 쓰기 구현 차단**. SDK 지원 여부·Firestore 잠금 필요 여부·
  Rules 변경 필요 여부는 **UNCONFIRMED** 유지, 도입은 **별도 승인 대상**.

**승인되지 않은 것**: 제품 구현 자체 · 실제 Firebase/network/live/emulator/운영 데이터 접근 ·
Rules/Hosting/배포 · 신규 계정·다중 계정·역할 · 발행 · 레거시 공유 쓰기 · cm 되쓰기/마이그레이션 ·
**쓰기 구현 전반**.

이번 라운드는 **문서 전용**이다. 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**,
**`firebase` SDK도 아직 추가하지 않았다**(추가는 승인됐고 실행은 구현 단계). 실제 Firebase·network·
live·emulator·Rules·Hosting·deploy **0**. 보호 대상 3개는 restore·checkout·stage·commit 하지 않았다.

다음 전이: **Codex가 "Auth + `admin/state.json` 읽기 전용 구현 계약"을 작성**한다
(허용 파일·AuthPort·읽기 port와 경로 allowlist·합성 fake 검증 범위·`firebase` SDK 추가 방식·
NOT TESTED 경계). 쓰기 port·저장 UI·발행·revision/충돌·tombstone·마이그레이션은 **계약에 넣지 않는다**.
계약 작성 후 Founder가 다시 검토하며, **구현 착수는 그 뒤 별도 승인**이다.
자동화 루프는 삭제된 상태이고 새 자동화·반복 작업을 만들지 않는다.


## 스펙 036 구현 계약 작성 완료 — FOUNDER_DECISION_REQUIRED (Claude Code, 2026-08-10)

기준 `6daf365`. 계약: `docs/rebuild/specs/036-admin-auth-private-state-read.md` (신규).
입력은 Founder 결정 정본 `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`다.

**이번 라운드는 계약 문서 작성뿐이다.** 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 diff **0**,
**`firebase` SDK 미추가**, 실제 Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.

계약이 고정한 것:

- **범위** Email/Password 인증 · 비익명 세션 관찰/복원 · 고정 `admin/state.json` 읽기 ·
  `readLegacyCatalog` 검증 · **메모리 전용**. 저장·쓰기·발행·업로드·revision·충돌·tombstone·
  마이그레이션 **전부 제외**.
- **경계** `firebase@12.16.0` 정확 고정(구현 단계에서만 추가) · admin 기능은 **서브패스
  `@denn/firebase/admin-read` 전용** · **루트 배럴 `packages/firebase/src/index.ts` 수정 금지** ·
  **고객 번들에 Firebase SDK 0** · `packages/shared`·`packages/render` 무수정.
- **활성화** 기본 비활성. `VITE_DENN_ADMIN_FIREBASE_ENABLED=true` + 완전한 공개 config가 모두
  있을 때만 초기화. 아니면 `UNCONFIGURED` 고정 상태 + SDK/observer/Storage **0회**.
  `.env`·실제 config **commit 금지**. live 테스트는 **작성도 실행도 금지**.
- **AuthPort** `User`/token/credential/raw error 비노출 · `onAuthStateChanged`로 초기 판정 ·
  익명은 authenticated 불인정 · 가입/재설정/다중계정 UI 0 · 이메일 하드코딩 0 ·
  password 저장·로그 0 및 종료·unmount 시 정리 · `browserLocalPersistence` 실패는 **fail-closed** ·
  **계정 1개는 운영 정책이며 Rules가 UID/email을 강제하지 않는다는 한계 명시**.
- **ReadPort** 경로 상수 고정(주입 불가) · 20 MiB 미만 · `getBytes` · 9단계 고정 순서 ·
  미인증/익명/초기화중 Storage **0회** · write/upload/delete/`getDownloadURL`/published **0** ·
  자동 retry 0 · stale을 fresh로 위장 금지 · **단일 in-flight 재사용** · 늦은 결과 무시 ·
  unmount 후 setState 0 · **안전 오류 코드 15개 확정**.
- **UI** 8상태 · 명시적 버튼 클릭에서만 read · 자동 read/retry/polling 0 · 성공 문구 1개 ·
  raw/경로/uid/email/SDK 원문 비표시 · 저장·발행·업로드·주문 버튼 0 ·
  스펙 035 카드와 **연결하지 않음** · `role=status`/`aria-live` 명시.
- **허용 파일** 9경로 + 문서(§7). `packages/firebase/src/index.ts` 금지,
  `apps/admin/vite.config.ts`·CSS 기본 금지(필요 시 STOP).
- **검증** 합성 fake 전용 unit(패키지·앱) + E2E(Firebase 요청 0, 고객 번들 문자열 0,
  고객 dist SHA-256 동일) + 게이트 순서 + STOP 조건 8개 + NOT TESTED 8개.

**UNCONFIRMED**: `firebase@12.16.0`의 실제 존재와 Node 24/Vite 8/TS 7 호환성(실제 network 금지) ·
운영자 계정 실재 여부 · Rules 실제 배포·거부 동작 · 실제 `admin/state.json` 내용.

**구현은 아직 승인되지 않았다.** Founder가 이 계약을 검토해 **구현 착수를 별도로 승인**해야 하며,
그 전에는 `packages/firebase`·`apps/admin` 코드와 `firebase` SDK 추가를 시작하지 않는다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화 루프는 삭제된 상태이고
새 자동화·반복 작업을 만들지 않았다.

다음 전이: **Founder의 계약 검토 + 구현 착수 승인**.


## 스펙 036 계약 정확성 보완 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `77b5b47`. **문서 전용 보완이며 제품 결정·구현 변화 0.**
계약: `docs/rebuild/specs/036-admin-auth-private-state-read.md`(개정 이력 블록 참조).
제품 코드·테스트·CSS·설정·manifest·package.json·lockfile·의존성 diff **0**,
**`firebase` SDK 미추가**, Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.

고친 것 5가지:

1. **SDK 버전** `firebase@12.16.0` → **`firebase@12.17.1` 정확 고정**(2026-08-04 최신 공식 릴리스,
   출처 firebase.google.com 릴리스 노트·web setup). **버전 존재는 VERIFIED**로 기록하고 초판의
   "존재 여부 UNCONFIRMED"는 제거했다. **Node 24 / Vite 8 / TS 7 / 현재 pnpm workspace와의
   실제 설치·빌드 호환성만 UNCONFIRMED**로 남으며 구현 단계 frozen install에서 처음 확인된다.
   **이번 라운드에 설치·lockfile 갱신은 하지 않았다.**
2. **config 완전성 판정** — 플래그는 **정확히 `VITE_DENN_ADMIN_FIREBASE_ENABLED === "true"`**,
   공개 config **5개**(`API_KEY`·`AUTH_DOMAIN`·`PROJECT_ID`·`STORAGE_BUCKET`·`APP_ID`)를
   **모두 비어 있지 않은 문자열**로 확보했을 때만 adapter 생성. 하나라도 누락·빈 문자열이면
   **`UNCONFIGURED` + `initializeApp`/Auth observer/Storage 0회**.
   **`packages/firebase`는 `import.meta.env`를 직접 읽지 않고 `apps/admin`이 만든 typed config만
   주입받는다.** 실제 값 하드코딩·`.env` commit 금지 유지.
3. **공개 타입을 유효한 TypeScript로 확정** — `Promise<Result>`처럼 타입 인자가 빠진 표현 제거.
   `packages/shared/src/index.ts:19`의 `Result<T, E>`를 **`E` 생략 없이** 사용하고
   `OperatorAuthErrorCode`·`AdminReadErrorCode`·`SafeAdminReadError`·`OperatorAuthActionResult`·
   `AdminStateLoadResult`를 완전 정의했다. **`correlationId`는 호출자(`apps/admin`)가 생성·주입**하며
   **sign-in/sign-out/load 세 시그니처 모두에 명시**하고 형식은 `/^[0-9a-f]{8,64}$/`(비식별 난수)다.
   Firebase `User`·credential·token·raw SDK error는 공개 타입에 **없다**.
4. **안전 오류 15개 매핑 표** 추가 — category / code / retryable / 발생 조건 /
   대응 SDK code·로컬 검증 단계. **invalid credential 계열은 계정 존재 추론을 막기 위해
   `INVALID_CREDENTIAL` 하나로 통합**, `auth/too-many-requests` → `AUTH_RATE_LIMITED`,
   `auth/network-request-failed` → `NETWORK_UNAVAILABLE`,
   `storage/object-not-found` → `ADMIN_STATE_NOT_FOUND`, `storage/unauthorized` → `ADMIN_STATE_FORBIDDEN`,
   `storage/download-size-exceeded` → `RESPONSE_TOO_LARGE`, 미등록 code는
   `UNEXPECTED_ADMIN_READ_ERROR`로 접는다. **`NETWORK_TIMEOUT`은 SDK code가 아니라 앱 wrapper
   타임아웃 상태**임을 근거와 함께 구분했다. raw code/message 비노출·자동 retry 0 유지.
5. **20 MiB 설명 정정** — `ADMIN_STATE_MAX_BYTES = 20 × 1024 × 1024 − 1 = **20,971,519 bytes**`.
   `storage.rules:14`의 경고(read 조건에 `request.resource.size` 금지)와 `:26`의
   `allow read: if op();`로 보아 **서버는 read 크기를 제한하지 않는다**. 이 값은 write-side
   `okSize()`(`:22`)와 숫자를 맞춘 **클라이언트 `getBytes` 안전 상한**이며 **서버 read 보장이 아니다**.

**구현은 여전히 시작하지 않았다.** 다음 전이: **Codex가 보완된 계약을 검토**한다.
검토 통과 후 Founder의 **구현 착수 승인**이 있어야 코드 작성과 `firebase` SDK 추가를 시작한다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았다.


## 스펙 036 계약 타입·비동기 경계 보완 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `9fb1456`. **문서 전용이며 제품 결정·범위 변화 0.** 계약:
`docs/rebuild/specs/036-admin-auth-private-state-read.md`(개정 이력 "2차 보완" 블록).
제품 코드·테스트·CSS·설정·manifest·`package.json`·lockfile·의존성 diff **0**,
**`firebase` SDK 미추가**, Firebase·network·live·emulator·운영 데이터·Rules·Hosting·deploy **0**.

고친 것 4가지:

1. **`OperatorAuthState` 오류 타입 축소** — `error`의 코드가 `AdminReadErrorCode` → **`OperatorAuthErrorCode`**.
   `INVALID_CATALOG`·`ADMIN_STATE_*` 같은 catalog/storage 전용 코드가 **인증 observer 상태에
   타입상 들어올 수 없다**.
2. **observer가 인증 상태의 유일한 권위**(§4.3) — `OperatorAuthActionValue`에서 **`state` 필드 제거**,
   성공 값은 `correlationId`만. sign-in/sign-out Promise 성공은 **SDK action 완료**만 뜻하고
   `authenticated`/`signed-out` 확정은 **`onAuthStateChanged`만** 담당한다.
   **action 완료 순서와 observer 통지 순서를 가정하지 않으며**, UI는 action 결과로 인증 상태를
   덮어쓰지 않는다. 합성 테스트 3건(조기 전환 금지 / 늦은 action이 되돌리지 않음 / sign-out 동일)을
   §8에 추가했다.
3. **timeout 상수와 범위 확정**(§5.4) — "예: 10s" 제거,
   **`ADMIN_STATE_READ_TIMEOUT_MS = 30_000`** 고정. wrapper는 **`AdminStateReadPort`의 `getBytes`
   읽기에만** 적용하고 **`signInWithEmailPassword`·`signOut`·`onAuthStateChanged`에는 적용하지 않는다**
   (Auth action은 timeout 반환 후 SDK가 늦게 성공하면 **실제 세션이 바뀌어 반환값과 갈라진다**).
   `getBytes`는 읽기 전용이라 30초 초과 시 `NETWORK_TIMEOUT`을 반환하고 **늦은 완료를 폐기**하되,
   **실제 SDK 요청 취소를 지원한다고 주장하지 않는다**. 늦은 완료는 generation/`correlationId`로
   무시하고 UI·메모리 상태를 갱신하지 않으며 **자동 retry는 0**. fake timer 테스트
   (29,999 ms 미완료 / 30,000 ms timeout / timeout 후 늦은 성공 무시)를 §8에 고정했다.
4. **비노출 검증 문구 정정**(§8.1) — 성공 결과는 검증된 `CatalogDocumentV1`/`CatalogReadReport`를
   반환하므로 **정상 카탈로그의 합법적 `data:` URL·base64가 성공 값에 있을 수 있다.** 따라서
   ① SDK raw error의 가짜 token/email/uid/raw message는 `SafeAdminReadError`와
   `JSON.stringify(error)`에 **0건** ② invalid UTF-8/JSON/catalog 실패 시 **원문 bytes/JSON/base64가
   error에 0건** ③ **UI·console/log에는 성공·실패 모두 raw catalog/base64/경로/token/email/uid 0건**
   ④ 성공 값의 **합법적 카탈로그 data URL 제거는 요구하지 않음** ⑤ 성공 값에 **원문 bytes·원문 JSON
   문자열을 별도 보존하지 않음**으로 분리했다. 성공 값은 **메모리 전용**이며 스펙 035 UI·localStorage·
   IndexedDB·주문·upload·publish와 **연결하지 않는다**.

**구현은 시작하지 않았다.** 다음 전이: **Codex의 최종 계약 검토**, 그 뒤 Founder의 **구현 착수 승인**.
보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았다.


## 스펙 036 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-08-10)

Founder가 계약 `765dfb4`와 **구현 착수**를 승인했다. 구현 커밋 **`fd92fbc`**, 기준 `765dfb4`.
운영자 Email/Password Auth + 비익명 세션 관찰 + 고정 `admin/state.json` 읽기 +
`readLegacyCatalog` 검증 + **메모리 전용**. 쓰기·발행·업로드·revision·충돌·tombstone·마이그레이션 **0**.

- **의존성**: `firebase@12.17.1` 정확 고정(`packages/firebase/package.json` + `pnpm-lock.yaml`),
  `apps/admin`에 `@denn/firebase: workspace:*`. 승인 외 신규 의존성 **0**.
- **경계**: admin 기능은 **`@denn/firebase/admin-read` 서브패스 전용**,
  **`packages/firebase/src/index.ts` 무변경**, SDK는 **동적 import**로만 접근.
  → **고객 `dist` SHA-256 구현 전후 동일**(`f86d446d…7bbc09`), admin 번들에서 Firebase는 lazy 청크로 분리.
- **게이트**: frozen install PASS · format · lint · typecheck · **unit 1258/1258** ·
  독립 build · **Chromium E2E 134/134** · `pnpm check` PASS · `git diff --check` 클린 ·
  금지 diff 0 · ports 4183/4184 **0** · OS temp **0** · **실제 Firebase 요청 0건**.
- **⚠️ `pnpm-workspace.yaml`**: pnpm 11이 자동 추가한 `allowBuilds` 3줄을 Founder 지시로 제거했고
  제거 상태에서 frozen install은 exit 0이다(파일 = HEAD 동일, 커밋하지 않음).
  **NOT VERIFIED**: `node_modules` 없는 새 클론에서 첫 frozen install이 같은 오류를 낼 수 있다 —
  발생 시 `@firebase/util`·`protobufjs`를 `false`로 명시하는 것이 최소 해결책이며 **별도 승인 대상**이다.
- **NOT TESTED**: 운영자 계정 실재·로그인, `storage.rules` 실제 배포·거부, 실제 `admin/state.json`,
  인증 만료·갱신, 실제 Storage CORS·`getBytes`, 실기기, 쓰기 원자성, 실제 SDK 오류 코드 문자열.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았다.
다음 전이: **Codex 독립 검증**. 다음 스펙은 시작하지 않는다.


## 스펙 036 CORRECTION_REQUIRED 라운드 1 완료 — READY_FOR_CODEX (Claude Code, 2026-08-10)

기준 `e873049`, 보완 커밋 **`b7ee207`**(제품), 종료 문서는 별도 커밋. 지적된 **4개 결함만** 고쳤다.

1. **초기화·observer 오류 fail-closed** — `onAuthStateChanged(listener, onError)`로 오류 경계를
   계약에 추가, `sdk-facade`가 SDK error callback 전달, `createLazyFacade`가 factory rejection을
   같은 경로로 라우팅. `mapAuthError`를 거쳐 **안전 코드만** publish(`auth/network-request-failed`
   → `NETWORK_UNAVAILABLE`, 미등록 → `UNEXPECTED_ADMIN_READ_ERROR`).
   **unhandled rejection 0 · raw error 비노출 · `initializing` 영구 고정 제거 ·
   rejection 전 unsubscribe 시 callback 0회**를 unit으로 고정.
2. **timeout 공개 계약 고정** — 공개 옵션에서 `timeoutMs` 제거, 제품 경로는 항상
   `ADMIN_STATE_READ_TIMEOUT_MS`. seam은 `read-port.ts` 내부이며 `index.ts` 미노출.
   런타임 override 시도도 30,000 ms를 따르는 것을 unit으로 고정.
3. **로그아웃 동시성 차단** — 내부 `busy="signing-out"` 가드. 새 공개 상태·문구 **0**,
   진행 중 `canSignIn`/`canLoad` **false**, 중복 signOut 1회·진행 중 load/signIn 0회,
   observer 단일 권위 유지.
4. **Vite 경고 제거** — `vi.resetModules()` + 정적 `import("./index")`.
   **unit 실행에 invalid dynamic import warning 0건.**

게이트: frozen install exit 0 · format · lint · typecheck · **unit 1271/1271**(1258 → +13) ·
build · **Chromium E2E 134/134** · check · diff-check 클린 · **금지 경로 diff 0** ·
고객 dist SHA-256 **`f86d446d…7bbc09` 동일** · 실제 Firebase/network 요청 **0** ·
ports 4183/4184 **0** · OS temp **0**.

**`pnpm-workspace.yaml`은 이번에도 수정하지 않았고 `pnpm approve-builds`도 실행하지 않았다.**
새 클론 frozen install 재발 여부는 **NOT VERIFIED**이며, Codex의 새 클론 시도가 **registry EACCES로
중단**됐으므로 성공·실패 어느 쪽으로도 단정하지 않는다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업은 만들지 않았고
다음 스펙도 시작하지 않았다. 다음 전이: **Codex 독립 재검증**.


## 스펙 036 CORRECTION_REQUIRED 라운드 2 — 문서 전용 해시 기록 정정 (Claude Code, 2026-08-10)

기준 `1796a2d`. **제품 코드·테스트·CSS·config·manifest·lockfile·`pnpm-workspace.yaml` 변경 0.**
제품 보완 `b7ee207`의 4개 결함은 **Codex 독립 재검증 통과**(frozen install · format/lint 각 153 파일 ·
typecheck · unit **1271/1271** + invalid dynamic import warning **0** · build · Chromium **134/134** ·
check · diff·금지 diff 0 · ports/temp 0).

**★ 고객 JS 해시 기록 정정 — 두 값은 서로 다른 측정이며 둘 다 현재 재현된다.**

- **정본(파일 해시)**: `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** ·
  SHA-256 **`fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685`**
- 이전 기록 `f86d446dde121bce287b393f905a02208b106face54b0803033eb800437bbc09`는
  **`dist` 트리 집계 다이제스트**(`find … | xargs sha256sum | sha256sum`)이며 **JS 파일 해시가 아니다**.
  값은 지금도 재현되지만, 그것을 **"고객 dist SHA-256"이라고 부른 라벨이 틀렸다**.
  **과거 기록은 삭제·덮어쓰기 하지 않고** 스펙 036 라운드 2 절과 live 로그로 정정했다.
- 앞으로는 **파일명 + 바이트 수 + 파일 해시**를 함께 기록한다. 집계 다이제스트는 경로 문자열과
  정렬·셸 환경에 의존해 기계 간 비교에 부적합하다.
- 재현: Codex 4건(독립 build 2회 · E2E 전후 · `765dfb4` archive 재빌드 · 유출 문자열 0건) +
  Claude 1건(두 측정 방식 모두 재현). → **"기준과 현재 고객 JS byte-identical" PASS.**

이 라운드는 문서 전용이라 게이트를 재실행하지 않았다(직전 라운드 수치가 정본).
`pnpm-workspace.yaml`의 `allowBuilds`는 여전히 **NOT VERIFIED**이며 수정·`approve-builds` 모두 하지 않았다.
Codex의 새 클론 시도는 **registry EACCES로 중단**돼 성공·실패로 단정하지 않는다.

보호 대상 3개는 restore·checkout·stage·commit 하지 않았다. 자동화·반복 작업 0, 다음 스펙 미착수.
다음 전이: **Codex 확인 후 스펙 036 종료 판단**.


## 스펙 036 CORRECTION_REQUIRED 라운드 3 — 문서 위생 (Claude Code, 2026-08-10)

기준 `91acec0`. **문서 전용.** 제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·
`pnpm-workspace.yaml` 변경 **0**. 전체 테스트는 반복하지 않았다(제품 수치는 `b7ee207` 검증분이 정본).

**커밋 구분(중요)**

- **제품 검증 커밋 = `b7ee207`** — 구현 `fd92fbc` + 라운드 1 보완. **Codex 독립 검증 통과.**
- **문서 커밋** — 라운드 2 `91acec0`(해시 기록 정정), 라운드 3(이 항목).
  **`b7ee207` 이후 제품 코드 변경은 없다.**

**고친 불일치 4가지**

1. `verified_commit`이 **스펙 035 시절 값 `e9e2af6`** 으로 남아 있었다 → 실제 검증된 제품 커밋
   **`b7ee207`** 으로 정정.
2. `active_unit`이 `spec-036-codex-independent-verification`이었으나 제품 재검증은 이미 끝났다 →
   **`spec-036-closure-doc-verification`** 으로 정정.
3. `candidate_commit`에 제품/문서 커밋이 섞여 있었다 → 문서 라운드에는 제품 후보가 없음을 명시.
4. `CURRENT.md` 상단 정본 요약이 "다음 = Codex 독립 재검증"이라 말하고, 같은 블록에서
   `f86d446d…`를 다시 **"고객 dist SHA-256"** 이라 부르며, 게이트 수치도 **unit 1258**로
   낡아 있었다 → 종료 문서 확인 단계로, 정본 해시는 **파일명 + 287,741 bytes + `fc7660e5…`**,
   `f86d446d…`는 **dist 트리 집계 다이제스트**로만, 수치는 **unit 1271/1271 · E2E 134/134**로 정정.

live 로그와 스펙 036의 과거 append 기록은 **삭제·덮어쓰지 않았다**. `CURRENT.md` 상단 요약만
현재 사실로 재작성했다.

`pnpm-workspace.yaml`의 `allowBuilds`는 여전히 **NOT VERIFIED**(수정·`approve-builds` 모두 안 함,
Codex 새 클론 시도는 registry EACCES로 중단). 보호 대상 3개는 restore·checkout·stage·commit 하지
않았다. 자동화·반복 작업 0, 다음 스펙 미착수.

다음 전이: **Codex의 종료 문서 확인 → 스펙 036 종료 판단.**
