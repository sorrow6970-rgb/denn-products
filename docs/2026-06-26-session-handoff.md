# 2026-06-26 세션 핸드오프 — 액자 image-anchored(위치) + 메뉴/풀스크린/iPad배경/떨림 다수 근본수정 + PC/모바일 저장 분리 안정화

> 상태: **origin/main = `5a01b26`** (push 완료). **★보호 안정점 태그 = `stable-pc-mobile-save`** (=5a01b26).
> 긴 세션. net 효과: 기능 버그 다수 근본수정 + **액자 위치 image-anchored 구현** + **PC/모바일 저장값 분리 정상화**. universal(스케일글루+iPad일관)은 구현→불안정으로 **전량 롤백**.

---

## 1. 이번 세션 origin에 landed (작동·검증됨)

| 영역 | 커밋 | 핵심 |
|---|---|---|
| 메뉴 먹통/빈 시트 | `86b93c0` | v104 시트 탭 클릭 리스너 **중복 등록**(teardown/build 회전반복 누적, 짝수=먹통/홀수=X만)→`__dennSheetTabBound` 가드 |
| 풀스크린 잔류 | `665a138` | 세로서 `denn-room-fullscreen-active` 무조건 해제(모바일 세로=수동FS 불가→잔류는 항상 버그) |
| iPad 배경 과대확대 | `d48a0d4` | v106 0.462 폰캔버스를 **isRoomMobile(진짜 폰)만** 적용→iPad는 base(이미지비율) 경로 |
| 세로 배경 흔들림 | `c161b27` | 네이티브 세로 스크롤바 폭 피드백루프→스크롤바 숨김(clientWidth 안정화) |
| 진입/reveal 떨림 | `ab5aeee` | reveal `__ctr` 스크롤앵커가 재시도(5회)마다 정착중 scrollH/clientH 변동으로 다른 scrollTop(11~18 진동) 적용→260ms 페이드로 가리고 최종값 고정 |
| **액자 위치 image-anchored** | `0f21cf5`+`bb972ab` | 액자를 배경 cover 이미지 좌표(`frameImgX/Y`)에 글루→기기/화면비 무관 같은 방 지점. 저장 `dennComputeBgRectV` 즉석계산(렌더캡처 없어도 기록) |
| **PC/모바일 저장 분리 정상화** | `5a01b26` | 소비자 읽기를 맥락별 `__op`로(아래 ★제약) |

**위치 image-anchored 동작 확정(소비자 프로브):** `__opImgPosV` 활성, `RM.pos`가 기기별로 역산돼 같은 방 지점에 글루. **폰서 잘 됨(사용자 확인).**

---

## 2. ★★ 절대 깨지 말 것 — PC/모바일 분리(`5a01b26`)

소비자 force 블록(`rmRender` 내) 읽기:
```js
var __iaIx=__op.frameImgX,__iaIy=__op.frameImgY;   // __op = dennMergeMobileV 거친 맥락별값
//   세로(portrait) = .mobile / 비세로·PC = base
```
- `dennMergeMobileV`가 이미 맥락별로 정확 → 그대로 읽으면 **모바일=.mobile / PC=base** 분리.
- ★**a7f1535의 `.mobile 우선` 강제는 PC 저장(base)을 가려 제거했음.** 다시 .mobile-first로 바꾸면 PC 깨짐.
- **사용자 강력 요청: iPad 손대도 이 `__op` 읽기 불변.** iPad 대응은 *위에 태블릿 분기만* (`isTablet? .mobile : __op`). 전체 .mobile-first 금지.
- 저장 라우팅: `DENN_MOBILE_FIELDS_V`에 `frameImgX/Y` 포함 → PC모드=base, 모바일모드=.mobile. 정상.

---

## 3. 롤백된 것 (왜)

**universal(`1eb4d36`) = 스케일글루(`frameImgW`) + 배경위치 .mobile우선 통일.** 데이터상 스케일 작동(frameHit.w=opImgW×bgRect.w 폰·iPad 일치)했으나:
- **A1**(frameImg를 base 단일 통일): PC/모바일 분리를 깨고 frameCenterX(.mobile)/frameImgX(base) **split** 유발.
- **배경전환 튐**: forceMobileCenterStart 5회 재센터·loadSettingsV33·image-anchor derive가 전환 시 동시에 `RM.pos`를 다른 값으로 써서 충돌.
- **회전 떨림 재발**.
→ 사용자 결정으로 **bb972ab 베이스 전량 복원(`390673d`)** 후 PC/모바일만 안정화.

---

## 4. 다음 작업 (보류·사용자 합의)

### 4-1. 가로→세로 회전 떨림 (다음 핵심)
- watcher 확정: scrollTop이 **`101`(가로 센터머신: dennRotCenterLoopV step·__ctr 가로분기·rmSizeCanvas 가로사이징) ↔ `8`(세로 앵커: centerRoomCanvasScroll·__ctr 세로분기)** 교대.
- ★**진짜 원인 = 회전 도중 방향판정(`innerWidth>innerHeight`)이 가로↔세로로 깜빡임** → onChange가 가로를 재감지→`setRotateFs(true)`+`dennRotCenterLoopV` 재시작 → 101이 계속 부활.
- 단일지점 수정(`dennRotPreGateV`서 rotate-fs 제거+gen중단=`643f2e0`, A3 gen중단) **안 먹음**(방향판정이 다시 가로로 깜빡이면 재시작).
- **해결방향: 방향판정 자체를 디바운스/커밋** — 세로로 전환 시작하면 짧은 창 동안 가로 재감지 무시(commit guard), 또는 onChange의 orientation을 안정될 때까지 적용 보류. + 전환 전체를 페이드로 확실히 가림.
- 진단: `scrollTop` defineProperty watcher(아래 §6).

### 4-2. iPad 구도/읽기
- 현재 iPad(비세로) = base 읽음(=PC값). 운영자 모바일(.mobile) 설정을 iPad에 반영하려면 **"태블릿일 때만 .mobile"** 분기 추가(§2 제약 준수, PC/모바일 불변).
- 태블릿 판정: isRoomMobile=false인데 터치+폭 768~1024 등. iPad 구도는 사용자 합의 "PC 축소판(배경 이미지 비율)" 유지.

### 4-3. 스케일 글루 재도입
- `frameImgW=fw/bgRect.w` 저장→소비자 `fw=frameImgW×bgRect.w`. universal서 데이터상 작동했으나 롤백됨. 재도입 시 §2 제약 + 충돌 세터 정리 동반.

### 4-4. ★사이즈 기준위치(frameSizeAnchor) 미작동 — 이전엔 정상(회귀)
- **기능**: 액자 **크기(rm-size) 변경 시 앵커점(상/중/하, `rm-size-anchor` 0~100)을 기준으로 액자를 핀**(재센터 대신 그 점 고정). **관리자 편집모드 전용**(`dennIsAdminSetupV` 게이트).
- **코드**: `drawFrame`의 `__ay`/`RM.__anchorYabs` 블록(L~4021-4031): 크기 변동 시 `cy=RM.__anchorYabs*H-(__ay-.5)*fh`로 cy 재계산. 캡처=`RM.__anchorYabs=cyp+(__ay-.5)*(fh/H)`. **리셋 지점**=`applySettingsV33`(L3156 `RM.__anchorYabs=null`)·`setVal('rm-size-anchor')`. UI=`#rm-size-anchor-row`(L465, admin만 표시).
- **의심**: ① 이번 세션 다수 재렌더/재로드(`loadSettingsV33`·image-anchor 빈발)가 `RM.__anchorYabs`를 자주 null로 리셋해 핀 무력화. ② 앵커 블록 조건(`Math.abs(sizePct-RM.__anchorSize)` 비교)이 안 맞아 재계산 분기 미진입. ③ rollback(bb972ab) 전후 차이.
- **다음 세션 조사**: 언제 깨졌는지(`stable-pc-mobile-save` vs 그 이전 — 이번 세션 변경 전후), `RM.__anchorYabs` 값 추적(defineProperty watcher), 크기 변경 시 cy 재계산 분기가 도는지. **목표 = 이전 정상 동작 복구.** (사용자: "정상작동하던 것".)

---

## 5. 롤백 태그 (복원점)
- `stable-pc-mobile-save` = `5a01b26` ★현재 안정(PC/모바일 저장 정상).
- `rollback-20260626-before-A` = `1eb4d36` (universal 직후, A 직전).
- `rollback-20260626-before-universal` = `bb972ab` (위치 image-anchor만).
- `rollback-20260626-imageanchor-pos` = `ab5aeee` (떨림·메뉴 등 해결, image-anchor 직전).
- 복원: `git reset --hard <태그>`.

---

## 6. ★ 진단 도구·교훈
- **scrollTop 세터 watcher**(defineProperty+stack)로 떨림 단일범인 확정 — 추측 금지. 캐시는 `?v=숫자`.
- **데이터 진단 읽기전용**(localStorage.setItem/Storage후킹/RM상태변경 금지). 저장 ~1.3s 지연.
- ★**fragile 룸/회전/저장 시스템 — 한 곳 고치면 다른 곳 깨짐**(이번 세션 다수 발생). **한 번에 하나만 + 충분 검증 + 보호태그** 원칙. 무리한 통일/덧대기 금지.
- image-anchor: `frameImgX`는 이미지 콘텐츠 비율이라 배경 위치차와 무관하게 같은 방 지점 매핑(불변). 레거시(frameImgX 없음)는 글루 안 함=기존 동작.

## 7. 참조
- 직전: docs/2026-06-24-session-handoff.md
- 메모리: [[project_image_anchored_frame]] [[project_mobile_pc_guide_settings_attempt]]
- 핵심 커밋: `5a01b26`(PC/모바일) · `0f21cf5`/`bb972ab`(위치 image-anchor) · `86b93c0`(메뉴) · `ab5aeee`(진입떨림) · `d48a0d4`(iPad배경)
