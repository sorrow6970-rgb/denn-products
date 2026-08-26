# 스펙 078 Space V2 local viewer replay handoff

- 상태: `READY_FOR_CLAUDE / LOCAL_ONLY / NO_UI / NO_NETWORK`
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
