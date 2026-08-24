# 스펙 073 — space V2 persistence boundary 읽기 전용 조사

상태: **CORRECTION ROUND 1 APPLIED / READY_FOR_CODEX / DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI**

## 1. 목표

스펙 072의 local issue bundle을 immutable Storage object와 immutable Firestore `spaces/{token}`로
저장하기 전에 필요한 계약·Rules·결과 미확정·reconciliation 경계를 읽기 전용으로 조사한다.

이번 단위는 구현 계약 확정이나 제품 구현이 아니다. 실제 Firebase 요청, emulator 실행, Rules/config
변경과 UI 연결을 하지 않는다.

## 2. 반드시 읽을 정본

- `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`
- `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`
- `docs/rebuild/specs/068-space-v2-local-issue-preparation-orchestrator.md`
- `docs/rebuild/specs/071-space-v2-local-issue-identity-pair.md`
- `docs/rebuild/specs/072-space-v2-local-issue-bundle-orchestrator.md`
- `docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`
- `docs/codex-claude-handoff/decisions/2026-08-21-space-v2-issue-identity-decisions.md`
- G-4 orphan 결정·조사 문서
- `storage.rules`, `firestore.rules`, `firebase.json`, `firebase.emulator.json`
- `packages/firebase/src/admin-write/**`, `packages/firebase/src/space-read/**`
- `apps/admin/src/space-v2/**`
- 설치된 Firebase SDK 관련 공개 타입·소스(읽기 전용)

## 3. 조사 질문

1. 현재 `storage.rules`에서 `rebuild-space-assets/objects/{assetId}.png`의 create/read/update/delete가
   각각 허용되는지, GG-4 목표와 무엇이 다른가.
2. 현재 `firestore.rules`의 `spaces/{token}` create가 GG-5의 approved operator UID·V2 exact outer
   keys·create-only 목표를 충족하는가. V1 create 호환을 깨지 않고 V2만 구분할 수 있는가.
3. Firebase Web SDK 공개 API로 `bundle copy → immutable asset upload → immutable spaces/{token}
   create`를 구성할 때 exact 호출·오류 경계는 무엇인가.
4. upload 명확 실패·결과 미확정·성공 뒤 Firestore 실패/거부/결과 미확정·브라우저 종료에서 asset와
   document가 어떤 상태로 남는가.
5. unique create-only path의 upload outcome을 read-only metadata/bytes로, Firestore create outcome을
   exact token/document read-back으로 판정할 수 있는가. 근거가 부족하면 `UNCONFIRMED`로 남긴다.
6. 결과 미확정에서 자동 retry·같은 경로 재업로드·새 token 발급이 왜 안전하거나 위험한지 구분한다.
7. proof asset orphan과 아직 늦게 성공할 수 있는 미판정 object를 구분할 수 있는가. 기존 G-4 정책과
   충돌하지 않는가.
8. 기존 admin-write C5 port를 재사용할 수 있는 부분과 admin state 전용이라 재사용하면 안 되는
   부분을 구분한다.
9. 필요한 최소 Rules/config/emulator/product/test 파일 후보, error code 후보, synthetic fake와 emulator
   검증표를 제시한다.
10. 다음 구현 전에 Founder가 승인해야 할 항목을 최소 질문으로 분리한다.

## 4. 필수 실패표

다음을 `PASS / FAIL / UNCONFIRMED / NOT TESTED`로 분류한다.

- upload 명확 성공 → Firestore create 성공
- upload 명확 실패
- upload 결과 미확정, object 부재 또는 exact object 존재 관측
- upload 성공 → Firestore create 명확 거부/실패
- upload 성공 → Firestore create 결과 미확정, 문서 부재/일치/불일치 관측
- 브라우저 종료·인증 만료·중복 탭
- 같은 token 또는 assetId 재사용 시도
- asset만 존재하는 orphan과 document만 존재하는 broken reference

시간 경과만으로 미판정 상태가 안전한 orphan으로 바뀐다고 단정하지 않는다.

## 5. 산출물과 허용 파일

- 신규 보고서: `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md`
- 추가 허용 문서: 이 스펙, 관련 handoff, STATE/NEXT/CURRENT/live log.

제품 코드, test, Rules, Firebase config, package/lockfile와 보호 대상은 수정하지 않는다. 문서만 일반
fast-forward commit/push한다.

## 6. 계속 금지

- 실제 Firebase/project/bucket/object/Firestore/network/live 데이터 접근
- emulator 실행, upload/write/read-back/delete, Rules/Hosting 배포
- 실제 UID 추측·기록, 운영 쓰기, URL 발급, UI 연결
- 제품 코드/test/Rules/config/package/lockfile 변경
- orphan 삭제·자동 정리, C6/backend 구현
- 자동화·반복 작업과 다음 구현 스펙 자동 시작

## 7. 종료 상태

- 조사 문서 push 후 `READY_FOR_CODEX`.
- 구현 가능성을 승인된 것처럼 기록하지 않는다.
- Rules 변경, emulator 구현 또는 persistence adapter가 필요하면 Founder 결정 질문을 분리한다.
- 전체 리빌드 진행도는 조사만으로 올리지 않는다.

### QUESTIONS

없음. 이번 단위는 읽기 전용 조사와 Founder 선택지 작성까지만 수행한다.

### DONE (Claude)

상태: **INVESTIGATION DONE / READY_FOR_CODEX / DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI**
(2026-08-24)

- Codex 문서 8개 → 문서 commit `c5f8384`. 조사 보고서·상태 문서 → 문서 commit `f1f5d20`.
  해시 고정 → `534c26f`. 보완 라운드 1 → 별도 문서 commit(§DONE 보완 라운드 1 참조). 전부 일반
  fast-forward push. **제품 commit 없음**(문서 전용 단위).
- §5 허용 범위 준수: 신규 보고서
  `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md` +
  이 스펙 + handoff + STATE/NEXT/CURRENT/live log. 그 외 변경 **0**.
- §6 계속 금지 준수: 실제 Firebase/project/bucket/object/Firestore/network/live 접근 **0**,
  emulator 실행 **0**, upload/write/read-back/delete **0**, Rules/Hosting 배포 **0**, 실제 UID
  추측·기록 **0**, URL 발급 **0**, UI 연결 **0**, 제품 코드/test/Rules/config/package/lockfile
  변경 **0**, orphan 삭제·자동 정리 **0**, C6/backend **0**, 자동화·반복 작업 **0**,
  다음 구현 스펙 시작 **0**.
- 이 단위에서 실행한 것은 저장소 안 파일 읽기와 `node_modules` 안 **설치된 SDK 타입/소스 읽기**뿐이다.

§2 필독 정본 확인: 037 · 064 · 068 · 071 · 072, 2026-08-20 replay evidence 결정,
2026-08-21 issue identity 결정, 2026-08-11 G-4 orphan 보존 결정(+ atomicity 결정),
`storage.rules` · `firestore.rules` · `firebase.json` · `firebase.emulator.json` + emulator 사본 2개,
`packages/firebase/src/admin-write/**` · `space-read/**`, `apps/admin/src/space-v2/**`,
설치 SDK(`@firebase/storage` 0.14.4 · `@firebase/firestore` 4.17.0) 공개 타입/소스.

§3 조사 질문 10개 전부 응답(보고서 §2). 요약:

1. `rebuild-space-assets/objects/**`는 `storage.rules`에 match **부재** → CRUD 전부 기본 거부.
   GG-4 목표 중 update/delete만 우연히 일치, create/read는 신설 필요.
2. `spaces/{token}` create는 `if true` → GG-5의 UID·exact keys **둘 다 FAIL**, 불변성만 PASS.
   레거시가 항상 `schema:'space-v1'`을 쓰므로 V1 무손상 V2 분기는 근거상 가능.
3. 공개 API는 전부 존재. ★ write outcome 판정에는 `getDoc`이 아니라 **`getDocFromServer`** 필요.
   `storage/unauthorized`는 "권한 없음"과 "이미 존재"를 구분하지 못한다.
4. upload-first 5개 종착 상태 + 브라우저 종료·인증 만료·중복 탭 정리.
5. 고유 create-only 경로 + size/`md5Hash`, exact outer 대조로 판정 가능하나 **UNCONFIRMED**.
6. 미확정에서 자동 retry·같은 경로 재업로드·같은 token 재create·새 token 발급 **모두 부적합**.
   안전한 것은 읽기 전용 판정 1회뿐.
7. ★ V2는 asset↔document 연결이 **암호문 안**이라 Rules가 참조 관계를 물을 수 없다 →
   **G-4 구조 A SDC′ 이식 불가**, orphan/미판정 구분 불가. 삭제 보류가 유일한 기본값이며 평문 REC
   우회는 토큰 비밀성과 충돌한다. 기존 G-4 정책(D-2=O-3)과는 충돌하지 않는다.
8. admin-write 재사용 가능 항목 10개 / 재사용 불가 항목 8개를 분리.
9. 파일 후보 5단계, error code 후보 8개, fake 검증표 10행, emulator 검증표 13행 제시(구현 0).
10. Founder 결정 질문 **JJ-1~JJ-7** 분리.

§4 필수 실패표: 20행을 PASS/FAIL/UNCONFIRMED/NOT TESTED로 분류(보고서 §3). 요구된 8개 상황을 모두
포함하며 **시간 경과만으로 미판정이 안전한 orphan이 된다고 단정하지 않았다**. asset-only orphan과
document-only broken reference는 둘 다 **FAIL**(현재 계약에서 사후 식별 불가)로 기록했다.

§7 종료 조건 준수: 조사 문서 push 후 `READY_FOR_CODEX`. 구현 가능성을 승인된 것처럼 기록하지
않았고, Rules 변경·emulator·persistence adapter가 필요한 지점은 전부 Founder 결정 질문으로 분리했다.
**전체 리빌드 진행도는 조사만으로 올리지 않았다 — 78~81% 완료 / 19~22% 잔여, 변동 없음.**

### CODEX REVIEW — CORRECTION_REQUIRED 라운드 1 (2026-08-24)

현재 HEAD=origin `534c26f`, ahead/behind 0/0에서 문서 독립 검수를 수행했다. 제품 코드/test/Rules/
config/package/lockfile 변경은 없고, working tree는 기존 Founder/user 보호 변경뿐이며 staged 0이다.

다음 세 묶음을 문서에서 정정한 뒤 재검수한다.

1. **private REC 후보 누락:** 승인된 outer의 암호문만으로 Rules가 참조 관계를 볼 수 없다는 결론은
   유지한다. 그러나 클라이언트 read/list를 모두 거부한 private write-once Firestore mapping/REC은
   token을 공개하지 않고 Storage Rules가 서버 측 `firestore.get()/exists()`로 읽는 후보가 될 수 있다.
   mapping 키·필드, create 권한, spaces create와의 원자적/순차 결합, crash·결과 미확정·늦은 성공,
   Rules access-call 비용·한도, orphan 확정 가능성을 분석한다. 가능 후보와 안전성 PASS·구현 승인을
   혼동하지 않으며 근거 부족은 `UNCONFIRMED/NOT TESTED`로 둔다.
2. **Firestore timeout 표현과 근거:** 설치 `@firebase/firestore` 4.17.0
   `dist/index.d.ts:2582-2595`와 `:1386-1413`을 정확히 인용한다. `setDoc`의 local cache 반영과
   `getDoc`의 cache 반환 가능성 때문에 server-only reconciliation은 `getDocFromServer`를 요구한다.
   다만 SDK가 자체 timeout으로 실패했다고 쓰지 않고 앱의 bounded timeout/호출 포기 후에도 원 Promise와
   pending write가 남을 수 있는 경계로 정정한다. 실제 emulator/runtime timeout은 `NOT TESTED`다.
3. **현재/목표 및 정적/실행 판정 분리:** 현재 asset 경로의 default deny와 목표 create-only rule,
   Firestore `allow read`가 get/list를 포함한다는 정적 분석과 실제 실행 `NOT TESTED`, exact
   `getDocFromServer` match의 API·논리 근거와 실제 실행 상태를 실패표에서 각각 분리한다.

보완은 보고서·이 spec·STATE/NEXT/CURRENT/live log 6개 문서만 허용한다. Founder JJ-1~JJ-7 선택,
제품 구현, Rules/config/test 변경, emulator/live 접근과 다음 스펙은 보완 재검수 통과 전까지 금지다.

### DONE (Claude) — 보완 라운드 1

상태: **CORRECTION ROUND 1 APPLIED / READY_FOR_CODEX** (2026-08-24)

- 기준 HEAD=origin `534c26f`, ahead/behind 0/0. 위 `CODEX REVIEW` 세 묶음을 전부 문서에 반영했다.
- 수정한 파일은 허용 6개뿐이다: 조사 보고서, 이 spec, `Automation/DENN_AUTOMATION_STATE.md`,
  `Automation/NEXT_CLAUDE_PROMPT.md`, `docs/codex-claude-handoff/CURRENT.md`,
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`. 제품 코드/test/`storage.rules`/`firestore.rules`/Firebase
  config/package/lockfile, `apps/**`, `packages/**`, 보호 대상 변경 **0**.
- 실제 Firebase/project/bucket/Firestore/network/live 접근 0, emulator 실행 0,
  upload/write/read-back/delete/deploy 0, UID 추측 0, URL 발급 0, UI 연결 0, 자동화·반복 작업 0,
  Founder JJ-1~JJ-7 선택 0, 다음 구현 스펙 0. 이번 라운드도 **문서 읽기와 설치 SDK 타입/소스
  읽기만** 했다.

**보완 1 — private write-once mapping/REC 후보 (보고서 §Q7.1 신설)**

- 초판의 *"asset↔token 매핑을 평문으로 두면 토큰 비밀성 모델이 반드시 깨진다"* 단정을 **폐기**했다.
  그 문장은 매핑이 **클라이언트에게 읽히는 경우**에만 참이다.
- 유지되는 결론(좁힌 형태): *승인된 V2 outer(`schema`/`enc` 2키)의 암호문만으로는 Rules가
  asset↔document 관계를 볼 수 없다.* O-3 삭제 보류도 기본값 그대로다.
- 후보 **V2-2′**를 다음 축으로 분석했다 — 키·필드 후보 3종(assetId→token / assetId→opaque linkId /
  opaque recId), 승인 UID create-only, 클라이언트 get/list 거부, `spaces` create와의 순차 commit vs
  같은 transaction+`getAfter()`, crash·결과 미확정·늦은 성공, Storage Rules 문서 접근 한도
  (**2개, 여유 0**)·quota/과금·default DB 제약·IAM.
- **키 후보 (c) opaque recId는 성립하지 않는다** — GG-4=A가 object path를 `{assetId}.png`로 고정했다.
- ★ **결정적 한계: 이 후보만으로 확정 orphan을 증명하지 못한다.** admin-state SDC′는
  `head.revision` 단조 증가가 늦은 commit의 CAS 승리를 불가능하게 만들어 성립했는데, V2에는 대응
  값이 없어 `spaces/{token}` create는 언제 도착해도 성공한다. 매핑은 "관계를 볼 수 없다"는 장벽만
  치우고 "미판정과 orphan을 가르는" 장벽은 남긴다.
- 신규 `UNCONFIRMED` 2건: ① Rules 안의 `get()/exists()`가 대상 문서의 `allow read` 거부를 우회한다는
  **공식 인용을 이 세션에서 취득하지 못했다**(live 접근 금지, 저장소 내부 정황이 근거의 전부).
  ② 한 `firestore.get()` 결과를 다른 조회 경로에 **연쇄 보간**하는 지원 여부 미확인.
- **가능한 후보라는 사실은 삭제·Rules·schema/backend 구현 승인도, 안전성 PASS도 아니다.**
  V2-2′는 규칙 미작성 · `NOT TESTED`다.

**보완 2 — Firestore timeout 표현과 근거**

- 설치 `@firebase/firestore` 4.17.0 `dist/index.d.ts:2582-2595`(`setDoc`)와 `:1386-1413`
  (`getDoc`/`getDocFromCache`/`getDocFromServer`) **원문을 인용**했다.
- 유지: server-only write outcome reconciliation에는 **`getDocFromServer`가 필요하다**.
- ★ 폐기: *"`setDoc`이 로컬 timeout으로 실패 처리돼도"*. 원문상 **`setDoc`의 Promise에는 SDK 자체
  timeout이 없다**(서버가 성공/오류를 알릴 때까지 settle하지 않는다). 정확한 경계는 **앱이 자기
  bounded timeout으로 기다림을 포기해도 원 Promise와 pending write가 남고 연결 회복 시 서버에
  기록된다**(*"will eventually be written…"*)이다.
- **API 동작 근거와 실제 emulator/runtime timeout 시나리오 `NOT TESTED`를 분리**했고, 정확한 설치
  소스 경로 3개를 근거 목록(§1.2)에 명시했다.

**보완 3 — 현재/목표 및 정적/실행 분리 (보고서 §3 재구성)**

- 판정 축 A: **[현재 Rules]** vs **[목표 후보 Rules]**. 판정 축 B: **정적 / 설계 / 실행**.
- 표를 §3.1(현재 Rules 정적 판정) · §3.2(목표 후보 설계 판정) · §3.3(실패 순서별)로 나눴다.
- **같은 assetId 재업로드**를 목표 create-only rule의 PASS로 적던 것을 고쳤다 — [현재]는 규칙 부재로
  default deny이고 목표 rule의 거부는 미작성·`NOT TESTED`다. 반면 같은 token 재create는
  `update: if false`가 **이미 존재하는 규칙**이라 [현재] 정적 PASS로 남는다.
- `spaces`의 `allow read`가 get/list를 포함한다는 것은 **정적 사실**이며 `UNCONFIRMED`가 아니다.
  실제 열거 동작만 `NOT TESTED`다. §4에 "정적 결론이지만 실행 검증이 없는 것" 항목을 신설해 분리했다.
- `getDocFromServer` exact match도 **API/논리 근거**와 **실행 `NOT TESTED`**로 나눴다.
- 실행 칸은 **전 행 예외 없이 `NOT TESTED`**임을 표 머리에 명시했다. 이번 단위에서 unit/E2E/
  typecheck/build/emulator 게이트를 **하나도 실행하지 않았고 실행했다고 기록하지 않는다.**

**보완 4 — 기록 기준 정정**

- `f1f5d20` = 조사 기록 commit, `534c26f` = 해시 고정 후속 commit, 이번 보완 = 별도 문서 commit.
- 보고서 머리에 초판 대비 변경 4가지를 요약하고 기준 HEAD=origin을 `534c26f`로 고쳤다.
- JJ-5 선택지를 과장 없이 고쳤다(B·C 모두 확정 orphan 미증명, 어느 선택도 삭제 승인 아님).
  §5의 다음 단위 권고도 §3.2 목표 후보 행은 fake로 검증할 수 없다는 점을 명시하도록 고쳤다.

**게이트:** `git diff --check` PASS, 허용 6개 문서 외 diff **0**(제품·Rules·config·lockfile·보호
대상 무변경 확인). 문서 전용 단위라 실행 게이트는 없다.

**진행도: 78~81% 완료 / 19~22% 잔여 — 변동 없음.** 이번 라운드는 초판의 과장 한 건을 폐기하고 근거
수준·판정 축을 분리한 문서 정정이며 제품·Rules·검증 어느 쪽도 전진시키지 않았다. §Q7.1이 매핑을
도입해도 확정 orphan은 여전히 증명되지 않음을 밝혔으므로 **작업축 6의 잔여 난이도는 줄지 않았다.**

