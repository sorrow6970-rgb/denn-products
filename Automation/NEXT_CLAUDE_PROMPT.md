# NEXT CLAUDE PROMPT

상태: `READY_FOR_CODEX`

## 다음 작업 — Codex 독립 검증 (스펙 033)

Claude Code가 계약 `4ee162e`를 허용 파일 안에서만 구현하고 게이트를 통과시킨 뒤 push했다.

- 구현 커밋 **`4246503`** — `apps/mockup/src/print/**`(신규 4) + composer·contracts·CSS·E2E
- 종료 문서 커밋: 별도 분리
- 기준 HEAD `4ee162e`

### 검증해 달라

- plan 인스턴스가 **그대로** 전달되는지(재빌드·재측정·좌표 scaling **0**), 그래서 **P-6이 구조적으로**
  성립하는지
- `setTransform`이 identity에서 **정확히 한 번**, **uniform**으로만 적용되는지
- 호출 순서(크기 → transform → executor → **ok일 때만** `toBlob`)와 실패 시 **파일 0 · retry 0**
- object URL이 **최대 1개**이고 교체·unmount·dispose에서 정리되는지
- E-4/E-5/E-6 문구·파일명·수치 비노출
- E2E 픽셀 판정이 **레이아웃 변화를 실제로 잡는지**(허용치 = 차이 픽셀 **비율** 2%, noise floor 24)

### ★ 확인·결정이 필요한 관측 2가지

1. **E-3 재검사는 현재 상수로 도달 불가능하다** — upscale은 총 픽셀 최대 9MP라 36MP를 넘을 수 없고,
   downscale은 긴 변이 최소 6000이라 3000을 깰 수 없다. **가드는 유지**했고 불가능성과 이유를 unit으로
   고정했다. **이 판단이 맞는지, 가드를 그대로 둘지 확인해 달라.**
2. **★ 카탈로그 `aspect`와 cm 비율이 다르면 인쇄가 나오지 않는다** — 스펙 032가 불일치를 자동 수정하지
   않기로 했으므로 export는 **왜곡 대신 `NON_UNIFORM_SCALE`로 실패**한다(E2E 전용 테스트 있음).
   **운영자 cm 입력 UI 스펙에서 이 불일치를 어떻게 다룰지 결정이 필요하다.**

### 게이트 결과 (Claude 실행분)

frozen install(lockfile diff 0) · format · lint · typecheck **PASS**,
unit **1174/1174**, 독립 build **PASS**, 전체 Chromium E2E **129/129**,
고객 dist SHA-256 E2E 전후 동일, `git diff --check` 클린, ports 4183/4184 **0**,
OS temp `denn-e2e-*` **0**. 잔류 프로세스 command-line은 **NOT TESTED**.

## Claude 다음 작업

**없다.** Codex 검증 결과가 기록될 때까지 스펙 033 제품 코드를 더 수정하지 않는다.
`CORRECTION_REQUIRED`면 지적된 계약만 허용 파일 범위에서 보완하고,
`CODEX_PASSED`면 종료 문서만 커밋한 뒤 **다음 권장 스펙의 읽기 전용 조사**로 자동 전환한다.

알려진 스펙 018 PNG 2개와 content diff 0인 `packages/render/src/plan/index.ts`는 계속 손대지 않는다.

## 미해결로 남아 있는 것

- **인쇄소 요구 전체**(해상도·색공간/ICC·재단 여백·파일 형식·최대 크기) → **외부 확인 필요**.
  **P-4a의 업로드·주문 전송·배포 차단은 그때까지 유지**된다
- **Founder F-A~F-E**(admin 인증·쓰기·발행) → 여전히 미결
- **`aspect`↔cm 불일치 처리** → 운영자 cm 입력 UI 스펙에서 결정
- 케이스 인쇄(P-1로 분리), 주문 payload(P-5)
- **스펙 032 조사 보고서 자체에 대한 Codex 재검토** → 여전히 미완
- 실제 인쇄물·실기기 `toBlob`·대용량 성능 → **NOT TESTED**
