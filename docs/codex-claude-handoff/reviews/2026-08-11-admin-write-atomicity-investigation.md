# 조사 (읽기 전용) — 운영자 저장 원자성·충돌 방지 계약

작성: **Claude Code, 2026-08-11** · 브랜치 `rebuild/modern-studio` · 기준 HEAD `68fe339`
스펙 037 **후보** 사전 조사. **제품 구현도 계약 확정도 아니다.**

정본 입력:
`Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
`docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
`decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E 정본) ·
`reviews/2026-08-10-admin-auth-write-founder-decision-options.md` ·
`reviews/2026-07-31-admin-write-boundary-investigation.md` ·
`docs/rebuild/specs/036-admin-auth-private-state-read.md` ·
`storage.rules` · `firestore.rules` · `packages/firebase/src/admin-read/**` · `apps/admin/src/admin-read/**`

## 0. 범위와 준수

**문서 전용.** 이 조사에서 제품 코드·테스트·CSS·config·manifest·`package.json`·lockfile·
`storage.rules`·`firestore.rules`·`firebase.json` 변경은 **0**이다. 신규 의존성 **0**.
**실제 Firebase endpoint·운영 bucket·emulator·운영 데이터에 요청 0**, upload/write/delete/publish/deploy **0**.
새 자동화·반복 작업 **0**. 다음 구현 스펙 착수 **0**.

읽기만 한 것: 저장소 파일, **저장소에 이미 설치된** `node_modules`의 SDK 타입·번들 소스,
**공식 Firebase / Google Cloud 문서 페이지**(HTTP GET, 문서 사이트 한정).

확정 정책은 그대로 전제한다 — **F-B**(발행 제외) · **F-C**(레거시 `admin/state.json`은 읽기만 공유,
향후 쓰기는 rebuild 전용 격리 경로) · **F-D**(legacy `wcm`/`hcm` 정규화는 메모리 전용) ·
**F-E**(E3-strong, last-writer-wins 손실 불허, 원자성 확인 전 쓰기 구현 금지).

---

## 1. 결론 먼저

| 조사 목표 | 결론 |
| --- | --- |
| Web SDK 12.17.1이 Storage 조건부 쓰기(generation/metageneration precondition)를 제공하는가 | **아니다. 공개 API에 존재하지 않는다.** 소스·타입·공식 문서 3중 확인 |
| `ifGenerationMatch` / `ifMetagenerationMatch` 동등물이 있는가 | **없다.** SDK dist 전체 grep **0건** |
| "객체가 없을 때만 생성"(`ifGenerationMatch=0`)이 가능한가 | **클라이언트 SDK로는 불가능** |
| 업로드와 revision 갱신이 원자적인가 | **아니다.** 업로드(POST)와 `updateMetadata`(PATCH)는 **별개 요청** |
| Storage Rules만으로 strong atomicity가 되는가 | **아니다**(구조적). 세부 근거 일부는 **UNCONFIRMED** |
| Firestore transaction만으로 E3-strong이 되는가 | **아니다.** cross-service 원자성이 **문서상 존재하지 않는다** |
| **현재 client-only + 기존 Rules 경계에서 E3-strong 구현 가능한가** | **★ 불가능.** §8 분류 = **"현재 근거로는 보장 불가능"** |

→ **F-E에 의해 쓰기 구현은 계속 차단된다.** 이 조사는 차단을 풀지 못했다.
푸는 길은 두 개뿐이며 **둘 다 Founder 별도 승인 대상**이다(§6·§9).

---

## 2. Firebase Web SDK 12.17.1 — Storage 공개 쓰기 API 실측

### 2.1 저장소에 실제로 설치된 것

- `packages/firebase/package.json` → `"firebase": "12.17.1"` (정확 고정, 스펙 036 계약)
- `packages/firebase/node_modules/firebase/package.json` → `"version": "12.17.1"` **일치**
- 실제 Storage 구현체 = **`@firebase/storage@0.14.4`**
  (`node_modules/.pnpm/@firebase+storage@0.14.4_@firebase+app@0.16.0/node_modules/@firebase/storage`)
- Auth = `@firebase/auth@1.13.4`, App = `@firebase/app@0.16.0`, Firestore = `@firebase/firestore@4.17.0`

이하 라인 번호는 모두 그 `@firebase/storage@0.14.4` 패키지 기준이다.

### 2.2 공개 타입 (`dist/storage-public.d.ts`, 725줄)

```
:500  uploadBytes(ref, data: Blob|Uint8Array|ArrayBuffer, metadata?: UploadMetadata): Promise<UploadResult>
:510  uploadBytesResumable(ref, data, metadata?: UploadMetadata): UploadTask
:545  uploadString(ref, value: string, format?: StringFormat, metadata?: UploadMetadata): Promise<UploadResult>
:490  updateMetadata(ref, metadata: SettableMetadata): Promise<FullMetadata>
:149  getMetadata(ref): Promise<FullMetadata>
:28   deleteObject(ref): Promise<void>
```

**쓰기 4종(`uploadBytes`·`uploadBytesResumable`·`uploadString`·`updateMetadata`)의 인자는
`ref` / `data` / `metadata` 뿐이다. options·precondition·condition 파라미터가 아예 없다.**

```
:515  interface UploadMetadata extends SettableMetadata { md5Hash?: string }
:277  interface SettableMetadata {
        cacheControl? contentDisposition? contentEncoding?
        contentLanguage? contentType? customMetadata?: {[k:string]: string}
      }
```

**쓰기 입력 경로에 있는 필드는 위 7개가 전부다.** `generation`·`metageneration`은 없다.

```
:56   interface FullMetadata extends UploadMetadata {
        bucket, fullPath,
:69     generation: string,        // "The object's generation"
:74     metageneration: string,    // "The object's metageneration"
        name, size, timeCreated, updated, ...
      }
```

`FullMetadata`는 **읽기 결과 타입**이다(`getMetadata` 반환, `UploadResult.metadata` `:525-534`).
`FullMetadata extends UploadMetadata`라는 상속 방향 때문에 "업로드에 generation을 넣을 수 있어 보이는"
착시가 있으나, **입력 타입은 `UploadMetadata`이지 `FullMetadata`가 아니다.**

> **★ generation/metageneration은 읽기 정보이지 쓰기 precondition 입력이 아니다.** (조사 목표 2 답)

### 2.3 전량 grep — 0건

```
grep -rn "ifGenerationMatch|ifMetagenerationMatch|IfGenerationMatch|precondition" <@firebase/storage>/dist/
→ 0건 (.map 제외, 공개 d.ts·내부 d.ts·esm/cjs/node 번들·src 전부 포함)
```

`storage-public.d.ts`에서 `generation`/`metageneration`이 등장하는 곳은 **`:66-74` 단 한 곳**
(= `FullMetadata` 읽기 필드)이다. `etag`·`If-Match`·`ETag`도 **0건**.

### 2.4 ★ 내부 구현이 그것을 구조적으로 막는다 (`dist/index.esm.js`)

메타데이터 필드별 **writable 플래그**가 코드에 박혀 있다.

```js
:1390 class Mapping {
:1391   constructor(server, local, writable, xform) {
:1394     this.writable = !!writable;      // 3번째 인자 생략 → false
      }
:1412 mappings.push(new Mapping('bucket'));           // writable = false
:1413 mappings.push(new Mapping('generation'));       // ★ writable = false
:1414 mappings.push(new Mapping('metageneration'));   // ★ writable = false
:1436 mappings.push(new Mapping('md5Hash',   null, true));
:1437 …cacheControl / contentDisposition / contentEncoding / contentLanguage / contentType … true
:1443 mappings.push(new Mapping('metadata', 'customMetadata', true));
```

```js
:1505 function toResourceString(metadata, mappings) {
:1510   if (mapping.writable) { resource[mapping.server] = metadata[mapping.local]; }
:1514   return JSON.stringify(resource);
      }
```

→ **`generation`/`metageneration`은 요청 body에 물리적으로 실릴 수 없다.** 사용자가 객체에 넣어도 버려진다.

요청 빌더도 precondition을 붙이지 않는다.

```js
:1793 multipartUpload(...)        :1825 const urlParams = { name: metadata_['fullPath'] };   // ← name 뿐
:1863 createResumableUpload(...)  :1866 const urlParams = { name: metadataForUpload['fullPath'] };
:1752 updateMetadata$2(...)  method 'PATCH', headers = { 'Content-Type': 'application/json; charset=utf-8' }
                             → If-Match 헤더 없음, 쿼리 파라미터 없음
:1765 deleteObject$2(...)    method 'DELETE'  → 조건 없음
```

### 2.5 ★ endpoint 자체가 GCS JSON API가 아니다

```js
:27  const DEFAULT_HOST = 'firebasestorage.googleapis.com';
:571 function makeUrl(urlPart, host, protocol) { return `${protocol}://${origin}/v0${urlPart}`; }
:282 bucketOnlyServerUrl() { return '/b/' + encode(bucket) + '/o'; }
```

클라이언트 업로드는 **`https://firebasestorage.googleapis.com/v0/b/{bucket}/o?name=…`** 로 간다.
`ifGenerationMatch`가 문서화된 곳은 **`https://storage.googleapis.com/…` GCS JSON API**(§3 근거 2)다.
**두 API는 다른 표면이다.** 따라서 "쿼리 파라미터를 몰래 덧붙인다"는 우회는
**문서화되지 않은 동작에 제품을 거는 것**이고, 지시된 "내부 비공개 API를 제품 계약으로 쓰지 않는다"에 위배된다.
→ **후보에서 제외한다.**

### 2.6 업로드 ↔ revision 갱신의 원자성 (조사 목표 1의 마지막 항목)

- 콘텐츠 업로드 = **POST** (`multipartUpload` / resumable)
- 메타데이터 갱신 = **PATCH** (`updateMetadata`)
- 둘을 묶는 배치·트랜잭션 API가 **공개 표면에 없다.**
- `customMetadata`를 **업로드 시 함께** 보낼 수는 있다(`UploadMetadata`가 `SettableMetadata`를 상속).
  즉 "revision을 객체와 같은 요청에 실어 보내기"는 **가능**하다.
  **그러나 그 요청이 조건부가 아니므로** 원자성 문제는 그대로 남는다 — 두 운영자가 같은 revision을
  실어 보내면 **둘 다 성공**하고 나중 것이 이긴다.

> **결론: "업로드와 revision을 한 요청에 담는 것"은 되지만, "조건부로 담는 것"은 안 된다.**
> 원자성의 결핍은 요청 개수 문제가 아니라 **compare-and-set 부재** 문제다.

### 2.7 ★ 부수 위험 — SDK 자동 재시도

```js
:37 const DEFAULT_MAX_OPERATION_RETRY_TIME = 2 * 60 * 1000;    // 2분
:43 const DEFAULT_MAX_UPLOAD_RETRY_TIME   = 10 * 60 * 1000;    // 10분
:624 isRetryStatusCode(...)  :725-726 재시도 루프
```

SDK는 네트워크 오류·재시도 대상 status에서 **자동으로 다시 보낸다**(업로드 창 10분).
precondition이 없으므로 **재시도된 쓰기는 무조건적**이다.
"응답을 못 받았지만 서버는 성공했다"는 경우, 재시도가 **그 사이 들어온 다른 운영자의 저장을 덮을 수 있다**
(= §7의 "늦은 성공" 행). 스펙 036이 읽기에서 세운 **자동 retry 0** 규율(`read-port.ts:153`)이
쓰기에서는 **SDK 내부 재시도 때문에 그대로 성립하지 않는다** — 쓰기 계약이 반드시 다뤄야 할 항목이다.

---

## 3. 공식 문서 근거 (전부 2026-08-11 확인)

> 검색 결과·블로그는 정본으로 쓰지 않았다. 아래는 전부 `firebase.google.com` / `docs.cloud.google.com`이다.

| # | URL | 제목 | 이 조사에 쓰인 결론 |
| --- | --- | --- | --- |
| 1 | `https://docs.cloud.google.com/storage/docs/request-preconditions` | Request preconditions | 지원 precondition = `ifGenerationMatch`/`ifGenerationNotMatch`/`ifMetagenerationMatch`/`ifMetagenerationNotMatch` + ETag/date 헤더. 표면 = **JSON API 쿼리 파라미터 / XML API `x-goog-if-*` 헤더 / gcloud `--if-generation-match` / 서버 클라이언트 라이브러리**. `ifGenerationMatch=0` = "해당 이름의 객체가 없을 때만". 실패 시 **412 Precondition Failed**. "Preconditions are often used to prevent race conditions in mutating requests, such as uploads, deletes, or metadata updates." **★ Firebase Web(JS) 클라이언트 SDK는 이 페이지에 언급되지 않는다.** |
| 2 | `https://docs.cloud.google.com/storage/docs/json_api/v1/objects/insert` | Objects: insert | `ifGenerationMatch` 등 4종이 **JSON API 쿼리 파라미터**로 존재. endpoint = `POST https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o` — **Firebase 클라이언트 SDK 경로가 아니다**(§2.5) |
| 3 | `https://docs.cloud.google.com/storage/docs/metadata` | Object metadata | `generation` = "Identifies the version of an object". `metageneration` = "increases every time the metadata of a given generation is updated", 새 generation마다 **1에서 시작**. 둘 다 **서버 할당이며 클라이언트가 직접 설정할 수 없다**. 덮어쓰면 **새 generation**. **★ "generation numbers might not increase for future versions, but each new version has a unique generation number"** → **generation은 단조 증가가 아니므로 revision 카운터로 쓸 수 없다** |
| 4 | `https://docs.cloud.google.com/storage/docs/consistency` | Consistency | 객체 쓰기는 **strong read-after-write**. 단, **동시 쓰기 중 누가 이기는지는 문서화하지 않는다**. race condition 회피 지침은 **"use preconditions"** 하나뿐 |
| 5 | `https://firebase.google.com/docs/storage/web/file-metadata` | Download files / File Metadata (Web) | 메타데이터 속성표에서 **`generation`·`metageneration`은 읽기 전용**, 쓰기 가능은 `md5Hash`(업로드 시)·`cacheControl`·`contentDisposition`·`contentEncoding`·`contentLanguage`·`contentType`·`customMetadata`. **`updateMetadata()`에 조건/precondition 옵션은 문서에 없다** |
| 6 | `https://firebase.google.com/docs/storage/web/upload-files` | Upload files (Web) | `uploadBytes`/`uploadBytesResumable`/`uploadString` + 선택적 metadata. **조건부 업로드·generation 매칭·create-only 의미는 문서에 존재하지 않는다** |
| 7 | `https://firebase.google.com/docs/storage/security/core-syntax` | Cloud Storage Security Rules 기본 구조 | **★★ 세분 연산: `get`=단일 파일 읽기, `list`=목록(v2), `create`="Applies to writes to file contents", `update`="Applies to updates to (pre-existing) file metadata", `delete`=삭제.** "A `write` rule can be broken into `create`, `update`, and `delete`" |
| 8 | `https://firebase.google.com/docs/storage/security/rules-conditions` | Rules conditions | `request` = `auth`/`params`/`path`/`resource`/`time`. `resource` = 기존 객체 메타데이터(`size`,`contentType`,`md5Hash`,`timeCreated`,`updated`,`metadata` 맵). **★ `request.resource`는 `generation`·`metageneration`·`etag`·`timeCreated`·`updated`를 제외한 메타데이터만 담는다.** 커스텀 메타데이터는 양쪽 모두 `.metadata`로 접근 |
| 9 | `https://firebase.google.com/docs/rules/rules-language` | Rules 언어 | Storage 메서드 = 읽기 `get`/`list`(+`read`), 쓰기 `create`/`update`/`delete`(+`write`). **원자성·동시성·트랜잭션성 서술 없음** |
| 10 | `https://firebase.google.com/docs/firestore/manage-data/transactions` | Transactions and batched writes | Firestore 트랜잭션 = **all-or-nothing**, "Transactions never partially apply writes." 경합 시 **자동 재실행**("might run more than once"), **읽기가 쓰기보다 먼저**, **오프라인이면 실패**. **★ Firestore 밖 서비스(Cloud Storage 등)를 포함하는 트랜잭션은 문서에 존재하지 않는다** |

### 3.1 근거로 쓰지 **못한** 페이지 (정직한 기록)

`https://firebase.google.com/docs/reference/js/storage` · `…/storage.uploadmetadata` ·
`https://firebase.google.com/docs/reference/security/storage` 세 페이지는 **JS 렌더링 참조 문서**라
가져온 본문이 내비게이션뿐이었고 **API 본문을 얻지 못했다**.
→ 그 자리를 **저장소에 실제 설치된 `storage-public.d.ts`(= 그 참조 문서의 생성 원본)** 로 대체했다(§2.2).
**"문서에 없다"가 아니라 "이 조사에서 그 페이지를 읽지 못했다"** 로 기록한다.

---

## 4. Storage Rules만으로 strong atomicity가 되는가

**결론: 되지 않는다.** 근거 3층이며, 아래 (a)만으로 이미 결론이 난다.

### (a) ★★ Rules는 동시 요청을 직렬화하지 않는다 (결정적)

Rules는 **각 요청에 대한 술어(predicate)** 다. 두 요청이 각각 독립적으로 평가된다.

```
t0  admin/state.json  customMetadata.rev = 7
t1  A: PUT rev=8   rules 평가 → resource.metadata.rev(7) + 1 == 8  → 통과
t2  B: PUT rev=8   rules 평가 → resource.metadata.rev(7) + 1 == 8  → 통과
t3  둘 다 통과 → 나중 것이 이김 → A 또는 B의 편집 소실
```

`rev + 1` 강제는 **"낡은 base로 쓰는 것"은 막지만 "같은 base로 둘이 동시에 쓰는 것"은 막지 못한다.**
compare-and-set은 **비교와 치환이 하나의 원자 연산일 때만** 성립하는데,
Rules 평가와 객체 쓰기가 그런 원자 단위라는 **공식 문서 서술이 없다**(근거 9는 원자성을 언급하지 않는다).

> **문서 근거가 없으므로 "Rules 평가와 write의 원자성" 자체는 `UNCONFIRMED`로 남긴다.**
> 다만 **UNCONFIRMED인 것에 E3-strong을 걸 수는 없다** — F-E는 "확인 전까지 차단"이다.

### (b) ★ `create`와 `update`의 의미가 Firestore와 다르다

근거 7의 정의:

- `create` = **"writes to file contents"** — 즉 **기존 객체를 덮어쓰는 업로드도 `create`** 다.
- `update` = **"updates to (pre-existing) file metadata"** — 즉 **`updateMetadata()` PATCH 전용**.

따라서 `allow update: if request.resource.metadata.rev == resource.metadata.rev + 1` 같은 규칙은
**`updateMetadata` 호출에만 걸리고, 실제 상태 저장(콘텐츠 업로드)에는 걸리지 않는다.**
콘텐츠를 지키려면 `create`에 조건을 걸어야 하는데, 덮어쓰기 상황에서 `create` 평가 시
**`resource`가 이전 객체로 채워지는지** 는 공식 문서에 서술이 없다 → **UNCONFIRMED**.

부수 결과: **"객체가 없을 때만 생성"을 Rules로 표현하는 문서화된 방법이 없다.**
Firestore Rules의 `exists()`에 해당하는 Storage 함수를 근거 7~9에서 확인하지 못했다 → **UNCONFIRMED**.

### (c) `request.resource`가 generation을 보지 못한다

근거 8: **`request.resource`는 `generation`·`metageneration`·`etag`를 제외한다.**
→ Rules는 "클라이언트가 주장하는 base generation"을 볼 수 없다.
비교 대상은 **클라이언트가 `customMetadata`에 스스로 써넣은 숫자**뿐이고, 그것은
**서버가 보증하는 버전이 아니라 클라이언트의 주장**이다. (a)와 겹쳐서 CAS가 성립하지 않는다.

### (d) 그래도 Rules가 할 수 있는 것 (정확히 기록)

Rules는 **약한 방어**로는 유효하다: `rev`가 정수인지, 단조 증가하는지, `+1`인지 강제해
**낡은 base로 덮어쓰는 사고**(§7 "브라우저 종료 후 늦은 재시도" 등)를 상당수 거른다.
이는 **E2-best-effort의 품질을 올리는 수단이지 E3-strong의 증명이 아니다.**
그리고 **어떤 경우든 `storage.rules` 변경 = Founder 승인 대상**이다(§9). **이번 조사에서 파일은 수정하지 않았다.**

---

## 5. Firestore transaction / lease·lock 후보

### 5.1 사용 가능한 것 (신규 의존성 0)

- `@firebase/firestore@4.17.0`이 **이미 `firebase@12.17.1` 안에 설치돼 있다.**
  `packages/firebase/node_modules/firebase/firestore` 서브패스 존재.
  → **Firestore 도입에 신규 의존성은 필요 없다.**
- `dist/index.d.ts:2572` `runTransaction(firestore, updateFunction, options?): Promise<T>`
- `dist/index.d.ts:3082-3085` `TransactionOptions.maxAttempts` — **"Default is 5"**
- 번들 비용: `firebase-firestore.js` **683,502 bytes**, `firebase-firestore-lite.js` **132,941 bytes**
  (admin 전용 lazy 청크로 갈 수 있다 — 스펙 036이 SDK를 동적 import로 격리한 구조 `sdk-facade.ts:24-28`가 그대로 재사용 가능)

### 5.2 ★★ Firestore Rules가 지금은 전부 막는다

```
firestore.rules:11-15   match /spaces/{token}  read/create 개방, update/delete: if false
firestore.rules:18-21   match /{document=**}   allow read, write: if false;   ← catch-all 거부
```

→ **lock/lease/head 용도의 새 컬렉션은 현재 규칙에서 100% 거부된다.**
**Firestore 잠금 도입 = `firestore.rules` 변경 = Founder 별도 승인 대상.** (F-A가 Rules 변경을 명시적으로 미승인)

또한 `spaces/{token}`의 `update: if false`는 **의도된 불변성**(§CLAUDE.md 절대 보존 제약 3)이므로
**기존 컬렉션을 잠금으로 전용하는 것은 금지**다.

### 5.3 ★★ cross-service 원자성은 존재하지 않는다

근거 10을 근거로: Firestore 트랜잭션의 원자성은 **Firestore 문서에 대해서만** 정의된다.
**Storage 업로드를 트랜잭션에 넣는 API가 없다.** 따라서 어떤 설계를 하든

```
[Firestore 트랜잭션]  ── 네트워크 간극 ──  [Storage 업로드]
```

사이에 **원자성이 없는 창(window)** 이 반드시 생긴다. 이 창에서 나오는 실패 조합:

| 실패 조합 | 결과 | 데이터 손실? |
| --- | --- | --- |
| lock 획득 성공 → 업로드 실패 | lock이 잡힌 채 남음(만료까지 다른 운영자 차단) | **없음**(가용성 저하) |
| 업로드 성공 → lock/revision 갱신 실패 | 원격 바이트는 새것, 기록된 revision은 옛것 → **다음 writer가 자기 base를 옳다고 믿음** | **★ 있음** |
| 업로드 중 브라우저 종료 | 업로드 완료 여부 불명 + lock 미해제 | **가능**(위 행으로 수렴) |
| 인증 만료 | Storage 401/403 또는 Firestore 거부 — 어느 쪽이 먼저인지 보장 없음 | 조합에 따라 위 행 |
| 중복 탭 | 같은 계정·같은 lock 문서 → **Firestore 트랜잭션이 직렬화**하므로 lock 자체는 안전 | lock만으로는 **없음**, Storage 쓰기는 여전히 무조건적 |
| lease 만료 + clock skew | A의 lease가 A 시계로는 유효, 서버/B 시계로는 만료 → **A와 B가 동시에 "내가 소유자"** | **★ 있음** |
| 늦은 성공(§2.7 SDK 자동 재시도) | lease 만료 후 A의 재시도가 도착해 B의 저장을 덮음 | **★ 있음** |

`serverTimestamp()`로 lease를 서버 시계에 묶으면 skew는 줄어들지만,
**"만료 판정 시점"과 "Storage 쓰기 도착 시점"이 다른 서비스**라 근본 창은 남는다.

> **★ 그러므로 "Firestore lock을 쓰니 E3-strong이다"는 근거 없이 단정할 수 없다.**
> lock은 **Firestore 상태에 대해서만** strong하고, **Storage 바이트에 대해서는 advisory**다.

### 5.4 ★ 다만 — Firestore를 "잠금"이 아니라 "포인터"로 쓰면 달라진다

손실이 발생하는 이유는 **같은 객체 경로를 두 writer가 덮어쓰기 때문**이다.
**덮어쓰기를 아예 없애면** cross-service 창이 있어도 **바이트 손실이 구조적으로 불가능**해진다.

```
경로 규약(F-C의 rebuild 전용 격리 경로 안에서):
  admin-rebuild/state/rev-<N>.json   ← 각 revision이 서로 다른 객체. 덮어쓰기 0
  Firestore: <격리 컬렉션>/head = { rev: N }   ← 유일한 가변 지점, 트랜잭션으로만 이동
```

1. **예약** — 트랜잭션: `head.rev == base`인지 확인하고 `N = base + 1` 확보 (경합 시 즉시 실패)
2. **업로드** — `rev-N.json`에 업로드. **아무도 이 경로를 갖고 있지 않다** → 덮어쓸 대상이 없음
3. **커밋** — 트랜잭션: `head.rev`가 여전히 `base`이면 `head.rev = N`

- 2 실패 → `head`는 그대로, **손실 0**(재시도는 새 rev를 예약)
- 3 실패 → `rev-N.json`이 **orphan**으로 남음, `head`는 안전, **손실 0**
- 늦은 성공/재시도 → 자기 `rev-N.json`만 다시 씀. **남의 바이트를 건드릴 수 없다**
- 브라우저 종료 → orphan + 미커밋. **손실 0**
- **B의 저장은 "덮어쓰기"가 아니라 "커밋 실패"로 끝난다** → fail-closed. 재읽기 후 재시도는 운영자 판단

**복구 절차(필수 부속물)**: orphan `rev-*.json`은 `head`가 가리키지 않는 객체다.
누적되면 비용·혼란이 되므로 **(i) orphan 식별 규칙**과 **(ii) 정리 정책**이 계약에 있어야 한다.
클라이언트가 지울 수 있게 하려면 `admin-rebuild/` `delete` 권한이 필요하고 → **Rules 변경**.
지우지 않고 방치하면 → **운영 비용·저장소 증가**. **어느 쪽이든 Founder 결정 항목**(§9).

> **판정: 이 후보는 E3-strong을 만족할 수 있는 유일한 client-only 형태다.
> 단 Firestore 사용 + `firestore.rules` 변경(+ 격리 경로에 대한 `storage.rules` 검토)이 전제이므로
> "현재 경계"가 아니다.** §7에서 **PASS(조건부)** 로 표기한다.
> 실제 동시성 동작은 **실행·검증하지 않았다 → NOT VERIFIED.**

---

## 6. 후보 비교

| # | 후보 | client-only 경계 | 신규 backend | Rules 변경 | 신규 의존성 | 비용·운영 권한 | E3-strong |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **C1** | 무조건 `uploadBytes`(레거시 모델 계승) | 유지 | 불필요 | 불필요 | 0 | 없음 | **FAIL** — L-1~L-4 그대로 |
| **C2** | 쓰기 직전 `getMetadata`/`getBytes`로 재확인 후 업로드 | 유지 | 불필요 | 불필요 | 0 | 없음 | **FAIL** — TOCTOU 창. 확인과 쓰기 사이가 원자적이지 않다 |
| **C3** | Storage Rules로 `customMetadata.rev` +1 강제 | 유지 | 불필요 | **필요**(`storage.rules`) | 0 | Rules 배포 권한 | **FAIL**(§4a) — 낡은 base는 막지만 동시 동일 base는 못 막음. 원자성 **UNCONFIRMED** |
| **C4** | Firestore lease/lock + 무조건 Storage 업로드 | 유지 | 불필요 | **필요**(`firestore.rules`) | 0(SDK 내장) | Rules 배포, Firestore 읽기/쓰기 과금 | **FAIL**(§5.3) — lock은 advisory, cross-service 창 잔존 |
| **C5** | **★ Firestore head 포인터 + revision별 immutable 객체**(§5.4) | 유지 | 불필요 | **필요**(`firestore.rules`, `storage.rules` 격리 경로) | 0(SDK 내장) | Rules 배포, Firestore 과금, **orphan 정리 정책** | **PASS (조건부·미검증)** |
| **C6** | Cloud Function / 서버 / Admin SDK가 GCS JSON API `ifGenerationMatch`로 쓰기 | **벗어남** | **필요** | Storage는 Admin이 우회하나 함수 인증 설계 필요 | 서버측 신규 | **함수 배포·런타임·과금·서비스 계정 권한**, `firebase.json`에 `functions` 블록 신규(현재 **없음**), `functions/` 디렉터리 **없음** | **PASS** — 근거 1·2의 문서화된 412 |
| **C7** | 단일 운영자 UI 잠금(한 번에 한 편집자) | 유지 | 불필요 | 불필요 | 0 | 없음 | **FAIL** — 다른 탭·기기·브라우저를 막지 못하는 **권고(advisory)** 수단 |

보조 관찰:

- **C6이 문서상 가장 확실하다**(근거 1·2가 명시적으로 보증). 하지만 **client-only 경계를 명확히 벗어나고**,
  저장소에 **함수 기반 자체가 없다**(`firebase.json`에 `functions` 블록 없음, `functions/` 디렉터리 없음).
  `firebase.json`의 `hosting.public`이 여전히 `"."` 라 **deploy 금지 상태**인 것도 그대로다.
- **C5는 신규 의존성이 0**이다(Firestore가 이미 `firebase` 안에 있다). 비용은 **Rules 변경 + Firestore 과금 + orphan 정리**다.
- **C3 + C5 병용**은 가능하다(Rules가 격리 경로의 형식을 강제하고, 원자성은 C5가 담당).

---

## 7. 시나리오 · 실패표

### 7.1 기준 시나리오 — 운영자 A/B가 같은 revision을 읽고 동시에 저장

```
                    admin state rev = 7
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
     A: load(rev 7)                          B: load(rev 7)
        │  … A가 frameSizes 수정               │  … B가 room 설정 수정
        │                                       │
     A: save(base=7)                         B: save(base=7)
        │                                       │
        ▼                                       ▼
   ┌──────────────────────────────────────────────────┐
   │  두 요청이 서로를 모르는 채 서버에 도착한다        │
   │  ── 여기서 무엇이 그것을 직렬화하는가? ──          │
   └──────────────────────────────────────────────────┘
        C1/C2  아무것도 없음        → 나중 것이 이김. 진 쪽 편집 소실
        C3     Rules 술어(요청별)   → 둘 다 rev 8 제출, 둘 다 통과 → 소실
        C4     Firestore lock       → lock은 직렬화되나 Storage 쓰기는 그대로 → 창 잔존
        C5     head CAS + 고유 경로 → B의 커밋이 실패(base≠head). A만 반영. 소실 0
        C6     서버 ifGenerationMatch → B가 412. A만 반영. 소실 0
```

**C5/C6에서 B의 작업이 사라지지 않는다는 뜻이 아니다** — B는 **명시적 실패**를 받고,
A의 최신본을 다시 읽어 편집을 재적용해야 한다. **E3-strong이 요구하는 것은 "조용한 손실 금지"이지
"자동 병합"이 아니다.** (자동 병합 여부는 Codex 결정 X-2 계열이며 이 조사 범위 밖이다.)

### 7.2 실패표 — 각 후보가 **데이터 손실**을 확실히 막는가

| 상황 | C1 무조건 | C2 재확인 후 쓰기 | C3 Rules rev+1 | C4 Firestore lock | **C5 head+immutable** | **C6 서버 precondition** |
| --- | --- | --- | --- | --- | --- | --- |
| **정상**(경합 없음) | PASS | PASS | PASS | PASS | PASS | PASS |
| **동시 충돌**(같은 base) | **FAIL** | **FAIL**(TOCTOU) | **FAIL**(§4a) | **FAIL**(§5.3) | **PASS**(커밋 CAS 실패) | **PASS**(412) |
| **timeout**(응답 못 받음) | **FAIL**(상태 불명) | **FAIL** | UNCONFIRMED | **FAIL** | **PASS**(고유 경로라 무해) | **PASS**(재시도도 조건부) |
| **늦은 성공**(SDK 자동 재시도 §2.7) | **FAIL**(남의 저장을 덮음) | **FAIL** | UNCONFIRMED(옛 rev면 거부될 수 있음) | **FAIL**(lease 만료 후 도착) | **PASS**(자기 rev 객체만 씀) | **PASS** |
| **브라우저 종료**(업로드 중) | **FAIL** | **FAIL** | UNCONFIRMED | **FAIL**(lock 잔존 + 부분 상태) | **PASS**(orphan만 남음) | **PASS** |
| **lock 만료 / clock skew** | 해당 없음 | 해당 없음 | 해당 없음 | **FAIL**(이중 소유자) | 해당 없음(lock 없음) | 해당 없음 |
| **인증 만료 중 저장** | **FAIL** | **FAIL** | UNCONFIRMED | **FAIL** | **PASS**(커밋 실패 = 미반영) | **PASS** |
| **중복 탭**(같은 계정) | **FAIL** | **FAIL** | **FAIL** | PASS(lock 직렬화) | **PASS** | **PASS** |

> **판정 표기 규칙**: `UNCONFIRMED`는 "Rules 평가와 write의 원자성"(§4a) 및
> "덮어쓰기 시 `create`에서 `resource`가 채워지는지"(§4b)가 문서로 확인되지 않아
> **PASS로도 FAIL로도 단정하지 않은 칸**이다.
> **C5·C6의 PASS는 문서·구조 기반 추론이며, 이 조사에서 실행 검증은 하지 않았다 → NOT VERIFIED.**

### 7.3 레거시 손실 경로와의 대응

선행 조사(`reviews/2026-07-31-admin-write-boundary-investigation.md` §2.4)의 L-1~L-4는
**전부 C1(무조건 쓰기 + 벽시계 rev) 계열의 증상**이다.

| 레거시 | 원인 | C5/C6에서 |
| --- | --- | --- |
| **L-1** 시계 역전(`__cloudRev = Date.now()`) | 벽시계 revision | 소멸 — revision이 **서버가 직렬화한 단조 정수**(C5 head) 또는 **서버 generation**(C6) |
| **L-2** 디바운스 창 안 겹침, upload 전 재확인 없음 | CAS 부재 | 소멸 — 두 번째가 실패로 끝남 |
| **L-3** 두 rev가 정확히 같아 분기 고착 | 동률 처리 없음 | 소멸 — 동률이 곧 충돌이고 명시적 실패 |
| **L-4** 개수 점수 union → 삭제 부활(`frameSizes`엔 tombstone 없음) | **병합 정책 문제** | **★ 소멸하지 않는다.** 원자성은 "누가 이기는가"를 정할 뿐 **병합 의미론을 고치지 않는다**. tombstone/삭제 표현은 **별도 계약(X-3)** 이 필요하다 |

> **★ L-4는 이 조사가 해결하지 못한다는 점을 명확히 남긴다.** 원자성 ≠ 병합 정확성.

---

## 8. 결론 분류 (지시된 4택)

> ### **▶ "현재 근거로는 보장 불가능" — 그리고 부분적으로 "Rules/Firestore/backend가 있어야 가능"**

정확히 쪼개면:

| 분류 | 판정 |
| --- | --- |
| ① 현재 client-only + **기존 Rules 경계**에서 E3-strong 구현 가능 | **아니다.** SDK에 CAS가 없고(§2), Rules는 동시 요청을 직렬화하지 않으며(§4a), 현재 `firestore.rules`는 새 컬렉션을 전부 거부한다(§5.2) |
| ② **Rules 변경**이 있어야 가능 | **Rules 변경만으로는 부족하다.** C3 단독은 §4a로 FAIL. Rules 변경은 C5의 **전제 조건**이지 해답이 아니다 |
| ③ **Firestore 또는 backend**가 있어야 가능 | **★ 이것이 유일하게 열린 길이다.** **C5**(Firestore head + immutable 객체, Rules 변경 필요, 실행 미검증) 또는 **C6**(서버/Cloud Function + GCS JSON API precondition, 문서상 확실, backend 신설 필요) |
| ④ 현재 근거로는 보장 불가능 | **현재 승인 경계 안에서는 그렇다.** ③의 두 후보는 **아직 승인되지 않은 권한**을 요구한다 |

> ### **▶ 따라서 쓰기 구현을 열지 않는다.**
> F-E("실제 원자적 precondition 또는 잠금 가능성을 확인하기 전까지 쓰기 구현 금지")는
> **이 조사로 해제되지 않았다.** 확인된 것은 **"클라이언트 SDK에는 없다"** 는 부정 결론이고,
> 긍정 경로(C5·C6)는 **Founder 승인이 필요한 새 권한** 위에서만 성립한다.
> 상태를 **`FOUNDER_DECISION_REQUIRED`** 로 둔다.

---

## 9. 결정 항목 분리

### 9.1 Codex 구조 결정 후보 (아직 결정되지 않았다)

| # | 항목 | 이 조사가 제공하는 입력 |
| --- | --- | --- |
| **Y-1** | **revision 형식** — 단조 정수 / 서버 generation / 복합 | §3 근거 3: **generation은 단조 증가가 아니다** → "다음 rev = generation+1"은 성립하지 않는다. 벽시계는 L-1의 원인. C5는 **Firestore head가 정하는 단조 정수**를 요구한다 |
| **Y-2** | **격리 경로 후보**(F-C가 "rebuild 전용 격리 경로"까지만 정함) | C5는 **revision별 고유 경로**를 요구한다(예: `<격리>/state/rev-<N>.json`). 단일 고정 경로를 고르면 C5가 성립하지 않는다 → **경로 형태와 원자성 전략은 함께 결정해야 한다** |
| **Y-3** | **port 경계** | 스펙 036의 선례가 그대로 쓸 수 있다: 주입 facade(`facade.ts`), 경로는 **모듈 상수**(`constants.ts:4`, `read-port.ts:92`의 "path/bucket 파라미터 없음"), **단일 in-flight**(`read-port.ts:150`), **자동 retry 0**(`:153`). ⚠️ **쓰기는 SDK 내부 재시도(§2.7)가 있어 "retry 0"이 port 레벨만으로 보장되지 않는다** — 계약이 명시해야 한다 |
| **Y-4** | **오류 코드** | 기존 15개 코드 체계(`types.ts:12-31`, `errors.ts:13-32`)에 충돌 계열 신설 필요(예: 낡은 base / 커밋 경합 / orphan). `retryable` 값이 **코드의 속성**이라는 규율(`errors.ts:12`) 유지. 충돌은 **`retryable: false` + 재읽기 유도**가 자연스럽다(자동 재시도가 곧 덮어쓰기이므로) |
| **Y-5** | **합성 fake 검증 방법** | `public-catalog/reader.ts`의 주입 transport 선례 + `vitest.config.ts`의 `*.live.test.ts` 기본 제외. **동시성은 fake로 결정적으로 재현 가능**하다(두 writer의 요청 순서를 테스트가 직접 배열). **실제 서버 원자성은 fake로 증명되지 않는다** — 이 경계를 계약이 명시해야 한다 |
| **Y-6** | **L-4(삭제 부활) 병합 의미론** | §7.3: **원자성으로 해결되지 않는다.** tombstone 도입 여부(선행 X-3)가 여전히 열려 있다 |
| **Y-7** | **orphan 식별·정리 규칙**(C5 채택 시) | §5.4. 정리를 클라이언트가 하면 `delete` 권한 → Rules 확대. 안 하면 누적 |

### 9.2 Founder 결정 후보 (승인된 적 **없다**)

| # | 항목 | 필요한 이유 |
| --- | --- | --- |
| **G-1** | **`storage.rules` 변경 승인** | C3/C5 모두 격리 경로 규칙이 필요. F-A가 Rules 변경을 **명시적으로 미승인**했다 |
| **G-2** | **Firestore 사용 승인 + `firestore.rules` 변경 승인** | 현재 catch-all이 새 컬렉션을 **전부 거부**한다(`firestore.rules:18-21`). C4/C5의 절대 전제 |
| **G-3** | **backend / Cloud Function 승인** | C6의 전제. 저장소에 함수 기반이 **전혀 없다**(`firebase.json`에 `functions` 블록 없음, `functions/` 없음) |
| **G-4** | **운영 비용·복구 정책** | Firestore 읽기/쓰기 과금, revision별 객체 누적 저장 비용, **orphan 정리 주체와 주기**, 충돌 시 운영자에게 무엇을 요구할지(재읽기·수동 재적용) |
| **G-5** | **★ 그래서 어느 길로 갈 것인가** | **C5(Firestore 경로)** vs **C6(backend 경로)** vs **"쓰기를 계속 열지 않는다"**. 셋 다 정당한 선택지다 — 마지막 것을 고르면 운영자는 계속 레거시 admin에서 저장한다(스펙 035가 남긴 현 상태) |

> **위 표의 어떤 항목도 승인된 것으로 기록하지 않는다.** C5는 **Claude의 구조 분석 결과이지 권장 결정이 아니며**,
> Founder가 고르기 전에는 아무 것도 확정되지 않는다.

---

## 10. UNCONFIRMED / NOT VERIFIED

**UNCONFIRMED (문서 근거를 찾지 못함 — 추측하지 않았다)**

- Storage **Rules 평가와 객체 write 사이의 원자성**(직렬화 여부). 근거 7~9에 서술 없음.
- 기존 객체를 **덮어쓰는 업로드(`create`)에서 `resource`가 이전 객체로 채워지는지.**
- Storage Rules에 Firestore의 `exists()`에 해당하는 **"객체 부재" 판정 수단**이 있는지.
- `firebasestorage.googleapis.com/v0` 표면이 GCS precondition 쿼리 파라미터를 **수용하는지**
  (문서화되지 않았고, **문서화되지 않은 동작은 제품 계약으로 쓰지 않는다** — §2.5).
- `firebase.google.com/docs/reference/js/storage*` 및 `docs/reference/security/storage` 참조 문서 본문
  (JS 렌더링으로 본문 미취득 — §3.1). 그 자리를 설치된 `.d.ts`로 대체했다.

**NOT VERIFIED (실행·재현하지 않았다)**

- **C5·C6의 실제 동시성 동작.** 실제 Firebase/네트워크/emulator 실행 **0**이므로 표의 PASS는
  **문서·구조 기반 추론**이다.
- 실제 412 응답, Rules의 실제 거부 동작, `storage.rules`·`firestore.rules`의 **실제 배포 여부**.
- 실제 `admin/state.json`·`published/state.json`의 내용·크기, L-1~L-4의 실제 재현.
- 운영자 계정 실재·로그인, 인증 만료·갱신, 실기기 동작.
- `firebase-firestore.js` 683,502 bytes를 admin lazy 청크로 분리했을 때의 **실제 번들 영향**(빌드 미실행).

## 11. 유지되는 경계

- **F-B 발행 제외 · F-C 레거시는 읽기만 공유 · F-D 정규화 메모리 전용 · F-E E3-strong** 전부 무변경.
- 스펙 036 계약(`admin/state.json` 고정 경로 **읽기 전용**, 메모리 전용, `@denn/firebase/admin-read`
  서브패스 전용, 루트 배럴 무변경, 기본 비활성)은 **이 조사로 바뀌지 않는다.**
- 리빌드 `apps/**`·`packages/**`에 **쓰기 표면은 여전히 0건**이다(grep: `uploadBytes`·`uploadString`·
  `deleteObject`·`updateMetadata`·`setDoc`·`runTransaction`·`addDoc`·`getFirestore` **0건**).
  레거시 `denn-admin.html`·`denn-mockup-tool.html`에는 존재한다(각 2건) — 이번에도 손대지 않았다.
- `firebase.json`의 `hosting.public`은 여전히 `"."` 이므로 **deploy 금지 상태 그대로**다.
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않았다.**
