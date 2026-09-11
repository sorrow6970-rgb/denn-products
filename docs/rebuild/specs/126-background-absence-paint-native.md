# 126 — 부재검사 배경 paint의 합성 native 검증

2026-09-11 / 기준 b6e4df2. 사용자 스펙 간 루틴 지시 안의 opt-in 검증 단위.
CONTRACT_REVIEW_PASSED — 동일 Codex 정적 자체검토이며 독립 검수가 아니다.
125 DONE 유지. 이 계약 선행 작성 후에만 아래 코드를 작성한다.

## 목표 / 근거

125의 createRoomBackgroundAbsencePaintWork와 제한 paint lease를 실제 FileReader,
createImageBitmap, trusted private copyTo → Canvas2D에 결속한다.
122의 직접 작성한 3×2 core-only JPEG/PNG codec, 124의 격리 fixture/3엔진 runner,
125 spec 및 background-paint-lease.ts가 로컬 근거다. 같은 bitmap의 native 직접 draw를
별도 reference canvas에 실행하여 RGBA를 비교한다. decode 정확도/색관리/실사진 방향의
독립 기준이 아니며, 116 WebKit PNG orientation 14 불일치 해결로 해석하지 않는다.

## 정확 파일 범위

코드·시험 6개:

- 신규 apps/mockup/src/e2e/background-absence-paint-check.ts
- 수정 apps/mockup/src/e2e/room-background-file-fixture.tsx — import, paint- dispatch, 버튼만
- 신규 tests/e2e/background-absence-paint.spec.ts
- 신규 tests/background-absence-paint.config.ts
- 수정 scripts/e2e-run.mjs — 정확 3 selector만
- 수정 scripts/e2e-run.test.mjs — selector 단위 3개

문서 7개: 이 spec, 126 review/handoff, STATE/NEXT/CURRENT/live.
room-placement 제품 코드, 기존 codec/시험/config, 기본 UI, Rules, package/lockfile,
보호·사용자23 변경0. 실제 사진/운영/네트워크/설치/다운로드/예약자동화0.
localhost opt-in 브라우저 검증만 허용. 실제 파일 선택, Canvas export, screenshot 저장0.

## 구현 계약

- 기존 synthetic codec를 신규 helper 안에 private 복제. PNG는 비대칭 6픽셀 RGB 패턴으로
  기준 복사·좌표 오차를 식별한다. JPEG는 기존 core-only 합성 grayscale이며 방향증명 아님.
- 같은 검증된 Blob을 실제 native bitmap으로 단 한 번 decode한다.
  private wrapper만 width/height/close/copyTo를 제공하며 raw bitmap/bytes는 결과에 반환0.
- native copyTo는 native 9인자 drawImage를 호출하고 호출수와 crop/destination 사본만 기록.
  대상·reference는 detached 16×12 Canvas 각1개. 둘 다 동일 bitmap과 scale로 같은환경에서 비교.
  정상: rect(2,2,6,4). fractional: rect(2.25,1.5,7.5,5). 둘 다 encoded3×2의 단일scale.
  RGBA 전부 일치 + 그려진 alpha>0 + 외곽 투명성을 동시에 검사하여 전부빈결과 PASS 방지.
- 실패한 target은 DOM에 연결하거나 반환/게시하지 않는다. copythrow는 실제 draw 후 throw하여
  부분 픽셀 rollback 불가를 명시적으로 검증. 공개결과는 실패이며 후속 paint는 RELEASED/copy추가0.
- release/dispose 후 호출은 해당 고정오류/copy0. invalid-aspect는 입력실패/copy0/lease보존.
  pending cancel은 native 생성 관찰 뒤 wrapper 전달을 gate로 지연하여 늦은 결과 close1을 검사.
- metadata JPEG APP0/PNG tEXt는 검사 단계 실패이며 decoder/Canvas/copy0.
- close 횟수와 bitmap0×0, needsSafetyClose:false를 finally 안전정리 전에 기록·검증.
  finally는 실패 정리망일 뿐 PASS 근거가 아니며 GC/메모리회수를 주장하지 않는다.
- before-click read/bitmap/Canvas0. 이후 실제계수는 read1, metadata외 bitmap1;
  cancel/metadata Canvas0, 나머지 Canvas2. URL/Image0, DOM canvas/img/fileinput0.
  localhost 외 요청 차단 및 시도0, console warning/error/pageerror0.

## 행렬과 게이트

2형식 × 8경로(normal/fractional/release/dispose/cancel/copy-throw/invalid-aspect/metadata)
× 3엔진 = 신규48. 기존 Chromium preparation18+lifecycle46+decode12 = 회귀76. 합계124.
새 --absence-paint-chromium-only / --absence-paint-firefox-only /
--absence-paint-webkit-only 는 별도 config/engine/workers1, 추가인자/조합거부.
Firefox는 120~125와 같은 승인된 일반 실행 환경, 권한거절/설치/flaky면 STOP.
재시도 설정으로 실패를 숨기거나 단언 완화0.

- selector unit 예상35=32+3. node scripts/check.mjs 예상3574=3571+3, 실측후 확정.
- 위 opt-in 게이트만, 보호PNG를 쓰는 기본 전체 E2E 실행0.
- 보호23/기본번들3 SHA불변, exact6+7, diff--check, 자기temp부재/4183/4184/4185 listen0.
- 119 지속승인 범위의 code/test와 docs 분리 일반 commit/push, 정확 branch 원격만.

## 후속 / STOP

100/123은 여전히 size-only. 다음 후보는 준비세대와 frame/background paint 권한을 함께 묶는
정확 계약이다. 다른 cohort 자원/외부 registry/두 번째 decode로 조용히 표시하지 않는다.
새 제품정책·실사진·운영권한·보호충돌이면 STOP. 이번 단위는 실제 룸 UI 구현 승인이 아니다.
총 리빌드 완료율/남은 총스펙 수는 가중 분모 미확정으로 UNCONFIRMED.

### QUESTIONS

새 Founder 질문 없음. 기존 RG-2/RG-3/PG-1과 운영 보류 유지.

### DONE (Codex)

## 2026-09-11 — 126 완료 검증

코드91e5b36 CODEX_PASSED/DONE(동일 Codex 자체검수; 독립검수 아님).
selector35=32+3, 전체check3574=3571+3(117파일), format/lint359,typecheck7,build2 PASS.
신규Chromium16(3.9s)/Firefox16(39.0s)/WebKit16(36.7s)=48 PASS.
기존Chromium18(4.2s)+46(5.4s)+12(3.2s)=76 PASS. 총124=48+76, 실패/재시도0.
Firefox 일반실행 권한 도구승인 후 실행. 설정완화/설치0.
RGBA전체일치·비어있지않음·외곽투명, copy0·부분copy실패 비공개·close1/0×0,
beforeCleanup 및 needsSafetyClose:false, 외부시도/console/pageerror/URL/Image/DOM표시0 검증.
보호23/기본번들3 SHA불변,exactcode6/docs7,diff--check PASS.
자기temp 0IaMMS/bSyZ6r/PCyMYs/PoWpWg/PrbXxb/tM4mS1 부재,4183/4184/4185 listen0.
기본룸UI/실사진/운영 미개방. 기존116PNG14미해결. same-bitmap reference는 독립decode기준 아님.
다음은 준비세대와 두 paint 사용권의 결속 계약·검토다. 총가중진척은 UNCONFIRMED.
