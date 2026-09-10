# 121 계약·구현 자체 검토

2026-09-10 / baseline57f6dd0 / 동일 Codex, 독립 검수 아님.

## 계약 검토 — CONTRACT_REVIEW_PASSED

[121 계약](../../rebuild/specs/121-background-absence-decode-work.md).
119 private snapshot을 직접 소비하고112 admission을 재사용한다. caller evidence를 검증 우회로 삼지 않는다.
113의 native Promise 관찰/취소 후 슬롯 유지와114의 치수-only lease를 계승한다.
decode 포트는 명시적인 신뢰된 주입이며 기본 decoder/실사진/UI 연결 없음. PNG metadata 실패 우회0.
close 확보 전 치수를 읽지 않고, close 실패/미관찰 작업은 blocked. 새예산/회전 의미 선택 없음.
코드 신규2/문서7, 실제 검증 수치는 실행 후 기록한다.

## 구현 검토 — CODEX_PASSED

코드 ec87d65, 동일 Codex 자체 검수.119 factory 직접 호출/112 슬롯 재사용, 기존 제품 코드 수정0.
pair.take 이전 job.dispose는 쌍을 무효화하므로 최초 편집 직후 읽기 검토에서 순서를 고쳐
take→dispose로 고정했고 byte 동일성2형식 시험이 통과했다. 미실행 중간 편집을 실패 게이트로 세지 않는다.
bitmap.close 확보→admission 등록→치수검사 순서. 취소 뒤 실제 정착까지 pending 유지,
late close/close throw blocked/과거 task 무효화가 새 작업에 영향을 주지 않음 등을 검증했다.
readEnvironment와decode는 신뢰된 포트이며 거짓 byte/native 결과까지 인증하는 보안 경계는 아니다.

| 실제 실행 | 결과 |
|---|---|
| 신규 unit |65 PASS, exit0|
| targeted4파일 |166=65+36+42+23 PASS, exit0|
| 전체 check |3462=3397+65,115unit파일,format/lint346,7typecheck,2build PASS, exit0|
| 기존 Chromium lifecycle |46=11+23+12 PASS,6.8s,exit0; 새121 native 시험 아님|

최초 check는 테스트용 constructible reader에 useArrowFunction lint 경고1건으로 exit1.
생성자 this 검증을 추가하고 전체 check PASS; 설정/단언 완화0. 기존 SDK555.25kB chunk 경고는 유지.
고객 entry345.36kB/gzip105.80,admin294.87kB/gzip91.38(빌드 출력 반올림),기존과 동일.
고객 JS SHA FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
고객 CSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
admin JS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246.
보호23 SHA 동일/예상밖dirty0/정확9파일/diff--check PASS. production importer0.
관련포트4183/4184/4185 listener0(.NET),자기temp denn-e2e-KRCHtk 자동정리·부재확인.

실사진/native121경로/실기기/제품표시/운영 NOT TESTED. 다음은 합성 native 결속 시험 계약.
기존116의 PNG14불일치, core-only-v1의 좁은 지원 범위는 해결됐다고 기록하지 않는다.
