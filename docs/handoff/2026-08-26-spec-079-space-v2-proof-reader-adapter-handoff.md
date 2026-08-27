# 스펙 079 Space V2 proof reader adapter handoff

- 상태: `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_UI / NO_LIVE_NETWORK` (검수 2026-08-27)
- 조사 기준: `HEAD=origin=b28b9c1`, ahead/behind 0/0
- 구현: 문서 commit `1d46b33`, 제품 commit `0887047`
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

## 구현 결과 (2026-08-27, Claude Code)

승인 범위만 구현했다. 상세 계약 대조와 실측표는 스펙 079의 `### DONE (Claude) — 2026-08-27`가 정본이다.

- 신규 `packages/firebase/src/space-read/proof-facade.ts` · `proof-reader.ts` · `proof-sdk-facade.ts`와
  unit/emulator test 3개. 기존 파일 수정은 `space-read/index.ts` 명시 export와
  `vitest.emulator.config.ts` include 1건뿐이며 `space-read/sdk-facade.ts`는 무변경이다.
- exact V2 path → metadata fullPath/contentType/size → bounded bytes → metadata size와 copied byte
  length 일치, 단일 20초 budget, 제품 retry 0, 기존 `denn-space-viewer` app exact config match 재사용.
- targeted unit **105/105**, 전체 `node scripts/check.mjs` PASS(unit **2228/2228**),
  `pnpm test:emulator` **27/27** PASS, 고객 entry `index-6js4DafP.js` / `322,018 bytes` /
  `A9360EFFBC204A2291AF66088840F7C7E58E97E8A29BE36B0669FC42E55E8159` exact, `git diff --check` PASS,
  허용 외 diff 0, 검사 포트 잔류 0.
- 전체 Chromium E2E는 MM-6=A에 따라 **NOT RUN**. actual Firebase/network/live/CORS/deploy/UID/
  publish/orphan cleanup **0 / NOT TESTED**, UI 연결 **0**.
- 다음은 Codex 검수(`CODEX_SPEC_079_REVIEW`)다. browser PNG decoder와 production V2 customer
  composition/UI는 별도 스펙이며 시작하지 않았다.
- 전체 리빌드 진행도 **81~84% 완료 / 16~19% 잔여 — 변동 없음**.

## Codex 독립 검수 (2026-08-27)

- 기준 `HEAD=origin=c9c0c3d`, ahead/behind `0/0`; 추가 코드 결함 0.
- targeted **105/105**, Firebase typecheck, 전체 check(unit **2228/2228**), 고객 bundle exact,
  diff·forbidden·port gate PASS.
- Codex 환경의 full emulator 재실행은 Firestore Java loopback 실패로 tests 전에 중단됐다. 신규
  Auth+Storage proof integration 분리 실행은 **5/5 PASS**이며, Claude Code가 기록한 full suite
  **27/27 PASS**와 구분한다.
- 최종 `CODEX_PASSED / DONE`. 실제 Firebase/live/deploy와 UI는 NOT TESTED이며, 다음은 별도
  스펙 080 customer V2 production viewer UI다.
