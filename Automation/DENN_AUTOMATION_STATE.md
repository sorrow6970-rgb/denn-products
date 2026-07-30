# DENN automation state

```yaml
updated_at: 2026-07-30
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-028-template-art-stretch-cors-owner
active_unit: spec-029-pointer-pan-zoom-investigation
state: READY_FOR_CODEX
baseline_commit: d21531c
candidate_commit: null  # 조사 문서 커밋(아래 절) — 제품 코드 후보 없음
verified_commit: d4fb99b  # 스펙 028 승인분
origin_relation: "investigation doc commit pushed fast-forward on top of d21531c; HEAD=origin, ahead/behind 0/0"
working_tree: "dirty: only the two known Codex E2E-regenerated spec-018 PNGs; they must not be restored, staged, or committed"
fix_round: 0
max_fix_rounds: 3
next_transition: CODEX_VERIFYING
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

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
