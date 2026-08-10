# 결정 — 운영자 cm 입력 최소 범위 (스펙 034 · 035)

작성: 2026-08-10 · 기준 HEAD `f88ab70` (스펙 033 DONE 이후)
선행 조사: `docs/codex-claude-handoff/reviews/2026-07-31-operator-cm-input-ui-investigation.md`,
`docs/codex-claude-handoff/reviews/2026-07-31-admin-write-boundary-investigation.md`
선행 결정: `decisions/2026-07-31-spec-032-print-export-decisions.md` (P-1~P-6)

---

## 0. 이 문서의 위치

- **§1 Founder 승인(O-1~O-8)** 은 사용자의 명시적 결정이며 이 문서의 최상위 근거다.
- **§2 구조 결정(N-1~N-10)** 은 O-1~O-8을 코드 계약으로 내리기 위해 필요한 선택이다.
  조사 §6의 **STOP 4(저장 경로)·STOP 5(레거시 재현 금지)** 와 STOP 2의 구현 세부가 여기서 닫힌다.
- ⚠️ **절차 기록**: §2는 **Claude Code가 Founder 지시("Codex 구조 결정과 구현 계약을 작성하고
  자동화를 계속 진행해")에 따라 작성**했다. CLAUDE.md §1의 기본 분담(Codex가 스펙 작성)과 다르며,
  §7의 "사용자의 최신 명시적 결정이 최우선"에 근거한다. **Codex 재검수에서 뒤집히면 해당 항목만
  다시 연다** — §2의 각 항목은 근거 파일·라인을 달아 두었다.
- **§3 미룬 것**은 O-8에 따라 **이번 두 스펙의 범위 밖**이며, 별도 Founder 결정 스펙이 필요하다.

---

## 1. Founder 승인 (2026-08-10, 원문)

> 운영자 cm 입력 최소 권장안을 승인한다.
>
> 1. 이번 단위에는 Auth·Firebase 저장·published 발행을 도입하지 않는다.
> 2. 로컬 입력·검증·canonical catalog 변환까지만 구현한다.
> 3. legacy wcm/hcm은 canonical printWidthCm/printHeightCm이 없을 때만 읽기 정규화한다.
> 4. legacy와 canonical 값이 함께 존재하며 다르면 fail-closed한다.
> 5. 정규화 결과는 메모리 전용이며 운영 데이터에 되쓰지 않는다.
> 6. sub는 cm에서 파생하지 않고 독립 표시값으로 유지한다.
> 7. 레거시의 21cm 기본값 날조, parseFloat 실패를 1cm로 저장, 편집 시 cm 누락을 재현하지 않는다.
> 8. Auth·저장 경로·revision·충돌·publish는 별도 Founder 결정 스펙으로 미룬다.

| # | 승인 내용 | 닫힌 STOP |
| --- | --- | --- |
| **O-1** | Auth·Firebase 저장·발행 **미도입** | 조사 STOP 1 · admin-write F-A |
| **O-2** | 로컬 **입력·검증·canonical 변환**까지 | 조사 STOP 1 (범위 확정) |
| **O-3** | legacy `wcm`/`hcm`은 **canonical 부재 시에만** 읽기 정규화 | 조사 STOP 2 (②+① 절충) |
| **O-4** | legacy·canonical **공존 + 불일치 = fail-closed** | 조사 STOP 2 |
| **O-5** | 정규화는 **메모리 전용**, 되쓰기 0 | admin-write F-D |
| **O-6** | `sub`는 cm에서 **파생하지 않는다** | 조사 STOP 3 |
| **O-7** | 레거시 결함 3종 **재현 금지** | 조사 STOP 5 |
| **O-8** | Auth·저장 경로·revision·충돌·publish **연기** | admin-write F-B·F-C·F-E, X-1~X-6 |

---

## 2. 구조 결정 (N-1 ~ N-10)

### N-1. 정규화 위치 = `readLegacyCatalog` 안 (읽기 계층)

**결정**: legacy `wcm`/`hcm` → canonical `printWidthCm`/`printHeightCm` 승격은
`packages/shared/src/catalog/read.ts`의 read 단계에서 수행한다. 별도의 후처리 함수를 만들지 않는다.

**근거**:
- read.ts는 **이미 레거시 정규화 계층**이다 — 없는 collection을 `[]`로 채우고 `defaultsApplied`에
  기록하며(`read.ts:243-250`), legacy-v0 → V1 승격 자체가 이 함수의 역할이다.
- read가 이미 **JSON-safe 깊은 복제본**(`cloneJsonSafe`, `read.ts:220`) 위에서만 동작하므로
  **입력 비변형이 구조적으로 보장**된다 → O-5가 새 장치 없이 성립한다.
- 후처리 함수로 두면 `projectFramePrintPhysicalSize`가 **정규화된 문서와 아닌 문서 둘 다** 받게 되고,
  호출자가 정규화를 빠뜨릴 수 있다 = **두 번째 진실 원천**. 스펙 032가 피한 형태다.

**따름**: `projectFramePrintPhysicalSize`는 **무변경**이다. 승격은 그보다 앞 단계에서 끝난다.

### N-2. `wcm`/`hcm`은 인식 필드(legacy alias)로 승격한다

`ITEM_KNOWN.frameSizes` allowlist에 `wcm`·`hcm`을 추가한다. 두 값은 지금까지 `UNKNOWN_FIELD` 경고 +
`extensions` 보존으로 흘렀다(`read.ts:190-194`, 조사 §2.3). 인식 필드가 되면 그 경고는 사라지지만,
**필드 값 자체는 지금도 앞으로도 `document.data`에 그대로 남는다**(allowlist는 보고만 제어한다).

**이름 후보를 늘리지 않는다**: 레거시 소비자는 cm 후보를 **8쌍**이나 봤다(`mockup:11299-11316`).
이번에 인정하는 것은 **레거시 admin이 실제로 저장하는 `wcm`/`hcm` 한 쌍뿐**이다
(`denn-admin.html:1698`). `wCm`/`widthCm`/`cmW`/`printWcm`/`w`/`h`/`width`/`height`와 이름·`sub` 파싱은
**계속 금지**(P-2).

### N-3. 평가 순서 — canonical 먼저, legacy 나중

frameSizes 항목마다:

1. **canonical 검증**(스펙 032 `validatePrintSizeCm`, 무변경). 여기서 fatal이 나면 **그 항목의 legacy
   처리는 하지 않는다** — 깨진 canonical 선언을 legacy로 덮으면 운영자가 잘못된 쪽을 못 찾는다.
2. canonical 쌍이 **정상 존재**하면 → **N-4 충돌 검사**.
3. canonical이 **둘 다 부재**하면 → **N-5 승격**.

### N-4. 충돌 = fatal `CONFLICTING_PRINT_SIZE` (O-4)

canonical 쌍이 정상일 때, **존재하는 legacy 필드만** 비교한다.

- `wcm`이 있으면 `printWidthCm`과 **정확히 같아야** 한다(`===`. 반올림·허용오차·비율 비교 없음).
- `hcm`이 있으면 `printHeightCm`과 정확히 같아야 한다.
- 다르면 **fatal**, path는 **legacy 쪽**(`frameSizes[i].wcm`) — canonical이 정본이므로 운영자가
  지워야 할 필드를 가리킨다.
- legacy 한쪽만 있고 그 값이 같다면 충돌이 아니다(비교할 대상이 없는 필드는 판단하지 않는다).

**허용오차를 두지 않는 이유**: 21 vs 21.1은 300dpi에서 **약 12px 차이**다. "충분히 비슷하다"를
코드가 정하면 그 임계값이 곧 인쇄 사고의 크기가 된다.

**위험 인지**: fatal은 **카탈로그 전체 read 실패**다(032가 canonical 반쪽에 대해 이미 택한 규율,
조사 §4.1). O-4의 명시 승인 사항이며, 위험은 스펙 034 §위험에 기록한다.

### N-5. 승격 조건과 진단

canonical이 둘 다 없을 때:

| legacy 상태 | 동작 | 진단 |
| --- | --- | --- |
| `wcm`·`hcm` 둘 다 number, finite, `> 0`, `<= 500` | **승격**(복제본에 canonical 두 필드 기록) | warning `LEGACY_PRINT_SIZE_NORMALIZED` |
| 한쪽만 존재 / 숫자 아님 / 비유한 / `<= 0` / `> 500` | **승격 없음** | warning `LEGACY_PRINT_SIZE_IGNORED` |
| 둘 다 없음 | 없음 | 없음 (인쇄 불가 = 정상 상태) |

**승격 실패를 fatal로 하지 않는 이유**: legacy `wcm`은 **리빌드가 만든 필드가 아니라 이미 운영
데이터에 들어 있는 값**이고, 그 내용은 **NOT VERIFIED**(실제 network 금지)다. 쓰레기 값 하나가
**고객 카탈로그 전체를 못 읽게 만드는 것**은 O-4가 승인한 범위(=운영자가 두 곳에 서로 다른 값을
명시한 경우)를 넘는다. 승격하지 않으면 projection은 `null`이고 **인쇄는 그대로 차단**되므로
안전 성질은 유지된다(P-3).

### N-6. 저장 경로 = **A안(검증만)** — 조사 STOP 4

조사 §5의 A/B/C 중 **A(쓰기 없음, 후보를 실제 계약에 통과시켜 판정만)** 를 택한다. O-1·O-2의
직접 귀결이며, 조사가 적었듯 **A는 B/C의 부분집합**이라 나중에 저장 경로가 정해져도 버려지지 않는다.
B(로컬 초안 persistence)도 **이번에는 하지 않는다** — 초안 저장은 `__opRev` 규율·충돌·발행과
엮이고 그것들이 O-8로 미뤄졌기 때문이다.

### N-7. 판정은 계약을 **실제로 실행**해서 한다 (규칙 재구현 금지)

admin UI는 `> 0`·`<= 500`·all-or-nothing을 **다시 구현하지 않는다**. 후보 값을 최소 카탈로그
문서에 넣어 `readLegacyCatalog`를 실행하고, 그 결과와 `projectFramePrintPhysicalSize`로 판정한다.
스펙 031이 입력 거부를 **빌더 시험 빌드**로 처리한 것과 같은 규율이며, UI와 read가 어긋날 수 없다.

이 조립·판정은 `@denn/shared`의 **순수 함수**로 두고(앱은 표시만), 그래서 unit으로 고정된다.

### N-8. 입력 파싱은 엄격하다 (O-7)

문자열 → 숫자 변환에 **`parseFloat`를 쓰지 않는다**. 십진 표기(`^\d+(\.\d+)?$`)만 허용하고,
그 밖(빈 문자열·부호·지수·천단위 쉼표·전각 숫자·`21cm` 같은 접미사)은 **거부**한다.

**근거**: 레거시 `parseFloat(v('s-wcm'))||1`(`denn-admin.html:1670`)은 `"21cm"`을 조용히 21로,
`"abc"`를 **1 cm**로 통과시켰다. 1 cm는 유효 범위 안이라 read도 못 잡는다 — **입력 단계에서만**
막을 수 있다.

### N-9. prefill·`sub` 파생 금지 (O-6·O-7)

- 초기값은 **빈 문자열**이다. `aspect`·`sub`·`name`·`w`/`h`·하드코딩 표에서 **채우지 않는다**.
  레거시 `editSz`의 `wcm=21, hcm=21*aspect` 날조(`denn-admin.html:1650-1651`)를 **재현하지 않는다**.
- `sub`는 이번 UI의 **입력 대상도 출력 대상도 아니다**. cm에서 생성하지 않고, cm이 바뀌어도 건드리지
  않는다(O-6). 레거시의 `sub` 자동생성(`w+'×'+h+' cm'`)과 `sub` 정규식 파싱은 둘 다 도입하지 않는다.
- 레거시 `confirmEditSz`가 `aspect`만 갱신하고 cm을 저장하지 않아 생기는 **조용한 불일치**
  (조사 §3)는 **재현 금지**다. 이번 UI는 애초에 저장하지 않으므로 구조적으로 발생할 수 없고,
  향후 저장 스펙이 이 금지를 이어받는다.

### N-10. `aspect` ↔ cm 비율 불일치는 이번에도 자동 수정하지 않는다

스펙 032가 정한 대로(계약 §공개 계약) 자동 보정하지 않는다. 스펙 033이 관측한
"`aspect`와 cm 비율이 다르면 인쇄가 `NON_UNIFORM_SCALE`로 실패한다"는 **인쇄 경로의 fail-closed로
이미 처리**되고 있으며, 카탈로그 계층에서 값을 고치면 **운영자가 입력한 두 값 중 하나를 코드가
임의로 이긴다**. 이번 UI는 두 값을 **표시하지도 비교하지도 않는다**(범위 밖).

---

## 3. 이번 범위 밖 — 별도 Founder 결정 필요 (O-8)

| 항목 | 출처 |
| --- | --- |
| 운영자 Auth(Email/Password, 비익명) 도입 | F-A · CLAUDE.md §4 제약 6 |
| 쓰기 범위와 `admin/state.json` 경로·allowlist | F-B · X-4 |
| 레거시 운영본과 `admin/state.json` **공유 vs 격리** | **F-C** (미결 시 저장 스펙 착수 불가) |
| revision 모델(`__opRev`/`__cloudRev`)·충돌·병합 vs fail-closed·tombstone | X-1 · X-2 · X-3 |
| 정규화 결과 **되쓰기** 여부 | F-D (이번엔 O-5로 **금지**) |
| 손실 시나리오 L-1~L-4 허용 여부 | F-E |
| `published/state.json` 발행 | O-1 |
| 인쇄소 요구(색공간/ICC·재단 여백·파일 형식·최대 크기) | P-4a |

---

## 4. 이 결정으로 열리는 스펙

| 스펙 | 내용 | 계층 |
| --- | --- | --- |
| **034** | legacy `wcm`/`hcm` 읽기 정규화·충돌 fail-closed | `@denn/shared` 순수 계약 |
| **035** | 운영자 cm 로컬 입력·검증·canonical 변환 UI | `@denn/shared` 순수 함수 + `apps/admin` |

034가 035의 선행이다 — 035의 판정이 034가 확정한 read 계약을 그대로 실행하기 때문이다.
