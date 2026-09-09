# 116 교차 엔진 검증 기록

## 최종 계약 검토 — 조사와 제품 게이트 분리

2026-09-09 `응 다음 루프대로 진행해줘`로 읽기 전용 후속 검토를 수행했다.
최초116 완료 기준에 이미 조사 완료와246PASS 구별이 있으므로 실행이 완결된 조사 자체는
INVESTIGATION_REVIEW_PASSED(동일Codex),제품/native지원게이트는 NOT MET로 나눈다.
Founder가 실패를 예외승인했다고 기록하지 않는다. 이전환경미종료는 정리됐고
지금 확인된제약은 좁은native from-image 기능 불일치다. 제품수정/원래기대값완화0.

추가 고정bytes진단: Node zlib의같은 PNG18개를 Firefox→WebKit→Chromium blank page로 전달했다.
RGB8/filter0/rectangle48×32 및square40×40,네사분면색은111과같다. 각각absent/1..8.
입력은한번만생성해세엔진에같은배열로전달. SHA256(JSON cases)=
eb6459a3c116bb0e83069895511fe78755fdf7ea7ba0ecd8b1e57f36e3290c83.
순서대로18파일 bytes를연결한SHA256=8fbfee562fa7054e2f0b4db7a5f8bf4cc25334f709a56def01fb3b5a763e89fe.
Firefox18일치/Chromium18일치,WebKit4일치14불일치·18개모두encoded identity 치수/사분면.
따라서첫111의브라우저별encoder차이를제거한경우도재현. 실제WebKit전체/Safari적합성단정은아니다.
첫출력이잘려요약출력으로동일진단1회재실행,exit0(2.50초),외부요청각0. 실제파일/원본사진I/O0.

공식 재확인2026-09-09:
[PNG Third Edition §11.3.4.5](https://www.w3.org/TR/2025/REC-png-3-20250624/#eXIf)는
eXIf와현재픽셀의의미유효성을구별한다. 따라서native동작이일치해도임의사진의정답증거는아니다.
[HTML ImageBitmap §8.11.2](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap)의
from-image·close계약은합성시험과해제를설계하는근거이며실제플랫폼PASS를보증하지않는다.

다음117은실제사진을받지않는고정합성probe다. UA분기/픽셀보정/형식지원변경없이관찰값만반환하고
항상decodeAllowed:false. RG-3미검증거부정책유지범위라새Founder선택을만들지않는다.
원래116의14실패는117이통과해도별도지원게이트에남는다. 아래BLOCKED는이분류전이력이다.

## 단독 실행 실측 — 2026-09-09

최종 판정: BLOCKED_VERIFICATION. 순차 실행은 완료했으나 모든 엔진이 PASS한 것은 아니다.
Chromium `node scripts/e2e-run.mjs --background-chromium-only`:82passed(11.5s),exit0.
아래Firefox/WebKit과 합계232PASS(82+82+68),14FAIL,246전체 완료. 이번 timeout0.
전체check3295=직전3292+고정selector3 PASS:format/lint335·7typecheck·111unit파일·2build.
selector targeted20/20 PASS. 기존 큰chunk경고는 남았으며 이를 없애려고 설정을 바꾸지 않았다.

### 최종 파일/정리 검사

- 보호/기존dirty22개 SHA-256 모두 시작 baseline과 동일. 별도debug.log 제외.
- 고객JS345362bytes SHA FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A.
- 고객CSS22675bytes SHA 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81.
- adminJS294873bytes SHA B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246.
- 세 번들 모두 기존과 동일. 제품/기존시험/기본playwright/Rules/firebase/package/lock 신규 diff0.
- 이번 staging denn-e2e-MvAmWo/FINkHp/KiCd1v는 runner 종료 후 모두 부재 확인.
  과거 자기 staging denn-e2e-NOQtQB와 진단 profile playwright_firefoxdev_profile-Ajy2b5는
  OS temp 직하 exact path·reparse 아님 확인 후 삭제하고 부재 확인. 삭제 전 테스트브라우저0.
  사용자 파일/기존브라우저캐시 삭제0. 삭제한 임시폴더는 휴지통 복구 대상이 아니며 시험 재생성 가능.
- 권한 있는 읽기 전용 조회:Firefox/MiniBrowser/WebKit 자식 및Playwright Chrome0,
  listener4183/4184/4185/8080/9099/9199=0. 타 프로세스 강제종료0.
- diff--check PASS,staged0,HEAD=origin추적ref585f88b·0/0. 이번 원격 fetch/commit/push0.
  로컬 코드3+문서8=11개만 이번단위 변경. 보호22+debug.log는 별도이다.

### 다음 안전 단계

Firefox 진단/다운로드 재승인 대기는 종료한다. WebKitPNG에 대해111입력과106공식근거,
108/109의PARTIAL/decodeAllowed:false를 대조하는 읽기 전용 capability 계약 검토가 다음이다.
현재 테스트/제품 수정으로 자동회전하거나 지원정책을 바꾸지 않는다. 실패를 승인 없이PASS로
처리하지 않으므로116DONE/다음 구현/commit/push는 보류한다. 사용자에게 새 제품 선택이
필요하다는 결론도 미리 만들어내지 않는다. 실제사진·실기기·운영은 NOT TESTED 유지.

명령은 각각 `node scripts/e2e-run.mjs --background-firefox-only`와
`node scripts/e2e-run.mjs --background-webkit-only`. 동일82건,worker1,원래 단언/timeout 유지.
Firefox82 passed(2.0m),exit0. WebKit68 passed/14 failed(30.1s),exit1. timeout 실패0.
이 시간은 Playwright 출력 반올림값이며 build 포함 전체 벽시계 시간이 아니다.

WebKit 실패14개는 모두 `tests/e2e/native-orientation-pixel.spec.ts:22`의 PNG 방향 시험이다.
직사각형5..8은158행 치수에서 기대32×48/실제48×32로 실패했다. 나머지는165행 채널오차:

| shape | orientation | 최초 실패한 채널 절대오차 (허용0) |
|---|---|---|
| rectangle | 2,3 | 208 |
| rectangle | 4 | 176 |
| square | 2,3,5,7,8 | 208 |
| square | 4,6 | 176 |

따라서7방향×2형태=14실패가 단독 실행에서도 재현됐다. JPEG18건과PNG absent/1의4건은 통과했다.
WebKit의 나머지 owner11+evidence23+lifecycle12=46건도 통과했다. 합계18+4+46=68.
이는 이 OS/Playwright WebKit에서 합성 PNG 방향 기대값과 실제 결과가 다르다는 증거이며,
실제 Safari/iOS 전체 결함·실제 사진 허가·PNG metadata 의미의 완전성 증명이 아니다.
다음 시험이 test-results를 재생성할 수 있어 stdout의 집계와 실패 지점을 이 표에 보존했다.
제품/기존 시험 코드를 수정해 회전 보정을 추가하거나 기대값을 완화하지 않았다.

## 재개 전 진단과 승인 — 2026-09-09

아래 STOP REPORT는 첫 실행 이력이다. 이후 사용자 `응 조회만 하자`로 권한 있는 읽기 전용
Firefox 조회를 수행해 NO_FIREFOX_PROCESS를 확인했다. 이어 `다음진행해`로 진단을 재개했다.

- 동일 Firefox blank-page launch: 제한 실행 환경에서는15000ms timeout,진단 총15069ms.
  로그에 `RenderCompositorSWGL failed mapping default framebuffer, no dt`가 있었다.
  일반 실행 환경에서는 launch357ms,ready=complete/createImageBitmap=function,
  정상 close 포함1284ms·exit0였다. 실행 환경 차이는 관찰됐지만 근본 원인은 UNCONFIRMED다.
- 일반 환경 교차 실행(session36855)에서는 Firefox 시험도 진행됐지만 여러 엔진에서30초 이상
  timeout과 도구 지연이 나타났다. 자신의 session을 Ctrl-C 중단(exit1),전체 집계 미완료.
  WebKit PNG 방향 차이도 다시 관찰했다. 병렬 부하가 원인이라고 확정하지 않는다.
- 그때 문서/selector patch 두 번이 filesystem helper 오류로 실패했다. 이번 재개 시 실제 파일을
  다시 읽어 미반영임을 확인했다. 이번에 스펙 먼저 갱신 후 정확 runner/unit2파일에
  엔진별 고정 worker1 selector를 추가했다. 원래 단언/fixture/timeout/retry/기본 config 변경0.
- 사용자 `어 잠깐 느려졌었어 다시시도`로 재개. 시작 전 읽기 전용 조회에서 Firefox 프로세스0,
  listener4183/4184/4185/8080/9099/9199 모두0. selector targeted20/20 PASS(169ms).
  엔진별82건을 Firefox→WebKit→Chromium 순서로 하나씩 실행하며 아직 최종 PASS가 아니다.

## 첫 실행 STOP REPORT (보존)

2026-09-09 / HEAD585f88b / BLOCKED_VERIFICATION / commit·push0.

## 승인·환경

Founder의 `응 허용`은 [다운로드 결정](../decisions/2026-09-09-playwright-cross-engine-download-decision.md)으로 기록했다.
기존 Playwright1.61.1 로컬CLI install firefox webkit 실행 성공(exit0).
Firefox151.0/1532,WebKit26.5/2311은 공식 cdn.playwright.dev에서 캐시에 다운로드했다.
CLI 진행 표시 크기116.8MiB/58.8MiB이며 디스크 점유/요금 추정은 아니다.
기존FFmpeg1011/Winldd1007 존재 확인·재사용,GC억제·package/lock/OS dependency 변경0.
처음 node_modules/playwright/cli.js는 직접 dependency 경로가 없어 실패했고, 실제 설치된
node_modules/@playwright/test/cli.js로 수정했다. 이 오류 때문에 새 패키지를 설치하지 않았다.

## 실행 결과

- 전체 check3292=3291+selector1,format/lint335·7typecheck·2build PASS.
- 고정4시험×3엔진=예상246건. 전체완료/246PASS 아님. 기본 Chromium 설정은 바꾸지 않았다.
- WebKit PNG rectangle/square 각각 orientation2..8: 오류 디렉터리14=7×2 확인.
  rectangle orientation6은 기대32×48,실제48×32. orientation2는 색 채널 오차208(허용0).
  square orientation8도 색 오차208. 치수만으로 정사각형 회전을 검증할 수 없다는 기존 기준 유지.
  위치: test-results/native-orientation-pixel-spec111-png-rectangle-orientation-6-webkit/error-context.md 등.
  이 artifact는 실행의 로컬 진단이며 stage/commit하지 않는다. 기대값/허용오차 변경0.
- Firefox 실행은 결과 없이 지연됐다. 전체 통과 수나 원인을 추정하지 않는다.
  Get-CimInstance Win32_Process 조회가 Access denied여서 프로세스 상태를 확인하지 못했다.
- 약13:52~13:54KST 실행 후 자신의 exec session17784에 Ctrl-C,exit1. 타 프로세스 강제종료0.
  listener4183/4184/4185/8080/9099/9199은0. Firefox 잔류 프로세스는 UNCONFIRMED.
  runner finally를 통한 정리가 끝나지 않아 staging이 남았다. 자기 실행의 정확
  OS temp/denn-e2e-7iuOel을 부모경로 확인 후 삭제,Test-Path false 확인. 사용자 파일 삭제0.

## 안전 경계 및 다음

제품/원래 시험/timeout/retry/workers/운영 설정 변경0. 보호22SHA와고객JS/CSS/adminJS SHA 동일.
package.json/pnpm-lock.yaml/playwright.config.ts/firebase.json/Rules diff0.
새 opt-in config+selector2파일과116문서8개는 미커밋으로 둔다.
[자동 루프 STOP](../AUTO_REVIEW_LOOP.md)의 미종료·검증환경/필수게이트 조건에 따라 다음 구현/전송0.
다운로드 권한은 재질문하지 않는다. 다음은 권한 있는 Firefox 프로세스 진단·정리 확인 후
같은 단언의 재현 가능한 실행이다. WebKit 방향 처리 차이는 별도 결과이며 임의 제품 허용0.
전체 브라우저/Safari/iOS/기기메모리/실사진/운영은 PASS라고 기록하지 않는다.
