# 116 — 룸 배경 교차 엔진 검증

## 최신 판정 — 조사 종료 / 지원 게이트 미충족

2026-09-09 다음 루틴 요청에 따라 원래 완료 기준을 재검토했다. 조사 완료와246PASS는 별개다.
단독246건의 결과·정리·동일bytes추가진단이 완료되어 INVESTIGATION_REVIEW_PASSED(동일Codex)로
조사 단위를 종료한다. 모든 엔진 지원 게이트는 여전히 NOT MET(232PASS/14FAIL)이다.
이는 Founder E2E 예외 승인이나 WebKit 지원/제품PASS가 아니다. 기대값·기존시험수정0.
반복 환경진단 대기 대신,117 비연결 기능 관찰 계약으로 진행한다. 부분증거의decodeAllowed:false유지.
아래 BLOCKED/전송0은 추가진단 전 이력이다. 진단 코드와 문서의 검수/전송은 제품지원 승인과 분리한다.

2026-09-09 / baseline585f88b / CONTRACT_REVIEW_PASSED (동일 Codex 자체 검토).
Founder `응 허용`으로 기존 Playwright1.61.1 Firefox/WebKit 테스트 브라우저 캐시 다운로드만 승인.
package/lockfile/OS 의존성/시스템 브라우저/운영 설정 변경이나 실제사진·배포 승인은 아니다.

## 목표와 정확 범위

111 픽셀방향36,105 owner11,110 evidence23,115 native lifecycle12의 기존 단언을 바꾸지 않고
Chromium/Firefox/WebKit에서 실행한다. 엔진당82=36+11+23+12,총246건은 실행 전 예상이다.
실측 실패는 관찰 결과로 남기며 기대값·색 허용오차·timeout/retry 완화로 통과시키지 않는다.

코드3개: scripts/e2e-run.mjs, scripts/e2e-run.test.mjs,
신규 tests/background-cross-engine.config.ts. 기본 playwright.config.ts 및 제품/fixture/기존시험 수정0.
문서8개: 이 spec,116 review/handoff,116 다운로드 결정 기록,STATE/NEXT/CURRENT/live.
보호22/debug.log 수정·stage·commit0. PNG 출력/실제서비스/설치의 범위 확대/예약 자동화0.

## 실행 계약

1. 로컬 CLI의 dry-run으로 정확한 버전·공식 URL·캐시 경로를 확인한다. firefox1532/WebKit2311만
   신규 다운로드 대상. CLI 보조도구가 이미 있으면 재사용하고, 추가 OS 설치가 필요하면 수행하지 않는다.
   기존 캐시를 정리하지 않도록 PLAYWRIGHT_SKIP_BROWSER_GC=1을 해당 호출에만 적용한다.
   공식 설치 명령은 로컬 @playwright/test/cli.js install firefox webkit, --with-deps는 사용하지 않는다.
2. 새 opt-in config는 기존 config의 서버/리포터/trace/타이밍을 재사용한다. config 위치 기준으로
   testDir/globalSetup만 올바르게 지정하고 testMatch를 위4파일로 고정한다.
   프로젝트3개는 Desktop Chrome/Firefox/Safari 프리셋. WebKit은 실제 Safari/iOS 기기가 아니다.
3. --background-cross-engine-only 단일 selector가 이 config만 실행한다. 다른 selector와 혼용/임의인자0.
   무인자 전체시험 및 기존 세 opt-in selector는 그대로 유지한다. 서버/포트 추가0.
4. 전체 check와 selector unit, opt-in246건, 프로세스/포트/temp 정리, 번들3종/보호SHA,
   정확scope와 diff--check를 확인한다. 실패는 엔진·형식·상태별로 분류한다.
5. 실제 기능 불일치가 확인되면 이미 승인된 RG-3 검증불가 거부를 유지한다. 지원엔진/형식 정책을
   임의 축소·확대하지 않는다. 제품 수정 필요 여부는 결과를 근거로 다음 정확 계약에서 결정한다.

## 재개 진단 계약 — 2026-09-09

사용자 `어 잠깐 느려졌었어 다시시도`에 따라 엔진별 단독 실행으로 재개한다.
기존3파일 범위 안에서 고정 selector --background-firefox-only, --background-webkit-only,
--background-chromium-only를 추가한다. 각각 같은 config의 정확 project 하나와 --workers=1만
선택한다. 임의 인자/timeout/retry 전달은 거부하고 기본 실행과 기존 selector는 유지한다.
단언·fixture·제품·기본 config 변경0. Firefox → WebKit → Chromium 순서로 각82건을
한 명령씩 종료 확인 후 실행한다. 앞선 중단/실패 기록을 삭제하거나 PASS로 덮지 않는다.
worker1 결과는 병렬 실행 안정성 증명이 아니다. 교차 엔진 실패는 그대로 보고한다.
추가 unit은 세 selector의 고정 인자와 추가 인자 거부를 검증한다.
로컬 테스트만 일반 실행 환경에서 수행하며 OS/브라우저 보안 설정 변경·추가 다운로드0.

## 완료 기준 (유지)

테스트 실행·관찰 장부·미검증 경계와 상태 문서가 일치할 것. 조사 완료와246 PASS는 구별한다.
제품 동작 결함은 CORRECTION_REQUIRED 또는 별도 구조/제품 결정 질문으로 분리한다.
다운로드 승인 질문은 해소됐으므로 반복하지 않는다. 실제사진/기기메모리/운영전환은 NOT TESTED.

### 검증 기록 (Codex) — BLOCKED_VERIFICATION

Firefox151.0(v1532,116.8MiB),WebKit26.5(v2311,58.8MiB) 공식 다운로드 성공,CLI exit0.
FFmpeg1011/Winldd1007은 기존 파일 재사용. 추가 다운로드/OS dependency/캐시 GC0.
check3292=3291+selector1,format/lint335·7typecheck·2build PASS.
교차 엔진246건은 완료하지 못했다. WebKit PNG 방향2..8×shape2의14실패가 오류 artifact에 있다.
Firefox 결과가 나오지 않는 지연으로 자신의 실행 session17784를 Ctrl-C 중단(exit1)했다.
시작 약13:52,중단 약13:54(KST). 정확 총 소요시간/완료된 전체 PASS 수는 확정하지 않는다.
Get-CimInstance 프로세스 조회는 Access denied라 실행 지연 원인/Firefox 잔류 프로세스를 확인하지 못했다.
관련 포트 listener0. 남은 자기 staging denn-e2e-7iuOel만 부모/정확경로 검증 후 삭제했고 부재 확인.
보호22/번들3종SHA 동일·금지 설정diff0·diff--check PASS. 제품/기존 단언/timeout 변경0.
보호형 루프의 미종료·환경/필수게이트 조건으로 commit/push0. 이번 단위 DONE/CODEX_PASSED 아님.

### QUESTIONS

조회·다운로드 승인과 Firefox 단독 실행 지연 문제는 재개 결과로 해소됐다.
남은 실패는 WebKit PNG 방향2..8의 합성 기대값 불일치다. 다음은111합성 입력·106공식근거와
108/109의부분검사·114port를 대조하는 안전 capability 계약 검토다. RG-3 검증불가 거부 유지,
실사진 허용·자동 회전 보정·UA별 예외·지원 축소 승인을 만들지 않는다.
기존 단언 수정과 제품 변경은 이 스펙 밖이다. BLOCKED_VERIFICATION,commit/push0 유지.

### 재개 검증 결과 (Codex) — 2026-09-09

세 고정 단독 명령 모두 전체82건을 완료했다. Firefox82pass(2.0m)/exit0,
WebKit68pass14fail(30.1s)/exit1,Chromium82pass(11.5s)/exit0.
232=82+68+82 PASS,14 FAIL,246=82×3개 시험;이번 timeout0. 병렬 실행 안정성은 NOT VERIFIED.
WebKit14실패는 PNG2..8×shape2이며 정확치수/색채널 근거는116 review의 표에 보존한다.
selector20/20,전체check3295=3292+3 PASS(format/lint335,7typecheck,2build).
보호22/번들3 SHA 동일,diff--check PASS. 이번3 staging 자동정리,과거 자기2 temp 정확경로
검증 후 삭제·부재 확인. 테스트브라우저/포트 잔류0. 제품/기존단언/timeout/기본config 변경0.
실행 집계는 완료했으나 전체PASS/DONE/CODEX_PASSED로 승격하지 않는다. stage/commit/push0.
