# 1단계 완료 보고 — 2026-05-17

> [[A-group-verification-2026-05-17]] · [[A-group-removal-plan-2026-05-17]] · [[wrap10-verification-2026-05-17]] 의 후속.
> `denn-admin.html` 의 `openZoneEditor` wrap 정리 1단계 — A 그룹 8개 wrap 외과 제거 작업 완료.

## 최종 결과

- **A 그룹 8개 wrap 모두 제거**
- **누적 85줄 삭제** (HTML 단일 파일)
- **`openZoneEditor` 정의 21개 → 13개**

## 제거된 wrap 목록

| 순번 | wrap # | 영역 | 패턴 | 제거 라인 | 커밋 |
|---|---|---|---|---|---|
| 1 | #6 | denn-v42-detail-preview-guide (`syncDetail`) | L-롤백포함 | 9 | d156070 |
| 2 | #7 | denn-v44-transparent-detail-overlay (`syncDetail`) | L-롤백포함 | 3 | d156070 |
| 3 | #2 | denn-v15/v18 (`installDetailBorder`) | L-단순 | 2 | d156070 |
| 4 | #9 | denn-v49-render-authority-lock (`hideDetailBorder`) | L-단순 | 2 | f6057a0 |
| 5 | #8 | denn-v45-design-canvas-only (`syncDetailCopy`) | B-제한분해 + 롤백 | 8 | f6057a0 |
| 6 | #4 | denn-v35-detail-size-selector (`installSizeControl`) | B-제한분해 | 20 | f6057a0 |
| 7 | #15 | denn-v84-white-border-flicker-lock (`detailLater`) | B-IIFE혼재 + CSS 동반 | 29 | (이번) |
| 8 | #10 | denn-v50-detail-builder-sync (`installDetailSizeSync`) | B-위험 (검증 후 안전) | 12 | (이번) |

소계: 14 + 30 + 41 = **85줄**

## 검증 완료

- ✅ 모든 wrap별 헬퍼 호출처 0건 (각 작업마다 grep 재확인)
- ✅ 보존 대상 코드 무손상:
  - zeRender 책임 코드 (각 IIFE 내부)
  - builder 책임 wrap (`goTab`, `initFrameBuilder`, `fbExport`, `installBuilderWhitePanel` 등)
  - save 책임 wrap (`saveZones`/`saveZonesOnly` 체인)
  - DOM 생성 책임 (winner v56 `renderSizeCard`가 `#denn-v38-ze-size-checks` 책임)
- ✅ `__v35SizeSelector`, `__dennV50Sync`, `__dennV84WhiteBorderFlickerLock` 등 공유 플래그명에서 wrap별 격리 검증
- ✅ 외부 노출 함수 (`dennV53StabilizeDetailSettings` 등) 영향 없음
- ✅ CSS 룰 동반 정리 (#15: `denn-v84-detail-preparing` 셀렉터 5줄)
- ✅ 롤백 함수 3개 제거 (`dennRollbackDetailPreviewGuideV42`/V44/V45 — 외부 호출처 0건 확정)
- ✅ 브라우저 동작 확인 완료
- ℹ️ 기존 알려진 이슈 (문구 추가/위치 이동 안 됨, 모달 깜빡임)는 그대로 유지 — **본 1단계 작업으로 인한 신규 회귀 아님.** 별도 단계에서 해결 예정.

## 백업 / 롤백 경로

- `backup-pre-A-group-removal` 태그 — 1단계 시작 시점 스냅샷
- 중간 커밋:
  - `d156070` — A 그룹 #6 #7 #2 (14줄)
  - `f6057a0` — A 그룹 #9 #8 #4 (누적 44줄)
- 최종 커밋: 본 보고서와 함께 커밋되는 #15 #10 (누적 85줄)

→ 단계별 부분 롤백 가능 (`git revert <hash>`).

## 다음 단계 — 2단계 (B 그룹)

대상 wrap: **#3, #5, #11, #13, #18, #19** (6개)

특징:
- 헬퍼/alias는 **유지**, wrap만 제거
- 외부 노출 alias 보존 필수:
  - `#3` v17 `renameDetailUi` — `goTab`/`DOMContentLoaded` 에서 호출
  - `#5` v38 `installDetailMulti` → `dennV38InstallMultiSizeCheckboxes` 외부 노출
  - `#11` v53 `stabilizeDetail` 본체 + `dennV53StabilizeDetailSettings` alias (v54/v84 wrap이 의존)
  - `#13` v55 `dennV55StabilizeFrameTemplateDetail` alias 노출
  - `#18` v363 `DENNDynamicFrameTextFieldsV363` 외부 노출
  - `#19` v363 `DENNFrameTemplateParityAdminV363` 외부 노출

→ 사전 작업: alias 보존 범위를 명확히 한 후 wrap 분리 설계 문서 작성 필요.

## 3단계 (C 그룹) 예고

대상 wrap: **#17, #20, #21** — IIFE 분해 필요 (zeRender wrap 동거).
winner(L8639 v56) 및 후속 winner(L13xxx)와의 통합 작업 동반.

— end —
