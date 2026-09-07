# 098 — 로컬 룸 배치 좌표·자원 세대 모델

2026-09-07,기준HEAD=origin2959569·0/0. DONE / CODEX_PASSED / LOCAL_VERIFIED(동일 Codex, 독립검수 아님).
[RG-2=A 승인](../../codex-claude-handoff/decisions/2026-09-07-rg2-local-room-preparation-decisions.md).

## WHY / SCOPE

배경 전체를 보이는 contain과 배경 이미지 기준 배치를 순수 계산으로 준비한다.
늦은 비동기 완료가 새 배경/시안을 덮거나 중복 자원을 해제하지 않도록 세대 소유권을 합성 검증한다.
DOM/Canvas/Image/File/URL 생성·사진 로딩·UI연결·실제자원 해제·네트워크·SDK0.
실물cm/룸효과/레거시프리셋/회전/저장/Space/공개schema/운영권한은 확장하지 않는다.

## WHERE

신규 앱-local 파일 정확4개:

- apps/mockup/src/room-placement/geometry.ts
- apps/mockup/src/room-placement/geometry.test.ts
- apps/mockup/src/room-placement/session.ts
- apps/mockup/src/room-placement/session.test.ts

문서8개:이계약,RG-2결정,098검수,098handoff,STATE/NEXT/CURRENT/live.
기존 apps/제품/test/fixture/CSS/packages/Rules/config/manifest/lockfile 수정0.
기존 geometry 공개 함수 읽기/호출은 허용하되 root barrel/보호plan 변경0. 새 모델은 제품 route에 import하지 않는다.
보호taste-v2/**,design/README,spec038,spec018PNG2,render/plan/index.ts,pnpm-workspace.yaml,AGENTS.md와
별도roadmap/spec091handoff는수정/복원/stage/commit0. canonical이재생성하는spec018PNG2만기존예외,
다른기존증거가달라지면STOP.생성물복원으로차이를감추지않는다.

## WHAT — 순수 기하

unknown 입력을 try/catch 안에서 필드별 한 번 읽어 분리한 수치로 검증한다. 입력변경/IO0.
viewport/background의width,height는유한[1,1,000,000] 논리/이미지px;모델의 계산 범위이지제품 업로드제한아님.
placement는u,v 유한[0,1],widthRatio=q 유한[0.000001,1],aspect 유한[0.000001,1,000,000].
이 경계는 수치 폭주·underflow 방지용 내부 모델 한계이며 UI슬라이더 기본값/범위를 승인하지 않는다.
입력부재를기본값으로채우지않는다. getter/proxy 예외는 ROOM_INVALID_INPUT, 원문 오류0.

`s=min(Vw/Iw,Vh/Ih)`, `Bw=Iw*s`, `Bh=Ih*s`, 중앙 Bx/By.
`qMax=min(1,aspect*Ih/Iw)`보다 큰q는 ROOM_FRAME_TOO_LARGE. 자동 축소/회전0.
배경내 전체사각형을 유지하도록 u는[q/2,1-q/2],v는[(q*Iw/aspect/Ih)/2,1-그값]로clamp.
출력에는 실제 적용u/v를 반환하여 숨겨진 위치변경이 없게 한다.
`Fw=q*Bw`, `Fh=Fw/aspect`, `cx=Bx+u*Bw`, `cy=By+v*Bh`, F는 중심에서반크기뺀사각형.
resize/DPR가u/v/q의 의미를 바꾸지 않는다. contain이므로 배경crop0,cm·벽실측정보0.

point 입력은viewport/background와clientRect(x,y,width,height),client(x,y).
clientRect width/height도 유한[1,1,000,000]이며 x/y와 client x/y는 유한 수다. 실제 CSS/포인터 연결은 없다.
기존 clientPointToLogical을호출해CSS→logical 변환 후B내부(경계포함)만u/v반환.
letterbox/바깥점은 ROOM_POINT_OUTSIDE,유한아님/0크기/계산overflow는 ROOM_INVALID_INPUT.
포인터회전/CSS skew 보정은범위밖. 기하호출은 항상새값만반환한다.

## WHAT — 세대 소유권

createRoomPlacementSession은IO없는메모리owner다. 상태는empty/pending/ready/disposed 문자열뿐.
begin은이전ticket을즉시무효화하고소유lease의release를호출한후새ticket을반환(disposed면null).
ticket.complete(lease)/fail()은한세대에한번만성립. lease는고유객체+release함수의주입capability다.
실제이미지/URL/파일명은모델입력/상태에없다. 배경과시안의짝을한lease로소유하는후보이지로더가아니다.
현재pending ticket만첫정상lease를ready로받는다. stale/중복완료의새lease는즉시release시도1회.
동일lease 객체의중복전달은현재ready자원을해제하지않으며재소유하지않는다(WeakMap으로동일owner내추적).
clear는pending무효화/owned분리후empty,dispose는동일처리후영구disposed. 반복호출은안전하다.
상태/해제여부를먼저갱신한뒤외부release호출:release내재진입이새세대를덮지않도록한다.
release가throw해도원문노출/재시도0; **정확히1회시도이지실제해제성공보증아님**.
형식무효lease는false,현재pending이면empty로실패. 해제capability가없으므로자원해제를주장하지않는다.
각lease는단일session의독점소유를전제로하며세션간같은자원중복양도는금지된호출자위반이다.
명시begin외자동retry/Date/UUID/timer/비동기작업 생성0. 완료순서는fake로주입한다.

## VERIFY / DONE

1. targeted Vitest: contain landscape/portrait/square·정역좌표·경계/letterbox·full-frame clamp·resize·
   aspect·oversize거부·나쁜입력/hostile/입력불변;session stale·duplicate·clear/dispose·fail·재진입·release throw.
2. node scripts/check.mjs(기본포함신규unit)과node scripts/e2e-run.mjs canonical.
   새 UI E2E/PNG0.기존고객/운영자entry SHA불변과기존증거/보호시작hash비교.
3. diff--check/허용경로/포트4183/4184/4185/8080/9099/9199/staging잔류0.
   failure는범위내재현결함만최대3보완,timeout/retry/worker완화0.
4. 같은Codex코드검토를독립검수로표시하지않는다.검증PASS후코드4파일과문서8개분리commit/일반push.

## NOT TESTED / STOP

실제DOM/이미지decode/픽셀/실기기/포인터/브라우저종료/실제메모리회수/룸시각결과는NOT TESTED.
fake로서버·Rules·완전한룸UX를보증하지않는다.새의미/권한/보호변경/비재현실패는STOP.
이번단위후UI연결을자동으로열지않고별도계약경계를검토한다.전체실측진행률확인불가.

### DONE (Codex)

코드4파일 3c3abca. targeted46/46, check 단위99파일2591/2591(2545+46),
format/lint304파일·7typecheck·양앱build PASS. canonical271/271(52.8초), 추가 UI 시험/PNG0.
양앱entry hash 불변. 기존105hash 중103동일, spec018PNG2는 기존 canonical 재생성 예외만;
복원/stage/commit0. 포트6개 listener0, staging 제거, diff--check PASS.
[검수 결과](../../codex-claude-handoff/reviews/2026-09-07-spec-098-room-placement-geometry-session.md),
[인수인계](../../handoff/2026-09-07-spec-098-room-placement-geometry-session-handoff.md).
실제 룸 UI/로더/물리 자원 해제 검증은 NOT TESTED. 다음은 별도 로컬 adapter 계약 경계 조사다.
