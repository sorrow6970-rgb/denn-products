# 스펙 032 — 액자 인쇄 물리 치수 카탈로그 계약

상태: **DONE** (`COMMITTED`) — 구현 `c10e7a6`, Codex 독립 검증 통과 (2026-07-31)

## 목적

액자 인쇄 해상도가 사이즈 이름이나 논리 `w/h` 추측에 의존하지 않도록, 카탈로그 V1
`frameSizes[]`에 명시적인 실물 치수(cm)를 추가한다. 이번 단위는 순수 카탈로그 read/projection
계약만 구현한다. 운영자 입력 UI와 실제 print/export는 후속 분리 스펙이다.

## Founder·Codex 확정

- P-1 액자만 우선하며 케이스 인쇄는 별도다.
- P-2 이름·label·sub·id 파싱과 `w/h` 추측을 금지한다.
- 필드 이름은 `printWidthCm`·`printHeightCm`으로 고정한다.
- 두 필드는 함께 존재해야 하며 각각 finite, `> 0`, `<= 500`이어야 한다.
- 둘 중 하나만 있거나 범위 밖이면 catalog read를 `INVALID_NUMBER`로 fail-closed한다.
- 필드가 둘 다 없는 기존 카탈로그는 계속 읽을 수 있지만 인쇄 가능 치수 projection은 `null`이다.
- projection은 raw item이나 이름을 반환하지 않고 `{widthCm,heightCm}` 또는 `null`만 반환한다.
- 입력 비변형, JSON-safe, 결정성, hostile getter/Proxy 안전 실패와 원문 비노출 규율을 유지한다.

## 공개 계약

`@denn/shared`에 다음 최소 API를 추가한다.

```ts
interface FramePrintPhysicalSize {
  readonly widthCm: number;
  readonly heightCm: number;
}

function projectFramePrintPhysicalSize(
  document: CatalogDocumentV1,
  frameSizeId: string,
): ProjectionResult<FramePrintPhysicalSize | null>;
```

- ID 조회는 기존 preview projection의 안전한 lookup 규율을 재사용한다.
- 중복·누락·malformed ID는 기존 식별정보 없는 projection 오류 체계를 따른다.
- 이름·sub·label·key·aspect에서 치수를 추론하지 않는다.
- `aspect`와 cm 비율이 다르더라도 이번 단위에서 자동 수정하지 않고 진단 후보로만 남긴다.

## 허용 파일

- `packages/shared/src/catalog/read.ts`
- `packages/shared/src/catalog/read.test.ts`
- `packages/shared/src/catalog/types.ts`
- `packages/shared/src/catalog/fixtures/index.ts`
- `packages/shared/src/catalog/preview/types.ts`
- `packages/shared/src/catalog/preview/project.ts`
- `packages/shared/src/catalog/preview/project.test.ts`
- `packages/shared/src/catalog/preview/index.ts`
- 필요 시 `packages/shared/src/catalog/index.ts`, `packages/shared/src/index.ts`, 해당 export test
- 이 spec과 관련 handoff/CURRENT/live/Automation 문서

## 금지 범위

- `apps/admin/**`, `apps/mockup/**`, `packages/render/**`, Firebase/network/live/deploy
- 실제 print/export, PNG 생성, 주문 payload, 이름 파싱, fallback 치수
- lockfile·manifest·의존성 변경

## 검증

- frozen install과 lockfile diff 0
- format, lint, typecheck, unit, 독립 build, 전체 Chromium E2E
- 기존 카탈로그 무회귀와 신규 unit:
  - 정상 cm 쌍
  - 둘 다 없음 → `null`
  - 한쪽만 존재, 0, 음수, NaN/Infinity, 500 초과 → fail-closed
  - 이름에 `21x29.7cm`가 있어도 필드 없으면 `null`
  - `w/h`가 있어도 cm로 사용하지 않음
  - 입력 비변형·결정성·hostile getter/Proxy·오류 원문 비노출
- `git diff --check`, forbidden diff 0, ports 4183/4184, OS temp staging

## 후속 순서

1. 본 스펙 완료
2. 운영자용 cm 입력·검증·저장 UI 스펙
3. 액자 print/export 스펙: 승인된 preview plan + detached HTMLCanvasElement의 uniform transform
4. 인쇄소 요구 확인 전 실제 업로드·주문 전송·배포 차단

---

### DONE (Claude) — 2026-07-31, 커밋 `c10e7a6`

구현 커밋 `c10e7a6`(코드/test), 종료 문서는 별도 커밋. 기준 HEAD `2a0cfd3`.

#### 바꾼 파일 (허용 목록 안)

| 파일 | 내용 |
| --- | --- |
| `packages/shared/src/catalog/read.ts` | `frameSizes` allowlist에 `printWidthCm`·`printHeightCm` 추가, `validatePrintSizeCm` 신설 |
| `packages/shared/src/catalog/read.test.ts` | 쌍/경계/한쪽만/범위밖/이름·`w`·`h` 무시/원문 비노출 |
| `packages/shared/src/catalog/fixtures/index.ts` | `errHalfPrintSize`·`errPrintSizeTooLarge`·`okPrintSize` |
| `packages/shared/src/catalog/preview/types.ts` | `FramePrintPhysicalSize` |
| `packages/shared/src/catalog/preview/project.ts` | `projectFramePrintPhysicalSize` |
| `packages/shared/src/catalog/preview/project.test.ts` | 정상 쌍/`null`/fail-closed/hostile getter·revoked Proxy/결정성·비변형 |
| `packages/shared/src/catalog/preview/index.ts` | 두 심볼 export (상위 배럴은 `export *`라 무변경) |

`packages/shared/src/catalog/types.ts`, `catalog/index.ts`, `src/index.ts`는 **변경이 필요 없었다**
(`export *` 경유로 이미 공개된다).

#### 계약 구현 요지

- 두 필드는 **all-or-nothing**이다. 한쪽만 있으면 **없는 쪽 path**로 `INVALID_NUMBER`를 낸다 —
  있는 쪽을 탓하면 운영자가 "지운 값"이 아니라 "남긴 값"을 고치게 된다.
- 범위는 finite · `> 0` · `<= 500` cm. **clamp·반올림·보완 0.**
- projection은 각 필드를 **정확히 한 번** 읽어 drifting getter가 검증 후 값을 바꿀 수 없다.
- `aspect`가 있어도 **없는 한 변을 계산하지 않는다.** 논리 `w`/`h`는 cm 후보가 **아니다**.
- 실패 payload에 raw 수치·id·이름이 들어가지 않는 것을 unit으로 고정했다.

#### 검증 결과 (스펙 §검증 순서대로)

| 게이트 | 결과 |
| --- | --- |
| frozen install | PASS (`Already up to date`) |
| lockfile diff | **0** |
| format / lint(`--error-on-warnings`) / typecheck | PASS |
| unit | **1109/1109 PASS** (031 시점 1088 → +21) |
| 독립 build | PASS |
| 전체 Chromium E2E | **116/116 PASS** |
| 고객 dist SHA-256 (E2E 전후) | **동일** `74427f72…c9644c` |
| `git diff --check` | 클린 (CRLF 경고만) |
| forbidden diff | **0** |
| ports 4183/4184 LISTENING | **0** |
| OS temp `denn-e2e-*` | **0** |

스펙 §검증의 신규 unit 항목은 전부 커버했다: 정상 cm 쌍 · 둘 다 없음 → `null` ·
한쪽만/0/음수/NaN/±Infinity/500 초과 → fail-closed · 이름에 `21x29.7cm`가 있어도 필드 없으면 `null` ·
`w/h`를 cm로 쓰지 않음 · 입력 비변형 · 결정성 · hostile getter/revoked Proxy · 오류 원문 비노출.

#### NOT TESTED / 남는 것

- 실제 발행 카탈로그의 cm 필드 (아직 존재하지 않는다 — 후속 순서 2의 운영자 UI 스펙이 만든다)
- `aspect`와 cm 비율 불일치 진단 (계약상 이번 단위에서 자동 수정하지 않고 후보로만 남긴다)
- 잔류 프로세스 command-line
- **C-1(인쇄 좌표 방법)** 은 이 스펙이 정하지 않는다. §후속 순서 3이 A 계열을 가리키지만 확정 스펙은 아직 없다.

---

### CODEX_PASSED — 2026-07-31

Codex가 `315356a`를 독립 재검증해 **통과**시켰다.

| 게이트 | 결과 |
| --- | --- |
| frozen install / format / lint / typecheck / build | PASS |
| unit | **1109/1109 PASS** |
| Chromium E2E | **116/116 PASS** |
| `git diff --check`, forbidden diff, ports 4183/4184, OS temp staging | PASS |

알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 **손대지 않았다.**

기능 코드·테스트는 승인 후 **추가 수정 없음**. 종료 문서만 별도 fast-forward 커밋으로 처리했다.

**스펙 032 = DONE.** 다음은 계약 §후속 순서 2 — **운영자용 cm 입력·검증·저장 UI**의 읽기 전용 조사다.
§후속 순서 3의 **C-1(인쇄 좌표 방법 A/B/C)** 은 이 스펙이 정하지 않았고 여전히 Codex 결정이다.
