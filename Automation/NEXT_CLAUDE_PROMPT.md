# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 다음 작업 — Codex 검토 (admin 쓰기 경계 조사)

Claude Code가 지시 `802a486`의 **읽기 전용 추가 조사**를 마치고 문서 전용 커밋으로 push했다.

- 보고서: `docs/codex-claude-handoff/reviews/2026-07-31-admin-write-boundary-investigation.md`
- 제품 코드·테스트·CSS·설정 diff **0**, 신규 의존성 0
- **실제 Firebase·network·live·emulator 실행 0**, Rules·config·배포 변경 **0**

### 검토해 달라

1. **인증 경계**: `storage.rules`의 `op()`(non-anonymous)와 20 MiB cap을 리빌드가 **만족만 하면 된다**는
   정리가 맞는지. 레거시의 **미인증 조용한 return**을 재현 금지로 못박을지.
2. **★ 검증 가능성**: `public-catalog/reader.ts`의 **주입 transport + 합성 fake + `*.live.test.ts` 분리**
   패턴을 write port에 그대로 적용하면 **실제 network 없이 계약 검증이 끝난다**는 판단이 맞는지.
3. **★★ 손실 경로 L-1~L-4**(벽시계 rev · upload 전 재확인 없음 · rev 동일 시 분기 고착 ·
   `frameSizes` tombstone 부재로 삭제 부활)가 실제 결함인지, 그리고 **L-4가 cm UI와 충돌**한다는
   지적이 타당한지.
4. **publish가 admin 저장과 별개**이고 **발행본 ≠ `admin/state.json`** 이라는 관측이 맞는지.
   "발행 안 된 변경"을 UI가 알려야 하는지.
5. **`wcm`/`hcm` 정규화안의 W-1·W-2·W-3** — 정규화 시점 재검증과 `aspect` 불일치 진단을
   계약에 넣을지.

### Codex 결정 (X-1~X-6)

**X-1** revision 모델 · **X-2** 충돌 시 자동 병합 vs fail-closed · **X-3** `frameSizes` tombstone ·
**X-4** write port 형태와 경로 allowlist · **X-5** 정규화 검증 재적용 범위 ·
**X-6** 조사 `1aae91d`의 **STOP 4(A/B/C) 명시 답이 아직 없다**

### Founder 결정 (Firebase 표면 = 자동 진행 금지)

**F-A** Auth 도입 여부·시점·계정 · **F-B** 쓰기 범위(admin 저장만 vs 발행까지) ·
**★ F-C** 레거시와 `admin/state.json`을 **공유할지 격리할지** · **F-D** 정규화 snapshot 되쓰기 ·
**F-E** 손실 시나리오 허용 여부(막으려면 조건부 쓰기/잠금 = 범위 확대)

## Claude 다음 작업

**없다.** Codex 검토와 Founder F-A~F-E 결정이 기록되기 전까지 admin 인증·쓰기·발행 관련
**제품 코드·테스트·CSS·설정을 작성하지 않는다**.

- `CORRECTION_REQUIRED`면 지적된 범위만 **문서로** 보완한다
- 승인 + Founder 결정이 나오면 구현 계약(`docs/rebuild/specs/033-*.md`)을 기다린다
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 계속 손대지 않는다
- **C-1(인쇄 좌표 방법 A/B/C) 임의 선택 금지** — Codex 결정이다

## 미해결로 남아 있는 것

- **C-1 인쇄 좌표 방법(후보 A/B/C)** — 확정 스펙 없음
- 인쇄소 요구 전체(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**,
  P-4a의 업로드·주문 전송·배포 차단은 그때까지 유지
- 케이스 인쇄(P-1로 분리), C-2~C-8
- **스펙 032 조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
- 실제 `published/state.json`·`admin/state.json` 내용 → **NOT VERIFIED**(실제 network 금지)
- L-1~L-4 손실 시나리오 재현 → **NOT VERIFIED**
