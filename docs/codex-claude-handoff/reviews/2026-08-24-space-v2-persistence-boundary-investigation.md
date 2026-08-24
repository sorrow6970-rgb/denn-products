# space V2 persistence boundary 읽기 전용 조사

- 스펙 정본: `docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md`
- 상태: **DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI — 보완 라운드 2 반영**
- 조사 수행: Claude Code, 2026-08-24 · 라운드 1·2 모두 같은 날 Codex `CORRECTION_REQUIRED` 반영

**commit 이력 (라운드 2에서 자기참조 추적을 중단했다):**

| 단계 | commit | 성격 |
|---|---|---|
| 초판 조사 기록 | `f1f5d20` | 내용 |
| 해시 고정 | `534c26f` | bookkeeping |
| 보완 라운드 1 | `63a1dec` | 내용 |
| 해시 고정 | `2dd97c4` | bookkeeping |
| **보완 라운드 2** | **이 문서를 담은 내용 commit** | 내용 |

> **★ 자기참조 한계를 숨기지 않는다.** commit은 **자기 자신의 해시를 내용에 담을 수 없다.** 라운드
> 1까지는 내용 commit 뒤에 "해시를 적어 넣는" bookkeeping commit을 한 번 더 만들어 이 한계를 메웠지만,
> 그 방식은 라운드마다 commit이 두 배로 늘고 기록이 자기참조로 꼬인다. **라운드 2부터는 그 추가
> commit을 만들지 않는다.** 대신 상태 문서에는 ① **push 후 `HEAD=origin`과 `ahead/behind 0/0`을 실제로
> 검증했다는 사실**과 ② **라운드 2 내용 commit이 무엇인지**를 나눠 적고, 해시 자체는 이 세션 보고와
> git 이력이 정본이다.

> **보완 라운드 2에서 바뀐 것 (라운드 1 대비):**
> ① **cross-service read primitive의 근거 등급을 올렸다.** 라운드 1은 이를 `UNCONFIRMED`로 남겼으나,
> 이 저장소에 **local emulator 실행 증거**가 이미 있다 — §Q7.1.0에서 공식 지원 / admin-state
> primitive VERIFIED / V2 mapping 미작성 / 실제 IAM·live 미검증의 **네 층위로 분리**했다.
> "우회(bypass)" 표현도 폐기했다.
> ② **"버킷과 같은 신뢰 수준이라 새로운 노출 경로는 아니다"** 단정을 **폐기**했다. private mapping은
> **새 privileged plaintext surface**이며 principal/role overlap은 `UNCONFIRMED`다.
> ③ **REC ID 후보를 정밀화했다.** 라운드 1의 *"opaque recId는 성립하지 않는다"* 확정을 폐기하고
> §Q7.1.1에서 **(c1) transform-0**(성립 · admin-state 선례)과 **(c2) `customMetadata` pointer**
> (논리상 가능하나 비싸고 위험 · GG-4 미승인 확장)로 나눴다.
> ④ commit 자기참조 추적을 중단했다(위 표).

> **보완 라운드 1에서 바뀐 것 (초판 대비):**
> ① Q7의 *"asset↔token 매핑을 평문으로 두면 토큰 비밀성 모델이 반드시 깨진다"* 단정을 **폐기**하고,
> 클라이언트 `read`/`list`를 모두 거부한 **private write-once mapping/REC 후보(V2-2′)**를 §Q7.1에서
> 따로 분석했다. 승인된 outer 암호문만으로 관계를 볼 수 없다는 결론과 O-3 삭제 보류는 유지한다.
> ② `getDoc` 결론의 **근거를 설치 SDK 원문 행으로 고정**하고, *"SDK가 로컬 timeout으로 실패 처리"*
> 라는 틀린 표현을 **"앱이 bounded timeout으로 포기해도 원 Promise·pending write가 남는다"**로 정정했다.
> ③ 실패표를 **[현재 Rules] / [목표 후보 Rules]** 와 **정적 / 설계 / 실행** 축으로 분리했다.
> ④ commit 기준을 실제 기록에 맞췄다.

> **이 문서는 조사 기록이다. 구현 계약도 승인도 아니다.**
> 제품 코드 · test · `storage.rules` · `firestore.rules` · Firebase config · package/lockfile 변경 **0**.
> 실제 Firebase/project/bucket/object/Firestore/network/live 데이터 접근 **0**, emulator 실행 **0**,
> upload/write/read-back/delete/deploy **0**, URL 발급 **0**, UI 연결 **0**.
> 이 조사에서 실행한 것은 저장소 안 파일과 `node_modules` 안 **설치된 SDK 타입/소스 읽기**뿐이다.

---

## 0. 한 줄 결론

**스펙 072 bundle을 실제로 저장할 수 있는 서버 경로는 지금 하나도 열려 있지 않다.**
`rebuild-space-assets/objects/**`는 `storage.rules`에 **match 자체가 없어 create/read/update/delete가
전부 기본 거부**이고, `spaces/{token}`은 반대로 **아무 조건 없이 create가 열려 있어** GG-5의 approved
operator UID·exact outer keys 목표를 하나도 충족하지 않는다.

그리고 **승인된 V2 outer document의 암호문만으로는 서버(Rules)가 asset↔document 관계를 볼 수 없어**,
admin-state에서 쓴 G-4 구조 A의 SDC′ orphan 식별 논거를 그대로 옮길 수 없다. 클라이언트 read/list를
거부한 별도 mapping 문서를 두면 **관계 자체는 서버가 볼 수 있게 되지만**(§Q7.1), 그것만으로
**확정 orphan이 증명되지는 않는다** — V2에는 늦게 도착한 `spaces` create를 무효화하는 단조 조건이
없기 때문이다. 따라서 O-3 삭제 보류가 계속 기본값이다.

---

## 1. 근거 목록 (읽은 것만)

### 1.1 Rules · config

| 파일 | 확인한 것 |
|---|---|
| `storage.rules` | `rebuild-space-assets/**` match **부재**. 존재 match는 `rebuild-admin-state/objects/{objectId}`, `admin/**`, `temp-share/**`, `proofs/**`, `published/**`, `templates/**`, `placeholders/**`, `guides/**`, `mockups/**`, `editor-overlays/**` |
| `firestore.rules` | `spaces/{token}`: `read: if true` / `create: if true` / `update, delete: if false`. 그 외 `rebuildAdminState/{docId}`, `rebuildAdminStateObjects/{recId}`, catch-all deny |
| `firebase.json` | `storage.rules` · `firestore.rules` 참조. hosting `public: "."` (레거시 운영본 그대로) |
| `firebase.emulator.json` | 별도 config. `storage.emulator.rules` / `firestore.emulator.rules`, auth 9099 / firestore 8080 / storage 9199, `demo-` project 강제 |
| `storage.emulator.rules` · `firestore.emulator.rules` | 운영본과 **UID 문자열 한 줄만 다른 사본** (`UNCONFIRMED_OPERATOR_UID_REPLACE_BEFORE_DEPLOY` → `emulator-operator-DO-NOT-DEPLOY`). diff 확인함 |
| **`storage.emulator.rules:40-45`** (라운드 2) | `rebuild-admin-state/objects/{objectId}` create가 `resource == null` + **`firestore.exists(/databases/(default)/documents/rebuildAdminStateObjects/$(objectId))`** + `okSize()` + `contentType == 'application/json'`을 요구한다 |
| **`firestore.emulator.rules:71-86`** (라운드 2) | 같은 `rebuildAdminStateObjects/{recId}`가 승인 UID create-only · `claimedBase` exact-keys · **`allow read, update, delete: if false`**(클라이언트 read 완전 차단) |

### 1.2 설치된 SDK (읽기 전용, `node_modules/.pnpm`)

| 패키지 | 버전 | 확인한 표면 |
|---|---|---|
| `firebase` | **12.17.1** | `packages/firebase/package.json` dependency, `pnpm-lock.yaml` |
| `@firebase/storage` | **0.14.4** | `uploadBytes`, `uploadBytesResumable`, `getBytes`, `getMetadata`, `getDownloadURL`, `deleteObject`, `updateMetadata`, `list`, `listAll` |
| `@firebase/firestore` | **4.17.0** | `setDoc`, `getDoc`, `getDocFromServer`, `getDocFromCache`, `runTransaction`, `waitForPendingWrites`, `SnapshotMetadata`, `FirestoreErrorCode` |
| `@firebase/app` | 0.16.0 | `initializeApp`/`getApp`/`getApps` |
| `@firebase/auth` | 1.13.4 | 기존 adapter가 쓰는 표면 |

**정확한 설치 소스 경로 (보완 라운드 1에서 명시):**

```text
node_modules/.pnpm/@firebase+firestore@4.17.0_@firebase+app@0.16.0/node_modules/
  @firebase/firestore/dist/index.d.ts
node_modules/.pnpm/@firebase+storage@0.14.4_@firebase+app@0.16.0/node_modules/
  @firebase/storage/dist/storage-public.d.ts
node_modules/.pnpm/@firebase+storage@0.14.4_@firebase+app@0.16.0/node_modules/
  @firebase/storage/dist/index.esm.js
```

아래 행 번호는 전부 위 파일 기준이다.

측정한 상수·타입:

- `StorageErrorCode` 실제 enum 값 (`index.esm.js`): `unknown`, `object-not-found`, `bucket-not-found`,
  `project-not-found`, `quota-exceeded`, `unauthenticated`, `unauthorized`, `unauthorized-app`,
  `retry-limit-exceeded`, `invalid-checksum`, `canceled`, `invalid-event-name`, `invalid-url`,
  `invalid-default-bucket`, `no-default-bucket`, `cannot-slice-blob`, `server-file-wrong-size`,
  `no-download-url`, `invalid-argument`, `invalid-argument-count`, `app-deleted`,
  `invalid-root-operation`, `invalid-format`, `internal-error`, `unsupported-environment`.
  전부 `'storage/' + code`로 노출된다.
- `DEFAULT_MAX_OPERATION_RETRY_TIME = 2 * 60 * 1000` (2분), **`DEFAULT_MAX_UPLOAD_RETRY_TIME = 10 * 60 * 1000` (10분)**.
  `FirebaseStorage.maxUploadRetryTime` / `maxOperationRetryTime`로 조정 가능.
- `UploadResult = { metadata: FullMetadata; ref: StorageReference }`.
  `FullMetadata`는 `bucket`, `fullPath`, `generation`, `metageneration`, `name`, `size`,
  `timeCreated`, `updated`, `downloadTokens`를 가지며 `UploadMetadata`를 상속해
  **`md5Hash?: string`**(Base64), `contentType`, `customMetadata`를 포함한다.
- `FirestoreErrorCode` = `cancelled | unknown | invalid-argument | deadline-exceeded | not-found |
  already-exists | permission-denied | resource-exhausted | failed-precondition | aborted |
  out-of-range | unimplemented | internal | unavailable | data-loss | unauthenticated`.
- `TransactionOptions.maxAttempts` 기본 **5**.
- `SnapshotMetadata`는 **`hasPendingWrites`**와 **`fromCache`**를 노출한다.
- **`@firebase/firestore/dist/index.d.ts:2582-2595`** — `setDoc`의 Promise는 서버가 성공/오류를 알릴
  때까지 settle하지 않으며(**SDK 자체 timeout 없음**), 데이터는 local cache에 즉시 저장돼 future
  "get"에 포함되고 **eventually** 서버에 기록된다(latency compensation). 선언은 `:2603`.
  원문 인용은 §Q3에 있다.
- **`@firebase/firestore/dist/index.d.ts:1386-1413`** — `getDoc`은 **캐시를 돌려줄 수 있고**
  (`:1389`, 선언 `:1397`), `getDocFromCache`는 캐시 전용(`:1405`),
  **`getDocFromServer`가 server read**(`:1413`)다.
- `@firebase/storage/dist/index.esm.js:37`(`DEFAULT_MAX_OPERATION_RETRY_TIME`) ·
  `:43`(`DEFAULT_MAX_UPLOAD_RETRY_TIME`) · `StorageErrorCode` enum 블록.

### 1.3 기존 adapter

| 위치 | 확인한 것 |
|---|---|
| `packages/firebase/src/admin-write/**` | REC(claim) → upload → head transaction 순서, `mapUploadError` / `mapClaimError` / `classifyTransactionError`, bounded 1회 read-only reconciliation, `saveInFlight` 단일 비행, `demo-` prefix emulator 가드, DEFAULT app 재사용·config 불일치 시 fail-closed |
| `packages/firebase/src/space-read/**` | `spaces/{token}` **read 전용** port. 별도 named app `denn-space-viewer`, `getDoc` 사용, 20s timeout, 안전 오류 7종 |
| `packages/firebase/src/index.ts` (root barrel) | admin-write/space-read를 **재수출하지 않는다**(고객 번들에 SDK 유입 방지) |
| `apps/admin/src/space-v2/**` | 스펙 065~072의 local 준비 체인. **upload/Firestore/네트워크 호출 0**, `App.tsx`/`main.tsx` 미연결 (grep 0건) |
| `apps/admin/src/admin-composition/**` | admin-state 전용 조립만 존재. **V2 issuer composition 없음** |
| **`packages/firebase/src/admin-write/cutover-rules.emulator.test.ts:83-96`** (라운드 2) | `rebuildAdminStateObjects/{REC_ID}`를 `setDoc`한 **뒤 Storage upload가 성공**하고, 같은 경로 재업로드·`deleteObject`·비승인 UID 업로드가 거부됨을 `demo-denn-emulator`에서 검증한다. → **client `read:false` 문서를 Storage Rules가 조회하는 primitive의 local 실행 증거**(§Q7.1.0 ②). 이번 세션에서 **재실행하지 않았다**(emulator 금지) |
| **G-4 결정 정본 §12** (라운드 2) | 구조 A + REC + `firestore.get()`/Storage `firestore.exists()` 규칙이 2026-08-14 local `demo-denn-emulator`에서 **13/13 PASS**. 실제 Firebase·IAM·배포는 **NOT TESTED**로 기록 |
| `denn-mockup-tool.html:15550-15576` (레거시 운영본, 참조만) | V1 실제 write = `setDoc(doc(db,'spaces',token), { enc, ownerMeta, createdAt, schema:'space-v1' })`, token = 12 random bytes의 24-hex, PNG는 `proofs/` + `uploadString(...,'data_url')` |

---

## 2. 조사 질문별 결과

### Q1. `rebuild-space-assets/objects/{assetId}.png`의 현재 CRUD와 GG-4 목표 차이

**현재 상태: 네 연산 모두 거부.** `storage.rules`에 이 경로와 겹치는 match가 **하나도 없다**.
Firebase Storage Rules는 매치되는 규칙이 없으면 기본 거부이므로 create/read/update/delete가 전부 닫혀
있다. 파일 상단 주석이 명시하듯 catch-all `read: if true`도 없다(그건 `admin/` 노출 때문에 의도적으로
금지된 패턴이다).

| 연산 | 현재 | GG-4=A 목표 | 차이 |
|---|---|---|---|
| create | **거부**(match 없음) | approved operator UID · create-only(`resource == null`) · `image/png` · <20 MiB | match 블록 신설 필요 |
| read | **거부** | **public-read**(viewer가 PNG를 받아야 함) | `allow read: if true` 신설 필요 |
| update | 거부 | `false` | **이미 일치**(기본 거부) |
| delete | 거부 | `false` | **이미 일치**(기본 거부) |

**주의 1 — 기본 거부와 명시 `false`는 결과는 같지만 근거가 다르다.** 지금의 update/delete 거부는
"규칙이 없어서"이지 "불변으로 못박혀서"가 아니다. create/read match를 추가하는 순간 그 블록 안에서
update/delete를 **명시적으로 `false`로 적어야** 불변 계약이 성립한다.

**주의 2 — `rebuild-admin-state`의 create 조건을 그대로 복사하면 안 된다.** 그 블록의 create는
`firestore.exists(/databases/(default)/documents/rebuildAdminStateObjects/$(objectId))`를 요구한다.
V2 asset에는 대응되는 REC 개념이 아직 없다(Q7 참조). 그대로 옮기면 항상 거부된다.

**주의 3 — 삭제를 열면 불변성 토대가 무너진다.** G-4 결정 문서 §3이 이미 기록한 사실이다:
create가 `resource == null`이므로 **객체를 지우는 순간 그 경로가 다시 생성 가능해진다.** GG-4의
"update/delete false"는 부가 조항이 아니라 create-only 논거의 전제다.

### Q2. `spaces/{token}` create가 GG-5 목표를 충족하는가

**충족하지 않는다. 세 항목 모두 미달이다.**

```
firestore.rules
match /spaces/{token} {
  allow read: if true;
  allow create: if true;          // ← 조건 0, payload 검증 0
  allow update, delete: if false; // ← 불변성만 충족
}
```

| GG-5=A 목표 | 현재 | 판정 |
|---|---|---|
| V2 create를 approved operator UID로 제한 | `if true` — **익명 포함 누구나** | **FAIL** |
| V2 outer keys를 exact로 제한 | `request.resource.data` 검증 **0** | **FAIL** |
| create-only(생성 후 불변) | `update, delete: if false` | **PASS** |
| V1 create 호환 유지 | 현재 그대로면 유지 | (변경 시 재검증 필요) |

**V1을 깨지 않고 V2만 분기할 수 있는가 — 근거상 가능하다.**
레거시 운영본이 실제로 쓰는 V1 payload에 **`schema: 'space-v1'` 리터럴이 항상 포함**된다
(`denn-mockup-tool.html:15573`). 승인된 V2 outer는 `{ schema: "space-v2", enc }` 정확히 2키다
(2026-08-20 결정 §2.1). 따라서 `request.resource.data.schema`가 두 경로를 가르는 분기 키로 성립한다.
개념적으로는 다음 형태다 — **작성·배포 승인 대상이 아니라 가능성 확인이다**:

```
// 개념 예시일 뿐. 이 조사에서 Rules를 작성하거나 변경하지 않았다.
allow create: if request.resource.data.schema == 'space-v2'
                ? (approvedV2Operator() && exactV2OuterKeys())
                : true;   // ← V1 및 schema 없는 기존 경로는 현행 유지
```

**그러나 남는 위험 3가지를 그대로 기록한다.**

1. **V2 사칭을 막을 수 있어도 V1 사칭은 못 막는다.** 공격자가 `schema:'space-v1'`로 임의 문서를
   만드는 길은 계속 열려 있다(현행과 동일). V2 제한은 **V2 provenance만** 준다.
2. **`allow read: if true`는 `get`과 `list`를 모두 연다 — 정적 결론.** Firestore Rules에서
   `read` = `get` + `list`이므로 **현행 규칙 문언상 `spaces` 컬렉션 열거가 허용된다.** 이는 근거가
   불충분한 추정(`UNCONFIRMED`)이 아니라 Rules 문언에서 직접 읽은 **정적 사실**이다.
   **다만 실제로 열거가 되는지는 실행하지 않았다 — `NOT TESTED`**(live/emulator 금지). 두 진술을
   한 단어로 섞지 않는다.
   내용은 암호화돼 있으므로 즉시 평문 노출은 아니지만, 토큰 비밀성에 의존하는 모델과 어긋나며
   **토큰 전량 수집 → 오프라인 사전공격 표면**이 된다. GG-5 계약을 여는 단위에서 함께 결정할 항목이다.
3. **실제 운영자 UID가 여전히 `UNCONFIRMED`다.** `storage.rules:35` · `firestore.rules:30,75`의
   placeholder가 그대로다. UID 정본 없이는 Rules를 배포할 수 없다(스펙 037 §9 / Founder G-1).

### Q3. 공개 SDK로 `bundle → asset upload → spaces/{token} create`를 구성할 때 exact 호출·오류 경계

**필요한 공개 API는 전부 설치본에 있다.** 최소 호출은 다음과 같다(구현 아님).

| 단계 | 호출 | 비고 |
|---|---|---|
| asset upload | `ref(storage, objectPath)` → `uploadBytes(ref, bytes, { contentType: 'image/png' })` | 비-resumable 단발. 성공 시 `UploadResult.metadata`(size/md5Hash/generation) 반환 |
| upload 판정용 read | `getMetadata(ref)` | Rules의 read 권한 필요 |
| document create | `doc(db, 'spaces', token)` → `setDoc(docRef, outer)` | **`setDoc`에 create-only 옵션이 없다.** 서버가 create/update를 판정하고 `update: if false`가 덮어쓰기를 거부한다 |
| document read-back | `getDocFromServer(docRef)` | **`getDoc`이 아니다** — 아래 참조 |

**오류 경계 — 이미 검증된 매핑을 근거로 삼을 수 있다.**
`packages/firebase/src/admin-write/errors.ts`가 정한 규율은 그대로 V2에도 적용 가능하다:

> *"확실히 서버에 저장되지 않았다는 뜻인 코드만 명확한 실패가 되고, 매핑되지 않은 것을 포함한 나머지
> 전부는 결과 미확정이 된다."*

| 확실한 실패로 볼 수 있는 storage 코드 | 결과 미확정으로 남겨야 하는 것 |
|---|---|
| `quota-exceeded`, `invalid-argument`, `invalid-checksum`, `invalid-format`, `cannot-slice-blob`, `bucket-not-found`, `project-not-found`, `no-default-bucket` | `retry-limit-exceeded`, `unknown`, `internal-error`, `canceled`, `server-file-wrong-size`, **그리고 매핑되지 않은 모든 코드** |
| 권한 계열: `unauthenticated` → 인증 필요, `unauthorized` → 거부 | — |

**★ `storage/unauthorized`의 의미가 V2에서 하나가 아니다.** create-only 경로에서 이 코드는
① 권한 없음 ② **이미 그 경로에 객체가 있어 덮어쓰기가 거부됨** 두 가지를 모두 뜻한다. admin-write의
주석이 같은 사실을 기록한다. V2에서는 assetId가 매 operation마다 새 UUID이므로 ②는 정상 흐름에서
발생하지 않아야 하지만, **재시도를 하면 곧바로 ②가 되어 판정이 모호해진다**(Q6).

Firestore 쪽은 `permission-denied` / `unauthenticated` / `invalid-argument` / `failed-precondition` /
`already-exists`를 확정 실패로, `deadline-exceeded` / `unavailable` / `cancelled` / `internal` /
`unknown` / 미매핑을 미확정으로 두는 기존 `classifyTransactionError` 분류가 그대로 유효하다.
다만 V2 create는 **transaction이 아니라 단발 `setDoc`**이라 `aborted`(경합 소진) 항목은 의미가 다르다.

**★ `getDoc` 대신 `getDocFromServer`가 필요한 이유 (보완 라운드 1에서 근거·용어 정정).**

**근거 — 설치된 `@firebase/firestore` 4.17.0 공개 타입 원문:**

- `dist/index.d.ts:2582-2595` (`setDoc` 문서 주석):
  반환 `Promise`는 *"does **not** resolve until the data is successfully written to the remote
  Firestore backend"* 이고 *"is not rejected until the remote Firestore backend reports an error"*
  이다. 오프라인이면 *"the returned `Promise` will not resolve for a potentially-long time"*.
  그리고 *"the given data **will** be immediately saved to the local cache and will be incorporated
  into future “get” operations as if it had been successfully written to the remote Firestore
  server, a feature of Firestore called “latency compensation”"*, 데이터는
  *"**eventually** be written to the remote Firestore backend once a connection can be established"*.
- `dist/index.d.ts:1386-1413` (`getDoc` / `getDocFromCache` / `getDocFromServer`):
  `getDoc`은 *"attempts to provide up-to-date data when possible by waiting for data from the server,
  but **it may return cached data** or fail if you are offline"*, `getDocFromServer`는
  *"Reads the document referred to by this `DocumentReference` **from the server**"*.

**따라서 server-only write outcome reconciliation에는 `getDocFromServer`가 필요하다** — 이 결론은
유지된다. `getDoc`은 캐시를 돌려줄 수 있고, 미commit pending write가 future get에 포함되므로
`snapshot.exists() === true`가 **서버가 받았다는 증거가 되지 못한다**.
`SnapshotMetadata.hasPendingWrites` / `fromCache`가 그 구분을 노출한다.

**★ 용어 정정 — "SDK가 로컬 timeout으로 실패 처리한다"는 표현을 폐기한다.**
위 원문대로 `setDoc`의 Promise에는 **SDK 자체의 timeout이 없다**: 서버가 성공/오류를 알려줄 때까지
resolve도 reject도 하지 않는다. 정확한 경계는 이것이다 — **앱이 자기 bounded timeout으로 기다림을
포기해도, 원 `Promise`와 local cache의 pending write는 그대로 남고 연결이 회복되면 서버에 기록된다.**
즉 "앱이 포기했다"와 "서버가 거부했다"는 전혀 다른 사건이며, 이것이 Q5·Q6의 미판정 규율과
스펙 037 §6.6의 *"timeout은 취소가 아니다"* 전제가 V2에도 그대로 적용되는 이유다.

**근거 수준 분리:** 위는 전부 **설치 SDK 공개 타입 문서의 API 동작 근거**다. 실제 앱 timeout /
오프라인 / 재연결 시나리오에서 `getDoc`이 pending write를 돌려주는지, `getDocFromServer`가 그때 어떤
오류를 내는지는 **emulator·runtime에서 실행하지 않았다 — `NOT TESTED`**.

**기존 `space-read/sdk-facade.ts`는 `getDoc`을 쓰고 `metadata`를 보지 않는다** — 읽기 전용 viewer
용도로는 문제가 없지만, **write outcome 판정에 그대로 재사용하면 안 된다.**

### Q4. 각 실패 지점에서 asset과 document가 남는 상태

Storage와 Firestore 사이에 **cross-service atomicity는 없다**(스펙 064 §5, 스펙 037 §6.4와 동일한 사실).
승인된 순서는 upload-first다: document-first는 upload 실패 시 **영구 dangling link**를 만들고,
upload-first는 orphan을 만들 수 있지만 **유효 document가 없는 asset을 가리키는 일**은 막는다.

```
bundle (token, descriptor, bytes, encrypted document)
   |
   +-- upload 명확 실패      -> asset 없음        · document 0 · 재시도 금지(수동 결정)
   +-- upload 결과 미확정    -> asset 있는지 모름 · document 0 · ★ 늦게 성공 가능
   +-- upload 성공
         |
         +-- create 명확 거부/실패 -> asset 존재 · document 없음 = 참조 없는 asset
         +-- create 결과 미확정    -> asset 존재 · document 상태 미판정 · ★ 늦게 성공 가능
         +-- create 성공           -> asset 존재 · document 존재 · link 발급 가능
```

| 상황 | asset | document | 안전한 진술 |
|---|---|---|---|
| upload 명확 실패 | 없음 | 없음 | 아무것도 남지 않았다 |
| upload 결과 미확정 | **미판정** | 없음 | "지금 없다"는 "영원히 없다"가 아니다 |
| upload 성공 → create 명확 거부 | 존재 | 없음 | asset은 참조되지 않는다(문서 자체가 없다) |
| upload 성공 → create 결과 미확정 | 존재 | **미판정** | document는 늦게 생길 수 있다 |
| upload 성공 → create 성공 | 존재 | 존재 | 정상 |
| 브라우저 종료·탭 종료 | 미판정 | 미판정 | 진행 중이던 요청의 서버 도달 여부를 알 수 없다 |
| 인증 만료 | 시점에 따라 다름 | 시점에 따라 다름 | `unauthenticated`는 확정 실패로 읽을 수 있으나 **직전 요청의 결과는 별개** |
| 중복 탭 | 각 탭이 **다른 UUID 쌍**을 만든다 | 각각 다른 token | 서로 덮어쓰지 않는다. 대신 **중복 asset·중복 link**가 생긴다 |

**시간 경과만으로 미판정이 안전한 orphan으로 바뀐다고 단정하지 않는다.** 이는 스펙 073 §4의 요구이자
G-4 결정 문서 §7.1이 이미 확정한 사실이다: 개별 transaction의 공식 상한은 존재하지만
**호출 전체의 벽시계 상한은 `UNCONFIRMED`**다. 여기에 이번 조사가 측정한
**Storage 업로드 재시도 10분(`DEFAULT_MAX_UPLOAD_RETRY_TIME`)**이 더해진다.

### Q5. upload/create outcome을 읽기 전용으로 판정할 수 있는가

**upload outcome — 판정 가능성이 높지만 `UNCONFIRMED`.**

논거: assetId가 매 operation마다 새로 만든 UUID v4이고 경로가 create-only이므로
**그 경로에 객체가 있다면 그것은 이번 operation이 올린 것 외에 다른 설명이 없다.**
`getMetadata(ref)`가 반환하는 `size`를 bundle의 `byteLength`와, 필요하면 `md5Hash`를 로컬 계산값과
대조하면 "정확히 이 bytes가 올라갔다"까지 갈 수 있다.

| 관측 | 판정 |
|---|---|
| `getMetadata` 성공 + `size` 일치 (+ `md5Hash` 일치) | **upload 성공 확정** |
| `getMetadata` 성공 + size/hash 불일치 | 계약 위반 — fail-closed (자동 수정 금지) |
| `storage/object-not-found` | **"아직 없다". "영원히 없다"가 아니다** → 미판정 유지 |
| `getMetadata` 실패·timeout | 미판정 |

**`UNCONFIRMED`로 남기는 이유 4개:**

1. **`getMetadata`가 read 권한을 요구하는데 현재 그 경로의 read는 거부다**(Q1). Rules를 열기 전에는
   이 판정 자체가 불가능하다.
2. **`md5Hash`가 항상 채워진다는 보장을 확인하지 못했다.** 타입상 `md5Hash?: string | undefined`로
   optional이다. 실제 GCS 응답에 항상 존재하는지는 **live/emulator 미검증**.
3. **Storage 클라이언트 캐시 유무를 확인하지 못했다.** Firestore와 달리 Storage read 경로의
   캐시 동작을 이번 조사에서 근거로 확정하지 못했다.
4. **`object-not-found` 관측 후 늦게 도착하는 업로드**를 배제할 근거가 없다.

**Firestore create outcome — 판정 가능하되 조건부.**

token이 이번 operation의 새 UUID이고 `spaces/{token}`은 `update: if false`이므로
**그 문서가 존재하고 내용이 우리가 만든 outer와 정확히 같다면 이번 create가 성공한 것**이다.

| 관측 (`getDocFromServer` 기준) | 판정 |
|---|---|
| 존재 + outer가 우리 document와 exact 일치 | **create 성공 확정** |
| 존재 + 불일치 | **token 충돌 또는 계약 위반** — fail-closed. 자동 재발급 금지 |
| 부재 | **"아직 없다"** → 미판정 |
| read 실패·timeout | 미판정 |

**조건: 반드시 `getDocFromServer`여야 하고, `getDoc` + `hasPendingWrites` 무시는 거짓 성공을 만든다**(Q3).
그리고 **부재 관측은 확정 실패가 아니다** — 앱이 bounded timeout으로 기다림을 포기해도 원 `Promise`와
pending write가 남아 연결 회복 시 서버에 기록된다(`index.d.ts:2582-2595`). 스펙 037 §6.6의
*"timeout은 취소가 아니다"* 전제가 여기에도 그대로 적용된다.

### Q6. 결과 미확정에서 자동 retry / 같은 경로 재업로드 / 새 token 발급

| 행동 | 안전한가 | 근거 |
|---|---|---|
| **자동 retry (upload·create 공통)** | **위험** | 미확정은 "실패"가 아니다. 원 요청이 늦게 성공하면 재시도분과 합쳐 **중복 부작용**이 생긴다. admin-write가 모든 `*_OUTCOME_UNKNOWN`을 `retryable: false`로 못박은 이유와 동일하다 |
| **같은 경로 재업로드 (동일 assetId)** | **파괴적이지는 않으나 판정을 망친다** | create-only가 서버에서 막으므로 bytes는 안전하다. 그러나 결과가 `storage/unauthorized`로 돌아오는데, 이는 "이미 존재"와 "권한 없음"이 **구분되지 않는 코드**다(Q3). 즉 재업로드는 **안전 확인 수단이 될 수 없다** |
| **같은 token 재create** | **파괴적이지 않으나 마찬가지로 모호** | 첫 create가 성공했다면 두 번째는 update로 평가돼 `permission-denied`. 실패했다면 create로 평가돼 성공. **같은 코드가 정반대 사실을 뜻할 수 있다** |
| **새 UUID로 재업로드 (새 assetId)** | 기술적으로 안전, **비용·orphan 증가** | 서로 다른 경로라 충돌 0. 대신 미판정 asset이 그대로 남고 정리 수단이 없다(Q7) |
| **새 token 발급** | **제품 의미가 위험** | 원 create가 늦게 성공하면 **같은 시안을 가리키는 link가 두 개** 생긴다. 둘 다 불변이라 회수할 수 없다 |
| **읽기 전용 1회 판정 (Q5)** | **권장 방향** | 부작용 0. admin-write의 bounded reconciliation과 같은 규율 |

**결론: "미확정 → 자동 복구"는 어느 경로로도 안전하지 않다. 안전한 것은 읽기 전용 판정 1회와,
그 결과가 미판정이면 사람에게 넘기는 것뿐이다.**

### Q7. ★ orphan과 미판정 object를 구분할 수 있는가 — **admin-state의 논거가 옮겨가지 않는다**

**핵심 발견: V2에서는 서버가 asset↔document 관계를 볼 수 없다.**

admin-state에서 SDC′가 성립한 이유는 **head 문서가 `recId`를 평문 필드로 들고 있고, Rules가
`firestore.get()`으로 그것을 읽을 수 있었기** 때문이다(G-4 결정 §5, §8.2).

V2는 구조가 다르다. 2026-08-20 결정 §2.1이 확정한 outer document는 **정확히 `schema`와 `enc` 두 키**이고,
`proofAsset.objectPath`는 **암호화된 `space-scene-v2` 안**에 있다. 즉:

- outer document에 asset path가 **없다** — 있으면 안 된다(승인된 계약이 금지한다).
- Rules는 **ciphertext를 복호화할 수 없다**.
- ⇒ **`firestore.get()`으로도 "이 asset을 참조하는 document가 있는가"를 물을 수 없다.**

| G-4 admin-state | space V2 |
|---|---|
| 가변 head 1개가 현재 참조를 가리킨다 | **가변 pointer가 없다.** 모든 document가 독립·불변 |
| head가 `recId`를 **평문**으로 들고 있다 | 참조가 **암호문 안**에 있다 |
| `head.revision > REC.claimedBase + 1`이 P2(과거 정상본)를 확정한다 | **대응되는 단조 증가 값이 없다** |
| P3(미판정)가 조건 불성립으로 자동 보호된다 | 보호할 조건 자체를 쓸 수 없다 |

**따라서 승인된 outer document만으로는 asset orphan과 미판정 object를 서버에서 구분할 수 없다.**
클라이언트도 마찬가지다 — 자기가 방금 만든 token/assetId 쌍은 알지만, **과거 issue의 쌍을 되찾을
경로가 없다**(운영자가 링크를 따로 보관하지 않는 한).

**G-4 정책과 충돌하는가 — 충돌하지 않는다. 오히려 더 보수적인 쪽으로 자동 귀결된다.**
Founder D-2=O-3(삭제 보류)이 현재 정본이고, delete 권한도 자동 정리 주체도 만들지 않았다. V2에서
식별 근거가 더 약하므로 **삭제 보류가 유일하게 성립하는 기본값**이다. 다만 **비용은 단조 증가**하며
그 상한은 `UNCONFIRMED`다(실제 PNG 크기·발급량 미확정, 스펙 064 §10).

#### Q7.1 ★ 정정 — private write-once mapping/REC 후보 (보완 라운드 1)

**이 조사의 초판은 "asset↔token 매핑을 두면 토큰 비밀성이 반드시 깨진다"고 단정했다. 그 단정을
폐기한다(라운드 1).** 그 문장은 매핑이 **클라이언트에게 읽히는 경우**에만 참이고, 매핑 문서의
클라이언트 `read`(= `get` + `list`)를 **모두 거부**하면 성립하지 않는다.

위에서 유지되는 결론은 **좁혀진 형태**다: *승인된 V2 outer document(`schema`/`enc` 2키)의 암호문만
가지고는 Rules가 asset↔document 관계를 볼 수 없다.* 별도 매핑 문서를 도입하면 그 관계 자체는 서버가
볼 수 있게 된다. **아래는 그 후보의 분석이지, 안전성 PASS도 구현·Rules·schema·backend 승인도 아니다.**

##### Q7.1.0 ★ cross-service read primitive — 근거 등급 (라운드 2 정정)

라운드 1은 이 primitive 자체를 `UNCONFIRMED`로 남겼다. **그 분류는 틀렸다.** 이 저장소에는 공식 문서
인용보다 **강한 local 실행 증거**가 이미 있다. 네 층위를 분리해 기록한다.

| 층위 | 상태 | 근거 |
|---|---|---|
| **① Firebase 공식 API 지원** — Storage Rules에서 `firestore.get()` / `firestore.exists()` 사용 | **지원됨(공식)** | G-4 결정 정본 §4가 `firebase.google.com/docs/storage/security/rules-conditions`를 직접 인용: *"Using the `firestore.get()` and `firestore.exists()` functions, your security rules can evaluate incoming requests against documents in Cloud Firestore."* 같은 §4가 제약 4개(default DB 한정 · **단일 평가 문서 2개** · Firestore quota/과금 포함 · IAM 활성화/해제)도 인용한다 |
| **② 이 저장소의 admin-state primitive** — client `read:false`인 Firestore 문서를 Storage Rules가 조회해 create를 게이팅 | **local emulator VERIFIED** | `storage.emulator.rules:40-45`가 `firestore.exists(/databases/(default)/documents/rebuildAdminStateObjects/$(objectId))`로 create를 게이팅하고, `firestore.emulator.rules:71-86`이 같은 REC 컬렉션에 `allow read, update, delete: if false`를 건다. `packages/firebase/src/admin-write/cutover-rules.emulator.test.ts:83-96`이 **REC을 먼저 `setDoc`한 뒤 Storage upload가 성공**하고, 같은 경로 재업로드·`deleteObject`·비승인 UID가 거부됨을 `demo-denn-emulator`에서 검증한다. G-4 결정 정본 §12가 2026-08-14 **13/13 PASS**를 기록한다 |
| **③ V2 전용 mapping Rules** | **미작성 · `NOT TESTED`** | V2용 mapping 컬렉션도, `rebuild-space-assets` match도 존재하지 않는다 |
| **④ 실제 Firebase / IAM / live** | **`NOT TESTED`** | G-4 §12가 "실제 Firebase·IAM·배포는 NOT TESTED"로 이미 기록. 이번 단위도 live 접근 금지 |

**②가 말해 주는 것을 정확히 쓴다.** 그 emulator 시나리오에서 Storage create 규칙은 REC의 존재를
요구했고 **upload는 성공했다.** REC의 Firestore 규칙은 client `read`를 `false`로 닫아 두었다. 따라서
**Storage Rules의 service-side cross-product 평가는 대상 문서의 Firestore *클라이언트* read 권한에
좌우되지 않는다** — 이것이 실행으로 확인된 사실이다.

> **용어 주의:** 이것은 권한 "우회(bypass)"가 아니다. **Firestore client read 권한**은 클라이언트
> 요청이 그 문서를 읽을 수 있는지를 정하고, **Storage Rules의 `firestore.get()/exists()`** 는 규칙
> 평가 과정에서 서비스가 수행하는 별개의 조회다. 두 축은 서로 다른 주체·다른 평가 경로이며,
> 라운드 1이 쓴 "read 거부를 우회한다"는 표현은 오해를 부르므로 폐기한다.

**단, ②는 `.json` admin-state 경로에 대한 검증이고 이번 세션에서 재실행하지 않았다**(emulator 실행
금지). 기록된 PASS와 테스트 소스를 근거로 삼는다. V2 mapping은 ③대로 여전히 미작성·`NOT TESTED`다.

**후보 V2-2′ — client-denied write-once mapping**

| 항목 | 분석 |
|---|---|
| **키 후보 (a) doc id = `assetId`, field = `token`** | Storage Rules는 object path에서 `assetId`만 안다. 그래서 매핑은 **assetId로 조회 가능**해야 한다. 단점: 두 번째 조회를 하려면 첫 조회 결과의 `token`을 경로에 **연쇄 보간**해야 한다(아래 참조) |
| **키 후보 (b) doc id = `assetId`, field = opaque `linkId`** | token을 문서에 담지 않아도 된다. 대신 `spaces` 생성과 별개인 제3의 문서가 필요해 원자성 경계가 하나 더 늘어난다 |
| **키 후보 (c) doc id = opaque `recId`** | 라운드 1은 "성립하지 않는다"고 확정했다. **그 확정을 폐기하고 §Q7.1.1에서 (c1) transform-0 · (c2) customMetadata pointer로 나눠 다시 분석한다.** |
| **create 권한** | 기존 `rebuildAdminStateObjects`와 같은 형태로 `approvedOperator() && create-only && exact keys` 가능. 근거: 현행 `firestore.rules`의 REC 블록이 이미 그 형태다 |
| **클라이언트 get/list 거부** | `allow read, update, delete: if false` — 현행 REC 블록이 **이미 그렇게 되어 있다**(`firestore.rules`). 즉 "private mapping"은 이 저장소에 **선례가 있는 형태**다 |
| **Storage create 게이팅** | 기존 asset create 규칙에 `firestore.exists(mapping)`을 걸면 매핑 없는 stray 업로드를 서버가 막는다. 이때 **문서 접근 1개**를 소비한다 |
| **`spaces` create와의 결합 — 순차** | 매핑을 먼저 commit → upload → `spaces` create. crash 시 **매핑만 남는다**(해당 경로는 소각되고 asset은 있을 수도/없을 수도). G-4 §6의 구조 A와 같은 성질이다 |
| **`spaces` create와의 결합 — 원자(`getAfter`)** | 매핑 create와 `spaces` create를 **같은 Firestore transaction/batch**에 넣고 `spaces` 규칙이 `getAfter(mapping)`으로 동반 쓰기를 강제하는 형태. G-4 §6이 `getAfter()` 공식 근거를 이미 기록했다. 대가도 동일하다 — **upload 시점에 매핑이 아직 없으므로 Storage create 게이팅이 불가능**하다 |
| **Storage Rules 문서 접근 한도** | G-4 결정 §4가 인용한 공식 제약: **단일 Rules 평가에서 Firestore 문서 최대 2개**. delete 규칙이 `get(mapping)` + `exists(spaces/{token})`를 하면 **정확히 2개, 여유 0**이다. 여기에 create 게이팅용 접근은 **다른 평가**라 따로 계산된다 |
| **비용** | 같은 §4: Storage Rules의 Firestore 읽기는 **프로젝트 Firestore quota·과금에 포함**된다. 발급 1건당 Firestore 쓰기 1회가 추가되고, delete 평가마다 읽기 2회가 추가된다 |
| **기본 DB 제약** | 같은 §4: Storage Rules는 **default Firestore database**만 읽는다 |
| **IAM** | 같은 §4: 두 제품 연결에 IAM 권한 활성화가 필요하고 role 제거로 비활성화된다 |

##### Q7.1.1 ★ REC ID 후보 — 라운드 2 정밀화

라운드 1은 *"opaque recId는 성립하지 않는다 — GG-4=A가 path를 `{assetId}.png`로 고정했으므로 Storage
segment가 곧 assetId다"* 라고 썼다. **두 가지가 부정확했다.**

첫째, Storage Rules `match /rebuild-space-assets/objects/{assetId}`에서 wildcard가 잡는 값은 **bare
UUID가 아니라 마지막 세그먼트 전체, 즉 `"<uuid>.png"`** 다. admin-state에서 `objectId`가
`"<uuid>.json"`이었던 것과 정확히 같은 구조이며, G-4 결정 §8.1이 바로 이 혼동을 **라운드 2 교정
3**으로 이미 한 번 바로잡은 지점이다. 둘째, "추가 metadata가 없다면"이라는 전제를 빠뜨렸다.

**(c1) transform-0 — object segment 자체를 REC document ID로 사용**

| 항목 | 분석 |
|---|---|
| 형태 | REC doc id = Storage segment 그대로 = **`"<uuid>.png"`**. Storage Rules는 `$(assetId)` 변수를 **변환 없이** 보간해 `firestore.get/exists(/databases/(default)/documents/<mappingCollection>/$(assetId))` |
| 선례 | **admin-state G-4 §8.2가 확정한 바로 그 패턴**이다(`"<uuid>.json"`). 문자열 파싱·분해·연결 **0** — G-4 §8.4가 "공식 지원을 확인하지 못한 문자열 함수는 설계에 넣지 않는다"고 정한 원칙을 그대로 지킨다 |
| 근거 등급 | 이 조회 패턴 자체는 **§Q7.1.0 ②로 local emulator VERIFIED**(`.json` 경로에서). V2 mapping은 **미작성 · `NOT TESTED`** |
| 형식 검증 | `recId.matches('^[0-9a-f]{8}-…-[0-9a-f]{12}[.]png$')` 형태로 Firestore 쪽에서 강제 가능. 현행 `firestore.rules:76-79`가 `.json` 버전을 이미 그렇게 한다 |
| 한계 | doc id가 곧 assetId이므로 **opaque하지 않다.** assetId는 public-read object path에 이미 들어 있어 비밀이 아니므로 **식별 목적에는 문제가 없다.** 다만 "assetId와 독립인 recId"를 원한 목적은 달성하지 못한다 |

⇒ **(c1)은 성립한다.** 라운드 1의 "성립하지 않는다"는 **틀렸다.**

**(c2) assetId와 독립인 opaque recId — Storage `customMetadata` pointer**

Storage Rules가 assetId만으로는 독립 recId를 알 수 없으므로, **object 자신이 pointer를 들고 있어야**
한다. 설치 SDK가 그 자리를 제공한다.

**근거 (정확한 설치 소스 경로·행):**

```text
node_modules/.pnpm/@firebase+storage@0.14.4_@firebase+app@0.16.0/node_modules/
  @firebase/storage/dist/storage-public.d.ts
```

- `:500` — `uploadBytes(ref, data, metadata?: UploadMetadata): Promise<UploadResult>` — **업로드
  호출이 metadata를 함께 받는다.**
- `:515` — `UploadMetadata extends SettableMetadata`
- `:277`, `:301-303` — `SettableMetadata.customMetadata?: { [key: string]: string } | undefined`
  (*"Additional user-defined custom metadata."*)
- `:56` — `FullMetadata extends UploadMetadata` — 즉 **`getMetadata()`가 돌려주는 값에
  `customMetadata`가 포함된다.**

| 항목 | 분석 |
|---|---|
| create와 metadata의 동일 upload 포함 | **가능하다.** `uploadBytes`의 세 번째 인자로 `contentType`과 `customMetadata`를 **같은 호출**에 넣는다. 별도 `updateMetadata` 호출이 필요 없다 — 이는 중요하다. `updateMetadata`로 나중에 붙이면 그 사이 창이 생기고, 애초에 update를 열면 불변 계약이 깨진다 |
| Rules 표면 | create 시 `request.resource.metadata.<key>`, 이후 평가 시 `resource.metadata.<key>`로 읽는 형태가 필요하다. **이 저장소에는 metadata를 읽는 Rules가 하나도 없다**(`storage.rules`·`storage.emulator.rules` grep 0건). 공식 지원 여부·정확한 접근자 이름을 이번 세션에서 확인하지 못했다 — **`UNCONFIRMED`** |
| exact key/format | `customMetadata`는 `Record<string, string>`이므로 값은 **문자열뿐**이다. recId 형식 강제는 Rules 정규식으로 해야 하고, 허용 키를 정확히 고정하지 않으면 임의 키가 실린다 — **exact-keys 검증 설계 필요** |
| mapping ↔ assetId 일치 | recId가 assetId와 독립이면 **"이 object의 recId가 진짜 이 object의 것인가"** 를 서버가 확인해야 한다. mapping 문서에 assetId를 되담아 교차 확인하는 형태가 필요하고, 그러면 조회가 늘어난다 |
| access-call 예산 | delete 규칙에서 `get(mapping(recId))` + `exists(spaces/{token})` = **2개, 여유 0**(§Q7.1.0 ① 제약). 여기에 assetId 교차 확인까지 넣으면 **한도를 넘는다**. (c1)은 metadata 조회가 없어 같은 2개 안에서 끝난다 |
| **★ public-read 관측 가능성** | GG-4=A는 이 object를 **public-read**로 만든다. `FullMetadata extends UploadMetadata`(`:56`)이므로 **경로를 아는 누구나 `getMetadata()`로 `customMetadata`를 읽을 수 있다.** 따라서 **recId를 비밀로 취급할 수 없고, token을 customMetadata에 넣는 것은 명백히 금지**다. opaque recId를 넣더라도 그것은 **공개 식별자**다 |
| update/delete | 불변 계약을 지키려면 `updateMetadata`도 서버에서 막아야 한다. 현행 목표 문구는 object update/delete만 말하고 **metadata update는 언급하지 않는다** — 계약 공백 |
| 승인 상태 | **GG-4=A는 metadata schema를 승인한 적이 없다.** 이 후보는 **미승인 schema/Rules 확장**이며 **미작성 · `NOT TESTED`** |

⇒ **(c2)는 논리상 가능하지만 (c1)보다 명백히 비싸고 위험하다** — Rules metadata 표면이
`UNCONFIRMED`, access-call 예산 초과 위험, public-read 관측으로 recId가 비밀이 될 수 없음, metadata
불변성 계약 공백, 그리고 GG-4 미승인 schema 확장. **path만 보고 "불가능"이라고 단정하지 않되,
"가능하다"가 "권장" 또는 "안전 PASS"를 뜻하지도 않는다.**

**★ 두 후보 모두에 남는 것:** (c1)이든 (c2)든 **확정 orphan을 증명하지 못한다.** REC ID를 어떻게
정하든 아래 §의 단조값 부재 문제는 그대로다.

**★ 결정적 한계 — 이 후보만으로는 "확정 orphan"을 증명하지 못한다.**

매핑이 있으면 서버가 *"이 asset의 token에 해당하는 `spaces` 문서가 지금 존재하는가"* 를 **물을 수는
있다**. 그러나 그 답이 "없다"일 때 **"영원히 없을 것"이 따라 나오지 않는다.**

- 설치 `@firebase/firestore` 4.17.0 `dist/index.d.ts:2582-2595`가 명시한다 — `setDoc`의 데이터는
  로컬 캐시에 즉시 저장되고 *"will **eventually** be written to the remote Firestore backend once a
  connection can be established."* 즉 **늦은 성공이 API 계약상 정상 경로**다.
- admin-state에서 SDC′가 통했던 이유는 **`head.revision`이라는 단조 증가값**이 있어
  `head.revision > claimedBase + 1`이 되는 순간 **그 transaction이 CAS에서 이길 수 없음이 확정**됐기
  때문이다(G-4 결정 §5 증명 ③④⑤).
- **V2에는 대응되는 단조값이 없다.** `spaces/{token}` create는 token이 고유한 한 **언제 도착해도
  성공한다.** 늦은 성공을 무효화하는 조건이 구조상 존재하지 않는다.

⇒ **매핑은 "관계를 볼 수 없다"는 장벽은 치우지만, "미판정과 orphan을 가르는" 장벽은 그대로 남긴다.**
이를 닫으려면 늦은 create를 서버가 거부하게 만드는 **추가 설계**(예: 발급 epoch/seal 문서와
`spaces` create 규칙의 결합)가 필요하며, **그 설계는 이 조사 범위 밖이고 분석되지 않았다**.

**UNCONFIRMED (이 후보와 관련해 근거를 확보하지 못한 것):**

- ~~Rules 안의 `get()/exists()`가 대상 문서의 `allow read` 거부를 우회하는지~~ — **라운드 2에서
  분류를 고쳤다.** primitive 자체는 `UNCONFIRMED`가 아니라 **공식 지원 + 이 저장소 local emulator
  VERIFIED**다(§Q7.1.0). 남는 미확인은 **V2 전용 mapping Rules(미작성·`NOT TESTED`)**와
  **실제 Firebase/IAM/live(`NOT TESTED`)**뿐이다.
- **연쇄 경로 보간** — `firestore.exists(/databases/(default)/documents/spaces/$(firestore.get(mappingPath).data.token))`
  처럼 **한 조회 결과를 다른 조회 경로에 보간**하는 것이 Storage Rules에서 지원되는지 확인하지 못했다.
  현행 규칙들은 `request.resource.data.recId`나 path 변수(`$(objectId)`)만 보간하며,
  admin-state SDC′도 **고정 경로(HEAD)와 path 변수(`$(objectId)`)만** 써서 연쇄를 한 번도 쓰지
  않았다 — 즉 §Q7.1.0 ②의 VERIFIED 증거는 **연쇄 보간까지 덮지 않는다** — **UNCONFIRMED**.
  지원되지 않으면 "asset → token → spaces" 2단 조회가 성립하지 않고 매핑 설계를 다시 해야 한다.
- **Storage Rules의 object metadata 접근**(`request.resource.metadata` / `resource.metadata`)의
  공식 지원 여부와 정확한 접근자 — 이 저장소에 선례가 **0건**이다(§Q7.1.1 (c2)) — **UNCONFIRMED**.
- 매핑 도입 시 **Firestore 쓰기·읽기 증가분의 실제 비용** — **UNCONFIRMED**(발급량 미확정).
- 위 후보의 어떤 규칙도 **작성·실행되지 않았다** — **NOT TESTED**.

**보안 측면의 정확한 진술 (라운드 2에서 재정정):**

client-denied 매핑은 **일반 클라이언트에게 token이나 관계를 노출하지 않는다** — 이 부분은 유지된다.
초판이 두 사안을 결합해 "보안 모델 충돌"이라고 단정한 것도 여전히 과장이었다.

**그러나 라운드 1이 덧붙인 *"버킷 객체 자체와 같은 신뢰 수준이므로 새로운 노출 경로는 아니다"* 는
단정도 폐기한다.** 근거가 없다.

- private mapping은 **token 또는 asset↔document 관계를 평문으로 담는 별도 Firestore persistence**다.
  지금 V2 설계에서 그 관계는 **어디에도 평문으로 존재하지 않는다**(암호문 안에만 있다). 매핑을 두는
  순간 **없던 평문 사본이 생긴다.**
- 그 사본에는 **Firebase console · Admin SDK · service account · IAM**이라는 **별도 접근 표면**이
  따라붙는다. Storage bucket 접근 주체와 Firestore 접근 주체가 **정확히 같은 principal/role 집합인지
  이 조사에서 확인하지 않았다** — 프로젝트 IAM 구성을 읽지 않았고 읽을 수도 없다(live 접근 금지).
- ⇒ 정확한 진술은 이것이다: **private mapping은 새로운 privileged plaintext surface를 만든다.
  그 표면이 기존 bucket 접근 표면과 겹치는 정도는 `UNCONFIRMED`다.**

**이 사실만으로 후보를 금지하지도, 승인하지도 않는다.** 이는 Founder가 판단할 **보안 tradeoff**다 —
얻는 것은 서버 측 관계 조회(그리고 stray upload 차단), 내주는 것은 관계의 평문 사본과 그에 딸린
접근 표면이다. JJ-5에 그대로 반영했다.

**선택지 (수정) — 이 조사는 어느 쪽도 권고하지 않는다:**

| 선택지 | 필요한 것 | 무엇을 주는가 | 무엇을 주지 못하는가 |
|---|---|---|---|
| **V2-1 삭제 보류 유지 (현재 기본값·D-2=O-3)** | 없음 | 오삭제 위험 0 | 비용 단조 증가(상한 `UNCONFIRMED`) |
| **V2-2′ client-denied write-once mapping** (REC ID는 §Q7.1.1 (c1) transform-0 권장 형태) | 매핑 컬렉션 + `firestore.rules`·`storage.rules` 양쪽 + 발급당 Firestore 쓰기 1회 + IAM 연결 | 서버가 asset↔document **관계를 물을 수 있게 된다**. stray upload 서버 차단도 가능. 조회 primitive 자체는 **공식 지원 + 이 저장소 local emulator VERIFIED**(§Q7.1.0) | **확정 orphan 증명은 못 한다**(늦은 create를 무효화하는 단조 조건 부재). 연쇄 보간 지원 `UNCONFIRMED`, 문서 접근 한도 2 여유 0, **없던 privileged plaintext surface가 새로 생기고 bucket 접근 주체와의 overlap은 `UNCONFIRMED`** |
| **V2-2″ (c2) 독립 opaque recId + `customMetadata` pointer** | 위 + object metadata schema + Rules metadata 검증 | assetId와 독립인 식별자 | (c1)보다 비싸고 위험: Rules metadata 표면 `UNCONFIRMED`, access-call 예산 초과 위험, **public-read라 recId가 공개 관측됨**, metadata 불변성 계약 공백, **GG-4 미승인 schema 확장** |
| **V2-3 backend/Admin SDK 판정** | C6/G-3 재개, 서비스 계정, 함수 배포·과금 | 임의 판정 로직 가능 | 규칙이 틀리면 자동으로 손해. 여전히 "늦은 성공" 문제를 스스로 풀어야 한다 |

> **가능한 후보라는 사실은 삭제 승인도, Rules/schema/backend 구현 승인도, 안전성 PASS도 아니다.**
> V2 mapping Rules는 어느 형태든 **미작성 · `NOT TESTED`이고 핵심 한계(확정 orphan 미증명)가
> 미해결**이다. §Q7.1.0 ②가 VERIFIED로 올라간 것은 **admin-state의 `.json` primitive**이지 V2
> mapping이 아니다 — 둘을 같은 칸에 적지 않는다.

### Q8. admin-write C5 port 재사용 가능 범위

**재사용 가능 (패턴·규율 — 직접 import가 아니라 동일 형태로 다시 세우는 것):**

| 항목 | 근거 |
|---|---|
| 오류 매핑 규율 — "확실한 실패만 실패, 나머지 전부 미확정" | `errors.ts` `mapUploadError` 기본 분기 |
| 미확정 코드를 `retryable: false`로 못박기 | `WRITE_CODE_META` |
| 안전 오류 envelope — `correlationId` 외 식별 정보 0, raw message/uid/path/bytes 비노출 | `SafeAdminWriteError` |
| facade 주입 경계 — SDK를 factory 안 dynamic import, unit은 synthetic fake | `sdk-facade.ts` 상단 |
| **`demo-` project prefix 가드 — SDK import 전에 검사** | `sdk-facade.ts` `DEMO_PROJECT_PREFIX` |
| emulator 하네스 — 환경변수 fail-closed, 운영 project id 금지 | `emulator-env.ts` |
| emulator Rules 사본 — 운영본과 **UID 한 줄만** 다르게 유지 | `storage.emulator.rules` diff |
| 단일 비행(`saveInFlight`) — 자동 재시도는 막고 수동 재시도는 허용 | `write-port.ts` |
| create-only 불변 논거와 20 MiB 로컬 사전 검사 | `REBUILD_OBJECT_MAX_BYTES` |
| root barrel 재수출 금지(고객 번들 SDK 유입 차단) | `packages/firebase/src/index.ts` |

**재사용 불가 (admin state 전용):**

| 항목 | 이유 |
|---|---|
| `HEAD_*` 상수·`validateHead`·head CAS transaction | **V2에는 가변 head가 없다.** 모든 document가 독립 불변 |
| REC(`createObjectClaim`) · `OBJECT_CLAIM_COLLECTION_ID` | claimedBase는 revision 단조성에 묶인 개념. V2에 revision이 없다 |
| `AdminStateWritePort` / `AdminStateSaveRequest` / `AdminStateBaselineValue` | catalog·revision 전용 타입 |
| `loadBaseline` / `expectedBase` 전제 | V2 issue는 baseline을 읽지 않는다 |
| `REBUILD_OBJECT_PREFIX` · `REBUILD_OBJECT_PATH_PATTERN` · `REBUILD_OBJECT_CONTENT_TYPE` | `.json` / `rebuild-admin-state/`. V2는 `.png` / `rebuild-space-assets/` |
| `runHeadTransaction` 및 `classifyTransactionError`의 `aborted` 분기 | V2 create는 단발 `setDoc`이라 transaction 경합 개념이 없다 |
| **`space-read`의 `getDoc` facade를 write 판정에 재사용** | Q3 — 캐시/pending write로 **거짓 성공**. 판정에는 `getDocFromServer` 필요 |
| **app 소유권 규칙을 그대로 복사** | admin-write는 DEFAULT app, space-read는 named `denn-space-viewer`. V2 issuer는 admin 셸에서 도는 **쓰기**이므로 DEFAULT(운영자 세션)여야 한다. 두 규칙을 섞으면 **운영자가 로그인하지 않은 세션으로 쓰기가 나갈 수 있다** |

### Q9. 다음 단위의 최소 파일 후보 · error code 후보 · 검증표

> **후보다. 승인이 아니다.** 이 조사에서 아무 파일도 만들거나 고치지 않았다.

**파일 후보 (Rules를 여는 단위와 adapter 단위는 분리하는 편이 안전하다):**

| 단계 | 파일 | 성격 |
|---|---|---|
| R. Rules | `storage.rules`(V2 asset match 신설) · `firestore.rules`(V2 create 분기) · 동일 내용 emulator 사본 2개 | **G-1 재개 + 실제 UID 정본 필요** |
| A. local port | `packages/firebase/src/space-write/**` 신규 (facade·types·errors·write-port·unit) | fake 기반, network 0 |
| B. SDK adapter | 위 안의 `sdk-facade.ts` | dynamic import + `demo-` 가드 |
| E. emulator gate | `packages/firebase/src/space-write/rules.emulator.test.ts` | `pnpm test:emulator`로만 |
| C. composition | `apps/admin/src/space-v2/**` 또는 `admin-composition` 연결 | **UI 연결은 별도 단위** |

**error code 후보 (admin-write 규율을 따르되 이름은 V2로 분리):**

```
SPACE_V2_ISSUE_INVALID_INPUT        // bundle/port 형식 위반. 네트워크 호출 0
SPACE_V2_ISSUE_AUTH_REQUIRED        // 운영자 미인증. upload/create 0
SPACE_V2_ISSUE_FORBIDDEN            // 서버 거부(권한 또는 create-only 위반)
SPACE_V2_ISSUE_UPLOAD_FAILED        // 확실히 저장되지 않음
SPACE_V2_ISSUE_UPLOAD_OUTCOME_UNKNOWN   // retryable:false
SPACE_V2_ISSUE_DOCUMENT_FAILED      // create 확정 거부/실패
SPACE_V2_ISSUE_DOCUMENT_OUTCOME_UNKNOWN // retryable:false
SPACE_V2_ISSUE_ASSET_MISMATCH       // read-back size/hash 불일치 — fail-closed, 자동 수정 0
```

**synthetic fake 검증표 후보 (network 0):**

| # | 시나리오 | 기대 |
|---|---|---|
| F-1 | upload 성공 → create 성공 | ok, 호출 각 1회 |
| F-2 | upload 확정 실패 | `UPLOAD_FAILED`, **create 호출 0** |
| F-3 | upload 미확정 | `UPLOAD_OUTCOME_UNKNOWN`, create 0, retry 0, `retryable:false` |
| F-4 | upload 성공 → create 확정 거부 | `DOCUMENT_FAILED`, 재업로드 0 |
| F-5 | upload 성공 → create 미확정 → 읽기 판정 1회 | 판정 결과대로. **읽기 2회 이상 금지** |
| F-6 | read-back size/hash 불일치 | `ASSET_MISMATCH`, 자동 정정 0 |
| F-7 | 미매핑 SDK 코드 | 항상 `*_OUTCOME_UNKNOWN` |
| F-8 | 동시 호출 2회 | 단일 비행 — 두 번째가 upload를 다시 시작하지 않음 |
| F-9 | 실패 결과 표면 | `correlationId` 외 token/assetId/path/bytes/password/raw message 0 |
| F-10 | `getDoc` 캐시/pending write 함정 | **캐시 스냅샷을 서버 성공으로 읽지 않음**(fake가 `hasPendingWrites`/`fromCache`를 흉내) |

**emulator 검증표 후보 (`demo-denn-emulator`에서만, 별도 승인 필요):**

| # | 시나리오 | 기대 |
|---|---|---|
| E-1 | 비승인 UID의 asset create | 거부 |
| E-2 | 승인 UID의 asset create | 허용 |
| E-3 | 같은 경로 두 번째 create | 거부(create-only) |
| E-4 | asset update / delete | 거부 |
| E-5 | 익명의 asset read | 허용(public-read) |
| E-6 | `image/png` 아닌 contentType | 거부 |
| E-7 | 20 MiB 초과 | 거부 |
| E-8 | 비승인 UID의 `schema:'space-v2'` create | 거부 |
| E-9 | 승인 UID의 exact V2 outer create | 허용 |
| E-10 | 승인 UID의 **추가 키 포함** V2 create | 거부 |
| E-11 | **익명의 `schema:'space-v1'` create** | **허용 — V1 호환 회귀 가드** |
| E-12 | 기존 `spaces/{token}` update/delete | 거부 |
| E-13 | 기존 `rebuildAdminState` 시나리오 13종 | **전부 그대로 PASS(회귀 없음)** |

### Q10. Founder 결정이 필요한 항목 (최소)

| # | 질문 | 선택지 | 결정 없이 진행 불가한 이유 |
|---|---|---|---|
| **JJ-1** | V2 asset Rules를 여는가 | A) `rebuild-space-assets` match 신설(create=승인 UID, read=public, update/delete=false) · B) 보류 | **B면 이후 단위가 전부 local fake로만 남는다** |
| **JJ-2** | `spaces/{token}` create를 GG-5대로 분기하는가 | A) `schema=='space-v2'`만 승인 UID + exact keys, V1은 현행 유지 · B) 현행 유지 | Rules 변경 = G-1 재개 |
| **JJ-3** | **`spaces` 컬렉션 `list`를 닫는가** | A) `get`만 허용하고 `list` 거부 · B) 현행 유지 | 현행 `read: if true`가 **문언상 열거를 허용**한다(Q2 위험 2, 정적 결론 · 실행 `NOT TESTED`). V1 소비자 영향 검토 필요 |
| **JJ-4** | 실제 운영자 UID 정본 제공 | A) 제공 · B) 보류 | placeholder로는 **어떤 Rules도 배포 불가** |
| **JJ-5** | V2 orphan **식별** 정책 | A) V2-1 삭제 보류 유지(D-2=O-3 연장) · B) V2-2′ client-denied write-once mapping((c1) transform-0) · B′) V2-2″ 독립 recId + `customMetadata` · C) V2-3 backend | **어느 선택도 지금은 확정 orphan을 증명하지 못한다**(§Q7.1: 늦은 create를 무효화하는 단조 조건 부재). B의 조회 primitive는 공식 지원 + local emulator VERIFIED지만 연쇄 보간은 `UNCONFIRMED`이고, **없던 privileged plaintext surface가 새로 생긴다**(bucket 접근 주체와의 overlap `UNCONFIRMED`) — 이는 **Founder 보안 tradeoff**다. B′는 GG-4 미승인 schema 확장이고 public-read라 recId가 공개 관측된다. **어느 선택도 삭제 승인이 아니다** |
| **JJ-6** | 미확정 시 사용자 경험 | A) 미판정으로 표시하고 사람이 결정 · B) 자동 재시도 | **B는 안전 근거가 없다**(Q6) |
| **JJ-7** | 다음 단위 크기 | A) local `space-write` port + fake만(네트워크 0) · B) Rules + emulator까지 · C) adapter까지 | A는 UID·Rules 결정 없이도 진행 가능한 **유일한 선택지** |

---

## 3. 필수 실패표 (스펙 073 §4)

**보완 라운드 1에서 판정 축을 분리했다.** 초판은 "현재 Rules에서 성립하는 것"과 "목표 후보 Rules에서
성립할 것"을, 그리고 "정적/API 근거"와 "실행 검증"을 한 칸에 섞어 적었다. 아래는 그 둘을 나눈다.

**판정 축 A — 어떤 Rules 기준인가**

- **[현재]** = 오늘 저장소에 있는 `storage.rules` / `firestore.rules` 그대로.
- **[목표후보]** = GG-4/GG-5 목표로 신설·수정해야 할 규칙. **작성되지 않았고 승인되지도 않았다.**

**판정 축 B — 근거의 종류**

- **정적** = Rules 문언 또는 설치 SDK 공개 타입/소스에서 직접 읽은 사실.
- **설계** = 위 사실들로부터 따라 나오는 논리적 귀결(코드도 규칙도 실행하지 않았다).
- **실행** = emulator 또는 live 실행 결과. **이번 단위에서 전부 `NOT TESTED`다** — 하나도 실행하지
  않았으므로 아래 표의 실행 칸은 예외 없이 `NOT TESTED`이며, 그 사실을 `UNCONFIRMED`(근거 불충분)와
  섞지 않는다.

### 3.1 현재 Rules 상태 (정적 판정)

| # | 상황 | 정적 판정 | 실행 | 근거 |
|---|---|---|---|---|
| 16 | `rebuild-space-assets/**`의 create/read/update/delete | **[현재] 전부 default deny** — match 자체가 없다 | NOT TESTED | `storage.rules`에 해당 경로 match 부재(grep 0건) |
| 17 | `spaces/{token}` create의 GG-5 충족 | **[현재] FAIL** — `create: if true`, payload·UID 검증 0 | NOT TESTED | `firestore.rules` |
| 18 | `spaces/{token}` 불변성 | **[현재] PASS** — `update, delete: if false` | NOT TESTED | `firestore.rules` |
| 21 | `spaces/{token}`의 `allow read`가 `get`과 `list`를 함께 연다 | **[현재] 정적 결론: 그렇다** — Firestore Rules에서 `read` = `get` + `list`이고 현행은 `if true` | NOT TESTED | `firestore.rules`. **실제 열거가 되는지는 실행하지 않았다** — 정적 결론과 실행 미검증을 분리한다 |
| 19 | V1 create 호환 유지 가능성 | **[현재→목표후보] 설계상 가능** | NOT TESTED | 레거시가 항상 `schema:'space-v1'`을 쓴다(`denn-mockup-tool.html:15573`) → 분기 키 성립 |

### 3.2 목표 후보 Rules에서의 상태 (설계 판정 · 전부 미작성)

| # | 상황 | 설계 판정 | 실행 | 근거 |
|---|---|---|---|---|
| 12 | 같은 **assetId** 재업로드 | **[목표후보] create-only가 거부할 것** | NOT TESTED | `resource == null` 패턴(admin-state 선례). ★ **[현재]는 규칙 부재로 그냥 default deny이며 이것을 목표 rule의 PASS로 읽으면 안 된다.** 또한 `storage/unauthorized`가 "이미 존재"와 "권한 없음"을 구분하지 못한다 |
| 22 | 승인 UID의 asset create / 익명 read | **[목표후보] 허용될 것** | NOT TESTED | 규칙 미작성. GG-4=A 목표 문구뿐 |
| 23 | asset update / delete 거부 | **[현재] default deny · [목표후보] 명시 `false`** | NOT TESTED | 결과는 같으나 **근거가 다르다**(Q1 주의 1). 목표 블록에 명시 `false`를 적지 않으면 불변 계약이 아니다 |

### 3.3 실패 순서별 판정

| # | 상황 | 판정 | 실행 | 근거 |
|---|---|---|---|---|
| 1 | upload 명확 성공 → Firestore create 성공 | 판정 없음 | **NOT TESTED** | Rules 미개방 + live/emulator 금지. 필요한 SDK API는 전부 존재(Q3) |
| 2 | upload 명확 실패 | **설계 PASS** | NOT TESTED | `mapUploadError`의 확정 실패 코드 집합. create 호출 0은 순서상 자명 |
| 3 | upload 결과 미확정 — object **부재** 관측 | **UNCONFIRMED** | NOT TESTED | "지금 없다" ≠ "영원히 없다". 재시도 10분 창(§1.2)과 늦은 도착 배제 근거 없음 |
| 4 | upload 결과 미확정 — **exact object 존재** 관측 | **UNCONFIRMED** | NOT TESTED | 논거는 강하다(고유 create-only 경로 + size/md5 대조). 그러나 ① 그 경로 read가 [현재] default deny ② `md5Hash` optional ③ Storage read 캐시 미확인 |
| 5 | upload 성공 → create **명확 거부/실패** | **설계 PASS** | NOT TESTED | `permission-denied`/`unauthenticated`/`invalid-argument` 등은 확정. 이때 asset은 참조되지 않는다 |
| 6 | upload 성공 → create 미확정 — 문서 **부재** 관측 | **UNCONFIRMED** | NOT TESTED | 앱이 포기해도 pending write가 남아 늦게 기록될 수 있다(`index.d.ts:2582-2595`) |
| 7 | upload 성공 → create 미확정 — 문서 **일치** 관측 | **정적/설계 근거로는 성립 · 실행 NOT TESTED** | NOT TESTED | `getDocFromServer`(`:1413`)가 server read임은 **정적 근거**이고, exact outer 대조로 이번 create를 특정할 수 있다는 것은 **설계 근거**다. **`getDoc`(`:1389`)이면 캐시/pending write로 거짓 성공.** 실제 timeout·오프라인 시나리오는 실행하지 않았다 |
| 8 | upload 성공 → create 미확정 — 문서 **불일치** 관측 | **설계 PASS** | NOT TESTED | token 충돌 또는 계약 위반. fail-closed가 유일한 안전 동작 |
| 9 | 브라우저 종료 | **UNCONFIRMED** | NOT TESTED | 진행 중 요청의 서버 도달 여부 판정 불가 |
| 10 | 인증 만료 | **UNCONFIRMED** | NOT TESTED | `unauthenticated`는 확정 실패지만 **직전 요청의 결과는 별개** |
| 11 | 중복 탭 | **설계 PASS** | NOT TESTED | 탭마다 독립 UUID 쌍 → 경로/token 충돌 0. 대신 중복 asset·중복 link 발생 |
| 13 | 같은 **token** 재create | **[현재] 정적 PASS** | NOT TESTED | `update: if false`가 **이미 존재하는 규칙**이다(12번과 달리 목표 후보가 아니다). 단 `permission-denied`가 정반대 두 사실을 모두 뜻할 수 있다 |
| 14 | asset만 존재하는 orphan | **[현재] FAIL — 구분 불가** | NOT TESTED | **Q7.** 승인된 outer의 암호문만으로는 참조 관계를 볼 수 없다. **[목표후보] V2-2′ 매핑을 도입해도 확정 orphan은 증명되지 않는다**(Q7.1: 늦은 create를 무효화하는 조건 부재) |
| 15 | document만 존재하는 broken reference | **설계상 발생 차단 · 사후 탐지 FAIL** | NOT TESTED | upload-first 순서가 **발생을 막는다**. asset이 나중에 사라지는 경우(현재 delete 금지라 미발생)의 탐지 수단은 없다 |
| 20 | 기존 emulator 하네스 재사용 | **설계상 가능** | NOT TESTED | `emulator-env.ts` + Rules 사본 패턴. 이번 단위는 emulator 실행 금지 |

---

## 4. UNCONFIRMED / NOT TESTED 정리

**UNCONFIRMED (근거 부족 — 추정으로 메우지 않았다):**

- upload/create **미확정 상태의 늦은 성공 가능성**과 그 시간 상한. 개별 SDK 제한은 알려져 있으나
  (upload 재시도 10분, transaction 20s lock/270s max/maxAttempts 5) **호출 전체 벽시계 상한은 미확정**.
- `FullMetadata.md5Hash`가 실제 GCS 응답에 **항상** 존재하는지.
- Storage read 경로(`getMetadata`/`getBytes`)의 **클라이언트 캐시 동작**.
- V2 proof PNG의 실제 평균/최대 bytes, 발급 빈도, 그에 따른 **orphan 비용 상한**.
- Storage bucket **CORS** 설정 — CORS-clean canvas가 아니면 인쇄/replay가 깨진다(CLAUDE.md §4.7).
- 실제 운영자 **UID 정본** — 두 Rules 파일에서 여전히 placeholder.
- Rules의 문자열 연결/분해 지원 — G-4 결정 §12에서 이미 `UNCONFIRMED`, 이번에도 확인하지 않았다.
- **한 `firestore.get()` 결과를 다른 조회 경로에 연쇄 보간**하는 것이 Storage Rules에서 지원되는지
  (§Q7.1). admin-state SDC′는 고정 경로와 path 변수만 써서 연쇄를 한 번도 쓰지 않았으므로
  **§Q7.1.0 ②의 VERIFIED 증거가 이 부분은 덮지 않는다.** 지원되지 않으면 "asset → token → spaces"
  2단 조회가 성립하지 않는다.
- **Storage Rules의 object metadata 접근**(`request.resource.metadata` / `resource.metadata`)의 공식
  지원 여부와 정확한 접근자 — 이 저장소에 선례 **0건**(§Q7.1.1 (c2)).
- **private mapping이 만드는 privileged plaintext surface와 기존 bucket 접근 표면의 principal/role
  overlap** — 프로젝트 IAM 구성을 읽지 않았고 읽을 수도 없다(§Q7.1 보안 항목).

**이미 검증된 것 — `UNCONFIRMED`로 낮춰 적지 않는다 (라운드 2 신설):**

- **Storage Rules의 `firestore.get()`/`firestore.exists()` 지원**: G-4 결정 정본 §4가 공식 문서를
  직접 인용한다. **공식 지원.**
- **client `read:false`인 Firestore 문서를 Storage Rules가 조회해 create를 게이팅하는 primitive**:
  `storage.emulator.rules:40-45` + `firestore.emulator.rules:71-86` +
  `cutover-rules.emulator.test.ts:83-96` + G-4 §12의 **13/13 PASS**로 **local emulator VERIFIED**
  (2026-08-14 기록, 이번 세션 재실행 없음).
  → 여전히 열려 있는 것은 **V2 전용 mapping Rules(미작성·`NOT TESTED`)**와
  **실제 Firebase/IAM/live(`NOT TESTED`)**뿐이다.

**정적 결론이지만 실행 검증이 없는 것 — `UNCONFIRMED`와 구분한다:**

- **`spaces` 컬렉션 `list` 개방**: Rules 문언에서 직접 읽은 **정적 사실**(근거 불충분이 아니다).
  실제 열거 동작은 **`NOT TESTED`**.
- **`getDocFromServer`가 server read이고 `getDoc`이 캐시를 돌려줄 수 있다는 것**: 설치 SDK 공개 타입
  원문(`index.d.ts:1386-1413`)에서 읽은 **정적 사실**. 실제 timeout/오프라인 시나리오는 **`NOT TESTED`**.
- **`setDoc` Promise가 서버 응답 전까지 settle하지 않고 pending write가 남는다는 것**: 원문
  (`index.d.ts:2582-2595`)에서 읽은 **정적 사실**. 실제 재연결·늦은 기록은 **`NOT TESTED`**.
- **현재 `rebuild-space-assets/**` default deny**: `storage.rules` 문언(match 부재)에서 읽은 **정적
  사실**. 목표 create-only rule의 동작은 **미작성 · `NOT TESTED`**.

**NOT TESTED (이번 단위에서 금지 — 실행하지 않았다):**

- 실제 Firebase project/bucket/Firestore/network/live 데이터 접근
- emulator 실행, upload/write/read-back/delete
- Rules 배포, Hosting 배포
- V2 asset 경로의 실제 create/read 동작 (목표 후보 rule 자체가 **미작성**)
- `getDocFromServer` 기반 read-back 판정의 실제 동작, 앱 timeout·오프라인·재연결 시나리오
- `spaces` 컬렉션 실제 열거 동작
- §Q7.1의 V2 mapping 후보 전부((c1) transform-0 · (c2) `customMetadata`) — 규칙 **미작성 · 미실행**
- 실제 Firebase IAM(두 제품 연결 권한) 활성화 상태와 Firestore/Storage principal overlap
- viewer가 실제 PNG를 CORS-clean으로 읽어 replay하는 전체 경로

**이번 단위에서 실행한 게이트는 없다.** 문서 전용 단위이므로 unit/E2E/typecheck/build/emulator를
하나도 돌리지 않았고, 돌렸다고 기록하지도 않는다.

---

## 5. 다음 최소 허용 범위 (권고 — 승인 아님)

**결정 없이도 진행 가능한 유일한 단위는 JJ-7=A다.**

- `packages/firebase/src/space-write/**` 신규 local port + synthetic fake unit **만**.
- 실제 SDK adapter는 **포함하되 호출하지 않거나**(dynamic import factory, unit 미사용),
  더 보수적으로는 **다음 단위로 미룬다**.
- Rules·config·UID·emulator·UI·deploy는 **전부 제외**.
- 이 단위는 §3.3의 **설계 PASS 행**(2·5·8·11)과 §3.1의 **현재 정적 PASS 행**(13·18)을 fake로
  고정하고, `UNCONFIRMED` 행(3·4·6·9·10)은 **미확정을 미확정으로 표현하는 것 자체를 계약으로**
  검증한다. 7번은 `getDocFromServer` 사용을 계약으로 고정하되 **실행 검증은 하지 않는다**.
- **§3.2의 목표 후보 행(12·22·23)은 이 단위에서 검증할 수 없다** — 규칙이 없으므로 fake로 흉내 내면
  "검증했다"는 착시만 만든다. JJ-1 승인 후 emulator 단위로 넘긴다.

**JJ-1/JJ-2/JJ-4가 승인되기 전에는 Rules 파일과 emulator 게이트를 열지 않는다.**
JJ-4(실제 UID)가 없으면 어떤 Rules도 배포할 수 없으므로, Rules 단위를 먼저 하면 **검증은 되지만
배포되지 않는 코드**가 쌓인다.

---

## 6. 이 문서가 승인하지 **않는** 것

Rules 변경 · Rules 배포 · 실제 UID 기록 · Firebase adapter 구현 · Storage upload · Firestore create ·
read-back 실행 · reconciliation 구현 · orphan 삭제/정리 · delete 권한 · emulator 실행 · URL 발급 ·
admin/customer UI 연결 · C6/backend · 신규 dependency — **전부 아니다.**

**보호 대상(수정·삭제·restore·checkout·stage·commit 금지, G-4 결정 §15):**
`docs/rebuild/design/taste-v2/**` · `docs/rebuild/design/README.md` ·
`docs/rebuild/specs/038-page-design-prototype.md` ·
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
`docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`.

기존 Founder/user working tree 변경(위 목록 + untracked `AGENTS.md`)도 이번 단위에서
stage/commit/restore하지 않았다.

---

## 7. 진행도

전체 리빌드 진행도는 **78~81% 완료 / 19~22% 잔여 — 변동 없음**이다.
조사만으로는 올리지 않는다(스펙 073 §7). 제품 파일 변경 0, 작업축 5·6·7 완료량 변동 0이다.

**보완 라운드 1·2 모두 진행도를 바꾸지 않는다.** 두 라운드는 초판·라운드 1의 과장을 폐기하고 근거
등급과 판정 축을 분리한 **문서 정정**이며, 제품·Rules·검증 어느 쪽도 전진시키지 않았다.

라운드 2에서 primitive 하나가 `UNCONFIRMED` → **local emulator VERIFIED**로 올라갔지만, 이는
**admin-state에서 이미 검증돼 있던 사실을 이 문서가 잘못 낮춰 적었던 것을 바로잡은 것**이지 이번에
새로 검증한 것이 아니다. 진행도를 올릴 근거가 되지 못한다.

오히려 §Q7.1이 *"매핑을 도입해도 확정 orphan은 여전히 증명되지 않는다"* 를, §Q7.1.1이 *"(c2)는
GG-4 미승인 schema 확장이고 public-read라 recId가 공개 관측된다"* 를 밝혔으므로 **작업축 6의 잔여
난이도는 줄지 않았고, 오히려 선택지마다 붙는 조건이 더 분명해졌다.**
