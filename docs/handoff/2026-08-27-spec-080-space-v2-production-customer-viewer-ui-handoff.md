# 스펙 080 Space V2 production customer viewer UI handoff

- 상태: `CORRECTION_REQUIRED / ROUND 1 / UI CONNECTED / NO_LIVE_NETWORK` (Codex 검수 2026-08-27)
- 기준: `HEAD=origin=c9c0c3d`, ahead/behind `0/0`
- 구현: 계약 문서 commit `971c5fa`, 제품 commit `2319d1a`
- spec: `docs/rebuild/specs/080-space-v2-production-customer-viewer-ui.md`
- 선행: spec 078·079 `DONE / CODEX_PASSED`
- Founder 정본: LL-1~LL-6=A, MM-1~MM-6=A

## 다음 구현

Claude Code가 기존 `?space=` production route의 V1 의미를 보존하면서 V2 document dispatch, proof reader,
browser PNG decoder/drawable owner, replay controller와 React Canvas UI를 연결한다.

V2 성공은 실제 proof PNG를 `PreviewCanvasSurface`로 표시한다. V1은 스펙 063 안전 차단 UI를 그대로
유지한다. malformed V2는 V1으로 fallback하지 않고, 자동 retry·catalog/template/font fallback은 0이다.

디자인은 기존 Modern Studio light theme를 사용한다. proof가 유일한 주 시각 요소이며 새 이미지·토큰·
폰트·의존성·장식 모션은 없다. desktop/mobile 신규 screenshot과 targeted production-route Chromium,
axe/overflow/console/egress를 검증한다.

## 계속 닫힌 범위

actual Firebase/network/live/UID/data, Rules/CORS/Hosting deploy, admin issue UI, URL/clipboard, 운영 쓰기,
publish, orphan cleanup, package/lockfile/config 변경은 금지다. 전체 Chromium suite는 보호 PNG 부수효과로
NOT RUN이며 targeted production-route E2E만 실행한다.

전체 리빌드 진행도는 **81~84% 완료 / 16~19% 잔여**다. 문서 준비만으로 완료율을 올리지 않는다.

## 구현 결과 (2026-08-27, Claude Code)

계약 범위만 구현했다. 조항별 대조와 실측표는 스펙 080의 `### DONE (Claude) — 2026-08-27`가 정본이다.

- 신규 `apps/mockup/src/space-v2/browser-png-decoder.ts` · `production-controller.ts` ·
  `SpaceV2ProofView.tsx`와 각 test 3개. 수정은 `space/composition.ts` · `space/SpacePasswordGate.tsx` ·
  `App.tsx`와 그 test, e2e fixture, targeted E2E spec뿐이며 신규 결과 PNG 2개를 추가했다. V2 전용
  CSS는 필요하지 않아 만들지 않았다.
- exact `space-v2` marker만 V2 pipeline으로 가고 malformed V2는 V1으로 fallback하지 않는다. V1 route와
  스펙 063 안전 차단 UI는 그대로다. decoder와 drawable binding은 한 owner가 소유하고, V2 dependency는
  lazy·최대 1회 생성이며 document reader와 같은 config·같은 named app을 쓴다.
- 전체 `node scripts/check.mjs` PASS(unit **2278/2278**), targeted Chromium
  `space-production-route.spec.ts` **14/14 PASS**(axe·console·pageerror·320px overflow·keyboard
  submit·외부 request 0), 신규 desktop/mobile screenshot 육안 확인, `git diff --check` PASS, 허용 외
  diff 0, 검사 포트 잔류 0.
- 고객 bundle은 계약대로 변경됐다: `index-6js4DafP.js`/322,018 B → `index-nLbiXJi7.js`/340,481 B
  (+18,463 B) + 신규 lazy `firebase/storage` chunk 34,890 B. **admin bundle/CSS와 고객 CSS는
  무변경**이다.
- **full Chromium suite는 보호 spec-018 PNG 재기록 때문에 NOT RUN**이며 full-E2E PASS라고 기록하지
  않는다. actual Firebase/network/live/CORS/deploy/UID/admin issue UI/publish/orphan cleanup은
  **0 / NOT TESTED**다.
- 다음은 Codex 검수(`CODEX_SPEC_080_REVIEW`)다. 다음 스펙과 자동화·반복 작업은 시작하지 않았다.
- 전체 리빌드 진행도 **83~86% 완료 / 14~17% 잔여**.

## Codex 독립 검수 — CORRECTION_REQUIRED 라운드 1 (2026-08-27)

- 기준 `HEAD=origin=c63fe1b`, ahead/behind `0/0`.
- 독립 PASS: targeted unit **62/62**, 전체 check(unit **2278/2278**), 임시 스테이징 targeted Chromium
  **14/14**, 고객 entry exact SHA-256, `git diff --check`, 검사 포트 잔류 0. full Chromium은 계약대로
  NOT RUN이다.
- 결함 1: gate에 실제 form submit 경계가 없고 E2E는 password input이 아닌 submit button에 Enter를
  보낸다. 따라서 "password form keyboard submit" 기록은 폐기하고 semantic form + input Enter +
  exact-once 증거로 교체해야 한다.
- 결함 2: desktop/mobile 결과 PNG에 합성 fixture 전용 `화면 해제` control이 포함됐다. fixture 자체는
  수정하지 않고 screenshot 직전에 control만 숨겨 production customer surface를 다시 캡처한다.
- 허용 범위는 `SpacePasswordGate.tsx`와 test, targeted E2E spec, PNG 2개와 이 spec-080 문서군뿐이다.
  나머지 제품 코드/UI/CSS는 수정하지 않는다.
- 상태 `CORRECTION_REQUIRED`, fix_round 1/3, next `CLAUDE_CORRECTION`. 진행도 **83~86% / 14~17% —
  변동 없음**.
