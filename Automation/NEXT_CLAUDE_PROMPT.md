# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## Founder E-4·E-5·E-6 승인 완료 — Codex E-1~E-3 + 구현 계약 대기

Claude Code가 2026-07-31에 Founder 결정을 **문서 전용**으로 기록하고 일반 fast-forward push했다.

- 정본: `docs/codex-claude-handoff/decisions/2026-07-31-local-png-export-ui-decisions.md`
- 기준 HEAD `5480e54`
- 제품 코드·테스트·CSS·설정·lockfile diff **0**, 신규 의존성 0
- 실제 network·live·Firebase·업로드·주문 전송·배포 **0**
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 손대지 않았다

## ⚠️ 절차 기록

조사 보고서 §9는 E-4·E-5·E-6을 **"결정 필요" 항목으로만** 올렸고 **권장안을 명시하지 않았다.**
Claude가 이미 확정된 제약(P-5c·P-4a·`PREVIEW_MESSAGES` 규율)에서 **도출한 권장안을 명시하고
그것을 승인분으로 기록**했다. **Founder 의도와 다르면 결정 문서만 정정하면 된다.**

## 확정된 것

- **E-4** 파일명 `denn-frame-<W>x<H>cm-<YYYYMMDD-HHmmss>.png` — **고객 문구·id·token 0**,
  **사이즈 이름 대신 cm 치수**, 읽을 수 있는 로컬 시각
- **E-5** 미리보기 아래 **독립 영역**, **주문 CTA와 분리**, 버튼 `인쇄용 파일 내려받기`
  (**"주문" 금지**), 실패 문구에 **"다시 시도" 금지**, 비활성 사유는 **고정 문구 + `aria-describedby`**
- **E-6** **수치 비노출** — `인쇄 설정은 인쇄소 확인 전 임시값입니다.` 한 줄만

## Codex 다음 작업

이 결정과 조사 보고서
(`docs/codex-claude-handoff/reviews/2026-07-31-local-frame-png-export-seam-investigation.md`)를
입력으로 **구현 계약**(`docs/rebuild/specs/NNN-*.md`)을 작성한다. 최소한 다음을 확정해 달라.

- **★ E-1 = C-1**: 인쇄 좌표를 얻는 방법 — 조사 §2가 **plan 고정 + uniform transform**에 유리한
  근거를 모았으나 **Claude는 고르지 않았다**. 후보 A/B/C 중 **택일**
- **E-2**: §2.5의 **비정수 배율·자간 품질·clip 반픽셀**을 구현 전에 측정할지
- **E-3**: `minLongSide` 업스케일과 `maxPixels` 다운스케일이 **충돌할 때 fail-closed**로 볼지
- 허용 파일 목록(조사 §8이 최소 집합 후보를 제시), 게이트, NOT TESTED 경계
- **P-4a의 출력 차단 조건**을 스펙에 명시적으로 남길 것
- 파일명 세부(cm 소수점 표기, 같은 초 중복 처리)

## Claude 다음 작업

**없다.** 구현 계약이 Git 히스토리에 기록되고 상태가 `WAITING_FOR_CLAUDE`로 바뀌기 전까지
인쇄/export 관련 **제품 코드·테스트·CSS·설정을 작성하지 않는다**.
계약이 untracked면 Founder 상시 승인에 따라 **계약과 Codex 전환 문서만 대행 커밋**한 뒤 착수한다.
알려진 스펙 018 PNG 2개와 `packages/render/src/plan/index.ts`는 계속 손대지 않는다.

## 미해결로 남아 있는 것

- **C-1(E-1) · E-2 · E-3** → Codex, 확정 전 구현 불가
- **F-A~F-E**(admin 인증·쓰기·발행) → Founder, **이 결정과 독립**이며 여전히 미결
- 인쇄소 요구 전체(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**,
  P-4a의 업로드·주문 전송·배포 차단은 그때까지 유지
- 케이스 인쇄(P-1로 분리), C-2~C-8
- **스펙 032 조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
- §2.5 픽셀 위험, 레거시 주문 버튼의 실제 경로, 실기기 `toBlob` 한계 → **NOT VERIFIED**
