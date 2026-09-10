# 122 — 합성 core-only 입력의 native decode 수명 검증

2026-09-10 / 기준66a2caa / CONTRACT_REVIEW_PASSED (동일 Codex).

## 목표 / 범위

121의 실제119 FileReader snapshot→명시적 createImageBitmap 포트→단발 close/치수 lease를
로컬 격리 fixture에서 검증한다. 실사진/기본 UI/metadata 제거/회전 보정/운영 허가가 아니다.

코드6개만:
- 신규 apps/mockup/src/e2e/background-absence-decode-check.ts
- 수정 apps/mockup/src/e2e/room-background-file-fixture.tsx (새 decode-분기/버튼만)
- 신규 tests/e2e/background-absence-decode.spec.ts
- 신규 tests/background-absence-decode.config.ts
- scripts/e2e-run.mjs 및 scripts/e2e-run.test.mjs (고정 selector3개만)

문서7개: 이spec,122 review/handoff,STATE/NEXT/CURRENT/live.
제품100~121/기존시험/기본config/Rules/package/lock/보호23 변경0. 실제사진/실기기/운영/Firebase/
설치/다운로드/배포/예약 자동화0. 외부 웹 접근 없이 로컬 합성 byte만 사용한다.

## 구현 계약

- 코드로 작은3×2 정적 이미지를 처음부터 작성한다. PNG는RGB IHDR/무압축zlib IDAT/IEND 및
  CRC/Adler를 작성, JPEG는1성분 SOF0/DQT/DHT/SOS와 DC0/EOB 블록을 구성한다.
  JPEG 회색/PNG 고정색의 시험 표본이다. 운영 파일 metadata를 strip하거나 사진을 가져오지 않는다.
  정상 native 생성 성공은 시험에서 검증하며 모든 JPEG/PNG의 유효성을 주장하지 않는다.
- 2형식×6상태 `normal,cancel,dispose,mismatch,reject,metadata`=12.
  정상/취소/폐기는 원본 snapshot을 그대로 native createImageBitmap(from-image)에 전달한다.
  native 성공 후 시험 gate에서 전달을 지연시킨다. 물리 decoder 자체를 중단했다고 주장하지 않는다.
  취소/폐기 전 pending 상태와 추가 start BUSY, gate 해제 후 close1/치수0을 단언한다.
- mismatch는 신뢰된 시험 포트가 native bitmap의 width만 다르게 보고하는 고장 주입이다.
  native 엔진 오보고로 기록하지 않는다. close는 실제 bitmap.close에 연결한다.
- reject는 원본 Blob을 그대로 사용하되 native 옵션 resizeWidth:0의 고정 잘못된 호출로 실패를 주입한다.
  이는 손상 파일의 자연발생 실패가 아니라 trusted 포트 고장 시험임을 명시한다.
- metadata 표본은 생성 시 JPEG APP0/PNG tEXt를 추가한다.118 선차단으로 bitmap호출0.
  121는 입력을 직접119로 보낸다. fixture에서 별도 사전검사·다른Blob교체·wrapper성공값 제조0.
- 결과는 고정 code/치수/상태/횟수 boolean만. 원bytes/Blob/bitmap/파일명 반환0.
  성공도 size lease뿐, 실제 픽셀 그리기·현실 방향 확인·draw authority0.
  release/dispose finally, 실패 안전망 close가 필요했다면 별도관찰해 정상 close로 세지 않는다.
- 새 selector `--absence-decode-{chromium,firefox,webkit}-only`, 고정config/project/worker1,
  추가인자 거부. 기존 selector와 단언 불변. 새12×3엔진=36 목표, 실패는 숨기지 않는다.
- E2E 초기 read/bitmap/URL/Image/Canvas0,각시험 read1. metadata bitmap0/close0,
  나머지 bitmap1, reject close0, 정상/취소/폐기/mismatch close1.
  화면 canvas/img/fileinput0,localhost 외 시도0,브라우저console warning/error/pageerror0.

## 검증 / DONE

selector unit + 전체 check, 새엔진별12 순차 실행. Firefox는120에서 확인된 제한환경 오류가 있으므로
정식 권한 tool의 일반환경 실행을 요청한다. 권한 거절 시 우회0. 설치/timeout/단언 완화0.
기존Chromium lifecycle46 및120 absence-owner Chromium11 회귀. 보호23/번들3 SHA,
정확code6/docs7,diff--check,포트/자기temp,일반 Git 전송 확인.
실사진/실기기/전체native metadata지원 NOT TESTED. 기존116 PNG14불일치 유지.

## 위험 / QUESTIONS

작은 합성 표본은 메모리 최고 사용량·기기별 큰 파일·전체codec 지원을 증명하지 않는다.
정상 metadata 추가지원/기본 UI 연결은 별도이며 이 범위에 새Founder 선택은 없다.

### DONE (Codex) — 2026-09-10

9837a51 CODEX_PASSED(동일 Codex). 정확코드6,selector29/check3465 PASS(exit0).
새E2E36=12×3 PASS: Chromium3.1s/Firefox30.8s/WebKit27.3s. 기존Chromium46(5.3s)+11(2.9s) PASS.
총93=36+46+11,모두exit0. Firefox는 정식 권한 허용 일반환경,설치/단언완화0.
초기 fixture 변수명 table이 Tailwind utility를 생성한 번들 차이는 huffmanDefinition으로 고쳐
전체check 재실행 후 원래번들3 SHA와 일치했다. 제품CSS/설정 수정0. 상세근거는review.
보호23 SHA 동일,정확scope13/diff--check PASS,관련포트0/자기temp5개부재.
실사진/실기기/전체형식지원/룸UI/운영 NOT TESTED. 다음은100 preparation에 새121결과를 전달하는
비연결 sink 계약 검토다. drawable 전달·제품 UI를 여기에 섞지 않는다.

최종: 코드9837a51/문서061af73 일반push 완료,HEAD=origin061af73·0/0 확인.
122 DONE/CODEX_PASSED. 최종 기록1회 전송 후 추가 영수증 커밋 없이 Git 결과를 보고한다.
