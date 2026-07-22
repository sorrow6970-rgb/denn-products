# CLAUDE.md — DENN PRODUCTS 리빌드 규칙 (필독)

> 이 파일은 Claude Code가 세션 시작 시 자동으로 읽는다. 여기 적힌 규칙은 **강제**다.
> 최종 갱신: 2026-07-22 (웜 토프 최종 결정 및 스펙 006 종료).

---

## 0. 지금 상태 한 줄

기존 DENN PRODUCTS는 **바닐라 JS 모놀리식 단일파일 2개**(`denn-mockup-tool.html` ~16k줄, `denn-admin.html` ~16k줄)로,
수개월 패치 누적(죽은 함수 정의 817개, `by` 80회 재정의 등)으로 **더 이상 버그픽스로 안정화가 불가능한 상태**다.
→ **결정: 버그픽스 중단, 전체 리빌드(full rewrite) + UI/UX 신규 리뉴얼.**

기존 코드/데이터 전수 분석은 **[docs/rebuild/00-legacy-analysis.md](docs/rebuild/00-legacy-analysis.md)** 참조. 리빌드 관련 작업 전 반드시 이 문서를 먼저 읽는다.

---

## 1. ★★ 협업 워크플로 규칙 (Codex ↔ Claude Code) — 최우선 ★★

이 프로젝트의 작업 분담은 **고정**이다:

1. **Codex**가 "무엇을 / 왜 / 어떻게 검증하는지"의 **작업 분석·설계·검증 지시**를 작성한다.
   → 반드시 **MD 파일**로 `docs/rebuild/specs/` 아래에 남긴다. (파일명 규칙은 §1.2)
2. **Claude Code(= 나)**는 그 **스펙 MD를 읽고 코드로 반영**한다.
   - 스펙에 적힌 범위만 구현한다. **스펙에 없는 범위를 임의로 확장·리팩터하지 않는다(스코프 고정).**
   - 스펙이 불명확하거나 모순되면 **임의로 결정하지 말고**, 해당 스펙 파일 하단 `### QUESTIONS` 섹션에 질문을 남기고 사용자 확인을 받는다.
3. 구현 후 Claude Code는 **완료 보고**를 남긴다: 무엇을 바꿨는지(파일/커밋) + 스펙의 검증 절차 실행 결과.
   → 스펙 파일 하단 `### DONE (Claude)` 섹션에 append 하거나 `docs/rebuild/specs/<same-name>.done.md`로 작성.

### 1.1 요약 (외우기)
> **Codex = 분석·지시·검증 기준을 MD로 쓴다. Claude = MD를 읽고 코드로 구현하고 검증 결과를 보고한다.**
> Claude는 스펙 없이 리빌드 코드를 임의로 진행하지 않는다.

### 1.2 스펙 파일 규칙
- 위치: `docs/rebuild/specs/`
- 파일명: `NNN-<slug>.md` (예: `007-warm-taupe-palette-migration.md`, `012-room-mockup-engine.md`) — NNN은 기존 번호와 중복하지 않는 3자리 순번.
- 포맷/템플릿: `docs/rebuild/specs/README.md` 참조.

---

## 2. 리빌드 범위·목표 (확정)

- **전체 재작성(full rewrite).** 기존 모놀리식을 모듈형 코드베이스로 옮긴다.
- **UI/UX 디자인 신규 리뉴얼.** 기존 화면을 그대로 옮기지 않는다 — 새 디자인 시스템으로 다시 만든다. (단, 제품 기능/데이터 계약은 §4 제약 내에서 보존.)
  - **디자인 방향 확정(2026-07-21): 무드 B · "Modern Studio"** — 화이트 베이스 + 뉴트럴 그레이 + 웜 토프 포인트(`#9F887A`) + 라운드 카드. 정확한 토큰/컴포넌트 규격·참고 시안은 **[docs/rebuild/design/README.md](docs/rebuild/design/README.md)**. 모든 신규 UI는 이 토큰을 기준으로 만든다. 카카오 버튼(`#FEE500`)은 브랜드 고정.
- 두 앱(목업툴·어드민)의 **중복 로직을 공유 패키지로 통합**한다.

## 3. 기술 스택 기준 (스펙 006 승인)

- 런타임: **Node.js 24 LTS**
- 모노레포: **pnpm workspaces** 후보. Corepack + `packageManager` 정확 버전 + 단일 `pnpm-lock.yaml`을 사용한다. 최소 workspace 구조는 후속 소형 POC에서 확정한다.
- 빌드/UI: **Vite 8 + TypeScript 7 + React 19**
- 라우팅: 실제 라우트 요구가 생길 때까지 **React Router 미도입**
- 상태관리: 실제 전역 상태 요구가 생길 때까지 **Zustand 미도입**
- 디자인 시스템/스타일: **Tailwind CSS v4 확정**. shadcn/ui/Radix는 필요한 컴포넌트만 선택 도입한다.
- 렌더링: **네이티브 Canvas 2D 유지** — `@denn/render`로 프레임워크 독립 엔진화(인쇄 픽셀 정확도 보존). 인터랙티브 zone 에디터 오버레이에만 선택적으로 Konva 검토(인쇄 export에는 사용 금지).
- Firebase: 모듈러 SDK 후보, 프로젝트 `denn-products` 그대로, `@denn/firebase`로 래핑. 정확 SDK 버전과 연결은 별도 스펙에서 검증한다.
- 암호화: **Web Crypto PBKDF2→AES-GCM 유지**, `@denn/spaces`
- 검증: **Vitest**(유닛) + **Playwright**(e2e, 특히 모바일 풀스크린/회전 + 인쇄 export CORS)
- 배포: Vite build → **Firebase Hosting** (`firebase.json` public을 `dist`로, rewrite/no-cache 유지)

목표 디렉토리 구조(생성은 별도 스캐폴드 스펙에서만):
```
denn-products/
  packages/
    shared/    @denn/shared    타입 + 카탈로그 스키마 + 마이그레이션
    firebase/  @denn/firebase  init/auth/storage/firestore 헬퍼
    spaces/    @denn/spaces    PBKDF2/AES-GCM 암호화 시안 공간
    render/    @denn/render    네이티브 캔버스 프레임/케이스/룸/사이즈가이드 엔진
    ui/        @denn/ui        디자인 시스템 컴포넌트
  apps/
    mockup/    고객 툴  (design.dennproducts.com/)
    admin/     운영자 콘솔 (/admin)
  legacy/      기존 운영본의 복사본(참조·롤백용; 원본 이동은 cutover 전 금지)
  docs/
  firebase.json ...
```

## 4. ★ 절대 보존 제약 (리빌드가 깨면 안 되는 것) ★

전체 목록·근거는 `docs/rebuild/00-legacy-analysis.md` §7. 요약:

1. **Firebase 프로젝트 = `denn-products`** (bucket `denn-products.firebasestorage.app`) 그대로.
2. **Storage 보안 모델**(`storage.rules`) 그대로: `admin/` 비공개, `published|templates|placeholders|guides|mockups|editor-overlays/` public-read·운영자-write, `temp-share|proofs/` public-read·anon-write. **catch-all `read:if true` 절대 금지**(admin/ 노출). 20MB cap.
3. **Firestore `spaces/{token}`**(`firestore.rules`): read/create 개방, **update/delete 금지(불변)**.
4. **암호화 시안 공간:** `?space=<token>` URL + **PBKDF2(120,000, SHA-256)→AES-GCM-256** + `space-scene-v1` 페이로드가 **기존 발급 링크와 라운드트립**해야 함.
5. **데이터 하위호환:** 기존 `published/state.json`·`admin/state.json`·`backup.json`(~35MB)·`S`/`ADM` 스키마(`storagePath`, `__opRev`/`__cloudRev`/`__publishedAt`). 구 flat `roomBackgroundSettings` 키 마이그레이션.
6. **auth 분리:** 운영자 Email/Password(비익명) vs 소비자 익명. 규칙은 `sign_in_provider != 'anonymous'`.
7. **인쇄 출력 = CORS-clean 캔버스 → PNG.** tainted canvas면 인쇄파일 0×0 = 주문 차단. `crossOrigin='anonymous'` + 버킷 CORS 유지.
8. **호스팅/라우팅:** `/`=고객, 어드민 별도 경로, HTML `no-cache`.
9. **한국어 UI + 카카오톡 주문 채널**(`brand.kakaoUrl`)은 제품 정의 요소.
10. **런치 차단 동작:** 모바일 세로/가로 풀스크린 "튐" 금지(scroll-pin), 워터마크는 저장 시만, 케이스 탭 기본 비활성 플래그, `?space=` 씬 재현이 운영자 앵커/스케일/햇빛/시계와 일치.

## 5. 배포·환경 참고 (기존)

- 라이브: `https://design.dennproducts.com` (루트→목업, `/denn-admin.html`→어드민)
- 배포 명령: `firebase deploy --only hosting --non-interactive` (자동정책이 막을 수 있어 사용자가 `!` 붙여 직접 실행). firebase CLI=`%APPDATA%\npm`, 로그인 `sorrow6970@gmail.com`.
- wip 테스트 채널: `firebase hosting:channel:deploy wip --expires 30d`
- 로컬 개발은 반드시 `localhost`(파일 `file://` 아님 — 쿼터/CORS). 참조: `docs/local-dev.md`, `docs/firebase-setup.md`.

## 6. 작업 원칙

- 스펙(Codex) 없이 리빌드 코드를 임의 진행하지 않는다(§1).
- 커밋은 **스펙 단위**로, 메시지에 스펙 번호(`spec 012:`)를 참조한다.
- 기존 운영 `denn-*.html`은 cutover 전까지 현재 경로에서 **이동·삭제·이름 변경하지 않는다**. 필요하면 별도 스펙에서 `legacy/`에 복사본만 만든다.
- 리빌드 진행 상황은 `docs/`에 날짜별 핸드오프(`YYYY-MM-DD-*-handoff.md`)로 남긴다.

## 7. 문서 우선순위와 현재 작업

```text
사용자의 최신 명시적 결정
→ docs/codex-claude-handoff/decisions/
→ 현재 docs/rebuild/specs/NNN-*.md
→ docs/codex-claude-handoff/CURRENT.md
→ 이 CLAUDE.md 요약
→ 기타 참고·과거 핸드오프
```

충돌·모순이 있으면 구현하지 말고 현재 스펙의 `QUESTIONS`에 기록한다. 실제 작업 포인터는 `docs/codex-claude-handoff/CURRENT.md`만을 정본으로 사용한다.
