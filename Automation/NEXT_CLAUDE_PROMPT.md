# NEXT CLAUDE PROMPT

상태: `CORRECTION_REQUIRED`

# 스펙 027 보완 라운드 1 — 중복 frame fill 결정적 dedup

기준 HEAD: `075ee01`

## 재현

`CatalogDocumentV1.data.frameColors`에 다음처럼 서로 다른 항목이 같은 canonical fill을
가질 수 있다.

```ts
[
  { id: "a", name: "블랙 A", fill: "#1a1a1a" },
  { id: "b", name: "블랙 B", fill: "#1A1A1A" },
]
```

현재 `readFrameColorOptions`는 두 옵션을 모두 반환한다. `PreviewComposer`는
`key={option.value}`와 `data-testid`에 값을 사용하고 선택 여부도 값으로 비교하므로,
중복 key/test id가 생기고 클릭 후 두 버튼이 동시에 선택된 것으로 표시될 수 있다.

## 보완 계약

- canonical uppercase `value` 기준으로 결정적으로 dedup한다.
- source order의 첫 유효 항목과 그 이름을 보존한다.
- 뒤의 중복 항목은 표시하지 않는다.
- 자동 선택은 여전히 0이다.
- raw id/object/diagnostic은 출력하지 않는다.
- hostile getter throw 0과 1회 읽기 성질을 유지한다.

허용 파일:

- `apps/mockup/src/preview/previewContracts.ts`
- `apps/mockup/src/preview/previewContracts.test.ts`
- 필요 시 `apps/mockup/src/preview/PreviewComposer.test.tsx`
- `docs/rebuild/specs/027-customer-preview-composer-connection.md`
- `docs/codex-claude-handoff/CURRENT.md`
- `docs/live/CLAUDE_LIVE_PATCH_LOG.md`
- `docs/handoff/2026-07-29-spec-027-customer-preview-handoff.md`

필수 테스트:

- 대소문자만 다른 동일 fill 2개 → 첫 항목 1개
- 동일 fill 3개 → 1개
- 서로 다른 fill의 source order 유지
- 컴포넌트 markup에 중복 key 경고 0, swatch 1개, 자동 선택 0

전체 check와 E2E를 다시 실행한다. 코드/test와 문서를 분리 commit하고 일반 fast-forward
push한다. 아래 PNG 2개는 restore, checkout, stage, commit하지 않는다.

- `docs/rebuild/results/spec-018/browse-desktop-1280x800.png`
- `docs/rebuild/results/spec-018/browse-mobile-390x844.png`

다음 기능은 시작하지 않는다.
