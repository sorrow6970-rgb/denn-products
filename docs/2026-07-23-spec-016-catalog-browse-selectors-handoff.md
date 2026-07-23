# 2026-07-23 스펙 016 핸드오프 — 고객 카탈로그 탐색 selector 계약

> 브랜치 `rebuild/modern-studio`. 스펙 016 구현·검증 완료(로컬). Codex 재검증 대기.
> main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.

## 무엇을 했나

`@denn/shared`에 검증된 `CatalogDocumentV1`에서 고객 탐색용 view를 만드는 **순수 selector**를 구현했다. 앱 연결·화면·Canvas는 없다 — 데이터 관계와 질의 결과만.

- `buildCatalogBrowseIndex(document)` + `selectModels/CaseCategories/CaseTemplates/FrameCategories/FrameSizes/FrameTemplates`.
- `categoryId` 정확 일치, virtual `all`(case+frame)·`builtin`(frame) 카테고리, reserved id 충돌 시 `RESERVED_CATEGORY_ID`(중복 탭 없음).
- frame-size key: 레거시 모든 별칭(single 7·array 4·nested 5) + `String(v).trim().toLowerCase()`(scalar string/finite number만). all flag/sentinel/no-key → all, 매칭 → restricted, 명시-무매칭 → unmatched+진단.
- hidden(`hideInMockup===true`) 제외, hidden/unknown size 질의 → 빈 결과. builtin/uploaded/other type, other는 진단+전체에만.
- output = 최소 readonly view(원본/unknown/image/base64/path 미복제), 진단은 code/collection/sourceIndex만·결정적·중복 제거.

## 검증 (Node 24.18.0 / pnpm 11.15.1)

| 게이트 | 결과 |
|---|---|
| `install --frozen-lockfile` + lock diff | 성공, diff **0**(shared package.json 무변경) |
| format / lint / typecheck | PASS |
| test:unit | **184**(browse 67 신규) |
| build 독립 | PASS |
| test:e2e | **11**(스펙 015 무회귀) |
| check | PASS |

## 표 기반 고정(§9-10)

- 정규화: trim/lower·scalar string/finite number만·객체/배열/boolean/빈 → null(“[object Object]” 없음).
- all-size sentinel 6종 + all flag 3종 + no-key → all.
- size 별칭: single(sizeId/frameSizeId/frameSize/targetSizeId/targetFrameSizeId/sizeKey/frameSizeKey)·array(sizeIds/frameSizeIds/targetSizeIds/frameTargetSizeIds)·nested size.{id,sizeId,frameSizeId,name,sub} 각각 개별 테스트.
- restricted 매칭·unmatched 진단·hidden/unknown size 빈 결과·combined category+size.

## 무변경/금지 (유지)

- `@denn/shared` React/Firebase/`@denn/*` 의존 0, IO 0, 앱 import/call 0.
- 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**두 앱 소스 hash UNCHANGED**. Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, 실제 GET·`test:live:*` 0, 신규 의존성 0.

## 미검증 / 위험

- built-in 템플릿 공급원은 이번 범위 밖(후속 제품 스펙). 합성 fixture만 사용.
- 모델→템플릿 직접 관계·가격·정렬 우선순위는 근거 없어 미구현.

## 다음

- Codex 스펙 016 재검증 대기. 이후 후보: selector 기반 상품/사이즈/카테고리 화면을 `apps/mockup`에 단계적 연결 · `@denn/render` Canvas · `?space=` 복호화. **새 스펙 없이 임의 착수 금지.**
