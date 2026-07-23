# 2026-07-23 스펙 014 핸드오프 — 실제 공개 카탈로그 읽기 검증

> 브랜치 `rebuild/modern-studio`. 스펙 014 구현·실제 검증 완료(로컬). Codex 재검증 대기.
> main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.

## 무엇을 했나

스펙 013 고정 공개 reader를 **실제 환경에서 opt-in으로 격리 검증**했다. 실제 GET은 **Node 1 + Browser 1 = 총 2회**(예산 준수), 두 채널 모두 성공. 원문·식별값은 저장/출력/커밋하지 않고 안전 집계만 남겼다.

- 순수 sanitizer(`safe-summary.ts`) — counts/codes/status/byte/elapsed/존재 boolean만. issue는 code별 개수(path 제거).
- opt-in Node live(`*.live.test.ts`, 기본 제외) + opt-in Browser CORS(별도 Playwright config). opt-in(`DENN_LIVE_PUBLIC_CATALOG_READ=1`) 없으면 요청 전 실패.
- 기본 게이트는 계속 network-free.

## 실제 검증 결과 (안전 집계)

- **Node**: success / OK, GET 1, `source:"network"`, 스펙 012 통과.
- **Browser**: success / OK, GET 1, corsBlocked false, HTTP 200, responseType `cors`, byteLength 192419(≈188 KiB, ≤5 MiB), jsonParseOk true, elapsedMs 4227.
- 합계 실제 GET 2회, retry/HEAD/cache-buster 0. 보고서 `reviews/2026-07-23-live-public-catalog-read-report.md`.

## 게이트 (기본, network-free)

| 게이트 | 결과 |
|---|---|
| frozen install + lock diff | 성공, **0**(deps 무변경) |
| format / lint / typecheck | PASS |
| test:unit (live 제외) | **107**(sanitizer 11 신규) |
| build 독립 | PASS |
| test:e2e (기본) | **4/4** |
| check | PASS |
| opt-in 없을 때 live | 요청 전 실패(위장 없음) |

## 안전·정리 가드

- repo/임시경로에 response/json/tmp/log/HAR/trace/video/screenshot **0**(`test-results/.last-run.json`은 status만·gitignored). 포트 free.
- 보고서·요약·오류·git에 원문/이름/ID/URL/base64/path/token **0**.
- 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**앱 소스 전부 hash UNCHANGED**. Firebase SDK/Auth/write/Rules/CORS·deploy 0, 신규 의존성 0.

## 미검증 / 유지

- 실행 시점 스냅샷(장기 가용성·offline 미보장). Node/Browser byte 동일성은 완료 조건 아님.
- 실패해도 5 MiB·timeout·Rules·CORS 임의 변경 금지.
- Node 세부 안전 집계 미출력은 도구 세부(데이터 무관, `process.stdout.write` 고정으로 재현 가능).

## 다음

- Codex 스펙 014 재검증 대기. 이후 후보: `@denn/render` Canvas · flat room 변환 · `?space=` 복호화 · 주문/시안 · 앱 연결. **새 스펙 없이 임의 착수 금지.**
