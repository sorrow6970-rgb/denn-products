# 008 — 웜 토프 실기기 표시 검증

상태: **READY FOR USER-ASSISTED VALIDATION**

## 목표 (WHY)

스펙 007에서 자동검증을 통과한 웜 토프 팔레트가 실제 iPhone Safari, Android Chrome, Samsung Internet, 카카오 인앱 웹뷰에서 의도대로 렌더되고 텍스트·상태·CTA를 명확하게 식별할 수 있는지 확인한다.

이 작업은 기능이나 디자인 수정이 아니다. 사용자 실기기 관측을 사실대로 기록하고, 자동검증으로 확인할 수 없는 모바일 브라우저별 표시 편차를 판정한다.

## 범위 (SCOPE)

### 포함

- 현재 승인된 POC의 재현 설치와 자동검증 재확인
- LAN 내부 preview 실행과 오늘 PC의 실제 Network URL 안내
- 4환경에서 웜 토프 표시·텍스트 대비·회전·확대 확인
- 기기 메타, 항목별 PASS/FAIL/NOT TESTED, 스크린샷 제공 여부 기록
- 기존 `device-matrix.md`에 스펙 008 별도 섹션 append
- 결과 handoff, spec DONE, CURRENT 갱신
- preview 서버 종료와 잔류 프로세스 확인

### 제외(하지 않을 것)

- 관측 전후의 코드·CSS·토큰·테스트·PNG 수정
- FAIL 발생 즉시 보정 패치 또는 브라우저별 임시 분기 추가
- 기존 스펙 001~007 결과·증거·과거 팔레트 기록 수정
- 전체 모노레포·apps/packages 스캐폴드
- TS7 린트·최소 pnpm workspace POC
- Firebase·Rules·운영 데이터·Hosting·preview channel·production 배포
- 방화벽 규칙 자동 변경, 관리자 권한 사용, 외부 HTTPS 터널 무단 개설
- 색도계 수준의 물리적 색 정확도 보증

## 대상 (WHERE)

- 실행 대상: `poc/platform-compatibility/`
- 결과 append: `poc/platform-compatibility/results/device-matrix.md`
- 스펙 상태: 이 파일의 `DONE (Claude)`
- 현재 상태: `docs/codex-claude-handoff/CURRENT.md`
- 신규 핸드오프: `docs/2026-07-22-spec-008-warm-taupe-device-handoff.md`
- 적용 결정:
  - `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md`
  - `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
  - `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
  - `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
  - `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`

## 구현 지시 (WHAT / HOW)

1. 시작 전 브랜치 `rebuild/modern-studio`, HEAD/원격 동기화, clean 상태를 확인한다. 기준은 스펙 007 종료 HEAD `6b3ec7c`다.
2. `poc/platform-compatibility/`가 현재 고정한 npm lockfile을 사용하여 `npm ci`, typecheck, unit, build, e2e를 실행한다. 스펙 007 승인 결과와 달라지면 preview를 열지 말고 차이를 먼저 보고한다.
3. 자동검증이 통과한 경우에만 `npm run preview -- --host`를 실행한다. Vite가 실제 출력한 오늘의 `Network:` URL을 사용자에게 전달하며 과거 IP를 재사용해 추정하지 않는다.
4. 사용자에게 LAN 내부에서만 접근 가능함, 같은 Wi-Fi 필요, 테스트 중 터미널 유지, 종료는 `Ctrl+C`임을 안내한다.
5. 방화벽 승인이나 외부 HTTPS 채널이 필요하면 이유·노출 범위·종료 방법을 먼저 보고하고 사용자 승인을 기다린다.
6. 아래 4환경에서 사용자가 직접 확인한 결과만 기록한다.
   - iPhone Safari
   - Android Chrome
   - Samsung Internet
   - 카카오 인앱 웹뷰
7. `device-matrix.md`의 기존 섹션을 수정하지 않고 `웜 토프 실기기 표시 검증 — 스펙 008` 섹션을 append한다.
8. FAIL이면 기기·OS·브라우저·방향·배율·요소·재현 순서·기대/실제를 기록하고 즉시 코드 수정하지 않는다. 원인 분석 후 Codex 수정 스펙을 요청한다.
9. 검증이 끝나면 preview를 종료하고 포트와 관련 프로세스가 남지 않았는지 확인한다.
10. 결과 문서만 커밋·push한다. 코드·CSS·토큰·테스트·PNG·운영본·Firebase diff가 있으면 중단하고 먼저 보고한다.

## 검증 절차 (VERIFY)

### 사전 자동검증

- [ ] `npm ci` 성공
- [ ] `npm run typecheck` 0 오류
- [ ] `npm run test:unit` 전체 통과
- [ ] `npm run build` 성공 및 기존 성능 예산 내
- [ ] `npm run test:e2e` 전체 통과, axe color-contrast serious/critical 0

### 실기기 체크리스트

각 환경에서 다음을 `PASS / FAIL / NOT TESTED`로 기록한다.

| # | 확인 항목 |
|---:|---|
| 1 | 상단 브랜드바가 웜 토프로 보이고 카라멜 앰버·테라코타 잔존이 없음 |
| 2 | 브랜드바 제목·브라우저 범주 글자가 어두운 색으로 선명하게 읽힘 |
| 3 | primary 버튼의 어두운 라벨이 배경과 충분히 구분되고 비활성처럼 보이지 않음 |
| 4 | secondary 버튼 라벨·카드 제목·본문이 밝은 배경에서 선명하게 읽힘 |
| 5 | 연한 웜 토프 probe·Canvas 배경과 그 위 글자·선이 구분됨 |
| 6 | 지원/미지원 badge와 오류 관측 상태를 색상뿐 아니라 텍스트로 구분 가능 |
| 7 | 카카오 CTA의 노란 배경과 진한 텍스트가 기존과 동일하게 보임 |
| 8 | 세로↔가로 회전 후 색상 누락·투명화·fallback 차이·레이아웃 파손 없음 |
| 9 | 핀치/200% 확대에서도 버튼·라벨을 읽고 핵심 CTA에 접근 가능 |
| 10 | 흰색-on-warm-taupe 일반 라벨이나 읽기 어려운 저대비 텍스트가 없음 |
| 11 | CSS.supports 배지가 기존 기록과 일치하며, 다르면 실제 값을 기록 |
| 12 | 화면 오류 관측 카드와 가능한 경우 콘솔에 새 치명적 오류가 없음 |

### 기록 계약

- [ ] 환경별 기기명·모델, OS·버전, 브라우저·버전, 날짜, 접근 URL 기록(알 수 없는 값은 `미기록`)
- [ ] 환경별 12항목과 종합 판정 기록
- [ ] 스크린샷 제공 여부와 파일명 기록; 없으면 `없음`
- [ ] 실제 확인하지 않은 환경·항목은 NOT TESTED 유지
- [ ] 기존 001~007 결과는 변경하지 않고 스펙 008 섹션만 추가
- [ ] 코드·CSS·토큰·테스트·PNG·운영 HTML·Firebase 무변경
- [ ] preview 서버 종료

완료 정의(DONE): 사전 자동검증이 통과하고, 사용자가 확인 가능한 환경의 결과가 사실대로 기록되며, 미확인 사항은 NOT TESTED로 남고, preview가 종료되고, 결과 문서만 커밋·push되어 로컬=원격·작업트리 clean이 확인되면 완료다.

## 위험 (RISK)

- 육안 검증은 디스플레이 설정·밝기·색상 프로필 영향을 받으며 물리적 색 정확도를 보증하지 않는다.
- 로컬 HTTP와 실제 HTTPS 운영 환경 차이는 남는다.
- 상세 기기/브라우저 버전이 없으면 결과의 재현성이 낮아지므로 가능한 범위에서 기록하되 추정하지 않는다.
- 결과 기록 롤백은 스펙 008 결과 문서 커밋을 `git revert`한다. 운영본·Firebase 롤백은 없어야 한다.

## QUESTIONS

- LAN 접속이 불가능한 경우에만 임시 HTTPS 검증 채널 사용 승인 여부를 사용자에게 질문한다.

### DONE (Claude) — 2026-07-22

- **결과:** 웜 토프 실기기 표시 검증 = **4환경 전부 PASS**(FAIL 없음).
  - iPhone Safari · Android Chrome · Samsung Internet · 카카오 인앱 = 각 **12항목 전부 PASS**.
  - Samsung·카카오: 수동 세로↔가로 회전 정상 + 핀치/200% 확대 정상. 카카오 orientation lock 강제는 실패→정상 fallback.
- **증거:** 영상 `screen shot/KakaoTalk_20260722_153026136.mp4`(저장소에 추가·변환·커밋하지 않음)에서 카카오 인앱·Samsung Internet 웜 토프 브랜드바·어두운 라벨·primary/secondary 버튼·카카오 CTA 노랑·Canvas 3:4·오류 관측 "예상하지 않은 오류 없음" 관측(읽기 전용 프레임 분석) + 사용자 추가 직접 확인. iPhone Safari·Android Chrome은 사용자 직접 확인(영상·스크린샷 없음).
- **기록 위치:** `poc/platform-compatibility/results/device-matrix.md`의 "웜 토프 실기기 표시 검증 — 스펙 008" 별도 섹션(append). 기존 001~007 표는 무변경.
- **사전 자동검증(스펙 007 승인 결과와 동일):** `npm ci` ✅ / typecheck ✅ 0 / unit ✅ 34/34 / build ✅ JS gzip 66.47KB / e2e ✅ 11/11(color-contrast serious/critical 0). preview `npm run preview -- --host` → 당일 Network `http://192.168.0.31:4173/`.
- **기기·OS·브라우저 상세 버전 = 4환경 모두 미기록**(추정 안 함). 육안 검증(색도계 아님).
- **preview 서버 종료 완료**, 포트 4173·잔류 프로세스 없음. **코드·CSS·토큰·테스트·PNG·운영본·Firebase 무변경**, 영상 파일 저장소 미추가.
- **다음:** Codex 재검증 → 이후 소형 POC(TS7 린트 전략 + 최소 pnpm workspace).
