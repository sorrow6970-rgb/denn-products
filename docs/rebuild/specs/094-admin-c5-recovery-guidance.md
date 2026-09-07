# 094 — C5 실패 후 복구 버튼 안내 분리

2026-09-07, 기준 HEAD=origin `a80cd9c`, rebuild/modern-studio,0/0.
DONE / CODEX_PASSED / LOCAL_VERIFIED. 사용자 연속 구현 지시 및093 NEXT의F-9 후속 단위.
동일 Codex가 계약·소스 검토 후 구현한다. 독립 검수가 아니다.

## WHY / 근거

[093 감사F-9](../../codex-claude-handoff/reviews/2026-09-07-spec-093-admin-c5-pending-error-audit.md):
save-error의 안내가 같지만 upload failure는 직접 save 가능, head failure는load만 가능하다.
[controller derive](../../../apps/admin/src/admin-write/session-controller.ts)는 WRITE_UPLOAD_FAILED에서만
canSave=true를 제공한다. 이를 안내에 반영하되 기존 재시도/폐기 확인/권한 의미를 바꾸지 않는다.
관리 화면의 짧은 문구 보완이며 디자인 생성/리디자인 스킬 대상이 아니다.

## WHAT

FramePrintSizeEditor의 save-error 상태에서만 snapshot.canSave에 따라 다음 고정 문구를 선택한다.

- true: `저장하지 못했습니다. 변경 저장 버튼을 눌러 다시 시도할 수 있습니다.`
- false: `저장하지 못했습니다. 편집 기준 불러오기 버튼을 눌러 최신 상태를 확인하세요.`

다른 상태의 문구, role=status/aria-live=polite, disabled, onClick, controller/port/auth/gate/CAS,
초안 폐기 확인, 자동 retry/merge0을 유지한다. 오류코드/원문/UID/token을 UI에 노출하지 않는다.
새 버튼·레이아웃·CSS·SDK·API·제품 선택이나 복구 성공 보장을 추가하지 않는다.

## WHERE — 한정 목록

1. `apps/admin/src/admin-write/FramePrintSizeEditor.tsx` (문구 선택만).
2. 신규 `apps/admin/src/admin-write/FramePrintSizeEditor.recovery-message.test.tsx`.
3. `tests/e2e/admin-write-pending-error.spec.ts` (두 expected message만,검증완화0).
4. 기존 `docs/rebuild/results/spec-093/README.md`, `measurements.json` 및
   `c5-{upload-failed,head-failed}-{320x568,390x844,1280x800}.png` 정확히6개.
5. 이계약,신규 `docs/handoff/2026-09-07-spec-094-admin-c5-recovery-guidance-handoff.md`,
   신규 `docs/codex-claude-handoff/reviews/2026-09-07-spec-094-admin-c5-recovery-guidance.md`,STATE/NEXT/CURRENT/live.
6. 기존093감사보고서는F-9후속해소절만append.093handoff는전송/후속링크문구만.

fixture·controller·기존unit·다른기존test·packages·config·Rules·package/lockfile·보호파일수정금지.
별도사용자미커밋roadmap/spec091handoff2는보존·커밋제외.신규의존성/다운로드0.

## VERIFY

- source와현재계약의canSave/버튼분기검토. unit은save-error의재저장가능/불가문구,고정오류코드별안전성,
  conflict/outcome-unknown/auth-blocked기존문구보존,렌더중save/load/setDraft 호출0·role불변을검증.
  SSR을동작E2E대신주장하지않는다.
- 기존093 E2E의실제canSave·disabled·복구·lateauth단언은그대로두고문구2개만갱신.
- `node scripts/check.mjs`→`node scripts/e2e-run.mjs`1회. 기존실패를retry/timeout/worker로숨기지않는다.
- 바뀐6PNG모두직접열어버튼안내와한글줄바꿈/넘침/44px/axe/focus를확인한다. README/JSON/SHA일치.
  093의나머지12PNG와092·084등기존증거는변경0이어야한다. 허용밖변경이면STOP.
- 제품고객entrySHA는092/093의2E70F01BA9DC341D10B158587BB30EE8075A2EDE7E66B716BC67903432B2B28E불변.
  운영자entry는문구수정으로변경가능하며실제hash보고.기본gateoff/Firebase초기화0계약보존.
- Git/보호hash·포트4183/4184/4185/8080/9099/9199·staging·diff--check검증.
  test/E2E/증거결과통과후코드·증거와종료문서분리commit/push.권한정본은
  [일반push승인](../../codex-claude-handoff/decisions/2026-09-07-scoped-origin-push-authorization.md).

## 보호 / STOP / NOT TESTED

taste-v2/**,design/README.md,spec038, spec018PNG2,render/src/plan/index.ts,pnpm-workspace.yaml,AGENTS.md는
수정/복원/stage/commit금지.기존canonical의spec018PNG2재생성명시예외만유지하며hash기록·보존.
실제Firebase/project/bucket/UID/데이터·운영쓰기·배포·발행·삭제·자동정리·자동화·forcepush금지.
도구권한거절/미확정실패/범위밖변경/새제품의미필요시STOP.실기기·실사용자이해도·스크린리더·운영복구NOT TESTED.

### QUESTIONS

새제품결정없음.기존허용버튼의명칭을안내에명시하는한정변경이다.전체진행추정85~88%는상향하지않으며
잔여12~15%는100-추정치다.실측률·최종잔여스펙수는확인불가.

### DONE (Codex) — 2026-09-07

문구 선택1파일·신규SSR단위9건·기존E2E 기대문구2개만 변경. controller/권한/복구동작은 불변.
`node scripts/check.mjs` PASS: unit2526/2526(기존2517+9),95파일; format/lint/typecheck/build PASS.
canonical E2E1회:267 tests 실행, exit0, `.last-run.json` passed/failedTests[] 확인.
도구 전체 명령56.626초이며 순수 테스트 소요시간은 로그 말미 절단으로 확인 불가. 재실행0.
변경6PNG 직접 검수, F-9 해소. [검수 근거](../../codex-claude-handoff/reviews/2026-09-07-spec-094-admin-c5-recovery-guidance.md).
코드·증거11파일과 종료9문서를 별도 커밋한다. 정상 push 승인 범위 내 전송, 실제 영수증은 handoff/Git 참조.
