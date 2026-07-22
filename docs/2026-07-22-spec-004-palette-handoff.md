# 2026-07-22 핸드오프 — 스펙 004 카라멜 앰버 팔레트 전환 (Codex 재검증 대기)

> 스펙: `docs/rebuild/specs/004-caramel-amber-palette-migration.md`
> 결정 정본: `docs/codex-claude-handoff/decisions/2026-07-21-caramel-amber-palette.md` (accent-ink `#191A1D` 후속 확정 포함)
> 브랜치: `rebuild/modern-studio` · 기준 정본 HEAD `a0d97e9`(스펙 004 문서) 위에서 구현.

## 요약

Modern Studio(B)의 포인트 팔레트를 확정 카라멜 앰버로 전환하고, 삭제 가능한 001 플랫폼 POC 코드·CSS·명암비 테스트를 그에 맞췄다. 일반 크기 텍스트는 WCAG 2.2 AA를 충족한다. 스펙 002(확대 접근성)·003(Canvas 3:4) 동작은 회귀 없이 보존된다.

## 확정 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| `--accent` | `#B0894E` | 채움·보더·포인트(텍스트 색 아님) |
| `--accent-2` | `#C6A46B` | 채움/그라데이션(위 흰색·일반 텍스트 금지) |
| `--accent-soft` | `#F2E9DA` | 활성 칩/태그/뱃지 배경(위 텍스트는 ink) |
| `--accent-ink` | `#191A1D` | accent 배경 위 일반 크기 텍스트 |
| `--kakao` | `#FEE500` | 카카오 CTA(무변경) |

## 변경 파일 / 커밋

1. `9c63d19` **spec 004: finalize caramel amber design tokens**
   - `docs/rebuild/design/README.md` — accent-ink `#191A1D` 확정, accent/accent-2 채움·보더 전용 명시, Tag/Badge·Nav item accent-soft 배경 텍스트를 ink로 지정, CSS 매핑에 `--accent-ink` 반영.
   - `docs/rebuild/README.md` — 반영 상태(문서·POC=스펙 004, PNG=별도 스펙) 갱신.
2. `58faa30` **spec 004: migrate POC palette and contrast tests**
   - `src/styles.css` — `@theme`+`:root`에 카라멜 앰버 토큰 + `--accent-ink #191A1D`. 흰색-on-accent(brandbar·primary btn) → accent-ink. accent-as-text-on-white(card h2·secondary btn) → ink.
   - `src/App.tsx` — TOKENS 카라멜 앰버, 캔버스 그리드 하드코딩색(`rgba(176,137,78,…)`)·라벨 ink화, 명암비 카드에 accent-ink/accent(5.41:1) 행 추가, tw-probe 문구.
   - `tests/unit/contrast.test.ts` — `#B0894E` 파싱, 흰색/accent AA 미달, **accent-ink/accent AA 통과(신규)**.
   - `tests/e2e/viewport.spec.ts` — color-contrast 포괄 제외 제거 → serious/critical(색대비 포함) 0 강제.
3. (이 커밋) **spec 004: record verification and handoff**
   - `results/auto-check-summary.md` — 2026-07-22 카라멜 앰버 결과 섹션 추가(과거 테라코타 섹션 보존).
   - `docs/codex-claude-handoff/CURRENT.md` — 004 완료·다음 단계.
   - 이 핸드오프.

## ★ 구현 중 발견 — accent의 양방향 명암비 미달과 해소 근거

`#B0894E`는 흰색과 **양방향 모두 3.21:1**이다. 따라서 흰색-on-accent(브랜드바·primary 버튼)뿐 아니라 **accent-를-텍스트로-흰색 위**에 쓴 곳(`.card h2` 제목, `.btn.secondary` 라벨)도 일반 텍스트 AA 미달이었다. 결정서의 accent-ink(on-accent)만으로는 후자가 해소되지 않는다.

- 해소는 **디자인 토큰 역할**을 그대로 적용: `design/README.md`에서 `--ink #191A1D`는 "기본 텍스트/**제목**", ghost 버튼 라벨은 ink, accent는 채움·보더·포인트다. 이에 따라 제목·secondary 라벨은 ink, accent 배경 위 라벨은 accent-ink로 지정했다(임의 해석 아님).
- **Codex 검토 요청 포인트:** `design/README.md`의 **Nav item** 활성 라벨도 accent-soft 배경 2.67:1 문제로 accent→ink로 바꿨다(스펙 §1은 Tag/Badge만 명시). 결정서 원칙(accent-soft 위 텍스트=ink)과 일치한다고 판단했으나 스펙 문언 밖이므로 재검증 시 확인 바람.

## 명암비 결과 (`src/lib/contrast.ts` 계산)

| 조합 | 대비 | 판정 |
|---|---:|---|
| 흰색 / accent `#B0894E` | 3.21:1 | 일반 텍스트 미달 → 미사용 |
| accent-ink `#191A1D` / accent `#B0894E` | **5.41:1** | AA 통과(버튼·브랜드바·칩 라벨) |
| 흰색 / accent-2 `#C6A46B` | 2.35:1 | 미달 → 흰색 텍스트 금지 |
| accent / accent-soft `#F2E9DA` | 2.67:1 | 미달 → accent-soft 위 텍스트는 ink |
| ink / 흰색 | 17.4:1 | AA 통과(제목·secondary) |
| 진회색 `#1A1400` / 카카오 `#FEE500` | 14.35:1 | 무변경 |

## 자동 검증 (로컬, desktop Chromium)

| 게이트 | 결과 |
|---|---|
| `npm ci` | ✅ 취약점 0 |
| `npm run typecheck` (strict) | ✅ 0 오류 |
| `npm run test:unit` | ✅ 31/31 |
| `npm run build` | ✅ JS gzip 66.47KB / CSS gzip 3.35KB |
| `npm run test:e2e` | ✅ 11/11 (color-contrast **강제** 상태) |
| `git diff denn-mockup-tool.html denn-admin.html firebase.json` | 변경 없음 |

## 미검증 (NOT TESTED)

- 새 팔레트의 **실기기 색상 표시**(대비·렌더)는 재검증 전까지 `device-matrix.md`에서 NOT TESTED로 분리 유지.
- 기존 002·003 실기기 PASS 기록은 **보존**(소급 변경 없음).
- Android Chrome 전체 기본배율 1~14 일부 미검증 상태 유지.

## 남은 위험

- accent-ink 누락 시 accent 배경 라벨이 AA 미달 → 이번 구현으로 제거. plain-CSS fallback과 Tailwind `@theme` 양쪽 모두 갱신해 구형 웹뷰 편차 최소화.
- 디자인 PNG 4종은 당분간 새 토큰과 불일치(구 테라코타 시안). 픽셀 기준 아님 — 현재 토큰 문서 우선.

## 롤백

- 스펙 004 커밋(`9c63d19`, `58faa30`, 이 커밋)을 역순으로 `git revert`. 운영본·Firebase·PNG에는 롤백 작업 없음(무변경).

## Codex 재검증 요청

읽기 전용 diff로 `승인 가능 / 수정 후 재검증 / 재설계 필요` 판정 요청. 중점: (1) accent-on-white 해소를 위한 h2·secondary·nav 라벨 ink화의 스펙 정합성, (2) color-contrast 하드페일 전환 타당성, (3) 과거 테라코타 기록·002/003 실기기 결과 보존 여부.

---

## 재검증 라운드 2 — Codex "수정 후 재검증" 반영 (2026-07-22)

> Codex 판정: **수정 후 재검증**. 전체 구현 방향·nav 라벨 ink화는 **승인**, 재설계 불필요. 접근성 문서·테스트 보완만 수행.
> 최초 검증 결과(위)는 보존한다. 아래는 보완 라운드다.

### 변경 파일 / 커밋

1. (수정 커밋) `docs/rebuild/design/design 규격` — Nav item·Table pill 접근성 규격 강화 + `tests/unit/contrast.test.ts` +3
2. (handoff 커밋) `specs/004`(DONE 재검증 라운드) · 이 핸드오프 · `results/auto-check-summary.md`(재검증 노트)

### 보완 내용

- **Nav item(design/README.md):** 활성 text·의미 있는 icon 모두 `--ink`. accent는 accent-soft 위 2.67:1로 **비텍스트 UI 3:1도 미달**이므로 보더·링은 흰색·surface 등 3:1 이상 배경에서만. 색만으로 활성 표현 금지.
- **Table pill(design/README.md):** 신규 pill = accent-soft 배경 + `--ink` 텍스트, accent는 대비 확보된 외곽/비필수 장식 한정. 확정=성공색은 명암비 미확인 → **별도 검증 대상**으로 표시(자동 통과 단정 금지).
- **명암비 테스트 +3(contrast.test.ts):** 흰색/accent-2 `#C6A46B` 3:1 미달(2.35), accent/accent-soft `#F2E9DA` 4.5:1 미달(2.67), ink/accent-soft AA 통과(14.45).

### 재검증 결과 (로컬 desktop Chromium)

| 게이트 | 결과 |
|---|---|
| `npm run typecheck` | ✅ 0 오류 |
| `npm run test:unit` | ✅ **34/34** (+3 명암비) |
| `npm run build` | ✅ JS gzip 66.47KB / CSS gzip 3.35KB |
| `npm run test:e2e` | ✅ **11/11** (color-contrast serious/critical 0) |
| 운영 HTML·Firebase·PNG diff | 변경 없음 ✅ |
| 002 확대·003 Canvas 회귀 | 없음 ✅ |

### 범위 준수

- POC UI에 nav/table 컴포넌트가 없어 신규 컴포넌트 생성 없음 — 디자인 규격 문서 + 명암비 테스트 보강만.
- 팔레트 무관 코드 수정 없음. 실기기 색상 NOT TESTED·002/003 실기기 결과·CURRENT 다음 단계 유지. 실기기·PNG·Tailwind·배포 계속 대기.
