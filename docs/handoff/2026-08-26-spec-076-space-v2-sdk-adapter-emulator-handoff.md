# 스펙 076 space V2 SDK adapter + emulator handoff

- 상태: `DONE / LOCAL_VERIFIED / FOUNDER_E2E_EXCEPTION / FULL_E2E_NOT_RUN`
- 기준: `HEAD=origin=530c7bc`, ahead/behind 0/0에서 시작
- 정본: `docs/rebuild/specs/076-space-v2-sdk-adapter-emulator.md`
- 결정: `KK-1=A, KK-2=A, KK-3=A, KK-4=A, KK-5=A, KK-6=A`

## 구현

- `@denn/firebase/space-write`에 dynamic-import SDK facade를 추가했다.
- admin default Firebase app/Auth를 재사용하고 5개 공개 config가 다르면 fail-closed한다. named app 0.
- emulator 옵션은 non-demo project를 SDK import/service 접근 전에 거부한다.
- `uploadBytes` → exact V2 `setDoc` → 필요 시 `getDocFromServer`만 제공한다.
- root `@denn/firebase` barrel, apps/UI, Rules/config/package/lockfile는 변경하지 않았다.

## 검증

- targeted unit **40/40**, Firebase typecheck PASS.
- 전체 check PASS: unit **2124/2124** 포함.
- default emulator **22/22**, cutover 전용 config **4/4** PASS.
- 최초 cutover 실행은 잘못된 일반 emulator config 선택으로 1/4 실패했고, 전용 config 재실행으로
  4/4 PASS했다. 제품 코드·Rules 수정은 없었다.
- 고객 entry 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159`.
- `git diff --check`, forbidden diff, 보호 hash, 포트 잔류 0 PASS.
- 전체 Chromium E2E는 Founder `KK-6=A`에 따라 NOT RUN. full-E2E PASS가 아니다.

## 유지 경계와 다음 단계

실제 UID·Firebase/network/live·deploy, UI/route/URL/clipboard, orphan delete/cleanup은 미구현·NOT TESTED·
금지다. 다음 기능 단위는 admin UI composition 후보이므로 사용자의 기존 지침에 따라 Claude Code용
별도 계약·프롬프트 검토 전 시작하지 않는다.
