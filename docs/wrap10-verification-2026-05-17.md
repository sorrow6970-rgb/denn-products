# wrap #10 (installDetailSizeSync) 위험 검증 — 2026-05-17

## 검증 결과 요약 (한 문장)

**#10 제거 안전. 1단계 포함 가능.** winner v56 (L8594) 가 `#denn-v38-ze-size-checks` DOM을 자체적으로 생성하고, v56 (L8622-8623) 이 `window.saveZones`/`saveZonesOnly` 를 **직접 대입**으로 덮어쓰면서 v50 의 save-wrap (L7695) 을 무력화한 상태 — 즉 wrap #10 은 production 런타임에서 이미 죽은 코드.

## DOM `#denn-v38-ze-size-checks` 분석

### 생성 위치 (총 5곳, IIFE별 1개씩)

| 라인 | IIFE | 생성 함수 | 호출 트리거 |
|---|---|---|---|
| **L6600** | `denn-v38-multi-size-checkbox` | `installDetailMulti()` (L6593) | openZoneEditor wrap #5 (L6660) — `dennV38InstallMultiSizeCheckboxes` 외부 노출 alias 통해 |
| **L7631** | `denn-v50-detail-builder-sync` | `installDetailSizeSync()` (L7624) | openZoneEditor wrap #10 (L7694) — [0,80,220,520]ms setTimeout × 4회 |
| **L8034** | `denn-v53-detail-link-stability` | `renderDetailChecks()` (L8025) | wrap #11 의 `stabilizeDetail` 경로 |
| **L8369** | `denn-v54-size-render-lock` | `renderDetailSizeCard()` (L8360) | wrap #12 의 `stabilizeDetail` (L8384) 경로 |
| **L8594** ⭐ | `denn-v56-canonical-save-detail` (winner) | `renderSizeCard()` (L8584) | **winner 본체 L8639 의 `ZE.img.onload` 안에서 L8649 + L8653 두 번 호출** (RAF×2 안 한 번 더) |

→ 5개 모두 같은 ID 를 가진 동일 책임 DOM 을 만든다. 마지막에 생성된 카드가 화면에 보임 (각 함수는 `cards.forEach(remove except keeper)` 식으로 이전 카드를 청소).

### 참조 위치

| 라인 | IIFE / 함수 | 용도 |
|---|---|---|
| L4511 | v35 `installSizeControl` (#4) | 카드 keeper 선택 (DOM 조회만) |
| L6596 | v38 `installDetailMulti` (#5) | 동상 |
| L6604 | v38 `selectedDetailVals` | save-wrap (L6608) 이 호출 |
| L6913 | v40 `installDetailRules` 영역 | (별도 확인 안 함 — A 그룹 외) |
| L7007 | v42 `syncDetail` (#6) | 체크박스 change 리스너 부착 (RatioBind) |
| L7041 | v44 (#7) IIFE 내부 | checkedVals helper |
| L7224 | v45 (#8) IIFE 내부 | 동상 |
| **L7635** | **v50 `selectedDetailVals`** | **v50 save-wrap (L7695) 이 호출** |
| L8041 | v53 `selectedDetailVals` | v53 save-wrap (L8108) 이 호출 |
| L8225 | v54 IIFE 내부 | DOM 조회 |
| L8341 | v55 `detailTargets` | save 경로 |
| L8609 | **v56 `detailVals`** | **winner `saveDetail` (L8613) 이 호출 — 실제 production save path** |
| L13647 | (보호 ID 리스트로 보임) | 정리 대상 제외 |

### save 흐름과의 관계 (production 런타임)

```
[사용자 클릭] saveZones / saveZonesOnly
   ↓ (마지막 wrap이 누구?)
window.saveZones = function(){return saveDetail(true)}   ← L8622 v56 IIFE
window.saveZonesOnly = function(){return saveDetail(false)} ← L8623 v56 IIFE
   ↓
saveDetail(closeAfter)   ← L8611 v56 IIFE
   ↓
detailVals()   ← L8609 v56 IIFE
   ↓
by('denn-v38-ze-size-checks') 있으면 readChecks(box), 없으면 targetValues(currentTpl())
   ↓
DOM 출처: renderSizeCard() (L8584 v56) — winner 본체가 ZE.img.onload 안에서 호출 (L8649, L8653)
```

핵심: **v56 (L8622) 가 `window.saveZones` 를 `function(){return saveDetail(true)}` 로 직접 대입.** wrap 형태가 아님 (`oldSave.apply` 같은 체인 없음). 따라서 v50 (L7695) 가 설치한 save-wrap 은 **v56 가 실행되는 순간 GC 대상**이 되며 production에서 절대 호출되지 않음.

## installDetailSizeSync 호출 경로

전체 grep 결과 (대소문자 무관, 동적/문자열 포함):

| 라인 | 컨텍스트 |
|---|---|
| L7624 | **정의**: `function installDetailSizeSync(){...}` |
| L7694 | **유일한 호출처**: openZoneEditor wrap #10 의 setTimeout 콜백 (`[0,80,220,520].forEach(function(ms){setTimeout(function(){installDetailSizeSync();...},ms)})`) |

`installDetailSizeSync` 는 wrap #10 외 호출처가 정말로 없음. 외부 노출(`window.xxx=...`), 인라인 핸들러 (`onclick="..."`), 문자열 setTimeout, mockup-tool.html 크로스파일 호출 모두 0건 ([[A-group-verification-2026-05-17]] 에서 이미 확인됨).

## save-wrap fallback 분석

### v50 save-wrap (L7695) — 죽은 코드

```js
['saveZones','saveZonesOnly'].forEach(function(name){
  var old=window[name];
  if(typeof old==='function'&&!old.__dennV50Sync){
    var fn=function(){
      var t=tpl(),vals=selectedDetailVals();
      if(t){writeTargets(t,vals);saveNow()}
      var r=old.apply(this,arguments);   ← 여기서 호출하는 old 는 v50 시점의 saveZones
      setTimeout(function(){var t2=tpl();if(t2){writeTargets(t2,vals);saveNow()}},0);
      return r
    };
    fn.__dennV50Sync=true;window[name]=fn
  }
});
```

- v50 시점의 `old` 는 v44/v45 등이 만든 함수.
- 이 wrap fn 이 `window.saveZones` 로 대입됨.
- **그 후 v53 ~ v55 가 추가로 wrap.**
- **v56 (L8622) 가 `window.saveZones=function(){return saveDetail(true)}` 로 직접 대입 → 모든 이전 wrap 체인 끊김.**
- 결과: v50 save-wrap fn 은 어디서도 호출 안 됨.

### v56 saveDetail (L8611) — 실제 동작 경로

```js
function saveDetail(closeAfter){
  var t=currentTpl();if(!t)return false;
  writeTargets(t,detailVals());canonicalWhite(t);
  ...
}
function detailVals(){
  var box=by('denn-v38-ze-size-checks');
  return box?readChecks(box):targetValues(currentTpl());
}
```

DOM 없을 때 fallback: `targetValues(currentTpl())` — 즉 현재 템플릿의 저장된 sizeIds/frameSizeIds 를 그대로 다시 씀. 사용자가 모달에서 체크박스를 바꿨더라도 DOM 이 없으면 변경이 무시되고 **저장된 값 그대로 유지**.

### DOM 미생성 시나리오 (winner v56 기준)

| 시나리오 | DOM 존재? | 영향 |
|---|---|---|
| 정상 모달 open + 이미지 로드 성공 | ✅ (L8649 renderSizeCard) | 정상 |
| 이미지 로드 전 RAF×2 진입 전 save 호출 | ⚠️ DOM 미생성 가능 (race) | fallback → 변경 무시. 단 모달에 `.open` 클래스 미부착 → 사용자가 save 버튼 누를 수 없음 |
| 이미지 로드 실패 (`onerror`) | ❌ | save 버튼 누를 일 없음 — modal 에 `denn-v56-preparing` 만 붙고 `.open` 안 붙음 |
| 후속 wrap (#15~#21) 가 winner 호출 전 차단 | DOM 미생성 | save 도 불가 |

→ 사용자가 save 를 누를 수 있는 상태에서는 항상 DOM 존재. wrap #10 가 추가로 0/80/220/520ms 에 카드를 다시 그려도 winner 가 이미 같은 카드를 만들어둔 상태라 **무용 + 재렌더 비용 + 카드 깜빡임 위험만 더함**.

## 결론 및 권장

**1단계 포함 가능 — wrap #10 를 다른 7개와 같이 떼낸다.**

근거:
1. winner v56 `renderSizeCard` (L8584) 가 `#denn-v38-ze-size-checks` DOM 생성 책임을 완전히 가져감.
2. v56 의 `window.saveZones`/`saveZonesOnly` 직접 대입 (L8622-8623) 이 v50 save-wrap 을 무력화. wrap #10 의 헬퍼 호출이 production 에서 의미 없음.
3. v56 의 `detailVals` fallback (`targetValues(currentTpl())`) 으로 DOM 부재 시에도 데이터 손실 없음 — 게다가 DOM 부재 상태에서는 save 버튼 자체에 도달할 수 없음 (modal `.open` 미부착).
4. wrap #10 의 `[0,80,220,520]ms` setTimeout 4회는 v56 winner 가 이미 만든 카드를 추가로 4번 더 그려대는 **순수 중복 작업** — 제거하면 깜빡임 감소 가능성.
5. wrap #10 안의 `denn-v15-detail-border` 숨김도 v9, v15, v84 가 이미 처리하는 중복.
6. wrap #10 안의 `zeRender()` 호출도 winner img.onload 내부에서 이미 호출 — 중복.

권장 처리 순서 변경: 기존 plan 의 8번째 → **권장 순서를 1단계 안 마지막 (7번째 또는 8번째 그대로) 유지**. 라인 단위로는 단순하지만 검증이 가장 많이 필요했던 케이스이므로 다른 단순 케이스들을 먼저 제거하고 동작 확인 후 #10 떼는 것이 안전.

### 부가 발견 — 별도 작업 후보 (1단계 아님)

`renderDetailChecks` (L8025, v53), `renderDetailSizeCard` (L8360, v54) 도 같은 DOM 을 만드는 중복 헬퍼. wrap #11 (v53), wrap #12 (v54) 도 winner 와 충돌 — 2단계/3단계 분석 시 이 두 헬퍼도 같이 검토 대상.

— end —
