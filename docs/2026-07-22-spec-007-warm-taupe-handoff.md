# 2026-07-22 핸드오프 — 스펙 007 웜 토프 팔레트 마이그레이션 (Codex 재검증 대기)

> 스펙: `docs/rebuild/specs/007-warm-taupe-palette-migration.md`
> 결정 정본: `docs/codex-claude-handoff/decisions/2026-07-22-warm-taupe-palette.md` (사용자 최종 확정)
> 브랜치: `rebuild/modern-studio`. 코드 커밋 ↔ 핸드오프 커밋 분리(디자인 PNG diff는 code 커밋 미포함).

## 요약

사용자 최종 확정 Modern Studio **웜 토프** 팔레트를 삭제 가능한 플랫폼 POC에 적용하고, 스펙 002 확대 접근성·스펙 003 Canvas 3:4 동작을 손상 없이 유지함을 자동 검증했다. 일반 크기 텍스트는 WCAG 2.2 AA 충족. 카라멜 앰버(스펙 004·005) 기록은 역사로 보존.

## 확정 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| `--accent` | `#9F887A` | 채움·보더·포인트(텍스트 색 아님) |
| `--accent-2` | `#BAA598` | 채움/그라데이션(위 흰색·일반 텍스트 금지) |
| `--accent-soft` | `#EEE8E1` | 활성 칩/태그/뱃지 배경(위 텍스트는 ink) |
| `--accent-ink` | `#191A1D` | accent 배경 위 일반 크기 텍스트 |
| `--kakao` | `#FEE500` | 카카오 CTA(무변경) |

## 커밋 구성 (분리)

1. **docs(확정 보존):** `CLAUDE.md`·`docs/rebuild/README.md`·`docs/rebuild/design/README.md`·`docs/rebuild/design/1~4-B.png`(수정) + `5-styleguide-B.png`(신규)·`docs/rebuild/specs/README.md`·`decisions/2026-07-22-warm-taupe-palette.md` — 사용자/Codex 확정분 보존.
2. **code:** `src/App.tsx`·`src/styles.css`·`tests/unit/contrast.test.ts`·`tests/e2e/viewport.spec.ts` — 팔레트 토큰·명암비 테스트·주석 갱신. (디자인 PNG·운영본 미포함)
3. **handoff:** 이 문서·`specs/007`(DONE)·`CURRENT.md`·`results/auto-check-summary.md`.

## 변경 내용 (code)

- `styles.css` @theme + :root fallback: accent `#9f887a`, accent-2 `#baa598`, accent-soft `#eee8e1`(accent-ink `#191a1d`·kakao 유지). 양 계층 일치.
- `App.tsx`: TOKENS 웜 토프, 캔버스 그리드 하드코딩색 `rgba(159,136,122,0.25)`, 명암비 카드 라벨(#9F887A) 및 문구(spec 007), tw-probe 문구.
- `contrast.test.ts`: `#9F887A` 파싱 + 흰색/accent 3.35 AA미달 · ink/accent 5.20 AA통과 · 흰색/accent-2 2.35 3:1미달 · accent/accent-soft 2.75 4.5·3:1미달 · ink/accent-soft AA통과 고정.
- `viewport.spec.ts`: color-contrast 포괄 제외 없음 유지, 주석 spec 007/웜 토프로 갱신.
- 색 리터럴은 중앙 토큰 계층에서만 관리(컴포넌트 분산·병행 분기·V2/fix 없음).

## 명암비 (실측)

| 조합 | 대비 | 판정 |
|---|---:|---|
| 흰색 / accent `#9F887A` | 3.35:1 | 일반 텍스트 미달 → 미사용 |
| accent-ink `#191A1D` / accent | **5.20:1** | AA ✅ |
| 흰색 / accent-2 `#BAA598` | 2.35:1 | 3:1 미달 → 흰색 금지 |
| accent / accent-soft `#EEE8E1` | 2.75:1 | 4.5·3:1 미달 → ink 사용 |
| ink `#191A1D` / accent-soft | 14.31:1 | AA ✅ |

## 자동 검증 (로컬 desktop Chromium)

| 게이트 | 결과 |
|---|---|
| `npm ci` | ✅ 취약점 0 |
| `npm run typecheck`(strict) | ✅ 0 오류 |
| `npm run test:unit` | ✅ 34/34 |
| `npm run build` | ✅ JS gzip 66.47KB / CSS gzip 3.35KB |
| `npm run test:e2e` | ✅ 11/11 (color-contrast 강제, serious/critical 0) |
| 이전 팔레트 리터럴 잔존 | 0 (rg 확인) |
| 002 확대·003 Canvas·fullscreen 회귀 | 없음 |

## 미검증 (NOT TESTED)

- 새 웜 토프의 **실기기 색상 표시**는 별도 후속 검증 단계. 현재 추정 PASS 금지.
- 기존 001~005 실기기·검증 결과는 역사로 보존(무변경).

## 남은 위험

- 시안(PNG)에 흰색-on-accent가 남을 수 있으나 접근성 토큰 계약 우선(구현은 이를 준수).
- 구형 웹뷰 렌더 편차는 자동검증으로 완전 해소 불가 → 실기기 표시 검증 별도.

## 롤백

- 스펙 007 code·handoff 커밋 역순 `git revert`. 운영본·Firebase 롤백 없음.

## Codex 재검증 요청

읽기 전용 diff로 판정 요청. 중점: (1) 토큰 중앙화·양 계층 일치·잔존 리터럴 0, (2) 명암비 테스트=계산 일치·color-contrast 강제, (3) 002/003/fullscreen 회귀 없음, (4) 디자인 PNG·운영본·001~006 결과가 code 커밋에 미포함, (5) 실기기 NOT TESTED 유지.
