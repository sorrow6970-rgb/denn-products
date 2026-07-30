# NEXT CLAUDE PROMPT

상태: `COMMITTED` → Codex 최종 hash 확인 대기

# 스펙 028 종료 완료 · 다음 지시 대기 (착수 금지)

Codex가 2026-07-30 보완 코드 `d4fb99b`를 독립 재검증해 승인 가능으로 판정했고,
Claude Code가 **종료 문서만** 하나의 문서 commit으로 처리해 일반 fast-forward push했다.
스펙 028은 `DONE`, 상태는 `COMMITTED`다.

## 처리한 것

- 종료 문서 커밋 파일(허용 목록과 정확히 일치)
  - `docs/rebuild/specs/028-template-art-stretch-cors-owner.md` (§CODEX_PASSED 종료 섹션)
  - `docs/handoff/2026-07-29-spec-028-template-art-handoff.md` (§11 종료)
  - `docs/handoff/2026-07-29-session-end-handoff.md` (최종 상태 append)
  - `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
  - `docs/codex-claude-handoff/CURRENT.md`
  - `Automation/DENN_AUTOMATION_STATE.md`
  - `Automation/NEXT_CLAUDE_PROMPT.md`
- 기록한 Codex 독립 게이트: frozen install PASS·lockfile diff 0 / format·lint·typecheck PASS /
  unit 893/893 / build(mockup JS 254.06 kB·gzip 78.90, CSS 13.80/3.53; admin 193.53/61.09, 8.54/2.64) /
  E2E 85/85 PASS·exit 0 / `git diff --check` PASS / 포트 4183·4184 listener 0 /
  OS temp `denn-e2e-*` 0 / 저장소 소속 node·esbuild 0 / 고객 dist fixture 0 / HEAD=origin·0/0
- 기능 코드·테스트·설정·`package.json`·`pnpm-lock.yaml` 변경 **0**, 신규 의존성 0
- 실제 network·live·Firebase·CORS·Rules/Hosting·deploy **0**
- 스펙 018 PNG 2개는 restore·checkout·stage·commit 하지 않음(working tree에 그 2개만 잔존)

## 다음 폴링에서 할 일

1. `git fetch --all --prune` → HEAD=origin, ahead/behind 0/0 확인.
2. working tree에 아래 PNG 2개 외 변경이 없는지 확인.
3. Codex가 종료 문서 커밋의 최종 hash를 확인해 `DONE`을 기록했는지 본다.
4. Codex가 **새 스펙(029 등)을 push하기 전까지는 어떤 파일도 수정·commit·push하지 않고 대기**한다.
   상태 변화가 없으면 반복 보고하지 말고 조용히 다음 폴링을 기다린다.

## 금지 (계속 유지)

- 다음 스펙(029 등) 착수, 사전조사, 새 기능·정책 변경·의존성 추가
- 스펙 028 코드 재수정(승인 완료 — 재검증 없는 수정 금지)
- legacy builder crop 지원, builtin multi-zone, text/clock, pointer, print/export, 저장·주문
- Firebase SDK/Auth/Rules/CORS/Hosting, 실제 network/live test, 운영 이미지 다운로드, deploy
  (`hosting.public:"."` → Hosting 격리 전 배포 금지)
- force push, merge, rebase, `reset --hard`, stale lock 삭제, broad cleanup, 사용자 변경 restore/checkout
- 아래 두 파일의 restore·checkout·stage·commit
  - `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
  - `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

## NOT TESTED / NOT VERIFIED (스펙 028 종료 후에도 유지)

- 운영 bucket CORS와 ACAO 부재 시 실제 브라우저 실패
- 운영 이미지·카탈로그
- 실기기 4환경과 실제 200% 확대
- print/export taint
- 대용량 아트 성능
- 썸네일(non-CORS)과 owner(anonymous)의 동일 URL 캐시 오염 가능성
