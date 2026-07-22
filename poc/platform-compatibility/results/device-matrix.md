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
> 현재 표는 사용자가 전달한 결과만 `PASS`/`FAIL`로 채웠다. Android Chrome의 비어 있는 기본배율 셀은
> 계속 `NOT TESTED`이며, 확대·Canvas 별도 게이트 결과로 나머지 기본 항목을 추정하지 않는다.

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
| 10 | Canvas 흐림·잘림 없음 (DPR 표시 확인) | PASS | PASS | PASS | PASS |
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
| 스크린샷/영상 파일명 | `KakaoTalk_20260721_210031114.png` | `codex-clipboard-8cf0ccea-d31b-43b7-99a2-bcc358f71a9f.png` | `KakaoTalk_20260721_210414899_01.jpg`, `codex-clipboard-77929739-d99b-4a89-aef3-95b8820bc014.png` | `KakaoTalk_20260721_210414899.jpg`, `KakaoTalk_20260721_210705947.jpg`, `codex-clipboard-ba9a0b22-0632-4275-ae1c-ba86e7b92b17.png`, `codex-clipboard-7323fe3c-0410-4d4c-a3ea-6fb210ed3f70.png` |
| **종합 판정** | **PASS** | **NOT TESTED** | **PASS** | **PASS** |
| 비고·재현 절차 | DPR 3, 402×714. Fullscreen·orientation lock 미지원 시 정상 fallback. 스펙 003 세로/가로 Canvas 사용자 PASS. | Android Chrome 전체 1~14는 미완료이나 #10 Canvas와 확대 게이트는 사용자 PASS. 가로 Canvas CSS 172×229, backing 343×458, DPR 2. | DPR 3.5, 411×740. 스펙 003 가로 Canvas CSS 178×238, backing 357×476, DPR 2. | DPR 3.5, 411×731. Fullscreen 진입 성공, orientation lock 실패 후 정상 fallback. 물리 가로 회전 정상. 스펙 003 가로 Canvas 사용자 PASS. |

## 확대(200%/핀치) 접근성 게이트 — **PASS** (스펙 002 실기기 재검증 완료)

> 접근성 결정서(`docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`) §4 "브라우저 확대 200%에서 핵심 기능 유지" / §14 출시 차단 "200% 확대 사용 불가" 게이트.
> 기본 배율 1~14와 별도인 수동 접근성 게이트. 최초 4환경 FAIL 후 스펙 002 수정 빌드를 사용자가 재검증했다.

| 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱 |
|---|:---:|:---:|:---:|:---:|
| 핀치/200% 확대 시 하단 고정 CTA 핵심기능 유지 | **PASS** | **PASS** | **PASS** | **PASS** |

- **증상(4환경 공통 재현):** 핀치 확대 시 `position:fixed` 하단 CTA(`.bottomnav`)가 과도하게 커지고 좌우가 잘리며 본문을 크게 가림. 브라우저 한정이 아닌 **POC 공통 레이아웃 문제**.
- **증거:** `KakaoTalk_20260721_212105638.jpg`.
- **원인(요약):** 브라우저 표준 핀치 확대 동작과 POC의 `position:fixed` 하단 CTA 레이아웃 선택 사이의 **호환성 결함**(`position:fixed`가 레이아웃 뷰포트 기준이라 확대 시 커지고 덮음). 특정 브라우저 버그 아님. 상세는 001 핸드오프 "확대 접근성 결함 분석" 참조.
- **위험 후보(미확정):** `.sheet-backdrop`/`.sheet`도 fixed라 동일 가능성 있으나 **실기기 재현 없음** → FAIL·수정 범위 아님(별도 재현 후 판단).
- **처리 결과(2026-07-21):** 스펙 002 수정 빌드에서 iPhone Safari·Android Chrome·Samsung Internet·카카오 인앱 모두 사용자 **PASS**. CTA 세로 팽창·본문 지속 가림이 해소됐고, 문서 말단 CTA 접근·클릭 및 확대 해제 후 fixed 복구가 정상이라고 확인했다.
- **재검증 체크(각 환경):** 핀치 확대 시 (a) 하단 CTA가 키보드 inset으로 세로 팽창 안 함 (b) CTA가 본문 지속 가림 없음 (c) 문서 끝에서 `시안 저장`·`주문 제작 의뢰하기` 전체 도달·클릭 (d) 확대 해제 시 fixed 복구 (e) 기본배율 1~14 회귀 없음. *확대로 보이는 영역이 좁아지는 것은 정상, 결함 아님.*

## Canvas 비율(3:4) 게이트 — **PASS** (스펙 003 실기기 재검증 완료)

> 발견: 2026-07-21 카카오톡 인앱 웹뷰 **가로 화면**. 증거 `KakaoTalk_20260721_220932985.jpg`.
> 확대 접근성(스펙 002, 커밋 `f581242`)과 **별개 결함** — 분리 처리.

| 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱(가로) |
|---|:---:|:---:|:---:|:---:|
| Canvas DPR | **PASS** | **PASS**(DPR 2) | **PASS**(DPR 2) | **PASS**(DPR 2) |
| Canvas 3:4 비율 유지 | **PASS** | **PASS** | **PASS** | **PASS** |

- **증상:** 카카오 인앱 가로에서 Canvas CSS **794×247**, backing **1588×494**(DPR 2 정상). 의도한 **3:4(0.75)**가 실제 약 **3.2:1**로 깨짐.
- **원인 후보:** `.canvas-wrap`의 `width:100%` + `aspect-ratio:3/4` + `max-height:60vh` 조합에서, 가로 화면은 `max-height`가 **높이만** 제한하고 **폭(100%)은 그대로** 남아 aspect-ratio가 무력화됨. 상세는 001 핸드오프 "Canvas 비율 결함 분석".
- **처리 결과(2026-07-21):** 스펙 003 수정 빌드를 사용자가 4환경에서 세로/가로 확인해 모두 **PASS**. Android Chrome 가로 CSS 172×229/backing 343×458, Samsung Internet 178×238/backing 357×476, 카카오 인앱 대표 117×157 및 138×183으로 3:4 반올림 범위와 DPR 2를 확인했다. iPhone Safari도 사용자 정상 확인.
- **재검증 체크(각 환경, 세로→가로→세로):** (a) 세로 Canvas 3:4 (b) 가로 Canvas 납작/늘어남 없이 3:4 유지 (c) 회전 후 CSS·backing 크기 갱신 (d) DPR 표시·선명도 정상 (e) 가로에서 Canvas·CTA·본문 겹침·수평 overflow 없음 (f) 세로 복귀 시 비율 복구. *가로에서 Canvas가 중앙 세로형으로 작아지는 것은 의도된 trade-off.*

## 판정 규칙
- **PASS**: 해당 환경 실기기에서 14항목이 모두 정상.
- **FAIL**: 하나라도 버튼 밀림·겹침·수평 overflow·회전 후 상태 손실·키보드 가림·**Canvas 비율 깨짐** 재현(출시 차단 결함). **확대 게이트·Canvas 비율 게이트 결함(위)도 출시 차단 FAIL.**
- **NOT TESTED**: 실기기 미검증. 추정 금지.

## 자동(에뮬레이션) 참고
- `npm run test:e2e` 결과 = viewport 10/10 PASS(데스크톱 Chromium). 스크린샷 `results/screenshots/`.
- 자동 통과는 **레이아웃 회귀의 1차 방어**일 뿐, 인앱 웹뷰의 Fullscreen/orientation/키보드/스크롤 클램프 등
  **동작 특성**은 위 실기기 표로만 확정된다.

---

## 새 팔레트 실기기 표시 검증 — 스펙 005 (카라멜 앰버)

> 스펙 `docs/rebuild/specs/005-caramel-amber-device-visual-validation.md`. **위 001·002·003 표와 별개**로 새 팔레트(accent `#B0894E` / accent-2 `#C6A46B` / accent-soft `#F2E9DA` / accent-ink `#191A1D`)의 실기기 색상 표시만 기록한다.
> **⚠️ 빈 셀 = NOT TESTED.** 사용자가 실제 확인한 항목만 PASS/FAIL로 채운다. 다른 환경 결과로 추정하지 않는다. 기존 001·002·003 결과는 변경하지 않는다.
> 접속 URL(당일 LAN): `http://192.168.0.31:4173/` (고정 기준 아님, 매 세션 Vite `Network:` 값으로 대체).

| # | 확인 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱 |
|---:|---|:---:|:---:|:---:|:---:|
| 1 | 브랜드바 카라멜 앰버 표시(구 테라코타 잔존 없음) | PASS | PASS | PASS | PASS |
| 2 | 브랜드바 제목·브라우저 범주 글자 어두운 색 선명 | PASS | PASS | PASS | PASS |
| 3 | primary 버튼 어두운 라벨 배경과 구분(비활성처럼 안 보임) | PASS | PASS | PASS | PASS |
| 4 | secondary 라벨·카드 제목·본문 밝은 배경에서 선명 | PASS | PASS | PASS | PASS |
| 5 | 연한 카라멜 앰버 probe·Canvas 배경 위 글자·선 구분 | PASS | PASS | PASS | PASS |
| 6 | badge·오류 관측 상태를 색상만이 아닌 텍스트로 구분 | PASS | PASS | PASS | PASS |
| 7 | 카카오 CTA 노란 배경+진한 텍스트 기존과 동일 | PASS | PASS | PASS | PASS |
| 8 | 세로↔가로 회전 후 색상 누락·투명화·fallback 차이 없음 | PASS | PASS | PASS | PASS |
| 9 | 핀치/200% 확대에서도 버튼·라벨 읽고 핵심 CTA 접근 | PASS | PASS | PASS | PASS |
| 10 | 흰색-on-카라멜 일반 라벨·읽기 어려운 저대비 텍스트 없음 | PASS | PASS | PASS | PASS |
| 11 | CSS.supports 배지 기존 기록과 일치(다르면 실제값) | PASS | PASS | PASS | PASS |
| 12 | 오류 관측 카드·콘솔에 새 치명적 오류 없음 | PASS | PASS | PASS | PASS |

### 기기 메타 (스펙 005)
| 항목 | iPhone Safari | Android Chrome | Samsung Internet | 카카오 인앱 |
|---|---|---|---|---|
| 기기명/모델 | 미기록 | 미기록 | 미기록 | 미기록 |
| OS·버전 | 미기록 | 미기록 | 미기록 | 미기록 |
| 브라우저·버전 | 미기록 | 미기록 | 미기록 | 미기록 |
| 테스트 날짜 | 2026-07-22 | 2026-07-22 | 2026-07-22 | 2026-07-22 |
| CSS.supports (dvh/color-mix/@property) | 기존 기록과 동일 | 기존 기록과 동일 | 기존 기록과 동일 | 기존 기록과 동일 |
| 스크린샷/영상 파일명 | 없음 | 없음 | 없음 | 없음 |
| **종합 판정** | **PASS** | **PASS** | **PASS** | **PASS** |
| 비고·재현 절차 | 12항목 전부 PASS. 카라멜 앰버 표시·텍스트 가독성 정상, primary·secondary 버튼 정상, 세로↔가로 회전 정상, 핀치/200% 확대 정상, 카카오 CTA 정상, CSS.supports 기존과 동일, 치명적 오류 없음. 색도계 검증 아님(육안). | 12항목 전부 PASS. 카라멜 앰버 표시·텍스트 가독성 정상, primary·secondary 버튼 정상, 세로↔가로 회전 정상, 핀치/200% 확대 정상, 카카오 CTA 정상, CSS.supports 기존과 동일, 치명적 오류 없음. 색도계 검증 아님(육안). | 12항목 전부 PASS. 카라멜 앰버 표시·텍스트 가독성 정상, 세로↔가로 회전 정상, 핀치/200% 확대 정상, CSS.supports 기존과 동일, 치명적 오류 없음. 색도계 검증 아님(육안). | 12항목 전부 PASS. 카라멜 앰버 표시·텍스트 가독성 정상, primary·secondary 버튼 정상, 세로↔가로 회전 정상, 핀치/200% 확대 정상, 카카오 CTA 정상, CSS.supports 기존과 동일, 치명적 오류 없음. 스크린샷 없음(사용자 미촬영). 색도계 검증 아님(육안). |

### 판정
- **PASS:** 12개 항목 모두 실제 확인·문제 없음.
- **FAIL:** 읽기 어려운 텍스트·구 팔레트 잔존·fallback 색상 누락·회전/확대 시 색상·텍스트 결함 중 하나라도 재현.
- **NOT TESTED:** 사용자 미확인 또는 결과 불완전.
- FAIL 시 즉시 색상 패치를 만들지 않고 재현 조건·원인을 분석해 Codex에 수정 스펙을 요청한다.

### 최종 결과 (스펙 005) — 2026-07-22
- **iPhone Safari = PASS · Android Chrome = PASS · Samsung Internet = PASS · 카카오 인앱 = PASS** (4환경 전부 12항목, 사용자 직접 확인).
- 기기명·OS·브라우저 상세 버전 = 미기록, 스크린샷 = 없음(사용자 미촬영). CSS.supports 4환경 모두 기존 기록과 동일.
- 육안 검증(색도계 아님), 로컬 HTTP LAN preview 기준. 기존 001·002·003 기능 결과는 별도로 보존됨.
