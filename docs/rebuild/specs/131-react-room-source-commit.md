# 131 — React commit phase 룸 source 결속

2026-09-11 / 기준2589520=origin·0/0.130 01a35fa/2589520 DONE.
사용자 스펙간 루틴에 따른 선행 계약 / CONTRACT_REVIEW_PASSED(동일 Codex).

## WHY / 현재 조사

현재 PreviewComposer.tsx 전체와 BrowseFlow/PreviewSection을 읽었다.
ImageSlot은 passive effect로 state/bindings를 report하며 아직 proof 전달이 없다.
report의 ready 상태만으로는 새 이미지 load와 부모의 다음 commit 사이 공백을 막지 못한다.
변경 경로는 color/text/transforms(키·wheel·drag RAF)/photo/viewport/width/props다.
built의 최종 plan만 대상이고 frameTrialRef/probe/surface ready는 정본이 아니다.
selection key는 Composer를 remount하지만 catalog 객체 교체까지 포함하지 않는다.
art의 새 source는 passive effect에서 load되므로 예전 art ready와 새 geometry가 잠깐 공존할 수 있다.
fonts.ready/check의 마지막 결과도 font 환경 전체 수명 증명이 아니다.
따라서 product Composer에 당장 port를 연결하지 않고 실제 React commit 규약을 합성 native로 먼저 검증한다.
이는 기존 화면 결함을 이번 범위 밖에서 고치거나 사진/폰트 지원을 축소하는 결정이 아니다.

## 정확 범위

code/test/config 8:
- apps/mockup/src/room-placement/useRoomCommittedSource.ts
- apps/mockup/src/room-placement/useRoomCommittedSource.test.ts
- apps/mockup/src/e2e/room-source-fixture.tsx
- apps/mockup/src/e2e/canvas-fixture.tsx
- tests/room-source-native/source.spec.ts
- tests/room-source-native.config.ts
- scripts/e2e-run.mjs
- scripts/e2e-run.test.mjs
문서7: 이spec,131review/handoff,STATE/NEXT/CURRENT/live.
기본 product UI/Composer/owners130/Rules/Firebase/config/manifest/lockfile/보호23 변경0.
새 config는 opt-in Playwright 검사뿐이다.실사진/실제Firebase/운영/설치/배포/발행/예약자동화0.

## WHAT / HOW

- useRoomCommittedSource(candidate:unknown,onInvalidate:()=>void)는 readSource(),invalidate()만
  안정 참조로 제공한다. candidate는 같은 plan/입력 동안 안정 참조이고 변하면 새 객체여야 한다.
  callback도 동일 cleanup 수명 동안 안정 참조여야 한다. 새 제품 코드에서 아직 호출하지 않는다.
- 생성/등록/폐기는 useLayoutEffect에서만. render는 epoch ref를 읽을 뿐 publish/자원 생성·해제0.
  lifetime effect는 owner를 만들고 cleanup에서 ref부터 분리 후 dispose한다.
  callback 변경은 명시적인 owner 수명 교체다. 일반 candidate 변경으로 blocked owner를 재생성0.
- candidate effect는 lifetime effect 뒤 실행. null은 미등록, 그 외 129의 전체 validation을 유지한다.
  외부 candidate 필드 getter는129가 한 번 캡처하도록 전달하고 원 receiver를 보존한다.
  isCurrent는 원 함수와 함께 owner incarnation/입력 epoch를 전후 확인한다.
  getter·callback 재진입으로 invalidate/unmount가 일어나면 등록 성공을 추정하지 않는다.
- invalidate()는 epoch를 먼저 증가시키고 현재 owner를 즉시 무효화한다. React state setter/
  Promise/RAF 완료를 기다리지 않는다. 후보 render가 캡처한 epoch와 commit 현재 epoch가
  다르면 그 후보는 등록하지 않는다. 새 후보를 반영한 후속 render만 재등록할 수 있다.
  같은 입력의 noop에 무조건 invalidate하지 않도록 실제 연결 시 호출 위치를 고정해야 한다.
  무효화된 candidate 참조도 기억한다. unrelated rerender가 새 epoch를 읽더라도 같은 옛
  candidate를 재등록하지 않는다(transition 중 입력 반영 전 빈틈). 새 candidate가 필요하다.
- effect cleanup의 ticket은 자신의 세대만 무효화한다. StrictMode 재설정은 새 owner;
  unmount 뒤 옛 readSource는 null. 버려진/중단된 render는 source를 publish하지 않는다.
- ready proof는 실제130 hook의 해당 render에 묶인 readReadyProof로 확인한다.
  art가 없다는 명시적 입력과 required-but-not-ready를 구분한다. clock/case는129 gate로 차단.
- synthetic fixture: 별도 기존 E2E HTML의 ?roomSource=1 가지에만 연결, 제품 entry/URL 변화0.
  실제 React19 hooks +130 local/art owner +129 source +102 snapshot capturer를 사용한다.
  tiny synthetic PNG만 브라우저에서 생성/로드, 기본 mount 전에 image/canvas IO0.
  fixture owner mount와 명시적 synthetic load 동작을 분리한다. StrictMode 첫 effect에서
  자동 load→cleanup revoke→옛 blob request 오류를 만들거나 콘솔 필터로 숨기지 않는다.
  onInvalidate는 보유 snapshot lease를 release한다. snapshot 자체 픽셀을 검사하며 원 owner를 해제하지 않는다.
- 새 native 파일은 기본 tests/e2e 밖에 둔다. 전용 config에서만3엔진 선택.
  --room-source-{chromium,firefox,webkit}-only를 고정 args로만 허용, 혼합/임의 args 거부.
기존 local owner11/pair20은 별도 회귀.

테스트 요청 guard는 정확한 localhost:4183 HTTP 및 해당 페이지가 생성하고 아직 revoke하지 않은
같은 origin의 synthetic blob URL만 허용한다. WebKit은 blob load도 route hook으로 전달하므로
scheme/소유권을 구분한다. 일반 외부/다른 origin/소유하지 않은 blob 요청은 계속 차단한다.

## VERIFY

SSR: candidate getter/IO/callback0, readSource null, invalidate 후도 publish0.
새 native3엔진: StrictMode ready·실제130 proof·실제102 픽셀/해제, same candidate 유지,
plan 변경 즉시옛source와lease 무효, old render proof가 교체이미지 채택0, 중단 render publish0,
unmount/remount 옛handle0, clock/case gate, art 없음/필수 art 부재,
cleanup throw의 blocked 유지와 raw message 미노출. 정확 수는 구현 행렬 후 실측 기록.
기존 Chromium owner11+pair20=31 회귀. node scripts/check.mjs 및 selector unit.
보호23/기본 번들3 SHA 불변, exact8+7/diff--check/temp·포트0.
code/docs분리일반commit/push 후 원격0/0. 지속119승인 범위.

## RISK / 다음

이 fixture는 실제 Composer UI/source가 연결됐다는 증명이 아니다. 실제 이미지 선택/텍스트/폰트/
art source 교체의 입력 epoch는 다음 정확 adapter 계약에서 수명까지 대조한다.
clock DOM 생략/일반사진형식 축소/실기기예산 확대/운영 권한이 필요하면 질문한다.
React 규약의 자체 검증은 일반 승인 재질문 없이 진행한다.
전체 리빌드 완료율/잔여 스펙 분모 UNCONFIRMED; 실제 룸 UI·일반사진·운영은 미완.

### QUESTIONS

새 제품 질문 없음.

### DONE (Codex)

595cb6a DONE / CODEX_PASSED(동일 Codex 자체검수; 독립검수 아님).
최종 check3732=3725+7(SSR4+selector3),123파일; format/lint373/typecheck7/build2 PASS.
targeted5파일133 PASS. R3 최종 Chromium11(5.1s)+Firefox11(29.6s)+WebKit11(12.6s)=33 PASS.
기존 Chromium owner11(4.5s)+pair20(4.7s)=31 PASS; 최종 native 총64 PASS.
기본 고객JS/CSS/adminJS SHA는130과 동일. 보호23 SHA 불변,exact8+7/diff--check PASS.
자기 staging11개 부재,4183/4184/4185 잔류0. 실제 Composer 연결/실사진/실기기/운영 NOT TESTED.
문서7 일반 전송 후 원격 동기화 확인. 아래 R1–R3는 해결된 실패/진단 이력이며 성공 횟수에 중복 합산하지 않는다.

R1: lint1건은 두 layout effect의 수명 연동 dependency 사유를 한정 주석으로 고정.
fixture 영어 주석의 Tailwind 유틸 후보가 고객 CSS를576bytes 증가시켰다.
주석 표현만 정정한 뒤 기존 CSS/JS 파일명이 재현됨. config/테마 수정0.
R2: 최초 Chromium11/11은 마지막 console0 단언만 FAIL. raw-message 진단 재실행11/11에서
ERR_FILE_NOT_FOUND 확인. fixture의 mount effect 자동 blob load가 StrictMode cleanup에서
취소되어 생긴 오류로 판단하고 owner mount 후 명시 load 버튼 동작으로 분리했다.
기존 lifecycle/픽셀/무효화 단언 유지, console 필터·재시도·제품owner 수정0. 수정 후 재검증한다.

환경 기록: R2 제한환경 check가 unit에서 장시간 무출력으로 정체되어 자기 실행만 interrupt(exit1).
메모리 WMI 조회는 access denied로 중단했으며 재조회/우회0. 같은 check 명령을 허용된 일반환경에서
6.77s에 완료(check3732 PASS). 단언/timeout/worker/config 변경0. 원인 세부는 UNCONFIRMED.
R2 Chromium11(1.4m)/Firefox11(30.0s) PASS. 최초 WebKit11FAIL: photo failed/ready.
R3 fail-fast 1회 진단은1FAIL/10미실행, DECODE_FAILED + external scheme blob: 확인.
테스트 guard가 같은 페이지의 로컬 blob을 외부로 오판하여 abort한 것이 재현됨.
동일origin·created set·미revoke 소유권까지 검사하는 예외만 추가, 진단 maxFailures 제거.
일반 외부 허용/제품 decode 우회/단언 완화0. 최종3엔진 전체를 다시 실행한다.
