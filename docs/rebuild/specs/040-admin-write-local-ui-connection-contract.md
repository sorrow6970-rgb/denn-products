# 스펙 040 후보 — 운영자 상태 쓰기 로컬 UI 연결 계약

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_UI**

선행: 스펙 035, 036, 037, 039 · Founder G-1~G-5 · G-4 D-1=A/D-2=O-3/D-3=N

## 목표 (WHY)

검증된 C5 write port를 운영자 화면에 연결하기 전에, 전체 문서 CAS의 편집 기준·저장 상태·충돌 및
결과 미확정 UX를 고정한다. 이 문서는 구현 승인이 아니며 실제 Firebase·운영 쓰기를 열지 않는다.

## 조사 결과

1. `AdminRemoteController.load()`는 검증 성공 여부만 `hasDocument`로 남기고 카탈로그와 revision을
   의도적으로 버린다. 따라서 현재 컴포넌트는 `expectedBase`를 만들 수 없다.
2. `PrintSizeCmDraft`는 로컬 문자열 두 개만 소유하며 특정 `frameSizes[]` 항목을 선택하거나 기존
   `CatalogDocumentV1`을 편집하지 않는다. 이 값을 저장할 문서·항목이 없다.
3. `AdminStateWritePort.loadBaseline()`만 legacy revision 0과 rebuild head revision을 통합해 반환한다.
   저장 기준은 이 반환값의 revision이어야 하며 기존 legacy-only read 성공 여부로 대체할 수 없다.
4. `save()`는 전체 `CatalogDocumentV1` CAS다. 필드 patch, 자동 merge, tombstone, publish API는 없다.
5. write facade 생성은 SDK를 동적으로 불러오므로 기본 화면에서 생성하면 “idle network/adapter 0”
   경계가 깨질 수 있다. 기존 기본 Firebase app/auth를 재사용하는 lazy wiring이 필요하다.

## 범위 (SCOPE)

### 후속 구현에 포함할 후보

- 인증 observer는 기존 spec 036 `OperatorAuthPort` 한 권위만 사용
- 명시적 “편집 기준 불러오기”로 `loadBaseline()` 호출
- `{catalog, revision, source}`를 메모리 편집 세션에 보존
- 하나의 명시적 저장 버튼으로 전체 문서 `save({expectedBase,catalog})`
- 저장 중 입력·재저장·로그아웃·재로드 차단
- conflict/outcome-unknown 시 자동 retry·자동 merge 없이 명시적 재읽기
- 고정 한국어 안전 문구와 민감정보 비노출
- synthetic fake + React unit + Chromium local E2E

### 제외

- 실제 Firebase/project/bucket/UID/network, Rules·Hosting 배포, 운영 쓰기
- published 발행, legacy `admin/state.json` 쓰기, delete·orphan 정리
- C6, L-4/tombstone, 자동 merge, autosave/debounce, background retry
- 신규 의존성, Router/Zustand, 실제 frame-size 목록 편집(Founder 결정 전)

## UI 상태 계약 후보

| 상태 | 입력 | 주요 행동 | 금지 |
| --- | --- | --- | --- |
| unconfigured/initializing/signed-out | 잠금 | 기존 로그인만 | write facade 생성·save |
| authenticated-unloaded | 잠금 | `편집 기준 불러오기` | legacy 성공 상태를 base로 추측 |
| loading | 잠금 | 없음 | 중복 load/save |
| ready-clean | 편집 가능 | 로그아웃·명시적 재로드 | save(변경 0) |
| ready-dirty-valid | 편집 가능 | `변경 저장` | 자동 저장 |
| ready-dirty-invalid | 편집 가능 | 입력 수정 | save |
| saving | 전부 잠금 | 없음 | 중복 save/load/logout |
| saved | 편집 가능 | 반환 revision을 새 base로 채택 | 로컬 revision 추측 |
| conflict | 초안 보존 | `최신 상태 다시 불러오기` | 자동 merge·자동 base 채택·자동 retry |
| outcome-unknown | 초안 보존·저장 잠금 | 명시적 재읽기 | 성공/실패 추측·즉시 재저장 |
| definite-error | 초안 보존 | 오류 성격에 맞는 명시 행동 | raw SDK 정보 표시 |

`최신 상태 다시 불러오기`는 dirty 초안을 조용히 덮지 않는다. 사용자가 폐기를 명시한 뒤에만 새
baseline을 채택한다. 변경 재적용은 운영자의 명시 행동이며 앱은 자동 병합하지 않는다.

## 안전 오류 문구 후보

| 코드 | 표시 의미 | 다음 행동 |
| --- | --- | --- |
| `WRITE_CONFLICT` | 다른 저장이 먼저 반영됨 | 최신본 재읽기 |
| `WRITE_AUTH_REQUIRED` | 로그인 필요 | observer 상태 확인 후 로그인 |
| `WRITE_FORBIDDEN` | 권한 없음 | 저장 차단, 관리자 확인 |
| `WRITE_INVALID_INPUT` | 현재 초안이 계약 불통과 | 입력 수정 |
| `WRITE_CLAIM_FAILED` | 저장 식별 준비 실패 | 저장 차단, 재읽기 |
| `WRITE_CLAIM_OUTCOME_UNKNOWN` | 식별 준비 결과 미확정 | 재읽기 전 재시도 금지 |
| `WRITE_UPLOAD_FAILED` | 객체 업로드 확정 실패 | 초안 보존, 사용자 명시 재시도 후보 |
| `WRITE_UPLOAD_OUTCOME_UNKNOWN` | 업로드 결과 미확정 | 재읽기 전 재시도 금지 |
| `WRITE_HEAD_FAILED` | head 반영 확정 실패 | 초안 보존, 재읽기 |
| `WRITE_COMMIT_OUTCOME_UNKNOWN` | commit 결과 미확정 | 재읽기 전 재시도 금지 |

화면·로그·오류 직렬화에는 raw SDK message, email, UID, token, `recId`, `objectPath`, object bytes,
catalog 원문을 넣지 않는다.

## lazy wiring 계약 후보

- `apps/admin`이 기존 read auth/read ports와 write port를 한 composition root에서 만든다.
- write adapter는 첫 `loadBaseline` 또는 `save` 전까지 생성하지 않는다.
- spec 039의 `createFirebaseAdminWriteFacade`가 기존 default app/auth를 재사용한다.
- 별도 named Firebase app과 두 번째 auth observer를 만들지 않는다.
- 루트 `@denn/firebase` 배럴은 변경하지 않고 `@denn/firebase/admin-write`만 동적 경계에서 사용한다.
- config 불일치와 non-demo emulator guard는 기존 fail-closed 계약을 유지한다.

## Founder 결정 — 구현 전에 필요

**Founder 승인(2026-08-14): U-1=A, U-2=A, U-3=A.**

### U-1 (권장 A) — 첫 편집 대상

- **A (권장):** 스펙 040 구현은 “전체 baseline을 메모리에 로드하고 안전 상태 전이만 검증”하는
  write-session controller까지. 실제 카탈로그 필드 편집·저장 버튼 UI는 다음 스펙으로 분리한다.
- B: `PrintSizeCmDraft`를 특정 `frameSizes[]` 선택 UI와 결합해 첫 실제 편집·저장까지 포함한다.

**권장 근거:** 현재는 size 선택·항목 identity·기존 값 prefill·목록 동시 변경 계약이 전혀 없다.
B는 UI 연결을 넘어 새 카탈로그 편집 기능을 동시에 결정한다.

### U-2 (권장 A) — dirty 초안 재로드

- **A (권장):** 앱 내부 명시 확인 단계(`초안 유지` / `초안 폐기하고 다시 불러오기`).
- B: dirty 상태에서는 재로드를 완전히 숨기고 새로고침/로그아웃만 별도 경고.

### U-3 (권장 A) — 확정 업로드 실패의 재시도

- **A (권장):** `WRITE_UPLOAD_FAILED`도 자동 retry 0, 같은 메모리 초안에서 사용자 명시 재시도만 허용.
- B: 모든 오류에서 반드시 baseline 재읽기 후에만 새 저장 허용.

outcome-unknown과 conflict는 어느 선택에서도 재읽기 전 재저장을 허용하지 않는다.

## 후속 구현 예상 파일 (U-1=A 기준)

- `apps/admin/src/admin-write/session-controller.ts` + unit
- `apps/admin/src/admin-write/create.ts` + unit
- 필요 시 read composition root의 최소 추출(기존 `admin-read/**` 동작 변경 금지)
- `apps/admin/src/App.tsx`는 UI 연결 스펙 전까지 변경하지 않음
- 상태/스펙/handoff 문서

`storage.rules`, `firestore.rules`, emulator Rules/config, package manifests, lockfile는 변경하지 않는다.

## 검증 계약

- fake: load→edit-session→save 호출 순서, exact expectedBase, single in-flight, stale result/dispose
- invalid/clean 상태 save 0, conflict/outcome-unknown 자동 retry 0
- 성공 반환 revision만 새 base로 채택
- auth observer 이탈 시 save 차단, raw/identifier 비노출
- import/idle 상태에서 Firebase SDK/write adapter/network 0
- 고객 번들 hash 동일, 전체 unit/typecheck/build/Chromium E2E 회귀
- 실제 Firebase·emulator는 이 UI 계약 단위에서 실행하지 않음

## STOP

U-1~U-3 결정 전 제품 구현을 시작하지 않는다. 실제 UID/IAM/배포/운영 데이터, delete, publish,
legacy write, 자동화가 필요하면 즉시 중단한다.

## DONE (Codex) — 2026-08-14

- 구현: `apps/admin/src/admin-write/session-controller.ts`와 합성 unit만 추가했다.
- UI/App composition/write adapter 생성은 0이다.
- baseline catalog + exact revision 보존, dirty 폐기 확인, single in-flight, runtime catalog 재검증,
  conflict/outcome-unknown 재저장 잠금, 확정 upload 실패의 명시 재시도, auth loss/dispose late result 무시를 고정했다.
- targeted unit 9/9, `pnpm check` PASS(unit 1331/1331), Chromium E2E 134/134 PASS.
- 고객 JS SHA-256:
  `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`.
- 실제 Firebase·emulator·UID·IAM·배포·운영 쓰기·UI 저장·delete·발행은 실행하지 않았다.

## CORRECTION_REQUIRED 라운드 1 + CODEX_PASSED — 2026-08-14

독립 검수 결함 2건을 보완했다.

1. 동일한 `authenticated` observer 재통지가 baseline/dirty draft를 초기화하던 문제를 no-op으로 수정.
2. revoked Proxy 등 `readLegacyCatalog()` throw가 Promise rejection으로 새던 문제를
   `WRITE_INVALID_INPUT`으로 fail-closed.

보완 targeted 11/11, 전체 unit 1333/1333, `pnpm check` PASS. 이전 Chromium 134/134 및 고객 hash
불변 결과는 제품 graph에 import되지 않은 controller/unit 보완으로 영향 없음. 추가 결함 0,
**CODEX_PASSED**.
