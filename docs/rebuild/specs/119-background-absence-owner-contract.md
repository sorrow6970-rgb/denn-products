# 119 — metadata 부재 증거와 동일 byte Blob 인계

최종DONE/CODEX_PASSED: code08dc655/docsf0ca262 일반push완료,HEAD=originf0ca262·0/0 확인.
보호23+번들3SHA동일. 아래전송STOP은직접승인및전송성공으로해소된이력. 최종결과1회기록후후속계약.

2026-09-09 전송승인 해소: 사용자 `응 승인해줘`로119 코드/문서7 및 향후승인스펙의고정GitHub
rebuild/modern-studio 일반전송승인. 보호/개인정보/secret/운영데이터/배포 제외. 아래전송STOP은과거이력.

2026-09-09 / 기준9429065 / CONTRACT_REVIEW_PASSED(동일 Codex 자체검토).
사용자 `응 루틴 끊지말고`에 따라 PG-1=A 및118의 다음 포인터를 구현·검증한다.

## 목표 / 범위

118 순수검사 결과와 다른 파일이 섞이지 않도록 읽기 owner 안에서 검사→snapshot→쌍 인계한다.
109의 P2(읽은 private bytes를 직접 검사) 구조를 재사용하며 두 번째 읽기나 caller 제공 증거를 받지 않는다.
decode/표시 승인은 아니다. 실제사진·기본앱·UI·Firebase·운영·배포·설치·예약 자동화0.

정확 허용 코드2개:

- 수정 apps/mockup/src/room-placement/background-file.ts (별도 factory/고정 내부모드/쌍 참조만)
- 신규 apps/mockup/src/room-placement/background-absence-owner.test.ts

정확 문서7개: 이spec,119 review/handoff,STATE/NEXT/CURRENT/live.
기존105/109 public API·타입·오류·동작,104/108/118 parser,기존test/fixture/runner/config,
packages/Rules/package/lock/기본entry와보호22+debug.log는 수정하지 않는다.

## 구조와 API

`createRoomBackgroundAbsenceJob(request:unknown, environment?:unknown)`를 background-file.ts에 추가.
입력105와동일 `{file,budget:{maxEdge}}`,신뢰된시험포트 `{createReader}`. caller validator/mode/판정 무시.
factory실패는 기존 BackgroundFileCode,성공은 frozen `{ok:true,job:BackgroundAbsenceJob}`.
새 타입 BackgroundAbsenceEvidence는118 성공형,BackgroundAbsenceCode는BackgroundFileCode와118 실패code 합집합.
job의 run/cancel/dispose·단발Promise/reader 의미는109와 동일하다.
run결과 frozen `{ok:false,code}` 또는 `{ok:true,lease:BackgroundAbsenceLease}`.
lease는 frozen `{take,release}`; take는 frozen `{blob,evidence}`를1회만 반환하고 이후null.
성공의 evidence는 METADATA_ABSENCE_ONLY/core-only-v1/encoded-pixels/decodeAllowed:false 그대로다.

내부 boolean을 module-private `preflight|orientation|absence` 고정모드로 명시화한다.
기존factory는104만,109factory는108만,새factory는118만 호출한다(각parser내104 호출은1회).
호출자에게 모드 선택 인자를 추가하지 않는다. 광범위 상태머신 리팩터0.

```text
File/Blob brand·size·maxEdge → native/private reader1회 → fixed buffer 길이N
 → 같은view118(내부104) → 같은view Blob snapshot1회 → private 쌍 → take1회
```

검사와snapshot 사이 caller/reader getter·await·callback0. 검증실패는 snapshot0/lease0.
snapshot MIME은검사한format만 사용하며 native size검사N 유지. snapshot 실패는 FILE_READ_FAILED.
108 증거와 새118 증거의 private참조를 구분한다. release/cancel/dispose는 아직보유한쌍을 제거한다.
take이후 consumer의Blob은 회수할수없다. terminal-first/중복·late무시/동기start이벤트보류/abort최대1회 유지.
각getter캡처1회, reentrant factory/read/result/cleanup취소 시 인계금지 검증.
신뢰된 fake reader가 거짓 bytes를 준 경우 원본File 동일성까지 보증하지 않는다.
caller 위조쌍 인증API/WeakMap 허가/기본decoder/실제사진 처리 추가0.

읽기N+snapshotN=2N≤40,000,000bytes 표현장부는109와 같다. GC/native peak 또는 동시job 상한 아님.
여러job의 admission과 decoder연결은 후속 정확계약이다. 이spec은 모든검증불가 입력 거부를 유지한다.

## 검증

- 신규unit: JPEG/PNG 쌍bytes일치·사후원본변경독립·서로다른job혼합0·take1/release/cancel/dispose.
- 기존API각parser호출분리,1181회/내부1041회,request/getters1회,caller판정무시.
- metadata/구조/edge/read실패는Blob0,read결과invalid/length/상한/같은Promise/late이벤트검증.
- reentrant취소(factory/read/result/cleanup),snapshotthrow·size불일치,default/import I/O0.
- targeted: `node node_modules/vitest/vitest.mjs run apps/mockup/src/room-placement/background-absence-owner.test.ts apps/mockup/src/room-placement/background-file.test.ts apps/mockup/src/room-placement/background-evidence.test.ts apps/mockup/src/room-placement/background-metadata-absence.test.ts`.
- 전체 `node scripts/check.mjs`,기존 selector `node scripts/e2e-run.mjs --background-lifecycle-only`.
  Chromium46=105 11+110 23+115 12의 기존회귀만. 새119 native경로는 NOT TESTED이며 이회귀로 승격0.
  기존111/116의 방향실패를 수정/skip하지 않는다. 보호PNG쓰는전체canonical은실행0.
- 보호23/번들3SHA·정확scope·diff--check·staged/Git·자기temp/포트 종료 확인.
- 새의존성/다운로드/기존시험완화/비재현게이트/보호변경/권한실패는 STOP.

## 검토 / 위험

109가 이미 쓰는private state를 확장하므로 새owner복사본을 만들지 않고 취소코드를 공유한다.
새실패code는 새run에만 노출한다. 기존결과와조건부경로는회귀시험으로 고정한다.
실제사진/native119경로/실기기/운영 NOT TESTED. 다음은 합성 native결속 검증 계약이다.

### QUESTIONS

이 비연결 범위에서 추가Founder 선택 없음. PG-1 재질문0. 실제파일/UI 권한으로 확대하지 않는다.

### DONE (Codex) —2026-09-09

코드08dc655,정확2파일. CODEX_PASSED(동일Codex 자체검수,독립검수아님).
targeted258=기존84+93+45+신규36,check3394=기존3358+신규36 PASS.
format/lint342·7typecheck·114unit파일·2build. 최초lint2건은신규test의non-null assertion과forEach반환;
명시null guard/void callback으로수정후전체gate와targeted재실행PASS.
기존Chromium46=11+23+12 PASS(exit0,6.1s). 새119native/실사진/UI/운영 NOT TESTED.
보호23+번들3SHA동일,정확scope9/diff--check PASS,관련포트0·자기temp자동정리확인.
전송결과는 확인후기록한다. 세부근거는119 review참조.

최종 전송 BLOCKED_TRANSFER: 문서7 commit/push명령이실행전권한거절.
HEAD08dc655/origin9429065·1/0,staged0. 새payload/destination 직접승인전우회/재시도/다음구현0.
구현자체검수는CODEX_PASSED지만원격완료/DONE으로승격하지않는다.
