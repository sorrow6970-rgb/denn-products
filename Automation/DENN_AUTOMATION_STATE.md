# DENN automation state

```yaml
updated_at: 2026-07-31
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-030-customer-photo-quarter-turn-rotation
active_unit: spec-031-text-clock-investigation
state: READY_FOR_CODEX  # 스펙 031 Founder 결정 정본 기록 완료 → Codex 구현 계약 작성 대기
baseline_commit: 57d43b6
candidate_commit: 7636367  # 스펙 031 조사 보완 라운드 1 (최초 조사 33323dd)
verified_commit: 7636367
origin_relation: "spec 031 decision doc commit pushed fast-forward on top of 7636367; HEAD=origin, ahead/behind 0/0"
working_tree: "dirty: only the two known spec-018 PNGs; Claude must not restore/stage/commit them"
fix_round: 1
max_fix_rounds: 3
next_transition: CODEX_VERIFYING
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

## Codex 스펙 031 조사 보완 재검토 — 승인 및 Founder 결정 대기 (2026-07-31)

보완 커밋 `7636367`은 시계의 제품 의미를 `UNCONFIRMED`로 정확히 낮추고, 결함·인쇄 포함 권장 단정을
제거했으며, 하드웨어 미리보기와 인쇄 그래픽의 구현 범위를 분리했다. 허용 문서 5개만 변경했고
`git diff --check`를 통과했으며 HEAD=origin, ahead/behind 0/0이다. 제품 코드 변경은 0이다.

Codex는 C-1~C-7·C-9~C-11의 구조 방향을 조사 근거와 일치하는 것으로 승인한다. C-8 시계 표현은
Founder F-4에 종속한다. 구현 전 Founder가 F-1~F-4·F-6~F-8을 결정해야 하며,
F-5는 F-4가 인쇄 그래픽일 때만 필요하다.

## Codex 스펙 031 조사 검토 — CORRECTION_REQUIRED 라운드 1 (2026-07-31)

문서 전용 커밋 `33323dd`는 허용 파일과 일치하고 `git diff --check`를 통과했으며
HEAD=origin, ahead/behind 0/0이다. 제품 코드·테스트·설정·lockfile 변경은 0이다.

다만 보고서가 “인쇄/export에 시계가 없는 것”을 결함으로 확정하고 인쇄 포함을 권고한 근거는
불충분하다. 레거시 관리자 UI는 `denn-admin.html:335-342`에서 이를 **“템플릿용 시계 가이드”**라고
설명하고, `denn-admin.html:473-482`에서 **“시계 이미지 (커스텀)”**과
“미설정 시 텍스트형 시계”로 관리한다. 이는 인쇄 그래픽이 아니라 완제품의 물리적 시계
하드웨어/표시를 미리 보여주는 오버레이일 가능성이 있다.

현재 근거로 어느 의미가 맞는지 확인할 수 없으므로 결함 판정과 “인쇄 포함” 권장을 유지할 수 없다.
Claude는 제품 코드를 수정하지 않고 조사 보고서와 관련 상태 문서만 보완한다. 확정할 제품/운영 근거가
없으면 `UNCONFIRMED`로 낮추고 Founder에게 시계의 제품 의미부터 묻는다.

## 스펙 030 종료 확인 및 스펙 031 읽기 전용 조사 전이 (2026-07-31)

종료 문서 커밋 `57d43b6`이 `origin/rebuild/modern-studio`와 일치하고 ahead/behind 0/0이며,
working tree에는 원인이 확정된 스펙 018 PNG 두 개만 남아 있음을 확인했다. 스펙 030은 DONE이다.

다음 작업은 `docs/rebuild/specs/019-canvas-geometry-contract.md`에 기록된 후속 순서
`deterministic renderer → image/CORS → pointer → text/clock → print`에 따라
**스펙 031 고객 텍스트 영역·시계 오버레이 계약의 읽기 전용 사전 조사**로 정한다.
Claude는 제품 코드를 수정하지 않고 `Automation/NEXT_CLAUDE_PROMPT.md`의 문서 전용 범위만 조사해
fast-forward push한 뒤 `READY_FOR_CODEX`로 전환한다.

## 스펙 029 종료 확인 및 다음 조사 전이 (2026-07-30)

종료 문서 커밋 `8d20b6d`가 origin과 일치하고 ahead/behind 0/0이며 허용된 문서 파일만 포함함을 확인했다.
스펙 029는 DONE이다. 전체 리빌드 루프는 유지하고, 스펙 030 이미지 회전 계약을 구현 없이
읽기 전용으로 조사하도록 `WAITING_FOR_CLAUDE`로 전환한다.

## Codex 스펙 030 조사 검토 — Founder 결정 대기 (2026-07-30)

문서 커밋 `8734307`은 허용된 문서 5개만 변경했고 `git diff --check`를 통과했으며
HEAD=origin, ahead/behind 0/0이다. 제품 코드·테스트·CSS·manifest·lockfile 변경은 0이다.

Codex 계약은 다음으로 확정한다.

- C-1: composer의 슬롯별 normalized transform에 `rotationQuarterTurns`를 추가한다.
- C-2: 저장 값은 `0|1|2|3`; 다른 값은 복구 없이 거부한다.
- C-3: pan은 화면축이며 회전 footprint로 maxPan을 다시 계산한다.
- C-4: 회전 중심은 zone 중심 + 현재 pan이다.
- C-5: `draw-image-cover`의 선택적 `rotationQuarterTurns`로 plan 어휘를 확장한다.
- C-6: executor는 한 command 안에서 save→translate→rotate→draw→restore를 수행한다.
- C-7: probe plan에도 회전을 포함하고 normalized 값을 유지해 재환산한다.
- C-8: 회전을 plan에 기록해 향후 print/export가 같은 plan을 소비하게 한다.
- C-9: 기존 오류 우선순위에서 transform 유한성·범위 검증 단계에 회전 검증을 편입한다.

Founder 권장 결정은 R-1 90° 배수만, R-3 액자 aspect 전환 미도입·별도 기능,
R-4 case multi-zone에도 슬롯별 제공, R-5 template art와 독립적으로 사진 회전 허용,
R-6 EXIF 직접 파싱 금지·브라우저 decode 실측이다. R-2는 R-1 승인 시 불필요하다.

## Founder 스펙 030 권장안 승인 (2026-07-31)

Founder가 R-1·R-2·R-3·R-4·R-5·R-6을 일괄 승인하고 자동화 재개를 지시했다.

- 사진 회전은 90° 배수만 지원한다.
- 임의 각도는 도입하지 않고 스펙 029의 scale 1.0~5.0·빈 공간 금지를 유지한다.
- 액자 가로/세로 aspect 전환은 사진 회전과 분리하며 이번 스펙에서 제외한다.
- case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- template art는 고정하고 사용자 사진만 회전한다.
- EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode를 합성 fixture로 실측한다.

Claude가 결정 정본을 문서 전용으로 기록한 뒤 `READY_FOR_CODEX`로 전환한다. 구현은 아직 시작하지 않는다.

## Codex independent review result

Spec 028 at `cebcaad` is not yet approved. The independent `corepack pnpm check`
completed successfully (format, lint, typecheck, unit 876/876, build), and
`git diff --check 7a2b2cd..cebcaad` passed. Full E2E is intentionally deferred
until the correction below is applied.

Two fail-closed/snapshot defects require correction:

1. `apps/mockup/src/canvas/templateArtBinding.ts`
   reads `source.kind` and `source.src` outside an exception boundary. A hostile
   getter or Proxy can escape instead of producing the safe failed state.
2. `packages/shared/src/catalog/images/placement.ts`
   rereads source and legacy-builder marker fields across helper calls. Getter
   drift can make the first read indicate a legacy crop variant and a later read
   remove that evidence, incorrectly returning `stretch`.

These are normal correction items, not Founder decisions. Claude may modify only
the exact files and documentation listed in `Automation/NEXT_CLAUDE_PROMPT.md`.
The two known Spec 018 PNG changes remain excluded from every commit.

## 보완 라운드 1 결과 (Claude, 2026-07-29)

Codex 지적 2건을 지정된 파일 안에서만 보완해 push했다.

- `apps/mockup/src/canvas/templateArtBinding.ts` (+ test): source `kind`/`src`를 예외 경계 안에서
  각각 1회만 읽어 plain snapshot으로 복사하고, 검증·crossOrigin/src 대입·결과 처리에 snapshot만
  사용한다. hostile getter/Proxy trap/revoked Proxy는 element 생성 없이 기존 `INVALID_INPUT`으로 닫힌다.
- `packages/shared/src/catalog/images/placement.ts` (+ test): source 체인과 legacy-builder marker를
  각각 1회만 읽어 boolean snapshot으로 판정한다. 첫 snapshot이 legacy crop이면 이후 drift와 무관하게
  `unsupported: legacy-builder-crop`을 유지한다(fail-open 불가).
- `apps/mockup/src/preview/PreviewComposer.tsx`: 허용된 lint 정리 1줄(`noUselessTernary`)만.

계약 무변경: crossOrigin-before-src, data URL 예외, 재시도 0, generation stale guard, cache 0,
기존 none/stretch/unsupported 결과와 오류 우선순위, Result에 원문 미추가.

게이트: frozen exit 0 / lockfile diff 0 / format·lint·typecheck PASS / unit 893 (876 → 893) /
build mockup JS 254.06 kB gzip 78.90, CSS 13.80/3.53 무변경, admin 무변경 / e2e 85 PASS exit 0 /
check PASS / `git diff --check` clean / 포트 4183·4184 free / OS temp `denn-e2e-*` 0 /
고객 dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·deploy 0.

커밋: 코드/test `d4fb99b`, 문서(+ 이 상태 문서) 별도 커밋. 스펙 018 PNG 2개는 restore/checkout/
stage/commit하지 않았다.

## 세션 종료 (2026-07-29)

Founder 지시로 이번 세션을 마감하고 **Claude Code의 5분 자동 루프를 종료**했다(cron job 취소).

- 스펙 028은 **종료되지 않았다**. `DONE`도 `CODEX_PASSED`도 아니며, Codex correction review 도중
  세션이 끝났다.
- 구현 후보: `f7b3f61`(최초 구현) → `d4fb99b`(보완 라운드 1). Codex의 마지막 review 기준선은 `cebcaad`.
- 보완 2건(templateArtBinding source 단일 snapshot / placement 전체 단일 snapshot과 drift fail-open
  차단)은 `d4fb99b`로 구현·push됐고, **그에 대한 Codex 재검증은 실행되지 않았다**.
- HEAD = origin = `b18b652`, ahead/behind 0/0. working tree에는 Codex E2E가 재생성한 스펙 018 PNG
  2개만 남아 있으며 restore/checkout/stage/commit하지 않았다.
- 실제 network, live test, Firebase/CORS/Rules/Hosting, deploy: **0**.
- 다음 스펙은 착수하지 않았다.

재개는 `Automation/NEXT_CLAUDE_PROMPT.md`와
`docs/handoff/2026-07-29-session-end-handoff.md`를 읽고 **수동으로** 시작한다.

## Codex 독립 재검증 — 승인 가능 (2026-07-30)

Founder의 수동 재개 승인 후 보완 코드 `d4fb99b`를 독립 재검증했다.

- `templateArtBinding`: source `kind`/`src`를 예외 경계 안에서 각각 1회 읽어
  snapshot만 사용하며 hostile getter, Proxy trap, revoked Proxy는 안전 실패한다.
- catalog placement: source 체인과 legacy-builder marker를 각각 1회 읽은 snapshot으로만
  판정하며 getter drift가 `legacy-builder-crop`을 `stretch`로 fail-open시키지 않는다.
- 변경 범위는 허용된 source/test 4개와 lint 의미 보존 1줄로 한정되고 `git diff --check`
  를 통과했다.

독립 게이트:

- frozen install PASS, lockfile diff 0
- format, lint, typecheck PASS
- unit 893/893 PASS
- build PASS: mockup JS 254.06 kB / gzip 78.90 kB, CSS 13.80 / 3.53 kB;
  admin JS 193.53 / 61.09 kB, CSS 8.54 / 2.64 kB
- E2E 85/85 PASS, exit 0
- 포트 4183·4184 listener 0, OS temp `denn-e2e-*` 0, 저장소 소속 node/esbuild 0
- 고객 dist fixture 0
- HEAD=origin=`baa0d78`, ahead/behind 0/0
- working tree에는 알려진 스펙 018 PNG 2개와 이 로컬 Automation 전이 문서만 존재

NOT TESTED/NOT VERIFIED 유지:

- 운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패
- 운영 이미지·카탈로그, 실기기 4환경, 실제 200% 확대
- print/export taint, 대용량 아트 성능
- 썸네일(non-CORS)과 owner(anonymous)의 동일 URL 캐시 오염 가능성

스펙 028은 코드 기준 승인 가능하다. Claude Code는
`Automation/NEXT_CLAUDE_PROMPT.md`의 종료 문서 범위만 처리하고 다음 스펙을 시작하지 않는다.

## 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-30)

승인 판정에 따라 **종료 문서만** 하나의 문서 commit으로 처리하고 일반 fast-forward push했다.

- 승인 대상 보완 코드 `d4fb99b`, 문서 기준 HEAD `baa0d78`
- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/028-template-art-stretch-cors-owner.md`,
  `docs/handoff/2026-07-29-spec-028-template-art-handoff.md`,
  `docs/handoff/2026-07-29-session-end-handoff.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `docs/codex-claude-handoff/CURRENT.md`, `Automation/DENN_AUTOMATION_STATE.md`,
  `Automation/NEXT_CLAUDE_PROMPT.md`
- 기능 코드·테스트·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- Claude 재실측(같은 트리): frozen exit 0 · lockfile diff 0 / format·lint·typecheck /
  unit **893** / build 동일 수치 / e2e **85 PASS** exit 0 19.5초 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 → Codex 독립 게이트와 일치
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit **하지 않았다**(working tree에 그 2개만 잔존)
- 다음 스펙(029 등)·사전조사·기능 **미착수**

다음 전이: Codex가 이 문서 커밋의 최종 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 029 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-pointer-pan-zoom-investigation.md`.

- 재사용 확정: `computeCoverDrawRect`(cover + pan clamp, 입력 무변형, `appliedTransform`·`maxPan`),
  `clientPointToLogical`(logical px, DPR 무관), plan/adapter의 zone별 `transform`
  → `packages/render` 무변경으로 시작 가능
- 차단 계약 2건: pan 단위·기준 공간(액자 logical canvas 가변), transform 소유자(스펙 026 owner의
  `transform`이 리터럴 `{scale:1,x:0,y:0}`)
- 레거시 결함(재현 금지): 인쇄 pan 배율의 frame 하드코딩 `dim.w/500`, zoom 두 축 범위 불일치,
  multi-zone 슬라이더 표시값·터치 시작 오프셋 오류, pointer capture 부재
- 검증 한계: 2손가락 핀치는 Playwright로 구동 불가 → 구조적 NOT TESTED
- 결정 필요 9건(D-1~D-9, Founder 5건) · 최소 구현 순서 · 허용 파일 후보 · STOP 9조건 기록
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (**문서 전용 커밋**)
- 제품 코드·테스트·설정·CSS·PNG·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·이미지 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- 구현 스펙 작성·pointer/pan/zoom 구현·다음 기능 착수 **없음**

다음 전이: Codex가 조사 보고서를 검토해 구현 스펙(또는 추가 조사 지시)을 작성한다. 그 전까지 Claude는
어떤 제품 코드도 만들지 않는다.

## Codex 조사 검토 — Founder 결정 대기 (2026-07-30)

문서 전용 커밋 `2ded576`은 허용 범위와 정확히 일치하고 `git diff --check`를 통과했다.
제품 코드·테스트·설정·CSS·manifest·lockfile 변경은 0이며 HEAD=origin, ahead/behind 0/0이다.

Codex 계약 결정:

- D-1: 편집 상태는 `scale`(무차원)과 축별 normalized pan `x/y ∈ [-1,1]`을 저장한다.
  `x/y`는 현재 scale에서 계산한 축별 `maxPan` 대비 비율이며 `maxPan=0`인 축은 0이다.
  plan 생성 시에만 현재 zone의 logical px로 환산한다.
- D-4: 키보드 이동은 축별 normalized pan 0.02/step, Shift는 0.10/step으로 한다.
- D-8: composer가 slot별 transform을 소유한다. 스펙 026 image owner는 drawable/ref/intrinsic만
  소유하고 기존 리터럴 transform 계약을 바꾸지 않는다.
- D-9: 이미지 교체·삭제, model/template/frame-size 변경 시 해당 transform을 초기화한다.
  색상 변경과 활성 slot 전환에서는 유지한다.

Founder 결정이 필요한 권장 묶음:

- D-2: case multi-zone은 슬롯 카드 선택 + 활성 슬롯 표시
- D-3: scale 단일 범위 1.0~5.0, 내부 무차원·표시만 %, 휠/버튼은 승산 방식
- D-5: 중복 없는 단일 `원래대로` 버튼
- D-6: 1차 핀치 미지원; 슬라이더·버튼·휠·키보드·마우스 drag 제공
- D-7: 빈 공간 금지; 최소 scale 1.0과 cover clamp 유지

위 다섯 항목은 제품 UX 결정이므로 승인 전 구현 스펙·제품 코드를 작성하지 않는다.

## Founder 결정 접수·기록 완료 (Claude Code, 2026-07-30)

Founder가 다음 문장을 그대로 승인했다: `스펙 029 Founder 권장안 D-2·D-3·D-5·D-6·D-7 일괄 승인.`
Codex는 저장소만 읽으므로 결정을 정본 문서로 남겼다:
`docs/codex-claude-handoff/decisions/2026-07-30-spec-029-pan-zoom-decisions.md`.

승인된 값(요약): D-2 슬롯 카드 선택 + 활성 슬롯 표시 / D-3 scale **1.0~5.0** 단일 범위·내부 무차원·
표시만 %·휠·버튼 **승산** / D-5 단일 `원래대로` 버튼 / D-6 **1차 핀치 미지원**(슬라이더·버튼·휠·키보드·
마우스 drag) / D-7 **빈 공간 금지**(최소 scale 1.0 + cover clamp 유지). Codex 계약 D-1·D-4·D-8·D-9는
결정 문서 §2에 그대로 옮겨 함께 보존했다.

- 이 라운드 변경: **문서 전용**(결정 문서 1 신규 + `CURRENT.md` + live log + 이 문서 +
  `NEXT_CLAUDE_PROMPT.md`)
- 제품 코드·테스트·설정·CSS·PNG·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- pointer/pan/zoom 구현 **0**, 구현 스펙 작성 **0**(Codex 소유)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- `Automation/DENN_AUTOMATION_RUNBOOK.md`의 미커밋 변경은 **Codex 소유로 판단해 손대지 않았다**

다음 전이: Codex가 이 결정을 입력으로 **스펙 029 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.

## Codex 구현 계약 작성 완료 (2026-07-30)

Founder 승인과 결정 정본 `7701c7a`를 입력으로
`docs/rebuild/specs/029-pointer-pan-zoom-editing.md`를 작성했다.
상태를 `WAITING_FOR_CLAUDE`로 전환하며 Claude는 해당 스펙의 허용 파일과 게이트 안에서만 구현한다.

## Codex 독립 검증 — CORRECTION_REQUIRED (2026-07-30)

대상 `95fcf92` / 문서 `197527c`를 독립 확인했다.

- frozen install PASS, lockfile diff 0
- format·lint·typecheck PASS
- unit 938/938 PASS
- mockup/admin build PASS
- E2E 90/90 PASS, 정상 exit
- `git diff --check 7701c7a..197527c` PASS
- HEAD=origin=`197527c`, ahead/behind 0/0

다만 pointer 종료 계약에 실제 결함 2건이 있어 승인할 수 없다.

1. `createDragController.end()`가 pointerup 직전 rAF에 대기 중인 최신 transform을 취소한다.
   move와 pointerup이 같은 frame 안에 오면 사용자가 놓은 최종 위치가 사라지고 직전 렌더 위치로 되돌아간다.
   현재 unit test는 이 손실을 정상 동작으로 고정하고 있다. pointerup은 최신 pending 값을 정확히 한 번
   동기 commit한 뒤 종료해야 하며 pointercancel/lost/selection/unmount만 폐기해야 한다.
2. `setPointerCapture()` 예외를 무시한 채 drag session을 유지한다. capture 실패 후 포인터가 영역 밖에서
   놓이면 pointerup을 받지 못해 세션이 열린 채 남을 수 있다. capture 실패 시 즉시 해당 세션을 abort하고
   `dragSlotRef`를 비워 안전 실패해야 한다.

수정 허용 범위는 `apps/mockup/src/preview/imageTransform.ts`,
`apps/mockup/src/preview/imageTransform.test.ts`, `apps/mockup/src/preview/PreviewComposer.tsx`,
`apps/mockup/src/preview/PreviewComposer.test.tsx`와 관련 E2E/문서/Automation뿐이다.

## Codex 보완 라운드 1 재검증 — 승인 가능 (2026-07-30)

대상 코드 `110511e`, 문서 `0512c8d`를 독립 재검증했다.

- pointerup pending transform 정확히 1회 flush, cancel/lost/abort/dispose 폐기 확인
- stale callback·다음 세션 오염 0, capture 실패 즉시 abort 확인
- frozen install PASS, lockfile diff 0, 신규 의존성 0
- format·lint·typecheck PASS
- unit 944/944 PASS
- build PASS: mockup JS 263.31 kB/gzip 81.60, CSS 15.47/3.88; admin 무변경
- E2E 91/91 PASS, 정상 exit
- `git diff --check` PASS
- 포트 4183/4184 listener 0, OS temp `denn-e2e-*` 0
- HEAD=origin=`0512c8d`, ahead/behind 0/0
- working tree는 Codex 소유 RUNBOOK과 알려진 스펙 018 PNG 두 개만 남음

스펙 029는 코드 기준 승인 가능하다. Claude는 종료 문서만 처리하고 다음 스펙을 시작하지 않는다.

## 스펙 029 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

스펙 §4 허용 파일 안에서만 구현하고 코드/test와 문서를 분리 커밋했다.

- 코드/test 커밋 `95fcf92`, 기준 `7701c7a`(Founder 결정), 스펙 `029-pointer-pan-zoom-editing.md`
- 상태 모델: 슬롯별 `scale`(무차원 1.0~5.0) + 축별 normalized pan `[-1,1]`, plan 직전에만 logical 환산,
  `maxPan=0` 축 고정, resize는 normalized 유지 후 재환산
- `maxPan`은 pan 0 probe plan의 cover 명령에서 읽어 어댑터 rect 공식을 복제하지 않음(둘 중 하나라도
  실패하면 plan 미생성)
- Pointer Events + capture, 3종 종료 + selection/unmount, generation 가드, rAF 1회 병합,
  휠은 scale이 실제로 바뀔 때만 preventDefault, touch-action 선언 0(스크롤·브라우저 확대 보존)
- 슬롯 카드 선택 + `편집 중` 표시, 단일 `원래대로`, 화살표 0.02 / Shift 0.10,
  사진 미준비 슬롯은 컨트롤 전부 disabled
- 초기화: 이미지 교체·삭제·실패 → 그 슬롯만 / model·template·frame-size·kind → 전체 /
  색상 변경·활성 슬롯 전환 → 유지
- 발견·수정: stale animation frame이 다음 세션의 pending 값을 소비해 재-grab 첫 move가 누락되던 결함
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit 938 (893 → 938) / e2e 90 PASS (85 → 90) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·Firebase·CORS·deploy 0
- 번들: mockup JS 254.06 → 263.19 kB (gzip 78.90 → 81.56), CSS 13.80 → 15.47 (gzip 3.53 → 3.88),
  admin 무변경
- NOT TESTED: 2손가락 핀치(미구현·Playwright 구동 불가), 터치 drag(1차 미지원), 실기기 4환경,
  실제 200% 확대, print/export pan, 대용량 성능·EXIF
- `packages/**`·`apps/admin/**`·운영 HTML·Firebase 설정/Rules/CORS/Hosting·POC·manifest·lockfile 무변경,
  스펙 026 owner(`localImageBinding.ts`)와 `productPlan.ts`도 무수정
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `DENN_AUTOMATION_RUNBOOK.md`는 건드리지 않았다

다음 전이: Codex가 `95fcf92`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 029 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-30)

Codex 지적 2건은 모두 유효했고 지정된 파일 안에서만 보완해 push했다. 코드/test `110511e`, 문서 별도 커밋.

- 지적 1 (릴리즈 flush): `end(pointerId, "pointerup")`이 대기 중인 최신 transform을 버려, 릴리즈 직전
  move가 animation frame을 기다리는 중이면 사진이 손을 놓은 위치보다 한 프레임 뒤에 남았다.
  이제 `pointerup`만 정확히 1회 flush한 뒤 종료하고, `pointercancel`·`lostpointercapture`·selection
  abort·unmount/dispose는 pending을 폐기한다. flush는 state 정리와 frame 취소 후에 실행되므로 늦은 rAF는
  commit 0이고 이중 commit도 다음 세션 pending 소비도 없다. `cancelFrame`은 frame 유무와 무관하게 항상
  pending을 비운다.
- 지적 2 (capture 실패): `setPointerCapture`가 throw하면 capture 없는 drag가 계속됐다. 이제 방금 시작한
  세션을 즉시 abort하고 `dragSlotRef.current`를 비운다.
- 유지된 계약: normalized 저장, plan 직전 환산, `maxPan=0` 고정, 1.1 승산, 0.02/0.10 키보드 스텝,
  단일 `원래대로`, generation 가드, rAF 1회 병합, 터치 drag·핀치 미지원, `touch-action` 선언 0,
  초기화 행렬, 스펙 026 owner와 `packages/**` 무변경.
- 신규 회귀 테스트: flush 1회 / 이미 실행된 frame 중복 commit 0 / move 없는 pointerup commit 0 /
  다음 세션 누출·소비 0 / 다른 pointerId의 stale end flush 0 / throwing subscriber 후 세션 종료·재사용 /
  abort·dispose 폐기 / 실제 Chromium에서 capture 거부 시 픽셀 불변 + 원복 후 정상 drag.
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit 944 (938 → 944) / e2e 91 PASS (90 → 91) exit 0 / `git diff --check` clean /
  포트 4183·4184 free / OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 /
  dist SHA-256 E2E 전후 동일 · fixture 0 / 네트워크·live·Firebase·CORS·deploy 0.
- 번들: mockup JS 263.19 → 263.31 kB (gzip 81.56 → 81.60), CSS 무변경, admin 무변경.
- 변경 파일: `apps/mockup/src/preview/imageTransform.ts`(+ test), `PreviewComposer.tsx`,
  `tests/e2e/mockup-preview.spec.ts` — 허용 목록 안. CSS·설정·manifest·lockfile·`packages/**` 무변경.
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다.

다음 전이: Codex가 `110511e`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## 스펙 029 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-30)

Codex 승인(코드 `110511e`, 문서 `0512c8d`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/029-pointer-pan-zoom-editing.md`(§CODEX_PASSED),
  `docs/handoff/2026-07-30-spec-029-pan-zoom-handoff.md`(§9 + 상태 줄),
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md`, `docs/codex-claude-handoff/CURRENT.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: unit **944/944**, E2E **91/91**, build mockup JS 263.31 kB / gzip 81.60,
  CSS 15.47 / 3.88, admin 무변경, 보완 2건(릴리즈 flush · capture 실패 즉시 abort),
  network/live/deploy **0**
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다
- NOT TESTED 유지: 2손가락 핀치(미구현·Playwright 구동 불가), 터치 drag, 실기기 4환경,
  실제 200% 브라우저 확대, print/export pan 재현, 대용량 이미지 실기기 성능·EXIF, 운영 카탈로그·이미지
- 다음 스펙(030 등)·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 030 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-30)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-30-image-rotation-investigation.md`(15항목).

- 회전 소유자 4개를 근거 라인과 함께 분리했다: 액자 가로/세로 ±90(사진 픽셀), 룸 tilt(액자 목업),
  워터마크 기울기, 텍스트 존 회전(인쇄 반영). 기기 방향 전환·회전 전체화면은 룸 표시 셸이며 사진과 무관.
- 액자 가로/세로는 레거시에서 미완이다: aspect transpose가 `normFrameRatio`로 되돌려지고 캔버스 CSS
  회전은 no-op이며, 회전 경로는 pan clamp를 잃고 전역 `state.rot` 폴백이 케이스 사진까지 회전시킨다.
- 인쇄 경로는 회전을 무시한다 → 미리보기와 인쇄가 어긋난다.
- EXIF는 레거시·리빌드 모두 직접 처리 0. 리빌드는 `<img>`+`naturalWidth`라 엔진 기본 동작에 의존하며
  이 저장소에서 실측된 적이 없다(NOT VERIFIED). 직접 파싱은 이중 회전·신규 의존성 때문에 비권장.
- 핵심 계약 충돌: 임의 각도는 스펙 029 Founder 확정값 D-3(scale 하한 1.0)·D-7(빈 공간 금지)와 수학적으로
  충돌한다(45°에서 cover 최소 배율 √2). 90° 배수면 019 cover와 029 normalized pan을 그대로 재사용한다.
- 회전은 `packages/render` 계약 변경이 전제다(plan에 rotation 필드 없음, executor는 transform 금지 명시).
- 결정 필요: Founder 6건(R-1 각도 집합, R-2 D-3/D-7 재해석, R-3 액자 가로/세로 분리 도입, R-4 case 회전,
  R-5 아트 템플릿 회전, R-6 EXIF 직접 정규화) + Codex 9건(C-1~C-9).
- 최소 구현 순서, 허용 파일 후보, unit/Chromium/실기기 검증 설계, 지원 불가·근거 부족, STOP 10조건 기록.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- 스펙 018 PNG 2개와 Codex 소유 미커밋 `Automation/DENN_AUTOMATION_RUNBOOK.md`는 손대지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 R-1~R-6 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 회전 관련 제품 코드를 만들지 않는다.

## 스펙 030 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

`NEXT_CLAUDE_PROMPT.md`의 문서 전용 범위만 수행했다. 정본
`docs/codex-claude-handoff/decisions/2026-07-31-spec-030-image-rotation-decisions.md`(신규).

승인 문장(원문): `스펙 030 Founder 권장안 R-1·R-2·R-3·R-4·R-5·R-6 일괄 승인하고 자동화 재개.`

기록한 Founder 결정:

- R-1: 고객 사진 회전은 90° 배수만 지원하고 `왼쪽 90°`/`오른쪽 90°` 버튼을 사용한다.
- R-2: 임의 각도를 도입하지 않아 스펙 029의 scale 1.0~5.0과 클립 안 빈 공간 금지를 유지한다.
- R-3: 액자 가로/세로 aspect 전환은 별도 기능이며 이번 스펙에서 제외한다.
- R-4: case multi-zone에도 활성 슬롯별 독립 회전을 제공한다.
- R-5: template art는 고정하고 사용자 사진만 회전한다.
- R-6: EXIF를 직접 파싱하지 않고 브라우저 `<img>` decode를 합성 EXIF fixture로 실측한다.

Codex 구조 계약 C-1~C-9는 조사 보고서와 이 문서의 기록 그대로 결정 문서 §2에 옮겨 보존했다.

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
  (`NEXT_CLAUDE_PROMPT.md`의 전이 지시 변경분 포함). 허용 파일 목록과 정확히 일치한다.
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 회전 관련 제품 코드 **0**, 구현 스펙 작성 **0**(Codex 소유), `packages/**` 무변경
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- `git diff --check` clean, 일반 fast-forward push, HEAD=origin, ahead/behind 0/0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다(working tree에 그 2개만 잔존)

다음 전이: Codex가 이 결정을 입력으로 **스펙 030 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.
그 전까지 Claude는 회전 관련 제품 코드를 만들지 않는다.

## Codex 결정 정본 검토 및 구현 계약 확정 (2026-07-31)

결정 정본 커밋 `cf1cfd2`는 허용된 문서 5개만 변경했고 `git diff --check`를 통과했다.
R-1~R-6과 C-1~C-9는 Founder 승인 및 조사 근거와 일치한다.

구현 정본은 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`다. 실효 상태를
`WAITING_FOR_CLAUDE`로 전환한다. Claude는 해당 스펙의 허용 파일·오류 우선순위·검증 계약
안에서만 구현하고, 제품 코드/test 커밋을 일반 fast-forward push한 뒤 `READY_FOR_CODEX`로
전환한다.

## 스펙 030 구현 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

스펙 `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md` §4 허용 파일 안에서만 구현하고
코드/test와 문서를 분리 커밋했다. 코드/test `fbbadeb`, 기준 계약 `2777010`.

- 상태 모델: 슬롯별 `rotationQuarterTurns 0|1|2|3`, 전역 회전 상태 0, D-9 초기화 행렬에 회전 편입
- 잘못된 값(`4`·`-1`·`1.5`·`90`·`"1"`·`NaN`·drift/throwing getter)은 복구 없이 거부
- 90°/270°는 cover에 넘기는 intrinsic w/h를 스왑해 회전 footprint를 얻는다 → `packages/render/src/geometry`
  무변경, 029 `maxPan` 공식 그대로 성립
- `draw-image-cover`의 선택적 `rotationQuarterTurns`만 추가하고 0이면 미emit → pre-030 plan과 바이트 동일
- executor는 회전 시에만 커맨드 내부 save→clip→translate→rotate→drawImage→restore, 중심은 drawRect 중심
- probe plan에도 회전 포함, template art는 무회전
- 게이트: frozen exit 0 / lockfile diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **989**(944→989) / build mockup JS 265.53 kB gzip 82.11, CSS 15.50/3.89, admin 무변경 /
  E2E **99 PASS**(91→99) exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일·fixture 0 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- ★ R-6 실측(저장소 최초): `Orientation=6` 합성 JPEG(40×20)이 Chromium에서 20×40으로 decode된다 →
  브라우저가 EXIF를 적용하므로 직접 파싱은 이중 회전. 조사의 NOT VERIFIED는 Chromium 한정 해소
- ★ 판단 요청 1건: executor 포트 `apps/mockup/src/canvas/types.ts`가 §4 허용 목록 밖이라
  `translate`/`rotate`를 executor 런타임 검사로 요구하고 없으면 preflight fail-closed로 처리했다.
  허용 파일 확장이 더 낫다고 판단되면 그 방향으로 보완한다(인계 §3.2)
- 변경 파일 13개 전부 §4 허용 목록 안. `surface.css`·`previewContracts.test.ts`는 변경 불필요로 무변경
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 `fbbadeb`와 문서 커밋을 독립 검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## Codex 독립 검증 — CORRECTION_REQUIRED (2026-07-31, 라운드 1)

코드 `fbbadeb`, 문서 `e4a9133`의 독립 검증 결과:

- frozen install, format, lint, typecheck, unit **989/989**, mockup/admin build,
  Chromium E2E **99/99**, `git diff --check`, dist SHA-256 전후 동일: PASS
- lockfile·신규 의존성·금지 경로 diff 0, 포트 4183/4184 listener 0, OS temp 0
- 잔류 프로세스 command-line 열람은 OS 권한 거부로 **NOT TESTED**

보완 1건: `executePreviewPlan.ts`는 회전 command에서 `translate`/`rotate`를 요구하지만 공개
`PreviewCanvasContext`가 두 capability를 선언하지 않는다. 타입을 정확히 구현한 소비자가 컴파일을
통과한 뒤 회전 plan에서만 실패할 수 있으므로 `apps/mockup/src/canvas/types.ts`를 최소 허용 확장한다.
두 메서드를 선택적 capability로 선언하고, 미지원 context는 unrotated plan만 호환되며 rotated plan은
preflight fail-closed임을 문서와 테스트로 고정한다.

## 스펙 030 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 1건은 유효했고 지정된 파일 안에서만 보완해 push했다. 코드/test `603cd25`, 기준 `e4a9133`.

- 지적: executor가 회전 command에서 `translate`/`rotate`를 요구하는데 공개 `PreviewCanvasContext`가
  둘을 선언하지 않아, 타입을 정확히 구현한 소비자가 컴파일을 통과한 뒤 회전 plan에서만 실패할 수 있었다.
- 보완 1: 두 메서드를 **선택적 capability로 공개 포트에 선언**했다. 선택성 자체가 계약이며, 없는
  컨텍스트는 unrotated plan을 그대로 실행하고 회전 plan만 둘 다 요구한다.
- 보완 2: fail-closed 계약을 공개 포트에 문서화했다 — 하나라도 없으면 preflight
  `INVALID_EXECUTOR_INPUT`이고 Canvas 연산 0이다.
- 보완 3: `RotationCapableCanvasContext`를 공개 타입에서 `Required<Pick<…>>`로 파생하고 executor의
  중복 interface를 삭제했다. `ROTATION_METHODS`는 `keyof PreviewCanvasContext`로 검사하므로 메서드명이
  바뀌면 컴파일이 깨진다.
- 신규 테스트 6: 공개 타입만으로 선언된 capability-free 컨텍스트의 unrotated PASS(transform 시도 0),
  명시적 회전 0도 동일, 회전 1·2·3 전부 fail-closed(Canvas 연산 0), 절반의 capability도 실패,
  함수 아닌 값도 실패, 실제 `CanvasRenderingContext2D`의 컴파일 타임 assignability.
- 무변경: 회전 순서·픽셀·오류 우선순위·R-1~R-6·C-1~C-9. E2E 99개 그대로 PASS.
- 게이트: frozen exit 0 / lockfile·manifest diff 0 / 신규 의존성 0 / format·lint·typecheck /
  unit **995**(989→995) / build mockup JS 265.52 kB gzip 82.10, CSS·admin 무변경 /
  E2E **99 PASS** exit 0 / `git diff --check` clean / 포트 4183·4184 free / OS temp 0 /
  고객 dist SHA-256 E2E 전후 동일 / 실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 변경 파일: `apps/mockup/src/canvas/types.ts`, `executePreviewPlan.ts`, `executePreviewPlan.test.ts`
  — 허용 목록과 정확히 일치
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- ⚠️ 미회신: 판단 요청 ②(R-6 실측을 조사 보고서 §7 `NOT VERIFIED` 해소로 반영할지)는 이번 회신에
  판정이 없었다. 보고서는 Codex 소유라 Claude가 수정하지 않았다.

다음 전이: Codex가 `603cd25`와 문서 커밋을 재검증한다. 그 전까지 Claude는 저장소를 수정하지 않는다.

## Codex 보완 라운드 1 재검증 — CODEX_PASSED (2026-07-31)

코드 `603cd25`, 문서 `1aa3302`를 독립 재검증해 승인한다.

- 공개 포트의 선택적 rotation capability, fail-closed 계약, 단일 타입 정본 확인
- frozen install, format, lint, typecheck, unit **995/995**, mockup/admin build
- Chromium E2E **99/99**, `git diff --check`, dist SHA-256 전후 동일
- lockfile·신규 의존성·금지 경로 diff 0, 포트 4183/4184 0, OS temp 0
- Chromium 합성 EXIF Orientation=6 적용은 검증됨; 그 밖의 엔진·실기기는 NOT TESTED

스펙 030 기능·보완 검증을 통과했다. 다음은 Claude가 종료 문서만 별도 fast-forward push한다.

## 스펙 030 종료 문서 처리 완료 — COMMITTED (Claude Code, 2026-07-31)

Codex 승인(코드 `603cd25`, 문서 `1aa3302`)에 따라 종료 문서만 하나의 문서 커밋으로 처리하고
일반 fast-forward push했다.

- 커밋 파일(허용 목록과 정확히 일치): `docs/rebuild/specs/030-customer-photo-quarter-turn-rotation.md`
  (§CODEX_PASSED), `docs/handoff/2026-07-31-spec-030-quarter-turn-rotation-handoff.md`(§10 + 상태 줄),
  `docs/codex-claude-handoff/CURRENT.md`, `docs/live/CLAUDE_LIVE_PATCH_LOG.md`,
  `Automation/DENN_AUTOMATION_STATE.md`, `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 최종 판정: unit **995/995**, E2E **99/99**, build mockup JS 265.52 kB / gzip 82.10,
  CSS 15.50 / 3.89, admin 무변경, 보완 1건(공개 포트 rotation capability 선언 · fail-closed 문서화 ·
  단일 타입 정본), network/live/deploy **0**
- 기능 코드·테스트·CSS·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**
  (`git diff 603cd25..HEAD -- apps packages tests` = 0줄), 신규 의존성 0
- Claude 재실측(같은 트리): `check` PASS(format·lint·typecheck·unit·build)
- ★ 판단 요청 ② 회신 반영: Chromium 합성 EXIF `Orientation=6` 적용은 **검증됨**으로 기록했고,
  그 밖의 엔진·실기기는 NOT TESTED로 유지했다. 조사 보고서는 Codex 소유·허용 파일 밖이라 수정하지 않았다
- NOT TESTED 유지: **잔류 프로세스 command-line 검사(OS 권한 거부)**, 실기기 4환경 EXIF·조작성,
  카메라 원본 orientation 1~8, 실제 print/export 회전, 대용량 성능·메모리, 실제 200% 확대, 임의 각도
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다
- 다음 스펙·사전조사·기능 **미착수**

다음 전이: Codex가 이 종료 문서 커밋의 hash와 `HEAD=origin`, ahead/behind 0/0을 확인하면 `DONE`이다.

## 스펙 031 사전 조사 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

`NEXT_CLAUDE_PROMPT.md`의 읽기 전용 조사 범위만 수행했다. 보고서
`docs/codex-claude-handoff/reviews/2026-07-31-text-clock-investigation.md`(13항목, 지시 10항목 전부 포함).

- 텍스트 소유자 2개를 근거 라인과 함께 분리했다: 액자 **키 기반 `textZones`**(운영자가 좌표·글꼴,
  고객이 값만) vs 케이스 **자유 배치 `textObjs`**(고객이 드래그). 코드·데이터 공유 0.
- zone 필드 전수와 기본값, 레이어 순서(사진 → 아트 → 텍스트 → 시계 → 테두리)를 기록했다.
- 레거시 결함 3건(재현 금지): 빈 값 판정 불일치로 `"0"` 소실, 줄 수 상한 미리보기 2 / 인쇄 3,
  기본 글자색이 경로에 따라 `#111`↔`#FFF`로 뒤집힘.
- ★ 인쇄/export 경로에 **시계가 아예 없다** → 고객이 본 화면과 인쇄물이 구조적으로 다르다.
- 시계 계약: 3단 병합(`clockSettings` → `frameSizes.clock` → `frameTemplates.clock`), `{x,y,size,customImg}`,
  로컬 시간 24h `HH:MM` 고정, 1초 `setInterval`, 타이머 정리 부실, `drawClockLayer` 12중 재정의.
- 카탈로그 V1은 `textZones`·`clock`·`clockEnabled`·`clockSettings`·`customFonts`를 보존만 하고
  **투영은 0**이다. `packages/render` plan 커맨드는 4개뿐이고 **텍스트 어휘가 없다**.
- ★ 핵심 계약 딜레마: wrap은 `measureText`(Canvas)가 필요한데 plan은 순수·JSON-safe여야 한다 →
  **빌더에 측정 포트를 주입해 `lines[]`를 plan에 확정**할 것을 권고했다. 레거시 결함이 정확히 반대
  선택(executor가 wrap)에서 나왔다.
- 결정 필요: Founder 8건(F-1~F-8, 특히 **F-4 시계를 인쇄에 포함할지**)과 Codex 11건(C-1~C-11).
- 검증 설계(fake 측정 포트, Playwright `page.clock` 고정 시각, 실제 시간·timezone 의존 금지),
  최소 구현 순서, 허용 파일 후보, STOP 12조건을 기록했다.
- 변경 파일: 보고서 1개 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` (문서 전용 커밋).
- 제품 코드·테스트·CSS·설정·manifest·lockfile·PNG diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0, 운영 데이터·이미지 접근 0.
- NOT VERIFIED: 레거시 실제 실행 0(코드 근거만), `drawClockLayer` 12중 재정의의 런타임 최종 승자,
  `customFonts` 실제 데이터 형태, 실기기 IME·폰트 대체·인쇄물 가독성.
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다.

다음 전이: Codex가 조사 보고서를 검토해 F-1~F-8 Founder 결정 요청과 구현 스펙(또는 추가 조사)을 작성한다.
그 전까지 Claude는 텍스트·시계 관련 제품 코드를 만들지 않는다.

## 스펙 031 조사 보완 라운드 1 결과 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex 지적 1건은 **유효**했고 허용된 문서 안에서만 보완했다. 기준 `33323dd`, 문서 전용 커밋.

- 지적: 조사가 "인쇄에 시계가 없다"는 코드 사실에서 곧바로 "구조적 불일치·결함" 판정과 "인쇄 포함"
  권장을 도출했다. `admin:335`("템플릿용 시계 가이드")·`admin:342`("템플릿 제작 시 시계를 미리 보면서
  위치를 잡고")는 시계가 완제품의 물리적 하드웨어일 가능성을 지지한다.
- 추가 조사 결과를 보고서 §3.5.1에 양쪽 근거로 정리했다. 새로 찾은 근거: 주문 payload에 시계 상태가
  없다(하드웨어 쪽), `clockOn`이 `space-scene-v1`의 `design`에 저장된다(그래픽 쪽), 하드웨어 어휘
  (무브먼트·바늘·초침·타공·벽시계·건전지)가 두 운영본 HTML과 `docs/` 전체에서 0건이다(양쪽 다 불확정).
- **판정 `UNCONFIRMED`**: §0·§3.5·§10에서 "구조적 불일치"·"결함"·"인쇄 포함 권장" 단정을 제거했고,
  §3.5는 관측된 코드 사실만 주장한다.
- Founder 결정 순서를 재구성했다: F-4(제품 의미) → F-4a(하드웨어면 print 미포함 유지, preview 전용) /
  F-4b(그래픽이면 포함 여부) → F-5(F-4b일 때만 시각 의미).
- 구현 범위를 §8.4에서 분기했다. 하드웨어로 확정되면 print/export와 공유할 결정적 plan을 전제하지 않고
  preview overlay 계약과 timer 정리만 다룬다. C-8을 F-4 종속으로 바꾸고 STOP 조건 11·12를 추가했다.
- 바꾸지 않은 것: §1·§2 textZones 조사 전체, §4~§7, C-1~C-7·C-9~C-11, §9 검증 설계.
- 변경 파일: 보고서 + `docs/codex-claude-handoff/CURRENT.md` + `docs/live/CLAUDE_LIVE_PATCH_LOG.md` +
  이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md` — 허용 목록과 정확히 일치
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff 0, 신규 의존성 0,
  실제 network·live·Firebase·CORS·Rules/Hosting·deploy 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 보완된 보고서를 재검토한다. **F-4는 Founder 결정이 필요하며 Claude가 확정하지 않는다.**

## 스펙 031 Founder 결정 정본 기록 완료 — READY_FOR_CODEX (Claude Code, 2026-07-31)

Codex가 보완 조사 `7636367`을 승인하고 `FOUNDER_DECISION_REQUIRED`로 전이한 뒤 Founder가 결정했다.
정본 `docs/codex-claude-handoff/decisions/2026-07-31-spec-031-text-clock-decisions.md`(신규).

★ F-4: **시계는 "완제품의 물리적 시계 하드웨어 미리보기"다.** 조사 §3.5.1의 `UNCONFIRMED`가 확정됐다.

- print/export에 시계를 **포함하지 않는다**. 현행 동작이 곧 정답이며, 레거시 인쇄 경로가 시계를 빼 온 것은
  결함이 아니라 의도였다.
- "미리보기≠인쇄"는 문제가 아니다. F-5(인쇄 시각의 의미)는 **불필요**해졌다.
- `packages/render` 계약은 **시계 때문에 바뀌지 않는다**. 텍스트 때문에만 확장한다.
- 시계는 **plan에 담기지 않으며** print/export와 공유할 결정적 plan을 전제하지 않는다.
- 시계 구현 범위는 조사 §8.4 ⓐ 갈래 — **preview overlay 계약과 timer lifecycle뿐**이다
  (DOM 분리 여부 · 1초 갱신 필요성 · 타이머 정확히 1개 보장 · 실물 부착 안내 문구).

Founder 텍스트 묶음 일괄 승인:

- F-1: 1차는 액자 key 기반 `textZones`만. 케이스 자유 배치 텍스트는 별도 스펙.
- F-2: 고객 색·그림자 변경 1차 미지원. 운영자 zone 스타일이 단일 정본.
- F-3: 운영자 `defaultTexts`는 값으로 자동 입력하지 않고 placeholder로만 표시한다.
- F-6: zone별 길이 상한을 계약 필드로 두고 초과 입력을 차단한다. 자르기·말줄임·자동복구 없음.
- F-7: zone별 줄 수 상한, 기본 2줄로 통일한다.
- F-8: 다섯 키를 균일 처리하되 `name2` 기본값은 만들지 않는다. admin 편집기 확장은 별도 스펙.

- 이 라운드 변경: **문서 전용** — 결정 문서 1 신규 + `docs/codex-claude-handoff/CURRENT.md` +
  `docs/live/CLAUDE_LIVE_PATCH_LOG.md` + 이 문서 + `Automation/NEXT_CLAUDE_PROMPT.md`
- 제품 코드·테스트·CSS·설정·manifest·`package.json`·`pnpm-lock.yaml` diff **0**, 신규 의존성 0
- 텍스트·시계 제품 코드 **0**, 구현 스펙 작성 **0**(Codex 소유)
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**, 운영 데이터·secret 접근 0
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않았다

다음 전이: Codex가 이 결정을 입력으로 **스펙 031 구현 계약**을 작성하면 `WAITING_FOR_CLAUDE`.
