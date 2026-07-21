# 실제 기기 검증 매트릭스 — 001 플랫폼 호환성 POC

> 규칙(spec §6): **사용자가 실제 기기에서 검증하지 않은 항목은 추정으로 PASS 처리하지 않는다.**
> 데스크톱 Playwright/에뮬레이션은 실제 인앱 웹뷰 동작을 대체하지 못한다(spec RISK).
> Claude는 사용자가 전달하지 않은 기기/결과를 만들어내지 않는다. 아래 판정은 **모두 NOT TESTED**이며
> 사용자 실기기 결과를 받은 뒤에만 갱신된다.

---

## 로컬 LAN 접근 방법 (사용자 실행)

> ⚠️ **특정 IP를 영구 기준으로 기록하지 않는다.** LAN IP는 공유기·PC·네트워크에 따라 달라지므로
> **테스트할 때마다 현재 PC의 LAN IPv4를 확인해서 URL을 구성**한다.

1. **현재 PC의 LAN IPv4 확인** (아래 중 하나):
   - Windows: `ipconfig` → 사용 중인 어댑터의 `IPv4 주소` (보통 `192.168.x.x` 또는 `10.x.x.x`)
   - 또는 preview 실행 시 Vite가 출력하는 `Network:` 줄의 주소 사용
2. PC 터미널에서 POC 디렉터리로 이동 후:
   ```bash
   cd poc/platform-compatibility
   npm run build          # 아직 빌드 안 했으면
   npm run preview -- --host
   ```
3. 실기기(같은 Wi-Fi)에서 브라우저로 접속:
   **`http://<현재-PC-LAN-IP>:4173`**  (포트 4173 고정, `<현재-PC-LAN-IP>`는 1번에서 확인한 값)
   *예시*: `http://192.168.0.31:4173` — 이 값은 **예시일 뿐 고정 기준이 아니다.** 반드시 현재 값으로 대체.
4. 테스트 동안 **터미널을 열어 두어야** 합니다. 종료 = 터미널에서 **Ctrl + C**.
5. 최초 실행 시 **Windows 방화벽이 Node.js 허용을 물으면 사용자가 승인**해야 LAN 접근됩니다(자동 처리·규칙 추가 안 함).
6. 노출 범위: **같은 Wi-Fi(LAN) 내부에서만** 접근 가능. 인터넷 공개 아님(라우터 포트포워딩·외부 HTTPS 터널은 사용자 승인 없이 안 함).
7. 서빙 대상: **`poc/platform-compatibility/dist`만**. 기존 앱·Firebase·운영 데이터와 무관.

카카오 인앱 브라우저는 URL을 카카오톡 대화(나에게 보내기 등)로 보내 열면 됩니다.

---

## 기기별 14항목 체크

> **⚠️ 규칙: 아래 두 표(14항목·기기 메타)의 모든 빈 셀은 `NOT TESTED`를 의미한다.**
> 현재 상태는 **전 셀 NOT TESTED**이며, 사용자가 실기기에서 확인한 실제 결과를 전달하기 전에는
> 어떤 셀도 `PASS`/`FAIL`로 채우지 않는다(추정·창작 금지). 실제 결과 전달 시 해당 셀에 `PASS` 또는 `FAIL`만 기입한다.

각 기기에서 아래를 확인하고 결과를 적어 주세요(빈칸 = NOT TESTED).

| # | 확인 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱 |
|---:|---|:---:|:---:|:---:|:---:|
| 1 | 첫 화면 정상 로드 | PASS | | PASS | PASS |
| 2 | 좌우 가로 스크롤 없음 | PASS | | PASS | PASS |
| 3 | 텍스트/버튼 잘림·밀림 없음 | PASS | | PASS | PASS |
| 4 | 작은 화면에서 버튼 누를 수 있음 | PASS | | PASS | PASS |
| 5 | 세로↔가로 회전 후 레이아웃 정상 | PASS | | PASS | PASS |
| 6 | 상·하단 safe-area 침범 없음 | PASS | | PASS | PASS |
| 7 | 주소창 표시/숨김 시 높이 안 깨짐 | PASS | | PASS | PASS |
| 8 | 입력 포커스 시 키보드가 버튼/입력 안 가림 | PASS | | PASS | PASS |
| 9 | 키보드 닫은 후 레이아웃 복구 | PASS | | PASS | PASS |
| 10 | Canvas 흐림·잘림 없음 (DPR 표시 확인) | PASS | | PASS | **FAIL**¹ |
| 11 | Fullscreen 지원 또는 정상 fallback | PASS | | PASS | PASS |
| 12 | orientation 미지원이어도 화면 안 깨짐 | PASS | | PASS | PASS |
| 13 | CSS.supports 배지 결과 (dvh/color-mix/@property) 기록 | PASS | | PASS | PASS |
| 14 | 콘솔/화면에 치명적 오류 없음 (오류 관측 카드) | PASS | | PASS | PASS |

### 기기 메타 (사용자 기록)
| 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱 |
|---|---|---|---|---|
| 기기명/모델 | 미기록 | | 미기록 | 미기록 |
| OS·버전 | 미기록 | | 미기록 | 미기록 |
| 브라우저·버전 | 미기록 | | 미기록 | 미기록 |
| 테스트 날짜 | 2026-07-21 | | 2026-07-21 | 2026-07-21 |
| CSS.supports (dvh/color-mix/@property) | 지원/지원/지원 | | 지원/지원/지원 | 지원/지원/지원 |
| 스크린샷/영상 파일명 | `KakaoTalk_20260721_210031114.png` | | `KakaoTalk_20260721_210414899_01.jpg` | `KakaoTalk_20260721_210414899.jpg`, `KakaoTalk_20260721_210705947.jpg` |
| **종합 판정** | **PASS** | **NOT TESTED** | **PASS** | **FAIL**¹ |
| 비고·재현 절차 | DPR 3, 402×714. Fullscreen·orientation lock 미지원 시 정상 fallback. | | DPR 3.5, 411×740. | 세로 기본배율은 정상이었으나 **가로 화면에서 #10 Canvas 비율 FAIL(¹)** → 종합 FAIL로 정정. DPR 3.5, 411×731. Fullscreen 진입 성공, orientation lock 실패 후 정상 fallback. 물리 회전 시 레이아웃은 정상이나 Canvas 비율 깨짐. |

¹ **카카오 인앱 가로 화면 Canvas 비율 FAIL** — 아래 "Canvas 비율(3:4) 게이트" 참조. 기존 카카오 #10·종합 PASS를 정정. iPhone/Samsung은 가로 Canvas 비율 별도 미검증(추정 정정 안 함, 아래 위험 참조).

## 확대(200%/핀치) 접근성 게이트 — **FAIL** (기본배율 14항목과 별도)

> 접근성 결정서(`docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`) §4 "브라우저 확대 200%에서 핵심 기능 유지" / §14 출시 차단 "200% 확대 사용 불가" 게이트.
> 기본 배율 1~14 PASS와 **무관하게** 아래 결함으로 **FAIL** 기록.

| 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱 |
|---|:---:|:---:|:---:|:---:|
| 핀치/200% 확대 시 하단 고정 CTA 핵심기능 유지 | **FAIL** | **FAIL** | **FAIL** | **FAIL** |

- **증상(4환경 공통 재현):** 핀치 확대 시 `position:fixed` 하단 CTA(`.bottomnav`)가 과도하게 커지고 좌우가 잘리며 본문을 크게 가림. 브라우저 한정이 아닌 **POC 공통 레이아웃 문제**.
- **증거:** `KakaoTalk_20260721_212105638.jpg`.
- **원인(요약):** 브라우저 표준 핀치 확대 동작과 POC의 `position:fixed` 하단 CTA 레이아웃 선택 사이의 **호환성 결함**(`position:fixed`가 레이아웃 뷰포트 기준이라 확대 시 커지고 덮음). 특정 브라우저 버그 아님. 상세는 001 핸드오프 "확대 접근성 결함 분석" 참조.
- **위험 후보(미확정):** `.sheet-backdrop`/`.sheet`도 fixed라 동일 가능성 있으나 **실기기 재현 없음** → FAIL·수정 범위 아님(별도 재현 후 판단).
- **처리 상태:** 스펙 002 **로컬 구현 완료**(확대 시 `.bottomnav` fixed→흐름 전환 + 키보드 inset 오인 제거, 순수함수 `computeViewportLayout`). 자동검증 typecheck 0/unit 30/build/e2e 11 통과. **남은 것 = 사용자 실기기 4환경 확대 재검증** → 아래 게이트 행 갱신. 4환경 PASS 전까지 판정 **FAIL 유지**, 001 종료·Tailwind 확정 보류(스펙 002 DONE §5).
- **재검증 체크(각 환경):** 핀치 확대 시 (a) 하단 CTA가 키보드 inset으로 세로 팽창 안 함 (b) CTA가 본문 지속 가림 없음 (c) 문서 끝에서 `시안 저장`·`주문 제작 의뢰하기` 전체 도달·클릭 (d) 확대 해제 시 fixed 복구 (e) 기본배율 1~14 회귀 없음. *확대로 보이는 영역이 좁아지는 것은 정상, 결함 아님.*

## Canvas 비율(3:4) 게이트 — **FAIL** (가로 화면, #10 세부)

> 발견: 2026-07-21 카카오톡 인앱 웹뷰 **가로 화면**. 증거 `KakaoTalk_20260721_220932985.jpg`.
> 확대 접근성(스펙 002, 커밋 `f581242`)과 **별개 결함** — 분리 처리.

| 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱(가로) |
|---|:---:|:---:|:---:|:---:|
| Canvas DPR | PASS | — | (미측정) | **PASS**(DPR 2) |
| Canvas 3:4 비율 유지 | (가로 미검증) | — | (가로 미검증) | **FAIL** |

- **증상:** 카카오 인앱 가로에서 Canvas CSS **794×247**, backing **1588×494**(DPR 2 정상). 의도한 **3:4(0.75)**가 실제 약 **3.2:1**로 깨짐.
- **원인 후보:** `.canvas-wrap`의 `width:100%` + `aspect-ratio:3/4` + `max-height:60vh` 조합에서, 가로 화면은 `max-height`가 **높이만** 제한하고 **폭(100%)은 그대로** 남아 aspect-ratio가 무력화됨. 상세는 001 핸드오프 "Canvas 비율 결함 분석".
- **판정:** Canvas DPR = **PASS** / Canvas 3:4 비율 유지 = **FAIL** / 카카오 인앱 #10·종합 PASS **취소(FAIL로 정정)**.
- **위험(미검증):** 같은 CSS라 iPhone Safari·Samsung Internet **가로**에서도 재현 가능성 있으나 **실기기 재검증 전까지 추정 정정 금지**(세로 기록만 PASS 유지). 세로 화면은 이번 결함 대상 아님.
- **처리 상태:** 즉흥 수정 금지. 원인·최소 수정안·자동 비율 회귀 테스트·실기기 재검증안 **보고 후** 별도 스펙/커밋으로 수정. `f581242`와 분리.

## 판정 규칙
- **PASS**: 해당 환경 실기기에서 14항목이 모두 정상.
- **FAIL**: 하나라도 버튼 밀림·겹침·수평 overflow·회전 후 상태 손실·키보드 가림·**Canvas 비율 깨짐** 재현(출시 차단 결함). **확대 게이트·Canvas 비율 게이트 결함(위)도 출시 차단 FAIL.**
- **NOT TESTED**: 실기기 미검증. 추정 금지.

## 자동(에뮬레이션) 참고
- `npm run test:e2e` 결과 = viewport 10/10 PASS(데스크톱 Chromium). 스크린샷 `results/screenshots/`.
- 자동 통과는 **레이아웃 회귀의 1차 방어**일 뿐, 인앱 웹뷰의 Fullscreen/orientation/키보드/스크롤 클램프 등
  **동작 특성**은 위 실기기 표로만 확정된다.
