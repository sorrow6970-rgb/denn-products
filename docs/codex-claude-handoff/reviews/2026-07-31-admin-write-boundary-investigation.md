# 조사 — admin 인증·쓰기·revision·publish 계약 (리빌드 최초의 쓰기 경계)

작성: Claude Code, 2026-07-31 · **읽기 전용 조사. 제품 코드·테스트·CSS·설정 변경 0.**
지시: `Automation/NEXT_CLAUDE_PROMPT.md`(`802a486`) · 선행 조사 `1aae91d`(Codex 승인)
기준: HEAD=origin=`802a486`
**실제 Firebase·network·live·emulator 실행 0.** 근거는 전부 로컬 소스다.

---

## 0. 네 줄 요약

1. **인증 경계는 이미 확정돼 있고 바꿀 게 없다.** `storage.rules`가 `admin/`을
   **non-anonymous만 read+write**로 잠가 두었다. 리빌드는 이 규칙을 **재현할 게 아니라 만족시키면** 된다.
2. **★ 리빌드에는 write port를 검증할 방법이 이미 있다.** `public-catalog/reader.ts`가
   **주입 transport(`FetchLike`) + 안전 오류 계약 + 100% 합성 테스트**로 되어 있고, live 테스트는
   `*.live.test.ts`로 **기본 게이트에서 제외**된다. write도 **같은 패턴이면 실제 network 없이 검증된다.**
3. **★★ 레거시 `admin/state.json` 동기화는 last-writer-wins에 가깝다.** `__cloudRev = Date.now()`는
   **벽시계**라 기기 시계가 어긋나면 순서가 뒤집히고, upload 전 **원격 rev 재확인이 없어** 두 운영자가
   겹치면 **한쪽 편집이 조용히 사라진다.** 리빌드가 이 모델을 그대로 옮기면 같은 손실을 물려받는다.
4. **★ publish는 admin과 완전히 분리된 두 번째 쓰기다.** `dennPublishState`가 `window.S`에
   **localStorage의 `roomBackgroundSettings`를 덮어쓴 뒤** 발행한다 — 즉 **발행본과 `admin/state.json`이
   같은 바이트가 아니다.**

---

## 1. 인증 경계 — 이미 정해져 있다

### 1.1 규칙 (`storage.rules`)

```
function op() {
  return request.auth != null
    && request.auth.token.firebase.sign_in_provider != 'anonymous';
}
match /admin/{p=**}     { allow read: if op(); allow write: if op() && okSize(); }
match /published/{p=**} { allow read: if true; allow write: if op() && okSize(); }
match /temp-share/{p=**}{ allow read: if true; allow write: if okSize(); }   // 익명 write
```

파일 상단 주석이 **catch-all `read: if true` 금지 이유**(겹치는 match는 OR이라 `admin/`이 노출된다)와
**read 조건에 `request.resource.size` 금지**(read 시 `resource=null` → 항상 거부)를 명시한다.
`okSize()`는 **20 MiB 미만**이다.

CLAUDE.md §4 제약 2·6과 일치하며, **이 조사는 규칙 변경을 제안하지 않는다.**

### 1.2 리빌드가 만족시켜야 하는 것

| 요구 | 출처 | 리빌드 현황 |
| --- | --- | --- |
| 운영자 = Email/Password, **비익명** | `denn-admin.html:14819-14824` | 없음 |
| 세션 복원은 `onAuthStateChanged` | 같은 곳 | 없음 |
| 쓰기 전 인증 확인, 미인증이면 **예외** | `ensureAdminAuth`(`:14810-14817`) | 없음 |
| 업로드 20 MiB 미만 | `storage.rules` `okSize()` | 없음 |

`ensureAdminAuth`는 실패 시 `code='admin/auth-required'`로 **던진다** — 조용한 no-op이 아니다.
리빌드의 fail-closed 규율과 같은 방향이라 **그대로 계승할 가치가 있다.**

**주의**: 레거시 `dennCloudSaveAdminV`는 미인증이면 **조용히 return**한다(`:783-785`).
운영자는 "저장됐다"고 믿지만 로컬에만 남는다. **이 침묵은 계승하면 안 된다.**

---

## 2. ★★ 레거시 `admin/state.json` 동기화의 실제 동작

### 2.1 저장 (`dennCloudSaveAdminV`, `denn-admin.html:730-744`)

```js
if(!window.dennFirebase.isReady())return;            // 미로그인 → 조용히 로컬만
var u=...currentUser(); if(!u||u.isAnonymous)return; // 익명 → 조용히 return
window.S.__cloudRev=Date.now();                      // ← 벽시계
… uploadDataUrl(dataUrl,'admin/state.json');         // ← 원격 rev 재확인 없음
```

디바운스 **3초**(`dennScheduleCloudSaveV`, `:723-729`), 실패는 `console.warn`뿐이다.

### 2.2 로드 (`dennCloudLoadAdminV`, `:746-779`)

- 로컬 `hydrateState` 완료를 **최대 6초(50ms × 120) 폴링**해 레이스를 막는다.
- `object-not-found` → **로컬을 업로드**(첫 마이그레이션).
- `remoteRev > localRev` → 로컬 백업 후 `mergeAdminStateSafe(remote, local)` 채택.
- `localRev > remoteRev` → 즉시 업로드.
- **같으면 아무것도 하지 않는다.**

### 2.3 병합 (`mergeAdminStateSafe`, `:2018`)

- 배열(`guideBackgrounds`/`uploadedFrameTemplates`/`frameTemplates`/`frameSizes`)은
  **개수 점수 기준 union + tombstone**.
- 스칼라/객체는 **`revOf(x) = max(__cloudRev, __opRev)` 큰 쪽 승**
  (2026-07-13 #3 수정: 가이드배경 많은 기기가 리비전과 무관하게 최신 스칼라 편집을 덮어쓰던 버그).
- `roomBackgroundSettings`는 **키 단위 머지**, 충돌 키는 rev 큰 쪽 승.

`__opRev`는 목업툴 쪽에서 **저장마다 +1 하는 단조 카운터**다
(`denn-mockup-tool.html:32` `stampOpRevV`, `:35-45` LS clobber guard, `:5449-5454` 룸키별 max-rev).
즉 **두 리비전의 의미가 다르다** — `__opRev`는 단조 정수, `__cloudRev`는 벽시계 밀리초.

### 2.4 ★ 여기서 편집이 사라지는 경로

| # | 시나리오 | 결과 |
| --- | --- | --- |
| **L-1** | 기기 A 시계가 5분 빠름 → A가 먼저 저장, B가 나중에 저장 | B의 `__cloudRev`가 더 작아 **B 편집이 채택되지 않는다** |
| **L-2** | A·B가 3초 디바운스 안에 각각 편집 | 나중 upload가 **원격을 통째로 덮어쓴다**(upload 전 재확인 없음) |
| **L-3** | 두 rev가 **정확히 같음** | 로드도 저장도 안 함 → **분기 상태가 그대로 고착** |
| **L-4** | 배열 병합이 **개수 점수** 기준 | 항목을 **지운** 기기가 점수에서 져 **삭제가 되살아난다**(tombstone이 있는 `guideBackgrounds`만 방어됨. `frameSizes`에는 tombstone이 **없다**) |

**L-4가 cm UI와 직접 충돌한다**: 운영자가 사이즈를 지워도 다른 기기의 옛 목록이 이기면 되살아나고,
그 사이즈에는 cm이 없으므로 **인쇄 불가 사이즈가 카탈로그에 되돌아온다**.

**NOT VERIFIED**: 위 4가지는 **소스에서 읽은 구조적 결론**이고 실제로 재현해 보지 않았다.

---

## 3. publish는 별개의 두 번째 쓰기다

`dennPublishState`(`denn-admin.html:14930-14951`):

```js
await ensureAdminAuth();
var state = window.S;
var __ls = JSON.parse(localStorage.getItem('denn_admin')||'null');
if (__ls && __ls.roomBackgroundSettings)
  state = Object.assign({}, window.S, { roomBackgroundSettings: __ls.roomBackgroundSettings });
state = Object.assign({}, state, { __publishedAt: Date.now() });
state = await window.dennExternalizeState(state);   // base64 → published/assets/<hash>.<ext>
await uploadDataUrl(dataUrl, 'published/state.json');
```

관측:

- **순서가 admin 저장과 무관하다.** `admin/state.json`을 갱신하지 않고도 발행할 수 있고, 그 반대도 된다.
  → **발행본이 `admin/state.json`보다 새롭거나 낡을 수 있다.**
- **발행 payload는 admin 상태와 다른 문서다** — `roomBackgroundSettings`를 localStorage 값으로 덮어쓰고,
  base64 이미지를 **내용 해시 경로**(`published/assets/<h32>.<ext>`)로 외부화해 URL로 치환한다
  (2026-07-04, 492KB 문제 대응). 외부화 실패는 **원본 base64 유지 + 발행은 성공**시킨다.
- `__publishedAt`(벽시계)으로 소비자가 최신 여부를 판별한다.
- 리빌드 소비자는 **`published/state.json`만** 읽는다(`public-catalog/location.ts:11-14`) — 일치한다.

> **함의**: 리빌드에서 cm을 저장한다면 **"저장"과 "발행"은 별개 동작**이다. 저장만 하고 발행하지 않으면
> 소비자에게 아무 변화가 없다. 레거시에는 **"발행 안 된 변경"을 알려주는 장치가 없다.**

---

## 4. 리빌드에 필요한 최소 port와 소유권

### 4.1 이미 있는 것 (재사용 가능한 선례)

`packages/firebase/src/public-catalog/reader.ts` 헤더:

> `// Read-only public catalog adapter (spec 013). Fixed Storage object, injectable transport,`
> `// timeout + per-caller cancellation, in-flight dedup, 5 MiB UTF-8 cap, safe error contract.`
> `// No Firebase SDK, no import-time network, no retry / cache / stale fallback.`

- transport는 **주입된 `FetchLike`** 이고, `reader.test.ts`는 전부 **합성 fake**다(`:63`, `:82`, `:94`).
- 실제 network 검증은 `*.live.test.ts`로 분리되어 `vitest.config.ts:17`에서 **기본 게이트 제외**된다.
- 오류는 **category/code/retryable/correlationId**만 담는다 — 원문·토큰 비노출.

**→ write port도 같은 형태면 실제 network 없이 전부 검증된다.**

### 4.2 최소 표면 (제안이 아니라 관측된 필요조건)

| 항목 | 필요한 이유 | 소유 |
| --- | --- | --- |
| `AuthPort` — `currentOperator()`, `onChange()`, 비익명 판정 | rules `op()` 만족 + `ensureAdminAuth` 대체 | `@denn/firebase` |
| `ObjectWritePort` — `readObject(path)` / `writeObject(path, bytes, contentType)` | `admin/state.json`·`published/state.json` 둘 다 쓴다 | `@denn/firebase` |
| **경로 allowlist** | rules와 어긋난 경로를 **컴파일 타임에 막는다**. 임의 경로 주입 금지 | `@denn/firebase` |
| 20 MiB 사전 거부 | 서버 거부 전에 fail-closed | `@denn/firebase` |
| revision 정책(§5) | 어떤 rev가 이기는지는 **제품 규칙** | `@denn/shared` (순수 함수) |
| 편집 상태·저장 시점·"발행 안 됨" 표시 | UI 관심사 | `apps/admin` |

**경계 원칙**: `@denn/firebase`는 **바이트를 옮기기만** 한다. 무엇이 최신인지 판단하는 로직은
**순수 함수로 `@denn/shared`** 에 두어야 fake 없이 단위 검증된다.
`apps/admin`은 **rev를 직접 만들지 않는다.**

### 4.3 합성 fake로 검증 가능한 범위

| 검증 가능 | 검증 불가 (**NOT TESTED**로 남길 것) |
| --- | --- |
| 미인증 시 write 시도 0회 (fail-closed) | 실제 Storage rules가 정말 거부하는지 |
| 경로 allowlist 위반 거부 | 실제 토큰 갱신·세션 만료 동작 |
| 20 MiB 초과 사전 거부 | 실제 업로드 속도·타임아웃 |
| revision 비교·병합의 결정성 | 실기기 시계 오차 |
| 충돌 시 fail-closed 여부 | 동시 운영자 실제 경합 |
| 오류 payload에 원문·토큰 비노출 | CORS·네트워크 오류 실제 코드 |

---

## 5. `wcm`/`hcm` 호환 후보 (지시된 안의 검토)

지시안: **canonical pair가 없을 때만 legacy pair를 canonical snapshot으로 정규화하고, 양쪽이 함께
존재하며 값이 다르면 fail-closed.**

### 5.1 P-2와의 정합

- legacy pair `wcm`/`hcm`은 **운영자가 명시 입력한 필드**다(`denn-admin.html:1698`,
  입력 id `s-wcm`/`s-hcm`) — **이름 파싱이 아니다.** 따라서 P-2 "카탈로그 명시 필드에서만"과 **충돌하지 않는다.**
- "canonical이 없을 때만"이라 **canonical이 항상 이긴다** → 진실 원천이 둘로 갈라지지 않는다.
- "둘 다 있고 값이 다르면 fail-closed"는 P-3의 규율과 같다. **조용한 우선순위 규칙이 없다** —
  이게 핵심이다. 우선순위를 정해 버리면 운영자는 **자기가 안 고친 값이 이기는 것**을 못 본다.

### 5.2 남는 문제 3개

| # | 문제 |
| --- | --- |
| **W-1** | legacy pair에는 **검증 이력이 없다.** `addSz`는 `parseFloat(...)||1`이라 **잘못된 입력이 `1`(cm)로 저장**된다. `> 0`·`<= 500`은 통과하지만 **명백히 틀린 값**이다. 정규화는 이 값도 그대로 받아들인다 |
| **W-2** | `wcm`/`hcm`이 **`aspect`와 어긋난 채** 저장돼 있을 수 있다(§6 = 조사 `1aae91d`의 발견 ③). 정규화는 **불일치를 그대로 canonical로 승격**시킨다 |
| **W-3** | "정규화한 snapshot"을 **어디에 쓰는가** — 메모리 전용인지, `admin/state.json`에 되쓰는지, 발행본에만 반영하는지. 되쓰면 **legacy pair를 지울지**가 또 결정이다 |

**W-1·W-2는 이 후보의 결함이 아니라 데이터의 결함**이다. 다만 **정규화가 검증 없이 승격시키면
쓰레기 값이 인쇄 치수가 된다.** 정규화 시점에도 §4의 `> 0`·`<= 500` 검증을 **반드시 다시 걸어야 하고**,
`aspect`와 심하게 어긋나면 **최소한 진단으로 남겨야 한다**(스펙 032가 "후보로만 남긴다"고 한 항목).

---

## 6. `sub` 독립 유지 후보 · 레거시 동작 재현 금지

### 6.1 `sub` — 독립 display text 유지

- 레거시 `addSz`는 `sub`가 비면 **`w+'×'+h+' cm'`로 자동 생성**하고(`:1697`),
  `confirmEditSz`는 `sub`를 **입력값으로만** 갱신한다 → 이미 **자동 생성과 수동 편집이 섞여 있다.**
- `sub`는 인쇄에 **아무 영향이 없다**(P-2로 이름·`sub` 파싱 금지). 따라서 **자동 덮어쓰기는 이득 없이
  운영자 입력을 지우는 위험만** 있다.
- **독립 유지가 안전한 쪽이다.** 다만 cm과 `sub`가 어긋나면 **운영자 화면에서만** 혼란이 생기므로,
  **표시상 경고**는 검토 가치가 있다(인쇄 차단은 아님).

### 6.2 재현 금지 (조사 `1aae91d` 발견 ③의 후속)

| 레거시 동작 | 출처 | 새 UI |
| --- | --- | --- |
| `editSz`가 `sub` 정규식 파싱으로 폼 prefill | `denn-admin.html:1647-1648` | **금지** (P-2 이름 파싱) |
| 파싱 실패 시 **`wcm=21, hcm=21*aspect`** prefill | `:1649` | **금지** (날조 치수) |
| `addSz`의 `parseFloat(...)||1` | `:1688` | **금지** (무효 입력을 1 cm로 저장) |
| `confirmEditSz`가 `aspect`만 갱신하고 cm 미저장 | `:1668-1681` | **금지** (조용한 불일치) |
| 미인증 시 조용한 return | `:783-785` | **금지** (저장 실패를 알려야 함) |

---

## 7. STOP — 결정이 필요한 것

### 7.1 Founder 승인 (Firebase 표면 = **자동 진행 금지**)

| # | 항목 |
| --- | --- |
| **F-A** | **Auth 도입 여부·시점.** 리빌드에 운영자 Email/Password를 넣을지. 계정은 기존 `sorrow6970@gmail.com` 하나인지, 별도 운영자 계정을 만들지 |
| **F-B** | **쓰기 대상 범위.** `admin/state.json`만 쓸지, `published/state.json` 발행까지 이번에 넣을지. **둘은 별개 동작**이다(§3) |
| **F-C** | **운영본과의 공존.** 리빌드 admin이 **같은 `admin/state.json`을 쓰면** 레거시 admin과 **같은 파일을 두 앱이 쓴다.** 별도 경로(예: `admin/rebuild-state.json`)로 격리할지 — 격리하면 데이터가 갈라지고, 공유하면 **레거시 스키마를 100% 왕복 보존**해야 한다 |
| **F-D** | **W-3**: 정규화 snapshot을 저장에 되쓸지, 메모리 전용으로 둘지 |
| **F-E** | **§2.4 손실 시나리오를 허용할지.** 레거시 모델을 그대로 옮기면 L-1~L-4를 물려받는다. 막으려면 **조건부 쓰기(precondition)** 나 **단일 편집자 잠금**이 필요하고, 이는 범위 확대다 |

### 7.2 Codex 구조 결정

| # | 항목 |
| --- | --- |
| **X-1** | revision 모델: `__cloudRev`(벽시계) 계승 / `__opRev`식 **단조 정수** / 둘 다 유지. **벽시계는 §2.4 L-1의 원인**이다 |
| **X-2** | 충돌 시 **자동 병합** vs **fail-closed + 운영자 선택**. 리빌드의 다른 모든 계약은 fail-closed다 |
| **X-3** | `frameSizes`에 **tombstone**을 둘지 (L-4 삭제 부활 방지) |
| **X-4** | `@denn/firebase` write port의 정확한 형태와 **경로 allowlist** |
| **X-5** | 정규화 snapshot의 검증 재적용 범위(W-1·W-2) |
| **X-6** | 조사 `1aae91d`의 **STOP 4(A/B/C)** — 이번 지시가 흡수했지만 **명시 답이 아직 없다** |

---

## 8. 범위와 한계

- **읽기 전용.** 파일 수정 0. 실행한 것은 read/grep/git 조회뿐이다.
- **실제 Firebase·network·live·emulator 실행 0.** Rules·config·제품 코드·의존성·배포 변경 **0**.
- **NOT VERIFIED**: §2.4의 4가지 손실 시나리오(소스 기반 구조적 결론, 재현 안 함) ·
  실제 `admin/state.json`·`published/state.json`의 내용과 크기 ·
  실제 Storage rules가 거부하는지 · 레거시 admin UI 실행 확인.
- **뒤집지 않은 것**: 스펙 032 P-1~P-6, 선행 029/030/031 확정분.
  **C-1(인쇄 좌표 방법 A/B/C)은 고르지 않았다** — Codex 결정이다.
  **스펙 032 조사 보고서에 대한 Codex 재검토는 여전히 미완**이며, 전제가 뒤집히면 §5의 필드 논의도 다시 연다.
- `firebase.json`의 `hosting.public`은 여전히 `"."`(운영본 루트)이라 **deploy는 금지 상태 그대로**다.
