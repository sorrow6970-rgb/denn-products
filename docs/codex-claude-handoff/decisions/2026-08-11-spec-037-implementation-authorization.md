# 결정 (정본) — 스펙 037 최종 계약 승인 + 로컬 비-UI 구현/검증 착수 승인

승인: **Founder, 2026-08-11** · 기준 커밋 `2f0ca7d` · 브랜치 `rebuild/modern-studio`
승인 대상 계약: **`9805c26`**(보완 라운드 3, Codex **`CONTRACT_PASSED`**) + `2f0ca7d`(상태 동기화)
계약 정본: `docs/rebuild/specs/037-admin-write-c5-emulator-contract.md`
선행 정본: `decisions/2026-08-11-admin-write-atomicity-decisions.md`(G-1~G-5) ·
`decisions/2026-08-10-admin-auth-write-boundary-decisions.md`(F-A~F-E)

> **이 문서가 스펙 037 구현 착수 권한의 정본이다.**
> 이 문서화 라운드에서 제품 코드·Rules·config·test·lockfile 변경은 **0**이며,
> 실제 Firebase/network/live/**emulator 실행**/운영 데이터 접근도 **0**이다.
> **구현은 아직 시작하지 않았다** — `NEXT_CLAUDE_PROMPT.md` §3의 순서상
> **Codex가 이 승인 기록과 최종 허용 파일을 확인한 뒤**에 착수한다.

> ## ★ 승인 유효성 확정 + 허용 범위 검토 결과 (2026-08-11 추가)
>
> **Founder가 `4f2ab0b`의 승인이 Claude Code에 직접 전달한 실제 승인임을 확인했고,
> 이를 유효한 승인으로 확정했다.** 이어서 **다음 구현 허용 범위 검토**를 지시했고, 그 결과가 §3.1~§3.3이다.
> 검토는 **읽기 전용**으로 수행했고 저장소 파일 변경·emulator 실행·network 접근은 **0**이었다.
>
> **검토에서 실질적 공백 2건이 나왔고, Founder가 각각 최소 범위 확장을 승인했다**(§3.2).
> **그 2건을 포함해도 이번 단계는 여전히 로컬 비-UI 구현·검증까지이며, §2의 금지 항목은 하나도 열리지 않는다.**

---

## 0. 승인 원문 (Founder, 2026-08-11)

> Founder로서 스펙 037 최종 C5 계약 9805c26을 승인하고, 계약에 명시된 로컬 비-UI 구현과 검증
> 착수를 승인한다. 허용 범위는 admin-write port와 합성 fake, 배포하지 않는 storage/firestore Rules
> 목표 파일, firebase.emulator.json과 emulator 전용 Rules 사본, opt-in unit/emulator 테스트 및
> demo-denn-emulator 로컬 검증까지다. apps/UI 연결, 실제 UID 추측, 실제 Firebase/network/live/운영
> 데이터, Rules·Hosting 배포, 운영 쓰기, published 발행, legacy 공유 쓰기, orphan 삭제·자동 정리,
> 신규 의존성·다운로드·설치는 승인하지 않는다. 보호 대상은 건드리지 말고 자동화는 만들지 마.

`Automation/NEXT_CLAUDE_PROMPT.md` §2의 복사 가능한 문구와 **일치한다.**

---

## 1. 승인된 것

| # | 항목 |
| --- | --- |
| **A-1** | **스펙 037 최종 C5 계약 `9805c26` 승인** |
| **A-2** | **계약에 명시된 로컬 비-UI 구현과 검증 착수 승인** |
| **A-3** | `packages/firebase/src/admin-write/**` — **write port + 합성 fake** |
| **A-4** | `packages/firebase/package.json` — **`./admin-write` 서브패스 export** |
| **A-5** | **배포하지 않는** `storage.rules` / `firestore.rules` **목표 파일**(계약 §4.2·§4.4) — 실제 UID는 **UNCONFIRMED placeholder만**, **파일 편집만 허용하고 배포 금지** |
| **A-6** | **`firebase.emulator.json`** 신규 local-only config |
| **A-7** | **emulator 전용 Storage/Firestore Rules 사본**(합성 UID만) |
| **A-8** | `vitest.config.ts` · `vitest.emulator.config.ts` · `package.json`의 **opt-in emulator test 명령** |
| **A-9** | `*.emulator.test.ts` 및 관련 **unit/fake 테스트** |
| **A-10** | **기존에 캐시된 도구만** 이용한 **`demo-denn-emulator` 로컬 emulator 검증** |
| **A-11** | 계약 / STATE / NEXT / CURRENT / live / handoff **종료 문서** |

## 2. 승인되지 **않은** 것 (명시적 금지)

- **`apps/**`와 모든 UI 연결** — 저장 버튼, admin 화면 연결, 실제 고객/운영 경로
- **실제 운영자 UID 추측·기록**
- **실제 Firebase project · 운영 bucket/data · live network**
- **Rules / Hosting 배포**, **운영 쓰기 활성화**, **`published/state.json` 발행**
- **legacy `admin/state.json` 공유 쓰기**
- **orphan 삭제 / 자동 정리 / client delete 권한**
- **tombstone / 자동 merge / L-4 해결**
- **신규 의존성 · 도구·binary 다운로드/설치**
- **실제 프로젝트 id 또는 `.firebaserc` 사용**
- **자동화나 반복 작업 생성**

## 3. ★ 승인 범위와 계약 §10 허용 파일의 대조 (구현 시 유일한 목록)

계약 §10의 허용 파일과 승인 범위는 **일치**한다. 구현은 아래 목록 **밖으로 나가지 않는다.**

```
packages/firebase/src/admin-write/**          A-3   (신규)
packages/firebase/package.json                A-4   (./admin-write export 추가)
storage.rules                                 A-5   (§4.2 목표 상태 · placeholder UID · 배포 금지)
firestore.rules                               A-5   (§4.4 목표 상태 · placeholder UID · 배포 금지)
firebase.emulator.json                        A-6   (신규 · local-only)
<emulator 전용 storage/firestore rules 사본>   A-7   (합성 UID만)
vitest.config.ts                              A-8   (*.emulator.test.ts 제외 추가)
vitest.emulator.config.ts                     A-8   (신규)
package.json                                  A-8   (test:emulator 스크립트 + format/lint 대상 추가)
**/*.emulator.test.ts, 관련 unit/fake 테스트     A-9   (신규)
스펙 037 handoff / CURRENT / live / STATE / NEXT  A-11
─── 2026-08-11 Founder 승인 범위 확장 (§3.2) ───────────────────────────
.gitignore                                    A-12  (`!firebase.emulator.json` 한 줄만)
scripts/check.mjs                             A-13  (BIOME_TARGETS에 파일명 1개만)
```

**여전히 금지(계약 §10과 동일)**: **`firebase.json`** · **`packages/firebase/src/index.ts` 루트 배럴** ·
**`packages/firebase/src/admin-read/**`** · **`apps/**`** · `packages/render/**` ·
`packages/shared/**` · `.firebaserc` · 실제 `.env` · legacy HTML.

**`pnpm-lock.yaml`은 변경이 없어야 한다** — 신규 의존성이 승인되지 않았으므로
`pnpm install --frozen-lockfile`의 lockfile diff가 **0**이어야 한다. 변경이 필요해지면 **STOP**이다.

### 3.1 검토 결과 — 막힘 없이 열리는 항목 (읽기 전용 실측)

| 항목 | 확인 결과 |
| --- | --- |
| `packages/firebase/src/admin-write/**` | **디렉터리 없음**(현재 `admin-read`/`public-catalog`/`public-images`/`index.ts`만), **저장소 전체에 `admin-write` 참조 0건** → 이름 충돌 없음 |
| 자동 typecheck | `packages/firebase/tsconfig.json`의 `include: ["src"]` → **`admin-write/**`와 `*.emulator.test.ts`가 자동 포함**된다 |
| 자동 format/lint | `biome.json`의 `files.includes`에 `packages/**/src/**/*.{ts,tsx}` → **소스와 emulator 테스트가 자동 대상** |
| `./admin-write` export | 기존 `./admin-read` 항목과 **동일 패턴**(`types` + `default`) — 새 규약 불필요 |
| `storage.rules`·`firestore.rules` | **추적 중이며 gitignore 영향 없음** → 편집 가능(배포는 계속 금지) |
| emulator 전용 rules 사본(`*.rules`) | **gitignore에 걸리지 않는다**(`git check-ignore` 확인) |
| `vitest.config.ts` exclude | **반드시 필요**하다 — 기본 `include`의 `packages/**/src/**/*.test.{ts,tsx}`가 **`*.emulator.test.ts`도 매칭**한다(`*.live.test.ts`와 같은 이유) |
| emulator SDK API | **`connectAuthEmulator` · `connectFirestoreEmulator` · `connectStorageEmulator` 가 설치된 SDK에 전부 존재** → **신규 의존성 0** |
| emulator 도구 | Java `21.0.11 LTS` · firebase-tools 전역 `15.22.4` · Firestore/Storage-rules-runtime/UI jar **캐시됨** · 필요한 포트 **전부 free** |

### 3.2 ★★ 검토에서 나온 공백 2건 — Founder가 최소 범위 확장을 승인함

**공백 1 — `firebase.emulator.json`이 조용히 gitignore된다.**

`.gitignore:2`가 `*.json`이고 예외는 `package.json`·`tsconfig*.json`·`biome.json`뿐이다.
`git check-ignore -v firebase.emulator.json` → **`.gitignore:2:*.json`**.
`firebase.json`·`.firebaserc`가 멀쩡한 것은 **이미 추적 중이라서**일 뿐이다(gitignore는 untracked에만 적용).
→ 그대로 두면 **config가 커밋되지 않아 Codex와 다른 환경에서 emulator 게이트를 재현할 수 없다.**

**결정(A-12)**: **`.gitignore`에 `!firebase.emulator.json` 한 줄만 추가한다.**
`git add -f`도 동작하지만 파일이 계속 ignored 상태로 남아 `git clean -X`에 지워지고
gitignore를 존중하는 도구가 건너뛴다. 무엇보다 **`.gitignore:7`의 주석 자체가
"리빌드 설정 JSON은 정상 추적 … git add -f 불필요"** 라고 밝히고 있어, 예외 한 줄이 그 의도와 일치한다.

**공백 2 — `vitest.emulator.config.ts`가 format/lint 게이트를 조용히 건너뛴다.**

`scripts/check.mjs:22-30`의 `BIOME_TARGETS`와 루트 `package.json`의 `format:check`/`lint`가
**config 파일을 명시적으로 열거**한다(`vitest.config.ts`·`vitest.live.config.ts`·
`playwright.config.ts`·`playwright.live.config.ts`). 새 root config는 그 목록에 없다.
`biome.json`의 `includes`에 `"*.ts"`가 있지만 **스크립트가 경로를 명시로 넘기므로 무효**다.
→ **실패가 아니라 스킵**이라 게이트는 통과하는데 검사만 빠진다 — 더 나쁜 형태다.

**결정(A-13)**: **`scripts/check.mjs`의 `BIOME_TARGETS`에 `vitest.emulator.config.ts` 한 개만 추가**하고,
루트 `package.json`의 `format:check`·`lint`에도 같은 파일명을 추가한다(`package.json`은 이미 A-8 범위).

### 3.3 범위 확장의 경계

- **두 확장 모두 기계적·비제품 변경이며 한 줄씩이다.** 새 동작을 만들지 않는다.
- **§2의 금지 항목은 하나도 열리지 않는다** — `apps/**` · 실제 UID · 실제 Firebase/network/live ·
  Rules/Hosting 배포 · 운영 쓰기 · 발행 · legacy 공유 쓰기 · orphan 삭제 · 신규 의존성·다운로드·설치는 **그대로 금지**다.
- **`firebase.json`·루트 배럴·`admin-read/**`·`.firebaserc`도 그대로 금지**다.
- 확장 후에도 **`pnpm-lock.yaml` diff 0** 요구는 유지된다.

## 4. ★ emulator 실행 조건 (A-10의 정확한 경계)

- **기존에 캐시된 도구만** 쓴다 — 2026-08-11 읽기 전용 확인 기준
  **Java `openjdk 21.0.11 LTS`** · **firebase-tools 전역 `15.22.4`**(저장소 의존성 아님) ·
  **`cloud-firestore-emulator-v1.21.0.jar`** · **`cloud-storage-rules-runtime-v1.1.3.jar`** ·
  **`ui-v1.15.0`** 캐시됨.
- 실행은 **`--config firebase.emulator.json` 과 `--project demo-denn-emulator` 를 모두** 포함한다.
- **emulator host 환경변수가 없거나 project id가 `demo-` 접두가 아니면 테스트는 시작 전에 실패한다.**
- **`.firebaserc`는 쓰지도 수정하지도 않는다.**
- **다운로드·설치·신규 의존성·포트 강제 해제·타 프로세스 종료가 필요해지면 실행하지 말고 STOP**한다
  (계약 §7.6).
- ⚠️ **Auth emulator binary 가용성은 UNCONFIRMED**다. **첫 실행에서 다운로드를 시도하면 즉시 STOP.**

## 5. 승인 후 순서 (NEXT §3 — 이 문서는 1단계다)

| 단계 | 주체 | 내용 | 상태 |
| --- | --- | --- | --- |
| **1** | **Claude** | **Founder 승인 원문을 결정/STATE/NEXT/CURRENT/live에 기록해 문서 전용 fast-forward commit/push** | **이 커밋에서 완료** |
| **2** | **Codex** | **승인 기록과 최종 구현 허용 파일 확인** | **다음 차례** |
| 3 | Claude | 계약의 **비-UI 구현**을 별도 commit/push | 대기 |
| 4 | Codex | frozen install · format/lint/typecheck · 전체 unit · 독립 build · 전체 Chromium E2E · diff check · forbidden diff · **고객 dist hash** · ports/temp 검증 | 대기 |
| 5 | — | **기본 게이트와 분리해 local emulator 게이트를 명시적으로 실행.** 다운로드/설치·포트 강제 해제·타 프로세스 종료가 필요하면 **STOP** | 대기 |

> **★ 2단계 때문에 이번 턴에는 구현을 시작하지 않는다.** 승인은 났지만
> **순서상 Codex의 허용 파일 확인이 먼저**다.

## 6. 이 승인으로도 열리지 않는 것

- **운영 쓰기 개방** — **실제 UID + orphan 보존/비용/정리 정책 + emulator PASS**가 모두
  확인된 뒤 **별도 cutover 스펙 + 별도 Founder 승인**(계약 §9·G-4·G-5).
- **Rules 배포** — **실제 UID 정본** 제공 전 차단(G-1).
  ⚠️ 배포 시 `denn-admin.html:740`의 저장이 서버에서 거부되므로 **배포 순서 자체가 STOP 대상**이다(계약 §9).
- **C6**(Cloud Function/backend) — 예비 대안 보류(G-3).
- **L-4 삭제 부활 해결** — 별도 후속 스펙(계약 §8).

## 7. UNCONFIRMED / NOT TESTED (승인으로 바뀌지 않는다)

실제 Firebase 프로젝트 동작 전부(실제 Rules 배포·거부, 실제 bucket, 운영 데이터) ·
**실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절에서의 거동
(emulator는 로컬이라 타이밍이 다르다) · 실기기·다중 기기 동시 편집 ·
**Auth emulator binary 가용성** · 운영 규모 payload · orphan 누적의 실제 비용 ·
`pnpm-workspace.yaml`의 `allowBuilds`(이월, 미해결).

## 8. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

**force push · merge · rebase · `reset --hard` · broad delete · 사용자 변경 복원 ·
타 프로세스 종료 · 자동화 생성 하지 않는다.**
