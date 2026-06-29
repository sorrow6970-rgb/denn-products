# 2026-06-29 세션 핸드오프 — 햇빛/그림자/기울기 PC·모바일 분리(미완) + 회전떨림·햇빛터치·페이드·바텀시트× 해결

> 상태: **origin/main = `606f3ad`** (push 완료). 마지막 커밋은 **WIP**(햇빛 ON/OFF 분리 미해결).
> ★안정 기점(분리작업 직전) = **`54e258d`** (회전떨림·햇빛터치·페이드·바텀시트× 까지 해결, 검증됨).

---

## 1. 이번 세션 origin에 landed (검증·작동)

| 영역 | 커밋 | 핵심 |
|---|---|---|
| 가로→세로 떨림 회귀 | `42f5f5f` | 진짜 범인 = 하단 안내 아일랜드 `#denn-rotate-hint`가 스크롤되는 `rm-canvas-area`에 absolute 부착→회전 정착 중 출렁. body에 `position:fixed`+z최상위로 이동. + scrollTop 101↔8/0↔8 가드(101 writer 3곳 세로 가드+세로전환 lock+앵커 데드밴드). + 페이드 모달전체 흰색 통일+스피너 진회색. |
| 모바일 햇빛 광원 위치/토글 | `6f54ba7` | **핵심: `__lift`(모바일 세로 장면 위로 translate, H×5.45%) 보정** — `sunHit`/`setSunPosFromEvent`가 lift 미반영→그려진 광원(위)보다 히트영역(아래) 어긋남. `RM.__bgLiftV`로 보정. + 토글 탭 신뢰도(touchend 임계탭+더블파이어 가드)+광원 드래그 충돌(touchstart 양보). |
| PC 바텀시트 헤더 × | `54e258d` | 모바일 바텀시트 헤더(`denn-msheet-head`, ×)가 PC(≥861)서 안 숨겨져 액션버튼 위에 맨 × 로 떠보임. PC 숨김 규칙(L12458)에 `.denn-msheet-head` 추가. |

★진단 교훈: **scrollTop defineProperty watcher(시간·ent·ori·caller 로그)로 단일범인 확정**. 화면 오버레이 watcher로 사용자 스크린샷 1장 받기. **추측 금지**.

---

## 2. ★★미완 핵심 작업 — 햇빛·그림자·기울기 PC/모바일 분리 (WIP `606f3ad`)

### 운영자 요구 (반복 강조됨)
**햇빛·그림자·기울기의 ON/OFF·위치·세기까지 전부, 가이드배경/레이아웃처럼 PC와 모바일 별개 저장.** 기존 설계는 "조명/그림자/기울기는 base 공유"였는데 이걸 **분리로 전환**해야 함.

### 분리 시스템 구조 (denn-mockup-tool.html)
- **`DENN_MOBILE_FIELDS_V`**(L~3254): `.mobile` 격리 필드 목록. 이번에 **sun(9)+shadow(7)+tilt(4)+guideOpacity+showRuler 추가**.
- **저장 `dennRouteSaveV`**(L~3259): 모바일 컨텍스트면 격리필드→`key.mobile`, 나머지(공유)→base. PC면 전부 base.
- **모바일 컨텍스트 판정 `dennIsMobileEditCtxV`**(L~3257): `__dennAdminMobileV`(PC편집기 'PC|모바일' 탭) 또는 `viewAs=mobile` **또는 (이번 추가) 운영자(adminSetup)+실제 세로폰(isRoomPortrait)**.
- **읽기 `dennMergeMobileV`**(L~3268): **`isRoomPortrait()`** true면 base+`.mobile` 병합, 아니면 base. (★저장은 컨텍스트 플래그, 읽기는 실제 방향 → 기준 불일치가 버그 원인)
- **로드 `applySettingsV33`**(L~3143): dennMergeMobileV 거친 값으로 setSun/슬라이더/sunPos 적용.
- **소비자 force 블록**(`rmRender` 내 L~4070, 게이트 `!__userMoved&&!dragging&&!sunDrag&&!adminSetup`): 운영자 프리셋(`__op`=dennMergeMobileV 방향병합)을 매 렌더 강제. 이번에 **햇빛·그림자·기울기 전파 추가**.
- 저장 키: 공통기본값=`__denn_room_common_default__`, 소비자 기본화면=`default-room`(②를 미러).

### ★미해결 증상
1. **햇빛 ON/OFF가 여전히 PC↔모바일 연동** — "모바일에서 끄면 PC에서도 꺼져". **위치(sunX/Y)는 분리됨**(사용자 확인).
2. **토글이 안 꺼짐** ("안꺼져 토글이") — 소비자 force 블록이 매 렌더 운영자 ON을 재강제해서 끄자마자 다시 켜지는 것으로 의심(Fix의 부작용).

### Ground truth (실제 세로 폰, 소비자 default-room에서)
```
key: default-room | __dennAdminMobileV: undefined | isRoomPortrait: true
base.sunOn : true      (←② 미러)
mobile.sunOn: undefined (←.mobile에 햇빛 저장 안 됨)
RM.sunOn   : true
```
→ `.mobile`에 햇빛이 아예 안 들어가 있음. **운영자가 폰에서 토글해도 저장이 base로 감**(`__dennAdminMobileV`/`viewAs` 둘 다 없어서 `dennIsMobileEditCtxV` false였음). 그래서 PC와 base 공유 → 연동.

### 진단/다음 단계 (우선순위)
1. **저장 컨텍스트 = 읽기 컨텍스트 일치 확인.** 읽기는 `isRoomPortrait`, 저장은 이번에 `adminSetup+isRoomPortrait` 추가했으나 **사용자 케이스는 `default-room`(비adminSetup)** 이라 새 분기가 안 먹을 수 있음. → 운영자가 **공통기본값 편집기(`?adminRoomSetup=__denn_room_common_default__`)** 안에서 토글하는지, 아니면 default-room/소비자 화면에서 하는지 **정확한 편집 위치 확인** 필요. (편집 위치에 따라 fix 분기 달라짐)
2. **토글 안 꺼짐 = force 블록 부작용 강력 의심.** 소비자 force(L~4070, 이번에 sun 추가)가 매 렌더 `RM.sunOn=__op.sunlightEnabled` 재강제 → 로컬 토글 OFF가 즉시 ON으로 복원. **해결방향**: 햇빛 토글을 사용자 조작으로 인정(`__userMoved` 세팅 또는 sun 전용 플래그)해 force에서 제외, 또는 force의 sun을 "초기 1회"로 제한. (위치·프레임은 force 유지 OK)
3. **운영자가 .mobile 햇빛을 만들 수 있는 명확한 UX 경로 확정**: 폰에서 편집(adminSetup+portrait→.mobile) vs PC편집기 '모바일' 탭(`__dennAdminMobileV`). 단 **PC편집기 모바일탭은 저장=`__dennAdminMobileV`(true)인데 읽기=`isRoomPortrait`(PC화면 false)라 써도 안 보이는 2차 불일치** 존재 — 이것도 정리.
4. 검증: 토글 OFF 직후 콘솔로 `base.sunOn`(불변 기대) vs `mobile.sunOn`(false 기대) 확인.

### 진단 콘솔 (저장 위치 확인)
```js
(function(){var A=JSON.parse(localStorage.getItem('denn_admin')||'{}'),k=window.dennCurScopedKeyV&&dennCurScopedKeyV(),c=(A.roomBackgroundSettings||{})[k]||{};console.log('key:',k,'| __dennAdminMobileV:',window.__dennAdminMobileV,'| isRoomPortrait:',window.isRoomPortrait&&isRoomPortrait(),'| adminSetup:',window.dennIsAdminSetupV&&dennIsAdminSetupV());console.log('base.sunOn:',c.sunlightEnabled,' mobile.sunOn:',(c.mobile||{}).sunlightEnabled,' RM.sunOn:',window.RM&&RM.sunOn);})()
```

---

## 3. 롤백/복원점
- `54e258d` = ★분리작업 직전 안정(회전·햇빛터치·페이드·× 해결 검증됨). 분리가 꼬이면 여기로.
- `606f3ad` = 현재(WIP 분리, 토글 ON/OFF 미해결).
- 직전 안정 태그: `stable-pc-mobile-save`(=5a01b26, 레이아웃 PC/모바일 분리 기준 — **이 분리 불변식 깨지면 안 됨**).
- 복원: `git reset --hard <ref>`.

---

## 4. ★주의/함정
- **저장(`dennIsMobileEditCtxV`) vs 읽기(`dennMergeMobileV`=isRoomPortrait) 컨텍스트 기준이 다름** — 이번 버그의 근본. 둘을 일관되게 맞춰야 분리가 정상.
- **소비자 force 블록은 매 렌더 운영자값 재강제** → 로컬 토글/조작과 충돌(`!__userMoved` 게이트로만 보호). 햇빛 토글을 force 제외 처리 필요.
- `DENN_MOBILE_FIELDS_V`는 코어 — 추가는 분리 확장(안전)이나, **레이아웃 분리(`stable-pc-mobile-save`) 회귀 체크 필수**.
- IIFE 스코프: 크로스블록 호출은 `window.X`로만(saveRoomBackgroundSettings=window 노출, dennSyncShadowTogV/setRoomTiltEnabledV40 노출 확인됨).
- 캐시: `?v=숫자` 바꿔야 새 코드 로드 확실.

## 5. 부수 수정(검증 필요·미확인)
- `rm-sun-reset`(L~9049): 복원 후 `saveRoomBackgroundSettings()` 추가(기존 미저장).
- `sgReset`(L~2432): 소비자=② 소스(`dennSectionCommonV`)+복원 후 저장(기존 공장값·미저장).

## 6. 참조
- 직전: docs/2026-06-26-session-handoff.md
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[project_operator_default_propagation]] [[project_storage_single_source]]
- 핵심 커밋: `42f5f5f`(떨림) · `6f54ba7`(햇빛터치/lift) · `54e258d`(바텀시트×) · `606f3ad`(WIP 분리)
