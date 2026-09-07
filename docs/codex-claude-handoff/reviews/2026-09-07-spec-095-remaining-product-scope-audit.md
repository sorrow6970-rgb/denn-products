# Spec095 — 전체 잔여 기능과 다음 제품 경계

2026-09-07, 기준 `e083aec`, rebuild/modern-studio, origin과0/0. DOCUMENT_REVIEW_PASSED(동일 Codex).
[095 조사 계약](../../rebuild/specs/095-remaining-product-scope-audit.md).
제품 구현·실제 서비스·운영 데이터를 실행하지 않은 정적 대조다. 현재 첫 출시 범위의 전수 확정표는 확인하지 못했다.

## 1. 결론

남은 것은 운영 배포만이 아니다. 룸/사이즈 가이드, 주문·카카오, 운영자 전체 편집 콘솔, 발행에는
아직 제품 기능 공백 또는 명시적 승인 차단이 있다. 데이터 읽기·보존, 기반 코드, 최종 화면과 운영 검증을
각각 따로 센다. 기존 전체 리빌드 방향을 축소하거나 이 기능들을 영구 제외하는 결정은 하지 않는다.

다음 최소 제품 후보는 **기존 canonical cm에 근거한 로컬 ‘인쇄 크기 상대 비교’**다.
그 값으로 액자 외곽이나 실제 방 배치를 보장할 수 없으므로 **RG-1 범위 선택 전에는 구현하지 않는다.**
이 권장안은 새로운 제한 단계 제안이지 이미 승인된 완성형 사이즈 가이드의 복원 계약이 아니다.

## 2. 기능별 추적표

| 축 | 레거시·보존 요구 | 현재 구현/정적 근거 | 완료로 세면 안 되는 부분 | 다음 안전 경계 |
|---|---|---|---|---|
| 룸 목업 | [레거시 §2/4](../../rebuild/00-legacy-analysis.md), `denn-mockup-tool.html` openRoomMockup(L2039), drawFrame(L4408 부근) | [CatalogV1](../../../packages/shared/src/catalog/types.ts)의 roomBackgroundSettings는 flat 원형 보존. [scene-reference](../../../apps/mockup/src/space/scene-reference.ts)의 room.status=unsupported, [V2 schema](../../../packages/spaces/src/v2.ts)의 roomCapability=unsupported | 타입/JSON 보존은 방 합성·앵커·원근·그림자·햇빛·시안 재현이 아님 | 로컬 수학/역할별 좌표 조사 가능. 새 room schema, 보호plan 수정, Space capability 확장은 별도 계약/결정 |
| 사이즈 가이드 | 레거시 SG/sgSetOri(L2617/2629), sgDraw(L4629)는 여러 cm 사각형·눈금·방 canvas 연동 | [032](../../rebuild/specs/032-frame-print-physical-size-catalog.md)와 [projectFramePrintPhysicalSize](../../../packages/shared/src/catalog/preview/project.ts)는 canonical 인쇄 cm만 반환. 양 앱 제품 src 검색에서 가이드 UI 진입 미확인 | 인쇄 cm가 액자 외곽 실측이라는 근거, 사진의 실측 축척, 고객 위치 저장/방과의 정합성은 UNCONFIRMED | RG-1=A라면 로컬 인쇄 크기 상대 비교부터. 실물 룸 배치라고 표시하지 않음 |
| 주문·카카오 | 레거시 §1/2/5, sendKakao(L1889) 및 DENNOrderRequestV36 누적 경로 | [exportFramePng](../../../apps/mockup/src/print/exportFramePng.ts)는 plan 기반 로컬 PNG만 생성. [033](../../rebuild/specs/033-local-frame-png-export.md)은 order/IndexedDB/Kakao 제외 | 다운로드=주문 완료가 아님. [P-4a](../decisions/2026-07-31-spec-032-print-export-decisions.md)는 인쇄소 확인 전 실제 업로드·주문 전송·배포 차단. P-5c는 고객 문구 원문 저장/전송 제외 | 로컬 계약 조사만 가능. 실제 인쇄 규격·개인정보/주문보존·전송 주체 확정 전 운영 전송0 |
| 운영자 전체 catalog 관리 | 레거시 admin goTab(L880), openZoneEditor(L1728), renderFonts(L1713), §2의 빌더/사이즈/색/브랜드/백업 | [admin App](../../../apps/admin/src/App.tsx)의 준비/치수/읽기/C5/V2 표면. [applyFramePrintSizeEdit](../../../packages/shared/src/catalog/authoring/frame-print-size-edit.ts)는 기존 항목의 printWidthCm/printHeightCm만 편집 | 전체 JSON CAS 저장 기반이 모델·템플릿·zone·폰트·브랜드 등 모든 편집 UI를 뜻하지 않음. 필드 보존≠필드 검증/편집 계약 | 대상 필드/이미지·폰트 자산 수명/검증 단위마다 별도 계약. 새 운영 메뉴는 [F-4](../decisions/2026-09-07-ui-audit-f4-f7-f8-decisions.md) 준비화면 범위 밖 |
| 발행·운영 전환 | 레거시 published/state.json, 카탈로그 공개 소비 | C5 저장/REC 식별과 V2 시안 발급은 catalog 발행과 별개. [F-B/F-C](../decisions/2026-08-10-admin-auth-write-boundary-decisions.md), [운영보류](../decisions/2026-08-18-admin-write-operational-cutover-hold.md) 유지 | 실제 UID/일반 운영 비용·용량/배포·rollback 실행 NOT TESTED. 로컬 Rules 파일이나 synthetic PASS는 live 권한이 아님 | 발행/배포/운영 write는 별도 Founder 승인. 이번 후보로 열리지 않음 |

위5행은 조사 축이며 동등 가중치의 완료율 분모가 아니다. 레거시 line은 정적 탐색 위치다.
레거시 다중 재정의 때문에 한 함수의 초기 정의를 최종 실행 계약이라고 단정하지 않았다.
특히 sendKakao 초기 정의만으로 최종 주문 저장/전송의 원자성·보안·호환성을 증명하지 않는다.

## 3. 읽기 보존·검증·제품 의미의 차이

1. [read.ts](../../../packages/shared/src/catalog/read.ts) ITEM_KNOWN 주석은 guideBackgrounds/customFonts 세부를
   opaque 취급한다고 명시한다. [read.test.ts](../../../packages/shared/src/catalog/read.test.ts)의
   `preserves flat roomBackgroundSettings and revision markers`는 원본 필드 보존을 검사하지 렌더를 검사하지 않는다.
2. [032 §공개 계약](../../rebuild/specs/032-frame-print-physical-size-catalog.md)은 명시 pair의 finite/>0/<=500,
   부재null, 이름/aspect 추론 금지와 aspect/cm 자동 수정 금지를 고정한다.
   이로부터 비교 사각형의 상대 비율을 계산하는 것은 가능하지만, **외곽 치수/벽의 실측 축척**은 따라오지 않는다.
3. 레거시 sgDraw는 `pxPerCm = max(1, measureBase(W,H)/150 * scalePct)`와 UI 배율을 사용한다.
   현재 확인한 이 식만으로 업로드된 방 사진의 실제 cm 보정이 증명되지는 않는다. 임의150을 새 실측 계약으로 이식하지 않는다.
4. [V2 test](../../../packages/spaces/src/v2.test.ts)의 room capability rejection과
   [083 제외 범위](../../rebuild/specs/083-admin-space-v2-issue-ui.md)는 room/text/template-art/clock capability 미개방을 명시한다.
   따라서 고객 composer에 기능을 추가해도 기존 Space에 자동 포함할 수 없다.
5. C5 [치수 편집 테스트](../../../packages/shared/src/catalog/authoring/frame-print-size-edit.test.ts)는 원본불변/
   legacy-backed 거부 등을 검사한다. 새 항목 CRUD·Zone Editor·폰트 업로드의 검증 증거가 아니다.

단위032/033/083의 당시 제외를 모든 로컬 후속 구현의 영구 금지로 읽지는 않는다.
반면 P-4a 실제 전송 차단, F-B 발행 분리, F-D legacy 되쓰기 금지, 운영보류는 새 허가 없이 넘지 않는다.
[데이터 정책](../decisions/2026-07-21-data-compatibility-and-migration.md)과
[개인정보 정책](../decisions/2026-07-21-security-and-privacy.md)에 따라 실제 주문/원본/secret은 읽지 않았다.

## 4. 진행 상황·일정의 올바른 표현

- 이미 만든 기반: catalog browse/read, 고객 사진·텍스트·시계/로컬 PNG, C5 치수 편집·충돌/복구,
  제한된 Space V2 발급/뷰어, 해당 로컬 시각 보완. 근거는094와 선행033/083 계약 및 현재 App/Preview 경로다.
- 아직 남은 큰 묶음: 위5축, 전체 레거시 효과/인쇄 parity, 실제 기기/인쇄소 검증, 운영전환 수용 기준.
  이는 일정 확정이나 첫 출시 필수/제외 선택을 대신하지 않는다.
- **이전85~88%는 관리 추정 이력일 뿐 현재 실측 완료율로 검증할 수 없다.** 잔여12~15%는 단지
  100-88=12,100-85=15로 계산한 값이다. 미구현 기능량/가중치/기간을 측정한 결과가 아니다.
  이 문서 조사로 비율을 올리지 않으며 최종 스펙 수·종료일은 UNCONFIRMED다.
- 단계를 제안하면: 기능 경계 확정 → 제한 로컬 UI/순수 모델 → 룸/운영자·자산/주문별 추가 계약 →
  로컬 통합·실기기·인쇄 수용 확인 → 별도 운영 전환 승인. 단계별 날짜/작업량은 아직 산정하지 않았다.

## 5. Founder에게 필요한 결정 하나 — RG-1 (미승인)

**질문:** 다음 구현을 먼저 `인쇄 크기 상대 비교`로 제한할 것인가?

- **A 권장:** 현재 검증된 canonical 인쇄 cm만 사용하는 로컬 상대 비교를 다음 단위로 한다.
  이름/aspect/픽셀로 치수를 추측하지 않으며 부재/무효는 비교에 사용하지 않는다.
  방 사진·외곽 실측·화면1:1 실측·회전 정책 확장·사진/Canvas 재합성·저장/발행/Space 변경은 제외한다.
  UI에는 실제 액자 외곽/방 배치가 아닌 인쇄 크기 비교임을 명확히 한다. 다른 레거시 기능은 후속 미완으로 유지한다.
- **B:** 실제 액자 외곽/방 배치부터 해야 한다면, 외곽 치수 출처·배경 보정·역할별 설정/시안 정합성의
  별도 조사/결정부터 진행한다. 이 경우 A의 제한 비교 UI를 먼저 만들지 않는다.

권장 이유는 정확한 데이터 없이 실물 크기를 암시하지 않고 운영 권한 없이 확인 가능한 기능을 먼저 만들기 위함이다.
기존 인쇄 cm를 새 고객 비교 의미로 사용하고 룸 기능과 단계 분리하는 제품 결정이므로 자동 채택하지 않는다.
이번에는 운영 활성화/개인정보/발행 결정을 묻지 않는다. 그 권한은 계속 금지다.

A 승인 후 후보096 계약에서 정확한 변경 경로를 정한다. 최소 후보는 신규 앱-local 비교 모델/테스트/UI/CSS,
기존 고객 연결 지점1개, 합성 E2E/별도 결과 문서다. packages/shared 공개 API/카탈로그 스키마/
보호 render plan/기존 Space/인쇄 export/Rules/config 변경은 열지 않는다.
비교 항목 선택/정렬·오류/접근성·비율 보존/원본불변·외부요청0·회귀 검증까지 코드 전에 계약화한다.
**이 목록은 후보이지096 계약 또는 구현 승인 아님.** RG-1 답변 전 제품 코드와096 구현 계약0.

## 6. 조사·검수 방법 및 한계

`rg --files` 및 src 키워드(room/size guide/sgDraw/sendKakao/kakaoUrl/ZoneEditor/denn_order_requests),
App→BrowseFlow/Preview·admin composition 진입, shared authoring/read/projection, Space schema와
관련 테스트·결정문을 정적으로 대조했다. 비-test/e2e 검색의 미발견은 이름이 다른 모든 구현의 부재 증명은 아니다.
단순 observer 함수 이름 publish는 실제 카탈로그 발행으로 세지 않았다.
과거 README의007/025 상태는 현재 일정으로 사용하지 않았고 기존 별도 미커밋 roadmap 문서도 변경하지 않았다.

이번 unit/build/E2E/emulator/browser 실행0, 실제 데이터/UID/Firebase/인쇄/운영 비용 확인0.
직전094의 unit2526/2526·canonical267 exit0는 [094 검수](2026-09-07-spec-094-admin-c5-recovery-guidance.md) 인용이다.
제품 검증 PASS를 새로 선언하지 않는다. 조사 완료는 DOCUMENT_REVIEW_PASSED, 다음 제품은 FOUNDER_DECISION_REQUIRED.

문서 검증: 신규3문서의로컬링크28개대상존재확인,누락0.시작dirty22파일중22개SHA256동일.
신규3+상태4=허용7문서외이번변경0. `git diff --check` PASS,검증시staged0.
