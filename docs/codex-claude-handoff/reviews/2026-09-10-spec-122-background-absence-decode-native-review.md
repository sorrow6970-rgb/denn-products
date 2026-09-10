# 122 합성 native 계약·구현 검토

2026-09-10 /66a2caa /동일 Codex 자체검토. CONTRACT_REVIEW_PASSED.
[122 계약](../../rebuild/specs/122-background-absence-decode-native.md).
제품121 변경 없이 명시적 fixture 포트로 실제FileReader/bitmap 수명을 검증한다.
자체 생성 JPEG/PNG만, metadata 제거/실사진0. 고장 주입과 자연발생 브라우저 실패를 구분한다.
정확코드6/문서7,기존11614실패 불변. 실측 전 PASS 수치 기록0.

## 구현 최종 자체검수 — CODEX_PASSED

코드9837a51. 신규fixture는 직접 생성한core-only JPEG/PNG를121에 전달,제품코드수정0.
두형식 모두 native3×2 생성/late close/close 후0치수/metadata 선차단을3엔진에서 확인했다.
width mismatch는wrapper 고장주입,reject는resizeWidth0 고장주입이다. 실제 엔진 버그나 손상사진 사례로 과장0.
읽기1,bitmap0/1,close0/1,URL/Image/Canvas0,외부시도0,브라우저console/pageerror0,
정상정리시needsSafetyClose:false 단언통과. 실제pixel값/방향 비교를 수행했다고 주장하지 않는다.

| 실행 | 실제 결과 |
|---|---|
| 전체check |3465=3462+selector3,115unit파일,format/lint349,7typecheck,2build PASS;exit0|
| selectorunit |29=26+3 PASS;exit0|
| Chromium 새native |12 PASS,3.1s;exit0|
| Firefox 일반환경 새native |12 PASS,30.8s;exit0|
| WebKit 새native |12 PASS,27.3s;exit0|
| 기존Chromium lifecycle |46 PASS,5.3s;exit0|
| 기존120 Chromium owner |11 PASS,2.9s;exit0|

새36=12×3,이번E2E합93=36+46+11. Firefox는120의제한환경 실패 이력에 따라 정식권한 허용
일반환경에서 실행했고 이번122에는 실패0.120의11실패이력은 지우지 않는다.
기존116 PNG14불일치 그대로,새core-only작은표본 성공으로 전체방향지원PASS 처리0.

### 번들 부수효과 진단 및 보완

첫check 자체는PASS였지만 고객CSS가 index-CeX1pshQ로 달라졌다. 읽기전용으로
`.table{display:table}` 규칙만 제외한문자열 SHA를 계산했더니 baselineCSS
6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81과 정확히 같았다.
신규fixture의 table변수명을huffmanDefinition으로바꾼후 전체check 재실행,원래3번들SHA 복원 확인.
제품CSS/Tailwindconfig/기존코드 수정이나 생성파일 직접복원0. 정확fixture범위 보완이다.

최종고객JS FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
고객CSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
adminJS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246.
고객345.36kB/gzip105.80,admin294.87kB/gzip91.38(빌드반올림),기존SDK555.25kB 경고유지.
보호23 SHA 동일,정확code6/docs7,예상밖dirty0,diff--check PASS. 관련4183/4184/4185 listener0.
자기temp denn-e2e-ZHMgrn/6XEdoa/AO8UnM/ZU0QJa/27gx7M 모두자동정리·부재확인.
브라우저시험 모두exit0 종료,타프로세스종료0. 다음은100 sink 비연결 계약 검토.
