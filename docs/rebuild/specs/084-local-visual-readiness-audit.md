# 084 - 운영 연결 전 로컬 시각 준비도 감사

## 상태

- `READY_FOR_CLAUDE`
- 기준 브랜치: `rebuild/modern-studio`
- 기준 commit: `HEAD=origin=94db3e27ec489315b93dbb8429ff93b975ad217f`, ahead/behind `0/0`
- 직전 완료: spec 083 `DONE / CODEX_PASSED / LOCAL_VERIFIED / NO_LIVE_NETWORK`
- 이 단위는 **감사와 증거 캡처 전용**이다. 제품 UI/UX 수정은 승인하지 않는다.

## 목표 (WHY)

현재 리빌드 화면이 어떤 상태까지 실제 로컬 브라우저에서 보이는지, 어떤 PNG가 제품 화면인지, 어떤 PNG가
합성 fixture인지 검증 가능한 증거로 정리한다. 자동 테스트 통과와 최종 시각 승인 사이의 공백을 먼저
측정하고, 후속 Claude Code UI 구현 단위가 추측이 아니라 화면별 결함 목록에서 시작하게 한다.

현재 확인된 직접 근거:

- spec 018 고객 browse PNG와 spec 063/080 고객 Space PNG는 제품 화면을 담는다.
- spec 083 PNG는 화면 제목이 `E2E fixture (not a product screen)`이고 전체 페이지 아래에 fixture 진단값과
  제어 버튼이 포함된다. 따라서 기능 E2E 증거로는 유효하지만 최종 운영자 UI 승인 자료로 사용할 수 없다.
- 현재 결과 폴더에는 고객 composer, 운영자 기본 shell, C5 편집기, 오류·빈 상태를 한 기준으로 비교하는
  완결된 시각 매트릭스가 없다.

## Design Read

기존 Modern Studio를 보존하는 감사 우선 리디자인이다. 새 미학을 발명하지 않는다.

- 고객 화면: `DESIGN_VARIANCE 5 / MOTION_INTENSITY 3 / VISUAL_DENSITY 4`
- 운영자 화면: `DESIGN_VARIANCE 3 / MOTION_INTENSITY 2 / VISUAL_DENSITY 6`
- Modern Studio의 화이트 base, neutral gray, warm taupe accent, 한국어 UI, 기존 정보 구조를 보존한다.
- 이 단위에서는 위 값을 구현 지시로 사용하지 않고 감사 분류 기준으로만 사용한다.
- `docs/rebuild/design/taste-v2/**`, 수정된 `docs/rebuild/design/README.md`,
  `docs/rebuild/specs/038-page-design-prototype.md`는 Founder/user 소유 dirty 보호 대상이다. 읽기 결과를 새
  승인처럼 승격하거나 수정·stage·commit하지 않는다.
- 외부 디자인 시스템·아이콘·폰트·이미지·신규 dependency를 도입하지 않는다.

## 범위 (SCOPE)

### 포함

1. 기존 제품 route와 합성 fixture를 사용한 local Chromium 시각 증거 수집.
2. 각 증거를 `PRODUCT_ROUTE`, `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`, `FIXTURE_CONTROL_ONLY` 중 하나로
   표시하는 provenance 계약.
3. desktop, mobile portrait, mobile landscape 상당 viewport의 overflow·접근성·console·network 측정.
4. 화면별 `PASS / FINDING / NOT TESTED` 감사표와 후속 UI 보완 후보 작성.
5. 기존 canonical E2E에 포함되는 재현 가능한 시각 감사 spec 한 파일과 spec 084 결과 PNG.
6. 제품 컴포넌트만 캡처해야 할 때 Playwright locator screenshot 또는 캡처 직전 test-only DOM 가림을
   사용한다. 제품 source의 DOM·문구·스타일은 바꾸지 않는다.

### 제외

- `apps/**`, `packages/**` 제품 source·CSS·test 수정.
- 실제 UI/UX 디자인 보완, 문구 변경, 레이아웃 재구성, 신규 컴포넌트.
- 기존 E2E 의미·assertion·timeout·retry·skip 변경.
- package manifest, lockfile, workspace, Rules, Firebase config, Hosting config 변경.
- 실제 Firebase/project/bucket/data/network, emulator, 실제 UID, 운영 발급·저장·publish·deploy.
- Lighthouse·Core Web Vitals의 운영 수치 보장. 로컬 합성 페이지에서 추정값을 만들지 않는다.
- 실제 iPhone Safari·Android Chrome·실기기 GPU/폰트/브라우저 chrome 검증.
- spec 018 보호 PNG의 restore·checkout·stage·commit.
- 감사 결과를 근거로 후속 UI 수정 스펙을 자동 시작하는 것.

## 증거 신뢰 등급

| 등급 | 의미 | 허용 결론 |
|---|---|---|
| `PRODUCT_ROUTE` | 실제 앱 entry/route와 제품 composition을 local synthetic data로 렌더 | 해당 로컬 route의 화면 상태를 확인 |
| `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE` | 실제 제품 component를 합성 port/composition 안에서 렌더 | component 시각 상태만 확인, 운영 route 전체로 일반화 금지 |
| `FIXTURE_CONTROL_ONLY` | 진단값·상태 전환 버튼 등 test harness 자체 | 기능 테스트 보조일 뿐 UI 승인 증거로 사용 금지 |

감사 보고서와 PNG index에는 모든 이미지의 등급, route/fixture URL, viewport, 준비 절차, synthetic/live 여부를
반드시 기록한다. 합성 fixture를 제품 화면이라고 부르지 않는다.

## 캡처 매트릭스

Claude Code는 현재 코드로 실제 도달 가능한 상태를 먼저 확인하고 아래 매트릭스를 채운다. 도달하지 않는
상태를 test-only 마크업으로 꾸며내지 말고 `NOT TESTED`로 남긴다.

### 고객 앱

1. browse ready: `1280x800`, `390x844`.
2. composer ready + 실제 Canvas: `1280x800`, `390x844`, `844x390`.
3. Space V1 blocked notice: `390x844`.
4. Space V2 password gate와 confirmed viewer: 각각 `390x844`, viewer 추가 `1280x800`.

### 운영자 앱

5. 실제 admin root의 default-off/config 상태: `1280x800`, `390x844`.
6. C5 editor에서 실제 도달 가능한 ready/dirty 또는 blocked 상태: `1280x800`, `390x844`.
7. Space V2 issue panel의 frozen draft 상태: `1280x800`, `390x844`.
   - spec 083 fixture를 사용할 수 있지만 `space-v2-issue-panel` 제품 영역만 locator screenshot으로 캡처한다.
   - fixture 제목, diagnostics, 상태 전환 버튼은 결과 PNG에 포함하지 않는다.
   - provenance는 반드시 `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`로 기록한다.

모든 상태를 반드시 캡처한다는 뜻은 아니다. 현재 계약으로 안전하게 도달하지 못하면 이유와 필요한 후속
경계를 기록하고 그 항목을 `NOT TESTED`로 둔다.

## 화면별 자동 측정

각 캡처에서 다음을 함께 검사한다.

1. `document.documentElement.scrollWidth <= clientWidth`와 주요 shell/container overflow 0.
2. viewport 밖으로 나간 interactive control 0.
3. 표시된 주요 button/input/select의 pointer target이 44x44px 이상인지. native range의 track 자체를
   일반 button과 같은 방식으로 오판하지 말고 조작 가능한 thumb/label 계약을 별도 기록한다.
4. keyboard-only 순서가 DOM 의미 순서와 일치하고 visible focus가 있는지.
5. `@axe-core/playwright` serious/critical 0. axe 0은 전체 접근성 통과와 동의어가 아님을 기록한다.
6. uncaught `pageerror`, console error/warning 0.
7. `localhost`, 필요한 `blob:` 외 요청 0. Firebase/Google Storage/운영 domain 요청이 관찰되면 즉시 STOP.
8. Canvas가 필요한 상태에서 0x0이 아니며 screenshot 직전 ready 상태가 확인되는지.
9. visible copy에 raw SDK message, token, UID, email, object path, fixture diagnostics가 없는지.
10. 고객·운영자 주요 surface를 `320px` 폭에서도 별도 측정해 horizontal overflow와 control clipping 0을
    확인한다. 저장 PNG는 대표 `390x844`를 사용해도 되지만 320px 측정 결과를 보고서에 남긴다.

## 시각 감사 기준

보고서는 최소 다음 항목을 화면별로 판정한다.

- Modern Studio token 일관성: surface, neutral, warm taupe accent, radius, border, shadow.
- 정보 위계: 제목, 설명, 현재 상태, primary action 순서.
- mobile rhythm: 여백, 줄바꿈, sticky/fixed overlap, CTA 접근성.
- 상태 완결성: loading, empty, blocked, error, success가 성공 화면처럼 오인되지 않는지.
- control 일관성: button/select/input/range의 높이, label, disabled/focus/active 상태.
- Canvas와 주변 UI의 비율, clipping, 장식보다 작업 내용 우선 여부.
- 한국어 copy의 명확성. 이 단위에서는 문구를 고치지 않고 finding만 기록한다.
- fixture/debug chrome가 최종 시각 증거와 분리됐는지.

finding은 다음으로 분류한다.

- `P0`: 주문·저장·발급 의미를 오인시키거나 조작을 막는 결함.
- `P1`: mobile overflow, focus/contrast, 상태 위계처럼 출시 전 수정이 필요한 결함.
- `P2`: spacing·타이포·시각 일관성 개선 후보.
- `NOT TESTED`: local Chromium 또는 현재 synthetic contract로 증명하지 못한 항목.

이번 스펙은 finding을 수정하지 않는다.

## 대상 파일 (WHERE)

### 신규 허용

- `tests/e2e/local-visual-readiness.spec.ts`
- `docs/rebuild/results/spec-084/**`
- `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`

### 상태·handoff 문서

- 이 스펙 문서
- `docs/handoff/2026-08-31-spec-084-local-visual-readiness-audit-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`

### 읽기만 허용

- `apps/**`, `packages/**`, 기존 `tests/e2e/**`
- 기존 `docs/rebuild/results/spec-017|018|063|080|083/**`
- design 정본과 관련 spec/handoff

### 명시 금지·보호

- 기존 파일 수정: `apps/**`, `packages/**`, 기존 test, scripts, Playwright/Vite config.
- `package.json`, 모든 package manifest, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
- `storage.rules`, `firestore.rules`, `firebase.json`, `firebase.emulator.json`, `.firebaserc`.
- `docs/rebuild/design/taste-v2/**`
- `docs/rebuild/design/README.md`
- `docs/rebuild/specs/038-page-design-prototype.md`
- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`
- `packages/render/src/plan/index.ts`
- `AGENTS.md`와 기존 user/Founder dirty.

canonical E2E가 spec 018 PNG 두 장을 다시 써도 restore·checkout·stage·commit하지 않는다. 시작·종료 hash를
보고한다.

## 구현 지시 (WHAT / HOW)

1. 시작 시 branch/HEAD/origin/ahead-behind와 전체 dirty를 기록한다.
2. 보호 파일 hash를 기록하고 작업 내내 stage하지 않는다.
3. 기존 E2E helper를 제품 source로 이동하거나 공개 API로 만들지 않는다.
4. 신규 visual spec은 기존 route/fixture를 조작하되 제품 동작 assertion을 약화하지 않는다.
5. screenshot은 deterministic synthetic asset, animation/transition 정지, font·Canvas readiness 확인 후 찍는다.
6. 페이지 전체가 fixture이면 제품 component locator만 캡처한다. test-only diagnostics를 CSS로 제품처럼
   꾸미지 않는다.
7. 결과 PNG 이름은 `surface-state-viewport.png` 형식으로 고정한다.
8. 결과 폴더에 `README.md`를 두고 파일별 provenance·viewport·state·판정을 링크한다.
9. 감사 보고서에는 현재 evidence의 직접 관찰과 자동 측정 결과를 분리한다.
10. P0/P1/P2 finding과 후속 UI 수정 후보를 적되 구현 승인처럼 표현하지 않는다.
11. 다음 스펙 번호·수정 파일은 Codex/Founder 검수 뒤 정한다. 자동으로 제품 코드를 고치지 않는다.

## 검증 절차 (VERIFY)

### Targeted

- 새 visual spec이 canonical staging 없이는 운영 서버를 찾거나 자동 설치하지 않아야 한다.
- 기존 E2E orchestrator를 통해 신규 spec이 전부 PASS해야 한다.
- 각 이미지에 README provenance 항목이 정확히 하나 존재해야 한다.
- spec 083 panel 결과에 fixture heading/diagnostics/control이 포함되지 않는 것을 pixel이 아닌 DOM locator와
  screenshot bounding box로 증명한다.

### 전체 gate

```powershell
node scripts/check.mjs
node scripts/e2e-run.mjs
git diff --check
```

다음도 보고한다.

- unit 전체 통과 수, test file 수, build 2개.
- Chromium 전체 통과/실패/skip/retry 수.
- 신규 visual spec 통과 수와 생성 PNG 수.
- axe serious/critical, console error/warning, external request 수.
- 고객/admin entry size와 SHA-256. 제품 source 무변경이므로 baseline과 다르면 원인을 설명하고 STOP한다.
- 포트 `4183/4184/4185/8080/9099/9199` LISTENING 잔류 0.
- `denn-e2e-*`, `test-results`, `playwright-report`, `debug.log` 잔류 0.
- 허용 경로 밖 diff 0, package/lockfile/Rules/config diff 0.
- 보호 파일 시작/종료 hash와 stage 0.

검증 실패를 screenshot 승인으로 덮지 않는다. timeout 증가, retry/skip 추가, 기존 assertion 삭제는 금지다.
비결정적 필수 gate가 발생하면 자동 루프 STOP 정책을 따른다.

## 완료 정의 (DONE)

- 신뢰 등급이 붙은 local Chromium PNG index와 감사 보고서가 있다.
- 제품 route와 fixture 증거가 혼동되지 않는다.
- 캡처 가능한 matrix 항목의 자동 측정이 PASS하고, 불가능한 항목은 근거 있는 `NOT TESTED`다.
- finding이 P0/P1/P2로 분류되지만 제품 UI 수정은 0이다.
- full check/E2E/diff/forbidden/protection gate가 PASS한다.
- 실제 Firebase/network/emulator/deploy/운영 데이터 접근 0이다.
- 상태는 `READY_FOR_CODEX`로 끝나며 다음 UI 구현 스펙은 시작하지 않는다.

## 위험 및 STOP

- 현재 route/fixture만으로 상태를 안전하게 만들 수 없어 제품 source·기존 fixture·config를 수정해야 하면 STOP.
- 신규 dependency, binary/download/install이 필요하면 STOP.
- 외부 request 또는 실제 Firebase 초기화 징후가 보이면 즉시 STOP.
- 기존 E2E가 비결정적으로 실패하면 한 번의 canonical 실행 결과를 그대로 기록하고 STOP. 임의 재시도 금지.
- 보호/dirty 파일 hash가 예상치 않게 바뀌거나 stage되면 STOP.
- 감사 중 즉시 고치고 싶은 UI finding이 보여도 기록만 하고 STOP 범위 밖 제품 수정은 하지 않는다.

## 후속 경계

Codex가 감사 보고서와 PNG를 독립 검수한 뒤에만 후속 UI 보완 단위를 작성한다. 후속 단위의 실제 UI/UX
구현은 사용자 지시대로 Claude Code가 담당한다. actual device, preview channel, Firebase/Rules/Hosting
cutover는 각각 별도 승인 단위다.
