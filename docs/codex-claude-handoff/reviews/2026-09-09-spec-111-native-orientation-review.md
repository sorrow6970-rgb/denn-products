# Spec111 — native 픽셀 방향 검증

2026-09-09 / code c5de76f / CODEX_PASSED(동일 Codex 자체검토).
[계약](../../rebuild/specs/111-native-orientation-pixel-probe.md).

## 근거

[WHATWG HTML Standard §8.11.2](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap),
Living Standard,2026-09-09 본문 확인. Blob읽기/Promise·imageOrientation from-image·bitmap처리와close계약 참고.
표준읽기와실제엔진증거는구분한다. 기대모서리순서는106 CIPA 방향표의행/열방향에서독립유도했다.

## 결과

합성원본은직접칠한4색quad,rectangle48×32/square40×40이며원본방향을알고있다.
JPEG/PNG×2shape×8Exif값32건과no-profile4건에서표시치수/4모서리표식이기대와일치했다.
JPEG각채널오차16이하,PNG정확색·alpha255.앱추가회전/resize0,명시from-image1회,finallyclose/캔버스정리.
이는현재설치Chromium합성36건의관찰이다.사진내용의의도된방향·오래된PNG metadata·일반파일허가는아니다.

검증:

- selector15/15 PASS,check3212=3211+1,format/lint326·7typecheck·2앱build PASS.
- 최종 `node scripts/e2e-run.mjs --native-orientation-only`:36/36 PASS,2.7초.전체E2E 실행0.
- 첫실행36실패는마지막console검사에서Canvas반복readback경고1개였다.4회getImageData 최소probe로본문확인.
  outputcontext에willReadFrequently:true를주어고쳤다.경고무시/색허용오차확대/치수단언변경0.
- 외부network요청0·console error/warning0·파일출력0.기존기설치browser만사용,설치0.
- 고객JS FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
  고객CSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
  adminJS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 모두기존동일.
- 보호SHA22/22동일,diff--check PASS,ports4183/4184/4185/8080/9099/9199 listener0.
  temp denn-e2e-Fym4vL,denn-e2e-xpHMtj 없음 확인.테스트결과의실패기록은runner의통상출력이며제품배포0.

남은경계:다른엔진·실기기·실제사진·pixel할당peak·nonabortable decode·lateclose·동시admission·룸UI는NOT TESTED.
106/109의PARTIAL과decodeAllowed:false는변경하지않았다.다음자원수명/동시제한계약으로이어간다.
