# DENN automation state

```yaml
updated_at: 2026-07-30
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-029-pointer-pan-zoom-editing
active_unit: spec-030-image-rotation-investigation
state: FOUNDER_DECISION_REQUIRED  # 스펙 030 조사 승인 · 제품 회전 범위 결정 대기
baseline_commit: 8d20b6d
candidate_commit: 110511e  # 스펙 029 보완 라운드 1 코드/test (최초 구현 95fcf92)
verified_commit: 110511e  # 스펙 029 승인분 (스펙 028은 d4fb99b)
origin_relation: "spec 029 closing doc commit pushed fast-forward on top of 0512c8d; HEAD=origin, ahead/behind 0/0"
working_tree: "dirty: the two known spec-018 PNGs plus the Codex-owned uncommitted DENN_AUTOMATION_RUNBOOK.md; Claude touches neither"
fix_round: 1
max_fix_rounds: 3
next_transition: WAITING_FOR_CLAUDE
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

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
