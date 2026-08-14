# 핸드오프 — 스펙 037 운영자 상태 쓰기 C5 계약 (2026-08-11)

작성: Claude Code · 초판 `c654023` · 브랜치 `rebuild/modern-studio`
**라운드 1** `41b54b9` · **라운드 2** `d5789db` · 동기화 `fad819f`·`f694211` ·
**보완 라운드 3** `9805c26` · **DONE (Codex `CODEX_PASSED`, 2026-08-11)**

> **2026-08-14 후속 갱신:** Founder가 `D-1=A`, `D-2=O-3`, `D-3=N`을 승인했고 스펙 039
> Structure A 식별 구조를 로컬 구현·검증했다. 아래의 “미채택/NOT TESTED” 문구는 당시 이력이며,
> 현재 상태는 이 문서 마지막 §9와 `CURRENT.md`를 따른다.

> ## ★★ 종료 — 스펙 037 DONE
>
> **구현 `d83aee9` + 보완 라운드 1 `ead06ab`, 기록 `91a7813`.**
> Codex 독립 재검증: HEAD=origin=`91a7813` ahead/behind **0/0** · 변경 범위 **허용 4파일뿐** ·
> `pnpm install --offline --frozen-lockfile` **PASS**·**lockfile diff 0** ·
> format/lint/typecheck/unit/build **PASS** · **unit 1318/1318** · **Chromium E2E 134/134** ·
> **고객 번들 SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`** ·
> **local `demo-denn-emulator` Rules 게이트 10/10 PASS** ·
> ports 4183/4184/8080/9099/9199 잔류 **0** · `git diff --check` **PASS** · **추가 결함 없음**.
>
> ### 닫힌 것 / 닫히지 않은 것
>
> **닫힌 것 = 로컬 비-UI 구현·검증까지.** admin-write port(불변 객체 + 단일 head CAS +
> bounded reconciliation) · 두 오류 표면 · Rules **목표 상태**(placeholder UID) ·
> emulator config·Rules 사본 · opt-in fake/emulator 검증.
>
> **★ 여전히 NOT TESTED이자 금지**: **실제 Firebase 프로젝트·운영 bucket·운영 데이터·live network** ·
> **실제 운영자 UID**(배포 대상 Rules에 **UNCONFIRMED placeholder**가 남아 **현 상태로 배포 불가**) ·
> **Rules·Hosting 배포**(⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
> **배포 순서 자체가 STOP 대상**) · **운영 쓰기 활성화**(전제 3개 중 emulator PASS 하나만 충족) ·
> **`apps/**`와 모든 UI 연결·저장 버튼** · 발행 · legacy 공유 쓰기 · orphan 삭제·자동 정리 ·
> tombstone·자동 merge·L-4 · 실제 네트워크 지연·단절 · 실기기·다중 기기 · 운영 규모 payload.
>
> **증명 경계 유지**: **합성 fake는 서버 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기
> 전체를 증명하지 않는다.** callback 재실행·commit outcome unknown은 **fake 전용**이다.
>
> ### 후속 — G-4 orphan 정책 (2026-08-11, 별도 문서)
>
> 이 스펙이 남긴 **orphan 보존·비용·정리 정책(G-4)** 은 별도 정본으로 이어진다:
> **`decisions/2026-08-11-g4-orphan-retention-decisions.md`**.
> Founder 방향은 **과거 정상 저장본에 영구 보존 요구가 없다**는 것 하나이며,
> **실제 삭제·자동 정리·Rules 변경·백엔드·배포는 여전히 미승인**이다.
> 그 문서가 **안전 삭제 조건(SDC′)** 을 설계하고, **"head 미참조" 단독과 "오래됐다" 단독으로는
> 안전을 증명할 수 없다**는 것을 기록한다.
>
> **보완 라운드 2까지 반영됐고 Codex 문서 검수를 통과했다** (`DOCUMENT_REVIEW_PASSED`, 2026-08-11, **미커밋**).
> **구조 A·B는 후보로만 기록됐고 어느 것도 채택되지 않았으며 둘 다 NOT TESTED다.**
> **현재 기본 정책은 계속 `O-3 삭제 보류`이고, 다음 단계는 Founder의 D-1~D-3 결정이다.** 그 과정에서 **내 사실 오류 4건이
> 정정**됐다: ~~"Storage Rules는 Firestore를 읽을 수 없다"~~(→ **`firestore.get()`/`exists()` 지원**),
> ~~"같은 transaction의 형제 쓰기를 볼 수 없다"~~(→ **`getAfter()` 지원**),
> ~~"공식 총 deadline이 없다"~~(→ **lock 20초·최대 270초·idle 60초·유한 재시도**),
> 그리고 **REC 문서 ID ↔ Storage `objectId` 매핑 불성립**(→ **REC ID = `objectId` 세그먼트 그대로**).
>
> ### ⚠️ 이 스펙에 예고된 계약 변경 가능성
>
> G-4가 **SDC′를 채택하면 head 스키마가 `objectPath` → `recId`로 바뀐다**(키 개수 3은 유지).
> 영향: **계약 §4.3·§4.4·§5.6** · `constants.ts`(`HEAD_ALLOWED_KEYS`) · `head.ts`(`validateHead`) ·
> `types.ts` · `write-port.ts` · `firestore.rules` · unit/emulator 테스트.
> **아직 승인되지 않았고 이 스펙의 DONE 상태를 바꾸지 않는다** — D-1·D-2 결정 후에만 열린다.

> ## ★★ 보완 라운드 3 — 마지막 결함 2건을 닫았다
>
> | # | 라운드 2의 결함 | 정정 |
> | --- | --- | --- |
> | **1** | `loadBaseline`의 읽기/network/invalid 상태를 **`WRITE_UPLOAD_FAILED`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`·`WRITE_HEAD_FAILED`로 표현**했다. **읽기 작업에 "upload" 오류를 반환**하고 **persisted object invalid를 "head transaction 실패"와 합치는 것은 공개 API 의미가 틀리다** | **오류 표면을 분리**했다(계약 §5.4·§5.6). **`save`만** `SafeAdminWriteError` + 8개 `WRITE_*`를 쓴다. **`loadBaseline`은 스펙 036의 `SafeAdminReadError` 의미를 재사용**하고, **head 문서 자체의 스키마 위반만** 신규 **`REBUILD_BASELINE_INVALID`** 하나로 구분한다. **read timeout은 상태를 바꾸지 않으므로 `NETWORK_TIMEOUT`이지 upload outcome unknown이 아니다.** **`WRITE_HEAD_FAILED`는 save의 head transaction이 명확히 실패한 경우로 다시 좁혔다** |
> | **2** | **timeout 뒤 head가 base에 머물러 있으면 commit 미반영을 확정**하고 `WRITE_HEAD_FAILED`를 반환했다 | **★ timeout은 SDK transaction을 취소하지 않는다.** reconciliation read 순간에 base여도 **원 transaction이 나중에 서버에서 성공할 수 있다.** → **base 관측은 "아직 아님"이지 "영원히 아님"이 아니다** → **`WRITE_COMMIT_OUTCOME_UNKNOWN` 유지**, **orphan이라고 부르지 않는다**. `base+1`인데 **`objectPath`가 다르면 `WRITE_CONFLICT` 확정**(head가 더 이상 `expectedBase`가 아니므로 우리 late commit은 CAS에서 이길 수 없다). **`base+1` 초과는 판정 불가** |
>
> **★ 교정 2는 Codex의 라운드 2 지시에도 포함됐던 오류다.** 최종 계약에서 바로잡았다.
> 오판했다면 **서버에서 나중에 성공한 commit을 실패로 보고하고, 운영자가 같은 payload를 다시
> 보내게 만들어 불필요한 revision과 객체를 만든다**(위험 **R-15**).
>
> **라운드 2에서 열어 둔 질문은 해소됐다** — "`loadBaseline` 실패를 8코드 안에서 어떻게 부르는가"에
> 대해 라운드 2는 `WRITE_HEAD_FAILED`의 의미를 넓히는 절충을 썼는데, **교정 1이 그 절충을 폐기**했다.
> **오류 표면 자체를 분리하는 것이 옳은 답**이고, **9번째 `WRITE_*` 코드는 만들지 않았다.**
>
> **확인한 사실**: `SafeAdminReadError`는 **`@denn/firebase/admin-read` 배럴이 이미 export한다**
> (`packages/firebase/src/admin-read/index.ts`). 자기 package subpath 순환이 문제가 되면 구현은
> **내부 relative type import**를 써도 되며, **`import type`은 컴파일 시 지워지므로 런타임 결합·
> 번들 영향은 어느 쪽이든 0**이다. **`admin-read/**` 무수정 경계는 유지된다.**

> ## ★★ 보완 라운드 2 — Codex가 남긴 계약 결함 4건을 정정했다
>
> | # | 라운드 1의 결함 | 정정 |
> | --- | --- | --- |
> | **1** | head가 없을 때 **`expectedBase`를 확인하지 않고 revision 1을 생성**해 **G-2("`expectedBase`와 현재 head가 일치할 때만 변경")와 모순**됐다 | **head 없음 = 논리적 revision `0`.** **`expectedBase === 0`일 때만** create 허용하고, 아니면 **`WRITE_CONFLICT`**(head 불변)다. **`expectedBase`는 0 이상 safe integer**만 허용하며 위반은 **upload 전 `WRITE_INVALID_INPUT`**(Storage 호출 0회). **persisted `revision`은 1 이상 safe integer**이고 **`+1`이 여전히 safe integer**여야 하며 아니면 **fail-closed**. 계약 §4.3·§5.4·§5.7·§6.1~6.5·검증표에 같은 의미로 반영 |
> | **2** | "정확한 공개 타입" 블록이 **존재하지 않는 `Catalog`** 를 쓰고 설명문에서만 바인딩했으며 **`SafeAdminWriteError`가 미완결**이었다 | 타입 블록이 **`CatalogDocumentV1`을 직접** 쓴다(**alias·동의어 0**). `Result`는 **import 표면까지 명시**. **`AdminWriteErrorCode`·`AdminWriteErrorCategory`·`SafeAdminWriteError` 공개 타입 고정**. **8코드 정본 매핑 표를 §5.4 한 곳으로** 통일. **`AdminStateRevision` 런타임 범위**를 교정 1과 일치시킴 |
> | **3** | `operationId`를 port 내부에 숨기면서 **호출자에게 head 재조회를 요구** — **호출자는 수행할 수 없었다** | **`save` 내부가 자신의 `operationId`로 read-only reconciliation을 수행**한다(§6.6). **write retry가 아니다** — **재업로드 0 · transaction 재호출 0 · bounded read 최대 1회**. 판정 3분기 고정(성공 / **미반영 확정 = `WRITE_HEAD_FAILED` + orphan** / **판정 불가 = `WRITE_COMMIT_OUTCOME_UNKNOWN`**). **오류에 `operationId`·object path 비노출**. **`loadBaseline`은 reconciliation API가 아니다** |
> | **4** | §7.5가 **"실제 Rules 사용" 표에 callback 재실행·commit outcome unknown**까지 넣었지만 **결정적 재현 방법이 없었다** | **증명 주체를 (A) emulator / (B) fake 로 분리**했다. **결정적·비파괴적 seam을 제시할 수 없으므로 두 항목은 fake 전용으로 재분류**하고 **emulator 증명이라고 주장하지 않는다.** network 차단·프로세스 종료·포트 강제 해제·emulator kill·실제 Firebase로 **재현하지 않는다.** **(D) 양방향 경계** 명시 — fake는 Rules 원자성을, emulator는 앱 오류 분기 전체를 증명하지 않는다 |
>
> ### ★ Codex가 확인해 줘야 할 판단 1건
>
> 교정 2가 **"8코드만 허용"** 을 요구하는데, 8코드는 `save` 기준이라 **`loadBaseline`의
> "persisted head 또는 그 객체가 계약을 위반해 사용할 수 없음"** 에 맞는 이름이 없다.
> **9번째 코드를 만들지 않고 `WRITE_HEAD_FAILED`의 의미를 확장**했다 —
> "head transaction 실패 **또는** persisted head/그 객체가 계약 위반으로 사용 불가".
> 둘 다 **확정 실패**이고 **`retryable: false`** 로 성질이 같다.
> **이름이 `HEAD`인데 참조 객체까지 포함하는 점은 의도적 절충**이며, 다른 이름을 원하면
> **계약만 고치면 된다**(제품 코드는 아직 없다).

> ## ★ 보완 라운드 1 — Codex가 지적한 계약 결함 5건을 정정했다
>
> | # | 초판의 결함 | 정정 |
> | --- | --- | --- |
> | **1** | baseline load에 필요한 **Firestore head `get` 권한이 Rules 계약에 없었다** | 계약 §4.4를 **get/list/create/update/delete 전 분기**로 다시 썼다. **`get`은 승인 UID + `docId == 'head'`만**, **`list` 거부**, `objectPath` 형태 강제, **update 시 `objectPath`가 이전 값과 달라야 함** 추가 |
> | **2** | **합성 UID Rules 사본을 선택할 별도 emulator config가 없어** 배포 config와 섞일 수 있었다 | **`firebase.json`은 구현 단계에서도 수정하지 않는다.** 신규 **`firebase.emulator.json`** 을 emulator 전용 config로 고정했다. 실행은 **`--config firebase.emulator.json` + `--project demo-denn-emulator`** 를 **모두** 포함한다. 허용 파일에서 **`firebase.json` 제거**, `firebase.emulator.json` 추가 |
> | **3** | **`WRITE_COMMIT_OUTCOME_UNKNOWN`을 orphan으로 단정**해 "실제로는 commit이 성공했을 수 있다"와 모순됐다 | 계약 §6.5를 **결과 상태 5행 표**로 분리했다. **결과 불명은 orphan이 아니라 "미판정"** 이고, **head 재조회(`objectPath`+`revision`)로만 판정**한다. **`WRITE_HEAD_FAILED`도 `retryable: false`** 로 바꿨고, **reload 전 동일 payload 재전송을 자동·수동 모두 금지**했다. **"head commit만 재개" API는 만들지 않는다** |
> | **4** | Firestore **transaction callback의 SDK 내부 재실행**과 **callback 부작용 금지**가 없었다 | 계약 §5.5 신설. **앱은 `runTransaction`을 정확히 1회 호출**하되 **SDK는 callback을 여러 번 실행할 수 있다**. callback 안에서 `transaction.get/set` 외 **전면 부작용 금지**(UUID 생성·upload·로그·UI·로컬 revision 변경). **`operationId`와 `expectedBase`는 transaction 호출 전에 고정.** **callback 재실행 ≠ 앱 retry** |
> | **5** | `@denn/firebase/admin-write`의 **공개 타입·입출력**이 없었다 | 계약 §5.6에 **`AdminStateWritePort`·`AdminStateBaselineValue`·`AdminStateSaveRequest`·`AdminStateSaveValue`를 이름까지 고정**했다. `operationId`는 **port 내부 생성**이고 외부 입력이 아니다. **`packages/firebase/src/admin-read/**`는 이번 첫 구현에서 수정하지 않는다** |
>
> **★ 구현 전 확인 필요**: 교정 5의 타입 블록이 쓰는 **`Catalog`라는 타입은 저장소에 존재하지 않는다.**
> `@denn/shared`가 실제로 내보내는 이름은 **`CatalogDocumentV1`**
> (`packages/shared/src/catalog/types.ts` — 스펙 036의 `AdminStateLoadValue.document`가 그 타입이다).
> 계약은 `Catalog`를 **`CatalogDocumentV1`에 바인딩**하고 **동의어·새 타입을 만들지 않는다**고 명시했다.
> `Result`는 `packages/shared/src/index.ts:19`의 기존 타입을 쓴다.
계약: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`
결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5)
구조 결정: Codex **Z-1 ~ Z-8**
근거 조사: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`

> **문서 전용 라운드.** 제품 코드·`storage.rules`·`firestore.rules`·`firebase.json`·config·
> lockfile·`pnpm-workspace.yaml` 변경 **0**. 실제 Firebase/network/live/**emulator 실행**/운영 데이터 **0**.
> **구현 착수 0. 실제 저장 구현과 UI 연결은 이 계약이 승인하지 않는다.**

---

## 1. 한 줄 요약

**덮어쓰기를 없애는 방식으로 손실을 막는다** — Storage 객체는 **매번 새 불투명 경로에 한 번만 생성**되고,
**가변 지점은 Firestore head 문서 하나**뿐이며 그 이동만 **transaction CAS**로 보호한다.

## 2. 왜 이 구조인가

조사에서 확인된 사실이 설계를 강제했다.

- **Firebase Web SDK 공개 Storage API에 generation 기반 조건부 쓰기가 없다**
  (`@firebase/storage@0.14.4` dist 전량 grep 0건 · `generation` mapping `writable=false`).
- 따라서 **같은 경로를 두 운영자가 덮어쓰는 모델은 어떤 방법으로도 안전해지지 않는다.**
- **Rules로 고정 경로 CAS를 얻을 수 있다는 보장은 공식 문서에서 찾지 못했다**(C3 = NOT PROVEN).
- **Firestore lock만으로도 부족하다** — cross-service 원자성이 문서상 존재하지 않는다(C4 = FAIL).

> **★ C5가 안전한 이유는 cross-service 원자성이 아니다.**
> **불변 객체를 먼저 만들고 단일 가변 정본만 CAS로 옮기기 때문**이다.
> 간극에서 실패하면 **orphan + 명시적 충돌**이 되고, 남의 바이트를 덮는 일은 일어나지 않는다.

## 3. 계약의 골자 (Z-1 ~ Z-8)

| Z | 확정 내용 |
| --- | --- |
| **Z-1** | UID 제한은 **`rebuild-admin-state/**` 와 `/rebuildAdminState/head`에만**. **`op()` 본체는 건드리지 않는다**(건드리면 레거시 발행·자산 업로드까지 잠긴다). 실제 UID는 **UNCONFIRMED**, 커밋 금지, emulator는 **합성 UID** |
| **Z-2** | `rebuild-admin-state/objects/{operationId}.json` — **별도 최상위 경로**(OR 우회 구조적 차단), `operationId` = 저장 시작 시 1회 생성 **UUID**, 경로에 revision·문구·id·시간 **금지**, `resource == null` **create-only**, update/delete 금지 |
| **Z-3** | `/rebuildAdminState/head` **단일 문서**, 키 3개(`schemaVersion`/`revision`/`objectPath`)만. 최초 create는 `revision 1`, 이후는 transaction에서 `expectedBase` 일치 시 **정확히 +1 + `objectPath` 교체**. `firestore.rules`가 **`get`(승인 UID + `head` 문서만) · `list` 거부 · create/update/delete 전 분기를 이중 강제**〔교정 1〕. **Rules가 객체 실존을 증명한다고 주장하지 않는다** |
| **Z-4** | `@denn/firebase/admin-write` 서브패스, **루트 배럴 무변경**, SDK는 **admin 전용 lazy 경계 안**, 주입 facade + 합성 fake, **저장 버튼·UI 연결 제외**, **`loadBaseline`/`save` 각각 단일 in-flight**, **앱 자동 retry·merge 0**, ⚠️ **SDK 내부 재시도가 있으므로 "요청 1회"를 주장하지 않는다**, **transaction callback 재실행 계약**, **공개 타입 고정**. **★ 오류 표면 분리**〔라운드 3 교정 1〕 — **`save`만 `SafeAdminWriteError` + 8개 `WRITE_*`**, **`loadBaseline`은 스펙 036 `SafeAdminReadError` + 신규 `REBUILD_BASELINE_INVALID` 하나** |
| **Z-5** | head 없음 → legacy를 **revision 0** 기준으로 읽기 / head 있음 → **그 객체만**, 없거나 invalid면 **fail-closed(legacy fallback 0)**. `expectedBase`는 **편집 시작 로드의 revision**으로 고정(head 부재면 **`0`**, 그리고 **최초 create도 `expectedBase === 0`을 강제**), 자동 재채택·자동 병합 0, **commit 성공 후에만** 로컬 기준 갱신. **★ 결과 불명은 `save` 내부 bounded reconciliation이 판정**하며 **base 관측은 미판정**〔라운드 3 교정 2〕 |
| **Z-6** | **로컬 emulator만**, **신규 `firebase.emulator.json` 전용 config**〔교정 2〕 + **`--project demo-denn-emulator`** 를 **둘 다** 명시(`firebase.json`은 **구현 단계에서도 수정 금지**), 기본 게이트와 **분리**(`*.emulator.test.ts` + `pnpm test:emulator`), **실제 Rules로 12개 시나리오**(head `get` 성공/거부·`list` 거부·callback 재실행 시 upload 반복 0·commit outcome unknown 재조회 판정 추가), 설치·다운로드·포트 강제 해제는 **STOP** |
| **Z-7** | **tombstone·자동 merge 도입 안 함.** 저장은 **문서 전체 CAS**, 충돌 시 전체 거부. **L-4는 별도 후속 스펙** |
| **Z-8** | **이번 스펙에서 배포 0.** 실제 UID + orphan 정책 + emulator PASS 전에는 운영 쓰기 미개방. **legacy 저장을 먼저 닫지 않는다.** cutover는 별도 승인·별도 스펙 |

## 4. ★ Emulator 사전 확인 결과 (읽기 전용 · 설치 0 · 다운로드 0 · 실행 0)

| 항목 | 결과 |
| --- | --- |
| Java | **사용 가능** — `openjdk 21.0.11 LTS` |
| firebase-tools | **사용 가능** — 전역 **15.22.4**, **저장소 의존성 아님** → lockfile 변경 불필요 |
| Firestore emulator jar | **캐시됨** `cloud-firestore-emulator-v1.21.0.jar` |
| Storage rules runtime jar | **캐시됨** `cloud-storage-rules-runtime-v1.1.3.jar` |
| Emulator UI | **캐시됨** `ui-v1.15.0` |
| Auth emulator binary | 별도 jar **없음** — 내장으로 보이나 **UNCONFIRMED** |
| 포트 4000·4400·4500·8080·9099·9199·4183·4184 | **전부 free** |

> **결론: 현재 환경은 emulator 검증을 새 설치 없이 시작할 수 있는 것으로 보인다.**
> 다만 **Auth emulator만 UNCONFIRMED**이며, 첫 실행에서 **다운로드를 시도하면 즉시 STOP**이다.

## 5. ★★ 가장 중요한 두 가지 위험

### R-1 — Rules 배포가 운영자의 유일한 저장 경로를 닫는다

`denn-admin.html:740` = `uploadDataUrl(dataUrl,'admin/state.json')`.
스펙 035 기준으로 **이것이 운영자가 상태를 저장하는 유일한 경로**다(리빌드 admin은 저장 불가).
G-1의 "legacy `admin/state.json` 읽기 전용 고정"을 배포하면 **이 저장이 서버에서 거부된다.**

**지금은 안전하다** — 이번 스펙에서 Rules를 **수정하지도 배포하지도 않았고**, UID 정본 전 배포가 차단이다.
**위험은 배포 시점에 발생하며, Z-8이 그 순서를 STOP 대상으로 못 박았다.**

### R-2 — emulator가 실제 프로젝트 id로 뜰 수 있다

`.firebaserc`의 `projects.default`가 **`denn-products`**, 즉 **실제 운영 프로젝트**다.
`--project`를 생략한 emulator 실행은 **그 id로 동작**하고, 설정이 어긋나면 클라이언트 SDK가
**실제 프로젝트로 나갈 수 있다.**

→ 계약은 **`demo-` 접두 프로젝트 id 명시를 강제**하고(예 `demo-denn-emulator`),
**emulator host 환경변수가 없으면 테스트 시작 자체를 거부**하도록 했다. `.firebaserc`는 **수정하지 않는다.**

## 6. 정직하게 남기는 경계

- **합성 fake는 호출 순서와 오류 매핑만 증명한다.** 서버 Rules의 원자성·거부 동작은 **emulator만** 보여 준다.
  두 층은 서로를 대체하지 못한다.
- **emulator는 실제 Firebase가 아니다.** 실제 Rules 배포·거부, 실제 네트워크 지연·단절, 실기기,
  운영 규모 payload는 이 스펙이 끝나도 **NOT TESTED**다.
- **Rules는 `objectPath`의 실제 객체 존재를 증명할 수 없다.** 문자열 형태만 검사한다.
  그 간극은 **읽기 fail-closed**(Z-5)가 흡수한다.
- **원자성은 L-4(삭제 부활)를 고치지 않는다.** 병합 의미론 문제이며 별도 스펙이 필요하다.
- **실제 운영자 UID는 여전히 UNCONFIRMED다.** 추측하지 않았고 예시 값을 실제처럼 적지 않았다.

## 7. 승인 상태와 다음 단계 (문구 통일)

- **이번 라운드는 계약 문서 보완만 승인한다.**
- **보완 push 후 상태는 `READY_FOR_CODEX`, `fix_round: 3`.**
- **Codex 최종 계약 검토 전 port/Rules/config/test 구현은 0이다.**
- **실제 제품 UI · live Firebase · Rules 배포 · 운영 쓰기는 계속 금지**다.
- **★ G-5의 합성 fake·로컬 emulator 허용과 결정 문서 §2의 "제품 구현 착수" 금지 사이 경계는
  이번 문서 교정에서 추측하지 않는다. Codex 최종 검토 후 Founder 확인 대상으로 남긴다.**
- 운영 쓰기 개방은 **실제 UID + orphan 보존/비용/정리 정책 + emulator PASS**가 전부 확인된 뒤
  **별도 cutover 스펙 + 별도 Founder 승인**에서 다룬다.

## 8. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

**force push · merge · rebase · `reset --hard` · broad delete 하지 않는다.**

## 9. G-4 후속 — Founder D-1=A / D-2=O-3 / D-3=N (2026-08-14)

- 스펙 039에서 Structure A 식별 구조만 로컬 구현했다.
- REC ID는 Storage objectId와 같은 `UUID.json`; head는 `recId`를 사용한다.
- `REC → upload → head transaction` 순서이며 REC과 객체는 create-only다.
- demo emulator Rules 13/13, 전체 unit 1322/1322, Chromium E2E 134/134 PASS.
- 실제 삭제·delete 권한·자동 정리·보존 주기·IAM·실제 UID·배포·UI는 계속 금지다.
- 구현 직후 상태는 `READY_FOR_CODEX`였고 후보는 stage/commit/push하지 않았다.

### 9.1 Codex 종료 판정

2026-08-14 독립 검수 결과 **CODEX_PASSED**, 발견 결함 0. 스펙 039는
`DONE / LOCAL_ONLY`이며 상태는 `WAITING_FOR_NEXT_MANUAL_TASK`다. 실제 서비스와 삭제 경계는 열지 않았다.
