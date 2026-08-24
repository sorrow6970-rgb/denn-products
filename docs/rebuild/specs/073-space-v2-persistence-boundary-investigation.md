# 스펙 073 — space V2 persistence boundary 읽기 전용 조사

상태: **CORRECTION ROUND 2 APPLIED / READY_FOR_CODEX / DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI**

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
  해시 고정 → `534c26f`. 보완 라운드 1 → `63a1dec`. 전부 일반
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

- 보완 직전 기준 HEAD=origin `534c26f`, 반영 commit `63a1dec`, ahead/behind 0/0. 위 `CODEX REVIEW`
  세 묶음을 전부 문서에 반영했다.
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

- `f1f5d20` = 조사 기록 commit, `534c26f` = 해시 고정 후속 commit, `63a1dec` = 이번 보완 라운드 1.
- 보고서 머리에 초판 대비 변경 4가지를 요약하고 기준 HEAD=origin을 `534c26f`로 고쳤다.
- JJ-5 선택지를 과장 없이 고쳤다(B·C 모두 확정 orphan 미증명, 어느 선택도 삭제 승인 아님).
  §5의 다음 단위 권고도 §3.2 목표 후보 행은 fake로 검증할 수 없다는 점을 명시하도록 고쳤다.

**게이트:** `git diff --check` PASS, 허용 6개 문서 외 diff **0**(제품·Rules·config·lockfile·보호
대상 무변경 확인). 문서 전용 단위라 실행 게이트는 없다.

**진행도: 78~81% 완료 / 19~22% 잔여 — 변동 없음.** 이번 라운드는 초판의 과장 한 건을 폐기하고 근거
수준·판정 축을 분리한 문서 정정이며 제품·Rules·검증 어느 쪽도 전진시키지 않았다. §Q7.1이 매핑을
도입해도 확정 orphan은 여전히 증명되지 않음을 밝혔으므로 **작업축 6의 잔여 난이도는 줄지 않았다.**

### CODEX RE-REVIEW — CORRECTION_REQUIRED 라운드 2 (2026-08-24)

현재 관측 HEAD=origin `2dd97c4`, ahead/behind 0/0에서 문서 재검수를 수행했다. 라운드 1의 private
mapping 재분석, Firestore timeout 용어, 현재/목표·정적/실행 축 분리는 수용한다. 다음 세 묶음은
추가 정정이 필요하다.

1. **cross-service primitive 증거 분류:** `storage.emulator.rules:40-45`의 `firestore.exists(REC)`,
   `firestore.emulator.rules:71-86`의 client read=false, `cutover-rules.emulator.test.ts:83-96`의 REC 후
   upload 성공과 G-4 정본의 13/13 PASS는 이미 local 실행 증거다. 공식 get/exists 지원, admin-state
   primitive local emulator VERIFIED, V2 mapping 미작성/NOT TESTED, 실제 IAM/live NOT TESTED를
   구분한다. primitive 자체를 `UNCONFIRMED`로 남기지 않는다.
2. **privileged plaintext 표면:** private mapping은 일반 클라이언트에게 token을 공개하지 않을 수
   있지만 Firestore에 평문 관계를 추가 저장한다. Firebase console/Admin SDK/service account/IAM이라는
   별도 접근 표면이며 bucket과 정확히 같은 접근 주체라는 근거는 없다. "새 노출 경로가 아니다"를
   폐기하고 principal/role overlap을 `UNCONFIRMED`로 둔다.
3. **REC ID 후보 완결성:** 추가 metadata가 없으면 object segment `<uuid>.png` 자체를 transform 없이
   REC ID로 쓰는 후보를 분석한다. 별도 opaque recId는 upload에 함께 포함하는 Storage
   `customMetadata` pointer 후보가 있으므로 path만 보고 불가능이라 단정하지 않는다. 설치 SDK 공개 타입,
   request/resource metadata Rules 표면, public-read에서 metadata 관측 가능성, exact 형식·assetId
   일치, update/delete 금지와 access-call 예산을 분석한다. 이 후보는 미승인 schema/Rules 확장이며
   미작성/NOT TESTED다.

보완 허용 범위는 보고서·이 spec·STATE/NEXT/CURRENT/live log 6개 문서뿐이다. 제품 코드/test/Rules/
config/package/lockfile, emulator/live, Founder JJ-1~JJ-7과 다음 스펙은 재검수 통과 전까지 금지다.

### DONE (Claude) — 보완 라운드 2

상태: **CORRECTION ROUND 2 APPLIED / READY_FOR_CODEX** (2026-08-24)

- 보완 직전 관측 기준 HEAD=origin `2dd97c4`, ahead/behind 0/0. 위 `CODEX RE-REVIEW` 세 묶음을 전부
  문서에 반영했다.
- 수정 파일은 허용 6개뿐이다: 조사 보고서, 이 spec, `Automation/DENN_AUTOMATION_STATE.md`,
  `Automation/NEXT_CLAUDE_PROMPT.md`, `docs/codex-claude-handoff/CURRENT.md`,
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`. 제품 코드/test/`storage.rules`/`firestore.rules`/Firebase
  config/package/lockfile, `apps/**`, `packages/**`, 보호 대상 변경 **0**.
- 실제 Firebase/project/bucket/Firestore/network/live 접근 0, **emulator 실행 0**,
  upload/write/read-back/delete/deploy 0, UID 추측 0, URL 발급 0, UI 연결 0, 자동화·반복 작업 0,
  Founder JJ-1~JJ-7 선택 0, 다음 구현 스펙 0. 이번 라운드도 **저장소 파일과 설치 SDK 타입/소스
  읽기만** 했다.

**보완 1 — cross-service read primitive 근거 등급 (보고서 §Q7.1.0 신설)**

라운드 1은 이 primitive를 `UNCONFIRMED`로 남겼다. **그 분류가 틀렸다.** 네 층위로 분리했다.

| 층위 | 상태 | 근거 |
|---|---|---|
| ① Storage Rules의 `firestore.get()/exists()` 지원 | **공식 지원** | G-4 결정 정본 §4의 공식 문서 직접 인용(제약 4개 포함: default DB · **문서 2개** · quota/과금 · IAM) |
| ② client `read:false` 문서를 Storage Rules가 조회해 create 게이팅 | **local emulator VERIFIED** | `storage.emulator.rules:40-45` · `firestore.emulator.rules:71-86` · `cutover-rules.emulator.test.ts:83-96` · G-4 §12 **13/13 PASS**(2026-08-14) |
| ③ V2 전용 mapping Rules | **미작성 · NOT TESTED** | 해당 컬렉션도 `rebuild-space-assets` match도 없다 |
| ④ 실제 Firebase / IAM / live | **NOT TESTED** | G-4 §12 기록 + 이번 단위 live 금지 |

②의 의미를 정확히 적었다 — 그 시나리오에서 create 규칙이 REC 존재를 요구했고 **upload가 성공**했으며
REC의 Firestore client `read`는 `false`다. 따라서 **Storage Rules의 service-side cross-product 평가는
대상 문서의 Firestore *클라이언트* read 권한에 좌우되지 않는다.**
★ **"우회(bypass)" 표현은 폐기했다** — Firestore client read 권한과 Storage Rules의 규칙 평가 조회는
**주체도 평가 경로도 다른 별개 축**이다. ②는 `.json` admin-state 경로 검증이고 **이번 세션에서
재실행하지 않았다**(emulator 금지).

**보완 2 — privileged plaintext surface (보고서 §Q7.1 보안 항목 재정정)**

라운드 1의 *"버킷 객체 자체와 같은 신뢰 수준이므로 새로운 노출 경로는 아니다"* 단정을 **폐기**했다.

- private mapping은 **token 또는 asset↔document 관계의 평문 사본**을 새로 만든다. 현재 V2 설계에서
  그 관계는 **어디에도 평문으로 존재하지 않는다**(암호문 안에만 있다).
- 그 사본에는 **Firebase console · Admin SDK · service account · IAM**이라는 별도 접근 표면이 붙고,
  **bucket 접근 주체와 정확히 같은 principal/role 집합인지 확인하지 않았다**(IAM 구성 미열람).
- ⇒ 정확한 진술: **새로운 privileged plaintext surface이며 overlap은 `UNCONFIRMED`.**
- 이것만으로 후보를 금지하지도 승인하지도 않았고 **Founder 보안 tradeoff로 남겼다**(JJ-5 반영).
- 유지: 일반 클라이언트에게 token/관계를 노출하지 않는다는 점, 초판의 "보안 모델 충돌" 단정이
  과장이었다는 점.

**보완 3 — REC ID 후보 완결성 (보고서 §Q7.1.1 신설)**

라운드 1의 *"opaque recId는 성립하지 않는다"* 확정을 **폐기**했다. 두 가지가 부정확했다 —
wildcard가 잡는 값은 bare UUID가 아니라 **세그먼트 전체 `"<uuid>.png"`**(admin-state `"<uuid>.json"`과
동일 구조, G-4 §8.1이 이미 한 번 바로잡은 지점)이고, "추가 metadata가 없다면"이라는 전제를 빠뜨렸다.

- **(c1) transform-0** — REC doc id = Storage segment 그대로 `"<uuid>.png"`, `$(assetId)`를 변환 없이
  보간. **admin-state G-4 §8.2가 확정한 바로 그 패턴**이며 문자열 파싱·연결 **0**. 조회 패턴 자체는
  §Q7.1.0 ②로 **local emulator VERIFIED**(`.json`에서). 형식은 `[.]png$` 정규식으로 강제 가능
  (`firestore.rules:76-79`가 `.json` 버전 선례). 한계: **opaque하지 않다**(다만 assetId는 public path에
  이미 있어 비밀이 아니므로 식별 목적에는 무해). ⇒ **성립한다.**
- **(c2) 독립 opaque recId + Storage `customMetadata` pointer** — 근거는 설치 SDK 공개 타입
  `@firebase/storage/dist/storage-public.d.ts` `:500`(`uploadBytes(…, metadata?: UploadMetadata)`),
  `:515`(`UploadMetadata extends SettableMetadata`), `:277`·`:301-303`
  (`customMetadata?: { [key: string]: string }`), `:56`(`FullMetadata extends UploadMetadata`).
  create와 metadata를 **같은 `uploadBytes` 호출**에 넣을 수 있다는 점은 확인했다.
  그러나 — Rules의 `request.resource.metadata`/`resource.metadata` 지원은 **저장소 선례 0건 ·
  `UNCONFIRMED`**, 값이 문자열뿐이라 exact key/format 설계가 필요, assetId 일치 교차 확인까지 넣으면
  **문서 접근 한도 2를 넘는다**, ★ **public-read라 `getMetadata()`로 누구나 관측 가능**해
  **recId를 비밀로 둘 수 없고 token 삽입은 금지**, `updateMetadata` 차단이 목표 문구에 **누락**,
  그리고 **GG-4=A가 승인한 적 없는 schema/Rules 확장**이다. ⇒ **논리상 가능하나 (c1)보다 명백히
  비싸고 위험하며 미작성 · `NOT TESTED`.**
- 두 후보 모두 **확정 orphan을 증명하지 못한다** — 단조값 부재 문제는 REC ID 형태와 무관하다.

**보완 4 — commit 자기참조 추적 중단**

- 라운드 1까지는 내용 commit 뒤 "해시를 적어 넣는" bookkeeping commit(`534c26f`, `2dd97c4`)을 추가로
  만들었다. **라운드 2부터 그 추가 commit을 만들지 않는다.**
- 이유를 숨기지 않고 적었다 — **commit은 자기 자신의 해시를 내용에 담을 수 없다.** 그 한계를 메우려
  commit을 두 배로 늘리는 것보다, 상태 문서에 **① push 후 `HEAD=origin` / `ahead-behind 0/0` 검증
  사실**과 **② 라운드 2 내용 commit이 무엇인지**를 나눠 적고 해시 정본은 **git 이력과 세션 보고**에
  두는 편이 정확하다.
- 이력: `f1f5d20`(초판 내용) → `534c26f`(bookkeeping) → `63a1dec`(라운드 1 내용) →
  `2dd97c4`(bookkeeping) → **라운드 2 내용 commit**(이 문서를 담은 commit).

**게이트:** `git diff --check` PASS, 허용 6개 문서 외 diff **0**. 문서 전용 단위라 실행 게이트는 없고
unit/E2E/typecheck/build/emulator를 **하나도 돌리지 않았으며 돌렸다고 기록하지 않는다.**

**진행도: 78~81% 완료 / 19~22% 잔여 — 변동 없음.** 라운드 2에서 primitive 하나가 `UNCONFIRMED` →
**local emulator VERIFIED**로 올라갔지만, 이는 **admin-state에서 이미 검증돼 있던 사실을 이 문서가
잘못 낮춰 적었던 것을 바로잡은 것**이지 새로 검증한 것이 아니다. 진행도를 올릴 근거가 되지 못한다.
오히려 §Q7.1·§Q7.1.1이 선택지마다 붙는 조건을 더 분명히 했으므로 **작업축 6의 잔여 난이도는 줄지
않았다.**

