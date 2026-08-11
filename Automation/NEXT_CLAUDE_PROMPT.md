# NEXT CLAUDE PROMPT

상태: `WAITING_FOR_NEXT_MANUAL_TASK`
active_unit: `none`
completed_unit: **`spec-037-admin-write-c5-emulator` — DONE (`CODEX_PASSED`)**
제품 검증 커밋: **`ead06ab`** (구현 `d83aee9` + 보완 라운드 1) · 기록 `91a7813` · 종료 문서(이 커밋)

**스펙 037은 Codex 독립 재검증을 통과해 DONE이다.**
**다음 스펙은 자동으로 시작하지 않는다.** Founder가 명시적으로 지시할 때 새 작업 범위를 정한다.

## 1. 확정된 사실 (Codex 독립 검증)

| 항목 | 결과 |
| --- | --- |
| HEAD=origin | `91a7813`, ahead/behind **0/0** |
| 변경 범위 | **허용 4파일뿐** — `write-port.ts` · `sdk-facade.ts` · `admin-write.test.ts` · 신규 `sdk-facade.test.ts` |
| `pnpm install --offline --frozen-lockfile` | **PASS**, **lockfile diff 0** |
| format / lint / typecheck / unit / build | **PASS** |
| unit | **1318/1318** |
| Chromium E2E | **134/134** |
| **고객 번들 SHA-256** | **`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`** |
| **local `demo-denn-emulator` Rules 게이트** | **10/10 PASS** |
| ports 4183/4184/8080/9099/9199 | 잔류 **0** |
| `git diff --check` | **PASS** · 추가 결함 **없음** |

## 2. 스펙 037이 닫은 것

**로컬 비-UI 구현·검증까지.** `@denn/firebase/admin-write` port(**불변 객체 생성 + 단일 Firestore
head CAS + 결과 불명 시 bounded reconciliation**) · **두 오류 표면** · `storage.rules`/`firestore.rules`
**목표 상태**(placeholder UID) · emulator 전용 config와 Rules 사본 · opt-in fake/emulator 검증.

## 3. ★ 여전히 NOT TESTED이자 금지

- **실제 Firebase 프로젝트 · 운영 bucket · 운영 데이터 · live network** — **NOT TESTED**
- **실제 운영자 UID** — **UNCONFIRMED**. 배포 대상 Rules에 **placeholder가 남아 현 상태로 배포 불가**
- **Rules · Hosting 배포** — **금지**. ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서 거부되므로
  **배포 순서 자체가 STOP 대상**이다. cutover는 **별도 스펙 + 별도 Founder 승인**
- **운영 쓰기 활성화** — **금지**. 전제 3개 중 **emulator PASS 하나만 충족**
- **`apps/**`와 모든 UI 연결 · 저장 버튼** · **`published/state.json` 발행** ·
  **legacy `admin/state.json` 공유 쓰기** · **orphan 삭제·자동 정리** ·
  **tombstone·자동 merge·L-4 해결** — 전부 **금지**, 각각 별도 스펙
- **실제 네트워크 지연·단절 · 실기기 · 다중 기기 동시 편집 · 운영 규모 payload ·
  orphan 누적 실제 비용** — **NOT TESTED**
- `pnpm-workspace.yaml`의 `allowBuilds` — 이월, **미해결**

## 4. 증명 경계 (유지)

> **합성 fake는 서버 Rules의 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
> callback 재실행과 commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
> **emulator 증명이라고 주장하지 않는다.** **emulator는 실제 Firebase가 아니다.**

## 5. 계속 금지

제품 코드·Rules·config·test·`package.json`·lockfile·`pnpm-workspace.yaml` 수정 ·
`firebase.json`·`.firebaserc`·루트 배럴·`admin-read/**` 수정 ·
실제 Firebase/network/live/운영 데이터 · Rules·Hosting 배포 · 운영 쓰기 · 발행 ·
신규 의존성·도구/binary 다운로드·설치 ·
force push · merge · rebase · `reset --hard` · broad delete ·
**다음 스펙 임의 착수** · **자동화나 반복 작업 생성**.

## 6. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 7. 재개 방법

Founder가 다음 작업을 지시하면 그때 범위를 정한다. 참고 후보(순서 미확정, **아무것도 승인되지 않았다**):

- **cutover 스펙** — 실제 UID 확보 → Rules 배포 순서 → 운영 쓰기 개방
  (⚠️ legacy 저장을 먼저 닫지 않는 순서가 전제)
- **admin UI 연결** — 저장 버튼과 `PrintSizeCmDraft`(스펙 035) 결합
- **orphan 보존·비용·정리 정책**(G-4) · **L-4 삭제 부활 / tombstone** · **발행**(F-B) · **C6 재검토**(G-3)
