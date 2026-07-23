# 2026-07-23 스펙 012 핸드오프 — 레거시 카탈로그 읽기 계약

> 브랜치 `rebuild/modern-studio`. 스펙 012 구현 완료(로컬, 자동검증 전부 통과). Codex 재검증 대기.
> main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.

## 무엇을 했나

`@denn/shared`에 legacy-v0 `S`/`ADM` 카탈로그를 내부 읽기 모델 `CatalogDocumentV1`으로 검증·정규화하는 **단일 read boundary**를 만들었다. 운영 데이터를 옮기거나 저장하는 마이그레이션이 아니다 — 합성 fixture만으로 입력 검증·순수 정규화·오류/경고 보고·원본 불변을 자동검증한다.

- `readLegacyCatalog(input): CatalogReadResult` — 성공/실패 discriminated Result. 정상 흐름 throw 없음, 실패를 기본 카탈로그 성공으로 둔갑시키지 않음.
- `isCatalogDocumentV1(input)` — V1 wrapper 판별.
- JSON-safe 딥클론(함수·비평범객체·순환 거부, **원본 비변형**). unknown top-level 제자리 보존, flat `roomBackgroundSettings`·리비전·`dataUrl/storagePath/dual` 보존.
- 근거 있는 필드만 모델링(DEF + legacy-analysis §4). zone/clock/mockup 내부는 opaque. unknown `frameTemplate.type`은 경고+보존.
- issue는 `{code, path}`만(원문·base64·토큰 없음).

## 검증 (Node 24.18.0 / pnpm 11.15.1)

| 게이트 | 결과 |
|---|---|
| `install --frozen-lockfile` + lock diff | 성공, diff **0**(shared package.json 무변경) |
| `format` / `lint` / `typecheck` | PASS |
| `test`(unit) | **50/50** (catalog 24 신규) |
| `build`(mockup·admin 독립) | PASS, JS gzip ≈61.09KB |
| `test:e2e` | **4/4**(앱 무변경) |
| `check`(aggregate) | PASS |

## 핵심 판단 (보고)

- **신규 스키마 라이브러리(Zod 등) 미설치** — 순수 TS 가드/정규화로 구현. `@denn/shared`의 React/Firebase/다른 `@denn/*` 의존 0, IO 0, 앱 파서 사용 0.
- **id/name 요구 범위**: 모든 아이템 `id` 검증. `name`은 DEF 인스턴스가 name을 가진 컬렉션에만 요구. `guideBackgrounds`·`caseTemplates`·`customFonts`는 근거 없어 요구 안 함.
- **frameTemplate.type known** = `{builtin, uploaded}`(레거시 grep 근거). 그 외는 거부 아닌 경고+보존.
- **unknown 처리**: top-level unknown 키만 `unknownPaths`+경고로 열거하고, 그 값(및 known 컨테이너 내부 추가 필드)은 opaque 보존(§4 지시). 라운드트립 동등성으로 보존 검증.

## 무변경/금지 (유지)

- 운영 HTML·`firebase.json`·`.firebaserc`·`firestore.rules`·`storage.rules`·`poc/**`·`docs/rebuild/design/*.png` **hash UNCHANGED**.
- 실제 `backup.json`·운영 데이터·PII 저장소 미추가. Firebase/localStorage/IndexedDB/fetch·자동 마이그레이션·앱/Canvas 연결·배포 **0**.

## 재검증 보완 (2026-07-23, HEAD 32eab2e → aae7187)

Codex "수정 후 재검증" 4건:
1. `isCatalogDocumentV1` 얕은 guard 강화 — 정확히 3키({schemaVersion:1, migratedFrom:"legacy-v0", plain-object data})만 true.
2. nested unknown 보존·경고 + 명시적 타입 계약 — known 객체/아이템의 추가 필드를 nested `unknownPaths`+경고로 보고, `report.extensions`(`CatalogExtensions` = path→JsonValue)로 노출. 근거 없는 컬렉션·깊은 중첩은 opaque.
3. `cloneJsonSafe`가 NaN/±Infinity를 어디서든(unknown/extensions 포함) `NON_FINITE_NUMBER`로 거부.
4. 카탈로그 전체 재귀 순회로 모든 `dataUrl`/`storagePath` 집계, `storagePath`의 **모든 URL scheme** 거부(`UNSAFE_STORAGE_PATH`).

재검증: frozen diff 0 · format/lint/typecheck · unit **57/57**(catalog 31) · build 독립 · e2e **4/4**. 운영본·POC·PNG·Firebase 무변경, 배포 0. 주의: URL scheme storagePath는 이제 fatal(별도 스펙에서 URL 필드 분리).

## 다음

- Codex 스펙 012 재검증 대기. 이후 후보: `@denn/firebase` 읽기 연결 · `@denn/render` Canvas · flat room → `roomSettings.operator/user` 변환(별도 스펙) · `?space=` 복호화 라운드트립 · 주문/시안 데이터. **새 스펙 없이 임의 착수 금지.**
