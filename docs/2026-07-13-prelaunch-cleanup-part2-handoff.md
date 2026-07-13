# 2026-07-13 핸드오프 (part2) — 배치2·3 완료(wip) + 세로 전체화면 튐 진행중

> 소비자/관리자: **https://design.dennproducts.com** (루트 `/` → denn-mockup-tool.html)
> 배포: `cd C:\repo\denn-products && FIREPIT_VERSION=1 firebase deploy --only hosting --non-interactive`
> wip 테스트 채널: `firebase hosting:channel:deploy wip --expires 30d --non-interactive` → **https://denn-products--wip-cxz2mnnb.web.app**
> firebase는 `%APPDATA%\npm` (PATH 추가). 로그인=sorrow6970@gmail.com.
> ★캐시: wip 검증은 **매번 새 `?v=숫자`**(모바일 캐시가 옛 코드 서빙). 진단은 `?fsdbg=1`.

---

## ⚠️ 배포 상태 (중요)
- **프로덕션(design.dennproducts.com) = 배치1까지만 라이브** (태그 `prelaunch-batch1-20260713`).
- **main/origin = 배치1+2+3 + 전체화면 튐 수정(진행중)** 까지 커밋·push됨. **아직 프로덕션 미배포.**
- **wip 채널 = main 최신(진단 오버레이 포함)**.
- 즉 배치2·3 + FS수정은 **main엔 있으나 프로덕션엔 없음**. 검증 후 `firebase deploy`로 프로덕션 반영해야 함.

## ✅ 이번 세션 완료 (커밋됨)
### 배치1 (프로덕션 배포 완료)
- 감사 #2(share 쿼터폭탄)/#6(틴트캐시 누수)/#17(죽은 pw폼)/#20(인터벌 폴링)/#21(콘솔스팸)/#22·#23(selIdx) + 죽은 stage5 삭제. 상세=[[project_prelaunch_bug_audit]], `docs/2026-07-13-prelaunch-cleanup-handoff.md`.

### 배치2 (main/wip, 프로덕션 미배포)
- `3cc1526` #9 share reload IDB 무한대기 방지(finalize 1회-가드+1.5s 폴백) · #8 resize 재렌더 140ms 디바운스.
- #7(빈문구 삭제)=제품결정으로 **현재유지(수정안함)**. #4·#5·#12=**배치4로 미룸**(회전/드래그/사이저 지뢰밭).

### 배치3 (main/wip, 프로덕션 미배포)
- `5ffd0e9` #3(high) mergeAdminStateSafe **배열개수점수→리비전(__cloudRev/__opRev) 기반 스칼라 병합**(배열은 union+tombstone 유지, rev없/같으면 점수폴백). #11 resetAll DEF 직접영속+reload. #19 importJSON DEF 백필. #16 편집중 가이드그리드 재렌더 defer.
- `ace97a5` #10 소비자 LS 쿼터초과 백업정리+재시도+토스트(reload루프 금지). #18(클라우드 RMW)=아키텍처변경이라 **보류**.

## 🔧 세로 전체화면 튐 (진행중 — 다음 세션 핵심)
사용자 보고: **세로 전체화면 진입/종료 양쪽 모두 렌더링 튐**. 실기기=카카오 인앱브라우저(CSS전용 FS, 네이티브 FS 미사용).

### ★진단(온스크린 `?fsdbg=1` 오버레이 + 스샷 2장으로 확정)
- **캔버스 크기는 불변**(cv 1439x3115 백킹 / 411x890 표시). 캔버스는 리사이즈 안 됨.
- 캔버스(890)가 뷰포트(731)보다 커 **세로 스크롤**. 전체화면 토글이 **canvas-area 높이 `ar`을 672↔731로** 바꿈(메뉴 숨김/표시) → **액자의 스크롤 위치가 튐**.
- 진입엔 **마스크 자체가 없었고**(로그 `[----]→[-A--]`, E 없음), 종료 마스크(`dennFsExitRevealV`)는 **스크롤 앵커 재조정을 안 함**.

### 시도한 수정 (미커밋 working tree, wip 배포됨, 사용자 검증 대기 중)
1. `dennFsRevealV`(구 dennFsExitRevealV 일반화, L~14665): 흰 마스크 → 뷰포트/ar 치수 연속3프레임 안정 대기 → rmSizeCanvas+rmRender → **★스크롤 앵커 재조정(`dennPortraitFrameAnchorTopV`, 회전 경로와 동일)** → 노출. 1200ms 폴백.
2. 진입 버튼(`fsPBtn` L~14101): setRoomFullscreenLayout(true) **전에 마스크 추가** + 끝에 `dennFsRevealV()` 호출.
3. 종료 버튼(`rm-fs-exit-float` onclick L~3760): 마스크 추가 + `__dennFsExitRevealV`(=dennFsRevealV 별칭) 호출.
- **★검증 필요**: wip `?fsdbg=1&v=713f`에서 진입·종료 양쪽에 `[--E-]` 마스크가 뜨고 앵커 후 노출되어 튐이 사라지는지. 사용자 재측정 스샷 대기 중이었음.

### 이전 실패 시도(참고)
- 1차 `2a4bf83`: 종료 버튼에 dennGatedRevealV 페이드 게이트 → 실패(이미지게이트라 조기노출).
- 2차 `f149b7f`: dennFsExitRevealV 정착감지 노출(앵커 없음) → 실패(스크롤 앵커 미조정 + 진입 미처리).

### ⚠️ 진단 오버레이 정리 필요
- `?fsdbg=1` 온스크린 진단(파일 맨끝 `</body>` 직전 script)은 **임시**. FS 튐 해결 확인 후 **제거**할 것(gated라 프로덕션 무해하나 잔존 금지).

## 다음 세션 순서
1. 사용자 재측정 스샷으로 FS 수정 검증 → 되면 진단 제거 후 커밋.
2. **배치2·3 + FS수정 프로덕션 배포** (검증 완료분).
3. 배치4 단독 세션: #1(세로저장 revert 지뢰밭, 무한재귀 금지) + #4·#5·#12(회전/드래그/사이저). #18(클라우드 RMW). PLAUSIBLE 11건.

## ★교훈
- 회전/전체화면 튐은 **정적추론 2번 다 실패 → 온스크린 진단(스샷)으로 원인 즉시 확정**. 메모리 불변식 재확인(실기기 계측 우선). [[project_mobile_pc_guide_settings_attempt]]
- 주석 안 `*/` 금지(#10에서 `pre_share_*/pre_cloud_*`가 블록주석 조기종료 → node --check로 잡음). 모든 커밋 전 `synccheck.py`(scratchpad)로 인라인 스크립트 구문검증.
