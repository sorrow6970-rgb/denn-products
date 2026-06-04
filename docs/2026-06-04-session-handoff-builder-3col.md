# 2026-06-04 세션 핸드오프 — 액자 빌더 3컬럼 레이아웃 (미완·WIP 푸시)

> 목표: admin 액자 빌더 컨트롤 패널을 **3컬럼**으로 — [좌: 디자인설정 아코디언(기본 접힘)] · [가운데: 캔버스] · [우: 업로드·저장(펼침)].
> **상태: 미완.** `denn-v98-builder-accordion`을 rev4까지 고쳤으나 아직 화면이 의도와 다름. 다른 스크립트들과의 충돌이 원인. WIP 그대로 푸시함.
> **안전장치**: `<script id="denn-v98-builder-accordion">` (denn-admin.html 끝부분) **만 제거하면 완전 원복**. 가산적·가역적.

## 0. 복원
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -5
```

## 1. 사용자가 확정한 요구 (AskUserQuestion으로 확인됨)
- **배치**: 캔버스를 **가운데**, 화면 **왼쪽 = 디자인 설정(접이식 아코디언)**, **오른쪽 = 업로드·저장(펼침 고정)**.
  - (※ 초기 오해: 캔버스를 왼쪽 끝에 두고 컨트롤 2개를 오른쪽에 몰아넣음 → "완전 다른데". 캔버스 중앙이 정답.)
- **좌측 아코디언 처음 상태**: **접힌 채로 시작**.
- 좌측 그룹(미리보기 기준): 🗂 영역·정렬 / 🎨 테두리·색상 / 🎨 배경.
- 우측: 📝 업로드·저장 (디자인 업로드·카테고리·템플릿이름·가로세로 호환·✨완성·안내).
- 부가: **쓸데없는 선(구분선/빈 박스 테두리)·정렬** 정리.

## 2. 현재 구현 (rev4) — `denn-v98-builder-accordion`
**위치**: denn-admin.html, `<script id="denn-v98-builder-accordion">` (파일 맨 끝, `</body>` 직전).
**접근 (rev1→rev4 변천)**:
- rev1: builder-side 내부 단일 컬럼 아코디언(원래) — 빈 카드, 이동 실패.
- rev2: builder-side를 좌/우 2컬럼으로 — 둘 다 캔버스 오른쪽 → 의도와 다름.
- rev3: 3컬럼인데 좌·우를 **새 컬럼**으로 빼고 builder-side는 숨김 → 흰테두리 패널 CSS(L8065)가 `.builder-side` 안에서만 적용돼 깨짐 + v52와 충돌.
- **rev4 (현재)**: ★ **builder-side 자체를 좌 컬럼으로 사용**(패널을 `.builder-side` 자손으로 유지 → 기존 CSS 보존). 아코디언 카드를 builder-side 안에 만들고 디자인 섹션을 그 안으로 이동. **업로드·저장만** 새 우측 컬럼(`denn-acc-col-right`)으로. `builder-shell`을 3컬럼 그리드(`.denn-acc-3col`)로.

**핵심 로직**:
- `regroup()`: `shell.insertBefore(side, main)`로 side를 캔버스 앞(좌)으로, R(우측 컬럼)을 캔버스 뒤로 배치. side 직속 자식을 `leftKind()`(containment)로 zones/border/bg 분류해 카드 body로 이동, 나머지는 우측으로. 빈 카드는 숨김.
- `leftKind()`: zones=`#fb-zone-list|#fb-zone-label|.align-mini`, bg=`#denn-v364-builder-bg-panel`, border=`#denn-v50-builder-white-panel|#fb-allow-color-wrap|#fb-white-border-wrap-v10|.denn-v10-white-toggle`.
- `MutationObserver`(side 대상)로 늦게 주입되는 패널 자동 수거. 부트: goTab('frame-builder')+400ms, DOMready+700, load+1100.

## 3. ★ 현재 증상 (스샷 2026-06-04 20:29)
- **좌측**: 흰테두리+색상 패널이 **아코디언 밖에 펼쳐진 채** 상단에 있음(카드 안으로 안 들어감). 아래에 "🎨 테두리·색상" "🎨 배경" 접힌 헤더가 따로 보임. 좌측 하단에 또 다른 패널 블록(중복/잔여로 의심).
- **가운데**: 캔버스 중앙 정렬 — **이건 됨**.
- **우측**: "📝 업로드·저장" 헤더만 얇게 있고 **내용이 비어 있음**(카테고리·템플릿이름·완성버튼이 안 옮겨짐).

## 4. ★ 근본 원인 (다음 세션 1순위)
액자 빌더 `.builder-side`를 **여러 레거시 스크립트가 각자 타이머/ goTab 훅으로 주입·이동·재배치**함 → v98과 끝없이 충돌(핑퐁).
- **v52** `denn-v52-builder-white-panel-relocate` (L8091~): `movePanel()`이 goTab+[0,120,420,900]ms·load+700에 실행, `if(panel.parentNode!==side)side.insertBefore(panel, side.firstElementChild)` — **패널이 내 카드(자손) 안에 들어가면 `parentNode!==side`라 매번 side 최상단으로 도로 빼냄.** → 흰패널이 아코디언 밖 상단에 보이는 이유.
- **v51** `ensureWhitePanel()` (L11010~, `side.insertBefore(panel,...)` L11021), **v84** (L11344), **v86** 등도 유사하게 패널을 side에 (재)배치. 미확인 다수.
- 우측이 빈 이유: 미확인. v98 regroup이 cat/tpl/export를 우측으로 못 옮겼거나(분류 시점에 side 직속이 아니었거나), regroup이 우측 이동 전에 다른 스크립트가 구조를 바꿨을 가능성. **런타임 DOM 실측 필요.**

## 5. ★ 다음 세션 할 일 (순서)
1. **런타임 DOM 실측** — admin 액자 빌더 탭 열고 브라우저 콘솔(F12)에 붙여넣어 출력을 핸드오프에 기록:
   ```js
   (()=>{const d=e=>`${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${(typeof e.className==='string'&&e.className.trim())?'.'+e.className.trim().split(/\s+/).join('.'):''} "${(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,28)}"`;const o=[];const sh=document.querySelector('#tp-frame-builder .builder-shell');o.push('SHELL:');[...sh.children].forEach(c=>o.push(' '+d(c)));const s=document.querySelector('#tp-frame-builder .builder-side');o.push('SIDE children:');[...s.children].forEach(c=>o.push(' '+d(c)));['fb-cat-sel','fb-tpl-name','fb-art-inp','denn-v50-builder-white-panel','denn-v364-builder-bg-panel','fb-allow-color-wrap','denn-acc-col-right','denn-acc-meta','denn-acc-border'].forEach(id=>{const e=document.getElementById(id);o.push(id+' -> '+(e?'parent='+(e.parentElement.id||e.parentElement.className):'없음'));});const r=o.join('\n');console.log(r);return r;})()
   ```
   → cat/tpl/white-panel이 **실제로 어느 부모**에 있는지 확인(우측이 빈 이유, 패널이 카드 밖인 이유 규명).
2. **충돌 차단 결정** (택1):
   - (A) **레거시 가드 완화**: v52 L8101 `if(panel.parentNode!==side)` → `if(!side.contains(panel))` 로 변경(카드가 side 안이면 v52가 안 건드림). v51 L11021·v84 L11344도 동일 패턴 점검·수정. → 패널을 아코디언 카드에 안착시킴. **단, 레거시 본체 수정이라 신중히**(현 보호 원칙: 본체 무수정).
   - (B) **아코디언 비-네스팅**: 관리되는 패널(흰테두리/색상/배경)은 builder-side 좌 컬럼에 **그대로 두고**(이동 안 함), 접이식은 CSS/래퍼로 가볍게. 우측 분리만 확실히. 충돌 최소.
   - 추천: 먼저 (1)로 실측 → 우측이 비는 버그부터 해결 → 패널 핑퐁은 (A) 1줄 가드 완화가 가장 깔끔(단 본체수정 승인 필요).
3. 좌측 하단 "중복 패널" 정체 확인(실측에서 같이).

## 6. 보호/불변
- renderFrame/zeRender/renderCase 등 **본체 무수정** 원칙 유지. (단 5-2-A는 v52/v51 가드 1줄 수정 = 예외 검토 대상, 사용자 승인 후.)
- v98 스크립트만 제거하면 원복.

## 7. 참조
- 직전 핸드오프: `docs/2026-06-04-session-handoff.md`
- 스샷: `SCREEN SHOT/스크린샷 2026-06-04 200445/201628/202953.png` (의도와 다른 결과들)
- 관련 코드: 패널 이동 v52 L8091~ / v51 L11010~ / v84 L11344~ / 업로드 주입 `ensureFrameBuilderExtras` L2075~ / 3컬럼 v98 파일 끝부분.
