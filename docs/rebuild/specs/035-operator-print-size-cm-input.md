# 스펙 035 — 운영자 인쇄 치수(cm) 로컬 입력·검증·canonical 변환

상태: **DONE (Claude)** — 구현 `e9e2af6`, 계약 `d3bed91`, 선행 스펙 034 DONE(`ff7a49a`)

결정 정본: `docs/codex-claude-handoff/decisions/2026-08-10-operator-cm-input-decisions.md`
(Founder O-1~O-8, 구조 N-6~N-9)
선행: 스펙 032(cm 카탈로그 계약), 034(legacy 정규화), 011(UI 프리미티브),
조사 `reviews/2026-07-31-operator-cm-input-ui-investigation.md` §3·§4·§5

## 목표 (WHY)

운영자가 액자 사이즈의 **실물 치수를 직접 입력**하고, 그 값이 카탈로그 계약을 통과하는지
**저장 전에** 확인할 수 있게 한다. 레거시 admin은 무효 입력을 **1 cm로 조용히 저장**하고
**21 cm 기본값을 날조**했으며 **수정 시 cm을 잃었다**(조사 §3) — 새 UI는 그 셋을 재현하지 않는다.

**이번 단위는 저장하지 않는다**(O-1·O-2·N-6). 화면은 "이 값이 계약을 통과하는가"만 답한다.

## 범위 (SCOPE)

**포함**

- `@denn/shared`: 운영자 입력 문자열 → canonical cm 판정 **순수 함수** 1개(N-7·N-8)
- `apps/admin`: 그 함수를 쓰는 **로컬 입력 카드** 1개(폭·높이 + 결과 표시)
- unit(순수 함수 + 컴포넌트 정적 마크업) + Chromium E2E

**제외 (하지 않을 것)**

- **모든 저장·전송**: Firebase·Auth·발행·network·`fetch`·localStorage·IndexedDB·클립보드·다운로드
  — O-1·N-6. admin은 **공개 카탈로그 요청도 계속 0건**이어야 한다(`scaffold.spec.ts:29-34`).
- 사이즈 **목록·선택·편집·삭제**, 카탈로그 로드, `admin/state.json` 읽기/쓰기 — O-8
- `sub` 입력·표시·파생·자동생성 — O-6·N-9
- `aspect` 표시·비교·자동 수정, 이름/`sub`에서의 prefill — N-9·N-10
- 범위 규칙(`> 0`, `<= 500`, all-or-nothing)의 **UI 재구현** — N-7
- `packages/render/**`, `apps/mockup/**`, 목업 앱 UI, lockfile·의존성 변경

## 대상 (WHERE)

| 파일 | 역할 |
| --- | --- |
| `packages/shared/src/catalog/authoring/print-size.ts` | 순수 판정 함수 (신규) |
| `packages/shared/src/catalog/authoring/index.ts` | 배럴 (신규) |
| `packages/shared/src/catalog/authoring/print-size.test.ts` | 계약 고정 (신규) |
| `packages/shared/src/catalog/index.ts` | `export * from "./authoring"` |
| `packages/shared/src/catalog/read.ts` | `MAX_PRINT_CM`을 **export**로 전환(값 변경 없음) |
| `apps/admin/src/PrintSizeCmDraft.tsx` | 입력 카드 (신규) |
| `apps/admin/src/PrintSizeCmDraft.test.tsx` | 정적 마크업 계약 (신규) |
| `apps/admin/src/App.tsx` | 카드 1개 배치 |
| `apps/admin/package.json` | — (의존성 이미 충족: `@denn/shared`, `@denn/ui`) |
| `tests/e2e/admin-print-size.spec.ts` | 실제 브라우저 검증 (신규) |
| `tests/e2e/scaffold.spec.ts` | 기존 admin 셸 기대치가 깨지면 **최소 조정만** |

## 구현 지시 (WHAT / HOW)

### 1. 순수 판정 함수 (`@denn/shared`)

```ts
export type OperatorPrintSizeField = "width" | "height";

export type OperatorPrintSizeIssue =
  | { readonly field: OperatorPrintSizeField; readonly reason: "MISSING" }
  | { readonly field: OperatorPrintSizeField; readonly reason: "NOT_DECIMAL" }
  | { readonly field: OperatorPrintSizeField; readonly reason: "REJECTED_BY_CATALOG" };

export type OperatorPrintSizeResult =
  | { readonly status: "empty" }
  | { readonly status: "ok"; readonly value: FramePrintPhysicalSize }
  | { readonly status: "rejected"; readonly issues: readonly OperatorPrintSizeIssue[] };

export function evaluateOperatorPrintSizeInput(
  widthText: string,
  heightText: string,
): OperatorPrintSizeResult;
```

절차(순서 고정):

1. **trim**. 둘 다 빈 문자열 → `{status:"empty"}` — **오류가 아니다**("아직 인쇄 불가").
2. 각 필드 **표기 검사**: `/^\d+(\.\d+)?$/` 만 통과.
   - 빈 문자열인데 다른 쪽이 채워짐 → `MISSING`
   - 그 밖의 불일치(부호·지수·쉼표·전각 숫자·`21cm` 같은 접미사·공백 포함) → `NOT_DECIMAL`
   - **`parseFloat` 금지**(N-8). 변환은 통과한 문자열에 대해 `Number(text)`로 한다.
3. 표기 오류가 하나라도 있으면 `{status:"rejected", issues}` — **여기서 끝**(계약을 부르지 않는다).
4. 표기 통과분으로 **후보 카탈로그를 조립해 실제 계약을 실행**한다(N-7):

   ```ts
   readLegacyCatalog({ frameSizes: [{ id: "draft", name: "draft",
                                      printWidthCm: w, printHeightCm: h }] })
   ```

   - `ok === false` → 각 error의 `path` 접미사로 필드를 판별해 `REJECTED_BY_CATALOG`
     (`.printWidthCm` → `width`, `.printHeightCm` → `height`). 판정 규칙을 **여기서 다시 쓰지 않는다**.
   - `ok === true` → `projectFramePrintPhysicalSize(document, "draft")`로 **왕복 확인**하고,
     `null`이 아니면 `{status:"ok", value}` — 반환값은 **projection이 낸 값**이지
     우리가 파싱한 숫자를 그대로 돌려주는 것이 아니다.
   - projection이 `null`이거나 실패면 `REJECTED_BY_CATALOG` 두 필드.
5. 후보 객체에는 **`id`/`name`/두 cm 필드만** 넣는다. `sub`·`aspect`·`wcm`/`hcm`·`w`/`h` **금지**(O-6·N-9).
6. 함수는 **순수**하다: 입력 문자열 비변형, network·저장·전역 상태 0, 같은 입력 → 같은 출력.

`read.ts`의 `MAX_PRINT_CM`은 값 변경 없이 `export const`로 바꾸고 배럴에서 공개한다 —
UI 안내 문구가 상수를 **재작성하지 않고 참조**하기 위함이다.

### 2. admin 입력 카드 (`apps/admin`)

- 제목 `액자 인쇄 실물 치수` · 부제/설명에 **저장되지 않음 · 새로고침하면 사라짐**을 명시한다.
- `TextField` 2개: 라벨 `인쇄 폭 (cm)`, `인쇄 높이 (cm)`.
  `inputMode="decimal"`, `autoComplete="off"`, **초기값 `""`**(prefill 0 — N-9).
- 결과 영역은 `role="status"` + `aria-live="polite"`, `data-testid="print-size-result"`.
  - `empty` → `치수 미입력 — 이 사이즈는 아직 인쇄할 수 없습니다.`
  - `rejected` → 해당 `TextField`의 `error`에 **필드별 고정 문구**
    (`MISSING`=`폭과 높이를 함께 입력해야 합니다.` / `NOT_DECIMAL`=`숫자만 입력하세요. 예: 21, 29.7` /
    `REJECTED_BY_CATALOG`=`0 초과 ${MAX_PRINT_CM} 이하만 사용할 수 있습니다.`)
    + 결과 영역에 `카탈로그 계약을 통과하지 못했습니다.`
  - `ok` → `카탈로그 계약 통과` + canonical 조각을 **읽기 전용 `<pre>`** 로 표시
    (`"printWidthCm": 21` / `"printHeightCm": 29.7`), `data-testid="print-size-canonical"`.
- **금지**: `저장`·`주문`·`발행`·`업로드` 문구, 버튼으로 만든 저장 동작, 클립보드 복사,
  값 자동 보정(clamp·반올림·단위 제거), 한쪽 값에서 다른 쪽 계산.
- 색만으로 상태를 알리지 않는다(오류는 텍스트). 상호작용 요소는 44×44 이상(스펙 011 규율).

### 3. 보존 제약 체크 (CLAUDE.md §4)

- 제약 2·3·6(Storage/Firestore/auth): **건드리지 않는다** — 이번 단위에 쓰기·인증이 없다.
- 제약 5(데이터 하위호환): 이 UI는 운영 데이터를 **읽지도 쓰지도 않는다**.
- 제약 9(한국어 UI): 모든 문구 한국어.

## 검증 절차 (VERIFY)

명령(루트): `corepack pnpm install --frozen-lockfile` → `pnpm format:check` → `pnpm lint` →
`pnpm typecheck` → `pnpm test:unit` → `pnpm build` → `pnpm test:e2e` → `pnpm check`

unit — 순수 함수:

- [ ] `("21","29.7")` → `ok`, `{widthCm:21,heightCm:29.7}`
- [ ] `("","")` → `empty` / `("21","")` → `MISSING(height)` / `("","29.7")` → `MISSING(width)`
- [ ] `NOT_DECIMAL`: `"21cm"`, `"abc"`, `"-5"`, `"+5"`, `"1e2"`, `"1,5"`, `"２１"`, `" 21"`,
      `"21."`, `".5"`, `"0x10"`
- [ ] `REJECTED_BY_CATALOG`: `"0"`, `"500.1"`, `"501"` / 경계 `"500"`·`"0.1"`은 `ok`
- [ ] **레거시 재현 금지 회귀**: `"abc"`가 **1 cm로 통과하지 않는다**(O-7) ·
      결과 어디에도 `21`이 **자동으로 등장하지 않는다**(빈 입력에서 `ok`가 나오지 않는다)
- [ ] 순수성: 같은 입력 두 번 → 동일 결과 · 입력 문자열 비변형 · 후보 객체에 `sub`/`aspect` 없음

unit — 컴포넌트(정적 마크업):

- [ ] 초기 렌더에 **값이 비어 있고** 결과 영역이 `미입력` 문구다
- [ ] 두 입력에 `label`이 연결돼 있고 `type`/`inputMode`가 계약대로다
- [ ] 마크업에 `저장`·`주문`·`발행` 문구가 **없다**

E2E(`admin-print-size.spec.ts`, 모바일 320×568 · 데스크톱 1280×800):

- [ ] 정상값 입력 → `카탈로그 계약 통과` + canonical 조각 표시
- [ ] 한쪽만 입력 → 거부 문구, canonical 조각 **없음**
- [ ] `abc` 입력 → 거부, **`1`이 표시되지 않는다**
- [ ] `501` 입력 → 거부
- [ ] 새로고침 → 입력값이 **사라진다**(저장 0)
- [ ] `**/firebasestorage.googleapis.com/**` 요청 **0건**, 그 외 network 요청 0건
- [ ] axe serious/critical **0**, console error **0**, 가로 overflow 0, 컨트롤 44×44

회귀:

- [ ] 기존 unit·E2E 전량 통과(034 완료 시점 대비 신규분만 증가)
- [ ] 고객(`apps/mockup`) `dist` SHA-256 **무변경** — 이번 스펙은 고객 앱을 건드리지 않는다
- [ ] `git diff --check`, forbidden diff 0, ports 4183/4184 미점유, OS temp `denn-e2e-*` 0
- [ ] lockfile diff 0, `packages/render/**`·`apps/mockup/**` diff 0

**완료 정의**: 위가 전부 통과하고 `### DONE (Claude)`에 실제 수치가 기록된 상태.

## 위험 (RISK)

- **운영자가 이 화면을 "저장했다"고 오해할 수 있다.** 그래서 저장 버튼을 만들지 않고, 설명·결과
  문구에 저장 없음을 명시하며, `저장`·`주문` 단어를 마크업에서 **금지**하고 unit으로 고정한다.
- 후보 카탈로그를 실제 read에 넣는 방식은 read 계약이 바뀌면 이 함수의 결과도 바뀐다 — **의도된
  결합**이다(N-7). 반대로 UI가 규칙을 복사하면 조용히 어긋난다.
- `scaffold.spec.ts`가 admin 셸의 현재 모습을 강하게 고정하고 있어 카드 추가로 깨질 수 있다.
  깨지면 **기대치를 최소로만** 조정하고, 무엇을 왜 바꿨는지 DONE에 남긴다.
- 롤백: 이 스펙 커밋만 되돌리면 admin은 스펙 011 데모 셸로 정확히 복귀한다.

---

### DONE (Claude) — 2026-08-10, 커밋 `e9e2af6`

#### 바꾼 파일 (허용 목록 안)

| 파일 | 내용 |
| --- | --- |
| `packages/shared/src/catalog/authoring/print-size.ts` | `evaluateOperatorPrintSizeInput` (신규, 순수) |
| `packages/shared/src/catalog/authoring/index.ts` | 배럴 (신규) |
| `packages/shared/src/catalog/authoring/print-size.test.ts` | 14건 (신규) |
| `packages/shared/src/catalog/index.ts` | `export * from "./authoring"`, `MAX_PRINT_CM` 공개 |
| `packages/shared/src/catalog/read.ts` | `MAX_PRINT_CM`을 `export`로 (값·동작 변경 0) |
| `apps/admin/src/PrintSizeCmDraft.tsx` | 입력 카드 (신규) |
| `apps/admin/src/PrintSizeCmDraft.test.tsx` | 정적 마크업 6건 (신규) |
| `apps/admin/src/App.tsx` | 카드 1개 배치 |
| `tests/e2e/admin-print-size.spec.ts` | Chromium 2 viewport (신규) |
| `tests/e2e/scaffold.spec.ts` | **1줄** — 첫 Tab 대상이 `BUTTON`에서 `INPUT`으로 바뀌어 `["BUTTON","INPUT"]` 허용 |

#### 계약 구현 요지

- 판정은 **계약 실행**이다: 후보 `{id,name,printWidthCm,printHeightCm}` 하나짜리 카탈로그를
  `readLegacyCatalog`에 넣고, 통과하면 `projectFramePrintPhysicalSize`로 **왕복**시킨다.
  반환 cm은 **projection이 낸 값**이지 파싱한 숫자가 아니다. 범위 규칙은 이 파일에 **없다**.
- 표기 검사는 `/^\d+(\.\d+)?$/` 하나다. `"21cm"`·`"abc"`·`"-5"`·`"1e2"`·`"1,5"`·`"２１"`·`".5"`·`"21."`
  전부 `NOT_DECIMAL`이며 **`parseFloat`를 쓰지 않는다**.
- 빈 폼은 `empty`이고 **오류가 아니다**. 한쪽만 채우면 **빈 쪽**이 `MISSING`이다.
- prefill 0 · `sub` 없음 · `aspect` 없음 · 저장·전송·클립보드·다운로드 0.

#### 검증 결과

| 게이트 | 결과 |
| --- | --- |
| frozen install / lockfile diff | PASS / **0** |
| format / lint(`--error-on-warnings`) / typecheck | PASS |
| unit | **1213/1213 PASS** (034 시점 1193 → **+20**) |
| 독립 build | PASS (admin 203.59 kB / gzip 64.81 kB) |
| 전체 Chromium E2E | **131/131 PASS** (034 시점 129 → **+2**) |
| 고객 `dist` SHA-256 (E2E 전후) | **동일** `f86d446d…7bbc09` |
| `pnpm check` | `✓ check passed` |
| `git diff --check` / forbidden diff(`packages/render/**`,`apps/mockup/**`) | 클린 / **0** |
| ports 4183/4184 · OS temp `denn-e2e-*` | **0 / 0** |

E2E가 실제 브라우저에서 확인한 것: 빈 폼 안내 · 정상쌍 canonical 표시 · 반쪽 거부 ·
`abc` 거부(**`1`이 나타나지 않음**) · `501` 거부 · **카드 안에 클릭 가능한 요소 0개** ·
**새로고침 후 값 소멸** · **자기 origin 밖 요청 0건** · axe serious/critical 0 · console error 0 ·
가로 overflow 0.

#### ⚠️ 보고: 고객 번들 **바이트 identity가 바뀌었다** (기능 무변경)

`apps/mockup/dist`의 JS 해시가 `49cae2d3…`(034) → `f86d446d…`(035)로 바뀌었다. 확인한 것:

- 길이 286,220 → **286,192 (−28 byte)**, 공통 prefix 2,126자 뒤부터 **minifier 식별자 배치가 밀렸다**.
- authoring 코드는 고객 번들에 **들어가지 않았다** — `REJECTED_BY_CATALOG`·`NOT_DECIMAL`·
  `MAX_PRINT_CM`·`인쇄 폭` 문자열 **각 0건**(tree-shaking 확인).
- 원인은 `catalog/index.ts`에 배럴 하나가 추가되면서 **모듈 그래프 순서가 바뀐 것**이다.
- 스펙 §검증의 `고객 dist SHA-256 무변경`은 **이 항목만 충족하지 못했다**. E2E **전후** 해시 동일이라는
  본래 불변식(테스트가 dist를 오염시키지 않음)은 유지되고, 고객 E2E 131건은 전부 통과한다.

#### 계약과 다르게 구현한 2가지 (의도적)

1. **canonical 조각을 `<pre>`가 아니라 `<p>` 한 줄로** 냈다. `<pre>`는 줄바꿈하지 않아 320 px에서
   가로 overflow를 만들고, 그 금지 항목이 같은 스펙의 E2E 조건에 있다. 내용·`data-testid`는 동일하다.
2. **`" 21"`(앞뒤 공백)은 유효**하다. 계약 §1 절차 1이 **먼저 trim**하라고 정했으므로 공백은 입력
   표기가 아니라 타이핑이다. 같은 문서 §검증의 `" 21"` → `NOT_DECIMAL` 항목은 절차 1과 모순이라
   절차를 따랐고, unit에 `treats surrounding whitespace as typing`으로 고정했다.

또 하나: 카드에 `저장`이라는 **단어 금지**는 그대로 지킬 수 없다 — 설명 문구가
`저장되지 않으며 새로고침하면 사라집니다.`이기 때문이다. 대신 **저장 어포던스 금지**로 검증한다:
E2E가 카드 안 `button`·`a`·`[role=button]` **0개**, `input` 2개, `주문`·`발행` 문구 0을 확인한다.

#### NOT TESTED / 남는 것

- **저장이 없다.** 운영자는 값을 남길 수 없고, 확인 후 레거시 admin에 직접 입력해야 한다 —
  O-1·O-2의 명시적 결과이며 저장 경로는 O-8의 별도 결정이다.
- 사이즈 목록·선택·편집, `admin/state.json` 읽기/쓰기, 발행: **범위 밖**.
- 실기기(모바일 브라우저) 확인 없음. 자동 게이트는 Chromium 2 viewport뿐이다.
