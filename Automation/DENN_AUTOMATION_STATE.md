# DENN 자동화 상태

```yaml
updated_at: 2026-07-29
branch: rebuild/modern-studio
pipeline: rebuild-modern-studio
completed_unit: spec-027-customer-preview-composer-connection
active_unit: spec-028-pre-template-art-canvas-cors-investigation
state: WAITING_FOR_CLAUDE
baseline_commit: beb16ea
verified_commit: beb16ea
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

스펙 027은 Codex 독립 재검증에서 **승인 가능**으로 판정됐고(승인 기준 HEAD `06d9700`,
보완 코드 `6fb8630`), Claude Code가 종료 문서만 별도 커밋·push해 `COMMITTED`로 전이했다.

- canonical frame fill dedup, source order 첫 유효 이름 보존: PASS
- format, lint, typecheck: PASS
- unit: 802/802 PASS
- build: mockup JS/CSS gzip 77.55/3.53 kB, admin JS/CSS gzip 61.09/2.64 kB
- E2E: 78/78 PASS, exit 0
- 고객 `/`의 실제 case/frame Canvas 픽셀, 키보드 전용, 320px/desktop, axe, 누출 0: PASS
- 포트 4183/4184 free, OS temp `denn-e2e-*` 잔여 0, `git diff --check` PASS

종료 커밋에는 문서만 포함했다. 기능 코드·설정·테스트·lockfile 변경 0, 커밋된 PNG 0.

실제 기기, 실제 200% 확대, 운영 이미지, 대용량 사진 메모리·성능, EXIF 회전은 `NOT TESTED`다.
template art, Firebase image CORS-clean 합성, pointer/pan/zoom, text/clock/watermark,
print/export, 저장·주문·카카오, Firebase·network·deploy는 미착수다. 이 종료는 **로컬 사용자
사진 기반 첫 고객 preview 연결**이며 상품 미리보기 기능 전체의 완성이 아니다.

Codex E2E가 아래 두 추적 파일을 다시 생성해 working tree가 dirty다. Claude는 이 파일을
restore, checkout, stage 또는 commit하지 않았다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

## 다음 전이

Codex가 종료 commit `beb16ea`, HEAD=origin, ahead/behind 0/0을 확인했다. 다음 단계는
템플릿 아트를 고객 Canvas에 넣기 전에 필요한 CORS-clean·decode·layer-plan 계약의 읽기
전용 사전 조사다. Claude Code는 `Automation/NEXT_CLAUDE_PROMPT.md` 범위만 조사하고 구현은
시작하지 않는다.
