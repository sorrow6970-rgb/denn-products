# 104 — 룸 배경 바이트·구조 사전 검사 계약

2026-09-08 / baseline cc0bc4c / rebuild/modern-studio.
DONE / CODEX_PASSED / LOCAL_VERIFIED — 코드420b2dc, 동일 Codex 구현·자체 검토, 독립 검수 아님.
최신 사용자 `응 다음작업 진행해줘 루틴으로`로 아래 신규6파일 구현·검증 착수 승인.
아래 계약 작성 당시 실행0/미착수 문구는 이력이다. 제품 UI/실제사진/운영 경계는 열지 않는다.

## 1. 목표 (WHY)

[RG-3=A](../../codex-claude-handoff/decisions/2026-09-08-rg3-room-background-input-policy-decisions.md)를
지키는 첫 순수 검사기를 정의한다. [103 조사](103-room-background-input-policy-investigation.md)의
기존 PNG 앞부분 검사·026 decode 성공을 룸 입력의 안전성 증명으로 재사용하지 않는다.
이 단위는 **이미 메모리에 있는 바이트의 구조·선언 크기 검사**다. 실제 파일 읽기/디코딩 owner가 아니다.
전체 룸 배경 기능의 완료가 아니라, 후속 owner가 사용할 수 있는 제한된 증거를 만든다.

## 2. 범위 (SCOPE / WHERE)

이번 문서 차례의 신규4문서: RG-3 결정 정본, 이104 계약,104 review,104 handoff.
103의 계약/review/handoff3문서는 승인·후속 링크만 정정한다. STATE/NEXT/CURRENT/live4문서를 동기화한다.
따라서 이전103 미커밋7문서에 신규4문서를 더한 **현재 누적11문서**다.

후속 구현 지시를 받은 때만 아래 신규 코드/시험6파일을 허용한다:

- apps/mockup/src/room-placement/background-input.ts
- apps/mockup/src/room-placement/background-input.test.ts
- apps/mockup/src/room-placement/background-png-envelope.ts
- apps/mockup/src/room-placement/background-png-envelope.test.ts
- apps/mockup/src/room-placement/background-jpeg-envelope.ts
- apps/mockup/src/room-placement/background-jpeg-envelope.test.ts

PNG/JPEG 파일은 app-local 내부 helper이며 외부 import 진입점은 background-input.ts 하나다.
기존 파일/배럴/026/098/100/102/PreviewComposer/Space/admin/packages/tests/e2e 수정0.
File/Blob/URL/Image/Canvas·browser adapter·React/UI·파일 선택기·기존 제품 경로 연결0.
Rules/config/manifest/lockfile/의존성 설치/운영/실제사진/서비스/배포/발행/삭제/예약자동화0.
보호 taste-v2/**·design/README·038·spec018PNG2·render/plan·AGENTS·pnpm-workspace 및
별도091handoff/roadmap 등 시작dirty22는 수정·복원·stage·commit0. 이번 문서 차례는 모든 시험 실행0.

## 3. 공식 근거와 보장 한계

모두 2026-09-08 확인. 공개 기술 문서만 열었으며 실제 이미지/서비스 endpoint를 요청하지 않았다.

| 근거 | 확인 범위 | 이 계약에서의 사용 |
|---|---|---|
| [W3C PNG Third Edition, 2025-06-24](https://www.w3.org/TR/2025/REC-png-3-20250624/), §4.9·5·11.2·11.3.4.5·11.3.6 | signature/chunk/IHDR/IEND, APNG, eXIf | 아래 PNG envelope 검사 근거. CRC는 압축 해제 유효성 증명이 아님 |
| [CCITT T.81 / ISO 10918-1, W3C 공개 사본](https://www.w3.org/Graphics/JPEG/itu-t81.pdf), Annex B.1/B.2 | marker/length, SOF/SOS, entropy byte stuffing | 오래된 기초 JPEG 규격임을 명시. 현대의 모든 JPEG 확장 지원을 주장하지 않음 |
| [W3C File API](https://www.w3.org/TR/FileAPI/), §3.2·3.3.1·4 | byte 단위 size, slice, File 불변 모델, 앱에서 설정 가능한 type | 후속 읽기 owner 설계 근거.104에는 File API 구현 없음 |
| [CIPA Standards](https://www.cipa.jp/e/std/std-sec.html), Exif3.1 항목 | 2026판 목록/발행 정보만 | [본문 진입 페이지](https://www.cipa.jp/std/documents/download_e.html?CIPA_DC-008-2026-E=)는 면책 동의 UI. 동의/다운로드0, 최신 본문 미취득 |

CIPA2019 공식 공개 PDF 열기도 도구 Internal Error로 실패했다. 이를 최신 EXIF 본문 확인으로 기록하지 않는다.
104에서 EXIF orientation tag를 추정 파싱하지 않는 이유다. 방향 적용·좌우 반전·브라우저 일치는 NOT VERIFIED.
공식 문서는 형식의 근거이며, 아래 DENN API/거부정책/4096 작업량 제한은 Codex 설계다.

## 4. 공개 API와 바이트 소유권 (WHAT / HOW)

`inspectRoomBackgroundInput(request: unknown): BackgroundInputResult` — 동기 순수 함수.
request는 `{bytes: Uint8Array, budget: {maxEdge: number}}`. 필드는 각각 한 번 안전하게 읽는다.
누락/throw/배열 request·budget/숫자문자열/비정수/비유한 값은 INVALID_INPUT.
maxEdge는 필수 양의 safe integer이며 최대40,000,000, 기본값/자동 보정 없음.
이는 호출자가 명시한 검사 상한이지 실제 decoder나 제품 UI의 승인된 기본값이 아니다.

bytes는 같은 realm의 표준 Uint8Array와 고정 길이 ArrayBuffer backing만 허용한다.
Proxy·가짜 typed array·subclass(Node Buffer 포함)·SharedArrayBuffer·resizable·detached buffer는 거부한다.
내장 getter로 실제 buffer/offset/length를 읽고 범위를 검사한다. 덮어쓴 .slice/.subarray/iterator를 호출하지 않는다.
모든 request/budget 외부 getter 처리를 끝낸 뒤 view 경계를 캡처하고 파싱 중 외부 함수/await0.
view의 byteOffset/byteLength만 검사하며 backing의 view 밖 바이트는 읽지 않는다.

전체 byte 복사·원본 mutation·원본 보유0. 동기 호출 동안 안정된 일반 buffer를 빌리고 결과에 scalar만 남긴다.
호출 뒤 원본을 바꿀 수 있으므로 이 결과는 immutable byte lease·digest·나중 decode용 인증서가 아니다.
별도 후속 owner가 동일 바이트를 소유하고 검증/소비를 결합해야 한다. raw bytes/URL/사진 metadata/log 반환0.

성공 결과는 readonly/frozen scalar record:

```text
{ok:true, kind:'preflight-only', format:'jpeg'|'png',
 byteLength, encodedWidth, encodedHeight, encodedPixels,
 orientation:'NOT_VERIFIED', decodeAllowed:false}
```

이름에 ready/decoded/validated-image를 사용하지 않는다. EXIF 없는 파일도 방향1로 추정하지 않는다.
실패는 `{ok:false,code}`만. 세부 byte/파일명/MIME/EXIF/SDK 예외/URL/식별자/원문 로그0.
import 시 I/O0, 어떠한 결과에서도 File/Image/Canvas/decode 호출0.

## 5. 검사 순서와 작업량

1. request/budget/실제 view 검증. 길이0은 INVALID_INPUT.
2. byteLength>20,000,000이면 BYTE_LIMIT. 전체 복사/형식 탐색0.
3. byte signature로 PNG 또는 JPEG helper 선택. 파일명/MIME은 API 입력에 없다.
4. 앞에서부터 한 방향으로 envelope를 순회한다. 부분 buffer·초과 offset·알 수 없는 구조는 실패.
5. header 치수는 양수 정수여야 한다. width>maxEdge 또는 height>maxEdge이면 EDGE_LIMIT.
   width>floor(40,000,000/height)이면 PIXEL_LIMIT. 곱은 이 검사 후 계산해 overflow를 피한다.
6. 종료 marker/전체 view 소비와 검사 완료를 확인한 뒤 preflight-only 결과를 반환한다.

Codex 작업량 제한: PNG chunk 또는 JPEG marker를 각 파일당 최대4096개(종료 포함)만 처리한다.
JPEG fill byte와 entropy byte는 marker 수와 별개로 총20,000,000 byte 안에서 단방향 순회한다.
CRC도 현재 chunk 한 번만 순회, chunk별 배열 보관/재귀/압축 해제/다시 처음부터 검색0.
다음 구조가4097번째면 SCAN_LIMIT. 거부 뒤 상한 상향·자동 재시도0.
4096은 실기기 시간 SLA가 아니라 유한 parser 작업량의 설계 한도다. O(n) 시간/O(1) 보조공간 목표를 코드로 검토한다.

## 6. PNG envelope

[PNG 근거 §5/11](https://www.w3.org/TR/2025/REC-png-3-20250624/).
8-byte signature 뒤 length/type/data/CRC 경계를 검사한다. 길이는 unsigned, 모든 덧셈 전에 남은 범위를 확인한다.
IHDR은 첫/유일/13-byte, 치수와 color-type/bit-depth 조합은 Table12, compression/filter=0, interlace=0/1.
PLTE는 길이/중복/색상유형/선행 순서, indexed형식의 필수 여부를 검사한다.
IDAT은 하나 이상 연속이어야 하며 data 합계는 양수. IEND는 유일/길이0/파일 끝이어야 한다.
모든 chunk CRC를 검증한다. acTL/fcTL/fdAT는 어느 위치든 ANIMATED_INPUT으로 거부한다.
unknown critical chunk는 UNSUPPORTED_STRUCTURE. chunk type은 ASCII 영문4개·reserved bit 유효성을 검사한다.
그 외 ancillary는 범위/CRC만 검사하고 내용 해석/문자열화/압축 해제0. eXIf도 방향 파싱0.
CRC/구조 통과는 IDAT 압축 스트림·색관리·EXIF·실제 pixel 검증이 아니다.

## 7. JPEG envelope

[T.81 Annex B](https://www.w3.org/Graphics/JPEG/itu-t81.pdf).
SOI로 시작하며 marker length는 자신2bytes를 포함하고 marker2bytes를 제외한다.
DENN 초기 검사 profile은 SOF0/SOF2, precision8, components1/3만. 다른 process/미지원 구조는 명시 거부한다.
단일 SOF의 길이8+3×components, component ID 중복/샘플링 인자/치수, SOS 길이6+2×components를 검사한다.
SOF sampling H/V는1..4, Tq는0..3. SOS components는1..SOF components, 중복 ID와 table selector>3은 거부한다.
SOS component는 SOF에 존재해야 한다. SOS 전에 SOF가 있어야 하며 한 개 이상의 scan을 요구한다.
entropy 중 FF00은 데이터, RST0~7은 restart, 나머지는 marker로 복귀한다. fill FF와 EOF를 안전 처리한다.
SOF 중복·DNL/치수0·hierarchical·두 번째 SOI·EOI 뒤 trailing bytes는 거부한다.
APP0~15/COM/DQT/DHT/DRI는 segment 범위 검사만; DRI length4. 다른 marker는 UNSUPPORTED_STRUCTURE.
RST는 entropy 안에서만 허용, DQT/DHT 등의 참조완결성과 progressive scan parameter 의미 검증은 제외한다.
APP 내부 thumbnail을 새 주 이미지로 탐색하지 않는다. EOI까지 순회하고 progressive 다중 scan을 허용한다.
table 내용/entropy 의미/색관리/APP EXIF는 검증하지 않는다. 모든 정적 JPEG의 지원 보증이 아닌 preflight profile이다.

## 8. 오류 우선순위와 검증 한계

공통 prefix `ROOM_BACKGROUND_`:

| code suffix | 조건 |
|---|---|
| INVALID_INPUT | API/view/예산 무효, 길이0, getter/내장 view 처리 예외 |
| BYTE_LIMIT | 파일 byte 상한 초과 |
| UNSUPPORTED_FORMAT | PNG/JPEG signature 불일치 |
| SCAN_LIMIT | 다음 구조 처리 전 작업량 초과 |
| MALFORMED_INPUT | 알려진 구조의 길이/순서/중복/CRC/치수0/종료 오류 |
| ANIMATED_INPUT | PNG animation chunk type 발견 |
| UNSUPPORTED_STRUCTURE | 알 수 없거나 profile 밖인 구조 |
| EDGE_LIMIT | 유효 선언 치수의 각 변 한도 초과 |
| PIXEL_LIMIT | 유효 선언 치수 면적 초과 |

순서는 §5가 우선. 구조별로 scan count→header 경계→animation/지원 여부→내용/CRC→치수 한도 순으로 검사한다.
치수 한도에서는 EDGE가 PIXEL보다 우선. 앞선 오류를 발견하면 뒤의 다른 오류를 찾아 재분류하지 않는다.
알 수 없는 예외를 success로 바꾸지 않는다. 압축 데이터가 불량해도 여기서 확인하지 않은 부분은 남을 수 있다.
그래서 성공은 decodeAllowed:false이며 RG-3의 '검증 불가 입력 표시 금지'를 해제하지 않는다.

## 9. 실제 파일·방향·취소·동시 자원의 후속 STOP 경계

```text
후속 파일 owner: size 검사 → bounded 동일 byte 소유
  → [104: 구조·선언 크기 preflight-only]
  → 방향/동일 byte/기기 예산 확인 → decode → 실제 치수·방향 재검사
  → 화면용 backing/합성/자원 회수 (모두104 밖)
```

104는 이미 받은 bytes 이전의 파일 할당을 막았다고 주장하지 않는다. 실제 owner는 File API size를
**전체 읽기 전에** 검사하고 slice/수신 길이/동일 바이트 소유권을 검증해야 한다. 가짜 port는 실제 File 증거 아님.
PNG eXIf와 JPEG APP1은 같은 바이트 offset 표현이라고 가정하지 않는다. EXIF tag/offset/충돌 처리는
공식 본문 근거와 1~8방향·반전·중복/잘못된 offset의 합성 시험 계약 전 구현0.
encodedWidth/Height를 orientation 적용 후 displayed 크기로 사용하지 않는다. 회전 이중 적용 금지.

입력 각 변의 실제 기본값, decoder 선택/화면 축소, 동시 배경+frame+output+옛 decode peak는 UNCONFIRMED.
40M×4=160,000,000bytes는 RGBA8 plane 하나의 가정식이지 실제 메모리 상한이 아니다.
104는 decode0/비동기작업0이므로 cancel API나 '물리 decode 즉시 중단' 보증을 만들지 않는다.
후속 owner에서 한 활성 작업·취소 정착·늦은 완료·파일 교체·dispose·재진입·동일 검사 바이트 소비를 검증해야 한다.
현재100 capture-first/102 lease API 변경0. 이 사전검사 결과를100에 연결하는 것은 별도 계약이다.
이 미검증 목록은104 순수 검사 구현을 막지 않지만 **실제 로딩/룸 UI 개방을 막는다**.

## 10. 검증 절차 (VERIFY)

아래는 후속 구현 게이트다. 이번에는 실행하지 않는다.

- Node 합성 Uint8Array만 사용. 실제 사진/원격 fixture/새 binary/의존성0.
- API: null/primitive/throwing getter·필드1회 읽기·cross-realm/subclass/Proxy/shared/resizable/detached 거부,
  offset view만 파싱·입력 mutation0·결과 scalar/frozen·raw/log/I/O0·import 부수효과0.
- byte: 0/20,000,000/20,000,001, 정확상한의 유효 envelope와 초과 signature 미검사.
- pixel: 8000×5000=40,000,000 허용,8000×5001=40,008,000 거부; maxEdge±1, edge/pixel 충돌 우선순위.
- PNG: 지원 depth/color 조합, CRC 오류, truncation 각 필드, oversized length, IHDR/PLTE/IDAT/IEND,
  APNG3chunk의 전후위치/단일frame 신호 거부, unknown critical/ancillary,4096/4097, trailing 데이터.
- JPEG: baseline/progressive·여러 SOS·FF00/fill/RST·truncated length·SOF/SOS 연결,
  미지원 process·SOF중복·DNL·EOI누락/뒤바이트·APP 내부 marker 미탐색·4096/4097.
- orientation/압축 의미 미검증을 테스트명/결과에 고정한다. 임의 'decode 성공' mock으로 승인 승격0.
  작은 envelope 합성 데이터가 실제 decoder에서 성공한다고 주장하지 않는다.

명령: `pnpm exec vitest run apps/mockup/src/room-placement/background-input.test.ts apps/mockup/src/room-placement/background-png-envelope.test.ts apps/mockup/src/room-placement/background-jpeg-envelope.test.ts`,
`pnpm exec tsc --noEmit -p apps/mockup/tsconfig.json`, `node scripts/check.mjs`, `node scripts/e2e-run.mjs`.
기존 [package scripts](../../../package.json)·[unit include](../../../vitest.config.ts)·[E2E runner](../../../scripts/e2e-run.mjs) 사용, config 변경0.
canonical 기존 spec018PNG2 재생성은102에 명시된 기존 예외만 유지: hash 보고·복원/stage/commit0.
그 외 protected/증거 변화 또는 flaky/잔류/설치 필요는 STOP. 실제서비스/live/emulator 시험 금지.

신규 모듈은 제품 import0이므로 고객/admin entry·고객 CSS hash 불변을 gate로 삼는다.
정확6코드 경로, 제품 밖추가diff0, 기준dirty22 SHA(상기PNG 예외별도), diff--check, stage/포트/temp 확인.
DONE은 targeted/typecheck/check/canonical·경계검사 PASS와 실제 결과 기록 후에만 가능하다.
과거102의200/2745/281을104 결과로 복사하지 않는다. runtime/전체사진/실기기 검증은 별도로 NOT TESTED.

## 11. 위험과 계약 자체 검토

한계: header의 선언 크기는 실제 decoder 동작/파일 전체 유효성을 증명하지 않는다. 순수 parser를
업로드 보안 검사기나 실제 사진 허가로 오용하는 것이 가장 큰 위험이다. 이 때문에 성공 shape에
preflight-only·orientation NOT_VERIFIED·decodeAllowed:false를 고정하고 제품 import를 허용하지 않는다.
EXIF/동시자원 미확정은 숨기지 않으며 추가 구현을 이번 범위에 섞지 않는다.
[계약 검토](../../codex-claude-handoff/reviews/2026-09-08-spec-104-room-background-input-preflight-contract.md).

### QUESTIONS

RG-3는 A 승인으로 CLOSED.104 순수 검사 범위의 새 Founder 질문 없음.
실제 file/decode/방향/예산 기본값은 §9의 후속 계약 조건이며 승인됐다고 해석하지 않는다.

### DONE (Codex)

## 구현 완료 — 2026-09-08

최신 사용자 루틴 착수 승인으로 정확6파일 구현·검증 완료, 코드 `420b2dc`.
typed-array/backing 내장 getter·실제 brand·offset view, PNG CRC/구조와 JPEG envelope,
상한/오류 우선순위·preflight-only/방향NOT_VERIFIED/decodeAllowed:false를 고정했다.
byte 복사/보유/변경·새 파일읽기·decoder·기존 제품 import/모듈 변경0.

- targeted96/96: public36 + PNG36 + JPEG24. JSON reporter로 파일별 집계도 대조했다.
- apps/mockup targeted typecheck PASS, 최종 `node scripts/check.mjs` PASS:
  format/lint315파일·7프로젝트 typecheck·unit2841/2841(기존2745+신규96)·양앱 build.
- canonical `node scripts/e2e-run.mjs`: Chromium281/281,52.2초. 신규 E2E0, 기존 회귀만 검증.
  이는 새 preflight가 browser/실제사진을 검증했다는 뜻이 아니다.
- node24.18.0, cached Corepack pnpm11.15.1 확인. PATH상의 pnpm은11.19.0이었다.
  `corepack pnpm exec`3개 명령은 도구 이름 해석 실패로 실행 전 종료. 설치 없이 기존
  node_modules/.bin의 biome.CMD2.5.5/vitest.CMD4.1.10/tsc.CMD7.0.2로 같은 검사를 실행했다.
  최종 aggregate/canonical 명령은 수정 없이 정상 실행했다. 환경/manifest/lockfile 변경0.
- 최초 targeted95/96의 실패는 테스트가 URL 생성자 전체를 mock하여 module loader까지 막은 문제였다.
  URL의 createObjectURL/revokeObjectURL만 계측하도록 테스트를 정정했다. native decode mock 승인0.
  resizable ArrayBuffer 생성자의 현 TS lib 표기 오류는 테스트 Reflect.construct로 수정했다.
- 최초 build에서 고객 CSS가48bytes 증가했다. 새 테스트 설명의 Tailwind 후보 단어를 제거한 후
  고객CSS와 양앱entry의 시작 hash가 모두 일치했다. CSS/설정/실제 제품 UI 수정0.
  기존 500kB chunk 경고는 남아 있으며 경고 한도/분할 설정을 바꾸지 않았다.
- customer JS345,362bytes SHA256 `FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A`;
  customer CSS22,675bytes `6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81`;
  admin JS294,873bytes `B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246`.
- 보호/별도dirty22 중 PNG 예외2를 제외한20/20 SHA 동일. 기존 canonical이 재생성한 PNG 최종:
  desktop `D6D12495B5264B002803A4EA48AA66162362B16A6C730B02BC577DECC1B97DAE`;
  mobile `5043D55564D51A7F577EDBC520C2062C3FDA8FF277FE9B7C105E3FB8B0D135BD`.
  복원/stage/commit0. 그 외 기존 evidence는 Git 추가diff0. 모든 별도dirty22는 커밋에서 제외했다.
- 포트4183/4184/4185/8080/9099/9199 listener0, 이번 temp denn-e2e-dwP3v3 제거 확인.
  diff--check PASS, 코드 커밋6경로 확인. 문서11경로는 분리 커밋/정상push 후 최종 관계를 기록한다.

실제File/사진·EXIF 방향·decoder·동일byte owner·동시메모리·100/102 연결·룸UI는 NOT TESTED.
전체리빌드 실측완료율은 확인불가, 이번 고객화면 변화0. 다음 후보는 bounded file owner의 계약 검토이며
새 스펙/제품 API를104 안에 추가하지 않는다. 아래 계약 문서만 완료 기록은 이전 차례 이력이다.

계약 문서 작성·자체 검토만 완료. 구현 NOT STARTED, unit/build/E2E/browser 실행0.
이번 문서 결과는104 review/handoff와 STATE/NEXT/CURRENT/live에 기록한다.

문서 검증 실측: 대상7문서의 로컬 링크/지정라인43/43, 누적 허용11문서만 변경, 시작dirty22/22 SHA256 동일. git diff --check 및 신규문서 whitespace PASS. HEAD=origin 추적cc0bc4c·ahead/behind0/0, staged0, commit/push/fetch0. Git 전역 ignore 경로 접근 경고는 있었으며 설정 우회/변경0. 제품/시험/브라우저 실행0.
