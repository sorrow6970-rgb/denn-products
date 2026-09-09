# Spec106 — 룸 배경 방향·불변 Blob 소비자 조사

2026-09-09 / baseline `5a4341b` / 문서 조사 완료, CIPA 권한·취득 차단 해소.
DOCUMENT_REVIEW_PASSED는 동일 Codex의 문서 자체 검토이며 독립 검수/제품 PASS가 아니다.

## 최신 정본 확인 — 사용자 승인 후 같은 날

사용자 `응 승인 다음진행`은 직전 CIPA 면책조건 동의·정본 다운로드 질문의 직접 승인이다.
동일 조건 Accept 반영을 브라우저에서 확인했다. 다운로드 폼이 빈 dlltarget을 제출하여 파일 확보는 실패했다.
공식 `https://www.cipa.jp/std/js/dll.js`에서 식별자 전달 방식을 확인하고,
공식 `https://www.cipa.jp/std/documents/dll.cgi`에 `dlltarget=CIPA_DC-008-2026-E`를 POST하여 정본을 받았다.
저장소/사용자 파일 전송0, 프로그램 설치0. 다운로드는 승인 범위이며 접근조건 우회가 아니다.

- 출처: [CIPA DC-008-Translation-2026 / Exif3.1](https://www.cipa.jp/std/documents/download_e.html?CIPA_DC-008-2026-E).
  PDF267쪽,4,451,181bytes, SHA256 `9CC36399A46AB7AA4A65473BB8A4945D3B044DA739B8F16A01B0BE11886DCFF9`.
  영문 번역판이며 의문 시 원문 우선이라는 표지 제한을 유지한다. 전267쪽 정독을 주장하지 않는다.
- 실제 읽은 절: Table1(PDF31/인쇄20), §4.6.2(PDF38~39/27~28), Table6(PDF42/31),
  §4.6.5.1.6 및 Figure13(PDF44~47/33~36), §4.7.2(PDF116~117/105~106).
  방향 표와 그림은 PDF44/46/47을 렌더링하여 직접 대조했다.
- 확인: TIFF header8bytes, II/MM·42·0th IFD offset. IFD count2bytes/entry12bytes/next offset4bytes.
  offset은 TIFF 시작 기준,4bytes 안에 들어가는 값은 entry 안에 inline. tag 정렬 규정 존재.
  Orientation은274(0x0112), SHORT(3), count1,1~8, 규격 default1. JPEG ID는 Exif 뒤0 두 개.
  0th IFD는 본 이미지,1st IFD는 thumbnail; thumbnail 방향을 본 이미지에 대입하지 않는다.
- 정정: 이제 binary 상수와 규격 default1은 확인됐다. 하지만 metadata 부재/해석 실패/사진 의미 유효성을
  모두 default1로 통과시키는 DENN 정책은 승인하지 않는다. 출력에 부재와 명시값을 구별할 수 있다.
  PNG 의미 유효성·native8방향·decode·메모리·P1/P2 연결은 여전히 NOT TESTED다.

원본과 렌더링은 OS temp `denn-cipa-1d8ee05c58bd4c8fa187df71b71f6ec0`에만 보관, Git 포함0.
PDF 스킬로 필요한 표/그림을 읽었다. 기존 runtime 사용, 인코딩 추출 오류는 UTF-8로 재실행하여 해결.
Poppler의 일부 nameToUnicode 파일 경고에도 필요한 영문 표/그림은 렌더링·육안 확인했다.
아래 '미취득/권한 대기'는 승인 전 조사 이력이며 현재 차단 상태가 아니다.

## 1. 결론

104/105는 파일 형식·치수 사전 검사와 불변 byte 인계까지다. 방향 검증이나 표시 허가는 아니다.
현재 `orientation: NOT_VERIFIED`, `decodeAllowed:false`를 그대로 유지한다.
아래 공개 문서만으로 최신 Exif binary parser 전체 계약을 확정하지 않는다.
CIPA 최신 Exif3.1은 위 승인 후 필요한 본문을 확인했다. 후속 bounded parser-only 계약을 작성할 수 있다.
PNG의 오래된 metadata를 현재 픽셀의 방향 정답으로 단정하지 않는다. 검증 불가는 RG-3대로 거부한다.

## 2. 공식 근거 장부

모두2026-09-09 본문 확인. 검색 요약/블로그/타사 mirror를 근거로 사용하지 않았다.

| 출처·지위·확인 절 | 실제 확인한 내용 / 한계 |
| --- | --- |
| [CIPA Standards](https://www.cipa.jp/e/std/std-sec.html), 현행 목록, DC-008-Translation-2026 항목 | Exif Version3.1,2026-01-30 발행,2024판 개정이라는 목록 정보만 확인. binary layout 확인 아님 |
| [CIPA Exif3.1 다운로드 안내](https://www.cipa.jp/std/documents/download_e.html?CIPA_DC-008-2026-E=), Disclaimer/Accept | 면책조건 수락 후 다운로드하도록 요구. 동의/다운로드0. 최신 본문 UNCONFIRMED. 권리·책임 조건의 법률 판단을 한 것이 아님 |
| [PNG Third Edition](https://www.w3.org/TR/2025/REC-png-3-20250624/#eXIf), W3C Recommendation2025-06-24, §11.3.4.5/§13.5 | eXIf는 JPEG APP1 marker·길이·Exif ID prefix 없는 profile, 최대1개. II/MM+42 header 권고, invalid pointer 방어 필요. 편집 후 metadata가 낡았을 수 있어 독립적 유효성 근거 없이 현재 이미지 정보로 단정하지 말라는 권고. 이 보고서는 해당 고정판을 근거로 사용하며 후속 개정 유무를 단정하지 않음 |
| [HTML Standard](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap), WHATWG Living Standard, §8.11.2 IDL/Blob/crop/close 알고리즘 | Blob 입력과 Promise, imageOrientation 기본 from-image, enum from-image/flipY. 과거 none의 의미 변경 설명이 있어 none을 미회전 보장으로 사용하지 않음. close는 bitmap 해제. 이 API의 제시된 옵션에 AbortSignal 없음. browser별8방향·메모리·취소 실측 아님 |
| [TIFF namespace](https://developer.adobe.com/xmp/docs/xmp-namespaces/tiff/), Adobe XMP 기술 문서, tiff:Orientation | 1~8의 첫 행/열 방향 의미 확인. raw TIFF IFD의 tag/type/count/offset 구조나 최신 Exif 규격을 확인한 자료로 오용하지 않음 |

PNG profile byte 유효성과 실제 픽셀에 대한 metadata 의미 유효성은 서로 다르다(위 W3C 근거).
WHATWG from-image 후보를 선택하더라도 8방향 실측 없이 브라우저가 언제나 올바르게 처리한다고 기록하지 않는다.
flipY를 원본 방향 복원 우회로 사용하지 않는다. 색변환/alpha 기본값의 구현별 차이도 별도 후속 검증이다.

## 3. 로컬 근거와 현재 빈틈

- [104 input](../../../apps/mockup/src/room-placement/background-input.ts), `BackgroundInputResult`/`inspectRoomBackgroundInput`:
  성공도 preflight-only, orientation NOT_VERIFIED, decodeAllowed:false다.
- [JPEG envelope](../../../apps/mockup/src/room-placement/background-jpeg-envelope.ts)와
  [PNG envelope](../../../apps/mockup/src/room-placement/background-png-envelope.ts):
  APP/eXIf 내부 Orientation의 의미 검증 계약이 없다. 외곽 envelope PASS를 metadata PASS로 승격하지 않는다.
- [105 owner](../../../apps/mockup/src/room-placement/background-file.ts), run 내196~225행:
  읽은 buffer view 검사 뒤 동일 bytes를 Blob으로 snapshot하고 takeBlob1회만 인계한다.
  공개 orientation 증명이나 decoder는 없다.
- [기존 EXIF 시험](../../../tests/e2e/mockup-preview.spec.ts), EXIF orientation6 시험1450~1505행:
  합성40×20 JPEG의 결과20×40 또는40×20을 모두 통과시킨다. 측정용이며 방향 정책 통과가 아니다.
  2/3/4는 치수가 같아 치수 확인만으로 반전/180도 회전을 구별할 수 없다.
- [기존 SpaceV2 decoder](../../../apps/mockup/src/space-v2/browser-png-decoder.ts),55~56/104행:
  Uint8Array 생성과 slice 및 Blob 생성 경로다. 룸105의 단일 Blob 소비자/복사 예산에 그대로 연결하지 않는다.

## 4. 방향 값과 표시 좌표 — 수학적 설계 후보, NOT TESTED

Adobe의 행/열 정의를 좌표로 해석한 아래 변환은 Codex 도출식이다. 구현이나 Exif3.1 binary proof가 아니다.
encoded 크기 W×H, 정수 픽셀 좌표 0≤x<W,0≤y<H. 출력은 왼쪽 위 원점이다.

| 값 | 표시 좌표 (x′,y′) | 표시 크기 |
| --- | --- | --- |
| 1 | (x,y) | W×H |
| 2 | (W−1−x,y) | W×H |
| 3 | (W−1−x,H−1−y) | W×H |
| 4 | (x,H−1−y) | W×H |
| 5 | (y,x) | H×W |
| 6 | (H−1−y,x) | H×W |
| 7 | (H−1−y,W−1−x) | H×W |
| 8 | (y,W−1−x) | H×W |

면적W×H와 양변 공통maxEdge 판정은 축 교환에도 불변이지만, 표시 폭/높이는5~8에서 교환된다.
인쇄/룸 배치에는 표시 치수가 필요하다. RG-3의20,000,000bytes/40,000,000pixels 상한은 바꾸지 않는다.

## 5. metadata 검증 후보와 fail-closed 경계

아래는 후속 계약 요구이지 새 제품 승인이나 이미 구현된 동작이 아니다.

| 입력 경계 | 필요한 증거/후속 동작 |
| --- | --- |
| JPEG APP1 Exif profile | 정본의 ID/header/IFD/type/count/offset 규칙 확인 후 bounded parser. 다른 APP1(XMP 등)을 Exif로 오인하거나 무조건 안전한 방향 부재로 간주하지 않음 |
| PNG eXIf | 최대1개/유효 header/범위 검사. binary PASS만으로 현재 픽셀의 방향 증명 불가. eXIf 없는 PNG와 따로 분류 |
| 방향 누락 | “tag 없음”과 “Exif 없음”과 “읽지 못함”을 구분. 확인하지 않은 기본값1 생성 금지 |
| 중복 profile/tag, 서로 모순 | 첫 값/마지막 값 임의 채택0. 오류로 분리. 같은 값 중복도 parser 계약 전 통과 금지 |
| 값 범위 밖, 잘못된 type/count/endian/offset, truncated/cycle | 모든 접근 전 segment 내부 bounds 및 산술 검증. 제한 없는 IFD 순회0, 오류 원문/metadata 외부노출0 |
| PNG 편집 전 metadata, 다른 metadata와 불일치 | 파일 나이/파일명/치수만으로 유효성 추정0. 검증 불가 차단 유지, 허용 확대 필요 시 Founder 결정 |

TIFF 숫자 구조는 위 정본 확인으로 해소됐다. 전체 metadata graph 검증과 실제 방향 허가는 별개다.
104의 외곽4096단계 제한을 IFD 파싱 횟수/메모리 상한으로 오인하지 않는다. 별도 bounded 작업량 계약이 필요하다.

## 6. 단일 방향 처리 주체와 byte 소유권 후보

| 후보 | 장점 | 아직 막힌 조건 / 판정 |
| --- | --- | --- |
| strict metadata 검사 + native from-image가 방향 처리 | 앱이 다시 회전하지 않아 이중회전 경로를 줄임 | parser 정본·8방향 픽셀/치수 실측·PNG 유효성·동일Blob 증명 필요. 후보, NOT TESTED |
| metadata 검사 + 앱이 직접 방향 변환 | 변환 행렬 시험 가능 | native decode가 미회전 raw pixel을 반환함을 보장해야 함. none/flipY 추정 금지. 별도 decoder 계약 전 보류 |
| 기존 Image decoder + 치수만 보고 회전 추측 | 구현량 적음 | 반전/180도/정사각형 구별 못함. 정확성 요구에 불충분, 채택 안 함 |

단계 관계(제안): `105 불변 Blob → 같은 Blob에 결속된 metadata 판정 → 단일 decoder → 검증된 표시 치수/lease → 100/102 연결`.
현재는 첫 단계까지만 구현돼 있다. 중간 판정을 caller가 다른 Blob과 섞는 느슨한 public 객체로 만들지 않는다.
100의 capture-first 순서와 취소/late lease 해제 계약은 별도 연결 스펙에서 보존한다.

byte 인계 선택도 미채택:

- P1: 소비자가105 Blob을1회 take하고 그 Blob을 읽어 metadata 판정, 정확히 같은 Blob을 decode한다.
  원본 File 재읽기는 없지만 Blob byte를 다시 materialize하는 N 비용이 추가된다. 숨겨진 zero-copy로 보고하지 않는다.
- P2:104/105가 원래 소유한 view에서 metadata를 검사하고 snapshot과 결속해 인계한다.
  추가 byte materialization을 줄일 수 있으나104/105 API 변경이므로 다음 스펙에서 정확 파일/API를 열거해야 한다.

N≤20,000,000에서105의 read N+snapshot N≤40,000,000bytes는 명시적 표현 장부다.
P1의 소비자 buffer N이 기존 표현과 겹치면3N≤60,000,000bytes라는 추가 장부가 필요하다.
이는 GC/native decode/픽셀 surface/타 job을 포함한 peak 보장이나 기기 안전 숫자가 아니다.
Promise 취소를 physical decode 중단이라고 주장하지 않는다. late bitmap close/lease release와 동시 admission은 후속 설계다.

## 7. 후속 합성 검증표 — 이번 실행0

| 게이트 | 필요한 시험 |
| --- | --- |
| 순수 parser | II/MM,1~8,누락/중복/모순/invalid count/type/value,모든 offset 경계/truncation/cycle/작업량 초과 |
| JPEG/PNG 구분 | APP1 ID 포함/불포함과 PNG eXIf prefix 차이, unknown APP1, eXIf중복, stale 의미 미확인 차단 |
| native 방향 | 비정사각형의 비대칭 모서리 표식8개 방향, 표시 치수와 모서리 위치 모두 단언. JPEG 손실색은 구역/허용오차를 명시 |
| 단일 처리 | native 후 앱 추가회전0, no-tag와반전/정사각형 별도, full matrix 미통과 환경 fail-closed |
| byte identity | 다른Blob/위조판정 섞기 거부, take/release1회, P1/P2 복사 장부 확인 |
| cancel/dispose/late | decoder전 취소0호출, 진행중 logical cancel, 늦은성공 해제, 늦은실패 unhandled0, 자동retry0 |
| 예산/통합 |20Mbytes/40Mpixels/explicitmaxEdge 유지,100capture-first,102lease,동시job/peak 별도. production import/UI0인 분리시험부터 |

fake는 호출순서/매핑만 증명한다. native픽셀·실기기·전체메모리 증거가 아니다.
기존105 targeted83/unit2924/Chromium292는 이전 스펙 결과이며106 시험 수치가 아니다.

## 8. 다음 최소 범위와 STOP

정본 확보 뒤 다음 스펙 MD에서 parser-only 후보를 먼저 고정한다:
`apps/mockup/src/room-placement/background-orientation.ts`와 인접 `.test.ts` 두 신규파일 후보.
실제104/105 연결 변경은 P1/P2 채택 및 별도 계약 전 금지. 정확 오류/API/상수는 본문 확인 뒤다.
native proof는 별도 분리fixture/E2E 계약으로 진행한다. 현재 existing E2E 기대값을 완화/대체하지 않는다.
UI·100/102연결·실제사진·운영·Rules·설치·다른형식·자동변환·발행·삭제는 계속 범위 밖이다.

직전 CIPA 권한 질문은 승인·정본 확보로 해소됐다. 같은 권한을 다시 묻지 않는다.
PNG 검증 불가 거부는 기존 RG-3 원칙을 유지하므로 지금 허용 확대를 다시 요청하지 않는다.
106 문서7개를 검증·일반 commit/push하고 다음 parser-only 계약을 작성한다. 보호/별도dirty22는 제외한다.

## 9. 완료·검증

공식 근거와 미확인 경계 분리, 동일 Codex 문서 자체 검토 완료. 다음은 parser-only 계약이다.
문서 검증 수치와 최종Git은 [인수인계](../../handoff/2026-09-09-spec-106-room-background-orientation-handoff.md)에 기록한다.
제품/시험/config변경0, unit/build/E2E/browser실행0, 실제서비스/사진/설치/예약자동화0.
