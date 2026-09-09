# 110 — 보호 출력 없는 native 불변 증거 인계 검증

2026-09-09 / baseline5357bb3 / CONTRACT_REVIEW_PASSED(동일 Codex 자체검토).
109 fecb8a4/5357bb3 구현·문서 push완료 후 사용자 속행 루틴으로 이어가는 단위다.

## 목표와 범위

109 P2의 native FileReader→부분검사→Blob snapshot→쌍인계를 localhost 합성시험으로 검증한다.
사진 decode/픽셀8방향/제품UI/운영 허가가 아니다. 계약 작성 후 이 범위 안에서 바로 구현·검증한다.

정확 코드/시험4파일:

- scripts/e2e-run.mjs
- scripts/e2e-run.test.mjs
- apps/mockup/src/e2e/room-background-file-fixture.tsx
- 신규 tests/e2e/room-background-evidence.spec.ts

문서7개: 이110spec,110review/handoff,STATE/NEXT/CURRENT/live.
109 제품코드·기존 E2E단언·canvas-fixture분기·config/Rules/package/lock/보호22 변경0.
실제사진/외부서비스/배포/설치/자동화0. 기존설치 Chromium만 사용하며 없으면STOP.

## 구현 계약

1. 기존e2e-run 무인자 실행은 전체 `playwright test` 그대로다. 임의인자 전파0.
   정확 옵션 하나 `--background-evidence-only`일 때만 하드코딩한 두 파일
   `tests/e2e/room-background-file.spec.ts`, `tests/e2e/room-background-evidence.spec.ts`를 실행한다.
   알수없는/중복/조합 옵션은 staging생성·build·실행 전에 오류종료한다. 사용자문자열을shell명령으로삽입0.
   순수 `selectPlaywrightArgs(args)`와단위시험으로 default/정확옵션/무효/인젝션을고정한다.
2. 기존 임시 staging·preview소유권·strictPort·정확디렉터리cleanup은변경하지않는다.
   기본명령이새opt-in으로축소됐다고기록하지않는다. 이번실행은targeted browser이며전체E2E PASS주장0.
3. 기존정확 `?roomBackgroundFile=1` fixture내 새evidence버튼만추가한다. 제품UI아님,기존105동작유지.
   합성 TIFF II와1..8을JPEG APP1/PNG eXIf에넣고PNG CRC를계산한다. 데이터는작은합성envelope,
   실제decoder가읽을수있는압축이미지라고주장하지않는다. 입력Filepicker·외부자산·URL/Image/Canvas0.
4. 새factory의 native FileReader를사용한다.16건=형식2×방향8,profile/tag부재4건,
   release/읽기중cancel/dispose3건. 취소는run직후같은JS구간에서하여시간추정sleep0.
   bytes전수비교·MIME식별·동일Promise·take1회·freeze·PARTIAL/NOT_VERIFIED/decodeAllowed:false를검증한다.
   검증용output.arrayBuffer 복사만시험에서사용하며제품복사장부에섞지않는다.
5. Playwright에서 localhost 이외요청을차단·실제외부요청0단언,console error/warning0,
   FileReader호출1·cancel/dispose의abort1·URL/Image/Canvas/bitmap0을계측한다.
   fake109의결과를native성공으로재사용하지않는다. native취소의물리I/O벽시계보장도주장하지않는다.

## 검증과 완료

기존설치만사용. 포트4183/4184/4185점유시면타프로세스종료없이STOP.

```text
node_modules/.bin/vitest.CMD run scripts/e2e-run.test.mjs
node scripts/check.mjs
node scripts/e2e-run.mjs --background-evidence-only
git diff --check
```

정확native23+기존105의11=34건이예상되지만실측전PASS로쓰지않는다.
단위/check/targetedChromium·3번들SHA기존동일·보호22SHA불변·포트와이번temp잔류0·허용4+7경로를검증한다.
E2E가보호PNG를만지면STOP,임의복원0. 실패는동일범위3회이내원인수정·재검증만.
코드/문서분리commit·일반push,동일Codex자체검토로기록한다.승인재질문이나예약자동화0.

## 다음 경계 / QUESTIONS

추가Founder선택없음. 다음은합성8방향픽셀을통한native decoder행동조사·검증계약이다.
실제사진허가·PNG metadata의의미추측·화면회전/100·102/UI연결·운영/설치0 유지.

### DONE (Codex)

코드67dadeb,정확4파일. opt-in의고정2파일선택·기본전체명령보존·무효옵션조기거부와native합성시험구현.
단위14/14(기존4+신규10),check unit3211=3201+10,format/lint325·7typecheck·2build PASS.
targeted Chromium34/34=23신규+11기존,4.9초 PASS. 전체E2E는실행하지않았다.
보호22SHA·고객JS/CSS·adminJS SHA기존동일,diff--check PASS,포트4183/4184/4185/8080/9099/9199 listener0.
이번temp denn-e2e-hcVx1y 제거확인,보호PNG출력0.설치0·실제사진/서비스/decode/운영0.
CODEX_PASSED는동일Codex자체검토.상세 review/handoff. 다음native픽셀방향조사계약으로계속.
