# Spec108 — 동일 바이트 profile 식별 자체 검토

2026-09-09 / baseline c5459cb / CODEX_PASSED(동일 Codex 자체 검토, 독립 검수 아님).
[108 계약](../../rebuild/specs/108-background-orientation-container.md)의 신규2코드/시험파일만 구현했다.

## 검토 결과

- caller getter 모두1회 캡처 → 로컬 plain request로104 → native getter 기반 동일buffer view →
  JPEG/PNG profile 범위 탐색 → 단일profile에만107. 중간await/외부callback·전체byte복사/보유/수정0.
- JPEG APP1의정확Exif6byte prefix만 제거한다. 알수없는APP1(XMP포함)은 명시거부하고 중복은같은값도거부한다.
  entropy stuffing/fill/restart/scan후segment와APP0/COM내용을구별하며payload내문자열검색0.
- PNG eXIf 최대1개·첫IDAT앞. CRC/파일구조는104에서같은byte로검증한다.
  eXIf내용은prefix없는TIFF로만읽고CRC/다음chunk/원본view밖으로offset이탈을허용하지않는다.
- profile없음/tag없음/명시값구분,빈/불량profile은107고정오류전파.
  frozen scalar만출력,PARTIAL/NOT_VERIFIED/decodeAllowed:false유지.107thumbnail/하위graph미검증한계유지.

## 공식 근거

[W3C PNG3 Recommendation2025-06-24](https://www.w3.org/TR/2025/REC-png-3-20250624/),
§5.6 Table7·§11.3.4.5를2026-09-09 공식본문으로확인했다.
eXIf는복수금지·IDAT앞이며JPEGprefix없는profile이다.편집후metadata의의미유효성은보장되지않는다.
JPEG Exif ID와IFD근거는 [106 정본취득](2026-09-09-spec-106-room-background-orientation-investigation.md)의CIPA관련절.
이결과는순수Exif파일전체적합성·PNG타text/압축metadata·픽셀방향증명이아니다.
APP1의좁은거부정책/추가scan한도/오류코드는Codex구조결정이고표준위반판정과구별한다.

## 실행한 검증

- 코드 `4cc4988`. 링크7/7·허용9/9·보호/별도dirty SHA22/22·diff--check PASS. 예상 밖 경로0.
- 제품 import 검색0, 관련 로컬 포트4183/4184/4185/8080/9099/9199 listener0.
- targeted82/82 PASS.32개=JPEG/PNG2×endian2×방향8,나머지50개는실패/경계/상태검증이다.
- mockup typecheck,최종 `node scripts/check.mjs` PASS:
  format/lint323파일,7프로젝트typecheck,unit3107=이전3025+신규82,2앱build.
- 초기81/82의1실패는test helper기본인자가undefined를10000으로바꾼문제였다.
  해당case를직접API호출로수정했다.그후TS2345는합성fixture의ArrayBuffer타입정확화로해결했다.
- 번들 gate에서신규시험문구container와변수contents가Tailwind후보로감지되어CSS299bytes추가됨.
  container272bytes와contents27bytes를분리확인했다(299=272+27).
  허용test문구/변수명만바꾸고전체check재실행,원래hash복구확인.생성CSS/설정직접수정0.
- no-copy는104/107호출순서·buffer동일성·profile offset12/길이26 합성사례와source검토로검증했다.
  이것은엔진내부메모리/GC/실기기peak증명이아니다.중복/CRC/예산실패때tag호출0과import I/O0검증.

최종 SHA256(107 및105 baseline과동일):

- customerJS345,362bytes: `FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`
- customerCSS22,675bytes: `6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81`
- adminJS294,873bytes: `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`

E2E/browser실행0(계약상순수미연결단위),PNG재생성0,제품import연결0.
실제사진/native8방향/metadata graph전체/기기메모리/decoder/UI/운영은NOT TESTED.
기존500kBchunk경고·Gitignore경고는설정변경없이보존.의존성설치/자동화/실제서비스0.

## 다음 경계

최신 사용자 지시로 직전 정확범위 전송 질문 해소. 동일승인 재질문 없이 코드2+문서7 및 동일문서 최종기록만 전송한다.
아래 실행 전 거절은 과거 이력이며 전송 성공을 미리 주장하지 않는다.

문서 commit/push 명령은 원격 신뢰/정확 payload 승인 부족 사유로 실행 전 거절됐다.
HEAD4cc4988/origin c5459cb·1/0, staged0. 검증 PASS는 유지하되 전송 BLOCKED로 구분한다.
코드2+문서7 및 같은7문서의 최종 전송기록을 기존 origin/브랜치로 전송할 승인 전 재시도/우회/후속0.

다음은105불변Blob과108검사결과의결속방식(P1/P2) 및decoder전 허용판정의조사·계약이다.
profile없는PNG/JPEG/Exif tag없는경우/unknownAPP1/PNG eXIf의미미확인을픽셀방향증명과구별한다.
이부분검사결과를ready로승격하거나104/105/107을허용파일밖에서고치지않는다.
