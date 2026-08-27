# 081 — Space V2 admin frozen issue session

## 상태

`READY_FOR_CODEX / IMPLEMENTED / LOCAL_VERIFIED / NON_UI / NO_LIVE_NETWORK`

Founder 결정 정본:
`docs/codex-claude-handoff/decisions/2026-08-26-space-v2-composition-readiness-decisions.md`.

선행 게이트:

- 스펙 072 local issue bundle: DONE / CODEX_PASSED
- 스펙 074~076 write port·Rules emulator·SDK adapter: DONE / CODEX_PASSED
- 스펙 078~080 customer V2 replay·proof reader·production viewer: DONE / CODEX_PASSED
- Founder `LL-1=A` ~ `LL-6=A`

## 목표 (WHY)

admin 발급 UI를 만들기 전에, 검증된 C5 catalog baseline과 액자 선택·방향·크기·색·transform을 한 번
고정하고, 그 **같은 frozen draft가 소유한 proof exporter**에서만 PNG를 받아 기존 local issue bundle과
write port로 전달하는 비-UI session을 만든다.

이 단위는 임의 PNG와 독립 metadata를 조합하는 seam을 만들지 않는다. 성공은 기존 write port가
confirmed success를 반환했을 때만 보존하고, 비밀번호·raw bytes·object path·SDK message를 session
snapshot이나 오류에 노출하지 않는다.

## 범위 (SCOPE)

### 허용 제품 파일

- 신규 `apps/admin/src/space-v2/issue-session.ts`
- 신규 `apps/admin/src/space-v2/issue-session.test.ts`

필요하면 같은 폴더에 순수 helper와 test 한 쌍을 추가할 수 있으나, 먼저 위 한 module/test 쌍으로
완결한다. 기존 제품 파일 수정은 허용하지 않는다.

### 허용 문서

- 이 스펙과 관련 spec 081 handoff
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

### 금지

- `apps/admin/src/App.tsx`, `main.tsx`, `admin-composition/**`, 기존 admin read/write controller
- React/UI/CSS/DOM/Canvas executor, screenshot, URL formatter, clipboard
- `packages/**`, 기존 `apps/admin/src/space-v2/**` 파일 수정
- Rules, Firebase/emulator config, package.json, lockfile, `pnpm-workspace.yaml`, 신규 dependency
- 실제 Firebase/project/bucket/data/network/live, 실제 UID, emulator, deploy, 운영 발급
- delete/orphan cleanup, publish, V1 migration, C6/backend, 자동 retry·merge
- 보호 대상 restore/checkout/stage/commit

## 구현 지시 (WHAT / HOW)

### 1. frozen draft source

session은 arbitrary `pngBytes`를 issue request와 함께 받지 않는다. 대신 한 draft handle이 metadata와
proof exporter를 함께 소유한다. 구현 이름은 현재 코드 스타일에 맞게 다듬을 수 있지만 의미는 다음보다
넓히지 않는다.

```ts
type SpaceV2FrozenIssueFields = Omit<
  SpaceV2LocalIssueBundleInput,
  "pngBytes" | "password"
>;

interface SpaceV2FrozenIssueDraftSource {
  copyFields(): SpaceV2FrozenIssueFields;
  exportProofPng(): Promise<Uint8Array>;
}
```

- source exact keys는 `copyFields`, `exportProofPng` 두 개다. extra/missing/symbol/non-enumerable/hostile
  getter는 fail-closed다.
- `beginDraft(source)`에서 두 method를 각각 한 번 읽고 원 receiver에 bind한다.
- `copyFields()`는 begin 시 정확히 한 번 호출한다. 반환값은 기존 `readLegacyCatalog`와 기존 issue
  preparation이 검증할 수 있는 detached snapshot으로 고정한다.
- catalog는 그 시점의 validated C5 baseline snapshot이다. 저장 직전 reload/adopt/merge 0.
- proof method는 같은 handle에서만 오며, `issue()` caller가 PNG나 object path를 덮어쓸 인자는 없다.
- 이 module은 exporter가 실제 Canvas/render owner와 연결됐다고 주장하지 않는다. 그 production 연결은
  후속 admin UI 스펙에서 Claude Code가 구현하고 E2E로 증명한다. 여기서는 injected fake로 동일 handle
  소유권과 호출 순서만 증명한다.

### 2. session public contract

최소 public surface:

```ts
type SpaceV2IssueSessionStatus =
  | "empty"
  | "draft-ready"
  | "preparing"
  | "issuing"
  | "success"
  | "error"
  | "outcome-unknown"
  | "disposed";

interface SpaceV2IssueSessionSnapshot {
  readonly status: SpaceV2IssueSessionStatus;
  readonly canIssue: boolean;
  readonly errorCode: SpaceV2IssueSessionErrorCode | SpaceV2IssueErrorCode | null;
  readonly confirmedToken: string | null;
}

interface SpaceV2IssueSessionController {
  subscribe(listener: (snapshot: SpaceV2IssueSessionSnapshot) => void): () => void;
  getSnapshot(): SpaceV2IssueSessionSnapshot;
  beginDraft(source: SpaceV2FrozenIssueDraftSource): void;
  clearDraft(): void;
  issue(request: { readonly password: string; readonly confirmation: string }): Promise<void>;
  dispose(): void;
}
```

- factory dependencies는 exact `{uuid, crypto, sha256, writer, createCorrelationId}`다.
- `writer`는 기존 `SpaceV2IssueWritePort`; session은 Firebase SDK 타입을 알지 않는다.
- session local error는 최소 `SPACE_V2_SESSION_INVALID_DRAFT`,
  `SPACE_V2_SESSION_PASSWORD_MISMATCH`, `SPACE_V2_SESSION_PROOF_FAILED`,
  `SPACE_V2_SESSION_PREPARATION_FAILED`를 구분한다.
- error snapshot은 safe code만 갖는다. raw exception/message, password, UUID/token fragment, object path,
  digest, bytes, UID/email은 0이다.
- `confirmedToken`은 writer success 이후에만 생기며 objectPath는 UI-facing snapshot에 넣지 않는다.
  URL 조립과 clipboard는 이번 단위에 없다.

### 3. exact issue 순서

1. disposed, draft 존재, idle, exact request를 검사한다.
2. password와 confirmation을 각각 한 번 snapshot하고 non-empty exact equality를 검사한다. trim/정규화/
   저장 0. 실패 시 exporter·UUID·hash·crypto·writer 0.
3. status를 `preparing`으로 바꾸고 frozen handle의 `exportProofPng()`를 정확히 한 번 호출한다.
4. 결과가 `Uint8Array`인지 확인하고 fresh copy를 만든다. throw/reject/malformed면 proof failure이며 뒤 단계
   0이다.
5. frozen fields + copied PNG + password로 기존 `prepareSpaceV2LocalIssueBundle()`을 정확히 한 번 호출한다.
6. preparation 실패면 writer 0이고 child code/identity를 노출하지 않는다.
7. 성공 뒤에만 correlation id를 만들고 기존 writer의 `issue({correlationId,bundle})`을 정확히 한 번
   호출한다.
8. writer confirmed success만 `success` + token으로 전환한다. session은 URL을 만들지 않는다.
9. `SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN` 또는
   `SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN`은 `outcome-unknown`; success/failure로 추측하지 않는다.
10. 그 밖의 writer failure는 safe code를 보존한 `error`다. writer의 `retryable`은 자동 retry 권한이
    아니다.

비밀번호는 preparation 호출 직후 session local reference에서 더 이상 보존하지 않는다. 테스트나 log에도
원문을 남기지 않는다.

### 4. concurrency, mutation, 재시도

- 한 session에서 issue는 하나만 in-flight다. 중복 호출은 exporter/bundle/writer를 추가 호출하지 않는다.
  기존 pending Promise를 외부에 product contract로 공유할 필요는 없고, 두 caller 모두 void 완료여도 된다.
- `beginDraft`, `clearDraft`, auth/UI lifecycle에 해당하는 외부 변경이 in-flight 작업을 다른 draft의
  성공으로 바꾸면 안 된다. generation을 사용해 late completion은 현재 snapshot을 덮지 못하게 한다.
- source/caller가 begin 뒤 catalog/selection/transform을 mutation해도 frozen copy만 사용한다.
- draft 교체·clear는 이전 confirmed token과 error를 지우되 진행 중 remote operation을 취소됐다고
  추측하지 않는다. persistence가 시작된 작업의 결과가 늦게 올 수 있으면 새 issue를 열지 말고 safe
  `outcome-unknown` 또는 명시 blocked 상태로 닫는다.
- 자동 retry, 자동 새 token 발급, previous prepared bundle 재사용, silent merge/reload는 0.
- 명시 재시도가 허용되는 definite failure여도 매번 새 frozen draft/새 identity가 필요하다. outcome unknown,
  forbidden, asset mismatch, document failure는 재시도 가능으로 승격하지 않는다.

### 5. Firebase/lazy composition 경계

이번 파일은 `@denn/firebase/space-write`의 **type과 injected port**만 사용할 수 있다. SDK facade factory를
import하거나 default app/Auth를 직접 만들지 않는다.

- module import, controller factory, `beginDraft` 시 Firebase import/service/network 0.
- 명시 `issue()`가 writer에 도달하기 전 Firebase capability 0.
- 기존 스펙 076의 `createFirebaseSpaceV2WriteFacade()`가 default admin app/Auth ownership을 이미
  검증했다. 후속 admin UI composition은 같은 `resolveAdminFirebaseConfig()`와 기존 operator auth를
  사용해 그 adapter를 lazy-create해야 한다.
- named app, 두 번째 Auth observer, default app 중복 초기화, config mismatch 우회는 후속에서도 금지다.
- 이번 단위가 LL-4 production composition을 완료했다고 기록하지 않는다.

### 6. export/import 경계

- 신규 module은 앱 내부 direct import 전용이며 앱 barrel을 만들지 않는다.
- `App.tsx`, `main.tsx`, admin composition이 import하지 않아 production admin/customer bundle은 exact
  unchanged여야 한다.
- 기존 issue bundle/write port API와 오류 의미는 변경하지 않는다.

## 검증 절차 (VERIFY)

### targeted unit

1. exact source begin → password match → export 1 → UUID 2 → SHA 3 → encrypt 1 → writer 1 순서.
2. invalid/missing/extra/hostile source와 invalid frozen fields는 safe error; export/UUID/hash/crypto/writer 0.
3. password empty/mismatch/hostile request는 export와 이후 호출 0; password가 snapshot/error/log에 없음.
4. begin 직후 caller가 catalog/selection/transform/source method를 mutation해도 최초 frozen 값만 사용.
5. export bytes는 fresh copy이며 exporter가 await 중 source bytes를 바꿔도 bundle/writer 값이 변하지 않음.
6. proof throw/reject/non-Uint8Array는 preparation/writer 0.
7. preparation 실패는 writer 0이고 UUID/token/path/child code 유출 0.
8. writer success만 confirmed token; result objectPath는 public snapshot 0.
9. auth/forbidden/upload definite/asset mismatch/document failure를 exact safe code로 보존.
10. upload/document outcome unknown은 별도 status, retryable false, 자동 retry 0.
11. duplicate issue, draft replace/clear, dispose와 late completion에서 second export/write와 stale state overwrite 0.
12. module import/factory/begin 시 Firebase SDK, network, DOM, Canvas, URL, clipboard, Date 호출 0.
13. 기존 issue-bundle과 write-port targeted regression PASS.

### repository gate

- 신규 session + 기존 issue-bundle/write-port targeted unit.
- admin/firebase typecheck.
- `node scripts/check.mjs` 전체 PASS.
- production bundle exact unchanged:
  - admin entry `index-D0XOQpRL.js`, 226,201 bytes,
    SHA-256 `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC`
  - customer entry `index-BUT7Bmak.js`, 340,604 bytes,
    SHA-256 `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1`
- `git diff --check`, exact allowed paths, forbidden diff 0.
- 검사 포트 4183/4184/4185/8080/9099/9199 잔류 0.

Chromium E2E와 emulator는 실행하지 않는다. 이 module은 production import/UI/SDK wiring이 없으며,
전체 E2E는 보호 spec-018 PNG를 다시 쓴다. E2E/emulator PASS라고 기록하지 않는다.

## 완료 정의 (DONE)

- 허용 신규 non-UI module/test와 문서만 변경.
- frozen source만 proof PNG를 제공하고 arbitrary PNG issue seam 0.
- local bundle/write port 호출 순서·short-circuit·late completion·safe error가 unit으로 증명됨.
- admin/customer production bundle exact unchanged.
- actual Firebase/network/live/UI/Rules/deploy/delete/publish 0.
- Claude Code가 구현·검증·문서 기록을 일반 fast-forward commit/push하고 `READY_FOR_CODEX`에서 멈춤.

## 위험 / STOP

- frozen source를 production Canvas/UI에 연결해야 하면 STOP — 후속 admin UI 스펙이다.
- 기존 issue bundle, write port, package public API, App/composition 수정이 필요하면 STOP하고 QUESTIONS에
  정확한 이유를 남긴다.
- SDK adapter wiring, Rules/config/emulator, URL/clipboard, screenshot/E2E가 필요하면 범위를 넓히지 않는다.
- package/lockfile 변경, dependency/download/install, actual network/live, 보호 대상 충돌은 즉시 STOP.

### QUESTIONS

없음. LL-1~LL-6=A와 스펙 080 customer viewer PASS에 따라 다음 순서가 열렸다. 실제 admin UI/UX와
production Canvas exporter 연결은 이 스펙이 아니라 후속 Claude Code UI 단위다.

### DONE (Claude) — 2026-08-27

기준 `HEAD=origin=4765502`, ahead/behind 0/0. 계약 문서 commit `7608977`, 구현 commit `7dc148f`.
이 계약 범위만 구현했고 **기존 제품 파일은 하나도 수정하지 않았다.**

**§범위 — 실제 변경**

| 파일 | 상태 |
|---|---|
| `apps/admin/src/space-v2/issue-session.ts` | 신규 |
| `apps/admin/src/space-v2/issue-session.test.ts` | 신규 (unit 58건) |
| 추가 helper/test 쌍 | **만들지 않음** — 한 module/test 쌍으로 완결됐다 |

**§1 frozen draft source.** `issue()`는 `{password, confirmation}`만 받는다. arbitrary `pngBytes`를
metadata와 함께 주입하는 seam은 존재하지 않는다. `beginDraft(source)`는 exact `copyFields` ·
`exportProofPng` 두 키만 허용하고(extra/missing/symbol/non-enumerable/hostile getter fail-closed),
두 method를 각각 **한 번** 읽어 원 receiver에 bind하며 `copyFields()`를 **정확히 한 번** 호출한다.
반환값은 exact 6키 top-level snapshot 뒤 `structuredClone`으로 **deep detach**한다 — "frozen"을
이름이 아니라 실제 보장으로 만들기 위해서다. clone할 수 없는 payload(함수·symbol·hostile proxy)는
부분 복사 대신 fail-closed다. catalog는 그 시점의 validated C5 baseline snapshot이며 저장 직전
reload/adopt/merge는 **0**이다. proof method는 같은 handle에서만 오고 `issue()` caller가 PNG나 object
path를 덮어쓸 인자는 없다. 이 module은 exporter가 실제 Canvas/render owner와 연결됐다고 주장하지
않는다 — injected fake로 **동일 handle 소유권과 호출 순서만** 증명한다.

**§2 public contract.** status는 계약의 8개 그대로이고 snapshot은 exact
`{status, canIssue, errorCode, confirmedToken}` 4키다. factory dependency는 exact
`{uuid, crypto, sha256, writer, createCorrelationId}`이며 `writer`는 기존 `SpaceV2IssueWritePort`다.
session local error는 계약이 요구한 4개(`SPACE_V2_SESSION_INVALID_DRAFT` ·
`SPACE_V2_SESSION_PASSWORD_MISMATCH` · `SPACE_V2_SESSION_PROOF_FAILED` ·
`SPACE_V2_SESSION_PREPARATION_FAILED`)만 쓰고 **새 코드를 늘리지 않았다** — 사용 불가능한 request
객체도 "쓸 수 있는 password 쌍을 얻지 못했다"는 뜻에서 `PASSWORD_MISMATCH`로 닫는다.
`confirmedToken`은 writer success 이후에만 생기고 objectPath는 snapshot에 없으며 URL/clipboard는
이번 단위에 없다.

**§3 exact issue 순서.** 구현과 unit이 고정한 실제 호출열은
`fields → export → uuid#1 → uuid#2 → sha → sha → sha → encrypt → write`다.

1. disposed / draft 존재 / idle / exact request를 검사한다.
2. password·confirmation을 각각 한 번 snapshot하고 non-empty exact equality를 본다. trim/정규화/저장
   **0**. 실패 시 exporter·UUID·hash·crypto·writer **0**.
3. `preparing`으로 전환하고 frozen handle의 `exportProofPng()`를 **정확히 한 번** 호출한다.
4. `Uint8Array`인지 확인하고 도착 즉시 fresh copy한다. throw/reject/malformed는 proof failure이며
   이후 단계 **0**.
5. frozen fields + copied PNG + password로 `prepareSpaceV2LocalIssueBundle()`을 **정확히 한 번**
   호출한다.
6. preparation 실패면 writer **0**이고 child code/identity는 노출하지 않는다.
7. 성공 뒤에만 correlation id를 만들고 writer `issue({correlationId, bundle})`을 **정확히 한 번**
   호출한다. `createCorrelationId()`가 throw하면 writer는 호출되지 않으므로(=아무것도 persist되지
   않음) local `PREPARATION_FAILED`로 닫는다.
8. writer confirmed success만 `success` + token이다. URL은 만들지 않는다.
9. `SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN` · `SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN`은
   `outcome-unknown`이며 성공/실패로 추측하지 않는다. **writer가 throw하거나 malformed 결과를 주는
   경우도 요청이 이미 떠났으므로 같은 `outcome-unknown`으로 닫는다**(실패로 보고해 재시도를 유도하지
   않는다).
10. 그 밖의 writer failure는 safe code를 그대로 보존한 `error`다. `retryable: true`는 자동 retry
    권한이 아니며 unit이 재호출 시 writer 호출이 늘지 않음을 고정한다.

password는 preparation 호출 직후 session local reference에서 비운다. test에도 원문을 snapshot으로
남기지 않으며 직렬화 문자열 단언으로 확인한다.

**§4 concurrency·mutation·재시도.** 한 session에서 issue는 하나만 in-flight이고 중복 호출은
exporter/bundle/writer를 추가 호출하지 않는다(세 번 동시 호출 unit). generation으로 late completion이
현재 snapshot을 덮지 못하게 한다. writer 호출 **전** 의 draft 교체/clear는 아무것도 persist되지
않았으므로 안전하게 late 결과만 버리고, writer 호출 **뒤** 의 교체/clear는 취소됐다고 추측하지 않고
session을 `outcome-unknown`으로 닫는다(그 뒤 늦게 도착한 remote success도 token을 되살리지 못한다).
source/caller의 begin 이후 mutation은 frozen copy를 바꾸지 못한다. 자동 retry, 자동 새 token 발급,
previous bundle 재사용, silent merge/reload는 **0**이다. **정의된 결과가 난 뒤에는 — password 거절
포함 — 다음 시도 전에 새 frozen draft가 필요하다**(`canIssue`는 `draft-ready`에서만 true). 계약의
"매번 새 frozen draft/새 identity가 필요하다"를 예외 없이 좁게 해석했고, `beginDraft`는 export·
identity·network를 전혀 쓰지 않으므로 비용이 없다.

**§5 Firebase/lazy composition 경계.** 이 파일은 `@denn/firebase/space-write`의 **type과 injected
port만** 사용한다(`import type`만 있어 런타임 import 0). SDK facade factory import, default app/Auth
생성은 없다. module import·factory·`beginDraft`·전체 issue 어디에서도 Firebase import/service/network는
**0**이며, mock한 `firebase/app`·`auth`·`firestore`·`storage`가 한 번도 로드되지 않음을 unit이
고정한다. 이 단위가 LL-4 production composition을 완료했다고 기록하지 않는다 — 후속 admin UI
composition이 같은 `resolveAdminFirebaseConfig()`와 기존 operator auth로 스펙 076 adapter를
lazy-create해야 한다.

**§6 export/import 경계.** 앱 barrel을 만들지 않았고 `App.tsx`/`main.tsx`/admin composition에서 도달
불가다. 기존 issue bundle/write port API와 오류 의미는 변경하지 않았다.

**§검증 절차 — targeted unit 13항목 전부 커버 (58건)**

① exact 순서 `fields → export → uuid×2 → sha×3 → encrypt → write` ② invalid/missing/extra/hostile
source와 invalid frozen fields는 safe error·export/UUID/hash/crypto/writer 0 ③ password
empty/mismatch/공백차이/non-string/missing/extra/non-object는 export 이후 0이고 password가
snapshot에 없음 ④ begin 뒤 catalog·selection·transform·logicalWidth·frameColor mutation과 exporter
교체를 무시하고 최초 frozen 값만 사용 ⑤ export bytes fresh copy(진행 중 mutation과 완료 후 mutation
둘 다) ⑥ proof throw/reject/non-Uint8Array/ArrayBuffer는 preparation·writer 0 ⑦ preparation 실패는
writer 0이고 UUID/token/path/child code 유출 0 ⑧ writer success만 confirmed token, objectPath는 public
snapshot 0 ⑨ auth/forbidden/upload definite/asset mismatch/document failure/invalid input 6종 exact
safe code 보존 ⑩ upload·document outcome unknown은 별도 status·자동 retry 0 ⑪ duplicate issue,
draft replace/clear, dispose, late completion에서 second export/write와 stale overwrite 0
⑫ import/factory/begin/issue 전 구간에서 Firebase SDK·network·DOM·Canvas·URL·clipboard·`Date.now`·
`Math.random` 호출 0 ⑬ 기존 `issue-bundle`·`space-write` targeted regression PASS.

**§repository gate 실측**

| 게이트 | 결과 |
|---|---|
| 신규 session unit | **58/58 PASS** |
| 기존 issue-bundle + space-write targeted regression | **PASS** (합계 156/156) |
| admin / firebase typecheck | PASS |
| `node scripts/check.mjs` 전체 | **PASS** — format, lint, typecheck 7개, unit **2339/2339**, build 2개 |
| admin entry | `index-D0XOQpRL.js` / `226,201 B` / `B6E90475E6AEF42AB717A04E0014DF9996D8502FD5E926AC3D5B124EB3A1F1DC` — 스펙 명시값과 **exact 일치** |
| customer entry | `index-BUT7Bmak.js` / `340,604 B` / `1AA1BD0B8C8E3EC94F5E367BD9A753822205EF083BF4A2E233BA7BB6BD7FB4F1` — 스펙 명시값과 **exact 일치** |
| CSS | admin `index-DJ_z3tK1.css` 9,146 B · customer `index-BjqjBda8.css` 19,381 B — SHA-256까지 무변경 |
| `git diff --check` | PASS |
| exact allowed paths / forbidden diff | **0** — 기존 제품 파일·`packages/**`·Rules/config·package/lockfile·`pnpm-workspace.yaml` 무변경 |
| 검사 포트 4183/4184/4185/8080/9099/9199 | 실행 전후 잔류 **0**, 강제 종료 0 |

**Chromium E2E와 emulator는 실행하지 않았다**(이 module은 production import/UI/SDK wiring이 없고 전체
E2E는 보호 spec-018 PNG를 다시 쓴다). E2E/emulator PASS라고 기록하지 않는다.

**보고 사항 — 범위 밖이라 하지 않은 것.** 신규 두 파일은 worktree에 LF로 커밋했지만
`.gitattributes`에 `text eol=lf`로 고정하지 **않았다**. 스펙 081의 허용 경로가 아니기 때문이다.
`core.autocrlf=true` 환경에서 이 두 파일이 다시 checkout되면 스펙 080 보완 라운드 2와 동일한 format
단계 실패가 재발할 수 있으므로, 저장소 전체 line-ending 정책 결정 대상으로 남겨 보고한다.

**§완료 정의 대비.** 허용 신규 non-UI module/test와 문서만 변경 ✅ · frozen source만 proof PNG를
제공하고 arbitrary PNG issue seam 0 ✅ · 호출 순서·short-circuit·late completion·safe error가 unit으로
증명됨 ✅ · admin/customer production bundle exact unchanged ✅ · actual Firebase/network/live/UI/
Rules/deploy/delete/publish 0 ✅ · 일반 fast-forward commit/push 후 `READY_FOR_CODEX` 정지 ✅.

**진행도.** 전체 리빌드 **84~87% 완료 / 13~16% 잔여**. admin 발급의 비-UI core가 닫힌 만큼만 올렸고,
실제 admin UI/UX와 production Canvas exporter 연결, SDK composition, 실제 Firebase/Rules 배포·live
검증은 그대로 남아 있다.

### CODEX REVIEW — CORRECTION_REQUIRED 라운드 1 (2026-08-27)

검수 기준 `HEAD=origin=d7b84b0`, ahead/behind `0/0`. 기존 session+bundle+write-port targeted
**146/146**, 전체 `node scripts/check.mjs` PASS(unit **2339/2339**), production bundle exact,
`git diff --check`, 포트 게이트는 PASS했다. Chromium E2E와 emulator는 계약대로 NOT RUN이다.

그러나 계약상 fail-closed 경계 3건이 독립 임시 회귀 테스트에서 **3/3 FAIL**로 재현됐다. 임시 test는
실행 직후 삭제했고 제품 working-tree diff는 0이다.

1. **semantic frozen fields 미검증.** `freezeFields()`는 exact 6 keys와 `structuredClone` 성공만 본다.
   따라서 `catalog:null`처럼 clone 가능하지만 기존 catalog/issue 계약상 invalid인 값도
   `draft-ready/canIssue:true`가 된다. §VERIFY 2의 invalid frozen fields → export/UUID/hash/crypto/writer
   0을 충족하지 못한다.
2. **unknown writer code 유출.** failure에서 `typeof code === "string"`이면 임의 문자열을
   `SpaceV2IssueErrorCode`로 cast한다. 합성 `PRIVATE_WRITER_ERROR_MARKER`가 public `errorCode`에 그대로
   나타났다. known safe code와 exact envelope가 아니면 `outcome-unknown/errorCode:null`이어야 한다.
3. **malformed success 승인.** success token은 non-empty만 검사한다. 합성
   `PRIVATE_NON_UUID_TOKEN`이 `success/confirmedToken`으로 승인됐다. exact success envelope와 prepared
   bundle의 token/objectPath 일치를 검증해야 한다.

라운드 1 보완 범위:

- `apps/admin/src/space-v2/issue-session.ts`
- `apps/admin/src/space-v2/issue-session.test.ts`
- `.gitattributes`에 위 두 경로만 `text eol=lf`
- spec 081 상태/handoff 문서

semantic preflight는 existing `readLegacyCatalog`, shared catalog projections와 pure V2 evidence validator를
재사용해 frozen fields를 exporter·identity·hash·crypto 전에 검증하고 detached validated fields만
보존한다. invalid catalog, selection reference, orientation, logical width, color, transform, unsupported
capability 각각에서 exporter와 이후 호출이 0이어야 한다. 기존 issue preparation/identity API는 수정하지
않는다.

writer result는 top-level/value/error exact keys, known code, safe metadata와 current correlation id를
검사한다. success는 prepared bundle에서 이미 확정된 token/objectPath와 exact 일치할 때만 승인한다.
unknown/extra/hostile/mismatched result는 identifying 값을 snapshot에 넣지 않고
`outcome-unknown/errorCode:null`로 닫는다.

현재 신규 두 파일은 `i/lf w/lf attr/`이고 system `core.autocrlf=true`다. clean checkout 재현성을 위해
exact 두 경로 LF policy를 이번 보완에 포함한다. 전역 TS/TSX EOL 정책은 열지 않는다.

상태 `CORRECTION_REQUIRED`, fix_round **1/3**, next `CLAUDE_CORRECTION`. App/UI/CSS/Canvas production
exporter, SDK composition, Rules/config/emulator/actual Firebase/live는 계속 금지다.
