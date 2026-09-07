# 100 — 룸 준비 controller·합성 fake 계약

2026-09-07. 기준04ccfae, rebuild/modern-studio.
현재 단계: CONTRACT_REVIEW_PASSED / READY_FOR_IMPLEMENTATION / IMPLEMENTATION_NOT_STARTED.
같은 Codex의 계약 검토이며 독립검수나 제품 구현검증 통과가 아니다.
사용자 `응 다음`은099 NEXT의 계약 작성·검토 지시다. 이번 차례는 문서만 작성한다.
이후 구현 착수 지시가 오면 아래 고정 범위로 구현하며, 계약 작성 완료를 제품 DONE으로 표시하지 않는다.

## 1. 목표 (WHY)와 근거

098의 단일 완성 lease 소유권에, frame과 background가 순차적으로 준비되는 동안의 취소·실패·
늦은 완료 처리를 추가하는 앱-local 조정자를 설계한다. 실제 이미지/화면을 만들지는 않는다.
[RG-2 결정](../../codex-claude-handoff/decisions/2026-09-07-rg2-local-room-preparation-decisions.md),
[099 조사](../../codex-claude-handoff/reviews/2026-09-07-spec-099-room-local-adapter-boundary-investigation.md),
[098 session](../../../apps/mockup/src/room-placement/session.ts)이 근거다.
source별 draw ack 부재, borrowed binding, DOM clock 문제를 준비됨이라는 boolean으로 감추지 않는다.

## 2. 범위 (SCOPE / WHERE)

이번 계약 차례의 허용 문서7개:

- docs/rebuild/specs/100-room-preparation-controller-contract.md
- docs/codex-claude-handoff/reviews/2026-09-07-spec-100-room-preparation-controller-contract.md
- docs/handoff/2026-09-07-spec-100-room-preparation-controller-handoff.md
- Automation/DENN_AUTOMATION_STATE.md
- Automation/NEXT_CLAUDE_PROMPT.md
- docs/codex-claude-handoff/CURRENT.md
- docs/live/CLAUDE_LIVE_PATCH_LOG.md

후속 구현 착수 시 허용할 신규 코드 정확2개:

- apps/mockup/src/room-placement/preparation.ts
- apps/mockup/src/room-placement/preparation.test.ts

기존098 4파일, 다른 apps/packages/tests, route/CSS/공개barrel/print/owner/Rules/config/
package/lockfile 변경0. 098 session은 import하여 재사용하되 수정하지 않는다.
기본browser port, 실제Blob/File/Image/Canvas/ImageBitmap/URL, 이미지decode·픽셀·렌더링·UI0.
React/SDK/서버/신규의존성/타이머/자동retry/캐시/저장·Space·발행·실측·레거시프리셋0.
문서 차례에서는 test/build/E2E도 실행하지 않는다.

보호: taste-v2/**,design/README,spec038,spec018PNG2,render/plan/index.ts,pnpm-workspace.yaml,
AGENTS.md 및 별도091handoff/roadmap. 수정/복원/stage/commit0.
후속 구현의 canonical E2E가 재생성하는 spec018PNG2만 기존 예외 유지: hash보고, 복원/커밋0.
그 외 기존 증거가 변하면 STOP. 실제Firebase/UID/운영data/배포/삭제/설치/자동화0.

## 3. 공개 앱-local 표면 — 렌더링이 아닌 준비 상태

`createRoomPreparationController(ports)`는 아래 함수를 제공한다. 잘못된 ports는 고정 결과로 거부한다:
`{ok:false,code:"ROOM_PREPARATION_INVALID_INPUT"}` 또는 `{ok:true,controller}`.
각 필수 port 함수는 factory에서 한 번 읽고 this를 보존해 캡처한다. factory/import는 port 호출0.

| 함수 | 입력/결과 | 의미 |
|---|---|---|
| prepare(request: unknown) | Promise<PrepareResult> | 명시 준비1회. reject하지 않음. 새 호출은 이전 준비/ready를 무효화 |
| getState() | empty / pending / ready / disposed | IO없는 상태 문자열만. source-current 증명/그리기 권한이 아님 |
| readPrepared(request: unknown) | PreparedInfo 또는 null | 현재 source를 다시 검사하고 일치할 때만 안전한 크기 복사 반환 |
| clear() | void | 대기/완성자원 정리, empty; 반복 안전 |
| dispose() | void | 영구 disposed, 이후 모든prepare는 안전실패; 반복 안전 |

request는 `{sourceIdentity: object, backgroundIdentity: object}`. 둘 다 non-null·비배열 object의
참조 동일성만 사용하며 내부속성/문자열화/로그0. request의 두 필드를 try/catch에서 한 번 읽는다.
keys의 추가필드는 읽지 않으며 identity 내용에서 URL/ID/PII를 만들지 않는다.
실제 파일/카탈로그를 담는 객체가 아니라 caller가 발급한 빈 opaque token을 전제로 한다.

PrepareResult는 `{ok:true}` 또는 `{ok:false,code:고정오류}`뿐. 성공promise를 보관했다는 이유로
나중에도 ready라고 가정할 수 없다. 성공 후 source가 바뀌면 readPrepared는 null이다.
PreparedInfo는 `{frameSize:{width,height},backgroundSize:{width,height}}`의 새 값 복사뿐이다.
원본lease/identity/callback/drawable/plan/catalog/URL/bytes는 내보내지 않는다.
**draw capability는 이번 API에 없다.** 준비수명 검증만 하며 실제렌더/이미지binding 전달은 후속 계약.
`getState`/`readPrepared`를 React useSyncExternalStore에 바로 연결하는 계약도 아니다.

## 4. 주입 port와 신뢰 경계

ports는 `readSource`, `captureFrame`, `startBackground` 정확3개 필수 함수다.
실제 browser 구현은 작성하지 않으며 모든 자원은 시험용 counter/opaque 객체다.

### readSource(): unknown

정상 gate 응답의 필수필드:
`{identity:object, kind:"frame", projectionOk:true, planReady:true, clockPreview:null}`.
각 필드는 한번 읽어 복사한다. null/부재/배열/예외, kind 불일치, true가 아닌 flag,
null 아닌 clockPreview, 요청sourceIdentity와 다른 identity는 모두 fail-closed한다.
초기 gate 실패는 ROOM_PREPARATION_SOURCE_BLOCKED, 통과 후 current가 달라지면 SUPERSEDED.

이 응답은 신뢰된 caller가 **같은 source의 성공한 frame projection과 확정 final plan**에서 만들
증명 port다. arbitrary object에 flag를 붙이면 실제시안을 증명한다는 뜻이 아니다.
100은 caller의 실제projection/plan/clock 판단을 검증하지 않는다. fake에만 주입한다.
후속 caller에서는 성공한 frame projection의 clockPreview===null만 no-clock 근거로 쓴다.
hidden, clock필드부재, 실패한projection을 허용하지 않는다([099 §3](../../codex-claude-handoff/reviews/2026-09-07-spec-099-room-local-adapter-boundary-investigation.md#3-시계-gate--hidden과-없음은-다르다)).
선택/catalog/색/문구/사진/transform/art·font readiness/원본plan 변경마다 새 token을 만들고 clear한다.
룸viewport 변경만으로는 source token을 교체하지 않는다. 원본preview plan이 변하면 교체한다.

### captureFrame(sourceIdentity): unknown

동기 함수이며 정상 반환은 독립 frame lease다. 반환 전까지 부분자원은 port 소유:
throw하면 port가 그 내부자원을 정리할 책임이 있다. controller가 전달받지 못한 자원은 회수할 수 없다.
정상 반환 순간 controller가 받으며 이후 원본preview 자원을 dispose해서는 안 된다.
실제구현 후보는 same-final-plan 동기실행이지만100에서는 실제executor/Canvas를 호출하지 않는다.
Promise/thenable frame capture를 지원하지 않는다. await 전에 frame 소유를 확정한다.

### startBackground(backgroundIdentity, sink): unknown

동기적으로 `{cancel():void}` task를 반환하고 결과는 sink의 `complete(lease:unknown)` 또는
`fail()`로 알린다. 실제 background request는 port closure가 소유하며 URL/파일을 controller에 넘기지 않는다.
sink는 throw하지 않는다. sync callback/나중 callback/중복 callback을 모두 시험 가능하게 한다.
cancel은 요청 중단의 **최대1회 시도**이며 이후에도 callback이 올 수 있다.
cancel 반환을 기다리지 않고 controller의 prepare promise는 취소 결과로 정착시킨다.

startBackground가 돌아오기 전 sink가 불리면 결과를 임시로 소유하되 ready를 공개하지 않는다.
유효 task의 cancel을 캡처한 뒤 current gate를 다시 확인하고 최초 결과만 확정한다.
start가 throw하거나 task/cancel이 무효면 BACKGROUND_FAILED; 임시획득 frame/background를 정리한다.
throw 전에 내부만 만든 미전달자원은 port 책임이다. 유효cancel을 확보하지 못한 경우
실제 작업 취소 성공을 보증하지 않는다. 나중에 sink로 전달되는 lease는 계속 격리·해제한다.
임의로 많은 중복callback을 보관하지 않는다: 첫 후보1개 이외는 즉시 admission/정리한다.
start가 아직 반환하지 않았을 때 clear/새prepare가 발생하면 cancellation-needed를 기록한다.
나중에 유효cancel을 받자마자 한번 호출하고 이후획득/ready공개0. 정상성공으로 완료된task의 cancel은
호출하지 않고 버린다; ready이후정리는 lease.release가 담당한다. 실패/중단 시에만 pending cancel을 시도한다.
아무 callback도 오지 않으면 명시취소 전까지 pending이다. 자동timeout/벽시계상한을 도입하지 않는다.

### 공통 ResourceLease

non-null·비배열 object, 필수 `{release():void,width:number,height:number}`.
width/height는 유한 양수이며098 내부모델과 맞춘 [1,1,000,000] 범위. 이것은 실제픽셀할당예산 아님.
동일 lease object는 controller 전체 수명에서 한번만 소유한다. frame/background간 재사용도 금지한다.
WeakMap record와 admission중 identity 예약으로 중복 getter 재진입을 처리한다.
release를 먼저 한번 읽어 this-bound callback으로 기록하고, 그 다음 width/height를 한번씩 검증한다.
dimension 검사실패/예외라도 확보한 release는 한번 시도한다. release조차 없거나 throw하는 getter이면
알 수 없는 자원 정리를 보증하지 않고 고정실패로 닫는다. 원문예외는 보존/로그0.
동일object의 중복전달은 현재 소유자원을 해제하지 않는다. 이미released인 lease는 재소유하지 않는다.
서로 다른 wrapper가 같은 underlying 자원을 감추는 경우는 port 독점성 위반이며 탐지보증 밖이다.

## 5. 상태·소유권 순서

```text
prepare → 새cohort 예약/이전public준비정보 분리 → 이전 작업취소·자원정리
        → request/source gate → frame 획득 → 재확인 → background 시작
        → task확인/최초결과 + current source 재확인
        → aggregate lease 하나를098 ticket.complete → 크기정보ready / promise성공
clear / dispose / 새prepare → 이전promise 취소정착 → pending정리 또는098 aggregate정리
늦은complete → 이전cohort에만귀속 → 새자원release, 현재cohort변경0
```

1. **무효request도 이전 ready를 남기지 않는다.** disposed가 아닌 모든 prepare는 호출진입시 새cohort를
   예약한다. 이전소유권/상태/취소결과를 먼저 분리·정착시킨 뒤 외부cleanup을 호출한다.
   cleanup 재진입으로 더 새prepare가 시작되면 바깥호출은 SUPERSEDED, 추가획득0.
2. 기존098 session 하나를 controller가 소유한다. session.begin/clear 역시 외부release를 부를 수 있다.
   호출 후 자신의cohort인지 재확인; 옛호출은 새session ticket을 fail/clear/dispose하지 않는다.
3. frame만 획득한 pending 동안은 controller가frame/task/임시background를 소유한다.
   완성시 고유 aggregate lease 하나에 frame/background cleanup을 묶고 **한번만** ticket.complete한다.
   aggregate로 넘기는 시점에 pending소유권을 비우되 complete가 거절해도 aggregate경로로 정리한다.
   098이 aggregate를 소유한 이후 controller는 두 자원을 직접 다시 release하지 않는다.
4. 취소순서: public정보/현재귀속 먼저 분리 → 이전promise 고정결과 → cancel → 자원release.
   cancel/release 중 다시 sink가 불려도 이전자원만 처리한다. 하나의 cleanup이 throw해도 나머지정리계속.
   cleanup은 record에 시도됨을 먼저 표시한다. 거절된 completion도 처음받은 lease이면release1회.
5. request/source getter, readSource, captureFrame, startBackground, cancel, release, session조작의
   외부호출 이후 cohort 검사를 한다. 더 새cohort의 state를 덮지 않는다. source-current 검사는
   초기/캡처후/배경시작전/결과승인전/readPrepared에서 수행하며 같은검사중 readSource 재귀진입은
   중첩검사를 추가호출하지 않고 fail-closed한다. 새명시prepare가 생기면 옛검사결과는 버린다.
6. readPrepared는 요청tokens와 내부ready가 같고 readSource gate도 현재일 때만 크기정보를 반환한다.
   잘못된 조회request나 다른 tokens이면 null, 현재정상자원은 손대지 않는다. 올바른tokens로 조회했으나
   source가 바뀌었으면 자신의cohort만 정리하고 null. 조회 중 재진입한 새cohort는 변경하지 않는다.
7. source변경의 즉시 cleanup은 미래caller가 clear를 호출할 책임. controller는 외부변화를 자동구독하지
   않는다. readPrepared/current검사로 stale정보 노출을 막는 것과 즉시메모리해제를 구별한다.
8. 성공한 prepare 이후 clear되어도 과거promise성공은 취소로 바꾸지 않는다. 새 readPrepared는 null이다.
   전체JS/탭 정지 중 wall-clock취소완료나 실제메모리회수는 보증하지 않는다.

## 6. 안전 오류와 결과 우선순위

모든실패는 `{ok:false,code}`이고 자동retry0. 고정코드 외 raw SDK/예외/identity/파일/문구/URL0.

| 코드 | 조건 |
|---|---|
| ROOM_PREPARATION_INVALID_INPUT | 잘못된factory/request |
| ROOM_PREPARATION_SOURCE_BLOCKED | 초기 frame-ready/no-clock/source gate 실패 |
| ROOM_PREPARATION_CAPTURE_FAILED | capture throw/무효frame lease |
| ROOM_PREPARATION_BACKGROUND_FAILED | start/task 무효·throw·최초fail·무효background lease |
| ROOM_PREPARATION_SUPERSEDED | 새prepare 또는 초기통과후 source 변경 |
| ROOM_PREPARATION_CANCELLED | 명시clear로 아직미정착 작업취소 |
| ROOM_PREPARATION_DISPOSED | dispose 또는 disposed이후prepare |

한cohort의 public Promise는 첫 terminal결과로 한번만 정착한다. invalidation은 상태분리시 선점한다.
자신이현재인채 실패하면 ready정보없이 empty로끝낸다. disposed는유지하고 superseded옛호출은새state를바꾸지않는다.
외부호출중 새prepare/clear/dispose가 선점하면 이후 throw/결과는 기존취소code를 바꾸지 않는다.
start가 반환하기 전 최초sink결과는 잠정값: start throw/invalidtask는 BACKGROUND_FAILED로 닫는다.
배경성공 후 중복fail은 ready를 깨지 않으며, 중복complete의 새로운lease만 해제한다.

## 7. 검증 (VERIFY)

구현 후 synthetic Vitest는 최소 아래 범주를 고정한다. 테스트 총수는 실행 전에 꾸며 쓰지 않는다.

| 범주 | 필수 단언 |
|---|---|
| 생성/무효입력 | import/factory I/O0; invalidports/request 안전; invalid새request가 이전ready정리 |
| gate | case/failedprojection/not-ready/clock-present/undefined/hostile/source불일치: capture/start0 |
| 정상 | gate→capture→start→완성 순서; sync/async complete; 크기복사/입력불변; session aggregate1개 |
| 실패 | frame실패 start0; startthrow 전후sync complete; invalidtask; fail; dimension실패 cleanup |
| 취소 | frame만보유, pendingbg, ready 각각 clear/dispose/새prepare; promise 즉시취소정착 |
| 늦은/중복 | cancel후complete/fail, A늦음/Bready, 동일lease중복/다른lease중복, released재사용거부 |
| 재진입 | readSource/getter/capture/start/cancel/release에서 새prepare/clear/dispose; 옛후속0 |
| source/current | 초기후변경·완성전변경·readPrepared변경; stale/null조회; 같은raw imageRef/다른token거부 |
| cleanup | 한번시도·throw후다른자원계속·malformedrelease 한계·pending/aggregate 이중해제0 |
| 공개표면 | snapshot에token/lease/callback/raw값0; 자동retry/timer/browser/route참조0 |

구현시 실행: `vitest run apps/mockup/src/room-placement`, `node scripts/check.mjs`,
`node scripts/e2e-run.mjs` canonical. 기본unit 포함/별도fixture·E2E수정0.
canonical은 기존UI회귀이지 새룸UI검증 아님. 양앱entry SHA불변, 시작결과/보호hash,
diff--check·정확변경코드2+문서7·포트4183/4184/4185/8080/9099/9199·staging잔류를 확인한다.
비재현실패/기존증거비허용변경/신규권한은STOP; timeout/retry/worker완화0. 최대3회 범위내보완.
동일Codex 자체검수로 기록하며 독립검수라고 하지 않는다. 검증후 코드2와문서7 분리 일반commit/push.

## 8. 완료 조건과 NOT TESTED

계약단계 완료는 문서정합/소스링크/범위/hash검사 통과다. 제품완료와 별개다.
구현DONE은 §7 실제실행 PASS 후에만 가능하다. 현재 preparation코드/시험0, 모든 §7은 NOT RUN.
실제frame픽셀·background형식/용량·CORS·브라우저취소/메모리·UI/실기기는 NOT TESTED.
UI초기위치/폭/슬라이더/파일한도/해상도·시간·비용은 UNCONFIRMED, 새로승인하지 않는다.
draw API/실제adapter가 필요하면 후속별도계약. 이번범위를 넘어 기존파일수정이 필요해도 STOP한다.

### 계약 검토 완료 (Codex)

099의 미확정 지점을 port/input/result/state/ownership 순서와 합성검증표로 구체화했다.
신뢰된source proof와 실제projection검증, 취소결과정착과실제작업중단, release시도와실제메모리회수를 분리했다.
기존파일수정/그리기 API/새제품기본값 없이 구현할 계약 범위를 코드2파일로 고정했다.
[검토 기록](../../codex-claude-handoff/reviews/2026-09-07-spec-100-room-preparation-controller-contract.md),
[인수인계](../../handoff/2026-09-07-spec-100-room-preparation-controller-handoff.md).
아직제품코드·시험작성/실행0. 이번 계약 작성 차례 뒤에는 명시된 구현 착수 지시를 기다린다.
