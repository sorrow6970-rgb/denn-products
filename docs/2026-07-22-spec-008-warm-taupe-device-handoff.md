# 2026-07-22 핸드오프 — 스펙 008 웜 토프 실기기 표시 검증 (✅ 4환경 PASS · Codex 재검증 대기)

> ✅ 웜 토프 팔레트 실기기 표시 = **iPhone Safari · Android Chrome · Samsung Internet · 카카오 인앱 4환경 12항목 전부 PASS**(FAIL 없음).
> 스펙: `docs/rebuild/specs/008-warm-taupe-device-visual-validation.md`. 기준 HEAD `6b3ec7c`(스펙 007 종료). 코드·CSS·토큰·테스트·PNG·운영본·Firebase 무변경 — 결과 문서만 갱신.

## 사전 자동검증 (스펙 007 승인 결과와 동일)

| 게이트 | 결과 |
|---|---|
| `npm ci` | ✅ 취약점 0 |
| `npm run typecheck` (strict) | ✅ 0 오류 |
| `npm run test:unit` | ✅ 34/34 |
| `npm run build` | ✅ JS gzip 66.47KB / CSS gzip 3.35KB |
| `npm run test:e2e` | ✅ 11/11 (color-contrast serious/critical 0) |

승인 결과와 차이 없음 → preview 진행. `npm run preview -- --host` → 당일 Vite Network `http://192.168.0.31:4173/`(LAN 내부 한정).

## 환경별 12항목 결과 (사용자 확인)

| 환경 | 12항목 | 종합 | 확인 근거 | 상세 버전 |
|---|:---:|:---:|---|---|
| iPhone Safari | 전부 PASS | **PASS** | 사용자 직접 확인 | 미기록 |
| Android Chrome | 전부 PASS | **PASS** | 사용자 직접 확인 | 미기록 |
| Samsung Internet | 전부 PASS | **PASS** | 영상 관측 + 사용자 직접 확인 | 미기록 |
| 카카오 인앱 | 전부 PASS | **PASS** | 영상 관측 + 사용자 직접 확인 | 미기록 |

- Samsung·카카오: 수동 세로↔가로 회전 정상 + 핀치/200% 확대 정상. 카카오 orientation lock 강제는 실패→정상 fallback(스펙 005 기록과 일치).
- Samsung 전체화면 진입 성공·웜 토프 정상 렌더 관측.

## 증거 처리

- 영상 `screen shot/KakaoTalk_20260722_153026136.mp4`(11827프레임/49.3초/1080×2340). **저장소에 추가·이동·변환·커밋하지 않음.** 읽기 전용으로 스크래치패드에만 정지 프레임을 추출해 카카오 인앱·Samsung Internet 표시를 육안 확인(원본 무변경).
- 영상에서 직접 관측: 카카오 인앱·Samsung Internet의 웜 토프 브랜드바·어두운 라벨·primary/secondary 버튼·카카오 CTA 노랑·Canvas 3:4·"오류 관측: 예상하지 않은 오류 없음".
- 영상에 없던 항목(가로 회전·확대·iPhone·Android)은 **사용자 추가 직접 확인**으로 PASS 확정.
- 스크린샷/이미지 = 없음(영상 외 별도 스크린샷 없음). 상세 기기·OS·브라우저 버전 = 미기록(추정 안 함).

## 기존 기록 보존

- device-matrix 001~007 결과 = **무변경**. 스펙 008 결과는 "웜 토프 실기기 표시 검증 — 스펙 008" **별도 섹션**에만 append.

## 변경 문서 / 무변경

- 변경: `poc/platform-compatibility/results/device-matrix.md`(스펙 008 섹션) · `specs/008`(DONE) · 이 핸드오프 · `CURRENT.md`.
- **무변경:** POC 코드/CSS/토큰·테스트·디자인 PNG·운영 HTML·Firebase·`firebase.json`. 영상 파일 저장소 미추가.

## preview 서버 / 검증

- preview 서버 **종료 완료**, 포트 4173·잔류 프로세스 없음. FAIL 없음.

## 남은 위험

- 육안 검증은 색도계 검증 아님(디스플레이 설정 영향). 로컬 HTTP LAN과 실제 HTTPS 운영 환경 차이 잔존.
- 상세 기기/브라우저 버전 미기록으로 재현성 제한(가능 범위에서 정직 기록, 추정 안 함).

## 롤백

- 스펙 008 결과 문서 커밋 `git revert`. 운영본·Firebase 롤백 없음.

## Codex 재검증 요청

읽기 전용으로 판정 요청. 중점: (1) 4환경 결과가 확인 근거(영상 관측 + 사용자 직접 확인)와 일치, (2) 기존 001~007 결과 보존, (3) 코드·CSS·토큰·테스트·PNG·운영/Firebase 무변경, (4) 영상 파일 저장소 미추가, (5) 상세 버전 미기록의 정직성.

## 계속 대기

- 소형 POC(TS7 린트 전략 + 최소 pnpm workspace) · 전체 스캐폴드 · Firebase · 배포 · PNG 재편집.
