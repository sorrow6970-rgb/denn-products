# 126 합성 native paint 계약·자체검수

2026-09-11 / 기준 b6e4df2.

## 선행 계약검토

CONTRACT_REVIEW_PASSED(동일 Codex; 독립검수 아님). 125 제품 코드 변경 없이
명시 paint factory만 격리 fixture에서 사용한다. exact code6/docs7, native48+기존76,
동일환경 reference의 증명 한계, partial pixel 실패 비공개, 보호/번들불변을 계약에 고정했다.
새 제품선택/권한 확장 없음. 구현과 실행결과는 아직 NOT TESTED.


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
