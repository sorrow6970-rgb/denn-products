# 조사 — F-A~F-E Founder 결정 선택지 (admin Auth·저장·revision·충돌·publish)

작성: Claude Code, 2026-08-10 · **읽기 전용 조사. 제품 코드·테스트·CSS·설정 변경 0.**
기준: HEAD = origin = `267ea72` (스펙 034·035 `CODEX_PASSED` 이후), ahead/behind 0/0
선행: `reviews/2026-07-31-admin-write-boundary-investigation.md`,
`reviews/2026-07-31-operator-cm-input-ui-investigation.md`,
`decisions/2026-08-10-operator-cm-input-decisions.md`(O-1~O-8, N-1~N-10)

> ⚠️ **이 문서는 선택지 정리다. 승인 기록이 아니다.**
> §8의 승인 프롬프트는 **Founder가 아직 말하지 않은 예시 문장**이며, F-A~F-E는 **전부 미결**이다.
> 이 문서만으로는 결정 문서 작성도 구현 착수도 하지 않는다.

---

## 0. 세 줄 요약

1. **인증 경계는 서버에 이미 확정돼 있다.** `storage.rules`가 `admin/`을 비익명 전용으로 잠갔고,
   리빌드는 규칙을 바꿀 게 아니라 **만족시키면 된다**.
2. **리빌드에는 아직 쓰기도 인증도 0줄이다.** `firebase` SDK는 의존성에도 lockfile에도 없다.
   따라서 F-A는 **신규 의존성 승인**을 함께 요구한다.
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
| 리빌드 쓰기·인증 코드 | **0건** (`uploadString\|uploadBytes\|setDoc\|updateDoc\|signInWithEmailAndPassword\|onAuthStateChanged\|getAuth`) | 저장소 전역 grep |
| `firebase` SDK | 의존성·lockfile에 **없음** | `packages/firebase/package.json`, `pnpm-lock.yaml` |
| 경계 선언 | SDK/Auth/Firestore/Storage write **미구현** | `packages/firebase/src/index.ts:2`, `:26` |

---

## 2. F-A — 운영자 Auth 도입 시점 · 인증 방식 · 허용 계정 정책

### 2.1 근거

- **서버 규칙(변경 불필요)**: `storage.rules:18-22`
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
| **E2** | 단조 정수 rev + **쓰기 직전 원격 재확인 → 불일치면 fail-closed** | 경합 창이 좁아지지만 **원자적이지 않다**. 재확인과 업로드 사이 겹침은 여전히 가능 |
| **E3** | 원자적 precondition 또는 단일 편집자 잠금 | 잠금은 Firestore 문서가 필요한데 `firestore.rules:19-21`이 `spaces/{token}` 외 **전부 거부**라 **Rules 변경 = 배포 표면**. Firebase Web SDK가 Storage 쓰기에 세대 precondition을 노출하는지는 **UNCONFIRMED** |

### 6.3 권장 / 차단

**권장 = E2.** 추가로 **"단일 운영자 동시 편집 전제"를 명시**하고, 재확인 불일치는
**자동 병합하지 않고 fail-closed**(리빌드의 다른 모든 계약과 동일 규율)한다.
`frameSizes` tombstone(L-4)은 저장을 실제로 여는 스펙에서 함께 다룬다.
**미루면 차단**: rev 모델(X-1) · 충돌 처리(X-2) · tombstone(X-3) 확정 → **저장 스펙 전체**.

---

## 7. Founder 정책 결정 vs Codex 구조 결정

| 구분 | 항목 |
| --- | --- |
| **Founder 정책** | F-A 도입 시점·계정 정책 · F-B 발행 포함 여부 · F-C 운영 파일 공유 여부 · F-D 되쓰기 허용 여부 · F-E 손실 허용 여부 · **`firebase` SDK 신규 의존성 승인** · 파괴적 마이그레이션 승인 |
| **Codex 구조** | **X-1** rev 표현(단조 정수 vs 벽시계) · **X-2** 충돌 시 병합 vs fail-closed의 구현 형태 · **X-3** `frameSizes` tombstone 설계 · **X-4** write port 형태와 경로 allowlist · **X-5** 정규화 시 검증 재적용 범위(W-1·W-2) · **X-6** 저장 경로 A/B/C 명시 답 · **X-7(신규)** 쓰기 payload에서 승격 필드 제외와 legacy pair 처리 |

**검증 선례(재사용 가능)**: `packages/firebase/src/public-catalog/reader.ts:1-3`의 **주입 transport +
100% 합성 fake**, `vitest.config.ts:17`의 `*.live.test.ts` 기본 게이트 제외 →
**write port도 같은 형태면 실제 network 없이 검증된다.**

---

## 8. 예시 승인 프롬프트 — **아직 승인되지 않았다**

> 아래는 Founder가 **말하지 않은** 문장이다. 참고용 예시일 뿐이며, 이 문서에 실려 있다는 사실이
> 승인을 의미하지 않는다. Founder가 실제로 승인하기 전에는 결정 문서 작성도 구현도 시작하지 않는다.

```text
F-A~F-E 최소 안전 범위 권장안을 승인한다.

1. F-A: 운영자 Auth를 도입하되 이번 단위는 인증 + admin/state.json 읽기까지만이다. 쓰기는 열지 않는다.
2. F-A 계정: 기존 운영자 계정 1개만 사용한다. 신규 계정·역할 권한은 만들지 않는다.
3. F-A 전제: firebase 모듈러 SDK를 신규 의존성으로 추가하는 것을 승인한다. Rules·Hosting·배포는 변경하지 않는다.
4. F-B: published 발행은 이번 범위에서 제외한다. 저장 스펙이 열릴 때 "발행되지 않음" 상태 표시를 필수 요건으로 포함한다.
5. F-C: admin/state.json은 읽기만 공유한다. 쓰기 경로는 이번에 확정하지 않으며, 열게 되면 격리 경로를 우선하고 운영 파일 공유 쓰기는 legacy 스키마 왕복 보존 검증 후 별도 승인한다.
6. F-D: 정규화 결과는 메모리 전용을 유지한다. 되쓰기는 legacy wcm/hcm 삭제와 사전 확인 목록을 포함한 별도 마이그레이션 스펙에서만 다룬다.
7. F-E: last-writer-wins를 허용하지 않는다. 단조 정수 revision과 쓰기 직전 원격 재확인 후 불일치 시 fail-closed를 기준으로 하고, 자동 병합은 하지 않는다. 단일 운영자 동시 편집을 전제로 명시한다.
8. 실제 Firebase 쓰기·발행·배포·Rules 변경·운영 데이터 접근은 계속 금지한다. 검증은 주입 transport와 합성 fake로만 한다.

이 범위로 Codex 구조 결정(X-1~X-5, X-7)과 구현 계약을 작성해라. 작성 후 내가 다시 확인하고 구현 착수를 승인한다.
```

---

## 9. UNCONFIRMED (추정하지 않음)

- 실제 `admin/state.json`·`published/state.json`의 내용·크기·`wcm`/`hcm` 건수 (실제 network 금지)
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
