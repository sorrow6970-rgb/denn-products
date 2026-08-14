# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_NEXT_MANUAL_TASK`
active_unit: `none`
completed_unit: `spec-039-g4-orphan-identification-structure-a` — **DONE / `CODEX_PASSED` / LOCAL_ONLY**
기준: HEAD=origin=`7843e85`, ahead/behind **0/0**
next_transition: **`NEXT_MANUAL_TASK`**

**Founder 결정은 `D-1=A`, `D-2=O-3`, `D-3=N`이다. Structure A 식별 구조의 로컬 구현과
검증과 Codex 독립 검수가 끝났다(`CODEX_PASSED`, 발견 결함 0). 다음 작업은 자동으로 시작하지 않는다.**

## 0. 이번 후보

- REC을 upload 전에 별도 Firestore commit으로 create한다.
- REC ID = Storage objectId = `UUID.json`; head는 `objectPath` 대신 `recId`를 저장한다.
- Storage create와 head create/update Rules가 동일 REC을 확인한다.
- 실제/합성 Rules 모두 REC update/delete, Storage update/delete, head delete를 거부한다.
- 삭제 API·delete 권한·자동 정리·보존 주기는 없다.
- 검증: targeted unit 51/51, `pnpm check` unit 1322/1322, E2E 134/134,
  demo emulator 13/13 PASS.

- 실제 Firebase·UID·IAM·배포·UI·delete·자동 정리는 NOT TESTED/금지 유지.
- 구현·종료 커밋 `7843e85` fast-forward push 완료. 다음 수동 지시를 기다린다.

> 아래 `## 1`부터는 2026-08-11 Founder 결정 전의 역사 기록이다. 현재 작업 지시로 사용하지 않는다.

> **⚠️ G-4 문서 6개는 지시에 따라 `commit`·`push`·`stage`하지 않았다.**
> 워킹 트리에 미커밋으로 남아 있으며, 커밋 여부는 **별도 지시**를 따른다.

## 1. Codex 최종 판정

- **G-4 보완 라운드 2 문서 검수 통과** — **`getAfter()` 원자성 정정 · transaction 시간 제한 정정 ·
  REC ID 매핑 정정**이 모두 반영됐다.
- **구조 A와 B는 모두 "가능한 후보"로만 기록됐고 어느 것도 채택되지 않았다.**
- **구조 A/B 및 REC·Rules 동작은 NOT TESTED다.**
- **실제 삭제 · 자동 정리 · Rules 변경 · head 스키마 변경 · 클라이언트 delete 권한 ·
  IAM 활성화 · 구현·배포 승인이 아니다.**
- **현재 기본 정책은 계속 `O-3 삭제 보류`다.**
- **다음 단계는 Founder의 D-1~D-3 결정이며 오늘은 결정하지 않는다.**

## 2. 남은 Founder 결정 — **선택지 그대로 보존** (아직 아무것도 고르지 않았다)

| # | 질문 | 선택지 |
| --- | --- | --- |
| **D-1** | **완료 판정 방식과 구조** | **SDC′ + 구조 A**(실패 산물까지 회수 · Storage create stray 차단 가능 · 계약 변경 큼) / **SDC′ + 구조 B**(원자성 서버 강제 · 계약 변경 작음 · **실패 산물 회수 불가**) / **시간 창**(= 안전 증명이 아니라 리스크 수용) / 혼합 |
| **D-2** | **정리 주체** | **없음(O-3 보류)** / 운영자 수동(O-1) / backend(O-2 = **G-3 재개**) / **Storage Rules 서버 강제(O-4)** |
| **D-3** | **보존 개수·주기** | 직전 **K개** 보존 · 정리 주기 · 비용 상한 |

> **D-1 = SDC′ + D-2 = 없음** 조합도 유효하다 — 삭제는 일어나지 않지만 구조는 준비된다.
> 정본: `docs/codex-claude-handoff/decisions/2026-08-11-g4-orphan-retention-decisions.md`

## 3. 재개할 때 참고 (아무것도 승인되지 않았다)

- **D-1·D-2가 정해지면** 그때 최소 파일 범위가 열린다(정본 §14).
  SDC′ 채택 시 **head 스키마 `objectPath` → `recId`** 변경이 따라오며 이는 **스펙 037 계약 변경**이다.
- 그 밖의 후보: **cutover 스펙**(실제 UID → Rules 배포 순서 → 운영 쓰기 개방) ·
  **admin UI 연결**(저장 버튼 + 스펙 035 결합) · **L-4/tombstone** · **발행**(F-B) · **C6 재검토**(G-3).

## 4. 계속 금지

제품 코드 · `firestore.rules` · `storage.rules` · config · test · `package.json` · lockfile ·
`pnpm-workspace.yaml` · `firebase.json` · `.firebaserc` · 루트 배럴 · `admin-read/**` 수정 ·
**실제 Firebase/project/bucket/운영 데이터 · 실제 UID 접근** · **실제 객체 조회·나열·삭제** ·
**emulator 실행** · **Rules·Hosting 배포** · **운영 쓰기** · **UI 연결** · **발행** ·
**orphan 삭제·자동 정리** · **클라이언트 delete 권한** · **IAM 활성화** ·
**head 스키마 변경** · **C6/L-4 구현** · 신규 의존성 ·
force push · merge · rebase · `reset --hard` · broad delete ·
**다음 스펙·구현 계약 임의 착수** · **자동화나 반복 작업 생성**.

## 5. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 6. UNCONFIRMED / NOT TESTED (검수 통과로 바뀌지 않는다)

**구조 A·B 및 REC + `firestore.get()`/`getAfter()` 규칙의 실제 동작**(**NOT TESTED** — emulator 미실행) ·
**Rules의 문자열 연결(`+`)·분해(`split` 등) 지원 여부**(**UNCONFIRMED** — 설계에 쓰지 않았다) ·
**`save()` 호출 전체의 벽시계 상한**(**UNCONFIRMED**; **개별 transaction 제한은 확정** —
lock 20초 · 최대 270초 · idle 60초 · 유한 재시도) ·
실제 `admin/state.json` 크기·내용(**NOT TESTED**) · 리빌드 payload 크기(**UNCONFIRMED**) ·
**저장 빈도 미결정**(⚠️ 레거시 **3초 디바운스**; 저장마다 **객체 1개 + REC 1개**가 생기고
Storage Rules의 `firestore.get()`도 **Firestore quota/billing에 포함**된다) ·
bucket 객체 수·용량·location·class·lifecycle(**NOT TESTED/UNCONFIRMED**) ·
GCS·Firestore 요금(**UNCONFIRMED**) · Storage prefix 나열 허용 여부(**UNCONFIRMED**) ·
`docs/reference/security/storage` 및 `docs/reference/rules/rules.firestore` 본문(**이 세션 미취득**) ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).
