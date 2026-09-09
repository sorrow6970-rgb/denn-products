# 108 — JPEG/PNG 방향 profile 식별·동일 바이트 검사

2026-09-09 / baseline c5459cb / DONE / CODEX_PASSED(동일 Codex 자체 검토).
사용자 `응 진행해줘` 및 중요 문제 외 scoped 루틴 계속 승인에 따른 계약·구현 단위다.

## 목표

104가 검사한 같은 바이트 안에서 JPEG APP1/PNG eXIf profile을 찾아107에 전달한다.
파일 읽기/소유권 인계/방향 적용/decoder/제품 UI 연결은 하지 않는다.
성공은 부분 metadata 증거일 뿐, 어떤 파일에도 decode 허가를 만들지 않는다.

## 허용 범위

신규 코드·시험2파일:

- apps/mockup/src/room-placement/background-container.ts
- apps/mockup/src/room-placement/background-container.test.ts

문서7개: 이108 spec,108 review/handoff,STATE/NEXT/CURRENT/live.
104/105/107 및 기존제품·시험·설정·Rules·manifest·lockfile 수정0. 새 barrel/import 연결0.
보호/별도dirty22와PNG는 hash 불변. E2E재생성 예외0.
실제사진/서비스/Firebase/운영/배포/발행/삭제/설치/예약자동화0.

## 근거와 구조 결정

[W3C PNG3 Recommendation2025-06-24](https://www.w3.org/TR/2025/REC-png-3-20250624/),
2026-09-09 본문 확인: §5.6 Table7의 eXIf는 최대1개·IDAT 앞.
§11.3.4.5는 JPEG APP1 marker/length/Exif ID 없이 TIFF profile을 싣는다고 정의하며,
편집 뒤 metadata가 오래됐을 수 있다는 의미 유효성 제한이 있다.
[106 CIPA 정본 확인](../../codex-claude-handoff/reviews/2026-09-09-spec-106-room-background-orientation-investigation.md)
§4.7.2의 APP1 식별자는 Exif+0 두 개. TIFF 상대offset은 profile 첫바이트 기준이다.

CIPA의 Exif APP1 바로SOI뒤 배치 규정과 일반JPEG profile 탐색을 구별한다.
이 reader는104가 허용한 JPEG의 marker 경계 어디서든 APP1을 탐색하며, 순수Exif 파일 적합성은 보증하지 않는다.
JPEG APP1이 Exif ID와 정확히 일치하지 않으면 XMP 포함 METADATA_UNSUPPORTED로 거부한다.
이는 좁은 DENN 검사기 설계이며 XMP가 표준 위반/악성이라는 뜻이 아니다.
다른JPEG APPn/COM와PNG text·압축 ancillary의 의미는 읽거나 문자열화하지 않는다.
따라서 recognizedExif 부재가 다른 방향 metadata 부재·픽셀방향 정상임을 뜻하지 않는다.

## API / 순서

`inspectRoomBackgroundContainer(request: unknown): BackgroundContainerResult` 동기 순수함수.
request `{bytes,budget:{maxEdge}}`, caller 필드getter는 각각1회.
104의 native view/buffer/size/format/치수/CRC·envelope 검사를 재사용한다.
모든 caller getter를 먼저 캡처한 뒤 로컬 평범한 record로104를 호출한다.
실패는104의 고정code 그대로. 성공 뒤 native getter로 같은 buffer/offset/length의 새view만 만든다.
이후 외부callback/await0,바이트 전체복사/보유/수정0. shadow slice/subarray/iterator 호출0.

1. 104 검사:20,000,000bytes/40,000,000pixels/필수maxEdge 유지. caller가 건넨 사전검사 결과는 받지 않는다.
2. container를 단방향 재탐색. 각 pass에4096 marker/chunk 한도, 전체byte에 유한순회.
   104검사+108재탐색+107태그검사의 합이지 모든 일을4096연산 안에 끝낸다는 주장이 아니다.
3. JPEG: entropy stuffed FF00/restart/fill과segment 길이를 구분. SOI~EOI전체에서APP1검색.
   Exif6byte ID를 제거한 정확 segment 내부만 TIFF view로 잡는다. 같은값이어도두profile이면 DUPLICATE.
   알수없는/불완전ID의APP1은 UNSUPPORTED. 다른segment의우연한 Exif문자열은 검색하지 않는다.
4. PNG: eXIf정확대소문자·최대1개·첫IDAT앞. data영역만TIFF view로잡고CRC/다음chunk를포함하지 않는다.
5. container순회중첫구조오류를즉시반환. 전부순회후 단일profile에만107호출.
   profile있음+tag없음과profile없음을구별.107실패는그대로전파한다.
6. 결과 frozen scalar record:
   `{ok:true,kind:'container-orientation-evidence',format,byteLength,encodedWidth,encodedHeight,encodedPixels,
   exifPresence:'present'|'absent',tagPresence:'present'|'absent'|'unavailable',value:number|null,
   profileValidation:'PARTIAL',imageOrientation:'NOT_VERIFIED',decodeAllowed:false}`.
   profile없으면tagPresence unavailable/value null. 없는값1자동채움0,표시치수/회전행렬반환0.

실패 `{ok:false,code}`:104/107코드 또는
ROOM_BACKGROUND_METADATA_DUPLICATE / ROOM_BACKGROUND_METADATA_ORDER / ROOM_BACKGROUND_METADATA_UNSUPPORTED.
빈/불량TIFF는107오류. body/파일명/MIME/EXIF/XMP/URL/원문오류·log반환0.
출력은 호출시점의증거일뿐 이후변경가능byte와의identity 인증서나 immutablelease가 아니다.
105와 연결하려면 검사~snapshot 또는 동일Blob 소비를 결속하는 별도owner 계약이 필요하다.

## 검증

- 신규test내 합성JPEG envelope/CRC PNG/TIFF fixture만 사용. 실제사진/decoder사용0.
- JPEG/PNG×II/MM×1..8,profile없음/tag없음,중복/unknownAPP1/XMP/ID불량,
  PNG eXIf뒤IDAT순서/CRC/APNG,TIFFoffset의segment탈출,thumbnail값비채택,
  entropy/fill/restart/marker내가짜Exif,callergetter/view/subview·mutation/브랜드/복사0/I/O0,
  20Mbytes/40Mpixels/maxEdge/4096한도·실패전파/성공scalar검증.
- targeted unit, mockup typecheck, `node scripts/check.mjs` 전체gate.
- JS/CSS SHA(기준107),제품import연결0,허용9경로/보호SHA22/22,diff--check,포트/Git.
- 순수미연결단위이므로E2E실행0/PNG재생성0. native8방향/실제사진/메모리/전체metadata/decoder/UI는NOT TESTED.

## STOP / QUESTIONS

현재 제품선택질문없음. 위부분검사성공을허용입력/방향검증으로확대하면STOP.
신규권한/스코프충돌/의존성/재현불가gate필요시STOP.같은Codex계약자체검토후구현한다.

### DONE (Codex)

최신 사용자 `별도 승인 자꾸 물어보지말고 스펙대로 진행해`에 따라 직전 정확범위 전송을 진행한다.
코드2+문서7과 같은문서 최종결과 기록만 기존 origin/브랜치에 일반 전송. 아래 BLOCKED는 해소 지시 전 이력이다.

전송 상태: BLOCKED. 문서7개 commit/push 명령이 실행 전 거절되어 코드4cc4988만 로컬 커밋이다.
CODEX_PASSED는 로컬 자체검증 결과이며 원격 완료가 아니다. 정확 범위 전송 승인 전 재시도/후속 착수0.

코드 커밋 `4cc4988`. 문서 링크7/7·허용9/9·보호/별도dirty SHA22/22·diff--check PASS.
정확2코드/시험파일구현. targeted82/82,전체unit3107=3025+82,format/lint323·7프로젝트typecheck·2앱build PASS.
고객JS/CSS·adminJS SHA기존동일,제품연결0·E2E실행0·PNG재생성0.
undefined testhelper/fixtureTS타입/CSS스캐너299byte부수효과를허용시험파일안에서보완후전체gate재통과.
[review](../../codex-claude-handoff/reviews/2026-09-09-spec-108-background-orientation-container-review.md) ·
[handoff](../../handoff/2026-09-09-spec-108-background-orientation-container-handoff.md).
PARTIAL/NOT_VERIFIED/decodeAllowed:false유지.실제사진/방향/decoder/UI·운영은미검증이다.
