# spec097 — 룸 목업의 최소 로컬 경계 조사

2026-09-07,기준7a1a981/rebuild/modern-studio. DOCUMENT_REVIEW_PASSED(동일 Codex).
[조사 계약](../../rebuild/specs/097-room-local-boundary-investigation.md). 제품 구현/브라우저/운영 실행0.

## 1. 결론

룸 목업은 배경 위에 현재 Canvas를 복사하는 것만으로 완료되지 않는다. 레거시는 화면좌표와
이미지좌표,배경 crop/focus,모바일 사이징,운영자 초기값·사용자 조정,앵커·효과를 함께 사용한다.
현재 리빌드에는 재사용할 순수기하와 액자 plan executor가 있지만,룸 의미/입력 검증/소유권 계약은 별도다.
현재 시계는 DOM overlay이므로 Canvas만 복사하면 누락된다. 조용한 생략을 승인하지 않는다.

다음 권장 **RG-2=A**는 실측·레거시 재현이라고 부르지 않는 **로컬 참고용 룸 배치의 단계적 준비**다.
첫 구현 후보는 UI/사진 로딩 없이 합성 입력으로 좌표와 자원 세대 소유권만 검증하는 단위다.
이 방향은 아직 미승인이다. 승인 후에도 먼저 정확한 다음 스펙을 작성하고,고객 UI 연결은 별도 계약을 거친다.
[RG-1](../decisions/2026-09-07-rg1-print-size-comparison-decisions.md)은 인쇄크기 비교만 승인했으므로
096 완료를 룸 의미·시안 저장·기존프리셋 해석의 승인으로 확대하지 않는다.

## 2. 레거시 정의와 후속 변경 추적

아래는 정적 코드에서 확인한 경로다. 마지막 텍스트 대입과 실제 실행 시 마지막 설치/비동기 콜백은 다르다.
운영 HTML을 실행하지 않았으므로 모든 환경의 최종 함수 identity/호출순서/화면 parity는 UNCONFIRMED다.

| 경로 | 확인한 정의/후속 변경 | 조사 결론 |
|---|---|---|
| 룸 진입 | [원본 openRoomMockup L2039](../../../denn-mockup-tool.html#L2039)는 frameCanvas 복사·이벤트·가이드 로드. [L4807](../../../denn-mockup-tool.html#L4807)은120ms 뒤 설정 적용. [L15286](../../../denn-mockup-tool.html#L15286)은 prev를 감싸150/600ms 뒤 공통값 상속 | 늦은 초기화가 있음. 초기 함수만 새 정본으로 채택할 수 없음 |
| 룸 렌더 | [rmRender L2093](../../../denn-mockup-tool.html#L2093) 이후 [L4477](../../../denn-mockup-tool.html#L4477) 재대입이 프리셋·배경·앵커를 적용 | RM/DOM/운영자 모드 등 여러 입력에 의존 |
| 최후반 렌더 래퍼 후보 | [V106 L14514](../../../denn-mockup-tool.html#L14514),[V107 L14607](../../../denn-mockup-tool.html#L14607)이 이전 렌더 뒤 크기 수정 시 재렌더 | 검색한 명시적 window.rmRender 대입 중 후반 후보. 실제 활성체인 완전성은 실행 미검증 |
| 모바일/회전 | [coverFit L14485](../../../denn-mockup-tool.html#L14485)의 phone gate·0.462고정비율·DPR, [box L14569](../../../denn-mockup-tool.html#L14569)의 가로fullscreen·이미지비율 경로 | 0.462는 기존 화면 설계 상수이지 방의 실측 축척 아님. 새 반응형 모델에 자동 복사 금지 |
| 배경별 시안 재현 | [captureScene L15626](../../../denn-mockup-tool.html#L15626),[applyBgSettings L15856](../../../denn-mockup-tool.html#L15856),[renderFrameOnBg L15896](../../../denn-mockup-tool.html#L15896) | room controls/settings/common/pos와 주배경·다른배경 적용이 다름. 파일 읽기만으로 모든 시안 재현 PASS 아님 |

[레거시 분석 §3/4](../../rebuild/00-legacy-analysis.md)의 패치 누적 경고를 재확인했다.
함수 이름 검색 미발견을 모든 간접 대입·eval·동적 설치의 부재 증명으로 쓰지 않는다.

## 3. 좌표·단위·효과의 실제 의미

| 항목 | 정적 근거 | 다음 설계에서 보존/분리할 점 |
|---|---|---|
| 화면 위치 | [L4115](../../../denn-mockup-tool.html#L4115): `(client-left)*canvas.width/rect.width` | backing px를 쓰는 레거시와 CSS/logical px를 쓰는 새 기하를 혼합하지 않음 |
| 배경 cover | [L3834](../../../denn-mockup-tool.html#L3834): `s=max(W/iw,H/ih)*scale`,크기와 offset으로 실제 draw rect 계산 | 화면 기준 이동량과 이미지 기준 focus는 다른 계약 |
| focus 경로 | [L3838](../../../denn-mockup-tool.html#L3838): 중앙에 focus점을 두고 cover 경계로 clamp | `bgZoom`에 따른 별도 경로. 단순 offset과 무조건 같은 값으로 변환하지 않음 |
| 이미지 앵커 | [L3351](../../../denn-mockup-tool.html#L3351): `(pos.x*W-bg.x)/bg.w`,[L4555](../../../denn-mockup-tool.html#L4555): `(bg.x+frameImgX*bg.w)/W` | 배경 draw rect가 있어야 왕복 가능. clamp 때문에 모든 경계값의 완전 역변환은 아님 |
| 프레임 크기 | [L4411](../../../denn-mockup-tool.html#L4411): `pxPerCm=max(1,measureBase/150*guideScale)`,frame 크기에 `sizePct/20` 추가 | 150/20 및 슬라이더는 UI 배율. 인쇄 cm→사진 속 실물 cm 보정의 근거 아님 |
| 상·하 앵커 | [L4416](../../../denn-mockup-tool.html#L4416) 이후 frameSizeAnchor·refH·userMoved·직접 drag 분기 | 사이즈 변경·drag·resize의 정책을 새 모델에서 분리해야 함 |
| 기울기/원근 | [L4343](../../../denn-mockup-tool.html#L4343)은 사각 꼭짓점 보간+14×14 격자 삼각형 affine draw,[L4463](../../../denn-mockup-tool.html#L4463) 주변에 회전·그림자 | 사진에서 카메라/벽 평면을 추정한 물리 원근 모델이라는 근거 없음. 효과값과 실측을 구별 |

실제 외곽 치수,방 사진의 기준 길이/촬영 보정,벽 좌표,운영 background의 실제 aspect/버전은
UNCONFIRMED/NOT TESTED다. 사진의 픽셀 수나 인쇄cm에서 이 값을 만들지 않는다.

## 4. 역할별 설정·자산과 현재 구현

[2026-05-31 계약 §3/12](../../2026-05-31-room-settings-schema-contract.md)은 역할별 중첩과
frameCenterX/Y=0~100%,guideScale=1이100%,사이즈 상속 금지 등을 기록한다. 그러나 현재 레거시
[L15314](../../../denn-mockup-tool.html#L15314)의 roomSchemaSyncV1은 flat map에서 매번 derived mirror를
만들고,L15326 scopedKeyV2는 소비자 가이드 키에 user:를 붙인다. 이어지는 [2b L15364](../../../denn-mockup-tool.html#L15364)는
flat 키 이동·삭제·백업을 하는 별도 경로다. 과거 계약의 목표 중첩모델을 현재 완료된 저장 구조로 쓰지 않는다.
이 코드를 실행하거나 리빌드에 이식·마이그레이션하지 않았다.

- [현재 catalog types L75](../../../packages/shared/src/catalog/types.ts#L75)는 flat map을 원형 보존한다.
  [read.ts L64](../../../packages/shared/src/catalog/read.ts#L64)는 guideBackgrounds 상세를 opaque 취급한다.
  [read.test L137](../../../packages/shared/src/catalog/read.test.ts#L137)는 보존 검사지 역할/단위 정규화 검사가 아니다.
  따라서 값0.5를 보고 50%라고 자동 해석하거나 모바일/운영자 fallback을 만들면 안 된다.
- 배경 선택·사전 로딩은 [L1968](../../../denn-mockup-tool.html#L1968)~L2036에 있다. URL 또는 dataUrl과
  회전용 파생 배경을 쓰는 경로를 확인했지만 실제 자산·CORS·권한·용량·보존 상태는 조회하지 않았다.
  opaque storagePath가 존재한다는 이유로 새 background 로더가 신뢰해도 된다는 뜻이 아니다.
- [geometry public](../../../packages/render/src/geometry/index.ts) 및 [clientPointToLogical](../../../packages/render/src/geometry/point.ts)은
  순수 계산으로 재사용 후보. [computeCoverDrawRect](../../../packages/render/src/geometry/cover.ts)는
  cover+논리px pan 계약이며 contain 또는 레거시 focus·원근의 즉시 대체품이 아니다.
- [plan types](../../../packages/render/src/plan/types.ts)의 입력은 Case/Frame이고,
  [executor](../../../packages/render/src/canvas/index.ts)는 주입 context/binding만 사용한다.
  보호 `packages/render/src/plan/index.ts` 변경 없이 앱-local 합성 계층을 검토할 여지는 있지만 아직 구현하지 않았다.
- [PreviewComposer L1154](../../../apps/mockup/src/preview/PreviewComposer.tsx#L1154)는 **시계를 별도 DOM overlay**로 그린다.
  현재 Canvas 사본=현재 고객이 보는 전체 시안이라는 주장은 틀리다. 첫 후보에서 시계 켜진 상태는
  룸 진입을 차단하고 기존 미리보기는 그대로 두는 방식 또는 별도 완전 합성 계약이 필요하다.
- [localImageBinding](../../../apps/mockup/src/canvas/localImageBinding.ts)의 generation/revoke/late completion 방어는
  자원 소유권 참고 후보다. 기존 사진 슬롯 owner를 공유·탈취하거나 새 룸사진까지 자동 신뢰하지 않는다.
- [V1 scene-reference L23](../../../apps/mockup/src/space/scene-reference.ts#L23)은 room unsupported,
  [V2 L314](../../../packages/spaces/src/v2.ts#L314)는 roomCapability가unsupported가 아니면 거부한다.
  [V1 reader](../../../packages/spaces/src/read.ts)는 room JSON을 읽어 보존하지만 렌더 구현을 증명하지 않는다.
  룸을 고객 로컬에 추가해도 발급/저장/replay 기능이 자동 추가되지 않는다.

## 5. 최소 후보 비교 — 아직 채택 아님

| 후보 | 할 수 있는 일 | 의도적으로 할 수 없는 일 / 필요한 권한 |
|---|---|---|
| **RG-2=A 권장: 로컬 참고용 배치의 단계적 준비** | 첫 단위는 앱-local 순수 좌표+세대 소유권 모델과 합성 fake. 이후 별도 UI 계약에서 사용자가 선택한 로컬 배경과 지원된 액자 시안의 자유 배치 검토 | 실제 크기/원근 정확도/전체 레거시 parity 주장0. 최초 UI는 시계 활성 상태를 조용히 생략하지 않고 차단하는 조건 포함. 첫 단위에서는 UI/사진 로딩/공개 API 변경0 |
| RG-2=B: 운영 프리셋·룸 효과·Space 재현을 먼저 계약화 | 역할별 프리셋/배경 변형/효과·앵커·모바일/시안의 완전성 기준을 먼저 정할 수 있음 | 검증된 자산·필드 의미·기존 데이터 대표성 및 새 schema/권한 판단이 필요. 현재 근거만으로 구현 불가,실제 데이터 접근은 여전히 미승인 |

A가 B의 기능을 영구 제외하는 선택은 아니다. 목표는 첫 단계에서 새 영속화/권한을 열지 않는 것이다.
로컬 사진도 개인 데이터일 수 있다. 나중에 UI를 승인해도 명시 선택 파일의 메모리 처리만 후보이며
파일명/bytes/URL을 log·오류·원격·localStorage·IndexedDB에 저장하는 권한은 없다.

### A 승인 뒤 첫 구현 계약에서 좁힐 구조 후보

기본 제안은 background **contain**으로 사진 전체를 보이고 이미지 좌표에 위치를 묶는 것이다.
레거시 cover/crop와 다른 새 로컬 참고 모드임을 명시한다. 실제 px/cm는 산출하지 않는다.

```text
합성 배경 크기 + 논리 viewport → contain 배경 사각형 B
정규화 중심(u,v) + 폭 비율 q + 시안 aspect → 배치 사각형 F
client 좌표 → logical 좌표 → B 기준(u,v) / 새 배경세대면 이전 완료 폐기
```

수학 후보: `s=min(Vw/Iw,Vh/Ih)`, `Bw=Iw*s`, `Bh=Ih*s`,
`Bx=(Vw-Bw)/2`, `By=(Vh-Bh)/2`, `cx=Bx+u*Bw`, `cy=By+v*Bh`,
`Fw=q*Bw`, `Fh=Fw/aspect`. 이 식은 배치 비율이지 실물 배율이 아니다.
contain 여백 클릭 거부,객체가 배경보다 큰 경우,최소/최대 q,중심/전체사각형 clamp,리사이즈 후
동일 지점 유지,overflow/비유한/0입력 실패를 **다음 계약에서 정확히 결정**해야 하며 현재 기본값을 만들지 않았다.

첫 단위 예상 파일은 신규 `apps/mockup/src/room-placement/geometry.ts`, `geometry.test.ts`,
`session.ts`, `session.test.ts`와 해당 스펙·handoff·상태 문서뿐이다. **후보 경로이며 아직 허용목록 아님.**
App/Browse/Preview 연결,CSS,실제파일선택,렌더명령/스키마/패키지 루트barrel 변경은 첫 단위에서 제외한다.
후속 UI에서는 준비 완료된 시안 snapshot의 생성/무효화·시계지원gate·문구/템플릿/사진 변경 시
세대 교체·resize·clear/unmount를 별도로 계약화한다. 기존 owner의 DOM Canvas를 무조건 공유하지 않는다.

합성 검증 후보: 정/역좌표 왕복(비clamp 영역),종횡비·공통 위치·DPR독립,배경교체/취소/늦은완료,
소유세대별 해제1회,입력불변,경계·잘못된수치 fail-closed. fake는 실제 이미지 decode/시각/서버 보증이 아니다.

## 6. 결정과 검증 상태

Founder에게 남은 질문은 **RG-2: 위 A의 제한 단계 방향을 선택할지** 하나다.
A의 다음 구현 계약 작성 전 답변을 받는다. 기술 수치/오류코드/정확 파일은 Codex가 계약으로 제시한다.
B를 선택하거나 기존 시계·프리셋·실측 보장이 먼저 필요하면 구현하지 않고 해당 경계부터 재설계한다.
운영 전환 승인·실제 데이터 접근을 이 질문에 묶지 않는다.

이번은 `rg`/파일읽기/Git diff/hash/링크 검사만 수행했다. unit/build/E2E/emulator/browser 실행0.
직전096의2545/271/3PNG는 과거 검증 결과이며097에서 재검증했다고 쓰지 않는다.
DOCUMENT_REVIEW_PASSED / DOCUMENT DONE, 다음 제품은 FOUNDER_DECISION_REQUIRED.

진행 변화: 인쇄 상대비교096은 완료,룸은 조사만 완료. 전체 룸 기능·주문·전체운영콘솔·발행은 완료 아님.
과거85~88%는 관리 추정,잔여12~15%는100-88~100-85일 뿐 현재 실측률이 아니다.
이번 문서로 비율을 올리지 않으며 최종 스펙수/완료일은 확인할 수 없다.

최종 문서 검증: 신규3문서 로컬링크44/44 및 지정라인 존재,시작dirty22/22 SHA동일,
양앱entry SHA096최종값과동일,git diff--check PASS.이번허용7문서외변경0,staged0에서범위확인.
문서만일반commit/push하며RG-2는여전히미승인이다.
