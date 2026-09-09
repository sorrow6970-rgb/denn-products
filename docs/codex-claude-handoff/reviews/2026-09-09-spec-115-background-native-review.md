# 115 native 수명 검토 및 다음 환경 제약

2026-09-09 / bdcf18c / CODEX_PASSED (동일 Codex 자체 검토).
[계약](../../rebuild/specs/115-background-native-lifecycle-verification.md).

## 검증 결과

fixture 자체가 만든 JPEG/PNG48×32를109 snapshot과114/100으로 전달했다.
PARTIAL/decodeAllowed:false는 그대로이며 생성된 합성 픽셀의 알려진 방향만 사용했다.
native 작업 뒤 gate를 지연한 시험은 '물리 decoder 정지'가 아니라 결과 인계 지연이다.
각 형식6상태=12건에서 정상/취소/폐기/소스변경/교체/실제 decoder 거부를 확인했다.
close 전48×32,해제 후0×0; 취소 후ready0·중복producer0·frame/background 정리. 원본 프로세스
메모리/GC 완료나 임의 PNG metadata 의미 유효성까지 증명하지 않는다.

- 전체 check3291(3290+selector1), format/lint334·7typecheck·2build PASS.
- 고정 opt-in Chromium46=신규12+기존11+23,5.1초 PASS. 전체 E2E는 실행하지 않았다.
- read1/bitmap1·URL/Image0, 외부egress/consoleerror·warning0, PNG출력0.
- 보호22/고객JS·CSS/adminJS SHA 동일, diff PASS.
  staging denn-e2e-HHX5qP 삭제 확인,4183/4184/4185/8080/9099/9199 listener0.

## 근거·다음의 실제 제약

[WHATWG HTML §8.11.2](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap)
Living Standard(갱신2026-09-08), 확인2026-09-09: Blob의 비동기 생성/invalid 거부,
from-image, close 및 detached0치수 설명과 이번 로컬 관찰을 대조했다.
이 근거는 전 브라우저 구현이나 기기 메모리 한도 보증이 아니다.

기존 Playwright1.61.1의 실행 파일을 fs.existsSync로 검사했다:
- chromium-1228/chrome-win64/chrome.exe: 존재
- firefox-1532/firefox/firefox.exe: 부재
- webkit-2311/Playwright.exe: 부재

기존 지시에 따라 다운로드/설치를 실행하지 않았다. 후속 교차 엔진 검증에는 공식 Playwright
브라우저 바이너리의 로컬 캐시 다운로드만 별도 권한이 필요하다. 의존성/lockfile/시스템 설정 변경은
요청 범위가 아니며 이를 새 제품 지원 축소나 Safari PASS로 우회하지 않는다.
이것은115 Chromium 범위의 실패가 아니라 다음 검증 환경의 권한 제약이다.
114/115 완료 후 임의 종료와 구별해 STATE/NEXT에 명시한다.
