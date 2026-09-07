# spec098 — 순수 룸 배치·세대 소유권 검수

2026-09-07. DONE / CODEX_PASSED / LOCAL_VERIFIED. 구현한 동일 Codex의 검토이며 독립검수 아님.
기준2959569, 코드4파일3c3abca. [계약](../../rebuild/specs/098-room-placement-geometry-session.md),
[승인](../decisions/2026-09-07-rg2-local-room-preparation-decisions.md).

## 구현과 검토 근거

- [geometry](../../../apps/mockup/src/room-placement/geometry.ts): unknown 필드단위 검증,
  contain·배경정규화 좌표·종횡비·전체프레임 clamp·적용위치 반환. 과대폭은 거부하며 자동축소0.
  기존 clientPointToLogical로 CSS→logical 변환 후 letterbox/외부점을 거부한다.
  실제 DOM/포인터 바인딩·DPR 관측·CSS회전 보정·물리cm 계산은 없다.
- [geometry 시험](../../../apps/mockup/src/room-placement/geometry.test.ts): 가로/세로/정사각,
  resize·정역변환·경계·수치상한·hostile getter/proxy·입력불변·잘못된 placement를 합성 검증.
- [session](../../../apps/mockup/src/room-placement/session.ts): ticket 세대와 exclusive lease,
  현재 pending만 ready 허용. stale/duplicate·clear/dispose·fail을 구분하고 상태를 먼저 분리한 뒤 release.
  WeakMap으로 동일 lease의 중복소유/해제를 막고, getter admission 중 재진입도 WeakSet으로 차단한다.
  각 lease당 release **최대1회 시도**이며 throw 시 실제해제 성공을 보증하지 않는다.
- [session 시험](../../../apps/mockup/src/room-placement/session.test.ts): 늦은 완료·새세대 유지·동일/별도lease,
  재진입·throw·형식무효·dispose 이후 완료. 실제 자원 생성/취소/해제나 브라우저 종료를 증명하지 않는다.
- rg 정적 확인: room-placement 디렉터리 밖 apps/packages import 참조0. 기존제품파일 변경0.
  root barrel/보호plan/route 연결0, 새로운 공개 패키지 API 아님.

## 실제 실행 결과

| 검증 | 결과 |
|---|---|
| 최종 targeted Vitest | 2파일46/46,255ms |
| node scripts/check.mjs | exit0; format/lint304파일,7typecheck,99단위파일2591/2591(2.83초),양앱build PASS |
| node scripts/e2e-run.mjs | 1회 실행,exit0,271/271,52.8초,last-run passed/failedTests[] |
| 신규 시험 증가 | 2545+46=2591; E2E 증가0, 신규 UI/PNG0 |
| 포트4183/4184/4185/8080/9099/9199 | listener0 |
| staging denn-e2e-iOjVxK / debug.log | staging 제거 / debug.log 없음 |
| diff --check | PASS |

초기 targeted45/45 후 수치한계·정사각 입력 사례1개 추가, 최종46/46. 시험 실패/게이트 완화0.
기존 build chunk >500kB 경고는 유지됐다. E2E는 기존 UI 회귀검증이며 새 룸 UI 검증이 아니다.

고객 index-jnlo-lEH.js SHA-256:
`FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`.
운영자 index-C5iqMAWP.js SHA-256:
`B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`.
두 entry 모두096 이후 불변이다.

시작 보호/별도dirty 및 기존결과105hash 중103동일. 변경2개는 기존 canonical PNG재생성 예외:

| spec018 파일 | 실행 전 SHA-256 | 실행 후 SHA-256 |
|---|---|---|
| browse-desktop-1280x800.png | BDB7EAD2E8F5A82746236D68474D215678823CF168D5141075B1D19E0A4C163D | 516E718706FF621FEC5D3313B0EC457F177F6A069D355537BED2CF75B9B03129 |
| browse-mobile-390x844.png | 5043D55564D51A7F577EDBC520C2062C3FDA8FF277FE9B7C105E3FB8B0D135BD | 073103F2A891EEF3DCFC43B321F78EA03AF280D670F98C1ED671FCE11ED7C559 |

PNG 복원/stage/commit0. 다른 보호/별도작업·093/096증거 변경0.
허용 총12경로=신규코드4+문서8. 운영/Firebase/UID/배포/발행/삭제/설치/자동화0.

## 남은 경계

실제 이미지 decode·Canvas pixels·DOM clock·실기기·물리자원 회수·전체 룸 UX NOT TESTED.
이 모델만으로 로더·frame snapshot·UI 연결을 승인하지 않는다. 별도 계약 전에 소유권 접점을 조사한다.
기하 수치한계는 사용자 제품 범위/업로드 제한이 아니다. 실제룸/레거시parity를 보증하지 않는다.
전체리빌드 실측률·최종스펙수는 확인불가. 과거85~88%는 관리추정 이력일 뿐 상향0.
