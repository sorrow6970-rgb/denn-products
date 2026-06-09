# 2026-06-09 세션 핸드오프 — 가이드배경 후속 2건 + 사이즈 노출토글 + 템플릿↔사이즈 상호필터

> 상태: 4개 커밋 전부 푸시 완료. HEAD = `dab63fb`. 작업트리 clean.
> ★ **다음 세션은 "검증부터" 재시작** — 마지막 커밋(`dab63fb`)은 **시각검증 미완**(사용자 외출). 나머지 3건은 스샷 검증 완료.

## 0. 복원
```bash
cd C:\repo\denn-products
git pull origin main
git log --oneline -5   # HEAD=dab63fb
```

## 1. 이번 세션 완료 (커밋순)

### A. 가이드배경 순서 변경 ←/→ (`6cdd222`) — ✅검증완료
- admin `renderPolishedGuideCards`(denn-admin L5675) 카드에 재정렬 바(`← n/total →`, 양끝 disabled) + `window.moveGuideBg(i,dir)`(배열 swap→saveNow→재렌더).
- bgKey 안정 id라 per-bg 설정 무손상. mockup 갤러리·발급게이트는 같은 배열 순서라 자동 반영.

### B. 배경별 표시사이즈 화이트리스트 (`2d4dcd2`) — ✅검증완료
- admin 카드 `buildSizeWhitelist` 접이식 체크리스트 → `bg.allowedSizeIds`(빈=전체허용). 사이즈식별자=`sz.id||sz.name`.
- stabilizer change 위임에서 `.denn-v98-size-wl` 제외(연속 체크 시 details 닫힘 방지).
- mockup `rmLoadGuideBgs`=갤러리를 `curFSz`로 필터(비허용 배경 skip, 인덱스 보존). `sgBuildSizes`=내공간 사이즈가이드 버튼을 선택배경 화이트리스트로 제한.
- **둘 다 고객 모드 한정. `?adminRoomSetup`(관리자 배경설정)은 전체 표시**(의도). replay는 같은 경로라 자동 상속.

### C. 사이즈별 '목업툴 사용' 토글 (`9a4c417`) — ✅검증완료
- admin `사이즈 목록` 각 행에 `목업툴 사용` 체크박스(`window.toggleSzMockup`) → 해제 시 `sz.hideInMockup=true`. **객체/값 보존(삭제 아님)**.
- mockup 소비자 노출목록만 제외: `FS`(L859 칩), `actualSizes`(L3209 사이즈가이드), `sizeList`(L5006 기본선택).
- **baseline `actualSizesV48`(L5342)·id 조회(rawSize 등)는 전체 유지 → A4 스케일 기준 정상**. normalizeSize가 플래그 버리므로 원본배열에서 normalize 전 필터.
- 용도: A4=기준용 디폴트 사이즈라 어드민엔 남기고 소비자에서만 숨김.

### D. ★ 템플릿↔사이즈 상호 필터 (`dab63fb`) — ⚠️**검증 미완(여기부터 재시작)**
- 목적: "반드시 사이즈 먼저" 게이트(v97) 완화. **사이즈 미선택이어도 카테고리(시계액자/웨딩)로 전체 사이즈 템플릿 브라우징 → 이후 사이즈 선택 시 해당 사이즈만**.
- 변경(denn-mockup-tool.html, 모두 가산적):
  1. 상단 정보바: 고객 미선택 중엔 `-`(L908 `&&!window.__dennSizeUnset` 가드). 관리자는 그대로.
  2. v97(L12442~): `gate()`에서 gridPrompt/disableCats 제거(overlay+lockInputs만). `buildFrameTplGrid` 래퍼=미선택이어도 빌드+캔버스 오버레이만. `boot`=시작 시 전체 grid 채움.
  3. `templateMatchesCurrentFrameSize`(L997)/`ensureUsableSize`(L7244)/`refreshButtons`(L7252): **`__dennSizeUnset` 기준 판정**(★중요: `curFSz`는 init에 `FS[0]`로 미리 차므로 `!curFSz`로 판정하면 A2만 떴음 — 첫 시도 버그. 플래그로 고침).
  4. `--fr-aspect`(L1029): 미선택 시 강제 안 함(혼합사이즈 썸네일 자연비).
  5. **'전체 사이즈' 드롭다운 옵션**(`window.dennSelectAllSizesV`, L12376 미러 빌더): 선택 시 `__dennSizeAll=true`+`__dennSizeUnset=true`로 전체 브라우징. 구체 사이즈 선택되면 `__dennSizeAll=false`.

## 2. ★ 다음 세션 — 먼저 검증 (D 커밋)

**고객 모드(쿼리파라미터 전부 제거한 순수 `denn-mockup-tool.html`)에서 새로고침 후:**
1. 사이즈 안 고른 상태 → 상단 바 `사이즈: -` (A2 아님)
2. `시계액자` 탭/`웨딩` 카테고리 클릭 → **템플릿이 전체 사이즈로 다 뜨는지**(웨딩-A2·웨딩-B5 등 여러 사이즈 동시). ※ 직전 스샷(121557)에선 A2만 떠서 플래그로 고친 상태 — **이 재현이 핵심 확인 포인트**.
3. 사이즈(예 b5) 선택 → **b5 템플릿만** 남는지
4. 사이즈 드롭다운에 **'전체 사이즈'** 옵션 보이는지 + 선택 시 전체 노출로 돌아오는지
5. 사이즈 선택 전 메인 캔버스는 "사이즈 선택" 오버레이 유지되는지

검증 콘솔(고객 모드):
```js
(function(){var g=document.querySelectorAll('#frame-tpl-grid .tpl-card'),names=Array.prototype.map.call(g,function(c){var n=c.querySelector('.tpl-name');return n?n.textContent:''}).join(', ');console.log('unset='+window.__dennSizeUnset+' all='+window.__dennSizeAll+' ib-sz='+(document.getElementById('ib-sz')||{}).textContent+' | 카드'+g.length+'개: '+names);})()
```

## 3. 검증 후 미세 후속 (필요 시)
- '전체 사이즈' vs 초기 placeholder('사이즈를 선택하세요') 일관성: 현재 초기엔 placeholder, 사용자가 '전체 사이즈' 명시 선택해야 `__all__` 표시. 초기부터 '전체 사이즈'를 기본 노출로 할지 사용자 확인 필요(이번엔 옵션 추가만 요청).
- 사이즈 칩(`#frame-sz-chips`)은 `display:none`이고 드롭다운(`frame-sz-select`)이 실제 UI라 옵션은 드롭다운에만 추가함.

## 4. 보호/불변 (준수 확인)
- 보호 함수 본체 무수정: `renderFrame`/`zeRender`/`fbExport`/`sendKakao`. v97·카테고리 필터는 래퍼/조건 추가만(가산적).
- baseline `actualSizesV48`/`adminA4SizeV48` 무수정 → A4 스케일 기준 보존.
- 사이즈 선택 후(=`__dennSizeUnset` false) 흐름은 기존과 100% 동일(미선택 분기만 추가).

## 5. 참조
- 직전 핸드오프: `docs/2026-06-08-session-handoff.md`.
- 관련 메모리: [[project_guidebg_clobber_guard]](후속 2건 완료 반영) / [[project_frame_size_category_filter]](v97 게이트 — 이번에 완화) / [[feedback_mockup_iife_scoping]].
