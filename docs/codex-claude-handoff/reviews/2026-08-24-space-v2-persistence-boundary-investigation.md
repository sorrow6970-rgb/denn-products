# space V2 persistence boundary 읽기 전용 조사

- 스펙 정본: `docs/rebuild/specs/073-space-v2-persistence-boundary-investigation.md`
- 상태: **DOCUMENT_ONLY / READ_ONLY / NO_LIVE_NETWORK / NO_UI**
- 기준 HEAD=origin: `c5f8384` (스펙 072 종료 · 스펙 073 계약 반영), ahead/behind 0/0
- 조사 수행: Claude Code, 2026-08-24

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
operator UID·exact outer keys 목표를 하나도 충족하지 않는다. 그리고 **V2에서는 asset↔document 연결이
암호문 안에 있어 서버(Rules)가 그 관계를 볼 수 없으므로, admin-state에서 쓴 G-4 구조 A의 SDC′
orphan 식별 논거를 그대로 옮길 수 없다.**

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

### 1.2 설치된 SDK (읽기 전용, `node_modules/.pnpm`)

| 패키지 | 버전 | 확인한 표면 |
|---|---|---|
| `firebase` | **12.17.1** | `packages/firebase/package.json` dependency, `pnpm-lock.yaml` |
| `@firebase/storage` | **0.14.4** | `uploadBytes`, `uploadBytesResumable`, `getBytes`, `getMetadata`, `getDownloadURL`, `deleteObject`, `updateMetadata`, `list`, `listAll` |
| `@firebase/firestore` | **4.17.0** | `setDoc`, `getDoc`, `getDocFromServer`, `getDocFromCache`, `runTransaction`, `waitForPendingWrites`, `SnapshotMetadata`, `FirestoreErrorCode` |
| `@firebase/app` | 0.16.0 | `initializeApp`/`getApp`/`getApps` |
| `@firebase/auth` | 1.13.4 | 기존 adapter가 쓰는 표면 |

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
- `SnapshotMetadata`는 **`hasPendingWrites`**와 **`fromCache`**를 노출한다. `getDoc`은 캐시를 볼 수
  있고, `getDocFromServer`가 서버 강제 읽기다.

### 1.3 기존 adapter

| 위치 | 확인한 것 |
|---|---|
| `packages/firebase/src/admin-write/**` | REC(claim) → upload → head transaction 순서, `mapUploadError` / `mapClaimError` / `classifyTransactionError`, bounded 1회 read-only reconciliation, `saveInFlight` 단일 비행, `demo-` prefix emulator 가드, DEFAULT app 재사용·config 불일치 시 fail-closed |
| `packages/firebase/src/space-read/**` | `spaces/{token}` **read 전용** port. 별도 named app `denn-space-viewer`, `getDoc` 사용, 20s timeout, 안전 오류 7종 |
| `packages/firebase/src/index.ts` (root barrel) | admin-write/space-read를 **재수출하지 않는다**(고객 번들에 SDK 유입 방지) |
| `apps/admin/src/space-v2/**` | 스펙 065~072의 local 준비 체인. **upload/Firestore/네트워크 호출 0**, `App.tsx`/`main.tsx` 미연결 (grep 0건) |
| `apps/admin/src/admin-composition/**` | admin-state 전용 조립만 존재. **V2 issuer composition 없음** |
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
2. **`allow read: if true`는 `get`과 `list`를 모두 연다.** Firestore에서 `read` = `get` + `list`이므로
   현행 규칙 문언상 `spaces` 컬렉션 **열거가 허용된다**. 토큰 비밀성에 의존하는 모델과 어긋난다.
   내용은 암호화돼 있으므로 즉시 평문 노출은 아니지만, **토큰 전량 수집 → 오프라인 사전공격 표면**이
   된다. 실제 동작은 **NOT TESTED**(live 접근 금지). GG-5 계약을 여는 단위에서 함께 결정할 항목이다.
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

**★ `getDoc` 대신 `getDocFromServer`가 필요한 이유 — 이번 조사에서 새로 확인한 함정.**
Firestore Web SDK는 latency compensation을 한다. `setDoc`이 로컬 타임아웃으로 실패 처리돼도
**로컬 캐시에는 pending write가 이미 반영돼 있을 수 있다.** 그 상태에서 `getDoc`을 호출하면
`snapshot.exists() === true`가 나오는데, 이는 **서버가 받았다는 증거가 아니다**.
`SnapshotMetadata.hasPendingWrites` / `fromCache`가 이를 구분하며, `getDocFromServer`가 서버 강제
읽기다. **기존 `space-read/sdk-facade.ts`는 `getDoc`을 쓰고 `metadata`를 보지 않는다** — 읽기 전용
viewer 용도로는 문제가 없지만, **write outcome 판정에 그대로 재사용하면 거짓 성공 판정이 난다.**

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
그리고 **부재 관측은 확정 실패가 아니다** — 로컬 timeout이 SDK의 write를 취소하지 않는다는 스펙 037
§6.6의 전제가 여기에도 그대로 적용된다.

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

**따라서 현재 승인된 V2 계약 아래에서는 asset orphan과 미판정 object를 서버에서 구분할 수 없다.**
클라이언트도 마찬가지다 — 자기가 방금 만든 token/assetId 쌍은 알지만, **과거 issue의 쌍을 되찾을
경로가 없다**(운영자가 링크를 따로 보관하지 않는 한).

**G-4 정책과 충돌하는가 — 충돌하지 않는다. 오히려 더 보수적인 쪽으로 자동 귀결된다.**
Founder D-2=O-3(삭제 보류)이 현재 정본이고, delete 권한도 자동 정리 주체도 만들지 않았다. V2에서
식별 근거가 더 약하므로 **삭제 보류가 유일하게 성립하는 기본값**이다. 다만 **비용은 단조 증가**하며
그 상한은 `UNCONFIRMED`다(실제 PNG 크기·발급량 미확정, 스펙 064 §10).

식별을 열려면 추가 결정이 필요하다 — **이 조사는 어느 쪽도 권고하지 않고 선택지만 기록한다**:

| 선택지 | 필요한 것 | 대가 |
|---|---|---|
| **V2-1 삭제 보류 유지 (현재 기본값)** | 없음 | 오삭제 위험 0. 비용 단조 증가(상한 미확정) |
| **V2-2 asset에 평문 REC 도입** | `rebuildSpaceAssets/{assetId}` 류의 write-once 문서 + Rules 2곳 | Firestore 쓰기 1회 추가. **그러나 REC이 있어도 "참조 document가 있는가"는 여전히 못 푼다** — token을 REC에 넣으면 **asset↔token 연결이 평문으로 노출**되어 토큰 비밀성 모델이 깨진다 |
| **V2-3 backend/Admin SDK 판정** | C6/G-3 재개, 서비스 계정, 함수 배포·과금 | 규칙이 틀리면 자동으로 손해 |

> **★ V2-2의 함정을 분명히 기록한다.** admin-state의 REC이 통했던 것은 `recId`가 **비밀이 아니었기**
> 때문이다. V2 token은 **URL 비밀**이다. orphan 식별을 위해 asset↔token 매핑을 평문으로 두면
> **`spaces` 열거 가능성(Q2 위험 2)과 결합해 시안 접근 경로가 만들어진다.** 이건 최적화 문제가 아니라
> 보안 모델 충돌이다.

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
| F-10 | `getDoc` 캐시 함정 | **pending write 스냅샷을 성공으로 읽지 않음** |

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
| **JJ-3** | **`spaces` 컬렉션 `list`를 닫는가** | A) `get`만 허용하고 `list` 거부 · B) 현행 유지 | 현행 `read: if true`가 **열거를 허용**한다(Q2 위험 2). V1 소비자 영향 검토 필요 |
| **JJ-4** | 실제 운영자 UID 정본 제공 | A) 제공 · B) 보류 | placeholder로는 **어떤 Rules도 배포 불가** |
| **JJ-5** | V2 orphan 정책 | A) V2-1 삭제 보류 유지(D-2=O-3 연장) · B) V2-2 평문 REC · C) V2-3 backend | **B는 토큰 비밀성과 충돌한다**(Q7) |
| **JJ-6** | 미확정 시 사용자 경험 | A) 미판정으로 표시하고 사람이 결정 · B) 자동 재시도 | **B는 안전 근거가 없다**(Q6) |
| **JJ-7** | 다음 단위 크기 | A) local `space-write` port + fake만(네트워크 0) · B) Rules + emulator까지 · C) adapter까지 | A는 UID·Rules 결정 없이도 진행 가능한 **유일한 선택지** |

---

## 3. 필수 실패표 (스펙 073 §4)

판정 기준: **PASS** = 근거로 확정 · **FAIL** = 현재 구조에서 성립하지 않음 · **UNCONFIRMED** = 근거
불충분 · **NOT TESTED** = 실행하지 않음(이번 단위 금지).

| # | 상황 | 판정 | 근거 |
|---|---|---|---|
| 1 | upload 명확 성공 → Firestore create 성공 | **NOT TESTED** | Rules 미개방 + live/emulator 금지. 필요한 SDK API는 전부 존재(Q3) |
| 2 | upload 명확 실패 | **PASS**(설계 근거) | `mapUploadError`의 확정 실패 코드 집합이 이미 검증돼 있다. create 호출 0이 자명(순서상 뒤) |
| 3 | upload 결과 미확정 — object **부재** 관측 | **UNCONFIRMED** | "지금 없다" ≠ "영원히 없다". 재시도 10분 창(§1.2)과 늦은 도착 배제 근거 없음 |
| 4 | upload 결과 미확정 — **exact object 존재** 관측 | **UNCONFIRMED** | 논거는 강하다(고유 create-only 경로 + size/md5 대조). 그러나 ① read 권한이 아직 없다 ② `md5Hash` 항상 존재 미확인 ③ Storage read 캐시 미확인 |
| 5 | upload 성공 → Firestore create **명확 거부/실패** | **PASS**(설계 근거) | `permission-denied`/`unauthenticated`/`invalid-argument` 등은 확정. 이때 asset은 참조되지 않는다 |
| 6 | upload 성공 → create 미확정 — 문서 **부재** 관측 | **UNCONFIRMED** | 로컬 timeout은 취소가 아니다(스펙 037 §6.6과 동일 전제) |
| 7 | upload 성공 → create 미확정 — 문서 **일치** 관측 | **UNCONFIRMED** | `getDocFromServer` + exact outer 대조라면 성립. **`getDoc`이면 pending write로 거짓 성공**(Q3) |
| 8 | upload 성공 → create 미확정 — 문서 **불일치** 관측 | **PASS**(설계 근거) | token 충돌 또는 계약 위반. fail-closed가 유일한 안전 동작 |
| 9 | 브라우저 종료 | **UNCONFIRMED** | 진행 중 요청의 서버 도달 여부 판정 불가 |
| 10 | 인증 만료 | **UNCONFIRMED** | `unauthenticated`는 확정 실패지만 **직전 요청의 결과는 별개** |
| 11 | 중복 탭 | **PASS**(설계 근거) | 탭마다 독립 UUID 쌍 → 경로/token 충돌 0. 대신 중복 asset·중복 link 발생 |
| 12 | 같은 **assetId** 재사용 | **PASS**(설계 근거) | create-only가 서버에서 거부. **단 `storage/unauthorized`가 "이미 존재"와 "권한 없음"을 구분하지 못한다** |
| 13 | 같은 **token** 재사용 | **PASS**(설계 근거) | `update: if false`가 거부. **단 `permission-denied`가 정반대 두 사실을 모두 뜻할 수 있다** |
| 14 | asset만 존재하는 orphan | **FAIL** — 구분 불가 | **Q7.** 참조가 암호문 안이라 서버가 볼 수 없다. SDC′ 이식 불가 |
| 15 | document만 존재하는 broken reference | **FAIL** — 사전 차단은 되나 사후 탐지 불가 | upload-first 순서가 **발생을 막는다**. 그러나 asset이 나중에 사라지는 경우(현재 delete 금지라 미발생) 탐지 수단은 없다 |
| 16 | **`rebuild-space-assets/**` 현재 CRUD** | **FAIL** — 전부 거부 | `storage.rules` match 부재 |
| 17 | **`spaces/{token}` create의 GG-5 충족** | **FAIL** | `create: if true`, payload 검증 0, UID 검증 0 |
| 18 | `spaces/{token}` 불변성 | **PASS** | `update, delete: if false` |
| 19 | V1 create 호환 유지 가능성 | **PASS**(근거상 가능) | 레거시가 `schema:'space-v1'`을 항상 쓴다(`denn-mockup-tool.html:15573`) |
| 20 | 기존 emulator 하네스 재사용 | **PASS**(구조상 가능) | `emulator-env.ts` + Rules 사본 패턴. **실행은 NOT TESTED**(이번 금지) |

---

## 4. UNCONFIRMED / NOT TESTED 정리

**UNCONFIRMED (근거 부족 — 추정으로 메우지 않았다):**

- upload/create **미확정 상태의 늦은 성공 가능성**과 그 시간 상한. 개별 SDK 제한은 알려져 있으나
  (upload 재시도 10분, transaction 20s lock/270s max/maxAttempts 5) **호출 전체 벽시계 상한은 미확정**.
- `FullMetadata.md5Hash`가 실제 GCS 응답에 **항상** 존재하는지.
- Storage read 경로(`getMetadata`/`getBytes`)의 **클라이언트 캐시 동작**.
- `spaces` 컬렉션 `list`가 실제로 열려 있는지 — **Rules 문언상 열려 있으나 실행 검증 0**.
- V2 proof PNG의 실제 평균/최대 bytes, 발급 빈도, 그에 따른 **orphan 비용 상한**.
- Storage bucket **CORS** 설정 — CORS-clean canvas가 아니면 인쇄/replay가 깨진다(CLAUDE.md §4.7).
- 실제 운영자 **UID 정본** — 두 Rules 파일에서 여전히 placeholder.
- Rules의 문자열 연결/분해 지원 — G-4 결정 §12에서 이미 `UNCONFIRMED`, 이번에도 확인하지 않았다.

**NOT TESTED (이번 단위에서 금지 — 실행하지 않았다):**

- 실제 Firebase project/bucket/Firestore/network/live 데이터 접근
- emulator 실행, upload/write/read-back/delete
- Rules 배포, Hosting 배포
- V2 asset 경로의 실제 create/read 동작
- `getDocFromServer` 기반 read-back 판정의 실제 동작
- viewer가 실제 PNG를 CORS-clean으로 읽어 replay하는 전체 경로

---

## 5. 다음 최소 허용 범위 (권고 — 승인 아님)

**결정 없이도 진행 가능한 유일한 단위는 JJ-7=A다.**

- `packages/firebase/src/space-write/**` 신규 local port + synthetic fake unit **만**.
- 실제 SDK adapter는 **포함하되 호출하지 않거나**(dynamic import factory, unit 미사용),
  더 보수적으로는 **다음 단위로 미룬다**.
- Rules·config·UID·emulator·UI·deploy는 **전부 제외**.
- 이 단위는 §3 표의 2·5·8·11·12·13번(설계 근거 PASS)을 fake로 고정하고,
  3·4·6·7·9·10번은 **미확정을 미확정으로 표현하는 것 자체를 계약으로** 검증한다.

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
