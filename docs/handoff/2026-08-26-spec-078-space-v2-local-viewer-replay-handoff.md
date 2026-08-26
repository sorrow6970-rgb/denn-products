# 스펙 078 Space V2 local viewer replay handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_UI / NO_NETWORK`
- 계약 작성 기준: `HEAD=origin=ed41170`, ahead/behind 0/0
- Codex 검수 대상: `HEAD=origin=0f63af4`, ahead/behind 0/0
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

## Codex 독립 검수 — 라운드 1

- 검수 기준 `HEAD=origin=0f63af4`, ahead/behind 0/0.
- targeted **28/28**, 전체 check(unit **2152/2152**), 고객 entry exact hash, diff와 포트 게이트 PASS.
- `replay-controller.test.ts`의 success test가 rect/color/transform/quarter-turn exact vector를 검증하지
  않아 스펙 §VERIFY 8이 미충족이다. success plan detachment 단언도 보완한다.
- 허용 보완은 해당 test 1개와 spec078 상태/handoff 문서뿐이다. 실제 결함이 드러나지 않으면 production
  코드는 변경하지 않는다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3. E2E·emulator는 NOT RUN, 다음 스펙 시작 0.

## 보완 라운드 1 결과

- Founder가 실제 구현 결함에 한해 `replay-controller.ts` 최소 범위 확장을 승인했다.
- exact vector가 normalized x/y를 logical px로 직접 전달한 결함을 재현했고, 기존 스펙 029/030의
  zero-pan probe → rotated maxPan → normalized-to-logical conversion → final plan으로 수정했다.
- 코드/test commit `bed9106`.
- targeted **29/29**, 전체 check(unit **2153/2153**), 고객 entry exact hash, diff·포트 게이트 PASS.
- E2E·emulator는 NOT RUN. 상태 `READY_FOR_CODEX`, next transition `CODEX_RE_REVIEW`.

## Codex 최종 재검수

- 기준 `HEAD=origin=6742f3f`, ahead/behind 0/0에서 `bed9106`을 독립 대조·재실행했다.
- 추가 결함 0. targeted **29/29**, 전체 check unit **2153/2153**, 고객 entry exact hash, diff·port PASS.
- 최종 판정 `CODEX_PASSED / DONE / LOCAL_VERIFIED / NO_UI / NO_NETWORK`.
- 전체 Chromium E2E·emulator는 NOT RUN. 다음 스펙은 자동 시작하지 않는다.
