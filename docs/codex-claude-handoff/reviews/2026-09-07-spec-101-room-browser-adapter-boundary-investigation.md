# spec101 — 룸 browser adapter 구현 전 경계 조사 결과

2026-09-07. 기준85136b1. DOCUMENT DONE / DOCUMENT_REVIEW_PASSED (동일 Codex).
[조사 범위](../../rebuild/specs/101-room-browser-adapter-boundary-investigation.md).
로컬 소스의 정적 조사다. 아래 새 구조는 후보이며 구현·UI 연결 승인이 아니다.

## 1. 결론: 재사용할 것은 렌더 실행기, 분리할 것은 소유권과 정책

100은 준비 작업의 취소·세대·자원 해제 시도를 구현했지만 실제 source producer나 drawable 전달은 없다.
따라서 `readPrepared()`의 크기 또는 `getState()==ready`만으로 그리기 API를 만들 수 없다.
[공개 타입](../../../apps/mockup/src/room-placement/preparation.ts#L20),
[admission](../../../apps/mockup/src/room-placement/preparation.ts#L128),
[aggregate](../../../apps/mockup/src/room-placement/preparation.ts#L229),
[현재성 조회](../../../apps/mockup/src/room-placement/preparation.ts#L363)가 직접 근거다.

최소 다음 후보는 **독립 frame snapshot의 별도 계약**이다. 같은 final plan을 동기 실행하는 포트와
명시적 할당 예산·실패 출력 폐기·release 이후 접근 거부를 먼저 정한다. 배경 사진 로더/선택 UI까지
한 번에 묶지 않는다. 기존 print exporter·surface·slot owner를 수정하거나 호출해 우회하지 않는다.
실제 browser 실행/픽셀 확인은 다음 계약에서 정확한 합성 harness 범위를 먼저 승인해야 한다.

## 2. source identity는 어디서 만들어야 하는가

| 현재 코드 | 확인된 사실 | 후속 책임 후보 |
|---|---|---|
| [Composer geometry L299](../../../apps/mockup/src/preview/PreviewComposer.tsx#L299) | projection 성공만 geometry로 남고 실패는 null | source producer는 frame 성공 geometry와 final plan을 같은 확정 입력 묶음에서 읽어야 함 |
| [final build L616](../../../apps/mockup/src/preview/PreviewComposer.tsx#L616) | art/slot/폰트 gate, probe 다음 final plan. dependencies에는 색·문구·transform·폭·viewport 등 포함 | `built.plan`과 해당 bindings/owner 세대의 변경은 새 opaque source token; probe/frameTrialRef는 증명 아님 |
| [bindings L595](../../../apps/mockup/src/preview/PreviewComposer.tsx#L595) | 복수 owner lookup의 조합, 픽셀 복사 아님 | 같은 render의 plan/bindings를 동기 캡처하며 원본 owner는 빌리기만 함 |
| [surface hook L68](../../../apps/mockup/src/canvas/usePreviewCanvasSurface.ts#L68) | effect가 plan/bindings ref를 갱신하고 draw 요청 | 이 ref/ready를 룸 source 정본으로 삼으면 React 입력과 surface 적용 사이를 혼동함 |
| [Browse key L109](../../../apps/mockup/src/browse/BrowseFlow.tsx#L109), [local hook L34](../../../apps/mockup/src/canvas/useLocalImageBinding.ts#L34) | 선택 교체/unmount/StrictMode에서 owner 수명 변경 | owner incarnation도 source 식별에 포함, 문자열 imageRef 재사용과 구분 |
| [clock L972](../../../apps/mockup/src/preview/PreviewComposer.tsx#L972), [projection L590](../../../packages/shared/src/catalog/preview/project.ts#L590) | clock은 DOM층; 필드 없음은 no-clock이 아님 | 성공한 frame geometry의 clockPreview===null만 허용; case/실패/hidden을 통과시키지 않음 |

후속 source producer 후보는 Composer 경계에 위치한다. raw catalog를 새 컨트롤러에 넘겨 다시 해석하지 않고
기존 성공 projection/final plan에서 증명한다. 캡처된 이전 event closure나 passive effect 한 번만으로
새 입력 무효화를 보장하지 않는다. 입력 변경 진입 시 기존 룸 사용권을 무효화하고 committed source
묶음을 갱신하는 계약, 소비 시 expected source 재검사가 필요하다. render 도중 자원 생성·해제는 금지하는
후보다. React commit/StrictMode/옛 event callback의 정확 연결은 NOT TESTED, 아직 hook 구현 계약 없음.

룸 viewport만 바뀌는 경우는098 geometry 재계산 후보지만, 원본 preview의 폭/viewport가 바뀌어 final plan이
변하면 새 source다. 같은 선택 ID/같은 이미지 ref만 비교하면 문구·폰트·실제 owner 교체를 놓칠 수 있다.
[최종 plan dependencies L748](../../../apps/mockup/src/preview/PreviewComposer.tsx#L748)가 이 구분의 근거다.

## 3. 독립 frame snapshot — 실행과 공개를 분리

| 후보 | 판단/근거 |
|---|---|
| 현재 DOM canvas 복사 | [surface props L12](../../../apps/mockup/src/canvas/PreviewCanvasSurface.tsx#L12)는 ref/snapshot을 외부에 제공하지 않음. [surface L96](../../../apps/mockup/src/canvas/surface.ts#L96)의 ready에는 source token 없음. 현재 API만으로 불충분 |
| print exporter 호출 | [export L135](../../../apps/mockup/src/print/exportFramePng.ts#L135)는 물리cm/파일명/encode/download까지 포함. 룸 캡처 용도로 직접 사용 제외 |
| 같은 final plan을 별도 canvas에 동기 실행 | [export L209](../../../apps/mockup/src/print/exportFramePng.ts#L209)의 같은 plan 실행 선례, [executor L378](../../../packages/render/src/canvas/execute-preview-plan.ts#L378)의 안전 입력 읽기 재사용 후보. 새 측정/줄바꿈/build/PNG 왕복 없음 |
| 원본 bindings 장기 보관 | [composite L37](../../../apps/mockup/src/canvas/compositeImageBindings.ts#L37)는 source 배열만 복사. drawable retain/복사/refcount 없음. 독립 자원으로 간주 불가 |

권장 후보 순서 (NOT TESTED):

```text
expectedSource 확인 + 성공 frame/no-clock/final-plan 확인
 → 할당 전 명시 backing/edge/pixel 예산 검증
 → private detached canvas/context 생성
 → 동일 final plan + 아직 살아있는 borrowed bindings를 await 없이 executor에 전달
 → executor 성공 AND source 재확인일 때만 독립 lease 전달
실패/throw/재진입/교체 → private 부분출력 폐기, 배경 시작/ready 공개 없음
```

executor의 명령 snapshot은 이미지 픽셀 복사와 다르다. [실행 L620](../../../packages/render/src/canvas/execute-preview-plan.ts#L620)
중간 Canvas 실패에는 pixel rollback이 없으므로 실패한 새 canvas를 노출하지 않아야 한다.
실행 전후 source 검사는 시안 식별만 검증하며 CORS-clean·실제 동일 픽셀을 증명하지 않는다.
정수 backing과 비정수 logical 크기 사이의 scale/반올림/clip 검증은 다음 계약의 필수 항목이다.
단위배율·DPR·print 300dpi를 묵시적으로 선택하지 않는다. 원본 canvas/slot/art owner에 release 호출0.
private context/bitmap은 외부에 그대로 반환하지 않으며, 해제 시 참조 분리와 접근 차단을 먼저 한다.
실제 backing 축소·브라우저 메모리 반환 방식/성능은 NOT TESTED; 물리 회수 완료를 보장하지 않는다.

## 4. 100과 실제 drawable 사이에 남은 연결 문제

100의 Resource record는 size/release만 보관하고 lease의 추가 메서드를 전달하지 않는다.
lease에 draw를 덧붙이는 것만으로 공개 API가 생긴다고 주장할 수 없다. 다음 두 후보를 구분한다:

- 별도 adapter가 private 자원을 보관하고100에는 cleanup lease만 전달: 100 수정 없이 수명 재사용 가능성은
  있지만 **자원 보관과 사용 권한을 분리**해야 한다. 두 자원 수신만으로 사용 가능 처리 금지.
  adapter 작업 token, 준비 결과, 매 소비 시 readPrepared의 expected tokens, 자원의 live 여부 모두 요구.
  같은 source/background로 다시 prepare한 경우도 별도 작업 token으로 이전 Promise 성공을 거부한다.
  공개 사용 callback으로 owned bitmap을 유출하지 않고, 호출 전후 재진입/해제를 확인하는 별도 계약 필요.
- 100의 공개 결과/lease API 확장: 상태 전용 계약을 변경한다. 후보 비교는 가능하나 현재 승인0,
  기존 preparation.ts/test.ts에 renderer를 추가하지 않는다.

private registry는 객체를 일찍 갖고 있다는 뜻일 뿐 승인된 ready 정본이 아니다. 100과 adapter의 두 상태가
어긋나는 실패표를 통과하기 전 그리기 연결 금지. 다음 snapshot 단위는 개별 자원의 독립성만 검증하며
두 자원 합성과 실제 source producer까지 검증했다고 기록하지 않는다.

## 5. background owner·취소 후보

[localImageBinding L169](../../../apps/mockup/src/canvas/localImageBinding.ts#L169)는 새 load마다 generation 증가,
이전 pending 정리/binding 제거 후 private URL/Image를 사용한다. [onload L225](../../../apps/mockup/src/canvas/localImageBinding.ts#L225)는
유한 양수 naturalWidth/Height만 검사한다. [clear/dispose L266](../../../apps/mockup/src/canvas/localImageBinding.ts#L266)는
세대 무효화·handler 분리·URL revoke·ready 참조 제거를 수행하나 네이티브 decode 중단을 확인하는 API는 없다.
dispose는 subscriber를 통지하지 않는다. 이 코드에서 확인한 취소는 논리적 무효화/해제 시도다.

후속 background당 새 owner 후보: 기존026 owner를 별도 인스턴스로 감싸되 슬롯/다른cohort와 공유하지 않는다.
원본 파일은 adapter closure에만 보관하고 controller에는 background token만 전달한다. gate 통과 후에만
load, subscribe-before-load와 동기 결과 재확인, 최초 결과만 sink 전달, 실패/취소 시 unsubscribe/dispose,
성공 후에는 lease.release만 그 owner를 정리한다. 공유 owner를 예전 lease.release가 dispose하는 설계 금지.

[V2 decoder L84](../../../apps/mockup/src/space-v2/browser-png-decoder.ts#L84)의 waiting settlement는 참고 가능하지만
Uint8Array proof→PNG Blob 전용이므로 룸 File 로더로 그대로 호출하거나 Space를 변경하지 않는다.
100은 취소 Promise를 먼저 정착시키지만 adapter의 subscriber/파일 참조 정리까지 대신하지 않는다.
늦은 callback은 안전 폐기해야 하며 실제 decoder 중단·벽시계 상한·물리메모리 회수는 NOT TESTED다.

## 6. 지원형식·예산: 확인된 정책과 비어 있는 값

| 근거 | 확인 | 룸 적용 판단 |
|---|---|---|
| [사진 선택 L253](../../../apps/mockup/src/preview/PreviewComposer.tsx#L253) | accept=image/*, 첫 File 선택 | 브라우저 선택 힌트; 룸 형식 승인/파일 검증 정본 아님 |
| [026 계약 §4](../../rebuild/specs/026-local-user-image-binding-lifecycle.md), local owner L181 | Blob 입력/object 여부, 브라우저 성공과 양수 크기 검사 | 파일 size/MIME 서명/decoded pixel/edge cap 없음. 무제한 룸 허용으로 상속하지 않음 |
| [printSize L17](../../../apps/mockup/src/print/printSize.ts#L17) | provisional300dpi·긴변3000·36,000,000 pixels | 인쇄 출력 전용. 룸 입력/메모리 안전 상한 아님 |
| [100 dimension L88](../../../apps/mockup/src/room-placement/preparation.ts#L88) | 각 변1~1,000,000 | fake 수치 검증 한계, 실제 할당 예산 아님 |

파일 바이트·decoded edge/pixels·frame snapshot·합성 출력·동시 보유량은 각각 제한이 필요하다.
검사 시점도 다르다: 파일 byte/허용형식은 로더 시작 전, snapshot/output backing은 할당 전,
decoded dimensions는 기존 owner 경로에서는 onload 뒤다. 뒤의 픽셀 검사만으로 decode 전 메모리 폭증을
방지했다고 주장할 수 없다. 별도 헤더 검사/decoder 제한 도입 여부는 후속 조사·계약 항목이다.
MIME/확장자만을 서명 검증으로 바꾸어 부르지 않는다. 실제 지원형식·EXIF/애니메이션 취급도 별도 결정이다.

현재 룸 수치와 장치별 안전예산은 UNCONFIRMED. 실제 사용량·처리시간·허용사진 비율을 추정하지 않는다.
추가 기준을 논의할 때 입력Bytes B, decode W×H, snapshot Ws×Hs, output Wo×Ho와 동시 보유 개수를
명시해야 한다. RGBA8 plane을 가정한 계산 예시는 `4×(W×H + Ws×Hs + Wo×Ho)` bytes지만 이는
decoder/GPU/원본preview/중간복사/압축B가 빠진 **가정식**이지 브라우저 실제 메모리 예측이나 상한이 아니다.
이번에는 어떤 수치나 허용형식을 제품 기본값으로 채택하지 않았다.

## 7. 실패표와 검증 후보

모든 행은 후속 adapter 검증 요구이며 이번 실행은 NOT TESTED다. 100의 fake PASS로 대체하지 않는다.

| 상황 | 요구할 검증 |
|---|---|
| 옛 event/같은 imageRef의 새 owner/미커밋 source | token/owner/current 불일치이면 capture·background·draw0 |
| case/실패 projection/clock-present/hidden | capture와 배경로더 호출0; 기존 시계/미리보기 변경0 |
| borrowed binding이 capture 중 사라짐 | 실패사본 폐기, 기존 owner 해제0, 부분픽셀 노출0 |
| capture 성공 후 원본사진 교체 | 독립 snapshot의 픽셀 소유와 사용권 무효화를 각각 검증; 옛 source 사용0 |
| background A 늦음/B 성공, 같은 tokens 재준비 | 작업 token별 lease 분리, 옛 성공 Promise/cleanup이 B 사용권 훼손0 |
| cancel 중 sync sink/해제 중 새 작업 | unsubscribe/dispose와 lease.release 역할 중복0; 새 상태 덮어쓰기0 |
| 초과 byte/edge/pixel 또는 입력오류 | 각 검사 시점 이전의 할당/로더 호출0; decode 후 제한의 한계 별도 표시 |
| clear/dispose 후 registry lookup/draw | 현재성 재검사와 live bit로 접근0; raw drawable/context 유출0 |
| fractional scale/clip/font/사진 회전 | 같은 final plan의 합성 픽셀 비교, 줄바꿈 재빌드0, 실제 기기는 별도 |

기존 [Canvas E2E L1](../../../tests/e2e/canvas-surface.spec.ts#L1)는 격리 harness와 test-side pixel read의
선례다. [canonical runner L63](../../../scripts/e2e-run.mjs#L63)는 temp staging을 사용한다.
신규 브라우저 검증을 넣을 때 해당 harness 경로를 계약에 추가하고 고객 entry 포함0을 hash로 확인해야 한다.
기존 E2E/증거를 재생성·변경하지 않는다는 보증은 없으므로 별도 허용과 보호 hash 검사 필요.

## 8. 최소 다음 단위와 결정 경계

다음102는 **frame snapshot 계약 작성만** 권장한다. 최소 파일 후보는 아래와 같고, 아직 허용목록이 아니다.

| 단계 | 정확 파일 후보 | 선행 조건 |
|---|---|---|
| 독립 snapshot | apps/mockup/src/room-placement/frame-snapshot.ts, frame-snapshot.test.ts | 동기 capture/안전 lease/예산 필수 입력/실패 정리/접근권 계약; 기본 수치 없음 |
| 실제 Canvas 합성 검증 | apps/mockup/src/e2e/canvas-fixture.tsx, tests/e2e/room-frame-snapshot.spec.ts | 기존 fixture 수정의 정확 허용·격리 build 확인; 이번 수정/실행0 |
| background/사용권 wrapper | apps/mockup/src/room-placement/browser-preparation.ts, browser-preparation.test.ts | 배경정책·per-job owner·private registry/current 사용권의 별도 계약 |
| 실제 source/UI 연결 | apps/mockup/src/room-placement/useRoomPreparation.ts, apps/mockup/src/preview/PreviewComposer.tsx | committed source/즉시 무효화/StrictMode·UI 별도 계약; 이번 허용0 |

102 계약은 첫 행에 집중하고 브라우저 시험을 포함할지, 필요한 harness 허용까지 확정한 후 구현 지시를
남긴다. default browser port·actual canvas allocation·draw capability는100에서 승인된 것처럼 쓰지 않는다.
신규 snapshot 계약의 mandatory 예산을 합성 입력으로 시험하는 것과 사용자용 실제 기본값 채택을 구분한다.

**지금 문서 계약을 계속 쓰기 위한 추가 Founder 선택은 없다.** 실제 배경 선택 개방 전에 필요한
질문은 하나의 입력정책 묶음으로 좁힌다: “처음 지원할 정적 사진 형식/방향 처리와 파일·decode·snapshot
예산 및 초과 시 거부 정책을 어디까지 허용할 것인가?” JPEG/PNG 한정·초과 거부는 후보일 뿐 미채택이다.
정확 수치 근거와 대안을 갖춘 후 묻는다. 이 조사에서 빈 값을 승인된 값처럼 채우거나 지금 승인받았다고
기록하지 않는다. 룸 UI 초기 위치/폭/조작은 UI 계약 시 별도이며102 snapshot 계약을 막지는 않는다.

계속 금지: 원격/가이드사진 로딩·운영프리셋·실측·그림자/햇빛/시계 근사·Space/저장·발행·print 수정,
packages/Rules/config/의존성·보호·실제Firebase/UID/운영/배포/삭제/설치/자동화.

## 9. 이번 조사 검증과 진행 상태

코드와 위 파일/라인을 정적으로 대조했다. 새 제품코드/시험/build/browser/emulator 실행0.
100의 targeted114/전체unit2659/Chromium271은 직전 실적이며 이번101의 실행 수치가 아니다.
문서 링크·허용7경로·시작dirty22 hash·diff--check 검증 결과는 완료 항목에 별도 기록한다.
동일 Codex DOCUMENT_REVIEW_PASSED이며 독립검수/adapter PASS 아님.
전체 리빌드 실측률/최종 스펙수 확인불가. 룸은 내부 준비 완료·실제 사진/그리기 연결 전, 이번 화면 변화0.

문서 검증 실측: 신규3문서 링크 대상/지정라인35/35 PASS, 시작dirty22/22 SHA 동일,
정확7문서 외 이번변경0, diff--check PASS, staged0에서 범위 확인. 포트4183/4184/4185/8080/9099/9199
listener0. 양앱 기존 dist entry SHA는100 기록과 동일(빌드 재실행 아님). 일반 문서commit/push만 수행한다.
