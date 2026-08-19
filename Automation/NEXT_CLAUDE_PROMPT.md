# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_NEXT_MANUAL_TASK`
active_unit: `none`
completed_unit: `spec-051-space-firestore-read-adapter` — **DONE / CODEX_PASSED / LOCAL_ONLY / NO_NETWORK**
기준: 스펙 051 구현 커밋 **`eb7bb2b`** · 종료 문서 커밋 및 fast-forward push 후 HEAD=origin, ahead/behind **0/0**
next_transition: **`NEXT_MANUAL_TASK`**

## ★ 스펙 051 종료 · 다음 수동 작업 대기

Q-1=A/Q-2=A/Q-3=A에 따라 `@denn/firebase/space-read` local adapter를 구현했다. targeted 30/30,
unit 1462/1462, Chromium 141/141, 고객 hash 동일이다.

실제 Firebase/project/token/document/network/route/UI는 NOT TESTED다. 다음 local-only 후보는 `?space=`
query parsing과 injected Firebase reader + spaces open port를 합성하는 controller 계약 조사다.

## 이전 — 스펙 051 조사 당시 Founder 결정

정본: `docs/rebuild/specs/051-space-firestore-read-adapter-investigation.md`

실제 Firebase/network 없이 Rules, legacy, SDK 12.17.1과 공식 문서를 조사했다. 권장값은 모두 A다.

- Q-1=A: Firestore 공식 document ID 제약의 single segment token 허용
- Q-2=A: `getDoc` + 기본 memory cache, persistent cache 0
- Q-3=A: named `denn-space-viewer`, config mismatch fail-closed, Auth 0, local unit 범위

위 세 결정은 모두 A로 승인되어 local adapter 구현과 검증이 완료됐다.

## 이전 — 스펙 050 종료

document 검증 → password 검증 → decrypt → scene 검증 순서의 local-only 순수 open port를 구현했다.
targeted 54/54, unit 1432/1432, Chromium 141/141, 고객 hash 동일이다.

실제 Firebase/Firestore/token/link/network/route/UI는 NOT TESTED다. 다음 후보는 Firestore read adapter
계약 조사이며 실제 network나 운영 데이터 접근 전 별도 승인이 필요하다.

## 이전 — 스펙 049 종료

`@denn/spaces`에 `space-v1` document와 `space-scene-v1` plaintext의 순수 reader를 구현했다.
targeted 44/44, unit 1422/1422, Chromium 141/141, 고객 hash 동일이다.

실제 Firestore/token/link/network/scene UI는 NOT TESTED다. 다음 local-only 후보는 crypto와 두 reader를
합성하는 순수 read pipeline이다. Firebase adapter·route/UI는 별도 결정 전 시작하지 않는다.

## 이전 — 스펙 048 종료

운영 전환은 Founder 지시로 보류했다. `@denn/spaces`의 legacy crypto envelope를 pure Web Crypto로
구현했고 fixed vector/hostile input을 검증했다. targeted 20/20, unit 1396/1396, Chromium 141/141,
고객 hash 동일이다.

실제 Firestore/기존 `?space=` 링크/scene 적용은 NOT TESTED다. 다음 local-only 후보는 `space-v1`
document shape와 `space-scene-v1` read validation/projection 조사다. 자동 시작하지 않는다.

## 이전 — 스펙 047 종료 · 운영 선행조건 결정 대기

Founder L-1 canary 한정값/L-2=A/L-3=A에 따라 synthetic transitional Rules와 local manifest gate를
구현했다. manifest 12/12, emulator 4/4, unit 1378/1378, Chromium 141/141 PASS다.

다음 운영 단계에는 두 입력이 필요하다.

- 일반 운영 객체 수·총 byte·저장 빈도 상한, 확인 주기와 책임자
- 실제 승인 운영자 UID 정본

운영 전환은 보류됐다. 실제 Firebase/network/deploy/write/legacy close는 계속 금지다.

## 이전 — 스펙 046 단계적 cutover 계약 · Founder 결정 대기

Founder K-1=A/K-3=A가 승인됐고 K-2=A는 스펙 045에서 완료됐다. 스펙 046은 Firestore transitional →
Storage transitional → write-disabled app → 제한 canary → legacy close 순서와 actual-write 전/후 rollback을
문서화했다. 실제 UID·비용 상한·관찰 주체가 없어 운영 전환은 계속 차단된다.

남은 결정(권장 모두 A):

- L-1=A: canary 전 객체 수·총 byte·저장 횟수 상한과 일일 확인 담당자를 명시
- L-2=A: 승인 UID 한 명·새 `/admin/` 한 탭만 사용하고 dual-window legacy 저장은 절차로 중지
- L-3=A: 저장 1건과 head/object/REC·재로그인·새 탭 확인 후 별도 승인으로 legacy close

L-1~L-3은 모두 승인되어 스펙 047 local-only gate가 완료됐다.

## 이전 — 스펙 045 종료 · 스펙 044 Founder 결정 대기

정본: `docs/rebuild/specs/044-admin-write-cutover-readiness-investigation.md`

운영 write는 NOT READY다. 실제 UID 정본, G-4 비용 상한, deploy-safe Hosting/admin route와 단계적
cutover/rollback 계약이 없다.

권장값:

- K-1=A: 비용/용량 상한·관찰 주체 결정 전 운영 쓰기 차단 유지
- K-2=A: 다음은 local-only deploy-safe Hosting/admin route 패키징 스펙 045
- K-3=A: 향후 transitional Rules→app→legacy close 방향

K-2=A 로컬 패키징은 완료됐다. targeted 18/18, unit 1366/1366, Chromium 141/141, 고객 hash 동일,
포트/temp 잔류 0이다. 실제 Firebase/UID/Rules/Hosting deploy/write 활성화는 수행하지 않았다.

K-1=A/K-3=A로 승인되어 스펙 046 계약으로 전이했다.

## ★ 스펙 043 종료 — gated admin write composition

Founder Y-2=A/Y-3=A/Y-4=A/Y-5=A에 따라 단일 composition/auth 권위, production auth-only mode,
별도 exact-true write gate, 명시 load lazy write holder를 구현했다. 기본 production build에서는
write controller/editor가 0이며 운영 write flag는 설정하지 않았다.

targeted 52/52, `pnpm check` PASS(unit 1363/1363), Chromium 139/139, 고객 JS hash 동일.
실제 Firebase/emulator/UID/IAM/Rules 배포/운영 쓰기·발행·delete는 NOT TESTED/금지다.
다음 수동 지시를 기다린다.

## ★ 스펙 043 조사 당시 Founder 결정 대기 (완료 이력)

정본: `docs/rebuild/specs/043-admin-ui-composition-preconnection-contract.md`

Y-1=A 문서 조사 결과, 권장값은 **Y-2=A/Y-3=A/Y-4=A/Y-5=A**다.

- Y-2: 단일 app composition root + `OperatorAuthPort` 한 권위
- Y-3: production에서는 auth-only read card, C5 baseline load 하나만 표시
- Y-4: read enable과 분리된 exact-true write enable gate
- Y-5: 첫 명시 load에서 rejection-safe lazy write facade/port 생성

위 결정은 모두 A로 승인되어 로컬 gated 구현이 완료됐다. 실제 Firebase·UID·Rules 배포·운영 쓰기·
발행·delete 금지는 유지된다.

## ★ 스펙 042 종료 — 합성 로컬 브라우저 fixture

Founder X-1=A/X-2=A/X-3=A에 따라 실제 session controller/editor를 합성 auth/write fake에 연결한
별도 Chromium fixture를 구현했다. production `App.tsx`·composition·Firebase adapter/network는 0이다.

`pnpm check` PASS(unit 1356/1356), Chromium 139/139(신규 5), 고객 JS hash 동일.
실제 Firebase/emulator/UID/IAM/배포/운영 쓰기/UI 연결/delete/발행은 NOT TESTED/금지다.
다음 수동 지시를 기다린다.

## ★ 스펙 041 종료 — W-1 F-D provenance

Founder W-1=A에 따라 baseline provenance, same-port exact load precondition, legacy field 불변 검사,
read-time 승격 canonical payload 제거를 구현했다. legacy field 포함 size는 읽기 전용이다.

targeted 74/74, `pnpm check` PASS(unit 1356/1356), Chromium 134/134, 고객 JS hash 동일.
`App.tsx` 연결·실제 Firebase/emulator/운영 쓰기·Rules/config/deploy는 0이며 계속 금지다.
다음 수동 지시를 기다린다.

**Founder 결정은 `D-1=A`, `D-2=O-3`, `D-3=N`이다. Structure A 식별 구조의 로컬 구현과
검증과 Codex 독립 검수가 끝났다(`CODEX_PASSED`, 발견 결함 0). 다음 작업은 자동으로 시작하지 않는다.**

## ★ 스펙 040 종료

정본: `docs/rebuild/specs/040-admin-write-local-ui-connection-contract.md`

- Founder 승인: **U-1=A, U-2=A, U-3=A**.
- 구현 파일: `apps/admin/src/admin-write/session-controller.ts` + unit.
- UI/App wiring/write adapter 생성 0.
- Codex 보완: 동일 auth 재통지 no-op, hostile input fail-closed.
- 최종 게이트: targeted 11/11, unit 1333/1333, Chromium 134/134, 고객 hash 동일.

판정 `CODEX_PASSED`. 다음 수동 지시를 기다린다. 실제 Firebase·UID·IAM·배포·운영 쓰기·
UI 저장·delete·발행은 금지다.

> 아래 `## 0`부터는 완료된 스펙 039 및 그 이전 역사 기록이다. 현재 작업 지시로 사용하지 않는다.

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
