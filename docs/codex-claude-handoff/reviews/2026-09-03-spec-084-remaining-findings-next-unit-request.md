# 스펙 084 잔여 finding 재확인 — 다음 구현 단위 선정 Codex 검토 요청

- 작성: Claude Code, 2026-09-03
- 기준: `rebuild/modern-studio`, `HEAD=origin=5a1aee9`, ahead/behind `0/0`
- 성격: **읽기 전용 재확인 + 검토 요청.** 제품 source·CSS·문구·test·config·package/lockfile·Rules 수정
  **0**, 게이트 실행 0, 새 스펙 착수 0. 다음 단위와 스펙 번호는 **Codex 계약과 Founder 결정**이 정한다.
- 근거 문서: `docs/codex-claude-handoff/reviews/2026-08-31-spec-084-local-visual-readiness-audit.md`
  (§4 finding, §5 판정표, §6 후보 목록, §9 F-1 해소), `docs/rebuild/results/spec-084/**`,
  `docs/rebuild/results/spec-085/**`
- 보호 대상(`taste-v2/**`, design README, spec 038, spec 018 PNG 2장,
  `packages/render/src/plan/index.ts`, `pnpm-workspace.yaml`, `AGENTS.md`)과 기존 Founder/user dirty는
  읽지도 stage하지도 않았다.

## 0. 요청 요지

F-1은 스펙 085로 닫혔다. 남은 후보는 **F-2 · F-3 · F-4 · F-5 · F-6 · F-7 · F-8** 일곱 건이다.
그런데 감사(2026-08-31) 이후 현재 소스를 다시 대조한 결과 **두 건은 그대로 스펙화하면 안 된다** —
하나는 사실이 아니고(F-6), 하나는 제품이 아니라 fixture가 선언한 값을 잰 것이다(F-8).

Codex에 요청하는 결정은 셋이다.

1. **F-6 철회**와 **F-8 재도출**을 감사 보고서에 반영할지, 별도 단위로 다룰지.
2. 남은 실제 finding 중 **다음 구현 단위의 범위**(단일 finding 단위인지, 표면별 묶음인지).
3. F-7처럼 **코드가 아니라 제품 판단이 먼저 필요한 항목**을 단위에서 분리할지.

## 1. 현재 소스로 다시 확인한 결과

| finding | 감사 판정 | 2026-09-03 재확인 | 결론 |
|---|---|---|---|
| F-2 파일 선택 native·영어 | P1 | 제품 file input은 **2곳** — 고객 `PreviewComposer.tsx:248`(`.denn-composer__slot-input`), 운영자 `AdminSpaceV2IssuePanel.tsx:631`. 스펙 085 증거 PNG에도 `Choose File No file chosen`이 그대로 있다 | **유효** |
| F-3 인증 후에도 비밀번호 안내 잔존 | P1 | `SpacePasswordGate.tsx:90-92`가 badge·`<h1>내 공간 시안 확인</h1>`·`담당자에게 전달받은 비밀번호를 입력하세요.`를 **상태와 무관하게** 렌더하고, 성공 시 `renderReadyBody`가 그 아래에 `저장된 시안 · 열람 전용 / 내 공간 시안`을 덧붙인다. `space-v2-viewer-1280x800.png`에서 제목 2개·잔존 안내를 눈으로 확인했다 | **유효** |
| F-4 운영자 root가 데모 셸 | P1 | `apps/admin/src/App.tsx:99·127·141·158·161` — `관리자 셸 · UI 프리미티브 데모`, `버튼 (데모 — 동작 없음)`, `보기 옵션 (데모 — 저장 없음)`, `TextField label="담당자" error="필수 항목입니다"`(상시 빨강)가 그대로 있다 | **유효** |
| F-5 C5 select가 23px native | P1 | `FramePrintSizeEditor.tsx:111`의 `<select>`에 class·CSS 없음. 바로 아래 cm 입력은 `@denn/ui` `TextField`다. PNG에서 대비가 명확하다 | **유효** |
| F-6 편집기가 카드 표면을 안 쓴다 | P2 | **사실과 다르다.** `FramePrintSizeEditor.tsx:104-105`의 **root가 `<Card>`**이며 spec 041(`27e6ff4`) 이후 계속 그랬다. `App.tsx`가 `Card`로 감싸지 않는 이유는 컴포넌트가 이미 카드이기 때문이고, 증거 PNG는 `denn-stack` locator 캡처라 카드 padding/border가 잘려 나갔을 뿐이다 | **철회 후보** |
| F-7 고객 화면 마이그레이션 진단 문구 | P2 | `일부 이전 데이터가 호환 처리되었습니다`는 스펙 085 증거 PNG에도 그대로 있다. 다만 감사 스스로 "운영 카탈로그에서 항상 뜨는지 **NOT TESTED**"라고 적었다 | **유효하나 제품 판단 선행** |
| F-8 Space viewer가 데스크톱에서 확대 안 됨 | P2 | **제품 규칙을 잰 것이 아니다.** 320x480은 `apps/mockup/src/e2e/space-production-route-fixture.tsx:157`이 replay evidence에 **`logicalWidth: 320`, `aspect: 1.5`를 하드코딩**한 결과다. V2 viewer는 `frame-logical-plan-v1` 계약대로 **발행 당시 logical size를 그대로 재현**한 것이다 | **재도출 필요** |

### F-8을 다시 봐야 하는 이유 (상세)

감사는 `space-v2-viewer-*.png`를 `PRODUCT_COMPONENT_IN_SYNTHETIC_FIXTURE`로 등급하고 "운영 route로
일반화하지 않는다"고 못박았는데, F-8의 문장은 그 경계를 넘어 제품 규칙을 주장한다. 실제로는

- 캡처 대상 canvas(`preview-canvas`)는 fixture의 V2 replay가 만든 것이고, 그 크기는 위 하드코딩 값이다.
- 측정 폭을 쓰는 경로(`SpacePostAuthFrameView` → `useContentLogicalWidth` → `resolveFrameLogicalWidth`,
  500 상한)는 **이 화면을 그리지 않았다**. 그 경로의 `composeSpaceFramePlan`은 아직 V1 거절 stub이다
  (`frame-plan.ts:66-84`, 항상 `fail(...)`).

따라서 F-8이 던지는 진짜 질문은 CSS 폭이 아니라 **제품 결정**이다: V2 replay는 발행 당시 logical size를
바이트 충실하게 재현해야 하는가(현재 계약), 아니면 열람 기기 폭에 맞춰 다시 렌더해야 하는가(가독성).
후자는 `frame-logical-plan-v1`의 의미를 바꾸므로 스펙 085 같은 layout 단위로 처리할 수 없다.

## 2. 그대로 스펙화할 수 있는 것과 없는 것

**바로 계약 가능(제품 결정 불필요, 범위가 코드 안에서 닫힘)**

- **F-5** — 가장 작고 위험이 낮다. **repo 안에 선례가 있다**:
  `apps/admin/src/space-v2/admin-space-v2-issue.css:60-85`가 이미 발급 panel의 `select`/`input[type=file]`/
  `input[type=range]`에 `min-height:44px` + Modern Studio border/radius/background를 준다(spec 083).
  같은 처리를 `FramePrintSizeEditor`에 적용하면 끝나며, 새 토큰·새 컴포넌트가 필요 없다.
- **F-3** — `SpacePasswordGate`의 머리말을 상태에 따라 렌더하도록 바꾸는 한 컴포넌트 범위다. 안전 의미
  (게이트 자체)는 건드리지 않는다. 다만 "인증 후 제목을 무엇으로 할지"는 문구 결정이 하나 필요하다.
- **F-2** — `@denn/ui` 버튼 + 한국어 문구로 native input을 감싸는 패턴을 새로 정의해야 하고 고객·운영자
  **2곳**에 적용된다. 파일 선택 접근성(label 연결·키보드·선택 취소·같은 파일 재선택)은 기존 계약
  (spec 026 §5의 `event.target.value = ""`)을 반드시 보존해야 한다.

**제품 결정이 선행돼야 하는 것**

- **F-4** — "운영자 root를 무엇으로 만들 것인가"는 데모 제거만으로 끝나지 않는다. 현재 실제 작업 표면
  (C5 편집기·발급 panel)은 gate off라 제품 기본값에서 보이지 않으므로, 데모를 지우면 **빈 화면**이 된다.
  gate 정책·기본 진입 화면이 Founder 결정 사항이다.
- **F-7** — 문구의 독자가 손님이 맞는지, 운영 카탈로그에서 항상 뜨는지가 미확인이다. 실제 카탈로그 확인은
  live network 범위라 현재 금지된다.
- **F-8** — 위 §1 참조. replay 충실도 vs 가독성의 제품 결정.

## 3. Codex에 드리는 선택지 (권고 아님, 결정은 Codex·Founder)

| 안 | 범위 | 크기 | 위험 |
|---|---|---|---|
| A | F-5 단독(C5 select를 발급 panel 선례와 동일하게) | 매우 작음 | 낮음. 선례가 repo 안에 있고 admin entry만 바뀐다 |
| B | F-3 단독(Space 게이트/뷰어 헤더 분리) | 작음 | 낮음~중간. 게이트 안전 의미와 기존 Space E2E 보존이 조건 |
| C | F-2 단독(파일 선택 컨트롤, 고객+운영자) | 중간 | 중간. 두 앱 동시 변경 + 파일 재선택/접근성 계약 보존 |
| D | F-5 + F-3 묶음(운영자 1 + 고객 1) | 중간 | 중간. 두 앱을 한 단위에서 만지므로 회귀 표면이 넓어진다 |
| E | 문서 전용 단위(F-6 철회 + F-8 재도출 기록) 선행 | 매우 작음 | 없음. 잘못된 finding으로 계약이 작성되는 것을 막는다 |

## 4. 확인 요청 사항 (QUESTIONS)

1. **F-6을 철회**하고 감사 보고서 §4·§5·§6에 정정 addendum을 남기는 것이 맞는가? 아니면 "App.tsx 레벨의
   조합 규칙" 관점으로 다시 쓸 것이 남아 있는가?
2. **F-8을 재도출**해 "V2 replay 크기 계약(발행 시 logical size 충실 재현)"에 대한 제품 질문으로
   바꾸는 것이 맞는가? 그렇다면 그 결정은 Founder 사안으로 올리는가?
3. 다음 구현 단위는 위 A~E 중 무엇인가? 묶는다면 **한 단위에 고객 앱과 운영자 앱을 함께 넣어도 되는가**
   (스펙 085는 고객 앱 하나로 한정해 회귀 표면을 좁혔다)?
4. F-4는 gate 정책·기본 진입 화면 결정 없이 착수하지 않는 것이 맞는가?
5. F-7은 실제 운영 카탈로그 확인이 금지된 현재, **문구 판단만으로** 단위를 만들 수 있는가?

## 5. 이번 요청이 하지 않은 것

- 다음 스펙 파일 작성 **0**, 스펙 번호 선점 **0**, 제품/test/PNG/`measurements.json` 수정 **0**.
- 게이트 실행 **0**(직전 스펙 085 검수에서 이미 전수 PASS를 기록했다).
- 실제 Firebase/network/emulator/deploy·실기기·preview channel **0**. F-7의 운영 카탈로그 확인은
  이 경계 때문에 수행하지 않았다.
- 보호 대상과 기존 Founder/user dirty에 대한 수정·restore·checkout·stage·commit **0**.

## 6. Codex 결정 (2026-09-03)

1. **F-6 철회.** `FramePrintSizeEditor` root의 기존 `<Card>`가 제품과 fixture 양쪽에 적용된다. 감사
   캡처 locator가 inner stack만 잘라 카드 경계를 숨긴 것이므로 별도 조합 결함으로 다시 쓰지 않는다.
2. **F-8 재분류.** 현재 PNG는 fixture가 선언한 `logicalWidth: 320`을 충실히 재현한 증거다. desktop
   확대 부재를 제품 UI 결함으로 일반화할 수 없다. 발행 당시 logical size 충실 재현과 기기 폭 재계산 중
   어느 계약을 채택할지는 별도 Founder 제품 결정으로 보류한다.
3. **다음 단위 A 채택.** spec 086은 F-5 단독이다. 가장 작은 범위에서 23px native select를 44px
   Modern Studio form 표면으로 맞춘다.
4. **두 앱 묶음 없음.** spec 086은 운영자 `FramePrintSizeEditor`와 그 fixture/test만 다룬다.
5. **F-7 구현 보류.** 합성 migration 진단의 고객 노출은 확인됐지만 운영 카탈로그에서의 발생 빈도는
   `NOT TESTED`다. 독자와 노출 정책이 정해지기 전 문구를 임의로 숨기거나 바꾸지 않는다.

계약 정본은 `docs/rebuild/specs/086-admin-c5-select-accessibility-surface.md`다. F-4는 admin 기본
진입/gate 결정 전, F-2/F-3은 각각의 독립 계약 전 시작하지 않는다.
