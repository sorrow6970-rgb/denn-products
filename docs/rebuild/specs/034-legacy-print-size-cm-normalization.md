# 스펙 034 — 레거시 `wcm`/`hcm` 읽기 정규화와 충돌 fail-closed

상태: **READY** — 계약 작성 2026-08-10, 기준 HEAD `f88ab70`

결정 정본: `docs/codex-claude-handoff/decisions/2026-08-10-operator-cm-input-decisions.md`
(Founder O-1~O-8, 구조 N-1~N-10)
선행: 스펙 032(`printWidthCm`/`printHeightCm` 계약), 조사
`reviews/2026-07-31-operator-cm-input-ui-investigation.md` §2·§3

## 목표 (WHY)

레거시 운영자는 실물 치수를 **`wcm`/`hcm`** 에 입력해 왔는데(`denn-admin.html:1698`),
리빌드는 그 값을 `UNKNOWN_FIELD`로 흘리고 `projectFramePrintPhysicalSize`가 `null`을 낸다 =
**운영자가 이미 정확한 치수를 넣어 둔 사이즈도 인쇄가 안 된다**. 이 단위는 그 한 쌍만
**읽는 순간 메모리에서** canonical 필드로 정규화하고, canonical과 legacy가 **서로 다른 값을 주장하면
읽기를 실패**시킨다.

## 범위 (SCOPE)

**포함**

- `frameSizes` 항목의 legacy alias `wcm`/`hcm` 인식(N-2)
- canonical 부재 시 **메모리 승격**(N-5) — 반환 문서에만 반영, 입력 비변형
- canonical 존재 시 **불일치 fatal**(N-4)
- 신규 issue code 3종과 그 unit 고정

**제외 (하지 않을 것)**

- `apps/**`, `packages/render/**`, `packages/firebase/**`, `packages/ui/**` 변경
- 어떤 형태의 **쓰기**(Firebase·파일·localStorage·발행)와 network·live·deploy — O-1
- `wcm`/`hcm` 외의 cm 이름 후보, 이름·`sub`·`label`·`id` 파싱, `w`/`h`·`aspect` 추론 — P-2·N-2
- `projectFramePrintPhysicalSize` 시그니처·동작 변경(정규화가 그 앞에서 끝난다) — N-1
- `aspect` ↔ cm 비율 불일치 자동 수정 — N-10
- `sub` 생성·파싱·변경 — O-6
- lockfile·manifest·의존성 변경

## 대상 (WHERE)

| 파일 | 역할 |
| --- | --- |
| `packages/shared/src/catalog/read.ts` | allowlist + 정규화·충돌 검사 |
| `packages/shared/src/catalog/types.ts` | `CatalogIssueCode` 3종 추가 |
| `packages/shared/src/catalog/read.test.ts` | 계약 고정 |
| `packages/shared/src/catalog/fixtures/index.ts` | 합성 fixture |
| `packages/shared/src/catalog/preview/project.test.ts` | legacy-only 사이즈가 projection에서 cm을 낸다 |
| 이 스펙 문서 · `CURRENT.md` | 기록 |

근거 라인: `read.ts:83-93`(frameSizes allowlist), `:275-278`(항목 검증 훅),
`:340-363`(`validatePrintSizeCm`), `:190-194`(`recordUnknown`), `:220`(JSON-safe 복제).

## 구현 지시 (WHAT / HOW)

### 1. issue code 추가 (`types.ts`)

```ts
// fatal
| "CONFLICTING_PRINT_SIZE"
// warning
| "LEGACY_PRINT_SIZE_NORMALIZED"
| "LEGACY_PRINT_SIZE_IGNORED"
```

주석으로 fatal/warning 구분과 "path는 언제나 legacy 쪽(`.wcm`/`.hcm`)"을 남긴다.

### 2. allowlist (`read.ts`)

`ITEM_KNOWN.frameSizes`에 `"wcm"`, `"hcm"`을 추가한다. 주석에 **왜 이 두 개만인지**(레거시 admin이
실제로 저장하는 유일한 쌍) 와 **다른 6쌍·이름 파싱은 계속 금지**임을 적는다.

### 3. 정규화·충돌 함수

`validatePrintSizeCm` 바로 뒤에 `normalizeLegacyPrintSizeCm(item, path, fatals, warnings)`를 만들고,
항목 루프(`read.ts:275-278`)에서 **`validatePrintSizeCm` 다음에** 호출한다. 호출 시점의
`fatals.length`를 비교해 **canonical 검증이 방금 fatal을 냈으면 즉시 return**한다(N-3).

동작:

1. `wcm`·`hcm`이 **둘 다 `undefined`** → 아무 것도 하지 않는다.
2. canonical 두 필드가 **둘 다 존재**(= 032 검증을 통과한 정상 쌍):
   - `wcm !== undefined && wcm !== printWidthCm` → fatal `CONFLICTING_PRINT_SIZE` at `${path}.wcm`
   - `hcm !== undefined && hcm !== printHeightCm` → fatal `CONFLICTING_PRINT_SIZE` at `${path}.hcm`
   - 비교는 **엄격 `===`**. 허용오차·반올림·비율 비교 **금지**(N-4).
3. canonical 두 필드가 **둘 다 부재**:
   - `wcm`·`hcm`이 **둘 다** number·finite·`> 0`·`<= 500`
     → `item.printWidthCm = wcm`, `item.printHeightCm = hcm`(**복제본에만**) +
       warning `LEGACY_PRINT_SIZE_NORMALIZED` at `${path}.wcm` **한 건**
   - 그 밖(한쪽만·타입 아님·비유한·`<= 0`·`> 500`)
     → **승격 없음** + warning `LEGACY_PRINT_SIZE_IGNORED` at **문제가 있는 각 path**
       (한쪽만이면 **없는 쪽** path 하나) — **fatal이 아니다**(N-5의 근거를 주석으로 남긴다)
4. 각 필드는 **정확히 한 번만 읽는다**(drifting getter 방어 — 032가 이미 택한 규율).

범위 상수는 032의 `MAX_PRINT_CM`을 **재사용**한다. 새 상수를 만들지 않는다.

### 4. 계약 불변식 (구현이 반드시 만족)

- **입력 비변형**: 승격은 `cloneJsonSafe` 결과에만 쓴다. 호출자가 넘긴 객체는 **바뀌지 않는다**(O-5).
- **`wcm`/`hcm` 보존**: 승격 후에도 `document.data.frameSizes[i].wcm`은 **원값 그대로** 남는다.
- **멱등**: `readLegacyCatalog(read(x).document)`가 **다시 통과**한다(승격 결과 canonical == legacy라
  N-4 충돌이 나지 않는다). 두 번째 read에서는 `LEGACY_PRINT_SIZE_NORMALIZED`가 나오지 않는다.
- **결정성**: 같은 입력 두 번 read → 문서·warnings·errors가 동일.
- **원문 비노출**: 어떤 issue의 `path`에도 raw 수치·이름·id가 들어가지 않는다.

## 검증 절차 (VERIFY)

명령(루트): `corepack pnpm install --frozen-lockfile` → `pnpm format:check` →
`pnpm lint` → `pnpm typecheck` → `pnpm test:unit` → `pnpm build` → `pnpm test:e2e` → `pnpm check`

신규 unit(최소):

- [ ] legacy 쌍만 존재 → 승격, `projectFramePrintPhysicalSize`가 `{widthCm,heightCm}` 반환
- [ ] legacy·canonical 동일값 공존 → 통과, 경고 0(`NORMALIZED` 없음)
- [ ] `wcm`만 다름 / `hcm`만 다름 / 둘 다 다름 → `CONFLICTING_PRINT_SIZE`, path는 legacy 쪽
- [ ] canonical 정상 + legacy 한쪽만 존재하고 값이 같음 → 통과
- [ ] canonical 반쪽(032 fatal) + legacy 존재 → **032 fatal만**, 충돌 코드 없음(N-3 순서)
- [ ] legacy 한쪽만 / `0` / 음수 / `NaN`·`Infinity`(JSON-safe 단계에서 걸리는 경우 포함) /
      `500` 초과 / 문자열 `"21"` → 승격 없음 + `LEGACY_PRINT_SIZE_IGNORED`, read는 `ok`
- [ ] legacy 부재 + canonical 부재 → 경고 0, projection `null`
- [ ] `aspect`·`sub`·`name`·`w`/`h`가 있어도 cm으로 쓰이지 않음
- [ ] 입력 비변형(원본 객체 깊은 비교) · `wcm` 보존 · 멱등 · 결정성 · hostile getter/revoked Proxy
- [ ] `wcm`/`hcm`이 더 이상 `UNKNOWN_FIELD`/`extensions`에 들어가지 않음(기존 기대치 회귀 확인)

회귀:

- [ ] 기존 unit 전량 통과(스펙 033 시점 **1174**에서 신규분만 증가)
- [ ] 전체 Chromium E2E 통과, 고객 `dist` SHA-256 E2E 전후 동일
- [ ] `git diff --check`, forbidden diff 0, ports 4183/4184 미점유, OS temp `denn-e2e-*` 0
- [ ] lockfile diff 0, `apps/**`·`packages/render/**` diff 0

**완료 정의**: 위가 전부 통과하고, 스펙 하단 `### DONE (Claude)`에 실제 수치가 기록된 상태.

## 위험 (RISK)

- **★ 충돌 fatal은 카탈로그 전체 read 실패다.** 실제 발행본에 `printWidthCm`과 `wcm`이 **다른 값으로**
  공존하면 고객 앱이 카탈로그를 못 읽는다. O-4의 명시 승인 사항이고, 032가 canonical 반쪽에 대해
  이미 택한 규율과 동일하다. 실제 발행본 내용은 **NOT VERIFIED**(실제 network 금지) — 현재
  리빌드가 쓰는 필드는 `printWidthCm`뿐이고 그 필드를 쓰는 쓰기 경로가 **아직 없으므로**
  공존 자체가 현재로선 발생 불가에 가깝다.
- 승격 실패를 warning으로 둔 선택(N-5)은 **인쇄 차단은 유지**하되 카탈로그 가용성을 지킨다.
  뒤집으려면 fatal로 올리면 되고, 그때 unit 한 건만 바뀐다.
- 롤백: 이 스펙의 커밋만 되돌리면 read는 032 시점 동작(=`wcm` 무시)으로 정확히 돌아간다.
