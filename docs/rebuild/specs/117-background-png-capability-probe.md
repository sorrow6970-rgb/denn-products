# 117 — 비연결 PNG native capability probe

전송 완료: 코드3c13334 및 문서9839f2c 일반push 성공,HEAD=origin9839f2c·0/0 확인.
최종 결과기록은 같은 문서에서 한 번만 전송한다. PG-1 정책은미선택,아래전송차단은과거이력.

전송 승인 해소(2026-09-09): 사용자 `응 승인 다음 루틴진행해`로 직전 명시한 코드2커밋과
문서11개의 기존GitHub/rebuild/modern-studio 일반commit/push 승인. 아래전송BLOCKED는과거이력.
같은문서 최종결과동기화까지만전송하며 PG-1 제품정책은별도미선택이다.

2026-09-09 / 기준 HEAD585f88b +116 미커밋 조사 / CONTRACT_REVIEW_PASSED(동일 Codex).

## 목표·판정 경계

116은 조사 실행을 완료했으나232PASS/14FAIL이며 모든 엔진 지원은 증명하지 못했다.
최초 완료 기준의 조사/지원 게이트 구별에 따라 조사 결과는 보존하고, 지원 게이트는 계속 차단한다.
사용자 `응 다음 루프대로 진행해줘`에 따른 다음 비연결 검증 구조다. 제품 지원 변경/사진허가가 아니다.
116실패를 skip/xfail/기대값 완화하거나246PASS로 바꾸지 않는다. 이번 전송은116종료 판정과
117검증 및 정확scope를 모두 검토한 뒤에만 별도로 결정한다. 기존 unstaged를 한꺼번에 stage하지 않는다.

## 공식·로컬 근거와 자체 검토

[PNG Third Edition §11.3.4.5](https://www.w3.org/TR/2025/REC-png-3-20250624/#eXIf),
[HTML ImageBitmap §8.11.2](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap),
확인2026-09-09. PNG Exif의 현재 픽셀에 대한 의미 유효성과 브라우저의 처리 기능은 별개다.
from-image 지원 여부를 실제사진의 방향 정답이나 metadata 신뢰성으로 승격하지 않는다.
116 추가 진단에서 동일 Node 생성 PNG18개를 순차 전달:Firefox18일치,Chromium18일치,
WebKit4일치14불일치·18개 모두 encoded identity 픽셀. 브라우저별 encoder 차이를 제거해 재현했다.
입력 집합 SHA256 eb6459a3c116bb0e83069895511fe78755fdf7ea7ba0ecd8b1e57f36e3290c83.
합성 데이터만,외부요청0,진단exit0. 원래246회귀 결과를 대체하는 시험이 아니다.

구조 검토: RG-3의 검증불가 거부를 유지하며 새 photo 허가값을 만들지 않는다. UA 분기 대신
고정 합성표의 실제 비교 결과만 반환하는 격리 probe는 추가 Founder 제품 선택 없이 가능하다.
기존116 수정 금지 파일과 독립된 새 계약이다. 임의 PNG 보정/형식 제외는 범위 밖이다.

## 정확 허용 파일

- 신규 apps/mockup/src/room-placement/background-png-capability.ts
- 신규 apps/mockup/src/room-placement/background-png-capability.test.ts
- 수정 apps/mockup/src/e2e/room-background-file-fixture.tsx (격리 버튼과 호출만)
- 신규 tests/e2e/background-png-capability.spec.ts
- 신규 tests/background-png-capability.config.ts
- 수정 scripts/e2e-run.mjs 및 scripts/e2e-run.test.mjs (고정 selector만)
- 문서: 이spec,117 review/handoff,STATE/NEXT/CURRENT/live.116 spec/review/handoff의 진단·상태만 동기화.

제품 UI/entry/barrel/104~115구현/기존test/config/Rules/package/lock/보호22/debug.log 변경0.
기존116 code3/docs8은 소유권이 확인된 미커밋분으로 보존한다. 새설치/실사진/운영/자동화0.

## 구현 계약

`createRoomBackgroundPngCapabilityProbe()`는 인자 없이 frozen {run,dispose}를 반환한다.
import/factory 생성 시 DOM/Blob/decoder/네트워크0. run은 동일Promise 단발 실행이며 owner별이다.
시험코드에서 생성한 고정 RGB8 PNG rectangle48×32/square40×40 base64를 코드에 고정한다.
base는 Node zlib로 만든 동일 bytes이며 runtime canvas encoder를 사용하지 않는다.
각 base에111과 같은 II TIFF orientation1..8 eXIf+CRC를 넣고 absent도 확인한다(18=2×9).
동시 decode1/owner,한 case를 완전히 해제한 뒤 다음case;global/native peak 보증은 아니다.
native createImageBitmap(from-image) 뒤 출력canvas4분면 RGB/alpha와치수를 독립기대표로 비교한다.
PNG채널오차0,추가회전/resize/URL/Image/FileReader/fetch0. 실제객체/사진 입력 인자 없음.
native 치수가 안전정수1..48 밖이면 canvas크기설정 전에 실패한다. 출력bitmap.close 및canvas0은
성공/불일치/예외/늦은완료 모두finally로 수행한다. 정리 실패도not-proven이다.

반환은 frozen {status:'synthetic-match'|'not-proven',reason:'complete'|'mismatch'|'unavailable'|
'disposed'|'failed',checked,matched,decodeAllowed:false}. 모든18개 일치·정리성공일때만 synthetic-match.
이는 합성표에만 적용되며109 PARTIAL/NOT_VERIFIED를 바꾸거나production gate를 열지 않는다.
위조caller증명/다른Blob결속 API 없음. 후속 실제사진 판정이 이값만 믿어서는 안 된다.
dispose 전run은I/O0. pending dispose는논리중단,늦은bitmap을해제하고다음case0,해결 전Promise는pending.
물리취소/강제timeout/자동retry0. 무응답이면미종료STOP,사진작업과동시실행연결0.
완료 뒤 반환된관찰값을dispose가소급취소한다는주장은하지않는다.

## 검증

unit: import/factory I/O0,동일Promise,18일치/방향무시/치수오류/색오류/alpha오류,
decode거부/API부재/close예외,dispose전/도중·late해제/다음decode0,원문오류노출0.
fake는순서/분류만 검증;native지원은새E2E가별도확인한다.
격리fixture에 normal/dispose-before/dispose-pending만 추가;기존버튼/시험변경0.
새opt-inconfig는117파일만,Chromium/Firefox/WebKit이며기본config불변.
고정 --background-capability-{firefox,webkit,chromium}-only로 worker1 순차실행한다.
normal은현재실측각18/18·WebKit4/18을고정한다(시험기대값에만project구별,제품UA분기0).
모든결과decodeAllowed:false,실사진I/O0,late close,외부egress/consoleerror0 확인.
전체check,기존selector회귀,fixture영향105/110/115시험 및111방향기준은116결과와구별해실측한다.
보호22/번들3SHA,exactscope,diff--check,프로세스/포트/temp0. 실제기기·실사진·운영NOT TESTED.

### QUESTIONS

이probe는 사진 표시 권한을 만들지 않는다. 새제품선택없음. 실제표시/PNG보정은별도계약전금지.
116 실패표는이검증PASS로해소되지않으며별도지원게이트로남긴다.

### DONE (Codex) — 2026-09-09

코드3c13334,정확7파일. 동일Codex자체검수CODEX_PASSED(비연결관찰기범위),독립검수아님.
targeted38=probe15+selector23,전체check3313=3295+15+3 PASS.
format/lint339·7typecheck·112unit파일·2build. 고정18bytes연결SHA와close후다음decode순서검증.
새E2E9=각엔진3 PASS(Firefox8.9s/WebKit2.1s/Chromium1.2s),각exit0.
fixture영향회귀:Firefox82PASS(2.0m),Chromium82PASS(11.7s),WebKit68PASS/기존14FAIL(30.3s).
232PASS/14FAIL기준유지,추가실패0. 기존116단언/timeout/fixture기존동작완화0.
보호22·번들3SHA불변,정확scope/diff--check PASS,관련포트/테스트프로세스0,staging6부재확인.
실제사진입력/기본앱연결/운영/배포/신규설치/예약자동화0.
다음실제사진계약은PG-1(방향metadata부재파일의표시기준)선택전착수하지않는다.
이질문은117의기능구현승인재질문이아니며104/109가미승인으로남긴입력정책경계다.

전송BLOCKED:문서commit/push가실행전권한거절. 코드3c13334는로컬검증완료일뿐원격미전송이다.
정확묶음과기존GitHub목적지의직접승인전우회/재시도0. 문서11개/staged0 보존.
