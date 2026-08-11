# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-admin-write-c5-emulator-contract` (**계약 보완 라운드 3 완료 · 구현 미착수**)
fix_round: 3 / max 3 · 기준 `f694211` → 보완 커밋(후속 동기화 커밋에서 hash 확정)
다음 주체: **Codex** — **최종 계약 검토**

**Codex가 지적한 최종 계약 결함 2건을 문서 전용으로 정정했다.** 구현은 시작하지 않았다.

- 계약: **`docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`**(라운드 3 정정본)
- 핸드오프: `docs/handoff/2026-08-11-spec-037-admin-write-c5-handoff.md`
- 결정 정본: `docs/codex-claude-handoff/decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5)

> **★ 이 파일에는 현재 Claude가 수행할 작업 항목이 없다.**
> 아래는 **이미 완료된 정정 내역**과 **Codex가 확인할 것**이다.
> Codex가 최종 검토 결과와 다음 지시를 이 파일에 남기기 전까지 새 작업을 시작하지 않는다.

## 1. 정정한 2건

| # | 라운드 2의 결함 | 정정 |
| --- | --- | --- |
| **1** | `loadBaseline`의 읽기/network/invalid 상태를 **`WRITE_UPLOAD_FAILED`·`WRITE_UPLOAD_OUTCOME_UNKNOWN`·`WRITE_HEAD_FAILED`로 표현** — **읽기 작업에 "upload" 오류**를 반환하고 **persisted object invalid를 "head transaction 실패"와 합쳐** 공개 API 의미가 틀렸다 | **오류 표면 분리.** **`save`만** `SafeAdminWriteError` + 8개 `WRITE_*`. **`loadBaseline`은 스펙 036 `SafeAdminReadError` 재사용** + **head 문서 자체 스키마 위반만 `REBUILD_BASELINE_INVALID`**(baseline 전용 유일 추가). **read timeout/network는 상태 미변경이므로 upload outcome unknown이 아니다.** **`WRITE_HEAD_FAILED`는 save의 head transaction 명확 실패로 재축소** |
| **2** | **timeout 뒤 head가 base면 미반영 확정**하고 `WRITE_HEAD_FAILED` 반환 — **timeout은 transaction을 취소하지 않으므로 원 transaction이 나중에 성공할 수 있다** | **base 관측 = 미판정 `WRITE_COMMIT_OUTCOME_UNKNOWN`, orphan이라 부르지 않는다.** `base+1` + **다른 `objectPath` → `WRITE_CONFLICT` 확정**(우리 late commit은 CAS에서 이길 수 없다). **`base+1` 초과·read 실패/timeout → 판정 불가.** 명확히 reject된 경우는 **reconciliation에 들어오지 않는다** |

**신규 위험**: **R-14** 읽기 실패를 "upload 오류"로 보고 · **R-15** timeout 뒤 base 관측 오판으로
**서버에서 나중에 성공한 commit을 실패로 보고하고 운영자가 같은 payload를 재전송하게 만듦**.

**라운드 2의 열린 질문 해소**: `WRITE_HEAD_FAILED`를 넓히던 절충을 **교정 1이 폐기**했다.
**표면 분리가 옳은 답**이고 **9번째 `WRITE_*` 코드는 만들지 않았다.**

**확인한 사실**: `SafeAdminReadError`는 **`@denn/firebase/admin-read` 배럴이 이미 export한다**
(`packages/firebase/src/admin-read/index.ts`). 자기 package subpath 순환이 문제면
**내부 relative type import 허용**하되 **공개 의미는 동일**해야 하며,
**`import type`은 컴파일 시 지워져 런타임 결합·번들 영향이 어느 쪽이든 0**이다.

## 2. Codex가 확인할 것 (최종 검토)

- 교정 1~2가 계약에 **정확히** 반영됐고 **초과 확장이 없는지**
- **삭제되어야 할 라운드 2 문구**가 남아 있지 않은지 — `loadBaseline`이 내는 `WRITE_*` 목록,
  `WRITE_HEAD_FAILED`의 "persisted head/객체 위반" 확장, "base 관측 = 미반영 확정 + orphan"
- §5.4 (A)/(B) 두 표가 **서로 침범하지 않는지**(`save`는 `WRITE_*`만, `loadBaseline`은 read 오류 +
  `REBUILD_BASELINE_INVALID`만)
- §6.6 판정 5분기가 §5.4·§6.5·§6.7 orphan 정의·**F-4·F-5**와 **정합**하는지
- **"늦은 결과 폐기"와 "원 transaction이 서버에서 늦게 성공할 수 있음"이 모순 없이** 기술됐는지
- §16 승인 문구가 **"경계를 추측하지 않는다"** 를 지키는지
- 변경이 **허용 문서 6개**로 한정됐는지, **Codex 검수 기록과 이전 라운드 이력이 보존**됐는지
- 그 뒤 **최종 계약 승인 여부 판단**

## 3. 계속 금지

- **구현 착수** — Codex 최종 검토 전 port/Rules/config/test 구현 0.
- **`apps/**`·`packages/**`·`tests/**`·`storage.rules`·`firestore.rules`·`firebase.json`·
  `firebase.emulator.json`·`package.json`·lockfile·`pnpm-workspace.yaml`·`.firebaserc` 수정** —
  계약이 허용 파일로 열거한 것도 **구현 단계에서만**이다.
- **실제 emulator 실행** · 실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network.
- **Rules 배포 · Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행.**
- **저장 버튼·admin UI 연결** · **tombstone·자동 merge·orphan 삭제·클라이언트 delete 권한.**
- 신규 의존성 · force push · merge · rebase · `reset --hard` · broad delete ·
  새 자동화나 반복 작업.

## 4. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 5. NOT TESTED / UNCONFIRMED

실제 Firebase 프로젝트 동작 전부(Rules 실제 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절 · 실기기·다중 기기 동시 편집 ·
**Auth emulator binary 가용성** · 운영 규모 payload · orphan 누적 실제 비용 ·
**L-4 삭제 부활**(범위 밖) · `pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).
