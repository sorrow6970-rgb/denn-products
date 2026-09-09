# 111 — native 방향·반전 픽셀 합성 검증

2026-09-09 / baseline3de092b / 계약자체검토완료 / 로컬 시험 전용.
사용자속행루틴으로110의34 native인계시험후실제픽셀처리를별도검증한다.

## 목표·허용범위

기설치Chromium의createImageBitmap(from-image)이합성JPEG/PNG의Exif1..8을어떻게처리하는지검증한다.
실제사진방향의정답/PNG metadata 의미유효성/제품decode허가가아니다.
코드/시험3파일: scripts/e2e-run.mjs, scripts/e2e-run.test.mjs, 신규 tests/e2e/native-orientation-pixel.spec.ts.
문서7개: 이111spec,111review/handoff,STATE/NEXT/CURRENT/live.
기존제품/fixture/109/110/Rules/config/package/lock/보호22수정0.스크린샷파일생성0.

## 구현 계약

1. runner에정확옵션 `--native-orientation-only` 하나를추가해고정새시험파일1개만실행한다.
   default전체/110옵션동작유지,다른옵션조합/임의인자거부.기존temp/preview정리유지.
2. page의빈문서에서작은canvas를생성,4모서리영역에비대칭4색을칠한다.
   rectangular48×32와square40×40 각각nativeCanvas로JPEG(quality1)/PNG를encode한다.
   Blob MIME과signature를검사해묵시적형식fallback을거부한다.
3. byte배열에정확한Exif/TIFF Orientation을주입한다. JPEG는SOI뒤APP1(Exif+zero2),PNG는IHDR뒤eXIf+CRC.
   신뢰된합성fixture이며제품parser를변경하거나임의실제사진을읽지않는다.
4. 32건=형식2×shape2×orientation8. createImageBitmap(blob,{imageOrientation:'from-image'}) 한 번.
   앱추가회전0. bitmap width/height와출력4분면중앙색이기대표와일치해야한다.
   원본영역 TL0/TR1/BR2/BL3일때출력TL/TR/BR/BL:
   1=[0,1,2,3],2=[1,0,3,2],3=[2,3,0,1],4=[3,2,1,0],
   5=[0,3,2,1],6=[3,0,1,2],7=[2,1,0,3],8=[1,2,3,0].
   5..8만가로세로교환. JPEG압축은각채널절대오차16이하,PNG는정확색(오차0).
   중앙샘플은quadrant경계/보간을피한다. 이기준은합성probe의범위이며실제사진전체품질허용치가아니다.
5. no-profile도형식×shape4건에서명시identity픽셀을검증한다. 이는우리가직접생성한표준방향원본의증거뿐,
   metadata없는임의사용자파일을orientation1로허용하는정책아니다.
6. try/finally에서bitmap.close(),생성canvas width/height0.문서에img/외부URL/Filepicker0.
   모든network요청차단·발생0,console error/warning0.텍스트보고만,PNG출력0.

## 근거·검증

HTML Standard §8.11.2 공식Blob/from-image알고리즘과106 CIPA 방향표를근거로한다.
위변환표는해당좌표규칙에서유도한독립기대값이며decoder출력에서역으로만들지않는다.
기존설치만사용.unitselector·전체check·`node scripts/e2e-run.mjs --native-orientation-only` 실행.
예상36건(32+4)은실측후만PASS로기록.고객JS/CSS/adminJS·보호22SHA·diff--check·포트/temp0확인.
비호환/실패는원인구분하고추정으로둘다허용하는단언을쓰지않는다.같은범위결함만보완한다.

## 한계와 다음

Chromium만의합성관찰이다.다른엔진/실기기/메모리/중단/동시decoder·PNG의오래된metadata는검증하지않는다.
nativePASS를고객사진허가/제품decoder연결로승격0.결과에따라다음admission/지원환경계약범위를검토한다.
추가Founder선택/신규권한전에는제품허용범위를바꾸지않는다.설치/운영/실제사진/자동화0.

### DONE (Codex)

코드c5de76f,정확3파일.최종targetedChromium36/36(2.7초),selector15/15,check3212=3211+1 PASS.
format/lint326·7프로젝트typecheck·2앱build PASS. 고객JS/CSS/adminJS·보호22SHA동일,diff--check PASS.
처음36건은픽셀/치수뒤console warning단언에서실패했다.별도최소probe로Canvas반복readback성능경고를확인,
시험output context에willReadFrequently:true 적용후동일pixel기대값·무경고조건으로재검증했다.단언완화0.
두temp denn-e2e-Fym4vL/denn-e2e-xpHMtj 제거확인·관련포트0·PNG출력0.전체E2E/다른엔진은NOT TESTED.
CODEX_PASSED는동일Codex자체검토이며임의사진/PNG metadata의정답/제품decode허가를증명하지않는다.
