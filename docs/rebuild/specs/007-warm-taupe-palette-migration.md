# 007 — 웜 토프 팔레트 마이그레이션

상태: **READY FOR CLAUDE IMPLEMENTATION**

## 목표 (WHY)

사용자가 최종 확정한 Modern Studio 웜 토프 팔레트를 기존 플랫폼 POC에 적용하고, 이전 카라멜 앰버 검증에서 확보한 모바일·접근성·Canvas 동작을 손상하지 않았음을 자동 검증한다.

## 범위 (SCOPE)

- 포함:
  - POC의 중앙 색상 토큰과 해당 CSS 사용처를 웜 토프로 변경
  - 화면에 표시하는 팔레트·명암비 진단 값 갱신
  - 명암비 단위 테스트와 Playwright 접근성 회귀 테스트 갱신
  - 자동검증 결과 문서와 CURRENT 갱신
- 제외(하지 않을 것):
  - 전체 모노레포·`apps/`·`packages/` 스캐폴드 생성
  - Node/pnpm/TS7 린트 workspace POC
  - React Router·Zustand·Radix/shadcn 도입
  - Firebase 연결·Rules·운영 데이터·Hosting·배포 변경
  - 기존 운영 `denn-mockup-tool.html`, `denn-admin.html` 이동·수정·삭제
  - 기존 스펙 004·005의 카라멜 앰버 결과와 실기기 증거 수정
  - 디자인 PNG 재편집(현재 사용자/Claude 변경분은 입력 자료로만 보존)
  - 새 기능·컴포넌트·레이아웃·타이포그래피 변경

## 대상 (WHERE)

- 결정: `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md`
- 디자인 기준: `docs/rebuild/design/README.md`
- POC: `poc/platform-compatibility/`
  - `src/App.tsx`
  - `src/styles.css`
  - `tests/unit/contrast.test.ts`
  - `tests/e2e/viewport.spec.ts`
  - 실제 색상 리터럴이 발견되는 POC 내부 파일만 추가 가능
- 결과: `poc/platform-compatibility/results/auto-check-summary.md`
- 상태: `docs/codex-claude-handoff/CURRENT.md`
- 핸드오프: `docs/2026-07-22-spec-007-warm-taupe-handoff.md`

## 구현 지시 (WHAT / HOW)

1. 구현 전 현재 브랜치·HEAD·원격 동기화·작업트리를 확인한다. 이미 존재하는 사용자의 디자인 문서·PNG 변경을 보존하며 덮어쓰거나 되돌리지 않는다.
2. POC의 카라멜 앰버 토큰을 정확히 다음 값으로 교체한다.
   - accent `#9F887A`
   - accent-2 `#BAA598`
   - accent-soft `#EEE8E1`
   - accent-ink `#191A1D`
   - Kakao `#FEE500`, Kakao ink `#191600` 유지
3. 색상 리터럴은 기존 중앙 토큰 계층에서만 관리한다. 컴포넌트별 임시 색상, 이전/신규 팔레트 병행 분기, `V2`·`fix` 토큰을 만들지 않는다.
4. primary와 accent 배경의 일반 텍스트는 `accent-ink`를 사용한다. accent-soft 배경 위 텍스트·의미 있는 아이콘은 `ink`를 사용한다. accent 또는 accent-2를 일반 텍스트로 사용하지 않는다.
5. 기존 명암비 테스트를 새 값으로 갱신하고 최소 다음 사실을 고정한다.
   - white/accent 약 3.35:1 → 일반 텍스트 4.5:1 미달
   - ink/accent 약 5.20:1 → 일반 텍스트 AA 통과
   - white/accent-2 약 2.35:1 → 3:1 미달
   - accent/accent-soft 약 2.75:1 → 일반 텍스트 4.5:1 및 필수 UI 경계 3:1 미달
   - ink/accent-soft의 AA 통과
6. axe color-contrast 검사는 포괄 제외하지 않는다. serious/critical 위반 0을 유지한다.
7. 스펙 002의 확대 CTA, 스펙 003의 Canvas 3:4/DPR, fullscreen/orientation 상태머신에는 팔레트와 무관한 변경을 하지 않는다.
8. `rg`로 POC 실행 코드에 이전 팔레트 리터럴(`#B0894E`, `#C6A46B`, `#F2E9DA`)이 남지 않았음을 검사한다. 과거 문서·스펙·결과 기록은 검색 실패 대상에서 제외한다.
9. 새 팔레트의 실기기 표시는 이번 자동검증 완료 후 별도 검증 단계로 `NOT TESTED`라고 기록한다. 추정 PASS를 작성하지 않는다.
10. 보존 제약: CLAUDE.md §4 전체. 특히 운영본·Firebase·데이터·암호화·인쇄·카카오 흐름은 무변경이어야 한다.

## 검증 절차 (VERIFY)

- [ ] `pnpm` 전환을 시도하지 말고 POC가 현재 고정한 패키지 관리자와 lockfile로 재현 설치
- [ ] POC typecheck 0 오류
- [ ] POC unit 전체 통과(새 명암비 수치 포함)
- [ ] POC production build 통과 및 기존 성능 예산 내
- [ ] Playwright 전체 통과(기존 viewport 320~1440, 확대 CTA, Canvas, fullscreen 상호작용 포함)
- [ ] axe color-contrast serious/critical 0, 포괄 제외 없음
- [ ] 이전 팔레트 실행 코드 잔존 0, 신규 토큰 양 계층(App 표시값/CSS) 일치
- [ ] 운영 HTML·Firebase·기존 001~006 문서 결과·디자인 PNG diff가 이번 구현 커밋에 포함되지 않음
- [ ] 새 팔레트 실기기 결과는 `NOT TESTED` 유지

완료 정의(DONE): 위 항목이 모두 통과하고, 코드 변경과 결과 문서/핸드오프를 분리 커밋하여 push한 뒤 로컬=원격·작업트리 clean을 확인하고 Codex 재검증을 요청한다.

## 위험 (RISK)

- 시안에 흰색-on-accent가 남아 있을 수 있다. 이미지의 시각 표현을 그대로 복제하지 말고 접근성 토큰 계약을 우선한다.
- 구형 웹뷰의 렌더링 편차는 자동검증으로 완전히 해소할 수 없다. 자동 승인 후 실제 기기 표시 검증을 별도로 수행한다.
- 롤백은 스펙 007 구현·핸드오프 커밋을 역순 `git revert`한다. 운영본·Firebase 롤백은 없어야 한다.

## QUESTIONS

- 없음. 팔레트 값은 사용자 최종 결정이며, 접근성에 필요한 `accent-ink #191A1D`는 명암비 근거로 고정한다.

### DONE (Claude) — 2026-07-22

- **변경 파일/커밋:**
  - (docs, 사용자·Codex 확정 보존) `CLAUDE.md`·`docs/rebuild/README.md`·`docs/rebuild/design/README.md`·`docs/rebuild/design/*-B.png`(4 수정 + `5-styleguide-B.png` 신규)·`docs/rebuild/specs/README.md`·`decisions/2026-07-22-warm-taupe-palette.md`
  - (code) `poc/platform-compatibility/src/App.tsx`·`src/styles.css`·`tests/unit/contrast.test.ts`·`tests/e2e/viewport.spec.ts`
  - (handoff) 이 DONE·`CURRENT.md`·`results/auto-check-summary.md`·`docs/2026-07-22-spec-007-warm-taupe-handoff.md`
- **토큰 교체(중앙 계층만):** accent `#9F887A` / accent-2 `#BAA598` / accent-soft `#EEE8E1` / accent-ink `#191A1D`(유지) / kakao `#FEE500`(유지). @theme + :root fallback 양 계층 일치. 컴포넌트별 색 리터럴·병행 분기·V2/fix 토큰 없음.
- **명암비(계산=테스트 고정):** 흰색/accent 3.35(AA 미달) · ink/accent 5.20(AA) · 흰색/accent-2 2.35(3:1 미달) · accent/accent-soft 2.75(4.5·3:1 미달) · ink/accent-soft 14.31(AA). primary/브랜드바=accent-ink, accent-soft 위=ink, accent/accent-2 일반 텍스트 흰색 미사용.
- **검증 결과(로컬 desktop Chromium):**
  - `npm ci` ✅ / typecheck ✅ 0 / unit ✅ **34/34** / build ✅ JS gzip 66.47KB / e2e ✅ **11/11**(color-contrast **포괄 제외 없음**, serious/critical 0)
  - 스펙 002 확대 CTA·스펙 003 Canvas 3:4/DPR·fullscreen 상호작용 회귀 없음
  - 이전 팔레트 리터럴(`#B0894E`/`#C6A46B`/`#F2E9DA`) 실행 코드 잔존 **0**(rg 확인)
  - 운영 HTML·Firebase·001~006 문서 결과·디자인 PNG는 **코드 커밋에 미포함**(별도 docs 커밋으로 분리)
  - 새 팔레트 실기기 색상 = **NOT TESTED**(별도 후속 검증)
- **커밋 분리:** 코드 커밋 ↔ 핸드오프 커밋 분리(디자인 PNG diff는 code 커밋에 미포함).
- **다음:** Codex 재검증 → 이후 새 웜 토프 실기기 표시 검증(별도) 및 TS7 린트·최소 workspace 소형 POC.

#### Codex 최종 판정 — 승인 가능 (2026-07-22)

- **판정: 승인 가능.** 승인 기준 HEAD **`95c8445`**.
- 확인: 토큰 중앙화·App/CSS 양 계층 일치, accent-ink `#191A1D`·명암비 테스트 정합, axe color-contrast 포괄 제외 없음, 이전 카라멜 앰버 실행 코드 리터럴 잔존 0, 스펙 002/003/fullscreen 회귀 없음, 운영 HTML·Firebase·Rules·기존 001~006 결과 무변경, 실기기 표시 NOT TESTED 유지.
- **스펙 007 자동검증 단계 완료.** 다음 작업 = 스펙 008 웜 토프 실기기 표시 검증.
