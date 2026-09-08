# Spec103 — 배경 사진 입력정책·디코딩 전 예산 조사 결과

2026-09-08. 기준 cc0bc4c, 로컬 소스 정적 조사. 구현·실제 사진·브라우저/시험 실행0.
[103 조사 계약](../../rebuild/specs/103-room-background-input-policy-investigation.md).
최신: [RG-3=A 승인](../decisions/2026-09-08-rg3-room-background-input-policy-decisions.md)을 받았다.
[104 계약](../../rebuild/specs/104-room-background-input-preflight-contract.md) 작성·검토까지 완료, 구현0.
아래103 조사 당시 미채택 문구/7문서 검증은 이력이다. 승인한 입력정책과 미검증 decoder/방향/기기 예산을 구분한다.

## 1. 결론과 앞선 조사 보충

다음 배경 모듈에는 **형식·바이트·치수 사전 검사와 세대별 소유권**이 필요하다.
026 로더를 직접 호출하거나 PNG proof 준비기를 그대로 가져오는 것으로는 그 계약이 충족되지 않는다.
후속 구현에 앞서 최초 지원형식과 입력 초과 처리의 RG-3 선택을 받는다. 이번 제품코드 변경0.

중요한 추가 근거: [상위 성능 결정 §4/5](../decisions/2026-07-21-performance-and-resource-budgets.md#L36)는
초기 파일20MB·이미지40MP·화면용 긴변2048–2560px·DPR 초기상한2·일반 preview 약8MP 목표를 이미 적었다.
[101 §6](2026-09-07-spec-101-room-browser-adapter-boundary-investigation.md)의 수치 비교표는 이 정본을
빠뜨렸다. **관련 상위 수치정책 자체가 없다는 의미로 읽으면 잘못이다.** 이전 문서를 삭제/변경하지 않고 여기 보충한다.
다만 이 정책은 실제 샘플 검증 후 조정을 요구하고, 룸의 정확 byte 단위/경계·입력 긴변·동시메모리·
모든 기기의 안전 수치를 확정한 문서는 아니다. 목표와 실측을 구분한다.

## 2. 현재 코드의 실제 검사 순서

| 경계 | 읽은 근거 | 확인된 범위 / 룸에 그대로 쓰지 못하는 이유 |
|---|---|---|
| 고객 선택 UI | [Composer L253](../../../apps/mockup/src/preview/PreviewComposer.tsx#L253) | accept=image/* 문자열. 바이트 검증 코드가 아니며 룸 지원형식 결정도 아님 |
| 고객 026 owner | [load L169](../../../apps/mockup/src/canvas/localImageBinding.ts#L169), [onload L225](../../../apps/mockup/src/canvas/localImageBinding.ts#L225) | object 여부→URL→Image→src→onload에서 양수 natural size. size/MIME/헤더/픽셀곱 상한 검사 없음 |
| 026 취소 | [clear/dispose L266](../../../apps/mockup/src/canvas/localImageBinding.ts#L266) | 세대 무효화·handler 분리·URL revoke·참조 제거. 네이티브 decode 완료/물리 메모리 반환 보증 아님 |
| 운영자 proof owner | [load L189](../../../apps/admin/src/space-v2/browser-proof-draft.ts#L189) | readBytes 전체 수신→복사→byteLength 상한→Blob/URL/Image. 읽기 전 최대 byte 제한기가 아님; 고객에서 admin 모듈 import 금지 |
| PNG proof 후보 | [한계 L11](../../../apps/admin/src/space-v2/proof-asset-candidate.ts#L11), [검사 L145](../../../apps/admin/src/space-v2/proof-asset-candidate.ts#L145) | signature·첫 IHDR·치수만 확인. CRC/IDAT/IEND/실제 decode와 애니메이션 불변성 검증은 없음. UUID/경로/digest도 룸 목적과 다름 |
| proof 치수 시험 | [L131](../../../apps/admin/src/space-v2/proof-asset-candidate.test.ts#L131) | 7×2,147,483,647 후보를 허용하는 시험. 스키마 치수 검사가 작은 decoder 예산이라는 뜻이 아님 |
| Space viewer | [replay L198](../../../apps/mockup/src/space-v2/replay-controller.ts#L198), [decoder](../../../apps/mockup/src/space-v2/browser-png-decoder.ts) | MIME/길이/digest 대조 후 decode, 이후 증명 치수와 일치 검사. 이는 저장 proof의 동일성 계약이며 임의 룸 사진의 정책이 아님 |
| frame 사본 | [102 입력 L120](../../../apps/mockup/src/room-placement/frame-snapshot.ts#L120), [할당전 L155](../../../apps/mockup/src/room-placement/frame-snapshot.ts#L155) | scale/maxEdge/maxPixels 명시입력, ceil backing 검증. 이미 decode된 frame source에서 시작하므로 배경 decode를 제한하지 않음 |

위 미확인은 해당 파일 검사 범위를 읽은 결과다. 전체 저장소에 이미지 관련 검사가 전혀 없다는 주장은 아니다.
PNG 후보의 33 bytes는 코드상 8+4+4+13+4이며, 완전한 정적 PNG 판정에 충분하다는 뜻이 아니다.

## 3. EXIF·형식·내용 동일성

[EXIF 시험 L1417](../../../tests/e2e/mockup-preview.spec.ts#L1417)은 Orientation=6을 넣은 합성 JPEG의
크기를 기록한다. [L1487](../../../tests/e2e/mockup-preview.spec.ts#L1487)은 20×40(적용)과40×20(미적용)을
모두 허용한다. **기존 시험 PASS는 룸 사진이 항상 같은 방향으로 표시된다는 증거가 아니다.** 이번 재실행0.

후속 후보:

- 정적 JPEG/PNG로 한정할지, 추가 형식/애니메이션 처리를 지원할지 먼저 결정한다.
  파일명/MIME만 통과시키거나 첫 프레임을 조용히 정적 사진으로 채택하는 것은 제외 후보다.
- 원본 파일 바이트에서 확인 가능한 형식/치수/방향 metadata와 실제 decode 결과를 구분한다.
  방향을 처리하는 주체는 하나여야 하고 EXIF를 브라우저와 앱이 중복 적용하면 안 된다.
  어느 방향을 정본으로 삼을지, 1~8 방향/좌우 반전의 정확한 판정은 후속 계약·합성 시험 전 NOT VERIFIED.
- 사전 검사의 바이트와 decode에 전달하는 바이트가 같아야 한다. 새 파일 재읽기 결과를 무검사로 전달하지 않는다.
  bounded 읽기/스냅샷·복사 비용도 예산에 포함한다. 기존 admin의 전체파일 복사를 무조건 재사용하지 않는다.
- byte 상한 안에 있더라도 header 탐색량·segment/chunk 수·offset 산술·미지원 구조를 제한해야 한다.
  필요한 metadata를 한도 내 확인하지 못하면 거부하는 후보이며, 한도를 늘려 몰래 재시도하지 않는다.

실행 가능한 JPEG/PNG/애니메이션 parser의 세부 형식·API는 이 저장소 조사만으로 확정하지 않았다.
후속 계약 전 해당 공식 표준 확인이 필요하다. 기존 PNG 앞부분 검사에서 애니메이션/전체유효성 증명을 추론하지 않는다.

## 4. 예산을 나누는 방법 — 목표와 하드 제한은 별개

| 종류 | 기존 근거 | 후속 룸 후보 / 미확정 |
|---|---|---|
| 압축 파일 byte | 상위 초기20MB | RG-3=A는 1..20,000,000 bytes로 정확화 제안. 기존20MiB-1로 암묵 치환하지 않음 |
| 이미지 pixel 곱 | 상위 초기40MP | RG-3=A는 선언치수와 decode 후 치수 모두 W×H≤40,000,000 제안. 안전한 기기 실측 한도라는 뜻 아님 |
| 입력 각 변 | 상위 문서에 룸 전용 hard maxEdge 없음 | 긴 세로/가로 예산과 parser 범위를 후속 계약에서 명시; 100의1,000,000을 적용하지 않음 |
| 화면용 배경 | 상위 긴변2048–2560 통상 다운샘플 | 원본 허용 검사와 별도. 정확 backing 정책/scale·alpha 처리는 후속 계약. 원본 변환/저장 승인 아님 |
| frame/output backing | 상위 preview 약8MP 목표, 102 필수예산 | 각각 할당 전에 확인. 약8MP를 모든 canvas 합계 또는 device 안전상한으로 읽지 않음 |
| 동시 보유 | 상위 반복 메모리 검사 요구 | 압축바이트·원본 decode·축소배경·frame 사본·최종출력·임시복사·옛 decode 포함. 실제 peak UNCONFIRMED |

20MB의 후보는 20×1,000,000=20,000,000 bytes다. 기존 proof의 20×1,024×1,024−1=
20,971,519 bytes와 971,519 bytes 차이 난다. 둘 중 무엇을 쓸지 암묵 결정하지 않는다.
40MP는 여기서 40×1,000,000 pixels로 정확화하는 제안이다.

RGBA8 plane만 가정하면 40,000,000×4=160,000,000 bytes, 즉
160,000,000÷1,048,576≈152.59 MiB다. 이 산술은 **decoded plane 하나의 가정치**이며
브라우저/decoder 내부형식·GPU·압축원본·복사·frame/output은 빠져 있다. 실제 peak/안전한 메모리 보장은 아니다.
`4×(배경pixel + framepixel + outputpixel)`도 각 plane이 RGBA8이라는 가정식일 뿐 전체상한이 아니다.
따라서 초기40MP 정책이 있다는 이유로 실제 기기 검증 없이 사진 선택을 개방할 수 없다.

## 5. 검사 시점과 실패표 (후속 요구, NOT TESTED)

```text
source/current 확인 → 파일 byte 및 bounded 읽기 → 형식/치수/정책 preflight
 → 같은 검사 바이트의 per-job decode → decoded 치수/방향/current 재검사
 → 화면용 배경·frame/output 각각 할당예산 확인 → 두 자원 사용권 확인 후 합성
```

이 그림은 100의 capture-first 순서를 바꾸는 승인 아니다. 파일 preflight를 prepare 전 단계로 둘지,
100 port 안에서 수행할지는 부분자원 정리/취소 계약을 대조한 뒤 정한다. 100/102 수정0.

| 실패 | 요구할 동작 | 보장하지 않는 것 |
|---|---|---|
| file size 초과/무효 | 전체읽기·URL·Image·decode0 | 악의적인 가짜 file-like의 size 주장만으로 실제 byte량 증명 |
| 읽기 결과 길이 불일치/변경/취소 | 스냅샷 폐기, decode0 | 이미 수행한 I/O·할당을 되돌렸다는 주장 |
| 미지원·검증 불가·header 치수 초과 | decode0, 고정 오류 | 전체 파일/네이티브 decoder 취약점 검증 |
| header 통과, decode 치수/방향 불일치 | ready/합성0, 소유자 정리 | decode 이전 메모리 peak 방지 |
| 오래된 decode가 늦게 완료 | 이전 작업 결과 폐기, 새 작업 상태/자원 불변 | URL revoke로 물리 decode가 즉시 멈춤 |
| 화면용 축소/output 예산 초과 | 새 backing 할당0, 원본과 기존 사용권 보존/정리는 별도 계약 | 초과 원본을 자동축소해서 허용으로 전환 |

하나의 논리적 준비 작업만 허용하는 것과 이전 네이티브 decode가 실제로 끝났다는 것은 다르다.
취소 정착/늦은 callback·재진입·연속 교체·실기기 반복 메모리는 후속 검증이 필요하다.

## 6. Founder 결정 — RG-3 (A APPROVED; 아래는 조사 당시 선택지)

**A 권장 — 첫 룸 배경은 정적 JPEG·PNG, 제한 초과/미지원/검증 불가는 명시 거부.**

- 초기20MB 정책을 정확히20,000,000 bytes 이하,40MP를40,000,000 pixels 이하로 적용하는 후보다.
- GIF/애니메이션 PNG/WebP/HEIC/SVG 등 추가 형식 및 자동 형식변환은 이번 첫 단계에서 제외한다.
  이는 해당 형식이 기술적으로 불가능하다는 판단이 아니라 첫 제품 지원범위를 좁히는 선택이다.
- 초과 입력을 몰래 줄여 통과시키지 않는다. 허용된 입력의 화면용 다운샘플은 상위 정책에 따른 별도 단계다.
- 후보 승인 후에도 parser 공식 근거/방향/입력변/동시자원/취소/예산 테스트의 **구현 계약부터** 작성한다.
  새 모듈은 룸 전용으로 분리하고 기존 고객 사진 선택기·admin·Space 정책을 바꾸지 않는다.
- 실제 기기 안전 수치·룸 UI 개방·운영/업로드/발행·신규 의존성 승인은 포함하지 않는다.

**B — 첫 단계부터 추가 형식 또는 자동 변환이 필요하면 요구 형식과 방향/손실 허용부터 별도 조사.**
새 decoder/변환 의존성 또는 넓은 format parser가 필요할 수 있지만 설치/구현 승인은 아니다.
A 채택/B 미채택. 정확 수치의 상향·후속 변경은 성능 결정의 근거/승인 절차를 따른다.

## 7. 후속 최소 후보·검증 상태

다음 후보 파일은 apps/mockup/src/room-placement/background-input.ts 및 background-input.test.ts의
순수 preflight부터다. bounded reader/정적형식/방향 처리에 필요한 별도 파일은 후속 계약에서 정확히 열거한다.
지금 파일 생성0. browser-preparation/source producer/UI/100 API는 함께 확장하지 않는다.
신규 패키지/보호 render plan/공유PNG 모듈 이동/기존 admin 또는 Space import는 허용하지 않는다.

후속 시험 후보: 경계±1 byte/pixel, 거짓 MIME, truncated header/offset overflow, 탐색한도,
애니메이션/방향 불명, 선언/decoded 불일치, 전후 같은 바이트, source교체/취소/늦은완료, 할당/로그0.
fake는 호출순서를, 합성 browser는 허용된 decode/픽셀을 증명할 뿐 장치 전체 안전성을 대신하지 않는다.

이번은 문서 조사만 완료. 문서 검증은 103 DONE/handoff에 기록한다. 제품/시험/브라우저 실행0,
이전102의 unit2745/Chromium281은 이번103 실행 실적이 아니다. 전체실측완료율은 확인할 수 없다.
최신 대화의 남은30~50스펙은 거친 계획 추정이며 완료 기준/범위 확정표가 아니고 이번에 차감하지 않는다.

## 8. 문서 자체 검토 결과

DOCUMENT_REVIEW_PASSED(동일 Codex). 상위정책/룸 후보/미검증을 분리하고 기존 PNG·EXIF 한계를 대조했다.
문서 검증 실측: 신규3문서 링크/지정라인23/23, 시작dirty22/22 SHA256 동일, 정확 허용7문서만 변경, git diff --check PASS. 산술20,000,000/20,971,519/971,519 bytes와RGBA8 가정152.587890625 MiB 대조. HEAD=origin 추적cc0bc4c·0/0, staged0, commit/push0. 제품/시험/브라우저 실행0.
