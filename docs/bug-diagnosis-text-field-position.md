# 버그 진단 보고서 — 상세설정 문구 추가/위치 이동 불가

작성일: 2026-05-18  
범위: **진단만 수행 (코드 수정 없음)**

---

## 0) 결론 요약

어드민 `액자템플릿 → 상세설정(ze-modal)`에서 발생하는 아래 증상은,

1. 문구 추가가 안 됨
2. 위치 이동(드래그/좌표 반영)이 안 됨

단일 원인이라기보다 **`openZoneEditor`/`setZT`/`zeRenderList` 체인을 동시에 감싸는 v36.3 계열 래퍼(#18, #19)와 base 본체의 상호작용**에서 재현될 가능성이 가장 높습니다.

특히 `renderButtons()`가 버튼 DOM을 매번 재생성하고, `setZT` 래퍼 내부에서 다시 `renderButtons()`를 호출하는 구조가 있어, 클릭 시점/드래그 시점에 activeType·zones 동기화가 흔들릴 수 있습니다.

---

## 1) 상세설정 모달(ze-modal) 문구 UI 구조 확인

### 1-1. 기본 UI
- `#ze-modal` 내부 타입 버튼 4종(`main`,`name`,`date`,`sub`)은 초기 HTML에 정적으로 존재합니다.
- 각 버튼은 `onclick="setZT('key',this)"`로 activeType을 변경합니다.
- "문구 추가" 자체 버튼은 기본 HTML에 없고, 후속 패치(v36.3 dynamic fields)가 동적으로 주입/관리합니다.

근거:
- 기본 타입 버튼/컨트롤: `denn-admin.html` L565-L607
- 기본 `setZT`, `zeRenderList`: `denn-admin.html` L1579-L1600, L1747-L1761

---

## 2) 문구 추가 버튼 클릭 시 호출 체인

v36.3 dynamic fields(#18)에서 문구 필드 매니저가 동작합니다.

### 2-1. 핵심 함수
- `addNewField()`가 실제 문구 추가를 담당
  - `tpl.textFields`에 신규 field push
  - `tpl.defaultTexts[key]`/`ZP[key]` 초기화
  - `renderButtons()`로 타입 버튼 재구성
  - `setZT(newKey, ...)`로 새 필드 활성화

근거: `denn-admin.html` L12693-L12707

### 2-2. 문제 가능 지점
- `renderButtons()`는 `.ze-type-btn`를 전부 제거 후 재생성합니다.
- 동시에 `setZT`도 래핑되어 있고, 래퍼 내부에서 다시 `renderButtons()`를 호출합니다.
- 결과적으로 **버튼 재생성 → setZT → 재생성** 루프가 발생할 수 있어, 사용자 입장에서 "추가 클릭했는데 반응 없음/선택이 튐"처럼 보일 여지가 큽니다.

근거:
- `renderButtons()`: L12670-L12687
- `setZT` wrap(v363): L12781-L12790
- `openZoneEditor` wrap(v363): L12791-L12803
- `zeRenderList` wrap(v363): L12804-L12811

---

## 3) 위치 이동(드래그/좌표) 핸들러 확인

### 3-1. Base 본체 드래그 핸들러
- `zeBindEvents()`에서
  - `canvas.onclick`: 신규/기존 zone 위치 지정
  - `canvas.onmousedown`: hit zone 선택 + drag 시작
  - `document.mousemove`: dragging zone 좌표 갱신
  - `document.mouseup`: drag 종료

근거: `denn-admin.html` L1532-L1565

### 3-2. 문제 가능 지점
- 드래그 자체는 base에서 정상 구현되어 있으나,
- 래퍼 체인에서 `zeRenderList()` 호출이 잦고(여러 타이머 포함), `setZT`가 재진입하면 active zone이 바뀌거나 `_hit` 기준이 직전 상태와 달라져 체감상 "움직이지 않음"으로 보일 수 있습니다.
- 특히 `openZoneEditor` v363 wrap은 `[0,100,280]ms` 타이머로 반복 보정을 수행합니다.

근거:
- `openZoneEditor` v363 wrap 타이머: L12795-L12799
- v363 parity wrap(#19) 타이머: L12904-L12905

---

## 4) 1단계 제거 wrap 8개와의 연관성

문서 기준으로 1단계(A그룹) 완료 시점에 이미 "문구 추가/위치 이동 안 됨" 이슈는 **기존 알려진 이슈**로 기록되어 있습니다.

즉, 이번 증상은 **1단계 wrap 제거로 새로 유입된 회귀 가능성은 낮고**, 제거 전부터 존재하던 구조적 문제일 가능성이 높습니다.

근거:
- `docs/phase1-complete-2026-05-17.md` L40

---

## 5) 2단계 예정 영역(#3,#5,#11,#13,#18,#19) 연관도 평가

### 5-1. 연관 높음
- **#18 (v363 dynamic fields)**
  - `ensureFields/renderButtons/addNewField`
  - `setZT/openZoneEditor/zeRenderList/saveZones` 래핑
  - 본 버그(문구 추가/선택/동기화)와 직접 연관

- **#19 (v363 parity)**
  - `canonicalTemplate` 보정 + `openZoneEditor/saveZones` 래핑
  - `DENNDynamicFrameTextFieldsV363.renderButtons()`를 타이머로 재호출
  - #18과 결합 시 UI 재생성 타이밍 충돌 가능

근거:
- #18 본체/외부노출: `denn-admin.html` L12670-L12813
- #19 본체/외부노출: `denn-admin.html` L12860-L12925
- 2단계 대상 명시: `docs/phase1-complete-2026-05-17.md` L54-L65

### 5-2. 연관 중간/낮음
- #3/#5/#11/#13은 상세 UI 안정화/멀티사이즈/stabilize 계열로 간접 영향 가능성은 있으나,
- "문구 추가 버튼/activeType 전환/zone drag" 핵심 경로 직접성은 #18/#19가 더 큼.

근거:
- `docs/openZoneEditor-helpers-callgraph.md` L65-L70

---

## 6) 재현 관점 체크포인트 (픽스 단계 전)

아래는 **수정 없이 브라우저 콘솔/동작 확인용** 체크포인트입니다.

1. 상세설정 진입 직후 `.ze-type-btn` 개수/구성이 타이머(0/100/280ms) 이후 변하는지
2. "문구 추가" 클릭 직후
   - `tpl.textFields` 길이 증가 여부
   - `ZE.activeType`이 신규 key로 유지되는지
3. 드래그 중 `document.mousemove`에서 `ZE.dragging`이 유지되는지
4. 드래그 중/직후 `setZT` 재호출로 activeType이 바뀌는지
5. `zeRenderList()` 호출 빈도가 과도한지(래퍼 중첩)

---

## 7) 권장 후속 작업 (픽스 단계에서)

> 이번 문서는 진단만. 아래는 다음 단계 제안입니다.

1. #18/#19의 `openZoneEditor`·`setZT`·`zeRenderList` 래핑 경로를 우선 계측(log)하여 재진입 순서 확보
2. 버튼 재생성(`renderButtons`) 트리거를 단일화하거나 idempotent 보장
3. drag 중에는 activeType 재할당/리스트 재생성을 지연시키는 가드 도입 검토
4. 2단계 B그룹 정리 시 #18/#19를 "wrap 제거 + 본체 유지" 원칙으로 우선 처리

---

## 참고 문서
- `docs/openZoneEditor-helpers-callgraph.md`
- `docs/A-group-removal-plan-2026-05-17.md`
- `docs/phase1-complete-2026-05-17.md`
- `docs/work-log.md`
