# 115 — 합성 이미지의 실제 bitmap·준비 수명 연결 검증

2026-09-09 / baseline32924f2 / CONTRACT_REVIEW_PASSED (동일 Codex).

## 목표·범위

114 합성 포트 검증 다음에, 격리된 로컬 fixture에서 native FileReader→109 snapshot→
native createImageBitmap→114 port→100 preparation의 치수와 해제를 검증한다.
fixture가 직접 생성한 작은 정상방향 이미지만 대상이다. metadata PARTIAL을 사진 허가로
승격하는 제품 decoder는 만들지 않는다. PNG metadata 유효성이나 실사진 허용 정책을 새로 결정하지 않는다.

정확 코드5개:
- apps/mockup/src/e2e/room-background-file-fixture.tsx (기존 분기 보존, 새 native 버튼)
- 신규 apps/mockup/src/e2e/background-native-check.ts (고정 합성 fixture만)
- 신규 tests/e2e/background-native-lifecycle.spec.ts
- scripts/e2e-run.mjs, scripts/e2e-run.test.mjs (고정 opt-in selector)

문서7개: 이 spec,115 review/handoff,STATE/NEXT/CURRENT/live.
제품 entry/100~114 구현/config/Rules/package/lock/보호22/debug.log 변경0.
실제 사진/운영 서비스/network/설치/배포/예약자동화0. 공개 공식 문서 및 localhost만 허용.

## 구현·검증 계약

1. source canvas48×32를 메모리에서 생성해 JPEG/PNG 두 형식으로 encode한다.
   MIME/크기 확인, 최대20Mbytes/40Mpixels/명시maxEdge64 유지. 제품 상한을 변경하지 않는다.
   109 factory에는 이 파일만 넘기고 snapshot pair 1회 take. encoded48×32와
   PARTIAL/decodeAllowed:false 유지 확인. 이 생성 이력은 시험의 방향 기준일 뿐 일반 파일 증명 아님.
2. fixture private producer만 같은 snapshot Blob을 createImageBitmap(from-image)에 전달한다.
   실제 bitmap close를 release에 연결, width/height는 bitmap에서 읽는다. Canvas 출력/추가 회전0.
   원본 Blob 재읽기·외부 URL·Image constructor0. 입력 source canvas는 finally 크기0.
3. JPEG/PNG 각각 정상,clear,dispose,source-change,pending-replace,decode-reject의6상태=12건.
   native 생성 뒤 관찰 완료 Promise의 인계를 시험 gate로 지연시켜 late를 결정적으로 재현한다.
   native 엔진 자체를 정지시킨다고 주장하지 않는다. gate 해제 전 추가 start0/BUSY를 확인한다.
   rejection만 별도 합성 invalid Blob native 요청으로 검증하며 109의 파일검사를 통과했다고 주장하지 않는다.
4. 정상 ready는48×32, clear 뒤 frame/background release 최대1. 취소/폐기/변경은ready0,
   늦은 bitmap close1, width/height0. pending 교체는 producer1회·frame2회 후 모두 정리.
   폐기된 native 객체의0치수는 close 관찰이며 process memory/GC 완료 보증이 아니다.
5. runner의 --background-lifecycle-only는 신규 시험1개+기존110의 두 시험으로 고정한다.
   default전체·기존옵션 유지, 조합/임의값거부. timeout/retry/workers/config 변경0.
   unit selector/전체check/opt-in Chromium. 외부egress·consoleerror/warning0, PNG 파일출력0,
   staging/포트 잔류0, 보호22·번들3종SHA/diff/scope 검증.

## 공식 근거와 한계

[WHATWG HTML Living Standard §8.11.2](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap)
본문2026-09-09 확인(페이지 최종갱신2026-09-08): Blob에서 Promise로 bitmap 생성, invalid data 거부,
from-image 옵션, close의 bitmap data 해제 및 detached getter0 동작. 이 명세만으로 기기 메모리 상한이나
브라우저 전체 성공을 보장하지 않는다. 111의8방향 matrix는 별도 기존 시험이며 이번12건으로 대체하지 않는다.

완료 후 사용자 입력을 실제로 허용할 조건과 RG-3 검증불가 거부를 대조한다. 실제사진·지원환경
제품정책이 필요하면 안전한 다음 작업과 분리하고 중요한 결정으로만 보고한다.

### DONE (Codex)

코드 bdcf18c, 정확5파일. 동일 Codex 자체 검토 CODEX_PASSED.
check3291=3290+selector1, format/lint334·7typecheck·2build PASS.
Chromium46/46(5.1초)=신규12+기존owner11+evidence23. 전체E2E가 아니라 고정 opt-in3파일이다.
native read1/bitmap1,URL/Image0,외부egress/console error·warning0,close 후치수0을 확인했다.
보호22/번들3종SHA동일·PNG출력0·diff PASS, staging denn-e2e-HHX5qP 제거확인·관련포트0.

### QUESTIONS — 다음 교차 엔진 검증 권한

현재 Playwright1.61.1의 executablePath 존재 여부를 읽기 전용 검사했다.
Chromium1228만 존재, Firefox1532/WebKit2311은 없다. 설치·다운로드0.
다음 교차 엔진 시험을 수행하려면 해당 기존 Playwright 버전에 맞는 두 테스트 브라우저를
공식 배포원에서 로컬 캐시에 다운로드하는 권한이 필요하다. package/lockfile 변경이나
시스템 브라우저 설치, OS 의존성 설치, 운영 연결 승인은 포함하지 않는다.
이 권한은 아직 승인되지 않았다. 현재 제품 지원을 Chromium 한정으로 조용히 바꾸거나,
미검증 Safari/Firefox를 지원으로 판정하지 않는다. 실제 iOS 기기 검증은 WebKit 시험과 별개다.
제품 입력·PNG metadata·실기기 메모리 및 운영 보류 정책도 그대로 유지한다.
