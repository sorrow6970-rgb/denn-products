# 107 — bounded TIFF 본 이미지 방향 태그 읽기

2026-09-09 / baseline1a35951 / DONE / CODEX_PASSED(동일 Codex 자체 검토).
사용자의 중요문제 외 scoped 루틴 계속 지시 및106 정본 열람 승인 후 진행한다.

## 목표 (WHY)

Exif3.1에서 확인한 0th IFD Orientation만 유한 작업량으로 읽는다.
이 단위는 사진/Exif 전체 유효성 검사·방향 처리기·decoder가 아니다.
태그 없음과 명시1을 구별하여 후속 코드가 추정 default를 만들어내지 않게 한다.

## 범위와 대상 (SCOPE / WHERE)

신규 코드2개만:
- apps/mockup/src/room-placement/background-orientation.ts
- apps/mockup/src/room-placement/background-orientation.test.ts

문서7개: 이 스펙,107 review/handoff, STATE/NEXT/CURRENT/live.
104/105/100/102/기존 decoder/루트배럴/제품 UI/기존시험 수정0.
JPEG/PNG 외곽 탐색·Exif ID 제거·metadata 의미 유효성·owner 연결은 후속 단위다.
Rules/config/package/lock/설치/실제사진·서비스·배포·발행·삭제·예약자동화0.
시작 보호/별도dirty22는 모든 hash를 유지한다. PNG 재생성 예외를 이 단위에 새로 부여하지 않는다.

## 공식 근거

[106 정본 취득/근거](../../codex-claude-handoff/reviews/2026-09-09-spec-106-room-background-orientation-investigation.md)
의 CIPA DC-008-Translation-2026 Table1, §4.6.2, §4.6.5.1.6, §4.7.2.
Table1 TIFF8byte header, II/MM/42 및 TIFF 시작 상대offset, IFD count2/entry12/next4,
정렬된 tag, inline4byte 규칙, Orientation274/type3/count1/1~8을 사용한다.
규격default1은 확인됐지만 API는 absent와명시1을 구별하며 default를 적용하지 않는다.

## 구현 계약 (WHAT / HOW)

`inspectTiffOrientation(request: unknown): TiffOrientationResult` 동기 함수, request `{bytes}`.
bytes는 APP1 ID를 제외한 TIFF header부터 profile 끝까지의 Uint8Array view다.
정확한 일반 Uint8Array/동일realm 고정 ArrayBuffer만, Proxy/subclass/Shared/resizable/detached0.
request.bytes getter1회, native getter로 경계 캡처, shadow getter/method/iterator0.
호출 중 외부callback/await0, 입력 변경/전체복사/보유0, 결과는 frozen scalar만.
view 바깥 접근0, profile20,000,000bytes 초과는 탐색 전 BYTE_LIMIT. 파일 전체 예산을 대체하지 않는다.

성공: `{ok:true,kind:'orientation-tag-only',presence:'present'|'absent',value:1..8|null,
imageOrientation:'NOT_VERIFIED',profileValidation:'PARTIAL',decodeAllowed:false}`.
실패: `{ok:false,code}`만, 원문/byte/개인정보/log0.
코드: TIFF_ORIENTATION_INVALID_INPUT / BYTE_LIMIT / MALFORMED / SCAN_LIMIT / UNSUPPORTED_TYPE.

순서:
1. native view와size, header8bytes, endian/42 검증.
2. 0th IFD offset≥8, count2byte 읽을 수 있는 profile 내부인지 검사.
3. count≤256(Codex 작업량 제한; 표준/실시간 SLA 아님). 2+12×count+4bytes 모두 범위 검사.
4. tag는 strictly ascending, 동일 tag 중복도 거부.0th IFD만 전체 순회한다.
5. 타입1/2/3/4/5/7/9/10/129의 요소길이1/1/2/4/8/1/4/8/1로 storage범위만 확인한다.
   다른 type은 UNSUPPORTED_TYPE, count0은 이 좁은 profile에서 MALFORMED.
   길이≤4면 inline, >4면 header8byte와현재 IFD table 밖의 profile 내부 영역이어야 한다.
   다른 tag의 의미/문자열/Exif·GPS 하위 IFD 포인터 값은 해석하지 않는다.
6. tag274는 type3/count1/value1..8이어야 한다. 없는 경우 presence absent/value null.
7. next IFD offset0은 종료. nonzero는≥8/count2byte 범위, 현재0th table과 겹치지 않는지만 확인한다.
   다음/Exif/GPS/Interop IFD를 순회하거나 thumbnail orientation을 채택하지 않는다.
   따라서 다음 IFD graph/cycle/전체profile 유효성은 **검증하지 않음**. PARTIAL을 반드시 유지한다.

107은106의 전체 parser 후보보다 의도적으로 좁다. cycle/중복 profile/JPEGAPP1/PNGeXIf 등 전체시험은
후속 container/graph 계약으로 남긴다. 이 성공을 전체 안전 증명으로 사용하면 계약 위반이다.
태그 parser 자체는 PNG metadata가 편집 후 유효한지 알 수 없다.

## 검증 (VERIFY)

- targeted unit: II/MM×1..8,없음/명시1,offset/padding/subview,tag정렬/중복/type/count/value,
  header/범위/truncation/nextpointer,256/257작업량,20M/초과,원본불변·결과frozen,
  hostile/getter/nativebrand/shared/resizable/detached·late변경,import I/O0.
- mockup typecheck, `node scripts/check.mjs`(format/lint/전체unit/두앱build).
- 고객/admin entry 및 고객CSS SHA 시작과 비교, 제품연결import0, forbidden diff/hash22/22,
  git diff--check, 허용2코드+7문서, 잔류 포트 및 Git 관계 확인.
- 브라우저 integration0인 순수 parser-only 단위이므로 E2E 실행0을 명시한다.
  기존105 Chromium292/292를107 결과로 재사용하지 않는다. native8방향/실제사진/메모리는NOT TESTED.

## 위험 / STOP

PARTIAL result를 decode gate로 승격0. 메타데이터가 없는 파일 지원 정책/PNG회전/byteowner변경을 여기서 정하지 않는다.
구현 중 새 API/의존성/스코프확대/재현불가 실패/권한 문제면 STOP.
신규 파일을 제거하면 기능 영향 없는 rollback이지만 자동삭제하지 않는다.

### QUESTIONS

현재 없음. 상기 순수 parser 경계와 검증 방법을 동일 Codex가 계약 자체 검토했다.

### DONE (Codex)

코드aa7ed09,정확2코드/시험파일 구현. targeted101/101,전체unit3025=2924+101,format/lint321파일·7프로젝트typecheck·2앱build PASS.
고객JS/CSS·adminJS SHA불변, import I/O0 및제품import연결0, E2E실행0·PNG재생성0.
nextIFD1byte겹침/테스트TS구문/시험설명의CSS scanner 영향 보완 후 최종검사 통과.
상세 [review](../../codex-claude-handoff/reviews/2026-09-09-spec-107-tiff-orientation-tag-reader-review.md) 및
[handoff](../../handoff/2026-09-09-spec-107-tiff-orientation-tag-reader-handoff.md).
성공도 PARTIAL/NOT_VERIFIED/decodeAllowed:false. 전체metadata/pixel/native방향/사진/decoder/UI는 미검증이다.
