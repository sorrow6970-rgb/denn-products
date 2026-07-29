# NEXT CLAUDE PROMPT

상태: `CODEX_PASSED / READY_FOR_COMMIT`

# 스펙 026 종료 문서 처리

Codex 승인 기준 HEAD는 `69db696`이다. 기능 코드·설정·테스트를 수정하지 말고 종료 문서만
처리한다.

허용 파일:

- `docs/rebuild/specs/026-local-user-image-binding-lifecycle.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- `docs/handoff/2026-07-29-spec-026-local-image-binding-handoff.md`
- `Automation/DENN_AUTOMATION_STATE.md`
- `Automation/NEXT_CLAUDE_PROMPT.md`

종료 기록에 다음을 정확히 반영한다.

- Codex 최종 판정: 승인 가능
- 승인 기준 HEAD: `69db696`
- unit 755/755
- E2E 69/69 PASS, exit 0
- mockup JS/CSS gzip 68.40/3.16 kB
- admin JS/CSS gzip 61.09/2.64 kB
- 실제 Chromium에서 hook owner StrictMode mount-cleanup-remount, owner unmount, in-flight
  unmount, 반복 remount 검증
- 실제 기기, 운영 이미지, 대용량 사진 성능·메모리, EXIF 회전은 NOT TESTED
- 고객 production 화면 mount, 색·logical width 정책, Firebase/network/deploy는 미착수

현재 E2E가 재생성한 아래 PNG 2개는 restore, checkout, stage, commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

문서 전용 커밋을 만들고 일반 fast-forward push한다. HEAD=origin과 ahead/behind 0/0을
확인한다. working tree는 위 PNG 2개 때문에 dirty라고 정직하게 기록한다. 다음 기능은
착수하지 않는다.
