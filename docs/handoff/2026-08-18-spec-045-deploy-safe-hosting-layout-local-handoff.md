# 스펙 045 deploy-safe Hosting layout 로컬 패키징 handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_DEPLOY**

## 구현 결과

- 실행별 OS temp 아래 `hosting/public`만 조립한다.
- 고객 Vite build는 root, `/admin/` base의 admin build는 `admin/`에 둔다.
- legacy 보존 파일은 `denn-admin.html`, `denn-mockup-tool.html` 두 개뿐이다.
- temp candidate Firebase config는 생성하지만 실제 `firebase.json`과 Firebase CLI는 사용하지 않는다.
- Chromium은 고객/admin route를 실행하고 legacy HTML은 HTTP 존재만 확인한다.

## 검증

- targeted unit: 18/18 PASS
- `pnpm check`: PASS, unit 1366/1366
- Chromium E2E: 141/141 PASS
- 고객 JS SHA-256: `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`
- `git diff --check`: PASS
- 포트 4183/4184/4185 및 `denn-e2e-*` 잔류: 0
- package/lockfile, 실제 Firebase config/Rules, apps/packages 제품 코드 diff: 0

## 남은 경계

K-2=A의 로컬 패키징만 완료했다. K-1 비용·용량 상한과 K-3 actual cutover 전략은 아직 Founder
결정이 없으며, 실제 UID·Firebase/network·Rules/Hosting 배포·운영 쓰기·발행·delete는 NOT TESTED/
금지다. 다음 단계는 K-1/K-3 결정 전 자동 시작하지 않는다.
