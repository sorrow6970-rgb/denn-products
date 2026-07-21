# 2026-07-21 핸드오프 — 전체 리빌드 킥오프

> 이전까지: 모놀리식 단일파일 앱을 패치로 안정화 시도(프리런치 감사·배치1~3까지 진행).
> 이번 전환점: **버그픽스 중단 → 전체 리빌드 + UI/UX 리뉴얼 결정.**

## 왜 리빌드인가 (결정 배경)

- 기존 `denn-mockup-tool.html`(~16k줄) / `denn-admin.html`(~16k줄)은 수개월 패치 누적으로
  **죽은 함수 정의 817개, `by` 80회 재정의, `zeRender`/`openZoneEditor` 7~15겹 래핑** 상태.
- "보호 함수 무수정" 규칙이 모든 변경을 외부 래퍼로 강제 → 부채가 자기강화됨.
- 모바일 풀스크린/회전 "튐" 등은 정적 수정 반복 실패, 온스크린 진단으로만 겨우 봉합.
- **사용자 판단: 추가 버그픽스는 잡지도 못하고 시간낭비.** → 근본 재작성으로 전환.

## 이번 세션에 확정/작성한 것

1. **결정 확정**
   - 전체 재작성(full rewrite).
   - UI/UX 디자인 **신규 리뉴얼**(기존 화면 답습 아님).
   - 두 앱 중복 로직 → 공유 패키지 통합.
2. **협업 워크플로 규칙(고정):** Codex가 분석·검증 지시를 `docs/rebuild/specs/`에 MD로 작성 → Claude Code가 읽고 코드 반영 → 검증 결과 보고. (루트 `CLAUDE.md` §1)
3. **문서 산출**
   - `CLAUDE.md` (루트) — 규칙·제약·스택·워크플로. **Claude Code가 자동 인식.**
   - `docs/rebuild/00-legacy-analysis.md` — 기존 제품·기능·데이터모델·부채·보존제약 전수 분석.
   - `docs/rebuild/specs/README.md` — 스펙 포맷/템플릿.
   - (이 파일) 킥오프 핸드오프.

## 권장 스택 (제안 — 확정 대기)

pnpm 모노레포 · Vite + TypeScript · React 18 · React Router · Zustand · Tailwind + shadcn/ui ·
네이티브 Canvas 2D 렌더 엔진 유지(`@denn/render`) · Firebase 모듈러 SDK v10(프로젝트 `denn-products` 그대로) ·
Web Crypto AES-GCM 시안 공간 유지 · Vitest + Playwright · Firebase Hosting 배포.
세부·디렉토리 구조는 `CLAUDE.md` §3.

→ **사용자 확정 필요:** 이 스택으로 갈지, 조정할지. 확정되면 `CLAUDE.md` §3의 "(제안)"을 제거.

## 반드시 보존 (요약 — 전문 CLAUDE.md §4)

Firebase 프로젝트 `denn-products` · Storage/Firestore 보안규칙(특히 catch-all read 금지, spaces 불변) ·
`?space=<token>` PBKDF2→AES-GCM 라운드트립 · `published/admin/state.json`·`backup.json`·`S`/`ADM` 스키마 하위호환 ·
운영자(비익명)/소비자(익명) auth 분리 · 인쇄 CORS-clean 캔버스→PNG · 한국어 UI + 카카오 주문 채널.

## 다음 단계

1. **스택 확정** (사용자).
2. **Codex → 스펙 001 작성**: 모노레포 스캐폴드 + 공유 패키지 골격(`@denn/shared|firebase|spaces|render|ui`) + 기존 `denn-*.html`을 `legacy/`로 이동. (`docs/rebuild/specs/001-*.md`)
3. Claude Code가 001 구현 → 검증 → 보고.
4. 이후 스펙 단위로: 데이터 스키마·마이그레이션 → 렌더 엔진 → 목업툴 UI → 어드민 → 시안 공간 → 배포.

## 참조

- 규칙/제약: `CLAUDE.md`
- 레거시 분석: `docs/rebuild/00-legacy-analysis.md`
- 스펙 워크플로: `docs/rebuild/specs/README.md`
- 기존 배포/환경: `docs/2026-07-14-handoff.md`, `docs/local-dev.md`, `docs/firebase-setup.md`
- 라이브: https://design.dennproducts.com
