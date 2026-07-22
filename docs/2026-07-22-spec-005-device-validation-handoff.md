# 2026-07-22 핸드오프 — 스펙 005 카라멜 앰버 실기기 표시 검증 (✅ 4환경 PASS · Codex 재검증 대기)

> ✅ 새 팔레트(카라멜 앰버) 실기기 표시 검증 = **iPhone Safari · Android Chrome · Samsung Internet · 카카오 인앱 4환경 전부 PASS**(사용자 직접 확인).
> 스펙: `docs/rebuild/specs/005-caramel-amber-device-visual-validation.md`. 결정 정본: `docs/codex-claude-handoff/decisions/2026-07-21-caramel-amber-palette.md`.
> 브랜치 `rebuild/modern-studio`. 코드·CSS·토큰·PNG 무변경 — 결과 문서만 갱신.

## 사전 자동검증 (스펙 004 승인 결과와 동일)

| 게이트 | 결과 |
|---|---|
| `npm ci` | ✅ 취약점 0 |
| `npm run typecheck` (strict) | ✅ 0 오류 |
| `npm run test:unit` | ✅ 34/34 |
| `npm run build` | ✅ JS gzip 66.47KB / CSS gzip 3.35KB |
| `npm run test:e2e` | ✅ 11/11 (color-contrast serious/critical 0) |

승인 결과와 차이 없음 → preview 진행. `npm run preview -- --host` → 당일 Vite Network `http://192.168.0.31:4173/`(LAN 내부 한정, 고정 기준 아님).

## 환경별 12항목 결과 (사용자 직접 확인, 육안)

| 환경 | 12항목 | 종합 | 스크린샷 | 메타 |
|---|:---:|:---:|---|---|
| iPhone Safari | 전부 PASS | **PASS** | 없음 | 상세 버전 미기록 |
| Android Chrome | 전부 PASS | **PASS** | 없음 | 상세 버전 미기록 |
| Samsung Internet | 전부 PASS | **PASS** | 없음 | 상세 버전 미기록 |
| 카카오 인앱 | 전부 PASS | **PASS** | 없음(사용자 미촬영) | 상세 버전 미기록 |

확인 요지(공통): ①브랜드바 카라멜 앰버(구 테라코타 잔존 없음) ②브랜드바 글자 어두운 색 선명 ③primary 버튼 어두운 라벨 구분 ④secondary/제목/본문 선명 ⑤probe·Canvas 배경 위 글자·선 구분 ⑥badge·오류영역 텍스트로 상태 구분 ⑦카카오 CTA 노란 배경+진한 텍스트 동일 ⑧회전 후 색상 누락·투명화 없음 ⑨핀치/200% 확대에서 라벨·CTA 접근 ⑩흰색-on-카라멜/저대비 텍스트 없음 ⑪CSS.supports 기존 기록과 동일 ⑫새 치명적 오류 없음.

## 사용자 직접 확인 근거

- 4환경 모두 **사용자가 실기기에서 오늘(2026-07-22) LAN preview로 직접 확인**하고 결과를 전달. Claude는 확인되지 않은 항목을 만들지 않았다.
- Samsung Internet은 1차 전달, iPhone Safari·Android Chrome은 2차 전달, 카카오 인앱은 사용자 종합 PASS 보고.
- 스크린샷: 4환경 모두 미촬영 → device-matrix에 "없음"으로 사실 기록(창작·재사용 없음). 기존 07-21 카카오 스크린샷은 팔레트 변경 전(테라코타)이라 스펙 005 증거로 쓰지 않음.

## 기존 기록 보존

- device-matrix 001 기본 14항목·002 확대 게이트·003 Canvas 게이트 결과 = **무변경**(45줄 추가·0줄 삭제, `git diff --numstat`로 확인).
- 스펙 005 결과는 "새 팔레트 실기기 표시 검증 — 스펙 005" **별도 섹션**에만 append.

## 변경 문서 / 무변경

- 변경: `poc/platform-compatibility/results/device-matrix.md`(스펙 005 섹션) · `specs/005-...md`(DONE) · 이 핸드오프 · `CURRENT.md`.
- **무변경:** POC 코드/CSS/토큰(App.tsx·styles.css 등)·테스트·디자인 PNG 4종·운영 HTML·Firebase·`firebase.json`.

## preview 서버 / 검증

- preview 서버 **종료 완료**, 잔류 프로세스 없음(포트 4173 미점유 확인).
- FAIL 없음 → 즉시 패치 사항 없음.

## 남은 위험

- 육안 검증은 색도계 검증이 아니며 기기 디스플레이 설정 영향을 받음.
- 로컬 HTTP LAN과 실제 HTTPS 운영 환경 차이는 남음.
- 기기 상세 버전·스크린샷 미기록(재현 시 보강 가능).

## 롤백

- 결과 문서 커밋을 `git revert`. 운영본·Firebase·데이터 롤백 없음.

## Codex 재검증 요청

읽기 전용으로 `승인 가능 / 수정 후 재검증 / 재설계 필요` 판정 요청. 중점: (1) 4환경 결과가 사용자 확인 근거와 일치하는지, (2) 기존 001·002·003 기록 보존, (3) 코드·CSS·토큰·PNG 무변경, (4) 미촬영 스크린샷의 정직한 "없음" 기록 적정성.

## 계속 대기

- 디자인 PNG 재생성 · Tailwind v4/v3.4 최종 결정 · 전체 스캐폴드 · Firebase · 배포.
