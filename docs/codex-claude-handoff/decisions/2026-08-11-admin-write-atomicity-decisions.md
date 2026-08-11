# 결정 (정본) — 운영자 저장 원자성·Rules·Firestore·경로 (G-1 ~ G-5)

승인: **Founder, 2026-08-11** · 기준 커밋 `3b4ebda` · 브랜치 `rebuild/modern-studio`
근거 조사: `reviews/2026-08-11-admin-write-atomicity-investigation.md`(보완 라운드 1 반영, `1e3fd74`)
선행 정본: `decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E)

> **이 문서가 G-1~G-5의 정본이다.** 조사 보고서 §10.2의 표현은 **후보 목록이었고 superseded**된다.
> 이 문서는 **결정 기록만** 담는다 — 제품 구현·구조 계약을 확정하지 않는다.
> 이번 문서화 라운드에서 제품 코드·테스트·CSS·설정·manifest·lockfile·의존성 변경은 **0**이며,
> **`storage.rules`·`firestore.rules`·`firebase.json`도 수정하지 않았다**(승인은 났으나 실행 시점은
> Codex 구현 계약 이후다).

---

## 0. 승인 원문 (Founder, 2026-08-11)

> Founder로서 스펙 037 조사 보완과 G-1~G-5를 다음과 같이 승인한다.
>
> **G-1:**
> - storage.rules의 최소 변경을 승인한다.
> - 기존 admin/{p=\*\*} 광범위 write 허용은 유지하지 않는다.
> - legacy admin/state.json은 읽기 전용으로 고정한다.
> - rebuild 전용 객체 경로만 생성할 수 있으며, resource == null 조건으로 기존 객체 덮어쓰기와 삭제를
>   서버에서 차단한다.
> - 겹치는 match의 OR 평가로 불변 조건이 우회되지 않도록 상위 admin write 규칙도 함께 좁힌다.
> - 쓰기 권한은 단순 non-anonymous 전체가 아니라 승인된 기존 운영자 UID에만 한정한다.
> - 실제 UID가 정본으로 제공되기 전에는 live Rules 배포를 차단한다.
>
> **G-2:**
> - C5 검증을 위한 Firestore 사용과 firestore.rules 최소 변경을 승인한다.
> - rebuild 전용 head 문서 하나만 가변 정본으로 사용한다.
> - head 변경은 Firestore transaction 안에서 expectedBase와 현재 head가 일치할 때만 허용한다.
> - spaces/{token}과 기존 Firestore 계약은 변경하지 않는다.
> - Firestore SDK는 admin 전용 lazy 경계 밖으로 노출하지 않는다.
>
> **G-3:**
> - Cloud Function, backend, Admin SDK 기반 C6 구현은 이번 단계에서 승인하지 않고 예비 대안으로 보류한다.
>
> **G-4:**
> - orphan은 head에서 참조하지 않는 불변 객체로 구분한다.
> - 초기 구현에서 클라이언트 delete 권한과 자동 정리는 허용하지 않는다.
> - 보존 기간, 비용 한도, 권한 있는 정리 주체가 별도 승인되기 전에는 실제 운영 쓰기를 활성화하지 않는다.
>
> **G-5:**
> - 스펙 037의 다음 구현 계약 후보로 C5, 즉 고유 불변 Storage 객체 + 단일 Firestore head transaction
>   구조를 선택한다.
> - C3 고정 경로 CAS와 C4 lease/lock 방식은 사용하지 않는다.
> - C6은 C5가 안전하게 성립하지 않을 경우 다시 검토한다.
> - 이번 승인은 구현 계약 작성, 합성 fake, 로컬 Firebase Emulator 검증까지만 허용한다.
> - 실제 Firebase 프로젝트, 운영 bucket, 운영 데이터, live network, Rules 배포, Hosting 배포,
>   published/state.json 발행은 승인하지 않는다.
> - emulator에서도 동시 저장, timeout, 늦은 성공, 브라우저 종료 상당 실패, 인증 만료, 중복 탭,
>   orphan 발생과 head 불변을 검증한다.
> - C5가 실제 emulator 검증을 통과하기 전에는 운영 쓰기를 열지 않는다.
>
> **추가 보호 경계:**
> - docs/rebuild/design/taste-v2/는 Founder 소유의 별도 작업이다. 수정·삭제·stage·commit하지 않는다.
> - 알려진 spec-018 PNG 두 개와 packages/render/src/plan/index.ts도 수정·복원·stage·commit하지 않는다.
> - force push, merge, rebase, reset --hard, broad delete를 하지 않는다.
>
> 지금은 이 승인을 결정 정본 문서와 STATE/NEXT/CURRENT/live log에만 기록하고 문서 전용 일반
> fast-forward commit/push한다.
> 제품 코드, storage.rules, firestore.rules, config, lockfile는 아직 수정하지 않는다.
> push 후 HEAD=origin, ahead/behind 0/0과 정확한 변경 파일을 보고하고 READY_FOR_CODEX에서 멈춘다.
> Codex가 구조 결정과 스펙 037 구현 계약을 검토·작성하기 전에는 구현을 시작하지 않는다.

---

## 1. 결정 요약

| # | 결정 | 상태 |
| --- | --- | --- |
| **G-1** | **`storage.rules` 최소 변경 승인.** 기존 `admin/{p=**}` 광범위 write **유지하지 않음**. legacy `admin/state.json` **읽기 전용 고정**. rebuild 전용 경로만 **생성** 가능하고 **`resource == null`로 덮어쓰기·삭제 서버 차단**. **겹치는 match의 OR 우회 방지**를 위해 상위 admin write도 함께 좁힘. 쓰기 권한은 **승인된 기존 운영자 UID 한정**. **실제 UID 정본 제공 전 live Rules 배포 차단** | **확정** |
| **G-2** | **Firestore 사용 + `firestore.rules` 최소 변경 승인**(C5 검증용). **rebuild 전용 head 문서 1개만 가변 정본**. head 변경은 **transaction 안에서 `expectedBase == 현재 head`일 때만**. **`spaces/{token}`과 기존 계약 무변경**. **Firestore SDK는 admin 전용 lazy 경계 밖으로 노출 금지** | **확정** |
| **G-3** | **C6(Cloud Function/backend/Admin SDK) 이번 단계 미승인** — **예비 대안으로 보류** | **확정(보류)** |
| **G-4** | **orphan = head가 참조하지 않는 불변 객체.** 초기 구현에서 **클라이언트 delete 권한·자동 정리 불허**. **보존 기간·비용 한도·정리 주체가 별도 승인되기 전 실제 운영 쓰기 미활성화** | **확정** |
| **G-5** | **스펙 037 다음 구현 계약 후보 = C5**(고유 불변 Storage 객체 + 단일 Firestore head transaction). **C3·C4 사용하지 않음.** C6은 C5가 안전하게 성립하지 않을 때 재검토. **허용 범위 = 구현 계약 작성 + 합성 fake + 로컬 Firebase Emulator 검증까지.** emulator에서 **동시 저장·timeout·늦은 성공·브라우저 종료 상당 실패·인증 만료·중복 탭·orphan 발생·head 불변** 검증. **emulator 검증 통과 전 운영 쓰기 미개방** | **확정** |

## 2. 승인되지 **않은** 것 (명시적 금지)

- **실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network 접근.**
- **Rules 배포**(`storage.rules`·`firestore.rules`) — G-1이 **실제 UID 정본 제공 전 배포 차단**을 명시.
- **Hosting 배포**, `published/state.json` **발행**(F-B와 일치).
- **C6 구현**(G-3 보류).
- **클라이언트 delete 권한 · orphan 자동 정리**(G-4).
- **실제 운영 쓰기 활성화** — G-4(보존/비용/정리 주체 승인) **와** G-5(emulator 검증 통과) **양쪽**이 전제.
- **신규 계정 생성 · 다중 계정 · 역할 권한**(F-A에서 미승인, 이번에도 변경 없음).
- 레거시 `admin/state.json`에 대한 **공유 쓰기**(F-C 유지, G-1이 읽기 전용으로 **더 강하게 고정**).
- legacy `wcm`/`hcm` **되쓰기 · 삭제 · 마이그레이션**(F-D 유지).
- **제품 구현 착수** — 이번에 승인된 다음 단계는 **Codex의 구조 결정 + 구현 계약 작성**이다.

## 3. 선행 결정(F-A~F-E)과의 관계

| 선행 | 이번 결정과의 관계 |
| --- | --- |
| **F-A** Auth 도입, 계정 1개, Rules 변경 **미승인** | **G-1·G-2가 Rules 변경을 승인해 이 부분을 대체한다.** 단 **범위는 "최소 변경"** 이고 **배포는 여전히 차단**이다. 계정 1개 원칙은 유지되며, G-1이 그것을 **UID allowlist로 더 강하게** 만든다 |
| **F-B** 발행 제외 | **유지.** G-5가 `published/state.json` 발행을 다시 명시적으로 미승인했다 |
| **F-C** 레거시는 읽기만 공유, 쓰기는 rebuild 전용 격리 경로 | **유지·강화.** G-1이 legacy `admin/state.json`을 **서버 규칙으로** 읽기 전용 고정한다 |
| **F-D** 정규화 결과 메모리 전용, 되쓰기 금지 | **유지.** 이번 결정으로 바뀌지 않는다 |
| **F-E** E3-strong, 원자성 확인 전 쓰기 차단 | **유지.** G-5가 차단 해제 조건을 **"emulator 검증 통과"** 로 구체화했다. **조사만으로는 열리지 않는다** |

## 4. ★ 구현 계약이 반드시 다뤄야 할 결과 (결정 아님 — 사실 보고)

> 아래는 **승인된 결정을 실행하면 생기는 확인된 결과**다. Founder 결정을 바꾸자는 것이 아니라,
> Codex 계약이 **명시적으로 처리해야** 하는 지점을 기록한다.

### 4.1 ★★ G-1을 배포하면 레거시 운영자 저장 경로가 닫힌다

- `denn-admin.html:740` — `uploadDataUrl(dataUrl, 'admin/state.json')`.
  이것이 **현재 운영자가 상태를 저장하는 유일한 경로**다(스펙 035 종료 기록: 리빌드 admin은
  값을 **저장할 수 없고** 운영자는 "확인 후 레거시 admin에 직접 입력"한다).
- G-1의 **"legacy `admin/state.json`은 읽기 전용으로 고정"** 을 배포하면 **이 저장이 서버에서 거부된다.**
- **지금 당장 깨지지는 않는다** — G-1이 **실제 UID 정본 제공 전 live Rules 배포를 차단**했고,
  이번 라운드에서 `storage.rules`를 **수정하지 않았다**. 위험은 **배포 시점에** 발생한다.
- → **계약이 다뤄야 할 것**: 리빌드 쓰기 경로가 emulator 검증을 통과하기 **전에** Rules를 배포하면
  **운영자가 아무 데도 저장할 수 없는 구간**이 생긴다. **배포 순서**가 계약 항목이다.

### 4.2 ★ UID 한정의 적용 범위가 열려 있다

`storage.rules:18-21`의 `op()`는 **`admin/` 뿐 아니라** `published/`·`templates/`·`placeholders/`·
`guides/`·`mockups/`·`editor-overlays/`의 **write 조건에도 함께 쓰인다**(`:35-40`).

- G-1의 "쓰기 권한은 **승인된 기존 운영자 UID에만** 한정"을 **`op()` 자체에 적용**하면
  **레거시의 자산 업로드·발행(`denn-admin.html:14946` `published/state.json`)까지 UID에 묶인다.**
- **rebuild 전용 경로에만** 적용하면 레거시 표면은 그대로 남는다.
- **어느 쪽인지는 결정되지 않았다.** → **Codex 구조 결정 항목**(§6 Z-1).

### 4.3 ★ OR 우회 차단은 `admin/` match 자체를 좁혀야 한다

`storage.rules` 파일 머리말이 이미 경고한다(`:5-7`): Firebase는 **겹치는 match를 OR** 하므로
넓은 규칙 하나가 좁은 규칙을 무력화한다.
현재 `match /admin/{p=**} { allow write: if op() && okSize(); }`(`:25-28`)가 **`admin/` 이하 전부**를
덮으므로, rebuild 경로를 `admin/` 아래에 두고 `resource == null`을 걸어도
**상위 규칙이 OR로 통과시켜 불변성이 무너진다.**
G-1이 "상위 admin write 규칙도 함께 좁힌다"고 정한 것은 **이 문제를 정확히 겨냥한 것**이며,
계약은 **rebuild 경로가 `admin/` 아래인지 별도 최상위 경로인지**를 함께 정해야 한다(§6 Z-2).

### 4.4 ★ Emulator 검증은 설정 변경을 수반한다

- `firebase.json`에 **`emulators` 블록이 없다**(현재 `hosting`·`storage`·`firestore`만).
- 저장소에 `firebase-tools` 의존성이 **없다**(CLAUDE.md §5 기준 전역 설치).
- → **emulator 검증을 실행하려면 `firebase.json` 수정과 도구 확보가 필요**하다.
  G-5가 **"로컬 Firebase Emulator 검증까지 허용"** 했으므로 그 범위 안이라고 읽히지만,
  **이번 문서 라운드에서는 아무것도 수정하지 않았다.** 계약이 **정확한 파일·범위**를 명시해야 한다(§6 Z-6).

### 4.5 원자성이 고치지 못하는 것 (재확인)

조사 §8.3: **L-4(삭제 부활)는 병합 의미론 문제**이며 C5로 해소되지 않는다.
`frameSizes`에는 tombstone이 없다. **별도 계약이 필요하다**(§6 Z-7).

## 5. 이 결정으로 열리는/닫히는 후속

| 항목 | 상태 |
| --- | --- |
| **Codex 구조 결정 + 스펙 037 구현 계약 작성** | **열림** — 다음 단계 |
| 합성 fake 검증 | **열림**(계약 확정 후) |
| **로컬 Firebase Emulator 검증** | **열림**(계약 확정 후, G-5 범위) |
| `storage.rules`·`firestore.rules` **파일 편집** | **열림**(계약 확정 후). **배포는 계속 차단** |
| **Rules 배포** | **차단** — 실제 운영자 **UID 정본** 필요(G-1) |
| **실제 운영 쓰기 활성화** | **차단** — G-4(보존·비용·정리 주체 승인) **+** G-5(emulator 검증 통과) |
| C6(backend) | **보류** — C5가 안전하게 성립하지 않을 때 재검토(G-3) |
| C3 고정 경로 CAS · C4 lease/lock | **닫힘** — 사용하지 않는다(G-5) |
| 발행(`published/state.json`) | **차단**(F-B·G-5) |
| 실제 Firebase·운영 bucket·운영 데이터·live network·Hosting 배포 | **차단**(G-5) |

## 6. Codex 구조 결정 항목 (아직 결정되지 않았다)

조사 §10.1의 Y-1~Y-8을 이번 승인 기준으로 다시 정리한다.

| # | 항목 |
| --- | --- |
| **Z-1** | **UID 한정의 적용 범위** — `op()` 전역 vs rebuild 경로 한정(§4.2). 레거시 발행·자산 업로드에 직접 영향 |
| **Z-2** | **rebuild 전용 경로의 위치와 형태** — `admin/` 하위인지 별도 최상위 경로인지(§4.3, OR 우회와 직결). 객체 식별자는 **operation id vs content-addressed**(조사 §6.4 A). **revision 번호를 경로에 쓰지 않는다**는 것만 조사에서 확정됐다 |
| **Z-3** | **head 문서의 위치·스키마** — `{ revision, objectPath, 안전 metadata }`의 정확한 필드와 **P-5c 비노출 규율과의 정합**. `firestore.rules`에서 **`expectedBase` 일치 검사를 규칙으로도 강제할지**(transaction 안 검사와 이중화) |
| **Z-4** | **write port 경계와 오류 코드** — 스펙 036의 주입 facade·모듈 상수 경로·단일 in-flight 규율 재사용 범위. **충돌 코드**(`retryable: false` + 재읽기 유도). ⚠️ **SDK 내부 자동 재시도**(업로드 창 10분) 때문에 "retry 0"이 port만으로 보장되지 않는다 |
| **Z-5** | **`expectedBase` 캡처 시점**과 편집 세션의 관계 — 언제 읽은 head를 base로 삼는가 |
| **Z-6** | **Emulator 검증 범위와 허용 파일** — `firebase.json` `emulators` 블록, 도구 확보 방식, 테스트 배치(`*.live.test.ts` 제외 규율과의 관계), G-5가 요구한 **7개 시나리오**(동시 저장·timeout·늦은 성공·브라우저 종료 상당·인증 만료·중복 탭·orphan/head 불변)를 **어떻게 결정적으로 재현**할지(§4.4) |
| **Z-7** | **L-4 tombstone** — 원자성으로 해결되지 않는 병합 의미론(§4.5) |
| **Z-8** | **배포 순서** — Rules 배포와 리빌드 쓰기 경로 가용 시점의 관계(§4.1). 운영자가 저장할 수 없는 구간을 만들지 않는 순서 |

## 7. UNCONFIRMED / NOT VERIFIED (변동 없음 + 신규)

**신규**

- **실제 운영자 UID** — 저장소에 없다. G-1이 **정본 제공 전 배포 차단**으로 처리했다.
- **Emulator에서의 C5 거동** — 아직 실행하지 않았다. G-5의 7개 시나리오 전부 **미검증**.
- **`resource == null` 규칙의 실제 거부 동작** — emulator에서도 아직 확인하지 않았다.

**유지**

- 고정 경로 `rev+1`의 CAS 보장(**C3는 G-5로 사용하지 않기로 했으므로 더 이상 추적 대상이 아니다**) ·
  덮어쓰기 `create`에서 `resource`가 채워지는지 · `/v0` 표면의 precondition 수용 여부.
- 실제 `admin/state.json`·`published/state.json` 내용, L-1~L-4 재현, 운영자 계정 실재·로그인,
  실기기, Firestore 청크 번들 실측, `pnpm-workspace.yaml`의 `allowBuilds`.
- `firebase.google.com/docs/reference/**` 본문(세션 WebFetch 미취득 — `resource == null` 인용의
  출처는 Codex 검수이며 `rules-conditions`로 교차 확인).

## 8. 보호 경계 (이번 승인으로 추가·재확인)

**수정·복원·stage·commit 하지 않는다:**

- `docs/rebuild/design/taste-v2/` — **Founder 소유의 별도 작업**(신규 지정)
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

**하지 않는다:** force push · merge · rebase · `reset --hard` · broad delete.

> ⚠️ 이번 라운드 작업 중 워킹 트리에서 함께 관찰된 **`docs/rebuild/design/README.md`(수정됨)** 와
> **`docs/rebuild/specs/038-page-design-prototype.md`(untracked)** 도 `taste-v2` 작업의 일부로 보인다.
> **손대지 않았고 커밋하지 않았다.**
