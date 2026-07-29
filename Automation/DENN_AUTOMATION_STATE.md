# DENN 자동화 상태

```yaml
updated_at: 2026-07-29
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-026-local-user-image-binding-lifecycle
active_unit: spec-027-customer-preview-composer-connection
state: CORRECTION_REQUIRED
baseline_commit: 075ee01
verified_commit: null
origin_relation: "HEAD=origin, ahead/behind 0/0"
working_tree: "dirty: two Codex E2E-regenerated spec-018 PNG files; not restored, not committed"
fix_round: 1
max_fix_rounds: 3
next_transition: CLAUDE_WORKING
commit_owner: Claude Code
push_policy: fast-forward-only
deploy: forbidden
```

## 현재 판정

스펙 026은 Codex 독립 검증에서 **승인 가능**으로 판정됐고(승인 기준 HEAD `69db696`), Claude
Code가 종료 문서만 별도 커밋·push해 `COMMITTED`로 전이했다.

- diff/허용 파일, format, lint, typecheck: PASS
- unit: 755/755 PASS
- build: PASS
  - mockup JS/CSS gzip 68.40/3.16 kB
  - admin JS/CSS gzip 61.09/2.64 kB
- E2E: 69/69 PASS, reporter exit 0
- 실제 Chromium hook owner StrictMode, unmount, in-flight unmount, 반복 remount: PASS
- 포트 4183/4184: free
- OS temp `denn-e2e-*`: 잔여 0
- `git diff --check`: PASS

종료 커밋에는 문서만 포함했다. 기능 코드·설정·테스트·lockfile 변경 0, 커밋된 PNG 0.

실제 기기, 운영 이미지, 대용량 사진 메모리·성능, EXIF 회전은 `NOT TESTED`다. 고객
production 화면 mount, 색·frame logical width 정책, 멀티 zone 공유, template art·Firebase
이미지 합성, pointer/print/저장/주문, Firebase·network·deploy는 미착수다. 이 종료를 상품
미리보기 연결 완료로 해석하지 않는다.

Codex E2E가 아래 두 추적 파일을 다시 생성해 working tree가 dirty다. Claude는 이 파일을
restore, checkout, stage 또는 commit하지 않았다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

## 다음 전이

스펙 027 commit `175a363`과 문서 commit `075ee01`은 check(unit 797), build, E2E 78/78을
통과했다. 그러나 Codex 코드 리뷰에서 `frameColors`에 서로 다른 항목이 같은 canonical
`fill`을 가질 때 swatch의 React key/test id가 중복되고 여러 버튼이 동시에
`aria-pressed=true`가 되는 결함을 확인했다.

Claude Code는 `Automation/NEXT_CLAUDE_PROMPT.md`의 dedup 보완만 수행한다. push 후
`READY_FOR_CODEX`로 전이한다.
