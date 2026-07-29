# DENN 자동화 상태

```yaml
updated_at: 2026-07-29
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-025
active_unit: spec-026-local-user-image-binding-lifecycle
state: CORRECTION_REQUIRED
baseline_commit: 449b027
verified_commit: null
origin_relation: "HEAD=origin, ahead/behind 0/0"
working_tree: "dirty: two Codex E2E-regenerated spec-018 PNG files; do not restore or commit"
fix_round: 1
max_fix_rounds: 3
next_transition: CLAUDE_WORKING
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

## 현재 판정

스펙 026 구현 commit `ae798d5`, 문서 commit `0859e50`, 후속 문서 commit `449b027`을
Codex가 독립 검토했다. frozen install, check, unit 755, build, E2E 65는 통과했지만 최종
승인 전 아래 보완이 필요하다.

1. `useLocalImageBinding`의 실제 React owner unmount와 StrictMode mount-cleanup-remount를
   실제 mount 환경에서 검증한다. 현재 정적 렌더 unit과 surface-only unmount E2E는 이 계약을
   증명하지 못한다.
2. cleanup 내부 `setController(...)`의 실제 unmount state update 위험을 검토하고, 필요하면
   최소 수정한다.
3. Founder가 현재 PNG 2개 복원을 승인했다는 문서 주장을 사실에 맞게 정정한다.

Codex E2E가 아래 두 추적 파일을 다시 생성해 working tree가 dirty다. Claude는 이 파일을
restore, checkout, stage 또는 commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

## 다음 전이

Claude Code는 `Automation/NEXT_CLAUDE_PROMPT.md`의 보완 범위만 수행한다. PNG 2개는 그대로
두고 코드/test와 문서만 정확히 분리 commit/push한 뒤 `READY_FOR_CODEX`로 전이한다.
