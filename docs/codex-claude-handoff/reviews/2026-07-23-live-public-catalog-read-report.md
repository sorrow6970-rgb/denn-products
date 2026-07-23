# 실제 공개 카탈로그 읽기 검증 결과 (스펙 014)

> 실행일: 2026-07-23 (KST). 이 보고서는 스펙 014 §6의 **안전 집계 필드만** 포함한다.
> 응답 원문·상품/브랜드 이름·item ID·URL·`dataUrl`·`storagePath`·token·전체 endpoint URL·issue path는 저장하지 않는다.

## 요청 예산

| 채널 | 실제 GET | retry / HEAD / cache-buster |
|---|---|---|
| Node adapter | **1** | 0 |
| Browser CORS | **1** | 0 |
| **합계** | **2** (≤ 2) | 0 |

endpoint 식별자: `published/state.json` (전체 URL 미기록). 스펙 013 `PUBLIC_CATALOG_LOCATION` / `buildPublicCatalogUrl()`만 사용.

## Node adapter 검증 (실제 GET 1회)

- outcome: **success**, code: **OK**
- requests: 1
- source: `network` — 스펙 012 `readLegacyCatalog` **통과**(성공 문서 + report 반환)
- 기존 adapter 기본값 사용(timeout 10s, 최대 5 MiB), 추가 GET/HEAD/cache-buster 없음
- 참고: 이 실행에서 collection/issue 개수 등 **세부 안전 집계는 stdout에 남지 않았다**(Vitest console 인터셉트). 데이터 유출과 무관한 도구 세부이며, 재현 시 안전 집계가 출력되도록 `process.stdout.write`로 고정함(코드 커밋 반영). 재실행은 이번 예산(2회)을 지키기 위해 수행하지 않았다.

## Browser CORS 검증 (실제 GET 1회, 로컬 mockup origin)

로컬 mockup preview origin에서 고정 URL로 `fetch(GET, no-store)` 1회. 페이지에서 반환한 값은 안전 필드뿐이다.

| 필드 | 값 |
|---|---|
| outcome / code | success / OK |
| requests | 1 |
| corsBlocked | **false** (CORS 차단 없음) |
| httpStatus | **200** |
| responseType | `cors` |
| contentTypePresent | true |
| byteLength (UTF-8) | **192419** (약 188 KiB, `0 < n ≤ 5 MiB`) |
| jsonParseOk | **true** |
| elapsedMs | 4227 |

## 결론

- 스펙 013 어댑터가 실제 공개 객체를 1회 읽어 **스펙 012 검증까지 성공**했다(Node).
- 로컬 브라우저 origin에서 별도 1회 요청이 **CORS 미차단·HTTP 200·JSON parse·크기 ≤ 5 MiB**를 통과했다(Browser).
- 기본 자동검증은 계속 network-free이며 live 검증은 명시적 opt-in(`DENN_LIVE_PUBLIC_CATALOG_READ=1`)에서만 실행된다.
- 저장·출력된 값은 안전 집계뿐이며 운영 카탈로그 원문·식별값은 어디에도 남지 않았다.

## 재현 방법 (opt-in)

```
DENN_LIVE_PUBLIC_CATALOG_READ=1 pnpm run test:live:node
DENN_LIVE_PUBLIC_CATALOG_READ=1 pnpm run test:live:browser
```

opt-in 없이 실행하면 요청 전에 실패한다(성공/skip 위장 없음).

## 미검증 / 유지

- 이번 결과는 **실행 시점 스냅샷**이며 장기 가용성·offline·장애 복구를 보장하지 않는다.
- Node/Browser byte 동일성은 발행 시점 경합 때문에 완료 조건으로 삼지 않았다.
- 실패해도 5 MiB·timeout·Rules·CORS를 **변경하지 않는다**(별도 분석 스펙).
- Firebase SDK/Auth/write·Rules/CORS·Hosting·배포·앱 연결 무변경.
