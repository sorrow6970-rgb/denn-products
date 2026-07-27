# 스펙 017 핸드오프 — 모바일 우선 고객 카탈로그 탐색 UI (자동검증 단계 완료)

날짜: 2026-07-27
브랜치: `rebuild/modern-studio`
범위: 스펙 017만. 앞선 스펙(011~016) 결과·운영본·Firebase·admin 앱은 무변경.

> 이 DONE은 **자동검증 단계 완료**다. 실제 iPhone Safari·Android Chrome·Samsung Internet·카카오
> 인앱과 실제 200% 확대는 **NOT TESTED**이며, 별도 실기기 스펙 통과 전까지 출시 완료로 보지 않는다.

---

## 1. 무엇을 만들었나

스펙 015가 메모리에 보유한 `CatalogDocumentV1`(ready 상태)을 스펙 016 browse selector로 변환해,
고객이 **케이스 또는 액자**를 단계적으로 선택하는 첫 실제 탐색 화면을 `apps/mockup`에 붙였다.
텍스트 기반 선택 흐름 + 반응형 레이아웃만 완성한다. 이미지/Canvas/저장/주문은 없다.

- 케이스: **모델 → 카테고리 → 템플릿**
- 액자: **사이즈 → 카테고리 → 호환 템플릿**
- 모델→템플릿 직접 필터는 **구현 안 함**(근거 없음). 모델은 선택 조합에만 포함.

## 2. 변경 파일

**코드/테스트 커밋**
- `apps/mockup/src/browse/selection.ts` (신규) — 순수 selection reducer + 헬퍼
- `apps/mockup/src/browse/selection.test.ts` (신규) — reducer 유닛 18건
- `apps/mockup/src/browse/BrowseFlow.tsx` (신규) — 단계형 탐색 컴포넌트
- `apps/mockup/src/browse/browse.css` (신규) — 앱 전용 레이아웃(토큰만, 새 색상 리터럴 0)
- `apps/mockup/src/App.tsx` (수정) — ready에서 `buildCatalogBrowseIndex`(useMemo, document identity당 1회) → `BrowseFlow`. 스펙 015 loading/error/retry는 그대로.
- `tests/e2e/mockup-browse.spec.ts` (신규) — 합성 fixture E2E + 10 viewport matrix + 스크린샷 2장

**문서/핸드오프 커밋**
- `docs/rebuild/results/spec-017/browse-mobile-390x844.png`, `browse-desktop-1280x800.png` (합성 fixture 시각 근거)
- 이 핸드오프 + 스펙 하단 `### DONE (Claude)` + `CURRENT.md`

## 3. 데이터 흐름 / selector 호출 위치 (raw filter 0)

- `App.tsx`: `state.status==="ready"`에서만 `buildCatalogBrowseIndex(state.document)`를 `useMemo(…, [document])`로 생성. React 컴포넌트에서 `document.data.*`를 직접 필터하지 않는다.
- `BrowseFlow.tsx` 옵션은 전부 스펙 016 공개 selector로만 얻는다:
  - 모델=`selectModels`, 케이스 카테고리=`selectCaseCategories`, 액자 카테고리=`selectFrameCategories`, 사이즈=`selectFrameSizes`
  - 템플릿 목록·카테고리 개수=`templatesFor`(→ `selectCaseTemplates` / `selectFrameTemplates({categoryId,sizeId})`)
  - 카테고리 disabled=`isCategorySelectable`, 완료 요약 label=selector 결과에서 `find`로 재조회(state에 label 저장 안 함)
- `selection.ts` reducer 헬퍼(membership/validity)도 selector만 사용(`index.models` 등 필드 직접 접근 안 함).

## 4. selection 상태 계약 (ID만 저장)

```ts
type CatalogBrowseSelection = {
  readonly productKind: "case" | "frame" | null;
  readonly modelId: string | null;
  readonly frameSizeId: string | null;
  readonly categoryId: string;      // 초기 virtual "all"
  readonly templateId: string | null;
};
```

## 5. reducer 전이표 (순수, React/IO 의존 0)

| action | 조건 | 효과 |
|---|---|---|
| `selectProductKind(k)` | `k≠현재` | `productKind=k`, model/size=null, category=`all`, template=null. 같은 k → 안정 no-op(선택 유지) |
| `selectModel(id)` | kind=case, `id∈selectModels` | `modelId=id`, **category/template 유지**(모델→템플릿 관계 없음). 그 외 no-op |
| `selectFrameSize(id)` | kind=frame, `id∈selectFrameSizes`(visible) | `frameSizeId=id`, **category=all, template=null**. 그 외 no-op |
| `selectCategory(id)` | kind 있음, `isCategorySelectable`(존재 && (all \|\| 개수>0)) | `categoryId=id`, **template=null**. unknown/disabled → no-op |
| `selectTemplate(id)` | kind 있음, `id∈현재 templatesFor` | `templateId=id`. 결과 밖 id → no-op |
| `reconcile` | — | 사라진 model/size 제거, 유효하지 않은 category→all, 결과 밖 template→null. **첫 항목 자동선택 없음** |

- 같은 값 재선택은 **안정 no-op(동일 참조 반환)** — 토글 해제 아님.
- unknown/disabled ID action은 상태 불변(동일 참조).
- 완료: 케이스=`kind+model+template`, 액자=`kind+size+template`. 완료 시 selector label로 텍스트 요약(`role="status"` `aria-live="polite"`).

## 6. 빈 상태 / 진단 UI

- 모델 0개: "선택 가능한 휴대폰 모델이 없습니다."
- 사이즈 0개: "선택 가능한 액자 사이즈가 없습니다."
- 현재 filter 템플릿 0개: "현재 조건에 맞는 템플릿이 없습니다."
- `index.diagnostics.length>0`: "일부 카탈로그 항목은 표시되지 않을 수 있습니다." — **code/path/값 미노출**.
- 0개 카테고리는 숨기지 않고 disabled + "(0)"로 표기. virtual "전체"는 0개여도 유지.
- 빈 상태를 가짜 기본 option으로 채우지 않음. 오류를 ready/빈 catalog로 위장하지 않음.

## 7. UI / 모바일 / 접근성

- `@denn/ui`(Chip/Badge) + `@denn/ui/theme.css` 웜 토프 토큰만. 새 색상 리터럴 0, 흰색-on-accent 일반 텍스트 0.
- 선택 상태는 색 외 **체크마크 + "선택됨" 텍스트 + `aria-pressed` + 굵기**로 표현.
- 모바일 우선 단일 열(템플릿은 ≥640px에서만 2열). 44×44 터치 타깃. 긴 label wrap(`overflow-wrap/word-break:keep-all`), ellipsis 은닉 없음.
- fieldset/legend로 그룹 라벨. keyboard Enter/Space 동작, focus-visible 링(theme + `.denn-tplcard:focus-visible`).
- fixed bottom CTA·100vh 단독 의존·hover-only 동작 없음. `prefers-reduced-motion` 존중.
- **주의(구현 함정):** theme.css `.denn-shell__inner p`(0,1,1)가 요약 문단 색을 muted로 덮어써서 accent-soft 위 3.97:1 axe 실패 → 요약 텍스트 규칙을 (0,2,0)로 올려 ink 강제(토큰 무변경).

## 8. 검증 결과

- 게이트(`node scripts/check.mjs`): format / lint(`--error-on-warnings`) / typecheck(7 프로젝트) / **unit 220** / build 전부 PASS.
  - unit: 스펙 016까지 202 → reducer 18 신규 = **220**.
  - mockup JS gzip **67.66KB**(스펙 015 기준 64.40KB 대비 **+3.26KB** = 탐색 UI+selector 배선. 예산 내, 비정상 급증 아님). admin JS gzip 61.09KB 무변경.
- e2e(`pnpm test:e2e`): **34/34 PASS**(admin scaffold 2 + 스펙 015 mockup-catalog + 스펙 017 신규). 스펙 015 무회귀.
- 프론즌 설치: `pnpm-lock.yaml`·모든 `package.json` 무변경 → lockfile diff 0. 신규 의존성 0(Router/Zustand/Radix/shadcn/data-fetching lib 0).

### E2E 필수 흐름 (스펙 §14, 전부 PASS)
1. loading→ready 후 제품 유형 2개 표시(유형 선택 전 하위 단계 없음)
2. 케이스: 모델→category→template→완료 요약
3. 케이스 모델 변경 시 template 유지(`aria-pressed=true`)
4. 액자: size→category→compatible template(fs1=전체 액자+제한 액자 하나, 제한 액자 둘 없음)→완료 요약
5. 액자 size 변경 시 category=전체·template 초기화·요약 사라짐
6. category 변경 시 template 초기화
7. 빈 models/sizes/templates 안내(가짜 기본값 없음)
8. diagnostic 일반 안내 + DOM에 secret/coded 값 0(`SECRET_MARKER_XYZ`·`DO_NOT_LEAK`·`UNKNOWN_SIZE_REFERENCE`·`ORPHAN_CATEGORY_REFERENCE`·`sourceIndex`·`sizeScope` 미검출)
9. 정확 catalog URL만 요청(hit=1, unexpected=0), console error 0
10. admin 앱 catalog 요청 0

### 반응형·접근성 matrix (스펙 §15, 10개 전부 PASS)
320×568 / 360×800 / 390×844 / 844×390 / 430×932 / 932×390 / 768×1024 / 1024×768 / 1280×800 / 1440×900
각 화면: document 수평 overflow 0 · 모든 control 44×44 이상 & viewport 폭 내 · axe serious/critical 0 · console error 0.
키보드 Enter/Space 유형 선택 + focus-visible 확인.

### 시각 근거
- `docs/rebuild/results/spec-017/browse-mobile-390x844.png`, `browse-desktop-1280x800.png` — 합성 fixture만, 실제 운영 이름·ID·이미지·URL 없음. 기존 `docs/rebuild/design/*-B.png` 5종 무수정(hash 확인).

## 9. 미검증 / NOT TESTED

- 실제 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 = **NOT TESTED**(자동 Chromium으로 대체 불가).
- 실제 200% 브라우저 확대 = **NOT TESTED**.
- 실제 Firebase GET·`test:live:*` = **미실행**(합성 route intercept만).
- 이미지/thumbnail/CORS/fallback, Canvas, 사진 업로드, 선택 저장/URL query/storage, 가격/검색/정렬/페이지네이션, 주문/카카오/시안, built-in 템플릿 공급원 = **범위 밖(미착수)**.

## 10. 무변경 확인 (hash UNCHANGED)

`denn-mockup-tool.html`·`denn-admin.html`·`firebase.json`·`.firebaserc`·`storage.rules`·`firestore.rules`·
`docs/rebuild/design/*-B.png` 5종·`apps/admin/**`·`poc/**` 전부 baseline hash 동일. Firebase SDK/Auth/write·Rules/CORS·Hosting·deploy 0.

## 11. 위험 / 롤백

- 모델→케이스 템플릿 직접 관계는 근거 없음 → 구현 안 함(모델은 조합에만). built-in 템플릿 공급원 미확정 → selector에 있는 항목만 표시(가짜 항목 없음).
- 텍스트 카드는 최종 탐색 UX 아님 — 이미지 참조·CORS·fallback은 후속 스펙.
- 롤백: 문서 커밋 → 코드/test 커밋 순서로 역 revert. Firebase/운영 롤백 없음.
