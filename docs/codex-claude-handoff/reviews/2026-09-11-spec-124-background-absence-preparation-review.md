# 124 합성 native 계약 자체검토

## 최종 — ce9d4cf CODEX_PASSED (동일Codex)

2026-09-11. 계약코드6만구현(신규fixture/test/config3,기존fixture/runner/runner시험3추가).
제품room-placement 및이전codec/E2E단언은미변경. 아래계약목표는이제다음실측으로검증했다.

- selector32/32,전체check3531/3531=3528+3(116파일),format/lint354/typecheck7/build2 PASS.
- 신규3엔진각18: Chromium4.4s/Firefox44.7s/WebKit42.0s,54/54 PASS.
  기존Chromium46(5.6s)+12(3.1s)=58 PASS. 합계112,브라우저실패/재시도0.
  Firefox는기존일반실행환경을도구승인받아실행했으며환경우회·설치하지않았다.
- 최초format에서추가버튼배열1건실패→그파일format수정후전체check PASS. 게이트완화0.
- 신규fixture는gate관찰뒤실제bitmap인계를지연했다. 물리decoder중단시험이라고표시하지않음.
  beforeCleanup 카운터로실패자원이마지막cleanup덕분에해제된것처럼보이는오검증을방지.
  needsSafetyClose:false/native크기0,callback/lookup/실제read/decode카운터정확값을strict비교.
- 외부요청/console warning·error/pageerror0,Canvas/URL/Image0. 기본앱번들3불변.
  보호·사용자23 SHA불변,예상밖변경0,diff--check PASS,temp5부재,포트3 listen0.

SHA-256 시작값=완료값:

| 기본 산출물 | SHA-256 |
|---|---|
| mockup index-jnlo-lEH.js | FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A |
| mockup index-DEnCZ-27.css | 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81 |
| admin index-C5iqMAWP.js | B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 |

판정한계:frame은합성자원,원bitmap은fixture내에만존재. 실제룸합성·색/방향pixel parity·일반사진지원·
실기기·운영검증이아니다. 116PNG14실패미해결. 다음paint사용권계약은별도검토해야한다.

## 착수 전 정적 계약 검토 이력

2026-09-11 /3287aaf / CONTRACT_REVIEW_PASSED,동일Codex이며독립검수아님.
[계약](../../rebuild/specs/124-background-absence-preparation-native.md).

- [123port](../../../apps/mockup/src/room-placement/background-absence-preparation-port.ts)와actual100을
  fixture에서주입가능. production수정없이native read/decode와controller수명결속시험가능.
- [122codec/gate](../../../apps/mockup/src/e2e/background-absence-decode-check.ts)는core-only수작업codec과
  실제native완료뒤인계지연패턴을이미사용. 이번에는새privatehelper로재사용해기존검증불변.
- [115controller fixture](../../../apps/mockup/src/e2e/background-native-check.ts)의capture/clear/source/
  pending교체흐름을참조하되그Canvas인코딩·이전PARTIAL evidenceproducer는이식하지않는다.
- [runner](../../../scripts/e2e-run.mjs) selector를허용된정확문자열3개로제한,
  기존base/globalSetup과cleanupguard 유지. 별도3엔진config는122와같은소유권구조.
- 신규18×3+회귀58=112는계약의목표이며실측아님. 현재124native NOT TESTED.
  frame은합성치수,bitmap만실제native. 픽셀/방향/색상/실기기/UI/운영증거로과장하지않는다.

코드6/docs7만으로가능한정적검토. 중요제품결정없음,기존루틴으로범위내착수가능.
