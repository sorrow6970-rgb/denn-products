# 121 — 부재 확인 Blob과 단발 decode 수명 결속

2026-09-10 / 기준 57f6dd0 / CONTRACT_REVIEW_PASSED (동일 Codex 자체 검토).
사용자 루틴 재개 지시에 따른 비연결 내부 어댑터다. PG-1 재승인/실사진 허가가 아니다.

## 목표 (WHY)

119가 직접 만든 동일 byte snapshot만 신뢰된 decode 포트로 넘기고, 논리 취소와 실제 Promise
정착을 분리한다. 검증된 치수와 해제 책임만 반환하며 drawable/표시 권한을 노출하지 않는다.

## 범위 (SCOPE / WHERE)

신규 코드2개: `apps/mockup/src/room-placement/background-absence-decode.ts`,
`apps/mockup/src/room-placement/background-absence-decode.test.ts`.
문서7개: 이 spec, 121 review/handoff, STATE/NEXT/CURRENT/live.
기존100~120 코드/시험·barrel·기본 UI·fixture·runner·config·Rules·package/lock 및 보호23 변경0.
실사진/운영/Firebase/배포/설치/다운로드/예약 자동화0. 기존 레거시·암호화·인쇄 계약 불변.

## 계약 (WHAT / HOW)

- `createRoomBackgroundAbsenceDecodeWork(environment: unknown)`는 명시적인 신뢰된
  `{decode(blob, options), createReader?}`를 캡처한다. decode 필수 함수, createReader는 생략 또는 함수.
  getter 각1회/this 보존, 무효는 `ROOM_BACKGROUND_WORK_INVALID_INPUT`. 기본 decoder는 없다.
  성공 frozen `{ok:true,work}`. import/factory는 FileReader/decode/DOM/네트워크0.
- work는 `{start(request),getState,dispose}`. start는119와 같은 `{file,budget:{maxEdge}}`만 읽는다.
  caller evidence/다른 blob/validator는 무시. 112 admission 예약 후119 factory/run을 직접 호출한다.
  BUSY/BLOCKED/DISPOSED일 때 request getter/reader/decoder0. 한 work owner 안의 동시 작업1개다.
- task는 frozen `{result,cancel,release,takeLease}`. result는 frozen `{ok:true}` 또는 고정 오류.
  입력/119 실패는 기존 code 유지. 기타 WORK_CANCELLED/DISPOSED 및
  `ROOM_BACKGROUND_DECODE_FAILED`, `ROOM_BACKGROUND_DECODE_SIZE_MISMATCH`,
  `ROOM_BACKGROUND_DECODE_OUTCOME_UNKNOWN`. 예외 원문/파일명/bytes/bitmap 로그·결과 노출0.
- 119 성공 후 private pair를1회 take하고 job.dispose. 같은 snapshot만 decode에 전달한다.
  options는 frozen `{imageOrientation:'from-image'}`. PG-1 저장 픽셀 기준이며 추가 회전/추측0.
  증거는118의 core-only-v1/20Mbytes/40Mpixels/명시maxEdge 그대로, decodeAllowed:false를 변경0.
  반환 Promise가 작업 전부를 대표하며 reject 시 숨긴 자원이 없다는 것은 trusted 포트 의무다.
- native Promise.prototype.then으로 관찰, 임의 thenable 실행0. 동기 throw/비-Promise는 실제
  완료를 증명하지 못하므로 OUTCOME_UNKNOWN 및 blocked. 타이머/자동 retry/임의 시간 후 슬롯 재개0.
  변조 realm/Promise species/숨긴 별도 작업까지 보증하지 않는다.
- 취소/폐기는 즉시 논리 결과를 정착시키고119 read를 취소한다. decode가 시작됐다면 실제 Promise
  resolve/reject까지 슬롯을 유지한다. late 성공은 close만 하고 치수 읽기/lease 인계0.
  read 취소는119의 abort/논리 종료 계약을 계승하며 OS I/O·GC 완료 보증으로 확대하지 않는다.
- decode 결과는 private 객체. close를 먼저1회 캡처하여112 release 자원으로 등록한다.
  close 유실/throw는 blocked. 유효하면 width/height 각1회 및 재진입 취소 여부를 확인한다.
  안전한 양의 정수이고 encodedWidth/encodedHeight와 정확히 같을 때만 성공. 불일치는 close 후 거부.
  이 비교는 사전 예산을 계승하지만 decoder peak memory나 전체 Huffman/deflate 유효성 증명은 아니다.
- takeLease는 성공·held·미취소 상태에서1회 frozen `{width,height,release}`만 반환.
  Bitmap/Blob/증거를 밖으로 넘기지 않는다. release/cancel/dispose는 close 최대1회, 과거 task의
  늦은 cancel이 새 task를 취소하지 않는다. 정리 중 재진입 start는 BUSY 또는 BLOCKED.
- 113/114 API를 변경하거나 어댑터를100/기본 앱에 연결하지 않는다.112만 직접 재사용한다.
  113의 callback 수명 원칙과114의 치수 lease shape를 계승하되 사용자 파일과 decoder를 별도 side-channel로 잇지 않는다.

## 검증 (VERIFY)

신규 합성 unit: 같은 bytes/MIME·caller 증거 무시·형식/metadata/CRC/예산 거부 전 decode0,
단발 read/decode/close, pending 취소/late 성공·reject/미정착 슬롯, 성공 후 take/release,
getter/decoder/close 재진입·throw, 차원 불일치, thenable 미호출, dispose, raw 출력0.
실제119/118/112를 import하고 mock하지 않는다. decode와reader만 신뢰된 fake이며 native 지원 증명 아님.
targeted 신규+119+113+112, 전체 `node scripts/check.mjs`, 기존 opt-in
`node scripts/e2e-run.mjs --background-lifecycle-only` Chromium46 회귀.
기존 E2E는 새121 native decode 검증이 아님. 새 native는 후속 격리 계약에서 검증한다.
보호23·번들3 SHA, diff--check, 정확scope9, 포트/자기temp, 일반 Git 전송 확인.
기존116 PNG 방향14불일치 유지, 보호PNG를 쓰는 전체E2E0. 실패를 skip/단언 완화로 닫지 않는다.

## 위험 / 후속

core-only-v1은 매우 좁은 부분집합이다. 정상 metadata 지원·제품 UI·실사진·운영은 별도다.
이 단위는 치수/해제만 인계하므로 룸 그리기 완료가 아니다. 다음은 새 어댑터의 합성 native 검증.
신규 비연결 모듈을 import하지 않는 것이 롤백 경계. 신규 의존성/권한·예산/제품 결정 필요 시 STOP.

### QUESTIONS

위 비연결 범위의 새 Founder 선택 없음. 구현 전에 자체검토로 범위를 고정했다.

### DONE (Codex) — 2026-09-10

코드 ec87d65 / CODEX_PASSED (동일 Codex 자체 검수). 신규 코드2개만.
신규 unit65, targeted166=65+119의36+113/114의42+112의23 PASS(exit0).
전체 check3462=3397+65,115파일·format/lint346·7typecheck·2build PASS(exit0).
최초 lint의 constructible fake reader 경고1건을 생성자 this 검증 추가로 해결 후 전체 재실행했다.
기존 Chromium46 회귀 PASS(exit0,6.8s). 새121 native decode/실사진/운영은 NOT TESTED.
보호23 및 번들3 SHA 동일, 정확scope9/diff--check PASS. 포트4183/4184/4185 listener0,
자기temp denn-e2e-KRCHtk 자동정리 후 부재 확인. 전송 결과는 Git 확인 후 상태 문서에 기록한다.
## 전송 완료

코드 ec87d65/문서 e71e44b 일반 push 완료, HEAD=origin e71e44b·0/0 확인.
121 DONE/CODEX_PASSED(동일 Codex), 다음 합성 native 계약 검토로 루틴을 이어간다.
