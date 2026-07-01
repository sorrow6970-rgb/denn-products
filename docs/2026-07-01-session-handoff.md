# 2026-07-01 세션 핸드오프 — 사이즈기준위치(하단앵커) + 전체화면 버튼 + ★가로 미해결

> HEAD = **`5545f52`** (push됨). 안정 체크포인트 = **`6a238ad`**. 백업 태그 = **`backup-20260701-before-sizeanchor`**(`81ab882`).
> 관련 메모리: [[project_image_anchored_frame]] [[project_mobile_pc_guide_settings_attempt]] [[reference_devserver_nocache]]

---

## 1. 오늘 커밋 순서
| 커밋 | 내용 | 상태 |
|---|---|---|
| `4e6307a` | 조작 후 회전 시 액자 위치 유지(image-anchor touched-case) + 광원 표식 확대(DPR) | ✓ |
| `81ab882` | 가로 스크롤바 두껍게(16px)+안으로(right22) + 광원표식 DPR 동일크기. **백업 태그 지점** | ✓ |
| `8290bd0` | **사이즈기준위치(하단앵커)** — `frameAnchorRefCmH`(기준cm) 저장 + 소비자 cm기반 핀 + sgDraw 하단정렬 + force 전달 | 세로✓/가로⚠️ |
| `6a238ad` | **전체화면 보기 버튼**(가로잠금)+X + drawFallback 안내문 제거 + 버튼 상단배치 + 사이즈앵커 세로게이트. **안정 체크포인트** | ✓ |
| `5545f52` | 배경선택=운영자값 즉시(um 리셋) + 가로 하단앵커 게이트 개방 | um리셋✓/**가로 안됨** |

---

## 2. 작동 확인된 것
- **광원(햇빛) 표식**: DPR 기준 동일 크기(세로/가로 무관). drawSun L3785.
- **가로 스크롤바**: 두껍게+안으로.
- **전체화면 보기 버튼**: "가로로 돌리세요" 안내 대체. 탭=진짜 전체화면+`screen.orientation.lock('landscape')`(영상형). **X=세로복귀+전체화면해제**(순서: portrait 잠금→300ms→exitFullscreen, exitRotateFs 내). 물리회전(rotate-fs) 병행. iOS 미지원 폴백. `dennEnterFsLandscapeV` + hint()→버튼. 사용자 "2번 정상" 확인. ⚠️PC DevTools 모바일에뮬은 Fullscreen/orientation.lock 미흉내 → 거기선 오작동(실폰만 유효).
- **사이즈기준위치(하단앵커) — 세로만**: 운영자가 A2로 '하단' 설정 → 소비자가 B5/A4/A3 골라도 하단 라인 유지. **세로 검증 완료**(refH=60·iy=0.54 도착 시 액자 선반에 딱, 사용자 "하단유지된다").
- **배경 선택 = 운영자 저장값 즉시**(`5545f52`): rmSelectGuide 진입 시 um 리셋 → 기본설정으로 안 눌러도 됨. (um 리셋 자체는 세로 검증)

---

## 3. ★★ 미해결 (다음 세션 핵심) — 가로(landscape) 액자 하단앵커/위치가 PC값과 다름
### 증상
소비자 **가로 전체화면**에서 액자가 ① 하단앵커 안 걸리고(사이즈 바꾸면 중앙기준) ② 위치가 운영자 PC 저장값과 다름. `5545f52`에서 가로 게이트를 열었으나 **여전히 안 됨(사용자 확인)**.

### 근본(누적 분석)
- 운영자는 **세로형 편집기(폰박스)** 에서 세팅, 소비자 **가로**는 배경 cover 크롭이 완전히 다름.
- 도구의 **사이즈 가이드(자)가 캔버스 기준**(이미지 앵커 아님) → 크롭 다르면 방 대비 액자 cm 비율이 달라짐.
- 가로 캔버스 사이저 다중(rmSizeCanvas 3분기 + V106 + V107 rotate-fs) → 컨텍스트별 measureBase/bgRect 상이.
- 세로에선 cm기반 핀 + image-anchor(frameImgY)가 잘 맞으나, 가로는 이 조합이 안 맞음(정확 원인 미확정 — 다음 세션 진단 필요).

### 다음 세션 진단법 (오늘 효과 본 방법)
- **`?dbgUM=1` 온스크린 오버레이**를 다시 넣어 가로에서 측정. 오늘 쓴 로그 필드(drawFrame anc[]):
  `anc[P/L] um= ay= cmH= refH= fh= fy= sz= sg= mb= cv= iy= bg= op=`
  - 코드 스니펫(오늘 제거함, 재삽입용): RM 정의 직후 오버레이 IIFE(`window.__dennUMDbg`), drawFrame `RM.frameHit` 직전 anc 로그.
- 가로에서 `iy`(image-anchor 중앙), `refH`, `fh`, `mb`, `cv`를 세로와 비교 → 위치·크기 어긋남을 숫자로 확정.
- ★교훈: **이 영역은 화면만 보고 고치면 계속 빗나감**(오늘 수차례). 숫자로 측정 후 수정.

---

## 4. 사이즈기준위치 — 작동 원리 & 데이터 요건 (다음 세션 필수 이해)
### 저장(운영자)
- `currentSettingsV33`(L~3092): `frameImgX/Y`(중앙 이미지좌표) + **`frameAnchorRefCmH`**(기준사이즈 cm높이, ay≠0.5일 때만, `RM.__lastCmH` 사용). `frameSizeAnchor`(0~100).
- **운영자 SAVE 로그로 검증됨**: `base[anc=100 refH=60 iy=0.55]` 정상 기록. 저장은 정상.
### 소비자 적용
- force 블록(rmRender, `!um`): `RM.__opAnchorRefHV`=`__op.frameAnchorRefCmH`, `RM.__opImgPosV`=frameImgX/Y, rm-size-anchor 강제 전달.
- image-anchor 블록: 중앙을 frameImgY에 글루.
- drawFrame 핀(소비자, `!admin && !um && __opAnchorRefHV>0`): `cy += (ay-0.5)*(fhRef − fh)`, `fhRef=refCmH*pxPerCm*(sizePct/20)`. **소비자 자기 컨텍스트 계산이라 크롭 오차 상쇄**(A2=A2면 shift0). 세로는 이게 맞음.
### ★데이터 전달 함정 (오늘 최대 삽질 원인)
- **DevTools(운영자 localStorage 직접)=됨, 실폰(공유 import)=refH=0**이었음 → 소비자가 **운영자가 앵커 건 그 배경(guide bg, 예 `gb1780…`)을 선택**해야 그 프리셋이 걸림. **기본화면(default-room)엔 앵커 없음**.
- `dennShareCreate`는 `window.S` 통째 공유(필드필터 없음). 단 **운영자가 목업편집기 저장 후 denn-admin을 새로고침해야** window.S에 최신 refH가 실림.
- 소비자 `um=1`(기준스케일/위치 슬라이더 만짐)이면 force 꺼져 앵커 해제 → `기본설정으로`(dennReqMirrorV) 또는 배경 재선택(`5545f52`)로 um=0 복귀.

---

## 5. 폐기된 오진 / 실패 접근 (반복 금지)
- **"`__userMoved` 거짓양성"** = 오진(감시자로 반증). 미조작 시 절대 true 안 됨. um=1은 사용자가 슬라이더/드래그를 실제로 만졌을 때만. [[project_mobile_pc_guide_settings_attempt]] 갱신됨.
- **1차 사이즈앵커(`frameAnchorImgY`=하단모서리 이미지좌표 직접저장)** = A2 하향 밀림(픽셀오프셋 크로스컨텍스트 전달 오차) → 롤백. **cm 불변량 방식(frameAnchorRefCmH)이 정답**.

---

## 6. 별도 미착수 요청
- **사이즈 미선택+템플릿 선택 시 그 저장된 사이즈 자동 적용** (지금 템플릿 눌러도 반응 없음). 미착수.
- 가로 "PC값" 정밀 매칭(§3).

---

## 7. 복귀 지점 / 실폰 환경
- **안정 체크포인트 `6a238ad`**: 전체화면버튼·표식·스크롤바·사이즈앵커(세로) 다 작동, 가로 사이즈앵커 게이트=OFF(안전). 가로 개방(`5545f52`)이 문제면 `git checkout 6a238ad -- denn-mockup-tool.html`.
- 백업 태그 `backup-20260701-before-sizeanchor`(`81ab882`): 사이즈앵커 이전.
- dev서버 no-cache([[reference_devserver_nocache]]) + cloudflared 터널(URL 매번 랜덤). 오늘 터널=`each-pocket-catalogue-cat.trycloudflare.com`(재시작 시 바뀜). 공유=`dennShareCreate()`.

---

## 8. 다음 세션 작업 순서 (권장)
1. **`?dbgUM=1` 진단 오버레이 재삽입** → 실폰 **가로**에서 anc[] 측정(iy·refH·fh·mb·cv, 세로와 비교). 화면추측 금지.
2. 측정으로 가로 어긋남이 **위치(image-anchor)** 인지 **크기(cm↔canvas 매핑)** 인지 확정.
3. 위치 문제면: 가로 image-anchor(frameImgY→bgRect 매핑)가 PC값 주는지 검증 후 보정. 크기 문제면: 가로 pxPerCm/measureBase 일관성(캔버스 사이저 5중) 손봄.
4. 안 풀리면 **가로는 "전체보기 근사"로 수용**(세로=정밀), 또는 자(ruler) 이미지앵커화(대공사) 검토.
5. 별도: 템플릿→사이즈 자동적용(§6).
6. 검증 후 진단 제거 + 커밋.
★ 각 수정 전 체크포인트 커밋(오늘처럼) — 롤백 안전망.
