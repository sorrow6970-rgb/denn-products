# 스펙 079 Space V2 proof reader adapter handoff

- 상태: `READY_FOR_CLAUDE / APPROVED / PRODUCT IMPLEMENTATION NOT STARTED`
- 조사 기준: `HEAD=origin=b28b9c1`, ahead/behind 0/0
- spec: `docs/rebuild/specs/079-space-v2-proof-reader-adapter.md`
- review: `docs/codex-claude-handoff/reviews/2026-08-26-space-v2-proof-reader-adapter-investigation.md`

## 확인 결과

Firebase Web SDK 12.17.1의 공개 `getBytes`는 bytes만 반환하고 content type은 별도 `getMetadata`로
읽어야 한다. customer V1 document reader가 이미 `denn-space-viewer` named app을 소유하므로 새 app을
만들지 않는 package-only proof reader가 가장 작은 다음 경계다.

## Founder 결정

Founder **MM-1=A ~ MM-6=A** 승인. 기존 named app/`space-read` 재사용, metadata-first bounded read,
단일 20초 budget, `demo-denn-emulator`, package-only/full-E2E NOT RUN 계약을 확정했다.

## Claude Code 구현 범위

- `packages/firebase/src/space-read/` 신규 proof facade/reader/SDK adapter와 unit/emulator test.
- `space-read/index.ts` 명시 export와 `vitest.emulator.config.ts` include 1건.
- targeted/typecheck/전체 check/default emulator/고객 hash/diff/port 검증.
- 전체 Chromium E2E는 NOT RUN이며 PASS라고 주장하지 않는다.

`apps/**`, production UI/browser decoder, 기존 V1 facade, Rules/emulator JSON, package/lockfile/root barrel,
actual Firebase/live/CORS/deploy/UID/orphan cleanup은 금지다.

이 스펙은 UI 단계가 아니다. proof reader가 통과한 뒤 browser PNG decoder와 production customer V2
composition/UI를 별도 계약으로 연다. 실제 UI/UX 구현은 사용자 지침대로 Claude Code가 담당한다.

전체 리빌드 진행도는 **81~84% 완료 / 16~19% 잔여 — 변동 없음**이다. 문서 조사만으로 완료율을
올리지 않았다.
