# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`
active_unit: `spec-037-admin-write-c5-emulator-implementation`
기준 `d4d42d6` → **보완 커밋 `ead06ab`** (구현 `d83aee9` + 보완 라운드 1)
계약: **`9805c26`**(Codex `CONTRACT_PASSED`) · 권한: **`4f2ab0b`** + 범위 검토 **`f8590e4`**
다음 주체: **Codex** — **보완 라운드 1 재검증**(독립 게이트 + emulator 게이트 명시 실행)

**스펙 037 C5 비-UI 구현 + Codex 지적 3건 보완이 들어갔다.** 계약 허용 목록 안에서만 작업했고 UI 연결은 없다.

> **★ 이 파일에는 현재 Claude가 수행할 작업 항목이 없다.**
> Codex가 독립 검증 결과와 다음 지시를 남기기 전까지 새 작업을 시작하지 않는다.

## 1. 구현 결과 (실측)

| 게이트 | 결과 |
| --- | --- |
| `pnpm install --frozen-lockfile` | **PASS** · **lockfile diff 0**(신규 의존성 0) |
| `pnpm check` | **PASS**(format · lint · typecheck · unit · build) |
| unit | **1318/1318** (구현 시점 1305 → **+13**, 기준 1271 → **+47**) |
| Chromium E2E | **134/134** (무회귀) |
| **고객 번들** | **★ byte-identical** — `apps/mockup/dist/assets/index-W_cZpbdf.js` · **287,741 bytes** · `fc7660e5730262888ea896a3ba5a9494c8ecb61e4d2e0a972849e72d0abf0685` |
| 고객 번들 유출 문자열 | `admin-write`·`rebuildAdminState`·`rebuild-admin-state`·`firebase/firestore` **0건** |
| **emulator 게이트** | **★ 실제 Rules로 10/10 PASS**, 기본 게이트와 분리 실행 |
| `git diff --check` | **PASS** |
| ports 4183/4184 · 8080/9099/9199 | 전후 **free**, 디버그 로그 산출물 0 |

## 1b. 보완 라운드 1에서 고친 3건 (`ead06ab`)

| # | 교정 |
| --- | --- |
| **1** | **`save()`가 쓰기 전에 payload를 정본으로 검증한다.** `expectedBase` 검증 뒤·UUID·업로드 전에 `readLegacyCatalog`로 검증하고, invalid이면 **`WRITE_INVALID_INPUT` + UUID·Storage·Firestore 호출 0**. 업로드는 **검증된 `CatalogDocumentV1`을 직렬화**한다(caller 객체 아님 → hostile getter가 바이트를 바꿔치기할 수 없다). **이유**: 타입은 컴파일 타임 주장일 뿐이고 객체는 **불변**이라 읽을 수 없는 payload가 head에 영구히 앉는다 |
| **2** | **Firebase app 소유권 명시.** 스펙 036이 소유한 **기본 app을 재사용**하고 **중복 `initializeApp` 0**, **`appName` 옵션 제거**(named app은 자기 auth 상태를 따로 들어 운영자가 로그인한 적 없는 세션으로 쓰기가 나갈 수 있다). 기존 app config가 **키 단위로 다르면 fail-closed**. **`admin-read/**` 무수정** |
| **3** | **emulator 옵션은 `demo-` 프로젝트에서만.** `projectId` 접두를 **SDK 초기화 전**(dynamic import보다 앞)에 검사하고 non-demo면 **모든 SDK 진입점 호출 0**으로 거부 |

**신규 `sdk-facade.test.ts`**(Firebase 모듈 mock): app 재사용 · named app 0 · 키별 불일치 fail-closed ·
Auth/Firestore/Storage 각 1회 · **non-demo + emulator → 모든 진입점 0회** · demo면 connect 3종 ·
emulator 미지정이면 connect 0.

## 2. 바뀐 파일 (전부 허용 목록 안)

```
packages/firebase/src/admin-write/**   신규 9파일 (constants·types·errors·head·facade·
                                       write-port·sdk-facade·index·emulator-env)
packages/firebase/package.json         ./admin-write 서브패스 export
storage.rules / firestore.rules        계약 목표 상태 · placeholder UID · 배포 0
firebase.emulator.json                 신규 local-only
storage.emulator.rules / firestore.emulator.rules   합성 UID만 다름
vitest.config.ts / vitest.emulator.config.ts / package.json
.gitignore                             A-12 · !firebase.emulator.json 한 줄
scripts/check.mjs                      A-13 · BIOME_TARGETS에 파일명 1개
```

**무변경**: `firebase.json` · 루트 배럴 `packages/firebase/src/index.ts` ·
`packages/firebase/src/admin-read/**` · `apps/**` · `.firebaserc` · `pnpm-lock.yaml`.

> **보완 라운드 1에서 바뀐 파일은 4개뿐**: `write-port.ts` · `sdk-facade.ts` ·
> `admin-write.test.ts` · **`sdk-facade.test.ts`(신규)**.
> **Rules·emulator config·`apps/**`·`admin-read/**`·manifest·lockfile·`firebase.json`·
> `.firebaserc`·`vitest*.config.ts`·`scripts/check.mjs`·`.gitignore`는 이번 라운드에 무변경이다.**

## 3. Codex가 확인할 것

- **4단계 독립 게이트**: frozen install · format/lint/typecheck · 전체 unit · 독립 build ·
  전체 Chromium E2E · `git diff --check` · **금지 경로 diff 0** · **고객 dist hash** · ports/temp
- 변경이 **§2 허용 목록**을 벗어나지 않았는지, 특히 `firebase.json`·루트 배럴·`admin-read/**`·`apps/**` 무변경
- **`pnpm-lock.yaml` diff 0**
- 배포 대상 Rules에 **UNCONFIRMED placeholder가 남아 있는지**(배포 불가 상태 유지)
- Rules 사본이 **UID 라인만 다른지**(unit test가 고정하지만 독립 확인)
- **5단계 emulator 게이트**를 기본 게이트와 **분리해 명시 실행**
  (`--config firebase.emulator.json` + `--project demo-denn-emulator`).
  **다운로드·설치·포트 강제 해제·타 프로세스 종료가 필요하면 STOP**
- 그 뒤 **구현 승인 여부 판단**

## 4. 계속 금지

**`apps/**`와 모든 UI 연결 · 저장 버튼 · 실제 운영자 UID 추측·기록 ·
실제 Firebase project·운영 bucket/data·live network · Rules·Hosting 배포 · 운영 쓰기 활성화 ·
`published/state.json` 발행 · legacy `admin/state.json` 공유 쓰기 · orphan 삭제·자동 정리 ·
tombstone·자동 merge·L-4 해결 · 신규 의존성·도구/binary 다운로드·설치 ·
`firebase.json`·루트 배럴·`admin-read/**`·`.firebaserc` 수정 ·
force push·merge·rebase·`reset --hard`·broad delete · 자동화·반복 작업 생성.**

⚠️ **Rules는 편집만 했고 배포하지 않았다.** 실제 UID 정본 전 배포 금지이며, 배포하면
`denn-admin.html:740`의 저장이 서버에서 거부되므로 **배포 순서 자체가 STOP 대상**이다(계약 §9).

## 5. 보호 대상 (수정·삭제·restore·checkout·stage·commit 금지)

- `docs/rebuild/design/taste-v2/**` — **Founder/사용자 소유의 별도 작업**
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`

## 6. 경계 · NOT TESTED

- **합성 fake는 서버 Rules 원자성을 증명하지 않고, emulator는 앱 오류 분기 전체를 증명하지 않는다.**
  callback 재실행과 commit outcome unknown은 **결정적·비파괴적 seam이 없어 fake 전용**이며
  emulator 증명이라고 주장하지 않는다.
- **NOT TESTED / UNCONFIRMED**: 실제 Firebase 프로젝트 동작 전부(실제 Rules 배포·거부, 실제 bucket,
  운영 데이터) · **실제 운영자 UID와 계정 실재·로그인** · 실제 네트워크 지연·단절에서의 거동 ·
  실기기·다중 기기 동시 편집 · 운영 규모 payload · orphan 누적 실제 비용 ·
  **L-4 삭제 부활**(범위 밖) · `pnpm-workspace.yaml`의 `allowBuilds`(이월).
- **운영 쓰기 개방**은 **실제 UID + orphan 보존/비용/정리 정책 + emulator PASS**가 전부 확인된 뒤
  **별도 cutover 스펙 + 별도 Founder 승인**에서만 다룬다.
