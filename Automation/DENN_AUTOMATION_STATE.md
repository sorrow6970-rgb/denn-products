# DENN 자동화 상태

```yaml
updated_at: 2026-07-29
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-027-customer-preview-composer-connection
active_unit: spec-028-pre-template-art-canvas-cors-investigation
state: READY_FOR_CODEX
baseline_commit: beb16ea
verified_commit: beb16ea
origin_relation: "HEAD=origin, ahead/behind 0/0"
working_tree: "dirty: two Codex E2E-regenerated spec-018 PNG files; not restored, not committed"
fix_round: 0
max_fix_rounds: 3
next_transition: CODEX_VERIFYING
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

## 현재 판정

스펙 027은 Codex 독립 재검증에서 **승인 가능**으로 판정됐고(승인 기준 HEAD `06d9700`), 종료
문서까지 commit·push돼 확인됐다(종료 commit `beb16ea`).

이어서 Codex가 지시한 스펙 028 **사전 조사(읽기 전용)** 를 Claude Code가 수행해 push했다.

- 산출물: `docs/codex-claude-handoff/reviews/2026-07-29-template-art-canvas-cors-investigation.md`
- 조사 12항목 전부 응답, 근거는 파일·라인 인용
- `CONFIRMED` / `NOT DECIDED` / `NOT VERIFIED` / `NOT TESTED` 구분
- 코드·설정·테스트·PNG·lockfile 변경 0
- 실제 Firebase GET, 이미지 다운로드, live test, CORS 변경, Rules/Hosting/deploy 0
- 운영 URL·token·base64 미복사

핵심 결론(요약):

- 레거시 아트는 stretch(케이스=캔버스 전체, 액자=mat rect)이며 일부 uploaded 액자는 아트 픽셀을
  읽어 crop을 추정한다 → 현재 command 어휘로는 표현 불가, `draw-image-cover` 재사용은 의미적으로
  안전하지 않다.
- 스펙 018 projection과 `@denn/firebase` trust boundary는 그대로 재사용 가능하다.
- `crossOrigin`은 `src` 이전에 설정해야 하고, ACAO가 없으면 로드가 실패하며, taint는 픽셀을 읽는
  단계(인쇄/export)에서만 드러난다. 레거시의 "crossOrigin 없이 재시도"는 복제 금지다.
- 아트 로드 실패 정책이 레거시에서 케이스와 액자가 서로 다르다.

결정이 필요한 항목 5건(D-1 stretch command, D-2 legacy crop 지원/거부, D-3 실패 정책(Founder),
D-4 캐시 정책, D-5 버킷 CORS 미설정 시 처리(Founder))은 보고서 §13에 정리했다.

Codex E2E가 아래 두 추적 파일을 다시 생성해 working tree가 dirty다. Claude는 이 파일을
restore, checkout, stage 또는 commit하지 않았다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

## 다음 전이

Codex가 조사 근거와 결정 항목을 검토한다. 구현 스펙 028은 Codex가 별도로 작성하며, Claude
Code는 그 스펙과 `Automation/NEXT_CLAUDE_PROMPT.md`가 갱신되기 전까지 기능 작업을 시작하지
않는다.
