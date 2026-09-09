# 118 — 비연결 방향 metadata 부재 검사

최종 DONE/CODEX_PASSED(동일Codex): 코드d543d8d+문서a22e494 일반push 성공,HEAD=origin a22e494·0/0.
보호23·번들3 SHA불변,정확10파일만 전송. 이번 최종기록1회 후 Git확인하며 아래 전송차단은 과거 이력.

전송 승인 해소(2026-09-09): 사용자 `승인할게`는 코드d543d8d+문서8개 및 최종기록의
기존GitHub/rebuild/modern-studio 일반전송 승인이다. 아래 BLOCKED_TRANSFER는 승인 전 이력.
정확범위/보호SHA 재확인 후 문서전송만 처리하며 이번 제품코드 추가변경0.

2026-09-09 / 기준 HEAD=origin8a10fe6 / CONTRACT_REVIEW_PASSED (동일 Codex 자체 검토).
[PG-1=A](../../codex-claude-handoff/decisions/2026-09-09-pg1-background-direction-absence-decisions.md),
사용자의 기존 scoped 구현·검증 루틴에 따라 수행한다. 독립 검수가 아니다.

## 목표 (WHY)

`Exif 없음`을 전체 metadata 부재로 오인하지 않고, PG-1의 저장 픽셀 기준을 적용할 수 있는
엄격한 컨테이너 부분집합만 식별한다. 이번 결과는 표시 허가나 이미지 전체 유효성 증명이 아니다.

## 범위 (SCOPE / WHERE)

정확 코드2개만 신규 작성:

- apps/mockup/src/room-placement/background-metadata-absence.ts
- apps/mockup/src/room-placement/background-metadata-absence.test.ts

문서8개: 이 spec, PG-1 결정, 118 review/handoff, STATE/NEXT/CURRENT/live.
104~117 구현/시험, barrel, 기본 앱, UI, fixture, E2E runner/config, packages, Rules, package/lock,
보호22 및 debug.log는 변경하지 않는다. 새 의존성/실사진/운영/배포/예약 자동화0.
레거시·시안 공간·인쇄·카카오·Firebase 계약 모두 불변.

## 구현 지시 (WHAT / HOW)

`inspectRoomBackgroundMetadataAbsence(request: unknown)`의 입력은 `{bytes, budget:{maxEdge}}`.
caller의 bytes/budget/maxEdge를 각1회 읽고 plain local record로104를1회 호출한다.
104가 성공한 같은 고정 ArrayBuffer 범위에 intrinsic getter로 새 Uint8Array view를 만든다.
caller method 호출/전체 복사/보관/await/Blob/FileReader/decoder/DOM/network0.
104의 타입·byte·edge·pixel·구조·CRC·4096 scan 검사를 보존한다. 추가 walk도4096 상한이다.

`core-only-v1`:

| 컨테이너 | 부재 근거로 인정하는 정확 범위 | 그 외 처리 |
|---|---|---|
| PNG | IHDR, PLTE, IDAT, IEND만; 순서/CRC는104 검증 | 모든 ancillary/eXIf/APNG·unknown 거부 |
| JPEG |104의 SOI/EOI/SOF0/SOF2/SOS/DQT/DHT/DRI, entropy stuffing/restart | APP0~APP15 및 COM 모두 거부 |

104에 unknown marker가 추가돼도 자동 허가하지 않도록 JPEG도 명시 allowlist를 쓴다.
전체 컨테이너를 끝까지 걷고, 첫 SOS/IDAT 뒤에 나온 metadata도 거부한다.
entropy/IDAT/coding segment payload의 문자열은 metadata 위치로 검색하지 않는다.
PNG iCCP/tRNS 및 JPEG APP0/JFIF 등 유효한 입력도 좁은 부재 증명 대상에서는 제외된다.
유효한 metadata를 손상 파일로 분류하거나 파일에서 제거하지 않는다. 일반 사진 허용률은 UNCONFIRMED.

성공 frozen 결과:
`{ok:true,kind:'metadata-absence-evidence',format,byteLength,encodedWidth,encodedHeight,
encodedPixels,metadataPolicy:'core-only-v1',orientationBasis:'encoded-pixels',
validation:'METADATA_ABSENCE_ONLY',decodeAllowed:false}`.
오류 frozen `{ok:false,code}`:104 오류 그대로, metadata/명시 부분집합 밖은
`ROOM_BACKGROUND_METADATA_UNVERIFIED`. raw message/bytes/metadata/파일명 노출0.
이는 caller 위조 방지 토큰이나 immutable lease가 아니다. 이후 bytes 변경에 대한 보증도 없다.
Huffman/deflate/pixel 전체 검증은 하지 않는다. native decoder 허가/API 연결은 후속 정확 계약이다.

## 검증 절차 (VERIFY)

- 합성 unit: core PNG/JPEG 성공·frozen/decodeAllowed:false·입력 비변경.
- APP16종/COM 및 PNG ancillary 각각 앞/뒤 위치 거부, Exif tag 없음/1/손상도 부재로 허가0.
- PNG PLTE, JPEG progressive/multiple scan/stuffing/restart/fill, payload 속 가짜 metadata 문자열.
- CRC/잘림/EOF 이후 잔여/애니메이션/byte·edge·pixel·scan 한도 거부.
- getter1회·throw 안전화·범위 view·shadow getter·shared/resizable/detached/proxy 거부.
- 입력과104를 합성 spy로 대조해104 1회·기존108 부재와 차이를 검증한다.
- targeted: `node node_modules/vitest/vitest.mjs run apps/mockup/src/room-placement/background-metadata-absence.test.ts apps/mockup/src/room-placement/background-container.test.ts`.
- 전체 `node scripts/check.mjs`; 정확 diff/보호23개 및 고객JS/CSS/adminJS SHA 비교.
- 기본 앱/브라우저 호출 경로 변경0, production 번들 동일 조건에서 E2E 신규 실행은 불필요.
  native/실사진/실기기 NOT TESTED로 남긴다. 기존116 232PASS/14FAIL과117 E2E9는 과거 실측이며
  이 unit 결과로 지원 게이트를 PASS로 바꾸지 않는다. 보호PNG를 쓰는 전체E2E 실행0.
- 실패 시 in-scope 재현 가능한 보완만. 게이트·scope·권한 blocker는 STOP, stage 강행0.

## 위험 (RISK) / 다음 경계

현재 분류기는 매우 좁다. 동일 bytes+Blob 결속과 실제 decode 결과 치수/자원 해제가 구현되기 전
표시 gate를 열지 않는다. 일반metadata 허용·UI 연결은 별도 계약이며 PG-1 재승인 질문은 불필요하다.
기존모듈을변경하지않아 신규 비연결2파일을 사용하지 않는 것이 롤백 경계다.

### QUESTIONS

현재 비연결 부재 검사에는 새 Founder 선택 없음. 완전한 사진 유효성/전체metadata 의미/실기기 상한은
증명 범위 밖이며 허가로 승격하지 않는다.

### DONE (Codex) — 2026-09-09

코드d543d8d,신규2파일. CODEX_PASSED (동일 Codex 자체 검수,독립검수 아님).
targeted127=신규45+108회귀82,전체check3358=3313+45 PASS;format/lint341·7typecheck·2build.
초기check의 테스트용 ArrayBuffer 옵션 타입 오류를 같은2파일 범위에서 수정하고 재검증했다.
보호/별도23 및 번들3 SHA불변,정확코드2/문서8,diff--check PASS. 실제사진/UI/native/E2E 새실행0.
[검토 상세](../../codex-claude-handoff/reviews/2026-09-09-spec-118-background-metadata-absence-review.md).
Git 원격전송은 별도 실제 결과로 기록한다. 아직 다음스펙 제품코드를 시작한 것은 아니다.

최종: 문서8개 commit/push가 실행 전 권한거절. 로컬검증 CODEX_PASSED,전송 BLOCKED_TRANSFER.
HEADd543d8d/origin8a10fe6·1/0,staged0. 정확새payload의GitHub 직접전송 승인 전 우회/다음구현0.
