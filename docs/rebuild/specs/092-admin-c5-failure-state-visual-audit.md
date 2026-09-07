# 092 - 운영자 C5 실패·복구 안내 시각 감사

## 상태

`DONE / CODEX_PASSED / LOCAL_VERIFIED`

최종 결과는 [감사 보고서](../../codex-claude-handoff/reviews/2026-09-07-spec-092-admin-c5-failure-state-visual-audit.md).
같은 Codex의 구현·검토이며 독립 검수/Founder 시각 승인/운영 검증은 아니다. 아래 작성·검증 전 문구는 이력이다.

2026-09-07 최신 승인: 사용자 `스팩 자동구현 쭉해줘 아까 정한 규칙대로`에 따라 Codex가 계약 검토 후
아래 한정된 감사 구현·로컬 검증을 직접 진행한다. 다섯 상태, controller 권한, 실제 Card 경계,
기존 fixture 조작을 소스와 재대조했고 계약 모순은 발견하지 않았다. 같은 Codex의 검토이며 독립 검수 아님.
아래의 “이번 미실행/계약 작성만/승인 전” 문구는 최초 계약 작성 시점의 이력이다.
새 제품 선택·보호 범위·운영 권한·의존성 경계는 그대로다. 예약 자동화는 만들지 않는다.

2026-09-07, Codex. 기준 HEAD=origin `54aa472`, `rebuild/modern-studio`, ahead/behind0/0.
사용자의 `응 다음 진행해줘`는 NEXT의 **계약 문서 작성** 단계다. 이번에 test/PNG/측정값을 만들거나
브라우저·게이트를 실행하지 않는다. 아래 실행 범위는 계약 검토 후 별도 실행 단계에만 적용한다.
직전 spec091 DONE/CODEX_PASSED 유지. 운영 전환 보류, UI 정책·복구 의미 변경 승인이 아니다.

## 목표 (WHY)

[084 감사 §5](../../codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md)의
C5 dirty/conflict/save-error 시각 공백 중 기존 fixture에서 도달 가능한 부분만 측정한다.
[전체 잔여 검토 §5](../../codex-claude-handoff/reviews/2026-09-07-rebuild-remaining-roadmap-review.md)의
후보를 계약화한다. 동작 E2E 통과를 최종 시각 승인이나 서버 원자성 증명으로 대체하지 않는다.

## 범위 (SCOPE)

- 포함: 기존 실제 FramePrintSizeEditor를 합성 fixture에 마운트한 상태5개, viewport3개,
  제품 영역 캡처·수치 측정·시각 finding·출처 문서.
- 제외: 제품 UI/CSS/문구/동작 수정, 저장 의미·retry/merge/REC/Rules 변경, 새 controller/seam,
  save-error/load-error/auth expiry/loading/saving 상태 생성, 성공 저장 시각 감사, 실제 운영 화면 검증.
- 디자인 기준: 현재 Modern Studio 보존. 새 디자인 시스템·폰트·아이콘·이미지/기능을 도입하지 않는다.
  admin panel 감사는 design-taste-frontend의 랜딩/리디자인 적용 대상이 아니다.

## 근거와 상태 도달 절차 (HOW)

읽은 소스: [fixture](../../../apps/admin/src/e2e/admin-write-fixture.tsx),
[기존 동작 E2E](../../../tests/e2e/admin-write-editor.spec.ts),
[편집기](../../../apps/admin/src/admin-write/FramePrintSizeEditor.tsx),
[controller](../../../apps/admin/src/admin-write/session-controller.ts),
[Card](../../../packages/ui/src/components/Card.tsx).

각 상태/viewport는 새 page에서 독립 준비한다. URL은 기존
`http://localhost:4184/e2e-admin-write-fixture.html`만 사용한다. 기본 `/admin/`에 gate를 주입하지 않는다.

공통 준비: fixture-status=unloaded, write-factory-calls=0, save-calls=0을 확인한다.
제품 `편집 기준 불러오기` 클릭 → ready-clean/revision3/factory1 → 사이즈 `a4` 명시 선택 →21/29.7 확인.
상태를 window/store/React에 직접 주입하지 않고 실제 label/testid/control로만 조작한다.

| 캡처 slug | 공통 준비 이후 명시 행동 | 확인 상태·안내 | 캡처 시 fake save / revision / expectedBase |
|---|---|---|---|
| dirty-valid | 폭22, 높이30 입력, 저장하지 않음 | ready-dirty-valid / 저장할 수 있는 변경입니다. | 0 / 3 / none |
| dirty-invalid | 폭22, 높이를 빈 문자열로 입력 | ready-dirty-invalid / 폭과 높이를 올바르게 입력하세요. | 0 / 3 / none |
| conflict | fixture의 다음 저장 충돌 선택, 폭22/높이30 입력, 제품 변경 저장1회 | conflict / 다른 저장이 먼저 반영됐습니다. 최신 상태를 다시 불러오세요. | 1 / 3 / 3 |
| outcome-unknown | fixture의 다음 저장 결과 미확정 선택, 폭22/높이30 입력, 제품 변경 저장1회 | outcome-unknown / 저장 결과를 확인할 수 없습니다. 최신 상태를 다시 불러오세요. | 1 / 3 / 3 |
| discard-confirmation | conflict 경로 후 제품 편집 기준 불러오기 클릭 | discard-confirmation / 현재 초안을 폐기해야 다시 불러올 수 있습니다. | 1 / 3 / 3 |

모든 값은 기존 합성 데이터다. discard-confirmation의 진입 출처는 conflict 한 가지로 고정한다.
다른 진입 출처까지 시각 검증했다고 보고하지 않는다. fixture SaveMode는 success/conflict/outcome-unknown뿐이다.

컨트롤 의미는 현재 derive와 동일하게 단언한다: dirty-valid는 편집/불러오기/저장 가능,
dirty-invalid는 편집/불러오기 가능·저장 불가, conflict/outcome-unknown은 불러오기만 가능,
discard-confirmation은 select/치수/일반 불러오기/저장 비활성·명시 폐기 버튼만 활성이다.
캡처·Tab 검사 전후 save 횟수와 revision이 유지돼야 한다. 이 관찰 구간 밖의 영구적 무재시도를 증명한다고 쓰지 않는다.
discard-confirmation 캡처 이후에만 명시 폐기 버튼을 클릭해 ready-clean/revision3/save1을 확인한다.
재로드 후 치수 입력 UI가 자동 초기화된다고 추측하거나 그 기대를 새로 도입하지 않는다.

## 제품 영역과 증거 신뢰 등급

등급은 모두 `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`다. 실제 Firebase/운영 auth/Storage 상태 아님.
영역 selector는 `.denn-card:has([data-testid="frame-print-size-editor"])`로 고정한다.
count1, 현재 편집기 root를 포함하는 실제 Card임을 확인하고 `locator.screenshot()`으로 캡처한다.
외부 box-shadow까지 포함한다고 주장하지 않는다. 카드 내부 padding/border는 포함해야 한다.

- fixture 제목, remote auth 카드, `section[aria-label="합성 fixture 진단"]`는 캡처에서 제외한다.
  캡처 bbox와 해당 요소의 bbox가 겹치지 않는지 검사한다. 화면 밖·불필요한 crop으로 제품을 숨기지 않는다.
- 제품 영역을 재부모화하거나 fixture chrome을 삭제/숨겨 레이아웃을 바꾸지 않는다. F-6의 inner-stack
  crop 오판을 반복하지 않는다. 타이틀/진단이 측정 제품 영역으로 섞이면 증거 오류로 중단한다.
- 제품 영역의 색/폭/문구/disabled/role/tabindex/CSS는 변경하지 않는다. 새 UI용 data attribute도 추가하지 않는다.
- 캡처 전 document.fonts.ready와 현재 상태/활성 상태를 기다린다. 기존에 실행 중인 CSS transition의
  finish 및 screenshot animations disabled만 test-only 안정화로 허용한다. 시간 늘리기·sleep·제품 재렌더
  강제는 금지다. 필요하면 신규 spec 파일에만 기존 선례의 disable-partial-raster launch arg를 쓴다.
  폰트/배경/색을 대체하지 않는다. 이 화면에는 clock 캡처 목적이 없으므로 시간을 고정할 필요가 없다.

## 측정과 판정

페이지 이동 전에 네트워크 차단/관찰을 설치한다. HTTP(S)는 정확한 localhost:4184 origin만 계속하고
나머지는 송신 전 abort + 시도 횟수 기록. 의도치 않은 외부 요청 시도도0이어야 한다.
fixture의 synthetic.invalid는 fake 구성값이지 요청할 서버가 아니다. 신규 SDK/live/emulator 호출0.

각 상태마다 다음을 measurements.json에 원시 결과로 남긴다. PII/원본 SDK 오류/URL 전문을 기록하지 않는다.

- viewport, state slug/실제 상태, provenance, 준비 절차, Card bbox, document 및 Card 가로 overflow.
- 제품 controls의 안전 label/testid·DOM 순서·bbox·disabled 여부. 화면 높이보다 긴 Card는 정상 세로
  스크롤과 구별한다. viewport 아래 있다는 이유만으로 overflow 결함을 만들지 않는다.
- enabled pointer target의 width/height44px 기준 위반 목록. disabled control 치수도 별도 기록하되
  동작 가능한 버튼의 위반 수와 섞지 않는다. native option은 개별 pointer target으로 세지 않는다.
- 실제 Tab 이동으로 제품 내 enabled controls가 DOM 순서대로 도달하고 초점 표시/가림을 확인한다.
  초기 body focus만 기존 선례대로 일시적으로 설정·원복할 수 있다. 제품 control에 .focus()를 호출해
  키보드 검증을 대신하지 않는다. fixture/auth 외부 stops는 따로 분류하며 제품 집계에서 제외한다.
  bounded 최대40회 Tab로 한 순환만 조사하고 Enter/Space로 저장을 실행하지 않는다.
- AxeBuilder include를 동일 Card selector로 제한하고 serious/critical을 기록한다. fixture 대비 문제를
  제품 결함으로 보고하지 않는다. axe0을 스크린리더/전체 접근성 인증으로 표현하지 않는다.
- console error/warning/pageerror 횟수, 외부 요청 시도 수, fake save/revision/factory 수치의 전후 비교.
- Card의 표시 텍스트/ARIA/data-*에 WRITE_* 오류, synthetic API/도메인/경로/CID, fixture 진단이0인지 검사.
  기존 form option value의 합성 항목 ID를 새 민감정보 노출로 오판하지 않는다. 실제 UID는 사용하지 않는다.

판정은 분리한다:

1. **동작·차단·출처 게이트:** 잘못된 상태, 자동 save/외부 요청, 자료 누락, 보호/범위 위반은 FAIL/STOP.
2. **시각 감사 finding:** clipping·touch target·읽기 흐름·focus·axe·문구 구분 문제는 측정값과
   P1/P2/UNCONFIRMED로 보고한다. 감사 test가 사실을 수집한 PASS와 제품 화면 PASS를 구별한다.
   알려지지 않은 결함을 고치거나 기존 테스트 기대값을 약화하지 않는다.
3. 보고서에 각 화면 `PASS / FINDING / NOT TESTED`를 두고 모든 PNG를 직접 연다.
   스크린리더 실낭독·실기기·실제 auth/쓰기/복구는 NOT TESTED다. 정책 판단은 Founder에게 분리한다.

## 대상 파일 (WHERE)

### 이번 계약 작성 단계

이 계약, 신규 `docs/handoff/2026-09-07-spec-092-admin-c5-failure-state-visual-audit-handoff.md`,
STATE/NEXT/CURRENT/live만 작성·갱신한다. 기존 로드맵 보고서와 spec091 handoff 미커밋분은 보존한다.
이번 commit/push/stage 및 제품·test·PNG·게이트 실행0.

### 계약 검토 후 감사 실행 단계의 한정 목록

- 신규 `tests/e2e/admin-write-failure-visual.spec.ts` 한 파일.
- 신규 `docs/rebuild/results/spec-092/README.md`, `measurements.json`.
- 신규 `docs/codex-claude-handoff/reviews/2026-09-07-spec-092-admin-c5-failure-state-visual-audit.md`.
- 위 계약/handoff/STATE/NEXT/CURRENT/live.
- 아래 PNG 정확히15개. PNG 이름의 수치는 viewport이며 Card 영역 PNG의 픽셀 크기는 별도 측정한다.

| 상태 | 320x568 | 390x844 | 1280x800 |
|---|---|---|---|
| dirty-valid | c5-dirty-valid-320x568.png | c5-dirty-valid-390x844.png | c5-dirty-valid-1280x800.png |
| dirty-invalid | c5-dirty-invalid-320x568.png | c5-dirty-invalid-390x844.png | c5-dirty-invalid-1280x800.png |
| conflict | c5-conflict-320x568.png | c5-conflict-390x844.png | c5-conflict-1280x800.png |
| outcome-unknown | c5-outcome-unknown-320x568.png | c5-outcome-unknown-390x844.png | c5-outcome-unknown-1280x800.png |
| discard-confirmation | c5-discard-confirmation-320x568.png | c5-discard-confirmation-390x844.png | c5-discard-confirmation-1280x800.png |

5상태×3 viewport=15측정/15PNG. README는 각 PNG의 유일한 provenance 행, 상태·viewport·local fixture URL·
준비 절차·Card selector·SHA-256·측정/시각 판정을 포함한다. JSON도 동일한15개 key만 사용한다.
생성 시각 차이를 결정성 비교에 섞지 않는다. raw SDK message나 secret은 넣지 않는다.

## 검증 절차 (VERIFY) — 이번에는 미실행

1. 시작 Git/보호 hash/기존 생성물 hash/ports4183/4184/4185/8080/9099/9199를 읽기 전용 확인.
   신규 의존성/설치/다운로드0. 점유 port는 kill하지 않고 STOP.
2. 신규 test만 구현. `node scripts/check.mjs`로 format/lint/typecheck/unit/build를 순차 실행.
3. 기존 canonical `node scripts/e2e-run.mjs`를1회 실행. script나 기존 E2E/fixture/config는 바꾸지 않는다.
   run이 소유한 OS temp staging과 기존 preview handle만 사용한다. 신규 test15상태/viewport 사례와
   README/JSON/PNG 정합 test를 설계하고 실제 총 test 수는 출력에서 보고한다.
4. 신규15PNG 직접 확인, README/JSON 정합, 제품/fixture 경계, 범위 밖 diff0, bundle 불변,
   diff --check, port/temp 잔류0 확인. 제품 hash는091 handoff를 기준으로 한다.
5. 원인 불명 timeout/실패는 재실행으로 숨기지 않고 STOP. spec091 과거 timeout은 미재현이어도 원인 UNCONFIRMED.
   timeout/retry/worker/skip/스크린샷 허용차 변경0. 추가 실행은 목적과 허용 범위를 확인한다.
6. 측정 계약/증거/게이트를 만족한 뒤 감사 완료를 판단한다. finding이 있으면 UI 합격이라고 부르지 않고
   후속 후보로 분리한다. 새 제품 정책/수정은 이 감사에 포함하지 않는다.

## 보호·예외·STOP (RISK)

- 절대 보호: docs/rebuild/design/taste-v2/**, docs/rebuild/design/README.md,
  docs/rebuild/specs/038-page-design-prototype.md, docs/rebuild/results/spec-018/browse-desktop-1280x800.png,
  docs/rebuild/results/spec-018/browse-mobile-390x844.png, packages/render/src/plan/index.ts,
  pnpm-workspace.yaml, AGENTS.md. 수정/복원/stage/commit 금지.
- 향후 canonical 실행에는 기존 spec018 test가 보호 PNG2를 재생성하는 알려진 예외가 있다.
  실행 전후 hash를 기록하고 그2개만 생성 차이를 보존한다. restore/stage/commit하지 않는다.
  이번에는 실행하지 않았다. 다른 기존 PNG/measurements/README 차이는 자동 허용하지 않고 STOP.
- apps/**, packages/**, 기존 tests/scripts, Rules/firebase*.json/.firebaserc, manifests/lockfile,
  기존 results 변경 금지. Canvas/발행 크기/F-8/저장·발행 계약 유지.
- live/실제 Firebase/project/bucket/UID/운영 데이터, emulator, write/upload/delete/publish/deploy,
  운영 flag/자동 retry/merge/orphan cleanup, C6/L-4, 외부 asset/신규 의존성, 자동화는 열지 않는다.
  fixture fake.save는 합성 호출이며 실제 쓰기가 아니다.
- 문서/신규 test 범위 밖 변경, source와 계약 모순, 도달 불가 상태, 증거 누락, 비재현 gate는 STOP.
  구현자가 scope 확대·제품 UI 수정을 결정하지 말고 QUESTIONS에 기록한다.

### QUESTIONS

2026-09-07 구현 중 자체 검토: 최초 check2517/2517·canonical246/246(47.6초) PASS 후,
민감정보 검사에서 fixture CID의 정확한 값 `abcdef0123456789`를 추가했다. 기존 product/fixture 변경0.
현재 스펙 안의 테스트 완전성 보완1회다. 최종 코드 검증을 위해 check와 canonical을 각각1회 더 실행한다.
이는 원인 불명 실패 재시도/게이트 완화가 아니며 각 실행 결과를 구분한다. 신규 PNG가 동일한지도 비교한다.

계약 검토 대기. 현 시점에 새로운 제품 결정 질문은 없다. save-error 등 미지원 fixture 상태는 명시 제외.
계약의 읽기/경로 검사는 브라우저 실행 증거가 아니다. 구현/측정은 아직 승인·실행하지 않았다.

### 계약 작성 결과 (Codex) — 2026-09-07

기존 fixture/controller/UI/test 읽기로5상태의 준비 조작·활성/비활성 분기를 대응시켰다.
신규 spec/handoff/상태 문서만 작성. test/PNG/측정 생성0, check/E2E/emulator0, commit/push/stage0.
기존 관리 추정85~88%/잔여12~15%는 유지하지만 전체 실측률은 확인 불가, 계약만으로 진행률을 올리지 않는다.

### DONE (Codex) — 2026-09-07

테스트·증거18파일 커밋 `36eb15a`. 종료 문서7파일은 별도 커밋·push 단계다.

신규 감사test1·PNG15·README/JSON2, 보고서 작성. 기존 제품·fixture·test·config 변경0.
최종 check PASS(unit2517/2517), canonical246/246(48.6초) PASS. 최초246/246(47.6초) 이후
합성 CID 누출 검사 보강1회만 수행했고 최종 재검증했다. PNG15/JSON/README는 두 실행에서 동일.
15PNG 직접 시각 확인, 측정·시각 finding 미발견. 정확한 한계·hash·보호 예외·명령은 감사 보고서 참조.
보호 PNG2는 알려진 canonical 재생성만 발생, restore/stage/commit0. 나머지 보호18개 불변.
포트6개 listener0, 두 staging 제거. 운영·실제 Firebase·UID·배포·자동화0. 전체 추정85~88% 유지.
