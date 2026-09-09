# 105 — 룸 배경 bounded file owner 계약

최신 전송2026-09-09: 사용자 코드5/문서7 및 동일문서 최종기록 전송 승인 확인.
77773db/bc1c240 일반push 성공(d063ae1..bc1c240), HEAD=origin·0/0 확인(최종기록 전).
같은7문서 최종전송 기록만 commit/push 후 Git 확인.105 DONE/CODEX_PASSED, 제품/시험 추가변경0.
후속 루틴은 방향/EXIF 근거 조사부터이며 decoder/UI/운영 승인으로 확장하지 않는다. 아래 미전송은 이력이다.

최신2026-09-09: 구현·로컬 검증 DONE / CODEX_PASSED (동일 Codex 자체 검토), 코드 `77773db`.
사용자 루틴 재개 및 `응 확인하고 이어가` 지시로 §2의5파일을 구현했다. 원격 전송은 아직 미실행.
아래 문서까지만/구현 미착수는2026-09-08 계약 작성 당시 이력이며, 최신 결과는 아래 구현 완료 절이다.

2026-09-08 / baseline `d063ae1` / rebuild/modern-studio.
CONTRACT_REVIEW_PASSED — 동일 Codex 문서 자체 검토. 구현 NOT STARTED / 실행 NOT TESTED.
최신 사용자 `착수해줘`는 NEXT의 **문서 계약 작성·검토** 착수다. 이번 제품/시험 파일 작성·실행0.

## 1. 목표 (WHY)

[104](104-room-background-input-preflight-contract.md)의 동기 검사 전 파일 읽기를 제한하고,
검사한 바이트를 불변 사본으로 인계하는 경계를 만든다. 배경을 보여주거나 decode하는 단위가 아니다.
[RG-3](../../codex-claude-handoff/decisions/2026-09-08-rg3-room-background-input-policy-decisions.md)의
정적 JPEG/PNG, 20,000,000 bytes 및 40,000,000 pixels 상한을 바꾸지 않는다.

## 2. 범위와 대상 (SCOPE / WHERE)

이번 변경은 이 계약·105 review·105 handoff·STATE/NEXT/CURRENT/live의 **7문서만**이다.
다음 명시적 구현 착수 시 허용할 코드/시험 경로는 아래 **5개**다. 지금 생성·수정하지 않는다.

| 경로 | 후속 구현 책임 |
|---|---|
| `apps/mockup/src/room-placement/background-file.ts` | 단발 job·native FileReader 기본 경계·불변 Blob lease·주입 reader seam |
| `apps/mockup/src/room-placement/background-file.test.ts` | 합성 Blob/bytes·결정적 fake·재진입·실패·복사 계수 |
| `apps/mockup/src/e2e/room-background-file-fixture.tsx` | 합성 브라우저 시험 전용 bridge, 제품 디자인/사진 선택 UI 아님 |
| `apps/mockup/src/e2e/canvas-fixture.tsx` | 시험 bridge import 및 정확 `?roomBackgroundFile=1` 분기만 추가 |
| `tests/e2e/room-background-file.spec.ts` | 기존 별도 fixture 서버에서 native FileReader/Blob 검증 |

기존 [fixture 진입](../../../apps/mockup/src/e2e/canvas-fixture.tsx)과
[별도 build](../../../apps/mockup/vite.e2e-fixture.config.ts)를 사용한다. 새 HTML/build input/config/script0.
다른 fixture 분기/시험은 그대로 유지한다. 고객/admin entry에서 import0, 새 공개 package export0.
104 소스는 import만 하고 변경0. [100](100-room-preparation-controller-contract.md)의 capture-first 및
[102](102-room-frame-snapshot-contract.md)의 자원 계약 연결·수정0.

제외: EXIF/parser 확장, Image/createImageBitmap/Canvas/URL, decoder, source producer,
파일 선택 UI·룸 합성·React 제품 연결, 실제 사진·서비스·Firebase·UID·Rules·배포·발행·삭제,
신규 의존성/설치/다운로드/환경 우회/자동화. 기본 앱에서 job 생성·읽기·네트워크0.

보호/별도 dirty22는 시작 SHA 기준으로 보존한다. AGENTS.md, taste-v2/**, design/README.md,
038, spec018 PNG2, render/plan/index.ts 및 별도 사용자 변경을 복원/stage/commit하지 않는다.
이번 문서 검증은 PNG를 재생성하지 않는다. 후속 canonical 실행의 기존 PNG 예외는 §8에 한정한다.

## 3. 근거와 한계

공식 확인일 2026-09-08. W3C **File API**, 2026-08-23 Working Draft이며 최종 Recommendation이 아니다.

- [§3.1.1/3.2](https://www.w3.org/TR/2026/WD-FileAPI-20260823/#constructorParams): Blob의 byte 크기와 BufferSource로부터 복사되는 내용, 불변 byte 표현이 정의된다.
- [§3.3.1](https://www.w3.org/TR/2026/WD-FileAPI-20260823/#dfn-slice): slice의 끝 offset은 제외된다. 물리 zero-copy 보장은 아니다.
- [§6.2/6.3](https://www.w3.org/TR/2026/WD-FileAPI-20260823/#FileReader-interface): readAsArrayBuffer와 새 ArrayBuffer 결과가 정의된다.
- [§6.2.3.5/6.4](https://www.w3.org/TR/2026/WD-FileAPI-20260823/#dfn-abort): abort의 작업 중단·이벤트와 read chaining의 loadend 예외가 정의된다. 이번 job은 chaining하지 않는다.

위 문서는 실제 브라우저 PASS·즉시 GC·OS I/O 회수 시간·전체 메모리 상한의 증거가 아니다.
이번 설계 판단과 구현 요구는 아래 절에 별도로 적는다. 규격을 근거로 실제 사진 표시를 승인하지 않는다.

로컬 근거: [104 실제 API](../../../apps/mockup/src/room-placement/background-input.ts)는 bytes를
동기로 빌릴 뿐 보유/복사하지 않는다. 호출 뒤 원본 mutation을 막지 못하므로 결과만 저장해서는 부족하다.
[103 조사 §2~5](../../codex-claude-handoff/reviews/2026-09-08-spec-103-room-background-input-policy-investigation.md)는
026의 size-before-read 부재와 동일 byte·취소·동시 예산 공백을 구분한다. 026 재사용/변경0.

## 4. 공개 API와 입력 검증 (WHAT / HOW)

앱 내부 export 후보는 `createRoomBackgroundFileJob(request: unknown, environment?: unknown)` 하나와
필요한 readonly 타입이다. factory는 throw하지 않고 고정 실패 또는 `{ok:true, job}`을 반환한다.

입력은 `{file: Blob, budget: {maxEdge: number}}`. 실제 File도 Blob 입력에 포함한다.
지원 범위는 같은 realm의 표준 Blob/File이며 Proxy·duck type·cross-realm·subclass는 거부한다.
`Object.getPrototypeOf` 검사와 캡처한 native Blob.size getter의 brand 검사를 함께 사용한다.
size/name/type/arrayBuffer/slice의 사용자 shadowing을 신뢰하거나 호출하지 않는다.
File.name/lastModified/path/MIME/원문 bytes를 진단·로그·UI로 출력하지 않는다.

검사 순서:

1. request/file/budget/maxEdge를 예외 포착 아래 각각 한 번 캡처한다.
   maxEdge는 104와 같은 필수 safe integer 1..40,000,000. 실제 제품 기본값을 새로 정하지 않는다.
2. native brand/크기 N 검사. N은 safe integer이고 1..20,000,000이어야 한다.
   0/무효는 FILE_INVALID_INPUT, 상한 초과는 기존 ROOM_BACKGROUND_BYTE_LIMIT.
   실패 시 reader 생성·slice·읽기·104 호출·출력 Blob 생성 모두0.
3. 명시 environment는 `{createReader: () => ReaderPort}`만 사용한다. 함수는 한 번 캡처하고 this를 보존한다.
   제공됐지만 무효하면 FILE_INVALID_INPUT, 조용히 기본 reader로 fallback하지 않는다.
   기본 환경의 Blob/FileReader 필수 기능 부재는 FILE_UNAVAILABLE. factory/import에서 reader 생성0.
4. job을 반환하고 `run()`에서만 native slice(file,0,N)를 만든다. size N을 다시 확인한다.
   초과 원본을 N으로 자르는 우회는 없다. N은 이미 검사한 **전체 원본 크기**다.
   readAsArrayBuffer에는 이 bounded Blob만 전달한다. arrayBuffer()/stream()/text/base64/fetch 대체0.

job의 frozen 표면:

```ts
interface BackgroundFileJob {
  run(): Promise<BackgroundFileRunResult>; // 동일 Promise, 동일 작업, 한 번만 시작
  cancel(): void;
  dispose(): void;
}
// 성공: {ok:true, preflight: 104의 성공 결과, lease}
// 실패: {ok:false, code: 고정 오류 union}; Promise reject0
interface BackgroundFileLease {
  takeBlob(): Blob | null; // 한 번 인계, 내부 참조 즉시 제거
  release(): void;         // 아직 인계하지 않은 내부 Blob 참조 제거; 멱등
}
```

`run()`은 async wrapper로 매번 다른 Promise를 만들지 않는다. pending 중/종료 후 반복도 cached Promise다.
factory는 파일 참조만 보유하며 cancel-before-run/dispose-before-run은 읽기0으로 종료한다.
단발 job이라 reset/교체/자동 재시도/대기열이 없다. 같은 job에서 두 읽기를 시작할 수 없다.
여러 job 인스턴스의 전체 동시 수를 제한했다는 뜻은 아니다. 향후 연결부의 admission/동시 예산은 별도 STOP.

ReaderPort는 result:unknown, readyState:number, readAsArrayBuffer(Blob), abort(),
onload/onerror/onabort/onloadend의 nullable handler 속성만 필요하다.
정상 환경은 매 job 새 private FileReader를 반환하고 외부 공유하지 않아야 한다.
fake는 앱 내부 신뢰 경계이며 악성 플러그인 sandbox가 아니다. 가짜 reader의 size 거짓말/과다 할당을
wrapper가 **사전에** 막았다고 주장하지 않는다. 결과 검증은 이미 반환된 메모리를 되돌리지 않는다.
global/native intrinsic이 미리 변조된 환경의 보안 보증도 하지 않는다.

## 5. 같은 검사 바이트와 복사 예산

```text
정품 Blob 전체 size 검사 → bounded slice → private FileReader 1회
 → 고정 ArrayBuffer 결과/길이 검사 → Uint8Array view → 104 동기 검사
 → 같은 view로 native Blob 1회 복사 → mutable buffer/reader 참조 제거
 → preflight-only lease → takeBlob 1회 (불변 byte 인계, decode 허가 아님)
```

onload에서 캡처한 reader의 readyState가 DONE인지 확인하고 result를 한 번만 읽는다.
event.target/result를 신뢰하지 않는다. getter마다 취소/종료 재진입을 재검사한다.
결과는 같은 realm의 표준 fixed/non-resizable/non-shared/non-detached ArrayBuffer, 길이 정확 N이어야 한다.
TypedArray/Buffer/string/null/Proxy/다른 realm은 실패한다. 104와 동일 intrinsic 방식으로 검증하되104 변경0.
유효 buffer에 Uint8Array view를 만들고104를 호출한다. 검사 실패이면 출력 Blob0, 원본 재읽기0.

검사 성공에서 native `new Blob([view], {type: format === 'png' ? 'image/png' : 'image/jpeg'})`까지
await·주입 함수·외부 getter·consumer callback을 넣지 않는다. 고정 비공유 buffer를 같은 JS 실행 구간에서
검사하고 스냅샷한다. 생성된 Blob 크기도 N 확인. 출력은 원본 File/slice가 아니라 **검사한 view의 사본**이다.
Blob 생성/검증 예외는 실패이며 실패 결과에 buffer/원문 예외를 포함하지 않는다.

인계되는 것은 mutable view/ArrayBuffer가 아니다. fake가 성공 뒤 반환 buffer를 바꿔도 출력 Blob은 변하지 않아야 한다.
lease 및 결과 wrapper는 frozen. `takeBlob()`은 첫 유효 호출만 Blob을 주고 이후 null이다.
release/cancel/dispose가 먼저 오면 takeBlob은 null. 인계 뒤 release/cancel/dispose는 소비자가 가진 Blob을
회수하거나 revoke할 수 없다. 이후 소비자는 자신의 참조·추가 복사를 책임지며 이를 가역 lease로 부르지 않는다.
후속 decoder는 이 Blob만 소비하고 원본 재읽기를 금지하는 **별도 계약**을 받아야 한다.

복사 장부(설계 요구, 측정치 아님):

| 단계 | 추가 byte 표현/참조 | 이번 코드에서 제한할 것 |
|---|---|---|
| 원본과 bounded slice | 원본 입력 + N 길이 slice 표현 | 원본은 caller 소유, slice1회; 내부 저장/복사 구현 미확정 |
| FileReader 결과 | N byte ArrayBuffer 1개 | 읽기1회, 추가 Uint8Array는 view만; .slice()/spread/structuredClone 복사0 |
| 불변 출력 생성 순간 | 결과 N + Blob snapshot N | 명시 full-size materialization 2개, 추가 snapshot1회 |
| 검사 완료 후 | owner의 Blob 참조1개 | reader/handler/원본/slice/buffer 참조를 terminal cleanup에서 제거 |
| 인계 또는 release 후 | owner의 byte 참조0 | 인계 받은 consumer/GC/브라우저 내부의 참조까지0이라는 주장은 금지 |

명시 두 표현의 합은 2N ≤ 2×20,000,000 = **40,000,000 bytes**.
이는 새 파일 허용 상한이나 실제 프로세스 peak가 아니다. 원본/slice 내부/I/O 임시/GC/다중 job/consumer 복사 제외.
불변 스냅샷 비용을 숨기려고 zero-copy라고 부르지 않는다. 실제 peak·GC 시점·다중 job 상한 UNCONFIRMED.
encodedPixels40M은 기존 제한이며 이 byte 장부와 별개다. `orientation: NOT_VERIFIED`, `decodeAllowed:false`
및 104의 preflight-only 의미를 한 글자도 승인 승격하지 않는다. Blob 존재는 이미지 사용 허가가 아니다.

## 6. 취소·늦은 완료·실패 순서

상태는 idle → reading → ready 또는 failed/cancelled/disposed. ready 뒤에는 인계/해제만 있고 재실행0.
public cached Promise를 외부 factory/reader 호출 **전에** 설치한다. 시작 중 동기 fake 이벤트는 후보만 보관하고
reader 준비와 readAsArrayBuffer 정상 반환 전 성공 확정/104/Blob 생성0. 시작 메서드가 뒤에 throw하면 실패다.
handler 설치 단계의 조기 이벤트는 성공으로 받지 않고 FILE_READ_FAILED로 종료한다.
첫 terminal 후보 뒤 중복 이벤트는 무시한다. 반환 전 cancel/dispose는 보류 성공보다 우선한다.

| 상황 | 결과/정리 | 뒤에 허용하지 않는 것 |
|---|---|---|
| native 생성·메서드 캡처·handler 설치·read throw | FILE_READ_FAILED, 획득한 handler/참조 정리, 읽기 시도 뒤라면 abort 최대1회 | 자동 재시도, 성공 후보 살리기 |
| load/결과 길이 불일치 | FILE_LENGTH_MISMATCH, snapshot0 | 원본 다시 읽어 보정 |
| 결과 타입/readyState 무효·getter 예외 | FILE_READ_FAILED | preflight/Blob 성공 |
| 104 실패 | 해당104 code 그대로, snapshot0 | 형식/치수 default 생성 |
| onerror 또는 원인 없는 onabort | FILE_READ_FAILED | raw reader.error/message 노출 |
| 성공/실패 없이 loadend만 도착 | FILE_READ_FAILED | pending 무한 방치 |
| pending cancel | 먼저 결과를 FILE_CANCELLED로 고정, handler 분리·abort 최대1회·참조 해제 | abort callback이 성공으로 뒤집기 |
| pending dispose | 먼저 FILE_DISPOSED로 고정, 동일 cleanup | 같은 job 재사용 |
| 성공 후 cancel/dispose/release | cached 결과는 바꾸지 않고 미인계 lease 무효화 | 이미 인계된 Blob 회수 주장 |
| 종료 후 늦은/중복 callback | terminal guard에서 무시, 새 buffer 읽기/검사/복사0 | 다른 job/이전 결과 변경 |
| 이벤트가 영원히 없음 | 명시 cancel/dispose 전 pending | 임의 timeout 성공, 재시도, 물리 완료 추측 |

cancel/dispose는 예외를 밖으로 던지지 않는다. terminal 판정은 먼저 고정하고 외부 abort/cleanup을 호출한다.
factory가 reader를 반환하는 도중 job이 취소돼도 뒤늦게 획득한 reader를 로컬로 정리하고 read를 시작하지 않는다.
cancel-before-run도 cached 취소 Promise를 준비하며, 이후 run은 그 결과만 반환한다.
handler 설치/해제에 재진입이 있어도 terminal 판정을 재검사하고 참조를 재설치하지 않는다.
abort 실패도 취소 결과를 되돌리지 않는다. 성공 후 abort 호출0. handler 제거 및 참조 해제는 각 경로에서 시도한다.
fake가 cleanup 자체를 거부하면 그 외부 잔류까지 회수했다는 보증은 없다. 정상 native와 fault-injection 결과를 분리한다.
한 reader에서 read chaining0. abort 이벤트/loadend를 기다려야만 public 취소가 끝나는 구조를 만들지 않는다.
JS 정지·브라우저 종료·실제 I/O 정착·callback 벽시계 상한 NOT VERIFIED. 시간이 지나면 성공으로 간주하는 정책0.

신규 오류는 `ROOM_BACKGROUND_FILE_` + INVALID_INPUT / UNAVAILABLE / READ_FAILED /
LENGTH_MISMATCH / CANCELLED / DISPOSED. 104 오류 union은 그대로 재사용한다.
factory 검증 순서 후 실행 중 terminal-first 규칙을 적용한다. 예외·파일명·bytes·URL 로그0.

## 7. 후속 검증 행렬 (아직 실행하지 않음)

unit:

- invalid request/throwing getter·각 필드1회·fake file·subclass/Proxy/cross-realm 거부;
  native size를 shadow하는 getter 미호출. 0/20,000,000/20,000,001 boundary와 읽기 전 거부 계수.
- 상한20,000,000의 유효 합성 envelope, 길이±1, 잘못된 result타입/shared/resizable/detached;
  MIME/확장자 주장과 상관없이104 결과 사용, PNG/JPEG·APNG/불량/edge/pixel 실패 전파.
- 작은 필수 maxEdge를 넘는 파일은 읽기 후104에서 거부한다. **header 미확인 상태에서 읽기0이라고 주장하지 않는다.**
- 정상 생성/읽기/104/snapshot 각각1, view byte-copy0. 상한 거부 시 전부0.
  native Blob 출력 byte 전수 비교, 반환buffer 사후 mutation에도 불변, take1회/release 먼저면0.
- start중 동기load/throw·factory/handler/method/result getter 재진입, 중복run 동일Promise·읽기1;
  cancel-before-run/중간/ready후·dispose·abortthrow·loadend-only·영구미완료·late callback의 고정 결과.
- A 취소 뒤 별도 B 완료, A late 이벤트는 B 결과를 바꾸지 않음. 동시 여러 job의 global budget 증명은 아님.
- import/default factory의 reader0; production entry import0; raw로그/URL/Image/Canvas/fetch0.

Chromium 합성 browser:

- 정확 `?roomBackgroundFile=1`에서만 시험 컴포넌트. File input·실제 사진·기존 Canvas fixture 실행0.
  작은 합성 PNG/JPEG Blob 및 File을 native FileReader로 읽고 인계 Blob의 bytes를 모두 비교한다.
- 거짓 MIME·빈 Blob·초과 Blob, single run·take/release, native read 직후 동기 cancel, 결과 이전 dispose.
  큰 파일을 느리게 읽을 것이라는 가정이나 sleep 시간으로 경합을 만들지 않는다.
- 늦은 이벤트/읽기 오류/불량result는 주입 fake로 결정적 재현하고 **native I/O 실패 실측**과 구분한다.
- native Blob 사본의 원본buffer 변경 전후 byte 불변과 같은104 metadata를 대조한다.
  확인을 위한 test의 output.arrayBuffer() 추가 복사는 제품 장부에 섞지 않고 테스트 전용으로 기록한다.
- 기존 browser request guard로 localhost 이외 차단; 외부 egress0·console warning/error0.
  Image/URL/Canvas/decode0을 이 분기 실행 경로에서 계측한다. 기존 harness의 다른 분기 코드는 삭제하지 않는다.

## 8. 검증 명령·완료 정의

다음 구현 착수 뒤에만 실행:

```text
node_modules/.bin/vitest.CMD run apps/mockup/src/room-placement/background-file.test.ts
node_modules/.bin/tsc.CMD --noEmit -p apps/mockup/tsconfig.json
node scripts/check.mjs
node scripts/e2e-run.mjs
git diff --check
```

기존 설치본만 사용. 104에서 확인한 pnpm exec 해석 문제 때문에 기존 .CMD를 명시했다. 신규 설치/수정0.
canonical이 신규 E2E를 포함하는지 파일명/실측 결과로 확인한다. 테스트 수를 미리 PASS 숫자로 쓰지 않는다.
새 모듈/fixture가 제품 번들에 들어가지 않아 고객/admin entry·고객CSS의 시작 SHA가 모두 같아야 한다.
fixture build는 기존 OS temp 영역만 사용; 포트4183/4184/4185/8080/9099/9199 잔류0, 타 프로세스 종료0.
보호22 중 기존 canonical PNG2 재생성 예외만 hash 변화 보고·복원/stage/commit0, 나머지20 SHA 동일 요구.
허용5경로 외 코드/config/Rules/package/lock/운영 변경0. 신규 fixture 문자열의 CSS 부수효과도 회귀로 처리한다.

제품 DONE은 위 unit/typecheck/check/canonical/범위/hash/정리 게이트 통과 후 실측 기록이 있을 때만 가능하다.
104의96/2841/281은 이번 결과가 아니다. 이번은 문서 링크/범위/dirty보존/diff만 검사한다.
로컬 계약 문서7개는 unstaged로 남긴다. stage/commit/push/fetch0; 전송 권한 차단을 우회하지 않는다.

## 9. 위험과 다음 경계

이 계약이 다루는 것은 bounded **입력과 불변 인계**, 시스템 전체 자원 제한이 아니다.
다중 job admission, 실제 소비자의 참조 수명/방향/decoder/decoded 치수/동시 메모리,100/102 연결은
별도 계약 전 STOP. 크기 제한을 모든 기기 안전성으로 바꾸거나 EXIF 부재를 orientation1로 가정하지 않는다.
기본 앱/운영 변경이 없으므로 사용자에게 이번 작업을 실제 배경 사진 표시 완료라고 설명하지 않는다.
[검토 기록](../../codex-claude-handoff/reviews/2026-09-08-spec-105-room-background-file-owner-contract.md).

### QUESTIONS

이 단발·비연결 계약 범위의 추가 Founder 제품 선택 없음. 구현은 다음 명시적 착수 지시 전 NOT STARTED.
새 형식/상한/기기기본값/권한/fixture 범위 확장이 필요하면 구현자가 임의 확장하지 않고 STOP한다.

### DONE (Codex)

## 구현 완료 — 2026-09-09

코드 `77773db`, 정확5파일. 단발 FileReader job, native Blob size/brand·bounded slice,
fixed ArrayBuffer 결과 검사,104 동기 검사와 같은 view로 만드는 불변 Blob1회 인계를 구현했다.
중복run은 같은Promise, startup 이벤트 보류·중첩load 방어·terminal-first·취소/late/해제 분기를 고정했다.
default reader는 run 전 생성0. 원본 filename/MIME에 의존하지 않고 decodeAllowed:false를 유지한다.

검증 실측:

- targeted `vitest.CMD run .../background-file.test.ts`: **83/83 PASS**.
  같은 reader buffer를104에 전달하고 snapshot 생성1회임을 계측했다. PNG/JPEG·APNG·CRC·pixel,
 20,000,000 byte 경계, invalid/native brand·shadow getter·길이/타입·동기/늦은 event·취소·복사 실패 포함.
- targeted mockup typecheck PASS. 처음의 TS2352 두 곳은 native brand 검증 뒤 `unknown` 경유 타입 단언으로 수정했다.
- 최종 `node scripts/check.mjs` PASS: format/lint319파일,7프로젝트 typecheck,
  **unit2924=기존2841+신규83**, 고객/admin build. 기존500kB chunk 경고는 설정 변경 없이 남겼다.
- `node scripts/e2e-run.mjs` **Chromium292/292,56.1초 PASS = 기존281+신규11**.
  실제 native FileReader 합성 Blob/File 읽기와 byte 동일성, release/cancel/dispose·초과/빈 입력 검증.
  late/error/bad-result3시나리오는 주입 fake로 결정적 검증했으며 native I/O 장애 실측이 아니다.
  새11개에서 외부egress/console error·warning/Image/URL/Canvas/createImageBitmap0을 단언했다.
  이 실행 이후에는 unit5개만 추가했고 최종check를 재통과했다. 제품/브라우저 시험 코드는 같은 버전이다.
- 고객JS345,362 bytes SHA256 `FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`;
  고객CSS22,675 bytes `6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81`;
  adminJS294,873 bytes `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`.
  모두 시작 hash와 동일, 제품 import/UI 변경0.
- 보호/별도dirty22 중 PNG2를 제외한20/20 SHA동일. 전체21/22동일이며 desktop PNG만 기존 canonical 예외로 재생성:
  `972EE10863E97900320510530CBE2CDEA4B3C74EAD6ACAD930C438F10BC1E551`.
  mobile PNG `5043D55564D51A7F577EDBC520C2062C3FDA8FF277FE9B7C105E3FB8B0D135BD` 동일.
  PNG2 및 보호/별도dirty 전체 복원/stage/commit0. 허용 코드5+기존105문서7 외 추가 경로0.
- ports4183/4184/4185/8080/9099/9199 listener0; 이번 OS temp `denn-e2e-oNrifw` 제거 확인.
  diff--check PASS. 기존 pnpm-workspace3줄 등 별도 dirty 보존, Rules/config/lock 신규diff0.
- 이전 sandbox helper 오류에서 멈춘 상태 수정은 반영되지 않았음을 읽기로 확인했다.
  이번 최소 상태 수정은 정상 완료했고 도구 지연 후 구현/검증을 마쳤다. 권한/환경 설정 우회·설치0.

실제사진/EXIF 방향/decoder/기기전체 메모리/다중 job admission/100·102 연결/제품UI/운영은 NOT TESTED.
동일 Codex 자체 검토이며 독립 검수라고 부르지 않는다. 다음 후보는 방향/EXIF 근거와 소비자 계약 조사다.
다음 계약/구현은 이번에 시작하지 않는다. 원격 전송은 별도 정확범위 승인 전 시도하지 않는다.

### 계약 작성 당시 기록

문서 계약 작성·자체 검토만 완료. 제품 DONE 아님. 구현·시험·브라우저 실행 NOT STARTED / NOT TESTED.
이번 문서 검증 실측은105 review/handoff 및 STATE/NEXT/CURRENT/live에 기록한다.
