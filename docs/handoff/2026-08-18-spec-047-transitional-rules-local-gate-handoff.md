# 스펙 047 transitional Rules 로컬 게이트 handoff

상태: **DONE / CODEX_PASSED / LOCAL_ONLY / NO_DEPLOY**

## 결과

- Founder L-1 canary 한정값, L-2=A, L-3=A를 결정 정본에 기록했다.
- 별도 synthetic transitional Rules는 legacy non-anonymous write window와 승인 UID 전용 rebuild
  create-only/head/REC를 동시에 검증한다.
- manifest validator는 demo-only·합성 UID·1회 저장·1객체·20 MiB 미만·Founder 즉시 확인과 모든 운영
  gate false/deploy command 0을 강제한다.

## 게이트

- manifest unit 12/12 PASS
- local `demo-denn-cutover` emulator 4/4 PASS
- `pnpm check` PASS, unit 1378/1378
- Chromium E2E 141/141 PASS
- 고객 JS SHA-256 `FC7660E5730262888EA896A3BA5A9494C8ECB61E4D2E0A972849E72D0ABF0685`
- 포트 4183/4184/4185/8080/9099/9150/9199 및 OS temp 잔류 0

## 계속 차단

실제 UID, 실제 `storage.rules`/`firestore.rules`/`firebase.json`, Firebase 프로젝트/network, Rules·Hosting
배포, 운영 write flag, actual write, legacy close, 발행, delete/자동 정리는 모두 금지다. 일반 운영
비용·용량 상한은 여전히 미결정이므로 canary 이후 운영 개방도 승인되지 않았다.
