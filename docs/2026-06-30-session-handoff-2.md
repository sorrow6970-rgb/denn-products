# 2026-06-30 세션 핸드오프 (2) — 실폰 테스트 라운드: DPR화질·모바일터치·UI폴리시·회전안내·앵커 + ★미해결 가로 위치/스케일

> 상태: **origin/main 푸시 예정 = `5159dd3`** (이 핸드오프 커밋까지 포함해 푸시).
> 직전(오전) 핸드오프: `docs/2026-06-30-session-handoff.md` (WIP 무한행 롤백 + no-cache 서버).
> 안정 기점: `54e258d`.

---

## 1. 이번 세션(오후) landed — 검증·작동

| 커밋 | 내용 | 검증 |
|---|---|---|
| `8cbf39d` | **Stage A — 햇빛/그림자/기울기 PC·모바일 저장 격리** (DENN_MOBILE_FIELDS_V에 sun9+shadow7+tilt4 추가만, dennIsMobileEditCtxV 무수정=재귀 회피) | ✓ 소비자 검증 |
| `0d0029a` | 모바일 룸 시트 UI 폴리시(패널 grid→block, 헤더, zoom 본문, sg-panel 2줄, 메인메뉴 +2px, 섹션라벨, 촬영권장 간격) | ✓ |
| `fe6696b` | "내 공간에서 보기" 헤더 부제 문구 교체 | ✓ |
| `682f769` | **룸 캔버스 고DPI(DPR) 화질** — rmSizeCanvas 3분기 + V106 coverFit + V107에 devicePixelRatio(상한4) 적용. 캔버스px=CSSpx라 폰서 흐릿하던 것 | ✓ 실폰(세로 cv=css×3.5, 가로도 선명) |
| `0a84982` | 모바일 터치: 슬라이더 즉시반응(방향기반, 홀드250→150) + rAF스로틀(rmRenderRAF/sgDrawRAF) + **2손가락 핀치=액자 크기(sg-scale)** (document capture) | ✓ 실폰 |
| `3e4abf6` | 사이즈 가이드 선/눈금/글씨 크기 복원 — DPR로 sg-canvas 고해상도가 돼 고정px 드로잉이 1/DPR로 축소되던 것. sgDraw 시작에 ctx.scale(DPR)+W/H를 CSS px로 재정의 | ✓ 실폰 |
| `3c8ba74` | 회전 안내를 화면 중앙 반투명 카드 + 회전 폰 애니메이션 + 페이드아웃. 배경 선택 시 재표시(rmSelectGuide hook) | ✓ (재표시는 일부 배경경로만) |
| `5159dd3` | 사이즈 앵커가 sizePct만 봐서 기준스케일(sg-scale)로 줄이면 중앙기준되던 것 → 유효크기(sizePct×sg-scale)로 감지. 핀치 중 드래그충돌(RM.dragging) 억제 | ⚠️ 미검증(앵커는 PC어드민서 재현/검증 필요) |

★**DPR 핵심 교훈**: 룸 캔버스 사이저가 **다중**(rmSizeCanvas 3분기 + V106 coverFit L13815[실폰 최종] + V107 L13913[가로]). 화질/사이징 수정은 **이 5곳 전부** 손대야. 고정px 드로잉(선두께/글씨)은 DPR 캔버스서 ctx.scale로 보정.

---

## 2. ★★미해결 (다음 세션 핵심) — 가로 회전 시 액자 위치/스케일 ≠ PC base

### 증상 (소비자 실폰)
**아무것도 조절 안 하고** 세로→가로 회전만 해도, 액자 **위치·스케일이 운영자가 PC(base)에 저장한 값과 다름.** (배경은 base로 정상 로드됨 — 액자만 틀어짐)

### 원인 (높은 확신) = `__userMoved` 거짓양성
- 정상 흐름: 회전 `onChange`(L14155)가 `loadSettingsV33()` 재호출(L14165) + rmRender **force 블록**(L4061, 게이트 `!RM.__userMoved && !dragging && !sunDrag && !adminSetup`)이 가로면 base 액자 위치/스케일 강제.
- 그런데 **`RM.__userMoved`가 거짓양성으로 true** → force 블록 OFF → base 재적용 안 됨 → 가로에 stale/.mobile값 잔류.
- = 메모리 [[project_mobile_pc_guide_settings_attempt]]의 **"`__userMoved` 거짓양성 → 액자위치 저장값서 틀어짐"** (여러 세션 미해결 난제).

### 다음 세션 진단법 (메모리 기록된 방법)
1. **`__userMoved` 감시자**: `Object.defineProperty(RM,'__userMoved',{set:...console.log(new Error().stack)...})` 로 **누가 true로 세팅하는지 스택 캡처**. 폰 콘솔이 어려우면 **화면 오버레이로 스택 1줄 표시**(이번 세션 DPR/핀치 진단처럼) → 스크린샷 1장.
2. 후보(메모리): `input 리스너 L2166`(isTrusted 게이트 있으나 누수 가능) / `applyControls`(L14835~, 복원이 __userMoved=true+input디스패치) / 드래그핸들러 / 회전 중 슬라이더 setVal이 trusted로 잡히는 경로.
3. 범인 확정 후: 회전 재적용 경로에서만 그 false-set을 막거나, force 게이트를 회전 직후엔 __userMoved 무시하도록.
★ **민감영역(force/회전/방향분리) — 추측 금지, 감시자로 단일범인 확정 후 최소수정.**

### 기타 남은 것
- **앵커(`5159dd3`) 미검증**: PC 어드민(`?adminRoomSetup=__denn_room_common_default__`)서 사이즈 기준위치=하단 → 기준스케일로 줄여 하단고정 확인 필요.
- **회전 안내 재표시**: rmSelectGuide만 hook — 다른 배경 선택 경로(촬영사진 등)는 미적용. 필요시 그 경로도 `window.__dennRotHintShowV()` 호출.
- **실폰 가로 진짜 전체화면 아님**: 주소창/하단 브라우저 버튼 잔존(Fullscreen API 미사용). 별 이슈로 남김.
- **소비자 세로 조절이 가로에 안 이어짐**: 설계상 정상(가로=운영자 base). 분리 원하면 신규작업.

---

## 3. 실폰 테스트 환경 (★내일 이어가는 법)

### 현재 켜져있는 것 (PC 끄면 다 죽음)
- **dev 서버**: `_denn-devserver.py`(no-cache) on `localhost:8000` (PID 3932). `DENN작업시작.bat` 또는 `start-dev.ps1`로 실행.
- **cloudflared 터널**(PID 61420): `C:\Users\써드플로어\tools\cloudflared.exe tunnel --url http://localhost:8000` → 공개 URL `https://arab-compensation-driven-due.trycloudflare.com` (★임시 — **재시작하면 URL 바뀜**).
- **데이터**: 운영자가 PC어드민(터널주소)서 `dennShareCreate()` → Firebase에 올린 JSON → 폰이 `#share=` URL로 import → 폰 localStorage(터널 origin)에 저장.

### ★PC 끄면 모바일 테스트 중단됨 (서버·터널 둘 다 PC에서 돎). 내일 재개 절차:
1. PC 부팅 → **dev 서버 켜기**: `DENN작업시작.bat` (또는 `cd C:\repo\denn-products; .\start-dev.ps1`). 8000 확인.
2. **터널 켜기**: `& "C:\Users\써드플로어\tools\cloudflared.exe" tunnel --url http://localhost:8000` → 출력의 `https://<랜덤>.trycloudflare.com` URL 복사.
3. **데이터 재전송**(새 터널 origin=새 localStorage라 재import 필요): PC에서 그 **새 터널 URL의 어드민**(`https://<새URL>/denn-admin.html`) 열고 → (필요시 JSON 가져오기) → 콘솔 `dennShareCreate()` → 공유 URL을 폰으로 → 폰서 열어 import → "내 공간에서 보기".
4. 테스트 시 캐시 의심되면 URL 끝에 `?x=숫자` (no-cache 서버라 보통 새로고침이면 됨).

### ★더 편한 대안 (URL이 매번 안 바뀌게)
- **GitHub Pages 배포**: repo가 이미 push돼 있음 → Pages 켜면 `https://sorrow6970-rgb.github.io/denn-products/denn-mockup-tool.html` **고정 URL**, PC 안 켜도 됨. 단 저장소 public 전환 + 어드민 페이지 공개됨(주의). 데이터는 `?space=`/`?share=`(Firebase)로 동일.
- **named cloudflare tunnel**(계정 설정): 고정 도메인. quick tunnel은 매번 랜덤.
- 둘 다 Firebase(데이터)는 외부라 origin 무관하게 작동.

### 터널 종료(오늘 끝)
`Stop-Process -Id 61420 -Force` (또는 PC 끄면 자동). 공개 노출 닫기.

---

## 4. 참조
- 오전 핸드오프: docs/2026-06-30-session-handoff.md
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[reference_devserver_nocache]]
- 안정기점 `54e258d`. 이번 세션 시작 `f5a5c0c`(롤백 직전 WIP+docs).
- 핵심 함정: 룸 캔버스 사이저 5중(rmSizeCanvas3+V106+V107) · DPR 캔버스서 고정px 드로잉 ctx.scale 보정 · `__userMoved` 거짓양성(force OFF) · 터널 URL 매번 랜덤.
