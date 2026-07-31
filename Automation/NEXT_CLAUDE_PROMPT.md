# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 다음 작업 — Codex 검토 (로컬 액자 PNG export 연결부 조사)

Claude Code가 지시 `aaf9268`의 **읽기 전용 조사**를 마치고 문서 전용 커밋으로 push했다.

- 보고서: `docs/codex-claude-handoff/reviews/2026-07-31-local-frame-png-export-seam-investigation.md`
- 제품 코드·테스트·CSS·설정 diff **0**, 신규 의존성 0
- **실제 network·live·Firebase·업로드·주문 전송·배포 0**

### 검토해 달라

1. **★★ P-6 논증**: frame plan의 논리 폭이 **측정 CSS 폭**에서 나오고 폰트·wrap 폭이 **그 폭의 %**라
   **재빌드 = 재wrap**이며, 따라서 **줄바꿈 동일성의 구조적 보장은 plan 고정 + transform뿐**이라는
   결론이 맞는지.
2. **★ 근거 대칭**: `surface.ts:151`의 `setTransform(dpr,…)` → 같은 plan/executor 구조가 인쇄에서
   `printScale`로 그대로 성립한다는 판단과, 레거시 `drawImageT(..., dim.w/500)`의 **500이 리빌드의
   `FRAME_MAX_LOGICAL_WIDTH`와 같다**는 관측이 유효한지.
3. **★ `surface.ts` 재사용 불가**(logicalCanvas 0.5px 불변식)이며 **인쇄 때문에 그 불변식을 완화하면
   안 된다**는 판단이 맞는지.
4. **`plan !== null`이 준비 완료의 증명**이므로 export가 별도 준비 판정을 만들면 **두 번째 진실
   원천**이 된다는 지적이 타당한지.
5. **§5.2 함정**: `minLongSide` 업스케일과 `maxPixels` 다운스케일이 **서로 싸울 수 있고 레거시는
   재검사하지 않는다**는 관측, 그리고 그 경우 **fail-closed** 처리 여부.
6. **§2.5 픽셀 위험**(비정수 배율·자간 품질·clip 반픽셀)을 **구현 전에 측정**할지.

### Codex 결정

- **★ E-1 C-1 확정** — 이 조사는 근거만 모았고 **고르지 않았다**
- **E-2** §2.5 사전 측정 여부 · **E-3** minLongSide↔maxPixels 충돌 시 실패 처리

### Founder 결정

- **E-4** 파일명 규칙(P-5c와 닿음) · **E-5** 다운로드 UI 위치·문구·비활성 사유 한국어 ·
  **E-6** provisional 상수(300dpi/3000/36M)를 UI에 노출할지

## Claude 다음 작업

**없다.** Codex 검토와 E-1~E-6이 기록되기 전까지 인쇄/export 관련
**제품 코드·테스트·CSS·설정을 작성하지 않는다**.

- `CORRECTION_REQUIRED`면 지적된 범위만 **문서로** 보완한다
- 승인 + 결정이 나오면 구현 계약(`docs/rebuild/specs/033-*.md` 또는 후속 번호)을 기다린다
- 알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 계속 손대지 않는다
- **C-1 임의 선택 금지**

## 미해결로 남아 있는 것

- **C-1 인쇄 좌표 방법(후보 A/B/C)** — 확정 스펙 없음
- **Founder F-A~F-E**(admin 인증·쓰기·발행) — 이번 조사와 **독립**이며 여전히 미결.
  이번 범위는 P-4a가 허용한 **로컬 생성·다운로드·E2E뿐**이다
- 인쇄소 요구 전체(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**,
  P-4a의 업로드·주문 전송·배포 차단은 그때까지 유지
- 케이스 인쇄(P-1로 분리), C-2~C-8
- **스펙 032 조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
- §2.5 픽셀 위험, 레거시 주문 버튼의 실제 경로, 실기기 `toBlob` 한계 → **NOT VERIFIED**
