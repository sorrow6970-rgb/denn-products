# 004 — 카라멜 앰버 팔레트 전환

상태: **✅ DONE · Codex 최종 승인(승인 가능, 기준 HEAD `7406460`, 2026-07-22)** — 자동검증 단계 완료. 새 팔레트 실기기 색상은 NOT TESTED.

## 목표 (WHY)

스펙 002·003에서 검증한 모바일 확대 접근성과 Canvas 3:4 동작을 보존하면서, 현재 디자인 기준과 삭제 가능한 플랫폼 POC를 확정된 카라멜 앰버 팔레트로 일치시킨다. 일반 크기 버튼·칩·태그 텍스트는 WCAG 2.2 AA를 충족해야 한다.

## 적용 결정서

- `docs/codex-claude-handoff/decisions/2026-07-21-caramel-amber-palette.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-accessibility.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-change-and-patch-policy.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-quality-gates.md`
- `docs/codex-claude-handoff/decisions/2026-07-21-mobile-responsive-contract.md`

## 선행 사실

- 스펙 001 POC 로컬 구현·자동검증은 Codex 승인 완료다.
- 스펙 002 모바일 확대 CTA 접근성 결함은 구현과 4환경 실기기 재검증을 완료했다.
- 스펙 003 가로 Canvas 3:4 결함은 구현과 4환경 실기기 재검증을 완료했다.
- 기본 1~14 항목은 iPhone Safari·Samsung Internet·카카오 인앱 PASS, Android Chrome 일부 NOT TESTED 상태다.
- POC 코드·CSS·명암비 테스트는 아직 기존 테라코타 값이므로 팔레트 구현이 필요하다.
- 카라멜 앰버 토큰과 `accent-ink: #191A1D`는 결정서에서 확정됐다.

## 범위 (SCOPE)

### 포함

1. 현재 디자인 기준 문서의 accent-ink와 컴포넌트 색상 규칙 갱신
2. 루트 진입점과 리빌드 인덱스의 반영 상태 갱신
3. POC 코드·CSS의 팔레트 갱신
4. 명암비 계산·단위 테스트 기대값 갱신
5. e2e 접근성 및 스펙 002·003 회귀 재검증
6. 자동 결과 문서에 새 팔레트 측정 결과를 현재 결과로 구분해 기록
7. CURRENT와 스펙 004 handoff 갱신

### 제외

- 완료된 001·002·003 스펙과 과거 handoff·review의 당시 측정값 소급 수정
- 디자인 PNG 4종 수정·재생성
- 기존 운영 HTML·Firebase·Hosting·운영 데이터 변경
- 전체 앱·모노레포 스캐폴드
- Tailwind v4/v3.4 최종 결정
- 실기기 결과의 추정 PASS
- 팔레트와 무관한 UI 리팩터링

## 대상 (WHERE)

현재 기준 문서:

- `CLAUDE.md`
- `docs/rebuild/README.md`
- `docs/rebuild/design/README.md`
- `docs/codex-claude-handoff/CURRENT.md`

POC 구현·검증:

- `poc/platform-compatibility/src/App.tsx`
- `poc/platform-compatibility/src/styles.css`
- `poc/platform-compatibility/tests/unit/contrast.test.ts`
- `poc/platform-compatibility/tests/e2e/viewport.spec.ts`
- `poc/platform-compatibility/results/auto-check-summary.md`

새 handoff:

- `docs/2026-07-22-spec-004-palette-handoff.md`

## 구현 지시 (WHAT / HOW)

### 1. 기준 문서

- 확정 토큰을 정확히 사용한다: accent `#B0894E`, accent-2 `#C6A46B`, accent-soft `#F2E9DA`, accent-ink `#191A1D`.
- primary 버튼과 활성 칩의 일반 크기 라벨을 accent-ink로 지정한다.
- accent-soft 태그·뱃지의 텍스트는 기본 ink를 사용한다.
- 카카오 `#FEE500`과 기존 카카오 텍스트 기준은 유지한다.
- PNG 4종은 구 팔레트 참고 시안이며 현재 토큰 문서가 우선임을 유지한다.

### 2. POC 코드와 CSS

- `App.tsx`와 `styles.css`의 의미 토큰을 결정서와 일치시킨다.
- plain-CSS fallback과 Tailwind 계층을 함께 갱신한다.
- 컴포넌트마다 새 색상값을 중복 하드코딩하지 않는다.
- 일반 크기 텍스트가 accent 또는 accent-2 위에서 흰색으로 남지 않았는지 조사한다.
- 카카오 CTA, 확대 레이아웃 로직, Canvas 비율 로직은 변경하지 않는다.

### 3. 테스트와 결과

- 새 팔레트 명암비를 순수 함수 테스트로 고정한다.
- 흰색/accent가 일반 텍스트 AA 미달이고 ink/accent가 통과함을 검증한다.
- axe의 `color-contrast`를 포괄적으로 제외하지 않는다. 실제 미달 노드가 남으면 완료 선언 없이 수정한다.
- 과거 테라코타 결과는 당시 기록으로 보존하고, 새 결과를 날짜와 팔레트명으로 구분한다.
- 스펙 002 확대 상태와 스펙 003 세로·가로 Canvas 3:4 검사를 그대로 재실행한다.

## 커밋 단위

1. `spec 004: finalize caramel amber design tokens`
2. `spec 004: migrate POC palette and contrast tests`
3. `spec 004: record verification and handoff`

각 커밋 전 diff를 검토한다. 운영 파일과 PNG가 포함되면 중단한다.

## 검증 절차 (VERIFY)

- [ ] `git diff -- denn-mockup-tool.html denn-admin.html firebase.json` 결과 없음
- [ ] POC에서 `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] 새 명암비 계산값과 테스트 기대값 일치
- [ ] 일반 크기 accent 버튼·활성 칩·태그에 흰색 텍스트 없음
- [ ] 카카오 색상·텍스트 조합 무변경
- [ ] 320~1440 viewport 수평 overflow·터치 영역 회귀 없음
- [ ] 스펙 002 확대 접근성 회귀 없음
- [ ] 스펙 003 Canvas 3:4·DPR 회귀 없음
- [ ] serious/critical axe 위반 없음
- [ ] 기존 device-matrix의 실제 결과 보존; 새 팔레트 실기기 색상 표시는 별도 재검증 전 NOT TESTED
- [ ] PNG 4종 무변경
- [ ] Firebase·스캐폴드·배포 미진행

## 완료 정의 (DONE)

- 현재 기준 문서와 POC가 확정 팔레트에 일치한다.
- accent를 사용하는 모든 일반 텍스트 조합이 자동검증에서 AA를 충족한다.
- 스펙 002·003 회귀를 포함한 자동 품질 게이트가 통과한다.
- 과거 기록과 기존 실기기 결과가 보존되고, 새 팔레트 실기기 색상 검증은 미검증으로 분리된다.
- Codex 읽기 전용 재검증용 handoff가 존재한다.

## 위험과 롤백 (RISK)

- accent-ink 누락이 가장 큰 접근성 위험이다.
- fallback과 Tailwind 계층 중 한쪽만 바뀌면 구형 웹뷰 표시가 달라질 수 있다.
- 디자인 PNG는 당분간 현재 토큰과 불일치하므로 픽셀 기준으로 사용하지 않는다.
- 롤백은 스펙 004 커밋을 역순으로 `git revert`한다. 운영본과 Firebase에는 롤백 작업이 없어야 한다.

## QUESTIONS

- 없음. PNG 재생성 방법은 별도 스펙에서 결정한다.

### DONE (Claude) — 2026-07-22

- **변경 파일/커밋:**
  - `9c63d19` spec 004: design tokens — `docs/rebuild/design/README.md`, `docs/rebuild/README.md`
  - `58faa30` spec 004: POC palette + tests — `src/App.tsx`, `src/styles.css`, `tests/unit/contrast.test.ts`, `tests/e2e/viewport.spec.ts`
  - (verification 커밋) `results/auto-check-summary.md`, `CURRENT.md`, 이 DONE, `docs/2026-07-22-spec-004-palette-handoff.md`
- **검증 결과(로컬 desktop Chromium):**
  - `git diff denn-mockup-tool.html denn-admin.html firebase.json` → 변경 없음 ✅
  - `npm ci` ✅ / `npm run typecheck` ✅ 0오류 / `npm run test:unit` ✅ 31/31 / `npm run build` ✅ JS gzip 66.47KB / `npm run test:e2e` ✅ 11/11
  - 명암비 계산=테스트 기대값 일치(흰색/accent 3.21 미달, accent-ink/accent 5.41 통과) ✅
  - 일반 크기 accent 버튼·활성 칩·태그에 흰색 텍스트 없음 ✅ (brandbar·primary→accent-ink, secondary·h2→ink, tag/badge→ink)
  - 카카오 색상·텍스트 무변경 ✅ / 320~1440 overflow·터치영역 회귀 없음 ✅
  - 스펙 002 확대 접근성·스펙 003 Canvas 3:4·DPR 회귀 없음(동일 e2e 재실행) ✅
  - serious/critical axe 위반 0 (color-contrast 포괄 제외 제거 후) ✅
  - `device-matrix.md` 실기기 결과 보존, 새 팔레트 실기기 색상은 NOT TESTED ✅ / PNG 4종 무변경 ✅ / Firebase·스캐폴드·배포 미진행 ✅
- **범위 밖 발견(Codex 확인 요청):** `#B0894E`가 흰색과 양방향 3.21:1이라 accent-를-텍스트로 쓴 `card h2`·`btn.secondary`·nav 활성 라벨도 미달 → 디자인 토큰 역할(제목/텍스트=ink, ghost=ink)에 따라 ink로 지정. 스펙 §1은 Tag/Badge만 명시했으므로 nav item 변경은 재검증 시 확인 요망.
- **후속 스펙 제안:** (1) 새 팔레트 실기기 색상 재검증, (2) 디자인 PNG 4종 카라멜 앰버 재생성(렌더 소스 확정), (3) Tailwind v4/v3.4 확정.

#### 재검증 라운드 2 — Codex "수정 후 재검증" 반영 (2026-07-22)

Codex가 전체 방향·nav 라벨 ink화는 승인, 접근성 문서·테스트 보완만 지시. 재설계 없음.

- **design/README.md Nav item**: 활성 text·의미 있는 icon 모두 `--ink`(accent는 accent-soft 위 2.67:1로 비텍스트 3:1도 미달). accent 보더·링은 3:1 이상 확보된 배경(흰색·surface)에서만. 색만으로 상태 표현 금지 유지.
- **design/README.md Table pill**: 신규 pill = accent-soft 배경 + `--ink` 텍스트, accent는 대비 확보된 외곽/비필수 장식으로 제한. 확정=성공색은 명암비 미확인이므로 **별도 검증 대상**으로 표시(자동 통과 단정 금지).
- **contrast.test.ts +3**: 흰색/accent-2 `#C6A46B` **3:1 미달**(2.35), accent/accent-soft **4.5:1 미달**(2.67), ink/accent-soft **AA 통과**(14.45). 총 **34/34**.
- 재검증(로컬): typecheck 0 / unit **34/34** / build(JS gzip 66.47KB) / e2e **11/11**(color-contrast serious/critical 0). 운영·PNG diff 없음. 002 확대·003 Canvas 회귀 없음.
- POC UI엔 nav/table 컴포넌트가 없어 신규 컴포넌트 생성 없음(디자인 규격 문서 + 명암비 테스트 보강만). 실기기·PNG·Tailwind·배포 계속 대기.

#### Codex 최종 판정 — 승인 가능 (2026-07-22)

- **판정: 승인 가능.** 승인 기준 HEAD `7406460`.
- 승인 범위: 팔레트 전환·accent-ink `#191A1D`·디자인 접근성 규격·POC 코드/CSS·명암비 단위 테스트·color-contrast 포함 자동검증·002/003 자동 회귀검증.
- 확인: Nav 활성 text·의미 있는 icon=ink, Table 신규 pill=accent-soft+ink, accent/accent-soft 미달 조합 제거, 성공색은 별도 검증 대상 유지, 운영 HTML·Firebase·PNG·device-matrix 무변경, 실기기 새 팔레트 결과 NOT TESTED 유지.
- **스펙 004 자동검증 단계 완료.** 다음 작업 = 새 팔레트 실기기 표시 검증. PNG·Tailwind·스캐폴드·Firebase·배포는 계속 대기.

