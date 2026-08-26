# 스펙 078 Space V2 local viewer replay handoff

- 상태: `READY_FOR_CODEX / LOCAL_VERIFIED / NO_UI / NO_NETWORK`
- 기준: `HEAD=origin=ed41170`, ahead/behind 0/0
- 결정: `LL-1=A` ~ `LL-6=A`
- spec: `docs/rebuild/specs/078-space-v2-local-viewer-replay-pipeline.md`

## Claude Code가 구현할 것

- `@denn/spaces` 별도 V2 opener: decrypt → strict scene read → evidence digest verify.
- mockup의 아직 production에 import되지 않는 V2 replay controller: proof bytes read → size/SHA-256 → injected
  PNG decode/dimensions → closed evidence frame plan.
- synthetic fake와 short-circuit/safe error/unit 검증.

## 구현하지 않을 것

`App.tsx`, V1 controller/password gate, React/UI/CSS, Firebase asset SDK adapter, admin issuer, Rules/config,
actual network/live/emulator/deploy, URL/clipboard, orphan cleanup은 변경·실행하지 않는다.

## 완료 후

targeted + 전체 check + 고객 entry exact hash + forbidden diff를 기록하고 문서/제품 허용 파일만 일반
fast-forward commit/push한다. 상태를 `READY_FOR_CODEX`로 두고 다음 스펙을 자동 시작하지 않는다.

전체 리빌드 진행도는 구현 전 **80~83% 완료 / 17~20% 잔여**다.

## 구현 결과

- 별도 V2 opener와 local replay controller 구현 완료.
- targeted **28/28**, 전체 check(unit **2152/2152** 포함) PASS.
- 고객 entry `index-6js4DafP.js`, 322,018 bytes, SHA-256
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159` exact 유지.
- 전체 Chromium E2E·emulator는 NOT RUN. production route/UI/Firebase network 연결은 0.
- 구현 후 전체 리빌드 진행도 추정 **81~84% 완료 / 16~19% 잔여**. viewer local core가 닫혔지만 asset
  SDK adapter, production composition/UI, 실제 UID·deploy/cutover가 남아 있다.
