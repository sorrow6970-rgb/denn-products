# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-admin-write-c5-emulator-implementation-authorization`
기준: `2f0ca7d` → **승인 기록 커밋 `4f2ab0b`** (+ 상태 동기화 커밋)
최종 계약: **`9805c26`** — Codex 판정 **`CONTRACT_PASSED`**
다음 주체: **Codex** — **NEXT §3 2단계: 승인 기록과 최종 구현 허용 파일 확인**

**Founder가 2026-08-11에 스펙 037 최종 계약 `9805c26`과 로컬 비-UI 구현·검증 착수를 승인했다.**
이번 라운드는 그 승인을 **문서에만** 기록했다.

정본: **`docs/codex-claude-handoff/decisions/2026-08-11-spec-037-implementation-authorization.md`**
(승인 원문 수록) · 계약: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`

> **★ 이 파일에는 현재 Claude가 수행할 작업 항목이 없다.**
> **구현은 승인됐지만 순서상 2단계(Codex의 허용 파일 확인)가 먼저다.**
> Codex가 확인 결과를 이 파일에 남긴 뒤에 3단계 구현을 시작한다.

## 1. 승인된 범위

- `packages/firebase/src/admin-write/**` — **write port + 합성 fake**
- `packages/firebase/package.json` — **`./admin-write` 서브패스 export**
- **배포하지 않는** `storage.rules` / `firestore.rules` **목표 파일**
  — 실제 UID는 **UNCONFIRMED placeholder만**, **파일 편집만 허용하며 배포 금지**
- **`firebase.emulator.json`** 신규 local-only config
- **emulator 전용 Storage/Firestore Rules 사본**(합성 UID만)
- `vitest.config.ts` · `vitest.emulator.config.ts` · `package.json`의 **opt-in emulator test 명령**
- `*.emulator.test.ts` 및 관련 **unit/fake 테스트**
- **기존에 캐시된 도구만** 이용한 **`demo-denn-emulator` 로컬 emulator 검증**
- 계약 / STATE / NEXT / CURRENT / live / handoff **종료 문서**

## 2. 승인되지 않은 범위 (계속 닫힘)

**`apps/**`와 모든 UI 연결**(저장 버튼 · admin 화면 · 실제 고객/운영 경로) ·
**실제 운영자 UID 추측·기록** · **실제 Firebase project · 운영 bucket/data · live network** ·
**Rules/Hosting 배포 · 운영 쓰기 활성화 · `published/state.json` 발행** ·
**legacy `admin/state.json` 공유 쓰기** · **orphan 삭제·자동 정리·client delete 권한** ·
**tombstone·자동 merge·L-4 해결** · **신규 의존성 · 도구/binary 다운로드·설치** ·
**실제 프로젝트 id 또는 `.firebaserc` 사용** · **자동화·반복 작업 생성** ·
force push · merge · rebase · `reset --hard` · broad delete · 사용자 변경 복원 · 타 프로세스 종료.

## 3. ★ 구현 시 유일한 허용 파일 (승인 범위 = 계약 §10, 일치 확인함)

```
packages/firebase/src/admin-write/**          write port + 합성 fake (신규)
packages/firebase/package.json                ./admin-write export 추가
storage.rules                                 계약 §4.2 목표 상태 · placeholder UID · 배포 금지
firestore.rules                               계약 §4.4 목표 상태 · placeholder UID · 배포 금지
firebase.emulator.json                        신규 · local-only
<emulator 전용 storage/firestore rules 사본>   합성 UID만
vitest.config.ts                              *.emulator.test.ts 제외 추가
vitest.emulator.config.ts                     신규
package.json                                  test:emulator 스크립트 추가
**/*.emulator.test.ts, 관련 unit/fake 테스트
스펙 037 handoff / CURRENT / live / STATE / NEXT
```

**여전히 금지**: **`firebase.json`** · **루트 배럴 `packages/firebase/src/index.ts`** ·
**`packages/firebase/src/admin-read/**`** · **`apps/**`** · `packages/render/**` ·
`packages/shared/**` · `.firebaserc` · 실제 `.env` · legacy HTML.

**★ `pnpm-lock.yaml` diff는 0이어야 한다** — 신규 의존성이 승인되지 않았으므로
`pnpm install --frozen-lockfile`이 통과해야 한다. 변경이 필요해지면 **STOP**이다.

## 4. ★ emulator 실행 경계

- **기존에 캐시된 도구만**: Java `openjdk 21.0.11 LTS` · firebase-tools 전역 `15.22.4`
  (저장소 의존성 아님) · `cloud-firestore-emulator-v1.21.0.jar` ·
  `cloud-storage-rules-runtime-v1.1.3.jar` · `ui-v1.15.0`.
- **`--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를 모두** 명시한다.
- **host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트는 시작 전에 실패한다.**
- **`.firebaserc`는 쓰지도 수정하지도 않는다.**
- **다운로드·설치·신규 의존성·포트 강제 해제·타 프로세스 종료가 필요하면 실행하지 말고 STOP.**
- ⚠️ **Auth emulator binary 가용성은 UNCONFIRMED** — **첫 실행에서 다운로드 시도 시 즉시 STOP.**

## 5. 승인 후 순서 (§3 = 이 문서 기준)

| 단계 | 주체 | 내용 | 상태 |
| --- | --- | --- | --- |
| **1** | Claude | 승인 원문을 결정/STATE/NEXT/CURRENT/live에 기록 · 문서 전용 fast-forward commit/push | **완료** |
| **2** | **Codex** | **승인 기록과 최종 구현 허용 파일 확인** | **다음 차례** |
| 3 | Claude | 계약의 **비-UI 구현**을 별도 commit/push | 대기 |
| 4 | Codex | frozen install · format/lint/typecheck · 전체 unit · 독립 build · 전체 Chromium E2E · diff check · forbidden diff · **고객 dist hash** · ports/temp | 대기 |
| 5 | — | **기본 게이트와 분리해 local emulator 게이트를 명시적으로 실행.** 다운로드/설치·포트 강제 해제·타 프로세스 종료가 필요하면 **STOP** | 대기 |

## 6. Codex가 확인할 것 (2단계)

- 승인 원문이 **정본 문서에 그대로** 기록됐는지, **추가·해석이 없는지**
- §3 허용 파일 목록이 **계약 §10과 일치**하고 **초과 확장이 없는지**
- **`firebase.json`·루트 배럴·`admin-read/**`·`apps/**`가 계속 금지로 남았는지**
- **`pnpm-lock.yaml` diff 0 요구**가 명시됐는지
- §4 emulator 경계(**캐시 도구만 · `demo-` 프로젝트 · `.firebaserc` 미사용 · 다운로드 시 STOP**)가 맞는지
- 변경이 **허용 문서 5개**(결정 정본 신규 + STATE/NEXT/CURRENT/live)로 한정됐는지
- **Codex `CONTRACT_PASSED` 기록과 이전 라운드 이력이 보존**됐는지
- 그 뒤 **3단계 구현 착수 승인**

## 7. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 8. 이 승인으로도 열리지 않는 것 / NOT TESTED

- **운영 쓰기 개방** — 실제 UID + orphan 보존/비용/정리 정책 + emulator PASS 후
  **별도 cutover 스펙 + 별도 Founder 승인**.
- **Rules 배포** — 실제 UID 정본 전 차단. ⚠️ 배포하면 `denn-admin.html:740`의 저장이 서버에서
  거부되므로 **배포 순서 자체가 STOP 대상**이다(계약 §9).
- **C6**(Cloud Function/backend) 보류 · **L-4 삭제 부활 해결** 별도 스펙.
- **NOT TESTED/UNCONFIRMED**: 실제 Firebase 프로젝트 동작 전부 · **실제 운영자 UID·계정 실재** ·
  실제 네트워크 지연·단절 · 실기기·다중 기기 · **Auth emulator binary 가용성** ·
  운영 규모 payload · orphan 누적 실제 비용 · `pnpm-workspace.yaml`의 `allowBuilds`(이월).
