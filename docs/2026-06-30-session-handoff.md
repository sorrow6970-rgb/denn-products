# 2026-06-30 세션 핸드오프 — WIP 무한행 회귀 롤백 + dev 서버 no-cache 영구화

> 상태: **HEAD = `e08168b`** (커밋 2개, push 대기). 작업트리 깨끗.
> 안정 기점 = **`54e258d`** (denn-mockup-tool.html이 이것과 바이트 동일).

---

## 1. 무슨 일이었나

운영자 편집기(`?adminRoomSetup=__denn_room_common_default__`)를 열면 **"응답 없는 페이지"**(메인스레드 행). "공통 기본값 설정 버튼 자체가 안먹어"도 같은 원인 — 행 걸린 편집기 탭이 같은 렌더러 프로세스의 관리자 탭까지 멈춤으로 끌고 감(같은 origin 탭 프로세스 공유).

### 근본원인 ① — 무한 상호재귀 (WIP `606f3ad` 회귀)
- `606f3ad`가 `dennIsMobileEditCtxV`에 `... && window.isRoomPortrait()` 분기 추가.
- 그런데 `isRoomPortrait()`(L3589)·`isRoomMobile()`(L3588)이 **내부에서 다시 `dennIsMobileEditCtxV()`를 호출**.
- → `dennIsMobileEditCtxV → isRoomPortrait → dennIsMobileEditCtxV → …` **무한 재귀**.
- **`dennIsAdminSetupV()==true`(운영자 편집기)에서만 발동** → 소비자/실폰은 정상(06-29 ground truth가 실폰서 멀쩡히 측정된 이유).
- ★**불변식**: `dennIsMobileEditCtxV`는 절대 `isRoomPortrait`/`isRoomMobile`을 호출 금지(둘이 역방향 호출). 방향 필요 시 편집컨텍스트 안 되묻는 순수 뷰포트 검사 인라인.

### 근본원인 ② — 브라우저 디스크 캐시 (행이 안 풀리던 이유)
- 코드를 안정버전으로 복원하고 Chrome 전체 재시작해도 동일 행 지속.
- 원인=`python -m http.server`가 `Cache-Control` 미전송 → Chrome 휴리스틱 디스크 캐시가 옛 HTML(606f3ad, 재귀 버그)을 **서버에 묻지도 않고 서빙**(브라우저 재시작에도 잔존, SW 없음).
- 확인=`&v=fix1`(새 URL=새 캐시키)로 우회하니 즉시 정상 로드. = 서버/디스크 코드는 정상, 브라우저가 서버를 안 거치고 있던 것.

---

## 2. 처리 (HEAD `e08168b`)

- **`06940fa` revert(mockup)**: `git checkout 54e258d -- denn-mockup-tool.html` — 깨진 WIP 변경(전부 이 파일 한 개)을 안정버전과 **바이트 동일**하게 복원. WIP는 `606f3ad`에 보존(재시도 시 위 재귀 함정 회피).
- **`e08168b` fix(devserver)**: `_denn-devserver.py` 신설(`Cache-Control: no-cache, no-store, must-revalidate`+Pragma/Expires, ThreadingHTTPServer). `start-dev.ps1`의 python 분기를 `-m http.server` → `_denn-devserver.py` 호출로 교체(파일 없으면 폴백). **이제 새로고침만으로 항상 최신 코드.** 서버 재시작 완료(8000, no-cache 헤더 검증됨).

---

## 3. 다음 세션이 해야 할 것

1. **(사용자 액션) 남은 stale 캐시 1회 flush**: 정상 URL(`localhost:8000/denn-admin.html`, 편집기)에서 **`Ctrl+Shift+R` 한 번**. 이후로는 no-cache라 일반 새로고침으로 항상 최신.
2. **편집기 정상 동작 재확인**: 배경·캔버스 정상 렌더 + 멈춤 없음(=`54e258d` 검증 상태 복귀).
3. **햇빛/그림자/기울기 PC·모바일 분리(원 작업) 재시도** — 단, 위 ① 불변식 지키며. 06-29 핸드오프의 설계·미해결(저장판정≠읽기판정, force 매렌더 재강제)이 출발점. `606f3ad` diff 참고하되 `dennIsMobileEditCtxV` 재귀는 반드시 회피.
4. `git push`(미실행) 여부 결정.

---

## 4. 참조
- 직전: docs/2026-06-29-session-handoff.md (원 분리 작업 설계/미해결)
- 메모리: [[project_mobile_pc_guide_settings_attempt]] [[reference_devserver_nocache]]
- 안정 기점: `54e258d`. WIP: `606f3ad`.
