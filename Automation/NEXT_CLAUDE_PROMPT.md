# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-admin-write-c5-emulator-contract` (**계약 보완 라운드 2 완료 · 구현 미착수**)
fix_round: 2 / max 3 · 기준 `fad819f` → **보완 커밋 `d5789db`** (+ 상태 동기화 커밋)
다음 주체: **Codex** — 보완 라운드 2 재검토

**Codex가 지적한 계약 결함 4건을 문서 전용으로 정정했다.** 구현은 시작하지 않았다.

- 계약: **`docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`**(라운드 2 정정본)
- 핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
- 결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5)

> **★ 이 파일에는 현재 Claude가 수행할 작업 항목이 없다.**
> 아래는 **이미 완료된 정정 내역**과 **Codex가 확인할 것**이다.
> Codex가 재검토 결과와 다음 Claude 지시를 이 파일에 남기기 전까지 새 작업을 시작하지 않는다.

## 1. 정정한 4건

| # | 라운드 1의 결함 | 정정 |
| --- | --- | --- |
| **1** | head가 없을 때 **`expectedBase`를 확인하지 않고 revision 1 생성** → G-2 모순 | **head 없음 = 논리적 revision `0`**, **`expectedBase === 0`일 때만 create**, 아니면 **`WRITE_CONFLICT`**(head 불변). **`expectedBase`는 0 이상 safe integer**(위반 시 **upload 전 `WRITE_INVALID_INPUT`**, Storage 호출 0회). **persisted `revision`은 1 이상 safe integer이고 `+1`이 safe**해야 하며 아니면 **fail-closed**. Rules의 create `revision == 1`/update `+1`은 유지하고 **`expectedBase`는 클라이언트 transaction 계약에서 검사** |
| **2** | 타입 블록이 **존재하지 않는 `Catalog`** 사용 + **`SafeAdminWriteError` 미완결** | 블록이 **`CatalogDocumentV1` 직접 사용**(alias 0), `Result` **import 표면 명시**, **`AdminWriteErrorCode`(8 union)·`AdminWriteErrorCategory`·`SafeAdminWriteError` 고정**, **정본 매핑 표 §5.4 한 곳**, **`correlationId` 외 비노출**, `AdminStateRevision` 범위 = §5.7 |
| **3** | 내부 `operationId` 때문에 **호출자가 수행할 수 없는 재조회**를 요구 | **`save` 내부 read-only bounded reconciliation**(§6.6) — **재업로드 0 · transaction 재호출 0 · read 최대 1회 · callback 밖**. 3분기: 성공 / **미반영 확정 `WRITE_HEAD_FAILED`**(orphan, 자동 재전송·삭제 0) / **판정 불가 `WRITE_COMMIT_OUTCOME_UNKNOWN`**. **오류에 `operationId`·object path 비노출**, **`loadBaseline`은 reconciliation API 아님** |
| **4** | **실제 Rules 표에 callback 재실행·commit outcome unknown**을 넣었으나 결정적 재현 방법 없음 | **(A) emulator E-1~E-8** / **(B) fake F-1~F-10** 분리. **두 항목은 seam이 없어 fake 전용으로 재분류**하고 **emulator 증명이라고 주장하지 않는다**. **(C)** network 차단·프로세스 종료·포트 강제 해제·emulator kill·실제 Firebase로 재현 금지. **(D)** fake는 Rules 원자성을, emulator는 앱 오류 분기 전체를 증명하지 않는다 |

**신규 위험**: **R-11** head 부재에서 revision 1로 이력을 밀어냄 · **R-12** 호출자가 수행 불가능한
복구 절차 요구 · **R-13** fake 전용을 "실제 Rules 검증"으로 오인.

## 2. ★ Codex가 판단해 줘야 할 것 — `loadBaseline` 실패의 코드 이름

교정 2는 **"계약의 8개 코드만 허용"** 을 요구한다. 그런데 8코드는 `save` 기준으로 만들어졌고,
`loadBaseline`이 겪는 **"persisted head 또는 그 객체가 계약을 위반해 사용할 수 없음"** 에
정확히 대응하는 이름이 없다.

**9번째 코드를 만들지 않고 `WRITE_HEAD_FAILED`의 의미를 확장**했다 —
"head transaction이 명확히 실패했다 **또는** persisted head/그 객체가 계약을 위반해 사용할 수 없다".
둘 다 **확정된 실패**이고 **`retryable: false`** 라 성질이 같다.
**이름이 `HEAD`인데 참조 객체까지 포함하는 점은 의도적 절충**이며, 다른 이름을 원하면
**계약만 고치면 된다**(제품 코드는 아직 없다). 계약 §0.1·§5.4에 기록했다.

## 3. Codex가 확인할 것

- 교정 1~4가 계약에 **정확히** 반영됐고 **초과 확장이 없는지**
- **삭제되어야 할 라운드 1 문구**가 남아 있지 않은지 — "head 없으면 무조건 revision 1",
  타입 블록의 `Catalog`, "호출자가 head를 재조회", 실제 Rules 표의 callback 재실행·outcome unknown
- §4.3 최초 create 분기가 §5.4·§5.7·§6.5·F-9와 **같은 의미**인지
- §6.6 reconciliation 3분기가 §5.4 코드·§5.6 반환 타입·F-4와 **정합**하는지
- §7.5 (A)/(B) 분리가 **증명 주체를 넘겨 쓰지 않는지**, (C) 금지가 지켜지는지
- **`loadBaseline` 실패 코드 이름** 판단(§2)
- 변경이 **허용 문서 6개**로 한정됐는지, **Codex 검수 기록과 이전 라운드 이력이 보존**됐는지
- **§16 승인 상태 문구**가 "구현 착수 여부를 추측하지 않는다"를 지키는지
- 그 뒤 **보완 라운드 2 승인 여부 판단**

## 4. 계속 금지

- **구현 착수** — Codex 승인 + Founder의 구현 착수 승인 전에는 코드·테스트·CSS 0.
- **`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` 수정** —
  계약이 허용 파일로 열거한 것도 **구현 단계에서만**이다.
- **실제 emulator 실행** · 실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network.
- **Rules 배포 · Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행.**
- **저장 버튼·admin UI 연결** · **tombstone·자동 merge·orphan 삭제·클라이언트 delete 권한.**
- 신규 의존성 · force push · merge · rebase · `reset --hard` · broad delete ·
  새 자동화나 반복 작업.

## 5. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 6. NOT TESTED / UNCONFIRMED

실제 Firebase 프로젝트 동작 전부(Rules 실제 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절 · 실기기·다중 기기 동시 편집 ·
**Auth emulator binary 가용성** · 운영 규모 payload · orphan 누적 실제 비용 ·
**L-4 삭제 부활**(범위 밖) · `pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).
