# 005 — 카라멜 앰버 실기기 표시 검증

상태: **READY FOR USER-ASSISTED VALIDATION**

## 목표 (WHY)

스펙 004에서 자동검증을 통과한 카라멜 앰버 팔레트가 실제 iPhone Safari, Android Chrome, Samsung Internet, 카카오 인앱 웹뷰에서 의도한 색으로 렌더되고 일반 크기 텍스트를 읽을 수 있는지 확인한다.

이 작업은 새 기능 구현이 아니다. 사용자 실기기 관측을 증거로 기록하고, 팔레트 관련 PASS·FAIL·NOT TESTED를 기존 기능 검증과 분리한다.

## 적용 결정서

- `docs/codex-claude-handoff/decisions/2026-07-21-caramel-amber-palette.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-security-and-privacy.md`

## 선행 사실

- 스펙 004 자동검증은 Codex 최종 승인됐다. 종료 HEAD는 `7f6f71f`다.
- 현재 팔레트: accent `#B0894E`, accent-2 `#C6A46B`, accent-soft `#F2E9DA`, accent-ink `#191A1D`.
- 데스크톱 Chromium의 axe color-contrast serious/critical은 0이다.
- 기존 001 기본 검증과 002 확대·003 Canvas 실기기 결과는 과거 기능 증거로 보존한다.
- 새 팔레트의 실기기 색상 표시는 아직 NOT TESTED다.

## 범위 (SCOPE)

### 포함

- 기존 POC 빌드와 LAN preview 실행
- 오늘 PC의 실제 LAN IP 안내
- 4환경의 새 팔레트 표시 수동 확인
- 세로 화면과 가로 화면의 대표 색상 확인
- 기본 배율과 확대 상태의 텍스트 식별 확인
- 결과·기기 메타·스크린샷 파일명 기록
- PASS·FAIL·NOT TESTED 판정
- 결과 handoff와 CURRENT 갱신

### 제외

- 관측 전에 코드·CSS·토큰 수정
- 기존 001·002·003 PASS 결과 재작성
- 색상계를 이용한 물리적 색 정확도·색차 보증
- 디자인 PNG 수정·재생성
- Tailwind v4/v3.4 최종 결정
- 전체 스캐폴드·Firebase·Hosting·배포
- 외부 HTTPS 터널의 무단 개설

## 사용자 실기기 대상

1. iPhone Safari
2. Android Chrome
3. Samsung Internet
4. 카카오 인앱 브라우저

사용자가 보유하지 않거나 실행하지 못한 환경은 NOT TESTED로 유지한다. 다른 브라우저 결과로 추정하지 않는다.

## 사전 절차

Claude Code는 코드 수정 없이 다음을 수행한다.

1. 브랜치·HEAD·원격·clean 확인
2. `poc/platform-compatibility/`에서 `npm ci`
3. `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:e2e`
4. 자동검증이 기존 승인 결과와 다르면 preview를 열지 말고 보고
5. `npm run preview -- --host` 실행
6. Vite가 출력한 현재 `Network:` URL을 사용자에게 전달
7. LAN 내부 노출, 터미널 유지, `Ctrl+C` 종료 방법 안내

특정 과거 IP를 현재 주소로 가정하지 않는다. 방화벽 변경·관리자 권한·외부 터널이 필요하면 먼저 사용자 승인을 받는다.

## 실기기 체크리스트

각 환경에서 다음을 `PASS / FAIL / NOT TESTED`로 기록한다.

| # | 확인 항목 |
|---:|---|
| 1 | 상단 브랜드바가 카라멜 앰버로 보이고 구 테라코타가 남지 않음 |
| 2 | 브랜드바 제목과 브라우저 범주 글자가 어두운 색으로 선명하게 읽힘 |
| 3 | primary 버튼의 어두운 라벨이 배경과 구분되고 비활성처럼 보이지 않음 |
| 4 | secondary 버튼 라벨·카드 제목·본문이 밝은 배경에서 선명하게 읽힘 |
| 5 | 연한 카라멜 앰버 probe·Canvas 배경과 그 위 글자·선이 구분됨 |
| 6 | 지원/미지원 badge와 오류 관측 영역의 상태를 색상만이 아니라 텍스트로 구분 가능 |
| 7 | 카카오 CTA의 노란 배경과 진한 텍스트가 기존과 동일하게 보임 |
| 8 | 세로↔가로 회전 후 색상 누락·투명화·fallback 차이가 없음 |
| 9 | 핀치/200% 확대에서도 버튼·라벨을 읽고 핵심 CTA에 접근 가능 |
| 10 | 화면에 흰색-on-caramel 일반 라벨이나 읽기 어려운 저대비 텍스트가 없음 |
| 11 | CSS.supports 배지가 기존 기록과 일치하거나 차이가 있으면 실제 값을 기록 |
| 12 | 화면 오류 관측 카드와 콘솔에 새 치명적 오류가 없음 |

## 기록 방법

`poc/platform-compatibility/results/device-matrix.md`에 기존 표를 수정하지 말고 다음 별도 섹션을 append한다.

```text
새 팔레트 실기기 표시 — 스펙 005
기기/OS/브라우저/날짜/접근 URL
항목 1~12: PASS | FAIL | NOT TESTED
종합 판정
스크린샷 파일명
비고·재현 절차
```

- 실제로 확인한 항목만 PASS로 기록한다.
- 스크린샷이 없으면 없다고 기록하며 결과를 만들어내지 않는다.
- 색감 취향과 접근성·렌더 결함을 구분한다.
- FAIL이면 기기, 방향, 확대 상태, 정확한 요소, 기대/실제 결과를 기록한다.

## 판정

- **PASS:** 해당 환경에서 12개 항목을 모두 실제 확인해 문제가 없음
- **FAIL:** 읽기 어려운 텍스트, 구 팔레트 잔존, fallback 색상 누락, 회전·확대 시 색상/텍스트 결함 중 하나라도 재현
- **NOT TESTED:** 사용자가 확인하지 않았거나 결과가 불완전함

FAIL 발생 시 즉시 색상 패치를 만들지 않는다. 공통 결함인지 특정 브라우저 fallback인지 원인을 분석하고 Codex에 수정 스펙을 요청한다.

## 완료 정의 (DONE)

- 사용자가 가능한 실기기 결과를 전달했다.
- 결과가 별도 스펙 005 섹션에 사실대로 기록됐다.
- 기존 001·002·003 결과가 보존됐다.
- 모든 대상이 PASS이거나, NOT TESTED·FAIL이 명확히 남아 있다.
- preview 서버가 종료됐다.
- CURRENT와 새 handoff가 실제 결과와 일치한다.
- 결과 문서만 커밋·push됐고 코드·CSS는 변경되지 않았다.

## 위험과 롤백

- 육안 검증은 색도계 검증이 아니며 기기 디스플레이 설정의 영향을 받는다.
- 로컬 HTTP와 실제 HTTPS 운영 환경의 차이는 남는다.
- 결과 기록 롤백은 스펙 005 문서 커밋을 `git revert`한다.
- 운영본·Firebase·데이터 롤백은 없어야 한다.

## QUESTIONS

- LAN 접속이 불가능한 경우에만 임시 HTTPS 검증 채널 승인 여부를 사용자에게 질문한다.

### DONE (Claude) — 작성 대기

