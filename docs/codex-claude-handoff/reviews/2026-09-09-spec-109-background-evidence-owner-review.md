# Spec109 — 불변 바이트와 방향 증거의 결속 조사·계약 검토

2026-09-09 / baseline `abdc191` / 동일 Codex 자체 검토. 제품 구현·시험은 NOT STARTED.
[계약](../../rebuild/specs/109-background-evidence-owner-contract.md).

## 확인한 로컬 근거

- [105 owner](../../../apps/mockup/src/room-placement/background-file.ts)의 createRoomBackgroundFileJob/createJob/complete:
  native 입력검사→FileReader→fixed buffer→104→같은view로Blob snapshot. takeBlob은 한 번만 인계한다.
  caller에게104결과와 별도 lease를 주지만 방향증거는 없다.104 성공 직후 snapshot을 만드는 비동기 틈 없는 구간이 존재한다.
- [108](../../../apps/mockup/src/room-placement/background-container.ts)의 inspectRoomBackgroundContainer:
  내부104와 단일profile107, frozen scalar PARTIAL/NOT_VERIFIED/decodeAllowed:false.
  입력 view는 사후변경 가능하므로108결과만 보관해서 원본 동일성을 증명할 수 없다.
- [106 비교](2026-09-09-spec-106-room-background-orientation-investigation.md) §6의 P1/P2는 당시 미채택 후보였다.
- [RG-3](../decisions/2026-09-08-rg3-room-background-input-policy-decisions.md)는 초과/미지원/미검증 거부다.
  이번에는 JPEG/PNG 지원이나 pixel 방향 허가 범위를 넓히지 않는다.
- [기존 실행기](../../../scripts/e2e-run.mjs)는 playwright test 전체 실행만 하며 인자를 전달하지 않는다.
  기존 전체 E2E의 spec018 PNG 출력과 보호 규칙을 피하려고 명령에 가짜 filter를 붙이지 않는다.

## 공식 출처 — 2026-09-09 본문 확인

| 출처·지위 | 확인한 내용과 한계 |
| --- | --- |
| [File API](https://w3c.github.io/FileAPI/#constructorBlob), W3C Editor's Draft 2026-08-23, §3/§3.1 | Blob은 불변 bytes를 나타내며 BufferSource로 구성할 때 bytes 사본을 만든다. draft 지위이며 모든 엔진의 물리 할당/GC 시점 보장은 아니다. |
| [HTML Standard §8.11.2](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#imagebitmap), WHATWG Living Standard | Blob 입력과 imageOrientation 기본from-image, 현재 enum은from-image/flipY. 과거none을 미회전 보장으로 재사용하지 않는다. 표준 읽기는 native8방향 픽셀 실측이 아니다. |
| [PNG3 §11.3.4.5](https://www.w3.org/TR/2025/REC-png-3-20250624/#eXIf), W3C Recommendation 2025-06-24 | 편집된 픽셀에 eXIf metadata가 더 이상 맞지 않을 수 있다. 독립적인 유효성 지식 없이 방향 정답으로 승격하지 않는다. |

정본에서 직접 확인한 위 사실과 아래 DENN 설계 판단은 구분한다. 실제사진·서비스·다운로드·설치·브라우저 실행0.

## P1/P2 비교 및 선택

| 항목 | P1:105 출력 재읽기 | P2:private view 검사 후snapshot |
| --- | --- | --- |
| 동일 byte 결속 | 소비자 안에서 같은Blob을 검사·사용해야 함 | 같은동기구간에서108과snapshot,쌍으로인계 |
| 명시 full-size 표현 장부 |105의N+N에 소비자N 추가:3N≤60Mbytes |읽기N+snapshotN:2N≤40Mbytes |
| 기존 코드 영향 |105 유지 가능,새 비동기reader/취소/수명 필요 |105 private실행부 확장과 기존API회귀 검증 필요 |
| 현재 판정 |미채택 |비연결 결속 계약으로 채택 |

N≤20,000,000이므로40M=2×20,000,000,60M=3×20,000,000. 실제 peak/GC/동시job 상한은 UNCONFIRMED.
P2는 bytes 복사를0으로 만들지 않는다. 새 entry가108을 호출하면 내부104가 실행되므로 외부104 중복 호출을 금지한다.
기존 entry는104만 사용하여 unknown APP1까지 새로 거부하는 하위호환 회귀를 막는다.
검사 성공과 native Blob snapshot 사이에 새 외부 callback seam은 도입하지 않는다.

## 성공의 의미와 남은 검증

lease.take()가 Blob과108결과를 한꺼번에 인계하는 것은 정상 모듈 내부에서 두 출처의 우발적 혼합을 줄이는 설계다.
악성 코드가 만든 `{blob,evidence}`를 인증하는 기능이 아니다. 미래 decoder는 이 record를 public 허가증으로 받지 않는다.
fake reader의 임의 bytes와 callerFile 일치까지 보증하지 않으며 신뢰된 포트 계약을 그대로 유지한다.

profile없음/tag없음/명시1/명시2..8/PNG eXIf는 모두 decodeAllowed:false다.
명시1도 픽셀decoder·부가metadata·지원환경 증거가 아니다.108은전체Exif graph나압축픽셀을검증하지 않는다.
이 단계에서 '허용판정' 조사 결론은 허가API를 아직 만들지 않는 것이다. 무검증 회전/기본값/자동변환0.

구현 후에도 별도 native8방향/메모리/브라우저결속/100·102/룸UI 통합은 NOT TESTED다.
native proof는 비정사각형 모서리 표식과 반전/정사각형,단일방향처리,늦은bitmap해제,동시admission을
별도 계약에서 검증해야 한다. 보호출력 없는 browser harness 실행범위도 그때 먼저 고정한다.

## 자체 계약 검토

기존 API 유지, P2 copy 장부, fixed private bytes와snapshot 순서, 쌍 인계·참조 해제, 실패/취소/late,
정확3파일 및 시험명령, 새허가0, native검증 분리까지 검토했다. 추가 Founder 선택 없음.
CONTRACT_REVIEW_PASSED는 문서 판정이며109 코드 PASS가 아니다. 구현은 아직0.
문서 링크/범위/보호SHA/Git의 실제 검증 결과는 아래 완료 기록에 남긴다.

문서 게이트 실측: 로컬 링크9/9,허용문서7/7,보호/별도dirty SHA22/22 동일,예상 밖 경로0.
총dirty29=기존22+문서7, diff--check/신규whitespace PASS,staged0,HEAD=origin abdc191·0/0.
Git global ignore 읽기 경고는 설정 변경 없이 기록한다. 제품/test/config 추가diff·실행0.
## 구현 완료 — 2026-09-09

코드 `fecb8a4`, 정확3파일. 별도 evidence factory와 내부고정모드로 P2 검사→snapshot→쌍take1회 구현.
기존 factory/결과는104만 유지하고 unknown APP1 회귀를 추가검증했다.108은내부104 포함1회, snapshot1회.
PARTIAL/NOT_VERIFIED/decodeAllowed:false·cancel/late/참조정리 유지.같은 Codex 자체검토 CODEX_PASSED,독립검수아님.
검증: targeted259=기존owner84+신규evidence93+container82,전체unit3201=3107+94(93신규+1회귀).
format/lint324파일·7프로젝트typecheck·2앱build·diff--check PASS. 초기TS2554 합성resizable생성타입은
Reflect.construct로고쳤고 전체gate재통과.순서가뒤집힌patch는미적용후다시정확적용했다.
customerJS FECAC548F3BD64B02873F5191E53EA8E2816F76CF609C648AAB67A108A3EE22A,
customerCSS 6CA8E14CA48C6202FD0440E421C03F75C3A4393FD251C5E53DCA20C79BCEED81,
adminJS B0A1F85F9271E4A929D2F6AB0F20BB0D0BFDADDA211533DDD675C8FB85711246 모두기존동일.
보호SHA22/22불변. E2E/nativebrowser는계약상실행0·PNG재생성0.실제decode/회전/사진/운영NOT TESTED.
다음은보호PNG를쓰지않는opt-in native결속시험계약부터이며같은승인재질문없이루틴을이어간다.
