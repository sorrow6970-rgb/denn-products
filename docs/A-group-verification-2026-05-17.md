# A 그룹 추가 검증 — 2026-05-17

> [[openZoneEditor-helpers-callgraph]] 에서 "안전 제거 가능"으로 분류한 A 그룹 8개에 대해,
> grep으로 놓칠 수 있는 동적 호출 / 인라인 핸들러 / 문자열 참조 / 크로스파일 호출을 추가 검증.
> 결과: **8개 전부 안전 확정**. A 그룹에서 빠진 항목 없음.

## 검증 결과 요약

| 헬퍼명 | 동적 호출 | 인라인 핸들러 | 문자열 참조 | 크로스파일 | 최종 분류 |
|---|---|---|---|---|---|
| `installDetailBorder` | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `installSizeControl`  | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `syncDetail`          | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `syncDetailCopy`      | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `hideDetailBorder`    | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `installDetailSizeSync` | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `hideLegacyDetail`    | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |
| `detailLater`         | ❌ | ❌ | ❌ | ❌ | 🟢 A (확정) |

## 검증에 사용한 grep 패턴 (실행 명령 그대로)

대상 파일: `denn-admin.html` (13,788줄) + `denn-mockup-tool.html` (9,815줄)

1. **동적 호출** — `window['이름']`, `window["이름"]`
   ```
   pattern: window\[['"](installDetailBorder|installSizeControl|syncDetail|syncDetailCopy|hideDetailBorder|installDetailSizeSync|hideLegacyDetail|detailLater)['"]
   결과: 0건
   ```

2. **인라인 이벤트 핸들러** — `onclick="이름("`, `onchange="이름("` 등 `on*` 속성 안 호출
   ```
   pattern: on\w+\s*=\s*["'][^"']*(installDetailBorder|...|detailLater)\(
   결과: 0건
   ```

3. **문자열 내 참조** — 따옴표로 감싼 함수명 (콘솔 등록, eval 인자, 디버깅 라벨 등)
   ```
   pattern: ["'](installDetailBorder|...|detailLater)["']
   결과: 0건
   ```

4. **`setTimeout` 문자열 인자** (eval 스타일) — 보너스 검증
   ```
   pattern: setTimeout\s*\(\s*["'][^"']*(installDetailBorder|...|detailLater)
   결과: 0건
   ```

5. **`denn-mockup-tool.html` 크로스파일 호출**
   ```
   pattern: installDetailBorder|installSizeControl|syncDetail|syncDetailCopy|hideDetailBorder|installDetailSizeSync|hideLegacyDetail|detailLater
   결과: 0건
   ```
   추가 확인: mockup-tool.html에는 `openZoneEditor` 자체도 0건 — ZE/상세설정 모달은 admin 전용 기능. 두 파일은 헬퍼를 공유하지 않음.

## 발견된 추가 호출처 상세

**없음.** 위 5가지 패턴 모두에서 매칭 0건.

A 그룹 8개 헬퍼는 각자의 `openZoneEditor` wrap에서만 호출되며, 이전 colgraph 분석 결과(직접 grep)가 정확했음이 재확인됨.

## 최종 A 그룹 (안전 제거 확정)

| wrap # | 라인 | 블록 ID | 헬퍼 | 비고 |
|---|---|---|---|---|
| #2  | 3257-3261 | (v18 영역, denn-v18-admin-stability 부근) | `installDetailBorder` | 헬퍼 정의 L3257 함께 제거 |
| #4  | 4508 (헬퍼) / 4576-4588 (wrap) | `denn-v35-detail-size-selector` | `installSizeControl` | 동일 IIFE 내 헬퍼+wrap 동시 제거. 단 IIFE의 다른 코드는 보존 |
| #6  | 7005 (헬퍼) / 7009-7011 (wrap) + 7016 롤백 | `denn-v42-detail-preview-guide` | `syncDetail` v42 | 롤백 함수 `dennRollbackDetailPreviewGuideV42` 동반 제거 |
| #7  | 7150 (헬퍼) / 7151 (wrap) + 7152 롤백 | `denn-v44-transparent-detail-overlay` | `syncDetail` v44 | 롤백 함수 `dennRollbackTransparentDetailOverlayV44` 동반 제거. ⚠️ v42와 동명 함수 — IIFE 격리되어 충돌 없음 |
| #8  | 7287 (헬퍼) / 7293 (wrap) + 7297 롤백 | `denn-v45-design-canvas-only` | `syncDetailCopy` | 롤백 함수 `dennRollbackDesignCanvasOnlyV45` 동반 제거 |
| #9  | 7545-7546 | `denn-v49-render-authority-lock` | `hideDetailBorder` | 동일 줄에 헬퍼+wrap |
| #10 | 7624 (헬퍼) / 7694 (wrap) | `denn-v50-detail-builder-sync` | `installDetailSizeSync` | wrap 안에 `installDetailSizeSync` + v15-border 숨김 + `zeRender` 호출. v15-border 숨김은 winner 본체(L8639)가 v53/v54/v55 클래스 제거하는 로직과 별도 — 제거 전 v15-border DOM 잔존 여부 1회 확인 권장 |
| #15 | 10699/10746 (헬퍼) / 10759-10768 (wrap) | `denn-v84-white-border-flicker-lock` | `hideLegacyDetail`, `detailLater` | IIFE 전체가 v84 wrap 전용. 단, **같은 IIFE에 `goTab` wrap (10770-)이 있음** → openZoneEditor 부분만 제거하고 `goTab` wrap은 별도 분석 후 처리 |

## A 그룹에서 제외된 항목

**없음.** 8개 전부 유지.

## 다음 단계 권장

1. wrap #2, #6, #7, #8, #9 — 단순 5건. wrap+헬퍼+롤백 함수까지 통째 제거. 가장 작은 단위로 먼저 시도해서 동작 검증.
2. wrap #4, #10 — IIFE 내부 일부만 제거 필요. IIFE 다른 코드 분석 추가 필요.
3. wrap #15 — 같은 IIFE에 `goTab` wrap 동거. openZoneEditor wrap 부분만 떼낼지, `goTab` wrap도 함께 검토할지 결정 필요.

— end —
