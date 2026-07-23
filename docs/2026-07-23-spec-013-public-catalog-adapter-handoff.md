# 2026-07-23 스펙 013 핸드오프 — Firebase 공개 카탈로그 읽기 어댑터

> 브랜치 `rebuild/modern-studio`. 스펙 013 구현 완료(로컬, 자동검증 전부 통과). Codex 재검증 대기.
> main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.

## 무엇을 했나

`@denn/firebase`에 고정 공개 Storage 객체 `published/state.json`을 읽는 **read-only REST adapter**를 만들었다. 실제 URL을 호출하거나 앱에 연결하지 않고, 주입 fake fetch만으로 계약을 고정했다.

- `createPublicCatalogReader(options).load({ correlationId, signal? })` → `PublicCatalogLoadResult`.
- 결정적 media URL(`encodeURIComponent`→`%2F`, `?alt=media`, cache-buster 없음). 공개 설정이며 비밀 아님.
- 주입 `FetchLike`(GET·no-store·no auth·body 1회), import 시 네트워크 미접촉.
- 내부 timeout(기본 10s) + caller AbortSignal, **옵션 A** 취소 격리(한 caller abort는 그 caller만 실패, 공유 fetch 유지).
- 동시 요청 fetch 1회 병합, settle 후 새 fetch. 늦은 완료가 확정 결과 미덮음.
- 5 MiB: Content-Length 사전검사 + `TextEncoder` UTF-8 byte 재검사(string.length 아님).
- 안전 오류 계약(category/code/retryable/correlationId + httpStatus/스펙012 issue code·path만), body/base64/token/URL 미노출. retry/cache/stale fallback 없음.
- 성공은 스펙 012 `readLegacyCatalog` 통과분만, warning은 report로 전달.

## 검증 (Node 24.18.0 / pnpm 11.15.1)

| 게이트 | 결과 |
|---|---|
| `install --frozen-lockfile` + lock diff | 성공, diff **0**(firebase package.json 무변경) |
| `format` / `lint` / `typecheck` | PASS |
| `test`(unit) | **91/91** (firebase 30 신규) |
| `build`(mockup·admin 독립) | PASS, JS gzip ≈61.09KB |
| `test:e2e` | **4/4**(앱 무변경) |
| `check`(aggregate) | PASS |

## 핵심 판단 (보고)

- **§6 caller 취소 = 옵션 A** 채택(caller abort는 해당 caller만 실패, 공유 fetch 유지). 테스트 고정, API 변경 불필요 → QUESTIONS 없음.
- 기타 non-2xx `PUBLIC_CATALOG_HTTP_ERROR` retryable = **false**(미분류 4xx 자동 재시도 위험) — 명시.
- 미주입 transport는 load 시점 `globalThis.fetch` lazy 확인, 없으면 `INVALID_REQUEST`. 테스트는 전부 주입, global fetch 0(스파이 확인).

## 무변경/금지 (유지)

- **Firebase SDK·신규 의존성 0**, `@denn/firebase`→`@denn/shared` 방향 유지, 앱 import/call 0, 실제 network/브라우저 저장소 0.
- 운영 HTML·`firebase.json`·`.firebaserc`·`firestore.rules`·`storage.rules`·`poc/**`·`docs/rebuild/design/*.png` **hash UNCHANGED**. Rules/deploy = NOT APPLICABLE(변경 없음).

## 미검증/위험

- fake fetch는 실제 Firebase CORS·cache header·실지연 미검증(실제 read는 사용자 승인·별도 스펙).
- 5 MiB는 관측 ~492KB에 여유를 둔 초기값(초과 시 몰래 상향 금지).
- `no-store`는 fresh-read 의도이며 offline 지원 아님.

## 다음

- Codex 스펙 013 재검증 대기. 이후 후보: 실제 공개 read(사용자 승인·CORS 실검증) · `@denn/render` Canvas · flat room 변환 · `?space=` 복호화 · 주문/시안 · 앱 연결. **새 스펙 없이 임의 착수 금지.**
