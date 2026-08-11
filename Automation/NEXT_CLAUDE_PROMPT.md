# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-candidate-admin-write-atomicity` (조사 완료 + Founder 승인 기록 완료)
다음 주체: **Codex** — 구조 결정 Z-1~Z-8 검토 + **스펙 037 구현 계약 작성**

**Founder가 2026-08-11에 G-1~G-5를 승인했다.** 이번 라운드는 그 승인을 **문서에만** 기록했다.
**제품 코드·`storage.rules`·`firestore.rules`·`firebase.json`·config·lockfile 수정은 0**이다.
**Codex가 구조 결정과 구현 계약을 검토·작성하기 전에는 구현을 시작하지 않는다.**

정본: **`docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`**(승인 원문 수록)
근거 조사: `docs/codex-claude-handoff/reviews/2026-08-11-admin-write-atomicity-investigation.md`(보완 라운드 1 반영)

## 1. 확정된 결정 (요약)

| # | 결정 |
| --- | --- |
| **G-1** | `storage.rules` **최소 변경 승인**. `admin/{p=**}` **광범위 write 유지 안 함** · legacy `admin/state.json` **읽기 전용 고정** · rebuild 전용 경로만 **생성** 가능, **`resource == null`로 덮어쓰기·삭제 서버 차단** · **OR 우회 방지 위해 상위 admin write도 좁힘** · 쓰기는 **승인된 기존 운영자 UID 한정** · **실제 UID 정본 전 live Rules 배포 차단** |
| **G-2** | Firestore 사용 + `firestore.rules` **최소 변경 승인**. **rebuild 전용 head 문서 1개만 가변 정본** · head 변경은 **transaction 안에서 `expectedBase == 현재 head`일 때만** · **`spaces/{token}` 등 기존 계약 무변경** · **Firestore SDK는 admin 전용 lazy 경계 밖 노출 금지** |
| **G-3** | **C6(Cloud Function/backend/Admin SDK) 미승인 — 예비 대안 보류** |
| **G-4** | **orphan = head가 참조하지 않는 불변 객체.** 초기 구현에서 **클라이언트 delete·자동 정리 불허** · **보존 기간·비용 한도·정리 주체 별도 승인 전 실제 운영 쓰기 미활성화** |
| **G-5** | **다음 구현 계약 후보 = C5**(고유 불변 Storage 객체 + 단일 Firestore head transaction). **C3·C4 사용 안 함.** **허용 범위 = 계약 작성 + 합성 fake + 로컬 Emulator 검증까지.** emulator에서 **7개 시나리오** 검증. **통과 전 운영 쓰기 미개방** |

## 2. Codex가 결정·작성할 것 — Z-1 ~ Z-8

| # | 항목 |
| --- | --- |
| **Z-1** | **UID 한정의 적용 범위** — `op()` 전역 vs rebuild 경로 한정. ⚠️ `storage.rules:18-21`의 `op()`는 `published/`·`templates/`·`placeholders/`·`guides/`·`mockups/`·`editor-overlays/` write에도 쓰인다(`:35-40`) → 전역 적용 시 **레거시 발행·자산 업로드까지 UID에 묶인다** |
| **Z-2** | **rebuild 전용 경로의 위치와 형태** — `admin/` 하위인지 별도 최상위 경로인지(OR 우회와 직결, `storage.rules:5-7`·`:25-28`). 객체 식별자는 **operation id vs content-addressed**. **revision 번호를 경로에 쓰지 않는다**만 조사에서 확정 |
| **Z-3** | **head 문서의 위치·스키마** — `{ revision, objectPath, 안전 metadata }`의 정확한 필드, **P-5c 비노출 규율과의 정합**, `firestore.rules`에서 `expectedBase` 검사를 규칙으로도 이중 강제할지 |
| **Z-4** | **write port 경계와 오류 코드** — 스펙 036의 주입 facade·모듈 상수 경로·**단일 in-flight** 규율 재사용 범위, 충돌 코드(`retryable: false` + 재읽기 유도). ⚠️ **SDK 내부 자동 재시도**(업로드 창 10분)로 "retry 0"이 port만으로 보장되지 않는다 |
| **Z-5** | **`expectedBase` 캡처 시점**과 편집 세션의 관계 |
| **Z-6** | **Emulator 검증 범위와 허용 파일** — `firebase.json`에 **`emulators` 블록이 없고** 저장소에 `firebase-tools` 의존성이 **없다**. G-5의 **7개 시나리오**(동시 저장·timeout·늦은 성공·브라우저 종료 상당 실패·인증 만료·중복 탭·orphan 발생과 head 불변)를 **결정적으로 재현하는 방법** |
| **Z-7** | **L-4 tombstone** — 삭제 부활은 **병합 의미론 문제라 C5로 해소되지 않는다** |
| **Z-8** | **★ 배포 순서** — G-1을 배포하면 `denn-admin.html:740`의 `admin/state.json` 저장이 **서버에서 거부**된다. 그것이 **현재 운영자의 유일한 저장 경로**다(스펙 035). 리빌드 쓰기가 준비되기 전에 배포하면 **운영자가 아무 데도 저장할 수 없는 구간**이 생긴다 |

## 3. 계속 금지

- **제품 구현 착수** — Codex 계약이 Git 히스토리에 기록되기 전에는 코드·테스트·CSS 작성 0.
- **`storage.rules`·`firestore.rules`·`firebase.json` 수정** — 승인은 났으나 **계약 확정 후**에 한다.
- **Rules 배포** — **실제 운영자 UID 정본**이 제공되기 전 차단(G-1).
- **실제 운영 쓰기 활성화** — G-4(보존·비용·정리 주체 승인) **+** G-5(emulator 검증 통과) 양쪽 전제.
- 실제 Firebase 프로젝트·운영 bucket·운영 데이터·**live network** · **Hosting 배포** ·
  **`published/state.json` 발행** · **C6 구현** · **클라이언트 delete·orphan 자동 정리**.
- 신규 의존성(계약이 정한 범위 밖) · force push · merge · rebase · `reset --hard` · broad delete ·
  새 자동화나 반복 작업.

## 4. 보호 대상 (수정·복원·stage·commit 금지)

- **`docs/rebuild/design/taste-v2/`** — **Founder 소유의 별도 작업**(2026-08-11 신규 지정)
- 같은 작업으로 보이는 **`docs/rebuild/design/README.md`**(수정됨) ·
  **`docs/rebuild/specs/038-page-design-prototype.md`**(untracked)
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 5. UNCONFIRMED / NOT VERIFIED

- **신규**: 실제 운영자 **UID**(저장소에 없다 — 배포 차단으로 처리) ·
  **Emulator에서의 C5 거동**(G-5의 7개 시나리오 전부 미실행) ·
  **`resource == null` 규칙의 실제 거부 동작**(emulator에서도 미확인).
- **유지**: 덮어쓰기 `create`에서 `resource`가 채워지는지 · `/v0` 표면의 precondition 수용 여부 ·
  실제 `admin/state.json`·`published/state.json` 내용 · L-1~L-4 재현 · 운영자 계정 실재·로그인 ·
  실기기 · Firestore 청크 번들 실측 · `pnpm-workspace.yaml`의 `allowBuilds` ·
  `firebase.google.com/docs/reference/**` 본문(세션 미취득; `resource == null` 인용 출처는 Codex 검수,
  `rules-conditions`로 교차 확인).
- **추적 종료**: 고정 경로 `rev+1`의 CAS 보장 — **C3를 사용하지 않기로 했으므로**(G-5) 더 이상 추적하지 않는다.
