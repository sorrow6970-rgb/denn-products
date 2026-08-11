# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-admin-write-c5-emulator-contract` (**계약 보완 라운드 1 완료 · 구현 미착수**)
fix_round: 1 / max 3 · 기준 `c654023` → **보완 커밋 `41b54b9`** (+ 상태 동기화 커밋)
다음 주체: **Codex** — 보완 라운드 1 재검토

**Codex가 지적한 계약 결함 5건을 문서 전용으로 정정했다.** 구현은 시작하지 않았다.

> **★ 이 파일에는 현재 Claude가 수행할 작업 항목이 없다.**
> §1~§3은 **이미 완료된 정정 내역**과 **Codex가 확인할 것**이다.
> Codex가 재검토 결과와 다음 Claude 지시를 이 파일에 남기기 전까지 Claude는 새 작업을 시작하지 않는다.

- 계약: **`docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`**(정정본)
- 핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
- 결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5)

> **★ 이 계약은 실제 저장 구현도 admin UI 연결도 승인하지 않는다.**
> **Codex 재검토 → Founder의 구현 착수 별도 승인** 전에는 코드를 쓰지 않는다.

## 1. 정정한 5건

| # | 초판(`c654023`)의 결함 | 정정 |
| --- | --- | --- |
| **1** | baseline load에 필요한 **Firestore head `get` 권한이 Rules 계약에 없었다** | §4.4 전면 재작성 — **`get`은 승인 UID + `docId=='head'`만**, **`list` 거부**, create는 **`revision==1`만**, update는 **`revision` 정확히 +1 AND `objectPath`가 이전 값과 달라야** 함, **허용 키 3개**, **`objectPath` 형태 강제**, **delete 금지**, **다른 문서 전부 거부**, **`spaces`·catch-all 무변경** |
| **2** | **합성 UID Rules 사본을 고를 별도 emulator config가 없어** 배포 config와 섞일 수 있었다 | §7.3 — **`firebase.json`은 구현 단계에서도 수정 금지**, 신규 **`firebase.emulator.json`** 이 **emulator 전용 Rules 사본 + 포트만** 참조, 실행은 **`--config firebase.emulator.json` + `--project demo-denn-emulator`** 를 **둘 다** 포함, **UID 상수 외 diff 0을 unit test로 고정**, `.firebaserc` 무변경. **허용 파일에서 `firebase.json` 제거 · `firebase.emulator.json` 추가** |
| **3** | **`WRITE_COMMIT_OUTCOME_UNKNOWN`을 orphan으로 단정**해 commit 성공 가능성과 모순 | §6.5 결과 상태 **5행 표**로 분리 — **결과 불명은 orphan이 아니라 "미판정"**, **head 재조회(`objectPath`+`revision`)로만 판정**, **`WRITE_HEAD_FAILED`도 `retryable:false`**, **reload 전 동일 payload 재전송 자동·수동 모두 금지**, **"head commit만 재개" API 미도입**, **명확한 실패만 `WRITE_UPLOAD_FAILED`** |
| **4** | **transaction callback의 SDK 내부 재실행과 부작용 금지**가 없었다 | §5.5 신설 — **앱은 `runTransaction` 정확히 1회 호출**, **SDK는 callback을 여러 번 실행할 수 있음**, callback 안 **`transaction.get/set` 외 부작용 전면 금지**(UUID·upload·로그·UI·로컬 revision), **`operationId`/`expectedBase`는 호출 전 고정**, **재실행 ≠ 앱 retry** |
| **5** | **공개 port 타입·입출력**이 없었다 | §5.6 — `AdminStateWritePort`/`AdminStateBaselineValue`/`AdminStateSaveRequest`/`AdminStateSaveValue`를 **이름까지 고정**, **`operationId`는 port 내부 생성**, head 없음에서만 **legacy+revision 0**, 불일치는 **fail-closed**, **`admin-read/**` 무수정**, **중복 검증 금지** |

**emulator 시나리오 7 → 12개**: **#8** 승인 UID head `get` 성공 · **#9** 다른 UID·익명·미인증 거부 ·
**#10** head `list` 거부 · **#11** callback 재실행 시 upload 반복 0 ·
**#12** commit outcome unknown은 재조회로 판정. synthetic Auth 계정은 **emulator 내부 전용**.

**신규 위험**: **R-9** callback 재실행이 upload 반복/부작용 · **R-10** baseline load가 head를 못 읽음.

## 2. ★ Codex가 판단해 줘야 할 것 — `Catalog` 타입 이름

교정 5의 타입 블록은 **`Catalog`** 를 쓰지만 **그 이름의 타입은 저장소에 존재하지 않는다.**
실제 export는 **`CatalogDocumentV1`**(`packages/shared/src/catalog/types.ts`;
스펙 036 `AdminStateLoadValue.document`가 그 타입이다).

계약은 `Catalog`를 **`CatalogDocumentV1`에 바인딩**하고 **동의어·새 타입을 만들지 않는다**고 기록했다
(교정 5의 "중복 검증 규칙을 만들지 않는다"와 같은 이유). **다른 의도였다면 계약만 정정하면 된다** —
제품 코드는 아직 없다. `Result`는 `packages/shared/src/index.ts:19`의 기존 타입을 쓴다.

## 3. Codex가 확인할 것

- 교정 1~5가 계약에 **정확히** 반영됐고 **초과 확장이 없는지**
- **삭제되어야 할 초판 문구**가 남아 있지 않은지 — "결과 불명 = orphan", `firebase.json`
  emulators 블록, `WRITE_HEAD_FAILED` retryable:true
- §6.5의 **결과 상태 5행**과 §5.4 **retryable 분류**가 서로 모순 없는지
- §4.4의 **`objectPath` 교체 강제**가 §6.5의 **재조회 판정**과 정합하는지
- **`Catalog` → `CatalogDocumentV1` 바인딩** 판단(§2)
- 변경이 **허용 문서 6개**로 한정됐는지, **Codex 검수 기록과 초판 이력이 보존**됐는지
- 그 뒤 **보완 라운드 1 승인 여부 판단**

## 4. 계속 금지

- **구현 착수** — Codex 승인 + Founder의 구현 착수 승인 전에는 코드·테스트·CSS 0.
- **`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml` 수정** —
  계약이 허용 파일로 열거했으나 **구현 단계에서만**이다.
- **실제 emulator 실행** · 실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network.
- **Rules 배포 · Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행.**
- **저장 버튼·admin UI 연결** · **tombstone·자동 merge·orphan 삭제·클라이언트 delete 권한.**
- 신규 의존성 · force push · merge · rebase · `reset --hard` · broad delete ·
  새 자동화나 반복 작업.

## 5. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder 소유의 별도 작업**
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
