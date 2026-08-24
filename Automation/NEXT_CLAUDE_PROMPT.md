# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-073-space-v2-persistence-boundary-investigation` — **CORRECTION ROUND 2 APPLIED / AWAITING CODEX RE-REVIEW / DOCUMENT ONLY / READ ONLY**
completed_unit: `spec-072-space-v2-local-issue-bundle-orchestrator` — **DONE / CODEX_PASSED / LOCAL_ONLY / NO NETWORK / NO UI**
기준: 보완 직전 관측 HEAD=origin **`2dd97c4`**, ahead/behind **0/0**. 라운드 2는 **내용 commit 1개만** 추가하고 자기 해시 bookkeeping commit을 만들지 않았다 — push 후 `HEAD=origin`·ahead/behind 0/0을 검증했고 해시 정본은 git 이력·세션 보고다(**commit은 자기 해시를 내용에 담을 수 없다**).
이력: `f1f5d20`(초판 내용) → `534c26f`(bookkeeping) → `63a1dec`(라운드 1 내용) → `2dd97c4`(bookkeeping) → 라운드 2 내용 commit.
working tree에는 기존 Founder/user 보호 변경만 남고 staged 0이다. 제품 commit은 없다(문서 전용 단위).
fix_round: **2 / 3**
next_transition: **`CODEX_RE_REVIEW`**

## Claude Code 전달용 다음 지시문

스펙 073 문서 보완 라운드 2를 수행해 상태는 `READY_FOR_CODEX`다. 다음 실행 지시문은 **Codex 재검수
종료 시점에** 이 자리에 다시 작성된다. Claude Code는 그때까지 Founder JJ-1~JJ-7 선택, 제품 구현,
Rules 변경, emulator 실행, 새 스펙과 자동화·반복 작업을 시작하지 않는다.

> 직전 지시문(스펙 073 보완 라운드 2, 수행 완료 — 기록):
>
> ```text
> C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md와 docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md의 CODEX REVIEW 라운드 2를 전부 읽고 스펙 073 문서 보완 라운드 2만 수행해. 기준은 rebuild/modern-studio HEAD=origin 2dd97c4, ahead/behind 0/0이다. 제품 구현과 Founder JJ-1~JJ-7 선택은 시작하지 마.
>
> 첫째, private mapping의 cross-service read 근거 분류를 고쳐. 보고서는 "client read=false인 Firestore 문서를 Storage Rules firestore.get()/exists()가 읽을 수 있는지 공식 인용 미취득"을 이유로 primitive 자체를 UNCONFIRMED로 남겼지만, 저장소에는 더 강한 local 실행 증거가 있다. storage.emulator.rules:40-45는 rebuildAdminStateObjects REC에 firestore.exists()를 사용하고, firestore.emulator.rules:71-86은 그 REC의 client read/update/delete를 false로 둔다. packages/firebase/src/admin-write/cutover-rules.emulator.test.ts:83-96은 REC 생성 후 Storage upload가 성공하고 overwrite/delete/비승인 UID가 거부됨을 local demo emulator에서 검증했으며 G-4 결정 정본 §12도 구조 A+REC cross-service 규칙 13/13 PASS를 기록한다. 따라서 ① Firebase 공식 문서상 get/exists 지원, ② 이 저장소의 admin-state primitive local emulator VERIFIED, ③ V2 전용 mapping Rules는 미작성/NOT TESTED, ④ 실제 Firebase IAM/live는 NOT TESTED로 정확히 분리해. "bypass"처럼 권한 우회로 오해될 표현은 피하고, Storage Rules service-side cross-product 평가와 Firestore client read 권한을 구분해.
>
> 둘째, 보안 서술의 "버킷 객체 자체와 같은 신뢰 수준이므로 새로운 노출 경로는 아니다" 단정을 폐기해. private mapping은 일반 클라이언트 read/list를 막을 수 있지만 token 또는 관계를 평문으로 저장하는 별도 Firestore persistence다. Firebase console, Admin SDK, 서비스 계정/IAM 접근 표면이 추가되며 Storage bucket 접근자와 Firestore 접근자가 정확히 같은지는 확인되지 않았다. 따라서 새로운 privileged plaintext surface이고 정확한 principal/role overlap은 UNCONFIRMED라고 기록해. 이것만으로 후보를 금지하거나 승인하지 말고 Founder 보안 tradeoff로 남겨.
>
> 셋째, opaque recId 후보를 "path가 assetId이므로 성립하지 않는다"고 확정한 분석을 정밀화해. 추가 metadata가 없으면 Storage segment 자체인 `<uuid>.png`를 REC document ID로 그대로 사용하는 transform-0 후보가 있다(admin-state G-4 §8.2와 같은 패턴). assetId와 독립인 opaque recId를 쓰려면 uploadBytes의 metadata 인자에 customMetadata pointer를 포함하고 Storage Rules가 request.resource/resource metadata를 검증·조회하는 후보도 논리상 가능하다. 설치 @firebase/storage 0.14.4 공개 타입의 UploadMetadata.customMetadata 근거를 정확한 경로·행으로 기록하고, public-read object에서 metadata/recId가 클라이언트에 관측될 가능성, exact key/format, mapping assetId 일치, create와 metadata의 동일 upload 포함, update/delete 금지, Rules access-call 예산을 분석해. 이 후보는 현재 GG-4 계약에 승인되지 않은 metadata schema/Rules 확장이며 미작성/NOT TESTED다. 지원 근거가 부족한 부분은 UNCONFIRMED로 남겨. 어느 후보도 확정 orphan을 증명한다거나 삭제를 승인한다고 쓰지 마.
>
> 넷째, 기록 해시를 자기참조식으로 계속 추적하지 마. 현재 관측 HEAD=origin은 2dd97c4이고 63a1dec은 라운드 1 내용 commit, 2dd97c4는 bookkeeping commit이다. 라운드 2 내용 commit 후 별도의 "자기 해시 pin" commit을 반복하지 말고, 상태 문서에는 최종적으로 HEAD=origin/ahead-behind 검증 사실과 라운드 2 내용 commit을 구분해 기록해. commit 자체가 자기 해시를 포함할 수 없다는 한계를 숨기지 마.
>
> 허용 파일은 조사 보고서, docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md, Automation/DENN_AUTOMATION_STATE.md, Automation/NEXT_CLAUDE_PROMPT.md, docs/codex-claude-handoff/CURRENT.md, docs/live/CLAUDE_LIVE_PATCH_LOG.md의 문서 6개뿐이다. 제품 코드/test/storage.rules/firestore.rules/Firebase config/package/lockfile, apps/**, packages/**와 보호 대상은 수정·restore·checkout·stage·commit하지 마. 실제 Firebase/project/bucket/Firestore/network/live 접근, emulator 실행, upload/write/read-back/delete/deploy, UID 추측, URL 발급, UI 연결, 자동화·반복 작업은 금지다.
>
> 문서 diff만 git diff --check와 forbidden diff로 확인하고 허용 문서만 별도 일반 fast-forward commit/push해. 완료 후 HEAD=origin, ahead/behind 0/0, 정확한 변경 파일, primitive evidence 분류, private plaintext surface, recId 후보별 한계, UNCONFIRMED/NOT TESTED와 전체 리빌드 78~81% 완료·19~22% 잔여 변동 없음을 보고하고 READY_FOR_CODEX에서 멈춰. 다음 구현 스펙과 Founder 질문은 시작하지 마.
> ```

> 직전 지시문(스펙 073 보완 라운드 1, 수행 완료 — 기록):
>
> ```text
> C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md와 docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md의 CODEX REVIEW를 전부 읽고 스펙 073 문서 보완 라운드 1만 수행해. 기준은 rebuild/modern-studio HEAD=origin 534c26f, ahead/behind 0/0이다. 제품 구현과 Founder JJ-1~JJ-7 선택은 시작하지 마.
>
> 첫째, docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md에서 V2-2 REC을 "평문이라 토큰 비밀성과 반드시 충돌"한다고 단정한 문구를 폐기해. 현재 outer의 암호문만으로 Rules가 asset↔document 관계를 볼 수 없다는 결론과 O-3 삭제 보류는 유지하되, 클라이언트 read/list를 모두 거부한 private write-once Firestore mapping/REC을 Storage Rules가 firestore.get()/exists()로 서버 측 조회하는 후보를 별도로 분석해. 이 문서가 token/assetId 또는 opaque recId 중 무엇을 키·필드로 갖는지, 승인 UID create-only, 클라이언트 get/list 거부, mapping과 spaces create의 같은 transaction/getAfter 가능성 또는 순차 commit, crash·결과 미확정·늦은 성공, Storage Rules document-access 비용/한도, 이 정보만으로 확정 orphan을 증명할 수 있는지까지 구분해. 가능한 후보라는 사실은 삭제·Rules·schema/backend 구현 승인이나 안전성 PASS가 아니다. 근거가 부족하면 UNCONFIRMED/NOT TESTED로 남기고 JJ-5 선택지를 과장 없이 고쳐.
>
> 둘째, getDoc 관련 결론의 근거 수준과 용어를 정정해. 설치 @firebase/firestore 4.17.0 공개 타입 dist/index.d.ts:2582-2595는 setDoc 데이터가 즉시 local cache에 반영돼 future get에 들어갈 수 있다고 하고, :1386-1413은 getDoc이 cache를 반환할 수 있으며 getDocFromServer가 server read라고 명시한다. 따라서 server-only write outcome reconciliation에는 getDocFromServer가 필요하다는 결론은 유지한다. 다만 "setDoc SDK가 로컬 timeout으로 실패 처리"라고 쓰지 말고, 앱의 bounded timeout/호출 포기 뒤에도 원 Promise·pending write가 남을 수 있는 경우로 표현해. API 동작 근거와 실제 emulator/runtime timeout 시나리오 NOT TESTED를 분리하고 정확한 설치 소스 경로·행을 근거 목록에 남겨.
>
> 셋째, 실패표와 상태 분류를 현재 Rules와 목표 후보 Rules로 분리해. 현재 rebuild-space-assets 경로는 match 부재로 create 포함 전부 default deny다. 같은 assetId 거부를 목표 create-only rule의 PASS로 혼합하지 말고 "현재 default deny"와 "목표 rule 후보에서 create-only, NOT TESTED"를 나눠. Firestore allow read가 get/list를 포함한다는 Rules 정적 결론과 실제 emulator/live 실행 NOT TESTED도 UNCONFIRMED 한 단어로 섞지 마. getDocFromServer exact match의 API/논리 근거와 실행 NOT TESTED도 같은 방식으로 분리해.
>
> 넷째, 실제 기록 기준을 맞춰. f1f5d20은 조사 기록 commit이고 현재 HEAD=origin은 후속 문서 commit 534c26f다. 보고서·spec073·STATE/NEXT/CURRENT/live log를 CORRECTION_REQUIRED 보완 라운드 1 결과와 실제 최종 commit에 맞춰라.
>
> 허용 파일은 조사 보고서, docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md, Automation/DENN_AUTOMATION_STATE.md, Automation/NEXT_CLAUDE_PROMPT.md, docs/codex-claude-handoff/CURRENT.md, docs/live/CLAUDE_LIVE_PATCH_LOG.md의 문서 6개뿐이다. 제품 코드/test/storage.rules/firestore.rules/Firebase config/package/lockfile, apps/**, packages/**와 보호 대상은 수정·restore·checkout·stage·commit하지 마. 실제 Firebase/project/bucket/Firestore/network/live 접근, emulator 실행, upload/write/read-back/delete/deploy, UID 추측, URL 발급, UI 연결, 자동화·반복 작업은 금지다.
>
> 문서 diff만 git diff --check와 forbidden diff로 확인하고 허용 문서만 별도 일반 fast-forward commit/push해. 완료 후 HEAD=origin, ahead/behind 0/0, 정확한 변경 파일과 수정 결론, UNCONFIRMED/NOT TESTED, 전체 리빌드 78~81% 완료·19~22% 잔여 변동 없음을 보고하고 READY_FOR_CODEX에서 멈춰. 다음 구현 스펙과 Founder 질문은 시작하지 마.
> ```

## ★ 스펙 073 — 보완 라운드 2 수행 기록

보완 직전 관측 기준 HEAD=origin `2dd97c4`, ahead/behind 0/0. Codex 재검수 세 묶음을 문서에 반영했다.
수정 파일은 허용 6개뿐 — 조사 보고서 · spec073 · STATE · NEXT · CURRENT · live log.
제품 코드·test·`storage.rules`·`firestore.rules`·Firebase config·package/lockfile, `apps/**`,
`packages/**`, 보호 대상 변경 **0**. 실제 Firebase/project/bucket/Firestore/network/live 접근 **0**,
**emulator 실행 0**, upload/write/read-back/delete/deploy **0**, UID 추측 **0**, URL 발급 **0**,
UI 연결 **0**, 자동화·반복 작업 **0**, Founder JJ-1~JJ-7 선택 **0**, 다음 구현 스펙 **0**.

- **보완 1 — cross-service read primitive 근거 등급(보고서 §Q7.1.0 신설).** 라운드 1이 이를
  `UNCONFIRMED`로 남긴 분류가 **틀렸다.** 네 층위로 분리했다 —
  **① 공식 지원**(G-4 정본 §4의 공식 문서 직접 인용; 제약 4개 — default DB · **문서 2개** ·
  quota/과금 · IAM) · **② local emulator VERIFIED**(`storage.emulator.rules:40-45`가
  `firestore.exists(REC)`로 create 게이팅, `firestore.emulator.rules:71-86`이 같은 REC에
  `read, update, delete: if false`, `cutover-rules.emulator.test.ts:83-96`이 REC `setDoc` 뒤
  **upload 성공**·재업로드/삭제/비승인 UID 거부를 검증, G-4 §12 **13/13 PASS**) ·
  **③ V2 mapping Rules 미작성·`NOT TESTED`** · **④ 실제 Firebase/IAM/live `NOT TESTED`**.
  ⇒ **Storage Rules의 service-side cross-product 평가는 대상 문서의 Firestore *클라이언트* read
  권한에 좌우되지 않는다**는 것이 실행으로 확인된 사실이다.
  ★ **"우회(bypass)" 표현은 폐기**했다 — 두 축은 주체도 평가 경로도 다르다. ②는 `.json` 경로
  검증이고 이번 세션에서 재실행하지 않았다.
- **보완 2 — privileged plaintext surface.** *"버킷 객체 자체와 같은 신뢰 수준이므로 새로운 노출
  경로는 아니다"* 단정을 **폐기**했다. private mapping은 **현재 어디에도 평문으로 없는 관계의 사본**을
  만들고 **console · Admin SDK · service account · IAM**이라는 별도 접근 표면을 추가한다. bucket
  접근 주체와의 principal/role overlap은 **`UNCONFIRMED`**(IAM 미열람·live 금지). 금지도 승인도 하지
  않고 **Founder 보안 tradeoff**로 남겼다.
- **보완 3 — REC ID 후보 완결성(보고서 §Q7.1.1 신설).** *"opaque recId는 성립하지 않는다"* 확정을
  **폐기**했다. wildcard가 잡는 값은 bare UUID가 아니라 **세그먼트 전체 `"<uuid>.png"`**다.
  **(c1) transform-0** = REC doc id를 세그먼트 그대로 사용 — admin-state G-4 §8.2와 같은 패턴,
  문자열 변환 0, 조회 패턴 자체는 VERIFIED ⇒ **성립한다**(다만 opaque하지 않음; assetId는 public path에
  이미 있어 식별 목적엔 무해).
  **(c2) 독립 recId + `customMetadata` pointer** = 설치 SDK `storage-public.d.ts:500`·`:515`·`:277`·
  `:301-303`·`:56` 근거로 **같은 `uploadBytes` 호출에 포함 가능**하나, Rules metadata 표면
  `UNCONFIRMED`(저장소 선례 0건), 일치 교차 확인 시 **문서 접근 한도 2 초과**, ★ **public-read라
  `getMetadata()`로 공개 관측** ⇒ recId를 비밀로 둘 수 없고 **token 삽입 금지**,
  `updateMetadata` 차단 **계약 공백**, **GG-4 미승인 schema 확장** ⇒ 논리상 가능하나 (c1)보다 비싸고
  위험하며 미작성·`NOT TESTED`.
  **두 후보 모두 확정 orphan을 증명하지 못한다.** 연쇄 경로 보간은 여전히 `UNCONFIRMED`이며
  **§Q7.1.0 ②의 VERIFIED 증거가 그 부분은 덮지 않는다**(admin-state는 고정 경로·path 변수만 사용).
- **보완 4 — commit 자기참조 추적 중단.** 라운드 1까지 만들던 "자기 해시 pin" bookkeeping
  commit(`534c26f`, `2dd97c4`)을 **더 만들지 않는다.** **commit은 자기 해시를 내용에 담을 수 없다** —
  그 한계를 숨기지 않고, 상태 문서에는 **push 후 HEAD=origin·ahead/behind 0/0 검증 사실**과
  **라운드 2 내용 commit**을 구분해 적으며 해시 정본은 git 이력·세션 보고에 둔다.
- JJ-5도 다시 고쳤다 — A(삭제 보류) · B((c1) mapping) · B′((c2) customMetadata) · C(backend)
  **어느 선택도 확정 orphan을 증명하지 못하며 어느 것도 삭제 승인이 아니다.**

게이트: `git diff --check` PASS, 허용 6개 문서 외 diff **0**. 문서 전용 단위라 실행 게이트는 없으며
unit/E2E/typecheck/build/emulator를 하나도 돌리지 않았고 돌렸다고 기록하지 않는다.

진행도 보고: **78~81% 진행 / 19~22% 잔여 — 변동 없음.** primitive 하나가 `UNCONFIRMED` →
**VERIFIED**로 올라갔지만 이는 **admin-state에서 이미 검증돼 있던 사실의 오분류를 바로잡은 것**이지
새 검증이 아니므로 진행도 근거가 되지 않는다. 오히려 §Q7.1·§Q7.1.1이 선택지마다 붙는 조건을 더
분명히 했으므로 **작업축 6의 잔여 난이도는 줄지 않았다.**

다음은 Codex 재검수다. 보호 대상과 기존 Founder/user working-tree 변경은 restore/checkout/stage/
commit하지 않았다.

## ★ 스펙 073 — 보완 라운드 1 수행 기록

보완 직전 기준 HEAD=origin `534c26f`, 반영 commit `63a1dec`, ahead/behind 0/0. Codex
`CORRECTION_REQUIRED` 세 묶음을 문서에 반영했다.
수정 파일은 허용 6개뿐 — 조사 보고서 · spec073 · STATE · NEXT · CURRENT · live log.
제품 코드·test·`storage.rules`·`firestore.rules`·Firebase config·package/lockfile, `apps/**`,
`packages/**`, 보호 대상 변경 **0**. 실제 Firebase/project/bucket/Firestore/network/live 접근 **0**,
emulator 실행 **0**, upload/write/read-back/delete/deploy **0**, UID 추측 **0**, URL 발급 **0**,
UI 연결 **0**, 자동화·반복 작업 **0**, Founder JJ-1~JJ-7 선택 **0**, 다음 구현 스펙 **0**.

- **보완 1 — private mapping 후보(보고서 §Q7.1 신설).** 초판의 *"asset↔token 매핑을 평문으로 두면
  토큰 비밀성 모델이 반드시 깨진다"* 단정을 **폐기**했다. 그 문장은 매핑이 **클라이언트에게 읽히는
  경우**에만 참이다. 유지되는 결론은 좁힌 형태 — *승인된 outer(`schema`/`enc` 2키)의 암호문만으로는
  Rules가 asset↔document 관계를 볼 수 없다*, O-3 삭제 보류도 기본값 그대로다.
  후보 **V2-2′**를 키·필드 3종(assetId→token / assetId→opaque linkId / opaque recId), 승인 UID
  create-only, 클라이언트 get/list 거부, 순차 commit vs 같은 transaction+`getAfter()`,
  crash·미확정·늦은 성공, Storage Rules 문서 접근 한도(**2, 여유 0**)·quota/과금·default DB·IAM으로
  나눠 분석했다. 키 후보 **(c) opaque recId는 성립하지 않는다**(GG-4=A가 path를 `{assetId}.png`로 고정).
  ★ **결정적 한계 — 이 후보만으로 확정 orphan을 증명하지 못한다.** admin-state SDC′는 `head.revision`
  단조 증가가 늦은 commit의 CAS 승리를 불가능하게 만들어 성립했는데 **V2에는 대응 값이 없어
  `spaces/{token}` create는 언제 도착해도 성공한다.** 신규 `UNCONFIRMED` 2건: Rules `get()/exists()`의
  read 거부 우회 공식 인용 미취득, 연쇄 경로 보간 지원 미확인.
  보안 진술도 정확히 고쳤다 — client-denied 매핑은 다른 클라이언트에게 token을 노출하지 않지만
  *"token이 어디에도 평문으로 저장되지 않는다"* 성질은 잃는다. Q2 위험 2와는 **독립 사안**이고,
  둘을 결합해 "보안 모델 충돌"이라 단정한 초판은 **과장이었다**.
- **보완 2 — `getDoc` 근거·용어.** 설치 `@firebase/firestore` 4.17.0 `dist/index.d.ts:2582-2595`와
  `:1386-1413` **원문 인용**으로 근거를 고정했다. 유지: server-only reconciliation에는
  **`getDocFromServer`가 필요하다**(`getDoc`은 캐시 반환 가능 `:1389`, server read `:1413`).
  ★ 폐기: *"`setDoc`이 로컬 timeout으로 실패 처리돼도"* — 원문상 **`setDoc`의 Promise에는 SDK 자체
  timeout이 없다.** 정확한 경계는 **앱이 bounded timeout으로 포기해도 원 Promise·pending write가 남아
  연결 회복 시 기록된다**이며, 이것이 스펙 037 §6.6의 *"timeout은 취소가 아니다"* 가 V2에도 적용되는
  이유다. **API 근거와 실제 emulator/runtime `NOT TESTED`를 분리**하고 정확한 설치 소스 경로 3개를
  근거 목록(§1.2)에 명시했다.
- **보완 3 — 판정 축 분리(보고서 §3 재구성).** 축 A **[현재 Rules]/[목표 후보 Rules]**, 축 B
  **정적/설계/실행**으로 나눠 §3.1·§3.2·§3.3으로 재구성했다. **같은 assetId 재업로드**를 아직 없는
  목표 create-only rule의 PASS로 적던 것을 고쳤다(현재는 규칙 부재 default deny, 목표는 미작성·
  `NOT TESTED`). 반면 같은 token 재create는 `update: if false`가 **이미 존재하는 규칙**이라 [현재]
  정적 PASS다. `spaces`의 `allow read`가 get/list를 포함한다는 것은 **정적 사실**이지 `UNCONFIRMED`가
  아니며 실제 열거 동작만 `NOT TESTED`다 — §4에 "정적 결론이지만 실행 검증이 없는 것" 항목을 신설했다.
  실행 칸은 **전 행 예외 없이 `NOT TESTED`**임을 표 머리에 명시했다.
- **보완 4 — 기록 기준.** `f1f5d20` = 조사 기록, `534c26f` = hash-pin, 이번 보완 = 별도 문서 commit.
  보고서 머리에 초판 대비 변경 4가지를 요약했다. JJ-5 선택지도 과장 없이 고쳤다 — **B(V2-2′)와
  C(backend) 어느 쪽도 지금은 확정 orphan을 증명하지 못하며 어떤 선택도 삭제 승인이 아니다.**
  §5의 다음 단위 권고도 §3.2 목표 후보 행은 fake로 검증할 수 없다는 점(흉내 내면 "검증했다"는 착시)을
  명시하도록 고쳤다.

게이트: `git diff --check` PASS, 허용 6개 문서 외 diff **0**. 문서 전용 단위라 실행 게이트는 없으며,
unit/E2E/typecheck/build/emulator를 하나도 돌리지 않았고 돌렸다고 기록하지 않는다.

진행도 보고: **78~81% 진행 / 19~22% 잔여 — 변동 없음.** 이번 라운드는 초판의 과장 한 건을 폐기하고
근거 수준·판정 축을 분리한 **문서 정정**이며 제품·Rules·검증 어느 쪽도 전진시키지 않았다. 오히려
§Q7.1이 *"매핑을 도입해도 확정 orphan은 여전히 증명되지 않는다"* 를 밝혔으므로 **작업축 6의 잔여
난이도는 줄지 않았다.**

다음은 Codex 재검수다. 보호 대상과 기존 Founder/user working-tree 변경은 restore/checkout/stage/
commit하지 않았다.

## ★ 스펙 073 — 조사 완료 기록 (보완 전 기록)

Codex 문서 8개는 문서 commit `c5f8384`, 조사 보고서와 상태 문서는 문서 commit `f1f5d20`이다. 제품
코드·test·`storage.rules`·`firestore.rules`·Firebase config·package/lockfile 변경 **0**, 실제
Firebase/project/bucket/Firestore/network/live 접근 **0**, emulator 실행 **0**,
upload/write/read-back/delete/deploy **0**, URL 발급 **0**, UI 연결 **0**이다.

산출물: `docs/codex-claude-handoff/reviews/2026-08-24-space-v2-persistence-boundary-investigation.md`.

- **Q1** `rebuild-space-assets/objects/**`는 `storage.rules`에 **match 자체가 없다** → CRUD 전부 기본
  거부. GG-4 목표 중 update/delete만 우연히 일치하고 create(승인 UID·create-only·`image/png`·<20 MiB)와
  read(public)는 신설이 필요하다. `rebuild-admin-state`의 create 조건은 REC `firestore.exists()`를
  요구하므로 복사하면 항상 거부된다.
- **Q2** `spaces/{token}`은 `create: if true`로 조건·payload 검증 0 → GG-5의 approved operator UID와
  exact outer keys **둘 다 FAIL**, 불변성만 PASS. 레거시가 항상 `schema:'space-v1'`을 쓰므로
  (`denn-mockup-tool.html:15573`) V1을 깨지 않고 V2만 분기하는 것은 근거상 가능하다. 다만 현행
  `read: if true`는 `get`뿐 아니라 **`list`도 연다**(문언상, 실행 검증 0).
- **Q3** 필요한 공개 API는 설치본에 전부 있다(`uploadBytes`/`getMetadata`/`setDoc`/`getDocFromServer`).
  ★ **`getDoc`은 latency compensation 때문에 로컬 pending write를 `exists()`로 돌려줄 수 있어 write
  outcome 판정에 쓰면 거짓 성공이 난다** — `getDocFromServer`가 필요하고, 기존 `space-read` facade를
  그대로 재사용하면 안 된다. `storage/unauthorized`는 "권한 없음"과 "이미 존재"를 구분하지 못한다.
- **Q4/Q6** upload-first 순서의 5개 종착 상태를 정리했다. 미확정에서 자동 retry·같은 경로 재업로드·
  같은 token 재create·새 token 발급은 **모두 안전하지 않거나 판정을 모호하게 만든다**. 안전한 것은
  읽기 전용 판정 1회와, 미판정이면 사람에게 넘기는 것뿐이다.
- **Q5** 고유 create-only 경로 + size/`md5Hash` 대조로 upload outcome을, exact outer 대조로 create
  outcome을 판정할 수 있다는 논거는 강하지만 **UNCONFIRMED**다(read 권한 미개방, `md5Hash` optional,
  Storage read 캐시 미확인, 늦은 도착 배제 불가).
- **★ Q7** 승인된 V2 outer는 `schema`/`enc` 2키뿐이고 `proofAsset.objectPath`는 **암호문 안**이라
  Rules가 `firestore.get()`으로도 참조 관계를 물을 수 없다. ⇒ **admin-state의 G-4 구조 A SDC′
  orphan 식별을 이식할 수 없고, orphan과 미판정 object는 현재 계약에서 구분 불가(FAIL)**다. 삭제
  보류가 유일하게 성립하는 기본값이며, asset↔token 매핑을 평문 REC으로 두는 우회는 **토큰 비밀성과
  충돌**한다.
- **Q8** 재사용 가능: 오류 매핑 규율(미확정은 `retryable:false`), 안전 오류 envelope, facade 주입,
  `demo-` prefix 가드, emulator 하네스·Rules 사본, 단일 비행, root barrel 재수출 금지.
  재사용 불가: head/REC 일체, `AdminState*` 타입, `loadBaseline`/`expectedBase`, admin-state 경로/
  contentType 상수, `space-read`의 `getDoc` facade, app 소유권 규칙의 무비판 복사.
- **Q9** 파일 후보(Rules 단위와 adapter 단위 분리), error code 후보 8개, fake 검증표 10행, emulator
  검증표 13행(V1 호환 회귀 가드와 기존 admin-state 13종 무회귀 포함)을 제시했다. **구현하지 않았다.**
- **Q10** Founder 결정 질문 **JJ-1~JJ-7** 분리. 결정 없이 진행 가능한 유일한 단위는 **JJ-7=A**
  (local `space-write` port + synthetic fake만, 네트워크 0)다. JJ-4(실제 UID) 전에 Rules 단위를 먼저
  하면 검증만 되고 배포되지 않는 코드가 쌓인다.

필수 실패표 20행을 PASS/FAIL/UNCONFIRMED/NOT TESTED로 분류했다. **시간 경과만으로 미판정이 안전한
orphan이 된다고 단정하지 않았다.** UNCONFIRMED로 남긴 것: 늦은 성공 가능성과 호출 전체 벽시계 상한,
`md5Hash` 상시 존재, Storage read 캐시, `spaces` 컬렉션 list 개방, PNG 크기·발급량·orphan 비용,
bucket CORS, 실제 운영자 UID.

설치 SDK 실측: `firebase` **12.17.1**(`@firebase/storage` **0.14.4**, `@firebase/firestore` **4.17.0**,
`@firebase/app` 0.16.0, `@firebase/auth` 1.13.4). `DEFAULT_MAX_UPLOAD_RETRY_TIME` **10분**,
`DEFAULT_MAX_OPERATION_RETRY_TIME` 2분, `TransactionOptions.maxAttempts` 기본 **5**,
`FullMetadata.md5Hash` **optional**, `StorageErrorCode` 25종, `FirestoreErrorCode` 16종.

진행도 보고: **78~81% 진행 / 19~22% 잔여 — 변동 없음**. 스펙 073 §7대로 조사만으로는 올리지 않는다.
제품 파일 변경 0이고 작업축 5·6·7 완료량은 그대로다. 오히려 이번 조사는 **작업축 6(발급/저장)의
남은 일이 Rules·Founder 결정에 막혀 있다는 사실을 더 분명히 했다**.

다음은 Codex 독립 검수다. 다음 구현 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다. 보호
대상과 기존 Founder/user working-tree 변경은 restore/checkout/stage/commit하지 않았다.

## ★ 스펙 073 — 원래 조사 계약 (기록)

- spec072 bundle 이후 immutable asset upload와 immutable `spaces/{token}` create 순서·실패 상태를 조사한다.
- 현재 Rules가 GG-4/GG-5 목표를 충족하는지, 공개 SDK·기존 adapter로 결과 미확정 상태를 판정할 수
  있는지 구분한다.
- upload/create/reconciliation/orphan 실패표와 Rules·emulator·제품 변경 후보를 작성하되 구현하지 않는다.
- 실제 Firebase/network/emulator/deploy/UI와 제품 코드·Rules/config/test 변경은 0이다.
- 전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다.

## ★ 스펙 072 — Codex 독립 검수 통과 / DONE

- 구현 `34cca25`, 검수 baseline HEAD=origin `452cc1a`, ahead/behind 0/0.
- 허용 제품 diff 2개만 존재하며 targeted 58/58, 확대 513/513, check(unit 2084/2084), Chromium
  151/151, bundle identity와 diff/포트/temp/staged 게이트가 모두 PASS했다.
- 추가 결함 0, 최종 `CODEX_PASSED / DONE`이다.
- upload/create/reconciliation, 실제 Firebase/Rules/network/emulator/deploy와 UI는 계속 금지다.

## ★ 스펙 072 — 구현 완료 기록

문서 commit `96422f8`(Codex 계약·handoff·STATE/NEXT/CURRENT/live log), 구현 commit `34cca25`. 제품
변경은 허용 신규 2파일(`apps/admin/src/space-v2/issue-bundle.ts`와 같은 이름의 unit)뿐이고 기존
spec064~071 제품 파일, package/lockfile/CSS/Firebase/Rules/config/UI diff는 **0**이다.

- 순서: top-level snapshot(정확히 8 key, 각 property 1회 read) → `createSpaceV2IssueIdentityPair` 1회
  → 성공 assetId를 더해 `prepareSpaceV2LocalIssueCandidate` 1회. 성공 경로 실측 호출은
  UUID assetId **#1** → UUID token **#2** → SHA **#1/#2/#3** → encrypt **#1**이다.
- malformed top-level input은 `SPACE_V2_BUNDLE_INVALID_INPUT`이고 UUID/SHA/encryption **0**.
  identity 실패(invalid port·첫 값·둘째 값·collision)는 모두 `SPACE_V2_BUNDLE_IDENTITY_FAILED`이고
  preparation/SHA/encryption **0**, UUID 예산 **0/1/2회**·세 번째 호출 **0**을 유지한다.
- preparation 실패(input·port·proof·scene·document)는 모두 `SPACE_V2_BUNDLE_PREPARATION_FAILED`이고
  UUID는 정확히 2회에서 멈춘다(재생성·retry·fallback·upload/create **0**).
- 성공 handle key는 `token` + copy 3개뿐. copy는 스펙 068 handle에 위임해 호출마다 fresh detached
  값을 주고, 한 copy를 변경해도 다음 copy와 token은 불변이다. token ≠ proof objectPath의 assetId이며
  실제 Web Crypto 왕복으로 encrypted scene의 proof descriptor = handle descriptor를 확인했다.
- 실패 결과는 exact `{ok, code}`뿐이고 child code·UUID 값/일부·password·path·bytes·ciphertext·
  message/stack **0**이다.
- ★ 범위 한계: 이 조합은 **local 준비만** 증명한다. upload/create/URL 발급과 실제 Firebase 경로는
  한 줄도 검증되지 않았고, 난수 품질·collision freedom도 여전히 증명 대상이 아니다.

게이트: targeted **58/58**, space-v2+spaces **513/513**, admin typecheck, `node scripts/check.mjs`
PASS(unit **2084/2084**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트 4183/4184/4185/
8080/9099/9199 LISTENING 0, `denn-e2e-*`/debug 잔류 0. bundle identity 유지 — 고객
`index-6js4DafP.js` **322,018** / admin `index-D0XOQpRL.js` **226,201** / admin CSS
`index-DJ_z3tK1.css` **9,146**, 두 bundle에 스펙 072 식별자 **0건**, `App.tsx`/`main.tsx` import·call 0.
mutation: assetId↔token 교체 **5건**, top-level snapshot을 raw pass-through로 바꾸면 **1건**,
preparation 시작 전 await 삽입 **1건**, exact-key 검사 완화 **2건**, 세 copy 캐시 **3건** 실패.

진행도 보고: **78~81% 진행 / 19~22% 잔여**(직전 77~80%에서 **+1%p**). 근거는 작업축 5의 local 발급
준비 사슬이 identity까지 포함해 하나의 handle로 닫힌 것이다. upload/create/URL 발급과 viewer/UI
(작업축 6·7)가 전혀 움직이지 않아 상승폭을 1%p로 제한했다.

다음은 Codex 독립 검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다. 보호 대상
spec-018 PNG와 기존 Founder/user working-tree 변경은 restore/checkout/stage/commit하지 않았다.

## ★ 스펙 072 — local issue bundle 원래 계약 (기록)

- spec071 identity pair를 한 번 생성하고 assetId를 spec068 preparation에 전달한다.
- 정상 순서는 UUID 2회 → SHA 3회 → encrypt 1회다. identity 실패면 preparation 0, preparation 실패면
  UUID 재생성·retry·upload/create 0이다.
- 성공 handle은 token과 fresh proof descriptor/upload bytes/encrypted document copies만 제공한다.
- 허용 제품 파일은 신규 local module/unit 2개뿐이다. 기존 spec064~071 제품 파일은 수정하지 않는다.
- upload, Firestore, Firebase/Rules/network/emulator/deploy와 admin/customer UI는 계속 NOT IMPLEMENTED /
  NOT TESTED / 금지다.

진행도 보고: **77~80% 진행 / 20~23% 잔여 — 변동 없음**. 계약만 준비됐고 구현 전이다.

## ★ 스펙 071 — Codex 독립 검수 통과 / DONE

- 구현 `eb3df01`, 기록 및 검수 baseline HEAD=origin `0d4aac4`, ahead/behind 0/0.
- 제품 diff는 허용 신규 `issue-identity-pair.ts`와 unit 2개뿐이다. 기존 spec064~070과 package/
  lockfile/CSS/Rules/config/UI diff는 0이다.
- 독립 게이트: targeted **29/29**, space-v2+spaces **455/455**, check PASS(unit **2026/2026**),
  Chromium **151/151**, bundle hash/size 일치, 신규 식별자 0, diff/포트/temp/staged 잔류 0.
- 추가 결함 0, 최종 `CODEX_PASSED / DONE`이다.
- 스펙 068 preparation 조합, upload, Firestore create/reconciliation, 실제 Firebase/network/Rules/
  emulator/deploy와 UI는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.
- 전체 리빌드 진행도는 **77~80% 완료 / 20~23% 잔여**다. 오늘 세션은 여기서 종료하며 다음
  스펙은 사용자 수동 지시 전까지 시작하지 않는다.

## ★ 스펙 071 — 구현 완료 기록

문서 commit `92540b4`(Codex 종료·HH-1 결정·계약 선반영), 구현 commit `eb3df01`. 제품 변경은 허용
2개 신규 파일뿐이고 기존 064~070 제품 파일, package/lockfile/CSS/config/Firebase/Rules/UI diff는
**0**이다.

- HH-1=A: proof `assetId`와 public link token은 **독립 UUID 두 개**. original `randomUUID`를 첫 호출
  전에 **1회 read** + callable 검증하고, receiver 보존 adapter로 스펙 069 candidate를
  **assetId → token** 순서로 두 번 호출한다.
- 호출 예산: malformed port **0회**, 첫 값 실패 **1회**(token 호출 0), 둘째 값 실패·collision
  **2회**. 세 번째 호출·자동 retry·repair **0**.
- 두 값이 같으면 성공으로 축소하지 않고 `SPACE_V2_IDENTITY_COLLISION`으로 fail-closed.
- 하위 token 오류 code 비노출(pair code 4개만), 실패 결과는 `{ok, code}`뿐이고 candidate 원문·UUID
  일부·UID/email·message/stack 0.
- ★ 범위 한계: 형식 일치와 두 값의 차이는 **난수 품질·collision freedom의 증명이 아니다**.

게이트: targeted **29/29**, space-v2+spaces **455/455**, admin typecheck, `node scripts/check.mjs`
PASS(unit **2026/2026**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
bundle identity 유지 — admin **226,201** / CSS **9,146** / 고객 **322,018**, spec 071 식별자 0건.
mutation: collision 검사 제거 시 3건, 첫 값 early stop 제거 시 4건 이상 실패.

진행도 보고: **77~80% 진행 / 20~23% 잔여**(직전 76~79%에서 +1%p). 근거는 identity 준비가 닫힌
것이며 조합·upload·create가 여전히 금지라 상승폭을 제한했고 작업축 6·7은 불변이다.

이 구현은 위 독립 검수를 통과했다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

## ★ HH-1=A 승인 · 스펙 071 계약 (기록)

- token과 proof `assetId`는 독립 UUID 두 개다. UUID source를 각각 한 번만 호출한다.
- assetId 생성 실패면 token 생성 호출은 0, token 생성 실패면 총 2회에서 중단한다.
- 둘이 같으면 `SPACE_V2_IDENTITY_COLLISION`으로 fail-closed하며 세 번째 호출이나 자동 retry는 0이다.
- 성공은 검증된 `{ assetId, token }`만 반환한다. child 오류 원문·UUID 값은 오류에 노출하지 않는다.
- 허용 제품 파일은 신규 local module/unit 2개뿐이다. 기존 spec064~070 제품 파일과 package/lockfile/
  Rules/config/UI는 변경하지 않는다.
- 스펙 068 preparation 조합, asset upload, Firestore create/reconciliation, 실제 Firebase/network/
  emulator/deploy와 UI는 계속 NOT IMPLEMENTED / NOT TESTED / 금지다.

진행도 보고: **76~79% 진행 / 21~24% 잔여 — 변동 없음**. HH-1 결정과 계약만 준비됐고 제품
작업축 완료량은 아직 증가하지 않았다.

## ★ 스펙 070 — Codex 독립 검수 통과 / DONE

문서 commit `53d115c`(Codex 종료·계약 선반영), 구현 commit `ff3c59a`. 제품 변경은 허용 2개 신규
파일뿐이고 기존 064~069 제품 파일, package/lockfile/CSS/config/Firebase/Rules/UI diff는 **0**이다.

- 표준 `Crypto.randomUUID()` capability 하나만 사용. `randomUUID`를 factory 호출당 **1회 read** +
  callable 검증하고, 성공 port는 그 snapshot을 **`.call(originalSource)`**로 호출한다.
- source 생략 시 `globalThis.crypto`, 명시 source는 그대로 사용하며 malformed여도 global로 대체하지
  않는다(`undefined`만 미지정 판정). malformed 7종은 `SPACE_V2_UUID_SOURCE_UNAVAILABLE`이고 global
  `randomUUID`/`getRandomValues`/`Math.random` 호출 **0**.
- adapter는 얇게 유지 — output 형식 검증·throw 매핑·operation당 호출 횟수·retry·repair 없음
  (스펙 069 candidate 소유, 중복 시 규칙 drift).
- ★ 범위 한계: Web Crypto 선택은 **난수 품질·충돌 부재의 증명이 아니다**. 실제 값 **1건**만 strict
  형식 통과 확인, 분포·entropy 추정 0.

게이트: targeted **21/21**, space-v2+spaces **426/426**, admin typecheck, `node scripts/check.mjs`
PASS(unit **1997/1997**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
bundle identity 유지 — admin **226,201** / CSS **9,146** / 고객 **322,018**, spec 070 식별자 0건.
mutation: 미지정 판정을 `source ?? global`로 바꾸면 2건, receiver 보존을 없애면 3건이 실패한다.

Codex 독립 게이트도 targeted **21/21**, 확대 **426/426**, unit **1997/1997**, Chromium **151/151**,
bundle/diff/포트/temp가 모두 PASS했다. 추가 결함 0, 최종 **CODEX_PASSED / DONE**이다.

당시 진행도는 **76~79% 진행 / 21~24% 잔여 — 변동 없음**이었고 다음 단계는 Founder `HH-1`
결정이었다. 이후 `HH-1=A`가 승인되어 현재 활성 계약은 상단의 스펙 071이다.

## 스펙 070 원래 계약 요약 (기록)

정본 `docs/rebuild/specs/070-space-v2-local-web-crypto-uuid-adapter.md`, handoff
`docs/handoff/2026-08-21-spec-070-space-v2-local-web-crypto-uuid-adapter-handoff.md`.

- 표준 `Crypto.randomUUID()` source method를 factory에서 한 번 snapshot하고 원 receiver를 보존한다.
- output 형식·throw mapping·operation 호출 횟수는 기존 spec 069 token candidate가 소유한다.
- 자체 UUID 조립, getRandomValues/Math.random fallback, retry/repair는 0이다.
- 신규 admin non-UI module/unit 2개만 허용한다. 기존 064~069 제품 파일, package/lockfile/CSS/config/
  Firebase/Rules/UI는 변경하지 않는다.
- token↔assetId 관계, issue bundle과 실제 발급/upload/Firestore create는 구현하지 않는다.

진행도는 **76~79% 진행 / 21~24% 잔여로 변동 없음**이다. 계약 문서만 준비됐고 작업축 6·7은 불변이다.

## ★ 스펙 069 — Codex 독립 검수 통과 / DONE

문서 commit `361b1d3`(Codex 종료·계약 선반영), 구현 commit `e5261a2`. 제품 변경은 허용 2개 신규
파일뿐이고 기존 064~068 제품 파일, package/lockfile/CSS/config/Firebase/Rules/UI diff는 **0**이다.

- 주입 UUID port의 `randomUUID`를 **1회 read + callable 검증**, 원 receiver로 **최대 1회 호출**.
- 성공은 lowercase RFC 4122 UUID v4 형식만. trim/lowercase repair·기본값·collision retry·global
  `crypto.randomUUID`/`getRandomValues`/`Math.random` fallback 모두 **0**.
- 오류 3개: `INVALID_PORT`(method 호출 0) / `GENERATION_FAILED`(재시도 0) / `INVALID_OUTPUT`.
  실패 결과는 `{ok, code}`뿐이고 원문 후보·token·UID/email·message·stack 0.
- ★ 범위 한계: 형식 검증일 뿐 **난수 품질·충돌 부재는 증명하지 않는다**(후속 adapter 계약).
- token↔assetId 관계, 스펙 068 조합, upload, Firestore create, URL 발급은 그대로 닫혀 있다.

게이트: targeted **41/41**, space-v2+spaces **405/405**, admin typecheck, `node scripts/check.mjs`
PASS(unit **1976/1976**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
bundle identity 유지 — admin **226,201** / CSS **9,146** / 고객 **322,018**, 두 bundle에 spec 069
식별자 0건. mutation: 형식 정규식을 느슨하게 바꾸면 8건이 실패한다.

Codex 독립 게이트도 targeted **41/41**, 확대 **405/405**, unit **1976/1976**, Chromium **151/151**,
bundle/diff/포트/temp가 모두 PASS했다. 추가 결함 0, 최종 **CODEX_PASSED / DONE**이다.

진행도 보고: **76~79% 진행 / 21~24% 잔여 — 변동 없음**. 스펙 069 통과 뒤 스펙 070 계약만
준비했으므로 추가 상승은 없다.

## 스펙 069 원래 계약 요약 (기록)

정본 `docs/rebuild/specs/069-space-v2-local-issue-token-candidate.md`, handoff
`docs/handoff/2026-08-21-spec-069-space-v2-local-issue-token-candidate-handoff.md`.

- 필수 주입 UUID port의 method를 한 번 snapshot하고 원 receiver로 최대 한 번 호출한다.
- lowercase RFC 4122 UUID v4만 성공이며 trim/lowercase repair, retry, global random fallback은 0이다.
- invalid port, generation throw, invalid output을 safe code로 분리하고 실패 결과에 candidate/message를
  노출하지 않는다.
- 신규 admin non-UI module/unit 2개만 허용한다. 기존 064~068 제품 파일, package/lockfile/CSS/config/
  Firebase/Rules/UI는 변경하지 않는다.
- token↔assetId 관계와 실제 발급/upload/Firestore create는 결정하거나 구현하지 않는다.

진행도는 **76~79% 진행 / 21~24% 잔여로 변동 없음**이다. 계약 문서만 준비됐고 작업축 6·7은 불변이다.

## ★ 스펙 068 — Codex 독립 검수 통과 / DONE

계약 commit `160eca0`, 구현 commit `31ee0d7`. 제품 변경은 허용 2개 신규 파일뿐이고 기존 065·066·067
제품 파일, package/lockfile/CSS/config/Firebase/Rules/`App.tsx`/UI diff는 **0**이다.

- 순서 **proof(SHA #1) → scene(SHA #2) → document(verify SHA #3 + encrypt #1)**. 중복 evidence 검증은
  의도적으로 유지했다.
- 첫 await 전 snapshot: 9개 exact key, selection/transform exact-key snapshot, password non-empty,
  catalog `readLegacyCatalog` detach, proof 단계 호출로 PNG bytes 즉시 복사(이후 raw bytes 재read 0).
- SHA/crypto method 각 1회 read + callable 검증 → receiver 보존 always-defined adapter를 세 단계가
  공유(global crypto fallback 0). malformed port는 `INVALID_PORT`, crypto adapter의 `decryptJson`은
  fail-closed stub이다.
- 단계별 `PROOF_FAILED`/`SCENE_FAILED`/`DOCUMENT_FAILED`가 이후 호출을 0으로 막고 하위 code·message·
  path를 노출하지 않는다. upload가 없어 Storage orphan 가능성 0.
- 성공 handle은 `copyProofDescriptor`/`copyUploadBytes`/`copyDocument` fresh copy 3종만 제공한다.

게이트: targeted **59/59**, space-v2+spaces **364/364**, admin typecheck, `node scripts/check.mjs`
PASS(unit **1935/1935**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
bundle identity 유지 — admin **226,201** / CSS **9,146** / 고객 **322,018**, 두 bundle에 spec 068
식별자 0건.

Codex 독립 게이트도 targeted **59/59**, 확대 **364/364**, unit **1935/1935**, Chromium **151/151**,
bundle/diff/포트/temp가 모두 PASS했다. 추가 결함 0, 최종 **CODEX_PASSED / DONE**이다.

진행도 보고: **76~79% 진행 / 21~24% 잔여**. 스펙 068 통과 확정 뒤 스펙 069 계약만 준비했으므로
추가 상승은 없다.

## 스펙 068 원래 구현 계약 (기록)

정본 `docs/rebuild/specs/068-space-v2-local-issue-preparation-orchestrator.md`, handoff
`docs/handoff/2026-08-21-spec-068-space-v2-local-issue-preparation-orchestrator-handoff.md`.

기존 spec065 scene projector, 066 proof-byte candidate, 067 verified encryption candidate를 한 번의
first-await snapshot-safe local 흐름으로 조합한다. 정상 순서는 proof SHA #1 → evidence SHA #2 → verify
SHA #3 → encrypt #1이다. 성공 handle은 fresh descriptor/upload bytes/document copies만 제공한다.

신규 admin non-UI module/unit 2개만 허용한다. token/UUID 생성, upload, Firestore create,
Firebase/Rules/config/network, UI/viewer와 기존 065~067 제품 파일 변경은 0이다.

현재 전체 리빌드 진행도는 **76~79% 완료 / 21~24% 잔여**다. 스펙 068 구현으로 작업축 5의 local
준비 사슬이 완성돼 약 +2%p 올랐고, 작업축 6·7이 불변이라 상단은 79%를 넘기지 않았다.

## ★ 스펙 067 — Codex 독립 재검수 통과 / DONE

HEAD=origin `c8f54cf`에서 보완 `db61c7d`를 독립 재검토했다. 단일 71/71, 확대 305/305,
unit 1876/1876, Chromium 151/151, check/bundle/diff/포트/temp 모두 PASS했고 일시 timeout은 재발하지
않았다. C-1 해소, 추가 결함 0, 최종 `CODEX_PASSED / DONE`이다.

token/UUID, upload, Firestore create, 실제 Firebase/network와 viewer/UI는 계속 금지다.

## ★ 스펙 067 보완 라운드 1 — 완료 / Codex 재검수 대기

보완 commit `db61c7d`(지시 기록 `342e890`). C-1만 처리했고 허용 제품 파일 2개
(`apps/admin/src/space-v2/document-encryption-candidate.ts`와 해당 unit) 밖으로 나가지 않았다.
호출 순서·오류 4개·금지 경계는 그대로다.

- `sha256.digest`와 `crypto.encryptJson`을 **각자 첫 await 전에 한 번씩만** 읽어 callable 검증한다.
  null/undefined/primitive/method 부재/non-function/throwing getter/revoked proxy는 typed failure다.
- SHA method snapshot을 **항상-defined adapter**로 감싸 verifier의 global Web Crypto default를 닫았다.
  두 호출 모두 `.call(port, …)`로 원 port의 `this`를 보존한다(class method-style port 회귀 포함).
- crypto도 snapshot한 callable만 정확히 1회 호출해 method getter drift를 막는다.
- invalid SHA port → `EVIDENCE_NOT_VERIFIED`, invalid crypto port → `ENCRYPT_FAILED`, raw message 0.
- 회귀 **17건** 추가: malformed SHA port 7종에서 global `crypto.subtle.digest` **0회** + encryption
  **0회**, malformed crypto port 7종, method getter one-read 2건, method-style receiver 1건.

재검증: targeted **71/71**, space-v2 **180/180**, space-v2+spaces **305/305**, admin typecheck,
`node scripts/check.mjs` PASS(unit **1876/1876**), 전체 Chromium **151/151**, `git diff --check` PASS,
포트/temp 잔류 0. bundle identity 불변(admin **226,201** / CSS **9,146** / 고객 **322,018**), 두
bundle에 spec 067 식별자 0건.

⚠ 관측 기록: 보완 직후 첫 단일 파일 실행 1회가 로컬 I/O 정체(transform 31.8s/import 34.6s)로 1건
5s timeout 실패했으나, 코드 변경 없이 단일 3회·확대 2회 재실행과 전체 check/Chromium 모두 PASS다.
재발하면 flaky 게이트로 즉시 보고한다.

진행도 보고: **74~77% 진행 / 23~26% 잔여 — 변동 없음**(범위 내 결함 수정, 새 능력 없음).

다음은 Codex 독립 재검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

## 스펙 067 보완 라운드 1 지시 (기록)

독립 검증은 unit 1859/1859, Chromium 151/151, check/bundle/diff/포트/temp까지 PASS했지만 C-1이 있다.
현재 `sha256 === undefined`이면 기존 verifier의 default Web Crypto port가 활성화되어 필수 주입/global
crypto 0 계약을 우회한다.

허용 제품 파일 2개 안에서 SHA/crypto method를 await 전 각 1회 snapshot·검증하고, always-defined SHA
adapter를 verifier에 넘긴다. undefined/null/non-function/throwing getter/revoked proxy와 getter one-read,
global digest 0을 테스트한다. 다른 범위는 변경하지 않는다.

스펙 067은 아직 DONE이 아니다. 진행도 정본은 **72~75% 완료 / 25~28% 잔여**이며, 보완 통과 뒤
상승 여부를 다시 평가한다.

## ★ 스펙 067 — 구현 완료 / Codex 독립 검수 대기

계약 commit `2107a72`, 구현 commit `35b7ffd`. 제품 변경은 허용 2개 신규 파일뿐이고 package/lockfile/
CSS/Rules/config/`App.tsx`/route/UI와 shared·spaces·firebase 제품 파일 diff는 **0**이다.

- input exact key 2개, password는 await 전에 1회 스냅샷(non-empty string 계약만 재사용).
- `readSpaceSceneV2` 1회 → **암호화 전** `verifyFrameReplayEvidenceDigestV1`로 evidence↔digest 실제
  일치 검증(mismatch·throw·reject·bad length/type → `EVIDENCE_NOT_VERIFIED`, encryption 0회).
- detached scene만 `encryptJson`에 1회 → `{schema:"space-v2", enc}`를 `readSpaceDocumentV2`로 재검증한
  detached 값 반환. SHA-256 1회 / encryptJson 1회 / decryptJson 0 / retry 0.
- 오류 4개, 실패 결과는 `{ok, code}`뿐. password/path/digest/ciphertext/token/UID/thrown message 0.

게이트: targeted **54/54**, space-v2+spaces **288/288**, admin typecheck, `node scripts/check.mjs`
PASS(unit **1859/1859**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
bundle identity 유지 — admin `index-D0XOQpRL.js` **226,201 bytes**, admin CSS **9,146 bytes**,
고객 `index-6js4DafP.js` **322,018 bytes**, 두 bundle에 spec 067 식별자 0건. 실제 `createSpaceCrypto`
로컬 roundtrip도 원 scene과 동일하게 복호화된다.

진행도 보고: **74~77% 진행 / 23~26% 잔여**(직전 72~75%에서 약 +2%p). 근거는 위 §진행도 절과 같다.

다음은 Codex 독립 검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

## 스펙 067 원래 구현 계약 (기록)

정본 `docs/rebuild/specs/067-space-v2-local-document-encryption-candidate.md`, handoff
`docs/handoff/2026-08-21-spec-067-space-v2-local-document-encryption-candidate-handoff.md`.

strict `SpaceSceneV2`를 `readSpaceSceneV2`로 detached snapshot하고 기존 verifier+주입 SHA-256 port로
evidence digest 일치를 확인한 뒤 `SpaceCryptoPort.encryptJson`을 정확히 한 번 호출한다. 결과는 exact
`{schema:"space-v2", enc}`로 감싸 `readSpaceDocumentV2`로 다시 검증한다. 신규 admin non-UI module/unit
2개만 허용한다. password는 기존 non-empty string 계약만 재사용하며 token/UUID, upload, Firestore
create, Firebase adapter/Rules/config/network와 UI/viewer는 0이다.

현재 전체 리빌드 진행도는 **74~77% 완료 / 23~26% 잔여**다. 스펙 067 구현으로 작업축 5의 V2 암호화
문서 조립이 닫혀 약 +2%p 올랐고, 작업축 6·7이 불변이라 상단은 77%를 넘기지 않았다.

## ★ 스펙 066 — Codex 독립 검수 통과 / DONE

HEAD=origin `e4bcce9`에서 구현 `9fee315`를 독립 검토했다. 허용 제품 diff 2개가 정확하고
space-v2+spaces 234/234, admin typecheck, `node scripts/check.mjs` PASS(unit 1805/1805), Chromium
151/151, bundle identity, `git diff --check`, 포트/temp 잔류 0을 재현했다. 최종 판정
`CODEX_PASSED / DONE`이다. full PNG decode 및 실제 upload/Firebase/token/document create/viewer/UI는
계속 NOT TESTED / 금지다.

진행도 정정: 이전 `72~76% / 24~28%`는 “상단은 유지” 근거와 모순됐다. 정본은
**72~75% 완료 / 25~28% 잔여**다.

## ★ 스펙 066 — 구현 완료 / Codex 독립 검수 대기

계약 commit `1ede90c`, 구현 commit `9fee315`. 제품 변경은 허용 2개 신규 파일뿐이고 package/lockfile/
Rules/config/`App.tsx`/UI·CSS/shared·spaces·firebase 제품 파일 diff는 **0**이다.

- caller `Uint8Array`를 **await 전에** 1회 복사, lowercase UUID v4 → 승인 경로, PNG signature·첫 chunk
  length 13·`IHDR`·IHDR dimensions만 확인, 그 snapshot의 SHA-256으로 스펙 064 descriptor 생성.
- digest port에는 별도 복사본을 넘기고 정확히 1회 호출한다. `copyUploadBytes()`는 매번 새 복사본이다.
  UUID/random/Date/network/Firebase/DOM/Canvas 0, SHA-256 port는 필수 주입이다.
- ★ 범위 한계: **full PNG decode/CRC/chunk sequence/IDAT/IEND/browser decode는 NOT TESTED**다. 성공의
  의미는 PNG-header candidate이며 모듈·unit 주석과 문서에 그대로 적었다.

게이트: targeted **55/55**, space-v2+spaces **234/234**, admin typecheck, `node scripts/check.mjs`
PASS(unit **1805/1805**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
bundle identity 유지 — admin `index-D0XOQpRL.js` **226,201 bytes**, admin CSS `index-DJ_z3tK1.css`
**9,146 bytes**(unwanted utility 0), 고객 `index-6js4DafP.js` **322,018 bytes**, 두 bundle에 spec 066
식별자 0건.

진행도 보고: **72~76% 진행 / 24~28% 잔여**(이전 70~75%에서 하단 상향). 근거는 위와 같다.

다음은 Codex 독립 검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

## 스펙 066 원래 구현 지시 (기록)

정본과 handoff를 먼저 전부 읽는다. 허용 제품 파일은 정확히 다음 두 개뿐이다.

- 신규 `apps/admin/src/space-v2/proof-asset-candidate.ts`
- 신규 `apps/admin/src/space-v2/proof-asset-candidate.test.ts`

caller PNG bytes를 await 전에 복사하고, lowercase UUID v4에서 approved object path를 만들며, PNG
signature/첫 IHDR의 intrinsic dimensions와 exact snapshot SHA-256 descriptor를 생성한다. 성공 handle은
같은 snapshot의 fresh upload-byte copy를 반환해야 한다. SHA-256 port는 필수 주입이며 random/Date/
network/Firebase/DOM/Canvas를 사용하지 않는다.

이번 성공은 full PNG decode/CRC/chunk validity를 증명하지 않는다. upload/token/encryption/Firestore
create/viewer/UI/Rules/config는 계속 0이다. 다른 파일이 필요하면 STOP한다.

targeted+spec065+spaces, admin typecheck, 전체 check, Chromium 151개 이상, 두 앱 bundle identity,
admin CSS 9,146 bytes/unwanted utility 0, diff/forbidden/ports/temp를 검증한다. 구현·기록 commit을 각각
fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다.

## 전체 리빌드 진행도 — 매 보고 필수

- **현재 추정: 72~76% 진행 / 24~28% 잔여**(production cutover까지 포함). 스펙 066으로 작업축 5의
  byte-identity 하위 작업이 닫혀 하단 경계만 올렸고, 작업축 6·7이 불변이라 상단은 유지했다.
- 최종 스펙 총개수는 고정돼 있지 않아 현재 스펙 번호를 분모로 쓰지 않는다. 이는 아래 7개 로드맵
  작업축의 상태를 바탕으로 한 관리 추정치다.
  1. 기술 스택·모노레포·공유 기반 — 완료
  2. catalog·legacy 데이터 읽기 호환 — 대부분 완료
  3. 고객 browse·preview·Canvas·편집·local PNG — 대부분 완료
  4. admin auth/read/edit/C5 local·emulator — 대부분 완료, 운영 연결 보류
  5. space 링크 — V1 안전 차단과 V2 local evidence/projector 완료, V2 발급·viewer 잔여
  6. 최종 UI/UX·시각·실기기·preview 통합 검증 — 잔여
  7. 실제 UID·Rules/Firebase·production cutover·모니터링/롤백 — 잔여
- 앞으로 Claude 완료 보고와 Codex 검수 보고에는 진행/잔여 수치, 변동 여부, 수치가 변한 근거를 반드시
  포함한다. 새 근거가 없으면 이전 범위를 유지한다.

## Claude Code 확인 기록 (2026-08-21)

Claude Code가 이 문서를 읽고 HOLD를 준수했다. active_unit이 `none`이라 구현 범위가 없어 제품 코드·
테스트·Rules·config·package/lockfile을 변경하지 않았고, 새 스펙을 추측해 시작하지 않았으며 자동화·
반복 작업도 만들지 않았다. 기록 상태만 재확인했다 — HEAD=origin ahead/behind 0/0, 제품 diff 0,
targeted+spaces **179/179**, `node scripts/check.mjs` PASS(unit **1750/1750**), admin entry
`index-D0XOQpRL.js` 226,201 bytes, customer entry `index-6js4DafP.js` 322,018 bytes, admin CSS
`index-DJ_z3tK1.css` **9,146 bytes**(`.transform`/`.italic`/scaffold 0건). 전체 Chromium E2E는 제품
diff가 0이라 재실행하지 않았다(보호 대상 spec-018 PNG 재기록 회피).

진행도 보고: **70~75% 진행 / 25~30% 잔여, 변동 없음**. 근거는 제품 단위 미구현으로 7개 작업축 상태가
바뀌지 않은 것이다. 보호 대상과 기존 Founder/user working-tree 변경은 건드리지 않았다.

## ★ 스펙 065 Codex 독립 재검수 통과 / HOLD

Codex가 HEAD=origin `7255012`에서 보완 commit `ec7610e`를 독립 재검수했다. 허용 제품 diff 3개가
정확하고 C-1~C-3은 모두 충족됐다. targeted+spaces **179/179**, admin/ui typecheck,
`node scripts/check.mjs` PASS(unit **1750/1750**), 전체 Chromium **151/151**,
`git diff --check dcd893c..HEAD` PASS다. 추가 결함 0, 최종 판정 **CODEX_PASSED / DONE**이다.

admin entry는 `index-D0XOQpRL.js` 226,201 bytes / SHA-256
`B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`, customer entry는
`index-6js4DafP.js` 322,018 bytes / SHA-256
`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`로 기준과 일치한다. admin CSS
실측은 `index-DJ_z3tK1.css` **9,146 bytes**이며 `.transform`/`.italic`/rotate·skew property scaffold는
0건이다. 이전 9,144 표기는 계수 오류로 정정한다.

현재 Claude Code가 구현할 활성 스펙은 없다. 다음 수동 지시와 Codex 스펙 전에는 제품 코드·테스트·
Rules/config/package/lockfile을 수정하지 않는다. 실제 Firebase/network/UID/emulator/deploy,
token/encryption/upload/document create, issuer/viewer/UI 연결도 계속 금지다. 자동화·반복 작업을 만들지
않고 보호 대상을 건드리지 않는다.

## ★ 스펙 065 보완 라운드 1 — 완료 / Codex 재검수 대기

보완 commit `ec7610e`. C-1~C-3만 처리했고 허용 제품 파일 3개
(`apps/admin/src/space-v2/issue-candidate.ts`, 같은 디렉터리 unit, `packages/ui/src/theme.css`) 밖으로
나가지 않았다. admin package/lockfile 추가 diff 0.

- **C-1** `readLegacyCatalog(issue.catalog)` 1회 → detached document 하나만 geometry·art projector가
  사용한다. 실패/throw는 `SPACE_V2_ISSUE_CATALOG_PROJECTION_FAILED`. drifting art getter 회귀 2건
  추가(첫 read art-present → digest 0 + unsupported / art-absent → 이후 drift 무관 성공, read 1회).
  detached clone이라 도달 불가가 된 image projector try/catch는 제거했다.
- **C-2** `theme.css`에 `@source not "../../../apps/admin/src/space-v2/**/*";` 1줄 + 근거 문장만.
  admin entry `index-D0XOQpRL.js` **226,201 bytes** / SHA-256
  `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC` **복원**, admin CSS
  `index-DJ_z3tK1.css` 9,146 bytes 복귀, `.transform`/`.italic`/property scaffold 0건, mockup 불변.
- **C-3** handoff EOF blank line 제거 → `git diff --check dcd893c..기록 HEAD` PASS.

재검증: targeted **54/54**, spaces **125/125**, `node scripts/check.mjs` PASS(unit **1750/1750**),
전체 Chromium **151/151**, 포트/temp 잔류 0. 이전 DEVIATION은 해소됐고 게이트 문구는 약화하지 않았다.

다음은 Codex 독립 재검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

## 스펙 065 보완 라운드 1 지시 (기록)

정본 `docs/rebuild/specs/065-space-v2-local-issuer-projector.md`의 `CODEX REVIEW —
CORRECTION_REQUIRED ROUND 1`을 먼저 전부 읽고 C-1~C-3만 보완한다.

허용 제품 파일:

- `apps/admin/src/space-v2/issue-candidate.ts`
- `apps/admin/src/space-v2/issue-candidate.test.ts`
- `packages/ui/src/theme.css` — exact
  `@source not "../../../apps/admin/src/space-v2/**/*";`와 기존 설명 주석의 최소 정정만

필수 보완:

1. `readLegacyCatalog(issue.catalog)`를 1회 실행해 detached document를 만들고 geometry/art projector가
   같은 document만 사용한다. 실패는 safe catalog-projection code로 매핑한다. drifting template art
   getter의 first snapshot 일관성과 digest 0을 unit으로 고정한다.
2. 기존 mockup Canvas source exclusion 선례 옆에 admin non-UI `space-v2` exact exclusion을 추가한다.
   broad exclusion/config 변경/문자열 난독화 없이 admin entry baseline
   `index-D0XOQpRL.js` / 226,201 bytes / SHA-256
   `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`를 복원한다. admin production
   CSS에서 이 디렉터리 때문에 생성된 `.transform`/`.italic`과 관련 property scaffold가 없어야 한다.
3. spec 065 handoff EOF blank line을 정리해 `git diff --check dcd893c..새 HEAD`까지 PASS시킨다.

문서는 spec 065, handoff, STATE/NEXT/CURRENT/live log만 수정한다. apps/admin package와 lockfile는 추가
diff 0, `App.tsx`, UI/CSS 디자인, Vite/Tailwind config, Firebase/Rules/config, shared/spaces 제품 파일은
수정하지 않는다.

targeted + spaces 전체, admin/ui typecheck, `node scripts/check.mjs`, 전체 Chromium 151/151 이상, mockup과
admin bundle identity, exact diff, ports/temp/debug 0을 검증한다. 보호 대상은 restore/checkout/stage/
commit하지 않는다.

보완 코드 commit과 기록 문서 commit을 일반 fast-forward push하고 `READY_FOR_CODEX`에서 멈춘다. 다음
스펙은 시작하지 않고 자동화·반복 작업도 만들지 않는다.

## ★ 스펙 065 — 구현 완료 / Codex 독립 검수 대기

계약 commit `e9e0c6d`, 구현 commit `5fc89d2`. 제품 변경은 허용 4개 파일뿐이고 `App.tsx`/UI/CSS/
Firebase/Rules/config와 shared·spaces 제품 파일은 무변경이다. targeted unit **52/52**,
`vitest run packages/spaces` **125/125**, admin typecheck, `node scripts/check.mjs` PASS(unit
**1748/1748**), 전체 Chromium **151/151**, `git diff --check` PASS, 포트/temp 잔류 0.
고객 entry `index-6js4DafP.js` **322,018 bytes** / 기준 SHA-256 불변.

★ **DEVIATION 1건**: 정본 §5의 admin entry hash 불변만 충족하지 못했다. admin entry JS는
byte-identical(226,201)이고 baseline과의 차이는 상호 파일명 참조 한 곳이며 admin JS에 이번 module
코드·식별자·계약 문자열이 0건이다. 원인은 Tailwind v4 소스 스캔이 evidence 계약 필드명 `transform`
(+spec 031 fixture가 요구하는 `italic`)을 utility로 만들어 admin CSS가 9,146 → 9,821 bytes가 된 것이다.
회피 가능한 `!transform`/`uppercase`는 제거했고 남은 둘은 허용 파일 안에서 제거할 수 없다.
Tailwind/vite config 변경은 허용 파일 밖이라 하지 않았다. 게이트 문구 정정 또는 별도 스펙 중 어느
쪽을 택할지는 Codex 결정 사항으로 남긴다.

다음은 Codex의 독립 검수다. 새 스펙은 시작하지 않았고 자동화·반복 작업도 만들지 않았다.

## 스펙 065 원래 구현 지시 (기록)

정본 `docs/rebuild/specs/065-space-v2-local-issuer-projector.md`와 handoff
`docs/handoff/2026-08-21-spec-065-space-v2-local-issuer-projector-handoff.md`를 먼저 전부 읽고, 정본의
허용 범위만 구현·검증한다.

허용 제품 파일:

- 신규 `apps/admin/src/space-v2/issue-candidate.ts`
- 신규 `apps/admin/src/space-v2/issue-candidate.test.ts`
- `apps/admin/package.json`의 `@denn/spaces: workspace:*` 추가만
- `pnpm-lock.yaml`의 admin importer 최소 변경만

핵심은 existing catalog projector 결과와 explicit issue input을 strict `FrameReplayEvidenceV1` 및
`SpaceSceneV2` candidate로 조립하는 local-only 비-UI 경계다. text/clock/template art와 invalid input은
digest 호출 전에 fail-closed한다. `App.tsx`에서 import/call하지 않는다.

targeted unit, spaces 전체 125개 이상 회귀, admin typecheck, `node scripts/check.mjs`, 전체 Chromium,
두 앱 bundle 변경 전후 hash, `git diff --check`, exact diff와 포트/temp 잔류를 검증한다. 전체 Chromium이
다시 쓰는 보호 spec-018 PNG는 restore/checkout/stage/commit하지 않는다.

Firebase/Rules/config/실제 network·UID·emulator·deploy, UI/CSS, token/encryption/upload/Firestore create,
viewer/open, shared/spaces 제품 파일 변경은 금지다. 허용 범위 밖 파일이나 새 제품 결정이 필요하면
STOP하고 질문한다.

완료 후 구현 commit과 문서 기록 commit을 일반 fast-forward push하고 STATE/NEXT/CURRENT/live log를
`READY_FOR_CODEX`로 맞춘다. 다음 스펙은 시작하지 않는다. 자동화·반복 작업을 만들지 않는다.

## 이전 Claude Code 지시 — HOLD (스펙 065 계약으로 해소)

스펙 064는 Codex 독립 검수를 통과했다. 다음 제품 단위와 허용 파일이 아직 정해지지 않았으므로 제품
코드·테스트·Rules·config·package/lockfile를 수정하지 않는다. 새 스펙을 추측해 시작하거나 issuer,
Firebase adapter, Storage upload, Firestore create, viewer/UI 연결로 확장하지 않는다.

사용자의 다음 수동 제품 지시와 Codex가 작성한 새 `docs/rebuild/specs/NNN-*.md`가 준비된 뒤에만 아래
수동 시작 문구로 작업한다.

```text
C:\repo\denn-products에서 Automation/NEXT_CLAUDE_PROMPT.md를 읽고 명시된 범위만 수행해. 보호 대상은 건드리지 말고 자동화는 만들지 마. 완료 후 STATE/NEXT/CURRENT/live log를 실제 상태와 맞추고 결과를 보고해.
```

복원된 순서:

1. Claude Code가 승인된 스펙 범위만 구현·검증한다.
2. Claude Code가 live log와 STATE/NEXT/CURRENT를 실제 상태에 맞춘다.
3. Codex가 구현 diff와 게이트를 독립 검수한다.
4. Codex가 판정 및 다음 Claude 프롬프트 문서를 남긴다.
5. Claude Code는 그 문서를 읽고 다음 승인 단위만 수행한다.

자동화·반복 작업은 만들지 않는다. Codex의 제품 코드 직접 수정도 중단됐다.

### Claude Code 확인 기록 (2026-08-21)

Claude Code가 이 문서를 읽고 HOLD를 준수했다. active_unit이 `none`이라 구현 범위가 없어 제품
코드·테스트·Rules·config·package/lockfile을 변경하지 않았고, 새 스펙을 추측해 시작하지 않았다.
기록 상태만 로컬 재확인했다 — HEAD=origin `1f60bc5`, ahead/behind 0/0, staged 0,
`node scripts/check.mjs` PASS(unit 1696/1696), `vitest run packages/spaces` 125/125,
고객 entry `index-6js4DafP.js` 322,018 bytes / 기준 SHA-256 일치, `git diff --check` PASS.
전체 Chromium E2E는 이번 세션 제품 diff가 0이라 재실행하지 않았다. Codex 종료 문서만 commit·push
했고 보호 대상 spec-018 PNG와 기존 Founder/user 변경은 그대로 뒀다.

## ★ 스펙 064 — CODEX_PASSED / DONE

- 구현 commit `0c5d6fa`, 기록·검수 기준 HEAD `1f60bc5`.
- 허용 제품 diff 3개와 계약을 독립 대조했고 추가 결함 0.
- targeted spaces **107/107**, spaces typecheck, 전체 check PASS(unit **1696/1696**), 전체 Chromium
  **151/151**, `git diff --check` PASS.
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- 실제 Firebase/network/UID/Rules/emulator/deploy, issuer/viewer/UI, upload/document create는 계속
  **NOT IMPLEMENTED / NOT TESTED / 금지**다.

## ★ 스펙 064 — 첫 local-only space V2 replay evidence 구현 검수

정본: `docs/rebuild/specs/064-space-v2-replay-evidence-investigation.md`
Founder 결정:
`docs/codex-claude-handoff/decisions/2026-08-20-space-v2-replay-evidence-decisions.md`
handoff: `docs/handoff/2026-08-20-spec-064-space-v2-replay-evidence-investigation-handoff.md`

Founder **GG-1=A~GG-6=A**에 따른 첫 local-only 구현 commit은 **`0c5d6fa`**다. 아래 허용 diff를
정본의 exact shape/canonical tuple과 독립 대조한다.

제품 변경 파일은 정확히 다음 세 개여야 한다.

- 신규 `packages/spaces/src/v2.ts`
- 신규 `packages/spaces/src/v2.test.ts`
- `packages/spaces/src/index.ts` — V2 explicit export만

검수 핵심:

- V2 outer/scene/nested exact-key와 enum/range/orientation/color/path/base64/byte-cap 검증이 strict한가.
- fixed-position tuple이 정본 순서와 정확히 같고 arbitrary key order, `-0`, hostile/drifting input을
  deterministic detached snapshot으로 처리하는가.
- digest port가 exact canonical bytes를 한 번만 받고 throw/reject/bad-length/mismatch를 safe code로
  매핑하는가. raw path/token/password/customer text/bytes/error message가 실패에 없는가.
- first capability 밖 text/art/clock/room을 accepted state로 넓히지 않았는가.
- 기존 V1 `SPACE_SCENE_VERSION`, reader/open/types/results가 그대로인가.
- 미사용 V2 export가 고객 bundle에 포함되지 않고 기준 entry byte/hash가 유지되는가.

구현자가 보고한 결과:

- targeted spaces **107/107**
- `node scripts/check.mjs` PASS: format/lint/all typecheck/unit **1696/1696**/mockup+admin build
- 전체 Chromium **151/151**
- canonical vector Web Crypto/.NET SHA-256 일치:
  `9TMqpMGuEgpsbOQW8QfNdh/MysY0dDRPbDl4ODX7/mI=`
- 고객 entry `index-6js4DafP.js`, **322,018 bytes**, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`
- 포트/temp/debug 잔류 0

독립 재검증:

- targeted spaces unit/typecheck와 `node scripts/check.mjs`
- 전체 Chromium E2E 또는 변경 무관성을 증명할 동등한 회귀 게이트
- `git diff --check`, exact changed paths, package/lockfile/Rules/config diff 0
- 고객 entry name/bytes/SHA-256 기준 일치
- 포트 4183/4184/4185/8080/9099/9199와 `denn-e2e-*`/debug 잔류 0

전체 Chromium은 보호 대상 spec-018 PNG 두 개를 다시 쓴다. restore/checkout/stage/commit하지 않고
기존 dirty 상태로 남긴다.

계속 금지:

- `storage.rules`, `firestore.rules`, `firebase.json`, env/config, 실제 UID
- Firebase SDK adapter, Storage upload/read, Firestore document create/reconciliation
- token 발급, issuer projector, admin/customer UI·CSS, viewer/open composition
- V1 migration/rewrite, text/font/art/clock/room/gallery 확장
- orphan delete/cleanup, published write, C6/backend, dependency/package/lockfile 변경
- 실제 Firebase/project/bucket/object/network/data, emulator/live/deploy

추가 결함이 없으면 `CODEX_PASSED`로 종료 문서만 갱신한다. 결함이 있으면 허용 3개 제품 파일과 spec 064
문서 안에서만 `CORRECTION_REQUIRED`를 작성한다. Rules/Firebase/UI/issuer/viewer로 확장하지 않는다.
보호 대상과 기존 Founder/user 변경은 stage/commit/restore하지 않는다.

## ★ 스펙 063 — V1 안전 차단 viewer UI/UX (종료)

정본: `docs/rebuild/specs/063-space-v1-safe-viewer-ui.md`
handoff: `docs/handoff/2026-08-20-spec-063-space-v1-safe-viewer-ui-handoff.md`

`SpacePostAuthFrameView`가 catalog load·proof owner·Image decode·font load·Canvas plan보다 **먼저**
V1 replay 자격을 판정한다. blocked면 그 뒤 단계가 하나도 시작되지 않는다 — 인증 전후 모두 catalog/
proof/art 요청 0, Canvas 0, retry 0, 자동 fallback/merge/migration 0.

구조는 wrapper/child 분리다. wrapper는 `useMemo` 하나만 무조건 호출하고 분기는 자식 컴포넌트 선택이므로
조건부 hook 호출이 없다. `SpaceExactFrameComposition`은 module-private라 gate를 우회하는 seam이 없다.

안전 안내는 Modern Studio 토큰만 쓴다. 오류코드·URL·token·비밀번호·ID·SDK 문구 0, Canvas·이미지
placeholder 0, 재시도 버튼 0, 카카오/외부 링크 0. `role="alert"` + `aria-labelledby`, 320px 가로 overflow 0.

검증: targeted unit 15/15, `node scripts/check.mjs` PASS(unit 1627/1627), 전체 Chromium E2E
**151 passed / 0 failed**(변경 전 baseline 실측 3 failed / 145 passed), console error/warning 0,
axe serious/critical 0, 실제 외부 egress 0, 포트 잔류 0. 고객 entry `index-6js4DafP.js` 322,018 bytes, SHA-256
`A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.

### Founder Q1 = A (해소됨)

`tests/e2e/space-frame-view.spec.ts` 2건은 기준 커밋 `e9dbb9e`에서 이미 실패 상태였다. 스펙 062가
`composeSpaceFramePlan()`을 fail-closed로 바꾼 결과이며, 스펙 062는 FF-5=A 범위 밖이라 E2E를
실행하지도 수정하지도 않았다.

Founder가 A를 선택해 이 spec 파일만 허용 추가했다. fixture
`apps/mockup/src/e2e/space-frame-fixture.tsx`는 변경 0이고, 그 계측으로 주입된 catalog reader·
readiness factory·font environment 호출 0을 직접 검증한다(production route가 할 수 없는 검증).
도달 불가해진 canvas 단계 단언의 대체 coverage는 스펙 §7.2에 명시했다.

Codex 독립 검수에서 코드·테스트·계약상 추가 결함을 찾지 못했다. 독립 재현은 targeted unit
**15/15**, `node scripts/check.mjs` PASS(unit **1627/1627**), 변경 범위 Chromium E2E **8/8**,
`git diff --check` PASS다. Claude의 전체 Chromium **151/151** 결과와 고객 entry 해시도 대조 일치했다.
두 spec-063 시각 결과를 직접 확인했고 안전 차단 화면의 계층·문구·모바일 wrapping에 결함을 찾지 못했다.

실제 Firebase/project/token/document, 운영 V1 scene, 실제 catalog/proof/CORS, 실기기·실폰트,
V2 schema/fingerprint/issuer, admin orientation UI, migration/재발급, write/publish/deploy/cutover는 여전히
**NOT TESTED / NOT IMPLEMENTED / 금지**다.

스펙 063은 **DONE / CODEX_PASSED**다. 다음 스펙이나 구현은 자동 시작하지 않는다. Founder의 다음 수동
작업을 기다린다.

## 참고 — 이전 단위

## ★ 스펙 062 종료 - V1 방향·사진 transform 재현 차단

정본: `docs/rebuild/specs/062-space-v1-orientation-transform-replay-investigation.md`

V1 scene은 `frameImgT`는 저장하지만 portrait/landscape mode와 capture logical canvas/zone/image basis,
catalog revision을 저장하지 않는다. legacy x/y는 absolute logical px이고 current x/y는 maxPan 기준
normalized 값이다. `rot=0`도 portrait와 unrotated landscape를 구분하지 못한다.

따라서 현재 identity-looking transform 성공은 전체 frame exact replay를 증명하지 않는다. 스펙 061은
실제 운영에 배포되지 않았고 실제 Firebase/network/운영 데이터 접근은 0이다.

Founder 결정:

- **FF-1=A:** orientation evidence 없는 V1 exact replay fail-closed
- **FF-2=A:** centered zoom은 별도 evidence가 있을 때만 조건부, heuristic pan/rot 변환 0
- **FF-3=A:** explicit orientation + normalized transform + geometry evidence의 future version
- **FF-4=A:** V1 자동 migration/same-token rewrite 0
- **FF-5=A:** 첫 correction은 pure classifier/plan gate/unit만, UI/CSS/issuer/network 0

구현 `a09278a`. V1 classifier가 malformed/unsupported/orientation-unconfirmed를 분리하고 frame plan은
proof owner·Image·Canvas plan 전에 fail-closed한다. targeted 59/59, 전체 non-network check PASS(unit
1612/1612), 고객 entry `index-Df973d19.js` 320,713 bytes, SHA-256
`4389D6D60367314FF80FC0793E1085C6646DAD946FA23CA2A3911013331A2453`.

## ★ 다음 수동 작업 - Claude UI/UX 인계

V2 발급 화면, partial replay 안내, orientation 선택·표시는 실제 UI/UX 구현 단계다. 사용자 지시에 따라
Codex는 이 단계의 디자인·UI 구현을 시작하지 않는다. Claude가 먼저 다음 경계를 계약으로 고정해야 한다.

- 새 immutable token을 쓰는 별도 scene version. V1 reader/migration/same-token rewrite 변경 0.
- explicit orientation, normalized transform encoding, geometry/catalog evidence를 UI가 임의로 정의하지 않음.
- V1 viewer는 안전 오류/재발급 안내만 제공하고 best-effort Canvas·자동 fallback·자동 migration 0.
- admin issuer의 orientation 선택과 재현 가능성 안내, viewer의 partial/exact 상태 표현은 Modern Studio 디자인
  정본을 따르되 기존 고객 browse/preview 디자인을 임의 변경하지 않음.
- 스펙 061 production-route E2E의 V1 Canvas 성공 기대를 안전 오류 기대값으로 갱신하되 외부 egress 0 유지.
- 실제 Firebase/project/token/network/write/deploy와 운영 데이터 접근 0. V2 schema/fingerprint가 별도
  비시각 계약으로 확정되지 않으면 UI 구현도 STOP.

Codex는 Claude 결과를 코드·계약·회귀 관점에서 검수할 수 있다. 다음 작업은 자동 시작하지 않는다.

## ★ 스펙 061 종료 - production frame route 연결

정본: `docs/rebuild/specs/061-space-production-frame-route-connection-investigation.md`

Founder **EE-1=A~EE-5=A**에 따라 production ready seam에 `SpacePostAuthFrameView`와 production
`publicCatalogReader`를 연결했다. root에는 controller factory 하나만 합성 seam으로 추가했고 일반 browse
route는 이 factory를 만들지 않는다.

non-production fixture는 production root/default reader/browser Image owner를 사용한다. Playwright가 모든
HTTPS를 정규식 catch-all로 intercept하고 exact catalog/proof URL만 합성 응답해 실제 외부 egress를 0으로
유지했다. pre-auth 요청 0, ready Canvas 1, invalid catalog fail-closed, unmount 뒤 late proof 차단과 비밀
비노출을 검증했다.

자체 검수에서 문자열 glob catch-all이 의도대로 동작하지 않아 신규 E2E 3개가 실패한 사실을 발견했고,
정규식으로 교정했다. 구현 **`cf13a2a`**. 전체 check PASS(unit **1609/1609**), Chromium **148/148**,
고객 entry `index-CVr4hkHb.js` **322,548 bytes**, SHA-256
**`E70626F22B181C3BC5DBCE4F5B6B644E3AC026B814ECFAE3AC8D1738D9384334`**.

실제 Firebase/project/config/network/CORS/운영 object, 실제 모바일·운영 폰트 시각 정확도,
room/gallery/clock/non-neutral transform, 편집·인쇄·주문·발행·write/delete/deploy/cutover는
NOT TESTED/NOT IMPLEMENTED 또는 금지다. 다음 단위는 자동 시작하지 않는다.

## ★ 스펙 060 종료

정본: `docs/rebuild/specs/060-space-post-auth-frame-view-investigation.md`

Founder **DD-1=A~DD-5=A**에 따라 ready-only scene seam, injectable view, source-bound owner,
content-box width, conditional exact-font gate와 합성 browser fixture를 구현했다. current plan success에서만
Canvas가 mount된다.

자체 검수에서 StrictMode initializer 이중 호출 owner 누수를 발견해 inert initializer와 effect-owned controller로
보완했다. development React Chromium fixture가 실제 setup→cleanup→setup과 추가 unmount/remount를 검증한다.

`pnpm check` PASS(unit 1608/1608), Chromium 145/145 PASS. production `App.tsx` 연결, 실제 Firebase/network/
CORS/운영 object, 실제 다양한 폰트·viewport 시각 검증, 편집·인쇄·주문·발행·write/delete/deploy는
NOT TESTED/NOT IMPLEMENTED 또는 금지다.

다음 단위를 자동 시작하지 않는다. Founder의 다음 수동 작업을 기다린다.

## ★ 스펙 059 종료

Founder CC-1=A~CC-5=A에 따라 pure frame asset request projector와 unit만 구현했다. detached catalog
snapshot에서 exact reference, proof trust, art placement/projection/public-image trust를 모두 통과한 뒤에만
proof/art source를 함께 반환한다. 실패는 source 없는 safe code이며 IO는 0이다.

targeted 11/11, 전체 check unit 1602/1602, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 public catalog/
proof/art network, React, ResizeObserver, fonts, Image decode, Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 단위를 자동 시작하지 않는다.

## 이전 — 스펙 059 조사와 Founder 결정

정본: `docs/rebuild/specs/059-space-post-auth-view-composition-investigation.md`

space route는 password 성공 뒤에도 public catalog를 load하지 않는다. readiness adapter에 전달할 proof/art
source를 exact reference/placement/trust로 한 번에 결정하는 pure projector도 없다.

- CC-1=A 권장: catalog는 post-auth child mount 뒤만
- CC-2=A 권장: pure asset-request projector, whole success 뒤 load
- CC-3=A 권장: measured content box + 기존 width helper
- CC-4=A 권장: nonempty text exact font gate + plan-ready Canvas만
- CC-5=A 권장: 첫 구현은 projector + unit만

Founder는 CC-1=A~CC-5=A를 승인했다.

## ★ 스펙 058 종료

Founder BB-1=A~BB-5=A에 따라 proof/art owner를 독점 소유하는 framework-free adapter를 구현했다.
exact source, current ready, owner-specific synthetic ref, positive intrinsic size, live binding을 모두 요구한다.
replacement/clear source-first 무효화와 same-ref late result 방어, composite bindings를 검증했다.

targeted 8/8, 전체 check unit 1591/1591, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Image/network/
CORS/React/post-auth catalog/layout/font/Canvas/UI/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 React hook보다 먼저 post-auth view composition의 catalog load·layout/font·Canvas 연결 경계를
조사하는 단위다. 자동 시작하지 않는다.

## 이전 — 스펙 058 조사와 Founder 결정

정본: `docs/rebuild/specs/058-space-source-bound-readiness-investigation.md`

기존 proof/art owner는 source를 public state에 노출하지 않아 stale source 여부를 단독으로 증명하지 못한다.
adapter가 raw owner를 독점 소유하고 exact source + ready snapshot + binding 존재를 함께 확인해야 한다.

- BB-1=A 권장: framework-free adapter + unit
- BB-2=A 권장: raw owner 독점 소유
- BB-3=A 권장: exact source + ready + binding 모두 요구
- BB-4=A 권장: source-first lifecycle + combined subscribe/composite bindings
- BB-5=A 권장: 기존 owner/hook/App/UI/E2E 변경 0

BB-1~BB-5는 모두 A로 승인되어 local adapter 구현이 완료됐다.

## ★ 스펙 057 종료

Founder AA-1=A~AA-6=A에 따라 pure view-only frame plan composer를 구현했다. exact proof URL trust와
source-bound readiness, neutral transform, geometry/template art, clock/layout/text 조건을 순서대로 검증하고
모든 실패를 부분 plan 없이 닫는다. 성공도 `replayComplete:false`다.

targeted 18/18, 전체 check unit 1583/1583, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 owner
adapter/Firebase/network/Image/font/Canvas/React/UI/clock/room/gallery/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 source-bound readiness를 실제 proof/template-art owner lifecycle에 연결하기 전 adapter/hook
composition 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 057 조사와 Founder 결정

정본: `docs/rebuild/specs/057-space-view-only-frame-plan-investigation.md`

scene refs, neutral proof transform, proof owner, geometry와 product plan은 준비돼 있다. logical width와
nonempty text measure는 주입해야 하고, template art는 none 또는 externally ready stretch만 안전하다.
clock는 frame plan 밖이므로 첫 합성은 `clockOn === false`만 허용한다. 성공도 room/gallery 미지원 때문에
`replayComplete:false`다.

- AA-1=A 권장: pure composer + unit만
- AA-2=A 권장: trust 순서 고정 + whole-plan fail-closed
- AA-3=A 권장: logical width/measure port 주입, default 추측 0
- AA-4=A 권장: clock false만, complete 주장 0
- AA-5=A 권장: art none 또는 externally ready stretch만

AA-1~AA-6은 모두 A로 승인되어 local pure composer 구현이 완료됐다.

## ★ 스펙 056 종료

Founder V-1=A~V-5=A에 따라 proof 전용 framework-free image owner를 구현했다. owner가 스펙 055 trust를
재검증하고 CORS-before-src, one-active generation, safe intrinsic/binding과 late-result 차단을 소유한다.

targeted 13/13, 전체 check unit 1565/1565, Chromium 143/143 PASS. 고객 entry/hash 동일. 실제 Firebase/
network/Image decode/CORS, React hook, plan/UI/renderer/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2-C view-only frame plan composition 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 056 조사와 Founder 결정

정본: `docs/rebuild/specs/056-space-proof-image-owner-investigation.md`

plan은 URL이 아닌 decoded drawable의 synthetic binding과 intrinsic size를 요구한다. 기존 template-art owner
패턴은 참고 가능하지만 proof trust 재검증/전용 상태가 없어 dedicated owner가 필요하다.

- V-1=A 권장: proof 전용 framework-free controller
- V-2=A 권장: owner 내부에서 spec055 resolver 재검증
- V-3=A 권장: anonymous CORS before src, assignment 1회, retry/cache/fallback 0
- V-4=A 권장: one-active generation, late result 차단, safe intrinsic/binding
- V-5=A 권장: controller + fake unit만; hook/App/network/plan 0

V-1~V-5는 모두 A로 승인되어 dedicated local owner 구현이 완료됐다.

## 이전 — 스펙 055 종료

Founder T-1=A~T-5=A에 따라 exact Firebase proof REST URL과 exact-neutral transform eligibility를
pure local 경계로 구현했다. URL은 성공 결과에만 남고 non-neutral transform은 변환하지 않는다.

targeted 38/38, 전체 check unit 1552/1552, Chromium 143/143 PASS. 고객 entry/hash 동일.
실제 Firebase/network/object/image/CORS/owner/plan/UI/renderer/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2-B remote proof image owner 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 055 조사와 Founder 결정

정본: `docs/rebuild/specs/055-space-proof-image-view-plan-investigation.md`

기존 image trust는 `proofs/` 전용이 아니며 plan은 URL이 아니라 loaded drawable의 synthetic ref와
intrinsic size를 요구한다. neutral 외 legacy transform 변환은 UNCONFIRMED다.

- T-1=A 권장: exact bucket + once-decoded `proofs/` prefix
- T-2=A 권장: exact-one `alt=media`, optional single token, unknown/duplicate query·fragment 거부
- T-3=A 권장: exact neutral transform만 identity 지원
- T-4=A 권장: 다음은 V2-A pure resolver/eligibility + unit만
- T-5=A 권장: future renderer는 editable PreviewComposer와 분리

T-1~T-5는 모두 A로 승인되어 V2-A local-only 구현이 완료됐다.

## 이전 — 스펙 054 종료

Founder S-1=A/S-2=A/S-3=A/S-4=A/S-5=A에 따라 exact catalog reference와 단일 solid color,
HTTPS photo 후보만 검증하는 pure validator를 구현했다. transform은 validated-but-unapplied, room/gallery는
unsupported, `replayComplete:false`다.

targeted 19/19, 전체 check unit 1514/1514, Chromium 143/143 PASS. 고객 entry/hash는 스펙 053과 동일하다.
실제 Firebase/network/image fetch/proof prefix trust/UI/renderer/room/deploy는 NOT TESTED/NOT IMPLEMENTED다.

다음 후보는 V2 proof URL trust + view-only frame plan 경계 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 054 조사와 Founder 결정

정본: `docs/rebuild/specs/054-space-scene-application-boundary-investigation.md`

legacy imgT x/y는 Canvas px이고 현재 transform은 normalized 비율이다. capture 당시 크기가 payload에 없어
정확 변환은 UNCONFIRMED다. scene은 frame-only이며 catalog 참조 검증과 room/gallery renderer도 없다.

- S-1=A 권장: 다음은 V1 순수 catalog 참조 검증기만
- S-2=A 권장: frame-only, tpl/size/color/photo 필수 exact 참조, fallback 0
- S-3=A 권장: exact color ID/fill을 canonical solid로만, grain/모호성 거부
- S-4=A 권장: transform validated-but-unapplied, clamp/복사 0
- S-5=A 권장: room/gallery unsupported, 재현 완료로 간주하지 않음

S-1~S-5는 모두 A로 승인되어 V1 local-only 구현이 완료됐다.

## 이전 — 스펙 053 종료

R-1=A/R-2=A/R-3=A/R-4=A에 따라 space 독점 mode, complete env config, explicit-submit lazy
Firebase facade, password gate와 StrictMode lifecycle을 구현했다. no-space만 기존 browse를 mount하며
invalid/disabled config의 Firebase init/request는 0이다.

targeted 32/32, unit 1495/1495, Chromium 143/143 PASS. 고객 entry는 `index-Det4NToI.js`,
304,634 bytes, SHA-256 `A336B17BDB3F6166AF218248793CA579A5374A3D32AA844076C61AADFF78EDAB`다.

실제 Firebase/project/config/token/document/network/deploy와 scene/image/room 적용은 NOT TESTED다.
다음 후보는 R-4에 따른 catalog 참조 검증 + view-only scene application 경계 조사다. 다음 작업은 자동
시작하지 않는다.

## 이전 — 스펙 053 조사와 Founder 결정

정본: `docs/rebuild/specs/053-space-production-composition-investigation.md`

현재 App은 space query 분기 없이 catalog를 즉시 load한다. controller/read/open은 준비됐지만 React UI,
env config, lazy production factory, scene application port는 없다. decrypt scene의 ID/URL/opaque room 설정도
현재 catalog/CORS/renderer와 대조되지 않았다.

- R-1=A 권장: space query가 있으면 gate 독점, invalid fail-closed, catalog/Firebase factory 0
- R-2=A 권장: exact-true + complete 5-key config, 명시 submit에서 named app lazy init
- R-3=A 권장: 첫 구현은 password gate/safe errors/ready snapshot까지만
- R-4=A 권장: scene 적용은 후속 catalog 참조 검증 + view-only port 계약

R-1~R-4는 모두 A로 승인되어 local gated 구현이 완료됐다.

## 이전 — 스펙 052 종료

순수 `?space=` parser와 injected Firestore reader + spaces open port controller를 구현했다. 비밀번호 오류
재시도는 암호문을 메모리에서 재사용하며 network retry만 재조회한다. duplicate submit, detach/late result,
safe error를 검증했다. targeted 17/17, unit 1479/1479, Chromium 141/141, 고객 hash 동일이다.

`pnpm check` wrapper는 PATH pnpm 11.19의 dependency-status install 시도로 실행되지 않아 같은 정본
entrypoint인 `node scripts/check.mjs`로 전체 게이트를 통과했다. 신규 다운로드·build 승인·workspace 설정
변경은 0이다. 실제 Firebase/project/token/document/network/route UI/scene application/deploy는 NOT TESTED다.
다음 후보는 production 연결 전 password UI composition, Firebase config/factory, scene 적용 경계 조사다.
다음 작업은 자동 시작하지 않는다.

## 이전 — 스펙 051 종료

Q-1=A/Q-2=A/Q-3=A에 따라 `@denn/firebase/space-read` local adapter를 구현했다. targeted 30/30,
unit 1462/1462, Chromium 141/141, 고객 hash 동일이다.

실제 Firebase/project/token/document/network/route/UI는 NOT TESTED다. 다음 local-only 후보는 `?space=`
query parsing과 injected Firebase reader + spaces open port를 합성하는 controller 계약 조사다.

## 이전 — 스펙 051 조사 당시 Founder 결정

정본: `docs/rebuild/specs/051-space-firestore-read-adapter-investigation.md`

실제 Firebase/network 없이 Rules, legacy, SDK 12.17.1과 공식 문서를 조사했다. 권장값은 모두 A다.

- Q-1=A: Firestore 공식 document ID 제약의 single segment token 허용
- Q-2=A: `getDoc` + 기본 memory cache, persistent cache 0
- Q-3=A: named `denn-space-viewer`, config mismatch fail-closed, Auth 0, local unit 범위

위 세 결정은 모두 A로 승인되어 local adapter 구현과 검증이 완료됐다.

## 이전 — 스펙 050 종료

document 검증 → password 검증 → decrypt → scene 검증 순서의 local-only 순수 open port를 구현했다.
targeted 54/54, unit 1432/1432, Chromium 141/141, 고객 hash 동일이다.

실제 Firebase/Firestore/token/link/network/route/UI는 NOT TESTED다. 다음 후보는 Firestore read adapter
계약 조사이며 실제 network나 운영 데이터 접근 전 별도 승인이 필요하다.

## 이전 — 스펙 049 종료

`@denn/spaces`에 `space-v1` document와 `space-scene-v1` plaintext의 순수 reader를 구현했다.
targeted 44/44, unit 1422/1422, Chromium 141/141, 고객 hash 동일이다.

실제 Firestore/token/link/network/scene UI는 NOT TESTED다. 다음 local-only 후보는 crypto와 두 reader를
합성하는 순수 read pipeline이다. Firebase adapter·route/UI는 별도 결정 전 시작하지 않는다.

## 이전 — 스펙 048 종료

운영 전환은 Founder 지시로 보류했다. `@denn/spaces`의 legacy crypto envelope를 pure Web Crypto로
구현했고 fixed vector/hostile input을 검증했다. targeted 20/20, unit 1396/1396, Chromium 141/141,
고객 hash 동일이다.

실제 Firestore/기존 `?space=` 링크/scene 적용은 NOT TESTED다. 다음 local-only 후보는 `space-v1`
document shape와 `space-scene-v1` read validation/projection 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 047 종료 · 운영 선행조건 결정 대기

Founder L-1 canary 한정값/L-2=A/L-3=A에 따라 synthetic transitional Rules와 local manifest gate를
구현했다. manifest 12/12, emulator 4/4, unit 1378/1378, Chromium 141/141 PASS다.

다음 운영 단계에는 두 입력이 필요하다.

- 일반 운영 객체 수·총 byte·저장 빈도 상한, 확인 주기와 책임자
- 실제 승인 운영자 UID 정본

운영 전환은 보류됐다. 실제 Firebase/network/deploy/write/legacy close는 계속 금지다.

## 이전 — 스펙 046 단계적 cutover 계약 · Founder 결정 대기

Founder K-1=A/K-3=A가 승인됐고 K-2=A는 스펙 045에서 완료됐다. 스펙 046은 Firestore transitional →
Storage transitional → write-disabled app → 제한 canary → legacy close 순서와 actual-write 전/후 rollback을
문서화했다. 실제 UID·비용 상한·관찰 주체가 없어 운영 전환은 계속 차단된다.

남은 결정(권장 모두 A):

- L-1=A: canary 전 객체 수·총 byte·저장 횟수 상한과 일일 확인 담당자를 명시
- L-2=A: 승인 UID 한 명·새 `/admin/` 한 탭만 사용하고 dual-window legacy 저장은 절차로 중지
- L-3=A: 저장 1건과 head/object/REC·재로그인·새 탭 확인 후 별도 승인으로 legacy close

L-1~L-3은 모두 승인되어 스펙 047 local-only gate가 완료됐다.

## 이전 — 스펙 045 종료 · 스펙 044 Founder 결정 대기

정본: `docs/rebuild/specs/044-admin-write-cutover-readiness-investigation.md`

운영 write는 NOT READY다. 실제 UID 정본, G-4 비용 상한, deploy-safe Hosting/admin route와 단계적
cutover/rollback 계약이 없다.

권장값:

- K-1=A: 비용/용량 상한·관찰 주체 결정 전 운영 쓰기 차단 유지
- K-2=A: 다음은 local-only deploy-safe Hosting/admin route 패키징 스펙 045
- K-3=A: 향후 transitional Rules→app→legacy close 방향

K-2=A 로컬 패키징은 완료됐다. targeted 18/18, unit 1366/1366, Chromium 141/141, 고객 hash 동일,
포트/temp 잔류 0이다. 실제 Firebase/UID/Rules/Hosting deploy/write 활성화는 수행하지 않았다.

K-1=A/K-3=A로 승인되어 스펙 046 계약으로 전이했다.

## ★ 스펙 043 종료 — gated admin write composition

Founder Y-2=A/Y-3=A/Y-4=A/Y-5=A에 따라 단일 composition/auth 권위, production auth-only mode,
별도 exact-true write gate, 명시 load lazy write holder를 구현했다. 기본 production build에서는
write controller/editor가 0이며 운영 write flag는 설정하지 않았다.

targeted 52/52, `pnpm check` PASS(unit 1363/1363), Chromium 139/139, 고객 JS hash 동일.
실제 Firebase/emulator/UID/IAM/Rules 배포/운영 쓰기·발행·delete는 NOT TESTED/금지다.
다음 수동 지시를 기다린다.

## ★ 스펙 043 조사 당시 Founder 결정 대기 (완료 이력)

정본: `docs/rebuild/specs/043-admin-ui-composition-preconnection-contract.md`

Y-1=A 문서 조사 결과, 권장값은 **Y-2=A/Y-3=A/Y-4=A/Y-5=A**다.

- Y-2: 단일 app composition root + `OperatorAuthPort` 한 권위
- Y-3: production에서는 auth-only read card, C5 baseline load 하나만 표시
- Y-4: read enable과 분리된 exact-true write enable gate
- Y-5: 첫 명시 load에서 rejection-safe lazy write facade/port 생성

위 결정은 모두 A로 승인되어 로컬 gated 구현이 완료됐다. 실제 Firebase·UID·Rules 배포·운영 쓰기·
발행·delete 금지는 유지된다.

## ★ 스펙 042 종료 — 합성 로컬 브라우저 fixture

Founder X-1=A/X-2=A/X-3=A에 따라 실제 session controller/editor를 합성 auth/write fake에 연결한
별도 Chromium fixture를 구현했다. production `App.tsx`·composition·Firebase adapter/network는 0이다.

`pnpm check` PASS(unit 1356/1356), Chromium 139/139(신규 5), 고객 JS hash 동일.
실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/UI 연결/delete/발행은 NOT TESTED/금지다.
다음 수동 지시를 기다린다.

## ★ 스펙 041 종료 — W-1 F-D provenance

Founder W-1=A에 따라 baseline provenance, same-port exact load precondition, legacy field 불변 검사,
read-time 승격 canonical payload 제거를 구현했다. legacy field 포함 size는 읽기 전용이다.

targeted 74/74, `pnpm check` PASS(unit 1356/1356), Chromium 134/134, 고객 JS hash 동일.
`App.tsx` 연결·실제 Firebase/emulator/운영 쓰기·Rules/config/deploy는 0이며 계속 금지다.
다음 수동 지시를 기다린다.

**Founder 결정은 `D-1=A`, `D-2=O-3`, `D-3=N`이다. Structure A 식별 구조의 로컬 구현과
검증과 Codex 독립 검수가 끝났다(`CODEX_PASSED`, 발견 결함 0). 다음 작업은 자동으로 시작하지 않는다.**

## ★ 스펙 040 종료

정본: `docs/rebuild/specs/040-admin-write-local-ui-connection-contract.md`

- Founder 승인: **U-1=A, U-2=A, U-3=A**.
- 구현 파일: `apps/admin/src/admin-write/session-controller.ts` + unit.
- UI/App wiring/write adapter 생성 0.
- Codex 보완: 동일 auth 재통지 no-op, hostile input fail-closed.
- 최종 게이트: targeted 11/11, unit 1333/1333, Chromium 134/134, 고객 hash 동일.

판정 `CODEX_PASSED`. 다음 수동 지시를 기다린다. 실제 Firebase·UID·IAM·배포·운영 쓰기·
UI 저장·delete·발행은 금지다.

> 아래 `## 0`부터는 완료된 스펙 039 및 그 이전 역사 기록이다. 현재 작업 지시로 사용하지 않는다.

## 0. 이번 후보

- REC을 upload 전에 별도 Firestore commit으로 create한다.
- REC ID = Storage objectId = `UUID.json`; head는 `objectPath` 대신 `recId`를 저장한다.
- Storage create와 head create/update Rules가 동일 REC을 확인한다.
- 실제/합성 Rules 모두 REC update/delete, Storage update/delete, head delete를 거부한다.
- 삭제 API·delete 권한·자동 정리·보존 주기는 없다.
- 검증: targeted unit 51/51, `pnpm check` unit 1322/1322, E2E 134/134,
  demo emulator 13/13 PASS.

- 실제 Firebase·UID·IAM·배포·UI·delete·자동 정리는 NOT TESTED/금지 유지.
- 구현·종료 커밋 `7843e85` fast-forward push 완료. 다음 수동 지시를 기다린다.

> 아래 `## 1`부터는 2026-08-11 Founder 결정 전의 역사 기록이다. 현재 작업 지시로 사용하지 않는다.

> **⚠️ G-4 문서 6개는 지시에 따라 `commit`·`push`·`stage`하지 않았다.**
> 워킹 트리에 미커밋으로 남아 있으며, 커밋 여부는 **별도 지시**를 따른다.

## 1. Codex 최종 판정

- **G-4 보완 라운드 2 문서 검수 통과** — **`getAfter()` 원자성 정정 · transaction 시간 제한 정정 ·
  REC ID 매핑 정정**이 모두 반영됐다.
- **구조 A와 B는 모두 "가능한 후보"로만 기록됐고 어느 것도 채택되지 않았다.**
- **구조 A/B 및 REC·Rules 동작은 NOT TESTED다.**
- **실제 삭제 · 자동 정리 · Rules 변경 · head 스키마 변경 · 클라이언트 delete 권한 ·
  IAM 활성화 · 구현·배포 승인이 아니다.**
- **현재 기본 정책은 계속 `O-3 삭제 보류`다.**
- **다음 단계는 Founder의 D-1~D-3 결정이며 오늘은 결정하지 않는다.**

## 2. 남은 Founder 결정 — **선택지 그대로 보존** (아직 아무것도 고르지 않았다)

| # | 질문 | 선택지 |
| --- | --- | --- |
| **D-1** | **완료 판정 방식과 구조** | **SDC′ + 구조 A**(실패 산물까지 회수 · Storage create stray 차단 가능 · 계약 변경 큼) / **SDC′ + 구조 B**(원자성 서버 강제 · 계약 변경 작음 · **실패 산물 회수 불가**) / **시간 창**(= 안전 증명이 아니라 리스크 수용) / 혼합 |
| **D-2** | **정리 주체** | **없음(O-3 보류)** / 운영자 수동(O-1) / backend(O-2 = **G-3 재개**) / **Storage Rules 서버 강제(O-4)** |
| **D-3** | **보존 개수·주기** | 직전 **K개** 보존 · 정리 주기 · 비용 상한 |

> **D-1 = SDC′ + D-2 = 없음** 조합도 유효하다 — 삭제는 일어나지 않지만 구조는 준비된다.
> 정본: `docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`

## 3. 재개할 때 참고 (아무것도 승인되지 않았다)

- **D-1·D-2가 정해지면** 그때 최소 파일 범위가 열린다(정본 §14).
  SDC′ 채택 시 **head 스키마 `objectPath` → `recId`** 변경이 따라오며 이는 **스펙 037 계약 변경**이다.
- 그 밖의 후보: **cutover 스펙**(실제 UID → Rules 배포 순서 → 운영 쓰기 개방) ·
  **admin UI 연결**(저장 버튼 + 스펙 035 결합) · **L-4/tombstone** · **발행**(F-B) · **C6 재검토**(G-3).

## 4. 계속 금지

제품 코드 · `firestore.rules` · `storage.rules` · config · test · `package.json` · lockfile ·
`pnpm-workspace.yaml` · `firebase.json` · `.firebaserc` · 루트 배럴 · `admin-read/**` 수정 ·
**실제 Firebase/project/bucket/운영 데이터 · 실제 UID 접근** · **실제 객체 조회·나열·삭제** ·
**emulator 실행** · **Rules·Hosting 배포** · **운영 쓰기** · **UI 연결** · **발행** ·
**orphan 삭제·자동 정리** · **클라이언트 delete 권한** · **IAM 활성화** ·
**head 스키마 변경** · **C6/L-4 구현** · 신규 의존성 ·
force push · merge · rebase · `reset --hard` · broad delete ·
**다음 스펙·구현 계약 임의 착수** · **자동화나 반복 작업 생성**.

## 5. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 6. UNCONFIRMED / NOT TESTED (검수 통과로 바뀌지 않는다)

**구조 A·B 및 REC + `firestore.get()`/`getAfter()` 규칙의 실제 동작**(**NOT TESTED** — emulator 미실행) ·
**Rules의 문자열 연결(`+`)·분해(`split` 등) 지원 여부**(**UNCONFIRMED** — 설계에 쓰지 않았다) ·
**`save()` 호출 전체의 벽시계 상한**(**UNCONFIRMED**; **개별 transaction 제한은 확정** —
lock 20초 · 최대 270초 · idle 60초 · 유한 재시도) ·
실제 `admin/state.json` 크기·내용(**NOT TESTED**) · 리빌드 payload 크기(**UNCONFIRMED**) ·
**저장 빈도 미결정**(⚠️ 레거시 **3초 디바운스**; 저장마다 **객체 1개 + REC 1개**가 생기고
Storage Rules의 `firestore.get()`도 **Firestore quota/billing에 포함**된다) ·
bucket 객체 수·용량·location·class·lifecycle(**NOT TESTED/UNCONFIRMED**) ·
GCS·Firestore 요금(**UNCONFIRMED**) · Storage prefix 나열 허용 여부(**UNCONFIRMED**) ·
`docs/reference/security/storage` 및 `docs/reference/rules/rules.firestore` 본문(**이 세션 미취득**) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).
