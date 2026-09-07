# 102 — 독립 frame snapshot·격리 Canvas 검증 계약

2026-09-07. 기준2dcf7b4, rebuild/modern-studio.
DONE / CODEX_PASSED / LOCAL_VERIFIED — Q-102-1 정정 승인 후 구현·검증 완료. 코드37c581e.
최신 사용자 지시로 막힘·새결정·권한변경 없는 스펙 간 자동 진행을 승인받았다. 이 승인은 계약 모순의
임의 해석이나 운영/보호 경계 해제를 포함하지 않는다. 이전 계약 검토 통과 기록은 이력이다.
최신 사용자 `응 자동진행 재개해줘`로 Q-102-1 제안과 아래 정확4파일 구현·검증을 재개한다.
문서7개와 코드/시험4개만 허용하며, 이전 문서 차례의 실행0 기록은 당시 이력이다.

## 1. 목표 (WHY)

성공한 no-clock frame의 **확정 final plan**을 동기로 독립 surface에 실행하고, 독립 사본의 수명과
사용 차단을 검증한다. 기존 preview/print/slot owner는 수정·해제하지 않는다.
[RG-2](../../codex-claude-handoff/decisions/2026-09-07-rg2-local-room-preparation-decisions.md),
[101 조사](../../codex-claude-handoff/reviews/2026-09-07-spec-101-room-browser-adapter-boundary-investigation.md),
[100 계약](100-room-preparation-controller-contract.md)이 근거다.
100의 상태/크기 API를 바꾸지 않는다. 102는 개별 frame lease만 다루며 배경 합성/사용권 registry는 제외한다.

## 2. 고정 범위 (SCOPE / WHERE)

계약 차례 허용 문서7개:

- docs/rebuild/specs/102-room-frame-snapshot-contract.md
- docs/codex-claude-handoff/reviews/2026-09-07-spec-102-room-frame-snapshot-contract.md
- docs/handoff/2026-09-07-spec-102-room-frame-snapshot-handoff.md
- Automation/DENN_AUTOMATION_STATE.md
- Automation/NEXT_CLAUDE_PROMPT.md
- docs/codex-claude-handoff/CURRENT.md
- docs/live/CLAUDE_LIVE_PATCH_LOG.md

후속 구현 착수 시 코드/시험 정확4개:

- 신규 apps/mockup/src/room-placement/frame-snapshot.ts
- 신규 apps/mockup/src/room-placement/frame-snapshot.test.ts
- 기존 apps/mockup/src/e2e/canvas-fixture.tsx — 독립 spec102 fixture 분기/합성 port만 추가
- 신규 tests/e2e/room-frame-snapshot.spec.ts

별도 기본 browser adapter/새 loader/React hook/사진 선택/실제 룸 UI/route 추가0.
기존098/100, PreviewComposer, surface, print, slot/art owner, packages, 기존 E2E 시험파일 수정0.
Rules/config/manifest/lockfile/신규의존성/설치/운영/실제Firebase/UID/배포/발행/삭제/자동화0.
보호 taste-v2/**·design/README·038·spec018PNG2·render/plan·AGENTS·pnpm-workspace 및
별도091handoff/roadmap은 수정/복원/stage/commit0. canonical 실행의 기존 spec018PNG2 재생성만
기존 예외로 유지: hash 보고, 복원/커밋0. 다른 기존 증거변경이면 STOP.
이번 계약 차례에는 제품/시험작성·시험/build/browser/Canvas/이미지 실행0.

## 3. 새 app-local API

`createFrameSnapshotCapturer(ports: unknown)` → `{ok:true,capturer}` 또는
`{ok:false,code:"ROOM_SNAPSHOT_INVALID_INPUT"}`. import/factory I/O0.
ports의 필수 함수 `readSource`, `createSurface`와 선택 `execute`를 한 번 읽고 this-bound로 보관한다.
execute가 생략되면 기존 [executePreviewRenderPlan](../../../apps/mockup/src/canvas/executePreviewPlan.ts)을 사용한다.
명시된 execute가 함수가 아니면 factory 실패. 그 외 필수 함수 누락/throw도 안전 실패.

capturer:

- `capture(request:unknown): CaptureResult` — 동기. Promise/thenable 지원0.
- `dispose():void` — 영구 종료, 현재 lease 해제 및 진행 중 capture의 결과 공개 차단. 반복 안전.

request 필수값:
`{sourceIdentity:object, scale:number, budget:{maxEdge:number,maxPixels:number}}`.
identity는 non-null·비배열 opaque object, 내용 조회/문자열화0. scale은 유한 양수.
maxEdge/maxPixels는 양의 safe integer, 기본값 없음. 필드를 각각 한 번 읽고 검증한다.
숫자 문자열 변환·음수 보정·자동축소·상향·DPR/print 값 적용0.

CaptureResult는 `{ok:true,lease}` 또는 `{ok:false,code}`. 예외/URL/파일/identity/plan/log0.
lease는 readonly 논리 `width,height`, `release():void`, `paint(request:unknown): PaintResult`만 제공한다.
width/height는 논리 frame 크기이며 backing 크기를 가장하지 않는다.100의 lease shape와 호환되지만
100에서 paint를 전달해 주는 것은 아니다. 이번에는100 호출부/연결을 만들지 않는다.
PaintResult는 `{ok:true}` 또는 `{ok:false,code}`뿐. raw canvas/context/drawable/plan/bindings 반환0.

### 한 capturer의 소유권 한도

capture 진행 중 또는 live lease가 있으면 새 capture는 BUSY, source/create/execute 호출0.
새 capture가 기존 lease를 자동으로 폐기하지 않는다. 호출자는 release 이후 명시 재요청한다.
기존 lease의 idempotent release만 재사용할 수 있고 lease object 자체를 새 capture 결과로 재사용하지 않는다.
dispose가 진행 중 createSurface 반환보다 먼저 재진입해도, 나중에 받은 surface의 cleanup은 시도한다.
factory는 전달받지 못한 내부 할당을 회수할 수 없다. 생성 도중 throw한 자원은 createSurface 책임이다.

## 4. 신뢰된 source와 캡처 순서

readSource 정상값:
`{identity,kind:"frame",projectionOk:true,planReady:true,clockPreview:null,plan,imageBindings}`.
같은 producer가 같은 확정 입력 묶음의 성공 projection/final plan/bindings를 제공해야 한다.
실제 producer는 이번 범위에 없고 fake/격리 harness만 제공한다.
성공한 geometry의 clockPreview===null 외 hidden/필드부재/실패projection/case는 차단한다.
[현재 Composer](../../../apps/mockup/src/preview/PreviewComposer.tsx#L616)의 probe/frameTrialRef를 쓰지 않는다.

초기 readSource의 필드와 plan.kind/logicalCanvas.width/height를 안전하게 한 번 캡처한다.
plan.kind도 frame이어야 하며 논리 width/height는 유한 [1,1,000,000]. imageBindings는 get 함수가 있는 객체.
plan의 commands 전체 정합 검증은 기존 executor가 담당한다. 새 자체 renderer/normalizer를 만들지 않는다.
plan은 기존 builder가 만든 안정된 final plan이라는 trusted producer 계약이다. 같은 identity를 유지하며
plan/bindings/underlying drawable을 바꾸거나 accessor가 다른 plan을 꾸며내는 producer를 탐지하는
보안 경계는 아니다. throwing 입력은 안전 실패하지만 악의적 mutable plan의 의미 동일성을 보증하지 않는다.
전체 plan은 복제/재빌드하지 않고 같은 인스턴스를 executor에 전달한다.

```text
disposed/busy → request 검증 → source/frame/no-clock gate
 → backing/예산 검증 → capture 예약 유지 → createSurface
 → release capability 확보 → source/dispose 재검사
 → setTransform(scale,0,0,scale,0,0) → source/dispose 재검사
 → 동일 final plan + borrowed bindings를 동기 executor 실행
 → ok 확인 + source/dispose 재검사 → live lease 공개
```

capture 예약은 request getter/readSource 이전에 잡고 성공 또는 실패 정리 종료까지 유지한다.
readSource/createSurface/context 메서드/execute/cleanup/getter의 외부호출 뒤 disposed와 자기 capture 세대를 확인한다.
중첩 capture는 BUSY로 닫아 재귀 획득0. dispose는 상태를 먼저 닫고 callback을 호출한다.
source 재검사는 최소 identity와 frame/no-clock/ready gate를 같은 규칙으로 확인한다.
초기 실패 SOURCE_BLOCKED, 초기통과 뒤 변경/읽기 실패 SOURCE_CHANGED. dispose가 선점하면 DISPOSED 우선.
리소스 실패 정리 중 dispose가 생기면 이후 새 할당0. 완료 lease를 내주기 전에는 원본 source 변경을 재확인한다.
await/encoding/toBlob/download/URL/Image/파일/폰트 재measure0.

## 5. backing·uniform scale·surface port

`contentWidth=logicalWidth×scale`, `contentHeight=logicalHeight×scale`를 계산한다.
둘 다 유한 양수이며 backing은 각각 `ceil(contentWidth)`, `ceil(contentHeight)`.
backing width/height가 양의 safe integer, 각각≤maxEdge, 곱이 safe integer이며≤maxPixels일 때만 할당한다.
곱 overflow/비유한/예산초과는 INVALID_INPUT, createSurface0. 곱 검사는 나눗셈 비교 등 overflow 없이 한다.
예산은 호출자 정책 값이며 한 surface의 backing 한도일 뿐 전체브라우저/decoder/GPU/동시메모리 상한 아님.
scale이나 예산을 누락하면 실패; 합성 수치는 테스트 fixture 값일 뿐 제품 기본값 승인 아님.

ceil 여백을 채우려 비등방 scale을 쓰지 않는다. content 영역만 사용하고 끝의 1pixel 미만 여백은
렌더 content에 포함하지 않는다. paint 시 source crop은 `{x:0,y:0,width:contentWidth,height:contentHeight}`.
예: 논리100.5×80.25, scale1.25 → content125.625×100.3125 → backing126×101.
동일 scale 유지, crop은125.625×100.3125이며126×101 전체를 늘려 aspect를 바꾸지 않는다.

`createSurface({width:backingWidth,height:backingHeight})`는 trusted 동기 port다.
반환값 `{release():void,context,copyTo(target,sourceRect,destinationRect):void}`.
context는 기존 PreviewCanvasContext와 setTransform을 지원한다. 새 빈 detached surface를 독점 소유하며
정확 backing으로 구성해야 한다. 출력을 DOM에 붙이지 않고 원본 Canvas를 재사용하지 않는다.
surface/context 객체 동일성만으로 실제 독립성을 증명하지 않는다. fake는 호출순서만, real harness는 픽셀을 검증한다.

release를 먼저 한 번 읽어 this-bound로 기록하고 context/copyTo 등을 검사한다. 뒤 검사 실패도 확보한
release는1회 시도. thenable surface 거부. factory는 반환된 wrapper identity 중복을 수명 전체에서 거부하며
현재 소유 surface의 release를 잘못 호출하지 않는다. 서로 다른 wrapper의 underlying 공유는 port 위반.
context/copyTo/release는 private. clone/paint 요청자에게 원본 source나 이 surface를 전달하지 않는다.
성공 capture 이후 plan/bindings를 불필요하게 장기 보관하지 않고 source identity와 크기만 남기는 구조로 한다.

## 6. paint·release 계약과 신뢰 한계

paint 입력 `{target,rect:{x,y,width,height}}`: target은 trusted 내부 출력 context를 나타내는 non-null
비배열 객체, rect x/y 유한수, width/height 유한 양수. 임의객체를 실제 Canvas라고 인증하는 기능은 없다.
target의 기존 transform/clip/합성 상태는 caller 소유다. copyTo는 target을 clear하거나 임의 초기화하지 않는다.
rect는 논리 frame과 같은 aspect만 허용한다. `sx=rect.width/lease.width`, `sy=rect.height/lease.height`의
상대차≤1e-9 허용은 부동소수 계산 오차 전용이며 눈에 띄는 변형 정책이 아니다. actualcopy 목적지는
height를 `lease.height×sx`로 계산하여 단일 scale을 유지한다. 계산 비유한/0은 INVALID_INPUT.

released/disposed/BUSY paint 재진입은 copyTo0. 잘못된 paint request는 INVALID_INPUT이고 정상 lease를 없애지 않는다.
유효 요청이면 source gate를 다시 검사하고 current일 때만 copyTo를 한번 호출한다. copyTo 직전 live/current
재검사, 종료 후 live/current 재검사. source 변경이면 lease의 사용권을 닫고 release 후 SOURCE_CHANGED.
copyTo 중 release/dispose면 성공으로 반환하지 않는다. copyTo가 throw하면 PAINT_FAILED이며 lease는 폐기한다.
copyTo가 target에 이미 쓴 픽셀은 rollback되지 않는다. caller는 실패한 destination을 공개하지 않아야 한다.
live copyTo 중 중첩 paint는 BUSY, release cleanup 중에는 RELEASED, dispose 뒤에는 DISPOSED다.
모두 추가 copyTo0이며 외부 callback 무한재귀를 만들지 않는다(승인된 Q-102-1 정정).

**trusted copyTo 구현은 내부에서 native drawImage에 private canvas를 인자로 전달한다.** raw canvas를
public lease 필드/반환값으로 노출하지 않는다는 뜻이지 악의적 target/copyTo의 캡처를 보안적으로 막는다는
뜻은 아니다. target은 내부에서 만든 context만 허용하는 상위 경계가 필요하다. 이번 제품 route 연결0.
아무 target에나 실행할 수 있는 script sandbox나 canvas 보안 wrapper라고 주장하지 않는다.

release는 live/노출 상태를 먼저 닫고 private 참조를 분리한 뒤 기록된 cleanup을 최대1회 호출한다.
release throw는 raw 로그/재시도 없이 삼킨다. 이후 width/height 값은 읽혀도 paint는 RELEASED.
capturer dispose 후의 기존 lease paint는 DISPOSED, 이후capture도 DISPOSED. 재진입한 이전 cleanup이
다음 lease를 정리하지 않는다. 정상 release 뒤 새 capture 가능, dispose 뒤 재생성은 새 factory만 가능.
실제 메모리 회수는 NOT TESTED로 분리하며 cleanup 시도와 동일시하지 않는다.

## 7. 고정 오류

모든 오류에는 `ROOM_SNAPSHOT_` 접두어만 사용, raw message/stack/identity/URL/customer text0.
INVALID_INPUT, SOURCE_BLOCKED, SOURCE_CHANGED, CAPTURE_FAILED, PAINT_FAILED, BUSY, RELEASED, DISPOSED.
source 검사 실패는 위 source코드, surface/transform/executor throw·실패·무효 result는 CAPTURE_FAILED.
초기 disposed→busy→입력→source→할당/실행 순으로 판정한다. 외부호출 중 dispose는 뒤 결과보다 우선한다.
paint는 disposed→released→busy→입력→source→copy 순서. 자동retry/timeout0, 모든 public호출 예외 노출0.

## 8. 격리 브라우저 시험 범위

실제 Canvas 시험을 **후속 구현 검증에 포함한다**. default product port는 추가하지 않는다.
[기존 fixture build](../../../apps/mockup/vite.e2e-fixture.config.ts)는 기존 HTML을 별도 temp 출력한다.
기존 canvas-fixture.tsx에 `?roomSnapshot=1`의 **fixture 전용** 조기 분기를 추가한다.
기존 Fixture는 해당 query가 없을 때 그대로 렌더하고 제품 index/App/라우트에는 query 처리0.
spec102 전용 component/함수/합성 createSurface는 같은 허용 fixture 파일에만 둔다. config/HTML/runner 수정0.
불필요한 Tailwind utility 후보 문자열을 넣어 고객 CSS를 바꾸지 않는다. 기존 fixture 제어/단언/증거 변경0.

fixture는 작은 동색/clip/사진회전/확정 draw-text plan, 현재source token 및 별도 native Canvas만 사용한다.
createSurface는 detached canvas를 만들고 backing·context를 구성, copyTo는9인자 drawImage로 위 crop 적용.
release는 private 참조분리·backing 축소 시도, 예외여도 논리 해제 유지. 실제메모리 수치 PASS 주장0.
source 사진도 같은 문서에서 만든 합성 Canvas다. Image/File/Blob/URL/외부폰트/실제이미지/Firebase0.
test-side getImageData로만 픽셀을 읽고 제품 모듈에 pixel read/export 기능 추가0. 저장 PNG/새 증거파일 생성0.

필수 실제 Chromium 검증:

1. 같은 plan을 기준 canvas와 snapshot 경유 target에 그린 합성 픽셀 비교(정수/비정수 scale, clip, 회전, 확정텍스트).
   기준은 snapshot helper를 호출하지 않고 executor→별도 reference canvas→같은 crop으로 target에 복사하는
   독립 두 단계 경로다. 같은 명시 scale/crop/target 크기를 사용하여 한 단계 direct draw와 재샘플 차이를
   혼동하지 않는다. 동일 환경 RGBA byte 일치를 요구하고 실패를 임의 tolerance로 완화하지 않는다.
   문자줄바꿈 재build0. 테스트 전용 시스템 폰트 사용, 다른 OS bit-exact 주장0.
2. snapshot 이후 borrowed 원본을 다른 색으로 변경해도 사본은 기존 픽셀 유지(독립성 시험은 같은token을 유지하는
   합성 진단이며 실제producer의 변경무효화 정책과 별개). 별도 token교체 시험에서는 paint0/정리.
3. release/dispose/source교체 이후 copyTo 호출0, 반복 cleanup1회, busy/실패 재진입 합성 시나리오.
4. 예산 초과/create·context·execute 실패에 frame 공개0, 원본preview/owner dispose0.
5. 실제 외부egress0, console error/warning0, 고객 entry graph/hash 불변. 기존fixture E2E 전체회귀 유지.

## 9. 검증 (VERIFY)·종료

unit 필수: import/factory0, invalidports/request/getter·thenable, gates, backing예산/overflow/ceil,
동기실행 같은plan 인스턴스, 정상 lease 논리크기, 원본cleanup0, partial cleanup, release1회·throw,
같은surface 재사용거부, reentrant capture/paint/dispose, source변경, paint입력/aspect/crop/throw,
dispose 선점·실패종료, raw정보0. 캡처/paint callback이 source를 바꾸는 순서를 fake로 고정한다.
factory가 사용권을 관리하는 것과 실제 product source증명을 분리한다.

구현후 명령: `vitest run apps/mockup/src/room-placement`, `node scripts/check.mjs`,
`node scripts/e2e-run.mjs` canonical(신규102+전체 기존 Chromium). timeout/retry/worker 완화0.
기존 양앱 entry JS와 고객 CSS hash 불변, 보호/기존증거 baseline·정확코드4+문서7·diff--check,
포트4183/4184/4185/8080/9099/9199·이번 staging 제거를 확인한다. 기존 PNG2 이외 비허용증거 변화 STOP.
규칙 밖 파일수정/실패은닉/신규권한/새제품결정/3회초과 보완이면 STOP. 코드와 문서를 분리 일반commit/push.

이번 계약 검증은 링크/라인·범위·dirty22 hash·문서정합성뿐. 제품/시험 PASS가 아니다.
실제 background·현재 Composer source연결·두자원 합성·UI·실기기·실제메모리·CORS는 NOT TESTED.
UI초기값/배경형식·예산 기본값/운영 정책은 미확정. 전체실측완료율 확인불가, 계약 차례 화면변화0.

### 계약 검토 (Codex)

한 capturer당 하나의 live lease, 동기실행과 명시 scale/예산, ceil여백 crop, trusted copyTo 한계,
재진입/부분출력·논리해제, 기존fixture 분리를 고정했다. 동일 Codex 문서검토이며 독립검수 아님.
추가 Founder 질문 없음. 후속 명시 구현 지시 전 제품코드·시험 작성/실행0 유지.

문서 검증 실측: 신규3문서 링크/지정라인15/15, 시작dirty22/22 SHA동일, diff--check PASS.
정확 허용7문서 외 새변경0. 신규제품/시험3경로 부재·기존fixture 미변경 확인. 배율 예시 산술도 대조했다.
이는 제품unit/브라우저 검증이 아니며 모든 후속 구현 검증은 NOT RUN이다.

### QUESTIONS — 2026-09-07 착수 전 검토

Q-102-1 (CLOSED / APPROVED): 이전 §6의 `copyTo/release 동안의 중첩 paint는 BUSY`와 §7의
`paint는 disposed→released→busy→입력→source→copy 순서`가 release 재진입에서 충돌한다.
§6은 release가 live 상태를 먼저 닫도록 요구하므로, cleanup callback이 paint를 부를 때는 이미 released다.
BUSY와 RELEASED를 동시에 만족하는 구현은 없다. 실제 코드 재현이 아니라 계약 문장의 정적 모순이다.

최신 재개 지시로 정정 승인: §7 우선순위를 정본으로 유지한다. live copyTo 중 재진입 paint만 BUSY;
release cleanup 중 재진입은 RELEASED, capturer.dispose 중에는 DISPOSED. 모두 copyTo 추가호출0.
§6 문장과 §7 우선순위를 일치시켜 동일 Codex 계약 재검토 후 구현·검증 루틴을 재개한다.
이전 중단 당시 제품코드/시험작성·실행0, commit/push/stage0은 과거 기록이다.

### DONE (Codex)

## 구현 완료 — 2026-09-07

DONE / CODEX_PASSED / LOCAL_VERIFIED. 코드 `37c581e`, 동일 Codex 구현·자체 검토(독립 검수 아님).
Q-102-1 사용자 승인 후 정확4파일 구현. 기본 제품 route/100/Composer/owner/print 수정0.

- targeted room-placement 200/200 = 기존114 + 신규86.
- `node scripts/check.mjs` PASS: format/lint/7개 프로젝트 typecheck/unit2745/2745/build.
- 최종 `node scripts/e2e-run.mjs` canonical281/281(50.3초) = 기존271 + 신규10. 이전 실행도281/281(50.8초).
- 합성 Chromium 정수/비정수 scale, clip/회전/확정 text: 독립 두 단계 기준 대비 RGBA 차이0;
  borrowed 원본을 변경해도 사본 픽셀 차이0. 별도 source 교체/release/dispose는 copy0, cleanup1.
- 초기 테스트의 Number.MIN_VALUE 거부 기대값은 잘못된 계약 해석이어서 정정했고 유효성 시험을 추가했다.
  테스트 lint2건도 해당 파일에서 보완. 최종 자체검토로 함수의 custom bind/call을 읽지 않고
  Reflect.apply로 receiver를 유지하도록 고정. 실패 은닉/timeout/retry/worker/tolerance 완화0.
- 양앱 entry와 고객 CSS SHA-256 불변:
  customer `FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`;
  admin `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`;
  customer CSS `6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81`.
- baseline105 중 최종104 동일; 기존 canonical 예외 spec018 PNG2 재생성, 최종 desktop은 시작 SHA 동일,
  mobile은 `1103D366D28B33D07411CB34942FFBDC32E8C82F44AC00324BAAD1C4EAB84374`.
  두 PNG 모두 복원/stage/commit0. 나머지 보호/별도dirty20 SHA동일, 전체 별도dirty22 전송제외.
- 포트4183/4184/4185/8080/9099/9199 listener0; 이번 temp staging 두 곳 제거 확인; diff--check PASS.

신규 테스트의 외부 egress/console error·warning0은 합성 픽셀 시나리오에서 측정했다.
실제 사진/배경 decoder/source producer/두 자원 합성/룸 UI/실기기/메모리회수/CORS는 NOT TESTED.
운영/Firebase/UID/배포/발행/삭제/설치/예약 자동화0. 이번 고객 화면 변화0, 전체실측완료율 확인불가.
다음은 배경 입력 정책·decode 전 예산 경계의 문서 조사. 새 계약 전 제품 확장0, 새 제품 선택이면 STOP.
아래 계약만 완료/미구현/중단 기록은 해당 시점의 이력이다.
