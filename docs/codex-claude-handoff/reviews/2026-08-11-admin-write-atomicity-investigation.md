# 조사 (읽기 전용) — 운영자 저장 원자성·충돌 방지 계약

작성: **Claude Code, 2026-08-11** · 브랜치 `rebuild/modern-studio` · 기준 HEAD `68fe339`
**보완 라운드 1 (CORRECTION_REQUIRED, 2026-08-11)** 적용 · 보완 기준 HEAD `9c57201`
스펙 037 **후보** 사전 조사. **제품 구현도 계약 확정도 아니다.**

정본 입력:
`Automation/DENN_AUTOMATION_STATE.md` · `Automation/NEXT_CLAUDE_PROMPT.md` ·
`docs/codex-claude-handoff/CURRENT.md` · `docs/live/CLAUDE_LIVE_PATCH_LOG.md` ·
`decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E 정본) ·
`reviews/2026-08-10-admin-auth-write-founder-decision-options.md` ·
`reviews/2026-07-31-admin-write-boundary-investigation.md` ·
`docs/rebuild/specs/036-admin-auth-private-state-read.md` ·
`storage.rules` · `firestore.rules` · `packages/firebase/src/admin-read/**` · `apps/admin/src/admin-read/**`

---

## 0. 보완 라운드 1 — 무엇을 정정했는가

Codex 검수가 초판(`768eecf`)에서 **5건의 결함**을 지적했다. 이 문서는 그 정정본이다.
**제품 코드·`storage.rules`·`firestore.rules`·`firebase.json`·설정·lockfile 변경은 계속 0**이며,
**Founder G-1~G-5 결정은 아직 요청하지 않는다.**

| # | 초판의 결함 | 정정 |
| --- | --- | --- |
| **1** | Storage Rules에 "객체가 없을 때만 생성"하는 **문서화된 방법이 없다 / UNCONFIRMED**라고 적었다 | **틀렸다.** 공식 Rules 참조는 불변성 강제 예로 **`allow write: if resource == null;`** 을 명시한다. 해당 주장을 **삭제**하고 §4.1에 근거로 기록했다. `docs/reference/security/storage` 관련 기록도 §3.1에서 정정했다 |
| **2** | "콘텐츠 업로드와 revision metadata는 **반드시** 비원자적인 별개 요청"이라고 단정했다 | **틀렸다.** `uploadBytes(ref, file, metadata)`처럼 **업로드 호출에 custom metadata를 실을 수 있고, 그것은 같은 업로드 동작에 포함된다.** `updateMetadata()`를 **따로 호출한 경우에만** PATCH가 별개다. 단정을 **삭제**하고 §2.6을 다시 썼다 |
| **3** | Rules 원자성을 **UNCONFIRMED**라고 적으면서 동시에 "Rules는 동시 요청을 직렬화하지 않는다 / 둘 다 통과한다"고 **단정**했다(자기모순) | 단정과 결정적 타임라인을 **삭제**했다. 남긴 것은 **"공식 문서에서 고정 경로 `rev+1` 검사가 compare-and-set처럼 동작한다는 보장을 찾지 못했다"** 는 사실뿐이다. **C3 판정을 FAIL → `NOT PROVEN / UNCONFIRMED`** 로 바꿨다 |
| **4** | C5를 **2회 트랜잭션**(예약 → 업로드 → 커밋)으로 적었는데 **모순**이다 — 예약이 head를 바꾸면 커밋의 `head==base`가 실패하고, 아무것도 기록하지 않으면 두 writer가 **같은 N을 예약**할 수 있다 | 프로토콜을 **A~H의 단일 트랜잭션 형태**로 다시 분석했다(§5.4). **승인된 구조로 확정하지 않는다** |
| **5** | C6을 "PASS"로 표기했다 | **GCS precondition 메커니즘 자체는 VERIFIED**, **DENN의 end-to-end backend 설계는 NOT DESIGNED / NOT VERIFIED**로 분리했다(§6) |

**변하지 않은 결론**: Firebase Web SDK 공개 Storage API에는 **generation 기반 조건부 쓰기가 확인되지 않았다**.
따라서 **F-E에 따라 쓰기 구현은 계속 차단한다.**

---

## 1. 범위와 준수

**문서 전용.** 이 조사(초판·보완 라운드 1 모두)에서 제품 코드·테스트·CSS·config·manifest·
`package.json`·lockfile·`pnpm-workspace.yaml`·`storage.rules`·`firestore.rules`·`firebase.json`
변경은 **0**이다. 신규 의존성 **0**.
**실제 Firebase endpoint·운영 bucket·emulator·운영 데이터에 요청 0**, upload/write/delete/publish/deploy **0**.
새 자동화·반복 작업 **0**. 다음 구현 스펙 착수 **0**. 스펙 037 제품 코드·구현 계약 **0**.

읽기만 한 것: 저장소 파일, **저장소에 이미 설치된** `node_modules`의 SDK 타입·번들 소스,
**공식 Firebase / Google Cloud 문서 페이지**(HTTP GET, 문서 사이트 한정).

확정 정책은 그대로 전제한다 — **F-B**(발행 제외) · **F-C**(레거시 `admin/state.json`은 읽기만 공유,
향후 쓰기는 rebuild 전용 격리 경로) · **F-D**(legacy `wcm`/`hcm` 정규화는 메모리 전용) ·
**F-E**(E3-strong, last-writer-wins 손실 불허, 원자성 확인 전 쓰기 구현 금지).

---

## 2. 결론 먼저

| 조사 목표 | 결론 |
| --- | --- |
| Web SDK 12.17.1의 공개 Storage 쓰기 API가 generation/metageneration 조건부 쓰기를 제공하는가 | **확인되지 않았다.** 공개 API·타입·번들 소스·공식 문서 어디에도 없다 |
| `ifGenerationMatch` / `ifMetagenerationMatch` 동등물이 있는가 | **없다.** SDK dist 전량 grep **0건** |
| "객체가 없을 때만 생성"이 가능한가 | **SDK 인자로는 불가능.** **단 Storage Rules의 `resource == null`로 서버 측에서 표현할 수 있다**(§4.1) |
| 업로드와 revision metadata 갱신이 하나의 동작인가 | **★ 될 수 있다.** `uploadBytes(ref, data, metadata)`의 custom metadata는 **같은 업로드 요청**에 실린다(§2.6). `updateMetadata()`를 따로 부를 때만 별개 PATCH다. **다만 그것이 CAS를 만들어 주지는 않는다** |
| Storage Rules만으로 strong atomicity가 되는가 | **보장된다는 근거를 찾지 못했다 — `NOT PROVEN / UNCONFIRMED`**(§4.2). "안 된다"고 증명한 것도 아니다 |
| Firestore transaction만으로 E3-strong이 되는가 | **아니다.** cross-service 원자성이 **문서상 존재하지 않는다**(§5.3) |
| **기존 client-only + 현재 Rules로 E3-strong이 보장되는가** | **★ 보장된다는 근거가 없다.** → **쓰기 구현을 열지 않는다** |

> ### **▶ 정책 결론: F-E는 해제되지 않았다.**
> **확인되지 않은 방식으로 쓰기를 열 수 없다.** 차단을 유지한다.
> **C5·C6은 추가 권한이 필요한 후보이며, 아직 Founder 선택도 Codex 구조 승인도 받지 않았다.**
> **이 조사 정정이 Codex 검수를 통과한 뒤에만 Founder G-1~G-5 결정을 요청한다.**

---

## 3. Firebase Web SDK 12.17.1 — Storage 공개 쓰기 API 실측

### 3.1 저장소에 실제로 설치된 것

- `packages/firebase/package.json` → `"firebase": "12.17.1"` (정확 고정, 스펙 036 계약)
- `packages/firebase/node_modules/firebase/package.json` → `"version": "12.17.1"` **일치**
- 실제 Storage 구현체 = **`@firebase/storage@0.14.4`**
  (`node_modules/.pnpm/@firebase+storage@0.14.4_@firebase+app@0.16.0/node_modules/@firebase/storage`)
- Auth = `@firebase/auth@1.13.4`, App = `@firebase/app@0.16.0`, Firestore = `@firebase/firestore@4.17.0`

이하 라인 번호는 모두 그 `@firebase/storage@0.14.4` 패키지 기준이다.

### 3.2 공개 타입 (`dist/storage-public.d.ts`, 725줄)

```
:500  uploadBytes(ref, data: Blob|Uint8Array|ArrayBuffer, metadata?: UploadMetadata): Promise<UploadResult>
:510  uploadBytesResumable(ref, data, metadata?: UploadMetadata): UploadTask
:545  uploadString(ref, value: string, format?: StringFormat, metadata?: UploadMetadata): Promise<UploadResult>
:490  updateMetadata(ref, metadata: SettableMetadata): Promise<FullMetadata>
:149  getMetadata(ref): Promise<FullMetadata>
:28   deleteObject(ref): Promise<void>
```

**쓰기 4종의 인자는 `ref` / `data` / `metadata` 뿐이다. precondition·condition·options 파라미터가 없다.**

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

> **★ generation/metageneration은 읽기 정보이지 쓰기 precondition 입력이 아니다.**

### 3.3 전량 grep — 0건

```
grep -rn "ifGenerationMatch|ifMetagenerationMatch|IfGenerationMatch|precondition" <@firebase/storage>/dist/
→ 0건 (.map 제외, 공개 d.ts·내부 d.ts·esm/cjs/node 번들·src 전부 포함)
```

`storage-public.d.ts`에서 `generation`/`metageneration`이 등장하는 곳은 **`:66-74` 단 한 곳**
(= `FullMetadata` 읽기 필드)이다. `etag`·`If-Match`·`ETag`도 **0건**.

### 3.4 ★ 내부 구현이 그것을 구조적으로 막는다 (`dist/index.esm.js`)

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
:1443 mappings.push(new Mapping('metadata', 'customMetadata', true));   // ← customMetadata는 writable
```

```js
:1505 function toResourceString(metadata, mappings) {
:1510   if (mapping.writable) { resource[mapping.server] = metadata[mapping.local]; }
:1514   return JSON.stringify(resource);
      }
```

→ **`generation`/`metageneration`은 요청 body에 물리적으로 실릴 수 없다.** 사용자가 객체에 넣어도 버려진다.
→ 반대로 **`customMetadata`는 writable이라 업로드 요청에 실린다**(§3.6에서 실측).

요청 빌더도 precondition을 붙이지 않는다.

```js
:1793 multipartUpload(...)        :1825 const urlParams = { name: metadata_['fullPath'] };   // ← name 뿐
:1863 createResumableUpload(...)  :1866 const urlParams = { name: metadataForUpload['fullPath'] };
:1752 updateMetadata$2(...)  method 'PATCH', headers = { 'Content-Type': 'application/json; charset=utf-8' }
                             → If-Match 헤더 없음, 쿼리 파라미터 없음
:1765 deleteObject$2(...)    method 'DELETE'  → 조건 없음
```

### 3.5 ★ endpoint 자체가 GCS JSON API가 아니다

```js
:27  const DEFAULT_HOST = 'firebasestorage.googleapis.com';
:571 function makeUrl(urlPart, host, protocol) { return `${protocol}://${origin}/v0${urlPart}`; }
:282 bucketOnlyServerUrl() { return '/b/' + encode(bucket) + '/o'; }
```

클라이언트 업로드는 **`https://firebasestorage.googleapis.com/v0/b/{bucket}/o?name=…`** 로 간다.
`ifGenerationMatch`가 문서화된 곳은 **`https://storage.googleapis.com/…` GCS JSON API**(§4 근거 2)다.
**두 API는 다른 표면이다.** 따라서 "쿼리 파라미터를 몰래 덧붙인다"는 우회는
**문서화되지 않은 동작에 제품을 거는 것**이고, 지시된 "내부 비공개 API를 제품 계약으로 쓰지 않는다"에 위배된다.
→ **후보에서 제외한다.**

### 3.6 ★★ [정정 2] 업로드와 metadata는 **한 요청일 수 있다**

초판은 "콘텐츠 업로드(POST)와 metadata 갱신(PATCH)은 **반드시** 별개 요청"이라고 단정했다. **틀렸다.**

공식 문서(근거 6·근거 5)는 `uploadBytes(storageRef, file, metadata)` 형태를 지원하며,
설치된 SDK 소스가 그것이 **같은 요청에 실린다**는 것을 보여 준다.

**multipart 업로드** — 메타데이터 JSON이 **바이트와 같은 multipart body의 첫 파트**다:

```js
:1793 function multipartUpload(service, location, mappings, blob, metadata) {
:1807   const metadata_ = metadataForUpload_(location, blob, metadata);
:1808   const metadataString = toResourceString(metadata_, mappings);
:1809   const preBlobPart = '--' + boundary + '\r\n'
:1811     + 'Content-Type: application/json; charset=utf-8\r\n\r\n'
:1812     + metadataString            // ← customMetadata가 여기 들어간다
:1813     + '\r\n--' + boundary + '\r\n' + 'Content-Type: ' + metadata_['contentType'] + '\r\n\r\n';
:1821   const body = FbsBlob.getBlob(preBlobPart, blob, postBlobPart);   // ← 메타데이터 + 바이트 = 하나의 body
      }
```

**resumable 업로드** — 메타데이터 JSON이 **세션 시작 요청의 body**다(별도 PATCH가 아니다):

```js
:1863 function createResumableUpload(service, location, mappings, blob, metadata) {
:1865   const metadataForUpload = metadataForUpload_(location, blob, metadata);
:1876   const body = toResourceString(metadataForUpload, mappings);   // ← 세션 시작 요청 본문
      }
```

**정리:**

- `uploadBytes`/`uploadBytesResumable`/`uploadString`에 넘긴 **custom metadata는 업로드 동작에 포함될 수 있다.**
  → **"revision 숫자를 객체와 함께, 하나의 업로드 동작으로 기록하는 것"은 가능하다.**
- **`updateMetadata()`를 별도로 호출한 경우에만** 업로드와 PATCH가 별개 요청이다.
- **★ 그러나 그것이 서버 generation precondition / CAS를 만들어 주지는 않는다.**
  업로드 요청 자체가 무조건적이므로, revision을 같이 실어도 **"내가 본 base가 아직 그대로일 때만 써라"**
  라고 서버에 말할 방법은 없다.
  → **Firebase Web SDK 공개 API에 조건부 덮어쓰기가 없다는 결론은 그대로 유지된다.**

### 3.7 ★ 부수 위험 — SDK 자동 재시도

```js
:37 const DEFAULT_MAX_OPERATION_RETRY_TIME = 2 * 60 * 1000;    // 2분
:43 const DEFAULT_MAX_UPLOAD_RETRY_TIME   = 10 * 60 * 1000;    // 10분
:624 isRetryStatusCode(...)  :725-726 재시도 루프
```

SDK는 네트워크 오류·재시도 대상 status에서 **자동으로 다시 보낸다**(업로드 창 10분).
precondition이 없으므로 **재시도된 쓰기는 무조건적**이다.
"응답을 못 받았지만 서버는 성공했다"는 경우, 재시도가 **그 사이 들어온 다른 운영자의 저장을 덮을 수 있다**.
스펙 036이 읽기에서 세운 **자동 retry 0** 규율(`read-port.ts:153`)이
쓰기에서는 **SDK 내부 재시도 때문에 그대로 성립하지 않는다** — 쓰기 계약이 반드시 다뤄야 할 항목이다.

---

## 4. 공식 문서 근거 (전부 2026-08-11 확인)

> 검색 결과·블로그는 **정본으로 쓰지 않았다.** 아래는 전부 `firebase.google.com` / `docs.cloud.google.com`이다.

| # | URL | 제목 | 이 조사에 쓰인 결론 |
| --- | --- | --- | --- |
| 1 | `https://docs.cloud.google.com/storage/docs/request-preconditions` | Request preconditions | 지원 precondition = `ifGenerationMatch`/`ifGenerationNotMatch`/`ifMetagenerationMatch`/`ifMetagenerationNotMatch` + ETag/date 헤더. 표면 = **JSON API 쿼리 파라미터 / XML API `x-goog-if-*` 헤더 / gcloud `--if-generation-match` / 서버 클라이언트 라이브러리**. `ifGenerationMatch=0` = "해당 이름의 객체가 없을 때만". 실패 시 **412 Precondition Failed**. "Preconditions are often used to prevent race conditions in mutating requests, such as uploads, deletes, or metadata updates." **★ Firebase Web(JS) 클라이언트 SDK는 이 페이지에 언급되지 않는다** |
| 2 | `https://docs.cloud.google.com/storage/docs/json_api/v1/objects/insert` | Objects: insert | `ifGenerationMatch` 등 4종이 **JSON API 쿼리 파라미터**로 존재. endpoint = `POST https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o` — **Firebase 클라이언트 SDK 경로가 아니다**(§3.5) |
| 3 | `https://docs.cloud.google.com/storage/docs/metadata` | Object metadata | `generation` = "Identifies the version of an object". `metageneration` = "increases every time the metadata of a given generation is updated", 새 generation마다 **1에서 시작**. 둘 다 **서버 할당이며 클라이언트가 직접 설정할 수 없다**. 덮어쓰면 **새 generation**. **★ "generation numbers might not increase for future versions, but each new version has a unique generation number"** → **generation은 단조 증가가 아니므로 revision 카운터로 쓸 수 없다** |
| 4 | `https://docs.cloud.google.com/storage/docs/consistency` | Consistency | 객체 쓰기는 **strong read-after-write**. 단, **동시 쓰기 중 누가 이기는지는 문서화하지 않는다**. race condition 회피 지침은 **"use preconditions"** 하나뿐 |
| 5 | `https://firebase.google.com/docs/storage/web/file-metadata` | Download files / File Metadata (Web) | 메타데이터 속성표에서 **`generation`·`metageneration`은 읽기 전용**, 쓰기 가능은 `md5Hash`(업로드 시)·`cacheControl`·`contentDisposition`·`contentEncoding`·`contentLanguage`·`contentType`·`customMetadata`. **`updateMetadata()`에 조건/precondition 옵션은 문서에 없다** |
| 6 | `https://firebase.google.com/docs/storage/web/upload-files` | Upload files (Web) | `uploadBytes`/`uploadBytesResumable`/`uploadString` + **선택적 metadata 인자**(§3.6의 근거). **조건부 업로드·generation 매칭 API는 문서에 존재하지 않는다** |
| 7 | `https://firebase.google.com/docs/storage/security/core-syntax` | Cloud Storage Security Rules 기본 구조 | **★★ 세분 연산: `get`=단일 파일 읽기, `list`=목록(v2), `create`="Applies to writes to file contents", `update`="Applies to updates to (pre-existing) file metadata", `delete`=삭제.** "A `write` rule can be broken into `create`, `update`, and `delete`" |
| 8 | `https://firebase.google.com/docs/storage/security/rules-conditions` | Use conditions in Cloud Storage Security Rules | `request` = `auth`/`params`/`path`/`resource`/`time`. **★ 인용: `resource`는 "file metadata for the file that currently exists at the request path"**, `request.resource`는 "a subset of the file metadata to be written if the write is allowed". **`request.resource`는 `generation`·`metageneration`·`etag`·`timeCreated`·`updated`를 제외한다.** 커스텀 메타데이터는 양쪽 모두 `.metadata` |
| 9 | `https://firebase.google.com/docs/reference/security/storage/` | Firebase Security Rules for Cloud Storage Reference | **★★ 불변성 강제 예로 `allow write: if resource == null;` 을 명시한다**(§5.1). **출처는 Codex 검수 인용** — 이 세션의 WebFetch로는 본문 미취득(§4.1) |
| 10 | `https://firebase.google.com/docs/rules/rules-behavior` | How Security Rules work | Rules는 **요청 단위로 평가**된다. **원자성·트랜잭션성·동시 요청 처리에 대한 서술은 없다** |
| 11 | `https://firebase.google.com/docs/rules/rules-language` | Security Rules language | Storage 메서드 = 읽기 `get`/`list`(+`read`), 쓰기 `create`/`update`/`delete`(+`write`). **원자성·동시성 서술 없음** |
| 12 | `https://firebase.google.com/docs/firestore/manage-data/transactions` | Transactions and batched writes | Firestore 트랜잭션 = **all-or-nothing**, "Transactions never partially apply writes." 경합 시 **자동 재실행**("might run more than once"), **읽기가 쓰기보다 먼저**, **오프라인이면 실패**, `maxAttempts` 기본 5. **★ Firestore 밖 서비스(Cloud Storage 등)를 포함하는 트랜잭션은 문서에 존재하지 않는다** |

### 4.1 ★ [정정 1] 참조 문서 취득에 대한 기록 정정

초판 §3.1은 `docs/reference/security/storage`를 "본문 미취득"으로 적고, 그것을 근거 삼아
**"Storage Rules에 객체 부재 판정 수단이 있는지 UNCONFIRMED"** 라고 결론했다.
**그 결론이 틀렸다** — 미취득은 **도구의 한계**이지 **문서에 없다는 증거가 아니다.**
초판이 그 둘을 뒤섞은 것이 결함이다.

정정된 사실 관계:

- **공식 Rules 참조는 불변성 강제 예로 `allow write: if resource == null;` 을 명시한다**(근거 9).
  → **"객체 부재 판정 수단 없음 / UNCONFIRMED" 주장은 삭제한다.** §5.1에 근거로 편입했다.
- 이 세션에서 `firebase.google.com/docs/reference/**` 계열 페이지는 **JS 렌더링이라 WebFetch가
  내비게이션만 반환**했다(`.../security/storage`, `.../security/storage/index.html`,
  `.../js/storage`, `.../js/storage.uploadmetadata`, `firebase.google.cn` 미러 포함, 전부 재시도함).
  **위 인용문의 출처는 Codex 검수다.** 이 문서는 그것을 **채택**한다.
- **독립 교차 확인**: 근거 8(rules-conditions, 본문 취득 성공)이 `resource`를
  **"the file that *currently exists* at the request path"** 라고 정의한다.
  현재 존재하는 파일이 없으면 그 메타데이터도 없으므로 **`resource == null`은 "객체 부재"의 표현**이다.
  → 근거 9의 예와 **의미가 일치**한다.
- SDK 타입 정보는 계속 **설치된 `storage-public.d.ts`**(참조 문서의 생성 원본)를 1차 근거로 쓴다(§3.2).
  이는 대체가 아니라 **더 강한 근거**다 — 실제로 이 저장소가 설치한 바로 그 버전이기 때문이다.

---

## 5. Storage Rules로 무엇이 되고 무엇이 확인되지 않았는가

> **★ [정정 3] 여기서 두 문제를 반드시 분리한다.**
> **(A) 불변 객체 경로 보호**(`resource == null`) 와 **(B) 고정 경로 revision CAS**는 **별개의 문제**다.
> 초판은 이 둘을 뭉뚱그렸고, (B)의 미확인을 (A)의 불가능으로 잘못 확장했다.

### 5.1 ★ (A) 되는 것 — 기존 객체 덮어쓰기 금지는 Rules로 표현할 수 있다

근거 9가 불변성 강제 예로 명시하는 형태:

```
allow write: if resource == null;
```

의미: **요청 경로에 이미 객체가 존재하면 쓰기를 거부한다.** 근거 8의 `resource` 정의
("file metadata for the file that **currently exists** at the request path")와 일치한다.

**이 조사에 대한 함의:**

- **"한 번 쓰고 다시는 바꿀 수 없는 객체 경로"를 서버가 강제할 수 있다.**
- 따라서 **§6 C5가 의존하는 "immutable 객체" 전제는 클라이언트 규율이 아니라
  서버 규칙으로 뒷받침될 수 있다.**
- 이는 **Storage Rules 변경**을 요구하므로 **G-1 Founder 승인 대상**이다.
  **이번 조사에서 `storage.rules`는 수정하지 않았다.**

**NOT VERIFIED**: 이 규칙의 **실제 배포·거부 동작**을 실행해 보지 않았다(실제 Firebase 접근 0).

### 5.2 ★ (B) 확인되지 않은 것 — 고정 경로 `rev+1` 검사가 CAS처럼 동작하는가

`admin state`를 **하나의 고정 경로**에 두고 Rules로

```
allow write: if request.resource.metadata.rev == resource.metadata.rev + 1;   // 개념 예시
```

같은 조건을 걸어 **compare-and-set을 얻을 수 있는지**가 이 조사의 핵심 질문이었다.

**확인된 사실은 다음뿐이다:**

- 근거 10: Rules는 **요청 단위로 평가**된다.
- 근거 10·11: **Rules 평가와 실제 객체 write 사이의 원자성·직렬화에 대한 서술이 공식 문서에 없다.**
- 근거 4: GCS는 동시 쓰기의 승자를 문서화하지 않으며, race 회피 지침으로 **preconditions**만 제시한다.
- 근거 1: 그 preconditions는 **Firebase Web 클라이언트 SDK 표면에 없다**(§3).

> **따라서: 공식 문서에서 고정 경로 `rev+1` 검사가 compare-and-set처럼 동작한다는 보장을 찾지 못했다.**
> **`NOT PROVEN / UNCONFIRMED`.** — 이것을 "동시 요청이 반드시 둘 다 통과한다"로 단정하지 않는다.
> 초판의 그 단정과 결정적 타임라인은 **삭제했다.**
>
> **정책 결론**: F-E는 **"실제 원자적 precondition 또는 잠금 가능성을 확인하기 전까지 쓰기 구현 차단"**
> 이다. **확인되지 않은 방식으로 쓰기를 열 수 없으므로 차단을 유지한다.**
> (이 판단은 "C3가 틀렸다"가 아니라 **"C3가 맞다는 근거가 없다"** 에 근거한다.)

### 5.3 `create`와 `update`의 의미가 Firestore와 다르다

근거 7의 정의:

- `create` = **"writes to file contents"** — 즉 **기존 객체를 덮어쓰는 업로드도 `create`** 다.
- `update` = **"updates to (pre-existing) file metadata"** — 즉 **`updateMetadata()` PATCH 전용**.

따라서 `allow update: …` 형태의 revision 조건은 **`updateMetadata` 호출에만 걸리고,
실제 상태 저장(콘텐츠 업로드)에는 걸리지 않는다.** 콘텐츠를 지키려면 조건을 **`create`(또는 `write`)**
에 걸어야 한다. §5.1의 `resource == null`이 바로 그 자리에 놓이는 조건이다.

### 5.4 `request.resource`가 generation을 보지 못한다

근거 8: **`request.resource`는 `generation`·`metageneration`·`etag`를 제외한다.**
→ Rules는 "클라이언트가 주장하는 base generation"을 볼 수 없다.
비교 대상은 **클라이언트가 `customMetadata`에 스스로 써넣은 숫자**뿐이고, 그것은
**서버가 보증하는 버전이 아니라 클라이언트의 주장**이다.
(이 사실은 §5.2의 미확인 상태를 **해소하지 않는다** — 정황일 뿐 증명이 아니다.)

### 5.5 Rules가 확실히 주는 것

- **§5.1 불변 경로 보호**: 이미 존재하는 객체의 덮어쓰기를 **서버가 거부**한다. (VERIFIED — 문서 근거)
- **형식 강제**: `rev`가 정수인지, 크기·타입이 정책 안인지 등. 낡은 base로 덮어쓰는 **사고**를 상당수 거른다.
- **주지 못하는 것(확인 안 됨)**: §5.2의 고정 경로 CAS 보장.

---

## 6. Firestore transaction / lease·lock 후보

### 6.1 사용 가능한 것 (신규 의존성 0)

- `@firebase/firestore@4.17.0`이 **이미 `firebase@12.17.1` 안에 설치돼 있다.**
  `packages/firebase/node_modules/firebase/firestore` 서브패스 존재.
  → **Firestore 도입에 신규 의존성은 필요 없다.**
- `dist/index.d.ts:2572` `runTransaction(firestore, updateFunction, options?): Promise<T>`
- `dist/index.d.ts:3082-3085` `TransactionOptions.maxAttempts` — **"Default is 5"**
- 번들 비용: `firebase-firestore.js` **683,502 bytes**, `firebase-firestore-lite.js` **132,941 bytes**
  (admin 전용 lazy 청크로 갈 수 있다 — 스펙 036이 SDK를 동적 import로 격리한 구조
  `sdk-facade.ts:24-28`가 그대로 재사용 가능)

### 6.2 ★★ Firestore Rules가 지금은 전부 막는다

```
firestore.rules:11-15   match /spaces/{token}  read/create 개방, update/delete: if false
firestore.rules:18-21   match /{document=**}   allow read, write: if false;   ← catch-all 거부
```

→ **lock/lease/head 용도의 새 컬렉션은 현재 규칙에서 전부 거부된다.**
**Firestore 잠금 도입 = `firestore.rules` 변경 = Founder 별도 승인 대상**(G-2).
(F-A가 Rules 변경을 명시적으로 미승인했다.)

또한 `spaces/{token}`의 `update: if false`는 **의도된 불변성**(CLAUDE.md 절대 보존 제약 3)이므로
**기존 컬렉션을 잠금으로 전용하는 것은 금지**다.

### 6.3 ★★ cross-service 원자성은 존재하지 않는다

근거 12에 따르면 Firestore 트랜잭션의 원자성은 **Firestore 문서에 대한 read/write에만** 적용된다.
**Storage 업로드를 트랜잭션에 넣는 API가 없다.** 따라서 어떤 설계를 하든

```
[Storage 업로드]  ── 네트워크 간극 (원자성 없음) ──  [Firestore 트랜잭션]
```

간극이 반드시 생긴다. **"Firestore lock을 쓰니 E3-strong"은 근거 없이 단정할 수 없다.**

**lock/lease 형태(= C4)** 가 특히 취약한 지점:

| 실패 조합 | 결과 | 데이터 손실? |
| --- | --- | --- |
| lock 획득 성공 → 업로드 실패 | lock이 만료까지 잡힌 채 남음 | 없음(가용성 저하) |
| 업로드 성공 → lock/revision 갱신 실패 | 원격 바이트는 새것, 기록된 revision은 옛것 → 다음 writer가 자기 base를 옳다고 믿음 | **★ 있음** |
| 업로드 중 브라우저 종료 | 업로드 완료 여부 불명 + lock 미해제 | **가능**(위 행으로 수렴) |
| 인증 만료 | Storage 거부와 Firestore 거부의 선후 보장 없음 | 조합에 따라 위 행 |
| 중복 탭 | 같은 lock 문서 → Firestore 트랜잭션이 직렬화 | lock 자체는 안전, Storage 쓰기는 여전히 무조건적 |
| lease 만료 + clock skew | A의 lease가 A 시계로는 유효, 서버/B 시계로는 만료 → **이중 소유자** | **★ 있음** |
| 늦은 성공(§3.7 SDK 자동 재시도) | lease 만료 후 A의 재시도가 도착해 B의 저장을 덮음 | **★ 있음** |

`serverTimestamp()`로 lease를 서버 시계에 묶으면 skew는 줄지만,
**만료 판정과 Storage 쓰기 도착이 다른 서비스**라 근본 간극은 남는다.

> **★ lock은 Firestore 상태에 대해서만 strong하고, Storage 바이트에 대해서는 advisory다.**

### 6.4 ★★ [정정 4] C5 — 단일 트랜잭션 프로토콜 재분석

**초판의 결함**: C5를 **2회 트랜잭션**(① `head` 확인 후 rev `N` 예약 → ② `rev-N.json` 업로드 →
③ `head == base`이면 `head = N` 커밋)으로 적었는데 **자기모순**이다.

- ①이 `head`를 **바꾸면** ③의 `head == base` 비교가 **반드시 실패**한다.
- ①이 **아무것도 기록하지 않으면** 두 writer가 **같은 `N`을 예약**할 수 있고,
  그러면 **같은 `rev-N.json` 경로에 둘이 쓴다** — 덮어쓰기가 되살아나 전제가 무너진다.

**정정된 후보 프로토콜** (아래 A~H). **승인된 구조가 아니며, 아직 확정하지 않는다.**

| 단계 | 내용 |
| --- | --- |
| **A** | **payload별 안정적인 고유 객체 경로를 먼저 만든다.** random operation id 또는 content-addressed identifier를 경로에 포함한다. **revision 번호를 경로에 쓰지 않는다** — 그것이 초판이 예약 트랜잭션을 필요로 하게 만든 원인이다. 고유 id는 **어떤 조율도 없이** 두 writer의 경로를 다르게 만든다 |
| **B** | **Storage Rules의 `resource == null` 조건으로 기존 객체 덮어쓰기를 금지한다**(§5.1). 클라이언트 규율이 아니라 **서버가 강제**한다 |
| **C** | **객체 업로드가 성공한 뒤에 Firestore 트랜잭션을 하나만 실행한다.** 트랜잭션은 **한 번**뿐이다 |
| **D** | 트랜잭션은 **저장 작업 시작 시 캡처한 `expectedBase`** 와 **현재 `head`** 를 비교한다 |
| **E** | `current head != expectedBase`이면 **자동으로 새 base를 채택하지 않고 명시적 충돌로 중단한다.** 조용한 재시도·자동 병합 **금지** |
| **F** | 일치할 때만 `head`를 `{ revision: expectedBase + 1, objectPath, 필요한 안전 metadata }`로 변경한다 |
| **G** | 두 writer 중 **한 명만** `head`를 변경하고, 다른 writer의 객체는 **orphan**이 된다 |
| **H** | **orphan 식별·보존·정리 정책은 Founder 결정 대상으로 유지한다**(G-4) |

**★ 반드시 명시하는 것:**

- **Firestore 트랜잭션의 원자성은 Firestore 문서 안의 read/write에만 적용된다**(근거 12).
- **Storage 업로드는 그 트랜잭션에 포함되지 않는다.**
- **★ 이 설계가 안전할 수 있는 이유는 Storage와 Firestore 사이의 cross-service 원자성 때문이 아니다.**
  **immutable 객체를 먼저 만들고(A·B), Firestore `head`만을 단일 가변 정본으로 삼기 때문이다.**
  가변 지점이 **하나뿐이고 그것이 트랜잭션 안에 있으면**, 간극에서 실패해도
  **남의 바이트를 덮는 일이 발생하지 않는다** — 실패는 **orphan + 명시적 충돌**로 나타난다.
- **B의 서버 강제가 빠지면 이 논리가 성립하지 않는다.** 고유 경로만으로는 사고·버그를 막지 못한다.
- **실제 동시성 동작, Rules 실제 배포·거부, 브라우저 종료 시나리오는 NOT VERIFIED**다(실행 0).
- **C5를 아직 PASS 또는 승인된 구조로 확정하지 않는다.** Codex 구조 검토와 Founder 권한 승인이 모두 필요하다.

**남는 열린 질문(Codex 대상)**: `expectedBase` 캡처 시점과 편집 세션의 관계 ·
`objectPath`의 안전 metadata 범위(P-5c 비노출 규율과의 정합) · content-addressed id를 쓸 경우
동일 payload 재저장의 의미 · orphan 식별 규칙 · 충돌 시 운영자에게 제시할 문구·복구 흐름.

---

## 7. 후보 비교

| # | 후보 | client-only 경계 | 신규 backend | Rules 변경 | 신규 의존성 | 비용·운영 권한 | E3-strong 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **C1** | 무조건 `uploadBytes`(레거시 모델 계승) | 유지 | 불필요 | 불필요 | 0 | 없음 | **FAIL** — L-1~L-4 그대로 |
| **C2** | 쓰기 직전 `getMetadata`/`getBytes`로 재확인 후 업로드 | 유지 | 불필요 | 불필요 | 0 | 없음 | **FAIL** — 확인과 쓰기 사이에 아무 보장이 없다(TOCTOU) |
| **C3** | 고정 경로 + Storage Rules로 `customMetadata.rev` +1 강제 | 유지 | 불필요 | **필요**(`storage.rules`) | 0 | Rules 배포 권한 | **★ NOT PROVEN / UNCONFIRMED**(§5.2) — 보장 근거를 찾지 못했다. FAIL로 증명된 것도 아니다. **확인 전에는 쓰기를 열 수 없다** |
| **C4** | Firestore lease/lock + 무조건 Storage 업로드 | 유지 | 불필요 | **필요**(`firestore.rules`) | 0(SDK 내장) | Rules 배포, Firestore 과금 | **FAIL**(§6.3) — lock은 advisory, cross-service 간극 잔존 |
| **C5** | **★ 고유 경로 immutable 객체 + `resource == null` 서버 강제 + 단일 Firestore head 트랜잭션**(§6.4 A~H) | 유지 | 불필요 | **필요**(`firestore.rules` + `storage.rules`) | 0(SDK 내장) | Rules 배포, Firestore 과금, **orphan 정리 정책** | **후보 — 미확정·미검증.** 구조적 논거는 §6.4. **PASS로 부르지 않는다** |
| **C6** | Cloud Function / 서버 / Admin SDK가 GCS JSON API `ifGenerationMatch`로 쓰기 | **벗어남** | **필요** | 서버 경로는 Rules 우회, 함수 인증 설계 필요 | 서버측 신규 | **함수 배포·런타임·과금·서비스 계정 권한**, `firebase.json`에 `functions` 블록 신규(현재 **없음**), `functions/` 디렉터리 **없음** | **★ 메커니즘 VERIFIED / DENN 구조 NOT DESIGNED**(아래 §7.1) |
| **C7** | 단일 운영자 UI 잠금(한 번에 한 편집자) | 유지 | 불필요 | 불필요 | 0 | 없음 | **FAIL** — 다른 탭·기기·브라우저를 막지 못하는 **권고(advisory)** 수단 |

### 7.1 ★ [정정 5] C6 판정 정밀화

초판은 C6을 "PASS"로 표기했다. **과했다.** 두 층을 분리한다.

| 층 | 판정 | 근거 |
| --- | --- | --- |
| **조건부 쓰기 메커니즘 자체** | **VERIFIED** | 근거 1·2: `ifGenerationMatch`가 JSON API에 존재하고, 실패 시 **412 Precondition Failed**가 보장된다 |
| **DENN의 end-to-end backend 구조** | **NOT DESIGNED / NOT VERIFIED** | 함수의 **인증**(운영자 non-anon 토큰 검증)·**권한**(서비스 계정 범위)·**payload 제한**(현행 20 MiB 정책과의 관계)·**timeout**·**재시도 정책**(§3.7과 같은 문제가 서버에서도 생긴다)·**배포·운영 설계**가 **전부 존재하지 않는다.** 저장소에 함수 기반 자체가 없다 |

> **따라서 "C6 전체 PASS"라고 부르지 않는다.** 메커니즘이 있다는 것과 DENN이 그것을 안전하게
> 쓸 구조를 가졌다는 것은 다른 문제다.

### 7.2 보조 관찰

- **C5는 신규 의존성이 0**이다(Firestore가 이미 `firebase` 안에 있다). 비용은
  **Rules 변경 + Firestore 과금 + orphan 정리 정책**이다.
- **C6은 문서상 메커니즘이 가장 확실**하지만 **client-only 경계를 명확히 벗어난다.**
- `firebase.json`의 `hosting.public`이 여전히 `"."` 라 **deploy 금지 상태**인 것도 그대로다.
- **C3와 C5는 서로 배타적이지 않다** — C5의 B단계가 곧 Storage Rules 사용이다.
  다만 **C3(고정 경로 CAS)** 와 **C5(불변 경로 + Firestore head)** 는 **다른 전략**이다(§5).

---

## 8. 시나리오 · 실패표

### 8.1 기준 시나리오 — 운영자 A/B가 같은 revision을 읽고 동시에 저장

```
                    admin state revision = 7   (expectedBase = 7)
                            │
        ┌───────────────────┴───────────────────┐
     A: load(rev 7)                          B: load(rev 7)
        │  … A가 frameSizes 수정               │  … B가 room 설정 수정
     A: save(expectedBase=7)                 B: save(expectedBase=7)
        │                                       │
        ▼                                       ▼
   ┌──────────────────────────────────────────────────────────┐
   │  두 저장이 서로를 모르는 채 진행된다.                      │
   │  질문: 무엇이 "둘 중 하나만 반영"을 보장하는가?            │
   └──────────────────────────────────────────────────────────┘
        C1/C2  보장 장치 없음        → 나중 것이 이김. 진 쪽 편집 소실
        C3     고정 경로 rev+1 Rules → 보장 여부 확인 불가 (NOT PROVEN, §5.2)
        C4     Firestore lock        → lock은 직렬화되나 Storage 쓰기는 그대로 → 간극 잔존
        C5     고유 경로 + head CAS  → 두 객체가 서로 다른 경로에 각각 생기고,
                                       Firestore 트랜잭션에서 한 명만 head 이동.
                                       진 쪽은 명시적 충돌 + orphan (구조적 논거, 미검증)
        C6     서버 ifGenerationMatch → 진 쪽이 412 (메커니즘 VERIFIED, DENN 구조 미설계)
```

**C5/C6에서 B의 작업이 자동으로 살아남는다는 뜻이 아니다** — B는 **명시적 실패**를 받고,
A의 최신본을 다시 읽어 편집을 재적용해야 한다. **E3-strong이 요구하는 것은 "조용한 손실 금지"이지
"자동 병합"이 아니다.** (자동 병합 여부는 별도 Codex 결정이며 이 조사 범위 밖이다.)

### 8.2 실패표 — 각 후보가 **조용한 데이터 손실**을 막는가

| 상황 | C1 무조건 | C2 재확인 후 쓰기 | C3 고정경로 rev+1 | C4 Firestore lock | **C5 고유경로+head** | **C6 서버 precondition** |
| --- | --- | --- | --- | --- | --- | --- |
| **정상**(경합 없음) | PASS | PASS | PASS | PASS | PASS | PASS |
| **동시 충돌**(같은 base) | **FAIL** | **FAIL** | **UNCONFIRMED** | **FAIL** | 구조상 막힘(미검증) | 메커니즘상 막힘(412) |
| **timeout**(응답 못 받음) | **FAIL** | **FAIL** | UNCONFIRMED | **FAIL** | 구조상 무해(고유 경로) | 재시도도 조건부 |
| **늦은 성공**(SDK 자동 재시도 §3.7) | **FAIL** | **FAIL** | UNCONFIRMED | **FAIL** | 자기 경로만 재기록 → 무해 | 조건부라 무해 |
| **브라우저 종료**(업로드 중) | **FAIL** | **FAIL** | UNCONFIRMED | **FAIL**(lock 잔존 + 부분 상태) | orphan만 남음, head 불변 | head 불변 |
| **lock 만료 / clock skew** | 해당 없음 | 해당 없음 | 해당 없음 | **FAIL**(이중 소유자) | 해당 없음(lock 없음) | 해당 없음 |
| **인증 만료 중 저장** | **FAIL** | **FAIL** | UNCONFIRMED | **FAIL** | 커밋 실패 = 미반영 | 미반영 |
| **중복 탭**(같은 계정) | **FAIL** | **FAIL** | UNCONFIRMED | PASS(lock 직렬화) | 구조상 막힘 | 막힘 |

> **판정 표기 규칙**
> - **`UNCONFIRMED`** = §5.2의 미확인(고정 경로 `rev+1`의 CAS 보장)에 종속된 칸이다.
>   **FAIL로 증명된 것이 아니라 보장 근거가 없는 것**이다.
> - **C5 칸은 "PASS"라고 쓰지 않았다** — §6.4의 구조적 논거이며 **실행 검증이 없다**.
> - **C6 칸도 "PASS"라고 쓰지 않았다** — 메커니즘은 VERIFIED지만 **DENN 구조가 없다**(§7.1).

### 8.3 레거시 손실 경로와의 대응

선행 조사(`reviews/2026-07-31-admin-write-boundary-investigation.md` §2.4)의 L-1~L-4는
**전부 C1(무조건 쓰기 + 벽시계 rev) 계열의 증상**이다.

| 레거시 | 원인 | C5/C6 계열에서 |
| --- | --- | --- |
| **L-1** 시계 역전(`__cloudRev = Date.now()`) | 벽시계 revision | 해소 — revision이 **Firestore head가 정하는 단조 정수**(C5) 또는 **서버 generation 비교**(C6) |
| **L-2** 디바운스 창 안 겹침, upload 전 재확인 없음 | CAS 부재 | 해소 — 두 번째가 **명시적 충돌**로 끝난다 |
| **L-3** 두 rev가 정확히 같아 분기 고착 | 동률 처리 없음 | 해소 — 동률이 곧 충돌이고 명시적 실패다 |
| **L-4** 개수 점수 union → 삭제 부활(`frameSizes`엔 tombstone 없음) | **병합 정책 문제** | **★ 해소되지 않는다.** 원자성은 "누가 이기는가"를 정할 뿐 **병합 의미론을 고치지 않는다**. tombstone/삭제 표현은 **별도 계약**이 필요하다 |

> **★ L-4는 이 조사가 해결하지 못한다.** 원자성 ≠ 병합 정확성.

---

## 9. 결론

지시된 문구를 그대로 사용한다.

- **Firebase Web SDK 공개 Storage API에는 generation 기반 조건부 쓰기가 확인되지 않았다.**
- **기존 client-only + 현재 Rules로 E3-strong이 보장된다는 근거는 없다.**
- **따라서 F-E에 따라 쓰기 구현은 계속 차단한다.**
- **C5와 C6은 추가 권한이 필요한 후보이며, 아직 Founder 선택이나 Codex 구조 승인을 받지 않았다.**
- **이 조사 정정이 받아들여진 뒤에만 Founder G-1~G-5 결정을 요청한다.**

부연:

| 분류 | 판정 |
| --- | --- |
| ① 현재 client-only + **기존 Rules 경계**에서 E3-strong 보장 | **근거 없음.** SDK에 조건부 쓰기가 없고(§3), 고정 경로 CAS 보장은 확인되지 않았으며(§5.2), 현재 `firestore.rules`는 새 컬렉션을 전부 거부한다(§6.2) |
| ② **Rules 변경**으로 가능 | **부분적으로 열린다.** `resource == null`은 **불변 경로 보호를 VERIFIED로 준다**(§5.1). 하지만 그것만으로 revision 충돌이 해결되지는 않는다 — C5의 **B단계**이지 전부가 아니다 |
| ③ **Firestore 또는 backend**가 있어야 가능 | **현재 가장 유력한 방향.** **C5**(Rules 변경 + Firestore, 구조 미확정·미검증) 또는 **C6**(backend, 메커니즘 VERIFIED·구조 미설계) |
| ④ 현재 근거로는 보장 불가능 | **현재 승인 경계 안에서는 그렇다.** ③은 **아직 승인되지 않은 권한**을 요구한다 |

---

## 10. 결정 항목 분리

### 10.1 Codex 구조 결정 후보 (아직 결정되지 않았다)

| # | 항목 | 이 조사가 제공하는 입력 |
| --- | --- | --- |
| **Y-1** | **revision 형식** — 단조 정수 / 서버 generation / 복합 | 근거 3: **generation은 단조 증가가 아니다** → "다음 rev = generation+1"은 성립하지 않는다. 벽시계는 L-1의 원인. C5는 **Firestore head가 정하는 단조 정수**를 쓴다 |
| **Y-2** | **격리 경로 후보**(F-C가 "rebuild 전용 격리 경로"까지만 정함) | **★ 정정 반영**: C5는 **revision 번호가 아니라 operation id / content-addressed id 기반의 고유 경로**를 요구한다(§6.4 A). **경로 형태와 원자성 전략은 함께 결정해야 한다** — 단일 고정 경로를 고르면 C5가 아니라 C3(§5.2 미확인) 쪽이 된다 |
| **Y-3** | **write port 경계** | 스펙 036 선례 재사용 가능: 주입 facade(`facade.ts`), 경로는 **모듈 상수**(`constants.ts:4`, `read-port.ts:92`), **단일 in-flight**(`read-port.ts:150`), **자동 retry 0**(`:153`). ⚠️ **쓰기는 SDK 내부 재시도(§3.7)가 있어 "retry 0"이 port 레벨만으로 보장되지 않는다** |
| **Y-4** | **오류 코드** | 기존 15개 체계(`types.ts:12-31`, `errors.ts:13-32`)에 충돌 계열 신설 필요. `retryable`이 **코드의 속성**이라는 규율(`errors.ts:12`) 유지. **충돌은 `retryable: false` + 재읽기 유도**가 자연스럽다(자동 재시도가 곧 위험이므로) |
| **Y-5** | **합성 fake 검증 방법** | `public-catalog/reader.ts`의 주입 transport 선례 + `vitest.config.ts`의 `*.live.test.ts` 기본 제외. **호출 순서·충돌 분기는 fake로 결정적으로 재현 가능**하다. **서버 원자성·Rules 거부는 fake로 증명되지 않는다** — 계약이 이 경계를 명시해야 한다 |
| **Y-6** | **L-4(삭제 부활) 병합 의미론** | §8.3: **원자성으로 해결되지 않는다.** tombstone 도입 여부가 여전히 열려 있다 |
| **Y-7** | **orphan 식별·보존·정리 규칙**(C5 채택 시) | §6.4 H. 클라이언트가 정리하면 `delete` 권한 → Rules 확대. 방치하면 누적 |
| **Y-8** | **C3를 확인할지, 아니면 포기할지** | §5.2가 미확인이다. **확인하려면 실제 동시 요청 실험이 필요**하고 그것은 실제 Firebase 접근이라 별도 승인 대상이다. **확인하지 않고 C5/C6으로 가는 선택**도 가능하다 |

### 10.2 Founder 결정 후보 (승인된 적 **없다**)

> **★ 이 결정들은 지금 요청하지 않는다.** 이 조사 정정이 Codex 검수를 통과한 뒤에 요청한다.

| # | 항목 | 필요한 이유 |
| --- | --- | --- |
| **G-1** | **`storage.rules` 변경 승인** | C3의 rev 조건, **C5의 `resource == null` 불변 경로 강제**(§5.1) 모두에 필요. F-A가 Rules 변경을 **명시적으로 미승인**했다 |
| **G-2** | **Firestore 사용 승인 + `firestore.rules` 변경 승인** | 현재 catch-all이 새 컬렉션을 **전부 거부**한다(`firestore.rules:18-21`). C4/C5의 절대 전제 |
| **G-3** | **backend / Cloud Function 승인** | C6의 전제. 저장소에 함수 기반이 **전혀 없다**(`firebase.json`에 `functions` 블록 없음, `functions/` 없음) |
| **G-4** | **운영 비용·복구 정책** | Firestore 읽기/쓰기 과금, 불변 객체 누적 저장 비용, **orphan 정리 주체·주기·보존 기간**, 충돌 시 운영자에게 요구할 절차(재읽기·수동 재적용) |
| **G-5** | **★ 어느 길로 갈 것인가** | **C5(Firestore 경로)** vs **C6(backend 경로)** vs **"쓰기를 계속 열지 않는다"**. 셋 다 정당한 선택지다 — 마지막을 고르면 운영자는 계속 레거시 admin에서 저장한다(스펙 035가 남긴 현 상태) |

> **위 표의 어떤 항목도 승인된 것으로 기록하지 않는다.**
> C5는 **Claude의 구조 분석 결과이지 권장 결정도 승인된 구조도 아니다.**

---

## 11. UNCONFIRMED / NOT VERIFIED

**UNCONFIRMED (공식 문서에서 보장을 찾지 못함 — 추측하지 않았다)**

- **고정 경로 `rev+1` Rules 검사가 compare-and-set처럼 동작한다는 보장**(§5.2).
  Rules 평가와 object write의 원자성·직렬화에 대한 서술이 근거 10·11에 없다.
- 덮어쓰는 업로드(`create`)에서 `resource`가 **이전 객체로 채워지는지**
  (근거 8의 정의상 그렇게 읽히지만, 덮어쓰기 상황을 명시한 문장은 확인하지 못했다).
- `firebasestorage.googleapis.com/v0` 표면이 GCS precondition 쿼리 파라미터를 **수용하는지**
  (문서화되지 않았고, **문서화되지 않은 동작은 제품 계약으로 쓰지 않는다** — §3.5).

> **삭제된 UNCONFIRMED 항목**: 초판의 **"Storage Rules에 객체 부재 판정 수단이 있는지"** 는
> **근거 9(`resource == null`)로 해소**됐다(§4.1·§5.1).

**NOT VERIFIED (실행·재현하지 않았다)**

- **C5·C6의 실제 동시성 동작.** 실제 Firebase/네트워크/emulator 실행 **0**이므로
  §8의 서술은 **문서·구조 기반 추론**이다.
- **`resource == null` 규칙의 실제 배포·거부 동작**, 실제 412 응답,
  `storage.rules`·`firestore.rules`의 **실제 배포 여부**.
- **브라우저 종료·네트워크 단절·인증 만료·중복 탭의 실제 거동.**
- 실제 `admin/state.json`·`published/state.json`의 내용·크기, L-1~L-4의 실제 재현.
- 운영자 계정 실재·로그인, 인증 만료·갱신, 실기기 동작.
- `firebase-firestore.js` 683,502 bytes를 admin lazy 청크로 분리했을 때의 **실제 번들 영향**(빌드 미실행).
- `firebase.google.com/docs/reference/**` 계열 페이지 본문 — **이 세션의 WebFetch로 미취득**
  (JS 렌더링). 근거 9의 인용은 **Codex 검수 출처**이며 근거 8로 교차 확인했다(§4.1).

## 12. 유지되는 경계

- **F-B 발행 제외 · F-C 레거시는 읽기만 공유 · F-D 정규화 메모리 전용 · F-E E3-strong** 전부 무변경.
- 스펙 036 계약(`admin/state.json` 고정 경로 **읽기 전용**, 메모리 전용, `@denn/firebase/admin-read`
  서브패스 전용, 루트 배럴 무변경, 기본 비활성)은 **이 조사로 바뀌지 않는다.**
- 리빌드 `apps/**`·`packages/**`에 **쓰기 표면은 여전히 0건**이다(grep: `uploadBytes`·`uploadString`·
  `deleteObject`·`updateMetadata`·`setDoc`·`runTransaction`·`addDoc`·`getFirestore` **0건**).
  레거시 `denn-admin.html`·`denn-mockup-tool.html`에는 존재한다(각 2건) — 손대지 않았다.
- `firebase.json`의 `hosting.public`은 여전히 `"."` 이므로 **deploy 금지 상태 그대로**다.
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않았다.**
