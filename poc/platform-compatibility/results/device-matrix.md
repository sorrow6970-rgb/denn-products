# 실제 기기 검증 매트릭스 — 001 플랫폼 호환성 POC

> 규칙(spec §6): **사용자가 실제 기기에서 검증하지 않은 항목은 추정으로 PASS 처리하지 않는다.**
> 데스크톱 Playwright/에뮬레이션은 실제 인앱 웹뷰 동작을 대체하지 못한다(spec RISK).
> 아래는 **자동 검사 통과 후** 사용자가 실기기로 채우는 표다. Claude는 임의로 PASS를 채우지 않는다.

측정 항목(각 환경): CSS 기능(color-mix/@property/dvh) · 버튼 밀림·겹침·수평 overflow · 키보드 전후 viewport
· 회전 전후 상태 · Canvas DPR·비율 · Fullscreen/orientation 결과 · 스크린샷/영상 파일명.

접근 방법(QUESTIONS): 실기기 접근 URL은 구현 후 사용자 승인 아래 별도 결정(외부 공개 배포는 본 스펙 범위 밖).
로컬 접근 예: 같은 Wi-Fi에서 `npm run preview -- --host` 후 PC LAN IP:4173 접속(사용자 환경에서만).

| 환경 | 기기/OS/앱 버전 | CSS 기능 | 버튼/overflow | 키보드 | 회전 | Canvas DPR | Fullscreen/orient | 스크린샷 | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| iPhone Safari | (기록) | | | | | | | | **NOT TESTED** |
| Android Chrome | (기록) | | | | | | | | **NOT TESTED** |
| 카카오톡 인앱 | (기록) | | | | | | | | **NOT TESTED** |
| Samsung Internet | (기록) | | | | | | | | **NOT TESTED** |

## 판정 규칙
- **PASS**: 해당 환경 실기기에서 위 항목이 모두 정상.
- **FAIL**: 하나라도 버튼 밀림·겹침·수평 overflow·회전 후 상태 손실·키보드 가림 재현(출시 차단 결함).
- **NOT TESTED**: 실기기 미검증. 추정 금지.

## 자동(에뮬레이션) 참고
- `npm run test:e2e` 결과는 `results/e2e-report.json`, 스크린샷은 `results/screenshots/`.
- 자동 통과는 **레이아웃 회귀의 1차 방어**일 뿐, 인앱 웹뷰의 Fullscreen/orientation/스크롤 클램프 등
  **동작 특성**은 위 실기기 표로만 확정된다.
