# 스펙 032 인계 — 액자 인쇄 물리 치수 카탈로그 계약

상태: **DONE — Codex 승인 후 종료 문서 처리 완료 (`COMMITTED`)** (2026-07-31, §8 참조)
코드/test 커밋: `c10e7a6` / 기준: 계약 `2a0cfd3`, 결정 정본 `0443137`, 조사 `docs/codex-claude-handoff/reviews/2026-07-31-print-export-investigation.md`

## 1. 한 줄

**인쇄 해상도가 나올 수 있는 곳을 "운영자가 명시한 cm 두 개"로 좁히고, 그 밖의 모든 추측 경로를 없앴다.**

## 2. 이 스펙이 실제로 고친 문제

레거시 `frameCm`은 후보 필드 8종을 훑다가 실패하면 **사이즈 이름 텍스트를 파싱**하고, 그것도 실패하면
**하드코딩 표**로 떨어졌다(조사 §2.3). 결과적으로 **사이즈 이름을 바꾸면 인쇄 해상도가 바뀌었다.**
게다가 후보 필드에 논리 `w`/`h`가 섞여 있어 **화면 px가 cm로 읽힐 수 있는 경로**도 살아 있었다.

P-2가 금지한 것은 그 전부다. 이번 단위는 **금지를 코드로 고정**한다.

## 3. 구현된 계약

### 3.1 catalog read — `frameSizes[].printWidthCm` · `printHeightCm`

- 두 필드를 `frameSizes` allowlist에 추가했다. 따라서 값을 넣어도 **UNKNOWN_FIELD 경고가 나지 않는다.**
- **all-or-nothing**: 함께 있거나 함께 없어야 한다.
- 각 값은 **finite · `> 0` · `<= 500`** (cm). 위반은 **`INVALID_NUMBER` fatal**이다.
  clamp·반올림·기본값 생성 **0**.
- 한쪽만 있으면 **없는 쪽 path**로 오류를 낸다. 있는 쪽을 탓하면 운영자가 "지운 값"이 아니라
  "남긴 값"을 고치러 가게 되어 진단이 사람을 잘못된 곳으로 보낸다.
- **둘 다 없는 기존 카탈로그는 이전과 완전히 동일하게 읽힌다.** 이번 변경으로 깨지는 기존 데이터는 없다.

### 3.2 projection — `projectFramePrintPhysicalSize(document, frameSizeId)`

- 반환은 **`{widthCm, heightCm}` 또는 `null`뿐**이다. id·이름·`sub`·`aspect`·raw item은 나가지 않는다.
- **`null`의 의미는 "아직 인쇄할 수 없다"** 이지 "기본값을 쓰라"가 아니다(P-2 · P-3의 fail-closed).
- 기존 preview projection의 `lookupById`/`run`/`fail` 규율을 그대로 재사용해 중복·누락·malformed id를
  **식별정보 없이** 실패시킨다.
- 각 필드를 **정확히 한 번만** 읽는다 → drifting getter가 "검증은 통과시키고 반환값만 바꾸는" 공격을
  할 수 없다. hostile getter throw와 revoked Proxy는 `run`의 예외 경계에서 실패로 흡수된다.

### 3.3 추론 경로 0

| 유혹 | 처리 |
| --- | --- |
| 이름 `"A4 21x29.7cm"` | **읽지 않는다.** cm 필드가 없으면 `null` |
| `sub` / label / id | **읽지 않는다** |
| `aspect` + 한쪽 cm | **없는 변을 계산하지 않는다.** 실패다 |
| 논리 `w` / `h` | **cm 후보가 아니다.** 있어도 `null` |

이 네 가지는 전부 **unit으로 고정**돼 있어, 나중에 "편의상" 되살리면 테스트가 깨진다.

## 4. 바꾼 파일 (계약 허용 목록 안)

| 파일 | 내용 |
| --- | --- |
| `packages/shared/src/catalog/read.ts` | allowlist 2필드 + `validatePrintSizeCm` |
| `packages/shared/src/catalog/read.test.ts` | 쌍/경계/한쪽만/범위밖/이름·`w`·`h` 무시/원문 비노출 |
| `packages/shared/src/catalog/fixtures/index.ts` | `errHalfPrintSize` · `errPrintSizeTooLarge` · `okPrintSize` |
| `packages/shared/src/catalog/preview/types.ts` | `FramePrintPhysicalSize` |
| `packages/shared/src/catalog/preview/project.ts` | `projectFramePrintPhysicalSize` |
| `packages/shared/src/catalog/preview/project.test.ts` | 정상 쌍/`null`/fail-closed/hostile getter·revoked Proxy/결정성·비변형 |
| `packages/shared/src/catalog/preview/index.ts` | 두 심볼 export |

`catalog/types.ts` · `catalog/index.ts` · `src/index.ts`는 **변경이 필요 없었다** — 상위 배럴이
`export *`라 자동 공개된다.

## 5. 검증 (Claude 실행분)

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

신규 E2E는 **없다.** 이번 단위는 브라우저 동작이 아니라 순수 read/projection 계약이라 unit이 정본이다.

## 6. Codex 독립 검증 — CODEX_PASSED

Codex가 `315356a`를 독립 재검증해 통과시켰다.

- frozen / format / lint / typecheck / build **PASS**
- unit **1109/1109 PASS**
- Chromium E2E **116/116 PASS**
- `git diff --check`, forbidden diff, ports 4183/4184, OS temp staging **PASS**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`: **손대지 않음**

## 7. NOT TESTED / 남는 위험

- **실제 발행 카탈로그에 cm 필드가 든 사례가 아직 없다.** 값을 넣을 운영자 UI가 후속 스펙이라
  이번 검증은 전부 합성 fixture다.
- `aspect`와 cm 비율의 불일치 진단 — 계약상 이번 단위에서 **자동 수정하지 않고 후보로만** 남긴다.
  (예: `aspect: 1.41`인데 cm가 `10×40`이어도 지금은 통과한다.)
- 잔류 프로세스 command-line 확인.

## 8. 상태

**DONE (`COMMITTED`).** 스펙 032는 순수 카탈로그 계약 단위로 종료됐다.

## 9. 다음 — 그리고 아직 정해지지 않은 것

계약 §후속 순서:

1. ~~본 스펙~~ **완료**
2. **운영자용 cm 입력·검증·저장 UI 스펙** (`apps/admin/**`) ← **다음 읽기 전용 조사 대상**
3. 액자 print/export 스펙 — "승인된 preview plan + detached HTMLCanvasElement의 uniform transform"
4. 인쇄소 요구 확인 전 실제 업로드·주문 전송·배포 차단 (P-4a)

**여전히 미결**:

- **C-1 인쇄 좌표 방법(후보 A/B/C)** — §후속 순서 3의 문장이 A 계열을 가리키지만 **확정 스펙은 아직 없다.**
  Claude가 임의로 고르지 않는다.
- **인쇄소 요구 전체**: 해상도 · 색공간/ICC · 재단 여백(bleed)/안전선 · 파일 형식 · 최대 파일 크기
  → **외부 확인 필요**(저장소 근거 0). P-4a의 출력 차단은 이 확인 전까지 유지된다.
- 케이스 인쇄(P-1로 분리), C-2~C-8.
- **조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완. 전제가 뒤집히면 해당 결정 항목은 다시 연다.
