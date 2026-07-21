# 현재 상태

상태: **✅ 스펙 002·003 자동/실기기 4환경 재검증 PASS — 확대 접근성·Canvas 3:4 FAIL 해소, 다음 작업 = 카라멜 앰버 반영 스펙**

> 기본 배율 1~14: iPhone Safari·Samsung Internet·카카오 인앱 = 전체 **PASS**(Android Chrome NOT TESTED). 자동검증 Codex 승인 기준 HEAD `f4dae95`.
> **확대(200%/핀치) 접근성 게이트:** 최초 4환경 공통 FAIL을 발견했으나 스펙 002 수정·재검증으로 해소.
> **스펙 002 구현 완료(로컬):** 순수 `computeViewportLayout(scale>1.01→isZoomed, keyboardInset=0)`로 확대/키보드 구분 → `.page[data-zoomed]`로 확대 시 `.bottomnav` fixed→흐름 전환 + `.content` 120px 예약여백 정상화 + 키보드 inset 오인 제거. 색상·sheet·역스케일 미변경. 자동검증 typecheck 0 / unit 30 / build(JS gzip 66.44KB) / e2e 11 통과.
> **스펙 002 실기기 완료:** iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 확대 재검증 전부 **PASS**. 접근성 확대 FAIL 해소.
> 색상 결정 복구: **카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA` 확정**. POC 코드·테스트·PNG 반영은 별도 후속 색상 스펙(스펙 002 구현에 미혼합).
> **스펙 003 실기기 완료:** 4환경 세로↔가로 Canvas `3:4`·DPR 재검증 전부 **PASS**. 카카오 가로 FAIL 해소. Android Chrome 전체 1~14는 여전히 일부 미검증이지만 확대·Canvas 게이트는 PASS 근거 확보.

## 현재 결론

- 기존 운영 HTML과 Hosting 경로는 그대로 유지한다(무변경 확인).
- 신규 리빌드는 별도 디렉터리에 추가한다. POC = `poc/platform-compatibility/`(삭제 가능).
- Modern Studio(B) 디자인 방향은 확정됐다.
- 기술 스택은 아직 후보이며 전체 스캐폴드 승인이 나지 않았다.
- 001 POC가 구현되고 로컬 자동검증을 통과했다.
- **Tailwind v4 기능 근거는 4환경에서 확보됨.** 최종 v4/v3.4 결정은 카라멜 앰버 반영 후 사용자 승인 대기.

## 브랜치/기준

- 작업 브랜치: **`rebuild/modern-studio`** (HEAD는 아래 커밋). main(`805b61d`)·production(`df856db`, 태그 `prod-baseline-20260721`) 무변경.
- production 비교 기준 태그: `prod-baseline-20260721`.

## 001 POC — 완료(로컬)

- 정확 버전(npm registry): React 19.2.7 / react-dom 19.2.7 / Vite 8.1.5 / @vitejs/plugin-react 6.0.3 / TypeScript 7.0.2 / tailwindcss·@tailwindcss/vite 4.3.3 / vitest 4.1.10 / @playwright/test 1.61.1 / @axe-core/playwright 4.12.1 / @types/react 19.2.17 / @types/react-dom 19.2.3. 라이선스 전부 MIT/Apache(axe MPL, devDep).
- 패키지 매니저: npm(`npm ci` frozen). pnpm 미설치라 POC는 npm 사용(README에 근거).
- 자동검증 PASS: `npm ci` / `tsc --noEmit`(strict) / `vitest`(10/10) / `vite build`(JS gzip 65.5KB·CSS 3.3KB) / `playwright`(viewport 10/10).
- ★ 명암비 발견: 흰색/테라코타 `#C0614A` = **4.16:1**(일반텍스트 AA 미달, AA-large/UI 통과). 토큰 미변경, 대안 계산 제안(`#B85A44` 4.58:1 등) — spec §3.
- 접근성: scrollable-region-focusable 해결. color-contrast는 토큰 발견사항으로 기록(하드페일 제외).

### Codex 1차 판정 "수정 후 재검증" — 3건 보완 완료 (POC 범위 내)
1. **orientation lock 실제 시도**: `fullscreen.ts`에 순수 `orientationLockPlan(supported, inFullscreen)` + 컨트롤러가 상태 'active'(전체화면 확인) 후에만 `screen.orientation.lock('landscape')` 시도. 미지원/거부/실패는 비치명적으로 결과만 관측(`OrientationLockResult`), 화면(섹션 E)에 표시. 종료(settling)·detach 시 unlock. 단일 권위·추가 timer 없음. 유닛 3건 추가(총 13/13).
2. **LAN 주소 고정 제거**: device-matrix에서 특정 IP를 기준으로 기록하지 않고 `http://<현재-PC-LAN-IP>:4173` + 현재 IP 확인 안내(예시 IP는 예시로만 명시).
3. **NOT TESTED 명확화**: 14항목·메타 표 바로 위에 "빈 셀=NOT TESTED, 실제 결과 전 PASS/FAIL 금지" 규칙 명시.
- 재검증: typecheck/unit(13)/build(JS gzip 66.1KB)/e2e(10/10) 전부 통과. 운영파일 무변경.

### Codex 2차 판정 "수정 후 재검증" — orientation lock 비동기 종료 경합 1건 보완
- 문제: `so.lock('landscape')` await 중 FS 종료·detach 시, 늦은 성공이 stale하게 `locked`/결과 `locked`를 복원 + 종료 후 결과가 `locked`에서 안 풀림.
- 수정(`fullscreen.ts`): (1) 세대 토큰 `lockGen`(모든 시도 시작 시 ++, 종료·detach 시 ++로 무효화). (2) 순수 `isLockStillValid({attemptGen,currentGen,detached,state,inFullscreen})`로 Promise 완료 시 재확인 — 유효할 때만 `locked` 기록. (3) 늦은 성공(무효)은 `releaseOrientation()`으로 안전 unlock. (4) 종료(settling) 시 결과 `locked→idle` 초기화. (5) `detached` 플래그로 detach 후 `setLockResult`/`dispatch` 통지 차단. 단일 권위·단일 rAF 유지, 임의 timer 없음. 경합 유닛 5건 추가(총 18/18).
- 재검증: typecheck/unit(18)/build(JS gzip 66.25KB)/e2e(10/10) 통과. 운영파일 무변경. **실기기 lock 동작은 NOT TESTED 유지.**

### Codex 3차 판정 "수정 후 재검증" — React StrictMode 재attach 생명주기 1건 보완
- 문제: StrictMode(dev)가 effect를 attach→detach→attach로 재실행. `detach()`가 `detached=true`로 두는데 `attach()`가 복구 안 해, 재attach 후 `dispatch`/`setLockResult`가 계속 조기 return → FS 관측·lock 처리 비활성.
- 수정(`fullscreen.ts` attach): (1) 재attach 시 `detached=false` 복구. (2) `lockGen++`로 새 세션 시작(이전 세대 in-flight lock은 `isLockStillValid`로 계속 무효 — 세대 분리 유지). (3) 단일 attach 정책: 기존 handler 제거 후 등록. (4) 각 detach는 자기 handler만 제거(클로저 캡처). 임의 timer 없음.
- 테스트: `tests/unit/fullscreen-controller.test.ts`(DOM 목, attach→detach→attach 재활성·단일 listener·중복 attach 3건) + `tests/e2e/fullscreen.spec.ts`(FS 버튼 클릭 → 상태처리/정상 fallback 관측, 실제 FS 성공 강제 안 함).
- 재검증: typecheck/unit(**21/21**, 3파일)/build(JS gzip 66.27KB)/e2e(**11**: viewport 10 + fullscreen 1) 통과. 운영파일 무변경. **실기기 NOT TESTED 유지.**

## 실기기 검증 — 완료(3환경) / Android Chrome 대기

- **완료(2026-07-21, 사용자 수행 · Codex가 device-matrix 기록):**
  - iPhone Safari = 1~14 **PASS**. `fullscreenEnabled=false`·`orientation.lock=false`지만 정상 fallback. CSS.supports 전부 지원.
  - Samsung Internet = 1~14 **PASS**. 전부 정상. CSS.supports 전부 지원.
  - 카카오 인앱 웹뷰 = 1~14 **PASS**. Fullscreen 진입 성공(state=active), orientation lock 실패했으나 정상 fallback, 물리 가로 회전 시 가로 레이아웃 정상. CSS.supports 전부 지원.
- **대기: Android Chrome = NOT TESTED**(추정으로 PASS 금지).
- 증거: `KakaoTalk_20260721_210031114.png`, `_210414899.jpg`, `_210414899_01.jpg`, `_210705947.jpg`.
- 상세 기록: `poc/platform-compatibility/results/device-matrix.md`.
- LAN 접근(재현): `npm run preview -- --host` → `http://<이-PC-LAN-IP>:4173`(같은 Wi-Fi, 방화벽 승인 필요, 인터넷 비공개).

## 다음 작업

1. **별도 색상 반영 스펙** — 카라멜 앰버 `#B0894E` / `#C6A46B` / `#F2E9DA`를 POC·테스트·PNG에 일괄 반영하고 명암비 재검증.
2. **Tailwind v4/v3.4 확정** — 4환경 기능 근거를 정리해 Codex 판정 + 사용자 승인.
3. (선택) Android Chrome 나머지 기본배율 항목을 채워 전체 1~14 매트릭스 완성.
4. 이후 전체 스택 확정 → 다음 신규 스펙.
- **주의:** 팔레트 결정은 문서화됐지만 스펙 002 구현에 색상 변경을 섞지 않는다.

## 시작 조건

- (Android Chrome 검증 시) 사용자가 해당 기기에서 POC 접속·14항목 확인·결과 전달.
- LAN 접근 불가 시: 임시 HTTPS 채널 필요성·안전조치 보고 후 사용자 승인(임의 외부배포 금지).

## Claude Code 금지 (유지)

- 기존 HTML 이동·삭제·수정 / Firebase 연결 / 운영 데이터 접근·쓰기 / 전체 앱·모노레포 스캐폴드 / Preview·production 배포 / 근거 없는 Tailwind 버전 확정 / force push·reset --hard·clean·자동 merge.

## 검증 요청 형식

```text
검증 요청
커밋: <hash>
목적: <변경 목적>
변경 파일: <목록>
실행한 검사: <명령과 결과>
미검증: <항목>
남은 위험: <위험>
롤백: <방법>
```
