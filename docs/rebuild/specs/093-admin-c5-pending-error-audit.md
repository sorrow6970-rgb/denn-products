# 093 — C5 진행·오류·인증 만료 합성 검증

2026-09-07, 기준 `cca5a16`, rebuild/modern-studio, HEAD=origin·0/0.
상태 **DONE / CODEX_PASSED / LOCAL_VERIFIED / UI FINDING 1**. 사용자 연속 구현 지시와092 NEXT에 따른 test-only 단위다.
092는36eb15a/b9a24c5/cca5a16 일반 push 완료. 같은 Codex가 계약 검토·구현·검증한다.
운영 연결·배포·실제 Firebase/UID·새 제품 결정·자동화는 계속 금지한다.

## WHY / 근거

092에서 제외한 pending/error/auth 상태를 기존 제품 포트와 상태 의미 그대로 검증한다.
[session-controller](../../../apps/admin/src/admin-write/session-controller.ts)의 derive/loadBaseline/save/resetForAuth,
[controller unit](../../../apps/admin/src/admin-write/session-controller.test.ts)의 explicit upload retry 및 late auth,
[편집기](../../../apps/admin/src/admin-write/FramePrintSizeEditor.tsx)의 STATUS_MESSAGE와 버튼 조건,
[합성 fixture](../../../apps/admin/src/e2e/admin-write-fixture.tsx)를 대조했다.
기존 fixture는 즉시 성공/충돌/결과미확정만 지원하므로 시험 전용 응답 보류·오류·auth observer가 필요하다.
제품 함수/상태/포트/API는 추가하지 않는다. 디자인 변경이 아니라 관리 화면 감사이므로 디자인 생성 스킬 대상 아님.

## WHAT / HOW

기존 fixture URL에 `?audit=spec093`이 정확히 있을 때만 추가 진단 controls를 보인다.
query가 없는092/기존 E2E의 DOM·기본 동작·진단 controls는 보존한다. 새 entry/config/URL route 없음.
test-only fake의 load/save mode와 명시 release callback으로 Promise를 보류한다. sleep/시간 지연/timeout 변경0.
auth 만료는 facade observer에 null을 전달한다. 실제 sign-in/UID/토큰을 사용하지 않는다.
시작 baseline revision3/a4 21×29.7, 수정22×30, CID는 기존 합성값. 매 사례 새 page.
가짜 원격 revision과 완료 횟수도 진단 영역에만 노출해 늦은 응답이 실제로 끝났음을 확인한다.

| 캡처 slug | 조작 | 상태 / revision / load·save | 편집/불러오기/저장 | 캡처 후 명시 동작 |
|---|---|---|---|---|
| loading | load 보류 선택→제품 load | loading / none / 1·0 | 모두 off | load release→ready-clean/rev3/load1 |
| saving | load→a4수정→save 보류→제품 save | saving / 3 / 1·1 | 모두 off | save release→ready-clean/rev4/save1 |
| load-error | load 실패 선택→제품 load | load-error / none / 1·0 | load만 on | 성공 모드→제품 load→ready-clean/rev3/load2 |
| upload-failed | load→a4수정→upload 실패 선택→save | save-error / 3 / 1·1 | load/save on, 편집 off | 성공 모드→제품 save→rev4/save2/base3 |
| head-failed | load→a4수정→head 실패 선택→save | save-error / 3 / 1·1 | load만 on | load→discard확인→명시 폐기/reload→rev3/load2/save1 |
| auth-blocked | load→a4수정→합성 auth 만료 | auth-blocked / none / 1·0 | 모두 off | 재로그인/자동 복원 없음 |

load 실패 코드는 기존 NETWORK_UNAVAILABLE. save 실패는 WRITE_UPLOAD_FAILED(retryable:true)와
WRITE_HEAD_FAILED(retryable:false)를 구분한다. 같은 save-error 문구여도 버튼 의미가 다름을 기록한다.
upload 실패 명시 재시도는 현재 계약이지 자동 retry 승인 아님. head-failed는 명시 폐기/reload만 허용한다.
auth 만료 뒤 기존 input 로컬 텍스트의 잔존을 삭제 결함으로 단정하지 않는다. baseline은 null, controls는 잠겨야 한다.

별도 late-response2건: load 보류→auth 만료→release, save 보류→auth 만료→release.
후자 fake 원격 rev4·save완료1이어도 UI auth-blocked/revision none을 유지해야 한다. 실제 서버 결과 증명 아님.
late 사례는 새 PNG를 만들지 않는다. 재인증/브라우저 종료/실제 세션 만료 시간은 NOT TESTED다.

## WHERE — 허용 파일

- 기존 `apps/admin/src/e2e/admin-write-fixture.tsx`만 test-only 확장.
- 신규 `tests/e2e/admin-write-pending-error.spec.ts`.
- `docs/rebuild/results/spec-093/README.md`, `measurements.json`.
- PNG18: `c5-{loading,saving,load-error,upload-failed,head-failed,auth-blocked}-{320x568,390x844,1280x800}.png`.
  정확히6slug×3viewport=18. 제품 Card crop이며 PNG 픽셀 크기는 viewport와 별개다.
- 이 계약, `docs/handoff/2026-09-07-spec-093-admin-c5-pending-error-audit-handoff.md`,
  `docs/codex-claude-handoff/reviews/2026-09-07-spec-093-admin-c5-pending-error-audit.md`, STATE/NEXT/CURRENT/live.
- 092 handoff는 전송 영수증 문구만. 이전 roadmap/spec091handoff 미커밋2는 보존·커밋 제외.

제품 apps/**(위 fixture 한 파일 제외)/packages/**/기존 tests/scripts/config/Rules/package/lockfile/.gitignore
변경 금지. JSON은 합성 측정 산출물 한 파일만 명시 추적 가능. 제품 정책·문구·복구 의미는 바꾸지 않는다.

## VERIFY

1. 기존 보호20·결과 파일 hash, Git, ports4183/4184/4185/8080/9099/9199 확인. 점유하면 STOP, kill0.
2. fixture에서 기본과 opt-in 모드를 분리하고 실제 UI 조작만 사용. state 직접 주입/제품 .focus()0.
3. 이동 전 localhost4184만 허용하고 외부 요청 abort+attempt0. raw 오류/URL/실제 데이터 수집0.
4. 같은 `.denn-card:has([data-testid="frame-print-size-editor"])`를 capture/axe 대상으로 삼는다.
   count1·내부 editor1, 제목/auth/진단 bbox와 비중첩. 제품 DOM 숨김·이동·색/레이아웃 변경0.
5. 각 상태의 정확한 문구/활성 flags/호출·revision/완료·pending을 단언한다. 검사 중 자동 load/save0.
   보류 promise는 명시 release로 끝내며 마지막pending0 확인. screenshot은 animation disabled,
   fonts.ready/current animation finish, test-only disable-partial-raster 허용. clock/sleep0.
6. 18PNG 전부 직접 열고 README의18행과JSON18key/파일명·SHA 일치 검증.
   geometry/가로 overflow/enabled44px·disabled분리/Tab DOM순서·focus indicator·가림/axe중대/
   console·pageerror/민감 문자열 누출/외부 요청 수를 기록. fixture controls는 제품 집계 제외.
   키보드 최대60 Tab 한 순환(확장 진단 버튼 포함), 제품 조작 대체 focus0.
7. 신규18상태+late2+manifest1=21 E2E 추가 계획. `node scripts/check.mjs`→`node scripts/e2e-run.mjs`.
   결과 총수는 실제 출력으로 보고한다. 제품 고객/운영자 entry hash092동일. 기본092 산출물 무변경 확인.
8. 기능/출처/누출/범위 실패는 FAIL/STOP. 시각 finding은 P1/P2/UNCONFIRMED로 별도 기록, 제품 수정0.
   감사 수집 PASS와 UI 승인/운영 검증은 구분한다. flaky/원인불명 timeout이면 재실행으로 숨기지 않는다.
9. diff --check, staging/port잔류0, 허용 파일만 별도 commit. 원격 전송은 구체적 권한 승인 경계를 따른다.

## 보호와 STOP

taste-v2/**, design/README.md, specs/038-page-design-prototype.md, spec018 PNG2, render/src/plan/index.ts,
pnpm-workspace.yaml, AGENTS.md 수정/복원/stage/commit 금지. canonical의 기존 spec018 PNG2 재생성만
이전 명시 예외를 유지하고 전후hash 기록·보존. 다른 기존 PNG/JSON 변경은 STOP, 자동 범위 확장하지 않는다.
실제 Firebase/project/bucket/UID/data·emulator·deploy·운영 gate·upload/delete/publish/C6/L4/자동화 금지.
제품 변경이 필요하면 발견 근거와 QUESTIONS만 남긴다. 새 기능 계약이나 출시 범위를 대신 결정하지 않는다.

### QUESTIONS

새 제품 결정 없음. 기존 상태·포트의 응답만 합성으로 제어한다. 실제 auth/원격CAS/사용성 승인은 NOT TESTED.
전체85~88%는 기존 관리 추정, 잔여100-88=12~100-85=15%. 새 실측 완료율은 확인 불가다.

### DONE (Codex) — 2026-09-07

시험 전용fixture/test/증거22파일 `1e322c1`. 별도 종료 문서8파일(092 영수증 포함).
원격은092까지만승인·동기화됐고093은명시전송범위확인대기(새push시도0).실제HEAD는Git종료기록참조.

fixture opt-in 확장·신규test·18PNG/JSON/README 구현. 제품controller/UI/포트/config 변경0.
check2517/2517(94파일2.79초), canonical267/267(50.2초), exit0·skip/retry0. 신규21건포함.
18PNG직접확인;측정 finding0,수동시각문구F-9(P2)1개. 실제복구동작은계약대로이며093에서UI수정0.
상세판정·hash·보호예외·한계: [감사보고서](../../codex-claude-handoff/reviews/2026-09-07-spec-093-admin-c5-pending-error-audit.md).
다음후보094는기존canSave에따라save-error복구문구를분리하는UI단위다.별도계약선행,동작/권한불변.
