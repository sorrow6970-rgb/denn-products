# 결정 (정본) — G-4 orphan 보존 방향 + 안전 삭제 조건 설계

승인: **Founder, 2026-08-11** · 기준 커밋 `eae9be4` · 브랜치 `rebuild/modern-studio`
**보완 라운드 2 (CORRECTION_REQUIRED, 2026-08-11)** 적용 · 선행: 보완 라운드 1
문서 검수: **`DOCUMENT_REVIEW_PASSED` (Codex, 2026-08-11)** — 세 정정 반영 확인.
**Founder 추가 결정(2026-08-14): `D-1=A`, `D-2=O-3`, `D-3=N`.**
식별을 위한 **SDC′ + 구조 A**만 채택한다. 실제 삭제·자동 정리·클라이언트 delete 권한·IAM 활성화·
배포는 승인되지 않았고, 기본 정책은 계속 **O-3 삭제 보류**다. 보존 개수·주기도 정하지 않는다.
Structure A 로컬 구현은 **CODEX_PASSED**(2026-08-14, emulator 13/13)이며 실제 서비스는 NOT TESTED다.
선행 정본: `decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5) ·
`decisions/2026-08-11-spec-037-implementation-authorization.md`
관련 스펙: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md` (**DONE**, `CODEX_PASSED`)
현재 구현: `packages/firebase/src/admin-write/**` (제품 검증 커밋 `ead06ab`)

> **이 문서는 방향 기록과 설계안이다. 구현 계약도 승인도 아니다.**
> 제품 코드·`firestore.rules`·`storage.rules`·config·test·`package.json`·lockfile 변경 **0**.
> **실제 객체 조회·나열·삭제 0**, 실제 Firebase/project/bucket/운영 데이터/실제 UID 접근 **0**,
> **emulator 실행 0**, 배포 · 운영 쓰기 · UI 연결 · 발행 · 자동 정리 · C6 구현 · L-4 구현 **0**.

---

## 0. 보완 이력

### 0.1 보완 라운드 1 (Codex 지적 3건)

| # | 결함 | 정정 |
| --- | --- | --- |
| 1 | **"Storage Rules는 Firestore를 읽을 수 없다"** + 그로부터 나온 **"강제 주체는 사람 또는 backend뿐"** | **틀렸다.** `firestore.get()`/`firestore.exists()`가 공식 지원(§4). **O-4** 신설 |
| 2 | SDC의 **"head는 X로 되돌아갈 수 없다"** | **현재 Rules에서 성립하지 않는다** — `firestore.rules:57-60`이 **직전 값과만** 비교(§3). REC 기반 재설계 |
| 3 | 변경 문서 5개 표기 | **6개**로 정정 |

### 0.2 ★ 보완 라운드 2 (Codex 재검수 3건) — **두 건이 또 내 사실 오류였다**

| # | 라운드 1의 결함 | 정정 |
| --- | --- | --- |
| **1** | **"같은 transaction의 형제 쓰기를 Rules가 볼 수 없다"** · **"REC과 head를 같은 transaction으로 묶을 수 없다"** | **틀렸다.** 공식 문서가 **`getAfter()`** 를 명시한다 — *"you can use the `getAfter()` function to access the state of a document **after a transaction or batch of writes completes but before the transaction or batch commits**."* → **구조 B가 실제로 가능하다**(§6) |
| **2** | **"공식 문서에 총 deadline이 없다"** | **부정확했다.** 공식 문서가 **lock deadline 20초 · 최대 270초 · idle 60초 · 유한 재시도**를 명시한다(§7) |
| **3** | REC 문서 ID와 Storage `objectId`의 **매핑이 성립하지 않았다** — `objectId`는 실제로 **`"<uuid>.json"`** 인데 REC은 `{operationId}`(확장자 없음)였다 | **실행 가능한 매핑을 확정**했다(§8). **문자열 파싱 0**, 미확인 함수 **사용하지 않는다** |

---

## 1. Founder 방향 (이번 대화, 2026-08-11)

> - 현재 head가 더 이상 가리키지 않는 **과거의 정상 저장본을 영구적인 버전 이력으로 보존할 필요는 없다.**
> - 과거 정상 저장본은 **안전하게 식별할 수 있을 때** 삭제 후보로 본다.
> - 단, **현재 사용 중인 객체나 저장 성공 여부가 미확정인 객체를 삭제해도 된다는 뜻은 아니다.**
> - 이번 지시는 **실제 삭제·자동 정리 구현·Rules 변경·백엔드 구현·배포 승인이 아니다.**

**확정된 것은 하나뿐이다**: *과거 정상 저장본에 영구 보존 요구가 없다.*
선행 G-4의 **클라이언트 delete 권한·자동 정리 불허**와 **운영 쓰기 미활성화**는 **그대로 유지된다.**

---

## 2. 세 집단

| 집단 | 정의 | 지금 구분 |
| --- | --- | --- |
| **P1 현재 사용 중** | head가 가리키는 객체 | **가능** |
| **P2 과거 정상 저장본** | 어떤 revision `R`에서 head였고 지금은 아니다 | **불가능** |
| **P3 미확정 / 늦게 성공 가능** | upload·commit 결과 불명 | **불가능** |

**P2와 P3은 Storage에서 똑같이 생겼다.** 가르는 정보(**"한 번이라도 head였는가"**)가 어디에도 없다 —
head는 **정확히 3키**(`constants.ts:33` · `head.ts:74-77` · `firestore.rules`의 `hasOnly`+`hasAll`),
구현에 **나열도 삭제도 없고**(`facade.ts`, `index.ts:7`), `storage.rules`는 update/delete **모두 `false`**.

**★ P2는 실패가 아니라 성공의 부산물이다** — update가 경로 교체를 강제하므로
**저장이 성공할 때마다 직전 객체가 참조에서 떨어진다.**

---

## 3. 초판 SDC 증명의 결함 (라운드 1 교정 2, 유지)

`firestore.rules:57-60`은 **`objectPath != resource.data.objectPath`** 만 요구한다 —
**비교 대상이 "직전 값" 하나뿐**이라 **A → B → A가 막히지 않는다.**
⇒ *"`head.revision > R`이면 되돌아갈 수 없다"* 는 **현재 Rules에서 성립하지 않는다.**

**★ 더 깊은 문제**: `storage.rules`의 create가 **`resource == null`** 이므로
**객체를 지우는 순간 그 경로가 다시 생성 가능해진다.**
⇒ **"객체는 불변"이라는 토대는 "아무것도 지우지 않는 한"에서만 성립한다.**

---

## 4. Storage Rules는 Firestore를 읽을 수 있다 (라운드 1 교정 1, 유지)

**근거** — `https://firebase.google.com/docs/storage/security/rules-conditions` (2026-08-11 확인):

> *"Using the `firestore.get()` and `firestore.exists()` functions, your security rules can evaluate
> incoming requests against documents in Cloud Firestore."*

**공식 제약 4개 (같은 페이지, 인용)**

1. *"Storage Security Rules can only access documents from the **default Cloud Firestore database**
   when multiple databases are active."*
2. **★ *"No more than two Firestore documents may be accessed in a single Rules evaluation."***
3. *"…reads of documents from Storage Security Rules **count towards your project's Firestore quota
   and billing**."*
4. 첫 저장 시 **두 제품 연결 권한 활성화 프롬프트**, **IAM role 제거로 비활성화** 가능.

### 4.1 ★ 두 한도를 혼동하지 않는다

| 어디 | 한도 | 출처 |
| --- | --- | --- |
| **Storage Rules**가 `firestore.get()`으로 Firestore를 읽을 때 | **문서 2개** | `storage/security/rules-conditions` |
| **Firestore Rules**가 Firestore 쓰기를 평가할 때 | *"10 for single-document requests and query requests. 20 for multi-document reads, transactions, and batched writes."* | `firestore/enterprise/security/rules-conditions` |

**⇒ Storage 삭제 규칙은 2개가 상한이고, Firestore head 규칙(transaction)은 20개가 상한이다.**
초판·라운드 1은 이 둘을 구분하지 않았다.

---

## 5. 안전 삭제 조건 (SDC′)

```
allow delete: if approvedOperator()
                 && firestore.get(HEAD).data.revision
                    > firestore.get(REC(objectId)).data.claimedBase + 1;
```

**Firestore 문서 접근 정확히 2개 = §4의 Storage 한도와 동일, 여유 0.**

**증명** ① head 규칙이 REC을 요구하므로 head가 가리키는 모든 경로에 REC이 있다 ·
② X가 head였다면 그 전이는 `claimedBase_X → claimedBase_X + 1` ·
③ `head.revision > claimedBase_X + 1` ⇒ 지금 head가 아니고 **`claimedBase_X`가 불변**이라
**다시는 head가 될 수 없다**(P2 확정) · ④ 한 번도 head가 아니었다면 그 transaction은
`head.revision == claimedBase_X`에서만 이길 수 있는데 이미 지났으므로 **영원히 못 이긴다** ·
⑤ **P3 자동 보호** — `head.revision ≤ claimedBase_X + 1` 동안 조건이 성립하지 않는다.

> **★ 하나의 조건이 P1 보호·P2 식별·P3 보호·실패 산물 회수를 모두 덮는다 ⇒ 시간 창이 불필요하다.**

---

## 6. ★★ [라운드 2 교정 1] 구조 A vs B — `getAfter()`로 B도 가능하다

**근거** — `https://firebase.google.com/docs/firestore/enterprise/security/rules-conditions`
(2026-08-11 확인):

> *"For writes, you can use the `getAfter()` function to access the state of a document **after a
> transaction or batch of writes completes but before the transaction or batch commits**."*

⇒ 라운드 1의 **"형제 쓰기를 볼 수 없다"** 는 **틀렸다.** 두 구조를 다시 비교한다.

- **A (순차)**: REC을 **별도로 먼저 commit** → head transaction이 **`get(REC)`** 로 기존 REC을 요구.
- **B (원자 동반)**: **같은 transaction에 REC create + head set**, head 규칙이 **`getAfter(REC)`** 로
  동반 쓰기를 강제.

| 항목 | **A 순차** | **B 원자 동반** |
| --- | --- | --- |
| **crash 시 남는 상태** | **REC만 남고 head 미이동** → 경로가 **소각된 채** 남는다. 객체는 있을 수도/없을 수도 | transaction이 all-or-nothing이라 **REC도 head도 안 남는다** |
| **★ 그 결과의 의미** | **업로드된 객체에 REC이 있다** ⇒ **SDC′로 회수 가능** | **★ 업로드된 객체에 REC이 없다** ⇒ **SDC′로 영원히 판정 불가**(실패 산물이 회수 불능으로 누적) |
| **callback 재실행 안전성** | REC은 이미 커밋돼 있어 재실행과 무관. `compute`는 순수 유지 | `tx.set(REC)`은 §5.5가 허용한 `transaction.set`이라 계약 위반이 아니고, 재실행 시 tx 버퍼가 리셋되므로 안전 |
| **Rules access 한도** | head 규칙에서 **`get` 1회** (Firestore transaction 한도 **20** 중 1) | head 규칙에서 **`getAfter` 1회**(+필요 시 추가). 동일 한도 **20** 안 |
| **REC write-once** | `allow update, delete: if false` — 별도 create로 성립 | 동일. transaction 안 create도 **create로 평가**된다 |
| **objectPath 재사용 차단** | head 규칙의 **`claimedBase == resource.data.revision`** 이 차단 | **REC이 이미 존재하면 create가 실패**하므로 **재사용이 자동 차단**된다(더 단순) |
| **최초 head create** | `get(REC).claimedBase == 0` | `getAfter(REC).claimedBase == 0` |
| **스펙 037 `runTransaction` 1회 계약** | **유지**. 단 §6.4 저장 순서에 **"업로드 전 Firestore 쓰기 1회"** 가 추가된다 → **계약 변경** | **유지**, 그리고 **순서 변경도 없다** → **계약 변경이 더 작다** |
| **★ Storage create 단계의 stray 차단**(§5.4) | **가능** — 업로드 시점에 REC이 이미 있으므로 create 규칙이 REC을 볼 수 있다 | **불가능** — 업로드 시점에 REC이 아직 없다 |
| **비용** | Firestore 쓰기 **1** + head 규칙 read **1** | Firestore 쓰기 **1**(같은 transaction) + head 규칙 read **1** |
| **테스트 범위** | fake: REC→upload→transaction 순서 고정 · emulator: REC 없는 head 거부, 재사용 거부, 고아 REC 무해 | fake: 동일 transaction 2문서 · emulator: **REC 없이 head만 쓰기 거부**(`getAfter` 동작), 재사용 거부 |

### 6.1 판정

**B는 공식 `getAfter()` 근거로 실행 가능하다.** 불가능하다고 단정하지 않는다.
다만 **두 구조는 서로 다른 것을 준다**:

> **A는 실패해도 REC이 남아 "실패 산물까지 회수 가능"** 하고 **Storage create 단계의 stray 차단**도 된다.
> **B는 원자성이 서버에서 강제되고 고아 REC이 없으며 스펙 037 계약 변경이 더 작다.**
> **⇒ G-4의 목적이 "과거 정상 저장본 회수"뿐이면 둘 다 충분하고, "실패 산물까지 회수"라면 A가 필요하다.**

**Founder는 2026-08-14 D-1에서 A를 채택했다.** B는 미채택 대안으로 유지한다.
구조 A의 실제 동작은 로컬 구현·emulator 검증 전까지 **NOT TESTED**다.

---

## 7. ★★ [라운드 2 교정 2] transaction 시간 제한 — 공식 제한은 존재한다

라운드 1의 **"공식 문서에 총 deadline이 없다"** 는 **부정확했다.**

**근거** — `https://docs.cloud.google.com/firestore/docs/manage-data/transactions` (2026-08-11 확인).
transaction 실패 조건으로 다음을 명시한다:

| 조건 | 값 |
| --- | --- |
| **lock deadline** | *"The transaction exceeded the lock deadline (**20 seconds**)."* |
| **최대 지속 시간 / idle** | *"The transaction exceeds the **270-second** time limit or the **60-second** idle expiration time."* |
| 최대 요청 크기 | *"The transaction exceeded the maximum request size of **10 MiB**."* |
| 재시도 | 경합 시 자동 재실행하되 **유한 횟수** 후 실패 |
| 순서 | *"Read operations must always be executed before any write operations."* |

또한 클라이언트 SDK의 `TransactionOptions.maxAttempts` 기본값은 **5**다
(`@firebase/firestore` `dist/index.d.ts:3083`).

### 7.1 ★ 반드시 분리해야 하는 두 가지

| | 상태 |
| --- | --- |
| **서버 transaction / 개별 SDK transaction의 공식 제한** | **확정** — 20초 lock · **270초** 최대 · 60초 idle · **유한 재시도**(SDK 기본 5회) |
| **`save()` 호출 전체의 실제 벽시계 상한** — 탭 정지, JS 스케줄링 정지, SDK backoff·재시도, Storage 업로드 재시도(**10분**, `@firebase/storage` `index.esm.js:37`·`:43`)를 모두 포함한 값 | **UNCONFIRMED** |

**⇒ "공식 제한이 전혀 없다"(틀림)와 "호출 전체의 절대 상한을 증명하지 못했다"(사실)는 다른 진술이다.**
순진한 상한(예: 5회 × 270초)은 **문서화되지 않은 재시도 간 backoff와 브라우저 정지**를 포함하지 않으므로
**증명이 아니다.**

> **⚠️ 이 정정만으로 임의의 시간 기반 삭제를 안전하다고 승인하지 않는다.**
> 시간 창을 채택한다면 그것은 여전히 **Founder가 명시적으로 감수하는 리스크 수용**이다.
> **SDC′(§5)를 채택하면 시간 창 자체가 불필요하다.**

---

## 8. ★★ [라운드 2 교정 3] REC 문서 ID ↔ Storage `objectId` 매핑

### 8.1 라운드 1의 결함

- Storage 경로: `rebuild-admin-state/objects/{operationId}.json`
- Storage Rules `match /rebuild-admin-state/objects/{objectId}` → **`objectId`의 실제 값은
  `"<uuid>.json"`**(확장자 포함)
- REC 문서: `/rebuildAdminStateObjects/{operationId}` → **`"<uuid>"`**(확장자 없음)

**⇒ 둘이 다르므로 `REC(objectId)`는 같은 문서를 가리키지 못한다.** 개념 표기로 넘어갈 문제가 아니다.

### 8.2 확정 매핑 — **문자열 변환 0**

| # | 결정 |
| --- | --- |
| **8.2.1** | **REC 문서 ID = Storage `objectId` 세그먼트 그대로 = `"<uuid>.json"`** |
| **8.2.2** | **Storage Rules는 `objectId`를 변환 없이 그대로 쓴다** — `firestore.get(/databases/(default)/documents/rebuildAdminStateObjects/$(objectId))` |
| **8.2.3** | **head 문서는 `objectPath` 대신 `recId`를 담는다** — 값이 곧 REC 문서 ID이자 Storage 세그먼트 |
| **8.2.4** | **전체 경로는 클라이언트가 상수 접두사와 `recId`로 만든다**(Rules는 만들지 않는다) |
| **8.2.5** | head 규칙은 `$(request.resource.data.recId)`로 **직접 보간**해 REC을 조회한다 |
| **8.2.6** | `recId` 형식은 **정규식으로만** 검증한다 — `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]json$` |

**이 매핑은 문자열 파싱·분해·연결을 전혀 쓰지 않는다.** 양쪽 Rules가 **같은 문자열을 문서 ID로 직접
사용**하므로 동일 문서가 보장된다.

### 8.3 head 스키마 변경 (스펙 037 계약 변경)

```
현재:  { schemaVersion, revision, objectPath }        ← 정확히 3키, hasOnly/hasAll로 강제
제안:  { schemaVersion, revision, recId }             ← 여전히 3키
```

- `objectPath` → `recId`로 **이름과 의미가 바뀐다**. 재사용 차단 조건도
  `objectPath != resource.data.objectPath` → **`recId != resource.data.recId`** 로 바뀐다.
- **영향**: 계약 §4.3·§4.4·§5.6 · `constants.ts`(`HEAD_ALLOWED_KEYS`) · `head.ts`(`validateHead`) ·
  `types.ts` · `write-port.ts` · `firestore.rules` · unit/emulator 테스트.
- **키 개수는 3으로 유지**되므로 `hasOnly`/`hasAll` 구조는 그대로다.

### 8.4 채택하지 않은 대안과 이유

| 대안 | 판단 |
| --- | --- |
| head에 `objectPath`와 `recId`를 **둘 다** 두고 일치 검증 | 검증에 **문자열 연결**(`'prefix/' + recId`)이 필요하다. **Rules의 문자열 `+` 연결 지원 여부를 이번 세션에서 확인하지 못했다 → UNCONFIRMED.** 확인 전에는 쓰지 않는다 |
| `objectPath`에서 **파싱**해 uuid 추출(`split`/부분 문자열) | **지원 여부 미확인 → UNCONFIRMED.** 사용하지 않는다 |
| head에 `objectPath`와 `recId`를 두되 **일치 검증 없이** `recId`만 판정에 사용 | head가 가리키는 경로와 REC이 **어긋날 수 있다** → 안전 논거가 무너진다. **기각** |

> **원칙: 공식 지원을 확인하지 못한 문자열 함수는 설계에 넣지 않는다.**
> §8.2는 그래서 **문자열 함수를 하나도 쓰지 않는다.**

---

## 9. 검증 — 단독 조건은 여전히 부적합

- **"head가 현재 가리키지 않는다" 단독 → 안전하지 않다.** **P2와 P3을 구분하지 못한다**(§2).
  P3을 지우면 `loadBaseline`이 **fail-closed**(계약 §6.2)되어 **운영자가 상태를 아예 못 읽는다.**
- **"오래됐다" 단독 → 여전히 안전 증명이 아니다.** 개별 transaction의 공식 상한은 **존재**하지만(§7),
  **`save()` 호출 전체의 벽시계 상한은 UNCONFIRMED**다(§7.1).
- **★ REC이 없는 현재 구조에서는 어떤 객체도 안전하다고 증명할 수 없다 ⇒ 삭제 보류가 기본값이다.**

---

## 10. 선택지

| | 필요한 권한 | Rules / config / code 변경 | 위험 |
| --- | --- | --- | --- |
| **O-1 운영자 수동** | 저장소 밖 콘솔 접근 | **0**(단 판단 근거로 REC이 필요) | 사람이 P3을 P2로 오인해도 **서버가 막지 않는다** |
| **O-2 backend / Admin SDK** | **G-3 재개** · 서비스 계정 · 함수 배포·과금 | `firebase.json` · `functions/**` + REC + 테스트 | 규칙이 틀리면 **자동으로** 손해 |
| **O-4 Storage Rules 서버 강제** | **클라이언트 delete 권한**(별도 승인) + **두 제품 연결 IAM**(§4) | `firestore.rules` + `storage.rules` + admin-write + 테스트 | **Storage 한도 2를 정확히 소진**(여유 0) · Firestore **quota/billing 증가** · **기본 DB만** · **NOT TESTED** |
| **O-3 삭제 보류** | 없음 | **0** | **오삭제 위험 0.** 비용 단조 증가(상한 UNCONFIRMED). **현재 상태이자 기본값** |

---

## 11. Founder 결정 결과 (2026-08-14)

| # | 질문 | 선택지 |
| --- | --- | --- |
| **D-1** | **A 승인** | SDC′ + 구조 A 식별 구조만 구현한다. |
| **D-2** | **O-3 승인** | 삭제 보류. 정리 주체와 delete 권한을 만들지 않는다. |
| **D-3** | **N 승인** | 보존 개수·주기를 정하지 않는다. |

---

## 12. UNCONFIRMED / NOT TESTED

- **구조 A + REC + `firestore.get()`/Storage `firestore.exists()` 규칙** — 2026-08-14 local
  `demo-denn-emulator` **13/13 PASS**. 실제 Firebase·IAM·배포는 **NOT TESTED**.
- **구조 B + `getAfter()`** — 미채택이며 **NOT TESTED**.
- **Rules의 문자열 연결(`+`)·분해(`split` 등) 지원 여부** — **UNCONFIRMED**. §8.2는 **쓰지 않는다.**
- **`save()` 호출 전체의 벽시계 상한** — **UNCONFIRMED**(§7.1). *(개별 transaction 제한은 확정: §7)*
- 실제 `admin/state.json` 크기·내용 — **NOT TESTED**.
- 리빌드 payload 크기 — **UNCONFIRMED**. 참고: 레거시 `published/state.json`이 base64 내장으로
  **492KB**였다(`denn-admin.html:14905-14906`). **리빌드가 같다는 근거는 없다.**
- **저장 빈도 미결정** — ⚠️ 레거시 admin 저장은 **3초 디바운스**였다
  (`reviews/2026-07-31-admin-write-boundary-investigation.md:74`).
  **저장마다 객체 1개 + REC 1개가 생기는 구조에서 이 값이 객체 수와 Firestore 비용을 지배한다.**
- bucket 객체 수·용량·location·class·lifecycle — **NOT TESTED / UNCONFIRMED**(저장소 밖).
- GCS·Firestore 요금 — **UNCONFIRMED**.
- Storage prefix 나열의 Rules 허용 여부 — **UNCONFIRMED**.
- `https://firebase.google.com/docs/reference/security/storage` ·
  `https://firebase.google.com/docs/reference/rules/rules.firestore` 본문 — **이 세션 미취득**
  (WebFetch가 내비게이션만 반환). §4·§6·§7의 인용은 전부 취득에 성공한 페이지에서 왔다.

---

## 13. 이 문서가 승인하지 **않는** 것

**실제 삭제 · 자동 정리 구현 · Rules 변경 · 클라이언트 delete 권한 · 두 제품 연결 IAM 활성화 ·
head 스키마 변경 · 백엔드(C6/G-3) 구현 · 배포 승인** — 전부 **아니다**.
계속 금지: **운영 쓰기 활성화** · `apps/**`와 UI 연결 · **발행**(F-B) · legacy 공유 쓰기(F-C) ·
**L-4/tombstone 구현** · 실제 Firebase/운영 bucket/운영 데이터/live network/실제 UID 접근 ·
**emulator 실행**.

### 13.1 인접 경계만 기록 (범위 확장 아님)

**C6(G-3)** — O-2를 고르면 곧 G-3 재개다. **L-4/tombstone** — 문서 *내부*의 삭제 의미론이라
객체 수준 orphan과 **다른 문제**이며 섞지 않는다. **발행(F-B)** — `published/`는 별도 경로라
이 정책을 **상속하지 않는다**.

## 14. 다음 단계 최소 파일 범위 (D-1·D-2 확정 후에만)

- **D-1=SDC′(A 또는 B) / D-2=O-4**: `firestore.rules`(REC 컬렉션 + head 규칙) ·
  `storage.rules`(delete, 선택적 create) · `packages/firebase/src/admin-write/**`
  (**head 스키마 `objectPath` → `recId`** 포함) · unit/emulator 테스트 · emulator rules 사본.
  **→ Rules 변경(G-1 재개) + 클라이언트 delete 권한 + IAM 활성화 승인.**
- **D-2=O-2**: 위 + `firebase.json` · `functions/**`. **→ G-3 재개.**
- **D-2=없음 / D-1 미정**: **제품 파일 0개.** 이 결정 문서와 상태 문서만.

**계속 금지**: `apps/**` · 루트 배럴 · `packages/firebase/src/admin-read/**` · `.firebaserc` ·
lockfile · 실제 `.env` · legacy HTML.

## 15. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

`docs/rebuild/design/taste-v2/**` · `docs/rebuild/design/README.md` ·
`docs/rebuild/specs/038-page-design-prototype.md` ·
`docs/rebuild/results/spec-018/browse-desktop-1280x800.png` ·
`docs/rebuild/results/spec-018/browse-mobile-390x844.png` · `packages/render/src/plan/index.ts`
