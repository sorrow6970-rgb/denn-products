# 2026-06-22 세션 핸드오프 — 운영자 배경위치 전달 버그 해결 + 룸 진입/회전 튐 제거 + 가로 스크롤 중앙

> 상태: HEAD `578fdfd` (origin/main push 완료). 시작 `35e3de4`.
> 06-19 핸드오프의 ★★미해결(운영자→소비자 배경위치 전달) **해결**. 이어서 진입/회전 튐·가로 스크롤 중앙 작업. 끝에 **새 미해결 1건**(반복 토글 후 액자위치 틀어짐).

## 1. 오늘 커밋 (시간순, 전부 push)
- `054e12c` 소비자 배경위치 운영자값 미전달 수정 — rmRender force 블록에 bgScale/bgOffsetX/Y 강제 추가
- `3cf1e8e` 소비자 배경 첫 페인트 튐/찌꺼기 제거 — loadSettingsV33에서 user:키 배경값 사전 동기화
- `c12e787` 룸 진입/회전 튐 제거 — 캔버스 크기 고정 + 이미지 로드 게이트 페이드 + 로딩 스피너 + 가로 스크롤 중앙
- `e7ff36e` 스피너 지연+페이드 & 게이트 폴링 단축
- `cd48fa0` 가로 재진입 스크롤 중앙정렬 보강(reveal 후 rAF+지연)
- `578fdfd` 가로 스크롤 중앙 = 진입 후 1.3s 중앙유지 rAF 루프(gen 가드)

## 2. ★★ 06-19 미해결(운영자 배경위치 전달) — 해결됨
- **06-19 가설(V48/V33 키 분리)은 오진.** 콘솔 프로브로 확정: 운영자 저장은 처음부터 정상(운영자키 `gb...`.mobile=-37.3/scale1.17). 진짜 원인 = **rmRender "소비자 운영자 디폴트 강제" 블록(L3977대, `!__userMoved`)이 guideScale·프레임pos·guide offset만 강제하고 배경 3필드(bgScale/bgOffsetX/bgOffsetY)를 빠뜨림** → 배경 드로우(L3995대)가 stale `user:`키 슬라이더값(-50/102%)을 그대로 그림.
- 수정1(`054e12c`): force 블록에 배경 3필드도 운영자 프리셋(`dennMergeMobileV(__op)` .mobile병합)으로 setVal.
- 수정2(`3cf1e8e`): 첫 페인트 stale→보정 튐 제거 — loadSettingsV33 applySettingsV33 직전에 소비자·`!__userMoved` 시 user:키 배경(base+mobile)을 운영자 현재값으로 사전동기화+persist(찌꺼기 제거). base↔mobile 분리 유지.
- 검증(소비자 390×844 portrait): LIVE rm-bg-oy=-37.3 scale=117, 운영자 .mobile과 일치.

## 3. 룸 진입/회전 튐 제거 (c12e787 + e7ff36e + cd48fa0 + 578fdfd)
- **진단(콘솔 트레이스로 op·캔버스크기·호출자 기록)**: ① 고정 760ms 페이드가 배경 이미지 로드(Firebase 원본 ~2s)보다 먼저 풀려 반쯤로드→완성이 보이는 채 재렌더(회색 clearRect 플래시). ② 가로 전체화면 캔버스가 '현재 이미지 종횡비'로 사이징돼 세로(4:5)↔가로(원본) 스왑 시 844x1055↔844x563 통째 리사이즈 점프(V106·V107 핑퐁 포함).
- **수정**:
  - **이미지 로드 게이트 페이드** `dennGatedRevealV`(rotate 모듈 내): 고정 타이머→방향-정확 src(`dennGuideBgSrcV`) 로드 완료까지 `denn-room-entering`(캔버스 opacity:0) 유지. 세대(`__dennRevealGenV`) 가드, 안전 캡(초기 1800 / 가로 3000). 중간 재렌더·리사이즈가 전부 숨김 단계에서 끝남.
  - **가로 캔버스 크기 고정**(V107, `denn-v107` box, L13788대): '가로(ar>=1) 이미지' 비율만으로 사이징+`__dennLsArV` 캐시 재사용 → 세로 이미지 끼어들어도 리사이즈 안 함. **V106 coverFit(L13684대)은 rotate-fs에서 빠져**(핑퐁 차단) V107 전담.
  - **로딩 스피너** `#denn-room-spinner`: 대기 중 빈 화면 대신. **지연(180ms)+페이드**(`html.denn-room-spin`)라 빠른 캐시 로드엔 안 뜸.
  - **가로 스크롤 중앙**: `centerRoomCanvasScroll`(L3404대)의 가로=0(맨위) 강제 제거 + **진입 후 ~1.3s 중앙유지 rAF 루프 `dennRotCenterLoopV`**(타이밍 의존 제거). 세대 `__dennRotCenterGenV` 가드(반복 토글 옛 루프 중단)·스크롤바 드래그 시 즉시 중단.
- 검증: im.onload/대폭 리사이즈가 op=0(숨김)에서 끝나고 reveal 1회만 op=1. 가로 스크롤 중앙(반복 토글 포함) 유지 — 사용자 확인 "한 박자 느리지만 됨".

## 4. ★미해결 — 다음 세션 핵심: 반복 토글 후 액자위치가 저장값에서 틀어짐
- **증상**: 가로↔세로를 여러 번 반복하다 **세로일 때 액자(프레임) 위치가 저장값에서 틀어짐.**
- **프로브 확정**: `userMoved=true`(거짓 양성). opMobF(세로 저장 프레임)=50.32,47.75 / opBaseF(가로)=50.04,53.05 / **LIVE RM.pos=50.6,49.7(중간 드리프트값)**. `__userMoved=true`라 **rmRender force 블록(운영자 프레임 강제)이 OFF** → 프레임이 방향별 저장값으로 안 돌아옴.
- **다음 단계(범인 추적)**: `__userMoved`에 감시자(Object.defineProperty setter + Error().stack) 걸고 토글 반복 → true로 바뀌는 순간 호출 스택 확인. 후보: ① 드래그 핸들러 L3796(우발 포인터) ② **input 리스너 L2165**(어떤 코드가 sg-/rm- 슬라이더에 `dispatchEvent(new Event('input'))` → 캐치) ③ **applyRoomState/applyControls**(L14663~/L14805 — 저장 디자인 복원이 `__userMoved=true` 잠금 + input 디스패치; 일반 진입엔 안 돌 가능성 높으나 확인 요). **이번 진입/스크롤 변경과는 무관**(applyRoomState 미호출).
- **감시자 프로브**:
```js
(function(){if(!window.RM)return;var v=RM.__userMoved;Object.defineProperty(RM,'__userMoved',{configurable:true,get:function(){return v},set:function(x){if(x&&!v)console.log('### __userMoved=true SET BY:\n'+(new Error().stack||'').split('\n').slice(2,7).join('\n'));v=x;}});console.log('watching now='+v);})()
```
- 범인 확정 후: 거짓 트리거 차단, 또는 방향전환 시 force가 방향별 운영자 프레임을 재적용하도록 게이팅 보강(단 의도적 사용자 드래그/룸복원은 보존).

## 5. ★함정/교훈 (오늘)
- **다중정의 함정 또**: `rmRender`는 **L13697·L13783 2중 래핑** → `rmRender.toString()`이 래퍼만 보여 `hasFix` 거짓음성. base 수정은 들어가 있었음. `bgKey` 5중·`setVal` 7중·`rmSizeCanvas` 3중·`coverFit`/V106·V107 2중 사이징.
- **캐시 함정(테스트)**: 서비스워커 없음에도 하드 리로드가 옛 코드 서빙 → **`?v=숫자`(새 URL)만 확실히 최신**. 액자 "저장값 아니네"가 캐시(옛 코드)로 오인된 적 있음. 서버 실제 바이트는 `fetch('...?v='+Date.now()).then(r=>r.text())`로 확인.
- **타이밍 의존 센터링은 깨짐**: reveal 1회 센터는 빠른 재진입에서 stale scrollHeight 잡음 → 시간창 rAF 루프(+gen 가드)가 견고.
- **콘솔 붙여넣기 막힘**: 크롬 self-XSS — `allow pasting` 입력 후 가능. copy()는 클립보드만, console.log로 직접 출력이 확실.

## 6. 참조
- 직전: docs/2026-06-19-session-handoff.md
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[feedback_verification_workflow]] [[operator-default-propagation]]
