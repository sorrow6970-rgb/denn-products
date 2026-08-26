# 스펙 074 space V2 local write port handoff

- 상태: `DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION / FULL_E2E_NOT_RUN`
- 기준: `HEAD=origin=507eeb0`, ahead/behind 0/0에서 시작; commit/push/stage 0
- 정본: `docs/rebuild/specs/074-space-v2-local-write-port.md`
- 승인 해석: 최신 사용자 지시를 스펙 073의 **JJ-7=A**에만 적용

## 구현

- `@denn/firebase/space-write` subpath와 local-only facade/auth/write port.
- exact runtime snapshot, proof path/size/content/document 검증, upload 1회 → create 1회.
- upload/create definite failure와 outcome unknown 분리. create 미확정은 server-only snapshot 1회만
  읽고 exact document + `fromCache:false` + `hasPendingWrites:false`일 때만 성공으로 판정.
- 단일 in-flight Promise, 자동 retry/delete/merge/fallback 0, 안전 오류 필드 4개만 노출.
- `@denn/spaces` workspace dependency를 firebase package와 lockfile importer에 명시. 신규 외부
  dependency나 다운로드 0.

## 검증

- targeted synthetic fake **30/30 PASS**.
- 전체 check PASS: format, lint, 모든 typecheck, unit **2114/2114**, mockup/admin build.
- 고객 entry `index-6js4DafP.js` 322,018 bytes / SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- `git diff --check` PASS, 검사 포트 잔류 0.
- 전체 Chromium E2E: **NOT RUN**. 기존 suite가 보호 대상 spec-018 PNG를 다시 쓰므로 실행 승인이
  거부됐다. 우회하지 않았고 Founder가 2026-08-26 이 예외 종료를 명시 승인했다.

## 유지 경계

Rules, SDK adapter, emulator, actual Firebase/network/live, apps/UI, URL/clipboard, delete/orphan cleanup,
retry, deploy는 미구현·NOT TESTED다. 보호 대상과 기존 Founder/user 변경은 restore/checkout/stage/
commit하지 않았다. 다음 스펙은 시작하지 않는다.

## 다음 Founder 결정

`JJ-1=A, JJ-2=A, JJ-3=A, JJ-4=B, JJ-5=A, JJ-6=A`. 다음 local Rules/emulator 단위를 승인하지만
실제 UID, live deploy, SDK adapter, UI, orphan 삭제·정리는 승인하지 않는다.
