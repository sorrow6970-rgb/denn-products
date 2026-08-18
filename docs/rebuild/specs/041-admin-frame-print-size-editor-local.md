# 스펙 041 — 운영자 액자 인쇄 치수 격리 편집기 (로컬)

상태: DONE / CODEX_PASSED / LOCAL_ONLY / NO_APP_WIRING

## Founder 결정

- V-1=A: `frameSizes[].id`로 명시 선택하며 첫 항목을 자동 선택하지 않는다.
- V-2=A: canonical 치수를 prefill하고, 값이 없으면 빈 입력으로 시작한다. 이번 단위는 유효한 두 값의
  추가·갱신만 허용하며 기존 치수 삭제는 지원하지 않는다.
- V-3=A: 순수 불변 catalog 갱신 함수 + 주입형 write-session controller에 연결되는 격리 React
  편집기와 합성 검증까지만 구현한다.

## 계약

1. 선택 identity는 정확한 non-empty `frameSizes[].id`다. 배열 index나 표시 이름을 identity로 쓰지 않는다.
2. 선택 전에는 입력과 저장을 비활성화한다. 첫 항목 자동 선택·자동 저장은 0이다.
3. canonical `printWidthCm`/`printHeightCm` 쌍만 prefill한다. 없는 쌍은 빈 값이다.
4. 두 값 모두 `evaluateOperatorPrintSizeInput`을 통과할 때만 immutable candidate를 만든다.
5. 원본 document/배열/item을 변경하지 않고 선택 item의 canonical 두 키만 교체한다. 다른 필드와 순서는
   보존한다. 후보 전체는 `readLegacyCatalog`로 다시 검증한다.
6. 원래 canonical 값과 같은 입력은 clean이다. controller는 `{dirty, valid}`를 함께 받아 되돌리기를
   정확히 표현한다.
7. 저장은 controller의 exact expectedBase 전체-document CAS만 사용한다. 자동 retry/merge/publish/delete는 0.
8. 실제 `App.tsx` composition, write facade 생성, Firebase/emulator/live/network는 범위 밖이다.

## 허용 파일

- `packages/shared/src/catalog/authoring/frame-print-size-edit.ts` + unit + authoring export
- `apps/admin/src/admin-write/FramePrintSizeEditor.tsx` + unit
- 기존 `session-controller.ts` + unit의 dirty/clean 입력 최소 확장
- 이 스펙, handoff, STATE/NEXT/CURRENT/live log

## 검증

- ID 선택·no auto-select, prefill/empty, immutable update, no-op clean, invalid/not-found fail-closed
- session clean 복귀, invalid save 0, exact baseline revision 유지
- 격리 React 정적 상태/민감정보 비노출
- targeted unit, `pnpm check`, Chromium E2E 회귀, 고객 bundle hash, forbidden diff, 포트 잔류 0

## 계속 금지

`App.tsx`, 실제 write adapter/composition, Rules/config/package/lockfile, 실제 UID/Firebase/network/emulator,
배포·운영 쓰기·발행·delete·자동 정리·C6·L-4.

## STOP — F-D 충돌 (2026-08-14)

targeted 구현 검토에서 `loadBaseline()`이 legacy `wcm/hcm`의 메모리 정규화 결과를 catalog에 담고,
현재 `save()`가 검증된 전체 document를 직렬화한다는 점을 확인했다. baseline은 정규화 report를
보존하지 않아 원래 canonical 필드와 메모리 승격 필드를 안전하게 구분할 수 없다. 따라서 무관한
한 항목을 편집해도 승격 결과가 payload에 포함될 수 있으며, 이는 F-D의 “저장 payload에 승격 결과
미포함”과 충돌한다. 실제 운영 데이터는 조회하지 않아 영향 객체 수는 NOT TESTED다.

Founder W-1=A 승인(2026-08-18): baseline에 비식별 정규화 provenance를 보존하고, 승격 canonical
필드만 payload에서 제외하며, write validation이 이를 다시 추가해 직렬화하지 않도록 보완한다.
동일 port의 성공한 `loadBaseline()`과 exact revision을 모든 save의 런타임 precondition으로 강제한다.
모든 legacy `wcm/hcm` 필드는 baseline 대비 추가·변경·삭제를 거부하고, 해당 필드가 있는 항목은
편집기에서 읽기 전용이다. `App.tsx` 연결과 실제 쓰기는 계속 금지한다.

현재 WIP 검증: 신규/보완 targeted unit 25/25 PASS, shared/admin typecheck PASS. 전체 `pnpm check`,
Chromium E2E 및 고객 bundle hash는 이 STOP 이후 실행하지 않아 NOT RUN이다.

## DONE — W-1=A 보완 및 최종 검증 (2026-08-18)

- baseline은 `promotedLegacyPrintSizeIds`를 비식별 provenance로 보존한다.
- 모든 save는 같은 port의 성공한 `loadBaseline()`과 exact revision을 런타임으로 요구한다.
- 모든 legacy `wcm/hcm`의 추가·변경·삭제를 baseline 대비 거부한다.
- read-time 승격 canonical pair만 immutable object 직렬화 직전에 제거한다. 원래 canonical+legacy가
  함께 있던 pair는 보존한다.
- legacy field 포함 frame size는 순수 edit와 격리 UI 모두 읽기 전용이다.
- 독립 보완: invalid partial 입력을 clean으로 표시하던 dirty 판정을 고쳐 `dirty-invalid`로 고정했다.

검증: targeted **74/74**, `pnpm check` PASS(format/lint/typecheck, unit **1356/1356**, 두 앱 build),
Chromium E2E **134/134**, 고객 JS `index-W_cZpbdf.js` **287,741 bytes**, SHA-256
`FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`, `git diff --check` PASS.

`App.tsx` import/연결, 실제 adapter 생성, Firebase/emulator/network, Rules/config/package/lockfile,
운영 쓰기·발행·delete·배포는 0이다. 스펙 041은 로컬 격리 범위에서만 완료다.
