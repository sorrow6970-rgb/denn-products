# 123 — 부재 확인 decode와 준비 컨트롤러 연결 계약

123 전송 완료: code641b13c/docs67cf184 일반push,HEAD=origin67cf184·0/0 확인.
최종 기록1회 전송 뒤 Git확인. 123 DONE/CODEX_PASSED 유지,다음합성native계약검토는별도단위.

2026-09-10 / 검토 기준7e7a42d / CONTRACT_REVIEW_PASSED (동일 Codex 문서·정적 자체검토).
2026-09-11 사용자 `작업이어서해줘`로 아래 정확 범위 구현·검증 완료 / DONE / CODEX_PASSED.
2026-09-10 계약검토만 수행한 이력은 유지하며, 오늘 결과는 별도로 기록한다.

## 목표 (WHY)

100 preparation의 frame capture/source identity 수명에121의 검사된 배경 size lease를 연결한다.
113/114의 일반 producer에 임의 증거나 별도 Blob을 넘기는 우회를 만들지 않는다.
결과는 치수와 해제 책임뿐이며 그리기·사진 방향 승인·제품 UI 연결이 아니다.

## 범위 (SCOPE / WHERE)

후속 구현의 정확 신규 코드2개:

- apps/mockup/src/room-placement/background-absence-preparation-port.ts
- apps/mockup/src/room-placement/background-absence-preparation-port.test.ts

문서7개: 이spec,123 review/handoff,Automation STATE/NEXT, CURRENT,live log.
기존100~122 구현·시험/공개barrel/기본앱/UI/fixture/E2E runner/config/Rules/package/lockfile 수정0.
기존 보호·사용자 변경23개(AGENTS.md,debug.log,기존별도문서와설정 포함)를 변경·복원·stage하지 않는다.
실사진·실제UID·Firebase·운영·배포·설치·다운로드·예약 자동화0. 레거시/암호화/인쇄 계약 불변.

## 구조와 공개 표면 (WHAT / HOW)

`createRoomBackgroundAbsencePreparationPort(environment: unknown)`.
environment는 신뢰된 내부 `{readRequest(identity),decode(blob,options),createReader?}`다.
성공 frozen `{ok:true,port}`,무효 factory는 frozen `{ok:false,code:'ROOM_BACKGROUND_WORK_INVALID_INPUT'}`.
port는 frozen `{startBackground(identity,sink),getState,dispose}`.
기존114 factory/121 factory를 수정하거나 기본 decoder를 생성하지 않는다.

### 1. 입력 소유권 / 슬롯 확보

- factory에서 readRequest/decode/createReader 각1회 캡처,함수검사·this 보존. createReader 생략은
  121의 기존 기본FileReader 계약을 계승한다. decoder와readRequest는 필수이며 기본 구현이 없다.
  캡처한 decode/createReader만 담은 신뢰된 wrapper로121 work를1개 생성한다.
- `readRequest(identity)`는 동기식이며 `{identity,file,budget:{maxEdge}}`를 반환한다.
  identity는 전달받은 동일한 불투명 object 참조여야 한다. 반환 identity가 다르면 file getter 전에 거부.
  정상 identity가 여러 번 조회되면 동일한 File/Blob 참조와 같은 maxEdge를 나타내야 하며,
  실제 배경/예산이 바뀌면 공급자가 새 identity를 사용하고 controller.clear/prepare로 전환해야 한다.
  이 일관성은 신뢰된 공급자의 의무다. reference 비교만으로 악성 공급자의 의미 일관성을 증명하지 않는다.
- 예약 전 readRequest를 호출하지 않는다.121 work.start에 모듈-private 지연 request를 전달하여
  121 admission.begin 이후119의 file getter 진입 안에서만 readRequest를1회 실행한다.
  호출자에게 lazy request/validator/lease를 노출하지 않는다. getState를 사전 조회하고 별도 start하는
  check-then-act 방식이나 새 admission을 겹쳐 설치하는 방식은 사용하지 않는다.
- 지연 getter 내부에서 반환 record와 identity/file/budget/maxEdge를 각각1회 캡처하고
  plain `{file,budget:{maxEdge}}` snapshot을 만든다. 뒤의 budget getter는 이 snapshot만 반환한다.
  identity와file을 반복조회하거나 객체 전체spread/추가 thenable 호출을 하지 않는다.
  참조는 work.start의 동기 경계가 끝나면 finally에서 제거한다.
- 무효/throw/반환 identity불일치는 고정 실패로 귀결,FileReader/decode0. BUSY/BLOCKED/DISPOSED는
  readRequest/반환값getter/FileReader/decode0. sink 메서드 검사까지0이라고 주장하지 않는다.
  getter마다 port의 종료 여부를 재확인해 재진입 dispose 후 다음 getter/reader를 시작하지 않는다.
- 119/118의20,000,000bytes·40,000,000pixels·명시maxEdge·metadata 선차단을 그대로 사용한다.
  파일은119가 직접 검증해 만든 동일snapshot으로만121 decoder에 들어간다.

### 2. sink / 재진입 / 오류

- startBackground의 identity는 null/array/function이 아닌 object. 무효 identity/sink 또는
  complete/fail 비함수/throw는 `Error('ROOM_BACKGROUND_WORK_INVALID_INPUT')`로 안전화,
  readRequest/reader/decode0. sink.complete/fail은 각1회 캡처·this 보존,raw 예외 노출0.
- 유효 sink이면 frozen `{cancel}` handle을 만든다. 종료 flag와 cancel 추적을 work.start 호출
  **이전**에 준비한다. begun이 아직 반환되지 않은 재진입 dispose에도 종료를 기억하고,
  반환 후 begun.task.cancel을 적용한다. 취소된 요청의 callback을 뒤늦게 재등록하지 않는다.
- work.start 실패(BUSY 등),task.result 실패,성공인데 takeLease null이면 활성 sink.fail()1회.
  sink에는 file/decode 원오류/상세code/Blob/bitmap을 전달하지 않는다.100은 기존
  ROOM_PREPARATION_BACKGROUND_FAILED를 유지한다. 원인의 구별은121 내부 결과 계약에 남는다.
- 성공일 때만 task.takeLease()1회→sink.complete(lease). 전달 전에 ended 및추적제거를 처리한다.
  size lease는121의 frozen `{width,height,release}` 그대로이며 원자원용 side-channel은 없다.
  complete throw면 lease.release를 시도,fail 추가호출/자동재시도0. fail throw도 안전하게 종료.
- cancel은 멱등,종료 후 sink callback0. task.result가 이미 성공했더라도 callback 전에 취소하면
  lease는 인계하지 않고 해제한다. close 오류/미관찰 decode 작업의 blocked는121에서 유지한다.

### 3. 컨트롤러 연결 / 공동 폐기

```text
100 source 검사 → frame capture → source 재검사 → 새port.startBackground
  → 121 슬롯 예약 → 신뢰된 identity 입력조회 →119 검사/snapshot →121 decode
  → size lease 인계 →100 source 재검사 → ready(치수만)
취소:100 frame 해제 + port task.cancel → 늦은decode 정착 →close → 슬롯 반환
```

- 100은 수정하지 않는다.123 unit에서 실제100을 import하고 새port.startBackground를 주입한다.
  capture 실패/소스 차단은 readRequest0. decode pending 중 교체는 옛 요청 SUPERSEDED,
  새 요청 BACKGROUND_FAILED(BUSY),새reader/decode0이며 새 frame은 생겼다면100이 해제한다.
  ready 교체는 먼저 old frame/배경lease를 해제한 다음 새 입력조회1회.
- source 변경은100의기존 검사 지점(전후/complete/readPrepared)에서 발견된다. observer나즉시감지 추가0.
  background 변경은 새로운 identity와명시 prepare/clear가 필요하다. 조용한 자동 재해석/merge0.
- controller.clear/dispose는 frame과 handle/받은lease를 종료한다. port.dispose는 자기 work를
  영구 폐기하지만100의ready상태나frame을 직접 수정하지 않는다. composition 소유자는
  `controller.dispose(); port.dispose();` 순서로 둘 다 반드시 종료한다.
  port 단독 dispose는 보류 중100 Promise를 완료시키지 않을 수 있으므로 정상 teardown으로 쓰지 않는다.
- readRequest 내부에서 controller.clear가 재진입하면100은 아직 cancel handle을 받기 전일 수 있다.
  이때 read1이 시작될 수 있으나 start 반환 후 취소되고 decode/ready0이어야 한다.
  이를 port.dispose 재진입(read0 보장)과 구별해 시험한다. 기존100 API 없이 read0라고 과장하지 않는다.
- 100의기존치수cap1,000,000을 유지한다.121 예산에 맞아도100 cap을 넘으면100이 lease를 거부·해제한다.
  cap 완화/실기기 최대메모리/현실사진 방향/그리기 권한은 이 계약에서 확정하지 않는다.

## 검증 (VERIFY / 후속 구현의 DONE 조건)

실제100/119/121/112를 mock하지 않고 합성FileReader/decode/프레임capture만 주입한다.

| 영역 | 필수 단언 |
|---|---|
| 무호출 | import/factory I/O0; invalid sink/identity,source/capture 실패,disposed/BUSY 입력조회0 |
| snapshot | identity 및4필드 단일캡처; 잘못된identity는file0; 반환후 변경이이미읽힌예산에영향0 |
| 정상 | capture→lookup→read→decode→complete; 같은119snapshot;치수-only;clear에양쪽해제1 |
| 교체 | pending교체에입력조회/reader/decode 추가0;ready교체는이전close후새작업 |
| 취소 | read전/읽기중/decode중/result성공-callback전/ready후 취소;callback0/close최대1 |
| 재진입 | sink getter,lookup,반환필드getter,reader,decoder,complete/fail/close의재진입·throw |
| 폐기 | lookup내port.dispose,controller.clear 각각기대값;공동dispose;late성공/reject;held정리 |
| 차단 | metadata/read/치수오류,non-Promise/close실패blocked,raw출력0,자동retry0 |
| 기존100 | source변경/readPrepared/기존cap/잘못된background identity/완료후정보복사·수정독립 |

targeted 명령:
`node node_modules/vitest/vitest.mjs run apps/mockup/src/room-placement/background-absence-preparation-port.test.ts apps/mockup/src/room-placement/background-preparation-port.test.ts apps/mockup/src/room-placement/background-absence-decode.test.ts apps/mockup/src/room-placement/preparation.test.ts`.
전체 `node scripts/check.mjs`; 기존 `node scripts/e2e-run.mjs --background-lifecycle-only` 및
`node scripts/e2e-run.mjs --absence-decode-chromium-only` 회귀. 새port native 연결시험은 별도이며 NOT TESTED.
보호23/번들3 SHA,정확code2/docs7,diff--check,포트/자기temp,scope 확인. 기존122수치를새실행으로전용0.
fixture식별자가CSS클래스탐색에영향을주면 허용범위내원인수정후재검증,단언/설정완화0.

## 위험 / 판정

CONTRACT_REVIEW_PASSED는 위 구조가 현재API로 설계 가능하다는 정적 자체검토 결과다.
구현·합성/native·운영 PASS가 아니며 기존116 PNG14불일치 및일반metadata미지원은 그대로다.
이 비연결 범위에는 새Founder 제품선택 없음. 구현시 기존코드 변경/중요정책·새권한이 필요하면 STOP.
2026-09-10에는 계약검토만 수행해 문서7을 로컬에 남겼다. 2026-09-11 재개는 위 구현 범위에 한정한다.

### QUESTIONS

미해결 Founder 질문 없음. 위검증조건은 후속 구현에서 실측해야 하며 미충족시 완료로 표시하지 않는다.

### DONE (Codex) — 2026-09-11

코드 `641b13c`, 동일 Codex 구현·자체검수(독립 검수 아님). 신규port/test2만 추가했다.
lookup은121 슬롯 내부,identity/file/budget 단일 캡처,종료 추적 선등록,치수lease만100에 전달.
기존100/119/121/112 구현은 수정하지 않고 실제 모듈을 사용하는 합성시험으로 검증했다.

- 신규unit63, targeted209=신규63+기존146 PASS(4파일).
- `node scripts/check.mjs` PASS: format/lint351파일,7프로젝트typecheck,
  unit3528=기존3465+신규63(116파일),mockup/admin build2.
- `--background-lifecycle-only`: Chromium46/46(7.6s),
  `--absence-decode-chromium-only`: Chromium12/12(3.1s). 회귀합계58=46+12.
- 첫 시험 수집 실패: hostile getter를it.each 목록 포맷에서 먼저 평가했다. 함수형case 생성으로 수정.
  첫check는시험kind의string index 타입오류2건으로 실패,리터럴tuple로 수정한 뒤전체check 재실행PASS.
  게이트/기존코드/단언 완화0. 신규port 제품결함 재현0. 기존500kB chunk warning은 유지.
- 보호·사용자23 SHA-256 불변,예상밖dirty0,신규code2/docs7만 전송대상.
  기본mockupJS/CSS·adminJS3 SHA는 이전값과 동일(전체 해시는review).
  diff--check PASS,자기temp AiSUpF/DfG4xv 부재,4183/4184/4185 listen0.

완료 범위는 합성 입력의 비연결 preparation bridge다. 새123native 통합/실사진/실기기/UI/운영은
NOT TESTED/미개방. 기존116 PNG14불일치·일반metadata미지원은 해결하지 않았다.
후속은 동일 bridge의 합성 native 검증 계약부터이며 별도 범위 없이 fixture/UI를 변경하지 않는다.
