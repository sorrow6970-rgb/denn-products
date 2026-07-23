# 2026-07-23 스펙 015 핸드오프 — 고객 앱 공개 카탈로그 연결

> 브랜치 `rebuild/modern-studio`. 스펙 015 구현·검증 완료(로컬). Codex 재검증 대기.
> main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.

## 무엇을 했나

`apps/mockup`을 mount 시 스펙 013 공개 reader로 카탈로그를 **1회** 읽는 최소 연결 셸로 전환했다. 첫 제품 데이터 연결이며, loading/ready/error/수동 retry만 구현하고 성공 document는 메모리에만 유지한다.

- 모듈 단위 reader **singleton**(import 시 네트워크 없음).
- framework-free `PublicCatalogController`(generation·AbortController·stale/detach guard) + `useSyncExternalStore` hook.
- StrictMode mount→cleanup→mount에도 reader in-flight 병합으로 **underlying fetch 정확히 1회**.
- retryable 오류에서만 수동 재시도(클릭당 새 fetch 1회, 중복 클릭 무시). 자동 retry/polling/cache 없음.
- code→안전 한국어 메시지(코드/status/URL/path 미노출), 성공 document는 DOM/console/storage 직렬화 0.
- 접근 가능한 셸(loading `role=status`, ready + warning Badge, error `role=alert`+retry Button). 프리미티브 데모 제거. admin 무변경.

## 검증 (Node 24.18.0 / pnpm 11.15.1)

| 게이트 | 결과 |
|---|---|
| `install --frozen-lockfile` + lock diff | 성공, diff **0**(mockup importer에 `@denn/firebase` link만) |
| format / lint / typecheck | PASS |
| test:unit | **116**(controller 9 신규, framework-free) |
| build 독립 | PASS, mockup JS gzip **64.40 KB**(250KB 예산 내) |
| test:e2e | **12**(admin 2 + mockup 10), 실제 network 0 |
| check | PASS |

## E2E 시나리오 (route interception + 합성 fixture)

- 지연 응답: loading→ready, 요청 1
- StrictMode 초기 underlying 요청 **정확히 1회**
- warning fixture: "일부 이전 데이터가 호환 처리되었습니다"
- 500→안전 error+retry→200→ready, **총 요청 2회**
- invalid JSON/invalid catalog: 관리자 문의 error, **retry 버튼 없음**
- ready/error 320·1280: overflow 0, axe serious/critical 0, console 0
- admin: 공개 endpoint 요청 **0**, 셸 무변경

## 무변경/금지 (유지)

- 운영 HTML·Firebase 설정/Rules·`poc/**`·PNG·**admin 앱 소스 hash UNCHANGED**.
- Firebase SDK/Auth/write/Rules/CORS·Hosting·deploy 0, Router/Zustand/data-fetching lib 0, 신규 의존성 0.
- 실제 Firebase GET·`test:live:*` 미실행(스펙 014 결과 유지).

## 미검증 / 위험

- 실제 endpoint 재요청 없음(스펙 014 결과 유지). offline은 실패 UI가 정상(기본 카탈로그로 숨기지 않음).
- 데이터 연결 확인 단계이며 상품 탐색 화면이 아님(후속 스펙). document 전체 메모리 보유 → 후속 selector 대형 복제 주의.

## 다음

- Codex 스펙 015 재검증 대기. 이후 후보: 검증된 read model 기반 상품/사이즈/색상 화면 단계적 구축 · `@denn/render` Canvas · flat room 변환 · `?space=` 복호화. **새 스펙 없이 임의 착수 금지.**
