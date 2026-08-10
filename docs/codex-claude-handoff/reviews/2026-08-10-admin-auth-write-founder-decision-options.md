# 조사 — F-A~F-E Founder 결정 선택지 (admin Auth·저장·revision·충돌·publish)

작성: Claude Code, 2026-08-10 · **읽기 전용 조사. 제품 코드·테스트·CSS·설정 변경 0.**
기준: HEAD = origin = `267ea72` (스펙 034·035 `CODEX_PASSED` 이후), ahead/behind 0/0
선행: `reviews/2026-07-31-admin-write-boundary-investigation.md`,
`reviews/2026-07-31-operator-cm-input-ui-investigation.md`,
`decisions/2026-08-10-operator-cm-input-decisions.md`(O-1~O-8, N-1~N-10)

> **개정 이력**: 2026-08-10 `CORRECTION_REQUIRED` 판정에 따라 문서 정확성을 보완했다(초판 `24d0c04`).
> ① "저장소 전역 grep 0건" 주장을 제거하고 **범위를 리빌드 `apps/**`·`packages/**`로 한정**했다
> (레거시 HTML 2개에는 해당 코드가 **존재한다** — §1.1) · ② "인증 경계는 서버에 이미 확정"을
> **"규칙 파일의 의도는 확인, 실제 배포·거부 동작은 UNCONFIRMED"** 로 고쳤다 · ③ F-E의
> **"last-writer-wins 불허 + E2 권장" 모순을 제거**하고 **E2-best-effort / E3-strong 택일**로
> 분리했다(§6.3~§6.4) · ④ F-A·F-B·F-C의 **단계 관계**를 명시했다(§4.4).
> 제품 결정은 **아무것도 바뀌지 않았다**.

> ⚠️ **이 문서는 선택지 정리다. 승인 기록이 아니다.**
> §8의 승인 프롬프트는 **Founder가 아직 말하지 않은 예시 문장**이며, F-A~F-E는 **전부 미결**이다.
> 이 문서만으로는 결정 문서 작성도 구현 착수도 하지 않는다.

---

## 0. 세 줄 요약

1. **저장소의 `storage.rules`가 의도하는 정책은 확인됐다** — `admin/`을 비익명 전용으로 잠그는
   내용이다. 다만 **이 규칙이 실제 운영 Firebase에 배포돼 있는지와 실제 거부 동작은
   UNCONFIRMED**다(실제 network·live·emulator 실행 0). 리빌드는 규칙을 바꿀 게 아니라
   **만족시키는 방향**이지만, "이미 확정된 서버 경계"로 단정할 수는 없다.
2. **리빌드(`apps/**`·`packages/**`)에는 아직 쓰기도 인증도 0줄이다.** ⚠️ 이는 **리빌드 범위에
   한정된 사실**이며, **레거시 운영본 `denn-admin.html`·`denn-mockup-tool.html`에는 해당 코드가
   존재한다**(§1.1). `firebase` SDK는 리빌드 의존성에도 lockfile에도 없으므로 F-A는
   **신규 의존성 승인**을 함께 요구한다.
3. **레거시 동기화는 last-writer-wins에 가깝고**(벽시계 rev + 업로드 전 원격 재확인 없음),
   그 모델을 그대로 옮기면 손실 시나리오 L-1~L-4를 물려받는다.

---

## 1. 확인된 현재 상태 (읽기 전용)

| 항목 | 값 | 근거 |
| --- | --- | --- |
| HEAD / origin | `267ea72` 동일, ahead 0 / behind 0 | `git status -sb`, `git rev-list --left-right --count` |
| staged / untracked | 0 / 0 | `git status --short` |
| modified | 보호 대상 3개만 (`spec-018` PNG 2개 + `packages/render/src/plan/index.ts`) | 같은 명령 |
| 자동화 상태 | `active_unit: admin-auth-write-publish-decision`, `state: FOUNDER_DECISION_REQUIRED`, `deploy: forbidden` | `Automation/DENN_AUTOMATION_STATE.md` |
| 스펙 034·035 | `DONE (CODEX_PASSED)` | 각 스펙 문서 · `267ea72` |
| **리빌드** 쓰기·인증 코드 | **0건** — 검색 범위는 **`apps/**`·`packages/**`뿐이다** | `grep -rln … apps/ packages/` → 일치 파일 0 |
| **레거시** 쓰기·인증 코드 | **존재한다** (§1.1) | `denn-admin.html`, `denn-mockup-tool.html` |
| `firebase` SDK | **리빌드** 의존성·lockfile에 없음 (레거시는 CDN import) | `packages/firebase/package.json`, `pnpm-lock.yaml` |
| 경계 선언 | SDK/Auth/Firestore/Storage write **미구현** | `packages/firebase/src/index.ts:2`, `:26` |

### 1.1 ⚠️ "0건"의 정확한 범위

`uploadString|uploadBytes|setDoc|updateDoc|signInWithEmailAndPassword|onAuthStateChanged|getAuth`
검색에서 **0건이 나온 것은 리빌드 코드(`apps/**`·`packages/**`)에 한정된다.** 저장소 전체로
넓히면 **레거시 운영본에는 같은 코드가 실재한다**:

| 파일 | 실측 |
| --- | --- |
| `denn-admin.html` | 위 인증 심볼 **7건**, `uploadString` **2건**(`:14782` import, `:14838` 사용) |
| `denn-mockup-tool.html` | 위 인증 심볼 **4건**(익명 로그인), `uploadString` **2건**(`:15475`, `:15560`) |

즉 **"리빌드에 쓰기·인증이 없다"가 맞는 문장이고, "저장소에 없다"는 틀린 문장이다.**
레거시는 지금 이 순간에도 그 코드로 운영되고 있으므로 F-C(경로 공유 여부)의 위험 판단은
**레거시 쓰기가 살아 있다는 전제 위에서** 읽어야 한다.

---

## 2. F-A — 운영자 Auth 도입 시점 · 인증 방식 · 허용 계정 정책

### 2.1 근거

- **저장소의 규칙 파일이 의도하는 정책**(배포 여부는 **UNCONFIRMED**): `storage.rules:18-22`
  `op() = request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous'`,
  `okSize() = request.resource.size < 20 * 1024 * 1024`; `:25-28` `match /admin/{p=**}`는
  `allow read: if op(); allow write: if op() && okSize();`
- **레거시 구현**: `denn-admin.html:14781`(Email/Password import) · `:14806-14808`
  `currentAdminUser()`(비익명만 반환) · `:14810-14817` `ensureAdminAuth()`는 실패 시
  `code='admin/auth-required'`로 **throw** · `:14821-14828` `onAuthStateChanged`로 세션 복원 ·
  `:14849` `signInEmail`
- **소비자는 익명**: `denn-mockup-tool.html:15473`, `:15521` `signInAnonymously`
- **정책 문서**: `decisions/2026-07-21-security-and-privacy.md` §1 — Email/Password, Rules에서 검증,
  "세션 만료나 권한 실패를 저장 성공으로 표시하지 않는다", 다중 관리자·역할은 **별도 스펙**
- **계승 금지**: `denn-admin.html:733`·`:735` — 미인증·익명이면 `dennCloudSaveAdminV`가 **조용히 return**

### 2.2 대안

| # | 내용 |
| --- | --- |
| **A1** | 이번에도 Auth 미도입 (스펙 035의 로컬 검증 유지) |
| **A2** | Auth 도입 + `admin/state.json` **읽기까지만** (쓰기 0) |
| **A3** | Auth + 읽기 + 쓰기 동시 도입 |
| 계정 (가) | 기존 운영자 계정 1개만 사용 |
| 계정 (나) | 리빌드 전용 운영자 계정 신규 발급 |
| 계정 (다) | 다중 계정 + 역할 권한 |

### 2.3 위험

- **A1**: 위험 0. 대신 운영자가 값을 남길 수 없는 현 교착이 유지된다.
- **A2**: `firebase` 모듈러 SDK가 **신규 의존성**이 된다(정책상 Founder 승인 필요). `admin/`의
  비공개 데이터가 리빌드 앱 메모리로 들어온다. **쓰기가 없어 데이터 손실 위험 0**, 롤백은 커밋 되돌리기.
- **A3**: F-B~F-E의 위험이 한꺼번에 열린다. 인증 실패 처리·rev 규율이 검증되지 않은 상태에서
  **실제 운영 파일에 쓰게 된다**.
- **(나)/(다)**: Firebase Console 작업이며 이 조사로 **확인 불가(UNCONFIRMED)**. 규칙 `op()`는
  **비익명 전체**를 허용하므로 계정을 늘리면 권한 세분화 없이 `admin/` 접근 주체만 늘어난다.

### 2.4 권장 (가장 작은 안전 범위)

**A2 + 계정 (가)**. Auth port(`currentOperator()`/`onChange()`/비익명 판정)와
`admin/state.json` **읽기**까지만. `ensureAdminAuth`의 **throw 규율은 계승**하고
**조용한 실패는 금지**한다. 신규 계정·역할은 만들지 않는다.

### 2.5 미룰 경우 차단되는 작업

F-B·F-C·F-E 전부(인증 없이는 `admin/` read조차 불가) · 운영자 cm 저장 · 발행 · 실기기 검증.

---

## 3. F-B — `admin/state.json` 저장만 vs `published/state.json` 발행까지

### 3.1 근거

- **저장**: `denn-admin.html:730-744` `dennCloudSaveAdminV` → `:740`
  `uploadDataUrl(dataUrl,'admin/state.json')`. 디바운스 3초 `:723-729`. 실패는 `console.warn`뿐 `:743`.
- **발행**: `:14932-14951` `dennPublishState` — `ensureAdminAuth()` `:14933` →
  localStorage `denn_admin`의 `roomBackgroundSettings`로 덮어씀 `:14936-14939` →
  `__publishedAt = Date.now()` `:14941` → `dennExternalizeState`(`:14909`)로 base64를
  `published/assets/<hash>`로 외부화(**실패해도 발행은 성공** `:14943`) →
  `uploadDataUrl(..., 'published/state.json')` `:14946`
- **두 동작은 순서·내용이 무관**하다 → 발행본이 `admin/state.json`보다 새롭거나 낡을 수 있고,
  **같은 바이트가 아니다**. "발행 안 된 변경"을 알리는 장치가 **없다**.
- 리빌드 소비자는 `published/state.json`만 읽는다: `packages/firebase/src/public-catalog/location.ts:11-14`.

### 3.2 대안 / 위험

| # | 내용 | 위험 |
| --- | --- | --- |
| **B1** | 저장만 | 소비자 반영 0 → 운영자가 "왜 안 바뀌지"로 혼란. 위험은 파일 하나로 국한 |
| **B2** | 발행만 | 저장되지 않은 상태를 고객에게 노출 |
| **B3** | 저장 + 발행 | 실패 지점 2배. **발행은 즉시 고객에게 보이는 되돌리기 어려운 동작**이고, 인쇄 수치는 P-4a로 아직 임시값이다 |

### 3.3 권장 / 차단

**권장 = B1(저장만), 발행 제외.** 단 저장 스펙의 필수 요건으로 **"발행되지 않음" 상태 표시**를 넣는다
(레거시에 없던 안전장치이며 비용이 작다).
**미루면 차단**: 저장 스펙 착수 자체.

---

## 4. F-C — 레거시 운영 경로 공유 vs 리빌드 전용 격리

### 4.1 근거

- 레거시는 `admin/state.json` **단일 파일**에 legacy `S` 전체(모든 컬렉션 + base64 이미지)를 쓴다(`:740`).
- 병합이 그 파일에 강하게 결합돼 있다: `denn-admin.html:2018` `mergeAdminStateSafe` —
  배열(`guideBackgrounds`/`uploadedFrameTemplates`/`frameTemplates`/`frameSizes`)은 **개수 점수 union +
  tombstone**, 스칼라/객체는 `revOf(x)=max(__cloudRev,__opRev)` 큰 쪽 승,
  `roomBackgroundSettings`는 키 단위 머지. **`frameSizes`에는 tombstone이 없다.**
- 리빌드 read는 미지 필드를 원위치 보존하므로 왕복 자체는 가능하지만,
  **스펙 034의 메모리 승격이 반환 문서에 들어 있으므로** `document.data`를 그대로 되쓰면
  승격 결과가 파일에 박힌다(→ F-D).
- `firebase.json:3` `hosting.public: "."` — 배포는 계속 금지 상태다.

### 4.2 대안 / 위험

| # | 내용 | 위험 |
| --- | --- | --- |
| **C1** | 완전 공유(같은 파일 read+write) | 두 앱이 한 파일을 쓴다 → **L-1~L-4 손실 상속**. legacy 스키마를 100% 왕복 보존하지 못하면 **현 운영본이 깨진다** |
| **C2** | 읽기 공유 + 쓰기 격리 경로 | 레거시 운영 무영향(가장 안전). 대신 **데이터가 갈라지고** 발행 대상 재결정이 필요 |
| **C3** | 완전 격리 | 초기 데이터 공백 → 운영자가 전면 재입력 |

### 4.3 권장 / 차단

**권장 = 읽기만 공유, 쓰기는 이번에 열지 않는다**(F-A 권장 A2와 정합). 쓰기를 열 때는 **C2를 우선**하고,
공유 쓰기(C1)는 **legacy 스키마 왕복 보존이 합성 fixture로 통과한 뒤** 별도 승인한다.
**미루면 차단**: 경로 allowlist(X-4) · 발행 대상 결정 · 마이그레이션 설계.

### 4.4 ★ F-A · F-B · F-C의 단계 관계 (혼동 금지)

| 단계 | 내용 | 현재 지위 |
| --- | --- | --- |
| **1단계 (지금 권장하는 유일한 단계)** | Auth 도입 + `admin/state.json` **읽기**. **쓰기 0.** | Founder 미승인 |
| **2단계 (아직 열지 않음)** | `admin/state.json` **쓰기** | **착수 금지** |
| **3단계 (아직 열지 않음)** | `published/state.json` **발행** | **착수 금지** |

- **B1("저장만")은 2단계를 열게 될 경우의 정책 권장안이지, 지금 저장을 구현해도 된다는 허가가
  아니다.** 1단계에는 저장이 **없다**.
- **F-C의 "읽기만 공유"도 1단계 범위다.** 쓰기 경로(격리 vs 공유)는 2단계를 열 때 다시 결정한다.
- **쓰기 계약(구현 계약)은 Founder가 2단계 착수를 별도로 승인하기 전에는 작성하지 않는다.**
  1단계 승인만으로 쓰기 계약을 쓰기 시작하면 승인 범위를 넘는다.

---

## 5. F-D — 정규화 결과 되쓰기 vs 메모리 전용

### 5.1 근거

- 현재 확정: **O-5 = 메모리 전용**(`decisions/2026-08-10-operator-cm-input-decisions.md`).
  구현은 `readLegacyCatalog`의 JSON-safe 복제본에만 기록하며 입력 비변형이 unit으로 고정돼 있다(스펙 034).
- **★ 되쓰기의 자충수**: 스펙 034 N-4는 canonical과 legacy가 **함께 있고 값이 다르면**
  `CONFLICTING_PRINT_SIZE` **fatal**이고, fatal은 **카탈로그 전체 read 실패**다.
  되쓰기를 허용한 뒤 운영자가 리빌드에서 cm을 **수정**하면 `printWidthCm`만 갱신되고 `wcm`은 남아
  → **다음 read부터 카탈로그가 통째로 안 읽힌다.**
- 레거시는 생성 시에만 `wcm`을 쓰고(`denn-admin.html:1698`), `confirmEditSz`(`:1668-1685`)는
  **cm을 저장하지 않는다** → 한 번 어긋나면 **레거시 쪽에서 저절로 맞춰지지 않는다**.
- **W-1**: `addSz`의 `parseFloat(v('s-wcm'))||1`(`:1689`)로 무효 입력이 **1 cm**로 저장돼 있을 수 있고,
  `1`은 `> 0`·`<= 500`을 통과하므로 **정규화가 그대로 승격**한다.

### 5.2 대안 / 위험

| # | 내용 | 위험 |
| --- | --- | --- |
| **D1** | 메모리 전용 유지 | 위험 0. 매 read마다 정규화가 반복되고 저장소에는 canonical이 생기지 않는다 |
| **D2** | 되쓰되 legacy pair 유지 | **위 자충수로 카탈로그 전체 read 실패 가능** — 가장 위험 |
| **D3** | 되쓰면서 legacy pair 삭제(1회 마이그레이션) | 안전한 종착지이나 **레거시가 읽는 필드를 지우는 파괴적 마이그레이션** — 백업·롤백·1회성 보장 필요. W-1의 `1 cm`도 함께 굳는다 |

### 5.3 권장 / 차단

**권장 = D1 유지.** 되쓰기는 별도 마이그레이션 스펙에서만 다루고, 그때 **① `wcm`/`hcm` 삭제 동반**,
**② `1 cm`·`aspect` 불일치 후보를 사전 목록으로 제시해 운영자가 확인**하는 절차를 포함한다.
**미루면 차단**: 없음(현 상태가 곧 권장안). 저장 스펙에는 **"쓰기 payload에 승격 필드를 넣지 않는다"**
는 계약만 명시하면 된다(→ X-7).

---

## 6. F-E — last-writer-wins 허용 vs revision precondition / 잠금

### 6.1 근거

- `denn-admin.html:736` `window.S.__cloudRev = Date.now()` — **벽시계**.
  `:740` 업로드 **직전 원격 rev 재확인 없음**.
- 디바운스 3초 `:723-729`. 실패는 `console.warn`뿐 `:743`.
- 로드 분기 `:746-779`: `remoteRev > localRev` → 로컬 백업 후 병합 채택(`:769`),
  `localRev > remoteRev` → 업로드(`:776`), **같으면 아무것도 안 한다**(분기 고착).
- `__opRev`는 목업툴에서 **단조 +1 카운터**(`denn-mockup-tool.html:32` `stampOpRevV`) —
  **두 리비전의 의미가 다르다**(단조 정수 vs 벽시계 밀리초).
- 손실 경로 **L-1**(시계 역전) · **L-2**(디바운스 내 겹침) · **L-3**(rev 동일 고착) ·
  **L-4**(`frameSizes` tombstone 부재 → 삭제 부활)는 **소스 기반 구조적 결론이며 재현하지 않았다
  (UNCONFIRMED)**. L-4는 cm과 결합하면 **인쇄 불가 사이즈가 되살아난다**.

### 6.2 대안 / 위험

| # | 내용 | 위험 |
| --- | --- | --- |
| **E1** | 레거시 모델 계승(벽시계 + last-writer-wins) | L-1~L-4 상속 |
| **E2-best-effort** | 단조 정수 rev + **쓰기 직전 원격 재확인 → 불일치면 fail-closed** | **원자적이지 않다**(아래 6.3) |
| **E3-strong** | 실제 원자적 precondition 또는 잠금 | 지원 가능성 자체가 **UNCONFIRMED**이고, 잠금은 Rules 변경을 부를 수 있다 |

### 6.3 ★ E2는 last-writer-wins를 없애지 못한다 (앞선 기술 정정)

이전 판에서 **"last-writer-wins를 허용하지 않는다"고 하면서 E2를 권장한 것은 모순이었다.**
E2의 "읽고 → 비교하고 → 쓴다"는 **원자적 compare-and-set이 아니다**:

> 클라이언트 A와 B가 **같은 원격 revision을 읽고 둘 다 재확인을 통과**한 뒤, A가 쓰고 이어서 B가
> 쓰면 **B가 A를 덮는다.** 재확인은 경합 창을 좁힐 뿐 **닫지 못한다.**
> 즉 E2에는 **잔류 last-writer-wins 손실 가능성이 남는다.**

따라서 선택지는 "손실을 허용하지 않는다"가 아니라 **어느 쪽을 감수할지**의 문제다.

### 6.4 Founder 선택지 (택일)

**E2-best-effort**
- **단일 활성 편집자를 운영 전제**로 두고, 단조 정수 revision + 쓰기 직전 원격 재확인을 사용한다.
- **경합 창과 잔류 last-writer-wins 손실 가능성을 명시적으로 수용한다.**
- 재확인 불일치는 자동 병합하지 않고 **fail-closed**로 처리한다.
- 장점: 구현이 작고 순수 함수로 검증 가능, Rules 변경 0. 단점: **손실 확률을 낮출 뿐 제거하지 못한다.**

**E3-strong**
- **last-writer-wins를 허용하지 않는다.**
- **실제 원자적 precondition 또는 잠금의 지원 가능성을 별도로 조사·검증하기 전까지 쓰기 구현을
  차단한다.**
- Rules 변경이나 Firestore 잠금 문서가 필요하면 **별도 Founder 승인 대상**으로 둔다
  (`firestore.rules:19-21`은 현재 `spaces/{token}` 외 전부 거부).
- 장점: 손실을 실제로 막는다. 단점: **저장 기능이 조사 완료까지 열리지 않는다.**

**어느 쪽도 Founder가 아직 승인하지 않았다.** 이 문서는 둘 중 하나를 대신 고르지 않는다.
`frameSizes` tombstone(L-4)은 어느 쪽을 택하든 저장을 여는 스펙에서 함께 다뤄야 한다.

**미루면 차단**: rev 모델(X-1) · 충돌 처리(X-2) · tombstone(X-3) 확정 → **저장 스펙 전체**.

---

## 7. Founder 정책 결정 vs Codex 구조 결정

| 구분 | 항목 |
| --- | --- |
| **Founder 정책** | F-A 도입 시점·계정 정책 · F-B 발행 포함 여부 · F-C 운영 파일 공유 여부 · F-D 되쓰기 허용 여부 · **F-E: E2-best-effort(잔류 손실 수용) vs E3-strong(조사·검증 전 쓰기 차단)** · **`firebase` SDK 신규 의존성 승인** · 파괴적 마이그레이션 승인 · **쓰기 단계(2단계) 착수 승인** |
| **Codex 구조** | **X-1** rev 표현(단조 정수 vs 벽시계) · **X-2** 충돌 시 병합 vs fail-closed의 구현 형태 · **X-3** `frameSizes` tombstone 설계 · **X-4** write port 형태와 경로 allowlist · **X-5** 정규화 시 검증 재적용 범위(W-1·W-2) · **X-6** 저장 경로 A/B/C 명시 답 · **X-7(신규)** 쓰기 payload에서 승격 필드 제외와 legacy pair 처리 |

**검증 선례(재사용 가능)**: `packages/firebase/src/public-catalog/reader.ts:1-3`의 **주입 transport +
100% 합성 fake**, `vitest.config.ts:17`의 `*.live.test.ts` 기본 게이트 제외 →
**write port도 같은 형태면 실제 network 없이 검증된다.**

---

## 8. 예시 승인 프롬프트 — **아직 승인되지 않았다**

> 아래는 Founder가 **말하지 않은** 문장이다. 참고용 예시일 뿐이며, 이 문서에 실려 있다는 사실이
> 승인을 의미하지 않는다. Founder가 실제로 승인하기 전에는 결정 문서 작성도 구현도 시작하지 않는다.

**7번 항목은 E2-best-effort와 E3-strong 중 하나를 Founder가 직접 고르는 자리다.**
둘 다 적어 두었으니 **택하지 않은 쪽을 지우고** 사용해야 한다.

```text
F-A~F-E에 대해 아래를 결정한다.

1. F-A: 운영자 Auth를 도입하되 1단계는 인증 + admin/state.json 읽기까지만이다. 쓰기는 열지 않는다.
2. F-A 계정: 기존 운영자 계정 1개만 사용한다. 신규 계정·역할 권한은 만들지 않는다.
3. F-A 전제: firebase 모듈러 SDK를 신규 의존성으로 추가하는 것을 승인한다. Rules·Hosting·배포는 변경하지 않는다.
4. F-B: published 발행은 이번 범위에서 제외한다. "저장만"은 향후 쓰기 단계를 열 때의 정책이며 지금 저장을 구현하라는 뜻이 아니다. 쓰기 단계를 열 때 "발행되지 않음" 상태 표시를 필수 요건으로 포함한다.
5. F-C: 1단계에서 admin/state.json은 읽기만 공유한다. 쓰기 경로(격리 vs 공유)는 쓰기 단계를 열 때 다시 결정하며, 운영 파일 공유 쓰기는 legacy 스키마 왕복 보존 검증 후 별도 승인한다.
6. F-D: 정규화 결과는 메모리 전용을 유지한다. 되쓰기는 legacy wcm/hcm 삭제와 사전 확인 목록을 포함한 별도 마이그레이션 스펙에서만 다룬다.
7. F-E: [아래 둘 중 하나만 남긴다]
   7-A. E2-best-effort — 단일 활성 편집자를 운영 전제로 두고 단조 정수 revision + 쓰기 직전 원격 재확인을 사용한다. 재확인과 업로드 사이의 경합 창과 잔류 last-writer-wins 손실 가능성을 명시적으로 수용한다. 재확인 불일치는 자동 병합 없이 fail-closed한다.
   7-B. E3-strong — last-writer-wins를 허용하지 않는다. 실제 원자적 precondition 또는 잠금의 지원 가능성을 별도 조사·검증하기 전까지 쓰기 구현을 차단한다. Rules 변경이나 Firestore 잠금이 필요하면 별도 승인 대상으로 둔다.
8. 실제 Firebase 쓰기·발행·배포·Rules 변경·운영 데이터 접근은 계속 금지한다. 검증은 주입 transport와 합성 fake로만 한다.
9. 쓰기 계약(구현 계약)은 내가 쓰기 단계 착수를 별도로 승인하기 전에는 작성하지 않는다.

이 범위로 1단계에 필요한 Codex 구조 결정만 정리해라. 쓰기 단계 계약은 내 별도 승인 후에 쓴다.
```

---

## 9. UNCONFIRMED (추정하지 않음)

- 실제 `admin/state.json`·`published/state.json`의 내용·크기·`wcm`/`hcm` 건수 (실제 network 금지)
- **저장소의 `storage.rules`·`firestore.rules`가 실제 운영 Firebase에 배포돼 있는지** — 파일 내용만
  읽었고 배포 상태는 확인하지 않았다
- L-1~L-4의 실제 재현 여부 · 실제 Storage Rules의 거부 동작 · 실기기 시계 오차
- Firebase Console의 운영자 계정 수·상태 · 신규 계정 발급 가능 여부
- Firebase Web SDK가 Storage 쓰기에 원자적 precondition을 제공하는지
- 인쇄소 요구(색공간/ICC · 재단 여백 · 파일 형식 · 최대 크기) — 저장소 근거 0, P-4a 유지

## 10. 범위와 한계

- **읽기 전용 조사다.** 제품 코드·테스트·설정·lockfile 변경 **0**, 신규 의존성 **0**.
- **실제 Firebase·network·live·emulator·Rules·deploy 실행 0.** 근거는 전부 로컬 소스다.
- 보호 대상(`docs/rebuild/results/spec-018/browse-*.png` 2개,
  `packages/render/src/plan/index.ts`)은 **손대지 않았다**.
- 스펙 032 P-1~P-6, 034/035의 O-1~O-8·N-1~N-10은 **뒤집지 않았다**.
