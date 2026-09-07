# spec099 — 로컬 룸 adapter 경계 조사 결과

2026-09-07, 기준1b20293. DOCUMENT DONE / DOCUMENT_REVIEW_PASSED(동일 Codex).
[조사 계약](../../rebuild/specs/099-room-local-adapter-boundary-investigation.md).
정적 코드 근거에 따른 **후속 구조 후보**이며 새 로더/사진선택/UI 구현 승인이 아니다.

## 1. 098 재확인과 이번 조사 결론

098 코드4·문서8의 커밋 범위, HEAD=origin 추적ref1b20293·0/0, diff--check를 확인했다.
`vitest run apps/mockup/src/room-placement` 재실행: 2파일46/46,240ms,exit0.
[기존 검수](2026-09-07-spec-098-room-placement-geometry-session.md)의 전체단위2591/2591·E2E271/271은
직전 실행 결과다. 이번에는 전체 check/build/E2E/브라우저를 재실행하지 않았다.
098 범위에서 새 재현 결함을 확인하지 않았다. 이것은 독립검수나 전체 룸 기능 검증이 아니다.

후속 구현을 위해 필요한 것은 단순 Canvas ref 공개가 아니라 **현재 시안의 증명과 독립 자원 소유권**이다.
현 surface의 ready에는 시안 식별자가 없고, bindings는 빌려 쓰는 lookup이며, 시계는 DOM층이다.
권장 다음 단위는 이 셋을 명시한 **주입 port 기반 준비 controller + 합성 fake 계약**이다.
실제 브라우저 adapter/UI는 그 후 별도 계약이다. 다음 단계에 새 제품 선택을 임의로 채택하지 않는다.

## 2. 현재 자원 경로 — 확인된 사실

| 경계 | 코드 근거 | 확인/한계 |
|---|---|---|
| 사진 선택 | [Composer L219](../../../apps/mockup/src/preview/PreviewComposer.tsx#L219), L253~260 | 슬롯마다 별도 owner, accept=image/*, 첫 File을 load에 전달. accept만으로 형식·용량 안전성 검증이라고 할 수 없음 |
| 로컬 owner | [localImageBinding L169](../../../apps/mockup/src/canvas/localImageBinding.ts#L169), L211~305 | load시 세대증가·이전pending 취소·binding 제거; URL/Image port; onload의 양수유한 크기검사 후 ready, URL revoke 시도. MIME서명/byte cap/pixel cap/EXIF 정책 없음 |
| 빌린 이미지 | [compositeImageBindings L19](../../../apps/mockup/src/canvas/compositeImageBindings.ts#L19), [local binding L283](../../../apps/mockup/src/canvas/localImageBinding.ts#L283) | namespace 충돌은 분리하지만 underlying drawable 복사/refcount/양도 기능은 아님. 슬롯 clear/교체 이후 같은 lookup이 과거 drawable을 보장하지 않음 |
| React 수명 | [useLocalImageBinding L34](../../../apps/mockup/src/canvas/useLocalImageBinding.ts#L34), [BrowseFlow L109](../../../apps/mockup/src/browse/BrowseFlow.tsx#L109) | owner cleanup의 dispose, StrictMode 새 owner; 선택 key 변경 시 composer 하위 교체. 룸에서 기존 슬롯 owner를 dispose하면 기존 미리보기까지 영향 |
| template art | [Composer L344](../../../apps/mockup/src/preview/PreviewComposer.tsx#L344), [templateArtBinding L155](../../../apps/mockup/src/canvas/templateArtBinding.ts#L155) | 별도 art owner와 ready gate; URL 검증된 source만 load. 룸이 opaque guideBackgrounds를 이 경로로 임의 로드해도 된다는 뜻 아님 |
| 텍스트/최종plan | [Composer L395](../../../apps/mockup/src/preview/PreviewComposer.tsx#L395), L617~765 | fonts.ready뿐 아니라 요청font check 후 probe/final build. 최종plan에 확정 줄바꿈 포함. frameTrialRef는 시험용 args이지 완성 snapshot 아님 |
| 현재 surface | [surface L84](../../../apps/mockup/src/canvas/surface.ts#L84), [hook L68](../../../apps/mockup/src/canvas/usePreviewCanvasSurface.ts#L68) | draw시 최신 plan/bindings, 성공후 ready; 같은 상태는 중복 통지하지 않음. 새plan에 대해 per-frame ack 또는 generation 식별자가 없음 |
| public component | [PreviewCanvasSurface L14](../../../apps/mockup/src/canvas/PreviewCanvasSurface.tsx#L14) | props는 plan/bindings/name/class뿐; Canvas 소유권·snapshot callback을 외부로 제공하지 않음 |
| 기존 PNG export | [exportFramePng L135](../../../apps/mockup/src/print/exportFramePng.ts#L135) | 동일plan/bindings를 detached canvas에 실행하는 선례. 그러나 cm→출력크기·파일명·toBlob·download가 포함되어 룸 snapshot 함수로 직접 호출하면 범위를 벗어남 |
| executor | [preflight L374](../../../packages/render/src/canvas/execute-preview-plan.ts#L374), [실행 L620](../../../packages/render/src/canvas/execute-preview-plan.ts#L620) | 명령/lookup 단일읽기·필요한 drawable resolve 후 동기 실행. pixel rollback은 없음; 실패한 출력은 공개하면 안 됨. 이미지 복제/소유권 획득 함수가 아님 |

현재 local owner 시험의 [늦은완료 L219](../../../apps/mockup/src/canvas/localImageBinding.test.ts#L219),
[surface 최신plan L352](../../../apps/mockup/src/canvas/surface.test.ts#L352),
[동일ready 통지 L365](../../../apps/mockup/src/canvas/surface.test.ts#L365)를 읽었다. 이 기존시험들은 이번에 실행하지 않았다.
주석의 “revoke exactly once”는 코드상 호출 시도 제한이지 실제 메모리 반환 성공 증명이 아니다.
getSnapshot/React readonly 타입 또한 깊은 불변 복사나 독립 픽셀 저장을 뜻하지 않는다.

## 3. 시계 gate — hidden과 없음은 다르다

[project.ts L590](../../../packages/shared/src/catalog/preview/project.ts#L590)의 templateHasClock은
clockEnabled=false, clock=false, builder의 명시 null opt-out 이외에는 시계 있음으로 본다.
clock 필드 부재를 시계 없음으로 해석하면 안 된다. [readClockPreview L617](../../../packages/shared/src/catalog/preview/project.ts#L617)는
시계 있음이면 placement를 만들고 잘못된 수치는 projection 실패로 처리한다.
따라서 **성공한 frame projection의 clockPreview===null**과 projection 자체의 실패를 구분해야 한다.

[Composer L972](../../../apps/mockup/src/preview/PreviewComposer.tsx#L972)에서 clockPlacement를 만들고
[L1154](../../../apps/mockup/src/preview/PreviewComposer.tsx#L1154)에서 DOM overlay로 그린다.
[clockOverlay L152](../../../apps/mockup/src/preview/clockOverlay.ts#L152)는 잘못된 geometry/실패한 custom image도
hidden으로 만든다. 따라서 `view.kind===hidden`은 “시계 없는 시안”의 증명이 아니다.

후속 gate 후보: current source의 성공한 frame projection + current plan 준비 증명 + 명시적인 no-clock.
case/invalid/not-ready/clock-present/unknown은 캡처·새 배경 로딩 전 차단한다.
시계를 끄거나 인쇄 plan에 합성하지 않는다. 기존 미리보기는 그대로 두며 룸 제한만 안내하는 후보다.
이는 [RG-2 결정](../decisions/2026-09-07-rg2-local-room-preparation-decisions.md)의 조용한 누락 금지와 일치한다.
실제 catalog에서 통과할 시안 수, UI gate 동작은 UNCONFIRMED/NOT TESTED다.

## 4. frame snapshot 후보 비교

| 후보 | 장점 | 추가 조건/위험 | 판정 |
|---|---|---|---|
| DOM preview Canvas 복사 | 이미 그려진 픽셀 사용 | 현재 ref/시안별 draw ack 없음; ready 문자열로 새plan 완료를 판정할 수 없음; DOM시계 누락. 새 handshake·surface 변경 필요 | 현 API 그대로 사용 불충분 |
| current final plan을 별도 메모리 canvas에 동기 재실행 | 동일executor/확정줄바꿈 재사용, 원본surface/owner 변경 불필요 | source gate 전후 확인, borrowed binding이 살아있는 동안 await없이 실행, 실패출력 미공개, 별도 memory/pixel budget·cleanup 검증 필요 | 권장 구조 후보, NOT TESTED |
| 기존 print exporter 재사용 | 출력 코드 존재 | 물리cm·download/파일명·encoding을 룸에 끌어옴. PNG 왕복은 추가 비동기 경계 | 직접사용 제외 |
| 원본slot/DOM Canvas를 장기보관 | 복사 비용 없음 | owner 교체/수정 후 다른 시안과 섞일 수 있고 현재 API에 retain/release 없음 | 독립snapshot 아님 |

권장 후보의 “불변”은 output canvas/그리기 context를 외부에 넘겨 수정하게 하지 않는 **소유권 계약**이다.
Canvas 객체 자체를 freeze해서 픽셀이 불변이라고 주장하지 않는다. 읽기 전용 draw capability 또는
비공개 drawable+조회 경계를 별도 계약으로 정해야 한다. 기존 `PreviewRenderPlan`/패키지 barrel 확장0.
source callback은 성공한 최종plan과 같은 순간의 bindings만 제공해야 하고, raw catalog/파일명/URL을
state/log로 내보내지 않는다. 새로 문구를 measure/build하지 않는다. print cm가 없어도 룸은 참고용이지만,
그 사실로 해상도·기본폭·물리치수를 추정하지 않는다.

## 5. 098 session과 접점 — 최소 후속 설계 후보

[session API L1](../../../apps/mockup/src/room-placement/session.ts#L1)는 begin/complete/fail/clear/dispose와
문자열 state만 제공한다. pending 자원의 cancel callback, Promise 정리, binding 조회는 제공하지 않는다.
따라서 `session.complete()`를 두 자원에 각각 호출하거나, complete 전 획득한 자원을 맡겼다고 가정하면 안 된다.

```text
명시 prepare(source identity, 배경 request)
  → gate: current frame ready + no-clock 확인
  → 새 cohort: 이전 exposed handle 제거, 기존/진행중 소유 자원 분리·정리
  → 독립 frame capture 동기 실행(실패/세대교체이면 미공개)
  → 배경 획득 port 시작 → 늦은 완료마다 current identity 확인
  → 둘 다 성공 + source 여전히 current → aggregate lease 하나를 session.complete
  → 수락 후에만 안전한 prepared view 공개
clear/dispose/source 변경 → pending 취소·독립 frame 해제·늦은 자원 해제; ready 미노출
```

위는 구현되지 않은 분석 순서다. 다음 계약에 필요한 불변조건:

- 새 source identity는 catalog/선택/색/문구/사진/transform/art·font readiness/plan 변경을 포함한다.
  문자열ID나 imageRef만 비교하지 않는다. owner 재생성 시 user-image-1은 다시 쓰일 수 있다.
  배경 교체는 별도 identity. 룸 viewport resize만으로 원본시안을 recapture하지 않고098 기하를 재계산하는 후보;
  원본 preview logical width/줄바꿈이 달라져 plan이 바뀌면 source 변경으로 본다.
- validation이 실패해도 예전 ready handle을 새 입력용으로 남기지 않는다. React effect가 나중에 온다는
  이유로 이전 handle을 노출하지 않도록 소비 시 source identity 확인도 필요하다.
- 배경 port가 pending/성공/실패 어느 단계든 취소·settlement 계약을 가진다. partial frame은 adapter가
  처음부터 소유한다. 098 session은 aggregate **완성 이후**만 소유하며 이중 release 주체를 만들지 않는다.
- cohort 별 독립 owner 또는 수명 분리된 lease만 사용. 이전 lease.release가 공유 decoder를 dispose해
  새 배경을 없애는 구현은 금지한다. 새 wrapper로 같은 underlying 자원을 재양도해도 독점성 위반이다.
- 외부 cancel/release/getter/port 호출 전 state를 분리하고 호출 후 identity 재확인. begin 자체도 release에
  의해 재진입될 수 있다([098 재진입시험 L105](../../../apps/mockup/src/room-placement/session.test.ts#L105)).
  반환ticket이 이미 stale일 수 있으므로 callback 이후 작업시작을 무조건 이어가지 않는다.
- clear/dispose는 caller에게 고정취소 결과를 정착시킨다. 실제 decode 중단 성공이나 JS정지 중 cleanup을
  보증하지 않는다. 나중에 받은 자원은 현재state를 바꾸지 않고 release 시도1회; 앱 자동retry0.
- malformed 결과에서도 확보한 cleanup capability를 놓치지 않는다. release1회와 실제메모리 회수 성공을 분리한다.
  pending부분/acceptedaggregate의 소유권 전환을 합성 시험으로 고정해야 한다.

기존 [V2 browser decoder L91](../../../apps/mockup/src/space-v2/browser-png-decoder.ts#L91)는 dispose가
listener를 통지하지 않는 경우 별도 waiting settlement를 수행하는 선례다. proof bytes 전용이므로 그대로
룸 파일로더로 쓰거나 Space를 수정하지 않는다. 이 선례만으로 새 adapter의 취소를 검증했다고 쓰지 않는다.

## 6. 실패표와 최소 검증 범위

| 시나리오 | 다음 계약에서 요구할 결과 | 현재 상태 |
|---|---|---|
| clock-present/unknown, case, source미준비 | capture/background 호출0, 준비완료0 | 후보 NOT TESTED |
| frame capture 실패 | 배경시작0, 부분출력해제, 기존preview변경0 | 후보 NOT TESTED |
| frame 성공 후 배경 실패/취소 | frame 해제1회, ready0, pending 완료 정착 | 후보 NOT TESTED |
| A배경늦은성공/B최신성공 | A자원해제, Bhandle 유지, 중복completion 공개0 | 098 ticket만 검증; adapter NOT TESTED |
| capture/notify/release 중 새prepare 재진입 | 옛호출이 새state/owner를 덮지 않음 | 098 release부분만 검증; adapter NOT TESTED |
| 문구/사진/색/폰트/art/크기 변경 중 준비 | source불일치 즉시미노출, 명시재준비만 | source 연결 NOT TESTED |
| clear/dispose/unmount 뒤완료 | 결과고정·resource정리 시도, UI통지0 | 실제browser NOT TESTED |
| 룸resize/원본plan변경 | 전자는 geometry만, 후자는 snapshot invalidation | 연결 NOT TESTED |
| 해제예외 | rawerror/log0, 재시도0, 다른자원 정리계속 | aggregate NOT TESTED |

fake는 호출순서/identity/cleanup시도/고정오류만 증명한다. 브라우저 decoder·CORS-clean·픽셀일치·
실제메모리/StrictMode/접근성/320px/실제기기는 별도 로컬 합성브라우저 계약과 검증이 필요하다.

## 7. 다음 단위 후보와 계속 금지할 범위

다음100 **계약 작성 후보**: `apps/mockup/src/room-placement/preparation.ts`, `preparation.test.ts`의
주입형 조정자. 기본browser port/실제File/Image/Canvas/URL 생성0, 화면연결0. 이 경로는 아직 허용목록 아님.
098 session/geometry를 읽어 사용하되 기존4파일이나 다른 owner 수정이 필요하면 이유와 정확 파일을
새 계약에 먼저 적는다. source gate, opaque identity, aggregate/partial ownership, safe errors,
cancel/settlement, draw capability를 명시하고 fake로 검증하는 후보다. 제품 runtime 호출자는 아직 없다.

현재는 RG-2 단계준비 안의 기술 계약 조사라 추가 Founder 질문이 없다. 다만 실제 배경 선택을 열기 전에는
지원형식/파일bytes·decoded pixels·snapshot해상도 예산을 근거와 함께 정하고, room UI의 초기위치/폭·
슬라이더·문구/clock차단 UX를 별도 계약으로 검토해야 한다. 수치·비용·처리시간은 UNCONFIRMED이며
현재 image/* UI나098의100만 수치한계를 새 업로드 허용값으로 채택하지 않는다.
공개catalog 배경/운영프리셋·실측·효과·Space·저장·발행·print 변경·Rules·SDK·실제서비스·배포·삭제·설치0.

진행: 098 기반 완료를 유지하고, 이번에는 **연결 전 설계 경계만** 조사 완료. 전체룸 완성/시각변화0.
전체리빌드 실측률·최종스펙수·종료일은 확인불가. 이전85~88%는 관리추정 이력으로만 보존, 상향0.

## 문서 검증 결과

신규3문서 로컬링크/라인33/33 PASS, 시작dirty22/22 SHA동일, 정확 허용7문서외 이번변경0,
git diff--check PASS, staged0에서 범위 확인. 고객/운영자 dist entry SHA는098 기록과동일;
빌드를 다시 실행한 결과는 아니다. 포트4183/4184/4185/8080/9099/9199 listener0.
문서만 일반commit/push하며 보호/별도작업은 제외한다.
